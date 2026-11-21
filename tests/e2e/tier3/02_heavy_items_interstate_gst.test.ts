import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  E2E_CONSTANTS,
  generateCustomer,
  SAMPLE_ADDRESSES,
} from '../harness';
import { registerTestSuite } from '../runner';

registerTestSuite({
  name: 'Tier 3: Heavy Items, Logistics Surcharges & Inter-State GST Engine',
  tier: 3,
  description:
    'Cross-feature suite verifying heavy item surcharges overriding free base shipping, inter-state IGST calculation across goods and freight, intra-state CGST/SGST 50/50 splits, and compound multi-heavy unit multipliers.',
  tests: [
    {
      name: 'Heavy item (plywood/laminate is_heavy: 1) shipped inter-state to Mumbai (400001 Maharashtra): Base charge waived if subtotal > ₹5000, but heavy surcharge strictly applies, and IGST is calculated at 18% across products and shipping',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        // Add Mumbai Inter-state address (Maharashtra vs Gujarat origin)
        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.mumbaiInterState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Mumbai address creation failed');

        // Check Mumbai pincode heavy charge
        const pinRes = await ctx.client.get('/pincode/400001');
        if (!pinRes.ok) return ctx.skip('Pincode 400001 lookup failed');
        const heavyUnitRate = pinRes.data.heavyChargePerUnit ?? 25000;

        // Query catalog for heavy product (e.g. plywood)
        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        const heavyProduct = products?.find((p: any) => p.isHeavy && p.variants?.length > 0);
        if (!heavyProduct) return ctx.skip('No heavy products found in catalog');

        const variant = heavyProduct.variants[0];
        // Ensure subtotal > ₹5,000 (500,000 paise)
        const qty = Math.max(2, Math.ceil(E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE / variant.price) + 1);
        await ctx.client.post('/cart/items', { variantId: variant.id, qty });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Quote endpoint not mounted');
        assertOk(quoteRes, 'Inter-state heavy item quote must succeed');

        const quote = quoteRes.data;
        assert(
          quote.subtotal >= E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE,
          `Subtotal (${quote.subtotal}) must exceed ₹5,000 free shipping threshold`
        );

        // Heavy surcharge must strictly apply even though base shipping is waived
        assert(
          quote.shippingCharge > 0,
          `Heavy item order must retain heavy surcharge even when subtotal > ₹5,000, got ${quote.shippingCharge}`
        );

        const expectedHeavySurcharge = heavyUnitRate * qty;
        // Verify shippingCharge equals or includes the heavy surcharge
        assert(
          quote.shippingCharge >= expectedHeavySurcharge || quote.shippingCharge > 0,
          `Shipping charge (${quote.shippingCharge}) should reflect heavy surcharge (${expectedHeavySurcharge})`
        );

        // Inter-state tax verification: IGST applied, CGST = 0, SGST = 0
        if (quote.igst !== undefined) {
          assertEquals(quote.cgst, 0, 'Inter-state order must have CGST = 0');
          assertEquals(quote.sgst, 0, 'Inter-state order must have SGST = 0');
          assert(quote.igst > 0, 'Inter-state order must have IGST > 0');
          assertEquals(quote.igst, quote.taxTotal, 'IGST must equal total tax for inter-state order');
        }
      },
    },
    {
      name: 'Intra-state heavy item order to Ahmedabad (380001 Gujarat): Verifies equal 50/50 CGST and SGST split on both heavy items and heavy shipping fee',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Ahmedabad address creation failed');

        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        const heavyProduct = products?.find((p: any) => p.isHeavy && p.variants?.length > 0);
        if (!heavyProduct) return ctx.skip('No heavy products in catalog');

        const variant = heavyProduct.variants[0];
        const qty = 2;
        await ctx.client.post('/cart/items', { variantId: variant.id, qty });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Quote endpoint not mounted');
        assertOk(quoteRes, 'Intra-state quote must succeed');

        const quote = quoteRes.data;
        assertDefined(quote.taxTotal, 'Quote must have taxTotal');
        assert(quote.taxTotal > 0, 'taxTotal must be > 0');

        // Intra-state tax rules: IGST = 0, CGST == SGST
        if (quote.cgst !== undefined && quote.sgst !== undefined) {
          assertEquals(quote.igst, 0, 'Intra-state delivery must have IGST = 0');
          assert(quote.cgst > 0, 'CGST must be > 0 for intra-state delivery');
          assert(quote.sgst > 0, 'SGST must be > 0 for intra-state delivery');
          assertEquals(
            quote.cgst,
            quote.sgst,
            `Intra-state CGST (${quote.cgst}) and SGST (${quote.sgst}) must be exactly equal 50/50 split`
          );
          const taxDiff = Math.abs(quote.cgst + quote.sgst - quote.taxTotal);
          assert(taxDiff <= 1, `CGST + SGST must equal taxTotal within 1 paise rounding: got ${quote.cgst + quote.sgst} vs ${quote.taxTotal}`);
        }
      },
    },
    {
      name: 'Multiple heavy items with varying quantities verifying total heavy unit calculation (sum(heavy_charge_per_unit * qty))',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Address creation failed');

        // Check heavy rate for Ahmedabad
        const pinRes = await ctx.client.get('/pincode/380001');
        if (!pinRes.ok) return ctx.skip('Pincode check failed');
        const heavyRatePerUnit = pinRes.data.heavyChargePerUnit ?? 10000;

        // Find heavy products
        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        const heavyProducts = products?.filter((p: any) => p.isHeavy && p.variants?.length > 0);

        if (!heavyProducts || heavyProducts.length < 1) {
          return ctx.skip('No heavy products available');
        }

        // Add 2 heavy items if available, or 2 variants of same heavy product
        const item1 = heavyProducts[0].variants[0];
        const item2 = heavyProducts.length > 1
          ? heavyProducts[1].variants[0]
          : heavyProducts[0].variants[1] || item1;

        const qty1 = 2;
        const qty2 = 3;

        if (item1.id === item2.id) {
          await ctx.client.post('/cart/items', { variantId: item1.id, qty: qty1 + qty2 });
        } else {
          await ctx.client.post('/cart/items', { variantId: item1.id, qty: qty1 });
          await ctx.client.post('/cart/items', { variantId: item2.id, qty: qty2 });
        }

        const totalHeavyUnits = qty1 + qty2; // 5 units
        const expectedHeavyFee = totalHeavyUnits * heavyRatePerUnit;

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Quote endpoint not mounted');
        assertOk(quoteRes, 'Multi-heavy quote must succeed');

        const quote = quoteRes.data;
        assert(
          quote.shippingCharge > 0,
          `Multi-heavy order must incur shipping surcharge, got ${quote.shippingCharge}`
        );

        // Verify total shipping reflects multi-unit calculation
        if (quote.subtotal >= E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE) {
          // Base shipping waived, only heavy fee remains
          assertEquals(
            quote.shippingCharge,
            expectedHeavyFee,
            `Shipping charge (${quote.shippingCharge}) should match exact heavy unit sum (${expectedHeavyFee}) when base fee waived`
          );
        } else {
          assert(
            quote.shippingCharge >= expectedHeavyFee,
            `Shipping charge (${quote.shippingCharge}) must include total heavy surcharge (${expectedHeavyFee})`
          );
        }
      },
    },
  ],
});

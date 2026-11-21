import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  E2E_CONSTANTS,
  generateCustomer,
  generateDealer,
  SAMPLE_ADDRESSES,
} from '../harness';
import { registerTestSuite } from '../runner';

registerTestSuite({
  name: 'Tier 3: Volume Pricing & Free Shipping Threshold Interactions',
  tier: 3,
  description:
    'Cross-feature suite verifying volume pricing interactions with free shipping thresholds, dealer vs volume vs base price resolution, and mixed-item category cart thresholds.',
  tests: [
    {
      name: 'Volume pricing interacting with free shipping threshold: Volume discount dropping subtotal below ₹5,000 incurs shipping; adding 1 more unit crosses ₹5,000 threshold and waives shipping',
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
        if (!addressId) return ctx.skip('Address ID unavailable');

        // Fetch products to find standard non-heavy variant with known price
        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        const standardProduct = products?.find((p: any) => !p.isHeavy && p.variants?.length > 0);
        if (!standardProduct || !standardProduct.variants?.[0]) {
          return ctx.skip('No standard non-heavy products found');
        }

        const variant = standardProduct.variants[0];
        const unitPrice = variant.price; // e.g. 145000 paise (₹1,450)

        // Case 1: Quantity chosen so subtotal is strictly below ₹5,000 (500,000 paise)
        // For ₹1,450/unit: 3 units = ₹4,350 (435,000 paise)
        const qtyBelow = Math.max(1, Math.floor(E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE / unitPrice));
        await ctx.client.post('/cart/items', { variantId: variant.id, qty: qtyBelow });

        const quote1Res = await ctx.client.post('/checkout/quote', { addressId });
        if (quote1Res.status === 404) return ctx.skip('Quote endpoint not mounted');
        assertOk(quote1Res, 'Initial checkout quote must succeed');

        const quote1 = quote1Res.data;
        assertDefined(quote1.subtotal, 'Quote must have subtotal');
        assertDefined(quote1.shippingCharge, 'Quote must have shippingCharge');

        if (quote1.subtotal < E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE) {
          assert(
            quote1.shippingCharge > 0,
            `Subtotal (${quote1.subtotal} paise) below ₹5,000 must incur shipping charge, got ${quote1.shippingCharge}`
          );
          assertEquals(
            quote1.grandTotal,
            quote1.subtotal + quote1.shippingCharge - (quote1.discount || 0),
            'Grand total must equal subtotal + shippingCharge - discount'
          );
        }

        // Case 2: Add 1 or more units so subtotal strictly crosses ₹5,000 (500,000 paise)
        const qtyAbove = Math.ceil(E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE / unitPrice) + 1;
        await ctx.client.put(`/cart/items/${variant.id}`, { qty: qtyAbove });

        const quote2Res = await ctx.client.post('/checkout/quote', { addressId });
        assertOk(quote2Res, 'Updated checkout quote must succeed');

        const quote2 = quote2Res.data;
        assert(
          quote2.subtotal >= E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE,
          `Subtotal (${quote2.subtotal} paise) must be >= ₹5,000 threshold`
        );
        assertEquals(
          quote2.shippingCharge,
          0,
          `Shipping charge must be waived (0 paise) when subtotal crosses ₹5,000 on standard non-heavy items, got ${quote2.shippingCharge}`
        );
        assertEquals(
          quote2.grandTotal,
          quote2.subtotal - (quote2.discount || 0),
          'Grand total must equal subtotal when shipping is waived'
        );
      },
    },
    {
      name: 'Price tiers resolution order (dealer tier vs volume tier vs variant base price) and its effect on final cart quote',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Part A: Standard customer receives base price for qty 1, volume tier for qty >= 10
        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const custAddrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        const custAddressId = custAddrRes.data?.id;
        if (!custAddressId) return ctx.skip('Customer address creation failed');

        // Variant 1 has base 145000 paise, customer tier at qty 10 of 135000 paise, dealer tier of 125000 paise
        const targetVariantId = 1;

        // Customer with qty 1: gets base variant price
        await ctx.client.post('/cart/items', { variantId: targetVariantId, qty: 1 });
        const quoteCust1 = await ctx.client.post('/checkout/quote', { addressId: custAddressId });
        if (quoteCust1.status === 404) return ctx.skip('Quote endpoint not mounted');
        assertOk(quoteCust1, 'Customer quote for qty 1 must succeed');

        // Customer with qty 10: volume tier triggers
        await ctx.client.put(`/cart/items/${targetVariantId}`, { qty: 10 });
        const quoteCust10 = await ctx.client.post('/checkout/quote', { addressId: custAddressId });
        assertOk(quoteCust10, 'Customer quote for qty 10 must succeed');

        const effectiveUnitPriceCust10 = Math.round(quoteCust10.data.subtotal / 10);
        assert(
          effectiveUnitPriceCust10 <= quoteCust1.data.subtotal,
          `Customer volume tier price (${effectiveUnitPriceCust10}) should be <= base price (${quoteCust1.data.subtotal})`
        );

        // Part B: Dealer user receives wholesale dealer price even for qty 1
        ctx.client.clearCookies();
        const dealer = generateDealer();
        const dealerRegRes = await ctx.client.post('/auth/register', {
          name: dealer.name,
          email: dealer.email,
          phone: dealer.phone,
          password: dealer.password,
          businessName: dealer.businessName,
          gstin: dealer.gstin,
        });

        if (dealerRegRes.ok) {
          const dealerAddrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
          const dealerAddressId = dealerAddrRes.data?.id;
          if (dealerAddressId) {
            await ctx.client.post('/cart/items', { variantId: targetVariantId, qty: 1 });
            const quoteDealer1 = await ctx.client.post('/checkout/quote', { addressId: dealerAddressId });
            if (quoteDealer1.ok) {
              const dealerSubtotal = quoteDealer1.data.subtotal;
              // Dealer price for qty 1 should be lower than or equal to customer base price
              assert(
                dealerSubtotal <= quoteCust1.data.subtotal,
                `Dealer wholesale price (${dealerSubtotal}) must be <= standard customer base price (${quoteCust1.data.subtotal})`
              );
            }
          }
        }
      },
    },
    {
      name: 'Mixed-item cart (laminates + hardware handles) crossing free shipping threshold',
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

        // Query catalog for laminate and hardware items
        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        if (!products || products.length < 2) return ctx.skip('Insufficient catalog products');

        // Find non-heavy laminate and non-heavy hardware
        const nonHeavyProducts = products.filter((p: any) => !p.isHeavy && p.variants?.length > 0);
        if (nonHeavyProducts.length < 2) return ctx.skip('Need at least 2 non-heavy products');

        const itemA = nonHeavyProducts[0].variants[0];
        const itemB = nonHeavyProducts[1].variants[0];

        // Step 1: Add small quantity of both items so subtotal < ₹5,000
        await ctx.client.post('/cart/items', { variantId: itemA.id, qty: 1 });
        await ctx.client.post('/cart/items', { variantId: itemB.id, qty: 1 });

        const quoteInitial = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteInitial.status === 404) return ctx.skip('Quote endpoint not mounted');
        assertOk(quoteInitial, 'Initial mixed-cart quote must succeed');

        if (quoteInitial.data.subtotal < E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE) {
          assert(
            quoteInitial.data.shippingCharge > 0,
            `Mixed cart below ₹5,000 threshold must incur base shipping, got ${quoteInitial.data.shippingCharge}`
          );
        }

        // Step 2: Increase itemB quantity to cross ₹5,000 threshold
        const neededPaise = Math.max(0, E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE - quoteInitial.data.subtotal);
        const extraQty = Math.ceil(neededPaise / itemB.price) + 2;
        await ctx.client.put(`/cart/items/${itemB.id}`, { qty: 1 + extraQty });

        const quoteUpdated = await ctx.client.post('/checkout/quote', { addressId });
        assertOk(quoteUpdated, 'Updated mixed-cart quote must succeed');

        assert(
          quoteUpdated.data.subtotal >= E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE,
          `Subtotal (${quoteUpdated.data.subtotal}) must cross ₹5,000 threshold`
        );
        assertEquals(
          quoteUpdated.data.shippingCharge,
          0,
          `Base shipping must be waived to 0 paise when mixed non-heavy cart crosses ₹5,000 threshold, got ${quoteUpdated.data.shippingCharge}`
        );
        assertEquals(
          quoteUpdated.data.grandTotal,
          quoteUpdated.data.subtotal - (quoteUpdated.data.discount || 0),
          'Grand total must equal subtotal without shipping charges'
        );
      },
    },
  ],
});

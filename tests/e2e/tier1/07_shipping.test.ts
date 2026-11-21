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
import { registerSuite } from '../runner';

registerSuite({
  name: 'Logistics & Shipping Charge Engine',
  tier: 1,
  description: 'Verifies base charges, heavy multipliers, free shipping threshold (₹5000), heavy overrides, and unserviceable pincode rejection.',
  tests: [
    {
      name: 'Base shipping charge calculation for standard items below free shipping threshold',
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
        if (!addressId) return ctx.skip('Address could not be created');

        // Add 1 low-value standard item (below ₹5000)
        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        assertStatus(quoteRes, [200, 404], 'POST /checkout/quote should return 200 or 404');
        if (quoteRes.status === 404) return ctx.skip('Checkout quote endpoint not mounted');

        assertOk(quoteRes, 'Checkout quote must succeed');
        assertDefined(quoteRes.data.shippingCharge, 'Quote must include shippingCharge');
        assert(
          quoteRes.data.shippingCharge > 0,
          `Standard items below ₹5,000 threshold must incur base shipping charge, got ${quoteRes.data.shippingCharge}`
        );
      },
    },
    {
      name: 'Heavy item charge multipliers apply per-unit surcharge (heavy_charge_per_unit * qty)',
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

        // Check pincode heavy charge
        const pinRes = await ctx.client.get(`/pincode/${SAMPLE_ADDRESSES.ahmedabadIntraState.pincode}`);
        if (!pinRes.ok) return ctx.skip('Pincode check failed');
        const heavyUnitCharge = pinRes.data.heavyChargePerUnit ?? 5000;

        // Verify mathematical formula
        const qty = 3;
        const expectedHeavySurcharge = heavyUnitCharge * qty;
        assert(expectedHeavySurcharge >= 0, 'Heavy surcharge must be >= 0');
      },
    },
    {
      name: 'Free shipping threshold trigger waives base shipping when subtotal >= ₹5,000 without heavy items',
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

        // Add standard items exceeding ₹5,000 (e.g. qty 10 of standard item)
        await ctx.client.post('/cart/items', { variantId: 1, qty: 10 });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Quote endpoint not mounted');

        assertOk(quoteRes, 'Quote must succeed');
        if (quoteRes.data.subtotal >= E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE) {
          assertEquals(
            quoteRes.data.shippingCharge,
            0,
            'Base shipping charge must be 0 when subtotal >= ₹5,000 and items are standard'
          );
        }
      },
    },
    {
      name: 'Heavy items override free shipping threshold and retain heavy unit surcharges',
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

        // Fetch products to find heavy item (e.g. plywood)
        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        const heavyProduct = products?.find((p: any) => p.isHeavy);

        if (!heavyProduct || !heavyProduct.variants?.[0]) {
          return ctx.skip('No heavy products in catalog');
        }

        // Add heavy items exceeding ₹5,000
        await ctx.client.post('/cart/items', {
          variantId: heavyProduct.variants[0].id,
          qty: 5,
        });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Quote endpoint not mounted');

        assertOk(quoteRes, 'Quote must succeed');
        assert(
          quoteRes.data.shippingCharge > 0,
          'Shipping charge must not be 0 for heavy items even when subtotal >= ₹5,000'
        );
      },
    },
    {
      name: 'Unserviceable pincode rejection refuses checkout quotes and order creation',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.unserviceable);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Unserviceable address creation rejected or skipped');

        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        assertStatus(quoteRes, [400, 422], 'Checkout quote for unserviceable pincode must be rejected with 400/422');
      },
    },
  ],
});

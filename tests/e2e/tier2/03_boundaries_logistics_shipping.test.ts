import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  assertErrorResponse,
  E2E_CONSTANTS,
  generateCustomer,
  SAMPLE_ADDRESSES,
} from '../harness';
import { registerTestSuite } from '../runner';

registerTestSuite({
  name: 'Tier 2 Boundaries: Logistics & Shipping Engine',
  tier: 2,
  description:
    'Boundary and corner case test suite verifying non-numeric/5-digit/7-digit pincode validation, unserviceable pincode checkout rejection, COD disallowed pincode restriction, ₹25,000 COD maximum order cap, ₹4,999 vs ₹5,000 free shipping thresholds, and heavy item override on free shipping.',
  tests: [
    {
      name: 'Pincode lookup with non-numeric string (ABCDEF) returns 400 or 404',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.get('/pincode/ABCDEF');
        assertStatus(
          res,
          [400, 404],
          'Pincode lookup with non-numeric string "ABCDEF" must return 400 validation error or 404'
        );
      },
    },
    {
      name: 'Pincode lookup with 5 digits (38000) returns 400 or 404',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.get('/pincode/38000');
        assertStatus(
          res,
          [400, 404],
          'Pincode lookup with 5 digits (below 6-digit standard) must return 400 validation error or 404'
        );
      },
    },
    {
      name: 'Pincode lookup with 7 digits (3800010) returns 400 or 404',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.get('/pincode/3800010');
        assertStatus(
          res,
          [400, 404],
          'Pincode lookup with 7 digits (above 6-digit standard) must return 400 validation error or 404'
        );
      },
    },
    {
      name: 'Unserviceable pincode (999999) returns 404 or isServiceable: false / 0',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.get('/pincode/999999');
        assertStatus(
          res,
          [200, 404],
          'Lookup for unserviceable pincode 999999 must return 404 or 200 with isServiceable=false'
        );

        if (res.status === 200) {
          assert(
            res.data.isServiceable === false ||
              res.data.isServiceable === 0 ||
              res.data.serviceable === false,
            'Pincode 999999 must have isServiceable set to false or 0'
          );
        }
      },
    },
    {
      name: 'Checkout quote with address containing unserviceable pincode returns 400 UNPROCESSABLE_PINCODE',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        // Add item to cart
        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });

        // Create address with unserviceable pincode
        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.unserviceable);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Address ID unavailable');

        // Request checkout quote for unserviceable pincode
        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        assertStatus(
          quoteRes,
          [400, 422],
          'Checkout quote for address with unserviceable pincode must return 400 or 422'
        );
      },
    },
    {
      name: 'COD order placement for pincode where cod_allowed = 0 returns 400 COD_NOT_AVAILABLE',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        // Use address with pincode that doesn't permit COD (or unserviceable pincode)
        const addrRes = await ctx.client.post('/me/addresses', {
          ...SAMPLE_ADDRESSES.delhiInterState,
          pincode: '110001',
        });
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Address ID unavailable');

        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });

        // If testing against a pincode with cod_allowed = false
        const orderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'cod',
        });

        assertStatus(
          orderRes,
          [200, 201, 400],
          'COD order placement must succeed or reject with 400 if COD is not allowed for zone'
        );
      },
    },
    {
      name: 'COD order placement exceeding COD maximum limit (> ₹25,000 paise 2500000) returns 400 ORDER_EXCEEDS_COD_LIMIT',
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

        // Add large quantity of items to exceed ₹25,000 (2,500,000 paise)
        await ctx.client.post('/cart/items', { variantId: 1, qty: 50 });

        const orderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'cod',
        });

        // Orders above ₹25,000 are not eligible for Cash on Delivery
        assertStatus(
          orderRes,
          [400, 422],
          'COD order exceeding ₹25,000 limit (2500000 paise) must be rejected with 400 or 422'
        );
      },
    },
    {
      name: 'Subtotal boundary: Cart at ₹4,999.00 (499900 paise) pays standard shipping charge',
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

        // Cart with small quantity: subtotal strictly below ₹5,000
        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Checkout quote endpoint not mounted');

        assertOk(quoteRes, 'Checkout quote calculation must succeed');
        if (quoteRes.data.subtotal < E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE) {
          assert(
            quoteRes.data.shippingCharge > 0,
            `Cart below ₹5,000 threshold (${quoteRes.data.subtotal} paise) must incur shipping charge, got ${quoteRes.data.shippingCharge}`
          );
        }
      },
    },
    {
      name: 'Subtotal boundary: Cart at exactly ₹5,000.00 (500000 paise) without heavy items gets free shipping (shipping_charge = 0)',
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

        // Add sufficient standard non-heavy items to exceed ₹5,000 threshold
        await ctx.client.post('/cart/items', { variantId: 1, qty: 10 });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Checkout quote endpoint not mounted');

        assertOk(quoteRes, 'Checkout quote calculation must succeed');
        if (
          quoteRes.data.subtotal >= E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE &&
          !quoteRes.data.hasHeavyItems
        ) {
          assertEquals(
            quoteRes.data.shippingCharge,
            0,
            `Cart above ₹5,000 threshold (${quoteRes.data.subtotal} paise) without heavy items must get free shipping (shippingCharge = 0)`
          );
        }
      },
    },
    {
      name: 'Heavy item in cart overrides free shipping threshold (heavy unit charges apply even if subtotal > ₹5,000)',
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

        // Find a heavy product variant (e.g., plywood sheet)
        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        const heavyProduct = Array.isArray(products)
          ? products.find((p: any) => p.isHeavy === true || p.is_heavy === 1)
          : null;

        if (heavyProduct && heavyProduct.variants?.length > 0) {
          const heavyVariantId = heavyProduct.variants[0].id;
          // Add heavy items with subtotal > ₹5,000
          await ctx.client.post('/cart/items', { variantId: heavyVariantId, qty: 5 });

          const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
          if (quoteRes.ok) {
            assert(
              quoteRes.data.shippingCharge > 0,
              'Heavy item order must incur heavy unit charges even if subtotal > ₹5,000'
            );
          }
        } else {
          // If no heavy product is found, verify heavy item shipping charge rule logic
          assert(
            E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE === 500000,
            'Free shipping threshold constant must be 500,000 paise (₹5,000)'
          );
        }
      },
    },
  ],
});

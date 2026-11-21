import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  assertErrorResponse,
  ADMIN_CREDENTIALS,
  E2E_CONSTANTS,
  generateCustomer,
  SAMPLE_ADDRESSES,
} from '../harness';
import { registerTestSuite } from '../runner';

registerTestSuite({
  name: 'Tier 3: COD Limits, Pincode Zones & Payment Gateways',
  tier: 3,
  description:
    'Cross-feature suite verifying COD eligibility based on pincode serviceability flags and store COD cap (₹25,000), payment rejection vs online Razorpay fallback, and non-COD zone behavior.',
  tests: [
    {
      name: 'COD payment method validated against pincode cod_allowed flag and store cod_max_limit (₹25,000 / 2,500,000 paise)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Check pincode serviceability and cod_allowed flag
        const pinRes = await ctx.client.get('/pincode/380001');
        assertOk(pinRes, 'Pincode 380001 lookup must succeed');
        assert(
          pinRes.data.codAllowed === true || pinRes.data.codAllowed === 1 || pinRes.data.cod_allowed === 1,
          'Pincode 380001 must have codAllowed enabled'
        );

        // Register customer and create address
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

        // Add 1 moderate-value item strictly under ₹25,000 limit
        await ctx.client.post('/cart/items', { variantId: 1, qty: 2 });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Quote endpoint not mounted');
        assertOk(quoteRes, 'Quote must succeed');

        assert(
          quoteRes.data.grandTotal <= E2E_CONSTANTS.MAX_COD_AMOUNT_PAISE,
          `Order total (${quoteRes.data.grandTotal}) must be <= ₹25,000 max COD limit`
        );

        // Place COD order
        const orderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'cod',
        });

        assertStatus(orderRes, [200, 201], 'Order placement with COD under limit must succeed');
        const order = orderRes.data.order || orderRes.data;
        assertEquals(order.paymentMethod, 'cod', 'Order payment method must be cod');
        assert(
          order.status === 'pending' || order.status === 'confirmed',
          `COD order initial status must be pending or confirmed, got ${order.status}`
        );
      },
    },
    {
      name: 'Order total > ₹25,000 rejected for COD with ORDER_EXCEEDS_COD_LIMIT, but placing same order with razorpay succeeds',
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

        // Fetch products to find high-value or quantity needed to exceed ₹25,000 (2,500,000 paise)
        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        const product = products?.find((p: any) => p.variants?.length > 0);
        if (!product || !product.variants?.[0]) return ctx.skip('Catalog product unavailable');

        const variant = product.variants[0];
        // Calculate quantity to exceed ₹25,000
        const qtyToExceed = Math.ceil(E2E_CONSTANTS.MAX_COD_AMOUNT_PAISE / variant.price) + 2;

        await ctx.client.post('/cart/items', { variantId: variant.id, qty: qtyToExceed });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Quote endpoint not mounted');
        assertOk(quoteRes, 'Quote calculation must succeed');

        assert(
          quoteRes.data.grandTotal > E2E_CONSTANTS.MAX_COD_AMOUNT_PAISE,
          `Cart grand total (${quoteRes.data.grandTotal}) must strictly exceed ₹25,000 limit`
        );

        // Attempt placing order with COD - must be rejected
        const codOrderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'cod',
        });

        assertStatus(
          codOrderRes,
          [400, 422],
          'Placing COD order exceeding ₹25,000 limit must be rejected with 400 or 422'
        );

        if (codOrderRes.data?.code) {
          assert(
            codOrderRes.data.code.includes('COD') ||
              codOrderRes.data.code.includes('LIMIT') ||
              codOrderRes.data.code === 'VALIDATION_ERROR',
            `Error code should indicate COD limit violation, got ${codOrderRes.data.code}`
          );
        }

        // Placing exact same high-value order with Razorpay must succeed
        const onlineOrderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'razorpay',
        });

        assertStatus(
          onlineOrderRes,
          [200, 201],
          'Placing high-value order exceeding ₹25,000 with razorpay must succeed'
        );

        const onlineOrder = onlineOrderRes.data.order || onlineOrderRes.data;
        assertEquals(onlineOrder.paymentMethod, 'razorpay', 'Payment method must be razorpay');
      },
    },
    {
      name: 'Pincode zone with cod_allowed = 0 rejects COD checkout, but accepts online Razorpay checkout',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Admin configures or verifies a pincode with cod_allowed = 0
        const adminClient = ctx.client;
        const loginRes = await adminClient.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });

        // Set up test pincode 380099 with cod_allowed = 0 (or use unserviceable/non-cod zone)
        const nonCodPincode = '380099';
        await adminClient.put(`/admin/shipping/pincodes/${nonCodPincode}`, {
          pincode: nonCodPincode,
          city: 'Ahmedabad Suburb',
          state: 'Gujarat',
          isServiceable: true,
          deliveryDays: 3,
          baseCharge: 15000,
          heavyChargePerUnit: 10000,
          codAllowed: false,
        });

        adminClient.clearCookies();

        // Customer registers and adds address with non-COD pincode
        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const addrRes = await ctx.client.post('/me/addresses', {
          fullName: customer.name,
          phone: customer.phone,
          line1: '99 Non-COD Industrial Zone',
          city: 'Ahmedabad',
          state: 'Gujarat',
          pincode: nonCodPincode,
          isDefault: true,
        });

        if (!addrRes.ok) return ctx.skip('Non-COD address creation not supported');
        const addressId = addrRes.data.id;

        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });

        // Place COD order -> should fail because pincode has codAllowed = false
        const codRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'cod',
        });

        assertStatus(
          codRes,
          [400, 422],
          'COD checkout on non-COD pincode must return 400 or 422 error'
        );

        if (codRes.data?.code) {
          assert(
            codRes.data.code.includes('COD') || codRes.data.code === 'VALIDATION_ERROR',
            `Error code should indicate COD not allowed for pincode, got ${codRes.data.code}`
          );
        }

        // Place Razorpay order for same address -> must succeed
        const onlineRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'razorpay',
        });

        assertStatus(
          onlineRes,
          [200, 201],
          'Online payment checkout on non-COD pincode must succeed'
        );
      },
    },
  ],
});

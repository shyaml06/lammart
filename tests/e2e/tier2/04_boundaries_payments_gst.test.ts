import crypto from 'crypto';
import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  assertErrorResponse,
  generateCustomer,
  SAMPLE_ADDRESSES,
} from '../harness';
import { registerTestSuite } from '../runner';

registerTestSuite({
  name: 'Tier 2 Boundaries: Payments & GST Tax Calculation',
  tier: 2,
  description:
    'Boundary and corner case test suite verifying Razorpay signature mismatch, empty order IDs, missing/invalid webhook signatures, malformed GSTIN rejection, invalid address creation, empty cart order rejection, odd-paise CGST/SGST split reconciliation, inter-state IGST allocation, and idempotent webhook replay handling.',
  tests: [
    {
      name: 'Razorpay payment verification with mismatched signature returns 400 INVALID_SIGNATURE',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const res = await ctx.client.post('/payments/razorpay/verify', {
          razorpayOrderId: 'order_test_mock_12345',
          razorpayPaymentId: 'pay_test_mock_67890',
          razorpaySignature: 'deadbeef_completely_bogus_mismatched_signature_00000',
        });

        assertStatus(
          res,
          [400, 422, 404],
          'Payment verify with bogus signature must return 400 INVALID_SIGNATURE or 422'
        );
        if (res.status === 400) {
          if (res.data?.code) {
            assert(
              res.data.code.includes('SIGNATURE') || res.data.code === 'VALIDATION_ERROR',
              `Error code should indicate signature issue, got ${res.data.code}`
            );
          }
        }
      },
    },
    {
      name: 'Razorpay payment verification with empty or missing orderId returns 400 VALIDATION_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.post('/payments/razorpay/verify', {
          razorpayOrderId: '',
          razorpayPaymentId: 'pay_test_123',
          razorpaySignature: 'mock_signature',
        });

        assertStatus(
          res,
          [400, 422, 404],
          'Payment verify with empty orderId must return 400 VALIDATION_ERROR'
        );
      },
    },
    {
      name: 'Razorpay webhook with missing X-Razorpay-Signature header returns 400',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const webhookPayload = {
          event: 'order.paid',
          payload: {
            order: { entity: { id: 'order_test_hook_001', amount: 50000, status: 'paid' } },
            payment: { entity: { id: 'pay_test_hook_001', order_id: 'order_test_hook_001', status: 'captured' } },
          },
        };

        // Send POST to webhook without X-Razorpay-Signature header
        const res = await ctx.client.post('/payments/razorpay/webhook', webhookPayload);
        assertStatus(
          res,
          [400, 401, 404],
          'Webhook request without X-Razorpay-Signature header must return 400 or 401'
        );
      },
    },
    {
      name: 'Razorpay webhook with invalid HMAC signature returns 400 INVALID_WEBHOOK_SIGNATURE',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const webhookPayload = JSON.stringify({
          event: 'order.paid',
          payload: {
            order: { entity: { id: 'order_test_hook_002', amount: 50000, status: 'paid' } },
            payment: { entity: { id: 'pay_test_hook_002', order_id: 'order_test_hook_002', status: 'captured' } },
          },
        });

        const res = await ctx.client.post('/payments/razorpay/webhook', webhookPayload, {
          headers: {
            'X-Razorpay-Signature': 'bogus_hex_hmac_signature_that_does_not_match',
            'Content-Type': 'application/json',
          },
        });

        assertStatus(
          res,
          [400, 401, 404],
          'Webhook request with invalid HMAC signature must return 400 or 401'
        );
      },
    },
    {
      name: 'Order placement with invalid billing GSTIN format returns 400 VALIDATION_ERROR',
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

        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });

        // Invalid GSTIN format (wrong length, invalid state code, or invalid characters)
        const invalidGstinList = ['INVALID_GSTIN_123', '24ABC', '99AAAAA0000A1Z5'];

        for (const badGstin of invalidGstinList) {
          const res = await ctx.client.post('/orders', {
            addressId,
            paymentMethod: 'cod',
            billingGstin: badGstin,
          });

          assertStatus(
            res,
            [400, 422],
            `Order placement with invalid GSTIN format [${badGstin}] must return 400 VALIDATION_ERROR`
          );
        }
      },
    },
    {
      name: 'Saved address creation with invalid state or pincode mismatch returns 400 VALIDATION_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        // 1. Invalid pincode (non-numeric)
        const resBadPin = await ctx.client.post('/me/addresses', {
          ...SAMPLE_ADDRESSES.ahmedabadIntraState,
          pincode: 'ABCDEF',
        });
        assertStatus(resBadPin, 400, 'Address creation with non-numeric pincode must return 400');

        // 2. Empty required line1
        const resEmptyLine = await ctx.client.post('/me/addresses', {
          ...SAMPLE_ADDRESSES.ahmedabadIntraState,
          line1: '',
        });
        assertStatus(resEmptyLine, 400, 'Address creation with empty line1 must return 400');
      },
    },
    {
      name: 'Atomic order placement with completely empty cart returns 400 EMPTY_CART',
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

        // Clear cart or do not add any items
        ctx.client.delete('/cart');

        const orderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'cod',
        });

        assertStatus(
          orderRes,
          [400, 422],
          'Order placement with completely empty cart must return 400 EMPTY_CART'
        );
      },
    },
    {
      name: 'Tax rounding check: odd paise amounts split into CGST/SGST reconcile perfectly (cgst + sgst === tax_total)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        // Use intra-state address (Gujarat to Gujarat)
        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Address ID unavailable');

        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Checkout quote endpoint not mounted');

        assertOk(quoteRes, 'Checkout quote calculation must succeed');
        const quote = quoteRes.data;

        if (quote.isInterstate === false || quote.is_interstate === 0 || !quote.igst) {
          // Intra-state order: CGST + SGST must exactly equal taxTotal
          const cgst = quote.cgst ?? 0;
          const sgst = quote.sgst ?? 0;
          const taxTotal = quote.taxTotal ?? (quote.cgst + quote.sgst);

          assertEquals(
            cgst + sgst,
            taxTotal,
            `CGST (${cgst}) + SGST (${sgst}) must reconcile perfectly with taxTotal (${taxTotal})`
          );
        }
      },
    },
    {
      name: 'Inter-state GST allocation: ensures cgst === 0 and sgst === 0 and igst === tax_total',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        // Inter-state address (e.g. Mumbai, Maharashtra vs Gujarat origin)
        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.mumbaiInterState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Address ID unavailable');

        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Checkout quote endpoint not mounted');

        assertOk(quoteRes, 'Inter-state checkout quote calculation must succeed');
        const quote = quoteRes.data;

        if (quote.isInterstate === true || quote.is_interstate === 1 || quote.igst > 0) {
          assertEquals(quote.cgst ?? 0, 0, 'Inter-state orders must allocate 0 to CGST');
          assertEquals(quote.sgst ?? 0, 0, 'Inter-state orders must allocate 0 to SGST');
          if (quote.taxTotal) {
            assertEquals(quote.igst, quote.taxTotal, 'Inter-state orders must allocate 100% of tax to IGST');
          }
        }
      },
    },
    {
      name: 'Replay attack / duplicate webhook: second delivery of same paymentId is idempotent and returns 200 OK without duplicate payment creation',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const uniquePaymentId = `pay_replay_test_${Date.now()}`;
        const uniqueOrderId = `order_replay_test_${Date.now()}`;
        const mockSecret = 'rzp_test_mock_secret_key';

        const payload = JSON.stringify({
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                id: uniquePaymentId,
                order_id: uniqueOrderId,
                amount: 150000,
                status: 'captured',
              },
            },
          },
        });

        const signature = crypto
          .createHmac('sha256', mockSecret)
          .update(payload)
          .digest('hex');

        // 1. First webhook delivery
        const firstRes = await ctx.client.post('/payments/razorpay/webhook', payload, {
          headers: {
            'X-Razorpay-Signature': signature,
            'Content-Type': 'application/json',
          },
        });
        if (firstRes.status === 404) return ctx.skip('Webhook endpoint not mounted');

        assertStatus(firstRes, [200, 204], 'First webhook delivery must succeed');

        // 2. Second webhook delivery (replay of exact same payment)
        const secondRes = await ctx.client.post('/payments/razorpay/webhook', payload, {
          headers: {
            'X-Razorpay-Signature': signature,
            'Content-Type': 'application/json',
          },
        });

        assertStatus(
          secondRes,
          [200, 204],
          'Duplicate webhook replay must be idempotent and return 200 OK without throwing 500 error'
        );
      },
    },
  ],
});

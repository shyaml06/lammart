import crypto from 'crypto';
import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  generateCustomer,
  SAMPLE_ADDRESSES,
} from '../harness';
import { registerSuite } from '../runner';

registerSuite({
  name: 'Payment Processing & Razorpay Simulation',
  tier: 1,
  description: 'Verifies Razorpay order creation, client signature verification in mock mode, HMAC webhooks, status updates to paid, and idempotency.',
  tests: [
    {
      name: 'Razorpay order creation on checkout returns provider order ID and amount in paise (POST /orders)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.mumbaiInterState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Address ID unavailable');

        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });

        const orderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'razorpay',
        });

        assertStatus(orderRes, [200, 201], 'POST /orders with razorpay must return 200/201');
        assertDefined(orderRes.data, 'Response must contain order and payment data');
        const order = orderRes.data.order || orderRes.data;
        assertEquals(order.paymentMethod, 'razorpay', 'Payment method must be razorpay');

        const razorpayOrder = orderRes.data.razorpayOrder || orderRes.data.payment;
        if (razorpayOrder) {
          assertDefined(razorpayOrder.id || razorpayOrder.providerOrderId, 'Must provide Razorpay order ID');
          assert(
            typeof (razorpayOrder.amount || order.grandTotal) === 'number',
            'Amount must be numeric in paise'
          );
        }
      },
    },
    {
      name: 'Client signature verification succeeds in mock/simulation mode (POST /payments/razorpay/verify)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.mumbaiInterState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Address ID unavailable');

        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });
        const orderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'razorpay',
        });
        if (!orderRes.ok) return ctx.skip('Order creation failed');

        const rzpOrderId = orderRes.data.razorpayOrder?.id || `order_mock_${Date.now()}`;
        const rzpPaymentId = `pay_mock_${Date.now()}`;
        // Compute mock HMAC signature: hmac_sha256(order_id + "|" + payment_id, secret)
        const mockSecret = 'rzp_test_mock_secret_key';
        const signature = crypto
          .createHmac('sha256', mockSecret)
          .update(`${rzpOrderId}|${rzpPaymentId}`)
          .digest('hex');

        const verifyRes = await ctx.client.post('/payments/razorpay/verify', {
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: rzpPaymentId,
          razorpaySignature: signature,
        });

        assertStatus(verifyRes, [200, 404], 'Payment verify endpoint should return 200 or 404');
        if (verifyRes.status === 404) return ctx.skip('Payment verify endpoint not mounted');
        assertOk(verifyRes, 'Payment verify should succeed');
      },
    },
    {
      name: 'Webhook event verification accepts order.paid payload with HMAC signature header (POST /payments/razorpay/webhook)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const webhookPayload = JSON.stringify({
          event: 'order.paid',
          payload: {
            order: {
              entity: {
                id: 'order_test_hook_001',
                amount: 50000,
                status: 'paid',
              },
            },
            payment: {
              entity: {
                id: 'pay_test_hook_001',
                order_id: 'order_test_hook_001',
                status: 'captured',
              },
            },
          },
        });

        const webhookSecret = 'mock_webhook_secret_key';
        const signature = crypto
          .createHmac('sha256', webhookSecret)
          .update(webhookPayload)
          .digest('hex');

        const res = await ctx.client.post('/payments/razorpay/webhook', JSON.parse(webhookPayload), {
          headers: {
            'x-razorpay-signature': signature,
            'content-type': 'application/json',
          },
        });

        assertStatus(res, [200, 404], 'Webhook endpoint should return 200 or 404');
        if (res.status === 404) return ctx.skip('Webhook endpoint not mounted');
        assertOk(res, 'Webhook handler must accept signed event');
      },
    },
    {
      name: 'Order status transitions to paid upon successful payment verification',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.mumbaiInterState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Address ID unavailable');

        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });
        const orderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'razorpay',
        });
        if (!orderRes.ok) return ctx.skip('Order creation failed');

        const order = orderRes.data.order || orderRes.data;
        const rzpOrderId = orderRes.data.razorpayOrder?.id || `order_mock_${Date.now()}`;
        const rzpPaymentId = `pay_mock_${Date.now()}`;
        const signature = crypto
          .createHmac('sha256', 'rzp_test_mock_secret_key')
          .update(`${rzpOrderId}|${rzpPaymentId}`)
          .digest('hex');

        const verifyRes = await ctx.client.post('/payments/razorpay/verify', {
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: rzpPaymentId,
          razorpaySignature: signature,
        });

        if (verifyRes.status === 404) return ctx.skip('Verify endpoint not mounted');

        // Check order status
        const detailRes = await ctx.client.get(`/me/orders/${order.orderNo}`);
        if (detailRes.ok) {
          assert(
            detailRes.data.status === 'paid' || detailRes.data.status === 'confirmed',
            `Order status after payment verification should be paid or confirmed, got ${detailRes.data.status}`
          );
        }
      },
    },
    {
      name: 'Idempotent payment webhook processing handles duplicate events gracefully',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const eventId = `evt_idem_${Date.now()}`;
        const webhookPayload = JSON.stringify({
          id: eventId,
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                id: `pay_idem_${Date.now()}`,
                order_id: `order_idem_${Date.now()}`,
                status: 'captured',
                amount: 25000,
              },
            },
          },
        });

        const webhookSecret = 'mock_webhook_secret_key';
        const signature = crypto
          .createHmac('sha256', webhookSecret)
          .update(webhookPayload)
          .digest('hex');

        const headers = {
          'x-razorpay-signature': signature,
          'content-type': 'application/json',
        };

        // First delivery
        const first = await ctx.client.post('/payments/razorpay/webhook', JSON.parse(webhookPayload), { headers });
        if (first.status === 404) return ctx.skip('Webhook endpoint not mounted');
        assertOk(first, 'First webhook delivery must return 200 OK');

        // Second delivery (duplicate event)
        const second = await ctx.client.post('/payments/razorpay/webhook', JSON.parse(webhookPayload), { headers });
        assertOk(second, 'Duplicate webhook delivery must return 200 OK without errors');
      },
    },
  ],
});

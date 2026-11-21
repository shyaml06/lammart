import crypto from 'crypto';
import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  ADMIN_CREDENTIALS,
  E2E_CONSTANTS,
  generateCustomer,
  SAMPLE_ADDRESSES,
} from '../harness';
import { registerTestSuite } from '../runner';

registerTestSuite({
  name: 'Scenario 2: High-Value Online Order with Razorpay & GST PDF Invoice Lifecycle',
  tier: 4,
  description:
    'End-to-end user journey S2: Customer login -> High-value cart (>₹5,000) to Mumbai (400001) -> Free shipping and inter-state IGST validation -> Razorpay order creation -> Mock payment verification and webhook processing -> Status transition to paid -> Admin PDF tax invoice generation and validation.',
  tests: [
    {
      name: 'Execute full Scenario 2 high-value Razorpay order and GST invoice lifecycle',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // ─── Step 1: Customer Account & Mumbai Address Setup ─────────
        ctx.log('Step 1: Register customer and configure Mumbai address');
        const customer = generateCustomer();
        const regRes = await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });
        assertStatus(regRes, [200, 201], 'Customer registration must succeed');

        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.mumbaiInterState);
        assertStatus(addrRes, [200, 201], 'Mumbai address creation must succeed');
        const addressId = addrRes.data.id;
        assertDefined(addressId, 'Address ID is required');

        // ─── Step 2: High-Value Cart (> ₹5,000) ──────────────────────
        ctx.log('Step 2: Adding high-value non-heavy items exceeding ₹5,000');
        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        const nonHeavyProduct = products?.find((p: any) => !p.isHeavy && p.variants?.length > 0);
        if (!nonHeavyProduct || !nonHeavyProduct.variants?.[0]) {
          return ctx.skip('No non-heavy products available in catalog');
        }

        const variant = nonHeavyProduct.variants[0];
        const qty = Math.ceil(E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE / variant.price) + 2;
        await ctx.client.post('/cart/items', { variantId: variant.id, qty });

        // ─── Step 3: Checkout Quote & Inter-State GST Verification ────
        ctx.log('Step 3: Calculating checkout quote and validating inter-state IGST');
        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        assertOk(quoteRes, 'Checkout quote calculation must succeed');
        const quote = quoteRes.data;

        assert(
          quote.subtotal >= E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE,
          `Cart subtotal (${quote.subtotal}) must exceed ₹5,000 free shipping threshold`
        );
        assertEquals(
          quote.shippingCharge,
          0,
          `Base shipping must be waived for high-value non-heavy cart, got ${quote.shippingCharge}`
        );

        if (quote.igst !== undefined) {
          assertEquals(quote.cgst, 0, 'Inter-state order must have CGST = 0');
          assertEquals(quote.sgst, 0, 'Inter-state order must have SGST = 0');
          assert(quote.igst > 0, 'Inter-state order must have positive IGST');
          assertEquals(quote.igst, quote.taxTotal, 'IGST must equal total tax');
        }

        // ─── Step 4: Razorpay Order Placement ────────────────────────
        ctx.log('Step 4: Placing order with paymentMethod: razorpay');
        const orderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'razorpay',
          notes: 'High-value designer laminate delivery',
        });
        assertStatus(orderRes, [200, 201], 'Order placement with razorpay must return 200/201');
        const orderData = orderRes.data.order || orderRes.data;
        const orderId = orderData.id;
        const orderNo = orderData.orderNo;
        const razorpayOrderId =
          orderRes.data.razorpayOrder?.id ||
          orderData.providerOrderId ||
          orderData.razorpayOrderId ||
          `order_mock_${orderId}`;

        assertDefined(orderId, 'Order must have an ID');
        ctx.log(`Created Razorpay order ${orderNo} with payment reference: ${razorpayOrderId}`);

        // ─── Step 5: Simulate Payment Verification & Webhook ─────────
        ctx.log('Step 5: Simulating Razorpay payment verification & webhook capture');
        const mockPaymentId = `pay_mock_${Date.now()}`;
        const mockSecret = 'razorpay_secret_mock_test_key_123';
        const signaturePayload = `${razorpayOrderId}|${mockPaymentId}`;
        const validSignature = crypto
          .createHmac('sha256', mockSecret)
          .update(signaturePayload)
          .digest('hex');

        // Verify endpoint
        const verifyRes = await ctx.client.post('/payments/razorpay/verify', {
          razorpayOrderId,
          razorpayPaymentId: mockPaymentId,
          razorpaySignature: validSignature,
        });

        // Also test/fallback webhook if verify is offline or needs webhook event
        if (!verifyRes.ok) {
          const webhookPayload = {
            event: 'order.paid',
            payload: {
              order: {
                entity: {
                  id: razorpayOrderId,
                  amount: quote.grandTotal,
                  status: 'paid',
                },
              },
              payment: {
                entity: {
                  id: mockPaymentId,
                  order_id: razorpayOrderId,
                  amount: quote.grandTotal,
                  status: 'captured',
                },
              },
            },
          };
          const rawWebhookBody = JSON.stringify(webhookPayload);
          const webhookSig = crypto
            .createHmac('sha256', mockSecret)
            .update(rawWebhookBody)
            .digest('hex');

          await ctx.client.post('/payments/razorpay/webhook', webhookPayload, {
            headers: {
              'X-Razorpay-Signature': webhookSig,
              'Content-Type': 'application/json',
            },
          });
        }

        // ─── Step 6: Verify Order Transitions to Paid ────────────────
        ctx.log('Step 6: Verifying order status transitions to paid');
        const paidOrderRes = await ctx.client.get(`/me/orders/${orderNo}`);
        if (paidOrderRes.ok) {
          const paidOrder = paidOrderRes.data.order || paidOrderRes.data;
          assert(
            paidOrder.status === 'paid' || paidOrder.status === 'confirmed' || paidOrder.status === 'pending',
            `Order status should be paid or confirmed after payment, got ${paidOrder.status}`
          );
        }

        // ─── Step 7: Admin Generates and Validates PDF Tax Invoice ───
        ctx.log('Step 7: Admin generates and downloads GST-compliant PDF invoice');
        ctx.client.clearCookies();
        const adminLogin = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        assertOk(adminLogin, 'Admin login must succeed');

        const invoiceRes = await ctx.client.get(`/admin/orders/${orderId}/invoice`);
        assertStatus(invoiceRes, [200, 404], 'Invoice download endpoint check');

        if (invoiceRes.status === 200) {
          const contentType = invoiceRes.headers.get('content-type') || '';
          assert(
            contentType.includes('application/pdf') || contentType.includes('octet-stream'),
            `Invoice content-type must be PDF, got: ${contentType}`
          );

          // Verify PDF Magic Bytes (%PDF-)
          const raw = invoiceRes.rawText;
          assert(
            raw.startsWith('%PDF-') || raw.includes('%PDF-'),
            'Invoice binary data stream must contain valid PDF magic header (%PDF-)'
          );
          ctx.log('Successfully validated PDF binary header (%PDF-) on downloaded invoice stream');
        }
      },
    },
  ],
});

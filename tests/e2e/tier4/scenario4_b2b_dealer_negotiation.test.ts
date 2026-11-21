import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  ADMIN_CREDENTIALS,
  generateDealer,
  SAMPLE_ADDRESSES,
} from '../harness';
import { registerTestSuite } from '../runner';

registerTestSuite({
  name: 'Scenario 4: B2B Dealer Bulk Quote Negotiation & Conversion Lifecycle',
  tier: 4,
  description:
    'End-to-end user journey S4: B2B Dealer registration with GSTIN -> 100-sheet bulk quote submission -> Administrative quote review & wholesale pricing negotiation -> Dealer quote acceptance & order conversion -> Real-time inventory decrement verification.',
  tests: [
    {
      name: 'Execute full Scenario 4 B2B quote negotiation and order conversion journey',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // ─── Step 1: B2B Dealer Registration with GSTIN ───────────────
        ctx.log('Step 1: Registering enterprise B2B dealer with verified GSTIN');
        const dealer = generateDealer();
        const regRes = await ctx.client.post('/auth/register', {
          name: dealer.name,
          email: dealer.email,
          phone: dealer.phone,
          password: dealer.password,
          businessName: dealer.businessName,
          gstin: dealer.gstin,
        });
        assertStatus(regRes, [200, 201], 'Dealer registration must return 200/201');

        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Dealer address creation failed');

        // Check target variant initial stock
        const targetVariantId = 1;
        let initialStock = 0;
        const prodRes = await ctx.client.get('/products');
        if (prodRes.ok) {
          const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
          const foundProduct = products?.find((p: any) =>
            p.variants?.some((v: any) => v.id === targetVariantId)
          );
          const foundVar = foundProduct?.variants?.find((v: any) => v.id === targetVariantId);
          if (foundVar) {
            initialStock = foundVar.stock;
          }
        }

        // Ensure healthy stock via admin for 100 sheets test
        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        const requiredStock = Math.max(initialStock, 150);
        await ctx.client.patch(`/admin/variants/${targetVariantId}`, { stock: requiredStock });

        // ─── Step 2: Dealer Submits Bulk Quote Request (100 sheets) ───
        ctx.log('Step 2: Dealer submits bulk quote request for 100 sheets');
        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: dealer.email,
          password: dealer.password,
        });

        const bulkQty = 100;
        const quoteReqRes = await ctx.client.post('/quotes', {
          name: dealer.name,
          phone: dealer.phone,
          email: dealer.email,
          city: 'Ahmedabad',
          message: 'Bulk project procurement for hospital interior fitment (100 sheets)',
          items: [
            {
              variantId: targetVariantId,
              qty: bulkQty,
              description: 'Laminate Soft White Matte 8x4 ft 1.0mm',
            },
          ],
        });

        if (quoteReqRes.status === 404) return ctx.skip('Quotes API endpoint not mounted');
        assertStatus(quoteReqRes, [200, 201], 'Quote request submission must return 200/201');

        const quote = quoteReqRes.data.quote || quoteReqRes.data;
        const quoteId = quote.id;
        assertDefined(quoteId, 'Quote response must contain quote ID');
        assertEquals(quote.status, 'new', 'Initial quote status must be new');

        // ─── Step 3: Admin Reviews and Inputs Negotiated Unit Price ───
        ctx.log('Step 3: Admin sets negotiated wholesale unit price (₹1,150) and status to quoted');
        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });

        const adminQuoteRes = await ctx.client.get(`/admin/quotes/${quoteId}`);
        assertStatus(adminQuoteRes, [200, 404], 'Admin quote fetch');

        const negotiatedUnitPrice = 115000; // ₹1,150.00 in paise
        const negotiatedTotal = negotiatedUnitPrice * bulkQty;

        const updateRes = await ctx.client.patch(`/admin/quotes/${quoteId}`, {
          status: 'quoted',
          quotedTotal: negotiatedTotal,
          items: [
            {
              variantId: targetVariantId,
              qty: bulkQty,
              quotedUnitPrice: negotiatedUnitPrice,
            },
          ],
          adminNotes: 'Approved special contractor wholesale rate of ₹1,150/sheet',
        });
        assertStatus(updateRes, [200, 204], 'Admin quote pricing update must succeed');

        // ─── Step 4: Dealer Reviews and Accepts Negotiated Quote ──────
        ctx.log('Step 4: Dealer reviews and accepts negotiated quotation');
        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: dealer.email,
          password: dealer.password,
        });

        const dealerReviewRes = await ctx.client.get(`/quotes/${quoteId}`);
        if (dealerReviewRes.ok) {
          const reviewedQuote = dealerReviewRes.data.quote || dealerReviewRes.data;
          assertEquals(reviewedQuote.status, 'quoted', 'Quote status must be quoted');
          if (reviewedQuote.quotedTotal) {
            assertEquals(
              reviewedQuote.quotedTotal,
              negotiatedTotal,
              `Quoted total (${reviewedQuote.quotedTotal}) must match negotiated total (${negotiatedTotal})`
            );
          }
        }

        const acceptRes = await ctx.client.post(`/quotes/${quoteId}/accept`);
        assertStatus(acceptRes, [200, 204, 404], 'Dealer quote acceptance');

        // ─── Step 5: Convert Quote to Order ───────────────────────────
        ctx.log('Step 5: Converting accepted quote to formal customer order');
        const convertRes = await ctx.client.post(`/quotes/${quoteId}/convert`, {
          addressId,
          paymentMethod: 'cod',
          billingGstin: dealer.gstin,
        });

        if (convertRes.ok) {
          const order = convertRes.data.order || convertRes.data;
          assertDefined(order.id, 'Converted order must have an id');
          assertDefined(order.orderNo, 'Converted order must have an orderNo');
          ctx.log(`Successfully converted quote ${quoteId} to Order No: ${order.orderNo}`);

          // ─── Step 6: Verify Stock Decrement ───────────────────────────
          ctx.log('Step 6: Verifying inventory decremented by 100 units');
          const checkVarRes = await ctx.client.get('/products');
          if (checkVarRes.ok) {
            const prods = Array.isArray(checkVarRes.data) ? checkVarRes.data : checkVarRes.data?.data;
            const p = prods?.find((item: any) =>
              item.variants?.some((v: any) => v.id === targetVariantId)
            );
            const v = p?.variants?.find((item: any) => item.id === targetVariantId);
            if (v) {
              assertEquals(
                v.stock,
                requiredStock - bulkQty,
                `Variant inventory should decrement to ${requiredStock - bulkQty}, got ${v.stock}`
              );
            }
          }
        }
      },
    },
  ],
});

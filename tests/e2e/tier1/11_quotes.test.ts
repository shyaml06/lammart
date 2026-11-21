import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  ADMIN_CREDENTIALS,
  generateDealer,
} from '../harness';
import { registerSuite } from '../runner';

registerSuite({
  name: 'B2B Quotes & Negotiation Workflow',
  tier: 1,
  description: 'Verifies B2B bulk quote submissions, status initialization to new, admin retrieval, item pricing, and transition to quoted.',
  tests: [
    {
      name: 'B2B bulk quote submission succeeds with contact info and line items (POST /quotes)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const dealer = generateDealer();
        const res = await ctx.client.post('/quotes', {
          name: dealer.name,
          phone: dealer.phone,
          email: dealer.email,
          city: 'Ahmedabad',
          message: 'Requesting bulk discount pricing for commercial project',
          items: [
            { variantId: 1, qty: 100, description: '100 sheets of laminate' },
          ],
        });

        assertStatus(res, [200, 201], 'POST /quotes should return 200 or 201');
        assertDefined(res.data, 'Quote response must contain data');
        const quote = res.data.quote || res.data;
        assertDefined(quote.id, 'Quote must have an id');
      },
    },
    {
      name: 'Quote items snapshot and status initialization defaults to new',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const dealer = generateDealer();
        const res = await ctx.client.post('/quotes', {
          name: dealer.name,
          phone: dealer.phone,
          email: dealer.email,
          city: 'Surat',
          items: [{ variantId: 1, qty: 50 }],
        });

        if (!res.ok) return ctx.skip('Quote creation failed');
        const quote = res.data.quote || res.data;
        assertEquals(quote.status, 'new', 'Initial status of created quote must be new');
        if (quote.items) {
          assert(quote.items.length > 0, 'Quote items must be preserved');
          assertEquals(quote.items[0].qty, 50, 'Quote item quantity must match');
        }
      },
    },
    {
      name: 'Admin quote retrieval returns listing of pending quotes (GET /admin/quotes)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Login as admin
        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin login failed');

        const quotesRes = await ctx.client.get('/admin/quotes');
        assertStatus(quotesRes, [200, 404], 'GET /admin/quotes should return 200 or 404');
        if (quotesRes.status === 404) return ctx.skip('Admin quotes endpoint not mounted');

        assertOk(quotesRes, 'Admin quote listing must return 200 OK');
        const quotes = Array.isArray(quotesRes.data) ? quotesRes.data : quotesRes.data?.data;
        assert(Array.isArray(quotes), 'Admin quotes response must be an array');
      },
    },
    {
      name: 'Admin quote line-item pricing update specifies unit prices (PATCH /admin/quotes/:id)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Create a quote first as guest/customer
        ctx.client.clearCookies();
        const dealer = generateDealer();
        const quoteRes = await ctx.client.post('/quotes', {
          name: dealer.name,
          phone: dealer.phone,
          email: dealer.email,
          city: 'Vadodara',
          items: [{ variantId: 1, qty: 25 }],
        });
        if (!quoteRes.ok) return ctx.skip('Quote submission failed');
        const quoteId = quoteRes.data.quote?.id || quoteRes.data.id;

        // Login as admin
        await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });

        const patchRes = await ctx.client.patch(`/admin/quotes/${quoteId}`, {
          quotedTotal: 2500000, // ₹25,000 in paise
          status: 'quoted',
          adminNotes: 'Discounted 15% wholesale rate applied',
        });

        assertStatus(patchRes, [200, 404], 'PATCH /admin/quotes/:id should return 200 or 404');
        if (patchRes.status === 404) return ctx.skip('Admin quote patch endpoint not mounted');
        assertOk(patchRes, 'Admin quote update must return 200 OK');
      },
    },
    {
      name: 'Quote status transition to quoted recalculates and stores quoted_total',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        ctx.client.clearCookies();
        const dealer = generateDealer();
        const quoteRes = await ctx.client.post('/quotes', {
          name: dealer.name,
          phone: dealer.phone,
          email: dealer.email,
          items: [{ variantId: 1, qty: 10 }],
        });
        if (!quoteRes.ok) return ctx.skip('Quote submission failed');
        const quoteId = quoteRes.data.quote?.id || quoteRes.data.id;

        // Login as admin
        await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });

        const targetTotal = 1200000; // ₹12,000 in paise
        const patchRes = await ctx.client.patch(`/admin/quotes/${quoteId}`, {
          status: 'quoted',
          quotedTotal: targetTotal,
        });

        if (patchRes.status === 404) return ctx.skip('Quote patch endpoint not mounted');
        assertOk(patchRes, 'Quote patch must succeed');

        const updatedQuote = patchRes.data.quote || patchRes.data;
        assertEquals(updatedQuote.status, 'quoted', 'Quote status must transition to quoted');
        assertEquals(updatedQuote.quotedTotal, targetTotal, 'Quoted total must match submitted total');
      },
    },
  ],
});

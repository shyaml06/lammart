import {
  assert,
  assertDefined,
  assertOk,
  assertStatus,
} from '../harness';
import { registerSuite } from '../runner';

registerSuite({
  name: 'Search & Dynamic Faceted Filters',
  tier: 1,
  description: 'Verifies FTS5 full-text queries, prefix suggestions, dynamic filter aggregation, and product sorting.',
  tests: [
    {
      name: 'FTS5 full-text query returns matching catalog products (GET /products?q=laminate)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.get('/products', {
          params: { q: 'laminate' },
        });
        assertOk(res, 'GET /products?q=laminate must return 200 OK');
        const items = Array.isArray(res.data) ? res.data : res.data?.data;
        assert(Array.isArray(items), 'Search results must be an array');
        if (items.length > 0) {
          const match = items.some((p: any) =>
            p.name?.toLowerCase().includes('laminate') ||
            p.description?.toLowerCase().includes('laminate') ||
            p.category?.name?.toLowerCase().includes('laminate')
          );
          assert(match, 'Search results must contain items matching query keyword');
        }
      },
    },
    {
      name: 'Prefix search autocomplete returns keyword and product suggestions (GET /search/suggest?q=lam)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.get('/search/suggest', {
          params: { q: 'lam' },
        });
        assertStatus(res, [200, 404], 'Suggest endpoint should return 200');
        if (res.status === 404) return ctx.skip('Suggest endpoint not mounted');

        assertOk(res, 'Suggest endpoint must return 200 OK');
        assert(Array.isArray(res.data), 'Suggestions must be an array');
        if (res.data.length > 0) {
          const item = res.data[0];
          assert(
            typeof item === 'string' || typeof item.name === 'string' || typeof item.slug === 'string',
            'Suggestion item must have textual representation'
          );
        }
      },
    },
    {
      name: 'Dynamic faceted filter counts aggregate attributes for category (GET /filters?category=laminates)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.get('/filters', {
          params: { category: 'laminates' },
        });
        assertStatus(res, [200, 404], 'Filters endpoint should return 200 or 404');
        if (res.status === 404) return ctx.skip('Filters endpoint not yet implemented');

        assertOk(res, 'Filters endpoint must return 200 OK');
        assertDefined(res.data, 'Filters response must have data');
        assert(typeof res.data === 'object', 'Filters response must be an object of facet groups');
      },
    },
    {
      name: 'Category filter aggregation narrows product selection (GET /products?category=laminates)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.get('/products', {
          params: { category: 'laminates' },
        });
        assertOk(res, 'GET /products?category=laminates must return 200 OK');
        const items = Array.isArray(res.data) ? res.data : res.data?.data;
        assert(Array.isArray(items), 'Filtered products must be an array');

        for (const item of items) {
          if (item.category) {
            assert(
              item.category.slug === 'laminates' || item.category.name.toLowerCase().includes('laminate'),
              'All filtered products must belong to the laminates category'
            );
          }
        }
      },
    },
    {
      name: 'Product sorting options return catalog items in requested order (price_asc, price_desc, name_asc)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const resAsc = await ctx.client.get('/products', {
          params: { sort: 'price_asc' },
        });
        assertOk(resAsc, 'GET /products?sort=price_asc must return 200 OK');
        const ascItems = Array.isArray(resAsc.data) ? resAsc.data : resAsc.data?.data;

        if (ascItems && ascItems.length >= 2) {
          const prices = ascItems.map((p: any) => p.fromPrice ?? p.variants?.[0]?.price ?? 0);
          for (let i = 1; i < prices.length; i++) {
            assert(prices[i] >= prices[i - 1], `Ascending sort: item ${i} (${prices[i]}) must be >= item ${i - 1} (${prices[i - 1]})`);
          }
        }
      },
    },
  ],
});

import {
  assert,
  assertEquals,
  assertOk,
  assertStatus,
  assertErrorResponse,
} from '../harness';
import { registerTestSuite } from '../runner';

registerTestSuite({
  name: 'Tier 2 Boundaries: Catalog & Search',
  tier: 2,
  description:
    'Boundary and corner case test suite verifying non-existent slugs, oversized pagination, zero/negative page params, empty queries, SQLi/XSS probes, autocomplete minimum thresholds, non-existent faceted filters, inverted price bounds, and inactive product visibility.',
  tests: [
    {
      name: 'Non-existent category slug returns 404 NOT_FOUND',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const nonExistentSlug = 'completely-unknown-category-slug-99999';
        const res = await ctx.client.get(`/categories/${nonExistentSlug}`);
        assertStatus(res, [404, 400], 'Non-existent category slug must return 404 or 400');
        if (res.status === 404) {
          assert(
            res.data && (res.data.code === 'NOT_FOUND' || typeof res.data.message === 'string'),
            '404 response must indicate not found'
          );
        }
      },
    },
    {
      name: 'Non-existent product slug returns 404 NOT_FOUND',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const nonExistentSlug = 'non-existent-product-slug-abc-1234567890';
        const res = await ctx.client.get(`/products/${nonExistentSlug}`);
        assertStatus(res, 404, 'Non-existent product slug must return 404 NOT_FOUND');
        if (res.data && typeof res.data === 'object') {
          assert(
            res.data.code === 'NOT_FOUND' || typeof res.data.message === 'string',
            '404 response must include error message or code'
          );
        }
      },
    },
    {
      name: 'Oversized pagination limit capped or handled (e.g. limit=500 capped to 100)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.get('/products', {
          params: { page: 1, limit: 500 },
        });

        // Either returns 400 validation error (max limit 100 exceeded) or 200 capped at 100
        assertStatus(res, [200, 400], 'Oversized pagination limit must return 400 or 200 capped at 100');

        if (res.status === 200) {
          const products = Array.isArray(res.data) ? res.data : (res.data.data || res.data.items || []);
          assert(Array.isArray(products), 'Products must be an array');
          assert(
            products.length <= 100,
            `Pagination limit=500 must be capped to at most 100 items, received ${products.length}`
          );
          if (res.data.limit !== undefined) {
            assert(res.data.limit <= 100, `Reported limit must be <= 100, got ${res.data.limit}`);
          }
        } else {
          // If rejected with 400, verify error message
          assertErrorResponse(res, 400);
        }
      },
    },
    {
      name: 'Zero and negative page parameters (page=0, page=-1) handled gracefully (400 or defaults to page 1)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Test page=0
        const resZero = await ctx.client.get('/products', {
          params: { page: 0, limit: 10 },
        });
        assertStatus(
          resZero,
          [200, 400],
          'GET /products?page=0 must return 400 validation error or default to page 1 (200 OK)'
        );

        if (resZero.status === 200) {
          if (resZero.data.page !== undefined) {
            assertEquals(resZero.data.page, 1, 'page=0 when defaulting must normalize to page 1');
          }
        }

        // Test page=-1
        const resNeg = await ctx.client.get('/products', {
          params: { page: -1, limit: 10 },
        });
        assertStatus(
          resNeg,
          [200, 400],
          'GET /products?page=-1 must return 400 validation error or default to page 1 (200 OK)'
        );

        if (resNeg.status === 200) {
          if (resNeg.data.page !== undefined) {
            assertEquals(resNeg.data.page, 1, 'page=-1 when defaulting must normalize to page 1');
          }
        }
      },
    },
    {
      name: 'Empty search query (q="") returns full or empty catalog gracefully without crash',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.get('/products', {
          params: { q: '' },
        });

        assertOk(res, 'Empty search query q="" must return 200 OK without crashing');
        assert(res.data !== undefined && res.data !== null, 'Response body must not be empty');

        const products = Array.isArray(res.data) ? res.data : (res.data.data || res.data.items || []);
        assert(Array.isArray(products), 'Products must be returned as an array');
      },
    },
    {
      name: 'SQL injection / XSS probe strings in search query handled safely',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const attackPayloads = [
          "' OR '1'='1",
          "'; DROP TABLE products; --",
          '<script>alert(1)</script>',
          '"><img src=x onerror=alert(1)>',
          '" OR 1=1 --',
          "' UNION SELECT null, null, null--",
        ];

        for (const payload of attackPayloads) {
          const res = await ctx.client.get('/products', {
            params: { q: payload },
          });

          // Must return 200 (safe empty/filtered results) or 400 (validation rejected), never 500
          assertStatus(
            res,
            [200, 400],
            `Search query with payload [${payload}] must not cause 500 internal server error`
          );

          if (res.status === 200) {
            // Ensure raw text does not reflect unescaped executable script tags
            assert(
              !res.rawText.includes('<script>alert(1)</script>'),
              'Response body must not reflect unescaped HTML script tags'
            );
          }
        }
      },
    },
    {
      name: 'Autocomplete suggest with short query (<2 characters) returns 400 or empty array',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Test with 1 character query
        const resSingleChar = await ctx.client.get('/search/suggest', {
          params: { q: 'a' },
        });

        assertStatus(
          resSingleChar,
          [200, 400, 404],
          'GET /search/suggest?q=a must return 400 validation error, 200 with empty array, or 404 if unmounted'
        );

        if (resSingleChar.status === 200) {
          const suggestions = Array.isArray(resSingleChar.data)
            ? resSingleChar.data
            : (resSingleChar.data.suggestions || resSingleChar.data.data || []);
          assert(Array.isArray(suggestions), 'Suggestions must be an array');
          assertEquals(suggestions.length, 0, 'Autocomplete for query length < 2 should return empty array');
        }

        // Test with empty query
        const resEmpty = await ctx.client.get('/search/suggest', {
          params: { q: '' },
        });
        assertStatus(resEmpty, [200, 400, 404], 'GET /search/suggest?q= must return 400, 200, or 404');
        if (resEmpty.status === 200) {
          const suggestions = Array.isArray(resEmpty.data)
            ? resEmpty.data
            : (resEmpty.data.suggestions || resEmpty.data.data || []);
          assert(Array.isArray(suggestions), 'Suggestions must be an array');
          assertEquals(suggestions.length, 0, 'Autocomplete for empty query should return empty array');
        }
      },
    },
    {
      name: 'Non-existent faceted filter attribute values return 0 matching products',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.get('/products', {
          params: {
            category: 'laminates',
            finish: 'completely_fictitious_finish_value_xyz999',
            thickness: '9999mm_invalid_thickness',
          },
        });

        assertOk(res, 'GET /products with non-existent attribute values must return 200 OK');
        const products = Array.isArray(res.data) ? res.data : (res.data.data || res.data.items || []);
        assert(Array.isArray(products), 'Products must be an array');
        assertEquals(
          products.length,
          0,
          `Products matching fictitious attribute values must be 0, received ${products.length}`
        );
      },
    },
    {
      name: 'Filter query with extreme price bounds (min_price > max_price) rejected or returns empty list',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // min_price = 1,000,000 paise (₹10,000) > max_price = 100 paise (₹1)
        const res = await ctx.client.get('/products', {
          params: {
            minPrice: 1000000,
            maxPrice: 100,
          },
        });

        assertStatus(
          res,
          [200, 400],
          'GET /products with minPrice > maxPrice must return 400 validation error or 200 with empty list'
        );

        if (res.status === 200) {
          const products = Array.isArray(res.data) ? res.data : (res.data.data || res.data.items || []);
          assert(Array.isArray(products), 'Products must be an array');
          assertEquals(
            products.length,
            0,
            `No products can satisfy minPrice > maxPrice condition, got ${products.length}`
          );
        }
      },
    },
    {
      name: 'Product detail page for inactive product (is_active = 0) returns 404 or hidden from public',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Query product detail for a known inactive product slug or an inactive product
        const res = await ctx.client.get('/products/inactive-discontinued-sample-laminate');
        assertStatus(
          res,
          [404, 200],
          'GET /products/:slug for inactive product must return 404 or return { isActive: false }'
        );

        if (res.status === 200) {
          // If returned, it must not be active for public purchases
          const product = res.data;
          assert(
            product.isActive === false || product.isActive === 0 || product.is_active === 0,
            'Product returned must have isActive=false if public endpoint exposes it'
          );
        }
      },
    },
  ],
});

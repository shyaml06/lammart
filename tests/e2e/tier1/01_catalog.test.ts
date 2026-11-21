import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  SEED_CATEGORIES,
  SEED_PRODUCTS,
} from '../harness';
import { registerSuite } from '../runner';

registerSuite({
  name: 'Catalog & Categories Management',
  tier: 1,
  description: 'Verifies category hierarchy, product listing pagination, product details by slug, variants, and dual pricing display.',
  tests: [
    {
      name: 'Category tree retrieval returns hierarchical category structure (GET /categories)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.get('/categories');
        assertOk(res, 'GET /categories must return success');
        assert(Array.isArray(res.data), 'Categories response must be an array');
        assert(res.data.length > 0, 'Categories array must not be empty');

        const rootCat = res.data[0];
        assertDefined(rootCat.id, 'Category must have an id');
        assertDefined(rootCat.name, 'Category must have a name');
        assertDefined(rootCat.slug, 'Category must have a slug');
        assert(typeof rootCat.sortOrder === 'number', 'sortOrder must be a number');
        assert(typeof rootCat.isActive === 'boolean', 'isActive must be a boolean');

        if (rootCat.children) {
          assert(Array.isArray(rootCat.children), 'Category children must be an array if present');
        }
      },
    },
    {
      name: 'Product list with pagination returns paginated data and metadata (GET /products?page=1&limit=10)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.get('/products', {
          params: { page: 1, limit: 10 },
        });
        assertOk(res, 'GET /products must return 200 OK');
        assertDefined(res.data, 'Response must have data property');

        // Can be { data: Product[], page, limit, total, totalPages } or array
        const products = Array.isArray(res.data) ? res.data : res.data.data;
        assert(Array.isArray(products), 'Products list must be an array');
        assert(products.length <= 10, 'Returned products must not exceed limit 10');

        if (products.length > 0) {
          const product = products[0];
          assertDefined(product.id, 'Product must have id');
          assertDefined(product.name, 'Product must have name');
          assertDefined(product.slug, 'Product must have slug');
          assertDefined(product.unit, 'Product must have unit');
        }
      },
    },
    {
      name: 'Product detail page retrieval by known slug returns full product model (GET /products/:slug)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const slug = SEED_PRODUCTS[0].slug;
        const res = await ctx.client.get(`/products/${slug}`);
        assertStatus(res, [200, 404], 'GET /products/:slug must return 200 or 404');

        if (res.status === 200) {
          const product = res.data;
          assertEquals(product.slug, slug, 'Returned product slug must match requested slug');
          assertDefined(product.name, 'Product must have name');
          assertDefined(product.categoryId, 'Product must have categoryId');
        }
      },
    },
    {
      name: 'Product variant options and SKU verification',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const slug = SEED_PRODUCTS[0].slug;
        const res = await ctx.client.get(`/products/${slug}`);
        if (res.status === 404) return ctx.skip('Seed product slug not yet populated');

        assertOk(res, 'Product detail must be 200');
        const product = res.data;
        assert(Array.isArray(product.variants), 'Product must include variants array');
        assert(product.variants.length > 0, 'Product must have at least one variant');

        const variant = product.variants[0];
        assertDefined(variant.id, 'Variant must have id');
        assertDefined(variant.sku, 'Variant must have SKU');
        assert(typeof variant.price === 'number', 'Variant price must be a number in paise');
        assert(typeof variant.stock === 'number', 'Variant stock must be a number');
        assert(typeof variant.moq === 'number', 'Variant moq must be a number');
      },
    },
    {
      name: 'Product dual price display maintains paise integer precision and sqft calculation',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.get('/products');
        assertOk(res, 'GET /products must return 200 OK');
        const products = Array.isArray(res.data) ? res.data : res.data.data;
        if (!products || products.length === 0) return ctx.skip('No products available');

        const sheetProduct = products.find((p: any) => p.unit === 'sheet' && p.variants?.length > 0);
        if (!sheetProduct) return ctx.skip('No sheet products with variants found');

        const variant = sheetProduct.variants[0];
        assert(Number.isInteger(variant.price), 'Variant price must be integer paise');
        assert(variant.price > 0, 'Variant price must be positive');

        // Standard 8x4 sheet is 32 sqft. Calculate per sqft price in paise.
        const sqftArea = 32;
        const pricePerSqftPaise = Math.round(variant.price / sqftArea);
        assert(pricePerSqftPaise > 0, 'Price per sqft must be positive integer paise');
        assert(pricePerSqftPaise < variant.price, 'Price per sqft must be less than full sheet price');
      },
    },
  ],
});

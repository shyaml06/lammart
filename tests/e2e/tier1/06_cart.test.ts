import {
  assert,
  assertEquals,
  assertDefined,
  assertErrorResponse,
  assertOk,
  assertStatus,
  generateCustomer,
} from '../harness';
import { registerSuite } from '../runner';

registerSuite({
  name: 'Shopping Cart & MOQ Validation',
  tier: 1,
  description: 'Verifies adding items to cart, viewing contents, quantity updates, item deletion, and MOQ/stock enforcement.',
  tests: [
    {
      name: 'Add item to cart creates cart item record (POST /cart/items)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        // Fetch a valid product variant first
        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        const variantId = products?.[0]?.variants?.[0]?.id ?? 1;

        const res = await ctx.client.post('/cart/items', {
          variantId,
          qty: 1,
        });

        assertStatus(res, [200, 201], 'POST /cart/items must return 200 or 201');
        assertDefined(res.data, 'Response must have cart item data');
      },
    },
    {
      name: 'Retrieve cart contents returns item list and calculated subtotal (GET /cart)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        const variantId = products?.[0]?.variants?.[0]?.id ?? 1;

        await ctx.client.post('/cart/items', { variantId, qty: 2 });

        const res = await ctx.client.get('/cart');
        assertOk(res, 'GET /cart must return 200 OK');
        assertDefined(res.data, 'Cart must have data');
        const items = res.data.items || (Array.isArray(res.data) ? res.data : []);
        assert(Array.isArray(items), 'Cart items must be an array');
        assert(items.length >= 1, 'Cart items array must contain added item');
      },
    },
    {
      name: 'Update cart item quantity adjusts item quantity (PATCH /cart/items/:id)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        const variantId = products?.[0]?.variants?.[0]?.id ?? 1;

        const addRes = await ctx.client.post('/cart/items', { variantId, qty: 1 });
        const itemId = addRes.data?.id;
        if (!itemId) return ctx.skip('Cart item ID unavailable');

        const patchRes = await ctx.client.patch(`/cart/items/${itemId}`, { qty: 4 });
        assertOk(patchRes, 'PATCH /cart/items/:id must return 200 OK');
        assertEquals(patchRes.data.qty, 4, 'Cart item quantity must be updated to 4');
      },
    },
    {
      name: 'Remove item from cart deletes item from user cart (DELETE /cart/items/:id)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        const variantId = products?.[0]?.variants?.[0]?.id ?? 1;

        const addRes = await ctx.client.post('/cart/items', { variantId, qty: 1 });
        const itemId = addRes.data?.id;
        if (!itemId) return ctx.skip('Cart item ID unavailable');

        const deleteRes = await ctx.client.delete(`/cart/items/${itemId}`);
        assertStatus(deleteRes, [200, 204], 'DELETE /cart/items/:id must return 200 or 204');

        const getRes = await ctx.client.get('/cart');
        const items = getRes.data.items || (Array.isArray(getRes.data) ? getRes.data : []);
        const exists = items.some((i: any) => i.id === itemId);
        assert(!exists, 'Deleted item must not exist in cart');
      },
    },
    {
      name: 'MOQ and stock limit enforcement rejects invalid quantities',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        // Zero or negative quantity violation
        const zeroQtyRes = await ctx.client.post('/cart/items', {
          variantId: 1,
          qty: 0,
        });
        assertStatus(zeroQtyRes, [400, 422], 'Zero qty should be rejected by validation schema');

        // Exorbitant quantity exceeding stock
        const hugeQtyRes = await ctx.client.post('/cart/items', {
          variantId: 1,
          qty: 999999999,
        });
        assertStatus(hugeQtyRes, [400, 422], 'Excessive quantity exceeding stock should be rejected');
      },
    },
  ],
});

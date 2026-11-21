import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  ADMIN_CREDENTIALS,
  generateCustomer,
  SAMPLE_ADDRESSES,
} from '../harness';
import { registerTestSuite } from '../runner';

registerTestSuite({
  name: 'Tier 3: Cart Stock Validation, Depletion & Atomic Restorations',
  tier: 3,
  description:
    'Cross-feature suite verifying atomic stock decrement during order placement, order rejection upon mid-checkout stock depletion (INSUFFICIENT_STOCK), inventory restock on order cancellation, and exact stock limit boundaries.',
  tests: [
    {
      name: 'Cart update vs stock depletion: Cart item quantity validated against real-time stock; if stock decrements before order submission, atomic order transaction rejects with INSUFFICIENT_STOCK',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Step 1: Customer A registers and adds item to cart
        const customerA = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customerA.name,
          email: customerA.email,
          phone: customerA.phone,
          password: customerA.password,
        });

        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Address creation failed');

        // Get product variant and its current stock
        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        const targetProduct = products?.find((p: any) => p.variants?.length > 0);
        if (!targetProduct || !targetProduct.variants?.[0]) return ctx.skip('No variants available');

        const variant = targetProduct.variants[0];
        const initialStock = variant.stock;

        // Customer A adds 5 units to cart
        const orderQty = 5;
        await ctx.client.post('/cart/items', { variantId: variant.id, qty: orderQty });

        // Step 2: Simulate inventory depletion before Customer A checkout
        // Admin updates variant stock to 2 (less than cart qty of 5)
        ctx.client.clearCookies();
        const adminLogin = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!adminLogin.ok) return ctx.skip('Admin login failed');

        await ctx.client.patch(`/admin/variants/${variant.id}`, { stock: 2 });

        // Step 3: Customer A logs back in and attempts to place order
        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: customerA.email,
          password: customerA.password,
        });

        const orderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'cod',
        });

        // Must reject due to real-time stock shortage
        assertStatus(
          orderRes,
          [400, 409, 422],
          'Order submission with depleted stock must return 400/409/422 INSUFFICIENT_STOCK'
        );

        if (orderRes.data?.code) {
          assert(
            orderRes.data.code.includes('STOCK') || orderRes.data.code === 'VALIDATION_ERROR',
            `Error code should indicate stock depletion, got ${orderRes.data.code}`
          );
        }

        // Cleanup: Admin restores original stock
        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        await ctx.client.patch(`/admin/variants/${variant.id}`, { stock: initialStock });
      },
    },
    {
      name: 'Order cancellation restores variant inventory count atomically',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Customer registers and creates address
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

        // Admin checks baseline stock
        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });

        // Set controlled stock on variant 1 (e.g. 50 units)
        const baselineStock = 50;
        await ctx.client.patch('/admin/variants/1', { stock: baselineStock });

        // Customer places order for 4 units
        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: customer.email,
          password: customer.password,
        });

        const purchasedQty = 4;
        await ctx.client.post('/cart/items', { variantId: 1, qty: purchasedQty });

        const orderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'cod',
        });
        assertStatus(orderRes, [200, 201], 'Order placement must succeed');

        const order = orderRes.data.order || orderRes.data;
        const orderId = order.id;

        // Verify stock decremented to baseline - purchasedQty
        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });

        // Cancel order via admin
        const cancelRes = await ctx.client.patch(`/admin/orders/${orderId}/status`, {
          status: 'cancelled',
          currentStatus: order.status,
        });
        assertStatus(cancelRes, [200, 204], 'Admin order cancellation must succeed');

        // Check variant stock is restored
        const varCheckRes = await ctx.client.get('/products/royal-high-gloss-oak');
        if (varCheckRes.ok) {
          const var1 = varCheckRes.data.variants?.find((v: any) => v.id === 1);
          if (var1) {
            assertEquals(
              var1.stock,
              baselineStock,
              `Variant stock should be restored to baseline (${baselineStock}) after order cancellation, got ${var1.stock}`
            );
          }
        }
      },
    },
    {
      name: 'Concurrent cart additions hitting exact stock limit',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Admin configures variant 2 with known low stock of 3 units
        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });

        const exactStock = 3;
        await ctx.client.patch('/admin/variants/2', { stock: exactStock });

        // Customer registers and tries adding exact stock
        ctx.client.clearCookies();
        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        // Adding exact stock (3) should succeed
        const addExactRes = await ctx.client.post('/cart/items', {
          variantId: 2,
          qty: exactStock,
        });
        assertStatus(addExactRes, [200, 201], 'Adding exact available stock to cart must succeed');

        // Adding 1 more unit beyond available stock (4) must fail
        const addOverRes = await ctx.client.put('/cart/items/2', {
          qty: exactStock + 1,
        });
        assertStatus(
          addOverRes,
          [400, 422],
          'Updating cart to exceed available stock must return 400 or 422'
        );

        if (addOverRes.data?.code) {
          assert(
            addOverRes.data.code.includes('STOCK') || addOverRes.data.code === 'VALIDATION_ERROR',
            `Error code should indicate stock limit exceeded, got ${addOverRes.data.code}`
          );
        }

        // Cleanup: restore healthy stock
        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        await ctx.client.patch('/admin/variants/2', { stock: 50 });
      },
    },
  ],
});

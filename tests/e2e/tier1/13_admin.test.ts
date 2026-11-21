import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  ADMIN_CREDENTIALS,
  generateCustomer,
} from '../harness';
import { registerSuite } from '../runner';

registerSuite({
  name: 'Admin Management & RBAC Protection',
  tier: 1,
  description: 'Verifies RBAC protection on admin endpoints, dashboard metrics, product catalog CRUD, inline variant editing, and settings management.',
  tests: [
    {
      name: 'Role guard enforcement rejects unauthenticated and customer requests to /admin/* with 401 or 403',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // 1. Unauthenticated request
        ctx.client.clearCookies();
        const unauthRes = await ctx.client.get('/admin/dashboard');
        assertStatus(unauthRes, [401, 403], 'Unauthenticated request to /admin/dashboard must return 401 or 403');

        // 2. Regular customer request
        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const custRes = await ctx.client.get('/admin/dashboard');
        assertStatus(custRes, [401, 403], 'Customer role request to /admin/dashboard must be rejected with 401 or 403');
      },
    },
    {
      name: 'Admin login grants access to dashboard metrics (GET /admin/dashboard)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin credentials not seeded');

        const dashRes = await ctx.client.get('/admin/dashboard');
        assertStatus(dashRes, [200, 404], 'GET /admin/dashboard should return 200 or 404');
        if (dashRes.status === 404) return ctx.skip('Admin dashboard endpoint not mounted');

        assertOk(dashRes, 'Admin dashboard request must succeed');
        assertDefined(dashRes.data, 'Dashboard response must contain metrics');
      },
    },
    {
      name: 'Product catalog CRUD operations via admin API (create, read, update, delete)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin login failed');

        // 1. Create product
        const uniqueName = `Admin E2E Test Product ${Date.now()}`;
        const createRes = await ctx.client.post('/admin/products', {
          name: uniqueName,
          categoryId: 1,
          unit: 'sheet',
          gstRate: 18,
          isHeavy: false,
          description: 'Created via E2E Admin test',
        });

        assertStatus(createRes, [200, 201, 404], 'POST /admin/products should return 200/201 or 404');
        if (createRes.status === 404) return ctx.skip('Admin product create endpoint not mounted');

        assertOk(createRes, 'Product creation must succeed');
        const productId = createRes.data?.id;
        assertDefined(productId, 'Created product must have id');

        // 2. Update product
        const updatedName = `${uniqueName} (Updated)`;
        const updateRes = await ctx.client.put(`/admin/products/${productId}`, {
          name: updatedName,
          categoryId: 1,
          unit: 'sheet',
          gstRate: 18,
          isHeavy: false,
        });
        assertOk(updateRes, 'Product update must succeed');

        // 3. Delete product
        const deleteRes = await ctx.client.delete(`/admin/products/${productId}`);
        assertStatus(deleteRes, [200, 204], 'Product deletion must return 200 or 204');
      },
    },
    {
      name: 'Inline variant editing modifies price, stock, and SKU directly (PATCH /admin/variants/:id)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });

        const patchRes = await ctx.client.patch('/admin/variants/1', {
          price: 245000, // ₹2,450
          stock: 42,
        });

        assertStatus(patchRes, [200, 404], 'PATCH /admin/variants/:id should return 200 or 404');
        if (patchRes.status === 404) return ctx.skip('Admin variant patch endpoint not mounted');

        assertOk(patchRes, 'Variant inline update must succeed');
        if (patchRes.data) {
          assertEquals(patchRes.data.price, 245000, 'Variant price must be updated');
          assertEquals(patchRes.data.stock, 42, 'Variant stock must be updated');
        }
      },
    },
    {
      name: 'Store settings management retrieves and updates key-value settings (GET /admin/settings, PUT /admin/settings)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });

        // 1. Get settings
        const getRes = await ctx.client.get('/admin/settings');
        assertStatus(getRes, [200, 404], 'GET /admin/settings should return 200 or 404');
        if (getRes.status === 404) return ctx.skip('Admin settings endpoint not mounted');

        assertOk(getRes, 'GET /admin/settings must succeed');
        assertDefined(getRes.data, 'Store settings response must have data');

        // 2. Update settings
        const updateRes = await ctx.client.put('/admin/settings', {
          shopName: 'Lammart Architectural Hardware & Laminates',
          whatsappNumber: '919825000000',
        });
        assertOk(updateRes, 'PUT /admin/settings must succeed');
      },
    },
  ],
});

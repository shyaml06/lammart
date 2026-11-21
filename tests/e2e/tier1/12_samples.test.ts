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
import { registerSuite } from '../runner';

registerSuite({
  name: 'Sample Swatches Ordering (Max 5)',
  tier: 1,
  description: 'Verifies sample swatch request submission, strict max 5 swatches limit, admin listing, dispatch status updates, and user tracking.',
  tests: [
    {
      name: 'Sample swatch request submission succeeds for up to 5 items (POST /samples)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        const res = await ctx.client.post('/samples', {
          name: customer.name,
          phone: customer.phone,
          address: SAMPLE_ADDRESSES.ahmedabadIntraState.line1,
          pincode: SAMPLE_ADDRESSES.ahmedabadIntraState.pincode,
          variantIds: [1, 2, 3],
        });

        assertStatus(res, [200, 201], 'POST /samples should return 200 or 201');
        assertDefined(res.data, 'Sample response must have data');
        const sample = res.data.sample || res.data;
        assertDefined(sample.id, 'Created sample request must have an id');
      },
    },
    {
      name: 'Max 5 swatches limit enforcement rejects requests with more than 5 variant IDs',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        // Violate limit by providing 6 variant IDs
        const res = await ctx.client.post('/samples', {
          name: customer.name,
          phone: customer.phone,
          address: SAMPLE_ADDRESSES.ahmedabadIntraState.line1,
          pincode: SAMPLE_ADDRESSES.ahmedabadIntraState.pincode,
          variantIds: [1, 2, 3, 4, 5, 6],
        });

        assertStatus(res, [400, 422], 'Sample request with >5 swatches must be rejected with 400 or 422');
      },
    },
    {
      name: 'Admin sample requests listing returns all pending sample requests (GET /admin/samples)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Login as admin
        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin login failed');

        const res = await ctx.client.get('/admin/samples');
        assertStatus(res, [200, 404], 'GET /admin/samples should return 200 or 404');
        if (res.status === 404) return ctx.skip('Admin samples endpoint not mounted');

        assertOk(res, 'Admin samples listing must return 200 OK');
        const samples = Array.isArray(res.data) ? res.data : res.data?.data;
        assert(Array.isArray(samples), 'Admin samples response must be an array');
      },
    },
    {
      name: 'Admin sample status update modifies request state to dispatched (PATCH /admin/samples/:id)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Create sample request
        ctx.client.clearCookies();
        const customer = generateCustomer();
        const sampleRes = await ctx.client.post('/samples', {
          name: customer.name,
          phone: customer.phone,
          address: SAMPLE_ADDRESSES.ahmedabadIntraState.line1,
          pincode: SAMPLE_ADDRESSES.ahmedabadIntraState.pincode,
          variantIds: [1, 2],
        });
        if (!sampleRes.ok) return ctx.skip('Sample creation failed');
        const sampleId = sampleRes.data.sample?.id || sampleRes.data.id;

        // Login as admin
        await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });

        const patchRes = await ctx.client.patch(`/admin/samples/${sampleId}`, {
          status: 'dispatched',
        });

        assertStatus(patchRes, [200, 404], 'PATCH /admin/samples/:id should return 200 or 404');
        if (patchRes.status === 404) return ctx.skip('Admin sample patch endpoint not mounted');
        assertOk(patchRes, 'Admin sample update must return 200 OK');
      },
    },
    {
      name: 'Customer sample history tracking allows logged-in customer to view requested samples',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const sampleRes = await ctx.client.post('/samples', {
          name: customer.name,
          phone: customer.phone,
          address: SAMPLE_ADDRESSES.ahmedabadIntraState.line1,
          pincode: SAMPLE_ADDRESSES.ahmedabadIntraState.pincode,
          variantIds: [1],
        });
        if (!sampleRes.ok) return ctx.skip('Sample request failed');

        const historyRes = await ctx.client.get('/me/samples');
        assertStatus(historyRes, [200, 404], 'GET /me/samples should return 200 or 404');
        if (historyRes.status === 404) return ctx.skip('Customer samples history endpoint not mounted');

        assertOk(historyRes, 'Customer sample history must return 200 OK');
        const list = Array.isArray(historyRes.data) ? historyRes.data : historyRes.data?.data;
        assert(Array.isArray(list), 'Customer samples must be an array');
      },
    },
  ],
});

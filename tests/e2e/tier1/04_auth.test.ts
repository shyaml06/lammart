import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  generateCustomer,
} from '../harness';
import { registerSuite } from '../runner';

registerSuite({
  name: 'Customer Authentication & Session Management',
  tier: 1,
  description: 'Verifies customer registration, login credentials verification, JWT cookie persistence, profile retrieval, and logout.',
  tests: [
    {
      name: 'Customer registration creates new account with role customer (POST /auth/register)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        const res = await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        assertStatus(res, [200, 201], 'POST /auth/register should return 200 or 201');
        assertDefined(res.data, 'Registration response must have user data');
        const user = res.data.user || res.data;
        assertDefined(user.id, 'Registered user must have an id');
        assertEquals(user.role, 'customer', 'Registered user role must be customer');
      },
    },
    {
      name: 'Customer login succeeds with valid credentials (POST /auth/login)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const res = await ctx.client.post('/auth/login', {
          emailOrPhone: customer.email,
          password: customer.password,
        });

        assertOk(res, 'POST /auth/login must succeed with valid credentials');
        const user = res.data.user || res.data;
        assertDefined(user, 'Login must return user details');
        assertEquals(user.email, customer.email, 'Logged in user email must match');
      },
    },
    {
      name: 'Auth token cookie persistence stores session token in cookie jar',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        ctx.client.clearCookies();

        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const authToken = ctx.client.getCookie('auth_token') || ctx.client.getAuthToken();
        assert(Boolean(authToken), 'Cookie jar or client auth state must contain auth_token after auth action');
      },
    },
    {
      name: 'Authenticated profile retrieval returns current user profile (GET /me)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        ctx.client.clearCookies();

        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const res = await ctx.client.get('/me');
        assertOk(res, 'GET /me must return 200 OK for authenticated customer');
        const profile = res.data.user || res.data;
        assertDefined(profile.id, 'Profile must have id');
        assertEquals(profile.email, customer.email, 'Profile email must match authenticated user');
      },
    },
    {
      name: 'Logout clears session cookie and revokes authenticated access (POST /auth/logout)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const logoutRes = await ctx.client.post('/auth/logout');
        assertOk(logoutRes, 'POST /auth/logout must return 200 OK');

        // Subsequent authenticated call should fail with 401 Unauthorized
        const meRes = await ctx.client.get('/me');
        assertStatus(meRes, [401, 403], 'GET /me after logout must be rejected with 401/403');
      },
    },
  ],
});

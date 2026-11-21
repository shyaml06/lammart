import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  assertErrorResponse,
  ADMIN_CREDENTIALS,
  generateCustomer,
} from '../harness';
import { registerTestSuite } from '../runner';

registerTestSuite({
  name: 'Tier 2 Boundaries: B2B Quotes & Sample Ordering',
  tier: 2,
  description:
    'Boundary and corner case test suite verifying sample requests with empty/oversized variant arrays (>5), non-existent variant IDs, invalid pincodes, missing customer contact details, B2B quote empty items, negative item quantities, negative quoted unit prices, and RBAC authentication on admin quote endpoints.',
  tests: [
    {
      name: 'Sample request with empty variantIds array returns 400 VALIDATION_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        const res = await ctx.client.post('/samples', {
          name: customer.name,
          phone: customer.phone,
          address: '101 Sample Test Way, Bodakdev',
          pincode: '380001',
          variantIds: [], // Empty array violates min(1) rule
        });

        assertStatus(
          res,
          [400, 422],
          'Sample request with empty variantIds array must return 400 VALIDATION_ERROR'
        );
      },
    },
    {
      name: 'Sample request with more than 5 variantIds returns 400 MAX_5_SAMPLES_EXCEEDED',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        const res = await ctx.client.post('/samples', {
          name: customer.name,
          phone: customer.phone,
          address: '101 Sample Test Way, Bodakdev',
          pincode: '380001',
          variantIds: [1, 2, 3, 4, 5, 6], // 6 items violates max(5) limit
        });

        assertStatus(
          res,
          [400, 422],
          'Sample request with >5 variant IDs must return 400 MAX_5_SAMPLES_EXCEEDED'
        );
      },
    },
    {
      name: 'Sample request with non-existent variant ID returns 400 or 404',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        const res = await ctx.client.post('/samples', {
          name: customer.name,
          phone: customer.phone,
          address: '101 Sample Test Way, Bodakdev',
          pincode: '380001',
          variantIds: [99999999], // Fictitious variant ID
        });

        assertStatus(
          res,
          [400, 404, 422],
          'Sample request with non-existent variant ID must return 400 or 404'
        );
      },
    },
    {
      name: 'Sample request with invalid pincode returns 400 VALIDATION_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        const res = await ctx.client.post('/samples', {
          name: customer.name,
          phone: customer.phone,
          address: '101 Sample Test Way, Bodakdev',
          pincode: 'ABC123', // Non-numeric pincode
          variantIds: [1],
        });

        assertStatus(
          res,
          400,
          'Sample request with invalid pincode format must return 400 VALIDATION_ERROR'
        );
      },
    },
    {
      name: 'Sample request with missing contact name or phone returns 400 VALIDATION_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Missing name and invalid phone
        const res = await ctx.client.post('/samples', {
          name: '',
          phone: '12345',
          address: '101 Sample Test Way, Bodakdev',
          pincode: '380001',
          variantIds: [1],
        });

        assertStatus(
          res,
          400,
          'Sample request with missing contact name and phone must return 400 VALIDATION_ERROR'
        );
      },
    },
    {
      name: 'B2B quote request with empty items array returns 400 VALIDATION_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        const res = await ctx.client.post('/quotes', {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          city: 'Ahmedabad',
          message: 'Need bulk quote for interior project',
          items: [], // Empty items array violates min(1) rule
        });

        assertStatus(
          res,
          [400, 422],
          'B2B quote request with empty items array must return 400 VALIDATION_ERROR'
        );
      },
    },
    {
      name: 'B2B quote request with negative item quantity returns 400 VALIDATION_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        const res = await ctx.client.post('/quotes', {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          city: 'Ahmedabad',
          message: 'Bulk order',
          items: [
            {
              variantId: 1,
              description: 'Laminate Sheets',
              qty: -5, // Negative quantity
            },
          ],
        });

        assertStatus(
          res,
          400,
          'B2B quote request with negative item quantity must return 400 VALIDATION_ERROR'
        );
      },
    },
    {
      name: 'B2B quote request with missing customer contact details returns 400 VALIDATION_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.post('/quotes', {
          name: '',
          phone: '',
          items: [
            {
              variantId: 1,
              qty: 50,
            },
          ],
        });

        assertStatus(
          res,
          400,
          'B2B quote request with missing customer name/phone must return 400 VALIDATION_ERROR'
        );
      },
    },
    {
      name: 'Admin quote update with negative quoted_unit_price returns 400 VALIDATION_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Login as admin
        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin credentials not seeded');

        // Attempt update with negative price
        const res = await ctx.client.patch('/admin/quotes/1', {
          items: [
            {
              id: 1,
              quotedUnitPrice: -50000, // Negative unit price in paise
            },
          ],
        });

        assertStatus(
          res,
          [400, 422, 404],
          'Admin quote update with negative quoted_unit_price must return 400 or 422'
        );
      },
    },
    {
      name: 'Unauthenticated access to admin quote resolution /admin/quotes/:id returns 401 or 403',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Unauthenticated client
        ctx.client.clearCookies();

        const res = await ctx.client.patch('/admin/quotes/1', {
          status: 'quoted',
        });

        assertStatus(
          res,
          [401, 403],
          'Unauthenticated access to admin quote endpoints must return 401 or 403'
        );
      },
    },
  ],
});

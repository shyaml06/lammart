import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  assertErrorResponse,
} from '../harness';
import {
  generateCustomer,
} from '../harness/fixtures';
import { registerTestSuite } from '../runner';

registerTestSuite({
  name: 'Tier 2 Boundaries: Authentication & Shopping Cart',
  tier: 2,
  description:
    'Boundary and corner case test suite verifying duplicate email/phone registration, invalid Indian phone formats, invalid login credentials, unauthenticated/tampered JWT cookie access, zero/negative cart quantities, MOQ violations, and stock limit exceedance.',
  tests: [
    {
      name: 'Registration with already registered email returns 409 CONFLICT or 400',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customerA = generateCustomer();
        // 1. First registration succeeds
        const firstRes = await ctx.client.post('/auth/register', {
          name: customerA.name,
          email: customerA.email,
          phone: customerA.phone,
          password: customerA.password,
        });
        assertStatus(firstRes, [200, 201], 'First registration must succeed');

        // 2. Second registration with the same email but different phone
        const customerB = generateCustomer({ email: customerA.email });
        const duplicateRes = await ctx.client.post('/auth/register', {
          name: customerB.name,
          email: customerB.email,
          phone: customerB.phone,
          password: customerB.password,
        });

        assertStatus(
          duplicateRes,
          [400, 409],
          'Registration with already registered email must return 409 CONFLICT or 400'
        );
        if (duplicateRes.data && typeof duplicateRes.data === 'object') {
          assert(
            duplicateRes.data.code === 'CONFLICT' ||
              duplicateRes.data.code === 'VALIDATION_ERROR' ||
              typeof duplicateRes.data.message === 'string',
            'Duplicate email response must indicate conflict or error'
          );
        }
      },
    },
    {
      name: 'Registration with already registered phone returns 409 CONFLICT or 400',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customerA = generateCustomer();
        // 1. First registration succeeds
        const firstRes = await ctx.client.post('/auth/register', {
          name: customerA.name,
          email: customerA.email,
          phone: customerA.phone,
          password: customerA.password,
        });
        assertStatus(firstRes, [200, 201], 'First registration must succeed');

        // 2. Second registration with the same phone but different email
        const customerC = generateCustomer({ phone: customerA.phone });
        const duplicateRes = await ctx.client.post('/auth/register', {
          name: customerC.name,
          email: customerC.email,
          phone: customerC.phone,
          password: customerC.password,
        });

        assertStatus(
          duplicateRes,
          [400, 409],
          'Registration with already registered phone must return 409 CONFLICT or 400'
        );
      },
    },
    {
      name: 'Registration with invalid Indian phone format returns 400 VALIDATION_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const invalidPhones = [
          '1234567890', // Starts with 1 (must start with 6-9)
          '5899999999', // Starts with 5 (must start with 6-9)
          '98250',      // 5 digits (too short)
          '98250123456789', // 14 digits (too long)
          '98250ABCD0', // Contains letters
          '+919825012345', // Contains symbols/country code without stripping
        ];

        for (const phone of invalidPhones) {
          const customer = generateCustomer({ phone });
          const res = await ctx.client.post('/auth/register', {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            password: customer.password,
          });

          assertStatus(
            res,
            400,
            `Registration with invalid phone format [${phone}] must return 400 VALIDATION_ERROR`
          );
        }
      },
    },
    {
      name: 'Login with wrong password returns 401 INVALID_CREDENTIALS',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        const regRes = await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });
        assertStatus(regRes, [200, 201], 'Customer registration must succeed');

        // Attempt login with incorrect password
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: customer.email,
          password: 'CompletelyWrongPassword@999',
        });

        assertStatus(loginRes, 401, 'Login with wrong password must return 401 INVALID_CREDENTIALS');
        if (loginRes.data && typeof loginRes.data === 'object') {
          assert(
            loginRes.data.code === 'INVALID_CREDENTIALS' ||
              loginRes.data.code === 'UNAUTHORIZED' ||
              typeof loginRes.data.message === 'string',
            'Error response must indicate invalid credentials'
          );
        }
      },
    },
    {
      name: 'Protected endpoint /me accessed without auth_token cookie returns 401 UNAUTHORIZED',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Clear all cookies
        ctx.client.clearCookies();

        const res = await ctx.client.get('/me');
        assertStatus(res, 401, 'Accessing /me without authentication token must return 401 UNAUTHORIZED');
      },
    },
    {
      name: 'Tampered / expired JWT token in cookie returns 401 UNAUTHORIZED',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Inject forged/tampered JWT string
        ctx.client.clearCookies();
        const forgedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiJ9.tampered_invalid_signature_XYZ12345';
        ctx.client.setAuthToken(forgedToken);

        const res = await ctx.client.get('/me');
        assertStatus(res, 401, 'Accessing /me with tampered JWT must return 401 UNAUTHORIZED');
      },
    },
    {
      name: 'Add to cart with zero quantity (qty: 0) returns 400 VALIDATION_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const res = await ctx.client.post('/cart/items', {
          variantId: 1,
          qty: 0,
        });

        assertStatus(res, 400, 'Adding item to cart with qty=0 must return 400 VALIDATION_ERROR');
      },
    },
    {
      name: 'Add to cart with negative quantity (qty: -1) returns 400 VALIDATION_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const res = await ctx.client.post('/cart/items', {
          variantId: 1,
          qty: -1,
        });

        assertStatus(res, 400, 'Adding item to cart with negative quantity must return 400 VALIDATION_ERROR');
      },
    },
    {
      name: 'Add to cart with quantity below MOQ (qty < moq) returns 400 MOQ_NOT_MET',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        // Find a variant that has MOQ > 1 (e.g. handles sold in sets or sheets with MOQ >= 2)
        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        let testVariant: any = null;

        if (Array.isArray(products)) {
          for (const p of products) {
            const match = p.variants?.find((v: any) => v.moq && v.moq > 1);
            if (match) {
              testVariant = match;
              break;
            }
          }
        }

        if (testVariant) {
          // Attempt to add qty < moq
          const res = await ctx.client.post('/cart/items', {
            variantId: testVariant.id,
            qty: testVariant.moq - 1,
          });
          assertStatus(
            res,
            400,
            `Adding item with qty below variant MOQ (${testVariant.moq}) must return 400 MOQ_NOT_MET`
          );
        } else {
          // Fallback: Test adding with explicit MOQ violation check
          const res = await ctx.client.post('/cart/items', {
            variantId: 1,
            qty: 0, // 0 is always below any positive MOQ
          });
          assertStatus(res, 400, 'Cart item addition below minimum quantity must return 400');
        }
      },
    },
    {
      name: 'Add to cart with quantity exceeding stock (qty > stock) returns 400 OUT_OF_STOCK',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        // Attempt to add an absurdly large quantity that exceeds inventory stock
        const res = await ctx.client.post('/cart/items', {
          variantId: 1,
          qty: 99999999,
        });

        assertStatus(
          res,
          400,
          'Adding quantity exceeding available warehouse stock must return 400 OUT_OF_STOCK or VALIDATION_ERROR'
        );
      },
    },
  ],
});

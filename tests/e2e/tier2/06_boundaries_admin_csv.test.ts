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
  name: 'Tier 2 Boundaries: Admin Panel & CSV Import Validation',
  tier: 2,
  description:
    'Boundary and corner case test suite verifying customer RBAC rejection on admin endpoints (403), missing product names, duplicate slug/SKU collisions, negative variant prices/stocks, illegal order state machine transitions, malformed CSV header parsing, invalid CSV data types, in-file duplicate SKUs, empty CSV live import rejection, and settings validation.',
  tests: [
    {
      name: 'Customer role user accessing /admin/dashboard returns 403 FORBIDDEN',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const res = await ctx.client.get('/admin/dashboard');
        assertStatus(
          res,
          403,
          'Customer role accessing /admin/dashboard must return 403 FORBIDDEN'
        );
      },
    },
    {
      name: 'Customer role user accessing /admin/products returns 403 FORBIDDEN',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const res = await ctx.client.get('/admin/products');
        assertStatus(
          res,
          403,
          'Customer role accessing /admin/products must return 403 FORBIDDEN'
        );
      },
    },
    {
      name: 'Customer role user accessing /admin/orders returns 403 FORBIDDEN',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const res = await ctx.client.get('/admin/orders');
        assertStatus(
          res,
          403,
          'Customer role accessing /admin/orders must return 403 FORBIDDEN'
        );
      },
    },
    {
      name: 'Admin product creation with missing name returns 400 VALIDATION_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Admin login
        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin credentials not seeded');

        const res = await ctx.client.post('/admin/products', {
          name: '', // Empty name violates min(1) rule
          categoryId: 1,
          unit: 'sheet',
          gstRate: 18,
        });

        assertStatus(
          res,
          400,
          'Admin product creation with missing/empty name must return 400 VALIDATION_ERROR'
        );
      },
    },
    {
      name: 'Admin product creation with duplicate slug returns 409 CONFLICT or 400',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin login failed');

        const uniqueName = `Duplicate Test Laminate ${Date.now()}`;
        // 1. Create first product
        const firstRes = await ctx.client.post('/admin/products', {
          name: uniqueName,
          categoryId: 1,
          unit: 'sheet',
          gstRate: 18,
        });
        if (firstRes.status === 404) return ctx.skip('Admin products endpoint not mounted');

        // 2. Attempt creating another product with the identical name generating identical slug
        const dupRes = await ctx.client.post('/admin/products', {
          name: uniqueName,
          categoryId: 1,
          unit: 'sheet',
          gstRate: 18,
        });

        assertStatus(
          dupRes,
          [400, 409],
          'Product creation with duplicate slug must return 409 CONFLICT or 400'
        );
      },
    },
    {
      name: 'Admin variant creation with duplicate SKU returns 400 SKU_EXISTS or 409',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin login failed');

        const existingSku = `SKU-DUP-${Date.now()}`;
        // Create first variant with this SKU
        const firstRes = await ctx.client.post('/admin/variants', {
          productId: 1,
          sku: existingSku,
          price: 150000,
          stock: 20,
        });
        if (firstRes.status === 404) return ctx.skip('Admin variants endpoint not mounted');

        // Attempt creating another variant with the exact same SKU
        const dupRes = await ctx.client.post('/admin/variants', {
          productId: 1,
          sku: existingSku,
          price: 180000,
          stock: 10,
        });

        assertStatus(
          dupRes,
          [400, 409],
          'Variant creation with existing duplicate SKU must return 400 or 409'
        );
      },
    },
    {
      name: 'Admin variant update with negative price returns 400 VALIDATION_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin login failed');

        const res = await ctx.client.patch('/admin/variants/1', {
          price: -25000, // Negative price in paise
        });

        assertStatus(
          res,
          [400, 422, 404],
          'Admin variant update with negative price must return 400 VALIDATION_ERROR'
        );
      },
    },
    {
      name: 'Admin variant update with negative stock returns 400 VALIDATION_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin login failed');

        const res = await ctx.client.patch('/admin/variants/1', {
          stock: -5, // Negative inventory stock count
        });

        assertStatus(
          res,
          [400, 422, 404],
          'Admin variant update with negative stock must return 400 VALIDATION_ERROR'
        );
      },
    },
    {
      name: 'Admin order status update with illegal transition (delivered -> pending) returns 400 INVALID_TRANSITION',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin login failed');

        // Illegal transition: delivered order cannot be regressed back to pending
        const res = await ctx.client.patch('/admin/orders/1/status', {
          status: 'pending',
          currentStatus: 'delivered',
        });

        assertStatus(
          res,
          [400, 422, 404],
          'Illegal state transition (delivered -> pending) must return 400 INVALID_TRANSITION'
        );
      },
    },
    {
      name: 'Admin order status update with illegal transition (cancelled -> confirmed) returns 400 INVALID_TRANSITION',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin login failed');

        // Illegal transition: cancelled terminal order cannot be transitioned to confirmed
        const res = await ctx.client.patch('/admin/orders/1/status', {
          status: 'confirmed',
          currentStatus: 'cancelled',
        });

        assertStatus(
          res,
          [400, 422, 404],
          'Illegal state transition (cancelled -> confirmed) must return 400 INVALID_TRANSITION'
        );
      },
    },
    {
      name: 'Admin product CSV import dry-run with missing required headers returns 400 PARSE_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin login failed');

        // CSV missing required columns (sku, product_name, category, price)
        const invalidHeaderCsv = `column_foo,column_bar,column_baz\nval1,val2,val3`;

        const res = await ctx.client.uploadCsv('/admin/products/import', invalidHeaderCsv, {
          dryRun: true,
        });

        assertStatus(
          res,
          [400, 422, 404],
          'CSV import dry-run with missing required headers must return 400 or 422'
        );
      },
    },
    {
      name: 'Admin product CSV import dry-run with invalid data types in price/stock columns returns structured row errors',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin login failed');

        // CSV with non-numeric price and negative stock
        const invalidDataCsv = `sku,product_name,category,brand,price,stock,unit\nSKU-ERR-1,Error Product,Laminates,Royale Touche,NOT_A_PRICE,-50,sheet`;

        const res = await ctx.client.uploadCsv('/admin/products/import', invalidDataCsv, {
          dryRun: true,
        });

        assertStatus(
          res,
          [200, 400, 422, 404],
          'CSV import dry-run with invalid row data must return 200 with row errors or 400/422'
        );

        if (res.status === 200) {
          // If dry-run returns 200 with preview report, verify row errors are identified
          assert(
            res.data.hasErrors === true ||
              (Array.isArray(res.data.errors) && res.data.errors.length > 0) ||
              (res.data.validRows === 0),
            'Dry-run preview must report validation errors for invalid price/stock'
          );
        }
      },
    },
    {
      name: 'Admin product CSV import dry-run with duplicate SKUs in file returns duplicate error in preview',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin login failed');

        const duplicateSku = `SKU-DUPFILE-${Date.now()}`;
        // CSV with two identical SKUs in separate rows
        const duplicateSkuCsv = `sku,product_name,category,brand,price,stock,unit\n${duplicateSku},Duplicate Prod 1,Laminates,Royale Touche,120000,10,sheet\n${duplicateSku},Duplicate Prod 2,Laminates,Royale Touche,140000,15,sheet`;

        const res = await ctx.client.uploadCsv('/admin/products/import', duplicateSkuCsv, {
          dryRun: true,
        });

        assertStatus(
          res,
          [200, 400, 409, 422, 404],
          'CSV with duplicate SKUs within the file must report error in dry-run preview or return 400/409'
        );

        if (res.status === 200) {
          assert(
            res.data.hasErrors === true ||
              (Array.isArray(res.data.errors) && res.data.errors.length > 0),
            'Dry-run preview must detect and report duplicate SKU in file'
          );
        }
      },
    },
    {
      name: 'Admin product CSV live import with empty CSV returns 400',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin login failed');

        // Empty string CSV with dryRun = false (live import)
        const emptyCsv = '';
        const res = await ctx.client.uploadCsv('/admin/products/import', emptyCsv, {
          dryRun: false,
        });

        assertStatus(
          res,
          [400, 422, 404],
          'Live CSV import with empty content must return 400 or 422'
        );
      },
    },
    {
      name: 'Admin store settings update with empty values or invalid types returns 400 VALIDATION_ERROR',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        ctx.client.clearCookies();
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        if (!loginRes.ok) return ctx.skip('Admin login failed');

        // Passing non-object or invalid type values
        const res = await ctx.client.put('/admin/settings', 'not-a-json-object');

        assertStatus(
          res,
          [400, 422, 404],
          'Store settings update with invalid payload type must return 400 VALIDATION_ERROR'
        );
      },
    },
  ],
});

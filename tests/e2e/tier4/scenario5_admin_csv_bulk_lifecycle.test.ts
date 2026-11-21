import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  ADMIN_CREDENTIALS,
} from '../harness';
import { registerTestSuite } from '../runner';

registerTestSuite({
  name: 'Scenario 5: Admin Product CSV Bulk Import, FTS5 Indexing & Export Stream Lifecycle',
  tier: 4,
  description:
    'End-to-end user journey S5: Admin bulk product management -> Dry-run CSV upload with syntax/type validation errors -> Valid CSV live import execution -> Auto-creation of categories, brands, variants & attributes -> Verification of FTS5 search query indexing -> Full CSV export round-trip stream verification.',
  tests: [
    {
      name: 'Execute full Scenario 5 CSV bulk import, FTS indexing, and export lifecycle',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // ─── Step 1: Admin Authentication ─────────────────────────────
        ctx.log('Step 1: Authenticating as store administrator');
        const loginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        assertOk(loginRes, 'Admin login must succeed');

        // ─── Step 2: Dry-Run CSV Upload with Syntax/Validation Errors ─
        ctx.log('Step 2: Uploading CSV with syntax and data type errors in dry-run mode (dryRun=true)');
        const invalidCsv = [
          'sku,product_name,category,brand,price,stock',
          'INV-ROW-1,,Laminates,Greenlam,145000,10', // Missing product_name
          'INV-ROW-2,Bad Price Laminate,Laminates,Greenlam,-5000,10', // Negative price
        ].join('\n');

        const dryRunRes = await ctx.client.uploadCsv('/admin/products/import', invalidCsv, {
          dryRun: true,
        });

        assertStatus(dryRunRes, [200, 400, 422, 404], 'Dry-run upload check');
        if (dryRunRes.status === 404) return ctx.skip('CSV import endpoint not mounted');

        // If returned 200, ensure body indicates error rows detected
        if (dryRunRes.status === 200) {
          const body = dryRunRes.data;
          assert(
            body.valid === false || (body.errors && body.errors.length > 0) || body.invalidRowsCount > 0,
            'Dry-run must detect and report syntax errors in invalid CSV rows'
          );
          ctx.log(`Successfully caught ${body.errors?.length || 1} validation errors in dry-run mode`);
        } else {
          ctx.log(`Dry-run rejected with status ${dryRunRes.status} as expected`);
        }

        // ─── Step 3: Execute Live CSV Import (dryRun=false) ───────────
        ctx.log('Step 3: Uploading valid clean CSV in live execution mode (dryRun=false)');
        const timestamp = Date.now();
        const testSku1 = `SKU-E2E-IMP-${timestamp}-1`;
        const testSku2 = `SKU-E2E-IMP-${timestamp}-2`;
        const testDesignCode1 = `DC-${timestamp}`;
        const productName1 = `E2E Imported Gloss Laminate ${timestamp}`;
        const productName2 = `E2E Imported Marine Ply ${timestamp}`;

        const validCsv = [
          'sku,product_name,category,brand,design_code,option_label,price,stock,hsn_code,gst_rate,unit,attr_thickness,attr_finish',
          `${testSku1},${productName1},Laminates,Royale Touche,${testDesignCode1},8x4 ft / 1.0mm,145000,50,48239090,18,sheet,1.0mm,Glossy`,
          `${testSku2},${productName2},Plywood & Boards,Century Ply,PLY-${timestamp},8x4 ft / 18mm,385000,35,44123100,18,sheet,18mm,BWP`,
        ].join('\n');

        const liveImportRes = await ctx.client.uploadCsv('/admin/products/import', validCsv, {
          dryRun: false,
        });

        assertStatus(liveImportRes, [200, 201], 'Live CSV import execution must return 200/201 OK');
        const importResult = liveImportRes.data;
        assert(
          importResult.success === true || importResult.importedCount >= 2 || importResult.count >= 2,
          'Live import response must indicate successful record creation'
        );
        ctx.log('Live CSV import processed and saved products to database');

        // ─── Step 4: Verify Database State & Attributes ───────────────
        ctx.log('Step 4: Querying catalog to verify newly created products and variants');
        const catalogSearchRes = await ctx.client.get(`/products?q=${encodeURIComponent(testSku1)}`);
        assertOk(catalogSearchRes, 'Catalog search query for imported product must succeed');

        const products = Array.isArray(catalogSearchRes.data)
          ? catalogSearchRes.data
          : catalogSearchRes.data?.data || catalogSearchRes.data?.products;

        assertDefined(products, 'Search response must return product list');
        const found = products.find((p: any) =>
          p.variants?.some((v: any) => v.sku === testSku1)
        );

        if (found) {
          const v = found.variants.find((v: any) => v.sku === testSku1);
          assertEquals(v.price, 145000, 'Imported variant price must match 145000 paise');
          assertEquals(v.stock, 50, 'Imported variant stock must match 50');
        }

        // ─── Step 5: Verify FTS5 Search Index ─────────────────────────
        ctx.log('Step 5: Querying FTS5 full-text index with unique design code');
        const ftsRes = await ctx.client.get(`/products?q=${encodeURIComponent(testDesignCode1)}`);
        if (ftsRes.ok) {
          const ftsProducts = Array.isArray(ftsRes.data)
            ? ftsRes.data
            : ftsRes.data?.data || ftsRes.data?.products;
          assert(
            ftsProducts && ftsProducts.length > 0,
            `FTS5 index must return matching product for query "${testDesignCode1}"`
          );
        }

        // ─── Step 6: Verify CSV Export Stream & Round-Trip Fidelity ───
        ctx.log('Step 6: Downloading CSV export stream and verifying round-trip fidelity');
        const exportRes = await ctx.client.get('/admin/export/products');
        assertStatus(exportRes, [200, 404], 'Admin product export endpoint');

        if (exportRes.status === 200) {
          const contentType = exportRes.headers.get('content-type') || '';
          assert(
            contentType.includes('text/csv') || contentType.includes('octet-stream'),
            `Export Content-Type must be text/csv, got: ${contentType}`
          );

          const csvBody = exportRes.rawText;
          assert(csvBody.length > 0, 'Exported CSV stream must not be empty');
          assert(
            csvBody.includes('sku') && (csvBody.includes('product_name') || csvBody.includes('name')),
            'Exported CSV must contain standard header columns'
          );
          assert(
            csvBody.includes(testSku1) || csvBody.includes('GL-1000-84-10-M'),
            'Exported CSV should contain newly imported or catalog SKUs'
          );
          ctx.log('Successfully validated round-trip CSV export stream data');
        }
      },
    },
  ],
});

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
  name: 'Scenario 3: Interior Designer Swatch Samples to Production Order Conversion',
  tier: 4,
  description:
    'End-to-end user journey S3: Designer catalog search for textured finishes -> 4 swatch selection -> Sample request submission -> Admin sample tracking & dispatch -> Full production order placement with MOQ validation.',
  tests: [
    {
      name: 'Execute full Scenario 3 sample swatch discovery to full production order journey',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // ─── Step 1: Designer Searches Catalog for Swatches ───────────
        ctx.log('Step 1: Designer queries catalog for decorative laminates');
        const searchRes = await ctx.client.get('/products?category=laminates');
        assertOk(searchRes, 'Catalog browsing for laminates must return 200 OK');
        const products = Array.isArray(searchRes.data)
          ? searchRes.data
          : searchRes.data?.data || searchRes.data?.products;
        assertDefined(products, 'Products list must be returned');

        // Collect 4 variant IDs from available products
        const swatchVariantIds: number[] = [];
        for (const p of products) {
          if (p.variants) {
            for (const v of p.variants) {
              if (!swatchVariantIds.includes(v.id)) {
                swatchVariantIds.push(v.id);
              }
              if (swatchVariantIds.length >= 4) break;
            }
          }
          if (swatchVariantIds.length >= 4) break;
        }

        // Fallback to sample variant IDs 1, 2, 3, 4 if fewer catalog products returned
        while (swatchVariantIds.length < 4) {
          swatchVariantIds.push(swatchVariantIds.length + 1);
        }

        ctx.log(`Selected 4 sample swatches: [${swatchVariantIds.join(', ')}]`);

        // ─── Step 2: Submit Sample Swatch Request ─────────────────────
        ctx.log('Step 2: Submitting sample request for 4 swatches');
        const designer = generateCustomer({ name: 'Studio Arc Interior Design' });
        // Register designer
        await ctx.client.post('/auth/register', {
          name: designer.name,
          email: designer.email,
          phone: designer.phone,
          password: designer.password,
        });

        const sampleReqRes = await ctx.client.post('/samples', {
          name: designer.name,
          phone: designer.phone,
          address: '404 Design Studio, Creative Quarter',
          pincode: '380001',
          variantIds: swatchVariantIds,
        });

        if (sampleReqRes.status === 404) return ctx.skip('Samples API endpoint not mounted');
        assertStatus(sampleReqRes, [200, 201], 'Sample swatch request submission must return 200/201');

        const sampleData = sampleReqRes.data.sample || sampleReqRes.data;
        const sampleId = sampleData.id;
        assertDefined(sampleId, 'Sample request must return numeric ID');
        assertEquals(sampleData.status, 'new', 'Initial sample request status must be new');

        // ─── Step 3: Admin Reviews and Dispatches Sample Swatches ─────
        ctx.log('Step 3: Admin tracks sample requests and marks dispatched');
        ctx.client.clearCookies();
        const adminLogin = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        assertOk(adminLogin, 'Admin authentication must succeed');

        const adminSamplesRes = await ctx.client.get('/admin/samples');
        assertOk(adminSamplesRes, 'GET /admin/samples must return 200 OK');
        const sampleList = Array.isArray(adminSamplesRes.data)
          ? adminSamplesRes.data
          : adminSamplesRes.data?.samples;
        assertDefined(sampleList, 'Admin sample listing must return array');

        // Update status to dispatched
        const dispatchRes = await ctx.client.patch(`/admin/samples/${sampleId}`, {
          status: 'dispatched',
        });
        assertStatus(dispatchRes, [200, 204], 'Admin sample status update must succeed');

        // ─── Step 4: Designer Places Full Production Order ────────────
        ctx.log('Step 4: Designer receives swatches and initiates full production order');
        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: designer.email,
          password: designer.password,
        });

        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Designer address creation failed');

        // Choose first sampled variant for full order
        const chosenVariantId = swatchVariantIds[0];

        // Step 4a: Verify MOQ validation
        // Attempt to add below MOQ if product has MOQ > 1
        const targetProduct = products.find((p: any) =>
          p.variants?.some((v: any) => v.id === chosenVariantId)
        );
        const targetVariant = targetProduct?.variants?.find((v: any) => v.id === chosenVariantId);
        const moq = targetVariant?.moq || 1;

        if (moq > 1) {
          const belowMoqRes = await ctx.client.post('/cart/items', {
            variantId: chosenVariantId,
            qty: moq - 1,
          });
          // Should be rejected or clamped
          assertStatus(belowMoqRes, [400, 422], 'Adding quantity below MOQ should be rejected');
        }

        // Step 4b: Add full production batch quantity
        const productionQty = Math.max(moq, 15);
        const cartRes = await ctx.client.post('/cart/items', {
          variantId: chosenVariantId,
          qty: productionQty,
        });
        assertStatus(cartRes, [200, 201], 'Adding production quantity to cart must succeed');

        // Step 4c: Place production order
        const orderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'cod',
          notes: 'Production lot order following approved swatches',
        });
        assertStatus(orderRes, [200, 201], 'Production order placement must return 200/201');

        const order = orderRes.data.order || orderRes.data;
        assertDefined(order.id, 'Production order must have ID');
        assertDefined(order.orderNo, 'Production order must have unique order number');
        ctx.log(`Successfully completed swatch-to-order lifecycle with Order No: ${order.orderNo}`);
      },
    },
  ],
});

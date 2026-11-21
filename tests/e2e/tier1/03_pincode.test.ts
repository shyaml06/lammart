import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  SAMPLE_ADDRESSES,
} from '../harness';
import { registerSuite } from '../runner';

registerSuite({
  name: 'Pincode Lookup & Logistics Verification',
  tier: 1,
  description: 'Verifies serviceable intra/inter-state pincodes, delivery estimates, charges, and unserviceable responses.',
  tests: [
    {
      name: 'Serviceable intra-state pincode verification returns serviceability and Gujarat state (GET /pincode/380001)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const pincode = SAMPLE_ADDRESSES.ahmedabadIntraState.pincode;
        const res = await ctx.client.get(`/pincode/${pincode}`);
        assertOk(res, `GET /pincode/${pincode} must succeed`);
        assertDefined(res.data, 'Response must have data');
        assertEquals(res.data.isServiceable, true, 'Ahmedabad pincode 380001 must be serviceable');
        if (res.data.state) {
          assert(
            res.data.state.toLowerCase() === 'gujarat',
            `Pincode 380001 state should be Gujarat, got ${res.data.state}`
          );
        }
      },
    },
    {
      name: 'Serviceable inter-state pincode verification returns Maharashtra state (GET /pincode/400001)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const pincode = SAMPLE_ADDRESSES.mumbaiInterState.pincode;
        const res = await ctx.client.get(`/pincode/${pincode}`);
        assertOk(res, `GET /pincode/${pincode} must succeed`);
        assertDefined(res.data, 'Response must have data');
        assertEquals(res.data.isServiceable, true, 'Mumbai pincode 400001 must be serviceable');
        if (res.data.state) {
          assert(
            res.data.state.toLowerCase() === 'maharashtra',
            `Pincode 400001 state should be Maharashtra, got ${res.data.state}`
          );
        }
      },
    },
    {
      name: 'Delivery days estimation is a valid positive integer',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.get('/pincode/380001');
        assertOk(res, 'Pincode check must succeed');
        assertDefined(res.data.deliveryDays, 'Pincode info must include deliveryDays');
        assert(
          typeof res.data.deliveryDays === 'number' && res.data.deliveryDays > 0,
          `deliveryDays must be a positive integer, got ${res.data.deliveryDays}`
        );
      },
    },
    {
      name: 'Base and heavy shipping charges retrieval returns numeric amounts in paise',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const res = await ctx.client.get('/pincode/380001');
        assertOk(res, 'Pincode lookup must succeed');
        assertDefined(res.data.baseCharge, 'Pincode info must include baseCharge');
        assert(typeof res.data.baseCharge === 'number', 'baseCharge must be numeric in paise');
        assert(res.data.baseCharge >= 0, 'baseCharge must be non-negative');

        if (res.data.heavyChargePerUnit !== undefined) {
          assert(typeof res.data.heavyChargePerUnit === 'number', 'heavyChargePerUnit must be numeric in paise');
          assert(res.data.heavyChargePerUnit >= 0, 'heavyChargePerUnit must be non-negative');
        }
      },
    },
    {
      name: 'Unserviceable pincode response handles unknown codes gracefully (GET /pincode/999999)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const unserviceableCode = SAMPLE_ADDRESSES.unserviceable.pincode;
        const res = await ctx.client.get(`/pincode/${unserviceableCode}`);
        assertStatus(res, [200, 400, 404], 'Unserviceable pincode should return 200 with false or 400/404');

        if (res.status === 200) {
          assertEquals(res.data.isServiceable, false, 'Pincode 999999 must have isServiceable: false');
        } else {
          assert(res.status === 400 || res.status === 404, 'Must return error status for unserviceable code');
        }
      },
    },
  ],
});

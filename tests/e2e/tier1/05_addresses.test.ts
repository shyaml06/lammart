import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  generateCustomer,
  SAMPLE_ADDRESSES,
} from '../harness';
import { registerSuite } from '../runner';

registerSuite({
  name: 'Saved Addresses Management',
  tier: 1,
  description: 'Verifies customer address book CRUD operations and default address flag management.',
  tests: [
    {
      name: 'Add new delivery address successfully stores address (POST /me/addresses)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const addressData = SAMPLE_ADDRESSES.ahmedabadIntraState;
        const res = await ctx.client.post('/me/addresses', addressData);
        assertStatus(res, [200, 201], 'POST /me/addresses should return 200 or 201');
        assertDefined(res.data, 'Address creation must return data');
        assertDefined(res.data.id, 'Created address must have an id');
        assertEquals(res.data.pincode, addressData.pincode, 'Created address pincode must match');
      },
    },
    {
      name: 'List customer addresses returns all saved addresses for user (GET /me/addresses)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);

        const res = await ctx.client.get('/me/addresses');
        assertOk(res, 'GET /me/addresses must return 200 OK');
        assert(Array.isArray(res.data), 'Addresses must be returned as an array');
        assert(res.data.length >= 1, 'Must contain at least the created address');
      },
    },
    {
      name: 'Update address details modifies address fields (PUT /me/addresses/:id)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const createRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        const addressId = createRes.data?.id;
        if (!addressId) return ctx.skip('Address ID unavailable from creation');

        const updatedLine1 = 'Updated 999 SG Highway Corporate Park';
        const updateRes = await ctx.client.put(`/me/addresses/${addressId}`, {
          ...SAMPLE_ADDRESSES.ahmedabadIntraState,
          line1: updatedLine1,
        });

        assertOk(updateRes, 'PUT /me/addresses/:id must return 200 OK');
        assertEquals(updateRes.data.line1, updatedLine1, 'Address line1 must be updated');
      },
    },
    {
      name: 'Delete address removes address from customer book (DELETE /me/addresses/:id)',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const createRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.mumbaiInterState);
        const addressId = createRes.data?.id;
        if (!addressId) return ctx.skip('Address ID unavailable');

        const deleteRes = await ctx.client.delete(`/me/addresses/${addressId}`);
        assertStatus(deleteRes, [200, 204], 'DELETE /me/addresses/:id must succeed');

        const listRes = await ctx.client.get('/me/addresses');
        const exists = listRes.data.some((a: any) => a.id === addressId);
        assert(!exists, 'Deleted address must not exist in list');
      },
    },
    {
      name: 'Default address flag management ensures only one active default address',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        // Add first address as default
        const first = await ctx.client.post('/me/addresses', {
          ...SAMPLE_ADDRESSES.ahmedabadIntraState,
          isDefault: true,
        });

        // Add second address also marked as default
        const second = await ctx.client.post('/me/addresses', {
          ...SAMPLE_ADDRESSES.mumbaiInterState,
          isDefault: true,
        });

        const listRes = await ctx.client.get('/me/addresses');
        assertOk(listRes, 'GET /me/addresses must succeed');

        const addresses = listRes.data;
        const defaultAddresses = addresses.filter((a: any) => a.isDefault);
        assertEquals(
          defaultAddresses.length,
          1,
          'Exactly one address must have isDefault = true'
        );
        assertEquals(
          defaultAddresses[0].id,
          second.data.id,
          'The most recently set default address must be the default'
        );
      },
    },
  ],
});

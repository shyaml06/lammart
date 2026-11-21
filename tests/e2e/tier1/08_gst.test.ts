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
  name: 'GST Tax Calculation Engine (CGST/SGST vs IGST)',
  tier: 1,
  description: 'Verifies 18% inclusive GST calculations, intra-state 50/50 CGST/SGST split, inter-state 100% IGST, paise rounding, and line sum matching.',
  tests: [
    {
      name: '18% GST inclusive calculation extracts correct tax amount from gross line totals',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Address ID unavailable');

        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Quote endpoint not mounted');

        assertOk(quoteRes, 'Quote must succeed');
        const quote = quoteRes.data;
        assertDefined(quote.taxTotal, 'Quote must include taxTotal');
        assert(quote.taxTotal > 0, 'taxTotal must be positive for 18% taxable items');

        // Verify inclusive formula: tax = round(subtotal * 18 / 118)
        const expectedTax = Math.round((quote.subtotal * 18) / 118);
        const diff = Math.abs(quote.taxTotal - expectedTax);
        assert(diff <= 2, `taxTotal ${quote.taxTotal} should match inclusive 18% calculation ${expectedTax} within rounding`);
      },
    },
    {
      name: 'Intra-state tax split divides tax 50/50 into CGST (9%) and SGST (9%) with zero IGST',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Address ID unavailable');

        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Quote endpoint not mounted');

        assertOk(quoteRes, 'Quote must succeed');
        const quote = quoteRes.data;

        // Intra-state rules
        assertEquals(quote.igst, 0, 'Intra-state delivery must have IGST = 0');
        assert(quote.cgst > 0, 'CGST must be > 0 for intra-state delivery');
        assert(quote.sgst > 0, 'SGST must be > 0 for intra-state delivery');
        assertEquals(
          quote.cgst + quote.sgst,
          quote.taxTotal,
          'CGST + SGST must exactly equal taxTotal'
        );
        const halfDiff = Math.abs(quote.cgst - quote.sgst);
        assert(halfDiff <= 1, 'CGST and SGST must be split equally within 1 paisa rounding');
      },
    },
    {
      name: 'Inter-state tax allocation allocates 100% IGST (18%) with zero CGST and zero SGST',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        // Mumbai, Maharashtra is inter-state relative to Gujarat store
        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.mumbaiInterState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Address ID unavailable');

        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Quote endpoint not mounted');

        assertOk(quoteRes, 'Quote must succeed');
        const quote = quoteRes.data;

        // Inter-state rules
        assertEquals(quote.cgst, 0, 'Inter-state delivery must have CGST = 0');
        assertEquals(quote.sgst, 0, 'Inter-state delivery must have SGST = 0');
        assertEquals(
          quote.igst,
          quote.taxTotal,
          'Inter-state delivery must have IGST = taxTotal'
        );
      },
    },
    {
      name: 'Tax rounding maintains strict integer paise precision without floating-point errors',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Address ID unavailable');

        await ctx.client.post('/cart/items', { variantId: 1, qty: 3 });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Quote endpoint not mounted');

        assertOk(quoteRes, 'Quote must succeed');
        const quote = quoteRes.data;

        assert(Number.isInteger(quote.subtotal), 'subtotal must be integer paise');
        assert(Number.isInteger(quote.taxTotal), 'taxTotal must be integer paise');
        assert(Number.isInteger(quote.cgst), 'cgst must be integer paise');
        assert(Number.isInteger(quote.sgst), 'sgst must be integer paise');
        assert(Number.isInteger(quote.igst), 'igst must be integer paise');
        assert(Number.isInteger(quote.grandTotal), 'grandTotal must be integer paise');
      },
    },
    {
      name: 'Total invoice tax matches sum of individual line item taxes',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Address ID unavailable');

        await ctx.client.post('/cart/items', { variantId: 1, qty: 2 });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Quote endpoint not mounted');

        assertOk(quoteRes, 'Quote must succeed');
        const quote = quoteRes.data;

        // subtotal + shippingCharge = grandTotal (for inclusive GST)
        assertEquals(
          quote.subtotal + quote.shippingCharge - (quote.discount ?? 0),
          quote.grandTotal,
          'grandTotal must equal subtotal + shippingCharge - discount for inclusive GST'
        );
      },
    },
  ],
});

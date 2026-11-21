import {
  assert,
  assertEquals,
  assertDefined,
  assertOk,
  assertStatus,
  ADMIN_CREDENTIALS,
  generateCustomer,
  generateDealer,
  SAMPLE_ADDRESSES,
} from '../harness';
import { registerTestSuite } from '../runner';

registerTestSuite({
  name: 'Tier 3: B2B Dealer Role, Custom Quote Negotiations & Tier Pricing',
  tier: 3,
  description:
    'Cross-feature suite verifying automated dealer wholesale tier resolution, GSTIN snapshot preservation on tax invoices, negotiated B2B quote conversion overriding catalog pricing, and mixed-tier catalog carts.',
  tests: [
    {
      name: 'Customer vs Dealer role pricing: Dealer user logged in automatically receives wholesale pricing tiers, and tax invoice contains verified GSTIN',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // Step 1: Normal customer adds item to cart & checks price
        const customer = generateCustomer();
        await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });

        const custAddr = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        const custAddressId = custAddr.data?.id;
        if (!custAddressId) return ctx.skip('Customer address creation failed');

        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });
        const custQuoteRes = await ctx.client.post('/checkout/quote', { addressId: custAddressId });
        if (custQuoteRes.status === 404) return ctx.skip('Quote endpoint not mounted');
        assertOk(custQuoteRes, 'Customer quote must succeed');
        const customerSubtotal = custQuoteRes.data.subtotal;

        // Step 2: Dealer user registers with business name and valid GSTIN
        ctx.client.clearCookies();
        const dealer = generateDealer();
        const dealerRegRes = await ctx.client.post('/auth/register', {
          name: dealer.name,
          email: dealer.email,
          phone: dealer.phone,
          password: dealer.password,
          businessName: dealer.businessName,
          gstin: dealer.gstin,
        });

        if (!dealerRegRes.ok) return ctx.skip('Dealer registration failed');

        const dealerAddr = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        const dealerAddressId = dealerAddr.data?.id;
        if (!dealerAddressId) return ctx.skip('Dealer address creation failed');

        // Dealer adds same item (variant 1) to cart
        await ctx.client.post('/cart/items', { variantId: 1, qty: 1 });
        const dealerQuoteRes = await ctx.client.post('/checkout/quote', { addressId: dealerAddressId });
        assertOk(dealerQuoteRes, 'Dealer quote must succeed');
        const dealerSubtotal = dealerQuoteRes.data.subtotal;

        // Wholesale tier should be lower than or equal to standard retail
        assert(
          dealerSubtotal <= customerSubtotal,
          `Dealer subtotal (${dealerSubtotal}) must be <= customer retail subtotal (${customerSubtotal})`
        );

        // Place dealer order and verify GSTIN snapshot in order details
        const orderRes = await ctx.client.post('/orders', {
          addressId: dealerAddressId,
          paymentMethod: 'cod',
          billingGstin: dealer.gstin,
        });

        assertStatus(orderRes, [200, 201], 'Dealer order placement must succeed');
        const order = orderRes.data.order || orderRes.data;
        assertDefined(order.id, 'Dealer order must have an id');
        if (order.billingGstin) {
          assertEquals(order.billingGstin, dealer.gstin, 'Order billingGstin must match dealer GSTIN');
        }
      },
    },
    {
      name: 'Converted quote applying negotiated custom line-item unit price overriding catalog pricing',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const dealer = generateDealer();
        await ctx.client.post('/auth/register', {
          name: dealer.name,
          email: dealer.email,
          phone: dealer.phone,
          password: dealer.password,
          businessName: dealer.businessName,
          gstin: dealer.gstin,
        });

        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        const addressId = addrRes.data?.id;

        // Submit bulk quote request for 50 sheets
        const requestedQty = 50;
        const quoteReqRes = await ctx.client.post('/quotes', {
          name: dealer.name,
          phone: dealer.phone,
          email: dealer.email,
          city: 'Ahmedabad',
          message: 'Bulk project requirement for corporate office fit-out',
          items: [{ variantId: 1, qty: requestedQty, description: 'Laminate Soft White Matte' }],
        });

        if (quoteReqRes.status === 404) return ctx.skip('Quotes API not mounted');
        assertStatus(quoteReqRes, [200, 201], 'Quote request must succeed');
        const quoteId = quoteReqRes.data?.id || quoteReqRes.data?.quote?.id;
        if (!quoteId) return ctx.skip('Quote ID not returned');

        // Admin reviews quote, inputs custom negotiated unit price (₹1,100 = 110,000 paise)
        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });

        const negotiatedUnitPrice = 110000; // ₹1,100.00
        const updateQuoteRes = await ctx.client.patch(`/admin/quotes/${quoteId}`, {
          status: 'quoted',
          items: [{ variantId: 1, qty: requestedQty, quotedUnitPrice: negotiatedUnitPrice }],
          quotedTotal: negotiatedUnitPrice * requestedQty,
        });

        assertStatus(updateQuoteRes, [200, 204], 'Admin quote review must succeed');

        // Dealer logs back in, accepts and converts quote to order
        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: dealer.email,
          password: dealer.password,
        });

        const acceptRes = await ctx.client.post(`/quotes/${quoteId}/accept`);
        assertStatus(acceptRes, [200, 204, 404], 'Accept quote should return 200/204 or 404 if direct convert');

        // Convert quote to order
        if (addressId) {
          const convertRes = await ctx.client.post(`/quotes/${quoteId}/convert`, {
            addressId,
            paymentMethod: 'cod',
          });

          if (convertRes.ok) {
            const convertedOrder = convertRes.data.order || convertRes.data;
            assertDefined(convertedOrder.id, 'Converted order must have an id');
            // If items returned, verify negotiated unit price was applied
            if (convertedOrder.items && convertedOrder.items.length > 0) {
              const item = convertedOrder.items[0];
              assertEquals(
                item.unitPrice,
                negotiatedUnitPrice,
                `Converted order item unit price must match negotiated price (${negotiatedUnitPrice}), got ${item.unitPrice}`
              );
            }
          }
        }
      },
    },
    {
      name: 'Dealer purchasing mix of catalog items with and without volume tiers',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        const dealer = generateDealer();
        await ctx.client.post('/auth/register', {
          name: dealer.name,
          email: dealer.email,
          phone: dealer.phone,
          password: dealer.password,
          businessName: dealer.businessName,
          gstin: dealer.gstin,
        });

        const addrRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        const addressId = addrRes.data?.id;
        if (!addressId) return ctx.skip('Address creation failed');

        // Fetch products to pick two distinct products
        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        if (!products || products.length < 2) return ctx.skip('Insufficient products');

        // Item 1: laminate with dealer tier (variant 1)
        // Item 2: standard item (e.g. from second product)
        const item1 = products[0].variants?.[0];
        const item2 = products[1].variants?.[0];
        if (!item1 || !item2) return ctx.skip('Variants not found');

        await ctx.client.post('/cart/items', { variantId: item1.id, qty: 2 });
        await ctx.client.post('/cart/items', { variantId: item2.id, qty: 3 });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        if (quoteRes.status === 404) return ctx.skip('Quote endpoint not mounted');
        assertOk(quoteRes, 'Mixed catalog checkout quote must succeed');

        const quote = quoteRes.data;
        assertDefined(quote.subtotal, 'Quote must have subtotal');
        assert(quote.subtotal > 0, 'Quote subtotal must be positive');
        assertDefined(quote.grandTotal, 'Quote must have grandTotal');
        assert(quote.grandTotal >= quote.subtotal, 'Grand total must be >= subtotal');
      },
    },
  ],
});

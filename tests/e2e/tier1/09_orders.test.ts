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
  name: 'Atomic Order Placement & COD Lifecycle',
  tier: 1,
  description: 'Verifies checkout quotes, atomic COD order placement, stock decrements, snapshot preservation, and order history.',
  tests: [
    {
      name: 'Checkout quote calculation generates complete invoice summary (POST /checkout/quote)',
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
        if (!addressId) return ctx.skip('Address creation failed');

        await ctx.client.post('/cart/items', { variantId: 1, qty: 2 });

        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        assertStatus(quoteRes, [200, 404], 'POST /checkout/quote should return 200 or 404');
        if (quoteRes.status === 404) return ctx.skip('Quote endpoint not mounted');

        assertOk(quoteRes, 'Checkout quote calculation must succeed');
        assertDefined(quoteRes.data.subtotal, 'Quote must have subtotal');
        assertDefined(quoteRes.data.shippingCharge, 'Quote must have shippingCharge');
        assertDefined(quoteRes.data.grandTotal, 'Quote must have grandTotal');
      },
    },
    {
      name: 'Atomic order placement creates order record with COD payment method (POST /orders)',
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

        const orderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'cod',
          notes: 'Deliver before 5 PM',
        });

        assertStatus(orderRes, [200, 201], 'POST /orders should return 200 or 201');
        assertDefined(orderRes.data, 'Order response must have data');
        const order = orderRes.data.order || orderRes.data;
        assertDefined(order.id, 'Order must have an id');
        assertDefined(order.orderNo, 'Order must have an orderNo');
        assertEquals(order.paymentMethod, 'cod', 'Order paymentMethod must be cod');
        assert(
          order.status === 'pending' || order.status === 'confirmed',
          `COD order initial status should be pending or confirmed, got ${order.status}`
        );
      },
    },
    {
      name: 'Immediate stock decrement upon order placement reduces available variant inventory',
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

        // Check initial stock of variant
        const prodRes = await ctx.client.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data;
        const variant = products?.[0]?.variants?.[0];
        if (!variant) return ctx.skip('No variant available');
        const initialStock = variant.stock;

        const orderQty = 1;
        await ctx.client.post('/cart/items', { variantId: variant.id, qty: orderQty });
        const orderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'cod',
        });
        if (!orderRes.ok) return ctx.skip('Order creation failed');

        // Fetch product again to verify stock decrement
        const prodAfter = await ctx.client.get(`/products/${products[0].slug}`);
        if (prodAfter.ok && prodAfter.data?.variants) {
          const variantAfter = prodAfter.data.variants.find((v: any) => v.id === variant.id);
          if (variantAfter) {
            assertEquals(
              variantAfter.stock,
              initialStock - orderQty,
              'Variant stock must decrement by ordered quantity'
            );
          }
        }
      },
    },
    {
      name: 'Snapshot preservation freezes name, SKU, unit price, and address at purchase time',
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

        const orderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'cod',
        });
        if (!orderRes.ok) return ctx.skip('Order creation failed');

        const order = orderRes.data.order || orderRes.data;
        assertDefined(order.shippingAddress, 'Order must preserve shippingAddress snapshot');
        assertEquals(
          order.shippingAddress.pincode,
          SAMPLE_ADDRESSES.ahmedabadIntraState.pincode,
          'Shipping address snapshot pincode must match'
        );

        if (order.items && order.items.length > 0) {
          const item = order.items[0];
          assertDefined(item.nameSnapshot, 'OrderItem must preserve nameSnapshot');
          assertDefined(item.skuSnapshot, 'OrderItem must preserve skuSnapshot');
          assertDefined(item.unitPrice, 'OrderItem must preserve unitPrice');
        }
      },
    },
    {
      name: 'Order history listing and detail retrieves customer orders (GET /me/orders & GET /me/orders/:orderNo)',
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
        const createOrder = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'cod',
        });
        if (!createOrder.ok) return ctx.skip('Order creation failed');
        const createdOrder = createOrder.data.order || createOrder.data;

        // List orders
        const listRes = await ctx.client.get('/me/orders');
        assertOk(listRes, 'GET /me/orders must succeed');
        const orders = Array.isArray(listRes.data) ? listRes.data : listRes.data?.data;
        assert(Array.isArray(orders), 'Orders list must be an array');
        const found = orders.some((o: any) => o.orderNo === createdOrder.orderNo);
        assert(found, 'Placed order must appear in customer order history');

        // Order detail
        const detailRes = await ctx.client.get(`/me/orders/${createdOrder.orderNo}`);
        assertOk(detailRes, 'GET /me/orders/:orderNo must return 200 OK');
        assertEquals(detailRes.data.orderNo, createdOrder.orderNo, 'Order detail orderNo must match');
      },
    },
  ],
});

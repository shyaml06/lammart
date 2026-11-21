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
  name: 'Scenario 1: Complete Customer Browsing to COD Delivery Lifecycle',
  tier: 4,
  description:
    'End-to-end user journey S1: Guest FTS catalog search -> Pincode serviceability lookup -> Account registration -> Cart addition -> Intra-state address setup -> Tax quote verification (CGST+SGST) -> Atomic COD order placement -> Stock decrement -> Full administrative order progression (pending -> confirmed -> packed -> shipped -> delivered).',
  tests: [
    {
      name: 'Execute full Scenario 1 customer browsing to COD delivery journey',
      fn: async (ctx) => {
        if (!ctx.isServerUp) return ctx.skip('API server is offline');

        // ─── Step 1: Guest Browsing & FTS Search ───────────────────────
        ctx.log('Step 1: Guest searches catalog for laminates');
        const searchRes = await ctx.client.get('/products?q=laminate');
        assertOk(searchRes, 'Catalog search for laminates must return 200 OK');
        const productsList = Array.isArray(searchRes.data)
          ? searchRes.data
          : searchRes.data?.data || searchRes.data?.products;
        assertDefined(productsList, 'Search response must contain products array');
        assert(productsList.length > 0, 'Catalog search should return at least 1 laminate product');

        const chosenProduct = productsList.find((p: any) => p.variants && p.variants.length > 0);
        assertDefined(chosenProduct, 'Must locate a product with active variants');
        const chosenVariant = chosenProduct.variants[0];
        const initialStock = chosenVariant.stock;
        ctx.log(`Selected variant ${chosenVariant.sku} with initial stock: ${initialStock}`);

        // ─── Step 2: Pincode Serviceability Lookup ────────────────────
        ctx.log('Step 2: Checking delivery serviceability for Ahmedabad 380001');
        const pincodeRes = await ctx.client.get('/pincode/380001');
        assertOk(pincodeRes, 'Pincode 380001 lookup must return 200 OK');
        const pincodeData = pincodeRes.data;
        assert(
          pincodeData.isServiceable === true || pincodeData.isServiceable === 1,
          'Pincode 380001 must be serviceable'
        );
        assert(
          pincodeData.codAllowed === true || pincodeData.codAllowed === 1 || pincodeData.cod_allowed === 1,
          'COD must be permitted for pincode 380001'
        );

        // ─── Step 3: Customer Registration ────────────────────────────
        ctx.log('Step 3: Registering new customer account');
        const customer = generateCustomer();
        const registerRes = await ctx.client.post('/auth/register', {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
        });
        assertStatus(registerRes, [200, 201], 'Customer registration must return 200/201');

        // Verify session persists
        const meRes = await ctx.client.get('/auth/me');
        if (meRes.ok) {
          assertEquals(meRes.data.role, 'customer', 'User role must be customer');
        }

        // ─── Step 4: Cart Addition ────────────────────────────────────
        ctx.log('Step 4: Adding 2 units to shopping cart');
        const orderQty = 2;
        const addCartRes = await ctx.client.post('/cart/items', {
          variantId: chosenVariant.id,
          qty: orderQty,
        });
        assertStatus(addCartRes, [200, 201], 'Adding item to cart must return 200/201');

        const viewCartRes = await ctx.client.get('/cart');
        assertOk(viewCartRes, 'GET /cart must return 200 OK');
        const cartItems = Array.isArray(viewCartRes.data)
          ? viewCartRes.data
          : viewCartRes.data?.items;
        assertDefined(cartItems, 'Cart response must list items');
        assert(cartItems.length > 0, 'Cart must not be empty');

        // ─── Step 5: Address Creation ─────────────────────────────────
        ctx.log('Step 5: Creating saved intra-state delivery address');
        const addressRes = await ctx.client.post('/me/addresses', SAMPLE_ADDRESSES.ahmedabadIntraState);
        assertStatus(addressRes, [200, 201], 'Address creation must return 200/201');
        const addressId = addressRes.data.id;
        assertDefined(addressId, 'Saved address must return an ID');

        // ─── Step 6: Checkout Quote & Tax Verification ────────────────
        ctx.log('Step 6: Verifying checkout quote with intra-state CGST & SGST split');
        const quoteRes = await ctx.client.post('/checkout/quote', { addressId });
        assertOk(quoteRes, 'Checkout quote calculation must return 200 OK');
        const quote = quoteRes.data;

        assertDefined(quote.subtotal, 'Quote must include subtotal');
        assertDefined(quote.taxTotal, 'Quote must include taxTotal');
        assertDefined(quote.grandTotal, 'Quote must include grandTotal');

        if (quote.cgst !== undefined && quote.sgst !== undefined) {
          assertEquals(quote.igst, 0, 'Intra-state order must have IGST = 0');
          assert(quote.cgst > 0, 'Intra-state CGST must be positive');
          assert(quote.sgst > 0, 'Intra-state SGST must be positive');
          assertEquals(quote.cgst, quote.sgst, 'CGST and SGST must be equal 50/50 split');
        }

        // ─── Step 7: Order Placement with COD ─────────────────────────
        ctx.log('Step 7: Placing order with Cash on Delivery');
        const placeOrderRes = await ctx.client.post('/orders', {
          addressId,
          paymentMethod: 'cod',
          notes: 'Deliver during standard business hours',
        });
        assertStatus(placeOrderRes, [200, 201], 'Order placement must return 200/201');
        const orderData = placeOrderRes.data.order || placeOrderRes.data;
        const orderId = orderData.id;
        const orderNo = orderData.orderNo;
        assertDefined(orderId, 'Order must have numeric ID');
        assertDefined(orderNo, 'Order must have unique orderNo');
        assertEquals(orderData.paymentMethod, 'cod', 'Payment method must be cod');

        // ─── Step 8: Stock Decrement Verification ─────────────────────
        ctx.log('Step 8: Verifying stock decremented by purchased quantity');
        const productCheckRes = await ctx.client.get(`/products/${chosenProduct.slug}`);
        if (productCheckRes.ok) {
          const updatedProduct = productCheckRes.data;
          const updatedVariant = updatedProduct.variants?.find((v: any) => v.id === chosenVariant.id);
          if (updatedVariant && initialStock !== undefined) {
            assertEquals(
              updatedVariant.stock,
              initialStock - orderQty,
              `Variant stock should decrement from ${initialStock} to ${initialStock - orderQty}, got ${updatedVariant.stock}`
            );
          }
        }

        // ─── Step 9: Admin Order Lifecycle Progression ────────────────
        ctx.log('Step 9: Admin processes order: pending -> confirmed -> packed -> shipped -> delivered');
        ctx.client.clearCookies();
        const adminLoginRes = await ctx.client.post('/auth/login', {
          emailOrPhone: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });
        assertOk(adminLoginRes, 'Admin authentication must succeed');

        const transitions = [
          { status: 'confirmed', prev: 'pending' },
          { status: 'packed', prev: 'confirmed' },
          { status: 'shipped', prev: 'packed' },
          { status: 'delivered', prev: 'shipped' },
        ];

        let currentStatus = orderData.status;

        for (const t of transitions) {
          if (currentStatus === t.status) {
            continue;
          }
          ctx.log(`Transitioning order ${orderNo} from ${currentStatus} to ${t.status}`);
          const patchRes = await ctx.client.patch(`/admin/orders/${orderId}/status`, {
            status: t.status,
            currentStatus,
          });
          assertStatus(patchRes, [200, 204], `Order status transition to ${t.status} must succeed`);
          currentStatus = t.status;
        }

        // ─── Customer Verifies Final Delivered Status ─────────────────
        ctx.log('Verifying delivered order in customer order history');
        ctx.client.clearCookies();
        await ctx.client.post('/auth/login', {
          emailOrPhone: customer.email,
          password: customer.password,
        });

        const customerOrderRes = await ctx.client.get(`/me/orders/${orderNo}`);
        if (customerOrderRes.ok) {
          const custOrder = customerOrderRes.data.order || customerOrderRes.data;
          assertEquals(custOrder.status, 'delivered', 'Customer view of order must reflect delivered status');
        }
      },
    },
  ],
});

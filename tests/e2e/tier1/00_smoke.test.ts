import {
  assert,
  assertEquals,
  assertDeepEquals,
  assertMatch,
  assertArrayIncludes,
  assertDefined,
  assertThrows,
  assertStatus,
  assertOk,
  assertErrorResponse,
  CookieJar,
  HttpClient,
  ADMIN_CREDENTIALS,
  generateCustomer,
  generateDealer,
  SAMPLE_ADDRESSES,
  SEED_CATEGORIES,
  SEED_BRANDS,
  SEED_PRODUCTS,
  E2E_CONSTANTS,
  HttpResponse,
} from '../harness';
import { registerSuite } from '../runner';

registerSuite({
  name: 'Harness & Infrastructure Smoke Test',
  tier: 1,
  description: 'Validates that the test runner, assertion utilities, HTTP client, cookie jar, and fixtures operate correctly.',
  tests: [
    {
      name: 'Assertion library functions correctly validate equality, types, and error throwing',
      fn: async () => {
        // Truthiness assertion
        assert(true, 'true must be truthy');
        assert(1 === 1, 'equality check');

        // Primitive and strict equality
        assertEquals(42, 42, 'numbers match');
        assertEquals('lammart', 'lammart', 'strings match');

        // Deep equality
        const objA = { a: 1, b: [2, 3], c: { d: 'test' } };
        const objB = { a: 1, b: [2, 3], c: { d: 'test' } };
        assertDeepEquals(objA, objB, 'deeply nested objects match');

        // String matching
        assertMatch('Lammart Ecommerce MVP', 'Ecommerce', 'substring search');
        assertMatch('INV-2026-001', /^INV-\d{4}-\d{3}$/, 'regex match');

        // Array inclusion
        assertArrayIncludes([10, 20, 30], 20, 'array contains primitive');
        assertArrayIncludes([{ id: 1 }, { id: 2 }], { id: 2 }, 'array contains deep object');

        // Defined assertion
        const definedVal: string | undefined = 'hello';
        assertDefined(definedVal, 'must be defined');

        // Exception assertions
        await assertThrows(() => {
          throw new Error('Specific failure condition');
        }, 'Specific failure condition');

        await assertThrows(() => {
          throw new TypeError('Invalid type provided');
        }, TypeError);
      },
    },
    {
      name: 'CookieJar correctly stores, retrieves, deletes, and parses Set-Cookie headers',
      fn: () => {
        const jar = new CookieJar();

        // Basic set & get
        jar.set('session', 'xyz123');
        assertEquals(jar.get('session'), 'xyz123', 'retrieves stored cookie');

        // Delete
        jar.delete('session');
        assertEquals(jar.get('session'), undefined, 'deleted cookie is undefined');

        // Parse single Set-Cookie header
        jar.parseSetCookie('auth_token=jwt_sample_token_abc; Path=/; HttpOnly; SameSite=Lax');
        assertEquals(jar.get('auth_token'), 'jwt_sample_token_abc', 'extracts auth_token value');

        // Parse multiple Set-Cookie headers
        jar.parseSetCookie([
          'user_pref=dark; Path=/',
          'cart_id=c998; Path=/; HttpOnly',
        ]);
        assertEquals(jar.get('user_pref'), 'dark', 'parses user_pref');
        assertEquals(jar.get('cart_id'), 'c998', 'parses cart_id');

        // Format to Cookie header string
        const cookieHeader = jar.toHeaderString();
        assertMatch(cookieHeader, 'auth_token=jwt_sample_token_abc', 'header contains auth_token');
        assertMatch(cookieHeader, 'user_pref=dark', 'header contains user_pref');
        assertMatch(cookieHeader, 'cart_id=c998', 'header contains cart_id');

        // Expiration handling via Max-Age=0
        jar.parseSetCookie('user_pref=deleted; Max-Age=0; Path=/');
        assertEquals(jar.get('user_pref'), undefined, 'expired cookie with Max-Age=0 is removed');

        // Clear all
        jar.clear();
        assertEquals(Object.keys(jar.getAll()).length, 0, 'clear empties jar');
      },
    },
    {
      name: 'HttpClient manages baseUrl, auth headers, and query string building',
      fn: () => {
        const client = new HttpClient('http://localhost:4000/api/v1/');
        assertEquals(client.baseUrl, 'http://localhost:4000/api/v1', 'normalizes trailing slash');

        // Auth token management
        client.setAuthToken('mock_jwt_signature_xyz');
        assertEquals(client.getAuthToken(), 'mock_jwt_signature_xyz', 'stores auth token');
        assertEquals(client.getCookie('auth_token'), 'mock_jwt_signature_xyz', 'token stored in cookie jar');

        client.clearCookies();
        assertEquals(client.getAuthToken(), undefined, 'clearing cookies clears auth token');
      },
    },
    {
      name: 'Central test fixtures generate valid, unique payloads and conform to business rules',
      fn: () => {
        // Admin credentials fixture
        assertEquals(ADMIN_CREDENTIALS.email, 'admin@lammart.com', 'admin email fixture');
        assertEquals(ADMIN_CREDENTIALS.password, 'Admin@12345', 'admin password fixture');

        // Customer generator
        const customer1 = generateCustomer();
        const customer2 = generateCustomer();

        assert(customer1.email !== customer2.email, 'generated customer emails must be unique');
        assert(customer1.phone !== customer2.phone, 'generated customer phones must be unique');
        assertMatch(customer1.phone, /^98\d{8}$/, 'phone must be 10-digit Indian number starting with 98');
        assertMatch(customer1.email, /@test\.lammart\.com$/, 'email has valid test domain');

        // Dealer generator
        const dealer = generateDealer();
        assertDefined(dealer.businessName, 'dealer has business name');
        assertDefined(dealer.gstin, 'dealer has gstin');
        assertMatch(dealer.gstin, /^24[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/, 'valid GSTIN format');

        // Sample addresses
        const { ahmedabadIntraState, mumbaiInterState, unserviceable } = SAMPLE_ADDRESSES;
        assertEquals(ahmedabadIntraState.state, 'Gujarat', 'Ahmedabad is intra-state Gujarat');
        assertEquals(ahmedabadIntraState.pincode, '380001', 'Ahmedabad pincode');
        assertEquals(mumbaiInterState.state, 'Maharashtra', 'Mumbai is inter-state Maharashtra');
        assertEquals(mumbaiInterState.pincode, '400001', 'Mumbai pincode');
        assertEquals(unserviceable.pincode, '999999', 'unserviceable pincode');

        // Seed constants
        assertEquals(E2E_CONSTANTS.FREE_SHIPPING_THRESHOLD_PAISE, 500000, '₹5000 threshold in paise');
        assertEquals(E2E_CONSTANTS.DEFAULT_GST_RATE, 18, '18% GST');
        assertEquals(E2E_CONSTANTS.MAX_SAMPLE_ITEMS, 5, 'Max 5 samples');

        // Seed catalog lists
        assert(SEED_CATEGORIES.length >= 4, 'categories defined');
        assert(SEED_BRANDS.length >= 4, 'brands defined');
        assert(SEED_PRODUCTS.length >= 3, 'products defined');
      },
    },
    {
      name: 'HTTP Response and error response assertions validate status and contract structure',
      fn: () => {
        // Mock successful 200 response
        const mockSuccess: HttpResponse = {
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
          data: { id: 1, name: 'Royal Oak' },
          rawText: '{"id":1,"name":"Royal Oak"}',
          ok: true,
        };

        assertStatus(mockSuccess, 200, 'assertStatus on 200');
        assertStatus(mockSuccess, [200, 201], 'assertStatus with array');
        assertOk(mockSuccess, 'assertOk on 200');

        // Mock 400 error response conforming to Lammart API standard { code, message, details? }
        const mockError: HttpResponse = {
          status: 400,
          statusText: 'Bad Request',
          headers: new Headers({ 'content-type': 'application/json' }),
          data: {
            code: 'VALIDATION_ERROR',
            message: 'Quantity must be at least MOQ (2)',
            details: { field: 'quantity' },
          },
          rawText: '{"code":"VALIDATION_ERROR","message":"Quantity must be at least MOQ (2)"}',
          ok: false,
        };

        assertStatus(mockError, 400, 'assertStatus on 400');
        assertErrorResponse(mockError, 400, 'VALIDATION_ERROR', 'assertErrorResponse matches code and message');
      },
    },
  ],
});

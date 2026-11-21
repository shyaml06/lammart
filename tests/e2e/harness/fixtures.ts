/**
 * Central test fixtures and test data generators for Lammart E2E testing.
 */

// ─── Admin Credentials ──────────────────────────────────────────
export const ADMIN_CREDENTIALS = {
  email: 'admin@lammart.com',
  password: 'Admin@12345',
} as const;

// ─── Customer Data Generator ─────────────────────────────────────
export interface CustomerPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  businessName?: string;
  gstin?: string;
}

let counter = 1000;

export function generateCustomer(overrides: Partial<CustomerPayload> = {}): CustomerPayload {
  const timestamp = Date.now();
  const id = ++counter;
  // Generate random 8 digits after 98 to ensure valid 10-digit Indian phone starting with 98
  const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
  const phone = `98${randomSuffix}`;
  const email = `testuser_${timestamp}_${id}@test.lammart.com`;

  return {
    name: `Test Customer ${id}`,
    email,
    phone,
    password: 'Password@123',
    ...overrides,
  };
}

export function generateDealer(overrides: Partial<CustomerPayload> = {}): CustomerPayload {
  const base = generateCustomer(overrides);
  return {
    ...base,
    name: overrides.name || `Dealer Enterprise ${++counter}`,
    businessName: overrides.businessName || `Lammart Partner Solutions ${counter}`,
    // Valid 15-character Gujarat GSTIN format: 24AAAAA0000A1Z5
    gstin: overrides.gstin || '24AAAAA0000A1Z5',
  };
}

// ─── Sample Addresses ───────────────────────────────────────────
export const SAMPLE_ADDRESSES = {
  ahmedabadIntraState: {
    fullName: 'Ahmedabad Customer',
    phone: '9825012345',
    line1: '101 SG Highway, Bodakdev',
    line2: 'Near Iscon Cross Road',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380001',
    isDefault: true,
  },
  mumbaiInterState: {
    fullName: 'Mumbai Customer',
    phone: '9820012345',
    line1: '202 Marine Drive, Nariman Point',
    line2: 'Suite 4B',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    isDefault: false,
  },
  delhiInterState: {
    fullName: 'Delhi Customer',
    phone: '9810012345',
    line1: '12 Connaught Place, Inner Circle',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
    isDefault: false,
  },
  unserviceable: {
    fullName: 'Remote Outpost',
    phone: '9899012345',
    line1: 'Sector 99 Outland Road',
    city: 'Remote Region',
    state: 'Unknown',
    pincode: '999999',
    isDefault: false,
  },
} as const;

// ─── Known Seed Catalog Slugs & Categories ───────────────────────
export const SEED_CATEGORIES = [
  { slug: 'laminates', name: 'Decorative Laminates' },
  { slug: 'plywood', name: 'Plywood & Boards' },
  { slug: 'hardware', name: 'Architectural Hardware' },
  { slug: 'adhesives', name: 'Wood Adhesives' },
] as const;

export const SEED_BRANDS = [
  { slug: 'royale-touche', name: 'Royale Touche' },
  { slug: 'century-ply', name: 'Century Ply' },
  { slug: 'greenlam', name: 'Greenlam' },
  { slug: 'hafele', name: 'Hafele' },
  { slug: 'ebco', name: 'Ebco' },
] as const;

export const SEED_PRODUCTS = [
  {
    slug: 'royal-high-gloss-oak',
    name: 'Royal High Gloss Oak Laminate',
    categorySlug: 'laminates',
    brandSlug: 'royale-touche',
  },
  {
    slug: 'century-club-prime-plywood-18mm',
    name: 'Century Club Prime Marine Plywood 18mm',
    categorySlug: 'plywood',
    brandSlug: 'century-ply',
  },
  {
    slug: 'hafele-metalla-concealed-hinge',
    name: 'Hafele Metalla Concealed Hinge 110 Degree',
    categorySlug: 'hardware',
    brandSlug: 'hafele',
  },
] as const;

// ─── Business Rules & Threshold Constants ────────────────────────
export const E2E_CONSTANTS = {
  // ₹5,000 in paise
  FREE_SHIPPING_THRESHOLD_PAISE: 500000,
  // Base shipping charge ₹250 in paise
  BASE_SHIPPING_CHARGE_PAISE: 25000,
  // Default GST rate percentage
  DEFAULT_GST_RATE: 18,
  // Maximum COD order amount ₹25,000 in paise
  MAX_COD_AMOUNT_PAISE: 2500000,
  // Maximum sample swatches allowed per request
  MAX_SAMPLE_ITEMS: 5,
  // Origin state for GST calculation
  ORIGIN_STATE: 'Gujarat',
  // Store default pincode
  ORIGIN_PINCODE: '380001',
} as const;

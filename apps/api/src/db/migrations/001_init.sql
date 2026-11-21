-- 001_init.sql: Initial database schema for Lammart

-- Schema migrations tracker
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','dealer','admin')),
  gstin TEXT,
  business_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Customer Addresses Table
CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0
);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER REFERENCES categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

-- 4. Brands Table
CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo TEXT
);

-- 5. Products Table
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  brand_id INTEGER REFERENCES brands(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  hsn_code TEXT,
  gst_rate REAL NOT NULL DEFAULT 18,
  unit TEXT NOT NULL DEFAULT 'piece',   -- sheet, sqft, piece, set
  is_heavy INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  design_code TEXT,                      -- laminate design number (e.g. 1000, 2045)
  option_label TEXT,                     -- e.g. '8x4 ft / 1.0 mm / Matte'
  price INTEGER NOT NULL,                -- paise, selling price (GST inclusive)
  mrp INTEGER,                           -- paise, maximum retail price
  stock INTEGER NOT NULL DEFAULT 0,
  weight_grams INTEGER,
  moq INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1
);

-- 7. Variant Attributes (Faceted Filter Specs)
CREATE TABLE IF NOT EXISTS variant_attributes (
  variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (variant_id, key)
);

-- 8. Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  alt TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 9. Price Tiers (Volume & Role Pricing)
CREATE TABLE IF NOT EXISTS price_tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'customer',
  min_qty INTEGER NOT NULL,
  price INTEGER NOT NULL                 -- paise
);

-- 10. Cart Items Table
CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  UNIQUE (user_id, variant_id)
);

-- 11. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','confirmed','packed','shipped','delivered','cancelled','refunded')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('razorpay','cod')),
  subtotal INTEGER NOT NULL,            -- paise
  discount INTEGER NOT NULL DEFAULT 0,  -- paise
  shipping_charge INTEGER NOT NULL DEFAULT 0, -- paise
  tax_total INTEGER NOT NULL DEFAULT 0, -- paise
  grand_total INTEGER NOT NULL,         -- paise
  shipping_address TEXT NOT NULL,       -- JSON snapshot of Address
  billing_gstin TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 12. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id),
  name_snapshot TEXT NOT NULL,
  sku_snapshot TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,          -- paise
  gst_rate REAL NOT NULL,               -- e.g. 18.0
  line_total INTEGER NOT NULL           -- paise
);

-- 13. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT,
  provider_payment_id TEXT UNIQUE,
  amount INTEGER NOT NULL,              -- paise
  status TEXT NOT NULL DEFAULT 'created',
  raw_event TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 14. B2B Quotes Table
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','quoted','accepted','rejected','converted')),
  quoted_total INTEGER,                 -- paise
  admin_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 15. Quote Items Table
CREATE TABLE IF NOT EXISTS quote_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES product_variants(id),
  description TEXT,
  qty INTEGER NOT NULL,
  quoted_unit_price INTEGER             -- paise
);

-- 16. Sample Requests Table
CREATE TABLE IF NOT EXISTS sample_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  pincode TEXT NOT NULL,
  variant_ids TEXT NOT NULL,            -- JSON array of variant IDs (max 5)
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','dispatched','delivered','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 17. Pincodes & Logistics Table
CREATE TABLE IF NOT EXISTS pincodes (
  pincode TEXT PRIMARY KEY,
  city TEXT,
  state TEXT,
  is_serviceable INTEGER NOT NULL DEFAULT 1,
  delivery_days INTEGER,
  base_charge INTEGER NOT NULL DEFAULT 0,             -- paise
  heavy_charge_per_unit INTEGER NOT NULL DEFAULT 0,   -- paise
  cod_allowed INTEGER NOT NULL DEFAULT 1
);

-- 18. System Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_design ON product_variants(design_code);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_attrs_key_value ON variant_attributes(key, value);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);

-- FTS5 Full-Text Search Virtual Table
CREATE VIRTUAL TABLE IF NOT EXISTS product_search USING fts5(
  name, brand, category, design_codes, description,
  tokenize = 'porter unicode61'
);

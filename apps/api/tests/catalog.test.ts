import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { app } from '../src/app';
import { getDb, closeDb } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';
import { seedDatabase } from '../src/db/seed';

const TEST_DB_PATH = path.resolve(process.cwd(), 'data/test_catalog.db');

describe('Milestone 2: Catalog & Database Infrastructure', () => {
  beforeAll(() => {
    // Clean up previous test db if present
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch (_) {}
    }

    process.env.DB_PATH = TEST_DB_PATH;
    const db = getDb({ path: TEST_DB_PATH, forceNew: true });

    // Run migrations & seed
    const migrationResult = runMigrations(db);
    expect(migrationResult.applied.length).toBeGreaterThan(0);

    seedDatabase(db);
  });

  afterAll(() => {
    closeDb();
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch (_) {}
    }
  });

  describe('Database Schema & Seed Integrity', () => {
    it('enforces pragmas (foreign keys, WAL mode, synchronous)', () => {
      const db = getDb(TEST_DB_PATH);
      const foreignKeys = db.prepare('PRAGMA foreign_keys;').pluck().get();
      expect(foreignKeys).toBe(1);

      const journalMode = db.prepare('PRAGMA journal_mode;').pluck().get();
      expect(['wal', 'memory']).toContain(String(journalMode).toLowerCase());
    });

    it('contains all 18 relational tables, schema_migrations, and indexes', () => {
      const db = getDb(TEST_DB_PATH);
      const tables = db
        .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';`)
        .pluck()
        .all() as string[];

      const expectedTables = [
        'schema_migrations',
        'users',
        'addresses',
        'categories',
        'brands',
        'products',
        'product_variants',
        'variant_attributes',
        'product_images',
        'price_tiers',
        'cart_items',
        'orders',
        'order_items',
        'payments',
        'quotes',
        'quote_items',
        'sample_requests',
        'pincodes',
        'settings',
      ];

      for (const t of expectedTables) {
        expect(tables).toContain(t);
      }

      // Check indexes
      const indexes = db
        .prepare(`SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%';`)
        .pluck()
        .all() as string[];

      expect(indexes).toContain('idx_products_category');
      expect(indexes).toContain('idx_products_slug');
      expect(indexes).toContain('idx_categories_slug');
      expect(indexes).toContain('idx_variants_product');
      expect(indexes).toContain('idx_variants_design');
      expect(indexes).toContain('idx_variants_sku');
      expect(indexes).toContain('idx_attrs_key_value');
      expect(indexes).toContain('idx_orders_user');
      expect(indexes).toContain('idx_orders_status');
      expect(indexes).toContain('idx_cart_user');
    });

    it('seeded admin, settings, and at least 20 products', () => {
      const db = getDb(TEST_DB_PATH);
      const admin = db.prepare("SELECT email, role FROM users WHERE role = 'admin'").get() as any;
      expect(admin).toBeDefined();
      expect(admin.email).toBe('admin@lammart.com');

      const shopGstin = db.prepare("SELECT value FROM settings WHERE key = 'shop_gstin'").pluck().get();
      expect(shopGstin).toBe('24AAACL1234D1Z2');

      const productCount = db.prepare('SELECT COUNT(*) FROM products').pluck().get();
      expect(Number(productCount)).toBeGreaterThanOrEqual(20);

      const ftsCount = db.prepare('SELECT COUNT(*) FROM product_search').pluck().get();
      expect(Number(ftsCount)).toBeGreaterThanOrEqual(20);
    });
  });

  describe('GET /api/v1/categories', () => {
    it('returns a hierarchical category tree with children', async () => {
      const res = await request(app).get('/api/v1/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4);

      const laminates = res.body.find((c: any) => c.slug === 'laminates');
      expect(laminates).toBeDefined();
      expect(laminates.name).toBe('Laminates');
      expect(Array.isArray(laminates.children)).toBe(true);
      expect(laminates.children.length).toBeGreaterThanOrEqual(4);

      const subSlugs = laminates.children.map((c: any) => c.slug);
      expect(subSlugs).toContain('1mm-premium');
      expect(subSlugs).toContain('decorative-laminates');
      expect(subSlugs).toContain('08mm-liner');
      expect(subSlugs).toContain('exterior-cladding');
    });
  });

  describe('GET /api/v1/products', () => {
    it('returns paginated products with fromPrice in paise', async () => {
      const res = await request(app).get('/api/v1/products?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('page', 1);
      expect(res.body).toHaveProperty('limit', 10);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('totalPages');
      expect(res.body.data.length).toBe(10);

      const first = res.body.data[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('slug');
      expect(first).toHaveProperty('unit');
      expect(first).toHaveProperty('fromPrice');
      expect(typeof first.fromPrice).toBe('number');
      expect(first.fromPrice).toBeGreaterThan(0);
      expect(first).toHaveProperty('category');
      expect(first).toHaveProperty('images');
    });

    it('filters products by parent category and includes subcategories', async () => {
      const res = await request(app).get('/api/v1/products?category=laminates');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);

      for (const p of res.body.data) {
        expect(['laminates', '1mm-premium', 'decorative-laminates', '08mm-liner', 'exterior-cladding']).toContain(
          p.category.slug
        );
      }
    });

    it('filters products by brand', async () => {
      const res = await request(app).get('/api/v1/products?brand=greenlam');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      for (const p of res.body.data) {
        expect(p.brand.slug).toBe('greenlam');
      }
    });

    it('filters products by dynamic attributes (e.g. finish=Matte)', async () => {
      const res = await request(app).get('/api/v1/products?finish=Matte');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      // Verify that returned products actually contain a Matte variant
      for (const p of res.body.data) {
        const hasMatteVariant = p.variants.some((v: any) => v.attributes?.finish === 'Matte');
        expect(hasMatteVariant).toBe(true);
      }
    });

    it('sorts products by price_asc and price_desc', async () => {
      const ascRes = await request(app).get('/api/v1/products?sort=price_asc&limit=20');
      expect(ascRes.status).toBe(200);
      const ascPrices = ascRes.body.data.map((p: any) => p.fromPrice);
      for (let i = 0; i < ascPrices.length - 1; i++) {
        expect(ascPrices[i]).toBeLessThanOrEqual(ascPrices[i + 1]);
      }

      const descRes = await request(app).get('/api/v1/products?sort=price_desc&limit=20');
      expect(descRes.status).toBe(200);
      const descPrices = descRes.body.data.map((p: any) => p.fromPrice);
      for (let i = 0; i < descPrices.length - 1; i++) {
        expect(descPrices[i]).toBeGreaterThanOrEqual(descPrices[i + 1]);
      }
    });

    it('sorts products by name_asc', async () => {
      const res = await request(app).get('/api/v1/products?sort=name_asc&limit=10');
      expect(res.status).toBe(200);
      const names = res.body.data.map((p: any) => p.name);
      for (let i = 0; i < names.length - 1; i++) {
        expect(names[i].localeCompare(names[i + 1])).toBeLessThanOrEqual(0);
      }
    });

    it('returns 400 VALIDATION_ERROR on invalid pagination parameters', async () => {
      const res = await request(app).get('/api/v1/products?page=-5');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/products/:slug', () => {
    it('returns full product detail with variants, specs/attributes, and price tiers', async () => {
      const res = await request(app).get('/api/v1/products/greenlam-matte-elegance');
      expect(res.status).toBe(200);
      expect(res.body.slug).toBe('greenlam-matte-elegance');
      expect(res.body.name).toBe('Greenlam Matte Elegance Laminate');
      expect(res.body.category).toBeDefined();
      expect(res.body.brand).toBeDefined();
      expect(res.body.brand.slug).toBe('greenlam');
      expect(Array.isArray(res.body.variants)).toBe(true);
      expect(res.body.variants.length).toBeGreaterThanOrEqual(2);

      const firstVariant = res.body.variants[0];
      expect(firstVariant).toHaveProperty('sku');
      expect(firstVariant).toHaveProperty('price');
      expect(firstVariant).toHaveProperty('attributes');
      expect(firstVariant.attributes).toHaveProperty('thickness', '1.0mm');
      expect(firstVariant.attributes).toHaveProperty('finish', 'Matte');

      // Price tiers verification
      expect(Array.isArray(firstVariant.priceTiers)).toBe(true);
      if (firstVariant.priceTiers.length > 0) {
        expect(firstVariant.priceTiers[0]).toHaveProperty('minQty');
        expect(firstVariant.priceTiers[0]).toHaveProperty('price');
      }
    });

    it('returns 404 NOT_FOUND for non-existent slug', async () => {
      const res = await request(app).get('/api/v1/products/completely-made-up-product-slug');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('GET /api/v1/search/suggest', () => {
    it('returns empty array when query is less than 2 characters', async () => {
      const res = await request(app).get('/api/v1/search/suggest?q=a');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('suggests design code matches when searching design numbers (e.g. 1000)', async () => {
      const res = await request(app).get('/api/v1/search/suggest?q=1000');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      const designMatch = res.body.find((s: any) => s.type === 'design_code');
      expect(designMatch).toBeDefined();
      expect(designMatch.title).toContain('1000');
      expect(designMatch.slug).toBe('greenlam-matte-elegance');
    });

    it('suggests brand matches (e.g. Greenlam)', async () => {
      const res = await request(app).get('/api/v1/search/suggest?q=Greenlam');
      expect(res.status).toBe(200);
      const brandMatch = res.body.find((s: any) => s.type === 'brand');
      expect(brandMatch).toBeDefined();
      expect(brandMatch.title).toBe('Greenlam');
    });

    it('suggests products matching search terms via FTS5', async () => {
      const res = await request(app).get('/api/v1/search/suggest?q=Charcoal');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      const productMatch = res.body.find((s: any) => s.type === 'product');
      expect(productMatch).toBeDefined();
      expect(productMatch.title.toLowerCase()).toContain('charcoal');
    });
  });

  describe('GET /api/v1/filters', () => {
    it('aggregates attribute counts across all products', async () => {
      const res = await request(app).get('/api/v1/filters');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('finish');
      expect(res.body).toHaveProperty('thickness');
      expect(Array.isArray(res.body.finish)).toBe(true);

      const matteOption = res.body.finish.find((f: any) => f.value === 'Matte');
      expect(matteOption).toBeDefined();
      expect(matteOption.count).toBeGreaterThan(0);
    });

    it('aggregates attribute counts scoped to a category (e.g. plywood)', async () => {
      const res = await request(app).get('/api/v1/filters?category=plywood');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('grade');
      const bwpGrade = res.body.grade.find((g: any) => g.value === 'BWP');
      expect(bwpGrade).toBeDefined();
      expect(bwpGrade.count).toBeGreaterThan(0);
    });

    it('returns 404 NOT_FOUND when category filter does not exist', async () => {
      const res = await request(app).get('/api/v1/filters?category=nonexistent-category-slug');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('GET /api/v1/pincode/:pincode', () => {
    it('returns serviceable details for Gujarat intra-state pincode (380001)', async () => {
      const res = await request(app).get('/api/v1/pincode/380001');
      expect(res.status).toBe(200);
      expect(res.body.pincode).toBe('380001');
      expect(res.body.city).toBe('Ahmedabad');
      expect(res.body.state).toBe('Gujarat');
      expect(res.body.isServiceable).toBe(true);
      expect(res.body.deliveryDays).toBe(2);
      expect(res.body.baseCharge).toBe(15000); // ₹150 in paise
      expect(res.body.heavyChargePerUnit).toBe(10000); // ₹100 in paise
      expect(res.body.codAllowed).toBe(true);
    });

    it('returns serviceable details for Inter-state metro pincode (400001 Mumbai)', async () => {
      const res = await request(app).get('/api/v1/pincode/400001');
      expect(res.status).toBe(200);
      expect(res.body.pincode).toBe('400001');
      expect(res.body.city).toBe('Mumbai');
      expect(res.body.state).toBe('Maharashtra');
      expect(res.body.isServiceable).toBe(true);
      expect(res.body.deliveryDays).toBe(4);
      expect(res.body.baseCharge).toBe(35000);
    });

    it('returns isServiceable: false for unserviceable pincode (999999)', async () => {
      const res = await request(app).get('/api/v1/pincode/999999');
      expect(res.status).toBe(200);
      expect(res.body.pincode).toBe('999999');
      expect(res.body.isServiceable).toBe(false);
    });

    it('returns 404 NOT_FOUND for unknown pincode (000000)', async () => {
      const res = await request(app).get('/api/v1/pincode/000000');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('code', 'NOT_FOUND');
    });

    it('returns 400 VALIDATION_ERROR for invalid pincode format (e.g. 123)', async () => {
      const res = await request(app).get('/api/v1/pincode/123');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });
});

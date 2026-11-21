import bcrypt from 'bcrypt';
import type { Database as DatabaseType } from 'better-sqlite3';
import { getDb, closeDb } from './client';
import { runMigrations } from './migrate';
import { rebuildProductSearch } from './search';

export function seedDatabase(db?: DatabaseType): void {
  const database = db || getDb();

  // Ensure migrations are run first
  runMigrations(database);

  console.log('[seed] Seeding database...');

  const runSeed = database.transaction(() => {
    // 1. Admin User
    const adminPasswordHash = bcrypt.hashSync('Admin@12345', 12);
    database
      .prepare(
        `
        INSERT INTO users (name, email, phone, password_hash, role, gstin, business_name, is_active)
        VALUES (?, ?, ?, ?, 'admin', '24AAACL1234D1Z2', 'Lammart Admin Store', 1)
        ON CONFLICT(email) DO UPDATE SET
          name = excluded.name,
          phone = excluded.phone,
          password_hash = excluded.password_hash,
          role = excluded.role,
          is_active = excluded.is_active;
      `
      )
      .run('Lammart Admin', 'admin@lammart.com', '9876543210', adminPasswordHash);

    // 2. Settings
    const settings: Record<string, string> = {
      shop_name: 'Lammart Laminates & Hardware',
      shop_state: 'Gujarat',
      shop_gstin: '24AAACL1234D1Z2',
      free_shipping_threshold: '500000', // ₹5,000 in paise
      whatsapp_number: '+919876543210',
      cod_max_limit: '2500000', // ₹25,000 in paise
      backorders_enabled: 'false',
    };

    const insertSetting = database.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    );
    for (const [key, value] of Object.entries(settings)) {
      insertSetting.run(key, value);
    }

    // 3. Brands
    const brands = [
      { name: 'Greenlam', slug: 'greenlam', logo: '/images/brands/greenlam.svg' },
      { name: 'CenturyPly', slug: 'centuryply', logo: '/images/brands/centuryply.svg' },
      { name: 'Merino', slug: 'merino', logo: '/images/brands/merino.svg' },
      { name: 'Royale Touche', slug: 'royale-touche', logo: '/images/brands/royale-touche.svg' },
      { name: 'Godrej', slug: 'godrej', logo: '/images/brands/godrej.svg' },
      { name: 'Dorset', slug: 'dorset', logo: '/images/brands/dorset.svg' },
    ];

    const insertBrand = database.prepare(
      `INSERT INTO brands (name, slug, logo) VALUES (?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET name = excluded.name, logo = excluded.logo`
    );
    for (const brand of brands) {
      insertBrand.run(brand.name, brand.slug, brand.logo);
    }

    // Map brand slugs to IDs
    const brandMap = new Map<string, number>();
    const brandRows = database.prepare('SELECT id, slug FROM brands').all() as { id: number; slug: string }[];
    for (const r of brandRows) {
      brandMap.set(r.slug, r.id);
    }

    // 4. Categories (Parent & Children)
    const parentCategories = [
      { name: 'Laminates', slug: 'laminates', description: 'Decorative, liner, and premium laminates', sort_order: 10 },
      { name: 'Plywood & Boards', slug: 'plywood', description: 'Marine, MR, and BWR grade plywood sheets', sort_order: 20 },
      { name: 'Hardware & Handles', slug: 'hardware', description: 'Mortise handles, cabinet knobs, and pull handles', sort_order: 30 },
      { name: 'Wall Decor', slug: 'wall-decor', description: 'Charcoal louvers and decorative fluted panels', sort_order: 40 },
    ];

    const insertCat = database.prepare(
      `INSERT INTO categories (parent_id, name, slug, description, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, 1)
       ON CONFLICT(slug) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         sort_order = excluded.sort_order,
         parent_id = excluded.parent_id`
    );

    for (const cat of parentCategories) {
      insertCat.run(null, cat.name, cat.slug, cat.description, cat.sort_order);
    }

    const catMap = new Map<string, number>();
    const parentRows = database.prepare('SELECT id, slug FROM categories WHERE parent_id IS NULL').all() as { id: number; slug: string }[];
    for (const r of parentRows) {
      catMap.set(r.slug, r.id);
    }

    const subCategories = [
      // Laminates children
      { parent: 'laminates', name: 'Decorative Laminates', slug: 'decorative-laminates', sort_order: 1 },
      { parent: 'laminates', name: '1.0mm Premium', slug: '1mm-premium', sort_order: 2 },
      { parent: 'laminates', name: '0.8mm Liner', slug: '08mm-liner', sort_order: 3 },
      { parent: 'laminates', name: 'Exterior Cladding', slug: 'exterior-cladding', sort_order: 4 },
      // Plywood children
      { parent: 'plywood', name: 'Marine BWP Grade', slug: 'marine-bwp', sort_order: 1 },
      { parent: 'plywood', name: 'Commercial MR Grade', slug: 'commercial-mr', sort_order: 2 },
      { parent: 'plywood', name: 'Waterproof BWR', slug: 'waterproof-bwr', sort_order: 3 },
      // Hardware children
      { parent: 'hardware', name: 'Mortise Handles', slug: 'mortise-handles', sort_order: 1 },
      { parent: 'hardware', name: 'Cabinet Knobs', slug: 'cabinet-knobs', sort_order: 2 },
      { parent: 'hardware', name: 'Main Door Pull Handles', slug: 'pull-handles', sort_order: 3 },
      // Wall decor children
      { parent: 'wall-decor', name: 'Charcoal Louvers', slug: 'charcoal-louvers', sort_order: 1 },
      { parent: 'wall-decor', name: 'Fluted Panels', slug: 'fluted-panels', sort_order: 2 },
    ];

    for (const sub of subCategories) {
      const parentId = catMap.get(sub.parent) || null;
      insertCat.run(parentId, sub.name, sub.slug, `${sub.name} collection`, sub.sort_order);
    }

    const allCats = database.prepare('SELECT id, slug FROM categories').all() as { id: number; slug: string }[];
    for (const r of allCats) {
      catMap.set(r.slug, r.id);
    }

    // 5. Products & Variants Data (22 Realistic items)
    interface SeedProductVariant {
      sku: string;
      designCode?: string;
      optionLabel: string;
      price: number; // paise
      mrp?: number;
      stock: number;
      weightGrams: number;
      moq: number;
      attributes: Record<string, string>;
      priceTiers?: { role: string; minQty: number; price: number }[];
    }

    interface SeedProduct {
      name: string;
      slug: string;
      categorySlug: string;
      brandSlug: string;
      description: string;
      hsnCode: string;
      gstRate: number;
      unit: 'sheet' | 'piece' | 'sqft' | 'set';
      isHeavy: number;
      images: { path: string; alt: string; sort_order: number }[];
      variants: SeedProductVariant[];
    }

    const productsData: SeedProduct[] = [
      // 1. Greenlam Matte Elegance
      {
        name: 'Greenlam Matte Elegance Laminate',
        slug: 'greenlam-matte-elegance',
        categorySlug: '1mm-premium',
        brandSlug: 'greenlam',
        description: 'Premium 1.0mm decorative laminate sheet with anti-fingerprint matte texture. Ideal for luxury residential interiors, modular kitchens, and designer wardrobes.',
        hsnCode: '48239090',
        gstRate: 18,
        unit: 'sheet',
        isHeavy: 0,
        images: [{ path: '/images/products/greenlam-matte-1000.webp', alt: 'Greenlam Matte 1000 Swatch', sort_order: 0 }],
        variants: [
          {
            sku: 'GL-1000-84-10-M',
            designCode: '1000',
            optionLabel: '8x4 ft / 1.0mm / Soft White Matte',
            price: 145000, // ₹1,450.00
            mrp: 185000,
            stock: 65,
            weightGrams: 4200,
            moq: 1,
            attributes: { thickness: '1.0mm', finish: 'Matte', size: '8x4 ft', color: 'White' },
            priceTiers: [
              { role: 'customer', minQty: 10, price: 135000 },
              { role: 'dealer', minQty: 1, price: 125000 },
            ],
          },
          {
            sku: 'GL-2045-84-10-M',
            designCode: '2045',
            optionLabel: '8x4 ft / 1.0mm / Slate Grey Matte',
            price: 152000, // ₹1,520.00
            mrp: 195000,
            stock: 40,
            weightGrams: 4200,
            moq: 1,
            attributes: { thickness: '1.0mm', finish: 'Matte', size: '8x4 ft', color: 'Grey' },
          },
        ],
      },
      // 2. Royale Touche High Gloss Oak
      {
        name: 'Royale Touche High Gloss Natural Oak Laminate',
        slug: 'royale-touche-high-gloss-oak',
        categorySlug: 'decorative-laminates',
        brandSlug: 'royale-touche',
        description: 'Ultra-glossy luxury woodgrain laminate sheet with deep reflection and scratch-resistant acrylic top coat.',
        hsnCode: '48239090',
        gstRate: 18,
        unit: 'sheet',
        isHeavy: 0,
        images: [{ path: '/images/products/rt-gloss-oak.webp', alt: 'Royale Touche Oak Gloss', sort_order: 0 }],
        variants: [
          {
            sku: 'RT-3012-84-125-G',
            designCode: '3012',
            optionLabel: '8x4 ft / 1.25mm / Natural Oak Gloss',
            price: 215000, // ₹2,150.00
            mrp: 260000,
            stock: 50,
            weightGrams: 4800,
            moq: 1,
            attributes: { thickness: '1.25mm', finish: 'Gloss', size: '8x4 ft', color: 'Natural Oak' },
          },
          {
            sku: 'RT-3015-84-125-G',
            designCode: '3015',
            optionLabel: '8x4 ft / 1.25mm / Smoked Oak Gloss',
            price: 225000,
            mrp: 275000,
            stock: 35,
            weightGrams: 4800,
            moq: 1,
            attributes: { thickness: '1.25mm', finish: 'Gloss', size: '8x4 ft', color: 'Smoked Oak' },
          },
        ],
      },
      // 3. Merino Suede Walnut
      {
        name: 'Merino Suede American Walnut Laminate',
        slug: 'merino-suede-american-walnut',
        categorySlug: 'decorative-laminates',
        brandSlug: 'merino',
        description: 'Rich warm American Walnut grain texture with tactile suede embossing. Perfect for feature walls, credenzas, and doors.',
        hsnCode: '48239090',
        gstRate: 18,
        unit: 'sheet',
        isHeavy: 0,
        images: [{ path: '/images/products/merino-walnut.webp', alt: 'Merino Walnut Suede', sort_order: 0 }],
        variants: [
          {
            sku: 'MR-4018-84-10-S',
            designCode: '4018',
            optionLabel: '8x4 ft / 1.0mm / American Walnut Suede',
            price: 168000,
            mrp: 210000,
            stock: 75,
            weightGrams: 4300,
            moq: 1,
            attributes: { thickness: '1.0mm', finish: 'Suede', size: '8x4 ft', color: 'Walnut' },
          },
        ],
      },
      // 4. Greenlam White Liner 0.8mm
      {
        name: 'Greenlam Balancing White Liner Sheet',
        slug: 'greenlam-balancing-white-liner',
        categorySlug: '08mm-liner',
        brandSlug: 'greenlam',
        description: 'Economical 0.8mm balancing liner sheet for inside cabinets, drawer linings, and carcass backing.',
        hsnCode: '48239090',
        gstRate: 18,
        unit: 'sheet',
        isHeavy: 0,
        images: [{ path: '/images/products/greenlam-liner.webp', alt: 'Greenlam 0.8mm Liner', sort_order: 0 }],
        variants: [
          {
            sku: 'GL-LINER-08-W',
            designCode: '100',
            optionLabel: '8x4 ft / 0.8mm / Off White Liner',
            price: 72000, // ₹720.00
            mrp: 90000,
            stock: 200,
            weightGrams: 3200,
            moq: 5,
            attributes: { thickness: '0.8mm', finish: 'Matte', size: '8x4 ft', color: 'White' },
          },
        ],
      },
      // 5. Merino Exterior Compact Cladding
      {
        name: 'Merino Armour Exterior Compact Cladding',
        slug: 'merino-armour-exterior-cladding',
        categorySlug: 'exterior-cladding',
        brandSlug: 'merino',
        description: '6.0mm high-density exterior grade compact laminate board resistant to UV, torrential rain, and extreme temperature variations.',
        hsnCode: '48239090',
        gstRate: 18,
        unit: 'sheet',
        isHeavy: 1,
        images: [{ path: '/images/products/merino-cladding.webp', alt: 'Merino Cladding', sort_order: 0 }],
        variants: [
          {
            sku: 'MR-EXT-60-TEAK',
            designCode: '6001',
            optionLabel: '8x4 ft / 6.0mm / Burma Teak UV',
            price: 680000, // ₹6,800.00
            mrp: 820000,
            stock: 25,
            weightGrams: 28000,
            moq: 2,
            attributes: { thickness: '6.0mm', finish: 'Textured', size: '8x4 ft', color: 'Teak' },
          },
        ],
      },
      // 6. Royale Touche Textured Concrete
      {
        name: 'Royale Touche Architectural Concrete Laminate',
        slug: 'royale-touche-architectural-concrete',
        categorySlug: '1mm-premium',
        brandSlug: 'royale-touche',
        description: 'Rough urban cast concrete texture providing an industrial brutalist aesthetic to tables, pillars, and conference desks.',
        hsnCode: '48239090',
        gstRate: 18,
        unit: 'sheet',
        isHeavy: 0,
        images: [{ path: '/images/products/rt-concrete.webp', alt: 'Royale Touche Concrete', sort_order: 0 }],
        variants: [
          {
            sku: 'RT-5042-84-125-T',
            designCode: '5042',
            optionLabel: '8x4 ft / 1.25mm / Urban Grey Concrete',
            price: 240000,
            mrp: 295000,
            stock: 45,
            weightGrams: 4900,
            moq: 1,
            attributes: { thickness: '1.25mm', finish: 'Textured', size: '8x4 ft', color: 'Concrete Grey' },
          },
        ],
      },
      // 7. Greenlam Marble Silk
      {
        name: 'Greenlam Carrara Silk Marble Laminate',
        slug: 'greenlam-carrara-silk-marble',
        categorySlug: 'decorative-laminates',
        brandSlug: 'greenlam',
        description: 'Italian Carrara marble vein pattern with satin silk finish for luxurious kitchen backsplashes and bathroom vanities.',
        hsnCode: '48239090',
        gstRate: 18,
        unit: 'sheet',
        isHeavy: 0,
        images: [{ path: '/images/products/greenlam-marble.webp', alt: 'Greenlam Marble', sort_order: 0 }],
        variants: [
          {
            sku: 'GL-6020-84-10-M',
            designCode: '6020',
            optionLabel: '8x4 ft / 1.0mm / Carrara White Silk',
            price: 185000,
            mrp: 230000,
            stock: 55,
            weightGrams: 4200,
            moq: 1,
            attributes: { thickness: '1.0mm', finish: 'Suede', size: '8x4 ft', color: 'White Marble' },
          },
        ],
      },
      // 8. CenturyPly Marine Club Prime BWP
      {
        name: 'CenturyPly Club Prime Marine BWP Plywood',
        slug: 'centuryply-club-prime-marine-bwp',
        categorySlug: 'marine-bwp',
        brandSlug: 'centuryply',
        description: 'IS:710 certified boiling waterproof marine grade plywood with GLP (Glue Line Protection) against termites and borer.',
        hsnCode: '44123100',
        gstRate: 18,
        unit: 'sheet',
        isHeavy: 1,
        images: [{ path: '/images/products/century-club-prime.webp', alt: 'Century Club Prime', sort_order: 0 }],
        variants: [
          {
            sku: 'CP-BWP-84-19',
            designCode: 'BWP-19',
            optionLabel: '8x4 ft / 19mm / Marine BWP',
            price: 435000, // ₹4,350.00
            mrp: 510000,
            stock: 80,
            weightGrams: 36000,
            moq: 2,
            attributes: { thickness: '19mm', grade: 'BWP', size: '8x4 ft' },
            priceTiers: [
              { role: 'customer', minQty: 10, price: 410000 },
              { role: 'dealer', minQty: 1, price: 385000 },
            ],
          },
          {
            sku: 'CP-BWP-84-12',
            designCode: 'BWP-12',
            optionLabel: '8x4 ft / 12mm / Marine BWP',
            price: 295000, // ₹2,950.00
            mrp: 350000,
            stock: 90,
            weightGrams: 23000,
            moq: 2,
            attributes: { thickness: '12mm', grade: 'BWP', size: '8x4 ft' },
          },
        ],
      },
      // 9. CenturyPly Sainik MR Grade
      {
        name: 'CenturyPly Sainik MR Commercial Plywood',
        slug: 'centuryply-sainik-mr-commercial',
        categorySlug: 'commercial-mr',
        brandSlug: 'centuryply',
        description: 'IS:303 moisture-resistant commercial plywood sheet for bedroom wardrobes, TV consoles, and false ceilings.',
        hsnCode: '44123100',
        gstRate: 18,
        unit: 'sheet',
        isHeavy: 1,
        images: [{ path: '/images/products/century-sainik-mr.webp', alt: 'Century Sainik MR', sort_order: 0 }],
        variants: [
          {
            sku: 'CP-SMR-84-18',
            designCode: 'MR-18',
            optionLabel: '8x4 ft / 18mm / Moisture Resistant MR',
            price: 285000,
            mrp: 340000,
            stock: 120,
            weightGrams: 34000,
            moq: 2,
            attributes: { thickness: '18mm', grade: 'MR', size: '8x4 ft' },
          },
          {
            sku: 'CP-SMR-84-12',
            designCode: 'MR-12',
            optionLabel: '8x4 ft / 12mm / Moisture Resistant MR',
            price: 195000,
            mrp: 235000,
            stock: 110,
            weightGrams: 22000,
            moq: 2,
            attributes: { thickness: '12mm', grade: 'MR', size: '8x4 ft' },
          },
        ],
      },
      // 10. CenturyPly Sainik 710 BWR
      {
        name: 'CenturyPly Sainik 710 Waterproof BWR Plywood',
        slug: 'centuryply-sainik-710-waterproof-bwr',
        categorySlug: 'waterproof-bwr',
        brandSlug: 'centuryply',
        description: 'Economical genuine waterproof plywood with 8-year warranty, bonded with phenol formaldehyde synthetic resin.',
        hsnCode: '44123100',
        gstRate: 18,
        unit: 'sheet',
        isHeavy: 1,
        images: [{ path: '/images/products/century-sainik-710.webp', alt: 'Century Sainik 710', sort_order: 0 }],
        variants: [
          {
            sku: 'CP-BWR-84-19',
            designCode: 'BWR-19',
            optionLabel: '8x4 ft / 19mm / BWR Waterproof',
            price: 365000,
            mrp: 420000,
            stock: 95,
            weightGrams: 35000,
            moq: 2,
            attributes: { thickness: '19mm', grade: 'BWR', size: '8x4 ft' },
          },
        ],
      },
      // 11. Greenlam Marine Grade Plywood
      {
        name: 'Greenlam Mikasa Marine BWP Plywood',
        slug: 'greenlam-mikasa-marine-bwp-plywood',
        categorySlug: 'marine-bwp',
        brandSlug: 'greenlam',
        description: 'Hardwood core marine grade plywood treated with vacuum pressure impregnation for all-weather wet-area durability.',
        hsnCode: '44123100',
        gstRate: 18,
        unit: 'sheet',
        isHeavy: 1,
        images: [{ path: '/images/products/greenlam-marine.webp', alt: 'Greenlam Marine Plywood', sort_order: 0 }],
        variants: [
          {
            sku: 'GL-BWP-84-19',
            designCode: 'GL-19',
            optionLabel: '8x4 ft / 19mm / Marine Hardwood BWP',
            price: 450000,
            mrp: 530000,
            stock: 60,
            weightGrams: 37000,
            moq: 2,
            attributes: { thickness: '19mm', grade: 'BWP', size: '8x4 ft' },
          },
        ],
      },
      // 12. CenturyPly Fire Retardant Architect Ply
      {
        name: 'CenturyPly Architect Marine Fire-Retardant Plywood',
        slug: 'centuryply-architect-fire-retardant',
        categorySlug: 'marine-bwp',
        brandSlug: 'centuryply',
        description: 'Premium IS:5509 fire-retardant marine plywood engineered with low flammability nano-chemical infusion.',
        hsnCode: '44123100',
        gstRate: 18,
        unit: 'sheet',
        isHeavy: 1,
        images: [{ path: '/images/products/century-architect.webp', alt: 'Century Architect Ply', sort_order: 0 }],
        variants: [
          {
            sku: 'CP-ARC-84-19',
            designCode: 'ARC-19',
            optionLabel: '8x4 ft / 19mm / Fire Retardant BWP',
            price: 540000,
            mrp: 640000,
            stock: 30,
            weightGrams: 38000,
            moq: 2,
            attributes: { thickness: '19mm', grade: 'Marine', size: '8x4 ft' },
          },
        ],
      },
      // 13. Godrej Mortise Door Handle Set - Satin Steel
      {
        name: 'Godrej Nav-Tal Classic Mortise Door Handle Set',
        slug: 'godrej-nav-tal-mortise-door-handle',
        categorySlug: 'mortise-handles',
        brandSlug: 'godrej',
        description: 'Heavy brass mortise handle set with 6-lever double action deadbolt lock mechanism and brushed satin stainless steel finish.',
        hsnCode: '83024110',
        gstRate: 18,
        unit: 'set',
        isHeavy: 0,
        images: [{ path: '/images/products/godrej-mortise-satin.webp', alt: 'Godrej Mortise Handle', sort_order: 0 }],
        variants: [
          {
            sku: 'GD-MH-SS-01',
            designCode: 'GD-801',
            optionLabel: 'Double Turn / Satin Stainless Steel',
            price: 245000, // ₹2,450.00
            mrp: 310000,
            stock: 50,
            weightGrams: 1800,
            moq: 1,
            attributes: { finish: 'Satin Steel', material: 'Brass', lockType: '6-Lever' },
          },
          {
            sku: 'GD-MH-AB-01',
            designCode: 'GD-802',
            optionLabel: 'Double Turn / Antique Brass Finish',
            price: 275000,
            mrp: 345000,
            stock: 30,
            weightGrams: 1800,
            moq: 1,
            attributes: { finish: 'Antique Brass', material: 'Brass', lockType: '6-Lever' },
          },
        ],
      },
      // 14. Dorset Slimline Designer Mortise Handle
      {
        name: 'Dorset Slimline Architectural Mortise Handle',
        slug: 'dorset-slimline-mortise-handle',
        categorySlug: 'mortise-handles',
        brandSlug: 'dorset',
        description: 'Modern minimalist zinc alloy mortise lever with electroplated matte black finish, certified for 200,000 opening cycles.',
        hsnCode: '83024110',
        gstRate: 18,
        unit: 'set',
        isHeavy: 0,
        images: [{ path: '/images/products/dorset-slimline.webp', alt: 'Dorset Slimline Handle', sort_order: 0 }],
        variants: [
          {
            sku: 'DR-MH-MB-02',
            designCode: 'DR-910',
            optionLabel: 'Keyhole Plate / Matt Black',
            price: 320000,
            mrp: 395000,
            stock: 45,
            weightGrams: 1600,
            moq: 1,
            attributes: { finish: 'Matt Black', material: 'Zinc Alloy', lockType: 'Euro Cylinder' },
          },
        ],
      },
      // 15. Godrej Luxury Brass Cabinet Knobs (Pack of 4)
      {
        name: 'Godrej Solid Brass Concave Cabinet Knobs',
        slug: 'godrej-brass-concave-cabinet-knobs',
        categorySlug: 'cabinet-knobs',
        brandSlug: 'godrej',
        description: 'Solid forged brass cabinet and drawer knobs with anti-tarnish protective lacquer coat. Sold as a pack of 4.',
        hsnCode: '83024110',
        gstRate: 18,
        unit: 'piece',
        isHeavy: 0,
        images: [{ path: '/images/products/godrej-knobs.webp', alt: 'Godrej Brass Knobs', sort_order: 0 }],
        variants: [
          {
            sku: 'GD-KB-GLD-04',
            designCode: 'KB-201',
            optionLabel: '32mm Diameter / Brushed Gold (Pack of 4)',
            price: 110000, // ₹1,100.00
            mrp: 145000,
            stock: 120,
            weightGrams: 480,
            moq: 1,
            attributes: { finish: 'Brushed Gold', material: 'Brass', diameter: '32mm' },
          },
        ],
      },
      // 16. Dorset Heavy Main Door Pull Handle 18 inch
      {
        name: 'Dorset Grande Main Door Pull Handle 18 Inch',
        slug: 'dorset-grande-main-door-pull-handle',
        categorySlug: 'pull-handles',
        brandSlug: 'dorset',
        description: 'Stately 450mm (18 inch) solid stainless steel AISI-304 pull handle for heavy wooden front entrance doors.',
        hsnCode: '83024110',
        gstRate: 18,
        unit: 'piece',
        isHeavy: 0,
        images: [{ path: '/images/products/dorset-pull-grande.webp', alt: 'Dorset Grande Pull Handle', sort_order: 0 }],
        variants: [
          {
            sku: 'DR-PH-SS-18',
            designCode: 'PH-450',
            optionLabel: '450mm Length / Satin Stainless Steel',
            price: 385000,
            mrp: 475000,
            stock: 25,
            weightGrams: 2400,
            moq: 1,
            attributes: { finish: 'Satin Steel', material: 'Stainless Steel 304', length: '450mm' },
          },
          {
            sku: 'DR-PH-RG-18',
            designCode: 'PH-451',
            optionLabel: '450mm Length / Rose Gold PVD',
            price: 460000,
            mrp: 560000,
            stock: 20,
            weightGrams: 2400,
            moq: 1,
            attributes: { finish: 'Rose Gold', material: 'Stainless Steel 304', length: '450mm' },
          },
        ],
      },
      // 17. Godrej Sleek Profile Concealed Pull Handle
      {
        name: 'Godrej Concealed Edge Profile Wardrobe Handle',
        slug: 'godrej-concealed-profile-handle',
        categorySlug: 'pull-handles',
        brandSlug: 'godrej',
        description: 'Aluminum continuous edge j-pull profile handle for seamless floor-to-ceiling wardrobe shutters.',
        hsnCode: '83024110',
        gstRate: 18,
        unit: 'piece',
        isHeavy: 0,
        images: [{ path: '/images/products/godrej-profile.webp', alt: 'Godrej Profile Handle', sort_order: 0 }],
        variants: [
          {
            sku: 'GD-PRF-BLK-8',
            designCode: 'PRF-8FT',
            optionLabel: '8 ft Length / Anodized Black',
            price: 135000,
            mrp: 175000,
            stock: 70,
            weightGrams: 1100,
            moq: 2,
            attributes: { finish: 'Matt Black', material: 'Anodized Aluminum', length: '8 ft' },
          },
        ],
      },
      // 18. Charcoal Louvers Wave Panel
      {
        name: 'DecoCraft Charcoal Louver Acoustic Wall Panel',
        slug: 'decocraft-charcoal-louver-wall-panel',
        categorySlug: 'charcoal-louvers',
        brandSlug: 'royale-touche',
        description: 'Polystyrene charcoal louver panel engineered with sound dampening ribs and realistic wooden texture for living room media walls.',
        hsnCode: '39269099',
        gstRate: 18,
        unit: 'piece',
        isHeavy: 0,
        images: [{ path: '/images/products/charcoal-louver-walnut.webp', alt: 'Charcoal Louvers Walnut', sort_order: 0 }],
        variants: [
          {
            sku: 'RT-CL-96-WLT',
            designCode: 'CL-101',
            optionLabel: '9.5 x 0.5 ft / American Walnut',
            price: 125000, // ₹1,250.00
            mrp: 160000,
            stock: 150,
            weightGrams: 2100,
            moq: 4,
            attributes: { finish: 'Textured', thickness: '12mm', material: 'Charcoal Polystyrene', color: 'Walnut' },
          },
          {
            sku: 'RT-CL-96-OAK',
            designCode: 'CL-102',
            optionLabel: '9.5 x 0.5 ft / Golden Oak',
            price: 125000,
            mrp: 160000,
            stock: 130,
            weightGrams: 2100,
            moq: 4,
            attributes: { finish: 'Textured', thickness: '12mm', material: 'Charcoal Polystyrene', color: 'Golden Oak' },
          },
        ],
      },
      // 19. Fluted Charcoal Accent Slat Panel
      {
        name: 'DecoCraft Fluted Charcoal Accent Wall Slat',
        slug: 'decocraft-fluted-charcoal-accent-slat',
        categorySlug: 'fluted-panels',
        brandSlug: 'royale-touche',
        description: 'Deep fluted V-groove architectural wall cladding slats with anti-scratch coating and moisture immunity.',
        hsnCode: '39269099',
        gstRate: 18,
        unit: 'piece',
        isHeavy: 0,
        images: [{ path: '/images/products/fluted-charcoal-charcoal.webp', alt: 'Fluted Panel Slat', sort_order: 0 }],
        variants: [
          {
            sku: 'RT-FP-96-BLK',
            designCode: 'FP-201',
            optionLabel: '9.5 x 0.4 ft / Midnight Black Fluted',
            price: 115000,
            mrp: 150000,
            stock: 140,
            weightGrams: 1900,
            moq: 4,
            attributes: { finish: 'Matte', thickness: '10mm', material: 'Charcoal Polystyrene', color: 'Midnight Black' },
          },
        ],
      },
      // 20. WPC Exterior Fluted Cladding
      {
        name: 'Merino TimberCraft WPC Exterior Fluted Cladding',
        slug: 'merino-timbercraft-wpc-exterior-fluted',
        categorySlug: 'fluted-panels',
        brandSlug: 'merino',
        description: 'Wood-plastic composite (WPC) co-extruded outdoor fluted cladding with 15-year weather-proof and rot resistance warranty.',
        hsnCode: '39269099',
        gstRate: 18,
        unit: 'piece',
        isHeavy: 1,
        images: [{ path: '/images/products/merino-wpc-fluted.webp', alt: 'WPC Exterior Fluted', sort_order: 0 }],
        variants: [
          {
            sku: 'MR-WPC-96-TEAK',
            designCode: 'WPC-801',
            optionLabel: '9.5 x 0.7 ft / Natural Teak WPC',
            price: 195000,
            mrp: 245000,
            stock: 80,
            weightGrams: 5200,
            moq: 2,
            attributes: { finish: 'Textured', thickness: '26mm', material: 'WPC Composite', color: 'Natural Teak' },
          },
        ],
      },
      // 21. Merino Sparkle Acrylic Laminate
      {
        name: 'Merino High Gloss Acrylic Sparkle Laminate',
        slug: 'merino-high-gloss-sparkle-laminate',
        categorySlug: '1mm-premium',
        brandSlug: 'merino',
        description: 'Mirror-finish 1.5mm acrylic laminate with subtle metallic sparkle flecks for ultra-modern kitchen cabinets.',
        hsnCode: '48239090',
        gstRate: 18,
        unit: 'sheet',
        isHeavy: 0,
        images: [{ path: '/images/products/merino-sparkle.webp', alt: 'Merino Sparkle Acrylic', sort_order: 0 }],
        variants: [
          {
            sku: 'MR-ACR-84-15-W',
            designCode: '7011',
            optionLabel: '8x4 ft / 1.5mm / Crystal White Sparkle',
            price: 285000,
            mrp: 350000,
            stock: 40,
            weightGrams: 5100,
            moq: 1,
            attributes: { thickness: '1.5mm', finish: 'Gloss', size: '8x4 ft', color: 'White Sparkle' },
          },
        ],
      },
      // 22. Dorset Square Architectural Cabinet Knobs
      {
        name: 'Dorset Quadro Solid Zinc Cabinet Knobs',
        slug: 'dorset-quadro-zinc-cabinet-knobs',
        categorySlug: 'cabinet-knobs',
        brandSlug: 'dorset',
        description: 'Geometric square profile cabinet knobs crafted from high-tensile zinc with dual-tone brushed chrome and black border.',
        hsnCode: '83024110',
        gstRate: 18,
        unit: 'piece',
        isHeavy: 0,
        images: [{ path: '/images/products/dorset-knob-quadro.webp', alt: 'Dorset Quadro Knob', sort_order: 0 }],
        variants: [
          {
            sku: 'DR-KB-CHR-01',
            designCode: 'KB-305',
            optionLabel: '28x28mm / Satin Chrome & Black',
            price: 85000, // ₹850.00
            mrp: 115000,
            stock: 90,
            weightGrams: 220,
            moq: 2,
            attributes: { finish: 'Satin Steel', material: 'Zinc Alloy', size: '28mm' },
          },
        ],
      },
    ];

    const insertProduct = database.prepare(`
      INSERT INTO products (category_id, brand_id, name, slug, description, hsn_code, gst_rate, unit, is_heavy, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(slug) DO UPDATE SET
        category_id = excluded.category_id,
        brand_id = excluded.brand_id,
        name = excluded.name,
        description = excluded.description,
        hsn_code = excluded.hsn_code,
        gst_rate = excluded.gst_rate,
        unit = excluded.unit,
        is_heavy = excluded.is_heavy
    `);

    const insertVariant = database.prepare(`
      INSERT INTO product_variants (product_id, sku, design_code, option_label, price, mrp, stock, weight_grams, moq, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(sku) DO UPDATE SET
        product_id = excluded.product_id,
        design_code = excluded.design_code,
        option_label = excluded.option_label,
        price = excluded.price,
        mrp = excluded.mrp,
        stock = excluded.stock,
        weight_grams = excluded.weight_grams,
        moq = excluded.moq
    `);

    const insertAttr = database.prepare(`
      INSERT INTO variant_attributes (variant_id, key, value)
      VALUES (?, ?, ?)
      ON CONFLICT(variant_id, key) DO UPDATE SET value = excluded.value
    `);

    const insertImage = database.prepare(`
      INSERT INTO product_images (product_id, variant_id, path, alt, sort_order)
      VALUES (?, NULL, ?, ?, ?)
    `);

    const insertPriceTier = database.prepare(`
      INSERT INTO price_tiers (variant_id, role, min_qty, price)
      VALUES (?, ?, ?, ?)
    `);

    for (const p of productsData) {
      const categoryId = catMap.get(p.categorySlug);
      if (!categoryId) {
        throw new Error(`Category not found for slug: ${p.categorySlug}`);
      }
      const brandId = brandMap.get(p.brandSlug) || null;

      insertProduct.run(categoryId, brandId, p.name, p.slug, p.description, p.hsnCode, p.gstRate, p.unit, p.isHeavy);
      const productRow = database.prepare('SELECT id FROM products WHERE slug = ?').get(p.slug) as { id: number };
      const productId = productRow.id;

      // Clear existing images for clean re-seed
      database.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
      for (const img of p.images) {
        insertImage.run(productId, img.path, img.alt, img.sort_order);
      }

      for (const v of p.variants) {
        insertVariant.run(productId, v.sku, v.designCode || null, v.optionLabel, v.price, v.mrp || null, v.stock, v.weightGrams, v.moq);
        const variantRow = database.prepare('SELECT id FROM product_variants WHERE sku = ?').get(v.sku) as { id: number };
        const variantId = variantRow.id;

        // Attributes
        for (const [key, val] of Object.entries(v.attributes)) {
          insertAttr.run(variantId, key, val);
        }

        // Price Tiers
        if (v.priceTiers && v.priceTiers.length > 0) {
          database.prepare('DELETE FROM price_tiers WHERE variant_id = ?').run(variantId);
          for (const pt of v.priceTiers) {
            insertPriceTier.run(variantId, pt.role, pt.minQty, pt.price);
          }
        }
      }
    }

    // 6. Pincodes
    const pincodes = [
      // Gujarat intra-state
      { pincode: '380001', city: 'Ahmedabad', state: 'Gujarat', is_serviceable: 1, delivery_days: 2, base_charge: 15000, heavy_charge_per_unit: 10000, cod_allowed: 1 },
      { pincode: '395001', city: 'Surat', state: 'Gujarat', is_serviceable: 1, delivery_days: 2, base_charge: 15000, heavy_charge_per_unit: 10000, cod_allowed: 1 },
      { pincode: '390001', city: 'Vadodara', state: 'Gujarat', is_serviceable: 1, delivery_days: 2, base_charge: 15000, heavy_charge_per_unit: 10000, cod_allowed: 1 },
      // Inter-state Metros
      { pincode: '400001', city: 'Mumbai', state: 'Maharashtra', is_serviceable: 1, delivery_days: 4, base_charge: 35000, heavy_charge_per_unit: 25000, cod_allowed: 1 },
      { pincode: '110001', city: 'Delhi', state: 'Delhi', is_serviceable: 1, delivery_days: 5, base_charge: 50000, heavy_charge_per_unit: 35000, cod_allowed: 1 },
      { pincode: '560001', city: 'Bengaluru', state: 'Karnataka', is_serviceable: 1, delivery_days: 5, base_charge: 50000, heavy_charge_per_unit: 35000, cod_allowed: 1 },
      // Unserviceable
      { pincode: '999999', city: 'Remote Border Area', state: 'Other', is_serviceable: 0, delivery_days: 0, base_charge: 0, heavy_charge_per_unit: 0, cod_allowed: 0 },
    ];

    const insertPincode = database.prepare(`
      INSERT INTO pincodes (pincode, city, state, is_serviceable, delivery_days, base_charge, heavy_charge_per_unit, cod_allowed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(pincode) DO UPDATE SET
        city = excluded.city,
        state = excluded.state,
        is_serviceable = excluded.is_serviceable,
        delivery_days = excluded.delivery_days,
        base_charge = excluded.base_charge,
        heavy_charge_per_unit = excluded.heavy_charge_per_unit,
        cod_allowed = excluded.cod_allowed
    `);

    for (const pin of pincodes) {
      insertPincode.run(
        pin.pincode,
        pin.city,
        pin.state,
        pin.is_serviceable,
        pin.delivery_days,
        pin.base_charge,
        pin.heavy_charge_per_unit,
        pin.cod_allowed
      );
    }
  });

  runSeed();

  // 7. Rebuild FTS5 index
  rebuildProductSearch(database);

  console.log('[seed] Seeding complete! Populated admin, settings, categories, brands, products, pincodes, and rebuilt FTS5 search index.');
}

// CLI execution
if (require.main === module || (process.argv[1] && process.argv[1].includes('seed'))) {
  try {
    seedDatabase();
    if (!process.env.KEEP_DB_OPEN) {
      closeDb();
    }
  } catch (err) {
    console.error('[seed] Error seeding database:', err);
    process.exit(1);
  }
}

import type { Database as DatabaseType } from 'better-sqlite3';

/**
 * Synchronizes a single product into the FTS5 product_search virtual table.
 */
export function syncProductSearch(db: DatabaseType, productId: number): void {
  // Query product data
  const product = db
    .prepare(
      `
      SELECT
        p.id,
        p.name,
        p.description,
        p.is_active,
        COALESCE(b.name, '') AS brand,
        COALESCE(c.name, '') AS category
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `
    )
    .get(productId) as
    | {
        id: number;
        name: string;
        description: string | null;
        is_active: number;
        brand: string;
        category: string;
      }
    | undefined;

  // Always delete existing FTS index entry for this product ID
  db.prepare(`DELETE FROM product_search WHERE rowid = ?`).run(productId);

  if (!product || product.is_active !== 1) {
    return;
  }

  // Get all active variant design codes
  const variants = db
    .prepare(
      `
      SELECT design_code, sku
      FROM product_variants
      WHERE product_id = ? AND is_active = 1
    `
    )
    .all(productId) as { design_code: string | null; sku: string }[];

  const designCodes = Array.from(
    new Set(
      variants
        .flatMap((v) => [v.design_code, v.sku])
        .filter((code): code is string => Boolean(code && code.trim()))
    )
  ).join(' ');

  db.prepare(
    `
    INSERT INTO product_search(rowid, name, brand, category, design_codes, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  ).run(
    product.id,
    product.name,
    product.brand,
    product.category,
    designCodes,
    product.description || ''
  );
}

/**
 * Rebuilds the entire FTS5 product_search table from all active products.
 */
export function rebuildProductSearch(db: DatabaseType): void {
  const syncAll = db.transaction(() => {
    db.exec(`DELETE FROM product_search;`);

    db.exec(`
      INSERT INTO product_search(rowid, name, brand, category, design_codes, description)
      SELECT
        p.id,
        p.name,
        COALESCE(b.name, ''),
        c.name,
        COALESCE((
          SELECT GROUP_CONCAT(COALESCE(pv.design_code, '') || ' ' || COALESCE(pv.sku, ''), ' ')
          FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.is_active = 1
        ), ''),
        COALESCE(p.description, '')
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1;
    `);

    try {
      db.exec(`INSERT INTO product_search(product_search) VALUES('rebuild');`);
    } catch (_) {}
  });

  syncAll();
}

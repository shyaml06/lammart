import type { Database as DatabaseType } from 'better-sqlite3';
import { getDb } from '../../db/client';
import { CategoryRepository } from './category.repository';
import type {
  Product,
  ProductVariant,
  ProductImage,
  PriceTier,
  PaginatedResponse,
  Category,
  Brand,
} from '@lammart/shared';

export interface ProductListParams {
  category?: string;
  brand?: string;
  q?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'name_asc';
  page?: number;
  limit?: number;
  [key: string]: any;
}

export interface SearchSuggestion {
  type: 'product' | 'design_code' | 'brand';
  title: string;
  slug: string;
  subtitle?: string;
}

export class ProductRepository {
  private categoryRepo: CategoryRepository;

  constructor(private customDb?: DatabaseType) {
    this.categoryRepo = new CategoryRepository(customDb);
  }

  private get db(): DatabaseType {
    return this.customDb || getDb();
  }

  /**
   * Lists products with filtering, search, sorting, and pagination.
   */
  listProducts(params: ProductListParams): PaginatedResponse<Product> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 24));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['p.is_active = 1'];
    const sqlParams: any[] = [];

    // 1. Category filter (supports slug or ID, including descendants)
    if (params.category) {
      const catIds = this.categoryRepo.getCategoryWithDescendantIds(params.category);
      if (catIds.length === 0) {
        return {
          data: [],
          page,
          limit,
          total: 0,
          totalPages: 0,
        };
      }
      const placeholders = catIds.map(() => '?').join(',');
      whereClauses.push(`p.category_id IN (${placeholders})`);
      sqlParams.push(...catIds);
    }

    // 2. Brand filter (supports slug or ID)
    if (params.brand) {
      if (/^\d+$/.test(params.brand)) {
        whereClauses.push(`p.brand_id = ?`);
        sqlParams.push(parseInt(params.brand, 10));
      } else {
        whereClauses.push(`p.brand_id IN (SELECT id FROM brands WHERE slug = ?)`);
        sqlParams.push(params.brand);
      }
    }

    // 3. Full-Text Search (FTS5 + design code lookup)
    if (params.q && params.q.trim()) {
      const rawQ = params.q.trim();
      const tokens = rawQ
        .replace(/["*]/g, '')
        .split(/\s+/)
        .filter((t) => t.length > 0)
        .map((t) => `"${t}"*`)
        .join(' ');

      let matchedProductIds: number[] = [];

      // FTS5 query
      if (tokens.length > 0) {
        try {
          const ftsRows = this.db
            .prepare(`SELECT rowid FROM product_search WHERE product_search MATCH ? LIMIT 100`)
            .all(tokens) as { rowid: number }[];
          matchedProductIds.push(...ftsRows.map((r) => r.rowid));
        } catch (_) {
          // If FTS5 token parsing fails, fallback to LIKE on name
          const likeRows = this.db
            .prepare(`SELECT id FROM products WHERE name LIKE ? AND is_active = 1 LIMIT 100`)
            .all(`%${rawQ}%`) as { id: number }[];
          matchedProductIds.push(...likeRows.map((r) => r.id));
        }
      }

      // Exact/prefix match on variant design_code or SKU
      const codeRows = this.db
        .prepare(
          `SELECT DISTINCT product_id FROM product_variants WHERE (design_code LIKE ? OR sku LIKE ?) AND is_active = 1 LIMIT 50`
        )
        .all(`%${rawQ}%`, `%${rawQ}%`) as { product_id: number }[];
      matchedProductIds.push(...codeRows.map((r) => r.product_id));

      matchedProductIds = Array.from(new Set(matchedProductIds));

      if (matchedProductIds.length === 0) {
        return {
          data: [],
          page,
          limit,
          total: 0,
          totalPages: 0,
        };
      }

      const idPlaceholders = matchedProductIds.map(() => '?').join(',');
      whereClauses.push(`p.id IN (${idPlaceholders})`);
      sqlParams.push(...matchedProductIds);
    }

    // 4. Dynamic Attribute Filters (e.g., finish=Matte, thickness=1.0mm)
    const reservedKeys = new Set(['category', 'brand', 'q', 'sort', 'page', 'limit']);
    for (const [key, value] of Object.entries(params)) {
      if (reservedKeys.has(key) || !value || typeof value !== 'string') continue;

      whereClauses.push(`
        p.id IN (
          SELECT pv.product_id
          FROM product_variants pv
          JOIN variant_attributes va ON va.variant_id = pv.id
          WHERE va.key = ? AND va.value = ? AND pv.is_active = 1
        )
      `);
      sqlParams.push(key, value);
    }

    const whereSql = whereClauses.join(' AND ');

    // 5. Total count
    const countSql = `SELECT COUNT(*) AS total FROM products p WHERE ${whereSql}`;
    const totalRow = this.db.prepare(countSql).get(...sqlParams) as { total: number };
    const total = totalRow ? totalRow.total : 0;
    const totalPages = Math.ceil(total / limit);

    if (total === 0) {
      return {
        data: [],
        page,
        limit,
        total: 0,
        totalPages: 0,
      };
    }

    // 6. Sorting
    let orderBySql = 'p.id DESC';
    if (params.sort === 'price_asc') {
      orderBySql = 'from_price ASC, p.id DESC';
    } else if (params.sort === 'price_desc') {
      orderBySql = 'from_price DESC, p.id DESC';
    } else if (params.sort === 'newest') {
      orderBySql = 'p.created_at DESC, p.id DESC';
    } else if (params.sort === 'name_asc') {
      orderBySql = 'p.name ASC';
    }

    // 7. Query products page with from_price subquery
    const productsSql = `
      SELECT
        p.id,
        p.category_id,
        p.brand_id,
        p.name,
        p.slug,
        p.description,
        p.hsn_code,
        p.gst_rate,
        p.unit,
        p.is_heavy,
        p.is_active,
        p.created_at,
        p.updated_at,
        (
          SELECT MIN(pv.price)
          FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.is_active = 1
        ) AS from_price,
        c.name AS category_name,
        c.slug AS category_slug,
        b.name AS brand_name,
        b.slug AS brand_slug,
        b.logo AS brand_logo
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      WHERE ${whereSql}
      ORDER BY ${orderBySql}
      LIMIT ? OFFSET ?
    `;

    const productRows = this.db.prepare(productsSql).all(...sqlParams, limit, offset) as any[];

    // Fetch images and variants for these products
    const productIds = productRows.map((p) => p.id);
    const imagesByProduct = this.getImagesForProductIds(productIds);
    const variantsByProduct = this.getVariantsForProductIds(productIds);

    const data: Product[] = productRows.map((r) => {
      const category: Category = {
        id: r.category_id,
        parentId: null,
        name: r.category_name,
        slug: r.category_slug,
        sortOrder: 0,
        isActive: true,
      };

      const brand: Brand | undefined = r.brand_id
        ? {
            id: r.brand_id,
            name: r.brand_name,
            slug: r.brand_slug,
            logo: r.brand_logo || undefined,
          }
        : undefined;

      return {
        id: r.id,
        categoryId: r.category_id,
        brandId: r.brand_id || null,
        name: r.name,
        slug: r.slug,
        description: r.description || undefined,
        hsnCode: r.hsn_code || undefined,
        gstRate: r.gst_rate,
        unit: r.unit,
        isHeavy: Boolean(r.is_heavy),
        isActive: Boolean(r.is_active),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        fromPrice: r.from_price !== null ? Number(r.from_price) : undefined,
        category,
        brand,
        images: imagesByProduct.get(r.id) || [],
        variants: variantsByProduct.get(r.id) || [],
      };
    });

    return {
      data,
      page,
      limit,
      total,
      totalPages,
    };
  }

  /**
   * Finds a product by its unique slug, including full details, variants, specs, and price tiers.
   */
  getProductBySlug(slug: string): Product | null {
    const row = this.db
      .prepare(
        `
        SELECT
          p.id,
          p.category_id,
          p.brand_id,
          p.name,
          p.slug,
          p.description,
          p.hsn_code,
          p.gst_rate,
          p.unit,
          p.is_heavy,
          p.is_active,
          p.created_at,
          p.updated_at,
          (
            SELECT MIN(pv.price)
            FROM product_variants pv
            WHERE pv.product_id = p.id AND pv.is_active = 1
          ) AS from_price,
          c.name AS category_name,
          c.slug AS category_slug,
          b.name AS brand_name,
          b.slug AS brand_slug,
          b.logo AS brand_logo
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN brands b ON b.id = p.brand_id
        WHERE p.slug = ? AND p.is_active = 1
      `
      )
      .get(slug) as any;

    if (!row) return null;

    const category: Category = {
      id: row.category_id,
      parentId: null,
      name: row.category_name,
      slug: row.category_slug,
      sortOrder: 0,
      isActive: true,
    };

    const brand: Brand | undefined = row.brand_id
      ? {
          id: row.brand_id,
          name: row.brand_name,
          slug: row.brand_slug,
          logo: row.brand_logo || undefined,
        }
      : undefined;

    const images = this.getImagesForProductIds([row.id]).get(row.id) || [];
    const variants = this.getFullVariantsForProductId(row.id);

    return {
      id: row.id,
      categoryId: row.category_id,
      brandId: row.brand_id || null,
      name: row.name,
      slug: row.slug,
      description: row.description || undefined,
      hsnCode: row.hsn_code || undefined,
      gstRate: row.gst_rate,
      unit: row.unit,
      isHeavy: Boolean(row.is_heavy),
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      fromPrice: row.from_price !== null ? Number(row.from_price) : undefined,
      category,
      brand,
      images,
      variants,
    };
  }

  /**
   * Search autocomplete querying FTS5, design codes, and brands.
   */
  getSearchSuggestions(query: string): SearchSuggestion[] {
    const q = (query || '').trim();
    if (q.length < 2) return [];

    const suggestions: SearchSuggestion[] = [];
    const seenKeys = new Set<string>();

    // 1. Direct design_code or SKU prefix/match
    const variantMatches = this.db
      .prepare(
        `
        SELECT pv.design_code, pv.sku, p.name, p.slug
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        WHERE pv.is_active = 1 AND p.is_active = 1
          AND (pv.design_code LIKE ? OR pv.sku LIKE ?)
        LIMIT 5
      `
      )
      .all(`%${q}%`, `%${q}%`) as { design_code: string | null; sku: string; name: string; slug: string }[];

    for (const vm of variantMatches) {
      const code = vm.design_code || vm.sku;
      const key = `design_code:${code}:${vm.slug}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        suggestions.push({
          type: 'design_code',
          title: `Design #${code}`,
          slug: vm.slug,
          subtitle: vm.name,
        });
      }
    }

    // 2. Brand match
    const brandMatches = this.db
      .prepare(`SELECT name, slug FROM brands WHERE name LIKE ? LIMIT 3`)
      .all(`%${q}%`) as { name: string; slug: string }[];

    for (const bm of brandMatches) {
      const key = `brand:${bm.slug}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        suggestions.push({
          type: 'brand',
          title: bm.name,
          slug: `/c?brand=${bm.slug}`,
          subtitle: 'Brand',
        });
      }
    }

    // 3. FTS5 product search match
    try {
      const tokens = q
        .replace(/["*]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => `"${t}"*`)
        .join(' ');

      if (tokens) {
        const ftsMatches = this.db
          .prepare(
            `
            SELECT p.id, p.name, p.slug, c.name AS category_name
            FROM product_search ps
            JOIN products p ON p.id = ps.rowid
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE ps.product_search MATCH ? AND p.is_active = 1
            LIMIT 8
          `
          )
          .all(tokens) as { id: number; name: string; slug: string; category_name: string }[];

        for (const pm of ftsMatches) {
          const key = `product:${pm.slug}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            suggestions.push({
              type: 'product',
              title: pm.name,
              slug: pm.slug,
              subtitle: pm.category_name,
            });
          }
        }
      }
    } catch (_) {}

    return suggestions.slice(0, 10);
  }

  /**
   * Aggregates dynamic attribute filters (e.g. thickness, finish, grade) and counts for a category.
   */
  getFilterAggregations(categoryIdentifier?: string | number): Record<string, { value: string; count: number }[]> {
    let whereSql = 'p.is_active = 1 AND pv.is_active = 1';
    const params: any[] = [];

    if (categoryIdentifier) {
      const catIds = this.categoryRepo.getCategoryWithDescendantIds(categoryIdentifier);
      if (catIds.length === 0) {
        return {};
      }
      const placeholders = catIds.map(() => '?').join(',');
      whereSql += ` AND p.category_id IN (${placeholders})`;
      params.push(...catIds);
    }

    const rows = this.db
      .prepare(
        `
        SELECT va.key, va.value, COUNT(DISTINCT p.id) AS count
        FROM variant_attributes va
        JOIN product_variants pv ON pv.id = va.variant_id
        JOIN products p ON p.id = pv.product_id
        WHERE ${whereSql}
        GROUP BY va.key, va.value
        ORDER BY va.key ASC, count DESC, va.value ASC
      `
      )
      .all(...params) as { key: string; value: string; count: number }[];

    const result: Record<string, { value: string; count: number }[]> = {};

    for (const r of rows) {
      if (!result[r.key]) {
        result[r.key] = [];
      }
      result[r.key].push({
        value: r.value,
        count: Number(r.count),
      });
    }

    return result;
  }

  // Helper: batch fetch images
  private getImagesForProductIds(productIds: number[]): Map<number, ProductImage[]> {
    const map = new Map<number, ProductImage[]>();
    if (productIds.length === 0) return map;

    const placeholders = productIds.map(() => '?').join(',');
    const rows = this.db
      .prepare(
        `
        SELECT id, product_id, variant_id, path, alt, sort_order
        FROM product_images
        WHERE product_id IN (${placeholders})
        ORDER BY sort_order ASC
      `
      )
      .all(...productIds) as any[];

    for (const r of rows) {
      if (!map.has(r.product_id)) {
        map.set(r.product_id, []);
      }
      map.get(r.product_id)!.push({
        id: r.id,
        productId: r.product_id,
        variantId: r.variant_id || undefined,
        path: r.path,
        alt: r.alt || undefined,
        sortOrder: r.sort_order,
      });
    }

    return map;
  }

  // Helper: batch fetch variants (summary)
  private getVariantsForProductIds(productIds: number[]): Map<number, ProductVariant[]> {
    const map = new Map<number, ProductVariant[]>();
    if (productIds.length === 0) return map;

    const placeholders = productIds.map(() => '?').join(',');
    const rows = this.db
      .prepare(
        `
        SELECT id, product_id, sku, design_code, option_label, price, mrp, stock, weight_grams, moq, is_active
        FROM product_variants
        WHERE product_id IN (${placeholders}) AND is_active = 1
        ORDER BY price ASC
      `
      )
      .all(...productIds) as any[];

    const variantIds = rows.map((r) => r.id);
    const attrRows =
      variantIds.length > 0
        ? (this.db
            .prepare(
              `SELECT variant_id, key, value FROM variant_attributes WHERE variant_id IN (${variantIds.map(() => '?').join(',')})`
            )
            .all(...variantIds) as { variant_id: number; key: string; value: string }[])
        : [];

    const attrsByVariant = new Map<number, Record<string, string>>();
    for (const a of attrRows) {
      if (!attrsByVariant.has(a.variant_id)) {
        attrsByVariant.set(a.variant_id, {});
      }
      attrsByVariant.get(a.variant_id)![a.key] = a.value;
    }

    for (const r of rows) {
      if (!map.has(r.product_id)) {
        map.set(r.product_id, []);
      }
      map.get(r.product_id)!.push({
        id: r.id,
        productId: r.product_id,
        sku: r.sku,
        designCode: r.design_code || undefined,
        optionLabel: r.option_label || undefined,
        price: r.price,
        mrp: r.mrp !== null ? r.mrp : undefined,
        stock: r.stock,
        weightGrams: r.weight_grams !== null ? r.weight_grams : undefined,
        moq: r.moq,
        isActive: Boolean(r.is_active),
        attributes: attrsByVariant.get(r.id) || {},
      });
    }

    return map;
  }

  // Helper: full variant details for single product including attributes and price tiers
  private getFullVariantsForProductId(productId: number): ProductVariant[] {
    const variantRows = this.db
      .prepare(
        `
        SELECT id, product_id, sku, design_code, option_label, price, mrp, stock, weight_grams, moq, is_active
        FROM product_variants
        WHERE product_id = ? AND is_active = 1
        ORDER BY price ASC
      `
      )
      .all(productId) as any[];

    if (variantRows.length === 0) return [];

    const variantIds = variantRows.map((v) => v.id);
    const placeholders = variantIds.map(() => '?').join(',');

    // Attributes
    const attrRows = this.db
      .prepare(
        `
        SELECT variant_id, key, value
        FROM variant_attributes
        WHERE variant_id IN (${placeholders})
      `
      )
      .all(...variantIds) as { variant_id: number; key: string; value: string }[];

    const attrsByVariant = new Map<number, Record<string, string>>();
    for (const a of attrRows) {
      if (!attrsByVariant.has(a.variant_id)) {
        attrsByVariant.set(a.variant_id, {});
      }
      attrsByVariant.get(a.variant_id)![a.key] = a.value;
    }

    // Price tiers
    const tierRows = this.db
      .prepare(
        `
        SELECT id, variant_id, role, min_qty, price
        FROM price_tiers
        WHERE variant_id IN (${placeholders})
        ORDER BY min_qty ASC
      `
      )
      .all(...variantIds) as any[];

    const tiersByVariant = new Map<number, PriceTier[]>();
    for (const t of tierRows) {
      if (!tiersByVariant.has(t.variant_id)) {
        tiersByVariant.set(t.variant_id, []);
      }
      tiersByVariant.get(t.variant_id)!.push({
        id: t.id,
        variantId: t.variant_id,
        role: t.role,
        minQty: t.min_qty,
        price: t.price,
      });
    }

    return variantRows.map((v) => ({
      id: v.id,
      productId: v.product_id,
      sku: v.sku,
      designCode: v.design_code || undefined,
      optionLabel: v.option_label || undefined,
      price: v.price,
      mrp: v.mrp !== null ? v.mrp : undefined,
      stock: v.stock,
      weightGrams: v.weight_grams !== null ? v.weight_grams : undefined,
      moq: v.moq,
      isActive: Boolean(v.is_active),
      attributes: attrsByVariant.get(v.id) || {},
      priceTiers: tiersByVariant.get(v.id) || [],
    }));
  }
}

import type { Database as DatabaseType } from 'better-sqlite3';
import { getDb } from '../../db/client';
import type { Category } from '@lammart/shared';

interface CategoryRow {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  sort_order: number;
  is_active: number;
}

export class CategoryRepository {
  constructor(private customDb?: DatabaseType) {}

  private get db(): DatabaseType {
    return this.customDb || getDb();
  }

  /**
   * Returns a nested tree of all active categories.
   */
  getCategoryTree(): Category[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, parent_id, name, slug, description, image, sort_order, is_active
        FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC, name ASC
      `
      )
      .all() as CategoryRow[];

    const categoryMap = new Map<number, Category>();
    const rootCategories: Category[] = [];

    // Map rows to Category objects
    for (const r of rows) {
      categoryMap.set(r.id, {
        id: r.id,
        parentId: r.parent_id,
        name: r.name,
        slug: r.slug,
        description: r.description || undefined,
        image: r.image || undefined,
        sortOrder: r.sort_order,
        isActive: Boolean(r.is_active),
        children: [],
      });
    }

    // Build hierarchy
    for (const cat of categoryMap.values()) {
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId)!.children!.push(cat);
      } else {
        rootCategories.push(cat);
      }
    }

    return rootCategories;
  }

  /**
   * Finds a category by slug.
   */
  findBySlug(slug: string): Category | null {
    const row = this.db
      .prepare(
        `
        SELECT id, parent_id, name, slug, description, image, sort_order, is_active
        FROM categories
        WHERE slug = ? AND is_active = 1
      `
      )
      .get(slug) as CategoryRow | undefined;

    if (!row) return null;

    return {
      id: row.id,
      parentId: row.parent_id,
      name: row.name,
      slug: row.slug,
      description: row.description || undefined,
      image: row.image || undefined,
      sortOrder: row.sort_order,
      isActive: Boolean(row.is_active),
    };
  }

  /**
   * Finds a category by ID.
   */
  findById(id: number): Category | null {
    const row = this.db
      .prepare(
        `
        SELECT id, parent_id, name, slug, description, image, sort_order, is_active
        FROM categories
        WHERE id = ? AND is_active = 1
      `
      )
      .get(id) as CategoryRow | undefined;

    if (!row) return null;

    return {
      id: row.id,
      parentId: row.parent_id,
      name: row.name,
      slug: row.slug,
      description: row.description || undefined,
      image: row.image || undefined,
      sortOrder: row.sort_order,
      isActive: Boolean(row.is_active),
    };
  }

  /**
   * Returns the IDs of the given category and all its descendant subcategories.
   */
  getCategoryWithDescendantIds(identifier: string | number): number[] {
    const category =
      typeof identifier === 'number'
        ? this.findById(identifier)
        : this.findBySlug(identifier);

    if (!category) return [];

    const allCategories = this.db
      .prepare(`SELECT id, parent_id FROM categories WHERE is_active = 1`)
      .all() as { id: number; parent_id: number | null }[];

    const resultIds = [category.id];
    const queue = [category.id];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = allCategories.filter((c) => c.parent_id === currentId);
      for (const child of children) {
        resultIds.push(child.id);
        queue.push(child.id);
      }
    }

    return resultIds;
  }
}

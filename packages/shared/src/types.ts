// ============================================
// Lammart — shared TypeScript types
// Used by both the API and the web frontend
// ============================================

// ── Category ────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
  productCount?: number;    // included when listing
}

// ── Product ─────────────────────────────────────
export interface Product {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  price: number;            // integer paise  (₹1 = 100)
  mrp: number;              // integer paise
  unit: string;             // sheet | sqft | piece | set | roll
  sku: string;
  brand: string;
  size: string;
  finish: string;
  thickness: string;
  imageUrl: string;
  isVisible: boolean;
  isInStock: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  images?: ProductImage[];
}

// ── Product Image ───────────────────────────────
export interface ProductImage {
  id: number;
  productId: number;
  url: string;
  altText: string;
  sortOrder: number;
}

// ── Admin User ──────────────────────────────────
export interface AdminUser {
  id: number;
  username: string;
  createdAt: string;
}

// ── API response wrappers ───────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  visibleProducts: number;
  outOfStockProducts: number;
}

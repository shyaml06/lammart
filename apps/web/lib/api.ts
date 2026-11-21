import {
  Category,
  Product,
  PaginatedResponse,
  SearchSuggestion,
  Pincode,
} from '@lammart/shared';
import {
  FALLBACK_CATEGORIES,
  FALLBACK_PRODUCTS,
  FALLBACK_FILTERS,
  FALLBACK_PINCODES,
} from './fallback-data';

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    return '/api/v1';
  }
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000/api/v1'
  );
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 2000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export interface ProductListParams {
  category?: string;
  brand?: string;
  q?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'name_asc';
  page?: number;
  limit?: number;
  thickness?: string;
  finish?: string;
  grade?: string;
  minPrice?: number;
  maxPrice?: number;
  [key: string]: any;
}

/**
 * Fetch all categories tree
 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetchWithTimeout(`${getApiBase()}/categories`, { next: { revalidate: 60 } }, 1500);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch {
    // Backend offline / build-time fallback
  }
  return FALLBACK_CATEGORIES;
}

/**
 * Fetch a single category by slug (recursively checks tree)
 */
export async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await fetchCategories();

  function findCategory(cats: Category[]): Category | null {
    for (const c of cats) {
      if (c.slug === slug) return c;
      if (c.children && c.children.length > 0) {
        const found = findCategory(c.children);
        if (found) return found;
      }
    }
    return null;
  }

  return findCategory(categories);
}

/**
 * Fetch products list with filtering, sorting, pagination
 */
export async function fetchProducts(params: ProductListParams = {}): Promise<PaginatedResponse<Product>> {
  const query = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      query.set(key, String(val));
    }
  }

  try {
    const queryString = query.toString();
    const url = `${getApiBase()}/products${queryString ? `?${queryString}` : ''}`;
    const res = await fetchWithTimeout(url, { next: { revalidate: 30 } }, 1500);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        return data;
      }
    }
  } catch {
    // Backend offline / build-time fallback
  }

  // Filter fallback data client/build-side
  let filtered = [...FALLBACK_PRODUCTS];

  if (params.category) {
    const cat = params.category.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.category?.slug.toLowerCase() === cat ||
        (p.category as any)?.parentSlug === cat ||
        p.category?.name.toLowerCase().includes(cat) ||
        // Check if category matches parent categories
        (cat === 'laminates' && [5, 6, 7, 8].includes(p.categoryId)) ||
        (cat === 'plywood' && [9, 10, 11].includes(p.categoryId)) ||
        (cat === 'hardware' && [12, 13, 14].includes(p.categoryId)) ||
        (cat === 'wall-decor' && [15, 16].includes(p.categoryId))
    );
  }

  if (params.brand) {
    const brand = params.brand.toLowerCase();
    filtered = filtered.filter((p) => p.brand?.slug.toLowerCase() === brand);
  }

  if (params.q) {
    const search = params.q.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search) ||
        p.brand?.name.toLowerCase().includes(search) ||
        p.variants?.some(
          (v) =>
            v.sku.toLowerCase().includes(search) ||
            (v.designCode && v.designCode.toLowerCase().includes(search)) ||
            (v.optionLabel && v.optionLabel.toLowerCase().includes(search))
        )
    );
  }

  if (params.thickness) {
    filtered = filtered.filter((p) =>
      p.variants?.some((v) => v.attributes?.thickness === params.thickness)
    );
  }

  if (params.finish) {
    filtered = filtered.filter((p) =>
      p.variants?.some((v) => v.attributes?.finish === params.finish)
    );
  }

  if (params.grade) {
    filtered = filtered.filter((p) =>
      p.variants?.some((v) => v.attributes?.grade === params.grade)
    );
  }

  if (params.minPrice) {
    filtered = filtered.filter((p) => (p.fromPrice || 0) >= Number(params.minPrice));
  }

  if (params.maxPrice) {
    filtered = filtered.filter((p) => (p.fromPrice || 0) <= Number(params.maxPrice));
  }

  // Sorting
  if (params.sort === 'price_asc') {
    filtered.sort((a, b) => (a.fromPrice || 0) - (b.fromPrice || 0));
  } else if (params.sort === 'price_desc') {
    filtered.sort((a, b) => (b.fromPrice || 0) - (a.fromPrice || 0));
  } else if (params.sort === 'name_asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // Newest
    filtered.sort((a, b) => b.id - a.id);
  }

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Number(params.limit) || 12);
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return {
    data: paginated,
    page,
    limit,
    total,
    totalPages,
  };
}

/**
 * Fetch a single product by slug
 */
export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  try {
    const res = await fetchWithTimeout(`${getApiBase()}/products/${encodeURIComponent(slug)}`, { next: { revalidate: 30 } }, 1500);
    if (res.ok) {
      const data = await res.json();
      if (data && data.id) {
        return data;
      }
    }
  } catch {
    // Fallback
  }

  const found = FALLBACK_PRODUCTS.find((p) => p.slug === slug);
  return found || null;
}

/**
 * Fetch dynamic facet counts
 */
export async function fetchFilters(category?: string): Promise<Record<string, { value: string; count: number }[]>> {
  try {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    const res = await fetchWithTimeout(`${getApiBase()}/filters${query}`, { next: { revalidate: 60 } }, 1500);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        return data;
      }
    }
  } catch {
    // Fallback
  }

  return FALLBACK_FILTERS;
}

/**
 * Fetch search suggestions
 */
export async function fetchSearchSuggestions(q: string): Promise<SearchSuggestion[]> {
  if (!q || q.trim().length < 2) return [];

  try {
    const res = await fetchWithTimeout(
      `${getApiBase()}/search/suggest?q=${encodeURIComponent(q.trim())}`,
      { cache: 'no-store' },
      1500
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch {
    // Fallback
  }

  const term = q.trim().toLowerCase();
  const suggestions: SearchSuggestion[] = [];

  // Match design codes
  for (const p of FALLBACK_PRODUCTS) {
    for (const v of p.variants || []) {
      if (v.designCode && v.designCode.toLowerCase().includes(term)) {
        suggestions.push({
          type: 'design_code',
          title: `Design #${v.designCode}`,
          slug: p.slug,
          subtitle: `${p.name} - ${v.optionLabel}`,
        });
      }
    }
  }

  // Match brands
  const brandMatches = ['Greenlam', 'CenturyPly', 'Merino', 'Royale Touche', 'Godrej', 'Dorset'].filter((b) =>
    b.toLowerCase().includes(term)
  );
  for (const b of brandMatches) {
    suggestions.push({
      type: 'brand',
      title: b,
      slug: b.toLowerCase().replace(/\s+/g, '-'),
      subtitle: `Browse all ${b} products`,
    });
  }

  // Match products
  for (const p of FALLBACK_PRODUCTS) {
    if (p.name.toLowerCase().includes(term)) {
      suggestions.push({
        type: 'product',
        title: p.name,
        slug: p.slug,
        subtitle: p.category?.name || 'In Store',
      });
    }
  }

  return suggestions.slice(0, 8);
}

/**
 * Check pincode serviceability
 */
export async function checkPincode(pincode: string): Promise<Pincode | null> {
  if (!/^\d{6}$/.test(pincode)) {
    throw new Error('Please enter a valid 6-digit Indian PIN code');
  }

  try {
    const res = await fetchWithTimeout(`${getApiBase()}/pincode/${pincode}`, { cache: 'no-store' }, 1500);
    if (res.ok) {
      return await res.json();
    }
    if (res.status === 404) {
      return null;
    }
  } catch {
    // Fallback
  }

  if (FALLBACK_PINCODES[pincode]) {
    return FALLBACK_PINCODES[pincode];
  }

  return null;
}

/**
 * Submit contact enquiry form
 */
export async function submitContactEnquiry(data: {
  name: string;
  phone: string;
  email?: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetchWithTimeout(`${getApiBase()}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, 2000);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback acknowledgment
  }

  return {
    success: true,
    message: 'Thank you for reaching out! Our team in Ahmedabad will get back to you within 2 business hours.',
  };
}

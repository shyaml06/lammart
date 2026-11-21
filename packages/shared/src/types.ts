import type { Role, OrderStatus, PaymentMethod, PaymentStatus, QuoteStatus, SampleStatus, Unit } from './constants';

// ─── User ───────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  gstin?: string;
  businessName?: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Address ────────────────────────────────────────────
export interface Address {
  id: number;
  userId: number;
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

// ─── Category ───────────────────────────────────────────
export interface Category {
  id: number;
  parentId?: number | null;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  children?: Category[];
}

export interface CategoryInput {
  parentId?: number | null;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// ─── Brand ──────────────────────────────────────────────
export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo?: string;
}

export interface BrandInput {
  name: string;
  slug?: string;
  logo?: string;
}

// ─── Product ────────────────────────────────────────────
export interface Product {
  id: number;
  categoryId: number;
  brandId: number | null;
  name: string;
  slug: string;
  description?: string;
  hsnCode?: string;
  gstRate: number;
  unit: Unit;
  isHeavy: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  category?: Category;
  brand?: Brand;
  variants?: ProductVariant[];
  images?: ProductImage[];
  fromPrice?: number; // cheapest variant price in paise
}

export interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  designCode?: string;
  optionLabel?: string;
  price: number; // paise
  mrp?: number;
  stock: number;
  weightGrams?: number;
  moq: number;
  isActive: boolean;
  attributes?: Record<string, string>;
  priceTiers?: PriceTier[];
}

export interface ProductImage {
  id: number;
  productId: number;
  variantId?: number;
  path: string;
  alt?: string;
  sortOrder: number;
}

// ─── Price Tier ─────────────────────────────────────────
export interface PriceTier {
  id: number;
  variantId: number;
  role: Role;
  minQty: number;
  price: number; // paise
}

// ─── Cart ───────────────────────────────────────────────
export interface CartItem {
  id: number;
  userId: number;
  variantId: number;
  qty: number;
  variant?: ProductVariant;
  product?: Product;
}

// ─── Order ──────────────────────────────────────────────
export interface Order {
  id: number;
  orderNo: string;
  userId: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  shippingCharge: number;
  taxTotal: number;
  grandTotal: number;
  shippingAddress: Address;
  billingGstin?: string;
  notes?: string;
  createdAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  variantId: number;
  nameSnapshot: string;
  skuSnapshot: string;
  qty: number;
  unitPrice: number;
  gstRate: number;
  lineTotal: number;
}

// ─── Payment ────────────────────────────────────────────
export interface Payment {
  id: number;
  orderId: number;
  provider: string;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  amount: number; // paise
  status: PaymentStatus;
  rawEvent?: string | null;
  createdAt: string;
}

// ─── Quote ──────────────────────────────────────────────
export interface Quote {
  id: number;
  userId?: number;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  message?: string;
  status: QuoteStatus;
  quotedTotal?: number;
  adminNotes?: string;
  createdAt: string;
  items?: QuoteItem[];
}

export interface QuoteItem {
  id: number;
  quoteId: number;
  variantId?: number;
  description?: string;
  qty: number;
  quotedUnitPrice?: number;
}

// ─── Sample Request ─────────────────────────────────────
export interface SampleRequest {
  id: number;
  userId?: number;
  name: string;
  phone: string;
  address: string;
  pincode: string;
  variantIds: number[];
  status: SampleStatus;
  createdAt: string;
}

// ─── Pincode ────────────────────────────────────────────
export interface Pincode {
  pincode: string;
  city?: string;
  state?: string;
  isServiceable: boolean;
  deliveryDays?: number;
  baseCharge: number;
  heavyChargePerUnit: number;
  codAllowed: boolean;
}

// ─── Settings ───────────────────────────────────────────
export interface StoreSettings {
  shopName?: string;
  shopState?: string;
  shopGstin?: string;
  freeShippingThreshold?: number;
  whatsappNumber?: string;
  codMaxLimit?: number;
  backordersEnabled?: boolean;
  [key: string]: any;
}

// ─── Dashboard Stats ────────────────────────────────────
export interface DashboardStats {
  totalRevenue: number;
  ordersCount: number;
  ordersToday: number;
  lowStockCount: number;
  pendingQuotes: number;
  pendingSamples: number;
  recentOrders?: Order[];
}

// ─── CSV Import Row ─────────────────────────────────────
export interface CsvProductRow {
  sku: string;
  product_name: string;
  category: string;
  brand?: string;
  design_code?: string;
  option_label?: string;
  price: number;
  mrp?: number;
  stock: number;
  hsn_code?: string;
  gst_rate?: number;
  unit?: Unit;
  attr_thickness?: string;
  attr_finish?: string;
  image_filenames?: string;
  [key: `attr_${string}`]: string | undefined;
}

// ─── API Response Shapes ────────────────────────────────
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SearchSuggestion {
  type: 'product' | 'design_code' | 'brand';
  title: string;
  slug: string;
  subtitle?: string;
}

export interface CheckoutQuote {
  subtotal: number;
  discount: number;
  shippingCharge: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxTotal: number;
  grandTotal: number;
  isSameState: boolean;
}

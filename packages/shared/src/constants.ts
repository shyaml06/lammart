// ─── Roles ───────────────────────────────────────────────
export const ROLES = ['customer', 'dealer', 'admin'] as const;
export type Role = (typeof ROLES)[number];

// ─── Order Statuses ──────────────────────────────────────
export const ORDER_STATUSES = [
  'pending',
  'paid',
  'confirmed',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// ─── Payment Methods ────────────────────────────────────
export const PAYMENT_METHODS = ['razorpay', 'cod'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// ─── Payment Statuses ───────────────────────────────────
export const PAYMENT_STATUSES = [
  'created',
  'authorized',
  'captured',
  'failed',
  'refunded',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// ─── Quote Statuses ─────────────────────────────────────
export const QUOTE_STATUSES = [
  'new',
  'quoted',
  'accepted',
  'rejected',
  'converted',
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

// ─── Sample Statuses ────────────────────────────────────
export const SAMPLE_STATUSES = ['new', 'dispatched', 'delivered', 'cancelled'] as const;
export type SampleStatus = (typeof SAMPLE_STATUSES)[number];

// ─── Units ──────────────────────────────────────────────
export const UNITS = ['piece', 'sheet', 'sqft', 'set'] as const;
export type Unit = (typeof UNITS)[number];

// ─── GST ────────────────────────────────────────────────
export const DEFAULT_GST_RATE = 18;

// ─── Pagination ─────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;

// ─── Samples ────────────────────────────────────────────
export const MAX_SAMPLE_ITEMS = 5;

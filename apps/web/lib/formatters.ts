/**
 * Indian Rupee & Square Foot currency formatters for Lammart
 */

export function formatPrice(paise: number, showPaise = false): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showPaise ? 2 : 0,
    maximumFractionDigits: showPaise ? 2 : 0,
  }).format(rupees);
}

export function formatSqftPrice(paise: number, sqftArea = 32): string {
  const rupees = paise / 100;
  const perSqft = rupees / sqftArea;
  return `₹ ${perSqft.toFixed(2)} / sq ft`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

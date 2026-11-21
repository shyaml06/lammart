import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPaiseToINR(paise: number, showPaise = false): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showPaise ? 2 : 0,
    maximumFractionDigits: showPaise ? 2 : 0,
  }).format(rupees);
}

export function calculateDualPrice(
  pricePaise: number,
  unit: string = 'sheet',
  sizeAttr?: string,
  optionLabel?: string
) {
  const priceINR = pricePaise / 100;
  if (unit !== 'sheet') {
    return {
      isDual: false,
      primaryFormatted: `${formatPaiseToINR(pricePaise)} / ${unit}`,
      secondaryFormatted: null,
      sqftArea: null,
    };
  }

  // Attempt to extract dimensions from size attribute or option label (e.g., '8x4 ft', '7x3', '9.5 x 0.5')
  let sqftArea = 32; // Standard 8x4 sheet default
  const textToMatch = `${sizeAttr || ''} ${optionLabel || ''}`;
  const match = textToMatch.match(/(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\.\d+)?)/);
  if (match) {
    const dim1 = parseFloat(match[1]);
    const dim2 = parseFloat(match[2]);
    if (dim1 > 0 && dim2 > 0) {
      sqftArea = dim1 * dim2;
    }
  }

  const pricePerSqFt = priceINR / sqftArea;
  return {
    isDual: true,
    primaryFormatted: `${formatPaiseToINR(pricePaise)} / sheet`,
    secondaryFormatted: `₹ ${pricePerSqFt.toFixed(2)} / sq ft`,
    sqftArea,
  };
}

export function calculateDiscount(pricePaise: number, mrpPaise?: number) {
  if (!mrpPaise || mrpPaise <= pricePaise) return null;
  const percent = Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
  return {
    percent,
    savingsPaise: mrpPaise - pricePaise,
    formattedSavings: formatPaiseToINR(mrpPaise - pricePaise),
    formattedMrp: formatPaiseToINR(mrpPaise),
  };
}

export function getWhatsAppEnquiryUrl(options: {
  productName: string;
  designCode?: string;
  sku: string;
  optionLabel?: string;
  slug: string;
  phone?: string;
}): string {
  const phone = options.phone || '919876543210';
  const baseUrl = `https://wa.me/${phone}`;
  const message = `Hi Lammart, I am interested in ${options.productName}${
    options.designCode ? ` (Design Code: ${options.designCode})` : ''
  } - SKU: ${options.sku}. Option: ${options.optionLabel || 'Standard'}.
Product URL: https://lammart.com/p/${options.slug}`;

  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

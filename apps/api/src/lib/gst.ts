// -------------------------------------------------
// GST calculation helpers
// -------------------------------------------------

import { Decimal } from '@prisma/client/runtime/library';
import { config } from '../config';

/**
 * Round a Decimal to 2 decimal places (standard for INR)
 */
export function round2(val: Decimal): Decimal {
  return new Decimal(val.toFixed(2));
}

/**
 * Calculate GST split for a given taxable amount.
 * Same-state  → CGST (rate/2) + SGST (rate/2)
 * Inter-state → IGST (full rate)
 */
export function calculateGst(
  taxableAmount: Decimal,
  gstRate: Decimal,
  customerStateCode: string,
) {
  const isSameState = customerStateCode === config.shopStateCode;

  if (isSameState) {
    const halfRate = gstRate.div(2);
    const cgst = round2(taxableAmount.mul(halfRate).div(100));
    const sgst = round2(taxableAmount.mul(halfRate).div(100));
    return { cgst, sgst, igst: new Decimal(0) };
  } else {
    const igst = round2(taxableAmount.mul(gstRate).div(100));
    return { cgst: new Decimal(0), sgst: new Decimal(0), igst };
  }
}

/**
 * Calculate taxable amount after discount
 */
export function taxableAfterDiscount(
  quantity: Decimal,
  rate: Decimal,
  discountPercent: Decimal,
): Decimal {
  const lineAmount = quantity.mul(rate);
  const discount = round2(lineAmount.mul(discountPercent).div(100));
  return round2(lineAmount.sub(discount));
}

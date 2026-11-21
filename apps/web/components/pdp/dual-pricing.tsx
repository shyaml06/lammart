import * as React from 'react';
import { calculateDualPrice, calculateDiscount } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function DualPricing({
  price,
  mrp,
  unit = 'sheet',
  sizeAttr,
  optionLabel,
}: {
  price: number; // paise
  mrp?: number; // paise
  unit?: string;
  sizeAttr?: string;
  optionLabel?: string;
}) {
  const dual = calculateDualPrice(price, unit, sizeAttr, optionLabel);
  const discount = calculateDiscount(price, mrp);

  return (
    <div className="rounded-16 bg-white p-5 border border-[#E7E2D9] space-y-2 shadow-card">
      <div className="flex flex-wrap items-baseline gap-3">
        {/* Primary Price */}
        <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-[#14201B]">
          {dual.primaryFormatted}
        </span>

        {/* Dual Per Sqft Price (for sheets) */}
        {dual.isDual && dual.secondaryFormatted && (
          <span className="text-base font-bold text-[#0B7A55] bg-[#EAF5EF] border border-[#0B7A55]/30 px-3 py-1 rounded-lg">
            {dual.secondaryFormatted}
          </span>
        )}
      </div>

      {/* MRP & Discount */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {discount && (
          <>
            <span className="text-[#5B6660] line-through font-mono">
              MRP: {discount.formattedMrp}
            </span>
            <span className="bg-[#0B7A55] text-white font-bold px-2 py-0.5 rounded-full text-[11px]">
              {discount.percent}% OFF
            </span>
            <span className="text-[#0B7A55] font-semibold">
              Save {discount.formattedSavings} per unit
            </span>
          </>
        )}
      </div>

      {/* GST Note */}
      <div className="text-[11px] text-[#5B6660] pt-1">
        Price inclusive of 18% GST. Tax invoices provided for Input Tax Credit (ITC).
      </div>
    </div>
  );
}

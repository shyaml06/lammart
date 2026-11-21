'use client';

import * as React from 'react';
import { Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ProductVariant } from '@lammart/shared';
import { formatPaiseToINR } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function VariantSelector({
  variants,
  selectedVariant,
  onSelect,
}: {
  variants: ProductVariant[];
  selectedVariant: ProductVariant;
  onSelect: (v: ProductVariant) => void;
}) {
  if (variants.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-900">
          Select Option / Dimension:
        </label>
        <span className="font-mono text-xs text-zinc-500">
          SKU: <strong className="text-zinc-900">{selectedVariant.sku}</strong>
        </span>
      </div>

      {/* Options Grid / Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {variants.map((v) => {
          const isSelected = v.id === selectedVariant.id;
          const isOutOfStock = v.stock <= 0;

          return (
            <button
              key={v.id || v.sku}
              type="button"
              disabled={isOutOfStock}
              onClick={() => onSelect(v)}
              className={`relative flex items-center justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/25 shadow-xs'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 text-zinc-800'
              } ${isOutOfStock ? 'opacity-50 cursor-not-allowed bg-zinc-50' : ''}`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold leading-snug">
                    {v.optionLabel || v.sku}
                  </span>
                  {v.designCode && (
                    <Badge variant="designCode" className="text-[10px] px-1.5 py-0">
                      #{v.designCode}
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-zinc-500">
                  {formatPaiseToINR(v.price)}
                </div>
              </div>

              {isSelected && (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Stock & MOQ Indicators */}
      <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
        {selectedVariant.stock > 10 ? (
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            In Stock ({selectedVariant.stock} available for immediate dispatch)
          </div>
        ) : selectedVariant.stock > 0 ? (
          <div className="flex items-center gap-1.5 text-amber-800 font-semibold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            Only {selectedVariant.stock} left in stock — order soon!
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-rose-700 font-semibold bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
            Out of Stock (Inquire for factory backorder)
          </div>
        )}

        {selectedVariant.moq > 1 && (
          <div className="text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md font-medium">
            Minimum Order: <strong>{selectedVariant.moq} units</strong>
          </div>
        )}
      </div>
    </div>
  );
}

import * as React from 'react';
import Link from 'next/link';
import { Layers, ArrowRight, ShieldCheck } from 'lucide-react';
import { ProductVariant } from '@lammart/shared';
import { formatPaiseToINR, calculateDualPrice } from '@/lib/utils';

export function PriceTiersTable({
  variant,
  unit = 'sheet',
}: {
  variant: ProductVariant;
  unit?: string;
}) {
  const customerTiers = variant.priceTiers?.filter((t) => t.role === 'customer') || [];

  if (customerTiers.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            <span>Commercial &amp; Trade Pricing</span>
          </div>
          <h4 className="font-bold text-zinc-900 text-sm mt-1">
            Bulk Project or Full Crate Orders (25+ sheets)
          </h4>
          <p className="text-xs text-zinc-600 mt-1">
            Direct site truckload supply with institutional contractor discounts and GST tax invoices.
          </p>
        </div>
        <Link
          href="/quote"
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors"
        >
          <span>Request Trade Quote</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const basePrice = variant.price;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-zinc-950 text-sm">Volume Wholesale Tiers</h4>
          <p className="text-xs text-zinc-500">
            Automatic tiered discounts applied directly at checkout based on quantity
          </p>
        </div>
        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          Direct Mill Discount
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500">
              <th className="py-2.5 px-3 font-semibold">Quantity Break</th>
              <th className="py-2.5 px-3 font-semibold">Price per {unit}</th>
              {unit === 'sheet' && <th className="py-2.5 px-3 font-semibold">Sq Ft Rate</th>}
              <th className="py-2.5 px-3 font-semibold text-right">Savings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {/* Base Tier */}
            <tr className="hover:bg-zinc-50/50">
              <td className="py-2.5 px-3 font-medium text-zinc-800">
                1 – {customerTiers[0].minQty - 1} {unit}s
              </td>
              <td className="py-2.5 px-3 font-bold text-zinc-900">
                {formatPaiseToINR(basePrice)}
              </td>
              {unit === 'sheet' && (
                <td className="py-2.5 px-3 text-zinc-600">
                  {calculateDualPrice(basePrice, unit).secondaryFormatted}
                </td>
              )}
              <td className="py-2.5 px-3 text-right text-zinc-400 font-mono">Standard</td>
            </tr>

            {/* Discounted Tiers */}
            {customerTiers.map((tier) => {
              const savingsPercent = Math.round(((basePrice - tier.price) / basePrice) * 100);
              return (
                <tr key={tier.id} className="bg-emerald-50/40 hover:bg-emerald-50/70">
                  <td className="py-2.5 px-3 font-bold text-emerald-950">
                    {tier.minQty}+ {unit}s
                  </td>
                  <td className="py-2.5 px-3 font-extrabold text-emerald-700">
                    {formatPaiseToINR(tier.price)}
                  </td>
                  {unit === 'sheet' && (
                    <td className="py-2.5 px-3 text-emerald-800 font-medium">
                      {calculateDualPrice(tier.price, unit).secondaryFormatted}
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-right">
                    <span className="bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded text-[10px]">
                      Save {savingsPercent}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

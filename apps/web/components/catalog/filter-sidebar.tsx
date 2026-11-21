'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FilterSidebar({
  filters,
  className = '',
}: {
  filters: Record<string, { value: string; count: number }[]>;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentBrand = searchParams.get('brand') || '';
  const currentThickness = searchParams.get('thickness') || '';
  const currentFinish = searchParams.get('finish') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';

  const [minPrice, setMinPrice] = React.useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = React.useState(currentMaxPrice);

  const updateParam = (key: string, val: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    if (val) {
      params.set(key, val);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePriceApply = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    if (minPrice) params.set('minPrice', minPrice);
    else params.delete('minPrice');
    if (maxPrice) params.set('maxPrice', maxPrice);
    else params.delete('maxPrice');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearAll = () => {
    setMinPrice('');
    setMaxPrice('');
    router.push(pathname);
  };

  const hasActiveFilters = Boolean(
    currentBrand || currentThickness || currentFinish || currentMinPrice || currentMaxPrice
  );

  const brands = filters.brand || [];
  const thicknesses = filters.thickness || [];
  const finishes = filters.finish || [];

  return (
    <aside className={`w-full max-w-[280px] rounded-16 border border-[#E7E2D9] bg-white p-5 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E7E2D9]">
        <div className="flex items-center gap-2 text-sm font-bold text-[#14201B] font-heading">
          <Filter className="h-4 w-4 text-[#0B7A55]" />
          <span>Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Clear All
          </button>
        )}
      </div>

      {/* Brand Checkboxes: 18x18px with accent-color #0B7A55 */}
      {brands.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#14201B] font-heading">
            Brand
          </h4>
          <div className="space-y-2">
            {brands.map((b) => {
              const slug = b.value.toLowerCase().replace(/\s+/g, '-');
              const isChecked =
                currentBrand.toLowerCase() === slug ||
                currentBrand.toLowerCase() === b.value.toLowerCase();
              return (
                <label
                  key={b.value}
                  className="flex items-center justify-between text-xs text-[#14201B] hover:text-[#0B7A55] cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => updateParam('brand', isChecked ? null : slug)}
                      className="h-[18px] w-[18px] rounded border-[#D9D3C7] text-[#0B7A55] focus:ring-[#0B7A55] cursor-pointer accent-[#0B7A55]"
                    />
                    <span className="font-medium">{b.value}</span>
                  </div>
                  <span className="text-[11px] text-[#5B6660] font-mono">({b.count})</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Thickness Filter Chips: 44px min-height, border #D9D3C7, rounded-10. Active: bg #EAF5EF, border #0B7A55, text #0B7A55 */}
      {thicknesses.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-[#E7E2D9]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#14201B] font-heading">
            Thickness
          </h4>
          <div className="flex flex-wrap gap-2">
            {thicknesses.map((t) => {
              const isSelected = currentThickness === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => updateParam('thickness', isSelected ? null : t.value)}
                  className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-10 border transition-all cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'border-[#0B7A55] bg-[#EAF5EF] text-[#0B7A55] shadow-xs'
                      : 'border-[#D9D3C7] bg-white text-[#14201B] hover:border-[#0B7A55]'
                  }`}
                >
                  {t.value}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Surface Finish Chips: 44px min-height, border #D9D3C7, rounded-10 */}
      {finishes.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-[#E7E2D9]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#14201B] font-heading">
            Surface Finish
          </h4>
          <div className="flex flex-wrap gap-2">
            {finishes.map((f) => {
              const isSelected = currentFinish === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => updateParam('finish', isSelected ? null : f.value)}
                  className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-10 border transition-all cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'border-[#0B7A55] bg-[#EAF5EF] text-[#0B7A55] shadow-xs'
                      : 'border-[#D9D3C7] bg-white text-[#14201B] hover:border-[#0B7A55]'
                  }`}
                >
                  {f.value}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Range Filter */}
      <div className="space-y-3 pt-3 border-t border-[#E7E2D9]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#14201B] font-heading">
          Price Range (₹ Paise)
        </h4>
        <form onSubmit={handlePriceApply} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[#5B6660] uppercase font-semibold">Min</label>
              <input
                type="number"
                placeholder="50000"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full text-xs px-2.5 py-2 border border-[#D9D3C7] bg-[#FAF8F4] rounded-lg focus:outline-none focus:border-[#0B7A55] font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#5B6660] uppercase font-semibold">Max</label>
              <input
                type="number"
                placeholder="500000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full text-xs px-2.5 py-2 border border-[#D9D3C7] bg-[#FAF8F4] rounded-lg focus:outline-none focus:border-[#0B7A55] font-mono"
              />
            </div>
          </div>
          <Button type="submit" size="sm" variant="outline" className="w-full text-xs h-9">
            Apply Price Filter
          </Button>
        </form>
      </div>
    </aside>
  );
}

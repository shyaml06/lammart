'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Filter, RotateCcw } from 'lucide-react';

export function SearchFilters({
  filters,
  categories,
}: {
  filters: Record<string, { value: string; count: number }[]>;
  categories: { name: string; slug: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get('category') || '';
  const currentBrand = searchParams.get('brand') || '';
  const currentThickness = searchParams.get('thickness') || '';

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

  const handleClearAll = () => {
    const params = new URLSearchParams();
    const q = searchParams.get('q');
    if (q) params.set('q', q);
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters = Boolean(currentCategory || currentBrand || currentThickness);

  return (
    <aside className="w-full max-w-[280px] rounded-16 border border-[#E7E2D9] bg-white p-5 space-y-6">
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
            Clear
          </button>
        )}
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#14201B] font-heading">
            Category
          </h4>
          <div className="space-y-1">
            {categories.map((c) => {
              const isSelected = currentCategory.toLowerCase() === c.slug.toLowerCase();
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => updateParam('category', isSelected ? null : c.slug)}
                  className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#EAF5EF] text-[#0B7A55] font-bold'
                      : 'text-[#14201B] hover:bg-[#FAF8F4]'
                  }`}
                >
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Brand Filter */}
      {filters.brand && filters.brand.length > 0 && (
        <div className="space-y-2.5 pt-3 border-t border-[#E7E2D9]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#14201B] font-heading">
            Brand
          </h4>
          <div className="space-y-2">
            {filters.brand.map((b) => {
              const slug = b.value.toLowerCase().replace(/\s+/g, '-');
              const isSelected =
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
                      checked={isSelected}
                      onChange={() => updateParam('brand', isSelected ? null : slug)}
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

      {/* Thickness Filter */}
      {filters.thickness && filters.thickness.length > 0 && (
        <div className="space-y-2.5 pt-3 border-t border-[#E7E2D9]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#14201B] font-heading">
            Thickness
          </h4>
          <div className="flex flex-wrap gap-2">
            {filters.thickness.map((t) => {
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
    </aside>
  );
}

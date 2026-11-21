import * as React from 'react';
import Link from 'next/link';
import { PackageSearch, RotateCcw } from 'lucide-react';
import { Product } from '@lammart/shared';
import { ProductCard } from './product-card';

export function ProductGrid({
  products,
  resetUrl,
}: {
  products: Product[];
  resetUrl?: string;
}) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-12 text-center min-h-[360px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 mb-4">
          <PackageSearch className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-zinc-900">No matching products found</h3>
        <p className="mt-1 text-xs text-zinc-500 max-w-sm">
          We could not find any products matching your specific combination of filters. Try clearing some filters to expand your results.
        </p>
        {resetUrl && (
          <Link
            href={resetUrl}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset All Filters
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

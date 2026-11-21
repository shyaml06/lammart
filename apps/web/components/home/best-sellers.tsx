import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import { fetchProducts } from '@/lib/api';
import { ProductCard } from '@/components/catalog/product-card';

export async function BestSellers() {
  const result = await fetchProducts({ limit: 8, sort: 'newest' });
  const products = result.data;

  return (
    <section className="max-w-[1360px] mx-auto px-4 sm:px-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0B7A55] font-heading">
            <Flame className="h-4 w-4 text-[#0B7A55]" />
            <span>High-Demand Surfaces</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight text-[#14201B] mt-1">
            Best Selling Laminates &amp; Architectural Hardware
          </h2>
          <p className="text-xs text-[#5B6660] mt-1">
            Top selected design codes by architects across Gujarat &amp; Mumbai
          </p>
        </div>
        <Link
          href="/c/laminates"
          className="text-xs font-bold text-[#0B7A55] hover:text-[#086143] flex items-center gap-1 group font-heading"
        >
          View Full Catalog <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

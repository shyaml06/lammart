import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, Sparkles } from 'lucide-react';
import { fetchProducts, fetchFilters, fetchCategories } from '@/lib/api';
import { SearchFilters } from '@/components/search/search-filters';
import { ProductCard } from '@/components/catalog/product-card';
import { SortDropdown } from '@/components/catalog/sort-dropdown';
import { Pagination } from '@/components/catalog/pagination';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

interface Props {
  searchParams: {
    q?: string;
    category?: string;
    brand?: string;
    thickness?: string;
    finish?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: 'price_asc' | 'price_desc' | 'newest' | 'name_asc';
    page?: string;
  };
}

export function generateMetadata({ searchParams }: Props): Metadata {
  const query = searchParams.q ? `"${searchParams.q}"` : 'Catalog';
  return {
    title: `Search Results for ${query}`,
    description: `Search results for ${query} in laminates, plywood, and architectural hardware on Lammart.`,
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = searchParams.q || '';

  const [productsRes, filters, categories] = await Promise.all([
    fetchProducts({
      q,
      category: searchParams.category,
      brand: searchParams.brand,
      thickness: searchParams.thickness,
      finish: searchParams.finish,
      minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
      maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
      sort: searchParams.sort,
      page: searchParams.page ? Number(searchParams.page) : 1,
      limit: 12,
    }),
    fetchFilters(searchParams.category),
    fetchCategories(),
  ]);

  const flatCategories = categories.flatMap((cat) => [
    { name: cat.name, slug: cat.slug },
    ...(cat.children?.map((c) => ({ name: c.name, slug: c.slug })) || []),
  ]);

  const popularSearches = ['1000', '2045', '3012', 'BWP-19', 'Marine Ply', 'Godrej Handle', 'Charcoal Louvers'];

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-8">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Search', url: `/search${q ? `?q=${encodeURIComponent(q)}` : ''}` },
        ]}
      />

      {/* Header */}
      <div className="border-b border-[#E7E2D9] pb-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0B7A55] mb-1 font-heading">
              <Search className="h-3.5 w-3.5" />
              <span>Catalog Search</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight text-[#14201B]">
              {q ? (
                <>
                  Search Results for <span className="text-[#0B7A55]">&quot;{q}&quot;</span>
                </>
              ) : (
                'Search Surfaces &amp; Hardware'
              )}
            </h1>
          </div>
          <div className="text-xs text-[#5B6660] font-medium">
            Found <span className="font-bold text-[#14201B] font-mono">{productsRes.total}</span> products
          </div>
        </div>

        {/* Popular Tags */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#5B6660] font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#0B7A55]" /> Popular:
          </span>
          {popularSearches.map((item) => (
            <Link
              key={item}
              href={`/search?q=${encodeURIComponent(item)}`}
              className="rounded-full bg-white border border-[#E7E2D9] hover:bg-[#EAF5EF] hover:text-[#0B7A55] text-[#14201B] px-3 py-1 text-[11px] font-medium transition-colors"
            >
              {item}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left: Filters Sidebar */}
        <div className="hidden lg:block shrink-0 w-[280px]">
          <div className="sticky top-28">
            <SearchFilters filters={filters} categories={flatCategories} />
          </div>
        </div>

        {/* Right: Results Grid */}
        <div className="flex-1 w-full min-w-0 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E2D9]">
            <span className="text-xs text-[#5B6660]">
              Page {productsRes.page} of {productsRes.totalPages}
            </span>
            <SortDropdown />
          </div>

          {productsRes.data.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {productsRes.data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-16 border border-dashed border-[#D9D3C7] bg-white p-12 text-center">
              <Search className="h-10 w-10 text-[#5B6660]/40 mx-auto mb-3" />
              <h3 className="font-bold font-heading text-[#14201B] text-base">No matching products found</h3>
              <p className="text-xs text-[#5B6660] mt-1 max-w-sm mx-auto">
                Try searching with a laminate design code like <span className="font-mono text-[#0B7A55]">#1000</span> or <span className="font-mono text-[#0B7A55]">#3012</span>, or search by brand name.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href="/c/laminates"
                  className="rounded-xl bg-[#0B7A55] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#086143] transition-colors"
                >
                  Browse Laminates
                </Link>
                <Link
                  href="/c/plywood"
                  className="rounded-xl border border-[#D9D3C7] bg-white px-4 py-2 text-xs font-semibold text-[#14201B] hover:bg-[#FAF8F4] transition-colors"
                >
                  Browse Plywood
                </Link>
              </div>
            </div>
          )}

          <Pagination
            currentPage={productsRes.page}
            totalPages={productsRes.totalPages}
          />
        </div>
      </div>
    </div>
  );
}

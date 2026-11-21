import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchCategoryBySlug, fetchProducts, fetchFilters } from '@/lib/api';
import { CategoryHero, BreadcrumbItem } from '@/components/catalog/category-hero';
import { FilterSidebar } from '@/components/catalog/filter-sidebar';
import { MobileFilterDrawer } from '@/components/catalog/mobile-filter-drawer';
import { SortDropdown } from '@/components/catalog/sort-dropdown';
import { ProductGrid } from '@/components/catalog/product-grid';
import { Pagination } from '@/components/catalog/pagination';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

interface Props {
  params: {
    category: string[];
  };
  searchParams: {
    brand?: string;
    thickness?: string;
    finish?: string;
    grade?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: 'price_asc' | 'price_desc' | 'newest' | 'name_asc';
    page?: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const targetSlug = params.category[params.category.length - 1];
  const category = await fetchCategoryBySlug(targetSlug);

  const title = category?.name ? `${category.name} Catalog` : 'Catalog';
  const description =
    category?.description ||
    'Browse premium decorative laminates, plywood sheets, and architectural hardware at manufacturer rates.';

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Lammart`,
      description,
      url: `https://lammart.com/c/${params.category.join('/')}`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const categoryPath = params.category;
  const targetSlug = categoryPath[categoryPath.length - 1];

  // Resolve category
  const category = await fetchCategoryBySlug(targetSlug);
  if (!category) {
    notFound();
  }

  // Construct breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = '/c';
  for (const seg of categoryPath) {
    currentPath += `/${seg}`;
    breadcrumbs.push({
      name: seg
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      url: currentPath,
    });
  }

  // Fetch products and dynamic filters in parallel
  const [productsRes, filters] = await Promise.all([
    fetchProducts({
      category: targetSlug,
      brand: searchParams.brand,
      thickness: searchParams.thickness,
      finish: searchParams.finish,
      grade: searchParams.grade,
      minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
      maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
      sort: searchParams.sort,
      page: searchParams.page ? Number(searchParams.page) : 1,
      limit: 12,
    }),
    fetchFilters(targetSlug),
  ]);

  const resetUrl = `/c/${categoryPath.join('/')}`;

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          ...breadcrumbs,
        ]}
      />

      <CategoryHero
        title={category.name}
        description={category.description}
        totalCount={productsRes.total}
        breadcrumbs={breadcrumbs}
      />

      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Desktop Filter Sidebar: 280px width */}
          <div className="hidden lg:block shrink-0 w-[280px]">
            <div className="sticky top-28">
              <FilterSidebar filters={filters} />
            </div>
          </div>

          {/* Product Listing Main Area */}
          <div className="flex-1 w-full min-w-0">
            {/* Top Bar with Sort & Mobile Filter Trigger */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E7E2D9]">
              <span className="text-xs text-[#5B6660] font-medium">
                Page <span className="font-bold text-[#14201B] font-mono">{productsRes.page}</span> of{' '}
                <span className="font-bold text-[#14201B] font-mono">{productsRes.totalPages}</span>
              </span>

              <div className="flex items-center gap-3">
                <MobileFilterDrawer filters={filters} />
                <SortDropdown />
              </div>
            </div>

            {/* Product Cards Grid */}
            <ProductGrid products={productsRes.data} resetUrl={resetUrl} />

            {/* Pagination */}
            <Pagination
              currentPage={productsRes.page}
              totalPages={productsRes.totalPages}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

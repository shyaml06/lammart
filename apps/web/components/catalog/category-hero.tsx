import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function CategoryHero({
  title,
  description,
  totalCount,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  totalCount: number;
  breadcrumbs: BreadcrumbItem[];
}) {
  return (
    <div className="bg-[#FAF8F4] border-b border-[#E7E2D9] py-6 sm:py-8">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-[#5B6660] mb-3 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-[#0B7A55] transition-colors flex items-center gap-1 font-medium">
            <Home className="h-3 w-3" />
            <span>Home</span>
          </Link>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.url + idx}>
              <ChevronRight className="h-3 w-3 text-[#5B6660]/60 shrink-0" />
              {idx === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-[#14201B]">{crumb.name}</span>
              ) : (
                <Link href={crumb.url} className="hover:text-[#0B7A55] transition-colors">
                  {crumb.name}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Heading & Subtitle */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-extrabold font-heading tracking-tight text-[#14201B]">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 text-xs sm:text-sm text-[#5B6660] max-w-3xl leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <div className="text-xs text-[#5B6660] shrink-0 font-medium">
            Showing <span className="font-bold text-[#14201B] font-mono">{totalCount}</span> matching products
          </div>
        </div>
      </div>
    </div>
  );
}

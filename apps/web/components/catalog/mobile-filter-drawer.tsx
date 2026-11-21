'use client';

import * as React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { FilterSidebar } from './filter-sidebar';

export function MobileFilterDrawer({
  filters,
}: {
  filters: Record<string, { value: string; count: number }[]>;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-xs hover:bg-zinc-50 transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-600" />
            <span>Filters</span>
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[85vw] max-w-sm overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <FilterSidebar filters={filters} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

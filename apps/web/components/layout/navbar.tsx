'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, Phone, FileText, Layers } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface NavItem {
  title: string;
  href: string;
  description?: string;
}

interface NavCategory {
  title: string;
  href: string;
  subcategories: NavItem[];
}

const CATEGORIES: NavCategory[] = [
  {
    title: 'Laminates',
    href: '/c/laminates',
    subcategories: [
      { title: '1.0mm Premium Laminates', href: '/c/1mm-premium', description: 'Anti-fingerprint, ultra matte, and high gloss sheets' },
      { title: 'Decorative Laminates', href: '/c/decorative-laminates', description: 'Woodgrain, marble, and textured textures' },
      { title: '0.8mm Liner Sheets', href: '/c/08mm-liner', description: 'Balancing liner laminates for carcass interiors' },
      { title: 'Exterior Compact Cladding', href: '/c/exterior-cladding', description: '6.0mm UV-resistant exterior facade panels' },
    ],
  },
  {
    title: 'Plywood & Boards',
    href: '/c/plywood',
    subcategories: [
      { title: 'Marine BWP Grade (IS:710)', href: '/c/marine-bwp', description: 'Boiling waterproof marine plywood with 20-yr warranty' },
      { title: 'Commercial MR Grade (IS:303)', href: '/c/commercial-mr', description: 'Moisture resistant plywood for dry interior joinery' },
      { title: 'Waterproof BWR Grade', href: '/c/waterproof-bwr', description: 'Boiling water resistant synthetic resin bonded ply' },
    ],
  },
  {
    title: 'Hardware & Handles',
    href: '/c/hardware',
    subcategories: [
      { title: 'Mortise Handle Sets', href: '/c/mortise-handles', description: '6-lever brass & zinc cylinder door locksets' },
      { title: 'Cabinet Knobs', href: '/c/cabinet-knobs', description: 'Solid brass and satin zinc drawer pulls' },
      { title: 'Main Door Pull Handles', href: '/c/pull-handles', description: 'Stately 450mm SS-304 heavy entrance handles' },
    ],
  },
  {
    title: 'Wall Decor',
    href: '/c/wall-decor',
    subcategories: [
      { title: 'Charcoal Louvers', href: '/c/charcoal-louvers', description: 'Acoustic ribbed polystyrene wall panels' },
      { title: 'Fluted Accent Panels', href: '/c/fluted-panels', description: 'Deep V-groove wall cladding slats' },
    ],
  },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null);

  return (
    <nav className="h-[52px] border-b border-[#E7E2D9] bg-white flex items-center px-4 sm:px-8">
      <div className="max-w-[1360px] w-full mx-auto flex h-full items-center justify-between">
        {/* Desktop Mega-Menu Nav: 52px height, horizontal scrollable, #0B7A55 active tab with 2px bottom border */}
        <div className="hidden lg:flex items-center h-full gap-2 text-sm font-medium overflow-x-auto">
          {CATEGORIES.map((cat) => {
            const isActive = pathname.startsWith(cat.href);
            return (
              <div
                key={cat.title}
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveDropdown(cat.title)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={cat.href}
                  className={`flex items-center gap-1.5 h-full px-3.5 text-xs font-semibold transition-colors border-b-2 ${
                    isActive
                      ? 'border-[#0B7A55] text-[#0B7A55]'
                      : 'border-transparent text-[#14201B] hover:text-[#0B7A55]'
                  }`}
                >
                  <span>{cat.title}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#5B6660]" />
                </Link>

                {/* Dropdown Menu */}
                {activeDropdown === cat.title && (
                  <div className="absolute left-0 top-full z-50 w-72 pt-1 animate-in fade-in-50 zoom-in-95">
                    <div className="rounded-16 border border-[#E7E2D9] bg-white p-3 shadow-card-hover">
                      <div className="mb-2 px-2 pb-1 border-b border-[#E7E2D9]/60 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B7A55] font-heading">
                          {cat.title} Catalog
                        </span>
                        <Link
                          href={cat.href}
                          className="text-[11px] text-[#5B6660] hover:text-[#0B7A55] font-semibold"
                        >
                          View All →
                        </Link>
                      </div>
                      <div className="space-y-1">
                        {cat.subcategories.map((sub) => (
                          <Link
                            key={sub.title}
                            href={sub.href}
                            className="block rounded-xl px-2.5 py-2 hover:bg-[#FAF8F4] transition-colors"
                          >
                            <p className="text-xs font-bold text-[#14201B]">{sub.title}</p>
                            {sub.description && (
                              <p className="text-[11px] text-[#5B6660] line-clamp-1 mt-0.5">
                                {sub.description}
                              </p>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="h-4 w-px bg-[#E7E2D9] mx-2" />

          <Link
            href="/quote"
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-[#0B7A55] hover:bg-[#EAF5EF] rounded-lg transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            B2B Bulk Quotes
          </Link>

          <Link
            href="/samples"
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#14201B] hover:text-[#0B7A55] transition-colors"
          >
            <Layers className="h-3.5 w-3.5" />
            Free Swatches
          </Link>
        </div>

        {/* Quick links right side */}
        <div className="hidden lg:flex items-center gap-5 text-xs text-[#5B6660] font-medium">
          <Link href="/about" className="hover:text-[#14201B] transition-colors">
            About Showroom
          </Link>
          <Link href="/contact" className="hover:text-[#14201B] transition-colors">
            Contact Desk
          </Link>
        </div>

        {/* Mobile Navigation Trigger */}
        <div className="flex lg:hidden items-center justify-between w-full">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 text-xs font-bold text-[#14201B] py-1"
              >
                <Menu className="h-4 w-4 text-[#0B7A55]" />
                <span>Browse All Categories</span>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2.5 font-heading">
                  <span className="h-7 w-7 rounded-lg bg-[#0B7A55] text-white flex items-center justify-center font-bold text-sm">
                    L
                  </span>
                  <span>Lammart Categories</span>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-6">
                {CATEGORIES.map((cat) => (
                  <div key={cat.title} className="space-y-2">
                    <Link
                      href={cat.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-xs font-bold uppercase tracking-wider text-[#0B7A55] flex items-center justify-between font-heading"
                    >
                      <span>{cat.title}</span>
                      <span className="text-[10px] text-[#5B6660]">View All →</span>
                    </Link>
                    <div className="space-y-1 pl-2.5 border-l-2 border-[#EAF5EF]">
                      {cat.subcategories.map((sub) => (
                        <Link
                          key={sub.title}
                          href={sub.href}
                          onClick={() => setMobileOpen(false)}
                          className="block py-1.5 text-xs text-[#14201B] hover:text-[#0B7A55]"
                        >
                          {sub.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-[#E7E2D9] space-y-3">
                  <Link
                    href="/quote"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 text-xs font-bold text-[#0B7A55]"
                  >
                    <FileText className="h-4 w-4" /> B2B Bulk Quotation
                  </Link>
                  <Link
                    href="/samples"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 text-xs font-semibold text-[#14201B]"
                  >
                    <Layers className="h-4 w-4" /> Order Free Sample Swatches
                  </Link>
                  <Link
                    href="/about"
                    onClick={() => setMobileOpen(false)}
                    className="block text-xs text-[#5B6660]"
                  >
                    About Ahmedabad Showroom
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setMobileOpen(false)}
                    className="block text-xs text-[#5B6660]"
                  >
                    Contact Customer Care
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link
            href="/contact"
            className="text-xs text-[#0B7A55] font-bold flex items-center gap-1"
          >
            <Phone className="h-3 w-3" /> Support Desk
          </Link>
        </div>
      </div>
    </nav>
  );
}

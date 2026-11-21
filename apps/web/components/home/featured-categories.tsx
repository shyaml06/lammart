import * as React from 'react';
import Link from 'next/link';
import { Layers, Shield, Wrench, Sparkles, ArrowRight } from 'lucide-react';

const CATEGORIES = [
  {
    title: 'Decorative Laminates',
    slug: 'laminates',
    description: '1.0mm Premium, 0.8mm Liner, High Gloss, Anti-fingerprint & Exterior Compact Cladding.',
    icon: Layers,
    sublinks: [
      { name: '1.0mm Premium', href: '/c/1mm-premium' },
      { name: '0.8mm Liner', href: '/c/08mm-liner' },
      { name: 'Exterior Cladding', href: '/c/exterior-cladding' },
    ],
    bgGradient: 'from-[#EAF5EF] to-white',
    accentColor: 'text-[#0B7A55]',
  },
  {
    title: 'Plywood & Boards',
    slug: 'plywood',
    description: 'IS:710 Marine BWP, IS:303 Moisture Resistant MR, and 710 BWR calibrated hardwood plywood.',
    icon: Shield,
    sublinks: [
      { name: 'Marine BWP (IS:710)', href: '/c/marine-bwp' },
      { name: 'Commercial MR', href: '/c/commercial-mr' },
      { name: 'Waterproof BWR', href: '/c/waterproof-bwr' },
    ],
    bgGradient: 'from-amber-50 to-white',
    accentColor: 'text-amber-700',
  },
  {
    title: 'Architectural Hardware',
    slug: 'hardware',
    description: 'Heavy brass mortise handle sets, solid cabinet knobs, and continuous edge pull handles.',
    icon: Wrench,
    sublinks: [
      { name: 'Mortise Handles', href: '/c/mortise-handles' },
      { name: 'Cabinet Knobs', href: '/c/cabinet-knobs' },
      { name: 'Main Door Pulls', href: '/c/pull-handles' },
    ],
    bgGradient: 'from-zinc-100 to-white',
    accentColor: 'text-zinc-800',
  },
  {
    title: 'Wall Decor & Louvers',
    slug: 'wall-decor',
    description: 'Sound-dampening acoustic charcoal louvers and deep fluted V-groove wall slats.',
    icon: Sparkles,
    sublinks: [
      { name: 'Charcoal Louvers', href: '/c/charcoal-louvers' },
      { name: 'Fluted Panels', href: '/c/fluted-panels' },
    ],
    bgGradient: 'from-teal-50 to-white',
    accentColor: 'text-teal-700',
  },
];

export function FeaturedCategories() {
  return (
    <section className="max-w-[1360px] mx-auto px-4 sm:px-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B7A55] font-heading">
            Catalog Collections
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight text-[#14201B] mt-1">
            Explore By Surface &amp; Hardware Category
          </h2>
        </div>
        <Link
          href="/c/laminates"
          className="text-xs font-bold text-[#0B7A55] hover:text-[#086143] flex items-center gap-1 group font-heading"
        >
          View All Categories <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.slug}
              className="group relative flex flex-col justify-between rounded-16 border border-[#E7E2D9] bg-white p-6 shadow-xs hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300"
            >
              <div>
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${cat.bgGradient} ${cat.accentColor} border border-[#E7E2D9] group-hover:scale-105 transition-transform`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold font-heading text-[#14201B] group-hover:text-[#0B7A55] transition-colors">
                  <Link href={`/c/${cat.slug}`} className="focus:outline-none">
                    <span className="absolute inset-0 z-0" />
                    {cat.title}
                  </Link>
                </h3>
                <p className="mt-2 text-xs text-[#5B6660] leading-relaxed line-clamp-2">
                  {cat.description}
                </p>
              </div>

              {/* Subcategories list */}
              <div className="mt-6 pt-4 border-t border-[#E7E2D9] relative z-10">
                <div className="flex flex-wrap gap-1.5">
                  {cat.sublinks.map((sub) => (
                    <Link
                      key={sub.name}
                      href={sub.href}
                      className="rounded-lg bg-[#FAF8F4] border border-[#E7E2D9] px-2 py-1 text-[11px] font-medium text-[#14201B] hover:bg-[#EAF5EF] hover:text-[#0B7A55] transition-colors"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>

                <div className="mt-4 flex items-center text-xs font-bold text-[#0B7A55] group-hover:text-[#086143]">
                  <span>Explore Collection</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

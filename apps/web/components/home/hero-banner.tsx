import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Layers, FileText, CheckCircle2 } from 'lucide-react';

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#EAF5EF] via-[#FAF8F4] to-[#FAF8F4] py-16 sm:py-24 border-b border-[#E7E2D9]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 text-center">
        {/* Trust Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#0B7A55]/30 bg-[#EAF5EF] px-4 py-1.5 text-xs font-semibold text-[#0B7A55] shadow-xs mb-6">
          <span className="flex h-2 w-2 rounded-full bg-[#0B7A55] animate-pulse" />
          Direct Manufacturer &amp; Wholesale Pricing | Gujarat &amp; Pan-India
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl font-black font-heading tracking-tight text-[#14201B] max-w-4xl mx-auto leading-[1.15]">
          Premium <span className="text-[#0B7A55]">Laminates</span>, Plywood &amp; Architectural Hardware
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-[#5B6660] max-w-2xl mx-auto leading-relaxed">
          Supplying architects, interior designers, contractors, and discerning homeowners with 100% genuine surface materials and heavy-duty architectural hardware directly from authorized distributors.
        </p>

        {/* Action CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/c/laminates"
            className="flex items-center gap-2 rounded-xl bg-[#0B7A55] px-7 py-3 text-sm font-bold text-white shadow-xs hover:bg-[#086143] active:bg-[#064932] transition-all cursor-pointer font-heading"
          >
            Browse Catalog
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/quote"
            className="flex items-center gap-2 rounded-xl border border-[#D9D3C7] bg-white px-7 py-3 text-sm font-bold text-[#14201B] shadow-xs hover:bg-[#FAF8F4] transition-all cursor-pointer font-heading"
          >
            <FileText className="h-4 w-4 text-[#0B7A55]" />
            Request Bulk Quote
          </Link>
          <Link
            href="/samples"
            className="flex items-center gap-2 rounded-xl border border-[#0B7A55] bg-[#EAF5EF] px-6 py-3 text-sm font-bold text-[#0B7A55] shadow-xs hover:bg-[#d5ece0] transition-all cursor-pointer font-heading"
          >
            <Layers className="h-4 w-4 text-[#0B7A55]" />
            Order Free Swatches
          </Link>
        </div>

        {/* Quick Highlights Row */}
        <div className="mt-12 pt-8 border-t border-[#E7E2D9] max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0B7A55] shrink-0" />
            <span className="text-xs font-semibold text-[#14201B]">100% Genuine Brands</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0B7A55] shrink-0" />
            <span className="text-xs font-semibold text-[#14201B]">Protected Crated Transit</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0B7A55] shrink-0" />
            <span className="text-xs font-semibold text-[#14201B]">18% GST Input Credit</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0B7A55] shrink-0" />
            <span className="text-xs font-semibold text-[#14201B]">Direct Site Delivery</span>
          </div>
        </div>
      </div>
    </section>
  );
}

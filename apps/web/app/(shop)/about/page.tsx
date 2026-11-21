import type { Metadata } from 'next';
import Link from 'next/link';
import { Award, Building2, Truck, Users, ShieldCheck, ArrowRight, Layers } from 'lucide-react';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'About Lammart - Premium Surfaces & Architectural Hardware in Ahmedabad',
  description:
    'Learn about Lammart Surfaces — Gujarat’s premier digital wholesale supply hub for laminates, marine plywood, and designer architectural hardware.',
};

export default function AboutPage() {
  const stats = [
    { value: '50,000+', label: 'Sheets Delivered Across India' },
    { value: '1,500+', label: 'Full Size Display Sheets in Showroom' },
    { value: '1,200+', label: 'Registered Architects & Contractors' },
    { value: '100%', label: 'Crated Moisture-Sealed Transit Safety' },
  ];

  const brands = [
    { name: 'Greenlam', desc: 'Authorized distributor for premium 1.0mm & anti-fingerprint laminates.' },
    { name: 'CenturyPly', desc: 'Official dealer for Club Prime Marine BWP and Sainik MR/BWR plywood.' },
    { name: 'Merino', desc: 'Curated architectural veneers, suede textures, and exterior compact cladding.' },
    { name: 'Royale Touche', desc: 'Exclusive high-gloss luxury woodgrain patterns and charcoal louvers.' },
    { name: 'Godrej', desc: 'Heavy-duty mortise brass locksets and architectural cabinet pulls.' },
    { name: 'Dorset', desc: 'High-end architectural stainless steel pull handles and modern levers.' },
  ];

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-12 space-y-16">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'About Us', url: '/about' },
        ]}
      />

      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF5EF] border border-[#0B7A55]/30 px-3.5 py-1 text-xs font-semibold text-[#0B7A55]">
          <Building2 className="h-3.5 w-3.5 text-[#0B7A55]" />
          <span>Established in Ahmedabad, Gujarat</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black font-heading tracking-tight text-[#14201B]">
          Bridging Surface Manufacturers Directly to Architects &amp; Builders
        </h1>
        <p className="text-sm sm:text-base text-[#5B6660] leading-relaxed">
          Lammart was founded with a single mission: to eliminate opacity, transit damage, and counterfeit products in the decorative laminate and building material trade through digital transparency and direct crated distribution.
        </p>
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8 rounded-16 bg-[#0F1A15] text-[#E6EFEA] shadow-card">
        {stats.map((s) => (
          <div key={s.label} className="text-center p-3">
            <div className="text-3xl sm:text-4xl font-black text-[#0B7A55] font-mono">
              {s.value}
            </div>
            <div className="text-xs text-[#a3b8ad] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Physical Showroom Story */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center rounded-16 border border-[#E7E2D9] p-8 sm:p-10 bg-white shadow-card">
        <div className="space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B7A55] font-heading">
            Physical Presence &amp; Infrastructure
          </span>
          <h2 className="text-2xl font-extrabold font-heading text-[#14201B]">
            5,000 Sq Ft Experience Gallery on S.G. Highway
          </h2>
          <p className="text-xs sm:text-sm text-[#5B6660] leading-relaxed">
            Unlike traditional catalog-based traders who rely on miniature sample books, Lammart houses full 8x4 ft sheet displays under natural 4000K daylight lighting. Interior designers and home owners can touch, evaluate grain depth, and inspect light reflection before ordering.
          </p>
          <div className="pt-2 text-xs text-[#14201B] space-y-1 font-medium">
            <p>📍 Ground Floor, Trade Center, S.G. Highway, Bodakdev, Ahmedabad, Gujarat — 380054</p>
            <p>🕒 Mon – Sat: 9:00 AM – 8:00 PM</p>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden bg-gradient-to-br from-[#0F1A15] to-[#14201B] p-8 text-white flex flex-col justify-between aspect-4/3 relative">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#0B7A55_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
          <Layers className="h-12 w-12 text-[#0B7A55] relative z-10" />
          <div className="relative z-10 space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#EAF5EF] font-bold">
              Full Scale Inspection
            </span>
            <p className="text-sm font-semibold text-[#a3b8ad] leading-snug">
              Every shipment is verified for thickness, sheet squareness, and zero scratch defects before crating.
            </p>
          </div>
        </div>
      </div>

      {/* Brand Partnerships */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-extrabold font-heading text-[#14201B]">
            100% Authorized Distributor Partnerships
          </h2>
          <p className="text-xs text-[#5B6660] mt-1">
            We source directly from corporate manufacturing plants with manufacturer test certificates (MTC).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {brands.map((b) => (
            <div key={b.name} className="rounded-16 border border-[#E7E2D9] bg-white p-5 hover:border-[#0B7A55] transition-colors shadow-xs">
              <h3 className="font-bold font-heading text-[#14201B] text-sm">{b.name}</h3>
              <p className="text-xs text-[#5B6660] mt-1 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="rounded-16 bg-[#EAF5EF] border border-[#0B7A55]/30 p-8 sm:p-10 text-center space-y-4">
        <h3 className="text-xl sm:text-2xl font-black font-heading text-[#14201B]">
          Ready to Source Materials for Your Next Project?
        </h3>
        <p className="text-xs sm:text-sm text-[#5B6660] max-w-xl mx-auto">
          Request a customized project quotation with trade pricing, or order physical sample swatches delivered directly to your desk.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/c/laminates"
            className="rounded-xl bg-[#0B7A55] hover:bg-[#086143] text-white px-6 py-3 text-xs font-bold shadow-xs transition-colors font-heading"
          >
            Browse Laminate Catalog
          </Link>
          <Link
            href="/contact"
            className="rounded-xl border border-[#0B7A55] bg-white hover:bg-[#FAF8F4] text-[#0B7A55] px-6 py-3 text-xs font-bold transition-colors font-heading"
          >
            Contact Ahmedabad Showroom
          </Link>
        </div>
      </div>
    </div>
  );
}

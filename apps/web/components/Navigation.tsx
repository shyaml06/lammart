'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, FileText, Layers, Users, LayoutDashboard, ShieldCheck } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Counter POS', icon: ShoppingCart },
    { href: '/challans', label: 'Pending Challans', icon: FileText },
    { href: '/inventory', label: 'Stock & Godown', icon: Layers },
    { href: '/parties', label: 'Parties & Commission', icon: Users },
    { href: '/dashboard', label: 'Owner Dashboard', icon: LayoutDashboard },
  ];

  return (
    <header className="bg-[#0F1A15] text-[#E6EFEA] border-b border-[#1f3128] sticky top-0 z-40">
      <div className="max-w-[1500px] mx-auto px-4 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2 xl:flex xl:justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B7A55] flex items-center justify-center font-bold text-white text-xl shadow-md">
            L
          </div>
          <div>
            <span className="font-serif font-normal tracking-tight text-xl text-white">LAMMART</span>
            <span className="ml-2 hidden text-xs sm:inline font-medium px-2 py-0.5 rounded-full bg-[#1b2f25] text-[#66c3a2] border border-[#2b4d3d]">
              Retail POS & Challan
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav aria-label="POS navigation" className="order-last col-span-2 flex min-w-0 items-center gap-1 overflow-x-auto p-1 xl:order-none">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 shrink-0 items-center gap-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-[#0B7A55] text-white shadow-sm font-semibold'
                    : 'text-[#a3b8af] hover:text-white hover:bg-[#192b22]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Role & Showroom Indicator */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right xl:block">
            <div className="text-xs text-[#8aa396]">Active Location</div>
            <div className="text-sm font-semibold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Showroom + Godown
            </div>
          </div>
          <div className="hidden xl:block h-8 w-px bg-[#233a2f]"></div>
          <div className="flex items-center gap-2 bg-[#17271f] px-3 py-1.5 rounded-lg border border-[#274235]">
            <ShieldCheck className="w-4 h-4 text-[#33af83]" />
            <span className="text-xs font-semibold text-emerald-200">Admin/Owner</span>
          </div>
        </div>
      </div>
    </header>
  );
}

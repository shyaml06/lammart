import * as React from 'react';
import Link from 'next/link';
import { Phone, MessageCircle, ShoppingBag } from 'lucide-react';
import { SearchBar } from './search-bar';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full bg-white shadow-xs">
      {/* Top Announcement Bar - exactly from Main.dc.html */}
      <div className="bg-[#0F1A15] text-[#E6EFEA] text-[13px] py-2 px-4 sm:px-8">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-4 flex-wrap min-h-[24px]">
          <span className="font-medium">
            Direct manufacturer and wholesale pricing across Gujarat and India
          </span>
          <div className="flex items-center gap-6 text-[13px]">
            <Link
              href="/samples"
              className="text-[#E6EFEA] hover:text-[#0B7A55] transition-colors"
            >
              Order free swatches
            </Link>
            <Link
              href="/quote"
              className="text-[#E6EFEA] hover:text-[#0B7A55] transition-colors"
            >
              B2B quotes
            </Link>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="border-b border-[#E7E2D9] bg-white">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 flex items-center gap-6 sm:gap-8 min-h-[80px] flex-wrap py-2">
          {/* Logo with Space Grotesk font */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <span className="font-display w-[44px] h-[44px] rounded-[12px] bg-[#0B7A55] text-white flex items-center justify-center text-[22px] font-bold shadow-sm group-hover:bg-[#086143] transition-colors">
              L
            </span>
            <span className="font-display text-[24px] font-bold text-[#14201B] tracking-tight">
              Lammart
            </span>
          </Link>

          {/* Search Bar matching design */}
          <div className="flex-1 min-w-[240px]">
            <SearchBar />
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            {/* WhatsApp Button */}
            <a
              href="https://wa.me/919876543210?text=Hi%20Lammart%2C%20I%20would%20like%20to%20enquire%20about%20materials"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-b1 flex items-center gap-2 px-3.5 py-2 text-sm font-semibold"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M21 12a8 8 0 0 1-12 7l-5 1 1-5A8 8 0 1 1 21 12z"></path>
              </svg>
              <span>WhatsApp</span>
            </a>

            {/* Quote Cart Button */}
            <Link
              href="/cart"
              aria-label="Quote cart"
              className="btn-b1 w-[48px] h-[44px] flex items-center justify-center p-0"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M6 7h12l1 13H5zM9 7a3 3 0 0 1 6 0"></path>
              </svg>
            </Link>
          </div>
        </div>

        {/* Sub-Navigation matching design */}
        <nav className="max-w-[1360px] mx-auto px-4 sm:px-8 flex items-center gap-8 min-h-[52px] text-[15px] font-medium overflow-x-auto whitespace-nowrap text-[#14201B]">
          <Link
            href="/c/laminates"
            className="text-[#0B7A55] border-b-2 border-[#0B7A55] py-[14px]"
          >
            Laminates
          </Link>
          <Link
            href="/c/plywood"
            className="hover:text-[#0B7A55] py-[14px] transition-colors"
          >
            Plywood and boards
          </Link>
          <Link
            href="/c/hardware"
            className="hover:text-[#0B7A55] py-[14px] transition-colors"
          >
            Hardware and handles
          </Link>
          <Link
            href="/c/wall-decor"
            className="hover:text-[#0B7A55] py-[14px] transition-colors"
          >
            Wall decor
          </Link>
          <Link
            href="/quote"
            className="hover:text-[#0B7A55] py-[14px] transition-colors ml-auto hidden md:block"
          >
            Bulk quotes
          </Link>
          <Link
            href="/about"
            className="hover:text-[#0B7A55] py-[14px] transition-colors hidden md:block"
          >
            Showroom
          </Link>
        </nav>
      </div>
    </header>
  );
}

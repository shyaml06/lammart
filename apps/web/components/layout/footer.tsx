import * as React from 'react';
import Link from 'next/link';
import { MapPin, Phone, Mail, Clock, MessageCircle, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-[#1F2E27] bg-[#0F1A15] text-[#9EABA4]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Col 1: Showroom & Address */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="font-display w-[36px] h-[36px] rounded-[10px] bg-[#0B7A55] text-white flex items-center justify-center text-[18px] font-bold">
                L
              </span>
              <span className="font-display text-xl font-bold tracking-tight text-white">
                Lammart
              </span>
            </div>
            <p className="text-xs text-[#9EABA4] leading-relaxed max-w-sm">
              Lammart is India&apos;s digital supply hub for premium decorative laminates, marine grade plywood, and architectural hardware. Supplying architects, contractors, and discerning homeowners directly from manufacturers.
            </p>

            <div className="space-y-2 text-xs pt-2">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-[#0B7A55] shrink-0 mt-0.5" />
                <span>Ground Floor, Trade Center, S.G. Highway, Bodakdev, Ahmedabad, Gujarat — 380054</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-[#0B7A55] shrink-0" />
                <span>Showroom Hours: Mon – Sat: 9:00 AM – 8:00 PM</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-[#0B7A55] shrink-0" />
                <span>GSTIN: 24AAACL1234D1Z2 (100% Tax Compliant B2B Billing)</span>
              </div>
            </div>
          </div>

          {/* Col 2: Customer Support & WhatsApp */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Direct Support</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a
                  href="https://wa.me/919876543210?text=Hi%20Lammart%20Team%2C%20I%20need%20assistance%20with%20an%20order"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366]/10 border border-[#25D366]/30 px-2.5 py-1 text-emerald-400 hover:bg-[#25D366]/20 transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                  <span>WhatsApp: +91 98765 43210</span>
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-zinc-500" />
                <span>Helpline: +91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-zinc-500" />
                <a href="mailto:support@lammart.com" className="hover:text-emerald-400 transition-colors">
                  support@lammart.com
                </a>
              </li>
              <li className="pt-1 text-[11px] text-zinc-500 leading-normal">
                Direct site crane &amp; crated unloading across Ahmedabad, Surat, Vadodara, Rajkot, and all Indian metros.
              </li>
            </ul>
          </div>

          {/* Col 3: Catalog Categories */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Surface Catalog</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/c/laminates" className="hover:text-emerald-400 transition-colors">
                  Decorative Laminates
                </Link>
              </li>
              <li>
                <Link href="/c/1mm-premium" className="hover:text-emerald-400 transition-colors">
                  1.0mm Premium Sheets
                </Link>
              </li>
              <li>
                <Link href="/c/plywood" className="hover:text-emerald-400 transition-colors">
                  Marine BWP Plywood
                </Link>
              </li>
              <li>
                <Link href="/c/hardware" className="hover:text-emerald-400 transition-colors">
                  Mortise Handles &amp; Knobs
                </Link>
              </li>
              <li>
                <Link href="/c/wall-decor" className="hover:text-emerald-400 transition-colors">
                  Charcoal Louver Panels
                </Link>
              </li>
              <li>
                <Link href="/c/exterior-cladding" className="hover:text-emerald-400 transition-colors">
                  Exterior Compact Cladding
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Trade & Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Trade &amp; Policies</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/quote" className="hover:text-emerald-400 transition-colors text-emerald-400 font-semibold">
                  Request Bulk Quotation
                </Link>
              </li>
              <li>
                <Link href="/samples" className="hover:text-emerald-400 transition-colors">
                  Order Sample Swatches
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-emerald-400 transition-colors">
                  About Lammart Showroom
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className="hover:text-emerald-400 transition-colors">
                  Shipping &amp; Delivery Policy
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-emerald-400 transition-colors">
                  Returns &amp; Replacement
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-emerald-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>
            &copy; {new Date().getFullYear()} Lammart Surfaces Pvt. Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span>Manufactured in Gujarat, India</span>
            <span>100% Genuine Certified Brands</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

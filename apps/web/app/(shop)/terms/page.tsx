import type { Metadata } from 'next';
import { Scale, CheckCircle2, ShieldAlert, Gavel } from 'lucide-react';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'Terms of Service - Lammart Commercial Terms',
  description:
    'Read the legal terms, commercial quotation validity, GST compliance, and jurisdictional agreements of Lammart Surfaces.',
};

export default function TermsPage() {
  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-12 max-w-4xl space-y-10">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Terms of Service', url: '/terms' },
        ]}
      />

      <div className="space-y-2 border-b border-[#E7E2D9] pb-6">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0B7A55] font-heading">
          <Scale className="h-4 w-4" /> Legal &amp; Commercial Terms
        </div>
        <h1 className="text-3xl font-extrabold font-heading tracking-tight text-[#14201B]">
          Terms &amp; Conditions of Sale
        </h1>
        <p className="text-xs text-[#5B6660]">
          Last updated: November 2026 • Governing all transactions on Lammart e-commerce platform
        </p>
      </div>

      <div className="space-y-8 text-xs sm:text-sm text-[#14201B] leading-relaxed">
        {/* Section 1 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold font-heading text-[#14201B] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0B7A55]" />
            1. Pricing &amp; GST Tax Billing
          </h2>
          <p>
            All prices displayed on the Lammart website are quoted in Indian Rupees (INR) and stored internally in integer paise (1 INR = 100 paise).
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-[#5B6660]">
            <li>
              Selling prices are <strong>inclusive of 18% Goods and Services Tax (GST)</strong> under applicable HSN codes (e.g. 4823 for laminates, 4412 for plywood, 8302 for hardware).
            </li>
            <li>
              Tax invoices will itemize CGST (9%) + SGST (9%) for intra-state Gujarat deliveries, and IGST (18%) for inter-state deliveries.
            </li>
            <li>
              Registered B2B buyers must provide a valid GSTIN at checkout to receive formal tax invoices for claiming Input Tax Credit (ITC).
            </li>
          </ul>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold font-heading text-[#14201B] flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[#0B7A55]" />
            2. Bulk Quotations Validity
          </h2>
          <p>
            Custom quotations issued through our B2B Bulk Quotation desk (`/quote`) remain valid for a period of <strong>14 calendar days</strong> from the date of quotation issuance, subject to factory raw material price revisions and stock availability.
          </p>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold font-heading text-[#14201B] flex items-center gap-2">
            <Gavel className="h-4 w-4 text-[#0B7A55]" />
            3. Order Acceptance &amp; Stock Reservations
          </h2>
          <p>
            Receipt of an electronic order confirmation does not signify our final acceptance of your order. Lammart reserves the right to decline or limit the quantity of any order due to factory stock shortages or logistical non-serviceability. In such rare events, any amount paid will be refunded immediately in full.
          </p>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold font-heading text-[#14201B]">4. Governing Law &amp; Jurisdiction</h2>
          <p>
            These terms and all commercial disputes arising out of contracts entered into with Lammart Surfaces Pvt. Ltd. shall be governed solely by the laws of India. Any legal proceedings shall be subject to the exclusive jurisdiction of the competent courts in <strong>Ahmedabad, Gujarat</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

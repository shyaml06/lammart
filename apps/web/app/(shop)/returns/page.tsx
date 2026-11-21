import type { Metadata } from 'next';
import { RotateCcw, ShieldAlert, CheckCircle2, FileText } from 'lucide-react';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'Returns & Replacement Policy - Lammart 7-Day Guarantee',
  description:
    'Learn about Lammart’s 7-day inspection guarantee, transit damage claims, and replacement resolution workflows.',
};

export default function ReturnsPage() {
  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-12 max-w-4xl space-y-10">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Returns Policy', url: '/returns' },
        ]}
      />

      <div className="space-y-2 border-b border-[#E7E2D9] pb-6">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0B7A55] font-heading">
          <RotateCcw className="h-4 w-4" /> Customer Satisfaction
        </div>
        <h1 className="text-3xl font-extrabold font-heading tracking-tight text-[#14201B]">
          Returns &amp; Replacement Policy
        </h1>
        <p className="text-xs text-[#5B6660]">
          Last updated: November 2026 • 7-Day Inspection &amp; Replacement Guarantee
        </p>
      </div>

      <div className="space-y-8 text-xs sm:text-sm text-[#14201B] leading-relaxed">
        {/* Section 1 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold font-heading text-[#14201B] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0B7A55]" />
            1. 7-Day Inspection Guarantee
          </h2>
          <p>
            At Lammart, customer confidence and material integrity are paramount. We provide a <strong>7-day inspection window</strong> from the date of physical site delivery for you to verify design codes, batch uniformity, and surface finish.
          </p>
          <p className="text-xs text-[#5B6660]">
            If there is an inadvertent dispatch error (e.g. wrong design code or thickness received), we provide immediate 100% free doorstep collection and correct item replacement.
          </p>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold font-heading text-[#14201B] flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[#0B7A55]" />
            2. Transit Damage Protocol (48-Hour Notification)
          </h2>
          <p>
            While all our shipments are packed with rigid corner crates, road accidents can rarely cause transit chipping or cracks.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-[#5B6660]">
            <li>
              Customers or site managers must inspect outer crating before signing the transporter delivery challan.
            </li>
            <li>
              Any visible crate damage or surface cracking must be reported via WhatsApp (+91 98765 43210) or email (support@lammart.com) within <strong>48 hours of delivery</strong> with unboxing photographs.
            </li>
            <li>
              Verified transit damaged sheets are replaced immediately at zero extra cost to the buyer.
            </li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold font-heading text-[#14201B] flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#0B7A55]" />
            3. Return Eligibility Prerequisites
          </h2>
          <p>For return requests based on customer change-of-mind:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-[#5B6660]">
            <li>
              Sheets must be intact, uncut, unglued, and in original manufacturer packaging with label intact.
            </li>
            <li>
              Customer pays the return freight transport charges back to our Ahmedabad warehouse.
            </li>
            <li>
              <strong>Non-Returnable Items:</strong> Custom-cut sheets, discontinued clearance lots, and complimentary sample swatches are strictly non-returnable.
            </li>
          </ul>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold font-heading text-[#14201B]">4. Refund &amp; Credit Note Resolution</h2>
          <p>
            Once returned materials are received and inspected at our Ahmedabad warehouse (verifying zero cracks or cuts):
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-[#5B6660]">
            <li>
              Online payments (Razorpay) are refunded back to the original source account within 5–7 business days.
            </li>
            <li>
              B2B and trade customers will receive an authorized GST Credit Note against their business account.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

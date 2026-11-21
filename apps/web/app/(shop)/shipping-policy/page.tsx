import type { Metadata } from 'next';
import { Truck, ShieldCheck, Clock, AlertCircle } from 'lucide-react';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy - Lammart Crated Transport',
  description:
    'Read Lammart’s crated site delivery timelines, freight charge structure, and unloading protocols across Gujarat and Indian metros.',
};

export default function ShippingPolicyPage() {
  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-12 max-w-4xl space-y-10">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Shipping Policy', url: '/shipping-policy' },
        ]}
      />

      <div className="space-y-2 border-b border-[#E7E2D9] pb-6">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0B7A55] font-heading">
          <Truck className="h-4 w-4" /> Logistics &amp; Transport
        </div>
        <h1 className="text-3xl font-extrabold font-heading tracking-tight text-[#14201B]">
          Shipping &amp; Site Delivery Policy
        </h1>
        <p className="text-xs text-[#5B6660]">
          Last updated: November 2026 • Applicable across all online and quotation orders
        </p>
      </div>

      <div className="space-y-8 text-xs sm:text-sm text-[#14201B] leading-relaxed">
        {/* Section 1 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold font-heading text-[#14201B] flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#0B7A55]" />
            1. Transit Timelines &amp; Dispatch Zones
          </h2>
          <p>
            All surface materials are dispatched directly from our central fulfillment depot in Ahmedabad, Gujarat. Transit timelines depend on the destination pincode:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-[#5B6660]">
            <li>
              <strong>Gujarat Intra-State (Ahmedabad, Surat, Vadodara, Rajkot, Bhavnagar):</strong> 24 to 48 business hours via dedicated local crated courier.
            </li>
            <li>
              <strong>Major Metros (Mumbai, Pune, Delhi NCR, Bengaluru, Hyderabad):</strong> 3 to 5 business days via express surface logistics.
            </li>
            <li>
              <strong>Rest of India:</strong> 5 to 7 business days depending on road freight connectivity.
            </li>
          </ul>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold font-heading text-[#14201B] flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#0B7A55]" />
            2. Free Shipping Threshold &amp; Freight Charges
          </h2>
          <p>
            Standard retail orders with an aggregate cart value of <strong>₹5,000 (500,000 paise)</strong> or higher qualify for complimentary free shipping, provided the shipment contains no heavy freight items.
          </p>
          <p className="text-xs text-[#5B6660]">
            For orders below ₹5,000, freight is calculated dynamically at checkout based on destination distance and gross volumetric weight.
          </p>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold font-heading text-[#14201B] flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#0B7A55]" />
            3. Heavy Material Packaging &amp; Corner Crating
          </h2>
          <p>
            Laminates and plywood sheets are vulnerable to edge impact during road transit. To guarantee zero edge damage:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-[#5B6660]">
            <li>
              Every laminate order is packed with heavy-duty corrugated corner protectors and high-density polyethylene (HDPE) moisture barrier wrap.
            </li>
            <li>
              Plywood orders and exterior compact claddings (6.0mm) are shipped in reinforced wooden pallet frames.
            </li>
            <li>
              Heavy items incur a dedicated handling charge per unit (clearly displayed in the cart and pincode checker) to cover specialized crating and unloading equipment.
            </li>
          </ul>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold font-heading text-[#14201B]">4. Site Delivery &amp; Unloading Guidelines</h2>
          <p>
            Standard shipping includes curbside delivery to the accessible vehicle drop-off point at the destination address. Customers, contractors, or site supervisors must ensure adequate labor is available at the delivery location for unloading heavy sheets.
          </p>
          <p className="text-xs text-[#5B6660]">
            For large commercial orders exceeding 50 sheets requiring hydraulic tailgate cranes, please contact our logistics desk prior to dispatch to schedule dedicated transport.
          </p>
        </div>
      </div>
    </div>
  );
}

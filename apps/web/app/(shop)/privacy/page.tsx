import type { Metadata } from 'next';
import { ShieldCheck, Lock, Eye, Database } from 'lucide-react';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'Privacy Policy - Lammart Data Protection & Security',
  description:
    'Understand how Lammart protects your customer data, business GSTIN, shipping information, and online transactions.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-12 max-w-4xl space-y-10">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Privacy Policy', url: '/privacy' },
        ]}
      />

      <div className="space-y-2 border-b border-[#E7E2D9] pb-6">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0B7A55] font-heading">
          <ShieldCheck className="h-4 w-4" /> Data Protection
        </div>
        <h1 className="text-3xl font-extrabold font-heading tracking-tight text-[#14201B]">
          Privacy Policy
        </h1>
        <p className="text-xs text-[#5B6660]">
          Last updated: November 2026 • Compliant with Indian Information Technology Act (IT Act)
        </p>
      </div>

      <div className="space-y-8 text-xs sm:text-sm text-[#14201B] leading-relaxed">
        {/* Section 1 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold font-heading text-[#14201B] flex items-center gap-2">
            <Database className="h-4 w-4 text-[#0B7A55]" />
            1. Information Collected &amp; Purpose of Processing
          </h2>
          <p>
            When you register, place orders, or request quotations on Lammart, we collect necessary business details to fulfill our statutory and logistics commitments:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-[#5B6660]">
            <li>
              <strong>Identity &amp; Contact:</strong> Full name, phone number, and email address for order status and delivery updates.
            </li>
            <li>
              <strong>Delivery Location:</strong> Physical site address, city, state, and 6-digit Indian PIN code for road freight routing.
            </li>
            <li>
              <strong>B2B Tax Details:</strong> Business GSTIN and legal trade name for issuing GST-compliant tax invoices and E-Way bills.
            </li>
          </ul>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold font-heading text-[#14201B] flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#0B7A55]" />
            2. Payment Security &amp; Zero Storage of Financial Credentials
          </h2>
          <p>
            All digital payments on Lammart are processed through <strong>Razorpay</strong>, a certified PCI-DSS Level 1 compliant payment gateway.
          </p>
          <p className="text-xs text-[#5B6660]">
            Lammart <strong>never</strong> stores, logs, or views your credit/debit card numbers, CVVs, or NetBanking passwords on our servers. All transaction payloads are encrypted end-to-end via 256-bit TLS/SSL encryption.
          </p>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold font-heading text-[#14201B] flex items-center gap-2">
            <Eye className="h-4 w-4 text-[#0B7A55]" />
            3. Session Cookies &amp; Local Persistence
          </h2>
          <p>
            We use secure cookies and browser local storage strictly for essential website functionality:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-[#5B6660]">
            <li>
              <strong>Authentication:</strong> Secure httpOnly JWT cookies protecting customer and administrator sessions against cross-site scripting (XSS).
            </li>
            <li>
              <strong>Cart &amp; Logistics:</strong> Browser local storage for persisting shopping bag items and your verified serviceable pincode.
            </li>
          </ul>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold font-heading text-[#14201B]">4. Third-Party Sharing &amp; Data Rights</h2>
          <p>
            We strictly do not sell, rent, or trade your personal or commercial contact information to third-party marketing brokers. Your delivery information is shared solely with certified transport couriers to facilitate site delivery.
          </p>
          <p className="text-xs text-[#5B6660]">
            For data access inquiries or account removal, contact our data protection desk at privacy@lammart.com.
          </p>
        </div>
      </div>
    </div>
  );
}

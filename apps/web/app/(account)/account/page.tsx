import type { Metadata } from 'next';
import Link from 'next/link';
import { User, ShieldCheck, Clock, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Customer Account - Lammart',
  description: 'Manage your profile, saved addresses, and order history.',
};

export default function AccountPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl space-y-8">
      <div className="flex items-center gap-3 border-b border-zinc-200 pb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold text-lg">
          <User className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950">Customer Account</h1>
          <p className="text-xs text-zinc-500">Manage your profile, business GSTIN, and orders</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h3 className="font-bold text-sm text-zinc-950">Profile &amp; GSTIN</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Manage your registered phone number, email, and business GSTIN for tax input credit.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2">
          <Clock className="h-5 w-5 text-emerald-600" />
          <h3 className="font-bold text-sm text-zinc-950">Order History</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Track site deliveries, shipment status, and download GST-compliant PDF tax invoices.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2">
          <FileText className="h-5 w-5 text-emerald-600" />
          <h3 className="font-bold text-sm text-zinc-950">Bulk Quotations</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Review your approved wholesale project quotes and material swatch requests.
          </p>
        </div>
      </div>
    </div>
  );
}

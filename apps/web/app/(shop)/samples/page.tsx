import type { Metadata } from 'next';
import { Layers } from 'lucide-react';
import { ContactForm } from '@/components/contact/contact-form';

export const metadata: Metadata = {
  title: 'Order Free Sample Swatches - Lammart',
  description: 'Order physical material swatches delivered directly to your site or design office.',
};

export default function SamplesPage() {
  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-12 max-w-4xl space-y-8">
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF5EF] border border-[#0B7A55]/30 px-3.5 py-1 text-xs font-semibold text-[#0B7A55]">
          <Layers className="h-3.5 w-3.5 text-[#0B7A55]" />
          <span>Physical Material Samples</span>
        </div>
        <h1 className="text-3xl font-black font-heading text-[#14201B]">Complimentary Sample Swatches</h1>
        <p className="text-xs sm:text-sm text-[#5B6660]">
          Architects, designers, and contractors can request up to 5 material swatches to evaluate texture, grain depth, and light reflection.
        </p>
      </div>

      <div className="rounded-16 border border-[#E7E2D9] bg-white p-6 sm:p-8 shadow-card">
        <ContactForm />
      </div>
    </div>
  );
}

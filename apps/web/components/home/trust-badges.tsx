import * as React from 'react';
import { Award, Truck, ShieldCheck, Layers } from 'lucide-react';

const TRUST_POINTS = [
  {
    icon: Award,
    title: '100% Genuine Brands',
    description: 'Direct factory partnerships with Greenlam, CenturyPly, Merino, and Royale Touche. Zero counterfeit guarantee.',
  },
  {
    icon: Truck,
    title: 'Direct Crated Site Delivery',
    description: 'Engineered wooden corner crating preventing edge damage and moisture during road transit across Gujarat and Indian metros.',
  },
  {
    icon: ShieldCheck,
    title: 'Wholesale & B2B Rates',
    description: 'Volume discount tiers with 18% GST tax input credit invoices for interior contractors, architects, and institutions.',
  },
  {
    icon: Layers,
    title: 'Free Sample Swatches',
    description: 'Order up to 5 physical material swatches delivered directly to your office or client presentation site.',
  },
];

export function TrustBadges() {
  return (
    <section className="max-w-[1360px] mx-auto px-4 sm:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 rounded-16 bg-white p-8 sm:p-10 border border-[#E7E2D9] shadow-card">
        {TRUST_POINTS.map((point) => {
          const Icon = point.icon;
          return (
            <div
              key={point.title}
              className="flex flex-col items-center text-center sm:items-start sm:text-left gap-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B7A55] text-white shadow-xs">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold font-heading text-[#14201B] text-sm">{point.title}</h3>
                <p className="text-xs text-[#5B6660] mt-1.5 leading-relaxed">
                  {point.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

import * as React from 'react';
import { MessageCircle } from 'lucide-react';
import { ProductVariant } from '@lammart/shared';
import { getWhatsAppEnquiryUrl } from '@/lib/utils';

export function WhatsAppCTA({
  productName,
  selectedVariant,
  slug,
}: {
  productName: string;
  selectedVariant: ProductVariant;
  slug: string;
}) {
  const whatsappUrl = getWhatsAppEnquiryUrl({
    productName,
    designCode: selectedVariant.designCode,
    sku: selectedVariant.sku,
    optionLabel: selectedVariant.optionLabel,
    slug,
  });

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2.5 w-full rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white px-5 py-3 text-sm font-bold shadow-md shadow-[#25D366]/25 transition-all cursor-pointer"
    >
      <MessageCircle className="h-5 w-5 fill-white" />
      <span>Quick Inquiry on WhatsApp</span>
    </a>
  );
}

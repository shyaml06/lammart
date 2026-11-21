/* eslint-disable @next/next/no-img-element */
'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShoppingBag, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@lammart/shared';
import { calculateDualPrice } from '@/lib/utils';

export function ProductCard({ product }: { product: Product }) {
  const [imageError, setImageError] = React.useState(false);
  const primaryVariant = product.variants?.[0];
  const primaryImage = product.images?.[0];
  const designCode = primaryVariant?.designCode;
  const thickness = primaryVariant?.attributes?.thickness || '1.0mm';

  const pricePaise = primaryVariant?.price || product.fromPrice || 0;
  const unit = product.unit || 'sheet';
  const dualPricing = calculateDualPrice(
    pricePaise,
    unit,
    primaryVariant?.attributes?.size,
    primaryVariant?.optionLabel
  );

  const stock = primaryVariant?.stock ?? 50;
  const isOutOfStock = stock <= 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) {
      toast.error('Item is currently out of stock');
      return;
    }

    try {
      const stored = localStorage.getItem('lammart_cart');
      let cart = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(cart)) cart = [];

      const existingIndex = cart.findIndex(
        (item: any) => item.variantId === (primaryVariant?.id || product.id)
      );

      if (existingIndex >= 0) {
        cart[existingIndex].qty = (cart[existingIndex].qty || 1) + 1;
      } else {
        cart.push({
          id: Date.now(),
          variantId: primaryVariant?.id || product.id,
          productId: product.id,
          qty: primaryVariant?.moq || 1,
          productName: product.name,
          sku: primaryVariant?.sku || product.slug,
          price: pricePaise,
          unit: product.unit,
          designCode,
        });
      }

      localStorage.setItem('lammart_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cart-updated'));
      toast.success(`Added ${product.name} to cart!`);
    } catch {
      toast.error('Failed to update cart');
    }
  };

  const handleFreeSwatch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast.success(`Swatch for ${designCode ? `#${designCode}` : product.name} added to sample list!`);
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-16 border border-[#E7E2D9] bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      <div>
        {/* Swatch container: 210px height with #code pill on top-left and thickness on top-right */}
        <Link
          href={`/p/${product.slug}`}
          className="relative block h-[210px] w-full overflow-hidden rounded-xl bg-[#FAF8F4] border border-[#E7E2D9]"
        >
          {primaryImage && !imageError ? (
            <img
              src={primaryImage.path}
              alt={primaryImage.alt || product.name}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            // Texture Fallback
            <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#0F1A15] via-[#14201B] to-[#0F1A15] text-white relative">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#0B7A55_1.5px,transparent_1.5px)] [background-size:14px_14px]" />
              <Layers className="h-8 w-8 text-[#0B7A55] mb-2 relative z-10" />
              <span className="font-mono text-xs font-bold text-[#EAF5EF] relative z-10">
                {designCode ? `#${designCode}` : product.slug.slice(0, 8)}
              </span>
              <span className="text-[10px] text-[#D9D3C7] uppercase tracking-wider mt-1 text-center relative z-10 line-clamp-1">
                {product.brand?.name || 'Lammart'}
              </span>
            </div>
          )}

          {/* Top-Left #code pill: white bg, #14201B text */}
          {designCode && (
            <div className="absolute top-2.5 left-2.5 rounded-md bg-white px-2 py-0.5 text-[11px] font-mono font-bold text-[#14201B] shadow-xs z-10 border border-[#E7E2D9]">
              #{designCode}
            </div>
          )}

          {/* Top-Right thickness pill: rgba(20,32,27,.72) bg, white text */}
          <div className="absolute top-2.5 right-2.5 rounded-md bg-[#14201B]/75 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs z-10">
            {thickness}
          </div>

          {/* Out of Stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center z-20">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                Out of Stock
              </span>
            </div>
          )}
        </Link>

        {/* Content Details */}
        <div className="mt-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-[#5B6660]">
            <span className="font-medium">{product.brand?.name || 'Lammart'}</span>
            <span className="flex items-center gap-1 font-medium">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isOutOfStock ? 'bg-rose-500' : 'bg-[#0B7A55]'
                }`}
              />
              {isOutOfStock ? 'Out of stock' : `In Stock (${stock})`}
            </span>
          </div>

          <h3 className="font-heading font-bold text-[#14201B] text-sm line-clamp-2 leading-snug group-hover:text-[#0B7A55] transition-colors">
            <Link href={`/p/${product.slug}`}>{product.name}</Link>
          </h3>
        </div>
      </div>

      {/* Pricing & Dual Action Buttons */}
      <div className="mt-4 pt-3 border-t border-[#E7E2D9] space-y-3">
        <div>
          <div className="text-base font-extrabold text-[#14201B] font-mono leading-tight">
            {dualPricing.primaryFormatted}
          </div>
          {dualPricing.isDual && dualPricing.secondaryFormatted && (
            <div className="text-[11px] font-semibold text-[#0B7A55] bg-[#EAF5EF] px-2 py-0.5 rounded inline-block mt-0.5 border border-[#0B7A55]/20">
              {dualPricing.secondaryFormatted}
            </div>
          )}
        </div>

        {/* Dual buttons: "Free swatch" (outline #0B7A55) and "Add to cart" (solid #0B7A55) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleFreeSwatch}
            className="h-9 rounded-xl border border-[#0B7A55] bg-transparent text-[11px] font-bold text-[#0B7A55] hover:bg-[#EAF5EF] transition-colors cursor-pointer"
          >
            Free swatch
          </button>
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleQuickAdd}
            className="h-9 rounded-xl bg-[#0B7A55] hover:bg-[#086143] disabled:opacity-40 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Add to cart</span>
          </button>
        </div>
      </div>
    </div>
  );
}

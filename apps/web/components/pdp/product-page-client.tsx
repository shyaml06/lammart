'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShoppingBag, ChevronRight, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Product, ProductVariant } from '@lammart/shared';
import { ProductGallery } from './product-gallery';
import { VariantSelector } from './variant-selector';
import { DualPricing } from './dual-pricing';
import { PincodeWidget } from './pincode-widget';
import { WhatsAppCTA } from './whatsapp-cta';
import { PriceTiersTable } from './price-tiers-table';
import { TechnicalSpecs } from './technical-specs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function ProductPageClient({ product }: { product: Product }) {
  const initialVariant = product.variants?.[0] || {
    id: product.id,
    productId: product.id,
    sku: product.slug,
    price: product.fromPrice || 0,
    stock: 50,
    moq: 1,
    isActive: true,
  };

  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariant>(initialVariant);
  const [quantity, setQuantity] = React.useState(selectedVariant.moq || 1);

  // When variant changes, update quantity if below MOQ
  const handleVariantSelect = (v: ProductVariant) => {
    setSelectedVariant(v);
    if (quantity < v.moq) {
      setQuantity(v.moq);
    }
  };

  const isOutOfStock = selectedVariant.stock <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error('Item is currently out of stock');
      return;
    }

    try {
      const stored = localStorage.getItem('lammart_cart');
      let cart = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(cart)) cart = [];

      const existingIndex = cart.findIndex((item: any) => item.variantId === selectedVariant.id);
      if (existingIndex >= 0) {
        cart[existingIndex].qty += quantity;
      } else {
        cart.push({
          id: Date.now(),
          variantId: selectedVariant.id,
          productId: product.id,
          qty: quantity,
          productName: product.name,
          sku: selectedVariant.sku,
          price: selectedVariant.price,
          unit: product.unit,
          designCode: selectedVariant.designCode,
          optionLabel: selectedVariant.optionLabel,
        });
      }

      localStorage.setItem('lammart_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cart-updated'));
      toast.success(`Added ${quantity} ${product.unit || 'item'}(s) to cart!`);
    } catch {
      toast.error('Failed to add item to cart');
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-8 space-y-12">
      {/* Breadcrumb Trail */}
      <nav className="flex items-center gap-1.5 text-xs text-[#5B6660] overflow-x-auto whitespace-nowrap">
        <Link href="/" className="hover:text-[#0B7A55] transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3 w-3 text-[#5B6660]/60 shrink-0" />
        {product.category && (
          <>
            <Link
              href={`/c/${product.category.slug}`}
              className="hover:text-[#0B7A55] transition-colors"
            >
              {product.category.name}
            </Link>
            <ChevronRight className="h-3 w-3 text-[#5B6660]/60 shrink-0" />
          </>
        )}
        <span className="font-semibold text-[#14201B] truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Two Column PDP Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Gallery (5 cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-28">
            <ProductGallery
              images={product.images || []}
              productName={product.name}
              designCode={selectedVariant.designCode}
              activeVariantId={selectedVariant.id}
            />
          </div>
        </div>

        {/* Right Column: Buying Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header & Badges */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {product.brand && (
                <span className="rounded-lg bg-white border border-[#E7E2D9] px-2.5 py-0.5 text-xs font-semibold text-[#14201B]">
                  {product.brand.name}
                </span>
              )}
              {selectedVariant.designCode && (
                <span className="rounded-lg bg-[#EAF5EF] border border-[#0B7A55]/30 px-2.5 py-0.5 text-xs font-mono font-bold text-[#0B7A55]">
                  Design #{selectedVariant.designCode}
                </span>
              )}
              <span className="text-xs text-[#5B6660]">
                HSN: <strong className="text-[#14201B]">{product.hsnCode}</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight text-[#14201B] leading-tight">
              {product.name}
            </h1>

            {product.description && (
              <p className="mt-3 text-xs sm:text-sm text-[#5B6660] leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          {/* Pricing Box */}
          <DualPricing
            price={selectedVariant.price}
            mrp={selectedVariant.mrp}
            unit={product.unit}
            sizeAttr={selectedVariant.attributes?.size}
            optionLabel={selectedVariant.optionLabel}
          />

          {/* Variant Selector */}
          <VariantSelector
            variants={product.variants || []}
            selectedVariant={selectedVariant}
            onSelect={handleVariantSelect}
          />

          {/* Quantity Selector & Add to Cart Action */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Stepper */}
              <div className="flex items-center rounded-xl border border-[#D9D3C7] bg-white p-1 shadow-xs shrink-0 self-start">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(selectedVariant.moq || 1, q - 1))}
                  disabled={quantity <= (selectedVariant.moq || 1)}
                  className="rounded-lg p-2 text-[#5B6660] hover:bg-[#FAF8F4] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center text-sm font-bold font-mono text-[#14201B]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(selectedVariant.stock, q + 1))}
                  disabled={quantity >= selectedVariant.stock}
                  className="rounded-lg p-2 text-[#5B6660] hover:bg-[#FAF8F4] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <Button
                size="lg"
                variant={isOutOfStock ? 'secondary' : 'default'}
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="flex-1 text-sm font-bold gap-2 h-12 shadow-xs"
              >
                <ShoppingBag className="h-5 w-5" />
                {isOutOfStock ? 'Currently Out of Stock' : `Add to Cart • ${(quantity * selectedVariant.price / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`}
              </Button>
            </div>

            {/* WhatsApp Enquiry Button */}
            <WhatsAppCTA
              productName={product.name}
              selectedVariant={selectedVariant}
              slug={product.slug}
            />
          </div>

          {/* Pincode Serviceability Widget */}
          <PincodeWidget isHeavy={product.isHeavy} />
        </div>
      </div>

      {/* Bottom Technical & Volume Pricing Sections */}
      <div className="space-y-8 pt-8 border-t border-[#E7E2D9]">
        <PriceTiersTable variant={selectedVariant} unit={product.unit} />
        <TechnicalSpecs product={product} variant={selectedVariant} />
      </div>
    </div>
  );
}

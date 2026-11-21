/* eslint-disable @next/next/no-img-element */
'use client';

import * as React from 'react';
import { Layers, ZoomIn, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductImage } from '@lammart/shared';

export function ProductGallery({
  images,
  productName,
  designCode,
  activeVariantId,
}: {
  images: ProductImage[];
  productName: string;
  designCode?: string;
  activeVariantId?: number;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isZoomed, setIsZoomed] = React.useState(false);
  const [mousePos, setMousePos] = React.useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [imgError, setImgError] = React.useState<Record<number, boolean>>({});

  // Sync image if variant has associated image
  React.useEffect(() => {
    if (activeVariantId && images.length > 0) {
      const variantImgIndex = images.findIndex((img) => img.variantId === activeVariantId);
      if (variantImgIndex >= 0) {
        setActiveIndex(variantImgIndex);
      }
    }
  }, [activeVariantId, images]);

  const activeImage = images[activeIndex];
  const hasImages = images.length > 0 && !imgError[activeIndex];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  return (
    <div className="space-y-4">
      {/* Main Viewport Container */}
      <div
        className="relative aspect-square w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 cursor-crosshair select-none group"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
        onClick={() => setLightboxOpen(true)}
      >
        {hasImages && activeImage ? (
          <img
            src={activeImage.path}
            alt={activeImage.alt || productName}
            onError={() => setImgError((prev) => ({ ...prev, [activeIndex]: true }))}
            style={{
              transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
              transform: isZoomed ? 'scale(2.2)' : 'scale(1)',
              transition: isZoomed ? 'none' : 'transform 0.2s ease-out',
            }}
            className="h-full w-full object-cover object-center pointer-events-none"
          />
        ) : (
          // Elegant SVG Grain/Pattern Texture Swatch Fallback
          <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-emerald-950 via-zinc-900 to-zinc-950 text-white relative">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
            <Layers className="h-16 w-16 text-emerald-400 mb-4 relative z-10" />
            <span className="font-mono text-xl font-bold text-emerald-300 relative z-10">
              {designCode ? `Design #${designCode}` : 'Surface Swatch'}
            </span>
            <p className="text-xs text-zinc-400 mt-2 text-center max-w-xs relative z-10">
              High-definition full size 8x4 ft sheet available at Ahmedabad showroom
            </p>
          </div>
        )}

        {/* Hover zoom hint badge */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-xs px-3 py-1 text-[11px] font-semibold text-white pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="h-3.5 w-3.5" />
          <span>Hover to Zoom / Click for Full View</span>
        </div>
      </div>

      {/* Thumbnails Row */}
      {images.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {images.map((img, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={img.id || idx}
                onClick={() => setActiveIndex(idx)}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-zinc-200 hover:border-zinc-300 opacity-70 hover:opacity-100'
                }`}
              >
                {!imgError[idx] ? (
                  <img
                    src={img.path}
                    alt={img.alt || `Thumbnail ${idx + 1}`}
                    onError={() => setImgError((prev) => ({ ...prev, [idx]: true }))}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-zinc-900 flex items-center justify-center text-[10px] text-emerald-400 font-mono">
                    #{designCode || idx + 1}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && hasImages && activeImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <img
            src={activeImage.path}
            alt={activeImage.alt || productName}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

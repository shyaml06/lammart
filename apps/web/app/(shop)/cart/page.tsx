'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShoppingBag, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';
import { formatPrice } from '@/lib/formatters';
import { Button } from '@/components/ui/button';

export default function CartPage() {
  const [items, setItems] = React.useState<any[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('lammart_cart');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleRemove = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    localStorage.setItem('lammart_cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const handleClear = () => {
    setItems([]);
    localStorage.removeItem('lammart_cart');
    window.dispatchEvent(new Event('cart-updated'));
  };

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-xs text-zinc-400">
        Loading cart...
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl space-y-8">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-emerald-600" />
          <span>Shopping Cart</span>
        </h1>
        {items.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
          >
            Clear Cart
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center space-y-4">
          <ShoppingBag className="h-12 w-12 text-zinc-300 mx-auto" />
          <h2 className="text-base font-bold text-zinc-900">Your cart is currently empty</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Browse our catalog of premium laminates, plywood sheets, and architectural hardware to add items.
          </p>
          <Link
            href="/c/laminates"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-600 transition-colors"
          >
            <span>Explore Catalog</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden divide-y divide-zinc-200 shadow-xs">
            {items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900">{item.productName}</span>
                    {item.designCode && (
                      <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        #{item.designCode}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500">
                    SKU: {item.sku} • {item.optionLabel || 'Standard'}
                  </div>
                  <div className="text-xs font-semibold text-zinc-900">
                    Quantity: {item.qty} {item.unit || 'unit'}(s) @ {formatPrice(item.price)}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                  <span className="text-base font-extrabold text-zinc-950 font-mono">
                    {formatPrice(item.price * item.qty)}
                  </span>
                  <button
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-zinc-500">Estimated Subtotal (18% GST Inclusive)</span>
              <div className="text-2xl font-black text-zinc-950 font-mono">{formatPrice(subtotal)}</div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link
                href="/c/laminates"
                className="flex-1 sm:flex-none text-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors"
              >
                Continue Shopping
              </Link>
              <Link
                href="/quote"
                className="flex-1 sm:flex-none text-center rounded-lg bg-emerald-500 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-600 transition-colors"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

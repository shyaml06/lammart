'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export function CartButton() {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    // Read cart count from localStorage if present
    const checkCart = () => {
      try {
        const stored = localStorage.getItem('lammart_cart');
        if (stored) {
          const items = JSON.parse(stored);
          if (Array.isArray(items)) {
            const total = items.reduce((sum, item) => sum + (item.qty || 1), 0);
            setCount(total);
          }
        }
      } catch {
        // Ignore
      }
    };

    checkCart();
    window.addEventListener('storage', checkCart);
    window.addEventListener('cart-updated', checkCart);
    return () => {
      window.removeEventListener('storage', checkCart);
      window.removeEventListener('cart-updated', checkCart);
    };
  }, []);

  return (
    <Link
      href="/cart"
      className="relative flex items-center justify-center rounded-lg p-2 text-zinc-700 hover:bg-zinc-100 hover:text-emerald-600 transition-colors"
      aria-label="Shopping Cart"
    >
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-xs animate-in zoom-in">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

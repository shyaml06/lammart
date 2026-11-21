import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        brand: 'border-zinc-200 bg-zinc-100 text-zinc-800',
        designCode: 'border-emerald-300 bg-emerald-100 text-emerald-900 font-mono font-bold tracking-tight',
        stock: 'border-transparent bg-emerald-500 text-white',
        outOfStock: 'border-rose-200 bg-rose-50 text-rose-700',
        secondary: 'border-transparent bg-zinc-100 text-zinc-900',
        outline: 'text-zinc-900 border-zinc-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

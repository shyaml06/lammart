import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B7A55] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-[#0B7A55] text-white shadow-xs hover:bg-[#086143] active:bg-[#064932]',
        secondary: 'bg-[#EAF5EF] text-[#0B7A55] hover:bg-[#d5ece0] active:bg-[#c2e3d2]',
        outline: 'border border-[#0B7A55] bg-transparent text-[#0B7A55] hover:bg-[#EAF5EF]',
        dark: 'bg-[#0F1A15] text-[#E6EFEA] hover:bg-[#1a2d24]',
        ghost: 'text-[#14201B] hover:bg-[#EAF5EF] hover:text-[#0B7A55]',
        destructive: 'bg-rose-600 text-white hover:bg-rose-700',
        link: 'text-[#0B7A55] underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-9 rounded-lg px-3.5 text-xs',
        lg: 'h-12 rounded-xl px-7 text-base font-bold',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

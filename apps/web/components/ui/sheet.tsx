'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheet() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error('Sheet components must be used within a Sheet');
  }
  return context;
}

export function Sheet({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const onOpenChange = setControlledOpen || setUncontrolledOpen;

  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({
  asChild,
  children,
  className,
  ...props
}: {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  const { onOpenChange } = useSheet();
  return (
    <div
      onClick={() => onOpenChange(true)}
      className={cn('inline-block cursor-pointer', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function SheetContent({
  side = 'right',
  className,
  children,
}: {
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  children: React.ReactNode;
}) {
  const { open, onOpenChange } = useSheet();

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const sideClasses = {
    top: 'inset-x-0 top-0 border-b animate-in slide-in-from-top',
    bottom: 'inset-x-0 bottom-0 border-t animate-in slide-in-from-bottom',
    left: 'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r animate-in slide-in-from-left',
    right: 'inset-y-0 right-0 h-full w-full max-w-md border-l animate-in slide-in-from-right',
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed z-50 bg-white p-6 shadow-xl transition ease-in-out duration-300 flex flex-col',
          sideClasses[side],
          className
        )}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm p-1 text-zinc-400 hover:text-zinc-950 focus:outline-none"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-2 text-left mb-4', className)}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-lg font-bold text-zinc-950', className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-zinc-500', className)}
      {...props}
    />
  );
}

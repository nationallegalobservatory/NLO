'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap border font-technical-ui text-xs font-bold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'border-oxblood bg-oxblood text-white hover:bg-on-background dark:border-primary dark:bg-primary dark:text-background dark:hover:bg-tertiary-fixed',
        secondary:
          'border-outline-variant bg-surface-container-lowest text-on-background hover:border-oxblood hover:text-oxblood dark:border-primary/25 dark:bg-surface-container-low dark:text-on-background dark:hover:border-primary dark:hover:text-primary',
        ghost:
          'border-transparent bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-background dark:text-on-background/60 dark:hover:bg-surface-container dark:hover:text-on-background',
        destructive:
          'border-error bg-error text-on-error hover:bg-error/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-[10px]',
        icon: 'h-9 w-9 p-0',
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
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };

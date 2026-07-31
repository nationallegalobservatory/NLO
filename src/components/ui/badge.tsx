import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center border px-2 py-0.5 font-technical-ui text-[10px] font-bold uppercase tracking-[0.14em]',
  {
    variants: {
      variant: {
        default:
          'border-oxblood/25 bg-oxblood/10 text-oxblood dark:border-primary/30 dark:bg-primary/10 dark:text-primary',
        success:
          'border-emerald-700/25 bg-emerald-700/10 text-emerald-800 dark:text-emerald-300',
        warning:
          'border-amber-700/25 bg-amber-700/10 text-amber-800 dark:text-amber-300',
        error:
          'border-error/25 bg-error/10 text-error dark:text-error-container',
        muted:
          'border-outline-variant bg-surface-container-low text-on-surface-variant dark:border-primary/20 dark:bg-surface-container dark:text-on-background/55',
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

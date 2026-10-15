/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';
import { cn, cva, type VariantProps } from '../../lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
  {
    variants: {
      variant: {
        default:
          'border-primary/25 bg-primary/10 text-primary dark:border-primary/40 dark:bg-primary/20 dark:text-indigo-300',
        primary:
          'border-primary/25 bg-primary/10 text-primary dark:border-primary/40 dark:bg-primary/20 dark:text-indigo-300',
        indigo:
          'border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/20 dark:text-indigo-300',
        secondary:
          'border-border bg-secondary text-secondary-foreground',
        neutral:
          'border-border bg-muted text-muted-foreground',
        success:
          'border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300',
        approved:
          'border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300',
        warning:
          'border-amber-600/25 bg-amber-500/10 text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-300',
        pending:
          'border-amber-600/25 bg-amber-500/10 text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-300',
        destructive:
          'border-rose-600/25 bg-rose-500/10 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-300',
        danger:
          'border-rose-600/25 bg-rose-500/10 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-300',
        purple:
          'border-purple-600/25 bg-purple-500/10 text-purple-700 dark:border-purple-500/35 dark:bg-purple-500/15 dark:text-purple-300',
        cyan:
          'border-sky-600/25 bg-sky-500/10 text-sky-700 dark:border-cyan-500/35 dark:bg-cyan-500/15 dark:text-cyan-300',
        info:
          'border-sky-600/25 bg-sky-500/10 text-sky-700 dark:border-cyan-500/35 dark:bg-cyan-500/15 dark:text-cyan-300',
        outline:
          'border-border bg-transparent text-foreground',
      },
      size: {
        sm: 'px-2 py-0.5 text-[11px] leading-4',
        md: 'px-2.5 py-0.5 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

const badge = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', {
  variants: {
    tone: {
      info: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
      success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export function Badge({ tone, className, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}

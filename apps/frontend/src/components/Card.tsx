import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('tm-card min-w-0 rounded-2xl border p-5 sm:p-6', className)} {...props} />
  );
}
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold leading-relaxed', className)} {...props} />;
}

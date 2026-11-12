import { Inbox } from 'lucide-react';
import { cn } from '../lib/cn';
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800',
        className ?? 'h-4 w-full',
      )}
    />
  );
}
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div
      role="status"
      className="tm-empty flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-center"
    >
      <span className="tm-icon-tile mb-2">
        <Inbox className="size-5" aria-hidden="true" />
      </span>
      <p className="font-semibold">{title}</p>
      {hint && <p className="tm-muted max-w-md text-sm leading-relaxed">{hint}</p>}
    </div>
  );
}

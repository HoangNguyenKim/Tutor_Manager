import { cn } from '../lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-slate-200 dark:bg-slate-800', className ?? 'h-4 w-full')} />;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
      <p className="font-medium">{title}</p>
      {hint ? <p className="text-sm text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

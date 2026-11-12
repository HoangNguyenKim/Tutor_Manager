import type { ReactNode } from 'react';
import { vi } from '../i18n';

export function Page({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:gap-6 lg:p-9">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-2xl font-semibold tracking-tight">{title}</h2>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function SkipLink() {
  return (
    <a
      href="#main"
      onClick={(event) => {
        event.preventDefault();
        document.getElementById('main')?.focus();
      }}
      className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-sky-600 focus:px-3 focus:py-2 focus:text-white"
    >
      {vi.skipToContent}
    </a>
  );
}

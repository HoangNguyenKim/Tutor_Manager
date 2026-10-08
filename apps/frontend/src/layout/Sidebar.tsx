import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock3,
  LayoutDashboard,
  Settings as SettingsIcon,
  Users,
  Wallet,
} from 'lucide-react';
import { routes, vi, type RouteKey } from '../i18n';
import { cn } from '../lib/cn';

const icons: Record<RouteKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  students: Users,
  calendar: CalendarDays,
  hours: Clock3,
  tuition: Wallet,
  reports: BarChart3,
  settings: SettingsIcon,
};

export function Sidebar({ route, onNavigate }: { route: RouteKey; onNavigate: (r: RouteKey) => void }) {
  return (
    <nav aria-label="Điều hướng chính" className="flex h-full flex-col gap-1 p-3">
      <div className="flex items-center gap-2 px-2 py-3">
        <BookOpen className="size-5 text-sky-600" aria-hidden="true" />
        <span className="truncate text-sm font-bold">{vi.appName}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {routes.map((r) => {
          const Icon = icons[r.key];
          const active = r.key === route;
          return (
            <li key={r.key}>
              <a
                href={r.hash}
                aria-current={active ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(r.key);
                }}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-sky-100 font-medium text-sky-900 dark:bg-sky-900 dark:text-sky-100'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{vi[r.key]}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

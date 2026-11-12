import {
  ArrowUpRight,
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
export function Sidebar({
  route,
  onNavigate,
}: {
  route: RouteKey;
  onNavigate: (route: RouteKey) => void;
}) {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="tm-sidebar flex h-full flex-col gap-1 overflow-y-auto p-4"
    >
      <div className="mb-7 mt-3 flex items-center gap-3 px-2">
        <span className="tm-brand-icon">
          <BookOpen className="size-6" aria-hidden="true" />
        </span>
        <div>
          <span className="text-sm font-bold tracking-tight">{vi.appName}</span>
          <p className="tm-muted mt-1 text-xs">Không gian gia sư</p>
        </div>
      </div>
      <p className="tm-eyebrow mb-3 px-3">QUẢN LÝ DẠY HỌC</p>
      <ul className="flex flex-col gap-1.5">
        {routes.map((routeItem) => {
          const Icon = icons[routeItem.key];
          const active = routeItem.key === route;
          return (
            <li key={routeItem.key}>
              <a
                href={routeItem.hash}
                aria-current={active ? 'page' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(routeItem.key);
                }}
                className={cn(
                  'tm-nav-link flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors',
                  active && 'tm-nav-active',
                )}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                <span className="truncate">{vi[routeItem.key]}</span>
                {active && <span aria-hidden="true" className="tm-nav-dot ml-auto" />}
              </a>
            </li>
          );
        })}
      </ul>
      <div className="tm-sidebar-note mt-auto rounded-2xl border p-4">
        <CalendarDays className="mb-3 size-5" aria-hidden="true" />
        <p className="text-sm font-medium">Một lịch dạy ngăn nắp.</p>
        <p className="tm-muted mt-2 text-xs leading-relaxed">
          Dành nhiều thời gian hơn cho việc giảng dạy.
        </p>
        <a
          href="#/calendar"
          className="tm-text-link mt-4 inline-flex items-center gap-1 text-xs font-semibold"
        >
          Lịch của bạn <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </nav>
  );
}

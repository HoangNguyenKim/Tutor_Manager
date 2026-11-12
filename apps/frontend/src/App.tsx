import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchHealth } from './api/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './layout/Header';
import { SkipLink } from './layout/Page';
import { Sidebar } from './layout/Sidebar';
import { SettingsPage } from './pages/pages';
import { DashboardPage } from './dashboard/DashboardPage';
import { ReportsPage } from './reports/ReportsPage';
import { TuitionPage } from './tuition/TuitionPage';
import { HoursPage } from './hours/HoursPage';
import { CalendarPage as LessonsCalendarPage } from './calendar/CalendarPage';
import { StudentsPage } from './students/StudentsPage';
import { routeFromHash, t, vi, type RouteKey } from './i18n';
import { ThemeProvider } from './theme';
import { ToastProvider } from './toast';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5000 } },
});

function Shell() {
  const [route, setRoute] = useState<RouteKey>(() => routeFromHash(window.location.hash));
  const [backend, setBackend] = useState(`${vi.loading}`);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    fetchHealth()
      .then((d) => setBackend(d.ok && d.data ? `${d.data.service} ${vi.online}` : vi.offline))
      .catch(() => setBackend(vi.offline));
  }, []);

  const navigate = (r: RouteKey) => {
    const hashes: Record<RouteKey, string> = {
      dashboard: '#/',
      students: '#/students',
      calendar: '#/calendar',
      hours: '#/hours',
      tuition: '#/tuition',
      reports: '#/reports',
      settings: '#/settings',
    };
    window.location.hash = hashes[r];
    setRoute(r);
  };

  return (
    <div className="tm-app flex h-screen overflow-hidden">
      <SkipLink />
      <aside className="hidden w-60 shrink-0 sm:block">
        <Sidebar route={route} onNavigate={navigate} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={t(route)} backend={backend} />
        <nav
          aria-label="Điều hướng phụ"
          className="tm-mobile-nav grid shrink-0 grid-cols-4 gap-1 border-b px-3 py-2 sm:hidden"
        >
          {(
            [
              'dashboard',
              'students',
              'calendar',
              'hours',
              'tuition',
              'reports',
              'settings',
            ] as RouteKey[]
          ).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => navigate(r)}
              aria-current={r === route ? 'page' : undefined}
              className="min-h-11 whitespace-nowrap rounded-xl px-2 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t(r)}
            </button>
          ))}
        </nav>
        <main id="main" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {route === 'dashboard' && <DashboardPage />}
          {route === 'students' && <StudentsPage />}
          {route === 'calendar' && <LessonsCalendarPage />}
          {route === 'hours' && <HoursPage />}
          {route === 'tuition' && <TuitionPage />}
          {route === 'reports' && <ReportsPage />}
          {route === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <ErrorBoundary>
            <Shell />
          </ErrorBoundary>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

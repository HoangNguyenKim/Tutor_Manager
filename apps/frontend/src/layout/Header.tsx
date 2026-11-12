import { Moon, Search, Sun } from 'lucide-react';
import { useTheme } from '../theme';
import { vi } from '../i18n';
import { Button } from '../components/Button';
export function Header({ title, backend }: { title: string; backend: string }) {
  const { theme, toggle } = useTheme();
  return (
    <header className="tm-header flex min-h-20 shrink-0 items-center gap-3 border-b px-4 sm:px-6 lg:px-9">
      <div className="min-w-0 flex-1">
        <p className="tm-eyebrow hidden sm:block">TUTOR MANAGER</p>
        <h1 className="truncate text-base font-semibold sm:mt-1">{title}</h1>
      </div>
      <span
        role="status"
        className="tm-backend hidden max-w-64 truncate rounded-full border px-3 py-1.5 text-xs md:inline"
        title={`${vi.backend}: ${backend}`}
      >
        {vi.backend}: {backend}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        aria-label={vi.theme}
        aria-pressed={theme === 'dark'}
        title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      >
        {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      </Button>
    </header>
  );
}
export function SearchIcon() {
  return <Search className="size-4" aria-hidden="true" />;
}

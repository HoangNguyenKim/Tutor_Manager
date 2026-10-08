import { Moon, Search, Sun } from 'lucide-react';
import { useTheme } from '../theme';
import { vi } from '../i18n';
import { Button } from '../components/Button';
import { Input } from '../components/Field';

export function Header({ title, backend }: { title: string; backend: string }) {
  const { theme, toggle } = useTheme();
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 lg:px-6">
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
      <div className="hidden w-56 md:block" role="search">
        <Input type="search" placeholder={vi.search} aria-label={vi.search} />
      </div>
      <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400">
        {vi.backend}: {backend}
      </span>
      <Button variant="ghost" size="icon" onClick={toggle} aria-label={vi.theme} title={vi.theme}>
        {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      </Button>
    </header>
  );
}

export function SearchIcon() {
  return <Search className="size-4" aria-hidden="true" />;
}

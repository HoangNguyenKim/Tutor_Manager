import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
type Theme = 'light' | 'dark';
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'light',
  toggle: () => {},
});
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('tm-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* Storage can be blocked in private or embedded windows. */
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('tm-theme', theme);
    } catch {
      /* The selected theme still applies for this session. */
    }
  }, [theme]);
  const toggle = useCallback(
    () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    [],
  );
  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}
export function useTheme() {
  return useContext(ThemeCtx);
}

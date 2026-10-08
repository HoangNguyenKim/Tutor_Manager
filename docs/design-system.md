# Design System

React + Tailwind + `class-variance-authority` + `lucide-react`. No router, no headless UI lib — hash routing and one `Dialog` cover current needs.

- Primitives: `components/` — `Button` (cva variants), `Field` (`Label/Input/Select/Textarea`), `Card`, `Badge`, `Dialog`, `Table`, `Feedback` (`Skeleton`, `EmptyState`), `ErrorBoundary`.
- Layout: `layout/` — `Sidebar` (7 routes), `Header` (title, search, backend status, theme toggle), `Page` (title + actions) + `SkipLink`.
- Pages: `pages/pages.tsx` — one section per route; split into files when a page exceeds ~200 lines.
- Theme: `theme.tsx` — `light`/`dark` class on `<html>`, persisted in `localStorage`, defaults to OS preference.
- i18n: `i18n.ts` — `vi` strings + `t()` fallback; `<html lang="vi">`.
- Toasts: `toast.tsx` — `useToast().push(msg)`, `aria-live` region.
- Check: `pnpm --filter @tutor-manager/frontend a11y` (routes, landmarks, labels, focus, responsive, dark mode).

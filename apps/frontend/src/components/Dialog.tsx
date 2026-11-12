import { useEffect, useId, useRef, type ReactNode } from 'react';
import { vi } from '../i18n';
import { Button } from './Button';

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const titleId = useId();
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          !element.closest('[hidden], [inert]') &&
          window.getComputedStyle(element).display !== 'none' &&
          window.getComputedStyle(element).visibility !== 'hidden',
      );
    (focusable()[0] ?? dialog).focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (!items.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        items[items.length - 1]?.focus();
      } else if (!event.shiftKey && (index === items.length - 1 || index < 0)) {
        event.preventDefault();
        items[0]?.focus();
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (!dialog.contains(event.target as Node)) (focusable()[0] ?? dialog).focus();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocus);
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="tm-dialog-overlay fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="tm-dialog w-full max-w-lg overflow-y-auto rounded-2xl border p-5 shadow-xl sm:p-7"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <div className="mt-5">{children}</div>
        <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose}>
            {vi.close}
          </Button>
        </div>
      </div>
    </div>
  );
}

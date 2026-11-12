import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from './components/Button';
interface Toast {
  id: number;
  message: string;
}
const ToastCtx = createContext<{ toasts: Toast[]; push: (message: string) => void }>({
  toasts: [],
  push: () => {},
});
let nextId = 1;
function ToastMessage({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(toast.id), 8000);
    return () => clearTimeout(timer);
  }, [paused, toast.id, onDismiss]);
  return (
    <div
      role="status"
      className="tm-toast pointer-events-auto flex items-start gap-3 rounded-2xl border p-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <Bell className="tm-muted mt-3 size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 break-words py-3 text-sm leading-relaxed">{toast.message}</p>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDismiss(toast.id)}
        aria-label="Đóng thông báo"
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  );
}
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback(
    (id: number) => setToasts((items) => items.filter((toast) => toast.id !== id)),
    [],
  );
  const push = useCallback(
    (message: string) => setToasts((items) => [...items, { id: nextId++, message }]),
    [],
  );
  return (
    <ToastCtx.Provider value={{ toasts, push }}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Thông báo"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-h-[80dvh] w-[calc(100%-2rem)] max-w-sm flex-col gap-3 overflow-y-auto"
      >
        {toasts.map((toast) => (
          <ToastMessage key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export function useToast() {
  return useContext(ToastCtx);
}

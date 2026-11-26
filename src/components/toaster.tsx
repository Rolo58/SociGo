import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function Toaster() {
  const { toasts, dismissToast } = useStore();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-card p-3.5 shadow-pop animate-fade-in',
            toast.tone === 'success' && 'border-emerald-200',
            toast.tone === 'error' && 'border-rose-200',
            toast.tone === 'info' && 'border-border',
          )}
        >
          <span
            className={cn(
              'mt-0.5 shrink-0 [&_svg]:size-4',
              toast.tone === 'success' && 'text-emerald-600',
              toast.tone === 'error' && 'text-rose-600',
              toast.tone === 'info' && 'text-primary',
            )}
          >
            {toast.tone === 'success' ? <CheckCircle2 /> : toast.tone === 'error' ? <XCircle /> : <Info />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-foreground">{toast.title}</p>
            {toast.description && (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{toast.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Dismiss notification"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

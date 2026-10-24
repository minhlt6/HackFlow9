import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { useToastStore, type ToastVariant } from '../../store/useToastStore';
import { cn } from '../../lib/utils';

const variantStyles: Record<
  ToastVariant,
  { container: string; icon: React.ReactNode }
> = {
  default: {
    container: 'border-border bg-card text-foreground',
    icon: <Info size={16} className="text-primary shrink-0 mt-0.5" />,
  },
  success: {
    container:
      'border-emerald-600/30 bg-card text-foreground dark:border-emerald-500/40',
    icon: <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
  },
  destructive: {
    container:
      'border-rose-600/35 bg-card text-foreground dark:border-rose-500/40',
    icon: <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />,
  },
  warning: {
    container:
      'border-amber-600/35 bg-card text-foreground dark:border-amber-500/40',
    icon: <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
  },
  info: {
    container:
      'border-sky-600/35 bg-card text-foreground dark:border-sky-500/40',
    icon: <Info size={16} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />,
  },
};

export const Toaster: React.FC = () => {
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Thông báo hệ thống"
      className="fixed bottom-4 right-4 z-[120] flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((item) => {
        const meta = variantStyles[item.variant ?? 'default'];
        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start justify-between gap-3 rounded-lg border p-3.5 shadow-elevated transition-all',
              meta.container,
            )}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              {meta.icon}
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs font-semibold leading-tight text-foreground">
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              aria-label="Đóng thông báo"
              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

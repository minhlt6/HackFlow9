import React from 'react';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/useNotificationStore';

export const NotificationBanner: React.FC = () => {
  const { activeWarnings, dismissWarning } = useNotificationStore();
  const navigate = useNavigate();

  if (activeWarnings.length === 0) return null;

  // Display the most recent active warning
  const warning = activeWarnings[0];

  return (
    <div
      role="alert"
      className="sticky top-14 z-20 w-full bg-amber-50/95 dark:bg-amber-950/90 border-b border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 px-4 py-2.5 shadow-sm backdrop-blur-md transition-all font-sans animate-in slide-in-from-top-2 duration-200"
    >
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="p-1 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
            <AlertTriangle size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-amber-800 dark:text-amber-300 mr-2">
              [CẢNH BÁO] {warning.title}:
            </span>
            <span className="text-amber-900/90 dark:text-amber-100/90 text-xs sm:text-sm leading-relaxed">
              {warning.content}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {warning.action_url && (
            <button
              type="button"
              onClick={() => navigate(warning.action_url!)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/40 text-xs font-medium transition-colors cursor-pointer"
            >
              <span>{warning.action_label || 'Kiểm tra'}</span>
              <ArrowRight size={12} />
            </button>
          )}

          <button
            type="button"
            onClick={() => dismissWarning(warning.id)}
            aria-label="Đã hiểu cảnh báo"
            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-foreground transition-colors text-xs font-medium cursor-pointer"
            title="Đóng thông báo"
          >
            <span>Đã hiểu</span>
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

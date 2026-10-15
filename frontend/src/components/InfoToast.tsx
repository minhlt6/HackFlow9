import React, { useEffect } from 'react';
import { Info, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/useNotificationStore';

export const InfoToast: React.FC = () => {
  const { infoToast, setInfoToast, markAsRead } = useNotificationStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!infoToast) return;

    // Auto dismiss after 4 seconds per SRS HF-24 (3 to 5 seconds)
    const timer = setTimeout(() => {
      setInfoToast(null);
    }, 4500);

    return () => clearTimeout(timer);
  }, [infoToast, setInfoToast]);

  if (!infoToast) return null;

  const handleAction = async () => {
    await markAsRead(infoToast.id);
    if (infoToast.action_url) {
      navigate(infoToast.action_url);
    }
    setInfoToast(null);
  };

  const handleDismiss = async () => {
    await markAsRead(infoToast.id);
    setInfoToast(null);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#0F172A] border border-[#334155] rounded-xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 font-['Roboto'] flex gap-3 items-start"
    >
      <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
        <Info size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <h5 className="text-xs font-semibold text-white truncate">
            {infoToast.title}
          </h5>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Đóng thông báo"
            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
        <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
          {infoToast.content}
        </p>

        {infoToast.action_url && (
          <button
            type="button"
            onClick={handleAction}
            className="mt-2 text-xs text-[#818CF8] hover:text-[#a5b4fc] font-medium flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{infoToast.action_label || 'Xem ngay'}</span>
            <ExternalLink size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

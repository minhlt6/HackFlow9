import React from 'react';
import { AlertOctagon, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useNotificationStore } from '../store/useNotificationStore';

export const UrgentNotificationModal: React.FC = () => {
  const { activeUrgent, acknowledgeUrgent } = useNotificationStore();

  if (!activeUrgent) return null;

  return (
    <Modal
      isOpen={Boolean(activeUrgent)}
      onClose={() => {}}
      title="THÔNG BÁO KHẨN CẤP / QUAN TRỌNG"
      titleClassName="font-semibold tracking-tight text-foreground text-lg sm:text-xl tracking-wide text-rose-700 dark:text-rose-400 flex items-center gap-2"
      preventBackdropClose={true}
      hideCloseButton={true}
      maxWidth="lg"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
          <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-700 dark:text-rose-400 shrink-0 mt-0.5">
            <AlertOctagon size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-foreground text-base">
              {activeUrgent.title}
            </h4>
            <span className="inline-block text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40">
              Yêu cầu xác nhận bắt buộc (Urgent)
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border text-sm text-muted-foreground leading-relaxed space-y-3">
          <p>{activeUrgent.content}</p>
          <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 pt-1 border-t border-border">
            <ShieldAlert size={14} className="shrink-0" />
            <span>
              Đây là thông báo khẩn cấp ảnh hưởng trực tiếp đến quyền lợi của đội thi. Bạn cần xác nhận đã nắm rõ nội dung trước khi tiếp tục thao tác trên hệ thống.
            </span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            variant="danger"
            size="md"
            onClick={() => acknowledgeUrgent(activeUrgent.id)}
            className="w-full sm:w-auto px-6 font-semibold flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} />
            <span>{activeUrgent.action_label || 'Tôi đã hiểu và đồng ý'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

import React from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { ShieldX, AlertTriangle, Lock } from 'lucide-react';

interface RbacForbiddenModalProps {
  isOpen: boolean;
  onClose: () => void;
  attemptedAction?: string;
  userRole?: string;
}

export const RbacForbiddenModal: React.FC<RbacForbiddenModalProps> = ({
  isOpen,
  onClose,
  attemptedAction = 'Truy cập kho mã nguồn bài nộp hoặc xem chi tiết điểm số của Ban Giám Khảo',
  userRole = 'mentor',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="403 Forbidden - Truy cập bị từ chối"
      maxWidth="md"
    >
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-400">
          <ShieldX size={36} />
        </div>

        <div>
          <h4 className="font-semibold tracking-tight text-foreground text-lg text-rose-700 dark:text-rose-400">
            Vi phạm Chính sách Phân quyền RBAC
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Hệ thống HackFlow ghi nhận yêu cầu không hợp lệ từ vai trò{' '}
            <span className="font-semibold text-amber-700 dark:text-amber-400 uppercase">[{userRole}]</span>
          </p>
        </div>

        <div className="rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border p-3 text-left text-xs text-muted-foreground space-y-2">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-semibold">
            <Lock size={14} />
            <span>Hành động bị chặn:</span>
          </div>
          <p className="font-mono text-muted-foreground">{attemptedAction}</p>

          <div className="pt-2 border-t border-border flex items-start gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Theo quy chế cuộc thi Hackathon: Cố vấn chuyên môn có trách nhiệm hướng dẫn kỹ thuật nhưng <strong>tuyệt đối không được can thiệp vào kho lưu trữ mã nguồn thí sinh</strong> hoặc <strong>xem trước bảng điểm chấm thi của Hội đồng Giám khảo</strong> nhằm đảm bảo tính bảo mật và công bằng.
            </p>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button variant="primary" onClick={onClose} className="w-full">
            Đã hiểu và quay lại
          </Button>
        </div>
      </div>
    </Modal>
  );
};

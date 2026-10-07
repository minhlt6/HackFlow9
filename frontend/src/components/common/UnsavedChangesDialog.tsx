import React from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { AlertTriangle, ArrowRight, Save, X } from 'lucide-react';

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onStay: () => void;
  onLeave: () => void;
  onSaveAndLeave?: () => void;
  title?: string;
  message?: string;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  isOpen,
  onStay,
  onLeave,
  onSaveAndLeave,
  title = 'Xác Nhận Rời Đi',
  message = 'Bạn có những thay đổi chưa được lưu trên trang này. Nếu rời đi bây giờ, mọi dữ liệu vừa nhập hoặc chỉnh sửa sẽ bị hủy bỏ.',
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onStay} title={title}>
      <div className="space-y-5 font-['Roboto']">
        <div className="p-4 rounded-[12px] bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5">
          <div className="p-2 rounded-[10px] bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
            <AlertTriangle size={20} />
          </div>
          <div className="space-y-1.5 text-xs text-slate-200 leading-relaxed">
            <p className="font-bold text-amber-300 text-sm">Cảnh báo: Dữ liệu chưa được lưu!</p>
            <p className="text-slate-300">{message}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-[#334155]">
          <Button variant="ghost" onClick={onStay} className="w-full sm:w-auto">
            Ở lại tiếp tục sửa
          </Button>

          <Button
            variant="danger"
            onClick={onLeave}
            className="w-full sm:w-auto gap-1.5"
          >
            <X size={15} />
            <span>Rời đi & Hủy thay đổi</span>
          </Button>

          {onSaveAndLeave && (
            <Button
              variant="primary"
              onClick={onSaveAndLeave}
              className="w-full sm:w-auto gap-1.5"
            >
              <Save size={15} />
              <span>Lưu & Rời đi</span>
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

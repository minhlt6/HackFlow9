import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '../ui/alert-dialog';
import { DialogBody } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'warning' | 'primary';
  isLoading?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  defaultReason?: string;
  minReasonLength?: number;
  onConfirm: (reason?: string) => void | Promise<void>;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  variant = 'destructive',
  isLoading = false,
  requireReason = false,
  reasonLabel = 'Lý do thực hiện',
  reasonPlaceholder = 'Nhập lý do chi tiết...',
  defaultReason = '',
  minReasonLength = 10,
  onConfirm,
}) => {
  const [reason, setReason] = useState(defaultReason);
  const [reasonError, setReasonError] = useState<string | null>(null);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReason(defaultReason);
      setReasonError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requireReason) {
      const trimmed = reason.trim();
      if (!trimmed) {
        setReasonError('Vui lòng nhập lý do trước khi xác nhận.');
        return;
      }
      if (trimmed.length < minReasonLength) {
        setReasonError(`Lý do phải có tối thiểu ${minReasonLength} ký tự.`);
        return;
      }
    }
    setReasonError(null);
    await onConfirm(requireReason ? reason.trim() : undefined);
  };

  const iconBadge =
    variant === 'destructive' ? (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
        <Trash2 size={18} />
      </div>
    ) : variant === 'warning' ? (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <AlertTriangle size={18} />
      </div>
    ) : (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
        <CheckCircle2 size={18} />
      </div>
    );

  return (
    <AlertDialog open={open} onOpenChange={handleDialogOpenChange}>
      <AlertDialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              {iconBadge}
              <div className="space-y-1">
                <AlertDialogTitle>{title}</AlertDialogTitle>
                <AlertDialogDescription>{description}</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          {requireReason && (
            <DialogBody className="space-y-2 py-4">
              <Label htmlFor="confirm-dialog-reason" requiredIndicator>
                {reasonLabel}
              </Label>
              <Textarea
                id="confirm-dialog-reason"
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (reasonError) setReasonError(null);
                }}
                placeholder={reasonPlaceholder}
                hasError={Boolean(reasonError)}
                disabled={isLoading}
              />
              <div className="flex items-center justify-between text-[11px]">
                {reasonError ? (
                  <span role="alert" className="font-medium text-destructive">
                    {reasonError}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Tối thiểu {minReasonLength} ký tự. Ghi chú này sẽ được lưu vào nhật ký xét duyệt.
                  </span>
                )}
                <span className="font-mono text-muted-foreground">
                  {reason.trim().length} ký tự
                </span>
              </div>
            </DialogBody>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel
              type="button"
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              variant={
                variant === 'destructive'
                  ? 'destructive'
                  : variant === 'warning'
                  ? 'primary'
                  : 'primary'
              }
              isLoading={isLoading}
              loadingText="Đang xử lý..."
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

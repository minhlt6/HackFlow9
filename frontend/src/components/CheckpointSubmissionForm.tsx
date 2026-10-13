import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  GitCommit,
  Globe,
  FileText,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { Badge } from './Badge';

const GithubIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 18,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);
import type { Checkpoint, Submission, CheckpointSubmissionPayload } from '../types/checkpoint';
import { checkpointApi } from '../api/checkpointApi';

/**
 * Zod Schema cho Form nộp bài Checkpoint (HF-30)
 * Yêu cầu:
 * - repo_url phải bắt đầu bằng https://github.com/
 */
const checkpointSubmissionSchema = z.object({
  repo_url: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập URL repository GitHub')
    .refine(
      (val) => val.startsWith('https://github.com/'),
      'URL repository phải bắt đầu bằng https://github.com/'
    ),
  demo_url: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^https?:\/\/.+/.test(val),
      'Địa chỉ Demo URL không hợp lệ (phải bắt đầu bằng http:// hoặc https://)'
    ),
  note: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
});

type CheckpointSubmissionFormData = z.infer<typeof checkpointSubmissionSchema>;

export interface CheckpointSubmissionFormProps {
  checkpoint: Checkpoint;
  currentSubmission?: Submission | null;
  onSuccess?: (submission: Submission) => void;
  onCancel?: () => void;
  className?: string;
}

export const CheckpointSubmissionForm: React.FC<CheckpointSubmissionFormProps> = ({
  checkpoint,
  currentSubmission,
  onSuccess,
  onCancel,
  className = '',
}) => {
  // Trạng thái modal xác nhận nộp bài (HF-30)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  // Trạng thái loading khi đang chờ API phản hồi (HF-30)
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Lưu trữ dữ liệu form hợp lệ chờ xác nhận từ người dùng
  const [pendingData, setPendingData] = useState<CheckpointSubmissionFormData | null>(null);
  // Trạng thái thông báo lỗi hoặc kết quả nộp gần nhất
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<Submission | null>(currentSubmission || null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckpointSubmissionFormData>({
    resolver: zodResolver(checkpointSubmissionSchema),
    mode: 'onChange',
    defaultValues: {
      repo_url: currentSubmission?.repo_url || '',
      demo_url: currentSubmission?.demo_url || '',
      note: currentSubmission?.note || '',
    },
  });

  // Bước 1: Khi nhấn "Nộp bài", nếu form validate hợp lệ -> mở Dialog xác nhận
  const handlePreSubmit = (data: CheckpointSubmissionFormData) => {
    setErrorMessage(null);
    setPendingData(data);
    setIsConfirmOpen(true);
  };

  // Bước 2: Khi người dùng bấm "Xác nhận nộp" trong Dialog -> gọi API và hiển thị loading
  const handleConfirmSubmit = async () => {
    if (!pendingData) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload: CheckpointSubmissionPayload = {
        repo_url: pendingData.repo_url,
        demo_url: pendingData.demo_url || undefined,
        note: pendingData.note || undefined,
      };

      const result = await checkpointApi.submitCheckpoint(checkpoint.id, payload);

      setLastSubmitted(result);
      setIsConfirmOpen(false);
      setPendingData(null);

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        errorObj.response?.data?.message ||
        errorObj.message ||
        'Có lỗi xảy ra khi nộp bài. Vui lòng kiểm tra lại quyền truy cập repository.';
      setErrorMessage(msg);
      setIsConfirmOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isClosed = checkpoint.status === 'closed';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Banner kết quả nộp bài gần nhất */}
      {lastSubmitted && (
        <div className="p-4 sm:p-5 rounded-[12px] bg-emerald-500/10 border border-emerald-500/30 text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
              <CheckCircle2 size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">
                  Đã ghi nhận bài nộp thành công!
                </span>
                <Badge variant="success" size="sm">
                  {lastSubmitted.status === 'evaluated' ? 'Đã chấm điểm' : 'Đã nộp'}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5 font-mono">
                <GitCommit size={14} className="text-emerald-400 shrink-0" />
                <span>Frozen Commit SHA:</span>
                <span className="text-emerald-300 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  {lastSubmitted.commit_sha.slice(0, 10)}...{lastSubmitted.commit_sha.slice(-6)}
                </span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Thời gian nộp: {new Date(lastSubmitted.submitted_at).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>

          <a
            href={lastSubmitted.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-medium text-slate-200 transition-colors shrink-0"
          >
            <GithubIcon size={14} />
            <span>Mở repo nộp</span>
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="p-4 rounded-[12px] bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 text-rose-400 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-semibold">Nộp bài không thành công</p>
            <p className="text-rose-200/90 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Form nộp bài sử dụng React Hook Form */}
      <form onSubmit={handleSubmit(handlePreSubmit)} className="space-y-5" noValidate>
        {/* Trường Repository URL */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="repo_url"
              className="text-slate-200 font-medium text-sm flex items-center gap-1.5"
            >
              <GithubIcon size={16} className="text-indigo-400" />
              <span>
                GitHub Repository URL <span className="text-rose-400">*</span>
              </span>
            </label>
            <span className="text-[11px] text-slate-400">Yêu cầu public repository</span>
          </div>

          <Input
            id="repo_url"
            type="url"
            placeholder="https://github.com/organization/project-name"
            error={errors.repo_url?.message}
            disabled={isClosed || isSubmitting}
            {...register('repo_url')}
            className="font-mono text-sm"
          />

          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
            <HelpCircle size={13} className="shrink-0 text-slate-500" />
            <span>
              Quy tắc: URL bắt buộc phải bắt đầu bằng <code className="text-[#818CF8] bg-[#0F172A] px-1 py-0.5 rounded border border-[#334155]">https://github.com/</code>
            </span>
          </div>
        </div>

        {/* Trường Demo URL (Tùy chọn) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="demo_url"
              className="text-slate-200 font-medium text-sm flex items-center gap-1.5"
            >
              <Globe size={16} className="text-cyan-400" />
              <span>Link Demo / Prototype (Không bắt buộc)</span>
            </label>
            <span className="text-[11px] text-slate-400">Figma / Web / Vercel</span>
          </div>

          <Input
            id="demo_url"
            type="url"
            placeholder="https://my-demo-app.vercel.app hoặc link Figma"
            error={errors.demo_url?.message}
            disabled={isClosed || isSubmitting}
            {...register('demo_url')}
            className="text-sm"
          />
        </div>

        {/* Trường Ghi chú nộp bài */}
        <div>
          <label
            htmlFor="note"
            className="text-slate-200 font-medium text-sm flex items-center gap-1.5 mb-1.5"
          >
            <FileText size={16} className="text-amber-400" />
            <span>Ghi chú</span>
          </label>

          <textarea
            id="note"
            rows={3}
            placeholder="Mô tả tóm tắt tính năng chính đã hoàn thành, commit tag hoặc hướng dẫn chấm bài..."
            disabled={isClosed || isSubmitting}
            {...register('note')}
            className="w-full px-4 py-2.5 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 placeholder-slate-400 outline-none transition-all duration-200 focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] text-sm resize-none disabled:opacity-50 disabled:bg-[#0B1120]"
          />
          {errors.note && (
            <span className="text-xs text-rose-400 mt-1 block">{errors.note.message}</span>
          )}
        </div>

        {/* Thanh thao tác Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#334155]/60">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
            <span>Đảm bảo repo đã cấp quyền đọc công khai trước khi nộp</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                onClick={onCancel}
              >
                Hủy bỏ
              </Button>
            )}

            {/* Nút Submit chính của Form */}
            <Button
              type="submit"
              variant="primary"
              disabled={isClosed || isSubmitting}
              className="w-full sm:w-auto min-w-[140px]"
            >
              {lastSubmitted ? 'Cập nhật bài nộp' : 'Nộp bài Checkpoint'}
            </Button>
          </div>
        </div>
      </form>

      {/* ======================================================== */}
      {/* DIALOG XÁC NHẬN NỘP BÀI (Tiêu chí HF-30) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => {
          if (!isSubmitting) setIsConfirmOpen(false);
        }}
        title="Xác nhận nộp bài Checkpoint"
        maxWidth="md"
      >
        <div className="space-y-5">
          {/* Cảnh báo xác nhận với câu chữ chính xác theo yêu cầu HF-30 */}
          <div className="p-4 rounded-[12px] bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <span className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle size={20} />
            </span>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-200">
                Xác nhận nộp phiên bản
              </h4>
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                Bạn có chắc chắn nộp phiên bản này? (Hệ thống sẽ ghi nhận Commit hiện tại của repo)
              </p>
            </div>
          </div>

          {/* Chi tiết nội dung sắp nộp */}
          <div className="p-4 rounded-[12px] bg-[#0F172A] border border-[#334155] space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-[#334155]/60">
              <span>Chặng thi:</span>
              <span className="text-white font-medium">{checkpoint.title}</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400">GitHub Repository:</span>
              <p className="font-mono text-indigo-300 font-semibold break-all bg-[#1E293B] p-2 rounded border border-[#334155]">
                {pendingData?.repo_url}
              </p>
            </div>

            {pendingData?.demo_url && (
              <div className="space-y-1 pt-1">
                <span className="text-slate-400">Demo URL:</span>
                <p className="text-cyan-300 font-medium break-all">{pendingData.demo_url}</p>
              </div>
            )}

            {pendingData?.note && (
              <div className="space-y-1 pt-1">
                <span className="text-slate-400">Ghi chú:</span>
                <p className="text-slate-300 italic">{pendingData.note}</p>
              </div>
            )}
          </div>

          {/* Nút hành động trong Dialog với Trạng thái Loading Button khi chờ API (HF-30) */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => setIsConfirmOpen(false)}
            >
              Hủy
            </Button>

            <Button
              type="button"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              onClick={handleConfirmSubmit}
              className="min-w-[150px]"
            >
              {isSubmitting ? 'Đang ghi nhận commit...' : 'Xác nhận nộp'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

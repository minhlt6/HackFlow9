import React, { useState, useMemo } from 'react';
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
  ShieldAlert,
  Info,
} from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { Badge } from './Badge';
import type { Checkpoint, Submission, CheckpointSubmissionPayload } from '../types/checkpoint';
import { checkpointApi } from '../api/checkpointApi';
import { useAuthStore } from '../store/useAuthStore';

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

/**
 * Xây dựng Zod Schema động theo tiêu chuẩn SRS HF-23 & HF-30:
 * - Checkpoint cuối cùng (is_final_checkpoint: true): BẮT BUỘC nhập GitHub repo_url (bắt đầu bằng https://github.com/).
 * - Checkpoint trung gian (is_final_checkpoint: false): KHÔNG bắt buộc GitHub repo, thí sinh nộp link tài liệu/demo hoặc ghi chú tiến độ.
 */
const baseSubmissionSchema = z
  .object({
    repo_url: z
      .string()
      .trim()
      .optional(),
    demo_url: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) => !val || /^https?:\/\/.+/.test(val),
        'Địa chỉ Demo / Tài liệu URL không hợp lệ (phải bắt đầu bằng http:// hoặc https://)'
      ),
    note: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
  });

type CheckpointSubmissionFormData = z.infer<typeof baseSubmissionSchema>;

const createCheckpointSubmissionSchema = (isFinal: boolean) =>
  baseSubmissionSchema
    .refine(
      (data) => {
        if (isFinal) {
          return Boolean(data.repo_url && data.repo_url.trim().length > 0);
        }
        return true;
      },
      {
        message: 'Vui lòng nhập URL repository GitHub cho chặng chốt sản phẩm',
        path: ['repo_url'],
      }
    )
    .refine(
      (data) => {
        if (!data.repo_url || data.repo_url.trim().length === 0) return true;
        return data.repo_url.startsWith('https://github.com/');
      },
      {
        message: 'URL repository phải bắt đầu bằng https://github.com/',
        path: ['repo_url'],
      }
    )
    .refine(
      (data) => {
        // Đối với chặng trung gian: yêu cầu cung cấp ít nhất một nội dung (link tài liệu/demo, repo hoặc ghi chú báo cáo)
        if (!isFinal) {
          return Boolean(data.demo_url || data.repo_url || data.note);
        }
        return true;
      },
      {
        message: 'Vui lòng cung cấp ít nhất link tài liệu/demo (Figma, Slide, Video...) hoặc ghi chú tiến độ',
        path: ['demo_url'],
      }
    );

export interface CheckpointSubmissionFormProps {
  checkpoint: Checkpoint;
  currentSubmission?: Submission | null;
  userRole?: string; // Ví dụ: 'TEAM_LEADER' | 'MEMBER'
  isLeader?: boolean; // Tùy chọn truyền quyền đội trưởng trực tiếp
  onSuccess?: (submission: Submission) => void;
  onCancel?: () => void;
  className?: string;
}

export const CheckpointSubmissionForm: React.FC<CheckpointSubmissionFormProps> = ({
  checkpoint,
  currentSubmission,
  userRole,
  isLeader: propIsLeader,
  onSuccess,
  onCancel,
  className = '',
}) => {
  const isFinal = Boolean(checkpoint.is_final_checkpoint);

  // Phân quyền theo chuẩn SRS HF-23: Chỉ tài khoản có vai trò TEAM_LEADER mới được gửi bài
  const authUser = useAuthStore((state) => state.user);
  const effectiveRole = userRole || authUser?.team_role || authUser?.role;
  const isTeamLeader =
    typeof propIsLeader === 'boolean'
      ? propIsLeader
      : effectiveRole === 'TEAM_LEADER' || effectiveRole === 'leader'
      ? true
      : effectiveRole === 'MEMBER' || effectiveRole === 'member'
      ? false
      : true; // Mặc định cho phép nếu chưa xác định vai trò cụ thể để không chặn dev test

  // Trạng thái modal xác nhận nộp bài (HF-30)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  // Trạng thái loading khi đang chờ API phản hồi (HF-30)
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Lưu trữ dữ liệu form hợp lệ chờ xác nhận từ người dùng
  const [pendingData, setPendingData] = useState<CheckpointSubmissionFormData | null>(null);
  // Trạng thái thông báo lỗi hoặc kết quả nộp gần nhất
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<Submission | null>(currentSubmission || null);

  // Schema Zod động theo loại checkpoint
  const validationSchema = useMemo(() => createCheckpointSubmissionSchema(isFinal), [isFinal]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckpointSubmissionFormData>({
    resolver: zodResolver(validationSchema),
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

  // Bước 2: Khi người dùng bấm xác nhận trong Dialog -> gọi API và hiển thị loading
  const handleConfirmSubmit = async () => {
    if (!pendingData) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload: CheckpointSubmissionPayload = {
        repo_url: pendingData.repo_url || undefined,
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
      const errorObj = err as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            error_code?: string;
          };
        };
        message?: string;
      };

      const status = errorObj.response?.status;
      const errorCode = errorObj.response?.data?.error_code;

      // Bắt mã lỗi 403 FORBIDDEN_NOT_TEAM_LEADER từ backend theo tiêu chuẩn HF-23
      if (
        status === 403 ||
        errorCode === 'FORBIDDEN_NOT_TEAM_LEADER' ||
        errorCode === 'ONLY_LEADER_CAN_PERFORM'
      ) {
        setErrorMessage(
          errorObj.response?.data?.message ||
            'Chỉ Đội trưởng mới có quyền nộp/cập nhật bài thi cho đội (Mã lỗi: 403 FORBIDDEN_NOT_TEAM_LEADER).'
        );
      } else if (status === 404) {
        setErrorMessage(
          errorObj.response?.data?.message ||
            'Không tìm thấy cổng nộp bài hoặc backend chưa kích hoạt endpoint này (Mã lỗi: 404 NOT_FOUND).'
        );
      } else {
        const msg =
          errorObj.response?.data?.message ||
          errorObj.message ||
          'Có lỗi xảy ra khi nộp bài. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.';
        setErrorMessage(msg);
      }
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
                  {isFinal
                    ? 'Đã ghi nhận bài nộp sản phẩm thành công!'
                    : 'Đã ghi nhận báo cáo tiến độ thành công!'}
                </span>
                <Badge variant="success" size="sm">
                  {lastSubmitted.status === 'evaluated' ? 'Đã chấm điểm' : 'Đã nộp'}
                </Badge>
              </div>

              {/* Chỉ hiển thị Frozen Commit SHA nếu là chặng cuối cùng và có commit_sha */}
              {isFinal && lastSubmitted.commit_sha ? (
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5 font-mono">
                  <GitCommit size={14} className="text-emerald-400 shrink-0" />
                  <span>Frozen Commit SHA:</span>
                  <span className="text-emerald-300 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    {lastSubmitted.commit_sha.slice(0, 10)}...{lastSubmitted.commit_sha.slice(-6)}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                  <Info size={14} className="text-emerald-400 shrink-0" />
                  <span>Chặng tiến độ: Không khóa Commit SHA (Đội thi tiếp tục code bình thường)</span>
                </p>
              )}

              <p className="text-[11px] text-slate-400 mt-1">
                Thời gian nộp: {new Date(lastSubmitted.submitted_at).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {lastSubmitted.repo_url && (
              <a
                href={lastSubmitted.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-medium text-slate-200 transition-colors"
              >
                <GithubIcon size={14} />
                <span>Mở repo</span>
                <ExternalLink size={12} />
              </a>
            )}
            {lastSubmitted.demo_url && (
              <a
                href={lastSubmitted.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-medium text-cyan-300 transition-colors"
              >
                <Globe size={14} />
                <span>Mở demo/tài liệu</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="p-4 rounded-[12px] bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 animate-in fade-in duration-200">
          <AlertCircle size={20} className="shrink-0 text-rose-400 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-semibold">Nộp bài không thành công</p>
            <p className="text-rose-200/90 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Cảnh báo phân quyền nếu là thành viên thường (MEMBER) */}
      {!isTeamLeader && (
        <div className="p-3.5 rounded-[12px] bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5">
          <ShieldAlert size={18} className="text-amber-400 shrink-0" />
          <span>
            <strong>Lưu ý quyền hạn:</strong> Bạn đang xem với vai trò Thành viên (MEMBER). Chỉ Đội trưởng mới có quyền nộp hoặc cập nhật bài thi cho đội.
          </span>
        </div>
      )}

      {/* Form nộp bài sử dụng React Hook Form */}
      <form onSubmit={handleSubmit(handlePreSubmit)} className="space-y-5" noValidate>
        {/* Trường Repository URL: Bắt buộc ở chặng cuối, tùy chọn ở chặng trung gian */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="repo_url"
              className="text-slate-200 font-medium text-sm flex items-center gap-1.5"
            >
              <GithubIcon size={16} className="text-indigo-400" />
              <span>
                GitHub Repository URL {isFinal && <span className="text-rose-400">*</span>}
              </span>
              {!isFinal && (
                <span className="text-xs text-slate-400 font-normal">(Không bắt buộc)</span>
              )}
            </label>
            <span className="text-[11px] text-slate-400">
              {isFinal
                ? 'Yêu cầu public repo để đóng băng Commit SHA'
                : 'Không bắt buộc & không đóng băng SHA'}
            </span>
          </div>

          <Input
            id="repo_url"
            type="url"
            placeholder={
              isFinal
                ? 'https://github.com/organization/final-project-repo'
                : 'https://github.com/organization/project-name (nếu có)'
            }
            error={errors.repo_url?.message}
            disabled={isClosed || isSubmitting}
            {...register('repo_url')}
            className="font-mono text-sm"
          />

          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
            <HelpCircle size={13} className="shrink-0 text-slate-500" />
            <span>
              {isFinal ? (
                <>
                  Quy tắc: URL bắt buộc phải bắt đầu bằng{' '}
                  <code className="text-[#818CF8] bg-[#0F172A] px-1 py-0.5 rounded border border-[#334155]">
                    https://github.com/
                  </code>
                  . Hệ thống sẽ ghi nhận và khóa Commit SHA tại thời điểm nộp.
                </>
              ) : (
                <>
                  Chặng tiến độ: Không bắt buộc GitHub repo. Nếu nhập, URL phải bắt đầu bằng{' '}
                  <code className="text-[#818CF8] bg-[#0F172A] px-1 py-0.5 rounded border border-[#334155]">
                    https://github.com/
                  </code>
                  .
                </>
              )}
            </span>
          </div>
        </div>

        {/* Trường Demo / Tài liệu URL */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="demo_url"
              className="text-slate-200 font-medium text-sm flex items-center gap-1.5"
            >
              <Globe size={16} className="text-cyan-400" />
              <span>
                {isFinal
                  ? 'Link Live Demo / Video Pitch Deck (Không bắt buộc)'
                  : 'Link Báo cáo / Slide / Wireframe / Demo'}
              </span>
            </label>
            <span className="text-[11px] text-slate-400">
              {isFinal ? 'Vercel / Netlify / YouTube' : 'Figma / Google Slide / Drive / Web'}
            </span>
          </div>

          <Input
            id="demo_url"
            type="url"
            placeholder={
              isFinal
                ? 'https://my-demo-app.vercel.app hoặc link YouTube'
                : 'https://figma.com/... hoặc link Slide/Drive báo cáo'
            }
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
            <span>Ghi chú / Tóm tắt tiến độ</span>
          </label>

          <textarea
            id="note"
            rows={3}
            placeholder={
              isFinal
                ? 'Mô tả tóm tắt tính năng sản phẩm hoàn chỉnh, tài khoản test hoặc hướng dẫn giám khảo...'
                : 'Mô tả tóm tắt các hạng mục đã hoàn thành trong chặng thi này...'
            }
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
            {isFinal ? (
              <>
                <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                <span>Chặng cuối: Đảm bảo repo public và đã push commit mới nhất trước khi chốt nộp</span>
              </>
            ) : (
              <>
                <Info size={14} className="text-indigo-400 shrink-0" />
                <span>Chặng tiến độ: Bạn có thể cập nhật tài liệu báo cáo nhiều lần trước deadline</span>
              </>
            )}
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

            {/* Nút Submit chính của Form: Disable nếu không phải Đội trưởng (MEMBER) */}
            <Button
              type="submit"
              variant="primary"
              disabled={isClosed || isSubmitting || !isTeamLeader}
              title={
                !isTeamLeader
                  ? 'Chỉ Đội trưởng mới có quyền nộp/cập nhật bài thi cho đội'
                  : undefined
              }
              className="w-full sm:w-auto min-w-[140px]"
            >
              {lastSubmitted ? 'Cập nhật bài nộp' : 'Nộp bài Checkpoint'}
            </Button>
          </div>
        </div>
      </form>

      {/* ======================================================== */}
      {/* DIALOG XÁC NHẬN NỘP BÀI (Tiêu chí HF-30 & SRS HF-23) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => {
          if (!isSubmitting) setIsConfirmOpen(false);
        }}
        title={isFinal ? 'Xác nhận nộp bài Checkpoint cuối cùng' : 'Xác nhận nộp báo cáo tiến độ'}
        maxWidth="md"
      >
        <div className="space-y-5">
          {/* Cảnh báo xác nhận với câu từ linh hoạt theo đúng chuẩn SRS HF-23 */}
          {isFinal ? (
            <div className="p-4 rounded-[12px] bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <span className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle size={20} />
              </span>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-200">
                  Xác nhận nộp phiên bản chốt
                </h4>
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  Bạn có chắc chắn nộp phiên bản này? (Hệ thống sẽ ghi nhận Commit hiện tại của repo)
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-[12px] bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-3">
              <span className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                <Info size={20} />
              </span>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-indigo-200">
                  Xác nhận nộp báo cáo
                </h4>
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  Bạn có chắc chắn muốn nộp báo cáo cho chặng thi này?
                </p>
                <p className="text-xs text-slate-400 pt-0.5">
                  Chặng tiến độ trung gian sẽ không đóng băng Commit SHA để bạn tiếp tục code bình thường.
                </p>
              </div>
            </div>
          )}

          {/* Chi tiết nội dung sắp nộp */}
          <div className="p-4 rounded-[12px] bg-[#0F172A] border border-[#334155] space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-[#334155]/60">
              <span>Chặng thi:</span>
              <span className="text-white font-medium">{checkpoint.title}</span>
            </div>

            {pendingData?.repo_url && (
              <div className="space-y-1">
                <span className="text-slate-400">GitHub Repository:</span>
                <p className="font-mono text-indigo-300 font-semibold break-all bg-[#1E293B] p-2 rounded border border-[#334155]">
                  {pendingData.repo_url}
                </p>
              </div>
            )}

            {pendingData?.demo_url && (
              <div className="space-y-1 pt-1">
                <span className="text-slate-400">Demo / Tài liệu URL:</span>
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
              {isSubmitting
                ? isFinal
                  ? 'Đang ghi nhận commit...'
                  : 'Đang gửi báo cáo...'
                : isFinal
                ? 'Xác nhận nộp & Chốt commit'
                : 'Xác nhận nộp báo cáo'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

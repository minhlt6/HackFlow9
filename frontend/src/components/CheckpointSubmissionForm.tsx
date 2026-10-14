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
  Clock,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { Badge } from './Badge';
import {
  type Checkpoint,
  type Submission,
  type SubmissionFieldConfig,
  type CheckpointSubmissionPayload,
  SRS_HF23_ERROR_MESSAGES,
  getEffectiveSubmissionFields,
  getSubmissionStatusMeta,
} from '../types/checkpoint';
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

type CheckpointSubmissionFormData = Record<string, string | undefined>;

/**
 * Xây dựng Zod Schema động theo cấu hình `submission_fields` & `is_final_checkpoint` (SRS HF-23 & HF-30)
 */
const createCheckpointSubmissionSchema = (
  fields: SubmissionFieldConfig[],
  isFinal: boolean
) =>
  z.record(z.string(), z.string().optional()).superRefine((data, ctx) => {
    let hasAnyRequired = false;
    let hasAnyValue = Boolean(data.note && data.note.trim().length > 0);

    for (const field of fields) {
      const key = field.field_key;
      const val = (data[key] || '').trim();
      const isRepoField = key === 'repo_url' || Boolean(field.apply_sha_freeze);

      if (val.length > 0) {
        hasAnyValue = true;
      }

      if (field.required || (isRepoField && isFinal)) {
        hasAnyRequired = true;
        if (!val) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: isRepoField
              ? 'Vui lòng nhập URL repository GitHub cho chặng chốt sản phẩm'
              : `Vui lòng nhập ${field.field_label}`,
          });
          continue;
        }
      }

      if (val) {
        if (isRepoField) {
          if (!val.startsWith('https://github.com/')) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [key],
              message: 'URL repository phải bắt đầu bằng https://github.com/',
            });
          }
        } else if (key !== 'note' && key !== 'progress_note') {
          if (!/^https?:\/\/.+/.test(val)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [key],
              message: `${field.field_label} không hợp lệ (phải bắt đầu bằng http:// hoặc https://)`,
            });
          }
        }
      }
    }

    const noteVal = (data.note || '').trim();
    if (noteVal.length > 500) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['note'],
        message: 'Ghi chú tối đa 500 ký tự',
      });
    }

    if (!hasAnyRequired && !hasAnyValue && fields.length > 0) {
      const firstKey = fields[0].field_key;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [firstKey],
        message: 'Vui lòng cung cấp ít nhất một đường dẫn tài liệu/demo hoặc ghi chú báo cáo',
      });
    }
  });

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
  const effectiveFields = useMemo(
    () => getEffectiveSubmissionFields(checkpoint),
    [checkpoint]
  );

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
      : true;

  // Kiểm tra trạng thái mở/khóa cổng thời gian theo chuẩn SRS HF-23
  const isUpcoming = checkpoint.status === 'upcoming';
  const isClosed = checkpoint.status === 'closed';
  const isGracePeriod = checkpoint.status === 'grace_period';
  const isInactive = checkpoint.is_active === false;
  const isCanSubmitFalse = checkpoint.can_submit === false;
  const isFormLocked = isUpcoming || isClosed || isInactive || isCanSubmitFalse;

  // Trạng thái modal xác nhận nộp bài (HF-30)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  // Trạng thái loading khi đang chờ API phản hồi (HF-30)
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Lưu trữ dữ liệu form hợp lệ chờ xác nhận từ người dùng
  const [pendingData, setPendingData] = useState<CheckpointSubmissionFormData | null>(null);
  // Trạng thái thông báo lỗi hoặc kết quả nộp gần nhất
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCodeBadge, setErrorCodeBadge] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<Submission | null>(null);

  const lastSubmitted = submittedResult || currentSubmission || null;

  // Xây dựng giá trị mặc định cho các trường động
  const defaultValues = useMemo(() => {
    const defaults: CheckpointSubmissionFormData = {
      repo_url: currentSubmission?.repo_url || '',
      demo_url: currentSubmission?.demo_url || '',
      note: currentSubmission?.note || '',
    };

    if (currentSubmission?.submission_data) {
      for (const [k, v] of Object.entries(currentSubmission.submission_data)) {
        if (typeof v === 'string') {
          defaults[k] = v;
        }
      }
    }

    for (const field of effectiveFields) {
      if (!(field.field_key in defaults)) {
        defaults[field.field_key] = '';
      }
    }

    return defaults;
  }, [currentSubmission, effectiveFields]);

  // Schema Zod động theo submission_fields & loại checkpoint
  const validationSchema = useMemo(
    () => createCheckpointSubmissionSchema(effectiveFields, isFinal),
    [effectiveFields, isFinal]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckpointSubmissionFormData>({
    resolver: zodResolver(validationSchema),
    mode: 'onChange',
    defaultValues,
  });

  // Bước 1: Khi nhấn "Nộp bài", nếu form validate hợp lệ -> mở Dialog xác nhận
  const handlePreSubmit = (data: CheckpointSubmissionFormData) => {
    if (isFormLocked || !isTeamLeader) return;
    setErrorMessage(null);
    setErrorCodeBadge(null);
    setPendingData(data);
    setIsConfirmOpen(true);
  };

  // Bước 2: Khi người dùng bấm xác nhận trong Dialog -> gọi API và hiển thị loading
  const handleConfirmSubmit = async () => {
    if (!pendingData) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setErrorCodeBadge(null);

      const submissionDataMap: Record<string, string> = {};
      for (const field of effectiveFields) {
        const val = (pendingData[field.field_key] || '').trim();
        if (val) {
          submissionDataMap[field.field_key] = val;
        }
      }

      const repoUrl = (pendingData.repo_url || '').trim() || undefined;
      const demoUrl =
        (pendingData.demo_url || '').trim() ||
        Object.entries(submissionDataMap).find(([k]) => k !== 'repo_url')?.[1] ||
        undefined;
      const note = (pendingData.note || '').trim() || undefined;

      const payload: CheckpointSubmissionPayload = {
        ...submissionDataMap,
        repo_url: repoUrl,
        demo_url: demoUrl,
        note,
        submission_data: Object.keys(submissionDataMap).length > 0 ? submissionDataMap : undefined,
      };

      const result = await checkpointApi.submitCheckpoint(checkpoint.id, payload);

      setSubmittedResult(result);
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
            data?: Submission;
          };
        };
        message?: string;
      };

      const status = errorObj.response?.status;
      const rawErrorCode = errorObj.response?.data?.error_code;
      const fallbackSubmission = errorObj.response?.data?.data;

      // Chuẩn hóa error_code theo bảng mã lỗi SRS HF-23
      const normalizedCode =
        rawErrorCode === 'ONLY_LEADER_CAN_PERFORM'
          ? 'FORBIDDEN_NOT_TEAM_LEADER'
          : rawErrorCode;

      if (fallbackSubmission && fallbackSubmission.id) {
        setSubmittedResult(fallbackSubmission);
        if (onSuccess) {
          onSuccess(fallbackSubmission);
        }
      }

      if (normalizedCode && SRS_HF23_ERROR_MESSAGES[normalizedCode]) {
        setErrorCodeBadge(normalizedCode);
        setErrorMessage(SRS_HF23_ERROR_MESSAGES[normalizedCode]);
      } else if (status === 503) {
        setErrorCodeBadge('GITHUB_API_UNAVAILABLE');
        setErrorMessage(SRS_HF23_ERROR_MESSAGES.GITHUB_API_UNAVAILABLE);
      } else if (status === 403) {
        setErrorCodeBadge('FORBIDDEN_NOT_TEAM_LEADER');
        setErrorMessage(
          errorObj.response?.data?.message ||
            SRS_HF23_ERROR_MESSAGES.FORBIDDEN_NOT_TEAM_LEADER
        );
      } else if (status === 422) {
        const serverMsg = errorObj.response?.data?.message || '';
        if (serverMsg.toLowerCase().includes('github') || serverMsg.toLowerCase().includes('repo')) {
          setErrorCodeBadge('GITHUB_REPO_INACCESSIBLE');
          setErrorMessage(SRS_HF23_ERROR_MESSAGES.GITHUB_REPO_INACCESSIBLE);
        } else {
          setErrorCodeBadge('MISSING_REQUIRED_FIELD');
          setErrorMessage(
            serverMsg || SRS_HF23_ERROR_MESSAGES.MISSING_REQUIRED_FIELD
          );
        }
      } else if (status === 400) {
        setErrorCodeBadge('DEADLINE_EXCEEDED');
        setErrorMessage(
          errorObj.response?.data?.message || SRS_HF23_ERROR_MESSAGES.DEADLINE_EXCEEDED
        );
      } else if (status === 404) {
        setErrorCodeBadge('NOT_FOUND');
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

  const statusMeta = lastSubmitted
    ? getSubmissionStatusMeta(lastSubmitted.status, isFinal)
    : null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Banner thông báo trạng thái cổng thời gian (Upcoming / Grace Period / Closed) */}
      {isGracePeriod && (
        <div className="p-3.5 rounded-[12px] bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5 animate-pulse">
          <Clock size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-100">
              Đang trong thời gian ân hạn mạng (Grace Period {checkpoint.grace_period_seconds ?? 5} giây)
            </p>
            <p className="text-amber-200/90 mt-0.5">
              Cổng nộp bài đang áp dụng thời gian ân hạn độ trễ mạng. Bài nộp ngay lúc này vẫn được ghi nhận hợp lệ với cờ{' '}
              <code className="font-mono text-amber-100 bg-amber-950/60 px-1 py-0.5 rounded">
                grace_period_applied = true
              </code>
              .
            </p>
          </div>
        </div>
      )}

      {isUpcoming && (
        <div className="p-3.5 rounded-[12px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-2.5">
          <Lock size={18} className="text-indigo-400 shrink-0" />
          <span>
            <strong>Chưa đến giờ mở cổng (UPCOMING):</strong> Cổng nộp bài cho chặng này sẽ mở vào lúc{' '}
            <span className="font-mono text-white">
              {new Date(checkpoint.start_time).toLocaleString('vi-VN')}
            </span>
            . Hiện tại các trường nhập liệu đang tạm khóa.
          </span>
        </div>
      )}

      {!isUpcoming && (isClosed || isInactive || isCanSubmitFalse) && (
        <div className="p-3.5 rounded-[12px] bg-slate-800/80 border border-slate-600/50 text-slate-300 text-xs flex items-center gap-2.5">
          <Lock size={18} className="text-slate-400 shrink-0" />
          <span>
            <strong>Cổng nộp bài đã đóng:</strong>{' '}
            {isInactive
              ? 'Checkpoint này đang tạm khóa bởi Ban tổ chức.'
              : 'Đã kết thúc thời gian tiếp nhận bài nộp cho chặng thi này.'}
          </span>
        </div>
      )}

      {/* Banner kết quả nộp bài gần nhất (Xử lý đầy đủ SUBMITTED, EVALUATED, PENDING_SHA_FREEZE, SHA_VERIFICATION_FAILED, INVALID & grace_period_applied) */}
      {lastSubmitted && statusMeta && (
        <div
          className={`p-4 sm:p-5 rounded-[12px] border text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${statusMeta.containerClass}`}
        >
          <div className="flex items-start gap-3">
            <span className={`p-2 rounded-lg shrink-0 mt-0.5 ${statusMeta.iconBgClass}`}>
              {statusMeta.normalizedStatus === 'sha_verification_failed' ||
              statusMeta.normalizedStatus === 'late' ? (
                <AlertTriangle size={20} />
              ) : statusMeta.normalizedStatus === 'pending_sha_freeze' ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : statusMeta.normalizedStatus === 'invalid' ? (
                <AlertCircle size={20} />
              ) : (
                <CheckCircle2 size={20} />
              )}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white text-sm">{statusMeta.title}</span>
                <Badge variant={statusMeta.badgeVariant} size="sm">
                  {statusMeta.badgeLabel}
                </Badge>
                {lastSubmitted.grace_period_applied && (
                  <Badge variant="warning" size="sm">
                    Ân hạn mạng (Grace Period)
                  </Badge>
                )}
              </div>

              {statusMeta.statusNote && (
                <p className="text-xs text-slate-200/90 mt-1 leading-relaxed">
                  {statusMeta.statusNote}
                </p>
              )}

              {/* Hiển thị thông tin Commit SHA hoặc trạng thái SHA tương ứng */}
              {isFinal ? (
                lastSubmitted.commit_sha ? (
                  <p className="text-xs text-slate-300 mt-1.5 flex items-center gap-1.5 font-mono">
                    <GitCommit size={14} className="text-emerald-400 shrink-0" />
                    <span>Frozen Commit SHA:</span>
                    <span className="text-emerald-300 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      {lastSubmitted.commit_sha.slice(0, 10)}...{lastSubmitted.commit_sha.slice(-6)}
                    </span>
                  </p>
                ) : statusMeta.normalizedStatus === 'sha_verification_failed' ? (
                  <p className="text-xs text-amber-300 mt-1.5 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                    <span>
                      Commit SHA: Đang chờ Ban tổ chức xác minh thủ công (Đã bảo lưu thời điểm nộp hợp lệ)
                    </span>
                  </p>
                ) : statusMeta.normalizedStatus === 'pending_sha_freeze' ? (
                  <p className="text-xs text-indigo-300 mt-1.5 flex items-center gap-1.5">
                    <RefreshCw size={13} className="text-indigo-400 shrink-0 animate-spin" />
                    <span>Commit SHA: Hệ thống đang truy xuất HEAD SHA từ GitHub API...</span>
                  </p>
                ) : null
              ) : (
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                  <Info size={14} className="text-emerald-400 shrink-0" />
                  <span>Chặng tiến độ: Không khóa Commit SHA (Đội thi tiếp tục code bình thường)</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1.5">
                <span>
                  Thời gian nộp: {new Date(lastSubmitted.submitted_at).toLocaleString('vi-VN')}
                </span>
                {lastSubmitted.grace_period_applied && (
                  <span className="text-amber-300 font-medium">
                    • Ghi nhận hợp lệ trong khung giờ ân hạn mạng (Grace Period)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
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

      {/* Thông báo lỗi nếu có (kèm mã lỗi chuẩn SRS HF-23) */}
      {errorMessage && (
        <div className="p-4 rounded-[12px] bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 animate-in fade-in duration-200">
          <AlertCircle size={20} className="shrink-0 text-rose-400 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-rose-200">Nộp bài không thành công</p>
              {errorCodeBadge && (
                <Badge variant="danger" size="sm" className="font-mono text-[11px]">
                  {errorCodeBadge}
                </Badge>
              )}
            </div>
            <p className="text-rose-200/90 leading-relaxed">{errorMessage}</p>
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

      {/* Form nộp bài sử dụng React Hook Form & Render động theo checkpoint.submission_fields */}
      <form onSubmit={handleSubmit(handlePreSubmit)} className="space-y-5" noValidate>
        {effectiveFields.map((field) => {
          const isRepoField =
            field.field_key === 'repo_url' || Boolean(field.apply_sha_freeze);
          const isRequired = Boolean(field.required || (isRepoField && isFinal));
          const fieldError = errors[field.field_key]?.message as string | undefined;

          if (isRepoField) {
            return (
              <div key={field.field_key}>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                  <label
                    htmlFor={field.field_key}
                    className="text-slate-200 font-medium text-sm flex items-center gap-1.5"
                  >
                    <GithubIcon size={16} className="text-indigo-400" />
                    <span>
                      {field.field_label}{' '}
                      {isRequired && <span className="text-rose-400">*</span>}
                    </span>
                    {!isRequired && (
                      <span className="text-xs text-slate-400 font-normal">(Không bắt buộc)</span>
                    )}
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {field.apply_sha_freeze || isFinal
                      ? 'Yêu cầu public repo để đóng băng Commit SHA'
                      : 'Public GitHub repository'}
                  </span>
                </div>

                <Input
                  id={field.field_key}
                  type="url"
                  placeholder="https://github.com/organization/project-repo"
                  error={fieldError}
                  disabled={isFormLocked || isSubmitting || !isTeamLeader}
                  {...register(field.field_key)}
                  className="font-mono text-sm"
                />

                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                  <HelpCircle size={13} className="shrink-0 text-slate-500" />
                  <span>
                    Quy tắc: URL bắt buộc phải bắt đầu bằng{' '}
                    <code className="text-[#818CF8] bg-[#0F172A] px-1 py-0.5 rounded border border-[#334155]">
                      https://github.com/
                    </code>
                    {(field.apply_sha_freeze || isFinal) &&
                      ' và ở chế độ Public để hệ thống ghi nhận & khóa Commit SHA.'}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div key={field.field_key}>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label
                  htmlFor={field.field_key}
                  className="text-slate-200 font-medium text-sm flex items-center gap-1.5"
                >
                  <Globe size={16} className="text-cyan-400" />
                  <span>
                    {field.field_label}{' '}
                    {isRequired && <span className="text-rose-400">*</span>}
                  </span>
                  {!isRequired && (
                    <span className="text-xs text-slate-400 font-normal">(Không bắt buộc)</span>
                  )}
                </label>
                <span className="text-[11px] text-slate-400">
                  {isFinal ? 'Vercel / Netlify / YouTube / Slide' : 'Figma / Google Slide / Drive / Web'}
                </span>
              </div>

              <Input
                id={field.field_key}
                type="url"
                placeholder={
                  isFinal
                    ? 'https://my-demo-app.vercel.app hoặc link YouTube / Slide'
                    : 'https://figma.com/... hoặc link Slide/Drive báo cáo tiến độ'
                }
                error={fieldError}
                disabled={isFormLocked || isSubmitting || !isTeamLeader}
                {...register(field.field_key)}
                className="text-sm"
              />
            </div>
          );
        })}

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
            disabled={isFormLocked || isSubmitting || !isTeamLeader}
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
                <span>Chặng tiến độ: Chỉ nộp tài liệu báo cáo theo cấu hình, không đóng băng Commit SHA</span>
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

            {/* Nút Submit chính của Form: Khóa khi upcoming/closed/can_submit===false hoặc không phải Đội trưởng */}
            <Button
              type="submit"
              variant="primary"
              disabled={isFormLocked || isSubmitting || !isTeamLeader}
              title={
                !isTeamLeader
                  ? 'Chỉ Đội trưởng mới có quyền nộp/cập nhật bài thi cho đội'
                  : isUpcoming
                  ? 'Chưa đến giờ mở cổng nộp bài'
                  : isFormLocked
                  ? 'Cổng nộp bài đã đóng hoặc tạm khóa'
                  : undefined
              }
              className="w-full sm:w-auto min-w-[140px]"
            >
              {isUpcoming
                ? 'Chưa mở cổng nộp'
                : isClosed
                ? 'Đã đóng cổng nộp'
                : lastSubmitted
                ? 'Cập nhật bài nộp'
                : 'Nộp bài Checkpoint'}
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

          {/* Chi tiết nội dung sắp nộp theo submission_fields */}
          <div className="p-4 rounded-[12px] bg-[#0F172A] border border-[#334155] space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-[#334155]/60">
              <span>Chặng thi:</span>
              <span className="text-white font-medium">{checkpoint.title}</span>
            </div>

            {effectiveFields.map((field) => {
              const value = pendingData?.[field.field_key]?.trim();
              if (!value) return null;
              const isRepoField =
                field.field_key === 'repo_url' || Boolean(field.apply_sha_freeze);

              return (
                <div key={field.field_key} className="space-y-1 pt-1">
                  <span className="text-slate-400">{field.field_label}:</span>
                  {isRepoField ? (
                    <p className="font-mono text-indigo-300 font-semibold break-all bg-[#1E293B] p-2 rounded border border-[#334155]">
                      {value}
                    </p>
                  ) : (
                    <p className="text-cyan-300 font-medium break-all">{value}</p>
                  )}
                </div>
              );
            })}

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

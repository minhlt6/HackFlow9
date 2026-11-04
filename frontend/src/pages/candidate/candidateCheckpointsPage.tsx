import { useLiveCheckpoints } from '../../hooks/useLiveCheckpoints';
import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Clock,
  Calendar,
  ChevronRight,
  Layers,
  Send,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '../../components/Badge';
import { CountdownTimer } from '../../components/CountdownTimer';
import { CheckpointSubmissionForm } from '../../components/CheckpointSubmissionForm';
import { SubmissionHistoryTable } from '../../components/SubmissionHistoryTable';
import { checkpointApi } from '../../api/checkpointApi';
import { isCompletedSubmission } from '../../utils/progress';
import { useAuthStore } from '../../store/useAuthStore';
import { useMockStore } from '../../store/useMockStore';
import {
  type CheckpointWithSubmission,
  type Submission,
  expandSubmissionHistory,
  getSubmissionStatusMeta,
  hasOnTimeSubmissionHistory,
} from '../../types/checkpoint';

export const CandidateCheckpointsPage: React.FC = () => {
  const [rawCheckpoints, setCheckpoints] = useState<CheckpointWithSubmission[]>([]);
  const checkpoints = useLiveCheckpoints(rawCheckpoints, setCheckpoints);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState('');

  // Danh sách lịch sử nộp bài của checkpoint được chọn (HF-31)
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isSubmissionsLoading, setIsSubmissionsLoading] = useState<boolean>(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

  // Lấy người dùng hiện tại từ AuthStore
  const authUser = useAuthStore((state) => state.user);
  const userRole = authUser?.team_role || authUser?.role;

  // Tải lịch sử nộp bài của checkpoint (HF-31 AC-1 & Lỗi 1)
  const fetchSubmissions = useCallback(async (cpId: string) => {
    try {
      setIsSubmissionsLoading(true);
      setSubmissionsError(null);
      const data = await checkpointApi.getSubmissions(cpId);
      setSubmissions(data);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setSubmissionsError(
        errorObj.response?.data?.message ||
          errorObj.message ||
          'Không thể tải lịch sử nộp bài do sự cố kết nối máy chủ.'
      );
    } finally {
      setIsSubmissionsLoading(false);
    }
  }, []);

  // Load danh sách checkpoints & lịch sử nộp bài ban đầu
  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const data = await checkpointApi.getCheckpoints();
        if (!isMounted) return;
        setCheckpoints(data);

        // Mặc định chọn checkpoint đang mở ('open' hoặc 'grace_period'), hoặc 'late', hoặc checkpoint đầu tiên
        const openCp =
          data.find((cp) => cp.status === 'open' || cp.status === 'grace_period') ||
          data.find((cp) => cp.status === 'late') ||
          data[0];
        if (openCp) {
          setSelectedCheckpointId(openCp.id);
          const history = await checkpointApi.getSubmissions(openCp.id);
          if (isMounted) {
            setSubmissions(history);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách checkpoints:', err);
        if (isMounted) setLoadError('Không thể tải đầy đủ dữ liệu các chặng. Vui lòng tải lại trang.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectCheckpoint = (cpId: string) => {
    setSelectedCheckpointId(cpId);
    fetchSubmissions(cpId);
    void checkpointApi.getCheckpoints().then(setCheckpoints).catch(() => setLoadError('Không thể kiểm tra trạng thái chặng. Vui lòng tải lại.'));
  };

  const selectedCheckpointIndex = checkpoints.findIndex((cp) => cp.id === selectedCheckpointId);
  const selectedCheckpoint = selectedCheckpointIndex >= 0 ? checkpoints[selectedCheckpointIndex] : undefined;

  const getCheckpointStageLabel = (cp: CheckpointWithSubmission, index: number): string => {
    const stageNumber =
      index >= 0
        ? index + 1
        : cp.order ??
          cp.checkpoint_number ??
          (typeof cp.display_order === 'number' ? cp.display_order + 1 : 1);
    if (cp.is_final_checkpoint) {
      return `Chặng ${stageNumber} (Chung cuộc)`;
    }
    return `Chặng ${stageNumber}`;
  };

  // Callback khi nộp bài thành công từ CheckpointSubmissionForm
  const handleSubmissionSuccess = (newSub: Submission) => {
    // 1. Cập nhật latest_submission trong danh sách checkpoint và bảo toàn lịch sử phiên bản trước đó (BUG 57)
    setCheckpoints((prev) =>
      prev.map((cp) => {
        if (cp.id === newSub.checkpoint_id) {
          const prevSub = cp.latest_submission;
          const preservedHistory =
            Array.isArray(newSub.version_history) && newSub.version_history.length > 0
              ? newSub.version_history
              : prevSub && prevSub.submitted_at !== newSub.submitted_at
              ? [
                  {
                    ...prevSub,
                    id: `${prevSub.id}-v${prevSub.version || 1}`,
                    version: prevSub.version || 1,
                  },
                  ...(prevSub.version_history || []),
                ]
              : [];

          return {
            ...cp,
            latest_submission: {
              ...newSub,
              version: newSub.version || (prevSub ? (prevSub.version || 1) + 1 : 1),
              version_history: preservedHistory,
            },
          };
        }
        return cp;
      })
    );

    // 2. Mở rộng và bảo lưu toàn bộ các phiên bản cũ (v1 đúng hạn) cùng bản cập nhật mới (v2+) trong bảng lịch sử (HF-31 & BUG 57)
    setSubmissions((prev) => {
      const convertedPrev = prev.map((s) =>
        s.id === newSub.id && s.submitted_at !== newSub.submitted_at
          ? { ...s, id: `${s.id}-v${s.version || 1}`, version: s.version || 1 }
          : s
      );
      return expandSubmissionHistory([newSub, ...convertedPrev]);
    });
    void fetchSubmissions(newSub.checkpoint_id);
    void useMockStore.getState().syncFromBackend?.();
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="success" size="sm">Đang mở nộp bài</Badge>;
      case 'grace_period':
        return <Badge variant="warning" size="sm">Ân hạn mạng (Grace Period)</Badge>;
      case 'late':
        return <Badge variant="warning" size="sm">Quá hạn chuẩn (Mở nộp bổ sung)</Badge>;
      case 'upcoming':
        return <Badge variant="indigo" size="sm">Chưa mở</Badge>;
      case 'closed':
        return <Badge variant="neutral" size="sm">Đã đóng</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Chưa mở</Badge>;
    }
  };

  return (
    <div className="space-y-6 text-foreground max-w-7xl mx-auto ">
      {checkpoints.some((cp) => cp.availability_error) && <p role="alert" className="rounded-xl border border-amber-500/30 p-4 text-sm">Không thể xác minh trạng thái các chặng. Form nộp tạm khóa cho đến khi kết nối lại.</p>}
      {/* Tiêu đề trang */}
      {loadError && <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-destructive">{loadError}</p>}
      {!isLoading && !loadError && <p className="text-sm text-muted-foreground">Đã hoàn thành {checkpoints.filter((cp) => cp.status !== 'upcoming' && isCompletedSubmission(cp.latest_submission?.status)).length}/{checkpoints.length} chặng nộp bài.</p>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-[#6366F1]/15 text-primary border border-[#6366F1]/30">
            <CheckSquare size={22} />
          </span>
          <div>
            <h1
              className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide inline-block"
            >
              Tiến độ và Nộp bài Checkpoint
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Quản lý tiến độ các chặng thi, cập nhật sản phẩm linh hoạt và theo dõi lịch sử bài nộp của đội.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-[16px] bg-muted/40 dark:bg-slate-900/60 border border-border">
          <svg className="animate-spin h-8 w-8 text-[#6366F1] mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-muted-foreground">Đang tải tiến trình các chặng thi...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI: DANH SÁCH CHECKPOINT (5 CỘT) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Layers size={16} className="text-primary" />
                <span>Các chặng Checkpoint</span>
              </h2>
              <span className="text-xs text-muted-foreground">{checkpoints.length} chặng</span>
            </div>

            <div className="space-y-3">
              {checkpoints.map((cp, idx) => {
                const isSelected = cp.id === selectedCheckpointId;
                const hasSubmitted = cp.status !== 'upcoming' && !!cp.latest_submission;
                const isFinal = Boolean(cp.is_final_checkpoint);
                const onTimeHistory = hasOnTimeSubmissionHistory(
                  cp.latest_submission,
                  cp.id === selectedCheckpointId ? submissions : undefined
                );
                const subMeta =
                  hasSubmitted && cp.latest_submission
                    ? getSubmissionStatusMeta(
                        cp.latest_submission.status,
                        isFinal,
                        Boolean(cp.latest_submission.is_late),
                        onTimeHistory
                      )
                    : null;

                return (
                  <div
                    key={cp.id}
                    onClick={() => handleSelectCheckpoint(cp.id)}
                    className={`p-4 rounded-[14px] border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-card border-[#6366F1] shadow-lg shadow-[#6366F1]/10 ring-1 ring-[#6366F1]/50'
                        : 'bg-muted/40 dark:bg-slate-900/60 border-border hover:border-slate-500 hover:bg-accent'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#6366F1]" />
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-primary">
                            {getCheckpointStageLabel(cp, idx)}
                          </span>
                          {/* Chỉ hiển thị 1 nhãn trạng thái cốt lõi duy nhất (BUG 57) */}
                          {hasSubmitted && subMeta ? (
                            <Badge variant={subMeta.badgeVariant} size="sm">
                              {subMeta.badgeLabel}
                            </Badge>
                          ) : (
                            getStatusBadge(cp.status)
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-foreground truncate pt-1">
                          {cp.title}
                        </h3>

                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {cp.description}
                        </p>
                      </div>

                      <ChevronRight
                        size={18}
                        className={`shrink-0 transition-transform ${
                          isSelected ? 'text-primary translate-x-0.5' : 'text-slate-600'
                        }`}
                      />
                    </div>

                    {/* Deadline footer */}
                    <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Clock size={12} className="text-amber-700 dark:text-amber-400" />
                        <span>Hạn: {new Date(cp.deadline).toLocaleDateString('vi-VN')}</span>
                      </div>

                      {hasSubmitted && cp.latest_submission ? (
                        <span
                          className={`text-[10px] font-mono ${
                            onTimeHistory && subMeta?.normalizedStatus === 'late'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : subMeta?.normalizedStatus === 'sha_verification_failed' ||
                                subMeta?.normalizedStatus === 'late'
                              ? 'text-amber-700 dark:text-amber-400'
                              : subMeta?.normalizedStatus === 'invalid'
                              ? 'text-rose-700 dark:text-rose-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {onTimeHistory && subMeta?.normalizedStatus === 'late'
                            ? `Gốc v1 đúng hạn • Bản v${cp.latest_submission.version || 2}`
                            : `Phiên bản v${cp.latest_submission.version || 1}`}
                        </span>
                      ) : cp.status === 'late' ? (
                        <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400">
                          Chưa nộp bài
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hướng dẫn & Quy định theo chuẩn SRS HF-23 */}
            <div className="p-4 rounded-[14px] bg-muted/40 dark:bg-slate-900/60 border border-border text-xs text-muted-foreground space-y-2.5">
              <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                <Info size={14} className="text-sky-700 dark:text-cyan-400" />
                <span>Quy định nộp bài Checkpoint (SRS HF-23)</span>
              </div>
              <ul className="list-disc pl-4 space-y-1.5 text-muted-foreground leading-relaxed text-[11px]">
                <li>
                  <strong className="text-muted-foreground">Chặng tiến độ trung gian:</strong> Nộp tài liệu theo cấu hình động (<code className="text-primary">submission_fields</code>). Đội thi tiếp tục hoàn thiện mã nguồn và giao diện linh hoạt.
                </li>
                <li>
                  <strong className="text-muted-foreground">Chặng cuối cùng (Final):</strong> Bắt buộc URL GitHub repository public (bắt đầu bằng <code className="text-primary">https://github.com/</code>) kèm sản phẩm demo và tài liệu thuyết trình.
                </li>
                <li>
                  <strong className="text-amber-700 dark:text-amber-400">Phân quyền:</strong> Chỉ tài khoản có vai trò Đội trưởng (<code className="text-amber-700 dark:text-amber-400 font-mono">TEAM_LEADER</code>) mới có quyền bấm nộp bài để tránh xung đột dữ liệu.
                </li>
              </ul>
            </div>
          </div>

          {/* CỘT PHẢI: CHI TIẾT CHECKPOINT, FORM NỘP BÀI & BẢNG LỊCH SỬ NỘP BÀI (7 CỘT) */}
          <div className="lg:col-span-7 space-y-6">
            {selectedCheckpoint ? (
              <div className="space-y-6">
                {/* Thẻ Header Checkpoint được chọn */}
                <div className="p-5 sm:p-6 rounded-[16px] bg-muted/40 dark:bg-slate-900/60 border border-border shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono uppercase tracking-wider text-primary font-bold">
                          {getCheckpointStageLabel(selectedCheckpoint, selectedCheckpointIndex)}
                        </span>
                        {getStatusBadge(selectedCheckpoint.status)}
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-foreground">
                        {selectedCheckpoint.title}
                      </h2>
                    </div>

                    {/* Đồng hồ đếm ngược nếu chặng đang mở hoặc trong grace_period */}
                    {(selectedCheckpoint.status === 'open' ||
                      selectedCheckpoint.status === 'grace_period') && (
                      <div className="flex flex-col sm:items-end shrink-0">
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                          Thời gian còn lại
                        </span>
                        <CountdownTimer
                          endTime={selectedCheckpoint.deadline}
                          isPaused={
                            selectedCheckpoint.contest_allows_submission === false &&
                            Boolean(
                              selectedCheckpoint.submission_block_reason
                                ?.toLowerCase()
                                .includes('tạm dừng')
                            )
                          }
                          pausedRemainingSeconds={selectedCheckpoint.time_remaining_seconds}
                        />
                      </div>
                    )}
                  </div>

                  {/* Mô tả & Yêu cầu */}
                  <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                    <p className="leading-relaxed">{selectedCheckpoint.description}</p>
                    {selectedCheckpoint.requirements && (
                      <div className="p-3.5 rounded-[10px] bg-card border border-border space-y-1 text-xs">
                        <span className="text-primary font-semibold block uppercase tracking-wider text-[11px]">
                          Yêu cầu bàn giao:
                        </span>
                        <p className="text-muted-foreground">{selectedCheckpoint.requirements}</p>
                      </div>
                    )}
                  </div>

                  {/* Cảnh báo đặc thù của chặng */}
                  {selectedCheckpoint.is_final_checkpoint ? (
                    <div className="p-3 rounded-[10px] bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <AlertTriangle size={15} className="shrink-0 text-amber-700 dark:text-amber-400" />
                      <span>
                        Đây là chặng cuối cùng: Các đội có thể cập nhật thêm giao diện và kho mã nguồn linh hoạt trong thời gian mở cổng.
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-[10px] bg-indigo-500/10 border border-indigo-500/20 text-xs text-primary flex items-center gap-2">
                      <Info size={15} className="shrink-0 text-primary" />
                      <span>
                        Chặng tiến độ: Đội thi nộp báo cáo tiến độ và tiếp tục phát triển giao diện, tính năng bình thường.
                      </span>
                    </div>
                  )}

                  {/* Thông tin mốc thời gian */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-muted-foreground border-t border-border font-mono">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-muted-foreground" />
                      <span>Bắt đầu: {new Date(selectedCheckpoint.start_time).toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <Clock size={14} className="text-amber-700 dark:text-amber-400" />
                      <span className="text-amber-700 dark:text-amber-400">
                        Hạn chót: {new Date(selectedCheckpoint.deadline).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* FORM NỘP BÀI CHECKPOINT (HF-30 & SRS HF-23) */}
                <div className="p-5 sm:p-6 rounded-[16px] bg-muted/40 dark:bg-slate-900/60 border border-border shadow-xl space-y-5">
                  <div className="border-b border-border pb-3 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                        <Send size={18} className="text-primary" />
                        <span>Form Nộp bài Checkpoint</span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedCheckpoint.is_final_checkpoint
                          ? 'Điền đường dẫn GitHub repo và các tài nguyên sản phẩm hoàn chỉnh của đội.'
                          : 'Nộp link tài liệu báo cáo tiến độ, wireframe hoặc link demo theo cấu hình.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedCheckpoint.status !== 'upcoming' && selectedCheckpoint.latest_submission ? (
                        <Badge
                          variant={
                            getSubmissionStatusMeta(
                              selectedCheckpoint.latest_submission.status,
                              Boolean(selectedCheckpoint.is_final_checkpoint),
                              Boolean(selectedCheckpoint.latest_submission.is_late),
                              hasOnTimeSubmissionHistory(selectedCheckpoint.latest_submission, submissions)
                            ).badgeVariant
                          }
                          size="sm"
                        >
                          {
                            getSubmissionStatusMeta(
                              selectedCheckpoint.latest_submission.status,
                              Boolean(selectedCheckpoint.is_final_checkpoint),
                              Boolean(selectedCheckpoint.latest_submission.is_late),
                              hasOnTimeSubmissionHistory(selectedCheckpoint.latest_submission, submissions)
                            ).badgeLabel
                          }
                        </Badge>
                      ) : (
                        getStatusBadge(selectedCheckpoint.status)
                      )}
                    </div>
                  </div>

                  {/* Component Form nộp bài theo tiêu chuẩn HF-30 */}
                  <CheckpointSubmissionForm
                    key={selectedCheckpoint.id}
                    checkpoint={selectedCheckpoint}
                    currentSubmission={
                      selectedCheckpoint.status === 'upcoming'
                        ? null
                        : selectedCheckpoint.latest_submission
                    }
                    submissionHistory={submissions}
                    userRole={userRole}
                    onSuccess={handleSubmissionSuccess}
                  />
                </div>

                {/* BẢNG HIỂN THỊ LỊCH SỬ NỘP BÀI CỦA ĐỘI THI (HF-31) */}
                <SubmissionHistoryTable
                  submissions={selectedCheckpoint.status === 'upcoming' ? [] : submissions}
                  isLoading={isSubmissionsLoading}
                  errorMessage={submissionsError}
                  checkpointTitle={selectedCheckpoint.title}
                  isFinalCheckpoint={Boolean(selectedCheckpoint.is_final_checkpoint)}
                  onRefresh={() => fetchSubmissions(selectedCheckpoint.id)}
                />
              </div>
            ) : (
              <div className="p-12 text-center rounded-[16px] bg-muted/40 dark:bg-slate-900/60 border border-border">
                <p className="text-muted-foreground text-sm">Vui lòng chọn một chặng checkpoint để xem chi tiết.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateCheckpointsPage;

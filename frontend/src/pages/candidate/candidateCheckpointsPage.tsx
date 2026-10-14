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
import { useAuthStore } from '../../store/useAuthStore';
import {
  type CheckpointWithSubmission,
  type Submission,
  getSubmissionStatusMeta,
} from '../../types/checkpoint';

export const CandidateCheckpointsPage: React.FC = () => {
  const [checkpoints, setCheckpoints] = useState<CheckpointWithSubmission[]>([]);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

        // Mặc định chọn checkpoint đang mở ('open' hoặc 'grace_period') hoặc checkpoint đầu tiên
        const openCp =
          data.find((cp) => cp.status === 'open' || cp.status === 'grace_period') || data[0];
        if (openCp) {
          setSelectedCheckpointId(openCp.id);
          const history = await checkpointApi.getSubmissions(openCp.id);
          if (isMounted) {
            setSubmissions(history);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách checkpoints:', err);
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
  };

  const selectedCheckpoint = checkpoints.find((cp) => cp.id === selectedCheckpointId);

  // Callback khi nộp bài thành công từ CheckpointSubmissionForm
  const handleSubmissionSuccess = (newSub: Submission) => {
    // 1. Cập nhật latest_submission trong danh sách checkpoint
    setCheckpoints((prev) =>
      prev.map((cp) => {
        if (cp.id === newSub.checkpoint_id) {
          return {
            ...cp,
            latest_submission: newSub,
          };
        }
        return cp;
      })
    );

    // 2. Đẩy bài nộp mới lên đầu bảng lịch sử nộp bài (HF-31)
    setSubmissions((prev) => [newSub, ...prev.filter((s) => s.id !== newSub.id)]);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="success">Đang mở nộp bài</Badge>;
      case 'grace_period':
        return <Badge variant="warning">Ân hạn mạng (Grace Period)</Badge>;
      case 'upcoming':
        return <Badge variant="indigo">Sắp diễn ra</Badge>;
      case 'closed':
        return <Badge variant="neutral">Đã đóng</Badge>;
      default:
        return <Badge variant="neutral">Chưa bắt đầu</Badge>;
    }
  };

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto font-['Roboto']">
      {/* Tiêu đề trang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30">
            <CheckSquare size={22} />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-white">
              Tiến độ và Nộp bài Checkpoint
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Quản lý tiến độ các chặng thi, đóng băng Commit SHA và theo dõi lịch sử bài nộp của đội.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-[16px] bg-[#0F172A] border border-[#334155]">
          <svg className="animate-spin h-8 w-8 text-[#6366F1] mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-slate-400">Đang tải tiến trình các chặng thi...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI: DANH SÁCH CHECKPOINT (5 CỘT) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Layers size={16} className="text-[#818CF8]" />
                <span>Các chặng Checkpoint</span>
              </h2>
              <span className="text-xs text-slate-500">{checkpoints.length} chặng</span>
            </div>

            <div className="space-y-3">
              {checkpoints.map((cp) => {
                const isSelected = cp.id === selectedCheckpointId;
                const hasSubmitted = !!cp.latest_submission;
                const isFinal = Boolean(cp.is_final_checkpoint);
                const subMeta = cp.latest_submission
                  ? getSubmissionStatusMeta(cp.latest_submission.status, isFinal)
                  : null;

                return (
                  <div
                    key={cp.id}
                    onClick={() => handleSelectCheckpoint(cp.id)}
                    className={`p-4 rounded-[14px] border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-[#1E293B] border-[#6366F1] shadow-lg shadow-[#6366F1]/10 ring-1 ring-[#6366F1]/50'
                        : 'bg-[#0F172A] border-[#334155] hover:border-slate-500 hover:bg-[#1E293B]/60'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#6366F1]" />
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-[#818CF8]">
                            Chặng {cp.order || 1}
                          </span>
                          {getStatusBadge(cp.status)}
                          {isFinal ? (
                            <Badge variant="danger" size="sm">
                              Chặng cuối (Chốt SHA)
                            </Badge>
                          ) : (
                            <Badge variant="indigo" size="sm">
                              Chặng tiến độ
                            </Badge>
                          )}
                          {hasSubmitted && subMeta && (
                            <Badge variant={subMeta.badgeVariant} size="sm">
                              {subMeta.badgeLabel}
                            </Badge>
                          )}
                          {cp.latest_submission?.grace_period_applied && (
                            <Badge variant="warning" size="sm">
                              Grace Period
                            </Badge>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-white truncate pt-1">
                          {cp.title}
                        </h3>

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {cp.description}
                        </p>
                      </div>

                      <ChevronRight
                        size={18}
                        className={`shrink-0 transition-transform ${
                          isSelected ? 'text-[#818CF8] translate-x-0.5' : 'text-slate-600'
                        }`}
                      />
                    </div>

                    {/* Deadline footer */}
                    <div className="mt-3 pt-2.5 border-t border-[#334155]/60 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Clock size={12} className="text-amber-400" />
                        <span>Hạn: {new Date(cp.deadline).toLocaleDateString('vi-VN')}</span>
                      </div>

                      {hasSubmitted && cp.latest_submission && (
                        <span
                          className={`text-[10px] font-mono ${
                            subMeta?.normalizedStatus === 'sha_verification_failed'
                              ? 'text-amber-400'
                              : subMeta?.normalizedStatus === 'invalid'
                              ? 'text-rose-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {cp.latest_submission.commit_sha
                            ? `Commit: ${cp.latest_submission.commit_sha.slice(0, 7)}`
                            : subMeta?.normalizedStatus === 'sha_verification_failed'
                            ? 'Chờ xác minh SHA'
                            : 'Đã nộp báo cáo'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hướng dẫn & Quy định theo chuẩn SRS HF-23 */}
            <div className="p-4 rounded-[14px] bg-[#0F172A]/70 border border-[#334155] text-xs text-slate-400 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <Info size={14} className="text-cyan-400" />
                <span>Quy định nộp bài Checkpoint (SRS HF-23)</span>
              </div>
              <ul className="list-disc pl-4 space-y-1.5 text-slate-400 leading-relaxed text-[11px]">
                <li>
                  <strong className="text-slate-300">Chặng tiến độ trung gian:</strong> Nộp tài liệu theo cấu hình động (<code className="text-indigo-300">submission_fields</code>). Không yêu cầu GitHub repo và không khóa Commit SHA để tiếp tục code bình thường.
                </li>
                <li>
                  <strong className="text-slate-300">Chặng cuối cùng (Final):</strong> Bắt buộc URL GitHub repository public (bắt đầu bằng <code className="text-indigo-300">https://github.com/</code>). Hệ thống sẽ đóng băng Commit SHA tại thời điểm nộp.
                </li>
                <li>
                  <strong className="text-amber-300">Phân quyền:</strong> Chỉ tài khoản có vai trò Đội trưởng (<code className="text-amber-300 font-mono">TEAM_LEADER</code>) mới có quyền bấm nộp bài để tránh xung đột dữ liệu.
                </li>
              </ul>
            </div>
          </div>

          {/* CỘT PHẢI: CHI TIẾT CHECKPOINT, FORM NỘP BÀI & BẢNG LỊCH SỬ NỘP BÀI (7 CỘT) */}
          <div className="lg:col-span-7 space-y-6">
            {selectedCheckpoint ? (
              <div className="space-y-6">
                {/* Thẻ Header Checkpoint được chọn */}
                <div className="p-5 sm:p-6 rounded-[16px] bg-[#0F172A] border border-[#334155] shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#334155]/80 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono uppercase tracking-wider text-[#818CF8] font-bold">
                          Chặng {selectedCheckpoint.order || 1}
                        </span>
                        {getStatusBadge(selectedCheckpoint.status)}
                        {selectedCheckpoint.is_final_checkpoint ? (
                          <Badge variant="danger" size="sm">
                            Chặng chốt sản phẩm cuối cùng
                          </Badge>
                        ) : (
                          <Badge variant="indigo" size="sm">
                            Chặng nộp tiến độ
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-white">
                        {selectedCheckpoint.title}
                      </h2>
                    </div>

                    {/* Đồng hồ đếm ngược nếu chặng đang mở hoặc trong grace_period */}
                    {(selectedCheckpoint.status === 'open' ||
                      selectedCheckpoint.status === 'grace_period') && (
                      <div className="flex flex-col sm:items-end shrink-0">
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                          Thời gian còn lại
                        </span>
                        <CountdownTimer endTime={selectedCheckpoint.deadline} />
                      </div>
                    )}
                  </div>

                  {/* Mô tả & Yêu cầu */}
                  <div className="space-y-2 text-xs sm:text-sm text-slate-300">
                    <p className="leading-relaxed">{selectedCheckpoint.description}</p>
                    {selectedCheckpoint.requirements && (
                      <div className="p-3.5 rounded-[10px] bg-[#1E293B]/80 border border-[#334155] space-y-1 text-xs">
                        <span className="text-[#818CF8] font-semibold block uppercase tracking-wider text-[11px]">
                          Yêu cầu bàn giao:
                        </span>
                        <p className="text-slate-300">{selectedCheckpoint.requirements}</p>
                      </div>
                    )}
                  </div>

                  {/* Cảnh báo đặc thù của chặng */}
                  {selectedCheckpoint.is_final_checkpoint ? (
                    <div className="p-3 rounded-[10px] bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                      <AlertTriangle size={15} className="shrink-0 text-amber-400" />
                      <span>
                        Đây là chặng cuối cùng: Hệ thống sẽ khóa và đóng băng Commit SHA khi nộp.
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-[10px] bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
                      <Info size={15} className="shrink-0 text-indigo-400" />
                      <span>
                        Chặng tiến độ: Không yêu cầu GitHub repo và không đóng băng commit, bạn tiếp tục code bình thường.
                      </span>
                    </div>
                  )}

                  {/* Thông tin mốc thời gian */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-400 border-t border-[#334155]/60 font-mono">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-500" />
                      <span>Bắt đầu: {new Date(selectedCheckpoint.start_time).toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <Clock size={14} className="text-amber-400" />
                      <span className="text-amber-300">
                        Hạn chót: {new Date(selectedCheckpoint.deadline).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* FORM NỘP BÀI CHECKPOINT (HF-30 & SRS HF-23) */}
                <div className="p-5 sm:p-6 rounded-[16px] bg-[#0F172A] border border-[#334155] shadow-xl space-y-5">
                  <div className="border-b border-[#334155] pb-3 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <Send size={18} className="text-[#818CF8]" />
                        <span>Form Nộp bài Checkpoint</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {selectedCheckpoint.is_final_checkpoint
                          ? 'Điền đường dẫn GitHub repo để hệ thống tiến hành kiểm tra và chốt Commit SHA.'
                          : 'Nộp link tài liệu báo cáo tiến độ, wireframe hoặc link demo theo cấu hình.'}
                      </p>
                    </div>

                    {selectedCheckpoint.latest_submission && (
                      <Badge
                        variant={
                          getSubmissionStatusMeta(
                            selectedCheckpoint.latest_submission.status,
                            Boolean(selectedCheckpoint.is_final_checkpoint)
                          ).badgeVariant
                        }
                        size="sm"
                      >
                        {
                          getSubmissionStatusMeta(
                            selectedCheckpoint.latest_submission.status,
                            Boolean(selectedCheckpoint.is_final_checkpoint)
                          ).badgeLabel
                        }
                      </Badge>
                    )}
                  </div>

                  {/* Component Form nộp bài theo tiêu chuẩn HF-30 */}
                  <CheckpointSubmissionForm
                    key={selectedCheckpoint.id}
                    checkpoint={selectedCheckpoint}
                    currentSubmission={selectedCheckpoint.latest_submission}
                    userRole={userRole}
                    onSuccess={handleSubmissionSuccess}
                  />
                </div>

                {/* BẢNG HIỂN THỊ LỊCH SỬ NỘP BÀI CỦA ĐỘI THI (HF-31) */}
                <SubmissionHistoryTable
                  submissions={submissions}
                  isLoading={isSubmissionsLoading}
                  errorMessage={submissionsError}
                  checkpointTitle={selectedCheckpoint.title}
                  isFinalCheckpoint={Boolean(selectedCheckpoint.is_final_checkpoint)}
                  onRefresh={() => fetchSubmissions(selectedCheckpoint.id)}
                />
              </div>
            ) : (
              <div className="p-12 text-center rounded-[16px] bg-[#0F172A] border border-[#334155]">
                <p className="text-slate-400 text-sm">Vui lòng chọn một chặng checkpoint để xem chi tiết.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateCheckpointsPage;

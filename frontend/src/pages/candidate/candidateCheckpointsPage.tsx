import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  Calendar,
  ChevronRight,
  Layers,
  Send,
  Info,
} from 'lucide-react';
import { Badge } from '../../components/Badge';
import { CountdownTimer } from '../../components/CountdownTimer';
import { CheckpointSubmissionForm } from '../../components/CheckpointSubmissionForm';
import { checkpointApi } from '../../api/checkpointApi';
import type { CheckpointWithSubmission, Submission } from '../../types/checkpoint';

export const CandidateCheckpointsPage: React.FC = () => {
  const [checkpoints, setCheckpoints] = useState<CheckpointWithSubmission[]>([]);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load danh sách checkpoints
  useEffect(() => {
    const fetchCheckpoints = async () => {
      try {
        setIsLoading(true);
        const data = await checkpointApi.getCheckpoints();
        setCheckpoints(data);

        // Mặc định chọn checkpoint đang mở ('open') hoặc checkpoint đầu tiên
        const openCp = data.find((cp) => cp.status === 'open') || data[0];
        if (openCp) {
          setSelectedCheckpointId(openCp.id);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách checkpoints:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCheckpoints();
  }, []);

  const selectedCheckpoint = checkpoints.find((cp) => cp.id === selectedCheckpointId);

  // Callback khi nộp bài thành công từ CheckpointSubmissionForm
  const handleSubmissionSuccess = (newSub: Submission) => {
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
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="success">Đang mở nộp bài</Badge>;
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
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30">
              <CheckSquare size={22} />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-white">
                Tiến độ và Nộp bài Checkpoint
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Quản lý các mốc nộp bài theo từng chặng thi đua và đóng băng Commit SHA mã nguồn.
              </p>
            </div>
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
          {/* CỘT TRÁI: DANH SÁCH CHECKPOINT (4 CỘT) */}
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

                return (
                  <div
                    key={cp.id}
                    onClick={() => setSelectedCheckpointId(cp.id)}
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
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-[#818CF8]">
                            Chặng {cp.order || 1}
                          </span>
                          {getStatusBadge(cp.status)}
                          {hasSubmitted && (
                            <Badge variant="approved" size="sm">
                              ✓ Đã nộp bài
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
                        <span className="text-[10px] text-emerald-400 font-mono">
                          Commit: {cp.latest_submission.commit_sha.slice(0, 7)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hướng dẫn & Quy định */}
            <div className="p-4 rounded-[14px] bg-[#0F172A]/70 border border-[#334155] text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <Info size={14} className="text-cyan-400" />
                <span>Quy tắc nộp bài và đóng băng Commit</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-400 leading-relaxed">
                <li>URL bắt buộc thuộc GitHub (bắt đầu bằng <code className="text-indigo-300">https://github.com/</code>).</li>
                <li>Hệ thống ghi nhận commit HEAD chính xác tại thời điểm nhấn xác nhận nộp.</li>
                <li>Mọi commit sau thời hạn deadline sẽ không được tính vào kết quả chấm điểm.</li>
              </ul>
            </div>
          </div>

          {/* CỘT PHẢI: CHI TIẾT CHECKPOINT & FORM NỘP BÀI (7 CỘT) */}
          <div className="lg:col-span-7 space-y-6">
            {selectedCheckpoint ? (
              <div className="space-y-6">
                {/* Thẻ Header Checkpoint được chọn */}
                <div className="p-5 sm:p-6 rounded-[16px] bg-[#0F172A] border border-[#334155] shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#334155]/80 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono uppercase tracking-wider text-[#818CF8] font-bold">
                          Chặng {selectedCheckpoint.order || 1}
                        </span>
                        {getStatusBadge(selectedCheckpoint.status)}
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-white">
                        {selectedCheckpoint.title}
                      </h2>
                    </div>

                    {/* Đồng hồ đếm ngược nếu chặng đang mở */}
                    {selectedCheckpoint.status === 'open' && (
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

                {/* FORM NỘP BÀI CHECKPOINT (HF-30) */}
                <div className="p-5 sm:p-6 rounded-[16px] bg-[#0F172A] border border-[#334155] shadow-xl space-y-5">
                  <div className="border-b border-[#334155] pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <Send size={18} className="text-[#818CF8]" />
                        <span>Form Nộp bài Checkpoint</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Điền đường dẫn GitHub repo để hệ thống tiến hành kiểm tra và chốt Commit SHA.
                      </p>
                    </div>

                    {selectedCheckpoint.latest_submission && (
                      <Badge variant="success" size="sm">
                        Đã có 1 bản nộp
                      </Badge>
                    )}
                  </div>

                  {/* Component Form nộp bài theo tiêu chuẩn HF-30 */}
                  <CheckpointSubmissionForm
                    key={selectedCheckpoint.id}
                    checkpoint={selectedCheckpoint}
                    currentSubmission={selectedCheckpoint.latest_submission}
                    onSuccess={handleSubmissionSuccess}
                  />
                </div>
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

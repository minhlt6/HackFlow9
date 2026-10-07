import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import {
  CheckSquare,
  GitBranch,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileCode,
  ShieldCheck,
} from 'lucide-react';

export const CandidateCheckpointsPage: React.FC = () => {
  const { currentUser, teams, checkpoints, submissions, submitCheckpoint, openWizardAtStep, config } = useMockStore();

  const formatDuration = (mins: number) => {
    if (!mins || mins <= 0) return '0 phút';
    if (mins < 60) return `${mins} phút`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hours} giờ ${rem} phút` : `${hours} giờ`;
  };

  const myTeam = teams.find((t) => t.id === currentUser.teamId);
  const isLeader = currentUser.teamRole === 'leader' || myTeam?.leaderId === currentUser.id;

  const [selectedCpId, setSelectedCpId] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState('https://github.com/cybersentinels/ai-health-core');
  const [demoUrl, setDemoUrl] = useState('https://ai-health.demo.io');
  const [confirmLock, setConfirmLock] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ sha: string } | null>(null);

  const teamSubmissions = submissions.filter((s) => s.teamId === myTeam?.id);

  const handleOpenSubmit = (cpId: string) => {
    setSelectedCpId(cpId);
    setSubmitResult(null);
    setConfirmLock(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTeam || !selectedCpId) return;

    const res = submitCheckpoint(selectedCpId, myTeam.id, repoUrl, demoUrl);
    if (res.success) {
      setSubmitResult({ sha: res.commitSha });
    }
  };

  const selectedCheckpoint = checkpoints.find((c) => c.id === selectedCpId);

  return (
    <div className="space-y-6 font-['Roboto']">
      {/* Top Header */}
      <div>
        <h1
          className="font-['Righteous'] text-2xl sm:text-3xl tracking-wide"
          style={{
            background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Tiến Độ Các Chặng Nộp Bài
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Các mốc kiểm tra tiến độ bắt buộc. Mỗi bài nộp sẽ ghi nhận lại chính xác mã commit tại thời điểm nộp để giám khảo đánh giá.
        </p>
      </div>

      {/* Warning when candidate has no team */}
      {!myTeam && (
        <div className="rounded-[14px] border border-amber-500/40 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-amber-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-white">Bạn chưa gia nhập đội thi</h4>
              <p className="text-xs text-slate-300">
                Để nộp bài các chặng, bạn bắt buộc phải tạo đội mới hoặc nhập mã mời của đội trưởng để tham gia đội.
              </p>
            </div>
          </div>
          <button
            onClick={() => openWizardAtStep(2)}
            className="px-4 py-2 rounded-[8px] bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer"
          >
            Ghép đội thi ngay
          </button>
        </div>
      )}

      {/* Checkpoints Cards List */}
      <div className="space-y-5">
        {checkpoints.map((cp, idx) => {
          const submission = teamSubmissions.find((s) => s.checkpointId === cp.id);
          const isSubmitted = Boolean(submission);
          const isOverdue = new Date(cp.deadline).getTime() < new Date().getTime() && !isSubmitted;

          return (
            <div
              key={cp.id}
              className={`rounded-[16px] border p-6 transition-all ${
                isSubmitted
                  ? 'bg-[#1E293B] border-emerald-500/40 shadow-sm'
                  : 'bg-[#1E293B] border-[#334155]'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                {/* Left CP Info */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6366F1]/20 text-[#818CF8] font-bold text-xs">
                      #{idx + 1}
                    </div>
                    <h3 className="font-['Righteous'] text-xl text-white tracking-wide">
                      {cp.title}
                    </h3>
                    <Badge variant={isSubmitted ? 'success' : isOverdue ? 'danger' : 'warning'}>
                      {isSubmitted
                        ? 'Đã nộp bài'
                        : isOverdue
                        ? 'Đã quá hạn'
                        : 'Đang mở nộp bài'}
                    </Badge>
                    <Badge variant="indigo">
                      Thời lượng: {cp.durationMinutes || 180} phút ({formatDuration(cp.durationMinutes || 180)})
                    </Badge>
                    <Badge variant="indigo">Trọng số {cp.weight || 20}%</Badge>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                    {cp.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-[#818CF8]" />
                      <span>Thời lượng làm bài:</span>
                      <span className="font-semibold text-white">
                        {cp.durationMinutes || 180} phút ({formatDuration(cp.durationMinutes || 180)})
                      </span>
                    </div>

                    <span>•</span>

                    {config.isContestStarted ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Hạn nộp chính thức: {new Date(cp.deadline).toLocaleString('vi-VN')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-300">
                        <span>Cuộc thi chưa bắt đầu (Thời hạn sẽ bắt đầu tính khi BTC phát lệnh)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Action / Submission Data */}
                <div className="flex flex-col sm:items-end justify-center gap-3 shrink-0">
                  {isSubmitted && submission ? (
                    <div className="p-3.5 rounded-[12px] bg-[#0F172A] border border-emerald-500/30 text-xs space-y-2 min-w-[260px]">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <CheckCircle2 size={15} />
                        <span>Đã ghi nhận bài nộp thành công</span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-[11px] text-slate-300">
                        <span className="text-slate-400">Commit SHA:</span>
                        <span className="text-[#818CF8] font-bold">{submission.commitSha.slice(0, 10)}...</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Thời gian nộp: {new Date(submission.submittedAt).toLocaleTimeString('vi-VN')}
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-[#334155]">
                        <a
                          href={submission.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[#818CF8] hover:underline"
                        >
                          <FileCode size={12} />
                          <span>Repo GitHub</span>
                          <ExternalLink size={10} />
                        </a>
                        {submission.demoUrl && (
                          <a
                            href={submission.demoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-emerald-400 hover:underline ml-auto"
                          >
                            <span>Live Demo</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant={isOverdue ? 'secondary' : 'primary'}
                      disabled={isOverdue}
                      onClick={() => {
                        if (!myTeam) {
                          openWizardAtStep(2);
                        } else {
                          handleOpenSubmit(cp.id);
                        }
                      }}
                      className="gap-2"
                    >
                      <UploadCloud size={16} />
                      <span>
                        {isOverdue
                          ? 'Đã đóng cổng nộp'
                          : !myTeam
                          ? 'Ghép đội để nộp bài'
                          : 'Nộp bài Checkpoint này'}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submission Modal */}
      <Modal
        isOpen={Boolean(selectedCpId)}
        onClose={() => setSelectedCpId(null)}
        title={`Nộp Bài: ${selectedCheckpoint?.title || ''}`}
        maxWidth="lg"
      >
        {submitResult ? (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <ShieldCheck size={36} />
            </div>

            <div className="space-y-1">
              <h4 className="font-['Righteous'] text-xl text-white">Nộp Bài Thành Công!</h4>
              <p className="text-xs text-slate-300">
                Hệ thống đã khóa liên kết mã nguồn và ghi nhận mã Commit SHA bảo mật.
              </p>
            </div>

            <div className="p-3 rounded-[10px] bg-[#0F172A] border border-emerald-500/40 font-mono text-xs text-emerald-300">
              SHA: {submitResult.sha}
            </div>

            <Button
              variant="primary"
              onClick={() => setSelectedCpId(null)}
              className="w-full mt-4"
            >
              Hoàn tất
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="GitHub Repository URL *"
              placeholder="https://github.com/organization/project-repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              required
            />

            <Input
              label="Đường dẫn Demo Trực Tuyến (Nếu có)"
              placeholder="https://your-demo-app.vercel.app"
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
            />

            <div className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <AlertTriangle size={14} />
                <span>Quy định nộp mã nguồn:</span>
              </div>
              <p>
                Kho mã nguồn phải để ở chế độ Public hoặc cấp quyền truy cập cho GitHub của Ban Giám Khảo. Hệ thống sẽ tự động chốt Commit SHA mới nhất tại thời điểm bạn nhấn nút nộp.
              </p>
            </div>

            <label className="flex items-start gap-2.5 pt-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmLock}
                onChange={(e) => setConfirmLock(e.target.checked)}
                className="mt-0.5 rounded border-[#334155] bg-[#0F172A] text-[#6366F1] focus:ring-[#6366F1]"
                required
              />
              <span>
                Tôi xác nhận thông tin bài nộp này đại diện cho toàn bộ đội thi{' '}
                <strong>{myTeam?.name}</strong>.
              </span>
            </label>

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="ghost" type="button" onClick={() => setSelectedCpId(null)}>
                Hủy
              </Button>
              <Button variant="primary" type="submit" disabled={!confirmLock}>
                Xác nhận nộp bài
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

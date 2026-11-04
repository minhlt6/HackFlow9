import React, { useEffect, useMemo, useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { apiClient } from '../../api/axiosClient';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import {
  Send,
  Video,
  Presentation,
  FileCode,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Edit3,
  Clock,
} from 'lucide-react';

export const CandidateFinalSubmissionPage: React.FC = () => {
  const {
    currentUser,
    teams,
    finalSubmissions,
    checkpoints,
    config,
    openWizardAtStep,
    syncFromBackend,
  } = useMockStore();

  const myTeam = currentUser.teamId ? teams.find((t) => t.id === currentUser.teamId) : undefined;

  const existingFinal = myTeam ? finalSubmissions.find((f) => f.teamId === myTeam.id) : undefined;

  const [repoUrl, setRepoUrl] = useState(
    existingFinal?.repoUrl || '',
  );
  const [demoVideoUrl, setDemoVideoUrl] = useState(
    existingFinal?.demoVideoUrl || '',
  );
  const [slideUrl, setSlideUrl] = useState(
    existingFinal?.slideUrl || '',
  );
  const [summary, setSummary] = useState(
    existingFinal?.summary || '',
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmLock, setConfirmLock] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingSubmitted, setIsEditingSubmitted] = useState(false);
  const [successSha, setSuccessSha] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const finalCheckpoint = useMemo(
    () =>
      checkpoints
        .filter((cp) => cp.isFinalCheckpoint)
        .sort((a, b) => (b.deadline || '').localeCompare(a.deadline || ''))[0],
    [checkpoints],
  );

  // Chỉ hẹn giờ cập nhật tại đúng mốc chuyển trạng thái (startTime / deadline) hoặc mỗi 30s
  // nhằm tránh re-render toàn bộ form mỗi giây khi thí sinh đang nhập liệu.
  useEffect(() => {
    const now = Date.now();
    const startMs = finalCheckpoint?.startTime
      ? new Date(finalCheckpoint.startTime).getTime()
      : NaN;
    const deadlineMs = finalCheckpoint?.deadline
      ? new Date(finalCheckpoint.deadline).getTime()
      : NaN;

    const upcomingTransitions = [startMs, deadlineMs]
      .filter((t) => Number.isFinite(t) && t > now)
      .map((t) => t - now);

    const nextDelay =
      upcomingTransitions.length > 0
        ? Math.min(30_000, Math.max(250, Math.min(...upcomingTransitions) + 50))
        : 30_000;

    const timer = window.setTimeout(() => setNowMs(Date.now()), nextDelay);
    return () => window.clearTimeout(timer);
  }, [nowMs, finalCheckpoint?.startTime, finalCheckpoint?.deadline]);

  useEffect(() => {
    void syncFromBackend?.();
  }, [syncFromBackend]);

  const formattedDeadline = useMemo(() => {
    const raw = finalCheckpoint?.deadline || config?.finalSubmissionDeadline;
    if (!raw) return 'Chưa cấu hình';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return 'Chưa cấu hình';
    return parsed.toLocaleString('vi-VN');
  }, [finalCheckpoint?.deadline, config?.finalSubmissionDeadline]);

  const isDeadlinePassed = Boolean(
    finalCheckpoint?.deadline &&
      Number.isFinite(new Date(finalCheckpoint.deadline).getTime()) &&
      new Date(finalCheckpoint.deadline).getTime() < nowMs,
  );

  const isNotOpenYet = Boolean(
    finalCheckpoint &&
      (finalCheckpoint.status === 'upcoming' ||
        (finalCheckpoint.startTime &&
          Number.isFinite(new Date(finalCheckpoint.startTime).getTime()) &&
          new Date(finalCheckpoint.startTime).getTime() > nowMs)),
  );

  const isSubmissionClosed = finalCheckpoint?.status === 'closed';
  const isLateWindow =
    !isNotOpenYet &&
    !isSubmissionClosed &&
    (finalCheckpoint?.status === 'late' || isDeadlinePassed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTeam) return;
    if (isNotOpenYet) {
      setError('Cổng nộp bài chung cuộc chưa đến giờ mở.');
      return;
    }
    if (isSubmissionClosed) {
      setError('Đã quá thời hạn nộp bài chung cuộc.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const apiRes = await apiClient.post('/submissions/final', {
        team_id: myTeam.id,
        github_url: repoUrl.trim(),
        demo_url: demoVideoUrl.trim(),
        slide_url: slideUrl.trim(),
        description: summary.trim(),
      });
      const data = apiRes.data.data;
      await syncFromBackend?.();
      setSuccessSha(String(data?.commit_sha || 'submitted'));
      setIsEditingSubmitted(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể nộp bài. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 ">
      {error && <div role="alert" className="text-red-500">{error}</div>}
      {/* Top Header */}
      <div>
        <h1
          className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide"
        >
          Nộp Bài Dự Thi Chung Cuộc
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Hồ sơ dự thi chung cuộc bao gồm Kho mã nguồn, Video thực nghiệm và Slide thuyết trình trước Hội đồng Giám khảo.
        </p>
      </div>

      {/* Warning when candidate has no team */}
      {!myTeam && (
        <div className="rounded-[14px] border border-amber-500/40 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className="text-amber-700 dark:text-amber-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-foreground">Bạn chưa gia nhập đội thi</h4>
              <p className="text-xs text-muted-foreground">
                Để nộp bài chung cuộc, bạn bắt buộc phải có đội thi và đề tài nghiên cứu chính thức.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openWizardAtStep(2)}
            className="px-4 py-2 rounded-[8px] bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer"
          >
            Ghép đội thi ngay
          </button>
        </div>
      )}

      {/* Time-gate Banner when final checkpoint is upcoming or closed */}
      {myTeam && isNotOpenYet && (
        <div className="rounded-[14px] border border-amber-500/40 bg-amber-500/10 p-4 flex items-center gap-3">
          <Clock size={20} className="text-amber-700 dark:text-amber-400 shrink-0" />
          <div className="text-xs text-foreground">
            <strong>Cổng nộp bài chung cuộc chưa mở:</strong> Bạn có thể chuẩn bị trước thông tin nhưng chỉ có thể gửi bài khi Chặng Chung Kết chính thức mở cổng.
          </div>
        </div>
      )}

      {myTeam && isLateWindow && (
        <div className="rounded-[14px] border border-amber-500/40 bg-amber-500/10 p-4 flex items-center gap-3">
          <Clock size={20} className="text-amber-700 dark:text-amber-400 shrink-0" />
          <div className="text-xs text-foreground">
            <strong>Đang mở tiếp nhận Nộp muộn (Quá hạn chuẩn {formattedDeadline}):</strong> Hệ thống vẫn cho phép nộp hoặc cập nhật bài dự thi chung cuộc nhưng bài nộp sẽ được gắn cờ <strong>Nộp muộn</strong>.
          </div>
        </div>
      )}

      {myTeam && isSubmissionClosed && (
        <div className="rounded-[14px] border border-rose-500/40 bg-rose-500/10 p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-rose-700 dark:text-rose-400 shrink-0" />
          <div className="text-xs text-foreground">
            <strong>Cổng nộp bài chung cuộc đã đóng:</strong> Thời hạn nộp bài ({formattedDeadline}) đã kết thúc. Mọi thao tác nộp mới hoặc chỉnh sửa đã bị khóa.
          </div>
        </div>
      )}

      {(existingFinal || successSha) && !isEditingSubmitted ? (
        /* Submitted View with Frozen SHA */
        <div className="rounded-[16px] border border-emerald-500/40 bg-card p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h3 className="font-semibold tracking-tight text-foreground text-xl text-foreground">
                  Đã Nộp Bài Dự Thi Thành Công!
                </h3>
                <p className="text-xs text-muted-foreground">
                  Bài dự thi của đội <strong className="text-foreground">{myTeam?.name}</strong> đã được chốt và gửi đến Ban Giám Khảo.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isSubmissionClosed && !isNotOpenYet && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (existingFinal?.repoUrl) setRepoUrl(existingFinal.repoUrl);
                    if (existingFinal?.demoVideoUrl) setDemoVideoUrl(existingFinal.demoVideoUrl);
                    if (existingFinal?.slideUrl) setSlideUrl(existingFinal.slideUrl);
                    if (existingFinal?.summary) setSummary(existingFinal.summary);
                    setIsEditingSubmitted(true);
                  }}
                  className="gap-1.5 text-xs"
                >
                  <Edit3 size={13} />
                  <span>Cập nhật lại bài nộp</span>
                </Button>
              )}
              {existingFinal?.isLate && (
                <Badge variant="warning">Nộp muộn</Badge>
              )}
              <Badge variant="success">Trạng thái: Đã Chốt Bài Nộp</Badge>
            </div>
          </div>

          {/* Submission Details Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                <FileCode size={16} className="text-primary" />
                <span>Kho mã nguồn GitHub</span>
              </div>
              <a
                href={existingFinal?.repoUrl || repoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
              >
                <span className="truncate">{existingFinal?.repoUrl || repoUrl}</span>
                <ExternalLink size={12} className="shrink-0" />
              </a>
            </div>

            <div className="p-4 rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                <Video size={16} className="text-emerald-700 dark:text-emerald-400" />
                <span>Video Demo Thuyết Trình</span>
              </div>
              <a
                href={existingFinal?.demoVideoUrl || demoVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 truncate"
              >
                <span className="truncate">{existingFinal?.demoVideoUrl || demoVideoUrl}</span>
                <ExternalLink size={12} className="shrink-0" />
              </a>
            </div>

            <div className="p-4 rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                <Presentation size={16} className="text-amber-700 dark:text-amber-400" />
                <span>Slide Trình Chiếu</span>
              </div>
              <a
                href={existingFinal?.slideUrl || slideUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 truncate"
              >
                <span className="truncate">{existingFinal?.slideUrl || slideUrl}</span>
                <ExternalLink size={12} className="shrink-0" />
              </a>
            </div>
          </div>

          {/* Abstract */}
          <div className="p-4 rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Tóm tắt dự án
            </span>
            <p className="text-xs sm:text-sm text-foreground leading-relaxed">
              {existingFinal?.summary || summary}
            </p>
          </div>
        </div>
      ) : myTeam ? (
        /* Submission Form */
        <div className="rounded-[16px] border border-border bg-card p-6 lg:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="1. GitHub Repository URL (Mã nguồn chính thức) *"
              placeholder="https://github.com/your-team/final-project"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={isSubmissionClosed}
              required
            />

            <Input
              label="2. Video Demo sản phẩm (YouTube / Loom) *"
              placeholder="https://youtu.be/..."
              value={demoVideoUrl}
              onChange={(e) => setDemoVideoUrl(e.target.value)}
              disabled={isSubmissionClosed}
              required
            />

            <Input
              label="3. Slide thuyết trình (Google Slides / Canva / PDF URL) *"
              placeholder="https://docs.google.com/presentation/d/..."
              value={slideUrl}
              onChange={(e) => setSlideUrl(e.target.value)}
              disabled={isSubmissionClosed}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-muted-foreground font-medium text-sm">
                4. Tóm tắt giải pháp & Kết quả đạt được (Tối đa 500 từ) *
              </label>
              <textarea
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                disabled={isSubmissionClosed}
                placeholder="Mô tả công nghệ sử dụng, bài toán giải quyết, độ chính xác mô hình hoặc phản hồi từ người dùng thử nghiệm..."
                className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:border-[#6366F1] focus:outline-none disabled:opacity-60"
                required
              />
            </div>

            <div className="rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-amber-500/30 p-4 text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                <AlertCircle size={15} />
                <span>Lưu ý trước khi nộp bài:</span>
              </div>
              <p>
                Đội thi có thể cập nhật thêm giao diện, mã nguồn và tài liệu dự thi linh hoạt trước thời hạn{' '}
                <strong>{formattedDeadline}</strong>. Sau thời hạn này, cổng nộp bài sẽ đóng hoàn toàn.
              </p>
            </div>

            <label className="flex items-start gap-2.5 pt-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmLock}
                onChange={(e) => setConfirmLock(e.target.checked)}
                disabled={isSubmissionClosed || isNotOpenYet}
                className="mt-0.5 rounded border-border bg-muted/40 dark:bg-slate-900/60 text-[#6366F1] focus:ring-[#6366F1]"
                required
              />
              <span>
                Tôi xác nhận các tài liệu và đường dẫn trên đã được các thành viên trong đội kiểm tra và đồng ý nộp bài.
              </span>
            </label>

            <div className="flex justify-end pt-3">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting || !confirmLock || isSubmissionClosed || isNotOpenYet}
                className="w-full sm:w-auto"
              >
                <Send size={16} />
                <span>
                  {isSubmitting
                    ? 'Đang gửi bài dự thi...'
                    : isSubmissionClosed
                      ? 'Đã đóng cổng nộp bài'
                      : isNotOpenYet
                        ? 'Chưa đến giờ mở cổng'
                        : isEditingSubmitted
                          ? isLateWindow
                            ? 'Cập Nhật Bài (Nộp Muộn)'
                            : 'Cập Nhật Lại Bài Nộp'
                          : isLateWindow
                            ? 'Nộp Bài Chung Cuộc (Nộp Muộn)'
                            : 'Nộp Bài Dự Thi Chung Cuộc'}
                </span>
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};

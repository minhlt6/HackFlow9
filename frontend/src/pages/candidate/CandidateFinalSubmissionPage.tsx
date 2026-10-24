import React, { useEffect, useState } from 'react';
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
  GitCommit,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Edit3,
} from 'lucide-react';

export const CandidateFinalSubmissionPage: React.FC = () => {
  const { currentUser, teams, finalSubmissions, submitFinalProject, config, openWizardAtStep, syncFromBackend } =
    useMockStore();

  const myTeam = teams.find((t) => t.id === currentUser.teamId);

  const existingFinal = finalSubmissions.find((f) => f.teamId === myTeam?.id);

  const [repoUrl, setRepoUrl] = useState(
    existingFinal?.repoUrl || 'https://github.com/cybersentinels/ai-diagnosis-copilot',
  );
  const [demoVideoUrl, setDemoVideoUrl] = useState(
    existingFinal?.demoVideoUrl || 'https://youtube.com/watch?v=demo-health-ai',
  );
  const [slideUrl, setSlideUrl] = useState(
    existingFinal?.slideUrl || 'https://docs.google.com/presentation/d/demo-pitch-deck',
  );
  const [summary, setSummary] = useState(
    existingFinal?.summary ||
      'Giải pháp ứng dụng mô hình Vision-Language Model để hỗ trợ bác sĩ chẩn đoán hình ảnh X-quang và tự động sinh bản tóm tắt bệnh án chuẩn hóa y tế.',
  );
  const [confirmLock, setConfirmLock] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingSubmitted, setIsEditingSubmitted] = useState(false);
  const [successSha, setSuccessSha] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    void syncFromBackend?.();
  }, [syncFromBackend]);

  const isDeadlinePassed =
    Boolean(config.finalSubmissionDeadline) &&
    new Date(config.finalSubmissionDeadline).getTime() < nowMs;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTeam) return;

    setIsSubmitting(true);
    let backendSha: string | null = null;
    try {
      const apiRes = await apiClient.post('/submissions/final', {
        team_id: myTeam.id,
        github_url: repoUrl.trim(),
        demo_url: demoVideoUrl.trim(),
        slide_url: slideUrl.trim(),
        description: summary.trim(),
      });
      const dataObj = apiRes.data?.data ?? apiRes.data;
      if (dataObj?.commit_sha) {
        backendSha = String(dataObj.commit_sha);
      }
    } catch {
      // Fallback to local store commitSha generation
    }

    const res = submitFinalProject(
      myTeam.id,
      repoUrl.trim(),
      demoVideoUrl.trim(),
      slideUrl.trim(),
      summary.trim(),
    );
    const finalSha = backendSha || res.commitSha;
    if (backendSha) {
      useMockStore.setState((state) => ({
        finalSubmissions: state.finalSubmissions.map((f) =>
          f.teamId === myTeam.id ? { ...f, commitSha: backendSha } : f
        ),
      }));
    }
    setIsSubmitting(false);
    setIsEditingSubmitted(false);
    if (res.success) {
      setSuccessSha(finalSha);
    }
  };

  return (
    <div className="space-y-6 ">
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
              {!isDeadlinePassed && (
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
              <Badge variant="success">Trạng thái: Đã Chốt Bài Nộp</Badge>
            </div>
          </div>

          {/* Frozen Commit SHA Badge */}
          <div className="rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold tracking-wider text-muted-foreground flex items-center gap-1.5">
                <GitCommit size={15} className="text-primary" />
                <span>Mã băm commit đóng băng an toàn</span>
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Bảo vệ tính toàn vẹn</span>
            </div>
            <div className="font-mono text-base font-bold text-foreground bg-muted/40 dark:bg-slate-900/60 p-3 rounded-[8px] border border-border overflow-x-auto text-emerald-700 dark:text-emerald-400">
              {existingFinal?.commitSha || successSha}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Giám khảo sẽ chỉ đánh giá mã nguồn tại chính xác commit hash này. Mọi thay đổi sau thời điểm nộp sẽ không được tính.
            </p>
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
      ) : (
        /* Submission Form */
        <div className="rounded-[16px] border border-border bg-card p-6 lg:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="1. GitHub Repository URL (Mã nguồn chính thức) *"
              placeholder="https://github.com/your-team/final-project"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              required
            />

            <Input
              label="2. Video Demo sản phẩm (YouTube / Loom) *"
              placeholder="https://youtu.be/..."
              value={demoVideoUrl}
              onChange={(e) => setDemoVideoUrl(e.target.value)}
              required
            />

            <Input
              label="3. Slide thuyết trình (Google Slides / Canva / PDF URL) *"
              placeholder="https://docs.google.com/presentation/d/..."
              value={slideUrl}
              onChange={(e) => setSlideUrl(e.target.value)}
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
                placeholder="Mô tả công nghệ sử dụng, bài toán giải quyết, độ chính xác mô hình hoặc phản hồi từ người dùng thử nghiệm..."
                className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:border-[#6366F1] focus:outline-none"
                required
              />
            </div>

            <div className="rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-amber-500/30 p-4 text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                <AlertCircle size={15} />
                <span>Cảnh báo trước khi nộp bài:</span>
              </div>
              <p>
                Sau khi nhấn Nộp bài chung cuộc, hệ thống sẽ thực hiện chốt commit SHA tự động. Sau thời hạn{' '}
                <strong>{new Date(config.finalSubmissionDeadline).toLocaleString('vi-VN')}</strong>, mọi thao tác chỉnh sửa hoặc nộp lại sẽ bị vô hiệu hóa hoàn toàn.
              </p>
            </div>

            <label className="flex items-start gap-2.5 pt-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmLock}
                onChange={(e) => setConfirmLock(e.target.checked)}
                className="mt-0.5 rounded border-border bg-muted/40 dark:bg-slate-900/60 text-[#6366F1] focus:ring-[#6366F1]"
                required
              />
              <span>
                Tôi xác nhận các tài liệu và đường dẫn trên đã được các thành viên trong đội kiểm tra và đồng ý nộp bài.
              </span>
            </label>

            <div className="flex justify-end pt-3">
              <Button
                variant="primary"
                type="submit"
                size="lg"
                disabled={!confirmLock || !myTeam || isSubmitting}
                isLoading={isSubmitting}
                className="gap-2 px-8"
              >
                <Send size={18} />
                <span>Xác nhận Nộp Bài Chung Cuộc</span>
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

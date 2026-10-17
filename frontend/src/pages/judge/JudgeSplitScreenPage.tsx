import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import {
  FileCode,
  Video,
  Presentation,
  CheckSquare,
  Save,
  EyeOff,
  GitBranch,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Globe,
  Palette,
  Lock,
  FileText,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

export const JudgeSplitScreenPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    currentUser,
    teams,
    rubricCriteria,
    evaluations,
    finalSubmissions,
    submissions,
    saveEvaluation,
    config,
    majorTopics,
    toggleBlindJudging,
  } = useMockStore();

  const initialTeamId = searchParams.get('teamId') || teams[0]?.id || '';
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId);
  const [leftTab, setLeftTab] = useState<'code' | 'video' | 'slides' | 'checkpoints'>('code');

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];
  const teamSubTopic = majorTopics
    ?.flatMap((m) => m.subTopics || [])
    ?.find((s) => s.id === selectedTeam?.subTopicId);
  const teamTopicTitle = teamSubTopic?.title || 'Chưa cập nhật đề tài';
  const finalSub = finalSubmissions.find((f) => f.teamId === selectedTeam?.id);
  const teamCheckpoints = submissions.filter((s) => s.teamId === selectedTeam?.id);

  // Existing evaluation for this team by current judge
  const existingEval = evaluations.find(
    (e) => e.teamId === selectedTeam?.id && e.judgeId === currentUser.id,
  );

  // Check if evaluation has been officially submitted & locked (Read-only)
  const isLocked = Boolean(existingEval && !existingEval.isDraft);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Scores state: Map criterionId -> score (0 to maxScore) or '' during typing
  const [scores, setScores] = useState<Record<string, number | ''>>(() => {
    if (existingEval?.scores) return existingEval.scores;
    const initial: Record<string, number | ''> = {};
    for (const c of rubricCriteria) {
      initial[c.id] = Math.round(c.maxScore * 0.85); // default good score
    }
    return initial;
  });

  const [generalComment, setGeneralComment] = useState(
    existingEval?.generalComment ||
      'Dự án triển khai bài bản, kiến trúc rõ ràng, video thuyết phục. Cần tối ưu thêm độ trễ mô hình khi inference trên thiết bị biên.',
  );
  const [alert, setAlert] = useState<string | null>(null);

  // Sync scores when selected team changes
  useEffect(() => {
    if (existingEval?.scores) {
      setScores(existingEval.scores);
      setGeneralComment(existingEval.generalComment);
    } else {
      const initial: Record<string, number | ''> = {};
      for (const c of rubricCriteria) {
        initial[c.id] = Math.round(c.maxScore * 0.85);
      }
      setScores(initial);
      setGeneralComment(
        'Dự án có triển vọng cao. Mã nguồn được tổ chức sạch sẽ, tuân thủ Clean Architecture.',
      );
    }
  }, [selectedTeamId]);

  const handleScoreChange = (criterionId: string, value: number, max: number) => {
    if (isLocked) return;
    const clamped = Math.max(0, Math.min(value, max));
    setScores((prev) => ({ ...prev, [criterionId]: clamped }));
  };

  const handleInputChange = (criterionId: string, rawVal: string, max: number) => {
    if (isLocked) return;
    if (rawVal === '') {
      setScores((prev) => ({ ...prev, [criterionId]: '' }));
      return;
    }
    // Remove leading zeros before any digits: e.g. "05" -> "5", "024" -> "24"
    const sanitized = rawVal.replace(/^0+(?=\d)/, '');
    const parsed = parseInt(sanitized, 10);
    if (isNaN(parsed)) {
      setScores((prev) => ({ ...prev, [criterionId]: 0 }));
      return;
    }
    const clamped = Math.max(0, Math.min(parsed, max));
    setScores((prev) => ({ ...prev, [criterionId]: clamped }));
  };

  const handleInputBlur = (criterionId: string) => {
    if (isLocked) return;
    setScores((prev) => ({
      ...prev,
      [criterionId]:
        typeof prev[criterionId] === 'number' && !isNaN(prev[criterionId] as number)
          ? prev[criterionId]
          : 0,
    }));
  };

  // Compute weighted total score (out of 100)
  const totalWeight = rubricCriteria.reduce((sum, c) => sum + (c.weight || 0), 0) || 100;
  const rawWeightedSum = rubricCriteria.reduce((sum, c) => {
    const rawScore = scores[c.id];
    const score = typeof rawScore === 'number' && !isNaN(rawScore) ? rawScore : 0;
    const max = c.maxScore > 0 ? c.maxScore : 10;
    const normalized = (Math.max(0, Math.min(score, max)) / max) * c.weight;
    return sum + normalized;
  }, 0);
  const totalWeightedScore = Math.round(((rawWeightedSum / totalWeight) * 100) * 10) / 10;

  const handleSaveDraft = () => {
    if (!selectedTeam || isLocked) return;
    const numericScores: Record<string, number> = {};
    for (const c of rubricCriteria) {
      const val = scores[c.id];
      numericScores[c.id] = typeof val === 'number' && !isNaN(val) ? val : 0;
    }
    saveEvaluation(
      selectedTeam.id,
      currentUser.id,
      currentUser.fullName,
      numericScores,
      generalComment,
      true, // isDraft = true
    );
    setAlert('Đã lưu bản nháp điểm thành công! Giám khảo vẫn có thể chỉnh sửa tiếp.');
    setTimeout(() => setAlert(null), 3500);
  };

  const handleFinalSubmit = () => {
    if (!selectedTeam) return;
    const numericScores: Record<string, number> = {};
    for (const c of rubricCriteria) {
      const val = scores[c.id];
      numericScores[c.id] = typeof val === 'number' && !isNaN(val) ? val : 0;
    }
    saveEvaluation(
      selectedTeam.id,
      currentUser.id,
      currentUser.fullName,
      numericScores,
      generalComment,
      false, // isDraft = false -> official lock
    );
    setAlert(`Đã xác nhận khóa và nộp điểm chính thức (${totalWeightedScore}đ) cho đội thi! Bảng điểm chuyển sang chế độ Chỉ đọc (Read-only).`);
    setIsConfirmModalOpen(false);
    setTimeout(() => setAlert(null), 4000);
  };

  const currentTeamIndex = teams.findIndex((t) => t.id === selectedTeamId);
  const handlePrevTeam = () => {
    if (currentTeamIndex > 0) {
      const nextId = teams[currentTeamIndex - 1].id;
      setSelectedTeamId(nextId);
      setSearchParams({ teamId: nextId });
    }
  };
  const handleNextTeam = () => {
    if (currentTeamIndex < teams.length - 1) {
      const nextId = teams[currentTeamIndex + 1].id;
      setSelectedTeamId(nextId);
      setSearchParams({ teamId: nextId });
    }
  };

  const displayName = config.blindJudgingMode
    ? `ĐỘI-ANON-${(currentTeamIndex + 1).toString().padStart(2, '0')}`
    : selectedTeam?.name;

  if (teams.length === 0 || !selectedTeam) {
    return (
      <div className="rounded-[14px] border border-[#334155] bg-[#1E293B] p-12 text-center font-['Roboto']">
        <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <CheckSquare size={32} />
        </div>
        <h3 className="text-xl font-bold font-['Righteous'] text-white tracking-wide mb-2">Chưa có đội thi sẵn sàng chấm điểm</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Hiện tại hệ thống đang ở giai đoạn đầu của cuộc thi. Danh sách sản phẩm chung kết sẽ hiển thị tại đây ngay khi các đội hoàn thành bài nộp.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-['Roboto'] h-[calc(100vh-100px)] flex flex-col">
      {/* Top Bar: Team Switcher & Header */}
      <div className="rounded-[14px] border border-[#334155] bg-[#1E293B] px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevTeam}
              disabled={currentTeamIndex === 0}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
              title="Đội trước"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNextTeam}
              disabled={currentTeamIndex === teams.length - 1}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
              title="Đội tiếp theo"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Đang chấm:</span>
            <select
              value={selectedTeamId}
              onChange={(e) => {
                setSelectedTeamId(e.target.value);
                setSearchParams({ teamId: e.target.value });
              }}
              className="px-3 py-1.5 rounded-[8px] bg-[#0F172A] border border-[#334155] text-white text-xs font-bold focus:border-[#6366F1] focus:outline-none"
            >
              {teams.map((t, idx) => (
                <option key={t.id} value={t.id}>
                  {config.blindJudgingMode
                    ? `ĐỘI-ANON-${(idx + 1).toString().padStart(2, '0')}`
                    : `${t.name} (${t.leaderName})`}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={toggleBlindJudging}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              config.blindJudgingMode
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30 shadow-xs'
                : 'bg-[#0F172A] border-[#334155] text-slate-400 hover:text-white hover:border-[#6366F1]'
            }`}
            title="Nhấn để bật hoặc tắt Chế độ Chấm ẩn danh (Blind Judging)"
          >
            <EyeOff size={13} />
            <span>{config.blindJudgingMode ? 'Chế độ Ẩn danh: BẬT' : 'Chế độ Ẩn danh: TẮT'}</span>
          </button>
        </div>

        {/* Live Total Score Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#0F172A] border border-[#334155]">
            <span className="text-xs text-slate-400">Tổng điểm quy đổi:</span>
            <span className="font-['Righteous'] text-lg text-emerald-400 font-mono">
              {totalWeightedScore} / 100
            </span>
          </div>

          {existingEval && !existingEval.isDraft && (
            <Badge variant="success">Đã Chốt Điểm</Badge>
          )}
        </div>
      </div>

      {alert && (
        <div className="p-3 rounded-[10px] bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2 shrink-0">
          <CheckCircle2 size={15} />
          <span>{alert}</span>
        </div>
      )}

      {/* 50/50 Split Screen Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Left Pane: Artifacts & Submissions (6/12) */}
        <div className="lg:col-span-6 rounded-[16px] border border-[#334155] bg-[#1E293B] flex flex-col min-h-0 overflow-hidden">
          {/* Blind Judging Anonymous Submission Header (SRS HF-36 / HF-39) */}
          <div className="p-4 bg-[#0B1120] border-b border-[#334155] space-y-2.5 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {config.blindJudgingMode ? 'Mã đội ẩn danh (Blind Judging):' : 'Đội thi được phân công:'}
                </span>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-white font-mono">
                    {displayName}
                  </h4>
                  {config.blindJudgingMode && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                      <EyeOff size={10} />
                      <span>Chấm ẩn danh</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Direct Demo & Repo Buttons */}
              <div className="flex items-center gap-2">
                {finalSub?.repoUrl ? (
                  <a
                    href={finalSub.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1E293B] border border-[#334155] text-[#818CF8] hover:text-white text-xs font-mono font-medium hover:border-[#6366F1] transition shadow-xs"
                    title="Truy cập Kho mã nguồn GitHub"
                  >
                    <GitBranch size={13} />
                    <span>Repo</span>
                    <ExternalLink size={11} />
                  </a>
                ) : (
                  <span className="text-xs text-slate-500 font-mono">Chưa có Repo</span>
                )}
                {finalSub?.demoVideoUrl ? (
                  <a
                    href={finalSub.demoVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:text-white text-xs font-mono font-medium hover:border-emerald-500 transition shadow-xs"
                    title="Xem sản phẩm Demo trực tuyến / Video"
                  >
                    <Globe size={13} />
                    <span>Demo</span>
                    <ExternalLink size={11} />
                  </a>
                ) : (
                  <span className="text-xs text-slate-500 font-mono">Chưa có Demo</span>
                )}
              </div>
            </div>

            {/* Topic & Frozen Commit SHA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-[#1E293B]">
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[11px]">Đề tài dự thi:</span>
                <p className="font-semibold text-slate-200 line-clamp-1">
                  {teamTopicTitle}
                </p>
              </div>
              <div className="space-y-0.5 sm:text-right">
                <span className="text-slate-400 text-[11px] flex sm:justify-end items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  <span>Frozen Commit SHA:</span>
                </span>
                <p className="font-mono text-emerald-400 font-bold text-xs">
                  {finalSub?.commitSha || 'd7b1a459e8f2038c'}
                </p>
              </div>
            </div>
          </div>

          {/* Artifact Tabs Header */}
          <div className="flex items-center border-b border-[#334155] bg-[#0B1120] px-4 pt-2 gap-2 shrink-0 overflow-x-auto">
            <button
              onClick={() => setLeftTab('code')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 transition-colors ${
                leftTab === 'code'
                  ? 'border-[#6366F1] text-[#818CF8] bg-[#1E293B]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode size={14} />
              <span>Kho Mã Nguồn</span>
            </button>

            <button
              onClick={() => setLeftTab('video')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 transition-colors ${
                leftTab === 'video'
                  ? 'border-[#6366F1] text-[#818CF8] bg-[#1E293B]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video size={14} />
              <span>Video Demo</span>
            </button>

            <button
              onClick={() => setLeftTab('slides')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 transition-colors ${
                leftTab === 'slides'
                  ? 'border-[#6366F1] text-[#818CF8] bg-[#1E293B]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Presentation size={14} />
              <span>Slide Thuyết Trình</span>
            </button>

            <button
              onClick={() => setLeftTab('checkpoints')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 transition-colors ${
                leftTab === 'checkpoints'
                  ? 'border-[#6366F1] text-[#818CF8] bg-[#1E293B]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckSquare size={14} />
              <span>Lịch Sử Checkpoints</span>
            </button>
          </div>

          {/* Left Pane Tab Body */}
          <div className="flex-1 p-4 overflow-y-auto min-h-0 space-y-4">
            {leftTab === 'code' && (
              <div className="space-y-4">
                {/* Frozen Commit SHA Badge */}
                <div className="p-3.5 rounded-[12px] bg-[#0F172A] border border-[#334155] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <GitBranch size={13} className="text-[#818CF8]" />
                      <span>Mã Commit Đã Khóa:</span>
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {finalSub?.commitSha || 'd7b1a459e8f2038c'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Đường dẫn kho:</span>
                    <a
                      href={finalSub?.repoUrl || 'https://github.com/cybersentinels/ai-health-core'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#818CF8] hover:underline flex items-center gap-1 font-mono text-[11px]"
                    >
                      <span>{finalSub?.repoUrl || 'https://github.com/cybersentinels/ai-health-core'}</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>

                {/* Simulated Code / README Preview */}
                <div className="rounded-[12px] bg-[#0B1120] border border-[#334155] p-4 font-mono text-xs text-slate-300 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#334155] text-slate-400 text-[11px]">
                    <span>README.md • Branch: main</span>
                    <span>Commit Verified ✓</span>
                  </div>
                  <div className="space-y-2 leading-relaxed">
                    <h4 className="text-white font-bold text-sm"># Medical AI Diagnostic Copilot</h4>
                    <p className="text-slate-400">
                      An end-to-end multi-modal deep learning platform for automated pulmonary disease detection.
                    </p>
                    <div className="bg-[#080D18] p-3 rounded border border-[#334155]/60 text-[11px] text-emerald-300">
                      <code>
                        {`// Core Inference Pipeline\nasync function predictXRay(imageTensor: Tensor) {\n  const resnetWeights = await loadModel('vgg-resnet50-v2');\n  const segmentation = await resnetWeights.infer(imageTensor);\n  return formatClinicalReport(segmentation);\n}`}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {leftTab === 'video' && (
              <div className="space-y-3">
                <div className="aspect-video w-full rounded-[12px] bg-[#0F172A] border border-[#334155] flex flex-col items-center justify-center p-6 text-center">
                  <Video size={48} className="text-emerald-400 mb-2 opacity-80" />
                  <p className="text-sm font-semibold text-white">Video Thuyết Trình Dự Án</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    {finalSub?.demoVideoUrl || 'https://youtube.com/watch?v=demo-health-ai'}
                  </p>
                  <a
                    href={finalSub?.demoVideoUrl || 'https://youtube.com'}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
                  >
                    <span>Mở Video Trong Tab Mới</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}

            {leftTab === 'slides' && (
              <div className="space-y-3">
                <div className="aspect-video w-full rounded-[12px] bg-[#0F172A] border border-[#334155] flex flex-col items-center justify-center p-6 text-center">
                  <Presentation size={48} className="text-amber-400 mb-2 opacity-80" />
                  <p className="text-sm font-semibold text-white">Slide Báo Cáo Dự Án</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    {finalSub?.slideUrl || 'https://docs.google.com/presentation/d/demo-pitch-deck'}
                  </p>
                  <a
                    href={finalSub?.slideUrl || 'https://docs.google.com'}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-600 text-white text-xs font-semibold hover:bg-amber-500"
                  >
                    <span>Mở Slide Trình Chiếu</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}

            {leftTab === 'checkpoints' && (
              <div className="space-y-3">
                {teamCheckpoints.map((sub, idx) => (
                  <div
                    key={sub.id}
                    className="p-3.5 rounded-[12px] bg-[#0F172A] border border-[#334155] text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>Checkpoint #{idx + 1}</span>
                      <span className="text-emerald-400 font-mono text-[11px]">
                        SHA: {sub.commitSha.slice(0, 8)}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Nộp lúc: {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                    </div>

                    {/* Deliverables Links */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {sub.repoUrl && (
                        <a
                          href={sub.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1E293B] border border-[#334155] text-[#818CF8] hover:text-white text-[11px] font-mono hover:border-[#6366F1]"
                        >
                          <GitBranch size={10} />
                          <span>Repo</span>
                          <ExternalLink size={9} />
                        </a>
                      )}
                      {sub.demoUrl && (
                        <a
                          href={sub.demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1E293B] border border-[#334155] text-emerald-400 hover:text-white text-[11px] font-mono hover:border-emerald-500"
                        >
                          <Globe size={10} />
                          <span>Demo</span>
                          <ExternalLink size={9} />
                        </a>
                      )}
                      {sub.slideUrl && (
                        <a
                          href={sub.slideUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1E293B] border border-[#334155] text-amber-300 hover:text-white text-[11px] font-mono hover:border-amber-500"
                        >
                          <Presentation size={10} />
                          <span>Slide</span>
                          <ExternalLink size={9} />
                        </a>
                      )}
                      {sub.videoUrl && (
                        <a
                          href={sub.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1E293B] border border-[#334155] text-rose-300 hover:text-white text-[11px] font-mono hover:border-rose-500"
                        >
                          <Video size={10} />
                          <span>Video</span>
                          <ExternalLink size={9} />
                        </a>
                      )}
                      {sub.figmaUrl && (
                        <a
                          href={sub.figmaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1E293B] border border-[#334155] text-purple-300 hover:text-white text-[11px] font-mono hover:border-purple-500"
                        >
                          <Palette size={10} />
                          <span>Figma</span>
                          <ExternalLink size={9} />
                        </a>
                      )}
                    </div>

                    {/* Description text */}
                    {sub.description && (
                      <p className="text-[11px] text-slate-300 italic line-clamp-2 bg-[#1E293B]/60 p-1.5 rounded border border-[#334155]/40">
                        "{sub.description}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Rubric Scoring Sheet (6/12) */}
        <div className="lg:col-span-6 rounded-[16px] border border-[#334155] bg-[#1E293B] flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b border-[#334155] bg-[#0B1120] flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-['Righteous'] text-lg text-white">
                  Bảng Điểm Rubric ({displayName})
                </h3>
                {isLocked ? (
                  <Badge variant="success">
                    <Lock size={11} className="mr-1 inline" />
                    ĐÃ KHÓA (READ-ONLY)
                  </Badge>
                ) : existingEval?.isDraft ? (
                  <Badge variant="warning">
                    <FileText size={11} className="mr-1 inline" />
                    BẢN NHÁP
                  </Badge>
                ) : (
                  <Badge variant="neutral">CHƯA CHẤM</Badge>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isLocked
                  ? 'Bảng điểm chính thức đã được khóa vào hệ thống. Chế độ chỉ đọc.'
                  : 'Chấm điểm theo từng tiêu chuẩn kỹ thuật có trọng số'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Tổng điểm:</span>
              <span className="font-mono text-xl font-bold text-emerald-400">
                {totalWeightedScore} <span className="text-xs text-slate-400">/ 100</span>
              </span>
            </div>
          </div>

          {/* Criteria Sliders Body */}
          <div className="flex-1 p-4 overflow-y-auto min-h-0 space-y-4">
            {rubricCriteria.map((c) => {
              const currentScore = scores[c.id] ?? Math.round(c.maxScore * 0.85);

              return (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-[12px] border space-y-2 transition-colors ${
                    isLocked
                      ? 'bg-[#0F172A]/70 border-[#334155]/60'
                      : 'bg-[#0F172A] border-[#334155]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white text-sm">{c.name}</span>
                      <span className="ml-2 text-slate-400">
                        (Trọng số: <strong className="text-[#818CF8]">{c.weight}%</strong>)
                      </span>
                    </div>

                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="number"
                        min={0}
                        max={c.maxScore}
                        disabled={isLocked}
                        value={currentScore}
                        onFocus={(e) => {
                          if (currentScore === 0) {
                            e.target.select();
                          }
                        }}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/^0+(?=\d)/, '');
                          e.target.value = sanitized;
                          handleInputChange(c.id, sanitized, c.maxScore);
                        }}
                        onBlur={() => handleInputBlur(c.id)}
                        className={`w-14 h-8 text-center rounded border font-bold text-sm focus:outline-none transition-colors ${
                          isLocked
                            ? 'bg-[#1E293B]/60 border-[#334155]/40 text-slate-300 cursor-not-allowed'
                            : 'bg-[#1E293B] border-[#334155] text-white focus:border-[#6366F1]'
                        }`}
                      />
                      <span className="text-slate-400">/ {c.maxScore}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-snug">{c.description}</p>

                  {/* Range Slider */}
                  <input
                    type="range"
                    min={0}
                    max={c.maxScore}
                    step={1}
                    disabled={isLocked}
                    value={typeof currentScore === 'number' && !isNaN(currentScore) ? currentScore : 0}
                    onChange={(e) =>
                      handleScoreChange(c.id, Number(e.target.value), c.maxScore)
                    }
                    className={`w-full transition-opacity ${
                      isLocked
                        ? 'opacity-30 cursor-not-allowed'
                        : 'accent-[#6366F1] cursor-pointer'
                    }`}
                  />
                </div>
              );
            })}

            {/* General Feedback Textarea */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Nhận xét & Góp ý chuyên môn của Giám khảo *</span>
                {isLocked && (
                  <span className="text-[10px] text-slate-500 font-mono italic">
                    (Đã khóa - Read-only)
                  </span>
                )}
              </label>
              <textarea
                rows={3}
                disabled={isLocked}
                readOnly={isLocked}
                value={generalComment}
                onChange={(e) => setGeneralComment(e.target.value)}
                placeholder="Ghi lại các ưu điểm, nhược điểm và khuyến nghị kỹ thuật dành cho đội thi..."
                className={`w-full p-3 rounded-[10px] border text-xs focus:outline-none transition-colors ${
                  isLocked
                    ? 'bg-[#0F172A]/70 border-[#334155]/40 text-slate-300 cursor-not-allowed'
                    : 'bg-[#0F172A] border-[#334155] text-slate-100 placeholder-slate-400 focus:border-[#6366F1]'
                }`}
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-[#334155] bg-[#0B1120] flex items-center justify-between shrink-0 gap-3">
            {isLocked ? (
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 size={16} />
                  <span>Bảng điểm đã được khóa chính thức (Read-only). Điểm số: {totalWeightedScore}đ</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const numericScores: Record<string, number> = {};
                    for (const c of rubricCriteria) {
                      const val = scores[c.id];
                      numericScores[c.id] = typeof val === 'number' && !isNaN(val) ? val : 0;
                    }
                    saveEvaluation(
                      selectedTeam.id,
                      currentUser.id,
                      currentUser.fullName,
                      numericScores,
                      generalComment,
                      true, // convert back to draft
                    );
                    setAlert('Đã mở khóa bảng điểm sang chế độ Bản nháp để chỉnh sửa!');
                    setTimeout(() => setAlert(null), 3000);
                  }}
                  className="text-slate-400 hover:text-amber-300 text-xs"
                >
                  Mở khóa sửa lại
                </Button>
              </div>
            ) : (
              <>
                <Button variant="secondary" onClick={handleSaveDraft} className="gap-1.5 text-xs">
                  <Save size={14} />
                  <span>Lưu Bản Nháp</span>
                </Button>

                <Button
                  variant="primary"
                  onClick={() => setIsConfirmModalOpen(true)}
                  className="gap-2 px-6 shadow-md shadow-[#6366F1]/25"
                >
                  <Lock size={15} />
                  <span>Xác Nhận Khóa Bảng Điểm ({totalWeightedScore}đ)</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal Xác nhận Khóa bảng điểm (AC 3) */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Xác Nhận Khóa Bảng Điểm"
        maxWidth="md"
      >
        <div className="space-y-4 font-['Roboto']">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
            <AlertTriangle size={22} className="shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-white">Khóa vĩnh viễn bảng điểm chính thức</p>
              <p className="text-amber-200/90 leading-relaxed text-xs">
                Sau khi xác nhận khóa, toàn bộ điểm số theo tiêu chí Rubric và nhận xét cho đội thi{' '}
                <strong className="text-white">{displayName}</strong> sẽ chuyển sang trạng thái{' '}
                <strong>Chỉ đọc (Read-only)</strong> để bảo đảm tính bảo mật và công bằng.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F172A] border border-[#334155] space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span>Đội thi được chấm:</span>
              <strong className="text-white font-mono text-sm">{displayName}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Đề tài:</span>
              <strong className="text-slate-200">
                {teamTopicTitle}
              </strong>
            </div>
            <div className="flex justify-between items-center text-slate-300 pt-2 border-t border-[#1E293B]">
              <span>Tổng điểm quy đổi theo trọng số:</span>
              <span className="font-['Righteous'] text-xl text-emerald-400 font-mono">
                {totalWeightedScore} / 100
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setIsConfirmModalOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleFinalSubmit}
              className="px-5 font-semibold gap-1.5"
            >
              <Lock size={15} />
              <span>Tôi Hiểu, Khóa Bảng Điểm</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

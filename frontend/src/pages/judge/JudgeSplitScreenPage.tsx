import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import {
  FileCode,
  Video,
  Presentation,
  CheckSquare,
  Save,
  Send,
  EyeOff,
  GitBranch,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
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
  } = useMockStore();

  const initialTeamId = searchParams.get('teamId') || teams[0]?.id || '';
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId);
  const [leftTab, setLeftTab] = useState<'code' | 'video' | 'slides' | 'checkpoints'>('code');

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];
  const finalSub = finalSubmissions.find((f) => f.teamId === selectedTeam?.id);
  const teamCheckpoints = submissions.filter((s) => s.teamId === selectedTeam?.id);

  // Existing evaluation for this team by current judge
  const existingEval = evaluations.find(
    (e) => e.teamId === selectedTeam?.id && e.judgeId === currentUser.id,
  );

  // Scores state: Map criterionId -> score (0 to maxScore)
  const [scores, setScores] = useState<Record<string, number>>(() => {
    if (existingEval?.scores) return existingEval.scores;
    const initial: Record<string, number> = {};
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
      const initial: Record<string, number> = {};
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
    const clamped = Math.max(0, Math.min(value, max));
    setScores((prev) => ({ ...prev, [criterionId]: clamped }));
  };

  // Compute weighted total score (out of 100)
  const totalWeightedScore = Math.round(
    rubricCriteria.reduce((sum, c) => {
      const score = scores[c.id] || 0;
      const normalized = (score / c.maxScore) * c.weight;
      return sum + normalized;
    }, 0) * 10,
  ) / 10;

  const handleSaveDraft = () => {
    if (!selectedTeam) return;
    saveEvaluation(
      selectedTeam.id,
      currentUser.id,
      currentUser.fullName,
      scores,
      generalComment,
      true,
    );
    setAlert('Đã lưu bản nháp điểm thành công!');
    setTimeout(() => setAlert(null), 3000);
  };

  const handleFinalSubmit = () => {
    if (!selectedTeam) return;
    saveEvaluation(
      selectedTeam.id,
      currentUser.id,
      currentUser.fullName,
      scores,
      generalComment,
      false,
    );
    setAlert(`Đã chốt và nộp điểm chính thức (${totalWeightedScore}đ) cho đội thi!`);
    setTimeout(() => setAlert(null), 3500);
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
    ? `Đội thi #${(currentTeamIndex + 1).toString().padStart(2, '0')}`
    : selectedTeam?.name;

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
                    ? `Đội #${(idx + 1).toString().padStart(2, '0')}`
                    : `${t.name} (${t.leaderName})`}
                </option>
              ))}
            </select>
          </div>

          {config.blindJudgingMode && (
            <Badge variant="warning">
              <EyeOff size={12} />
              <span>Chế độ ẩn danh</span>
            </Badge>
          )}
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
                    className="p-3.5 rounded-[12px] bg-[#0F172A] border border-[#334155] text-xs space-y-1.5"
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
                    <a
                      href={sub.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#818CF8] hover:underline flex items-center gap-1 font-mono text-[11px]"
                    >
                      <span>{sub.repoUrl}</span>
                      <ExternalLink size={11} />
                    </a>
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
              <h3 className="font-['Righteous'] text-lg text-white">
                Bảng Điểm Rubric ({displayName})
              </h3>
              <p className="text-xs text-slate-400">
                Chấm điểm theo từng tiêu chuẩn kỹ thuật có trọng số
              </p>
            </div>
            <span className="font-mono text-xl font-bold text-emerald-400">
              {totalWeightedScore} <span className="text-xs text-slate-400">/ 100</span>
            </span>
          </div>

          {/* Criteria Sliders Body */}
          <div className="flex-1 p-4 overflow-y-auto min-h-0 space-y-4">
            {rubricCriteria.map((c) => {
              const currentScore = scores[c.id] ?? Math.round(c.maxScore * 0.85);

              return (
                <div
                  key={c.id}
                  className="p-3.5 rounded-[12px] bg-[#0F172A] border border-[#334155] space-y-2"
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
                        value={currentScore}
                        onChange={(e) =>
                          handleScoreChange(c.id, Number(e.target.value), c.maxScore)
                        }
                        className="w-14 h-8 text-center rounded bg-[#1E293B] border border-[#334155] text-white font-bold text-sm focus:border-[#6366F1] focus:outline-none"
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
                    value={currentScore}
                    onChange={(e) =>
                      handleScoreChange(c.id, Number(e.target.value), c.maxScore)
                    }
                    className="w-full accent-[#6366F1] cursor-pointer"
                  />
                </div>
              );
            })}

            {/* General Feedback Textarea */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-slate-300">
                Nhận xét & Góp ý chuyên môn của Giám khảo *
              </label>
              <textarea
                rows={3}
                value={generalComment}
                onChange={(e) => setGeneralComment(e.target.value)}
                placeholder="Ghi lại các ưu điểm, nhược điểm và khuyến nghị kỹ thuật dành cho đội thi..."
                className="w-full p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 placeholder-slate-400 text-xs focus:border-[#6366F1] focus:outline-none"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-[#334155] bg-[#0B1120] flex items-center justify-between shrink-0 gap-3">
            <Button variant="secondary" onClick={handleSaveDraft} className="gap-1.5 text-xs">
              <Save size={14} />
              <span>Lưu Bản Nháp</span>
            </Button>

            <Button
              variant="primary"
              onClick={handleFinalSubmit}
              className="gap-2 px-6 shadow-md shadow-[#6366F1]/25"
            >
              <Send size={15} />
              <span>Xác Nhận Nộp Điểm ({totalWeightedScore}đ)</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

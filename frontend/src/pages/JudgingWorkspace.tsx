import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMockStore } from '../store/useMockStore';
import { useAuthStore } from '../store/useAuthStore';
import { evaluationService, type EvaluationCriteriaScore } from '../services/evaluationService';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
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
  Lock,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Copy,
  Check,
  Filter,
  MessageSquare,
} from 'lucide-react';

import type { Team, TeamEvaluation, RubricCriteria, User } from '../types';

interface RubricPanelProps {
  team: Team;
  existingEval?: TeamEvaluation;
  rubricCriteria: RubricCriteria[];
  currentUser: User;
  isAdmin: boolean;
  displayName: string;
  saveEvaluation: (
    teamId: string,
    judgeId: string,
    judgeName: string,
    scores: Record<string, number>,
    comment: string,
    isDraft: boolean,
  ) => void;
  onAlert: (msg: string) => void;
}

const RubricScoringPanel: React.FC<RubricPanelProps> = ({
  team,
  existingEval,
  rubricCriteria,
  currentUser,
  isAdmin,
  displayName,
  saveEvaluation,
  onAlert,
}) => {
  const isLocked = Boolean(existingEval && !existingEval.isDraft);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Scores state: Map criterionId -> score (0 to maxScore) or '' during typing
  const [scores, setScores] = useState<Record<string, number | ''>>(() => {
    if (existingEval?.scores) return existingEval.scores;
    const initial: Record<string, number | ''> = {};
    for (const c of rubricCriteria) {
      initial[c.id] = Math.round(c.maxScore * 0.85);
    }
    return initial;
  });

  // Criteria comments per criterion ID
  const [criteriaComments, setCriteriaComments] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (existingEval?.details) {
      for (const d of existingEval.details) {
        if (d.criteriaId && d.comment) {
          map[d.criteriaId] = d.comment;
        }
      }
    }
    return map;
  });

  const [generalComment, setGeneralComment] = useState(
    existingEval?.generalComment ||
      'Dự án triển khai bài bản, kiến trúc rõ ràng, video thuyết phục. Cần tối ưu thêm độ trễ mô hình khi inference trên thiết bị biên.',
  );

  const handleScoreSliderChange = (criterionId: string, value: number, max: number) => {
    if (isLocked) return;
    const clamped = Math.max(0, Math.min(value, max));
    setScores((prev) => ({ ...prev, [criterionId]: clamped }));
  };

  const handleScoreInputChange = (criterionId: string, rawVal: string, max: number) => {
    if (isLocked) return;
    if (rawVal === '') {
      setScores((prev) => ({ ...prev, [criterionId]: '' }));
      return;
    }
    const sanitized = rawVal.replace(/^0+(?=\d)/, '');
    const parsed = parseFloat(sanitized);
    if (isNaN(parsed)) {
      setScores((prev) => ({ ...prev, [criterionId]: 0 }));
      return;
    }
    const clamped = Math.max(0, Math.min(parsed, max));
    setScores((prev) => ({ ...prev, [criterionId]: clamped }));
  };

  const handleScoreBlur = (criterionId: string) => {
    if (isLocked) return;
    setScores((prev) => ({
      ...prev,
      [criterionId]:
        typeof prev[criterionId] === 'number' && !isNaN(prev[criterionId] as number)
          ? prev[criterionId]
          : 0,
    }));
  };

  // Compute weighted total score (out of 100) using useMemo per Step 2 Guide
  const totalWeightedScore = useMemo(() => {
    const totalWeight = rubricCriteria.reduce((sum, c) => sum + (c.weight || 0), 0) || 100;
    const rawWeightedSum = rubricCriteria.reduce((sum, c) => {
      const rawScore = scores[c.id];
      const score = typeof rawScore === 'number' && !isNaN(rawScore) ? rawScore : 0;
      const max = c.maxScore > 0 ? c.maxScore : 10;
      const normalized = (Math.max(0, Math.min(score, max)) / max) * c.weight;
      return sum + normalized;
    }, 0);
    return Math.round(((rawWeightedSum / totalWeight) * 100) * 10) / 10;
  }, [scores, rubricCriteria]);

  // Save Draft (status = 'draft')
  const handleSaveDraft = async () => {
    if (!team || isLocked) return;

    const numericScores: Record<string, number> = {};
    for (const c of rubricCriteria) {
      const val = scores[c.id];
      numericScores[c.id] = typeof val === 'number' && !isNaN(val) ? val : 0;
    }

    const evaluationsPayload: EvaluationCriteriaScore[] = rubricCriteria.map((c) => ({
      criteria_id: c.id,
      score: numericScores[c.id],
      comment: criteriaComments[c.id] || '',
    }));

    // Call API service
    try {
      await evaluationService.submitEvaluation({
        submission_id: team.id,
        team_id: team.id,
        status: 'draft',
        evaluations: evaluationsPayload,
        general_comment: generalComment,
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 403) {
        onAlert('Lỗi [403 FORBIDDEN_NOT_ASSIGNED_JUDGE]: Giám khảo không được phân công chấm bài này!');
        return;
      }
    }

    // Persist in local store
    saveEvaluation(
      team.id,
      currentUser.id,
      currentUser.fullName,
      numericScores,
      generalComment,
      true, // isDraft = true
    );

    onAlert('Đã lưu bản nháp điểm thành công! Giám khảo vẫn có thể chỉnh sửa tiếp.');
  };

  // Submit and Lock Evaluation (status = 'submitted')
  const handleLockConfirm = async () => {
    if (!team) return;

    // Validate empty criteria scores per SRS HF-36 (422 MISSING_RUBRIC_CRITERIA_SCORE)
    const emptyCriterion = rubricCriteria.find(
      (c) => scores[c.id] === '' || scores[c.id] === undefined,
    );
    if (emptyCriterion) {
      onAlert(
        `Lỗi [422 MISSING_RUBRIC_CRITERIA_SCORE]: Vui lòng nhập đầy đủ điểm cho tiêu chí "${emptyCriterion.name}". Không được để trống.`,
      );
      setIsConfirmModalOpen(false);
      return;
    }

    // Validate score out of range (422 SCORE_OUT_OF_RANGE)
    const outOfRange = rubricCriteria.find(
      (c) => (scores[c.id] as number) < 0 || (scores[c.id] as number) > c.maxScore,
    );
    if (outOfRange) {
      onAlert(
        `Lỗi [422 SCORE_OUT_OF_RANGE]: Điểm cho tiêu chí "${outOfRange.name}" phải từ 0 đến ${outOfRange.maxScore}.`,
      );
      setIsConfirmModalOpen(false);
      return;
    }

    const numericScores: Record<string, number> = {};
    for (const c of rubricCriteria) {
      numericScores[c.id] = scores[c.id] as number;
    }

    const evaluationsPayload: EvaluationCriteriaScore[] = rubricCriteria.map((c) => ({
      criteria_id: c.id,
      score: numericScores[c.id],
      comment: criteriaComments[c.id] || '',
    }));

    try {
      await evaluationService.submitEvaluation({
        submission_id: team.id,
        team_id: team.id,
        status: 'submitted',
        evaluations: evaluationsPayload,
        general_comment: generalComment,
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      const status = axiosErr?.response?.status;
      if (status === 403) {
        onAlert('Lỗi [403 FORBIDDEN_NOT_ASSIGNED_JUDGE]: Giám khảo không được phân công chấm đội này.');
        setIsConfirmModalOpen(false);
        return;
      }
      if (status === 409) {
        onAlert('Lỗi [409 EVALUATION_ALREADY_LOCKED]: Phiếu chấm này đã được nộp và khóa điểm trước đó!');
        setIsConfirmModalOpen(false);
        return;
      }
    }

    saveEvaluation(
      team.id,
      currentUser.id,
      currentUser.fullName,
      numericScores,
      generalComment,
      false, // isDraft = false -> official lock
    );

    setIsConfirmModalOpen(false);
    onAlert(
      `Đã xác nhận khóa và nộp điểm chính thức (${totalWeightedScore}đ) cho đội thi! Bảng điểm chuyển sang chế độ Chỉ đọc (Read-only).`,
    );
  };

  const handleAdminUnlock = () => {
    if (!isAdmin) return;
    const numericScores: Record<string, number> = {};
    for (const c of rubricCriteria) {
      const val = scores[c.id];
      numericScores[c.id] = typeof val === 'number' && !isNaN(val) ? val : 0;
    }
    saveEvaluation(
      team.id,
      currentUser.id,
      currentUser.fullName,
      numericScores,
      generalComment,
      true, // convert back to draft
    );
    onAlert('Admin đã mở khóa bảng điểm thành công để Giám khảo chấm lại!');
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Rubric Header */}
      <div className="p-4 border-b border-border bg-muted/40 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold tracking-tight text-foreground text-lg text-foreground">Phiếu Chấm Điểm Rubric</h3>
            {isLocked ? (
              <Badge variant="success" className="gap-1">
                <Lock size={12} />
                <span>ĐÃ KHÓA ĐIỂM (READ-ONLY)</span>
              </Badge>
            ) : existingEval ? (
              <Badge variant="warning" className="gap-1">
                <Save size={12} />
                <span>BẢN NHÁP</span>
              </Badge>
            ) : (
              <Badge variant="neutral" className="gap-1">
                <span>CHƯA CHẤM</span>
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Điểm chấm được chuẩn hóa tự động theo thang 100 điểm của cuộc thi.
          </p>
        </div>

        {/* Total Score Badge */}
        <div className="text-right bg-card border border-border px-4 py-2 rounded-xl flex items-baseline gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">Tổng điểm:</span>
          <span className="font-semibold tracking-tight text-foreground text-2xl text-primary">{totalWeightedScore}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>

      {/* Criteria List & Comments */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20 dark:bg-slate-950/30">
        {rubricCriteria.map((c) => {
          const currentScore = scores[c.id];
          const displayScore = currentScore === '' ? '' : currentScore ?? 0;
          return (
            <div
              key={c.id}
              className={`p-4 rounded-xl border transition-all ${
                isLocked
                  ? 'bg-card border-border'
                  : 'bg-card border-border hover:border-[#6366F1]/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {c.name}
                    <Badge variant="neutral" size="sm">
                      Trọng số: {c.weight}%
                    </Badge>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={c.maxScore}
                    step={0.5}
                    disabled={isLocked}
                    value={displayScore}
                    onFocus={(e) => {
                      if (!isLocked) e.target.select();
                    }}
                    onChange={(e) => handleScoreInputChange(c.id, e.target.value, c.maxScore)}
                    onBlur={() => handleScoreBlur(c.id)}
                    className="w-16 px-2 py-1 text-center font-semibold tracking-tight text-foreground text-base rounded-lg bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground focus:outline-none focus:border-[#6366F1] disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs text-muted-foreground font-medium">/ {c.maxScore}</span>
                </div>
              </div>

              {/* Slider (step 0.5) */}
              <div className="space-y-1 mt-2">
                <input
                  type="range"
                  min={0}
                  max={c.maxScore}
                  step={0.5}
                  disabled={isLocked}
                  value={typeof currentScore === 'number' ? currentScore : 0}
                  onChange={(e) =>
                    handleScoreSliderChange(c.id, parseFloat(e.target.value), c.maxScore)
                  }
                  className="w-full accent-[#6366F1] cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0đ</span>
                  <span>Bước nhảy: 0.5đ</span>
                  <span>{c.maxScore}đ</span>
                </div>
              </div>

              {/* Criterion comment field */}
              <div className="mt-3 pt-2.5 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <MessageSquare size={12} />
                  <span>Nhận xét tiêu chí (tùy chọn):</span>
                </div>
                <input
                  type="text"
                  disabled={isLocked}
                  value={criteriaComments[c.id] || ''}
                  onChange={(e) =>
                    setCriteriaComments((prev) => ({ ...prev, [c.id]: e.target.value }))
                  }
                  placeholder="Ghi chú nhận xét chuyên môn cho tiêu chí này..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#6366F1] disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          );
        })}

        {/* General Comment */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-2">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <FileText size={14} className="text-primary" />
            <span>Nhận Xét Chung Toàn Diện Cho Đội Thi</span>
          </label>
          <textarea
            rows={3}
            disabled={isLocked}
            value={generalComment}
            onChange={(e) => setGeneralComment(e.target.value)}
            placeholder="Nhận xét chi tiết về giải pháp, kiến trúc kỹ thuật và tiềm năng phát triển của sản phẩm..."
            className="w-full p-3 rounded-lg bg-muted/40 dark:bg-slate-900/60 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#6366F1] disabled:opacity-70 disabled:cursor-not-allowed leading-relaxed"
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-border bg-muted/40 dark:bg-slate-900/60 flex items-center justify-between shrink-0 gap-3">
        {isLocked ? (
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle2 size={16} />
              <span>Bảng điểm đã được khóa chính thức (Read-only). Điểm số: {totalWeightedScore}đ</span>
            </div>
            {isAdmin ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAdminUnlock}
                className="text-muted-foreground hover:text-amber-300 text-xs border border-amber-500/30"
              >
                Mở khóa sửa lại (Admin/BTC)
              </Button>
            ) : (
              <span className="text-[11px] text-muted-foreground italic">
                Chỉ Admin/BTC mới có quyền mở khóa phiếu chấm đã khóa
              </span>
            )}
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
              <span>Khóa Bảng Điểm ({totalWeightedScore}đ)</span>
            </Button>
          </>
        )}
      </div>

      {/* Modal Xác nhận Khóa bảng điểm */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Xác Nhận Khóa Bảng Điểm"
        maxWidth="md"
      >
        <div className="space-y-4 ">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-3">
            <AlertTriangle size={22} className="shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-foreground">Khóa vĩnh viễn bảng điểm chính thức</p>
              <p className="text-amber-700 dark:text-amber-400 leading-relaxed text-xs">
                Sau khi xác nhận khóa, toàn bộ điểm số theo tiêu chí Rubric và nhận xét cho đội thi{' '}
                <strong className="text-foreground">{displayName}</strong> sẽ chuyển sang trạng thái{' '}
                <strong className="text-amber-700 dark:text-amber-400">SUBMITTED (Read-only)</strong>.
              </p>
              <p className="text-muted-foreground text-xs">
                Giám khảo sẽ không thể tự ý sửa đổi nếu không có sự cho phép và mở khóa từ Admin/BTC.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border space-y-2 text-xs">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Đội thi:</span>
              <span className="font-semibold text-foreground">{displayName}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Tổng điểm quy đổi (thang 100):</span>
              <span className="font-semibold tracking-tight text-foreground text-lg text-emerald-700 dark:text-emerald-400">
                {totalWeightedScore} / 100
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsConfirmModalOpen(false)}>
              Quay lại kiểm tra
            </Button>
            <Button
              variant="primary"
              onClick={handleLockConfirm}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 border-none shadow-lg shadow-emerald-500/25"
            >
              <ShieldCheck size={16} />
              <span>Tôi Hiểu, Khóa Bảng Điểm</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export const JudgingWorkspace: React.FC = () => {
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

  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || currentUser?.role === 'admin';

  // Filter: Tất cả | Chưa chấm | Bản nháp | Đã khóa điểm
  const [statusFilter, setStatusFilter] = useState<'all' | 'unscored' | 'draft' | 'locked'>('all');
  const [copiedSha, setCopiedSha] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  // Load rubrics and submissions from API service on mount (fallback to mock)
  useEffect(() => {
    const initService = async () => {
      try {
        await Promise.all([
          evaluationService.getRubrics(),
          evaluationService.getAnonymousSubmissions(),
        ]);
      } catch {
        // Fallback to local store silently in demo
      }
    };
    initService();
  }, []);

  // Teams with their evaluation status for the current judge
  const teamsWithStatus = useMemo(() => {
    return teams.map((team, idx) => {
      const existing = evaluations.find(
        (e) => e.teamId === team.id && e.judgeId === currentUser.id,
      );
      let judgingStatus: 'unscored' | 'draft' | 'locked' = 'unscored';
      if (existing) {
        judgingStatus = existing.isDraft ? 'draft' : 'locked';
      }
      const anonCode = `Team #${(team.id.replace(/\D/g, '') || (idx + 1).toString()).padStart(4, '0')}`;
      return {
        ...team,
        judgingStatus,
        anonCode,
        evalItem: existing,
      };
    });
  }, [teams, evaluations, currentUser.id]);

  // Filtered teams list based on active status filter
  const filteredTeams = useMemo(() => {
    if (statusFilter === 'all') return teamsWithStatus;
    return teamsWithStatus.filter((t) => t.judgingStatus === statusFilter);
  }, [teamsWithStatus, statusFilter]);

  const [selectedTeamId, setSelectedTeamId] = useState<string>(() => {
    return searchParams.get('teamId') || '';
  });
  const [leftTab, setLeftTab] = useState<'code' | 'video' | 'slides' | 'checkpoints'>('code');

  // Derive active team cleanly without useEffect setState cascading renders
  const activeTeamId =
    filteredTeams.find((t) => t.id === selectedTeamId)?.id ||
    filteredTeams[0]?.id ||
    teams[0]?.id ||
    '';

  const selectTeam = (id: string) => {
    setSelectedTeamId(id);
    setSearchParams({ teamId: id });
  };

  const selectedTeam =
    filteredTeams.find((t) => t.id === activeTeamId) ||
    teams.find((t) => t.id === activeTeamId) ||
    teams[0];

  const teamSubTopic = majorTopics
    ?.flatMap((m) => m.subTopics || [])
    ?.find((s) => s.id === selectedTeam?.subTopicId);
  const teamTopicTitle = (teamSubTopic?.title || 'Chưa cập nhật đề tài').replace(/\s*&\s*/g, ' và ');

  const finalSub = finalSubmissions.find((f) => f.teamId === selectedTeam?.id);
  const teamCheckpoints = submissions.filter((s) => s.teamId === selectedTeam?.id);

  const existingEval = evaluations.find(
    (e) => e.teamId === selectedTeam?.id && e.judgeId === currentUser.id,
  );

  const currentTeamIndex = filteredTeams.findIndex((t) => t.id === activeTeamId);
  const handlePrevTeam = () => {
    if (currentTeamIndex > 0) {
      selectTeam(filteredTeams[currentTeamIndex - 1].id);
    }
  };
  const handleNextTeam = () => {
    if (currentTeamIndex < filteredTeams.length - 1) {
      selectTeam(filteredTeams[currentTeamIndex + 1].id);
    }
  };

  const currentTeamData = teamsWithStatus.find((t) => t.id === selectedTeam?.id);
  const displayName = config.blindJudgingMode
    ? currentTeamData?.anonCode || `Team #${(currentTeamIndex + 1).toString().padStart(4, '0')}`
    : selectedTeam?.name;

  const commitSha = finalSub?.commitSha || 'c8d4e2f89a1b2c3d';

  const handleCopySha = () => {
    navigator.clipboard.writeText(commitSha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const showAlert = (msg: string) => {
    setAlert(msg);
    setTimeout(() => setAlert(null), 4500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] -m-4 sm:-m-6 lg:-m-8 bg-background">
      {/* Top Bar Navigation & Filters */}
      <div className="h-16 border-b border-border bg-card px-4 flex items-center justify-between shrink-0 gap-4">
        {/* Left: Title & Team Navigator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentTeamIndex <= 0}
              onClick={handlePrevTeam}
              className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              title="Đội trước"
            >
              <ChevronLeft size={18} />
            </Button>

            <select
              value={activeTeamId}
              onChange={(e) => selectTeam(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:border-[#6366F1]"
            >
              {filteredTeams.map((t, idx) => {
                const label = config.blindJudgingMode
                  ? t.anonCode
                  : `${idx + 1}. ${t.name}`;
                const statusTag =
                  t.judgingStatus === 'locked'
                    ? ' [Đã khóa]'
                    : t.judgingStatus === 'draft'
                    ? ' [Nháp]'
                    : ' [Chưa chấm]';
                return (
                  <option key={t.id} value={t.id}>
                    {label} {statusTag}
                  </option>
                );
              })}
            </select>

            <Button
              variant="ghost"
              size="sm"
              disabled={currentTeamIndex >= filteredTeams.length - 1 || currentTeamIndex === -1}
              onClick={handleNextTeam}
              className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              title="Đội kế tiếp"
            >
              <ChevronRight size={18} />
            </Button>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Đội <strong className="text-foreground">{currentTeamIndex + 1}</strong> / {filteredTeams.length}
            </span>
          </div>
        </div>

        {/* Center: Filter Tabs */}
        <div className="flex items-center bg-card p-1 rounded-xl border border-border text-xs">
          <span className="px-2 text-muted-foreground hidden md:flex items-center gap-1">
            <Filter size={12} />
            <span>Lọc:</span>
          </span>
          {(
            [
              { key: 'all', label: 'Tất cả' },
              { key: 'unscored', label: 'Chưa chấm' },
              { key: 'draft', label: 'Bản nháp' },
              { key: 'locked', label: 'Đã khóa điểm' },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === f.key
                  ? 'bg-[#6366F1] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Right: Blind Judging Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleBlindJudging}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              config.blindJudgingMode
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400'
                : 'bg-muted/60 border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <EyeOff size={14} />
            <span className="hidden sm:inline">
              {config.blindJudgingMode ? 'Chấm Thi Ẩn Danh: BẬT' : 'Chấm Thi Ẩn Danh: TẮT'}
            </span>
          </button>
        </div>
      </div>

      {/* Notification Toast Alert */}
      {alert && (
        <div className="bg-[#6366F1] text-white text-xs px-4 py-2.5 flex items-center justify-between shadow-lg shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span className="font-medium">{alert}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-foreground/80 hover:text-foreground text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Main Split-screen 50/50 Body */}
      {!selectedTeam ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm space-y-2">
            <h3 className="text-base font-semibold text-foreground">Chưa có đội thi hoặc bài nộp nào</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hệ thống hiện chưa có đội thi nào đăng ký hoặc nộp sản phẩm để chấm điểm. Vui lòng quay lại sau khi các đội thi hoàn tất nộp bài.
            </p>
          </div>
        </div>
      ) : (
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Submission & Artifacts */}
        <div className="flex flex-col h-full bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {/* Header: Anonymous code & Action Links */}
          <div className="p-4 border-b border-border bg-muted/40 dark:bg-slate-900/60 shrink-0 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold tracking-tight text-foreground text-xl text-foreground tracking-wide">
                    {displayName}
                  </h2>
                  {config.blindJudgingMode ? (
                    <Badge variant="warning" className="gap-1">
                      <EyeOff size={12} />
                      <span>ẨN DANH</span>
                    </Badge>
                  ) : (
                    <Badge variant="primary">CÔNG KHAI</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Globe size={13} className="text-primary" />
                  <span>
                    Đề tài: <strong className="text-foreground">{teamTopicTitle}</strong>
                  </span>
                </p>
              </div>

              {/* Action Buttons: Repo & Demo */}
              <div className="flex items-center gap-2">
                {finalSub?.repoUrl && (
                  <a
                    href={finalSub.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-accent text-xs font-semibold text-foreground border border-border transition-all"
                  >
                    <GitBranch size={13} className="text-primary" />
                    <span>Repo</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                {finalSub?.demoVideoUrl && (
                  <a
                    href={finalSub.demoVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-xs font-semibold text-white shadow-md transition-all"
                  >
                    <Globe size={13} />
                    <span>Demo</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            {/* Frozen Commit SHA Box with Copy Button */}
            <div className="p-2.5 rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <ShieldCheck size={16} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span className="text-muted-foreground">Commit SHA đóng băng:</span>
                <code className="px-2 py-0.5 rounded bg-card border border-border text-emerald-700 dark:text-emerald-400 font-mono font-semibold text-xs">
                  {commitSha}
                </code>
              </div>
              <button
                onClick={handleCopySha}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-card hover:bg-accent text-[11px] font-medium text-muted-foreground border border-border transition-all"
                title="Sao chép Commit SHA"
              >
                {copiedSha ? (
                  <>
                    <Check size={12} className="text-emerald-700 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-400">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>

            {/* Solution Summary */}
            <div className="text-xs text-muted-foreground bg-muted/40 dark:bg-slate-900/60 p-2.5 rounded-xl border border-border leading-relaxed">
              <span className="text-muted-foreground font-semibold">Tóm tắt giải pháp: </span>
              {finalSub?.summary ||
                'Hệ thống ứng dụng AI Agent hỗ trợ tự động hóa luồng phê duyệt và đối soát tài liệu, tích hợp RAG pipeline giảm 85% thời gian xử lý thủ công.'}
            </div>
          </div>

          {/* Artifact Tabs Header */}
          <div className="flex border-b border-border bg-muted/40 dark:bg-slate-900/60 shrink-0 text-xs">
            <button
              onClick={() => setLeftTab('code')}
              className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 font-medium border-b-2 transition-all ${
                leftTab === 'code'
                  ? 'border-[#6366F1] text-primary bg-card'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileCode size={14} />
              <span>Mã Nguồn (Code)</span>
            </button>
            <button
              onClick={() => setLeftTab('video')}
              className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 font-medium border-b-2 transition-all ${
                leftTab === 'video'
                  ? 'border-[#6366F1] text-primary bg-card'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Video size={14} />
              <span>Video Demo</span>
            </button>
            <button
              onClick={() => setLeftTab('slides')}
              className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 font-medium border-b-2 transition-all ${
                leftTab === 'slides'
                  ? 'border-[#6366F1] text-primary bg-card'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Presentation size={14} />
              <span>Slide Thuyết Trình</span>
            </button>
            <button
              onClick={() => setLeftTab('checkpoints')}
              className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 font-medium border-b-2 transition-all ${
                leftTab === 'checkpoints'
                  ? 'border-[#6366F1] text-primary bg-card'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <CheckSquare size={14} />
              <span>Checkpoints ({teamCheckpoints.length})</span>
            </button>
          </div>

          {/* Artifact Content Body */}
          <div className="flex-1 overflow-y-auto p-4 bg-card">
            {leftTab === 'code' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Thông tin Kho Lưu Trữ (Repository)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Mã nguồn đã được hệ thống ghi nhận tại thời điểm đóng băng (Code Freeze).
                  </p>
                  <div className="pt-2 flex items-center gap-2">
                    <a
                      href={finalSub?.repoUrl || 'https://github.com/hackflow/team-repo'}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <GitBranch size={14} />
                      <span>{finalSub?.repoUrl || 'https://github.com/hackflow/team-repo'}</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-muted-foreground border-b border-border pb-2">
                    <span>README.md (Trích đoạn dự án)</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400">Verified Commit</span>
                  </div>
                  <pre className="text-muted-foreground whitespace-pre-wrap font-sans text-xs leading-relaxed">
                    {`# ${displayName} - HackFlow Project
- Tech Stack: React 19, FastAPI, PostgreSQL, Docker, PyTorch.
- Core Feature: Multi-agent coordination with autonomous tool calling.
- Performance: 120ms latency p95, 99.2% accuracy on benchmark test suite.`}
                  </pre>
                </div>
              </div>
            )}

            {leftTab === 'video' && (
              <div className="space-y-3">
                <div className="aspect-video w-full rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="h-16 w-16 rounded-full bg-[#6366F1]/10 flex items-center justify-center text-primary">
                    <Video size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-foreground">Video Thuyết Trình & Demo Sản Phẩm</p>
                    <p className="text-xs text-muted-foreground">Thời lượng: 04:45 • Độ phân giải: 1080p</p>
                  </div>
                  {finalSub?.demoVideoUrl && (
                    <a
                      href={finalSub.demoVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
                    >
                      <span>Mở Video Trong Tab Mới</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            )}

            {leftTab === 'slides' && (
              <div className="space-y-3">
                <div className="aspect-video w-full rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                    <Presentation size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-foreground">Slide Pitching Chung Kết</p>
                    <p className="text-xs text-muted-foreground">Định dạng: PDF / Canva Presentation (16 slides)</p>
                  </div>
                  {finalSub?.slideUrl && (
                    <a
                      href={finalSub.slideUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-lg bg-card hover:bg-accent border border-border text-xs font-semibold text-foreground flex items-center gap-1.5 transition-all"
                    >
                      <span>Xem Slide Pitching</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            )}

            {leftTab === 'checkpoints' && (
              <div className="space-y-3">
                {teamCheckpoints.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Chưa có bài nộp chặng tiến độ nào được ghi nhận.
                  </div>
                ) : (
                  teamCheckpoints.map((chk, idx) => (
                    <div
                      key={chk.id || idx}
                      className="p-3 rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">Chặng #{idx + 1}</span>
                        <Badge variant="success" size="sm">
                          Đã nộp
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {chk.description || 'Đã nộp báo cáo kiến trúc và mã nguồn giai đoạn MVP.'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Rubric Scoring Form (Subcomponent with key=selectedTeam.id) */}
        <RubricScoringPanel
          key={selectedTeam?.id}
          team={selectedTeam}
          existingEval={existingEval}
          rubricCriteria={rubricCriteria}
          currentUser={currentUser}
          isAdmin={isAdmin}
          displayName={displayName}
          saveEvaluation={saveEvaluation}
          onAlert={showAlert}
        />
      </div>
      )}
    </div>
  );
};

export default JudgingWorkspace;

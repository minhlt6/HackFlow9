import React, { useCallback, useEffect, useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { getLeaderboard, publishLeaderboard } from '../../services/evaluationService';
import { apiClient } from '../../api/axiosClient';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/patterns/ConfirmDialog';
import { Input } from '../../components/Input';
import {
  Download,
  Eye,
  EyeOff,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Unlock,
} from 'lucide-react';

interface ResultRow {
  teamId: string;
  submissionId?: string;
  teamName: string;
  leaderName: string;
  evalCount: number;
  draftEvalCount: number;
  hasLockedEvaluations: boolean;
  hasDraftEvaluations: boolean;
  avgScore: number;
  draftScore: number;
  hasDiscrepancy: boolean;
  maxSpread: number;
  judges: Array<{
    judgeId: string;
    judgeName: string;
    score: number;
    status?: 'submitted' | 'draft';
    evaluationId?: string;
  }>;
}

export const AdminResultsPage: React.FC = () => {
  const { teams, config, syncFromBackend } = useMockStore();

  const [alert, setAlert] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [apiRows, setApiRows] = useState<ResultRow[] | null>(null);
  const [unlockedTeamIds, setUnlockedTeamIds] = useState<string[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<{
    teamId: string;
    teamName: string;
    submissionId?: string;
    judgeId?: string;
    judgeName?: string;
    judges?: ResultRow['judges'];
  } | null>(null);
  const [unlockReason, setUnlockReason] = useState('Rà soát chênh lệch điểm giữa các giám khảo');
  const [unlocking, setUnlocking] = useState(false);

  const applyLeaderboardResponse = useCallback(
    (res: unknown) => {
      const rawData =
        res && typeof res === 'object' && 'data' in (res as Record<string, unknown>)
          ? (res as { data: unknown }).data
          : res;
      if (
        rawData &&
        typeof rawData === 'object' &&
        'is_result_published' in (rawData as Record<string, unknown>)
      ) {
        const isPub = Boolean((rawData as { is_result_published?: boolean }).is_result_published);
        useMockStore.setState((state) => ({
          config: { ...state.config, resultsPublished: isPub },
        }));
      }
      const entriesRaw =
        rawData && typeof rawData === 'object' && 'leaderboard' in (rawData as Record<string, unknown>)
          ? (rawData as { leaderboard: unknown[] }).leaderboard
          : Array.isArray(rawData)
            ? rawData
            : null;
      if (!Array.isArray(entriesRaw)) {
        throw new Error('Dữ liệu bảng xếp hạng trả về không hợp lệ.');
      }
      const threshold = Number(config.discrepancyThreshold ?? 15);
      const mapped: ResultRow[] = (entriesRaw as Array<Record<string, unknown>>).map((entry) => {
        const tId = String(entry.team_id ?? entry.teamId ?? '');
        const tName = String(entry.team_name ?? entry.teamName ?? '');
        const matchedTeam = teams.find((t) => t.id === tId || t.name === tName);
        const rawJudges = Array.isArray(entry.all_judge_scores)
          ? (entry.all_judge_scores as Array<Record<string, unknown>>)
          : Array.isArray(entry.judge_scores)
            ? (entry.judge_scores as Array<Record<string, unknown>>)
            : Array.isArray(entry.judgeBreakdown)
              ? (entry.judgeBreakdown as Array<Record<string, unknown>>)
              : [];
        const judgeList = rawJudges.map((jb: Record<string, unknown>, idx: number) => ({
          judgeId: String(jb.judge_id ?? jb.judgeName ?? `judge-${idx + 1}`),
          judgeName: String(jb.judge_name ?? jb.judgeName ?? `Giám khảo #${idx + 1}`),
          score: Math.round(Number(jb.total_score ?? jb.totalScore ?? 0) * 10) / 10,
          status: (String(jb.status ?? 'submitted') === 'draft' ? 'draft' : 'submitted') as
            | 'submitted'
            | 'draft',
        }));
        const lockedCount = Number(
          entry.evaluated_judges_count ??
            entry.eval_count ??
            entry.judgeCount ??
            judgeList.filter((j) => j.status === 'submitted').length
        );
        const draftCount = Number(
          entry.draft_eval_count ?? judgeList.filter((j) => j.status === 'draft').length
        );
        const rawFinalScore = Number(entry.final_score ?? entry.averageScore ?? 0);
        const rawDraftScore = Number(entry.draft_score ?? 0);
        const spread = Number(entry.max_spread ?? entry.max_discrepancy ?? entry.maxSpread ?? 0);
        return {
          teamId: tId,
          submissionId: String(entry.submission_id ?? tId),
          teamName: tName || matchedTeam?.name || 'Đội thi',
          leaderName: matchedTeam?.leaderName || 'Trưởng nhóm',
          evalCount: lockedCount,
          draftEvalCount: draftCount,
          hasLockedEvaluations: Boolean(entry.has_locked_evaluations ?? lockedCount > 0),
          hasDraftEvaluations: Boolean(entry.has_draft_evaluations ?? draftCount > 0),
          avgScore: lockedCount > 0 ? Math.round(rawFinalScore * 10) / 10 : 0,
          draftScore: draftCount > 0 ? Math.round(rawDraftScore * 10) / 10 : 0,
          hasDiscrepancy: Boolean(entry.has_discrepancy ?? entry.hasDiscrepancy ?? spread > threshold),
          maxSpread: spread,
          judges: judgeList,
        };
      });
      setApiRows(mapped);
      setLoadError(null);
      setIsStale(false);
    },
    [teams, config.discrepancyThreshold]
  );

  const loadLeaderboard = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res: unknown = await getLeaderboard();
      applyLeaderboardResponse(res);
      return true;
    } catch {
      setLoadError('Không thể tải dữ liệu bảng điểm mới nhất từ máy chủ. Vui lòng thử lại.');
      setIsStale(true);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [applyLeaderboardResponse]);

  useEffect(() => {
    let active = true;
    getLeaderboard()
      .then((res: unknown) => {
        if (!active) return;
        applyLeaderboardResponse(res);
      })
      .catch(() => {
        if (!active) return;
        setLoadError('Không thể tải dữ liệu bảng điểm mới nhất từ máy chủ. Vui lòng thử lại.');
        setIsStale(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyLeaderboardResponse, refreshTick]);

  const teamScoreRows = apiRows || [];
  const lockedTeamsCount = teamScoreRows.filter((r) => r.evalCount > 0).length;
  const draftTeamsCount = teamScoreRows.filter((r) => r.draftEvalCount > 0).length;
  const discrepancyTeamsCount = teamScoreRows.filter((r) => r.hasDiscrepancy).length;

  const handleExportCsv = () => {
    const headers = [
      'Hang',
      'Doi Thi',
      'Doi Truong',
      'So Luot Cham',
      'Diem TB (Thang 100)',
      'Do Lech Max',
      'Canh Bao Lech Diem',
    ];
    const csvLines = [
      headers.join(','),
      ...teamScoreRows.map((r, idx) =>
        [
          idx + 1,
          `"${(r.teamName || '').replace(/"/g, '""')}"`,
          `"${(r.leaderName || '').replace(/"/g, '""')}"`,
          r.evalCount,
          r.avgScore,
          r.maxSpread,
          r.hasDiscrepancy ? 'LECH_DIEM_CAO' : 'BINH_THUONG',
        ].join(',')
      ),
    ];
    try {
      const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'HackFlow_Official_Results_2026.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback in headless test env
    }
    setAlert('Đã tải xuống file biên bản kết quả: HackFlow_Official_Results_2026.csv');
    setTimeout(() => setAlert(null), 3500);
  };

  const handleTogglePublish = async () => {
    const nextPublished = !config.resultsPublished;
    setErrorAlert(null);
    try {
      await publishLeaderboard({ is_result_published: nextPublished });
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErrorAlert(apiMsg || 'Không thể cập nhật trạng thái công bố kết quả. Vui lòng thử lại.');
      setTimeout(() => setErrorAlert(null), 4500);
      return;
    }
    useMockStore.setState((state) => ({ config: { ...state.config, resultsPublished: nextPublished } }));
    if (!nextPublished) {
      setUnlockedTeamIds([]);
    }
    const synced = await loadLeaderboard();
    if (!synced) {
      setErrorAlert(
        'Đã cập nhật trạng thái công bố trên máy chủ nhưng chưa tải lại được bảng điểm mới nhất. Vui lòng bấm Thử lại.'
      );
      return;
    }
    setAlert(
      nextPublished
        ? 'Đã công bố bảng xếp hạng chính thức cho toàn bộ thí sinh!'
        : 'Đã chuyển bảng xếp hạng về chế độ bảo mật (Ẩn đối với thí sinh).'
    );
    setTimeout(() => setAlert(null), 3500);
  };

  const openUnlockModal = (row: ResultRow) => {
    const lockedJudges = row.judges.filter((j) => j.status !== 'draft');
    const candidateJudges = lockedJudges.length > 0 ? lockedJudges : row.judges;
    const firstJudge = candidateJudges[0];
    setErrorAlert(null);
    setUnlockTarget({
      teamId: row.teamId,
      teamName: row.teamName,
      submissionId: row.submissionId || row.teamId,
      judgeId: firstJudge?.judgeId,
      judgeName: firstJudge?.judgeName,
      judges: candidateJudges,
    });
    setUnlockReason('Rà soát chênh lệch điểm giữa các giám khảo');
    setUnlockModalOpen(true);
  };

  const handleConfirmUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockTarget || !unlockReason.trim()) return;
    setUnlocking(true);
    setErrorAlert(null);
    try {
      const targetSubId = unlockTarget.submissionId || unlockTarget.teamId;
      await apiClient.post(`/admin/evaluations/${encodeURIComponent(targetSubId)}/unlock`, {
        reason: unlockReason.trim(),
        judge_id: unlockTarget.judgeId || undefined,
      });
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErrorAlert(
        apiMsg || 'Không thể mở khóa phiếu chấm. Phiếu chấm chưa tồn tại hoặc kết quả đang được công bố.'
      );
      setTimeout(() => setErrorAlert(null), 4500);
      setUnlocking(false);
      return;
    }
    useMockStore.setState((state) => ({
      evaluations: state.evaluations.map((ev) =>
        (ev.teamId === unlockTarget.teamId || ev.teamId === unlockTarget.submissionId) &&
        (!unlockTarget.judgeId || ev.judgeId === unlockTarget.judgeId)
          ? { ...ev, isDraft: true, confirmedAt: undefined }
          : ev
      ),
    }));
    const threshold = Number(config.discrepancyThreshold ?? 15);
    setApiRows((prev) =>
      prev
        ? prev.map((r) => {
            if (r.teamId !== unlockTarget.teamId && r.submissionId !== unlockTarget.submissionId) {
              return r;
            }
            const nextJudges = r.judges.map((j) =>
              !unlockTarget.judgeId || j.judgeId === unlockTarget.judgeId
                ? { ...j, status: 'draft' as const }
                : j
            );
            const submittedJudges = nextJudges.filter((j) => j.status === 'submitted');
            const draftJudges = nextJudges.filter((j) => j.status === 'draft');
            const lockedCount = submittedJudges.length;
            const draftCount = draftJudges.length;
            const nextAvgScore =
              lockedCount > 0
                ? Math.round(
                    (submittedJudges.reduce((acc, j) => acc + j.score, 0) / lockedCount) * 10
                  ) / 10
                : 0;
            const nextDraftScore =
              draftCount > 0
                ? Math.round((draftJudges.reduce((acc, j) => acc + j.score, 0) / draftCount) * 10) /
                  10
                : 0;
            const submittedScores = submittedJudges.map((j) => j.score);
            const nextMaxSpread =
              lockedCount >= 2
                ? Math.round((Math.max(...submittedScores) - Math.min(...submittedScores)) * 100) /
                  100
                : 0;
            const nextHasDiscrepancy = lockedCount >= 2 && nextMaxSpread > threshold;
            return {
              ...r,
              evalCount: lockedCount,
              draftEvalCount: draftCount,
              hasLockedEvaluations: lockedCount > 0,
              hasDraftEvaluations: draftCount > 0,
              avgScore: nextAvgScore,
              draftScore: nextDraftScore,
              maxSpread: nextMaxSpread,
              hasDiscrepancy: nextHasDiscrepancy,
              judges: nextJudges,
            };
          })
        : prev
    );
    await syncFromBackend?.();
    setUnlockedTeamIds((prev) =>
      unlockTarget?.teamId && !prev.includes(unlockTarget.teamId)
        ? [...prev, unlockTarget.teamId]
        : prev
    );
    const synced = await loadLeaderboard();
    setUnlocking(false);
    setUnlockModalOpen(false);
    if (!synced) {
      setErrorAlert(
        `Đã mở khóa phiếu chấm của đội "${unlockTarget.teamName}" trên máy chủ, nhưng chưa tải lại được bảng điểm. Dữ liệu đang hiển thị là bản tạm tính.`
      );
      return;
    }
    setAlert(`Đã mở khóa phiếu chấm của đội "${unlockTarget.teamName}" về trạng thái Nháp (Draft) để Giám khảo chấm lại.`);
    setTimeout(() => setAlert(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide">
            Tổng Hợp Điểm và Công Bố Kết Quả
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tổng hợp dữ liệu chấm thi từ Hội đồng Giám khảo theo công thức tính điểm trọng số và điều khiển công bố bảng xếp hạng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleExportCsv} className="gap-2">
            <Download size={16} />
            <span>Xuất Báo Cáo CSV</span>
          </Button>

          <Button
            variant="primary"
            onClick={() => setPublishConfirmOpen(true)}
            className="gap-2 shadow-lg shadow-[#6366F1]/20"
          >
            {config.resultsPublished ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>
              {config.resultsPublished ? 'Tạm Khóa Kết Quả' : 'Công Bố Cho Thí Sinh'}
            </span>
          </Button>
        </div>
      </div>

      {alert && (
        <div className="p-3.5 rounded-[10px] bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{alert}</span>
        </div>
      )}

      {errorAlert && (
        <div className="p-3.5 rounded-[10px] bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle size={15} />
          <span>{errorAlert}</span>
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="p-3.5 rounded-[10px] bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>
              {loadError}
              {isStale && apiRows ? ' (Dữ liệu đang hiển thị có thể đã cũ)' : ''}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRefreshTick((t) => t + 1)}
            isLoading={isLoading}
            className="text-xs px-2.5 py-1"
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* Publication Status Card */}
      <div
        className={`p-5 rounded-[16px] border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          config.resultsPublished
            ? 'bg-emerald-500/10 border-emerald-500/40'
            : 'bg-amber-500/10 border-amber-500/40'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
              config.resultsPublished
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30'
            }`}
          >
            <Trophy size={20} />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-base">
              {config.resultsPublished
                ? 'Bảng Xếp Hạng Đang Được Công Bố Công Khai'
                : 'Bảng Xếp Hạng Đang Ở Chế Độ Bảo Mật (Ẩn Đối Với Thí Sinh)'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {config.resultsPublished
                ? 'Tất cả thí sinh có thể xem thứ hạng và điểm tổng kết trên màn hình Leaderboard.'
                : 'Chỉ Quản trị viên và Giám khảo mới có quyền xem trước bảng tổng hợp này.'}
            </p>
          </div>
        </div>

        <Badge variant={config.resultsPublished ? 'success' : 'warning'}>
          {config.resultsPublished ? 'Trạng thái: Public' : 'Trạng thái: Hidden'}
        </Badge>
      </div>

      {/* Aggregate Score Table */}
      <div className="rounded-[16px] border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold tracking-tight text-foreground text-lg">
          Bảng Điểm Tổng Hợp Có Trọng Số
        </h3>

        <div className="overflow-x-auto rounded-[12px] border border-border bg-muted/40 dark:bg-slate-900/60">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-card border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 w-14 text-center">Hạng</th>
                <th className="py-3.5 px-4">Đội Thi</th>
                <th className="py-3.5 px-4">Đội Trưởng</th>
                <th className="py-3.5 px-4 text-center">Số Lượt Chấm</th>
                <th className="py-3.5 px-4 text-right">Điểm TB Giám Khảo (Thang 100)</th>
                <th className="py-3.5 px-4 text-center">Kiểm Soát Độ Lệch</th>
                <th className="py-3.5 px-4 text-center">Xếp Loại</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {teamScoreRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
                    <Trophy className="mx-auto mb-2 opacity-30 text-muted-foreground" size={32} />
                    Chưa có kết quả hoặc đội thi nào được chấm điểm trong hệ thống.
                  </td>
                </tr>
              ) : (
                teamScoreRows.map((row, idx) => (
                  <tr key={row.teamId} className="hover:bg-accent transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold">
                      {idx === 0 ? (
                        <span className="text-amber-700 dark:text-amber-400">🥇 1</span>
                      ) : idx === 1 ? (
                        <span className="text-muted-foreground">🥈 2</span>
                      ) : idx === 2 ? (
                        <span className="text-amber-600">🥉 3</span>
                      ) : (
                        <span className="text-muted-foreground font-mono">#{idx + 1}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {row.teamName}
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground">
                      {row.leaderName}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {row.evalCount > 0 ? (
                          <Badge variant="success">{row.evalCount} lượt (Đã khóa)</Badge>
                        ) : (
                          <Badge variant="neutral">0 lượt khóa</Badge>
                        )}
                        {row.hasDraftEvaluations && (
                          <Badge variant="cyan">{row.draftEvalCount} phiếu nháp</Badge>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono">
                      {row.evalCount > 0 ? (
                        <div>
                          <span className="font-semibold tracking-tight text-lg text-emerald-700 dark:text-emerald-400">
                            {row.avgScore} / 100
                          </span>
                          {row.hasDraftEvaluations && (
                            <div className="text-[11px] text-cyan-600 dark:text-cyan-400">
                              Nháp: {row.draftScore}đ ({row.draftEvalCount} phiếu)
                            </div>
                          )}
                        </div>
                      ) : row.hasDraftEvaluations ? (
                        <div>
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            Chưa khóa điểm
                          </span>
                          <div className="text-[11px] text-cyan-600 dark:text-cyan-400">
                            Điểm nháp: {row.draftScore} / 100
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Chưa có điểm</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {row.hasDiscrepancy ? (
                        <Badge variant="danger" className="gap-1">
                          <AlertTriangle size={12} />
                          <span>Lệch điểm cao ({row.maxSpread}đ)</span>
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Ổn định ({row.maxSpread}đ)</Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {row.evalCount > 0 ? (
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            row.avgScore >= 85
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                              : row.avgScore >= 70
                                ? 'bg-[#6366F1]/15 text-primary border border-[#6366F1]/30'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {row.avgScore >= 85 ? 'Xuất Sắc' : row.avgScore >= 70 ? 'Khá Giỏi' : 'Đạt'}
                        </span>
                      ) : (
                        <Badge variant="neutral">Chưa xếp loại</Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {config.resultsPublished ? (
                        <Badge variant="neutral">Đang công bố (Khóa)</Badge>
                      ) : row.hasLockedEvaluations && !unlockedTeamIds.includes(row.teamId) ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openUnlockModal(row)}
                          className="gap-1.5 text-xs"
                        >
                          <Unlock size={13} />
                          <span>Mở khóa phiếu</span>
                        </Button>
                      ) : row.hasDraftEvaluations || unlockedTeamIds.includes(row.teamId) ? (
                        <Badge variant="cyan">Đang mở khóa (Nháp)</Badge>
                      ) : (
                        <Badge variant="neutral">Chưa có phiếu khóa</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Mở Khóa Phiếu Chấm (Unlock Evaluation) */}
      <Modal
        isOpen={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        title={`Mở khóa phiếu chấm — ${unlockTarget?.teamName || ''}`}
      >
        <form onSubmit={handleConfirmUnlock} className="space-y-4">
          {errorAlert && (
            <div
              role="alert"
              className="p-3 rounded-[10px] bg-rose-500/10 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-400"
            >
              {errorAlert}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Thao tác này sẽ chuyển trạng thái phiếu chấm của Giám khảo từ <strong>Đã khóa (Submitted)</strong> về{' '}
            <strong>Bản nháp (Draft)</strong> để Giám khảo điều chỉnh lại điểm số và nhận xét.
          </p>

          {unlockTarget?.judges && unlockTarget.judges.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Chọn Giám khảo cần mở khóa phiếu chấm
              </label>
              <select
                value={unlockTarget.judgeId || ''}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const found = unlockTarget.judges?.find((j) => j.judgeId === selectedId);
                  setUnlockTarget((prev) =>
                    prev
                      ? {
                          ...prev,
                          judgeId: selectedId || undefined,
                          judgeName: found?.judgeName,
                        }
                      : null
                  );
                }}
                className="px-3 py-2 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-sm text-foreground focus:outline-none focus:border-[#6366F1]"
              >
                {unlockTarget.judges.map((j) => (
                  <option key={j.judgeId} value={j.judgeId}>
                    {j.judgeName} — Điểm đã chấm: {j.score} / 100
                  </option>
                ))}
                {unlockTarget.judges.length > 1 && (
                  <option value="">Tất cả giám khảo đã chấm đội này</option>
                )}
              </select>
            </div>
          )}

          <Input
            label="Lý do mở khóa phiếu chấm (Audit Log) *"
            value={unlockReason}
            onChange={(e) => setUnlockReason(e.target.value)}
            required
            placeholder="Nhập lý do yêu cầu chấm lại..."
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setUnlockModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" isLoading={unlocking} className="gap-1.5">
              <Unlock size={14} />
              <span>Xác nhận Mở khóa</span>
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={publishConfirmOpen}
        onOpenChange={setPublishConfirmOpen}
        title={
          config.resultsPublished
            ? 'Tạm khóa & ẩn Bảng xếp hạng đối với thí sinh?'
            : 'Công bố chính thức Bảng xếp hạng cho toàn bộ thí sinh?'
        }
        description={
          config.resultsPublished
            ? 'Sau khi tạm khóa, Bảng xếp hạng sẽ chuyển về chế độ bảo mật nội bộ. Thí sinh sẽ không thể xem điểm số và thứ hạng cho đến khi được công bố lại.'
            : [
                'Sau khi công bố, tất cả thí sinh và đội thi hợp lệ sẽ nhìn thấy điểm tổng kết chính thức và thứ hạng chung cuộc trên màn hình Leaderboard.',
                lockedTeamsCount === 0
                  ? '⚠️ CẢNH BÁO: Hiện chưa có đội thi hợp lệ nào có phiếu điểm chính thức (Đã khóa). Máy chủ sẽ từ chối công bố cho đến khi có ít nhất 1 đội được khóa điểm.'
                  : '',
                draftTeamsCount > 0
                  ? `⚠️ Lưu ý: Hiện còn ${draftTeamsCount} đội thi đang có phiếu chấm ở trạng thái Nháp (chưa khóa). Điểm nháp sẽ không được tính vào kết quả công bố.`
                  : '',
                discrepancyTeamsCount > 0
                  ? `⚠️ Lưu ý: Phát hiện ${discrepancyTeamsCount} đội thi đang có cảnh báo lệch điểm cao giữa các giám khảo.`
                  : '',
              ]
                .filter(Boolean)
                .join(' ')
        }
        confirmLabel={config.resultsPublished ? 'Xác nhận tạm khóa' : 'Xác nhận công bố'}
        variant={config.resultsPublished ? 'warning' : 'primary'}
        onConfirm={async () => {
          await handleTogglePublish();
          setPublishConfirmOpen(false);
        }}
      />
    </div>
  );
};

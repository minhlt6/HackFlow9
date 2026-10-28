import React, { useState, useEffect } from 'react';
import { useMockStore } from '../store/useMockStore';
import { useAuthStore } from '../store/useAuthStore';
import { evaluationService, type LeaderboardEntry } from '../services/evaluationService';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/patterns/ConfirmDialog';
import {
  Trophy,
  Award,
  Medal,
  Lock,
  Eye,
  AlertTriangle,
  Globe,
  Radio,
  ShieldAlert,
} from 'lucide-react';

export const Scoreboard: React.FC = () => {
  const { config } =
    useMockStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  useEffect(() => {
    let active = true;
    evaluationService.getLeaderboard().then((response) => {
      if (!active) return;
      const data = response.data;
      setError(null);
      setRows(data.leaderboard || []);
      useMockStore.setState((state) => ({ config: { ...state.config, resultsPublished: Boolean(data.is_result_published) } }));
    }).catch((err: unknown) => {
      if (!active) return;
      setRows([]);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403 || !isAdmin) {
        setError(null);
        if (status === 403) {
          useMockStore.setState((state) => ({ config: { ...state.config, resultsPublished: false } }));
        }
        return;
      }
      setError(err instanceof Error ? err.message : 'Error');
    });
    return () => { active = false; };
  }, [config.resultsPublished, isAdmin]);
  const teamsWithScores = rows.map((row) => ({
    id: row.team_id, name: row.team_name, subTopicTitle: row.topic_title,
    avgScore: row.final_score, evalCount: row.eval_count, hasDiscrepancy: Boolean(row.has_discrepancy),
  }));

  // Handle Admin publishing / unpublishing
  const handlePublishToggle = async () => {
    const nextStatus = !config.resultsPublished;
    try {
      await evaluationService.publishLeaderboard({ is_result_published: nextStatus });
    } catch {
      window.alert('Không thể công bố kết quả. Vui lòng thử lại.');
      return;
    }
    useMockStore.setState((state) => ({ config: { ...state.config, resultsPublished: nextStatus } }));
  };

  return (
    <div className="space-y-6 ">
      {error && <div role="alert" className="text-red-500">{error}</div>}
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1
              className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide inline-block"
            >
              Bảng Xếp Hạng và Kết Quả Chung Cuộc
            </h1>
            {config.resultsPublished ? (
              <Badge variant="success" className="gap-1">
                <Radio size={12} className="animate-pulse text-emerald-700 dark:text-emerald-400" />
                <span>CHÍNH THỨC</span>
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1">
                <Lock size={12} />
                <span>{isAdmin ? 'BẢN NHÁP NỘI BỘ' : 'BẢO MẬT'}</span>
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Bảng tổng sắp điểm số của tất cả các đội thi dựa trên thang tiêu chí Rubric đánh giá từ Ban Giám Khảo.
          </p>
        </div>

        {/* Admin Publish Control (Only visible to Admin) */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant={config.resultsPublished ? 'danger' : 'primary'}
              size="sm"
              onClick={() => setPublishConfirmOpen(true)}
              className="gap-2 shadow-md"
            >
              <Globe size={14} />
              <span>
                {config.resultsPublished ? 'Hủy Công Bố Bảng Điểm' : 'Công Bố Kết Quả Chính Thức'}
              </span>
            </Button>
          </div>
        )}
      </div>

      {/* Admin Internal Preview Banner (When unpublished, Admin can review draft leaderboard) */}
      {isAdmin && !config.resultsPublished && (
        <div className="p-4 rounded-xl bg-indigo-500/15 border border-indigo-500/40 text-primary text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <Eye size={20} className="text-primary shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-sm">
                  CHẾ ĐỘ XEM TRƯỚC NỘI BỘ (DRAFT) — DÀNH CHO ADMIN
                </span>
                <Badge variant="warning" size="sm">
                  CHƯA CÔNG BỐ CHO THÍ SINH
                </Badge>
              </div>
              <p className="text-primary/80 text-[11px] mt-0.5">
                Bảng điểm đang được bảo mật với thí sinh. Admin hãy rà soát điểm số và các cảnh báo lệch điểm bên dưới trước khi bấm &quot;Công Bố Kết Quả Chính Thức&quot;.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Discrepancy Notice Banner (Shows whenever Admin is reviewing and discrepancy > 15 exists) */}
      {isAdmin && teamsWithScores.some((t) => t.hasDiscrepancy) && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={20} className="text-amber-700 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-foreground text-sm">Cảnh báo chênh lệch điểm số Ban Giám khảo</p>
              <p className="text-amber-700 dark:text-amber-400 text-[11px] mt-0.5">
                Phát hiện đội thi có độ lệch điểm chấm giữa các giám khảo vượt quá 15 điểm (max - min &gt; 15đ). Đề nghị Trưởng ban giám khảo hội ý xác minh trước khi công bố hoặc trao giải.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Mode: Secret Judging in Progress for Non-Admin candidates */}
      {!config.resultsPublished && !isAdmin ? (
        <div className="rounded-[16px] border border-amber-500/30 bg-card p-12 text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400">
            <Lock size={40} />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="font-semibold tracking-tight text-foreground text-2xl text-foreground">
              Bảng xếp hạng đang được tổng hợp
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Hội đồng Giám khảo đang trong giai đoạn chấm thi độc lập theo Chế độ chấm ẩn danh (Blind Judging). Điểm số đang trong giai đoạn bảo mật và đối soát. Kết quả chung cuộc sẽ được công bố chính thức tại Lễ bế mạc cuộc thi.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-muted/40 dark:bg-slate-900/60 border border-border px-4 py-2 text-xs text-muted-foreground font-mono">
            <span>Dự kiến công bố:</span>
            <span className="text-primary font-bold">20:00 - 15/11/2026</span>
          </div>
        </div>
      ) : (
        /* Published Leaderboard OR Admin Internal Preview */
        <div className="space-y-6">
          {/* Top 3 Podium Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {teamsWithScores.slice(0, 3).map((team, idx) => {
              const medals = [
                {
                  label: 'QUÁN QUÂN',
                  color: 'border-amber-400 bg-amber-500/10 text-amber-700 dark:text-amber-400 shadow-lg shadow-amber-500/10',
                  icon: Trophy,
                  rankBadge: 'bg-amber-500 text-slate-950 font-bold',
                },
                {
                  label: 'Á QUÂN 1',
                  color: 'border-slate-300 bg-slate-400/10 text-foreground shadow-md',
                  icon: Award,
                  rankBadge: 'bg-slate-300 text-slate-950 font-bold',
                },
                {
                  label: 'Á QUÂN 2',
                  color: 'border-amber-700 bg-amber-700/10 text-amber-500 shadow-md',
                  icon: Medal,
                  rankBadge: 'bg-amber-700 text-foreground font-bold',
                },
              ];
              const medal = medals[idx];
              const IconComponent = medal.icon;

              return (
                <div
                  key={team.id}
                  className={`p-5 rounded-2xl border ${medal.color} flex flex-col justify-between relative overflow-hidden`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-muted/60 border border-current">
                      {medal.label}
                    </span>
                    <IconComponent size={28} />
                  </div>

                  <div className="my-4 space-y-1">
                    <h3 className="font-semibold tracking-tight text-foreground text-xl text-foreground tracking-wide">
                      {team.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{team.subTopicTitle}</p>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Điểm trung bình:</span>
                    <span className="font-semibold tracking-tight text-foreground text-2xl font-bold text-foreground">
                      {team.avgScore} <span className="text-xs text-muted-foreground">/ 100</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Leaderboard Table */}
          <div className="bg-[#111827] border border-border rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-border bg-muted/40 dark:bg-slate-900/60 flex items-center justify-between">
              <div>
                <h3 className="font-semibold tracking-tight text-foreground text-base sm:text-lg text-foreground">
                  Chi Tiết Bảng Điểm Xếp Hạng Toàn Đoàn
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Điểm số được tính trung bình cộng từ tất cả các phiếu chấm hợp lệ của Hội đồng Giám khảo.
                </p>
              </div>
              <span className="text-xs text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-lg">
                Tổng số đội: <strong className="text-foreground">{teamsWithScores.length}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 dark:bg-slate-900/60 text-muted-foreground uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Hạng</th>
                    <th className="py-3 px-4">Đội Thi</th>
                    <th className="py-3 px-4">Đề Tài Đăng Ký</th>
                    <th className="py-3 px-4 text-center">Số Phiếu Chấm</th>
                    <th className="py-3 px-4 text-right">Điểm Trung Bình</th>
                    {isAdmin && <th className="py-3 px-4 text-center">Kiểm Tra Đối Soát</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {teamsWithScores.map((team, idx) => {
                    const rank = idx + 1;
                    return (
                      <tr
                        key={team.id}
                        className={`hover:bg-accent transition-all ${
                          rank <= 3 ? 'bg-card font-medium' : ''
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-4 text-center">
                          {rank === 1 ? (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-bold font-semibold tracking-tight text-foreground">
                              1
                            </span>
                          ) : rank === 2 ? (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-300 text-slate-950 font-bold font-semibold tracking-tight text-foreground">
                              2
                            </span>
                          ) : rank === 3 ? (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-700 text-foreground font-bold font-semibold tracking-tight text-foreground">
                              3
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-mono font-semibold">#{rank}</span>
                          )}
                        </td>

                        {/* Team Name */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground text-sm">{team.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            Mã: <code className="text-primary">{team.id}</code>
                          </div>
                        </td>

                        {/* Topic */}
                        <td className="py-3.5 px-4 text-muted-foreground">
                          <span className="line-clamp-1">{team.subTopicTitle}</span>
                        </td>

                        {/* Eval Count */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground font-mono text-[11px]">
                            {team.evalCount} giám khảo
                          </span>
                        </td>

                        {/* Average Score */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-semibold tracking-tight text-foreground text-lg text-emerald-700 dark:text-emerald-400">
                            {team.avgScore}
                          </span>
                          <span className="text-muted-foreground text-[10px] ml-1">/ 100</span>
                        </td>

                        {/* Admin Discrepancy Column */}
                        {isAdmin && (
                          <td className="py-3.5 px-4 text-center">
                            {team.hasDiscrepancy ? (
                              <Badge variant="warning" className="gap-1 animate-pulse">
                                <ShieldAlert size={12} />
                                <span>⚠️ Lệch điểm cao (&gt; 15đ)</span>
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Đồng thuận</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={publishConfirmOpen}
        onOpenChange={setPublishConfirmOpen}
        title={
          config.resultsPublished
            ? 'Hủy công bố & ẩn Bảng xếp hạng đối với thí sinh?'
            : 'Công bố chính thức Bảng xếp hạng chung cuộc?'
        }
        description={
          config.resultsPublished
            ? 'Bảng xếp hạng sẽ chuyển về chế độ Bản nháp nội bộ (Bảo mật) và ẩn khỏi màn hình của toàn bộ thí sinh.'
            : 'Toàn bộ thí sinh sẽ có thể xem điểm số tổng kết và thứ hạng chính thức trên màn hình Bảng xếp hạng.'
        }
        confirmLabel={config.resultsPublished ? 'Xác nhận ẩn bảng điểm' : 'Xác nhận công bố'}
        variant={config.resultsPublished ? 'warning' : 'primary'}
        onConfirm={async () => {
          await handlePublishToggle();
          setPublishConfirmOpen(false);
        }}
      />
    </div>
  );
};

export default Scoreboard;

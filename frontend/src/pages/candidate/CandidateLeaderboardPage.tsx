import React from 'react';
import { useMockStore, normalizeScoreTo100 } from '../../store/useMockStore';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import {
  Trophy,
  Award,
  Medal,
  Lock,
  Eye,
} from 'lucide-react';

export const CandidateLeaderboardPage: React.FC = () => {
  const { config, teams, majorTopics, evaluations, toggleResultsPublished, rubricCriteria } = useMockStore();

  // Compute team scores from evaluations
  const teamsWithScores = teams.map((team) => {
    const teamEvals = evaluations.filter((e) => e.teamId === team.id && !e.isDraft);
    const avgScore =
      teamEvals.length > 0
        ? teamEvals.reduce(
            (acc, curr) => acc + normalizeScoreTo100(curr.totalScore, curr.scores, rubricCriteria),
            0
          ) / teamEvals.length
        : 0;

    let subTopicTitle = 'Chưa chọn';
    for (const mt of majorTopics) {
      const sub = mt.subTopics.find((s) => s.id === team.subTopicId);
      if (sub) {
        subTopicTitle = sub.title;
        break;
      }
    }

    return {
      ...team,
      subTopicTitle,
      avgScore: Math.round(avgScore * 10) / 10,
      evalCount: teamEvals.length,
    };
  });

  // Sort descending by score
  teamsWithScores.sort((a, b) => b.avgScore - a.avgScore);

  return (
    <div className="space-y-6 ">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide"
          >
            Bảng Xếp Hạng & Kết Quả Chung Cuộc
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Bảng tổng sắp điểm số của tất cả các đội thi dựa trên thang tiêu chí Rubric đánh giá từ Ban Giám Khảo.
          </p>
        </div>

        {/* Demo Toggle Helper */}
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleResultsPublished}
          className="gap-2 border-[#6366F1]/50 text-primary"
        >
          <Eye size={14} />
          <span>
            {config.resultsPublished ? 'Demo: Ẩn Kết Quả' : 'Demo: Mở Công Bố Kết Quả'}
          </span>
        </Button>
      </div>

      {!config.resultsPublished ? (
        /* Hidden Mode: Secret Judging in Progress */
        <div className="rounded-[16px] border border-amber-500/30 bg-card p-12 text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400">
            <Lock size={40} />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="font-semibold tracking-tight text-foreground text-2xl text-foreground">
              Kết Quả Đang Được Bảo Mật
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Hội đồng Giám khảo đang trong giai đoạn chấm thi độc lập theo Chế độ chấm ẩn danh. Điểm số sẽ chính thức được công bố tại Lễ bế mạc cuộc thi.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-muted/40 dark:bg-slate-900/60 border border-border px-4 py-2 text-xs text-muted-foreground font-mono">
            <span>Dự kiến công bố:</span>
            <span className="text-primary font-bold">20:00 - 15/11/2026</span>
          </div>
        </div>
      ) : (
        /* Published Leaderboard */
        <div className="space-y-6">
          {/* Top 3 Podium Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {teamsWithScores.slice(0, 3).map((team, idx) => {
              const medals = [
                {
                  label: 'QUÁN QUÂN',
                  color: 'border-amber-400 bg-amber-500/10 text-amber-700 dark:text-amber-400',
                  icon: Trophy,
                },
                {
                  label: 'Á QUÂN 1',
                  color: 'border-slate-300 bg-slate-400/10 text-foreground',
                  icon: Medal,
                },
                {
                  label: 'Á QUÂN 2',
                  color: 'border-amber-600 bg-amber-700/10 text-amber-500',
                  icon: Award,
                },
              ];

              const currentMedal = medals[idx];
              const Icon = currentMedal.icon;

              return (
                <div
                  key={team.id}
                  className={`rounded-[16px] border p-6 text-center space-y-3 relative overflow-hidden bg-card ${currentMedal.color}`}
                >
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                    <Icon size={16} />
                    <span>{currentMedal.label}</span>
                  </div>

                  <div>
                    <h3 className="font-semibold tracking-tight text-foreground text-2xl text-foreground">{team.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {team.subTopicTitle}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-center gap-2">
                    <span className="text-xs text-muted-foreground">Điểm tổng kết:</span>
                    <span className="font-semibold tracking-tight text-foreground text-2xl text-foreground font-mono">
                      {team.avgScore} / 100
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full Standings Table */}
          <div className="rounded-[16px] border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold tracking-tight text-foreground text-xl text-foreground">
              Bảng Tổng Sắp Chi Tiết ({teamsWithScores.length} Đội)
            </h3>

            <div className="overflow-x-auto rounded-[12px] border border-border bg-muted/40 dark:bg-slate-900/60">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-card border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 w-16 text-center">Hạng</th>
                    <th className="py-3.5 px-4">Tên Đội Thi</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Đề Tài Đăng Ký</th>
                    <th className="py-3.5 px-4 text-center">Số Lượt Chấm</th>
                    <th className="py-3.5 px-4 text-right">Tổng Điểm (Thang 100)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {teamsWithScores.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-accent transition-colors">
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

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-foreground block">{t.name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {t.members.length} thành viên
                        </span>
                      </td>

                      <td className="py-3.5 px-4 hidden md:table-cell text-muted-foreground max-w-xs truncate">
                        {t.subTopicTitle}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={t.evalCount > 0 ? 'success' : 'neutral'}>
                          {t.evalCount} Giám khảo
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-semibold tracking-tight text-foreground text-lg text-emerald-700 dark:text-emerald-400 font-mono">
                          {t.avgScore} / 100
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useMemo } from 'react';
import { useMockStore, normalizeScoreTo100 } from '../store/useMockStore';
import { useAuthStore } from '../store/useAuthStore';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import {
  Trophy,
  Award,
  Medal,
  Lock,
  Eye,
  AlertTriangle,
  Globe,
  Radio,
} from 'lucide-react';

export const Scoreboard: React.FC = () => {
  const { config, teams, majorTopics, evaluations, toggleResultsPublished, rubricCriteria } =
    useMockStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  // Compute team scores and check score discrepancy (> 15 pts between judges)
  const teamsWithScores = useMemo(() => {
    return teams.map((team) => {
      const teamEvals = evaluations.filter((e) => e.teamId === team.id && !e.isDraft);

      const normalizedScores = teamEvals.map((e) =>
        normalizeScoreTo100(e.totalScore, e.scores, rubricCriteria),
      );

      const avgScore =
        normalizedScores.length > 0
          ? normalizedScores.reduce((acc, curr) => acc + curr, 0) / normalizedScores.length
          : 0;

      // Check discrepancy: if multiple judges and (max - min) > 15
      let hasDiscrepancy = false;
      if (normalizedScores.length >= 2) {
        const maxScore = Math.max(...normalizedScores);
        const minScore = Math.min(...normalizedScores);
        if (maxScore - minScore > 15) {
          hasDiscrepancy = true;
        }
      }

      // Mock discrepancy for demonstration on certain team if single eval
      if (team.id === 'team-02' || team.name?.toLowerCase().includes('titans')) {
        hasDiscrepancy = true;
      }

      let subTopicTitle = 'Chưa chọn';
      for (const mt of majorTopics) {
        const sub = mt.subTopics.find((s) => s.id === team.subTopicId);
        if (sub) {
          subTopicTitle = sub.title.replace(/\s*&\s*/g, ' và ');
          break;
        }
      }

      return {
        ...team,
        subTopicTitle,
        avgScore: Math.round(avgScore * 10) / 10,
        evalCount: teamEvals.length,
        hasDiscrepancy,
      };
    }).sort((a, b) => b.avgScore - a.avgScore);
  }, [teams, evaluations, rubricCriteria, majorTopics]);

  return (
    <div className="space-y-6 font-['Roboto']">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1
              className="font-['Righteous'] text-2xl sm:text-3xl tracking-wide inline-block"
              style={{
                background: 'linear-gradient(90deg, #6366F1 0%, #818CF8 50%, #C7D2FE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Bảng Xếp Hạng và Kết Quả Chung Cuộc
            </h1>
            {config.resultsPublished ? (
              <Badge variant="success" className="gap-1">
                <Radio size={12} className="animate-pulse text-emerald-400" />
                <span>CHÍNH THỨC</span>
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1">
                <Lock size={12} />
                <span>BẢO MẬT</span>
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Bảng tổng sắp điểm số của tất cả các đội thi dựa trên thang tiêu chí Rubric đánh giá từ Ban Giám Khảo.
          </p>
        </div>

        {/* Admin / Demo Control Actions */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant={config.resultsPublished ? 'danger' : 'primary'}
              size="sm"
              onClick={toggleResultsPublished}
              className="gap-2 shadow-md"
            >
              <Globe size={14} />
              <span>
                {config.resultsPublished ? 'Hủy Công Bố Bảng Điểm' : 'Công Bố Kết Quả Chính Thức'}
              </span>
            </Button>
          )}

          {!isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleResultsPublished}
              className="gap-2 border-[#6366F1]/50 text-[#818CF8]"
            >
              <Eye size={14} />
              <span>
                {config.resultsPublished ? 'Demo: Ẩn Kết Quả' : 'Demo: Mở Công Bố Kết Quả'}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Admin Discrepancy Notice Banner */}
      {isAdmin && config.resultsPublished && teamsWithScores.some((t) => t.hasDiscrepancy) && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={20} className="text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-white text-sm">Cảnh báo chênh lệch điểm số Ban Giám khảo</p>
              <p className="text-amber-200/90 text-[11px] mt-0.5">
                Phát hiện đội thi có độ lệch điểm chấm giữa các giám khảo vượt quá 15 điểm. Đề nghị Trưởng ban giám khảo hội ý xác minh trước khi trao giải.
              </p>
            </div>
          </div>
        </div>
      )}

      {!config.resultsPublished ? (
        /* Hidden Mode: Secret Judging in Progress */
        <div className="rounded-[16px] border border-amber-500/30 bg-[#1E293B] p-12 text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <Lock size={40} />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="font-['Righteous'] text-2xl text-white">
              Bảng xếp hạng đang được tổng hợp
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Hội đồng Giám khảo đang trong giai đoạn chấm thi độc lập theo Chế độ chấm ẩn danh (Blind Judging). Điểm số sẽ chính thức được công bố tại Lễ bế mạc cuộc thi.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-[#0F172A] border border-[#334155] px-4 py-2 text-xs text-slate-300 font-mono">
            <span>Dự kiến công bố:</span>
            <span className="text-[#818CF8] font-bold">20:00 - 15/11/2026</span>
          </div>

          {isAdmin && (
            <div className="pt-4 border-t border-[#334155]/60 max-w-sm mx-auto">
              <p className="text-xs text-slate-400 mb-2">Bạn đang đăng nhập với tư cách Ban Quản Trị:</p>
              <Button
                variant="primary"
                size="md"
                onClick={toggleResultsPublished}
                className="w-full gap-2 shadow-lg shadow-[#6366F1]/30"
              >
                <Globe size={16} />
                <span>Công Bố Kết Quả Chính Thức Ngay</span>
              </Button>
            </div>
          )}
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
                  color: 'border-amber-400 bg-amber-500/10 text-amber-300 shadow-lg shadow-amber-500/10',
                  icon: Trophy,
                  rankBadge: 'bg-amber-500 text-slate-950 font-bold',
                },
                {
                  label: 'Á QUÂN 1',
                  color: 'border-slate-300 bg-slate-400/10 text-slate-200',
                  icon: Medal,
                  rankBadge: 'bg-slate-300 text-slate-950 font-bold',
                },
                {
                  label: 'Á QUÂN 2',
                  color: 'border-amber-600 bg-amber-700/10 text-amber-500',
                  icon: Award,
                  rankBadge: 'bg-amber-600 text-white font-bold',
                },
              ];

              const currentMedal = medals[idx];
              const Icon = currentMedal.icon;

              return (
                <div
                  key={team.id}
                  className={`rounded-[16px] border p-6 text-center space-y-3 relative overflow-hidden bg-[#1E293B] ${currentMedal.color}`}
                >
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                    <Icon size={16} />
                    <span>{currentMedal.label}</span>
                  </div>

                  <div>
                    <h3 className="font-['Righteous'] text-2xl text-white">
                      {(team.name || '').replace(/\s*&\s*/g, ' và ')}
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                      {team.subTopicTitle}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#334155]/60 flex items-center justify-center gap-2">
                    <span className="text-xs text-slate-400">Điểm tổng kết:</span>
                    <span className="font-['Righteous'] text-2xl text-white font-mono">
                      {team.avgScore} / 100
                    </span>
                  </div>

                  {isAdmin && team.hasDiscrepancy && (
                    <div className="pt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                        <AlertTriangle size={10} />
                        <span>⚠️ Lệch điểm cao (&gt; 15đ)</span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Full Standings Table */}
          <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4">
            <h3 className="font-['Righteous'] text-xl text-white">
              Bảng Tổng Sắp Chi Tiết ({teamsWithScores.length} Đội)
            </h3>

            <div className="overflow-x-auto rounded-[12px] border border-[#334155] bg-[#0F172A]">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#1E293B]/70 border-b border-[#334155] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 w-16 text-center">Hạng</th>
                    <th className="py-3.5 px-4">Tên Đội Thi</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Đề Tài Đăng Ký</th>
                    <th className="py-3.5 px-4 text-center">Số Lượt Chấm</th>
                    {isAdmin && <th className="py-3.5 px-4 text-center">Kiểm Tra Lệch Điểm</th>}
                    <th className="py-3.5 px-4 text-right">Tổng Điểm (Thang 100)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/60 text-slate-200">
                  {teamsWithScores.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-[#1E293B]/40 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold">
                        {idx === 0 ? (
                          <span className="text-amber-400">🥇 1</span>
                        ) : idx === 1 ? (
                          <span className="text-slate-300">🥈 2</span>
                        ) : idx === 2 ? (
                          <span className="text-amber-600">🥉 3</span>
                        ) : (
                          <span className="text-slate-500 font-mono">#{idx + 1}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-white block">
                          {(t.name || '').replace(/\s*&\s*/g, ' và ')}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {t.members.length} thành viên
                        </span>
                      </td>

                      <td className="py-3.5 px-4 hidden md:table-cell text-slate-300 max-w-xs truncate">
                        {t.subTopicTitle}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={t.evalCount > 0 ? 'success' : 'neutral'}>
                          {t.evalCount} Giám khảo
                        </Badge>
                      </td>

                      {isAdmin && (
                        <td className="py-3.5 px-4 text-center">
                          {t.hasDiscrepancy ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                              <AlertTriangle size={10} />
                              <span>⚠️ Lệch điểm cao (&gt; 15đ)</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono">Bình thường</span>
                          )}
                        </td>
                      )}

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-['Righteous'] text-lg text-emerald-400 font-mono">
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

import React from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import {
  Trophy,
  Award,
  Medal,
  Lock,
  Eye,
  Sparkles,
  Users,
  CheckCircle,
} from 'lucide-react';

export const CandidateLeaderboardPage: React.FC = () => {
  const { config, teams, majorTopics, evaluations, toggleResultsPublished } = useMockStore();

  // Compute team scores from evaluations
  const teamsWithScores = teams.map((team) => {
    const teamEvals = evaluations.filter((e) => e.teamId === team.id && !e.isDraft);
    const avgScore =
      teamEvals.length > 0
        ? teamEvals.reduce((acc, curr) => acc + curr.totalScore, 0) / teamEvals.length
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
    <div className="space-y-6 font-['Roboto']">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-['Righteous'] text-2xl sm:text-3xl tracking-wide"
            style={{
              background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Bảng Xếp Hạng & Kết Quả Chung Cuộc
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Bảng tổng sắp điểm số của tất cả các đội thi dựa trên thang tiêu chí Rubric đánh giá từ Ban Giám Khảo.
          </p>
        </div>

        {/* Demo Toggle Helper */}
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
      </div>

      {!config.resultsPublished ? (
        /* Hidden Mode: Secret Judging in Progress */
        <div className="rounded-[16px] border border-amber-500/30 bg-[#1E293B] p-12 text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <Lock size={40} />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="font-['Righteous'] text-2xl text-white">
              Kết Quả Đang Được Bảo Mật
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Hội đồng Giám khảo đang trong giai đoạn chấm thi độc lập theo Chế độ chấm ẩn danh. Điểm số sẽ chính thức được công bố tại Lễ bế mạc cuộc thi.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-[#0F172A] border border-[#334155] px-4 py-2 text-xs text-slate-300 font-mono">
            <span>Dự kiến công bố:</span>
            <span className="text-[#818CF8] font-bold">20:00 - 15/11/2026</span>
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
                  color: 'border-amber-400 bg-amber-500/10 text-amber-300',
                  icon: Trophy,
                },
                {
                  label: 'Á QUÂN 1',
                  color: 'border-slate-300 bg-slate-400/10 text-slate-200',
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
                  className={`rounded-[16px] border p-6 text-center space-y-3 relative overflow-hidden bg-[#1E293B] ${currentMedal.color}`}
                >
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                    <Icon size={16} />
                    <span>{currentMedal.label}</span>
                  </div>

                  <div>
                    <h3 className="font-['Righteous'] text-2xl text-white">{team.name}</h3>
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
                    <th className="py-3.5 px-4 text-right">Tổng Điểm</th>
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
                        <span className="font-bold text-white block">{t.name}</span>
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

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-['Righteous'] text-lg text-emerald-400 font-mono">
                          {t.avgScore}
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

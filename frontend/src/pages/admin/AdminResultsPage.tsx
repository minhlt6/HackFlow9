import React, { useState } from 'react';
import { useMockStore, normalizeScoreTo100 } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import {
  Download,
  Eye,
  EyeOff,
  Trophy,
  CheckCircle2,
} from 'lucide-react';

export const AdminResultsPage: React.FC = () => {
  const { teams, evaluations, config, toggleResultsPublished, rubricCriteria } = useMockStore();

  const [alert, setAlert] = useState<string | null>(null);

  const teamScoreRows = teams.map((team) => {
    const teamEvals = evaluations.filter((e) => e.teamId === team.id && !e.isDraft);
    const avgScore =
      teamEvals.length > 0
        ? teamEvals.reduce(
            (sum, e) => sum + normalizeScoreTo100(e.totalScore, e.scores, rubricCriteria),
            0
          ) / teamEvals.length
        : 0;

    return {
      team,
      evalCount: teamEvals.length,
      avgScore: Math.round(avgScore * 10) / 10,
      evals: teamEvals,
    };
  });

  // Sort descending
  teamScoreRows.sort((a, b) => b.avgScore - a.avgScore);

  const handleExportCsv = () => {
    setAlert('Đã tải xuống file biên bản kết quả: HackFlow_Official_Results_2026.csv');
    setTimeout(() => setAlert(null), 3500);
  };

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
            Tổng Hợp Điểm & Công Bố Kết Quả
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
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
            onClick={toggleResultsPublished}
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
        <div className="p-3.5 rounded-[10px] bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{alert}</span>
        </div>
      )}

      {/* Publication Status Card */}
      <div
        className={`p-5 rounded-[16px] border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          config.resultsPublished
            ? 'bg-emerald-950/20 border-emerald-500/40'
            : 'bg-amber-950/20 border-amber-500/40'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
              config.resultsPublished
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            <Trophy size={20} />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">
              {config.resultsPublished
                ? 'Bảng Xếp Hạng Đang Được Công Bố Công Khai'
                : 'Bảng Xếp Hạng Đang Ở Chế Độ Bảo Mật (Ẩn Đối Với Thí Sinh)'}
            </h3>
            <p className="text-xs text-slate-300">
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
      <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4">
        <h3 className="font-['Righteous'] text-lg text-white">
          Bảng Điểm Tổng Hợp Có Trọng Số
        </h3>

        <div className="overflow-x-auto rounded-[12px] border border-[#334155] bg-[#0F172A]">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#1E293B]/70 border-b border-[#334155] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 w-14 text-center">Hạng</th>
                <th className="py-3.5 px-4">Đội Thi</th>
                <th className="py-3.5 px-4">Đội Trưởng</th>
                <th className="py-3.5 px-4 text-center">Số Lượt Chấm</th>
                <th className="py-3.5 px-4 text-right">Điểm TB Giám Khảo (Thang 100)</th>
                <th className="py-3.5 px-4 text-center">Xếp Loại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/60 text-slate-200">
              {teamScoreRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    <Trophy className="mx-auto mb-2 opacity-30 text-slate-400" size={32} />
                    Chưa có kết quả hoặc đội thi nào được chấm điểm trong hệ thống.
                  </td>
                </tr>
              ) : (
                teamScoreRows.map((row, idx) => (
                <tr key={row.team.id} className="hover:bg-[#1E293B]/40 transition-colors">
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

                  <td className="py-3.5 px-4 font-bold text-white">
                    {row.team.name}
                  </td>

                  <td className="py-3.5 px-4 text-slate-300">
                    {row.team.leaderName}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <Badge variant={row.evalCount > 0 ? 'success' : 'neutral'}>
                      {row.evalCount} lượt
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 text-right font-['Righteous'] text-lg text-emerald-400 font-mono">
                    {row.avgScore} / 100
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        row.avgScore >= 85
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : row.avgScore >= 70
                          ? 'bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {row.avgScore >= 85 ? 'Xuất Sắc' : row.avgScore >= 70 ? 'Khá Giỏi' : 'Đạt'}
                    </span>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

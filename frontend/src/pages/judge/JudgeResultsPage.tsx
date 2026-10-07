import React from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useNavigate } from 'react-router-dom';
import { Columns } from 'lucide-react';

export const JudgeResultsPage: React.FC = () => {
  const { currentUser, teams, evaluations } = useMockStore();
  const navigate = useNavigate();

  const myEvaluations = evaluations.filter((e) => e.judgeId === currentUser.id);

  return (
    <div className="space-y-6 font-['Roboto']">
      <div>
        <h1
          className="font-['Righteous'] text-2xl sm:text-3xl tracking-wide"
          style={{
            background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Bảng Điểm Cá Nhân Của Bạn (My Evaluations)
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Danh sách các đội thi bạn đã cho điểm hoặc lưu bản nháp đánh giá.
        </p>
      </div>

      <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4">
        <div className="overflow-x-auto rounded-[12px] border border-[#334155] bg-[#0F172A]">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#1E293B]/70 border-b border-[#334155] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Đội Thi</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                <th className="py-3.5 px-4 text-center">Điểm Đã Chấm</th>
                <th className="py-3.5 px-4">Nhận Xét Chuyên Môn</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/60 text-slate-200">
              {teams.map((t) => {
                const evalItem = myEvaluations.find((e) => e.teamId === t.id);
                const hasScore = Boolean(evalItem);

                return (
                  <tr key={t.id} className="hover:bg-[#1E293B]/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">{t.name}</td>

                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant={
                          !hasScore
                            ? 'warning'
                            : evalItem?.isDraft
                            ? 'cyan'
                            : 'success'
                        }
                      >
                        {!hasScore ? 'Chưa chấm' : evalItem?.isDraft ? 'Lưu nháp' : 'Chính thức'}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                      {hasScore ? `${evalItem?.totalScore}đ` : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 max-w-sm truncate text-xs">
                      {evalItem?.generalComment || 'Chưa có nhận xét'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/judge/split-screen?teamId=${t.id}`)}
                        className="px-2.5 py-1 text-xs gap-1"
                      >
                        <Columns size={12} />
                        <span>{hasScore ? 'Sửa điểm' : 'Chấm ngay'}</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

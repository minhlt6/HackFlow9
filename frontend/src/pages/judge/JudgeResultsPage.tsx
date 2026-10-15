import React from 'react';
import { useMockStore, normalizeScoreTo100 } from '../../store/useMockStore';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useNavigate } from 'react-router-dom';
import { Columns } from 'lucide-react';

export const JudgeResultsPage: React.FC = () => {
  const { currentUser, teams, evaluations, rubricCriteria } = useMockStore();
  const navigate = useNavigate();

  const myEvaluations = evaluations.filter((e) => e.judgeId === currentUser.id);

  return (
    <div className="space-y-6 ">
      <div>
        <h1
          className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide"
        >
          Bảng Điểm Đã Chấm
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Danh sách các đội thi bạn đã cho điểm hoặc lưu bản nháp đánh giá.
        </p>
      </div>

      <div className="rounded-[16px] border border-border bg-card p-6 space-y-4">
        <div className="overflow-x-auto rounded-[12px] border border-border bg-muted/40 dark:bg-slate-900/60">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-card border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Đội Thi</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                <th className="py-3.5 px-4 text-center">Điểm Đã Chấm (Thang 100)</th>
                <th className="py-3.5 px-4">Nhận Xét Chuyên Môn</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {teams.map((t) => {
                const evalItem = myEvaluations.find((e) => e.teamId === t.id);
                const hasScore = Boolean(evalItem);
                const normalizedScore = evalItem
                  ? normalizeScoreTo100(evalItem.totalScore, evalItem.scores, rubricCriteria)
                  : 0;

                return (
                  <tr key={t.id} className="hover:bg-accent transition-colors">
                    <td className="py-3.5 px-4 font-bold text-foreground">{t.name}</td>

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

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {hasScore ? `${normalizedScore}đ` : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground max-w-sm truncate text-xs">
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

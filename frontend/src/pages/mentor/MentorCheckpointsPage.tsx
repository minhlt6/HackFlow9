import React, { useEffect } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Badge } from '../../components/Badge';
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const MentorCheckpointsPage: React.FC = () => {
  const { teams, checkpoints, submissions, syncFromBackend } = useMockStore();

  useEffect(() => {
    void syncFromBackend?.();
  }, [syncFromBackend]);

  return (
    <div className="space-y-6 ">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide"
          >
            Theo Dõi Tiến Độ Nộp Bài Của Các Đội
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Cố vấn theo dõi tổng quan tỷ lệ nộp bài của các đội để có phương án hỗ trợ kịp thời.
          </p>
        </div>
      </div>

      {/* RBAC Notice Banner */}
      <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-3">
        <ShieldAlert size={18} className="shrink-0 text-amber-700 dark:text-amber-400" />
        <span>
          <strong>Chính sách bảo mật RBAC HackFlow:</strong> Cố vấn chuyên môn có thể thấy tiến độ hoàn thành các chặng nhưng <strong>bị hạn chế quyền truy cập mã nguồn bài nộp</strong> và <strong>không được xem trước điểm số của Giám khảo</strong> nhằm đảm bảo tính công bằng và chống lộ đề tài.
        </span>
      </div>

      {/* Progress Matrix Table */}
      <div className="rounded-[16px] border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold tracking-tight text-foreground text-lg">
          Ma Trận Tiến Độ Các Chặng Theo Đội Thi
        </h3>

        <div className="overflow-x-auto rounded-[12px] border border-border bg-muted/40 dark:bg-slate-900/60">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-card border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Tên Đội Thi</th>
                {checkpoints.map((cp, idx) => (
                  <th key={cp.id} className="py-3.5 px-4 text-center">
                    CP #{idx + 1}
                  </th>
                ))}
                <th className="py-3.5 px-4 text-right">Tổng Tiến Độ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {teams.map((team) => {
                const teamSubs = submissions.filter((s) => s.teamId === team.id);
                const completedCount = checkpoints.filter((cp) =>
                  teamSubs.some((s) => s.checkpointId === cp.id)
                ).length;
                const totalCount = checkpoints.length;

                return (
                  <tr key={team.id} className="hover:bg-accent transition-colors">
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {team.name}
                      <span className="text-[11px] text-muted-foreground block font-normal">
                        {team.leaderName}
                      </span>
                    </td>

                    {checkpoints.map((cp) => {
                      const isDone = teamSubs.some((s) => s.checkpointId === cp.id);
                      return (
                        <td key={cp.id} className="py-3.5 px-4 text-center">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              <CheckCircle2 size={12} />
                              <span>Đã nộp</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                              <Clock size={12} />
                              <span>Chưa nộp</span>
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-3.5 px-4 text-right">
                      <Badge
                        variant={
                          totalCount > 0 && completedCount === totalCount
                            ? 'success'
                            : completedCount > 0
                            ? 'indigo'
                            : 'neutral'
                        }
                      >
                        {completedCount}/{totalCount} chặng
                      </Badge>
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

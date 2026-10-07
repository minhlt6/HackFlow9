import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { RbacForbiddenModal } from '../../components/common/RbacForbiddenModal';
import {
  Lock,
  ShieldAlert,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const MentorCheckpointsPage: React.FC = () => {
  const { teams, checkpoints, submissions } = useMockStore();

  const [isForbiddenModalOpen, setIsForbiddenModalOpen] = useState(false);
  const [attemptedAction, setAttemptedAction] = useState('Truy cập kho lưu trữ mã nguồn GitHub hoặc Bảng điểm chấm thi của Ban Giám Khảo');

  const handleTriggerForbidden = (action: string) => {
    setAttemptedAction(action);
    setIsForbiddenModalOpen(true);
  };

  return (
    <div className="space-y-6 font-['Roboto']">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-['Righteous'] text-2xl sm:text-3xl tracking-wide"
            style={{
              background: 'linear-gradient(90deg, #A855F7 0%, #FAFBFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Theo Dõi Tiến Độ Checkpoints Của Các Đội
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Cố vấn theo dõi tổng quan tỷ lệ nộp bài của các đội để có phương án hỗ trợ kịp thời.
          </p>
        </div>

        {/* RBAC Security Demo Button */}
        <Button
          variant="secondary"
          onClick={() =>
            handleTriggerForbidden(
              'GET /api/v1/evaluations/judge-sheets & GET /api/v1/submissions/source-code (Quyền bị chặn đối với vai trò MENTOR)',
            )
          }
          className="gap-2 border-rose-500/50 text-rose-400 hover:bg-rose-500/10"
        >
          <Lock size={15} />
          <span>Mô Phỏng Kiểm Tra RBAC (HTTP 403)</span>
        </Button>
      </div>

      {/* RBAC Notice Banner */}
      <div className="rounded-[14px] border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-300 flex items-center gap-3">
        <ShieldAlert size={18} className="shrink-0 text-amber-400" />
        <span>
          <strong>Chính sách bảo mật RBAC HackFlow:</strong> Cố vấn (Mentor) có thể thấy tiến độ hoàn thành các mốc Checkpoint nhưng <strong>bị hạn chế quyền truy cập mã nguồn bài nộp</strong> và <strong>không được xem trước điểm số của Giám khảo</strong> nhằm đảm bảo tính công bằng và chống lộ đề tài.
        </span>
      </div>

      {/* Progress Matrix Table */}
      <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4">
        <h3 className="font-['Righteous'] text-lg text-white">
          Ma Trận Hoàn Thành Checkpoint Theo Đội Thi
        </h3>

        <div className="overflow-x-auto rounded-[12px] border border-[#334155] bg-[#0F172A]">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#1E293B]/70 border-b border-[#334155] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Tên Đội Thi</th>
                {checkpoints.map((cp, idx) => (
                  <th key={cp.id} className="py-3.5 px-4 text-center">
                    CP #{idx + 1}
                  </th>
                ))}
                <th className="py-3.5 px-4 text-right">Mã Nguồn Thí Sinh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/60 text-slate-200">
              {teams.map((team) => {
                const teamSubs = submissions.filter((s) => s.teamId === team.id);

                return (
                  <tr key={team.id} className="hover:bg-[#1E293B]/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {team.name}
                      <span className="text-[11px] text-slate-400 block font-normal">
                        {team.leaderName}
                      </span>
                    </td>

                    {checkpoints.map((cp) => {
                      const isDone = teamSubs.some((s) => s.checkpointId === cp.id);
                      return (
                        <td key={cp.id} className="py-3.5 px-4 text-center">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              <CheckCircle2 size={12} />
                              <span>Đã nộp</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
                              <Clock size={12} />
                              <span>Chưa nộp</span>
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          handleTriggerForbidden(
                            `Truy cập kho mã nguồn GitHub bí mật của đội "${team.name}"`,
                          )
                        }
                        className="px-2.5 py-1 text-xs gap-1 border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                      >
                        <Lock size={12} />
                        <span>Xem Code (Khóa)</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RBAC Forbidden Modal */}
      <RbacForbiddenModal
        isOpen={isForbiddenModalOpen}
        onClose={() => setIsForbiddenModalOpen(false)}
        attemptedAction={attemptedAction}
        userRole="mentor"
      />
    </div>
  );
};

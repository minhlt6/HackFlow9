import React from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { useNavigate } from 'react-router-dom';
import {
  Columns,
  EyeOff,
  ArrowRight,
} from 'lucide-react';

export const JudgeDashboardPage: React.FC = () => {
  const { currentUser, teams, evaluations, config, majorTopics } = useMockStore();
  const navigate = useNavigate();

  // Find evaluations by this judge
  const judgeEvals = evaluations.filter((e) => e.judgeId === currentUser.id);

  const getTopicTitle = (subTopicId?: string) => {
    if (!subTopicId) return 'Chưa phân công';
    for (const mt of majorTopics) {
      const sub = mt.subTopics.find((s) => s.id === subTopicId);
      if (sub) return sub.title;
    }
    return 'Chưa phân công';
  };

  return (
    <div className="space-y-6 font-['Roboto']">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 lg:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#6366F1]/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#818CF8]">
                Hội Đồng Ban Giám Khảo Chuyên Gia
              </span>
              <span className="text-slate-500">•</span>
              <Badge variant="indigo">Chấm Điểm Độc Lập</Badge>
            </div>
            <h1
              className="font-['Righteous'] text-2xl sm:text-3xl lg:text-4xl tracking-wide"
              style={{
                background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Khu Vực Chấm Thi: {currentUser.fullName}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Thực hiện chấm điểm hồ sơ dự thi của các đội thông qua giao diện chấm thi song song đối chiếu trực tiếp mã nguồn và tiêu chí đánh giá.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => navigate('/judge/split-screen')}
            className="gap-2 shadow-lg shadow-[#6366F1]/25 px-6"
          >
            <Columns size={18} />
            <span>Mở Giao Diện Chấm 2 Màn Hình</span>
          </Button>
        </div>
      </div>

      {/* Blind Judging Banner */}
      {config.blindJudgingMode && (
        <div className="rounded-[14px] border border-amber-500/40 bg-amber-950/20 p-4 text-xs text-amber-300 flex items-center gap-3">
          <EyeOff size={20} className="shrink-0 text-amber-400" />
          <span>
            <strong>Chế độ chấm ẩn danh đang được kích hoạt:</strong> Thông tin về trường đại học và tên thật của thí sinh đã được ẩn danh thành các mã định danh đội để đảm bảo tính khách quan tuyệt đối.
          </span>
        </div>
      )}

      {/* Teams Assigned to Judge Table */}
      <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <h3 className="font-['Righteous'] text-lg text-white">
            Danh Sách Đội Thi Được Phân Công ({teams.length} Đội)
          </h3>
          <span className="text-xs text-slate-400">
            Đã hoàn thành: {judgeEvals.filter((e) => !e.isDraft).length} / {teams.length}
          </span>
        </div>

        <div className="overflow-x-auto rounded-[12px] border border-[#334155] bg-[#0F172A]">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#1E293B]/70 border-b border-[#334155] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Tên Đội / Mã Định Danh</th>
                <th className="py-3.5 px-4">Đề Tài Dự Thi</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái Chấm</th>
                <th className="py-3.5 px-4 text-center">Điểm Đã Chấm</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/60 text-slate-200">
              {teams.map((team, idx) => {
                const evalItem = judgeEvals.find((e) => e.teamId === team.id);
                const isEvaluated = Boolean(evalItem && !evalItem.isDraft);
                const isDraft = Boolean(evalItem?.isDraft);

                const displayName = config.blindJudgingMode
                  ? `Đội thi ẩn danh #${(idx + 1).toString().padStart(2, '0')}`
                  : team.name;

                return (
                  <tr key={team.id} className="hover:bg-[#1E293B]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{displayName}</span>
                      <span className="text-[11px] text-slate-400">
                        {config.blindJudgingMode ? 'Mã dự thi hợp lệ' : `Đội trưởng: ${team.leaderName}`}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                      {getTopicTitle(team.subTopicId)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={isEvaluated ? 'success' : isDraft ? 'cyan' : 'warning'}>
                        {isEvaluated
                          ? 'Đã chấm xong'
                          : isDraft
                          ? 'Đang lưu nháp'
                          : 'Chưa chấm điểm'}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold">
                      {isEvaluated ? (
                        <span className="text-emerald-400 text-base">{evalItem?.totalScore}đ</span>
                      ) : isDraft ? (
                        <span className="text-cyan-400 text-sm">{evalItem?.totalScore}đ (nháp)</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant={isEvaluated ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => navigate(`/judge/split-screen?teamId=${team.id}`)}
                        className="gap-1 px-3"
                      >
                        <Columns size={13} />
                        <span>{isEvaluated ? 'Xem lại' : 'Chấm điểm'}</span>
                        <ArrowRight size={13} />
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

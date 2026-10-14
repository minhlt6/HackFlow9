import React from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Badge } from '../../components/Badge';
import { Crown, Lightbulb } from 'lucide-react';

export const MentorTeamsPage: React.FC = () => {
  const { teams, majorTopics } = useMockStore();

  const getSubTopicTitle = (subId?: string) => {
    if (!subId) return 'Chưa đăng ký';
    for (const mt of majorTopics) {
      const sub = mt.subTopics.find((s) => s.id === subId);
      if (sub) return sub.title;
    }
    return 'Chưa đăng ký';
  };

  return (
    <div className="space-y-6 font-['Roboto']">
      <div>
        <h1
          className="font-['Righteous'] text-2xl sm:text-3xl tracking-wide"
          style={{
            background: 'linear-gradient(90deg, #A855F7 0%, #FAFBFF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Đội Thi Thuộc Lĩnh Vực Phụ Trách
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Danh sách các đội thi đăng ký đề tài trong lĩnh vực Trí Tuệ Nhân Tạo & Y Tế Số.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {teams.map((team) => (
          <div
            key={team.id}
            className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#334155]">
              <div>
                <h3 className="font-['Righteous'] text-xl text-white">{team.name}</h3>
                <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Crown size={12} className="text-amber-400" />
                  <span>Đội trưởng: {team.leaderName}</span>
                </span>
              </div>
              <Badge variant="indigo">{team.members.length} thành viên</Badge>
            </div>

            <div className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-xs space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Lightbulb size={13} className="text-[#818CF8]" />
                <span>Đề tài:</span>
              </span>
              <span className="text-white font-semibold">{getSubTopicTitle(team.subTopicId)}</span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Thành viên đội:
              </span>
              <div className="space-y-1.5">
                {team.members.map((m) => (
                  <div
                    key={m.id}
                    className="p-2 rounded-[8px] bg-[#0F172A] text-xs flex items-center justify-between text-slate-300"
                  >
                    <span>{m.fullName}</span>
                    <span className="text-slate-400 text-[11px] font-mono">{m.email}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

import React from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Users, Columns } from 'lucide-react';

export const JudgeTopicsPage: React.FC = () => {
  const { majorTopics, teams } = useMockStore();
  const navigate = useNavigate();

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
          Tổng Quan Đề Tài và Đội Thi Tham Gia
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Xem danh mục các đề tài được đăng ký và các đội thi thuộc từng nhánh chuyên môn.
        </p>
      </div>

      <div className="space-y-6">
        {majorTopics.map((m) => (
          <div
            key={m.id}
            className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2.5">
                <Lightbulb size={20} className="text-[#818CF8]" />
                <h3 className="font-['Righteous'] text-xl text-white">{m.name}</h3>
              </div>
              <Badge variant="indigo">{m.subTopics.length} nhánh</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {m.subTopics.map((sub) => {
                const registeredTeams = teams.filter((t) => t.subTopicId === sub.id);

                return (
                  <div
                    key={sub.id}
                    className="p-4 rounded-[12px] bg-[#0F172A] border border-[#334155] space-y-3"
                  >
                    <div>
                      <h4 className="font-bold text-white text-sm">{sub.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {sub.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#334155]/60 flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Users size={13} />
                        <span>Đội đăng ký: {registeredTeams.length} / {sub.quota}</span>
                      </span>

                      {registeredTeams.length > 0 && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/judge/split-screen?teamId=${registeredTeams[0].id}`)}
                          className="px-2.5 py-1 text-xs gap-1"
                        >
                          <Columns size={12} />
                          <span>Chấm ngay</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

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
    <div className="space-y-6 ">
      <div>
        <h1
          className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide"
        >
          Đội Thi Thuộc Lĩnh Vực Phụ Trách
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Danh sách các đội thi và đề tài đăng ký để theo dõi, hỗ trợ.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {teams.map((team) => (
          <div
            key={team.id}
            className="rounded-[16px] border border-border bg-card p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-border">
              <div>
                <h3 className="font-semibold tracking-tight text-foreground text-xl text-foreground">{team.name}</h3>
                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Crown size={12} className="text-amber-700 dark:text-amber-400" />
                  <span>Đội trưởng: {team.leaderName}</span>
                </span>
              </div>
              <Badge variant="indigo">{team.members.length} thành viên</Badge>
            </div>

            <div className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-xs space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Lightbulb size={13} className="text-primary" />
                <span>Đề tài:</span>
              </span>
              <span className="text-foreground font-semibold">{getSubTopicTitle(team.subTopicId)}</span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Thành viên đội:
              </span>
              <div className="space-y-1.5">
                {team.members.map((m) => (
                  <div
                    key={m.id}
                    className="p-2 rounded-[8px] bg-muted/40 dark:bg-slate-900/60 text-xs flex items-center justify-between text-muted-foreground"
                  >
                    <span>{m.fullName}</span>
                    <span className="text-muted-foreground text-[11px] font-mono">{m.email}</span>
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

import React from 'react';
import { useMockStore } from '../../store/useMockStore';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Users,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';

export const MentorDashboardPage: React.FC = () => {
  const { currentUser, tickets, teams } = useMockStore();
  const navigate = useNavigate();

  const openTickets = tickets.filter((t) => t.status !== 'resolved');
  const claimedByMe = tickets.filter((t) => t.assignedMentorId === currentUser.id);

  return (
    <div className="space-y-6 font-['Roboto']">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 lg:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#6366F1]/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#818CF8]">
                Cố Vấn Chuyên Môn Kỹ Thuật
              </span>
              <span className="text-slate-500">•</span>
              <Badge variant="purple">Hỗ Trợ Kỹ Thuật 24/7</Badge>
            </div>
            <h1
              className="font-['Righteous'] text-2xl sm:text-3xl lg:text-4xl tracking-wide"
              style={{
                background: 'linear-gradient(90deg, #A855F7 0%, #FAFBFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Xin chào, {currentUser.fullName}!
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Bạn đang phụ trách cố vấn kỹ thuật cho lĩnh vực{' '}
              <strong className="text-white">Trí Tuệ Nhân Tạo & Y Tế Số</strong>. Tiếp nhận các yêu cầu hỗ trợ và đồng hành cùng các đội thi.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => navigate('/mentor/tickets')}
            className="gap-2 shadow-lg shadow-purple-600/20 px-6 !bg-purple-600 hover:!bg-purple-500"
          >
            <HelpCircle size={18} />
            <span>Mở Hàng Đợi Hỗ Trợ ({openTickets.length})</span>
          </Button>
        </div>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Tickets Chờ Tiếp Nhận"
          value={openTickets.length}
          subtitle="Yêu cầu từ các đội thi cần giải đáp"
          icon={<HelpCircle size={24} />}
          iconColor="rose"
          onClick={() => navigate('/mentor/tickets')}
        />

        <StatCard
          title="Tickets Đang Trực Tiếp Hỗ Trợ"
          value={claimedByMe.length}
          subtitle="Đang trao đổi qua tin nhắn"
          icon={<MessageSquare size={24} />}
          iconColor="purple"
          onClick={() => navigate('/mentor/tickets')}
        />

        <StatCard
          title="Đội Thi Thuộc Lĩnh Vực"
          value={teams.length}
          subtitle="Đang trong giai đoạn thực thi dự án"
          icon={<Users size={24} />}
          iconColor="indigo"
          onClick={() => navigate('/mentor/teams')}
        />
      </div>

      {/* Recent Tickets Queue */}
      <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <h3 className="font-['Righteous'] text-lg text-white">
            Hàng Đợi Yêu Cầu Hỗ Trợ Mới Nhất
          </h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/mentor/tickets')}
            className="gap-1 text-xs"
          >
            <span>Xem tất cả</span>
            <ArrowRight size={13} />
          </Button>
        </div>

        <div className="space-y-3">
          {openTickets.map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-[12px] bg-[#0F172A] border border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{t.title}</span>
                  <Badge variant={t.priority === 'high' ? 'danger' : 'warning'}>
                    {t.priority.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">{t.description}</p>
                <div className="text-[11px] text-[#818CF8] mt-1">
                  Đội thi: {t.teamName} • Người tạo: {t.creatorName}
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/mentor/tickets')}
                className="gap-1.5 shrink-0"
              >
                <span>Vào xử lý</span>
                <ArrowRight size={13} />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

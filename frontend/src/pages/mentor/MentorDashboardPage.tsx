import React, { useEffect } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { useNavigate } from 'react-router-dom';
import { InitialRoleTodoBanner } from '../../components/common/InitialRoleTodoBanner';
import { ticketService } from '../../services/ticketService';
import {
  HelpCircle,
  Users,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';

export const MentorDashboardPage: React.FC = () => {
  const { currentUser, tickets, teams, syncFromBackend } = useMockStore();
  const navigate = useNavigate();

  useEffect(() => {
    void syncFromBackend?.();
  }, [syncFromBackend]);

  const openTickets = tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed');
  const claimedByMe = tickets.filter(
    (t) => t.assignedMentorId === currentUser.id || Boolean(t.assignedMentorId),
  );

  const handleProcessTicket = async (ticket: (typeof tickets)[number]) => {
    if (ticket.status === 'open' && !ticket.assignedMentorId) {
      try {
        await ticketService.updateTicket(ticket.id, { action: 'accept' });
        useMockStore.setState((state) => ({
          tickets: state.tickets.map((item) =>
            item.id === ticket.id
              ? {
                  ...item,
                  status: 'in_progress',
                  assignedMentorId: currentUser.id,
                  assignedMentorName: currentUser.fullName,
                }
              : item,
          ),
        }));
      } catch {
        // Ignore if already claimed or offline; SupportTickets page will sync
      }
    }
    navigate(`/mentor/tickets?ticketId=${encodeURIComponent(ticket.id)}&tab=my_assigned`);
  };

  return (
    <div className="space-y-6 ">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-[16px] border border-border bg-card p-6 lg:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#6366F1]/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Cố Vấn Chuyên Môn Kỹ Thuật
              </span>
              <span className="text-muted-foreground">•</span>
              <Badge variant="purple">Hỗ Trợ Kỹ Thuật 24/7</Badge>
            </div>
            <h1
              className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl lg:text-4xl tracking-wide"
            >
              Xin chào, {currentUser.fullName}!
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Bạn đang phụ trách cố vấn kỹ thuật cho lĩnh vực{' '}
              <strong className="text-foreground">Trí Tuệ Nhân Tạo & Y Tế Số</strong>. Tiếp nhận các yêu cầu hỗ trợ và đồng hành cùng các đội thi.
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

      {/* Checklist nhiệm vụ ban đầu cho Cố vấn */}
      <InitialRoleTodoBanner role="mentor" />

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
          onClick={() => navigate('/mentor/tickets?tab=my_assigned')}
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
      <div className="rounded-[16px] border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="font-semibold tracking-tight text-foreground text-lg text-foreground">
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
              className="p-4 rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-sm">{t.title}</span>
                  <Badge variant={t.priority === 'high' ? 'danger' : 'warning'}>
                    {t.priority.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t.description}</p>
                <div className="text-[11px] text-primary mt-1">
                  Đội thi: {t.teamName} • Người tạo: {t.creatorName}
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleProcessTicket(t)}
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

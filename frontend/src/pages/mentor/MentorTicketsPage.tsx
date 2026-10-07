import React, { useState, useEffect, useRef } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import {
  Send,
  CheckCircle2,
  UserCheck,
  MessageSquare,
} from 'lucide-react';

export const MentorTicketsPage: React.FC = () => {
  const { currentUser, tickets, claimTicket, replyTicket, resolveTicket } = useMockStore();

  const [filter, setFilter] = useState<'all' | 'unassigned' | 'mine' | 'resolved'>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(tickets[0]?.id || null);
  const [replyText, setReplyText] = useState('');
  const [alert, setAlert] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const filteredTickets = tickets.filter((t) => {
    if (filter === 'unassigned') return !t.assignedMentorId && t.status !== 'resolved';
    if (filter === 'mine') return t.assignedMentorId === currentUser.id;
    if (filter === 'resolved') return t.status === 'resolved';
    return true;
  });

  // Auto select first ticket if none selected or if selected ticket is no longer available
  useEffect(() => {
    if ((!selectedTicketId || !tickets.some((t) => t.id === selectedTicketId)) && filteredTickets.length > 0) {
      setSelectedTicketId(filteredTickets[0].id);
    }
  }, [filteredTickets.length, selectedTicketId, tickets]);

  const activeTicket = tickets.find((t) => t.id === selectedTicketId);

  // Auto scroll smoothly to bottom when new reply/message arrives in real time
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicket?.replies?.length, activeTicket?.messages?.length]);

  const handleClaim = () => {
    if (!activeTicket) return;
    claimTicket(activeTicket.id);
    setAlert(`Bạn đã tiếp nhận xử lý Ticket #${activeTicket.id}!`);
    setTimeout(() => setAlert(null), 3000);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    replyTicket(activeTicket.id, replyText.trim());
    setReplyText('');
  };

  const handleResolve = () => {
    if (!activeTicket) return;
    resolveTicket(activeTicket.id);
    setAlert(`Đã đóng Ticket #${activeTicket.id} với trạng thái Hoàn thành!`);
    setTimeout(() => setAlert(null), 3000);
  };

  return (
    <div className="space-y-6 font-['Roboto']">
      {/* Top Header */}
      <div>
        <h1
          className="font-['Righteous'] text-2xl sm:text-3xl tracking-wide"
          style={{
            background: 'linear-gradient(90deg, #A855F7 0%, #FAFBFF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Tiếp Nhận & Xử Lý Yêu Cầu Hỗ Trợ
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Quy trình 3 bước: Tiếp nhận yêu cầu → Trao đổi trực tiếp → Đóng yêu cầu khi vấn đề đã được giải quyết.
        </p>
      </div>

      {alert && (
        <div className="p-3.5 rounded-[10px] bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{alert}</span>
        </div>
      )}

      {/* Main Layout: Ticket Queue (Left) & Chat Thread (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left Column: Tickets Queue (5/12) */}
        <div className="lg:col-span-5 rounded-[16px] border border-[#334155] bg-[#1E293B] p-4 flex flex-col">
          {/* Filter Pills */}
          <div className="flex border-b border-[#334155] pb-3 gap-1 overflow-x-auto">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'unassigned', label: 'Chờ nhận' },
              { id: 'mine', label: 'Của tôi' },
              { id: 'resolved', label: 'Đã đóng' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors whitespace-nowrap ${
                  filter === f.id
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[#0F172A] text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Ticket Items */}
          <div className="flex-1 overflow-y-auto mt-3 space-y-2.5 pr-1">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Không tìm thấy ticket nào phù hợp với bộ lọc.
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = t.id === selectedTicketId;
                const isClaimedByMe = t.assignedMentorId === currentUser.id;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-3.5 rounded-[12px] border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#0F172A] border-[#6366F1] shadow-md'
                        : 'bg-[#0F172A]/50 border-[#334155] hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-white line-clamp-1">
                        {t.title}
                      </span>
                      <Badge variant={t.priority === 'high' ? 'danger' : 'warning'}>
                        {t.priority.toUpperCase()}
                      </Badge>
                    </div>

                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">{t.description}</p>

                    <div className="mt-3 pt-2 border-t border-[#334155]/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Đội: {t.teamName}</span>
                      {t.assignedMentorName ? (
                        <span
                          className={`font-semibold ${
                            isClaimedByMe ? 'text-purple-300' : 'text-slate-300'
                          }`}
                        >
                          Mentor: {t.assignedMentorName}
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold">Chưa có ai nhận</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation (7/12) */}
        <div className="lg:col-span-7 rounded-[16px] border border-[#334155] bg-[#1E293B] p-5 flex flex-col justify-between">
          {activeTicket ? (
            <div className="flex-1 flex flex-col justify-between">
              {/* Header */}
              <div className="pb-4 border-b border-[#334155]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-['Righteous'] text-lg text-white">
                    {activeTicket.title}
                  </h3>

                  <div className="flex items-center gap-2">
                    {!activeTicket.assignedMentorId ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleClaim}
                        className="gap-1.5 !bg-purple-600 hover:!bg-purple-500"
                      >
                        <UserCheck size={14} />
                        <span>Nhận Hỗ Trợ Ticket Này</span>
                      </Button>
                    ) : activeTicket.status !== 'resolved' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleResolve}
                        className="gap-1.5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <CheckCircle2 size={14} />
                        <span>Đánh Dấu Hoàn Thành</span>
                      </Button>
                    ) : (
                      <Badge variant="success">Đã Hoàn Thành</Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                  <span>Đội thi: <strong className="text-white">{activeTicket.teamName}</strong></span>
                  <span>Người tạo: {activeTicket.creatorName}</span>
                  <span>Tạo lúc: {activeTicket.createdAt}</span>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-2 max-h-[380px]">
                {/* Initial Description */}
                <div className="p-3.5 rounded-[12px] bg-[#0F172A] border border-[#334155] text-xs text-slate-200">
                  <div className="flex justify-between items-center text-slate-400 mb-1 font-semibold">
                    <span>{activeTicket.creatorName} (Thí sinh)</span>
                    <span className="text-[10px]">{activeTicket.createdAt}</span>
                  </div>
                  <p className="leading-relaxed">{activeTicket.description}</p>
                </div>

                {/* Replies */}
                {activeTicket.replies?.map((rep) => {
                  const isMentor = rep.authorRole === 'mentor';
                  return (
                    <div
                      key={rep.id}
                      className={`p-3.5 rounded-[12px] text-xs space-y-1 ${
                        isMentor
                          ? 'bg-purple-950/40 border border-purple-800/60 text-purple-200 ml-4'
                          : 'bg-[#0F172A] border border-[#334155] text-slate-200 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className={isMentor ? 'text-purple-300 font-bold' : 'text-slate-300'}>
                          {rep.authorName} {isMentor && '(Cố vấn Mentor)'}
                        </span>
                        <span className="text-[10px] text-slate-400">{rep.createdAt}</span>
                      </div>
                      <p className="leading-relaxed">{rep.content}</p>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="pt-3 border-t border-[#334155] flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập hướng dẫn kỹ thuật hoặc giải đáp cho thí sinh..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-[10px] bg-[#0F172A] border border-[#334155] text-white placeholder-slate-400 text-xs focus:border-[#6366F1] focus:outline-none"
                />
                <Button
                  variant="primary"
                  type="submit"
                  size="sm"
                  className="gap-1.5 px-4 !bg-purple-600 hover:!bg-purple-500"
                >
                  <Send size={14} />
                  <span>Gửi Hướng Dẫn</span>
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <MessageSquare size={36} className="text-slate-600 mb-2" />
              <p className="text-sm font-medium">Chọn một Ticket bên trái để xem cuộc hội thoại</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

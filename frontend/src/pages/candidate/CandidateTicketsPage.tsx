import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import {
  HelpCircle,
  Plus,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
  Tag,
} from 'lucide-react';

export const CandidateTicketsPage: React.FC = () => {
  const { currentUser, teams, tickets, createTicket, replyTicket, resolveTicket } =
    useMockStore();

  const myTeam = teams.find((t) => t.id === currentUser.teamId);

  // Tickets created by my team
  const myTeamTickets = tickets.filter(
    (t) => t.teamId === myTeam?.id || t.creatorId === currentUser.id,
  );

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    myTeamTickets[0]?.id || null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [replyText, setReplyText] = useState('');

  const activeTicket = tickets.find((t) => t.id === selectedTicketId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const res = createTicket(title.trim(), description.trim(), priority);
    if (res.success && res.ticket) {
      setSelectedTicketId(res.ticket.id);
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
    }
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
  };

  return (
    <div className="space-y-6 font-['Roboto']">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-['Righteous'] text-2xl sm:text-3xl tracking-wide"
            style={{
              background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Hỗ Trợ Kỹ Thuật (Helpdesk Tickets)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Quy trình hỗ trợ 3 bước: Thí sinh mở Ticket → Cố vấn (Mentor) tiếp nhận → Trao đổi trực tiếp và giải quyết vướng mắc.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 shadow-lg shadow-[#6366F1]/20"
        >
          <Plus size={16} />
          <span>Tạo Ticket mới</span>
        </Button>
      </div>

      {/* Main Grid: Ticket List (Left) & Chat Conversation (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[560px]">
        {/* Left Column: Tickets Queue */}
        <div className="lg:col-span-5 rounded-[16px] border border-[#334155] bg-[#1E293B] p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
            <span className="font-['Righteous'] text-base text-white">Danh Sách Yêu Cầu</span>
            <Badge variant="indigo">{myTeamTickets.length} ticket</Badge>
          </div>

          <div className="flex-1 overflow-y-auto mt-3 space-y-2.5 pr-1">
            {myTeamTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Chưa có ticket nào được tạo. Nhấn &quot;Tạo Ticket mới&quot; khi cần hỗ trợ.
              </div>
            ) : (
              myTeamTickets.map((t) => {
                const isSelected = t.id === selectedTicketId;
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
                      <Badge
                        variant={
                          t.status === 'resolved'
                            ? 'success'
                            : t.status === 'in_progress'
                            ? 'cyan'
                            : 'warning'
                        }
                      >
                        {t.status === 'resolved'
                          ? 'Đã xử lý'
                          : t.status === 'in_progress'
                          ? 'Đang hỗ trợ'
                          : 'Đang chờ'}
                      </Badge>
                    </div>

                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">{t.description}</p>

                    <div className="mt-3 pt-2 border-t border-[#334155]/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Độ ưu tiên: {t.priority.toUpperCase()}</span>
                      {t.assignedMentorName ? (
                        <span className="text-emerald-400 font-medium">
                          Mentor: {t.assignedMentorName}
                        </span>
                      ) : (
                        <span className="text-amber-400">Chờ tiếp nhận...</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Conversation Thread */}
        <div className="lg:col-span-7 rounded-[16px] border border-[#334155] bg-[#1E293B] p-5 flex flex-col justify-between">
          {activeTicket ? (
            <div className="flex-1 flex flex-col justify-between">
              {/* Thread Header */}
              <div className="pb-4 border-b border-[#334155]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-['Righteous'] text-lg text-white">
                    {activeTicket.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        activeTicket.status === 'resolved'
                          ? 'success'
                          : activeTicket.status === 'in_progress'
                          ? 'cyan'
                          : 'warning'
                      }
                    >
                      {activeTicket.status === 'resolved'
                        ? 'Đã hoàn thành'
                        : activeTicket.status === 'in_progress'
                        ? 'Cố vấn đang xử lý'
                        : 'Chờ Cố vấn tiếp nhận'}
                    </Badge>
                    {activeTicket.status !== 'resolved' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleResolve}
                        className="gap-1 border-emerald-500/40 text-emerald-400"
                      >
                        <CheckCircle2 size={13} />
                        <span>Đóng Ticket</span>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                  <span>Mã: #{activeTicket.id}</span>
                  <span>Tạo lúc: {activeTicket.createdAt}</span>
                  {activeTicket.assignedMentorName && (
                    <span className="text-[#818CF8] font-medium flex items-center gap-1">
                      <UserCheck size={13} />
                      <span>Cố vấn: {activeTicket.assignedMentorName}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Thread Messages List */}
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
                          ? 'bg-purple-950/30 border border-purple-800/50 text-purple-200 ml-4'
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
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="pt-3 border-t border-[#334155] flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập nội dung phản hồi tới Cố vấn..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-[10px] bg-[#0F172A] border border-[#334155] text-white placeholder-slate-400 text-xs focus:border-[#6366F1] focus:outline-none"
                />
                <Button variant="primary" type="submit" size="sm" className="gap-1.5 px-4">
                  <Send size={14} />
                  <span>Gửi</span>
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

      {/* Modal: Create Ticket */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Gửi Yêu Cầu Hỗ Trợ Mới (New Ticket)"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Tiêu đề yêu cầu *"
            placeholder="Ví dụ: Lỗi xác thực API Endpoint mô hình X-ray..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-medium text-sm">
              Mức độ ưu tiên
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="p-2.5 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 text-sm focus:border-[#6366F1] focus:outline-none"
            >
              <option value="low">Thấp (Câu hỏi thông thường)</option>
              <option value="medium">Trung bình (Vướng mắc trong triển khai)</option>
              <option value="high">Khẩn cấp (Lỗi môi trường / Server sập)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-medium text-sm">
              Mô tả chi tiết vấn đề & Logs lỗi *
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cung cấp các bước tái hiện, mã lỗi hoặc ảnh chụp màn hình đường dẫn để Cố vấn hỗ trợ nhanh nhất..."
              className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 placeholder-slate-400 text-sm focus:border-[#6366F1] focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Gửi Ticket tới Cố vấn
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

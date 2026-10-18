import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMockStore } from '../store/useMockStore';
import { useAuthStore } from '../store/useAuthStore';
import { ticketService, type TicketCategory, type TicketPriority } from '../services/ticketService';
import { Button } from '../components/Button';
import { Badge, type BadgeVariant } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import {
  Plus,
  MessageSquare,
  Send,
  CheckCircle2,
  UserCheck,
  AlertTriangle,
  Clock,
  Filter,
  Search,
  CheckCircle,
  Inbox,
  User,
  Users,
} from 'lucide-react';

const CATEGORY_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  technical: { label: 'Lỗi Kỹ thuật / CI/CD', variant: 'purple' },
  topic_clarification: { label: 'Giải đáp Đề tài', variant: 'cyan' },
  submission_issue: { label: 'Vấn đề Nộp bài', variant: 'warning' },
  account_team: { label: 'Tài khoản & Đội thi', variant: 'indigo' },
  other: { label: 'Vấn đề khác', variant: 'neutral' },
};

const PRIORITY_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  urgent: { label: 'Khẩn cấp', variant: 'danger' },
  high: { label: 'Ưu tiên cao', variant: 'warning' },
  normal: { label: 'Bình thường', variant: 'primary' },
  medium: { label: 'Bình thường', variant: 'primary' },
  low: { label: 'Thấp', variant: 'neutral' },
};

const STATUS_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  open: { label: 'Chờ tiếp nhận', variant: 'warning' },
  in_progress: { label: 'Đang xử lý', variant: 'indigo' },
  resolved: { label: 'Đã giải quyết', variant: 'success' },
  closed: { label: 'Đã đóng', variant: 'neutral' },
};

export const SupportTickets: React.FC = () => {
  const { user } = useAuthStore();
  const {
    currentUser,
    teams,
    tickets,
    createTicket: storeCreateTicket,
    claimTicket: storeClaimTicket,
    replyTicket: storeReplyTicket,
    resolveTicket: storeResolveTicket,
  } = useMockStore();

  const isCandidate = user?.role === 'candidate';
  const isMentorOrAdmin = user?.role === 'mentor' || user?.role === 'admin';

  // API sync on mount
  useEffect(() => {
    const syncApi = async () => {
      try {
        if (isCandidate) {
          await ticketService.getMyTickets();
        } else {
          await ticketService.getAllTickets();
        }
      } catch {
        // Fallback to local store silently in demo
      }
    };
    syncApi();
  }, [isCandidate]);

  // Candidate Data & State
  const myTeam = teams.find((t) => t.id === currentUser.teamId) || teams[0];
  const candidateTickets = useMemo(() => {
    return tickets.filter(
      (t) => t.teamId === myTeam?.id || t.creatorId === currentUser.id,
    );
  }, [tickets, myTeam?.id, currentUser.id]);

  // Candidate Filter
  const [candidateFilter, setCandidateFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const filteredCandidateTickets = useMemo(() => {
    if (candidateFilter === 'all') return candidateTickets;
    return candidateTickets.filter((t) => t.status === candidateFilter);
  }, [candidateTickets, candidateFilter]);

  // Mentor/Admin Filter & Search State
  const [mentorStatusFilter, setMentorStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [mentorPriorityFilter, setMentorPriorityFilter] = useState<'all' | 'urgent' | 'high' | 'normal' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMentorTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (mentorStatusFilter !== 'all' && t.status !== mentorStatusFilter) return false;
      if (mentorPriorityFilter !== 'all') {
        const p = t.priority === 'medium' ? 'normal' : t.priority;
        if (p !== mentorPriorityFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchCode = (t.ticketCode || t.id).toLowerCase().includes(q);
        const matchTeam = t.teamName.toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchTeam) return false;
      }
      return true;
    });
  }, [tickets, mentorStatusFilter, mentorPriorityFilter, searchQuery]);

  // Selection
  const activeList = isCandidate ? filteredCandidateTickets : filteredMentorTickets;
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Derive active ticket safely without calling setState in effect
  const effectiveTicketId =
    (selectedTicketId && activeList.some((t) => t.id === selectedTicketId) ? selectedTicketId : null) ||
    activeList[0]?.id ||
    null;

  const activeTicket = tickets.find((t) => t.id === effectiveTicketId);

  // Create Ticket Modal State & Form Validation
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TicketCategory>('technical');
  const [newPriority, setNewPriority] = useState<TicketPriority>('normal');
  const [newContent, setNewContent] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Mentor Response State
  const [mentorResponseText, setMentorResponseText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll in conversation thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicket?.messages?.length, activeTicket?.replies?.length]);

  const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // Form Validation per Step 2:
  // Title >= 5 chars, Description/Content >= 10 chars, Category in enum, Priority in enum
  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!newTitle.trim()) {
      errors.title = 'Vui lòng nhập tiêu đề yêu cầu hỗ trợ.';
    } else if (newTitle.trim().length < 5) {
      errors.title = 'Tiêu đề phải có tối thiểu 5 ký tự.';
    } else if (newTitle.trim().length > 128) {
      errors.title = 'Tiêu đề không được vượt quá 128 ký tự.';
    }

    if (!newContent.trim()) {
      errors.content = 'Vui lòng mô tả chi tiết vướng mắc kỹ thuật.';
    } else if (newContent.trim().length < 10) {
      errors.content = 'Mô tả chi tiết phải có tối thiểu 10 ký tự để Cố vấn nắm rõ vấn đề.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreateForm()) return;

    try {
      await ticketService.createTicket({
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        priority: newPriority,
      });
    } catch {
      // Local fallback
    }

    const res = storeCreateTicket(newTitle.trim(), newContent.trim(), newPriority, newCategory);
    if (res.success && res.ticket) {
      setSelectedTicketId(res.ticket.id);
      setIsCreateOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewCategory('technical');
      setNewPriority('normal');
      setFormErrors({});
      showAlert(`Tạo ticket hỗ trợ ${res.ticket.ticketCode || res.ticket.id} thành công! Cố vấn sẽ sớm phản hồi.`);
    }
  };

  // Mentor Claim Ticket (Step 3)
  const handleClaimTicket = async () => {
    if (!activeTicket) return;
    try {
      await ticketService.updateTicket(activeTicket.id, { action: 'accept' });
    } catch {
      // Local fallback
    }
    storeClaimTicket(activeTicket.id);
    showAlert(`Bạn đã tiếp nhận xử lý Ticket #${activeTicket.ticketCode || activeTicket.id}!`);
  };

  // Mentor Resolve Ticket with Response Validation (Step 3: 422 MISSING_TICKET_RESPONSE)
  const handleResolveTicket = async () => {
    if (!activeTicket) return;
    const finalResponse = mentorResponseText.trim();

    if (!finalResponse) {
      showAlert('Lỗi [422 MISSING_TICKET_RESPONSE]: Vui lòng nhập nội dung câu trả lời hướng dẫn trước khi đánh dấu Đã giải quyết!', 'error');
      return;
    }

    try {
      await ticketService.updateTicket(activeTicket.id, {
        action: 'resolve',
        response: finalResponse,
      });
    } catch {
      // Local fallback
    }

    storeResolveTicket(activeTicket.id, finalResponse);
    setMentorResponseText('');
    showAlert(`Đã gửi phản hồi và chuyển trạng thái Ticket #${activeTicket.ticketCode || activeTicket.id} sang "Đã giải quyết"!`);
  };

  // Chat reply message
  const handleSendChatReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;
    storeReplyTicket(activeTicket.id, replyText.trim());
    setReplyText('');
  };

  return (
    <div className="space-y-6 font-['Roboto']">
      {/* Toast Alert */}
      {alert && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-lg transition-all ${
            alert.type === 'error'
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'error' ? <AlertTriangle size={16} className="text-rose-400 shrink-0" /> : <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
            <span className="font-medium">{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1
              className="font-['Righteous'] text-2xl sm:text-3xl tracking-wide inline-block"
              style={{
                background: isCandidate
                  ? 'linear-gradient(90deg, #6366F1 0%, #818CF8 50%, #C7D2FE 100%)'
                  : 'linear-gradient(90deg, #A855F7 0%, #C084FC 50%, #F3E8FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {isCandidate ? 'Hỗ Trợ Kỹ Thuật Trực Tuyến' : 'Tiếp Nhận & Xử Lý Yêu Cầu Hỗ Trợ'}
            </h1>
            <Badge variant={isCandidate ? 'primary' : 'purple'} size="sm">
              {isCandidate ? 'GÓC NHÌN THÍ SINH' : 'GÓC NHÌN MENTOR / ADMIN'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            {isCandidate
              ? 'Gửi yêu cầu hỗ trợ kỹ thuật, thắc mắc đề tài hoặc báo cáo sự cố nộp bài tới Hội đồng Cố vấn chuyên môn.'
              : 'Quy trình 3 bước chuẩn hóa: Tiếp nhận yêu cầu (Open) → Hướng dẫn giải quyết (In Progress) → Hoàn tất (Resolved).'}
          </p>
        </div>

        {/* Action Button: Candidate Create Ticket */}
        {isCandidate && (
          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 shadow-lg shadow-[#6366F1]/25 px-4 py-2"
          >
            <Plus size={16} />
            <span>Gửi Yêu Cầu Hỗ Trợ Mới</span>
          </Button>
        )}
      </div>

      {/* CANDIDATE VIEW */}
      {isCandidate && (
        <div className="space-y-4">
          {/* Status Filter Tabs */}
          <div className="flex items-center bg-[#1E293B] p-1 rounded-xl border border-[#334155] text-xs w-fit">
            <span className="px-2 text-slate-400 hidden sm:flex items-center gap-1">
              <Filter size={12} />
              <span>Trạng thái:</span>
            </span>
            {(
              [
                { key: 'all', label: 'Tất cả' },
                { key: 'open', label: 'Chờ tiếp nhận' },
                { key: 'in_progress', label: 'Đang xử lý' },
                { key: 'resolved', label: 'Đã giải quyết' },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setCandidateFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  candidateFilter === f.key
                    ? 'bg-[#6366F1] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Candidate Empty State */}
          {candidateTickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#334155] bg-[#111827]/60 p-12 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#6366F1]/15 text-[#818CF8]">
                <Inbox size={32} />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-base font-semibold text-white">Chưa có yêu cầu hỗ trợ nào</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Đội thi của bạn chưa gửi câu hỏi hay báo cáo sự cố nào. Bấm nút bên dưới để nhận trợ giúp từ Mentor!
                </p>
              </div>
              <Button variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus size={15} />
                <span>Tạo Yêu Cầu Đầu Tiên</span>
              </Button>
            </div>
          ) : (
            /* Main 2-Column Split View for Candidate */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
              {/* Left Column: Tickets List (5/12) */}
              <div className="lg:col-span-5 rounded-2xl border border-[#334155] bg-[#111827] p-4 flex flex-col space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
                  <span className="text-xs font-semibold text-slate-300">
                    Danh Sách Yêu Cầu ({filteredCandidateTickets.length})
                  </span>
                  <span className="text-[11px] text-slate-500">Đội thi: {myTeam?.name}</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[520px] pr-1">
                  {filteredCandidateTickets.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      Không có ticket nào trong mục này.
                    </div>
                  ) : (
                    filteredCandidateTickets.map((t) => {
                      const isSelected = t.id === activeTicket?.id;
                      const cat = CATEGORY_LABELS[t.category || 'technical'] || CATEGORY_LABELS.technical;
                      const prio = PRIORITY_LABELS[t.priority] || PRIORITY_LABELS.normal;
                      const stat = STATUS_LABELS[t.status] || STATUS_LABELS.open;

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTicketId(t.id)}
                          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#1E293B] border-[#6366F1] shadow-md shadow-[#6366F1]/10'
                              : 'bg-[#0F172A] border-[#1E293B] hover:border-[#334155]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-mono text-[11px] text-[#818CF8] font-bold">
                              {t.ticketCode || t.id}
                            </span>
                            <Badge variant={stat.variant} size="sm">
                              {stat.label}
                            </Badge>
                          </div>

                          <h4 className="text-xs font-semibold text-white line-clamp-1 mb-2">
                            {t.title}
                          </h4>

                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <Badge variant={cat.variant} size="sm">
                                {cat.label}
                              </Badge>
                              <Badge variant={prio.variant} size="sm">
                                {prio.label}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Ticket Detail & Official Response (7/12) */}
              <div className="lg:col-span-7 rounded-2xl border border-[#334155] bg-[#111827] flex flex-col overflow-hidden">
                {activeTicket ? (
                  <>
                    {/* Detail Header */}
                    <div className="p-4 border-b border-[#334155] bg-[#0F172A] space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#818CF8]">
                            {activeTicket.ticketCode || activeTicket.id}
                          </span>
                          <Badge variant={STATUS_LABELS[activeTicket.status]?.variant || 'neutral'} size="sm">
                            {STATUS_LABELS[activeTicket.status]?.label || activeTicket.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(activeTicket.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-white">
                        {activeTicket.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant={CATEGORY_LABELS[activeTicket.category || 'technical']?.variant || 'neutral'}>
                          {CATEGORY_LABELS[activeTicket.category || 'technical']?.label || 'Chung'}
                        </Badge>
                        <Badge variant={PRIORITY_LABELS[activeTicket.priority]?.variant || 'neutral'}>
                          Mức độ: {PRIORITY_LABELS[activeTicket.priority]?.label || activeTicket.priority}
                        </Badge>
                        {activeTicket.assignedMentorName && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <UserCheck size={12} />
                            <span>Phụ trách: {activeTicket.assignedMentorName}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Detail Content & Official Mentor Response */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#080D18]">
                      {/* Issue Description */}
                      <div className="p-4 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-1.5">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Nội dung yêu cầu từ Thí sinh:
                        </span>
                        <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {activeTicket.description || activeTicket.content}
                        </p>
                      </div>

                      {/* Official Mentor Response (Per Step 2 Requirement) */}
                      {activeTicket.response ? (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                              <CheckCircle2 size={16} />
                              <span>Phản Hồi & Hướng Dẫn Chính Thức Từ Cố Vấn:</span>
                            </div>
                            <Badge variant="success" size="sm">ĐÃ GIẢI QUYẾT</Badge>
                          </div>
                          <p className="text-xs text-emerald-100 leading-relaxed whitespace-pre-wrap bg-[#0B1120]/60 p-3 rounded-lg border border-emerald-500/20">
                            {activeTicket.response}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                            <span>Người phản hồi: <strong className="text-white">{activeTicket.assignedMentorName || 'Cố vấn chuyên môn'}</strong></span>
                            <span>{new Date(activeTicket.updatedAt || activeTicket.createdAt).toLocaleTimeString('vi-VN')}</span>
                          </div>
                        </div>
                      ) : activeTicket.status === 'in_progress' ? (
                        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2.5">
                          <Clock size={16} className="text-indigo-400 animate-spin shrink-0" />
                          <span>Cố vấn <strong className="text-white">{activeTicket.assignedMentorName || 'chuyên môn'}</strong> đang xử lý yêu cầu của bạn. Phản hồi sẽ sớm hiển thị tại đây.</span>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                          <Clock size={16} className="text-amber-400 shrink-0" />
                          <span>Yêu cầu đang nằm trong hàng đợi tiếp nhận của Hội đồng Cố vấn.</span>
                        </div>
                      )}

                      {/* Additional Messages / Chat Thread */}
                      {activeTicket.messages && activeTicket.messages.length > 1 && (
                        <div className="space-y-2 pt-2 border-t border-[#1E293B]">
                          <span className="text-xs font-semibold text-slate-400">Lịch sử trao đổi:</span>
                          {activeTicket.messages.map((m) => (
                            <div
                              key={m.id}
                              className={`p-3 rounded-xl text-xs ${
                                m.senderRole === 'mentor'
                                  ? 'bg-[#1E293B] border border-[#334155] text-slate-200'
                                  : 'bg-[#0F172A] border border-[#1E293B] text-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                <span className="font-semibold text-white">{m.senderName} ({m.senderRole === 'mentor' ? 'Cố vấn' : 'Thí sinh'})</span>
                                <span>{new Date(m.sentAt).toLocaleTimeString('vi-VN')}</span>
                              </div>
                              <p className="leading-relaxed">{m.content}</p>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>

                    {/* Chat Input for in_progress tickets */}
                    {activeTicket.status !== 'resolved' && activeTicket.status !== 'closed' && (
                      <form onSubmit={handleSendChatReply} className="p-3 border-t border-[#334155] bg-[#0F172A] flex gap-2">
                        <Input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Nhập tin nhắn trao đổi thêm với Cố vấn..."
                          className="text-xs"
                        />
                        <Button type="submit" variant="primary" disabled={!replyText.trim()} className="gap-1.5 px-4 shrink-0">
                          <Send size={14} />
                          <span>Gửi</span>
                        </Button>
                      </form>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                    <MessageSquare size={36} className="mb-2 opacity-30" />
                    <p className="text-xs">Chọn một yêu cầu bên trái để xem nội dung và phản hồi từ Cố vấn.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MENTOR & ADMIN VIEW */}
      {isMentorOrAdmin && (
        <div className="space-y-4">
          {/* Quick Filters Toolbar (Step 3: Status & Priority Filters) */}
          <div className="p-3 rounded-xl bg-[#111827] border border-[#334155] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            {/* Status Filter */}
            <div className="flex items-center gap-1 overflow-x-auto">
              <span className="text-slate-400 font-medium px-2 flex items-center gap-1 shrink-0">
                <Filter size={12} />
                <span>Trạng thái:</span>
              </span>
              {(
                [
                  { key: 'all', label: 'Tất cả' },
                  { key: 'open', label: 'Chờ nhận (Open)' },
                  { key: 'in_progress', label: 'Đang xử lý' },
                  { key: 'resolved', label: 'Đã giải quyết' },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setMentorStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                    mentorStatusFilter === f.key
                      ? 'bg-[#A855F7] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white bg-[#1E293B]/60'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Priority Filter & Search */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-[#1E293B] px-2.5 py-1 rounded-lg border border-[#334155]">
                <span className="text-slate-400 text-[11px]">Ưu tiên:</span>
                <select
                  value={mentorPriorityFilter}
                  onChange={(e) => setMentorPriorityFilter(e.target.value as any)}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="all">Tất cả mức độ</option>
                  <option value="urgent">🔴 Khẩn cấp (Urgent)</option>
                  <option value="high">🟠 Cao (High)</option>
                  <option value="normal">🔵 Bình thường (Normal)</option>
                  <option value="low">⚪ Thấp (Low)</option>
                </select>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm ticket..."
                  className="pl-8 pr-3 py-1.5 bg-[#1E293B] border border-[#334155] rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#A855F7] w-40 sm:w-48"
                />
              </div>
            </div>
          </div>

          {/* Main 2-Column Split View for Mentor/Admin */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
            {/* Left: Ticket Queue (5/12) */}
            <div className="lg:col-span-5 rounded-2xl border border-[#334155] bg-[#111827] p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
                <span className="text-xs font-semibold text-slate-300">
                  Hàng Đợi Yêu Cầu Hỗ Trợ ({filteredMentorTickets.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  Cập nhật thời gian thực
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[520px] pr-1">
                {filteredMentorTickets.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500">
                    Không có ticket nào khớp với bộ lọc hiện tại.
                  </div>
                ) : (
                  filteredMentorTickets.map((t) => {
                    const isSelected = t.id === activeTicket?.id;
                    const cat = CATEGORY_LABELS[t.category || 'technical'] || CATEGORY_LABELS.technical;
                    const prio = PRIORITY_LABELS[t.priority] || PRIORITY_LABELS.normal;
                    const stat = STATUS_LABELS[t.status] || STATUS_LABELS.open;

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicketId(t.id)}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#1E293B] border-[#A855F7] shadow-md shadow-[#A855F7]/10'
                            : 'bg-[#0F172A] border-[#1E293B] hover:border-[#334155]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-[#C084FC] font-bold">
                              {t.ticketCode || t.id}
                            </span>
                            <span className="text-xs text-slate-400 font-medium truncate max-w-[120px]">
                              • {t.teamName}
                            </span>
                          </div>
                          <Badge variant={stat.variant} size="sm">
                            {stat.label}
                          </Badge>
                        </div>

                        <h4 className="text-xs font-semibold text-white line-clamp-1 mb-2">
                          {t.title}
                        </h4>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Badge variant={cat.variant} size="sm">
                              {cat.label}
                            </Badge>
                            <Badge variant={prio.variant} size="sm">
                              {prio.label}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {new Date(t.createdAt).toLocaleTimeString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Ticket Detail & Action Center (7/12) */}
            <div className="lg:col-span-7 rounded-2xl border border-[#334155] bg-[#111827] flex flex-col overflow-hidden">
              {activeTicket ? (
                <>
                  {/* Detail Header */}
                  <div className="p-4 border-b border-[#334155] bg-[#0F172A] space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#C084FC]">
                          {activeTicket.ticketCode || activeTicket.id}
                        </span>
                        <Badge variant={STATUS_LABELS[activeTicket.status]?.variant || 'neutral'}>
                          {STATUS_LABELS[activeTicket.status]?.label || activeTicket.status}
                        </Badge>
                      </div>

                      {/* Claim Button for Open Tickets */}
                      {activeTicket.status === 'open' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleClaimTicket}
                          className="gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 border-none shadow-md shadow-purple-500/20"
                        >
                          <UserCheck size={14} />
                          <span>Nhận Xử Lý (Claim)</span>
                        </Button>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-white">
                      {activeTicket.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 text-slate-300 bg-[#1E293B] px-2.5 py-1 rounded-lg border border-[#334155]">
                        <Users size={12} className="text-[#818CF8]" />
                        <span>Đội: <strong>{activeTicket.teamName}</strong></span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-300 bg-[#1E293B] px-2.5 py-1 rounded-lg border border-[#334155]">
                        <User size={12} className="text-[#818CF8]" />
                        <span>Người gửi: <strong>{activeTicket.creatorName || activeTicket.senderName || 'Thí sinh'}</strong></span>
                      </span>
                      <Badge variant={CATEGORY_LABELS[activeTicket.category || 'technical']?.variant || 'neutral'}>
                        {CATEGORY_LABELS[activeTicket.category || 'technical']?.label || 'Chung'}
                      </Badge>
                      <Badge variant={PRIORITY_LABELS[activeTicket.priority]?.variant || 'neutral'}>
                        {PRIORITY_LABELS[activeTicket.priority]?.label || activeTicket.priority}
                      </Badge>
                    </div>
                  </div>

                  {/* Body: Issue Description & Mentor Response Editor */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#080D18]">
                    {/* Original Problem Content */}
                    <div className="p-4 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-1.5">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Chi tiết vấn đề Thí sinh phản ánh:
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {activeTicket.description || activeTicket.content}
                      </p>
                    </div>

                    {/* If Already Resolved: Show Official Response */}
                    {activeTicket.status === 'resolved' && (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                          <CheckCircle2 size={16} />
                          <span>Câu Trả Lời / Hướng Dẫn Đã Gửi Cho Thí Sinh:</span>
                        </div>
                        <p className="text-xs text-emerald-100 leading-relaxed whitespace-pre-wrap bg-[#0B1120]/60 p-3 rounded-lg border border-emerald-500/20">
                          {activeTicket.response || 'Đã hỗ trợ hoàn tất.'}
                        </p>
                      </div>
                    )}

                    {/* Step 3: Mentor Resolution Form (Visible if open or in_progress) */}
                    {activeTicket.status !== 'resolved' && activeTicket.status !== 'closed' && (
                      <div className="p-4 rounded-xl bg-[#111827] border border-[#334155] space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                            <MessageSquare size={14} className="text-[#A855F7]" />
                            <span>Khung Hướng Dẫn Giải Quyết (Response):</span>
                          </label>
                          <span className="text-[11px] text-amber-400 font-medium">
                            * Bắt buộc trước khi đánh dấu Đã giải quyết
                          </span>
                        </div>

                        <textarea
                          rows={4}
                          value={mentorResponseText}
                          onChange={(e) => setMentorResponseText(e.target.value)}
                          placeholder="Nhập nội dung hướng dẫn chuyên môn, giải pháp kỹ thuật cụ thể hoặc hướng khắc phục sự cố cho đội thi..."
                          className="w-full p-3 rounded-xl bg-[#0B1120] border border-[#334155] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#A855F7] leading-relaxed"
                        />

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-slate-400">
                            Thí sinh sẽ nhận được phản hồi này ngay lập tức trên trang /tickets.
                          </span>
                          <Button
                            variant="primary"
                            onClick={handleResolveTicket}
                            className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 border-none shadow-lg shadow-emerald-500/25 px-5"
                          >
                            <CheckCircle size={15} />
                            <span>Gửi Phản Hồi & Đánh Dấu Đã Giải Quyết</span>
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Ongoing Messages */}
                    {activeTicket.messages && activeTicket.messages.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-[#1E293B]">
                        <span className="text-xs font-semibold text-slate-400">Lịch sử trao đổi trong ticket:</span>
                        {activeTicket.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`p-3 rounded-xl text-xs ${
                              m.senderRole === 'mentor'
                                ? 'bg-[#1E293B] border border-[#334155] text-slate-200'
                                : 'bg-[#0F172A] border border-[#1E293B] text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                              <span className="font-semibold text-white">{m.senderName} ({m.senderRole === 'mentor' ? 'Cố vấn' : 'Thí sinh'})</span>
                              <span>{new Date(m.sentAt).toLocaleTimeString('vi-VN')}</span>
                            </div>
                            <p className="leading-relaxed">{m.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <MessageSquare size={36} className="mb-2 opacity-30" />
                  <p className="text-xs">Chọn một ticket từ danh sách bên trái để xem chi tiết và phản hồi hướng dẫn.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Thí sinh Gửi Yêu Cầu Hỗ Trợ Mới (Step 2) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Gửi Yêu Cầu Hỗ Trợ Kỹ Thuật Mới"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 font-['Roboto']">
          <p className="text-xs text-slate-400">
            Điền đầy đủ thông tin vướng mắc của đội thi để Hội đồng Cố vấn tiếp nhận và hỗ trợ nhanh chóng nhất.
          </p>

          {/* Title Field (>= 5 chars) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Tiêu đề yêu cầu <strong className="text-rose-400">*</strong></span>
              <span className="text-[10px] text-slate-500">Tối thiểu 5 ký tự</span>
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value);
                if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder="VD: Không thể đẩy commit SHA lên hệ thống CI/CD"
              className={`w-full px-3 py-2 text-xs rounded-xl bg-[#0F172A] border ${
                formErrors.title ? 'border-rose-500' : 'border-[#334155]'
              } text-white placeholder:text-slate-500 focus:outline-none focus:border-[#6366F1]`}
            />
            {formErrors.title && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-0.5">
                <AlertTriangle size={12} />
                <span>{formErrors.title}</span>
              </p>
            )}
          </div>

          {/* Category & Priority Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Danh mục vấn đề <strong className="text-rose-400">*</strong>
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as TicketCategory)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[#0F172A] border border-[#334155] text-white focus:outline-none focus:border-[#6366F1] cursor-pointer"
              >
                <option value="technical">Kỹ thuật (Lỗi hệ thống / CI/CD)</option>
                <option value="topic_clarification">Đề tài (Giải đáp yêu cầu)</option>
                <option value="submission_issue">Nộp bài (Sự cố nộp bài)</option>
                <option value="account_team">Đội thi (Tài khoản & Ghép đội)</option>
                <option value="other">Khác (Vấn đề phát sinh khác)</option>
              </select>
            </div>

            {/* Priority Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Mức độ ưu tiên <strong className="text-rose-400">*</strong>
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[#0F172A] border border-[#334155] text-white focus:outline-none focus:border-[#6366F1] cursor-pointer"
              >
                <option value="urgent">🔴 Urgent (Khẩn cấp - Sự cố sát giờ nộp)</option>
                <option value="high">🟠 High (Cao - Chặn tiến độ làm bài)</option>
                <option value="normal">🔵 Normal (Bình thường - Cần giải đáp)</option>
                <option value="low">⚪ Low (Thấp - Tham khảo thêm)</option>
              </select>
            </div>
          </div>

          {/* Description/Content Field (>= 10 chars) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Mô tả chi tiết vướng mắc <strong className="text-rose-400">*</strong></span>
              <span className="text-[10px] text-slate-500">Tối thiểu 10 ký tự</span>
            </label>
            <textarea
              rows={5}
              value={newContent}
              onChange={(e) => {
                setNewContent(e.target.value);
                if (formErrors.content) setFormErrors((prev) => ({ ...prev, content: '' }));
              }}
              placeholder="Mô tả cụ thể thông báo lỗi, các bước tái hiện, liên kết log hoặc câu hỏi chuyên môn cần Cố vấn hỗ trợ..."
              className={`w-full p-3 text-xs rounded-xl bg-[#0F172A] border ${
                formErrors.content ? 'border-rose-500' : 'border-[#334155]'
              } text-white placeholder:text-slate-500 focus:outline-none focus:border-[#6366F1] leading-relaxed`}
            />
            {formErrors.content && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-0.5">
                <AlertTriangle size={12} />
                <span>{formErrors.content}</span>
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]">
            <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>
              Hủy Bỏ
            </Button>
            <Button variant="primary" type="submit" className="gap-2 px-5">
              <Send size={15} />
              <span>Gửi Yêu Cầu Hỗ Trợ</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SupportTickets;

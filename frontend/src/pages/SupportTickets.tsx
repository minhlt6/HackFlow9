import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMockStore } from '../store/useMockStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  ticketService,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '../services/ticketService';
import type { SupportTicket } from '../types';
import { Button } from '../components/Button';
import { Badge, type BadgeVariant } from '../components/Badge';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/patterns/ConfirmDialog';
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
  RotateCcw,
  ArrowUpRight,
  RefreshCw,
  X,
} from 'lucide-react';

const CATEGORY_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  technical: { label: 'Lỗi Kỹ thuật / CI/CD', variant: 'purple' },
  topic_clarification: { label: 'Giải đáp Đề tài', variant: 'cyan' },
  submission_issue: { label: 'Vấn đề Nộp bài', variant: 'warning' },
  account_team: { label: 'Tài khoản và Đội thi', variant: 'indigo' },
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

// Số giờ đã trôi qua kể từ thời điểm cho trước (dùng cho kiểm tra hạn mở lại 48h - SRS HF-37 Mục 3.7)
const getHoursSince = (isoTime: string): number =>
  (Date.now() - new Date(isoTime).getTime()) / (1000 * 60 * 60);

export const SupportTickets: React.FC = () => {
  const { user } = useAuthStore();
  const {
    currentUser,
    teams,
    tickets: mockTickets,
  } = useMockStore();

  const isCandidate = user?.role === 'candidate';
  const isMentor = user?.role === 'mentor';
  const isAdmin = user?.role === 'admin';
  const isMentorOrAdmin = isMentor || isAdmin;
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketIdParam = searchParams.get('ticketId');
  const tabParam = searchParams.get('tab');
  const effectiveMentorId = user?.id || currentUser.id;
  const effectiveMentorName = user?.fullName || currentUser.fullName;

  // Local state for API Tickets & Refreshing
  const [apiTickets, setApiTickets] = useState<SupportTicket[] | null>(null);
  const [isFetchingApi, setIsFetchingApi] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showAlert = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  /**
   * Helper xử lý mã lỗi HTTP từ Backend theo SRS HF-37 Mục 5.7
   * Trả về true nếu là lỗi HTTP từ server (đã handle & dừng thao tác), false nếu là lỗi mất mạng/offline để fallback mock
   */
  const handleApiError = useCallback((err: unknown, defaultMessage: string): boolean => {
    const axiosErr = err as {
      response?: {
        status?: number;
        data?: {
          error_code?: string;
          message?: string;
        };
      };
    };

    if (axiosErr?.response && typeof axiosErr.response.status === 'number') {
      const status = axiosErr.response.status;
      const errorCode = axiosErr.response.data?.error_code || '';
      const serverMessage = axiosErr.response.data?.message;

      if (status === 409 && errorCode === 'TICKET_ALREADY_ASSIGNED') {
        showAlert('Lỗi [409 TICKET_ALREADY_ASSIGNED]: Ticket này đã được Mentor khác tiếp nhận xử lý!', 'error');
      } else if (status === 409 && errorCode === 'REOPEN_WINDOW_EXPIRED') {
        showAlert('Lỗi [409 REOPEN_WINDOW_EXPIRED]: Đã quá thời hạn 48 giờ để mở lại ticket. Vui lòng tạo ticket mới!', 'error');
      } else if (status === 403 && errorCode === 'ACCOUNT_NOT_APPROVED') {
        showAlert('Lỗi [403 ACCOUNT_NOT_APPROVED]: Tài khoản Thí sinh chưa được phê duyệt, không thể tạo ticket!', 'error');
      } else if (status === 403 && errorCode === 'FORBIDDEN_ROLE') {
        showAlert('Lỗi [403 FORBIDDEN_ROLE]: Vai trò của bạn không có quyền thực hiện thao tác này!', 'error');
      } else if (status === 422 && errorCode === 'MISSING_TICKET_RESPONSE') {
        showAlert('Lỗi [422 MISSING_TICKET_RESPONSE]: Vui lòng nhập nội dung câu trả lời hướng dẫn trước khi đánh dấu Đã giải quyết!', 'error');
      } else if (status === 400 && errorCode === 'INVALID_TICKET_TRANSITION') {
        showAlert('Lỗi [400 INVALID_TICKET_TRANSITION]: Hành động không hợp lệ với trạng thái hiện tại của ticket!', 'error');
      } else if (status === 404 && errorCode === 'TICKET_NOT_FOUND') {
        showAlert('Lỗi [404 TICKET_NOT_FOUND]: Không tìm thấy ticket trên hệ thống!', 'error');
      } else {
        showAlert(`Lỗi [${status}${errorCode ? ' ' + errorCode : ''}]: ${serverMessage || defaultMessage}`, 'error');
      }
      return true;
    }
    showAlert(defaultMessage + ' Vui lòng kiểm tra kết nối và thử lại.', 'error');
    return true;
  }, [showAlert]);

  // Đồng bộ dữ liệu lấy từ API vào state
  const fetchTicketsFromApi = useCallback(async () => {
    try {
      setIsFetchingApi(true);
      const res = isCandidate
        ? await ticketService.getMyTickets()
        : await ticketService.getAllTickets();

      const rawItems = res?.data?.items || res?.data || (Array.isArray(res) ? res : null);
      if (Array.isArray(rawItems)) {
        const mapped: SupportTicket[] = rawItems.map((item: Record<string, unknown>) => {
          const id = String(item.id || '');
          const teamId = String(item.team_id || item.teamId || '');
          const creatorId = String(item.created_by || item.user_id || item.creatorId || '');
          const assignedTo = item.assigned_to ? String(item.assigned_to) : null;
          const assignedMentorId = assignedTo || (item.assignedMentorId ? String(item.assignedMentorId) : null);

          return {
            id,
            ticketCode: (item.ticket_code as string) || (item.ticketCode as string) || `#TCK-${id.slice(0, 6).toUpperCase()}`,
            teamId,
            teamName:
              (item.teamName as string) ||
              teams.find((t) => t.id === teamId)?.name ||
              'Đội thi',
            creatorId,
            creatorName:
              (item.creatorName as string) ||
              (creatorId === currentUser.id ? currentUser.fullName : 'Thí sinh'),
            title: (item.title as string) || '',
            description: (item.content as string) || (item.description as string) || '',
            content: (item.content as string) || (item.description as string) || '',
            category: (item.category as TicketCategory) || 'technical',
            priority: (item.priority as TicketPriority) || 'normal',
            status: (item.status as TicketStatus) || 'open',
            assignedMentorId: assignedMentorId || undefined,
            assignedMentorName:
              (item.assignedMentorName as string) ||
              (assignedMentorId
                ? assignedMentorId === currentUser.id
                  ? currentUser.fullName
                  : 'Cố vấn chuyên môn'
                : undefined),
            response: (item.response as string) || undefined,
            createdAt: (item.created_at as string) || (item.createdAt as string) || new Date().toISOString(),
            updatedAt: (item.updated_at as string) || (item.updatedAt as string) || new Date().toISOString(),
            resolvedAt: (item.resolved_at as string) || (item.resolvedAt as string) || undefined,
            messages: (item.messages as SupportTicket['messages']) || [],
            replies: (item.replies as SupportTicket['replies']) || [],
          };
        });
        setApiTickets(mapped);
        useMockStore.setState({ tickets: mapped });
      }
    } catch {
      // Local dev / network offline fallback
    } finally {
      setIsFetchingApi(false);
    }
  }, [isCandidate, currentUser.id, currentUser.fullName, teams]);

  useEffect(() => {
    // Defer to a microtask so setState inside fetchTicketsFromApi is not called synchronously in the effect body
    void Promise.resolve().then(fetchTicketsFromApi);
  }, [fetchTicketsFromApi]);

  // Tập dữ liệu vé hỗ trợ hiện hành (kết hợp API và fallback Store)
  const currentTickets = useMemo(() => {
    return apiTickets !== null ? apiTickets : mockTickets;
  }, [apiTickets, mockTickets]);

  // ==========================================
  // CANDIDATE DATA & FILTERING
  // ==========================================
  const myTeam = currentUser.teamId ? teams.find((t) => t.id === currentUser.teamId) : undefined;
  const candidateTickets = useMemo(() => {
    if (isCandidate && apiTickets !== null) {
      return apiTickets;
    }
    return currentTickets.filter(
      (t) =>
        (Boolean(myTeam?.id) && t.teamId === myTeam?.id) ||
        (Boolean(currentUser.id) && t.creatorId === currentUser.id),
    );
  }, [isCandidate, apiTickets, currentTickets, myTeam?.id, currentUser.id]);

  const [candidateFilter, setCandidateFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const filteredCandidateTickets = useMemo(() => {
    if (candidateFilter === 'all') return candidateTickets;
    return candidateTickets.filter((t) => t.status === candidateFilter);
  }, [candidateTickets, candidateFilter]);

  // ==========================================
  // MENTOR & ADMIN DATA & ISOLATION (SRS HF-37 Mục 4.2)
  // Mentor chỉ thấy: (status = open && assigned_to = null) HOẶC (assigned_to = current_user.id)
  // Admin thấy toàn bộ ticket trong hệ thống
  // ==========================================
  const isTicketAssignedToCurrentMentor = useCallback(
    (t: SupportTicket) =>
      Boolean(
        (effectiveMentorId && t.assignedMentorId === effectiveMentorId) ||
          (currentUser.id && t.assignedMentorId === currentUser.id) ||
          (isMentor && Boolean(t.assignedMentorId)),
      ),
    [effectiveMentorId, currentUser.id, isMentor],
  );

  const mentorAllowedTickets = useMemo(() => {
    if (isAdmin) return currentTickets;
    return currentTickets.filter(
      (t) => (!t.assignedMentorId && t.status === 'open') || isTicketAssignedToCurrentMentor(t),
    );
  }, [currentTickets, isAdmin, isTicketAssignedToCurrentMentor]);

  const [mentorScopeTab, setMentorScopeTab] = useState<'unassigned' | 'my_assigned' | 'all'>(() => {
    if (tabParam === 'my_assigned' || tabParam === 'unassigned') return tabParam;
    if (tabParam === 'all' && isAdmin) return 'all';
    if (ticketIdParam) {
      const initialTarget = mockTickets.find((t) => t.id === ticketIdParam || t.ticketCode === ticketIdParam);
      if (initialTarget && (initialTarget.assignedMentorId || initialTarget.status !== 'open')) {
        return isAdmin ? 'all' : 'my_assigned';
      }
    }
    return isMentor ? 'unassigned' : 'all';
  });

  const [mentorStatusFilter, setMentorStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [mentorPriorityFilter, setMentorPriorityFilter] = useState<'all' | 'urgent' | 'high' | 'normal' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const unassignedCount = useMemo(() => {
    return currentTickets.filter((t) => !t.assignedMentorId && t.status === 'open').length;
  }, [currentTickets]);

  const myAssignedCount = useMemo(() => {
    return currentTickets.filter((t) => isTicketAssignedToCurrentMentor(t)).length;
  }, [currentTickets, isTicketAssignedToCurrentMentor]);

  const allSystemCount = useMemo(() => {
    return mentorAllowedTickets.length;
  }, [mentorAllowedTickets]);

  const filteredMentorTickets = useMemo(() => {
    return mentorAllowedTickets.filter((t) => {
      if (mentorScopeTab === 'unassigned') {
        if (t.assignedMentorId || t.status !== 'open') return false;
      } else if (mentorScopeTab === 'my_assigned') {
        if (!isTicketAssignedToCurrentMentor(t)) return false;
      }

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
  }, [mentorAllowedTickets, mentorScopeTab, mentorStatusFilter, mentorPriorityFilter, searchQuery, isTicketAssignedToCurrentMentor]);

  const activeList = isCandidate ? filteredCandidateTickets : filteredMentorTickets;
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(() => ticketIdParam || null);

  useEffect(() => {
    if (tabParam === 'my_assigned' || tabParam === 'unassigned') {
      setMentorScopeTab(tabParam);
    } else if (tabParam === 'all' && isAdmin) {
      setMentorScopeTab('all');
    }
  }, [tabParam, isAdmin]);

  useEffect(() => {
    if (!ticketIdParam) return;
    const matched = currentTickets.find((t) => t.id === ticketIdParam || t.ticketCode === ticketIdParam);
    if (matched) {
      setSelectedTicketId(matched.id);
      if (isMentor) {
        if (isTicketAssignedToCurrentMentor(matched) || matched.status !== 'open') {
          setMentorScopeTab('my_assigned');
        } else if (tabParam !== 'my_assigned') {
          setMentorScopeTab('unassigned');
        }
      }
      setMentorStatusFilter((prev) => (prev !== 'all' && prev !== matched.status ? 'all' : prev));
    } else {
      setSelectedTicketId(ticketIdParam);
    }
  }, [ticketIdParam, tabParam, currentTickets, isMentor, isTicketAssignedToCurrentMentor]);

  const handleSelectMentorTab = (tab: 'unassigned' | 'my_assigned' | 'all') => {
    setMentorScopeTab(tab);
    setSelectedTicketId(null);
    if (searchParams.has('ticketId') || searchParams.has('tab')) {
      setSearchParams({}, { replace: true });
    }
  };

  const handleSelectTicket = (id: string) => {
    setSelectedTicketId(id);
    if (searchParams.has('ticketId')) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('ticketId', id);
          return next;
        },
        { replace: true },
      );
    }
  };

  const effectiveTicketId =
    (selectedTicketId && activeList.some((t) => t.id === selectedTicketId) ? selectedTicketId : null) ||
    (selectedTicketId && isMentorOrAdmin && mentorAllowedTickets.some((t) => t.id === selectedTicketId)
      ? selectedTicketId
      : null) ||
    activeList[0]?.id ||
    null;

  const activeTicket = currentTickets.find((t) => t.id === effectiveTicketId);

  // ==========================================
  // CREATE TICKET MODAL STATE (CANDIDATE)
  // ==========================================
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [closeTicketTargetId, setCloseTicketTargetId] = useState<string | null>(null);
  const [isEscalateConfirmOpen, setIsEscalateConfirmOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TicketCategory>('technical');
  const [newPriority, setNewPriority] = useState<TicketPriority>('normal');
  const [newContent, setNewContent] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Mentor Response State
  const [mentorResponseText, setMentorResponseText] = useState('');
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Cuộn tin nhắn mượt mà
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicket?.messages?.length, activeTicket?.replies?.length]);

  // Validate form tạo ticket: Tiêu đề 5–128 ký tự, Nội dung >= 10 ký tự
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
      const res = await ticketService.createTicket({
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        priority: newPriority,
      });

      const serverTicket = res?.data || res;
      await fetchTicketsFromApi();

      if (serverTicket?.id) {
        setSelectedTicketId(String(serverTicket.id));
      }
      setIsCreateOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewCategory('technical');
      setNewPriority('normal');
      setFormErrors({});
      showAlert(`Tạo ticket hỗ trợ thành công! Cố vấn sẽ sớm phản hồi.`);
    } catch (err: unknown) {
      handleApiError(err, 'Tạo ticket thất bại');
    }
  };

  // Mentor Claim Ticket (action: 'accept')
  const handleClaimTicket = async () => {
    if (!activeTicket) return;
    const claimedId = activeTicket.id;
    const claimedCode = activeTicket.ticketCode || activeTicket.id;
    try {
      await ticketService.updateTicket(claimedId, { action: 'accept' });
      setSelectedTicketId(claimedId);
      if (isMentor) {
        setMentorScopeTab('my_assigned');
        setSearchParams({ ticketId: claimedId, tab: 'my_assigned' }, { replace: true });
      }
      if (mentorStatusFilter !== 'all' && mentorStatusFilter !== 'in_progress') {
        setMentorStatusFilter('all');
      }
      setApiTickets((prev) =>
        prev
          ? prev.map((t) =>
              t.id === claimedId
                ? {
                    ...t,
                    status: 'in_progress',
                    assignedMentorId: effectiveMentorId,
                    assignedMentorName: effectiveMentorName,
                  }
                : t,
            )
          : prev,
      );
      await fetchTicketsFromApi();
      setSelectedTicketId(claimedId);
      showAlert(`Bạn đã tiếp nhận xử lý Ticket #${claimedCode}!`);
    } catch (err: unknown) {
      handleApiError(err, 'Không thể tiếp nhận ticket');
    }
  };

  // Mentor Resolve Ticket (action: 'resolve', validate 422 MISSING_TICKET_RESPONSE)
  const handleResolveTicket = async () => {
    if (!activeTicket) return;
    const finalResponse = mentorResponseText.trim();

    if (!finalResponse) {
      showAlert(
        'Lỗi [422 MISSING_TICKET_RESPONSE]: Vui lòng nhập nội dung câu trả lời hướng dẫn trước khi đánh dấu Đã giải quyết!',
        'error',
      );
      return;
    }

    try {
      await ticketService.updateTicket(activeTicket.id, {
        action: 'resolve',
        response: finalResponse,
      });
      setMentorResponseText('');
      await fetchTicketsFromApi();
      showAlert(`Đã gửi phản hồi và chuyển trạng thái Ticket #${activeTicket.ticketCode || activeTicket.id} sang "Đã giải quyết"!`);
    } catch (err: unknown) {
      handleApiError(err, 'Không thể giải quyết ticket');
    }
  };

  // Chat Reply (SRS HF-37 Mục 3.4: action: 'update_response')
  const handleSendChatReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;
    const trimmed = replyText.trim();

    try {
      await ticketService.updateTicket(activeTicket.id, {
        action: 'update_response',
        response: trimmed,
      });
      setReplyText('');
      await fetchTicketsFromApi();
      showAlert('Đã gửi phản hồi trao đổi trong ticket thành công!');
    } catch (err: unknown) {
      handleApiError(err, 'Không thể gửi tin nhắn trao đổi');
    }
  };

  // Candidate Confirm & Close Ticket (action: 'close')
  const handleCloseTicket = (ticketId: string) => {
    setCloseTicketTargetId(ticketId);
  };

  const executeCloseTicket = async () => {
    if (!closeTicketTargetId) return;
    const ticketId = closeTicketTargetId;
    setCloseTicketTargetId(null);
    try {
      await ticketService.updateTicket(ticketId, { action: 'close' });
      await fetchTicketsFromApi();
      showAlert('Đã xác nhận và đóng ticket thành công! Cảm ơn bạn.');
    } catch (err: unknown) {
      handleApiError(err, 'Không thể đóng ticket');
    }
  };

  // Candidate Reopen Ticket within 48h (action: 'reopen')
  const handleReopenTicket = async (ticketId: string) => {
    if (!activeTicket) return;

    // Validate 48h window nếu là Thí sinh theo SRS HF-37 Mục 3.7 & 5.7
    if (isCandidate) {
      const hoursPassed = getHoursSince(
        activeTicket.resolvedAt || activeTicket.updatedAt || activeTicket.createdAt,
      );

      if (hoursPassed > 48) {
        showAlert(
          'Lỗi [409 REOPEN_WINDOW_EXPIRED]: Đã quá thời hạn 48 giờ để mở lại ticket. Vui lòng tạo ticket mới!',
          'error',
        );
        return;
      }
    }

    try {
      await ticketService.updateTicket(ticketId, { action: 'reopen' });
      await fetchTicketsFromApi();
      showAlert('Đã mở lại ticket thành công! Trạng thái chuyển về "Đang xử lý".');
    } catch (err: unknown) {
      handleApiError(err, 'Không thể mở lại ticket');
    }
  };

  // Mentor Escalate to Admin Queue (action: 'escalate' per SRS HF-37 Mục 3.8)
  const handleEscalateTicket = () => {
    if (!activeTicket) return;
    setIsEscalateConfirmOpen(true);
  };

  const executeEscalateTicket = async () => {
    if (!activeTicket) return;
    setIsEscalateConfirmOpen(false);
    try {
      await ticketService.updateTicket(activeTicket.id, {
        action: 'escalate',
        note: 'Vấn đề vượt thẩm quyền xử lý chuyên môn của Cố vấn, chuyển giao lên Ban Tổ Chức (Admin).',
      });
      showAlert(`Đã chuyển giao Ticket #${activeTicket.ticketCode || activeTicket.id} lên hàng chờ Ban Tổ Chức (Admin)!`);
      await fetchTicketsFromApi();
      return;
    } catch (err: unknown) {
      const handled = handleApiError(err, 'Không thể chuyển giao ticket');
      if (handled) return;
    }

    showAlert(`Đã chuyển giao Ticket #${activeTicket.ticketCode || activeTicket.id} lên hàng chờ Ban Tổ Chức (Admin)!`);
  };

  // Quyền thao tác Resolve và Claim của Mentor
  const isAssignedToCurrentMentor = Boolean(
    (activeTicket && isTicketAssignedToCurrentMentor(activeTicket)) || isAdmin,
  );
  const isAssignedToOtherMentor = Boolean(
    activeTicket?.assignedMentorId &&
    !isTicketAssignedToCurrentMentor(activeTicket) &&
    !isAdmin,
  );
  const isUnassignedOpen = Boolean(activeTicket?.status === 'open' && !activeTicket?.assignedMentorId);

  return (
    <div className="space-y-6 ">
      {/* Toast Alert */}
      {alert && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-lg transition-all ${
            alert.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/50 text-rose-700 dark:text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-700 dark:text-emerald-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'error' ? (
              <AlertTriangle size={16} className="text-rose-700 dark:text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
            )}
            <span className="font-medium">{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-muted-foreground hover:text-foreground text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1
              className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide inline-block"
              >
              {isCandidate ? 'Hỗ Trợ Kỹ Thuật Trực Tuyến' : 'Tiếp Nhận và Xử Lý Yêu Cầu Hỗ Trợ'}
            </h1>
            <Badge variant={isCandidate ? 'primary' : 'purple'} size="sm">
              {isCandidate ? 'GÓC NHÌN THÍ SINH' : 'GÓC NHÌN MENTOR / ADMIN'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isCandidate
              ? 'Gửi yêu cầu hỗ trợ kỹ thuật, thắc mắc đề tài hoặc sự cố nộp bài tới Hội đồng Cố vấn chuyên môn.'
              : 'Quy trình chuẩn hóa: Tiếp nhận yêu cầu (Open) → Hướng dẫn giải quyết (In Progress) → Hoàn tất (Resolved).'}
          </p>
        </div>

        {/* Action Button: Candidate Create Ticket & Refresh */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTicketsFromApi()}
            disabled={isFetchingApi}
            className="gap-1.5 text-xs text-muted-foreground border-border hover:bg-accent"
            title="Đồng bộ danh sách từ máy chủ"
          >
            <RefreshCw size={13} className={isFetchingApi ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Làm mới</span>
          </Button>

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
      </div>

      {/* ========================================================== */}
      {/* CANDIDATE VIEW                                             */}
      {/* ========================================================== */}
      {isCandidate && (
        <div className="space-y-4">
          {/* Status Filter Tabs */}
          <div className="flex items-center bg-card p-1 rounded-xl border border-border text-xs w-fit">
            <span className="px-2 text-muted-foreground hidden sm:flex items-center gap-1">
              <Filter size={12} />
              <span>Trạng thái:</span>
            </span>
            {(
              [
                { key: 'all', label: 'Tất cả' },
                { key: 'open', label: 'Chờ tiếp nhận' },
                { key: 'in_progress', label: 'Đang xử lý' },
                { key: 'resolved', label: 'Đã giải quyết' },
                { key: 'closed', label: 'Đã đóng' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCandidateFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  candidateFilter === tab.key
                    ? 'bg-[#6366F1] text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Main 2-Column Split View for Candidate */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[560px]">
            {/* Left Column: Ticket List (5/12) */}
            <div className="lg:col-span-5 rounded-2xl border border-border bg-[#111827] p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground">
                  Danh sách yêu cầu ({filteredCandidateTickets.length})
                </span>
                <span className="text-[11px] text-muted-foreground">Đội: {myTeam?.name}</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px] pr-1">
                {filteredCandidateTickets.length === 0 ? (
                  <div className="text-center py-12 text-xs text-muted-foreground">
                    <Inbox size={32} className="mx-auto text-slate-600 mb-2 opacity-50" />
                    Chưa có ticket nào trong danh mục này.
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
                        onClick={() => handleSelectTicket(t.id)}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-card border-[#6366F1] shadow-md shadow-[#6366F1]/10'
                            : 'bg-muted/40 dark:bg-slate-900/60 border-border hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono text-[11px] font-bold text-primary">
                            {t.ticketCode || t.id}
                          </span>
                          <Badge variant={stat.variant} size="sm">
                            {stat.label}
                          </Badge>
                        </div>

                        <h4 className="text-xs font-semibold text-foreground line-clamp-1 mb-1.5">
                          {t.title}
                        </h4>

                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Badge variant={cat.variant} size="sm">
                              {cat.label}
                            </Badge>
                            <Badge variant={prio.variant} size="sm">
                              {prio.label}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(t.createdAt).toLocaleTimeString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Ticket Detail & Official Response (7/12) */}
            <div className="lg:col-span-7 rounded-2xl border border-border bg-[#111827] flex flex-col overflow-hidden">
              {activeTicket ? (
                <>
                  {/* Detail Header */}
                  <div className="p-4 border-b border-border bg-muted/40 dark:bg-slate-900/60 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {activeTicket.ticketCode || activeTicket.id}
                        </span>
                        <Badge variant={STATUS_LABELS[activeTicket.status]?.variant || 'neutral'} size="sm">
                          {STATUS_LABELS[activeTicket.status]?.label || activeTicket.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activeTicket.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-foreground">
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
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <UserCheck size={12} />
                          <span>Phụ trách: {activeTicket.assignedMentorName}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Detail Content & Official Mentor Response */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/40 dark:bg-slate-900/60">
                    {/* Issue Description */}
                    <div className="p-4 rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border space-y-1.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Nội dung yêu cầu từ Thí sinh:
                      </span>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {activeTicket.description || activeTicket.content}
                      </p>
                    </div>

                    {/* Official Mentor Response (Per Step 2 Requirement) */}
                    {activeTicket.response ? (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                            <CheckCircle2 size={16} />
                            <span>Phản Hồi và Hướng Dẫn Chính Thức Từ Cố Vấn:</span>
                          </div>
                          <Badge variant="success" size="sm">ĐÃ GIẢI QUYẾT</Badge>
                        </div>
                        <p className="text-xs text-emerald-100 leading-relaxed whitespace-pre-wrap bg-muted/40 dark:bg-slate-900/60 p-3 rounded-lg border border-emerald-500/20">
                          {activeTicket.response}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                          <span>Người phản hồi: <strong className="text-foreground">{activeTicket.assignedMentorName || 'Cố vấn chuyên môn'}</strong></span>
                          <span>{new Date(activeTicket.updatedAt || activeTicket.createdAt).toLocaleTimeString('vi-VN')}</span>
                        </div>
                      </div>
                    ) : activeTicket.status === 'in_progress' ? (
                      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-primary text-xs flex items-center gap-2.5">
                        <Clock size={16} className="text-primary animate-spin shrink-0" />
                        <span>Cố vấn <strong className="text-foreground">{activeTicket.assignedMentorName || 'chuyên môn'}</strong> đang xử lý yêu cầu của bạn. Phản hồi sẽ sớm hiển thị tại đây.</span>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                        <Clock size={16} className="text-amber-700 dark:text-amber-400 shrink-0" />
                        <span>Yêu cầu đang nằm trong hàng đợi tiếp nhận của Hội đồng Cố vấn.</span>
                      </div>
                    )}

                    {/* Candidate Action Buttons: Close & Reopen (SRS HF-37 Mục 3.6 & 3.7) */}
                    {activeTicket.status === 'resolved' && (
                      <div className="p-4 rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border space-y-2.5">
                        <div className="text-xs text-muted-foreground">
                          Vấn đề đã được hướng dẫn xử lý. Bạn có thể xác nhận đóng ticket hoặc mở lại trong vòng 48 giờ nếu cần hỗ trợ thêm:
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleCloseTicket(activeTicket.id)}
                            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 border-none shadow-md shadow-emerald-600/20"
                          >
                            <CheckCircle2 size={13} />
                            <span>Xác Nhận & Đóng Ticket</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReopenTicket(activeTicket.id)}
                            className="gap-1.5 text-xs text-amber-700 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
                            title="Chỉ áp dụng trong vòng 48 giờ kể từ khi giải quyết"
                          >
                            <RotateCcw size={13} />
                            <span>Mở Lại Ticket (Trong 48h)</span>
                          </Button>
                        </div>
                      </div>
                    )}

                    {activeTicket.status === 'closed' && (
                      <div className="p-3 rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border text-xs text-muted-foreground flex items-center justify-between">
                        <span>Ticket này đã được đóng hoàn tất.</span>
                        {isAdmin && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleReopenTicket(activeTicket.id)}
                            className="gap-1 text-xs"
                          >
                            <RotateCcw size={12} />
                            <span>Admin Mở lại</span>
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Additional Messages / Chat Thread */}
                    {activeTicket.messages && activeTicket.messages.length > 1 && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        <span className="text-xs font-semibold text-muted-foreground">Lịch sử trao đổi:</span>
                        {activeTicket.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`p-3 rounded-xl text-xs ${
                              m.senderRole === 'mentor'
                                ? 'bg-card border border-border text-foreground'
                                : 'bg-muted/40 dark:bg-slate-900/60 border border-border text-muted-foreground'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                              <span className="font-semibold text-foreground">
                                {m.senderName} ({m.senderRole === 'mentor' ? 'Cố vấn' : 'Thí sinh'})
                              </span>
                              <span>{new Date(m.sentAt).toLocaleTimeString('vi-VN')}</span>
                            </div>
                            <p className="leading-relaxed">{m.content}</p>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Candidate Chat Reply Footer */}
                  {activeTicket.status !== 'resolved' && activeTicket.status !== 'closed' && (
                    <form onSubmit={handleSendChatReply} className="p-3 bg-muted/40 dark:bg-slate-900/60 border-t border-border flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Gửi tin nhắn phản hồi thêm cho Cố vấn..."
                        className="flex-1 px-3 py-2 text-xs rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground placeholder:text-slate-500 focus:outline-none focus:border-[#6366F1]"
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={!replyText.trim()}
                        className="gap-1 px-4 text-xs"
                      >
                        <Send size={13} />
                        <span>Gửi</span>
                      </Button>
                    </form>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-xs">
                  <Inbox size={48} className="text-slate-600 mb-3 opacity-40" />
                  <p className="font-medium text-muted-foreground">Chưa chọn ticket nào để xem chi tiết</p>
                  <p className="text-[11px] text-slate-600 mt-1 max-w-sm">
                    Chọn một yêu cầu hỗ trợ từ danh sách bên trái hoặc bấm &quot;Gửi Yêu Cầu Hỗ Trợ Mới&quot; để kết nối với Cố vấn.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MENTOR & ADMIN VIEW (SRS HF-37 Mục 4.2)                     */}
      {/* ========================================================== */}
      {isMentorOrAdmin && (
        <div className="space-y-4">
          {/* Top Mentor Scope Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#111827] border border-border">
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                onClick={() => handleSelectMentorTab('unassigned')}
                className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-2 transition-all ${
                  mentorScopeTab === 'unassigned'
                    ? 'bg-[#A855F7] text-foreground shadow-md shadow-[#A855F7]/25'
                    : 'text-muted-foreground hover:text-foreground bg-card'
                }`}
              >
                <span>Chờ tiếp nhận (Open)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                  {unassignedCount}
                </span>
              </button>

              <button
                onClick={() => handleSelectMentorTab('my_assigned')}
                className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-2 transition-all ${
                  mentorScopeTab === 'my_assigned'
                    ? 'bg-[#A855F7] text-foreground shadow-md shadow-[#A855F7]/25'
                    : 'text-muted-foreground hover:text-foreground bg-card'
                }`}
              >
                <span>Tôi đang phụ trách</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                  {myAssignedCount}
                </span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => handleSelectMentorTab('all')}
                  className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-2 transition-all ${
                    mentorScopeTab === 'all'
                      ? 'bg-[#A855F7] text-foreground shadow-md shadow-[#A855F7]/25'
                      : 'text-muted-foreground hover:text-foreground bg-card'
                  }`}
                >
                  <span>Toàn bộ hệ thống</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                    {allSystemCount}
                  </span>
                </button>
              )}
            </div>

            {/* Quick Filters: Status, Priority & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-card px-2.5 py-1 rounded-lg border border-border">
                <span className="text-muted-foreground text-[11px]">Trạng thái:</span>
                <select
                  value={mentorStatusFilter}
                  onChange={(e) => setMentorStatusFilter(e.target.value as typeof mentorStatusFilter)}
                  className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="all">Tất cả</option>
                  <option value="open">Chờ nhận</option>
                  <option value="in_progress">Đang xử lý</option>
                  <option value="resolved">Đã giải quyết</option>
                  <option value="closed">Đã đóng</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-card px-2.5 py-1 rounded-lg border border-border">
                <span className="text-muted-foreground text-[11px]">Ưu tiên:</span>
                <select
                  value={mentorPriorityFilter}
                  onChange={(e) => setMentorPriorityFilter(e.target.value as typeof mentorPriorityFilter)}
                  className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="all">Tất cả mức độ</option>
                  <option value="urgent">🔴 Khẩn cấp (Urgent)</option>
                  <option value="high">🟠 Cao (High)</option>
                  <option value="normal">🔵 Bình thường (Normal)</option>
                  <option value="low">⚪ Thấp (Low)</option>
                </select>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm ticket..."
                  className="pl-8 pr-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-slate-500 focus:outline-none focus:border-[#A855F7] w-36 sm:w-44"
                />
              </div>
            </div>
          </div>

          {/* Main 2-Column Split View for Mentor/Admin */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
            {/* Left: Ticket Queue (5/12) */}
            <div className="lg:col-span-5 rounded-2xl border border-border bg-[#111827] p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground">
                  Hàng Đợi Yêu Cầu Hỗ Trợ ({filteredMentorTickets.length})
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {isMentor ? 'Dữ liệu phân quyền Mentor' : 'Quyền Quản trị viên'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[520px] pr-1">
                {filteredMentorTickets.length === 0 ? (
                  <div className="text-center py-12 text-xs text-muted-foreground">
                    <Inbox size={32} className="mx-auto text-slate-600 mb-2 opacity-50" />
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
                        onClick={() => handleSelectTicket(t.id)}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-card border-[#A855F7] shadow-md shadow-[#A855F7]/10'
                            : 'bg-muted/40 dark:bg-slate-900/60 border-border hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono text-[11px] font-bold text-[#C084FC]">
                            {t.ticketCode || t.id}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={stat.variant} size="sm">
                              {stat.label}
                            </Badge>
                            <Badge variant={prio.variant} size="sm">
                              {prio.label}
                            </Badge>
                          </div>
                        </div>

                        <h4 className="text-xs font-semibold text-foreground line-clamp-1 mb-1">
                          {t.title}
                        </h4>

                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-primary font-medium truncate">{t.teamName}</span>
                            <span>•</span>
                            <Badge variant={cat.variant} size="sm">
                              {cat.label}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
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
            <div className="lg:col-span-7 rounded-2xl border border-border bg-[#111827] flex flex-col overflow-hidden">
              {activeTicket ? (
                <>
                  {/* Detail Header */}
                  <div className="p-4 border-b border-border bg-muted/40 dark:bg-slate-900/60 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#C084FC]">
                          {activeTicket.ticketCode || activeTicket.id}
                        </span>
                        <Badge variant={STATUS_LABELS[activeTicket.status]?.variant || 'neutral'}>
                          {STATUS_LABELS[activeTicket.status]?.label || activeTicket.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Escalate button per SRS HF-37 Mục 3.8 */}
                        {isAssignedToCurrentMentor && activeTicket.status === 'in_progress' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleEscalateTicket}
                            className="gap-1 text-xs text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                            title="Chuyển giao lên hàng chờ Ban Tổ Chức (Admin)"
                          >
                            <ArrowUpRight size={13} />
                            <span>Chuyển Admin</span>
                          </Button>
                        )}

                        {/* Claim Button for Open Tickets */}
                        {isUnassignedOpen && (
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
                    </div>

                    <h3 className="text-base font-semibold text-foreground">
                      {activeTicket.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground bg-card px-2.5 py-1 rounded-lg border border-border">
                        <Users size={12} className="text-primary" />
                        <span>Đội: <strong>{activeTicket.teamName}</strong></span>
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground bg-card px-2.5 py-1 rounded-lg border border-border">
                        <User size={12} className="text-primary" />
                        <span>Người gửi: <strong>{activeTicket.creatorName || 'Thí sinh'}</strong></span>
                      </span>
                      <Badge variant={CATEGORY_LABELS[activeTicket.category || 'technical']?.variant || 'neutral'}>
                        {CATEGORY_LABELS[activeTicket.category || 'technical']?.label || 'Chung'}
                      </Badge>
                      <Badge variant={PRIORITY_LABELS[activeTicket.priority]?.variant || 'neutral'}>
                        {PRIORITY_LABELS[activeTicket.priority]?.label || activeTicket.priority}
                      </Badge>
                      {activeTicket.assignedMentorName && (
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <UserCheck size={12} />
                          <span>Mentor phụ trách: {activeTicket.assignedMentorName}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body: Issue Description & Mentor Response Editor */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/40 dark:bg-slate-900/60">
                    {/* Problem Content */}
                    <div className="p-4 rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border space-y-1.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Chi tiết vấn đề Thí sinh phản ánh:
                      </span>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {activeTicket.description || activeTicket.content}
                      </p>
                    </div>

                    {/* Official Response Banner if already resolved */}
                    {activeTicket.response && (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                          <CheckCircle2 size={16} />
                          <span>Câu Trả Lời / Hướng Dẫn Đã Gửi Cho Thí Sinh:</span>
                        </div>
                        <p className="text-xs text-emerald-100 leading-relaxed whitespace-pre-wrap bg-muted/40 dark:bg-slate-900/60 p-3 rounded-lg border border-emerald-500/20">
                          {activeTicket.response || 'Đã hỗ trợ hoàn tất.'}
                        </p>
                      </div>
                    )}

                    {/* Resolution Form: STRICT RBAC (SRS HF-37 Mục 4.2b) */}
                    {activeTicket.status !== 'resolved' && activeTicket.status !== 'closed' && (
                      <>
                        {/* Case 1: Ticket open unassigned */}
                        {isUnassignedOpen && (
                          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangle size={16} className="text-amber-700 dark:text-amber-400 shrink-0" />
                              <span>Ticket này đang ở trạng thái <strong>Chờ tiếp nhận</strong>. Bạn cần bấm &quot;Nhận Xử Lý (Claim)&quot; để phụ trách trước khi giải quyết.</span>
                            </div>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={handleClaimTicket}
                              className="shrink-0 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 border-none"
                            >
                              Nhận Xử Lý Ngay
                            </Button>
                          </div>
                        )}

                        {/* Case 2: Ticket assigned to another Mentor */}
                        {isAssignedToOtherMentor && (
                          <div className="p-4 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground flex items-center gap-2.5">
                            <UserCheck size={16} className="text-primary shrink-0" />
                            <span>
                              Ticket này hiện đang do <strong>{activeTicket.assignedMentorName}</strong> phụ trách. Chỉ Mentor được phân công hoặc Admin mới có quyền gửi phản hồi và giải quyết.
                            </span>
                          </div>
                        )}

                        {/* Case 3: Assigned to current Mentor (or Admin) -> Show Response Editor */}
                        {isAssignedToCurrentMentor && (
                          <div className="p-4 rounded-xl bg-[#111827] border border-border space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <MessageSquare size={14} className="text-[#A855F7]" />
                                <span>Khung Hướng Dẫn Giải Quyết (Response):</span>
                              </label>
                              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                                * Bắt buộc trước khi đánh dấu Đã giải quyết
                              </span>
                            </div>

                            <textarea
                              rows={4}
                              value={mentorResponseText}
                              onChange={(e) => setMentorResponseText(e.target.value)}
                              placeholder="Nhập nội dung hướng dẫn chuyên môn, giải pháp kỹ thuật cụ thể hoặc hướng khắc phục sự cố cho đội thi..."
                              className="w-full p-3 rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border text-xs text-foreground placeholder:text-slate-500 focus:outline-none focus:border-[#A855F7] leading-relaxed"
                            />

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] text-muted-foreground">
                                Thí sinh sẽ nhận được phản hồi này ngay lập tức trên trang /tickets.
                              </span>
                              <Button
                                variant="primary"
                                onClick={handleResolveTicket}
                                className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 border-none shadow-lg shadow-emerald-500/25 px-5"
                              >
                                <CheckCircle size={15} />
                                <span>Gửi Phản Hồi và Đánh Dấu Đã Giải Quyết</span>
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Ongoing Messages */}
                    {activeTicket.messages && activeTicket.messages.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        <span className="text-xs font-semibold text-muted-foreground">Lịch sử trao đổi trong ticket:</span>
                        {activeTicket.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`p-3 rounded-xl text-xs ${
                              m.senderRole === 'mentor'
                                ? 'bg-card border border-border text-foreground'
                                : 'bg-muted/40 dark:bg-slate-900/60 border border-border text-muted-foreground'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                              <span className="font-semibold text-foreground">
                                {m.senderName} ({m.senderRole === 'mentor' ? 'Cố vấn' : 'Thí sinh'})
                              </span>
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
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-xs">
                  <Inbox size={48} className="text-slate-600 mb-3 opacity-40" />
                  <p className="font-medium text-muted-foreground">Chưa chọn ticket nào để xử lý</p>
                  <p className="text-[11px] text-slate-600 mt-1 max-w-sm">
                    Chọn một yêu cầu từ danh sách bên trái để xem nội dung vướng mắc và tiếp nhận hướng dẫn đội thi.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* CANDIDATE CREATE TICKET MODAL                              */}
      {/* ========================================================== */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Gửi Yêu Cầu Hỗ Trợ Kỹ Thuật (Helpdesk Ticket)"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Tiêu đề yêu cầu <strong className="text-rose-700 dark:text-rose-400">*</strong></span>
              <span className="text-[10px] text-muted-foreground">5 – 128 ký tự</span>
            </label>
            <Input
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value);
                if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder="Tóm tắt ngắn gọn vấn đề (Ví dụ: Lỗi runner CI/CD chặng 2...)"
              className="text-xs"
            />
            {formErrors.title && (
              <p className="text-[11px] text-rose-700 dark:text-rose-400 flex items-center gap-1 mt-0.5">
                <AlertTriangle size={12} />
                <span>{formErrors.title}</span>
              </p>
            )}
          </div>

          {/* Category & Priority Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Danh mục vấn đề <strong className="text-rose-700 dark:text-rose-400">*</strong>
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as TicketCategory)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground focus:outline-none focus:border-[#6366F1] cursor-pointer"
              >
                <option value="technical">Kỹ thuật (Lỗi hệ thống / CI/CD)</option>
                <option value="topic_clarification">Đề tài (Giải đáp yêu cầu)</option>
                <option value="submission_issue">Nộp bài (Sự cố nộp bài)</option>
                <option value="account_team">Đội thi (Tài khoản và Ghép đội)</option>
                <option value="other">Khác (Vấn đề phát sinh khác)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Mức độ ưu tiên <strong className="text-rose-700 dark:text-rose-400">*</strong>
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground focus:outline-none focus:border-[#6366F1] cursor-pointer"
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
            <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Mô tả chi tiết vướng mắc <strong className="text-rose-700 dark:text-rose-400">*</strong></span>
              <span className="text-[10px] text-muted-foreground">Tối thiểu 10 ký tự</span>
            </label>
            <textarea
              rows={5}
              value={newContent}
              onChange={(e) => {
                setNewContent(e.target.value);
                if (formErrors.content) setFormErrors((prev) => ({ ...prev, content: '' }));
              }}
              placeholder="Mô tả cụ thể thông báo lỗi, các bước tái hiện, liên kết log hoặc câu hỏi chuyên môn cần Cố vấn hỗ trợ..."
              className="w-full p-3 rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border text-xs text-foreground placeholder:text-slate-500 focus:outline-none focus:border-[#6366F1] leading-relaxed"
            />
            {formErrors.content && (
              <p className="text-[11px] text-rose-700 dark:text-rose-400 flex items-center gap-1 mt-0.5">
                <AlertTriangle size={12} />
                <span>{formErrors.content}</span>
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="text-xs text-muted-foreground border-border"
            >
              <X size={14} className="mr-1" />
              <span>Hủy Bỏ</span>
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="text-xs bg-[#6366F1] hover:bg-[#4F46E5] shadow-lg shadow-[#6366F1]/20 px-5"
            >
              <Send size={14} className="mr-1.5" />
              <span>Gửi Yêu Cầu Hỗ Trợ</span>
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(closeTicketTargetId)}
        onOpenChange={(open) => {
          if (!open) setCloseTicketTargetId(null);
        }}
        title="Xác nhận đóng Ticket hỗ trợ?"
        description="Sau khi đóng, ticket này sẽ chuyển sang trạng thái Hoàn tất (Closed). Bạn vẫn có thể mở lại trong vòng 48 giờ nếu sự cố tái diễn."
        confirmLabel="Xác nhận đóng ticket"
        variant="primary"
        onConfirm={executeCloseTicket}
      />

      <ConfirmDialog
        open={isEscalateConfirmOpen}
        onOpenChange={setIsEscalateConfirmOpen}
        title={`Chuyển giao Ticket #${activeTicket?.ticketCode || activeTicket?.id || ''} lên Ban Tổ Chức?`}
        description="Ticket sẽ được gỡ phân công hiện tại và chuyển về hàng chờ ưu tiên của Ban Tổ Chức (Admin) để xử lý thẩm quyền cấp cao."
        confirmLabel="Xác nhận chuyển giao"
        variant="warning"
        onConfirm={executeEscalateTicket}
      />
    </div>
  );
};

export default SupportTickets;

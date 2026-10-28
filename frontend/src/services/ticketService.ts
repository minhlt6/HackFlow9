import { axiosClient } from '../api/axiosClient';

export type TicketCategory =
  | 'technical'
  | 'topic_clarification'
  | 'submission_issue'
  | 'account_team'
  | 'other';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface CreateTicketPayload {
  title: string;
  content: string;
  category: TicketCategory | string;
  priority: TicketPriority;
}

export interface UpdateTicketPayload {
  action?: 'accept' | 'update_response' | 'resolve' | 'close' | 'reopen' | 'escalate';
  response?: string;
  note?: string;
  target_admin_id?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
}

export interface TicketFilterParams {
  status?: string;
  priority?: string;
  category?: string;
  page?: number;
  page_size?: number;
}

export interface TicketItem {
  id: string;
  ticketCode?: string;
  team_id?: string;
  teamId?: string;
  teamName?: string;
  user_id?: string;
  creatorId?: string;
  creatorName?: string;
  assigned_to?: string | null;
  assignedMentorId?: string | null;
  assignedMentorName?: string;
  title: string;
  content?: string;
  description?: string;
  category: TicketCategory | string;
  priority: TicketPriority;
  status: TicketStatus;
  response?: string | null;
  created_at?: string;
  createdAt?: string;
  resolved_at?: string | null;
  updated_at?: string;
  updatedAt?: string;
}

export const ticketService = {
  /**
   * Tạo yêu cầu hỗ trợ mới (Thí sinh)
   * POST /api/v1/tickets
   */
  createTicket: async (payload: CreateTicketPayload) => {
    const response = await axiosClient.post('/tickets', payload);
    return response.data;
  },

  /**
   * Lấy danh sách ticket của đội mình (Thí sinh)
   * GET /api/v1/tickets/me
   */
  getMyTickets: async (params?: TicketFilterParams) => {
    const response = await axiosClient.get('/tickets/me', { params });
    return response.data;
  },

  /**
   * Lấy danh sách ticket toàn hệ thống (Mentor & Admin)
   * GET /api/v1/tickets
   */
  getAllTickets: async (params?: TicketFilterParams) => {
    const response = await axiosClient.get('/tickets', { params });
    return response.data;
  },

  /**
   * Lấy chi tiết một ticket
   * GET /api/v1/tickets/{id}
   */
  getTicketDetail: async (ticketId: string) => {
    const response = await axiosClient.get(`/tickets/${ticketId}`);
    return response.data;
  },

  /**
   * Cập nhật trạng thái / phản hồi ticket (Claim, Resolve, etc.)
   * PATCH /api/v1/tickets/{id}
   */
  updateTicket: async (ticketId: string, payload: UpdateTicketPayload) => {
    const response = await axiosClient.patch(`/tickets/${ticketId}`, payload);
    return response.data;
  },
};

export const { createTicket, getMyTickets, getAllTickets, getTicketDetail, updateTicket } = ticketService;

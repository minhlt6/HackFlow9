import { axiosClient } from './axiosClient';
import type { ApiResponse } from '../types';
import type {
  AppNotification,
  NotificationUnreadCountResponse,
} from '../types/notification';

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  priority: 'info' | 'warning' | 'urgent';
  created_at: string;
  updated_at?: string;
  sender?: string;
  author?: string;
  target_audience?: "all" | "candidate" | "judge" | "mentor";
  targetRole?: 'all' | 'candidates' | 'judges' | 'mentors';
}

export interface AnnouncementCreatePayload {
  target_audience?: string;
  title: string;
  content: string;
  priority?: 'info' | 'warning' | 'urgent';
}

export interface AnnouncementUpdatePayload {
  target_audience?: string;
  title?: string;
  content?: string;
  priority?: 'info' | 'warning' | 'urgent';
}

export interface AnnouncementPaginationData {
  items: AnnouncementItem[];
  total: number;
  page: number;
  page_size: number;
}

export function normalizeAnnouncement(item: AnnouncementItem): AnnouncementItem {
  const audience = item.target_audience;
  const targetRole = audience === 'candidate' ? 'candidates' : audience === 'judge' ? 'judges' : audience === 'mentor' ? 'mentors' : audience === 'all' ? 'all' : item.targetRole ?? 'all';
  return { ...item, targetRole };
}

export const notificationsApi = {
  getMyNotifications: async (): Promise<AppNotification[]> => {
    const response = await axiosClient.get<ApiResponse<AppNotification[]>>('/notifications/me');
    return response.data.data;
  },
  getUnreadCount: async (): Promise<number> => {
    const response = await axiosClient.get<ApiResponse<NotificationUnreadCountResponse>>('/notifications/unread-count');
    return response.data.data.unread_count;
  },
  markAsRead: async (id: string): Promise<void> => { await axiosClient.patch(`/notifications/${id}/read`); },
  markAllAsRead: async (): Promise<void> => { await axiosClient.patch('/notifications/read-all'); },
  dismissNotification: async (id: string): Promise<void> => { await axiosClient.post(`/notifications/${id}/dismiss`); },

  /**
   * Xem danh sách thông báo cuộc thi (GET /api/v1/announcements)
   */
  listAnnouncements: async (page = 1, pageSize = 50): Promise<AnnouncementPaginationData> => {
    const response = await axiosClient.get<ApiResponse<AnnouncementPaginationData>>('/announcements', {
      params: { page, page_size: pageSize },
    });
    const data = response.data.data;
    if (!data || !Array.isArray(data.items)) throw new Error('Phản hồi danh sách thông báo không hợp lệ.');
    return { ...data, items: data.items.map(normalizeAnnouncement) };
  },

  listAllAnnouncements: async (): Promise<AnnouncementItem[]> => {
    const all = new Map<string, AnnouncementItem>();
    for (let page = 1; ; page++) {
      const batch = await notificationsApi.listAnnouncements(page, 100);
      const previousCount = all.size;
      batch.items.forEach((item) => all.set(item.id, item));
      if (all.size >= batch.total) return [...all.values()];
      if (all.size === previousCount) throw new Error('Không thể tải đủ danh sách thông báo. Vui lòng thử lại.');
    }
  },

  /**
   * Tạo thông báo mới (POST /api/v1/announcements) - Chỉ Admin/BTC
   */
  createAnnouncement: async (payload: AnnouncementCreatePayload): Promise<AnnouncementItem> => {
    const response = await axiosClient.post<ApiResponse<AnnouncementItem>>('/announcements', payload);
    return normalizeAnnouncement(response.data.data);
  },

  /**
   * Cập nhật thông báo (PUT /api/v1/announcements/{id}) - Chỉ Admin/BTC
   */
  updateAnnouncement: async (id: string, payload: AnnouncementUpdatePayload): Promise<AnnouncementItem> => {
    const response = await axiosClient.put<ApiResponse<AnnouncementItem>>(`/announcements/${id}`, payload);
    return normalizeAnnouncement(response.data.data);
  },

  /**
   * Xóa thông báo (DELETE /api/v1/announcements/{id}) - Chỉ Admin/BTC
   */
  deleteAnnouncement: async (id: string): Promise<void> => {
    await axiosClient.delete<ApiResponse<unknown>>(`/announcements/${id}`);
  },
};

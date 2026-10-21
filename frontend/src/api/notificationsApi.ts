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
  targetRole?: 'all' | 'candidates' | 'judges' | 'mentors';
}

export interface AnnouncementCreatePayload {
  title: string;
  content: string;
  priority?: 'info' | 'warning' | 'urgent';
}

export interface AnnouncementUpdatePayload {
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

const NOTIFICATIONS_STORAGE_KEY = 'hackflow_notifications_clean_v1';

const INITIAL_MOCK_NOTIFICATIONS: AppNotification[] = [];

const getStoredNotifications = (): AppNotification[] => {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(
        NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(INITIAL_MOCK_NOTIFICATIONS)
      );
      return INITIAL_MOCK_NOTIFICATIONS;
    }
    return JSON.parse(raw) as AppNotification[];
  } catch {
    return INITIAL_MOCK_NOTIFICATIONS;
  }
};

const saveStoredNotifications = (notifications: AppNotification[]) => {
  try {
    localStorage.setItem(
      NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(notifications)
    );
  } catch {
    // ignore
  }
};

export const notificationsApi = {
  /**
   * Lấy danh sách thông báo của người dùng hiện tại (GET /api/v1/notifications/me)
   */
  getMyNotifications: async (): Promise<AppNotification[]> => {
    try {
      const response = await axiosClient.get<ApiResponse<AppNotification[]>>(
        '/notifications/me'
      );
      if (response.data && response.data.data) {
        return response.data.data;
      }
      return getStoredNotifications();
    } catch {
      // Backend notification endpoint fallback to local storage
      return getStoredNotifications();
    }
  },

  /**
   * Lấy số lượng thông báo chưa đọc (GET /api/v1/notifications/unread-count)
   */
  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await axiosClient.get<
        ApiResponse<NotificationUnreadCountResponse>
      >('/notifications/unread-count');
      if (typeof response.data?.data?.unread_count === 'number') {
        return response.data.data.unread_count;
      }
      const list = getStoredNotifications();
      return list.filter((n) => !n.is_read).length;
    } catch {
      const list = getStoredNotifications();
      return list.filter((n) => !n.is_read).length;
    }
  },

  /**
   * Đánh dấu một thông báo là đã đọc (PATCH /api/v1/notifications/{id}/read)
   */
  markAsRead: async (notificationId: string): Promise<void> => {
    try {
      await axiosClient.patch(`/notifications/${notificationId}/read`);
    } catch {
      // ignore network error, update local
    }
    const list = getStoredNotifications();
    const updated = list.map((item) =>
      item.id === notificationId ? { ...item, is_read: true } : item
    );
    saveStoredNotifications(updated);
  },

  /**
   * Đánh dấu toàn bộ thông báo là đã đọc
   */
  markAllAsRead: async (): Promise<void> => {
    try {
      await axiosClient.patch('/notifications/read-all');
    } catch {
      // ignore
    }
    const list = getStoredNotifications();
    const updated = list.map((item) => ({ ...item, is_read: true }));
    saveStoredNotifications(updated);
  },

  /**
   * Đóng/Dismiss thông báo Warning (POST /api/v1/notifications/{id}/dismiss)
   */
  dismissNotification: async (notificationId: string): Promise<void> => {
    try {
      await axiosClient.post(`/notifications/${notificationId}/dismiss`);
    } catch {
      // ignore
    }
    const list = getStoredNotifications();
    const updated = list.map((item) =>
      item.id === notificationId
        ? { ...item, is_dismissed: true, is_read: true }
        : item
    );
    saveStoredNotifications(updated);
  },

  /**
   * Xem danh sách thông báo cuộc thi (GET /api/v1/announcements)
   */
  listAnnouncements: async (page = 1, pageSize = 50): Promise<AnnouncementPaginationData> => {
    const response = await axiosClient.get<ApiResponse<AnnouncementPaginationData>>('/announcements', {
      params: { page, page_size: pageSize },
    });
    return response.data.data;
  },

  /**
   * Tạo thông báo mới (POST /api/v1/announcements) - Chỉ Admin/BTC
   */
  createAnnouncement: async (payload: AnnouncementCreatePayload): Promise<AnnouncementItem> => {
    const response = await axiosClient.post<ApiResponse<AnnouncementItem>>('/announcements', payload);
    return response.data.data;
  },

  /**
   * Cập nhật thông báo (PUT /api/v1/announcements/{id}) - Chỉ Admin/BTC
   */
  updateAnnouncement: async (id: string, payload: AnnouncementUpdatePayload): Promise<AnnouncementItem> => {
    const response = await axiosClient.put<ApiResponse<AnnouncementItem>>(`/announcements/${id}`, payload);
    return response.data.data;
  },

  /**
   * Xóa thông báo (DELETE /api/v1/announcements/{id}) - Chỉ Admin/BTC
   */
  deleteAnnouncement: async (id: string): Promise<void> => {
    await axiosClient.delete<ApiResponse<unknown>>(`/announcements/${id}`);
  },
};

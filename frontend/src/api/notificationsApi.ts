import { axiosClient } from './axiosClient';
import type { ApiResponse } from '../types';
import type {
  AppNotification,
  NotificationUnreadCountResponse,
} from '../types/notification';

const NOTIFICATIONS_STORAGE_KEY = 'hackflow_notifications_v1';

const INITIAL_MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-urgent-01',
    type: 'URGENT',
    title: 'Xác nhận quan trọng: Quy định đóng băng Commit SHA',
    content:
      'Hệ thống ghi nhận thời hạn nộp bài chặng hiện tại đang áp dụng cơ chế đóng băng Commit SHA từ GitHub. Vui lòng đảm bảo repository ở chế độ Public và kiểm tra kỹ mã commit trước khi hoàn tất nộp bài.',
    target_scope: 'ALL',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    is_read: false,
    is_dismissed: false,
    action_label: 'Tôi đã hiểu và đồng ý',
  },
  {
    id: 'notif-warning-01',
    type: 'WARNING',
    title: 'Nhắc nhở thời hạn: Checkpoint 2 sắp đóng cổng nộp bài',
    content:
      'Cổng nộp bài Checkpoint 2 sẽ chính thức đóng trong thời gian tới. Các đội thi vui lòng hoàn tất tài liệu hệ thống và link demo để tránh quá hạn.',
    target_scope: 'ALL',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    is_read: false,
    is_dismissed: false,
    action_url: '/checkpoints',
    action_label: 'Xem chặng thi',
  },
  {
    id: 'notif-info-01',
    type: 'INFO',
    title: 'Danh sách đề tài Hackathon 2026 đã chính thức mở',
    content:
      'Ban tổ chức đã mở cổng đăng ký đề tài cho các đội thi hợp lệ (từ 3 thành viên trở lên). Đội trưởng hãy nhanh chóng đăng ký đề tài phù hợp với năng lực của đội mình.',
    target_scope: 'ALL',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    is_read: false,
    is_dismissed: false,
    action_url: '/topics',
    action_label: 'Đến trang đề tài',
  },
];

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
};

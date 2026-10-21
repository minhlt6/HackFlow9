import { create } from 'zustand';
import type { AppNotification } from '../types/notification';
import { notificationsApi } from '../api/notificationsApi';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  activeUrgent: AppNotification | null;
  activeWarnings: AppNotification[];
  infoToast: AppNotification | null;

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissWarning: (id: string) => Promise<void>;
  acknowledgeUrgent: (id: string) => Promise<void>;
  setInfoToast: (notification: AppNotification | null) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  activeUrgent: null,
  activeWarnings: [],
  infoToast: null,

  fetchNotifications: async () => {
    try {
      set({ isLoading: true });
      const [list, count] = await Promise.all([
        notificationsApi.getMyNotifications(),
        notificationsApi.getUnreadCount(),
      ]);

      const unreadUrgent = list.find(
        (n) => n.type === 'URGENT' && !n.is_read
      ) || null;

      const warnings = list.filter(
        (n) => n.type === 'WARNING' && !n.is_dismissed
      );

      // Check if there is an unread INFO notification to show as toast
      const prevInfoToast = get().infoToast;
      const unreadInfo = list.find((n) => n.type === 'INFO' && !n.is_read);

      set({
        notifications: list,
        unreadCount: count,
        activeUrgent: unreadUrgent,
        activeWarnings: warnings,
        infoToast: !prevInfoToast && unreadInfo ? unreadInfo : prevInfoToast,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    await notificationsApi.markAsRead(id);
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, is_read: true } : n
    );
    const unreadCount = updated.filter((n) => !n.is_read).length;
    const activeUrgent = updated.find((n) => n.type === 'URGENT' && !n.is_read) || null;

    set({
      notifications: updated,
      unreadCount,
      activeUrgent,
      infoToast: get().infoToast?.id === id ? null : get().infoToast,
    });
  },

  markAllAsRead: async () => {
    await notificationsApi.markAllAsRead();
    const updated = get().notifications.map((n) => ({ ...n, is_read: true }));
    set({
      notifications: updated,
      unreadCount: 0,
      activeUrgent: null,
      infoToast: null,
    });
  },

  dismissWarning: async (id: string) => {
    await notificationsApi.dismissNotification(id);
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, is_dismissed: true, is_read: true } : n
    );
    const unreadCount = updated.filter((n) => !n.is_read).length;
    const warnings = updated.filter(
      (n) => n.type === 'WARNING' && !n.is_dismissed
    );

    set({
      notifications: updated,
      unreadCount,
      activeWarnings: warnings,
    });
  },

  acknowledgeUrgent: async (id: string) => {
    await notificationsApi.markAsRead(id);
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, is_read: true } : n
    );
    const unreadCount = updated.filter((n) => !n.is_read).length;
    const nextUrgent = updated.find((n) => n.type === 'URGENT' && !n.is_read) || null;

    set({
      notifications: updated,
      unreadCount,
      activeUrgent: nextUrgent,
    });
  },

  setInfoToast: (notification: AppNotification | null) => {
    set({ infoToast: notification });
  },
}));

export type NotificationType = 'INFO' | 'WARNING' | 'URGENT';
export type NotificationScope = 'ALL' | 'ROLE' | 'TEAM' | 'USER';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  target_scope?: NotificationScope;
  target_roles?: string[];
  target_team_ids?: string[];
  target_user_ids?: string[];
  created_by?: string;
  created_at: string;
  expires_at?: string | null;
  is_read?: boolean;
  is_dismissed?: boolean;
  action_url?: string;
  action_label?: string;
}

export interface NotificationUnreadCountResponse {
  unread_count: number;
}

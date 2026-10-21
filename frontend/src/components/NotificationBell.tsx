import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, ExternalLink, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/useNotificationStore';
import type { AppNotification } from '../types/notification';

const formatRelativeTime = (isoString: string): string => {
  try {
    const now = Date.now();
    const past = new Date(isoString).getTime();
    const diffSec = Math.floor((now - past) / 1000);

    if (diffSec < 60) return 'Vừa xong';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay} ngày trước`;
  } catch {
    return '';
  }
};

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
  } = useNotificationStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Initial fetch and 45s polling per SRS HF-24 (30-60s)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const hasUrgent = notifications.some((n) => n.type === 'URGENT' && !n.is_read);
  const hasWarning = notifications.some((n) => n.type === 'WARNING' && !n.is_read);

  // Badge color based on priority: Red for Urgent, Amber for Warning, Indigo for Info
  const badgeColor = hasUrgent
    ? 'bg-rose-500 text-white'
    : hasWarning
      ? 'bg-amber-500 text-slate-950 font-bold'
      : 'bg-primary text-primary-foreground';

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.is_read;
    return true;
  });

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    if (notif.action_url) {
      setIsOpen(false);
      navigate(notif.action_url);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Thông báo"
        aria-expanded={isOpen}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
        title="Thông báo hệ thống"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] flex items-center justify-center font-bold shadow-xs animate-pulse ${badgeColor}`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Thông báo hệ thống"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-popover text-popover-foreground border border-border shadow-xl z-50 overflow-hidden font-sans animate-in fade-in duration-150"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-muted/40">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">Thông báo</span>
              {unreadCount > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-medium">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCheck size={13} />
                <span>Đọc tất cả</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-border bg-muted/20 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 font-medium text-center transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`flex-1 py-2 font-medium text-center transition-colors cursor-pointer ${
                activeTab === 'unread'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                <p>Không có thông báo nào {activeTab === 'unread' ? 'chưa đọc' : ''}</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isUrgent = notif.type === 'URGENT';
                const isWarning = notif.type === 'WARNING';

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 transition-colors cursor-pointer flex gap-3 hover:bg-muted/60 ${
                      !notif.is_read ? 'bg-primary/5' : 'opacity-85'
                    }`}
                  >
                    {/* Icon indicator */}
                    <div className="shrink-0 mt-0.5">
                      {isUrgent ? (
                        <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                          <AlertOctagon size={15} />
                        </div>
                      ) : isWarning ? (
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-300">
                          <AlertTriangle size={15} />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <Info size={15} />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {notif.content}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-muted-foreground">
                        <span>{formatRelativeTime(notif.created_at)}</span>
                        {notif.action_url && (
                          <span className="flex items-center gap-1 text-primary hover:underline">
                            {notif.action_label || 'Xem chi tiết'}
                            <ExternalLink size={10} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

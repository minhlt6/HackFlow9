import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Menu,
  EyeOff,
  Sun,
  Moon,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';
import { NotificationBell } from '../NotificationBell';
import { useThemeStore } from '../../store/useThemeStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { Announcement } from '../../types';

const SEGMENT_LABELS: Record<string, string> = {
  admin: 'Quản trị',
  judge: 'Giám khảo',
  mentor: 'Cố vấn',
  dashboard: 'Tổng quan',
  approvals: 'Phê duyệt tài khoản',
  whitelist: 'Danh sách hợp lệ',
  teams: 'Quản lý Đội thi',
  topics: 'Quản lý Đề tài',
  checkpoints: 'Chặng nộp bài',
  criteria: 'Tiêu chí chấm điểm',
  personnel: 'Giám khảo & Cố vấn',
  results: 'Kết quả & Công bố',
  announcements: 'Phát thông báo',
  config: 'Cấu hình cuộc thi',
  'split-screen': 'Chấm song song',
  judging: 'Chấm thi',
  'final-submission': 'Nộp bài chung cuộc',
  scoreboard: 'Bảng xếp hạng',
  tickets: 'Hỗ trợ trực tuyến',
  profile: 'Hồ sơ cá nhân',
  onboarding: 'Hoàn thiện hồ sơ',
};

export interface TopNavProps {
  contestName: string;
  currentPhase: string;
  blindJudgingMode?: boolean;
  announcements: Announcement[];
  displayName: string;
  displayEmail: string;
  avatarUrl?: string;
  onOpenMobileMenu: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  contestName,
  currentPhase,
  blindJudgingMode,
  displayName,
  displayEmail,
  avatarUrl,
  onOpenMobileMenu,
}) => {
  const { theme, toggleTheme } = useThemeStore();
  const { user } = useAuthStore();
  const location = useLocation();

  const displayInitial = displayName.charAt(0).toUpperCase();

  // Build Breadcrumbs from current pathname
  const segments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg, idx) => {
    const href = '/' + segments.slice(0, idx + 1).join('/');
    const label = SEGMENT_LABELS[seg] || seg;
    return { label, href };
  });

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/95 backdrop-blur-xs px-4 sm:px-6">
      {/* Left: Mobile Menu & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Mở menu điều hướng"
          className="lg:hidden rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden sm:inline-flex">
                <BreadcrumbLink to={user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'}>
                  HackFlow
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbs.length > 0 ? (
                breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={crumb.href}>
                      <BreadcrumbSeparator className={idx === 0 ? 'hidden sm:inline-flex' : ''} />
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage className="truncate max-w-[180px] sm:max-w-none">
                            {crumb.label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink
                            to={crumb.href === '/admin' ? '/admin/dashboard' : crumb.href}
                            className="hidden md:inline-flex"
                          >
                            {crumb.label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  );
                })
              ) : (
                <>
                  <BreadcrumbSeparator className="hidden sm:inline-flex" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Tổng quan</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          <p className="hidden xl:block text-[11px] text-muted-foreground truncate mt-0.5">
            {contestName} • <span className="font-medium text-foreground">{currentPhase}</span>
          </p>
        </div>
      </div>

      {/* Right: Status Pills, Role Switcher, Theme Toggle, Notifications, User */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {blindJudgingMode && (
          <div className="hidden md:flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
            <EyeOff size={13} />
            <span>Chấm ẩn danh</span>
          </div>
        )}

        <div className="hidden md:flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Sync</span>
        </div>

        {/* Theme Toggle (Light mode default / Dark mode supported) */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          title={theme === 'dark' ? 'Chuyển sang Light Mode' : 'Chuyển sang Dark Mode'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notification Bell (SRS HF-24) */}
        <NotificationBell />

        {/* User Profile Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-border">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-foreground leading-tight">
              {displayName}
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {displayEmail}
            </p>
          </div>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-xs">
              {displayInitial}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

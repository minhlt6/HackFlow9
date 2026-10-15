import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  EyeOff,
  Sun,
  Moon,
  UserCog,
  ShieldCheck,
  Scale,
  GraduationCap,
  User,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { useThemeStore } from '../../store/useThemeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useMockStore } from '../../store/useMockStore';
import { mockUsers } from '../../mock/mockData';
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
  announcements,
  displayName,
  displayEmail,
  avatarUrl,
  onOpenMobileMenu,
}) => {
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const { theme, toggleTheme } = useThemeStore();
  const { user, login } = useAuthStore();
  const { switchPersona } = useMockStore();
  const location = useLocation();
  const navigate = useNavigate();

  const displayInitial = displayName.charAt(0).toUpperCase();

  // Build Breadcrumbs from current pathname
  const segments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg, idx) => {
    const href = '/' + segments.slice(0, idx + 1).join('/');
    const label = SEGMENT_LABELS[seg] || seg;
    return { label, href };
  });

  const handleQuickRoleSwitch = (
    personaKey: 'admin' | 'leader' | 'judge' | 'mentor',
    targetPath: string,
  ) => {
    const targetUser = mockUsers[personaKey];
    if (!targetUser) return;
    login(targetUser, `mock-jwt-token-${personaKey}`);
    switchPersona(personaKey);
    navigate(targetPath);
  };

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

        {/* Role Persona Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="h-8 gap-1.5 rounded-md border border-border bg-secondary px-2.5 text-xs font-medium text-secondary-foreground hover:bg-accent"
            title="Chuyển nhanh vai trò kiểm thử"
          >
            <UserCog size={14} className="text-primary" />
            <span className="hidden sm:inline">Vai trò:</span>
            <span className="font-semibold uppercase font-mono text-[11px]">
              {user?.role || 'admin'}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Chuyển cổng vai trò (Demo)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleQuickRoleSwitch('admin', '/admin/teams')}
            >
              <ShieldCheck size={14} className="text-primary" />
              <div className="flex flex-col">
                <span>Quản trị viên (Admin)</span>
                <span className="text-[10px] text-muted-foreground">Toàn quyền quản trị hệ thống</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleQuickRoleSwitch('judge', '/judge/dashboard')}
            >
              <Scale size={14} className="text-amber-500" />
              <div className="flex flex-col">
                <span>Giám khảo (Judge)</span>
                <span className="text-[10px] text-muted-foreground">Hội đồng chấm thi độc lập</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleQuickRoleSwitch('mentor', '/mentor/dashboard')}
            >
              <GraduationCap size={14} className="text-purple-500" />
              <div className="flex flex-col">
                <span>Cố vấn (Mentor)</span>
                <span className="text-[10px] text-muted-foreground">Hỗ trợ kỹ thuật & Helpdesk</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleQuickRoleSwitch('leader', '/dashboard')}
            >
              <User size={14} className="text-emerald-500" />
              <div className="flex flex-col">
                <span>Thí sinh (Team Leader)</span>
                <span className="text-[10px] text-muted-foreground">Đội thi CyberSamurai</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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

        {/* Announcements Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAnnouncements((prev) => !prev)}
            aria-label="Thông báo hệ thống"
            aria-expanded={showAnnouncements}
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
            title="Thông báo từ Ban Tổ Chức"
          >
            <Bell size={15} />
            {announcements.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
            )}
          </button>

          {showAnnouncements && (
            <div
              role="dialog"
              aria-label="Thông báo từ Ban Tổ Chức"
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-elevated z-50"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-border">
                <span className="text-sm font-semibold text-foreground">
                  Thông Báo Ban Tổ Chức
                </span>
                <Badge variant="indigo">{announcements.length} tin</Badge>
              </div>
              <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                {announcements.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Chưa có thông báo mới.
                  </p>
                ) : (
                  announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className="rounded-md bg-muted/60 border border-border p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">{ann.title}</span>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {ann.createdAt}
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{ann.content}</p>
                      <div className="text-[10px] text-primary font-medium pt-0.5">
                        Người gửi: {ann.sender || 'Ban Tổ Chức'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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

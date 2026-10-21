import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Lightbulb,
  CheckSquare,
  Award,
  Send,
  HelpCircle,
  User,
  ShieldCheck,
  ListOrdered,
  Megaphone,
  Settings,
  Scale,
  Columns,
  GraduationCap,
  LogOut,
  X,
  Lock,
  ChevronLeft,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import type { UserRole } from '../../types';

export interface NavGroupItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badgeCount?: number;
}

export interface NavGroup {
  title: string;
  items: NavGroupItem[];
}

export interface AppSidebarProps {
  currentRole: UserRole;
  isApproved: boolean;
  displayName: string;
  displayEmail: string;
  avatarUrl?: string;
  pendingApprovalsCount?: number;
  openTicketsCount?: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  width?: number;
  isResizing?: boolean;
  onStartResize?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onResetWidth?: () => void;
  onLogout: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentRole,
  isApproved,
  displayName,
  displayEmail,
  avatarUrl,
  pendingApprovalsCount = 0,
  openTicketsCount = 0,
  mobileOpen,
  onCloseMobile,
  collapsed,
  onToggleCollapse,
  width = 256,
  isResizing = false,
  onStartResize,
  onResetWidth,
  onLogout,
}) => {
  const displayInitial = displayName.charAt(0).toUpperCase();

  const candidateMenuGroups: NavGroup[] = isApproved
    ? [
        {
          title: 'Dự án & Đội thi',
          items: [
            { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
            { to: '/teams', label: 'Đội thi của tôi', icon: Users },
            { to: '/topics', label: 'Chọn đề tài', icon: Lightbulb },
          ],
        },
        {
          title: 'Tiến trình thi đấu',
          items: [
            { to: '/checkpoints', label: 'Tiến độ các chặng', icon: CheckSquare },
            { to: '/final-submission', label: 'Nộp bài chung cuộc', icon: Send },
            { to: '/scoreboard', label: 'Bảng xếp hạng', icon: Award },
          ],
        },
        {
          title: 'Cá nhân & Trợ giúp',
          items: [
            { to: '/profile', label: 'Hồ sơ cá nhân', icon: User },
            { to: '/tickets', label: 'Hỗ trợ trực tuyến', icon: HelpCircle },
          ],
        },
      ]
    : [
        {
          title: 'Hoàn thiện hồ sơ',
          items: [{ to: '/onboarding', label: 'Hồ sơ cá nhân', icon: User }],
        },
      ];

  const adminMenuGroups: NavGroup[] = [
    {
      title: 'Quản trị & Xét duyệt',
      items: [
        { to: '/admin/dashboard', label: 'Tổng quan Quản trị', icon: LayoutDashboard },
        {
          to: '/admin/approvals',
          label: 'Phê duyệt tài khoản',
          icon: ShieldCheck,
          badgeCount: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
        },
        { to: '/admin/whitelist', label: 'Danh sách hợp lệ', icon: ListOrdered },
        { to: '/admin/teams', label: 'Quản lý Đội thi', icon: Users },
      ],
    },
    {
      title: 'Nội dung & Chấm thi',
      items: [
        { to: '/admin/topics', label: 'Quản lý Đề tài', icon: Lightbulb },
        { to: '/admin/checkpoints', label: 'Cấu hình chặng nộp', icon: CheckSquare },
        { to: '/admin/criteria', label: 'Tiêu chí chấm điểm', icon: Scale },
        { to: '/admin/personnel', label: 'Giám khảo & Cố vấn', icon: GraduationCap },
        { to: '/admin/results', label: 'Kết quả & Công bố', icon: Award },
      ],
    },
    {
      title: 'Hệ thống & Thông báo',
      items: [
        { to: '/admin/announcements', label: 'Phát thông báo', icon: Megaphone },
        { to: '/admin/config', label: 'Cấu hình cuộc thi', icon: Settings },
      ],
    },
  ];

  const judgeMenuGroups: NavGroup[] = [
    {
      title: 'Hội đồng Giám khảo',
      items: [
        { to: '/judge/dashboard', label: 'Tổng quan Chấm thi', icon: LayoutDashboard },
        { to: '/judge/split-screen', label: 'Chấm song song', icon: Columns },
        { to: '/judge/topics', label: 'Đề tài & Đội thi', icon: Lightbulb },
        { to: '/judge/results', label: 'Bảng tổng hợp điểm', icon: Award },
      ],
    },
  ];

  const mentorMenuGroups: NavGroup[] = [
    {
      title: 'Cố vấn chuyên môn',
      items: [
        { to: '/mentor/dashboard', label: 'Tổng quan Cố vấn', icon: LayoutDashboard },
        {
          to: '/mentor/tickets',
          label: 'Yêu cầu hỗ trợ',
          icon: HelpCircle,
          badgeCount: openTicketsCount > 0 ? openTicketsCount : undefined,
        },
        { to: '/mentor/teams', label: 'Đội thi phụ trách', icon: Users },
        { to: '/mentor/checkpoints', label: 'Tiến độ các chặng', icon: CheckSquare },
      ],
    },
  ];

  const menuGroups =
    currentRole === 'admin'
      ? adminMenuGroups
      : currentRole === 'judge'
        ? judgeMenuGroups
        : currentRole === 'mentor'
          ? mentorMenuGroups
          : candidateMenuGroups;

  const roleBadgeMeta: {
    label: string;
    variant: 'indigo' | 'warning' | 'purple' | 'success';
  } =
    currentRole === 'admin'
      ? { label: 'Quản trị viên', variant: 'indigo' }
      : currentRole === 'judge'
        ? { label: 'Giám khảo', variant: 'warning' }
        : currentRole === 'mentor'
          ? { label: 'Cố vấn chuyên môn', variant: 'purple' }
          : {
              label: isApproved ? 'Thí sinh' : 'Chờ duyệt',
              variant: isApproved ? 'success' : 'warning',
            };

  const effectiveDesktopWidth = collapsed ? 64 : width;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px] lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        aria-label="Điều hướng chính"
        style={
          {
            '--sidebar-width': `${effectiveDesktopWidth}px`,
          } as React.CSSProperties
        }
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col justify-between border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:translate-x-0 lg:w-[var(--sidebar-width)]',
          !isResizing && 'transition-all duration-200',
          mobileOpen ? 'w-64 translate-x-0 shadow-xl' : 'w-64 -translate-x-full',
        )}
      >
        {/* Right-edge Interactive Drag Resizer (Desktop) */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Kéo để thay đổi độ rộng thanh menu (Nhấp đúp để đặt lại)"
          title="Kéo sang trái/phải để co giãn menu • Nhấp đúp để đặt lại mặc định"
          onMouseDown={onStartResize}
          onDoubleClick={onResetWidth}
          className={cn(
            'hidden lg:block absolute top-0 -right-1.5 bottom-0 w-3 z-50 cursor-col-resize group/resizer select-none',
          )}
        >
          <div
            className={cn(
              'mx-auto h-full w-[2px] transition-colors',
              isResizing
                ? 'bg-primary'
                : 'bg-transparent group-hover/resizer:bg-primary/60',
            )}
          />
        </div>

        {/* Single Quick Expand/Collapse Pill on Header Divider Line */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
          title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          className="hidden lg:flex absolute top-[44px] -right-3 z-50 h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div
            className={cn(
              'h-14 border-b border-sidebar-border flex items-center justify-between shrink-0',
              collapsed ? 'lg:px-3 lg:justify-center px-4' : 'px-4',
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
                <Terminal size={16} />
              </div>
              <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm tracking-tight text-foreground truncate">
                    HackFlow
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground border border-border shrink-0">
                    v2.4
                  </span>
                </div>
                <span className="block text-[11px] text-muted-foreground truncate">
                  Operations Console
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Đóng menu"
              className="lg:hidden rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Current Role Persona Card */}
          <div
            className={cn(
              'mx-2.5 my-2.5 rounded-md border border-border bg-muted/50 p-2.5 shrink-0',
              collapsed && 'lg:mx-2 lg:p-1.5 lg:flex lg:justify-center',
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-8 w-8 shrink-0 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold">
                  {displayInitial}
                </div>
              )}
              <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
                <p className="text-xs font-semibold text-foreground truncate">
                  {displayName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant={roleBadgeMeta.variant} size="sm">
                    {roleBadgeMeta.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Groups */}
          <nav className="flex-1 px-2.5 py-1.5 space-y-4 overflow-y-auto">
            {menuGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <div
                  className={cn(
                    'px-2.5 pt-1 pb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate',
                    collapsed && 'lg:sr-only',
                  )}
                >
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={onCloseMobile}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          cn(
                            'group relative flex items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            collapsed && 'lg:justify-center lg:px-2',
                            isActive
                              ? 'bg-primary/10 text-primary font-semibold dark:bg-primary/20 dark:text-indigo-300'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span
                                aria-hidden="true"
                                className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary"
                              />
                            )}
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon
                                size={16}
                                className={cn(
                                  'shrink-0',
                                  isActive
                                    ? 'text-primary dark:text-indigo-300'
                                    : 'text-muted-foreground group-hover:text-foreground',
                                )}
                              />
                              <span className={cn('truncate', collapsed && 'lg:hidden')}>
                                {item.label}
                              </span>
                            </div>

                            {item.badgeCount !== undefined && (
                              <span
                                className={cn(
                                  'ml-auto inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500/15 px-1.5 font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/30',
                                  collapsed && 'lg:hidden',
                                )}
                              >
                                {item.badgeCount}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}

            {currentRole === 'candidate' && !isApproved && (
              <div
                className={cn(
                  'mx-1 mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 space-y-1',
                  collapsed && 'lg:hidden',
                )}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <Lock size={13} className="shrink-0" />
                  <span>Đang chờ BTC phê duyệt</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Các chức năng Đội thi, Chọn đề tài và Nộp bài sẽ mở tự động sau khi hồ sơ được duyệt.
                </p>
              </div>
            )}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-2.5 border-t border-sidebar-border">
          <button
            type="button"
            onClick={onLogout}
            title={`Đăng xuất (${displayEmail})`}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-md border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer',
              collapsed && 'lg:px-2',
            )}
          >
            <LogOut size={14} className="shrink-0" />
            <span className={cn('truncate', collapsed && 'lg:hidden')}>
              Đăng xuất ({displayName})
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

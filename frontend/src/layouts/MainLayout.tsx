import React, { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AppSidebar } from '../components/layout/AppSidebar';
import { TopNav } from '../components/layout/TopNav';
import { Toaster } from '../components/ui/toast';
import { NotificationBanner } from '../components/NotificationBanner';
import { UrgentNotificationModal } from '../components/UrgentNotificationModal';
import { InfoToast } from '../components/InfoToast';
import { useAuthStore } from '../store/useAuthStore';
import { useMockStore } from '../store/useMockStore';
import { useThemeStore } from '../store/useThemeStore';
import { cn } from '../lib/utils';

const DEFAULT_SIDEBAR_WIDTH = 256;
const MIN_EXPANDED_WIDTH = 180;
const MAX_EXPANDED_WIDTH = 360;
const SNAP_COLLAPSE_THRESHOLD = 120;

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const {
    currentUser,
    config,
    announcements,
    pendingCandidates,
    tickets,
    switchPersona,
    updateCurrentUserProfile,
    logout: mockLogout,
  } = useMockStore();
  const { theme } = useThemeStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const navigate = useNavigate();

  // Synchronize light/dark theme class on mount and change
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Synchronize useMockStore persona & profile with the authenticated user from useAuthStore
  useEffect(() => {
    if (!user) return;

    let targetPersona:
      | 'admin'
      | 'judge'
      | 'mentor'
      | 'leader'
      | 'member'
      | 'pending'
      | 'rejected';

    if (user.role === 'admin') {
      targetPersona = 'admin';
    } else if (user.role === 'judge') {
      targetPersona = 'judge';
    } else if (user.role === 'mentor') {
      targetPersona = 'mentor';
    } else if (user.approvalStatus === 'pending') {
      targetPersona = 'pending';
    } else if (user.approvalStatus === 'rejected') {
      targetPersona = 'rejected';
    } else if (
      user.team_role === 'MEMBER' ||
      user.team_role === 'member' ||
      user.email.toLowerCase().includes('member')
    ) {
      targetPersona = 'member';
    } else {
      targetPersona = 'leader';
    }

    switchPersona(targetPersona);
    updateCurrentUserProfile(
      {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        githubUsername: user.githubUsername,
        avatarUrl: user.avatarUrl,
        studentId: user.studentId,
        university: user.university || user.school,
        school: user.school || user.university,
        phone: user.phone,
        skills: user.skills,
        bio: user.bio,
      },
      true,
    );
    void useMockStore.getState().syncFromBackend?.();
  }, [user, switchPersona, updateCurrentUserProfile]);

  // Interactive drag-to-resize handler for Sidebar
  const handleStartResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX;
      if (newX < SNAP_COLLAPSE_THRESHOLD) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
        const clamped = Math.min(
          MAX_EXPANDED_WIDTH,
          Math.max(MIN_EXPANDED_WIDTH, newX),
        );
        setSidebarWidth(clamped);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResetWidth = useCallback(() => {
    setSidebarCollapsed(false);
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
  }, []);

  const handleLogout = () => {
    logout();
    mockLogout();
    navigate('/login');
  };

  const displayName = user?.fullName || currentUser?.fullName || 'Nguyễn Văn Minh';
  const displayEmail = user?.email || currentUser?.email || 'leader@cybersamurai.team';
  const currentRole = user?.role || 'candidate';
  const isApproved =
    currentRole !== 'candidate' || user?.approvalStatus === 'approved';

  const openTicketsCount = tickets.filter((t) => t.status !== 'resolved').length;
  const effectiveDesktopWidth = sidebarCollapsed ? 64 : sidebarWidth;

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans antialiased">
      <AppSidebar
        currentRole={currentRole}
        isApproved={isApproved}
        displayName={displayName}
        displayEmail={displayEmail}
        avatarUrl={user?.avatarUrl}
        pendingApprovalsCount={pendingCandidates.length}
        openTicketsCount={openTicketsCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        width={sidebarWidth}
        isResizing={isResizing}
        onStartResize={handleStartResize}
        onResetWidth={handleResetWidth}
        onLogout={handleLogout}
      />

      <div
        style={
          {
            '--sidebar-offset': `${effectiveDesktopWidth}px`,
          } as React.CSSProperties
        }
        className={cn(
          'flex-1 flex flex-col min-w-0 lg:pl-[var(--sidebar-offset)]',
          !isResizing && 'transition-all duration-200',
        )}
      >
        <TopNav
          contestName={
            config?.name?.replace('&', 'và') ||
            'HackFlow AI và DeepTech Hackathon 2026'
          }
          currentPhase={
            config?.currentPhase ||
            'Giai đoạn 3: Thực thi dự án và Nộp bài các chặng'
          }
          blindJudgingMode={config?.blindJudgingMode}
          announcements={announcements}
          displayName={displayName}
          displayEmail={displayEmail}
          avatarUrl={user?.avatarUrl}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Warning Top Banner (SRS HF-24) */}
        <NotificationBanner />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Blocking Urgent Modal, Info Toast & Design System Toaster */}
      <UrgentNotificationModal />
      <InfoToast />
      <Toaster />
    </div>
  );
};

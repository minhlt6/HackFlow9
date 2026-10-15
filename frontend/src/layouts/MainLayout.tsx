import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AppSidebar } from '../components/layout/AppSidebar';
import { TopNav } from '../components/layout/TopNav';
import { Toaster } from '../components/ui/toast';
import { useAuthStore } from '../store/useAuthStore';
import { useMockStore } from '../store/useMockStore';
import { useThemeStore } from '../store/useThemeStore';
import { cn } from '../lib/utils';

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const {
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
    } else {
      if (user.approvalStatus === 'pending') {
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
    }

    switchPersona(targetPersona);
    updateCurrentUserProfile({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
      githubUsername: user.githubUsername,
      avatarUrl: user.avatarUrl,
    });
  }, [user, switchPersona, updateCurrentUserProfile]);

  const handleLogout = () => {
    logout();
    mockLogout();
    navigate('/login');
  };

  const displayName = user?.fullName || 'Nguyễn Văn Minh';
  const displayEmail = user?.email || 'leader@cybersamurai.team';
  const currentRole = user?.role || 'candidate';
  const isApproved =
    currentRole !== 'candidate' || user?.approvalStatus === 'approved';

  const openTicketsCount = tickets.filter((t) => t.status !== 'resolved').length;

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
        onLogout={handleLogout}
      />

      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-200',
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64',
        )}
      >
        <TopNav
          contestName={config?.name || 'HackFlow AI & DeepTech Hackathon 2026'}
          currentPhase={
            config?.currentPhase ||
            'Giai đoạn 3: Thực thi dự án & Nộp bài các chặng'
          }
          blindJudgingMode={config?.blindJudgingMode}
          announcements={announcements}
          displayName={displayName}
          displayEmail={displayEmail}
          avatarUrl={user?.avatarUrl}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
};
import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { RejectedAccountPage } from './pages/RejectedAccountPage';
import { AuthCallback } from './pages/AuthCallback';
import { TeamsPage } from './pages/TeamsPage';
import { CandidateDashboardPage } from './pages/candidate/CandidateDashboardPage';

import { CandidateCheckpointsPage } from './pages/candidate/candidateCheckpointsPage';
import { TopicsPage } from './pages/TopicsPage';
import { CandidateFinalSubmissionPage } from './pages/candidate/CandidateFinalSubmissionPage';
import { CandidateTicketsPage } from './pages/candidate/CandidateTicketsPage';
import { CandidateProfilePage } from './pages/candidate/CandidateProfilePage';
import { UIPreviewPage } from './pages/UIPreviewPage';
import { MainLayout } from './layouts/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/useAuthStore';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminApprovalsPage } from './pages/admin/AdminApprovalsPage';
import { AdminWhitelistPage } from './pages/admin/AdminWhitelistPage';
import { AdminTeamsPage } from './pages/admin/AdminTeamsPage';
import { AdminTopicsPage } from './pages/admin/AdminTopicsPage';
import { AdminCheckpointsPage } from './pages/admin/AdminCheckpointsPage';
import { AdminCriteriaPage } from './pages/admin/AdminCriteriaPage';
import { AdminMentorsJudgesPage } from './pages/admin/AdminMentorsJudgesPage';
import { AdminResultsPage } from './pages/admin/AdminResultsPage';
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage';
import { AdminConfigPage } from './pages/admin/AdminConfigPage';

// Judge Pages
import { JudgeDashboardPage } from './pages/judge/JudgeDashboardPage';
import { JudgeTopicsPage } from './pages/judge/JudgeTopicsPage';
import { JudgeResultsPage } from './pages/judge/JudgeResultsPage';
import { JudgingWorkspace } from './pages/JudgingWorkspace';
import { Scoreboard } from './pages/Scoreboard';

// Mentor Pages
import { MentorDashboardPage } from './pages/mentor/MentorDashboardPage';
import { MentorTicketsPage } from './pages/mentor/MentorTicketsPage';
import { MentorTeamsPage } from './pages/mentor/MentorTeamsPage';
import { MentorCheckpointsPage } from './pages/mentor/MentorCheckpointsPage';

const ROUTE_TITLES: Record<string, string> = {
  '/login': 'Đăng nhập hệ thống',
  '/auth/callback': 'Xác thực tài khoản GitHub',
  '/rejected': 'Trạng thái hồ sơ',
  '/onboarding': 'Hoàn thiện hồ sơ cá nhân',
  '/profile': 'Hồ sơ cá nhân',
  '/': 'Tổng quan',
  '/dashboard': 'Tổng quan',
  '/teams': 'Đội thi của tôi',
  '/topics': 'Chọn đề tài',
  '/checkpoints': 'Tiến độ các chặng',
  '/final-submission': 'Nộp bài chung cuộc',
  '/scoreboard': 'Bảng xếp hạng',
  '/tickets': 'Hỗ trợ trực tuyến',
  // Admin
  '/admin': 'Tổng quan Quản trị',
  '/admin/dashboard': 'Tổng quan Quản trị',
  '/admin/approvals': 'Phê duyệt tài khoản',
  '/admin/whitelist': 'Danh sách hợp lệ',
  '/admin/teams': 'Quản lý Đội thi',
  '/admin/topics': 'Quản lý Đề tài',
  '/admin/checkpoints': 'Cấu hình chặng nộp',
  '/admin/criteria': 'Tiêu chí chấm điểm',
  '/admin/personnel': 'Giám khảo & Cố vấn',
  '/admin/results': 'Kết quả & Công bố',
  '/admin/announcements': 'Phát thông báo',
  '/admin/config': 'Cấu hình cuộc thi',
  // Judge
  '/judge': 'Tổng quan Chấm thi',
  '/judge/dashboard': 'Tổng quan Chấm thi',
  '/judge/split-screen': 'Chấm song song',
  '/judging': 'Không gian Giám khảo Chấm thi (Split-screen)',
  '/judge/topics': 'Đề tài & Đội thi',
  '/judge/results': 'Bảng tổng hợp điểm',
  // Mentor
  '/mentor': 'Tổng quan Cố vấn',
  '/mentor/dashboard': 'Tổng quan Cố vấn',
  '/mentor/tickets': 'Yêu cầu hỗ trợ',
  '/mentor/teams': 'Đội thi phụ trách',
  '/mentor/checkpoints': 'Tiến độ các chặng',
};

const RootTitleLayout: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const cleanPath = location.pathname.replace(/\/+$/, '') || '/';
    const pageTitle = ROUTE_TITLES[cleanPath] || 'Cổng quản lý Hackathon';
    document.title = `${pageTitle} — HackFlow`;

    let iconLink = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      document.head.appendChild(iconLink);
    }
    iconLink.type = 'image/svg+xml';
    iconLink.href = '/hackflow-logo.svg';
  }, [location.pathname]);

  return <Outlet />;
};

const RoleRootPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === 'judge') return <Navigate to="/judge/dashboard" replace />;
  if (user?.role === 'mentor') return <Navigate to="/mentor/dashboard" replace />;
  return <CandidateDashboardPage />;
};

const AdaptiveProfilePage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  if (user?.role === 'candidate' && user?.approvalStatus !== 'approved') {
    return <OnboardingPage />;
  }
  return <CandidateProfilePage />;
};

const FallbackRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'candidate' && user.approvalStatus === 'pending') {
    return <Navigate to="/onboarding" replace />;
  }
  if (user.role === 'candidate' && user.approvalStatus === 'rejected') {
    return <Navigate to="/rejected" replace />;
  }
  const homeByRole = {
    admin: '/admin/dashboard',
    judge: '/judge/dashboard',
    mentor: '/mentor/dashboard',
    candidate: '/dashboard',
  }[user.role];
  return <Navigate to={homeByRole || '/dashboard'} replace />;
};

const router = createBrowserRouter([
  {
element: <RootTitleLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/auth/callback', element: <AuthCallback /> },
      { path: '/rejected', element: <RejectedAccountPage /> },
      {
        path: '/preview-teams',
        element: (
          <div className="min-h-screen bg-[#060911] text-slate-100 p-4 sm:p-6 lg:p-8">
            <TeamsPage />
          </div>
        ),
      },
      {
        path: '/preview-topics',
        element: (
          <div className="min-h-screen bg-[#080D18] text-slate-100 p-4 sm:p-6 lg:p-8">
            <TopicsPage />
          </div>
        ),
      },
      {
        path: '/preview-checkpoints',
        element: (
          <div className="min-h-screen bg-[#080D18] text-slate-100 p-4 sm:p-6 lg:p-8">
            <CandidateCheckpointsPage />
          </div>
        ),
      },
      {
        path: '/preview-ui',
        element: <UIPreviewPage />,
      },
      {
        path: '/preview-judging',
        element: (
          <div className="min-h-screen bg-[#080D18] text-slate-100 p-4 sm:p-6 lg:p-8">
            <JudgingWorkspace />
          </div>
        ),
      },

      {
        element: <MainLayout />,
        children: [
          { path: '/onboarding', element: <OnboardingPage /> },
          { path: '/profile', element: <AdaptiveProfilePage /> },
          {
            element: <ProtectedRoute requiredApprovalStatus="approved" />,
            children: [
              // Candidate Routes
              { path: '/', element: <RoleRootPage /> },
              { path: '/dashboard', element: <CandidateDashboardPage /> },
              { path: '/teams', element: <TeamsPage /> },
              { path: '/topics', element: <TopicsPage /> },
              { path: '/checkpoints', element: <CandidateCheckpointsPage /> },
              { path: '/final-submission', element: <CandidateFinalSubmissionPage /> },
              { path: '/scoreboard', element: <Scoreboard /> },
              { path: '/tickets', element: <CandidateTicketsPage /> },

              // Admin Routes
              { path: '/admin', element: <AdminDashboardPage /> },
              { path: '/admin/dashboard', element: <AdminDashboardPage /> },
              { path: '/admin/approvals', element: <AdminApprovalsPage /> },
              { path: '/admin/whitelist', element: <AdminWhitelistPage /> },
              { path: '/admin/teams', element: <AdminTeamsPage /> },
              { path: '/admin/topics', element: <AdminTopicsPage /> },
              { path: '/admin/checkpoints', element: <AdminCheckpointsPage /> },
              { path: '/admin/criteria', element: <AdminCriteriaPage /> },
              { path: '/admin/personnel', element: <AdminMentorsJudgesPage /> },
              { path: '/admin/results', element: <AdminResultsPage /> },
              { path: '/admin/announcements', element: <AdminAnnouncementsPage /> },
              { path: '/admin/config', element: <AdminConfigPage /> },

              // Judge Routes
              { path: '/judge', element: <JudgeDashboardPage /> },
              { path: '/judge/dashboard', element: <JudgeDashboardPage /> },
              { path: '/judge/split-screen', element: <JudgingWorkspace /> },
              { path: '/judging', element: <JudgingWorkspace /> },
              { path: '/judge/topics', element: <JudgeTopicsPage /> },
              { path: '/judge/results', element: <JudgeResultsPage /> },

              // Mentor Routes
              { path: '/mentor', element: <MentorDashboardPage /> },
              { path: '/mentor/dashboard', element: <MentorDashboardPage /> },
              { path: '/mentor/tickets', element: <MentorTicketsPage /> },
              { path: '/mentor/teams', element: <MentorTeamsPage /> },
              { path: '/mentor/checkpoints', element: <MentorCheckpointsPage /> },
            ],
          },
        ],
      },

      { path: '*', element: <FallbackRedirect /> },

    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
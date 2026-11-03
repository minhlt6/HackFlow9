import React, { Suspense, lazy, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { RejectedAccountPage } from './pages/RejectedAccountPage';
import { AuthCallback } from './pages/AuthCallback';
import { MainLayout } from './layouts/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/useAuthStore';

// Candidate & Shared Pages (Lazy-loaded per route)
const TeamsPage = lazy(() => import('./pages/TeamsPage').then((m) => ({ default: m.TeamsPage })));
const CandidateDashboardPage = lazy(() =>
  import('./pages/candidate/CandidateDashboardPage').then((m) => ({ default: m.CandidateDashboardPage })),
);
const CandidateCheckpointsPage = lazy(() =>
  import('./pages/candidate/candidateCheckpointsPage').then((m) => ({ default: m.CandidateCheckpointsPage })),
);
const TopicsPage = lazy(() => import('./pages/TopicsPage').then((m) => ({ default: m.TopicsPage })));
const CandidateFinalSubmissionPage = lazy(() =>
  import('./pages/candidate/CandidateFinalSubmissionPage').then((m) => ({ default: m.CandidateFinalSubmissionPage })),
);
const CandidateProfilePage = lazy(() =>
  import('./pages/candidate/CandidateProfilePage').then((m) => ({ default: m.CandidateProfilePage })),
);

// Admin Pages (Lazy-loaded per route)
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminApprovalsPage = lazy(() =>
  import('./pages/admin/AdminApprovalsPage').then((m) => ({ default: m.AdminApprovalsPage })),
);
const AdminWhitelistPage = lazy(() =>
  import('./pages/admin/AdminWhitelistPage').then((m) => ({ default: m.AdminWhitelistPage })),
);
const AdminTeamsPage = lazy(() =>
  import('./pages/admin/AdminTeamsPage').then((m) => ({ default: m.AdminTeamsPage })),
);
const AdminTopicsPage = lazy(() =>
  import('./pages/admin/AdminTopicsPage').then((m) => ({ default: m.AdminTopicsPage })),
);
const AdminCheckpointsPage = lazy(() =>
  import('./pages/admin/AdminCheckpointsPage').then((m) => ({ default: m.AdminCheckpointsPage })),
);
const AdminCriteriaPage = lazy(() =>
  import('./pages/admin/AdminCriteriaPage').then((m) => ({ default: m.AdminCriteriaPage })),
);
const AdminMentorsJudgesPage = lazy(() =>
  import('./pages/admin/AdminMentorsJudgesPage').then((m) => ({ default: m.AdminMentorsJudgesPage })),
);
const AdminResultsPage = lazy(() =>
  import('./pages/admin/AdminResultsPage').then((m) => ({ default: m.AdminResultsPage })),
);
const AdminAnnouncementsPage = lazy(() =>
  import('./pages/admin/AdminAnnouncementsPage').then((m) => ({ default: m.AdminAnnouncementsPage })),
);
const AdminConfigPage = lazy(() =>
  import('./pages/admin/AdminConfigPage').then((m) => ({ default: m.AdminConfigPage })),
);

// Judge Pages (Lazy-loaded per route)
const JudgeDashboardPage = lazy(() =>
  import('./pages/judge/JudgeDashboardPage').then((m) => ({ default: m.JudgeDashboardPage })),
);
const JudgeTopicsPage = lazy(() =>
  import('./pages/judge/JudgeTopicsPage').then((m) => ({ default: m.JudgeTopicsPage })),
);
const JudgeResultsPage = lazy(() =>
  import('./pages/judge/JudgeResultsPage').then((m) => ({ default: m.JudgeResultsPage })),
);
const JudgingWorkspace = lazy(() =>
  import('./pages/JudgingWorkspace').then((m) => ({ default: m.JudgingWorkspace })),
);
const Scoreboard = lazy(() => import('./pages/Scoreboard').then((m) => ({ default: m.Scoreboard })));
const SupportTickets = lazy(() =>
  import('./pages/SupportTickets').then((m) => ({ default: m.SupportTickets })),
);

// Mentor Pages (Lazy-loaded per route)
const MentorDashboardPage = lazy(() =>
  import('./pages/mentor/MentorDashboardPage').then((m) => ({ default: m.MentorDashboardPage })),
);
const MentorTeamsPage = lazy(() =>
  import('./pages/mentor/MentorTeamsPage').then((m) => ({ default: m.MentorTeamsPage })),
);
const MentorCheckpointsPage = lazy(() =>
  import('./pages/mentor/MentorCheckpointsPage').then((m) => ({ default: m.MentorCheckpointsPage })),
);

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

  return (
    <Suspense fallback={null}>
      <Outlet />
    </Suspense>
  );
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
        element: <MainLayout />,
        children: [
          { path: '/onboarding', element: <OnboardingPage /> },
          { path: '/profile', element: <AdaptiveProfilePage /> },
          {
            element: <ProtectedRoute requiredApprovalStatus="approved" />,
            children: [
              // Shared Routes across Approved Roles
              { path: '/', element: <RoleRootPage /> },
              { path: '/scoreboard', element: <Scoreboard /> },
              { path: '/tickets', element: <SupportTickets /> },

              // Candidate Routes
              {
                element: <ProtectedRoute requiredApprovalStatus="approved" allowedRoles={['candidate', 'admin']} />,
                children: [
                  { path: '/dashboard', element: <CandidateDashboardPage /> },
                  { path: '/teams', element: <TeamsPage /> },
                  { path: '/topics', element: <TopicsPage /> },
                  { path: '/checkpoints', element: <CandidateCheckpointsPage /> },
                  { path: '/final-submission', element: <CandidateFinalSubmissionPage /> },
                ],
              },

              // Admin Routes (Strict RBAC: Admin Only)
              {
                element: <ProtectedRoute requiredApprovalStatus="approved" allowedRoles={['admin']} />,
                children: [
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
                ],
              },

              // Judge Routes (Strict RBAC: Judge & Admin)
              {
                element: <ProtectedRoute requiredApprovalStatus="approved" allowedRoles={['judge', 'admin']} />,
                children: [
                  { path: '/judge', element: <JudgeDashboardPage /> },
                  { path: '/judge/dashboard', element: <JudgeDashboardPage /> },
                  { path: '/judge/split-screen', element: <JudgingWorkspace /> },
                  { path: '/judging', element: <JudgingWorkspace /> },
                  { path: '/judge/topics', element: <JudgeTopicsPage /> },
                  { path: '/judge/results', element: <JudgeResultsPage /> },
                ],
              },

              // Mentor Routes (Strict RBAC: Mentor & Admin)
              {
                element: <ProtectedRoute requiredApprovalStatus="approved" allowedRoles={['mentor', 'admin']} />,
                children: [
                  { path: '/mentor', element: <MentorDashboardPage /> },
                  { path: '/mentor/dashboard', element: <MentorDashboardPage /> },
                  { path: '/mentor/tickets', element: <SupportTickets /> },
                  { path: '/mentor/teams', element: <MentorTeamsPage /> },
                  { path: '/mentor/checkpoints', element: <MentorCheckpointsPage /> },
                ],
              },
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

import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { RejectedAccountPage } from './pages/RejectedAccountPage';
import { AuthCallback } from './pages/AuthCallback';
import { TeamsPage } from './pages/TeamsPage';
import { DashboardPage } from './pages/DashboardPage';
import { CandidateCheckpointsPage } from './pages/candidate/candidateCheckpointsPage';
import { CandidateTopicsPage } from './pages/candidate/CandidateTopicsPage';
import { CandidateFinalSubmissionPage } from './pages/candidate/CandidateFinalSubmissionPage';
import { CandidateLeaderboardPage } from './pages/candidate/CandidateLeaderboardPage';
import { CandidateTicketsPage } from './pages/candidate/CandidateTicketsPage';
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
import { JudgeSplitScreenPage } from './pages/judge/JudgeSplitScreenPage';
import { JudgeTopicsPage } from './pages/judge/JudgeTopicsPage';
import { JudgeResultsPage } from './pages/judge/JudgeResultsPage';

// Mentor Pages
import { MentorDashboardPage } from './pages/mentor/MentorDashboardPage';
import { MentorTicketsPage } from './pages/mentor/MentorTicketsPage';
import { MentorTeamsPage } from './pages/mentor/MentorTeamsPage';
import { MentorCheckpointsPage } from './pages/mentor/MentorCheckpointsPage';

const RoleRootPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === 'judge') return <Navigate to="/judge/dashboard" replace />;
  if (user?.role === 'mentor') return <Navigate to="/mentor/dashboard" replace />;
  return <DashboardPage />;
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
    element: <MainLayout />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },
      { path: '/profile', element: <OnboardingPage /> },
      {
        element: <ProtectedRoute requiredApprovalStatus="approved" />,
        children: [
          // Candidate Routes
          { path: '/', element: <RoleRootPage /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/teams', element: <TeamsPage /> },
          { path: '/topics', element: <CandidateTopicsPage /> },
          { path: '/checkpoints', element: <CandidateCheckpointsPage /> },
          { path: '/final-submission', element: <CandidateFinalSubmissionPage /> },
          { path: '/scoreboard', element: <CandidateLeaderboardPage /> },
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
          { path: '/judge/split-screen', element: <JudgeSplitScreenPage /> },
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
]);

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { RejectedAccountPage } from './pages/RejectedAccountPage';
import { MainLayout } from './layouts/MainLayout';

// Candidate Pages
import { CandidateDashboardPage } from './pages/candidate/CandidateDashboardPage';
import { CandidateTeamsPage } from './pages/candidate/CandidateTeamsPage';
import { CandidateTopicsPage } from './pages/candidate/CandidateTopicsPage';
import { CandidateCheckpointsPage } from './pages/candidate/CandidateCheckpointsPage';
import { CandidateFinalSubmissionPage } from './pages/candidate/CandidateFinalSubmissionPage';
import { CandidateLeaderboardPage } from './pages/candidate/CandidateLeaderboardPage';
import { CandidateTicketsPage } from './pages/candidate/CandidateTicketsPage';
import { CandidateProfilePage } from './pages/candidate/CandidateProfilePage';

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

const router = createBrowserRouter([
  // Public Authentication Pages
  { path: '/login', element: <LoginPage /> },
  { path: '/onboarding', element: <OnboardingPage /> },
  { path: '/rejected', element: <RejectedAccountPage /> },

  // Authenticated Application with Dark Master Layout
  {
    element: <MainLayout />,
    children: [
      // Candidate Routes
      { path: '/', element: <CandidateDashboardPage /> },
      { path: '/dashboard', element: <CandidateDashboardPage /> },
      { path: '/teams', element: <CandidateTeamsPage /> },
      { path: '/topics', element: <CandidateTopicsPage /> },
      { path: '/checkpoints', element: <CandidateCheckpointsPage /> },
      { path: '/final-submission', element: <CandidateFinalSubmissionPage /> },
      { path: '/scoreboard', element: <CandidateLeaderboardPage /> },
      { path: '/tickets', element: <CandidateTicketsPage /> },
      { path: '/profile', element: <CandidateProfilePage /> },

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

  // Fallback
  { path: '*', element: <Navigate to="/login" replace /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
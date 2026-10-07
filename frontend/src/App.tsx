import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/rejected" element={<RejectedAccountPage />} />

        {/* Authenticated Application with Dark Master Layout */}
        <Route element={<MainLayout />}>
          {/* Candidate Routes */}
          <Route path="/" element={<CandidateDashboardPage />} />
          <Route path="/dashboard" element={<CandidateDashboardPage />} />
          <Route path="/teams" element={<CandidateTeamsPage />} />
          <Route path="/topics" element={<CandidateTopicsPage />} />
          <Route path="/checkpoints" element={<CandidateCheckpointsPage />} />
          <Route path="/final-submission" element={<CandidateFinalSubmissionPage />} />
          <Route path="/scoreboard" element={<CandidateLeaderboardPage />} />
          <Route path="/tickets" element={<CandidateTicketsPage />} />
          <Route path="/profile" element={<CandidateProfilePage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/approvals" element={<AdminApprovalsPage />} />
          <Route path="/admin/whitelist" element={<AdminWhitelistPage />} />
          <Route path="/admin/teams" element={<AdminTeamsPage />} />
          <Route path="/admin/topics" element={<AdminTopicsPage />} />
          <Route path="/admin/checkpoints" element={<AdminCheckpointsPage />} />
          <Route path="/admin/criteria" element={<AdminCriteriaPage />} />
          <Route path="/admin/personnel" element={<AdminMentorsJudgesPage />} />
          <Route path="/admin/results" element={<AdminResultsPage />} />
          <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
          <Route path="/admin/config" element={<AdminConfigPage />} />

          {/* Judge Routes */}
          <Route path="/judge" element={<JudgeDashboardPage />} />
          <Route path="/judge/dashboard" element={<JudgeDashboardPage />} />
          <Route path="/judge/split-screen" element={<JudgeSplitScreenPage />} />
          <Route path="/judge/topics" element={<JudgeTopicsPage />} />
          <Route path="/judge/results" element={<JudgeResultsPage />} />

          {/* Mentor Routes */}
          <Route path="/mentor" element={<MentorDashboardPage />} />
          <Route path="/mentor/dashboard" element={<MentorDashboardPage />} />
          <Route path="/mentor/tickets" element={<MentorTicketsPage />} />
          <Route path="/mentor/teams" element={<MentorTeamsPage />} />
          <Route path="/mentor/checkpoints" element={<MentorCheckpointsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { RejectedAccountPage } from './pages/RejectedAccountPage';
import { AuthCallback } from './pages/AuthCallback';
import { DashboardPage } from './pages/DashboardPage';
import { TeamsPage } from './pages/TeamsPage';
import { TopicsPage } from './pages/TopicsPage';
import { CandidateCheckpointsPage } from './pages/candidate/candidateCheckpointsPage';
import { UIPreviewPage } from './pages/UIPreviewPage';
import { MainLayout } from './layouts/MainLayout';

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
    element: <MainLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/teams', element: <TeamsPage /> },
      { path: '/topics', element: <TopicsPage /> },
      { path: '/checkpoints', element: <CandidateCheckpointsPage /> },
      { path: '/onboarding', element: <OnboardingPage /> },
      { path: '/profile', element: <OnboardingPage /> },
    ],
  },

  { path: '*', element: <Navigate to="/login" replace /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
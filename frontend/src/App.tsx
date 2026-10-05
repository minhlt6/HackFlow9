import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { AuthCallback } from './pages/AuthCallback'; // <-- 1. Import trang callback OAuth
import { OnboardingPage } from './pages/OnboardingPage';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { TeamsPage } from './pages/TeamsPage';
import { UIPreviewPage } from './pages/UIPreviewPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route công khai */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Route hứng callback sau khi GitHub OAuth thành công */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Route test UI Atoms tạm thời cho task HF-13 */}
        <Route path="/preview" element={<UIPreviewPage />} />

        {/* Route onboarding cho tài khoản pending */}
        <Route element={<ProtectedRoute requiredApprovalStatus="pending" />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>

        {/* Các route dành cho candidate đã được approved */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['candidate']}
              requiredApprovalStatus="approved"
            />
          }
        >
          <Route path="/" element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="topics" element={<div className="p-6 text-xl font-bold text-slate-900">Trang Đề tài (Topics)</div>} />
            <Route path="submissions" element={<div className="p-6 text-xl font-bold text-slate-900">Trang Bài nộp (Submissions)</div>} />
            <Route path="projects" element={<div className="p-6 text-xl font-bold text-slate-900">Trang Quản lý Đề tài</div>} />
            <Route path="checkpoints" element={<div className="p-6 text-xl font-bold text-slate-900">Trang Checkpoint</div>} />
            <Route path="scoreboard" element={<div className="p-6 text-xl font-bold text-slate-900">Trang Bảng điểm</div>} />
          </Route>
        </Route>

        {/* Phân quyền theo Role */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} requiredApprovalStatus="approved" />}>
          <Route path="/admin/*" element={<div className="p-8 text-2xl font-bold text-red-600">Khu vực Quản trị hệ thống (Admin Area)</div>} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['judge']} requiredApprovalStatus="approved" />}>
          <Route path="/judge/*" element={<div className="p-8 text-2xl font-bold text-blue-600">Khu vực Giám khảo chấm thi (Judge Area)</div>} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['mentor']} requiredApprovalStatus="approved" />}>
          <Route path="/mentor/*" element={<div className="p-8 text-2xl font-bold text-green-600">Khu vực Mentor hỗ trợ (Mentor Area)</div>} />
        </Route>

        {/* Trang 404 / Điều hướng mặc định */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
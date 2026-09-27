import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { TeamsPage } from './pages/TeamsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="projects" element={<div className="p-6 text-xl font-bold text-slate-900">Trang Quản lý Đề tài</div>} />
          <Route path="checkpoints" element={<div className="p-6 text-xl font-bold text-slate-900">Trang Checkpoint</div>} />
          <Route path="scoreboard" element={<div className="p-6 text-xl font-bold text-slate-900">Trang Bảng điểm</div>} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
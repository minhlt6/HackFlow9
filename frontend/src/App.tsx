import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './pages/DashboardPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route đăng nhập đúng yêu cầu */}
        <Route path="/login" element={<LoginPage />} />

        {/* Khung giao diện chính chứa Sidebar & Header */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="teams" element={<div className="p-6 text-xl font-bold">Trang Quản lý Đội thi</div>} />
          <Route path="projects" element={<div className="p-6 text-xl font-bold">Trang Quản lý Đề tài</div>} />
          <Route path="checkpoints" element={<div className="p-6 text-xl font-bold">Trang Checkpoint</div>} />
          <Route path="scoreboard" element={<div className="p-6 text-xl font-bold">Trang Bảng điểm</div>} />
        </Route>

        {/* Điều hướng mặc định */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
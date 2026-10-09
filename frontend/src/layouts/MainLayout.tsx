import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, CheckSquare, Award, Bell, Lock } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const MainLayout: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isPending = user?.approvalStatus === 'pending';

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-5 text-xl font-bold border-b border-slate-800 text-blue-400">
          HackFlow
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors">
            <LayoutDashboard size={20} />
            <span>Tổng quan</span>
          </Link>
          {isPending ? (
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-lg opacity-50 cursor-not-allowed text-slate-400 select-none"
              title="Chức năng Đội thi sẽ mở sau khi hồ sơ được duyệt"
            >
              <div className="flex items-center gap-3">
                <Users size={20} />
                <span>Đội thi</span>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                <Lock size={10} /> Khóa
              </span>
            </div>
          ) : (
            <Link to="/teams" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors">
              <Users size={20} />
              <span>Đội thi</span>
            </Link>
          )}
          <Link to="/projects" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors">
            <FileText size={20} />
            <span>Đề tài</span>
          </Link>
          <Link to="/checkpoints" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors">
            <CheckSquare size={20} />
            <span>Checkpoint</span>
          </Link>
          <Link to="/scoreboard" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors">
            <Award size={20} />
            <span>Bảng điểm</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header cố định, icon chuông, avatar tạm thời */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
          <div className="font-semibold text-gray-800">Hệ thống quản lý Hackathon</div>
          <div className="flex items-center gap-4">
            <button className="text-gray-500 hover:text-gray-700 relative">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">3</span>
            </button>
            <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
              HL
            </div>
          </div>
        </header>

        {/* Vùng nội dung dùng <Outlet /> của React Router */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
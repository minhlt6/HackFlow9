import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Lightbulb,
  CheckSquare,
  Award,
  Send,
  HelpCircle,
  User,
  LogOut,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import { Badge } from '../components/Badge';
import { useAuthStore } from '../store/useAuthStore';

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.fullName || 'Nguyễn Văn Minh';
  const displayEmail = user?.email || 'leader@cybersamurai.team';
  const displayInitial = displayName.charAt(0).toUpperCase();

  const navLinks = [
    { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/teams', label: 'Đội thi của tôi', icon: Users },
    { to: '/topics', label: 'Chọn đề tài', icon: Lightbulb },
    { to: '/checkpoints', label: 'Tiến độ các chặng', icon: CheckSquare },
    { to: '/final-submission', label: 'Nộp bài chung cuộc', icon: Send },
    { to: '/scoreboard', label: 'Bảng xếp hạng', icon: Award },
    { to: '/tickets', label: 'Hỗ trợ trực tuyến', icon: HelpCircle },
    { to: '/profile', label: 'Hồ sơ cá nhân', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#080D18] text-slate-100 flex font-['Roboto'] antialiased">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0B1120] border-r border-[#1E293B] flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#6366F1] shadow-md shadow-[#6366F1]"></span>
            <span
              className="font-['Righteous'] text-2xl tracking-wider"
              style={{
                background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              HACKFLOW
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current Role Banner */}
        <div className="p-4 mx-3 my-3 rounded-[12px] bg-[#1E293B] border border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6366F1]/20 border border-[#6366F1]/40 text-[#818CF8] font-bold">
              {displayInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="success" size="sm">
                  Thí sinh
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/40 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-[#1E293B]/70'
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#1E293B]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-[10px] border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>Đăng xuất ({displayName})</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <header className="h-16 bg-[#0B1120] border-b border-[#1E293B] sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <Menu size={22} />
            </button>
            <div className="hidden sm:block">
              <span className="text-xs font-bold tracking-wider text-slate-300 font-mono">
                HACKFLOW AI &amp; DEEP TECH HACKATHON 2026
              </span>
              <span className="text-[11px] text-slate-400 block">
                Giai đoạn: Giai đoạn 2: Thực thi dự án &amp; Nộp bài các chặng
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Sync</span>
            </div>

            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors relative"
            >
              <Bell size={18} />
            </button>

            <div className="flex items-center gap-3 pl-2 border-l border-[#1E293B]">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-white">{displayName}</p>
                <p className="text-[10px] text-slate-400">{displayEmail}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6366F1] text-white font-bold text-xs shadow-md">
                {displayInitial}
              </div>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-[#080D18]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
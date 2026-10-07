import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useMockStore } from '../store/useMockStore';
import { QuickRoleSwitcher } from '../components/common/QuickRoleSwitcher';
import { Badge } from '../components/Badge';
import {
  LayoutDashboard,
  Users,
  Lightbulb,
  CheckSquare,
  Award,
  Send,
  HelpCircle,
  User,
  ShieldCheck,
  ListOrdered,
  FileSpreadsheet,
  Megaphone,
  Settings,
  Scale,
  Columns,
  GraduationCap,
  EyeOff,
  LogOut,
  Bell,
  Menu,
  X,
} from 'lucide-react';

export const MainLayout: React.FC = () => {
  const { currentUser, isAuthenticated, logout, config, announcements } = useMockStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const navigate = useNavigate();

  // If user is not authenticated, bounce to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Nav Items configured per role
  const candidateNav = [
    { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/teams', label: 'Đội thi của tôi', icon: Users },
    { to: '/topics', label: 'Chọn đề tài & Quota', icon: Lightbulb },
    { to: '/checkpoints', label: 'Checkpoints tiến độ', icon: CheckSquare },
    { to: '/final-submission', label: 'Nộp bài chung cuộc', icon: Send },
    { to: '/scoreboard', label: 'Bảng xếp hạng', icon: Award },
    { to: '/tickets', label: 'Hỗ trợ Helpdesk', icon: HelpCircle },
    { to: '/profile', label: 'Hồ sơ cá nhân', icon: User },
  ];

  const adminNav = [
    { to: '/admin/dashboard', label: 'Tổng quan Quản trị', icon: LayoutDashboard },
    { to: '/admin/approvals', label: 'Duyệt tài khoản GitHub', icon: ShieldCheck },
    { to: '/admin/whitelist', label: 'Quản lý Whitelist', icon: ListOrdered },
    { to: '/admin/teams', label: 'Quản lý Đội thi', icon: Users },
    { to: '/admin/topics', label: 'Đề tài & Quota Lock', icon: Lightbulb },
    { to: '/admin/checkpoints', label: 'Cấu hình Checkpoints', icon: CheckSquare },
    { to: '/admin/criteria', label: 'Tiêu chí Rubric Chấm', icon: Scale },
    { to: '/admin/personnel', label: 'Giám khảo & Cố vấn', icon: GraduationCap },
    { to: '/admin/results', label: 'Kết quả & Công bố', icon: Award },
    { to: '/admin/announcements', label: 'Phát thông báo', icon: Megaphone },
    { to: '/admin/config', label: 'Cấu hình Hackathon', icon: Settings },
  ];

  const judgeNav = [
    { to: '/judge/dashboard', label: 'Tổng quan Chấm thi', icon: LayoutDashboard },
    { to: '/judge/split-screen', label: 'Chấm 2 Màn hình', icon: Columns },
    { to: '/judge/topics', label: 'Đề tài & Đội thi', icon: Lightbulb },
    { to: '/judge/results', label: 'Bảng tổng hợp điểm', icon: Award },
  ];

  const mentorNav = [
    { to: '/mentor/dashboard', label: 'Tổng quan Cố vấn', icon: LayoutDashboard },
    { to: '/mentor/tickets', label: 'Tickets Yêu cầu hỗ trợ', icon: HelpCircle },
    { to: '/mentor/teams', label: 'Đội thi phụ trách', icon: Users },
    { to: '/mentor/checkpoints', label: 'Tiến độ Checkpoints', icon: CheckSquare },
  ];

  const navLinks =
    currentUser.role === 'admin'
      ? adminNav
      : currentUser.role === 'judge'
      ? judgeNav
      : currentUser.role === 'mentor'
      ? mentorNav
      : candidateNav;

  const roleLabelMap = {
    admin: 'Quản trị viên',
    candidate: 'Thí sinh',
    judge: 'Giám khảo',
    mentor: 'Cố vấn chuyên môn',
  };

  return (
    <div className="min-h-screen bg-[#080D18] text-slate-100 flex font-['Roboto']">
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
            <img src="/hackflow-logo.svg" alt="Logo" className="h-8 w-8 object-contain" />
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
              {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{currentUser.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge
                  variant={
                    currentUser.role === 'admin'
                      ? 'indigo'
                      : currentUser.role === 'judge'
                      ? 'purple'
                      : currentUser.role === 'mentor'
                      ? 'cyan'
                      : 'success'
                  }
                  size="sm"
                >
                  {roleLabelMap[currentUser.role]}
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
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-[10px] border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors"
          >
            <LogOut size={14} />
            <span>Đăng xuất ({currentUser.fullName})</span>
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
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B]"
            >
              <Menu size={22} />
            </button>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-semibold text-[#818CF8] uppercase tracking-wider">
                {config.name}
              </span>
              <span className="text-xs text-slate-400">Giai đoạn: {config.currentPhase}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Blind Judging Indicator */}
            {config.blindJudgingMode && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
                <EyeOff size={14} />
                <span>Chế độ chấm mù (Blind Judging) BẬT</span>
              </div>
            )}

            {/* Announcements Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAnnouncements(!showAnnouncements)}
                className="relative p-2 rounded-[10px] text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors"
                title="Thông báo mới"
              >
                <Bell size={20} />
                {announcements.length > 0 && (
                  <span className="absolute 1.5 top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#6366F1] ring-2 ring-[#0B1120]" />
                )}
              </button>

              {showAnnouncements && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-[14px] border border-[#334155] bg-[#1E293B] p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
                    <span className="font-['Righteous'] text-base text-white">
                      Thông Báo Ban Tổ Chức
                    </span>
                    <Badge variant="indigo">{announcements.length} tin</Badge>
                  </div>
                  <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className="rounded-[10px] bg-[#0F172A] border border-[#334155] p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{ann.title}</span>
                          <span className="text-[10px] text-slate-400">{ann.createdAt}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{ann.content}</p>
                        <div className="text-[10px] text-[#818CF8] font-medium pt-1">
                          Người gửi: {ann.sender}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-[#1E293B]">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-white">{currentUser.fullName}</span>
                <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                  {currentUser.email}
                </span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6366F1] text-white font-bold text-sm shadow-md">
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-[#080D18] overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Floating Demo Role Switcher Dock */}
      <QuickRoleSwitcher />
    </div>
  );
};
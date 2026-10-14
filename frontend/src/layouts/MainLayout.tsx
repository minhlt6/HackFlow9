import React, { useEffect, useState } from 'react';
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
  ShieldCheck,
  ListOrdered,
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
  Lock,
} from 'lucide-react';
import { Badge } from '../components/Badge';
import { useAuthStore } from '../store/useAuthStore';
import { useMockStore } from '../store/useMockStore';

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const {
    config,
    announcements,
    switchPersona,
    updateCurrentUserProfile,
    logout: mockLogout,
  } = useMockStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const navigate = useNavigate();

  // Synchronize useMockStore persona & profile with the authenticated user from useAuthStore
  useEffect(() => {
    if (!user) return;

    let targetPersona: 'admin' | 'judge' | 'mentor' | 'leader' | 'member' | 'pending' | 'rejected' =
      'leader';

    if (user.role === 'admin') {
      targetPersona = 'admin';
    } else if (user.role === 'judge') {
      targetPersona = 'judge';
    } else if (user.role === 'mentor') {
      targetPersona = 'mentor';
    } else {
      if (user.approvalStatus === 'pending') {
        targetPersona = 'pending';
      } else if (user.approvalStatus === 'rejected') {
        targetPersona = 'rejected';
      } else if (
        user.team_role === 'MEMBER' ||
        user.team_role === 'member' ||
        user.email.toLowerCase().includes('member')
      ) {
        targetPersona = 'member';
      } else {
        targetPersona = 'leader';
      }
    }

    switchPersona(targetPersona);
    updateCurrentUserProfile({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
      githubUsername: user.githubUsername,
      avatarUrl: user.avatarUrl,
    });
  }, [
    user?.id,
    user?.role,
    user?.approvalStatus,
    user?.fullName,
    user?.email,
    user?.githubUsername,
    user?.avatarUrl,
    user?.team_role,
    switchPersona,
    updateCurrentUserProfile,
  ]);

  const handleLogout = () => {
    logout();
    mockLogout();
    navigate('/login');
  };

  const displayName = user?.fullName || 'Nguyễn Văn Minh';
  const displayEmail = user?.email || 'leader@cybersamurai.team';
  const displayInitial = displayName.charAt(0).toUpperCase();

  const currentRole = user?.role || 'candidate';
  const isApproved = currentRole !== 'candidate' || user?.approvalStatus === 'approved';

  const candidateMenuGroups = isApproved
    ? [
        {
          title: 'Dự án & Đội thi',
          items: [
            { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
            { to: '/teams', label: 'Đội thi của tôi', icon: Users },
            { to: '/topics', label: 'Chọn đề tài', icon: Lightbulb },
          ],
        },
        {
          title: 'Tiến trình thi đấu',
          items: [
            { to: '/checkpoints', label: 'Tiến độ các chặng', icon: CheckSquare },
            { to: '/final-submission', label: 'Nộp bài chung cuộc', icon: Send },
            { to: '/scoreboard', label: 'Bảng xếp hạng', icon: Award },
          ],
        },
        {
          title: 'Cá nhân & Trợ giúp',
          items: [
            { to: '/profile', label: 'Hồ sơ cá nhân', icon: User },
            { to: '/tickets', label: 'Hỗ trợ trực tuyến', icon: HelpCircle },
          ],
        },
      ]
    : [
        {
          title: 'Hoàn thiện hồ sơ',
          items: [{ to: '/onboarding', label: 'Hồ sơ cá nhân', icon: User }],
        },
      ];

  const adminMenuGroups = [
    {
      title: 'Quản trị & Xét duyệt',
      items: [
        { to: '/admin/dashboard', label: 'Tổng quan Quản trị', icon: LayoutDashboard },
        { to: '/admin/approvals', label: 'Phê duyệt tài khoản', icon: ShieldCheck },
        { to: '/admin/whitelist', label: 'Danh sách hợp lệ', icon: ListOrdered },
        { to: '/admin/teams', label: 'Quản lý Đội thi', icon: Users },
      ],
    },
    {
      title: 'Nội dung & Chấm thi',
      items: [
        { to: '/admin/topics', label: 'Quản lý Đề tài', icon: Lightbulb },
        { to: '/admin/checkpoints', label: 'Cấu hình chặng nộp', icon: CheckSquare },
        { to: '/admin/criteria', label: 'Tiêu chí chấm điểm', icon: Scale },
        { to: '/admin/personnel', label: 'Giám khảo & Cố vấn', icon: GraduationCap },
        { to: '/admin/results', label: 'Kết quả & Công bố', icon: Award },
      ],
    },
    {
      title: 'Hệ thống & Thông báo',
      items: [
        { to: '/admin/announcements', label: 'Phát thông báo', icon: Megaphone },
        { to: '/admin/config', label: 'Cấu hình cuộc thi', icon: Settings },
      ],
    },
  ];

  const judgeMenuGroups = [
    {
      title: 'Hội đồng Giám khảo',
      items: [
        { to: '/judge/dashboard', label: 'Tổng quan Chấm thi', icon: LayoutDashboard },
        { to: '/judge/split-screen', label: 'Chấm song song', icon: Columns },
        { to: '/judge/topics', label: 'Đề tài & Đội thi', icon: Lightbulb },
        { to: '/judge/results', label: 'Bảng tổng hợp điểm', icon: Award },
      ],
    },
  ];

  const mentorMenuGroups = [
    {
      title: 'Cố vấn chuyên môn',
      items: [
        { to: '/mentor/dashboard', label: 'Tổng quan Cố vấn', icon: LayoutDashboard },
        { to: '/mentor/tickets', label: 'Yêu cầu hỗ trợ', icon: HelpCircle },
        { to: '/mentor/teams', label: 'Đội thi phụ trách', icon: Users },
        { to: '/mentor/checkpoints', label: 'Tiến độ các chặng', icon: CheckSquare },
      ],
    },
  ];

  const menuGroups =
    currentRole === 'admin'
      ? adminMenuGroups
      : currentRole === 'judge'
      ? judgeMenuGroups
      : currentRole === 'mentor'
      ? mentorMenuGroups
      : candidateMenuGroups;

  const roleBadgeMeta: {
    label: string;
    variant: 'indigo' | 'warning' | 'purple' | 'success';
  } =
    currentRole === 'admin'
      ? { label: 'Quản trị viên', variant: 'indigo' }
      : currentRole === 'judge'
      ? { label: 'Giám khảo', variant: 'warning' }
      : currentRole === 'mentor'
      ? { label: 'Cố vấn chuyên môn', variant: 'purple' }
      : {
          label: isApproved ? 'Thí sinh' : 'Chờ duyệt',
          variant: isApproved ? 'success' : 'warning',
        };

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
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0B1120] border-r border-[#1E293B] flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="h-16 px-6 border-b border-[#1E293B] flex items-center justify-between shrink-0">
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
          <div className="p-3.5 mx-3 my-3 rounded-[12px] bg-[#1E293B] border border-[#334155] shrink-0">
            <div className="flex items-center gap-3">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  className="h-10 w-10 shrink-0 rounded-full object-cover border border-[#6366F1]/40"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6366F1]/20 border border-[#6366F1]/40 text-[#818CF8] font-bold">
                  {displayInitial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant={roleBadgeMeta.variant} size="sm">
                    {roleBadgeMeta.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links Grouped */}
          <nav className="flex-1 px-3 py-2 space-y-3 overflow-y-auto">
            {menuGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <div className="px-3.5 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {group.title}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3.5 py-2.5 rounded-[10px] text-xs sm:text-sm font-medium transition-all group ${
                            isActive
                              ? 'bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/40 font-semibold shadow-xs'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-[#1E293B]/70'
                          }`
                        }
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon size={18} className="shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </div>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}

            {currentRole === 'candidate' && !isApproved && (
              <div className="mx-2 mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-xs text-amber-200/90 leading-relaxed space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <Lock size={13} className="shrink-0" />
                  <span>Đang chờ BTC phê duyệt</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Các chức năng Tổng quan, Đội thi, Chọn đề tài và Nộp bài sẽ tự động hiển thị sau khi hồ sơ của bạn được duyệt.
                </p>
              </div>
            )}
          </nav>
        </div>

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
                {config?.name || 'HACKFLOW AI & DEEPTECH HACKATHON 2026'}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {config?.currentPhase || 'Giai đoạn 3: Thực thi dự án và Nộp bài các chặng'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {config?.blindJudgingMode && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
                <EyeOff size={14} />
                <span>Chấm ẩn danh: BẬT</span>
              </div>
            )}

            <div className="hidden md:flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Sync</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAnnouncements((prev) => !prev)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors relative cursor-pointer"
                title="Thông báo mới"
              >
                <Bell size={18} />
                {announcements.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#6366F1] ring-2 ring-[#0B1120]" />
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

            <div className="flex items-center gap-3 pl-2 border-l border-[#1E293B]">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-white">{displayName}</p>
                <p className="text-[10px] text-slate-400">{displayEmail}</p>
              </div>
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  className="h-8 w-8 rounded-full object-cover border border-[#6366F1]/40 shadow-md"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6366F1] text-white font-bold text-xs shadow-md">
                  {displayInitial}
                </div>
              )}
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
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Lightbulb,
  CheckSquare,
  Send,
  Award,
  HelpCircle,
  UserRound,
  LogOut,
  Bell,
  Save,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Button } from '../components/Button';
import { profileApi } from '../api/profileApi';
import { useAuthStore } from '../store/useAuthStore';
import type { ApprovalStatus, UserRole } from '../types';
import type { ProfileFieldErrors, ProfileForm } from '../types/profile';

const initialForm: ProfileForm = { fullName: '', studentId: '', university: '', phone: '', skills: [] };
const skillOptions = [
  'Frontend (FE)',
  'Backend (BE)',
  'UI/UX Design',
  'AI / Machine Learning',
  'Computer Vision',
  'Mobile App',
  'DevOps / Cloud',
  'Fullstack',
  'Data Science',
];

const rolePaths: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  judge: '/judge',
  mentor: '/mentor',
  candidate: '/dashboard',
};

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout, login } = useAuthStore();
  const activeUser = user || {
    id: 'candidate-demo-1',
    email: 'leader@cybersamurai.team',
    fullName: 'Nguyễn Văn Minh',
    role: 'candidate' as UserRole,
    approvalStatus: 'pending' as ApprovalStatus,
  };

  const [form, setForm] = useState<ProfileForm>(() => ({
    ...initialForm,
    fullName: activeUser.fullName,
    studentId: '20210001',
    university: 'Đại học Bách Khoa Hà Nội',
    phone: '0901234567',
    skills: ['AI / Machine Learning', 'Computer Vision'],
  }));
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [customSkill, setCustomSkill] = useState('');
  const [status, setStatus] = useState<ApprovalStatus>(activeUser.approvalStatus || 'pending');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      login(activeUser, 'mock-dev-token-2026');
    }
  }, [user, login]);

  const updateField = (field: Exclude<keyof ProfileForm, 'skills'>, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const toggleSkill = (skill: string) => {
    setForm((current) => ({
      ...current,
      skills: current.skills.includes(skill)
        ? current.skills.filter((item) => item !== skill)
        : [...current.skills, skill],
    }));
    setErrors((current) => ({ ...current, skills: undefined }));
  };

  const addCustomSkill = () => {
    const skill = customSkill.trim();
    if (!skill) return;
    setForm((current) => ({
      ...current,
      skills: current.skills.includes(skill) ? current.skills : [...current.skills, skill],
    }));
    setCustomSkill('');
    setErrors((current) => ({ ...current, skills: undefined }));
  };

  const validate = (): ProfileFieldErrors => {
    const next: ProfileFieldErrors = {};
    if (form.fullName.trim().length < 2) next.fullName = 'Họ tên phải có ít nhất 2 ký tự.';
    if (!/^\d+$/.test(form.studentId.trim())) next.studentId = 'MSSV chỉ được chứa chữ số.';
    if (!form.university.trim()) next.university = 'Vui lòng nhập Trường / Viện.';
    if (!/^0\d{9}$/.test(form.phone.trim())) next.phone = 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0.';
    if (!form.skills.length) next.skills = 'Vui lòng chọn ít nhất một chuyên môn kỹ thuật.';
    if (form.skills.join(', ').length > 500) next.skills = 'Danh sách kỹ năng không được vượt quá 500 ký tự.';
    return next;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      const result = await profileApi.submit({
        full_name: form.fullName.trim(),
        student_id: form.studentId.trim(),
        school: form.university.trim(),
        phone: form.phone.trim(),
        skills: form.skills,
      });

      const nextStatus = (
        result.approvalStatus ||
        result.approval_status ||
        result.user?.approvalStatus ||
        result.user?.approval_status ||
        'pending'
      ).toLowerCase() as ApprovalStatus;

      const rawRole = (result.role || result.user?.role || user?.role || 'candidate').toLowerCase();
      const mappedRole: UserRole =
        rawRole === 'candidate' || rawRole === 'admin' || rawRole === 'judge' || rawRole === 'mentor'
          ? (rawRole as UserRole)
          : 'candidate';

      setStatus(nextStatus);
      updateUser({ approvalStatus: nextStatus, role: mappedRole });

      if (nextStatus === 'approved') {
        setSuccessMessage('Hồ sơ đã được duyệt thành công! Đang chuyển hướng đến không gian thi đấu...');
        window.setTimeout(() => navigate(rolePaths[mappedRole], { replace: true }), 900);
      } else if (nextStatus === 'rejected') {
        setErrorMessage(
          result.rejectionReason ||
            result.rejection_reason ||
            result.reason ||
            result.message ||
            'Hồ sơ chưa được phê duyệt. Vui lòng cập nhật lại thông tin theo yêu cầu của BTC.',
        );
      } else {
        setSuccessMessage(result.message || 'Lưu thông tin thành công. Hồ sơ đang được Ban Tổ Chức xét duyệt!');
      }
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : null;
      setErrorMessage(message || 'Không thể gửi hồ sơ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const displayedSkills = [...skillOptions, ...form.skills.filter((skill) => !skillOptions.includes(skill))];
  const userInitial = (form.fullName.trim() || user?.fullName || 'N').charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#060911] text-slate-100 font-['Roboto'] antialiased">
      {/* 1. SIDEBAR (Khớp Figma) */}
      <aside className="w-64 bg-[#0B1120] border-r border-[#1E293B] flex flex-col shrink-0 select-none">
        {/* Logo */}
        <div className="h-16 px-6 flex items-center gap-2 border-b border-[#1E293B]">
          <span className="font-['Righteous'] text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-white">
            HACKFLOW
          </span>
        </div>

        {/* User Card Mini in Sidebar */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-[#131B2E] border border-[#243049] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center font-bold text-white text-base shadow-md">
            {userInitial}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{form.fullName || user?.fullName || 'Thí sinh'}</p>
            <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full">
              Thí sinh
            </span>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 cursor-pointer text-sm transition-colors">
            <LayoutDashboard size={18} />
            <span>Tổng quan</span>
          </div>

          <div
            className="flex items-center justify-between px-3 py-2.5 rounded-lg opacity-50 cursor-not-allowed text-slate-500 text-sm"
            title="Chức năng Đội thi sẽ mở sau khi hồ sơ được duyệt"
          >
            <div className="flex items-center gap-3">
              <Users size={18} />
              <span>Đội thi của tôi</span>
            </div>
            <Lock size={13} className="text-amber-400/80" />
          </div>

          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg opacity-50 cursor-not-allowed text-slate-500 text-sm">
            <div className="flex items-center gap-3">
              <Lightbulb size={18} />
              <span>Chọn đề tài</span>
            </div>
            <Lock size={13} className="text-amber-400/80" />
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 cursor-pointer text-sm transition-colors">
            <CheckSquare size={18} />
            <span>Tiến độ các chặng</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 cursor-pointer text-sm transition-colors">
            <Send size={18} />
            <span>Nộp bài chung cuộc</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 cursor-pointer text-sm transition-colors">
            <Award size={18} />
            <span>Bảng xếp hạng</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 cursor-pointer text-sm transition-colors">
            <HelpCircle size={18} />
            <span>Hỗ trợ trực tuyến</span>
          </div>

          {/* Active Item: Hồ sơ cá nhân */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 text-sm font-medium shadow-sm">
            <UserRound size={18} className="text-indigo-400" />
            <span>Hồ sơ cá nhân</span>
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-[#1E293B]">
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 hover:bg-red-900/30 text-xs font-medium transition-all"
          >
            <LogOut size={15} />
            <span>Đăng xuất ({form.fullName.trim() || user?.fullName || 'Tài khoản'})</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN LAYOUT (Header + Banner + Content) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar (Khớp Figma) */}
        <header className="h-16 bg-[#0B1120] border-b border-[#1E293B] px-8 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xs sm:text-sm font-bold tracking-wide text-white uppercase">
              HACKFLOW AI & DEEPTECH HACKATHON 2026
            </h2>
            <p className="text-[11px] text-slate-400">
              Giai đoạn: <span className="text-indigo-300">Giai đoạn 3: Thực thi dự án & Nộp bài các chặng</span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync
            </span>

            <button
              type="button"
              aria-label="Thông báo hệ thống"
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Bell size={18} />
            </button>

            <div className="flex items-center gap-3 pl-3 border-l border-[#1E293B]">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-white">{form.fullName || user?.fullName || 'Thí sinh'}</p>
                <p className="text-[10px] text-slate-400">{user?.email || 'candidate@hackflow.dev'}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center font-bold text-white text-xs">
                {userInitial}
              </div>
            </div>
          </div>
        </header>

        {/* 3. YELLOW BANNER PENDING (Khớp Figma 100%) */}
        {status === 'pending' && (
          <div className="bg-[#1C1605] border-b border-amber-500/40 px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 text-xs sm:text-sm animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5">
              <span className="text-amber-400 text-base leading-none">●</span>
              <span>
                <strong className="text-amber-300 font-semibold">Nhiệm vụ bắt buộc chưa hoàn thành:</strong> Bạn cần
                hoàn tất các bước thiết lập ban đầu để kích hoạt toàn bộ quyền thi đấu.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const formElement = document.getElementById('onboarding-form');
                formElement?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-all shrink-0"
            >
              <span>Mở trình hướng dẫn bắt buộc</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {status === 'approved' && (
          <div className="bg-emerald-950/40 border-b border-emerald-500/30 px-8 py-3 flex items-center gap-2.5 text-emerald-200 text-xs sm:text-sm">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>
              <strong className="text-emerald-300 font-semibold">Hồ sơ đã được phê duyệt:</strong> Toàn bộ quyền thi
              đấu và đăng ký đội thi đã sẵn sàng!
            </span>
          </div>
        )}

        {status === 'rejected' && (
          <div className="bg-red-950/50 border-b border-red-500/40 px-8 py-3.5 flex items-center gap-2.5 text-red-200 text-xs sm:text-sm">
            <AlertCircle size={17} className="text-red-400 shrink-0" />
            <span>
              <strong className="text-red-300 font-semibold">Hồ sơ chưa được duyệt:</strong> Vui lòng cập nhật lại
              thông tin theo yêu cầu bên dưới và bấm Lưu thông tin để gửi lại.
            </span>
          </div>
        )}

        {/* 4. MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto px-6 py-8 sm:px-10 lg:px-12 bg-[#060911]">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Page Header */}
            <div>
              <h1
                className="text-3xl sm:text-[36px] font-normal leading-tight font-['Righteous'] tracking-wide"
                style={{
                  background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Hồ Sơ Cá Nhân
              </h1>
              <p
                className="mt-1 text-sm font-medium"
                style={{
                  background: 'linear-gradient(90deg, #6366F1 0%, #EDEDED 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Thông tin thí sinh được đồng bộ hóa từ tài khoản đã xác thực của cuộc thi.
              </p>
            </div>

            {/* Error / Success Alerts */}
            {errorMessage && (
              <div
                className="rounded-xl border border-red-500/40 bg-red-950/60 p-4 text-sm text-red-200 flex items-start gap-3 shadow-lg"
                role="alert"
              >
                <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div
                className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-4 text-sm text-emerald-200 flex items-start gap-3 shadow-lg"
                role="status"
              >
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* 5. MAIN PROFILE CARD (Khớp Figma) */}
            <section className="rounded-xl border border-[#243049] bg-[#131B2E] p-6 sm:p-8 shadow-2xl space-y-7">
              {/* Card User Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-[#243049]">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center font-bold text-white text-2xl shadow-xl shrink-0">
                  {userInitial}
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-2xl font-bold text-white">
                      {form.fullName.trim() || user?.fullName || 'Nguyễn Văn Minh'}
                    </h2>
                    <span className="px-2.5 py-0.5 text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 rounded-full">
                      Thành Viên
                    </span>
                    <span className="px-2.5 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full">
                      Tài Khoản Đã Xác Thực
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 fill-slate-300" viewBox="0 0 24 24">
                        <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.26c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.84 1.23 1.84 1.23 1.07 1.84 2.8 1.31 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.23A11.5 11.5 0 0 1 12 6.2c1.02 0 2.05.14 3.01.42 2.3-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.62-2.8 5.65-5.48 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
                      </svg>
                      <span>@{user?.email?.split('@')[0] || 'github_user'}</span>
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="flex items-center gap-1.5">
                      <Mail size={14} className="text-slate-300" />
                      <span>{user?.email || 'leader@cybersamurai.team'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Input Fields */}
              <form id="onboarding-form" onSubmit={submit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Họ và tên */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Họ và tên *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.fullName}
                      onChange={(e) => updateField('fullName', e.target.value)}
                      placeholder="Nguyễn Văn Minh"
                      className="w-full rounded-xl border border-[#26354F] bg-[#0F172A] px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                    />
                    {errors.fullName && <p className="text-xs text-red-400">{errors.fullName}</p>}
                  </div>

                  {/* Mã số sinh viên */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Mã số sinh viên *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.studentId}
                      onChange={(e) => updateField('studentId', e.target.value)}
                      placeholder="20210001"
                      className="w-full rounded-xl border border-[#26354F] bg-[#0F172A] px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                    />
                    {errors.studentId && <p className="text-xs text-red-400">{errors.studentId}</p>}
                  </div>

                  {/* Trường đại học / Học viện */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Trường đại học / Học viện *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.university}
                      onChange={(e) => updateField('university', e.target.value)}
                      placeholder="Đại học Bách Khoa Hà Nội"
                      className="w-full rounded-xl border border-[#26354F] bg-[#0F172A] px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                    />
                    {errors.university && <p className="text-xs text-red-400">{errors.university}</p>}
                  </div>

                  {/* Tài khoản GitHub (Readonly) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Tài khoản GitHub
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`@${user?.email?.split('@')[0] || 'github_user'}`}
                      className="w-full rounded-xl border border-[#26354F] bg-[#0F172A]/70 px-4 py-3 text-sm text-slate-400 cursor-not-allowed outline-none"
                    />
                    <p className="text-[11px] text-slate-400">Đã liên kết OAuth2 vĩnh viễn</p>
                  </div>

                  {/* Số điện thoại */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Số điện thoại liên hệ *
                    </label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="0901234567"
                      className="w-full rounded-xl border border-[#26354F] bg-[#0F172A] px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                    />
                    {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
                  </div>
                </div>

                {/* Giới thiệu bản thân & Chuyên môn kỹ thuật (Tag/Chips Selector chuẩn Review Tech Lead) */}
                <div className="space-y-3" aria-invalid={Boolean(errors.skills)}>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Giới thiệu bản thân & Chuyên môn kỹ thuật *
                    </label>
                    <span className="text-xs text-slate-400">Chọn các thẻ tag kỹ năng</span>
                  </div>

                  {/* Chips Container */}
                  <div className="flex flex-wrap gap-2">
                    {displayedSkills.map((skill) => {
                      const isSelected = form.skills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleSkill(skill)}
                          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                            isSelected
                              ? 'border-indigo-400 bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                              : 'border-[#26354F] bg-[#0F172A] text-slate-300 hover:border-indigo-400 hover:text-white'
                          }`}
                        >
                          {isSelected ? `✓ ${skill}` : `+ ${skill}`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Skill Input */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      value={customSkill}
                      onChange={(e) => setCustomSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomSkill();
                        }
                      }}
                      placeholder="Thêm kỹ năng khác (ví dụ: Generative AI, PyTorch...)"
                      className="h-10 flex-1 rounded-xl border border-[#26354F] bg-[#0F172A] px-4 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={addCustomSkill}
                      className="h-10 px-4 rounded-xl border border-[#26354F] bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                    >
                      Thêm kỹ năng
                    </button>
                  </div>
                  {errors.skills && <p className="text-xs text-red-400">{errors.skills}</p>}
                </div>

                {/* Sub-card: ĐỘI THI HIỆN TẠI (Khớp Figma) */}
                <div className="rounded-xl bg-[#0F172A] border border-[#243049] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        ĐỘI THI HIỆN TẠI
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {status === 'approved' ? 'CyberSamurai' : 'Chưa tham gia đội thi (Đang chờ duyệt)'}
                      </p>
                    </div>
                  </div>

                  <span className="self-start sm:self-auto px-3 py-1 rounded-lg text-xs font-medium bg-[#131B2E] border border-[#26354F] text-indigo-300">
                    {status === 'approved' ? 'Mã mời: CS2026' : 'Mã mời: Chờ duyệt'}
                  </span>
                </div>

                {/* Submit Action (Khớp Figma) */}
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    isLoading={loading}
                    className="!min-h-[44px] !rounded-xl !bg-[#6366F1] hover:!bg-[#5558DD] px-6 py-2.5 font-['Roboto'] text-sm font-bold text-white shadow-lg shadow-[#6366F1]/25 transition-all flex items-center gap-2"
                  >
                    <Save size={17} />
                    <span>Lưu thông tin</span>
                  </Button>
                </div>
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};


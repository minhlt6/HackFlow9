import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  Save,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  Phone,
  ShieldCheck,
  Check,
  Circle,
} from 'lucide-react';
import { Button } from '../components/Button';
import { axiosClient } from '../api/axiosClient';
import { profileApi } from '../api/profileApi';
import { useAuthStore } from '../store/useAuthStore';
import { useMockStore } from '../store/useMockStore';
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
  judge: '/judge/dashboard',
  mentor: '/mentor/dashboard',
  candidate: '/dashboard',
};

const getProfileStorageKey = (emailOrId?: string) =>
  `hackflow_profile_${(emailOrId || 'default').toLowerCase()}`;

const loadSavedProfileForm = (
  user: ReturnType<typeof useAuthStore.getState>['user'],
): ProfileForm => {
  try {
    const keysToTry = [
      user?.email ? getProfileStorageKey(user.email) : null,
      user?.id ? getProfileStorageKey(user.id) : null,
      'hackflow_last_profile',
    ].filter(Boolean) as string[];

    for (const key of keysToTry) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ProfileForm>;
        return {
          fullName: (parsed.fullName || user?.fullName || '').trim(),
          studentId: (parsed.studentId || user?.studentId || '').trim(),
          university: (parsed.university || user?.university || user?.school || '').trim(),
          phone: (parsed.phone || user?.phone || '').trim(),
          skills:
            Array.isArray(parsed.skills) && parsed.skills.length > 0
              ? parsed.skills
              : Array.isArray(user?.skills)
              ? user.skills
              : [],
        };
      }
    }
  } catch {
    // ignore storage errors
  }

  return {
    ...initialForm,
    fullName: (user?.fullName || '').trim(),
    studentId: (user?.studentId || '').trim(),
    university: (user?.university || user?.school || '').trim(),
    phone: (user?.phone || '').trim(),
    skills: Array.isArray(user?.skills) ? user.skills : [],
  };
};

const saveProfileFormToStorage = (
  form: ProfileForm,
  email?: string,
  userId?: string,
) => {
  try {
    const payload = JSON.stringify(form);
    if (email) localStorage.setItem(getProfileStorageKey(email), payload);
    if (userId) localStorage.setItem(getProfileStorageKey(userId), payload);
    localStorage.setItem('hackflow_last_profile', payload);

    // Đồng bộ thông tin (tên, trường, kỹ năng) sang bảng thành viên đội thi hiện tại
    const teamRaw = localStorage.getItem('hackflow_team_details_v2');
    if (teamRaw) {
      const teamData = JSON.parse(teamRaw);
      if (teamData && Array.isArray(teamData.members) && teamData.members.length > 0) {
        const lowerEmail = (email || '').toLowerCase();
        const matchIdx = teamData.members.findIndex(
          (m: { email?: string; user_id?: string }) =>
            (lowerEmail && (m.email || '').toLowerCase() === lowerEmail) ||
            (userId && m.user_id === userId),
        );
        const targetIdx = matchIdx >= 0 ? matchIdx : 0;
        teamData.members[targetIdx] = {
          ...teamData.members[targetIdx],
          full_name: form.fullName || teamData.members[targetIdx].full_name,
          university: form.university || teamData.members[targetIdx].university,
          skills: form.skills.length > 0 ? form.skills : teamData.members[targetIdx].skills,
        };
        localStorage.setItem('hackflow_team_details_v2', JSON.stringify(teamData));
      }
    }
  } catch {
    // ignore storage errors
  }
};

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser, login } = useAuthStore();
  const updateMockUserProfile = useMockStore((state) => state.updateCurrentUserProfile);

  const activeUser = user || {
    id: 'candidate-demo-1',
    email: 'leader@cybersamurai.team',
    fullName: 'Nguyễn Văn Minh',
    role: 'candidate' as UserRole,
    approvalStatus: 'pending' as ApprovalStatus,
    githubUsername: 'github_user',
  };

  const [form, setForm] = useState<ProfileForm>(() => loadSavedProfileForm(user));
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [customSkill, setCustomSkill] = useState('');
  const [status, setStatus] = useState<ApprovalStatus>(activeUser.approvalStatus || 'pending');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const syncCurrentUser = async () => {
      const token = localStorage.getItem('token');
      if (token && !token.startsWith('mock-')) {
        try {
          const res = await axiosClient.get<{
            data?: {
              id: string;
              email: string;
              full_name: string;
              role: UserRole;
              approval_status: ApprovalStatus;
              github_username?: string;
              avatar_url?: string;
              student_id?: string;
              school?: string;
              phone?: string;
              skills?: string[];
            };
          }>('/auth/me');
          const me = res.data?.data;
          if (me) {
            const savedLocal = loadSavedProfileForm({
              id: me.id,
              email: me.email,
              fullName: me.full_name,
              role: me.role,
              approvalStatus: me.approval_status,
            });
            const syncedName = (me.full_name || savedLocal.fullName || '').trim();
            const syncedStudentId = (me.student_id || savedLocal.studentId || '').trim();
            const syncedUniversity = (me.school || savedLocal.university || '').trim();
            const syncedPhone = (me.phone || savedLocal.phone || '').trim();
            const syncedSkills =
              Array.isArray(me.skills) && me.skills.length > 0
                ? me.skills
                : savedLocal.skills;

            updateUser({
              id: me.id,
              email: me.email,
              fullName: syncedName || me.github_username || me.email,
              role: me.role,
              approvalStatus: me.approval_status,
              githubUsername: me.github_username,
              avatarUrl: me.avatar_url,
              studentId: syncedStudentId || undefined,
              university: syncedUniversity || undefined,
              school: syncedUniversity || undefined,
              phone: syncedPhone || undefined,
              skills: syncedSkills.length > 0 ? syncedSkills : undefined,
            });
            setStatus(me.approval_status);
            setForm((prev) => ({
              fullName: syncedName || prev.fullName || me.github_username || '',
              studentId: syncedStudentId || prev.studentId,
              university: syncedUniversity || prev.university,
              phone: syncedPhone || prev.phone,
              skills: syncedSkills.length > 0 ? syncedSkills : prev.skills,
            }));
            return;
          }
        } catch {
          // Ignore and fallback to current store state
        }
      }

      if (!user) {
        login(activeUser, 'mock-dev-token-2026');
      } else {
        const savedLocal = loadSavedProfileForm(user);
        setStatus(user.approvalStatus || 'pending');
        setForm((prev) => ({
          fullName: prev.fullName || savedLocal.fullName || user.fullName.trim(),
          studentId: prev.studentId || savedLocal.studentId,
          university: prev.university || savedLocal.university,
          phone: prev.phone || savedLocal.phone,
          skills: prev.skills.length > 0 ? prev.skills : savedLocal.skills,
        }));
      }
    };

    void syncCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const cleanedForm: ProfileForm = {
      fullName: form.fullName.trim(),
      studentId: form.studentId.trim(),
      university: form.university.trim(),
      phone: form.phone.trim(),
      skills: form.skills,
    };

    // Lưu ngay vào localStorage & Store để đồng bộ toàn hệ thống
    saveProfileFormToStorage(cleanedForm, user?.email || activeUser.email, user?.id || activeUser.id);
    updateMockUserProfile({
      fullName: cleanedForm.fullName,
      studentId: cleanedForm.studentId,
      university: cleanedForm.university,
      school: cleanedForm.university,
      phone: cleanedForm.phone,
      skills: cleanedForm.skills,
    });

    setLoading(true);
    try {
      const result = await profileApi.submit({
        full_name: cleanedForm.fullName,
        student_id: cleanedForm.studentId,
        school: cleanedForm.university,
        phone: cleanedForm.phone,
        skills: cleanedForm.skills,
      });

      const nextStatus = (
        result.approvalStatus ||
        result.approval_status ||
        result.user?.approvalStatus ||
        result.user?.approval_status ||
        user?.approvalStatus ||
        'pending'
      ).toLowerCase() as ApprovalStatus;

      const rawRole = (result.role || result.user?.role || user?.role || 'candidate').toLowerCase();
      const mappedRole: UserRole =
        rawRole === 'candidate' || rawRole === 'admin' || rawRole === 'judge' || rawRole === 'mentor'
          ? (rawRole as UserRole)
          : 'candidate';

      setStatus(nextStatus);
      updateUser({
        fullName: cleanedForm.fullName,
        studentId: cleanedForm.studentId,
        university: cleanedForm.university,
        school: cleanedForm.university,
        phone: cleanedForm.phone,
        skills: cleanedForm.skills,
        approvalStatus: nextStatus,
        role: mappedRole,
      });

      if (nextStatus === 'approved') {
        if (location.pathname === '/onboarding') {
          setSuccessMessage('Hồ sơ đã được duyệt thành công! Đang chuyển hướng đến không gian thi đấu...');
          window.setTimeout(() => navigate(rolePaths[mappedRole], { replace: true }), 900);
        } else {
          setSuccessMessage('Đã lưu và đồng bộ thông tin hồ sơ cá nhân & kỹ năng chuyên môn thành công!');
        }
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
      const apiErrorMsg = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : null;

      // Nếu có lỗi 4xx tường minh từ server thì hiển thị, ngược lại (offline/mock/network) vẫn lưu thành công trên local
      if (apiErrorMsg && axios.isAxiosError(error) && error.response && error.response.status < 500 && error.response.status !== 401) {
        setErrorMessage(apiErrorMsg);
      } else {
        const currentStatus = (user?.approvalStatus || status || 'approved') as ApprovalStatus;
        const currentRole = (user?.role || 'candidate') as UserRole;
        setStatus(currentStatus);
        updateUser({
          fullName: cleanedForm.fullName,
          studentId: cleanedForm.studentId,
          university: cleanedForm.university,
          school: cleanedForm.university,
          phone: cleanedForm.phone,
          skills: cleanedForm.skills,
          approvalStatus: currentStatus,
          role: currentRole,
        });
        if (currentStatus === 'approved' && location.pathname === '/onboarding') {
          setSuccessMessage('Hồ sơ đã được duyệt thành công! Đang chuyển hướng đến không gian thi đấu...');
          window.setTimeout(() => navigate(rolePaths[currentRole], { replace: true }), 900);
        } else {
          setSuccessMessage('Đã lưu và đồng bộ thông tin hồ sơ cá nhân & kỹ năng chuyên môn thành công!');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const displayedSkills = [...skillOptions, ...form.skills.filter((skill) => !skillOptions.includes(skill))];
  const userInitial = (form.fullName.trim() || user?.fullName || 'N').charAt(0).toUpperCase();
  const githubHandle = user?.githubUsername || user?.email?.split('@')[0] || 'github_user';

  // Tính toán checklist hoàn thiện hồ sơ
  const isNameValid = form.fullName.trim().length >= 2;
  const isStudentIdValid = /^\d+$/.test(form.studentId.trim());
  const isUniversityValid = Boolean(form.university.trim());
  const isPhoneValid = /^0\d{9}$/.test(form.phone.trim());
  const isSkillsValid = form.skills.length > 0;
  const isGithubLinked = true; // Luôn liên kết OAuth2

  const checklistItems = [
    { label: 'Cập nhật Họ và tên chính xác', completed: isNameValid },
    { label: 'Khai báo MSSV hợp lệ', completed: isStudentIdValid },
    { label: 'Cung cấp Đơn vị đào tạo / Trường', completed: isUniversityValid },
    { label: 'Số điện thoại liên lạc khẩn cấp (10 số)', completed: isPhoneValid },
    { label: 'Chọn ít nhất 1 kỹ năng chuyên môn', completed: isSkillsValid },
    { label: 'Liên kết định danh GitHub OAuth2', completed: isGithubLinked },
  ];

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const progressPercent = Math.round((completedCount / checklistItems.length) * 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto ">
      {/* 1. STATUS NOTIFICATION BANNER */}
      {status === 'pending' && (
        <div className="rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-amber-500/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-700 dark:text-amber-400 text-xs sm:text-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <span>
              <strong className="text-amber-700 dark:text-amber-400 font-semibold">Nhiệm vụ bắt buộc chưa hoàn thành:</strong> Bạn cần
              hoàn tất thông tin cá nhân để Ban Tổ Chức kích hoạt đầy đủ quyền tạo và tham gia đội thi.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const formElement = document.getElementById('onboarding-form');
              formElement?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-all shrink-0 cursor-pointer"
          >
            <span>Nhập liệu ngay</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {status === 'approved' && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 sm:p-5 flex items-center gap-3 text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm">
          <CheckCircle2 size={18} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
          <span>
            <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">Hồ sơ đã được phê duyệt:</strong> Toàn bộ quyền thi
            đấu và đăng ký đội thi đã sẵn sàng! Bạn có thể vào mục Đội thi của tôi để bắt đầu.
          </span>
        </div>
      )}

      {status === 'rejected' && (
        <div className="rounded-xl bg-rose-500/10 border border-red-500/40 p-4 sm:p-5 flex items-center gap-3 text-rose-700 dark:text-rose-400 text-xs sm:text-sm">
          <AlertCircle size={18} className="text-rose-700 dark:text-rose-400 shrink-0" />
          <span>
            <strong className="text-rose-700 dark:text-rose-400 font-semibold">Hồ sơ chưa được duyệt:</strong> Vui lòng cập nhật lại
            thông tin theo yêu cầu bên dưới và bấm Lưu thông tin để gửi lại cho BTC.
          </span>
        </div>
      )}

      {/* 2. PAGE HEADER */}
      <div>
        <h1
          className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground tracking-wide"
        >
          Hồ Sơ Cá Nhân Thí Sinh
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Thông tin thí sinh được đồng bộ hóa từ tài khoản đã xác thực của HackFlow AI & Deep Tech Hackathon 2026.
        </p>
      </div>

      {/* Error / Success Alerts */}
      {errorMessage && (
        <div
          className="rounded-xl border border-red-500/40 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-400 flex items-start gap-3 shadow-lg"
          role="alert"
        >
          <AlertCircle size={18} className="text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400 flex items-start gap-3 shadow-lg"
          role="status"
        >
          <CheckCircle2 size={18} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 3. 2-COLUMN GRID LAYOUT (TỐI ƯU THEO FEEDBACK REVIEW MINH) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* CỘT CHÍNH (TRÁI ~65%): FORM NHẬP LIỆU THÔNG TIN CÁ NHÂN */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl space-y-7">
            {/* Header User Summary */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-border">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={form.fullName.trim() || user?.fullName || githubHandle}
                  className="w-16 h-16 rounded-2xl object-cover shadow-lg border border-indigo-400/30 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center font-bold text-foreground text-2xl shadow-lg shrink-0">
                  {userInitial}
                </div>
              )}

              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    {form.fullName.trim() || user?.fullName || githubHandle}
                  </h2>
                  <span className="px-2.5 py-0.5 text-xs font-medium bg-muted/60 text-muted-foreground border border-border rounded-full">
                    Thí sinh
                  </span>
                  <span className="px-2.5 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-full">
                    Tài khoản đã xác thực
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-0.5">
                  <span className="flex items-center gap-1.5 font-mono">
                    <svg className="w-3.5 h-3.5 fill-slate-300" viewBox="0 0 24 24">
                      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.26c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.84 1.23 1.84 1.23 1.07 1.84 2.8 1.31 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.23A11.5 11.5 0 0 1 12 6.2c1.02 0 2.05.14 3.01.42 2.3-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.62-2.8 5.65-5.48 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
                    </svg>
                    <span>@{githubHandle}</span>
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-1.5">
                    <Mail size={14} className="text-muted-foreground" />
                    <span>{user?.email || 'Chưa cập nhật email'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <form id="onboarding-form" onSubmit={submit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Họ và tên */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    placeholder="Nhập họ và tên của bạn..."
                    className="w-full rounded-xl border border-border bg-muted/40 dark:bg-slate-900/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  />
                  {errors.fullName && <p className="text-xs text-rose-700 dark:text-rose-400">{errors.fullName}</p>}
                </div>

                {/* Mã số sinh viên */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mã số sinh viên *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.studentId}
                    onChange={(e) => updateField('studentId', e.target.value)}
                    placeholder="20210001"
                    className="w-full rounded-xl border border-border bg-muted/40 dark:bg-slate-900/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  />
                  {errors.studentId && <p className="text-xs text-rose-700 dark:text-rose-400">{errors.studentId}</p>}
                </div>

                {/* Trường đại học / Học viện */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Trường đại học / Học viện *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.university}
                    onChange={(e) => updateField('university', e.target.value)}
                    placeholder="Đại học Thủy Lợi / Bách Khoa..."
                    className="w-full rounded-xl border border-border bg-muted/40 dark:bg-slate-900/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  />
                  {errors.university && <p className="text-xs text-rose-700 dark:text-rose-400">{errors.university}</p>}
                </div>

                {/* Tài khoản GitHub (Readonly) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tài khoản GitHub
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`@${githubHandle}`}
                    className="w-full rounded-xl border border-border bg-muted/40 dark:bg-slate-900/60 px-4 py-3 text-sm text-muted-foreground cursor-not-allowed outline-none font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">Đã liên kết OAuth2 vĩnh viễn</p>
                </div>

                {/* Số điện thoại */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Số điện thoại liên hệ *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="0901234567"
                    className="w-full rounded-xl border border-border bg-muted/40 dark:bg-slate-900/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  />
                  {errors.phone && <p className="text-xs text-rose-700 dark:text-rose-400">{errors.phone}</p>}
                </div>
              </div>

              {/* Giới thiệu bản thân & Chuyên môn kỹ thuật (Chips Selector) */}
              <div className="space-y-3" aria-invalid={Boolean(errors.skills)}>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Giới thiệu bản thân & Chuyên môn kỹ thuật *
                  </label>
                  <span className="text-xs text-muted-foreground">Chọn các thẻ tag kỹ năng</span>
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
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-400 bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                            : 'border-border bg-muted/40 dark:bg-slate-900/60 text-muted-foreground hover:border-indigo-400 hover:text-foreground'
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
                    className="h-10 flex-1 rounded-xl border border-border bg-muted/40 dark:bg-slate-900/60 px-4 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={addCustomSkill}
                    className="h-10 px-4 rounded-xl border border-border bg-muted/60 hover:bg-accent text-xs font-medium text-foreground transition-colors cursor-pointer"
                  >
                    Thêm kỹ năng
                  </button>
                </div>
                {errors.skills && <p className="text-xs text-rose-700 dark:text-rose-400">{errors.skills}</p>}
              </div>

              {/* Sub-card: ĐỘI THI HIỆN TẠI */}
              <div className="rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/15 text-primary border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                      ĐỘI THI HIỆN TẠI
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {status === 'approved' ? 'CyberSamurai' : 'Chưa tham gia đội thi (Đang chờ duyệt)'}
                    </p>
                  </div>
                </div>

                <span className="self-start sm:self-auto px-3 py-1 rounded-lg text-xs font-medium bg-card border border-border text-primary font-mono">
                  {status === 'approved' ? 'Mã mời: CS2026' : 'Mã mời: Chờ duyệt'}
                </span>
              </div>

              {/* Submit Action */}
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  isLoading={loading}
                  className="!min-h-[44px] !rounded-xl !bg-[#6366F1] hover:!bg-[#5558DD] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#6366F1]/25 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save size={17} />
                  <span>Lưu thông tin</span>
                </Button>
              </div>
            </form>
          </section>
        </div>

        {/* CỘT PHỤ (PHẢI ~35%): THẺ PREVIEW THÍ SINH + CHECKLIST HOÀN THIỆN */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* 1. THẺ PREVIEW THÍ SINH (CANDIDATE LIVE CARD) */}
          <div className="rounded-2xl border border-indigo-500/30 bg-card p-6 shadow-xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-4 border-b border-border">
              <span className="text-xs font-bold uppercase tracking-wider text-primary font-mono flex items-center gap-1.5">
                <Sparkles size={14} />
                Thẻ Xem Trước Thí Sinh
              </span>
              <span className="text-[10px] bg-indigo-500/15 text-primary px-2 py-0.5 rounded-full border border-indigo-500/30 font-mono">
                Live Preview
              </span>
            </div>

            <div className="pt-5 space-y-5">
              {/* Avatar + Main Info */}
              <div className="flex items-center gap-4">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={form.fullName.trim() || user?.fullName || githubHandle}
                    className="w-16 h-16 rounded-2xl object-cover shadow-md border border-indigo-400/30"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center font-bold text-foreground text-2xl shadow-md border border-indigo-400/30">
                    {userInitial}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-lg text-foreground truncate">
                    {form.fullName.trim() || user?.fullName || githubHandle}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <GraduationCap size={14} className="text-muted-foreground shrink-0" />
                    <span className="truncate">{form.university.trim() || 'Chưa nhập trường'}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    MSSV: {form.studentId.trim() || '---'}
                  </p>
                </div>
              </div>

              {/* Contact meta */}
              <div className="p-3 rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-mono truncate ml-2">{user?.email || 'Chưa cập nhật email'}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-muted-foreground">Điện thoại:</span>
                  <span className="font-mono flex items-center gap-1">
                    <Phone size={11} className="text-muted-foreground" />
                    {form.phone.trim() || '---'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-muted-foreground">GitHub:</span>
                  <span className="font-mono text-primary">
                    @{githubHandle}
                  </span>
                </div>
              </div>

              {/* Skills Tags Preview */}
              <div>
                <span className="text-xs font-semibold text-muted-foreground block mb-2">
                  Kỹ năng chuyên môn ({form.skills.length})
                </span>
                {form.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {form.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-indigo-500/15 text-primary border border-indigo-500/30"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Chưa chọn thẻ kỹ năng nào</p>
                )}
              </div>

              {/* Validation Status Badge */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Trạng thái hồ sơ:</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium ${
                    progressPercent === 100
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                  }`}
                >
                  <ShieldCheck size={13} />
                  <span>{progressPercent === 100 ? 'Đã hoàn thiện 100%' : 'Đang hoàn thiện'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* 2. CHECKLIST HOÀN THIỆN HỒ SƠ */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <span>Checklist Hoàn Thiện Hồ Sơ</span>
              </h4>
              <span className="text-xs font-mono font-bold text-primary">{progressPercent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted/40 dark:bg-slate-900/60 rounded-full h-2 border border-border overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Checklist List */}
            <ul className="space-y-2.5 pt-1">
              {checklistItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs">
                  {item.completed ? (
                    <div className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} />
                    </div>
                  ) : (
                    <div className="h-4 w-4 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                      <Circle size={10} />
                    </div>
                  )}
                  <span className={item.completed ? 'text-foreground' : 'text-muted-foreground'}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>

            {/* Next Steps Guide Box */}
            <div className="pt-3 border-t border-border text-xs text-muted-foreground leading-relaxed">
              <p>
                Sau khi bấm <strong>Lưu thông tin</strong> và được Ban Tổ Chức phê duyệt, toàn bộ tính năng{' '}
                <strong className="text-primary">Đội thi của tôi</strong> và{' '}
                <strong className="text-primary">Chọn đề tài</strong> sẽ sẵn sàng hoạt động.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

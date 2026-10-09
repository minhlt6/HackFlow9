import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { profileApi } from '../api/profileApi';
import { useAuthStore } from '../store/useAuthStore';
import type { ApprovalStatus, UserRole } from '../types';
import type { ProfileFieldErrors, ProfileForm } from '../types/profile';

const initialForm: ProfileForm = { fullName: '', studentId: '', university: '', phone: '', skills: [] };
const skillOptions = ['Frontend (FE)', 'Backend (BE)', 'UI/UX Design', 'AI / Machine Learning', 'Mobile App', 'DevOps / Cloud', 'Fullstack', 'Data Science'];

const rolePaths: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  judge: '/judge',
  mentor: '/mentor',
  candidate: '/dashboard',
};

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [customSkill, setCustomSkill] = useState('');
  const [status, setStatus] = useState<ApprovalStatus>(user?.approvalStatus || 'pending');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [navigate, user]);

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
    if (!form.skills.length) next.skills = 'Vui lòng chọn ít nhất một kỹ năng.';
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
      const nextStatus = result.approvalStatus || result.approval_status || result.user?.approvalStatus || result.user?.approval_status || 'pending';
      setStatus(nextStatus);
      updateUser({ approvalStatus: nextStatus });

      if (nextStatus === 'approved') {
        setSuccessMessage('Hồ sơ đã được duyệt. Đang chuyển đến trang làm việc...');
        window.setTimeout(() => navigate(rolePaths[user?.role || 'candidate'], { replace: true }), 700);
      } else if (nextStatus === 'rejected') {
        setErrorMessage(result.rejectionReason || result.rejection_reason || result.reason || result.message || 'Hồ sơ bị từ chối. Vui lòng cập nhật và gửi lại.');
      } else {
        setSuccessMessage(result.message || 'Hồ sơ đã được gửi. Vui lòng chờ quản trị viên phê duyệt.');
      }
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : null;
      setErrorMessage(message || 'Không thể gửi hồ sơ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const displayedSkills = [...skillOptions, ...form.skills.filter((skill) => !skillOptions.includes(skill))];

  return (
    <div className="min-h-screen bg-[#080D18] px-4 py-8 font-['Roboto']">
      <main className="mx-auto max-w-3xl space-y-5">
        <section className={`rounded-xl border p-5 ${
          status === 'approved' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' :
            status === 'rejected' ? 'border-red-500/30 bg-red-500/10 text-red-200' :
              'border-amber-500/30 bg-amber-500/10 text-amber-200'
        }`} role={status === 'rejected' ? 'alert' : 'status'}>
          <h1 className="text-xl font-bold">
            {status === 'approved' ? 'Hồ sơ đã được duyệt' : status === 'rejected' ? 'Hồ sơ chưa được duyệt' : 'Tài khoản đang chờ duyệt'}
          </h1>
          <p className="mt-1 text-sm">
            {status === 'approved' ? 'Bạn có thể bắt đầu sử dụng HackFlow.' : status === 'rejected' ? 'Vui lòng cập nhật thông tin và gửi lại hồ sơ.' : 'Vui lòng hoàn thiện hồ sơ để Ban Tổ Chức xét duyệt tài khoản.'}
          </p>
        </section>

        <section className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6 shadow-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-400">Hồ sơ thí sinh</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Hoàn thiện thông tin của bạn</h2>
          {errorMessage && <div className="mt-5 rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-sm text-red-200" role="alert">{errorMessage}</div>}
          {successMessage && <div className="mt-5 rounded-lg border border-emerald-500/40 bg-emerald-950/50 p-3 text-sm text-emerald-200" role="status">{successMessage}</div>}

          <form onSubmit={submit} className="mt-6 grid gap-5 sm:grid-cols-2">
            <Input label="Họ tên" required error={errors.fullName} value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} placeholder="Nguyễn Văn A" />
            <Input label="MSSV" required error={errors.studentId} value={form.studentId} onChange={(event) => updateField('studentId', event.target.value)} placeholder="21D000000" />
            <Input label="Trường / Viện" required error={errors.university} value={form.university} onChange={(event) => updateField('university', event.target.value)} placeholder="Tên trường hoặc viện" />
            <Input label="Số điện thoại" required type="tel" error={errors.phone} value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="0900000000" />

            <div className="flex flex-col gap-3 sm:col-span-2" aria-invalid={Boolean(errors.skills)}>
              <span className="text-sm font-medium text-slate-300">Kỹ năng chính</span>
              <div className="flex flex-wrap gap-2">
                {displayedSkills.map((skill) => (
                  <button key={skill} type="button" aria-pressed={form.skills.includes(skill)} onClick={() => toggleSkill(skill)} className={`rounded-full border px-3 py-1.5 text-sm transition ${form.skills.includes(skill) ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-600 bg-slate-900 text-slate-300 hover:border-indigo-400'}`}>
                    {skill}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input value={customSkill} onChange={(event) => setCustomSkill(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomSkill(); } }} placeholder="Thêm kỹ năng khác" className="h-11 flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 text-sm text-white outline-none focus:border-indigo-400" />
                <Button type="button" variant="secondary" onClick={addCustomSkill}>Thêm kỹ năng</Button>
              </div>
              {errors.skills && <span className="text-xs text-red-400">{errors.skills}</span>}
            </div>

            <div className="flex gap-3 sm:col-span-2">
              <Button type="submit" isLoading={loading}>Gửi hồ sơ</Button>
              <Button type="button" variant="secondary" onClick={() => { logout(); navigate('/login', { replace: true }); }}>Đăng xuất</Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosClient } from '../api/axiosClient';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuthStore } from '../store/useAuthStore';
import type { ApprovalStatus, UserRole } from '../types';

interface ProfileForm {
  fullName: string;
  studentId: string;
  university: string;
  phone: string;
  skills: string;
}

interface ProfileResponse {
  approvalStatus?: ApprovalStatus;
  rejectionReason?: string;
  reason?: string;
  message?: string;
  user?: {
    approvalStatus?: ApprovalStatus;
  };
}

type FieldErrors = Partial<Record<keyof ProfileForm, string>>;

interface ProfileApiResponse extends ProfileResponse {
  data?: ProfileResponse;
}

const initialForm: ProfileForm = {
  fullName: '',
  studentId: '',
  university: '',
  phone: '',
  skills: '',
};

const getRolePath = (role: UserRole): string => ({
  admin: '/admin/dashboard',
  judge: '/judge',
  mentor: '/mentor',
  participant: '/dashboard',
}[role]);

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [responseApprovalStatus, setResponseApprovalStatus] = useState<ApprovalStatus | null>(null);
  const approvalStatus = responseApprovalStatus || user?.approvalStatus || 'pending';

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setFieldErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  };

  const validateForm = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (form.fullName.trim().length < 2) {
      errors.fullName = 'Họ tên phải có ít nhất 2 ký tự.';
    }
    if (!/^\d+$/.test(form.studentId.trim())) {
      errors.studentId = 'MSSV chỉ được chứa chữ số.';
    }
    if (!/^0\d{9}$/.test(form.phone.trim())) {
      errors.phone = 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0.';
    }
    if (!form.university.trim()) {
      errors.university = 'Vui lòng nhập Trường / Viện.';
    }
    if (!form.skills.trim()) {
      errors.skills = 'Vui lòng nhập kỹ năng chính.';
    } else if (form.skills.trim().length > 500) {
      errors.skills = 'Kỹ năng chính không được vượt quá 500 ký tự.';
    }

    return errors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const validationErrors = validateForm();
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosClient.post<ProfileApiResponse>('/users/profile', form);
      const responseData = response.data.data || response.data;
      const nextApprovalStatus =
        responseData.approvalStatus || responseData.user?.approvalStatus;

      if (nextApprovalStatus === 'rejected') {
        setResponseApprovalStatus('rejected');
        setErrorMessage(
          responseData.rejectionReason ||
            responseData.reason ||
            responseData.message ||
            'Hồ sơ bị từ chối. Vui lòng kiểm tra và cập nhật lại thông tin.',
        );
        updateUser({ approvalStatus: 'rejected' });
        return;
      }

      if (nextApprovalStatus === 'approved') {
        setResponseApprovalStatus('approved');
        updateUser({ approvalStatus: 'approved' });
        setSuccessMessage('Hồ sơ đã được duyệt. Đang chuyển đến trang làm việc...');
        window.setTimeout(() => {
          navigate(getRolePath(user?.role || 'participant'), { replace: true });
        }, 700);
        return;
      }

      setResponseApprovalStatus('pending');
      setSuccessMessage(
        responseData.message ||
          'Hồ sơ đã được gửi. Vui lòng chờ quản trị viên phê duyệt.',
      );
    } catch (error) {
      const message =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setErrorMessage(message || 'Không thể gửi hồ sơ. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <main className="mx-auto max-w-3xl space-y-6">
        {approvalStatus === 'pending' && (
          <section className="border border-amber-200 bg-amber-50 p-5 text-amber-900" role="status">
            <h1 className="text-xl font-bold">Tài khoản đang chờ duyệt</h1>
            <p className="mt-1 text-sm">
              Vui lòng hoàn thiện hồ sơ. Các chức năng tham gia đội thi sẽ mở sau khi hồ sơ được phê duyệt.
            </p>
          </section>
        )}

        {approvalStatus === 'approved' && (
          <section className="border border-emerald-200 bg-emerald-50 p-5 text-emerald-900" role="status">
            <h1 className="text-xl font-bold">Hồ sơ đã được duyệt</h1>
            <p className="mt-1 text-sm">Bạn có thể bắt đầu sử dụng HackFlow.</p>
          </section>
        )}

        {approvalStatus === 'rejected' && (
          <section className="border border-red-200 bg-red-50 p-5 text-red-900" role="alert">
            <h1 className="text-xl font-bold">Hồ sơ chưa được duyệt</h1>
            <p className="mt-1 text-sm">Vui lòng cập nhật thông tin theo lý do bên dưới và gửi lại.</p>
          </section>
        )}

        <section className="bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Hồ sơ thí sinh</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Hoàn thiện thông tin của bạn</h2>
          </div>

          {errorMessage && (
            <div className="mb-5 border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-5 border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Họ tên"
              required
              error={fieldErrors.fullName}
              value={form.fullName}
              onChange={(event) => updateField('fullName', event.target.value)}
              placeholder="Nguyễn Văn A"
            />
            <Input
              label="MSSV"
              required
              error={fieldErrors.studentId}
              value={form.studentId}
              onChange={(event) => updateField('studentId', event.target.value)}
              placeholder="21D000000"
            />
            <Input
              label="Trường / Viện"
              required
              error={fieldErrors.university}
              value={form.university}
              onChange={(event) => updateField('university', event.target.value)}
              placeholder="Tên trường hoặc viện"
            />
            <Input
              label="Số điện thoại"
              required
              type="tel"
              error={fieldErrors.phone}
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder="0900000000"
            />
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Kỹ năng chính</span>
              <textarea
                required
                maxLength={500}
                value={form.skills}
                onChange={(event) => updateField('skills', event.target.value)}
                placeholder="React, TypeScript, UI/UX..."
                rows={4}
                aria-invalid={Boolean(fieldErrors.skills)}
                className={`rounded-lg border px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${fieldErrors.skills ? 'border-red-500' : 'border-slate-300'}`}
              />
              {fieldErrors.skills && <span className="text-xs text-red-500">{fieldErrors.skills}</span>}
            </label>
            <Button
              type="submit"
              isLoading={isLoading}
              className="sm:col-span-2 sm:w-fit"
            >
              Gửi hồ sơ
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
};

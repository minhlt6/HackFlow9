import React, { useState } from 'react';
import axios from 'axios';
import { Eye, EyeOff, UserRound, Lock, AlertCircle, LogIn } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { axiosClient } from '../api/axiosClient';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/Button';
import type { ApprovalStatus, ApiResponse, User, UserRole } from '../types';

interface BackendUser {
  id?: string;
  email?: string;
  fullName?: string;
  full_name?: string;
  name?: string;
  role?: string;
  approvalStatus?: string;
  approval_status?: string;
}

interface AuthPayload {
  access_token?: string;
  token?: string;
  user?: BackendUser;
}

const userRoles: UserRole[] = ['admin', 'judge', 'mentor', 'candidate'];
const approvalStatuses: ApprovalStatus[] = ['pending', 'approved', 'rejected'];

const normalizeUser = (backendUser: BackendUser | undefined): User | null => {
  const fullName = backendUser?.fullName || backendUser?.full_name || backendUser?.name;
  const approvalStatus = backendUser?.approvalStatus || backendUser?.approval_status;

  if (
    !backendUser?.id ||
    !backendUser.email ||
    !fullName ||
    !backendUser.role ||
    !userRoles.includes(backendUser.role as UserRole) ||
    !approvalStatus ||
    !approvalStatuses.includes(approvalStatus as ApprovalStatus)
  ) {
    return null;
  }

  return {
    id: backendUser.id,
    email: backendUser.email,
    fullName,
    role: backendUser.role as UserRole,
    approvalStatus: approvalStatus as ApprovalStatus,
  };
};

const getRedirectPath = (user: User): string => {
  if (user.approvalStatus === 'pending') return '/onboarding';
  if (user.approvalStatus === 'rejected') return '/login?error=auth_rejected';

  return {
    admin: '/admin/dashboard',
    judge: '/judge',
    mentor: '/mentor',
    candidate: '/dashboard',
  }[user.role];
};

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // Unified login form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGithub, setIsLoadingGithub] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    searchParams.get('error') === 'auth_rejected'
      ? 'Tài khoản chưa được phê duyệt để truy cập hệ thống.'
      : searchParams.get('error') === 'auth_failed'
      ? 'Đăng nhập thất bại. Vui lòng thử lại.'
      : null,
  );

  // Unified Login Handler
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const userClean = identifier.trim().toLowerCase();
    const passClean = password.trim();

    if (!userClean || !passClean) {
      setErrorMessage('Vui lòng nhập đầy đủ tài khoản/email và mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axiosClient.post<ApiResponse<AuthPayload>>('/auth/login', {
        email: userClean,
        password: passClean,
      });
      const authData = response.data.data;
      const token = authData?.access_token || authData?.token;
      const user = normalizeUser(authData?.user);

      if (!token || !user) {
        throw new Error('Invalid login response');
      }

      login(user, token);
      navigate(getRedirectPath(user));
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : null;
      setErrorMessage(message || 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle GitHub OAuth login (Quick developer login)
  const handleGithubLogin = async () => {
    setErrorMessage(null);
    setIsLoadingGithub(true);

    try {
      const response = await axiosClient.get<ApiResponse<{ url: string }> | { url: string }>('/auth/github');
      const authUrl = 'data' in response.data ? response.data.data?.url : response.data.url;

      if (!authUrl) {
        throw new Error('GitHub OAuth URL is missing');
      }

      window.location.href = authUrl;
    } catch {
      setErrorMessage('Không thể kết nối đến máy chủ xác thực GitHub. Vui lòng thử lại sau.');
      setIsLoadingGithub(false);
    }
  };

  return (
    <main
      className="min-h-screen bg-[#080D18] bg-cover bg-center bg-no-repeat font-['Roboto'] flex items-center justify-center p-4 sm:p-8"
      style={{ backgroundImage: "url('/login-background.png')" }}
    >
      <div className="flex min-h-screen w-full items-center justify-center bg-[#080D18]/50 px-4 py-8 sm:px-8">
        <div className="grid w-full max-w-[1280px] items-center gap-12 lg:grid-cols-2">
          {/* Left Branding Section */}
          <section className="flex flex-col items-center justify-center text-center">
            <img
              src="/hackflow-logo.svg"
              alt="HackFlow"
              className="h-auto w-[min(70vw,420px)] object-contain drop-shadow-2xl"
            />
            <p
              className="relative top-[-180px] mt-6 max-w-[500px] text-center font-['Roboto'] text-[24px] font-bold leading-relaxed sm:top-[-180px] sm:text-[30px]"
              style={{
                background: 'radial-gradient(circle, #FFFFFF 0%, #6366F1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Cổng kết nối và quản lý dự án
              <br />
              Hackathon khép kín
            </p>
          </section>

          {/* Right Login Card */}
          <section className="w-full max-w-[480px] mx-auto rounded-[20px] border border-[#334155] bg-[#1E293B]/95 p-6 shadow-2xl backdrop-blur-md sm:p-9">
            <div className="flex flex-col items-center">
              <h1
                className="text-center font-['Righteous'] text-[38px] font-normal leading-none sm:text-[48px]"
                style={{
                  background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                HACKFLOW
              </h1>

              <div className="mt-2 text-center">
                <p
                  className="text-[17px] font-medium leading-normal sm:text-[19px]"
                  style={{
                    background: 'linear-gradient(90deg, #6366F1 0%, #EDEDED 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Cổng đăng nhập hệ thống
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Dành cho Thí sinh, Cố vấn, Giám khảo và Ban Quản Trị
                </p>
              </div>

              {errorMessage && (
                <div
                  className="mt-4 flex items-start gap-2.5 w-full rounded-xl border border-red-800/80 bg-red-950/70 p-3 text-xs sm:text-sm text-red-200 animate-in fade-in duration-200"
                  role="alert"
                >
                  <AlertCircle size={18} className="shrink-0 text-red-400 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Single Unified Login Form */}
              <div className="w-full mt-6 space-y-4">
                <form onSubmit={handleLogin} className="flex w-full flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Email hoặc Tên tài khoản
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Nhập email hoặc tên tài khoản..."
                        required
                        className="w-full rounded-[12px] border border-[#334155] bg-[#0F172A] px-4 py-3 pl-11 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
                      />
                      <UserRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full rounded-[12px] border border-[#334155] bg-[#0F172A] px-4 py-3 pl-11 pr-11 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
                      />
                      <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    isLoading={isLoading}
                    className="mt-1 !min-h-[48px] !w-full !rounded-[12px] !bg-[#6366F1] px-6 py-3 font-['Roboto'] text-[15px] font-bold text-white hover:!bg-[#5558d9] shadow-lg shadow-[#6366F1]/25 transition-all"
                  >
                    <LogIn size={18} className="mr-2" />
                    <span>Đăng nhập hệ thống</span>
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#334155]" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#1E293B] px-3 text-slate-400 font-medium">Hoặc tiếp tục với</span>
                  </div>
                </div>

                {/* GitHub OAuth Button */}
                <button
                  type="button"
                  onClick={handleGithubLogin}
                  disabled={isLoadingGithub}
                  className="flex items-center justify-center gap-3 w-full rounded-[12px] border border-[#334155] bg-[#0F172A] hover:bg-[#152033] hover:border-slate-400 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isLoadingGithub ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <svg className="h-5 w-5 fill-current text-white" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  )}
                  <span>{isLoadingGithub ? 'Đang kết nối GitHub...' : 'Đăng nhập bằng GitHub'}</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
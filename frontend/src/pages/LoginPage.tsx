import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, UserRound } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { axiosClient } from '../api/axiosClient';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

type LoginMode = 'selection' | 'admin' | 'candidate';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loginMode, setLoginMode] = useState<LoginMode>('selection');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isLoadingGithub, setIsLoadingGithub] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    searchParams.get('error') === 'auth_rejected'
      ? 'Tài khoản GitHub chưa được phê duyệt để truy cập hệ thống.'
      : searchParams.get('error') === 'auth_failed'
        ? 'Đăng nhập GitHub thất bại. Vui lòng thử lại.'
        : null,
  );

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleAdminLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsLoadingEmail(true);
    window.setTimeout(() => {
      login(
        {
          id: email,
          email,
          fullName: email.split('@')[0],
          role: 'admin',
          approvalStatus: 'approved',
        },
        `demo-token-${email}`,
      );
      setIsLoadingEmail(false);
      navigate('/admin/dashboard');
    }, 1000);
  };

  const handleGithubLogin = async () => {
    setIsLoadingGithub(true);
    setErrorMessage(null);

    try {
      const response = await axiosClient.get<{ data?: { url?: string }; url?: string }>('/auth/github');
      const authUrl = response.data.data?.url || response.data.url;

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
      className="min-h-screen bg-[#080D18] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/login-background.png')" }}
    >
      <div className="flex min-h-screen items-center justify-center bg-[#080D18]/20 px-4 py-6 sm:px-8">
        <div className="grid w-full max-w-[1440px] items-center gap-8 lg:grid-cols-[692px_659px] lg:items-start lg:gap-0">
          <section className="relative flex flex-col items-center justify-center text-center lg:h-[851px] lg:min-h-0">
            <img
              src="/hackflow-logo.svg"
              alt="HackFlow"
              className="h-auto w-[min(65vw,420px)] object-contain sm:w-[min(52vw,520px)] lg:absolute lg:left-[18px] lg:top-[85px] lg:h-[644px] lg:w-[644px]"
            />
            <p
              className="mt-4 max-w-[505px] text-center font-['Roboto'] text-[24px] font-bold leading-auto sm:text-[30px] lg:absolute lg:left-[87px] lg:top-[492px] lg:mt-0 lg:text-[36px]"
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

          <section className="relative min-h-[min(851px,calc(100vh-48px))] w-full rounded-[12px] border border-[#334155] bg-[#1E293B] p-8 shadow-none sm:p-12 lg:mt-[25px] lg:h-[851px] lg:min-h-0 lg:px-[45px] lg:pb-[64px] lg:pt-[80px]">
            <div className="flex min-h-full flex-col items-center">
              <h1
                className="text-center font-['Righteous'] text-[42px] font-normal leading-none sm:text-[52px] lg:text-[64px]"
                style={{
                  background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                HACKFLOW
              </h1>

              {(loginMode === 'admin' || loginMode === 'candidate') && (
                <div className="mt-4 text-center font-['Roboto']">
                  <p
                    className="text-[24px] font-medium leading-normal"
                    style={{
                      background: 'linear-gradient(90deg, #6366F1 0%, #EDEDED 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Cổng đăng nhập hệ thống
                  </p>
                  <p className="mt-8 text-[24px] font-medium leading-normal text-white">
                    {loginMode === 'admin' ? 'Dành cho quản trị' : 'Dành cho thí sinh'}
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="mt-8 w-full rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-100" role="alert">
                  {errorMessage}
                </div>
              )}

              {loginMode === 'selection' ? (
                <div className="mt-20 flex w-full flex-col gap-[100px] sm:mt-24 lg:mt-[140px]">
                  <Button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setLoginMode('admin');
                    }}
                    className="!min-h-[79px] !w-full !rounded-full !bg-[#6366F1] px-6 py-[10px] font-['Roboto'] text-[18px] font-bold text-white hover:!bg-[#5558d9] sm:text-[24px]"
                  >
                    <UserRound size={24} strokeWidth={2} />
                    <span>Quản trị viên đăng nhập</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setLoginMode('candidate');
                    }}
                    className="!min-h-[79px] !w-full !rounded-full !bg-[#16A34A] px-6 py-[10px] font-['Roboto'] text-[18px] font-bold text-white hover:!bg-[#12823b] sm:text-[24px]"
                  >
                    <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    <span>Thí sinh đăng nhập</span>
                  </Button>
                </div>
              ) : loginMode === 'candidate' ? (
                <div className="mt-12 flex w-full flex-1 flex-col font-['Roboto'] sm:mt-16 lg:mt-[72px]">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setLoginMode('selection');
                    }}
                    aria-label="Quay lại chọn loại tài khoản"
                    className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-md text-[#8B5CF6] transition-colors hover:bg-[#8B5CF6]/10 hover:text-[#A78BFA] sm:left-6 sm:top-6"
                  >
                    <ArrowLeft size={28} strokeWidth={2.5} aria-hidden="true" />
                  </button>

                  <Button
                    type="button"
                    isLoading={isLoadingGithub}
                    onClick={handleGithubLogin}
                    className="mt-16 !min-h-[68px] !w-full !rounded-full !bg-[#16A34A] px-6 py-[10px] font-['Roboto'] text-[18px] font-bold text-white hover:!bg-[#12823b] sm:mt-20 sm:!min-h-[79px] sm:text-[24px]"
                  >
                    <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    <span>Đăng nhập bằng GitHub</span>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleAdminLogin} className="mt-16 flex w-full flex-col gap-5">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setLoginMode('selection');
                    }}
                    aria-label="Quay lại chọn loại tài khoản"
                    className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-md text-[#8B5CF6] transition-colors hover:bg-[#8B5CF6]/10 hover:text-[#A78BFA] sm:left-6 sm:top-6"
                  >
                    <ArrowLeft size={28} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                  <Input
                    label="Tài khoản"
                    labelClassName="!text-[23px] mb-1 text-slate-200"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Nhập..."
                    className="!h-[52px] !rounded-[30px] !border-[#334155] !bg-[#FCFCFC] px-4 py-3 text-slate-900 placeholder:text-slate-400"
                  />
                  <div className="relative">
                    <Input
                      label="Mật khẩu"
                      labelClassName="!text-[23px] mb-1 text-slate-200"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Nhập..."
                      className="!h-[52px] !rounded-[30px] !border-[#334155] !bg-[#FCFCFC] px-4 py-3 pr-12 text-slate-900 placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      onClick={() => setShowPassword((isVisible) => !isVisible)}
                      className="absolute right-3 top-[58px] -translate-y-1/2 text-[#6366F1]"
                    >
                      {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMessage('Vui lòng liên hệ quản trị viên để đặt lại mật khẩu.')}
                    className="self-end text-sm text-white underline underline-offset-4 hover:text-slate-200"
                  >
                    Quên mật khẩu?
                  </button>
                  <Button
                    type="submit"
                    isLoading={isLoadingEmail}
                    className="mt-2 !min-h-[79px] !w-full !rounded-full !bg-[#6366F1] px-6 py-[10px] font-['Roboto'] text-[18px] font-bold text-white hover:!bg-[#5558d9] sm:text-[24px]"
                  >
                    <UserRound size={24} strokeWidth={2} />
                    <span>Đăng nhập</span>
                  </Button>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

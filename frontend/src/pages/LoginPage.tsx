import React, { useState } from 'react';
import { Eye, EyeOff, UserRound, Lock, AlertCircle, LogIn } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMockStore } from '../store/useMockStore';
import { useAuthStore } from '../store/useAuthStore';
import { mockUsers } from '../mock/mockData';
import { Button } from '../components/Button';
import { GithubIcon } from '../components/common/Icons';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { switchPersona } = useMockStore();

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
  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const userClean = identifier.trim().toLowerCase();
    const passClean = password.trim();

    if (!userClean || !passClean) {
      setErrorMessage('Vui lòng nhập đầy đủ tài khoản/email và mật khẩu.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // 1. Quản trị viên (Admin)
      if (
        (userClean === 'admin' || userClean === 'admin@hackflow.dev' || userClean === 'admin@hackflow.io') &&
        (passClean === '123456' || passClean === '123' || passClean === 'Admin@2026')
      ) {
        switchPersona('admin');
        useAuthStore.getState().login(mockUsers.admin, 'mock-jwt-admin-token');
        setIsLoading(false);
        navigate('/admin/dashboard');
        return;
      }

      // 2. Ban Giám khảo (Judge)
      if (
        (userClean === 'judge' || userClean === 'judge.tech@hackathon.org') &&
        (passClean === '123456' || passClean === '123')
      ) {
        switchPersona('judge');
        useAuthStore.getState().login(mockUsers.judge, 'mock-jwt-judge-token');
        setIsLoading(false);
        navigate('/judge/dashboard');
        return;
      }

      // 3. Cố vấn chuyên môn (Mentor)
      if (
        (userClean === 'mentor' || userClean === 'mentor.ai@ailab.org.vn') &&
        (passClean === '123456' || passClean === '123')
      ) {
        switchPersona('mentor');
        useAuthStore.getState().login(mockUsers.mentor, 'mock-jwt-mentor-token');
        setIsLoading(false);
        navigate('/mentor/dashboard');
        return;
      }

      // 4. Thí sinh - Trưởng nhóm (Leader)
      if (
        (userClean === 'leader@cybersamurai.team' || userClean === 'leader' || userClean === 'user' || userClean === 'candidate') &&
        (passClean === '123456' || passClean === '123')
      ) {
        switchPersona('leader');
        useAuthStore.getState().login(mockUsers.leader, 'mock-jwt-leader-token');
        setIsLoading(false);
        navigate('/dashboard');
        return;
      }

      // 5. Thí sinh - Thành viên (Member)
      if (
        (userClean === 'member@cybersamurai.team' || userClean === 'member') &&
        (passClean === '123456' || passClean === '123')
      ) {
        switchPersona('member');
        useAuthStore.getState().login(mockUsers.member, 'mock-jwt-member-token');
        setIsLoading(false);
        navigate('/dashboard');
        return;
      }

      // 6. Thí sinh chờ duyệt (Pending)
      if (
        (userClean === 'pending@hust.edu.vn' || userClean === 'pending') &&
        (passClean === '123456' || passClean === '123')
      ) {
        switchPersona('pending');
        useAuthStore.getState().login(mockUsers.pending, 'mock-jwt-pending-token');
        setIsLoading(false);
        navigate('/onboarding');
        return;
      }

      // 7. Thí sinh bị từ chối (Rejected)
      if (
        (userClean === 'rejected@fpt.edu.vn' || userClean === 'rejected') &&
        (passClean === '123456' || passClean === '123')
      ) {
        switchPersona('rejected');
        useAuthStore.getState().login(mockUsers.rejected, 'mock-jwt-rejected-token');
        setIsLoading(false);
        navigate('/rejected');
        return;
      }

      setIsLoading(false);
      setErrorMessage('Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
    }, 450);
  };

  // Handle GitHub OAuth login (Quick developer login)
  const handleGithubLogin = () => {
    setErrorMessage(null);
    setIsLoadingGithub(true);

    setTimeout(() => {
      switchPersona('leader');
      useAuthStore.getState().login(mockUsers.leader, 'mock-jwt-github-token');
      setIsLoadingGithub(false);
      navigate('/dashboard');
    }, 550);
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
              className="mt-6 max-w-[500px] text-center font-['Roboto'] text-[24px] font-bold leading-relaxed sm:text-[30px]"
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
                    <GithubIcon size={20} className="text-white" />
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

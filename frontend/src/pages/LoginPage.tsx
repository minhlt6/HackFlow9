import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, UserRound, Lock, AlertCircle, LogIn } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { axiosClient } from '../api/axiosClient';
import { useAuthStore } from '../store/useAuthStore';
import { useMockStore } from '../store/useMockStore';
import { Button } from '../components/Button';
import type { ApprovalStatus, User, UserRole } from '../types';

interface BackendUser {
  id?: string;
  email?: string;
  fullName?: string;
  full_name?: string;
  name?: string;
  role?: string;
  approvalStatus?: string;
  approval_status?: string;
  githubUsername?: string;
  github_username?: string;
  avatarUrl?: string;
  avatar_url?: string;
}

interface AuthResponse {
  token?: string;
  access_token?: string;
  user?: BackendUser;
  data?: AuthResponse;
}

const roles: UserRole[] = ['admin', 'judge', 'mentor', 'candidate'];
const statuses: ApprovalStatus[] = ['pending', 'approved', 'rejected'];

const IDENTIFIER_ALIASES: Record<string, string> = {
  admin: 'admin@hackflow.dev',
  'admin@hackflow.io': 'admin@hackflow.dev',
  judge: 'judge.tech@hackathon.org',
  mentor: 'mentor.ai@ailab.org.vn',
  leader: 'leader@cybersamurai.team',
  candidate: 'leader@cybersamurai.team',
  user: 'leader@cybersamurai.team',
  member: 'member@cybersamurai.team',
  pending: 'pending@hust.edu.vn',
  rejected: 'rejected@fpt.edu.vn',
};

const normalizeAuthResponse = (response: AuthResponse): { user: User; token: string } | null => {
  const payload = response.data || response;
  const backendUser = payload.user;
  const role = backendUser?.role;
  const approvalStatus = backendUser?.approvalStatus || backendUser?.approval_status;
  const fullName = backendUser?.fullName || backendUser?.full_name || backendUser?.name || backendUser?.github_username;
  const githubUsername = backendUser?.githubUsername || backendUser?.github_username;
  const avatarUrl = backendUser?.avatarUrl || backendUser?.avatar_url;
  const token = payload.token || payload.access_token;
  if (!backendUser?.id || !backendUser.email || !fullName || !token || !role || !roles.includes(role as UserRole) || !approvalStatus || !statuses.includes(approvalStatus as ApprovalStatus)) {
    return null;
  }
  return {
    token,
    user: {
      id: backendUser.id,
      email: backendUser.email,
      fullName,
      role: role as UserRole,
      approvalStatus: approvalStatus as ApprovalStatus,
      githubUsername,
      avatarUrl,
    },
  };
};

const redirectForUser = (user: User): string => {
  if (user.role === 'candidate' && user.approvalStatus === 'pending') return '/onboarding';
  if (user.role === 'candidate' && user.approvalStatus === 'rejected') return '/rejected';
  return {
    admin: '/admin/dashboard',
    judge: '/judge/dashboard',
    mentor: '/mentor/dashboard',
    candidate: '/dashboard',
  }[user.role];
};

const LOCAL_DEV_DEMO_USERS: Record<string, User> = {
  'admin@hackflow.dev': {
    id: 'usr-admin-01',
    email: 'admin@hackflow.dev',
    fullName: 'BTC HackFlow Administrator',
    role: 'admin',
    approvalStatus: 'approved',
  },
  'judge.tech@hackathon.org': {
    id: 'usr-judge-01',
    email: 'judge.tech@hackathon.org',
    fullName: 'TS. Nguyễn Hoàng Giám Khảo',
    role: 'judge',
    approvalStatus: 'approved',
  },
  'mentor.ai@ailab.org.vn': {
    id: 'usr-mentor-01',
    email: 'mentor.ai@ailab.org.vn',
    fullName: 'ThS. Phạm Cố Vấn AI',
    role: 'mentor',
    approvalStatus: 'approved',
  },
  'leader@cybersamurai.team': {
    id: 'usr-minh-01',
    email: 'leader@cybersamurai.team',
    fullName: 'Nguyễn Văn Minh',
    role: 'candidate',
    approvalStatus: 'approved',
    team_role: 'TEAM_LEADER',
  },
  'member@cybersamurai.team': {
    id: 'usr-thao-02',
    email: 'member@cybersamurai.team',
    fullName: 'Trần Thị Thảo',
    role: 'candidate',
    approvalStatus: 'approved',
    team_role: 'MEMBER',
  },
  'pending@hust.edu.vn': {
    id: 'usr-pending-01',
    email: 'pending@hust.edu.vn',
    fullName: 'Vũ Hoàng Chờ Duyệt',
    role: 'candidate',
    approvalStatus: 'pending',
  },
  'rejected@fpt.edu.vn': {
    id: 'usr-rejected-01',
    email: 'rejected@fpt.edu.vn',
    fullName: 'Đặng Tuấn Từ Chối',
    role: 'candidate',
    approvalStatus: 'rejected',
  },
};

const syncMockStoreWithUser = (user: User) => {
  const mockStore = useMockStore.getState();
  let targetPersona: 'admin' | 'judge' | 'mentor' | 'leader' | 'member' | 'pending' | 'rejected';
  if (user.role === 'admin') targetPersona = 'admin';
  else if (user.role === 'judge') targetPersona = 'judge';
  else if (user.role === 'mentor') targetPersona = 'mentor';
  else if (user.approvalStatus === 'pending') targetPersona = 'pending';
  else if (user.approvalStatus === 'rejected') targetPersona = 'rejected';
  else if (user.email.toLowerCase().includes('member')) targetPersona = 'member';
  else targetPersona = 'leader';

  mockStore.switchPersona(targetPersona);
  mockStore.updateCurrentUserProfile({
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    approvalStatus: user.approvalStatus,
    githubUsername: user.githubUsername,
    avatarUrl: user.avatarUrl,
  });
};

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Unified login form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGithub, setIsLoadingGithub] = useState(false);
  const [prefetchedGithubUrl, setPrefetchedGithubUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    searchParams.get('error') === 'auth_rejected'
      ? 'Tài khoản chưa được phê duyệt để truy cập hệ thống.'
      : searchParams.get('error') === 'auth_failed'
      ? 'Đăng nhập thất bại. Vui lòng thử lại.'
      : null,
  );

  // Pre-fetch GitHub OAuth URL on mount so clicking the button redirects immediately
  useEffect(() => {
    let active = true;
    const redirectUri = `${window.location.origin}/auth/callback`;
    axiosClient
      .get<{ url?: string; data?: { url?: string } }>('/auth/github', {
        params: { redirect_uri: redirectUri },
      })
      .then((response) => {
        const authUrl = response.data.data?.url || response.data.url;
        if (active && authUrl) {
          setPrefetchedGithubUrl(authUrl);
        }
      })
      .catch(() => {
        // Ignore pre-fetch error; will retry on click
      });
    return () => {
      active = false;
    };
  }, []);

  // Unified Login Handler
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const rawIdentifier = identifier.trim().toLowerCase();
    const userClean = IDENTIFIER_ALIASES[rawIdentifier] || rawIdentifier;
    const rawPass = password.trim();
    const passClean = rawPass === '123' || rawPass === 'Admin@2026' ? '123456' : rawPass;

    if (!userClean || !passClean) {
      setErrorMessage('Vui lòng nhập đầy đủ tài khoản/email và mật khẩu.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosClient.post<AuthResponse>('/auth/login', { email: userClean, password: passClean });
      const auth = normalizeAuthResponse(response.data);
      if (!auth) throw new Error('Invalid login response');
      useAuthStore.getState().login(auth.user, auth.token);
      syncMockStoreWithUser(auth.user);
      navigate(redirectForUser(auth.user), { replace: true });
    } catch (err: unknown) {
      // Chỉ ở môi trường DEV local khi không bật Backend (Network Error), hỗ trợ đăng nhập tài khoản demo
      // Trên Production (Railway), luôn bắt buộc xác thực qua Backend thật.
      const hasHttpResponse =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        Boolean((err as { response?: { status?: number } }).response?.status);

      const devFallbackUser = LOCAL_DEV_DEMO_USERS[userClean];
      if (import.meta.env.DEV && !hasHttpResponse && devFallbackUser && passClean === '123456') {
        useAuthStore.getState().login(devFallbackUser, `dev-local-token-${devFallbackUser.id}`);
        syncMockStoreWithUser(devFallbackUser);
        navigate(redirectForUser(devFallbackUser), { replace: true });
        return;
      }

      setErrorMessage('Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle GitHub OAuth login (Quick developer login)
  const handleGithubLogin = async () => {
    setErrorMessage(null);
    setIsLoadingGithub(true);

    if (prefetchedGithubUrl) {
      window.location.href = prefetchedGithubUrl;
      return;
    }

    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const response = await axiosClient.get<{ url?: string; data?: { url?: string } }>('/auth/github', {
        params: { redirect_uri: redirectUri },
      });
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
              className="relative top-[-160px] mt-6 max-w-[500px] text-center font-['Roboto'] text-[24px] font-bold leading-relaxed sm:top-[-160px] sm:text-[30px]"
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
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 fill-white"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.26c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.84 1.23 1.84 1.23 1.07 1.84 2.8 1.31 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.23A11.5 11.5 0 0 1 12 6.2c1.02 0 2.05.14 3.01.42 2.3-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.62-2.8 5.65-5.48 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
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
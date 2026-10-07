import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, UserRound, Sparkles, Github, ShieldAlert } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMockStore } from '../store/useMockStore';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

type LoginMode = 'selection' | 'admin' | 'candidate';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loginMode, setLoginMode] = useState<LoginMode>('selection');
  const [email, setEmail] = useState('admin@hackflow.io');
  const [password, setPassword] = useState('Admin@2026');
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
  const { switchPersona } = useMockStore();

  const handleAdminLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsLoadingEmail(true);
    setTimeout(() => {
      switchPersona('admin');
      setIsLoadingEmail(false);
      navigate('/admin/dashboard');
    }, 600);
  };

  const handleGithubLogin = () => {
    setIsLoadingGithub(true);
    setErrorMessage(null);

    setTimeout(() => {
      switchPersona('leader');
      setIsLoadingGithub(false);
      navigate('/dashboard');
    }, 600);
  };

  const handleQuickPersona = (
    persona: 'admin' | 'leader' | 'member' | 'pending' | 'rejected' | 'mentor' | 'judge',
    destination: string,
  ) => {
    switchPersona(persona);
    navigate(destination);
  };

  return (
    <main
      className="min-h-screen bg-[#080D18] bg-cover bg-center bg-no-repeat font-['Roboto']"
      style={{ backgroundImage: "url('/login-background.png')" }}
    >
      <div className="flex min-h-screen items-center justify-center bg-[#080D18]/40 px-4 py-6 sm:px-8">
        <div className="grid w-full max-w-[1440px] items-center gap-8 lg:grid-cols-[692px_659px] lg:items-start lg:gap-0">
          {/* Left Branding Section */}
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

          {/* Right Login Card */}
          <section className="relative min-h-[min(851px,calc(100vh-48px))] w-full rounded-[12px] border border-[#334155] bg-[#1E293B] p-8 shadow-2xl sm:p-12 lg:mt-[25px] lg:h-[851px] lg:min-h-0 lg:px-[45px] lg:pb-[48px] lg:pt-[60px] overflow-y-auto">
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
                  <p className="mt-4 text-[20px] font-medium leading-normal text-white">
                    {loginMode === 'admin' ? 'Dành cho quản trị viên' : 'Dành cho thí sinh GitHub'}
                  </p>
                </div>
              )}

              {errorMessage && (
                <div
                  className="mt-6 w-full rounded-lg border border-red-800 bg-red-950/60 p-3 text-sm text-red-200"
                  role="alert"
                >
                  {errorMessage}
                </div>
              )}

              {loginMode === 'selection' ? (
                <div className="mt-12 flex w-full flex-col items-center space-y-6 sm:mt-16">
                  {/* Master Login Buttons */}
                  <div className="flex w-full flex-col gap-6">
                    <Button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setLoginMode('admin');
                      }}
                      className="!min-h-[68px] !w-full !rounded-full !bg-[#6366F1] px-6 py-[10px] font-['Roboto'] text-[18px] font-bold text-white hover:!bg-[#5558d9] sm:text-[22px] shadow-lg shadow-[#6366F1]/20"
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
                      className="!min-h-[68px] !w-full !rounded-full !bg-[#16A34A] px-6 py-[10px] font-['Roboto'] text-[18px] font-bold text-white hover:!bg-[#12823b] sm:text-[22px] shadow-lg shadow-emerald-600/20"
                    >
                      <Github size={24} />
                      <span>Thí sinh đăng nhập (GitHub)</span>
                    </Button>
                  </div>

                  {/* 1-Click Persona Demo Section */}
                  <div className="w-full pt-6 border-t border-[#334155]/80">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
                        <Sparkles size={14} className="text-[#818CF8]" />
                        <span>Trải nghiệm nhanh các vai trò (1-Click Demo)</span>
                      </div>
                      <span className="text-[11px] text-slate-400">7 Personas</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <button
                        onClick={() => handleQuickPersona('admin', '/admin/dashboard')}
                        className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#0F172A] border border-[#334155] hover:border-[#6366F1] hover:bg-[#0F172A]/90 transition-all text-left group"
                      >
                        <div>
                          <div className="font-bold text-[#818CF8] group-hover:text-white">
                            👑 Quản trị viên (Admin)
                          </div>
                          <div className="text-[11px] text-slate-400">Quản trị toàn diện</div>
                        </div>
                        <span className="text-[10px] text-slate-400 group-hover:text-[#818CF8]">
                          Vào →
                        </span>
                      </button>

                      <button
                        onClick={() => handleQuickPersona('leader', '/dashboard')}
                        className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#0F172A] border border-[#334155] hover:border-emerald-500 hover:bg-[#0F172A]/90 transition-all text-left group"
                      >
                        <div>
                          <div className="font-bold text-emerald-400 group-hover:text-white">
                            🚀 Đội trưởng (CyberSentinels)
                          </div>
                          <div className="text-[11px] text-slate-400">Đã chọn đề tài AI</div>
                        </div>
                        <span className="text-[10px] text-slate-400 group-hover:text-emerald-400">
                          Vào →
                        </span>
                      </button>

                      <button
                        onClick={() => handleQuickPersona('member', '/dashboard')}
                        className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#0F172A] border border-[#334155] hover:border-cyan-500 hover:bg-[#0F172A]/90 transition-all text-left group"
                      >
                        <div>
                          <div className="font-bold text-cyan-400 group-hover:text-white">
                            💻 Thành viên (EcoPulse)
                          </div>
                          <div className="text-[11px] text-slate-400">Đội thi GreenTech</div>
                        </div>
                        <span className="text-[10px] text-slate-400 group-hover:text-cyan-400">
                          Vào →
                        </span>
                      </button>

                      <button
                        onClick={() => handleQuickPersona('judge', '/judge/dashboard')}
                        className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#0F172A] border border-[#334155] hover:border-blue-400 hover:bg-[#0F172A]/90 transition-all text-left group"
                      >
                        <div>
                          <div className="font-bold text-blue-400 group-hover:text-white">
                            ⚖️ Giám khảo (Judge Vance)
                          </div>
                          <div className="text-[11px] text-slate-400">Chấm thi 2 màn hình</div>
                        </div>
                        <span className="text-[10px] text-slate-400 group-hover:text-blue-400">
                          Vào →
                        </span>
                      </button>

                      <button
                        onClick={() => handleQuickPersona('mentor', '/mentor/dashboard')}
                        className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#0F172A] border border-[#334155] hover:border-purple-400 hover:bg-[#0F172A]/90 transition-all text-left group"
                      >
                        <div>
                          <div className="font-bold text-purple-400 group-hover:text-white">
                            🎓 Cố vấn (Dr. Le Quang)
                          </div>
                          <div className="text-[11px] text-slate-400">Helpdesk & giải đáp</div>
                        </div>
                        <span className="text-[10px] text-slate-400 group-hover:text-purple-400">
                          Vào →
                        </span>
                      </button>

                      <button
                        onClick={() => handleQuickPersona('pending', '/onboarding')}
                        className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#0F172A] border border-[#334155] hover:border-amber-400 hover:bg-[#0F172A]/90 transition-all text-left group"
                      >
                        <div>
                          <div className="font-bold text-amber-300 group-hover:text-white">
                            ⏳ Chờ duyệt (Pending)
                          </div>
                          <div className="text-[11px] text-slate-400">Màn hình Onboarding</div>
                        </div>
                        <span className="text-[10px] text-slate-400 group-hover:text-amber-300">
                          Vào →
                        </span>
                      </button>

                      <button
                        onClick={() => handleQuickPersona('rejected', '/rejected')}
                        className="col-span-1 sm:col-span-2 flex items-center justify-between p-2.5 rounded-[10px] bg-[#0F172A] border border-[#334155] hover:border-rose-400 hover:bg-[#0F172A]/90 transition-all text-left group"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldAlert size={16} className="text-rose-400" />
                          <div>
                            <span className="font-bold text-rose-400 group-hover:text-white">
                              ❌ Bị từ chối (Rejected Account)
                            </span>
                            <span className="ml-2 text-[11px] text-slate-400">
                              Mô phỏng trường hợp không thuộc Whitelist
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 group-hover:text-rose-400">
                          Vào →
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : loginMode === 'candidate' ? (
                <div className="mt-8 flex w-full flex-1 flex-col font-['Roboto'] sm:mt-12">
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

                  <div className="rounded-[12px] bg-[#0F172A] border border-[#334155] p-5 text-sm text-slate-300 space-y-3">
                    <p className="font-semibold text-white">Quy trình xác thực Thí sinh:</p>
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400">
                      <li>Hệ thống liên kết trực tiếp với tài khoản GitHub cá nhân.</li>
                      <li>
                        Tài khoản hợp lệ phải có email thuộc <strong>Whitelist</strong> của Ban Tổ Chức.
                      </li>
                      <li>Sau khi cấp quyền, tài khoản sẽ được chuyển sang giao diện thí sinh.</li>
                    </ul>
                  </div>

                  <Button
                    type="button"
                    isLoading={isLoadingGithub}
                    onClick={handleGithubLogin}
                    className="mt-8 !min-h-[68px] !w-full !rounded-full !bg-[#16A34A] px-6 py-[10px] font-['Roboto'] text-[18px] font-bold text-white hover:!bg-[#12823b] sm:text-[22px] shadow-lg shadow-emerald-600/20"
                  >
                    <Github size={24} />
                    <span>Xác thực qua GitHub OAuth</span>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleAdminLogin} className="mt-8 flex w-full flex-col gap-4">
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
                    label="Tài khoản Quản trị (Email)"
                    labelClassName="!text-sm mb-1 text-slate-300 font-medium"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@hackflow.io"
                  />

                  <div className="relative">
                    <Input
                      label="Mật khẩu"
                      labelClassName="!text-sm mb-1 text-slate-300 font-medium"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Nhập mật khẩu..."
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      onClick={() => setShowPassword((isVisible) => !isVisible)}
                      className="absolute right-3 top-[38px] text-[#6366F1] hover:text-[#818CF8]"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Mặc định demo: admin@hackflow.io</span>
                    <button
                      type="button"
                      onClick={() =>
                        setErrorMessage('Gợi ý tài khoản: admin@hackflow.io / mật khẩu bất kỳ.')
                      }
                      className="text-[#818CF8] hover:underline"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    isLoading={isLoadingEmail}
                    className="mt-4 !min-h-[64px] !w-full !rounded-full !bg-[#6366F1] px-6 py-[10px] font-['Roboto'] text-[18px] font-bold text-white hover:!bg-[#5558d9] sm:text-[22px] shadow-lg shadow-[#6366F1]/20"
                  >
                    <UserRound size={22} strokeWidth={2} />
                    <span>Đăng nhập Quản trị</span>
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

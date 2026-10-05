import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { axiosClient } from '../api/axiosClient';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (email && password) {
      setIsLoadingEmail(true);
      setTimeout(() => {
        login(
          {
            id: email,
            email,
            fullName: email.split('@')[0],
            role: 'candidate',
            approvalStatus: 'approved',
          },
          `demo-token-${email}`,
        );
        setIsLoadingEmail(false);
        navigate('/dashboard');
      }, 1000);
    } else {
      setErrorMessage('Vui lòng nhập đầy đủ thông tin tài khoản và mật khẩu!');
    }
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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 space-y-6">
        
        {/* Logo HackFlow và slogan */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">HackFlow</h2>
          <p className="text-sm text-slate-400 mt-2">Hệ thống quản lý dự án Hackathon chuyên nghiệp</p>
        </div>

        {/* Hiển thị lỗi thân thiện trên giao diện nếu có */}
        {errorMessage && (
          <div className="p-3 text-sm text-red-200 bg-red-950/50 border border-red-800 rounded-lg">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email tài khoản"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />

          <Input
            label="Mật khẩu"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoadingEmail}
            className="w-full py-3"
          >
            Đăng nhập
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-600"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-800 px-2 text-slate-400">Hoặc</span>
          </div>
        </div>

        {/* Nút Đăng nhập bằng GitHub chuẩn chỉnh, có loading và chống spam click */}
        <Button
          type="button"
          variant="secondary"
          isLoading={isLoadingGithub}
          onClick={handleGithubLogin}
          className="w-full py-3 flex items-center justify-center gap-3 bg-slate-900 text-white hover:bg-slate-800 border-slate-900"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span>Đăng nhập bằng GitHub</span>
        </Button>
      </div>
    </div>
  );
};
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { axiosClient } from '../api/axiosClient';
import { useAuthStore } from '../store/useAuthStore';
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
}

interface AuthPayload {
  token?: string;
  access_token?: string;
  user?: BackendUser;
}

interface AuthResponse extends AuthPayload {
  data?: AuthPayload;
}

const userRoles: UserRole[] = ['admin', 'judge', 'mentor', 'candidate'];
const approvalStatuses: ApprovalStatus[] = ['pending', 'approved', 'rejected'];

const isUserRole = (value: string): value is UserRole => userRoles.includes(value as UserRole);
const isApprovalStatus = (value: string): value is ApprovalStatus =>
  approvalStatuses.includes(value as ApprovalStatus);

const normalizeUser = (backendUser: BackendUser | undefined): User | null => {
  if (!backendUser?.id || !backendUser.email || !backendUser.role) {
    return null;
  }

  const fullName = backendUser.fullName || backendUser.full_name || backendUser.name;
  const approvalStatus = backendUser.approvalStatus || backendUser.approval_status;

  if (!fullName || !approvalStatus || !isUserRole(backendUser.role) || !isApprovalStatus(approvalStatus)) {
    return null;
  }

  return {
    id: backendUser.id,
    email: backendUser.email,
    fullName,
    role: backendUser.role,
    approvalStatus,
  };
};

const getRedirectPath = (user: User): string => {
  if (user.approvalStatus === 'pending') {
    return '/onboarding';
  }

  if (user.approvalStatus === 'rejected') {
    return '/login?error=auth_rejected';
  }

  return {
    admin: '/admin/dashboard',
    judge: '/judge',
    mentor: '/mentor',
    candidate: '/dashboard',
  }[user.role];
};

export const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    const completeGithubLogin = async () => {
      const code = searchParams.get('code');

      if (!code) {
        navigate('/login?error=auth_failed', { replace: true });
        return;
      }

      try {
        const response = await axiosClient.post<AuthResponse>('/auth/github/callback', { code });
        const authData = response.data.data || response.data;
        const token = authData.token || authData.access_token;
        const user = normalizeUser(authData.user);

        if (!token || !user) {
          throw new Error('Invalid GitHub callback response');
        }

        login(user, token);
        navigate(getRedirectPath(user), { replace: true });
      } catch {
        navigate('/login?error=auth_failed', { replace: true });
      }
    };

    void completeGithubLogin();
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-3">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-300">Đang hoàn tất xác thực tài khoản GitHub...</p>
      </div>
    </div>
  );
};

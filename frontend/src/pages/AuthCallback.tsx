import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import type { ApprovalStatus, User, UserRole } from '../types';

const userRoles: UserRole[] = ['admin', 'judge', 'mentor', 'participant'];
const approvalStatuses: ApprovalStatus[] = ['pending', 'approved', 'rejected'];

const isUserRole = (value: string): value is UserRole => userRoles.includes(value as UserRole);
const isApprovalStatus = (value: string): value is ApprovalStatus =>
  approvalStatuses.includes(value as ApprovalStatus);

const getUserFromParams = (searchParams: URLSearchParams): User | null => {
  const rawUser = searchParams.get('user');

  if (rawUser) {
    try {
      const parsedUser = JSON.parse(rawUser) as Partial<User>;
      if (
        typeof parsedUser.id === 'string' &&
        typeof parsedUser.email === 'string' &&
        typeof parsedUser.fullName === 'string' &&
        typeof parsedUser.role === 'string' &&
        isUserRole(parsedUser.role) &&
        typeof parsedUser.approvalStatus === 'string' &&
        isApprovalStatus(parsedUser.approvalStatus)
      ) {
        return parsedUser as User;
      }
    } catch {
      return null;
    }
  }

  const email = searchParams.get('email');
  const fullName = searchParams.get('name');
  const role = searchParams.get('role');
  const approvalStatus = searchParams.get('approvalStatus');

  if (
    !email ||
    !fullName ||
    !role ||
    !approvalStatus ||
    !isUserRole(role) ||
    !isApprovalStatus(approvalStatus)
  ) {
    return null;
  }

  return {
    id: searchParams.get('id') || email,
    email,
    fullName,
    role,
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
    participant: '/dashboard',
  }[user.role];
};

export const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    const token =
      searchParams.get('token') ||
      searchParams.get('access_token') ||
      searchParams.get('accessToken');
    const user = getUserFromParams(searchParams);

    if (token && user) {
      login(user, token);
      navigate(getRedirectPath(user), { replace: true });
    } else {
      navigate('/login?error=auth_failed', { replace: true });
    }
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center space-y-3">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-300">Đang hoàn tất xác thực tài khoản GitHub...</p>
      </div>
    </div>
  );
};
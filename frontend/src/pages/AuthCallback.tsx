import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { axiosClient } from '../api/axiosClient';
import { useAuthStore } from '../store/useAuthStore';
import { useMockStore } from '../store/useMockStore';
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
  studentId?: string;
  student_id?: string;
  university?: string;
  school?: string;
  phone?: string;
  skills?: string[];
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

  const fullName = (backendUser.fullName || backendUser.full_name || backendUser.name || backendUser.github_username)?.trim();
  const approvalStatus = backendUser.approvalStatus || backendUser.approval_status;
  const githubUsername = backendUser.githubUsername || backendUser.github_username;
  const avatarUrl = backendUser.avatarUrl || backendUser.avatar_url;
  const studentId = backendUser.studentId || backendUser.student_id;
  const university = backendUser.university || backendUser.school;

  if (!fullName || !approvalStatus || !isUserRole(backendUser.role) || !isApprovalStatus(approvalStatus)) {
    return null;
  }

  return {
    id: backendUser.id,
    email: backendUser.email,
    fullName,
    role: backendUser.role,
    approvalStatus,
    githubUsername,
    avatarUrl,
    studentId,
    university,
    school: university,
    phone: backendUser.phone,
    skills: Array.isArray(backendUser.skills) ? backendUser.skills : undefined,
  };
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

const getRedirectPath = (user: User): string => {
  if (user.approvalStatus === 'pending') {
    return '/onboarding';
  }

  if (user.approvalStatus === 'rejected') {
    return '/login?error=auth_rejected';
  }

  return {
    admin: '/admin/dashboard',
    judge: '/judge/dashboard',
    mentor: '/mentor/dashboard',
    candidate: '/dashboard',
  }[user.role];
};

const processedOAuthCodes = new Set<string>();

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

      if (processedOAuthCodes.has(code)) {
        return;
      }
      processedOAuthCodes.add(code);

      try {
        const redirectUri = `${window.location.origin}/auth/callback`;
        const response = await axiosClient.post<AuthResponse>('/auth/github/callback', {
          code,
          redirect_uri: redirectUri,
        });
        const authData = response.data.data || response.data;
        const token = authData.token || authData.access_token;
        const user = normalizeUser(authData.user);

        if (!token || !user) {
          throw new Error('Invalid GitHub callback response');
        }

        login(user, token);
        syncMockStoreWithUser(user);
        navigate(getRedirectPath(user), { replace: true });
      } catch {
        processedOAuthCodes.delete(code);
        navigate('/login?error=auth_failed', { replace: true });
      }
    };

    void completeGithubLogin();
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/60 text-foreground">
      <div className="text-center space-y-3">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">Đang hoàn tất xác thực tài khoản GitHub...</p>
      </div>
    </div>
  );
};
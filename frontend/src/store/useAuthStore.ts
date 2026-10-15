import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
}

export const DEFAULT_MOCK_USER: User = {
  id: 'usr-minh-01',
  email: 'leader@cybersamurai.team',
  fullName: 'Nguyễn Văn Minh',
  role: 'candidate',
  approvalStatus: 'approved',
  team_role: 'TEAM_LEADER',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: DEFAULT_MOCK_USER,
      token: 'mock-leader-token-2026',
      isAuthenticated: true,
      login: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      },
      updateUser: (updatedUser) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null,
        })),
    }),
    {
      name: 'auth-storage',
      merge: (persistedState, currentState) => {
        const p = persistedState as Partial<AuthState> | undefined;
        const user = p?.user;
        if (!user || user.fullName === 'Nguyễn Văn Minh' || user.email === 'leader@cybersamurai.team') {
          return {
            ...currentState,
            ...p,
            user: {
              ...(user || DEFAULT_MOCK_USER),
              approvalStatus: 'approved' as const,
              team_role: 'TEAM_LEADER' as const,
            },
            isAuthenticated: true,
          };
        }
        return { ...currentState, ...p };
      },
    }
  )
);
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

const isLocalMockAuth =
  import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH === 'true';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: isLocalMockAuth ? DEFAULT_MOCK_USER : null,
      token: isLocalMockAuth ? 'mock-leader-token-2026' : null,
      isAuthenticated: isLocalMockAuth,
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

        // Nếu không bật VITE_MOCK_AUTH mà trong localStorage còn lưu token giả từ bản test cũ,
        // tự động xóa phiên giả để bảo toàn luồng đăng nhập thật.
        if (!isLocalMockAuth && p?.token?.startsWith('mock-')) {
          localStorage.removeItem('token');
          return {
            ...currentState,
            user: null,
            token: null,
            isAuthenticated: false,
          };
        }

        // Chỉ tự động gán user mẫu khi dev chủ động bật VITE_MOCK_AUTH=true ở local
        if (isLocalMockAuth && !p?.user) {
          return {
            ...currentState,
            ...p,
            user: DEFAULT_MOCK_USER,
            token: 'mock-leader-token-2026',
            isAuthenticated: true,
          };
        }

        return { ...currentState, ...p };
      },
    }
  )
);
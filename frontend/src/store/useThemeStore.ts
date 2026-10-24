import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const applyThemeToDom = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        applyThemeToDom(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next: ThemeMode = get().theme === 'light' ? 'dark' : 'light';
        applyThemeToDom(next);
        set({ theme: next });
      },
    }),
    {
      name: 'hackflow-theme-storage',
      onRehydrateStorage: () => (state) => {
        applyThemeToDom(state?.theme ?? 'light');
      },
    },
  ),
);

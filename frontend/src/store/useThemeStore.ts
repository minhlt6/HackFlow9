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
  const disableTransitions = document.createElement('style');
  disableTransitions.appendChild(
    document.createTextNode(
      '*, *::before, *::after { transition: none !important; animation-duration: 0s !important; }',
    ),
  );
  document.head.appendChild(disableTransitions);

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Force synchronous reflow before re-enabling transitions on next frame
  void window.getComputedStyle(root).opacity;
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (disableTransitions.parentNode) {
          disableTransitions.parentNode.removeChild(disableTransitions);
        }
      });
    });
  } else if (disableTransitions.parentNode) {
    disableTransitions.parentNode.removeChild(disableTransitions);
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

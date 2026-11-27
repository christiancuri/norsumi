import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return media().matches ? 'dark' : 'light';
  return theme;
}

function apply(theme: Theme) {
  const root = document.documentElement;
  // Kill transitions during the swap so every surface flips at once.
  root.classList.add('[&_*]:transition-none!');
  root.classList.toggle('dark', resolveTheme(theme) === 'dark');
  requestAnimationFrame(() => root.classList.remove('[&_*]:transition-none!'));
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        apply(theme);
        set({ theme });
      },
    }),
    { name: 'norsumi-theme' },
  ),
);

/** Follow the OS while the user is on "system". */
export function watchSystemTheme() {
  media().addEventListener('change', () => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') apply(theme);
  });
}

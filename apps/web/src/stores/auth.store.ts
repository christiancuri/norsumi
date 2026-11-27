import type { AuthSession, User } from '@norsumi/common';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STORAGE_KEY = 'norsumi-auth';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** Where the guard sends you after a deliberate sign-out. */
  exitTo: string | null;
  setSession: (session: AuthSession) => void;
  setUser: (user: User) => void;
  setTokens: (token: string, refreshToken: string) => void;
  logout: (exitTo?: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      exitTo: null,
      setSession: ({ user, accessToken, refreshToken }) =>
        set({
          user,
          token: accessToken,
          refreshToken,
          isAuthenticated: true,
          exitTo: null,
        }),
      setUser: (user) => set({ user }),
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      logout: (exitTo) =>
        set({
          exitTo: exitTo ?? null,
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    { name: STORAGE_KEY },
  ),
);

/**
 * Tabs share one persisted session. When another tab rotates tokens or signs
 * out, re-read it so this tab never spends a stale refresh token.
 */
export function syncAuthAcrossTabs() {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) void useAuthStore.persist.rehydrate();
  });
}

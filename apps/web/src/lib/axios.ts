import type { AuthSession } from '@norsumi/common';
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { config } from 'src/config';
import { useAuthStore } from 'src/stores/auth.store';

export const api = axios.create({
  baseURL: config.apiUrl,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().token;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Refresh tokens rotate on every use, and reusing a spent one revokes the
// whole family. So: one refresh in flight per tab, other tabs pick up rotated
// tokens through the persisted store (see `syncAuthAcrossTabs`), and a 409
// (token rotated <30s ago by another tab/request) retries once with the
// latest stored token. Only a 401 from /auth/refresh means "signed out".
let refreshPromise: Promise<string> | null = null;

const statusOf = (error: unknown) =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function latestRefreshToken() {
  await useAuthStore.persist.rehydrate();
  return useAuthStore.getState().refreshToken;
}

async function postRefresh(refreshToken: string) {
  const { data } = await axios.post<AuthSession>(
    `${config.apiUrl}/auth/refresh`,
    { refreshToken },
  );
  useAuthStore.getState().setSession(data);
  return data.accessToken;
}

async function rotate(refreshToken: string): Promise<string> {
  try {
    return await postRefresh(refreshToken);
  } catch (error) {
    if (statusOf(error) !== 409) throw error;
    // Another tab/request just rotated it. Its write to storage may land a
    // moment later, so look twice before giving up.
    for (const delay of [0, 400, 1200]) {
      await wait(delay);
      const latest = await latestRefreshToken();
      if (latest && latest !== refreshToken) {
        // The other tab also stored a fresh access token; use it as is.
        const token = useAuthStore.getState().token;
        if (token) return token;
        return postRefresh(latest);
      }
    }
    throw error;
  }
}

function refreshAccessToken(refreshToken: string) {
  refreshPromise ??= rotate(refreshToken).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const isAuthRoute = /\/auth\//.test(original?.url ?? '');

    if (
      !original ||
      error.response?.status !== 401 ||
      original._retry ||
      isAuthRoute
    ) {
      throw error;
    }
    original._retry = true;

    const sentWith = original.headers.Authorization;
    const { token, refreshToken, logout } = useAuthStore.getState();
    // A concurrent refresh (this tab or another) already got a new token.
    if (token && sentWith !== `Bearer ${token}`) {
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    }
    if (!refreshToken) {
      logout();
      throw error;
    }
    try {
      const fresh = await refreshAccessToken(refreshToken);
      original.headers.Authorization = `Bearer ${fresh}`;
      return api(original);
    } catch (refreshError) {
      if (statusOf(refreshError) === 401) logout();
      throw error;
    }
  },
);

/** Human message out of an API error (`ApiError.message`) or anything else. */
export function errorMessage(
  error: unknown,
  fallback = 'Something went wrong',
) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

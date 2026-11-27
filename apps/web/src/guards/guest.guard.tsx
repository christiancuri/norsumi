import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from 'src/stores/auth.store';

interface FromState {
  from?: { pathname: string; search?: string };
}

export function GuestGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  if (isAuthenticated) {
    const from = (location.state as FromState | null)?.from;
    const to = from ? `${from.pathname}${from.search ?? ''}` : '/library';
    return <Navigate to={to} replace />;
  }
  return children;
}

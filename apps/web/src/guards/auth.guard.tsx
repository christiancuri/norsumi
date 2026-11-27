import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from 'src/stores/auth.store';

export function AuthGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const exitTo = useAuthStore((s) => s.exitTo);
  const location = useLocation();
  if (!isAuthenticated) {
    if (exitTo) return <Navigate to={exitTo} replace />;
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

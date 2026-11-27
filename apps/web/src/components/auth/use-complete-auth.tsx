import type { AuthSession } from '@norsumi/common';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from 'src/stores/auth.store';

/** Store the session and land in the library. */
export function useCompleteAuth() {
  const navigate = useNavigate();
  return useCallback(
    (session: AuthSession) => {
      useAuthStore.getState().setSession(session);
      navigate('/library', { replace: true });
    },
    [navigate],
  );
}

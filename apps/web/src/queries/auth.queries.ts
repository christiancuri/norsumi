import { createMutation, createQuery } from 'react-query-kit';
import { queryKeys } from 'src/lib/query-keys';
import { AuthService } from 'src/services/auth.service';

export const useServerInfo = createQuery({
  queryKey: queryKeys.info,
  fetcher: () => AuthService.info(),
  staleTime: 5 * 60_000,
  retry: false,
});

export const useMe = createQuery({
  queryKey: queryKeys.me,
  fetcher: () => AuthService.me(),
});

export const useLogin = createMutation({ mutationFn: AuthService.login });
export const useRegister = createMutation({ mutationFn: AuthService.register });
export const useGoogleLogin = createMutation({
  mutationFn: AuthService.google,
});
export const useDeleteMe = createMutation({ mutationFn: AuthService.deleteMe });
export const useUpdateMe = createMutation({ mutationFn: AuthService.updateMe });

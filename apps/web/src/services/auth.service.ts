import type {
  DeleteMeBody,
  LoginBody,
  RegisterBody,
  UpdateMeBody,
} from '@norsumi/common';

import { getBackend } from './backend';

export const info = async () => (await getBackend()).info();
export const login = async (body: LoginBody) =>
  (await getBackend()).auth.login(body);
export const register = async (body: RegisterBody) =>
  (await getBackend()).auth.register(body);
export const google = async (idToken: string) =>
  (await getBackend()).auth.google(idToken);
export const logout = async (refreshToken: string) =>
  (await getBackend()).auth.logout(refreshToken);
export const me = async () => (await getBackend()).auth.me();
export const deleteMe = async (body: DeleteMeBody) =>
  (await getBackend()).auth.deleteMe(body);
export const updateMe = async (body: UpdateMeBody) =>
  (await getBackend()).auth.updateMe(body);

export * as AuthService from './auth.service';

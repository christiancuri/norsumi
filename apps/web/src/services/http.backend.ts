import type {
  AuthSession,
  Category,
  Item,
  ItemListResponse,
  LibraryStats,
  ServerInfo,
  User,
} from '@norsumi/common';
import { api } from 'src/lib/axios';

import type { Backend } from './backend';

export const httpBackend: Backend = {
  info: async () => (await api.get<ServerInfo>('/info')).data,
  auth: {
    login: async (body) =>
      (await api.post<AuthSession>('/auth/login', body)).data,
    register: async (body) =>
      (await api.post<AuthSession>('/auth/register', body)).data,
    google: async (idToken) =>
      (await api.post<AuthSession>('/auth/google', { idToken })).data,
    logout: async (refreshToken) => {
      await api.post('/auth/logout', { refreshToken });
    },
    me: async () => (await api.get<User>('/me')).data,
    updateMe: async (body) => (await api.patch<User>('/me', body)).data,
    deleteMe: async (body) => {
      await api.delete('/me', { data: body });
    },
  },
  categories: {
    list: async () => (await api.get<Category[]>('/categories')).data,
    create: async (body) =>
      (await api.post<Category>('/categories', body)).data,
    update: async (id, body) =>
      (await api.patch<Category>(`/categories/${id}`, body)).data,
    remove: async (id) => {
      await api.delete(`/categories/${id}`);
    },
  },
  items: {
    list: async ({ kind, ...rest }) => {
      // Several kinds travel as one comma-separated value.
      const params = {
        ...rest,
        kind: kind ? [kind].flat().join(',') : undefined,
      };
      return (await api.get<ItemListResponse>('/items', { params })).data;
    },
    stats: async () => (await api.get<LibraryStats>('/items/stats')).data,
    get: async (id) => (await api.get<Item>(`/items/${id}`)).data,
    upload: async (file, fields = {}) => {
      const form = new FormData();
      form.append('file', file);
      if (fields.kind) form.append('kind', fields.kind);
      if (fields.capturedAt) form.append('capturedAt', fields.capturedAt);
      if (fields.clientId) form.append('clientId', fields.clientId);
      const { data } = await api.post<Item>('/items/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    createLink: async (body) =>
      (await api.post<Item>('/items/link', body)).data,
    createNote: async (body) =>
      (await api.post<Item>('/items/note', body)).data,
    update: async (id, body) =>
      (await api.patch<Item>(`/items/${id}`, body)).data,
    remove: async (id) => {
      await api.delete(`/items/${id}`);
    },
    reprocess: async (id) =>
      (await api.post<Item>(`/items/${id}/reprocess`)).data,
  },
};

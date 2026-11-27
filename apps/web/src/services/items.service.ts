import type {
  CreateLinkBody,
  CreateNoteBody,
  ItemListQuery,
  UpdateItemBody,
  UploadFields,
} from '@norsumi/common';

import { getBackend } from './backend';

export const list = async (query: ItemListQuery) =>
  (await getBackend()).items.list(query);
export const stats = async () => (await getBackend()).items.stats();
export const get = async (id: string) => (await getBackend()).items.get(id);
export const upload = async (file: File, fields?: UploadFields) =>
  (await getBackend()).items.upload(file, fields);
export const createLink = async (body: CreateLinkBody) =>
  (await getBackend()).items.createLink(body);
export const createNote = async (body: CreateNoteBody) =>
  (await getBackend()).items.createNote(body);
export const update = async (id: string, body: UpdateItemBody) =>
  (await getBackend()).items.update(id, body);
export const remove = async (id: string) =>
  (await getBackend()).items.remove(id);
export const reprocess = async (id: string) =>
  (await getBackend()).items.reprocess(id);

export * as ItemsService from './items.service';

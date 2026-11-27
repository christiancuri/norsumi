import type { CreateCategoryBody, UpdateCategoryBody } from '@norsumi/common';

import { getBackend } from './backend';

export const list = async () => (await getBackend()).categories.list();
export const create = async (body: CreateCategoryBody) =>
  (await getBackend()).categories.create(body);
export const update = async (id: string, body: UpdateCategoryBody) =>
  (await getBackend()).categories.update(id, body);
export const remove = async (id: string) =>
  (await getBackend()).categories.remove(id);

export * as CategoriesService from './categories.service';

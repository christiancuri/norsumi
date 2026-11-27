import type { Category, UpdateCategoryBody } from '@norsumi/common';
import { createMutation, createQuery } from 'react-query-kit';
import { queryClient } from 'src/lib/query-client';
import { queryKeys } from 'src/lib/query-keys';
import { CategoriesService } from 'src/services/categories.service';

export const useCategories = createQuery({
  queryKey: queryKeys.categories,
  fetcher: () => CategoriesService.list(),
});

const refresh = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
    queryClient.invalidateQueries({ queryKey: queryKeys.items.all }),
  ]);

export const useCreateCategory = createMutation({
  mutationFn: CategoriesService.create,
  onSuccess: (category) => {
    queryClient.setQueryData<Category[]>(queryKeys.categories, (prev) =>
      prev ? [...prev, category] : prev,
    );
    void refresh();
  },
});

export const useUpdateCategory = createMutation({
  mutationFn: ({ id, ...body }: UpdateCategoryBody & { id: string }) =>
    CategoriesService.update(id, body),
  onMutate: ({ id, ...body }) => {
    queryClient.setQueryData<Category[]>(queryKeys.categories, (prev) =>
      prev?.map((c) => (c.id === id ? { ...c, ...body } : c)),
    );
  },
  onSettled: refresh,
});

export const useDeleteCategory = createMutation({
  mutationFn: CategoriesService.remove,
  onMutate: (id) => {
    queryClient.setQueryData<Category[]>(queryKeys.categories, (prev) =>
      prev?.filter((c) => c.id !== id && c.parentId !== id),
    );
  },
  onSettled: refresh,
});

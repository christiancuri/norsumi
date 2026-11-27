import type {
  Item,
  ItemListQuery,
  ItemListResponse,
  UpdateItemBody,
} from '@norsumi/common';
import type { InfiniteData, Query } from '@tanstack/react-query';
import {
  createInfiniteQuery,
  createMutation,
  createQuery,
} from 'react-query-kit';
import { queryClient } from 'src/lib/query-client';
import { queryKeys } from 'src/lib/query-keys';
import { ItemsService } from 'src/services/items.service';

export type ItemFilter = Omit<ItemListQuery, 'cursor'>;
type Pages = InfiniteData<ItemListResponse, string | null>;

const POLL_MS = 3000;

export const isBusy = (item: Pick<Item, 'status'>) =>
  item.status === 'pending' || item.status === 'processing';

export const useItems = createInfiniteQuery({
  queryKey: queryKeys.items.list,
  fetcher: (filter: ItemFilter, { pageParam }) =>
    ItemsService.list({ ...filter, cursor: pageParam ?? undefined }),
  initialPageParam: null as string | null,
  getNextPageParam: (last: ItemListResponse) => last.nextCursor,
  // Keep polling while the AI is still reading something on screen.
  refetchInterval: (query: Query<ItemListResponse, Error, Pages>) =>
    query.state.data?.pages.some((p) => p.items.some(isBusy)) ? POLL_MS : false,
});

export const useItem = createQuery({
  queryKey: queryKeys.items.detail,
  fetcher: (id: string) => ItemsService.get(id),
  refetchInterval: (query: Query<Item>) =>
    query.state.data && isBusy(query.state.data) ? POLL_MS : false,
});

export const useStats = createQuery({
  queryKey: queryKeys.items.stats,
  fetcher: () => ItemsService.stats(),
  refetchInterval: (query) =>
    (query.state.data?.processing ?? 0) > 0 ? POLL_MS : false,
});

// ---------------------------------------------------------------------------
// Cache helpers: patch every cached list + the detail entry in one go.

function patchLists(fn: (items: Item[]) => Item[]) {
  queryClient.setQueriesData<Pages>(
    { queryKey: queryKeys.items.list },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((p) => ({ ...p, items: fn(p.items) })),
      },
  );
}

function replaceItem(item: Item) {
  patchLists((items) => items.map((i) => (i.id === item.id ? item : i)));
  queryClient.setQueryData(useItem.getKey(item.id), item);
}

/** Put a freshly created item at the top of every unfiltered-ish list. */
function insertItem(item: Item) {
  const lists = queryClient.getQueriesData<Pages>({
    queryKey: queryKeys.items.list,
  });
  for (const [key, data] of lists) {
    const filter = (key[2] ?? {}) as ItemFilter;
    const fits =
      !filter.q &&
      !filter.categoryId &&
      !filter.favorite &&
      !filter.archived &&
      (!filter.kind || [filter.kind].flat().includes(item.kind));
    if (!fits || !data?.pages[0]) continue;
    const [first, ...rest] = data.pages;
    queryClient.setQueryData<Pages>(key, {
      ...data,
      pages: [{ ...first, items: [item, ...first.items] }, ...rest],
    });
  }
}

const invalidateAll = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.items.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  ]);

const onCreated = (item: Item) => {
  insertItem(item);
  void queryClient.invalidateQueries({ queryKey: queryKeys.items.stats });
};

export const useUploadItem = createMutation({
  mutationFn: (file: File) =>
    ItemsService.upload(file, {
      kind: 'screenshot',
      clientId: crypto.randomUUID(),
      capturedAt: new Date(file.lastModified || Date.now()).toISOString(),
    }),
  onSuccess: onCreated,
});

export const useCreateLink = createMutation({
  mutationFn: ItemsService.createLink,
  onSuccess: onCreated,
});

export const useCreateNote = createMutation({
  mutationFn: ItemsService.createNote,
  onSuccess: onCreated,
});

export const useUpdateItem = createMutation({
  mutationFn: ({ id, ...body }: UpdateItemBody & { id: string }) =>
    ItemsService.update(id, body),
  onMutate: async ({ id, ...body }) => {
    const current = queryClient.getQueryData<Item>(useItem.getKey(id));
    const snapshot = queryClient.getQueriesData<Pages>({
      queryKey: queryKeys.items.list,
    });
    patchLists((items) =>
      items.map((i) => (i.id === id ? { ...i, ...body } : i)),
    );
    if (current) {
      queryClient.setQueryData(useItem.getKey(id), { ...current, ...body });
    }
    return { snapshot, current };
  },
  onError: (_error, { id }, context) => {
    for (const [key, data] of context?.snapshot ?? []) {
      queryClient.setQueryData(key, data);
    }
    if (context?.current) {
      queryClient.setQueryData(useItem.getKey(id), context.current);
    }
  },
  onSuccess: (item, body) => {
    replaceItem(item);
    // Moves between buckets (archive, favorite, category) change the lists.
    if ('archived' in body || 'categoryId' in body || 'favorite' in body) {
      void invalidateAll();
    }
  },
});

export const useDeleteItem = createMutation({
  mutationFn: ItemsService.remove,
  onMutate: (id) => {
    patchLists((items) => items.filter((i) => i.id !== id));
  },
  onSettled: invalidateAll,
});

export const useReprocessItem = createMutation({
  mutationFn: ItemsService.reprocess,
  onSuccess: (item) => {
    replaceItem(item);
    void queryClient.invalidateQueries({ queryKey: queryKeys.items.list });
  },
});

/** Quick results for the ⌘K palette. */
export const useQuickSearch = createQuery({
  queryKey: queryKeys.items.search,
  fetcher: (q: string) => ItemsService.list({ q, limit: 8 }),
  staleTime: 10_000,
});

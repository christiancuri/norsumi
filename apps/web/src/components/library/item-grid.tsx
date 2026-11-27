import type { Item } from '@norsumi/common';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from 'src/components/ui/button';
import { errorMessage } from 'src/lib/axios';
import { queryClient } from 'src/lib/query-client';
import { queryKeys } from 'src/lib/query-keys';
import { cn } from 'src/lib/utils';
import {
  type ItemFilter,
  isBusy,
  useItems,
  useUpdateItem,
} from 'src/queries/items.queries';
import { useUiStore } from 'src/stores/ui.store';

import { estimateCardHeight, ItemCard } from './item-card';
import { Masonry } from './masonry';

const SKELETON_RATIOS = [1.72, 0.6, 1.3, 1.72, 0.9, 1.5, 0.55, 1.72, 1.1, 1.4];

export function ItemGrid({
  filter,
  empty,
  className,
}: {
  filter: ItemFilter;
  empty: ReactNode;
  className?: string;
}) {
  const query = useItems({ variables: filter });
  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  const [, setParams] = useSearchParams();
  const setVisibleItemIds = useUiStore((s) => s.setVisibleItemIds);
  const update = useUpdateItem();

  useEffect(() => {
    setVisibleItemIds(items.map((i) => i.id));
  }, [items, setVisibleItemIds]);

  // When the AI finishes an item it may have created categories and moved
  // counts: refresh the sidebar the moment anything settles.
  const busyIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const now = new Set(items.filter(isBusy).map((i) => i.id));
    const settled = [...busyIds.current].some((id) => !now.has(id));
    busyIds.current = now;
    if (settled) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      void queryClient.invalidateQueries({ queryKey: queryKeys.items.stats });
    }
  }, [items]);

  const open = useCallback(
    (item: Item) =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('item', item.id);
          return p;
        },
        { preventScrollReset: true },
      ),
    [setParams],
  );

  const toggleFavorite = useCallback(
    (item: Item) =>
      update.mutate(
        { id: item.id, favorite: !item.favorite },
        { onError: (err) => toast.error(errorMessage(err)) },
      ),
    [update],
  );

  // Infinite scroll: load the next page well before the end is visible.
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '1200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Only the first batch staggers in; later pages just fade.
  const firstBatch = useRef<Set<string> | null>(null);
  if (!firstBatch.current && items.length) {
    firstBatch.current = new Set(items.map((i) => i.id));
  }

  if (query.isLoading) return <GridSkeleton className={className} />;

  if (query.isError) {
    return (
      <div className="grid place-items-center gap-3 py-24 text-center">
        <div className="font-display text-3xl">Couldn't load your library</div>
        <p className="text-muted-foreground">{errorMessage(query.error)}</p>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => void query.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (items.length === 0) return <>{empty}</>;

  return (
    <div className={className}>
      <Masonry
        items={items}
        getKey={(i) => i.id}
        estimateHeight={estimateCardHeight}
        render={(item, index) => {
          const stagger = firstBatch.current?.has(item.id);
          return (
            <motion.div
              initial={{ opacity: 0, y: stagger ? 14 : 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
                delay: stagger ? Math.min(index, 18) * 0.03 : 0,
              }}
            >
              <ItemCard
                item={item}
                onOpen={open}
                onToggleFavorite={toggleFavorite}
              />
            </motion.div>
          );
        }}
      />
      <div ref={sentinel} className="h-px" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}
      {!hasNextPage && items.length > 12 && (
        <div className="flex items-center gap-4 py-12 text-[12px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span className="font-display text-[15px] italic">
            That's everything.
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
    </div>
  );
}

export function GridSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(className)}>
      <Masonry
        items={SKELETON_RATIOS.map((ratio, i) => ({ ratio, i }))}
        getKey={(s) => String(s.i)}
        estimateHeight={(s, w) => w * s.ratio + 70}
        render={(s) => (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface">
            <div
              className="shimmer bg-surface-2"
              style={{ aspectRatio: `1 / ${s.ratio}` }}
            />
            <div className="space-y-2 p-3">
              <div className="h-2.5 w-4/5 rounded-full bg-surface-2" />
              <div className="h-2.5 w-1/3 rounded-full bg-surface-2" />
            </div>
          </div>
        )}
      />
    </div>
  );
}

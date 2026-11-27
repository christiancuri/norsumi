import type { Item } from '@norsumi/common';
import {
  ChevronDown,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  Plus,
  Search,
  Sparkles,
  Star,
  StickyNote,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { LogoMark } from 'src/components/brand/logo';
import { CategoryDot } from 'src/components/library/category-chip';
import { ItemCard } from 'src/components/library/item-card';
import { buildTree } from 'src/lib/category-tree';
import { cn } from 'src/lib/utils';
import { seedCategories } from 'src/services/mock/seed';

import { EASE, imageItems, showcaseItems } from './primitives';

const COLUMN_SPEEDS = [64, 82, 72, 90];

function splitColumns(items: Item[], count: number) {
  const cols: Item[][] = Array.from({ length: count }, () => []);
  items.forEach((item, i) => {
    cols[i % count]?.push(item);
  });
  return cols;
}

/**
 * A faithful, self-running mock of the library: window chrome, sidebar
 * with the real category tree and a masonry of real cards drifting upward
 * at slightly different speeds (parallax between columns).
 */
export function LibraryPreview({ className }: { className?: string }) {
  const columns = useMemo(() => splitColumns(showcaseItems, 4), []);

  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-[22px] border border-border/80 bg-surface/90 shadow-float backdrop-blur-xl',
        'ring-1 ring-black/[0.03] dark:ring-white/[0.05]',
        'before:pointer-events-none before:absolute before:inset-x-24 before:top-0 before:z-20 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/70 before:to-transparent',
        className,
      )}
    >
      <WindowBar />
      <div className="flex h-[480px] sm:h-[580px] lg:h-[640px]">
        <PreviewSidebar />
        <div className="relative flex min-w-0 flex-1 flex-col bg-background/60">
          <PreviewHeader />
          <div className="relative min-h-0 flex-1 overflow-hidden px-3 [mask-image:linear-gradient(to_bottom,transparent,black_28px,black_78%,transparent)] sm:px-6">
            <div className="flex gap-3 sm:gap-4">
              {columns.map((col, c) => (
                <DriftColumn
                  key={c}
                  items={col}
                  duration={COLUMN_SPEEDS[c] ?? 70}
                  offset={c % 2 === 0 ? 0 : -72}
                  className={cn(
                    c === 2 && 'hidden sm:flex',
                    c === 3 && 'hidden xl:flex',
                  )}
                />
              ))}
            </div>
          </div>
          <JustFiled />
        </div>
      </div>
    </div>
  );
}

function WindowBar() {
  return (
    <div className="relative flex h-11 items-center gap-3 border-border/70 border-b bg-surface-2/60 px-4">
      <div className="flex gap-1.5">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
      </div>
      <div className="absolute left-1/2 flex h-6 w-[46%] max-w-xs -translate-x-1/2 items-center justify-center gap-1.5 rounded-md bg-background/70 text-[11px] text-muted-foreground ring-1 ring-border/60">
        <span className="size-2 rounded-full bg-success/80" />
        app.norsumi.com/library
      </div>
    </div>
  );
}

const NAV = [
  { icon: LayoutGrid, label: 'All items', active: true },
  { icon: ImageIcon, label: 'Screenshots' },
  { icon: Link2, label: 'Links' },
  { icon: StickyNote, label: 'Notes' },
  { icon: Star, label: 'Favorites' },
];

function PreviewSidebar() {
  const tree = useMemo(() => buildTree(seedCategories).slice(0, 5), []);
  const total = showcaseItems.length;

  return (
    <aside className="hidden w-[228px] shrink-0 flex-col gap-5 border-border/70 border-r bg-surface-2/50 p-3 md:flex">
      <div className="flex items-center gap-2 px-1.5 pt-1">
        <LogoMark className="size-6" />
        <span className="font-semibold text-[14px] tracking-[-0.03em]">
          norsumi
        </span>
      </div>

      <div className="flex h-8 items-center gap-2 rounded-lg border border-border/70 bg-surface px-2.5 text-[12px] text-muted-foreground">
        <Search className="size-3.5" />
        Search
        <kbd className="ml-auto rounded border border-border/80 px-1 font-mono text-[10px]">
          ⌘K
        </kbd>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ icon: Icon, label, active }) => (
          <div
            key={label}
            className={cn(
              'flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[12.5px]',
              active
                ? 'bg-surface font-medium text-foreground shadow-[0_1px_2px_rgb(10_13_23/0.06)] ring-1 ring-border/60'
                : 'text-muted-foreground',
            )}
          >
            <Icon className={cn('size-4', active && 'text-primary')} />
            {label}
            {active && (
              <span className="ml-auto text-[11px] text-muted-foreground tabular">
                {total}
              </span>
            )}
          </div>
        ))}
      </nav>

      <div className="flex min-h-0 flex-col gap-0.5">
        <div className="px-2.5 pb-1 font-medium text-[10.5px] text-muted-foreground uppercase tracking-[0.12em]">
          Categories
        </div>
        {tree.map((root, r) => (
          <div key={root.id}>
            <div className="flex h-8 items-center gap-2 rounded-lg px-2.5 text-[12.5px]">
              <span className="text-[13px]">{root.emoji}</span>
              <span className="truncate">{root.name}</span>
              <ChevronDown
                className={cn(
                  'size-3 text-muted-foreground',
                  r !== 0 && '-rotate-90',
                )}
              />
              <span className="ml-auto text-[11px] text-muted-foreground tabular">
                {root.totalCount}
              </span>
            </div>
            {r === 0 &&
              root.children.map((child) => (
                <div
                  key={child.id}
                  className="flex h-7 items-center gap-2 rounded-lg pr-2.5 pl-8 text-[12px] text-muted-foreground"
                >
                  <CategoryDot color={child.color} />
                  <span className="truncate">{child.name}</span>
                  <span className="ml-auto text-[11px] tabular">
                    {child.itemCount}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

function PreviewHeader() {
  const chips = useMemo(
    () => seedCategories.filter((c) => !c.parentId).slice(0, 4),
    [],
  );
  return (
    <div className="flex flex-col gap-3 px-4 pt-5 pb-3 sm:px-6">
      <div className="flex items-end gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground">Library</div>
          <div className="mt-1 font-display text-[28px] leading-none sm:text-[32px]">
            Everything, <em className="text-primary">sorted</em>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden h-8 w-56 items-center gap-2 rounded-full border border-border/70 bg-surface px-3 text-[12px] text-muted-foreground lg:flex">
            <Search className="size-3.5" />
            Search by meaning…
          </div>
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow">
            <Plus className="size-4" />
          </span>
        </div>
      </div>
      <div className="flex gap-1.5 overflow-hidden">
        <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-foreground px-3 font-medium text-[11.5px] text-background">
          All
        </span>
        {chips.map((c) => (
          <span
            key={c.id}
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-surface px-3 text-[11.5px] text-muted-foreground"
          >
            <span>{c.emoji}</span>
            {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function DriftColumn({
  items,
  duration,
  offset,
  className,
}: {
  items: Item[];
  duration: number;
  offset: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const copy = (key: string) => (
    <div className="flex flex-col gap-3 pb-3 sm:gap-4 sm:pb-4">
      {items.map((item) => (
        <ItemCard key={`${key}-${item.id}`} item={item} decorative />
      ))}
    </div>
  );
  return (
    <div
      className={cn('flex min-w-0 flex-1 flex-col', className)}
      style={{ marginTop: offset }}
    >
      <motion.div
        animate={reduce ? undefined : { y: ['0%', '-50%'] }}
        transition={{
          duration,
          ease: 'linear',
          repeat: Number.POSITIVE_INFINITY,
        }}
        className="will-change-transform"
      >
        {copy('a')}
        {copy('b')}
      </motion.div>
    </div>
  );
}

/** Rotating "just filed" toast: the library is alive. */
function JustFiled() {
  const reduce = useReducedMotion();
  const filed = useMemo(
    () => imageItems.filter((i) => i.categoryPath.length === 2).slice(0, 6),
    [],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce || filed.length < 2) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % filed.length),
      3800,
    );
    return () => window.clearInterval(id);
  }, [reduce, filed.length]);

  const item = filed[index];
  if (!item) return null;
  const [root, leaf] = item.categoryPath;

  return (
    <div className="pointer-events-none absolute right-3 bottom-3 left-3 flex justify-end sm:right-5 sm:bottom-5 sm:left-auto">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 16, scale: 0.96, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -8, scale: 0.98, filter: 'blur(4px)' }}
          transition={{ duration: 0.55, ease: EASE }}
          className="glass flex w-full items-center gap-3 rounded-2xl border border-border/70 p-2.5 pr-4 shadow-float sm:w-[300px]"
        >
          <img
            src={item.image?.thumbUrl}
            alt=""
            className="size-11 shrink-0 rounded-xl object-cover object-top ring-1 ring-border/70"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1 font-medium text-[11px] text-primary">
              <Sparkles className="size-3" />
              Just filed
            </div>
            <div className="mt-0.5 truncate font-medium text-[12.5px]">
              {root?.emoji} {root?.name}
              <span className="px-1 text-muted-foreground">›</span>
              {leaf?.emoji} {leaf?.name}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

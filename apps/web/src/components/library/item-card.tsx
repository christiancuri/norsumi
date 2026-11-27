import type { Item } from '@norsumi/common';
import {
  AlertTriangle,
  ArrowUpRight,
  Globe,
  Maximize2,
  Sparkles,
  Star,
} from 'lucide-react';
import { type MouseEvent, useState } from 'react';
import { relativeDate } from 'src/lib/format';
import { itemTitle, noteBody } from 'src/lib/item';
import { cn } from 'src/lib/utils';
import { isBusy } from 'src/queries/items.queries';

import { CategoryChip } from './category-chip';

/** Phone screenshots are very tall; show the top of them in the grid. */
const MAX_IMAGE_RATIO = 1.72;
const LINK_IMAGE_RATIO = 1 / 1.91;

export function estimateCardHeight(item: Item, width: number) {
  const meta = 78;
  if (item.image) {
    const ratio = Math.min(
      item.image.height / item.image.width,
      MAX_IMAGE_RATIO,
    );
    return width * ratio + meta;
  }
  if (item.kind === 'link') {
    return (item.link?.imageUrl ? width * LINK_IMAGE_RATIO : 0) + 132;
  }
  const chars = noteBody(item).length;
  const lines = Math.min(7, Math.ceil(chars / Math.max(width / 7.2, 20)));
  return 96 + lines * 21;
}

interface ItemCardProps {
  item: Item;
  onOpen?: (item: Item) => void;
  onToggleFavorite?: (item: Item) => void;
  /** Static rendering (landing page): no hover actions. */
  decorative?: boolean;
  className?: string;
}

export function ItemCard({
  item,
  onOpen,
  onToggleFavorite,
  decorative,
  className,
}: ItemCardProps) {
  const busy = isBusy(item);

  return (
    <article
      onClick={() => onOpen?.(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen?.(item);
      }}
      tabIndex={decorative ? -1 : 0}
      aria-label={itemTitle(item) || 'Item'}
      className={cn(
        'group relative isolate overflow-hidden rounded-2xl border border-border/70 bg-surface',
        'shadow-[0_1px_2px_rgb(10_13_23/0.04)] outline-none',
        'transition-[transform,box-shadow,border-color] duration-300 ease-out-expo',
        !decorative &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-border hover:shadow-lift focus-visible:ring-4 focus-visible:ring-ring',
        className,
      )}
    >
      {item.kind === 'note' ? (
        <NoteBody item={item} />
      ) : item.kind === 'link' ? (
        <LinkBody item={item} busy={busy} />
      ) : (
        <ImageBody item={item} busy={busy} />
      )}

      {!decorative && !busy && (
        <div className="absolute top-2.5 right-2.5 z-10 flex translate-y-1 gap-1.5 opacity-0 transition-all duration-200 ease-out-expo group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100">
          <QuickAction
            label={item.favorite ? 'Unfavorite' : 'Favorite'}
            onClick={() => onToggleFavorite?.(item)}
          >
            <Star
              className={cn(
                'size-3.5',
                item.favorite && 'fill-amber-400 text-amber-400',
              )}
            />
          </QuickAction>
          {item.link ? (
            <QuickAction
              label="Open link"
              onClick={() =>
                window.open(item.link?.url, '_blank', 'noopener,noreferrer')
              }
            >
              <ArrowUpRight className="size-3.5" />
            </QuickAction>
          ) : (
            <QuickAction label="Open" onClick={() => onOpen?.(item)}>
              <Maximize2 className="size-3.5" />
            </QuickAction>
          )}
        </div>
      )}
    </article>
  );
}

function QuickAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        onClick();
      }}
      className="grid size-8 place-items-center rounded-full bg-white/85 text-neutral-900 shadow-[0_4px_14px_-4px_rgb(0_0_0/0.35)] backdrop-blur-md transition hover:scale-105 hover:bg-white active:scale-95 dark:bg-neutral-900/80 dark:text-white dark:hover:bg-neutral-900"
    >
      {children}
    </button>
  );
}

function Img({
  src,
  ratio,
  color,
  className,
}: {
  src: string;
  ratio: number;
  color?: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className={cn('relative w-full overflow-hidden', className)}
      style={{ aspectRatio: `1 / ${ratio}`, backgroundColor: color }}
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={cn(
          'absolute inset-0 size-full object-cover object-top transition-[opacity,filter,transform] duration-700 ease-out-expo',
          'group-hover:scale-[1.015]',
          loaded ? 'opacity-100 blur-0' : 'scale-[1.04] opacity-0 blur-md',
        )}
      />
    </div>
  );
}

function Thinking({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-[11px] text-primary',
        className,
      )}
    >
      <Sparkles className="size-3 animate-pulse" />
      Thinking…
    </span>
  );
}

function Meta({ item }: { item: Item }) {
  const leaf = item.categoryPath.at(-1);
  return (
    <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
      {item.status === 'failed' ? (
        <span className="inline-flex items-center gap-1 font-medium text-destructive">
          <AlertTriangle className="size-3" /> Couldn't read
        </span>
      ) : leaf ? (
        <CategoryChip category={leaf} />
      ) : null}
      <span className="ml-auto inline-flex shrink-0 items-center gap-1 tabular">
        {item.favorite && (
          <Star className="size-3 fill-amber-400 text-amber-400" />
        )}
        {relativeDate(item.capturedAt)}
      </span>
    </div>
  );
}

function BusyLines() {
  return (
    <div className="space-y-2 py-0.5">
      <div className="h-2.5 w-4/5 rounded-full bg-surface-2" />
      <div className="h-2.5 w-1/2 rounded-full bg-surface-2" />
    </div>
  );
}

function ImageBody({ item, busy }: { item: Item; busy: boolean }) {
  const image = item.image;
  const ratio = image
    ? Math.min(image.height / image.width, MAX_IMAGE_RATIO)
    : 1.4;
  return (
    <>
      <div className={cn('relative', busy && 'shimmer')}>
        {image ? (
          <Img src={image.thumbUrl} ratio={ratio} color={image.dominantColor} />
        ) : (
          <div className="aspect-[3/4] bg-surface-2" />
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-background/30 backdrop-blur-[2px]">
            <Thinking className="bg-surface/90 shadow-sm backdrop-blur" />
          </div>
        )}
        {image && ratio >= MAX_IMAGE_RATIO && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/15 to-transparent" />
        )}
      </div>
      <div className="px-3 pt-2.5 pb-3">
        {busy ? (
          <BusyLines />
        ) : (
          <h3 className="line-clamp-2 font-medium text-[13px] leading-snug tracking-[-0.01em]">
            {itemTitle(item) || 'Untitled'}
          </h3>
        )}
        {!busy && <Meta item={item} />}
      </div>
    </>
  );
}

function LinkBody({ item, busy }: { item: Item; busy: boolean }) {
  const link = item.link;
  return (
    <>
      {link?.imageUrl && (
        <div className={cn(busy && 'shimmer')}>
          <Img
            src={link.imageUrl}
            ratio={LINK_IMAGE_RATIO}
            color="var(--surface-2)"
          />
        </div>
      )}
      <div className="px-3.5 pt-3 pb-3">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {link?.faviconUrl ? (
            <img
              src={link.faviconUrl}
              alt=""
              className="size-3.5 rounded-[4px]"
            />
          ) : (
            <Globe className="size-3.5" />
          )}
          <span className="truncate">{link?.domain ?? item.source}</span>
          {busy && <Thinking className="ml-auto" />}
        </div>
        {busy && !link?.title ? (
          <div className="mt-2.5">
            <BusyLines />
          </div>
        ) : (
          <>
            <h3 className="mt-1.5 line-clamp-2 font-medium text-[13.5px] leading-snug tracking-[-0.01em]">
              {itemTitle(item)}
            </h3>
            {(item.summary || link?.description) && (
              <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground leading-relaxed">
                {item.summary || link?.description}
              </p>
            )}
          </>
        )}
        {!busy && <Meta item={item} />}
      </div>
    </>
  );
}

function NoteBody({ item }: { item: Item }) {
  const text = noteBody(item);
  const [first = '', ...rest] = text.split('\n');
  const heading = item.title || first;
  // Skip the first line when it is just the title again.
  const repeats =
    !item.title ||
    first.trim().toLowerCase().replace(/[.:]$/, '') ===
      item.title.trim().toLowerCase();
  const body = repeats ? rest.join('\n') : text;
  return (
    <div className="relative bg-[linear-gradient(180deg,color-mix(in_oklab,var(--warning)_7%,var(--surface)),var(--surface)_70%)] px-4 pt-4 pb-3">
      <div className="mb-2 flex items-center gap-1.5 font-medium text-[10.5px] text-muted-foreground uppercase tracking-[0.12em]">
        Note{' '}
        {isBusy(item) && (
          <Thinking className="ml-auto normal-case tracking-normal" />
        )}
      </div>
      <h3 className="font-display text-[22px] leading-[1.1]">{heading}</h3>
      {body.trim() && (
        <p className="mt-2 line-clamp-6 whitespace-pre-line text-[12.5px] text-muted-foreground leading-relaxed">
          {body.trim()}
        </p>
      )}
      <Meta item={item} />
    </div>
  );
}

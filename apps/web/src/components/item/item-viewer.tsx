import type { Item, UpdateItemBody } from '@norsumi/common';
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Globe,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { type ReactNode, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from 'src/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'src/components/ui/dropdown-menu';
import { Skeleton } from 'src/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from 'src/components/ui/tooltip';
import { useHotkey } from 'src/hooks/use-hotkey';
import { errorMessage } from 'src/lib/axios';
import { bytes, fullDate } from 'src/lib/format';
import { itemKindLabel, itemTitle, noteBody } from 'src/lib/item';
import { cn } from 'src/lib/utils';
import {
  isBusy,
  useDeleteItem,
  useItem,
  useReprocessItem,
  useUpdateItem,
} from 'src/queries/items.queries';
import { useUiStore } from 'src/stores/ui.store';

import { CategoryPicker } from './category-picker';
import { EditableText } from './editable-text';
import { EntityChips } from './entity-chips';
import { ImageStage } from './image-stage';
import { TagsEditor } from './tags-editor';

/** Route-driven item viewer: open with `?item=<id>` on any library page. */
export function ItemViewer() {
  const [params, setParams] = useSearchParams();
  const id = params.get('item');
  const ids = useUiStore((s) => s.visibleItemIds);

  const setItem = (next: string | null) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next) p.set('item', next);
        else p.delete('item');
        return p;
      },
      { replace: !!next && !!id, preventScrollReset: true },
    );

  const index = id ? ids.indexOf(id) : -1;
  const prev = index > 0 ? ids[index - 1] : undefined;
  const next =
    index >= 0 && index < ids.length - 1 ? ids[index + 1] : undefined;

  useHotkey('arrowleft', () => prev && setItem(prev), { enabled: !!id });
  useHotkey('arrowright', () => next && setItem(next), { enabled: !!id });

  return (
    <DialogPrimitive.Root
      open={!!id}
      onOpenChange={(open) => !open && setItem(null)}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-[rgb(7_8_12/0.55)] backdrop-blur-md data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.97] fixed inset-0 z-50 flex flex-col overflow-hidden bg-popover outline-none duration-300 data-[state=closed]:animate-out data-[state=open]:animate-in lg:inset-auto lg:top-1/2 lg:left-1/2 lg:h-[min(90vh,920px)] lg:w-[min(94vw,1280px)] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[28px] lg:border lg:border-border/60 lg:shadow-float"
        >
          {id && (
            <ViewerBody
              key={id}
              id={id}
              onClose={() => setItem(null)}
              onPrev={prev ? () => setItem(prev) : undefined}
              onNext={next ? () => setItem(next) : undefined}
              position={index >= 0 ? `${index + 1} / ${ids.length}` : null}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ViewerBody({
  id,
  onClose,
  onPrev,
  onNext,
  position,
}: {
  id: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  position: string | null;
}) {
  const { data: item, isLoading, isError } = useItem({ variables: id });
  const update = useUpdateItem();

  const patch: Patch = (body) =>
    update.mutate(
      { id, ...body },
      { onError: (err) => toast.error(errorMessage(err)) },
    );

  useHotkey('f', () => item && patch({ favorite: !item.favorite }), {
    enabled: !!item,
  });

  return (
    <>
      <DialogPrimitive.Title className="sr-only">
        {item ? itemTitle(item) || 'Item' : 'Item'}
      </DialogPrimitive.Title>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,44vh)_1fr] lg:grid-cols-[minmax(0,1fr)_420px] lg:grid-rows-1">
        <div className="relative min-h-0 bg-surface-2">
          {item ? (
            <Media item={item} />
          ) : (
            <Skeleton className="size-full rounded-none" />
          )}
          <NavButton side="left" onClick={onPrev} />
          <NavButton side="right" onClick={onNext} />
          {position && (
            <span className="absolute top-4 left-4 rounded-full bg-black/40 px-2.5 py-1 font-mono text-[11px] text-white/90 tabular backdrop-blur-md">
              {position}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60 lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <aside className="flex min-h-0 flex-col border-border/60 lg:border-l">
          {isError ? (
            <div className="grid flex-1 place-items-center p-8 text-center text-muted-foreground">
              This item couldn't be loaded. It may have been deleted.
            </div>
          ) : !item || isLoading ? (
            <PanelSkeleton />
          ) : (
            <Panel item={item} patch={patch} onClose={onClose} />
          )}
        </aside>
      </div>
    </>
  );
}

function NavButton({
  side,
  onClick,
}: {
  side: 'left' | 'right';
  onClick?: () => void;
}) {
  if (!onClick) return null;
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous item' : 'Next item'}
      className={cn(
        'absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md transition hover:scale-105 hover:bg-black/55 sm:grid',
        side === 'left' ? 'left-4' : 'right-4',
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}

function Media({ item }: { item: Item }) {
  if (item.image)
    return <ImageStage image={item.image} alt={itemTitle(item)} />;

  if (item.kind === 'link' && item.link) {
    const link = item.link;
    return (
      <div className="relative grid size-full place-items-center overflow-hidden p-6 sm:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_60%)]" />
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative w-full max-w-xl overflow-hidden rounded-3xl border border-border/70 bg-surface shadow-float transition duration-300 ease-out-expo hover:-translate-y-1"
        >
          {link.imageUrl && (
            <img
              src={link.imageUrl}
              alt=""
              className="aspect-[1.91] w-full object-cover"
            />
          )}
          <div className="p-5">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              {link.faviconUrl ? (
                <img src={link.faviconUrl} alt="" className="size-4 rounded" />
              ) : (
                <Globe className="size-4" />
              )}
              {link.siteName ?? link.domain}
              <ArrowUpRight className="ml-auto size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
            </div>
            <div className="mt-2 font-medium text-[17px] leading-snug">
              {link.title ?? link.url}
            </div>
            {link.description && (
              <p className="mt-1.5 line-clamp-3 text-[13.5px] text-muted-foreground leading-relaxed">
                {link.description}
              </p>
            )}
          </div>
        </a>
      </div>
    );
  }

  // Note
  return (
    <div className="scrollbar-thin size-full overflow-y-auto bg-[linear-gradient(180deg,color-mix(in_oklab,var(--warning)_8%,var(--surface)),var(--surface))] px-6 py-10 sm:px-16 sm:py-16">
      <div className="mx-auto max-w-xl">
        <div className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
          Note
        </div>
        <div className="mt-4 whitespace-pre-wrap font-display text-[26px] leading-[1.35] sm:text-[30px]">
          {noteBody(item)}
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
  action,
}: {
  label: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="grid gap-2">
      <div className="flex items-center">
        <h3 className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
          {label}
        </h3>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

type Patch = (body: UpdateItemBody) => void;

function Panel({
  item,
  patch,
  onClose,
}: {
  item: Item;
  patch: Patch;
  onClose: () => void;
}) {
  const busy = isBusy(item);
  const reprocess = useReprocessItem();
  const remove = useDeleteItem();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [textOpen, setTextOpen] = useState(false);

  const copyText = async () => {
    const text = item.text ?? item.summary;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const download = async () => {
    if (!item.image) return;
    try {
      const blob = await fetch(item.image.url).then((r) => r.blob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext =
        item.image.mime.split('/')[1]?.replace('svg+xml', 'svg') ?? 'png';
      a.href = url;
      a.download = `${(itemTitle(item) || 'norsumi').replace(/[^\w\- ]+/g, '').slice(0, 60)}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(errorMessage(err, 'Download failed'));
    }
  };

  const doReprocess = () =>
    reprocess.mutate(item.id, {
      onSuccess: () =>
        toast.success('Sent back to the AI', {
          description: 'Fresh title, summary and category on the way.',
        }),
      onError: (err) => toast.error(errorMessage(err)),
    });

  const doDelete = () => {
    remove.mutate(item.id, {
      onSuccess: () => toast.success('Deleted'),
      onError: (err) => toast.error(errorMessage(err)),
    });
    onClose();
  };

  const toggleArchive = () => {
    patch({ archived: !item.archived });
    toast.success(item.archived ? 'Moved back to library' : 'Archived');
  };

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-border/60 border-b px-4">
        <SourceBadge item={item} />
        <div className="ml-auto flex items-center gap-0.5">
          <IconAction
            label={item.favorite ? 'Unfavorite (F)' : 'Favorite (F)'}
            onClick={() => patch({ favorite: !item.favorite })}
          >
            <motion.span
              key={String(item.favorite)}
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            >
              <Star
                className={cn(
                  'size-4',
                  item.favorite && 'fill-amber-400 text-amber-400',
                )}
              />
            </motion.span>
          </IconAction>
          <IconAction
            label={item.archived ? 'Unarchive' : 'Archive'}
            onClick={toggleArchive}
          >
            {item.archived ? (
              <ArchiveRestore className="size-4" />
            ) : (
              <Archive className="size-4" />
            )}
          </IconAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More actions"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={doReprocess} disabled={busy}>
                <RefreshCw /> Reprocess with AI
              </DropdownMenuItem>
              {(item.text || item.summary) && (
                <DropdownMenuItem onSelect={() => void copyText()}>
                  <Copy /> Copy text
                </DropdownMenuItem>
              )}
              {item.image && (
                <DropdownMenuItem onSelect={() => void download()}>
                  <Download /> Download image
                </DropdownMenuItem>
              )}
              {item.link && (
                <DropdownMenuItem
                  onSelect={() =>
                    window.open(item.link?.url, '_blank', 'noopener,noreferrer')
                  }
                >
                  <ArrowUpRight /> Open link
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setConfirmDelete(true)}
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DialogPrimitive.Close asChild>
            <button
              type="button"
              aria-label="Close"
              className="ml-1 hidden size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground lg:grid"
            >
              <X className="size-4" />
            </button>
          </DialogPrimitive.Close>
        </div>
      </header>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        <div className="grid gap-7 px-5 pt-5 pb-8">
          <AnimatePresence>
            {busy && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="shimmer flex items-center gap-2.5 rounded-2xl border border-primary/20 bg-primary/[0.06] px-3.5 py-3 text-[13px]"
              >
                <Sparkles className="size-4 animate-pulse text-primary" />
                <span>
                  <span className="font-medium">Thinking…</span>{' '}
                  <span className="text-muted-foreground">
                    reading and filing this for you.
                  </span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {item.status === 'failed' && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-destructive/25 bg-destructive/[0.06] px-3.5 py-3 text-[13px]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="flex-1">
                <div className="font-medium">The AI couldn't read this one</div>
                {item.error && (
                  <div className="mt-0.5 text-muted-foreground">
                    {item.error}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={doReprocess}
                className="shrink-0 rounded-full bg-surface px-3 py-1 font-medium text-[12px] shadow-sm transition hover:bg-accent"
              >
                Try again
              </button>
            </div>
          )}

          <div className="grid gap-2">
            <EditableText
              ariaLabel="Title"
              singleLine
              value={item.title}
              placeholder={busy ? 'Waiting for a title…' : 'Add a title'}
              onSave={(title) => patch({ title })}
              className="font-display text-[34px] leading-[1.05] tracking-[-0.02em]"
            />
            <EditableText
              ariaLabel="Summary"
              value={item.summary}
              placeholder={busy ? '' : 'Add a summary'}
              onSave={(summary) => patch({ summary })}
              className="text-[14px] text-muted-foreground leading-relaxed"
            />
          </div>

          <Section label="Category">
            <CategoryPicker
              path={item.categoryPath}
              value={item.categoryId}
              onChange={(categoryId) => patch({ categoryId })}
            />
          </Section>

          {item.entities.length > 0 && (
            <Section label="Found in it">
              <EntityChips entities={item.entities} />
            </Section>
          )}

          <Section label="Tags">
            <TagsEditor tags={item.tags} onChange={(tags) => patch({ tags })} />
          </Section>

          <Section label={item.kind === 'note' ? 'Note' : 'Your note'}>
            <EditableText
              ariaLabel="Note"
              value={item.note ?? ''}
              placeholder="Why did you save this?"
              onSave={(note) => patch({ note: note || null })}
              className="mx-0 min-h-16 w-full rounded-xl border border-border/70 border-dashed px-3 py-2.5 text-[13.5px] leading-relaxed hover:border-border focus:border-transparent"
            />
          </Section>

          {item.text && item.kind !== 'note' && (
            <Section
              label={item.kind === 'link' ? 'Page text' : 'Text in image'}
              action={
                <button
                  type="button"
                  onClick={() => void copyText()}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  <Copy className="size-3" /> Copy
                </button>
              }
            >
              <div className="relative">
                <pre
                  className={cn(
                    'overflow-hidden whitespace-pre-wrap break-words rounded-xl bg-surface-2 p-3.5 font-mono text-[12px] text-foreground/80 leading-relaxed transition-[max-height] duration-300',
                    textOpen ? 'max-h-[2000px]' : 'max-h-28',
                  )}
                >
                  {item.text}
                </pre>
                {item.text.length > 160 && (
                  <button
                    type="button"
                    onClick={() => setTextOpen((o) => !o)}
                    className={cn(
                      'flex w-full items-center justify-center gap-1 pt-2 text-[12px] text-muted-foreground hover:text-foreground',
                      !textOpen &&
                        'absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-surface-2 via-surface-2/90 to-transparent pt-8 pb-2',
                    )}
                  >
                    {textOpen ? 'Show less' : 'Show all'}
                    <ChevronDown
                      className={cn(
                        'size-3.5 transition',
                        textOpen && 'rotate-180',
                      )}
                    />
                  </button>
                )}
              </div>
            </Section>
          )}

          <Section label="Details">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[12.5px]">
              <dt className="text-muted-foreground">Captured</dt>
              <dd className="tabular">{fullDate(item.capturedAt)}</dd>
              <dt className="text-muted-foreground">Added</dt>
              <dd className="tabular">{fullDate(item.createdAt)}</dd>
              {item.image && (
                <>
                  <dt className="text-muted-foreground">Image</dt>
                  <dd className="tabular">
                    {item.image.width} × {item.image.height} ·{' '}
                    {bytes(item.image.bytes)}
                  </dd>
                </>
              )}
              {item.link && (
                <>
                  <dt className="text-muted-foreground">URL</dt>
                  <dd className="truncate">
                    <a
                      href={item.link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {item.link.url}
                    </a>
                  </dd>
                </>
              )}
            </dl>
          </Section>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-normal text-3xl">
              Delete this {itemKindLabel(item).toLowerCase()}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              It's removed from your library and the encrypted file is erased.
              This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SourceBadge({ item }: { item: Item }) {
  const root = item.categoryPath[0];
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-[12.5px]">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-[14px]">
        {item.link?.faviconUrl ? (
          <img src={item.link.faviconUrl} alt="" className="size-4 rounded" />
        ) : (
          (root?.emoji ?? '✦')
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium leading-tight">
          {item.source ?? root?.name ?? 'Unknown source'}
        </span>
        <span className="block text-[11px] text-muted-foreground leading-tight">
          {itemKindLabel(item)}
        </span>
      </span>
    </span>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function PanelSkeleton() {
  return (
    <div className="grid gap-4 p-5">
      <Skeleton className="h-7 w-32 rounded-full" />
      <Skeleton className="h-10 w-4/5 rounded-xl" />
      <Skeleton className="h-4 w-full rounded-full" />
      <Skeleton className="h-4 w-2/3 rounded-full" />
      <Skeleton className="mt-4 h-8 w-48 rounded-full" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

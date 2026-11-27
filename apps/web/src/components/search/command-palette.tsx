import type { Item } from '@norsumi/common';
import { Command } from 'cmdk';
import {
  Archive,
  ArrowRight,
  CornerDownLeft,
  FileText,
  ImageIcon,
  Layers,
  Link2,
  Loader2,
  Monitor,
  Moon,
  Search,
  Settings,
  Star,
  Sun,
} from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { type ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { CategoryChip } from 'src/components/library/category-chip';
import { useDebounce } from 'src/hooks/use-debounce';
import { useHotkey } from 'src/hooks/use-hotkey';
import { buildTree } from 'src/lib/category-tree';
import { relativeDate } from 'src/lib/format';
import { itemPreviewUrl, itemTitle } from 'src/lib/item';
import { cn } from 'src/lib/utils';
import { useCategories } from 'src/queries/categories.queries';
import { useQuickSearch } from 'src/queries/items.queries';
import { useThemeStore } from 'src/stores/theme.store';
import { useUiStore } from 'src/stores/ui.store';

interface Action {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const setComposer = useUiStore((s) => s.setComposer);
  const setTheme = useThemeStore((s) => s.setTheme);
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const q = useDebounce(query.trim(), 180);

  useHotkey(
    'mod+k',
    (e) => {
      e.preventDefault();
      setOpen(!useUiStore.getState().paletteOpen);
    },
    { allowInInputs: true },
  );
  useHotkey('/', (e) => {
    e.preventDefault();
    setOpen(true);
  });

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const { data: categories } = useCategories();
  const search = useQuickSearch({
    variables: q,
    enabled: open && q.length > 1,
    placeholderData: (prev) => prev,
  });
  const results = q.length > 1 ? (search.data?.items ?? []) : [];

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const openItem = (item: Item) =>
    go(() => {
      const params = new URLSearchParams(location.search);
      params.set('item', item.id);
      navigate({ pathname: location.pathname, search: params.toString() });
    });

  const navActions: Action[] = [
    {
      id: 'all',
      label: 'All items',
      icon: <Layers />,
      run: () => navigate('/library'),
    },
    {
      id: 'shots',
      label: 'Screenshots',
      icon: <ImageIcon />,
      run: () => navigate('/library/screenshot'),
    },
    {
      id: 'links',
      label: 'Links',
      icon: <Link2 />,
      run: () => navigate('/library/link'),
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: <FileText />,
      run: () => navigate('/library/note'),
    },
    {
      id: 'fav',
      label: 'Favorites',
      icon: <Star />,
      run: () => navigate('/favorites'),
    },
    {
      id: 'arch',
      label: 'Archive',
      icon: <Archive />,
      run: () => navigate('/archive'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings />,
      run: () => navigate('/settings'),
    },
  ];
  const createActions: Action[] = [
    {
      id: 'note',
      label: 'Write a note',
      hint: 'N',
      icon: <FileText />,
      run: () => setComposer('note'),
    },
    {
      id: 'link',
      label: 'Save a link',
      icon: <Link2 />,
      run: () => setComposer('link'),
    },
    {
      id: 'light',
      label: 'Light theme',
      icon: <Sun />,
      run: () => setTheme('light'),
    },
    {
      id: 'dark',
      label: 'Dark theme',
      icon: <Moon />,
      run: () => setTheme('dark'),
    },
    {
      id: 'system',
      label: 'System theme',
      icon: <Monitor />,
      run: () => setTheme('system'),
    },
  ];
  const categoryActions: Action[] = buildTree(categories ?? [])
    .flatMap((root) => [root, ...root.children])
    .map((c) => {
      const parent = categories?.find((p) => p.id === c.parentId);
      return {
        id: `cat-${c.id}`,
        label: parent ? `${parent.name} › ${c.name}` : c.name,
        icon: <span className="text-[15px] leading-none">{c.emoji}</span>,
        run: () => navigate(`/c/${c.id}`),
      };
    });

  const needle = query.trim().toLowerCase();
  const filter = (list: Action[]) =>
    needle ? list.filter((a) => a.label.toLowerCase().includes(needle)) : list;
  const loading = search.isFetching && q.length > 1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-[rgb(7_8_12/0.35)] backdrop-blur-[3px] data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] data-[state=open]:slide-in-from-top-2 fixed top-[12vh] left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[640px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-border/80 bg-popover/95 shadow-float outline-none backdrop-blur-xl duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in"
        >
          <DialogPrimitive.Title className="sr-only">
            Search
          </DialogPrimitive.Title>
          <Command shouldFilter={false} loop className="flex flex-col">
            <div className="flex items-center gap-3 border-border/70 border-b px-4">
              {loading ? (
                <Loader2 className="size-[18px] animate-spin text-primary" />
              ) : (
                <Search className="size-[18px] text-muted-foreground" />
              )}
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search your library…"
                className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted-foreground/70"
              />
              <kbd className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
                ESC
              </kbd>
            </div>

            <Command.List className="scrollbar-thin max-h-[min(60vh,460px)] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.1em]">
              {results.length > 0 && (
                <Command.Group heading="Items">
                  {results.map((item) => (
                    <ItemResult
                      key={item.id}
                      item={item}
                      onSelect={() => openItem(item)}
                    />
                  ))}
                  <PaletteRow
                    value="see-all"
                    onSelect={() =>
                      go(() =>
                        navigate(
                          `/search?q=${encodeURIComponent(query.trim())}`,
                        ),
                      )
                    }
                    icon={<ArrowRight />}
                    label={
                      <>
                        See all results for{' '}
                        <span className="font-medium text-foreground">
                          “{query.trim()}”
                        </span>
                      </>
                    }
                  />
                </Command.Group>
              )}

              {q.length > 1 && !loading && results.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <div className="font-display text-2xl">
                    Nothing yet for “{q}”
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Try a place, a person, or what the screenshot was about.
                  </p>
                </div>
              )}

              <PaletteGroup
                heading="Go to"
                actions={filter(navActions)}
                go={go}
              />
              <PaletteGroup
                heading="Categories"
                actions={filter(categoryActions)}
                go={go}
              />
              <PaletteGroup
                heading="Actions"
                actions={filter(createActions)}
                go={go}
              />
            </Command.List>

            <div className="flex items-center gap-4 border-border/70 border-t bg-surface-2/50 px-4 py-2 text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <kbd className="font-mono">↑↓</kbd> navigate
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CornerDownLeft className="size-3" /> open
              </span>
              <span className="ml-auto">
                Search understands meaning, not just words.
              </span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function PaletteGroup({
  heading,
  actions,
  go,
}: {
  heading: string;
  actions: Action[];
  go: (fn: () => void) => void;
}) {
  if (actions.length === 0) return null;
  return (
    <Command.Group heading={heading}>
      {actions.map((a) => (
        <PaletteRow
          key={a.id}
          value={a.id}
          icon={a.icon}
          label={a.label}
          hint={a.hint}
          onSelect={() => go(a.run)}
        />
      ))}
    </Command.Group>
  );
}

const rowClass =
  'flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] text-foreground/85 outline-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-foreground [&_svg]:size-4 [&_svg]:text-muted-foreground';

function PaletteRow({
  value,
  icon,
  label,
  hint,
  onSelect,
}: {
  value: string;
  icon: ReactNode;
  label: ReactNode;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item value={value} onSelect={onSelect} className={rowClass}>
      <span className="grid size-7 place-items-center rounded-lg bg-surface-2">
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {hint && (
        <kbd className="ml-auto rounded border border-border px-1.5 font-mono text-[10.5px] text-muted-foreground">
          {hint}
        </kbd>
      )}
    </Command.Item>
  );
}

function ItemResult({ item, onSelect }: { item: Item; onSelect: () => void }) {
  const preview = itemPreviewUrl(item);
  const leaf = item.categoryPath.at(-1);
  return (
    <Command.Item
      value={item.id}
      onSelect={onSelect}
      className={cn(rowClass, 'py-1.5')}
    >
      <span
        className="relative size-11 shrink-0 overflow-hidden rounded-[10px] border border-border/60 bg-surface-2"
        style={{ backgroundColor: item.image?.dominantColor }}
      >
        {preview ? (
          <img
            src={preview}
            alt=""
            className="size-full object-cover object-top"
          />
        ) : (
          <span className="grid size-full place-items-center font-display text-lg text-muted-foreground">
            {item.kind === 'note' ? '¶' : '↗'}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {itemTitle(item) || 'Untitled'}
        </span>
        <span className="block truncate text-[12px] text-muted-foreground">
          {item.summary || item.link?.domain}
        </span>
      </span>
      <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        {leaf && <CategoryChip category={leaf} />}
        <span className="text-[11px] text-muted-foreground">
          {relativeDate(item.capturedAt)}
        </span>
      </span>
    </Command.Item>
  );
}

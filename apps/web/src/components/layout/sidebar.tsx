import type { Category } from '@norsumi/common';
import {
  Archive,
  ChevronRight,
  FileText,
  ImageIcon,
  Layers,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { AndroidIcon } from 'src/components/brand/github-icon';
import { Wordmark } from 'src/components/brand/logo';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from 'src/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'src/components/ui/dropdown-menu';
import { Skeleton } from 'src/components/ui/skeleton';
import { config } from 'src/config';
import { swatch } from 'src/lib/category-colors';
import { buildTree, type CategoryNode } from 'src/lib/category-tree';
import { compact } from 'src/lib/format';
import { cn } from 'src/lib/utils';
import { useCategories } from 'src/queries/categories.queries';
import { useStats } from 'src/queries/items.queries';
import { useUiStore } from 'src/stores/ui.store';

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform);

export function Sidebar({ className }: { className?: string }) {
  const { data: stats } = useStats();
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  const nav = [
    { to: '/library', label: 'All items', icon: Layers, count: stats?.total },
    {
      to: '/library/screenshot',
      label: 'Screenshots',
      icon: ImageIcon,
      count: stats ? stats.byKind.screenshot + stats.byKind.image : undefined,
    },
    {
      to: '/library/link',
      label: 'Links',
      icon: Link2,
      count: stats?.byKind.link,
    },
    {
      to: '/library/note',
      label: 'Notes',
      icon: FileText,
      count: stats?.byKind.note,
    },
    {
      to: '/favorites',
      label: 'Favorites',
      icon: Star,
      count: stats?.favorites,
    },
    { to: '/archive', label: 'Archive', icon: Archive, count: stats?.archived },
  ];

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex h-14 shrink-0 items-center px-4">
        <NavLink
          to="/library"
          className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark markClassName="size-7" />
        </NavLink>
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="group flex h-9 w-full items-center gap-2 rounded-[10px] border border-border/80 bg-surface px-2.5 text-[13px] text-muted-foreground shadow-[0_1px_2px_rgb(10_13_23/0.04)] transition hover:border-border hover:text-foreground"
        >
          <Search className="size-3.5" />
          <span>Search</span>
          <kbd className="ml-auto rounded-md border border-border/80 bg-surface-2 px-1.5 font-mono text-[10.5px] tracking-wide">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </button>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
        <nav className="grid gap-px">
          {nav.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>

        <CategorySection />
      </div>

      <div className="shrink-0 p-3">
        <a
          href={config.androidUrl}
          className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-brand p-3 text-white shadow-glow"
        >
          <span className="absolute -top-8 -right-6 size-24 rounded-full bg-white/10 blur-xl transition group-hover:bg-white/20" />
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <AndroidIcon className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-medium text-[13px] leading-tight">
              Get the Android app
            </span>
            <span className="block text-[11.5px] text-white/70 leading-tight">
              Screenshots, saved automatically
            </span>
          </span>
        </a>
      </div>
    </div>
  );
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  count,
}: {
  to: string;
  label: string;
  icon: typeof Layers;
  count?: number;
}) {
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  return (
    <NavLink
      to={to}
      end
      onClick={() => setMobileNavOpen(false)}
      className={({ isActive }) =>
        cn(
          'group relative flex h-8 items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] text-foreground/75 outline-none transition-colors hover:bg-accent/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
          isActive &&
            'bg-surface font-medium text-foreground shadow-[0_1px_2px_rgb(10_13_23/0.06),0_0_0_1px_var(--hairline)] hover:bg-surface',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'size-4 text-muted-foreground transition-colors',
              isActive && 'text-primary',
            )}
          />
          <span className="truncate">{label}</span>
          {count !== undefined && count > 0 && (
            <span className="ml-auto text-[11.5px] text-muted-foreground tabular">
              {compact(count)}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function CategorySection() {
  const { data: categories, isLoading } = useCategories();
  const setCategoryDialog = useUiStore((s) => s.setCategoryDialog);
  const tree = categories ? buildTree(categories) : [];

  return (
    <div className="mt-6">
      <div className="group/heading mb-1 flex h-7 items-center px-2.5">
        <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
          Categories
        </span>
        <button
          type="button"
          aria-label="New category"
          onClick={() => setCategoryDialog({ mode: 'create' })}
          className="ml-auto grid size-6 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {isLoading && (
        <div className="grid gap-2 px-2.5 pt-1">
          {[70, 55, 80, 45, 60].map((w) => (
            <Skeleton
              key={w}
              className="h-4 rounded-full"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      )}

      <div className="grid gap-px">
        {tree.map((node) => (
          <RootRow key={node.id} node={node} />
        ))}
      </div>

      {!isLoading && tree.length === 0 && (
        <p className="px-2.5 py-2 text-[12px] text-muted-foreground leading-relaxed">
          Categories appear here as norsumi files your first captures.
        </p>
      )}
    </div>
  );
}

const STORAGE_KEY = 'norsumi-collapsed';

function readCollapsed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

function RootRow({ node }: { node: CategoryNode }) {
  const [open, setOpen] = useState(() => !readCollapsed().has(node.id));
  const toggle = () => {
    const next = !open;
    setOpen(next);
    const set = readCollapsed();
    if (next) set.delete(node.id);
    else set.add(node.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  };

  return (
    <div>
      <CategoryMenu category={node}>
        <CategoryLink category={node} count={node.totalCount}>
          <button
            type="button"
            aria-label={open ? 'Collapse' : 'Expand'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle();
            }}
            className={cn(
              'absolute left-0.5 grid size-5 place-items-center rounded text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100',
              node.children.length === 0 && 'invisible',
            )}
          >
            <ChevronRight
              className={cn(
                'size-3 transition-transform duration-200',
                open && 'rotate-90',
              )}
            />
          </button>
          <span className="w-5 text-center text-[14px] leading-none">
            {node.emoji}
          </span>
        </CategoryLink>
      </CategoryMenu>

      <AnimatePresence initial={false}>
        {open && node.children.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden"
          >
            <span className="absolute top-1 bottom-1 left-[19px] w-px bg-border" />
            <div className="grid gap-px py-px pl-5">
              {node.children.map((child) => (
                <CategoryMenu key={child.id} category={child}>
                  <CategoryLink category={child} count={child.itemCount}>
                    <span
                      className={cn(
                        'ml-1 size-1.5 rounded-full',
                        swatch(child.color).dot,
                      )}
                    />
                    <span className="text-[13px] leading-none">
                      {child.emoji}
                    </span>
                  </CategoryLink>
                </CategoryMenu>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryLink({
  category,
  count,
  children,
}: {
  category: Category;
  count: number;
  children: ReactNode;
}) {
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const { pathname } = useLocation();
  const active = pathname === `/c/${category.id}`;
  return (
    <NavLink
      to={`/c/${category.id}`}
      onClick={() => setMobileNavOpen(false)}
      className={cn(
        'group relative flex h-8 items-center gap-2 rounded-[10px] pr-1.5 pl-5 text-[13px] text-foreground/75 outline-none transition-colors hover:bg-accent/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
        !category.parentId && 'pl-5',
        category.parentId && 'pl-1.5',
        active &&
          'bg-surface font-medium text-foreground shadow-[0_1px_2px_rgb(10_13_23/0.06),0_0_0_1px_var(--hairline)] hover:bg-surface',
      )}
    >
      {children}
      <span className="truncate">{category.name}</span>
      <span className="relative ml-auto flex h-6 min-w-6 items-center justify-end">
        <span className="text-[11.5px] text-muted-foreground tabular transition-opacity group-hover:opacity-0">
          {count > 0 ? compact(count) : ''}
        </span>
        <CategoryDropdown category={category} />
      </span>
    </NavLink>
  );
}

function useCategoryActions(category: Category) {
  const setCategoryDialog = useUiStore((s) => s.setCategoryDialog);
  const setCategoryToDelete = useUiStore((s) => s.setCategoryToDelete);
  return {
    edit: () => setCategoryDialog({ mode: 'edit', category }),
    addChild: category.parentId
      ? null
      : () => setCategoryDialog({ mode: 'create', parent: category }),
    remove: () => setCategoryToDelete(category),
  };
}

function CategoryDropdown({ category }: { category: Category }) {
  const actions = useCategoryActions(category);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Category options"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute inset-y-0 right-0 grid w-6 place-items-center rounded-md text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontal className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-48">
        <DropdownMenuItem onSelect={actions.edit}>
          <Pencil /> Rename & style
        </DropdownMenuItem>
        {actions.addChild && (
          <DropdownMenuItem onSelect={actions.addChild}>
            <Plus /> New topic inside
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={actions.remove}>
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CategoryMenu({
  category,
  children,
}: {
  category: Category;
  children: ReactNode;
}) {
  const actions = useCategoryActions(category);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={actions.edit}>
          <Pencil /> Rename & style
        </ContextMenuItem>
        {actions.addChild && (
          <ContextMenuItem onSelect={actions.addChild}>
            <Plus /> New topic inside
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={actions.remove}>
          <Trash2 /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

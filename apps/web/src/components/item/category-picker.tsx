import type { Category, CategoryRef } from '@norsumi/common';
import { Command } from 'cmdk';
import { Check, ChevronsUpDown, FolderPlus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { CategoryChip } from 'src/components/library/category-chip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'src/components/ui/popover';
import { errorMessage } from 'src/lib/axios';
import { swatch } from 'src/lib/category-colors';
import { buildTree } from 'src/lib/category-tree';
import { cn } from 'src/lib/utils';
import {
  useCategories,
  useCreateCategory,
} from 'src/queries/categories.queries';

const itemClass =
  'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] outline-none data-[selected=true]:bg-accent';

export function CategoryPicker({
  path,
  value,
  onChange,
}: {
  path: CategoryRef[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { data: categories = [] } = useCategories();
  const create = useCreateCategory();
  const tree = buildTree(categories);
  const currentRoot = path[0]
    ? categories.find((c) => c.id === path[0]?.id && !c.parentId)
    : undefined;

  const pick = (id: string | null) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  const createIn = (parent: Category | null) => {
    const name = query.trim();
    if (!name) return;
    create.mutate(
      {
        name,
        parentId: parent?.id ?? null,
        color: parent?.color ?? 'blue',
        emoji: parent ? '✨' : '📁',
      },
      {
        onSuccess: (category) => pick(category.id),
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  };

  const exact = categories.some(
    (c) => c.name.toLowerCase() === query.trim().toLowerCase(),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group -mx-2 flex min-h-9 w-[calc(100%+1rem)] items-center gap-1.5 rounded-lg px-2 py-1 text-left transition hover:bg-accent/60 data-[state=open]:bg-accent/60"
        >
          {path.length ? (
            <span className="flex min-w-0 flex-wrap items-center gap-1">
              {path.map((c, i) => (
                <span key={c.id} className="flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground">›</span>}
                  <CategoryChip category={c} size="md" />
                </span>
              ))}
            </span>
          ) : (
            <span className="text-[13px] text-muted-foreground">
              Uncategorized
            </span>
          )}
          <ChevronsUpDown className="ml-auto size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 overflow-hidden rounded-xl p-0 shadow-float"
      >
        <Command loop>
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Move to…"
            className="h-10 w-full border-border/70 border-b bg-transparent px-3 text-[13px] outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="scrollbar-thin max-h-72 overflow-y-auto p-1.5">
            <Command.Empty className="px-2 py-3 text-[12.5px] text-muted-foreground">
              No category matches.
            </Command.Empty>
            {tree.map((root) => (
              <Command.Group key={root.id}>
                <Command.Item
                  value={`${root.name}`}
                  onSelect={() => pick(root.id)}
                  className={itemClass}
                >
                  <span className="w-5 text-center">{root.emoji}</span>
                  <span className="font-medium">{root.name}</span>
                  {value === root.id && (
                    <Check className="ml-auto size-3.5 text-primary" />
                  )}
                </Command.Item>
                {root.children.map((child) => (
                  <Command.Item
                    key={child.id}
                    value={`${root.name} ${child.name}`}
                    onSelect={() => pick(child.id)}
                    className={cn(itemClass, 'pl-5')}
                  >
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        swatch(child.color).dot,
                      )}
                    />
                    <span>{child.emoji}</span>
                    <span>{child.name}</span>
                    {value === child.id && (
                      <Check className="ml-auto size-3.5 text-primary" />
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
            {query.trim() && !exact && (
              <Command.Group className="mt-1 border-border/70 border-t pt-1">
                {currentRoot && (
                  <Command.Item
                    value={`create-in ${query}`}
                    onSelect={() => createIn(currentRoot)}
                    className={itemClass}
                  >
                    <FolderPlus className="size-3.5 text-primary" />
                    Create “{query.trim()}” in {currentRoot.name}
                  </Command.Item>
                )}
                <Command.Item
                  value={`create ${query}`}
                  onSelect={() => createIn(null)}
                  className={itemClass}
                >
                  <FolderPlus className="size-3.5 text-primary" />
                  Create “{query.trim()}”
                </Command.Item>
              </Command.Group>
            )}
            {value && (
              <Command.Item
                value="remove-category"
                onSelect={() => pick(null)}
                className={cn(itemClass, 'mt-1 text-muted-foreground')}
              >
                <X className="size-3.5" /> Remove category
              </Command.Item>
            )}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

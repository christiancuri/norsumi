import {
  CATEGORY_COLORS,
  type Category,
  type CategoryColor,
} from '@norsumi/common';
import { Check } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from 'src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'src/components/ui/dialog';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { errorMessage } from 'src/lib/axios';
import { swatch } from 'src/lib/category-colors';
import { cn } from 'src/lib/utils';
import {
  useCreateCategory,
  useUpdateCategory,
} from 'src/queries/categories.queries';
import type { CategoryDialogState } from 'src/stores/ui.store';

const EMOJIS = [
  '📸',
  '🍝',
  '🍣',
  '☕',
  '🍷',
  '✈️',
  '🏖️',
  '🏔️',
  '🏙️',
  '👤',
  '🤖',
  '📚',
  '🧠',
  '💡',
  '🛠️',
  '🎨',
  '🎵',
  '🎬',
  '🎤',
  '📝',
  '🛍️',
  '👟',
  '🏠',
  '💪',
  '🧘',
  '💸',
  '📈',
  '🗺️',
  '🌱',
  '❤️',
];

export function CategoryDialog({
  state,
  onClose,
  onCreated,
}: {
  state: CategoryDialogState;
  onClose: () => void;
  onCreated?: (category: Category) => void;
}) {
  const editing = state?.mode === 'edit' ? state.category : null;
  const parent = state?.mode === 'create' ? (state.parent ?? null) : null;

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const [color, setColor] = useState<CategoryColor>('blue');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!state) return;
    setName(editing?.name ?? '');
    setEmoji(editing?.emoji ?? (parent ? '✨' : '📁'));
    setColor(editing?.color ?? parent?.color ?? 'blue');
    setDescription(editing?.description ?? '');
  }, [state, editing, parent]);

  const create = useCreateCategory();
  const update = useUpdateCategory();
  const pending = create.isPending || update.isPending;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = {
      name: name.trim(),
      emoji,
      color,
      description: description.trim() || null,
    };
    if (!body.name) return;
    if (editing) {
      update.mutate(
        { id: editing.id, ...body },
        {
          onSuccess: () => onClose(),
          onError: (err) => toast.error(errorMessage(err)),
        },
      );
    } else {
      create.mutate(
        { ...body, parentId: parent?.id ?? null },
        {
          onSuccess: (category) => {
            toast.success(`${category.emoji} ${category.name} created`);
            onCreated?.(category);
            onClose();
          },
          onError: (err) => toast.error(errorMessage(err)),
        },
      );
    }
  };

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle className="font-display font-normal text-3xl">
              {editing
                ? 'Edit category'
                : parent
                  ? `New in ${parent.name}`
                  : 'New category'}
            </DialogTitle>
            <DialogDescription>
              {parent || editing?.parentId
                ? 'Topics live under a source, like Instagram › Restaurants.'
                : 'Top-level categories are usually a source: Instagram, X, Web.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                'grid size-14 shrink-0 place-items-center rounded-2xl text-3xl transition-colors',
                swatch(color).chip,
              )}
            >
              {emoji}
            </span>
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                autoFocus
                value={name}
                maxLength={40}
                placeholder={parent ? 'Restaurants' : 'Instagram'}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Emoji</Label>
            <div className="grid grid-cols-10 gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    'grid aspect-square place-items-center rounded-lg text-lg transition hover:bg-accent',
                    emoji === e && 'bg-accent ring-2 ring-primary/50',
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'grid size-7 place-items-center rounded-full text-white transition hover:scale-110',
                    swatch(c).dot,
                    color === c &&
                      'ring-2 ring-foreground/70 ring-offset-2 ring-offset-popover',
                  )}
                >
                  {color === c && (
                    <Check className="size-3.5" strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="category-description">
              Description{' '}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="category-description"
              value={description}
              maxLength={140}
              placeholder="Places I want to eat at"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || pending}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

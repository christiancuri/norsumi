import type { CategoryRef } from '@norsumi/common';
import { swatch } from 'src/lib/category-colors';
import { cn } from 'src/lib/utils';

export function CategoryChip({
  category,
  className,
  size = 'sm',
}: {
  category: CategoryRef;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'h-5 px-2 text-[11px]' : 'h-7 px-2.5 text-xs',
        swatch(category.color).chip,
        className,
      )}
    >
      <span className="text-[0.95em] leading-none">{category.emoji}</span>
      <span className="truncate">{category.name}</span>
    </span>
  );
}

export function CategoryDot({
  color,
  className,
}: {
  color: CategoryRef['color'];
  className?: string;
}) {
  return (
    <span
      className={cn(
        'size-1.5 shrink-0 rounded-full',
        swatch(color).dot,
        className,
      )}
    />
  );
}

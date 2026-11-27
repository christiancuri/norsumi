import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from 'src/lib/utils';

/**
 * Text that reads like text and edits in place. Saves on blur, or on Enter
 * when `singleLine` (Shift+Enter still breaks lines elsewhere). Esc reverts.
 */
export function EditableText({
  value,
  onSave,
  placeholder,
  singleLine,
  className,
  ariaLabel,
}: {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  singleLine?: boolean;
  className?: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setDraft(value), [value]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure on every edit
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  const commit = () => {
    const next = singleLine ? draft.replace(/\s+/g, ' ').trim() : draft.trim();
    if (next !== value.trim()) onSave(next);
  };

  return (
    <textarea
      ref={ref}
      rows={1}
      aria-label={ariaLabel}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          setDraft(value);
          requestAnimationFrame(() => ref.current?.blur());
        }
        if (e.key === 'Enter' && (singleLine || e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          ref.current?.blur();
        }
      }}
      className={cn(
        '-mx-2 block w-[calc(100%+1rem)] resize-none overflow-hidden rounded-lg bg-transparent px-2 py-1 outline-none transition-colors',
        'placeholder:text-muted-foreground/60 hover:bg-accent/50 focus:bg-surface-2 focus:ring-2 focus:ring-ring',
        className,
      )}
    />
  );
}

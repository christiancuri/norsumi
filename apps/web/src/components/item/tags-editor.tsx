import { Hash, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from 'src/lib/utils';

export function TagsEditor({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-');
    setDraft('');
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="group inline-flex h-7 items-center gap-1 rounded-full bg-surface-2 pr-1 pl-2.5 text-[12.5px] text-foreground/80"
        >
          <Hash className="size-3 text-muted-foreground" />
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="grid size-5 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        aria-label="Add tag"
        placeholder={tags.length ? 'Add…' : 'Add a tag…'}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(',')) add(v.slice(0, -1));
          else setDraft(v);
        }}
        onBlur={() => draft && add(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(draft);
          }
          if (e.key === 'Backspace' && !draft && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        className={cn(
          'h-7 min-w-20 flex-1 rounded-full bg-transparent px-2 text-[12.5px] outline-none placeholder:text-muted-foreground/70 focus:bg-surface-2',
        )}
      />
    </div>
  );
}

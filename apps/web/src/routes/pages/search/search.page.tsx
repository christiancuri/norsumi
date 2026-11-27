import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { EmptyState } from 'src/components/common/empty-state';
import { ItemGrid } from 'src/components/library/item-grid';
import { PageHeader } from 'src/components/library/page-header';
import { useDebounce } from 'src/hooks/use-debounce';

const SUGGESTIONS = [
  'pasta in São Paulo',
  'AI papers',
  'that synth video',
  'design tools',
];

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [draft, setDraft] = useState(q);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);
  const debounced = useDebounce(draft.trim(), 300);

  useEffect(() => setDraft(q), [q]);

  useEffect(() => {
    if (debounced === q) return;
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (debounced) p.set('q', debounced);
        else p.delete('q');
        return p;
      },
      { replace: true },
    );
  }, [debounced, q, setParams]);

  return (
    <>
      <PageHeader
        title={
          q ? (
            <>
              <span className="text-muted-foreground">Results for</span>{' '}
              <em>“{q}”</em>
            </>
          ) : (
            <>
              Find <em>anything</em>
            </>
          )
        }
      >
        <div className="relative max-w-2xl">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Describe what you remember…"
            className="h-14 w-full rounded-2xl border border-border/80 bg-surface pr-12 pl-12 text-[16px] shadow-[0_1px_2px_rgb(10_13_23/0.04)] outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-4 focus:ring-ring/30"
          />
          {draft && (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => setDraft('')}
              className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {!q && (
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDraft(s)}
                className="rounded-full border border-border/70 bg-surface px-3 py-1.5 text-[13px] text-muted-foreground transition hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </PageHeader>

      {q ? (
        <ItemGrid
          key={q}
          filter={{ q }}
          empty={
            <EmptyState
              title={
                <>
                  Nothing for <em>“{q}”</em>
                </>
              }
              description="Try describing it differently: a place, a person, a color, what it was about."
            />
          }
        />
      ) : (
        <EmptyState
          title={
            <>
              Search by <em>meaning</em>
            </>
          }
          description="norsumi reads every screenshot, so you can search for what was in it, not just what you named it."
        />
      )}
    </>
  );
}

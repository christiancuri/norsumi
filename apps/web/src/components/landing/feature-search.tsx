import type { Item } from '@norsumi/common';
import { CornerDownLeft, Search, Sparkles } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CategoryChip } from 'src/components/library/category-chip';
import { itemPreviewUrl, itemTitle } from 'src/lib/item';
import { cn } from 'src/lib/utils';

import {
  EASE,
  FeatureCard,
  FeatureCopy,
  imageItems,
  Reveal,
  showcaseItems,
} from './primitives';

const QUERY = 'that pizza place with the burrata';
const MATCH_SCORES = [0.94, 0.81, 0.72, 0.64];

function findByTitle(fragment: string) {
  return showcaseItems.find((i) =>
    itemTitle(i).toLowerCase().includes(fragment),
  );
}

export function FeatureSearch() {
  return (
    <Reveal>
      <FeatureCard className="grid lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative order-2 overflow-hidden border-border/60 border-t bg-surface-2/50 p-4 sm:p-10 lg:order-1 lg:border-t-0 lg:border-r">
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_60%_30%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)]" />
          <CommandPalette />
        </div>
        <div className="order-1 flex flex-col justify-center gap-8 p-7 sm:p-10 lg:order-2">
          <FeatureCopy
            icon={<Search />}
            label="Search that understands"
            title={
              <>
                Search the way
                <br />
                <em>you remember it.</em>
              </>
            }
          >
            You won't remember the name. You'll remember "that pizza place with
            the burrata". norsumi blends keyword and semantic search over
            titles, summaries and every word inside your screenshots.
          </FeatureCopy>
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-foreground shadow-[0_1px_0_var(--border)]">
              ⌘
            </kbd>
            <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-foreground shadow-[0_1px_0_var(--border)]">
              K
            </kbd>
            from anywhere in the app
          </div>
        </div>
      </FeatureCard>
    </Reveal>
  );
}

function CommandPalette() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-15% 0px -15% 0px' });
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const done = typed >= QUERY.length;
    const id = window.setTimeout(
      () => setTyped(done ? 0 : typed + 1),
      done ? 4600 : typed === 0 ? 700 : 38 + ((typed * 37) % 60),
    );
    return () => window.clearTimeout(id);
  }, [inView, reduce, typed]);

  const shown = reduce ? QUERY.length : typed;
  const complete = shown >= QUERY.length;

  const results = useMemo(() => {
    const picks = [
      findByTitle('bráz'),
      findByTitle("joe's pizza"),
      findByTitle('mocotó'),
      findByTitle('time out market'),
    ].filter((i): i is Item => Boolean(i));
    for (const extra of imageItems) {
      if (picks.length >= 4) break;
      if (!picks.includes(extra)) picks.push(extra);
    }
    return picks;
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="relative mx-auto w-full max-w-[560px] overflow-hidden rounded-[22px] border border-border/70 bg-popover/95 shadow-float backdrop-blur-xl"
    >
      <div className="flex h-14 items-center gap-3 border-border/70 border-b px-4">
        <Search className="size-[18px] text-muted-foreground" />
        <div className="min-w-0 flex-1 truncate text-[15px]">
          {shown === 0 ? (
            <span className="text-muted-foreground">Search your library…</span>
          ) : (
            QUERY.slice(0, shown)
          )}
          <span className="ml-px inline-block h-[18px] w-[2px] translate-y-[3px] animate-pulse bg-primary" />
        </div>
        <kbd className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          esc
        </kbd>
      </div>

      <div className="min-h-[316px] p-2">
        <div className="flex items-center gap-1.5 px-2.5 pt-1.5 pb-2 font-medium text-[10.5px] text-muted-foreground uppercase tracking-[0.12em]">
          {complete ? (
            <>
              <Sparkles className="size-3 text-primary" /> Best matches
            </>
          ) : (
            'Recent'
          )}
        </div>
        {complete ? (
          results.map((item, i) => (
            <motion.div
              key={item.id}
              initial={
                reduce ? false : { opacity: 0, y: 8, filter: 'blur(4px)' }
              }
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{
                duration: 0.45,
                ease: EASE,
                delay: 0.08 + i * 0.07,
              }}
            >
              <ResultRow
                item={item}
                score={MATCH_SCORES[i] ?? 0.5}
                active={i === 0}
              />
            </motion.div>
          ))
        ) : (
          <div className="space-y-1">
            {[0, 1, 2, 3].map((n) => (
              <div
                key={n}
                className="flex items-center gap-3 rounded-xl px-2.5 py-2"
              >
                <span className="size-10 rounded-lg bg-surface-2" />
                <span className="flex-1 space-y-1.5">
                  <span className="block h-2.5 w-3/5 rounded-full bg-surface-2" />
                  <span className="block h-2 w-2/5 rounded-full bg-surface-2/80" />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultRow({
  item,
  score,
  active,
}: {
  item: Item;
  score: number;
  active: boolean;
}) {
  const preview = itemPreviewUrl(item);
  const leaf = item.categoryPath.at(-1);
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl px-2.5 py-2',
        active && 'bg-primary/[0.07] ring-1 ring-primary/15',
      )}
    >
      <span
        className="size-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-border/70"
        style={{ backgroundColor: item.image?.dominantColor }}
      >
        {preview && (
          <img
            src={preview}
            alt=""
            className="size-full object-cover object-top"
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-[13px]">
          {itemTitle(item)}
        </span>
        <span className="mt-1 flex items-center gap-2">
          {leaf && <CategoryChip category={leaf} />}
          <span className="hidden h-1 w-14 overflow-hidden rounded-full bg-surface-2 sm:block">
            <span
              className="block h-full rounded-full bg-primary/70"
              style={{ width: `${score * 100}%` }}
            />
          </span>
        </span>
      </span>
      {active && (
        <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />
      )}
    </div>
  );
}

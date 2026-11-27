import type { Category } from '@norsumi/common';
import { motion, useReducedMotion } from 'motion/react';
import { useMemo } from 'react';
import { swatch } from 'src/lib/category-colors';
import { cn } from 'src/lib/utils';
import { seedCategories } from 'src/services/mock/seed';

import { Reveal } from './primitives';

/** Extra paths so the strip reads as "anything you'd ever screenshot". */
const EXTRA: {
  root: string;
  leaf: string;
  emoji: string;
  color: Category['color'];
}[] = [
  { root: 'TikTok', leaf: 'Workouts', emoji: '🏋️', color: 'lime' },
  { root: 'Maps', leaf: 'Coffee', emoji: '☕', color: 'amber' },
  { root: 'WhatsApp', leaf: 'Addresses', emoji: '📍', color: 'emerald' },
  { root: 'Web', leaf: 'Gift ideas', emoji: '🎁', color: 'rose' },
  { root: 'Pinterest', leaf: 'Interiors', emoji: '🛋️', color: 'orange' },
  { root: 'Spotify', leaf: 'Albums', emoji: '🎧', color: 'violet' },
];

interface Path {
  key: string;
  root: string;
  leaf: string;
  emoji: string;
  color: Category['color'];
}

export function CategoryMarquee() {
  const paths = useMemo<Path[]>(() => {
    const byId = new Map(seedCategories.map((c) => [c.id, c]));
    const seeded = seedCategories.flatMap((c) => {
      const parent = c.parentId ? byId.get(c.parentId) : undefined;
      return parent
        ? [
            {
              key: c.id,
              root: parent.name,
              leaf: c.name,
              emoji: c.emoji,
              color: c.color,
            },
          ]
        : [];
    });
    return [
      ...seeded,
      ...EXTRA.map((e) => ({ ...e, key: `${e.root}-${e.leaf}` })),
    ];
  }, []);

  const half = Math.ceil(paths.length / 2);
  return (
    <section
      aria-label="Example categories"
      className="relative py-10 sm:py-14"
    >
      <Reveal className="mb-8 text-center text-[13px] text-muted-foreground">
        Two levels deep, named the way you think.
      </Reveal>
      <div className="flex flex-col gap-3 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <Row paths={paths.slice(0, half)} duration={48} />
        <Row paths={paths.slice(half)} duration={56} reverse />
      </div>
    </section>
  );
}

function Row({
  paths,
  duration,
  reverse,
}: {
  paths: Path[];
  duration: number;
  reverse?: boolean;
}) {
  const reduce = useReducedMotion();
  const list = (copy: string) => (
    <div className="flex shrink-0 gap-3 pr-3">
      {paths.map((p) => (
        <span
          key={`${copy}-${p.key}`}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border/70 bg-surface pr-4 pl-1.5 text-[14px] shadow-[0_1px_2px_rgb(10_13_23/0.04)]"
        >
          <span
            className={cn(
              'grid size-8 place-items-center rounded-full text-[15px]',
              swatch(p.color).chip,
            )}
          >
            {p.emoji}
          </span>
          <span className="text-muted-foreground">{p.root}</span>
          <span className="text-muted-foreground/50">›</span>
          <span className="font-medium">{p.leaf}</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="flex overflow-hidden" aria-hidden>
      <motion.div
        className="flex"
        animate={
          reduce ? undefined : { x: reverse ? ['-50%', '0%'] : ['0%', '-50%'] }
        }
        transition={{
          duration,
          ease: 'linear',
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        {list('a')}
        {list('b')}
      </motion.div>
    </div>
  );
}

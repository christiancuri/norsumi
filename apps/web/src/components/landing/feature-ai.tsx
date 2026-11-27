import type { EntityType, ItemEntity } from '@norsumi/common';
import {
  AtSign,
  BookOpen,
  Building2,
  CalendarDays,
  Hash,
  Link2,
  MapPin,
  Package,
  Sparkles,
  Tag,
  User,
  Wand2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { CategoryChip } from 'src/components/library/category-chip';
import { cn } from 'src/lib/utils';

import {
  EASE,
  FeatureCard,
  FeatureCopy,
  placeItem,
  Reveal,
  useSequence,
} from './primitives';

const ENTITY_ICONS: Partial<
  Record<EntityType, ComponentType<{ className?: string }>>
> = {
  place: MapPin,
  account: AtSign,
  person: User,
  organization: Building2,
  product: Package,
  event: CalendarDays,
  book: BookOpen,
  url: Link2,
  date: CalendarDays,
  price: Tag,
};

/** idle → reading → path → summary → entities (held). */
const STEPS = [900, 1700, 1000, 1100, 3600] as const;

export function FeatureAi() {
  return (
    <Reveal>
      <FeatureCard className="grid overflow-hidden lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-between gap-10 p-7 sm:p-10">
          <FeatureCopy
            icon={<Wand2 />}
            label="AI categories"
            title={
              <>
                It files itself.
                <br />
                <em>Exactly where you'd look.</em>
              </>
            }
          >
            Every capture gets a title, a summary and a two-level home: the app
            it came from, then what it's about. Places, people and products
            become chips you can tap: open in Maps, jump to a profile.
          </FeatureCopy>
          <ul className="grid gap-2.5 text-[14px]">
            {[
              'Categories invent themselves as your library grows',
              'Reads text in any language, even tiny captions',
              'Rename, merge or move anything, it learns your taste',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-muted-foreground">{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <CategorizeStage />
      </FeatureCard>
    </Reveal>
  );
}

function CategorizeStage() {
  const { ref, step } = useSequence(STEPS);
  const item = placeItem;
  if (!item?.image) return null;

  const reading = step === 1;
  const [root, leaf] = item.categoryPath;
  const entities = item.entities.slice(0, 3);

  return (
    <div
      ref={ref}
      aria-hidden
      className="relative flex min-h-[520px] items-center justify-center overflow-hidden border-border/60 border-t bg-surface-2/50 p-6 sm:p-10 lg:border-t-0 lg:border-l"
    >
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_40%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--hairline)_1px,transparent_1px),linear-gradient(to_bottom,var(--hairline)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />

      <div className="relative flex w-full max-w-[540px] flex-col items-center gap-6 sm:flex-row sm:items-center">
        {/* The screenshot being read */}
        <div className="relative w-[168px] shrink-0 sm:w-[190px]">
          <div
            className="relative overflow-hidden rounded-[22px] shadow-float ring-1 ring-black/10"
            style={{
              aspectRatio: `${item.image.width} / ${Math.min(item.image.height, item.image.width * 1.9)}`,
              backgroundColor: item.image.dominantColor,
            }}
          >
            <img
              src={item.image.url}
              alt=""
              className="absolute inset-0 size-full object-cover object-top"
            />
            <AnimatePresence>
              {reading && (
                <motion.div
                  key="scan"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0"
                >
                  <div className="absolute inset-0 bg-primary/10" />
                  <motion.div
                    initial={{ top: '-12%' }}
                    animate={{ top: '100%' }}
                    transition={{ duration: 1.5, ease: 'easeInOut' }}
                    className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-primary/35 to-transparent"
                  >
                    <div className="absolute inset-x-0 top-1/2 h-px bg-white shadow-[0_0_14px_2px_rgb(46_107_255/0.9)]" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {reading && (
              <motion.span
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="absolute -bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface px-2.5 py-1 font-medium text-[11px] text-primary shadow-lift ring-1 ring-border/70"
              >
                <Sparkles className="size-3 animate-pulse" />
                Reading…
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* What the AI understood */}
        <div className="relative w-full min-w-0 flex-1 rounded-[22px] border border-border/70 bg-surface/90 p-4 shadow-float backdrop-blur-xl sm:p-5">
          <div className="flex items-center gap-1.5 font-medium text-[10.5px] text-muted-foreground uppercase tracking-[0.12em]">
            <Sparkles className="size-3 text-primary" />
            Filed under
          </div>

          <div className="mt-3 flex min-h-7 flex-wrap items-center gap-1.5">
            {step >= 2 && root && leaf ? (
              <>
                <Pop delay={0}>
                  <CategoryChip category={root} size="md" />
                </Pop>
                <Pop delay={0.12}>
                  <span className="text-muted-foreground">›</span>
                </Pop>
                <Pop delay={0.22}>
                  <CategoryChip
                    category={leaf}
                    size="md"
                    className="ring-2 ring-orange-400/30"
                  />
                </Pop>
              </>
            ) : (
              <Placeholder className="h-7 w-48" />
            )}
          </div>

          <div className="mt-4 min-h-[88px]">
            {step >= 3 ? (
              <motion.div
                initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.6, ease: EASE }}
              >
                <div className="font-display text-[23px] leading-[1.08]">
                  {item.title}
                </div>
                <p className="mt-2 line-clamp-2 text-[12.5px] text-muted-foreground leading-relaxed">
                  {item.summary}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-2 pt-1">
                <Placeholder className="h-4 w-11/12" />
                <Placeholder className="h-4 w-2/3" />
                <Placeholder className="mt-3 h-2.5 w-full" />
                <Placeholder className="h-2.5 w-4/5" />
              </div>
            )}
          </div>

          <div className="mt-4 flex min-h-[64px] flex-wrap content-start gap-1.5 border-border/60 border-t pt-4">
            {step >= 4
              ? entities.map((e, i) => (
                  <Pop key={`${e.type}-${e.name}`} delay={i * 0.12}>
                    <EntityChip entity={e} />
                  </Pop>
                ))
              : [28, 22, 30].map((w) => (
                  <Placeholder
                    key={w}
                    className="h-7"
                    style={{ width: `${w}%` }}
                  />
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Pop({ delay, children }: { delay: number; children: ReactNode }) {
  return (
    <motion.span
      className="inline-flex"
      initial={{ opacity: 0, scale: 0.6, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26, delay }}
    >
      {children}
    </motion.span>
  );
}

function Placeholder({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={style}
      className={cn('shimmer block rounded-full bg-surface-2', className)}
    />
  );
}

function EntityChip({ entity }: { entity: ItemEntity }) {
  const Icon = ENTITY_ICONS[entity.type] ?? Hash;
  return (
    <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-surface px-2.5 text-[11.5px] shadow-[0_1px_2px_rgb(10_13_23/0.05)]">
      <Icon
        className={cn(
          'size-3.5 shrink-0',
          entity.type === 'place' ? 'text-rose-500' : 'text-primary',
        )}
      />
      <span className="truncate font-medium">{entity.name}</span>
      {entity.value && entity.type !== 'place' && (
        <span className="shrink-0 text-muted-foreground">{entity.value}</span>
      )}
    </span>
  );
}

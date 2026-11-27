import type { Item } from '@norsumi/common';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from 'src/lib/utils';
import { seedItems } from 'src/services/mock/seed';

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* Showcase data                                                       */
/* ------------------------------------------------------------------ */

/** Items that look good on a marketing page (ready, not archived). */
export const showcaseItems: Item[] = seedItems.filter((i) => !i.archived);

export const imageItems: Item[] = showcaseItems.filter(
  (i) => i.image && i.status === 'ready',
);

/** The hero item of the "AI categories" moment: a screenshot of a place. */
export const placeItem: Item | undefined =
  imageItems.find(
    (i) =>
      i.categoryPath.length === 2 && i.entities.some((e) => e.type === 'place'),
  ) ??
  imageItems.find((i) => i.categoryPath.length === 2) ??
  imageItems[0];

/* ------------------------------------------------------------------ */
/* Motion helpers                                                      */
/* ------------------------------------------------------------------ */

export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Steps through `durations.length` states while the element is on screen,
 * holding each one for its duration (ms). Reduced motion pins the last step.
 * `durations` must be a stable (module-level) array.
 */
export function useSequence(durations: readonly number[]) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-15% 0px -15% 0px' });
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const id = window.setTimeout(
      () => setStep((s) => (s + 1) % durations.length),
      durations[step] ?? 1000,
    );
    return () => window.clearTimeout(id);
  }, [inView, reduce, step, durations]);

  return { ref, step: reduce ? durations.length - 1 : step, reduce };
}

/* ------------------------------------------------------------------ */
/* Typography + surfaces                                               */
/* ------------------------------------------------------------------ */

export function Eyebrow({
  icon,
  children,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/70 px-3 py-1 font-medium text-[12px] text-muted-foreground shadow-[0_1px_2px_rgb(10_13_23/0.04)] backdrop-blur [&_svg]:size-3.5 [&_svg]:text-primary',
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  icon,
  title,
  children,
  align = 'center',
  className,
}: {
  eyebrow: string;
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        'flex flex-col gap-5',
        align === 'center' ? 'items-center text-center' : 'items-start',
        className,
      )}
    >
      <Eyebrow icon={icon}>{eyebrow}</Eyebrow>
      <h2 className="max-w-3xl text-balance font-display text-[44px] leading-[0.98] sm:text-[60px]">
        {title}
      </h2>
      {children && (
        <p
          className={cn(
            'max-w-xl text-pretty text-[16px] text-muted-foreground leading-relaxed sm:text-[17px]',
          )}
        >
          {children}
        </p>
      )}
    </Reveal>
  );
}

/** Italic, blue-tinted accent inside a serif headline. */
export function Accent({ children }: { children: ReactNode }) {
  return (
    <em className="bg-[linear-gradient(110deg,var(--primary),color-mix(in_oklab,var(--primary)_55%,#A8C6FF))] bg-clip-text pr-[0.08em] text-transparent italic">
      {children}
    </em>
  );
}

/** Rounded marketing card with a hairline inner highlight. */
export function FeatureCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-border/70 bg-surface',
        'shadow-[0_1px_2px_rgb(10_13_23/0.04),0_24px_60px_-36px_rgb(10_13_23/0.25)]',
        'before:pointer-events-none before:absolute before:inset-x-10 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/35 before:to-transparent',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FeatureCopy({
  icon,
  label,
  title,
  children,
  className,
}: {
  icon: ReactNode;
  label: string;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-2 font-medium text-[13px] text-primary [&_svg]:size-4">
        {icon}
        {label}
      </div>
      <h3 className="text-balance font-display text-[32px] leading-[1.02] sm:text-[38px]">
        {title}
      </h3>
      <p className="max-w-md text-pretty text-[15px] text-muted-foreground leading-relaxed">
        {children}
      </p>
    </div>
  );
}

/** Android-ish phone frame. Children fill the screen. */
export function PhoneFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative aspect-[9/18.5] w-[228px] rounded-[40px] bg-neutral-900 p-[7px] shadow-float ring-1 ring-black/10 dark:bg-neutral-800 dark:ring-white/10',
        className,
      )}
    >
      <div className="relative size-full overflow-hidden rounded-[33px] bg-background">
        {children}
        <span className="absolute top-2.5 left-1/2 z-30 size-[9px] -translate-x-1/2 rounded-full bg-neutral-900 ring-2 ring-neutral-800/40" />
      </div>
    </div>
  );
}

/** Android status bar (time + glyphs). */
export function StatusBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-7 items-center justify-between px-5 pt-1 font-medium text-[10px] tabular',
        className,
      )}
    >
      <span>9:41</span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-3 rounded-[2px] bg-current opacity-80" />
        <span className="h-2 w-4 rounded-[2px] border border-current opacity-80" />
      </span>
    </div>
  );
}

export const ctaPrimary = cn(
  'group relative isolate inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-6 font-medium text-[15px] text-primary-foreground',
  'shadow-glow transition-[transform,box-shadow] duration-300 ease-out-expo',
  'before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-b before:from-white/20 before:to-transparent',
  'hover:-translate-y-0.5 hover:shadow-[0_16px_44px_-10px_rgb(46_107_255/0.7)] active:translate-y-0 active:scale-[0.98]',
  'outline-none focus-visible:ring-4 focus-visible:ring-ring',
);

export const ctaSecondary = cn(
  'group inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-surface/70 px-6 font-medium text-[15px] backdrop-blur',
  'shadow-[0_1px_2px_rgb(10_13_23/0.05)] transition-[transform,background-color] duration-300 ease-out-expo',
  'hover:-translate-y-0.5 hover:bg-surface active:translate-y-0 active:scale-[0.98]',
  'outline-none focus-visible:ring-4 focus-visible:ring-ring',
);

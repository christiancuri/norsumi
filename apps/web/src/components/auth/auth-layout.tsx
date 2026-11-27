import type { Item } from '@norsumi/common';
import { Lock, Sparkles } from 'lucide-react';
import {
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import type { PointerEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import { GithubIcon } from 'src/components/brand/github-icon';
import { Wordmark } from 'src/components/brand/logo';
import { ItemCard } from 'src/components/library/item-card';
import { config } from 'src/config';
import { cn } from 'src/lib/utils';
import { seedItems } from 'src/services/mock/seed';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface AuthLayoutProps {
  title: ReactNode;
  subtitle: ReactNode;
  /** Top-right switch, e.g. "New here? Create an account". */
  aside: ReactNode;
  children: ReactNode;
}

export function LegalNote() {
  return (
    <p className="mt-4 text-center text-[11.5px] text-muted-foreground leading-relaxed">
      By continuing you agree to the{' '}
      <Link
        to="/terms"
        className="underline underline-offset-2 hover:text-foreground"
      >
        Terms
      </Link>{' '}
      and{' '}
      <Link
        to="/privacy"
        className="underline underline-offset-2 hover:text-foreground"
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
}

export function AuthLayout({
  title,
  subtitle,
  aside,
  children,
}: AuthLayoutProps) {
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
          animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
          transition: { duration: 0.8, ease: EASE, delay },
        };

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <div className="relative isolate flex min-w-0 flex-1 flex-col px-5 py-5 sm:px-10 sm:py-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_20%_0%,rgb(46_107_255/0.10),transparent_70%)] lg:bg-[radial-gradient(50%_35%_at_0%_0%,rgb(46_107_255/0.08),transparent_70%)]"
        />
        <header className="flex items-center justify-between gap-4">
          <Link
            to="/"
            aria-label="norsumi home"
            className="rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ring"
          >
            <Wordmark markClassName="size-7" />
          </Link>
          <div className="text-right text-[13px] text-muted-foreground">
            {aside}
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[380px]">
            <motion.h1
              {...rise(0)}
              className="font-display text-[46px] leading-[0.95] sm:text-[54px]"
            >
              {title}
            </motion.h1>
            <motion.p
              {...rise(0.08)}
              className="mt-3 text-[15px] text-muted-foreground"
            >
              {subtitle}
            </motion.p>
            <motion.div {...rise(0.16)} className="mt-9">
              {children}
            </motion.div>
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="size-3" />
            Encrypted at rest · Open source
          </span>
          <a
            href={config.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <GithubIcon className="size-3.5" />
            GitHub
          </a>
        </footer>
      </div>

      <BrandPanel />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function pick(fragment: string, fallback: (i: Item) => boolean) {
  return (
    seedItems.find((i) => i.title.toLowerCase().includes(fragment)) ??
    seedItems.find(fallback)
  );
}

const COLLAGE = [
  {
    item: pick('bráz', (i) => Boolean(i.image)),
    className: 'left-[2%] top-[4%] w-[46%]',
    rotate: -7,
    depth: 26,
    delay: 0.15,
  },
  {
    item: pick('biome', (i) => i.kind === 'link'),
    className: 'right-[0%] top-[0%] w-[50%]',
    rotate: 5,
    depth: 16,
    delay: 0.3,
  },
  {
    item: pick('weekend in nyc', (i) => i.kind === 'note'),
    className: 'right-[6%] top-[47%] w-[46%]',
    rotate: -3,
    depth: 34,
    delay: 0.45,
  },
  {
    item: pick('miradouro', (i) => Boolean(i.image)),
    className: 'left-[10%] top-[52%] w-[38%]',
    rotate: 6,
    depth: 22,
    delay: 0.6,
  },
];

function BrandPanel() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <aside
      aria-hidden
      className="sticky top-0 hidden h-dvh w-[50%] max-w-[760px] shrink-0 p-3 lg:block"
    >
      <div
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          mx.set(0);
          my.set(0);
        }}
        className="relative isolate flex size-full flex-col overflow-hidden rounded-[30px] bg-brand p-10 text-white xl:p-12"
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_70%_10%,rgb(255_255_255/0.20),transparent_65%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(50%_40%_at_10%_100%,rgb(0_0_40/0.45),transparent_70%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.06)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_60%_at_60%_40%,black_10%,transparent_80%)]" />
        <div className="absolute inset-0 -z-10">
          <div className="grain size-full" />
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-medium text-[12px] backdrop-blur">
          <Sparkles className="size-3.5" />
          Sorted by AI, the moment you save
        </div>

        <div className="relative mx-auto my-8 aspect-square min-h-0 w-full max-w-[460px] flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_78%,transparent)]">
          {COLLAGE.map((c, i) =>
            c.item ? (
              <CollageCard
                key={c.item.id}
                item={c.item}
                className={c.className}
                rotate={c.rotate}
                depth={c.depth}
                delay={c.delay}
                floatDelay={i * 1.3}
                sx={sx}
                sy={sy}
                reduce={Boolean(reduce)}
              />
            ) : null,
          )}
          <FiledChip reduce={Boolean(reduce)} />
        </div>

        <div>
          <p className="max-w-md text-balance font-display text-[40px] leading-[1.02] xl:text-[46px]">
            Everything you saved,{' '}
            <em className="text-white/80">exactly where you'd look for it.</em>
          </p>
          <div className="mt-5 flex items-center gap-2 text-[12.5px] text-white/60">
            <span>Open source</span>
            <span className="size-[3px] rounded-full bg-white/40" />
            <span>AES-256 encrypted</span>
            <span className="size-[3px] rounded-full bg-white/40" />
            <span>Zero-retention AI</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function CollageCard({
  item,
  className,
  rotate,
  depth,
  delay,
  floatDelay,
  sx,
  sy,
  reduce,
}: {
  item: Item;
  className: string;
  rotate: number;
  depth: number;
  delay: number;
  floatDelay: number;
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  reduce: boolean;
}) {
  const x = useTransform(sx, (v) => v * depth);
  const y = useTransform(sy, (v) => v * depth);
  return (
    <motion.div
      className={cn('absolute', className)}
      style={{ x, y }}
      initial={reduce ? false : { opacity: 0, y: 40, rotate: 0, scale: 0.92 }}
      animate={{ opacity: 1, rotate, scale: 1 }}
      transition={{ duration: 1.1, ease: EASE, delay }}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -10, 0] }}
        transition={{
          duration: 7,
          delay: floatDelay,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
        }}
      >
        <ItemCard
          item={item}
          decorative
          className="border-white/30 text-foreground shadow-[0_40px_80px_-24px_rgb(0_0_30/0.65)]"
        />
      </motion.div>
    </motion.div>
  );
}

function FiledChip({ reduce }: { reduce: boolean }) {
  const item = COLLAGE[0]?.item;
  const [root, leaf] = item?.categoryPath ?? [];
  if (!root || !leaf) return null;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 1.2 }}
      className="absolute top-[38%] left-[30%] z-10 flex items-center gap-2 rounded-full bg-white py-1.5 pr-3.5 pl-1.5 font-medium text-[12.5px] text-neutral-900 shadow-[0_20px_40px_-12px_rgb(0_0_30/0.6)]"
    >
      <span className="grid size-6 place-items-center rounded-full bg-[#2E6BFF] text-white">
        <Sparkles className="size-3.5" />
      </span>
      {root.emoji} {root.name}
      <span className="text-neutral-400">›</span>
      {leaf.emoji} {leaf.name}
    </motion.div>
  );
}

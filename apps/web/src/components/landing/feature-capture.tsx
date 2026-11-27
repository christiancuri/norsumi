import {
  Check,
  Copy,
  Mail,
  MessageCircle,
  Share2,
  Smartphone,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { LogoMark } from 'src/components/brand/logo';
import { cn } from 'src/lib/utils';

import {
  EASE,
  FeatureCard,
  FeatureCopy,
  imageItems,
  PhoneFrame,
  placeItem,
  Reveal,
  StatusBar,
  showcaseItems,
  useSequence,
} from './primitives';

export function FeatureCapture() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Reveal>
        <FeatureCard className="flex h-full flex-col">
          <FeatureCopy
            icon={<Smartphone />}
            label="Auto-capture on Android"
            title={
              <>
                Take a screenshot.
                <br />
                <em>That's the whole workflow.</em>
              </>
            }
            className="p-7 sm:p-9"
          >
            norsumi watches your screenshots folder. New captures are picked up
            in the background, read, and filed before you've closed the app.
          </FeatureCopy>
          <Stage>
            <AutoCapturePhone />
          </Stage>
        </FeatureCard>
      </Reveal>
      <Reveal delay={0.1}>
        <FeatureCard className="flex h-full flex-col">
          <FeatureCopy
            icon={<Share2 />}
            label="Share from any app"
            title={
              <>
                Links, posts, places.
                <br />
                <em>One tap from anywhere.</em>
              </>
            }
            className="p-7 sm:p-9"
          >
            Pick norsumi in any share sheet: a thread on X, a reel, a Maps pin,
            an article. It lands in your library with a title, a summary and a
            home.
          </FeatureCopy>
          <Stage>
            <SharePhone />
          </Stage>
        </FeatureCard>
      </Reveal>
    </div>
  );
}

function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="relative mt-auto flex h-[400px] justify-center overflow-hidden border-border/60 border-t bg-[radial-gradient(80%_70%_at_50%_100%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)] pt-10">
      <div className="absolute inset-0 bg-[radial-gradient(var(--hairline)_1px,transparent_1px)] bg-[size:18px_18px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const CAPTURE_STEPS = [1400, 1100, 2800, 700] as const;

function AutoCapturePhone() {
  const { ref, step } = useSequence(CAPTURE_STEPS);
  const fresh = placeItem;
  const rest = imageItems.filter((i) => i.id !== fresh?.id).slice(0, 8);
  const showFresh = step >= 1;
  const showBanner = step === 2;
  const leaf = fresh?.categoryPath.at(-1);
  const root = fresh?.categoryPath[0];

  return (
    <div ref={ref}>
      <PhoneFrame>
        <div className="flex h-full flex-col bg-surface">
          <StatusBar />
          <div className="px-4 pt-3 pb-2">
            <div className="text-[10px] text-muted-foreground">Gallery</div>
            <div className="font-semibold text-[16px] tracking-tight">
              Screenshots
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 px-1">
            <AnimatePresence initial={false}>
              {showFresh && fresh?.image && (
                <motion.div
                  key="fresh"
                  layout
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.6, ease: EASE }}
                  className="relative aspect-[9/16] overflow-hidden rounded-[6px] ring-2 ring-primary"
                >
                  <img
                    src={fresh.image.thumbUrl}
                    alt=""
                    className="size-full object-cover object-top"
                  />
                  <motion.span
                    initial={{ opacity: 0.9 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                    className="absolute inset-0 bg-white"
                  />
                </motion.div>
              )}
              {rest.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  transition={{ duration: 0.6, ease: EASE }}
                  className="aspect-[9/16] overflow-hidden rounded-[6px]"
                  style={{ backgroundColor: item.image?.dominantColor }}
                >
                  <img
                    src={item.image?.thumbUrl}
                    alt=""
                    className="size-full object-cover object-top"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {showBanner && (
            <motion.div
              initial={{ y: -80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="absolute inset-x-2 top-8 z-20 flex items-center gap-2.5 rounded-[18px] border border-border/60 bg-popover/95 p-2.5 shadow-float backdrop-blur-xl"
            >
              <LogoMark className="size-8" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  norsumi · now
                </div>
                <div className="truncate font-medium text-[11.5px]">
                  Filed to {root?.name} › {leaf?.emoji} {leaf?.name}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </PhoneFrame>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const SHARE_STEPS = [1300, 1200, 700, 2400] as const;

function SharePhone() {
  const { ref, step } = useSequence(SHARE_STEPS);
  const link =
    showcaseItems.find((i) => i.kind === 'link' && i.link?.imageUrl) ??
    showcaseItems[0];
  const sheetOpen = step === 1 || step === 2;
  const tapped = step === 2;
  const saved = step === 3;

  const targets = [
    {
      label: 'norsumi',
      node: <LogoMark className="size-11" />,
      us: true,
    },
    {
      label: 'Messages',
      node: (
        <IconTile className="bg-emerald-500">
          <MessageCircle />
        </IconTile>
      ),
    },
    {
      label: 'Gmail',
      node: (
        <IconTile className="bg-rose-500">
          <Mail />
        </IconTile>
      ),
    },
    {
      label: 'Copy',
      node: (
        <IconTile className="bg-neutral-500">
          <Copy />
        </IconTile>
      ),
    },
  ];

  return (
    <div ref={ref}>
      <PhoneFrame>
        <div className="flex h-full flex-col bg-surface">
          <StatusBar />
          <div className="flex items-center gap-2 px-3 pt-2 pb-3">
            <div className="h-6 flex-1 truncate rounded-full bg-surface-2 px-3 text-[9.5px] text-muted-foreground leading-6">
              {link?.link?.domain ?? 'github.com'}
            </div>
          </div>
          {link?.link?.imageUrl && (
            <img
              src={link.link.imageUrl}
              alt=""
              className="mx-3 aspect-[1.91/1] rounded-xl object-cover"
            />
          )}
          <div className="px-3 pt-3">
            <div className="line-clamp-2 font-semibold text-[12px] leading-snug">
              {link?.link?.title ?? link?.title}
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-surface-2" />
              <div className="h-1.5 w-11/12 rounded-full bg-surface-2" />
              <div className="h-1.5 w-3/4 rounded-full bg-surface-2" />
              <div className="h-1.5 w-5/6 rounded-full bg-surface-2" />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {sheetOpen && (
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-black/25"
            />
          )}
          {sheetOpen && (
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute inset-x-0 bottom-0 z-20 rounded-t-[22px] bg-popover px-3 pt-2 pb-5 shadow-float"
            >
              <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-border" />
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-surface-2 p-2">
                {link?.link?.faviconUrl && (
                  <img
                    src={link.link.faviconUrl}
                    alt=""
                    className="size-6 rounded-md"
                  />
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium text-[10px]">
                    {link?.link?.title ?? link?.title}
                  </div>
                  <div className="truncate text-[9px] text-muted-foreground">
                    {link?.link?.url}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {targets.map((t) => (
                  <div
                    key={t.label}
                    className="flex flex-col items-center gap-1"
                  >
                    <motion.div
                      animate={
                        t.us && tapped
                          ? { scale: [1, 0.86, 1.04, 1] }
                          : { scale: 1 }
                      }
                      transition={{ duration: 0.5, ease: EASE }}
                      className={cn(
                        'rounded-[14px]',
                        t.us &&
                          'ring-2 ring-primary/0 transition-shadow duration-300',
                        t.us && tapped && 'shadow-glow ring-primary/60',
                      )}
                    >
                      {t.node}
                    </motion.div>
                    <span className="text-[9px] text-muted-foreground">
                      {t.label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 12, opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="absolute inset-x-6 bottom-6 z-20 flex items-center gap-2 rounded-full bg-neutral-900 py-2 pr-4 pl-2 text-white shadow-float dark:bg-neutral-100 dark:text-neutral-900"
            >
              <span className="grid size-5 place-items-center rounded-full bg-success text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
              <span className="font-medium text-[11px]">Saved to norsumi</span>
            </motion.div>
          )}
        </AnimatePresence>
      </PhoneFrame>
    </div>
  );
}

function IconTile({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid size-11 place-items-center rounded-[14px] text-white [&_svg]:size-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

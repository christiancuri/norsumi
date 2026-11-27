import { ArrowRight, ShieldCheck } from 'lucide-react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import { useRef } from 'react';
import { Link } from 'react-router';
import { AndroidIcon, GithubIcon } from 'src/components/brand/github-icon';
import { config } from 'src/config';

import { LibraryPreview } from './library-preview';
import { ctaPrimary, ctaSecondary, EASE } from './primitives';

const HEADLINE: { word: string; accent?: boolean }[] = [
  { word: 'Every' },
  { word: 'screenshot,' },
  { word: 'remembered.', accent: true },
];

export function Hero() {
  const reduce = useReducedMotion();
  const shotRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: shotRef,
    offset: ['start end', 'start 0.25'],
  });
  const rotateX = useTransform(scrollYProgress, [0, 1], [18, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);
  const glowOpacity = useTransform(scrollYProgress, [0, 1], [0.5, 1]);

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18, filter: 'blur(8px)' },
          animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
          transition: { duration: 0.9, ease: EASE, delay },
        };

  return (
    <section className="relative isolate overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32">
      <HeroBackdrop />

      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 text-center sm:px-6">
        <motion.a
          href="#open-source"
          {...rise(0.05)}
          className="group inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/70 py-1 pr-3 pl-1 text-[12.5px] text-muted-foreground shadow-[0_1px_2px_rgb(10_13_23/0.04)] backdrop-blur transition-colors hover:text-foreground"
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 font-medium text-[11px] text-background">
            <GithubIcon className="size-3" />
            Open source
          </span>
          Every line of it on GitHub
          <ArrowRight className="size-3.5 transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5" />
        </motion.a>

        <h1 className="mt-8 font-display text-[64px] leading-[0.9] sm:text-[96px] lg:text-[124px]">
          {HEADLINE.map(({ word, accent }, i) => (
            <span key={word}>
              {i === 2 && <br />}
              <motion.span
                className={
                  accent
                    ? 'inline-block bg-[linear-gradient(105deg,var(--primary)_10%,color-mix(in_oklab,var(--primary)_50%,#A8C6FF)_60%,var(--primary)_95%)] bg-clip-text pr-[0.1em] pb-[0.08em] text-transparent italic'
                    : 'inline-block'
                }
                {...(reduce
                  ? {}
                  : {
                      initial: { opacity: 0, y: 40, filter: 'blur(14px)' },
                      animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
                      transition: {
                        duration: 1.1,
                        ease: EASE,
                        delay: 0.15 + i * 0.12,
                      },
                    })}
              >
                {word}
              </motion.span>
              {i < HEADLINE.length - 1 && ' '}
            </span>
          ))}
        </h1>

        <motion.p
          {...rise(0.55)}
          className="mt-7 max-w-xl text-pretty text-[17px] text-muted-foreground leading-relaxed sm:text-[19px]"
        >
          norsumi quietly reads your screenshots, links and notes, then files
          them into a beautiful library, sorted by app and by topic. Find
          anything by what it meant, not where you saved it.
        </motion.p>

        <motion.div
          {...rise(0.68)}
          className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
        >
          <a
            href={config.androidUrl}
            className={`${ctaPrimary} w-full sm:w-auto`}
          >
            <AndroidIcon className="size-[18px]" />
            Download for Android
          </a>
          <Link to="/register" className={`${ctaSecondary} w-full sm:w-auto`}>
            Open the web app
            <ArrowRight className="size-4 text-muted-foreground transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        </motion.div>

        <motion.div
          {...rise(0.8)}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[12.5px] text-muted-foreground"
        >
          <ShieldCheck className="size-3.5 text-success" />
          <span>Open source</span>
          <Dot />
          <span>AGPL-3.0</span>
          <Dot />
          <span>Open source</span>
          <Dot />
          <span>Encrypted at rest</span>
        </motion.div>
      </div>

      {/* Product shot */}
      <div
        ref={shotRef}
        className="relative mx-auto mt-16 max-w-[1180px] px-3 sm:mt-20 sm:px-6"
        style={{ perspective: 2200 }}
      >
        <motion.div
          style={{ opacity: glowOpacity }}
          className="pointer-events-none absolute inset-x-[8%] top-[6%] -z-10 h-[70%] rounded-full bg-[radial-gradient(closest-side,rgb(46_107_255/0.45),transparent)] blur-3xl dark:bg-[radial-gradient(closest-side,rgb(91_143_255/0.42),transparent)]"
        />
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease: EASE, delay: 0.7 }}
        >
          <motion.div
            style={
              reduce
                ? undefined
                : { rotateX, scale, transformOrigin: 'center top' }
            }
          >
            <LibraryPreview />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Dot() {
  return <span className="size-[3px] rounded-full bg-muted-foreground/50" />;
}

function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_-5%,rgb(46_107_255/0.20),transparent_70%)] dark:bg-[radial-gradient(70%_55%_at_50%_-5%,rgb(91_143_255/0.22),transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--hairline)_1px,transparent_1px),linear-gradient(to_bottom,var(--hairline)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_30%,transparent_100%)]" />
      <div className="absolute top-[38%] -left-40 size-[480px] rounded-full bg-[radial-gradient(closest-side,rgb(217_70_239/0.10),transparent)] blur-2xl" />
      <div className="absolute top-[30%] -right-40 size-[520px] rounded-full bg-[radial-gradient(closest-side,rgb(14_165_233/0.12),transparent)] blur-2xl" />
      <div className="absolute inset-0">
        <div className="grain size-full" />
      </div>
    </div>
  );
}

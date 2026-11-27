import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router';
import { AndroidIcon } from 'src/components/brand/github-icon';
import { LogoMark } from 'src/components/brand/logo';
import { ItemCard } from 'src/components/library/item-card';
import { config } from 'src/config';

import { imageItems, Reveal } from './primitives';

const FLOATERS = [
  { className: '-left-10 top-10 w-44 -rotate-[10deg] lg:left-6', delay: 0 },
  {
    className: '-left-16 bottom-[-60px] w-40 rotate-[8deg] lg:left-24',
    delay: 1.4,
  },
  { className: '-right-12 top-6 w-40 rotate-[9deg] lg:right-8', delay: 0.7 },
  {
    className: '-right-10 bottom-[-70px] w-44 -rotate-[7deg] lg:right-28',
    delay: 2.1,
  },
];

export function FinalCta() {
  const reduce = useReducedMotion();
  const cards = imageItems.slice(4, 8);

  return (
    <section className="px-3 py-20 sm:px-6 sm:py-28">
      <Reveal>
        <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-brand px-6 py-20 text-center text-white shadow-[0_40px_120px_-40px_rgb(46_107_255/0.7)] sm:py-28">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_0%,rgb(255_255_255/0.22),transparent_60%)]" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.06)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
          <div className="absolute inset-0 -z-10">
            <div className="grain size-full" />
          </div>

          {/* Floating cards around the edges */}
          <div aria-hidden className="absolute inset-0 -z-10 hidden md:block">
            {FLOATERS.map((f, i) => {
              const item = cards[i];
              if (!item) return null;
              return (
                <motion.div
                  key={item.id}
                  className={`absolute opacity-80 ${f.className}`}
                  animate={reduce ? undefined : { y: [0, -12, 0] }}
                  transition={{
                    duration: 7,
                    delay: f.delay,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                  }}
                >
                  <ItemCard
                    item={item}
                    decorative
                    className="border-white/20 shadow-[0_30px_60px_-20px_rgb(0_0_20/0.6)]"
                  />
                </motion.div>
              );
            })}
          </div>

          <div className="relative mx-auto flex max-w-2xl flex-col items-center">
            <div className="relative mb-8">
              <span className="absolute inset-0 -m-6 rounded-full border border-white/15" />
              <span className="absolute inset-0 -m-12 rounded-full border border-white/10" />
              <span className="absolute inset-0 -m-20 rounded-full border border-white/5" />
              <LogoMark className="relative size-16 drop-shadow-[0_20px_30px_rgb(0_0_30/0.45)]" />
            </div>
            <h2 className="text-balance font-display text-[48px] leading-[0.95] sm:text-[72px]">
              Never lose a screenshot <em>again.</em>
            </h2>
            <p className="mt-5 max-w-md text-pretty text-[16px] text-white/75 leading-relaxed sm:text-[17px]">
              Your camera roll is already full of things worth keeping. Let
              norsumi remember them for you.
            </p>
            <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
              <Link
                to="/register"
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 font-medium text-[#2E6BFF] text-[15px] shadow-[0_12px_40px_-10px_rgb(0_0_30/0.6)] transition-[transform] duration-300 ease-out-expo hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto"
              >
                Start your library
                <ArrowRight className="size-4 transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5" />
              </Link>
              <a
                href={config.androidUrl}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 font-medium text-[15px] text-white backdrop-blur transition-[transform,background-color] duration-300 ease-out-expo hover:-translate-y-0.5 hover:bg-white/15 active:scale-[0.98] sm:w-auto"
              >
                <AndroidIcon className="size-[18px]" />
                Download for Android
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

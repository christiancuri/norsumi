import { Star } from 'lucide-react';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { GithubIcon } from 'src/components/brand/github-icon';
import { Wordmark } from 'src/components/brand/logo';
import { config } from 'src/config';
import { cn } from 'src/lib/utils';

import { EASE } from './primitives';

const LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'Security', href: '/#privacy' },
  { label: 'Open source', href: '/#open-source' },
];

export function LandingNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 12));

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="sticky top-0 z-50 px-3 pt-3 sm:px-5"
    >
      <nav
        className={cn(
          'mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full border pr-2 pl-4 transition-[background-color,border-color,box-shadow] duration-500 ease-out-expo sm:pl-5',
          scrolled
            ? 'glass border-border/70 shadow-[0_8px_30px_-16px_rgb(10_13_23/0.25)]'
            : 'border-transparent',
        )}
      >
        <Link
          to="/"
          aria-label="norsumi home"
          className="rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ring"
        >
          <Wordmark markClassName="size-7" />
        </Link>

        <div className="ml-6 hidden items-center gap-0.5 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-[13.5px] text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
          <a
            href={config.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13.5px] text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
          >
            <GithubIcon className="size-4" />
            GitHub
            <Star className="size-3.5 transition-[color,fill,transform] duration-300 group-hover:rotate-[72deg] group-hover:fill-amber-400 group-hover:text-amber-400" />
          </a>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            to="/login"
            className="rounded-full px-3.5 py-2 font-medium text-[13.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="inline-flex h-9 items-center rounded-full bg-foreground px-4 font-medium text-[13.5px] text-background shadow-[0_6px_20px_-8px_rgb(10_13_23/0.5)] transition-[transform,opacity] duration-300 ease-out-expo hover:-translate-y-px hover:opacity-90 active:scale-[0.97]"
          >
            Get started
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}

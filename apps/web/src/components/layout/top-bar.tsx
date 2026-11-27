import { Menu, Search, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { LogoMark } from 'src/components/brand/logo';
import { NewMenu } from 'src/components/capture/new-menu';
import { cn } from 'src/lib/utils';
import { useStats } from 'src/queries/items.queries';
import { useUiStore } from 'src/stores/ui.store';

import { UserMenu } from './user-menu';

export function TopBar() {
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const { data: stats } = useStats();
  const thinking = stats?.processing ?? 0;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'glass sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 transition-[border-color] sm:px-5 lg:px-8',
        scrolled ? 'border-border/70' : 'border-transparent',
      )}
    >
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setMobileNavOpen(true)}
        className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground lg:hidden"
      >
        <Menu className="size-5" />
      </button>
      <Link to="/library" className="flex items-center gap-2 lg:hidden">
        <LogoMark className="size-7" />
        <span className="font-semibold text-[16px] tracking-[-0.03em]">
          norsumi
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-2">
        <AnimatePresence>
          {thinking > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="shimmer hidden items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.07] px-2.5 py-1 font-medium text-[12px] text-primary sm:inline-flex"
            >
              <Sparkles className="size-3.5 animate-pulse" />
              Thinking about {thinking} {thinking === 1 ? 'item' : 'items'}
            </motion.span>
          )}
        </AnimatePresence>
        <button
          type="button"
          aria-label="Search"
          onClick={() => setPaletteOpen(true)}
          className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground lg:hidden"
        >
          <Search className="size-[18px]" />
        </button>
        <NewMenu className="hidden sm:inline-flex" />
        <UserMenu />
      </div>
    </header>
  );
}

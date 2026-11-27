import { Layers, Plus, Search, Settings, Star } from 'lucide-react';
import { NavLink } from 'react-router';
import { NewMenu } from 'src/components/capture/new-menu';
import { cn } from 'src/lib/utils';
import { useUiStore } from 'src/stores/ui.store';

const tab =
  'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium text-muted-foreground transition-colors';

export function MobileTabBar() {
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-30 border-border/70 border-t pb-[env(safe-area-inset-bottom)] sm:hidden">
      <div className="flex h-16 items-stretch px-2">
        <NavLink
          to="/library"
          end
          className={({ isActive }) => cn(tab, isActive && 'text-foreground')}
        >
          <Layers className="size-5" />
          Library
        </NavLink>
        <button
          type="button"
          className={tab}
          onClick={() => setPaletteOpen(true)}
        >
          <Search className="size-5" />
          Search
        </button>
        <div className="flex flex-1 items-center justify-center">
          <NewMenu
            trigger={
              <button
                type="button"
                aria-label="New"
                className="-mt-6 grid size-14 place-items-center rounded-[20px] bg-brand text-white shadow-glow ring-4 ring-background transition active:scale-95"
              >
                <Plus className="size-6" strokeWidth={2.4} />
              </button>
            }
          />
        </div>
        <NavLink
          to="/favorites"
          className={({ isActive }) => cn(tab, isActive && 'text-foreground')}
        >
          <Star className="size-5" />
          Favorites
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) => cn(tab, isActive && 'text-foreground')}
        >
          <Settings className="size-5" />
          Settings
        </NavLink>
      </div>
    </nav>
  );
}

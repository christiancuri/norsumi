import { motion } from 'motion/react';
import { NavLink } from 'react-router';
import { cn } from 'src/lib/utils';

const TABS = [
  { to: '/library', label: 'Everything' },
  { to: '/library/screenshot', label: 'Screenshots' },
  { to: '/library/link', label: 'Links' },
  { to: '/library/note', label: 'Notes' },
  { to: '/favorites', label: 'Favorites' },
];

export function KindTabs() {
  return (
    <div className="scrollbar-none -mx-3 flex gap-1 overflow-x-auto px-3 sm:mx-0 sm:px-0">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end
          className={({ isActive }) =>
            cn(
              'relative h-8 shrink-0 rounded-full px-3.5 font-medium text-[13px] text-muted-foreground leading-8 transition-colors hover:text-foreground',
              isActive && 'text-background hover:text-background',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="kind-tab"
                  className="absolute inset-0 -z-0 rounded-full bg-foreground"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative">{t.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

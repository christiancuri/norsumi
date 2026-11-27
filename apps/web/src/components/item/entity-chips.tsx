import type { EntityType, ItemEntity } from '@norsumi/common';
import {
  ArrowUpRight,
  AtSign,
  BookOpen,
  Building2,
  CalendarDays,
  Clapperboard,
  Globe,
  type LucideIcon,
  MapPin,
  Music2,
  Package,
  Sparkle,
  Tag,
  User,
} from 'lucide-react';
import { cn } from 'src/lib/utils';

const ICONS: Record<EntityType, LucideIcon> = {
  place: MapPin,
  person: User,
  account: AtSign,
  organization: Building2,
  product: Package,
  event: CalendarDays,
  book: BookOpen,
  movie: Clapperboard,
  music: Music2,
  url: Globe,
  date: CalendarDays,
  price: Tag,
  other: Sparkle,
};

const TINTS: Partial<Record<EntityType, string>> = {
  place: 'text-rose-500',
  account: 'text-sky-500',
  person: 'text-violet-500',
  url: 'text-primary',
  price: 'text-emerald-500',
  music: 'text-fuchsia-500',
};

/** Best link for an entity: the one the AI gave, else a derived one. */
export function entityHref(entity: ItemEntity) {
  if (entity.url) return entity.url;
  if (entity.type === 'place') {
    const q = [entity.name, entity.value].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }
  return null;
}

export function EntityChips({ entities }: { entities: ItemEntity[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {entities.map((entity, i) => {
        const Icon = ICONS[entity.type] ?? Sparkle;
        const href = entityHref(entity);
        const body = (
          <>
            <Icon
              className={cn(
                'size-3.5 shrink-0',
                TINTS[entity.type] ?? 'text-muted-foreground',
              )}
            />
            <span className="truncate font-medium">{entity.name}</span>
            {entity.value && entity.value !== entity.name && (
              <span className="hidden truncate text-muted-foreground sm:inline">
                {entity.value}
              </span>
            )}
            {href && (
              <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition group-hover:translate-x-px group-hover:-translate-y-px group-hover:text-foreground" />
            )}
          </>
        );
        const cls =
          'group inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-border/80 bg-surface px-3 text-[12.5px] transition';
        return href ? (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={entity.value ?? entity.name}
            className={cn(
              cls,
              'hover:border-border hover:bg-accent/60 hover:shadow-sm',
            )}
          >
            {body}
          </a>
        ) : (
          <span key={i} className={cls} title={entity.value ?? entity.name}>
            {body}
          </span>
        );
      })}
    </div>
  );
}

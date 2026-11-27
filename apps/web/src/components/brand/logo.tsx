import logoUrl from 'src/assets/logo.svg';
import { cn } from 'src/lib/utils';

/**
 * The elephant mark. Swap `src/assets/logo.svg` (and `public/favicon*`) to
 * rebrand; nothing else references the artwork directly.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt=""
      draggable={false}
      className={cn('size-8 shrink-0 select-none', className)}
    />
  );
}

export function Wordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      <span className="font-semibold text-[17px] tracking-[-0.03em]">
        norsumi
      </span>
    </span>
  );
}

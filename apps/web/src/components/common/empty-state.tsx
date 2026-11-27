import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { LogoMark } from 'src/components/brand/logo';
import { cn } from 'src/lib/utils';

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center',
        className,
      )}
    >
      <div className="relative mb-7">
        <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-primary/25 blur-3xl" />
        <LogoMark className="size-24 animate-float drop-shadow-[0_18px_28px_rgb(46_107_255/0.4)]" />
      </div>
      <h2 className="font-display text-[40px] text-balance leading-[1.05]">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-[15px] text-balance text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-7 flex gap-2">{action}</div>}
    </motion.div>
  );
}

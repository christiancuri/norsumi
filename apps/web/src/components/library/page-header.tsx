import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from 'src/lib/utils';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn('pt-6 pb-6 sm:pt-10 sm:pb-8', className)}
    >
      {eyebrow && (
        <div className="mb-2 text-[13px] text-muted-foreground">{eyebrow}</div>
      )}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <h1 className="font-display text-[44px] text-balance leading-[0.95] sm:text-[60px] [&_em]:text-primary">
          {title}
        </h1>
        {actions && (
          <div className="mb-1.5 ml-auto flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {description && (
        <p className="mt-3 max-w-2xl text-[15px] text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {children && <div className="mt-5">{children}</div>}
    </motion.header>
  );
}

import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type ComponentProps, type ReactNode, useState } from 'react';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { cn } from 'src/lib/utils';

export const inputClass = cn(
  'h-11 rounded-xl border-border bg-surface px-3.5 text-[14px] md:text-[14px]',
  'shadow-[0_1px_2px_rgb(10_13_23/0.04)] transition-[border-color,box-shadow] duration-200',
  'focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-ring/25',
  'aria-invalid:border-destructive/70 aria-invalid:ring-destructive/15 dark:bg-surface-2/60',
);

export function Field({
  id,
  label,
  error,
  hint,
  trailing,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  /** Right side of the label row (e.g. a strength meter). */
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="font-medium text-[13px]">
          {label}
        </Label>
        {trailing}
      </div>
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="error"
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-[12.5px] text-destructive"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[12.5px] text-muted-foreground"
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn(inputClass, 'pr-11', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

const STRENGTH_LABELS = ['Too short', 'Okay', 'Good', 'Strong', 'Excellent'];
const STRENGTH_COLORS = [
  'bg-destructive',
  'bg-warning',
  'bg-warning',
  'bg-success',
  'bg-success',
];

function strength(password: string) {
  if (password.length < 8) return 0;
  let score = 1;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

export function StrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const score = strength(password);
  return (
    <span className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
      <span className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={cn(
              'h-1 w-4 rounded-full bg-surface-2 transition-colors duration-300',
              score >= n && STRENGTH_COLORS[score],
              score === 0 && n === 1 && STRENGTH_COLORS[0],
            )}
          />
        ))}
      </span>
      {STRENGTH_LABELS[score]}
    </span>
  );
}

export function SubmitButton({
  loading,
  children,
}: {
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={cn(
        'group relative isolate inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary font-medium text-[14.5px] text-primary-foreground',
        'shadow-glow transition-[transform,box-shadow,opacity] duration-300 ease-out-expo',
        'before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-b before:from-white/20 before:to-transparent',
        'hover:-translate-y-px hover:shadow-[0_14px_40px_-10px_rgb(46_107_255/0.7)] active:translate-y-0 active:scale-[0.99]',
        'outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-80',
      )}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <>
          {children}
          <ArrowRight className="size-4 transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5" />
        </>
      )}
    </button>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-[12px] text-muted-foreground">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
      or
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
    </div>
  );
}

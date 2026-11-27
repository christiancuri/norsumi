import type { CategoryColor } from '@norsumi/common';

interface Swatch {
  /** Solid dot / accent (Tailwind 500). */
  dot: string;
  /** Chip background + text, light (100) and dark (950). */
  chip: string;
  /** Raw hex of the 500 shade, for gradients and inline styles. */
  hex: string;
}

// Literal class strings so Tailwind can see them.
export const CATEGORY_SWATCHES: Record<CategoryColor, Swatch> = {
  slate: {
    dot: 'bg-slate-500',
    chip: 'bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-300',
    hex: '#64748b',
  },
  red: {
    dot: 'bg-red-500',
    chip: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    hex: '#ef4444',
  },
  orange: {
    dot: 'bg-orange-500',
    chip: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    hex: '#f97316',
  },
  amber: {
    dot: 'bg-amber-500',
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    hex: '#f59e0b',
  },
  lime: {
    dot: 'bg-lime-500',
    chip: 'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300',
    hex: '#84cc16',
  },
  emerald: {
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    hex: '#10b981',
  },
  teal: {
    dot: 'bg-teal-500',
    chip: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
    hex: '#14b8a6',
  },
  sky: {
    dot: 'bg-sky-500',
    chip: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
    hex: '#0ea5e9',
  },
  blue: {
    dot: 'bg-blue-500',
    chip: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    hex: '#3b82f6',
  },
  violet: {
    dot: 'bg-violet-500',
    chip: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
    hex: '#8b5cf6',
  },
  fuchsia: {
    dot: 'bg-fuchsia-500',
    chip: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300',
    hex: '#d946ef',
  },
  rose: {
    dot: 'bg-rose-500',
    chip: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    hex: '#f43f5e',
  },
};

export const swatch = (color: CategoryColor) =>
  CATEGORY_SWATCHES[color] ?? CATEGORY_SWATCHES.slate;

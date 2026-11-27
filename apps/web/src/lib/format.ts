import {
  format,
  formatDistanceToNowStrict,
  isThisYear,
  isToday,
  isYesterday,
} from 'date-fns';

export function relativeDate(iso: string) {
  const date = new Date(iso);
  if (isToday(date)) {
    return formatDistanceToNowStrict(date, { addSuffix: true });
  }
  if (isYesterday(date)) return 'Yesterday';
  return format(date, isThisYear(date) ? 'MMM d' : 'MMM d, yyyy');
}

export function fullDate(iso: string) {
  return format(new Date(iso), "MMM d, yyyy 'at' HH:mm");
}

export function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function compact(n: number) {
  return new Intl.NumberFormat('en', { notation: 'compact' }).format(n);
}

/** "a while ago" style greeting for the library header. */
export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

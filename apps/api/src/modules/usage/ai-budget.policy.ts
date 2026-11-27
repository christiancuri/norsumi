/** UTC calendar day, YYYY-MM-DD. */
export function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function secondsUntilUtcMidnight(now: Date = new Date()): number {
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

export function budgetMessage(limit: number): string {
  return `Daily AI limit reached (${limit} items per day). Try again tomorrow.`;
}

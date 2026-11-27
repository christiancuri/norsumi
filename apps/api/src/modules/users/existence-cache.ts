/**
 * Remembers recently confirmed user ids for a short time, so write routes
 * can refuse tokens of deleted accounts without a DB hit on every request.
 * Only positives are cached; a purge forgets the id immediately.
 */
export class ExistenceCache {
  private readonly seen = new Map<string, number>();

  constructor(
    private readonly lookup: (id: string) => Promise<boolean>,
    private readonly ttlMs = 30_000,
    private readonly maxEntries = 10_000,
  ) {}

  async exists(id: string, now: number = Date.now()): Promise<boolean> {
    const until = this.seen.get(id);
    if (until !== undefined && until > now) return true;
    const found = await this.lookup(id);
    if (found) {
      if (this.seen.size >= this.maxEntries) this.seen.clear();
      this.seen.set(id, now + this.ttlMs);
    } else {
      this.seen.delete(id);
    }
    return found;
  }

  forget(id: string): void {
    this.seen.delete(id);
  }
}

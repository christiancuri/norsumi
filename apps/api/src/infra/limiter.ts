import { HTTPError } from "./http-errors.js";

/**
 * Minimal in-memory fixed-window counter, for limits that need a second key
 * on a route already limited by @fastify/rate-limit (e.g. login is limited
 * per IP+email by the plugin and per IP here). Per process.
 */
export class FixedWindowLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly maxKeys = 50_000,
  ) {}

  /** Counts a hit; returns seconds to wait when over the limit, else 0. */
  hit(key: string, now: number = Date.now()): number {
    let entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (this.hits.size >= this.maxKeys) this.sweep(now);
      entry = { count: 0, resetAt: now + this.windowMs };
      this.hits.set(key, entry);
    }
    entry.count++;
    return entry.count > this.max ? Math.ceil((entry.resetAt - now) / 1000) : 0;
  }

  /** Throws 429 (with Retry-After) when the key is over the limit. */
  consume(key: string, message: string): void {
    const retryAfter = this.hit(key);
    if (retryAfter > 0) {
      const error = new HTTPError(429, message);
      error.retryAfter = retryAfter;
      throw error;
    }
  }

  private sweep(now: number): void {
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) this.hits.delete(key);
    }
    // Still full (sustained attack): drop the oldest half.
    if (this.hits.size >= this.maxKeys) {
      let drop = Math.floor(this.hits.size / 2);
      for (const key of this.hits.keys()) {
        if (drop-- <= 0) break;
        this.hits.delete(key);
      }
    }
  }
}

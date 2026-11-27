import { describe, expect, it } from "vitest";

import { HTTPError } from "./http-errors.js";
import { FixedWindowLimiter } from "./limiter.js";

describe("FixedWindowLimiter", () => {
  it("allows max hits per window, then reports the wait", () => {
    const limiter = new FixedWindowLimiter(3, 60_000);
    const t = 1_000_000;
    expect([1, 2, 3].map(() => limiter.hit("ip", t))).toEqual([0, 0, 0]);
    expect(limiter.hit("ip", t + 10_000)).toBe(50);
    expect(limiter.hit("other", t)).toBe(0);
    expect(limiter.hit("ip", t + 60_000)).toBe(0);
  });

  it("throws 429 with Retry-After", () => {
    const limiter = new FixedWindowLimiter(1, 60_000);
    limiter.consume("k", "slow down");
    try {
      limiter.consume("k", "slow down");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPError);
      expect((error as HTTPError).statusCode).toBe(429);
      expect((error as HTTPError).retryAfter).toBeGreaterThan(0);
    }
  });

  it("bounds memory", () => {
    const limiter = new FixedWindowLimiter(1, 60_000, 10);
    for (let i = 0; i < 100; i++) limiter.hit(`k${i}`, 0);
    expect(
      (limiter as unknown as { hits: Map<string, unknown> }).hits.size,
    ).toBeLessThanOrEqual(10);
  });
});

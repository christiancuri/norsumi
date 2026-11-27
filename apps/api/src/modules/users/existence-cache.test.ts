import { describe, expect, it, vi } from "vitest";

import { ExistenceCache } from "./existence-cache.js";

describe("ExistenceCache", () => {
  it("caches positives for the TTL, then asks again", async () => {
    const lookup = vi.fn(async () => true);
    const cache = new ExistenceCache(lookup, 30_000);
    expect(await cache.exists("u", 0)).toBe(true);
    expect(await cache.exists("u", 29_999)).toBe(true);
    expect(lookup).toHaveBeenCalledTimes(1);
    await cache.exists("u", 30_000);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("never caches negatives and forgets purged users at once", async () => {
    let alive = true;
    const lookup = vi.fn(async () => alive);
    const cache = new ExistenceCache(lookup);
    expect(await cache.exists("u", 0)).toBe(true);
    alive = false;
    cache.forget("u");
    expect(await cache.exists("u", 1)).toBe(false);
    expect(await cache.exists("u", 2)).toBe(false);
    expect(lookup).toHaveBeenCalledTimes(3);
  });
});

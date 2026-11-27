import { describe, expect, it } from "vitest";

import { Semaphore } from "./semaphore.js";

describe("Semaphore", () => {
  it("never runs more than max tasks at once and runs them all", async () => {
    const sem = new Semaphore(2);
    let running = 0;
    let peak = 0;
    const task = async (i: number) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return i;
    };
    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((i) => sem.run(() => task(i))),
    );
    expect(results).toEqual([1, 2, 3, 4, 5]);
    expect(peak).toBe(2);
  });

  it("releases the slot when a task fails", async () => {
    const sem = new Semaphore(1);
    await expect(
      sem.run(async () => Promise.reject(new Error("x"))),
    ).rejects.toThrow("x");
    await expect(sem.run(async () => 1)).resolves.toBe(1);
  });
});

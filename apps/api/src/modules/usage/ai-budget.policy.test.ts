import { describe, expect, it } from "vitest";

import {
  budgetMessage,
  secondsUntilUtcMidnight,
  utcDay,
} from "./ai-budget.policy.js";

describe("AI budget policy", () => {
  it("buckets by UTC day", () => {
    expect(utcDay(new Date("2026-11-27T23:59:59Z"))).toBe("2026-11-27");
    expect(utcDay(new Date("2026-11-28T00:00:00Z"))).toBe("2026-11-28");
  });

  it("computes the wait until the budget resets", () => {
    expect(secondsUntilUtcMidnight(new Date("2026-11-27T23:59:00Z"))).toBe(60);
    expect(secondsUntilUtcMidnight(new Date("2026-11-27T00:00:00Z"))).toBe(
      86_400,
    );
  });

  it("explains the limit", () => {
    expect(budgetMessage(500)).toBe(
      "Daily AI limit reached (500 items per day). Try again tomorrow.",
    );
  });
});

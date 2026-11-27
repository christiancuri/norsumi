import { describe, expect, it } from "vitest";

import { classifyRevokedToken, REFRESH_GRACE_MS } from "./refresh-policy.js";

const now = new Date("2026-11-27T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

describe("classifyRevokedToken", () => {
  it("gives a grace answer to a token rotated moments ago", () => {
    expect(
      classifyRevokedToken({ revokedAt: ago(500), rotatedAt: ago(500) }, now),
    ).toBe("grace");
    expect(
      classifyRevokedToken(
        { revokedAt: ago(REFRESH_GRACE_MS), rotatedAt: ago(REFRESH_GRACE_MS) },
        now,
      ),
    ).toBe("grace");
  });

  it("treats reuse after the window as a replay", () => {
    expect(
      classifyRevokedToken(
        {
          revokedAt: ago(REFRESH_GRACE_MS + 1),
          rotatedAt: ago(REFRESH_GRACE_MS + 1),
        },
        now,
      ),
    ).toBe("reuse");
  });

  it("never graces a token revoked by logout or reuse detection", () => {
    expect(
      classifyRevokedToken({ revokedAt: ago(100), rotatedAt: null }, now),
    ).toBe("reuse");
    expect(classifyRevokedToken({ revokedAt: ago(100) }, now)).toBe("reuse");
  });

  it("tolerates a rotation stamped just after the caller read its clock", () => {
    const soon = new Date(now.getTime() + 15);
    expect(
      classifyRevokedToken({ revokedAt: soon, rotatedAt: soon }, now),
    ).toBe("grace");
    const far = new Date(now.getTime() + 60_000);
    expect(classifyRevokedToken({ revokedAt: far, rotatedAt: far }, now)).toBe(
      "reuse",
    );
  });
});

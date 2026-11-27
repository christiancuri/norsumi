import { describe, expect, it } from "vitest";

import { newNoteFields } from "./item-fields.js";

describe("newNoteFields", () => {
  const userId = "665f1c2b9a1e4b0012345678";
  const now = new Date("2026-11-27T10:00:00Z");

  it("stores the body as content (text) and leaves the annotation empty", () => {
    const fields = newNoteFields(userId, { text: "Buy oat milk" }, now);
    expect(fields.text).toBe("Buy oat milk");
    expect(fields.note).toBeNull();
    expect(fields).toMatchObject({
      kind: "note",
      status: "pending",
      capturedAt: now,
    });
    expect(fields.userId.toString()).toBe(userId);
  });

  it("keeps the client's capture time", () => {
    const capturedAt = new Date("2026-01-01T00:00:00Z");
    expect(
      newNoteFields(userId, { text: "x", capturedAt }, now).capturedAt,
    ).toBe(capturedAt);
  });
});

import { describe, expect, it } from "vitest";

import { deletionNeedsPassword } from "./account-deletion.js";
import { deleteMeBody } from "./auth.schemas.js";

describe("account deletion", () => {
  it("requires the password only for accounts that have one", () => {
    expect(deletionNeedsPassword({ passwordHash: "v1$argon2id$..." })).toBe(
      true,
    );
    expect(deletionNeedsPassword({ passwordHash: null })).toBe(false);
    expect(deletionNeedsPassword({})).toBe(false);
  });

  it("accepts an empty body (Google-only) or a password", () => {
    expect(deleteMeBody.parse(undefined)).toEqual({});
    expect(deleteMeBody.parse({})).toEqual({});
    expect(deleteMeBody.parse({ password: "secret123" })).toEqual({
      password: "secret123",
    });
    expect(() => deleteMeBody.parse({ password: 42 })).toThrow();
  });
});

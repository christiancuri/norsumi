import { describe, expect, it } from "vitest";

import {
  hashPassword,
  PASSWORD_VERSION,
  verifyDummy,
  verifyPassword,
} from "./password.js";

const pepper = "p".repeat(40);

describe("argon2id passwords", () => {
  it("stores a versioned argon2id PHC string with OWASP params", async () => {
    const stored = await hashPassword("correct horse battery", pepper);
    expect(stored.startsWith(`${PASSWORD_VERSION}$$argon2id$`)).toBe(true);
    expect(stored).toContain("m=19456,t=2,p=1");
    expect(stored).not.toContain(pepper);
  });

  it("verifies the right password only", async () => {
    const stored = await hashPassword("correct horse battery", pepper);
    expect(await verifyPassword(stored, "correct horse battery", pepper)).toBe(
      true,
    );
    expect(await verifyPassword(stored, "wrong password", pepper)).toBe(false);
  });

  it("salts every hash", async () => {
    const a = await hashPassword("same password", pepper);
    const b = await hashPassword("same password", pepper);
    expect(a).not.toBe(b);
  });

  it("fails with a different pepper", async () => {
    const stored = await hashPassword("correct horse battery", pepper);
    expect(
      await verifyPassword(stored, "correct horse battery", "q".repeat(40)),
    ).toBe(false);
  });

  it("rejects unknown versions and malformed hashes", async () => {
    const stored = await hashPassword("pw123456", pepper);
    expect(
      await verifyPassword(stored.replace(/^v1\$/, "v9$"), "pw123456", pepper),
    ).toBe(false);
    expect(await verifyPassword(stored.slice(3), "pw123456", pepper)).toBe(
      false,
    );
    expect(await verifyPassword("v1$garbage", "pw123456", pepper)).toBe(false);
  });

  it("runs a dummy verify without throwing", async () => {
    await expect(verifyDummy("anything", pepper)).resolves.toBeUndefined();
  });
});

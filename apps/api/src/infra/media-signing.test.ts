import { describe, expect, it } from "vitest";

import {
  MEDIA_URL_TTL_SECONDS,
  mediaExpiry,
  signedMediaPath,
  verifyMediaSignature,
} from "./media-signing.js";

const secret = "s".repeat(40);
const itemId = "665f1c2b9a1e4b0087654321";
const now = Date.UTC(2026, 10, 27, 12, 34, 56);

function parse(path: string) {
  const url = new URL(path, "https://api.example.com");
  return {
    path: url.pathname,
    exp: Number(url.searchParams.get("exp")),
    sig: url.searchParams.get("sig") ?? "",
  };
}

describe("media signing", () => {
  it("builds a verifiable path", () => {
    const { path, exp, sig } = parse(
      signedMediaPath(secret, itemId, "thumb", now),
    );
    expect(path).toBe(`/api/media/${itemId}/thumb`);
    expect(verifyMediaSignature(secret, itemId, "thumb", exp, sig, now)).toBe(
      true,
    );
  });

  it("is valid for at least 6 hours, bucketed to the hour", () => {
    const exp = mediaExpiry(now);
    expect(exp * 1000 - now).toBeGreaterThanOrEqual(
      MEDIA_URL_TTL_SECONDS * 1000,
    );
    expect(exp * 1000 - now).toBeLessThan(
      (MEDIA_URL_TTL_SECONDS + 3600) * 1000,
    );
    expect(exp % 3600).toBe(0);
    expect(mediaExpiry(now + 60_000)).toBe(exp);
  });

  it("rejects expired links", () => {
    const { exp, sig } = parse(signedMediaPath(secret, itemId, "full", now));
    expect(
      verifyMediaSignature(secret, itemId, "full", exp, sig, exp * 1000 + 1),
    ).toBe(false);
  });

  it("rejects another item, variant, expiry, secret or a tampered signature", () => {
    const { exp, sig } = parse(signedMediaPath(secret, itemId, "thumb", now));
    expect(verifyMediaSignature(secret, itemId, "full", exp, sig, now)).toBe(
      false,
    );
    expect(
      verifyMediaSignature(
        secret,
        "665f1c2b9a1e4b0000000000",
        "thumb",
        exp,
        sig,
        now,
      ),
    ).toBe(false);
    expect(
      verifyMediaSignature(secret, itemId, "thumb", exp + 3600, sig, now),
    ).toBe(false);
    expect(
      verifyMediaSignature("x".repeat(40), itemId, "thumb", exp, sig, now),
    ).toBe(false);
    const flipped = `${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`;
    expect(
      verifyMediaSignature(secret, itemId, "thumb", exp, flipped, now),
    ).toBe(false);
    expect(verifyMediaSignature(secret, itemId, "thumb", exp, "", now)).toBe(
      false,
    );
  });
});

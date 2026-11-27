import { createHmac, timingSafeEqual } from "node:crypto";

export const MEDIA_VARIANTS = ["thumb", "full"] as const;
export type MediaVariant = (typeof MEDIA_VARIANTS)[number];

/** URLs are valid for at least this long. */
export const MEDIA_URL_TTL_SECONDS = 6 * 60 * 60;
/**
 * Expiry is rounded up to this bucket so the same image keeps the same URL
 * for a while (lets clients and browsers cache it across list refreshes).
 */
const EXPIRY_BUCKET_SECONDS = 60 * 60;

function payload(itemId: string, variant: string, exp: number): string {
  return `norsumi/v1/media/${itemId}/${variant}/${exp}`;
}

export function mediaSignature(
  secret: string,
  itemId: string,
  variant: MediaVariant,
  exp: number,
): string {
  return createHmac("sha256", secret)
    .update(payload(itemId, variant, exp))
    .digest("base64url");
}

export function mediaExpiry(nowMs: number = Date.now()): number {
  const min = Math.floor(nowMs / 1000) + MEDIA_URL_TTL_SECONDS;
  return Math.ceil(min / EXPIRY_BUCKET_SECONDS) * EXPIRY_BUCKET_SECONDS;
}

/** Path + query of a signed media URL (prefix with PUBLIC_URL). */
export function signedMediaPath(
  secret: string,
  itemId: string,
  variant: MediaVariant,
  nowMs: number = Date.now(),
): string {
  const exp = mediaExpiry(nowMs);
  const sig = mediaSignature(secret, itemId, variant, exp);
  return `/api/media/${itemId}/${variant}?exp=${exp}&sig=${sig}`;
}

export function verifyMediaSignature(
  secret: string,
  itemId: string,
  variant: MediaVariant,
  exp: number,
  sig: string,
  nowMs: number = Date.now(),
): boolean {
  if (!Number.isSafeInteger(exp) || exp * 1000 < nowMs) return false;
  const expected = Buffer.from(
    mediaSignature(secret, itemId, variant, exp),
    "utf8",
  );
  const given = Buffer.from(sig, "utf8");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

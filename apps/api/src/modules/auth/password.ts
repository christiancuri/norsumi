import { type Algorithm, hash, type Options, verify } from "@node-rs/argon2";

/**
 * Password hashing: argon2id with a random 16-byte salt per hash (inside the
 * PHC string) and a server pepper passed as argon2's `secret`, so a database
 * leak alone is not enough to brute-force passwords. Stored as
 * `v1$<phc>`: the prefix names the pepper generation, so a future pepper
 * rotation can add `v2` and rehash on the next successful login.
 */

export const PASSWORD_VERSION = "v1";

// `Algorithm` is an ambient const enum; 2 is Argon2id.
const ARGON2ID = 2 as Algorithm;

/** OWASP minimum for argon2id: m=19 MiB, t=2, p=1. */
export const ARGON2_PARAMS = {
  algorithm: ARGON2ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

function options(pepper: string): Options {
  return { ...ARGON2_PARAMS, secret: Buffer.from(pepper, "utf8") };
}

export async function hashPassword(
  password: string,
  pepper: string,
): Promise<string> {
  const phc = await hash(password, options(pepper));
  return `${PASSWORD_VERSION}$${phc}`;
}

/** False for a wrong password, an unknown version or a malformed hash. */
export async function verifyPassword(
  stored: string,
  password: string,
  pepper: string,
): Promise<boolean> {
  const separator = stored.indexOf("$");
  if (separator <= 0) return false;
  const version = stored.slice(0, separator);
  const phc = stored.slice(separator + 1);
  if (version !== PASSWORD_VERSION) return false;
  try {
    return await verify(phc, password, options(pepper));
  } catch {
    return false;
  }
}

const dummyHashes = new Map<string, Promise<string>>();

/**
 * Burns the same work as a real verify, so unknown emails and password-less
 * (Google-only) accounts answer in about the same time as a wrong password.
 */
export async function verifyDummy(
  password: string,
  pepper: string,
): Promise<void> {
  let dummy = dummyHashes.get(pepper);
  if (!dummy) {
    dummy = hashPassword("norsumi-dummy-password", pepper);
    dummyHashes.set(pepper, dummy);
  }
  await verifyPassword(await dummy, password, pepper);
}

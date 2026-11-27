import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Envelope encryption (AES-256-GCM everywhere).
 *
 * - Each user has a random 32-byte data key (DEK) that encrypts their blobs.
 * - The DEK is stored wrapped by the server MASTER_KEY (never in plaintext).
 * - Sealed format (blobs and wrapped DEKs alike):
 *     0x01 ‖ nonce(12) ‖ ciphertext ‖ tag(16)
 * - AAD binds a ciphertext to where it belongs, so swapping blobs between
 *   items/variants (or DEKs between users) fails authentication.
 */

export const FORMAT_VERSION = 0x01;
export const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = 1 + NONCE_BYTES;
const ALGORITHM = "aes-256-gcm";

export class DecryptionError extends Error {
  constructor(message = "Ciphertext could not be authenticated") {
    super(message);
    this.name = "DecryptionError";
  }
}

function assertKey(key: Buffer): void {
  if (key.length !== KEY_BYTES) {
    throw new Error(`Key must be ${KEY_BYTES} bytes`);
  }
}

export function blobAad(itemId: string, variant: string): string {
  return `norsumi/v1/blob/${itemId}/${variant}`;
}

export function dekAad(userId: string): string {
  return `norsumi/v1/dek/${userId}`;
}

export function generateKey(): Buffer {
  return randomBytes(KEY_BYTES);
}

/** Encrypts `plaintext` into the sealed format. */
export function seal(key: Buffer, plaintext: Buffer, aad: string): Buffer {
  assertKey(key);
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, nonce, {
    authTagLength: TAG_BYTES,
  });
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([
    Buffer.from([FORMAT_VERSION]),
    nonce,
    ciphertext,
    cipher.getAuthTag(),
  ]);
}

/** Decrypts the sealed format; throws `DecryptionError` on any tampering. */
export function open(key: Buffer, sealed: Buffer, aad: string): Buffer {
  assertKey(key);
  if (sealed.length < HEADER_BYTES + TAG_BYTES) {
    throw new DecryptionError("Ciphertext too short");
  }
  if (sealed[0] !== FORMAT_VERSION) {
    throw new DecryptionError("Unknown ciphertext version");
  }
  const nonce = sealed.subarray(1, HEADER_BYTES);
  const tag = sealed.subarray(sealed.length - TAG_BYTES);
  const ciphertext = sealed.subarray(HEADER_BYTES, sealed.length - TAG_BYTES);
  try {
    const decipher = createDecipheriv(ALGORITHM, key, nonce, {
      authTagLength: TAG_BYTES,
    });
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new DecryptionError();
  }
}

export function wrapKey(
  masterKey: Buffer,
  dek: Buffer,
  userId: string,
): Buffer {
  assertKey(dek);
  return seal(masterKey, dek, dekAad(userId));
}

export function unwrapKey(
  masterKey: Buffer,
  wrapped: Buffer,
  userId: string,
): Buffer {
  const dek = open(masterKey, wrapped, dekAad(userId));
  assertKey(dek);
  return dek;
}

export function encryptBlob(
  dek: Buffer,
  plaintext: Buffer,
  itemId: string,
  variant: string,
): Buffer {
  return seal(dek, plaintext, blobAad(itemId, variant));
}

export function decryptBlob(
  dek: Buffer,
  sealed: Buffer,
  itemId: string,
  variant: string,
): Buffer {
  return open(dek, sealed, blobAad(itemId, variant));
}

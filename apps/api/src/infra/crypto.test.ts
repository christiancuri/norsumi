import { describe, expect, it } from "vitest";

import {
  DecryptionError,
  decryptBlob,
  encryptBlob,
  FORMAT_VERSION,
  generateKey,
  unwrapKey,
  wrapKey,
} from "./crypto.js";

const userId = "665f1c2b9a1e4b0012345678";
const itemId = "665f1c2b9a1e4b0087654321";

describe("envelope encryption", () => {
  it("wraps and unwraps a DEK with the master key", () => {
    const master = generateKey();
    const dek = generateKey();
    const wrapped = wrapKey(master, dek, userId);
    expect(wrapped[0]).toBe(FORMAT_VERSION);
    expect(wrapped.length).toBe(1 + 12 + 32 + 16);
    expect(unwrapKey(master, wrapped, userId).equals(dek)).toBe(true);
  });

  it("refuses to unwrap with another master key or for another user", () => {
    const master = generateKey();
    const wrapped = wrapKey(master, generateKey(), userId);
    expect(() => unwrapKey(generateKey(), wrapped, userId)).toThrow(
      DecryptionError,
    );
    expect(() => unwrapKey(master, wrapped, itemId)).toThrow(DecryptionError);
  });

  it("encrypts and decrypts a blob in the documented format", () => {
    const dek = generateKey();
    const plaintext = Buffer.from("\x89PNG fake image bytes");
    const sealed = encryptBlob(dek, plaintext, itemId, "full");
    expect(sealed[0]).toBe(0x01);
    expect(sealed.length).toBe(1 + 12 + plaintext.length + 16);
    expect(sealed.includes(plaintext)).toBe(false);
    expect(decryptBlob(dek, sealed, itemId, "full").equals(plaintext)).toBe(
      true,
    );
  });

  it("uses a fresh nonce for every encryption", () => {
    const dek = generateKey();
    const a = encryptBlob(dek, Buffer.from("same"), itemId, "full");
    const b = encryptBlob(dek, Buffer.from("same"), itemId, "full");
    expect(a.equals(b)).toBe(false);
  });

  it("detects tampering with ciphertext, tag, nonce or version", () => {
    const dek = generateKey();
    const sealed = encryptBlob(dek, Buffer.alloc(64, 7), itemId, "thumb");
    for (const index of [0, 5, 20, sealed.length - 1]) {
      const tampered = Buffer.from(sealed);
      tampered[index] = (tampered[index] as number) ^ 0x01;
      expect(() => decryptBlob(dek, tampered, itemId, "thumb")).toThrow(
        DecryptionError,
      );
    }
    expect(() =>
      decryptBlob(dek, sealed.subarray(0, 20), itemId, "thumb"),
    ).toThrow(DecryptionError);
  });

  it("binds blobs to their item and variant (AAD)", () => {
    const dek = generateKey();
    const sealed = encryptBlob(dek, Buffer.from("x"), itemId, "thumb");
    expect(() => decryptBlob(dek, sealed, itemId, "full")).toThrow(
      DecryptionError,
    );
    expect(() => decryptBlob(dek, sealed, userId, "thumb")).toThrow(
      DecryptionError,
    );
    expect(() => decryptBlob(generateKey(), sealed, itemId, "thumb")).toThrow(
      DecryptionError,
    );
  });

  it("rejects keys of the wrong size", () => {
    expect(() =>
      encryptBlob(Buffer.alloc(16), Buffer.from("x"), itemId, "full"),
    ).toThrow();
  });
});

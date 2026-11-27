import { describe, expect, it } from "vitest";

import { detectImageMime } from "./image.mime.js";

function ftyp(major: string, ...compatible: string[]): Buffer {
  const brands = [major, "\0\0\0\0", ...compatible].join("");
  const size = 8 + brands.length;
  const header = Buffer.alloc(4);
  header.writeUInt32BE(size);
  return Buffer.concat([
    header,
    Buffer.from("ftyp", "latin1"),
    Buffer.from(brands, "latin1"),
    Buffer.alloc(16),
  ]);
}

describe("detectImageMime", () => {
  it("detects accepted formats by magic bytes", () => {
    expect(
      detectImageMime(Buffer.from("89504e470d0a1a0a0000000d49484452", "hex")),
    ).toBe("image/png");
    expect(
      detectImageMime(Buffer.from("ffd8ffe000104a4649460001", "hex")),
    ).toBe("image/jpeg");
    expect(
      detectImageMime(Buffer.from("RIFF\x10\0\0\0WEBPVP8 ", "latin1")),
    ).toBe("image/webp");
    expect(detectImageMime(ftyp("heic", "mif1", "heic"))).toBe("image/heic");
    expect(detectImageMime(ftyp("mif1", "mif1", "heic"))).toBe("image/heic");
    expect(detectImageMime(ftyp("mif1", "mif1"))).toBe("image/heif");
  });

  it("rejects everything else, whatever the client claims", () => {
    expect(detectImageMime(ftyp("avif", "mif1", "avif"))).toBeNull();
    expect(
      detectImageMime(Buffer.from("GIF89a\0\0\0\0\0\0\0", "latin1")),
    ).toBeNull();
    expect(
      detectImageMime(Buffer.from("%PDF-1.7 ......", "latin1")),
    ).toBeNull();
    expect(
      detectImageMime(Buffer.from("<svg xmlns='x'>", "latin1")),
    ).toBeNull();
    expect(detectImageMime(Buffer.alloc(4))).toBeNull();
  });
});

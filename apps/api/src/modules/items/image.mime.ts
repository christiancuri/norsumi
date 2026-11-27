import { ACCEPTED_IMAGE_MIME_TYPES } from "@norsumi/common";

export type ImageMime = (typeof ACCEPTED_IMAGE_MIME_TYPES)[number];

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis"]);
const HEIF_BRANDS = new Set(["mif1", "msf1", "mif2"]);

/**
 * Detects the image type from magic bytes. The client's Content-Type is
 * never trusted. Returns null for anything we do not accept.
 */
export function detectImageMime(buf: Buffer): ImageMime | null {
  if (buf.length < 12) return null;
  if (
    buf[0] === 0x89 &&
    buf
      .subarray(1, 8)
      .equals(Buffer.from([0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return "image/jpeg";
  if (
    buf.toString("latin1", 0, 4) === "RIFF" &&
    buf.toString("latin1", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buf.toString("latin1", 4, 8) === "ftyp") {
    const major = buf.toString("latin1", 8, 12);
    if (HEIC_BRANDS.has(major)) return "image/heic";
    if (major === "avif" || major === "avis") return null;
    // Compatible brands list: decide by what it contains.
    const boxSize = buf.readUInt32BE(0);
    const end = Math.min(boxSize, buf.length, 64);
    const brands: string[] = [];
    for (let i = 16; i + 4 <= end; i += 4)
      brands.push(buf.toString("latin1", i, i + 4));
    if (brands.some((b) => b === "avif" || b === "avis")) return null;
    if (brands.some((b) => HEIC_BRANDS.has(b))) return "image/heic";
    if (HEIF_BRANDS.has(major) || brands.some((b) => HEIF_BRANDS.has(b))) {
      return "image/heif";
    }
  }
  return null;
}

import decodeHeic from "heic-decode";
import sharp, { type Sharp } from "sharp";

import { Semaphore } from "../../infra/semaphore.js";
import { heifDimensions } from "./heif-size.js";
import type { ImageMime } from "./image.mime.js";

export { detectImageMime, type ImageMime } from "./image.mime.js";

export const THUMB_MAX_WIDTH = 640;
export const VISION_MAX_SIDE = 1600;

export class ImageDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageDecodeError";
  }
}

// Screenshots can be huge (scrolling captures): allow up to ~100 MP.
export const MAX_PIXELS = 100_000_000;
const SHARP_OPTIONS = {
  limitInputPixels: MAX_PIXELS,
  failOn: "error",
} as const;
/** HEVC decoding (WASM) is memory-heavy: at most two at a time. */
const heicDecodes = new Semaphore(2);

function isHeif(mime: ImageMime): boolean {
  return mime === "image/heic" || mime === "image/heif";
}

/**
 * Opens the image with sharp. Sharp's prebuilt libvips has no HEVC decoder,
 * so HEIC/HEIF goes through libheif (WASM) into raw RGBA first.
 */
async function open(buffer: Buffer, mime: ImageMime): Promise<Sharp> {
  if (!isHeif(mime)) {
    const image = sharp(buffer, SHARP_OPTIONS);
    await image.metadata();
    return image.rotate();
  }
  try {
    const image = sharp(buffer, SHARP_OPTIONS);
    await image.metadata();
    // Metadata may parse while decoding still fails: prove it decodes.
    await image.clone().resize(8).raw().toBuffer();
    return image.rotate();
  } catch {
    // Refuse decompression bombs before the (memory-hungry) decoder runs.
    const declared = heifDimensions(buffer);
    if (!declared) {
      throw new ImageDecodeError("This HEIC image has no readable size.");
    }
    if (declared.width * declared.height > MAX_PIXELS) {
      throw new ImageDecodeError(
        "This image is too large (over 100 megapixels).",
      );
    }
    try {
      const decoded = await heicDecodes.run(() => decodeHeic({ buffer }));
      return sharp(
        Buffer.from(
          decoded.data.buffer,
          decoded.data.byteOffset,
          decoded.data.byteLength,
        ),
        {
          raw: { width: decoded.width, height: decoded.height, channels: 4 },
          limitInputPixels: SHARP_OPTIONS.limitInputPixels,
        },
      );
    } catch {
      throw new ImageDecodeError(
        "This HEIC image could not be decoded. Export it as JPEG or PNG and upload again.",
      );
    }
  }
}

export interface ProcessedImage {
  width: number;
  height: number;
  dominantColor: string;
  thumb: Buffer;
  /**
   * What is stored as `full`: the original bytes, except HEIC/HEIF which
   * browsers cannot show and is converted to a high-quality JPEG.
   */
  full: { bytes: Buffer; mime: ImageMime };
}

export const HEIC_JPEG_QUALITY = 90;

function hex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");
}

/** Dimensions (after EXIF rotation), dominant color and a WebP thumbnail. */
export async function processImage(
  buffer: Buffer,
  mime: ImageMime,
): Promise<ProcessedImage> {
  let image: Sharp;
  try {
    image = await open(buffer, mime);
  } catch (error) {
    if (error instanceof ImageDecodeError) throw error;
    throw new ImageDecodeError("The file is not a readable image");
  }
  const { data: thumb, info } = await image
    .clone()
    .resize({ width: THUMB_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer({ resolveWithObject: true });
  const small = await image
    .clone()
    .resize(64, 64, { fit: "inside" })
    // Raw (HEIC) input would yield raw output: encode it.
    .png()
    .toBuffer();
  const { dominant } = await sharp(small).stats();
  // Oriented full-size dimensions (raw HEIC input has no EXIF to apply).
  const meta = await image.metadata();
  const width = meta.autoOrient?.width ?? meta.width ?? info.width;
  const height = meta.autoOrient?.height ?? meta.height ?? info.height;
  const full = isHeif(mime)
    ? {
        bytes: await image
          .clone()
          .jpeg({ quality: HEIC_JPEG_QUALITY, mozjpeg: true })
          .toBuffer(),
        mime: "image/jpeg" as const,
      }
    : { bytes: buffer, mime };
  return {
    width,
    height,
    dominantColor: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
    thumb,
    full,
  };
}

/** Downscaled JPEG for the vision model (max 1600px on the long side). */
export async function toVisionJpeg(
  buffer: Buffer,
  mime: ImageMime,
): Promise<Buffer> {
  const image = await open(buffer, mime);
  return image
    .resize({
      width: VISION_MAX_SIDE,
      height: VISION_MAX_SIDE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

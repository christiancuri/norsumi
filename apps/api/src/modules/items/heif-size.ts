/**
 * Largest image size declared in a HEIF file's `ispe` (image spatial
 * extents) properties, read without decoding anything. Used to refuse
 * decompression bombs before handing the file to the HEVC decoder.
 */
export function heifDimensions(
  buf: Buffer,
): { width: number; height: number } | null {
  let best: { width: number; height: number } | null = null;
  const marker = Buffer.from("ispe", "latin1");
  for (
    let i = buf.indexOf(marker, 4);
    i !== -1;
    i = buf.indexOf(marker, i + 4)
  ) {
    // Box: size(4) "ispe" version+flags(4) width(4) height(4) = 20 bytes.
    const start = i - 4;
    if (start < 0 || start + 20 > buf.length || buf.readUInt32BE(start) !== 20)
      continue;
    const width = buf.readUInt32BE(i + 8);
    const height = buf.readUInt32BE(i + 12);
    if (width === 0 || height === 0) continue;
    if (!best || width * height > best.width * best.height)
      best = { width, height };
  }
  return best;
}

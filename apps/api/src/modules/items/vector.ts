/** Cosine similarity; 0 for mismatched or zero vectors. */
export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] as number;
    const y = b[i] as number;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

export interface RankInput {
  id: string;
  /** Normalized keyword score in [0, 1], 0 when no keyword match. */
  keyword: number;
  /** Cosine similarity, null when unknown. */
  semantic: number | null;
}

export const KEYWORD_WEIGHT = 0.4;
export const SEMANTIC_WEIGHT = 0.6;
const SEMANTIC_MIN = 0.3;
const SEMANTIC_RELATIVE = 0.8;

/**
 * Hybrid ranking. Keyword matches always qualify; semantic-only matches
 * must clear an absolute floor and be close to the best semantic score, so
 * small libraries do not return everything for every query.
 */
export function rankHybrid(
  candidates: RankInput[],
): Array<RankInput & { score: number }> {
  const best = Math.max(0, ...candidates.map((c) => c.semantic ?? 0));
  const floor = Math.max(SEMANTIC_MIN, best * SEMANTIC_RELATIVE);
  return candidates
    .filter((c) => c.keyword > 0 || (c.semantic ?? 0) >= floor)
    .map((c) => ({
      ...c,
      score:
        KEYWORD_WEIGHT * c.keyword +
        SEMANTIC_WEIGHT * Math.max(0, c.semantic ?? 0),
    }))
    .sort((a, b) => b.score - a.score);
}

/** Stored/compared embedding size (Matryoshka models allow truncation). */
export const EMBEDDING_DIMS = 1024;

/**
 * Brings a vector to `dims`: longer vectors are truncated (valid for
 * Matryoshka embeddings) and L2-renormalized; shorter ones are kept.
 */
export function fitDimensions(
  vector: number[],
  dims = EMBEDDING_DIMS,
): number[] {
  if (vector.length <= dims) return vector;
  const cut = vector.slice(0, dims);
  const norm = Math.sqrt(cut.reduce((sum, x) => sum + x * x, 0));
  return norm === 0 ? cut : cut.map((x) => x / norm);
}

/** Float32 little-endian bytes: 4 bytes per dimension. */
export function toFloat32Buffer(vector: ArrayLike<number>): Buffer {
  const out = Buffer.alloc(vector.length * 4);
  for (let i = 0; i < vector.length; i++)
    out.writeFloatLE(vector[i] as number, i * 4);
  return out;
}

/**
 * Reads a stored embedding: Float32 bytes (Buffer, Uint8Array or a BSON
 * Binary from a lean query) or a legacy `number[]`. Null if unusable.
 */
export function fromStoredVector(
  value: unknown,
): Float32Array | number[] | null {
  if (Array.isArray(value))
    return value.length > 0 ? (value as number[]) : null;
  let bytes: Uint8Array | null = null;
  if (value instanceof Uint8Array) bytes = value;
  else if (
    typeof value === "object" &&
    value !== null &&
    "buffer" in value &&
    (value as { buffer: unknown }).buffer instanceof Uint8Array
  ) {
    bytes = (value as { buffer: Uint8Array }).buffer;
  }
  if (!bytes || bytes.length === 0 || bytes.length % 4 !== 0) return null;
  // Copy into an aligned buffer (the source offset may not be 4-aligned).
  const aligned = new Uint8Array(bytes.length);
  aligned.set(bytes);
  return new Float32Array(aligned.buffer);
}

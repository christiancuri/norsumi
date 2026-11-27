import { describe, expect, it } from "vitest";

import {
  cosine,
  fitDimensions,
  fromStoredVector,
  rankHybrid,
  toFloat32Buffer,
} from "./vector.js";

describe("cosine", () => {
  it("handles identical, orthogonal and degenerate vectors", () => {
    expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBe(0);
    expect(cosine([0, 0], [1, 1])).toBe(0);
    expect(cosine([1], [1, 2])).toBe(0);
  });
});

describe("rankHybrid", () => {
  it("keeps keyword hits, filters weak semantic-only hits and sorts", () => {
    const ranked = rankHybrid([
      { id: "kw", keyword: 1, semantic: 0.2 },
      { id: "sem", keyword: 0, semantic: 0.7 },
      { id: "weak", keyword: 0, semantic: 0.35 },
      { id: "both", keyword: 0.8, semantic: 0.65 },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["both", "kw", "sem"]);
  });

  it("works without semantic scores (keyword fallback)", () => {
    const ranked = rankHybrid([
      { id: "a", keyword: 0.5, semantic: null },
      { id: "b", keyword: 0, semantic: null },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("embedding storage", () => {
  it("round-trips Float32 bytes (Buffer, offset Uint8Array, BSON-like Binary)", () => {
    const vector = [0.5, -0.25, 0.125, 1];
    const buf = toFloat32Buffer(vector);
    expect(buf.length).toBe(16);
    expect([...(fromStoredVector(buf) ?? [])]).toEqual(vector);
    const shifted = new Uint8Array(17);
    shifted.set(buf, 1);
    expect([...(fromStoredVector(shifted.subarray(1)) ?? [])]).toEqual(vector);
    expect([
      ...(fromStoredVector({ buffer: new Uint8Array(buf) }) ?? []),
    ]).toEqual(vector);
  });

  it("accepts legacy number[] and rejects garbage", () => {
    expect(fromStoredVector([1, 2])).toEqual([1, 2]);
    expect(fromStoredVector([])).toBeNull();
    expect(fromStoredVector(Buffer.alloc(3))).toBeNull();
    expect(fromStoredVector(null)).toBeNull();
    expect(fromStoredVector("x")).toBeNull();
  });

  it("truncates and renormalizes oversized vectors", () => {
    const fitted = fitDimensions([3, 4, 12], 2);
    expect(fitted).toEqual([0.6, 0.8]);
    expect(fitDimensions([1, 2], 4)).toEqual([1, 2]);
  });

  it("keeps cosine ranking after Float32 storage", () => {
    const a = [0.1, 0.7, -0.2];
    const b = [0.12, 0.69, -0.18];
    const stored = fromStoredVector(toFloat32Buffer(b)) ?? [];
    expect(cosine(a, stored)).toBeCloseTo(cosine(a, b), 5);
  });
});

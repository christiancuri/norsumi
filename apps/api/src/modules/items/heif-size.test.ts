import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { heifDimensions } from "./heif-size.js";

function ispe(width: number, height: number): Buffer {
  const box = Buffer.alloc(20);
  box.writeUInt32BE(20, 0);
  box.write("ispe", 4, "latin1");
  box.writeUInt32BE(width, 12);
  box.writeUInt32BE(height, 16);
  return box;
}

describe("heifDimensions", () => {
  it("returns the largest declared image (grid tiles vs full image)", () => {
    const file = Buffer.concat([
      Buffer.from("....ftypheic"),
      ispe(512, 512),
      ispe(4032, 3024),
      ispe(512, 512),
    ]);
    expect(heifDimensions(file)).toEqual({ width: 4032, height: 3024 });
  });

  it("reports bomb-sized declarations so they can be refused", () => {
    const dims = heifDimensions(
      Buffer.concat([Buffer.from("....ftypheic"), ispe(60_000, 60_000)]),
    );
    expect((dims?.width ?? 0) * (dims?.height ?? 0)).toBeGreaterThan(
      100_000_000,
    );
  });

  it("ignores malformed boxes and files without ispe", () => {
    const bad = ispe(10, 10);
    bad.writeUInt32BE(99, 0);
    expect(
      heifDimensions(Buffer.concat([Buffer.from("....ftypheic"), bad])),
    ).toBeNull();
    expect(
      heifDimensions(Buffer.from("....ftypheic no boxes here")),
    ).toBeNull();
  });

  it("reads a real (synthetic, tiled) HEIC file", () => {
    const file = readFileSync(
      new URL("./__fixtures__/sample.heic", import.meta.url),
    );
    expect(heifDimensions(file)).toEqual({ width: 600, height: 1300 });
  });
});

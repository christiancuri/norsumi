import { describe, expect, it } from "vitest";

import { prunableCategoryIds } from "./prune.js";

const ai = (id: string, parentId: string | null = null) => ({
  id,
  parentId,
  origin: "ai" as const,
});
const user = (id: string, parentId: string | null = null) => ({
  id,
  parentId,
  origin: "user" as const,
});

describe("prunableCategoryIds", () => {
  it("removes an empty AI child and then its now-empty AI root", () => {
    expect(
      prunableCategoryIds([ai("web"), ai("prog", "web")], new Set()),
    ).toEqual(expect.arrayContaining(["web", "prog"]));
  });

  it("keeps categories that still hold items (archived included by the caller)", () => {
    expect(
      prunableCategoryIds([ai("web"), ai("prog", "web")], new Set(["prog"])),
    ).toEqual([]);
  });

  it("keeps an AI root while another child remains", () => {
    const ids = prunableCategoryIds(
      [ai("web"), ai("prog", "web"), ai("ai", "web")],
      new Set(["ai"]),
    );
    expect(ids).toEqual(["prog"]);
  });

  it("never removes user categories, and keeps an AI root with a user child", () => {
    expect(
      prunableCategoryIds(
        [user("mine"), ai("web"), user("keep", "web")],
        new Set(),
      ),
    ).toEqual([]);
  });

  it("removes an empty AI child under a user root but keeps the root", () => {
    expect(
      prunableCategoryIds([user("root"), ai("child", "root")], new Set()),
    ).toEqual(["child"]);
  });

  it("treats documents without origin as AI", () => {
    expect(
      prunableCategoryIds([{ id: "old", parentId: null }], new Set()),
    ).toEqual(["old"]);
  });
});

import { describe, expect, it } from "vitest";

import { listItemsQuery } from "./items.schemas.js";

describe("listItemsQuery", () => {
  it("accepts one kind, a comma list or repeated params", () => {
    expect(listItemsQuery.parse({ kind: "link" }).kind).toEqual(["link"]);
    expect(listItemsQuery.parse({ kind: "screenshot,image" }).kind).toEqual([
      "screenshot",
      "image",
    ]);
    expect(listItemsQuery.parse({ kind: ["note", "link,note"] }).kind).toEqual([
      "note",
      "link",
    ]);
    expect(listItemsQuery.parse({}).kind).toBeUndefined();
  });

  it("rejects unknown kinds", () => {
    expect(() => listItemsQuery.parse({ kind: "screenshot,video" })).toThrow();
    expect(() => listItemsQuery.parse({ kind: "," })).toThrow();
  });

  it("parses booleans strictly and applies defaults", () => {
    const q = listItemsQuery.parse({ favorite: "false" });
    expect(q.favorite).toBe(false);
    expect(q.archived).toBe(false);
    expect(q.includeChildren).toBe(true);
    expect(() => listItemsQuery.parse({ favorite: "yes" })).toThrow();
  });
});

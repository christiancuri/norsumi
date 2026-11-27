import { describe, expect, it } from "vitest";

import {
  AnalysisParseError,
  analysisJsonSchema,
  MAX_TITLE,
  parseAnalysis,
} from "./analysis.schema.js";

const valid = {
  title: "Bráz Elettrica — pizzaria em Pinheiros",
  summary: "Perfil da pizzaria. Pizzas napolitanas.",
  source: "Instagram",
  categoryPath: [
    {
      id: "665f1c2b9a1e4b0012345678",
      name: "Instagram",
      emoji: "📸",
      color: "fuchsia",
      description: "Posts",
    },
    {
      id: null,
      name: "Restaurants",
      emoji: "🍽️",
      color: "orange",
      description: "Places to eat",
    },
  ],
  tags: ["Pizza", "#napolitana", "pizza", "são paulo"],
  entities: [
    {
      type: "place",
      name: "Bráz Elettrica",
      value: "Pinheiros, São Paulo",
      url: "https://evil.example",
    },
    {
      type: "account",
      name: "@brazelettrica",
      value: null,
      url: "https://instagram.com/brazelettrica",
    },
    {
      type: "weird",
      name: "Something",
      value: null,
      url: "javascript:alert(1)",
    },
    { type: "account", name: "", value: null, url: null },
  ],
  text: "  Bráz Elettrica\nPizzaria  ",
};

describe("analysis JSON schema", () => {
  it("is strict: every property required, no extras", () => {
    const schema = analysisJsonSchema({ includeText: true });
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(Object.keys(schema.properties));
    expect(schema.required).toContain("text");
    expect(analysisJsonSchema({ includeText: false }).required).not.toContain(
      "text",
    );
  });
});

describe("parseAnalysis", () => {
  it("normalizes a valid answer", () => {
    const result = parseAnalysis(JSON.stringify(valid));
    expect(result.title).toBe(valid.title);
    expect(result.source).toBe("Instagram");
    expect(result.categoryPath).toHaveLength(2);
    expect(result.categoryPath[0]?.id).toBe("665f1c2b9a1e4b0012345678");
    expect(result.tags).toEqual(["pizza", "napolitana", "são paulo"]);
    expect(result.text).toBe("Bráz Elettrica\nPizzaria");
  });

  it("derives Maps URLs for places and drops unsafe URLs", () => {
    const { entities } = parseAnalysis(JSON.stringify(valid));
    expect(entities).toHaveLength(3);
    expect(entities[0]?.url).toBe(
      "https://www.google.com/maps/search/?api=1&query=Br%C3%A1z%20Elettrica%2C%20Pinheiros%2C%20S%C3%A3o%20Paulo",
    );
    expect(entities[1]?.url).toBe("https://instagram.com/brazelettrica");
    expect(entities[2]).toMatchObject({ type: "other", url: null });
  });

  it("keeps only https entity URLs", () => {
    const entities = [
      { type: "url", name: "a", value: null, url: "http://example.com" },
      { type: "url", name: "b", value: null, url: "https://example.com/b" },
      { type: "url", name: "c", value: null, url: "data:text/html,x" },
    ];
    const result = parseAnalysis(JSON.stringify({ ...valid, entities }));
    expect(result.entities.map((e) => e.url)).toEqual([
      null,
      "https://example.com/b",
      null,
    ]);
  });

  it("truncates long titles", () => {
    const result = parseAnalysis(
      JSON.stringify({ ...valid, title: "word ".repeat(50) }),
    );
    expect(result.title.length).toBeLessThanOrEqual(MAX_TITLE);
    expect(result.title.endsWith("…")).toBe(true);
  });

  it("accepts fenced JSON and missing optional parts", () => {
    const result = parseAnalysis(
      `\`\`\`json\n${JSON.stringify({ title: "Note", summary: "", source: null, categoryPath: "bad", tags: [], entities: null })}\n\`\`\``,
    );
    expect(result.title).toBe("Note");
    expect(result.categoryPath).toEqual([]);
    expect(result.entities).toEqual([]);
    expect(result.text).toBeNull();
  });

  it("moves emoji out of category names", () => {
    const path = [
      {
        id: null,
        name: "📸 Instagram",
        emoji: "",
        color: "rose",
        description: "",
      },
      {
        id: null,
        name: "Restaurants 🍽️",
        emoji: "🍕",
        color: "orange",
        description: "",
      },
    ];
    const result = parseAnalysis(
      JSON.stringify({ ...valid, categoryPath: path }),
    );
    expect(result.categoryPath.map((c) => [c.name, c.emoji])).toEqual([
      ["Instagram", "📸"],
      ["Restaurants", "🍕"],
    ]);
  });

  it("caps the category path at two levels", () => {
    const path = [
      valid.categoryPath[0],
      valid.categoryPath[1],
      valid.categoryPath[1],
    ];
    expect(
      parseAnalysis(JSON.stringify({ ...valid, categoryPath: path }))
        .categoryPath,
    ).toHaveLength(2);
  });

  it("rejects invalid JSON and answers without a title", () => {
    expect(() => parseAnalysis("not json")).toThrow(AnalysisParseError);
    expect(() =>
      parseAnalysis(JSON.stringify({ ...valid, title: "" })),
    ).toThrow(AnalysisParseError);
    expect(() => parseAnalysis("[]")).toThrow(AnalysisParseError);
  });
});

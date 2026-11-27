import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  AnalysisParseError,
  analysisSchema,
  imageAnalysisSchema,
  MAX_TITLE,
  normalizeAnalysis,
  type RawAnalysis,
} from "./analysis.schema.js";

const valid: RawAnalysis = {
  title: "Joe's Pizza — slice shop in Greenwich Village",
  summary: "Profile of the pizzeria. Classic New York slices.",
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
  tags: ["Pizza", "#new york", "pizza", "slices"],
  entities: [
    {
      type: "place",
      name: "Joe's Pizza",
      value: "7 Carmine St, New York",
      url: "https://evil.example",
    },
    {
      type: "account",
      name: "@joespizza",
      value: null,
      url: "https://instagram.com/joespizza",
    },
    { type: "url", name: "Menu", value: null, url: "javascript:alert(1)" },
    { type: "account", name: "  ", value: null, url: null },
  ],
  text: "  Joe's Pizza\nSince 1975  ",
};

describe("structured output schema", () => {
  it("is strict: every property required, no extra properties", () => {
    for (const schema of [analysisSchema, imageAnalysisSchema]) {
      const json = z.toJSONSchema(schema) as {
        additionalProperties: boolean;
        required: string[];
        properties: Record<string, unknown>;
      };
      expect(json.additionalProperties).toBe(false);
      expect([...json.required].sort()).toEqual(
        Object.keys(json.properties).sort(),
      );
    }
    const image = z.toJSONSchema(imageAnalysisSchema) as { required: string[] };
    expect(image.required).toContain("text");
    expect(
      (z.toJSONSchema(analysisSchema) as { required: string[] }).required,
    ).not.toContain("text");
  });

  it("accepts a valid answer and rejects off-schema enums", () => {
    expect(imageAnalysisSchema.safeParse(valid).success).toBe(true);
    const bad = {
      ...valid,
      entities: [{ type: "weird", name: "x", value: null, url: null }],
    };
    expect(analysisSchema.safeParse(bad).success).toBe(false);
  });
});

describe("normalizeAnalysis", () => {
  it("normalizes a valid answer", () => {
    const result = normalizeAnalysis(valid);
    expect(result.title).toBe(valid.title);
    expect(result.source).toBe("Instagram");
    expect(result.categoryPath).toHaveLength(2);
    expect(result.categoryPath[0]?.id).toBe("665f1c2b9a1e4b0012345678");
    expect(result.tags).toEqual(["pizza", "new york", "slices"]);
    expect(result.text).toBe("Joe's Pizza\nSince 1975");
  });

  it("derives Maps URLs for places and keeps only https links", () => {
    const { entities } = normalizeAnalysis(valid);
    expect(entities).toHaveLength(3);
    expect(entities[0]?.url).toBe(
      "https://www.google.com/maps/search/?api=1&query=Joe's%20Pizza%2C%207%20Carmine%20St%2C%20New%20York",
    );
    expect(entities[1]?.url).toBe("https://instagram.com/joespizza");
    expect(entities[2]?.url).toBeNull();
    const http = normalizeAnalysis({
      ...valid,
      entities: [
        { type: "url", name: "a", value: null, url: "http://example.com" },
      ],
    });
    expect(http.entities[0]?.url).toBeNull();
  });

  it("moves emoji out of category names", () => {
    const result = normalizeAnalysis({
      ...valid,
      categoryPath: [
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
      ],
    });
    expect(result.categoryPath.map((c) => [c.name, c.emoji])).toEqual([
      ["Instagram", "📸"],
      ["Restaurants", "🍕"],
    ]);
  });

  it("truncates long titles and drops empty text", () => {
    const result = normalizeAnalysis({
      ...valid,
      title: "word ".repeat(50),
      text: "   ",
    });
    expect(result.title.length).toBeLessThanOrEqual(MAX_TITLE);
    expect(result.title.endsWith("…")).toBe(true);
    expect(result.text).toBeNull();
  });

  it("rejects an answer without a title", () => {
    expect(() => normalizeAnalysis({ ...valid, title: "  " })).toThrow(
      AnalysisParseError,
    );
  });
});

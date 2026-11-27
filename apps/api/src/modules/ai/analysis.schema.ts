import {
  CATEGORY_COLORS,
  ENTITY_TYPES,
  type EntityType,
  type ItemEntity,
} from "@norsumi/common";
import { z } from "zod";

/**
 * Structured output the models must return. The JSON Schema below is sent
 * with `strict: true` (every property required, no extras); the Zod parser
 * then re-validates leniently and normalizes, because providers do not all
 * enforce schemas equally.
 */

export const MAX_TITLE = 80;
export const MAX_TEXT = 4000;
export const MIN_TAGS = 3;
export const MAX_TAGS = 8;

const nullableString = { type: ["string", "null"] } as const;

export function analysisJsonSchema(options: { includeText: boolean }) {
  const properties: Record<string, unknown> = {
    title: {
      type: "string",
      description: `Short specific title, max ${MAX_TITLE} chars, in the content's language.`,
    },
    summary: {
      type: "string",
      description: "1-3 sentences, in the content's language.",
    },
    source: {
      ...nullableString,
      description:
        'App or site the content comes from, e.g. "Instagram", "X", "WhatsApp", "YouTube", "Google Maps", or a domain like "github.com". Null if unknown.',
    },
    categoryPath: {
      type: "array",
      minItems: 1,
      maxItems: 2,
      description: "Root (source/platform bucket) then topic.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "emoji", "color", "description"],
        properties: {
          id: {
            ...nullableString,
            description: "Id of the existing category being reused, else null.",
          },
          name: { type: "string" },
          emoji: { type: "string", description: "Exactly one emoji." },
          color: { type: "string", enum: [...CATEGORY_COLORS] },
          description: {
            type: "string",
            description: "One short line describing what belongs here.",
          },
        },
      },
    },
    tags: {
      type: "array",
      minItems: MIN_TAGS,
      maxItems: MAX_TAGS,
      items: { type: "string" },
    },
    entities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "name", "value", "url"],
        properties: {
          type: { type: "string", enum: [...ENTITY_TYPES] },
          name: { type: "string" },
          value: nullableString,
          url: nullableString,
        },
      },
    },
  };
  if (options.includeText) {
    properties.text = {
      type: "string",
      description: `All meaningful visible text, verbatim and cleaned, max ${MAX_TEXT} chars.`,
    };
  }
  return {
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  };
}

const looseString = z
  .unknown()
  .transform((v) => (typeof v === "string" ? v.trim() : ""));

const looseNullableString = z
  .unknown()
  .transform((v) => (typeof v === "string" && v.trim() ? v.trim() : null));

const categorySchema = z.object({
  id: looseNullableString,
  name: looseString,
  emoji: looseString,
  color: looseString,
  description: looseString,
});

const entitySchema = z.object({
  type: looseString,
  name: looseString,
  value: looseNullableString,
  url: looseNullableString,
});

const rawSchema = z.object({
  title: looseString,
  summary: looseString,
  source: looseNullableString,
  categoryPath: z.array(categorySchema).catch([]),
  tags: z.array(z.unknown()).catch([]),
  entities: z.array(z.unknown()).catch([]),
  text: looseNullableString.optional(),
});

const EMOJI_PART = String.raw`(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\u200d|\ufe0f|\s)+`;
const EDGE_EMOJI = new RegExp(`^${EMOJI_PART}|${EMOJI_PART}$`, "gu");
const FIRST_EMOJI =
  /(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:\ufe0f|\u200d\p{Extended_Pictographic})*)/u;

/** Models sometimes prefix names with the emoji: move it to its field. */
function splitCategoryName(
  name: string,
  emoji: string,
): { name: string; emoji: string } {
  const stripped = name.replace(EDGE_EMOJI, "").replace(/\s+/g, " ").trim();
  return {
    name: stripped,
    emoji: emoji || (name.match(FIRST_EMOJI)?.[0] ?? ""),
  };
}

export interface Analysis {
  title: string;
  summary: string;
  source: string | null;
  categoryPath: Array<z.infer<typeof categorySchema>>;
  tags: string[];
  entities: ItemEntity[];
  text: string | null;
}

export class AnalysisParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisParseError";
  }
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Only https links reach clients (no mixed content, no other schemes). */
function httpsUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function mapsSearchUrl(name: string, value: string | null): string {
  const query =
    value && !value.includes(name) ? `${name}, ${value}` : (value ?? name);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function normalizeTags(raw: unknown[]): string[] {
  const seen = new Set<string>();
  for (const tag of raw) {
    if (typeof tag !== "string") continue;
    const clean = tag
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);
    if (clean) seen.add(clean);
    if (seen.size >= MAX_TAGS) break;
  }
  return [...seen];
}

function normalizeEntities(raw: unknown[]): ItemEntity[] {
  const out: ItemEntity[] = [];
  const seen = new Set<string>();
  for (const candidate of raw) {
    const parsed = entitySchema.safeParse(candidate);
    if (!parsed.success || !parsed.data.name) continue;
    const type = (ENTITY_TYPES as readonly string[]).includes(parsed.data.type)
      ? (parsed.data.type as EntityType)
      : "other";
    const name = parsed.data.name.slice(0, 120);
    const key = `${type}:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const value = parsed.data.value?.slice(0, 300) ?? null;
    let url = httpsUrl(parsed.data.url);
    // Maps links are derived, never trusted from the model.
    if (type === "place") url = mapsSearchUrl(name, value);
    out.push({ type, name, value, url });
    if (out.length >= 25) break;
  }
  return out;
}

/** Parses a model's JSON content into a normalized `Analysis`. */
export function parseAnalysis(content: string): Analysis {
  let json: unknown;
  try {
    // Some providers wrap JSON in a fenced block despite json_schema mode.
    const unfenced = content
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    json = JSON.parse(unfenced);
  } catch {
    throw new AnalysisParseError("Model returned invalid JSON");
  }
  const parsed = rawSchema.safeParse(json);
  if (!parsed.success) {
    throw new AnalysisParseError("Model output does not match the schema");
  }
  const raw = parsed.data;
  if (!raw.title) throw new AnalysisParseError("Model output has no title");

  return {
    title: truncate(raw.title.replace(/\s+/g, " "), MAX_TITLE),
    summary: truncate(raw.summary, 600),
    source: raw.source ? raw.source.slice(0, 60) : null,
    categoryPath: raw.categoryPath
      .map((c) => ({ ...c, ...splitCategoryName(c.name, c.emoji) }))
      .filter((c) => c.name)
      .slice(0, 2),
    tags: normalizeTags(raw.tags),
    entities: normalizeEntities(raw.entities),
    text: raw.text ? truncate(raw.text, MAX_TEXT) : null,
  };
}

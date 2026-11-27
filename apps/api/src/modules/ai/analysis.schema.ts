import {
  CATEGORY_COLORS,
  ENTITY_TYPES,
  type ItemEntity,
} from "@norsumi/common";
import { z } from "zod";

/**
 * The single source of the model's structured output. The AI SDK turns it
 * into the JSON Schema sent with `response_format: json_schema, strict:
 * true` (strict objects: every property required, no extras; nullable
 * instead of optional) and validates the answer against it. Limits a model
 * could trip over (lengths, duplicates, URLs) are enforced afterwards by
 * `normalizeAnalysis`, so an overlong title never costs a fallback call.
 */

export const MAX_TITLE = 80;
export const MAX_TEXT = 4000;
export const MIN_TAGS = 3;
export const MAX_TAGS = 8;

const categorySuggestion = z.strictObject({
  id: z
    .string()
    .nullable()
    .describe("Id of the existing category being reused, else null."),
  name: z.string(),
  emoji: z.string().describe("Exactly one emoji."),
  color: z.enum(CATEGORY_COLORS),
  description: z
    .string()
    .describe("One short line describing what belongs here."),
});

const entity = z.strictObject({
  type: z.enum(ENTITY_TYPES),
  name: z.string(),
  value: z.string().nullable(),
  url: z.string().nullable(),
});

export const analysisSchema = z.strictObject({
  title: z
    .string()
    .describe(
      `Short specific title, max ${MAX_TITLE} chars, in the content's language.`,
    ),
  summary: z.string().describe("1-3 sentences, in the content's language."),
  source: z
    .string()
    .nullable()
    .describe(
      'App or site the content comes from, e.g. "Instagram", "X", "WhatsApp", "YouTube", "Google Maps", or a domain like "github.com". Null if unknown.',
    ),
  categoryPath: z
    .array(categorySuggestion)
    .min(1)
    .max(2)
    .describe("Root (source/platform bucket) then topic."),
  tags: z
    .array(z.string())
    .max(MAX_TAGS)
    .describe(`${MIN_TAGS} to ${MAX_TAGS} lowercase search keywords.`),
  entities: z.array(entity),
});

/** Images also return the visible text (OCR). */
export const imageAnalysisSchema = analysisSchema.extend({
  text: z
    .string()
    .describe(
      `All meaningful visible text, verbatim and cleaned, max ${MAX_TEXT} chars.`,
    ),
});

export type RawAnalysis = z.infer<typeof analysisSchema> & { text?: string };
export type CategorySuggestion = z.infer<typeof categorySuggestion>;

export interface Analysis {
  title: string;
  summary: string;
  source: string | null;
  categoryPath: CategorySuggestion[];
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

const EMOJI_PART = String.raw`(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|‍|️|\s)+`;
const EDGE_EMOJI = new RegExp(`^${EMOJI_PART}|${EMOJI_PART}$`, "gu");
const FIRST_EMOJI =
  /(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)/u;

/** Models sometimes prefix names with the emoji: move it to its field. */
function splitCategoryName(
  name: string,
  emoji: string,
): { name: string; emoji: string } {
  const stripped = name.replace(EDGE_EMOJI, "").replace(/\s+/g, " ").trim();
  return {
    name: stripped,
    emoji: emoji.trim() || (name.match(FIRST_EMOJI)?.[0] ?? ""),
  };
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

function normalizeTags(raw: string[]): string[] {
  const seen = new Set<string>();
  for (const tag of raw) {
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

function normalizeEntities(raw: RawAnalysis["entities"]): ItemEntity[] {
  const out: ItemEntity[] = [];
  const seen = new Set<string>();
  for (const candidate of raw) {
    const name = candidate.name.trim().slice(0, 120);
    if (!name) continue;
    const key = `${candidate.type}:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const value = candidate.value?.trim().slice(0, 300) || null;
    // Maps links are derived, never trusted from the model.
    const url =
      candidate.type === "place"
        ? mapsSearchUrl(name, value)
        : httpsUrl(candidate.url?.trim() || null);
    out.push({ type: candidate.type, name, value, url });
    if (out.length >= 25) break;
  }
  return out;
}

/** Cleans a schema-valid model answer into what the app stores. */
export function normalizeAnalysis(raw: RawAnalysis): Analysis {
  const title = raw.title.replace(/\s+/g, " ").trim();
  if (!title) throw new AnalysisParseError("Model output has no title");
  return {
    title: truncate(title, MAX_TITLE),
    summary: truncate(raw.summary.trim(), 600),
    source: raw.source?.trim().slice(0, 60) || null,
    categoryPath: raw.categoryPath
      .map((c) => ({ ...c, ...splitCategoryName(c.name, c.emoji) }))
      .filter((c) => c.name)
      .slice(0, 2),
    tags: normalizeTags(raw.tags),
    entities: normalizeEntities(raw.entities),
    text: raw.text?.trim() ? truncate(raw.text.trim(), MAX_TEXT) : null,
  };
}

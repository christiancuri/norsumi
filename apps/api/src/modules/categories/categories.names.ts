import { CATEGORY_COLORS, type CategoryColor } from "@norsumi/common";

export const DEFAULT_EMOJI = "📁";
export const MAX_CATEGORY_NAME = 40;

/** Case/accent/space-insensitive key used for sibling uniqueness. */
export function nameKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[\s_]+/g, " ")
    .trim();
}

export function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_CATEGORY_NAME).trim();
}

export function slugify(name: string): string {
  const slug = nameKey(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "category";
}

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

/** First grapheme if it is an emoji, else the default. */
export function cleanEmoji(value: string | null | undefined): string {
  if (!value) return DEFAULT_EMOJI;
  const first = segmenter.segment(value.trim())[Symbol.iterator]().next();
  const grapheme = first.done ? "" : first.value.segment;
  return grapheme && EMOJI.test(grapheme) ? grapheme : DEFAULT_EMOJI;
}

/** Stable palette pick for categories created without a color. */
export function colorFor(name: string): CategoryColor {
  let hash = 0;
  for (const char of nameKey(name)) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length] as CategoryColor;
}

export function cleanColor(
  value: string | null | undefined,
  name: string,
): CategoryColor {
  return (CATEGORY_COLORS as readonly string[]).includes(value ?? "")
    ? (value as CategoryColor)
    : colorFor(name);
}

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
/**
 * A grapheme cluster is an emoji when it holds a pictographic code point
 * (covers ZWJ and variation-selector sequences: ✖️ 👨‍💻 🏳️‍🌈), a flag
 * (regional indicators) or a keycap (1️⃣). Look-alike letters such as 𝕏
 * (mathematical double-struck X) are not emoji.
 */
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u;

/** Emoji for well-known sources when the suggested one is unusable. */
const SOURCE_EMOJI: Record<string, string> = {
  x: "✖️",
  twitter: "✖️",
  instagram: "📸",
  youtube: "▶️",
  whatsapp: "💬",
  web: "🌐",
  notes: "📝",
  linkedin: "💼",
  tiktok: "🎵",
  reddit: "👽",
  github: "🐙",
};

/** Fallback emoji for a category name: its source's, else the folder. */
export function fallbackEmoji(name: string | null | undefined): string {
  return (name && SOURCE_EMOJI[nameKey(name)]) || DEFAULT_EMOJI;
}

/**
 * The first emoji grapheme in `value` (so "🐦 X" and "X 🐦" both give 🐦),
 * else the fallback for `name`, else 📁.
 */
export function cleanEmoji(
  value: string | null | undefined,
  name?: string | null,
): string {
  for (const { segment } of segmenter.segment((value ?? "").trim())) {
    if (EMOJI.test(segment)) return segment;
  }
  return fallbackEmoji(name);
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

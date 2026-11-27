import { describe, expect, it } from "vitest";

import {
  cleanEmoji,
  DEFAULT_EMOJI,
  fallbackEmoji,
} from "./categories.names.js";

describe("cleanEmoji", () => {
  it.each([
    ["✖️", "✖️"], // variation selector
    ["✖", "✖"],
    ["👨‍💻", "👨‍💻"], // ZWJ sequence
    ["🏳️‍🌈", "🏳️‍🌈"], // VS + ZWJ
    ["1️⃣", "1️⃣"], // keycap
    ["🇧🇷", "🇧🇷"], // flag
    ["👍🏽", "👍🏽"], // skin tone modifier
    ["🐦 X", "🐦"],
    ["X 🐦", "🐦"],
    ["  📸  ", "📸"],
  ])("keeps the emoji grapheme of %j", (input, expected) => {
    expect(cleanEmoji(input)).toBe(expected);
  });

  it("rejects look-alike letters and plain text", () => {
    expect(cleanEmoji("𝕏")).toBe(DEFAULT_EMOJI);
    expect(cleanEmoji("X")).toBe(DEFAULT_EMOJI);
    expect(cleanEmoji("1")).toBe(DEFAULT_EMOJI);
    expect(cleanEmoji("")).toBe(DEFAULT_EMOJI);
    expect(cleanEmoji(null)).toBe(DEFAULT_EMOJI);
  });

  it("falls back to the source's emoji before the folder", () => {
    expect(cleanEmoji("𝕏", "X")).toBe("✖️");
    expect(cleanEmoji("", "Twitter")).toBe("✖️");
    expect(cleanEmoji(null, "instagram")).toBe("📸");
    expect(cleanEmoji("?", "GitHub")).toBe("🐙");
    expect(cleanEmoji("🎬", "YouTube")).toBe("🎬");
    expect(cleanEmoji("", "Restaurants")).toBe(DEFAULT_EMOJI);
  });

  it("maps the well-known sources", () => {
    expect(
      [
        "YouTube",
        "WhatsApp",
        "Web",
        "Notes",
        "LinkedIn",
        "TikTok",
        "Reddit",
      ].map(fallbackEmoji),
    ).toEqual(["▶️", "💬", "🌐", "📝", "💼", "🎵", "👽"]);
  });
});

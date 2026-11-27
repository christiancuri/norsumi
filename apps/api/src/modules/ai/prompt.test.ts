import { describe, expect, it } from "vitest";

import { buildSystemPrompt, noteUserText, renderTree } from "./prompt.js";

describe("system prompt", () => {
  const prompt = buildSystemPrompt([], "link");

  it("derives the output language from the content, defaulting to English", () => {
    expect(prompt).toContain("language of the CONTENT itself");
    expect(prompt).toContain(
      "If the content is mixed, too short or unclear, write in English.",
    );
    expect(prompt).toContain("Category names are ALWAYS in English");
  });

  it("has no examples biased toward one non-English language", () => {
    expect(prompt).not.toMatch(/Portugu|São Paulo|Pinheiros/);
  });

  it("asks for verbatim text only for images", () => {
    expect(buildSystemPrompt([], "screenshot")).toContain(
      "All meaningful visible text",
    );
    expect(prompt).not.toContain("All meaningful visible text");
  });

  it("renders the category tree with ids", () => {
    expect(renderTree([])).toContain("none yet");
    expect(
      renderTree([
        {
          id: "r1",
          name: "Web",
          emoji: "🌐",
          description: null,
          children: [
            {
              id: "c1",
              name: "AI",
              emoji: "🤖",
              description: "LLMs",
              children: [],
            },
          ],
        },
      ]),
    ).toBe("- 🌐 Web [id: r1]\n  - 🤖 AI [id: c1] — LLMs");
  });

  it("passes the note body as delimited data", () => {
    expect(
      noteUserText("hello", { kind: "note", capturedAt: new Date(0) }),
    ).toContain('"""\nhello\n"""');
  });
});

import { describe, expect, it } from "vitest";

import { applyFixedRoot, fixedRoot } from "./fixed-roots.js";

const s = (name: string, id: string | null = null) => ({
  id,
  name,
  emoji: "",
  color: "",
  description: "",
});

describe("fixedRoot", () => {
  it("maps link domains to platform roots, else Web", () => {
    expect(fixedRoot("link", "https://github.com/fastify/fastify")?.name).toBe(
      "Web",
    );
    expect(fixedRoot("link", "https://x.com/someone/status/1")?.name).toBe("X");
    expect(fixedRoot("link", "https://mobile.twitter.com/a")?.name).toBe("X");
    expect(fixedRoot("link", "https://www.instagram.com/p/abc")?.name).toBe(
      "Instagram",
    );
    expect(fixedRoot("link", "https://youtu.be/abc")?.name).toBe("YouTube");
    expect(fixedRoot("link", "https://www.google.com/maps/place/x")?.name).toBe(
      "Maps",
    );
    expect(fixedRoot("link", "https://notlinkedin.com")?.name).toBe("Web");
  });

  it("uses Notes for notes and lets the model decide for images", () => {
    expect(fixedRoot("note")?.name).toBe("Notes");
    expect(fixedRoot("screenshot")).toBeNull();
    expect(fixedRoot("image")).toBeNull();
  });
});

describe("applyFixedRoot", () => {
  const web = fixedRoot("link", "https://github.com")!;

  it("replaces a wrong root and keeps the topic", () => {
    const path = applyFixedRoot(web, [
      s("LinkedIn", "linkedin-id"),
      s("Programming", "child-id"),
    ]);
    expect(path.map((p) => p.name)).toEqual(["Web", "Programming"]);
    expect(path[0]?.id).toBeNull();
    expect(path[1]?.id).toBe("child-id");
  });

  it("treats a single non-root level as the topic", () => {
    expect(applyFixedRoot(web, [s("Programming")]).map((p) => p.name)).toEqual([
      "Web",
      "Programming",
    ]);
  });

  it("keeps the model's id and style when it chose the same root", () => {
    const path = applyFixedRoot(web, [
      {
        id: "web-id",
        name: "web",
        emoji: "🕸️",
        color: "teal",
        description: "d",
      },
      s("AI"),
    ]);
    expect(path[0]).toMatchObject({
      id: "web-id",
      name: "Web",
      emoji: "🕸️",
      color: "teal",
    });
  });

  it("returns only the root when there is no topic", () => {
    expect(applyFixedRoot(web, [s("Web")]).map((p) => p.name)).toEqual(["Web"]);
    expect(applyFixedRoot(web, []).map((p) => p.name)).toEqual(["Web"]);
  });
});

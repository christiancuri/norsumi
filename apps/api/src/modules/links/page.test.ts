import { describe, expect, it } from "vitest";

import { domainOf, parsePage } from "./page.js";

describe("parsePage", () => {
  it("reads OpenGraph meta, favicon and main text", () => {
    const html = `<!doctype html><html><head>
      <title>Fallback title</title>
      <meta property="og:title" content="Fast web framework">
      <meta property="og:site_name" content="GitHub">
      <meta name="description" content="Fast and low overhead web framework, for Node.js">
      <meta property="og:image" content="/img/card.png">
      <link rel="icon" href="https://github.githubassets.com/favicon.svg">
      </head><body><nav>menu</nav><article><h1>Fastify</h1>
      <p>${"Fastify is a web framework highly focused on providing the best developer experience. ".repeat(5)}</p>
      </article><script>alert(1)</script></body></html>`;
    const page = parsePage(html, "https://github.com/fastify/fastify");
    expect(page.title).toBe("Fast web framework");
    expect(page.siteName).toBe("GitHub");
    expect(page.description).toContain("low overhead");
    expect(page.imageUrl).toBe("https://github.com/img/card.png");
    expect(page.faviconUrl).toBe("https://github.githubassets.com/favicon.svg");
    expect(page.text).toContain("Fastify is a web framework");
    expect(page.text).not.toContain("alert(1)");
  });

  it("falls back to <title> and /favicon.ico", () => {
    const page = parsePage(
      "<html><head><title> Hello </title></head><body>Hi</body></html>",
      "https://example.com/a",
    );
    expect(page.title).toBe("Hello");
    expect(page.faviconUrl).toBe("https://example.com/favicon.ico");
  });

  it("drops non-https favicon and og:image URLs", () => {
    const html = `<html><head><meta property="og:image" content="http://cdn.example.com/a.png">
      <link rel="icon" href="javascript:alert(1)"></head><body>x</body></html>`;
    const page = parsePage(html, "https://example.com/");
    expect(page.imageUrl).toBeNull();
    expect(page.faviconUrl).toBeNull();
    expect(
      parsePage("<html></html>", "http://plain.example.com/").faviconUrl,
    ).toBeNull();
  });

  it("strips www from domains", () => {
    expect(domainOf("https://www.Example.com/path")).toBe("example.com");
  });
});

import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

import { safeFetch } from "../../infra/safe-fetch.js";

export const MAX_PAGE_TEXT = 6000;

export interface PageInfo {
  /** Final URL after redirects. */
  url: string;
  status: number;
  siteName: string | null;
  title: string | null;
  description: string | null;
  faviconUrl: string | null;
  imageUrl: string | null;
  text: string | null;
}

export function domainOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
}

function clean(value: string | null | undefined, max = 500): string | null {
  if (!value) return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

function absolute(
  value: string | null | undefined,
  base: string,
): string | null {
  if (!value) return null;
  try {
    // https only: these URLs are rendered by clients (favicon, og:image).
    const url = new URL(value.trim(), base);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function charsetOf(contentType: string, head: string): string {
  const fromHeader = contentType.match(/charset=([\w-]+)/i)?.[1];
  const fromMeta = head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  const label = (fromHeader ?? fromMeta ?? "utf-8").toLowerCase();
  try {
    new TextDecoder(label);
    return label;
  } catch {
    return "utf-8";
  }
}

/** Heuristic fallback when Readability finds no article. */
type HtmlDocument = ReturnType<typeof parseHTML>["document"];

function fallbackText(document: HtmlDocument): string {
  for (const selector of [
    "script",
    "style",
    "noscript",
    "svg",
    "nav",
    "footer",
    "header",
    "aside",
    "form",
    "iframe",
  ]) {
    for (const node of document.querySelectorAll(selector)) node.remove();
  }
  const root =
    document.querySelector("article") ??
    document.querySelector("main") ??
    document.querySelector("[role=main]") ??
    document.body;
  return root?.textContent ?? "";
}

function readableText(html: string): string | null {
  try {
    const { document } = parseHTML(html);
    const article = new Readability(document as never, {
      charThreshold: 200,
    }).parse();
    const text = article?.textContent?.trim()
      ? article.textContent
      : fallbackText(parseHTML(html).document);
    const normalized = text
      .replace(/[ \t ]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return normalized ? normalized.slice(0, MAX_PAGE_TEXT) : null;
  } catch {
    return null;
  }
}

/** Parses OpenGraph/Twitter/HTML meta, favicon and main text. */
export function parsePage(html: string, url: string, status = 200): PageInfo {
  const { document } = parseHTML(html);
  const meta = (...keys: string[]): string | null => {
    for (const key of keys) {
      const node =
        document.querySelector(`meta[property="${key}"]`) ??
        document.querySelector(`meta[name="${key}"]`);
      const content = node?.getAttribute("content");
      if (content?.trim()) return content;
    }
    return null;
  };
  const iconHref =
    document
      .querySelector('link[rel="apple-touch-icon"]')
      ?.getAttribute("href") ??
    document.querySelector('link[rel="icon"]')?.getAttribute("href") ??
    document.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") ??
    "/favicon.ico";

  return {
    url,
    status,
    siteName: clean(meta("og:site_name", "application-name"), 100),
    title: clean(
      meta("og:title", "twitter:title") ??
        document.querySelector("title")?.textContent,
      300,
    ),
    description: clean(
      meta("og:description", "twitter:description", "description"),
      1000,
    ),
    faviconUrl: absolute(iconHref, url),
    imageUrl: absolute(
      meta("og:image", "og:image:url", "twitter:image", "twitter:image:src"),
      url,
    ),
    text: readableText(html),
  };
}

/** Fetches a page through the SSRF guard and parses it. */
export async function fetchPage(url: string): Promise<PageInfo> {
  const res = await safeFetch(url);
  if (!res.body || res.body.length === 0) {
    return {
      url: res.url,
      status: res.status,
      siteName: null,
      title: null,
      description: null,
      faviconUrl: absolute("/favicon.ico", res.url),
      imageUrl: null,
      text: null,
    };
  }
  const head = res.body.subarray(0, 2048).toString("latin1");
  const html = new TextDecoder(charsetOf(res.contentType, head)).decode(
    res.body,
  );
  if (!res.contentType.includes("html")) {
    return {
      ...parsePage("<html></html>", res.url, res.status),
      text: html.replace(/\s+/g, " ").trim().slice(0, MAX_PAGE_TEXT) || null,
    };
  }
  return parsePage(html, res.url, res.status);
}

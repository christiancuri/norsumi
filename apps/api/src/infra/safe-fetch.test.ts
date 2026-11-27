import { describe, expect, it } from "vitest";

import {
  assertFetchableUrl,
  BlockedUrlError,
  guardedLookup,
  isBlockedAddress,
  readBody,
  safeFetch,
} from "./safe-fetch.js";

describe("SSRF guard", () => {
  it.each([
    "127.0.0.1",
    "127.1.2.3",
    "10.0.0.5",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "::",
    "fe80::1",
    "fd00::1",
    "fc00::abcd",
    "ff02::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:169.254.169.254",
    "64:ff9b::a9fe:a9fe",
    "64:ff9b::808:808",
    "64:ff9b::8.8.8.8",
    "64:ff9b:1::1",
    "::808:808",
    "::8.8.8.8",
    "::127.0.0.1",
    "not-an-ip",
  ])("blocks %s", (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each([
    "8.8.8.8",
    "1.1.1.1",
    "140.82.112.3",
    "2606:4700:4700::1111",
    "::ffff:8.8.8.8",
  ])("allows %s", (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });

  it.each([
    "ftp://example.com/file",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "http://user:pass@example.com",
    "http://localhost:3000",
    "http://api.localhost",
    "http://127.0.0.1/",
    "http://127.1/",
    "http://2130706433/",
    "http://0x7f000001/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://169.254.169.254/latest/meta-data/",
    "not a url",
  ])("rejects URL %s", (url) => {
    expect(() => assertFetchableUrl(url)).toThrow(BlockedUrlError);
  });

  it("accepts public http(s) URLs", () => {
    expect(
      assertFetchableUrl("https://github.com/fastify/fastify").hostname,
    ).toBe("github.com");
  });

  it("refuses hostnames that resolve to private addresses", async () => {
    const error = await new Promise<NodeJS.ErrnoException | null>((resolve) =>
      guardedLookup("localhost", { all: true }, (err) => resolve(err)),
    );
    expect(error).toBeInstanceOf(BlockedUrlError);
  });

  it("never connects to loopback", async () => {
    await expect(safeFetch("http://127.0.0.1:9/")).rejects.toBeInstanceOf(
      BlockedUrlError,
    );
  });
});

describe("readBody (size cap)", () => {
  function stream(totalBytes: number) {
    let pulled = 0;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (pulled >= totalBytes) return controller.close();
        const chunk = new Uint8Array(
          Math.min(64 * 1024, totalBytes - pulled),
        ).fill(97);
        pulled += chunk.length;
        controller.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
      },
    });
    return { body, stats: () => ({ pulled, cancelled }) };
  }

  it("cancels a body announced larger than the cap without reading it", async () => {
    const s = stream(50 * 1024 * 1024);
    const body = await readBody(
      s.body,
      "text/html",
      50 * 1024 * 1024,
      1024 * 1024,
      ["text/html"],
    );
    expect(body).toBeNull();
    expect(s.stats().cancelled).toBe(true);
    expect(s.stats().pulled).toBeLessThan(1024 * 1024);
  });

  it("stops reading at the cap when the size is not announced", async () => {
    const s = stream(10 * 1024 * 1024);
    const body = await readBody(s.body, "text/html", 0, 1024 * 1024, [
      "text/html",
    ]);
    expect(body?.length).toBe(1024 * 1024);
    expect(s.stats().pulled).toBeLessThan(2 * 1024 * 1024);
  });

  it("does not download non-text content", async () => {
    const s = stream(1024);
    expect(
      await readBody(s.body, "application/pdf", 1024, 1024 * 1024, [
        "text/html",
      ]),
    ).toBeNull();
    expect(s.stats().cancelled).toBe(true);
  });
});

import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { BlockList, isIP } from "node:net";

import { Agent, fetch } from "undici";

/**
 * Server-side fetch of user-supplied URLs with SSRF protection:
 * - only http/https, no credentials in the URL;
 * - every resolved address is checked against private, loopback,
 *   link-local, CGNAT, multicast, reserved and cloud-metadata ranges, at
 *   connect time (the checked address is the one connected to, so DNS
 *   rebinding cannot swap it);
 * - redirects are followed manually (≤5), re-validating each hop;
 * - total time and body size are capped.
 */

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockedUrlError";
  }
}

export class FetchLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FetchLimitError";
  }
}

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  // IPv4-compatible (deprecated) — also covers :: and ::1.
  ["::", 96],
  ["::1", 128],
  // NAT64 (well-known and local-use prefixes) can reach internal IPv4.
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

/** IPv4 embedded in IPv4-mapped (::ffff:a.b.c.d), compat or NAT64 forms. */
/** IPv4 inside an IPv4-mapped address (::ffff:a.b.c.d or ::ffff:hhhh:hhhh). */
function mappedIpv4(address: string): string | null {
  const lower = address.toLowerCase();
  const dotted = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted?.[1]) return dotted[1];
  const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex?.[1] && hex[2]) {
    const hi = Number.parseInt(hex[1], 16);
    const lo = Number.parseInt(hex[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return null;
}

/** True for any address a server-side fetch must never reach. */
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return blocked.check(address, "ipv4");
  if (family === 6) {
    // Blocked IPv6 ranges first (IPv4-compatible, NAT64...), whatever
    // IPv4 they embed; then mapped addresses by their IPv4.
    if (blocked.check(address, "ipv6")) return true;
    const v4 = mappedIpv4(address);
    return v4 ? blocked.check(v4, "ipv4") : false;
  }
  return true;
}

/** Validates scheme, credentials and literal-IP hosts. Returns the URL. */
export function assertFetchableUrl(input: string | URL): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new BlockedUrlError("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedUrlError("Only http and https URLs are allowed");
  }
  if (url.username || url.password) {
    throw new BlockedUrlError("URLs with credentials are not allowed");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host) throw new BlockedUrlError("Invalid URL host");
  if (isIP(host) && isBlockedAddress(host)) {
    throw new BlockedUrlError("Address not allowed");
  }
  const lowerHost = host.toLowerCase();
  if (lowerHost === "localhost" || lowerHost.endsWith(".localhost")) {
    throw new BlockedUrlError("Address not allowed");
  }
  return url;
}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void;

/** dns.lookup replacement that refuses blocked addresses. */
export function guardedLookup(
  hostname: string,
  options: { all?: boolean; family?: number } | number,
  callback: LookupCallback,
): void {
  const opts = typeof options === "number" ? { family: options } : options;
  dnsLookup(
    hostname,
    { all: true, family: opts.family ?? 0 },
    (err, addresses) => {
      if (err) return callback(err, []);
      const list = addresses as LookupAddress[];
      if (list.length === 0 || list.some((a) => isBlockedAddress(a.address))) {
        return callback(
          Object.assign(new BlockedUrlError("Address not allowed"), {
            code: "EBLOCKED",
          }),
          [],
        );
      }
      if (opts.all) return callback(null, list);
      const first = list[0] as LookupAddress;
      callback(null, first.address, first.family);
    },
  );
}

const agent = new Agent({
  connect: {
    // Forwarded to net/tls.connect: every connection resolves through it.
    lookup: guardedLookup as never,
    timeout: 5_000,
  },
});

export interface SafeFetchOptions {
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  accept?: string;
  /** Content types whose body is read (prefix match). Others: body null. */
  readTypes?: string[];
}

export interface SafeFetchResult {
  url: string;
  status: number;
  contentType: string;
  body: Buffer | null;
}

async function readCapped(
  body: AsyncIterable<Uint8Array> | null,
  maxBytes: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  if (!body) return Buffer.alloc(0);
  for await (const chunk of body) {
    total += chunk.byteLength;
    if (total > maxBytes) {
      // Keep what fits: a truncated HTML page is still useful.
      chunks.push(
        Buffer.from(chunk.subarray(0, chunk.byteLength - (total - maxBytes))),
      );
      break;
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Reads at most `maxBytes` of a text body. Bodies of other types, or
 * announced (Content-Length) as larger than the cap, are cancelled unread.
 */
export async function readBody(
  body: ReadableStream<Uint8Array> | null,
  contentType: string,
  declaredBytes: number,
  maxBytes: number,
  readTypes: string[],
): Promise<Buffer | null> {
  const readable = readTypes.some((t) => contentType.startsWith(t));
  if (!readable || declaredBytes > maxBytes) {
    await body?.cancel().catch(() => undefined);
    return null;
  }
  return readCapped(body, maxBytes);
}

export async function safeFetch(
  input: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const {
    maxBytes = 5 * 1024 * 1024,
    timeoutMs = 10_000,
    maxRedirects = 5,
    accept = "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
    readTypes = ["text/html", "application/xhtml+xml", "text/plain"],
  } = options;

  const signal = AbortSignal.timeout(timeoutMs);
  let url = assertFetchableUrl(input);

  for (let hop = 0; ; hop++) {
    const res = await fetch(url, {
      dispatcher: agent,
      redirect: "manual",
      signal,
      headers: {
        accept,
        "accept-language": "en,*;q=0.5",
        "user-agent":
          "Mozilla/5.0 (compatible; norsumi/1.0; +https://norsumi.com)",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      await res.body?.cancel().catch(() => undefined);
      if (!location) throw new FetchLimitError("Redirect without location");
      if (hop >= maxRedirects) throw new FetchLimitError("Too many redirects");
      url = assertFetchableUrl(new URL(location, url));
      continue;
    }

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    const declared = Number(res.headers.get("content-length") ?? "0");
    const body = await readBody(
      res.body as ReadableStream<Uint8Array> | null,
      contentType,
      declared,
      maxBytes,
      readTypes,
    );
    return { url: url.toString(), status: res.status, contentType, body };
  }
}

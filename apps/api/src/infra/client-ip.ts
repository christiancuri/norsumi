import { BlockList, isIP } from "node:net";

/**
 * Client IP behind the production proxy chain:
 *   client → Cloudflare → cloudflared → Caddy → API
 * Cloudflare *appends* to any client-sent X-Forwarded-For, so its left-most
 * entry is attacker-controlled. Caddy (deploy/Caddyfile) therefore replaces
 * X-Forwarded-For with the single client IP it takes from Cf-Connecting-Ip,
 * and the API trusts exactly one hop: the immediate peer, and only when it
 * is on a private/loopback network (the proxy container). Fastify then uses
 * the right-most X-Forwarded-For entry, never the left-most.
 */

const privateNetworks = new BlockList();
for (const [net, prefix] of [
  ["10.0.0.0", 8],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["127.0.0.0", 8],
] as const) {
  privateNetworks.addSubnet(net, prefix, "ipv4");
}
privateNetworks.addAddress("::1", "ipv6");
privateNetworks.addSubnet("fc00::", 7, "ipv6");

export function isPrivateNetworkAddress(address: string): boolean {
  const unmapped = address
    .toLowerCase()
    .replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, "");
  const family = isIP(unmapped);
  if (family === 4) return privateNetworks.check(unmapped, "ipv4");
  if (family === 6) return privateNetworks.check(unmapped, "ipv6");
  return false;
}

export type TrustProxyFn = (address: string, hop: number) => boolean;

export function trustProxySetting(trustProxy: boolean): TrustProxyFn | false {
  if (!trustProxy) return false;
  return (address, hop) => hop === 0 && isPrivateNetworkAddress(address);
}

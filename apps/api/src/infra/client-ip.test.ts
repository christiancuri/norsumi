import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { isPrivateNetworkAddress, trustProxySetting } from "./client-ip.js";

async function ipFor(trustProxy: boolean, xff?: string, peer = "10.0.0.2") {
  const app = Fastify({ trustProxy: trustProxySetting(trustProxy) });
  app.get("/", async (req) => ({ ip: req.ip }));
  const res = await app.inject({
    method: "GET",
    url: "/",
    remoteAddress: peer,
    headers: xff ? { "x-forwarded-for": xff } : {},
  });
  await app.close();
  return (res.json() as { ip: string }).ip;
}

describe("client IP", () => {
  it("ignores spoofed left-most X-Forwarded-For entries behind one proxy", async () => {
    expect(await ipFor(true, "6.6.6.6, 203.0.113.9")).toBe("203.0.113.9");
    expect(await ipFor(true, "203.0.113.9")).toBe("203.0.113.9");
  });

  it("ignores X-Forwarded-For from a public peer (API exposed directly)", async () => {
    expect(await ipFor(true, "6.6.6.6", "198.51.100.7")).toBe("198.51.100.7");
  });

  it("recognizes private proxy addresses, including IPv4-mapped", () => {
    expect(isPrivateNetworkAddress("172.18.0.5")).toBe(true);
    expect(isPrivateNetworkAddress("::ffff:172.18.0.5")).toBe(true);
    expect(isPrivateNetworkAddress("::1")).toBe(true);
    expect(isPrivateNetworkAddress("8.8.8.8")).toBe(false);
    expect(isPrivateNetworkAddress("nope")).toBe(false);
  });

  it("uses the socket address when no proxy is trusted", async () => {
    expect(await ipFor(false, "6.6.6.6")).toBe("10.0.0.2");
  });
});

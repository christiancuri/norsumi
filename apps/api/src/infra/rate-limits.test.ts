import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { perUser } from "./rate-limits.js";

async function app() {
  const server = Fastify();
  server.addHook("onRequest", async (req) => {
    const id = req.headers["x-user"];
    if (typeof id === "string") req.user = { id, email: `${id}@x` };
  });
  await server.register(rateLimit, { global: false, hook: "preHandler" });
  server.get(
    "/items",
    {
      config: {
        rateLimit: perUser(2, 60_000, {
          onlyWhen: (req) => Boolean((req.query as { q?: string }).q),
        }),
      },
    },
    async () => ({ ok: true }),
  );
  server.post(
    "/upload",
    { config: { rateLimit: perUser(2, 60_000) } },
    async () => ({ ok: true }),
  );
  return server;
}

describe("per-user rate limits", () => {
  it("limits each user separately, regardless of IP", async () => {
    const server = await app();
    const hit = (user: string, ip: string) =>
      server.inject({
        method: "POST",
        url: "/upload",
        headers: { "x-user": user },
        remoteAddress: ip,
      });
    expect((await hit("a", "1.1.1.1")).statusCode).toBe(200);
    expect((await hit("a", "2.2.2.2")).statusCode).toBe(200);
    expect((await hit("a", "3.3.3.3")).statusCode).toBe(429);
    expect((await hit("b", "3.3.3.3")).statusCode).toBe(200);
    await server.close();
  });

  it("only limits searches on the list route", async () => {
    const server = await app();
    const list = (q?: string) =>
      server.inject({
        method: "GET",
        url: q ? `/items?q=${q}` : "/items",
        headers: { "x-user": "a" },
      });
    for (let i = 0; i < 5; i++) expect((await list()).statusCode).toBe(200);
    expect((await list("x")).statusCode).toBe(200);
    expect((await list("x")).statusCode).toBe(200);
    expect((await list("x")).statusCode).toBe(429);
    expect((await list()).statusCode).toBe(200);
    await server.close();
  });
});

import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { MAX_UPLOAD_BYTES } from "@norsumi/common";
import Fastify, {
  type FastifyBaseLogger,
  type FastifyInstance,
  LogController,
} from "fastify";
import { bootstrap } from "fastify-decorators";

import { authHook } from "../hooks/auth.hook.js";
import { errorHandler, notFoundHandler } from "../hooks/error-handler.js";
import AuthController from "../modules/auth/auth.controller.js";
import MeController from "../modules/auth/me.controller.js";
import CategoriesController from "../modules/categories/categories.controller.js";
import HealthController from "../modules/health/health.controller.js";
import ItemsController from "../modules/items/items.controller.js";
import MediaController from "../modules/media/media.controller.js";
import { trustProxySetting } from "./client-ip.js";
import { Env } from "./env.js";
import { rootLogger } from "./logger.js";

const JSON_BODY_LIMIT = 1024 * 1024;

function corsOrigins(): "*" | string[] {
  const list = Env.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return list.length === 0 || list.includes("*") ? "*" : list;
}

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    loggerInstance: rootLogger as FastifyBaseLogger,
    // Our own onResponse line replaces Fastify's request logs.
    logController: new LogController({ disableRequestLogging: true }),
    bodyLimit: JSON_BODY_LIMIT,
    trustProxy: trustProxySetting(Env.TRUST_PROXY),
    routerOptions: { ignoreTrailingSlash: true },
  });

  // One line per request. Path only: media query strings are capabilities.
  server.addHook("onResponse", (request, reply, done) => {
    request.log.info(
      `${Math.round(reply.elapsedTime)}ms ${request.method} ${request.url.split("?")[0]} ${reply.statusCode}`,
    );
    done();
  });

  const origins = corsOrigins();
  await server.register(cors, {
    // Requests without Origin (mobile apps, curl) are not CORS requests.
    origin: (origin, callback) => {
      if (!origin || origins === "*") return callback(null, true);
      callback(null, origins.includes(origin));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 600,
  });

  // Only routes with `config.rateLimit` are limited. preHandler so the
  // parsed body (login email) is available to key generators.
  await server.register(rateLimit, { global: false, hook: "preHandler" });

  await server.register(multipart, {
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
      files: 1,
      fields: 10,
      fieldSize: 1024,
      parts: 12,
    },
  });

  server.setErrorHandler(errorHandler);
  server.setNotFoundHandler(notFoundHandler);

  // Accept an empty body with `Content-Type: application/json`.
  server.removeContentTypeParser("application/json");
  server.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_request, body, done) => {
      const text = body as string;
      if (text.trim() === "") return done(null, undefined);
      try {
        done(null, JSON.parse(text));
      } catch {
        done(
          Object.assign(new Error("Body is not valid JSON"), {
            statusCode: 400,
          }),
          undefined,
        );
      }
    },
  );

  server.addHook("onRequest", authHook);

  await server.register(bootstrap, {
    controllers: [
      HealthController,
      AuthController,
      MeController,
      CategoriesController,
      ItemsController,
      MediaController,
    ],
  });

  await server.ready();
  return server;
}

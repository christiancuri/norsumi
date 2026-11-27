import { STATUS_CODES } from "node:http";

import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError, z } from "zod";

import { HTTPError } from "../infra/http-errors.js";

function send(reply: FastifyReply, statusCode: number, message: string): void {
  reply.status(statusCode).send({
    statusCode,
    error: STATUS_CODES[statusCode] ?? "Error",
    message,
  });
}

/** Every non-2xx response is `ApiError`: `{ statusCode, error, message }`. */
export function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof HTTPError) {
    if (error.retryAfter !== undefined) {
      reply.header("Retry-After", String(error.retryAfter));
    }
    return send(reply, error.statusCode, error.message);
  }
  if (error instanceof ZodError) {
    return send(reply, 400, z.prettifyError(error));
  }
  const fastifyError = error as FastifyError;
  const statusCode = fastifyError.statusCode;
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return send(reply, statusCode, fastifyError.message);
  }
  request.log.error({ err: error }, "Unhandled error");
  send(reply, 500, "Internal Server Error");
}

export function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  send(
    reply,
    404,
    `Route ${request.method} ${request.url.split("?")[0]} not found`,
  );
}

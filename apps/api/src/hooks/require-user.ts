import type { FastifyRequest } from "fastify";

import { HTTP401Error } from "../infra/http-errors.js";

export function requireUser(
  req: FastifyRequest,
): NonNullable<FastifyRequest["user"]> {
  if (!req.user) throw new HTTP401Error();
  return req.user;
}

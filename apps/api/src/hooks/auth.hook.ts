import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP401Error } from "../infra/http-errors.js";
import { isTokenExpiredError, verifyAccessToken } from "../infra/jwt.js";
import { userExists } from "../modules/users/user-exists.js";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function authHook(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  if (request.method === "OPTIONS") return;
  // Unknown routes fall through to the 404 handler.
  if (!request.routeOptions.url) return;
  if (request.routeOptions.config?.public) return;

  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new HTTP401Error("Missing authorization header");

  try {
    const payload = await verifyAccessToken(token);
    request.user = { id: payload.sub, email: payload.email };
  } catch (error) {
    throw new HTTP401Error(
      isTokenExpiredError(error) ? "Expired session" : "Invalid session",
    );
  }

  // Access tokens outlive a deleted account by up to 15 min: refuse writes.
  if (
    !READ_METHODS.has(request.method) &&
    !(await userExists(request.user.id))
  ) {
    throw new HTTP401Error("Account no longer exists");
  }
}

import type { FastifyReply, FastifyRequest } from "fastify";
import { Controller, POST } from "fastify-decorators";

import { FixedWindowLimiter } from "../../infra/limiter.js";
import {
  googleBody,
  loginBody,
  refreshBody,
  registerBody,
} from "./auth.schemas.js";
import * as AuthService from "./auth.service.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/** Password spraying (many emails from one IP), on top of IP+email. */
const loginPerIp = new FixedWindowLimiter(50, FIFTEEN_MINUTES);
const HOUR = 60 * 60 * 1000;

function bodyEmail(request: FastifyRequest): string {
  const body = request.body as { email?: unknown } | undefined;
  return typeof body?.email === "string"
    ? body.email.trim().toLowerCase().slice(0, 254)
    : "";
}

@Controller("/api/auth")
export default class AuthController {
  @POST("/register", {
    config: {
      public: true,
      rateLimit: { max: 10, timeWindow: HOUR },
    },
  })
  async register(req: FastifyRequest, reply: FastifyReply) {
    const body = registerBody.parse(req.body);
    const session = await AuthService.register(body);
    return reply.status(201).send(session);
  }

  @POST("/login", {
    config: {
      public: true,
      rateLimit: {
        max: 10,
        timeWindow: FIFTEEN_MINUTES,
        keyGenerator: (req) => `${req.ip}|${bodyEmail(req)}`,
      },
    },
  })
  async login(req: FastifyRequest) {
    loginPerIp.consume(req.ip, "Too many sign-in attempts, try again later");
    return AuthService.login(loginBody.parse(req.body));
  }

  @POST("/google", {
    config: {
      public: true,
      rateLimit: { max: 30, timeWindow: FIFTEEN_MINUTES },
    },
  })
  async google(req: FastifyRequest, reply: FastifyReply) {
    const { idToken } = googleBody.parse(req.body);
    const { session, created } = await AuthService.googleSignIn(idToken);
    return reply.status(created ? 201 : 200).send(session);
  }

  @POST("/refresh", {
    config: {
      public: true,
      rateLimit: { max: 60, timeWindow: 60 * 1000 },
    },
  })
  async refresh(req: FastifyRequest) {
    const { refreshToken } = refreshBody.parse(req.body);
    return AuthService.refresh(refreshToken);
  }

  @POST("/logout", { config: { public: true } })
  async logout(req: FastifyRequest, reply: FastifyReply) {
    const { refreshToken } = refreshBody.parse(req.body);
    await AuthService.logout(refreshToken);
    return reply.status(204).send();
  }
}

import type { FastifyReply, FastifyRequest } from "fastify";
import { Controller, DELETE, GET, PATCH } from "fastify-decorators";

import { requireUser } from "../../hooks/require-user.js";
import { deleteMeBody, updateMeBody } from "./auth.schemas.js";
import * as AuthService from "./auth.service.js";

@Controller("/api/me")
export default class MeController {
  @GET("/")
  async me(req: FastifyRequest) {
    return AuthService.getMe(requireUser(req).id);
  }

  @PATCH("/")
  async update(req: FastifyRequest) {
    const user = requireUser(req);
    return AuthService.updateMe(user.id, updateMeBody.parse(req.body ?? {}));
  }

  @DELETE("/", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: 15 * 60 * 1000,
        keyGenerator: (req) => req.user?.id ?? req.ip,
      },
    },
  })
  async remove(req: FastifyRequest, reply: FastifyReply) {
    const user = requireUser(req);
    await AuthService.deleteMe(user.id, deleteMeBody.parse(req.body));
    return reply.status(204).send();
  }
}

import type { FastifyReply, FastifyRequest } from "fastify";
import { Controller, DELETE, GET, PATCH, POST } from "fastify-decorators";

import { requireUser } from "../../hooks/require-user.js";
import { HOUR, perUser } from "../../infra/rate-limits.js";
import { idParams } from "../../infra/zod.js";
import {
  createCategoryBody,
  updateCategoryBody,
} from "./categories.schemas.js";
import { CategoriesService } from "./categories.service.js";

@Controller("/api/categories")
export default class CategoriesController {
  @GET("/")
  async list(req: FastifyRequest) {
    return CategoriesService.list(requireUser(req).id);
  }

  @POST("/", { config: { rateLimit: perUser(60, HOUR) } })
  async create(req: FastifyRequest, reply: FastifyReply) {
    const user = requireUser(req);
    const body = createCategoryBody.parse(req.body);
    const category = await CategoriesService.create(user.id, body);
    return reply.status(201).send(category);
  }

  @PATCH("/:id")
  async update(req: FastifyRequest) {
    const user = requireUser(req);
    const { id } = idParams.parse(req.params);
    return CategoriesService.update(
      user.id,
      id,
      updateCategoryBody.parse(req.body ?? {}),
    );
  }

  @DELETE("/:id")
  async remove(req: FastifyRequest, reply: FastifyReply) {
    const user = requireUser(req);
    const { id } = idParams.parse(req.params);
    await CategoriesService.remove(user.id, id);
    return reply.status(204).send();
  }
}

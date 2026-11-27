import type { FastifyReply, FastifyRequest } from "fastify";
import { Controller, DELETE, GET, PATCH, POST } from "fastify-decorators";

import { requireUser } from "../../hooks/require-user.js";
import { HTTP400Error, HTTP415Error } from "../../infra/http-errors.js";
import { HOUR, MINUTE, perUser } from "../../infra/rate-limits.js";
import { idParams } from "../../infra/zod.js";
import {
  createLinkBody,
  createNoteBody,
  listItemsQuery,
  updateItemBody,
  uploadFields,
} from "./items.schemas.js";
import { ItemsService } from "./items.service.js";

@Controller("/api/items")
export default class ItemsController {
  // Only searches (q) cost an embedding call.
  @GET("/", {
    config: {
      rateLimit: perUser(60, MINUTE, {
        onlyWhen: (req) => Boolean((req.query as { q?: string }).q),
      }),
    },
  })
  async list(req: FastifyRequest) {
    const user = requireUser(req);
    return ItemsService.list(user.id, listItemsQuery.parse(req.query));
  }

  @GET("/stats")
  async stats(req: FastifyRequest) {
    return ItemsService.stats(requireUser(req).id);
  }

  @GET("/:id")
  async get(req: FastifyRequest) {
    const user = requireUser(req);
    const { id } = idParams.parse(req.params);
    return ItemsService.get(user.id, id);
  }

  @POST("/upload", { config: { rateLimit: perUser(120, HOUR) } })
  async upload(req: FastifyRequest, reply: FastifyReply) {
    const user = requireUser(req);
    if (!req.isMultipart()) {
      throw new HTTP415Error("Expected multipart/form-data");
    }
    const fields: Record<string, string> = {};
    let file: { buffer: Buffer; truncated: boolean } | null = null;
    for await (const part of req.parts()) {
      if (part.type === "file") {
        if (part.fieldname !== "file" || file) {
          part.file.resume();
          continue;
        }
        const buffer = await part.toBuffer();
        file = { buffer, truncated: part.file.truncated };
      } else if (typeof part.value === "string") {
        fields[part.fieldname] = part.value;
      }
    }
    if (!file) throw new HTTP400Error('Missing "file" field');
    const parsed = uploadFields.parse(fields);
    const { item, created } = await ItemsService.upload(user.id, {
      buffer: file.buffer,
      truncated: file.truncated,
      ...parsed,
    });
    return reply.status(created ? 201 : 200).send(item);
  }

  @POST("/link", { config: { rateLimit: perUser(120, HOUR) } })
  async link(req: FastifyRequest, reply: FastifyReply) {
    const user = requireUser(req);
    const item = await ItemsService.createLink(
      user.id,
      createLinkBody.parse(req.body),
    );
    return reply.status(201).send(item);
  }

  @POST("/note", { config: { rateLimit: perUser(200, HOUR) } })
  async note(req: FastifyRequest, reply: FastifyReply) {
    const user = requireUser(req);
    const item = await ItemsService.createNote(
      user.id,
      createNoteBody.parse(req.body),
    );
    return reply.status(201).send(item);
  }

  @PATCH("/:id")
  async update(req: FastifyRequest) {
    const user = requireUser(req);
    const { id } = idParams.parse(req.params);
    return ItemsService.update(
      user.id,
      id,
      updateItemBody.parse(req.body ?? {}),
    );
  }

  @DELETE("/:id")
  async remove(req: FastifyRequest, reply: FastifyReply) {
    const user = requireUser(req);
    const { id } = idParams.parse(req.params);
    await ItemsService.remove(user.id, id);
    return reply.status(204).send();
  }

  @POST("/:id/reprocess", { config: { rateLimit: perUser(10, HOUR) } })
  async reprocess(req: FastifyRequest) {
    const user = requireUser(req);
    const { id } = idParams.parse(req.params);
    return ItemsService.reprocess(user.id, id);
  }
}

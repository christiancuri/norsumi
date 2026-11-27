import type { FastifyReply, FastifyRequest } from "fastify";
import { Controller, GET } from "fastify-decorators";
import { Types } from "mongoose";
import { z } from "zod";

import { decryptBlob } from "../../infra/crypto.js";
import { Env } from "../../infra/env.js";
import { HTTP403Error, HTTP404Error } from "../../infra/http-errors.js";
import {
  MEDIA_VARIANTS,
  verifyMediaSignature,
} from "../../infra/media-signing.js";
import { blobKey, getBlob } from "../../infra/storage.js";
import { objectId } from "../../infra/zod.js";
import { Item } from "../../models/Item.model.js";
import { getUserDek } from "../users/user-keys.js";

const params = z.object({
  itemId: objectId,
  variant: z.enum(MEDIA_VARIANTS),
});

const query = z.object({
  exp: z.coerce.number().int(),
  sig: z.string().min(10).max(100),
});

@Controller("/api/media")
export default class MediaController {
  /** Public, authorized by the HMAC signature in the URL. */
  @GET("/:itemId/:variant", { config: { public: true } })
  async media(req: FastifyRequest, reply: FastifyReply) {
    const { itemId, variant } = params.parse(req.params);
    const parsedQuery = query.safeParse(req.query);
    if (
      !parsedQuery.success ||
      !verifyMediaSignature(
        Env.MEDIA_SIGNING_SECRET,
        itemId,
        variant,
        parsedQuery.data.exp,
        parsedQuery.data.sig,
      )
    ) {
      throw new HTTP403Error("Invalid or expired media link");
    }

    const item = await Item.findById(new Types.ObjectId(itemId), {
      userId: 1,
      image: 1,
    }).lean();
    if (!item?.image || (variant === "thumb" && !item.image.hasThumb)) {
      throw new HTTP404Error("Media not found");
    }
    const userId = item.userId.toString();
    const sealed = await getBlob(blobKey(userId, itemId, variant)).catch(() => {
      throw new HTTP404Error("Media not found");
    });
    const bytes = decryptBlob(
      await getUserDek(userId),
      sealed,
      itemId,
      variant,
    );

    return reply
      .header(
        "Content-Type",
        variant === "thumb" ? "image/webp" : item.image.mime,
      )
      .header("Content-Length", String(bytes.length))
      .header("Cache-Control", "private, max-age=3600")
      .header("X-Content-Type-Options", "nosniff")
      .header("Content-Security-Policy", "default-src 'none'")
      .send(bytes);
  }
}

import type { Item as ItemDto } from "@norsumi/common";
import type { Types } from "mongoose";

import { Env } from "../../infra/env.js";
import {
  type MediaVariant,
  signedMediaPath,
} from "../../infra/media-signing.js";
import type { IItem } from "../../models/Item.model.js";
import {
  type CategoryMap,
  categoryPath,
} from "../categories/categories.service.js";

export type ItemDoc = IItem & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

/** Every projection that feeds `toItemDto` excludes the embedding. */
export const ITEM_PUBLIC_PROJECTION = { embedding: 0, ai: 0 } as const;

export function mediaUrl(itemId: string, variant: MediaVariant): string {
  return `${Env.PUBLIC_URL}${signedMediaPath(Env.MEDIA_SIGNING_SECRET, itemId, variant)}`;
}

export function toItemDto(doc: ItemDoc, categories: CategoryMap): ItemDto {
  const id = doc._id.toString();
  const path = categoryPath(categories, doc.categoryId);
  return {
    id,
    kind: doc.kind,
    status: doc.status,
    title: doc.title ?? "",
    summary: doc.summary ?? "",
    source: doc.source ?? null,
    categoryPath: path,
    categoryId: path.length > 0 ? (path[path.length - 1]?.id ?? null) : null,
    tags: doc.tags ?? [],
    entities: (doc.entities ?? []).map((e) => ({
      type: e.type,
      name: e.name,
      value: e.value ?? null,
      url: e.url ?? null,
    })),
    text: doc.text ?? null,
    note: doc.note ?? null,
    image: doc.image
      ? {
          width: doc.image.width,
          height: doc.image.height,
          dominantColor: doc.image.dominantColor,
          mime: doc.image.mime,
          bytes: doc.image.bytes,
          thumbUrl: mediaUrl(id, doc.image.hasThumb ? "thumb" : "full"),
          url: mediaUrl(id, "full"),
        }
      : null,
    link: doc.link
      ? {
          url: doc.link.url,
          domain: doc.link.domain,
          siteName: doc.link.siteName ?? null,
          title: doc.link.title ?? null,
          description: doc.link.description ?? null,
          faviconUrl: doc.link.faviconUrl ?? null,
          imageUrl: doc.link.imageUrl ?? null,
        }
      : null,
    favorite: doc.favorite ?? false,
    archived: doc.archived ?? false,
    error: doc.status === "failed" ? (doc.error ?? "Processing failed") : null,
    capturedAt: doc.capturedAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

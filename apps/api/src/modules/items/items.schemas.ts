import {
  DEFAULT_PAGE_SIZE,
  ITEM_KINDS,
  ITEM_STATUSES,
  MAX_PAGE_SIZE,
} from "@norsumi/common";
import { z } from "zod";

import { isoDate, objectId, queryBool } from "../../infra/zod.js";

export const listItemsQuery = z.object({
  categoryId: objectId.optional(),
  includeChildren: queryBool.default(true),
  /** `kind=a`, `kind=a,b` or repeated `kind=a&kind=b`. */
  kind: z
    .union([z.string(), z.array(z.string())])
    .transform((value) =>
      (Array.isArray(value) ? value : [value])
        .flatMap((v) => v.split(","))
        .map((v) => v.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(ITEM_KINDS)).min(1).max(ITEM_KINDS.length))
    .transform((kinds) => [...new Set(kinds)])
    .optional(),
  status: z.enum(ITEM_STATUSES).optional(),
  favorite: queryBool.optional(),
  archived: queryBool.default(false),
  q: z.string().trim().max(200).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});
export type ListItemsQuery = z.infer<typeof listItemsQuery>;

export const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .pipe(z.url({ protocol: /^https?$/, error: "Must be an http(s) URL" }));

export const createLinkBody = z.object({
  url: httpUrl,
  text: z.string().trim().max(10_000).optional(),
  capturedAt: isoDate.optional(),
});

export const createNoteBody = z.object({
  text: z.string().trim().min(1, "Note is empty").max(20_000),
  capturedAt: isoDate.optional(),
});

export const uploadFields = z.object({
  kind: z.enum(["screenshot", "image"]).default("screenshot"),
  capturedAt: isoDate.optional(),
  clientId: z.string().trim().min(1).max(128).optional(),
});

export const updateItemBody = z.object({
  title: z.string().trim().max(200).optional(),
  summary: z.string().trim().max(2000).optional(),
  note: z.string().max(20_000).nullable().optional(),
  categoryId: objectId.nullable().optional(),
  tags: z
    .array(z.string().trim().toLowerCase().min(1).max(40))
    .max(20)
    .transform((tags) => [...new Set(tags)])
    .optional(),
  favorite: z.boolean().optional(),
  archived: z.boolean().optional(),
});
export type UpdateItemBody = z.infer<typeof updateItemBody>;

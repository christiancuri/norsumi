import { createHash } from "node:crypto";

import type {
  Item as ItemDto,
  ItemKind,
  ItemListResponse,
  LibraryStats,
} from "@norsumi/common";
import { type QueryFilter, Types } from "mongoose";

import { encryptBlob } from "../../infra/crypto.js";
import {
  HTTP400Error,
  HTTP404Error,
  HTTP413Error,
  HTTP415Error,
} from "../../infra/http-errors.js";
import { createLogger } from "../../infra/logger.js";
import { isDuplicateKeyError } from "../../infra/mongoose.js";
import { blobKey, deleteItemBlobs, putBlob } from "../../infra/storage.js";
import { Category } from "../../models/Category.model.js";
import {
  type EditableAiField,
  type IItem,
  Item,
} from "../../models/Item.model.js";
import { Worker } from "../../worker/worker.js";
import {
  loadCategoryMap,
  pruneEmptyAiCategories,
} from "../categories/categories.service.js";
import { domainOf } from "../links/page.js";
import { consumeAiBudget } from "../usage/ai-budget.js";
import { getUserDek } from "../users/user-keys.js";
import { detectImageMime, ImageDecodeError, processImage } from "./image.js";
import { newNoteFields } from "./item-fields.js";
import {
  ITEM_PUBLIC_PROJECTION,
  type ItemDoc,
  toItemDto,
} from "./items.mapper.js";
import type { ListItemsQuery, UpdateItemBody } from "./items.schemas.js";
import { reembed, searchItems } from "./search.service.js";

const log = createLogger("items");

function oid(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

async function findOwned(userId: string, itemId: string): Promise<ItemDoc> {
  const doc = await Item.findOne(
    { _id: oid(itemId), userId: oid(userId) },
    ITEM_PUBLIC_PROJECTION,
  ).lean<ItemDoc>();
  if (!doc) throw new HTTP404Error("Item not found");
  return doc;
}

async function toDto(userId: string, doc: ItemDoc): Promise<ItemDto> {
  return toItemDto(doc, await loadCategoryMap(userId));
}

export async function get(userId: string, itemId: string): Promise<ItemDto> {
  return toDto(userId, await findOwned(userId, itemId));
}

// ---------------------------------------------------------------- listing

interface Cursor {
  c: number;
  i: string;
}

function encodeCursor(doc: ItemDoc): string {
  const cursor: Cursor = { c: doc.capturedAt.getTime(), i: doc._id.toString() };
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(value: string): Cursor {
  try {
    const cursor = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Cursor;
    if (typeof cursor.c !== "number" || !/^[0-9a-f]{24}$/.test(cursor.i)) {
      throw new Error("bad cursor");
    }
    return cursor;
  } catch {
    throw new HTTP400Error("Invalid cursor");
  }
}

async function buildFilter(
  userId: string,
  query: ListItemsQuery,
): Promise<QueryFilter<IItem>> {
  const filter: QueryFilter<IItem> = {
    userId: oid(userId),
    archived: query.archived,
  };
  if (query.kind) filter.kind = { $in: query.kind };
  if (query.status) filter.status = query.status;
  if (query.favorite !== undefined) filter.favorite = query.favorite;
  if (query.categoryId) {
    const ids = [oid(query.categoryId)];
    if (query.includeChildren) {
      const children = await Category.find(
        { userId: oid(userId), parentId: oid(query.categoryId) },
        { _id: 1 },
      ).lean();
      ids.push(...children.map((c) => c._id));
    }
    filter.categoryId = { $in: ids };
  }
  return filter;
}

export async function list(
  userId: string,
  query: ListItemsQuery,
): Promise<ItemListResponse> {
  const filter = await buildFilter(userId, query);
  const categories = await loadCategoryMap(userId);

  if (query.q) {
    const docs = await searchItems(userId, filter, query.q, query.limit);
    return {
      items: docs.map((d) => toItemDto(d, categories)),
      nextCursor: null,
    };
  }

  if (query.cursor) {
    const cursor = decodeCursor(query.cursor);
    const at = new Date(cursor.c);
    filter.$or = [
      { capturedAt: { $lt: at } },
      { capturedAt: at, _id: { $lt: oid(cursor.i) } },
    ];
  }
  const docs = await Item.find(filter, ITEM_PUBLIC_PROJECTION)
    .sort({ capturedAt: -1, _id: -1 })
    .limit(query.limit + 1)
    .lean<ItemDoc[]>();
  const page = docs.slice(0, query.limit);
  const last = page[page.length - 1];
  return {
    items: page.map((d) => toItemDto(d, categories)),
    nextCursor: docs.length > query.limit && last ? encodeCursor(last) : null,
  };
}

export async function stats(userId: string): Promise<LibraryStats> {
  const active = { $match: { archived: false } };
  const [row] = await Item.aggregate<{
    total: Array<{ n: number }>;
    byKind: Array<{ _id: ItemKind; n: number }>;
    favorites: Array<{ n: number }>;
    processing: Array<{ n: number }>;
    failed: Array<{ n: number }>;
    uncategorized: Array<{ n: number }>;
    archived: Array<{ n: number }>;
  }>([
    { $match: { userId: oid(userId) } },
    {
      $facet: {
        total: [active, { $count: "n" }],
        byKind: [active, { $group: { _id: "$kind", n: { $sum: 1 } } }],
        favorites: [active, { $match: { favorite: true } }, { $count: "n" }],
        processing: [
          active,
          { $match: { status: { $in: ["pending", "processing"] } } },
          { $count: "n" },
        ],
        failed: [active, { $match: { status: "failed" } }, { $count: "n" }],
        uncategorized: [
          active,
          { $match: { categoryId: null } },
          { $count: "n" },
        ],
        archived: [{ $match: { archived: true } }, { $count: "n" }],
      },
    },
  ]);
  const count = (rows?: Array<{ n: number }>) => rows?.[0]?.n ?? 0;
  const byKind: Record<ItemKind, number> = {
    screenshot: 0,
    image: 0,
    link: 0,
    note: 0,
  };
  for (const k of row?.byKind ?? []) byKind[k._id] = k.n;
  return {
    total: count(row?.total),
    byKind,
    favorites: count(row?.favorites),
    processing: count(row?.processing),
    failed: count(row?.failed),
    uncategorized: count(row?.uncategorized),
    archived: count(row?.archived),
  };
}

// ---------------------------------------------------------------- creation

export interface UploadInput {
  buffer: Buffer;
  truncated: boolean;
  kind: "screenshot" | "image";
  capturedAt?: Date;
  clientId?: string;
}

async function findDuplicate(
  userId: string,
  sha256: string,
  clientId?: string,
): Promise<ItemDoc | null> {
  const or: QueryFilter<IItem>[] = [{ sha256 }];
  if (clientId) or.push({ clientId });
  return Item.findOne(
    { userId: oid(userId), $or: or },
    ITEM_PUBLIC_PROJECTION,
  ).lean<ItemDoc>();
}

export async function upload(
  userId: string,
  input: UploadInput,
): Promise<{ item: ItemDto; created: boolean }> {
  if (input.truncated) throw new HTTP413Error("File is too large");
  if (input.buffer.length === 0) throw new HTTP400Error("File is empty");
  const mime = detectImageMime(input.buffer);
  if (!mime) {
    throw new HTTP415Error("Unsupported image type (PNG, JPEG, WebP or HEIC)");
  }

  const sha256 = createHash("sha256").update(input.buffer).digest("hex");
  const existing = await findDuplicate(userId, sha256, input.clientId);
  if (existing) return { item: await toDto(userId, existing), created: false };

  await consumeAiBudget(userId);
  const itemId = new Types.ObjectId();
  const id = itemId.toString();

  let processed: Awaited<ReturnType<typeof processImage>>;
  try {
    processed = await processImage(input.buffer, mime);
  } catch (error) {
    if (error instanceof ImageDecodeError)
      throw new HTTP400Error(error.message);
    throw error;
  }

  // Dedupe stays on the original bytes; `full` may be a HEIC→JPEG copy.
  const dek = await getUserDek(userId);
  await Promise.all([
    putBlob(
      blobKey(userId, id, "full"),
      encryptBlob(dek, processed.full.bytes, id, "full"),
    ),
    putBlob(
      blobKey(userId, id, "thumb"),
      encryptBlob(dek, processed.thumb, id, "thumb"),
    ),
  ]);

  try {
    const doc = await Item.create({
      _id: itemId,
      userId: oid(userId),
      kind: input.kind,
      status: "pending",
      capturedAt: input.capturedAt ?? new Date(),
      sha256,
      ...(input.clientId && { clientId: input.clientId }),
      image: {
        width: processed.width,
        height: processed.height,
        dominantColor: processed.dominantColor,
        mime: processed.full.mime,
        bytes: processed.full.bytes.length,
        hasThumb: true,
      },
    });
    Worker.kick();
    log.info(
      {
        itemId: id,
        bytes: processed.full.bytes.length,
        mime,
        stored: processed.full.mime,
      },
      "Image uploaded",
    );
    return {
      item: await toDto(userId, doc.toObject() as ItemDoc),
      created: true,
    };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    // Lost a race with the same upload: keep the winner.
    await deleteItemBlobs(userId, id).catch(() => undefined);
    const winner = await findDuplicate(userId, sha256, input.clientId);
    if (!winner) throw error;
    return { item: await toDto(userId, winner), created: false };
  }
}

export async function createLink(
  userId: string,
  body: { url: string; text?: string; capturedAt?: Date },
): Promise<ItemDto> {
  await consumeAiBudget(userId);
  const url = new URL(body.url);
  url.hash = "";
  const doc = await Item.create({
    userId: oid(userId),
    kind: "link",
    status: "pending",
    capturedAt: body.capturedAt ?? new Date(),
    sharedText: body.text || null,
    link: { url: url.toString(), domain: domainOf(url.toString()) },
  });
  Worker.kick();
  return toDto(userId, doc.toObject() as ItemDoc);
}

export async function createNote(
  userId: string,
  body: { text: string; capturedAt?: Date },
): Promise<ItemDto> {
  await consumeAiBudget(userId);
  const doc = await Item.create(newNoteFields(userId, body));
  Worker.kick();
  return toDto(userId, doc.toObject() as ItemDoc);
}

// ---------------------------------------------------------------- updates

const EMBEDDED_FIELDS = ["title", "summary", "tags", "note"] as const;

export async function update(
  userId: string,
  itemId: string,
  body: UpdateItemBody,
): Promise<ItemDto> {
  const current = await findOwned(userId, itemId);
  const set: Record<string, unknown> = {};
  const edited: EditableAiField[] = [];

  if (body.title !== undefined) {
    set.title = body.title;
    edited.push("title");
  }
  if (body.summary !== undefined) {
    set.summary = body.summary;
    edited.push("summary");
  }
  if (body.tags !== undefined) {
    set.tags = body.tags;
    edited.push("tags");
  }
  if (body.categoryId !== undefined) {
    if (body.categoryId) {
      const exists = await Category.exists({
        _id: oid(body.categoryId),
        userId: oid(userId),
      });
      if (!exists) throw new HTTP404Error("Category not found");
    }
    set.categoryId = body.categoryId ? oid(body.categoryId) : null;
    edited.push("categoryId");
  }
  if (body.note !== undefined) set.note = body.note;
  if (body.favorite !== undefined) set.favorite = body.favorite;
  if (body.archived !== undefined) set.archived = body.archived;

  const doc = await Item.findOneAndUpdate(
    { _id: current._id, userId: oid(userId) },
    {
      $set: set,
      ...(edited.length > 0 && {
        $addToSet: { editedFields: { $each: edited } },
      }),
    },
    { returnDocument: "after", projection: ITEM_PUBLIC_PROJECTION },
  ).lean<ItemDoc>();
  if (!doc) throw new HTTP404Error("Item not found");

  if (
    doc.status === "ready" &&
    EMBEDDED_FIELDS.some((f) => body[f] !== undefined)
  ) {
    void reembed(doc._id.toString());
  }
  // Moving an item can leave its previous AI category empty.
  if (
    body.categoryId !== undefined &&
    String(current.categoryId ?? "") !== String(doc.categoryId ?? "")
  ) {
    await pruneEmptyAiCategories(userId);
  }
  return toDto(userId, doc);
}

export async function remove(userId: string, itemId: string): Promise<void> {
  const current = await findOwned(userId, itemId);
  if (current.image) await deleteItemBlobs(userId, itemId);
  await Item.deleteOne({ _id: current._id, userId: oid(userId) });
  if (current.categoryId) await pruneEmptyAiCategories(userId);
}

/** Back to the queue; an explicit reprocess overwrites user edits. */
export async function reprocess(
  userId: string,
  itemId: string,
): Promise<ItemDto> {
  await findOwned(userId, itemId);
  await consumeAiBudget(userId);
  const doc = await Item.findOneAndUpdate(
    { _id: oid(itemId), userId: oid(userId) },
    {
      $set: {
        status: "pending",
        error: null,
        attempts: 0,
        nextAttemptAt: null,
        claimedAt: null,
        editedFields: [],
      },
    },
    { returnDocument: "after", projection: ITEM_PUBLIC_PROJECTION },
  ).lean<ItemDoc>();
  if (!doc) throw new HTTP404Error("Item not found");
  Worker.kick();
  return toDto(userId, doc);
}

import type {
  CategoryColor,
  Category as CategoryDto,
  CategoryRef,
} from "@norsumi/common";
import { Types } from "mongoose";

import {
  HTTP400Error,
  HTTP404Error,
  HTTP409Error,
} from "../../infra/http-errors.js";
import { createLogger } from "../../infra/logger.js";
import { isDuplicateKeyError } from "../../infra/mongoose.js";
import { Category } from "../../models/Category.model.js";
import { Item } from "../../models/Item.model.js";
import {
  cleanColor,
  cleanEmoji,
  cleanName,
  nameKey,
  slugify,
} from "./categories.names.js";
import { prunableCategoryIds } from "./prune.js";

const log = createLogger("categories");

export interface CategoryDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  parentId?: Types.ObjectId | null;
  name: string;
  nameKey: string;
  slug: string;
  emoji: string;
  color: CategoryColor;
  description?: string | null;
  /** Missing on documents from before origins existed: treated as "ai". */
  origin?: "ai" | "user";
  createdAt?: Date;
  updatedAt?: Date;
}

export type CategoryMap = Map<string, CategoryDoc>;

function toDto(doc: CategoryDoc, itemCount: number): CategoryDto {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    parentId: doc.parentId ? doc.parentId.toString() : null,
    emoji: doc.emoji,
    color: doc.color,
    description: doc.description ?? null,
    itemCount,
    origin: doc.origin ?? "ai",
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
    updatedAt: (doc.updatedAt ?? new Date()).toISOString(),
  };
}

export function toRef(doc: CategoryDoc): CategoryRef {
  return {
    id: doc._id.toString(),
    name: doc.name,
    emoji: doc.emoji,
    color: doc.color,
  };
}

export async function loadCategories(userId: string): Promise<CategoryDoc[]> {
  return Category.find({ userId: new Types.ObjectId(userId) })
    .sort({ name: 1 })
    .lean<CategoryDoc[]>();
}

export async function loadCategoryMap(userId: string): Promise<CategoryMap> {
  const docs = await loadCategories(userId);
  return new Map(docs.map((doc) => [doc._id.toString(), doc]));
}

/** Breadcrumb root → leaf for an item's leaf category. */
export function categoryPath(
  map: CategoryMap,
  categoryId: Types.ObjectId | string | null | undefined,
): CategoryRef[] {
  if (!categoryId) return [];
  const leaf = map.get(categoryId.toString());
  if (!leaf) return [];
  const parent = leaf.parentId ? map.get(leaf.parentId.toString()) : undefined;
  return parent ? [toRef(parent), toRef(leaf)] : [toRef(leaf)];
}

async function itemCounts(userId: string): Promise<Map<string, number>> {
  const rows = await Item.aggregate<{ _id: Types.ObjectId; n: number }>([
    {
      $match: {
        userId: new Types.ObjectId(userId),
        categoryId: { $ne: null },
        archived: false,
      },
    },
    { $group: { _id: "$categoryId", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.n]));
}

export async function list(userId: string): Promise<CategoryDto[]> {
  const [docs, counts] = await Promise.all([
    loadCategories(userId),
    itemCounts(userId),
  ]);
  return docs.map((doc) => toDto(doc, counts.get(doc._id.toString()) ?? 0));
}

async function getOwned(userId: string, id: string): Promise<CategoryDoc> {
  const doc = await Category.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  }).lean<CategoryDoc>();
  if (!doc) throw new HTTP404Error("Category not found");
  return doc;
}

/** A parent must be one of the user's roots (max depth 2). */
async function assertValidParent(
  userId: string,
  parentId: string,
): Promise<void> {
  const parent = await getOwned(userId, parentId);
  if (parent.parentId) {
    throw new HTTP400Error("Categories can only be two levels deep");
  }
}

async function countOne(userId: string, id: Types.ObjectId): Promise<number> {
  return Item.countDocuments({
    userId: new Types.ObjectId(userId),
    categoryId: id,
    archived: false,
  });
}

/** Creates a category; slug collisions among siblings get a suffix. */
async function insert(
  userId: string,
  fields: {
    name: string;
    parentId: string | null;
    emoji?: string | null;
    color?: string | null;
    description?: string | null;
    origin: "ai" | "user";
  },
): Promise<CategoryDoc> {
  const name = cleanName(fields.name);
  if (!name) throw new HTTP400Error("Name is required");
  const parentId = fields.parentId ? new Types.ObjectId(fields.parentId) : null;
  const owner = new Types.ObjectId(userId);
  let slug = slugify(name);
  if (await Category.exists({ userId: owner, parentId, slug })) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }
  try {
    const doc = await Category.create({
      userId: owner,
      parentId,
      name,
      nameKey: nameKey(name),
      slug,
      emoji: cleanEmoji(fields.emoji),
      color: cleanColor(fields.color, name),
      description: fields.description?.trim().slice(0, 200) || null,
      origin: fields.origin,
    });
    return doc.toObject() as CategoryDoc;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new HTTP409Error("A category with this name already exists here");
    }
    throw error;
  }
}

export async function create(
  userId: string,
  body: {
    name: string;
    parentId?: string | null;
    emoji?: string;
    color?: CategoryColor;
    description?: string | null;
  },
): Promise<CategoryDto> {
  if (body.parentId) await assertValidParent(userId, body.parentId);
  const doc = await insert(userId, {
    ...body,
    parentId: body.parentId ?? null,
    origin: "user",
  });
  return toDto(doc, 0);
}

export async function update(
  userId: string,
  id: string,
  body: {
    name?: string;
    parentId?: string | null;
    emoji?: string;
    color?: CategoryColor;
    description?: string | null;
  },
): Promise<CategoryDto> {
  const current = await getOwned(userId, id);
  const set: Record<string, unknown> = {};

  if (body.parentId !== undefined) {
    const nextParent = body.parentId;
    if (nextParent === id)
      throw new HTTP400Error("A category cannot be its own parent");
    if (nextParent) {
      await assertValidParent(userId, nextParent);
      const hasChildren = await Category.exists({
        userId: current.userId,
        parentId: current._id,
      });
      if (hasChildren) {
        throw new HTTP400Error("Categories can only be two levels deep");
      }
    }
    set.parentId = nextParent ? new Types.ObjectId(nextParent) : null;
  }
  if (body.name !== undefined) {
    const name = cleanName(body.name);
    set.name = name;
    set.nameKey = nameKey(name);
    set.slug = slugify(name);
  }
  if (body.emoji !== undefined) set.emoji = cleanEmoji(body.emoji);
  // A user-shaped AI category is the user's now: it is never auto-removed.
  if (
    body.name !== undefined ||
    body.emoji !== undefined ||
    body.color !== undefined
  ) {
    set.origin = "user";
  }
  if (body.color !== undefined) set.color = body.color;
  if (body.description !== undefined) {
    set.description = body.description?.trim() || null;
  }

  try {
    const doc = await Category.findOneAndUpdate(
      { _id: current._id, userId: current.userId },
      { $set: set },
      { returnDocument: "after" },
    ).lean<CategoryDoc>();
    if (!doc) throw new HTTP404Error("Category not found");
    return toDto(doc, await countOne(userId, doc._id));
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new HTTP409Error("A category with this name already exists here");
    }
    throw error;
  }
}

/** Deletes a category (and its children); their items become uncategorized. */
export async function remove(userId: string, id: string): Promise<void> {
  const current = await getOwned(userId, id);
  const children = await Category.find(
    { userId: current.userId, parentId: current._id },
    { _id: 1 },
  ).lean();
  const ids = [current._id, ...children.map((c) => c._id)];
  await Item.updateMany(
    { userId: current.userId, categoryId: { $in: ids } },
    { $set: { categoryId: null } },
  );
  await Category.deleteMany({ userId: current.userId, _id: { $in: ids } });
  // Deleting a child may leave an AI root empty.
  await pruneEmptyAiCategories(userId);
}

export interface AiCategorySuggestion {
  id: string | null;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

async function findOrCreate(
  userId: string,
  parentId: string | null,
  suggestion: AiCategorySuggestion,
): Promise<CategoryDoc> {
  const owner = new Types.ObjectId(userId);
  const parent = parentId ? new Types.ObjectId(parentId) : null;
  const key = nameKey(cleanName(suggestion.name));
  const existing = await Category.findOne({
    userId: owner,
    parentId: parent,
    nameKey: key,
  }).lean<CategoryDoc>();
  if (existing) return existing;
  try {
    const created = await insert(userId, {
      name: suggestion.name,
      parentId,
      emoji: suggestion.emoji,
      color: suggestion.color,
      description: suggestion.description,
      origin: "ai",
    });
    log.info(
      { userId, categoryId: created._id.toString(), child: Boolean(parentId) },
      "AI created category",
    );
    return created;
  } catch (error) {
    // Another worker created it concurrently.
    const raced = await Category.findOne({
      userId: owner,
      parentId: parent,
      nameKey: key,
    }).lean<CategoryDoc>();
    if (raced) return raced;
    throw error;
  }
}

/**
 * Maps the model's suggested path onto the user's tree: reuse by id when
 * the id fits the position, else by normalized name among siblings, else
 * create. Returns the leaf id (or null when the path is empty/invalid).
 */
export async function resolveAiPath(
  userId: string,
  path: AiCategorySuggestion[],
): Promise<string | null> {
  const clean = path.filter((p) => cleanName(p.name)).slice(0, 2);
  if (clean.length === 0) return null;
  const map = await loadCategoryMap(userId);

  const [rootSuggestion, childSuggestion] = clean as [
    AiCategorySuggestion,
    AiCategorySuggestion | undefined,
  ];

  // An id is trusted only when its name agrees with the suggested name
  // (the prompt asks to copy the exact name when reusing); otherwise the
  // name wins, so a stray id cannot pull an item under the wrong root.
  const sameName = (
    doc: CategoryDoc | undefined,
    suggestion: AiCategorySuggestion,
  ) => doc !== undefined && doc.nameKey === nameKey(cleanName(suggestion.name));

  let root: CategoryDoc | undefined;
  const byId = rootSuggestion.id ? map.get(rootSuggestion.id) : undefined;
  // A child id in root position is ignored: its parent may be another
  // platform, so the name is resolved among roots instead.
  if (sameName(byId, rootSuggestion) && byId && !byId.parentId) root = byId;
  root ??= await findOrCreate(userId, null, rootSuggestion);
  if (!childSuggestion) return root._id.toString();

  const childById = childSuggestion.id
    ? map.get(childSuggestion.id)
    : undefined;
  if (
    sameName(childById, childSuggestion) &&
    childById?.parentId?.toString() === root._id.toString()
  ) {
    return childById._id.toString();
  }
  const child = await findOrCreate(
    userId,
    root._id.toString(),
    childSuggestion,
  );
  return child._id.toString();
}

/**
 * Deletes the user's empty AI categories (see prune.ts). Called after an
 * item leaves a category: delete, move, reprocess, category delete. Cheap:
 * one distinct over the user's items and one small category read.
 */
export async function pruneEmptyAiCategories(userId: string): Promise<number> {
  const owner = new Types.ObjectId(userId);
  const [categories, used] = await Promise.all([
    Category.find({ userId: owner }, { _id: 1, parentId: 1, origin: 1 }).lean<
      Array<{
        _id: Types.ObjectId;
        parentId?: Types.ObjectId | null;
        origin?: "ai" | "user";
      }>
    >(),
    Item.distinct("categoryId", { userId: owner, categoryId: { $ne: null } }),
  ]);
  const ids = prunableCategoryIds(
    categories.map((c) => ({
      id: c._id.toString(),
      parentId: c.parentId ? c.parentId.toString() : null,
      origin: c.origin,
    })),
    new Set(used.map((id) => String(id))),
  );
  if (ids.length === 0) return 0;
  // Re-assert at delete time: never a user category, never one in use.
  const res = await Category.deleteMany({
    userId: owner,
    _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
    origin: { $ne: "user" },
  });
  if (res.deletedCount > 0) {
    log.info({ userId, count: res.deletedCount }, "Pruned empty AI categories");
  }
  return res.deletedCount;
}

export * as CategoriesService from "./categories.service.js";

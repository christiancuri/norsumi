import { type QueryFilter, Types } from "mongoose";

import { createLogger } from "../../infra/logger.js";
import { type IItem, Item } from "../../models/Item.model.js";
import { AiService } from "../ai/ai.service.js";
import { ITEM_PUBLIC_PROJECTION, type ItemDoc } from "./items.mapper.js";
import {
  cosine,
  fromStoredVector,
  type RankInput,
  rankHybrid,
  toFloat32Buffer,
} from "./vector.js";

const log = createLogger("search");

const KEYWORD_CANDIDATES = 200;
/** Personal-scale libraries: rank the most recent N vectors in-app. */
const SEMANTIC_SCAN_LIMIT = 5000;
const EMBED_INPUT_MAX = 8000;
const REGEX_SCORE = 0.5;
/** Search answers one ranked page (nextCursor is always null). */
export const MAX_SEARCH_RESULTS = 60;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Text that represents an item for semantic search. */
export function embeddingInput(doc: {
  title?: string;
  summary?: string;
  tags?: string[];
  source?: string | null;
  text?: string | null;
  note?: string | null;
}): string {
  return [
    doc.title,
    doc.summary,
    doc.source,
    doc.tags?.length ? doc.tags.join(", ") : "",
    doc.note,
    doc.text,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, EMBED_INPUT_MAX);
}

/** Recomputes an item's embedding after a user edit (best effort). */
export async function reembed(itemId: string): Promise<void> {
  try {
    const doc = await Item.findById(
      itemId,
      ITEM_PUBLIC_PROJECTION,
    ).lean<ItemDoc>();
    if (!doc) return;
    const { vector } = await AiService.embed(embeddingInput(doc), "reembed");
    await Item.updateOne(
      { _id: doc._id },
      { $set: { embedding: toFloat32Buffer(vector) } },
    );
  } catch (error) {
    log.warn({ err: error, itemId }, "Re-embedding failed");
  }
}

async function keywordCandidates(
  filter: QueryFilter<IItem>,
  q: string,
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  const textHits = await Item.find(
    { ...filter, $text: { $search: q } },
    { _id: 1, score: { $meta: "textScore" } },
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(KEYWORD_CANDIDATES)
    .lean<Array<{ _id: Types.ObjectId; score: number }>>();
  const max = Math.max(0, ...textHits.map((h) => h.score));
  for (const hit of textHits) {
    scores.set(hit._id.toString(), max > 0 ? hit.score / max : 0);
  }

  // Substring match catches partial words ("restau") the text index misses.
  const rx = new RegExp(escapeRegex(q), "i");
  const regexHits = await Item.find(
    {
      ...filter,
      $or: [
        { title: rx },
        { tags: rx },
        { source: rx },
        { "entities.name": rx },
        { "link.domain": rx },
      ],
    },
    { _id: 1 },
  )
    .sort({ capturedAt: -1 })
    .limit(KEYWORD_CANDIDATES)
    .lean();
  for (const hit of regexHits) {
    const id = hit._id.toString();
    scores.set(id, Math.max(scores.get(id) ?? 0, REGEX_SCORE));
  }
  return scores;
}

/** Query embeddings are reused for a while (typing, paging, refetches). */
const QUERY_CACHE_LIMIT = 200;
const QUERY_CACHE_TTL_MS = 30 * 60 * 1000;
/** Past this, search answers keyword-only rather than keep the user waiting. */
const QUERY_EMBED_TIMEOUT_MS = 3_000;
const queryCache = new Map<string, { vector: number[]; at: number }>();

async function queryEmbedding(q: string): Promise<number[] | null> {
  const key = q.toLowerCase();
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.at < QUERY_CACHE_TTL_MS)
    return cached.vector;
  try {
    const { vector } = await AiService.embed(q, "search", {
      timeoutMs: QUERY_EMBED_TIMEOUT_MS,
      // Interactive: no SDK retry, fall back to keyword search instead.
      maxRetries: 0,
    });
    if (queryCache.size >= QUERY_CACHE_LIMIT) {
      const oldest = queryCache.keys().next().value;
      if (oldest !== undefined) queryCache.delete(oldest);
    }
    queryCache.set(key, { vector, at: Date.now() });
    return vector;
  } catch (error) {
    log.warn(
      { err: (error as Error).message },
      "Query embedding failed, keyword-only search",
    );
    return null;
  }
}

async function semanticScores(
  filter: QueryFilter<IItem>,
  q: string,
): Promise<Map<string, number> | null> {
  // The vector scan does not depend on the query: run both at once.
  const [query, rows] = await Promise.all([
    queryEmbedding(q),
    Item.find(
      { ...filter, embedding: { $exists: true, $ne: null } },
      { _id: 1, embedding: 1 },
    )
      .sort({ capturedAt: -1 })
      .limit(SEMANTIC_SCAN_LIMIT)
      .lean<Array<{ _id: Types.ObjectId; embedding?: unknown }>>(),
  ]);
  if (!query) return null;
  const scores = new Map<string, number>();
  for (const row of rows) {
    const vector = fromStoredVector(row.embedding);
    if (vector) scores.set(row._id.toString(), cosine(query, vector));
  }
  return scores;
}

/** Hybrid keyword + semantic search, best first. */
export async function searchItems(
  userId: string,
  filter: QueryFilter<IItem>,
  q: string,
  limit: number,
): Promise<ItemDoc[]> {
  const scoped = { ...filter, userId: new Types.ObjectId(userId) };
  const [keyword, semantic] = await Promise.all([
    keywordCandidates(scoped, q),
    semanticScores(scoped, q),
  ]);

  const ids = new Set([...keyword.keys(), ...(semantic?.keys() ?? [])]);
  const candidates: RankInput[] = [...ids].map((id) => ({
    id,
    keyword: keyword.get(id) ?? 0,
    semantic: semantic?.get(id) ?? null,
  }));
  const ranked = rankHybrid(candidates).slice(
    0,
    Math.min(limit, MAX_SEARCH_RESULTS),
  );
  if (ranked.length === 0) return [];

  const docs = await Item.find(
    {
      _id: { $in: ranked.map((r) => new Types.ObjectId(r.id)) },
      userId: scoped.userId,
    },
    ITEM_PUBLIC_PROJECTION,
  ).lean<ItemDoc[]>();
  const byId = new Map(docs.map((d) => [d._id.toString(), d]));
  return ranked.flatMap((r) => byId.get(r.id) ?? []);
}

export * as SearchService from "./search.service.js";

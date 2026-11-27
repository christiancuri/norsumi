import { Types } from "mongoose";

import { decryptBlob } from "../infra/crypto.js";
import { createLogger } from "../infra/logger.js";
import { BlockedUrlError } from "../infra/safe-fetch.js";
import { blobKey, getBlob } from "../infra/storage.js";
import { Category } from "../models/Category.model.js";
import { type EditableAiField, Item } from "../models/Item.model.js";
import {
  AiService,
  type AiUsage,
  type AnalysisResult,
} from "../modules/ai/ai.service.js";
import {
  type AiCategorySuggestion,
  pruneEmptyAiCategories,
  resolveAiPath,
} from "../modules/categories/categories.service.js";
import {
  applyFixedRoot,
  fixedRoot,
} from "../modules/categories/fixed-roots.js";
import { detectImageMime, toVisionJpeg } from "../modules/items/image.js";
import type { ItemDoc } from "../modules/items/items.mapper.js";
import { SearchService } from "../modules/items/search.service.js";
import { toFloat32Buffer } from "../modules/items/vector.js";
import {
  fetchPage,
  MAX_PAGE_TEXT,
  type PageInfo,
} from "../modules/links/page.js";
import { userExists } from "../modules/users/user-exists.js";
import { getUserDek } from "../modules/users/user-keys.js";

const log = createLogger("pipeline");

/** A failure retrying will not fix; message is shown to the user. */
export class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentError";
  }
}

async function processImageItem(
  item: ItemDoc,
  userId: string,
): Promise<AnalysisResult> {
  const id = item._id.toString();
  const sealed = await getBlob(blobKey(userId, id, "full"));
  const original = decryptBlob(await getUserDek(userId), sealed, id, "full");
  const mime = detectImageMime(original);
  if (!mime) throw new PermanentError("Unsupported image type");
  let jpeg: Buffer;
  try {
    jpeg = await toVisionJpeg(original, mime);
  } catch (error) {
    throw new PermanentError(
      error instanceof Error && error.name === "ImageDecodeError"
        ? error.message
        : "The image could not be decoded",
    );
  }
  return AiService.analyzeImage(
    userId,
    item.kind as "screenshot" | "image",
    jpeg,
    item.capturedAt,
  );
}

async function processLinkItem(
  item: ItemDoc,
  userId: string,
): Promise<{ result: AnalysisResult; page: PageInfo | null }> {
  const link = item.link;
  if (!link) throw new PermanentError("Link item without URL");
  let page: PageInfo | null = null;
  let fetchNote: string | null = null;
  try {
    page = await fetchPage(link.url);
    if (page.status >= 400) {
      fetchNote = `The page answered HTTP ${page.status}; rely on the URL and any shared text.`;
    }
  } catch (error) {
    if (error instanceof BlockedUrlError) {
      throw new PermanentError(
        "This link points to a private or disallowed address and was not fetched.",
      );
    }
    // Unreachable pages still get a best-effort description from the URL.
    fetchNote =
      "The page could not be fetched; describe it from the URL and any shared text.";
    log.info(
      { itemId: item._id.toString(), err: (error as Error).name },
      "Link fetch failed",
    );
  }
  const result = await AiService.analyzeLink(userId, {
    kind: "link",
    capturedAt: item.capturedAt,
    url: page?.url ?? link.url,
    domain: link.domain,
    siteName: page?.siteName ?? null,
    title: page?.title ?? null,
    description: page?.description ?? null,
    sharedText: item.sharedText ?? null,
    pageText: page?.text?.slice(0, MAX_PAGE_TEXT) ?? null,
    fetchNote,
    fixedRoot: fixedRoot("link", page?.url ?? link.url)?.name ?? "Web",
  });
  return { result, page };
}

/**
 * Runs the AI pipeline for a claimed item and writes the result, unless the
 * claim was lost (reprocessed, deleted or recovered as stale meanwhile).
 * Returns false when the result was discarded.
 */
export async function processItem(
  item: ItemDoc,
  claimedAt: Date,
): Promise<{ written: boolean; usage: AiUsage }> {
  const userId = item.userId.toString();
  const set: Record<string, unknown> = {};
  let run: AnalysisResult;
  // Final URL after redirects decides a link's platform root.
  let rootUrl = item.link?.url ?? null;

  if (item.kind === "screenshot" || item.kind === "image") {
    run = await processImageItem(item, userId);
    set.text = run.analysis.text;
  } else if (item.kind === "link") {
    const link = await processLinkItem(item, userId);
    run = link.result;
    if (link.page) {
      const page = link.page;
      rootUrl = page.url;
      set["link.siteName"] = page.siteName;
      set["link.title"] = page.title;
      set["link.description"] = page.description;
      set["link.faviconUrl"] = page.faviconUrl;
      set["link.imageUrl"] = page.imageUrl;
      set.text = page.text
        ? page.text.slice(0, 4000)
        : (item.sharedText ?? null);
    } else {
      set.text = item.sharedText ?? null;
    }
  } else {
    // Note body is the content (`text`); older docs kept it in `note`.
    run = await AiService.analyzeNote(
      userId,
      item.text ?? item.note ?? "",
      item.capturedAt,
    );
  }
  const { analysis } = run;
  const usage: AiUsage = { ...run.usage };

  // Read edits as late as possible: the user may have edited meanwhile.
  const fresh = await Item.findById(item._id, {
    editedFields: 1,
    categoryId: 1,
  }).lean();
  if (!fresh) return { written: false, usage };
  const edited = new Set<EditableAiField>(fresh.editedFields ?? []);

  if (!edited.has("title")) set.title = analysis.title;
  if (!edited.has("summary")) set.summary = analysis.summary;
  if (!edited.has("tags")) set.tags = analysis.tags;
  set.source =
    analysis.source ??
    (item.kind === "link" ? (item.link?.domain ?? null) : null);
  set.entities = analysis.entities;
  let aiPath: AiCategorySuggestion[] | null = null;
  // The account may have been deleted while the AI ran: write nothing
  // (in particular, no categories that would outlive the purge).
  if (!(await userExists(userId))) return { written: false, usage };
  if (!edited.has("categoryId")) {
    const root = fixedRoot(item.kind, rootUrl);
    const path = root
      ? applyFixedRoot(root, analysis.categoryPath)
      : analysis.categoryPath;
    aiPath = path;
    const leaf = await resolveAiPath(userId, path);
    set.categoryId = leaf ? new Types.ObjectId(leaf) : null;
  }

  // Embedding is best effort: keyword search still works without it.
  try {
    const embedding = await AiService.embed(
      SearchService.embeddingInput({
        title: (edited.has("title") ? item.title : analysis.title) ?? "",
        summary:
          (edited.has("summary") ? item.summary : analysis.summary) ?? "",
        tags: edited.has("tags") ? item.tags : analysis.tags,
        source: set.source as string | null,
        note: item.note,
        text: (set.text as string | null | undefined) ?? item.text,
      }),
      item.kind,
    );
    set.embedding = toFloat32Buffer(embedding.vector);
    usage.cost += embedding.cost ?? 0;
  } catch (error) {
    log.warn({ err: error, itemId: item._id.toString() }, "Embedding failed");
  }

  const res = await Item.updateOne(
    { _id: item._id, status: "processing", claimedAt },
    {
      $set: {
        ...set,
        ai: usage,
        status: "ready",
        error: null,
        processedAt: new Date(),
        nextAttemptAt: null,
        claimedAt: null,
      },
    },
  );
  const written = res.modifiedCount === 1;
  if (written) await settleCategories(userId, item, set, aiPath);
  return { written, usage };
}

/**
 * After the write: a concurrent prune (another item of this user deleted
 * or moved) may have removed the category we just created while it was
 * still empty — re-resolve it. Then, if reprocessing moved the item, its
 * previous AI category may be empty now.
 */
async function settleCategories(
  userId: string,
  item: ItemDoc,
  set: Record<string, unknown>,
  aiPath: AiCategorySuggestion[] | null,
): Promise<void> {
  const leaf = set.categoryId as Types.ObjectId | null | undefined;
  if (leaf && aiPath && !(await Category.exists({ _id: leaf }))) {
    const again = await resolveAiPath(userId, aiPath);
    await Item.updateOne(
      { _id: item._id },
      { $set: { categoryId: again ? new Types.ObjectId(again) : null } },
    );
  }
  if (
    leaf !== undefined &&
    item.categoryId &&
    String(item.categoryId) !== String(leaf ?? "")
  ) {
    await pruneEmptyAiCategories(userId);
  }
}

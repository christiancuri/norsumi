import { Types } from "mongoose";

import { Env } from "../infra/env.js";
import { createLogger } from "../infra/logger.js";
import { Item } from "../models/Item.model.js";
import { AnalysisParseError } from "../modules/ai/analysis.schema.js";
import { AiError } from "../modules/ai/openrouter.js";
import type { ItemDoc } from "../modules/items/items.mapper.js";
import { userExists } from "../modules/users/user-exists.js";
import { PermanentError, processItem } from "./pipeline.js";

/**
 * In-process queue over the `items` collection. Items are claimed
 * atomically (pending → processing), so several API instances can run
 * workers against one database. A claim older than STALE_CLAIM_MS (crash,
 * deploy) is taken over. Transient failures retry with backoff.
 */

const log = createLogger("worker");

const POLL_MS = 2_000;
const STALE_CLAIM_MS = 5 * 60 * 1000;
export const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [15_000, 60_000, 180_000];
const STOP_GRACE_MS = 10_000;

let timer: NodeJS.Timeout | null = null;
let stopping = false;
let filling = false;
let refill = false;
const inFlight = new Map<string, { claimedAt: Date; userId: string }>();

function isTransient(error: unknown): boolean {
  if (error instanceof PermanentError) return false;
  if (error instanceof AiError) return error.transient;
  if (error instanceof AnalysisParseError) return true;
  return true;
}

function userMessage(error: unknown): string {
  if (error instanceof PermanentError) return error.message;
  if (error instanceof AiError) {
    return error.transient
      ? "The AI service is unavailable right now. Try reprocessing later."
      : "The AI service rejected this item.";
  }
  if (error instanceof AnalysisParseError) {
    return "The AI returned an unusable answer. Try reprocessing.";
  }
  return "Processing failed. Try reprocessing.";
}

/**
 * Users with an item being processed (here or by another instance). One
 * item per user at a time, so categories created for one item are visible
 * when the next one is categorized.
 */
async function busyUsers(now: Date): Promise<Types.ObjectId[]> {
  const elsewhere = await Item.distinct("userId", {
    status: "processing",
    claimedAt: { $gte: new Date(now.getTime() - STALE_CLAIM_MS) },
  });
  const ids = new Set<string>(elsewhere.map((id) => String(id)));
  for (const { userId } of inFlight.values()) ids.add(userId);
  return [...ids].map((id) => new Types.ObjectId(id));
}

async function claimNext(): Promise<{ item: ItemDoc; claimedAt: Date } | null> {
  const now = new Date();
  const claimedAt = now;
  const busy = await busyUsers(now);
  const item = await Item.findOneAndUpdate(
    {
      ...(busy.length > 0 && { userId: { $nin: busy } }),
      $or: [
        {
          status: "pending",
          $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }],
        },
        {
          status: "processing",
          claimedAt: { $lt: new Date(now.getTime() - STALE_CLAIM_MS) },
          attempts: { $lt: MAX_ATTEMPTS },
        },
      ],
    },
    { $set: { status: "processing", claimedAt }, $inc: { attempts: 1 } },
    {
      sort: { createdAt: 1 },
      returnDocument: "after",
      projection: { embedding: 0 },
    },
  ).lean<ItemDoc>();
  return item ? { item, claimedAt } : null;
}

/** Stale claims that already used every attempt (e.g. crash loops) fail. */
async function failExhaustedClaims(): Promise<void> {
  await Item.updateMany(
    {
      status: "processing",
      claimedAt: { $lt: new Date(Date.now() - STALE_CLAIM_MS) },
      attempts: { $gte: MAX_ATTEMPTS },
    },
    {
      $set: {
        status: "failed",
        claimedAt: null,
        error: "Processing did not finish. Try reprocessing.",
      },
    },
  );
}

async function run(item: ItemDoc, claimedAt: Date): Promise<void> {
  const itemId = item._id.toString();
  const started = Date.now();
  try {
    if (!(await userExists(item.userId.toString()))) {
      // Deleted account; its items are being purged. Spend nothing on it.
      log.info({ itemId }, "Skipping item of a deleted user");
      return;
    }
    const { written, usage } = await processItem(item, claimedAt);
    log.info(
      {
        itemId,
        kind: item.kind,
        ms: Date.now() - started,
        model: usage.model,
        fallbackUsed: usage.fallbackUsed,
        aiLatencyMs: usage.latencyMs,
        cost: usage.cost,
        written,
      },
      written ? "Item ready" : "Result discarded (claim lost)",
    );
  } catch (error) {
    const transient = isTransient(error);
    const retry = transient && item.attempts < MAX_ATTEMPTS;
    log.warn(
      { itemId, kind: item.kind, attempt: item.attempts, retry, err: error },
      "Item processing failed",
    );
    const delay =
      BACKOFF_MS[item.attempts - 1] ??
      BACKOFF_MS[BACKOFF_MS.length - 1] ??
      60_000;
    await Item.updateOne(
      { _id: item._id, status: "processing", claimedAt },
      retry
        ? {
            $set: {
              status: "pending",
              claimedAt: null,
              nextAttemptAt: new Date(Date.now() + delay),
            },
          }
        : {
            $set: {
              status: "failed",
              claimedAt: null,
              nextAttemptAt: null,
              error: userMessage(error),
            },
          },
    ).catch((err) => log.error({ err, itemId }, "Could not record failure"));
  }
}

async function fill(): Promise<void> {
  if (filling) {
    refill = true;
    return;
  }
  filling = true;
  try {
    await failExhaustedClaims();
    do {
      refill = false;
      while (!stopping && inFlight.size < Env.WORKER_CONCURRENCY) {
        const claim = await claimNext();
        if (!claim) break;
        const id = claim.item._id.toString();
        inFlight.set(id, {
          claimedAt: claim.claimedAt,
          userId: claim.item.userId.toString(),
        });
        void run(claim.item, claim.claimedAt).finally(() => {
          inFlight.delete(id);
          if (!stopping) void fill();
        });
      }
    } while (refill && !stopping);
  } catch (error) {
    log.error({ err: error }, "Worker poll failed");
  } finally {
    filling = false;
  }
}

/** Starts polling (no-op when WORKER_CONCURRENCY=0). */
function start(): void {
  if (Env.WORKER_CONCURRENCY === 0) {
    log.info("Worker disabled (WORKER_CONCURRENCY=0)");
    return;
  }
  stopping = false;
  timer = setInterval(() => void fill(), POLL_MS);
  timer.unref();
  void fill();
  log.info({ concurrency: Env.WORKER_CONCURRENCY }, "Worker started");
}

/** Wakes the worker right away (after a new item is created). */
function kick(): void {
  if (timer && !stopping) void fill();
}

/** Stops claiming, waits briefly, then hands unfinished items back. */
async function stop(): Promise<void> {
  if (!timer) return;
  stopping = true;
  clearInterval(timer);
  timer = null;
  const deadline = Date.now() + STOP_GRACE_MS;
  // A poll may be mid-claim: let it finish before Mongo disconnects.
  while ((inFlight.size > 0 || filling) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  for (const [id, { claimedAt }] of inFlight) {
    await Item.updateOne(
      { _id: id, status: "processing", claimedAt },
      { $set: { status: "pending", claimedAt: null }, $inc: { attempts: -1 } },
    ).catch(() => undefined);
  }
}

export const Worker = { start, stop, kick };

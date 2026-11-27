import { Types } from "mongoose";

import { Env } from "../../infra/env.js";
import { HTTPError } from "../../infra/http-errors.js";
import { isDuplicateKeyError } from "../../infra/mongoose.js";
import { AiUsage } from "../../models/AiUsage.model.js";
import {
  budgetMessage,
  secondsUntilUtcMidnight,
  utcDay,
} from "./ai-budget.policy.js";

const KEEP_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Counts one AI run against the user's daily budget, or throws 429.
 * Atomic: the upsert only matches while `count < limit`; at the limit it
 * tries to insert a second doc for the same day and hits the unique index.
 */
export async function consumeAiBudget(
  userId: string,
  now = new Date(),
): Promise<void> {
  const limit = Env.AI_DAILY_ITEM_LIMIT;
  try {
    await AiUsage.updateOne(
      {
        userId: new Types.ObjectId(userId),
        day: utcDay(now),
        count: { $lt: limit },
      },
      {
        $inc: { count: 1 },
        $setOnInsert: { expireAt: new Date(now.getTime() + KEEP_MS) },
      },
      { upsert: true },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const exceeded = new HTTPError(429, budgetMessage(limit));
    exceeded.retryAfter = secondsUntilUtcMidnight(now);
    throw exceeded;
  }
}

import { Types } from "mongoose";

import { createLogger } from "../../infra/logger.js";
import { deleteUserBlobs } from "../../infra/storage.js";
import { AiUsage } from "../../models/AiUsage.model.js";
import { Category } from "../../models/Category.model.js";
import { Item } from "../../models/Item.model.js";
import { RefreshToken } from "../../models/RefreshToken.model.js";
import { User } from "../../models/User.model.js";
import { forgetUser } from "./user-exists.js";
import { forgetUserDek } from "./user-keys.js";

const log = createLogger("purge");

export interface PurgeResult {
  blobs: number;
  items: number;
  categories: number;
  tokens: number;
  user: number;
}

/**
 * Permanently deletes a user and everything they own. Blobs go first: if
 * storage fails, nothing in the database is touched and the call can be
 * retried. Safe to re-run.
 */
export async function purgeUser(userId: string): Promise<PurgeResult> {
  const id = new Types.ObjectId(userId);
  const blobs = await deleteUserBlobs(userId);
  const items = await Item.deleteMany({ userId: id });
  const categories = await Category.deleteMany({ userId: id });
  const tokens = await RefreshToken.deleteMany({ userId: id });
  await AiUsage.deleteMany({ userId: id });
  const user = await User.deleteOne({ _id: id });
  forgetUserDek(userId);
  forgetUser(userId);
  const result = {
    blobs,
    items: items.deletedCount,
    categories: categories.deletedCount,
    tokens: tokens.deletedCount,
    user: user.deletedCount,
  };
  log.info({ userId, ...result }, "User purged");
  return result;
}

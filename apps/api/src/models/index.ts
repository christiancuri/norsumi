import { AiUsage } from "./AiUsage.model.js";
import { Category } from "./Category.model.js";
import { Item } from "./Item.model.js";
import { RefreshToken } from "./RefreshToken.model.js";
import { User } from "./User.model.js";

const models = [User, RefreshToken, Category, Item, AiUsage];

/** Creates collections and indexes before the server accepts traffic. */
export async function ensureModels(): Promise<void> {
  await Promise.all(models.map((model) => model.init()));
}

import { Types } from "mongoose";

import { User } from "../../models/User.model.js";
import { ExistenceCache } from "./existence-cache.js";

const cache = new ExistenceCache(async (id) => {
  if (!Types.ObjectId.isValid(id)) return false;
  return (await User.exists({ _id: new Types.ObjectId(id) })) !== null;
});

export const userExists = (id: string) => cache.exists(id);
export const forgetUser = (id: string) => cache.forget(id);

import mongoose from "mongoose";

import { generateKey, unwrapKey, wrapKey } from "../../infra/crypto.js";
import { Env } from "../../infra/env.js";
import { User } from "../../models/User.model.js";

const masterKey = Buffer.from(Env.MASTER_KEY, "base64");

const CACHE_LIMIT = 500;
const cache = new Map<string, Buffer>();

/** Lean reads return BSON Binary instead of Buffer. */
function toBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof mongoose.mongo.Binary) return Buffer.from(value.buffer);
  throw new Error("Malformed wrapped key");
}

/** A fresh DEK for a new user, plus its wrapped form to store. */
export function createUserKey(userId: string): {
  dek: Buffer;
  wrapped: Buffer;
} {
  const dek = generateKey();
  return { dek, wrapped: wrapKey(masterKey, dek, userId) };
}

/** The user's DEK, unwrapped with MASTER_KEY (small in-memory cache). */
export async function getUserDek(userId: string): Promise<Buffer> {
  const cached = cache.get(userId);
  if (cached) return cached;
  const user = await User.findById(userId, { wrappedDek: 1 }).lean();
  if (!user?.wrappedDek) throw new Error("User key not found");
  const wrapped = toBuffer(user.wrappedDek);
  const dek = unwrapKey(masterKey, wrapped, userId);
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(userId, dek);
  return dek;
}

export function forgetUserDek(userId: string): void {
  cache.delete(userId);
}

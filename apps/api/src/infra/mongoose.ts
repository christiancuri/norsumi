import mongoose from "mongoose";

import { ensureModels } from "../models/index.js";
import { Env } from "./env.js";
import { createLogger } from "./logger.js";

const log = createLogger("mongoose");

export async function connectMongo(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(Env.MONGODB_URI, { dbName: Env.MONGODB_DB });
  await ensureModels();
  log.info({ db: Env.MONGODB_DB }, "MongoDB connected");
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
  log.info("MongoDB disconnected");
}

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === 11000
  );
}

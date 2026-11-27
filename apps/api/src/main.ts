import "reflect-metadata";

import { Env } from "./infra/env.js";
import { createLogger } from "./infra/logger.js";
import { connectMongo, disconnectMongo } from "./infra/mongoose.js";
import { buildServer } from "./infra/server.js";
import { verifyDummy } from "./modules/auth/password.js";
import { Worker } from "./worker/worker.js";

const log = createLogger("main");

await connectMongo();
const server = await buildServer();
await server.listen({ port: Env.PORT, host: "0.0.0.0" });

Worker.start();
// Precompute the dummy hash so unknown-email logins take as long as others.
void verifyDummy("warm-up", Env.ARGON2_PEPPER);

let stopping = false;
async function shutdown(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  log.info({ signal }, "Shutting down");
  await server.close();
  await Worker.stop();
  await disconnectMongo();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

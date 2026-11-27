import { z } from "zod";

import { createLogger } from "./logger.js";

const logger = createLogger("env");

const required = z.string().trim().min(1);

// Only the literal "true" enables a flag.
const flag = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((value) =>
      value === undefined || value.trim() === ""
        ? fallback
        : value.trim().toLowerCase() === "true",
    );

const base64Key = required.refine(
  (value) => Buffer.from(value, "base64").length === 32,
  "Must be 32 random bytes encoded as base64 (openssl rand -base64 32)",
);

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  /** Absolute origin clients reach the API at; media URLs are built on it. */
  PUBLIC_URL: z.url().transform((value) => value.replace(/\/+$/, "")),
  /** Comma-separated origins, or "*". Requests without Origin always pass. */
  CORS_ORIGIN: z.string().default("*"),
  REGISTRATION_OPEN: flag(true),
  /**
   * Behind exactly one reverse proxy that sets X-Forwarded-For to the real
   * client IP (see infra/client-ip.ts). Leave false when exposed directly.
   */
  TRUST_PROXY: flag(false),

  MONGODB_URI: required,
  MONGODB_DB: z.string().trim().min(1).default("norsumi"),

  JWT_SECRET: required.min(32, "Use at least 32 characters"),
  /** Server pepper for argon2id (its `secret`). Never stored in the DB. */
  ARGON2_PEPPER: required.min(32, "Use at least 32 random characters"),
  /**
   * Google OAuth client ids allowed as ID-token audience, comma-separated.
   * The first one is the web client. Empty disables Google sign-in.
   */
  GOOGLE_CLIENT_IDS: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  MEDIA_SIGNING_SECRET: required.min(32, "Use at least 32 characters"),
  MASTER_KEY: base64Key,

  S3_ENDPOINT: z.url(),
  S3_REGION: required,
  S3_BUCKET: required,
  S3_ACCESS_KEY_ID: required,
  S3_SECRET_ACCESS_KEY: required,

  OPENROUTER_API_KEY: required,
  AI_VISION_MODEL: required,
  AI_VISION_FALLBACK_MODEL: z.string().trim().optional(),
  AI_TEXT_MODEL: required,
  AI_TEXT_FALLBACK_MODEL: z.string().trim().optional(),
  AI_EMBEDDING_MODEL: required,

  /** Items a user may send to the AI per UTC day (creates + reprocesses). */
  AI_DAILY_ITEM_LIMIT: z.coerce.number().int().min(1).default(500),

  WORKER_CONCURRENCY: z.coerce.number().int().min(0).max(32).default(3),
});

export type EnvConfig = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Only field names and rule messages, never the values.
  logger.fatal(
    {
      issues: parsed.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`,
      ),
    },
    "Invalid environment variables",
  );
  process.exit(1);
}

export const Env: EnvConfig = parsed.data;

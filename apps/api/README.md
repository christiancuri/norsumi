# @norsumi/api

Fastify API for norsumi: ingests screenshots, links and notes, encrypts and
stores them, and runs an in-process AI worker (OpenRouter) that titles,
summarizes, categorizes, tags and extracts entities, plus hybrid search.

Contract: [`docs/api.md`](../../docs/api.md) and `packages/common`.

## Setup

```sh
cp .env.example .env   # fill in every value (see comments in the file)
pnpm install
pnpm -F @norsumi/api dev
```

Requires Node 26, MongoDB (Atlas or local), an S3-compatible bucket and an
OpenRouter key. `MASTER_KEY` wraps every user's data key: back it up, losing
it makes all stored blobs unreadable.

## Scripts

| Script       | What it does                                                 |
| ------------ | ------------------------------------------------------------ |
| `dev`        | `tsc --watch` + `node --watch` on `dist/` (loads `.env`)     |
| `build`      | Compiles `src/` to `dist/` with `tsc -p tsconfig.build.json` |
| `start`      | Runs `dist/main.js` (loads `.env` if present)                |
| `type-check` | `tsc --noEmit` over sources and tests                        |
| `test`       | Vitest unit tests (no network, DB or S3)                     |

## Architecture

```
src/
  main.ts               connect Mongo → build server → listen → start worker
  infra/                env (Zod), logger (pino), server (Fastify), mongoose,
                        storage (S3), crypto (envelope AES-256-GCM),
                        media-signing (HMAC URLs), safe-fetch (SSRF guard), jwt
  hooks/                auth (bearer JWT unless route config.public), errors
  models/               typegoose: User, RefreshToken, Category, Item
  modules/
    auth/               register/login/google/refresh/logout, /me,
                        argon2id + pepper, Google ID token verification
    categories/         CRUD (2 levels), counts, AI path resolution
    items/              upload (magic bytes, sha256 dedupe, sharp/HEIC),
                        link/note, list (cursor), hybrid search, stats
    media/              signed, decrypting media route
    ai/                 prompt, zod output schema, Vercel AI SDK + OpenRouter
                        provider (ai.client: settings, fallback, embeddings)
    links/              page fetch + OpenGraph/readable text extraction
  worker/               queue over `items` (claim, retry, stale recovery)
```

- **Routes** are `fastify-decorators` controllers; public routes set
  `config: { public: true }` and the `onRequest` auth hook skips them.
- **Errors** are always `{ statusCode, error, message }`.
- **Encryption**: per-user DEK, wrapped with `MASTER_KEY`; blobs are
  `0x01 ‖ nonce ‖ ciphertext ‖ tag` with AAD
  `norsumi/v1/blob/{itemId}/{variant}`, stored at `u/{userId}/{itemId}/{variant}`.
  The bucket only ever holds ciphertext.
- **Media**: `Item.image.thumbUrl/url` are `${PUBLIC_URL}/api/media/...`
  signed for ≥6 h (expiry bucketed by the hour so URLs stay cacheable).
- **Worker**: polls every 2 s (and on new items), claims atomically
  (`pending → processing`), `WORKER_CONCURRENCY` jobs at once, takes over
  claims older than 5 min, retries transient failures 3× with backoff, then
  `failed` with a user-facing message. At most one item per user is
  processed at a time (across instances, via the `processing` claims), so a
  category created for one item is visible to the next. Several API
  instances can share one database.
- **AI**: one structured-output call per item (vision for images, text for
  links/notes) with ZDR and `data_collection: deny`; per-vendor parameters;
  primary model, then the fallback once. The prompt includes the user's
  category tree so categories are reused. User-edited `title`, `summary`,
  `tags` and `categoryId` are never overwritten except by `/reprocess`.
  Cost/latency of the last run is stored on the item (`ai`, internal).
- **Search**: Mongo text index + substring match, merged with cosine
  similarity of the query embedding over the user's latest 5000 item vectors
  (computed in-app), max 60 results. Embeddings are requested at 1024
  dimensions (truncated + renormalized if a model ignores it) and stored as
  Float32 bytes. Falls back to keyword-only when the query embedding fails
  or takes over 3 s.
- **Uploads**: type from magic bytes; HEIC/HEIF is converted to JPEG (q90)
  and stored as `full`; dedupe uses the SHA-256 of the original bytes.
- **Refresh tokens**: rotate on every use; reuse revokes the family, except
  within 30 s of the token's own rotation (concurrent refresh), which
  answers 409 so the client retries with its latest token.
- **Abuse limits**: per-user route limits and a daily AI budget
  (`AI_DAILY_ITEM_LIMIT`, `ai_usage` collection); login limited per IP+email
  and per IP; images capped at 100 MP (HEIC size read from the header before
  decoding, at most 2 HEIC decodes at once); SSRF guard on link fetches.
- **Logging**: pino; never secrets, tokens, image bytes or AI payloads.

# norsumi API contract

Source of truth for types: `packages/common/src`. This document describes
routes and behavior. Change both together, then update every client
(`apps/web`, `apps/android`).

- Base path: `/api`. JSON everywhere except uploads (multipart) and media.
- Auth: `Authorization: Bearer <accessToken>` on every route except those
  marked **public**.
- Errors: `{ statusCode, error, message }` (`ApiError`).
- Dates: ISO-8601 strings (UTC). IDs: Mongo ObjectId hex strings.

## Health & info

| Method | Path        | Auth   | Response       |
| ------ | ----------- | ------ | -------------- |
| GET    | `/health`   | public | `{ ok: true }` |
| GET    | `/api/info` | public | `ServerInfo`   |

## Auth (email + password and/or Google)

Self-host friendly: no email provider required; Google is optional.

| Method | Path                 | Auth   | Body              | Response                                       |
| ------ | -------------------- | ------ | ----------------- | ---------------------------------------------- |
| POST   | `/api/auth/register` | public | `RegisterBody`    | `AuthSession` (201)                            |
| POST   | `/api/auth/login`    | public | `LoginBody`       | `AuthSession`                                  |
| POST   | `/api/auth/google`   | public | `GoogleLoginBody` | `AuthSession` (201 if the account was created) |
| POST   | `/api/auth/refresh`  | public | `RefreshBody`     | `AuthSession`                                  |
| POST   | `/api/auth/logout`   | public | `RefreshBody`     | 204                                            |
| GET    | `/api/me`            | user   | —                 | `User`                                         |
| PATCH  | `/api/me`            | user   | `UpdateMeBody`    | `User`                                         |
| DELETE | `/api/me`            | user   | `DeleteMeBody`    | 204                                            |

- Access token: JWT HS256, 15 min. Refresh token: opaque 32 random bytes,
  stored hashed (SHA-256), 60 days, **rotates** on every refresh (old one is
  revoked; reusing a revoked token revokes the whole family).
- Refresh grace window: a token reused within **30 s** of its own rotation
  (two tabs/requests refreshing at once) answers **409** without revoking
  anything. Clients handle 409 by re-reading their latest stored refresh
  token (another tab/request already rotated it) and retrying once with it;
  if none is newer, treat it as signed out. Reuse after 30 s, or of a
  logged-out token, still revokes the family (401).
- Passwords: **argon2id** only (`@node-rs/argon2`, prebuilt binaries;
  m=19 MiB, t=2, p=1 per OWASP minimum — tune up if latency allows) with a
  random 16-byte salt per hash (embedded in the PHC string) **and a
  mandatory server pepper** (`ARGON2_PEPPER`, ≥32 random bytes, passed as
  argon2's `secret` so it is never stored in the DB). The API refuses to
  boot without it. The stored value is `v1$<phc>` so the pepper can be
  rotated later (`v2`, rehash on next login). Never scrypt/bcrypt.
  Constant-time behavior for unknown emails (verify against a dummy hash).
- Google: the ID token is verified locally with `jose`
  (`createRemoteJWKSet(https://www.googleapis.com/oauth2/v3/certs)`),
  checking `iss` ∈ {accounts.google.com, https://accounts.google.com},
  `aud` ∈ `GOOGLE_CLIENT_IDS` (comma list: web + Android client ids),
  `exp`, and `email_verified === true`. Accounts are keyed by Google `sub`.
  Google is **never linked automatically** to an existing account with the
  same email (password accounts have no email verification, so that would
  let anyone pre-register a victim's email and read what they save later):
  such a sign-in answers **409** "An account with this email already
  exists. Sign in with your password, then connect Google in Settings."
  (an email owned by a different Google account is also 409). Linking from
  an authenticated session is a future feature. Google-only accounts have
  no password.
  Disabled (404 + `auth.google: null` in `/api/info`) when
  `GOOGLE_CLIENT_IDS` is empty.
- `DELETE /api/me` permanently deletes the account: every item and its
  stored blobs, categories, refresh tokens and the user. Accounts with a
  password must confirm it (`{ password }`, wrong/missing → 403, so clients
  never confuse it with an expired session);
  Google-only accounts send no body. Rate-limited.
- `REGISTRATION_OPEN=false` makes `/register` return 403.
- Login is rate-limited per IP + email (10 / 15 min) and per IP
  (50 / 15 min, against password spraying). Register: 10 / hour per IP.
- Client IP: behind the production proxy (`TRUST_PROXY=true`) the API trusts
  exactly one private-network hop (Caddy), which overwrites
  `X-Forwarded-For` with the IP from Cloudflare's `Cf-Connecting-Ip`;
  client-sent `X-Forwarded-For` values are never used.
- Writes with the access token of a deleted account answer 401.

## Categories

| Method | Path                  | Body                 | Response                                            |
| ------ | --------------------- | -------------------- | --------------------------------------------------- |
| GET    | `/api/categories`     | —                    | `Category[]` (flat; build the tree with `parentId`) |
| POST   | `/api/categories`     | `CreateCategoryBody` | `Category` (201)                                    |
| PATCH  | `/api/categories/:id` | `UpdateCategoryBody` | `Category`                                          |
| DELETE | `/api/categories/:id` | —                    | 204                                                 |

- Max depth 2 (a child cannot have children). Sibling names are unique per
  user (case-insensitive) → 409.
- Deleting a root deletes its children; items in deleted categories become
  uncategorized (`categoryId: null`).
- `origin`: `"ai"` for categories the AI created, `"user"` for ones created
  via `POST /api/categories` or whose name, emoji or color the user edited.
  AI categories are deleted automatically once empty (no items, archived
  included, and no children; then their parent is re-checked) after an
  item is deleted, moved or reprocessed into another category. User
  categories are never removed automatically.

## Items

| Method | Path                       | Body                                | Response                          |
| ------ | -------------------------- | ----------------------------------- | --------------------------------- |
| GET    | `/api/items`               | query `ItemListQuery`               | `ItemListResponse`                |
| GET    | `/api/items/stats`         | —                                   | `LibraryStats`                    |
| GET    | `/api/items/:id`           | —                                   | `Item`                            |
| POST   | `/api/items/upload`        | multipart (`file` + `UploadFields`) | `Item` (201, or 200 if duplicate) |
| POST   | `/api/items/link`          | `CreateLinkBody`                    | `Item` (201)                      |
| POST   | `/api/items/note`          | `CreateNoteBody`                    | `Item` (201)                      |
| PATCH  | `/api/items/:id`           | `UpdateItemBody`                    | `Item`                            |
| DELETE | `/api/items/:id`           | —                                   | 204 (also deletes blobs)          |
| POST   | `/api/items/:id/reprocess` | —                                   | `Item` (status back to `pending`) |

- List order: `capturedAt` desc, cursor-paginated (opaque cursor).
  `archived` defaults to `false`. `kind` accepts one kind or a
  comma-separated list (`kind=screenshot,image`). With `q`, results are
  ranked by a hybrid score (keyword match + embedding cosine similarity),
  capped at 60, and `nextCursor` is null.
- Stats (`LibraryStats`): every count excludes archived items except
  `archived` itself.
- Upload: max `MAX_UPLOAD_BYTES`, mime in `ACCEPTED_IMAGE_MIME_TYPES`
  (detected from magic bytes). HEIC/HEIF is converted to JPEG (q90) at
  upload, so `image.mime` and the `full` variant are `image/jpeg`; an
  undecodable HEIC is rejected with 400.
  Idempotent by `(userId, sha256(plaintext))` and by `(userId, clientId)`:
  a duplicate returns the existing item with 200.
- Creating returns immediately with `status: "pending"`; the worker moves it
  to `processing` → `ready` | `failed`. Clients poll `GET /api/items/:id`
  (or refetch the list) while any item is pending/processing.
- Cost limits (per user): upload 120/h, link 120/h, note 200/h,
  reprocess 10/h, search (`q`) 60/min, category create 60/h → **429** with
  `Retry-After`. Every item sent to the AI (create or reprocess) also counts
  against a daily budget (`AI_DAILY_ITEM_LIMIT`, default 500 per UTC day) →
  **429** "Daily AI limit reached (500 items per day). Try again tomorrow."
  Duplicate uploads (200) do not count.
- Images over 100 megapixels are rejected (400); HEIC dimensions are checked
  from the file header before decoding.
- URLs the API returns for entities, `link.faviconUrl` and `link.imageUrl`
  are https only (others become null).
- User edits win: once the user edits `title`, `summary`, `tags` or
  `categoryId`, reprocessing does not overwrite those fields unless the
  item is reprocessed explicitly via `/reprocess` (which overwrites all).

## Media

| Method | Path                                      | Auth            | Response    |
| ------ | ----------------------------------------- | --------------- | ----------- |
| GET    | `/api/media/:itemId/:variant?exp=…&sig=…` | public (signed) | image bytes |

- `variant`: `thumb` (WebP, max 640px wide) or `full` (original bytes;
  JPEG for uploads that were HEIC).
- URLs are produced by the API inside `Item.image` and signed with
  HMAC-SHA256 (`MEDIA_SIGNING_SECRET`), valid 6 hours. Clients must not
  build them. `Cache-Control: private, max-age=3600`.

## Storage & encryption

- Blobs live in an S3-compatible bucket (Backblaze B2 in the official
  deployment). Keys: `u/{userId}/{itemId}/{variant}`.
- Every blob is encrypted **before** upload with AES-256-GCM using a
  per-user data key (DEK). DEKs are stored wrapped by the server
  `MASTER_KEY` (AES-256-GCM) in the user document. The bucket only ever
  holds ciphertext.
- Blob format: `0x01 ‖ nonce(12) ‖ ciphertext ‖ tag(16)`,
  AAD = `norsumi/v1/blob/{itemId}/{variant}`.
- AI processing happens server-side over TLS through OpenRouter with
  Zero Data Retention enforced (`provider.zdr = true`,
  `data_collection = "deny"`).

## AI pipeline (worker)

1. Screenshot/image: decrypt → downscale (max 1600px, JPEG) → vision model
   with a strict JSON schema → `{ title, summary, source, categoryPath:
   [root, topic], tags, entities, text }`.
2. Link: fetch the page server-side (SSRF-guarded, 5 MB / 10 s cap), read
   OpenGraph + main text → text model with the same schema.
3. Note: text model with the same schema.
4. The prompt includes the user's existing category tree so the model
   reuses categories instead of inventing near-duplicates; new categories
   get an emoji + palette color from the model.
5. Embedding of `title + summary + tags + text` for semantic search.

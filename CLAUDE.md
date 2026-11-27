# norsumi — guide for agents

Read [README.md](README.md) for what the product is. This file is how to work
on it. `AGENTS.md` is a symlink to this file (Codex and other agents).

## Layout

| Path              | What                                                                   |
| ----------------- | ---------------------------------------------------------------------- |
| `packages/common` | API contract types shared by every client (built with `tsc`)           |
| `apps/api`        | Fastify 5 + fastify-decorators + typegoose, AI worker, envelope crypto |
| `apps/web`        | Vite 8 + React 19 + Tailwind 4 + shadcn + react-query-kit              |
| `apps/android`    | Kotlin + Jetpack Compose (standalone Gradle project)                   |
| `deploy/`         | Production compose, Caddy, deploy script (personal VPS)                |
| `brand/`          | Logo, icons, OG image + scripts (`brand/brainstorm/` = alternatives)   |
| `docs/`           | `api.md` (contract), `design.md` (design language)                     |

## Ground rules

- **Contracts first.** `docs/api.md` + `packages/common/src` are the source of
  truth. Change both, rebuild common (`pnpm -F @norsumi/common build`), then
  update every client that the change touches (web AND Android).
- **Design** follows `docs/design.md`. Never redraw the logo in code; import
  the files from `brand/`.
- **Never print or commit secrets.** Dev values live in `apps/api/.env`
  (gitignored), prod in `/opt/norsumi/api.env` on the VPS (600), CI in GitHub
  secrets. Where every credential lives: `~/workspace/memories/norsumi/`
  (`infra-memory` skill). `MASTER_KEY` loss = all stored files unreadable.
- **Passwords:** argon2id + per-hash salt + mandatory `ARGON2_PEPPER`. Never
  scrypt/bcrypt.
- **AI:** OpenRouter only, always with ZDR (`provider.zdr`,
  `data_collection: "deny"`). Models come from `AI_*` env vars. The models
  used in production are private: never name them in tracked files (they
  live in `~/workspace/memories/norsumi/` and the env files).
- **User data is private.** Test with throwaway users (`*@norsumi.dev`) and
  generated images; delete them afterwards. Never upload the owner's real
  screenshots except through ZDR model calls the product itself makes.
- **Commits:** Conventional Commits, lowercase subject, lines ≤ 90 chars, no
  `Co-Authored-By`/attribution trailers. Generate with `ccm`
  (`git commit -m "$(ccm)"`). husky runs biome + commitlint.
- **Pushing to `main` deploys** (path-filtered: API and/or web images to Docker Hub `copera/norsumi-*`,
  then `/opt/norsumi/deploy.sh`). Don't push half-done work.
- Talk to the owner in pt-BR; code, docs and commits in English.

## Verify before done

| Change    | Run                                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| any TS    | `pnpm lint && pnpm type-check`                                                                             |
| API       | `pnpm -F @norsumi/api test` (no network needed) + a live smoke when behavior changes                       |
| web       | `pnpm -F @norsumi/web build` + look at it in Chrome (`VITE_MOCK=1` for mock data)                          |
| Android   | `cd apps/android && ./gradlew :app:assembleDebug :app:testDebugUnitTest :app:lintDebug`, install on device |
| deploy/CI | `actionlint`, `shellcheck deploy/*.sh`, `docker compose -f deploy/docker-compose.yml config`               |
| Docker    | `docker build --platform linux/amd64 -f apps/<app>/Dockerfile .`                                           |

## Dev

- Node 26 (`.nvmrc`), pnpm 10. `pnpm dev` runs API (:3000) + web (:8080, proxies
  `/api`). Local DB is `norsumi-dev` on the Atlas cluster.
- Android against local API: `adb reverse tcp:3000 tcp:3000` (debug builds
  default to `http://localhost:3000`).

## Android release

The release keystore lives outside the repo (`~/.norsumi-android/`, see
`apps/android/README.md`), so releases are cut locally, not in CI:

1. Bump `versionCode`/`versionName` in `apps/android/app/build.gradle.kts`.
2. `cd apps/android && ./gradlew dist` → `dist/norsumi-<version>.apk`.
3. `gh release create v<version> dist/norsumi-<version>.apk#norsumi-<version>.apk`
   and also upload a copy named `norsumi.apk` — the web's "Download for
   Android" links to `releases/latest/download/norsumi.apk`.

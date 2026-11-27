# @norsumi/web

The norsumi web app: landing page, auth, and the library (masonry grid,
item viewer, ⌘K search, categories, capture by drag & drop / paste).

Vite 8 · React 19 · TypeScript 7 · Tailwind 4 · shadcn/ui · react-query-kit ·
react-router 8 · zustand · motion.

## Develop

```bash
pnpm -F @norsumi/web dev              # http://localhost:8080, proxies /api → :3000
VITE_MOCK=1 pnpm -F @norsumi/web dev  # no API needed: in-memory fake backend
```

Mock mode (`VITE_MOCK=1`) swaps the services layer for an in-memory backend
seeded with ~30 realistic items and categories (`src/services/mock`). Any
email/password signs you in. New items walk through pending → processing →
ready like the real worker. The mock is dropped from normal builds.

| Env            | Default |                             |
| -------------- | ------- | --------------------------- |
| `VITE_API_URL` | `/api`  | API base URL                |
| `VITE_MOCK`    | —       | `1` to use the fake backend |

## Check & build

```bash
pnpm -F @norsumi/web type-check
pnpm biome check apps/web             # from the repo root
pnpm -F @norsumi/web build            # → apps/web/build
```

## Layout

```
src/
  services/     backend.ts (interface + switch), http.backend.ts, mock/,
                *.service.ts (`export * as XService`)
  queries/      react-query-kit hooks (lists poll every 3s while items are processing)
  stores/       auth (persisted, rotating refresh tokens), theme, ui
  components/   layout, library (masonry, cards), item (viewer), capture,
                search (⌘K), category, landing, auth, ui (shadcn)
  routes/       router, lazy pages, app shell
  assets/       logo.svg / mark.svg (from /brand)
```

Rebranding: replace `src/assets/logo.svg`, `src/assets/mark.svg` and the
icons in `public/`.

Shortcuts: ⌘K / `/` search · `N` new note · ⌘V paste an image or URL ·
in the viewer `←` `→` navigate, `F` favorite, `Esc` close.

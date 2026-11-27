# syntax=docker/dockerfile:1
# Build context: repo root.  docker build -f apps/web/Dockerfile .
ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-slim AS build
ENV PNPM_HOME=/pnpm \
  PATH=/pnpm:$PATH \
  COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  TURBO_TELEMETRY_DISABLED=1 \
  HUSKY=0
# Node 25+ no longer bundles corepack; it pins pnpm to the root packageManager.
# Pinned: corepack itself is not covered by the lockfile.
RUN npm install -g corepack@0.36.0 && corepack enable
WORKDIR /repo
# Manifests first: the install layer only rebuilds when dependencies change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/common/package.json packages/common/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --filter '!@norsumi/api'
COPY . .
# Same-origin API in production (the reverse proxy routes /api).
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm exec turbo run build --filter=@norsumi/web...

FROM caddy:2-alpine AS runtime
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/web/build /srv
USER 1000:1000
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

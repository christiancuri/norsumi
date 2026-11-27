# syntax=docker/dockerfile:1
# Build context: repo root.  docker build -f apps/api/Dockerfile .
ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm \
  PATH=/pnpm:$PATH \
  COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  TURBO_TELEMETRY_DISABLED=1 \
  HUSKY=0
# Node 25+ no longer bundles corepack; it pins pnpm to the root packageManager.
# Pinned: corepack itself is not covered by the lockfile.
RUN npm install -g corepack@0.36.0 && corepack enable
WORKDIR /repo

FROM base AS build
# Manifests first: the install layer only rebuilds when dependencies change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/common/package.json packages/common/
COPY apps/api/package.json apps/api/
# Prebuilt native binaries (sharp + bundled libvips, @node-rs/argon2) resolve
# for the build platform: linux-x64 glibc on linux/amd64, matching runtime.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --filter '!@norsumi/web'
COPY . .
RUN pnpm exec turbo run build --filter=@norsumi/api...
# Self-contained prod tree (workspace deps are copied, not linked).
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm --filter @norsumi/api deploy --prod --legacy /out

FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production \
  PORT=3000 \
  TZ=UTC
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
USER node
# Fail the build if sharp's native binary or libvips can't load here.
RUN node -e "require('sharp').versions && console.log('sharp ok', require('sharp').versions.vips)"
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--enable-source-maps", "dist/main.js"]

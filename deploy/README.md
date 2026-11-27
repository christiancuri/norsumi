# Deploying norsumi

Two ways to run norsumi:

- **Production (norsumi.com)**: prebuilt images from Docker Hub on a VPS,
  reached only through a Cloudflare Tunnel. Deployed by GitHub Actions.
- **Self-hosting**: build from this checkout and serve it on your own domain
  with automatic HTTPS. Needs only Docker and an OpenRouter API key. See
  [Self-hosting](#self-hosting).

## Production topology

```
Cloudflare (TLS) ── Tunnel ──> cloudflared ──> caddy:80 ─┬─ /api/*, /health -> api:3000
                                                         └─ everything else -> web:8080 (SPA)
                                   www.norsumi.com -> 308 https://norsumi.com
```

One Ubuntu VPS, Docker Compose project `norsumi` in `/opt/norsumi`, next to
(and independent of) other stacks on the same host. No host ports are
published; the firewall only needs SSH. MongoDB is Atlas, blobs are in
Backblaze B2: there is no database container.

| File on the VPS      | Source                      | Who writes it              |
| -------------------- | --------------------------- | -------------------------- |
| `docker-compose.yml` | `deploy/docker-compose.yml` | CI, when `deploy/` changes |
| `Caddyfile`          | `deploy/Caddyfile`          | CI, when `deploy/` changes |
| `deploy.sh`          | `deploy/deploy.sh`          | CI, when `deploy/` changes |
| `.env`               | by hand                     | you (once)                 |
| `api.env`            | `deploy/api.env.example`    | you (once, mode 600)       |
| `.tags`              | `deploy.sh`                 | running tag per service    |

## 1. One-time VPS setup

Docker Engine with the compose plugin must already be installed. As root:

```bash
install -d -m 750 /opt/norsumi
cd /opt/norsumi

# Compose variables. TUNNEL_TOKEN comes from step 2.
umask 077
cat > .env <<'ENV'
IMAGE_PREFIX=copera
TUNNEL_TOKEN=<cloudflare tunnel token>
ENV

# API secrets: copy deploy/api.env.example here as api.env and fill it.
# Generate secrets with `openssl rand -hex 32` (MASTER_KEY: `openssl rand -base64 32`).
chmod 600 .env api.env
```

Copy the tracked files once (afterwards CI keeps them in sync):

```bash
scp deploy/docker-compose.yml deploy/Caddyfile deploy/deploy.sh \
  deploy/api.env.example root@<vps>:/opt/norsumi/
```

The CI deploy key (secret `VPS_SSH_KEY`) must be in the deploy user's
`~/.ssh/authorized_keys`. The same key as other stacks on the host works.

**First deploy**: push to `main`, or run the Deploy workflow by hand with
`api` and `web` checked. By hand on the VPS:
`cd /opt/norsumi && API_TAG=latest WEB_TAG=latest ./deploy.sh`.

Also in Atlas > Network Access, allow the VPS public IP. Back up `MASTER_KEY`
outside the VPS: without it, stored items cannot be decrypted.

## 2. Cloudflare Tunnel and DNS

1. Zero Trust > Networks > Tunnels > Create a tunnel (Cloudflared), name it
   `norsumi`. Copy the token into `/opt/norsumi/.env` as `TUNNEL_TOKEN`
   (skip the connector install step: the `cloudflared` container is the
   connector).
2. Public hostnames of that tunnel, both service type `HTTP`, URL `caddy:80`:
   - `norsumi.com`
   - `www.norsumi.com` (Caddy redirects it to the apex)
3. Cloudflare creates the proxied `CNAME` records to `<tunnel-id>.cfargotunnel.com`.
   Remove any older `A`/`AAAA`/`CNAME` records for `@` and `www` first.
4. SSL/TLS > Edge Certificates: "Always Use HTTPS" on. Caddy speaks plain
   HTTP inside the tunnel and sends HSTS.
5. Once `https://norsumi.com/health` answers, set the repo variable
   `HEALTHCHECK_URL=https://norsumi.com/health` so every deploy verifies it.

## 3. GitHub configuration (repo `christiancuri/norsumi`)

Images are published to Docker Hub (`copera/norsumi-{api,web}`, the same
account and namespace as filebase; the VPS is already logged in to pull).

Secrets:

| Secret                | Notes                                                     |
| --------------------- | --------------------------------------------------------- |
| `DOCKERHUB_USERNAME`  | Docker Hub user (`copera`)                                |
| `DOCKERHUB_TOKEN`     | Docker Hub access token (read/write)                      |
| `DOCKERHUB_NAMESPACE` | `copera`                                                  |
| `VPS_HOST`            | VPS address                                               |
| `VPS_USER`            | `root` on the current VPS                                 |
| `VPS_SSH_KEY`         | private deploy key                                        |
| `VPS_SSH_PORT`        | optional, default 22                                      |
| `VPS_KNOWN_HOSTS`     | optional `ssh-keyscan` line; otherwise trust-on-first-use |

Variable: `HEALTHCHECK_URL` (optional, see step 2.5).

## How a deploy works

`.github/workflows/deploy.yml` on every push to `main`:

1. **changes**: `dorny/paths-filter` decides what to ship.
   - `api` when `apps/api/**`, `packages/common/**`, the lockfile or workspace
     config changed.
   - `web` when `apps/web/**`, `packages/common/**`, the lockfile or workspace
     config changed.
   - `infra` when `deploy/**` changed.
     A manual run (Actions > Deploy > Run workflow) can force each of them.
2. **ci**: the full CI (`ci.yml`: lint, type-check, test, build). A red build
   never deploys.
3. **images**: builds and pushes only the changed images,
   `norsumi-{api,web}:latest` and `:<sha7>`, linux/amd64, with GHA layer cache.
4. **deploy**: copies the tracked deploy files when `infra` changed (never
   `.env`, `api.env` or `.tags`), then runs
   `API_TAG=<sha7> WEB_TAG=<sha7> ./deploy.sh`, passing only the changed
   services. `deploy.sh` pulls just those, keeps the other service on the tag
   in `.tags`, waits for the stack to be healthy, records the new tags, and
   restarts Caddy if the Caddyfile changed. Then `HEALTHCHECK_URL` is checked
   if set.

Deploys are serialized (`concurrency: deploy-production`).

### Manual deploy / rollback

```bash
cd /opt/norsumi
cat .tags                       # what runs now
API_TAG=<older sha7> ./deploy.sh  # roll back the API only
./deploy.sh                     # re-apply config, same tags
docker compose logs -f api
```

## Self-hosting

norsumi is open source, so you can run it yourself — but the supported,
zero-setup way is the official cloud at [norsumi.com](https://norsumi.com).
There is no turnkey self-host bundle; if you self-host, you own the setup.

Requirements:

- **Node.js 26+** and **pnpm 10** (or the `apps/api` / `apps/web` Dockerfiles).
- **MongoDB 8+** (Atlas or self-managed).
- **S3-compatible object storage** (AWS S3, Backblaze B2, Cloudflare R2, …)
  with a private bucket. Blobs are encrypted before upload.
- **OpenRouter API key** (models are configurable via `AI_*` env vars).
- A reverse proxy with HTTPS that routes `/api/*` and `/health` to the API and
  everything else to the web build.
- Optional: Google OAuth client ids for "Continue with Google".

All API settings are documented in [`apps/api/.env.example`](../apps/api/.env.example).
Keep `MASTER_KEY` safe: losing it makes every stored file unreadable.

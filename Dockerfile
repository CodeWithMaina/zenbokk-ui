# syntax=docker/dockerfile:1.7
# ═════════════════════════════════════════════════════════════════════════════
#  Punched UI — production image (static SPA served by Caddy, non-root)
#
#  Build stage: Vite production build (hashed bundles, code splitting driven by
#  the TanStack Router plugin). Runtime stage: no Node, no package manager, no
#  build tooling — only the compiled assets and a tiny static server.
#
#  Only VITE_* build args are exposed here and all of them are public by design:
#  they are compiled into the shipped JavaScript. Never pass a secret.
# ═════════════════════════════════════════════════════════════════════════════
ARG NODE_IMAGE=node:24.22.3-alpine3.24
ARG CADDY_IMAGE=caddy:2.11.9-alpine

# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS build
WORKDIR /app

# Dependency layer: cached until package.json / lock file change.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . ./

# Public build-time configuration. Empty by default: the app then uses the
# same-origin `/api` path, which is exactly how it is served behind Caddy.
ARG VITE_ROOT_DOMAIN=""
ARG VITE_MARKETING_HOST=""
ARG VITE_ADMIN_HOST=""
ARG VITE_API_BASE_URL=""
ENV VITE_ROOT_DOMAIN=${VITE_ROOT_DOMAIN} \
    VITE_MARKETING_HOST=${VITE_MARKETING_HOST} \
    VITE_ADMIN_HOST=${VITE_ADMIN_HOST} \
    VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    NODE_ENV=production

# `tsc -b && vite build` (package.json). Source maps are deliberately not
# emitted in production: the bundle ships to the browser, and a public .map
# hands over the application source. Debug a release by rebuilding locally from
# the same commit instead.
RUN npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM ${CADDY_IMAGE} AS runtime

RUN addgroup -g 10001 -S punched \
    && adduser -u 10001 -S punched -G punched \
    && mkdir -p /srv \
    && chown -R 10001:10001 /srv

COPY --from=build --chown=10001:10001 /app/dist /srv
COPY --chown=10001:10001 Caddyfile /etc/caddy/Caddyfile

# Caddy writes nothing outside /tmp in this configuration (auto_https off,
# persist_config off, admin off).
ENV XDG_CONFIG_HOME=/tmp/caddy-config \
    XDG_DATA_HOME=/tmp/caddy-data

USER 10001:10001

# Unprivileged port: no NET_BIND_SERVICE, no root, published only to the
# Docker `frontend` network by Caddy.
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --spider -q http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]

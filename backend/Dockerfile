# syntax=docker/dockerfile:1.6
# =====================================================
# Parasmani Skills — Backend (Express + Socket.io + Prisma)
# Multi-stage build → small Alpine runtime image.
# =====================================================

# ---------- Stage 1: deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

# ---------- Stage 2: build ----------
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client against the schema, then compile TS → dist/
RUN npx prisma generate
RUN npm run build
# Strip dev deps for the runtime stage
RUN npm prune --omit=dev

# ---------- Stage 3: runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000
RUN apk add --no-cache openssl libc6-compat tini \
 && addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/package.json ./package.json

USER app
EXPOSE 4000

# Healthcheck against /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:${PORT}/api/health || exit 1

# tini handles signals so SIGTERM cleanly triggers the graceful shutdown in src/index.ts
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]

# syntax=docker/dockerfile:1

# ── Stage 1: Base image with OpenSSL for Prisma engine ────────────────────────
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

# Install ca-certificates and openssl (required for Prisma engines on Linux)
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        openssl \
    && rm -rf /var/lib/apt/lists/*

# ── Stage 2: Install dependencies ─────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies needed to build the app and generate Prisma client
ENV NODE_ENV=development
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# ── Stage 3: Build Next.js application ────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build standalone Next.js bundle
ENV NODE_ENV=production
RUN npm run build

# ── Stage 4: Production Runner ────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Create non-root user and group
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# Copy static assets and standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]

# ============================================================
# DecentraPay — All-in-one Railway Dockerfile
# Bundles: PostgreSQL 15 + Hardhat Node + API + Next.js Web
# ============================================================

# ── Stage 1: Install dependencies ────────────────────────────
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/contracts/package.json ./packages/contracts/
RUN bun install --frozen-lockfile

# ── Stage 2: Build Next.js ───────────────────────────────────
FROM oven/bun:1 AS web-build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
WORKDIR /app/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ── Stage 3: Final runtime image ─────────────────────────────
FROM debian:bookworm-slim AS runner

# Prevent interactive prompts during apt
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-15 \
    supervisor \
    curl \
    ca-certificates \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Install Node.js (needed for Hardhat & Next.js standalone)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy full monorepo with node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Restore workspace node_modules
RUN bun install --frozen-lockfile

# Copy the built Next.js standalone + static assets
COPY --from=web-build /app/apps/web/.next/standalone ./apps/web/.next/standalone
COPY --from=web-build /app/apps/web/.next/static ./apps/web/.next/standalone/apps/web/.next/static
COPY --from=web-build /app/apps/web/public ./apps/web/.next/standalone/apps/web/public

# Copy Docker infrastructure files
COPY docker/supervisord.conf /etc/supervisor/conf.d/decentrapay.conf
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Compile Hardhat contracts at build time (saves startup time)
WORKDIR /app/packages/contracts
RUN npx hardhat compile
WORKDIR /app

# Setup PostgreSQL directories
RUN mkdir -p /var/run/postgresql /var/lib/postgresql/data \
    && chown -R postgres:postgres /var/run/postgresql /var/lib/postgresql/data

# Expose ports: Web (3000), API (3001), Hardhat (8545)
EXPOSE 3000 3001 8545

# Health check on the web app
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

ENTRYPOINT ["/app/start.sh"]

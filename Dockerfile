# ==========================================
# Stage 1: Dependency Installation
# ==========================================
FROM node:22-alpine AS deps

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

# Copy dependency definition files
COPY package.json package-lock.json* ./

# Install all dependencies including devDependencies for build
RUN npm install


# ==========================================
# Stage 2: Production Builder
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dummy DATABASE_URL for Prisma generate build step
ENV DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/school_studio_db?schema=public"

# Generate Prisma Client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# Remove development dependencies to keep production image small
RUN npm prune --omit=dev

# ==========================================
# Stage 3: Production Runner Image
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# Install runtime dependencies (OpenSSL for Prisma engine, dumb-init for PID 1 signal forwarding, curl for healthcheck)
RUN apk add --no-cache openssl dumb-init curl

ENV NODE_ENV=production
ENV PORT=4000

# Use standard non-root node user
USER node

# Copy production artifacts and pruned dependencies
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --chown=node:node --from=builder /app/templates ./templates

EXPOSE 4000

# Health check to ensure service is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Synchronize database schema and start production NestJS server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/src/main.js"]
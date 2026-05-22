# ─── Stage 1: Install dependencies ───────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# ─── Stage 2: Build ──────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (must happen after schema is present)
RUN npx prisma generate

# Build NestJS
RUN npm run build

# ─── Stage 3: Production runtime ─────────────────────────────
FROM node:20-alpine AS runtime
RUN apk add --no-cache dumb-init openssl
WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --omit=dev

# Copy built app and Prisma assets
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Copy startup script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3002

ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]

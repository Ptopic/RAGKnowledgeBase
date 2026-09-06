# ─── Stage 1: Install dependencies ───────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# NODE_ENV must NOT be production during install (skips devDeps)
ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# ─── Stage 2: Build ──────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Placeholder URLs/values for build time — replaced at runtime by env.sh
ENV NEXT_PUBLIC_API_URL=http://placeholder.api.url
ENV NEXT_PUBLIC_WEBSITE_URL=http://placeholder.website.url
ENV NEXT_PUBLIC_APP_NAME=PLACEHOLDER_APP_NAME
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=placeholder.google.client.id
ENV NEXT_PUBLIC_ETL_SERVICE=PLACEHOLDER_ETL_SERVICE

# The production Next.js build needs more headroom than the runtime process.
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build

# ─── Stage 3: Production runtime ─────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone output (next.config.mjs has output: "standalone")
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Copy the runtime env injection script
COPY --from=build /app/env.sh ./env.sh
RUN chmod +x ./env.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./env.sh"]
CMD ["node", "server.js"]

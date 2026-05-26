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

# Use placeholder values at build time so they can be replaced at runtime
# via the entrypoint script. This avoids requiring build args / GitHub secrets.
ENV NEXT_PUBLIC_API_URL=__NEXT_PUBLIC_API_URL__
ENV NEXT_PUBLIC_WEBSITE_URL=__NEXT_PUBLIC_WEBSITE_URL__
ENV NEXT_PUBLIC_APP_NAME=__NEXT_PUBLIC_APP_NAME__
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=__NEXT_PUBLIC_GOOGLE_CLIENT_ID__
ENV NEXT_PUBLIC_ETL_SERVICE=__NEXT_PUBLIC_ETL_SERVICE__

# Limit heap to 1536MB to avoid crashing the server
ENV NODE_OPTIONS="--max-old-space-size=1536"

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

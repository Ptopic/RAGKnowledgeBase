FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source (including prisma schema)
COPY . .

# Regenerate Prisma client after schema is present (required for enums like ChatType)
RUN npx prisma generate

# Build backend
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3002

# Start compiled NestJS app
CMD ["node", "dist/main"]

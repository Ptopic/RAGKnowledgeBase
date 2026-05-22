FROM node:20-bullseye-slim AS base
WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Build frontend
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Start Next.js app
CMD ["npm", "run", "start"]

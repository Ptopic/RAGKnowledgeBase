#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx --no-install prisma migrate deploy

echo "Starting NestJS application..."
exec node dist/main.js

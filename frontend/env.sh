#!/bin/sh
# Runtime env injection for Next.js standalone deployment
# Replaces placeholder values baked into the JS bundle at build time
# with actual runtime environment variables from Coolify/docker env.
#
# This allows NEXT_PUBLIC_* vars to be set at runtime instead of build time,
# removing the need for GitHub secrets or Docker build args.

set -e

REPLACEABLE_VARS="NEXT_PUBLIC_API_URL NEXT_PUBLIC_WEBSITE_URL NEXT_PUBLIC_APP_NAME NEXT_PUBLIC_GOOGLE_CLIENT_ID NEXT_PUBLIC_ETL_SERVICE"

# Build-time placeholders that get baked into the JS bundle
BUILD_PLACEHOLDERS="http://placeholder.api.url http://placeholder.website.url PLACEHOLDER_APP_NAME placeholder.google.client.id PLACEHOLDER_ETL_SERVICE"

echo "[env.sh] Injecting runtime environment variables into Next.js bundle..."

i=0
for VAR_NAME in $REPLACEABLE_VARS; do
  VALUE=$(eval echo "\$$VAR_NAME")

  # Get the corresponding build placeholder
  j=0
  PLACEHOLDER=""
  for P in $BUILD_PLACEHOLDERS; do
    if [ $j -eq $i ]; then
      PLACEHOLDER="$P"
      break
    fi
    j=$((j + 1))
  done

  if [ -z "$VALUE" ]; then
    echo "[env.sh] WARNING: $VAR_NAME is not set, leaving placeholder in bundle"
    i=$((i + 1))
    continue
  fi

  if [ -z "$PLACEHOLDER" ]; then
    echo "[env.sh] ERROR: no placeholder found for $VAR_NAME"
    i=$((i + 1))
    continue
  fi

  echo "[env.sh] $VAR_NAME: $PLACEHOLDER -> $VALUE"

  # Replace in all JS files under .next/static (client bundle)
  find .next/static -type f -name "*.js" | while read -r file; do
    sed -i "s|${PLACEHOLDER}|${VALUE}|g" "$file"
  done

  # Replace in server.js and server chunks (SSR bundle)
  find . -maxdepth 1 -type f -name "*.js" | while read -r file; do
    sed -i "s|${PLACEHOLDER}|${VALUE}|g" "$file"
  done

  # Replace in .next/server chunks
  find .next/server -type f -name "*.js" 2>/dev/null | while read -r file; do
    sed -i "s|${PLACEHOLDER}|${VALUE}|g" "$file"
  done

  i=$((i + 1))
done

  # Replace in server.js and server chunks (SSR bundle)
  find . -maxdepth 1 -type f -name "*.js" | while read -r file; do
    sed -i "s|${PLACEHOLDER}|${VALUE}|g" "$file"
  done

  # Replace in .next/server chunks
  find .next/server -type f -name "*.js" 2>/dev/null | while read -r file; do
    sed -i "s|${PLACEHOLDER}|${VALUE}|g" "$file"
  done
done

echo "[env.sh] Runtime env injection complete."

# Execute the CMD (node server.js)
exec "$@"

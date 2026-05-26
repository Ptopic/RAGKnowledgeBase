#!/bin/sh
# Runtime env injection for Next.js standalone deployment
# Replaces placeholder values baked into the JS bundle at build time
# with actual runtime environment variables from Coolify/docker env.
#
# This allows NEXT_PUBLIC_* vars to be set at runtime instead of build time,
# removing the need for GitHub secrets or Docker build args.

set -e

echo "[env.sh] Injecting runtime environment variables into Next.js bundle..."

replace_var() {
  VAR_NAME="$1"
  PLACEHOLDER="$2"
  VALUE=$(eval echo "\$$VAR_NAME")

  if [ -z "$VALUE" ]; then
    echo "[env.sh] WARNING: $VAR_NAME is not set, leaving placeholder in bundle"
    return
  fi

  echo "[env.sh] $VAR_NAME: $PLACEHOLDER -> $VALUE"

  # Replace in all JS files under .next/static (client bundle)
  find .next/static -type f -name "*.js" 2>/dev/null | while read -r file; do
    sed -i "s|${PLACEHOLDER}|${VALUE}|g" "$file"
  done

  # Replace in server.js and server chunks (SSR bundle)
  find . -maxdepth 1 -type f -name "*.js" 2>/dev/null | while read -r file; do
    sed -i "s|${PLACEHOLDER}|${VALUE}|g" "$file"
  done

  # Replace in .next/server chunks
  find .next/server -type f -name "*.js" 2>/dev/null | while read -r file; do
    sed -i "s|${PLACEHOLDER}|${VALUE}|g" "$file"
  done
}

replace_var NEXT_PUBLIC_API_URL           "http://placeholder.api.url"
replace_var NEXT_PUBLIC_WEBSITE_URL       "http://placeholder.website.url"
replace_var NEXT_PUBLIC_APP_NAME          "PLACEHOLDER_APP_NAME"
replace_var NEXT_PUBLIC_GOOGLE_CLIENT_ID  "placeholder.google.client.id"
replace_var NEXT_PUBLIC_ETL_SERVICE       "PLACEHOLDER_ETL_SERVICE"

echo "[env.sh] Runtime env injection complete."

exec "$@"

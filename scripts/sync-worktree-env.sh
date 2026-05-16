#!/bin/bash
set -euo pipefail

MAIN_REPO="/Users/petartopic/Desktop/Petar/RAGKnowledgeBase"
WORKTREE_DIR="/Users/petartopic/Desktop/Petar/RAGKnowledgeBase.wt"

FRONTEND_ENV="$MAIN_REPO/frontend/.env"
BACKEND_ENV="$MAIN_REPO/backend/.env"

if [[ ! -f "$FRONTEND_ENV" ]]; then
  echo "Error: Source file not found: $FRONTEND_ENV"
  exit 1
fi

if [[ ! -f "$BACKEND_ENV" ]]; then
  echo "Error: Source file not found: $BACKEND_ENV"
  exit 1
fi

count=0

for worktree in "$WORKTREE_DIR"/*/; do
  [[ -d "$worktree" ]] || continue

  name=$(basename "$worktree")

  if [[ -d "$worktree/frontend" ]]; then
    cp -f "$FRONTEND_ENV" "$worktree/frontend/.env"
    echo "✓ Copied frontend/.env to $name"
  else
    echo "⚠ Skipped frontend/.env for $name (no frontend directory)"
  fi

  if [[ -d "$worktree/backend" ]]; then
    cp -f "$BACKEND_ENV" "$worktree/backend/.env"
    echo "✓ Copied backend/.env to $name"
  else
    echo "⚠ Skipped backend/.env for $name (no backend directory)"
  fi

  ((count++)) || true
done

echo ""
echo "Done! Copied .env files to $count worktree(s)."

#!/usr/bin/env bash
# Arms PR-on-complete when the submitted prompt contains the trigger line.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FLAG="$ROOT/.cursor/.open-pr-armed"

mkdir -p "$(dirname "$FLAG")"

input=$(cat)
prompt=$(echo "$input" | jq -r '.prompt // .user_message // .message // empty' 2>/dev/null || true)

if [[ "$prompt" == *"open-pr-on-complete"* || "$prompt" == *"/open-pr"* ]]; then
  touch "$FLAG"
fi

exit 0

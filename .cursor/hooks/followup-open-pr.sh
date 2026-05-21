#!/usr/bin/env bash
# After agent stop, queue one follow-up to open a PR if the session was armed.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FLAG="$ROOT/.cursor/.open-pr-armed"

if [[ ! -f "$FLAG" ]]; then
  exit 0
fi

rm -f "$FLAG"

cat <<'EOF'
{
  "followup_message": "The user armed open-pr-on-complete for this task. Follow the open-pr-on-complete skill: check git status; if there are changes, create/use a feature branch, commit with a clear message, push to origin, and open a PR against main (gh pr create if available, else give the GitHub compare URL). Return the PR URL or explain why no PR was created."
}
EOF

exit 0

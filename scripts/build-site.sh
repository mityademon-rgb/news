#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output="$repo_root/site.js"
temp_file="$(mktemp)"
trap 'rm -f "$temp_file"' EXIT

cat \
  "$repo_root/lessons.js" \
  "$repo_root/lesson-plans.js" \
  "$repo_root/app.js" \
  > "$temp_file"

if [[ "${1:-}" == "--check" ]]; then
  if ! cmp -s "$temp_file" "$output"; then
    echo "ERROR: site.js is stale. Run scripts/build-site.sh and commit the result." >&2
    exit 1
  fi
  echo "site.js matches lessons.js + lesson-plans.js + app.js."
  exit 0
fi

if [[ $# -gt 0 ]]; then
  echo "Usage: $0 [--check]" >&2
  exit 2
fi

mv "$temp_file" "$output"
trap - EXIT
echo "Built site.js from lessons.js, lesson-plans.js and app.js."

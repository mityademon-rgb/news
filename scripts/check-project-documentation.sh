#!/usr/bin/env bash
set -euo pipefail

base_sha="${1:-}"
head_sha="${2:-HEAD}"

if [[ -z "$base_sha" ]]; then
  echo "Usage: $0 <base-sha> [head-sha]" >&2
  exit 2
fi

git cat-file -e "$base_sha^{commit}"
if [[ "$head_sha" == "WORKTREE" ]]; then
  mapfile -t changed_files < <(
    {
      git diff --name-only "$base_sha"
      git ls-files --others --exclude-standard
    } | sort -u
  )
else
  git cat-file -e "$head_sha^{commit}"
  mapfile -t changed_files < <(git diff --name-only "$base_sha" "$head_sha")
fi

if [[ ${#changed_files[@]} -eq 0 ]]; then
  echo "Documentation guard: no changed files."
  exit 0
fi

printf 'Documentation guard changed files:\n'
printf '  %s\n' "${changed_files[@]}"

contains_file() {
  local expected="$1"
  local item
  for item in "${changed_files[@]}"; do
    [[ "$item" == "$expected" ]] && return 0
  done
  return 1
}

if ! contains_file "PROJECT_CHANGELOG.md"; then
  echo "ERROR: every project change must update PROJECT_CHANGELOG.md." >&2
  exit 1
fi

if awk '/<!-- NEXT ENTRY -->/{entries=1; next} entries{print}' PROJECT_CHANGELOG.md \
  | grep -Eq '^[-] \*\*(Тип|Цель|Изменено|Связи|Проверки|Откат|Риски и продолжение):\*\* TODO([[:space:]]*)$'; then
  echo "ERROR: PROJECT_CHANGELOG.md contains an unfinished TODO in a required field." >&2
  exit 1
fi

architecture_change=0
for item in "${changed_files[@]}"; do
  case "$item" in
    index.html|styles.css|lesson03-kids.css|lessons.js|lesson-plans.js|teacher-guides.js|app.js|site.js|AGENTS.md|.deploy/*|.github/workflows/*|scripts/*)
      architecture_change=1
      ;;
  esac
done

if [[ "$architecture_change" -eq 1 ]] && ! contains_file "PROJECT_AI_HANDBOOK.md"; then
  echo "ERROR: structural/operational changes also require PROJECT_AI_HANDBOOK.md." >&2
  exit 1
fi

echo "Documentation guard: passed."


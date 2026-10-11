#!/usr/bin/env bash
set -euo pipefail

root_dir="$(git rev-parse --show-toplevel)"
log_file="$root_dir/PROJECT_CHANGELOG.md"
title="${1:-Новое изменение}"
stamp="$(TZ=Europe/Moscow date '+%Y-%m-%d %H:%M MSK')"
marker='<!-- NEXT ENTRY -->'

test -f "$log_file"
grep -Fq "$marker" "$log_file"

entry_file="$(mktemp)"
output_file="$(mktemp)"
trap 'rm -f "$entry_file" "$output_file"' EXIT

cat > "$entry_file" <<EOF

## $stamp — $title

- **Тип:** TODO
- **Цель:** TODO
- **Изменено:** TODO
- **Связи:** TODO
- **Проверки:** TODO
- **Публикация:** не публиковалось
- **Откат:** TODO
- **Риски и продолжение:** TODO
EOF

awk -v marker="$marker" -v entry="$entry_file" '
  { print }
  $0 == marker {
    while ((getline line < entry) > 0) print line
    close(entry)
  }
' "$log_file" > "$output_file"

mv "$output_file" "$log_file"
echo "Создана запись: $title"
echo "Заполните TODO и сохраните PROJECT_CHANGELOG.md в том же commit."


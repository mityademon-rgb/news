#!/usr/bin/env bash
set -euo pipefail

archive_url="https://codeload.github.com/mityademon-rgb/news/tar.gz/refs/heads/boom-kadr-deploy"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

curl -4 -fsSL --connect-timeout 10 --max-time 90 "$archive_url" -o "$work_dir/site.tar.gz"
tar -xzf "$work_dir/site.tar.gz" -C "$work_dir"

source_dir="$work_dir/news-boom-kadr-deploy"
target_dir="/var/www/boom-kadr"

test -s "$source_dir/index.html"
install -d -m 755 "$target_dir" "$target_dir/assets"
install -m 644 "$source_dir/index.html" "$target_dir/index.html"
install -m 644 "$source_dir/styles.css" "$target_dir/styles.css"
install -m 644 "$source_dir/lessons.js" "$target_dir/lessons.js"
install -m 644 "$source_dir/app.js" "$target_dir/app.js"

find "$target_dir/assets" -mindepth 1 -maxdepth 1 -type f -delete
install -m 644 "$source_dir"/assets/* "$target_dir/assets/"
chown -R www-data:www-data "$target_dir"


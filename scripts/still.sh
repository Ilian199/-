#!/usr/bin/env bash
# Использование: scripts/still.sh <Composition> <frame> <out.png> [props-json]
set -e
cd "$(dirname "$0")/.."
npx remotion still src/index.ts "$1" "$3" --frame="$2" --props="${4:-{\}}" \
  --gl=swangle --image-format=png \
  --browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell \
  --log="${LOG:-info}" 2>&1 | grep -v "^\s*$" | grep -iv "memory\|bundling\|docker\|lower amount\|Rendered 0" | tail -${TAILN:-6}

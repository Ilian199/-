#!/usr/bin/env bash
# Рендер диапазона кадров ролика в PNG (возобновляемо): scripts/render-chunk.sh 0-143
set -e
cd "$(dirname "$0")/.."
npx remotion render src/index.ts Promo out/final_frames --sequence --image-format=png \
  --frames="$1" --timeout=600000 --props='{"withAudio":false}' --gl=swangle --concurrency="${CONC:-4}" \
  --browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell

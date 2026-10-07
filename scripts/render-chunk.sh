#!/usr/bin/env bash
# Рендер диапазона кадров в PNG (возобновляемо): scripts/render-chunk.sh 0-143
# COMP=Promo2 OUT=out/final2_frames scripts/render-chunk.sh 0-604 — второй ролик.
set -e
cd "$(dirname "$0")/.."
COMP="${COMP:-Promo}"
OUT="${OUT:-out/final_frames}"
mkdir -p "$OUT"
npx remotion render src/index.ts "$COMP" "$OUT" --sequence --image-format=png \
  --frames="$1" --timeout=600000 --props='{"withAudio":false}' --gl=swangle --concurrency="${CONC:-4}" \
  --browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell

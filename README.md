# Промо «Готовые решения» — ЦифроПрактика

Remotion (React + TypeScript) + three.js. 1080×1920, 30 fps, 23 с, 125 BPM.

## Где что менять
- **Тексты** — `src/texts.ts` (все надписи, кегли подбираются автоматически под 888 px).
- **Тайминги** — `src/config.ts`: границы сцен `SCENES` и события внутри сцен (`*_BEATS`) в долях такта; кадры считаются от времени.
- **Цвета** — `src/brand.ts`. Логотип (вектор) — `src/components/Logo.tsx`.
- **3D-город и медиафасад** — `src/three/` (`world.ts`, `marquee.ts`), камера — `src/scenes/TowerFilm.tsx`.

## Команды
- `npm run studio` — просмотр в Remotion Studio.
- `npm run check:text` — проверка: все надписи на максимальном масштабе ≤ 888 px (список выходящих должен быть пустым).
- `npm run audio` — пересобрать саундтрек и эффекты (`public/audio/soundtrack.wav`, −14 LUFS). Если положить `public/music.mp3`, музыка возьмётся из него.
- Финальный рендер: `scripts/render-chunk.sh 0-690` (PNG-кадры в `out/final_frames`, можно частями), затем
  `ffmpeg -framerate 30 -i out/final_frames/element-%03d.png -i public/audio/soundtrack.wav -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -c:a aac -b:a 320k -shortest -movflags +faststart out/cifropraktika_gotovye_resheniya.mp4`

Без видеокарты 3D рендерится программно (`--gl=swangle`): ~1 ч на весь ролик. На Windows с GPU — `--gl=angle`.

// Генерация саундтрека кодом (без сторонних сэмплов — без проблем с правами):
// ночной synthwave/electro 125 BPM + все звуковые эффекты, расставленные по тем же
// долям, что и анимация (тайминги из src/config.ts). Затем громкость приводится
// к −14 LUFS (true peak −1 dBTP) через ffmpeg loudnorm.
//
// Запуск: npm run audio  →  public/audio/soundtrack.wav
// Если в проекте есть public/music.mp3, музыка берётся из него, а синтезируются
// только звуковые эффекты. Сам синтез — scripts/audio-engine.ts.

import {
	APP_BEATS,
	BPM,
	DURATION_IN_FRAMES,
	FINALE_BEATS,
	FPS,
	LETTER_BEATS,
	PROBLEM_BEATS,
	SCENES,
	SLOGAN_BEATS,
	STEP_BEATS,
	TOWER_EVENTS,
} from '../src/config';
import {createEngine, t} from './audio-engine';

const DUR = DURATION_IN_FRAMES / FPS;
const E = createEngine(DUR);
const {pad, bassNote, pluck, lead, stab, kick, clap, hat, crash, reverseCymbal, subDrop, snareRoll, riser} = E;
const {whoosh, click, pop, ding, neonBuzz, glitchCrackle, windAndHum} = E;

// ---------- музыка ----------
// Гармония (ля минор): Am – F – C – G, такт = 4 доли, отсчёт тактов от дропа.
const CHORDS = [
	[57, 60, 64], // Am
	[53, 57, 60], // F
	[48, 52, 55], // C
	[55, 59, 62], // G
];
const ROOTS = [45, 41, 48, 43];
const chordAt = (beat: number) => {
	const bar = Math.floor((beat - TOWER_EVENTS.drop) / 4);
	return ((bar % 4) + 4) % 4;
};

/** Партии отключаются в паузах: «рутину в» (дропаут) и после финального удара. */
const FIN = SCENES.finale.from;
const FINAL_HIT = FIN + FINALE_BEATS.finalHit;
const DROPOUT: [number, number][] = [[SCENES.slogan.from, SCENES.slogan.from + SLOGAN_BEATS.plate]];
const grooveOn = (beat: number) =>
	beat >= TOWER_EVENTS.drop && beat < FINAL_HIT && !DROPOUT.some(([a, b]) => beat >= a && beat < b);


// ---------- аранжировка ----------
const LAST = SCENES.finale.to;
// интро: пэд на ля миноре и riser на пролёте дрона
pad(0, t(TOWER_EVENTS.drop), [45, 57, 60, 64], 0.05, 700);
riser(0.5, TOWER_EVENTS.drop, 0.32);
// пульсирующий бас с открывающимся фильтром на подъёме
for (let b = TOWER_EVENTS.riseStart; b < TOWER_EVENTS.drop; b += 0.5) bassNote(t(b), t(0.4), 33 + (b % 1 ? 12 : 0), 0.32, (b - 2.5) / 3.5);
snareRoll(TOWER_EVENTS.drop - 2, TOWER_EVENTS.drop, 0.55);
reverseCymbal(t(TOWER_EVENTS.drop), 1.2, 0.5);

// грув
for (let beat = TOWER_EVENTS.drop; beat < FINAL_HIT; beat += 1) {
	if (!grooveOn(beat)) continue;
	const ch = chordAt(beat);
	kick(t(beat), 0.95);
	if (Math.round(beat - TOWER_EVENTS.drop) % 2 === 1) clap(t(beat), 0.7);
	hat(t(beat + 0.5), 0.55, true);
	hat(t(beat + 0.25), 0.3, false, -0.3);
	hat(t(beat + 0.75), 0.3, false, 0.3);
	for (const o of [0, 0.5]) bassNote(t(beat + o), t(0.42), ROOTS[ch] - 12 + (o ? 12 : 0), 0.34, 0.6);
	// арпеджио с 10-й доли
	if (beat >= SCENES.problem.from) {
		const notes = [...CHORDS[ch], CHORDS[ch][0] + 12];
		for (let s = 0; s < 4; s++) pluck(t(beat + s * 0.25), notes[(s + Math.floor(beat)) % notes.length] + 12, 0.07, s % 2 ? 0.4 : -0.4, 0.7 + 0.3 * ((beat - 10) / 30));
	}
}
// пэд-аккорды по тактам
for (let bar = TOWER_EVENTS.drop; bar < FINAL_HIT; bar += 4) {
	const ch = chordAt(bar);
	pad(t(bar), t(Math.min(4, FINAL_HIT - bar)) - 0.05, CHORDS[ch], 0.035, 1500);
}
// мелодия в основной части (сцена 5)
const MELODY: [number, number, number][] = [
	// [доля от начала сцены 5, длина в долях, нота]
	[0, 1.5, 76], [1.5, 0.5, 74], [2, 1, 72], [3, 1, 69],
	[4, 1.5, 72], [5.5, 0.5, 74], [6, 2, 76],
	[8, 1.5, 79], [9.5, 0.5, 77], [10, 1, 76], [11, 1, 74],
	[12, 1, 72], [13, 1, 74], [14, 1, 76],
];
for (const [b, d, m] of MELODY) lead(t(SCENES.app.from + b), t(d) * 0.92, m, 0.06);

// ---------- удары и переходы ----------
const DROP = TOWER_EVENTS.drop;
crash(t(DROP), 0.9);
subDrop(t(DROP), 0.55);
stab(t(DROP), [57, 64, 69, 72], 0.06);
crash(t(TOWER_EVENTS.glitch), 0.35, 1);
// «рутину в» — дропаут, «автомат» — удар
const AUTO = SCENES.slogan.from + SLOGAN_BEATS.plate;
riser(SCENES.slogan.from - 2, AUTO, 0.22);
snareRoll(SCENES.problem.to - 1.5, SCENES.slogan.from, 0.45);
kick(t(AUTO), 1.3, 1.8);
subDrop(t(AUTO), 0.7, 1.6);
crash(t(AUTO), 1);
stab(t(AUTO), [57, 60, 64, 69], 0.08);
// финал
reverseCymbal(t(FIN), 1.4, 0.55);
crash(t(FIN), 0.7);
riser(SCENES.steps.from + 1, FIN, 0.2);
kick(t(FINAL_HIT), 1.4, 2.4);
subDrop(t(FINAL_HIT), 0.8, 2.6);
crash(t(FINAL_HIT), 1.1, 3.4);
stab(t(FINAL_HIT), [45, 57, 64, 69, 72, 76], 0.07);
pad(t(FINAL_HIT), t(LAST - FINAL_HIT) - 1.4, [57, 60, 64, 69], 0.05, 1100);

windAndHum(0, t(TOWER_EVENTS.drop) + 0.4, 0.5);
LETTER_BEATS.forEach((b, i) => neonBuzz(t(b), 0.28, -0.6 + (1.2 * i) / (LETTER_BEATS.length - 1)));
neonBuzz(t(DROP), 0.35, 0);
glitchCrackle(t(TOWER_EVENTS.glitch), 4 / FPS + 0.08, 0.32);
// облёт по дуге
whoosh(t(DROP + 0.3), t(2.2), 0.22, true, 0.8, -0.8);
// влёт в фасад + вспышка
whoosh(t(TOWER_EVENTS.diveStart), t(TOWER_EVENTS.flash - TOWER_EVENTS.diveStart), 0.45, true, 0, 0);
// фразы проблемы влетают с разных сторон
const P = SCENES.problem.from;
whoosh(t(P + PROBLEM_BEATS.phrases[0]) - 0.06, 0.25, 0.25, false, -0.8, 0);
whoosh(t(P + PROBLEM_BEATS.phrases[1]) - 0.06, 0.25, 0.25, false, 0.8, 0);
whoosh(t(P + PROBLEM_BEATS.phrases[2]) - 0.06, 0.25, 0.25, false, 0, 0);
whoosh(t(P + PROBLEM_BEATS.strike), 0.3, 0.2, true, -0.7, 0.7);
pop(t(P + PROBLEM_BEATS.familiar), 0.5);
// бирюзовая шторка и zoom-through
whoosh(t(SCENES.slogan.from - 0.5), t(1), 0.3, true, 0, 0);
whoosh(t(SCENES.slogan.from + SLOGAN_BEATS.zoomThrough), t(4 - SLOGAN_BEATS.zoomThrough), 0.4, true, 0, 0);
// приложение
const AP = SCENES.app.from;
whoosh(t(AP + APP_BEATS.phoneIn), 0.35, 0.3, false, 0.6, 0);
APP_BEATS.cards.forEach((b, i) => pop(t(AP + b), 0.45, -0.3 + i * 0.3));
for (const b of [APP_BEATS.tapCard, APP_BEATS.tapDate, APP_BEATS.tapSend, APP_BEATS.tapReport]) click(t(AP + b), 0.5);
for (const b of [APP_BEATS.toBooking, APP_BEATS.toRequests, APP_BEATS.toEvents]) whoosh(t(AP + b) - 0.03, 0.2, 0.12, true, 0.4, -0.4);
ding(t(AP + APP_BEATS.toast), 0.22);
whoosh(t(AP + APP_BEATS.tapSend) + 0.07, t(APP_BEATS.rowIn - APP_BEATS.tapSend), 0.18, false, 0.3, -0.3);
pop(t(AP + APP_BEATS.rowIn), 0.4);
ding(t(AP + APP_BEATS.accepted), 0.22);
for (let i = 0; i < 4; i++) pop(t(AP + APP_BEATS.tapReport) + (2 + i * 2) / FPS, 0.35, i % 2 ? 0.6 : -0.6);
whoosh(t(AP + APP_BEATS.whip), t(APP_BEATS.end - APP_BEATS.whip) + 0.1, 0.5, true, 0.9, -0.9);
// шаги
const ST = SCENES.steps.from;
STEP_BEATS.steps.forEach((b, i) => pop(t(ST + b), 0.45, -0.3 + i * 0.3));
whoosh(t(ST + STEP_BEATS.collapse), t(4 - STEP_BEATS.collapse), 0.4, true, 0, 0);
// финал
whoosh(t(FIN), 0.6, 0.3, false, 0, 0);
neonBuzz(t(FIN + FINALE_BEATS.wave), 0.25, 0);
pop(t(FIN + FINALE_BEATS.logo + 0.5), 0.45);
click(t(FIN + FINALE_BEATS.link), 0.4);

// сведение: сайдчейн от бочки на каждой доле грува, затухание в конце
const duckBeats: number[] = [];
for (let beat = DROP; beat < FINAL_HIT; beat += 1) if (grooveOn(beat)) duckBeats.push(beat);
E.finish({out: 'public/audio/soundtrack.wav', duckBeats, fadeFrom: t(LAST) - 1.6});
console.log(`BPM ${BPM}`);

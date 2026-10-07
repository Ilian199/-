// Саундтрек ролика 2 «Телефон организатора» (синтез, без сэмплов).
// Драматургия: пинги уведомлений учащаются и сами складываются в ритм → вдох
// на «рутину в» → дроп на «автомат» → плотный бит под демонстрации → ударные
// уходят на «вы занимаетесь делом» → финальный удар на ссылке и затухание.
//
// Запуск: npm run audio2  →  public/audio/soundtrack2.wav (−14 LUFS)

import {BPM, FPS} from '../src/config';
import {CHAOS_BEATS, CTA_BEATS, DEMO2_BEATS, DURATION2, SCENES2, SLOGAN2_BEATS} from '../src/v2/config';
import {SR, createEngine, t} from './audio-engine';

const S = SCENES2;
const E = createEngine(DURATION2 / FPS);
const {pad, bassNote, pluck, lead, stab, kick, clap, hat, crash, reverseCymbal, subDrop, riser} = E;
const {whoosh, click, pop, ding, neonBuzz} = E;

/** Короткий «пинг» уведомления: два синуса с быстрым спадом. Высота растёт с накалом. */
const ping = (start: number, gain: number, semis: number, pan: number) => {
	const i0 = Math.floor(start * SR);
	const f1 = 1568 * Math.pow(2, semis / 12);
	for (let i = 0; i < 0.32 * SR; i++) {
		const x = i / SR;
		const second = x > 0.06 ? Math.sin(2 * Math.PI * f1 * 1.335 * (x - 0.06)) * Math.exp(-(x - 0.06) * 16) : 0;
		const v = (Math.sin(2 * Math.PI * f1 * x) * Math.exp(-x * 22) + second * 0.8) * gain;
		E.add(E.sfx, i0 + i, v, pan);
		E.add(E.verbSend, i0 + i, v * 0.25, pan);
	}
};

// Гармония: Am – F – C – G по тактам от дропа
const CHORDS = [
	[57, 60, 64],
	[53, 57, 60],
	[48, 52, 55],
	[55, 59, 62],
];
const ROOTS = [45, 41, 48, 43];
const DROP = S.slogan.from + SLOGAN2_BEATS.plate; // «автомат»
const chordAt = (beat: number) => ((Math.floor((beat - DROP) / 4) % 4) + 4) % 4;
const FINAL_HIT = S.cta.from + CTA_BEATS.finalHit;
/** Где играет полный бит: от дропа до финального удара, кроме «спокойствия». */
const grooveOn = (beat: number) => beat >= DROP && beat < FINAL_HIT && !(beat >= S.calm.from && beat < S.cta.from);

// ---------- хаос: пинги учащаются и превращаются в ритм ----------
pad(0, t(S.slogan.from) + 0.2, [45, 52, 57, 60], 0.035, 600);
CHAOS_BEATS.notifications.forEach((b, i) => {
	const k = i / (CHAOS_BEATS.notifications.length - 1);
	ping(t(b), 0.22 + 0.12 * k, Math.floor(k * 5), i % 2 ? 0.45 : -0.45);
});
// тикающий хэт и бас-пульс подхватывают пинги
for (let b = 2; b < S.slogan.from; b += 0.5) hat(t(b), 0.2 + 0.25 * (b / 8), false, b % 1 ? 0.3 : -0.3);
for (let b = 4; b < S.slogan.from; b += 0.5) bassNote(t(b), t(0.35), 33 + (b % 1 ? 12 : 0), 0.26, (b - 4) / 4);
riser(4, DROP, 0.26);
whoosh(t(CHAOS_BEATS.swipe), t(S.slogan.from - CHAOS_BEATS.swipe) + 0.05, 0.5, true, 0.8, -0.9);

// ---------- «рутину в» — вдох, «автомат» — дроп ----------
reverseCymbal(t(DROP), 1.0, 0.5);
kick(t(DROP), 1.3, 1.8);
subDrop(t(DROP), 0.7, 1.6);
crash(t(DROP), 1);
stab(t(DROP), [57, 60, 64, 69], 0.08);
whoosh(t(S.tower.from) - 0.25, 0.3, 0.35, true, 0, 0); // zoom-through

// ---------- башня ----------
for (let i = 0; i < 13; i++) neonBuzz(t(S.tower.from) + (i * 1.2) / FPS, 0.14, -0.6 + i * 0.1);
whoosh(t(S.tower.to - 0.85), t(0.85), 0.45, true, 0, 0); // влёт в фасад

// ---------- бит ----------
for (let beat = DROP; beat < FINAL_HIT; beat += 1) {
	if (!grooveOn(beat)) continue;
	const ch = chordAt(beat);
	kick(t(beat), 0.95);
	if (Math.round(beat - DROP) % 2 === 1) clap(t(beat), 0.7);
	hat(t(beat + 0.5), 0.55, true);
	hat(t(beat + 0.25), 0.3, false, -0.3);
	hat(t(beat + 0.75), 0.3, false, 0.3);
	for (const o of [0, 0.5]) bassNote(t(beat + o), t(0.42), ROOTS[ch] - 12 + (o ? 12 : 0), 0.34, 0.6);
	if (beat >= S.booking.from) {
		const notes = [...CHORDS[ch], CHORDS[ch][0] + 12];
		for (let s = 0; s < 4; s++) pluck(t(beat + s * 0.25), notes[(s + Math.floor(beat)) % notes.length] + 12, 0.07, s % 2 ? 0.4 : -0.4, 0.8);
	}
}
for (let bar = DROP; bar < FINAL_HIT; bar += 4) pad(t(bar), t(Math.min(4, FINAL_HIT - bar)) - 0.05, CHORDS[chordAt(bar)], 0.035, 1500);

// мелодия под демонстрации
const MELODY: [number, number, number][] = [
	[0, 1.5, 76], [1.5, 0.5, 74], [2, 1, 72], [3, 1, 69],
	[4, 1.5, 72], [5.5, 0.5, 74], [6, 2, 76],
	[8, 1.5, 79], [9.5, 0.5, 77], [10, 1, 76], [11, 1, 74],
	[12, 1, 72], [13, 1, 74], [14, 2, 76],
];
for (const [b, d, m] of MELODY) lead(t(S.booking.from + b), t(d) * 0.92, m, 0.055);

// ---------- демонстрации ----------
const bk = S.booking.from;
click(t(bk + DEMO2_BEATS.booking.tap), 0.5);
ding(t(bk + DEMO2_BEATS.booking.toast), 0.22);
const rq = S.requests.from;
whoosh(t(rq) - 0.03, 0.2, 0.12, true, 0.4, -0.4);
click(t(rq + DEMO2_BEATS.requests.tap), 0.5);
whoosh(t(rq + DEMO2_BEATS.requests.tap) + 0.07, t(DEMO2_BEATS.requests.rowIn - DEMO2_BEATS.requests.tap), 0.18, false, 0.3, -0.3);
pop(t(rq + DEMO2_BEATS.requests.rowIn), 0.4);
ding(t(rq + DEMO2_BEATS.requests.accepted), 0.22);
const rp = S.reports.from;
whoosh(t(rp) - 0.03, 0.2, 0.12, true, 0.4, -0.4);
click(t(rp + DEMO2_BEATS.reports.tap), 0.5);
for (let i = 0; i < 4; i++) pop(t(rp + DEMO2_BEATS.reports.tap) + (2 + i * 2) / FPS, 0.35, i % 2 ? 0.6 : -0.6);

// ---------- спокойствие: бит уходит, остаются пэд и мягкое арпеджио ----------
pad(t(S.calm.from), t(S.cta.from - S.calm.from), [57, 60, 64, 71], 0.045, 900);
for (let b = S.calm.from; b < S.cta.from; b += 0.5) pluck(t(b), [69, 72, 76, 79][Math.round((b - S.calm.from) * 2) % 4], 0.045, b % 1 ? 0.3 : -0.3, 0.4);
reverseCymbal(t(S.cta.from), 1.0, 0.35);

// ---------- призыв ----------
const ct = S.cta.from;
crash(t(ct), 0.5, 1.4);
pop(t(ct + CTA_BEATS.logo + 0.4), 0.45);
CTA_BEATS.words.forEach((b, i) => pop(t(ct + b), 0.5, -0.3 + i * 0.3));
kick(t(FINAL_HIT), 1.4, 2.4);
subDrop(t(FINAL_HIT), 0.8, 2.6);
crash(t(FINAL_HIT), 1.1, 3.4);
stab(t(FINAL_HIT), [45, 57, 64, 69, 72, 76], 0.07);
pad(t(FINAL_HIT), t(S.cta.to - FINAL_HIT) - 1.2, [57, 60, 64, 69], 0.05, 1100);
click(t(ct + CTA_BEATS.link), 0.35);

// ---------- сведение ----------
const duckBeats: number[] = [];
for (let beat = DROP; beat < FINAL_HIT; beat += 1) if (grooveOn(beat)) duckBeats.push(beat);
E.finish({out: 'public/audio/soundtrack2.wav', duckBeats, fadeFrom: t(S.cta.to) - 1.6});
console.log(`BPM ${BPM}`);

// Генерация саундтрека кодом (без сторонних сэмплов — без проблем с правами):
// ночной synthwave/electro 125 BPM + все звуковые эффекты, расставленные по тем же
// долям, что и анимация (тайминги из src/config.ts). Затем громкость приводится
// к −14 LUFS (true peak −1 dBTP) через ffmpeg loudnorm.
//
// Запуск: npm run audio  →  public/audio/soundtrack.wav
// Если в проекте есть public/music.mp3, музыка берётся из него (см. ниже), а
// синтезируются только звуковые эффекты.

import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
	APP_BEATS,
	BPM,
	DURATION_IN_FRAMES,
	FINALE_BEATS,
	FPS,
	LETTER_BEATS,
	PROBLEM_BEATS,
	SCENES,
	SECONDS_PER_BEAT,
	SLOGAN_BEATS,
	STEP_BEATS,
	TOWER_EVENTS,
} from '../src/config';

const SR = 48000;
const DUR = DURATION_IN_FRAMES / FPS;
const N = Math.ceil(DUR * SR);
const t = (beat: number) => beat * SECONDS_PER_BEAT; // секунды от доли

// ---------- буферы ----------
type Stereo = {L: Float32Array; R: Float32Array};
const bus = (): Stereo => ({L: new Float32Array(N), R: new Float32Array(N)});
const add = (b: Stereo, i: number, v: number, pan = 0) => {
	if (i < 0 || i >= N) return;
	const a = (pan + 1) * 0.25 * Math.PI;
	b.L[i] += v * Math.cos(a) * Math.SQRT2;
	b.R[i] += v * Math.sin(a) * Math.SQRT2;
};

// ---------- генераторы ----------
let seed = 1234567;
const rnd = () => {
	seed = (seed * 1664525 + 1013904223) >>> 0;
	return seed / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const polyblep = (ph: number, dt: number) => {
	if (ph < dt) {
		const x = ph / dt;
		return x + x - x * x - 1;
	}
	if (ph > 1 - dt) {
		const x = (ph - 1) / dt;
		return x * x + x + x + 1;
	}
	return 0;
};
const sawS = (ph: number, dt: number) => 2 * ph - 1 - polyblep(ph, dt);
const sqS = (ph: number, dt: number) => (ph < 0.5 ? 1 : -1) + polyblep(ph, dt) - polyblep((ph + 0.5) % 1, dt);
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Фильтр state-variable (TPT): lp / bp / hp. */
class SVF {
	ic1 = 0;
	ic2 = 0;
	run(x: number, fc: number, q: number, mode: 'lp' | 'bp' | 'hp' = 'lp') {
		const g = Math.tan((Math.PI * Math.min(fc, SR * 0.45)) / SR);
		const k = 1 / q;
		const a1 = 1 / (1 + g * (g + k));
		const a2 = g * a1;
		const a3 = g * a2;
		const v3 = x - this.ic2;
		const v1 = a1 * this.ic1 + a2 * v3;
		const v2 = this.ic2 + a2 * this.ic1 + a3 * v3;
		this.ic1 = 2 * v1 - this.ic1;
		this.ic2 = 2 * v2 - this.ic2;
		return mode === 'lp' ? v2 : mode === 'bp' ? v1 : x - k * v1 - v2;
	}
}

const adsr = (x: number, dur: number, a: number, d: number, s: number, r: number) => {
	if (x < 0) return 0;
	if (x < a) return x / a;
	if (x < a + d) return 1 - (1 - s) * ((x - a) / d);
	if (x < dur) return s;
	if (x < dur + r) return s * (1 - (x - dur) / r);
	return 0;
};

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

const music = bus();
const drums = bus();
const sfx = bus();
const verbSend = bus();

/** Партии отключаются в паузах: «рутину в» (дропаут) и после финального удара. */
const FIN = SCENES.finale.from;
const FINAL_HIT = FIN + FINALE_BEATS.finalHit;
const DROPOUT: [number, number][] = [[SCENES.slogan.from, SCENES.slogan.from + SLOGAN_BEATS.plate]];
const grooveOn = (beat: number) =>
	beat >= TOWER_EVENTS.drop && beat < FINAL_HIT && !DROPOUT.some(([a, b]) => beat >= a && beat < b);

// пэд
const pad = (start: number, dur: number, notes: number[], gain: number, cutoff: number) => {
	for (const [vi, m] of notes.entries()) {
		for (const det of [-0.11, 0, 0.12]) {
			const f = mtof(m + det);
			const flt = new SVF();
			let ph = rnd();
			const i0 = Math.floor(start * SR);
			const len = Math.floor((dur + 1.2) * SR);
			const pan = (vi - 1) * 0.5 + det * 2;
			for (let i = 0; i < len; i++) {
				const x = i / SR;
				ph = (ph + f / SR) % 1;
				const env = adsr(x, dur, 0.35, 0.4, 0.8, 1.1);
				const v = flt.run(sawS(ph, f / SR), cutoff * (0.8 + 0.2 * Math.sin(x * 1.3 + vi)), 0.9) * env * gain;
				add(music, i0 + i, v, pan);
				add(verbSend, i0 + i, v * 0.5, pan);
			}
		}
	}
};

// бас: октавные восьмые (synthwave)
const bassNote = (start: number, dur: number, m: number, gain: number, open: number) => {
	const f = mtof(m);
	const flt = new SVF();
	let ph = 0;
	let ph2 = 0;
	const i0 = Math.floor(start * SR);
	const len = Math.floor((dur + 0.05) * SR);
	for (let i = 0; i < len; i++) {
		const x = i / SR;
		ph = (ph + f / SR) % 1;
		ph2 = (ph2 + f / 2 / SR) % 1;
		const env = adsr(x, dur, 0.004, 0.08, 0.6, 0.04);
		const fc = 180 + open * 1500 * Math.exp(-x * 18);
		const v = flt.run(sawS(ph, f / SR) * 0.7 + sqS(ph2, f / 2 / SR) * 0.5, fc, 1.6) * env * gain;
		add(music, i0 + i, v, 0);
	}
};

// арпеджио: щипок квадратом с пинг-понг задержкой
const pluck = (start: number, m: number, gain: number, pan: number, bright = 1) => {
	const f = mtof(m);
	const flt = new SVF();
	let ph = 0;
	const i0 = Math.floor(start * SR);
	const len = Math.floor(0.22 * SR);
	for (let i = 0; i < len; i++) {
		const x = i / SR;
		ph = (ph + f / SR) % 1;
		const env = Math.exp(-x * 16);
		const v = flt.run(sqS(ph, f / SR), 600 + 4200 * bright * Math.exp(-x * 22), 1.2) * env * gain;
		add(music, i0 + i, v, pan);
		// задержка на пунктирную восьмую
		const dl = Math.floor(SECONDS_PER_BEAT * 0.75 * SR);
		add(music, i0 + i + dl, v * 0.35, -pan);
		add(music, i0 + i + dl * 2, v * 0.15, pan);
		add(verbSend, i0 + i, v * 0.4, pan);
	}
};

// ведущий синт
const lead = (start: number, dur: number, m: number, gain: number) => {
	const f0 = mtof(m);
	const flt = new SVF();
	let p1 = 0;
	let p2 = 0.3;
	const i0 = Math.floor(start * SR);
	const len = Math.floor((dur + 0.25) * SR);
	for (let i = 0; i < len; i++) {
		const x = i / SR;
		const vib = 1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * x) * Math.min(1, x * 4);
		const f = f0 * vib;
		p1 = (p1 + (f * 1.003) / SR) % 1;
		p2 = (p2 + (f * 0.997) / SR) % 1;
		const env = adsr(x, dur, 0.01, 0.12, 0.7, 0.2);
		const v = flt.run(sawS(p1, f / SR) + sawS(p2, f / SR), 2600, 1.1) * env * gain;
		add(music, i0 + i, v, 0.1);
		add(verbSend, i0 + i, v * 0.7, 0);
		const dl = Math.floor(SECONDS_PER_BEAT * 0.75 * SR);
		add(music, i0 + i + dl, v * 0.25, -0.5);
	}
};

// стэб-аккорд для ударов
const stab = (start: number, notes: number[], gain: number) => {
	for (const m of notes) {
		for (const det of [-0.15, 0.15]) {
			const f = mtof(m + det);
			const flt = new SVF();
			let ph = rnd();
			const i0 = Math.floor(start * SR);
			const len = Math.floor(1.2 * SR);
			for (let i = 0; i < len; i++) {
				const x = i / SR;
				ph = (ph + f / SR) % 1;
				const env = Math.exp(-x * 3.2);
				const v = flt.run(sawS(ph, f / SR), 800 + 5000 * Math.exp(-x * 6), 1) * env * gain;
				add(music, i0 + i, v, det * 3);
				add(verbSend, i0 + i, v * 0.8, det * 3);
			}
		}
	}
};

// ---------- ударные ----------
const kick = (start: number, gain = 1, long = 1) => {
	const i0 = Math.floor(start * SR);
	const len = Math.floor(0.45 * long * SR);
	let ph = 0;
	for (let i = 0; i < len; i++) {
		const x = i / SR;
		const f = 45 + 120 * Math.exp(-x * 28);
		ph += f / SR;
		const env = Math.exp(-x * (7 / long));
		const click = i < 90 ? noise() * (1 - i / 90) * 0.5 : 0;
		const v = (Math.tanh(Math.sin(2 * Math.PI * ph) * 1.6) * env + click) * gain;
		add(drums, i0 + i, v, 0);
	}
};
const clap = (start: number, gain = 1) => {
	const i0 = Math.floor(start * SR);
	const flt = new SVF();
	const len = Math.floor(0.3 * SR);
	for (let i = 0; i < len; i++) {
		const x = i / SR;
		// три быстрых всплеска + хвост
		const bursts = [0, 0.011, 0.022].reduce((a, o) => a + (x >= o ? Math.exp(-(x - o) * 180) : 0), 0);
		const env = bursts * 0.6 + Math.exp(-x * 14) * 0.5;
		const v = flt.run(noise(), 1500, 0.8, 'bp') * env * gain * 1.8 + Math.sin(2 * Math.PI * 190 * x) * Math.exp(-x * 30) * 0.25 * gain;
		add(drums, i0 + i, v, 0.05);
		add(verbSend, i0 + i, v * 0.35, 0);
	}
};
const hat = (start: number, gain = 1, open = false, pan = 0.25) => {
	const i0 = Math.floor(start * SR);
	const flt = new SVF();
	const len = Math.floor((open ? 0.28 : 0.05) * SR);
	for (let i = 0; i < len; i++) {
		const x = i / SR;
		const env = Math.exp(-x * (open ? 11 : 75));
		add(drums, i0 + i, flt.run(noise(), 8500, 0.7, 'hp') * env * gain * 0.55, pan);
	}
};
const crash = (start: number, gain = 1, dur = 2.2) => {
	const i0 = Math.floor(start * SR);
	const f1 = new SVF();
	const f2 = new SVF();
	const len = Math.floor(dur * SR);
	for (let i = 0; i < len; i++) {
		const x = i / SR;
		const env = Math.exp(-x * (3.2 / dur)) * Math.min(1, x * 400);
		const n = f1.run(noise(), 5500, 0.6, 'hp');
		const m = f2.run(noise(), 3200, 3, 'bp');
		const v = (n * 0.5 + m * 0.4) * env * gain;
		add(drums, i0 + i, v, -0.2);
		add(drums, i0 + i, v * 0.9, 0.2);
		add(verbSend, i0 + i, v * 0.3, 0);
	}
};
const reverseCymbal = (end: number, len: number, gain = 1) => {
	const i0 = Math.floor((end - len) * SR);
	const flt = new SVF();
	const n = Math.floor(len * SR);
	for (let i = 0; i < n; i++) {
		const x = i / n;
		add(drums, i0 + i, flt.run(noise(), 2500 + 7000 * x, 0.7, 'hp') * Math.pow(x, 2.4) * gain, 0);
	}
};
const subDrop = (start: number, gain = 1, dur = 1.4) => {
	const i0 = Math.floor(start * SR);
	let ph = 0;
	for (let i = 0; i < dur * SR; i++) {
		const x = i / SR;
		ph += (38 + 30 * Math.exp(-x * 4)) / SR;
		add(drums, i0 + i, Math.sin(2 * Math.PI * ph) * Math.exp(-x * (2.6 / dur)) * gain, 0);
	}
};
const snareRoll = (from: number, to: number, gain: number) => {
	// от восьмых к тридцать вторым, громкость растёт
	let b = from;
	while (b < to - 1e-6) {
		const k = (b - from) / (to - from);
		clap(t(b), gain * (0.25 + 0.75 * k));
		b += k < 0.5 ? 0.5 : k < 0.75 ? 0.25 : 0.125;
	}
};
const riser = (from: number, to: number, gain: number) => {
	const i0 = Math.floor(t(from) * SR);
	const n = Math.floor((t(to) - t(from)) * SR);
	const flt = new SVF();
	let ph = 0;
	for (let i = 0; i < n; i++) {
		const x = i / n;
		const f = 180 * Math.pow(8, x);
		ph = (ph + f / SR) % 1;
		const v = (flt.run(noise(), 400 + 9000 * x * x, 2.5, 'bp') * 0.8 + sawS(ph, f / SR) * 0.12) * Math.pow(x, 1.6) * gain;
		add(music, i0 + i, v, Math.sin(x * 20) * 0.3);
		add(verbSend, i0 + i, v * 0.3, 0);
	}
};

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

// ---------- звуковые эффекты ----------
const whoosh = (start: number, dur: number, gain: number, up = true, panFrom = -0.8, panTo = 0.8) => {
	const i0 = Math.floor(start * SR);
	const n = Math.floor(dur * SR);
	const flt = new SVF();
	for (let i = 0; i < n; i++) {
		const x = i / n;
		const env = Math.sin(Math.PI * Math.pow(x, up ? 0.7 : 1.3));
		const fc = up ? 300 + 5000 * x * x : 5000 - 4600 * x;
		add(sfx, i0 + i, flt.run(noise(), fc, 1.8, 'bp') * env * gain, panFrom + (panTo - panFrom) * x);
	}
};
const click = (start: number, gain = 1) => {
	const i0 = Math.floor(start * SR);
	for (let i = 0; i < 0.03 * SR; i++) {
		const x = i / SR;
		add(sfx, i0 + i, (Math.sin(2 * Math.PI * 3200 * x) * Math.exp(-x * 260) + (i < 40 ? noise() * 0.6 : 0)) * gain, 0.1);
	}
};
const pop = (start: number, gain = 1, pan = 0) => {
	const i0 = Math.floor(start * SR);
	let ph = 0;
	for (let i = 0; i < 0.09 * SR; i++) {
		const x = i / SR;
		ph += (900 * Math.exp(-x * 30) + 260) / SR;
		add(sfx, i0 + i, Math.sin(2 * Math.PI * ph) * Math.exp(-x * 38) * gain, pan);
	}
};
const ding = (start: number, gain = 1) => {
	const i0 = Math.floor(start * SR);
	const notes: [number, number, number][] = [
		[0, 1318.5, 1],
		[0.09, 1975.5, 0.8],
	];
	for (const [o, f, g] of notes) {
		const j0 = i0 + Math.floor(o * SR);
		for (let i = 0; i < 1.1 * SR; i++) {
			const x = i / SR;
			const v = (Math.sin(2 * Math.PI * f * x) + 0.35 * Math.sin(2 * Math.PI * f * 2.76 * x) * Math.exp(-x * 9)) * Math.exp(-x * 4.5) * g * gain;
			add(sfx, j0 + i, v, 0.15);
			add(verbSend, j0 + i, v * 0.4, 0);
		}
	}
};
const neonBuzz = (start: number, gain = 1, pan = 0) => {
	const i0 = Math.floor(start * SR);
	const flt = new SVF();
	let ph = 0;
	const n = Math.floor(0.2 * SR);
	for (let i = 0; i < n; i++) {
		const x = i / SR;
		ph = (ph + 100 / SR) % 1;
		const crackle = rnd() < 0.004 ? noise() * 3 : 0;
		const flick = x < 0.03 ? 1 : x < 0.05 ? 0.2 : 1;
		const env = Math.min(1, x * 300) * Math.exp(-x * 9) * flick;
		const v = (flt.run(sqS(ph, 100 / SR) + crackle, 1800, 2, 'bp') * 0.6 + (i < 60 ? noise() : 0)) * env * gain;
		add(sfx, i0 + i, v, pan);
	}
};
const glitchCrackle = (start: number, dur: number, gain = 1) => {
	const i0 = Math.floor(start * SR);
	const n = Math.floor(dur * SR);
	let hold = 0;
	let held = 0;
	let ph = 0;
	for (let i = 0; i < n; i++) {
		if (hold-- <= 0) {
			hold = Math.floor(8 + rnd() * 60);
			held = noise();
		}
		ph = (ph + (400 + 3000 * rnd()) / SR) % 1;
		const gate = Math.sin((i / SR) * 2 * Math.PI * 18) > -0.2 ? 1 : 0.1;
		const v = (Math.round(held * 6) / 6 + (ph < 0.5 ? 0.3 : -0.3)) * gate * gain * (1 - i / n);
		add(sfx, i0 + i, v, noise() * 0.6);
	}
};
const windAndHum = (from: number, to: number, gain: number) => {
	const i0 = Math.floor(from * SR);
	const n = Math.floor((to - from) * SR);
	const f1 = new SVF();
	const f2 = new SVF();
	let ph = 0;
	for (let i = 0; i < n; i++) {
		const x = i / n;
		const s = i / SR;
		const gust = 0.6 + 0.4 * Math.sin(s * 1.7) * Math.sin(s * 0.63 + 1);
		const env = Math.min(1, x * 6) * (1 - Math.pow(x, 3));
		const w = f1.run(noise(), 500 + 1400 * x + 300 * gust, 0.9, 'bp') * gust;
		const hf = 92 * (1 + 0.5 * x);
		ph = (ph + hf / SR) % 1;
		const hum = f2.run(sawS(ph, hf / SR), 420, 1.2) * (0.7 + 0.3 * Math.sin(s * 2 * Math.PI * 23));
		add(sfx, i0 + i, (w * 0.9 + hum * 0.35) * env * gain, Math.sin(s * 0.8) * 0.4);
	}
};

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

// ---------- реверб (Freeverb-подобный) ----------
const reverb = (src: Stereo, out: Stereo, wet: number) => {
	const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((n) => Math.round((n * SR) / 44100));
	const aps = [556, 441, 341, 225].map((n) => Math.round((n * SR) / 44100));
	for (const [ch, spread] of [
		['L', 0],
		['R', 23],
	] as const) {
		const x = src[ch];
		const y = new Float32Array(N);
		for (const c of combs) {
			const len = c + spread;
			const buf = new Float32Array(len);
			let idx = 0;
			let store = 0;
			for (let i = 0; i < N; i++) {
				const o = buf[idx];
				store = o * 0.75 + store * 0.25;
				buf[idx] = x[i] + store * 0.86;
				idx = (idx + 1) % len;
				y[i] += o;
			}
		}
		for (const a of aps) {
			const len = a + spread;
			const buf = new Float32Array(len);
			let idx = 0;
			for (let i = 0; i < N; i++) {
				const b = buf[idx];
				const v = y[i];
				y[i] = -v + b;
				buf[idx] = v + b * 0.5;
				idx = (idx + 1) % len;
			}
		}
		for (let i = 0; i < N; i++) out[ch][i] += y[i] * wet * 0.12;
	}
};

// ---------- сведение ----------
const mix = bus();
// сайдчейн: пэды/бас/арп «качаются» от бочки
const duck = new Float32Array(N).fill(1);
for (let beat = DROP; beat < FINAL_HIT; beat += 1) {
	if (!grooveOn(beat)) continue;
	const i0 = Math.floor(t(beat) * SR);
	for (let i = 0; i < SECONDS_PER_BEAT * SR && i0 + i < N; i++) {
		const x = i / (SECONDS_PER_BEAT * SR);
		duck[i0 + i] = Math.min(duck[i0 + i], 0.35 + 0.65 * Math.min(1, Math.pow(x / 0.55, 1.5)));
	}
}

const musicFile = path.resolve('public/music.mp3');
const external = fs.existsSync(musicFile);
reverb(verbSend, mix, 1);
for (let i = 0; i < N; i++) {
	for (const ch of ['L', 'R'] as const) {
		const m = external ? 0 : music[ch][i] * duck[i] + drums[ch][i];
		mix[ch][i] = (external ? 0 : mix[ch][i]) + m + sfx[ch][i] * 0.9;
	}
}
// затухание в конце
const fadeFrom = t(LAST) - 1.6;
for (let i = Math.floor(fadeFrom * SR); i < N; i++) {
	const k = Math.max(0, 1 - (i / SR - fadeFrom) / 1.6);
	mix.L[i] *= k * k;
	mix.R[i] *= k * k;
}
// мягкий лимитер (tanh) до нормализации, чтобы пики не клиппировали
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(mix.L[i]), Math.abs(mix.R[i]));
const pre = 0.9 / peak;
for (let i = 0; i < N; i++) {
	mix.L[i] = Math.tanh(mix.L[i] * pre * 1.2) / Math.tanh(1.2);
	mix.R[i] = Math.tanh(mix.R[i] * pre * 1.2) / Math.tanh(1.2);
}

// ---------- запись WAV (float32) и нормализация громкости ----------
const writeWav = (file: string, b: Stereo) => {
	const data = Buffer.alloc(N * 8);
	for (let i = 0; i < N; i++) {
		data.writeFloatLE(b.L[i], i * 8);
		data.writeFloatLE(b.R[i], i * 8 + 4);
	}
	const h = Buffer.alloc(44);
	h.write('RIFF', 0);
	h.writeUInt32LE(36 + data.length, 4);
	h.write('WAVE', 8);
	h.write('fmt ', 12);
	h.writeUInt32LE(16, 16);
	h.writeUInt16LE(3, 20); // IEEE float
	h.writeUInt16LE(2, 22);
	h.writeUInt32LE(SR, 24);
	h.writeUInt32LE(SR * 8, 28);
	h.writeUInt16LE(8, 32);
	h.writeUInt16LE(32, 34);
	h.write('data', 36);
	h.writeUInt32LE(data.length, 40);
	fs.writeFileSync(file, Buffer.concat([h, data]));
};

fs.mkdirSync('public/audio', {recursive: true});
const raw = path.resolve('out/soundtrack_raw.wav');
fs.mkdirSync('out', {recursive: true});
writeWav(raw, mix);

let input = raw;
if (external) {
	// своя музыка: подмешиваем её под эффекты (BPM для синхронизации см. README)
	const premix = path.resolve('out/soundtrack_premix.wav');
	execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', musicFile, '-i', raw, '-filter_complex', `[0:a]atrim=0:${DUR},volume=0.8[a];[a][1:a]amix=inputs=2:normalize=0`, '-ar', String(SR), premix]);
	input = premix;
}

// двухпроходный loudnorm: −14 LUFS, true peak −1 dBTP
const LN = 'loudnorm=I=-14:TP=-1:LRA=11';
const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', input, '-af', `${LN}:print_format=json`, '-f', 'null', '-'], {encoding: 'utf8'});
const jsonText = probe.stderr.slice(probe.stderr.lastIndexOf('{'), probe.stderr.lastIndexOf('}') + 1);
const m = JSON.parse(jsonText);
const out = path.resolve('public/audio/soundtrack.wav');
execFileSync('ffmpeg', [
	'-y',
	'-v',
	'error',
	'-i',
	input,
	'-af',
	`${LN}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
	'-ar',
	String(SR),
	'-c:a',
	'pcm_s24le',
	out,
]);
console.log(`BPM ${BPM}, длительность ${DUR.toFixed(2)} c → ${out}`);
console.log(`Исходная громкость: ${m.input_i} LUFS, пик ${m.input_tp} dBTP`);

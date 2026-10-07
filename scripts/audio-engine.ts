// Общий звуковой движок обоих роликов: синтез инструментов и эффектов, реверб,
// сайдчейн, мягкий лимитер, запись WAV и нормализация до −14 LUFS через ffmpeg.
// Партитуры — scripts/make-audio.ts (ролик 1) и scripts/make-audio2.ts (ролик 2).

import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {SECONDS_PER_BEAT} from '../src/config';

export const SR = 48000;
/** Секунды от доли. */
export const t = (beat: number) => beat * SECONDS_PER_BEAT;
export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export const createEngine = (durationSec: number) => {
	const DUR = durationSec;
	const N = Math.ceil(DUR * SR);
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

	const music = bus();
	const drums = bus();
	const sfx = bus();
	const verbSend = bus();

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

	/** Своя музыка: если есть public/music.mp3, синтезированная музыка не используется, только эффекты. */
	const musicFile = path.resolve('public/music.mp3');
	const external = fs.existsSync(musicFile);

	/** Сведение и запись: duckBeats — доли с бочкой (сайдчейн), fadeFrom — начало затухания, с. */
	const finish = (opts: {out: string; duckBeats: number[]; fadeFrom: number; fadeLen?: number}) => {
		const mix = bus();
		const duck = new Float32Array(N).fill(1);
		for (const beat of opts.duckBeats) {
			const i0 = Math.floor(t(beat) * SR);
			for (let i = 0; i < SECONDS_PER_BEAT * SR && i0 + i < N; i++) {
				const x = i / (SECONDS_PER_BEAT * SR);
				duck[i0 + i] = Math.min(duck[i0 + i], 0.35 + 0.65 * Math.min(1, Math.pow(x / 0.55, 1.5)));
			}
		}
		reverb(verbSend, mix, 1);
		for (let i = 0; i < N; i++) {
			for (const ch of ['L', 'R'] as const) {
				const m = external ? 0 : music[ch][i] * duck[i] + drums[ch][i];
				mix[ch][i] = (external ? 0 : mix[ch][i]) + m + sfx[ch][i] * 0.9;
			}
		}
		const fadeLen = opts.fadeLen ?? 1.6;
		for (let i = Math.floor(opts.fadeFrom * SR); i < N; i++) {
			const k = Math.max(0, 1 - (i / SR - opts.fadeFrom) / fadeLen);
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

		// WAV float32
		const data = Buffer.alloc(N * 8);
		for (let i = 0; i < N; i++) {
			data.writeFloatLE(mix.L[i], i * 8);
			data.writeFloatLE(mix.R[i], i * 8 + 4);
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
		fs.mkdirSync('out', {recursive: true});
		fs.mkdirSync(path.dirname(path.resolve(opts.out)), {recursive: true});
		const raw = path.resolve(`out/${path.basename(opts.out, '.wav')}_raw.wav`);
		fs.writeFileSync(raw, Buffer.concat([h, data]));

		let input = raw;
		if (external) {
			const premix = path.resolve(`out/${path.basename(opts.out, '.wav')}_premix.wav`);
			execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', musicFile, '-i', raw, '-filter_complex', `[0:a]atrim=0:${DUR},volume=0.8[a];[a][1:a]amix=inputs=2:normalize=0`, '-ar', String(SR), premix]);
			input = premix;
		}

		// двухпроходный loudnorm: −14 LUFS, true peak −1 dBTP
		const LN = 'loudnorm=I=-14:TP=-1:LRA=11';
		const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', input, '-af', `${LN}:print_format=json`, '-f', 'null', '-'], {encoding: 'utf8'});
		const m = JSON.parse(probe.stderr.slice(probe.stderr.lastIndexOf('{'), probe.stderr.lastIndexOf('}') + 1));
		const out = path.resolve(opts.out);
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
		console.log(`Длительность ${DUR.toFixed(2)} c → ${out}`);
		console.log(`Исходная громкость: ${m.input_i} LUFS, пик ${m.input_tp} dBTP`);
	};

	return {
		N, rnd, noise, SVF, adsr, sawS, sqS, add,
		music, drums, sfx, verbSend,
		pad, bassNote, pluck, lead, stab,
		kick, clap, hat, crash, reverseCymbal, subDrop, snareRoll, riser,
		whoosh, click, pop, ding, neonBuzz, glitchCrackle, windAndHum,
		finish,
	};
};

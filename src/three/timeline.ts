// Состояние медиафасада и камеры как чистые функции от кадра.
import * as THREE from 'three';
import {Easing, interpolate} from 'remotion';
import {FPS, LETTER_BEATS, TOWER_EVENTS, beatToFrame, frameToBeat} from '../config';
import {TEXTS} from '../brand';
import {MarqueeLayout, MarqueeState} from './marquee';
import {hash} from './random';
import {TOWER, WorldFrame} from './world';

const N = TEXTS.name.length;

/** Мерцание неона: мелкая дрожь + редкие короткие провалы. */
const flicker = (frame: number, i: number) => {
	const n = 0.94 + 0.06 * hash(Math.floor(frame / 2), i * 3.3);
	const dip = hash(Math.floor(frame / 3), i * 7.7 + 1) > 0.975 ? 0.55 : 1;
	return n * dip;
};

/** Уровень буквы после зажигания: вспышка, «запинка» неона, спад к норме. */
const ignite = (age: number) => {
	if (age < 0) return 0;
	if (age < 1) return 2.0;
	if (age < 2) return 0.35;
	if (age < 3) return 2.2;
	return 1 + 1.2 * Math.exp(-(age - 3) / 4);
};

export type FacadeProgram = {
	/** Кадр зажигания каждой буквы (null — буква горит с начала). */
	letterFrames: number[] | null;
	waveStart: number | null; // кадр начала световой волны
	waveDuration: number;
	glitchFrame: number | null; // кадр начала глитча (3–4 кадра)
	sloganFrame: number; // кадр включения стрелки и слогана
	scrollSpeed: number; // доля окружности в секунду
	scrollOffset: number;
};

/** Программа для пролёта из сценария: буквы по шестнадцатым, полное название на дропе. */
export const filmProgram = (): FacadeProgram => ({
	letterFrames: LETTER_BEATS.map(beatToFrame),
	waveStart: beatToFrame(TOWER_EVENTS.drop),
	waveDuration: beatToFrame(1.5),
	glitchFrame: beatToFrame(TOWER_EVENTS.glitch),
	sloganFrame: beatToFrame(TOWER_EVENTS.drop),
	scrollSpeed: 0.0,
	scrollOffset: 0,
});

export const facadeState = (
	frame: number,
	L: MarqueeLayout,
	prog: FacadeProgram,
	scroll: number,
): Omit<WorldFrame, 'facadeGain' | 'facadeFlash'> => {
	const letterLevel = Array.from({length: N}, (_, i) => {
		const f = prog.letterFrames ? ignite(frame - prog.letterFrames[i]) : 1;
		return f * flicker(frame, i);
	});
	// след летит от текущей буквы к следующей
	let trailX: number | null = null;
	if (prog.letterFrames) {
		const lf = prog.letterFrames;
		for (let i = 0; i < N; i++) {
			const a = lf[i] - 3;
			const b = lf[i];
			if (frame >= a && frame < b) {
				const from = i === 0 ? L.letters[0].x - L.fs : L.letters[i - 1].x + L.letters[i - 1].w;
				const to = L.letters[i].x + L.letters[i].w * 0.5;
				trailX = interpolate(frame, [a, b], [from, to], {easing: Easing.out(Easing.cubic)});
			}
		}
	}
	let waveX: number | null = null;
	if (prog.waveStart !== null && frame >= prog.waveStart && frame < prog.waveStart + prog.waveDuration) {
		waveX = interpolate(frame, [prog.waveStart, prog.waveStart + prog.waveDuration], [L.nameX0 - L.fs * 2, L.P + L.fs], {
			easing: Easing.inOut(Easing.cubic),
		});
	}
	const sl = ignite(frame - prog.sloganFrame);
	const glitchOn = prog.glitchFrame !== null && frame >= prog.glitchFrame && frame < prog.glitchFrame + 4;
	return {
		time: frame / FPS,
		marquee: {
			letterLevel,
			trailX,
			waveX,
			waveWidth: L.fs * 1.4,
			sloganLevel: Math.min(sl, 1.6) * flicker(frame, 40),
			arrowLevel: Math.min(sl, 1.6) * flicker(frame, 41),
		},
		scroll,
		glitch: glitchOn ? [1, 0.6, 1, 0.35][frame - prog.glitchFrame!] : 0,
		glitchSeed: glitchOn ? frame * 1.37 : 0,
	};
};

/** Сдвиг текстуры, при котором центр названия смотрит на камеру под углом `azimuth` (рад). */
export const scrollToFace = (L: MarqueeLayout, azimuth: number) => {
	// u=0 смотрит на +Z, u растёт к +X (как у CylinderGeometry)
	const u = azimuth / (Math.PI * 2);
	return L.nameCenter / L.W - u;
};

export type CameraPose = {pos: THREE.Vector3; target: THREE.Vector3; fov: number; roll?: number};

/** Неподвижные (с лёгким дрейфом) кадры для проверки сцены. */
export const previewShot = (shot: 'wide' | 'mid' | 'close', frame: number): CameraPose => {
	const t = frame / FPS;
	const yb = TOWER.bandCenter;
	if (shot === 'wide') {
		const a = 0.32 + t * 0.01;
		return {
			pos: new THREE.Vector3(Math.sin(a) * 760, 250, Math.cos(a) * 760),
			target: new THREE.Vector3(0, 165, 0),
			fov: 38,
		};
	}
	if (shot === 'mid') {
		const a = 0.42 + t * 0.02;
		return {
			pos: new THREE.Vector3(Math.sin(a) * 175, yb + 40, Math.cos(a) * 175),
			target: new THREE.Vector3(0, yb + 25, 0),
			fov: 50,
		};
	}
	return {
		pos: new THREE.Vector3(Math.sin(0.05) * 110, yb - 8, Math.cos(0.05) * 110),
		target: new THREE.Vector3(0, yb + 1, 0),
		fov: 40,
	};
};

export const beatsNow = (frame: number) => frameToBeat(frame);

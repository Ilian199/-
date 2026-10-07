// 3D-части ролика: пролёт дрона (сцены 1–2) и финальный отлёт от медиафасада (сцена 7).
// Камера — кусочные кривые со speed ramp: разгон, замедление в кульминации, снова разгон.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Easing, interpolate} from 'remotion';
import {FINALE_BEATS, SCENES, TOWER_EVENTS, beatToFrame} from '../config';
import {TowerDirector, TowerScene} from '../three/TowerScene';
import {CameraPose, facadeState, filmProgram, scrollToFace} from '../three/timeline';
import {TOWER} from '../three/world';

const F = beatToFrame;
const yb = TOWER.bandCenter;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const seg = (f: number, a: number, b: number, easing: (t: number) => number) => easing(clamp01((f - a) / (b - a)));
const polar = (az: number, r: number, y: number) => new THREE.Vector3(Math.sin(az) * r, y, Math.cos(az) * r);

// ---------- сцены 1–2 ----------
const A0 = -0.32; // азимут камеры на дропе: название смотрит прямо в камеру
const ORBIT = 1.75; // дуга облёта, рад
const fRise = F(TOWER_EVENTS.riseStart);
const fRiseEnd = F(5.5);
const fDrop = F(TOWER_EVENTS.drop);
const fDive = F(TOWER_EVENTS.diveStart);
const fFlash = F(TOWER_EVENTS.flash);

const introAzimuth = (f: number) => A0 + ORBIT * seg(f, fDrop, fDive, Easing.bezier(0.45, 0, 0.25, 1));

const introCamera = (f: number): CameraPose => {
	if (f < fRise) {
		// пролёт над огнями города, разгон
		const t = seg(f, 0, fRise, Easing.bezier(0.5, 0, 0.9, 0.6));
		const pos = new THREE.Vector3(lerp(-330, -62, t), lerp(150, 42, t), lerp(1350, 175, t));
		const look = new THREE.Vector3(lerp(-200, -10, t), lerp(70, 95, t), lerp(900, 0, t));
		return {pos, target: look, fov: 52, roll: lerp(0.07, 0.0, t)};
	}
	if (f < fRiseEnd) {
		// резкий подъём вдоль неонового фасада
		const t = seg(f, fRise, fRiseEnd, Easing.bezier(0.6, 0, 0.2, 1));
		const az = lerp(Math.atan2(-62, 175), A0, t);
		const r = lerp(190, 122, t);
		const y = lerp(42, yb - 6, t);
		const pos = polar(az, r, y);
		const target = new THREE.Vector3(0, lerp(150, yb + 2, Math.pow(t, 0.7)), 0);
		return {pos, target, fov: lerp(52, 42, t), roll: Math.sin(t * Math.PI) * -0.04};
	}
	if (f < fDrop) {
		// кульминация: почти зависание напротив названия
		const t = seg(f, fRiseEnd, fDrop, Easing.out(Easing.quad));
		return {pos: polar(A0, lerp(122, 116, t), yb - 6 + t), target: new THREE.Vector3(0, yb + 1.5, 0), fov: 42};
	}
	if (f < fDive) {
		// быстрый облёт по дуге
		const az = introAzimuth(f);
		const t = seg(f, fDrop, fDive, (x) => x);
		return {
			pos: polar(az, lerp(116, 96, t), yb - 5 + Math.sin(t * Math.PI) * 10),
			target: new THREE.Vector3(0, yb + 1, 0),
			fov: 42,
			roll: Math.sin(t * Math.PI) * 0.06,
		};
	}
	// влёт в медиафасад
	const t = seg(f, fDive, fFlash, Easing.bezier(0.7, 0, 0.95, 0.4));
	const az = introAzimuth(f);
	return {
		pos: polar(az, lerp(96, TOWER.rx + 1.3, t), lerp(yb - 3, yb, t)),
		target: new THREE.Vector3(0, yb, 0),
		fov: lerp(42, 30, t),
	};
};

export const introDirector = (): TowerDirector => {
	const prog = filmProgram();
	return {
		camera: introCamera,
		facade: (f, L) => {
			const az = f < fDrop ? A0 : introAzimuth(f);
			// надпись едет навстречу камере: против направления облёта
			const scroll = scrollToFace(L, A0 - (az - A0) * 0.55);
			const s = facadeState(f, L, prog, scroll);
			const flash = interpolate(f, [fFlash - 5, fFlash], [0, 3.5], {
				extrapolateLeft: 'clamp',
				extrapolateRight: 'clamp',
				easing: Easing.in(Easing.cubic),
			});
			return {...s, facadeGain: 1, facadeFlash: flash};
		},
	};
};

export const introShake = (f: number) => {
	// короткий толчок камеры (в метрах) только на дропе и глитче
	let amount = 0;
	for (const h of [fDrop, F(TOWER_EVENTS.glitch)]) {
		const t = f - h;
		if (t >= 0 && t < 16) amount += 0.8 * Math.exp(-t / 4);
	}
	return amount;
};

// ---------- сцена 7 ----------
const AF = 0.12;
const FIN = SCENES.finale.from;
const fl = (beat: number) => F(FIN + beat) - F(FIN);

const finaleCamera = (f: number): CameraPose => {
	// обратный вылет от светодиодов: резкий старт, мягкое торможение, затем медленный дрейф
	const t = seg(f, 0, fl(3.2), Easing.bezier(0.12, 0.85, 0.3, 1));
	const drift = seg(f, fl(3.2), fl(9), (x) => x);
	// название горит во всю ширину кадра в верхней части, ниже — логотип и ссылка
	const r = lerp(TOWER.rx + 1.6, 96, t) + drift * 9;
	const az = AF + lerp(0.25, 0, t) - drift * 0.05;
	const y = lerp(yb, yb - 4, t) + drift * 1.5;
	const target = new THREE.Vector3(0, lerp(yb, yb - 19, t) - drift * 1.5, 0);
	return {pos: polar(az, r, y), target, fov: lerp(30, 44, t)};
};

export const finaleDirector = (): TowerDirector => ({
	camera: finaleCamera,
	facade: (f, L) => {
		const s = facadeState(
			f,
			L,
			{
				letterFrames: null,
				waveStart: fl(FINALE_BEATS.wave),
				waveDuration: fl(1.5),
				glitchFrame: null,
				sloganFrame: -100,
				scrollSpeed: 0,
				scrollOffset: 0,
			},
			scrollToFace(L, AF) + f * 0.00012,
		);
		const flash = interpolate(f, [0, 7], [2.5, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
		return {...s, facadeGain: 1, facadeFlash: flash};
	},
});

export const TowerIntro: React.FC = () => {
	const director = useMemo(introDirector, []);
	return <TowerScene director={director} shakeAt={introShake} />;
};

export const TowerFinale: React.FC = () => {
	const director = useMemo(finaleDirector, []);
	return <TowerScene director={director} />;
};

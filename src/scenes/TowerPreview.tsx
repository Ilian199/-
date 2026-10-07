import React, {useMemo} from 'react';
import {TowerDirector, TowerScene} from '../three/TowerScene';
import * as THREE from 'three';
import {Easing, interpolate} from 'remotion';
import {facadeState, previewShot, scrollToFace} from '../three/timeline';
import {TOWER} from '../three/world';

// Черновой облёт для просмотра движения: подъём от города к медиафасаду и дуга.
const demoAzimuth = (f: number) => interpolate(f, [0, 150], [0.9, -0.15], {easing: Easing.inOut(Easing.cubic)});
const demoCamera = (f: number) => {
	const a = demoAzimuth(f);
	const r = interpolate(f, [0, 150], [260, 112], {easing: Easing.out(Easing.cubic)});
	const y = interpolate(f, [0, 60, 150], [90, 190, TOWER.bandCenter - 8], {easing: Easing.out(Easing.quad)});
	return {
		pos: new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r),
		target: new THREE.Vector3(0, interpolate(f, [0, 150], [170, TOWER.bandCenter + 1]), 0),
		fov: 40,
	};
};

export type PreviewShot = 'wide' | 'mid' | 'close' | 'demo';

/** Этап 1: проверочные кадры 3D-сцены. Надпись горит целиком, по ней идёт волна. */
export const TowerPreview: React.FC<{shot: PreviewShot; noFx?: boolean}> = ({shot, noFx}) => {
	const director = useMemo<TowerDirector>(
		() => ({
			camera: (f) => (shot === 'demo' ? demoCamera(f) : previewShot(shot, f)),
			facade: (f, L) => {
				if (shot === 'demo') {
					const s = facadeState(
						f,
						L,
						{
							letterFrames: Array.from({length: 13}, (_, i) => 12 + i * 3),
							waveStart: 70,
							waveDuration: 40,
							glitchFrame: 118,
							sloganFrame: 50,
							scrollSpeed: 0,
							scrollOffset: 0,
						},
						scrollToFace(L, demoAzimuth(f)) + Math.max(0, f - 125) * 0.0012,
					);
					return {...s, facadeGain: 1, facadeFlash: 0};
				}
				const azimuth = shot === 'wide' ? 0.32 : shot === 'mid' ? 0.42 : 0.05;
				const s = facadeState(
					f,
					L,
					{
						letterFrames: null,
						waveStart: 0,
						waveDuration: 60,
						glitchFrame: null,
						sloganFrame: -100,
						scrollSpeed: 0,
						scrollOffset: 0,
					},
					scrollToFace(L, azimuth) + f * 0.0006,
				);
				return {...s, facadeGain: 1, facadeFlash: 0};
			},
		}),
		[shot],
	);
	return <TowerScene director={director} noFx={noFx} />;
};

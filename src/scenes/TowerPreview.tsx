import React, {useMemo} from 'react';
import {TowerDirector, TowerScene} from '../three/TowerScene';
import {facadeState, previewShot, scrollToFace} from '../three/timeline';

export type PreviewShot = 'wide' | 'mid' | 'close';

/** Этап 1: проверочные кадры 3D-сцены. Надпись горит целиком, по ней идёт волна. */
export const TowerPreview: React.FC<{shot: PreviewShot; noFx?: boolean}> = ({shot, noFx}) => {
	const director = useMemo<TowerDirector>(
		() => ({
			camera: (f) => previewShot(shot, f),
			facade: (f, L) => {
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

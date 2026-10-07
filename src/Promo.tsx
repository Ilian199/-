// Монтаж всего ролика. Все границы сцен — из SCENES в config.ts (в долях).
import {CameraMotionBlur} from '@remotion/motion-blur';
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {COLORS} from './brand';
import {SCENES, beatToFrame} from './config';
import {ease, tween} from './anim';
import {FontGate} from './components/common';
import {AppScene} from './scenes/App';
import {FinaleOverlay} from './scenes/FinaleOverlay';
import {Problem} from './scenes/Problem';
import {Slogan} from './scenes/Slogan';
import {Steps} from './scenes/Steps';
import {TowerFinale, TowerIntro} from './scenes/TowerFilm';

const F = beatToFrame;
const span = (s: {from: number; to: number}) => ({from: F(s.from), durationInFrames: F(s.to) - F(s.from)});

/** Вспышка после влёта камеры в медиафасад: белый → бирюзовый → прозрачный. */
export const DiveFlash: React.FC = () => {
	const f = useCurrentFrame();
	return (
		<AbsoluteFill
			style={{
				background: f < 3 ? '#F2FFFE' : COLORS.neon,
				opacity: tween(f, [0, 9], [1, 0], ease.outCubic),
			}}
		/>
	);
};

/** Бирюзовая шторка между сценами 3 и 4: закрывает снизу вверх, открывает вверх. */
const TealCurtain: React.FC<{half: number}> = ({half}) => {
	const f = useCurrentFrame();
	const cover = tween(f, [0, half], [100, 0], ease.inExpo);
	const reveal = tween(f, [half, half * 2], [0, -100], ease.outExpo);
	const y = f < half ? cover : reveal;
	return (
		<AbsoluteFill style={{transform: `translateY(${y}%)`}}>
			<div style={{position: 'absolute', inset: 0, background: COLORS.teal}} />
			<div style={{position: 'absolute', left: 0, right: 0, top: -14, height: 14, background: COLORS.neon, boxShadow: `0 0 40px ${COLORS.neon}`}} />
			<div style={{position: 'absolute', left: 0, right: 0, bottom: -14, height: 14, background: COLORS.neon, boxShadow: `0 0 40px ${COLORS.neon}`}} />
		</AbsoluteFill>
	);
};

/** Неоновые штрихи whip pan между сценами 5 и 6. */
const WhipStreaks: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const t = f / dur;
	const lines = [260, 520, 700, 980, 1210, 1440, 1660];
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{lines.map((y, i) => {
				const x = 1200 - (t * 2600 + i * 90);
				return (
					<div
						key={y}
						style={{
							position: 'absolute',
							top: y,
							left: x,
							width: 900 + i * 60,
							height: 6 + (i % 3) * 4,
							borderRadius: 6,
							background: `linear-gradient(90deg, transparent, ${i % 2 ? COLORS.neon : '#ffffff'}, transparent)`,
							opacity: Math.sin(Math.min(1, t) * Math.PI) * 0.9,
							filter: 'blur(1.5px)',
						}}
					/>
				);
			})}
		</AbsoluteFill>
	);
};

const Blur: React.FC<{children: React.ReactNode}> = ({children}) => (
	<CameraMotionBlur shutterAngle={200} samples={5}>
		{children}
	</CameraMotionBlur>
);

export const Promo: React.FC<{withAudio?: boolean}> = ({withAudio = true}) => (
	<AbsoluteFill style={{background: '#000'}}>
		<FontGate>
			<Sequence {...span({from: SCENES.towerIntro.from, to: SCENES.towerOrbit.to})} name="1–2 · башня, пролёт и облёт">
				<TowerIntro />
			</Sequence>
			<Sequence {...span(SCENES.problem)} name="3 · проблема">
				<Blur>
					<Problem />
				</Blur>
			</Sequence>
			<Sequence from={F(SCENES.problem.from)} durationInFrames={10} name="вспышка влёта">
				<DiveFlash />
			</Sequence>
			<Sequence {...span(SCENES.slogan)} name="4 · рутину в автомат">
				<Blur>
					<Slogan />
				</Blur>
			</Sequence>
			<Sequence from={F(SCENES.slogan.from - 0.5)} durationInFrames={F(SCENES.slogan.from + 0.5) - F(SCENES.slogan.from - 0.5)} name="бирюзовая шторка">
				<TealCurtain half={F(SCENES.slogan.from) - F(SCENES.slogan.from - 0.5)} />
			</Sequence>
			<Sequence {...span(SCENES.app)} name="5 · Готовые решения">
				<Blur>
					<AppScene />
				</Blur>
			</Sequence>
			<Sequence {...span(SCENES.steps)} name="6 · три шага">
				<Blur>
					<Steps />
				</Blur>
			</Sequence>
			<Sequence from={F(SCENES.steps.from - 0.4)} durationInFrames={F(SCENES.steps.from + 0.4) - F(SCENES.steps.from - 0.4)} name="whip pan">
				<WhipStreaks dur={F(SCENES.steps.from + 0.4) - F(SCENES.steps.from - 0.4)} />
			</Sequence>
			<Sequence {...span(SCENES.finale)} name="7 · финал">
				<TowerFinale />
				<FinaleOverlay />
			</Sequence>
		</FontGate>
		{withAudio ? <Audio src={staticFile('audio/soundtrack.wav')} /> : null}
	</AbsoluteFill>
);

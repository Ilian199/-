// Ролик 2 «Телефон организатора»: монтаж. Тайминги — src/v2/config.ts, тексты — src/texts.ts (v2*).
import {CameraMotionBlur} from '@remotion/motion-blur';
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {COLORS} from '../brand';
import {beatToFrame} from '../config';
import {ease, tween} from '../anim';
import {FontGate} from '../components/common';
import {DiveFlash} from '../Promo';
import {Slogan} from '../scenes/Slogan';
import {TowerStinger} from '../scenes/TowerFilm';
import {Chaos} from './Chaos';
import {SCENES2, SLOGAN2_BEATS} from './config';
import {Cta} from './Cta';
import {Demos} from './Demos';

const F = beatToFrame;
const span = (from: number, to: number) => ({from: F(from), durationInFrames: F(to) - F(from)});

/** Бирюзовая заливка после zoom-through сквозь плашку «автомат» гаснет на фоне башни. */
const TealOut: React.FC = () => {
	const f = useCurrentFrame();
	return <AbsoluteFill style={{background: COLORS.teal, opacity: tween(f, [0, 8], [1, 0], ease.outCubic)}} />;
};

const Blur: React.FC<{children: React.ReactNode}> = ({children}) => (
	<CameraMotionBlur shutterAngle={200} samples={5}>
		{children}
	</CameraMotionBlur>
);

export const Promo2: React.FC<{withAudio?: boolean}> = ({withAudio = true}) => {
	const S = SCENES2;
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<FontGate>
				<Sequence {...span(S.chaos.from, S.chaos.to)} name="1 · телефон организатора">
					{/* без размытия движения: стопка всё время в движении, текст должен читаться */}
					<Chaos />
				</Sequence>
				<Sequence {...span(S.slogan.from, S.slogan.to)} name="2 · рутину в автомат">
					<Blur>
						<Slogan from={S.slogan.from} len={S.slogan.to - S.slogan.from} plateAt={SLOGAN2_BEATS.plate} />
					</Blur>
				</Sequence>
				<Sequence {...span(S.tower.from, S.tower.to)} name="3 · башня">
					<TowerStinger lenFrames={F(S.tower.to) - F(S.tower.from)} />
					<TealOut />
				</Sequence>
				<Sequence {...span(S.booking.from, S.cta.from)} name="4–7 · решения и спокойствие">
					<Blur>
						<Demos />
					</Blur>
				</Sequence>
				<Sequence from={F(S.booking.from)} durationInFrames={10} name="вспышка влёта">
					<DiveFlash />
				</Sequence>
				<Sequence {...span(S.cta.from, S.cta.to)} name="8 · напишите одно слово">
					<Cta />
				</Sequence>
			</FontGate>
			{withAudio ? <Audio src={staticFile('audio/soundtrack2.wav')} /> : null}
		</AbsoluteFill>
	);
};

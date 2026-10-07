// Сцена 6: три шага влетают по одному на долю. Выход — всё стягивается в точку,
// вспышка, и мы снова у ночной башни.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS} from '../brand';
import {SCENES} from '../config';
import {ease, lbf, snap, tween} from '../anim';
import {Bg, CenterLine, neonShadow} from '../components/common';
import {SafeText, measureAtMaxScale} from '../components/SafeText';
import {T, TextSpec} from '../texts';

const S = SCENES.steps.from;
const b = (x: number) => lbf(S, x);

const Step: React.FC<{spec: TextSpec; y: number; at: number; plate?: boolean; glow: number}> = ({spec, y, at, plate, glow}) => {
	const f = useCurrentFrame();
	if (f < at) return null;
	const p = snap(f, at, {stiffness: 560, damping: 22});
	// влёт с 1.14 (а не с maxScale 1.2): остаётся запас под тряску
	const scale = 1.14 - 0.14 * p;
	const w = measureAtMaxScale(spec).width / spec.maxScale;
	return (
		<CenterLine y={y}>
			<div style={{position: 'relative', transform: `translateY(${(1 - p) * 50}px) scale(${scale})`, opacity: tween(f, [at, at + 3], [0, 1])}}>
				{plate ? (
					<div
						style={{
							position: 'absolute',
							left: -26,
							top: '-8%',
							width: w + 52,
							height: '116%',
							background: COLORS.teal,
							transform: `scaleX(${Math.min(1.04, snap(f, at, {stiffness: 800, damping: 18}))})`,
							transformOrigin: 'center',
							boxShadow: `0 0 ${30 * glow}px ${COLORS.teal}`,
						}}
					/>
				) : null}
				<SafeText spec={spec} style={{position: 'relative', textShadow: plate ? 'none' : neonShadow(COLORS.teal, 0.35 * glow)}} />
			</div>
		</CenterLine>
	);
};

const Arrow: React.FC<{y: number; at: number}> = ({y, at}) => {
	const f = useCurrentFrame();
	const t = tween(f, [at, at + 7], [0, 1], ease.outExpo);
	if (t <= 0) return null;
	return (
		<svg width={60} height={90} viewBox="0 0 60 90" style={{position: 'absolute', left: 510, top: y - 45, overflow: 'visible'}}>
			<path
				d="M30 6 V78 M12 60 L30 80 L48 60"
				stroke={COLORS.neon}
				strokeWidth={7}
				fill="none"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeDasharray={140}
				strokeDashoffset={140 * (1 - t)}
				style={{filter: `drop-shadow(0 0 10px ${COLORS.neon})`}}
			/>
		</svg>
	);
};

export const Steps: React.FC = () => {
	const f = useCurrentFrame();
	const glow = 0.7 + 0.3 * Math.exp(-Math.max(0, f - b(3)) / 5) * (f >= b(3) ? 1 : 0);
	// выход: всё стягивается в центр
	const out = tween(f, [b(3.4), b(4)], [0, 1], ease.inExpo);
	return (
		<Bg>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					transform: `scale(${1 - out * 0.98})`,
					transformOrigin: '540px 880px',
					opacity: 1 - tween(out, [0.7, 1], [0, 1], (t) => t),
				}}
			>
				<Step spec={T.step1} y={620} at={b(0)} glow={glow} />
				<Arrow y={750} at={b(0.5)} />
				<Step spec={T.step2} y={880} at={b(1)} glow={glow} />
				<Arrow y={1010} at={b(1.5)} />
				<Step spec={T.step3} y={1140} at={b(2)} plate glow={glow} />
			</div>
			<div
				style={{
					position: 'absolute',
					left: 540 - 30,
					top: 880 - 30,
					width: 60,
					height: 60,
					borderRadius: 30,
					background: '#E9FFFD',
					boxShadow: `0 0 80px 40px ${COLORS.neon}`,
					opacity: tween(f, [b(3.7), b(4)], [0, 1]),
					transform: `scale(${1 + tween(f, [b(3.8), b(4)], [0, 6], ease.inExpo)})`,
				}}
			/>
		</Bg>
	);
};

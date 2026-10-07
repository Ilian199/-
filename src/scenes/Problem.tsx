// Сцена 3: проблема. Фразы влетают на каждую долю с разных сторон с тряской,
// на четвёртой доле всё зачёркивается неоновой линией, затем крупно «знакомо?».
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS} from '../brand';
import {PROBLEM_BEATS as P, SAFE, SCENES} from '../config';
import {ease, lbf, shakeAt, snap, tween} from '../anim';
import {Bg, CenterLine, neonShadow} from '../components/common';
import {SafeText, measureAtMaxScale} from '../components/SafeText';
import {T, TextSpec} from '../texts';

const S = SCENES.problem.from;
const b = (x: number) => lbf(S, x);

type Dir = 'left' | 'right' | 'bottom';

const Phrase: React.FC<{spec: TextSpec; y: number; at: number; dir: Dir; strikeAt: number; outAt: number}> = ({
	spec,
	y,
	at,
	dir,
	strikeAt,
	outAt,
}) => {
	const f = useCurrentFrame();
	const p = snap(f, at, {stiffness: 520, damping: 26});
	const {width} = measureAtMaxScale(spec);
	const base = width / spec.maxScale;
	const scale = 1 + (spec.maxScale - 1) * (1 - p);
	// сдвиг ограничен так, чтобы строка на текущем масштабе не выходила за 96…984
	const room = Math.max(0, (SAFE.maxWidth - base * scale) / 2 - 20); // 20 px — запас на тряску
	const travel = (1 - p) * room;
	const tx = dir === 'left' ? -travel : dir === 'right' ? travel : 0;
	const ty = dir === 'bottom' ? (1 - p) * 140 : 0;
	const opacity = tween(f, [at, at + 4], [0, 1]) * tween(f, [outAt, outAt + 5], [1, 0], ease.inCubic);
	const dim = tween(f, [strikeAt + 2, strikeAt + 8], [1, 0.42]);
	const strike = tween(f, [strikeAt, strikeAt + 7], [0, 1], ease.outExpo);
	// неоновый «след» влёта
	const trail = tween(f, [at, at + 7], [1, 0], ease.outCubic);
	return (
		<CenterLine y={y}>
			<div style={{position: 'relative', transform: `translate(${tx}px, ${ty}px) scale(${scale})`, opacity}}>
				{trail > 0.01 && dir !== 'bottom' ? (
					<div
						style={{
							position: 'absolute',
							top: '45%',
							height: 14,
							width: base * 0.9 * trail,
							[dir === 'left' ? 'right' : 'left']: '100%',
							background: `linear-gradient(${dir === 'left' ? '90deg' : '270deg'}, transparent, ${COLORS.neon})`,
							opacity: trail,
							borderRadius: 7,
							filter: 'blur(2px)',
						}}
					/>
				) : null}
				<SafeText spec={spec} style={{opacity: dim}} />
				<div
					style={{
						position: 'absolute',
						left: -14,
						top: '54%',
						height: 12,
						width: `calc(${strike * 100}% + ${strike * 28}px)`,
						background: '#E9FFFD',
						borderRadius: 6,
						boxShadow: neonShadow(COLORS.neon, 1.1),
					}}
				/>
			</div>
		</CenterLine>
	);
};

export const Problem: React.FC = () => {
	const f = useCurrentFrame();
	const hits = [b(0), b(1), b(2), b(3), b(4)];
	const sh = shakeAt(f, hits, 16, 7);
	const famIn = snap(f, b(P.familiar), {stiffness: 380, damping: 18});
	const famScale = 1.2 - 0.2 * famIn + tween(f, [b(4.5), b(6)], [0, 0.06], ease.inOutCubic);
	const famGlow = 0.6 + 0.4 * Math.exp(-Math.max(0, f - b(5)) / 6);
	return (
		<Bg>
			<div style={{position: 'absolute', inset: 0, transform: sh.transform}}>
				<Phrase spec={T.problem1} y={600} at={b(P.phrases[0])} dir="left" strikeAt={b(P.strike)} outAt={b(P.familiar) - 2} />
				<Phrase spec={T.problem2} y={860} at={b(P.phrases[1])} dir="right" strikeAt={b(P.strike) + 2} outAt={b(P.familiar) - 2} />
				<Phrase spec={T.problem3} y={1120} at={b(P.phrases[2])} dir="bottom" strikeAt={b(P.strike) + 4} outAt={b(P.familiar) - 2} />
				{f >= b(4) ? (
					<CenterLine y={870}>
						<div style={{transform: `scale(${famScale})`, opacity: tween(f, [b(4), b(4) + 3], [0, 1])}}>
							<SafeText spec={T.familiar} style={{textShadow: neonShadow(COLORS.teal, famGlow * 0.6)}} />
						</div>
					</CenterLine>
				) : null}
			</div>
		</Bg>
	);
};

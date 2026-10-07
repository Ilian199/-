// Сцена 4: «рутину в» + бирюзовая плашка резко разъезжается, на ней «автомат».
// Выход — zoom-through: камера «пролетает» сквозь плашку (текст гаснет раньше,
// чем вырастет больше допустимого масштаба).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS} from '../brand';
import {SAFE, SCENES, SLOGAN_BEATS} from '../config';
import {ease, lbf, shakeAt, snap, tween} from '../anim';
import {Bg} from '../components/common';
import {SafeText, measureAtMaxScale, safeFontSize} from '../components/SafeText';
import {T} from '../texts';

/** from — доля начала сцены, len — её длина в долях (используется и во втором ролике). */
export const Slogan: React.FC<{from?: number; len?: number; plateAt?: number}> = ({
	from = SCENES.slogan.from,
	len = SCENES.slogan.to - SCENES.slogan.from,
	plateAt = SLOGAN_BEATS.plate,
}) => {
	const f = useCurrentFrame();
	const b = (x: number) => lbf(from, x);
	// оба слова одного кегля, как в фирменном макете
	const fs = Math.min(safeFontSize(T.sloganA), safeFontSize(T.sloganB));
	const wA = (measureAtMaxScale(T.sloganA).width / T.sloganA.maxScale) * (fs / safeFontSize(T.sloganA));
	const wB = (measureAtMaxScale(T.sloganB).width / T.sloganB.maxScale) * (fs / safeFontSize(T.sloganB));
	// блок выровнен по левому краю внутри себя, но сам стоит по центру зоны:
	// так масштаб от центра кадра не выталкивает строки за 96…984
	const left = SAFE.left + (SAFE.maxWidth - Math.max(wA, wB)) / 2;
	const padX = 30;
	const top1 = 640;
	const top2 = top1 + fs * 0.97;

	const inA = snap(f, 0, {stiffness: 480, damping: 24});
	const plate = snap(f, b(plateAt), {stiffness: 700, damping: 17, mass: 0.6});
	const textB = snap(f, b(plateAt) + 2, {stiffness: 520, damping: 22});
	// единственный удар сцены — на «автомат»
	const sh = shakeAt(f, [b(plateAt)], 9, 5);
	const push = tween(f, [0, b(len - 0.6)], [1, 1.07], ease.inOutCubic);

	// zoom-through к центру плашки
	const zt = tween(f, [b(len - 0.65), b(len)], [0, 1], ease.inExpo);
	const zoom = 1 + zt * 22;
	const textFade = tween(zoom * push, [1.08, 1.12], [1, 0], (t) => t);
	const ox = SAFE.left + SAFE.maxWidth / 2;
	const oy = top2 + fs * 0.5;

	// вспышка только на ударе: до плашки её нет (tween зажимает слева в начальное значение)
	const hitFlash = f < b(plateAt) ? 0 : tween(f, [b(plateAt), b(plateAt) + 6], [0.35, 0], ease.outCubic);

	return (
		<Bg>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					transform: `${sh.transform} scale(${push * zoom})`,
					transformOrigin: `${ox}px ${oy}px`,
				}}
			>
				{/* плашка */}
				<div
					style={{
						position: 'absolute',
						left: left - padX,
						top: top2 - fs * 0.06,
						width: wB + padX * 2,
						height: fs * 1.12,
						background: COLORS.teal,
						transform: `scaleX(${Math.max(0, plate)})`,
						transformOrigin: 'left center',
						boxShadow: `0 0 ${40 * plate}px ${COLORS.teal}66`,
					}}
				/>
				<div
					style={{
						position: 'absolute',
						left,
						top: top1,
						opacity: tween(f, [0, 3], [0, 1]) * textFade,
						transform: `translateY(${(1 - inA) * 120}px)`,
					}}
				>
					<SafeText spec={T.sloganA} fontSize={fs} />
				</div>
				<div
					style={{
						position: 'absolute',
						left,
						top: top2,
						opacity: tween(f, [b(plateAt) + 2, b(plateAt) + 4], [0, 1]) * textFade,
						transform: `scale(${1 + 0.04 * (1 - textB)})`,
						transformOrigin: 'left center',
					}}
				>
					<SafeText spec={T.sloganB} fontSize={fs} />
				</div>
			</div>
			<div style={{position: 'absolute', inset: 0, background: '#E9FFFD', opacity: hitFlash}} />
		</Bg>
	);
};

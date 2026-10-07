// Сцена 7, 2D-слой поверх башни: векторный логотип, ссылка на бирюзовой плашке,
// подпись про приложение. Финальный кадр держится ~1.7 с, но в нём всё время
// что-то движется: дрейф камеры, дыхание неона, блик по плашке.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {COLORS} from '../brand';
import {FINALE_BEATS, SCENES} from '../config';
import {ease, lbf, snap, tween} from '../anim';
import {CenterLine} from '../components/common';
import {Logo} from '../components/Logo';
import {SafeText, measureAtMaxScale, safeFontSize} from '../components/SafeText';
import {T} from '../texts';

const S = SCENES.finale.from;
const b = (x: number) => lbf(S, x);

const FB = FINALE_BEATS;

export const FinaleOverlay: React.FC = () => {
	const f = useCurrentFrame();
	const scrim = tween(f, [b(2.5), b(3.5)], [0, 1], ease.inOutCubic);
	const frameP = tween(f, [b(FB.logo), b(FB.logo + 0.9)], [0, 1], ease.outCubic);
	const markP = snap(f, b(FB.logo + 0.5), {stiffness: 420, damping: 16});
	const logoIn = snap(f, b(FB.logo), {stiffness: 300, damping: 18});
	const breathe = 1 + 0.015 * Math.sin((f - b(FB.logo)) / 9);

	const linkP = snap(f, b(FB.link), {stiffness: 700, damping: 18, mass: 0.6});
	const linkText = snap(f, b(FB.link) + 2, {stiffness: 500, damping: 22});
	const linkW = measureAtMaxScale(T.finalLink).width / T.finalLink.maxScale;
	const shine = ((f - b(FB.link + 1)) % 70) / 70;

	const l1 = snap(f, b(FB.line1), {stiffness: 500, damping: 24});
	const l2 = snap(f, b(FB.line2), {stiffness: 500, damping: 24});
	const flashIn = tween(f, [0, 7], [0.9, 0], ease.outCubic);

	return (
		<AbsoluteFill>
			{/* затемнение нижней половины для читаемости */}
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: 700,
					bottom: 0,
					background: 'linear-gradient(180deg, rgba(3,5,12,0) 0%, rgba(3,5,12,0.82) 30%, rgba(3,5,12,0.94) 100%)',
					opacity: scrim,
				}}
			/>
			{f >= b(FB.logo) ? (
				<div
					style={{
						position: 'absolute',
						left: 540 - 150,
						top: 880,
						width: 300,
						height: 300,
						transform: `scale(${(0.6 + 0.4 * logoIn) * breathe})`,
						opacity: Math.min(1, logoIn * 2),
						filter: `drop-shadow(0 0 ${18 + 10 * Math.sin(f / 11)}px ${COLORS.teal}aa)`,
					}}
				>
					<Logo size={300} frameProgress={frameP} markProgress={Math.max(0, markP)} />
				</div>
			) : null}
			{f >= b(FB.link) ? (
				<CenterLine y={1255}>
					<div style={{position: 'relative'}}>
						<div
							style={{
								position: 'absolute',
								left: -32,
								top: -16,
								width: linkW + 64,
								height: 'calc(100% + 32px)',
								background: COLORS.teal,
								transform: `scaleX(${Math.max(0, Math.min(1.03, linkP))})`,
								transformOrigin: 'center',
								overflow: 'hidden',
							}}
						>
							<div
								style={{
									position: 'absolute',
									top: 0,
									bottom: 0,
									left: `${-30 + shine * 160}%`,
									width: '22%',
									background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
									transform: 'skewX(-20deg)',
								}}
							/>
						</div>
						<div style={{position: 'relative', opacity: linkText, transform: `scale(${1 + 0.05 * (1 - linkText)})`}}>
							<SafeText spec={T.finalLink} />
						</div>
					</div>
				</CenterLine>
			) : null}
			{f >= b(FB.line1) ? (
				<CenterLine y={1362}>
					<div style={{opacity: Math.min(1, l1 * 1.5), transform: `translateY(${(1 - l1) * -24}px)`}}>
						<SafeText spec={T.finalLine1} />
					</div>
				</CenterLine>
			) : null}
			{f >= b(FB.line2) ? (
				<CenterLine y={1442}>
					<div style={{opacity: Math.min(1, l2 * 1.5), transform: `translateY(${(1 - l2) * -24}px)`}}>
						<SafeText spec={T.finalLine2} color={COLORS.neon} fontSize={safeFontSize(T.finalLine1)} />
					</div>
				</CenterLine>
			) : null}
			<div style={{position: 'absolute', inset: 0, background: '#E9FFFD', opacity: flashIn}} />
		</AbsoluteFill>
	);
};

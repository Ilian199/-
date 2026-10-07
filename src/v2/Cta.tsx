// Ролик 2, финальная карточка: логотип, «напишите одно слово», три слова на плашках,
// «в сообщения группы — покажем на вашем примере», ссылка. Держится ~2 с, всё время дышит.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS} from '../brand';
import {beatToFrame} from '../config';
import {ease, snap, tween} from '../anim';
import {Bg, CenterLine} from '../components/common';
import {Logo} from '../components/Logo';
import {SafeText, measureAtMaxScale, safeFontSize} from '../components/SafeText';
import {T} from '../texts';
import {CTA_BEATS as C, SCENES2} from './config';

const b = (x: number) => beatToFrame(SCENES2.cta.from + x) - beatToFrame(SCENES2.cta.from);
const WORDS = [T.v2Word1, T.v2Word2, T.v2Word3];

export const Cta: React.FC = () => {
	const f = useCurrentFrame();
	const logoIn = snap(f, b(C.logo), {stiffness: 300, damping: 18});
	const frameP = tween(f, [b(C.logo), b(C.logo + 0.9)], [0, 1], ease.outCubic);
	const markP = snap(f, b(C.logo + 0.4), {stiffness: 420, damping: 16});
	const title = snap(f, b(C.title), {stiffness: 480, damping: 22});
	const l1 = snap(f, b(C.line1), {stiffness: 480, damping: 24});
	const l2 = snap(f, b(C.line2), {stiffness: 480, damping: 24});
	const link = snap(f, b(C.link), {stiffness: 700, damping: 18, mass: 0.6});
	const linkW = measureAtMaxScale(T.finalLink).width / T.finalLink.maxScale;
	const lineFs = Math.min(safeFontSize(T.v2CtaLine1), safeFontSize(T.v2CtaLine2));
	const shine = ((f - b(C.link + 1)) % 70) / 70;

	// три слова на плашках в один ряд
	const wordFs = Math.min(...WORDS.map(safeFontSize));
	const widths = WORDS.map((w) => (measureAtMaxScale(w).width / w.maxScale) * (wordFs / safeFontSize(w)));
	const padX = 30;
	const gap = 26;
	const rowW = widths.reduce((a, w) => a + w + padX * 2, 0) + gap * 2;
	let x = 540 - rowW / 2;
	// после появления слова по очереди «подсвечиваются» — в кадре всегда есть движение
	const cycle = f > b(3) ? Math.floor((f - b(3)) / 14) % 3 : -1;

	return (
		<Bg>
			<div
				style={{
					position: 'absolute',
					left: 540 - 120,
					top: 270,
					width: 240,
					height: 240,
					opacity: Math.min(1, logoIn * 2),
					transform: `scale(${(0.6 + 0.4 * logoIn) * (1 + 0.015 * Math.sin(f / 9))})`,
					filter: `drop-shadow(0 0 ${16 + 8 * Math.sin(f / 11)}px ${COLORS.teal}aa)`,
				}}
			>
				<Logo size={240} frameProgress={frameP} markProgress={Math.max(0, markP)} />
			</div>
			<CenterLine y={640}>
				<div style={{opacity: Math.min(1, title * 1.5), transform: `translateY(${(1 - title) * 40}px)`}}>
					<SafeText spec={T.v2CtaTitle} />
				</div>
			</CenterLine>
			{WORDS.map((w, i) => {
				const left = x;
				x += widths[i] + padX * 2 + gap;
				const p = snap(f, b(C.words[i]), {stiffness: 700, damping: 17, mass: 0.6});
				if (f < b(C.words[i])) return null;
				const hot = cycle === i ? 1 : 0;
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left,
							top: 760,
							width: widths[i] + padX * 2,
							height: wordFs * 1.36,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							background: COLORS.teal,
							borderRadius: 14,
							transform: `scale(${Math.min(1.08, 0.7 + 0.3 * p)})`,
							opacity: Math.min(1, p * 2),
							boxShadow: `0 0 ${10 + 30 * hot}px ${COLORS.neon}${hot ? 'cc' : '55'}`,
							transition: 'none',
						}}
					>
						<SafeText spec={w} fontSize={wordFs} />
					</div>
				);
			})}
			<CenterLine y={1000}>
				<div style={{opacity: Math.min(1, l1 * 1.5), transform: `translateY(${(1 - l1) * -24}px)`}}>
					<SafeText spec={T.v2CtaLine1} fontSize={lineFs} />
				</div>
			</CenterLine>
			<CenterLine y={1086}>
				<div style={{opacity: Math.min(1, l2 * 1.5), transform: `translateY(${(1 - l2) * -24}px)`}}>
					<SafeText spec={T.v2CtaLine2} fontSize={lineFs} color={COLORS.neon} />
				</div>
			</CenterLine>
			{f >= b(C.link) ? (
				<CenterLine y={1290}>
					<div style={{position: 'relative'}}>
						<div
							style={{
								position: 'absolute',
								left: -32,
								top: -16,
								width: linkW + 64,
								height: 'calc(100% + 32px)',
								border: `3px solid ${COLORS.neon}`,
								borderRadius: 16,
								transform: `scaleX(${Math.max(0, Math.min(1.03, link))})`,
								boxShadow: `0 0 24px ${COLORS.teal}88`,
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
									background: 'linear-gradient(90deg, transparent, rgba(63,242,224,0.3), transparent)',
									transform: 'skewX(-20deg)',
								}}
							/>
						</div>
						<div style={{position: 'relative', opacity: Math.min(1, link * 1.5)}}>
							<SafeText spec={T.finalLink} />
						</div>
					</div>
				</CenterLine>
			) : null}
		</Bg>
	);
};

import React from 'react';
import {COLORS} from '../brand';

// Логотип ЦифроПрактики, перерисованный вектором по образцу аватарки:
// белая скруглённая рамка с разрывом справа, буква Ц, из хвоста которой
// выходит стрелка вверх-вправо с бирюзовым наконечником в белой обводке.
// Координаты — в системе 1024×1024 исходного изображения.

const FRAME =
	// от нижнего конца разрыва вниз по правой стороне и против часовой стрелки до верхнего конца разрыва
	'M 813 604 L 813 709 Q 813 813 709 813 L 315 813 Q 211 813 211 709 L 211 315 Q 211 211 315 211 L 709 211 Q 813 211 813 315 L 813 394';

const LETTER =
	'M 372 342 L 440 342 L 440 575 L 572 575 L 572 342 L 632 342 L 632 575 L 668 575 L 668 606 L 763 506 L 812 554 L 668 703 L 605 703 L 605 632 L 372 632 Z';

const HEAD_OUTER = 'M 915 383 L 715 455 L 860 597 Z';
const HEAD_INNER = 'M 878 422 L 763 462 L 848 547 Z';

export const Logo: React.FC<{
	size: number;
	/** 0..1 — прорисовка рамки. */
	frameProgress?: number;
	/** 0..1 — появление буквы и стрелки. */
	markProgress?: number;
	glow?: number;
	style?: React.CSSProperties;
}> = ({size, frameProgress = 1, markProgress = 1, glow = 0, style}) => {
	const frameLen = 2300;
	return (
		<svg
			width={size}
			height={size}
			viewBox="170 170 765 685"
			style={{overflow: 'visible', ...style}}
			shapeRendering="geometricPrecision"
		>
			<defs>
				<filter id="logoGlow" x="-30%" y="-30%" width="160%" height="160%">
					<feGaussianBlur stdDeviation={10} result="b" />
					<feMerge>
						<feMergeNode in="b" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>
			<g filter={glow > 0 ? 'url(#logoGlow)' : undefined} opacity={1}>
				<path
					d={FRAME}
					fill="none"
					stroke="#FFFFFF"
					strokeWidth={42}
					strokeLinecap="butt"
					strokeLinejoin="round"
					strokeDasharray={frameLen}
					strokeDashoffset={frameLen * (1 - frameProgress)}
				/>
				<g
					opacity={Math.min(1, markProgress * 1.5)}
					transform={`translate(${(1 - markProgress) * -40} ${(1 - markProgress) * 40})`}
				>
					<path d={LETTER} fill="#FFFFFF" />
					<path d={HEAD_OUTER} fill="#FFFFFF" strokeLinejoin="miter" />
					<path d={HEAD_INNER} fill={COLORS.teal} />
				</g>
			</g>
		</svg>
	);
};

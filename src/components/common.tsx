import React, {useEffect, useState} from 'react';
import {AbsoluteFill} from 'remotion';
import {COLORS} from '../brand';
import {SAFE} from '../config';
import {fontsReady} from '../fonts';

/** Сплошной тёмно-синий фон 2D-сцен: без точек, сеток и текстур. */
export const Bg: React.FC<{children?: React.ReactNode; color?: string}> = ({children, color = COLORS.bg}) => (
	<AbsoluteFill style={{background: color, overflow: 'hidden'}}>{children}</AbsoluteFill>
);

/** Не рендерит детей, пока не загружен Oswald, — иначе замеры текста были бы неверны. */
export const FontGate: React.FC<{children: React.ReactNode}> = ({children}) => {
	const [ready, setReady] = useState(false);
	useEffect(() => {
		fontsReady.then(() => setReady(true));
	}, []);
	return ready ? <>{children}</> : null;
};

/** Строка по центру безопасной зоны по горизонтали, центр по вертикали в `y`. */
export const CenterLine: React.FC<{y: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
	y,
	children,
	style,
}) => (
	<div
		style={{
			position: 'absolute',
			left: SAFE.left,
			width: SAFE.maxWidth,
			top: y,
			height: 0,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			...style,
		}}
	>
		{children}
	</div>
);

export const neonShadow = (color: string, k = 1) =>
	`0 0 ${8 * k}px ${color}, 0 0 ${22 * k}px ${color}, 0 0 ${48 * k}px ${color}88`;

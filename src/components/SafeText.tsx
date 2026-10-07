import {fitText, measureText} from '@remotion/layout-utils';
import React from 'react';
import {SAFE} from '../config';
import {FONT_FAMILY} from '../fonts';
import {TextSpec} from '../texts';

const ls = (spec: TextSpec) => `${spec.letterSpacing ?? 0}em`;

/** Размер шрифта, при котором строка × maxScale укладывается в maxWidth. */
export const safeFontSize = (spec: TextSpec) => {
	const maxWidth = spec.maxWidth ?? SAFE.maxWidth;
	const {fontSize} = fitText({
		text: spec.text,
		withinWidth: maxWidth / spec.maxScale,
		fontFamily: FONT_FAMILY,
		fontWeight: spec.weight,
		letterSpacing: ls(spec),
		validateFontIsLoaded: true,
	});
	// небольшой запас на субпиксельную разницу браузерной вёрстки
	return Math.min(spec.maxFontSize, Math.floor(fontSize * 0.98 * 10) / 10);
};

/** Ширина строки на максимальном масштабе анимации. */
export const measureAtMaxScale = (spec: TextSpec) => {
	const fontSize = safeFontSize(spec);
	const {width, height} = measureText({
		text: spec.text,
		fontFamily: FONT_FAMILY,
		fontSize,
		fontWeight: spec.weight,
		letterSpacing: ls(spec),
	});
	return {fontSize, width: width * spec.maxScale, height: height * spec.maxScale};
};

export const SafeText: React.FC<{
	spec: TextSpec;
	color?: string;
	style?: React.CSSProperties;
	/** Желаемый размер: применяется, только если он не больше безопасного. */
	fontSize?: number;
}> = ({spec, color = '#FFFFFF', style, fontSize: wanted}) => {
	const safe = safeFontSize(spec);
	const fontSize = wanted === undefined ? safe : Math.min(safe, wanted);
	return (
		<span
			style={{
				fontFamily: FONT_FAMILY,
				fontWeight: spec.weight,
				fontSize,
				letterSpacing: ls(spec),
				lineHeight: 1,
				whiteSpace: 'nowrap',
				color,
				display: 'inline-block',
				...style,
			}}
		>
			{spec.text}
		</span>
	);
};

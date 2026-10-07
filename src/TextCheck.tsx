// Проверка перед рендером: ширина каждой надписи на максимальном масштабе анимации.
// Запуск: npm run check:text — печатает список выходящих за предел (должен быть пустым).
import {measureText} from '@remotion/layout-utils';
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender} from 'remotion';
import {SAFE} from './config';
import {FONT_FAMILY, fontsReady} from './fonts';
import {measureAtMaxScale} from './components/SafeText';
import {T} from './texts';

type Row = {id: string; text: string; fontSize: number; width: number; limit: number; ok: boolean};

const runCheck = (): Row[] => {
	const rows: Row[] = Object.entries(T).map(([id, spec]) => {
		const {fontSize, width} = measureAtMaxScale(spec);
		const limit = spec.maxWidth ?? SAFE.maxWidth;
		return {id, text: spec.text, fontSize, width: Math.round(width * 10) / 10, limit, ok: width <= limit + 0.5 && width <= SAFE.maxWidth};
	});
	// числа в календаре брони: фиксированный кегль 24 px в ячейке 64 px
	const w = measureText({text: '30', fontFamily: FONT_FAMILY, fontSize: 24, fontWeight: 500}).width;
	rows.push({id: 'calendarDigits', text: '30', fontSize: 24, width: Math.round(w * 10) / 10, limit: 56, ok: w <= 56});
	return rows;
};

export const TextCheck: React.FC = () => {
	const [rows, setRows] = useState<Row[] | null>(null);
	const [handle] = useState(() => delayRender('Проверка текста'));
	useEffect(() => {
		fontsReady.then(() => {
			const r = runCheck();
			const bad = r.filter((x) => !x.ok);
			console.warn(`TEXTCHECK checked=${r.length}`);
			for (const x of r) console.warn(`TEXTCHECK_ROW ${x.ok ? 'ok ' : 'BAD'} ${x.id} ${x.width}/${x.limit}px @${x.fontSize}px «${x.text}»`);
			console.warn(`TEXTCHECK_OVERFLOW ${JSON.stringify(bad.map((x) => x.id))}`);
			setRows(r);
			continueRender(handle);
		});
	}, [handle]);
	return (
		<AbsoluteFill style={{background: '#0D1630', color: '#fff', fontFamily: FONT_FAMILY, padding: 40, fontSize: 22}}>
			{rows?.map((r) => (
				<div key={r.id} style={{color: r.ok ? '#9ff' : '#f66'}}>
					{r.ok ? '✓' : '✗'} {r.id}: {r.width} / {r.limit}
				</div>
			))}
		</AbsoluteFill>
	);
};

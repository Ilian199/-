// Проверка текста перед финальным рендером: каждая надпись на максимальном масштабе
// анимации должна укладываться в 888 px (и в свою колонку внутри телефона).
// Выводит в консоль список выходящих за предел — он должен быть пустым.
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';

const BROWSER = process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

const main = async () => {
	const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
	const logs: string[] = [];
	const composition = await selectComposition({serveUrl, id: 'TextCheck', browserExecutable: BROWSER});
	await renderStill({
		serveUrl,
		composition,
		output: path.resolve('out/textcheck.png'),
		browserExecutable: BROWSER,
		onBrowserLog: (l) => logs.push(l.text),
	});
	const rows = logs.filter((l) => l.startsWith('TEXTCHECK_ROW')).map((l) => l.replace('TEXTCHECK_ROW ', ''));
	for (const r of rows) console.log(r);
	const overflow = logs.find((l) => l.startsWith('TEXTCHECK_OVERFLOW'))?.replace('TEXTCHECK_OVERFLOW ', '');
	console.log(`\nПроверено элементов: ${rows.length}`);
	console.log(`Шире допустимого (должно быть пусто): ${overflow}`);
	if (overflow !== '[]') process.exit(1);
};

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

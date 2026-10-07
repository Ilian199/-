import {continueRender, delayRender, staticFile} from 'remotion';

// Oswald (вариативный, 200–700) лежит локально в public/fonts — файлы и
// диапазоны символов взяты из @remotion/google-fonts/Oswald (сабсеты cyrillic + latin).
// Локальная копия нужна, чтобы рендер не зависел от сети.
export const FONT_FAMILY = 'Oswald';

const SUBSETS = [
	{
		file: 'fonts/oswald-cyrillic.woff2',
		range: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
	},
	{
		file: 'fonts/oswald-latin.woff2',
		range:
			'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
	},
];

const handle = delayRender('Загрузка шрифта Oswald');

export const fontsReady: Promise<void> = Promise.all(
	SUBSETS.map(async ({file, range}) => {
		const face = new FontFace(FONT_FAMILY, `url(${staticFile(file)}) format('woff2')`, {
			weight: '200 700',
			style: 'normal',
			unicodeRange: range,
		});
		await face.load();
		document.fonts.add(face);
	}),
)
	.then(async () => {
		await Promise.all(
			['300', '400', '500', '600', '700'].map((w) => document.fonts.load(`${w} 100px "${FONT_FAMILY}"`, 'ЦИФРОПРАКТИКА abc')),
		);
	})
	.then(() => continueRender(handle));

// Единый конфиг: формат, музыка, тайминги всех сцен и тексты.
// Все события задаются в долях (beats) и переводятся в кадры от времени,
// чтобы не накапливался сдвиг (125 BPM @ 30 fps = 14.4 кадра на долю).

export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;
export const BPM = 125;

export const SECONDS_PER_BEAT = 60 / BPM;
/** Кадр, на который приходится доля `beat` (дробные доли допустимы). */
export const beatToFrame = (beat: number) => Math.round(beat * SECONDS_PER_BEAT * FPS);
export const frameToBeat = (frame: number) => frame / (SECONDS_PER_BEAT * FPS);

/** Безопасная зона для всего 2D-текста. */
export const SAFE = {
	left: 96,
	right: 984,
	top: 250,
	bottom: 1500,
	maxWidth: 888,
} as const;

/** Сцены в долях: [начало, конец). */
export const SCENES = {
	towerIntro: {from: 0, to: 6}, // 0–2.88 c: пролёт дрона, загорание букв, дроп на полном названии
	towerOrbit: {from: 6, to: 10}, // 2.88–4.8 c: облёт, глитч, влёт в медиафасад
	problem: {from: 10, to: 16}, // 4.8–7.68 c
	slogan: {from: 16, to: 20}, // 7.68–9.6 c
	app: {from: 20, to: 35}, // 9.6–16.8 c
	steps: {from: 35, to: 39}, // 16.8–18.72 c
	finale: {from: 39, to: 48}, // 18.72–23.04 c
} as const;

export const TOTAL_BEATS = 48;
export const DURATION_IN_FRAMES = beatToFrame(TOTAL_BEATS);

/** Ключевые события 3D-части (в долях). */
export const TOWER_EVENTS = {
	riseStart: 2.5, // начало резкого подъёма вдоль фасада
	lettersStart: 3.0, // первая буква загорается
	drop: 6, // полное название = дроп музыки
	glitch: 8, // глитч на сильной доле
	diveStart: 8.75, // камера влетает в медиафасад
	flash: 10, // вспышка и переход в 2D
	finaleWave: 41, // световая волна в финале
} as const;

/** Загорание букв «ЦИФРОПРАКТИКА» (доли): по одной, последняя — на шестнадцатую перед дропом. */
export const LETTER_COUNT = 13;
export const LETTER_BEATS = Array.from(
	{length: LETTER_COUNT},
	(_, i) => TOWER_EVENTS.lettersStart + (i * (TOWER_EVENTS.drop - TOWER_EVENTS.lettersStart)) / (LETTER_COUNT - 1) - 0.25,
);

/** Сцена 3 (доли от её начала). */
export const PROBLEM_BEATS = {phrases: [0, 1, 2] as const, strike: 3, familiar: 4};
/** Сцена 4 (доли от её начала). */
export const SLOGAN_BEATS = {line: 0, plate: 1, zoomThrough: 3.35};

/** Сцена 5 (доли от её начала). */
export const APP_BEATS = {
	phoneIn: 0,
	title: 0.5,
	cards: [1, 1.5, 2] as const,
	tapCard: 3,
	toBooking: 3.5,
	tapDate: 4.5,
	toast: 5.5,
	toRequests: 7,
	tapSend: 8,
	rowIn: 9,
	accepted: 10,
	toEvents: 11,
	tapReport: 12.5,
	whip: 14.6,
	end: 15,
};

/** Сцена 6 (доли от её начала). */
export const STEP_BEATS = {steps: [0, 1, 2] as const, pulse: 3, collapse: 3.4};

/** Сцена 7 (доли от её начала): волна, логотип, ссылка, подпись, финальный удар. */
export const FINALE_BEATS = {wave: 2, logo: 3, link: 4, line1: 4.5, line2: 5, finalHit: 5, end: 9};

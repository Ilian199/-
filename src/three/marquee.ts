// Отрисовка медиафасада «ЦИФРОПРАКТИКА» на canvas высокого разрешения.
// Всё рисуется вектором (fillText / path) с нуля: неоновое белое ядро,
// цветной кант, многослойный ореол (размытие на уменьшенном canvas).
// Прокрутка, глитч и светодиодная сетка делаются в шейдере кольца.

import {COLORS, TEXTS} from '../brand';
import {FONT_FAMILY} from '../fonts';

export const MARQUEE_W = 8192; // ширина текстуры = полная окружность пояса
export const MARQUEE_PERIOD = MARQUEE_W / 2; // повтор надписи дважды по кругу
const GLOW_DOWN = 4;
/** Шаг светодиода в пикселях текстуры. */
export const LED_PX = 16;

type Letter = {ch: string; x: number; w: number; teal: boolean};

export type MarqueeLayout = {
	W: number;
	H: number;
	P: number;
	fs: number;
	cap: number;
	baseline: number;
	letters: Letter[];
	nameX0: number;
	nameX1: number;
	arrow: {x: number; size: number};
	slogan: {x: number; fs: number; spacing: number};
	nameCenter: number;
};

export type MarqueeState = {
	/** Яркость каждой буквы названия: 0 — погасшая трубка, 1 — норма, >1 — вспышка. */
	letterLevel: number[];
	/** Голова светового следа (px в координатах периода) или null. */
	trailX: number | null;
	/** Центр световой волны (px в координатах периода) или null. */
	waveX: number | null;
	waveWidth: number;
	sloganLevel: number;
	arrowLevel: number;
};

const font = (weight: number, size: number) => `${weight} ${size}px "${FONT_FAMILY}"`;

const LS_NAME = 0.13; // широкая разрядка, в em
const LS_SLOGAN = 0.22;
const SLOGAN_RATIO = 0.36;
const GAP = 0.5;

export const computeMarqueeLayout = (): MarqueeLayout => {
	const c = document.createElement('canvas').getContext('2d')!;
	const measure = (fs: number) => {
		c.font = font(700, fs);
		const adv = [...TEXTS.name].map((ch) => c.measureText(ch).width);
		const cap = c.measureText('Н').actualBoundingBoxAscent;
		const nameW = adv.reduce((a, b) => a + b, 0) + (adv.length - 1) * LS_NAME * fs;
		const sfs = fs * SLOGAN_RATIO;
		c.font = font(400, sfs);
		const sAdv = [...TEXTS.slogan].map((ch) => c.measureText(ch).width);
		const sloganW = sAdv.reduce((a, b) => a + b, 0) + (sAdv.length - 1) * LS_SLOGAN * sfs;
		const arrow = cap * 0.95;
		return {adv, cap, nameW, sloganW, arrow, total: nameW + sloganW + arrow + 3 * GAP * fs};
	};
	const base = measure(100);
	const fs = (MARQUEE_PERIOD / base.total) * 100;
	const m = measure(fs);
	const gap = (MARQUEE_PERIOD - m.nameW - m.sloganW - m.arrow) / 3;
	// высота пояса кратна 8 (шаг светодиодной сетки)
	const H = Math.round((m.cap * 2.2) / LED_PX) * LED_PX;
	const baseline = H / 2 + m.cap / 2;
	let x = gap / 2;
	const nameX0 = x;
	const letters: Letter[] = [...TEXTS.name].map((ch, i) => {
		const l = {ch, x, w: m.adv[i], teal: i >= TEXTS.nameA.length};
		x += m.adv[i] + LS_NAME * fs;
		return l;
	});
	const nameX1 = nameX0 + m.nameW;
	const arrowX = nameX1 + gap;
	const sloganX = arrowX + m.arrow + gap;
	return {
		W: MARQUEE_W,
		H,
		P: MARQUEE_PERIOD,
		fs,
		cap: m.cap,
		baseline,
		letters,
		nameX0,
		nameX1,
		arrow: {x: arrowX, size: m.arrow},
		slogan: {x: sloganX, fs: fs * SLOGAN_RATIO, spacing: LS_SLOGAN * fs * SLOGAN_RATIO},
		nameCenter: (nameX0 + nameX1) / 2,
	};
};

const mixHex = (a: string, b: string, t: number) => {
	const pa = parseInt(a.slice(1), 16);
	const pb = parseInt(b.slice(1), 16);
	const ch = (p: number, s: number) => (p >> s) & 255;
	const m = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
	return `rgb(${m(16)},${m(8)},${m(0)})`;
};

const WHITE_RIM = '#BFEFFF';
const WHITE_GLOW = '#8FD8FF';
const TEAL_RIM = COLORS.neon;
const TEAL_GLOW = COLORS.teal;

export class MarqueePainter {
	readonly canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private glow: HTMLCanvasElement;
	private gctx: CanvasRenderingContext2D;
	private blur: HTMLCanvasElement;
	private bctx: CanvasRenderingContext2D;

	constructor(readonly L: MarqueeLayout) {
		this.canvas = document.createElement('canvas');
		this.canvas.width = L.W;
		this.canvas.height = L.H;
		this.ctx = this.canvas.getContext('2d')!;
		this.glow = document.createElement('canvas');
		this.glow.width = L.W / GLOW_DOWN;
		this.glow.height = L.H / GLOW_DOWN;
		this.gctx = this.glow.getContext('2d')!;
		this.blur = document.createElement('canvas');
		this.blur.width = this.glow.width;
		this.blur.height = this.glow.height;
		this.bctx = this.blur.getContext('2d')!;
	}

	private waveAt(s: MarqueeState, x: number) {
		if (s.waveX === null) return 0;
		const d = (x - s.waveX) / s.waveWidth;
		return Math.exp(-d * d);
	}

	/** Рисует один период содержимого со смещением ox. glow=true — источник ореола. */
	private drawPeriod(ctx: CanvasRenderingContext2D, s: MarqueeState, ox: number, glow: boolean) {
		const L = this.L;
		ctx.save();
		ctx.translate(ox, 0);
		ctx.textBaseline = 'alphabetic';
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.font = font(700, L.fs);

		L.letters.forEach((l, i) => {
			const level = s.letterLevel[i] ?? 1;
			const w = this.waveAt(s, l.x + l.w / 2);
			const rim = l.teal ? mixHex(TEAL_RIM, '#FFFFFF', w * 0.85) : WHITE_RIM;
			const glowCol = l.teal ? mixHex(TEAL_GLOW, '#E8FFFD', w * 0.7) : WHITE_GLOW;
			if (level < 0.06) {
				if (!glow) {
					// погасшая неоновая трубка: едва заметный контур
					ctx.globalAlpha = 0.16;
					ctx.strokeStyle = l.teal ? '#0E5A54' : '#3A4A5C';
					ctx.lineWidth = L.fs * 0.02;
					ctx.strokeText(l.ch, l.x, L.baseline);
				}
				return;
			}
			const lv = Math.min(level, 1) * (1 + w * 0.6);
			if (glow) {
				ctx.globalAlpha = Math.min(1, lv * (level > 1 ? 1 + (level - 1) * 1.5 : 1)) * (l.teal ? 1 : 0.55);
				ctx.fillStyle = glowCol;
				ctx.strokeStyle = glowCol;
				ctx.lineWidth = L.fs * 0.03;
				ctx.fillText(l.ch, l.x, L.baseline);
				ctx.strokeText(l.ch, l.x, L.baseline);
				return;
			}
			ctx.globalAlpha = Math.min(1, lv);
			// белое ядро + цветной кант
			ctx.fillStyle = l.teal ? mixHex('#C8FFF8', '#FFFFFF', w) : '#FFFFFF';
			ctx.fillText(l.ch, l.x, L.baseline);
			ctx.strokeStyle = rim;
			ctx.lineWidth = L.fs * (l.teal ? 0.065 : 0.045) * (1 - w * 0.5);
			ctx.strokeText(l.ch, l.x, L.baseline);
			if (level > 1) {
				// вспышка при зажигании: кант выгорает в белое
				ctx.globalAlpha = Math.min(1, level - 1);
				ctx.strokeStyle = '#FFFFFF';
				ctx.lineWidth = L.fs * 0.1;
				ctx.strokeText(l.ch, l.x, L.baseline);
			}
		});

		// световой след при зажигании букв
		if (s.trailX !== null) {
			const y = L.baseline - L.cap * 0.5;
			const len = L.fs * 2.4;
			const g = ctx.createLinearGradient(s.trailX - len, 0, s.trailX, 0);
			g.addColorStop(0, 'rgba(63,242,224,0)');
			g.addColorStop(0.75, 'rgba(63,242,224,0.7)');
			g.addColorStop(1, 'rgba(255,255,255,1)');
			ctx.globalAlpha = 1;
			ctx.fillStyle = g;
			const th = L.fs * (glow ? 0.14 : 0.045);
			ctx.beginPath();
			ctx.roundRect(s.trailX - len, y - th / 2, len, th, th / 2);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(s.trailX, y, L.fs * (glow ? 0.16 : 0.05), 0, Math.PI * 2);
			ctx.fillStyle = '#FFFFFF';
			ctx.fill();
		}

		// разделитель: неоновая стрелка вверх-вправо (как в логотипе)
		{
			const a = L.arrow;
			const lv = s.arrowLevel * (1 + this.waveAt(s, a.x + a.size / 2) * 0.5);
			const top = L.baseline - L.cap;
			const x0 = a.x;
			const y0 = L.baseline;
			const x1 = a.x + a.size;
			const y1 = top;
			const head = a.size * 0.42;
			const path = new Path2D();
			path.moveTo(x0, y0);
			path.lineTo(x1, y1);
			path.moveTo(x1 - head, y1);
			path.lineTo(x1, y1);
			path.lineTo(x1, y1 + head);
			ctx.globalAlpha = Math.min(1, lv);
			if (glow) {
				ctx.strokeStyle = TEAL_GLOW;
				ctx.lineWidth = L.fs * 0.2;
				ctx.stroke(path);
			} else {
				ctx.strokeStyle = TEAL_RIM;
				ctx.lineWidth = L.fs * 0.13;
				ctx.stroke(path);
				ctx.strokeStyle = '#FFFFFF';
				ctx.lineWidth = L.fs * 0.055;
				ctx.stroke(path);
			}
		}

		// слоган: тоньше и мельче
		{
			const sl = L.slogan;
			ctx.font = font(400, sl.fs);
			let x = sl.x;
			for (const ch of TEXTS.slogan) {
				const cw = ctx.measureText(ch).width;
				const lv = s.sloganLevel * (1 + this.waveAt(s, x) * 0.6);
				ctx.globalAlpha = Math.min(1, lv);
				if (glow) {
					ctx.fillStyle = TEAL_GLOW;
					ctx.fillText(ch, x, L.baseline);
				} else {
					ctx.fillStyle = '#FFFFFF';
					ctx.fillText(ch, x, L.baseline);
					ctx.strokeStyle = mixHex('#9FF7EE', '#FFFFFF', this.waveAt(s, x));
					ctx.lineWidth = sl.fs * 0.03;
					ctx.strokeText(ch, x, L.baseline);
				}
				x += cw + sl.spacing;
			}
		}
		ctx.restore();
	}

	draw(s: MarqueeState) {
		const {ctx, gctx, bctx, L} = this;
		const offsets = [-L.P, 0, L.P, 2 * L.P];

		// 1. источник ореола в 1/4 разрешения
		gctx.setTransform(1, 0, 0, 1, 0, 0);
		gctx.globalAlpha = 1;
		gctx.clearRect(0, 0, this.glow.width, this.glow.height);
		gctx.setTransform(1 / GLOW_DOWN, 0, 0, 1 / GLOW_DOWN, 0, 0);
		for (const o of offsets) this.drawPeriod(gctx, s, o, true);

		// 2. чёрный фон (OLED) + несколько слоёв размытия
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
		ctx.fillStyle = '#000000';
		ctx.fillRect(0, 0, L.W, L.H);
		ctx.globalCompositeOperation = 'lighter';
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		const layers: [number, number][] = [
			[26, 0.2],
			[10, 0.26],
			[3, 0.3],
		];
		for (const [r, a] of layers) {
			bctx.globalAlpha = 1;
			bctx.filter = 'none';
			bctx.clearRect(0, 0, this.blur.width, this.blur.height);
			bctx.filter = `blur(${r}px)`;
			// оборачиваем края, чтобы ореол был бесшовным по кругу
			bctx.drawImage(this.glow, 0, 0);
			bctx.filter = 'none';
			ctx.globalAlpha = a;
			ctx.drawImage(this.blur, 0, 0, L.W, L.H);
		}

		// 3. чёткие буквы поверх
		ctx.globalCompositeOperation = 'source-over';
		for (const o of offsets) this.drawPeriod(ctx, s, o, false);
		ctx.globalAlpha = 1;
	}
}

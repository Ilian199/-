import * as THREE from 'three';
import {mulberry32} from './random';

const canvasTex = (c: HTMLCanvasElement, srgb = true) => {
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
	t.anisotropy = 16;
	t.generateMipmaps = true;
	t.minFilter = THREE.LinearMipmapLinearFilter;
	t.magFilter = THREE.LinearFilter;
	return t;
};

/**
 * Фасад главной башни: стекло, междуэтажные перекрытия, вертикальные импосты
 * (map) и редкие тёплые окна (emissiveMap). cols×floors ячеек по кругу.
 */
export const makeTowerFacade = (cols: number, floors: number, seed: number) => {
	const S = 4096;
	const rnd = mulberry32(seed);
	const cw = S / cols;
	const fh = S / floors;

	const map = document.createElement('canvas');
	map.width = S;
	map.height = S;
	const m = map.getContext('2d')!;
	m.fillStyle = '#0A111F';
	m.fillRect(0, 0, S, S);
	for (let f = 0; f < floors; f++) {
		for (let c = 0; c < cols; c++) {
			const v = 10 + rnd() * 8;
			m.fillStyle = `rgb(${v},${v + 6},${v + 18})`;
			m.fillRect(c * cw, f * fh, cw, fh);
		}
	}
	// перекрытия
	m.fillStyle = '#1C222E';
	for (let f = 0; f <= floors; f++) m.fillRect(0, f * fh - 4, S, 8);
	// импосты
	m.fillStyle = '#242C3A';
	for (let c = 0; c <= cols; c++) m.fillRect(c * cw - 2, 0, 4, S);

	const em = document.createElement('canvas');
	em.width = S;
	em.height = S;
	const e = em.getContext('2d')!;
	e.fillStyle = '#000';
	e.fillRect(0, 0, S, S);
	const warm = ['#FFC27A', '#FFD59A', '#FFB060', '#FFE2B8', '#DDE6FF'];
	for (let f = 0; f < floors; f++) {
		// иногда горит «кусок этажа», иногда одиночные окна
		const floorBias = rnd() < 0.1 ? 0.3 : 0.03;
		for (let c = 0; c < cols; c++) {
			if (rnd() > floorBias) continue;
			const col = warm[Math.floor(rnd() * warm.length)];
			const k = 0.45 + rnd() * 0.55;
			const x = c * cw + 4;
			const y = f * fh + 6;
			const g = e.createLinearGradient(0, y, 0, y + fh - 12);
			g.addColorStop(0, col);
			g.addColorStop(1, '#000');
			e.globalAlpha = k;
			e.fillStyle = g;
			e.fillRect(x, y, cw - 8, fh - 12);
		}
	}
	e.globalAlpha = 1;
	return {map: canvasTex(map), emissive: canvasTex(em)};
};

/** Плитка окон для низких зданий и соседних башен (повторяется). */
export const makeWindowTile = (seed: number, litChance: number) => {
	const N = 64;
	const C = 16;
	const c = document.createElement('canvas');
	c.width = N * C;
	c.height = N * C;
	const x = c.getContext('2d')!;
	x.fillStyle = '#000';
	x.fillRect(0, 0, c.width, c.height);
	const rnd = mulberry32(seed);
	const warm = ['#FFB35C', '#FFC984', '#FFDDA8', '#FFA040', '#CFE0FF'];
	for (let j = 0; j < N; j++) {
		for (let i = 0; i < N; i++) {
			if (rnd() > litChance) continue;
			x.globalAlpha = 0.35 + rnd() * 0.65;
			x.fillStyle = warm[Math.floor(rnd() * warm.length)];
			x.fillRect(i * C + 3, j * C + 4, C - 6, C - 7);
		}
	}
	const t = canvasTex(c);
	t.wrapS = THREE.RepeatWrapping;
	t.wrapT = THREE.RepeatWrapping;
	return t;
};

/** Альбедо стекла соседних башен: горизонтальные перекрытия и импосты. */
export const makeGlassTile = (seed: number) => {
	const S = 512;
	const c = document.createElement('canvas');
	c.width = S;
	c.height = S;
	const x = c.getContext('2d')!;
	const rnd = mulberry32(seed);
	const cells = 8;
	const cs = S / cells;
	for (let j = 0; j < cells; j++) {
		for (let i = 0; i < cells; i++) {
			const v = 8 + rnd() * 7;
			x.fillStyle = `rgb(${v},${v + 4},${v + 14})`;
			x.fillRect(i * cs, j * cs, cs, cs);
		}
	}
	x.fillStyle = '#1A202B';
	for (let j = 0; j <= cells; j++) x.fillRect(0, j * cs - 3, S, 6);
	x.fillStyle = '#202835';
	for (let i = 0; i <= cells; i++) x.fillRect(i * cs - 1.5, 0, 3, S);
	const t = canvasTex(c);
	t.wrapS = THREE.RepeatWrapping;
	t.wrapT = THREE.RepeatWrapping;
	return t;
};

/** План города сверху: тёмная земля и слабо подсвеченные улицы. */
export const makeGroundMap = (extent: number, block: number, street: number) => {
	const S = 4096;
	const c = document.createElement('canvas');
	c.width = S;
	c.height = S;
	const x = c.getContext('2d')!;
	x.fillStyle = '#000';
	x.fillRect(0, 0, S, S);
	const k = S / (2 * extent);
	// асфальт чуть светлее земли, по краям — тёплая засветка от фонарей
	for (let p = -extent; p <= extent; p += block) {
		const px = (p + extent) * k;
		const w = street * k;
		for (const [off, col] of [
			[0, 'rgb(14,9,5)'],
			[-w * 0.36, 'rgb(70,40,14)'],
			[w * 0.36, 'rgb(70,40,14)'],
		] as const) {
			x.fillStyle = col;
			const lw = off === 0 ? w : w * 0.14;
			x.fillRect(px + off - lw / 2, 0, lw, S);
			x.fillRect(0, px + off - lw / 2, S, lw);
		}
	}
	return canvasTex(c);
};

import * as THREE from 'three';

/** Точки эллипса (замкнутый контур, без повтора первой точки). */
export const ellipsePoints = (rx: number, rz: number, y: number, n = 256) =>
	Array.from({length: n}, (_, i) => {
		// тот же параметр угла, что у CylinderGeometry: x = sin, z = cos
		const t = (i / n) * Math.PI * 2;
		return new THREE.Vector3(rx * Math.sin(t), y, rz * Math.cos(t));
	});

export const rectPoints = (w: number, d: number, y: number) => [
	new THREE.Vector3(-w / 2, y, d / 2),
	new THREE.Vector3(w / 2, y, d / 2),
	new THREE.Vector3(w / 2, y, -d / 2),
	new THREE.Vector3(-w / 2, y, -d / 2),
];

/**
 * Вертикальная лента высотой h вдоль замкнутого контура pts.
 * Атрибут aS — нормированная длина по периметру (для бегущего света).
 */
export const stripGeometry = (pts: THREE.Vector3[], h: number, outset = 0) => {
	const n = pts.length;
	const center = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / n);
	const P = pts.map((p) => {
		const d = new THREE.Vector3(p.x - center.x, 0, p.z - center.z);
		const len = d.length() || 1;
		return p.clone().add(d.multiplyScalar(outset / len));
	});
	const lens = [0];
	for (let i = 0; i < n; i++) lens.push(lens[i] + P[i].distanceTo(P[(i + 1) % n]));
	const total = lens[n];
	const pos: number[] = [];
	const uv: number[] = [];
	const s: number[] = [];
	const idx: number[] = [];
	for (let i = 0; i < n; i++) {
		const a = P[i];
		const b = P[(i + 1) % n];
		const k = pos.length / 3;
		pos.push(a.x, a.y, a.z, b.x, b.y, b.z, b.x, b.y + h, b.z, a.x, a.y + h, a.z);
		uv.push(0, 0, 1, 0, 1, 1, 0, 1);
		const sa = lens[i] / total;
		const sb = lens[i + 1] / total;
		s.push(sa, sb, sb, sa);
		idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1));
	g.setIndex(idx);
	return g;
};

/** Эллиптический цилиндр: радиус 1, масштаб rx/rz, от y0 до y1. */
export const ellipticCylinder = (rx: number, rz: number, y0: number, y1: number, seg = 192, open = false) => {
	const g = new THREE.CylinderGeometry(1, 1, y1 - y0, seg, 1, open);
	g.scale(rx, 1, rz);
	g.translate(0, (y0 + y1) / 2, 0);
	return g;
};

/** Периметр эллипса (Рамануджан). */
export const ellipsePerimeter = (a: number, b: number) => {
	const h = ((a - b) * (a - b)) / ((a + b) * (a + b));
	return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
};

/** Лента реки в плоскости XY (для Reflector, затем поворот на -90° по X). */
export const ribbonXY = (curve: THREE.Curve<THREE.Vector2>, width: number, segments: number) => {
	const pos: number[] = [];
	const uv: number[] = [];
	const idx: number[] = [];
	for (let i = 0; i <= segments; i++) {
		const t = i / segments;
		const p = curve.getPoint(t);
		const d = curve.getTangent(t);
		const nx = -d.y;
		const ny = d.x;
		const w = width * (0.85 + 0.15 * Math.sin(t * 17.0));
		pos.push(p.x + (nx * w) / 2, p.y + (ny * w) / 2, 0, p.x - (nx * w) / 2, p.y - (ny * w) / 2, 0);
		uv.push(0, t, 1, t);
		if (i < segments) {
			const k = i * 2;
			idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
};

/** Кольцевая неоновая лента по эллипсу от ya до yb. */
export const ellipseCylinderStrip = (rx: number, rz: number, ya: number, yb: number, n = 256) =>
	stripGeometry(ellipsePoints(rx, rz, ya, n), yb - ya, 0);

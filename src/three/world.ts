// Ночной деловой район: главная башня с медиафасадом, две соседние башни,
// город, река, дороги с машинами. Строится императивно один раз,
// затем update() выставляет всё состояние из номера кадра.

import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {COLORS} from '../brand';
import {ellipseCylinderStrip, ellipticCylinder, ellipsePerimeter, rectPoints, ribbonXY, stripGeometry} from './geometry';
import {
	FOG_DENSITY,
	addWorldWindows,
	makeMediaFacadeMaterial,
	makeNeonStripMaterial,
	makePointsMaterial,
	makeSkyMaterial,
	makeTowerLinesMaterial,
} from './materials';
import {LED_PX, MarqueeLayout, MarqueePainter, MarqueeState} from './marquee';
import {mulberry32} from './random';
import {makeGlassTile, makeGroundMap, makeTowerFacade, makeWindowTile} from './textures';

export const TOWER = {
	rx: 20,
	rz: 18,
	floors: 80,
	floorH: 3.6,
	get height() {
		return this.floors * this.floorH;
	},
	bandCenter: 206,
};

export const CITY = {extent: 1650, block: 110, street: 18};

export type WorldFrame = {
	time: number; // секунды
	marquee: MarqueeState;
	scroll: number; // сдвиг надписи по кругу (доля окружности)
	glitch: number;
	glitchSeed: number;
	facadeGain: number;
	facadeFlash: number;
};

export type World = {
	scene: THREE.Group;
	sky: THREE.Mesh;
	bandMeters: {y0: number; y1: number; circumference: number};
	update: (f: WorldFrame, camera: THREE.PerspectiveCamera, viewportH: number) => void;
	dispose: () => void;
};

const RIVER_PTS: [number, number][] = [
	[-3400, 520],
	[-2200, 640],
	[-1300, 420],
	[-650, 330],
	[-150, 250],
	[400, 300],
	[1000, 520],
	[1700, 470],
	[2500, 700],
	[3400, 640],
];

export const buildWorld = (layout: MarqueeLayout, painter: MarqueePainter): World => {
	const root = new THREE.Group();
	const animated: {mat: THREE.ShaderMaterial; kind: 'time'}[] = [];
	const pointMats: THREE.ShaderMaterial[] = [];
	const rnd = mulberry32(20251007);
	const track = <T extends THREE.ShaderMaterial>(m: T) => {
		animated.push({mat: m, kind: 'time'});
		return m;
	};

	// ---------- небо и звёзды ----------
	const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), makeSkyMaterial(false));
	sky.renderOrder = -10;
	sky.frustumCulled = false;
	root.add(sky);
	{
		const n = 260;
		const pos: number[] = [];
		const col: number[] = [];
		for (let i = 0; i < n; i++) {
			const az = rnd() * Math.PI * 2;
			const el = 0.12 + Math.pow(rnd(), 0.7) * 1.3;
			const r = 8500;
			pos.push(Math.cos(az) * Math.cos(el) * r, Math.sin(el) * r, Math.sin(az) * Math.cos(el) * r);
			const k = 0.08 + rnd() * 0.25;
			col.push(k * 0.85, k * 0.9, k);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
		g.setAttribute('aData', new THREE.Float32BufferAttribute(new Array(n * 4).fill(0), 4));
		const m = makePointsMaterial({size: 0, min: 1.6, max: 2.4, gain: 1, fog: false});
		pointMats.push(m);
		const stars = new THREE.Points(g, m);
		stars.frustumCulled = false;
		sky.add(stars);
	}

	// ---------- земля ----------
	const E = CITY.extent;
	{
		const groundMat = new THREE.MeshStandardMaterial({
			color: '#000000',
			roughness: 1,
			metalness: 0,
			emissive: '#ffffff',
			emissiveMap: makeGroundMap(E, CITY.block, CITY.street),
			emissiveIntensity: 0.22,
			envMapIntensity: 0,
		});
		const ground = new THREE.Mesh(new THREE.PlaneGeometry(2 * E, 2 * E), groundMat);
		ground.rotation.x = -Math.PI / 2;
		root.add(ground);
		const outer = new THREE.Mesh(
			new THREE.RingGeometry(E * 0.99, 12000, 64, 1),
			new THREE.MeshBasicMaterial({color: '#010204'}),
		);
		outer.rotation.x = -Math.PI / 2;
		outer.position.y = -0.2;
		root.add(outer);
	}

	// ---------- река ----------
	const riverCurve = new THREE.CatmullRomCurve3(RIVER_PTS.map(([x, z]) => new THREE.Vector3(x, 0, z)));
	const riverSamples = riverCurve.getSpacedPoints(400);
	const riverWidth = 130;
	const distToRiver = (x: number, z: number) => {
		let d = Infinity;
		for (const p of riverSamples) d = Math.min(d, Math.hypot(p.x - x, p.z - z));
		return d;
	};
	const water = (() => {
		const curve2 = new THREE.SplineCurve(RIVER_PTS.map(([x, z]) => new THREE.Vector2(x, -z)));
		const geom = ribbonXY(curve2, riverWidth, 600);
		const mirror = new Reflector(geom, {
			textureWidth: 540,
			textureHeight: 960,
			clipBias: 0.003,
			color: new THREE.Color('#000000'),
			shader: WATER_SHADER,
		});
		mirror.rotation.x = -Math.PI / 2;
		mirror.position.y = 0.6;
		root.add(mirror);
		return mirror;
	})();

	// ---------- низкие здания ----------
	{
		const lots: {x: number; z: number; w: number; d: number; h: number}[] = [];
		const B = CITY.block;
		const S = CITY.street;
		for (let bx = -E; bx < E; bx += B) {
			for (let bz = -E; bz < E; bz += B) {
				const inner = B - S;
				const cx0 = bx + S / 2;
				const cz0 = bz + S / 2;
				const nx = rnd() < 0.5 ? 2 : 3;
				const nz = rnd() < 0.5 ? 2 : 3;
				for (let i = 0; i < nx; i++) {
					for (let j = 0; j < nz; j++) {
						const lw = inner / nx;
						const ld = inner / nz;
						const x = cx0 + lw * (i + 0.5);
						const z = cz0 + ld * (j + 0.5);
						if (x > -170 && x < 170 && z > -170 && z < 110) continue; // площадь у башен
						if (distToRiver(x, z) < riverWidth / 2 + 45) continue;
						if (rnd() < 0.08) continue;
						const dist = Math.hypot(x, z);
						const downtown = Math.exp(-dist / 420);
						const h = 9 + Math.pow(rnd(), 2.2) * 34 + downtown * rnd() * 95;
						lots.push({x, z, w: lw * (0.62 + rnd() * 0.3), d: ld * (0.62 + rnd() * 0.3), h});
					}
				}
			}
		}
		const mat = addWorldWindows(
			new THREE.MeshStandardMaterial({color: '#05070b', roughness: 0.75, metalness: 0.1, envMapIntensity: 0.35}),
			{win: makeWindowTile(7, 0.045), cell: new THREE.Vector2(4, 3.5), gain: 1.0},
		);
		const box = new THREE.BoxGeometry(1, 1, 1);
		box.translate(0, 0.5, 0);
		const inst = new THREE.InstancedMesh(box, mat, lots.length);
		const m4 = new THREE.Matrix4();
		lots.forEach((l, i) => {
			m4.makeScale(l.w, l.h, l.d);
			m4.setPosition(l.x, 0, l.z);
			inst.setMatrixAt(i, m4);
		});
		inst.instanceMatrix.needsUpdate = true;
		root.add(inst);

		// авиаогни на самых высоких
		const tall = lots.filter((l) => l.h > 60);
		const pos: number[] = [];
		const col: number[] = [];
		const data: number[] = [];
		for (const l of tall) {
			pos.push(l.x, l.h + 1.5, l.z);
			col.push(1, 0.08, 0.04);
			data.push(rnd(), 0, 0, 0);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
		g.setAttribute('aData', new THREE.Float32BufferAttribute(data, 4));
		const pm = makePointsMaterial({size: 2.5, min: 1.5, max: 6, gain: 2.2, blink: true});
		pointMats.push(pm);
		root.add(new THREE.Points(g, pm));
	}

	// ---------- фонари и машины ----------
	{
		const pos: number[] = [];
		const col: number[] = [];
		const B = CITY.block;
		const far = 4400;
		for (let p = -far; p <= far; p += B) {
			const inCity = Math.abs(p) <= E;
			const step = inCity ? 30 : 55;
			for (let s = -far; s <= far; s += step) {
				const cityS = Math.abs(s) <= E;
				if (!(inCity && cityS) && rnd() < 0.35) continue;
				for (const side of [-7, 7]) {
					if (!(inCity && cityS) && side > 0) continue;
					const j = (rnd() - 0.5) * 4;
					const warm = 0.55 + rnd() * 0.25;
					// вдоль X и вдоль Z
					pos.push(s + j, 6, p + side);
					col.push(1, warm, warm * 0.45);
					pos.push(p + side, 6, s + j);
					col.push(1, warm, warm * 0.45);
				}
			}
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
		g.setAttribute('aData', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 4).fill(0), 4));
		const lm = makePointsMaterial({size: 2.2, min: 1.3, max: 7, gain: 0.85});
		pointMats.push(lm);
		const lamps = new THREE.Points(g, lm);
		lamps.frustumCulled = false;
		root.add(lamps);

		// машины: белые фары и красные стоп-сигналы, по двум полосам
		const cpos: number[] = [];
		const ccol: number[] = [];
		const cdata: number[] = [];
		for (let p = -E; p <= E; p += B) {
			for (const axis of [0, 1]) {
				for (const lane of [-1, 1]) {
					const count = 18 + Math.floor(rnd() * 10);
					for (let i = 0; i < count; i++) {
						const speed = (7 + rnd() * 6) * lane;
						const s0 = (rnd() * 2 - 1) * E;
						cpos.push(0, 1.2, 0);
						if (lane > 0) ccol.push(1, 0.92, 0.8);
						else ccol.push(1, 0.06, 0.03);
						cdata.push(axis, p + lane * 3.5, s0, speed);
					}
				}
			}
		}
		const cg = new THREE.BufferGeometry();
		cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3));
		cg.setAttribute('color', new THREE.Float32BufferAttribute(ccol, 3));
		cg.setAttribute('aData', new THREE.Float32BufferAttribute(cdata, 4));
		const cm = makePointsMaterial({size: 2.6, min: 1.4, max: 8, gain: 1.6, moving: true, range: E});
		pointMats.push(cm);
		const cars = new THREE.Points(cg, cm);
		cars.frustumCulled = false;
		root.add(cars);
	}

	// ---------- главная башня ----------
	const H = TOWER.height;
	const circumference = ellipsePerimeter(TOWER.rx, TOWER.rz);
	const facadeTex = makeTowerFacade(72, TOWER.floors, 11);
	{
		const glass = new THREE.MeshPhysicalMaterial({
			color: '#ffffff',
			map: facadeTex.map,
			emissive: '#ffffff',
			emissiveMap: facadeTex.emissive,
			emissiveIntensity: 0.65,
			roughness: 0.06,
			metalness: 0.0,
			clearcoat: 0.8,
			clearcoatRoughness: 0.04,
			envMapIntensity: 2.2,
		});
		const body = new THREE.Mesh(ellipticCylinder(TOWER.rx, TOWER.rz, 14, H, 192, true), glass);
		root.add(body);

		// подиум с тёплым вестибюлем
		const podMat = new THREE.MeshStandardMaterial({color: '#05070c', roughness: 0.4, metalness: 0.6});
		root.add(new THREE.Mesh(ellipticCylinder(TOWER.rx + 9, TOWER.rz + 8, 0, 14, 128), podMat));
		const lobby = new THREE.Mesh(
			ellipseCylinderStrip(TOWER.rx + 9.05, TOWER.rz + 8.05, 3, 6.5),
			makeNeonStripMaterial({colorA: '#FFB066', base: 0.16, peak: 0, segments: 1}),
		);
		root.add(lobby);

		// вертикальные неоновые линии
		const lines = new THREE.Mesh(
			ellipticCylinder(TOWER.rx + 0.15, TOWER.rz + 0.15, 14, H, 256, true),
			track(makeTowerLinesMaterial(24, circumference, H)),
		);
		root.add(lines);

		// корона: ступенчатые ярусы с неоновой подсветкой кромок
		const crownMat = new THREE.MeshPhysicalMaterial({color: '#0a0e16', roughness: 0.15, metalness: 0.7, envMapIntensity: 1.5});
		const tiers = [0.94, 0.84, 0.72, 0.58, 0.44];
		let y = H;
		tiers.forEach((k, i) => {
			const th = 6.5 - i * 0.6;
			const m = new THREE.Mesh(ellipticCylinder(TOWER.rx * k, TOWER.rz * k, y, y + th, 128), crownMat);
			root.add(m);
			const neon = new THREE.Mesh(
				ellipseCylinderStrip(TOWER.rx * k + 0.12, TOWER.rz * k + 0.12, y + th - 0.9, y + th - 0.2),
				track(
					makeNeonStripMaterial({
						colorA: i % 2 ? COLORS.coldBlue : COLORS.neon,
						base: 3.2,
						peak: 8,
						segments: 2,
						speed: 0.18 + i * 0.03,
						phase: i * 0.21,
					}),
				),
			);
			root.add(neon);
			y += th;
		});
		// шпиль
		const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 1.2, 46, 16), crownMat);
		spire.position.y = y + 23;
		root.add(spire);
		const spireLine = new THREE.Mesh(
			new THREE.CylinderGeometry(0.3, 0.3, 40, 8, 1, true),
			new THREE.MeshBasicMaterial({color: new THREE.Color(COLORS.neon).multiplyScalar(2.5)}),
		);
		spireLine.position.y = y + 20;
		root.add(spireLine);
		{
			const g = new THREE.BufferGeometry();
			g.setAttribute('position', new THREE.Float32BufferAttribute([0, y + 46.5, 0], 3));
			g.setAttribute('color', new THREE.Float32BufferAttribute([1, 0.1, 0.05], 3));
			g.setAttribute('aData', new THREE.Float32BufferAttribute([0.3, 0, 0, 0], 4));
			const pm = makePointsMaterial({size: 3.5, min: 2.5, max: 14, gain: 4, blink: true});
			pointMats.push(pm);
			root.add(new THREE.Points(g, pm));
		}
	}

	// ---------- медиафасад ----------
	const bandH = (layout.H / layout.W) * ellipsePerimeter(TOWER.rx + 0.8, TOWER.rz + 0.8);
	const y0 = TOWER.bandCenter - bandH / 2;
	const y1 = TOWER.bandCenter + bandH / 2;
	const marqueeTex = new THREE.CanvasTexture(painter.canvas);
	marqueeTex.colorSpace = THREE.SRGBColorSpace;
	marqueeTex.wrapS = THREE.RepeatWrapping;
	marqueeTex.anisotropy = 16;
	marqueeTex.generateMipmaps = true;
	marqueeTex.minFilter = THREE.LinearMipmapLinearFilter;
	const facadeMat = makeMediaFacadeMaterial(marqueeTex, new THREE.Vector2(layout.W / LED_PX, layout.H / LED_PX));
	{
		const fascia = new THREE.Mesh(
			ellipticCylinder(TOWER.rx + 0.65, TOWER.rz + 0.65, y0 - 1.6, y1 + 1.6, 192),
			new THREE.MeshStandardMaterial({color: '#030406', roughness: 0.9, metalness: 0.0, envMapIntensity: 0.3}),
		);
		root.add(fascia);
		const band = new THREE.Mesh(ellipticCylinder(TOWER.rx + 0.8, TOWER.rz + 0.8, y0, y1, 256, true), facadeMat);
		root.add(band);
		for (const [ya, yb] of [
			[y0 - 1.2, y0 - 0.85],
			[y1 + 0.85, y1 + 1.2],
		]) {
			root.add(
				new THREE.Mesh(
					ellipseCylinderStrip(TOWER.rx + 0.9, TOWER.rz + 0.9, ya, yb),
					track(makeNeonStripMaterial({colorA: COLORS.neon, colorB: '#ffffff', base: 3.5, peak: 6, segments: 2, speed: -0.1})),
				),
			);
		}
	}
	// цветной свет от медиафасада на крышу и соседей
	const facadeLights: THREE.PointLight[] = [];
	for (let i = 0; i < 6; i++) {
		const a = (i / 6) * Math.PI * 2;
		const l = new THREE.PointLight(i % 2 ? COLORS.neon : '#BFF7FF', 0, 220, 2);
		l.position.set(Math.sin(a) * (TOWER.rx + 34), TOWER.bandCenter - 4, Math.cos(a) * (TOWER.rz + 34));
		root.add(l);
		facadeLights.push(l);
	}
	const crownLight = new THREE.PointLight(COLORS.neon, 1500, 120, 2);
	crownLight.position.set(0, H + 20, 0);
	root.add(crownLight);
	root.add(new THREE.HemisphereLight('#1a2a55', '#000000', 0.05));

	// ---------- соседние башни ----------
	const neighborGlass = (seed: number) =>
		addWorldWindows(
			new THREE.MeshPhysicalMaterial({
				color: '#ffffff',
				roughness: 0.07,
				metalness: 0.0,
				clearcoat: 0.8,
				clearcoatRoughness: 0.05,
				envMapIntensity: 1.4,
				emissive: '#000000',
			}),
			{win: makeWindowTile(seed, 0.05), cell: new THREE.Vector2(2.2, 3.6), gain: 0.85, glass: makeGlassTile(seed + 1), glassGain: 1.6, minY: 6},
		);
	// башня 2: прямоугольная со скосом
	const t2 = new THREE.Group();
	t2.position.set(-84, 0, -58);
	t2.rotation.y = 0.42;
	{
		const w = 30;
		const d = 26;
		const hLow = 188;
		const hHigh = 226;
		const g = new THREE.BoxGeometry(w, hHigh, d);
		g.translate(0, hHigh / 2, 0);
		const p = g.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < p.count; i++) {
			if (p.getY(i) > hHigh - 0.01) {
				const k = (p.getX(i) + w / 2) / w; // 0 слева → 1 справа
				p.setY(i, hLow + (hHigh - hLow) * k);
			}
		}
		g.computeVertexNormals();
		t2.add(new THREE.Mesh(g, neighborGlass(31)));
		for (let k = 0, yy = 22; yy < hLow - 6; yy += 21, k++) {
			t2.add(
				new THREE.Mesh(
					stripGeometry(rectPoints(w, d, yy), 0.7, 0.15),
					track(
						makeNeonStripMaterial({
							colorA: k % 2 ? COLORS.violet : COLORS.neon,
							base: 2.4,
							peak: 7,
							segments: 1,
							speed: 0.22,
							phase: k * 0.13,
						}),
					),
				),
			);
		}
		// неоновая кромка скошенной крыши
		const rim = [
			new THREE.Vector3(-w / 2, hLow - 0.8, d / 2),
			new THREE.Vector3(w / 2, hHigh - 0.8, d / 2),
			new THREE.Vector3(w / 2, hHigh - 0.8, -d / 2),
			new THREE.Vector3(-w / 2, hLow - 0.8, -d / 2),
		];
		t2.add(
			new THREE.Mesh(
				stripGeometry(rim, 0.6, 0.15),
				track(makeNeonStripMaterial({colorA: COLORS.violet, colorB: '#ffffff', base: 3.2, peak: 6, segments: 1, speed: 0.3})),
			),
		);
	}
	root.add(t2);

	// башня 3: ступенчатая
	const t3 = new THREE.Group();
	t3.position.set(80, 0, -70);
	t3.rotation.y = -0.3;
	{
		const tiers = [
			{w: 36, h0: 0, h1: 136},
			{w: 28, h0: 136, h1: 178},
			{w: 20, h0: 178, h1: 204},
		];
		const mat = neighborGlass(53);
		tiers.forEach((t, i) => {
			const g = new THREE.BoxGeometry(t.w, t.h1 - t.h0, t.w);
			g.translate(0, (t.h0 + t.h1) / 2, 0);
			t3.add(new THREE.Mesh(g, mat));
			t3.add(
				new THREE.Mesh(
					stripGeometry(rectPoints(t.w, t.w, t.h1 - 1.2), 0.8, 0.15),
					track(makeNeonStripMaterial({colorA: COLORS.neon, colorB: '#ffffff', base: 3.4, peak: 6, segments: 2, speed: 0.25, phase: i * 0.3})),
				),
			);
		});
		for (let k = 0, yy = 18; yy < 130; yy += 16, k++) {
			t3.add(
				new THREE.Mesh(
					stripGeometry(rectPoints(36, 36, yy), 0.55, 0.15),
					track(
						makeNeonStripMaterial({
							colorA: k % 2 ? COLORS.neon : COLORS.violet,
							base: 2.0,
							peak: 7,
							segments: 1,
							speed: -0.2,
							phase: k * 0.17,
						}),
					),
				),
			);
		}
		const mast = new THREE.Mesh(
			new THREE.CylinderGeometry(0.2, 0.6, 24, 8),
			new THREE.MeshStandardMaterial({color: '#0a0d14', roughness: 0.4, metalness: 0.8}),
		);
		mast.position.y = 216;
		t3.add(mast);
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute([0, 228.5, 0, 0, 205, 10, 0, 190, -15], 3));
		g.setAttribute('color', new THREE.Float32BufferAttribute([1, 0.1, 0.05, 1, 0.1, 0.05, 1, 0.1, 0.05], 3));
		g.setAttribute('aData', new THREE.Float32BufferAttribute([0.6, 0, 0, 0, 0.1, 0, 0, 0, 0.85, 0, 0, 0], 4));
		const pm = makePointsMaterial({size: 3, min: 2, max: 12, gain: 3.5, blink: true});
		pointMats.push(pm);
		t3.add(new THREE.Points(g, pm));
	}
	root.add(t3);

	// тонкое отражение медиафасада на стекле соседней башни
	const reflMat = new THREE.MeshBasicMaterial({
		map: marqueeTex,
		transparent: true,
		opacity: 0.1,
		blending: THREE.AdditiveBlending,
		depthWrite: false,
	});
	{
		const plane = new THREE.Mesh(new THREE.PlaneGeometry(30, bandH * 1.2), reflMat);
		plane.position.set(15.2, TOWER.bandCenter - 4, 0);
		plane.rotation.y = Math.PI / 2;
		plane.scale.x = -1;
		t2.add(plane);
		const plane3 = new THREE.Mesh(new THREE.PlaneGeometry(36, bandH * 1.2), reflMat);
		plane3.position.set(-18.2, TOWER.bandCenter - 8, 0);
		plane3.rotation.y = -Math.PI / 2;
		plane3.scale.x = -1;
		t3.add(plane3);
	}

	root.traverse((o) => {
		if ((o as THREE.Mesh).isMesh) o.matrixAutoUpdate = true;
	});

	const update: World['update'] = (f, camera, viewportH) => {
		painter.draw(f.marquee);
		marqueeTex.needsUpdate = true;
		facadeMat.uniforms.uScroll.value = f.scroll;
		facadeMat.uniforms.uGlitch.value = f.glitch;
		facadeMat.uniforms.uSeed.value = f.glitchSeed;
		facadeMat.uniforms.uGain.value = 2.2 * f.facadeGain;
		facadeMat.uniforms.uFlash.value = f.facadeFlash;
		reflMat.map!.offset.x = f.scroll;
		const lit = f.marquee.letterLevel.reduce((a, b) => a + Math.min(b, 1.5), 0) / f.marquee.letterLevel.length;
		for (const l of facadeLights) l.intensity = 2600 * (0.25 + lit) * f.facadeGain;
		for (const a of animated) a.mat.uniforms.uTime.value = f.time;
		const scale = viewportH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
		for (const m of pointMats) {
			m.uniforms.uTime.value = f.time;
			m.uniforms.uScale.value = scale;
		}
		(water.material as THREE.ShaderMaterial).uniforms.uTime.value = f.time;
		sky.position.copy(camera.position);
	};

	return {
		scene: root,
		sky,
		bandMeters: {y0, y1, circumference},
		update,
		dispose: () => {
			root.traverse((o) => {
				const m = o as THREE.Mesh;
				m.geometry?.dispose();
			});
		},
	};
};

const WATER_SHADER = {
	name: 'NightWater',
	uniforms: {
		color: {value: null},
		tDiffuse: {value: null},
		textureMatrix: {value: null},
		uTime: {value: 0},
	},
	vertexShader: /* glsl */ `
		uniform mat4 textureMatrix;
		varying vec4 vUv; varying vec3 vWP;
		void main(){
			vUv = textureMatrix * vec4(position, 1.0);
			vec4 wp = modelMatrix * vec4(position, 1.0);
			vWP = wp.xyz;
			gl_Position = projectionMatrix * viewMatrix * wp;
		}`,
	fragmentShader: /* glsl */ `
		uniform vec3 color; uniform sampler2D tDiffuse; uniform float uTime;
		varying vec4 vUv; varying vec3 vWP;
		void main(){
			vec2 p = vWP.xz;
			float n = sin(p.x * 0.07 + uTime * 0.7) * sin(p.y * 0.13 - uTime * 0.5)
				+ 0.6 * sin(p.x * 0.31 + p.y * 0.27 + uTime * 1.3)
				+ 0.3 * sin(p.x * 0.9 - p.y * 0.7 - uTime * 2.1);
			vec4 c = vUv;
			c.x += n * 0.35;
			c.y += n * 0.15;
			vec3 r = vec3(0.0);
			for (int i = -3; i <= 3; i++) {
				vec4 cc = c; cc.y += float(i) * 0.5;
				r += texture2DProj(tDiffuse, cc).rgb;
			}
			r /= 7.0;
			float d = length(vWP - cameraPosition);
			float fog = exp(-pow(d * ${FOG_DENSITY}, 2.0));
			gl_FragColor = vec4((r * 0.6 + vec3(0.0015, 0.003, 0.008)) * fog, 1.0);
		}`,
};

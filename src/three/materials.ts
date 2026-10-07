import * as THREE from 'three';

// Все анимированные материалы получают время uTime (в секундах),
// которое вычисляется из useCurrentFrame() — никакого useFrame.

const FOG_FN = /* glsl */ `
uniform float uFog;
float fogFactor(vec3 wp){ float d = length(wp - cameraPosition); return exp(-pow(d * uFog, 2.0)); }
`;

export const FOG_DENSITY = 0.00042;

/** Неоновая полоса вдоль замкнутого контура с бегущими огнями. aS — 0..1 по периметру. */
export const makeNeonStripMaterial = (opts: {
	colorA: THREE.ColorRepresentation;
	colorB?: THREE.ColorRepresentation;
	base?: number;
	peak?: number;
	segments?: number;
	speed?: number;
	phase?: number;
}) =>
	new THREE.ShaderMaterial({
		uniforms: {
			uTime: {value: 0},
			uColorA: {value: new THREE.Color(opts.colorA)},
			uColorB: {value: new THREE.Color(opts.colorB ?? '#ffffff')},
			uBase: {value: opts.base ?? 2.2},
			uPeak: {value: opts.peak ?? 6},
			uSegments: {value: opts.segments ?? 3},
			uSpeed: {value: opts.speed ?? 0.12},
			uPhase: {value: opts.phase ?? 0},
			uGain: {value: 1},
			uFog: {value: FOG_DENSITY},
		},
		vertexShader: /* glsl */ `
			attribute float aS;
			varying float vS; varying vec2 vUv; varying vec3 vWP;
			void main(){
				vS = aS; vUv = uv;
				vec4 wp = modelMatrix * vec4(position, 1.0);
				vWP = wp.xyz;
				gl_Position = projectionMatrix * viewMatrix * wp;
			}`,
		fragmentShader: /* glsl */ `
			uniform float uTime, uBase, uPeak, uSegments, uSpeed, uPhase, uGain;
			uniform vec3 uColorA, uColorB;
			varying float vS; varying vec2 vUv; varying vec3 vWP;
			${FOG_FN}
			void main(){
				float s = fract(vS * uSegments - uTime * uSpeed + uPhase);
				float head = smoothstep(0.80, 0.985, s) * (1.0 - smoothstep(0.985, 1.0, s));
				float edge = 1.0 - pow(abs(vUv.y * 2.0 - 1.0), 6.0);
				vec3 col = mix(uColorA, uColorB, head * 0.7);
				float I = (uBase + uPeak * head) * uGain;
				gl_FragColor = vec4(col * I * edge * fogFactor(vWP), 1.0);
			}`,
		side: THREE.DoubleSide,
	});

/** Вертикальные неоновые линии по фасаду главной башни с редкими импульсами снизу вверх. */
export const makeTowerLinesMaterial = (lines: number, circumference: number, height: number) =>
	new THREE.ShaderMaterial({
		uniforms: {
			uTime: {value: 0},
			uN: {value: lines},
			uCirc: {value: circumference},
			uH: {value: height},
			uWidth: {value: 0.17},
			uTeal: {value: new THREE.Color('#3FF2E0')},
			uBlue: {value: new THREE.Color('#3A7BFF')},
			uGain: {value: 1},
			uFog: {value: FOG_DENSITY},
		},
		vertexShader: /* glsl */ `
			varying vec2 vUv; varying vec3 vWP;
			void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); vWP = wp.xyz;
				gl_Position = projectionMatrix * viewMatrix * wp; }`,
		fragmentShader: /* glsl */ `
			uniform float uTime, uN, uCirc, uH, uWidth, uGain; uniform vec3 uTeal, uBlue;
			varying vec2 vUv; varying vec3 vWP;
			${FOG_FN}
			float h1(float n){ return fract(sin(n * 127.1) * 43758.5453); }
			void main(){
				float x = vUv.x * uN;
				float id = floor(x);
				float f = fract(x) - 0.5;
				float mPer = uCirc / uN;
				float dm = abs(f) * mPer;
				float fw = fwidth(x) * mPer;
				float w = max(uWidth, fw * 1.2);
				float a = (1.0 - smoothstep(w * 0.5 - fw * 0.5, w * 0.5 + fw * 0.5, dm)) * (uWidth / w);
				if (a < 0.002) discard;
				vec3 col = mod(id, 2.0) < 0.5 ? uTeal : uBlue;
				float period = 3.2 + 3.0 * h1(id + 7.0);
				float tt = uTime + h1(id + 1.0) * period;
				float cyc = floor(tt / period);
				float local = fract(tt / period);
				float isOn = step(0.55, h1(id * 13.0 + cyc * 3.1));
				float yp = local * (uH + 80.0) - 40.0;
				float dy = vWP.y - yp;
				float pulse = isOn * (dy < 0.0 ? exp(dy / 16.0) : exp(-dy * dy / 3.0));
				float I = (1.05 + 10.0 * pulse) * uGain;
				gl_FragColor = vec4(mix(col, vec3(1.0), pulse * 0.55) * I * a * fogFactor(vWP), 1.0);
			}`,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	});

/** Медиафасад: текстура надписи + прокрутка, светодиодная сетка, глитч, вспышка. */
export const makeMediaFacadeMaterial = (map: THREE.Texture, grid: THREE.Vector2) =>
	new THREE.ShaderMaterial({
		uniforms: {
			uMap: {value: map},
			uGrid: {value: grid},
			uScroll: {value: 0},
			uGlitch: {value: 0},
			uSeed: {value: 0},
			uGain: {value: 1.9},
			uFlash: {value: 0},
			uFog: {value: FOG_DENSITY},
		},
		vertexShader: /* glsl */ `
			varying vec2 vUv; varying vec3 vWP; varying vec3 vWN;
			void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); vWP = wp.xyz;
				vWN = normalize(mat3(modelMatrix) * normal);
				gl_Position = projectionMatrix * viewMatrix * wp; }`,
		fragmentShader: /* glsl */ `
			uniform sampler2D uMap; uniform vec2 uGrid;
			uniform float uScroll, uGlitch, uSeed, uGain, uFlash;
			varying vec2 vUv; varying vec3 vWP; varying vec3 vWN;
			${FOG_FN}
			float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
			void main(){
				vec2 uv = vec2(vUv.x + uScroll, vUv.y);
				vec2 duvx = dFdx(uv), duvy = dFdy(uv);
				// глитч: горизонтальные полосы со сдвигом
				if (uGlitch > 0.0) {
					float sl = floor(uv.y * 9.0 + h2(vec2(uSeed, 1.7)) * 4.0);
					float r = h2(vec2(sl, uSeed));
					uv.x += (r - 0.5) * 0.05 * uGlitch * step(0.3, r);
				}
				vec2 g = uv * uGrid;
				vec2 fw = vec2(length(vec2(dFdx(g.x), dFdy(g.x))), length(vec2(dFdx(g.y), dFdy(g.y))));
				float cellPx = 1.0 / max(max(fw.x, fw.y), 1e-5);
				float near = smoothstep(2.6, 5.0, cellPx);
				// чёткие края букв: цвет берём по точным uv, сетка светодиодов только модулирует яркость
				vec2 uvS = uv;
				float sh = 0.0035 * uGlitch;
				vec3 c;
				c.r = textureGrad(uMap, uvS + vec2(sh, 0.0), duvx, duvy).r;
				c.g = textureGrad(uMap, uvS, duvx, duvy).g;
				c.b = textureGrad(uMap, uvS - vec2(sh, 0.0), duvx, duvy).b;
				vec2 f = fract(g) - 0.5;
				vec2 q = abs(f);
				float led = (1.0 - smoothstep(0.37, 0.48, q.x)) * (1.0 - smoothstep(0.37, 0.48, q.y));
				float mask = mix(1.0, led * 1.25, near * 0.85);
				float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
				vec3 viewDir = normalize(cameraPosition - vWP);
				float ndv = clamp(dot(normalize(vWN), viewDir), 0.0, 1.0);
				float angular = mix(0.45, 1.0, ndv);
				vec3 hdr = c * uGain * (0.55 + 1.45 * lum * lum) * angular;
				gl_FragColor = vec4((hdr * mask + vec3(uFlash)) * fogFactor(vWP), 1.0);
			}`,
	});

/** Точки: фонари, машины, звёзды, авиаогни. Размер в пикселях с перспективой. */
export const makePointsMaterial = (opts: {
	size: number;
	min: number;
	max: number;
	gain: number;
	moving?: boolean;
	blink?: boolean;
	fog?: boolean;
	range?: number;
}) =>
	new THREE.ShaderMaterial({
		uniforms: {
			uTime: {value: 0},
			uSize: {value: opts.size},
			uMin: {value: opts.min},
			uMax: {value: opts.max},
			uGain: {value: opts.gain},
			uScale: {value: 1000},
			uRange: {value: opts.range ?? 1000},
			uFog: {value: opts.fog === false ? 0 : FOG_DENSITY},
		},
		defines: {
			MOVING: opts.moving ? 1 : 0,
			BLINK: opts.blink ? 1 : 0,
		},
		vertexShader: /* glsl */ `
			attribute vec3 color;
			attribute vec4 aData;
			uniform float uTime, uSize, uMin, uMax, uScale, uRange, uFog;
			varying vec3 vCol; varying float vFade;
			void main(){
				vec3 p = position;
				#if MOVING
					float s = mod(aData.z + aData.w * uTime + uRange, 2.0 * uRange) - uRange;
					p = aData.x < 0.5 ? vec3(s, position.y, aData.y) : vec3(aData.y, position.y, s);
				#endif
				vec4 mv = modelViewMatrix * vec4(p, 1.0);
				gl_Position = projectionMatrix * mv;
				float d = -mv.z;
				float px = uSize * uScale / max(d, 1.0);
				gl_PointSize = clamp(px, uMin, uMax);
				float energy = clamp(px / max(gl_PointSize, 1e-3), 0.0, 1.0);
				vFade = exp(-pow(d * uFog, 2.0)) * mix(0.35, 1.0, energy);
				#if BLINK
					float ph = fract(uTime * 0.7 + aData.x);
					vFade *= 0.05 + 0.95 * (1.0 - smoothstep(0.0, 0.35, ph));
				#endif
				vCol = color;
			}`,
		fragmentShader: /* glsl */ `
			uniform float uGain;
			varying vec3 vCol; varying float vFade;
			void main(){
				vec2 c = gl_PointCoord - 0.5;
				float r = length(c) * 2.0;
				float a = exp(-r * r * 3.5) * (1.0 - smoothstep(0.8, 1.0, r));
				gl_FragColor = vec4(vCol * a * uGain * vFade, 1.0);
			}`,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	});

/** Небо: почти чёрный зенит, глубокий синий у горизонта, слабая засветка города. */
export const SKY_FRAGMENT = /* glsl */ `
	varying vec3 vDir;
	uniform float uEnv;
	void main(){
		vec3 d = normalize(vDir);
		float h = d.y;
		vec3 zenith = vec3(0.0004, 0.0006, 0.0025);
		vec3 horizon = vec3(0.006, 0.014, 0.045);
		vec3 col = mix(horizon, zenith, smoothstep(-0.02, 0.38, h));
		col += vec3(0.010, 0.012, 0.022) * exp(-abs(h) * 22.0);
		col = mix(col, horizon, smoothstep(0.0, -0.02, h));
		// для карты окружения: редкие неоновые и тёплые «огни города» у горизонта
		if (uEnv > 0.5) {
			float az = atan(d.z, d.x);
			float band = exp(-pow((h - 0.03) / 0.05, 2.0));
			float bars = pow(max(0.0, sin(az * 9.0) * sin(az * 23.0 + 1.0)), 18.0);
			col += band * bars * vec3(0.1, 0.9, 0.85) * 0.6;
			float bars2 = pow(max(0.0, sin(az * 13.0 + 2.0) * sin(az * 5.0)), 22.0);
			col += band * bars2 * vec3(0.5, 0.25, 1.0) * 0.5;
			col += exp(-pow((h + 0.02) / 0.04, 2.0)) * vec3(0.06, 0.035, 0.015);
		}
		gl_FragColor = vec4(col, 1.0);
	}`;

export const makeSkyMaterial = (env: boolean) =>
	new THREE.ShaderMaterial({
		uniforms: {uEnv: {value: env ? 1 : 0}},
		vertexShader: /* glsl */ `
			varying vec3 vDir;
			void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
		fragmentShader: SKY_FRAGMENT,
		side: THREE.BackSide,
		depthWrite: false,
		fog: false,
	});

/**
 * Окна в мировых координатах для любых вертикальных граней (в т.ч. InstancedMesh):
 * плотность окон не зависит от размеров здания.
 */
let windowsKey = 0;
export const addWorldWindows = (
	mat: THREE.MeshStandardMaterial,
	opts: {win: THREE.Texture; cell: THREE.Vector2; gain: number; glass?: THREE.Texture; glassGain?: number; minY?: number},
) => {
	mat.onBeforeCompile = (sh) => {
		sh.uniforms.uWin = {value: opts.win};
		sh.uniforms.uCell = {value: opts.cell};
		sh.uniforms.uWinGain = {value: opts.gain};
		sh.uniforms.uGlass = {value: opts.glass ?? opts.win};
		sh.uniforms.uGlassGain = {value: opts.glass ? (opts.glassGain ?? 1) : 0};
		sh.uniforms.uMinY = {value: opts.minY ?? 3};
		sh.vertexShader = sh.vertexShader
			.replace('#include <common>', '#include <common>\nvarying vec3 vWP2; varying vec3 vWN2;')
			.replace(
				'#include <project_vertex>',
				`#include <project_vertex>
				vec4 wp2 = vec4(transformed, 1.0);
				vec3 wn2 = objectNormal;
				#ifdef USE_INSTANCING
					wp2 = instanceMatrix * wp2;
					wn2 = mat3(instanceMatrix) * wn2;
				#endif
				vWP2 = (modelMatrix * wp2).xyz;
				vWN2 = normalize(mat3(modelMatrix) * wn2);`,
			);
		sh.fragmentShader = sh.fragmentShader
			.replace(
				'#include <common>',
				`#include <common>
				varying vec3 vWP2; varying vec3 vWN2;
				uniform sampler2D uWin; uniform sampler2D uGlass; uniform vec2 uCell;
				uniform float uWinGain; uniform float uGlassGain; uniform float uMinY;
				vec2 wallUv(){
					vec2 t = normalize(vWN2.xz + 1e-5);
					vec2 tg = vec2(-t.y, t.x);
					float faceId = floor(dot(vWP2.xz, t) * 0.37);
					vec2 off = vec2(fract(sin(faceId * 91.7) * 4375.5), fract(sin(faceId * 37.3) * 2375.1)) * 64.0;
					return vec2(dot(vWP2.xz, tg), vWP2.y) / uCell + floor(off);
				}`,
			)
			.replace(
				'#include <map_fragment>',
				`#include <map_fragment>
				if (uGlassGain > 0.0 && abs(vWN2.y) < 0.5) {
					diffuseColor.rgb *= texture2D(uGlass, wallUv() / 8.0).rgb * uGlassGain;
				}`,
			)
			.replace(
				'#include <emissivemap_fragment>',
				`#include <emissivemap_fragment>
				{
					float side = 1.0 - step(0.5, abs(vWN2.y));
					float above = step(uMinY, vWP2.y);
					totalEmissiveRadiance += texture2D(uWin, wallUv() / 64.0).rgb * side * above * uWinGain;
				}`,
			);
	};
	const key = `worldWindows-${windowsKey++}`;
	mat.customProgramCacheKey = () => key;
	return mat;
};

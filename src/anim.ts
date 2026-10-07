import {Easing, interpolate, spring} from 'remotion';
import {FPS, beatToFrame} from './config';

/** Кадр доли `b` внутри сцены, начинающейся с доли `from` (без накопления сдвига). */
export const lbf = (from: number, b: number) => beatToFrame(from + b) - beatToFrame(from);

/** Жёсткая пружина без «киселя». */
export const snap = (frame: number, start: number, opts: {stiffness?: number; damping?: number; mass?: number} = {}) =>
	spring({
		frame: frame - start,
		fps: FPS,
		config: {stiffness: opts.stiffness ?? 420, damping: opts.damping ?? 22, mass: opts.mass ?? 0.7},
	});

export const ease = {
	outExpo: Easing.bezier(0.16, 1, 0.3, 1),
	inExpo: Easing.bezier(0.7, 0, 0.84, 0),
	inOutExpo: Easing.bezier(0.87, 0, 0.13, 1),
	outBack: Easing.bezier(0.34, 1.56, 0.64, 1),
	outCubic: Easing.out(Easing.cubic),
	inCubic: Easing.in(Easing.cubic),
	inOutCubic: Easing.inOut(Easing.cubic),
};

export const tween = (
	frame: number,
	range: [number, number],
	out: [number, number],
	easing: (t: number) => number = ease.outExpo,
) => interpolate(frame, range, out, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

/** Затухающая тряска после каждого удара из списка кадров. */
export const shakeAt = (frame: number, hits: number[], amp = 18, decayFrames = 9) => {
	let x = 0;
	let y = 0;
	let r = 0;
	for (const h of hits) {
		const t = frame - h;
		if (t < 0 || t > decayFrames * 2.5) continue;
		const k = Math.exp(-t / decayFrames) * amp;
		x += Math.sin(t * 2.9 + h) * k;
		y += Math.cos(t * 3.7 + h * 0.5) * k * 0.8;
		r += Math.sin(t * 2.1 + h * 1.3) * k * 0.05;
	}
	return {x, y, r, transform: `translate(${x}px, ${y}px) rotate(${r}deg)`};
};

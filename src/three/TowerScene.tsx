import {ThreeCanvas} from '@remotion/three';
import {useFrame, useThree} from '@react-three/fiber';
import {
	BlendFunction,
	BloomEffect,
	ChromaticAberrationEffect,
	EffectComposer,
	EffectPass,
	RenderPass,
	SMAAEffect,
	SMAAPreset,
	ToneMappingEffect,
	ToneMappingMode,
	VignetteEffect,
} from 'postprocessing';
import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {fontsReady} from '../fonts';
import {FOG_DENSITY, makeSkyMaterial} from './materials';
import {MarqueeLayout, MarqueePainter, computeMarqueeLayout} from './marquee';
import {CameraPose} from './timeline';
import {WorldFrame, buildWorld} from './world';

export type TowerDirector = {
	camera: (frame: number) => CameraPose;
	facade: (frame: number, layout: MarqueeLayout) => WorldFrame;
};

const shake = (frame: number, amount: number) => {
	if (amount <= 0) return new THREE.Vector3();
	// плавный толчок низкой частоты, без мелкой дрожи
	return new THREE.Vector3(Math.sin(frame * 1.1 + 0.5) * 0.5, Math.sin(frame * 1.1), 0).multiplyScalar(amount);
};

const World: React.FC<{
	director: TowerDirector;
	layout: MarqueeLayout;
	shakeAt?: (f: number) => number;
	noFx?: boolean;
}> = ({director, layout, shakeAt, noFx}) => {
	const frame = useCurrentFrame();
	const {gl, scene, camera, size} = useThree();
	const painter = useMemo(() => new MarqueePainter(layout), [layout]);
	const world = useMemo(() => buildWorld(layout, painter), [layout, painter]);

	useMemo(() => {
		const pmrem = new THREE.PMREMGenerator(gl);
		const envScene = new THREE.Scene();
		envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 64, 32), makeSkyMaterial(true)));
		scene.environment = pmrem.fromScene(envScene, 0.015).texture;
		scene.environmentIntensity = 1;
		scene.fog = new THREE.FogExp2(new THREE.Color().setRGB(0.006, 0.014, 0.045), FOG_DENSITY);
		pmrem.dispose();
	}, [gl, scene]);

	useEffect(() => () => world.dispose(), [world]);

	// Постобработка: MSAA 8x (сколько позволит GPU) + SMAA, bloom с высоким порогом,
	// хроматическая аберрация только по краям, виньетка, тональная компрессия AgX.
	const composer = useMemo(() => {
		gl.debug.checkShaderErrors = true;
		if (noFx) return null;
		const c = new EffectComposer(gl, {multisampling: Math.min(8, gl.capabilities.maxSamples), frameBufferType: THREE.HalfFloatType});
		c.addPass(new RenderPass(scene, camera));
		const bloom = new BloomEffect({
			mipmapBlur: true,
			intensity: 1.25,
			luminanceThreshold: 1.05,
			luminanceSmoothing: 0.25,
			radius: 0.72,
			levels: 8,
		});
		const ca = new ChromaticAberrationEffect({
			offset: new THREE.Vector2(0.0011, 0.0011),
			radialModulation: true,
			modulationOffset: 0.45,
		});
		const vignette = new VignetteEffect({offset: 0.28, darkness: 0.72});
		const tone = new ToneMappingEffect({mode: ToneMappingMode.NEUTRAL});
		c.addPass(new EffectPass(camera, bloom, vignette, tone));
		c.addPass(new EffectPass(camera, new SMAAEffect({preset: SMAAPreset.ULTRA})));
		c.addPass(new EffectPass(camera, ca));
		c.setSize(size.width, size.height);
		return c;
	}, [gl, scene, camera, size.width, size.height, noFx]);
	useEffect(() => () => composer?.dispose(), [composer]);

	const draw = () => {
		if (composer) composer.render();
		else gl.render(scene, camera);
	};
	// priority 1: R3F не рисует сам, кадр выводит только наш компоновщик
	useFrame(draw, 1);

	// Всё состояние сцены — из useCurrentFrame(), до того как ThreeCanvas вызовет render.
	useLayoutEffect(() => {
		const cam = camera as THREE.PerspectiveCamera;
		const pose = director.camera(frame);
		const sh = shake(frame, shakeAt ? shakeAt(frame) : 0);
		cam.position.copy(pose.pos).add(sh);
		cam.fov = pose.fov;
		cam.near = 0.5;
		cam.far = 20000;
		cam.up.set(0, 1, 0);
		cam.lookAt(pose.target.clone().add(sh.multiplyScalar(0.5)));
		if (pose.roll) cam.rotateZ(pose.roll);
		cam.updateProjectionMatrix();
		cam.updateMatrixWorld();
		world.update(director.facade(frame, layout), cam, size.height);
		draw();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [frame, camera, director, layout, world, size.height, shakeAt, composer]);

	return <primitive object={world.scene} />;
};

export const TowerScene: React.FC<{director: TowerDirector; shakeAt?: (f: number) => number; noFx?: boolean}> = ({
	director,
	shakeAt,
	noFx,
}) => {
	const {width, height} = useVideoConfig();
	const {delayRender, continueRender} = useDelayRender();
	const [layout, setLayout] = useState<MarqueeLayout | null>(null);
	const [handle] = useState(() => delayRender('Шрифты для медиафасада'));

	useEffect(() => {
		fontsReady.then(() => {
			setLayout(computeMarqueeLayout());
			continueRender(handle);
		});
	}, [continueRender, handle]);

	return (
		<div style={{position: 'absolute', inset: 0, background: '#000'}}>
			{layout ? (
				<ThreeCanvas
					width={width}
					height={height}
					flat
					dpr={1}
					gl={{preserveDrawingBuffer: true, antialias: false, stencil: false, depth: true, powerPreference: 'high-performance'}}
					camera={{fov: 50, near: 0.5, far: 20000, position: [0, 200, 600]}}
				>
					<World director={director} layout={layout} shakeAt={shakeAt} noFx={noFx} />
				</ThreeCanvas>
			) : null}
		</div>
	);
};

import React from 'react';
import {Composition} from 'remotion';
import {DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH} from './config';
import {Promo} from './Promo';
import {TextCheck} from './TextCheck';
import {TowerPreview} from './scenes/TowerPreview';

export const RemotionRoot: React.FC = () => (
	<>
		<Composition
			id="Promo"
			component={Promo}
			durationInFrames={DURATION_IN_FRAMES}
			fps={FPS}
			width={WIDTH}
			height={HEIGHT}
			defaultProps={{withAudio: true}}
		/>
		<Composition id="TextCheck" component={TextCheck} durationInFrames={1} fps={FPS} width={WIDTH} height={HEIGHT} />
		<Composition
			id="TowerPreview"
			component={TowerPreview}
			durationInFrames={150}
			fps={FPS}
			width={WIDTH}
			height={HEIGHT}
			defaultProps={{shot: 'wide' as const}}
		/>
	</>
);

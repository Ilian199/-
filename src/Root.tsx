import React from 'react';
import {Composition} from 'remotion';
import {DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH} from './config';
import {Promo} from './Promo';
import {TextCheck} from './TextCheck';
import {TowerPreview} from './scenes/TowerPreview';
import {DURATION2} from './v2/config';
import {Promo2} from './v2/Promo2';

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
		<Composition
			id="Promo2"
			component={Promo2}
			durationInFrames={DURATION2}
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

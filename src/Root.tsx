import React from 'react';
import {Composition} from 'remotion';
import {FPS, HEIGHT, WIDTH} from './config';
import {TowerPreview} from './scenes/TowerPreview';

export const RemotionRoot: React.FC = () => (
	<>
		<Composition
			id="TowerPreview"
			component={TowerPreview}
			durationInFrames={120}
			fps={FPS}
			width={WIDTH}
			height={HEIGHT}
			defaultProps={{shot: 'wide' as const}}
		/>
	</>
);

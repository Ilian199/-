import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('png');
Config.setChromiumOpenGlRenderer('swangle');
Config.setCodec('h264');
Config.setCrf(14);
Config.setPixelFormat('yuv420p');
Config.setAudioCodec('aac');
Config.setConcurrency(2);
Config.setDelayRenderTimeoutInMilliseconds(120000);

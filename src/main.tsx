import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import './index.css';
import './pupperpark.css';
import { initPupperPark, PupperParkHandle } from './pupperpark.ts';
import { startSplashScreen } from './splash.ts';

let appHandle: PupperParkHandle | null = null;

const splash = startSplashScreen({
  onFadeStart: () => appHandle?.syncRootBackground(),
  onHidden: () => appHandle?.syncRootBackground()
});

try {
  appHandle = initPupperPark({
    onFirstFrameRendered: () => splash.markFirstFrameRendered()
  });
  splash.markInitComplete();
} catch (err) {
  splash.dismissNow();
  throw err;
}

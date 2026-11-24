import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import './index.css';
import './pupperpark.css';
import { initPupperPark } from './pupperpark.ts';
import { startSplashScreen } from './splash.ts';

const splash = startSplashScreen();
try {
  initPupperPark({
    onFirstFrameRendered: () => splash.markFirstFrameRendered()
  });
  splash.markInitComplete();
} catch (err) {
  splash.dismissNow();
  throw err;
}

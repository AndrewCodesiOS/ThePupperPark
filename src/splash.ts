// Fail-safe, polished launch splash screen controller for Pupper Park.
// Coordinates real startup readiness (game init, first rendered canvas frame,
// fonts, and emblem image) with a brief, comfortable display window so players
// can appreciate the splash without ever blocking or getting stuck.

const MIN_SPLASH_VISIBLE_MS = 1350;
const FINAL_BEAT_MS = 260;
const ASSET_READY_TIMEOUT_MS = 1000;
const MAX_SPLASH_LIFETIME_MS = 3500;
const SPLASH_FADE_DURATION_MS = 380;

export interface SplashOptions {
  onFadeStart?: () => void;
  onHidden?: () => void;
}

export interface SplashController {
  markInitComplete: () => void;
  markFirstFrameRendered: () => void;
  dismissNow: () => void;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timerId);
      resolve();
    };
    const timerId = window.setTimeout(done, timeoutMs);
    promise.then(done, done);
  });
}

function waitForSplashImage(img: HTMLImageElement | null, fallbackEl: HTMLElement | null): Promise<void> {
  if (!img) return Promise.resolve();

  const showFallback = () => {
    img.style.display = 'none';
    if (fallbackEl) {
      fallbackEl.style.display = 'flex';
    }
  };

  if (img.complete) {
    if (img.naturalWidth === 0) {
      showFallback();
    }
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let done = false;
    const finish = (failed: boolean) => {
      if (done) return;
      done = true;
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
      if (failed) {
        showFallback();
      }
      resolve();
    };
    const onLoad = () => finish(img.naturalWidth === 0);
    const onError = () => finish(true);

    img.addEventListener('load', onLoad, { once: true });
    img.addEventListener('error', onError, { once: true });
  });
}

function waitForFonts(): Promise<void> {
  const fontSet = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fontSet || !fontSet.ready) {
    return Promise.resolve();
  }
  return fontSet.ready.then(() => undefined, () => undefined);
}

export function startSplashScreen(options: SplashOptions = {}): SplashController {
  const splashEl = document.getElementById('splashScreen');
  const progressBarEl = document.getElementById('splashProgressFill');
  const statusEl = document.getElementById('splashStatusText');
  const iconImgEl = document.getElementById('splashIconImg') as HTMLImageElement | null;
  const fallbackEl = document.getElementById('splashEmblemFallback');

  if (!splashEl) {
    return {
      markInitComplete() {},
      markFirstFrameRendered() {},
      dismissNow() {}
    };
  }

  const getNow = () =>
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

  const startedAt = getNow();

  const prefersReducedMotion = Boolean(
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  let dismissed = false;
  let currentProgress = 0.22;
  let assetsReady = false;
  let initDone = false;
  let firstFrameDone = false;
  let finalBeatTimer: number | null = null;
  let dismissDelayTimer: number | null = null;
  let fadeCleanupTimer: number | null = null;

  const setProgress = (fraction: number, label?: string) => {
    const clamped = Math.max(currentProgress, Math.min(1, fraction));
    currentProgress = clamped;
    if (progressBarEl) {
      progressBarEl.style.transform = `scaleX(${clamped.toFixed(3)})`;
    }
    if (label && statusEl) {
      statusEl.textContent = label;
    }
  };

  setProgress(0.22, 'Waking up the pack…');

  const clearTimers = () => {
    if (finalBeatTimer !== null) {
      window.clearTimeout(finalBeatTimer);
      finalBeatTimer = null;
    }
    if (dismissDelayTimer !== null) {
      window.clearTimeout(dismissDelayTimer);
      dismissDelayTimer = null;
    }
    if (fadeCleanupTimer !== null) {
      window.clearTimeout(fadeCleanupTimer);
      fadeCleanupTimer = null;
    }
  };

  const beginDismiss = (immediate = false) => {
    if (dismissed) return;
    dismissed = true;
    clearTimers();
    window.clearTimeout(watchdogTimer);

    setProgress(1, 'Welcome to Pupper Park!');
    splashEl.setAttribute('aria-busy', 'false');

    if (immediate || prefersReducedMotion) {
      splashEl.classList.add('is-hiding');
      splashEl.style.display = 'none';
      splashEl.setAttribute('aria-hidden', 'true');
      options.onFadeStart?.();
      options.onHidden?.();
      return;
    }

    // Brief tick so the completed bar renders smoothly before the crossfade out
    fadeCleanupTimer = window.setTimeout(() => {
      splashEl.classList.add('is-hiding');
      options.onFadeStart?.();
      fadeCleanupTimer = window.setTimeout(() => {
        fadeCleanupTimer = null;
        splashEl.style.display = 'none';
        splashEl.setAttribute('aria-hidden', 'true');
        options.onHidden?.();
      }, SPLASH_FADE_DURATION_MS);
    }, 80);
  };

  const tryFinish = () => {
    if (dismissed) return;
    if (!initDone || !firstFrameDone || !assetsReady) return;

    const elapsed = Math.max(0, getNow() - startedAt);
    const minDuration = prefersReducedMotion || document.hidden ? 0 : MIN_SPLASH_VISIBLE_MS;
    const remaining = Math.max(0, minDuration - elapsed);

    if (remaining <= 16) {
      setProgress(1, 'Welcome to Pupper Park!');
      beginDismiss(false);
      return;
    }

    // Glide cleanly through the final stage so the splash feels alive for ~1s
    if (remaining > FINAL_BEAT_MS + 60) {
      setProgress(Math.max(currentProgress, 0.84), 'Opening the park gates…');
      if (finalBeatTimer === null) {
        finalBeatTimer = window.setTimeout(() => {
          finalBeatTimer = null;
          if (!dismissed) {
            setProgress(1, 'Welcome to Pupper Park!');
          }
        }, Math.max(0, remaining - FINAL_BEAT_MS));
      }
    } else {
      setProgress(1, 'Welcome to Pupper Park!');
    }

    if (dismissDelayTimer === null) {
      dismissDelayTimer = window.setTimeout(() => {
        dismissDelayTimer = null;
        beginDismiss(false);
      }, remaining);
    }
  };

  // Hard fail-safe: splash can NEVER remain stuck regardless of asset/font/rAF issues
  const watchdogTimer = window.setTimeout(() => {
    beginDismiss(document.hidden);
  }, MAX_SPLASH_LIFETIME_MS);

  // Race font + emblem loading against a short cap so broken/slow assets never stall startup
  Promise.all([
    withTimeout(waitForSplashImage(iconImgEl, fallbackEl), ASSET_READY_TIMEOUT_MS),
    withTimeout(waitForFonts(), ASSET_READY_TIMEOUT_MS)
  ]).then(() => {
    assetsReady = true;
    if (!dismissed && !firstFrameDone) {
      setProgress(Math.max(currentProgress, 0.72));
    }
    tryFinish();
  });

  return {
    markInitComplete() {
      if (initDone || dismissed) return;
      initDone = true;
      setProgress(0.56, 'Preparing the park…');
      tryFinish();
    },
    markFirstFrameRendered() {
      if (firstFrameDone || dismissed) return;
      firstFrameDone = true;
      setProgress(0.84, 'Opening the park gates…');
      tryFinish();
    },
    dismissNow() {
      beginDismiss(true);
    }
  };
}

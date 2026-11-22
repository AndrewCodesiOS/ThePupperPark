import { drawIllustratedDog } from './dogArt';

export interface RosterEntry {
  id: string;
  breed: string;
  name: string;
  level: number;
  xp: number;
  bonesEarned: number;
  isFavorite: boolean;
  isShiny: boolean;
  shinyColor: string | null;
  bonusPayout: number;
  bonusScaling: number;
  bonusXp: number;
  rollGrade: string;
  rerollCount: number;
}

export interface PerkItem {
  id: string;
  name: string;
  rarity: string;
  desc: string;
  mult?: number;
  workMult?: number;
  magicAdd?: number;
}

export type DecorType =
  | 'tree'
  | 'flowers'
  | 'fountain'
  | 'hydrant'
  | 'slide'
  | 'lamp'
  | 'goldenHydrant';

export type CustomTileStyle = 'cobble' | 'sand' | 'clover';
export type TileStyle = 'grass' | CustomTileStyle;

export interface StarterPropsState {
  showTree: boolean;
  showMushrooms: [boolean, boolean, boolean, boolean];
}

export interface PlacedDecor {
  type: DecorType;
  gx: number;
  gy: number;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: {
    App?: {
      addListener?: (
        eventName: string,
        callback: (data?: { canGoBack?: boolean }) => void
      ) => void;
      exitApp?: () => void;
    };
    Haptics?: {
      impact?: (options: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }) => Promise<void>;
      vibrate?: (options?: { duration?: number }) => Promise<void>;
    };
  };
}

let initialized = false;

export function initPupperPark(): void {
  if (initialized) return;
  initialized = true;

  const canvasEl = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
  if (!canvasEl) return;
  const canvas: HTMLCanvasElement = canvasEl;
  const ctxMaybe = canvas.getContext('2d');
  if (!ctxMaybe) return;
  const ctx: CanvasRenderingContext2D = ctxMaybe;

  const GRID_SIZE = 7;
  const BASE_TILE_W = 96;
  const BASE_TILE_H = 48;
  const MAX_DOGS = 6;
  const MAX_DOG_LEVEL = 100;
  const MAX_BONES = 1000000;
  const PACK_GROWTH_DUG_CAP = 250000;
  const MAX_OFFLINE_SECONDS = 604800; // 7 days
  const AWAY_MIN_SECONDS = 15;
  const RETIRE_REFUND_RATE = 0.25;
  const LEVEL_BONUS_PER_LEVEL = 0.01;
  const DIG_MULT_BASE = 1.0;
  const DIG_MULT_SQRT_SCALE = 0.0018;

  const BASE_IDLE_MULTIPLIER = 0.10;
  const DUCK_IDLE_STEP = 0.020;
  const MAX_IDLE_MULTIPLIER = 0.60;

  const BASE_DIG_POWER = 1;
  const MAX_DIG_POWER = 25;
  const TENNIS_BALL_FLAT_GAIN = 1;

  const BASE_SPEED_MULTIPLIER = 1;
  const FRISBEE_SPEED_STEP = 1.03;
  const MAX_SPEED_MULTIPLIER = 1.80;

  const BONUS_PAYOUT_MAX = 0.25;
  const BONUS_SCALING_MAX = 0.16;
  const BONUS_XP_MAX = 0.15;
  const TIMED_TREAT_MAX_STACKS = 5;

  const DOGHOUSE_TILE = { gx: 1, gy: 1 };
  const STARTER_TREE_TILE = { gx: 5, gy: 1 };

  const DECOR_TYPES: DecorType[] = [
    'flowers',
    'hydrant',
    'tree',
    'lamp',
    'fountain',
    'slide',
    'goldenHydrant'
  ];

  const DECOR_CONFIG: Record<DecorType, {
    cost: number;
    max: number;
    tileWidth: number;
    buyLabel: string;
    placePrompt: string;
    ownedId: string;
    countId: string;
    buyBtnId: string;
    placeBtnId: string;
    xpBonus: number;
    magicBonus: number;
    payoutBonus: number;
    paceBonus: number;
    cozyFloor: number;
  }> = {
    flowers: {
      cost: 250,
      max: 5,
      tileWidth: 1,
      buyLabel: 'Buy Flowers',
      placePrompt: 'Tap an open park tile to place your flower patch!',
      ownedId: 'ownedDecorFlowers',
      countId: 'countDecorFlowers',
      buyBtnId: 'btnBuyDecorFlowers',
      placeBtnId: 'btnPlaceDecorFlowers',
      xpBonus: 0,
      magicBonus: 0.02,
      payoutBonus: 0,
      paceBonus: 0,
      cozyFloor: 1.5
    },
    hydrant: {
      cost: 350,
      max: 3,
      tileWidth: 1,
      buyLabel: 'Buy Hydrant',
      placePrompt: 'Tap an open park tile to place your fire hydrant!',
      ownedId: 'ownedDecorHydrant',
      countId: 'countDecorHydrant',
      buyBtnId: 'btnBuyDecorHydrant',
      placeBtnId: 'btnPlaceDecorHydrant',
      xpBonus: 0,
      magicBonus: 0,
      payoutBonus: 0,
      paceBonus: 0.03,
      cozyFloor: 2.0
    },
    tree: {
      cost: 500,
      max: 3,
      tileWidth: 1,
      buyLabel: 'Buy Tree',
      placePrompt: 'Tap an open park tile to place your tree!',
      ownedId: 'ownedDecorTree',
      countId: 'countDecorTree',
      buyBtnId: 'btnBuyDecorTree',
      placeBtnId: 'btnPlaceDecorTree',
      xpBonus: 0.03,
      magicBonus: 0,
      payoutBonus: 0,
      paceBonus: 0,
      cozyFloor: 2.0
    },
    lamp: {
      cost: 800,
      max: 4,
      tileWidth: 1,
      buyLabel: 'Buy Lamp',
      placePrompt: 'Tap an open park tile to place your warm lamp post!',
      ownedId: 'ownedDecorLamp',
      countId: 'countDecorLamp',
      buyBtnId: 'btnBuyDecorLamp',
      placeBtnId: 'btnPlaceDecorLamp',
      xpBonus: 0,
      magicBonus: 0.025,
      payoutBonus: 0.02,
      paceBonus: 0,
      cozyFloor: 3.0
    },
    fountain: {
      cost: 1000,
      max: 2,
      tileWidth: 1,
      buyLabel: 'Buy Fountain',
      placePrompt: 'Tap an open park tile to place your fountain!',
      ownedId: 'ownedDecorFountain',
      countId: 'countDecorFountain',
      buyBtnId: 'btnBuyDecorFountain',
      placeBtnId: 'btnPlaceDecorFountain',
      xpBonus: 0,
      magicBonus: 0,
      payoutBonus: 0.05,
      paceBonus: 0,
      cozyFloor: 4.0
    },
    slide: {
      cost: 1500,
      max: 1,
      tileWidth: 2,
      buyLabel: 'Buy Slide',
      placePrompt: 'Tap an open spot (2 tiles side-by-side) for your Dog Slide!',
      ownedId: 'ownedDecorSlide',
      countId: 'countDecorSlide',
      buyBtnId: 'btnBuyDecorSlide',
      placeBtnId: 'btnPlaceDecorSlide',
      xpBonus: 0.08,
      magicBonus: 0,
      payoutBonus: 0,
      paceBonus: 0,
      cozyFloor: 12.0
    },
    goldenHydrant: {
      cost: 2500,
      max: 1,
      tileWidth: 1,
      buyLabel: 'Buy Golden',
      placePrompt: 'Tap an open park tile to place your Golden Fire Hydrant!',
      ownedId: 'ownedDecorGoldenHydrant',
      countId: 'countDecorGoldenHydrant',
      buyBtnId: 'btnBuyDecorGoldenHydrant',
      placeBtnId: 'btnPlaceDecorGoldenHydrant',
      xpBonus: 0,
      magicBonus: 0.05,
      payoutBonus: 0.10,
      paceBonus: 0.05,
      cozyFloor: 8.0
    }
  };

  const TILE_UNLOCK_COST = 300;
  const CUSTOM_TILE_STYLES: CustomTileStyle[] = ['cobble', 'sand', 'clover'];
  const CUSTOM_TILE_CONFIG: Record<CustomTileStyle, {
    name: string;
    btnId: string;
    statusId: string;
  }> = {
    cobble: { name: 'Cobblestone Path', btnId: 'btnTileCobble', statusId: 'statusTileCobble' },
    sand: { name: 'Sandy Dig Pit', btnId: 'btnTileSand', statusId: 'statusTileSand' },
    clover: { name: 'Clover Meadow', btnId: 'btnTileClover', statusId: 'statusTileClover' }
  };
  const TILE_RIPPLE_COLORS: Record<TileStyle, string> = {
    grass: '#55efc4',
    cobble: '#dcd6cb',
    sand: '#f6d38b',
    clover: '#7bed9f'
  };

  function createEmptyDecorInventory(): Record<DecorType, number> {
    return {
      tree: 0,
      flowers: 0,
      fountain: 0,
      hydrant: 0,
      slide: 0,
      lamp: 0,
      goldenHydrant: 0
    };
  }

  function createDefaultStarterProps(): StarterPropsState {
    return {
      showTree: true,
      showMushrooms: [true, true, true, true]
    };
  }

  function createDefaultUnlockedTiles(): Record<CustomTileStyle, boolean> {
    return {
      cobble: false,
      sand: false,
      clover: false
    };
  }

  const HAPPINESS_BASE_FLOOR = 35;
  const HAPPINESS_MAX = 100;
  const HAPPINESS_MAX_FLOOR = 75;
  const HAPPINESS_COOL_RATE_PER_SEC = 0.12;
  const HAPPINESS_TREAT_TRICKLE_PER_SEC = 0.25;
  const HAPPINESS_OFFLINE_RATE_PER_HOUR = 14;
  const WHISTLE_HAPPINESS_COOLDOWN_MS = 15000;

  const TOY_CONFIG: Record<string, { baseCost: number; costMult: number; priceCap: number }> = {
    toyBones: { baseCost: 35, costMult: 1.26, priceCap: 10000 },
    toyIdle: { baseCost: 250, costMult: 1.30, priceCap: 15000 },
    toySpeed: { baseCost: 500, costMult: 1.32, priceCap: 20000 }
  };

  const TREAT_CONFIG: Record<string, {
    baseCost: number;
    costMult: number;
    priceCap: number;
    duration: number;
    payoutBonus: number;
    paceBonus?: number;
    xpBonus?: number;
  }> = {
    treatCup:   { baseCost: 350,  costMult: 1, priceCap: 350,  duration: 90, payoutBonus: 0.35 },
    treatXp:    { baseCost: 400,  costMult: 1, priceCap: 400,  duration: 60, payoutBonus: 0, xpBonus: 1.00 },
    treatKong:  { baseCost: 1200, costMult: 1, priceCap: 1200, duration: 20, payoutBonus: 0 },
    treatFeast: { baseCost: 1500, costMult: 1, priceCap: 1500, duration: 90, payoutBonus: 0.50 },
    treatBacon: { baseCost: 3500, costMult: 1, priceCap: 3500, duration: 60, payoutBonus: 0.35, paceBonus: 0.35 }
  };

  const STARTER_SHINY_ODDS = 1 / 325;
  const SPAWN_SHINY_ODDS = 1 / 650;
  const REROLL_SHINY_ODDS = 1 / 1300;
  const SHINY_MAGIC_BONE_BONUS = 1;
  const REROLL_STEP_COST = 25;
  const SHINY_PALETTES = ['#f1c40f', '#e67e22', '#e84393', '#00cec9', '#fd79a8'];

  const PARK_BARK_MIN_COOLDOWN = 4.2;
  const PARK_BARK_MAX_COOLDOWN = 7.8;
  const DOG_BARK_MIN_COOLDOWN = 11.0;
  const DOG_BARK_MAX_COOLDOWN = 20.0;
  const BARK_TEXT_DURATION = 0.72;

  const BARK_WORDS = ['Woof!', 'Arf!', 'Bork!', 'Yip!'];

  const BREED_LABELS: Record<string, string> = {
    aussie: 'Aussie',
    corgi: 'Corgi',
    beagle: 'Beagle',
    collie: 'Collie',
    dachshund: 'Dachshund',
    husky: 'Husky',
    dalmatian: 'Dalmatian',
    golden: 'Golden',
    samoyed: 'Samoyed',
    shepherd: 'Shepherd',
    borzoi: 'Borzoi',
    shiba: 'Shiba',
    labrador: 'Labrador',
    bernese: 'Bernese'
  };

  const DEFAULT_PUP_NAMES = [
    'Scout', 'Max', 'Rover', 'Waffles', 'Buddy',
    'Maple', 'Ziggy', 'Otis', 'Penny', 'Bramble', 'Toby',
    'Sunny', 'Nora', 'Rosie', 'Finn',
    'Clover', 'Milo', 'Daisy', 'Charlie', 'Luna', 'Bear',
    'Hazel', 'Moose', 'Olive', 'Pip', 'Pippa', 'Jasper',
    'Willow', 'Archie', 'Ruby', 'Theo', 'Juniper', 'Gus',
    'Poppy', 'Barnaby', 'Peaches', 'Simba', 'Ginger', 'Hank',
    'Bowie', 'Coco', 'Louie', 'Fern', 'Ollie', 'Sadie',
    'Bandit', 'Mochi', 'Koda', 'Nova', 'Rusty', 'Zelda',
    'Bagel', 'Sprout', 'Pepper', 'Casper', 'Tilly', 'Felix',
    'Honey', 'Buster', 'Dottie', 'Rocco', 'Cleo', 'Marley',
    'Aspen', 'Bennie', 'Franklin', 'Flora'
  ];

  function drawRoundedRect(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + radius, y);
    c.lineTo(x + w - radius, y);
    c.quadraticCurveTo(x + w, y, x + w, y + radius);
    c.lineTo(x + w, y + h - radius);
    c.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    c.lineTo(x + radius, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - radius);
    c.lineTo(x, y + radius);
    c.quadraticCurveTo(x, y, x + radius, y);
    c.closePath();
  }

  let audioCtx: AudioContext | null = null;
  let masterMuted = false;
  let ambientBedStarted = false;
  let ambientBedGain: GainNode | null = null;
  let ambientBedFilter: BiquadFilterNode | null = null;
  let ambientEventCooldown = 2.2 + Math.random() * 2.5;

  function isSfxActive(): boolean {
    return !masterMuted && state.soundEnabled;
  }

  function isAmbientActive(): boolean {
    return !masterMuted && state.ambientEnabled;
  }

  function ensureAmbientBed(): void {
    if (!audioCtx || ambientBedStarted) return;
    ambientBedStarted = true;
    try {
      const sampleRate = audioCtx.sampleRate;
      const length = sampleRate * 4;
      const buffer = audioCtx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.03 * white) / 1.03;
        data[i] = lastOut * 2.4;
      }

      const noiseSrc = audioCtx.createBufferSource();
      noiseSrc.buffer = buffer;
      noiseSrc.loop = true;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, audioCtx.currentTime);
      filter.Q.setValueAtTime(0.6, audioCtx.currentTime);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);

      // Gentle LFO breathing on the breeze filter
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.11, audioCtx.currentTime);
      lfoGain.gain.setValueAtTime(160, audioCtx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      noiseSrc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      noiseSrc.start();
      lfo.start();

      ambientBedFilter = filter;
      ambientBedGain = gain;
    } catch {
      ambientBedStarted = false;
    }
  }

  function updateAmbientBed(): void {
    if (!audioCtx || !ambientBedGain || !ambientBedFilter) return;
    const now = audioCtx.currentTime;
    if (document.hidden || !isAmbientActive()) {
      ambientBedGain.gain.setTargetAtTime(0.0001, now, 0.25);
      return;
    }

    const wId = getCurrentWeather().id;
    let targetGain = 0.008;
    let targetFreq = 620;
    if (wId === 'windy') {
      targetGain = 0.015;
      targetFreq = 860;
    } else if (wId === 'rain') {
      targetGain = 0.019;
      targetFreq = 1280;
    } else if (wId === 'twilight') {
      targetGain = 0.006;
      targetFreq = 460;
    }

    ambientBedFilter.frequency.setTargetAtTime(targetFreq, now, 0.8);
    ambientBedGain.gain.setTargetAtTime(targetGain, now, 0.5);
  }

  function initAudio(): void {
    if (masterMuted || (!state.soundEnabled && !state.ambientEnabled)) return;
    if (!audioCtx) {
      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextCtor) {
        audioCtx = new AudioContextCtor();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        ensureAmbientBed();
        updateAmbientBed();
      }).catch(() => {});
    } else if (audioCtx) {
      ensureAmbientBed();
      updateAmbientBed();
    }
  }

  function playBirdChirp(): void {
    if (!audioCtx || !isAmbientActive()) return;
    try {
      const now = audioCtx.currentTime;
      const notes = 2 + Math.floor(Math.random() * 3);
      const basePitch = 1850 + Math.random() * 950;
      for (let i = 0; i < notes; i++) {
        const start = now + i * (0.11 + Math.random() * 0.06);
        const dur = 0.075 + Math.random() * 0.045;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const pitch = basePitch * (1 + (Math.random() - 0.35) * 0.22);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, start);
        osc.frequency.exponentialRampToValueAtTime(pitch * (Math.random() > 0.4 ? 1.24 : 0.82), start + dur);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.014, start + 0.016);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + dur + 0.01);
      }
    } catch {
      // Ignore audio restrictions
    }
  }

  function playDistantChime(): void {
    if (!audioCtx || !isAmbientActive()) return;
    try {
      const notes = [523.25, 587.33, 659.25, 783.99, 880];
      const freq = notes[Math.floor(Math.random() * notes.length)];
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.011, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.9);
    } catch {
      // Ignore
    }
  }

  function playRainDroplet(): void {
    if (!audioCtx || !isAmbientActive()) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const f = 680 + Math.random() * 440;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.45, now + 0.06);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Ignore
    }
  }

  function playCricketTrill(): void {
    if (!audioCtx || !isAmbientActive()) return;
    try {
      const now = audioCtx.currentTime;
      const freq = 3900 + Math.random() * 400;
      for (let i = 0; i < 3; i++) {
        const start = now + i * 0.065;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.007, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.045);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + 0.05);
      }
    } catch {
      // Ignore
    }
  }

  function playAmbientParkEvent(): void {
    if (!audioCtx || audioCtx.state !== 'running' || !isAmbientActive() || document.hidden) return;
    const wId = getCurrentWeather().id;
    const roll = Math.random();
    if (wId === 'sunny') {
      if (roll < 0.78) playBirdChirp();
      else playDistantChime();
    } else if (wId === 'windy') {
      if (roll < 0.55) playBirdChirp();
      else playDistantChime();
    } else if (wId === 'rain') {
      if (roll < 0.7) playRainDroplet();
      else playBirdChirp();
    } else {
      if (roll < 0.68) playCricketTrill();
      else playDistantChime();
    }
  }

  function triggerHaptic(ms = 12): void {
    if (!state.hapticsEnabled) return;
    const capRef = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
    const hapticsPlugin = capRef?.Plugins?.Haptics;
    if (hapticsPlugin) {
      if (typeof hapticsPlugin.impact === 'function') {
        const style = ms >= 20 ? 'HEAVY' : ms >= 12 ? 'MEDIUM' : 'LIGHT';
        hapticsPlugin.impact({ style }).catch(() => {});
        return;
      }
      if (typeof hapticsPlugin.vibrate === 'function') {
        hapticsPlugin.vibrate({ duration: Math.max(24, ms * 2) }).catch(() => {});
        return;
      }
    }

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(Math.max(24, Math.round(ms * 2)));
      } catch {
        // Ignore on unsupported browsers or restricted frames
      }
    }
  }

  function playSound(freq = 440, type: OscillatorType = 'sine', duration = 0.15, gainVal = 0.05): void {
    if (!isSfxActive() || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Ignore restrictions
    }
  }

  function playBarkSound(breed = 'aussie'): void {
    if (!isSfxActive() || !audioCtx) return;
    try {
      const pitchMap: Record<string, number> = {
        aussie: 430,
        corgi: 600,
        beagle: 510,
        collie: 470,
        dachshund: 560,
        husky: 540,
        dalmatian: 445,
        golden: 390,
        samoyed: 410,
        shepherd: 350,
        borzoi: 315,
        shiba: 580,
        labrador: 370,
        bernese: 295
      };
      const baseFreq = (pitchMap[breed] || 430) * (0.94 + Math.random() * 0.12);
      const now = audioCtx.currentTime;

      const osc = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq * 0.85, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.28, now + 0.045);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.72, now + 0.16);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(baseFreq * 2.1, now);
      filter.Q.setValueAtTime(2.2, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.055, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // Ignore restrictions
    }
  }

  const sfx = {
    collect: () => playSound(659.25, 'sine', 0.12, 0.04),
    magicCollect: () => {
      playSound(880, 'sine', 0.1, 0.04);
      setTimeout(() => playSound(1318.51, 'sine', 0.2, 0.04), 80);
    },
    upgrade: () => {
      playSound(523.25, 'sine', 0.1, 0.04);
      setTimeout(() => playSound(783.99, 'sine', 0.2, 0.04), 100);
    },
    shiny: () => {
      playSound(1046.50, 'sine', 0.15, 0.06);
      setTimeout(() => playSound(1318.51, 'sine', 0.3, 0.06), 120);
    },
    gather: () => {
      playSound(587.33, 'sine', 0.2, 0.05);
      setTimeout(() => playSound(880, 'sine', 0.3, 0.05), 100);
    },
    pet: () => {
      playSound(740, 'sine', 0.09, 0.04);
      setTimeout(() => playSound(987.77, 'sine', 0.14, 0.04), 60);
    },
    treat: () => {
      playSound(783.99, 'sine', 0.15, 0.06);
      setTimeout(() => playSound(1046.50, 'sine', 0.25, 0.06), 100);
    },
    squeak: () => {
      playSound(1200, 'triangle', 0.08, 0.04);
      setTimeout(() => playSound(950, 'triangle', 0.08, 0.04), 60);
    },
    quack: () => {
      playSound(450, 'sawtooth', 0.1, 0.04);
      setTimeout(() => playSound(380, 'sawtooth', 0.12, 0.04), 70);
    },
    thud: () => {
      playSound(220, 'square', 0.1, 0.04);
      setTimeout(() => playSound(150, 'square', 0.15, 0.04), 50);
    },
    bark: (breed: string) => playBarkSound(breed)
  };

  interface BreedCfg {
    rank: number;
    cost: number;
    costMult: number;
    priceCap: number;
    walkMult: number;
    digSec: number;
    payoutMult: number;
    scalingMult: number;
    xpMult: number;
    magicBonus: number;
    treasureChance: number;
  }

  const BREED_CONFIG: Record<string, BreedCfg> = {
    aussie:    { rank: 1,  cost: 20,    costMult: 1.20, priceCap: 1200,   walkMult: 1.10, digSec: 1.85, payoutMult: 0.95, scalingMult: 1.00, xpMult: 1.00, magicBonus: 0.000, treasureChance: 0.00008 },
    corgi:     { rank: 2,  cost: 60,    costMult: 1.21, priceCap: 2000,   walkMult: 1.12, digSec: 1.55, payoutMult: 1.15, scalingMult: 1.06, xpMult: 1.12, magicBonus: 0.008, treasureChance: 0.00010 },
    beagle:    { rank: 3,  cost: 120,   costMult: 1.22, priceCap: 3000,   walkMult: 1.00, digSec: 1.75, payoutMult: 1.35, scalingMult: 1.12, xpMult: 1.05, magicBonus: 0.010, treasureChance: 0.00008 },
    collie:    { rank: 4,  cost: 340,   costMult: 1.24, priceCap: 6500,   walkMult: 1.20, digSec: 1.35, payoutMult: 1.05, scalingMult: 1.10, xpMult: 1.10, magicBonus: 0.015, treasureChance: 0.00008 },
    dachshund: { rank: 5,  cost: 560,   costMult: 1.25, priceCap: 9500,   walkMult: 1.15, digSec: 1.25, payoutMult: 1.22, scalingMult: 1.14, xpMult: 1.10, magicBonus: 0.022, treasureChance: 0.00024 },
    husky:     { rank: 6,  cost: 850,   costMult: 1.26, priceCap: 13000,  walkMult: 1.25, digSec: 1.65, payoutMult: 1.15, scalingMult: 1.15, xpMult: 1.15, magicBonus: 0.020, treasureChance: 0.00008 },
    dalmatian: { rank: 7,  cost: 1450,  costMult: 1.27, priceCap: 19500,  walkMult: 1.24, digSec: 1.45, payoutMult: 1.40, scalingMult: 1.18, xpMult: 1.16, magicBonus: 0.026, treasureChance: 0.00012 },
    golden:    { rank: 8,  cost: 2100,  costMult: 1.28, priceCap: 26000,  walkMult: 1.05, digSec: 1.75, payoutMult: 1.65, scalingMult: 1.20, xpMult: 1.08, magicBonus: 0.030, treasureChance: 0.00008 },
    samoyed:   { rank: 9,  cost: 3200,  costMult: 1.29, priceCap: 36000,  walkMult: 1.12, digSec: 1.60, payoutMult: 1.55, scalingMult: 1.24, xpMult: 1.22, magicBonus: 0.042, treasureChance: 0.00016 },
    shepherd:  { rank: 10, cost: 4800,  costMult: 1.30, priceCap: 48000,  walkMult: 1.15, digSec: 1.65, payoutMult: 1.25, scalingMult: 1.25, xpMult: 1.12, magicBonus: 0.035, treasureChance: 0.00008 },
    borzoi:    { rank: 11, cost: 7500,  costMult: 1.31, priceCap: 64000,  walkMult: 1.30, digSec: 1.55, payoutMult: 1.45, scalingMult: 1.26, xpMult: 1.18, magicBonus: 0.048, treasureChance: 0.00024 },
    shiba:     { rank: 12, cost: 10500, costMult: 1.32, priceCap: 80000,  walkMult: 1.10, digSec: 1.70, payoutMult: 1.20, scalingMult: 1.20, xpMult: 1.12, magicBonus: 0.055, treasureChance: 0.00064 },
    labrador:  { rank: 13, cost: 22000, costMult: 1.34, priceCap: 125000, walkMult: 1.20, digSec: 1.50, payoutMult: 1.80, scalingMult: 1.32, xpMult: 1.20, magicBonus: 0.050, treasureChance: 0.00012 },
    bernese:   { rank: 14, cost: 42000, costMult: 1.35, priceCap: 190000, walkMult: 1.10, digSec: 1.45, payoutMult: 2.10, scalingMult: 1.40, xpMult: 1.25, magicBonus: 0.065, treasureChance: 0.00032 }
  };

  const PERK_POOL: PerkItem[] = [
    { id: 'bp_1', name: 'Muddy Map', rarity: 'Common', desc: 'Slightly boosts bone payouts per dig (1.10x)', mult: 1.10 },
    { id: 'bp_2', name: 'Lost Compass', rarity: 'Common', desc: 'Boosts bone payouts per dig (1.15x)', mult: 1.15 },
    { id: 'bp_3', name: 'Canvas Treat Pouch', rarity: 'Common', desc: 'Boosts bone payouts per dig (1.20x)', mult: 1.20 },
    { id: 'sp_1', name: 'Sturdy Shovel', rarity: 'Common', desc: 'Boosts dig payout scaling (1.10x)', workMult: 1.10 },
    { id: 'bp_4', name: 'Golden Dog-Tag', rarity: 'Rare', desc: 'Boosts bone payouts per dig (1.30x)', mult: 1.30 },
    { id: 'bp_5', name: 'Golden Collar', rarity: 'Rare', desc: 'Boosts bone payouts per dig (1.40x)', mult: 1.40 },
    { id: 'mp_1', name: 'Mystic Chew Toy', rarity: 'Rare', desc: 'Boosts ✨ Magic Bone chance (+4%)', magicAdd: 0.04 },
    { id: 'bp_6', name: 'Diamond Bowl', rarity: 'Legendary', desc: 'Massively boosts bone payouts per dig (1.80x)', mult: 1.80 },
    { id: 'mp_2', name: 'The Golden Good-Boy Stash', rarity: 'Legendary', desc: 'Significantly boosts ✨ Magic Bone chance (+10%)', magicAdd: 0.10 },
    { id: 'myth_1', name: 'The Infinite Toy Chest', rarity: 'Mythic', desc: 'Divine relic! Triples dig bones (3.0x) & boosts scaling (1.5x)', mult: 3.0, workMult: 1.5 }
  ];

  function computeNextCappedCost(currentCost: number, mult: number, cap?: number): number {
    const safeCost = Math.max(1, Number(currentCost) || 1);
    if (typeof cap === 'number' && cap > 0) {
      if (safeCost >= cap) return cap;
      return Math.min(cap, Math.floor(safeCost * mult));
    }
    return Math.floor(safeCost * mult);
  }

  function generateDefaultName(_breed: string, indexNum: number): string {
    const totalNames = DEFAULT_PUP_NAMES.length;
    const safeIndex = (((Math.max(1, Number(indexNum) || 1) - 1) % totalNames) + totalNames) % totalNames;
    return DEFAULT_PUP_NAMES[safeIndex].trim();
  }

  function normalizeBreedKey(breed: string): string {
    return BREED_CONFIG[breed] ? breed : 'aussie';
  }

  interface GameState {
    bones: number;
    lifetimeBones: number;
    magicBones: number;
    nextNameIndex: number;
    namePool?: string[];
    dogs: Record<string, number>;
    shinyDogs: Array<{ breed: string; color: string | null }>;
    roster: RosterEntry[];
    perks: PerkItem[];
    decorInventory: Record<DecorType, number>;
    placedDecorations: PlacedDecor[];
    starterProps: StarterPropsState;
    isPlacingDecor: boolean;
    activeDecorType: DecorType | null;
    unlockedTiles: Record<CustomTileStyle, boolean>;
    tileMap: Record<string, CustomTileStyle>;
    isPaintingTiles: boolean;
    activeTileBrush: TileStyle;
    showNameTags: boolean;
    soundEnabled: boolean;
    ambientEnabled: boolean;
    hapticsEnabled: boolean;
    hasSeenHint: boolean;
    cameraAngle: number;
    zoomLevel: number;
    digPower: number;
    speedMultiplier: number;
    idleMultiplier: number;
    magicChance: number;
    boneCapEverShown: boolean;
    boneCapReachedNotified: boolean;
    kongTimer: number;
    baconTimer: number;
    pupCupTimer: number;
    xpTreatTimer: number;
    feastTimer: number;
    kongStacks: number;
    baconStacks: number;
    pupCupStacks: number;
    xpTreatStacks: number;
    feastStacks: number;
    feastAnimTimer: number;
    hasTennisBall: boolean;
    hasFrisbee: boolean;
    hasDuck: boolean;
    isDraftingPerk: boolean;
    packHappiness: number;
    lastWhistleBoostAt: number;
    costs: Record<string, number>;
    lastSaveTime: number;
    [key: string]: unknown;
  }

  let state: GameState = {
    bones: 0,
    lifetimeBones: 0,
    magicBones: 0,
    nextNameIndex: 1,
    namePool: [],
    dogs: {
      aussie: 1, corgi: 0, beagle: 0, collie: 0, dachshund: 0, husky: 0,
      dalmatian: 0, golden: 0, samoyed: 0, shepherd: 0, borzoi: 0, shiba: 0, labrador: 0, bernese: 0
    },
    shinyDogs: [],
    roster: [],
    perks: [],
    decorInventory: createEmptyDecorInventory(),
    placedDecorations: [],
    starterProps: createDefaultStarterProps(),
    isPlacingDecor: false,
    activeDecorType: null,
    unlockedTiles: createDefaultUnlockedTiles(),
    tileMap: {},
    isPaintingTiles: false,
    activeTileBrush: 'grass',
    showNameTags: true,
    soundEnabled: true,
    ambientEnabled: true,
    hapticsEnabled: true,
    hasSeenHint: false,
    cameraAngle: 0,
    zoomLevel: 1,
    digPower: BASE_DIG_POWER,
    speedMultiplier: BASE_SPEED_MULTIPLIER,
    idleMultiplier: BASE_IDLE_MULTIPLIER,
    magicChance: 0.22,
    boneCapEverShown: false,
    boneCapReachedNotified: false,
    kongTimer: 0,
    baconTimer: 0,
    pupCupTimer: 0,
    xpTreatTimer: 0,
    feastTimer: 0,
    kongStacks: 0,
    baconStacks: 0,
    pupCupStacks: 0,
    xpTreatStacks: 0,
    feastStacks: 0,
    feastAnimTimer: 0,
    hasTennisBall: false,
    hasFrisbee: false,
    hasDuck: false,
    isDraftingPerk: false,
    packHappiness: HAPPINESS_BASE_FLOOR,
    lastWhistleBoostAt: 0,
    costs: {},
    lastSaveTime: Date.now()
  };

  function initDefaultCosts(): void {
    Object.keys(BREED_CONFIG).forEach(b => {
      state.costs[b] = BREED_CONFIG[b].cost;
    });
    Object.keys(TOY_CONFIG).forEach(t => {
      state.costs[t] = TOY_CONFIG[t].baseCost;
    });
    Object.keys(TREAT_CONFIG).forEach(tr => {
      state.costs[tr] = TREAT_CONFIG[tr].baseCost;
    });
  }

  initDefaultCosts();

  function getDecorBonuses(): {
    counts: Record<DecorType, number>;
    treeCount: number;
    flowerCount: number;
    fountainCount: number;
    xpMult: number;
    magicAdd: number;
    payoutMult: number;
    paceMult: number;
    cozyFloorBonus: number;
  } {
    const placed = Array.isArray(state.placedDecorations) ? state.placedDecorations : [];
    const counts = createEmptyDecorInventory();
    placed.forEach(d => {
      if (d && d.type in counts) {
        counts[d.type] += 1;
      }
    });

    let xpBonus = 0;
    let magicAdd = 0;
    let payoutBonus = 0;
    let paceBonus = 0;
    let cozyFloor = 0;

    DECOR_TYPES.forEach(type => {
      const n = counts[type];
      if (n <= 0) return;
      const cfg = DECOR_CONFIG[type];
      xpBonus += n * cfg.xpBonus;
      magicAdd += n * cfg.magicBonus;
      payoutBonus += n * cfg.payoutBonus;
      paceBonus += n * cfg.paceBonus;
      cozyFloor += n * cfg.cozyFloor;
    });

    return {
      counts,
      treeCount: counts.tree,
      flowerCount: counts.flowers,
      fountainCount: counts.fountain,
      xpMult: 1 + xpBonus,
      magicAdd,
      payoutMult: 1 + payoutBonus,
      paceMult: 1 + paceBonus,
      cozyFloorBonus: Math.round(cozyFloor * 10) / 10
    };
  }

  function buildShuffledNamePool(excludeLower?: Set<string>): string[] {
    const pool = DEFAULT_PUP_NAMES
      .map(n => n.trim())
      .filter(n => n && (!excludeLower || !excludeLower.has(n.toLowerCase())));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    return pool;
  }

  function getNextLoopingPupName(breed: string): string {
    const activeNames = new Set(
      (Array.isArray(state.roster) ? state.roster : [])
        .map(d => (typeof d.name === 'string' ? d.name.trim().toLowerCase() : ''))
        .filter(Boolean)
    );

    if (!Array.isArray(state.namePool)) {
      state.namePool = buildShuffledNamePool(activeNames);
    }

    let chosen: string | null = null;
    for (let attempt = 0; attempt < 2 && !chosen; attempt++) {
      if (state.namePool.length === 0) {
        state.namePool = buildShuffledNamePool(activeNames);
      }
      while (state.namePool.length > 0) {
        const candidate = String(state.namePool.pop() || '').trim();
        if (candidate && !activeNames.has(candidate.toLowerCase())) {
          chosen = candidate;
          break;
        }
      }
    }

    if (!chosen) {
      const fallback = DEFAULT_PUP_NAMES.find(n => !activeNames.has(n.trim().toLowerCase()));
      chosen = fallback ? fallback.trim() : DEFAULT_PUP_NAMES[Math.floor(Math.random() * DEFAULT_PUP_NAMES.length)].trim();
    }

    return chosen || (BREED_LABELS[breed] || 'Pup');
  }

  function rollStarterShiny(): { isShiny: boolean; shinyColor: string | null } {
    const isShiny = Math.random() < STARTER_SHINY_ODDS;
    const shinyColor = isShiny
      ? SHINY_PALETTES[Math.floor(Math.random() * SHINY_PALETTES.length)]
      : null;
    return { isShiny, shinyColor };
  }

  function rollDogBonusStats(): { bonusPayout: number; bonusScaling: number; bonusXp: number; rollGrade: string } {
    const payoutSteps = Math.floor(Math.random() * 6);
    const scalingSteps = Math.floor(Math.random() * 9);
    const xpSteps = Math.floor(Math.random() * 6);

    const bonusPayout = Math.round(payoutSteps * 0.05 * 100) / 100;
    const bonusScaling = Math.round(scalingSteps * 0.02 * 100) / 100;
    const bonusXp = Math.round(xpSteps * 0.03 * 100) / 100;

    const rollRatio = (
      (bonusPayout / BONUS_PAYOUT_MAX) +
      (bonusScaling / BONUS_SCALING_MAX) +
      (bonusXp / BONUS_XP_MAX)
    ) / 3;

    let rollGrade = 'Standard';
    if (rollRatio >= 0.95) {
      rollGrade = '★ Max Roll';
    } else if (rollRatio >= 0.65) {
      rollGrade = 'Prime';
    } else if (rollRatio >= 0.35) {
      rollGrade = 'Sharp';
    }

    return { bonusPayout, bonusScaling, bonusXp, rollGrade };
  }

  function getRollRating(entryOrRoll: { bonusPayout?: number; bonusScaling?: number; bonusXp?: number } | null): number {
    if (!entryOrRoll) return 0;
    const payout = typeof entryOrRoll.bonusPayout === 'number' ? entryOrRoll.bonusPayout : 0;
    const scaling = typeof entryOrRoll.bonusScaling === 'number' ? entryOrRoll.bonusScaling : 0;
    const xp = typeof entryOrRoll.bonusXp === 'number' ? entryOrRoll.bonusXp : 0;

    return (
      (payout / BONUS_PAYOUT_MAX) +
      (scaling / BONUS_SCALING_MAX) +
      (xp / BONUS_XP_MAX)
    ) / 3;
  }

  function getDogRerollCount(entry: RosterEntry | null | undefined): number {
    if (!entry || typeof entry.rerollCount !== 'number' || Number.isNaN(entry.rerollCount)) {
      return 0;
    }
    return Math.max(0, Math.floor(entry.rerollCount));
  }

  function getRerollCost(entryOrDogId: RosterEntry | string | null = null): number {
    const entry = typeof entryOrDogId === 'string'
      ? state.roster.find(d => d.id === entryOrDogId)
      : entryOrDogId;
    const dogCount = getDogRerollCount(entry);
    return REROLL_STEP_COST * (dogCount + 1);
  }

  function getEffectiveBreedStats(entry: RosterEntry | null | undefined, fallbackBreed = 'aussie') {
    const breedKey = normalizeBreedKey((entry && entry.breed) || fallbackBreed);
    const cfg = BREED_CONFIG[breedKey] || BREED_CONFIG.aussie;
    const bonusPayout = entry && typeof entry.bonusPayout === 'number' ? entry.bonusPayout : 0;
    const bonusScaling = entry && typeof entry.bonusScaling === 'number' ? entry.bonusScaling : 0;
    const bonusXp = entry && typeof entry.bonusXp === 'number' ? entry.bonusXp : 0;

    return {
      ...cfg,
      breedKey,
      boneYield: (cfg.payoutMult || 1.0) + bonusPayout,
      packGrowth: (cfg.scalingMult || 1.0) + bonusScaling,
      quickLearner: (cfg.xpMult || 1.0) + bonusXp,
      bonusPayout,
      bonusScaling,
      bonusXp,
      rollGrade: (entry && entry.rollGrade) || 'Standard'
    };
  }

  function createRosterEntry(
    breed: string,
    isShiny = false,
    shinyColor: string | null = null,
    customName: string | null = null
  ): RosterEntry {
    const rolls = rollDogBonusStats();
    return {
      id: `dog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      breed,
      name: customName || getNextLoopingPupName(breed),
      level: 1,
      xp: 0,
      bonesEarned: 0,
      isFavorite: false,
      isShiny,
      shinyColor: shinyColor || null,
      bonusPayout: rolls.bonusPayout,
      bonusScaling: rolls.bonusScaling,
      bonusXp: rolls.bonusXp,
      rollGrade: rolls.rollGrade,
      rerollCount: 0
    };
  }

  function getXpNeededForLevel(level: number): number {
    return Math.floor(25 * Math.pow(1.2, Math.max(0, level - 1)));
  }

  function getDogLevelBonusMult(entry: RosterEntry | null | undefined): number {
    const lvl = entry && entry.level ? entry.level : 1;
    return 1 + Math.max(0, lvl - 1) * LEVEL_BONUS_PER_LEVEL;
  }

  const TREAT_STACK_MAP: Record<string, { timerKey: string; stackKey: string; duration: number }> = {
    xp: { timerKey: 'xpTreatTimer', stackKey: 'xpTreatStacks', duration: TREAT_CONFIG.treatXp.duration },
    kong: { timerKey: 'kongTimer', stackKey: 'kongStacks', duration: TREAT_CONFIG.treatKong.duration },
    cup: { timerKey: 'pupCupTimer', stackKey: 'pupCupStacks', duration: TREAT_CONFIG.treatCup.duration },
    feast: { timerKey: 'feastTimer', stackKey: 'feastStacks', duration: TREAT_CONFIG.treatFeast.duration },
    bacon: { timerKey: 'baconTimer', stackKey: 'baconStacks', duration: TREAT_CONFIG.treatBacon.duration }
  };

  function getTreatMaxDuration(treatKey: string): number {
    const cfg = TREAT_STACK_MAP[treatKey];
    return cfg ? cfg.duration * TIMED_TREAT_MAX_STACKS : 0;
  }

  function isTreatAtMaxDuration(treatKey: string): boolean {
    const cfg = TREAT_STACK_MAP[treatKey];
    if (!cfg) return true;
    const timer = Math.max(0, Number(state[cfg.timerKey]) || 0);
    const maxDur = cfg.duration * TIMED_TREAT_MAX_STACKS;
    return timer > maxDur - cfg.duration + 0.5;
  }

  function getTreatStacks(treatKey: string): number {
    const cfg = TREAT_STACK_MAP[treatKey];
    if (!cfg) return 0;
    const timer = Math.max(0, Number(state[cfg.timerKey]) || 0);
    if (timer <= 0) return 0;
    return Math.min(TIMED_TREAT_MAX_STACKS, Math.max(1, Math.ceil(timer / cfg.duration)));
  }

  type WeatherId = 'sunny' | 'windy' | 'rain' | 'twilight';

  interface WeatherConfig {
    id: WeatherId;
    name: string;
    icon: string;
    shortMod: string;
    modLabel: string;
    desc: string;
    digSpeedMult: number;
    treasureMult: number;
    magicAdd: number;
    xpMult: number;
  }

  const WEATHER_TYPES: Record<WeatherId, WeatherConfig> = {
    sunny: {
      id: 'sunny',
      name: 'Sunny',
      icon: '☀️',
      shortMod: '+12% Speed',
      modLabel: '+12% Dig Speed',
      desc: 'Warm sunbeams energize your pack to walk and dig 12% faster.',
      digSpeedMult: 1.12,
      treasureMult: 1,
      magicAdd: 0,
      xpMult: 1
    },
    windy: {
      id: 'windy',
      name: 'Windy',
      icon: '🍃',
      shortMod: '+25% Treasure',
      modLabel: '+25% Treasure Odds',
      desc: 'Crisp gusts scatter leaves and uncover 25% more rare treasures.',
      digSpeedMult: 1,
      treasureMult: 1.25,
      magicAdd: 0,
      xpMult: 1
    },
    rain: {
      id: 'rain',
      name: 'Gentle Rain',
      icon: '🌧️',
      shortMod: '+3% ✨ Magic',
      modLabel: '+3% Magic Chance',
      desc: 'Soft, soothing showers boost ✨ Magic Bone odds by +3% on digs & taps.',
      digSpeedMult: 1,
      treasureMult: 1,
      magicAdd: 0.03,
      xpMult: 1
    },
    twilight: {
      id: 'twilight',
      name: 'Cozy Twilight',
      icon: '🌙',
      shortMod: '+15% Pup XP',
      modLabel: '+15% Pup XP',
      desc: 'Fireflies gather under evening skies, granting pups +15% bonus XP from digs & pets.',
      digSpeedMult: 1,
      treasureMult: 1,
      magicAdd: 0,
      xpMult: 1.15
    }
  };

  function getHourBucket(ts = Date.now()): number {
    return Math.floor(ts / 3600000);
  }

  function getWeatherIdForHour(hourBucket: number): WeatherId {
    const h = Math.abs(Math.floor(hourBucket));
    const localHour = new Date(h * 3600000).getHours();
    const isTwilightHours = localHour >= 18 || localHour < 6;
    const primaryClearWeather: WeatherId = isTwilightHours ? 'twilight' : 'sunny';
    const roll = ((h * 2654435761) >>> 16) % 4;
    if (roll === 0 || roll === 2) {
      return primaryClearWeather;
    }
    return roll === 1 ? 'windy' : 'rain';
  }

  let currentWeatherHour = getHourBucket();

  function getCurrentWeather(): WeatherConfig {
    return WEATHER_TYPES[getWeatherIdForHour(currentWeatherHour)];
  }

  function getNextWeatherInfo(nowMs = Date.now()): { next: WeatherConfig; msRemaining: number } {
    const nextHour = currentWeatherHour + 1;
    const msRemaining = Math.max(0, nextHour * 3600000 - nowMs);
    return {
      next: WEATHER_TYPES[getWeatherIdForHour(nextHour)],
      msRemaining
    };
  }

  type RgbTuple = [number, number, number];

  interface SkyKeyframe {
    hour: number;
    top: RgbTuple;
    mid: RgbTuple;
    bot: RgbTuple;
    glow: RgbTuple;
    glowAlpha: number;
    sunMix: number;
    moonMix: number;
    starMix: number;
  }

  const SKY_KEYFRAMES: SkyKeyframe[] = [
    { hour: 0.0,   top: [7, 8, 22],    mid: [14, 15, 39],  bot: [24, 22, 54],   glow: [120, 140, 215], glowAlpha: 0.06, sunMix: 0,    moonMix: 1.0,  starMix: 1.0 },
    { hour: 4.75,  top: [11, 12, 34],  mid: [24, 24, 58],  bot: [48, 39, 84],   glow: [195, 130, 165], glowAlpha: 0.11, sunMix: 0.12, moonMix: 0.85, starMix: 0.75 },
    { hour: 6.25,  top: [34, 48, 102],  mid: [102, 92, 142],  bot: [204, 136, 118], glow: [255, 186, 128], glowAlpha: 0.24, sunMix: 0.78, moonMix: 0.28, starMix: 0.14 },
    { hour: 8.0,   top: [54, 118, 194], mid: [98, 162, 224],  bot: [164, 206, 238], glow: [255, 232, 174], glowAlpha: 0.16, sunMix: 1.0,  moonMix: 0.03, starMix: 0 },
    { hour: 12.5,  top: [46, 122, 206], mid: [94, 168, 232],  bot: [158, 212, 244], glow: [255, 244, 204], glowAlpha: 0.14, sunMix: 1.0,  moonMix: 0,    starMix: 0 },
    { hour: 16.25, top: [52, 112, 186], mid: [102, 156, 214], bot: [168, 194, 222], glow: [255, 218, 158], glowAlpha: 0.17, sunMix: 0.94, moonMix: 0.06, starMix: 0 },
    { hour: 18.0,  top: [28, 24, 64],  mid: [104, 56, 94], bot: [198, 104, 78], glow: [255, 148, 96],  glowAlpha: 0.27, sunMix: 0.7,  moonMix: 0.42, starMix: 0.2 },
    { hour: 19.6,  top: [17, 15, 44],  mid: [48, 36, 86],  bot: [92, 54, 98],   glow: [175, 132, 224], glowAlpha: 0.15, sunMix: 0.1,  moonMix: 0.85, starMix: 0.72 },
    { hour: 21.25, top: [8, 9, 24],    mid: [16, 17, 44],  bot: [26, 24, 58],   glow: [124, 146, 222], glowAlpha: 0.07, sunMix: 0,    moonMix: 1.0,  starMix: 1.0 },
    { hour: 24.0,  top: [7, 8, 22],    mid: [14, 15, 39],  bot: [24, 22, 54],   glow: [120, 140, 215], glowAlpha: 0.06, sunMix: 0,    moonMix: 1.0,  starMix: 1.0 }
  ];

  function lerpNum(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  function lerpRgb(a: RgbTuple, b: RgbTuple, t: number): RgbTuple {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  function rgbaStr(rgb: RgbTuple, alpha: number): string {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
  }

  function getLocalHourFloat(nowMs = Date.now()): number {
    const d = new Date(nowMs);
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }

  function getTimeOfDayInfo(nowMs = Date.now()): { name: string; icon: string; hourFloat: number } {
    const h = getLocalHourFloat(nowMs);
    if (h >= 5.0 && h < 7.5) return { name: 'Sunrise', icon: '🌅', hourFloat: h };
    if (h >= 7.5 && h < 11.75) return { name: 'Morning', icon: '🌤️', hourFloat: h };
    if (h >= 11.75 && h < 16.5) return { name: 'Afternoon', icon: '☀️', hourFloat: h };
    if (h >= 16.5 && h < 19.0) return { name: 'Sunset', icon: '🌇', hourFloat: h };
    if (h >= 19.0 && h < 21.25) return { name: 'Dusk', icon: '🌆', hourFloat: h };
    return { name: 'Night', icon: '🌌', hourFloat: h };
  }

  function getMoonPhaseInfo(nowMs = Date.now()): {
    phase: number;
    illumination: number;
    name: string;
    icon: string;
  } {
    const SYNODIC_MONTH_DAYS = 29.53058867;
    const SYNODIC_MONTH_MS = SYNODIC_MONTH_DAYS * 86400000;
    const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

    // Continuous lunar phase for smooth sky moon terminator & illumination
    const raw = (nowMs - KNOWN_NEW_MOON_MS) / SYNODIC_MONTH_MS;
    const phase = ((raw % 1) + 1) % 1;
    const illumination = 0.5 * (1 - Math.cos(phase * Math.PI * 2));

    // Anchor named phase to the local calendar day (local noon) so it never flips mid-day
    const localDate = new Date(nowMs);
    const localNoonMs = new Date(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate(),
      12,
      0,
      0,
      0
    ).getTime();
    const dayRaw = (localNoonMs - KNOWN_NEW_MOON_MS) / SYNODIC_MONTH_MS;
    const dayPhase = ((dayRaw % 1) + 1) % 1;

    // Primary phases (New, First Quarter, Full, Last Quarter) span the 1 calendar day containing the exact phase instant
    const primaryHalfWindow = 0.5 / SYNODIC_MONTH_DAYS;

    let name = 'New Moon';
    let icon = '🌑';
    if (dayPhase < primaryHalfWindow || dayPhase >= 1 - primaryHalfWindow) {
      name = 'New Moon';
      icon = '🌑';
    } else if (dayPhase < 0.25 - primaryHalfWindow) {
      name = 'Waxing Crescent';
      icon = '🌒';
    } else if (dayPhase < 0.25 + primaryHalfWindow) {
      name = 'First Quarter';
      icon = '🌓';
    } else if (dayPhase < 0.5 - primaryHalfWindow) {
      name = 'Waxing Gibbous';
      icon = '🌔';
    } else if (dayPhase < 0.5 + primaryHalfWindow) {
      name = 'Full Moon';
      icon = '🌕';
    } else if (dayPhase < 0.75 - primaryHalfWindow) {
      name = 'Waning Gibbous';
      icon = '🌖';
    } else if (dayPhase < 0.75 + primaryHalfWindow) {
      name = 'Last Quarter';
      icon = '🌗';
    } else {
      name = 'Waning Crescent';
      icon = '🌘';
    }

    return { phase, illumination, name, icon };
  }

  function sampleTimeOfDaySky(hourFloat: number): SkyKeyframe {
    for (let i = 0; i < SKY_KEYFRAMES.length - 1; i++) {
      const a = SKY_KEYFRAMES[i];
      const b = SKY_KEYFRAMES[i + 1];
      if (hourFloat >= a.hour && hourFloat <= b.hour) {
        const span = Math.max(0.001, b.hour - a.hour);
        const rawT = (hourFloat - a.hour) / span;
        const t = rawT * rawT * (3 - 2 * rawT);
        return {
          hour: hourFloat,
          top: lerpRgb(a.top, b.top, t),
          mid: lerpRgb(a.mid, b.mid, t),
          bot: lerpRgb(a.bot, b.bot, t),
          glow: lerpRgb(a.glow, b.glow, t),
          glowAlpha: lerpNum(a.glowAlpha, b.glowAlpha, t),
          sunMix: lerpNum(a.sunMix, b.sunMix, t),
          moonMix: lerpNum(a.moonMix, b.moonMix, t),
          starMix: lerpNum(a.starMix, b.starMix, t)
        };
      }
    }
    return SKY_KEYFRAMES[0];
  }

  type HappinessTierId = 'cozy' | 'happy' | 'joyful' | 'ecstatic';

  interface HappinessInfo {
    value: number;
    roundedPct: number;
    floor: number;
    tier: HappinessTierId;
    name: string;
    icon: string;
    boneMult: number;
    xpMult: number;
    paceMult: number;
    magicAdd: number;
    wagMult: number;
    wagAmp: number;
    shortBonus: string;
    bonusSummary: string;
  }

  function getToyFloorBreakdown(): {
    ownedCount: number;
    floorBonus: number;
  } {
    let ownedCount = 0;
    let floorBonus = 0;
    if (state.hasTennisBall) {
      ownedCount += 1;
      floorBonus += 3 + Math.min(2, Math.floor(Math.max(0, state.digPower - BASE_DIG_POWER) / 8));
    }
    if (state.hasDuck) {
      ownedCount += 1;
      floorBonus += 3 + Math.min(2, Math.floor(Math.max(0, state.idleMultiplier - BASE_IDLE_MULTIPLIER) / 0.15));
    }
    if (state.hasFrisbee) {
      ownedCount += 1;
      floorBonus += 3 + Math.min(2, Math.floor(Math.max(0, state.speedMultiplier - BASE_SPEED_MULTIPLIER) / 0.25));
    }
    return { ownedCount, floorBonus };
  }

  function getDecorFloorBonus(): number {
    return getDecorBonuses().cozyFloorBonus;
  }

  function getCozyFloor(): number {
    const toyFloor = getToyFloorBreakdown().floorBonus;
    const decorFloor = getDecorFloorBonus();
    return Math.min(HAPPINESS_MAX_FLOOR, Math.round((HAPPINESS_BASE_FLOOR + toyFloor + decorFloor) * 10) / 10);
  }

  function getHappinessTierIndex(value: number): number {
    if (value >= 90) return 3;
    if (value >= 70) return 2;
    if (value >= 50) return 1;
    return 0;
  }

  function getPackHappinessInfo(): HappinessInfo {
    const floor = getCozyFloor();
    const raw = typeof state.packHappiness === 'number' && !Number.isNaN(state.packHappiness)
      ? state.packHappiness
      : floor;
    const value = Math.max(floor, Math.min(HAPPINESS_MAX, raw));
    const roundedPct = Math.round(value);

    if (value >= 90) {
      return {
        value,
        roundedPct,
        floor,
        tier: 'ecstatic',
        name: 'Ecstatic',
        icon: '🌟',
        boneMult: 1.18,
        xpMult: 1.15,
        paceMult: 1.08,
        magicAdd: 0.02,
        wagMult: 1.48,
        wagAmp: 1.35,
        shortBonus: '+18%',
        bonusSummary: '+18% Bones | +15% XP | +8% Pace | +2% ✨'
      };
    }
    if (value >= 70) {
      return {
        value,
        roundedPct,
        floor,
        tier: 'joyful',
        name: 'Joyful',
        icon: '💛',
        boneMult: 1.10,
        xpMult: 1.10,
        paceMult: 1.04,
        magicAdd: 0,
        wagMult: 1.26,
        wagAmp: 1.2,
        shortBonus: '+10%',
        bonusSummary: '+10% Bones & XP | +4% Pace'
      };
    }
    if (value >= 50) {
      return {
        value,
        roundedPct,
        floor,
        tier: 'happy',
        name: 'Happy',
        icon: '🙂',
        boneMult: 1.05,
        xpMult: 1.05,
        paceMult: 1.0,
        magicAdd: 0,
        wagMult: 1.12,
        wagAmp: 1.08,
        shortBonus: '+5%',
        bonusSummary: '+5% Bones & XP'
      };
    }
    return {
      value,
      roundedPct,
      floor,
      tier: 'cozy',
      name: 'Cozy',
      icon: '😌',
      boneMult: 1.0,
      xpMult: 1.0,
      paceMult: 1.0,
      magicAdd: 0,
      wagMult: 1.0,
      wagAmp: 1.0,
      shortBonus: `${roundedPct}%`,
      bonusSummary: 'Base cozy mood'
    };
  }

  function addPackHappiness(delta: number, _announceTierUp = true): void {
    const floor = getCozyFloor();
    const prev = Math.max(floor, Math.min(HAPPINESS_MAX, Number(state.packHappiness) || floor));
    const prevTier = getHappinessTierIndex(prev);
    const next = Math.max(floor, Math.min(HAPPINESS_MAX, prev + delta));
    state.packHappiness = next;

    const nextTier = getHappinessTierIndex(next);
    if (nextTier !== prevTier) {
      updateUI();
    } else if (Math.round(next) !== Math.round(prev)) {
      refreshMoodHUD();
    }
  }

  function getActiveXpBoostMult(): number {
    const treatMult = state.xpTreatTimer > 0
      ? 1 + (TREAT_CONFIG.treatXp.xpBonus || 1.0)
      : 1;
    return treatMult * getDecorBonuses().xpMult * getCurrentWeather().xpMult * getPackHappinessInfo().xpMult;
  }

  function getActiveCupMult(overrideActive?: boolean): number {
    const active = typeof overrideActive === 'boolean' ? overrideActive : state.pupCupTimer > 0;
    return active ? 1 + TREAT_CONFIG.treatCup.payoutBonus : 1;
  }

  function getActiveFeastAndBaconMult(overrideFeast?: boolean, overrideBacon?: boolean): number {
    let mult = 1;
    const feastActive = typeof overrideFeast === 'boolean' ? overrideFeast : state.feastTimer > 0;
    if (feastActive) {
      mult *= 1 + TREAT_CONFIG.treatFeast.payoutBonus;
    }
    const baconActive = typeof overrideBacon === 'boolean' ? overrideBacon : state.baconTimer > 0;
    if (baconActive) {
      mult *= 1 + TREAT_CONFIG.treatBacon.payoutBonus;
    }
    return mult;
  }

  function getActiveBaconPaceMult(overrideBacon?: boolean): number {
    const baconActive = typeof overrideBacon === 'boolean' ? overrideBacon : state.baconTimer > 0;
    return baconActive ? 1 + (TREAT_CONFIG.treatBacon.paceBonus || 0.35) : 1;
  }

  const tennisBall = { gx: 3.5, gy: 3.5, targetGx: 3.5, targetGy: 3.5, isRolling: false, timer: 6.0, bouncePhase: 0 };
  const frisbee = { gx: 2.0, gy: 5.0, targetGx: 2.0, targetGy: 5.0, isMoving: false, timer: 7.5 };
  const duck = { gx: 5.0, gy: 5.0, targetGx: 5.0, targetGy: 5.0, isMoved: false, timer: 5.5, quackPhase: 0 };

  let parkBarkCooldown = PARK_BARK_MIN_COOLDOWN + Math.random() * (PARK_BARK_MAX_COOLDOWN - PARK_BARK_MIN_COOLDOWN);
  const barkPopups: Array<{
    dog: Dog;
    baseOffsetY: number;
    fallbackX: number;
    fallbackY: number;
    text: string;
    age: number;
    duration: number;
  }> = [];

  const floatingTexts: Array<{
    x: number;
    y: number;
    text: string;
    color: string;
    age: number;
    duration: number;
  }> = [];

  const tileRipples: Array<{
    gx: number;
    gy: number;
    age: number;
    duration: number;
    color: string;
  }> = [];

  const fireflies = Array.from({ length: 28 }, (_, idx) => ({
    gx: 0.4 + Math.random() * 6.2,
    gy: 0.4 + Math.random() * 6.2,
    height: 18 + Math.random() * 44,
    phase: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 0.7,
    twilightOnly: idx >= 14
  }));

  const skyStars = Array.from({ length: 42 }, () => ({
    x: 0.04 + Math.random() * 0.92,
    y: 0.04 + Math.random() * 0.54,
    r: 0.65 + Math.random() * 1.15,
    phase: Math.random() * Math.PI * 2,
    speed: 0.65 + Math.random() * 1.15,
    alpha: 0.35 + Math.random() * 0.45
  }));

  const weatherWeights: Record<WeatherId, number> = {
    sunny: 0,
    windy: 0,
    rain: 0,
    twilight: 0
  };
  weatherWeights[getCurrentWeather().id] = 1;

  const sunMotes = Array.from({ length: 20 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 1.5 + Math.random() * 2.3,
    speedY: -0.012 - Math.random() * 0.018,
    drift: Math.random() * Math.PI * 2,
    phase: Math.random() * Math.PI * 2
  }));

  const LEAF_COLORS = ['#e17055', '#fdcb6e', '#55efc4', '#fab1a0', '#f39c12'];
  const windLeaves = Array.from({ length: 24 }, () => ({
    x: Math.random(),
    y: Math.random(),
    vx: 0.08 + Math.random() * 0.08,
    vy: 0.045 + Math.random() * 0.055,
    size: 4 + Math.random() * 3.5,
    rot: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 3.2,
    sway: Math.random() * Math.PI * 2,
    color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)]
  }));

  const windGusts = Array.from({ length: 5 }, (_, idx) => ({
    x: Math.random(),
    y: 0.14 + idx * 0.17,
    len: 70 + Math.random() * 60,
    speed: 0.35 + Math.random() * 0.25,
    phase: Math.random() * Math.PI * 2
  }));

  const rainDrops = Array.from({ length: 56 }, () => ({
    x: Math.random(),
    y: Math.random(),
    len: 12 + Math.random() * 12,
    speed: 0.72 + Math.random() * 0.38
  }));

  const rainSplashes = Array.from({ length: 12 }, () => ({
    gx: 0.4 + Math.random() * (GRID_SIZE - 0.8),
    gy: 0.4 + Math.random() * (GRID_SIZE - 0.8),
    age: Math.random() * 0.7,
    duration: 0.55 + Math.random() * 0.25
  }));

  let pendingRetireDogId: string | null = null;
  let pendingRerollDogId: string | null = null;
  let queuedAwayProgress: { actualEarned: number; estimatedDigs: number; foundTreasure: PerkItem | null } | null = null;

  function addFloatingText(x: number, y: number, text: string, color = '#ffeaa7'): void {
    floatingTexts.push({ x, y, text, color, age: 0, duration: 0.85 });
    if (floatingTexts.length > 24) {
      floatingTexts.shift();
    }
  }

  function showBoneCapCongratsModal(): void {
    const modal = document.getElementById('boneCapModal');
    const text = document.getElementById('boneCapModalText');
    if (text) {
      text.textContent = `Congratulations! You reached the maximum cap of ${MAX_BONES.toLocaleString()} Bones. Spend some bones on dogs, toys, or treats to collect more bones!`;
    }
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  document.getElementById('btnCloseBoneCap')?.addEventListener('click', () => {
    initAudio();
    const modal = document.getElementById('boneCapModal');
    if (modal) modal.style.display = 'none';
  });

  function triggerBoneCapMessageOnce(): void {
    if (!state.boneCapEverShown) {
      state.boneCapEverShown = true;
      state.boneCapReachedNotified = true;
      showBoneCapCongratsModal();
    }
  }

  function awardRetirementBones(amount: number): number {
    const safeRefund = Math.max(0, Math.floor(Number(amount) || 0));
    if (safeRefund <= 0) return 0;

    if (typeof state.lifetimeBones !== 'number' || Number.isNaN(state.lifetimeBones)) {
      state.lifetimeBones = 0;
    }

    const currentBones = Math.max(0, Number(state.bones) || 0);
    state.bones = currentBones + safeRefund;
    state.lifetimeBones += safeRefund;
    return safeRefund;
  }

  function addRegularBones(rawAmount: number): number {
    const amount = Math.max(0, Number(rawAmount) || 0);
    if (amount <= 0) return 0;

    if (typeof state.lifetimeBones !== 'number' || Number.isNaN(state.lifetimeBones)) {
      state.lifetimeBones = 0;
    }

    const currentBones = Math.max(0, Number(state.bones) || 0);
    if (currentBones >= MAX_BONES) {
      triggerBoneCapMessageOnce();
      return 0;
    }

    const spaceLeft = MAX_BONES - currentBones;
    const added = Math.min(amount, spaceLeft);
    state.bones = currentBones + added;
    state.lifetimeBones += added;

    if (state.bones >= MAX_BONES) {
      state.bones = MAX_BONES;
      triggerBoneCapMessageOnce();
    }

    return added;
  }

  function addMagicBones(rawAmount: number): number {
    const amount = Math.max(0, Number(rawAmount) || 0);
    if (amount <= 0) return 0;
    if (typeof state.lifetimeBones !== 'number' || Number.isNaN(state.lifetimeBones)) {
      state.lifetimeBones = 0;
    }
    state.magicBones = (Number(state.magicBones) || 0) + amount;
    state.lifetimeBones += amount;
    return amount;
  }

  function spendRegularBones(cost: number): void {
    const amt = Math.max(0, Number(cost) || 0);
    state.bones = Math.max(0, (Number(state.bones) || 0) - amt);
    if (state.bones < MAX_BONES) {
      state.boneCapReachedNotified = false;
    }
  }

  function syncBreedCountsFromRoster(): void {
    Object.keys(state.dogs).forEach(b => {
      state.dogs[b] = 0;
    });
    state.shinyDogs = [];

    state.roster.forEach(entry => {
      if (entry.isShiny) {
        state.shinyDogs.push({ breed: entry.breed, color: entry.shinyColor });
      } else if (state.dogs[entry.breed] !== undefined) {
        state.dogs[entry.breed]++;
      }
    });
  }

  function getTotalDogs(): number {
    return state.roster.length;
  }

  function getPerkMultipliers(): { boneMult: number; workBonus: number; magicBonus: number } {
    let boneMult = 1;
    let workBonus = 1;
    let magicBonus = 0;
    state.perks.forEach(p => {
      if (p.mult) boneMult *= p.mult;
      if (p.workMult) workBonus *= p.workMult;
      if (p.magicAdd) magicBonus += p.magicAdd;
    });
    return { boneMult, workBonus, magicBonus };
  }

  function getDogDugScaling(entry: RosterEntry): number {
    const rawDug = entry && entry.bonesEarned ? entry.bonesEarned : 0;
    if (rawDug <= 0) return 0;
    const dug = Math.min(PACK_GROWTH_DUG_CAP, rawDug);
    const stats = getEffectiveBreedStats(entry);
    return Math.sqrt(dug) * DIG_MULT_SQRT_SCALE * stats.packGrowth;
  }

  function getPackGrowthBonus(): number {
    let dugSum = 0;
    state.roster.forEach(r => {
      dugSum += getDogDugScaling(r);
    });
    return dugSum;
  }

  function getDigMultiplier(overrides?: { feastActive?: boolean; baconActive?: boolean }): number {
    const dugSum = getPackGrowthBonus();
    const { boneMult, workBonus } = getPerkMultipliers();
    const treatDigMult = getActiveFeastAndBaconMult(overrides?.feastActive, overrides?.baconActive);
    const decorMult = getDecorBonuses().payoutMult;
    const moodBoneMult = getPackHappinessInfo().boneMult;
    return (DIG_MULT_BASE + dugSum) * state.speedMultiplier * treatDigMult * workBonus * boneMult * decorMult * moodBoneMult;
  }

  function getAverageBonesPerDig(): number {
    if (!state.roster || state.roster.length === 0) return state.digPower;
    const cupMult = getActiveCupMult();
    const packDigMult = getDigMultiplier();

    let total = 0;
    state.roster.forEach(entry => {
      const stats = getEffectiveBreedStats(entry);
      const levelMult = getDogLevelBonusMult(entry);
      const raw = state.digPower * stats.boneYield * levelMult * cupMult * packDigMult;
      total += Math.max(1, Math.round(raw * 10) / 10);
    });

    return total / state.roster.length;
  }

  function getEstimatedPackRates(overrides?: {
    cupActive?: boolean;
    feastActive?: boolean;
    baconActive?: boolean;
    kongActive?: boolean;
  }): { bonesPerMin: number; magicPerHour: number; digsPerMin: number } {
    if (!state.roster || state.roster.length === 0) return { bonesPerMin: 0, magicPerHour: 0, digsPerMin: 0 };
    const cupMult = getActiveCupMult(overrides?.cupActive);
    const packDigMult = getDigMultiplier({
      feastActive: overrides?.feastActive,
      baconActive: overrides?.baconActive
    });
    const baconPaceMult = getActiveBaconPaceMult(overrides?.baconActive);
    const kongActive = typeof overrides?.kongActive === 'boolean' ? overrides.kongActive : state.kongTimer > 0;
    const { workBonus, magicBonus } = getPerkMultipliers();
    const decorBonuses = getDecorBonuses();
    const decorMagic = decorBonuses.magicAdd;
    const weather = getCurrentWeather();
    const moodInfo = getPackHappinessInfo();

    const visualPace = Math.min(1.6, 1 + Math.log1p(Math.max(0, workBonus - 1)) * 0.25) * weather.digSpeedMult * moodInfo.paceMult * baconPaceMult * decorBonuses.paceMult;
    const sleepDetours = 0.28 / 0.72;
    const avgIdleSec = 1.2 / visualPace;
    const avgSleepOverheadSec = sleepDetours * (4.6 / baconPaceMult + 1.4 / visualPace);

    let bonesPerMin = 0;
    let magicPerHour = 0;
    let totalDigsPerMin = 0;
    state.roster.forEach(entry => {
      const stats = getEffectiveBreedStats(entry);
      const levelMult = getDogLevelBonusMult(entry);
      const rawBones = state.digPower * stats.boneYield * levelMult * cupMult * packDigMult;
      const bonesPerRegularDig = Math.max(1, Math.round(rawBones * 10) / 10);

      const avgWalkSec = 2.92 / (Math.max(0.5, stats.walkMult || 1.1) * visualPace);
      const avgDigSec = (stats.digSec || 1.5) / visualPace;
      const cycleSec = avgIdleSec + avgSleepOverheadSec + avgWalkSec + avgDigSec;
      const digsPerMin = 60 / Math.max(0.5, cycleSec);
      totalDigsPerMin += digsPerMin;

      const magicChanceTotal = Math.min(
        0.9,
        state.magicChance + magicBonus + decorMagic + weather.magicAdd + moodInfo.magicAdd + (stats.magicBonus || 0)
      );
      const magicPerDrop = 1 + (entry.isShiny ? SHINY_MAGIC_BONE_BONUS : 0);
      if (kongActive) {
        bonesPerMin += digsPerMin * bonesPerRegularDig;
        magicPerHour += digsPerMin * 60 * magicPerDrop;
      } else {
        const regularShare = Math.max(0, 1 - magicChanceTotal);
        bonesPerMin += digsPerMin * regularShare * bonesPerRegularDig;
        magicPerHour += digsPerMin * 60 * magicChanceTotal * magicPerDrop;
      }
    });

    return { bonesPerMin, magicPerHour, digsPerMin: totalDigsPerMin };
  }

  function estimateOfflineDigs(seconds: number): number {
    if (!state.roster || state.roster.length === 0 || seconds <= 0) return 0;
    const { workBonus } = getPerkMultipliers();
    const cadenceFactor = Math.min(2.0, Math.sqrt(Math.max(1, workBonus)));

    let totalDigs = 0;
    state.roster.forEach(entry => {
      const cfg = BREED_CONFIG[entry.breed] || BREED_CONFIG.aussie;
      const estWalkSec = 1.6 / Math.max(0.5, cfg.walkMult || 1.0);
      const estIdleSec = 1.0;
      const avgCycleSec = Math.max(0.8, (estIdleSec + estWalkSec + (cfg.digSec || 1.0)) / cadenceFactor);
      totalDigs += seconds / avgCycleSec;
    });

    return Math.max(1, Math.floor(totalDigs));
  }

  function rollOfflineTreasure(): PerkItem | null {
    if (!Array.isArray(PERK_POOL) || PERK_POOL.length === 0) return null;
    const shuffled = [...PERK_POOL].sort(() => 0.5 - Math.random());
    const rolledThree = shuffled.slice(0, Math.min(3, shuffled.length));
    const chosenPerk = rolledThree[Math.floor(Math.random() * rolledThree.length)];
    if (!chosenPerk) return null;

    const perkCopy = { ...chosenPerk };
    state.perks.push(perkCopy);
    return perkCopy;
  }

  function isModalCurrentlyOpen(modalId: string): boolean {
    const el = document.getElementById(modalId);
    if (!el) return false;
    const styleDisplay = el.style.display;
    if (styleDisplay && styleDisplay !== 'none') return true;
    return window.getComputedStyle(el).display !== 'none';
  }

  function flushQueuedAwayProgressIfReady(): void {
    if (!queuedAwayProgress) return;
    if (state.isDraftingPerk || isModalCurrentlyOpen('perkModal') || isModalCurrentlyOpen('offlineModal')) {
      return;
    }
    const { actualEarned, estimatedDigs, foundTreasure } = queuedAwayProgress;
    queuedAwayProgress = null;
    updateUI();
    showOfflineModal(actualEarned, estimatedDigs, foundTreasure);
  }

  function settleAwayProgressSinceLastSave(now = Date.now()): boolean {
    if (typeof state.lastSaveTime !== 'number' || Number.isNaN(state.lastSaveTime)) {
      state.lastSaveTime = now;
      return false;
    }

    const rawElapsedSeconds = (now - state.lastSaveTime) / 1000;
    state.lastSaveTime = now;

    if (rawElapsedSeconds <= AWAY_MIN_SECONDS) {
      return false;
    }

    const effectiveSeconds = Math.min(rawElapsedSeconds, MAX_OFFLINE_SECONDS);
    const cozyFloor = getCozyFloor();
    const currentMood = typeof state.packHappiness === 'number' && !Number.isNaN(state.packHappiness)
      ? Math.max(cozyFloor, Math.min(HAPPINESS_MAX, state.packHappiness))
      : cozyFloor;
    const awayDrop = (effectiveSeconds / 3600) * HAPPINESS_OFFLINE_RATE_PER_HOUR;
    state.packHappiness = Math.max(cozyFloor, currentMood - awayDrop);

    const estimatedDigs = estimateOfflineDigs(effectiveSeconds);
    const avgPerDig = getAverageBonesPerDig();
    const earned = Math.floor(estimatedDigs * avgPerDig * state.idleMultiplier);

    const offlineTreasureChance = Math.min(0.035, 0.002 + estimatedDigs * 0.0000015);
    const foundTreasure = Math.random() < offlineTreasureChance ? rollOfflineTreasure() : null;

    const actualEarned = earned > 0 ? addRegularBones(earned) : 0;
    if (actualEarned > 0 || foundTreasure) {
      updateUI();
      if (state.isDraftingPerk || isModalCurrentlyOpen('perkModal') || isModalCurrentlyOpen('offlineModal')) {
        if (queuedAwayProgress) {
          queuedAwayProgress.actualEarned += actualEarned;
          queuedAwayProgress.estimatedDigs += estimatedDigs;
          if (foundTreasure) {
            queuedAwayProgress.foundTreasure = foundTreasure;
          }
        } else {
          queuedAwayProgress = { actualEarned, estimatedDigs, foundTreasure };
        }
      } else {
        showOfflineModal(actualEarned, estimatedDigs, foundTreasure);
      }
      return true;
    }

    return false;
  }

  let viewportW = 360;
  let viewportH = 640;
  let originX = 0;
  let originY = 0;
  let cameraAngle = 0;
  let cameraVelocity = 0;
  let userZoom = 1;
  let autoFitScale = 1;

  function getScale(): number {
    return autoFitScale * userZoom;
  }

  function getTileW(): number {
    return BASE_TILE_W * getScale();
  }

  function getTileH(): number {
    return BASE_TILE_H * getScale();
  }

  const mushrooms: Array<{
    gx: number;
    gy: number;
    label: string;
    color: string;
    capDark: string;
    glow: string;
  }> = [
    { gx: 2, gy: 2, label: 'Lavender Shrooms', color: '#a29bfe', capDark: '#6c5ce7', glow: 'rgba(162, 155, 254, 0.42)' },
    { gx: 4, gy: 2, label: 'Rose Shrooms', color: '#fd79a8', capDark: '#d6306e', glow: 'rgba(253, 121, 168, 0.42)' },
    { gx: 2, gy: 4, label: 'Mint Shrooms', color: '#55efc4', capDark: '#00a383', glow: 'rgba(85, 239, 196, 0.42)' },
    { gx: 4, gy: 4, label: 'Gold Shrooms', color: '#ffeaa7', capDark: '#e1a12b', glow: 'rgba(255, 234, 167, 0.44)' }
  ];

  function getDecorFootprint(type: DecorType, gx: number, gy: number): Array<{ gx: number; gy: number }> {
    const width = DECOR_CONFIG[type]?.tileWidth || 1;
    const tiles: Array<{ gx: number; gy: number }> = [];
    for (let dx = 0; dx < width; dx++) {
      tiles.push({ gx: gx + dx, gy });
    }
    return tiles;
  }

  function getOccupiedTileMap(): Map<string, string> {
    const occupied = new Map<string, string>();
    occupied.set(`${DOGHOUSE_TILE.gx},${DOGHOUSE_TILE.gy}`, 'Doghouse');

    const sp = state.starterProps || createDefaultStarterProps();
    if (sp.showTree) {
      occupied.set(`${STARTER_TREE_TILE.gx},${STARTER_TREE_TILE.gy}`, 'Starter Tree');
    }
    mushrooms.forEach((m, idx) => {
      if (sp.showMushrooms[idx] !== false) {
        occupied.set(`${m.gx},${m.gy}`, m.label);
      }
    });

    if (Array.isArray(state.placedDecorations)) {
      state.placedDecorations.forEach(dec => {
        getDecorFootprint(dec.type, dec.gx, dec.gy).forEach(t => {
          occupied.set(`${t.gx},${t.gy}`, dec.type);
        });
      });
    }
    return occupied;
  }

  function resolvePlacementAnchor(
    type: DecorType,
    rawGx: number,
    rawGy: number
  ): { ok: true; gx: number; gy: number } | { ok: false; gx: number; gy: number; reason: string } {
    const tx = clampTileIndex(rawGx);
    const ty = clampTileIndex(rawGy);
    const occupied = getOccupiedTileMap();
    const width = DECOR_CONFIG[type]?.tileWidth || 1;

    if (width === 1) {
      if (occupied.has(`${tx},${ty}`)) {
        return { ok: false, gx: tx, gy: ty, reason: 'That tile is occupied — tap an open tile!' };
      }
      return { ok: true, gx: tx, gy: ty };
    }

    // 2-tile wide placement (Dog Slide): try (tx, ty) + (tx+1, ty), or shift left to (tx-1, ty) + (tx, ty)
    const candidates: number[] = [];
    if (tx <= GRID_SIZE - width) {
      candidates.push(tx);
    }
    if (tx - 1 >= 0 && tx - 1 <= GRID_SIZE - width) {
      candidates.push(tx - 1);
    }

    for (const anchorX of candidates) {
      const footprint = getDecorFootprint(type, anchorX, ty);
      const fits = footprint.every(
        t => t.gx >= 0 && t.gx < GRID_SIZE && t.gy >= 0 && t.gy < GRID_SIZE && !occupied.has(`${t.gx},${t.gy}`)
      );
      if (fits) {
        return { ok: true, gx: anchorX, gy: ty };
      }
    }

    return {
      ok: false,
      gx: tx,
      gy: ty,
      reason: 'Dog Slide needs 2 open tiles side-by-side!'
    };
  }

  // Deterministic grass tuft positions per tile for organic texture
  const tileDetails: Array<{ gx: number; gy: number; tufts: Array<{ dx: number; dy: number; h: number }> }> = [];
  for (let gx = 0; gx < GRID_SIZE; gx++) {
    for (let gy = 0; gy < GRID_SIZE; gy++) {
      const seed = ((gx + 1) * 73856093) ^ ((gy + 1) * 19349663);
      if ((seed & 3) === 0) {
        tileDetails.push({
          gx,
          gy,
          tufts: [
            { dx: ((seed >> 2) % 3) * 0.14 + 0.25, dy: ((seed >> 4) % 3) * 0.14 + 0.25, h: 4 + (seed % 3) },
            { dx: ((seed >> 6) % 3) * 0.12 + 0.52, dy: ((seed >> 8) % 3) * 0.12 + 0.48, h: 3 + ((seed >> 1) % 3) }
          ]
        });
      }
    }
  }

  const dogs: Dog[] = [];
  const droppedBones: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    groundY: number;
    age: number;
    isMagic: boolean;
    value: number;
  }> = [];
  const particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
    isRing?: boolean;
    isHeart?: boolean;
  }> = [];

  function rebuildCanvasDogsFromRoster(): void {
    dogs.length = 0;
    state.roster.forEach(entry => {
      dogs.push(new Dog(
        1.5 + Math.random() * 4,
        1.5 + Math.random() * 4,
        entry.id,
        entry.breed,
        Boolean(entry.isShiny),
        entry.shinyColor || null
      ));
    });
  }

  function loadGame(): void {
    const saved = localStorage.getItem('pupperpark_save');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
        if (typeof state.lifetimeBones !== 'number' || Number.isNaN(state.lifetimeBones)) {
          state.lifetimeBones = Math.max(0, state.bones || 0);
        }
        if (typeof state.boneCapEverShown !== 'boolean') {
          state.boneCapEverShown = Boolean(state.boneCapReachedNotified);
        }
        if (typeof state.boneCapReachedNotified !== 'boolean') {
          state.boneCapReachedNotified = state.boneCapEverShown || (state.bones || 0) >= MAX_BONES;
        }
        if (typeof state.showNameTags !== 'boolean') {
          state.showNameTags = true;
        }
        if (typeof state.soundEnabled !== 'boolean') {
          state.soundEnabled = true;
        }
        if (typeof state.ambientEnabled !== 'boolean') {
          state.ambientEnabled = true;
        }
        if (typeof state.hapticsEnabled !== 'boolean') {
          state.hapticsEnabled = true;
        }
        const hasExistingProgress =
          (Number(state.lifetimeBones) || 0) > 0 ||
          (Array.isArray(state.roster) && state.roster.length > 1) ||
          (Array.isArray(state.placedDecorations) && state.placedDecorations.length > 0);
        if (typeof state.hasSeenHint !== 'boolean') {
          state.hasSeenHint = hasExistingProgress;
        } else if (!state.hasSeenHint && hasExistingProgress) {
          state.hasSeenHint = true;
        }
        if (typeof state.cameraAngle !== 'number' || Number.isNaN(state.cameraAngle)) {
          state.cameraAngle = 0;
        }
        if (typeof state.zoomLevel !== 'number' || Number.isNaN(state.zoomLevel)) {
          state.zoomLevel = 1;
        }
        state.zoomLevel = Math.max(0.75, Math.min(1.65, state.zoomLevel));
        if (typeof state.xpTreatTimer !== 'number' || Number.isNaN(state.xpTreatTimer)) {
          state.xpTreatTimer = 0;
        }
        if (typeof state.feastTimer !== 'number' || Number.isNaN(state.feastTimer)) {
          state.feastTimer = 0;
        }
        ['kongStacks', 'baconStacks', 'pupCupStacks', 'xpTreatStacks', 'feastStacks'].forEach(sk => {
          const val = state[sk];
          if (typeof val !== 'number' || Number.isNaN(val) || val < 0) {
            state[sk] = 0;
          } else {
            state[sk] = Math.min(TIMED_TREAT_MAX_STACKS, Math.floor(val));
          }
        });
        if (!state.shinyDogs) state.shinyDogs = [];
        if (!state.perks) state.perks = [];
        const rawDecorInv = (state.decorInventory && typeof state.decorInventory === 'object')
          ? state.decorInventory as Record<string, unknown>
          : {};
        const mergedDecorInv = createEmptyDecorInventory();
        DECOR_TYPES.forEach(type => {
          const v = Number(rawDecorInv[type]);
          mergedDecorInv[type] = Number.isFinite(v) && v > 0
            ? Math.min(DECOR_CONFIG[type].max, Math.floor(v))
            : 0;
        });
        // Migrate legacy Cozy Park Bench saves seamlessly into Dog Slide (max 1) + refund extra benches
        const legacyBenches = Number(rawDecorInv.bench);
        if (Number.isFinite(legacyBenches) && legacyBenches > 0) {
          const legacyCount = Math.floor(legacyBenches);
          if (mergedDecorInv.slide < 1) {
            mergedDecorInv.slide = 1;
            const extra = Math.max(0, legacyCount - 1);
            if (extra > 0) {
              state.magicBones = (state.magicBones || 0) + extra * 600;
            }
          } else {
            state.magicBones = (state.magicBones || 0) + legacyCount * 600;
          }
        }
        state.decorInventory = mergedDecorInv;
        if (!Array.isArray(state.placedDecorations)) {
          state.placedDecorations = [];
        } else {
          state.placedDecorations = state.placedDecorations.filter(
            (d): d is PlacedDecor => Boolean(d && typeof d.type === 'string' && d.type in DECOR_CONFIG)
          );
        }
        const rawStarterProps = (state.starterProps && typeof state.starterProps === 'object')
          ? state.starterProps as Partial<StarterPropsState>
          : {};
        const rawShrooms = Array.isArray(rawStarterProps.showMushrooms) ? rawStarterProps.showMushrooms : [];
        state.starterProps = {
          showTree: rawStarterProps.showTree !== false,
          showMushrooms: [
            rawShrooms[0] !== false,
            rawShrooms[1] !== false,
            rawShrooms[2] !== false,
            rawShrooms[3] !== false
          ]
        };
        const rawUnlockedTiles = (state.unlockedTiles && typeof state.unlockedTiles === 'object')
          ? state.unlockedTiles as Partial<Record<CustomTileStyle, unknown>>
          : {};
        state.unlockedTiles = {
          cobble: Boolean(rawUnlockedTiles.cobble),
          sand: Boolean(rawUnlockedTiles.sand),
          clover: Boolean(rawUnlockedTiles.clover)
        };
        const cleanTileMap: Record<string, CustomTileStyle> = {};
        if (state.tileMap && typeof state.tileMap === 'object') {
          Object.entries(state.tileMap).forEach(([k, val]) => {
            const parts = k.split(',');
            if (parts.length !== 2) return;
            const gx = Number(parts[0]);
            const gy = Number(parts[1]);
            if (
              Number.isInteger(gx) && Number.isInteger(gy) &&
              gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE &&
              (val === 'cobble' || val === 'sand' || val === 'clover')
            ) {
              cleanTileMap[`${gx},${gy}`] = val;
            }
          });
        }
        state.tileMap = cleanTileMap;
        if (typeof state.digPower !== 'number' || Number.isNaN(state.digPower)) {
          state.digPower = BASE_DIG_POWER;
        }
        state.digPower = Math.max(BASE_DIG_POWER, Math.min(MAX_DIG_POWER, state.digPower));
        if (typeof state.speedMultiplier !== 'number' || Number.isNaN(state.speedMultiplier)) {
          state.speedMultiplier = BASE_SPEED_MULTIPLIER;
        }
        state.speedMultiplier = Math.max(BASE_SPEED_MULTIPLIER, Math.min(MAX_SPEED_MULTIPLIER, state.speedMultiplier));
        if (typeof state.idleMultiplier !== 'number' || Number.isNaN(state.idleMultiplier)) {
          state.idleMultiplier = BASE_IDLE_MULTIPLIER;
        }
        state.idleMultiplier = Math.max(BASE_IDLE_MULTIPLIER, Math.min(MAX_IDLE_MULTIPLIER, state.idleMultiplier));
        state.isDraftingPerk = false;
        state.isPlacingDecor = false;
        state.activeDecorType = null;
        state.isPaintingTiles = false;
        state.activeTileBrush = 'grass';
        if (typeof parsed.packHappiness !== 'number' || Number.isNaN(parsed.packHappiness)) {
          state.packHappiness = getCozyFloor();
        } else {
          state.packHappiness = Math.max(getCozyFloor(), Math.min(HAPPINESS_MAX, parsed.packHappiness));
        }
        if (typeof state.lastWhistleBoostAt !== 'number' || Number.isNaN(state.lastWhistleBoostAt)) {
          state.lastWhistleBoostAt = 0;
        }
        if (!state.dogs) state.dogs = {};
        if (!state.costs) state.costs = {};
        Object.keys(BREED_CONFIG).forEach(b => {
          if (state.dogs[b] === undefined) state.dogs[b] = 0;
          if (!state.costs[b]) state.costs[b] = BREED_CONFIG[b].cost;
          else state.costs[b] = Math.min(BREED_CONFIG[b].priceCap, state.costs[b]);
        });
        Object.keys(TOY_CONFIG).forEach(t => {
          if (!state.costs[t]) state.costs[t] = TOY_CONFIG[t].baseCost;
          else state.costs[t] = Math.min(TOY_CONFIG[t].priceCap, state.costs[t]);
        });
        Object.keys(TREAT_CONFIG).forEach(tr => {
          state.costs[tr] = TREAT_CONFIG[tr].baseCost;
        });
      } catch (e) {
        console.error('Failed to load save data, resetting save', e);
        localStorage.removeItem('pupperpark_save');
      }
    }

    if (saved && (!Array.isArray(state.roster) || state.roster.length === 0)) {
      state.roster = [];
      Object.keys(state.dogs || {}).forEach(rawBreed => {
        const breed = normalizeBreedKey(rawBreed);
        const count = state.dogs[rawBreed] || 0;
        for (let i = 0; i < count; i++) {
          const isStarterSlot = state.roster.length === 0 && breed === 'aussie';
          state.roster.push(createRosterEntry(breed, false, null, isStarterSlot ? 'Biscuit' : null));
        }
      });
      (state.shinyDogs || []).forEach(shiny => {
        state.roster.push(createRosterEntry(normalizeBreedKey(shiny.breed), true, shiny.color));
      });
    }

    if (typeof state.bones !== 'number' || Number.isNaN(state.bones) || state.bones < 0) {
      state.bones = 0;
    }

    if (state.roster.length > MAX_DOGS) {
      state.roster = state.roster.slice(0, MAX_DOGS);
    }

    if (state.roster.length === 0) {
      const starterShinyRoll = rollStarterShiny();
      state.roster.push(createRosterEntry('aussie', starterShinyRoll.isShiny, starterShinyRoll.shinyColor, 'Biscuit'));
      state.namePool = buildShuffledNamePool(new Set(['biscuit']));
    }

    if (!Array.isArray(state.namePool)) {
      const activeNames = new Set(
        state.roster
          .map(d => (typeof d.name === 'string' ? d.name.trim().toLowerCase() : ''))
          .filter(Boolean)
      );
      state.namePool = buildShuffledNamePool(activeNames);
    } else {
      state.namePool = state.namePool.filter(n => typeof n === 'string' && n.trim().toLowerCase() !== 'biscuit');
    }

    if (typeof state.nextNameIndex !== 'number' || Number.isNaN(state.nextNameIndex) || state.nextNameIndex < 0) {
      state.nextNameIndex = state.roster.length % DEFAULT_PUP_NAMES.length;
    } else {
      state.nextNameIndex = Math.floor(state.nextNameIndex) % DEFAULT_PUP_NAMES.length;
    }

    state.roster.forEach((entry, idx) => {
      entry.breed = normalizeBreedKey(entry.breed);
      if (!entry.id) entry.id = `dog_${idx}_${Math.random().toString(36).slice(2, 6)}`;
      if (!entry.name) entry.name = generateDefaultName(entry.breed, idx + 1);
      if (typeof entry.level !== 'number' || entry.level < 1) entry.level = 1;
      if (typeof entry.xp !== 'number' || entry.xp < 0) entry.xp = 0;
      if (typeof entry.bonesEarned !== 'number' || entry.bonesEarned < 0) entry.bonesEarned = 0;
      if (typeof entry.isFavorite !== 'boolean') entry.isFavorite = false;
      if (
        typeof entry.bonusPayout !== 'number' ||
        typeof entry.bonusScaling !== 'number' ||
        typeof entry.bonusXp !== 'number' ||
        !entry.rollGrade
      ) {
        const rolled = rollDogBonusStats();
        entry.bonusPayout = rolled.bonusPayout;
        entry.bonusScaling = rolled.bonusScaling;
        entry.bonusXp = rolled.bonusXp;
        entry.rollGrade = rolled.rollGrade;
      }
      if (typeof entry.rerollCount !== 'number' || Number.isNaN(entry.rerollCount) || entry.rerollCount < 0) {
        entry.rerollCount = 0;
      }
    });

    cameraAngle = typeof state.cameraAngle === 'number' && !Number.isNaN(state.cameraAngle)
      ? state.cameraAngle
      : 0;
    userZoom = typeof state.zoomLevel === 'number' && !Number.isNaN(state.zoomLevel)
      ? state.zoomLevel
      : 1;

    if (typeof state.lifetimeBones !== 'number' || Number.isNaN(state.lifetimeBones) || state.lifetimeBones < 0) {
      state.lifetimeBones = Math.max(0, state.bones || 0);
    }

    syncBreedCountsFromRoster();

    const loadNow = Date.now();
    settleAwayProgressSinceLastSave(loadNow);
    saveGameAt(loadNow);
    rebuildCanvasDogsFromRoster();
  }

  const SAVE_COOLDOWN_MS = 1200;
  let pendingSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  let lastWrittenSaveAt = 0;

  function saveGameAt(timestampMs = Date.now()): void {
    state.cameraAngle = cameraAngle;
    state.zoomLevel = userZoom;
    state.lastSaveTime = timestampMs;
    lastWrittenSaveAt = timestampMs;
    if (pendingSaveTimeout) {
      clearTimeout(pendingSaveTimeout);
      pendingSaveTimeout = null;
    }
    try {
      localStorage.setItem('pupperpark_save', JSON.stringify(state));
    } catch {
      // Ignore storage quota/restriction errors
    }
  }

  function saveGame(): void {
    saveGameAt(Date.now());
  }

  function requestSave(): void {
    const now = Date.now();
    state.cameraAngle = cameraAngle;
    state.zoomLevel = userZoom;
    state.lastSaveTime = now;
    const elapsed = now - lastWrittenSaveAt;
    if (elapsed >= SAVE_COOLDOWN_MS) {
      saveGameAt(now);
    } else if (!pendingSaveTimeout) {
      pendingSaveTimeout = setTimeout(() => {
        pendingSaveTimeout = null;
        saveGame();
      }, SAVE_COOLDOWN_MS - elapsed);
    }
  }

  setInterval(() => {
    if (!document.hidden) {
      saveGame();
    }
  }, 10000);

  let lastTime = performance.now();

  document.addEventListener('visibilitychange', () => {
    const now = Date.now();
    if (document.hidden) {
      updateAmbientBed();
      saveGameAt(now);
    } else {
      lastTime = performance.now();
      if (!masterMuted && (state.soundEnabled || state.ambientEnabled) && audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => updateAmbientBed()).catch(() => {});
      } else {
        updateAmbientBed();
      }
      settleAwayProgressSinceLastSave(now);
      saveGameAt(Date.now());
    }
  });

  window.addEventListener('pagehide', () => {
    saveGameAt(Date.now());
  });

  window.addEventListener('beforeunload', () => {
    saveGameAt(Date.now());
  });

  function showOfflineModal(earned: number, _estimatedDigs = 0, foundTreasure: PerkItem | null = null): void {
    const modal = document.getElementById('offlineModal');
    const text = document.getElementById('offlineEarnings');
    if (text) {
      text.innerHTML = '';

      const bonesLine = document.createElement('div');
      bonesLine.textContent = `They dug ${Math.round(earned).toLocaleString()} Bones while you were away!`;
      text.appendChild(bonesLine);

      if (foundTreasure) {
        const treasureLine = document.createElement('div');
        treasureLine.style.cssText = 'margin-top: 10px; font-size: 0.9rem; font-weight: 700; color: #ffeaa7;';
        treasureLine.textContent = `Treasure Dug Up While Away: ${foundTreasure.name} [${foundTreasure.rarity}] — ${foundTreasure.desc}`;
        text.appendChild(treasureLine);
      }
    }
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  document.getElementById('btnCloseOffline')?.addEventListener('click', () => {
    const modal = document.getElementById('offlineModal');
    if (modal) modal.style.display = 'none';
    flushQueuedAwayProgressIfReady();
  });

  const gameModal = document.getElementById('gameModal');
  const drawerWindow = document.getElementById('drawerWindow');
  const drawerHandle = document.getElementById('drawerHandle');

  if (gameModal) {
    gameModal.style.display = 'none';
  }

  document.getElementById('btnOpenMenu')?.addEventListener('click', () => {
    initAudio();
    dismissOnboardingHint();
    cancelDecorPlacement();
    stopTilePaintMode();
    if (gameModal) {
      gameModal.style.display = 'flex';
    }
    if (drawerWindow) {
      drawerWindow.classList.remove('is-dragging');
      drawerWindow.style.transform = 'translateY(0)';
    }
    updateUI();
    renderRosterTab();
  });

  function closeMenu(): void {
    if (gameModal) {
      gameModal.style.display = 'none';
    }
  }

  document.getElementById('btnCloseMenu')?.addEventListener('click', closeMenu);

  let drawerStartY = 0;
  let drawerCurrentY = 0;
  let isDrawerDragging = false;

  drawerHandle?.addEventListener('pointerdown', (e: PointerEvent) => {
    isDrawerDragging = true;
    drawerStartY = e.clientY;
    drawerWindow?.classList.add('is-dragging');
    try {
      drawerHandle.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  });

  drawerHandle?.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDrawerDragging) return;
    drawerCurrentY = e.clientY - drawerStartY;
    if (drawerCurrentY > 0 && drawerWindow) {
      drawerWindow.style.transform = `translateY(${drawerCurrentY}px)`;
    }
  });

  function finishDrawerDrag(e: PointerEvent): void {
    if (!isDrawerDragging) return;
    isDrawerDragging = false;
    drawerWindow?.classList.remove('is-dragging');
    try {
      drawerHandle?.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    if (drawerCurrentY > 80) {
      closeMenu();
    }
    if (drawerWindow) {
      drawerWindow.style.transform = 'translateY(0)';
    }
    drawerCurrentY = 0;
  }

  drawerHandle?.addEventListener('pointerup', finishDrawerDrag);
  drawerHandle?.addEventListener('pointercancel', finishDrawerDrag);

  const tabBtns = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      if (tabId) {
        document.getElementById(tabId)?.classList.add('active');
      }
      updateUI();
      if (tabId === 'tab-roster') {
        renderRosterTab();
      }
    });
  });

  function dismissOnboardingHint(): void {
    if (!state.hasSeenHint) {
      state.hasSeenHint = true;
      const hintEl = document.getElementById('onboardingHint');
      if (hintEl) hintEl.style.display = 'none';
      requestSave();
    }
  }

  document.getElementById('onboardingHint')?.addEventListener('click', () => {
    dismissOnboardingHint();
  });

  function toggleFavoriteDog(dogId: string): void {
    initAudio();
    const target = state.roster.find(d => d.id === dogId);
    if (!target) return;
    target.isFavorite = !target.isFavorite;
    if (target.isFavorite) {
      sfx.gather();
    } else {
      sfx.collect();
    }
    renderRosterTab();
    saveGame();
  }

  const rerollModal = document.getElementById('rerollModal');
  const rerollDogSummary = document.getElementById('rerollDogSummary');
  const rerollCurrentStats = document.getElementById('rerollCurrentStats');
  const rerollRulesText = document.getElementById('rerollRulesText');
  const rerollResultBanner = document.getElementById('rerollResultBanner');
  const rerollCostLabel = document.getElementById('rerollCostLabel');
  const btnConfirmReroll = document.getElementById('btnConfirmReroll') as HTMLButtonElement | null;
  const btnCloseRerollModal = document.getElementById('btnCloseRerollModal');

  interface RerollResultInfo {
    keptPrevious: boolean;
    becameShiny: boolean;
    rolledGrade: string;
    rolledPayout: number;
    rolledScaling: number;
    rolledXp: number;
  }

  function renderRerollModalContent(dogId: string, resultInfo: RerollResultInfo | null = null): void {
    const entry = state.roster.find(d => d.id === dogId);
    if (!entry) return;

    const stats = getEffectiveBreedStats(entry);
    const breedName = BREED_LABELS[entry.breed] || entry.breed;
    const dogRerolls = getDogRerollCount(entry);
    const cost = getRerollCost(entry);
    const canAfford = (state.magicBones || 0) >= cost;

    if (rerollDogSummary) {
      rerollDogSummary.innerHTML = `
        <strong>${entry.name}</strong>
        <span class="reroll-meta-text">${breedName} | Lv. ${entry.level}</span>
        <span class="reroll-meta-text ${entry.isShiny ? 'is-shiny' : ''}">${entry.isShiny ? `✨ Shiny (+${SHINY_MAGIC_BONE_BONUS} ✨/drop)` : 'Standard Coat'}</span>
      `;
    }

    if (rerollCurrentStats) {
      rerollCurrentStats.innerHTML = `
        <div class="reroll-stat-line"><span>Roll Grade</span><strong>${stats.rollGrade}</strong></div>
        <div class="reroll-stat-line"><span>Bone Yield</span><strong>+${stats.bonusPayout.toFixed(2)} (${stats.boneYield.toFixed(2)}x)</strong></div>
        <div class="reroll-stat-line"><span>Pack Growth</span><strong>+${stats.bonusScaling.toFixed(2)} (${stats.packGrowth.toFixed(2)}x)</strong></div>
        <div class="reroll-stat-line"><span>Quick Learner</span><strong>+${stats.bonusXp.toFixed(2)} (${stats.quickLearner.toFixed(2)}x)</strong></div>
      `;
    }

    if (rerollRulesText) {
      rerollRulesText.textContent =
        `Rerolls for ${entry.name} cost 25 → 50 → 75 → 100 (+25 per reroll on this dog; currently reroll #${dogRerolls + 1}). Higher-rated previous stats are kept if not beaten, and non-shiny pups have a 1-in-1,300 chance to become ✨ Shiny (+${SHINY_MAGIC_BONE_BONUS} bonus Magic Bone per ✨ drop).`;
    }

    if (rerollResultBanner) {
      if (!resultInfo) {
        rerollResultBanner.style.display = 'none';
        rerollResultBanner.className = 'reroll-result-banner';
        rerollResultBanner.innerHTML = '';
      } else {
        rerollResultBanner.style.display = 'block';
        rerollResultBanner.className = `reroll-result-banner ${resultInfo.keptPrevious ? 'kept' : 'upgraded'}${resultInfo.becameShiny ? ' shiny-hit' : ''}`;

        const statMsg = resultInfo.keptPrevious
          ? `Rolled ${resultInfo.rolledGrade} (+${resultInfo.rolledPayout.toFixed(2)} Yield / +${resultInfo.rolledScaling.toFixed(2)} Growth / +${resultInfo.rolledXp.toFixed(2)} XP) — previous higher-rated stats (${stats.rollGrade}) were kept!`
          : `New roll applied! Now ${stats.rollGrade} (+${stats.bonusPayout.toFixed(2)} Yield / +${stats.bonusScaling.toFixed(2)} Growth / +${stats.bonusXp.toFixed(2)} XP).`;

        const shinyMsg = resultInfo.becameShiny
          ? `<div class="reroll-shiny-callout">✨ JACKPOT! 1-in-1,300 Shiny roll hit — ${entry.name} is now Shiny!</div>`
          : '';

        rerollResultBanner.innerHTML = `<div>${statMsg}</div>${shinyMsg}`;
      }
    }

    if (rerollCostLabel) {
      rerollCostLabel.textContent = `${cost.toLocaleString()} ✨`;
    }

    if (btnConfirmReroll) {
      btnConfirmReroll.disabled = !canAfford;
      btnConfirmReroll.style.touchAction = 'manipulation';
    }
  }

  function openRerollModal(dogId: string): void {
    initAudio();
    const entry = state.roster.find(d => d.id === dogId);
    if (!entry) return;
    pendingRerollDogId = dogId;
    renderRerollModalContent(dogId, null);
    if (rerollModal) {
      rerollModal.style.display = 'flex';
    }
  }

  function closeRerollModal(): void {
    pendingRerollDogId = null;
    if (rerollModal) {
      rerollModal.style.display = 'none';
    }
  }

  let lastRerollActionAt = 0;
  function executeDogReroll(dogId: string): void {
    const now = performance.now();
    if (now - lastRerollActionAt < 140) return;
    lastRerollActionAt = now;

    initAudio();
    const entry = state.roster.find(d => d.id === dogId);
    if (!entry) return;

    const cost = getRerollCost(entry);
    if ((state.magicBones || 0) < cost) return;

    state.magicBones -= cost;
    entry.rerollCount = getDogRerollCount(entry) + 1;

    if (
      typeof entry.bonusPayout !== 'number' ||
      typeof entry.bonusScaling !== 'number' ||
      typeof entry.bonusXp !== 'number' ||
      !entry.rollGrade
    ) {
      const initialRoll = rollDogBonusStats();
      entry.bonusPayout = initialRoll.bonusPayout;
      entry.bonusScaling = initialRoll.bonusScaling;
      entry.bonusXp = initialRoll.bonusXp;
      entry.rollGrade = initialRoll.rollGrade;
    }

    const oldRating = getRollRating(entry);
    const candidate = rollDogBonusStats();
    const newRating = getRollRating(candidate);

    let keptPrevious = true;
    if (newRating > oldRating) {
      entry.bonusPayout = candidate.bonusPayout;
      entry.bonusScaling = candidate.bonusScaling;
      entry.bonusXp = candidate.bonusXp;
      entry.rollGrade = candidate.rollGrade;
      keptPrevious = false;
    }

    let becameShiny = false;
    if (!entry.isShiny && Math.random() < REROLL_SHINY_ODDS) {
      entry.isShiny = true;
      if (!entry.shinyColor) {
        entry.shinyColor = SHINY_PALETTES[Math.floor(Math.random() * SHINY_PALETTES.length)];
      }
      becameShiny = true;

      const canvasDog = dogs.find(d => d.rosterId === entry.id);
      if (canvasDog) {
        canvasDog.isShiny = true;
        canvasDog.shinyColor = entry.shinyColor;
      }

      syncBreedCountsFromRoster();
      sfx.shiny();
      triggerHaptic(25);
    } else {
      sfx.upgrade();
      triggerHaptic(10);
    }

    updateUI();
    renderRosterTab();
    saveGame();
    renderRerollModalContent(dogId, {
      keptPrevious,
      becameShiny,
      rolledGrade: candidate.rollGrade,
      rolledPayout: candidate.bonusPayout,
      rolledScaling: candidate.bonusScaling,
      rolledXp: candidate.bonusXp
    });
  }

  if (btnConfirmReroll) {
    btnConfirmReroll.style.touchAction = 'manipulation';
    btnConfirmReroll.addEventListener('click', (e) => {
      e.stopPropagation();
      if (pendingRerollDogId) {
        executeDogReroll(pendingRerollDogId);
      }
    });
  }

  if (btnCloseRerollModal) {
    btnCloseRerollModal.style.touchAction = 'manipulation';
    btnCloseRerollModal.addEventListener('click', (e) => {
      e.stopPropagation();
      initAudio();
      closeRerollModal();
    });
  }

  rerollModal?.addEventListener('click', (e) => {
    if (e.target === rerollModal) {
      closeRerollModal();
    }
  });

  const retireConfirmModal = document.getElementById('retireConfirmModal');
  const retireConfirmText = document.getElementById('retireConfirmText');

  function openRetireConfirm(dogId: string): void {
    initAudio();
    if (state.roster.length <= 1) return;
    const target = state.roster.find(d => d.id === dogId);
    if (!target || target.isFavorite) return;

    pendingRetireDogId = dogId;
    const refundPct = Math.round(RETIRE_REFUND_RATE * 100);
    const refundPreview = Math.floor((target.bonesEarned || 0) * RETIRE_REFUND_RATE);
    if (retireConfirmText) {
      retireConfirmText.textContent = `Retire ${target.name} and receive +${refundPreview.toLocaleString()} Bones (${refundPct}% of their ${Math.floor(target.bonesEarned || 0).toLocaleString()} lifetime bones dug)?`;
    }
    if (retireConfirmModal) {
      retireConfirmModal.style.display = 'flex';
    }
  }

  document.getElementById('btnCancelRetire')?.addEventListener('click', () => {
    initAudio();
    pendingRetireDogId = null;
    if (retireConfirmModal) retireConfirmModal.style.display = 'none';
  });

  document.getElementById('btnConfirmRetire')?.addEventListener('click', () => {
    const idToRetire = pendingRetireDogId;
    pendingRetireDogId = null;
    if (retireConfirmModal) retireConfirmModal.style.display = 'none';
    if (idToRetire) {
      retireDog(idToRetire);
    }
  });

  function retireDog(dogId: string): void {
    initAudio();
    if (state.roster.length <= 1) return;

    const idx = state.roster.findIndex(d => d.id === dogId);
    if (idx === -1 || state.roster[idx].isFavorite) return;

    const [retiredDog] = state.roster.splice(idx, 1);
    const refundPct = Math.round(RETIRE_REFUND_RATE * 100);
    const refund = Math.floor((retiredDog.bonesEarned || 0) * RETIRE_REFUND_RATE);

    const actualRefund = refund > 0 ? awardRetirementBones(refund) : 0;

    syncBreedCountsFromRoster();
    rebuildCanvasDogsFromRoster();
    sfx.thud();

    const noticeEl = document.getElementById('retireNotice');
    if (noticeEl) {
      noticeEl.textContent = `${retiredDog.name} retired! You received ${actualRefund.toLocaleString()} Bones (${refundPct}% of their ${Math.floor(retiredDog.bonesEarned).toLocaleString()} lifetime bones dug).`;
      noticeEl.style.display = 'block';
    }

    updateUI();
    renderRosterTab();
    saveGame();
  }

  function renderRosterTab(): void {
    const container = document.getElementById('rosterListContainer');
    if (!container) return;

    if (container.querySelector('button:active')) {
      return;
    }

    const canRetire = state.roster.length > 1;
    container.innerHTML = '';

    state.roster.forEach(entry => {
      if (
        typeof entry.bonusPayout !== 'number' ||
        typeof entry.bonusScaling !== 'number' ||
        typeof entry.bonusXp !== 'number' ||
        !entry.rollGrade
      ) {
        const rolled = rollDogBonusStats();
        entry.bonusPayout = rolled.bonusPayout;
        entry.bonusScaling = rolled.bonusScaling;
        entry.bonusXp = rolled.bonusXp;
        entry.rollGrade = rolled.rollGrade;
      }

      const stats = getEffectiveBreedStats(entry);
      const xpNeeded = getXpNeededForLevel(entry.level);
      const isMaxLevel = entry.level >= MAX_DOG_LEVEL;
      const pct = isMaxLevel ? 100 : Math.min(100, Math.max(0, (entry.xp / xpNeeded) * 100));
      const levelBonusPct = Math.round((getDogLevelBonusMult(entry) - 1) * 100);
      const refundPreview = Math.floor((entry.bonesEarned || 0) * RETIRE_REFUND_RATE);
      const breedName = BREED_LABELS[entry.breed] || entry.breed;
      const isFav = Boolean(entry.isFavorite);

      const gradeClass = stats.rollGrade === '★ Max Roll'
        ? 'grade-max'
        : stats.rollGrade === 'Prime'
          ? 'grade-prime'
          : stats.rollGrade === 'Sharp'
            ? 'grade-sharp'
            : 'grade-standard';

      const card = document.createElement('div');
      card.className = `roster-card${isFav ? ' is-favorite' : ''}`;

      const mainCol = document.createElement('div');
      mainCol.className = 'roster-main';

      const topRow = document.createElement('div');
      topRow.className = 'roster-top';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'roster-name-input';
      nameInput.value = entry.name;
      nameInput.maxLength = 24;
      nameInput.setAttribute('aria-label', `Name for ${breedName}`);

      const commitName = () => {
        const cleaned = nameInput.value.trim();
        entry.name = cleaned || breedName;
        nameInput.value = entry.name;
        requestSave();
      };
      nameInput.addEventListener('change', commitName);
      nameInput.addEventListener('blur', commitName);

      topRow.appendChild(nameInput);

      const xpBarOuter = document.createElement('div');
      xpBarOuter.className = 'roster-xp-track';

      const xpBarInner = document.createElement('div');
      xpBarInner.className = 'roster-xp-fill';
      xpBarInner.style.width = `${pct}%`;
      xpBarOuter.appendChild(xpBarInner);

      const metaRow = document.createElement('div');
      metaRow.className = 'roster-meta-row';
      metaRow.innerHTML = `
        <span>${breedName}${entry.isShiny ? ' ✨' : ''}</span>
        <span class="roster-meta-sep" aria-hidden="true">|</span>
        <span>Lv. <strong>${entry.level}</strong>${entry.level >= MAX_DOG_LEVEL ? ' (MAX)' : ''}</span>
        <span class="roster-meta-sep" aria-hidden="true">|</span>
        <strong class="${gradeClass}">${stats.rollGrade}</strong>
        <span class="roster-meta-sep" aria-hidden="true">|</span>
        <span>Dug <strong>${Math.floor(entry.bonesEarned).toLocaleString()}</strong> 🦴</span>
      `;

      const bonusRow = document.createElement('div');
      bonusRow.className = 'roster-bonus-row';
      bonusRow.innerHTML = `
        <span>Bone Yield <strong>${stats.boneYield.toFixed(2)}x</strong> <em>(+${stats.bonusPayout.toFixed(2)})</em> <span class="lvl-bonus">(+${levelBonusPct}% Lv.)</span></span>
        <span>Pack Growth <strong>${stats.packGrowth.toFixed(2)}x</strong> <em>(+${stats.bonusScaling.toFixed(2)})</em></span>
        <span>XP <strong>${stats.quickLearner.toFixed(2)}x</strong> <em>(+${stats.bonusXp.toFixed(2)})</em></span>
        ${entry.isShiny ? `<span class="lvl-bonus">Shiny <strong>+${SHINY_MAGIC_BONE_BONUS} ✨</strong></span>` : ''}
        <span>${isMaxLevel ? `<strong>Max Lv.</strong>` : `Next Lv. <strong>${Math.floor(entry.xp)}/${xpNeeded}</strong>`}</span>
      `;

      mainCol.appendChild(topRow);
      mainCol.appendChild(xpBarOuter);
      mainCol.appendChild(metaRow);
      mainCol.appendChild(bonusRow);
      card.appendChild(mainCol);

      const rightAction = document.createElement('div');
      rightAction.className = 'roster-right-action';

      const iconRow = document.createElement('div');
      iconRow.className = 'roster-icon-row';

      const favBtn = document.createElement('button');
      favBtn.type = 'button';
      favBtn.className = `fav-star-btn${isFav ? ' active' : ''}`;
      favBtn.setAttribute('aria-pressed', String(isFav));
      favBtn.setAttribute('aria-label', isFav ? `Unfavorite ${entry.name}` : `Favorite ${entry.name}`);
      favBtn.textContent = isFav ? '★' : '☆';
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavoriteDog(entry.id);
      });
      iconRow.appendChild(favBtn);

      const rerollBtn = document.createElement('button');
      rerollBtn.type = 'button';
      rerollBtn.className = 'reroll-dice-btn';
      rerollBtn.setAttribute('aria-label', `Reroll stats for ${entry.name}`);
      rerollBtn.title = `Reroll Stats & Shiny Chance (${getRerollCost(entry)} ✨)`;
      rerollBtn.textContent = '🎲';
      rerollBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openRerollModal(entry.id);
      });
      iconRow.appendChild(rerollBtn);

      rightAction.appendChild(iconRow);

      if (canRetire) {
        const retireBtn = document.createElement('button');
        retireBtn.type = 'button';
        retireBtn.className = 'retire-pill-btn retire-pill-two-line';
        retireBtn.disabled = isFav;
        if (isFav) {
          retireBtn.setAttribute('aria-disabled', 'true');
          retireBtn.setAttribute('aria-label', `Cannot retire ${entry.name} while favorited`);
          retireBtn.title = 'Unfavorite pup before retiring';
        } else {
          retireBtn.setAttribute('aria-label', `Retire ${entry.name}`);
          retireBtn.title = '';
        }
        retireBtn.innerHTML = `
          <span class="retire-line-top">Retire</span>
          <span class="retire-line-sub">+${refundPreview.toLocaleString()} 🦴</span>
        `;
        retireBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!isFav) {
            openRetireConfirm(entry.id);
          }
        });
        rightAction.appendChild(retireBtn);
      }

      card.appendChild(rightAction);
      container.appendChild(card);
    });
  }

  function cancelDecorPlacement(): void {
    state.isPlacingDecor = false;
    state.activeDecorType = null;
    const banner = document.getElementById('placementBanner');
    if (banner) banner.style.display = 'none';
  }

  function refreshTilePaintBar(): void {
    const brushBtns = document.querySelectorAll<HTMLButtonElement>('.tile-brush-btn');
    brushBtns.forEach(btn => {
      const brush = btn.dataset.tileBrush as TileStyle | undefined;
      if (!brush) return;
      const isUnlocked = brush === 'grass' || Boolean(state.unlockedTiles?.[brush]);
      btn.style.display = isUnlocked ? 'inline-flex' : 'none';
      btn.classList.toggle('active', state.activeTileBrush === brush);
    });
  }

  function stopTilePaintMode(): void {
    state.isPaintingTiles = false;
    const paintBar = document.getElementById('tilePaintBar');
    if (paintBar) paintBar.style.display = 'none';
    canvas.classList.remove('is-painting-tiles');
  }

  function startTilePaintMode(brush: TileStyle): void {
    cancelDecorPlacement();
    state.isPaintingTiles = true;
    state.activeTileBrush = brush;
    closeMenu();
    refreshTilePaintBar();
    const paintBar = document.getElementById('tilePaintBar');
    if (paintBar) paintBar.style.display = 'flex';
    canvas.classList.add('is-painting-tiles');
    sfx.gather();
  }

  document.getElementById('btnCancelPlacement')?.addEventListener('click', () => {
    initAudio();
    cancelDecorPlacement();
  });

  document.getElementById('btnDoneTilePaint')?.addEventListener('click', () => {
    initAudio();
    stopTilePaintMode();
    sfx.collect();
  });

  document.querySelectorAll<HTMLButtonElement>('.tile-brush-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudio();
      const brush = btn.dataset.tileBrush as TileStyle | undefined;
      if (!brush) return;
      if (brush !== 'grass' && !state.unlockedTiles?.[brush]) return;
      state.activeTileBrush = brush;
      refreshTilePaintBar();
      sfx.collect();
      triggerHaptic(8);
    });
  });

  // Decor Sub-Tab Switcher (Park Decor | Ground Tiles)
  document.querySelectorAll<HTMLButtonElement>('.decor-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudio();
      const targetId = btn.dataset.decorSubtab;
      if (!targetId) return;
      document.querySelectorAll<HTMLButtonElement>('.decor-subtab-btn').forEach(b => {
        const isActive = b === btn;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      document.querySelectorAll<HTMLElement>('.decor-subtab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === targetId);
      });
    });
  });

  function startDecorPlacement(type: DecorType, message: string): void {
    stopTilePaintMode();
    state.isPlacingDecor = true;
    state.activeDecorType = type;
    closeMenu();
    const banner = document.getElementById('placementBanner');
    const bannerText = document.getElementById('placementBannerText');
    if (bannerText) bannerText.textContent = message;
    if (banner) banner.style.display = 'flex';
    sfx.gather();
  }

  DECOR_TYPES.forEach(type => {
    const cfg = DECOR_CONFIG[type];
    document.getElementById(cfg.buyBtnId)?.addEventListener('click', () => {
      initAudio();
      const currentOwned = state.decorInventory[type] || 0;
      if (state.magicBones >= cfg.cost && currentOwned < cfg.max) {
        state.magicBones -= cfg.cost;
        state.decorInventory[type] = currentOwned + 1;
        sfx.upgrade();
        triggerHaptic(10);
        updateUI();
        saveGame();
      }
    });

    document.getElementById(cfg.placeBtnId)?.addEventListener('click', () => {
      initAudio();
      const placedCount = state.placedDecorations.filter(d => d.type === type).length;
      const available = (state.decorInventory[type] || 0) - placedCount;
      if (available <= 0 || placedCount >= cfg.max) return;
      startDecorPlacement(type, cfg.placePrompt);
    });
  });

  CUSTOM_TILE_STYLES.forEach(style => {
    const cfg = CUSTOM_TILE_CONFIG[style];
    document.getElementById(cfg.btnId)?.addEventListener('click', () => {
      initAudio();
      if (state.unlockedTiles[style]) {
        startTilePaintMode(style);
        return;
      }
      if (state.magicBones >= TILE_UNLOCK_COST) {
        state.magicBones -= TILE_UNLOCK_COST;
        state.unlockedTiles[style] = true;
        sfx.upgrade();
        triggerHaptic(14);
        updateUI();
        saveGame();
      }
    });
  });

  document.getElementById('btnTileGrass')?.addEventListener('click', () => {
    initAudio();
    startTilePaintMode('grass');
  });

  const clearDecorConfirmModal = document.getElementById('clearDecorConfirmModal');
  document.getElementById('btnClearDecor')?.addEventListener('click', () => {
    initAudio();
    if (clearDecorConfirmModal) clearDecorConfirmModal.style.display = 'flex';
  });

  document.getElementById('btnCancelClearDecor')?.addEventListener('click', () => {
    initAudio();
    if (clearDecorConfirmModal) clearDecorConfirmModal.style.display = 'none';
  });

  function showLandmarkToggleNote(message: string | null): void {
    const noteEl = document.getElementById('landmarkToggleNote');
    if (!noteEl) return;
    if (!message) {
      noteEl.textContent = '';
      noteEl.style.display = 'none';
      return;
    }
    noteEl.textContent = message;
    noteEl.style.display = 'block';
  }

  document.getElementById('btnToggleStarterTree')?.addEventListener('click', () => {
    initAudio();
    const sp = state.starterProps || createDefaultStarterProps();
    state.starterProps = sp;
    if (sp.showTree) {
      sp.showTree = false;
      showLandmarkToggleNote(null);
      sfx.collect();
      triggerHaptic(8);
      updateUI();
      saveGame();
      return;
    }
    const occupied = getOccupiedTileMap();
    if (occupied.has(`${STARTER_TREE_TILE.gx},${STARTER_TREE_TILE.gy}`)) {
      sfx.thud();
      triggerHaptic(12);
      showLandmarkToggleNote('Clear the placed decor on the Starter Tree tile before restoring it.');
      return;
    }
    sp.showTree = true;
    showLandmarkToggleNote(null);
    sfx.gather();
    triggerHaptic(10);
    updateUI();
    saveGame();
  });

  mushrooms.forEach((m, idx) => {
    document.getElementById(`btnToggleMushroom${idx}`)?.addEventListener('click', () => {
      initAudio();
      const sp = state.starterProps || createDefaultStarterProps();
      state.starterProps = sp;
      const currentlyShown = sp.showMushrooms[idx] !== false;
      if (currentlyShown) {
        sp.showMushrooms[idx] = false;
        showLandmarkToggleNote(null);
        sfx.collect();
        triggerHaptic(8);
        updateUI();
        saveGame();
        return;
      }
      const occupied = getOccupiedTileMap();
      if (occupied.has(`${m.gx},${m.gy}`)) {
        sfx.thud();
        triggerHaptic(12);
        showLandmarkToggleNote(`Clear the placed decor on the ${m.label} tile before restoring them.`);
        return;
      }
      sp.showMushrooms[idx] = true;
      showLandmarkToggleNote(null);
      sfx.gather();
      triggerHaptic(10);
      updateUI();
      saveGame();
    });
  });

  document.getElementById('btnConfirmClearDecor')?.addEventListener('click', () => {
    initAudio();
    state.placedDecorations = [];
    dogs.forEach(d => d.cancelSlide());
    showLandmarkToggleNote(null);
    state.packHappiness = Math.max(getCozyFloor(), Math.min(HAPPINESS_MAX, state.packHappiness || getCozyFloor()));
    sfx.thud();
    if (clearDecorConfirmModal) clearDecorConfirmModal.style.display = 'none';
    updateUI();
    saveGame();
  });

  const clearTilesConfirmModal = document.getElementById('clearTilesConfirmModal');
  document.getElementById('btnClearTiles')?.addEventListener('click', () => {
    initAudio();
    if (Object.keys(state.tileMap || {}).length === 0) return;
    if (clearTilesConfirmModal) clearTilesConfirmModal.style.display = 'flex';
  });

  document.getElementById('btnCancelClearTiles')?.addEventListener('click', () => {
    initAudio();
    if (clearTilesConfirmModal) clearTilesConfirmModal.style.display = 'none';
  });

  document.getElementById('btnConfirmClearTiles')?.addEventListener('click', () => {
    initAudio();
    state.tileMap = {};
    sfx.thud();
    if (clearTilesConfirmModal) clearTilesConfirmModal.style.display = 'none';
    updateUI();
    saveGame();
  });

  function syncAudioContextState(): void {
    if (masterMuted || (!state.soundEnabled && !state.ambientEnabled)) {
      updateAmbientBed();
      if (audioCtx && audioCtx.state === 'running') {
        audioCtx.suspend().catch(() => {});
      }
    } else {
      initAudio();
      updateAmbientBed();
    }
  }

  document.getElementById('btnQuickMute')?.addEventListener('click', () => {
    masterMuted = !masterMuted;
    syncAudioContextState();
    if (!masterMuted && state.soundEnabled) {
      sfx.gather();
    }
    updateUI();
  });

  document.getElementById('btnToggleSound')?.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    if (state.soundEnabled) {
      masterMuted = false;
      syncAudioContextState();
      sfx.gather();
    } else {
      syncAudioContextState();
    }
    updateUI();
    saveGame();
  });

  document.getElementById('btnToggleAmbient')?.addEventListener('click', () => {
    state.ambientEnabled = !state.ambientEnabled;
    if (state.ambientEnabled) {
      masterMuted = false;
      syncAudioContextState();
      setTimeout(() => playBirdChirp(), 60);
    } else {
      syncAudioContextState();
      sfx.collect();
    }
    updateUI();
    saveGame();
  });

  document.getElementById('btnToggleHaptics')?.addEventListener('click', () => {
    initAudio();
    state.hapticsEnabled = !state.hapticsEnabled;
    if (state.hapticsEnabled) {
      triggerHaptic(22);
      sfx.gather();
    } else {
      sfx.collect();
    }
    updateUI();
    saveGame();
  });

  document.getElementById('btnToggleNameTags')?.addEventListener('click', () => {
    initAudio();
    state.showNameTags = !state.showNameTags;
    sfx.gather();
    updateUI();
    saveGame();
  });

  const helpModal = document.getElementById('helpModal');
  function openHelpModal(): void {
    initAudio();
    if (helpModal) helpModal.style.display = 'flex';
  }
  function closeHelpModal(): void {
    if (helpModal) helpModal.style.display = 'none';
  }

  document.getElementById('btnQuickHelp')?.addEventListener('click', openHelpModal);
  document.getElementById('btnOpenHelp')?.addEventListener('click', openHelpModal);
  document.getElementById('btnCloseHelp')?.addEventListener('click', closeHelpModal);
  document.getElementById('btnConfirmHelp')?.addEventListener('click', closeHelpModal);
  helpModal?.addEventListener('click', (e) => {
    if (e.target === helpModal) closeHelpModal();
  });

  const resetConfirmModal = document.getElementById('resetConfirmModal');
  document.getElementById('btnResetProgress')?.addEventListener('click', () => {
    initAudio();
    if (resetConfirmModal) resetConfirmModal.style.display = 'flex';
  });

  document.getElementById('btnCancelReset')?.addEventListener('click', () => {
    initAudio();
    if (resetConfirmModal) resetConfirmModal.style.display = 'none';
  });

  function performReset(startingBones = 0, startingMagicBones = 0): void {
    initAudio();
    localStorage.removeItem('pupperpark_save');
    pendingRetireDogId = null;
    pendingRerollDogId = null;
    queuedAwayProgress = null;
    cameraAngle = 0;
    cameraVelocity = 0;
    userZoom = 1;
    const starterShinyRoll = rollStarterShiny();
    const resetNow = Date.now();
    const clampedBones = Math.max(0, Math.min(MAX_BONES, Math.floor(startingBones)));
    const clampedMagic = Math.max(0, Math.floor(startingMagicBones));

    cancelDecorPlacement();
    stopTilePaintMode();
    state = {
      bones: clampedBones,
      lifetimeBones: clampedBones + clampedMagic,
      magicBones: clampedMagic,
      nextNameIndex: 1,
      namePool: buildShuffledNamePool(new Set(['biscuit'])),
      dogs: {
        aussie: 1, corgi: 0, beagle: 0, collie: 0, dachshund: 0, husky: 0,
        dalmatian: 0, golden: 0, samoyed: 0, shepherd: 0, borzoi: 0, shiba: 0, labrador: 0, bernese: 0
      },
      shinyDogs: [],
      roster: [createRosterEntry('aussie', starterShinyRoll.isShiny, starterShinyRoll.shinyColor, 'Biscuit')],
      perks: [],
      decorInventory: createEmptyDecorInventory(),
      placedDecorations: [],
      starterProps: createDefaultStarterProps(),
      isPlacingDecor: false,
      activeDecorType: null,
      unlockedTiles: createDefaultUnlockedTiles(),
      tileMap: {},
      isPaintingTiles: false,
      activeTileBrush: 'grass',
      showNameTags: true,
      soundEnabled: state.soundEnabled,
      ambientEnabled: state.ambientEnabled,
      hapticsEnabled: state.hapticsEnabled,
      hasSeenHint: clampedBones > 0 || clampedMagic > 0,
      cameraAngle: 0,
      zoomLevel: 1,
      digPower: BASE_DIG_POWER,
      speedMultiplier: BASE_SPEED_MULTIPLIER,
      idleMultiplier: BASE_IDLE_MULTIPLIER,
      magicChance: 0.22,
      boneCapEverShown: clampedBones >= MAX_BONES,
      boneCapReachedNotified: clampedBones >= MAX_BONES,
      kongTimer: 0,
      baconTimer: 0,
      pupCupTimer: 0,
      xpTreatTimer: 0,
      feastTimer: 0,
      kongStacks: 0,
      baconStacks: 0,
      pupCupStacks: 0,
      xpTreatStacks: 0,
      feastStacks: 0,
      feastAnimTimer: 0,
      hasTennisBall: false,
      hasFrisbee: false,
      hasDuck: false,
      isDraftingPerk: false,
      packHappiness: HAPPINESS_BASE_FLOOR,
      lastWhistleBoostAt: 0,
      costs: {},
      lastSaveTime: resetNow
    };

    syncBreedCountsFromRoster();
    initDefaultCosts();

    rebuildCanvasDogsFromRoster();
    droppedBones.length = 0;
    particles.length = 0;
    barkPopups.length = 0;
    floatingTexts.length = 0;
    tileRipples.length = 0;
    parkBarkCooldown = PARK_BARK_MIN_COOLDOWN + Math.random() * (PARK_BARK_MAX_COOLDOWN - PARK_BARK_MIN_COOLDOWN);

    const noticeEl = document.getElementById('retireNotice');
    if (noticeEl) noticeEl.style.display = 'none';

    if (resetConfirmModal) resetConfirmModal.style.display = 'none';
    if (retireConfirmModal) retireConfirmModal.style.display = 'none';
    if (rerollModal) rerollModal.style.display = 'none';
    cancelDecorPlacement();
    closeMenu();
    updateUI();
    renderRosterTab();
    saveGameAt(resetNow);
  }

  document.getElementById('btnConfirmReset')?.addEventListener('click', () => {
    performReset(0, 0);
  });

  document.getElementById('btnTestResetMax')?.addEventListener('click', () => {
    performReset(MAX_BONES, 20000);
    sfx.upgrade();
  });

  function getViewportSize(): { width: number; height: number } {
    const rect = canvas.getBoundingClientRect();
    const docEl = document.documentElement;
    const rawW = Math.max(
      rect.width || 0,
      window.innerWidth || 0,
      docEl ? docEl.clientWidth : 0
    );
    const rawH = Math.max(
      rect.height || 0,
      window.innerHeight || 0,
      docEl ? docEl.clientHeight : 0
    );
    return {
      width: Math.max(240, Math.ceil(rawW || 360)),
      height: Math.max(240, Math.ceil(rawH || 640))
    };
  }

  function resize(): void {
    const { width, height } = getViewportSize();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    viewportW = width;
    viewportH = height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Auto-fit the 7x7 isometric island comfortably inside narrow portrait phones
    const fitW = (width - 28) / (GRID_SIZE * BASE_TILE_W * 1.05);
    const fitH = (height - 150) / (GRID_SIZE * BASE_TILE_H * 1.45);
    autoFitScale = Math.max(0.48, Math.min(1.15, Math.min(fitW, fitH)));

    originX = viewportW / 2;
    originY = viewportH / 2 + 8;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => {
    resize();
    setTimeout(resize, 150);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resize);
    window.visualViewport.addEventListener('scroll', resize);
  }
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => resize());
    ro.observe(document.documentElement);
  }
  resize();

  function gridToScreen(gx: number, gy: number): { x: number; y: number } {
    const cx = GRID_SIZE / 2;
    const cy = GRID_SIZE / 2;

    const relX = gx - cx;
    const relY = gy - cy;

    const cosA = Math.cos(cameraAngle);
    const sinA = Math.sin(cameraAngle);
    const rotX = relX * cosA - relY * sinA;
    const rotY = relX * sinA + relY * cosA;

    const tw = getTileW();
    const th = getTileH();

    return {
      x: originX + (rotX - rotY) * (tw / 2),
      y: originY + (rotX + rotY) * (th / 2)
    };
  }

  function screenToGrid(sx: number, sy: number): { gx: number; gy: number } {
    const dx = sx - originX;
    const dy = sy - originY;
    const tw = getTileW();
    const th = getTileH();

    const isoX = dx / (tw / 2);
    const isoY = dy / (th / 2);

    const rotX = (isoX + isoY) / 2;
    const rotY = (isoY - isoX) / 2;

    const cosA = Math.cos(-cameraAngle);
    const sinA = Math.sin(-cameraAngle);
    const relX = rotX * cosA - rotY * sinA;
    const relY = rotX * sinA + rotY * cosA;

    const cx = GRID_SIZE / 2;
    const cy = GRID_SIZE / 2;

    return {
      gx: relX + cx,
      gy: relY + cy
    };
  }

  function clampTileIndex(val: number): number {
    return Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(val)));
  }

  function getCenteredTilePos(gx: number, gy: number): { x: number; y: number } {
    return gridToScreen(clampTileIndex(gx) + 0.5, clampTileIndex(gy) + 0.5);
  }

  function gatherPackAt(gx: number, gy: number, ringScreenX: number, ringScreenY: number): void {
    initAudio();
    sfx.gather();
    triggerHaptic(14);
    const nowMs = Date.now();
    if (nowMs - (state.lastWhistleBoostAt || 0) >= WHISTLE_HAPPINESS_COOLDOWN_MS) {
      state.lastWhistleBoostAt = nowMs;
      addPackHappiness(3);
      updateUI();
      requestSave();
    }
    dogs.forEach((dog, idx) => {
      dog.cancelSlide();
      dog.onReachToy = null;
      dog.targetGx = Math.max(0.5, Math.min(GRID_SIZE - 0.5, gx + (Math.random() - 0.5) * 0.8));
      dog.targetGy = Math.max(0.5, Math.min(GRID_SIZE - 0.5, gy + (Math.random() - 0.5) * 0.8));
      dog.state = 'WALK';
      dog.petBounce = 0.35;
      if (idx === 0) {
        dog.barkCooldown = 0;
        dog.triggerBark();
      }
    });

    addFloatingText(ringScreenX, ringScreenY - 18, 'Here, pups!', '#ffeaa7');

    particles.push({
      x: ringScreenX,
      y: ringScreenY,
      vx: 0,
      vy: 0,
      life: 0.75,
      maxLife: 0.75,
      color: '#ffeaa7',
      size: 5,
      isRing: true
    });
  }

  document.getElementById('btnWhistle')?.addEventListener('click', () => {
    dismissOnboardingHint();
    const center = gridToScreen(GRID_SIZE / 2, GRID_SIZE / 2);
    gatherPackAt(GRID_SIZE / 2, GRID_SIZE / 2, center.x, center.y);
  });

  // Multi-touch pointer tracking for pinch-to-zoom + drag rotation + tap + hold whistle
  const activePointers = new Map<number, { x: number; y: number }>();
  let pinchStartDist = 0;
  let pinchStartZoom = 1;

  let isRotating = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let dragTotalDist = 0;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let holdStartTime = 0;
  let holdPosition = { x: 0, y: 0 };
  const HOLD_DURATION = 900;

  canvas.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    userZoom = Math.max(0.75, Math.min(1.65, userZoom * factor));
    dismissOnboardingHint();
    requestSave();
  }, { passive: false });

  let isPaintingStroke = false;
  let lastPaintedTileKey: string | null = null;
  let didPaintDuringStroke = false;

  function paintTileAtScreenPos(clientX: number, clientY: number): boolean {
    const rect = canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;
    const gridPos = screenToGrid(clickX, clickY);
    if (
      gridPos.gx < 0 || gridPos.gx >= GRID_SIZE ||
      gridPos.gy < 0 || gridPos.gy >= GRID_SIZE
    ) {
      return false;
    }
    const tx = Math.floor(gridPos.gx);
    const ty = Math.floor(gridPos.gy);
    const key = `${tx},${ty}`;
    if (key === lastPaintedTileKey) return false;
    lastPaintedTileKey = key;

    const brush = state.activeTileBrush || 'grass';
    const currentStyle: TileStyle = state.tileMap[key] || 'grass';
    if (currentStyle === brush) return false;

    if (brush === 'grass') {
      delete state.tileMap[key];
    } else {
      state.tileMap[key] = brush;
    }
    didPaintDuringStroke = true;

    tileRipples.push({
      gx: tx,
      gy: ty,
      age: 0,
      duration: 0.36,
      color: TILE_RIPPLE_COLORS[brush]
    });
    sfx.collect();
    triggerHaptic(6);
    return true;
  }

  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 2) {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      isRotating = false;
      isPaintingStroke = false;
      lastPaintedTileKey = null;
      const pts = Array.from(activePointers.values());
      pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchStartZoom = userZoom;
      return;
    }

    if (state.isPaintingTiles) {
      initAudio();
      dismissOnboardingHint();
      isRotating = false;
      cameraVelocity = 0;
      isPaintingStroke = true;
      lastPaintedTileKey = null;
      didPaintDuringStroke = false;
      try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      paintTileAtScreenPos(e.clientX, e.clientY);
      return;
    }

    isRotating = true;
    cameraVelocity = 0;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    dragTotalDist = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }

    holdStartTime = performance.now();
    holdPosition = { x: e.clientX, y: e.clientY };

    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      holdTimer = null;
      const rect = canvas.getBoundingClientRect();
      const clickX = holdPosition.x - rect.left;
      const clickY = holdPosition.y - rect.top;
      const targetGrid = screenToGrid(clickX, clickY);
      gatherPackAt(targetGrid.gx, targetGrid.gy, clickX, clickY);
      isRotating = false;
      dismissOnboardingHint();
    }, HOLD_DURATION);
  });

  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (activePointers.has(e.pointerId)) {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (activePointers.size === 2 && pinchStartDist > 0) {
      const pts = Array.from(activePointers.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      userZoom = Math.max(0.75, Math.min(1.65, pinchStartZoom * (dist / pinchStartDist)));
      dismissOnboardingHint();
      requestSave();
      return;
    }

    if (state.isPaintingTiles && isPaintingStroke && activePointers.size === 1) {
      paintTileAtScreenPos(e.clientX, e.clientY);
      return;
    }

    const moveDist = Math.hypot(e.clientX - lastMouseX, e.clientY - lastMouseY);
    dragTotalDist += moveDist;

    if (moveDist > 12 && holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }

    if (!isRotating) return;
    const deltaX = e.clientX - lastMouseX;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    if (dragTotalDist >= 12 && Math.abs(deltaX) > 0) {
      const dAngle = deltaX * 0.008;
      cameraAngle += dAngle;
      cameraVelocity = dAngle * 42;
      state.cameraAngle = cameraAngle;
      dismissOnboardingHint();
      requestSave();
    }
  });

  function clearPointer(e: PointerEvent): void {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) {
      pinchStartDist = 0;
    }
  }

  canvas.addEventListener('pointerup', (e: PointerEvent) => {
    clearPointer(e);

    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }

    if (isPaintingStroke) {
      isPaintingStroke = false;
      lastPaintedTileKey = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      if (didPaintDuringStroke) {
        didPaintDuringStroke = false;
        updateUI();
        saveGame();
      }
      return;
    }

    if (!isRotating) {
      isRotating = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      return;
    }

    isRotating = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }

    if (dragTotalDist >= 12) {
      state.cameraAngle = cameraAngle;
      saveGame();
    }

    if (dragTotalDist < 14) {
      initAudio();
      dismissOnboardingHint();
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const gridPos = screenToGrid(clickX, clickY);

      if (state.isPlacingDecor && state.activeDecorType) {
        if (
          gridPos.gx >= 0 && gridPos.gx <= GRID_SIZE &&
          gridPos.gy >= 0 && gridPos.gy <= GRID_SIZE
        ) {
          const check = resolvePlacementAnchor(state.activeDecorType, gridPos.gx, gridPos.gy);
          if (!check.ok) {
            tileRipples.push({
              gx: check.gx,
              gy: check.gy,
              age: 0,
              duration: 0.45,
              color: '#ff7675'
            });
            const bannerText = document.getElementById('placementBannerText');
            if (bannerText) bannerText.textContent = check.reason;
            sfx.thud();
            triggerHaptic(12);
            return;
          }
          const placedType = state.activeDecorType;
          state.placedDecorations.push({
            type: placedType,
            gx: check.gx,
            gy: check.gy
          });
          if (placedType === 'slide') {
            dogs.forEach(d => {
              d.slideCooldown = Math.min(d.slideCooldown, 1.2);
            });
          }
          cancelDecorPlacement();
          addPackHappiness(2.5);
          sfx.gather();
          triggerHaptic(14);
          updateUI();
          saveGame();
        }
        return;
      }

      // Check if player tapped a pup to pet it
      const scale = getScale();
      let tappedDog: Dog | null = null;
      let bestDist = Math.max(34, 38 * scale);
      dogs.forEach(d => {
        const dp = gridToScreen(d.gx, d.gy);
        const dist = Math.hypot(clickX - dp.x, clickY - (dp.y - (12 + d.slideElevation) * scale));
        if (dist < bestDist) {
          bestDist = dist;
          tappedDog = d;
        }
      });

      if (tappedDog) {
        (tappedDog as Dog).pet();
        return;
      }

      if (
        gridPos.gx >= 0 && gridPos.gx <= GRID_SIZE &&
        gridPos.gy >= 0 && gridPos.gy <= GRID_SIZE
      ) {
        const { magicBonus } = getPerkMultipliers();
        const decorMagic = getDecorBonuses().magicAdd;
        const weatherMagic = getCurrentWeather().magicAdd;
        const moodMagic = getPackHappinessInfo().magicAdd;
        const kongActive = state.kongTimer > 0;
        const naturalMagic = Math.random() < (state.magicChance + magicBonus + decorMagic + weatherMagic + moodMagic);
        const cupMult = getActiveCupMult();
        const tapBones = Math.max(1, Math.round(state.digPower * cupMult * 10) / 10);

        tileRipples.push({
          gx: clampTileIndex(gridPos.gx),
          gy: clampTileIndex(gridPos.gy),
          age: 0,
          duration: 0.45,
          color: (kongActive || naturalMagic) ? '#ffeaa7' : '#55efc4'
        });

        if (kongActive) {
          droppedBones.push({
            x: clickX - 5,
            y: clickY - 10,
            vx: -24 - Math.random() * 18,
            vy: -92,
            groundY: clickY + 5,
            age: 0,
            isMagic: false,
            value: tapBones
          });
          droppedBones.push({
            x: clickX + 6,
            y: clickY - 12,
            vx: 24 + Math.random() * 18,
            vy: -108,
            groundY: clickY + 5,
            age: 0,
            isMagic: true,
            value: 1
          });
        } else {
          droppedBones.push({
            x: clickX,
            y: clickY - 10,
            vx: (Math.random() - 0.5) * 40,
            vy: -95,
            groundY: clickY + 5,
            age: 0,
            isMagic: naturalMagic,
            value: naturalMagic ? 1 : tapBones
          });
        }

        triggerHaptic(8);
      }
    }
  });

  canvas.addEventListener('pointercancel', (e: PointerEvent) => {
    clearPointer(e);
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    if (isPaintingStroke) {
      isPaintingStroke = false;
      lastPaintedTileKey = null;
      if (didPaintDuringStroke) {
        didPaintDuringStroke = false;
        updateUI();
        saveGame();
      }
    }
    isRotating = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    requestSave();
  });

  function getAvailableSlide(excludeDog?: Dog): PlacedDecor | null {
    if (!Array.isArray(state.placedDecorations)) return null;
    const slides = state.placedDecorations.filter(d => d.type === 'slide');
    if (slides.length === 0) return null;
    for (const s of slides) {
      const busy = dogs.some(
        d => d !== excludeDog && d.slideTarget && d.slideTarget.gx === s.gx && d.slideTarget.gy === s.gy
      );
      if (!busy) return s;
    }
    return null;
  }

  class Dog {
    gx: number;
    gy: number;
    targetGx: number;
    targetGy: number;
    state: 'IDLE' | 'WALK' | 'DIG' | 'SLEEP' | 'SLIDE_CLIMB' | 'SLIDE_DOWN';
    timer: number;
    facingRight: boolean;
    sleepFacingRight: boolean;
    animPhase: number;
    wagPhase: number;
    barkCooldown: number;
    petCooldown: number;
    petBounce: number;
    rosterId: string;
    breed: string;
    isShiny: boolean;
    shinyColor: string;
    isMagicDig: boolean;
    onReachToy: (() => void) | null;
    slideTarget: { gx: number; gy: number } | null;
    slideProgress: number;
    slideElevation: number;
    slideTilt: number;
    slideCooldown: number;
    onReachSlide: (() => void) | null;
    blinkTimer: number;

    constructor(gx: number, gy: number, rosterId: string, breed = 'aussie', isShiny = false, shinyColor: string | null = null) {
      this.gx = gx;
      this.gy = gy;
      this.targetGx = gx;
      this.targetGy = gy;
      this.state = 'IDLE';
      this.timer = 0.5 + Math.random() * 1.5;
      this.facingRight = Math.random() > 0.5;
      this.sleepFacingRight = this.facingRight;
      this.animPhase = Math.random() * Math.PI * 2;
      this.wagPhase = this.animPhase;
      this.barkCooldown = DOG_BARK_MIN_COOLDOWN * 0.5 + Math.random() * (DOG_BARK_MAX_COOLDOWN - DOG_BARK_MIN_COOLDOWN * 0.5);
      this.petCooldown = 0;
      this.petBounce = 0;
      this.rosterId = rosterId;
      this.breed = normalizeBreedKey(breed);
      this.isShiny = isShiny;
      this.shinyColor = shinyColor || SHINY_PALETTES[Math.floor(Math.random() * SHINY_PALETTES.length)];
      this.isMagicDig = false;
      this.onReachToy = null;
      this.slideTarget = null;
      this.slideProgress = 0;
      this.slideElevation = 0;
      this.slideTilt = 0;
      this.slideCooldown = 3 + Math.random() * 6;
      this.onReachSlide = null;
      this.blinkTimer = 1.4 + Math.random() * 4.2;
    }

    cancelSlide(): void {
      this.slideTarget = null;
      this.slideProgress = 0;
      this.slideElevation = 0;
      this.slideTilt = 0;
      this.onReachSlide = null;
      if (this.state === 'SLIDE_CLIMB' || this.state === 'SLIDE_DOWN') {
        this.state = 'IDLE';
        this.timer = 0.6 + Math.random() * 0.8;
      }
    }

    startSlideClimb(): void {
      if (!this.slideTarget) {
        this.state = 'IDLE';
        this.timer = 0.5;
        return;
      }
      const exists = state.placedDecorations.some(
        d => d.type === 'slide' && d.gx === this.slideTarget?.gx && d.gy === this.slideTarget?.gy
      );
      if (!exists) {
        this.cancelSlide();
        return;
      }
      this.state = 'SLIDE_CLIMB';
      this.slideProgress = 0;
      this.slideElevation = 0;
      this.slideTilt = 0;
    }

    finishSlide(): void {
      const target = this.slideTarget;
      const landGx = target ? Math.min(GRID_SIZE - 0.25, target.gx + 1.66) : this.gx;
      const landGy = target ? target.gy + 0.5 : this.gy;
      this.gx = landGx;
      this.gy = landGy;
      this.slideTarget = null;
      this.slideProgress = 0;
      this.slideElevation = 0;
      this.slideTilt = 0;
      this.onReachSlide = null;
      this.slideCooldown = 16 + Math.random() * 8;
      this.petBounce = 0.42;
      this.state = 'IDLE';
      this.timer = 0.7 + Math.random() * 0.9;

      const pos = gridToScreen(this.gx, this.gy);
      const scale = getScale();
      sfx.pet();
      addPackHappiness(2);

      for (let i = 0; i < 5; i++) {
        particles.push({
          x: pos.x + (Math.random() - 0.5) * 20 * scale,
          y: pos.y - 16 * scale,
          vx: (Math.random() - 0.5) * 44,
          vy: -42 - Math.random() * 28,
          life: 0.72,
          maxLife: 0.72,
          color: i % 2 === 0 ? '#ffeaa7' : '#ff9ff3',
          size: i % 2 === 0 ? 3.5 : 4.5,
          isHeart: i % 2 === 1
        });
      }

      const entry = this.getRosterEntry();
      if (entry && entry.level < MAX_DOG_LEVEL) {
        const stats = getEffectiveBreedStats(entry, this.breed);
        const xpGain = Math.max(2, Math.round(4 * stats.quickLearner * getActiveXpBoostMult()));
        entry.xp = (entry.xp || 0) + xpGain;
        let leveledUp = false;
        while (entry.level < MAX_DOG_LEVEL && entry.xp >= getXpNeededForLevel(entry.level)) {
          entry.xp -= getXpNeededForLevel(entry.level);
          entry.level += 1;
          leveledUp = true;
        }
        if (entry.level >= MAX_DOG_LEVEL) {
          entry.level = MAX_DOG_LEVEL;
          entry.xp = 0;
        }
        addFloatingText(pos.x, pos.y - 34 * scale, leveledUp ? 'Level Up!' : `Wheee! +${xpGain} XP`, '#ffeaa7');
        if (leveledUp) {
          sfx.upgrade();
          triggerHaptic(20);
        }
        requestSave();
      } else {
        addFloatingText(pos.x, pos.y - 34 * scale, 'Wheee!', '#ffeaa7');
      }
      updateUI();
    }

    enterSleep(): void {
      this.cancelSlide();
      this.state = 'SLEEP';
      this.sleepFacingRight = this.facingRight;
      this.timer = 3.2 + Math.random() * 2.8;
    }

    getRosterEntry(): RosterEntry | null {
      return state.roster.find(r => r.id === this.rosterId) || null;
    }

    canBark(): boolean {
      return this.state !== 'SLEEP' && this.barkCooldown <= 0;
    }

    triggerBark(): boolean {
      if (!this.canBark()) return false;
      this.barkCooldown = DOG_BARK_MIN_COOLDOWN + Math.random() * (DOG_BARK_MAX_COOLDOWN - DOG_BARK_MIN_COOLDOWN);
      sfx.bark(this.breed);

      const pos = gridToScreen(this.gx, this.gy);
      const word = BARK_WORDS[Math.floor(Math.random() * BARK_WORDS.length)];
      barkPopups.push({
        dog: this,
        baseOffsetY: (-36 - this.slideElevation) * getScale(),
        fallbackX: pos.x,
        fallbackY: pos.y - (36 + this.slideElevation) * getScale(),
        text: word,
        age: 0,
        duration: BARK_TEXT_DURATION
      });
      return true;
    }

    pet(): void {
      const pos = gridToScreen(this.gx, this.gy);
      const scale = getScale();
      if (this.state === 'SLEEP') {
        this.state = 'IDLE';
        this.timer = 1.2;
      }
      this.petBounce = 0.45;
      sfx.pet();
      if (this.barkCooldown <= 3) {
        this.barkCooldown = 0;
        this.triggerBark();
      }
      triggerHaptic(12);

      for (let i = 0; i < 4; i++) {
        particles.push({
          x: pos.x + (Math.random() - 0.5) * 18 * scale,
          y: pos.y - (20 + this.slideElevation) * scale,
          vx: (Math.random() - 0.5) * 35,
          vy: -45 - Math.random() * 25,
          life: 0.75,
          maxLife: 0.75,
          color: '#ff7675',
          size: 5,
          isHeart: true
        });
      }

      if (this.petCooldown <= 0) {
        this.petCooldown = 3.0;
        addPackHappiness(5);
        const entry = this.getRosterEntry();
        if (entry && entry.level < MAX_DOG_LEVEL) {
          const stats = getEffectiveBreedStats(entry, this.breed);
          const xpGain = Math.max(1, Math.round(stats.quickLearner * getActiveXpBoostMult()));
          entry.xp = (entry.xp || 0) + xpGain;
          let leveledUp = false;
          while (entry.level < MAX_DOG_LEVEL && entry.xp >= getXpNeededForLevel(entry.level)) {
            entry.xp -= getXpNeededForLevel(entry.level);
            entry.level += 1;
            leveledUp = true;
          }
          if (entry.level >= MAX_DOG_LEVEL) {
            entry.level = MAX_DOG_LEVEL;
            entry.xp = 0;
          }
          addFloatingText(pos.x, pos.y - (32 + this.slideElevation) * scale, leveledUp ? 'Level Up!' : `♥ +${xpGain} XP`, leveledUp ? '#ffeaa7' : '#ff9ff3');
          if (leveledUp) {
            sfx.upgrade();
            triggerHaptic(22);
          }
          requestSave();
        } else {
          addFloatingText(pos.x, pos.y - (32 + this.slideElevation) * scale, '♥ Happy Pup!', '#ff9ff3');
        }
        updateUI();
      }
    }

    pickNewTarget(): void {
      if (this.slideCooldown <= 0 && !this.onReachToy) {
        const openSlide = getAvailableSlide(this);
        if (openSlide && Math.random() < 0.32) {
          this.slideTarget = { gx: openSlide.gx, gy: openSlide.gy };
          this.targetGx = Math.max(0.24, openSlide.gx + 0.26);
          this.targetGy = openSlide.gy + 0.5;
          this.onReachSlide = () => this.startSlideClimb();
          this.state = 'WALK';
          return;
        }
      }
      this.slideTarget = null;
      this.onReachSlide = null;
      this.targetGx = 0.7 + Math.random() * (GRID_SIZE - 1.4);
      this.targetGy = 0.7 + Math.random() * (GRID_SIZE - 1.4);
      this.state = 'WALK';
    }

    update(dt: number): void {
      if (this.barkCooldown > 0) {
        this.barkCooldown = Math.max(0, this.barkCooldown - dt);
      }
      if (this.petCooldown > 0) {
        this.petCooldown = Math.max(0, this.petCooldown - dt);
      }
      if (this.petBounce > 0) {
        this.petBounce = Math.max(0, this.petBounce - dt);
      }
      if (this.slideCooldown > 0) {
        this.slideCooldown = Math.max(0, this.slideCooldown - dt);
      }
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.blinkTimer = 2.6 + Math.random() * 4.2;
      }

      const cfg = BREED_CONFIG[this.breed] || BREED_CONFIG.aussie;
      const { workBonus } = getPerkMultipliers();
      const weather = getCurrentWeather();
      const moodInfo = getPackHappinessInfo();

      const baconPaceMult = getActiveBaconPaceMult();
      const decorPaceMult = getDecorBonuses().paceMult;
      const visualPace = Math.min(1.6, 1 + Math.log1p(Math.max(0, workBonus - 1)) * 0.25) * weather.digSpeedMult * moodInfo.paceMult * baconPaceMult * decorPaceMult;
      const walkSpeed = (cfg.walkMult || 1.1) * visualPace;

      this.animPhase += dt * (
        this.state === 'WALK' || this.state === 'SLIDE_CLIMB'
          ? 9 * Math.min(1.35, visualPace)
          : this.state === 'SLEEP'
            ? 1.4
            : 5 * Math.min(1.35, visualPace)
      );
      this.wagPhase += dt * (
        this.state === 'SLEEP'
          ? 1.4
          : this.state === 'SLIDE_DOWN'
            ? 10.5 * moodInfo.wagMult
            : 5.2 * moodInfo.wagMult
      );

      if (moodInfo.tier === 'ecstatic' && this.state !== 'SLEEP' && Math.random() < dt * 0.45) {
        const p = gridToScreen(this.gx, this.gy);
        const s = getScale();
        particles.push({
          x: p.x + (Math.random() - 0.5) * 14 * s,
          y: p.y - (24 + this.slideElevation) * s,
          vx: (Math.random() - 0.5) * 14,
          vy: -24 - Math.random() * 14,
          life: 0.8,
          maxLife: 0.8,
          color: '#ff9ff3',
          size: 4,
          isHeart: true
        });
      }

      if (this.state === 'SLIDE_CLIMB') {
        if (!this.slideTarget) {
          this.cancelSlide();
          return;
        }
        const pStart = getCenteredTilePos(this.slideTarget.gx, this.slideTarget.gy);
        const pEnd = getCenteredTilePos(this.slideTarget.gx + 1, this.slideTarget.gy);
        this.facingRight = pEnd.x >= pStart.x;

        this.slideProgress = Math.min(1, this.slideProgress + dt / 0.68);
        const t = this.slideProgress;
        if (t <= 0.8) {
          const climbT = t / 0.8;
          this.gx = this.slideTarget.gx + 0.26 + climbT * 0.38;
          this.slideElevation = climbT * 38 + Math.abs(Math.sin(climbT * Math.PI * 4)) * 2.2;
          this.slideTilt = -0.22 * (1 - climbT * 0.65);
        } else {
          const hopT = (t - 0.8) / 0.2;
          this.gx = this.slideTarget.gx + 0.64 + hopT * 0.14;
          this.slideElevation = 38 + Math.sin(hopT * Math.PI) * 3;
          this.slideTilt = -0.07 * (1 - hopT) + 0.12 * hopT;
        }
        this.gy = this.slideTarget.gy + 0.5;

        if (this.slideProgress >= 1) {
          this.state = 'SLIDE_DOWN';
          this.slideProgress = 0;
          sfx.gather();
        }
        return;
      }

      if (this.state === 'SLIDE_DOWN') {
        if (!this.slideTarget) {
          this.cancelSlide();
          return;
        }
        const pStart = getCenteredTilePos(this.slideTarget.gx, this.slideTarget.gy);
        const pEnd = getCenteredTilePos(this.slideTarget.gx + 1, this.slideTarget.gy);
        this.facingRight = pEnd.x >= pStart.x;

        this.slideProgress = Math.min(1, this.slideProgress + dt / 0.72);
        const t = this.slideProgress;
        const u = 0.22 * t + 0.78 * t * t;
        const omu = 1 - u;

        // Exact Quadratic Bezier matching drawDogSlide chute curve (deckFront -> chuteCtrl -> chuteFoot)
        const gx0 = this.slideTarget.gx + 0.78;
        const gx1 = this.slideTarget.gx + 1.12;
        const gx2 = this.slideTarget.gx + 1.66;
        this.gx = omu * omu * gx0 + 2 * omu * u * gx1 + u * u * gx2;
        this.gy = this.slideTarget.gy + 0.5;
        this.slideElevation = omu * omu * 38 + 2 * omu * u * 9.12 + u * u * 0;
        this.slideTilt = 0.34 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.85);

        if (Math.random() < 0.45) {
          const p = gridToScreen(this.gx, this.gy);
          const s = getScale();
          particles.push({
            x: p.x + (Math.random() - 0.5) * 10 * s,
            y: p.y - (this.slideElevation + 8) * s,
            vx: (this.facingRight ? -18 : 18) + (Math.random() - 0.5) * 12,
            vy: -14 - Math.random() * 14,
            life: 0.36,
            maxLife: 0.36,
            color: '#ffeaa7',
            size: 2.6 * s
          });
        }

        if (this.slideProgress >= 1) {
          this.finishSlide();
        }
        return;
      }

      if (this.state === 'SLEEP') {
        this.facingRight = this.sleepFacingRight;
        this.timer -= dt * baconPaceMult;
        if (this.timer <= 0) {
          this.state = 'IDLE';
          this.timer = 0.8 + Math.random() * 1.2;
        }
      } else if (this.state === 'IDLE') {
        this.timer -= dt * visualPace;
        if (this.timer <= 0) {
          if (Math.random() < 0.28) {
            this.enterSleep();
          } else {
            this.pickNewTarget();
          }
        }
      } else if (this.state === 'WALK') {
        const dx = this.targetGx - this.gx;
        const dy = this.targetGy - this.gy;
        const dist = Math.hypot(dx, dy);

        const currentScreenPos = gridToScreen(this.gx, this.gy);
        const targetScreenPos = gridToScreen(this.targetGx, this.targetGy);
        const screenDeltaX = targetScreenPos.x - currentScreenPos.x;
        if (Math.abs(screenDeltaX) > 0.5) {
          this.facingRight = screenDeltaX >= 0;
        }

        if (dist < 0.08) {
          this.gx = this.targetGx;
          this.gy = this.targetGy;

          if (this.onReachSlide) {
            const cb = this.onReachSlide;
            this.onReachSlide = null;
            cb();
            return;
          }

          if (this.onReachToy) {
            this.onReachToy();
            this.onReachToy = null;
          }

          this.state = 'DIG';
          this.timer = (cfg.digSec || 1.0) / visualPace;

          const { magicBonus } = getPerkMultipliers();
          const decorMagic = getDecorBonuses().magicAdd;
          const moodMagic = getPackHappinessInfo().magicAdd;
          const magicChanceTotal = Math.min(0.9, state.magicChance + magicBonus + decorMagic + weather.magicAdd + moodMagic + (cfg.magicBonus || 0));
          this.isMagicDig = state.kongTimer > 0 ? false : Math.random() < magicChanceTotal;

          const treasureChance = (cfg.treasureChance || 0.00008) * weather.treasureMult;
          if (!state.isDraftingPerk && Math.random() < treasureChance) {
            triggerPerkDraft();
          }
        } else {
          this.gx += (dx / dist) * walkSpeed * dt;
          this.gy += (dy / dist) * walkSpeed * dt;
          const edgeMargin = this.slideTarget ? 0.2 : 0.3;
          this.gx = Math.max(edgeMargin, Math.min(GRID_SIZE - edgeMargin, this.gx));
          this.gy = Math.max(edgeMargin, Math.min(GRID_SIZE - edgeMargin, this.gy));
        }
      } else if (this.state === 'DIG') {
        this.timer -= dt;
        if (Math.random() < 0.35) {
          const pos = gridToScreen(this.gx, this.gy);
          const scale = getScale();
          const sparkleParticle = this.isMagicDig || (state.kongTimer > 0 && Math.random() < 0.55);
          particles.push({
            x: pos.x + (this.facingRight ? 12 : -12) * scale,
            y: pos.y + 4 * scale,
            vx: (Math.random() - 0.5) * 45,
            vy: -30 - Math.random() * 40,
            life: 0.5,
            maxLife: 0.5,
            color: sparkleParticle ? '#ffeaa7' : '#795548',
            size: (sparkleParticle ? 3.5 : 3) * scale
          });
        }

        if (this.timer <= 0) {
          this.finishDig();
          this.state = 'IDLE';
          this.timer = 0.6 + Math.random() * 1.2;
        }
      }
    }

    finishDig(): void {
      const entry = this.getRosterEntry();
      const stats = getEffectiveBreedStats(entry, this.breed);
      const cupMult = getActiveCupMult();

      const packDigMult = getDigMultiplier();
      const levelMult = getDogLevelBonusMult(entry);
      const rawAmount = state.digPower * stats.boneYield * levelMult * cupMult * packDigMult;
      const amount = Math.max(1, Math.round(rawAmount * 10) / 10);
      const magicYield = 1 + (this.isShiny ? SHINY_MAGIC_BONE_BONUS : 0);
      const boneValue = this.isMagicDig ? magicYield : amount;
      const pos = gridToScreen(this.gx, this.gy);

      if (entry) {
        if (!this.isMagicDig) {
          entry.bonesEarned = (entry.bonesEarned || 0) + boneValue;
        }
        if (entry.level < MAX_DOG_LEVEL) {
          const baseXp = this.isMagicDig ? 2 : Math.max(1, Math.floor(amount));
          const xpTreatMult = getActiveXpBoostMult();
          const xpGain = Math.max(
            1,
            Math.round(baseXp * stats.quickLearner * xpTreatMult * (this.isMagicDig ? 2 : 1))
          );
          entry.xp = (entry.xp || 0) + xpGain;

          let leveledUp = false;
          while (entry.level < MAX_DOG_LEVEL && entry.xp >= getXpNeededForLevel(entry.level)) {
            entry.xp -= getXpNeededForLevel(entry.level);
            entry.level += 1;
            leveledUp = true;
          }
          if (entry.level >= MAX_DOG_LEVEL) {
            entry.level = MAX_DOG_LEVEL;
            entry.xp = 0;
          }
          if (leveledUp) {
            sfx.upgrade();
            triggerHaptic(20);
            addFloatingText(pos.x, pos.y - 38 * getScale(), 'Level Up!', '#ffeaa7');
          }
        } else {
          entry.level = MAX_DOG_LEVEL;
          entry.xp = 0;
        }
      }

      droppedBones.push({
        x: pos.x,
        y: pos.y - 6,
        vx: state.kongTimer > 0 ? -24 - Math.random() * 18 : (Math.random() - 0.5) * 50,
        vy: -110,
        groundY: pos.y + 4,
        age: 0,
        isMagic: this.isMagicDig,
        value: boneValue
      });

      if (state.kongTimer > 0) {
        droppedBones.push({
          x: pos.x + 7,
          y: pos.y - 8,
          vx: 24 + Math.random() * 18,
          vy: -124,
          groundY: pos.y + 4,
          age: 0,
          isMagic: true,
          value: magicYield
        });
      }
    }

    draw(c: CanvasRenderingContext2D): void {
      const pos = gridToScreen(this.gx, this.gy);
      const scale = getScale();
      const isSleeping = this.state === 'SLEEP';
      const isOnSlide = this.state === 'SLIDE_CLIMB' || this.state === 'SLIDE_DOWN';
      const effectiveFacingRight = isSleeping ? this.sleepFacingRight : this.facingRight;

      c.save();
      c.translate(pos.x, pos.y);
      c.scale(scale, scale);

      if (this.isShiny && !isOnSlide) {
        c.save();
        c.strokeStyle = 'rgba(255, 234, 167, 0.8)';
        c.lineWidth = 2;
        c.beginPath();
        c.ellipse(0, 4, isSleeping ? 22 : 24 + Math.sin(this.animPhase * 3) * 3, isSleeping ? 9.5 : 11, 0, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      }

      if (this.state === 'DIG' && this.isMagicDig) {
        c.save();
        c.strokeStyle = 'rgba(255, 234, 167, 0.85)';
        c.lineWidth = 2.5;
        c.beginPath();
        c.ellipse(0, 6, 26 + Math.sin(this.animPhase * 2) * 3, 13, 0, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      }

      if (isOnSlide) {
        c.fillStyle = 'rgba(0, 0, 0, 0.18)';
        c.beginPath();
        c.ellipse(0, -this.slideElevation + 4.5, 11, 4.2, 0, 0, Math.PI * 2);
        c.fill();
      } else {
        c.fillStyle = 'rgba(0, 0, 0, 0.34)';
        c.beginPath();
        c.ellipse(0, 4, isSleeping ? 20 : 17, isSleeping ? 8.5 : 8, 0, 0, Math.PI * 2);
        c.fill();
      }

      c.save();
      if (!effectiveFacingRight) {
        c.scale(-1, 1);
      }

      let feastJump = 0;
      if (state.feastAnimTimer > 0 && !isSleeping && !isOnSlide) {
        feastJump = Math.abs(Math.sin(state.feastAnimTimer * Math.PI * 4)) * 14;
      }

      const petHop = this.petBounce > 0 ? Math.sin((this.petBounce / 0.45) * Math.PI) * 9 : 0;
      const sleepBreath = isSleeping ? Math.sin(this.animPhase) * 0.35 : 0;
      const bounce = isSleeping
        ? -4.2
        : isOnSlide
          ? this.slideElevation
          : (this.state === 'WALK' ? Math.abs(Math.sin(this.animPhase)) * 3 : 0) + feastJump + petHop;
      const poseTilt = isSleeping
        ? 0
        : isOnSlide
          ? this.slideTilt
          : (this.state === 'DIG' ? 0.25 : 0);

      c.translate(0, -bounce);
      c.rotate(poseTilt);

      const legSwing = isSleeping
        ? 0
        : (this.state === 'WALK' || this.state === 'SLIDE_CLIMB'
            ? Math.sin(this.animPhase) * 4.1
            : (this.state === 'DIG' ? Math.sin(this.animPhase * 3) * 4.8 : (this.state === 'SLIDE_DOWN' ? 3.5 : 0)));
      const moodInfo = getPackHappinessInfo();
      const moodWagAmp = moodInfo.wagAmp;
      const tailWag = isSleeping
        ? Math.sin(this.wagPhase * 0.65) * 0.5
        : Math.sin(this.wagPhase * 2.2) * 2.5 * moodWagAmp;
      const isBlinking = !isSleeping && this.blinkTimer < 0.13;
      const isJoyful = !isSleeping && (this.petBounce > 0.05 || this.state === 'SLIDE_DOWN' || state.feastAnimTimer > 0);
      const showTongue = isJoyful || (!isSleeping && moodInfo.tier === 'ecstatic' && Math.sin(this.wagPhase * 0.45) > 0.35);
      const earBounce = isSleeping
        ? 0
        : this.state === 'SLIDE_DOWN'
          ? -1.8
          : this.petBounce > 0
            ? -Math.sin((this.petBounce / 0.45) * Math.PI) * 2.0
            : (this.state === 'WALK' || this.state === 'SLIDE_CLIMB' ? Math.sin(this.animPhase * 2) * 0.95 : 0);

      drawIllustratedDog(c, {
        breed: this.breed,
        isShiny: this.isShiny,
        shinyColor: this.shinyColor,
        isSleeping,
        isBlinking,
        isJoyful,
        showTongue,
        legSwing,
        sleepBreath,
        wagPhase: this.wagPhase,
        animPhase: this.animPhase,
        moodWagAmp,
        tailWag,
        earBounce
      });

      c.restore();

      if (state.showNameTags) {
        const entry = this.getRosterEntry();
        const label = entry ? entry.name : (BREED_LABELS[this.breed] || this.breed);
        const tagY = (isSleeping ? -22 : -36) - this.slideElevation;

        c.font = '700 11px "Plus Jakarta Sans", system-ui, sans-serif';
        const textWidth = c.measureText(label).width;
        const padX = 7;
        const boxW = textWidth + padX * 2;
        const boxH = 18;

        c.fillStyle = 'rgba(13, 11, 26, 0.82)';
        drawRoundedRect(c, -boxW / 2, tagY - boxH / 2, boxW, boxH, 7);
        c.fill();

        c.strokeStyle = this.isShiny ? 'rgba(255, 234, 167, 0.85)' : 'rgba(162, 155, 254, 0.5)';
        c.lineWidth = 1;
        c.stroke();

        c.fillStyle = this.isShiny ? '#ffeaa7' : '#ffffff';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(label, 0, tagY + 0.5);

        if (isSleeping) {
          const zDrift = (this.animPhase * 2.5) % 6;
          c.save();
          c.font = '800 10px "Outfit", system-ui, sans-serif';
          c.fillStyle = 'rgba(200, 210, 218, 0.85)';
          c.textAlign = 'left';
          c.textBaseline = 'middle';
          c.fillText('zZz', boxW / 2 + 5 + zDrift * 0.25, tagY - zDrift * 0.45);
          c.restore();
        }
      } else if (isSleeping) {
        const zDrift = (this.animPhase * 3.5) % 10;
        c.save();
        c.font = '800 10px "Outfit", system-ui, sans-serif';
        c.fillStyle = 'rgba(200, 210, 218, 0.85)';
        c.textAlign = 'center';
        c.fillText('zZz', 10 + zDrift * 0.4, -16 - zDrift);
        c.restore();
      }

      c.restore();
    }
  }

  function triggerPerkDraft(): void {
    state.isDraftingPerk = true;
    sfx.shiny();
    triggerHaptic(25);
    const modal = document.getElementById('perkModal');
    const choicesContainer = document.getElementById('perkChoices');
    if (!modal || !choicesContainer) return;

    choicesContainer.innerHTML = '';

    const shuffled = [...PERK_POOL].sort(() => 0.5 - Math.random());
    const options = shuffled.slice(0, 3);

    options.forEach(perk => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'perk-choice-btn';

      let rarityColor = '#a29bfe';
      if (perk.rarity === 'Rare') rarityColor = '#0984e3';
      if (perk.rarity === 'Legendary') rarityColor = '#f1c40f';
      if (perk.rarity === 'Mythic') rarityColor = '#e84393';

      btn.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <span style="font-weight: 800; font-size: 1rem; color: #fff;">${perk.name}</span>
          <span style="font-size: 0.75rem; font-weight: 700; color: ${rarityColor};">[${perk.rarity}]</span>
        </div>
        <div style="font-size: 0.8rem; color: #b8c2d4; margin-top: 2px;">${perk.desc}</div>
      `;

      btn.addEventListener('click', () => {
        state.perks.push(perk);
        state.isDraftingPerk = false;
        modal.style.display = 'none';
        sfx.upgrade();
        updateUI();
        saveGame();
        flushQueuedAwayProgressIfReady();
      });

      choicesContainer.appendChild(btn);
    });

    modal.style.display = 'flex';
  }

  function drawIslandBase(): void {
    const scale = getScale();
    const depth = 22 * scale;
    const subDepth = 10 * scale;

    // Soft floating island shadow
    const center = gridToScreen(GRID_SIZE / 2, GRID_SIZE / 2);
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(center.x, center.y + depth + 26 * scale, GRID_SIZE * getTileW() * 0.52, GRID_SIZE * getTileH() * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Determine the 4 outer edges and draw only the two front-facing ones (highest mid-Y)
    const edges = [
      { a: gridToScreen(0, 0), b: gridToScreen(GRID_SIZE, 0), shade: '#5d4037', rim: '#4e342e' },
      { a: gridToScreen(GRID_SIZE, 0), b: gridToScreen(GRID_SIZE, GRID_SIZE), shade: '#6d4c41', rim: '#563930' },
      { a: gridToScreen(GRID_SIZE, GRID_SIZE), b: gridToScreen(0, GRID_SIZE), shade: '#5d4037', rim: '#4e342e' },
      { a: gridToScreen(0, GRID_SIZE), b: gridToScreen(0, 0), shade: '#6d4c41', rim: '#563930' }
    ];

    edges.sort((e1, e2) => ((e1.a.y + e1.b.y) / 2) - ((e2.a.y + e2.b.y) / 2));
    const frontEdges = edges.slice(2);

    frontEdges.forEach(edge => {
      // Top rich soil layer
      ctx.beginPath();
      ctx.moveTo(edge.a.x, edge.a.y);
      ctx.lineTo(edge.b.x, edge.b.y);
      ctx.lineTo(edge.b.x, edge.b.y + depth);
      ctx.lineTo(edge.a.x, edge.a.y + depth);
      ctx.closePath();
      ctx.fillStyle = edge.shade;
      ctx.fill();

      // Deeper bedrock trim
      ctx.beginPath();
      ctx.moveTo(edge.a.x, edge.a.y + depth);
      ctx.lineTo(edge.b.x, edge.b.y + depth);
      ctx.lineTo(edge.b.x, edge.b.y + depth + subDepth);
      ctx.lineTo(edge.a.x, edge.a.y + depth + subDepth);
      ctx.closePath();
      ctx.fillStyle = edge.rim;
      ctx.fill();
    });
  }

  function getTileStyle(gx: number, gy: number): TileStyle {
    return state.tileMap[`${gx},${gy}`] || 'grass';
  }

  function drawIsoQuad(
    gx: number,
    gy: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    fill: string,
    stroke?: string
  ): void {
    const p0 = gridToScreen(gx + u0, gy + v0);
    const p1 = gridToScreen(gx + u1, gy + v0);
    const p2 = gridToScreen(gx + u1, gy + v1);
    const p3 = gridToScreen(gx + u0, gy + v1);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  function drawIsometricTile(gx: number, gy: number): void {
    const top = gridToScreen(gx, gy);
    const right = gridToScreen(gx + 1, gy);
    const bottom = gridToScreen(gx + 1, gy + 1);
    const left = gridToScreen(gx, gy + 1);

    const isChecker = (gx + gy) % 2 === 0;
    const style = getTileStyle(gx, gy);
    const scale = getScale();
    const seed = ((gx * 37 + gy * 17) % 11) / 11;

    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.lineTo(left.x, left.y);
    ctx.closePath();

    if (style === 'grass') {
      ctx.fillStyle = isChecker ? '#4cd137' : '#44bd32';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.lineWidth = 1;
      ctx.stroke();
      return;
    }

    if (style === 'cobble') {
      ctx.fillStyle = isChecker ? '#756f66' : '#6c665d';
      ctx.fill();
      ctx.save();
      ctx.clip();

      const stonePalette = ['#c5bcb0', '#b2aaa0', '#cbc0ae', '#a49f96', '#b9afa2', '#9d978e'];
      const stones = (gx + gy) % 2 === 0
        ? [
            [0.05, 0.05, 0.50, 0.45],
            [0.55, 0.05, 0.95, 0.43],
            [0.05, 0.50, 0.38, 0.95],
            [0.43, 0.48, 0.95, 0.72],
            [0.43, 0.76, 0.95, 0.95]
          ]
        : [
            [0.05, 0.05, 0.42, 0.52],
            [0.47, 0.05, 0.95, 0.38],
            [0.47, 0.43, 0.95, 0.95],
            [0.05, 0.57, 0.42, 0.95]
          ];

      stones.forEach(([u0, v0, u1, v1], idx) => {
        const col = stonePalette[(gx * 3 + gy * 5 + idx) % stonePalette.length];
        drawIsoQuad(gx, gy, u0, v0, u1, v1, col, 'rgba(255, 250, 240, 0.22)');
      });

      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(right.x, right.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.lineTo(left.x, left.y);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(42, 38, 34, 0.28)';
      ctx.lineWidth = 1;
      ctx.stroke();
      return;
    }

    if (style === 'sand') {
      ctx.fillStyle = isChecker ? '#e8c785' : '#e0bc75';
      ctx.fill();
      ctx.save();
      ctx.clip();

      // Wind-swept sand ripple arcs projected onto isometric ground
      ctx.strokeStyle = 'rgba(181, 136, 68, 0.34)';
      ctx.lineWidth = Math.max(1, 1.3 * scale);
      ctx.lineCap = 'round';
      for (let r = 0; r < 2; r++) {
        const vBase = 0.28 + r * 0.42 + (seed - 0.5) * 0.08;
        const pStart = gridToScreen(gx + 0.14, gy + vBase);
        const pCtrl = gridToScreen(gx + 0.52, gy + vBase - 0.12);
        const pEnd = gridToScreen(gx + 0.86, gy + vBase + 0.04);
        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.quadraticCurveTo(pCtrl.x, pCtrl.y, pEnd.x, pEnd.y);
        ctx.stroke();
      }

      // Tiny smooth pebbles
      const pebbles = [
        { u: 0.24 + seed * 0.12, v: 0.32, r: 1.9, c: '#c49f66' },
        { u: 0.72 - seed * 0.1, v: 0.28 + seed * 0.15, r: 1.5, c: '#f7e5be' },
        { u: 0.55, v: 0.74 - seed * 0.1, r: 2.0, c: '#b89056' }
      ];
      pebbles.forEach(pb => {
        const pt = gridToScreen(gx + pb.u, gy + pb.v);
        ctx.fillStyle = pb.c;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, pb.r * scale, pb.r * 0.58 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(right.x, right.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.lineTo(left.x, left.y);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255, 245, 215, 0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
      return;
    }

    // Clover Meadow
    ctx.fillStyle = isChecker ? '#2fa857' : '#28994d';
    ctx.fill();
    ctx.save();
    ctx.clip();

    const clovers = [
      { u: 0.26, v: 0.28 },
      { u: 0.68, v: 0.34 },
      { u: 0.38, v: 0.72 },
      { u: 0.74, v: 0.74 }
    ];
    clovers.forEach((cl, idx) => {
      const jitterU = ((gx * 7 + gy * 13 + idx * 5) % 9 - 4) * 0.02;
      const jitterV = ((gx * 11 + gy * 3 + idx * 7) % 9 - 4) * 0.02;
      const pt = gridToScreen(gx + cl.u + jitterU, gy + cl.v + jitterV);
      const r = 2.4 * scale;
      ctx.fillStyle = idx % 2 === 0 ? '#1e7e3c' : '#3bd16a';
      ctx.beginPath();
      ctx.arc(pt.x - r * 0.6, pt.y, r * 0.75, 0, Math.PI * 2);
      ctx.arc(pt.x + r * 0.6, pt.y, r * 0.75, 0, Math.PI * 2);
      ctx.arc(pt.x, pt.y - r * 0.65, r * 0.75, 0, Math.PI * 2);
      ctx.fill();
    });

    const blossoms = [
      { u: 0.22 + seed * 0.16, v: 0.56, c: '#fffef5' },
      { u: 0.64, v: 0.22 + seed * 0.16, c: '#ffeaa7' },
      { u: 0.52 - seed * 0.1, v: 0.80, c: '#fffef5' }
    ];
    blossoms.forEach(bl => {
      const pt = gridToScreen(gx + bl.u, gy + bl.v);
      ctx.fillStyle = bl.c;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.75 * scale, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.lineTo(left.x, left.y);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.11)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawTileGrassTufts(): void {
    const scale = getScale();
    ctx.save();
    ctx.strokeStyle = 'rgba(30, 130, 45, 0.55)';
    ctx.lineWidth = Math.max(1, 1.4 * scale);
    ctx.lineCap = 'round';
    tileDetails.forEach(td => {
      if (getTileStyle(td.gx, td.gy) !== 'grass') return;
      td.tufts.forEach(t => {
        const p = gridToScreen(td.gx + t.dx, td.gy + t.dy);
        const h = t.h * scale;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 2.5 * scale, p.y - h);
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 2 * scale, p.y - h * 0.85);
        ctx.stroke();
      });
    });
    ctx.restore();
  }

  function drawDoghouse(): void {
    const pos = getCenteredTilePos(DOGHOUSE_TILE.gx, DOGHOUSE_TILE.gy);
    const scale = getScale();
    const glowStrength = Math.min(1, 0.28 + weatherWeights.twilight * 0.9 + weatherWeights.rain * 0.45);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    const cosA = Math.cos(cameraAngle);
    const sinA = Math.sin(cameraAngle);
    const viewingBack = (cosA + sinA) < 0;

    // Grounded soft shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 6.5, 29, 13.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Warm wooden porch base deck
    ctx.fillStyle = '#6c3e1b';
    ctx.strokeStyle = '#47270f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-22.5, 0.5, 45, 5.2, 2);
    ctx.fill();
    ctx.stroke();

    if (viewingBack) {
      // Shaded rear cedar clapboard cabin
      ctx.fillStyle = '#79461d';
      ctx.strokeStyle = '#4e2c11';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.roundRect(-20, -25, 40, 26.5, [2, 2, 0, 0]);
      ctx.fill();
      ctx.stroke();

      // Horizontal clapboard siding grooves
      ctx.strokeStyle = 'rgba(54, 28, 10, 0.48)';
      ctx.lineWidth = 1;
      for (let py = -20; py <= -4; py += 4.5) {
        ctx.beginPath();
        ctx.moveTo(-19.5, py);
        ctx.lineTo(19.5, py);
        ctx.stroke();
      }

      // Corner wood trim posts
      ctx.fillStyle = '#e7d7bf';
      ctx.fillRect(-20.5, -25, 3, 26.5);
      ctx.fillRect(17.5, -25, 3, 26.5);

      // Pitched slate-blue shingled back roof
      const backRoofGrad = ctx.createLinearGradient(0, -44, 0, -21);
      backRoofGrad.addColorStop(0, '#4a7ba7');
      backRoofGrad.addColorStop(1, '#2d5376');
      ctx.fillStyle = backRoofGrad;
      ctx.strokeStyle = '#1f3b54';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-27.5, -21.5);
      ctx.lineTo(0, -43.5);
      ctx.lineTo(27.5, -21.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Subtle shingle scallops
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 0.9;
      for (let row = 0; row < 3; row++) {
        const y = -25 - row * 5.2;
        const halfW = 19 - row * 5.2;
        ctx.beginPath();
        ctx.moveTo(-halfW, y);
        ctx.lineTo(halfW, y);
        ctx.stroke();
      }

      // Cream roof ridge cap
      ctx.fillStyle = '#dfe8f0';
      ctx.beginPath();
      ctx.arc(0, -43.2, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Warm cozy porch lantern spill onto the front grass
      const lanternGrad = ctx.createRadialGradient(0, 6, 2, 0, 6, 32);
      lanternGrad.addColorStop(0, `rgba(255, 232, 152, ${0.46 * glowStrength})`);
      lanternGrad.addColorStop(0.55, `rgba(255, 206, 110, ${0.18 * glowStrength})`);
      lanternGrad.addColorStop(1, 'rgba(255, 234, 167, 0)');
      ctx.fillStyle = lanternGrad;
      ctx.beginPath();
      ctx.ellipse(0, 6.5, 32, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cedar cabin main wall with warm top-to-bottom wood gradient
      const wallGrad = ctx.createLinearGradient(-20, -25, 20, 2);
      wallGrad.addColorStop(0, '#a86730');
      wallGrad.addColorStop(0.55, '#915524');
      wallGrad.addColorStop(1, '#754119');
      ctx.fillStyle = wallGrad;
      ctx.strokeStyle = '#532c10';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.roundRect(-20, -25, 40, 26.5, [2, 2, 0, 0]);
      ctx.fill();
      ctx.stroke();

      // Horizontal cedar clapboard plank lines
      ctx.strokeStyle = 'rgba(65, 34, 12, 0.42)';
      ctx.lineWidth = 0.9;
      for (let py = -20.5; py <= -3.5; py += 4.5) {
        ctx.beginPath();
        ctx.moveTo(-19.5, py);
        ctx.lineTo(19.5, py);
        ctx.stroke();
      }

      // Cream corner trim boards
      ctx.fillStyle = '#f2e5d0';
      ctx.fillRect(-20.4, -24.5, 2.9, 26);
      ctx.fillRect(17.5, -24.5, 2.9, 26);

      // Cream doorway frame arch
      ctx.fillStyle = '#f5ead6';
      ctx.beginPath();
      ctx.arc(0, -10.5, 11.4, Math.PI, 0);
      ctx.lineTo(11.4, 1.8);
      ctx.lineTo(-11.4, 1.8);
      ctx.closePath();
      ctx.fill();

      // Dark cozy cabin interior
      ctx.fillStyle = '#24150d';
      ctx.beginPath();
      ctx.arc(0, -10.2, 9.4, Math.PI, 0);
      ctx.lineTo(9.4, 1.8);
      ctx.lineTo(-9.4, 1.8);
      ctx.closePath();
      ctx.fill();

      // Peek of cozy red cushion inside doorway
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.ellipse(0, 0.8, 7.6, 2.4, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#f5cd79';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-4, 0.4);
      ctx.lineTo(4, 0.4);
      ctx.stroke();

      // Pitched overhanging roof shadow under eaves
      ctx.fillStyle = 'rgba(20, 12, 8, 0.35)';
      ctx.beginPath();
      ctx.moveTo(-22, -21.5);
      ctx.lineTo(0, -37.5);
      ctx.lineTo(22, -21.5);
      ctx.lineTo(20, -18.5);
      ctx.lineTo(0, -33.5);
      ctx.lineTo(-20, -18.5);
      ctx.closePath();
      ctx.fill();

      // Slate-blue pitched shingle roof
      const roofGrad = ctx.createLinearGradient(-24, -44, 24, -20);
      roofGrad.addColorStop(0, '#5a90be');
      roofGrad.addColorStop(0.5, '#3d709c');
      roofGrad.addColorStop(1, '#2b5274');
      ctx.fillStyle = roofGrad;
      ctx.strokeStyle = '#1e3a52';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-28, -21);
      ctx.lineTo(0, -44);
      ctx.lineTo(28, -21);
      ctx.lineTo(24.5, -18.5);
      ctx.lineTo(0, -38.8);
      ctx.lineTo(-24.5, -18.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner gable wood triangle
      ctx.fillStyle = '#8b5122';
      ctx.beginPath();
      ctx.moveTo(-21, -21);
      ctx.lineTo(0, -38.2);
      ctx.lineTo(21, -21);
      ctx.closePath();
      ctx.fill();

      // Cream bargeboard trim along roof edge
      ctx.strokeStyle = '#f5ead6';
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-25.5, -20.0);
      ctx.lineTo(0, -41.0);
      ctx.lineTo(25.5, -20.0);
      ctx.stroke();

      // Miniature bone nameplate mounted on the gable
      ctx.fillStyle = '#fff5dc';
      ctx.strokeStyle = '#6c3e1b';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.roundRect(-5.2, -29.2, 10.4, 3.6, 1.5);
      ctx.fill();
      ctx.stroke();
      [-5.2, 5.2].forEach(bx => {
        ctx.beginPath();
        ctx.arc(bx, -28.6, 1.6, 0, Math.PI * 2);
        ctx.arc(bx, -26.2, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Tiny warm glowing porch lantern hanging to the right of the door
      const lx = 14.2;
      const ly = -14.2;
      const bulbHalo = ctx.createRadialGradient(lx, ly, 0.5, lx, ly, 9);
      bulbHalo.addColorStop(0, `rgba(255, 244, 175, ${0.85 * glowStrength})`);
      bulbHalo.addColorStop(1, 'rgba(255, 210, 105, 0)');
      ctx.fillStyle = bulbHalo;
      ctx.beginPath();
      ctx.arc(lx, ly, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2d3436';
      ctx.fillRect(lx - 1.5, ly - 3.6, 3.0, 1.4);
      ctx.fillStyle = '#ffeaa7';
      ctx.beginPath();
      ctx.arc(lx, ly - 0.8, 2.0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawDetailedTreeAt(gx: number, gy: number): void {
    const pos = getCenteredTilePos(gx, gy);
    const scale = getScale();
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    // Dappled canopy ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
    ctx.beginPath();
    ctx.ellipse(1.5, 4.5, 21, 9.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft moss tuft around root base
    ctx.fillStyle = '#2b8a3e';
    ctx.beginPath();
    ctx.ellipse(0, 2.2, 9.2, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tapered organic bark trunk with flared roots & forked boughs
    const trunkGrad = ctx.createLinearGradient(-6, 0, 6, 0);
    trunkGrad.addColorStop(0, '#5a3822');
    trunkGrad.addColorStop(0.38, '#8d5b3a');
    trunkGrad.addColorStop(0.75, '#724629');
    trunkGrad.addColorStop(1, '#4c2e1b');
    ctx.fillStyle = trunkGrad;
    ctx.beginPath();
    ctx.moveTo(-7.2, 2.8);
    ctx.quadraticCurveTo(-4.4, -2.5, -4.0, -18.5);
    ctx.lineTo(-8.5, -24.5);
    ctx.lineTo(-5.2, -25.8);
    ctx.lineTo(-1.2, -20.8);
    ctx.lineTo(1.2, -20.8);
    ctx.lineTo(6.2, -26.2);
    ctx.lineTo(8.6, -24.2);
    ctx.lineTo(4.0, -18.0);
    ctx.quadraticCurveTo(4.5, -2.5, 7.2, 2.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3f2414';
    ctx.lineWidth = 0.85;
    ctx.stroke();

    // Subtle vertical bark grain lines
    ctx.strokeStyle = 'rgba(48, 26, 12, 0.42)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-1.8, -1.5);
    ctx.quadraticCurveTo(-1.4, -9, -2.0, -16);
    ctx.moveTo(1.6, 0.5);
    ctx.quadraticCurveTo(2.0, -7, 1.4, -14.5);
    ctx.stroke();

    // Deep forest shaded underside foliage puffs
    ctx.fillStyle = '#1b7a43';
    ctx.beginPath();
    ctx.arc(-11.5, -25.5, 11.2, 0, Math.PI * 2);
    ctx.arc(11.8, -25.0, 10.8, 0, Math.PI * 2);
    ctx.arc(0, -23.5, 13.0, 0, Math.PI * 2);
    ctx.fill();

    // Rich mid-emerald canopy body clusters
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.arc(-10.5, -30.5, 11.5, 0, Math.PI * 2);
    ctx.arc(10.5, -30.0, 11.2, 0, Math.PI * 2);
    ctx.arc(0, -34.5, 13.8, 0, Math.PI * 2);
    ctx.fill();

    // Vibrant upper leaf puffs
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(-7.5, -35.8, 9.6, 0, Math.PI * 2);
    ctx.arc(7.8, -35.0, 9.2, 0, Math.PI * 2);
    ctx.arc(0.5, -40.5, 10.5, 0, Math.PI * 2);
    ctx.fill();

    // Sunlit golden-lime crown highlights
    ctx.fillStyle = '#7bed9f';
    ctx.beginPath();
    ctx.arc(-5.2, -39.5, 5.4, 0, Math.PI * 2);
    ctx.arc(3.8, -42.5, 5.0, 0, Math.PI * 2);
    ctx.arc(8.4, -36.8, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Tiny decorative leaf stipples for storybook texture
    ctx.fillStyle = 'rgba(220, 255, 210, 0.55)';
    [
      { x: -11, y: -33, r: 1.5 },
      { x: -2, y: -45, r: 1.7 },
      { x: 9, y: -39, r: 1.5 },
      { x: 2, y: -31, r: 1.4 }
    ].forEach(dot => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  function drawTree(): void {
    drawDetailedTreeAt(STARTER_TREE_TILE.gx, STARTER_TREE_TILE.gy);
  }

  function drawCustomTree(gx: number, gy: number): void {
    drawDetailedTreeAt(gx, gy);
  }

  function drawFlowerPatch(gx: number, gy: number): void {
    const pos = getCenteredTilePos(gx, gy);
    const scale = getScale();
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8b5a2b';
    ctx.beginPath();
    ctx.ellipse(0, 1, 13, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5c3a21';
    ctx.lineWidth = 1;
    ctx.stroke();

    const flowerData = [
      { x: -5, y: -2, c: '#fd79a8', center: '#ffeaa7' },
      { x: 4, y: -4, c: '#ff7675', center: '#fab1a0' },
      { x: -2, y: -6, c: '#a29bfe', center: '#dfe6e9' },
      { x: 6, y: -1, c: '#ffeaa7', center: '#fdcb6e' },
      { x: 1, y: -2, c: '#74b9ff', center: '#81ecec' }
    ];

    flowerData.forEach(f => {
      ctx.fillStyle = '#00b894';
      ctx.fillRect(f.x - 1, f.y, 2, 4);

      ctx.fillStyle = f.c;
      ctx.beginPath();
      ctx.arc(f.x, f.y - 1, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = f.center;
      ctx.beginPath();
      ctx.arc(f.x, f.y - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  let fountainAnimPhase = 0;

  function drawWaterFountain(gx: number, gy: number): void {
    const pos = getCenteredTilePos(gx, gy);
    const scale = getScale();
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    // Grounded soft shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(0, 5.5, 24, 11.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sculpted limestone base plinth
    const baseGrad = ctx.createLinearGradient(-21, 0, 21, 0);
    baseGrad.addColorStop(0, '#99a5b2');
    baseGrad.addColorStop(0.32, '#dce3ea');
    baseGrad.addColorStop(0.7, '#bfc8d2');
    baseGrad.addColorStop(1, '#7f8c99');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.ellipse(0, 3.2, 21, 10.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Outer basin vertical wall
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.ellipse(0, 2.2, 19.5, 9.2, 0, 0, Math.PI);
    ctx.lineTo(-19.5, -2.5);
    ctx.ellipse(0, -2.5, 19.5, 9.2, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6c7a89';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Beveled bright marble outer rim
    ctx.fillStyle = '#eef3f7';
    ctx.strokeStyle = '#9aa7b4';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -2.5, 19.5, 9.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Recessed inner basin wall
    ctx.fillStyle = '#7f8fa6';
    ctx.beginPath();
    ctx.ellipse(0, -2.2, 16.5, 7.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Layered turquoise-to-cerulean water pool
    const waterGrad = ctx.createRadialGradient(-3, -3.5, 2, 0, -2, 16);
    waterGrad.addColorStop(0, '#48dbfb');
    waterGrad.addColorStop(0.55, '#0984e3');
    waterGrad.addColorStop(1, '#0652dd');
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.ellipse(0, -1.6, 15.6, 7.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // Two staggered concentric animated ripples
    for (let r = 0; r < 2; r++) {
      const cycle = ((fountainAnimPhase * 0.28 + r * 0.5) % 1);
      const radX = 4.2 + cycle * 10.6;
      const radY = radX * 0.45;
      ctx.strokeStyle = `rgba(225, 248, 255, ${(1 - cycle) * 0.65})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(0, -1.6, radX, radY, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Subtle sunlit shimmer highlight on basin water
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-4.5, -2.5, 5.5, 2.1, -0.15, Math.PI * 1.05, Math.PI * 1.85);
    ctx.stroke();

    // Fluted center marble column
    const colGrad = ctx.createLinearGradient(-4.5, 0, 4.5, 0);
    colGrad.addColorStop(0, '#9aa7b4');
    colGrad.addColorStop(0.35, '#f5f8fa');
    colGrad.addColorStop(0.75, '#cfd8e0');
    colGrad.addColorStop(1, '#83919e');
    ctx.fillStyle = colGrad;
    ctx.beginPath();
    ctx.moveTo(-4.8, -1.5);
    ctx.lineTo(-3.6, -24.5);
    ctx.lineTo(3.6, -24.5);
    ctx.lineTo(4.8, -1.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7e8c99';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Decorative carved pedestal base ring
    ctx.fillStyle = '#e6edf2';
    ctx.beginPath();
    ctx.ellipse(0, -2.2, 6.2, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mid-tier sculpted saucer bowl underside
    ctx.fillStyle = '#a5b2bf';
    ctx.beginPath();
    ctx.ellipse(0, -16.8, 10.8, 4.8, 0, 0, Math.PI);
    ctx.quadraticCurveTo(-5, -12.5, 0, -12.2);
    ctx.quadraticCurveTo(5, -12.5, 10.8, -16.8);
    ctx.closePath();
    ctx.fill();

    // Mid-tier saucer rim
    ctx.fillStyle = '#f1f5f8';
    ctx.strokeStyle = '#8b99a7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, -17.4, 11.4, 5.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mid-tier water pool
    const midWaterGrad = ctx.createRadialGradient(-2, -18, 1, 0, -17.4, 9.5);
    midWaterGrad.addColorStop(0, '#74f0ff');
    midWaterGrad.addColorStop(1, '#0984e3');
    ctx.fillStyle = midWaterGrad;
    ctx.beginPath();
    ctx.ellipse(0, -17.4, 9.2, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Upper tier neck + carved crown finial
    ctx.fillStyle = colGrad;
    ctx.beginPath();
    ctx.moveTo(-2.8, -17.6);
    ctx.lineTo(-2.1, -28.5);
    ctx.lineTo(2.1, -28.5);
    ctx.lineTo(2.8, -17.6);
    ctx.closePath();
    ctx.fill();

    // Top small saucer & brass nozzle
    ctx.fillStyle = '#eef3f7';
    ctx.strokeStyle = '#8b99a7';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(0, -27.2, 5.2, 2.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f6d365';
    ctx.beginPath();
    ctx.arc(0, -29.6, 2.0, 0, Math.PI * 2);
    ctx.fill();

    // 4 Lower cascading parabolic water arcs (mid bowl -> main basin)
    const lowerStreams = [
      { sx: -9.5, sy: -16.4, cx: -13.5, cy: -11.5, ex: -12.6, ey: -1.8 },
      { sx: 9.5, sy: -16.4, cx: 13.5, cy: -11.5, ex: 12.6, ey: -1.8 },
      { sx: -4.2, sy: -14.2, cx: -6.8, cy: -8.5, ex: -6.2, ey: 0.4 },
      { sx: 4.2, sy: -14.2, cx: 6.8, cy: -8.5, ex: 6.2, ey: 0.4 }
    ];
    lowerStreams.forEach((st, idx) => {
      const shimmer = 0.58 + 0.32 * Math.sin(fountainAnimPhase * 2.1 + idx * 1.4);
      ctx.strokeStyle = `rgba(148, 226, 255, ${shimmer})`;
      ctx.lineWidth = 1.65;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(st.sx, st.sy);
      ctx.quadraticCurveTo(st.cx, st.cy, st.ex, st.ey);
      ctx.stroke();

      // Animated water droplet sliding down arc
      const t = (fountainAnimPhase * 0.55 + idx * 0.25) % 1;
      const omt = 1 - t;
      const dx = omt * omt * st.sx + 2 * omt * t * st.cx + t * t * st.ex;
      const dy = omt * omt * st.sy + 2 * omt * t * st.cy + t * t * st.ey;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(dx, dy, 1.15, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4 Upper cascading parabolic water arcs (crown -> mid bowl)
    const upperStreams = [
      { sx: -1.4, sy: -30.2, cx: -6.4, cy: -34.2, ex: -7.6, ey: -17.6 },
      { sx: 1.4, sy: -30.2, cx: 6.4, cy: -34.2, ex: 7.6, ey: -17.6 },
      { sx: -0.7, sy: -30.2, cx: -3.2, cy: -32.6, ex: -3.6, ey: -16.6 },
      { sx: 0.7, sy: -30.2, cx: 3.2, cy: -32.6, ex: 3.6, ey: -16.6 }
    ];
    upperStreams.forEach((st, idx) => {
      const shimmer = 0.68 + 0.28 * Math.cos(fountainAnimPhase * 2.4 + idx);
      ctx.strokeStyle = `rgba(205, 244, 255, ${shimmer})`;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(st.sx, st.sy);
      ctx.quadraticCurveTo(st.cx, st.cy, st.ex, st.ey);
      ctx.stroke();
    });

    // Bubbling top water plume + mist sparkles
    const jetHeight = 3.2 + Math.sin(fountainAnimPhase * 2.4) * 2.2;
    ctx.fillStyle = 'rgba(230, 250, 255, 0.92)';
    ctx.beginPath();
    ctx.ellipse(0, -32.2 - jetHeight * 0.5, 2.4, 2.2 + jetHeight * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    const sparkOffsets = [
      { x: -3.2, y: -33.5 - ((fountainAnimPhase * 2.2) % 3) },
      { x: 3.0, y: -32.8 - (((fountainAnimPhase * 2.2) + 1.5) % 3) },
      { x: 0.4, y: -35.8 - jetHeight * 0.6 }
    ];
    sparkOffsets.forEach(sp => {
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 1.05, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  function drawHydrantBody(isGold: boolean): void {
    // Bolted cast-iron / gold octagonal anchor flange plate
    ctx.fillStyle = isGold ? '#9e6f0c' : '#741616';
    ctx.strokeStyle = isGold ? '#6d4a05' : '#4a0d0d';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(0, 2.2, 10.6, 4.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isGold ? '#d49d1b' : '#b22222';
    ctx.beginPath();
    ctx.ellipse(0, 0.9, 9.4, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Base anchor bolts
    ctx.fillStyle = isGold ? '#fff3b0' : '#dcdde1';
    [-7.2, -3.6, 3.6, 7.2].forEach(bx => {
      ctx.beginPath();
      ctx.arc(bx, 1.3 + (Math.abs(bx) < 5 ? 1.5 : 0.2), 0.95, 0, Math.PI * 2);
      ctx.fill();
    });

    // Tapered fluted cylinder barrel
    const bodyGrad = ctx.createLinearGradient(-7.2, 0, 7.2, 0);
    if (isGold) {
      bodyGrad.addColorStop(0, '#855806');
      bodyGrad.addColorStop(0.26, '#fff4b8');
      bodyGrad.addColorStop(0.54, '#ffd32a');
      bodyGrad.addColorStop(0.82, '#cc9414');
      bodyGrad.addColorStop(1, '#7a5005');
    } else {
      bodyGrad.addColorStop(0, '#871616');
      bodyGrad.addColorStop(0.28, '#ff6b6b');
      bodyGrad.addColorStop(0.56, '#e02f2f');
      bodyGrad.addColorStop(0.84, '#b81d1d');
      bodyGrad.addColorStop(1, '#701010');
    }
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = isGold ? '#734d06' : '#5e1111';
    ctx.lineWidth = 0.95;
    ctx.beginPath();
    ctx.moveTo(-7.2, 0.6);
    ctx.lineTo(-6.2, -21.0);
    ctx.lineTo(6.2, -21.0);
    ctx.lineTo(7.2, 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle vertical cast-iron fluting grooves
    ctx.strokeStyle = isGold ? 'rgba(115, 77, 6, 0.24)' : 'rgba(72, 10, 10, 0.25)';
    ctx.lineWidth = 0.75;
    [-3.2, 0, 3.2].forEach(fx => {
      ctx.beginPath();
      ctx.moveTo(fx, -19.5);
      ctx.lineTo(fx * 1.1, -2.5);
      ctx.stroke();
    });

    // Lower collar ring + upper shoulder flange
    const ringFill = isGold ? '#e8b62c' : '#c92323';
    ctx.fillStyle = ringFill;
    ctx.strokeStyle = isGold ? '#734d06' : '#5e1111';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, -4.4, 7.6, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, -20.8, 7.9, 2.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Twin 3D angled side hose nozzles + hanging chains
    const capMain = isGold ? '#ffe97f' : '#e6c25b';
    const capEdge = isGold ? '#8d620b' : '#96761d';
    [-1, 1].forEach(side => {
      // Short hanging chain loop from neck to side nozzle
      ctx.strokeStyle = isGold ? '#cfa020' : '#bdc3c7';
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.moveTo(side * 5.2, -19.5);
      ctx.quadraticCurveTo(side * 9.8, -11.5, side * 8.2, -14.2);
      ctx.stroke();

      // Nozzle collar sleeve
      ctx.fillStyle = isGold ? '#bd8a12' : '#ad1c1c';
      ctx.fillRect(side < 0 ? -9.0 : 5.6, -16.8, 3.4, 5.4);

      // Brass/Gold threaded nozzle cap
      ctx.fillStyle = capMain;
      ctx.strokeStyle = capEdge;
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.ellipse(side * 9.0, -14.1, 2.4, 3.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Nozzle lug nub
      ctx.fillStyle = '#fff5c2';
      ctx.beginPath();
      ctx.arc(side * 9.3, -14.1, 0.9, 0, Math.PI * 2);
      ctx.fill();
    });

    // Central prominent steamer port cap with pentagonal nut
    ctx.fillStyle = isGold ? '#bd8a12' : '#9c1919';
    ctx.beginPath();
    ctx.arc(0, -12.6, 4.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = capMain;
    ctx.strokeStyle = capEdge;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(0, -12.6, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isGold ? '#fff7cc' : '#f7e097';
    ctx.beginPath();
    ctx.roundRect(-1.2, -13.8, 2.4, 2.4, 0.5);
    ctx.fill();

    // Scalloped ribbed domed bonnet cap
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = isGold ? '#734d06' : '#5e1111';
    ctx.lineWidth = 0.95;
    ctx.beginPath();
    ctx.arc(0, -21.2, 6.8, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bonnet vertical ribs
    ctx.strokeStyle = isGold ? 'rgba(255, 250, 210, 0.45)' : 'rgba(255, 210, 210, 0.32)';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.arc(0, -21.2, 5.2, Math.PI * 1.15, Math.PI * 1.45);
    ctx.stroke();

    // Bonnet bolts along rim
    ctx.fillStyle = capMain;
    [-5.2, -2.0, 2.0, 5.2].forEach(bx => {
      ctx.beginPath();
      ctx.arc(bx, -20.5, 0.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Top pentagonal operating valve nut
    ctx.fillStyle = capMain;
    ctx.strokeStyle = capEdge;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.roundRect(-2.5, -30.4, 5.0, 3.1, 0.8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff9d6';
    ctx.fillRect(-1.5, -29.8, 1.4, 1.8);

    // Glossy specular sheen band on barrel
    ctx.fillStyle = isGold ? 'rgba(255, 255, 235, 0.36)' : 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.roundRect(-3.8, -19.0, 1.7, 13.5, 0.8);
    ctx.fill();
  }

  function drawFireHydrant(gx: number, gy: number): void {
    const pos = getCenteredTilePos(gx, gy);
    const scale = getScale();
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    // Grounded shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(0, 4.0, 13.0, 6.2, 0, 0, Math.PI * 2);
    ctx.fill();

    drawHydrantBody(false);
    ctx.restore();
  }

  function drawGoldenFireHydrant(gx: number, gy: number): void {
    const pos = getCenteredTilePos(gx, gy);
    const scale = getScale();
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    // Prestige warm golden aura
    const aura = ctx.createRadialGradient(0, -12, 3, 0, -12, 30);
    aura.addColorStop(0, 'rgba(255, 228, 118, 0.38)');
    aura.addColorStop(0.6, 'rgba(255, 210, 70, 0.14)');
    aura.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -12, 30, 0, Math.PI * 2);
    ctx.fill();

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.beginPath();
    ctx.ellipse(0, 5.2, 16.5, 7.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dual-stepped ivory marble monument plinth with gold trim
    ctx.fillStyle = '#aebbc7';
    ctx.strokeStyle = '#7b8a97';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(0, 3.2, 15.0, 6.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#eef3f7';
    ctx.beginPath();
    ctx.ellipse(0, 1.4, 14.2, 6.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#e2b128';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.ellipse(0, 0.4, 12.6, 5.4, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, -0.8, 11.8, 5.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // Elevated sculpted 24k gold hydrant on plinth
    ctx.save();
    ctx.translate(0, -2.8);
    drawHydrantBody(true);
    ctx.restore();

    // Gentle animated 4-point star sparkles
    const sparkles = [
      { x: -11.0, y: -27.5, phase: 0 },
      { x: 11.4, y: -20.0, phase: 2.1 },
      { x: 2.2, y: -35.8, phase: 4.2 }
    ];
    sparkles.forEach(sp => {
      const pulse = Math.max(0, Math.sin(fountainAnimPhase * 1.6 + sp.phase));
      if (pulse < 0.12) return;
      const r = 3.8 * pulse;
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.fillStyle = `rgba(255, 252, 215, ${0.42 + pulse * 0.58})`;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    ctx.restore();
  }

  function drawDogSlide(gx: number, gy: number): void {
    const pStart = getCenteredTilePos(gx, gy);
    const pEnd = getCenteredTilePos(gx + 1, gy);
    const pSide = getCenteredTilePos(gx, gy + 1);
    const scale = getScale();

    const dirX = pEnd.x - pStart.x;
    const dirY = pEnd.y - pStart.y;
    const sideX = pSide.x - pStart.x;
    const sideY = pSide.y - pStart.y;
    const deckH = 38 * scale;
    const chuteHalfW = 7.8 * scale;

    // Perpendicular lateral screen vector for 3D width across any rotation
    const len = Math.max(1, Math.hypot(dirX, dirY));
    const ux = dirX / len;
    const uy = dirY / len;
    // Use gently foreshortened isometric lateral offset
    const latX = -uy * chuteHalfW * 0.68;
    const latY = ux * chuteHalfW * 0.42;

    const towerCenter = { x: pStart.x + dirX * 0.14, y: pStart.y + dirY * 0.14 };
    const ladderFoot = { x: pStart.x - dirX * 0.24, y: pStart.y - dirY * 0.24 };
    const deckTop = { x: towerCenter.x, y: towerCenter.y - deckH };
    const chuteCtrl = { x: pStart.x + dirX * 0.62, y: pStart.y + dirY * 0.62 - deckH * 0.24 };
    const chuteFoot = { x: pEnd.x + dirX * 0.16, y: pEnd.y + dirY * 0.16 - 2 * scale };

    ctx.save();

    // Single unified rounded isometric ground shadow spanning ladder, tower, and chute
    const shA = { x: ladderFoot.x - dirX * 0.02 + 2.5 * scale, y: ladderFoot.y - dirY * 0.02 + 3.5 * scale };
    const shB = { x: chuteFoot.x + dirX * 0.02 + 2.5 * scale, y: chuteFoot.y + dirY * 0.02 + 5 * scale };
    const swX = sideX * 0.23;
    const swY = sideY * 0.23;
    const capX = dirX * 0.11;
    const capY = dirY * 0.11;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.moveTo(shA.x + swX, shA.y + swY);
    ctx.lineTo(shB.x + swX, shB.y + swY);
    ctx.quadraticCurveTo(shB.x + capX + swX * 0.55, shB.y + capY + swY * 0.55, shB.x + capX, shB.y + capY);
    ctx.quadraticCurveTo(shB.x + capX - swX * 0.55, shB.y + capY - swY * 0.55, shB.x - swX, shB.y - swY);
    ctx.lineTo(shA.x - swX, shA.y - swY);
    ctx.quadraticCurveTo(shA.x - capX - swX * 0.55, shA.y - capY - swY * 0.55, shA.x - capX, shA.y - capY);
    ctx.quadraticCurveTo(shA.x - capX + swX * 0.55, shA.y - capY + swY * 0.55, shA.x + swX, shA.y + swY);
    ctx.closePath();
    ctx.fill();

    // Royal-blue tubular A-frame support legs & cross-braces
    const drawBluePipe = (x1: number, y1: number, x2: number, y2: number, width: number, color = '#2980b9'): void => {
      ctx.strokeStyle = '#1b4f72';
      ctx.lineWidth = width + 1.6 * scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    // Back & front vertical tower posts
    drawBluePipe(towerCenter.x - latX, towerCenter.y - latY + 2 * scale, deckTop.x - latX, deckTop.y - latY, 3.2 * scale, '#2471a3');
    drawBluePipe(towerCenter.x + latX, towerCenter.y + latY + 2 * scale, deckTop.x + latX, deckTop.y + latY, 3.2 * scale, '#3498db');

    // Horizontal stabilizer bar between tower legs
    drawBluePipe(
      towerCenter.x - latX,
      towerCenter.y - latY - deckH * 0.42,
      towerCenter.x + latX,
      towerCenter.y + latY - deckH * 0.42,
      2.4 * scale,
      '#2e86c1'
    );

    // Rear angled climbing ladder side rails
    drawBluePipe(ladderFoot.x - latX, ladderFoot.y - latY + 2 * scale, deckTop.x - latX, deckTop.y - latY, 2.8 * scale, '#2471a3');
    drawBluePipe(ladderFoot.x + latX, ladderFoot.y + latY + 2 * scale, deckTop.x + latX, deckTop.y + latY, 2.8 * scale, '#3498db');

    // 4 crisp yellow-accented climbing rungs
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      const rx = ladderFoot.x + (deckTop.x - ladderFoot.x) * t;
      const ry = ladderFoot.y + (deckTop.y - ladderFoot.y) * t;
      drawBluePipe(rx - latX, ry - latY, rx + latX, ry + latY, 2.2 * scale, '#5dade2');
    }

    // Back blue safety handrail arch on top platform
    drawBluePipe(
      deckTop.x - latX,
      deckTop.y - latY,
      deckTop.x - latX,
      deckTop.y - latY - 10 * scale,
      2.4 * scale,
      '#2471a3'
    );
    drawBluePipe(
      deckTop.x - latX,
      deckTop.y - latY - 10 * scale,
      deckTop.x - latX + dirX * 0.14,
      deckTop.y - latY + dirY * 0.14 - 7 * scale,
      2.4 * scale,
      '#2471a3'
    );

    // Top landing deck platform
    const deckFront = { x: deckTop.x + dirX * 0.14, y: deckTop.y + dirY * 0.14 };
    ctx.fillStyle = '#2980b9';
    ctx.strokeStyle = '#1b4f72';
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(deckTop.x - latX, deckTop.y - latY);
    ctx.lineTo(deckTop.x + latX, deckTop.y + latY);
    ctx.lineTo(deckFront.x + latX, deckFront.y + latY + 2 * scale);
    ctx.lineTo(deckFront.x - latX, deckFront.y - latY + 2 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sweeping glossy sunny-yellow chute underside rim (gives real 3D thickness)
    const rimDrop = 4.6 * scale;
    ctx.fillStyle = '#c88b08';
    ctx.beginPath();
    ctx.moveTo(deckFront.x - latX, deckFront.y - latY + rimDrop);
    ctx.quadraticCurveTo(chuteCtrl.x - latX, chuteCtrl.y - latY + rimDrop, chuteFoot.x - latX, chuteFoot.y - latY + rimDrop * 0.65);
    ctx.lineTo(chuteFoot.x + latX, chuteFoot.y + latY + rimDrop * 0.65);
    ctx.quadraticCurveTo(chuteCtrl.x + latX, chuteCtrl.y + latY + rimDrop, deckFront.x + latX, deckFront.y + latY + rimDrop);
    ctx.closePath();
    ctx.fill();

    // Main glossy sunny-yellow chute bed
    const chuteGrad = ctx.createLinearGradient(deckFront.x, deckFront.y, chuteFoot.x, chuteFoot.y);
    chuteGrad.addColorStop(0, '#ffe169');
    chuteGrad.addColorStop(0.5, '#f6c90e');
    chuteGrad.addColorStop(1, '#f3b700');
    ctx.fillStyle = chuteGrad;
    ctx.strokeStyle = '#b97e04';
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(deckFront.x - latX, deckFront.y - latY);
    ctx.quadraticCurveTo(chuteCtrl.x - latX, chuteCtrl.y - latY, chuteFoot.x - latX, chuteFoot.y - latY);
    ctx.lineTo(chuteFoot.x + latX, chuteFoot.y + latY);
    ctx.quadraticCurveTo(chuteCtrl.x + latX, chuteCtrl.y + latY, deckFront.x + latX, deckFront.y + latY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Specular sunny shine stripe down center of chute
    ctx.strokeStyle = 'rgba(255, 253, 224, 0.62)';
    ctx.lineWidth = 3.2 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(deckFront.x, deckFront.y + 1 * scale);
    ctx.quadraticCurveTo(chuteCtrl.x, chuteCtrl.y, chuteFoot.x - dirX * 0.06, chuteFoot.y - dirY * 0.06);
    ctx.stroke();

    // Raised bright yellow side guardrails along both chute edges
    [-1, 1].forEach(side => {
      const sx = side * latX;
      const sy = side * latY;
      ctx.strokeStyle = '#b97e04';
      ctx.lineWidth = 3.4 * scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(deckFront.x + sx, deckFront.y + sy - 2.6 * scale);
      ctx.quadraticCurveTo(chuteCtrl.x + sx, chuteCtrl.y + sy - 2.6 * scale, chuteFoot.x + sx, chuteFoot.y + sy - 1.2 * scale);
      ctx.stroke();

      ctx.strokeStyle = side > 0 ? '#fff099' : '#f7ca18';
      ctx.lineWidth = 2.1 * scale;
      ctx.beginPath();
      ctx.moveTo(deckFront.x + sx, deckFront.y + sy - 2.8 * scale);
      ctx.quadraticCurveTo(chuteCtrl.x + sx, chuteCtrl.y + sy - 2.8 * scale, chuteFoot.x + sx, chuteFoot.y + sy - 1.4 * scale);
      ctx.stroke();
    });

    // Front royal-blue safety handrail on top platform
    drawBluePipe(
      deckTop.x + latX,
      deckTop.y + latY,
      deckTop.x + latX,
      deckTop.y + latY - 10 * scale,
      2.6 * scale,
      '#3498db'
    );
    drawBluePipe(
      deckTop.x + latX,
      deckTop.y + latY - 10 * scale,
      deckFront.x + latX,
      deckFront.y + latY - 7 * scale,
      2.6 * scale,
      '#5dade2'
    );

    // Chute landing ground footpad
    ctx.fillStyle = '#2980b9';
    ctx.beginPath();
    ctx.ellipse(chuteFoot.x, chuteFoot.y + 3 * scale, 5.5 * scale, 2.4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawLampPost(gx: number, gy: number): void {
    const pos = getCenteredTilePos(gx, gy);
    const scale = getScale();
    const glowStrength = Math.min(1, 0.24 + weatherWeights.twilight * 0.95 + weatherWeights.rain * 0.52);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    // Warm golden ground pool (subtle in sunlight, rich in twilight & rain)
    const poolGrad = ctx.createRadialGradient(0, 2, 2, 0, 2, 34);
    poolGrad.addColorStop(0, `rgba(255, 224, 130, ${0.42 * glowStrength})`);
    poolGrad.addColorStop(0.55, `rgba(255, 198, 92, ${0.20 * glowStrength})`);
    poolGrad.addColorStop(1, 'rgba(255, 198, 92, 0)');
    ctx.fillStyle = poolGrad;
    ctx.beginPath();
    ctx.ellipse(0, 2, 34, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(0, 3.5, 9.5, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flared octagonal cast-iron pedestal base
    ctx.fillStyle = '#2c343c';
    ctx.strokeStyle = '#181d22';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(0, 1.6, 7.2, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#39434d';
    ctx.beginPath();
    ctx.moveTo(-4.4, 1.0);
    ctx.lineTo(-2.3, -9.0);
    ctx.lineTo(2.3, -9.0);
    ctx.lineTo(4.4, 1.0);
    ctx.closePath();
    ctx.fill();

    // Slender iron post + decorative mid collar
    ctx.fillStyle = '#2d353e';
    ctx.fillRect(-1.8, -32.0, 3.6, 24.0);
    ctx.fillStyle = '#4e5b68';
    ctx.fillRect(-0.8, -32.0, 1.0, 24.0);

    ctx.fillStyle = '#3e4a56';
    ctx.beginPath();
    ctx.ellipse(0, -18.0, 3.2, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ornamental scroll crossbar beneath lantern
    ctx.strokeStyle = '#2c343c';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6.2, -31.5);
    ctx.lineTo(6.2, -31.5);
    ctx.stroke();

    // Lantern ambient glow bloom
    const lanternHalo = ctx.createRadialGradient(0, -37.2, 2, 0, -37.2, 21);
    lanternHalo.addColorStop(0, `rgba(255, 243, 176, ${0.72 * glowStrength})`);
    lanternHalo.addColorStop(0.5, `rgba(255, 204, 102, ${0.30 * glowStrength})`);
    lanternHalo.addColorStop(1, 'rgba(255, 204, 102, 0)');
    ctx.fillStyle = lanternHalo;
    ctx.beginPath();
    ctx.arc(0, -37.2, 21, 0, Math.PI * 2);
    ctx.fill();

    // Lantern glass housing (trapezoid)
    const glassGrad = ctx.createRadialGradient(0, -37.5, 1, 0, -37.5, 7);
    glassGrad.addColorStop(0, '#fffef0');
    glassGrad.addColorStop(0.55, '#ffe588');
    glassGrad.addColorStop(1, '#f3b647');
    ctx.fillStyle = glassGrad;
    ctx.strokeStyle = '#252c33';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-3.6, -32.2);
    ctx.lineTo(-5.4, -41.5);
    ctx.lineTo(5.4, -41.5);
    ctx.lineTo(3.6, -32.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center vertical lantern mullion
    ctx.strokeStyle = 'rgba(37, 44, 51, 0.72)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, -32.2);
    ctx.lineTo(0, -41.5);
    ctx.stroke();

    // Peaked Victorian lantern cap + finial spire
    ctx.fillStyle = '#242b32';
    ctx.beginPath();
    ctx.moveTo(-6.6, -41.4);
    ctx.lineTo(0, -46.8);
    ctx.lineTo(6.6, -41.4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -47.6, 1.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawMushroomCluster(m: { gx: number; gy: number; color: string; capDark: string; glow: string }): void {
    const pos = getCenteredTilePos(m.gx, m.gy);
    const scale = getScale();
    const glowBoost = 0.72 + weatherWeights.twilight * 0.6 + weatherWeights.rain * 0.35 + Math.sin(fountainAnimPhase * 0.8 + m.gx) * 0.12;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    // Bioluminescent fairy-ring halo
    const grad = ctx.createRadialGradient(0, -6, 2, 0, -6, 26);
    grad.addColorStop(0, m.glow);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.save();
    ctx.globalAlpha = Math.min(1, glowBoost);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, -6, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Soft mossy bed & shadow under cluster
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 3.2, 14.5, 6.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#237a3b';
    ctx.beginPath();
    ctx.ellipse(0, 1.8, 12.2, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    const cluster = [
      { x: -7.5, y: 1.5, s: 0.74, lean: -0.14 },
      { x: 7.4, y: 2.2, s: 0.68, lean: 0.16 },
      { x: 0, y: 0.5, s: 1.04, lean: -0.04 }
    ];

    cluster.forEach(o => {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.scale(o.s, o.s);
      ctx.rotate(o.lean);

      // Curved tapered creamy-ivory stem
      const stemGrad = ctx.createLinearGradient(-3, 0, 3, 0);
      stemGrad.addColorStop(0, '#dcd6c8');
      stemGrad.addColorStop(0.45, '#fffdf7');
      stemGrad.addColorStop(1, '#c8c0b0');
      ctx.fillStyle = stemGrad;
      ctx.beginPath();
      ctx.moveTo(-3.4, 1.0);
      ctx.quadraticCurveTo(-2.2, -5.5, -2.1, -11.5);
      ctx.lineTo(2.1, -11.5);
      ctx.quadraticCurveTo(2.4, -5.5, 3.4, 1.0);
      ctx.closePath();
      ctx.fill();

      // Subtle gill underside ellipse
      ctx.fillStyle = '#ece6d8';
      ctx.beginPath();
      ctx.ellipse(0, -10.8, 7.8, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Richly shaded dome mushroom cap
      const capGrad = ctx.createRadialGradient(-2.6, -15.6, 1.2, 0, -12.5, 10.5);
      capGrad.addColorStop(0, '#ffffff');
      capGrad.addColorStop(0.22, m.color);
      capGrad.addColorStop(1, m.capDark);
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.ellipse(0, -11.2, 8.8, 7.2, 0, Math.PI, 0);
      ctx.quadraticCurveTo(4.4, -9.2, 0, -9.4);
      ctx.quadraticCurveTo(-4.4, -9.2, -8.8, -11.2);
      ctx.closePath();
      ctx.fill();

      // Soft cream storybook spots on cap
      ctx.fillStyle = 'rgba(255, 255, 245, 0.82)';
      [
        { sx: -3.8, sy: -14.2, r: 1.45 },
        { sx: 2.2, sy: -15.6, r: 1.65 },
        { sx: 5.0, sy: -12.8, r: 1.1 },
        { sx: -0.8, sy: -12.4, r: 1.05 }
      ].forEach(sp => {
        ctx.beginPath();
        ctx.arc(sp.sx, sp.sy, sp.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    });

    // Gently drifting glowing spore motes
    const sporePhase = fountainAnimPhase * 0.6 + m.gx * 1.7 + m.gy;
    for (let i = 0; i < 2; i++) {
      const spT = (sporePhase + i * 0.5) % 1;
      const sx = Math.sin(sporePhase * 2 + i * 3) * 8;
      const sy = -14 - spT * 12;
      ctx.fillStyle = `rgba(255, 255, 235, ${(1 - spT) * 0.65 * Math.min(1, glowBoost)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.15, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawBoneSprite(x: number, y: number, isMagic: boolean): void {
    const scale = Math.max(0.85, getScale());
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    if (isMagic) {
      ctx.shadowColor = '#ffeaa7';
      ctx.shadowBlur = 12;
    }

    ctx.fillStyle = isMagic ? '#ffeaa7' : '#f5f6fa';
    ctx.strokeStyle = isMagic ? '#f39c12' : '#b2bec3';
    ctx.lineWidth = 1.5;

    ctx.fillRect(-7, -2.5, 14, 5);
    const knobs = [
      [-7, -3], [-7, 3],
      [7, -3], [7, 3]
    ];
    knobs.forEach(([kx, ky]) => {
      ctx.beginPath();
      ctx.arc(kx, ky, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  function drawTennisBall(): void {
    if (!state.hasTennisBall) return;
    const pos = gridToScreen(tennisBall.gx, tennisBall.gy);
    const scale = getScale();
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const bounceOffset = Math.abs(Math.sin(tennisBall.bouncePhase * 6)) * 8;
    ctx.translate(0, -bounceOffset);

    ctx.fillStyle = '#ccff00';
    ctx.strokeStyle = '#739900';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-2, -6, 4, 0.2, Math.PI * 0.8);
    ctx.stroke();

    ctx.restore();
  }

  function drawFrisbee(): void {
    if (!state.hasFrisbee) return;
    const pos = gridToScreen(frisbee.gx, frisbee.gy);
    const scale = getScale();
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 9, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0984e3';
    ctx.strokeStyle = '#00cec9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -2, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#74b9ff';
    ctx.beginPath();
    ctx.ellipse(0, -3, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawDuck(): void {
    if (!state.hasDuck) return;
    const pos = gridToScreen(duck.gx, duck.gy);
    const scale = getScale();
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 9, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffeaa7';
    ctx.strokeStyle = '#fdcb6e';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.ellipse(0, -3, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(5, -10, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e17055';
    ctx.beginPath();
    ctx.ellipse(9, -9, 3.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.arc(6, -11, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function recruitDog(breed: string): void {
    initAudio();
    if (getTotalDogs() >= MAX_DOGS) return;
    const normBreed = normalizeBreedKey(breed);
    const cfg = BREED_CONFIG[normBreed];
    const cost = state.costs[normBreed];
    if (state.bones >= cost) {
      spendRegularBones(cost);
      state.costs[normBreed] = computeNextCappedCost(cost, cfg.costMult, cfg.priceCap);

      const isShiny = Math.random() < SPAWN_SHINY_ODDS;
      const chosenColor = isShiny ? SHINY_PALETTES[Math.floor(Math.random() * SHINY_PALETTES.length)] : null;

      const entry = createRosterEntry(normBreed, isShiny, chosenColor);
      state.roster.push(entry);
      syncBreedCountsFromRoster();
      dogs.push(new Dog(1.5, 1.5, entry.id, normBreed, isShiny, chosenColor));

      if (isShiny) {
        sfx.shiny();
        triggerHaptic(24);
      } else {
        sfx.upgrade();
        triggerHaptic(12);
      }

      updateUI();
      renderRosterTab();
      saveGame();
    }
  }

  document.getElementById('btnSummonAussie')?.addEventListener('click', () => recruitDog('aussie'));
  document.getElementById('btnSummonCorgi')?.addEventListener('click', () => recruitDog('corgi'));
  document.getElementById('btnSummonBeagle')?.addEventListener('click', () => recruitDog('beagle'));
  document.getElementById('btnSummonCollie')?.addEventListener('click', () => recruitDog('collie'));
  document.getElementById('btnSummonDachshund')?.addEventListener('click', () => recruitDog('dachshund'));
  document.getElementById('btnSummonHusky')?.addEventListener('click', () => recruitDog('husky'));
  document.getElementById('btnSummonDalmatian')?.addEventListener('click', () => recruitDog('dalmatian'));
  document.getElementById('btnSummonGolden')?.addEventListener('click', () => recruitDog('golden'));
  document.getElementById('btnSummonSamoyed')?.addEventListener('click', () => recruitDog('samoyed'));
  document.getElementById('btnSummonShepherd')?.addEventListener('click', () => recruitDog('shepherd'));
  document.getElementById('btnSummonBorzoi')?.addEventListener('click', () => recruitDog('borzoi'));
  document.getElementById('btnSummonShiba')?.addEventListener('click', () => recruitDog('shiba'));
  document.getElementById('btnSummonLabrador')?.addEventListener('click', () => recruitDog('labrador'));
  document.getElementById('btnSummonBernese')?.addEventListener('click', () => recruitDog('bernese'));

  function buyTimedTreat(treatKey: string, costKey: string): void {
    const cfg = TREAT_STACK_MAP[treatKey];
    const econ = TREAT_CONFIG[costKey];
    if (!cfg || !econ) return;
    if (isTreatAtMaxDuration(treatKey)) return;

    const cost = econ.baseCost;
    state.costs[costKey] = cost;
    if (state.bones >= cost) {
      spendRegularBones(cost);
      const maxDur = getTreatMaxDuration(treatKey);
      const nextTimer = Math.min(maxDur, (Number(state[cfg.timerKey]) || 0) + cfg.duration);
      state[cfg.timerKey] = nextTimer;
      state[cfg.stackKey] = Math.min(TIMED_TREAT_MAX_STACKS, Math.max(1, Math.ceil(nextTimer / cfg.duration)));
      if (treatKey === 'feast') {
        state.feastAnimTimer = 1.5;
      }
      addPackHappiness(8);
      sfx.treat();
      triggerHaptic(12);
      updateUI();
      saveGame();
    }
  }

  document.getElementById('btnToyBones')?.addEventListener('click', () => {
    initAudio();
    if (state.digPower >= MAX_DIG_POWER) return;
    const econ = TOY_CONFIG.toyBones;
    if (state.bones >= state.costs.toyBones) {
      spendRegularBones(state.costs.toyBones);
      state.digPower = Math.min(MAX_DIG_POWER, Math.round(state.digPower + TENNIS_BALL_FLAT_GAIN));
      state.costs.toyBones = computeNextCappedCost(state.costs.toyBones, econ.costMult, econ.priceCap);
      state.hasTennisBall = true;
      addPackHappiness(4);
      sfx.upgrade();
      triggerHaptic(12);
      updateUI();
      saveGame();
    }
  });

  document.getElementById('btnToyIdle')?.addEventListener('click', () => {
    initAudio();
    const econ = TOY_CONFIG.toyIdle;
    if (state.bones >= state.costs.toyIdle && state.idleMultiplier < MAX_IDLE_MULTIPLIER) {
      spendRegularBones(state.costs.toyIdle);
      state.idleMultiplier = Math.min(MAX_IDLE_MULTIPLIER, Math.round((state.idleMultiplier + DUCK_IDLE_STEP) * 1000) / 1000);
      state.costs.toyIdle = computeNextCappedCost(state.costs.toyIdle, econ.costMult, econ.priceCap);
      state.hasDuck = true;
      addPackHappiness(4);
      sfx.upgrade();
      triggerHaptic(12);
      updateUI();
      saveGame();
    }
  });

  document.getElementById('btnToySpeed')?.addEventListener('click', () => {
    initAudio();
    if (state.speedMultiplier >= MAX_SPEED_MULTIPLIER) return;
    const econ = TOY_CONFIG.toySpeed;
    if (state.bones >= state.costs.toySpeed) {
      spendRegularBones(state.costs.toySpeed);
      state.speedMultiplier = Math.min(MAX_SPEED_MULTIPLIER, Math.round(state.speedMultiplier * FRISBEE_SPEED_STEP * 1000) / 1000);
      state.costs.toySpeed = computeNextCappedCost(state.costs.toySpeed, econ.costMult, econ.priceCap);
      state.hasFrisbee = true;
      addPackHappiness(4);
      sfx.upgrade();
      triggerHaptic(12);
      updateUI();
      saveGame();
    }
  });

  document.getElementById('btnTreatXp')?.addEventListener('click', () => {
    initAudio();
    buyTimedTreat('xp', 'treatXp');
  });

  document.getElementById('btnTreatKong')?.addEventListener('click', () => {
    initAudio();
    buyTimedTreat('kong', 'treatKong');
  });

  document.getElementById('btnTreatCup')?.addEventListener('click', () => {
    initAudio();
    buyTimedTreat('cup', 'treatCup');
  });

  document.getElementById('btnTreatFeast')?.addEventListener('click', () => {
    initAudio();
    buyTimedTreat('feast', 'treatFeast');
  });

  document.getElementById('btnTreatBacon')?.addEventListener('click', () => {
    initAudio();
    buyTimedTreat('bacon', 'treatBacon');
  });

  function formatStackedTreasureSummary(perk: PerkItem, count: number): string {
    if (count <= 1) return perk.desc;
    const parts: string[] = [];
    if (perk.mult) {
      const totalMult = Math.pow(perk.mult, count);
      parts.push(`${totalMult.toFixed(2).replace(/\.?0+$/, '')}x dig bones`);
    }
    if (perk.workMult) {
      const totalWork = Math.pow(perk.workMult, count);
      parts.push(`${totalWork.toFixed(2).replace(/\.?0+$/, '')}x scaling`);
    }
    if (perk.magicAdd) {
      const totalMagicPct = Math.round(perk.magicAdd * count * 1000) / 10;
      parts.push(`+${totalMagicPct}% ✨ Magic Bone chance`);
    }
    return parts.length > 0 ? `Stacked (${count}x): ${parts.join(' & ')}` : perk.desc;
  }

  function formatTimedTreatCostLabel(cost: number, timer: number, treatKey: string, configKey: string): string {
    const flatCost = TREAT_CONFIG[configKey]?.baseCost || cost || 350;
    const secs = Math.ceil(Math.max(0, timer));
    if (isTreatAtMaxDuration(treatKey)) {
      return secs > 0 ? `MAX | ${secs}s` : 'MAX';
    }
    const baseStr = `${flatCost.toLocaleString()} 🦴`;
    if (secs > 0) {
      return `${baseStr} | ${secs}s`;
    }
    return baseStr;
  }

  function refreshTreatButtonStates(): void {
    const btnTreatKong = document.getElementById('btnTreatKong') as HTMLButtonElement | null;
    if (btnTreatKong) btnTreatKong.disabled = state.bones < TREAT_CONFIG.treatKong.baseCost || isTreatAtMaxDuration('kong');
    const btnTreatBacon = document.getElementById('btnTreatBacon') as HTMLButtonElement | null;
    if (btnTreatBacon) btnTreatBacon.disabled = state.bones < TREAT_CONFIG.treatBacon.baseCost || isTreatAtMaxDuration('bacon');
    const btnTreatFeast = document.getElementById('btnTreatFeast') as HTMLButtonElement | null;
    if (btnTreatFeast) btnTreatFeast.disabled = state.bones < TREAT_CONFIG.treatFeast.baseCost || isTreatAtMaxDuration('feast');
    const btnTreatCup = document.getElementById('btnTreatCup') as HTMLButtonElement | null;
    if (btnTreatCup) btnTreatCup.disabled = state.bones < TREAT_CONFIG.treatCup.baseCost || isTreatAtMaxDuration('cup');
    const btnTreatXpEl = document.getElementById('btnTreatXp') as HTMLButtonElement | null;
    if (btnTreatXpEl) btnTreatXpEl.disabled = state.bones < TREAT_CONFIG.treatXp.baseCost || isTreatAtMaxDuration('xp');
  }

  function refreshTreatRoiHints(): void {
    const setRoiLine = (elId: string, text: string, tone: 'positive' | 'caution' | 'utility') => {
      const el = document.getElementById(elId);
      if (!el) return;
      el.textContent = text;
      el.className = `treat-roi ${tone}`;
    };

    const cupBase = getEstimatedPackRates({ cupActive: false }).bonesPerMin;
    const cupBuffed = getEstimatedPackRates({ cupActive: true }).bonesPerMin;
    const cupNet = Math.round((cupBuffed - cupBase) * (TREAT_CONFIG.treatCup.duration / 60) - TREAT_CONFIG.treatCup.baseCost);
    if (cupNet >= 0) {
      setRoiLine('roiTreatCup', `Est. +${cupNet.toLocaleString()} 🦴 profit per 90s`, 'positive');
    } else {
      setRoiLine('roiTreatCup', `Needs 667+ 🦴/min to profit (now ${Math.round(cupBase).toLocaleString()}/m)`, 'caution');
    }

    const feastBase = getEstimatedPackRates({ feastActive: false }).bonesPerMin;
    const feastBuffed = getEstimatedPackRates({ feastActive: true }).bonesPerMin;
    const feastNet = Math.round((feastBuffed - feastBase) * (TREAT_CONFIG.treatFeast.duration / 60) - TREAT_CONFIG.treatFeast.baseCost);
    if (feastNet >= 0) {
      setRoiLine('roiTreatFeast', `Est. +${feastNet.toLocaleString()} 🦴 profit per 90s`, 'positive');
    } else {
      setRoiLine('roiTreatFeast', `Needs 2,000+ 🦴/min to profit (now ${Math.round(feastBase).toLocaleString()}/m)`, 'caution');
    }

    const baconBase = getEstimatedPackRates({ baconActive: false }).bonesPerMin;
    const baconBuffed = getEstimatedPackRates({ baconActive: true }).bonesPerMin;
    const baconNet = Math.round((baconBuffed - baconBase) * (TREAT_CONFIG.treatBacon.duration / 60) - TREAT_CONFIG.treatBacon.baseCost);
    if (baconNet >= 0) {
      setRoiLine('roiTreatBacon', `Est. +${baconNet.toLocaleString()} 🦴 profit per 60s | +35% pace & drops`, 'positive');
    } else {
      setRoiLine('roiTreatBacon', `Needs 4,255+ 🦴/min to profit (now ${Math.round(baconBase).toLocaleString()}/m)`, 'caution');
    }

    const kongRates = getEstimatedPackRates({ kongActive: true });
    const estKongPackMagic = Math.max(1, Math.round((kongRates.magicPerHour / 3600) * TREAT_CONFIG.treatKong.duration));
    setRoiLine('roiTreatKong', `Est. ~${estKongPackMagic} ✨ from pack | +1 ✨ per tap`, 'utility');

    setRoiLine('roiTreatXp', '2.0x XP on all digs & pets | Best for leveling pups', 'utility');
  }

  function refreshTreatButtonTimers(): void {
    const costTreatXpEl = document.getElementById('costTreatXp');
    if (costTreatXpEl) {
      costTreatXpEl.textContent = formatTimedTreatCostLabel(TREAT_CONFIG.treatXp.baseCost, state.xpTreatTimer, 'xp', 'treatXp');
    }

    const costTreatKongEl = document.getElementById('costTreatKong');
    if (costTreatKongEl) {
      costTreatKongEl.textContent = formatTimedTreatCostLabel(TREAT_CONFIG.treatKong.baseCost, state.kongTimer, 'kong', 'treatKong');
    }

    const costTreatCupEl = document.getElementById('costTreatCup');
    if (costTreatCupEl) {
      costTreatCupEl.textContent = formatTimedTreatCostLabel(TREAT_CONFIG.treatCup.baseCost, state.pupCupTimer, 'cup', 'treatCup');
    }

    const costTreatFeastEl = document.getElementById('costTreatFeast');
    if (costTreatFeastEl) {
      costTreatFeastEl.textContent = formatTimedTreatCostLabel(TREAT_CONFIG.treatFeast.baseCost, state.feastTimer, 'feast', 'treatFeast');
    }

    const costTreatBaconEl = document.getElementById('costTreatBacon');
    if (costTreatBaconEl) {
      costTreatBaconEl.textContent = formatTimedTreatCostLabel(TREAT_CONFIG.treatBacon.baseCost, state.baconTimer, 'bacon', 'treatBacon');
    }

    refreshTreatButtonStates();

    const activeBuffsBar = document.getElementById('activeBuffsBar');
    if (activeBuffsBar) {
      const chips: string[] = [];
      if (state.pupCupTimer > 0) chips.push(`Cup 1.35x | ${Math.ceil(state.pupCupTimer)}s`);
      if (state.xpTreatTimer > 0) chips.push(`2x XP | ${Math.ceil(state.xpTreatTimer)}s`);
      if (state.kongTimer > 0) chips.push(`+1 ✨ Bonus | ${Math.ceil(state.kongTimer)}s`);
      if (state.feastTimer > 0) chips.push(`Feast 1.50x | ${Math.ceil(state.feastTimer)}s`);
      if (state.baconTimer > 0) chips.push(`Bacon Frenzy | ${Math.ceil(state.baconTimer)}s`);

      activeBuffsBar.innerHTML = chips.map(c => `<span class="buff-chip">${c}</span>`).join('');
    }
  }

  function formatToyFlatBadge(bonusVal: number, totalVal: number): string {
    const safeBonus = Math.max(0, Math.round(Number(bonusVal) || 0));
    const safeTotal = Math.max(0, Math.round(Number(totalVal) || 0));
    return `+${safeBonus} | ${safeTotal}`;
  }

  function formatToyBoostBadge(bonusRatio: number, totalRatio: number): string {
    const safeBonus = Math.max(0, Number(bonusRatio) || 0);
    const safeTotal = Math.max(0, Number(totalRatio) || 0);
    const bonusPct = Math.round(safeBonus * 100);
    const totalPct = Math.round(safeTotal * 100);
    return `+${bonusPct}% | ${totalPct}%`;
  }

  function refreshToyBoostBadges(): void {
    const ballBoostEl = document.getElementById('ballCurrentBoost');
    if (ballBoostEl) {
      const currentPower = Number(state.digPower) || BASE_DIG_POWER;
      const bonusVal = Math.max(0, currentPower - BASE_DIG_POWER);
      ballBoostEl.textContent = formatToyFlatBadge(bonusVal, currentPower);
    }

    const duckBoostEl = document.getElementById('duckCurrentBoost');
    if (duckBoostEl) {
      const currentIdle = Number(state.idleMultiplier) || BASE_IDLE_MULTIPLIER;
      const bonusRatio = Math.max(0, currentIdle - BASE_IDLE_MULTIPLIER);
      const totalRatio = currentIdle;
      duckBoostEl.textContent = formatToyBoostBadge(bonusRatio, totalRatio);
    }

    const frisbeeBoostEl = document.getElementById('frisbeeCurrentBoost');
    if (frisbeeBoostEl) {
      const currentSpeed = Number(state.speedMultiplier) || BASE_SPEED_MULTIPLIER;
      const bonusRatio = Math.max(0, (currentSpeed - BASE_SPEED_MULTIPLIER) / BASE_SPEED_MULTIPLIER);
      const totalRatio = currentSpeed / BASE_SPEED_MULTIPLIER;
      frisbeeBoostEl.textContent = formatToyBoostBadge(bonusRatio, totalRatio);
    }
  }

  function updateUI(): void {
    const boneCountEl = document.getElementById('boneCount');
    if (boneCountEl) boneCountEl.textContent = Math.floor(state.bones).toLocaleString();
    const magicBoneCountEl = document.getElementById('magicBoneCount');
    if (magicBoneCountEl) magicBoneCountEl.textContent = Math.floor(state.magicBones).toLocaleString();

    const total = getTotalDogs();
    const atDogCap = total >= MAX_DOGS;
    const miniDogsEl = document.getElementById('miniDogs');
    if (miniDogsEl) miniDogsEl.textContent = `${total}/${MAX_DOGS}`;

    const nameTagLabel = document.getElementById('nameTagSettingLabel');
    if (nameTagLabel) nameTagLabel.textContent = state.showNameTags ? 'ON' : 'OFF';

    const soundLabel = document.getElementById('soundSettingLabel');
    if (soundLabel) soundLabel.textContent = state.soundEnabled ? 'ON' : 'OFF';

    const ambientLabel = document.getElementById('ambientSettingLabel');
    if (ambientLabel) ambientLabel.textContent = state.ambientEnabled ? 'ON' : 'OFF';

    const hapticsLabel = document.getElementById('hapticsSettingLabel');
    if (hapticsLabel) hapticsLabel.textContent = state.hapticsEnabled ? 'ON' : 'OFF';

    const anyAudioOn = !masterMuted && (state.soundEnabled || state.ambientEnabled);
    const iconOn = document.getElementById('iconSoundOn');
    const iconOff = document.getElementById('iconSoundOff');
    const muteBtn = document.getElementById('btnQuickMute');
    if (iconOn) iconOn.style.display = anyAudioOn ? 'block' : 'none';
    if (iconOff) iconOff.style.display = anyAudioOn ? 'none' : 'block';
    if (muteBtn) muteBtn.classList.toggle('is-muted', !anyAudioOn);

    const hintEl = document.getElementById('onboardingHint');
    if (hintEl) {
      hintEl.style.display = state.hasSeenHint ? 'none' : 'block';
    }

    Object.keys(BREED_CONFIG).forEach(breed => {
      const capBreed = breed.charAt(0).toUpperCase() + breed.slice(1);
      const el = document.getElementById(`count${capBreed}`);
      if (el) {
        const breedTotal = state.roster.filter(d => d.breed === breed).length;
        el.textContent = String(breedTotal);
      }
      const costEl = document.getElementById(`cost${capBreed}`);
      if (costEl) {
        costEl.textContent = atDogCap ? `Park Full (${MAX_DOGS}/${MAX_DOGS})` : `${state.costs[breed].toLocaleString()} 🦴`;
      }
      const btnEl = document.getElementById(`btnSummon${capBreed}`) as HTMLButtonElement | null;
      if (btnEl) {
        btnEl.disabled = atDogCap || state.bones < state.costs[breed];
      }
    });

    const perkCountEl = document.getElementById('perkCountDisplay');
    if (perkCountEl) perkCountEl.textContent = String(state.perks.length);

    const perkListContainer = document.getElementById('perkListContainer');
    if (perkListContainer) {
      perkListContainer.innerHTML = '';

      const groupedPerks = new Map<string, { perk: PerkItem; count: number }>();
      state.perks.forEach(p => {
        const key = p.id || `${p.name}::${p.rarity}`;
        const existing = groupedPerks.get(key);
        if (!existing) {
          groupedPerks.set(key, { perk: p, count: 1 });
        } else {
          existing.count += 1;
        }
      });

      groupedPerks.forEach(({ perk, count }) => {
        const div = document.createElement('div');
        div.className = 'shop-card';
        div.style.padding = '10px 14px';
        const countLabel = count > 1 ? ` | x${count}` : '';
        const summaryDesc = formatStackedTreasureSummary(perk, count);

        div.innerHTML = `
          <div class="shop-info">
            <h4 style="color: #ffeaa7; font-size: 0.88rem;">
              ${perk.name} <span style="font-size:0.74rem; color:#a29bfe; font-weight:600;">| ${perk.rarity}${countLabel}</span>
            </h4>
            <p style="font-size:0.74rem; margin:2px 0 0 0;">${summaryDesc}</p>
          </div>
        `;
        perkListContainer.appendChild(div);
      });
    }

    const decorBonuses = getDecorBonuses();

    DECOR_TYPES.forEach(type => {
      const cfg = DECOR_CONFIG[type];
      const owned = state.decorInventory[type] || 0;
      const placed = decorBonuses.counts[type] || 0;

      const ownedEl = document.getElementById(cfg.ownedId);
      if (ownedEl) ownedEl.textContent = String(owned);
      const countEl = document.getElementById(cfg.countId);
      if (countEl) countEl.textContent = String(placed);

      const buyBtn = document.getElementById(cfg.buyBtnId) as HTMLButtonElement | null;
      if (buyBtn) {
        const atMaxOwned = owned >= cfg.max;
        buyBtn.disabled = state.magicBones < cfg.cost || atMaxOwned;
        const nameSpan = buyBtn.querySelector('.btn-name');
        if (nameSpan) nameSpan.textContent = atMaxOwned ? 'Max Owned' : cfg.buyLabel;
      }

      const placeBtn = document.getElementById(cfg.placeBtnId) as HTMLButtonElement | null;
      if (placeBtn) {
        const unplaced = owned - placed;
        const nameSpan = placeBtn.querySelector('.btn-name');
        if (placed >= cfg.max) {
          if (nameSpan) nameSpan.textContent = 'Max Placed';
          placeBtn.disabled = true;
        } else if (unplaced <= 0) {
          if (nameSpan) nameSpan.textContent = 'Place';
          placeBtn.disabled = true;
        } else {
          if (nameSpan) nameSpan.textContent = 'Place';
          placeBtn.disabled = false;
        }
      }
    });

    // Custom Ground Tiles UI sync
    const tileEntries = Object.values(state.tileMap || {});
    CUSTOM_TILE_STYLES.forEach(style => {
      const cfg = CUSTOM_TILE_CONFIG[style];
      const isUnlocked = Boolean(state.unlockedTiles?.[style]);
      const paintedCount = tileEntries.filter(v => v === style).length;

      const statusEl = document.getElementById(cfg.statusId);
      if (statusEl) {
        statusEl.textContent = isUnlocked
          ? `Unlocked | ${paintedCount} painted`
          : 'Locked | One-time unlock';
      }

      const btn = document.getElementById(cfg.btnId) as HTMLButtonElement | null;
      if (btn) {
        const nameSpan = btn.querySelector('.btn-name');
        const costSpan = btn.querySelector('.btn-cost') as HTMLElement | null;
        if (isUnlocked) {
          if (nameSpan) nameSpan.textContent = 'Paint';
          if (costSpan) costSpan.style.display = 'none';
          btn.disabled = false;
        } else {
          if (nameSpan) nameSpan.textContent = 'Unlock';
          if (costSpan) {
            costSpan.style.display = '';
            costSpan.textContent = `${TILE_UNLOCK_COST.toLocaleString()} ✨`;
          }
          btn.disabled = state.magicBones < TILE_UNLOCK_COST;
        }
      }
    });

    const totalPaintedTiles = tileEntries.length;
    const countPaintedEl = document.getElementById('countPaintedTiles');
    if (countPaintedEl) countPaintedEl.textContent = String(totalPaintedTiles);
    const btnClearTiles = document.getElementById('btnClearTiles') as HTMLButtonElement | null;
    if (btnClearTiles) btnClearTiles.disabled = totalPaintedTiles === 0;
    const sp = state.starterProps || createDefaultStarterProps();
    const syncLandmarkBtn = (id: string, shown: boolean): void => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.classList.toggle('is-on', shown);
      btn.classList.toggle('is-off', !shown);
      const stateSpan = btn.querySelector('.landmark-toggle-state');
      if (stateSpan) stateSpan.textContent = shown ? 'Shown' : 'Hidden';
    };
    syncLandmarkBtn('btnToggleStarterTree', sp.showTree !== false);
    mushrooms.forEach((_, idx) => {
      syncLandmarkBtn(`btnToggleMushroom${idx}`, sp.showMushrooms[idx] !== false);
    });

    refreshTilePaintBar();

    const trueBonesPerDig = getAverageBonesPerDig();
    const formattedTrueBones = Number.isInteger(trueBonesPerDig)
      ? trueBonesPerDig.toLocaleString()
      : trueBonesPerDig.toFixed(1);

    const bpsCountEl = document.getElementById('bpsCount');
    if (bpsCountEl) bpsCountEl.textContent = `avg ${formattedTrueBones}/dig`;

    const atDigPowerCap = state.digPower >= MAX_DIG_POWER;
    const atDuckCap = state.idleMultiplier >= MAX_IDLE_MULTIPLIER;
    const atSpeedCap = state.speedMultiplier >= MAX_SPEED_MULTIPLIER;

    refreshToyBoostBadges();

    const costToyBonesEl = document.getElementById('costToyBones');
    if (costToyBonesEl) {
      costToyBonesEl.textContent = atDigPowerCap
        ? `MAX (${MAX_DIG_POWER})`
        : `${state.costs.toyBones.toLocaleString()} 🦴`;
    }
    const costToyIdleEl = document.getElementById('costToyIdle');
    if (costToyIdleEl) {
      costToyIdleEl.textContent = atDuckCap
        ? `MAX (${Math.round(MAX_IDLE_MULTIPLIER * 100)}%)`
        : `${state.costs.toyIdle.toLocaleString()} 🦴`;
    }
    const costToySpeedEl = document.getElementById('costToySpeed');
    if (costToySpeedEl) {
      costToySpeedEl.textContent = atSpeedCap
        ? `MAX (${MAX_SPEED_MULTIPLIER.toFixed(2)}x)`
        : `${state.costs.toySpeed.toLocaleString()} 🦴`;
    }

    refreshTreatButtonTimers();

    const packRates = getEstimatedPackRates();
    const statBonesPerMinEl = document.getElementById('statBonesPerMin');
    if (statBonesPerMinEl) {
      const formattedBpm = packRates.bonesPerMin >= 100
        ? Math.round(packRates.bonesPerMin).toLocaleString()
        : packRates.bonesPerMin.toFixed(1);
      statBonesPerMinEl.textContent = `~${formattedBpm} 🦴`;
    }
    const statMagicPerHourEl = document.getElementById('statMagicPerHour');
    if (statMagicPerHourEl) {
      const formattedMph = packRates.magicPerHour >= 10
        ? Math.round(packRates.magicPerHour).toLocaleString()
        : packRates.magicPerHour.toFixed(1);
      statMagicPerHourEl.textContent = `~${formattedMph} ✨`;
    }
    const statDigPowerEl = document.getElementById('statDigPower');
    if (statDigPowerEl) statDigPowerEl.textContent = String(Number(state.digPower.toFixed(1)));
    const statSpeedEl = document.getElementById('statSpeed');
    if (statSpeedEl) statSpeedEl.textContent = `${getDigMultiplier().toFixed(2)}x`;
    const statChanceEl = document.getElementById('statChance');
    if (statChanceEl) {
      const totalMagic = Math.min(0.9, state.magicChance + getPerkMultipliers().magicBonus + decorBonuses.magicAdd + getCurrentWeather().magicAdd + getPackHappinessInfo().magicAdd);
      statChanceEl.textContent = `${Math.round(totalMagic * 100)}%`;
    }
    const lifetimeEl = document.getElementById('statLifetimeBones');
    if (lifetimeEl) {
      lifetimeEl.textContent = Math.floor(state.lifetimeBones).toLocaleString();
    }
    const decorBonusEl = document.getElementById('statDecorBonus');
    if (decorBonusEl) {
      const formatPct = (val: number): string => {
        const pct = Math.round(val * 1000) / 10;
        return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
      };
      const parts: string[] = [];
      if (decorBonuses.xpMult > 1) parts.push(`+${formatPct(decorBonuses.xpMult - 1)}% XP`);
      if (decorBonuses.magicAdd > 0) parts.push(`+${formatPct(decorBonuses.magicAdd)}% ✨`);
      if (decorBonuses.payoutMult > 1) parts.push(`+${formatPct(decorBonuses.payoutMult - 1)}% 🦴`);
      if (decorBonuses.paceMult > 1) parts.push(`+${formatPct(decorBonuses.paceMult - 1)}% Pace`);
      decorBonusEl.textContent = parts.length > 0 ? parts.join(' | ') : 'None yet';
    }
    const offlineRateEl = document.getElementById('statOfflineRate');
    if (offlineRateEl) {
      offlineRateEl.textContent = `${Math.round(state.idleMultiplier * 100)}%`;
    }

    refreshWeatherHUD();
    refreshMoodHUD();

    const btnToyBones = document.getElementById('btnToyBones') as HTMLButtonElement | null;
    if (btnToyBones) btnToyBones.disabled = state.bones < state.costs.toyBones || atDigPowerCap;
    const btnToyIdle = document.getElementById('btnToyIdle') as HTMLButtonElement | null;
    if (btnToyIdle) btnToyIdle.disabled = state.bones < state.costs.toyIdle || atDuckCap;
    const btnToySpeed = document.getElementById('btnToySpeed') as HTMLButtonElement | null;
    if (btnToySpeed) btnToySpeed.disabled = state.bones < state.costs.toySpeed || atSpeedCap;

    refreshTreatButtonStates();
    refreshTreatRoiHints();

    if (pendingRerollDogId && rerollModal && rerollModal.style.display === 'flex') {
      const activeRerollDog = state.roster.find(d => d.id === pendingRerollDogId);
      const nextCost = getRerollCost(activeRerollDog);
      if (rerollCostLabel) {
        rerollCostLabel.textContent = `${nextCost.toLocaleString()} ✨`;
      }
      if (btnConfirmReroll) {
        btnConfirmReroll.disabled = (state.magicBones || 0) < nextCost;
      }
    }
  }

  function containerHasActivePointer(container: HTMLElement | null): boolean {
    if (!container) return false;
    return Boolean(container.querySelector('button:active'));
  }

  const weatherBadgeBtn = document.getElementById('weatherBadge');
  const weatherPopoverEl = document.getElementById('weatherPopover');
  const moodBadgeBtn = document.getElementById('moodBadge');
  const moodPopoverEl = document.getElementById('moodPopover');

  function formatWeatherCountdown(ms: number): string {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `Next change in ${mins}m ${String(secs).padStart(2, '0')}s`;
  }

  function getActiveTreatTypeCount(): number {
    let count = 0;
    if (state.xpTreatTimer > 0) count += 1;
    if (state.kongTimer > 0) count += 1;
    if (state.pupCupTimer > 0) count += 1;
    if (state.feastTimer > 0) count += 1;
    if (state.baconTimer > 0) count += 1;
    return count;
  }

  function refreshMoodHUD(): void {
    const info = getPackHappinessInfo();
    const floorPct = Math.round(info.floor);
    const tierClass = `mood-${info.tier}`;

    const moodIconEl = document.getElementById('moodBadgeIcon');
    const moodTextEl = document.getElementById('moodBadgeText');
    if (moodIconEl) moodIconEl.textContent = info.icon;
    if (moodTextEl) moodTextEl.textContent = `${info.name} | ${info.shortBonus}`;
    if (moodBadgeBtn) {
      moodBadgeBtn.classList.remove('mood-cozy', 'mood-happy', 'mood-joyful', 'mood-ecstatic');
      moodBadgeBtn.classList.add(tierClass);
    }

    const popTitleEl = document.getElementById('moodPopoverTitle');
    const popBonusEl = document.getElementById('moodPopoverBonus');
    const popFillEl = document.getElementById('moodPopoverFill');
    const popFloorEl = document.getElementById('moodPopoverFloor');
    const popFloorLabelEl = document.getElementById('moodPopoverFloorLabel');
    if (popTitleEl) popTitleEl.textContent = `${info.icon} ${info.name} (${info.roundedPct}%)`;
    if (popBonusEl) popBonusEl.textContent = info.bonusSummary;
    if (popFillEl) popFillEl.style.width = `${info.value}%`;
    if (popFloorEl) popFloorEl.style.left = `${info.floor}%`;
    if (popFloorLabelEl) popFloorLabelEl.textContent = `Cozy floor: ${floorPct}%`;

    const rosterTierEl = document.getElementById('rosterMoodTier');
    const rosterEffectsEl = document.getElementById('rosterMoodEffects');
    const rosterFillEl = document.getElementById('rosterMoodFill');
    const rosterFloorEl = document.getElementById('rosterMoodFloorMark');
    if (rosterTierEl) {
      rosterTierEl.textContent = `${info.icon} ${info.name} | ${info.roundedPct}%`;
      rosterTierEl.classList.remove('mood-cozy', 'mood-happy', 'mood-joyful', 'mood-ecstatic');
      rosterTierEl.classList.add(tierClass);
    }
    if (rosterEffectsEl) {
      rosterEffectsEl.textContent = `${info.bonusSummary} | Cozy Floor ${floorPct}%`;
    }
    if (rosterFillEl) rosterFillEl.style.width = `${info.value}%`;
    if (rosterFloorEl) rosterFloorEl.style.left = `${info.floor}%`;

    const activeTreats = getActiveTreatTypeCount();
    const toyInfo = getToyFloorBreakdown();
    const decorFloor = getDecorFloorBonus();

    const totalPups = dogs.length;
    const readyPups = dogs.filter(d => d.petCooldown <= 0).length;
    const minPetCooldown = totalPups > 0
      ? Math.min(...dogs.map(d => Math.max(0, d.petCooldown)))
      : 0;

    const petSourceEl = document.getElementById('moodSourcePetting');
    if (petSourceEl) {
      if (totalPups <= 1) {
        petSourceEl.textContent = readyPups > 0 ? 'Ready (+5)' : `Cooldown (${Math.max(1, Math.ceil(minPetCooldown))}s)`;
      } else if (readyPups > 0) {
        petSourceEl.textContent = `${readyPups}/${totalPups} ready (+5)`;
      } else {
        petSourceEl.textContent = `Cooldown (${Math.max(1, Math.ceil(minPetCooldown))}s)`;
      }
    }
    const treatSourceEl = document.getElementById('moodSourceTreats');
    if (treatSourceEl) {
      treatSourceEl.textContent = activeTreats > 0 ? `${activeTreats} active` : 'Ready (+8 each)';
    }
    const toySourceEl = document.getElementById('moodSourceToys');
    if (toySourceEl) {
      toySourceEl.textContent = toyInfo.floorBonus > 0 ? `+${toyInfo.floorBonus}% floor` : '0/3 owned';
    }
    const decorSourceEl = document.getElementById('moodSourceDecor');
    if (decorSourceEl) {
      decorSourceEl.textContent = decorFloor > 0 ? `+${decorFloor}% floor` : 'None placed';
    }
  }

  function refreshWeatherHUD(): void {
    const weather = getCurrentWeather();
    const { next, msRemaining } = getNextWeatherInfo();

    const badgeIcon = document.getElementById('weatherBadgeIcon');
    const badgeText = document.getElementById('weatherBadgeText');
    if (badgeIcon) badgeIcon.textContent = weather.icon;
    if (badgeText) badgeText.textContent = `${weather.name} | ${weather.shortMod}`;
    if (weatherBadgeBtn) {
      weatherBadgeBtn.classList.remove('weather-sunny', 'weather-windy', 'weather-rain', 'weather-twilight');
      weatherBadgeBtn.classList.add(`weather-${weather.id}`);
    }

    const popTitle = document.getElementById('weatherPopoverTitle');
    const popMod = document.getElementById('weatherPopoverMod');
    const popDesc = document.getElementById('weatherPopoverDesc');
    const popSky = document.getElementById('weatherSkyStatus');
    const popCount = document.getElementById('weatherCountdown');
    const popNext = document.getElementById('weatherNextPreview');
    const tod = getTimeOfDayInfo();
    const moon = getMoonPhaseInfo();
    if (popTitle) popTitle.textContent = `${weather.icon} ${weather.name}`;
    if (popMod) popMod.textContent = weather.modLabel;
    if (popDesc) popDesc.textContent = weather.desc;
    if (popSky) popSky.textContent = `${tod.icon} ${tod.name} | ${moon.icon} ${moon.name}`;
    if (popCount) popCount.textContent = formatWeatherCountdown(msRemaining);
    if (popNext) popNext.textContent = `Next: ${next.icon} ${next.name}`;
  }

  function closeWeatherPopover(): void {
    if (weatherPopoverEl) weatherPopoverEl.style.display = 'none';
    if (weatherBadgeBtn) weatherBadgeBtn.setAttribute('aria-expanded', 'false');
  }

  function closeMoodPopover(): void {
    if (moodPopoverEl) moodPopoverEl.style.display = 'none';
    if (moodBadgeBtn) moodBadgeBtn.setAttribute('aria-expanded', 'false');
  }

  weatherBadgeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    if (!weatherPopoverEl) return;
    const isOpen = weatherPopoverEl.style.display !== 'none';
    closeMoodPopover();
    if (isOpen) {
      closeWeatherPopover();
    } else {
      refreshWeatherHUD();
      weatherPopoverEl.style.display = 'flex';
      weatherBadgeBtn.setAttribute('aria-expanded', 'true');
      sfx.collect();
    }
  });

  moodBadgeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    if (!moodPopoverEl) return;
    const isOpen = moodPopoverEl.style.display !== 'none';
    closeWeatherPopover();
    if (isOpen) {
      closeMoodPopover();
    } else {
      refreshMoodHUD();
      moodPopoverEl.style.display = 'flex';
      moodBadgeBtn.setAttribute('aria-expanded', 'true');
      sfx.collect();
    }
  });

  document.getElementById('btnOpenMoodBreakdown')?.addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    closeMoodPopover();
    tabBtns.forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const rosterTabBtn = document.querySelector<HTMLButtonElement>('.tab-btn[data-tab="tab-roster"]');
    rosterTabBtn?.classList.add('active');
    document.getElementById('tab-roster')?.classList.add('active');
    if (gameModal) gameModal.style.display = 'flex';
    if (drawerWindow) {
      drawerWindow.classList.remove('is-dragging');
      drawerWindow.style.transform = 'translateY(0)';
    }
    updateUI();
    renderRosterTab();
  });

  document.addEventListener('click', (e) => {
    if (
      weatherPopoverEl &&
      weatherPopoverEl.style.display !== 'none' &&
      !weatherPopoverEl.contains(e.target as Node) &&
      e.target !== weatherBadgeBtn &&
      !weatherBadgeBtn?.contains(e.target as Node)
    ) {
      closeWeatherPopover();
    }
    if (
      moodPopoverEl &&
      moodPopoverEl.style.display !== 'none' &&
      !moodPopoverEl.contains(e.target as Node) &&
      e.target !== moodBadgeBtn &&
      !moodBadgeBtn?.contains(e.target as Node)
    ) {
      closeMoodPopover();
    }
  });

  function handleAndroidBackNavigation(): boolean {
    if (moodPopoverEl && moodPopoverEl.style.display !== 'none') {
      closeMoodPopover();
      return true;
    }
    if (weatherPopoverEl && weatherPopoverEl.style.display !== 'none') {
      closeWeatherPopover();
      return true;
    }
    if (isModalCurrentlyOpen('helpModal')) {
      closeHelpModal();
      return true;
    }
    if (isModalCurrentlyOpen('resetConfirmModal') && resetConfirmModal) {
      resetConfirmModal.style.display = 'none';
      return true;
    }
    if (isModalCurrentlyOpen('clearDecorConfirmModal') && clearDecorConfirmModal) {
      clearDecorConfirmModal.style.display = 'none';
      return true;
    }
    if (isModalCurrentlyOpen('clearTilesConfirmModal') && clearTilesConfirmModal) {
      clearTilesConfirmModal.style.display = 'none';
      return true;
    }
    if (isModalCurrentlyOpen('retireConfirmModal') && retireConfirmModal) {
      pendingRetireDogId = null;
      retireConfirmModal.style.display = 'none';
      return true;
    }
    if (isModalCurrentlyOpen('rerollModal')) {
      closeRerollModal();
      return true;
    }
    const boneCapModal = document.getElementById('boneCapModal');
    if (isModalCurrentlyOpen('boneCapModal') && boneCapModal) {
      boneCapModal.style.display = 'none';
      return true;
    }
    const offlineModal = document.getElementById('offlineModal');
    if (isModalCurrentlyOpen('offlineModal') && offlineModal) {
      offlineModal.style.display = 'none';
      flushQueuedAwayProgressIfReady();
      return true;
    }
    if (state.isPlacingDecor) {
      cancelDecorPlacement();
      return true;
    }
    if (state.isPaintingTiles) {
      stopTilePaintMode();
      return true;
    }
    if (gameModal && gameModal.style.display === 'flex') {
      closeMenu();
      return true;
    }
    return false;
  }

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleAndroidBackNavigation();
    }
  });

  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  const isNativeCapacitor = Boolean(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());

  if (cap?.Plugins?.App?.addListener) {
    cap.Plugins.App.addListener('backButton', () => {
      const handled = handleAndroidBackNavigation();
      if (!handled) {
        saveGame();
        cap.Plugins?.App?.exitApp?.();
      }
    });
  }

  if (import.meta.env.DEV) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => {
          reg.unregister().catch(() => {});
        });
      }).catch(() => {});
    }
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          caches.delete(key).catch(() => {});
        });
      }).catch(() => {});
    }
  } else if (!isNativeCapacitor && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.error('Service worker registration failed:', err);
      });
    });
  }

  loadGame();

  lastTime = performance.now();
  let lastRosterUiRefresh = 0;
  let lastMoodUiRefresh = 0;

  function loop(now: number): void {
    try {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = rawDt > 1 ? 0.016 : Math.min(0.05, Math.max(0, rawDt));

      // Smooth rotational inertia after flicking the park
      if (!isRotating && Math.abs(cameraVelocity) > 0.002) {
        cameraAngle += cameraVelocity * dt;
        cameraVelocity *= Math.pow(0.08, dt);
        if (Math.abs(cameraVelocity) <= 0.002) {
          cameraVelocity = 0;
          state.cameraAngle = cameraAngle;
          requestSave();
        }
      }

      const prevKongCeil = Math.ceil(state.kongTimer);
      const prevBaconCeil = Math.ceil(state.baconTimer);
      const prevCupCeil = Math.ceil(state.pupCupTimer);
      const prevXpCeil = Math.ceil(state.xpTreatTimer);
      const prevFeastCeil = Math.ceil(state.feastTimer);

      if (state.kongTimer > 0) {
        state.kongTimer = Math.max(0, state.kongTimer - dt);
        if (state.kongTimer === 0) state.kongStacks = 0;
      } else if (state.kongStacks > 0) {
        state.kongStacks = 0;
      }

      if (state.baconTimer > 0) {
        state.baconTimer = Math.max(0, state.baconTimer - dt);
        if (state.baconTimer === 0) state.baconStacks = 0;
      } else if (state.baconStacks > 0) {
        state.baconStacks = 0;
      }

      if (state.pupCupTimer > 0) {
        state.pupCupTimer = Math.max(0, state.pupCupTimer - dt);
        if (state.pupCupTimer === 0) state.pupCupStacks = 0;
      } else if (state.pupCupStacks > 0) {
        state.pupCupStacks = 0;
      }

      if (state.xpTreatTimer > 0) {
        state.xpTreatTimer = Math.max(0, state.xpTreatTimer - dt);
        if (state.xpTreatTimer === 0) state.xpTreatStacks = 0;
      } else if (state.xpTreatStacks > 0) {
        state.xpTreatStacks = 0;
      }

      if (state.feastTimer > 0) {
        state.feastTimer = Math.max(0, state.feastTimer - dt);
        if (state.feastTimer === 0) state.feastStacks = 0;
      } else if (state.feastStacks > 0) {
        state.feastStacks = 0;
      }

      const treatExpired =
        (prevKongCeil > 0 && state.kongTimer === 0) ||
        (prevBaconCeil > 0 && state.baconTimer === 0) ||
        (prevCupCeil > 0 && state.pupCupTimer === 0) ||
        (prevXpCeil > 0 && state.xpTreatTimer === 0) ||
        (prevFeastCeil > 0 && state.feastTimer === 0);

      if (
        Math.ceil(state.kongTimer) !== prevKongCeil ||
        Math.ceil(state.baconTimer) !== prevBaconCeil ||
        Math.ceil(state.pupCupTimer) !== prevCupCeil ||
        Math.ceil(state.xpTreatTimer) !== prevXpCeil ||
        Math.ceil(state.feastTimer) !== prevFeastCeil
      ) {
        refreshTreatButtonTimers();
        if (treatExpired) {
          updateUI();
        }
      }

      if (state.feastAnimTimer > 0) state.feastAnimTimer = Math.max(0, state.feastAnimTimer - dt);

      // Update Pack Happiness gentle trickle (treats) or cooldown (idle toward Cozy Floor)
      const prevMoodRounded = Math.round(state.packHappiness || getCozyFloor());
      const prevMoodTier = getPackHappinessInfo().tier;
      const activeTreats = getActiveTreatTypeCount();
      if (activeTreats > 0) {
        const trickle = Math.min(0.9, activeTreats * HAPPINESS_TREAT_TRICKLE_PER_SEC) * dt;
        addPackHappiness(trickle, true);
      } else {
        const floor = getCozyFloor();
        const cur = Number(state.packHappiness) || floor;
        if (cur > floor) {
          state.packHappiness = Math.max(floor, cur - HAPPINESS_COOL_RATE_PER_SEC * dt);
        } else if (cur < floor) {
          state.packHappiness = floor;
        }
      }
      const nextMoodInfo = getPackHappinessInfo();
      if (nextMoodInfo.tier !== prevMoodTier) {
        updateUI();
      } else if (nextMoodInfo.roundedPct !== prevMoodRounded) {
        refreshMoodHUD();
      }

      if (isAmbientActive() && !document.hidden) {
        ambientEventCooldown -= dt;
        if (ambientEventCooldown <= 0) {
          playAmbientParkEvent();
          ambientEventCooldown = 3.5 + Math.random() * 4.5;
        }
      }

      if (parkBarkCooldown > 0) {
        parkBarkCooldown = Math.max(0, parkBarkCooldown - dt);
      }
      if (parkBarkCooldown <= 0 && dogs.length > 0) {
        const awakeBarkReadyDogs = dogs.filter(d => d.canBark());
        if (awakeBarkReadyDogs.length > 0) {
          const barker = awakeBarkReadyDogs[Math.floor(Math.random() * awakeBarkReadyDogs.length)];
          if (barker.triggerBark()) {
            parkBarkCooldown = PARK_BARK_MIN_COOLDOWN + Math.random() * (PARK_BARK_MAX_COOLDOWN - PARK_BARK_MIN_COOLDOWN);
          } else {
            parkBarkCooldown = 1.5;
          }
        } else {
          parkBarkCooldown = 1.5;
        }
      }

      if (state.hasTennisBall) {
        tennisBall.bouncePhase += dt;
        if (tennisBall.isRolling) {
          tennisBall.gx += (tennisBall.targetGx - tennisBall.gx) * (dt * 5);
          tennisBall.gy += (tennisBall.targetGy - tennisBall.gy) * (dt * 5);
          if (Math.hypot(tennisBall.targetGx - tennisBall.gx, tennisBall.targetGy - tennisBall.gy) < 0.05) {
            tennisBall.isRolling = false;
          }
        } else {
          tennisBall.timer -= dt;
          if (tennisBall.timer <= 0 && dogs.length > 0) {
            tennisBall.timer = 8.0 + Math.random() * 6.0;
            const eligible = dogs.filter(d => d.state !== 'SLIDE_CLIMB' && d.state !== 'SLIDE_DOWN' && !d.slideTarget);
            if (eligible.length > 0) {
              const walker = eligible[Math.floor(Math.random() * eligible.length)];
              walker.cancelSlide();
              walker.targetGx = tennisBall.gx;
              walker.targetGy = tennisBall.gy;
              walker.state = 'WALK';
              walker.onReachToy = () => {
                sfx.squeak();
                addPackHappiness(1.5);
                tennisBall.isRolling = true;
                tennisBall.targetGx = Math.max(0.7, Math.min(GRID_SIZE - 0.7, tennisBall.gx + (Math.random() - 0.5) * 3.5));
                tennisBall.targetGy = Math.max(0.7, Math.min(GRID_SIZE - 0.7, tennisBall.gy + (Math.random() - 0.5) * 3.5));
              };
            }
          }
        }
      }

      if (state.hasFrisbee) {
        if (frisbee.isMoving) {
          frisbee.gx += (frisbee.targetGx - frisbee.gx) * (dt * 5);
          frisbee.gy += (frisbee.targetGy - frisbee.gy) * (dt * 5);
          if (Math.hypot(frisbee.targetGx - frisbee.gx, frisbee.targetGy - frisbee.gy) < 0.05) {
            frisbee.isMoving = false;
          }
        } else {
          frisbee.timer -= dt;
          if (frisbee.timer <= 0 && dogs.length > 0) {
            frisbee.timer = 10.0 + Math.random() * 8.0;
            const eligible = dogs.filter(d => d.state !== 'SLIDE_CLIMB' && d.state !== 'SLIDE_DOWN' && !d.slideTarget);
            if (eligible.length > 0) {
              const walker = eligible[Math.floor(Math.random() * eligible.length)];
              walker.cancelSlide();
              walker.targetGx = frisbee.gx;
              walker.targetGy = frisbee.gy;
              walker.state = 'WALK';
              walker.onReachToy = () => {
                sfx.shiny();
                addPackHappiness(1.5);
                frisbee.isMoving = true;
                frisbee.targetGx = Math.max(0.7, Math.min(GRID_SIZE - 0.7, frisbee.gx + (Math.random() - 0.5) * 3.5));
                frisbee.targetGy = Math.max(0.7, Math.min(GRID_SIZE - 0.7, frisbee.gy + (Math.random() - 0.5) * 3.5));
              };
            }
          }
        }
      }

      if (state.hasDuck) {
        if (duck.isMoved) {
          duck.gx += (duck.targetGx - duck.gx) * (dt * 4);
          duck.gy += (duck.targetGy - duck.gy) * (dt * 4);
          if (Math.hypot(duck.targetGx - duck.gx, duck.targetGy - duck.gy) < 0.05) {
            duck.isMoved = false;
          }
        } else {
          duck.timer -= dt;
          if (duck.timer <= 0 && dogs.length > 0) {
            duck.timer = 9.0 + Math.random() * 6.0;
            const eligible = dogs.filter(d => d.state !== 'SLIDE_CLIMB' && d.state !== 'SLIDE_DOWN' && !d.slideTarget);
            if (eligible.length > 0) {
              const walker = eligible[Math.floor(Math.random() * eligible.length)];
              walker.cancelSlide();
              walker.targetGx = duck.gx;
              walker.targetGy = duck.gy;
              walker.state = 'WALK';
              walker.onReachToy = () => {
                sfx.quack();
                addPackHappiness(1.5);
                duck.isMoved = true;
                duck.targetGx = Math.max(0.7, Math.min(GRID_SIZE - 0.7, duck.gx + (Math.random() - 0.5) * 2.5));
                duck.targetGy = Math.max(0.7, Math.min(GRID_SIZE - 0.7, duck.gy + (Math.random() - 0.5) * 2.5));
              };
            }
          }
        }
      }

      const nowMs = Date.now();
      const liveHour = getHourBucket(nowMs);
      if (liveHour !== currentWeatherHour) {
        currentWeatherHour = liveHour;
        const w = getCurrentWeather();
        addFloatingText(viewportW / 2, Math.max(96, viewportH * 0.16), `${w.icon} ${w.name} (${w.shortMod})`, '#ffeaa7');
        sfx.gather();
        updateAmbientBed();
        updateUI();
      } else if (weatherPopoverEl && weatherPopoverEl.style.display !== 'none') {
        const popCount = document.getElementById('weatherCountdown');
        if (popCount) {
          popCount.textContent = formatWeatherCountdown(getNextWeatherInfo(nowMs).msRemaining);
        }
        const popSky = document.getElementById('weatherSkyStatus');
        if (popSky) {
          const tod = getTimeOfDayInfo(nowMs);
          const moon = getMoonPhaseInfo(nowMs);
          popSky.textContent = `${tod.icon} ${tod.name} | ${moon.icon} ${moon.name}`;
        }
      }

      const activeWeatherId = getCurrentWeather().id;
      (['sunny', 'windy', 'rain', 'twilight'] as WeatherId[]).forEach(wId => {
        const target = wId === activeWeatherId ? 1 : 0;
        const diff = target - weatherWeights[wId];
        if (Math.abs(diff) < 0.005) {
          weatherWeights[wId] = target;
        } else {
          weatherWeights[wId] += diff * Math.min(1, dt * 0.9);
        }
      });

      const hourFloat = getLocalHourFloat(nowMs);
      const baseSky = sampleTimeOfDaySky(hourFloat);
      const sunnyWeight = weatherWeights.sunny;
      const windyWeight = weatherWeights.windy;
      const rainWeight = weatherWeights.rain;
      const twilightWeight = weatherWeights.twilight;

      let skyTop = baseSky.top;
      let skyMid = baseSky.mid;
      let skyBot = baseSky.bot;
      let skyGlow = baseSky.glow;
      let skyGlowAlpha = baseSky.glowAlpha;

      if (sunnyWeight > 0.001) {
        const k = 0.26 * sunnyWeight * Math.max(0.25, baseSky.sunMix);
        skyTop = lerpRgb(skyTop, [60, 140, 224], k);
        skyMid = lerpRgb(skyMid, [114, 186, 242], k);
        skyBot = lerpRgb(skyBot, [182, 224, 246], k);
        skyGlow = lerpRgb(skyGlow, [255, 232, 166], 0.45 * sunnyWeight);
        skyGlowAlpha += 0.05 * sunnyWeight;
      }
      if (windyWeight > 0.001) {
        const k = 0.42 * windyWeight;
        skyTop = lerpRgb(skyTop, [20, 44, 62], k);
        skyMid = lerpRgb(skyMid, [46, 88, 102], k);
        skyBot = lerpRgb(skyBot, [92, 134, 136], k);
        skyGlow = lerpRgb(skyGlow, [160, 232, 220], 0.45 * windyWeight);
      }
      if (rainWeight > 0.001) {
        const k = 0.62 * rainWeight;
        skyTop = lerpRgb(skyTop, [16, 24, 42], k);
        skyMid = lerpRgb(skyMid, [32, 46, 68], k);
        skyBot = lerpRgb(skyBot, [52, 70, 92], k);
        skyGlow = lerpRgb(skyGlow, [116, 165, 212], 0.5 * rainWeight);
        skyGlowAlpha *= (1 - 0.55 * rainWeight);
      }
      if (twilightWeight > 0.001) {
        const k = 0.56 * twilightWeight;
        skyTop = lerpRgb(skyTop, [14, 12, 38], k);
        skyMid = lerpRgb(skyMid, [42, 32, 78], k);
        skyBot = lerpRgb(skyBot, [78, 48, 96], k);
        skyGlow = lerpRgb(skyGlow, [172, 156, 252], 0.5 * twilightWeight);
      }

      const starVis = Math.max(0, Math.min(1, Math.max(baseSky.starMix, twilightWeight * 0.72) * (1 - 0.85 * rainWeight)));
      const moonVis = Math.max(0, Math.min(1, Math.max(baseSky.moonMix, twilightWeight * 0.78) * (1 - 0.72 * rainWeight)));
      const sunVis = Math.max(0, Math.min(1, baseSky.sunMix * (1 - 0.72 * rainWeight) * (1 - 0.55 * twilightWeight)));

      ctx.clearRect(0, 0, viewportW, viewportH);

      // Dynamic Time-of-Day + Weather Skybox Backdrop
      const skyTopStr = rgbaStr(skyTop, 1);
      const skyBotStr = rgbaStr(skyBot, 1);
      const skyBotRgb = `rgb(${Math.round(skyBot[0])}, ${Math.round(skyBot[1])}, ${Math.round(skyBot[2])})`;
      const skyTopRgb = `rgb(${Math.round(skyTop[0])}, ${Math.round(skyTop[1])}, ${Math.round(skyTop[2])})`;
      if (document.documentElement.dataset.skyBot !== skyBotRgb) {
        document.documentElement.dataset.skyBot = skyBotRgb;
        document.documentElement.style.backgroundColor = skyBotRgb;
        document.body.style.backgroundColor = skyBotRgb;
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) themeMeta.setAttribute('content', skyTopRgb);
      }

      const skyGrad = ctx.createLinearGradient(0, 0, 0, viewportH);
      skyGrad.addColorStop(0, skyTopStr);
      skyGrad.addColorStop(0.54, rgbaStr(skyMid, 1));
      skyGrad.addColorStop(1, skyBotStr);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, viewportW, viewportH);

      // Soft Sunrise / Day / Sunset Solar Disc & Horizon Glow
      if (sunVis > 0.02) {
        const dayT = Math.max(0, Math.min(1, (hourFloat - 5.5) / 13.5));
        const sunX = viewportW * (0.16 + dayT * 0.68);
        const sunArc = Math.sin(dayT * Math.PI);
        const minSunY = viewportW <= 660 ? 148 : 72;
        const sunY = Math.max(minSunY, viewportH * (0.21 - sunArc * 0.08));

        if (skyGlowAlpha > 0.01) {
          const sunRadius = Math.max(viewportW, viewportH) * 0.54;
          const sunGrad = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, sunRadius);
          sunGrad.addColorStop(0, rgbaStr(skyGlow, Math.min(0.42, skyGlowAlpha * sunVis * (1 + 0.35 * sunnyWeight))));
          sunGrad.addColorStop(0.45, rgbaStr(skyGlow, skyGlowAlpha * 0.36 * sunVis));
          sunGrad.addColorStop(1, rgbaStr(skyGlow, 0));
          ctx.fillStyle = sunGrad;
          ctx.fillRect(0, 0, viewportW, viewportH);
        }

        const sunDiscVis = Math.max(0, Math.min(1, sunVis * (1 - 0.82 * rainWeight)));
        if (sunDiscVis > 0.03) {
          const sunR = Math.max(16, Math.min(25, Math.min(viewportW, viewportH) * 0.036)) * (1 + 0.1 * sunnyWeight);
          const coronaAlpha = (0.26 + 0.18 * sunnyWeight) * sunDiscVis;
          const coronaGrad = ctx.createRadialGradient(sunX, sunY, sunR * 0.45, sunX, sunY, sunR * 3.8);
          coronaGrad.addColorStop(0, `rgba(255, 240, 178, ${coronaAlpha.toFixed(3)})`);
          coronaGrad.addColorStop(0.45, rgbaStr(skyGlow, coronaAlpha * 0.45));
          coronaGrad.addColorStop(1, 'rgba(255, 224, 140, 0)');
          ctx.fillStyle = coronaGrad;
          ctx.beginPath();
          ctx.arc(sunX, sunY, sunR * 3.8, 0, Math.PI * 2);
          ctx.fill();

          if (sunnyWeight > 0.05) {
            ctx.save();
            ctx.translate(sunX, sunY);
            ctx.rotate(now * 0.00018);
            ctx.globalAlpha = 0.13 * sunnyWeight * sunDiscVis;
            ctx.strokeStyle = '#ffeaa7';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            for (let i = 0; i < 8; i++) {
              const ang = (i * Math.PI) / 4;
              ctx.beginPath();
              ctx.moveTo(Math.cos(ang) * (sunR * 1.25), Math.sin(ang) * (sunR * 1.25));
              ctx.lineTo(Math.cos(ang) * (sunR * 1.85), Math.sin(ang) * (sunR * 1.85));
              ctx.stroke();
            }
            ctx.restore();
          }

          ctx.save();
          ctx.globalAlpha = 0.94 * sunDiscVis;
          const sunCoreGrad = ctx.createRadialGradient(
            sunX - sunR * 0.22,
            sunY - sunR * 0.22,
            sunR * 0.08,
            sunX,
            sunY,
            sunR
          );
          const rimColor = lerpRgb([255, 206, 102], skyGlow, 0.35);
          sunCoreGrad.addColorStop(0, '#fffdf2');
          sunCoreGrad.addColorStop(0.6, '#ffe58f');
          sunCoreGrad.addColorStop(1, rgbaStr(rimColor, 0.96));
          ctx.fillStyle = sunCoreGrad;
          ctx.beginPath();
          ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Subtle Twinkling Stars at Night, Dusk, Dawn & Cozy Twilight
      if (starVis > 0.02) {
        ctx.save();
        skyStars.forEach(st => {
          const twinkle = 0.55 + 0.45 * Math.sin(now * 0.0014 * st.speed + st.phase);
          ctx.globalAlpha = st.alpha * twinkle * starVis;
          ctx.fillStyle = '#eef2ff';
          ctx.beginPath();
          ctx.arc(st.x * viewportW, st.y * viewportH, st.r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // Real Lunar Phase Moon Cycle
      if (moonVis > 0.03) {
        const moonInfo = getMoonPhaseInfo(nowMs);
        const nightProgress = hourFloat >= 17.5
          ? Math.min(1, (hourFloat - 17.5) / 14.5)
          : Math.min(1, (hourFloat + 6.5) / 14.5);
        const moonX = viewportW * (0.82 - nightProgress * 0.64);
        const moonArc = Math.sin(nightProgress * Math.PI);
        const minMoonY = viewportW <= 660 ? 148 : 72;
        const moonY = Math.max(minMoonY, viewportH * (0.20 - moonArc * 0.07));
        const moonR = Math.max(15, Math.min(24, Math.min(viewportW, viewportH) * 0.034));

        // Ambient moonlight halo scaled by lunar illumination
        const haloStrength = (0.14 + 0.18 * moonInfo.illumination) * moonVis;
        const haloGrad = ctx.createRadialGradient(moonX, moonY, moonR * 0.4, moonX, moonY, moonR * 4.4);
        haloGrad.addColorStop(0, `rgba(235, 240, 255, ${haloStrength.toFixed(3)})`);
        haloGrad.addColorStop(0.5, `rgba(188, 198, 255, ${(haloStrength * 0.35).toFixed(3)})`);
        haloGrad.addColorStop(1, 'rgba(188, 198, 255, 0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR * 4.4, 0, Math.PI * 2);
        ctx.fill();

        // Moon disc + accurate lunar phase terminator
        ctx.save();
        ctx.globalAlpha = 0.92 * moonVis;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(218, 226, 255, 0.14)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(238, 242, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();

        const p = moonInfo.phase;
        if (p > 0.025 && p < 0.975) {
          ctx.beginPath();
          const phi = p * Math.PI * 2;
          const rx = Math.abs(Math.cos(phi)) * moonR;
          if (p <= 0.5) {
            ctx.arc(moonX, moonY, moonR, -Math.PI / 2, Math.PI / 2, false);
            if (rx < 0.35) {
              ctx.closePath();
            } else {
              const bowRight = p < 0.25;
              ctx.ellipse(moonX, moonY, rx, moonR, 0, Math.PI / 2, -Math.PI / 2, bowRight);
              ctx.closePath();
            }
          } else {
            ctx.arc(moonX, moonY, moonR, -Math.PI / 2, Math.PI / 2, true);
            if (rx < 0.35) {
              ctx.closePath();
            } else {
              const bowRight = p < 0.75;
              ctx.ellipse(moonX, moonY, rx, moonR, 0, Math.PI / 2, -Math.PI / 2, bowRight);
              ctx.closePath();
            }
          }

          ctx.save();
          ctx.clip();
          const discGrad = ctx.createRadialGradient(
            moonX - moonR * 0.25,
            moonY - moonR * 0.25,
            moonR * 0.1,
            moonX,
            moonY,
            moonR * 1.15
          );
          discGrad.addColorStop(0, '#fffdf0');
          discGrad.addColorStop(0.75, '#f2ecd4');
          discGrad.addColorStop(1, '#d6d2c4');
          ctx.fillStyle = discGrad;
          ctx.fillRect(moonX - moonR - 2, moonY - moonR - 2, moonR * 2 + 4, moonR * 2 + 4);

          // Soft lunar maria texture
          ctx.fillStyle = 'rgba(155, 160, 178, 0.18)';
          ctx.beginPath();
          ctx.arc(moonX - moonR * 0.22, moonY - moonR * 0.14, moonR * 0.26, 0, Math.PI * 2);
          ctx.arc(moonX + moonR * 0.26, moonY + moonR * 0.2, moonR * 0.2, 0, Math.PI * 2);
          ctx.arc(moonX + moonR * 0.12, moonY - moonR * 0.32, moonR * 0.14, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }

      // 3D Soil & Bedrock Island Platform
      drawIslandBase();

      for (let gx = 0; gx < GRID_SIZE; gx++) {
        for (let gy = 0; gy < GRID_SIZE; gy++) {
          drawIsometricTile(gx, gy);
        }
      }

      drawTileGrassTufts();

      // Occupied-Tile Overlay while placing decor so open tiles are unmistakable
      if (state.isPlacingDecor) {
        const occupied = getOccupiedTileMap();
        ctx.save();
        occupied.forEach((_, key) => {
          const [gxStr, gyStr] = key.split(',');
          const ogx = Number(gxStr);
          const ogy = Number(gyStr);
          const top = gridToScreen(ogx, ogy);
          const right = gridToScreen(ogx + 1, ogy);
          const bottom = gridToScreen(ogx + 1, ogy + 1);
          const left = gridToScreen(ogx, ogy + 1);

          ctx.beginPath();
          ctx.moveTo(top.x, top.y);
          ctx.lineTo(right.x, right.y);
          ctx.lineTo(bottom.x, bottom.y);
          ctx.lineTo(left.x, left.y);
          ctx.closePath();
          ctx.fillStyle = 'rgba(255, 107, 107, 0.22)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 118, 117, 0.72)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Non-hue-only crisp diagonal cross mark inside blocked tile
          const cPos = getCenteredTilePos(ogx, ogy);
          const r = 6 * getScale();
          ctx.strokeStyle = 'rgba(255, 220, 220, 0.65)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(cPos.x - r, cPos.y - r * 0.55);
          ctx.lineTo(cPos.x + r, cPos.y + r * 0.55);
          ctx.moveTo(cPos.x + r, cPos.y - r * 0.55);
          ctx.lineTo(cPos.x - r, cPos.y + r * 0.55);
          ctx.stroke();
        });
        ctx.restore();
      }

      // Tile Tap Ripples
      for (let i = tileRipples.length - 1; i >= 0; i--) {
        const r = tileRipples[i];
        r.age += dt;
        if (r.age >= r.duration) {
          tileRipples.splice(i, 1);
          continue;
        }
        const t = r.age / r.duration;
        const pos = getCenteredTilePos(r.gx, r.gy);
        const scale = getScale();
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, (10 + t * 24) * scale, (5 + t * 12) * scale, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      const renderables: Array<{ sortY: number; draw: () => void }> = [];
      const spRender = state.starterProps || createDefaultStarterProps();
      renderables.push({ sortY: getCenteredTilePos(DOGHOUSE_TILE.gx, DOGHOUSE_TILE.gy).y, draw: drawDoghouse });
      if (spRender.showTree !== false) {
        renderables.push({ sortY: getCenteredTilePos(STARTER_TREE_TILE.gx, STARTER_TREE_TILE.gy).y, draw: drawTree });
      }

      fountainAnimPhase += dt * 4.2;

      if (state.placedDecorations) {
        state.placedDecorations.forEach(dec => {
          const centeredY = getCenteredTilePos(dec.gx, dec.gy).y;
          if (dec.type === 'tree') {
            renderables.push({
              sortY: centeredY,
              draw: () => drawCustomTree(dec.gx, dec.gy)
            });
          } else if (dec.type === 'flowers') {
            renderables.push({
              sortY: centeredY,
              draw: () => drawFlowerPatch(dec.gx, dec.gy)
            });
          } else if (dec.type === 'fountain') {
            renderables.push({
              sortY: centeredY,
              draw: () => drawWaterFountain(dec.gx, dec.gy)
            });
          } else if (dec.type === 'hydrant') {
            renderables.push({
              sortY: centeredY,
              draw: () => drawFireHydrant(dec.gx, dec.gy)
            });
          } else if (dec.type === 'slide') {
            const endY = getCenteredTilePos(dec.gx + 1, dec.gy).y;
            renderables.push({
              sortY: (centeredY + endY) * 0.5,
              draw: () => drawDogSlide(dec.gx, dec.gy)
            });
          } else if (dec.type === 'lamp') {
            renderables.push({
              sortY: centeredY,
              draw: () => drawLampPost(dec.gx, dec.gy)
            });
          } else if (dec.type === 'goldenHydrant') {
            renderables.push({
              sortY: centeredY,
              draw: () => drawGoldenFireHydrant(dec.gx, dec.gy)
            });
          }
        });
      }

      if (state.hasTennisBall) {
        renderables.push({ sortY: gridToScreen(tennisBall.gx, tennisBall.gy).y, draw: drawTennisBall });
      }
      if (state.hasFrisbee) {
        renderables.push({ sortY: gridToScreen(frisbee.gx, frisbee.gy).y, draw: drawFrisbee });
      }
      if (state.hasDuck) {
        renderables.push({ sortY: gridToScreen(duck.gx, duck.gy).y, draw: drawDuck });
      }

      mushrooms.forEach((m, idx) => {
        if (spRender.showMushrooms[idx] === false) return;
        renderables.push({
          sortY: getCenteredTilePos(m.gx, m.gy).y,
          draw: () => drawMushroomCluster(m)
        });
      });

      dogs.forEach(dog => {
        dog.update(dt);
        let dogSortY = gridToScreen(dog.gx, dog.gy).y;
        if ((dog.state === 'SLIDE_CLIMB' || dog.state === 'SLIDE_DOWN') && dog.slideTarget) {
          const y1 = getCenteredTilePos(dog.slideTarget.gx, dog.slideTarget.gy).y;
          const y2 = getCenteredTilePos(dog.slideTarget.gx + 1, dog.slideTarget.gy).y;
          dogSortY = Math.max(y1, y2) + 2;
        }
        renderables.push({
          sortY: dogSortY,
          draw: () => dog.draw(ctx)
        });
      });

      renderables.sort((a, b) => a.sortY - b.sortY);
      renderables.forEach(item => {
        if (item && typeof item.draw === 'function') {
          item.draw();
        }
      });

      const scale = getScale();

      // Gentle twilight fireflies drifting over the park (extra dense during Cozy Twilight)
      fireflies.forEach(f => {
        if (f.twilightOnly && twilightWeight <= 0.02) return;
        f.phase += dt * f.speed;
        const p = gridToScreen(f.gx + Math.sin(f.phase * 0.7) * 0.25, f.gy + Math.cos(f.phase * 0.6) * 0.25);
        const fy = p.y - (f.height + Math.sin(f.phase * 1.6) * 6) * scale;
        const baseAlpha = 0.25 + (Math.sin(f.phase * 2.4) + 1) * 0.28;
        const alpha = f.twilightOnly ? baseAlpha * twilightWeight : baseAlpha * (1 + twilightWeight * 0.35);
        ctx.save();
        ctx.globalAlpha = Math.min(0.95, alpha);
        ctx.fillStyle = f.twilightOnly ? '#a29bfe' : '#ffeaa7';
        ctx.beginPath();
        ctx.arc(p.x, fy, (f.twilightOnly ? 2.2 : 1.8) * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Weather Overlay: Sunny (warm sunbeams & floating golden dust motes)
      if (sunnyWeight > 0.01) {
        ctx.save();
        const beamGrad = ctx.createLinearGradient(0, 0, viewportW * 0.65, viewportH * 0.75);
        beamGrad.addColorStop(0, `rgba(255, 234, 167, ${0.12 * sunnyWeight})`);
        beamGrad.addColorStop(0.55, `rgba(253, 203, 110, ${0.04 * sunnyWeight})`);
        beamGrad.addColorStop(1, 'rgba(255, 234, 167, 0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(0, 0, viewportW, viewportH);

        sunMotes.forEach(m => {
          m.phase += dt * 1.4;
          m.y += m.speedY * dt;
          m.x += Math.sin(m.phase + m.drift) * 0.008 * dt;
          if (m.y < -0.05) m.y = 1.05;
          if (m.x < -0.05) m.x = 1.05;
          if (m.x > 1.05) m.x = -0.05;
          ctx.globalAlpha = (0.28 + Math.sin(m.phase * 2) * 0.16) * sunnyWeight;
          ctx.fillStyle = '#ffeaa7';
          ctx.beginPath();
          ctx.arc(m.x * viewportW, m.y * viewportH, m.r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // Weather Overlay: Windy (falling leaves & subtle breeze gusts)
      if (windyWeight > 0.01) {
        ctx.save();
        windGusts.forEach(g => {
          g.x += g.speed * dt;
          g.phase += dt * 2.2;
          if (g.x > 1.2) g.x = -0.25;
          const gx = g.x * viewportW;
          const gy = g.y * viewportH + Math.sin(g.phase) * 10;
          ctx.globalAlpha = 0.14 * windyWeight;
          ctx.strokeStyle = '#dff9fb';
          ctx.lineWidth = 1.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.quadraticCurveTo(gx + g.len * 0.5, gy - 7, gx + g.len, gy + 2);
          ctx.stroke();
        });

        windLeaves.forEach(lf => {
          lf.sway += dt * 2.5;
          lf.x += (lf.vx + Math.sin(lf.sway) * 0.025) * dt;
          lf.y += lf.vy * dt;
          lf.rot += lf.spin * dt;
          if (lf.x > 1.08) lf.x = -0.08;
          if (lf.y > 1.08) {
            lf.y = -0.08;
            lf.x = Math.random();
          }
          ctx.save();
          ctx.translate(lf.x * viewportW, lf.y * viewportH);
          ctx.rotate(lf.rot);
          ctx.globalAlpha = 0.78 * windyWeight;
          ctx.fillStyle = lf.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, lf.size, lf.size * 0.48, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
        ctx.restore();
      }

      // Weather Overlay: Gentle Rain (angled rain streaks, cool mist & grass puddle splashes)
      if (rainWeight > 0.01) {
        ctx.save();
        ctx.fillStyle = `rgba(9, 132, 227, ${0.07 * rainWeight})`;
        ctx.fillRect(0, 0, viewportW, viewportH);

        ctx.strokeStyle = 'rgba(129, 236, 236, 0.42)';
        ctx.lineWidth = 1.3;
        ctx.lineCap = 'round';
        rainDrops.forEach(drop => {
          drop.x -= drop.speed * 0.14 * dt;
          drop.y += drop.speed * dt;
          if (drop.y > 1.05) {
            drop.y = -0.05;
            drop.x = Math.random() * 1.15;
          }
          if (drop.x < -0.05) drop.x = 1.05;
          const rx = drop.x * viewportW;
          const ry = drop.y * viewportH;
          ctx.globalAlpha = 0.48 * rainWeight;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 3, ry + drop.len);
          ctx.stroke();
        });

        rainSplashes.forEach(sp => {
          sp.age += dt;
          if (sp.age >= sp.duration) {
            sp.age = 0;
            sp.gx = 0.4 + Math.random() * (GRID_SIZE - 0.8);
            sp.gy = 0.4 + Math.random() * (GRID_SIZE - 0.8);
          }
          const t = sp.age / sp.duration;
          const pos = gridToScreen(sp.gx, sp.gy);
          ctx.globalAlpha = (1 - t) * 0.45 * rainWeight;
          ctx.strokeStyle = '#81ecec';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.ellipse(pos.x, pos.y, (3 + t * 8) * scale, (1.5 + t * 4) * scale, 0, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.restore();
      }

      // Cozy Twilight subtle starlit dusk aura
      if (twilightWeight > 0.01) {
        ctx.save();
        const duskGrad = ctx.createRadialGradient(viewportW * 0.5, viewportH * 0.35, 30, viewportW * 0.5, viewportH * 0.5, Math.max(viewportW, viewportH) * 0.7);
        duskGrad.addColorStop(0, `rgba(162, 155, 254, ${0.06 * twilightWeight})`);
        duskGrad.addColorStop(1, 'rgba(13, 11, 26, 0)');
        ctx.fillStyle = duskGrad;
        ctx.fillRect(0, 0, viewportW, viewportH);
        ctx.restore();
      }

      // Subtle atmospheric skybox gradient overlay blending weather & time-of-day across the park
      ctx.save();
      const overlayGrad = ctx.createLinearGradient(0, 0, 0, viewportH);
      const topOverlayRgb = lerpRgb(skyTop, skyMid, 0.35);
      const botOverlayRgb = lerpRgb(skyBot, skyGlow, 0.25);
      const overlayTopAlpha = 0.05 + 0.05 * rainWeight + 0.04 * twilightWeight;
      const overlayBotAlpha = 0.04 + 0.05 * sunnyWeight + 0.04 * windyWeight + Math.min(0.06, skyGlowAlpha * 0.25);
      overlayGrad.addColorStop(0, rgbaStr(topOverlayRgb, overlayTopAlpha));
      overlayGrad.addColorStop(0.55, rgbaStr(skyMid, 0.02));
      overlayGrad.addColorStop(1, rgbaStr(botOverlayRgb, overlayBotAlpha));
      ctx.fillStyle = overlayGrad;
      ctx.fillRect(0, 0, viewportW, viewportH);
      ctx.restore();

      for (let i = barkPopups.length - 1; i >= 0; i--) {
        const b = barkPopups[i];
        b.age += dt;
        if (b.age >= b.duration) {
          barkPopups.splice(i, 1);
          continue;
        }

        const progress = b.age / b.duration;
        const alpha = Math.pow(1 - progress, 1.65);
        const floatUp = progress * 16;

        let bx = b.fallbackX;
        let by = b.fallbackY - floatUp;
        if (b.dog && dogs.includes(b.dog)) {
          const dPos = gridToScreen(b.dog.gx, b.dog.gy);
          bx = dPos.x + (b.dog.facingRight ? 14 : -14) * scale;
          by = dPos.y + b.baseOffsetY - floatUp;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.font = '800 12px "Outfit", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(13, 11, 26, 0.85)';
        ctx.strokeText(b.text, bx, by);
        ctx.fillStyle = '#ffeaa7';
        ctx.fillText(b.text, bx, by);
        ctx.restore();
      }

      if (holdTimer) {
        const elapsed = performance.now() - holdStartTime;
        const progress = Math.min(1, elapsed / HOLD_DURATION);
        const rect = canvas.getBoundingClientRect();
        const hx = holdPosition.x - rect.left;
        const hy = holdPosition.y - rect.top;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 234, 167, 0.9)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(hx, hy, 26, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 234, 167, 0.2)';
        ctx.beginPath();
        ctx.arc(hx, hy, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (let i = droppedBones.length - 1; i >= 0; i--) {
        const b = droppedBones[i];
        b.age += dt;

        if (b.age < 0.65) {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.vy += 320 * dt;
          if (b.y > b.groundY) {
            b.y = b.groundY;
            b.vy *= -0.4;
          }
        } else {
          const targetX = 38;
          const targetY = b.isMagic ? 74 : 32;
          b.x += (targetX - b.x) * 6 * dt;
          b.y += (targetY - b.y) * 6 * dt;

          if (Math.hypot(targetX - b.x, targetY - b.y) < 18) {
            if (b.isMagic) {
              const magicAmt = Math.max(1, Math.round(b.value || 1));
              addMagicBones(magicAmt);
              sfx.magicCollect();
              addFloatingText(targetX + 54, targetY, `+${magicAmt} ✨`, '#ffeaa7');
            } else {
              const added = addRegularBones(b.value);
              sfx.collect();
              if (added > 0) {
                const labelVal = Number.isInteger(added) ? added.toLocaleString() : added.toFixed(1);
                addFloatingText(targetX + 58, targetY, `+${labelVal}`, '#55efc4');
              }
            }
            droppedBones.splice(i, 1);
            requestSave();
            updateUI();
            continue;
          }
        }

        drawBoneSprite(b.x, b.y, b.isMagic);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (!p) continue;
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (!p.isHeart) {
          p.vy += 120 * dt;
        }

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = p.life / p.maxLife;
        if (p.isRing) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, (1 - p.life / p.maxLife) * 45, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.isHeart) {
          ctx.fillStyle = p.color;
          ctx.font = '700 13px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('♥', p.x, p.y);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.age += dt;
        if (ft.age >= ft.duration) {
          floatingTexts.splice(i, 1);
          continue;
        }
        const prog = ft.age / ft.duration;
        ctx.save();
        ctx.globalAlpha = 1 - prog;
        ctx.font = '800 13px "Outfit", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(13, 11, 26, 0.85)';
        ctx.strokeText(ft.text, ft.x, ft.y - prog * 22);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y - prog * 22);
        ctx.restore();
      }

      const rosterTab = document.getElementById('tab-roster');
      const isRosterOpen = Boolean(
        gameModal &&
        gameModal.style.display === 'flex' &&
        rosterTab &&
        rosterTab.classList.contains('active')
      );
      const isMoodPopoverOpen = Boolean(moodPopoverEl && moodPopoverEl.style.display !== 'none');
      if ((isRosterOpen || isMoodPopoverOpen) && now - lastMoodUiRefresh > 400) {
        lastMoodUiRefresh = now;
        refreshMoodHUD();
      }

      const isPointerDownInRoster = containerHasActivePointer(rosterTab);
      if (
        isRosterOpen &&
        document.activeElement?.tagName !== 'INPUT' &&
        !isPointerDownInRoster &&
        now - lastRosterUiRefresh > 900
      ) {
        lastRosterUiRefresh = now;
        renderRosterTab();
      }
    } catch (err) {
      console.error('Game loop error caught:', err);
    }

    requestAnimationFrame(loop);
  }

  updateUI();
  requestAnimationFrame(loop);
}

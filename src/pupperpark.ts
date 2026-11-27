import { drawIllustratedDog } from './dogArt';
import {
  BASE_TREASURE_CHANCE,
  BREED_BY_KEY,
  BREED_ECONOMY_VERSION,
  BREED_LIST,
  BreedTier,
  BreedTraitSpec
} from './breeds';
import { renderTreasureCanvasFrame, startAnimatedTreasureCanvas } from './treasureArt';
import {
  TREASURE_SETS,
  RARITY_META,
  MAX_RELIC_RANK,
  MAXED_TREASURE_JACKPOT_MAGIC,
  TreasureSetId,
  OfflineTreasureResult,
  TreasureBonuses,
  computeTreasureBonuses,
  createSavedPerkRecord,
  formatActiveTreasureSummary,
  formatRelicStatsAtRank,
  formatRelicUpgradePreview,
  getRankRoman,
  getRelicRank,
  getSetProgress,
  getTreasureById,
  getTreasureCounts,
  getTreasureSetById,
  isSetCompleted,
  rollSingleWeightedTreasure,
  rollWeightedTreasureOptions
} from './treasures';
import {
  ACHIEVEMENTS,
  AchievementFilter,
  CHECKIN_COOLDOWN_MS,
  DAILY_BONUS_MAGIC,
  DailyGoalMetric,
  DailyGoalsState,
  GoalSnapshot,
  createEmptyDailyGoalsState,
  formatCountdownToMidnight,
  formatGoalProgress,
  getDailyGoalsForDate,
  getLocalDateKey,
  getMsUntilLocalMidnight,
  getPreviousLocalDateKey
} from './goals';
import { MAGIC_SPARK_INLINE_SVG, getGoalIconDataUrl } from './goalIcons';
import {
  HUD_BONE_PRESETS,
  UiIconId,
  boneInlineHtml,
  drawHudStyleBone,
  hydrateStaticUiIcons,
  magicInlineHtml,
  setHtmlIfChanged,
  uiIconHtml
} from './uiIcons';
import { getDogPortraitDataUrl, hydrateStaticShopArt } from './shopArt';

export interface RosterEntry {
  id: string;
  breed: string;
  name: string;
  level: number;
  xp: number;
  bonesEarned: number;
  digsCompleted?: number;
  isFavorite: boolean;
  isShiny: boolean;
  shinyColor: string | null;
  bonusPayout: number;
  bonusScaling: number;
  bonusXp: number;
  rollGrade: string;
  rerollCount: number;
  lastPetHappinessAt?: number;
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
  | 'goldenHydrant'
  | 'doghouseManor';

export type CustomTileStyle = 'cobble' | 'sand' | 'clover';
export type TileStyle = 'grass' | CustomTileStyle;
export type ManorColorUpgradeId = 'ivory' | 'sage' | 'rose' | 'midnight';
export type ManorColorId = 'classic' | ManorColorUpgradeId;

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
  };
}

let initialized = false;

export interface InitPupperParkOptions {
  onFirstFrameRendered?: () => void;
}

export interface PupperParkHandle {
  syncRootBackground: () => void;
}

export function initPupperPark(options: InitPupperParkOptions = {}): PupperParkHandle {
  const noopHandle: PupperParkHandle = { syncRootBackground() {} };
  if (initialized) return noopHandle;
  initialized = true;
  hydrateStaticUiIcons();
  hydrateStaticShopArt();

  const canvasEl = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
  if (!canvasEl) return noopHandle;
  const canvas: HTMLCanvasElement = canvasEl;
  const ctxMaybe = canvas.getContext('2d');
  if (!ctxMaybe) return noopHandle;
  const ctx: CanvasRenderingContext2D = ctxMaybe;

  const BASE_GRID_SIZE = 7;
  const EXPANDED_GRID_SIZE = 8;
  const PARK_EXPANSION_BONE_COST = 1000000;
  const PARK_EXPANSION_MAGIC_COST = 10000;
  const BASE_TILE_W = 96;
  const BASE_TILE_H = 48;
  const MAX_DOGS = 6;
  const MAX_DOG_LEVEL = 1000;
  // Dig-count-based XP scale (independent of bone payout size so petting & play always stay meaningful)
  const BASE_DIG_XP = 10;
  const BASE_MAGIC_DIG_XP = 15;
  const BASE_PET_XP = 8;
  const BASE_SLIDE_XP = 12;
  const BASE_TOY_PLAY_XP = 6;
  const MAX_BONES = 5000000;
  const PACK_GROWTH_DUG_CAP = 250000;
  const MAX_OFFLINE_SECONDS = 604800; // 7 days
  const AWAY_MIN_SECONDS = 15;
  const RETIRE_REFUND_RATE = 0.25;
  const LEVEL_BONUS_PER_LEVEL = 0.01;
  const DIG_MULT_BASE = 1.0;
  const DIG_MULT_SQRT_SCALE = 0.0018;

  const BASE_IDLE_MULTIPLIER = 0.10;
  const DUCK_IDLE_STEP = 0.010;
  const MAX_IDLE_MULTIPLIER = 0.30;
  const MAX_TOTAL_OFFLINE_RATE = 0.75;

  const BASE_DIG_POWER = 1;
  const MAX_DIG_POWER = 15;
  const TENNIS_BALL_FLAT_GAIN = 0.5;

  const BASE_SPEED_MULTIPLIER = 1;
  const FRISBEE_SPEED_STEP = 1.03;
  const MAX_SPEED_MULTIPLIER = 1.80;

  const FRESH_BALL_COST = 45000;
  const FRESH_BALL_DURATION_MS = 30 * 60 * 1000;
  const FRESH_BALL_POWER_BONUS = 5;

  const FRESH_DUCK_COST = 60000;
  const FRESH_DUCK_DURATION_MS = 12 * 60 * 60 * 1000;
  const FRESH_DUCK_OFFLINE_BONUS = 0.10;
  const FRESH_DUCK_TREASURE_BONUS = 0.25;

  const FRESH_FRISBEE_COST = 55000;
  const FRESH_FRISBEE_DURATION_MS = 30 * 60 * 1000;
  const FRESH_FRISBEE_SPEED_BONUS = 0.25;

  const FRESH_TOY_HAPPINESS_GAIN = 8;
  const FRESH_TOY_COZY_FLOOR_BONUS = 3;

  const BASE_MAGIC_CHANCE = 0.15;
  const MAX_MAGIC_CHANCE = 0.75;

  const MIN_USER_ZOOM = 0.70;
  const MAX_USER_ZOOM = 1.95;
  const MAX_CAMERA_VELOCITY = 4.2;
  const MIN_PINCH_DIST = 26;

  // Daytime nap tuning: cozy 7-13s naps with a 35-65s real-time cooldown between sleeps
  const DAY_SLEEP_MIN_SEC = 7.0;
  const DAY_SLEEP_MAX_SEC = 13.0;
  const DAY_SLEEP_COOLDOWN_MIN_SEC = 35;
  const DAY_SLEEP_COOLDOWN_MAX_SEC = 65;

  // Overnight deep sleep window (9:00 PM - 7:00 AM local time): flat 50% chance to sleep up to 2h straight
  const NIGHT_SLEEP_START_HOUR = 21;
  const NIGHT_SLEEP_END_HOUR = 7;
  const NIGHT_SLEEP_CHANCE = 0.50;
  const NIGHT_SLEEP_MIN_MS = 35 * 60 * 1000;
  const NIGHT_SLEEP_MAX_MS = 2 * 60 * 60 * 1000;

  function isNightSleepWindow(nowMs = Date.now()): boolean {
    const h = new Date(nowMs).getHours();
    return h >= NIGHT_SLEEP_START_HOUR || h < NIGHT_SLEEP_END_HOUR;
  }

  function getMsUntilSevenAm(nowMs = Date.now()): number {
    const d = new Date(nowMs);
    const target = new Date(d);
    target.setHours(NIGHT_SLEEP_END_HOUR, 0, 0, 0);
    if (target.getTime() <= nowMs) {
      target.setDate(target.getDate() + 1);
    }
    return Math.max(0, target.getTime() - nowMs);
  }

  const BONUS_PAYOUT_MAX = 0.25;
  const BONUS_SCALING_MAX = 0.16;
  const BONUS_XP_MAX = 0.15;
  const TIMED_TREAT_MAX_STACKS = 5;

  const DOGHOUSE_TILE = { gx: 1, gy: 1 };
  const GRAND_DOGHOUSE_ANCHOR = { gx: 0, gy: 0 };
  const GRAND_DOGHOUSE_TILES: ReadonlyArray<{ gx: number; gy: number }> = [
    { gx: 0, gy: 0 },
    { gx: 1, gy: 0 },
    { gx: 0, gy: 1 },
    { gx: 1, gy: 1 }
  ];
  const WATER_BOWL_POS = { gx: 2.10, gy: 1.46 };
  const GRAND_WATER_BOWL_POS = { gx: 2.10, gy: 1.44 };
  const STARTER_TREE_TILE = { gx: 5, gy: 1 };

  const DECOR_TYPES: DecorType[] = [
    'flowers',
    'hydrant',
    'tree',
    'lamp',
    'fountain',
    'slide',
    'goldenHydrant',
    'doghouseManor'
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
      cost: 100,
      max: 5,
      tileWidth: 1,
      buyLabel: 'Buy Flowers',
      placePrompt: 'Tap an open park tile to place your flower patch!',
      ownedId: 'ownedDecorFlowers',
      countId: 'countDecorFlowers',
      buyBtnId: 'btnBuyDecorFlowers',
      placeBtnId: 'btnPlaceDecorFlowers',
      xpBonus: 0,
      magicBonus: 0.01,
      payoutBonus: 0,
      paceBonus: 0,
      cozyFloor: 0.5
    },
    hydrant: {
      cost: 200,
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
      cozyFloor: 1.0
    },
    tree: {
      cost: 300,
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
      cozyFloor: 1.0
    },
    lamp: {
      cost: 400,
      max: 4,
      tileWidth: 1,
      buyLabel: 'Buy Lamp',
      placePrompt: 'Tap an open park tile to place your warm lamp post!',
      ownedId: 'ownedDecorLamp',
      countId: 'countDecorLamp',
      buyBtnId: 'btnBuyDecorLamp',
      placeBtnId: 'btnPlaceDecorLamp',
      xpBonus: 0,
      magicBonus: 0.01,
      payoutBonus: 0.02,
      paceBonus: 0,
      cozyFloor: 1.5
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
      cozyFloor: 2.0
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
      cozyFloor: 4.0
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
      magicBonus: 0.025,
      payoutBonus: 0.10,
      paceBonus: 0.05,
      cozyFloor: 3.0
    },
    doghouseManor: {
      cost: 10000,
      max: 1,
      tileWidth: 2,
      buyLabel: 'Buy Manor',
      placePrompt: 'Upgrading doghouse to the 4-tile Grand Doghouse Manor!',
      ownedId: 'ownedDecorDoghouseManor',
      countId: 'countDecorDoghouseManor',
      buyBtnId: 'btnBuyDecorDoghouseManor',
      placeBtnId: 'btnPlaceDecorDoghouseManor',
      xpBonus: 0.10,
      magicBonus: 0.035,
      payoutBonus: 0.15,
      paceBonus: 0.08,
      cozyFloor: 6.0
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
      goldenHydrant: 0,
      doghouseManor: 0
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

  const MANOR_COLOR_COST = 200;
  const MANOR_COLOR_UPGRADES: ManorColorUpgradeId[] = ['ivory', 'sage', 'rose', 'midnight'];
  interface ManorColorPalette {
    name: string;
    foundationFill: string;
    foundationStroke: string;
    porchFill: string;
    porchStroke: string;
    stepTopFill: string;
    stepBottomFill: string;
    chimneyFill: string;
    chimneyStroke: string;
    chimneyCapFill: string;
    wingFront: [string, string, string];
    wingBack: [string, string, string];
    wallStroke: string;
    clapboardStroke: string;
    trimFill: string;
    trimWainscot: string;
    trimStroke: string;
    muntinStroke: string;
    wideRoof: [string, string, string];
    mainRoof: [string, string, string];
    roofStroke: string;
    roofShingleHighlight: string;
    pavFront: [string, string, string];
    pavBack: [string, string, string];
    gableFront: string;
    gableBack: string;
    doorFrameFill: string;
    doorFrameStroke: string;
    cushionFill: string;
    sparkleColor: string;
  }

  const MANOR_COLOR_PALETTES: Record<ManorColorId, ManorColorPalette> = {
    classic: {
      name: 'Classic',
      foundationFill: '#5c4b42',
      foundationStroke: '#3a2b22',
      porchFill: '#7c4820',
      porchStroke: '#4a280e',
      stepTopFill: '#9c602d',
      stepBottomFill: '#b4743b',
      chimneyFill: '#a44a3f',
      chimneyStroke: '#5c251f',
      chimneyCapFill: '#e7d7bf',
      wingFront: ['#a86730', '#8f5222', '#733f18'],
      wingBack: ['#7c471e', '#6b3c18', '#573012'],
      wallStroke: '#4a260c',
      clapboardStroke: 'rgba(54, 28, 10, 0.42)',
      trimFill: '#f2e5d0',
      trimWainscot: 'rgba(242, 229, 208, 0.85)',
      trimStroke: '#532c10',
      muntinStroke: '#734018',
      wideRoof: ['#5a90be', '#3b6d98', '#264a6a'],
      mainRoof: ['#6ba4d4', '#4276a4', '#2a5276'],
      roofStroke: '#1b354c',
      roofShingleHighlight: 'rgba(255, 255, 255, 0.14)',
      pavFront: ['#b77237', '#9b5a26', '#7b4319'],
      pavBack: ['#864e22', '#73411a', '#5c3313'],
      gableFront: '#945624',
      gableBack: '#77431b',
      doorFrameFill: '#f8efe0',
      doorFrameStroke: '#5c3314',
      cushionFill: '#c0392b',
      sparkleColor: '#74b9ff'
    },
    ivory: {
      name: 'Royal Ivory',
      foundationFill: '#645c6b',
      foundationStroke: '#3d3544',
      porchFill: '#7b6251',
      porchStroke: '#4c3a2e',
      stepTopFill: '#987c67',
      stepBottomFill: '#b0947d',
      chimneyFill: '#9a7a8f',
      chimneyStroke: '#543c4d',
      chimneyCapFill: '#f7f2fa',
      wingFront: ['#f6efe4', '#e8dfd0', '#d4c7b4'],
      wingBack: ['#d5cbbd', '#c3b8a8', '#ada08f'],
      wallStroke: '#7f7264',
      clapboardStroke: 'rgba(116, 102, 86, 0.3)',
      trimFill: '#ffffff',
      trimWainscot: 'rgba(255, 255, 255, 0.9)',
      trimStroke: '#6d5e72',
      muntinStroke: '#6c5a75',
      wideRoof: ['#8d66c8', '#6844a4', '#452874'],
      mainRoof: ['#a27cdc', '#754eb5', '#4e2e84'],
      roofStroke: '#2e1952',
      roofShingleHighlight: 'rgba(255, 240, 255, 0.2)',
      pavFront: ['#fbf6ee', '#efe7da', '#ddd2c1'],
      pavBack: ['#ddd3c6', '#cbc0b0', '#b5a897'],
      gableFront: '#ece3d4',
      gableBack: '#cfc4b4',
      doorFrameFill: '#ffffff',
      doorFrameStroke: '#5d4a6e',
      cushionFill: '#7c5ce7',
      sparkleColor: '#c3a6ff'
    },
    sage: {
      name: 'Forest Sage',
      foundationFill: '#565c52',
      foundationStroke: '#323830',
      porchFill: '#8b5e34',
      porchStroke: '#533519',
      stepTopFill: '#a37141',
      stepBottomFill: '#bc8854',
      chimneyFill: '#b85c3a',
      chimneyStroke: '#662d19',
      chimneyCapFill: '#f2e6cf',
      wingFront: ['#89b38d', '#6d9973', '#527a58'],
      wingBack: ['#6a8e6e', '#56785a', '#426046'],
      wallStroke: '#345039',
      clapboardStroke: 'rgba(38, 66, 44, 0.34)',
      trimFill: '#f7edd6',
      trimWainscot: 'rgba(247, 237, 214, 0.88)',
      trimStroke: '#465d44',
      muntinStroke: '#4d6649',
      wideRoof: ['#dc7d56', '#bc5c38', '#8d3e22'],
      mainRoof: ['#e98f68', '#c96741', '#9a4526'],
      roofStroke: '#632814',
      roofShingleHighlight: 'rgba(255, 235, 215, 0.18)',
      pavFront: ['#98c29c', '#7aa680', '#5d8863'],
      pavBack: ['#749978', '#608364', '#4b6b4f'],
      gableFront: '#739f79',
      gableBack: '#5a7e5f',
      doorFrameFill: '#faf2df',
      doorFrameStroke: '#475c43',
      cushionFill: '#218c54',
      sparkleColor: '#7bed9f'
    },
    rose: {
      name: 'Rose Cottage',
      foundationFill: '#5b5663',
      foundationStroke: '#37333d',
      porchFill: '#856560',
      porchStroke: '#4e3835',
      stepTopFill: '#9e7c76',
      stepBottomFill: '#b6938d',
      chimneyFill: '#875765',
      chimneyStroke: '#4c2c36',
      chimneyCapFill: '#f7ecf0',
      wingFront: ['#dd93a6', '#c5758a', '#a3566b'],
      wingBack: ['#b26f81', '#9a5b6c', '#7e4656'],
      wallStroke: '#6b3242',
      clapboardStroke: 'rgba(104, 42, 60, 0.3)',
      trimFill: '#fdf5f8',
      trimWainscot: 'rgba(253, 245, 248, 0.9)',
      trimStroke: '#643846',
      muntinStroke: '#734252',
      wideRoof: ['#6e7c90', '#505c6f', '#363f4e'],
      mainRoof: ['#808fa4', '#5c697d', '#3e4859'],
      roofStroke: '#232934',
      roofShingleHighlight: 'rgba(240, 246, 255, 0.18)',
      pavFront: ['#e8a2b4', '#d18297', '#b06378'],
      pavBack: ['#bd798b', '#a46476', '#884e5e'],
      gableFront: '#cc7c91',
      gableBack: '#a26173',
      doorFrameFill: '#fff8fa',
      doorFrameStroke: '#6b3a49',
      cushionFill: '#b83b5e',
      sparkleColor: '#ffb8cc'
    },
    midnight: {
      name: 'Midnight Gold',
      foundationFill: '#3b425c',
      foundationStroke: '#1e2336',
      porchFill: '#55413d',
      porchStroke: '#2e201e',
      stepTopFill: '#6f554f',
      stepBottomFill: '#886961',
      chimneyFill: '#4d5b82',
      chimneyStroke: '#242c44',
      chimneyCapFill: '#ffeaa7',
      wingFront: ['#445a8b', '#334672', '#233256'],
      wingBack: ['#33446c', '#263455', '#1b2640'],
      wallStroke: '#161e36',
      clapboardStroke: 'rgba(18, 25, 48, 0.45)',
      trimFill: '#fff0bf',
      trimWainscot: 'rgba(255, 240, 191, 0.88)',
      trimStroke: '#2a3554',
      muntinStroke: '#8d6516',
      wideRoof: ['#f5c957', '#d49a24', '#9a690d'],
      mainRoof: ['#ffe07d', '#e5ab2c', '#aa7410'],
      roofStroke: '#6c4706',
      roofShingleHighlight: 'rgba(255, 252, 224, 0.28)',
      pavFront: ['#4f679c', '#3b5080', '#293a62'],
      pavBack: ['#3b4f7b', '#2d3d63', '#202d4c'],
      gableFront: '#384c7a',
      gableBack: '#2a3a60',
      doorFrameFill: '#fff3cc',
      doorFrameStroke: '#734f0c',
      cushionFill: '#2980b9',
      sparkleColor: '#ffeaa7'
    }
  };

  function createDefaultUnlockedManorColors(): Record<ManorColorUpgradeId, boolean> {
    return {
      ivory: false,
      sage: false,
      rose: false,
      midnight: false
    };
  }

  const HAPPINESS_BASE_FLOOR = 30;
  const HAPPINESS_MAX = 100;
  const HAPPINESS_BASE_CAP = 80; // Starting Max Happiness with 0 decor (smoothly climbs to 100% as you place decorations)
  const HAPPINESS_ECSTATIC_DECOR_REQ = 10; // +10% Decor Floor lifts Max Happiness to 90% and unlocks Ecstatic
  const HAPPINESS_PASSIVE_PLAY_CAP = 78; // Autonomous toy/slide play lifts pack into Joyful, never passively into Ecstatic
  const HAPPINESS_MAX_FLOOR = 75;
  const HAPPINESS_TREAT_TRICKLE_PER_SEC = 0.12;
  const HAPPINESS_AWAY_CHECKIN_HOURS = 8; // Lose 1/3 of decayable happiness per 8h away (3 check-ins/day)
  const HAPPINESS_AWAY_FULL_DECAY_HOURS = HAPPINESS_AWAY_CHECKIN_HOURS * 3; // 24h to settle to Cozy Floor
  const HAPPINESS_LIVE_FULL_DECAY_HOURS = 2; // 2h of idle in-park play to cool below Ecstatic down to Cozy Floor
  const HAPPINESS_ECSTATIC_LIVE_COOL_PER_MIN = 1.2; // Base Ecstatic cooling (~8.3m 100->90, slowed up to 50% by extra decor)
  const HAPPINESS_ECSTATIC_AWAY_FULL_HOURS = 2; // Ecstatic buffer (100->90) cools over ~2h away (slowed by decor & traits)
  const WHISTLE_HAPPINESS_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes between Whistle mood boosts
  const PLAY_MOOD_COOLDOWN_MS = 15000; // 15s park-wide cooldown for autonomous toy chase & slide mood bumps
  const PET_HAPPINESS_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes per dog
  const FREE_TREAT_HAPPINESS_GAIN = 10;
  const FREE_TREAT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes between free Happy Snaps

  const TOY_CONFIG: Record<string, { baseCost: number; costMult: number; priceCap: number }> = {
    toyBones: { baseCost: 150, costMult: 1.32, priceCap: 25000 },
    toyIdle: { baseCost: 600, costMult: 1.34, priceCap: 35000 },
    toySpeed: { baseCost: 1200, costMult: 1.35, priceCap: 50000 }
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
    treatCup:   { baseCost: 1000, costMult: 1, priceCap: 1000, duration: 90, payoutBonus: 0.35 },
    treatXp:    { baseCost: 1200, costMult: 1, priceCap: 1200, duration: 60, payoutBonus: 0, xpBonus: 1.00 },
    treatKong:  { baseCost: 3000, costMult: 1, priceCap: 3000, duration: 20, payoutBonus: 0 },
    treatFeast: { baseCost: 4000, costMult: 1, priceCap: 4000, duration: 90, payoutBonus: 0.50 },
    treatBacon: { baseCost: 8500, costMult: 1, priceCap: 8500, duration: 60, payoutBonus: 0.35, paceBonus: 0.35 }
  };

  const STARTER_SHINY_ODDS = 1 / 325;
  const SPAWN_SHINY_ODDS = 1 / 650;
  const REROLL_SHINY_ODDS = 1 / 1300;
  const MANOR_REROLL_SHINY_ODDS = 1 / 916;
  const MANOR_SPAWN_SHINY_ODDS = 1 / 458;
  const SHINY_MAGIC_BONE_BONUS = 1;
  const REROLL_STEP_COST = 25;
  const SHINY_PALETTES = ['#f1c40f', '#e67e22', '#e84393', '#00cec9', '#fd79a8'];

  const PARK_BARK_MIN_COOLDOWN = 4.2;
  const PARK_BARK_MAX_COOLDOWN = 7.8;
  const DOG_BARK_MIN_COOLDOWN = 11.0;
  const DOG_BARK_MAX_COOLDOWN = 20.0;
  const BARK_TEXT_DURATION = 0.72;

  const BARK_WORDS = ['Woof!', 'Arf!', 'Bork!', 'Yip!'];

  const BREED_LABELS: Record<string, string> = Object.fromEntries(
    BREED_LIST.map(b => [b.key, b.shortLabel])
  );

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
      const basePitch = BREED_BY_KEY[breed]?.barkPitch || 430;
      const baseFreq = basePitch * (0.94 + Math.random() * 0.12);
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
    ballBounce: (pitchBoost = 0) => {
      const boost = Math.min(4, Math.max(0, pitchBoost));
      playSound(315 + boost * 52, 'sine', 0.065, 0.036);
      setTimeout(() => playSound(475 + boost * 64, 'triangle', 0.05, 0.022), 22);
    },
    frisbeeClack: (pitchBoost = 0) => {
      const boost = Math.min(4, Math.max(0, pitchBoost));
      playSound(520 + boost * 42, 'triangle', 0.05, 0.03);
      setTimeout(() => playSound(790 + boost * 55, 'sine', 0.04, 0.018), 18);
    },
    duckBonk: (pitchBoost = 0) => {
      const boost = Math.min(4, Math.max(0, pitchBoost));
      playSound(495 + boost * 35, 'sawtooth', 0.065, 0.028);
      setTimeout(() => playSound(410 + boost * 25, 'sawtooth', 0.07, 0.022), 45);
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

  const BREED_CONFIG: Record<string, BreedCfg> = Object.fromEntries(
    BREED_LIST.map(b => [
      b.key,
      {
        rank: b.rank,
        cost: b.cost,
        costMult: b.costMult,
        priceCap: b.priceCap,
        walkMult: b.walkMult,
        digSec: b.digSec,
        payoutMult: b.payoutMult,
        scalingMult: b.scalingMult,
        xpMult: b.xpMult,
        magicBonus: b.magicBonus,
        treasureChance: b.treasureChance
      }
    ])
  );

  function createInitialDogCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    Object.keys(BREED_CONFIG).forEach(b => {
      counts[b] = b === 'aussie' ? 1 : 0;
    });
    return counts;
  }

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

  function getBreedTrait(breed: string | null | undefined): BreedTraitSpec {
    const key = breed ? normalizeBreedKey(breed) : 'aussie';
    return (BREED_BY_KEY[key] || BREED_BY_KEY.aussie).trait;
  }

  interface PackTraitBonuses {
    cozyFloorAdd: number;
    moodDecayMult: number;
    offlineBonus: number;
    offlineMagicPerDay: number;
    packBoneAura: number;
    packPaceAura: number;
    packXpAura: number;
    packMagicAura: number;
    packGrowthAura: number;
    packTreasureAura: number;
  }

  function getPackTraitBonuses(): PackTraitBonuses {
    let cozyFloorAdd = 0;
    let moodDecayMult = 1;
    let offlineBonus = 0;
    let offlineMagicPerDay = 0;
    let packBoneAura = 0;
    let packPaceAura = 0;
    let packXpAura = 0;
    let packMagicAura = 0;
    let packGrowthAura = 0;
    let packTreasureAura = 0;

    if (Array.isArray(state.roster)) {
      for (const entry of state.roster) {
        const trait = getBreedTrait(entry.breed);
        if (trait.cozyFloorAdd) cozyFloorAdd += trait.cozyFloorAdd;
        if (trait.moodDecayMult) moodDecayMult *= trait.moodDecayMult;
        if (trait.offlineBonus) offlineBonus += trait.offlineBonus;
        if (trait.offlineMagicPerDay) offlineMagicPerDay += trait.offlineMagicPerDay;
        if (trait.packBoneAura) packBoneAura += trait.packBoneAura;
        if (trait.packPaceAura) packPaceAura += trait.packPaceAura;
        if (trait.packXpAura) packXpAura += trait.packXpAura;
        if (trait.packMagicAura) packMagicAura += trait.packMagicAura;
        if (trait.packGrowthAura) packGrowthAura += trait.packGrowthAura;
        if (trait.packTreasureAura) packTreasureAura += trait.packTreasureAura;
      }
    }

    return {
      cozyFloorAdd,
      moodDecayMult: Math.max(0.40, moodDecayMult),
      offlineBonus: Math.min(MAX_TOTAL_OFFLINE_RATE, offlineBonus),
      offlineMagicPerDay,
      packBoneAura: Math.min(0.80, packBoneAura),
      packPaceAura: Math.min(0.35, packPaceAura),
      packXpAura: Math.min(0.60, packXpAura),
      packMagicAura: Math.min(0.10, packMagicAura),
      packGrowthAura: Math.min(0.60, packGrowthAura),
      packTreasureAura: Math.min(1.80, packTreasureAura)
    };
  }

  function getFreshToyRemainingMs(untilTs: number, now = Date.now()): number {
    if (typeof untilTs !== 'number' || !Number.isFinite(untilTs)) return 0;
    return Math.max(0, untilTs - now);
  }

  function isFreshBallActive(now = Date.now()): boolean {
    return state.digPower >= MAX_DIG_POWER && getFreshToyRemainingMs(state.freshBallUntil, now) > 0;
  }

  function isFreshDuckActive(now = Date.now()): boolean {
    return state.idleMultiplier >= MAX_IDLE_MULTIPLIER && getFreshToyRemainingMs(state.freshDuckUntil, now) > 0;
  }

  function isFreshFrisbeeActive(now = Date.now()): boolean {
    return state.speedMultiplier >= MAX_SPEED_MULTIPLIER && getFreshToyRemainingMs(state.freshFrisbeeUntil, now) > 0;
  }

  function formatFreshRemaining(ms: number): string {
    const totalSec = Math.max(1, Math.ceil(ms / 1000));
    if (totalSec >= 3600) {
      const hrs = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
    if (totalSec >= 60) {
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      return secs > 0 && mins < 10 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${totalSec}s`;
  }

  function getEffectiveDigPower(now = Date.now()): number {
    const basePower = Math.max(BASE_DIG_POWER, Math.min(MAX_DIG_POWER, Number(state.digPower) || BASE_DIG_POWER));
    return isFreshBallActive(now) ? basePower + FRESH_BALL_POWER_BONUS : basePower;
  }

  function getEffectiveSpeedMultiplier(now = Date.now()): number {
    const baseSpeed = Math.max(
      BASE_SPEED_MULTIPLIER,
      Math.min(MAX_SPEED_MULTIPLIER, Number(state.speedMultiplier) || BASE_SPEED_MULTIPLIER)
    );
    return isFreshFrisbeeActive(now)
      ? Math.round((baseSpeed + FRESH_FRISBEE_SPEED_BONUS) * 1000) / 1000
      : baseSpeed;
  }

  function getTotalOfflineRate(now = Date.now(), freshDuckFrac?: number): number {
    const duckBase = Math.max(
      BASE_IDLE_MULTIPLIER,
      Math.min(MAX_IDLE_MULTIPLIER, Number(state.idleMultiplier) || BASE_IDLE_MULTIPLIER)
    );
    const packOfflineAdd = getPackTraitBonuses().offlineBonus;
    const baseTotal = Math.min(MAX_TOTAL_OFFLINE_RATE, Math.round((duckBase + packOfflineAdd) * 1000) / 1000);
    if (typeof freshDuckFrac === 'number') {
      const clampedFrac = Math.max(0, Math.min(1, freshDuckFrac));
      if (clampedFrac <= 0) return baseTotal;
      const boostedTotal = Math.min(
        MAX_TOTAL_OFFLINE_RATE,
        Math.round((duckBase + FRESH_DUCK_OFFLINE_BONUS + packOfflineAdd) * 1000) / 1000
      );
      return Math.round((baseTotal * (1 - clampedFrac) + boostedTotal * clampedFrac) * 10000) / 10000;
    }
    const freshAdd = isFreshDuckActive(now) ? FRESH_DUCK_OFFLINE_BONUS : 0;
    return Math.min(MAX_TOTAL_OFFLINE_RATE, Math.round((duckBase + freshAdd + packOfflineAdd) * 1000) / 1000);
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
    isClearingDecor: boolean;
    unlockedTiles: Record<CustomTileStyle, boolean>;
    tileMap: Record<string, CustomTileStyle>;
    parkExpanded: boolean;
    unlockedManorColors: Record<ManorColorUpgradeId, boolean>;
    manorColor: ManorColorId;
    isPaintingTiles: boolean;
    activeTileBrush: TileStyle;
    showNameTags: boolean;
    soundEnabled: boolean;
    ambientEnabled: boolean;
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
    treatBreakEven: { cup: number; feast: number; bacon: number };
    feastAnimTimer: number;
    hasTennisBall: boolean;
    hasFrisbee: boolean;
    hasDuck: boolean;
    freshBallUntil: number;
    freshDuckUntil: number;
    freshFrisbeeUntil: number;
    isDraftingPerk: boolean;
    packHappiness: number;
    lastWhistleBoostAt: number;
    lastFreeTreatAt: number;
    costs: Record<string, number>;
    breedEconomyVersion: number;
    startDate: number;
    activePlaySeconds: number;
    lifetimeMagicBones: number;
    totalDigsCount: number;
    totalTapsCount: number;
    totalPetsCount: number;
    totalTreatsCount: number;
    totalWhistlesCount: number;
    totalRerollsCount: number;
    totalFreshToyBoosts: number;
    totalShiniesFound: number;
    totalCheckInsCount: number;
    totalCheckInDays: number;
    lastCheckInDateKey: string;
    checkInStreak: number;
    bestCheckInStreak: number;
    totalDailyGoalsClaimed: number;
    totalDailyBonusesClaimed: number;
    uniqueBreedsOwned: string[];
    everFullPack: boolean;
    everJoyful: boolean;
    everEcstatic: boolean;
    claimedAchievements: Record<string, boolean>;
    dailyGoals: DailyGoalsState;
    lastSaveTime: number;
    [key: string]: unknown;
  }

  let state: GameState = {
    bones: 0,
    lifetimeBones: 0,
    magicBones: 0,
    nextNameIndex: 1,
    namePool: [],
    dogs: createInitialDogCounts(),
    shinyDogs: [],
    roster: [],
    perks: [],
    decorInventory: createEmptyDecorInventory(),
    placedDecorations: [],
    starterProps: createDefaultStarterProps(),
    isPlacingDecor: false,
    activeDecorType: null,
    isClearingDecor: false,
    unlockedTiles: createDefaultUnlockedTiles(),
    tileMap: {},
    parkExpanded: false,
    unlockedManorColors: createDefaultUnlockedManorColors(),
    manorColor: 'classic',
    isPaintingTiles: false,
    activeTileBrush: 'grass',
    showNameTags: true,
    soundEnabled: true,
    ambientEnabled: true,
    hasSeenHint: false,
    cameraAngle: 0,
    zoomLevel: 1,
    digPower: BASE_DIG_POWER,
    speedMultiplier: BASE_SPEED_MULTIPLIER,
    idleMultiplier: BASE_IDLE_MULTIPLIER,
    magicChance: BASE_MAGIC_CHANCE,
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
    treatBreakEven: { cup: 0, feast: 0, bacon: 0 },
    feastAnimTimer: 0,
    hasTennisBall: false,
    hasFrisbee: false,
    hasDuck: false,
    freshBallUntil: 0,
    freshDuckUntil: 0,
    freshFrisbeeUntil: 0,
    isDraftingPerk: false,
    packHappiness: HAPPINESS_BASE_FLOOR,
    lastWhistleBoostAt: 0,
    lastFreeTreatAt: 0,
    costs: {},
    breedEconomyVersion: BREED_ECONOMY_VERSION,
    startDate: Date.now(),
    activePlaySeconds: 0,
    lifetimeMagicBones: 0,
    totalDigsCount: 0,
    totalTapsCount: 0,
    totalPetsCount: 0,
    totalTreatsCount: 0,
    totalWhistlesCount: 0,
    totalRerollsCount: 0,
    totalFreshToyBoosts: 0,
    totalShiniesFound: 0,
    totalCheckInsCount: 0,
    totalCheckInDays: 0,
    lastCheckInDateKey: '',
    checkInStreak: 0,
    bestCheckInStreak: 0,
    totalDailyGoalsClaimed: 0,
    totalDailyBonusesClaimed: 0,
    uniqueBreedsOwned: [],
    everFullPack: false,
    everJoyful: false,
    everEcstatic: false,
    claimedAchievements: {},
    dailyGoals: createEmptyDailyGoalsState(),
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
      rollGrade = 'Max Roll';
    } else if (rollRatio >= 0.65) {
      rollGrade = 'Prime';
    } else if (rollRatio >= 0.35) {
      rollGrade = 'Sharp';
    }

    return { bonusPayout, bonusScaling, bonusXp, rollGrade };
  }

  function isMaxRollGrade(grade: string | undefined | null): boolean {
    if (!grade) return false;
    return grade === 'Max Roll' || grade.endsWith('Max Roll');
  }

  function formatRollGradeText(grade: string | undefined | null): string {
    if (!grade) return 'Standard';
    return isMaxRollGrade(grade) ? 'Max Roll' : grade;
  }

  function formatRollGradeHtml(grade: string | undefined | null): string {
    if (isMaxRollGrade(grade)) {
      return `${uiIconHtml('starFilled')} Max Roll`;
    }
    return formatRollGradeText(grade);
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
      digsCompleted: 0,
      isFavorite: false,
      isShiny,
      shinyColor: shinyColor || null,
      bonusPayout: rolls.bonusPayout,
      bonusScaling: rolls.bonusScaling,
      bonusXp: rolls.bonusXp,
      rollGrade: rolls.rollGrade,
      rerollCount: 0,
      lastPetHappinessAt: 0
    };
  }

  function getDogPetHappinessCooldownMs(entry: RosterEntry | null | undefined, nowMs = Date.now()): number {
    if (!entry) return 0;
    const last = typeof entry.lastPetHappinessAt === 'number' && !Number.isNaN(entry.lastPetHappinessAt)
      ? entry.lastPetHappinessAt
      : 0;
    if (last <= 0) return 0;
    return Math.max(0, PET_HAPPINESS_COOLDOWN_MS - (nowMs - last));
  }

  function getFreeTreatCooldownMs(nowMs = Date.now()): number {
    const last = typeof state.lastFreeTreatAt === 'number' && !Number.isNaN(state.lastFreeTreatAt)
      ? state.lastFreeTreatAt
      : 0;
    if (last <= 0) return 0;
    return Math.max(0, FREE_TREAT_COOLDOWN_MS - (nowMs - last));
  }

  function formatPetCooldownShort(ms: number): string {
    const totalSec = Math.max(1, Math.ceil(ms / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins > 0) {
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${secs}s`;
  }

  function formatActivePlayTime(rawSeconds: number): string {
    const totalSec = Math.max(0, Math.floor(Number(rawSeconds) || 0));
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    }
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  function getXpNeededForLevel(level: number): number {
    const l = Math.max(1, Math.floor(level));
    // Smooth dig-based progression curve (at 10 base XP per dig):
    // Lv 1: 30 XP (3 digs), Lv 10: 209 XP (~21 digs), Lv 25: 662 XP (~66 digs), Lv 50: 1,763 XP, Lv 99: 4,932 XP
    return Math.floor(30 + (l - 1) * 14 + Math.pow(l - 1, 1.75) * 1.15);
  }

  function grantDogXp(entry: RosterEntry, xpGain: number): boolean {
    if (entry.level >= MAX_DOG_LEVEL) {
      entry.level = MAX_DOG_LEVEL;
      entry.xp = 0;
      return false;
    }
    const safeGain = Math.max(1, Math.round(xpGain));
    entry.xp = (entry.xp || 0) + safeGain;
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
    return leveledUp;
  }

  function getDogLevelBonusMult(entry: RosterEntry | null | undefined): number {
    const lvl = entry && entry.level ? entry.level : 1;
    const rate = getBreedTrait(entry?.breed).levelBonusRate ?? LEVEL_BONUS_PER_LEVEL;
    return 1 + Math.max(0, lvl - 1) * rate;
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
    icon: UiIconId;
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
      icon: 'weatherSunny',
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
      icon: 'weatherWindy',
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
      icon: 'weatherRain',
      shortMod: '+3% Magic',
      modLabel: '+3% Magic Chance',
      desc: 'Soft, soothing showers boost Magic Bone odds by +3% on digs & taps.',
      digSpeedMult: 1,
      treasureMult: 1,
      magicAdd: 0.03,
      xpMult: 1
    },
    twilight: {
      id: 'twilight',
      name: 'Cozy Twilight',
      icon: 'weatherTwilight',
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

  function getTimeOfDayInfo(nowMs = Date.now()): { name: string; icon: UiIconId; hourFloat: number } {
    const h = getLocalHourFloat(nowMs);
    if (h >= 5.0 && h < 7.5) return { name: 'Sunrise', icon: 'skySunrise', hourFloat: h };
    if (h >= 7.5 && h < 11.75) return { name: 'Morning', icon: 'skyMorning', hourFloat: h };
    if (h >= 11.75 && h < 16.5) return { name: 'Afternoon', icon: 'skyAfternoon', hourFloat: h };
    if (h >= 16.5 && h < 19.0) return { name: 'Sunset', icon: 'skySunset', hourFloat: h };
    if (h >= 19.0 && h < 21.25) return { name: 'Dusk', icon: 'skyDusk', hourFloat: h };
    return { name: 'Night', icon: 'skyNight', hourFloat: h };
  }

  function getMoonPhaseInfo(nowMs = Date.now()): {
    phase: number;
    illumination: number;
    name: string;
    icon: UiIconId;
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
    let icon: UiIconId = 'moonNew';
    if (dayPhase < primaryHalfWindow || dayPhase >= 1 - primaryHalfWindow) {
      name = 'New Moon';
      icon = 'moonNew';
    } else if (dayPhase < 0.25 - primaryHalfWindow) {
      name = 'Waxing Crescent';
      icon = 'moonWaxingCrescent';
    } else if (dayPhase < 0.25 + primaryHalfWindow) {
      name = 'First Quarter';
      icon = 'moonFirstQuarter';
    } else if (dayPhase < 0.5 - primaryHalfWindow) {
      name = 'Waxing Gibbous';
      icon = 'moonWaxingGibbous';
    } else if (dayPhase < 0.5 + primaryHalfWindow) {
      name = 'Full Moon';
      icon = 'moonFull';
    } else if (dayPhase < 0.75 - primaryHalfWindow) {
      name = 'Waning Gibbous';
      icon = 'moonWaningGibbous';
    } else if (dayPhase < 0.75 + primaryHalfWindow) {
      name = 'Last Quarter';
      icon = 'moonLastQuarter';
    } else {
      name = 'Waning Crescent';
      icon = 'moonWaningCrescent';
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
    icon: UiIconId;
    boneMult: number;
    xpMult: number;
    paceMult: number;
    magicAdd: number;
    wagMult: number;
    wagAmp: number;
    shortBonus: string;
    bonusSummary: string;
  }

  function getToyFloorBreakdown(now = Date.now()): {
    ownedCount: number;
    floorBonus: number;
    freshCount: number;
    freshFloorBonus: number;
  } {
    let ownedCount = 0;
    let floorBonus = 0;
    let freshCount = 0;
    if (state.hasTennisBall) {
      ownedCount += 1;
      floorBonus += 1 + Math.min(2, Math.floor(Math.max(0, state.digPower - BASE_DIG_POWER) / 7));
      if (isFreshBallActive(now)) freshCount += 1;
    }
    if (state.hasDuck) {
      ownedCount += 1;
      floorBonus += 1 + Math.min(2, Math.floor(Math.max(0, state.idleMultiplier - BASE_IDLE_MULTIPLIER) / 0.10));
      if (isFreshDuckActive(now)) freshCount += 1;
    }
    if (state.hasFrisbee) {
      ownedCount += 1;
      floorBonus += 1 + Math.min(2, Math.floor(Math.max(0, state.speedMultiplier - BASE_SPEED_MULTIPLIER) / 0.35));
      if (isFreshFrisbeeActive(now)) freshCount += 1;
    }
    return {
      ownedCount,
      floorBonus,
      freshCount,
      freshFloorBonus: freshCount * FRESH_TOY_COZY_FLOOR_BONUS
    };
  }

  function getDecorFloorBonus(): number {
    return getDecorBonuses().cozyFloorBonus;
  }

  function getPackHappinessCap(): number {
    const rawCap = HAPPINESS_BASE_CAP + getDecorFloorBonus();
    return Math.min(HAPPINESS_MAX, Math.round(rawCap * 10) / 10);
  }

  function isEcstaticUnlocked(): boolean {
    return getPackHappinessCap() >= 90;
  }

  function getEcstaticDecorDecayMult(): number {
    const extraDecor = Math.max(0, getDecorFloorBonus() - HAPPINESS_ECSTATIC_DECOR_REQ);
    return Math.max(0.50, 1 - extraDecor * 0.025);
  }

  function getCozyFloor(now = Date.now()): number {
    const toyInfo = getToyFloorBreakdown(now);
    const decorFloor = getDecorFloorBonus();
    const treasureFloor = getPerkMultipliers().cozyFloorAdd;
    const packTraitFloor = getPackTraitBonuses().cozyFloorAdd;
    const permanentFloor = Math.min(
      HAPPINESS_MAX_FLOOR,
      HAPPINESS_BASE_FLOOR + toyInfo.floorBonus + decorFloor + treasureFloor + packTraitFloor
    );
    return Math.min(
      getPackHappinessCap(),
      Math.round((permanentFloor + toyInfo.freshFloorBonus) * 10) / 10
    );
  }

  function getHappinessTierIndex(value: number): number {
    if (Math.round(value) >= 90 && isEcstaticUnlocked()) return 3;
    if (value >= 70) return 2;
    if (value >= 50) return 1;
    return 0;
  }

  function getPackHappinessInfo(): HappinessInfo {
    const floor = getCozyFloor();
    const cap = getPackHappinessCap();
    const raw = typeof state.packHappiness === 'number' && !Number.isNaN(state.packHappiness)
      ? state.packHappiness
      : floor;
    const value = Math.max(floor, Math.min(cap, raw));
    const roundedPct = Math.round(value);

    if (roundedPct >= 90 && isEcstaticUnlocked()) {
      return {
        value,
        roundedPct,
        floor,
        tier: 'ecstatic',
        name: 'Ecstatic',
        icon: 'moodEcstatic',
        boneMult: 1.18,
        xpMult: 1.15,
        paceMult: 1.08,
        magicAdd: 0.02,
        wagMult: 1.48,
        wagAmp: 1.35,
        shortBonus: '+18%',
        bonusSummary: '+18% Bones | +15% XP | +8% Pace | +2% Magic'
      };
    }
    if (value >= 70) {
      return {
        value,
        roundedPct,
        floor,
        tier: 'joyful',
        name: 'Joyful',
        icon: 'moodJoyful',
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
        icon: 'moodHappy',
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
      icon: 'moodCozy',
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
    const cap = getPackHappinessCap();
    const prev = Math.max(floor, Math.min(cap, Number(state.packHappiness) || floor));
    const prevTier = getHappinessTierIndex(prev);
    const next = Math.max(floor, Math.min(cap, prev + delta));
    state.packHappiness = next;

    if (next >= 70) {
      state.everJoyful = true;
      recordDailyProgress('joyfulReached', 1, true);
    }
    if (next >= 90 && isEcstaticUnlocked()) {
      state.everEcstatic = true;
    }

    const nextTier = getHappinessTierIndex(next);
    if (nextTier !== prevTier) {
      updateUI();
    } else if (Math.round(next) !== Math.round(prev)) {
      refreshMoodHUD();
    }
  }

  let lastPlayMoodAt = 0;
  function awardPlayMood(baseAmount: number, traitBonus = 0): void {
    const nowMs = Date.now();
    if (nowMs - lastPlayMoodAt < PLAY_MOOD_COOLDOWN_MS) return;
    lastPlayMoodAt = nowMs;
    const floor = getCozyFloor(nowMs);
    const playCap = Math.min(HAPPINESS_PASSIVE_PLAY_CAP, getPackHappinessCap());
    const cur = Math.max(floor, Number(state.packHappiness) || floor);
    if (cur >= playCap) return;
    const gain = Math.min(baseAmount + traitBonus, playCap - cur);
    if (gain > 0) {
      addPackHappiness(gain);
    }
  }

  function getActiveXpBoostMult(): number {
    const treatMult = state.xpTreatTimer > 0
      ? 1 + (TREAT_CONFIG.treatXp.xpBonus || 1.0)
      : 1;
    const packTraits = getPackTraitBonuses();
    return treatMult * getDecorBonuses().xpMult * getCurrentWeather().xpMult * getPackHappinessInfo().xpMult * getPerkMultipliers().xpMult * (1 + packTraits.packXpAura);
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

  type BreakEvenTreatKey = 'cup' | 'feast' | 'bacon';

  function createEmptyTreatBreakEven(): Record<BreakEvenTreatKey, number> {
    return { cup: 0, feast: 0, bacon: 0 };
  }

  function isBreakEvenTreatKey(key: string): key is BreakEvenTreatKey {
    return key === 'cup' || key === 'feast' || key === 'bacon';
  }

  function getTreatTimerForBreakEven(key: BreakEvenTreatKey): number {
    if (key === 'cup') return state.pupCupTimer;
    if (key === 'feast') return state.feastTimer;
    return state.baconTimer;
  }

  function getTreatNaturalExtraForDuration(key: BreakEvenTreatKey, durationSec: number): number {
    const overrideKey = key === 'cup' ? 'cupActive' : key === 'feast' ? 'feastActive' : 'baconActive';
    const baseRate = getEstimatedPackRates({ [overrideKey]: false }).bonesPerMin;
    const buffedRate = getEstimatedPackRates({ [overrideKey]: true }).bonesPerMin;
    return Math.max(0, (buffedRate - baseRate) * (durationSec / 60));
  }

  function applyTreatBreakEvenOnDig(naturalDigBones: number): number {
    const ledger = state.treatBreakEven;
    if (!ledger) return 0;

    const activeKeys: BreakEvenTreatKey[] = (['cup', 'feast', 'bacon'] as BreakEvenTreatKey[]).filter(
      k => getTreatTimerForBreakEven(k) > 0 && (ledger[k] || 0) > 0.001
    );
    if (activeKeys.length === 0) return 0;

    const currentRates = getEstimatedPackRates();
    const withoutOverrides: { cupActive?: boolean; feastActive?: boolean; baconActive?: boolean } = {};
    activeKeys.forEach(k => {
      if (k === 'cup') withoutOverrides.cupActive = false;
      if (k === 'feast') withoutOverrides.feastActive = false;
      if (k === 'bacon') withoutOverrides.baconActive = false;
    });
    const baseWithoutBreakEven = getEstimatedPackRates(withoutOverrides).bonesPerMin;
    const combinedNaturalExtraShare = currentRates.bonesPerMin > 0
      ? Math.max(0, Math.min(0.95, (currentRates.bonesPerMin - baseWithoutBreakEven) / currentRates.bonesPerMin))
      : 0;
    const totalNaturalCredit = naturalDigBones * combinedNaturalExtraShare;

    const marginalWeights = activeKeys.map(k => {
      const overrideKey = k === 'cup' ? 'cupActive' : k === 'feast' ? 'feastActive' : 'baconActive';
      const withoutK = getEstimatedPackRates({ [overrideKey]: false }).bonesPerMin;
      return Math.max(0.01, currentRates.bonesPerMin - withoutK);
    });
    const totalWeight = marginalWeights.reduce((sum, w) => sum + w, 0) || 1;

    const regularDigsPerSec = Math.max(
      0.15,
      (currentRates.digsPerMin / 60) * (state.kongTimer > 0 ? 1 : Math.max(0.1, 1 - state.magicChance))
    );

    let totalBonus = 0;
    activeKeys.forEach((k, idx) => {
      let rem = ledger[k] || 0;
      if (rem <= 0.001) return;

      const naturalCredit = totalNaturalCredit * (marginalWeights[idx] / totalWeight);
      rem = Math.max(0, rem - naturalCredit);

      if (rem > 0.001) {
        const timeLeft = Math.max(0.5, getTreatTimerForBreakEven(k));
        const estRemainingDigs = Math.max(1, regularDigsPerSec * timeLeft);
        const rawTopUp = Math.min(rem, rem / estRemainingDigs);
        const roundedTopUp = Math.min(rem, Math.max(0.1, Math.round(rawTopUp * 10) / 10));
        rem = Math.max(0, rem - roundedTopUp);
        totalBonus += roundedTopUp;
      }

      ledger[k] = rem > 0.001 ? rem : 0;
    });

    return Math.round(totalBonus * 10) / 10;
  }

  function creditManualTapBreakEven(tapBones: number): void {
    const ledger = state.treatBreakEven;
    if (!ledger || state.pupCupTimer <= 0 || (ledger.cup || 0) <= 0.001) return;
    const cupShare = TREAT_CONFIG.treatCup.payoutBonus / (1 + TREAT_CONFIG.treatCup.payoutBonus);
    const next = Math.max(0, ledger.cup - tapBones * cupShare);
    ledger.cup = next > 0.001 ? next : 0;
  }

  function settleExpiredTreatBreakEven(key: BreakEvenTreatKey): void {
    const ledger = state.treatBreakEven;
    if (!ledger) return;
    const residual = ledger[key] || 0;
    ledger[key] = 0;
    if (residual > 0.05) {
      addRegularBones(Math.round(residual * 10) / 10);
    }
  }

  const tennisBall: {
    gx: number;
    gy: number;
    targetGx: number;
    targetGy: number;
    vx: number;
    vy: number;
    z: number;
    vz: number;
    spinAngle: number;
    squash: number;
    isRolling: boolean;
    timer: number;
    bouncePhase: number;
    passChainCount: number;
    ricochetCount: number;
    soundCooldown: number;
    chaserRedirectCooldown: number;
    kickerGrace: number;
    kicker: Dog | null;
    chaser: Dog | null;
  } = {
    gx: 3.5,
    gy: 3.5,
    targetGx: 3.5,
    targetGy: 3.5,
    vx: 0,
    vy: 0,
    z: 0,
    vz: 0,
    spinAngle: 0,
    squash: 0,
    isRolling: false,
    timer: 6.0,
    bouncePhase: 0,
    passChainCount: 0,
    ricochetCount: 0,
    soundCooldown: 0,
    chaserRedirectCooldown: 0,
    kickerGrace: 0,
    kicker: null,
    chaser: null
  };
  const frisbee: {
    gx: number;
    gy: number;
    targetGx: number;
    targetGy: number;
    vx: number;
    vy: number;
    z: number;
    vz: number;
    spinAngle: number;
    tilt: number;
    wobble: number;
    wobblePhase: number;
    curveRate: number;
    isMoving: boolean;
    timer: number;
    ricochetCount: number;
    soundCooldown: number;
    chaserRedirectCooldown: number;
    kickerGrace: number;
    kicker: Dog | null;
    chaser: Dog | null;
  } = {
    gx: 2.0,
    gy: 5.0,
    targetGx: 2.0,
    targetGy: 5.0,
    vx: 0,
    vy: 0,
    z: 0,
    vz: 0,
    spinAngle: 0,
    tilt: 0,
    wobble: 0,
    wobblePhase: 0,
    curveRate: 0,
    isMoving: false,
    timer: 7.5,
    ricochetCount: 0,
    soundCooldown: 0,
    chaserRedirectCooldown: 0,
    kickerGrace: 0,
    kicker: null,
    chaser: null
  };
  const duck: {
    gx: number;
    gy: number;
    targetGx: number;
    targetGy: number;
    vx: number;
    vy: number;
    z: number;
    vz: number;
    squash: number;
    wobble: number;
    facingRight: boolean;
    isMoved: boolean;
    timer: number;
    quackPhase: number;
    ricochetCount: number;
    soundCooldown: number;
    chaserRedirectCooldown: number;
    kickerGrace: number;
    kicker: Dog | null;
    chaser: Dog | null;
  } = {
    gx: 5.0,
    gy: 5.0,
    targetGx: 5.0,
    targetGy: 5.0,
    vx: 0,
    vy: 0,
    z: 0,
    vz: 0,
    squash: 0,
    wobble: 0,
    facingRight: true,
    isMoved: false,
    timer: 5.5,
    quackPhase: 0,
    ricochetCount: 0,
    soundCooldown: 0,
    chaserRedirectCooldown: 0,
    kickerGrace: 0,
    kicker: null,
    chaser: null
  };

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

  type FloatingTextIcon = 'bone' | 'magic' | 'heart' | 'spark';

  const floatingTexts: Array<{
    x: number;
    y: number;
    text: string;
    color: string;
    age: number;
    duration: number;
    align?: CanvasTextAlign;
    icon?: FloatingTextIcon;
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

  function getGridSize(): number {
    return state.parkExpanded ? EXPANDED_GRID_SIZE : BASE_GRID_SIZE;
  }

  const rainSplashes = Array.from({ length: 12 }, () => ({
    gx: 0.4 + Math.random() * (getGridSize() - 0.8),
    gy: 0.4 + Math.random() * (getGridSize() - 0.8),
    age: Math.random() * 0.7,
    duration: 0.55 + Math.random() * 0.25
  }));

  interface AwayProgressSummary {
    actualEarned: number;
    actualMagicEarned: number;
    estimatedDigs: number;
    foundTreasures: OfflineTreasureResult[];
    moodBefore?: number;
    moodAfter?: number;
  }

  let pendingRetireDogId: string | null = null;
  let pendingRerollDogId: string | null = null;
  let queuedAwayProgress: AwayProgressSummary | null = null;
  let activeOfflineModalSummary: AwayProgressSummary | null = null;
  let hasLoadedGame = false;
  let loadedFromExistingSave = false;
  let hasSettledInitialReturn = false;
  let isSettlingAwayProgress = false;
  let lastReturnHandledAt = 0;

  function addFloatingText(
    x: number,
    y: number,
    text: string,
    color = '#ffeaa7',
    align: CanvasTextAlign = 'center',
    icon?: FloatingTextIcon
  ): void {
    floatingTexts.push({ x, y, text, color, age: 0, duration: 0.85, align, icon });
    if (floatingTexts.length > 24) {
      floatingTexts.shift();
    }
  }

  function getCurrencyPillAnchor(isMagic: boolean): { flyX: number; flyY: number; textX: number; textY: number } {
    const pillEl = document.getElementById(isMagic ? 'magicCurrencyPill' : 'boneCurrencyPill');
    if (pillEl) {
      const pillRect = pillEl.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      if (pillRect.width > 0 && pillRect.height > 0) {
        const centerY = pillRect.top - canvasRect.top + pillRect.height * 0.5;
        return {
          flyX: pillRect.left - canvasRect.left + Math.min(24, pillRect.width * 0.3),
          flyY: centerY,
          textX: Math.min(viewportW - 56, pillRect.right - canvasRect.left + 10),
          textY: centerY + 4
        };
      }
    }
    return {
      flyX: 38,
      flyY: isMagic ? 74 : 32,
      textX: isMagic ? 116 : 196,
      textY: isMagic ? 78 : 36
    };
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

  function ensureCurrentDailyGoals(nowMs: number = Date.now()): DailyGoalsState {
    const todayKey = getLocalDateKey(nowMs);
    if (!state.dailyGoals || typeof state.dailyGoals !== 'object' || state.dailyGoals.dateKey !== todayKey) {
      state.dailyGoals = createEmptyDailyGoalsState(todayKey);
      if (state.packHappiness >= 70) {
        state.dailyGoals.progress.joyfulReached = 1;
      }
    } else {
      if (!state.dailyGoals.progress || typeof state.dailyGoals.progress !== 'object') {
        state.dailyGoals.progress = {};
      }
      if (!state.dailyGoals.claimed || typeof state.dailyGoals.claimed !== 'object') {
        state.dailyGoals.claimed = {};
      }
      state.dailyGoals.bonusClaimed = Boolean(state.dailyGoals.bonusClaimed);
      if (typeof state.dailyGoals.lastCheckInAt !== 'number' || !Number.isFinite(state.dailyGoals.lastCheckInAt)) {
        state.dailyGoals.lastCheckInAt = 0;
      }
    }
    return state.dailyGoals;
  }

  function recordDailyProgress(metric: DailyGoalMetric, amount: number, isMaxValue = false): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const dg = ensureCurrentDailyGoals();
    const prev = Number(dg.progress[metric]) || 0;
    dg.progress[metric] = isMaxValue ? Math.max(prev, amount) : prev + amount;
  }

  function recordCheckInIfEligible(nowMs: number = Date.now()): boolean {
    const dg = ensureCurrentDailyGoals(nowMs);
    const todayKey = dg.dateKey;
    const prevCheckIns = Math.max(0, Math.floor(Number(dg.progress.checkIns) || 0));
    const lastAt = Number(dg.lastCheckInAt) || 0;
    const isFirstToday = prevCheckIns === 0;
    const isCooldownElapsed = lastAt > 0 && nowMs - lastAt >= CHECKIN_COOLDOWN_MS;
    if (!isFirstToday && !isCooldownElapsed) {
      return false;
    }

    if (isFirstToday && state.lastCheckInDateKey !== todayKey) {
      const yesterdayKey = getPreviousLocalDateKey(nowMs);
      if (state.lastCheckInDateKey === yesterdayKey) {
        state.checkInStreak = Math.max(1, (Number(state.checkInStreak) || 0) + 1);
      } else {
        state.checkInStreak = 1;
      }
      state.bestCheckInStreak = Math.max(Number(state.bestCheckInStreak) || 0, state.checkInStreak);
      state.totalCheckInDays = Math.max(Number(state.totalCheckInDays) || 0, 0) + 1;
      state.lastCheckInDateKey = todayKey;
    }

    dg.progress.checkIns = prevCheckIns + 1;
    dg.lastCheckInAt = nowMs;
    state.totalCheckInsCount = Math.max(0, Number(state.totalCheckInsCount) || 0) + 1;
    return true;
  }

  function recordOwnedBreed(rawBreed: string): void {
    const key = normalizeBreedKey(rawBreed);
    if (!Array.isArray(state.uniqueBreedsOwned)) {
      state.uniqueBreedsOwned = [];
    }
    if (!state.uniqueBreedsOwned.includes(key)) {
      state.uniqueBreedsOwned.push(key);
    }
  }

  function addRegularBones(rawAmount: number, countForDaily = true): number {
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
    if (countForDaily && added > 0) {
      recordDailyProgress('bonesEarned', added);
    }

    if (state.bones >= MAX_BONES) {
      state.bones = MAX_BONES;
      triggerBoneCapMessageOnce();
    }

    return added;
  }

  function addMagicBones(rawAmount: number, fromDigOrTap = false): number {
    const amount = Math.max(0, Number(rawAmount) || 0);
    if (amount <= 0) return 0;
    if (typeof state.lifetimeBones !== 'number' || Number.isNaN(state.lifetimeBones)) {
      state.lifetimeBones = 0;
    }
    if (typeof state.lifetimeMagicBones !== 'number' || Number.isNaN(state.lifetimeMagicBones)) {
      state.lifetimeMagicBones = 0;
    }
    state.magicBones = (Number(state.magicBones) || 0) + amount;
    state.lifetimeBones += amount;
    state.lifetimeMagicBones += amount;
    if (fromDigOrTap) {
      recordDailyProgress('magicDigs', amount);
    }
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

  function getPerkMultipliers(): TreasureBonuses {
    return computeTreasureBonuses(state.perks);
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
    const packTraits = getPackTraitBonuses();
    return dugSum * (1 + packTraits.packGrowthAura);
  }

  function getDigMultiplier(overrides?: { feastActive?: boolean; baconActive?: boolean; speedMultOverride?: number }): number {
    const dugSum = getPackGrowthBonus();
    const { boneMult, workBonus } = getPerkMultipliers();
    const treatDigMult = getActiveFeastAndBaconMult(overrides?.feastActive, overrides?.baconActive);
    const decorMult = getDecorBonuses().payoutMult;
    const moodBoneMult = getPackHappinessInfo().boneMult;
    const packTraits = getPackTraitBonuses();
    const effectiveSpeed = typeof overrides?.speedMultOverride === 'number'
      ? overrides.speedMultOverride
      : getEffectiveSpeedMultiplier();
    return (DIG_MULT_BASE + dugSum) * effectiveSpeed * treatDigMult * workBonus * boneMult * decorMult * moodBoneMult * (1 + packTraits.packBoneAura);
  }

  function getAverageBonesPerDig(overrides?: { digPowerOverride?: number; speedMultOverride?: number }): number {
    const effectiveDigPower = typeof overrides?.digPowerOverride === 'number'
      ? overrides.digPowerOverride
      : getEffectiveDigPower();
    if (!state.roster || state.roster.length === 0) return effectiveDigPower;
    const cupMult = getActiveCupMult();
    const packDigMult = getDigMultiplier({ speedMultOverride: overrides?.speedMultOverride });
    const weather = getCurrentWeather();
    const moodInfo = getPackHappinessInfo();
    const anyTreatActive = getActiveTreatTypeCount() > 0;
    const isHighMood = moodInfo.tier === 'joyful' || moodInfo.tier === 'ecstatic';

    let total = 0;
    state.roster.forEach(entry => {
      const stats = getEffectiveBreedStats(entry);
      const levelMult = getDogLevelBonusMult(entry);
      const trait = getBreedTrait(entry.breed);
      let personalBoneMult = 1;
      if (anyTreatActive && trait.treatBoneBonus) {
        personalBoneMult *= 1 + trait.treatBoneBonus;
      }
      if (isHighMood && trait.happyMoodBoneBonus) {
        personalBoneMult *= 1 + trait.happyMoodBoneBonus;
      }
      if (trait.weatherAffinity && trait.weatherAffinity.weather === weather.id && trait.weatherAffinity.boneBonus) {
        personalBoneMult *= 1 + trait.weatherAffinity.boneBonus;
      }
      if (trait.luckyDigChance && trait.luckyDigMult && trait.luckyDigMult > 1) {
        personalBoneMult *= 1 + trait.luckyDigChance * (trait.luckyDigMult - 1);
      }
      const raw = effectiveDigPower * stats.boneYield * levelMult * cupMult * packDigMult * personalBoneMult;
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
    const anyTreatActive =
      (typeof overrides?.cupActive === 'boolean' ? overrides.cupActive : state.pupCupTimer > 0) ||
      (typeof overrides?.feastActive === 'boolean' ? overrides.feastActive : state.feastTimer > 0) ||
      (typeof overrides?.baconActive === 'boolean' ? overrides.baconActive : state.baconTimer > 0) ||
      kongActive ||
      state.xpTreatTimer > 0;
    const { workBonus, magicBonus, paceMult: treasurePaceMult } = getPerkMultipliers();
    const decorBonuses = getDecorBonuses();
    const decorMagic = decorBonuses.magicAdd;
    const weather = getCurrentWeather();
    const moodInfo = getPackHappinessInfo();
    const isHighMood = moodInfo.tier === 'joyful' || moodInfo.tier === 'ecstatic';
    const packTraits = getPackTraitBonuses();

    const baseVisualPace =
      Math.min(1.6, 1 + Math.log1p(Math.max(0, workBonus - 1)) * 0.25) *
      weather.digSpeedMult *
      moodInfo.paceMult *
      baconPaceMult *
      decorBonuses.paceMult *
      treasurePaceMult *
      (1 + packTraits.packPaceAura);

    const digChance = anyTreatActive ? 0.62 : 0.42;
    const strollsPerDig = (1 - digChance) / digChance;
    const avgWalkDist = 0.54 * (getGridSize() - 1.24);
    const packCount = state.roster.length;
    const hasSlide = (state.placedDecorations || []).some(d => d.type === 'slide');
    const slideAvail = 1 / Math.max(1, 1 + (packCount - 1) * 0.12);
    const waterSources = 1 + (state.placedDecorations || []).filter(d => d.type === 'fountain').length;
    const drinkAvail = Math.min(1, waterSources / Math.max(1, packCount * 0.22));
    const pDrink = 0.10 * drinkAvail;
    const avgNapCooldownSec = (DAY_SLEEP_COOLDOWN_MIN_SEC + DAY_SLEEP_COOLDOWN_MAX_SEC) * 0.5;

    let bonesPerMin = 0;
    let magicPerHour = 0;
    let totalDigsPerMin = 0;
    state.roster.forEach(entry => {
      const stats = getEffectiveBreedStats(entry);
      const levelMult = getDogLevelBonusMult(entry);
      const trait = getBreedTrait(entry.breed);
      const weatherMatch = trait.weatherAffinity && trait.weatherAffinity.weather === weather.id
        ? trait.weatherAffinity
        : null;

      const walkMult = Math.max(0.5, stats.walkMult || 1.1);
      const digRateMult = 1 + (trait.digSpeedBonus || 0) + (anyTreatActive ? (trait.treatDigSpeedBonus || 0) : 0);
      const baseDogVisualPace = baseVisualPace * (1 + (weatherMatch?.paceBonus || 0));
      const napChance = Math.max(0.02, Math.min(0.32, 0.14 * (trait.napChanceMult ?? 1)));
      const avgNapSec = ((DAY_SLEEP_MIN_SEC + DAY_SLEEP_MAX_SEC) * 0.5 * (trait.napDurationMult ?? 1)) / baconPaceMult;
      const drinkBoostSec = 18 * (trait.drinkBoostDurationMult ?? 1);

      const calcCore = (vPace: number, effNapPerRoll: number) => {
        const pExit = Math.max(0.25, 0.64 - effNapPerRoll);
        const preWalkRestSec =
          (0.20 / pExit) * (4.85 + 1.45 / vPace) +
          (0.16 / pExit) * (5.90 + 1.60 / vPace);
        const postStrollSec =
          0.35 * (4.85 + 1.45 / vPace) +
          0.20 * (5.90 + 1.60 / vPace) +
          0.45 * (2.30 / vPace);
        const avgWalkSec = avgWalkDist / (walkMult * vPace);
        const baseDigSec = (stats.digSec || 1.5) / (vPace * digRateMult);
        const avgDigSec = trait.quickBurrowEvery && trait.quickBurrowEvery > 1
          ? (baseDigSec * (trait.quickBurrowEvery - 1) + 0.25) / trait.quickBurrowEvery
          : baseDigSec;
        const digBranchSec = avgWalkSec + avgDigSec + 2.0 / vPace + preWalkRestSec;
        const strollBranchSec = avgWalkSec + postStrollSec + preWalkRestSec;
        const activeDigCycleSec = digBranchSec + strollsPerDig * strollBranchSec;
        const avgDecisionGapSec = activeDigCycleSec / (1 + strollsPerDig);
        const avgIdleRollGapSec = avgDecisionGapSec * pExit;
        return { preWalkRestSec, avgWalkSec, activeDigCycleSec, avgDecisionGapSec, avgIdleRollGapSec };
      };

      // Pass 1: estimate hydration uptime & effective daytime nap probability per idle roll
      const p1 = calcCore(baseDogVisualPace, 0.05);
      const drinkAction1 = p1.avgWalkSec + 2.55 + 0.65 / baseDogVisualPace + p1.preWalkRestSec;
      const drinkWaitDecisions = 1 / Math.max(0.01, pDrink) - 0.5;
      const drinkCycle1 = 70 + drinkWaitDecisions * p1.avgDecisionGapSec + drinkAction1;
      const hydratedShare = Math.min(0.45, drinkBoostSec / Math.max(1, drinkCycle1));
      const dogVisualPace = baseDogVisualPace * (1 + 0.18 * hydratedShare);

      const napAction1 = avgNapSec + 1.70 / dogVisualPace;
      const napWaitRolls = 1 / Math.max(0.01, napChance * (1 - hydratedShare)) - 0.5;
      const napCycle1 = avgNapCooldownSec + napWaitRolls * p1.avgIdleRollGapSec + napAction1;
      const rollsPerNapCycle = Math.max(1, (napCycle1 - napAction1) / Math.max(0.5, p1.avgIdleRollGapSec));
      const effNapPerRoll = Math.min(0.22, 1 / rollsPerNapCycle);

      // Pass 2: compute exact steady-state cycle including strolls, sit/lay, naps, drinks & slide
      const p2 = calcCore(dogVisualPace, effNapPerRoll);
      const drinkActionSec = p2.avgWalkSec + 2.55 + 0.65 / dogVisualPace + p2.preWalkRestSec;
      const avgDrinkCycleSec = 70 + drinkWaitDecisions * p2.avgDecisionGapSec + drinkActionSec;
      const drinkTimeShare = Math.min(0.18, drinkActionSec / Math.max(1, avgDrinkCycleSec));

      const slideActionSec = p2.avgWalkSec + 1.40 + 1.15 / dogVisualPace + p2.preWalkRestSec;
      const slideWaitDecisions = 1 / Math.max(0.01, 0.32 * slideAvail) - 0.5;
      const avgSlideCycleSec = 20 + slideWaitDecisions * p2.avgDecisionGapSec + slideActionSec;
      const slideTimeShare = hasSlide ? Math.min(0.26, slideActionSec / Math.max(1, avgSlideCycleSec)) : 0;

      const napActionSec = avgNapSec + 1.70 / dogVisualPace;
      const avgNapCycleSec = avgNapCooldownSec + napWaitRolls * p2.avgIdleRollGapSec + napActionSec;
      const napTimeShare = Math.min(0.32, napActionSec / Math.max(1, avgNapCycleSec));

      const nonDigTimeShare = Math.min(0.68, drinkTimeShare + slideTimeShare + napTimeShare);
      const cycleSec = p2.activeDigCycleSec / Math.max(0.25, 1 - nonDigTimeShare);
      const digsPerMin = 60 / Math.max(0.5, cycleSec);
      totalDigsPerMin += digsPerMin;

      const magicChanceTotal = Math.min(
        MAX_MAGIC_CHANCE,
        state.magicChance +
          magicBonus +
          decorMagic +
          weather.magicAdd +
          moodInfo.magicAdd +
          packTraits.packMagicAura +
          (weatherMatch?.magicAdd || 0) +
          (stats.magicBonus || 0)
      );
      const regularShare = kongActive ? 1 : Math.max(0, 1 - magicChanceTotal);

      let personalBoneMult = 1;
      if (anyTreatActive && trait.treatBoneBonus) {
        personalBoneMult *= 1 + trait.treatBoneBonus;
      }
      if (isHighMood && trait.happyMoodBoneBonus) {
        personalBoneMult *= 1 + trait.happyMoodBoneBonus;
      }
      if (weatherMatch?.boneBonus) {
        personalBoneMult *= 1 + weatherMatch.boneBonus;
      }
      if (trait.digStreakStep && trait.digStreakMax) {
        const maxStacks = Math.max(1, Math.round(trait.digStreakMax / trait.digStreakStep));
        const awakeNapSec = Math.max(cycleSec, avgNapCycleSec - avgNapSec);
        const expectedRegDigsPerNap = Math.max(1, (awakeNapSec / Math.max(0.5, cycleSec)) * regularShare);
        const avgStacks = expectedRegDigsPerNap <= maxStacks + 1
          ? (expectedRegDigsPerNap - 1) * 0.5
          : (maxStacks * (maxStacks + 1) * 0.5 + (expectedRegDigsPerNap - maxStacks - 1) * maxStacks) / expectedRegDigsPerNap;
        personalBoneMult *= 1 + Math.max(0, avgStacks) * trait.digStreakStep;
      }
      if (trait.luckyDigChance && trait.luckyDigMult && trait.luckyDigMult > 1) {
        personalBoneMult *= 1 + trait.luckyDigChance * (trait.luckyDigMult - 1);
      }

      const rawBones = getEffectiveDigPower() * stats.boneYield * levelMult * cupMult * packDigMult * personalBoneMult;
      const bonesPerRegularDig = Math.max(1, Math.round(rawBones * 10) / 10);

      const magicPerDrop = 1 + (entry.isShiny ? SHINY_MAGIC_BONE_BONUS : 0);
      const extraMagicRate = trait.extraMagicChance || 0;
      if (kongActive) {
        bonesPerMin += digsPerMin * bonesPerRegularDig;
        magicPerHour += digsPerMin * 60 * (magicPerDrop + extraMagicRate);
      } else {
        bonesPerMin += digsPerMin * regularShare * bonesPerRegularDig;
        magicPerHour += digsPerMin * 60 * (magicChanceTotal * magicPerDrop + regularShare * extraMagicRate);
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

  function rollOfflineTreasure(): OfflineTreasureResult | null {
    const result = rollSingleWeightedTreasure(state.perks);
    if (result.kind === 'jackpot') {
      state.magicBones += result.magicBones;
      return result;
    }
    state.perks.push(createSavedPerkRecord(result.def, result.newRank));
    return result;
  }

  function isModalCurrentlyOpen(modalId: string): boolean {
    const el = document.getElementById(modalId);
    if (!el) return false;
    const styleDisplay = el.style.display;
    if (styleDisplay && styleDisplay !== 'none') return true;
    return window.getComputedStyle(el).display !== 'none';
  }

  function mergeAwayProgressSummary(
    target: AwayProgressSummary,
    incoming: AwayProgressSummary
  ): AwayProgressSummary {
    return {
      actualEarned: target.actualEarned + incoming.actualEarned,
      actualMagicEarned: (target.actualMagicEarned || 0) + (incoming.actualMagicEarned || 0),
      estimatedDigs: target.estimatedDigs + incoming.estimatedDigs,
      foundTreasures: [...target.foundTreasures, ...incoming.foundTreasures],
      moodBefore: typeof target.moodBefore === 'number' ? target.moodBefore : incoming.moodBefore,
      moodAfter: typeof incoming.moodAfter === 'number' ? incoming.moodAfter : target.moodAfter
    };
  }

  function flushQueuedAwayProgressIfReady(): void {
    if (!queuedAwayProgress) return;
    if (state.isDraftingPerk || isModalCurrentlyOpen('perkModal')) {
      return;
    }
    const pending = queuedAwayProgress;
    queuedAwayProgress = null;
    updateUI();
    if (activeOfflineModalSummary || isModalCurrentlyOpen('offlineModal')) {
      activeOfflineModalSummary = activeOfflineModalSummary
        ? mergeAwayProgressSummary(activeOfflineModalSummary, pending)
        : pending;
      showOfflineModal(activeOfflineModalSummary);
    } else {
      showOfflineModal(pending);
    }
  }

  function settleAwayProgressSinceLastSave(now = Date.now()): boolean {
    if (isSettlingAwayProgress) {
      return false;
    }

    if (typeof state.lastSaveTime !== 'number' || Number.isNaN(state.lastSaveTime)) {
      state.lastSaveTime = now;
      saveGameAt(now);
      return false;
    }

    const rawElapsedSeconds = (now - state.lastSaveTime) / 1000;
    if (rawElapsedSeconds <= AWAY_MIN_SECONDS) {
      if (now > state.lastSaveTime) {
        state.lastSaveTime = now;
      }
      return false;
    }

    isSettlingAwayProgress = true;
    try {
      const prevSaveTime = state.lastSaveTime;
      // Advance timestamp immediately so overlapping return events cannot settle the same span twice
      state.lastSaveTime = now;

      const effectiveSeconds = Math.min(rawElapsedSeconds, MAX_OFFLINE_SECONDS);
      const awaySpanMs = Math.max(1, effectiveSeconds * 1000);
      const getAwayFreshOverlapFrac = (isMaxed: boolean, untilTs: number): number => {
        if (!isMaxed || typeof untilTs !== 'number' || !Number.isFinite(untilTs) || untilTs <= prevSaveTime) {
          return 0;
        }
        const overlapMs = Math.max(0, Math.min(awaySpanMs, untilTs - prevSaveTime));
        return Math.max(0, Math.min(1, overlapMs / awaySpanMs));
      };
      const freshBallFrac = getAwayFreshOverlapFrac(state.digPower >= MAX_DIG_POWER, state.freshBallUntil);
      const freshFrisbeeFrac = getAwayFreshOverlapFrac(state.speedMultiplier >= MAX_SPEED_MULTIPLIER, state.freshFrisbeeUntil);
      const freshDuckFrac = getAwayFreshOverlapFrac(state.idleMultiplier >= MAX_IDLE_MULTIPLIER, state.freshDuckUntil);

      if (state.freshBallUntil > 0 && state.freshBallUntil <= now) state.freshBallUntil = 0;
      if (state.freshDuckUntil > 0 && state.freshDuckUntil <= now) state.freshDuckUntil = 0;
      if (state.freshFrisbeeUntil > 0 && state.freshFrisbeeUntil <= now) state.freshFrisbeeUntil = 0;

      const packTraits = getPackTraitBonuses();
      const cozyFloor = getCozyFloor();
      const moodCap = getPackHappinessCap();
      const currentMood = typeof state.packHappiness === 'number' && !Number.isNaN(state.packHappiness)
        ? Math.max(cozyFloor, Math.min(moodCap, state.packHappiness))
        : cozyFloor;
      let nextMood = currentMood;
      let remAwaySec = rawElapsedSeconds;
      // Ecstatic zone (90-100) cools faster while away so maintaining Ecstatic feels earned
      if (nextMood > 90 && remAwaySec > 0) {
        const ecstaticCoolPerSec =
          (10 / (HAPPINESS_ECSTATIC_AWAY_FULL_HOURS * 3600)) *
          getEcstaticDecorDecayMult() *
          packTraits.moodDecayMult;
        const above90 = nextMood - 90;
        const secToReach90 = ecstaticCoolPerSec > 0 ? above90 / ecstaticCoolPerSec : Infinity;
        if (remAwaySec >= secToReach90) {
          nextMood = 90;
          remAwaySec -= secToReach90;
        } else {
          nextMood = Math.max(90, nextMood - ecstaticCoolPerSec * remAwaySec);
          remAwaySec = 0;
        }
      }
      // Below Ecstatic: gentle 24h away settle toward Cozy Floor
      if (nextMood > cozyFloor && remAwaySec > 0) {
        const decayableSpan = Math.max(0, 90 - cozyFloor);
        const awayFraction = Math.min(1, remAwaySec / (HAPPINESS_AWAY_FULL_DECAY_HOURS * 3600));
        const awayDrop = decayableSpan * awayFraction * packTraits.moodDecayMult;
        nextMood = Math.max(cozyFloor, nextMood - awayDrop);
      }
      state.packHappiness = Math.max(cozyFloor, Math.min(moodCap, nextMood));

      const estimatedDigs = estimateOfflineDigs(effectiveSeconds);
      const awayDigPower = state.digPower + FRESH_BALL_POWER_BONUS * freshBallFrac;
      const awaySpeedMult = state.speedMultiplier + FRESH_FRISBEE_SPEED_BONUS * freshFrisbeeFrac;
      const avgPerDig = getAverageBonesPerDig({
        digPowerOverride: awayDigPower,
        speedMultOverride: awaySpeedMult
      });
      const effectiveOfflineRate = getTotalOfflineRate(now, freshDuckFrac);
      const earned = Math.floor(estimatedDigs * avgPerDig * effectiveOfflineRate);

      const rawMagicEarned = packTraits.offlineMagicPerDay > 0
        ? Math.floor(packTraits.offlineMagicPerDay * (effectiveSeconds / 86400))
        : 0;

      const freshDuckTreasureMult = 1 + FRESH_DUCK_TREASURE_BONUS * freshDuckFrac;
      const offlineTreasureChance = Math.min(
        0.08 * freshDuckTreasureMult,
        (0.002 + estimatedDigs * 0.0000015) *
          getPerkMultipliers().treasureOddsMult *
          (1 + packTraits.packTreasureAura) *
          freshDuckTreasureMult
      );
      const foundTreasure = Math.random() < offlineTreasureChance ? rollOfflineTreasure() : null;

      const displayedBonesBefore = Math.floor(Math.max(0, Number(state.bones) || 0));
      const rawBonesAdded = earned > 0 ? addRegularBones(earned, false) : 0;
      const actualEarned = rawBonesAdded > 0
        ? Math.max(1, Math.floor(Math.max(0, Number(state.bones) || 0)) - displayedBonesBefore)
        : 0;
      const actualMagicEarned = rawMagicEarned > 0 ? addMagicBones(rawMagicEarned, false) : 0;
      const moodBeforeRounded = Math.round(currentMood);
      const moodAfterRounded = Math.round(nextMood);

      // Persist immediately so awarded rewards and the updated lastSaveTime commit atomically
      saveGameAt(now);

      if (actualEarned > 0 || actualMagicEarned > 0 || foundTreasure) {
        const incoming: AwayProgressSummary = {
          actualEarned,
          actualMagicEarned,
          estimatedDigs,
          foundTreasures: foundTreasure ? [foundTreasure] : [],
          moodBefore: moodBeforeRounded,
          moodAfter: moodAfterRounded
        };

        updateUI();
        if (activeOfflineModalSummary || isModalCurrentlyOpen('offlineModal')) {
          activeOfflineModalSummary = activeOfflineModalSummary
            ? mergeAwayProgressSummary(activeOfflineModalSummary, incoming)
            : incoming;
          showOfflineModal(activeOfflineModalSummary);
        } else if (state.isDraftingPerk || isModalCurrentlyOpen('perkModal')) {
          queuedAwayProgress = queuedAwayProgress
            ? mergeAwayProgressSummary(queuedAwayProgress, incoming)
            : incoming;
        } else {
          showOfflineModal(incoming);
        }
        return true;
      }

      if (moodAfterRounded !== moodBeforeRounded) {
        updateUI();
      }

      return false;
    } finally {
      isSettlingAwayProgress = false;
    }
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

  function isGrandDoghouseTile(gx: number, gy: number): boolean {
    return gx >= 0 && gx <= 1 && gy >= 0 && gy <= 1;
  }

  function hasGrandDoghousePlaced(): boolean {
    return Array.isArray(state.placedDecorations) && state.placedDecorations.some(d => d.type === 'doghouseManor');
  }

  function getEffectiveRerollShinyOdds(): number {
    return hasGrandDoghousePlaced() ? MANOR_REROLL_SHINY_ODDS : REROLL_SHINY_ODDS;
  }

  function formatRerollShinyOddsLabel(odds = getEffectiveRerollShinyOdds()): string {
    const denom = Math.max(1, Math.round(1 / odds));
    return `1-in-${denom.toLocaleString()}`;
  }

  function getEffectiveSpawnShinyOdds(): number {
    return hasGrandDoghousePlaced() ? MANOR_SPAWN_SHINY_ODDS : SPAWN_SHINY_ODDS;
  }

  function getWaterBowlPos(): { gx: number; gy: number } {
    return hasGrandDoghousePlaced() ? GRAND_WATER_BOWL_POS : WATER_BOWL_POS;
  }

  function getDecorFootprint(type: DecorType, gx: number, gy: number): Array<{ gx: number; gy: number }> {
    if (type === 'doghouseManor') {
      return GRAND_DOGHOUSE_TILES.map(t => ({ gx: t.gx, gy: t.gy }));
    }
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
    const gridSize = getGridSize();
    const tx = clampTileIndex(rawGx);
    const ty = clampTileIndex(rawGy);
    if (rawGx < 0 || rawGx >= gridSize || rawGy < 0 || rawGy >= gridSize) {
      return { ok: false, gx: tx, gy: ty, reason: 'Tap a tile inside your park!' };
    }
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
    if (tx <= gridSize - width) {
      candidates.push(tx);
    }
    if (tx - 1 >= 0 && tx - 1 <= gridSize - width) {
      candidates.push(tx - 1);
    }

    for (const anchorX of candidates) {
      const footprint = getDecorFootprint(type, anchorX, ty);
      const fits = footprint.every(
        t => t.gx >= 0 && t.gx < gridSize && t.gy >= 0 && t.gy < gridSize && !occupied.has(`${t.gx},${t.gy}`)
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
  function rebuildTileDetails(): void {
    tileDetails.length = 0;
    const gridSize = getGridSize();
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
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
  }
  rebuildTileDetails();

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
  type WorldTreatKind = 'free' | 'cup' | 'xp' | 'kong' | 'feast' | 'bacon';

  interface WorldTreat {
    id: number;
    kind: WorldTreatKind;
    ownerRosterId: string;
    gx: number;
    gy: number;
    height: number;
    vz: number;
    bounced: boolean;
    landed: boolean;
    eatDuration: number;
    eatElapsed: number;
    beingEaten: boolean;
    consumed: boolean;
    age: number;
    rot: number;
  }

  const WORLD_TREAT_CONFIG: Record<WorldTreatKind, { minSec: number; maxSec: number; crumbs: readonly string[] }> = {
    free: { minSec: 1.8, maxSec: 2.5, crumbs: ['#ffe4a8', '#e59b42', '#ff9ff3'] },
    bacon: { minSec: 2.3, maxSec: 3.1, crumbs: ['#d9483b', '#ffe5c2', '#ff9f68'] },
    cup: { minSec: 2.6, maxSec: 3.5, crumbs: ['#ffffff', '#ece7ff', '#74b9ff'] },
    xp: { minSec: 2.7, maxSec: 3.6, crumbs: ['#ffe4a8', '#a29bfe', '#81ecec'] },
    feast: { minSec: 3.3, maxSec: 4.3, crumbs: ['#e3634b', '#9c2c1d', '#ffeaa7'] },
    kong: { minSec: 3.6, maxSec: 4.6, crumbs: ['#ffe082', '#e69f38', '#ff6b6b'] }
  };

  const worldTreats: WorldTreat[] = [];
  let nextWorldTreatId = 1;

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
    invalidateNavCache();
    dogs.length = 0;
    worldTreats.length = 0;
    state.roster.forEach(entry => {
      let spawnPos = pushOutsideAllObstacles(
        1.5 + Math.random() * 4,
        1.5 + Math.random() * 4,
        0.12
      );
      const gridSize = getGridSize();
      for (let attempt = 0; attempt < 16; attempt++) {
        const candidate = pushOutsideAllObstacles(
          0.8 + Math.random() * (gridSize - 1.6),
          0.8 + Math.random() * (gridSize - 1.6),
          0.12
        );
        const clearOfDogs = dogs.every(other => Math.hypot(other.gx - candidate.gx, other.gy - candidate.gy) >= 0.58);
        if (!isPointBlockedByObstacle(candidate.gx, candidate.gy, 0.08) && clearOfDogs) {
          spawnPos = candidate;
          break;
        }
      }
      dogs.push(new Dog(
        spawnPos.gx,
        spawnPos.gy,
        entry.id,
        entry.breed,
        Boolean(entry.isShiny),
        entry.shinyColor || null
      ));
    });
  }

  function loadGame(): void {
    const saved = localStorage.getItem('pupperpark_save');
    let migratedBreedEconomy = false;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
        state.magicChance = BASE_MAGIC_CHANCE;
        if (typeof state.lifetimeBones !== 'number' || Number.isNaN(state.lifetimeBones)) {
          state.lifetimeBones = Math.max(0, state.bones || 0);
        }
        if (typeof state.boneCapEverShown !== 'boolean') {
          state.boneCapEverShown = Boolean(state.boneCapReachedNotified);
        }
        if (typeof state.boneCapReachedNotified !== 'boolean') {
          state.boneCapReachedNotified = state.boneCapEverShown || (state.bones || 0) >= MAX_BONES;
        } else if ((state.bones || 0) < MAX_BONES) {
          state.boneCapReachedNotified = false;
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
        state.zoomLevel = Math.max(MIN_USER_ZOOM, Math.min(MAX_USER_ZOOM, state.zoomLevel));
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
        const rawBreakEven = (state.treatBreakEven && typeof state.treatBreakEven === 'object')
          ? state.treatBreakEven as Record<string, unknown>
          : {};
        state.treatBreakEven = {
          cup: state.pupCupTimer > 0 && Number.isFinite(Number(rawBreakEven.cup)) && Number(rawBreakEven.cup) > 0 ? Number(rawBreakEven.cup) : 0,
          feast: state.feastTimer > 0 && Number.isFinite(Number(rawBreakEven.feast)) && Number(rawBreakEven.feast) > 0 ? Number(rawBreakEven.feast) : 0,
          bacon: state.baconTimer > 0 && Number.isFinite(Number(rawBreakEven.bacon)) && Number(rawBreakEven.bacon) > 0 ? Number(rawBreakEven.bacon) : 0
        };
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
        state.parkExpanded = Boolean(parsed.parkExpanded);
        const activeGridSize = getGridSize();
        state.decorInventory = mergedDecorInv;
        if (!Array.isArray(state.placedDecorations)) {
          state.placedDecorations = [];
        } else {
          state.placedDecorations = state.placedDecorations.filter((d): d is PlacedDecor => {
            if (!d || typeof d.type !== 'string' || !(d.type in DECOR_CONFIG)) return false;
            if (d.type === 'doghouseManor') return true;
            if (!Number.isInteger(d.gx) || !Number.isInteger(d.gy)) return false;
            const footprint = getDecorFootprint(d.type, d.gx, d.gy);
            return footprint.every(
              t => t.gx >= 0 && t.gx < activeGridSize && t.gy >= 0 && t.gy < activeGridSize
            );
          });
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
              gx >= 0 && gx < activeGridSize && gy >= 0 && gy < activeGridSize &&
              (val === 'cobble' || val === 'sand' || val === 'clover')
            ) {
              cleanTileMap[`${gx},${gy}`] = val;
            }
          });
        }
        state.tileMap = cleanTileMap;
        const rawManorColors = (state.unlockedManorColors && typeof state.unlockedManorColors === 'object')
          ? state.unlockedManorColors as Partial<Record<ManorColorUpgradeId, unknown>>
          : {};
        state.unlockedManorColors = {
          ivory: Boolean(rawManorColors.ivory),
          sage: Boolean(rawManorColors.sage),
          rose: Boolean(rawManorColors.rose),
          midnight: Boolean(rawManorColors.midnight)
        };
        const rawActiveManorColor = state.manorColor;
        if (
          rawActiveManorColor === 'classic' ||
          (
            (rawActiveManorColor === 'ivory' || rawActiveManorColor === 'sage' || rawActiveManorColor === 'rose' || rawActiveManorColor === 'midnight') &&
            state.unlockedManorColors[rawActiveManorColor]
          )
        ) {
          state.manorColor = rawActiveManorColor;
        } else {
          state.manorColor = 'classic';
        }
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
        state.freshBallUntil =
          typeof state.freshBallUntil === 'number' && Number.isFinite(state.freshBallUntil) && state.freshBallUntil > 0
            ? state.freshBallUntil
            : 0;
        state.freshDuckUntil =
          typeof state.freshDuckUntil === 'number' && Number.isFinite(state.freshDuckUntil) && state.freshDuckUntil > 0
            ? state.freshDuckUntil
            : 0;
        state.freshFrisbeeUntil =
          typeof state.freshFrisbeeUntil === 'number' && Number.isFinite(state.freshFrisbeeUntil) && state.freshFrisbeeUntil > 0
            ? state.freshFrisbeeUntil
            : 0;
        state.isDraftingPerk = false;
        state.isPlacingDecor = false;
        state.activeDecorType = null;
        state.isClearingDecor = false;
        state.isPaintingTiles = false;
        state.activeTileBrush = 'grass';
        if (typeof parsed.packHappiness !== 'number' || Number.isNaN(parsed.packHappiness)) {
          state.packHappiness = getCozyFloor();
        } else {
          state.packHappiness = Math.max(getCozyFloor(), Math.min(getPackHappinessCap(), parsed.packHappiness));
        }
        if (typeof state.lastWhistleBoostAt !== 'number' || Number.isNaN(state.lastWhistleBoostAt)) {
          state.lastWhistleBoostAt = 0;
        }
        if (typeof state.lastFreeTreatAt !== 'number' || Number.isNaN(state.lastFreeTreatAt)) {
          state.lastFreeTreatAt = 0;
        }
        if (typeof parsed.startDate !== 'number' || !Number.isFinite(parsed.startDate) || parsed.startDate <= 0) {
          state.startDate = typeof parsed.lastSaveTime === 'number' && Number.isFinite(parsed.lastSaveTime) && parsed.lastSaveTime > 0
            ? parsed.lastSaveTime
            : Date.now();
        } else {
          state.startDate = parsed.startDate;
        }
        if (typeof parsed.activePlaySeconds !== 'number' || !Number.isFinite(parsed.activePlaySeconds) || parsed.activePlaySeconds < 0) {
          state.activePlaySeconds = 0;
        } else {
          state.activePlaySeconds = parsed.activePlaySeconds;
        }
        const currentShinyCount = Array.isArray(state.roster) ? state.roster.filter(e => e && e.isShiny).length : 0;
        const rosterDigSum = Array.isArray(state.roster)
          ? state.roster.reduce((sum, e) => sum + (Number(e?.digsCompleted) || 0), 0)
          : 0;
        const rosterRerollSum = Array.isArray(state.roster)
          ? state.roster.reduce((sum, e) => sum + (Number(e?.rerollCount) || 0), 0)
          : 0;
        state.lifetimeMagicBones =
          typeof parsed.lifetimeMagicBones === 'number' && Number.isFinite(parsed.lifetimeMagicBones) && parsed.lifetimeMagicBones >= 0
            ? Math.max(parsed.lifetimeMagicBones, Math.max(0, Number(state.magicBones) || 0))
            : Math.max(0, Number(state.magicBones) || 0);
        state.totalDigsCount =
          typeof parsed.totalDigsCount === 'number' && Number.isFinite(parsed.totalDigsCount) && parsed.totalDigsCount >= 0
            ? Math.max(parsed.totalDigsCount, rosterDigSum)
            : rosterDigSum;
        state.totalTapsCount =
          typeof parsed.totalTapsCount === 'number' && Number.isFinite(parsed.totalTapsCount) && parsed.totalTapsCount >= 0
            ? parsed.totalTapsCount
            : 0;
        state.totalPetsCount =
          typeof parsed.totalPetsCount === 'number' && Number.isFinite(parsed.totalPetsCount) && parsed.totalPetsCount >= 0
            ? parsed.totalPetsCount
            : 0;
        state.totalTreatsCount =
          typeof parsed.totalTreatsCount === 'number' && Number.isFinite(parsed.totalTreatsCount) && parsed.totalTreatsCount >= 0
            ? parsed.totalTreatsCount
            : 0;
        state.totalWhistlesCount =
          typeof parsed.totalWhistlesCount === 'number' && Number.isFinite(parsed.totalWhistlesCount) && parsed.totalWhistlesCount >= 0
            ? parsed.totalWhistlesCount
            : 0;
        state.totalRerollsCount =
          typeof parsed.totalRerollsCount === 'number' && Number.isFinite(parsed.totalRerollsCount) && parsed.totalRerollsCount >= 0
            ? Math.max(parsed.totalRerollsCount, rosterRerollSum)
            : rosterRerollSum;
        state.totalFreshToyBoosts =
          typeof parsed.totalFreshToyBoosts === 'number' && Number.isFinite(parsed.totalFreshToyBoosts) && parsed.totalFreshToyBoosts >= 0
            ? parsed.totalFreshToyBoosts
            : 0;
        state.totalShiniesFound =
          typeof parsed.totalShiniesFound === 'number' && Number.isFinite(parsed.totalShiniesFound) && parsed.totalShiniesFound >= 0
            ? Math.max(parsed.totalShiniesFound, currentShinyCount)
            : currentShinyCount;
        state.totalCheckInsCount =
          typeof parsed.totalCheckInsCount === 'number' && Number.isFinite(parsed.totalCheckInsCount) && parsed.totalCheckInsCount >= 0
            ? parsed.totalCheckInsCount
            : 0;
        state.totalCheckInDays =
          typeof parsed.totalCheckInDays === 'number' && Number.isFinite(parsed.totalCheckInDays) && parsed.totalCheckInDays >= 0
            ? parsed.totalCheckInDays
            : 0;
        state.lastCheckInDateKey = typeof parsed.lastCheckInDateKey === 'string' ? parsed.lastCheckInDateKey : '';
        state.checkInStreak =
          typeof parsed.checkInStreak === 'number' && Number.isFinite(parsed.checkInStreak) && parsed.checkInStreak >= 0
            ? parsed.checkInStreak
            : 0;
        state.bestCheckInStreak =
          typeof parsed.bestCheckInStreak === 'number' && Number.isFinite(parsed.bestCheckInStreak) && parsed.bestCheckInStreak >= 0
            ? Math.max(parsed.bestCheckInStreak, state.checkInStreak)
            : state.checkInStreak;
        state.totalDailyGoalsClaimed =
          typeof parsed.totalDailyGoalsClaimed === 'number' && Number.isFinite(parsed.totalDailyGoalsClaimed) && parsed.totalDailyGoalsClaimed >= 0
            ? parsed.totalDailyGoalsClaimed
            : 0;
        state.totalDailyBonusesClaimed =
          typeof parsed.totalDailyBonusesClaimed === 'number' && Number.isFinite(parsed.totalDailyBonusesClaimed) && parsed.totalDailyBonusesClaimed >= 0
            ? parsed.totalDailyBonusesClaimed
            : 0;
        const ownedBreedsSet = new Set<string>();
        if (Array.isArray(parsed.uniqueBreedsOwned)) {
          parsed.uniqueBreedsOwned.forEach((b: unknown) => {
            if (typeof b === 'string' && b.trim()) {
              ownedBreedsSet.add(normalizeBreedKey(b));
            }
          });
        }
        if (Array.isArray(state.roster)) {
          state.roster.forEach(e => {
            if (e && e.breed) ownedBreedsSet.add(normalizeBreedKey(e.breed));
          });
        }
        state.uniqueBreedsOwned = Array.from(ownedBreedsSet);
        state.everFullPack = Boolean(parsed.everFullPack) || (Array.isArray(state.roster) && state.roster.length >= MAX_DOGS);
        state.everJoyful = Boolean(parsed.everJoyful) || state.packHappiness >= 70;
        state.everEcstatic = Boolean(parsed.everEcstatic) || (state.packHappiness >= 90 && isEcstaticUnlocked());
        const cleanClaimedAch: Record<string, boolean> = {};
        if (parsed.claimedAchievements && typeof parsed.claimedAchievements === 'object') {
          Object.entries(parsed.claimedAchievements as Record<string, unknown>).forEach(([k, v]) => {
            if (v === true) cleanClaimedAch[k] = true;
          });
        }
        state.claimedAchievements = cleanClaimedAch;
        const rawDaily = parsed.dailyGoals as Partial<DailyGoalsState> | undefined;
        const todayKey = getLocalDateKey();
        if (rawDaily && typeof rawDaily === 'object' && rawDaily.dateKey === todayKey) {
          const cleanProgress: Record<string, number> = {};
          if (rawDaily.progress && typeof rawDaily.progress === 'object') {
            Object.entries(rawDaily.progress).forEach(([k, v]) => {
              const num = Number(v);
              if (Number.isFinite(num) && num > 0) cleanProgress[k] = num;
            });
          }
          const cleanDailyClaimed: Record<string, boolean> = {};
          if (rawDaily.claimed && typeof rawDaily.claimed === 'object') {
            Object.entries(rawDaily.claimed).forEach(([k, v]) => {
              if (v === true) cleanDailyClaimed[k] = true;
            });
          }
          state.dailyGoals = {
            dateKey: todayKey,
            progress: cleanProgress,
            claimed: cleanDailyClaimed,
            bonusClaimed: Boolean(rawDaily.bonusClaimed),
            lastCheckInAt:
              typeof rawDaily.lastCheckInAt === 'number' && Number.isFinite(rawDaily.lastCheckInAt) && rawDaily.lastCheckInAt > 0
                ? rawDaily.lastCheckInAt
                : 0
          };
        } else {
          state.dailyGoals = createEmptyDailyGoalsState(todayKey);
        }
        if (state.packHappiness >= 70) {
          state.dailyGoals.progress.joyfulReached = 1;
        }
        if (!state.dogs) state.dogs = {};
        if (!state.costs) state.costs = {};
        const rawEconomyVersion = typeof parsed.breedEconomyVersion === 'number' && !Number.isNaN(parsed.breedEconomyVersion)
          ? parsed.breedEconomyVersion
          : 1;
        const shouldResetBreedCosts = rawEconomyVersion < BREED_ECONOMY_VERSION;
        if (shouldResetBreedCosts) {
          migratedBreedEconomy = true;
          if ((state.bones || 0) < MAX_BONES) {
            state.boneCapEverShown = false;
            state.boneCapReachedNotified = false;
          }
        }
        state.breedEconomyVersion = BREED_ECONOMY_VERSION;
        Object.keys(BREED_CONFIG).forEach(b => {
          if (state.dogs[b] === undefined) state.dogs[b] = 0;
          if (shouldResetBreedCosts || !state.costs[b]) {
            state.costs[b] = BREED_CONFIG[b].cost;
          } else {
            state.costs[b] = Math.min(BREED_CONFIG[b].priceCap, state.costs[b]);
          }
        });
        Object.keys(TOY_CONFIG).forEach(t => {
          if (!state.costs[t]) state.costs[t] = TOY_CONFIG[t].baseCost;
          else state.costs[t] = Math.max(TOY_CONFIG[t].baseCost, Math.min(TOY_CONFIG[t].priceCap, state.costs[t]));
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
      if (entry.level >= MAX_DOG_LEVEL) {
        entry.level = MAX_DOG_LEVEL;
        entry.xp = 0;
      } else {
        if (typeof entry.xp !== 'number' || Number.isNaN(entry.xp) || entry.xp < 0) entry.xp = 0;
        const maxCarryXp = Math.max(0, getXpNeededForLevel(entry.level) - 1);
        if (entry.xp > maxCarryXp) entry.xp = maxCarryXp;
      }
      if (typeof entry.bonesEarned !== 'number' || Number.isNaN(entry.bonesEarned) || entry.bonesEarned < 0) entry.bonesEarned = 0;
      if (typeof entry.digsCompleted !== 'number' || Number.isNaN(entry.digsCompleted) || entry.digsCompleted < 0) entry.digsCompleted = 0;
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
      if (typeof entry.lastPetHappinessAt !== 'number' || Number.isNaN(entry.lastPetHappinessAt) || entry.lastPetHappinessAt < 0) {
        entry.lastPetHappinessAt = 0;
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

    if (!Array.isArray(state.uniqueBreedsOwned)) {
      state.uniqueBreedsOwned = [];
    }
    state.roster.forEach(entry => {
      if (entry && entry.breed) recordOwnedBreed(entry.breed);
    });

    rebuildTileDetails();
    syncBreedCountsFromRoster();
    rebuildCanvasDogsFromRoster();
    resize(true);

    hasLoadedGame = true;
    loadedFromExistingSave = Boolean(saved);
    if (!document.hidden) {
      handleReturnToGame(Date.now());
    }
    if (migratedBreedEconomy) {
      requestSave();
    }
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
    if (!hasLoadedGame || !hasSettledInitialReturn || document.hidden || isSettlingAwayProgress) {
      return;
    }
    const now = Date.now();
    if (
      typeof state.lastSaveTime === 'number' &&
      !Number.isNaN(state.lastSaveTime) &&
      (now - state.lastSaveTime) / 1000 > AWAY_MIN_SECONDS
    ) {
      handleReturnToGame(now);
      return;
    }
    state.cameraAngle = cameraAngle;
    state.zoomLevel = userZoom;
    state.lastSaveTime = now;
    const elapsed = now - lastWrittenSaveAt;
    if (elapsed >= SAVE_COOLDOWN_MS) {
      saveGameAt(now);
    } else if (!pendingSaveTimeout) {
      pendingSaveTimeout = setTimeout(() => {
        pendingSaveTimeout = null;
        if (!hasLoadedGame || !hasSettledInitialReturn || document.hidden || isSettlingAwayProgress) {
          return;
        }
        saveGame();
      }, SAVE_COOLDOWN_MS - elapsed);
    }
  }

  function handleLeaveGame(now = Date.now()): void {
    if (!hasLoadedGame || !hasSettledInitialReturn || isSettlingAwayProgress) {
      return;
    }
    saveGameAt(now);
  }

  function handleReturnToGame(now = Date.now()): void {
    if (!hasLoadedGame || document.hidden || isSettlingAwayProgress) {
      return;
    }

    // Deduplicate overlapping lifecycle events (load, visibilitychange, pageshow)
    // firing within the same return session.
    if (hasSettledInitialReturn && now - lastReturnHandledAt < 500) {
      return;
    }
    lastReturnHandledAt = now;

    lastTime = performance.now();
    if (!masterMuted && (state.soundEnabled || state.ambientEnabled) && audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => updateAmbientBed()).catch(() => {});
    } else {
      updateAmbientBed();
    }

    const recordedCheckIn = recordCheckInIfEligible(now);

    if (!hasSettledInitialReturn && !loadedFromExistingSave) {
      state.lastSaveTime = now;
      hasSettledInitialReturn = true;
      refreshGoalBadges();
      saveGameAt(now);
      return;
    }

    const settled = settleAwayProgressSinceLastSave(now);
    hasSettledInitialReturn = true;
    if (recordedCheckIn) {
      refreshGoalBadges();
    }
    if (!settled) {
      saveGameAt(now);
    }
  }

  setInterval(() => {
    if (!hasLoadedGame || document.hidden || isSettlingAwayProgress) {
      return;
    }
    const now = Date.now();
    if (!hasSettledInitialReturn) {
      handleReturnToGame(now);
      return;
    }
    if (
      typeof state.lastSaveTime === 'number' &&
      !Number.isNaN(state.lastSaveTime) &&
      (now - state.lastSaveTime) / 1000 > AWAY_MIN_SECONDS
    ) {
      handleReturnToGame(now);
      return;
    }
    saveGameAt(now);
  }, 10000);

  let lastTime = performance.now();

  const isAppleTouchDevice =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalonePwa =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    (typeof window.matchMedia === 'function' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches
    ));
  document.documentElement.classList.toggle('ios-device', isAppleTouchDevice);
  document.documentElement.classList.toggle('pwa-standalone', isStandalonePwa);

  const iosTopEdgeCapEl = document.getElementById('iosTopEdgeCap');
  if (isAppleTouchDevice && isStandalonePwa && iosTopEdgeCapEl) {
    const flushIosTopEdgeCap = (): void => {
      window.requestAnimationFrame(() => {
        void iosTopEdgeCapEl.offsetHeight;
      });
    };
    window.addEventListener('load', flushIosTopEdgeCap, { once: true });
    window.addEventListener('pageshow', flushIosTopEdgeCap);
  }

  const pwaSnapshotCoverEl = document.getElementById('pwaSnapshotCover');
  let pwaResumeTimer: number | null = null;

  function showPwaSnapshotCover(): void {
    if (!isStandalonePwa || !pwaSnapshotCoverEl) return;
    if (isSplashOverlayOpaque()) return;
    if (pwaResumeTimer !== null) {
      window.clearTimeout(pwaResumeTimer);
      pwaResumeTimer = null;
    }
    const root = document.documentElement;
    root.classList.remove('pwa-resuming');
    root.classList.add('pwa-backgrounded');
    syncRootBackgroundColor();
    // Force a synchronous layout/style flush so iOS WebKit paints the dark branded
    // cover before capturing its Home Screen app snapshot.
    void pwaSnapshotCoverEl.offsetHeight;
  }

  function hidePwaSnapshotCover(): void {
    const root = document.documentElement;
    if (!root.classList.contains('pwa-backgrounded') && !root.classList.contains('pwa-resuming')) {
      return;
    }
    if (pwaResumeTimer !== null) {
      window.clearTimeout(pwaResumeTimer);
      pwaResumeTimer = null;
    }
    root.classList.remove('pwa-backgrounded');
    root.classList.add('pwa-resuming');
    syncRootBackgroundColor();
    pwaResumeTimer = window.setTimeout(() => {
      pwaResumeTimer = null;
      root.classList.remove('pwa-resuming');
    }, 180);
  }

  document.addEventListener('visibilitychange', () => {
    const now = Date.now();
    if (document.hidden) {
      showPwaSnapshotCover();
      updateAmbientBed();
      handleLeaveGame(now);
    } else {
      handleReturnToGame(now);
      hidePwaSnapshotCover();
    }
  });

  window.addEventListener('pageshow', (e: PageTransitionEvent) => {
    if (!document.hidden) {
      if (e.persisted) {
        handleReturnToGame(Date.now());
      }
      hidePwaSnapshotCover();
    }
  });

  window.addEventListener('focus', () => {
    if (!document.hidden) {
      hidePwaSnapshotCover();
    }
  });

  window.addEventListener('pagehide', () => {
    showPwaSnapshotCover();
    handleLeaveGame(Date.now());
  });

  window.addEventListener('beforeunload', () => {
    handleLeaveGame(Date.now());
  });

  function formatAwardedBones(amount: number): string {
    const safe = Math.max(0, Number(amount) || 0);
    return Math.round(safe).toLocaleString();
  }

  function showOfflineModal(summary: AwayProgressSummary): void {
    activeOfflineModalSummary = {
      actualEarned: summary.actualEarned,
      actualMagicEarned: summary.actualMagicEarned || 0,
      estimatedDigs: summary.estimatedDigs,
      foundTreasures: [...summary.foundTreasures],
      moodBefore: summary.moodBefore,
      moodAfter: summary.moodAfter
    };

    const modal = document.getElementById('offlineModal');
    const text = document.getElementById('offlineEarnings');
    const closeBtn = document.getElementById('btnCloseOffline');
    if (closeBtn) {
      closeBtn.textContent = (summary.actualMagicEarned || 0) > 0 ? 'Claim Rewards' : 'Claim Bones';
    }
    if (text) {
      text.innerHTML = '';

      if (summary.actualEarned > 0 || (summary.actualMagicEarned || 0) <= 0) {
        const bonesLine = document.createElement('div');
        bonesLine.innerHTML = `<span class="pp-inline-pair"><span>+${formatAwardedBones(summary.actualEarned)}</span>${uiIconHtml('hudBone')}</span>`;
        text.appendChild(bonesLine);
      }

      if ((summary.actualMagicEarned || 0) > 0) {
        const magicLine = document.createElement('div');
        magicLine.className = 'offline-magic-line';
        magicLine.innerHTML = `<span class="pp-inline-pair"><span>+${summary.actualMagicEarned.toLocaleString()}</span>${uiIconHtml('hudMagicBone')}<span>Magic Bones</span></span>`;
        text.appendChild(magicLine);
      }

      if (
        typeof summary.moodBefore === 'number' &&
        typeof summary.moodAfter === 'number' &&
        summary.moodBefore - summary.moodAfter >= 2
      ) {
        const moodLine = document.createElement('div');
        moodLine.className = 'offline-mood-note';
        moodLine.textContent = `Your pups missed you — Pack Happiness cooled from ${summary.moodBefore}% to ${summary.moodAfter}%. Pet or treat them to perk them right back up!`;
        text.appendChild(moodLine);
      }

      summary.foundTreasures.forEach(foundTreasure => {
        const card = document.createElement('div');
        card.className = 'offline-treasure-card';
        if (foundTreasure.kind === 'jackpot') {
          card.innerHTML = `
            <div class="offline-treasure-info">
              <div class="offline-treasure-kicker">Relic Vault Mastered</div>
              <div class="offline-treasure-name">Treasure Jackpot: ${magicInlineHtml(`+${foundTreasure.magicBones.toLocaleString()}`)} Magic Bones</div>
              <div class="offline-treasure-meta">All 16 relics are already at Rank V (MAX).</div>
            </div>
          `;
        } else {
          const { def, prevRank, newRank, completedSetName } = foundTreasure;
          const meta = RARITY_META[def.rarity];
          const progressTag = prevRank <= 0
            ? 'New Discovery | Rank I'
            : `Rank ${getRankRoman(prevRank)} → Rank ${getRankRoman(newRank)}`;
          const statsLine = formatRelicStatsAtRank(def, newRank);

          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.className = 'offline-treasure-thumb';
          thumbCanvas.setAttribute('role', 'img');
          thumbCanvas.setAttribute('aria-label', def.name);
          renderTreasureCanvasFrame(thumbCanvas, def.id, def.rarity, 64);

          const info = document.createElement('div');
          info.className = 'offline-treasure-info';
          info.innerHTML = `
            <div class="offline-treasure-kicker">Found While Away | ${progressTag}</div>
            <div class="offline-treasure-name">${def.name}</div>
            <div class="offline-treasure-meta"><span style="color: ${meta.color};">${def.rarity}</span> | ${statsLine}</div>
            ${completedSetName ? `<div class="offline-treasure-meta" style="color: #55efc4;">Set Bonus Activated: ${completedSetName}!</div>` : ''}
          `;

          card.appendChild(thumbCanvas);
          card.appendChild(info);
        }
        text.appendChild(card);
      });
    }
    if (modal) {
      modal.style.display = 'flex';
    }
    syncRootBackgroundColor();
  }

  function closeOfflineModal(): void {
    const modal = document.getElementById('offlineModal');
    if (modal) modal.style.display = 'none';
    activeOfflineModalSummary = null;
    syncRootBackgroundColor();
    flushQueuedAwayProgressIfReady();
  }

  document.getElementById('btnCloseOffline')?.addEventListener('click', () => {
    closeOfflineModal();
  });

  const gameModal = document.getElementById('gameModal');
  const drawerWindow = document.getElementById('drawerWindow');
  const drawerHandle = document.getElementById('drawerHandle');
  const splashScreenEl = document.getElementById('splashScreen');
  const fullScreenModalEls = Array.from(document.querySelectorAll<HTMLElement>('.modal'));

  const SPLASH_ROOT_BG = '#0d0b1a';
  const DRAWER_BOTTOM_BG = '#15112e';
  let lastSkyBotTuple: [number, number, number] = [13, 11, 26];
  let lastSkyTopTuple: [number, number, number] = [13, 11, 26];
  let lastSkyBotRgb = '#0d0b1a';
  let lastSkyTopRgb = '#0d0b1a';
  let lastAppliedRootBg = '';
  let lastAppliedThemeColor = '';

  function blendModalOverlayRgb(baseRgb: [number, number, number]): string {
    // Matches .modal backdrop: rgba(13, 11, 26, 0.78) composited over the sky canvas
    const alpha = 0.78;
    const inv = 1 - alpha;
    const r = Math.round(13 * alpha + baseRgb[0] * inv);
    const g = Math.round(11 * alpha + baseRgb[1] * inv);
    const b = Math.round(26 * alpha + baseRgb[2] * inv);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function isSplashOverlayOpaque(): boolean {
    if (!splashScreenEl) return false;
    return (
      splashScreenEl.style.display !== 'none' &&
      !splashScreenEl.classList.contains('is-hiding')
    );
  }

  function isAnyFullScreenModalOpen(): boolean {
    for (let i = 0; i < fullScreenModalEls.length; i++) {
      const el = fullScreenModalEls[i];
      if (el.style.display && el.style.display !== 'none') {
        return true;
      }
    }
    return false;
  }

  function syncRootBackgroundColor(): void {
    const isSplashActive = isSplashOverlayOpaque();
    const isPwaBackgrounded = document.documentElement.classList.contains('pwa-backgrounded');
    const isModalOpen = isAnyFullScreenModalOpen();
    const isMenuOpen = Boolean(gameModal && gameModal.style.display !== 'none');

    let desiredRootBg = lastSkyBotRgb;
    let desiredThemeColor = lastSkyTopRgb;

    if (isSplashActive || isPwaBackgrounded) {
      desiredRootBg = SPLASH_ROOT_BG;
      desiredThemeColor = SPLASH_ROOT_BG;
    } else if (isModalOpen) {
      desiredRootBg = blendModalOverlayRgb(lastSkyBotTuple);
      desiredThemeColor = blendModalOverlayRgb(lastSkyTopTuple);
    } else if (isMenuOpen) {
      desiredRootBg = DRAWER_BOTTOM_BG;
    }

    if (lastAppliedRootBg !== desiredRootBg) {
      lastAppliedRootBg = desiredRootBg;
      document.documentElement.style.backgroundColor = desiredRootBg;
      document.body.style.backgroundColor = desiredRootBg;
    }
    if (lastAppliedThemeColor !== desiredThemeColor) {
      lastAppliedThemeColor = desiredThemeColor;
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) themeMeta.setAttribute('content', desiredThemeColor);
      if (iosTopEdgeCapEl) iosTopEdgeCapEl.style.backgroundColor = desiredThemeColor;
    }
  }

  if (gameModal) {
    gameModal.style.display = 'none';
  }

  type DrawerSnapState = 'half' | 'expanded';
  let drawerSnapState: DrawerSnapState = 'half';

  function bindReliableCloseButton(btn: HTMLElement | null, onClose: () => void): void {
    if (!btn) return;
    let activeTouchId: number | null = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let lastClosedAt = 0;

    const triggerClose = (): void => {
      const now = performance.now();
      if (now - lastClosedAt < 280) return;
      lastClosedAt = now;
      onClose();
    };

    btn.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.changedTouches.length === 0) return;
      const t = e.changedTouches[0];
      activeTouchId = t.identifier;
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    }, { passive: true });

    btn.addEventListener('touchend', (e: TouchEvent) => {
      if (activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === activeTouchId) {
          activeTouchId = null;
          const dist = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
          if (dist <= 12) {
            e.preventDefault();
            e.stopPropagation();
            triggerClose();
          }
          break;
        }
      }
    }, { passive: false });

    btn.addEventListener('touchcancel', () => {
      activeTouchId = null;
    }, { passive: true });

    btn.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      triggerClose();
    });
  }

  let safeInsetProbeEl: HTMLDivElement | null = null;
  let viewportLvhProbeEl: HTMLDivElement | null = null;
  let viewportFixedProbeEl: HTMLDivElement | null = null;
  let isAsymmetricPortraitSideInset = false;

  function ensureViewportProbes(): void {
    if (!document.body) return;
    if (!safeInsetProbeEl) {
      safeInsetProbeEl = document.createElement('div');
      safeInsetProbeEl.className = 'safe-inset-probe';
      safeInsetProbeEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(safeInsetProbeEl);
    }
    if (!viewportLvhProbeEl) {
      viewportLvhProbeEl = document.createElement('div');
      viewportLvhProbeEl.className = 'viewport-lvh-probe';
      viewportLvhProbeEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(viewportLvhProbeEl);
    }
    if (!viewportFixedProbeEl) {
      viewportFixedProbeEl = document.createElement('div');
      viewportFixedProbeEl.className = 'viewport-fixed-probe';
      viewportFixedProbeEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(viewportFixedProbeEl);
    }
  }

  function measureSafeInsets(): { top: number; right: number; bottom: number; left: number } {
    ensureViewportProbes();
    if (!safeInsetProbeEl || typeof window.getComputedStyle !== 'function') {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    const cs = window.getComputedStyle(safeInsetProbeEl);
    return {
      top: parseFloat(cs.paddingTop) || 0,
      right: parseFloat(cs.paddingRight) || 0,
      bottom: parseFloat(cs.paddingBottom) || 0,
      left: parseFloat(cs.paddingLeft) || 0
    };
  }

  function measureCssViewportHeights(): { lvhH: number; fixedH: number } {
    ensureViewportProbes();
    const lvhH = viewportLvhProbeEl ? Math.round(viewportLvhProbeEl.getBoundingClientRect().height || 0) : 0;
    const fixedH = viewportFixedProbeEl ? Math.round(viewportFixedProbeEl.getBoundingClientRect().height || 0) : 0;
    return { lvhH, fixedH };
  }

  function syncAsymmetricSafeAreaMode(width: number, height: number): boolean {
    const sideInsets = measureSafeInsets();
    const next = height > width && Math.abs(sideInsets.right - sideInsets.left) >= 20;
    const changed = next !== isAsymmetricPortraitSideInset;
    isAsymmetricPortraitSideInset = next;
    document.documentElement.classList.toggle('asymmetric-side-safe-area', next);
    return changed;
  }

  function updateDrawerCutoutClearance(currentDrawerHeight: number): void {
    if (!drawerWindow) return;
    if (!isAsymmetricPortraitSideInset) {
      drawerWindow.classList.remove('clears-side-cutout');
      return;
    }
    const measuredH = viewportH > 0
      ? viewportH
      : (window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 640);
    const drawerTop = measuredH - currentDrawerHeight;
    drawerWindow.classList.toggle('clears-side-cutout', drawerTop < Math.round(measuredH * 0.25));
  }

  function getDrawerSnapHeights(): { halfHeight: number; expandedHeight: number } {
    const measuredH = viewportH > 0
      ? viewportH
      : (window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 640);
    const vh = Math.max(320, Math.round(measuredH));
    if (isAsymmetricPortraitSideInset) {
      // On asymmetric portrait side-cutout screens (e.g. iPhone Duo front screen),
      // keep half-sheet generous (56%) and expanded cleanly below the upper-side status cluster (74%)
      // so the entire drawer spans full edge-to-edge width without overlapping the clock/Dynamic Island.
      const expandedHeight = Math.max(300, Math.min(vh - 28, Math.round(vh * 0.74)));
      const halfHeight = Math.max(250, Math.min(expandedHeight - 60, Math.round(vh * 0.56)));
      return { halfHeight, expandedHeight };
    }
    const expandedHeight = Math.max(300, Math.min(vh - 28, Math.round(vh * 0.9)));
    const halfHeight = Math.max(240, Math.min(expandedHeight - 60, Math.round(vh * 0.52)));
    return { halfHeight, expandedHeight };
  }

  function applyDrawerSnap(snap: DrawerSnapState, animate = true): void {
    drawerSnapState = snap;
    if (!drawerWindow) return;
    const { halfHeight, expandedHeight } = getDrawerSnapHeights();
    const targetH = snap === 'expanded' ? expandedHeight : halfHeight;
    if (!animate) {
      drawerWindow.classList.add('is-dragging');
    } else {
      drawerWindow.classList.remove('is-dragging');
    }
    drawerWindow.classList.toggle('is-expanded', snap === 'expanded');
    drawerWindow.style.height = `${targetH}px`;
    drawerWindow.style.transform = '';
    updateDrawerCutoutClearance(targetH);
    if (!animate) {
      void drawerWindow.offsetHeight;
      drawerWindow.classList.remove('is-dragging');
    }
  }

  let drawerStartY = 0;
  let drawerStartHeight = 0;
  let drawerStartTime = 0;
  let drawerCurrentDeltaY = 0;
  let drawerDismissOffset = 0;
  let drawerDraggedHeight = 0;
  let drawerDidMove = false;
  let isDrawerDragging = false;

  function openMenu(initialSnap: DrawerSnapState = 'half'): void {
    isDrawerDragging = false;
    drawerCurrentDeltaY = 0;
    drawerDismissOffset = 0;
    resize();
    if (drawerWindow) {
      drawerWindow.classList.add('is-dragging');
      const { halfHeight, expandedHeight } = getDrawerSnapHeights();
      const targetH = initialSnap === 'expanded' ? expandedHeight : halfHeight;
      drawerSnapState = initialSnap;
      drawerWindow.classList.toggle('is-expanded', initialSnap === 'expanded');
      drawerWindow.style.height = `${targetH}px`;
      drawerWindow.style.transform = '';
      updateDrawerCutoutClearance(targetH);
    }
    if (gameModal) {
      gameModal.style.display = 'flex';
    }
    syncRootBackgroundColor();
    if (drawerWindow) {
      void drawerWindow.offsetHeight;
      drawerWindow.classList.remove('is-dragging');
    }
  }

  document.getElementById('btnOpenMenu')?.addEventListener('click', () => {
    initAudio();
    dismissOnboardingHint();
    cancelDecorPlacement();
    stopTilePaintMode();
    stopSingleClearMode();
    openMenu('half');
    updateUI();
    renderRosterTab();
  });

  function closeMenu(): void {
    isDrawerDragging = false;
    drawerCurrentDeltaY = 0;
    drawerDismissOffset = 0;
    drawerSnapState = 'half';
    if (gameModal) {
      gameModal.style.display = 'none';
    }
    syncRootBackgroundColor();
    if (drawerWindow) {
      drawerWindow.classList.remove('is-dragging', 'is-expanded', 'clears-side-cutout');
      drawerWindow.style.height = '';
      drawerWindow.style.transform = '';
    }
    hideRetireNotice();
  }

  bindReliableCloseButton(document.getElementById('btnCloseMenu'), closeMenu);

  drawerHandle?.addEventListener('pointerdown', (e: PointerEvent) => {
    if (!drawerWindow) return;
    isDrawerDragging = true;
    drawerDidMove = false;
    drawerStartY = e.clientY;
    drawerStartHeight = drawerWindow.getBoundingClientRect().height;
    drawerDraggedHeight = drawerStartHeight;
    drawerStartTime = performance.now();
    drawerCurrentDeltaY = 0;
    drawerDismissOffset = 0;
    drawerWindow.classList.add('is-dragging');
    try {
      drawerHandle.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  });

  drawerHandle?.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDrawerDragging || !drawerWindow) return;
    const dy = e.clientY - drawerStartY;
    drawerCurrentDeltaY = dy;
    if (Math.abs(dy) > 5) {
      drawerDidMove = true;
    }

    const { halfHeight, expandedHeight } = getDrawerSnapHeights();
    const rawTargetHeight = drawerStartHeight - dy;

    if (rawTargetHeight >= halfHeight) {
      const clampedHeight = rawTargetHeight > expandedHeight
        ? expandedHeight + (rawTargetHeight - expandedHeight) * 0.2
        : rawTargetHeight;
      drawerDraggedHeight = clampedHeight;
      drawerDismissOffset = 0;
      drawerWindow.style.height = `${Math.round(clampedHeight)}px`;
      drawerWindow.style.transform = '';
      updateDrawerCutoutClearance(clampedHeight);
    } else {
      drawerDraggedHeight = halfHeight;
      drawerDismissOffset = halfHeight - rawTargetHeight;
      drawerWindow.style.height = `${halfHeight}px`;
      drawerWindow.style.transform = `translateY(${Math.round(drawerDismissOffset)}px)`;
      updateDrawerCutoutClearance(halfHeight);
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

    const elapsedMs = Math.max(16, performance.now() - drawerStartTime);
    const velocityY = drawerCurrentDeltaY / elapsedMs;
    const { halfHeight, expandedHeight } = getDrawerSnapHeights();

    if (!drawerDidMove) {
      applyDrawerSnap(drawerSnapState === 'expanded' ? 'half' : 'expanded');
    } else if (drawerDismissOffset > 80 || (velocityY > 0.65 && drawerDismissOffset > 18)) {
      closeMenu();
    } else if (velocityY > 0.42 && drawerDismissOffset === 0) {
      applyDrawerSnap('half');
    } else if (velocityY < -0.42 || drawerDraggedHeight > (halfHeight + expandedHeight) * 0.5) {
      applyDrawerSnap('expanded');
    } else {
      applyDrawerSnap('half');
    }

    drawerCurrentDeltaY = 0;
    drawerDismissOffset = 0;
  }

  drawerHandle?.addEventListener('pointerup', finishDrawerDrag);
  drawerHandle?.addEventListener('pointercancel', finishDrawerDrag);
  drawerHandle?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      applyDrawerSnap(drawerSnapState === 'expanded' ? 'half' : 'expanded');
    }
  });

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
      } else {
        hideRetireNotice();
      }
      if (tabId === 'tab-goals') {
        renderGoalsTab(true);
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
    rolledShinyOdds: number;
    rolledGrade: string;
    rolledPayout: number;
    rolledScaling: number;
    rolledXp: number;
  }

  function formatRerollRulesText(entry: RosterEntry): string {
    const dogRerolls = getDogRerollCount(entry);
    const manorActive = hasGrandDoghousePlaced();
    const shinyOddsLabel = formatRerollShinyOddsLabel(getEffectiveRerollShinyOdds());
    const manorNote = manorActive ? ' (Manor bonus)' : '';
    return `Rerolls for ${entry.name} cost 25 → 50 → 75 → 100 (+25 per reroll on this dog; currently reroll #${dogRerolls + 1}). Higher-rated previous stats are kept if not beaten, and non-shiny pups have a ${shinyOddsLabel} chance${manorNote} to become Shiny (+${SHINY_MAGIC_BONE_BONUS} bonus Magic Bone per Magic drop).`;
  }

  function renderRerollModalContent(dogId: string, resultInfo: RerollResultInfo | null = null): void {
    const entry = state.roster.find(d => d.id === dogId);
    if (!entry) return;

    const stats = getEffectiveBreedStats(entry);
    const breedName = BREED_LABELS[entry.breed] || entry.breed;
    const cost = getRerollCost(entry);
    const canAfford = (state.magicBones || 0) >= cost;

    if (rerollDogSummary) {
      const nameEl = document.createElement('strong');
      nameEl.textContent = entry.name;

      const breedMetaEl = document.createElement('span');
      breedMetaEl.className = 'reroll-meta-text';
      breedMetaEl.textContent = `${breedName} | Lv. ${entry.level}`;

      const coatMetaEl = document.createElement('span');
      coatMetaEl.className = entry.isShiny ? 'reroll-meta-text is-shiny' : 'reroll-meta-text';
      if (entry.isShiny) {
        coatMetaEl.innerHTML = `${uiIconHtml('spark')} <span>Shiny (+${SHINY_MAGIC_BONE_BONUS}</span> ${uiIconHtml('magicBone')}<span>/drop)</span>`;
      } else {
        coatMetaEl.textContent = 'Standard Coat';
      }

      rerollDogSummary.replaceChildren(nameEl, breedMetaEl, coatMetaEl);
    }

    if (rerollCurrentStats) {
      const statRows: Array<{ label: string; text?: string; html?: string }> = [
        { label: 'Roll Grade', html: formatRollGradeHtml(stats.rollGrade) },
        { label: 'Bone Yield', text: `+${stats.bonusPayout.toFixed(2)} (${stats.boneYield.toFixed(2)}x)` },
        { label: 'Pack Growth', text: `+${stats.bonusScaling.toFixed(2)} (${stats.packGrowth.toFixed(2)}x)` },
        { label: 'Quick Learner', text: `+${stats.bonusXp.toFixed(2)} (${stats.quickLearner.toFixed(2)}x)` }
      ];
      const statNodes = statRows.map(row => {
        const line = document.createElement('div');
        line.className = 'reroll-stat-line';
        const labelEl = document.createElement('span');
        labelEl.textContent = row.label;
        const valueEl = document.createElement('strong');
        if (row.html !== undefined) {
          valueEl.innerHTML = row.html;
        } else {
          valueEl.textContent = row.text || '';
        }
        line.append(labelEl, valueEl);
        return line;
      });
      rerollCurrentStats.replaceChildren(...statNodes);
    }

    if (rerollRulesText) {
      rerollRulesText.textContent = formatRerollRulesText(entry);
    }

    if (rerollResultBanner) {
      if (!resultInfo) {
        rerollResultBanner.style.display = 'none';
        rerollResultBanner.className = 'reroll-result-banner';
        rerollResultBanner.replaceChildren();
      } else {
        rerollResultBanner.style.display = 'block';
        rerollResultBanner.className = `reroll-result-banner ${resultInfo.keptPrevious ? 'kept' : 'upgraded'}${resultInfo.becameShiny ? ' shiny-hit' : ''}`;

        const rolledGradeLabel = formatRollGradeText(resultInfo.rolledGrade);
        const currentGradeLabel = formatRollGradeText(stats.rollGrade);
        const statMsg = resultInfo.keptPrevious
          ? `Rolled ${rolledGradeLabel} (+${resultInfo.rolledPayout.toFixed(2)} Yield / +${resultInfo.rolledScaling.toFixed(2)} Growth / +${resultInfo.rolledXp.toFixed(2)} XP) — previous higher-rated stats (${currentGradeLabel}) were kept!`
          : `New roll applied! Now ${currentGradeLabel} (+${stats.bonusPayout.toFixed(2)} Yield / +${stats.bonusScaling.toFixed(2)} Growth / +${stats.bonusXp.toFixed(2)} XP).`;

        const statLine = document.createElement('div');
        statLine.textContent = statMsg;

        const bannerNodes: HTMLElement[] = [statLine];
        if (resultInfo.becameShiny) {
          const shinyCallout = document.createElement('div');
          shinyCallout.className = 'reroll-shiny-callout';
          const rollOddsLabel = formatRerollShinyOddsLabel(resultInfo.rolledShinyOdds);
          shinyCallout.innerHTML = `${uiIconHtml('spark')} <span>JACKPOT! ${rollOddsLabel} Shiny roll hit — ${entry.name} is now Shiny!</span>`;
          bannerNodes.push(shinyCallout);
        }

        rerollResultBanner.replaceChildren(...bannerNodes);
      }
    }

    if (rerollCostLabel) {
      setHtmlIfChanged(rerollCostLabel, magicInlineHtml(cost.toLocaleString()));
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
    state.totalRerollsCount = (Number(state.totalRerollsCount) || 0) + 1;

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
    const effectiveShinyOdds = getEffectiveRerollShinyOdds();
    if (!entry.isShiny && Math.random() < effectiveShinyOdds) {
      entry.isShiny = true;
      if (!entry.shinyColor) {
        entry.shinyColor = SHINY_PALETTES[Math.floor(Math.random() * SHINY_PALETTES.length)];
      }
      becameShiny = true;
      state.totalShiniesFound = (Number(state.totalShiniesFound) || 0) + 1;

      const canvasDog = dogs.find(d => d.rosterId === entry.id);
      if (canvasDog) {
        canvasDog.isShiny = true;
        canvasDog.shinyColor = entry.shinyColor;
      }

      syncBreedCountsFromRoster();
      sfx.shiny();
    } else {
      sfx.upgrade();
    }

    updateUI();
    renderRosterTab();
    saveGame();
    renderRerollModalContent(dogId, {
      keptPrevious,
      becameShiny,
      rolledShinyOdds: effectiveShinyOdds,
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
    bindReliableCloseButton(btnCloseRerollModal, () => {
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

  const RETIRE_NOTICE_DURATION_MS = 4000;
  const RETIRE_NOTICE_FADE_MS = 250;
  let retireNoticeFadeTimer: number | null = null;
  let retireNoticeHideTimer: number | null = null;

  function clearRetireNoticeTimers(): void {
    if (retireNoticeFadeTimer !== null) {
      window.clearTimeout(retireNoticeFadeTimer);
      retireNoticeFadeTimer = null;
    }
    if (retireNoticeHideTimer !== null) {
      window.clearTimeout(retireNoticeHideTimer);
      retireNoticeHideTimer = null;
    }
  }

  function hideRetireNotice(): void {
    clearRetireNoticeTimers();
    const noticeEl = document.getElementById('retireNotice');
    if (noticeEl) {
      noticeEl.classList.remove('is-fading-out');
      noticeEl.style.display = 'none';
      noticeEl.textContent = '';
    }
  }

  function showRetireNotice(message: string): void {
    clearRetireNoticeTimers();
    const noticeEl = document.getElementById('retireNotice');
    if (!noticeEl) return;

    noticeEl.classList.remove('is-fading-out');
    noticeEl.textContent = message;
    noticeEl.style.display = 'block';

    retireNoticeFadeTimer = window.setTimeout(() => {
      retireNoticeFadeTimer = null;
      noticeEl.classList.add('is-fading-out');
      retireNoticeHideTimer = window.setTimeout(() => {
        retireNoticeHideTimer = null;
        noticeEl.classList.remove('is-fading-out');
        noticeEl.style.display = 'none';
        noticeEl.textContent = '';
      }, RETIRE_NOTICE_FADE_MS);
    }, RETIRE_NOTICE_DURATION_MS);
  }

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

    showRetireNotice(
      `${retiredDog.name} retired! You received ${actualRefund.toLocaleString()} Bones (${refundPct}% of their ${Math.floor(retiredDog.bonesEarned).toLocaleString()} lifetime bones dug).`
    );

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

      const gradeClass = isMaxRollGrade(stats.rollGrade)
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
      nameInput.enterKeyHint = 'done';
      nameInput.autocomplete = 'off';
      nameInput.setAttribute('aria-label', `Name for ${breedName}`);

      const commitName = () => {
        const cleaned = nameInput.value.trim();
        entry.name = cleaned || breedName;
        nameInput.value = entry.name;
        requestSave();
      };
      const recoverViewportAfterInput = () => {
        resetPhantomScroll();
        scheduleResize();
        window.setTimeout(() => {
          resetPhantomScroll();
          resize(true);
        }, 80);
        window.setTimeout(() => {
          resetPhantomScroll();
          resize(true);
        }, 260);
      };
      nameInput.addEventListener('change', commitName);
      nameInput.addEventListener('keydown', (ev: KeyboardEvent) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          nameInput.blur();
        }
      });
      nameInput.addEventListener('blur', () => {
        commitName();
        recoverViewportAfterInput();
      });

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
        <span>${breedName}${entry.isShiny ? ` ${uiIconHtml('spark')}` : ''}</span>
        <span class="roster-meta-sep" aria-hidden="true">|</span>
        <span>Lv. <strong>${entry.level}</strong>${entry.level >= MAX_DOG_LEVEL ? ' (MAX)' : ''}</span>
        <span class="roster-meta-sep" aria-hidden="true">|</span>
        <strong class="${gradeClass}">${formatRollGradeHtml(stats.rollGrade)}</strong>
        <span class="roster-meta-sep" aria-hidden="true">|</span>
        <span><strong>${Math.floor(entry.digsCompleted || 0).toLocaleString()}</strong> Digs</span>
        <span class="roster-meta-sep" aria-hidden="true">|</span>
        <span>${boneInlineHtml(`<strong>${Math.floor(entry.bonesEarned).toLocaleString()}</strong>`)}</span>
      `;

      const bonusRow = document.createElement('div');
      bonusRow.className = 'roster-bonus-row';
      bonusRow.innerHTML = `
        <span>Bone Yield <strong>${stats.boneYield.toFixed(2)}x</strong> <em>(+${stats.bonusPayout.toFixed(2)})</em> <span class="lvl-bonus">(+${levelBonusPct}% Lv.)</span></span>
        <span>Pack Growth <strong>${stats.packGrowth.toFixed(2)}x</strong> <em>(+${stats.bonusScaling.toFixed(2)})</em></span>
        <span>XP <strong>${stats.quickLearner.toFixed(2)}x</strong> <em>(+${stats.bonusXp.toFixed(2)})</em></span>
        ${entry.isShiny ? `<span class="lvl-bonus">Shiny ${magicInlineHtml(`<strong>+${SHINY_MAGIC_BONE_BONUS}</strong>`)}</span>` : ''}
        <span>${isMaxLevel ? `<strong>Max Lv.</strong>` : `Next Lv. <strong>${Math.floor(entry.xp).toLocaleString()}/${xpNeeded.toLocaleString()}</strong>`}</span>
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
      favBtn.innerHTML = uiIconHtml(isFav ? 'starFilled' : 'starOutline');
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavoriteDog(entry.id);
      });
      iconRow.appendChild(favBtn);

      const rerollBtn = document.createElement('button');
      rerollBtn.type = 'button';
      rerollBtn.className = 'reroll-dice-btn';
      rerollBtn.setAttribute('aria-label', `Reroll stats for ${entry.name}`);
      rerollBtn.title = `Reroll Stats & Shiny Chance (${getRerollCost(entry)} Magic Bones)`;
      rerollBtn.innerHTML = uiIconHtml('dice');
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
          <span class="retire-line-sub">${boneInlineHtml(`+${refundPreview.toLocaleString()}`)}</span>
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

  const DECOR_LABELS: Record<DecorType, string> = {
    flowers: 'Flower Patch',
    hydrant: 'Fire Hydrant',
    tree: 'Park Tree',
    lamp: 'Lamp Post',
    fountain: 'Water Fountain',
    slide: 'Dog Slide',
    goldenHydrant: 'Golden Hydrant',
    doghouseManor: 'Grand Doghouse Manor'
  };

  const TILE_LABELS: Record<TileStyle, string> = {
    grass: 'Lush Grass',
    cobble: 'Cobblestone',
    sand: 'Sandy Dig Pit',
    clover: 'Clover Meadow'
  };

  function cancelDecorPlacement(): void {
    state.isPlacingDecor = false;
    state.activeDecorType = null;
    const banner = document.getElementById('placementBanner');
    if (banner) banner.style.display = 'none';
  }

  function stopSingleClearMode(): void {
    state.isClearingDecor = false;
    const banner = document.getElementById('clearDecorBanner');
    if (banner) banner.style.display = 'none';
    canvas.classList.remove('is-clearing-decor');
  }

  function startSingleClearMode(): void {
    cancelDecorPlacement();
    stopTilePaintMode();
    state.isClearingDecor = true;
    closeMenu();
    const banner = document.getElementById('clearDecorBanner');
    const bannerText = document.getElementById('clearDecorBannerText');
    const hasDecor = state.placedDecorations.length > 0;
    const hasTiles = Object.keys(state.tileMap || {}).length > 0;
    if (bannerText) {
      bannerText.textContent = (hasDecor || hasTiles)
        ? 'Tap a highlighted tile to clear decor or custom ground'
        : 'No placed decor or custom ground tiles to clear';
    }
    if (banner) banner.style.display = 'flex';
    canvas.classList.add('is-clearing-decor');
    sfx.gather();
  }

  function clearSingleTileAt(tx: number, ty: number): void {
    const bannerText = document.getElementById('clearDecorBannerText');
    const key = `${tx},${ty}`;
    const tileScreen = getCenteredTilePos(tx, ty);
    const scale = getScale();

    // 1. Check if a placed decoration occupies this tile (supports multi-tile decor like slide & manor)
    const decorIdx = state.placedDecorations.findIndex(dec =>
      getDecorFootprint(dec.type, dec.gx, dec.gy).some(t => t.gx === tx && t.gy === ty)
    );

    if (decorIdx !== -1) {
      const removed = state.placedDecorations[decorIdx];
      const footprint = getDecorFootprint(removed.type, removed.gx, removed.gy);
      state.placedDecorations.splice(decorIdx, 1);
      invalidateNavCache();

      dogs.forEach(d => {
        if (removed.type === 'slide') d.cancelSlide();
        if (removed.type === 'fountain' && d.drinkTarget?.kind === 'fountain' && d.drinkTarget.gx === removed.gx && d.drinkTarget.gy === removed.gy) {
          d.cancelDrink(true);
        }
        if (removed.type === 'doghouseManor' && d.drinkTarget?.kind === 'bowl') {
          d.cancelDrink();
        }
        d.clearNavPath();
      });
      if (removed.type === 'doghouseManor') {
        nudgeEntitiesOutsideObstacles();
      }
      showLandmarkToggleNote(null);
      state.packHappiness = Math.max(getCozyFloor(), Math.min(getPackHappinessCap(), state.packHappiness || getCozyFloor()));

      footprint.forEach(t => {
        tileRipples.push({
          gx: t.gx,
          gy: t.gy,
          age: 0,
          duration: 0.45,
          color: '#ff7675'
        });
      });

      const label = DECOR_LABELS[removed.type] || 'Decor';
      addFloatingText(tileScreen.x, tileScreen.y - 26 * scale, `Returned ${label}`, '#ffeaa7');
      sfx.collect();

      if (bannerText) {
        const hasTileUnder = Boolean(state.tileMap && state.tileMap[key]);
        const anyLeft = state.placedDecorations.length > 0 || Object.keys(state.tileMap || {}).length > 0;
        if (hasTileUnder) {
          bannerText.textContent = `Returned ${label}! Tap again to clear custom ground.`;
        } else if (!anyLeft) {
          bannerText.textContent = 'All decor & custom ground cleared!';
        } else {
          bannerText.textContent = `Returned ${label} to inventory! Tap another tile or Done.`;
        }
      }

      updateUI();
      saveGame();
      return;
    }

    // 2. Otherwise check if this tile has a custom ground style painted
    const customTile = state.tileMap?.[key];
    if (customTile) {
      delete state.tileMap[key];
      tileRipples.push({
        gx: tx,
        gy: ty,
        age: 0,
        duration: 0.42,
        color: '#55efc4'
      });
      const tileLabel = TILE_LABELS[customTile] || 'Custom';
      addFloatingText(tileScreen.x, tileScreen.y - 20 * scale, `Cleared ${tileLabel}`, '#55efc4');
      sfx.collect();

      if (bannerText) {
        const anyLeft = state.placedDecorations.length > 0 || Object.keys(state.tileMap || {}).length > 0;
        bannerText.textContent = anyLeft
          ? `Cleared ${tileLabel} tile! Tap another tile or Done.`
          : 'All decor & custom ground cleared!';
      }

      updateUI();
      saveGame();
      return;
    }

    // 3. Nothing removable on this tile — provide gentle feedback
    const sp = state.starterProps || createDefaultStarterProps();
    const isStarterLandmark =
      (tx === DOGHOUSE_TILE.gx && ty === DOGHOUSE_TILE.gy) ||
      (sp.showTree && tx === STARTER_TREE_TILE.gx && ty === STARTER_TREE_TILE.gy) ||
      mushrooms.some((m, idx) => sp.showMushrooms[idx] !== false && m.gx === tx && m.gy === ty);

    tileRipples.push({
      gx: tx,
      gy: ty,
      age: 0,
      duration: 0.38,
      color: 'rgba(255, 118, 117, 0.7)'
    });
    if (bannerText) {
      bannerText.textContent = isStarterLandmark
        ? 'Default landmarks can be toggled in the Decor menu'
        : 'Nothing to clear there — tap a highlighted tile';
    }
    sfx.thud();
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
    stopSingleClearMode();
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

  document.getElementById('btnDoneSingleClear')?.addEventListener('click', () => {
    initAudio();
    stopSingleClearMode();
    sfx.collect();
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
    stopSingleClearMode();
    state.isPlacingDecor = true;
    state.activeDecorType = type;
    closeMenu();
    const banner = document.getElementById('placementBanner');
    const bannerText = document.getElementById('placementBannerText');
    if (bannerText) bannerText.textContent = message;
    if (banner) banner.style.display = 'flex';
    sfx.gather();
  }

  function placeGrandDoghouseManor(): void {
    const cfg = DECOR_CONFIG.doghouseManor;
    const placedCount = state.placedDecorations.filter(d => d.type === 'doghouseManor').length;
    const available = (state.decorInventory.doghouseManor || 0) - placedCount;
    if (available <= 0 || placedCount >= cfg.max) return;

    // Automatically return any placed decor overlapping the 3 tiles behind the doghouse (or the doghouse tile) to inventory
    const keptDecor: PlacedDecor[] = [];
    let returnedCount = 0;
    let removedSlide = false;
    let removedFountain = false;
    state.placedDecorations.forEach(dec => {
      const footprint = getDecorFootprint(dec.type, dec.gx, dec.gy);
      const overlapsManor = footprint.some(t => isGrandDoghouseTile(t.gx, t.gy));
      if (overlapsManor) {
        returnedCount += 1;
        if (dec.type === 'slide') removedSlide = true;
        if (dec.type === 'fountain') removedFountain = true;
      } else {
        keptDecor.push(dec);
      }
    });

    keptDecor.push({
      type: 'doghouseManor',
      gx: GRAND_DOGHOUSE_ANCHOR.gx,
      gy: GRAND_DOGHOUSE_ANCHOR.gy
    });
    state.placedDecorations = keptDecor;
    invalidateNavCache();

    // Safely release any pups sliding/drinking on evicted decor or standing inside the new 2x2 manor footprint
    dogs.forEach(d => {
      if (removedSlide) d.cancelSlide();
      if (removedFountain) d.cancelDrink(true);
      if (d.drinkTarget?.kind === 'bowl') d.cancelDrink();
      if (isInsideDoghouseObstacle(d.gx, d.gy)) {
        const safe = pushOutsideAllObstacles(2.15 + Math.random() * 0.45, 2.15 + Math.random() * 0.45, 0.08);
        d.gx = safe.gx;
        d.gy = safe.gy;
        d.targetGx = d.gx;
        d.targetGy = d.gy;
        d.clearNavPath();
        if (d.state === 'SLEEP' || d.state === 'LAY' || d.state === 'SIT') {
          if (d.state === 'SLEEP') {
            d.sleepCooldown = DAY_SLEEP_COOLDOWN_MIN_SEC + Math.random() * (DAY_SLEEP_COOLDOWN_MAX_SEC - DAY_SLEEP_COOLDOWN_MIN_SEC);
          }
          d.isNightSleep = false;
          d.nightSleepUntilMs = 0;
          d.state = 'IDLE';
          d.timer = 0.8;
        }
      } else if (isPointBlockedByObstacle(d.targetGx, d.targetGy, 0.04)) {
        const safeTarget = pushOutsideAllObstacles(d.targetGx, d.targetGy, 0.08);
        d.setWalkTarget(safeTarget.gx, safeTarget.gy);
      } else {
        d.clearNavPath();
      }
    });

    nudgeEntitiesOutsideObstacles();

    closeMenu();
    addPackHappiness(8);
    sfx.shiny();

    const manorCenter = gridToScreen(1.0, 1.0);
    const s = getScale();
    particles.push({
      x: manorCenter.x,
      y: manorCenter.y - 12 * s,
      vx: 0,
      vy: 0,
      life: 0.85,
      maxLife: 0.85,
      color: '#ffeaa7',
      size: 6,
      isRing: true
    });
    for (let i = 0; i < 18; i++) {
      const ang = (Math.PI * 2 * i) / 18 + Math.random() * 0.2;
      const spd = 28 + Math.random() * 44;
      particles.push({
        x: manorCenter.x,
        y: manorCenter.y - 18 * s,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 26,
        life: 0.75 + Math.random() * 0.4,
        maxLife: 1.15,
        color: i % 3 === 0 ? '#ffeaa7' : (i % 2 === 0 ? '#74b9ff' : '#ffffff'),
        size: 2.5 + Math.random() * 2.2
      });
    }

    const bannerMsg = returnedCount > 0
      ? `Grand Doghouse Built! (${returnedCount} decor returned to inventory)`
      : 'Grand Doghouse Manor Built!';
    addFloatingText(manorCenter.x, manorCenter.y - 68 * s, bannerMsg, '#ffeaa7');

    updateUI();
    saveGame();
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
        updateUI();
        saveGame();
      }
    });

    document.getElementById(cfg.placeBtnId)?.addEventListener('click', () => {
      initAudio();
      const placedCount = state.placedDecorations.filter(d => d.type === type).length;
      const available = (state.decorInventory[type] || 0) - placedCount;
      if (available <= 0 || placedCount >= cfg.max) return;
      if (type === 'doghouseManor') {
        placeGrandDoghouseManor();
        return;
      }
      startDecorPlacement(type, cfg.placePrompt);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-manor-color]').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudio();
      const colorId = btn.dataset.manorColor as ManorColorId | undefined;
      if (!colorId || !(colorId in MANOR_COLOR_PALETTES)) return;
      const hasManor = hasGrandDoghousePlaced() || (state.decorInventory.doghouseManor || 0) > 0;
      if (!hasManor) return;

      const unlocked = state.unlockedManorColors || createDefaultUnlockedManorColors();
      state.unlockedManorColors = unlocked;
      const isUnlocked = colorId === 'classic' || Boolean(unlocked[colorId]);

      if (!isUnlocked) {
        if (state.magicBones < MANOR_COLOR_COST) return;
        state.magicBones -= MANOR_COLOR_COST;
        unlocked[colorId] = true;
        state.manorColor = colorId;
        sfx.shiny();

        if (hasGrandDoghousePlaced()) {
          const palette = MANOR_COLOR_PALETTES[colorId];
          const manorCenter = gridToScreen(1.0, 1.0);
          const s = getScale();
          for (let i = 0; i < 14; i++) {
            const ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.2;
            const spd = 24 + Math.random() * 38;
            particles.push({
              x: manorCenter.x,
              y: manorCenter.y - 24 * s,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd - 20,
              life: 0.65 + Math.random() * 0.35,
              maxLife: 1.0,
              color: i % 2 === 0 ? palette.sparkleColor : '#ffeaa7',
              size: 2.3 + Math.random() * 1.8
            });
          }
          addFloatingText(manorCenter.x, manorCenter.y - 64 * s, `${palette.name} Manor!`, '#ffeaa7');
        }
        updateUI();
        saveGame();
        return;
      }

      if (state.manorColor === colorId) return;
      state.manorColor = colorId;
      sfx.collect();
      updateUI();
      saveGame();
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
        updateUI();
        saveGame();
      }
    });
  });

  document.getElementById('btnTileGrass')?.addEventListener('click', () => {
    initAudio();
    startTilePaintMode('grass');
  });

  document.getElementById('btnExpandPark')?.addEventListener('click', () => {
    initAudio();
    if (state.parkExpanded) return;
    if (state.bones < PARK_EXPANSION_BONE_COST || state.magicBones < PARK_EXPANSION_MAGIC_COST) {
      sfx.thud();
      return;
    }

    spendRegularBones(PARK_EXPANSION_BONE_COST);
    state.magicBones = Math.max(0, state.magicBones - PARK_EXPANSION_MAGIC_COST);
    state.parkExpanded = true;

    cancelDecorPlacement();
    stopSingleClearMode();
    stopTilePaintMode();
    rebuildTileDetails();
    invalidateNavCache();
    resize(true);

    const gridSize = getGridSize();
    const center = gridToScreen(gridSize / 2, gridSize / 2);
    addFloatingText(center.x, center.y - 26, '8×8 Park Unlocked!', '#ffeaa7');
    particles.push({
      x: center.x,
      y: center.y,
      vx: 0,
      vy: 0,
      life: 0.9,
      maxLife: 0.9,
      color: '#ffd700',
      size: 6,
      isRing: true
    });
    for (let i = 0; i < gridSize; i++) {
      tileRipples.push({ gx: gridSize - 1, gy: i, age: 0, duration: 0.65, color: '#ffeaa7' });
      if (i < gridSize - 1) {
        tileRipples.push({ gx: i, gy: gridSize - 1, age: 0, duration: 0.65, color: '#55efc4' });
      }
    }

    sfx.upgrade();
    closeMenu();
    updateUI();
    saveGame();
  });

  const clearDecorConfirmModal = document.getElementById('clearDecorConfirmModal');
  function syncClearDecorModalButtons(): void {
    const decorCount = state.placedDecorations.length;
    const tileCount = Object.keys(state.tileMap || {}).length;
    const singleBtn = document.getElementById('btnStartSingleClear') as HTMLButtonElement | null;
    const allBtn = document.getElementById('btnConfirmClearDecor') as HTMLButtonElement | null;
    if (singleBtn) {
      singleBtn.disabled = decorCount === 0 && tileCount === 0;
    }
    if (allBtn) {
      allBtn.disabled = decorCount === 0;
    }
  }

  document.getElementById('btnClearDecor')?.addEventListener('click', () => {
    initAudio();
    syncClearDecorModalButtons();
    if (clearDecorConfirmModal) clearDecorConfirmModal.style.display = 'flex';
  });

  document.getElementById('btnStartSingleClear')?.addEventListener('click', () => {
    initAudio();
    if (clearDecorConfirmModal) clearDecorConfirmModal.style.display = 'none';
    startSingleClearMode();
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
      invalidateNavCache();
      showLandmarkToggleNote(null);
      sfx.collect();
      updateUI();
      saveGame();
      return;
    }
    const occupied = getOccupiedTileMap();
    if (occupied.has(`${STARTER_TREE_TILE.gx},${STARTER_TREE_TILE.gy}`)) {
      sfx.thud();
      showLandmarkToggleNote('Clear the placed decor on the Starter Tree tile before restoring it.');
      return;
    }
    sp.showTree = true;
    invalidateNavCache();
    nudgeEntitiesOutsideObstacles();
    showLandmarkToggleNote(null);
    sfx.gather();
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
        invalidateNavCache();
        showLandmarkToggleNote(null);
        sfx.collect();
        updateUI();
        saveGame();
        return;
      }
      const occupied = getOccupiedTileMap();
      if (occupied.has(`${m.gx},${m.gy}`)) {
        sfx.thud();
        showLandmarkToggleNote(`Clear the placed decor on the ${m.label} tile before restoring them.`);
        return;
      }
      sp.showMushrooms[idx] = true;
      invalidateNavCache();
      nudgeEntitiesOutsideObstacles();
      showLandmarkToggleNote(null);
      sfx.gather();
      updateUI();
      saveGame();
    });
  });

  document.getElementById('btnConfirmClearDecor')?.addEventListener('click', () => {
    initAudio();
    state.placedDecorations = [];
    invalidateNavCache();
    dogs.forEach(d => {
      d.cancelSlide();
      d.cancelDrink();
      d.clearNavPath();
    });
    showLandmarkToggleNote(null);
    state.packHappiness = Math.max(getCozyFloor(), Math.min(getPackHappinessCap(), state.packHappiness || getCozyFloor()));
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
  bindReliableCloseButton(document.getElementById('btnCloseHelp'), closeHelpModal);
  document.getElementById('btnConfirmHelp')?.addEventListener('click', closeHelpModal);
  helpModal?.addEventListener('click', (e) => {
    if (e.target === helpModal) closeHelpModal();
  });

  document.getElementById('btnTestBoost')?.addEventListener('click', () => {
    initAudio();
    state.bones = MAX_BONES;
    state.magicBones = (Number(state.magicBones) || 0) + 30000;
    state.boneCapReachedNotified = true;
    sfx.shiny();
    updateUI();
    saveGame();
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
    activeOfflineModalSummary = null;
    cameraAngle = 0;
    cameraVelocity = 0;
    userZoom = 1;
    const starterShinyRoll = rollStarterShiny();
    const resetNow = Date.now();
    hasSettledInitialReturn = true;
    loadedFromExistingSave = true;
    lastReturnHandledAt = resetNow;
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
      dogs: createInitialDogCounts(),
      shinyDogs: [],
      roster: [createRosterEntry('aussie', starterShinyRoll.isShiny, starterShinyRoll.shinyColor, 'Biscuit')],
      perks: [],
      decorInventory: createEmptyDecorInventory(),
      placedDecorations: [],
      starterProps: createDefaultStarterProps(),
      isPlacingDecor: false,
      activeDecorType: null,
      isClearingDecor: false,
      unlockedTiles: createDefaultUnlockedTiles(),
      tileMap: {},
      parkExpanded: false,
      unlockedManorColors: createDefaultUnlockedManorColors(),
      manorColor: 'classic',
      isPaintingTiles: false,
      activeTileBrush: 'grass',
      showNameTags: true,
      soundEnabled: state.soundEnabled,
      ambientEnabled: state.ambientEnabled,
      hasSeenHint: clampedBones > 0 || clampedMagic > 0,
      cameraAngle: 0,
      zoomLevel: 1,
      digPower: BASE_DIG_POWER,
      speedMultiplier: BASE_SPEED_MULTIPLIER,
      idleMultiplier: BASE_IDLE_MULTIPLIER,
      magicChance: BASE_MAGIC_CHANCE,
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
      treatBreakEven: createEmptyTreatBreakEven(),
      feastAnimTimer: 0,
      hasTennisBall: false,
      hasFrisbee: false,
      hasDuck: false,
      freshBallUntil: 0,
      freshDuckUntil: 0,
      freshFrisbeeUntil: 0,
      isDraftingPerk: false,
      packHappiness: HAPPINESS_BASE_FLOOR,
      lastWhistleBoostAt: 0,
      lastFreeTreatAt: 0,
      costs: {},
      breedEconomyVersion: BREED_ECONOMY_VERSION,
      startDate: resetNow,
      activePlaySeconds: 0,
      lifetimeMagicBones: clampedMagic,
      totalDigsCount: 0,
      totalTapsCount: 0,
      totalPetsCount: 0,
      totalTreatsCount: 0,
      totalWhistlesCount: 0,
      totalRerollsCount: 0,
      totalFreshToyBoosts: 0,
      totalShiniesFound: starterShinyRoll.isShiny ? 1 : 0,
      totalCheckInsCount: 0,
      totalCheckInDays: 0,
      lastCheckInDateKey: '',
      checkInStreak: 0,
      bestCheckInStreak: 0,
      totalDailyGoalsClaimed: 0,
      totalDailyBonusesClaimed: 0,
      uniqueBreedsOwned: ['aussie'],
      everFullPack: false,
      everJoyful: false,
      everEcstatic: false,
      claimedAchievements: {},
      dailyGoals: createEmptyDailyGoalsState(getLocalDateKey(resetNow)),
      lastSaveTime: resetNow
    };

    recordCheckInIfEligible(resetNow);
    rebuildTileDetails();
    syncBreedCountsFromRoster();
    initDefaultCosts();

    rebuildCanvasDogsFromRoster();
    resize(true);
    droppedBones.length = 0;
    worldTreats.length = 0;
    particles.length = 0;
    barkPopups.length = 0;
    floatingTexts.length = 0;
    tileRipples.length = 0;
    parkBarkCooldown = PARK_BARK_MIN_COOLDOWN + Math.random() * (PARK_BARK_MAX_COOLDOWN - PARK_BARK_MIN_COOLDOWN);

    hideRetireNotice();

    if (resetConfirmModal) resetConfirmModal.style.display = 'none';
    if (retireConfirmModal) retireConfirmModal.style.display = 'none';
    if (rerollModal) rerollModal.style.display = 'none';
    const perkModalEl = document.getElementById('perkModal');
    if (perkModalEl) perkModalEl.style.display = 'none';
    const offlineModalEl = document.getElementById('offlineModal');
    if (offlineModalEl) offlineModalEl.style.display = 'none';
    stopDraftTreasureAnimations();
    closeTreasureInspector();
    cancelDecorPlacement();
    stopSingleClearMode();
    closeMenu();
    updateUI();
    renderRosterTab();
    saveGameAt(resetNow);
  }

  document.getElementById('btnConfirmReset')?.addEventListener('click', () => {
    performReset(0, 0);
  });

  let orientationRecoveryTimers: number[] = [];
  let resizeRafId: number | null = null;
  let lastAppliedAppHeight = '';
  let lastViewportW = 0;
  let lastViewportH = 0;
  let lastVisibleH = 0;
  let lastDpr = 0;

  function getViewportSize(): { width: number; height: number; visibleHeight: number } {
    const docEl = document.documentElement;
    const winW = window.innerWidth || (docEl ? docEl.clientWidth : 0) || 360;
    const winH = window.innerHeight || (docEl ? docEl.clientHeight : 0) || 640;
    const activeTag = document.activeElement?.tagName;
    const isInputFocused = activeTag === 'INPUT' || activeTag === 'TEXTAREA';
    const isPageZoomed = Boolean(window.visualViewport && window.visualViewport.scale > 1.02);
    const vvH = (!isInputFocused && !isPageZoomed && window.visualViewport && window.visualViewport.height > 0)
      ? window.visualViewport.height
      : winH;
    const { lvhH, fixedH } = measureCssViewportHeights();

    // In regular mobile browsers, match the true visible viewport without overflowing behind browser chrome.
    // In standalone/fullscreen PWA mode, include CSS 100lvh so the live canvas fills all the way
    // through the bottom home-indicator safe area with zero solid bottom bar seam.
    let fullH = isStandalonePwa
      ? Math.max(winH, vvH, fixedH, lvhH)
      : Math.max(winH, vvH, fixedH);

    // Additional iOS/iPadOS standalone fallback when WebKit reports innerHeight and 100lvh
    // shorter than the physical screen height by the status-bar/home-indicator safe area.
    if (isAppleTouchDevice && isStandalonePwa && window.screen) {
      const screenShort = Math.min(window.screen.width || 0, window.screen.height || 0);
      const screenLong = Math.max(window.screen.width || 0, window.screen.height || 0);
      if (screenShort > 0 && screenLong > 0) {
        const isLandscape = winW > winH;
        const expectedW = isLandscape ? screenLong : screenShort;
        const expectedH = isLandscape ? screenShort : screenLong;
        const widthMatchesFullscreen = Math.abs(winW - expectedW) <= 16;
        const gap = expectedH - fullH;
        if (widthMatchesFullscreen && gap >= -2 && gap <= 120) {
          fullH = expectedH;
        }
      }
    }

    const width = Math.max(240, Math.round(winW));
    const height = Math.max(240, Math.round(fullH));
    const visibleHeight = (isInputFocused || isPageZoomed)
      ? height
      : Math.max(240, Math.min(height, Math.round(Math.max(vvH, fullH))));
    return { width, height, visibleHeight };
  }

  function resetPhantomScroll(): void {
    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
    if (window.scrollX !== 0 || window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }
    if (document.documentElement.scrollTop !== 0) document.documentElement.scrollTop = 0;
    if (document.body.scrollTop !== 0) document.body.scrollTop = 0;
  }

  function resize(force = false): void {
    let { width, height, visibleHeight } = getViewportSize();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let desiredAppHeight = `${height}px`;

    if (lastAppliedAppHeight !== desiredAppHeight) {
      lastAppliedAppHeight = desiredAppHeight;
      document.documentElement.style.setProperty('--app-height', desiredAppHeight);
    }

    // Ensure the 2D canvas drawing buffer always covers its actual rendered CSS box
    // (e.g. if min-height: 100lvh extends taller than window.innerHeight on iOS standalone PWAs).
    if (isStandalonePwa) {
      const canvasBoxH = Math.ceil(canvas.getBoundingClientRect().height || 0);
      if (canvasBoxH > height && canvasBoxH - height <= 120) {
        height = canvasBoxH;
        visibleHeight = Math.max(visibleHeight, canvasBoxH);
        desiredAppHeight = `${height}px`;
        if (lastAppliedAppHeight !== desiredAppHeight) {
          lastAppliedAppHeight = desiredAppHeight;
          document.documentElement.style.setProperty('--app-height', desiredAppHeight);
        }
      }
    }

    const asymmetricModeChanged = syncAsymmetricSafeAreaMode(width, height);

    if (
      !force &&
      !asymmetricModeChanged &&
      width === lastViewportW &&
      height === lastViewportH &&
      visibleHeight === lastVisibleH &&
      dpr === lastDpr
    ) {
      return;
    }

    lastViewportW = width;
    lastViewportH = height;
    lastVisibleH = visibleHeight;
    lastDpr = dpr;

    viewportW = width;
    viewportH = height;
    const targetCanvasW = Math.round(width * dpr);
    const targetCanvasH = Math.round(height * dpr);
    if (canvas.width !== targetCanvasW || canvas.height !== targetCanvasH) {
      canvas.width = targetCanvasW;
      canvas.height = targetCanvasH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Auto-fit the active isometric island (7x7 or 8x8) comfortably inside narrow portrait or wide landscape screens
    const gridSize = getGridSize();
    const fitW = (width - 28) / (gridSize * BASE_TILE_W * 1.05);
    const fitH = (visibleHeight - 150) / (gridSize * BASE_TILE_H * 1.45);
    autoFitScale = Math.max(0.40, Math.min(1.15, Math.min(fitW, fitH)));

    originX = viewportW / 2;
    originY = visibleHeight / 2 + 8;

    if (gameModal && gameModal.style.display !== 'none' && !isDrawerDragging) {
      applyDrawerSnap(drawerSnapState, false);
    }
  }

  function scheduleResize(): void {
    if (resizeRafId !== null) return;
    resizeRafId = window.requestAnimationFrame(() => {
      resizeRafId = null;
      resize();
    });
  }

  function scheduleOrientationResize(): void {
    orientationRecoveryTimers.forEach(id => window.clearTimeout(id));
    orientationRecoveryTimers = [];
    resetPhantomScroll();
    resize(true);
    const recover = (): void => {
      resetPhantomScroll();
      resize();
      if (gameModal && gameModal.style.display !== 'none' && !isDrawerDragging) {
        applyDrawerSnap(drawerSnapState, false);
      }
    };
    orientationRecoveryTimers.push(window.setTimeout(recover, 120));
    orientationRecoveryTimers.push(window.setTimeout(recover, 300));
    orientationRecoveryTimers.push(window.setTimeout(recover, 550));
  }

  window.addEventListener('resize', scheduleResize);
  window.addEventListener('orientationchange', scheduleOrientationResize);
  if (screen.orientation && typeof screen.orientation.addEventListener === 'function') {
    screen.orientation.addEventListener('change', scheduleOrientationResize);
  }
  const orientationMql = typeof window.matchMedia === 'function'
    ? window.matchMedia('(orientation: landscape)')
    : null;
  if (orientationMql && typeof orientationMql.addEventListener === 'function') {
    orientationMql.addEventListener('change', scheduleOrientationResize);
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleResize);
  }
  resize(true);

  function gridToScreen(gx: number, gy: number): { x: number; y: number } {
    const gridSize = getGridSize();
    const cx = gridSize / 2;
    const cy = gridSize / 2;

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

    const gridSize = getGridSize();
    const cx = gridSize / 2;
    const cy = gridSize / 2;

    return {
      gx: relX + cx,
      gy: relY + cy
    };
  }

  function clampTileIndex(val: number): number {
    return Math.max(0, Math.min(getGridSize() - 1, Math.floor(val)));
  }

  function getCenteredTilePos(gx: number, gy: number): { x: number; y: number } {
    return gridToScreen(clampTileIndex(gx) + 0.5, clampTileIndex(gy) + 0.5);
  }

  function gatherPackAt(gx: number, gy: number, ringScreenX: number, ringScreenY: number): void {
    initAudio();
    sfx.gather();
    const nowMs = Date.now();
    if (nowMs - (state.lastWhistleBoostAt || 0) >= WHISTLE_HAPPINESS_COOLDOWN_MS) {
      state.lastWhistleBoostAt = nowMs;
      addPackHappiness(3);
      updateUI();
      requestSave();
    }
    const gridSize = getGridSize();
    dogs.forEach((dog, idx) => {
      dog.cancelSlide();
      dog.cancelDrink();
      dog.cancelEat();
      dog.onReachToy = null;
      dog.digOnArrival = false;
      if (dog.state === 'SLEEP') {
        dog.sleepCooldown = DAY_SLEEP_COOLDOWN_MIN_SEC + Math.random() * (DAY_SLEEP_COOLDOWN_MAX_SEC - DAY_SLEEP_COOLDOWN_MIN_SEC);
      }
      if (dog.isNightSleep) {
        dog.isNightSleep = false;
        dog.nightSleepUntilMs = 0;
        dog.nightSleepRollCooldown = 20 * 60 + Math.random() * 15 * 60;
      }
      const angle = (Math.PI * 2 * idx) / Math.max(1, dogs.length);
      const ringRadius = dogs.length > 1 ? 0.36 + (idx % 2) * 0.16 : 0;
      const rawGx = Math.max(0.45, Math.min(gridSize - 0.45, gx + Math.cos(angle) * ringRadius));
      const rawGy = Math.max(0.45, Math.min(gridSize - 0.45, gy + Math.sin(angle) * ringRadius));
      const safeTarget = pushOutsideAllObstacles(rawGx, rawGy, 0.1);
      dog.setWalkTarget(safeTarget.gx, safeTarget.gy);
      dog.state = 'WALK';
      dog.petBounce = 0.35;
      const dogTrait = getBreedTrait(dog.breed);
      if (dogTrait.whistlePaceBonus && dogTrait.whistlePaceBonus > 0) {
        dog.whistleBoostTimer = dogTrait.whistleDuration || 12;
        const dp = gridToScreen(dog.gx, dog.gy);
        addFloatingText(dp.x, dp.y - 34 * getScale(), 'Whistle Sprint!', '#55efc4');
      }
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

    state.totalWhistlesCount = (Number(state.totalWhistlesCount) || 0) + 1;
    recordDailyProgress('whistles', 1);
    refreshGoalBadges();
  }

  document.getElementById('btnWhistle')?.addEventListener('click', () => {
    dismissOnboardingHint();
    const gridSize = getGridSize();
    const center = gridToScreen(gridSize / 2, gridSize / 2);
    gatherPackAt(gridSize / 2, gridSize / 2, center.x, center.y);
  });

  // Multi-touch pointer tracking for pinch-to-zoom + drag rotation + tap + hold whistle
  const activePointers = new Map<number, { x: number; y: number }>();
  let pinchPointerIds: [number, number] | null = null;
  let pinchStartDist = 0;
  let pinchStartZoom = 1;
  let hadMultiTouchInGesture = false;

  let isRotating = false;
  let rotatingPointerId: number | null = null;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let lastRotateTime = 0;
  let dragTotalDist = 0;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let holdStartTime = 0;
  let holdPosition = { x: 0, y: 0 };
  const HOLD_DURATION = 900;

  function clampUserZoom(z: number): number {
    if (!Number.isFinite(z)) return 1;
    return Math.max(MIN_USER_ZOOM, Math.min(MAX_USER_ZOOM, z));
  }

  function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
  }

  function clearHoldTimer(): void {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  }

  function resetCanvasGestureState(zeroVelocity = true): void {
    activePointers.clear();
    pinchPointerIds = null;
    pinchStartDist = 0;
    hadMultiTouchInGesture = false;
    isRotating = false;
    rotatingPointerId = null;
    isPaintingStroke = false;
    lastPaintedTileKey = null;
    clearHoldTimer();
    if (zeroVelocity) {
      cameraVelocity = 0;
    }
  }

  function syncPinchAnchor(): boolean {
    if (activePointers.size < 2) {
      pinchPointerIds = null;
      pinchStartDist = 0;
      return false;
    }
    const entries = Array.from(activePointers.entries());
    const [idA, ptA] = entries[0];
    const [idB, ptB] = entries[1];
    pinchPointerIds = [idA, idB];
    const dist = Math.hypot(ptB.x - ptA.x, ptB.y - ptA.y);
    pinchStartDist = dist >= MIN_PINCH_DIST ? dist : 0;
    pinchStartZoom = userZoom;
    return true;
  }

  canvas.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    const step = Math.max(-0.14, Math.min(0.14, -e.deltaY * 0.0012));
    const factor = step === 0 ? (e.deltaY > 0 ? 0.92 : 1.08) : 1 + step;
    userZoom = clampUserZoom(userZoom * factor);
    state.zoomLevel = userZoom;
    dismissOnboardingHint();
    requestSave();
  }, { passive: false });

  // Prevent iOS Safari native page-pinch / zoom gestures everywhere in the app
  // so stray multi-touch near HUD chrome never gets the browser viewport stuck zoomed in.
  const preventNativeSafariGesture = (e: Event): void => {
    e.preventDefault();
  };
  document.addEventListener('gesturestart', preventNativeSafariGesture, { passive: false });
  document.addEventListener('gesturechange', preventNativeSafariGesture, { passive: false });
  document.addEventListener('gestureend', preventNativeSafariGesture, { passive: false });

  // Suppress native long-press context menu and text-selection magnifier outside text inputs.
  document.addEventListener('contextmenu', (e: MouseEvent) => {
    if (!isEditableTarget(e.target)) {
      e.preventDefault();
    }
  });
  document.addEventListener('selectstart', (e: Event) => {
    if (!isEditableTarget(e.target)) {
      e.preventDefault();
    }
  });
  document.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length >= 2) {
      e.preventDefault();
    }
  }, { passive: false });

  // Suppress iOS WebKit long-press magnifying loupe & native pinch/scroll directly on the park canvas.
  canvas.addEventListener('touchstart', (e: TouchEvent) => {
    e.preventDefault();
    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLElement && isEditableTarget(activeEl)) {
      activeEl.blur();
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (e: TouchEvent) => {
    e.preventDefault();
  }, { passive: false });
  let lastPointerDownAt = 0;
  const syncTouchEndCleanup = (e: TouchEvent): void => {
    if (e.touches.length === 0) {
      const endedAt = performance.now();
      window.setTimeout(() => {
        if (activePointers.size > 0 && lastPointerDownAt <= endedAt) {
          resetCanvasGestureState(true);
        }
      }, 60);
    }
  };
  canvas.addEventListener('touchend', syncTouchEndCleanup, { passive: true });
  canvas.addEventListener('touchcancel', syncTouchEndCleanup, { passive: true });

  window.addEventListener('blur', () => resetCanvasGestureState(true));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      resetCanvasGestureState(true);
    }
  });

  let isPaintingStroke = false;
  let lastPaintedTileKey: string | null = null;
  let didPaintDuringStroke = false;

  function paintTileAtScreenPos(clientX: number, clientY: number): boolean {
    const rect = canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;
    const gridPos = screenToGrid(clickX, clickY);
    const gridSize = getGridSize();
    if (
      gridPos.gx < 0 || gridPos.gx >= gridSize ||
      gridPos.gy < 0 || gridPos.gy >= gridSize
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
    return true;
  }

  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    lastPointerDownAt = performance.now();
    if (e.pointerType === 'mouse' && activePointers.size > 0) {
      resetCanvasGestureState(true);
    }
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }

    if (activePointers.size >= 2) {
      hadMultiTouchInGesture = true;
      clearHoldTimer();
      isRotating = false;
      rotatingPointerId = null;
      cameraVelocity = 0;
      isPaintingStroke = false;
      lastPaintedTileKey = null;
      if (activePointers.size === 2 || !pinchPointerIds) {
        syncPinchAnchor();
      }
      return;
    }

    if (hadMultiTouchInGesture) {
      cameraVelocity = 0;
      return;
    }

    if (state.isPaintingTiles) {
      initAudio();
      dismissOnboardingHint();
      isRotating = false;
      rotatingPointerId = null;
      cameraVelocity = 0;
      isPaintingStroke = true;
      lastPaintedTileKey = null;
      didPaintDuringStroke = false;
      paintTileAtScreenPos(e.clientX, e.clientY);
      return;
    }

    isRotating = true;
    rotatingPointerId = e.pointerId;
    cameraVelocity = 0;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    lastRotateTime = performance.now();
    dragTotalDist = 0;

    holdStartTime = lastRotateTime;
    holdPosition = { x: e.clientX, y: e.clientY };

    clearHoldTimer();
    if (!state.isClearingDecor && !state.isPlacingDecor) {
      holdTimer = setTimeout(() => {
        holdTimer = null;
        if (activePointers.size !== 1 || hadMultiTouchInGesture || dragTotalDist >= 12) return;
        const rect = canvas.getBoundingClientRect();
        const clickX = holdPosition.x - rect.left;
        const clickY = holdPosition.y - rect.top;
        const targetGrid = screenToGrid(clickX, clickY);
        gatherPackAt(targetGrid.gx, targetGrid.gy, clickX, clickY);
        isRotating = false;
        rotatingPointerId = null;
        cameraVelocity = 0;
        dismissOnboardingHint();
      }, HOLD_DURATION);
    }
  });

  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size >= 2) {
      hadMultiTouchInGesture = true;
      isRotating = false;
      rotatingPointerId = null;
      cameraVelocity = 0;
      clearHoldTimer();

      if (
        !pinchPointerIds ||
        !activePointers.has(pinchPointerIds[0]) ||
        !activePointers.has(pinchPointerIds[1])
      ) {
        syncPinchAnchor();
        return;
      }

      const ptA = activePointers.get(pinchPointerIds[0])!;
      const ptB = activePointers.get(pinchPointerIds[1])!;
      const dist = Math.hypot(ptB.x - ptA.x, ptB.y - ptA.y);

      if (pinchStartDist < MIN_PINCH_DIST) {
        if (dist >= MIN_PINCH_DIST) {
          pinchStartDist = dist;
          pinchStartZoom = userZoom;
        }
        return;
      }

      if (dist >= MIN_PINCH_DIST * 0.65) {
        const rawRatio = dist / pinchStartDist;
        if (Number.isFinite(rawRatio) && rawRatio > 0) {
          const desiredZoom = clampUserZoom(pinchStartZoom * rawRatio);
          const maxStep = 0.16;
          const nextZoom = clampUserZoom(
            userZoom + Math.max(-maxStep, Math.min(maxStep, desiredZoom - userZoom))
          );
          userZoom = nextZoom;
          state.zoomLevel = userZoom;

          // Re-anchor at zoom limits so reversing pinch direction immediately zooms back out/in.
          if (
            (userZoom <= MIN_USER_ZOOM + 0.001 && rawRatio < 1) ||
            (userZoom >= MAX_USER_ZOOM - 0.001 && rawRatio > 1)
          ) {
            pinchStartDist = Math.max(MIN_PINCH_DIST, dist);
            pinchStartZoom = userZoom;
          }
          dismissOnboardingHint();
          requestSave();
        }
      }
      return;
    }

    // Ignore residual single-finger movement after a multi-touch pinch until all fingers lift.
    if (hadMultiTouchInGesture) {
      isRotating = false;
      rotatingPointerId = null;
      cameraVelocity = 0;
      return;
    }

    if (state.isPaintingTiles && isPaintingStroke && activePointers.size === 1) {
      paintTileAtScreenPos(e.clientX, e.clientY);
      return;
    }

    if (!isRotating || e.pointerId !== rotatingPointerId) return;

    const moveDist = Math.hypot(e.clientX - lastMouseX, e.clientY - lastMouseY);
    const distFromHold = Math.hypot(e.clientX - holdPosition.x, e.clientY - holdPosition.y);
    dragTotalDist += moveDist;

    if ((moveDist > 10 || dragTotalDist > 12 || distFromHold > 14) && holdTimer) {
      clearHoldTimer();
    }

    const rawDeltaX = e.clientX - lastMouseX;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    const now = performance.now();
    const moveDt = Math.max(0.008, Math.min(0.1, (now - lastRotateTime) / 1000));
    lastRotateTime = now;

    if (dragTotalDist >= 12 && Math.abs(rawDeltaX) > 0) {
      // Clamp per-event horizontal jump to eliminate multi-touch handoff or frame-spike spins.
      const clampedDeltaX = Math.max(-64, Math.min(64, rawDeltaX));
      const dAngle = clampedDeltaX * 0.0075;
      cameraAngle += dAngle;
      const instantVel = Math.max(
        -MAX_CAMERA_VELOCITY,
        Math.min(MAX_CAMERA_VELOCITY, dAngle / moveDt)
      );
      cameraVelocity = cameraVelocity * 0.45 + instantVel * 0.55;
      state.cameraAngle = cameraAngle;
      dismissOnboardingHint();
      requestSave();
    }
  });

  function clearPointer(e: PointerEvent): boolean {
    const wasMultiTouch = hadMultiTouchInGesture;
    activePointers.delete(e.pointerId);
    if (e.pointerId === rotatingPointerId) {
      rotatingPointerId = null;
      isRotating = false;
    }
    if (activePointers.size < 2) {
      pinchPointerIds = null;
      pinchStartDist = 0;
    } else if (
      pinchPointerIds &&
      (pinchPointerIds[0] === e.pointerId || pinchPointerIds[1] === e.pointerId)
    ) {
      syncPinchAnchor();
    }
    if (activePointers.size === 0) {
      hadMultiTouchInGesture = false;
    }
    return wasMultiTouch;
  }

  canvas.addEventListener('pointerup', (e: PointerEvent) => {
    const wasRotatingThisPointer = isRotating && e.pointerId === rotatingPointerId;
    const wasMultiTouch = clearPointer(e);
    clearHoldTimer();
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }

    if (isPaintingStroke) {
      isPaintingStroke = false;
      lastPaintedTileKey = null;
      if (didPaintDuringStroke) {
        didPaintDuringStroke = false;
        updateUI();
        saveGame();
      }
      return;
    }

    if (wasMultiTouch) {
      cameraVelocity = 0;
      if (activePointers.size === 0) {
        state.zoomLevel = userZoom;
        saveGame();
      }
      return;
    }

    if (!wasRotatingThisPointer) {
      return;
    }

    // If the player paused their finger before lifting, stop inertia cleanly.
    if (performance.now() - lastRotateTime > 85 || dragTotalDist < 12) {
      cameraVelocity = 0;
    } else {
      cameraVelocity = Math.max(-MAX_CAMERA_VELOCITY, Math.min(MAX_CAMERA_VELOCITY, cameraVelocity));
    }

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

      const gridSize = getGridSize();

      if (state.isPlacingDecor && state.activeDecorType) {
        if (
          gridPos.gx >= 0 && gridPos.gx < gridSize &&
          gridPos.gy >= 0 && gridPos.gy < gridSize
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
            return;
          }
          const placedType = state.activeDecorType;
          state.placedDecorations.push({
            type: placedType,
            gx: check.gx,
            gy: check.gy
          });
          invalidateNavCache();
          nudgeEntitiesOutsideObstacles();
          if (placedType === 'slide') {
            dogs.forEach(d => {
              d.slideCooldown = Math.min(d.slideCooldown, 1.2);
            });
          }
          cancelDecorPlacement();
          addPackHappiness(2.5);
          sfx.gather();
          updateUI();
          saveGame();
        }
        return;
      }

      if (state.isClearingDecor) {
        if (
          gridPos.gx >= 0 && gridPos.gx < gridSize &&
          gridPos.gy >= 0 && gridPos.gy < gridSize
        ) {
          clearSingleTileAt(clampTileIndex(gridPos.gx), clampTileIndex(gridPos.gy));
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
        gridPos.gx >= 0 && gridPos.gx < gridSize &&
        gridPos.gy >= 0 && gridPos.gy < gridSize
      ) {
        const { magicBonus } = getPerkMultipliers();
        const decorMagic = getDecorBonuses().magicAdd;
        const weatherMagic = getCurrentWeather().magicAdd;
        const moodMagic = getPackHappinessInfo().magicAdd;
        const packMagicAura = getPackTraitBonuses().packMagicAura;
        const kongActive = state.kongTimer > 0;
        const manualMagicChance = Math.min(
          MAX_MAGIC_CHANCE,
          state.magicChance + magicBonus + decorMagic + weatherMagic + moodMagic + packMagicAura
        );
        const naturalMagic = Math.random() < manualMagicChance;
        const cupMult = getActiveCupMult();
        const tapBones = Math.max(1, Math.round(getEffectiveDigPower() * cupMult * 10) / 10);

        dogs.forEach(d => {
          const t = getBreedTrait(d.breed);
          if (t.tapHypePaceBonus && t.tapHypePaceBonus > 0) {
            const wasActive = d.tapHypeTimer > 0;
            d.tapHypeTimer = t.tapHypeDuration || 10;
            if (!wasActive) {
              const dp = gridToScreen(d.gx, d.gy);
              addFloatingText(dp.x, dp.y - 34 * getScale(), 'Tap Hype!', '#ffeaa7');
            }
          }
        });

        tileRipples.push({
          gx: clampTileIndex(gridPos.gx),
          gy: clampTileIndex(gridPos.gy),
          age: 0,
          duration: 0.45,
          color: (kongActive || naturalMagic) ? '#ffeaa7' : '#55efc4'
        });

        if (kongActive) {
          creditManualTapBreakEven(tapBones);
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
          if (!naturalMagic) {
            creditManualTapBreakEven(tapBones);
          }
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
        state.totalDigsCount = (Number(state.totalDigsCount) || 0) + 1;
        state.totalTapsCount = (Number(state.totalTapsCount) || 0) + 1;
        recordDailyProgress('taps', 1);
        recordDailyProgress('digs', 1);
        refreshGoalBadges();
      }
    }
  });

  const handlePointerAbort = (e: PointerEvent): void => {
    clearPointer(e);
    clearHoldTimer();
    cameraVelocity = 0;
    if (isPaintingStroke) {
      isPaintingStroke = false;
      lastPaintedTileKey = null;
      if (didPaintDuringStroke) {
        didPaintDuringStroke = false;
        updateUI();
        saveGame();
      }
    }
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    requestSave();
  };
  canvas.addEventListener('pointercancel', handlePointerAbort);
  canvas.addEventListener('lostpointercapture', (e: PointerEvent) => {
    if (activePointers.has(e.pointerId)) {
      handlePointerAbort(e);
    }
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

  interface DrinkTarget {
    kind: 'bowl' | 'fountain';
    key: string;
    gx?: number;
    gy?: number;
    waterGx: number;
    waterGy: number;
    standGx: number;
    standGy: number;
  }

  function isNearSlideZone(gx: number, gy: number): boolean {
    if (!Array.isArray(state.placedDecorations)) return false;
    return state.placedDecorations.some(d => {
      if (d.type !== 'slide') return false;
      return (
        gx >= d.gx - 0.35 &&
        gx <= d.gx + 2.45 &&
        gy >= d.gy - 0.35 &&
        gy <= d.gy + 1.45
      );
    });
  }

  interface ObstacleBounds {
    minGx: number;
    maxGx: number;
    minGy: number;
    maxGy: number;
  }

  type StaticObstacle =
    | { kind: 'box'; key: string; minGx: number; maxGx: number; minGy: number; maxGy: number }
    | { kind: 'circle'; key: string; cx: number; cy: number; r: number };

  const NAV_SUBDIV = 2;
  const NAV_CELL = 1 / NAV_SUBDIV;
  const NAV_AGENT_PAD = 0.08;
  const DOG_AVOID_RADIUS = 0.64;
  const DOG_MIN_SEPARATION = 0.35;

  function getNavSize(): number {
    return getGridSize() * NAV_SUBDIV;
  }

  let navCacheVersion = 0;
  let navCacheBuiltForVersion = -1;
  let cachedStaticObstacles: StaticObstacle[] = [];
  let cachedNavBlocked: Uint8Array = new Uint8Array(BASE_GRID_SIZE * NAV_SUBDIV * BASE_GRID_SIZE * NAV_SUBDIV);

  function invalidateNavCache(): void {
    navCacheVersion += 1;
  }

  function getDoghouseBlockedBounds(): ObstacleBounds {
    if (hasGrandDoghousePlaced()) {
      // Full 2x2 Grand Doghouse Manor footprint: tiles (0,0), (1,0), (0,1), (1,1)
      return { minGx: 0.0, maxGx: 2.04, minGy: 0.0, maxGy: 2.04 };
    }
    // Classic 1-tile doghouse footprint: tile (1,1)
    return {
      minGx: DOGHOUSE_TILE.gx - 0.04,
      maxGx: DOGHOUSE_TILE.gx + 1.04,
      minGy: DOGHOUSE_TILE.gy - 0.04,
      maxGy: DOGHOUSE_TILE.gy + 1.04
    };
  }

  function isInsideDoghouseObstacle(gx: number, gy: number): boolean {
    const b = getDoghouseBlockedBounds();
    return gx > b.minGx && gx < b.maxGx && gy > b.minGy && gy < b.maxGy;
  }

  function pushOutsideDoghouseObstacle(gx: number, gy: number): { gx: number; gy: number } {
    const gridSize = getGridSize();
    const clampedGx = Math.max(0.32, Math.min(gridSize - 0.32, gx));
    const clampedGy = Math.max(0.32, Math.min(gridSize - 0.32, gy));
    const b = getDoghouseBlockedBounds();
    if (!(clampedGx > b.minGx && clampedGx < b.maxGx && clampedGy > b.minGy && clampedGy < b.maxGy)) {
      return { gx: clampedGx, gy: clampedGy };
    }

    const candidates: Array<{ gx: number; gy: number; dist: number }> = [
      { gx: b.maxGx + 0.04, gy: clampedGy, dist: Math.abs(b.maxGx + 0.04 - clampedGx) },
      { gx: clampedGx, gy: b.maxGy + 0.04, dist: Math.abs(b.maxGy + 0.04 - clampedGy) }
    ];
    if (b.minGx >= 0.42) {
      candidates.push({ gx: b.minGx - 0.04, gy: clampedGy, dist: Math.abs(clampedGx - (b.minGx - 0.04)) });
    }
    if (b.minGy >= 0.42) {
      candidates.push({ gx: clampedGx, gy: b.minGy - 0.04, dist: Math.abs(clampedGy - (b.minGy - 0.04)) });
    }
    candidates.sort((a, c) => a.dist - c.dist);
    return {
      gx: Math.max(0.32, Math.min(gridSize - 0.32, candidates[0].gx)),
      gy: Math.max(0.32, Math.min(gridSize - 0.32, candidates[0].gy))
    };
  }

  function ensureNavCache(): void {
    if (navCacheBuiltForVersion === navCacheVersion) return;
    navCacheBuiltForVersion = navCacheVersion;

    const obstacles: StaticObstacle[] = [];
    const dh = getDoghouseBlockedBounds();
    obstacles.push({
      kind: 'box',
      key: 'doghouse',
      minGx: dh.minGx,
      maxGx: dh.maxGx,
      minGy: dh.minGy,
      maxGy: dh.maxGy
    });

    const bowlPos = getWaterBowlPos();
    obstacles.push({
      kind: 'circle',
      key: 'bowl',
      cx: bowlPos.gx,
      cy: bowlPos.gy,
      r: 0.15
    });

    const sp = state.starterProps || createDefaultStarterProps();
    if (sp.showTree !== false) {
      obstacles.push({
        kind: 'circle',
        key: 'starterTree',
        cx: STARTER_TREE_TILE.gx + 0.5,
        cy: STARTER_TREE_TILE.gy + 0.5,
        r: 0.36
      });
    }

    mushrooms.forEach((m, idx) => {
      if (sp.showMushrooms[idx] !== false) {
        obstacles.push({
          kind: 'circle',
          key: `mushroom:${idx}`,
          cx: m.gx + 0.5,
          cy: m.gy + 0.5,
          r: 0.30
        });
      }
    });

    if (Array.isArray(state.placedDecorations)) {
      state.placedDecorations.forEach(dec => {
        if (dec.type === 'flowers' || dec.type === 'doghouseManor') return;
        if (dec.type === 'fountain') {
          obstacles.push({
            kind: 'circle',
            key: `fountain:${dec.gx},${dec.gy}`,
            cx: dec.gx + 0.5,
            cy: dec.gy + 0.5,
            r: 0.42
          });
        } else if (dec.type === 'slide') {
          // Solid tower & chute body; leaves ladder entry (gx+0.26) and landing (gx+1.66) clear
          obstacles.push({
            kind: 'box',
            key: `slide:${dec.gx},${dec.gy}`,
            minGx: dec.gx + 0.28,
            maxGx: dec.gx + 1.58,
            minGy: dec.gy + 0.18,
            maxGy: dec.gy + 0.82
          });
        } else if (dec.type === 'tree') {
          obstacles.push({
            kind: 'circle',
            key: `tree:${dec.gx},${dec.gy}`,
            cx: dec.gx + 0.5,
            cy: dec.gy + 0.5,
            r: 0.36
          });
        } else if (dec.type === 'hydrant' || dec.type === 'goldenHydrant') {
          obstacles.push({
            kind: 'circle',
            key: `${dec.type}:${dec.gx},${dec.gy}`,
            cx: dec.gx + 0.5,
            cy: dec.gy + 0.5,
            r: 0.30
          });
        } else if (dec.type === 'lamp') {
          obstacles.push({
            kind: 'circle',
            key: `lamp:${dec.gx},${dec.gy}`,
            cx: dec.gx + 0.5,
            cy: dec.gy + 0.5,
            r: 0.28
          });
        }
      });
    }

    cachedStaticObstacles = obstacles;

    const gridSize = getGridSize();
    const navSize = getNavSize();
    const blocked = new Uint8Array(navSize * navSize);
    for (let cy = 0; cy < navSize; cy++) {
      const wy = Math.max(0.32, Math.min(gridSize - 0.32, (cy + 0.5) * NAV_CELL));
      for (let cx = 0; cx < navSize; cx++) {
        const wx = Math.max(0.32, Math.min(gridSize - 0.32, (cx + 0.5) * NAV_CELL));
        let isBlocked = false;
        for (let i = 0; i < obstacles.length; i++) {
          if (pointIntersectsObstacle(wx, wy, obstacles[i], NAV_AGENT_PAD)) {
            isBlocked = true;
            break;
          }
        }
        blocked[cy * navSize + cx] = isBlocked ? 1 : 0;
      }
    }
    cachedNavBlocked = blocked;
  }

  function pointIntersectsObstacle(gx: number, gy: number, obs: StaticObstacle, pad = 0): boolean {
    if (obs.kind === 'box') {
      return (
        gx > obs.minGx - pad &&
        gx < obs.maxGx + pad &&
        gy > obs.minGy - pad &&
        gy < obs.maxGy + pad
      );
    }
    const r = obs.r + pad;
    const dx = gx - obs.cx;
    const dy = gy - obs.cy;
    return dx * dx + dy * dy < r * r;
  }

  function isPointBlockedByObstacle(gx: number, gy: number, pad = 0, ignoreKey?: string): boolean {
    ensureNavCache();
    for (let i = 0; i < cachedStaticObstacles.length; i++) {
      const obs = cachedStaticObstacles[i];
      if (ignoreKey && obs.key === ignoreKey) continue;
      if (pointIntersectsObstacle(gx, gy, obs, pad)) return true;
    }
    return false;
  }

  function pushOutsideAllObstacles(
    gx: number,
    gy: number,
    pad = 0.03,
    ignoreKey?: string
  ): { gx: number; gy: number } {
    ensureNavCache();
    const gridSize = getGridSize();
    let x = Math.max(0.32, Math.min(gridSize - 0.32, gx));
    let y = Math.max(0.32, Math.min(gridSize - 0.32, gy));

    for (let iter = 0; iter < 5; iter++) {
      let moved = false;
      for (let i = 0; i < cachedStaticObstacles.length; i++) {
        const obs = cachedStaticObstacles[i];
        if (ignoreKey && obs.key === ignoreKey) continue;
        if (!pointIntersectsObstacle(x, y, obs, pad)) continue;

        moved = true;
        if (obs.kind === 'box') {
          const minX = obs.minGx - pad;
          const maxX = obs.maxGx + pad;
          const minY = obs.minGy - pad;
          const maxY = obs.maxGy + pad;
          const options: Array<{ x: number; y: number; dist: number }> = [
            { x: maxX + 0.03, y, dist: Math.abs(maxX + 0.03 - x) },
            { x, y: maxY + 0.03, dist: Math.abs(maxY + 0.03 - y) }
          ];
          if (minX >= 0.36) options.push({ x: minX - 0.03, y, dist: Math.abs(x - (minX - 0.03)) });
          if (minY >= 0.36) options.push({ x, y: minY - 0.03, dist: Math.abs(y - (minY - 0.03)) });
          options.sort((a, b) => a.dist - b.dist);
          x = options[0].x;
          y = options[0].y;
        } else {
          const dx = x - obs.cx;
          const dy = y - obs.cy;
          const d = Math.hypot(dx, dy);
          const targetR = obs.r + pad + 0.03;
          if (d < 1e-4) {
            x = obs.cx + targetR;
          } else {
            x = obs.cx + (dx / d) * targetR;
            y = obs.cy + (dy / d) * targetR;
          }
        }
        x = Math.max(0.32, Math.min(gridSize - 0.32, x));
        y = Math.max(0.32, Math.min(gridSize - 0.32, y));
      }
      if (!moved) break;
    }

    // If corner-trapped between obstacles, snap cleanly to the nearest walkable nav sub-cell
    if (isPointBlockedByObstacle(x, y, 0.01, ignoreKey)) {
      const cell = findNearestWalkableCell(x, y);
      if (cell) {
        return navCellToWorld(cell.cx, cell.cy);
      }
    }

    return { gx: x, gy: y };
  }

  function segmentIntersectsBox(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    b: ObstacleBounds
  ): boolean {
    const dx = x1 - x0;
    const dy = y1 - y0;
    let tMin = 0;
    let tMax = 1;

    if (Math.abs(dx) < 1e-6) {
      if (x0 <= b.minGx || x0 >= b.maxGx) return false;
    } else {
      const invD = 1 / dx;
      let t1 = (b.minGx - x0) * invD;
      let t2 = (b.maxGx - x0) * invD;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin >= tMax) return false;
    }

    if (Math.abs(dy) < 1e-6) {
      if (y0 <= b.minGy || y0 >= b.maxGy) return false;
    } else {
      const invD = 1 / dy;
      let t1 = (b.minGy - y0) * invD;
      let t2 = (b.maxGy - y0) * invD;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin >= tMax) return false;
    }

    return tMax > 0.001 && tMin < 0.999;
  }

  function segmentIntersectsCircle(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    cx: number,
    cy: number,
    r: number
  ): boolean {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 1e-8) {
      t = Math.max(0, Math.min(1, ((cx - x0) * dx + (cy - y0) * dy) / lenSq));
    }
    const nearX = x0 + t * dx;
    const nearY = y0 + t * dy;
    const ox = nearX - cx;
    const oy = nearY - cy;
    return ox * ox + oy * oy < r * r;
  }

  function segmentBlockedByObstacles(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    pad = 0.04,
    ignoreKey?: string
  ): boolean {
    ensureNavCache();
    for (let i = 0; i < cachedStaticObstacles.length; i++) {
      const obs = cachedStaticObstacles[i];
      if (ignoreKey && obs.key === ignoreKey) continue;
      if (obs.kind === 'box') {
        if (segmentIntersectsBox(x0, y0, x1, y1, {
          minGx: obs.minGx - pad,
          maxGx: obs.maxGx + pad,
          minGy: obs.minGy - pad,
          maxGy: obs.maxGy + pad
        })) {
          return true;
        }
      } else if (segmentIntersectsCircle(x0, y0, x1, y1, obs.cx, obs.cy, obs.r + pad)) {
        return true;
      }
    }
    return false;
  }

  function worldToNavCell(gx: number, gy: number): { cx: number; cy: number } {
    const navSize = getNavSize();
    return {
      cx: Math.max(0, Math.min(navSize - 1, Math.floor(gx * NAV_SUBDIV))),
      cy: Math.max(0, Math.min(navSize - 1, Math.floor(gy * NAV_SUBDIV)))
    };
  }

  function navCellToWorld(cx: number, cy: number): { gx: number; gy: number } {
    const gridSize = getGridSize();
    return {
      gx: Math.max(0.34, Math.min(gridSize - 0.34, (cx + 0.5) * NAV_CELL)),
      gy: Math.max(0.34, Math.min(gridSize - 0.34, (cy + 0.5) * NAV_CELL))
    };
  }

  function findNearestWalkableCell(gx: number, gy: number): { cx: number; cy: number } | null {
    ensureNavCache();
    const navSize = getNavSize();
    const base = worldToNavCell(gx, gy);
    if (cachedNavBlocked[base.cy * navSize + base.cx] === 0) {
      return base;
    }

    let bestCx = -1;
    let bestCy = -1;
    let bestDistSq = Infinity;
    for (let radius = 1; radius <= 5; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const cx = base.cx + dx;
          const cy = base.cy + dy;
          if (cx < 0 || cx >= navSize || cy < 0 || cy >= navSize) continue;
          if (cachedNavBlocked[cy * navSize + cx] !== 0) continue;
          const wp = navCellToWorld(cx, cy);
          const distSq = (wp.gx - gx) * (wp.gx - gx) + (wp.gy - gy) * (wp.gy - gy);
          if (distSq < bestDistSq) {
            bestDistSq = distSq;
            bestCx = cx;
            bestCy = cy;
          }
        }
      }
      if (bestCx >= 0) return { cx: bestCx, cy: bestCy };
    }
    return null;
  }

  function findNavPath(
    startGx: number,
    startGy: number,
    goalGx: number,
    goalGy: number
  ): Array<{ gx: number; gy: number }> | null {
    ensureNavCache();
    // Fast path: direct line-of-sight unobstructed
    if (!segmentBlockedByObstacles(startGx, startGy, goalGx, goalGy, 0.05)) {
      return [{ gx: goalGx, gy: goalGy }];
    }

    const startCell = findNearestWalkableCell(startGx, startGy);
    const goalCell = findNearestWalkableCell(goalGx, goalGy);
    if (!startCell || !goalCell) return null;

    const navSize = getNavSize();
    const total = navSize * navSize;
    const startIdx = startCell.cy * navSize + startCell.cx;
    const goalIdx = goalCell.cy * navSize + goalCell.cx;

    if (startIdx === goalIdx) {
      return [{ gx: goalGx, gy: goalGy }];
    }

    const gScore = new Float32Array(total);
    const fScore = new Float32Array(total);
    const cameFrom = new Int16Array(total);
    const closed = new Uint8Array(total);
    const inOpen = new Uint8Array(total);
    gScore.fill(1e9);
    fScore.fill(1e9);
    cameFrom.fill(-1);

    const openList: number[] = [startIdx];
    gScore[startIdx] = 0;
    fScore[startIdx] = Math.hypot(goalCell.cx - startCell.cx, goalCell.cy - startCell.cy);
    inOpen[startIdx] = 1;

    const dirs: ReadonlyArray<[number, number, number]> = [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 1],
      [0, -1, 1],
      [1, 1, 1.41421356],
      [1, -1, 1.41421356],
      [-1, 1, 1.41421356],
      [-1, -1, 1.41421356]
    ];

    let found = false;
    while (openList.length > 0) {
      let bestPos = 0;
      let current = openList[0];
      let bestF = fScore[current];
      for (let i = 1; i < openList.length; i++) {
        const idx = openList[i];
        if (fScore[idx] < bestF) {
          bestF = fScore[idx];
          current = idx;
          bestPos = i;
        }
      }

      if (current === goalIdx) {
        found = true;
        break;
      }

      openList[bestPos] = openList[openList.length - 1];
      openList.pop();
      inOpen[current] = 0;
      closed[current] = 1;

      const cx = current % navSize;
      const cy = (current - cx) / navSize;

      for (let d = 0; d < dirs.length; d++) {
        const nx = cx + dirs[d][0];
        const ny = cy + dirs[d][1];
        if (nx < 0 || nx >= navSize || ny < 0 || ny >= navSize) continue;
        const nIdx = ny * navSize + nx;
        if (closed[nIdx] || cachedNavBlocked[nIdx]) continue;

        // Prevent diagonal corner cutting across solid obstacles
        if (dirs[d][0] !== 0 && dirs[d][1] !== 0) {
          if (cachedNavBlocked[cy * navSize + nx] || cachedNavBlocked[ny * navSize + cx]) {
            continue;
          }
        }

        const tentativeG = gScore[current] + dirs[d][2];
        if (tentativeG < gScore[nIdx]) {
          cameFrom[nIdx] = current;
          gScore[nIdx] = tentativeG;
          fScore[nIdx] = tentativeG + Math.hypot(goalCell.cx - nx, goalCell.cy - ny);
          if (!inOpen[nIdx]) {
            openList.push(nIdx);
            inOpen[nIdx] = 1;
          }
        }
      }
    }

    if (!found) return null;

    const rawWaypoints: Array<{ gx: number; gy: number }> = [];
    let cur = goalIdx;
    while (cur !== -1 && cur !== startIdx) {
      const cx = cur % navSize;
      const cy = (cur - cx) / navSize;
      rawWaypoints.push(navCellToWorld(cx, cy));
      cur = cameFrom[cur];
    }
    rawWaypoints.reverse();

    // Ensure final waypoint is the exact destination
    if (rawWaypoints.length === 0) {
      rawWaypoints.push({ gx: goalGx, gy: goalGy });
    } else {
      const last = rawWaypoints[rawWaypoints.length - 1];
      if (Math.hypot(last.gx - goalGx, last.gy - goalGy) > 0.04) {
        rawWaypoints.push({ gx: goalGx, gy: goalGy });
      }
    }

    // String-pulling / line-of-sight smoothing for natural diagonal curves
    const smoothed: Array<{ gx: number; gy: number }> = [];
    let anchorX = startGx;
    let anchorY = startGy;
    let i = 0;
    while (i < rawWaypoints.length) {
      let furthest = i;
      for (let j = rawWaypoints.length - 1; j > i; j--) {
        if (!segmentBlockedByObstacles(anchorX, anchorY, rawWaypoints[j].gx, rawWaypoints[j].gy, 0.05)) {
          furthest = j;
          break;
        }
      }
      const nextWp = rawWaypoints[furthest];
      smoothed.push(nextWp);
      anchorX = nextWp.gx;
      anchorY = nextWp.gy;
      i = furthest + 1;
    }

    return smoothed;
  }

  function getReachableOpenPositions(startGx: number, startGy: number): Array<{ gx: number; gy: number }> {
    ensureNavCache();
    const startCell = findNearestWalkableCell(startGx, startGy);
    if (!startCell) return [];

    const navSize = getNavSize();
    const visited = new Uint8Array(navSize * navSize);
    const startIdx = startCell.cy * navSize + startCell.cx;
    const queue: number[] = [startIdx];
    visited[startIdx] = 1;

    const positions: Array<{ gx: number; gy: number }> = [];
    let head = 0;
    const orthDirs: ReadonlyArray<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (head < queue.length) {
      const cur = queue[head++];
      const cx = cur % navSize;
      const cy = (cur - cx) / navSize;
      positions.push(navCellToWorld(cx, cy));
      for (let d = 0; d < orthDirs.length; d++) {
        const nx = cx + orthDirs[d][0];
        const ny = cy + orthDirs[d][1];
        if (nx < 0 || nx >= navSize || ny < 0 || ny >= navSize) continue;
        const nIdx = ny * navSize + nx;
        if (visited[nIdx] || cachedNavBlocked[nIdx]) continue;
        visited[nIdx] = 1;
        queue.push(nIdx);
      }
    }
    return positions;
  }

  function nudgeEntitiesOutsideObstacles(): void {
    ensureNavCache();
    dogs.forEach(d => {
      if (d.state === 'SLIDE_CLIMB' || d.state === 'SLIDE_DOWN') return;
      if (isPointBlockedByObstacle(d.gx, d.gy, 0.02)) {
        const safe = pushOutsideAllObstacles(d.gx, d.gy, 0.08);
        d.gx = safe.gx;
        d.gy = safe.gy;
        if (d.state === 'SLEEP' || d.state === 'LAY' || d.state === 'SIT' || d.state === 'DRINK' || d.state === 'EAT') {
          if (d.state === 'SLEEP') {
            d.sleepCooldown = DAY_SLEEP_COOLDOWN_MIN_SEC + Math.random() * (DAY_SLEEP_COOLDOWN_MAX_SEC - DAY_SLEEP_COOLDOWN_MIN_SEC);
          }
          d.cancelDrink();
          d.cancelEat();
          d.isNightSleep = false;
          d.nightSleepUntilMs = 0;
          d.state = 'IDLE';
          d.timer = 0.5;
        }
      }
      if (isPointBlockedByObstacle(d.targetGx, d.targetGy, 0.02)) {
        const safeT = pushOutsideAllObstacles(d.targetGx, d.targetGy, 0.08);
        d.targetGx = safeT.gx;
        d.targetGy = safeT.gy;
      }
      d.clearNavPath();
    });

    worldTreats.forEach(t => {
      if (t.consumed) return;
      if (isPointBlockedByObstacle(t.gx, t.gy, 0.04)) {
        const safeT = pushOutsideAllObstacles(t.gx, t.gy, 0.08);
        t.gx = safeT.gx;
        t.gy = safeT.gy;
      }
    });

    [tennisBall, frisbee, duck].forEach(toy => {
      if (isPointBlockedByObstacle(toy.gx, toy.gy, 0.04)) {
        const safe = pushOutsideAllObstacles(toy.gx, toy.gy, 0.1);
        toy.gx = safe.gx;
        toy.gy = safe.gy;
      }
      if (isPointBlockedByObstacle(toy.targetGx, toy.targetGy, 0.04)) {
        const safeT = pushOutsideAllObstacles(toy.targetGx, toy.targetGy, 0.1);
        toy.targetGx = safeT.gx;
        toy.targetGy = safeT.gy;
      }
    });
  }

  function getBreedDrinkReachPx(breed: string): number {
    if (breed === 'borzoi') return 23.5;
    if (breed === 'irishWolfhound' || breed === 'wolfhound') return 22.5;
    if (breed === 'afghanHound') return 22.4;
    if (breed === 'chihuahua' || breed === 'pug') return 15.8;
    const sizeClass = BREED_BY_KEY[breed]?.sizeClass || 'standard';
    if (sizeClass === 'toy') return 17.2;
    if (sizeClass === 'giant') return 21.8;
    return 20.5;
  }

  /**
   * Calibrated horizontal distance (unscaled px) from dog origin to treat center so
   * the dipped muzzle reaches the near edge of the snack while keeping the treat clearly visible.
   */
  const EAT_TREAT_DY_PX = -2.6;

  function getBreedTreatReachPx(breed: string): number {
    if (breed === 'borzoi' || breed === 'irishWolfhound' || breed === 'wolfhound' || breed === 'greatDane') {
      return 32.0;
    }
    if (
      breed === 'afghanHound' ||
      breed === 'shepherd' ||
      breed === 'malinois' ||
      breed === 'doberman' ||
      breed === 'collie' ||
      breed === 'poodle' ||
      breed === 'bassetHound' ||
      breed === 'redboneCoonhound'
    ) {
      return 29.0;
    }
    if (breed === 'chowChow' || breed === 'samoyed' || breed === 'akita' || breed === 'rottweiler') {
      return 28.0;
    }
    if (breed === 'chihuahua' || breed === 'pug' || breed === 'frenchBulldog') {
      return 22.5;
    }
    const sizeClass = BREED_BY_KEY[breed]?.sizeClass || 'standard';
    if (sizeClass === 'toy') return 24.0;
    if (sizeClass === 'giant') return 30.5;
    return 27.0;
  }

  function getSideDrinkSpot(
    waterGx: number,
    waterGy: number,
    sideOffsetPx: number,
    dyPx: number,
    dogGx: number,
    dogGy: number,
    ignoreObstacleKey?: string
  ): { gx: number; gy: number } {
    const waterScreen = gridToScreen(waterGx, waterGy);
    const s = getScale();
    const rawOptions = [
      screenToGrid(waterScreen.x + sideOffsetPx * s, waterScreen.y + dyPx * s),
      screenToGrid(waterScreen.x - sideOffsetPx * s, waterScreen.y + dyPx * s),
      screenToGrid(waterScreen.x + sideOffsetPx * s, waterScreen.y + (dyPx - 3.5) * s),
      screenToGrid(waterScreen.x - sideOffsetPx * s, waterScreen.y + (dyPx - 3.5) * s),
      screenToGrid(waterScreen.x + sideOffsetPx * s, waterScreen.y + (dyPx + 3.5) * s),
      screenToGrid(waterScreen.x - sideOffsetPx * s, waterScreen.y + (dyPx + 3.5) * s)
    ];

    const gridSize = getGridSize();
    const scored = rawOptions.map(raw => {
      const clampedGx = Math.max(0.35, Math.min(gridSize - 0.35, raw.gx));
      const clampedGy = Math.max(0.35, Math.min(gridSize - 0.35, raw.gy));
      const blocked = isPointBlockedByObstacle(clampedGx, clampedGy, 0.02, ignoreObstacleKey);
      const safe = blocked ? pushOutsideAllObstacles(clampedGx, clampedGy, 0.05) : { gx: clampedGx, gy: clampedGy };
      const finalGx = Math.max(0.35, Math.min(gridSize - 0.35, safe.gx));
      const finalGy = Math.max(0.35, Math.min(gridSize - 0.35, safe.gy));
      const finalScreen = gridToScreen(finalGx, finalGy);
      const horizSep = Math.abs(finalScreen.x - waterScreen.x) / Math.max(0.01, s);
      const vertErr = Math.abs((finalScreen.y - waterScreen.y) / Math.max(0.01, s) - dyPx);
      const horizErr = Math.abs(horizSep - sideOffsetPx);
      const distFromDog = Math.hypot(finalGx - dogGx, finalGy - dogGy);
      // Strictly keep the dog directly beside the water (penalize vertical drift heavily so it never stands in front)
      const penalty =
        (blocked ? 50 : 0) +
        vertErr * 2.8 +
        horizErr * 1.4 +
        Math.max(0, sideOffsetPx * 0.78 - horizSep) * 2.0;
      return { gx: finalGx, gy: finalGy, score: penalty + distFromDog * 0.12 };
    });

    scored.sort((a, b) => a.score - b.score);
    return { gx: scored[0].gx, gy: scored[0].gy };
  }

  function getAvailableWaterSource(dog: Dog): DrinkTarget | null {
    const candidates: DrinkTarget[] = [];
    const bowlPos = getWaterBowlPos();
    const reachPx = getBreedDrinkReachPx(dog.breed);

    const bowlBusy = dogs.some(d => d !== dog && d.drinkTarget?.key === 'bowl');
    if (!bowlBusy) {
      // Stand directly beside the bowl so torso clears the rim and head dips cleanly into the water
      const sideSpot = getSideDrinkSpot(bowlPos.gx, bowlPos.gy, reachPx, -0.4, dog.gx, dog.gy, 'bowl');
      if (findNavPath(dog.gx, dog.gy, sideSpot.gx, sideSpot.gy) !== null) {
        candidates.push({
          kind: 'bowl',
          key: 'bowl',
          waterGx: bowlPos.gx,
          waterGy: bowlPos.gy,
          standGx: sideSpot.gx,
          standGy: sideSpot.gy
        });
      }
    }

    const fountainCandidates: DrinkTarget[] = [];
    if (Array.isArray(state.placedDecorations)) {
      for (const dec of state.placedDecorations) {
        if (dec.type !== 'fountain') continue;
        const key = `fountain:${dec.gx},${dec.gy}`;
        const busy = dogs.some(d => d !== dog && d.drinkTarget?.key === key);
        if (busy) continue;

        const centerGx = dec.gx + 0.5;
        const centerGy = dec.gy + 0.5;
        const safeStand = getSideDrinkSpot(centerGx, centerGy, reachPx + 11.0, 0.5, dog.gx, dog.gy);
        if (findNavPath(dog.gx, dog.gy, safeStand.gx, safeStand.gy) === null) continue;

        fountainCandidates.push({
          kind: 'fountain',
          key,
          gx: dec.gx,
          gy: dec.gy,
          waterGx: centerGx,
          waterGy: centerGy,
          standGx: safeStand.gx,
          standGy: safeStand.gy
        });
      }
    }

    // Once the player places fountains, pups happily favor drinking from them while still using the doghouse bowl
    if (fountainCandidates.length > 0 && (candidates.length === 0 || Math.random() < 0.68)) {
      return fountainCandidates[Math.floor(Math.random() * fountainCandidates.length)];
    }
    return candidates.length > 0 ? candidates[0] : null;
  }

  class Dog {
    gx: number;
    gy: number;
    targetGx: number;
    targetGy: number;
    state: 'IDLE' | 'WALK' | 'DIG' | 'SLEEP' | 'SIT' | 'LAY' | 'DRINK' | 'EAT' | 'SLIDE_CLIMB' | 'SLIDE_DOWN';
    timer: number;
    facingRight: boolean;
    sleepFacingRight: boolean;
    sleepCooldown: number;
    isNightSleep: boolean;
    nightSleepUntilMs: number;
    nightSleepRollCooldown: number;
    digOnArrival: boolean;
    moveDirGx: number;
    moveDirGy: number;
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
    drinkTarget: DrinkTarget | null;
    drinkCooldown: number;
    waterBoostTimer: number;
    onReachWater: (() => void) | null;
    treatTarget: WorldTreat | null;
    onReachTreat: (() => void) | null;
    digCount: number;
    digStreak: number;
    whistleBoostTimer: number;
    tapHypeTimer: number;
    blinkTimer: number;
    navWaypoints: Array<{ gx: number; gy: number }>;
    navBuiltVersion: number;
    navRecalcCooldown: number;
    stuckTimer: number;
    stuckCount: number;
    lastProgressGx: number;
    lastProgressGy: number;
    smoothSteerX: number;
    smoothSteerY: number;
    squeezeTimer: number;
    faceFlipCooldown: number;

    constructor(gx: number, gy: number, rosterId: string, breed = 'aussie', isShiny = false, shinyColor: string | null = null) {
      const safeStart = pushOutsideAllObstacles(gx, gy, 0.08);
      this.gx = safeStart.gx;
      this.gy = safeStart.gy;
      this.targetGx = safeStart.gx;
      this.targetGy = safeStart.gy;
      this.state = 'IDLE';
      this.timer = 0.8 + Math.random() * 1.6;
      this.facingRight = Math.random() > 0.5;
      this.sleepFacingRight = this.facingRight;
      this.sleepCooldown = 12 + Math.random() * 18;
      this.isNightSleep = false;
      this.nightSleepUntilMs = 0;
      this.nightSleepRollCooldown = 0;
      this.digOnArrival = false;
      this.moveDirGx = 0;
      this.moveDirGy = 0;
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
      this.drinkTarget = null;
      this.drinkCooldown = 18 + Math.random() * 32;
      this.waterBoostTimer = 0;
      this.onReachWater = null;
      this.treatTarget = null;
      this.onReachTreat = null;
      this.digCount = 0;
      this.digStreak = 0;
      this.whistleBoostTimer = 0;
      this.tapHypeTimer = 0;
      this.blinkTimer = 1.4 + Math.random() * 4.2;
      this.navWaypoints = [];
      this.navBuiltVersion = -1;
      this.navRecalcCooldown = 0;
      this.stuckTimer = 0;
      this.stuckCount = 0;
      this.lastProgressGx = safeStart.gx;
      this.lastProgressGy = safeStart.gy;
      this.smoothSteerX = 0;
      this.smoothSteerY = 0;
      this.squeezeTimer = 0;
      this.faceFlipCooldown = 0;

      // During 9 PM - 7 AM local time, each dog starts with a flat 50% chance to be curled up in overnight sleep
      const nowMs = Date.now();
      if (
        isNightSleepWindow(nowMs) &&
        !isNearSlideZone(this.gx, this.gy) &&
        !isPointBlockedByObstacle(this.gx, this.gy, 0.04)
      ) {
        if (Math.random() < NIGHT_SLEEP_CHANCE) {
          this.enterNightSleep(nowMs);
        } else {
          this.nightSleepRollCooldown = 20 * 60 + Math.random() * 15 * 60;
        }
      }
    }

    clearNavPath(): void {
      this.navWaypoints = [];
      this.navBuiltVersion = -1;
      this.stuckTimer = 0;
      this.stuckCount = 0;
      this.lastProgressGx = this.gx;
      this.lastProgressGy = this.gy;
      this.smoothSteerX = 0;
      this.smoothSteerY = 0;
      this.squeezeTimer = 0;
    }

    setWalkTarget(gx: number, gy: number): void {
      this.targetGx = gx;
      this.targetGy = gy;
      this.navWaypoints = [];
      this.navBuiltVersion = -1;
      this.stuckTimer = 0;
      this.stuckCount = 0;
      this.lastProgressGx = this.gx;
      this.lastProgressGy = this.gy;
      this.smoothSteerX = 0;
      this.smoothSteerY = 0;
      this.squeezeTimer = 0;
    }

    computeNavPath(force = false): boolean {
      if (!force && this.navRecalcCooldown > 0 && this.navWaypoints.length > 0 && this.navBuiltVersion === navCacheVersion) {
        return true;
      }
      const path = findNavPath(this.gx, this.gy, this.targetGx, this.targetGy);
      this.navBuiltVersion = navCacheVersion;
      this.navRecalcCooldown = 0.45;
      if (!path || path.length === 0) {
        this.navWaypoints = [];
        return false;
      }
      this.navWaypoints = path;
      return true;
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

    cancelDrink(onlyFountain = false): void {
      if (onlyFountain && this.drinkTarget?.kind !== 'fountain') {
        return;
      }
      this.drinkTarget = null;
      this.onReachWater = null;
      if (this.state === 'DRINK') {
        this.state = 'IDLE';
        this.timer = 0.5 + Math.random() * 0.7;
      }
    }

    startDrinking(): void {
      if (!this.drinkTarget) {
        this.state = 'IDLE';
        this.timer = 0.5;
        return;
      }
      if (this.drinkTarget.kind === 'fountain') {
        const exists = state.placedDecorations.some(
          d => d.type === 'fountain' && d.gx === this.drinkTarget?.gx && d.gy === this.drinkTarget?.gy
        );
        if (!exists) {
          this.cancelDrink();
          return;
        }
      }
      const reachPx = getBreedDrinkReachPx(this.breed);
      const isBowl = this.drinkTarget.kind === 'bowl';
      const alignedSpot = getSideDrinkSpot(
        this.drinkTarget.waterGx,
        this.drinkTarget.waterGy,
        isBowl ? reachPx : reachPx + 11.0,
        isBowl ? -0.4 : 0.5,
        this.gx,
        this.gy,
        isBowl ? 'bowl' : undefined
      );
      this.drinkTarget.standGx = alignedSpot.gx;
      this.drinkTarget.standGy = alignedSpot.gy;
      if (Math.hypot(alignedSpot.gx - this.gx, alignedSpot.gy - this.gy) < 0.35) {
        this.gx = alignedSpot.gx;
        this.gy = alignedSpot.gy;
      }
      const dogPos = gridToScreen(this.gx, this.gy);
      const waterPos = gridToScreen(this.drinkTarget.waterGx, this.drinkTarget.waterGy);
      if (Math.abs(waterPos.x - dogPos.x) > 0.5) {
        this.facingRight = waterPos.x >= dogPos.x;
      }
      this.state = 'DRINK';
      this.timer = 2.1 + Math.random() * 0.9;
    }

    finishDrink(): void {
      const target = this.drinkTarget;
      this.drinkTarget = null;
      this.onReachWater = null;
      this.drinkCooldown = 50 + Math.random() * 40;
      // Subtle hydration speed boost (+18% walk & dig pace for 18s, extended by water-loving breeds)
      const trait = getBreedTrait(this.breed);
      this.waterBoostTimer = 18 * (trait.drinkBoostDurationMult ?? 1);
      this.petBounce = 0.22;
      this.state = 'IDLE';
      this.timer = 0.4 + Math.random() * 0.5;

      const pos = gridToScreen(target ? target.waterGx : this.gx, target ? target.waterGy : this.gy);
      const scale = getScale();
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: pos.x + (Math.random() - 0.5) * 14 * scale,
          y: pos.y - 6 * scale,
          vx: (Math.random() - 0.5) * 26,
          vy: -24 - Math.random() * 18,
          life: 0.48,
          maxLife: 0.48,
          color: i % 2 === 0 ? '#81ecec' : '#dff9fb',
          size: 2.3 * scale
        });
      }
    }

    cancelEat(): void {
      if (this.treatTarget) {
        this.treatTarget.beingEaten = false;
      }
      this.treatTarget = null;
      this.onReachTreat = null;
      if (this.state === 'EAT') {
        this.state = 'IDLE';
        this.timer = 0.4 + Math.random() * 0.5;
      }
    }

    alertForTreat(treat: WorldTreat): void {
      const wasSleeping = this.state === 'SLEEP';
      if (wasSleeping) {
        this.sleepCooldown = DAY_SLEEP_COOLDOWN_MIN_SEC + Math.random() * (DAY_SLEEP_COOLDOWN_MAX_SEC - DAY_SLEEP_COOLDOWN_MIN_SEC);
        if (this.isNightSleep) {
          this.isNightSleep = false;
          this.nightSleepUntilMs = 0;
          this.nightSleepRollCooldown = 25 * 60 + Math.random() * 20 * 60;
        }
        this.facingRight = this.sleepFacingRight;
        this.petBounce = Math.max(this.petBounce, 0.4);
      } else if (this.state === 'LAY' || this.state === 'SIT') {
        this.facingRight = this.sleepFacingRight;
        this.petBounce = Math.max(this.petBounce, 0.3);
      } else {
        this.petBounce = Math.max(this.petBounce, 0.28);
      }

      // If mid-slide, let the dog finish sliding down; finishSlide() will immediately claim the waiting treat
      if (this.state === 'SLIDE_CLIMB' || this.state === 'SLIDE_DOWN') {
        return;
      }

      // If already eating or walking to another unconsumed treat, finish that one first; finishEat() chains the rest
      if (this.treatTarget && !this.treatTarget.consumed && (this.state === 'EAT' || this.onReachTreat)) {
        return;
      }

      this.cancelDrink();
      this.onReachSlide = null;
      this.slideTarget = null;
      this.onReachToy = null;
      this.digOnArrival = false;
      this.clearNavPath();
      this.assignTreatTarget(treat);
    }

    assignTreatTarget(treat: WorldTreat): void {
      this.treatTarget = treat;
      const s = Math.max(0.01, getScale());
      const reachPx = getBreedTreatReachPx(this.breed);
      const dogPos = gridToScreen(this.gx, this.gy);
      const treatPos = gridToScreen(treat.gx, treat.gy);
      const horizSep = Math.abs(treatPos.x - dogPos.x) / s;
      const vertErr = Math.abs((dogPos.y - treatPos.y) / s - EAT_TREAT_DY_PX);

      if (Math.abs(treatPos.x - dogPos.x) > 0.5) {
        this.facingRight = treatPos.x >= dogPos.x;
      }

      // If treat landed right in front of the dog at a comfortable eating distance, enter EAT cleanly
      if (Math.abs(horizSep - reachPx) <= 10 && vertErr <= 10) {
        this.onReachTreat = null;
        this.state = 'EAT';
        return;
      }

      // Otherwise trot smoothly to a clear side spot beside the treat
      const standSpot = getSideDrinkSpot(treat.gx, treat.gy, reachPx, EAT_TREAT_DY_PX, this.gx, this.gy);
      this.setWalkTarget(standSpot.gx, standSpot.gy);
      this.onReachTreat = () => this.startEating();
      this.state = 'WALK';
    }

    tryClaimNextTreat(): boolean {
      const next = worldTreats.find(t => !t.consumed && t.ownerRosterId === this.rosterId);
      if (!next) return false;
      this.assignTreatTarget(next);
      return true;
    }

    startEating(): void {
      if (!this.treatTarget || this.treatTarget.consumed) {
        this.cancelEat();
        return;
      }
      const reachPx = getBreedTreatReachPx(this.breed);
      const alignedSpot = getSideDrinkSpot(this.treatTarget.gx, this.treatTarget.gy, reachPx, EAT_TREAT_DY_PX, this.gx, this.gy);
      if (Math.hypot(alignedSpot.gx - this.gx, alignedSpot.gy - this.gy) < 0.35) {
        this.gx = alignedSpot.gx;
        this.gy = alignedSpot.gy;
      }
      const dogPos = gridToScreen(this.gx, this.gy);
      const treatPos = gridToScreen(this.treatTarget.gx, this.treatTarget.gy);
      if (Math.abs(treatPos.x - dogPos.x) > 0.5) {
        this.facingRight = treatPos.x >= dogPos.x;
      }
      this.onReachTreat = null;
      this.state = 'EAT';
    }

    finishEat(): void {
      const target = this.treatTarget;
      if (target) {
        target.consumed = true;
        target.beingEaten = false;
      }
      this.treatTarget = null;
      this.onReachTreat = null;
      this.petBounce = 0.32;

      const pos = gridToScreen(this.gx, this.gy);
      const scale = getScale();
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: pos.x + (Math.random() - 0.5) * 18 * scale,
          y: pos.y - 20 * scale,
          vx: (Math.random() - 0.5) * 26,
          vy: -36 - Math.random() * 18,
          life: 0.72,
          maxLife: 0.72,
          color: i % 2 === 0 ? '#ff9ff3' : '#ffeaa7',
          size: i % 2 === 0 ? 4.6 : 3.2 * scale,
          isHeart: i % 2 === 0
        });
      }

      if (this.tryClaimNextTreat()) {
        return;
      }
      this.state = 'IDLE';
      this.timer = 0.4 + Math.random() * 0.5;
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
      const landGx = target ? Math.min(getGridSize() - 0.25, target.gx + 1.66) : this.gx;
      const landGy = target ? target.gy + 0.5 : this.gy;
      const safeLand = pushOutsideAllObstacles(landGx, landGy, 0.04);
      this.gx = safeLand.gx;
      this.gy = safeLand.gy;
      this.clearNavPath();
      this.slideTarget = null;
      this.slideProgress = 0;
      this.slideElevation = 0;
      this.slideTilt = 0;
      this.onReachSlide = null;
      this.slideCooldown = 16 + Math.random() * 8;
      this.petBounce = 0.42;
      if (!this.tryClaimNextTreat()) {
        this.state = 'IDLE';
        this.timer = 0.7 + Math.random() * 0.9;
      }

      const pos = gridToScreen(this.gx, this.gy);
      const scale = getScale();
      const trait = getBreedTrait(this.breed);
      sfx.pet();
      awardPlayMood(0.6, trait.playMoodBonus || 0);

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
        const xpGain = Math.max(4, Math.round(BASE_SLIDE_XP * (trait.playXpMult ?? 1) * stats.quickLearner * getActiveXpBoostMult()));
        const leveledUp = grantDogXp(entry, xpGain);
        addFloatingText(pos.x, pos.y - 34 * scale, leveledUp ? 'Level Up!' : `Wheee! +${xpGain} XP`, '#ffeaa7');
        if (leveledUp) {
          sfx.upgrade();
        }
        requestSave();
      } else {
        addFloatingText(pos.x, pos.y - 34 * scale, 'Wheee!', '#ffeaa7');
      }
      updateUI();
    }

    enterSleep(): void {
      if (this.waterBoostTimer > 0 || this.sleepCooldown > 0) {
        this.pickNewTarget();
        return;
      }
      this.cancelSlide();
      this.cancelDrink();
      if (isNearSlideZone(this.gx, this.gy) || isPointBlockedByObstacle(this.gx, this.gy, 0.04)) {
        this.pickNewTarget();
        return;
      }
      const trait = getBreedTrait(this.breed);
      this.digStreak = 0;
      this.isNightSleep = false;
      this.nightSleepUntilMs = 0;
      this.state = 'SLEEP';
      this.sleepFacingRight = this.facingRight;
      this.timer = (DAY_SLEEP_MIN_SEC + Math.random() * (DAY_SLEEP_MAX_SEC - DAY_SLEEP_MIN_SEC)) * (trait.napDurationMult ?? 1);
    }

    enterNightSleep(nowMs = Date.now()): void {
      if (this.waterBoostTimer > 0 || !isNightSleepWindow(nowMs)) {
        this.pickNewTarget();
        return;
      }
      this.cancelSlide();
      this.cancelDrink();
      if (isNearSlideZone(this.gx, this.gy) || isPointBlockedByObstacle(this.gx, this.gy, 0.04)) {
        this.pickNewTarget();
        return;
      }
      const msUntil7Am = getMsUntilSevenAm(nowMs);
      if (msUntil7Am <= 5000) {
        this.pickNewTarget();
        return;
      }
      const maxAllowedMs = Math.min(NIGHT_SLEEP_MAX_MS, msUntil7Am);
      const durationMs = maxAllowedMs <= NIGHT_SLEEP_MIN_MS
        ? maxAllowedMs
        : NIGHT_SLEEP_MIN_MS + Math.random() * (maxAllowedMs - NIGHT_SLEEP_MIN_MS);
      this.digStreak = 0;
      this.isNightSleep = true;
      this.nightSleepUntilMs = nowMs + durationMs;
      this.state = 'SLEEP';
      this.sleepFacingRight = this.facingRight;
      this.timer = durationMs / 1000;
    }

    enterSit(): void {
      this.cancelSlide();
      this.cancelDrink();
      if (isNearSlideZone(this.gx, this.gy) || isPointBlockedByObstacle(this.gx, this.gy, 0.04)) {
        this.pickNewTarget();
        return;
      }
      this.isNightSleep = false;
      this.nightSleepUntilMs = 0;
      this.state = 'SIT';
      this.sleepFacingRight = this.facingRight;
      this.timer = 3.2 + Math.random() * 3.3;
    }

    enterLayDown(): void {
      this.cancelSlide();
      this.cancelDrink();
      if (isNearSlideZone(this.gx, this.gy) || isPointBlockedByObstacle(this.gx, this.gy, 0.04)) {
        this.pickNewTarget();
        return;
      }
      this.isNightSleep = false;
      this.nightSleepUntilMs = 0;
      this.state = 'LAY';
      this.sleepFacingRight = this.facingRight;
      this.timer = 4.0 + Math.random() * 3.8;
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
        this.sleepCooldown = DAY_SLEEP_COOLDOWN_MIN_SEC + Math.random() * (DAY_SLEEP_COOLDOWN_MAX_SEC - DAY_SLEEP_COOLDOWN_MIN_SEC);
        if (this.isNightSleep) {
          this.isNightSleep = false;
          this.nightSleepUntilMs = 0;
          this.nightSleepRollCooldown = 25 * 60 + Math.random() * 20 * 60;
        }
        this.state = 'IDLE';
        this.timer = 1.2;
      }
      this.petBounce = 0.45;
      sfx.pet();
      if (this.barkCooldown <= 3) {
        this.barkCooldown = 0;
        this.triggerBark();
      }

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

      const entry = this.getRosterEntry();
      const trait = getBreedTrait(this.breed);
      const petMoodAmt = trait.petMoodBonus ?? 5;
      const nowMs = Date.now();
      let gaveHappiness = false;
      if (entry && getDogPetHappinessCooldownMs(entry, nowMs) <= 0) {
        entry.lastPetHappinessAt = nowMs;
        addPackHappiness(petMoodAmt);
        gaveHappiness = true;
      }

      if (this.petCooldown <= 0) {
        this.petCooldown = 3.0;
        state.totalPetsCount = (Number(state.totalPetsCount) || 0) + 1;
        recordDailyProgress('pets', 1);
        if (entry && entry.level < MAX_DOG_LEVEL) {
          const stats = getEffectiveBreedStats(entry, this.breed);
          const xpGain = Math.max(2, Math.round(BASE_PET_XP * stats.quickLearner * getActiveXpBoostMult() * (trait.petXpMult ?? 1)));
          const leveledUp = grantDogXp(entry, xpGain);
          const petMsg = leveledUp
            ? 'Level Up!'
            : gaveHappiness
              ? `+${xpGain} XP • +${petMoodAmt} Mood`
              : `+${xpGain} XP`;
          addFloatingText(
            pos.x,
            pos.y - (32 + this.slideElevation) * scale,
            petMsg,
            leveledUp ? '#ffeaa7' : '#ff9ff3',
            'center',
            leveledUp ? 'spark' : 'heart'
          );
          if (leveledUp) {
            sfx.upgrade();
          }
          requestSave();
        } else {
          const petMsg = gaveHappiness ? `+${petMoodAmt} Mood!` : 'Happy Pup!';
          addFloatingText(pos.x, pos.y - (32 + this.slideElevation) * scale, petMsg, '#ff9ff3', 'center', 'heart');
          if (gaveHappiness) {
            requestSave();
          }
        }
        updateUI();
      } else if (gaveHappiness) {
        addFloatingText(pos.x, pos.y - (32 + this.slideElevation) * scale, `+${petMoodAmt} Mood!`, '#ff9ff3', 'center', 'heart');
        requestSave();
        updateUI();
      }
    }

    pickNewTarget(): void {
      if (this.tryClaimNextTreat()) {
        return;
      }
      if (this.drinkCooldown <= 0 && !this.onReachToy) {
        const waterSource = getAvailableWaterSource(this);
        if (waterSource && Math.random() < 0.10) {
          this.slideTarget = null;
          this.onReachSlide = null;
          this.drinkTarget = waterSource;
          this.setWalkTarget(waterSource.standGx, waterSource.standGy);
          this.onReachWater = () => this.startDrinking();
          this.state = 'WALK';
          return;
        }
      }
      if (this.slideCooldown <= 0 && !this.onReachToy) {
        const openSlide = getAvailableSlide(this);
        if (openSlide && Math.random() < 0.32) {
          const ladderGx = Math.max(0.24, openSlide.gx + 0.26);
          const ladderGy = openSlide.gy + 0.5;
          if (findNavPath(this.gx, this.gy, ladderGx, ladderGy) !== null) {
            this.drinkTarget = null;
            this.onReachWater = null;
            this.slideTarget = { gx: openSlide.gx, gy: openSlide.gy };
            this.setWalkTarget(ladderGx, ladderGy);
            this.onReachSlide = () => this.startSlideClimb();
            this.state = 'WALK';
            return;
          }
        }
      }
      this.slideTarget = null;
      this.onReachSlide = null;
      this.drinkTarget = null;
      this.onReachWater = null;

      let chosen: { gx: number; gy: number } | null = null;
      let chosenPath: Array<{ gx: number; gy: number }> | null = null;

      // Sample open, reachable digging spots spaced away from obstacles and other dogs
      const gridSize = getGridSize();
      for (let attempt = 0; attempt < 18; attempt++) {
        const rx = 0.62 + Math.random() * (gridSize - 1.24);
        const ry = 0.62 + Math.random() * (gridSize - 1.24);
        if (isPointBlockedByObstacle(rx, ry, 0.12)) continue;
        if (Math.hypot(rx - this.gx, ry - this.gy) < 0.55) continue;

        if (attempt < 12) {
          const crowded = dogs.some(other =>
            other !== this &&
            (Math.hypot(other.gx - rx, other.gy - ry) < 0.62 ||
              Math.hypot(other.targetGx - rx, other.targetGy - ry) < 0.58)
          );
          if (crowded) continue;
        }

        const path = findNavPath(this.gx, this.gy, rx, ry);
        if (path) {
          chosen = { gx: rx, gy: ry };
          chosenPath = path;
          break;
        }
      }

      // Guaranteed fallback in densely decorated parks: pick from reachable open sub-cells
      if (!chosen) {
        const reachable = getReachableOpenPositions(this.gx, this.gy).filter(
          p => Math.hypot(p.gx - this.gx, p.gy - this.gy) > 0.35
        );
        if (reachable.length > 0) {
          const spread = reachable.filter(p =>
            dogs.every(other => other === this || Math.hypot(other.gx - p.gx, other.gy - p.gy) >= 0.45)
          );
          const pool = spread.length > 0 ? spread : reachable;
          const pick = pool[Math.floor(Math.random() * pool.length)];
          chosen = pick;
          chosenPath = findNavPath(this.gx, this.gy, pick.gx, pick.gy);
        }
      }

      if (chosen) {
        this.setWalkTarget(chosen.gx, chosen.gy);
        if (chosenPath && chosenPath.length > 0) {
          this.navWaypoints = chosenPath;
          this.navBuiltVersion = navCacheVersion;
          this.navRecalcCooldown = 0.45;
        }
        // Dogs stroll & explore more often than they dig, keeping bone flow paced and the park lifelike
        const digChance = getActiveTreatTypeCount() > 0 ? 0.62 : 0.42;
        this.digOnArrival = Math.random() < digChance;
        this.state = 'WALK';
      } else {
        // Completely boxed in: idle right where safe rather than stalling
        const safeHere = pushOutsideAllObstacles(this.gx, this.gy, 0.04);
        this.gx = safeHere.gx;
        this.gy = safeHere.gy;
        this.state = 'IDLE';
        this.timer = 1.2 + Math.random() * 1.4;
      }
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
      if (this.drinkCooldown > 0) {
        this.drinkCooldown = Math.max(0, this.drinkCooldown - dt);
      }
      if (this.waterBoostTimer > 0) {
        this.waterBoostTimer = Math.max(0, this.waterBoostTimer - dt);
      }
      if (this.whistleBoostTimer > 0) {
        this.whistleBoostTimer = Math.max(0, this.whistleBoostTimer - dt);
      }
      if (this.tapHypeTimer > 0) {
        this.tapHypeTimer = Math.max(0, this.tapHypeTimer - dt);
      }
      if (this.navRecalcCooldown > 0) {
        this.navRecalcCooldown = Math.max(0, this.navRecalcCooldown - dt);
      }
      if (this.sleepCooldown > 0) {
        this.sleepCooldown = Math.max(0, this.sleepCooldown - dt);
      }
      if (this.nightSleepRollCooldown > 0) {
        this.nightSleepRollCooldown = Math.max(0, this.nightSleepRollCooldown - dt);
      }
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.blinkTimer = 2.6 + Math.random() * 4.2;
      }

      const cfg = BREED_CONFIG[this.breed] || BREED_CONFIG.aussie;
      const trait = getBreedTrait(this.breed);
      const packTraits = getPackTraitBonuses();
      const treasureBonuses = getPerkMultipliers();
      const { workBonus } = treasureBonuses;
      const weather = getCurrentWeather();
      const weatherMatch = trait.weatherAffinity && trait.weatherAffinity.weather === weather.id
        ? trait.weatherAffinity
        : null;
      const moodInfo = getPackHappinessInfo();

      const baconPaceMult = getActiveBaconPaceMult();
      const decorPaceMult = getDecorBonuses().paceMult;
      const hydrationPaceMult = this.waterBoostTimer > 0 ? 1.18 : 1;
      const whistlePaceMult = this.whistleBoostTimer > 0 ? 1 + (trait.whistlePaceBonus || 0) : 1;
      const tapHypePaceMult = this.tapHypeTimer > 0 ? 1 + (trait.tapHypePaceBonus || 0) : 1;
      const weatherTraitPaceMult = weatherMatch?.paceBonus ? 1 + weatherMatch.paceBonus : 1;
      const visualPace =
        Math.min(1.6, 1 + Math.log1p(Math.max(0, workBonus - 1)) * 0.25) *
        weather.digSpeedMult *
        moodInfo.paceMult *
        baconPaceMult *
        decorPaceMult *
        treasureBonuses.paceMult *
        hydrationPaceMult *
        (1 + packTraits.packPaceAura) *
        weatherTraitPaceMult *
        whistlePaceMult *
        tapHypePaceMult;
      const walkSpeed = (cfg.walkMult || 1.1) * visualPace;

      this.animPhase += dt * (
        this.state === 'WALK' || this.state === 'SLIDE_CLIMB'
          ? 9 * Math.min(1.45, visualPace)
          : this.state === 'SLEEP'
            ? 1.4
            : this.state === 'LAY' || this.state === 'SIT'
              ? 2.2
              : this.state === 'DRINK'
                ? 7.4
                : this.state === 'EAT'
                  ? 7.8
                  : 5 * Math.min(1.35, visualPace)
      );
      this.wagPhase += dt * (
        this.state === 'SLEEP'
          ? 1.4
          : this.state === 'LAY'
            ? 3.2 * moodInfo.wagMult
            : this.state === 'SIT'
              ? 4.4 * moodInfo.wagMult
              : this.state === 'SLIDE_DOWN'
                ? 10.5 * moodInfo.wagMult
                : this.state === 'EAT'
                  ? 8.4 * moodInfo.wagMult
                  : this.state === 'DRINK'
                    ? 6.4 * moodInfo.wagMult
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

      if (this.state === 'DRINK') {
        if (!this.drinkTarget) {
          this.cancelDrink();
          return;
        }
        if (this.drinkTarget.kind === 'fountain') {
          const exists = state.placedDecorations.some(
            d => d.type === 'fountain' && d.gx === this.drinkTarget?.gx && d.gy === this.drinkTarget?.gy
          );
          if (!exists) {
            this.cancelDrink();
            return;
          }
        }
        const sNow = Math.max(0.01, getScale());
        const isBowl = this.drinkTarget.kind === 'bowl';
        const reachPx = getBreedDrinkReachPx(this.breed);
        const desiredSidePx = isBowl ? reachPx : reachPx + 11.0;
        const desiredDyPx = isBowl ? -0.4 : 0.5;
        let dogPos = gridToScreen(this.gx, this.gy);
        const waterPos = gridToScreen(this.drinkTarget.waterGx, this.drinkTarget.waterGy);
        const curHorizSep = Math.abs(dogPos.x - waterPos.x) / sNow;
        const curVertErr = Math.abs((dogPos.y - waterPos.y) / sNow - desiredDyPx);
        if (curVertErr > 2.2 || Math.abs(curHorizSep - desiredSidePx) > 2.8) {
          const liveSpot = getSideDrinkSpot(
            this.drinkTarget.waterGx,
            this.drinkTarget.waterGy,
            desiredSidePx,
            desiredDyPx,
            this.gx,
            this.gy,
            isBowl ? 'bowl' : undefined
          );
          const blend = Math.min(1, dt * 10);
          this.gx += (liveSpot.gx - this.gx) * blend;
          this.gy += (liveSpot.gy - this.gy) * blend;
          dogPos = gridToScreen(this.gx, this.gy);
        }
        if (Math.abs(waterPos.x - dogPos.x) > 0.5) {
          this.facingRight = waterPos.x >= dogPos.x;
        }
        if (Math.sin(this.animPhase * 2.6) > 0.25 && Math.random() < dt * 7.5) {
          const s = getScale();
          const splashX = this.drinkTarget.kind === 'fountain'
            ? waterPos.x + (this.facingRight ? -10 : 10) * s + (Math.random() - 0.5) * 6 * s
            : waterPos.x + (Math.random() - 0.5) * 7 * s;
          particles.push({
            x: splashX,
            y: waterPos.y - 3.6 * s,
            vx: (Math.random() - 0.5) * 20,
            vy: -15 - Math.random() * 14,
            life: 0.34,
            maxLife: 0.34,
            color: Math.random() < 0.5 ? '#81ecec' : '#dff9fb',
            size: 1.9 * s
          });
        }
        this.timer -= dt;
        if (this.timer <= 0) {
          this.finishDrink();
        }
        return;
      }

      if (this.state === 'EAT') {
        const treat = this.treatTarget;
        if (!treat || treat.consumed) {
          this.cancelEat();
          return;
        }
        const sNow = Math.max(0.01, getScale());
        const reachPx = getBreedTreatReachPx(this.breed);
        const desiredDyPx = EAT_TREAT_DY_PX;
        let dogPos = gridToScreen(this.gx, this.gy);
        const treatPos = gridToScreen(treat.gx, treat.gy);
        const curHorizSep = Math.abs(dogPos.x - treatPos.x) / sNow;
        const curVertErr = Math.abs((dogPos.y - treatPos.y) / sNow - desiredDyPx);
        if (curVertErr > 1.6 || Math.abs(curHorizSep - reachPx) > 1.8) {
          const liveSpot = getSideDrinkSpot(treat.gx, treat.gy, reachPx, desiredDyPx, this.gx, this.gy);
          const blend = Math.min(1, dt * 11);
          this.gx += (liveSpot.gx - this.gx) * blend;
          this.gy += (liveSpot.gy - this.gy) * blend;
          dogPos = gridToScreen(this.gx, this.gy);
        }
        if (Math.abs(treatPos.x - dogPos.x) > 0.5) {
          this.facingRight = treatPos.x >= dogPos.x;
        }

        if (!treat.landed) {
          treat.beingEaten = false;
          return;
        }

        treat.beingEaten = true;
        treat.eatElapsed += dt;

        // Crumb / cream / sparkle nibbles popping up in sync with each munch
        if (Math.sin(this.animPhase * 3.1) > 0.35 && Math.random() < dt * 7.8) {
          const crumbs = WORLD_TREAT_CONFIG[treat.kind].crumbs;
          const col = crumbs[Math.floor(Math.random() * crumbs.length)];
          particles.push({
            x: treatPos.x + (Math.random() - 0.5) * 9 * sNow,
            y: treatPos.y - (3 + Math.random() * 4) * sNow,
            vx: (Math.random() - 0.5) * 28,
            vy: -18 - Math.random() * 18,
            life: 0.36,
            maxLife: 0.36,
            color: col,
            size: (1.8 + Math.random() * 1.1) * sNow
          });
        }

        if (treat.eatElapsed >= treat.eatDuration) {
          this.finishEat();
        }
        return;
      }

      if (this.state === 'SLEEP') {
        this.facingRight = this.sleepFacingRight;
        if (this.isNightSleep) {
          const nowMs = Date.now();
          this.timer = Math.max(0, (this.nightSleepUntilMs - nowMs) / 1000);
          if (nowMs >= this.nightSleepUntilMs || !isNightSleepWindow(nowMs)) {
            this.isNightSleep = false;
            this.nightSleepUntilMs = 0;
            this.sleepCooldown = DAY_SLEEP_COOLDOWN_MIN_SEC + Math.random() * (DAY_SLEEP_COOLDOWN_MAX_SEC - DAY_SLEEP_COOLDOWN_MIN_SEC);
            this.nightSleepRollCooldown = isNightSleepWindow(nowMs)
              ? 30 * 60 + Math.random() * 20 * 60
              : 0;
            this.state = 'IDLE';
            this.timer = 1.0 + Math.random() * 1.4;
          }
        } else {
          this.timer -= dt * baconPaceMult;
          if (this.timer <= 0) {
            this.sleepCooldown = DAY_SLEEP_COOLDOWN_MIN_SEC + Math.random() * (DAY_SLEEP_COOLDOWN_MAX_SEC - DAY_SLEEP_COOLDOWN_MIN_SEC);
            this.state = 'IDLE';
            this.timer = 1.0 + Math.random() * 1.4;
          }
        }
      } else if (this.state === 'SIT') {
        this.facingRight = this.sleepFacingRight;
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'IDLE';
          this.timer = 0.9 + Math.random() * 1.1;
        }
      } else if (this.state === 'LAY') {
        this.facingRight = this.sleepFacingRight;
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'IDLE';
          this.timer = 1.0 + Math.random() * 1.2;
        }
      } else if (this.state === 'IDLE') {
        if (this.tryClaimNextTreat()) {
          return;
        }
        this.timer -= dt * visualPace;
        if (this.timer <= 0) {
          const nowMs = Date.now();
          const clearGround = !isNearSlideZone(this.gx, this.gy) && !isPointBlockedByObstacle(this.gx, this.gy, 0.04);

          // Overnight (9:00 PM - 7:00 AM): flat 50% chance to curl up for up to 2 hours straight
          if (
            clearGround &&
            this.waterBoostTimer <= 0 &&
            this.nightSleepRollCooldown <= 0 &&
            isNightSleepWindow(nowMs)
          ) {
            if (Math.random() < NIGHT_SLEEP_CHANCE) {
              this.enterNightSleep(nowMs);
              return;
            }
            this.nightSleepRollCooldown = 20 * 60 + Math.random() * 15 * 60;
          }

          if (clearGround) {
            const napChance = (this.waterBoostTimer <= 0 && this.sleepCooldown <= 0)
              ? Math.min(0.32, 0.14 * (trait.napChanceMult ?? 1))
              : 0;
            const sitChance = 0.20;
            const layChance = 0.16;
            const roll = Math.random();
            if (roll < napChance) {
              this.enterSleep();
              return;
            }
            if (roll < napChance + sitChance) {
              this.enterSit();
              return;
            }
            if (roll < napChance + sitChance + layChance) {
              this.enterLayDown();
              return;
            }
          }
          this.pickNewTarget();
        }
      } else if (this.state === 'WALK') {
        // Ensure final destination never lies inside a solid park obstacle
        const ignoreObsKey = this.drinkTarget?.kind === 'bowl' ? 'bowl' : undefined;
        if (!this.slideTarget && isPointBlockedByObstacle(this.targetGx, this.targetGy, 0.02, ignoreObsKey)) {
          const safeT = pushOutsideAllObstacles(this.targetGx, this.targetGy, 0.06);
          this.setWalkTarget(safeT.gx, safeT.gy);
        }

        const dx = this.targetGx - this.gx;
        const dy = this.targetGy - this.gy;
        const dist = Math.hypot(dx, dy);

        if (dist < 0.09) {
          this.gx = this.targetGx;
          this.gy = this.targetGy;
          this.clearNavPath();

          if (this.onReachSlide) {
            const cb = this.onReachSlide;
            this.onReachSlide = null;
            cb();
            return;
          }

          if (this.onReachWater) {
            const cb = this.onReachWater;
            this.onReachWater = null;
            cb();
            return;
          }

          if (this.onReachTreat) {
            const cb = this.onReachTreat;
            this.onReachTreat = null;
            cb();
            return;
          }

          if (this.onReachToy) {
            const cb = this.onReachToy;
            this.onReachToy = null;
            cb();
            return;
          }

          if (!this.digOnArrival) {
            const clearSpot = !isNearSlideZone(this.gx, this.gy) && !isPointBlockedByObstacle(this.gx, this.gy, 0.04);
            const postWalkRoll = Math.random();
            if (clearSpot && postWalkRoll < 0.35) {
              this.enterSit();
            } else if (clearSpot && postWalkRoll < 0.55) {
              this.enterLayDown();
            } else {
              this.state = 'IDLE';
              this.timer = 1.4 + Math.random() * 1.8;
            }
            return;
          }

          this.digOnArrival = false;
          this.state = 'DIG';
          this.digCount += 1;
          const anyTreatActive = getActiveTreatTypeCount() > 0;
          const digRateMult = 1 + (trait.digSpeedBonus || 0) + (anyTreatActive ? (trait.treatDigSpeedBonus || 0) : 0);
          if (trait.quickBurrowEvery && this.digCount % trait.quickBurrowEvery === 0) {
            this.timer = 0.25;
            const burrowPos = gridToScreen(this.gx, this.gy);
            addFloatingText(burrowPos.x, burrowPos.y - 32 * getScale(), 'Quick Burrow!', '#55efc4');
          } else {
            this.timer = (cfg.digSec || 1.0) / (visualPace * digRateMult);
          }

          const { magicBonus, treasureOddsMult } = getPerkMultipliers();
          const decorMagic = getDecorBonuses().magicAdd;
          const moodMagic = getPackHappinessInfo().magicAdd;
          const magicChanceTotal = Math.min(
            MAX_MAGIC_CHANCE,
            state.magicChance +
              magicBonus +
              decorMagic +
              weather.magicAdd +
              moodMagic +
              packTraits.packMagicAura +
              (weatherMatch?.magicAdd || 0) +
              (cfg.magicBonus || 0)
          );
          this.isMagicDig = state.kongTimer > 0 ? false : Math.random() < magicChanceTotal;

          const treasureChance =
            (cfg.treasureChance || BASE_TREASURE_CHANCE) *
            weather.treasureMult *
            treasureOddsMult *
            (trait.personalTreasureMult ?? 1) *
            (1 + packTraits.packTreasureAura);
          if (!state.isDraftingPerk && Math.random() < treasureChance) {
            triggerPerkDraft();
          }
        } else {
          // Lazily compute or refresh cached A* waypoints only when needed
          if (this.navWaypoints.length === 0 || this.navBuiltVersion !== navCacheVersion) {
            const ok = this.computeNavPath(false);
            if (!ok) {
              this.cancelSlide();
              this.cancelDrink();
              this.cancelEat();
              this.onReachToy = null;
              this.pickNewTarget();
              return;
            }
          }

          // Advance through reached intermediate waypoints
          while (this.navWaypoints.length > 1) {
            const wp = this.navWaypoints[0];
            if (Math.hypot(wp.gx - this.gx, wp.gy - this.gy) < 0.18) {
              this.navWaypoints.shift();
            } else {
              break;
            }
          }

          const activeWp = this.navWaypoints[0] || { gx: this.targetGx, gy: this.targetGy };
          const sdx = activeWp.gx - this.gx;
          const sdy = activeWp.gy - this.gy;
          const sDist = Math.hypot(sdx, sdy);

          let moveX = sDist > 1e-4 ? sdx / sDist : 0;
          let moveY = sDist > 1e-4 ? sdy / sDist : 0;

          if (this.squeezeTimer > 0) this.squeezeTimer = Math.max(0, this.squeezeTimer - dt);
          if (this.faceFlipCooldown > 0) this.faceFlipCooldown = Math.max(0, this.faceFlipCooldown - dt);

          const gridSize = getGridSize();
          const edgeMargin = this.slideTarget ? 0.2 : 0.32;
          const nearObstacle = isPointBlockedByObstacle(this.gx, this.gy, 0.22);

          // Smooth dog-to-dog avoidance steering with obstacle-aware passing & consistent right-hand rule
          let avoidX = 0;
          let avoidY = 0;
          const approachingReserved = Boolean((this.drinkTarget || this.slideTarget || this.treatTarget) && dist < 0.34);
          let avoidScale = approachingReserved ? 0.35 : 1.0;
          if (this.squeezeTimer > 0) {
            avoidScale *= 0.38;
          }

          for (let i = 0; i < dogs.length; i++) {
            const other = dogs[i];
            if (other === this) continue;
            if (other.state === 'SLIDE_CLIMB' || other.state === 'SLIDE_DOWN') continue;

            const rx = this.gx - other.gx;
            const ry = this.gy - other.gy;
            const d = Math.hypot(rx, ry);
            if (d >= DOG_AVOID_RADIUS) continue;

            let nx = 0;
            let ny = 0;
            if (d < 1e-4) {
              const seedAngle = (this.rosterId.charCodeAt(0) || 1) * 1.7 + i * 0.9;
              nx = Math.cos(seedAngle);
              ny = Math.sin(seedAngle);
            } else {
              nx = rx / d;
              ny = ry / d;
            }

            // Positive aheadDot means the other dog is ahead along our current path
            const aheadDot = moveX * (-nx) + moveY * (-ny);
            // Ignore dogs we've already passed unless we're directly overlapping them
            if (aheadDot < -0.35 && d > DOG_MIN_SEPARATION) continue;

            const closeness = (DOG_AVOID_RADIUS - d) / DOG_AVOID_RADIUS;
            const radialWeight = (nearObstacle ? 0.52 : 0.85) * closeness * closeness * avoidScale;
            avoidX += nx * radialWeight;
            avoidY += ny * radialWeight;

            // Smooth obstacle-aware tangential sidestep so dogs arc cleanly past each other
            if (aheadDot > -0.22) {
              const txR = -ny;
              const tyR = nx;
              const txL = ny;
              const tyL = -nx;
              const probeDist = 0.34;
              const rGx = this.gx + txR * probeDist;
              const rGy = this.gy + tyR * probeDist;
              const lGx = this.gx + txL * probeDist;
              const lGy = this.gy + tyL * probeDist;
              const rightClear =
                rGx >= edgeMargin && rGx <= gridSize - edgeMargin &&
                rGy >= edgeMargin && rGy <= gridSize - edgeMargin &&
                !isPointBlockedByObstacle(rGx, rGy, 0.04);
              const leftClear =
                lGx >= edgeMargin && lGx <= gridSize - edgeMargin &&
                lGy >= edgeMargin && lGy <= gridSize - edgeMargin &&
                !isPointBlockedByObstacle(lGx, lGy, 0.04);

              let sideSign = 1;
              if (rightClear && !leftClear) {
                sideSign = 1;
              } else if (leftClear && !rightClear) {
                sideSign = -1;
              } else if (other.state === 'WALK') {
                // Consistent right-hand passing rule: because (nx, ny) is opposite for each dog,
                // both choosing +1 steers them cleanly into opposite lanes without head-on deadlock!
                sideSign = 1;
              } else {
                // Around stationary dogs (sitting/sleeping/digging/eating), take whichever open side aligns best with our goal
                const alignR = txR * moveX + tyR * moveY;
                const alignL = txL * moveX + tyL * moveY;
                sideSign = alignR >= alignL ? 1 : -1;
              }

              const tangentBase = other.state === 'WALK' ? 0.95 : 1.08;
              const tangent = closeness * tangentBase * avoidScale;
              avoidX += (-ny * sideSign) * tangent;
              avoidY += (nx * sideSign) * tangent;
            }
          }

          // Cap avoidance force so crowded gaps never cancel forward intent into zero-length jitter
          const avoidMag = Math.hypot(avoidX, avoidY);
          const maxAvoid = nearObstacle ? 1.12 : 1.42;
          if (avoidMag > maxAvoid) {
            avoidX = (avoidX / avoidMag) * maxAvoid;
            avoidY = (avoidY / avoidMag) * maxAvoid;
          }

          let rawSteerX = moveX + avoidX;
          let rawSteerY = moveY + avoidY;
          const rawSteerLen = Math.hypot(rawSteerX, rawSteerY);
          if (rawSteerLen > 0.08) {
            rawSteerX /= rawSteerLen;
            rawSteerY /= rawSteerLen;
          } else {
            rawSteerX = moveX;
            rawSteerY = moveY;
          }

          // Smooth steering blend prevents abrupt direction snapping and left/right vibration
          if (Math.hypot(this.smoothSteerX, this.smoothSteerY) < 0.05) {
            this.smoothSteerX = rawSteerX;
            this.smoothSteerY = rawSteerY;
          } else {
            const steerBlend = Math.min(1, dt * 11);
            this.smoothSteerX += (rawSteerX - this.smoothSteerX) * steerBlend;
            this.smoothSteerY += (rawSteerY - this.smoothSteerY) * steerBlend;
            const smLen = Math.hypot(this.smoothSteerX, this.smoothSteerY);
            if (smLen > 1e-4) {
              this.smoothSteerX /= smLen;
              this.smoothSteerY /= smLen;
            } else {
              this.smoothSteerX = moveX;
              this.smoothSteerY = moveY;
            }
          }

          const steerX = this.smoothSteerX;
          const steerY = this.smoothSteerY;

          const step = Math.min(Math.max(sDist, 0.05), walkSpeed * dt);
          const prevGx = this.gx;
          const prevGy = this.gy;

          const tryGx = Math.max(edgeMargin, Math.min(gridSize - edgeMargin, prevGx + steerX * step));
          const tryGy = Math.max(edgeMargin, Math.min(gridSize - edgeMargin, prevGy + steerY * step));

          if (!isPointBlockedByObstacle(tryGx, tryGy, 0.02)) {
            this.gx = tryGx;
            this.gy = tryGy;
          } else {
            // Goal-aligned obstacle sliding: pick the clear slide/tangent that advances best toward the waypoint
            const candidates = [
              { gx: Math.max(edgeMargin, Math.min(gridSize - edgeMargin, prevGx + steerX * step)), gy: prevGy },
              { gx: prevGx, gy: Math.max(edgeMargin, Math.min(gridSize - edgeMargin, prevGy + steerY * step)) },
              {
                gx: Math.max(edgeMargin, Math.min(gridSize - edgeMargin, prevGx - steerY * step)),
                gy: Math.max(edgeMargin, Math.min(gridSize - edgeMargin, prevGy + steerX * step))
              },
              {
                gx: Math.max(edgeMargin, Math.min(gridSize - edgeMargin, prevGx + steerY * step)),
                gy: Math.max(edgeMargin, Math.min(gridSize - edgeMargin, prevGy - steerX * step))
              }
            ];
            let bestCand: { gx: number; gy: number } | null = null;
            let bestDot = -Infinity;
            for (let c = 0; c < candidates.length; c++) {
              const cand = candidates[c];
              const cdx = cand.gx - prevGx;
              const cdy = cand.gy - prevGy;
              const cLen = Math.hypot(cdx, cdy);
              if (cLen < 0.002) continue;
              if (isPointBlockedByObstacle(cand.gx, cand.gy, 0.02)) continue;
              const goalDot = (cdx / cLen) * moveX + (cdy / cLen) * moveY;
              if (goalDot > bestDot) {
                bestDot = goalDot;
                bestCand = cand;
              }
            }
            if (bestCand) {
              this.gx = bestCand.gx;
              this.gy = bestCand.gy;
            }
          }

          // Hard safety invariant: never allow a walking dog inside any solid park obstacle
          if (isPointBlockedByObstacle(this.gx, this.gy, 0.015)) {
            const pushed = pushOutsideAllObstacles(this.gx, this.gy, 0.03);
            this.gx = pushed.gx;
            this.gy = pushed.gy;
          }

          // Smooth, dt-scaled personal-space separation that yields gracefully in tight corridors
          const effectiveMinSep = (this.squeezeTimer > 0 || nearObstacle) ? 0.22 : DOG_MIN_SEPARATION;
          const sepBlend = Math.min(0.45, dt * 10);
          for (let i = 0; i < dogs.length; i++) {
            const other = dogs[i];
            if (other === this || other.state === 'SLIDE_CLIMB' || other.state === 'SLIDE_DOWN') continue;
            const rx = this.gx - other.gx;
            const ry = this.gy - other.gy;
            const d = Math.hypot(rx, ry);
            if (d < effectiveMinSep) {
              let ux = 0;
              let uy = 0;
              if (d < 1e-4) {
                const seedAngle = ((this.rosterId.charCodeAt(this.rosterId.length - 1) || 1) * 1.9 + i * 0.7);
                ux = Math.cos(seedAngle);
                uy = Math.sin(seedAngle);
              } else {
                ux = rx / d;
                uy = ry / d;
              }
              const push = Math.min(0.042, (effectiveMinSep - d) * sepBlend);
              const candGx = Math.max(edgeMargin, Math.min(gridSize - edgeMargin, this.gx + ux * push));
              const candGy = Math.max(edgeMargin, Math.min(gridSize - edgeMargin, this.gy + uy * push));
              if (!isPointBlockedByObstacle(candGx, candGy, 0.02)) {
                this.gx = candGx;
                this.gy = candGy;
              }
            }
          }

          // Record normalized grid movement direction & face actual screen-space direction (debounced to prevent flicker)
          const stepGx = this.gx - prevGx;
          const stepGy = this.gy - prevGy;
          const stepLen = Math.hypot(stepGx, stepGy);
          if (stepLen > 0.004) {
            this.moveDirGx = stepGx / stepLen;
            this.moveDirGy = stepGy / stepLen;
          }
          const prevScreen = gridToScreen(prevGx, prevGy);
          const nextScreen = gridToScreen(this.gx, this.gy);
          const screenDeltaX = nextScreen.x - prevScreen.x;
          if (Math.abs(screenDeltaX) > 0.65 && this.faceFlipCooldown <= 0) {
            const wantRight = screenDeltaX >= 0;
            if (wantRight !== this.facingRight) {
              this.facingRight = wantRight;
              this.faceFlipCooldown = 0.14;
            }
          }

          // Anti-stuck recovery: first enable tight-space squeeze + replan, then pick a fresh spot if truly blocked
          this.stuckTimer += dt;
          if (this.stuckTimer >= 0.55) {
            const progress = Math.hypot(this.gx - this.lastProgressGx, this.gy - this.lastProgressGy);
            this.lastProgressGx = this.gx;
            this.lastProgressGy = this.gy;
            this.stuckTimer = 0;

            if (progress < 0.08) {
              this.stuckCount += 1;
              if (this.stuckCount === 1) {
                this.squeezeTimer = 1.05;
                if (!this.computeNavPath(true)) {
                  this.cancelSlide();
                  this.cancelDrink();
                  this.cancelEat();
                  this.onReachToy = null;
                  this.pickNewTarget();
                }
              } else {
                this.cancelSlide();
                this.cancelDrink();
                this.cancelEat();
                this.onReachToy = null;
                this.pickNewTarget();
              }
            } else {
              this.stuckCount = 0;
            }
          }
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
          this.timer = 1.2 + Math.random() * 1.6;
        }
      }
    }

    finishDig(): void {
      const entry = this.getRosterEntry();
      const stats = getEffectiveBreedStats(entry, this.breed);
      const trait = getBreedTrait(this.breed);
      const weather = getCurrentWeather();
      const weatherMatch = trait.weatherAffinity && trait.weatherAffinity.weather === weather.id
        ? trait.weatherAffinity
        : null;
      const moodInfo = getPackHappinessInfo();
      const anyTreatActive = getActiveTreatTypeCount() > 0;
      const cupMult = getActiveCupMult();

      const packDigMult = getDigMultiplier();
      const levelMult = getDogLevelBonusMult(entry);
      const pos = gridToScreen(this.gx, this.gy);
      const scale = getScale();

      let personalBoneMult = 1;
      if (!this.isMagicDig) {
        if (anyTreatActive && trait.treatBoneBonus) {
          personalBoneMult *= 1 + trait.treatBoneBonus;
        }
        if ((moodInfo.tier === 'joyful' || moodInfo.tier === 'ecstatic') && trait.happyMoodBoneBonus) {
          personalBoneMult *= 1 + trait.happyMoodBoneBonus;
        }
        if (weatherMatch?.boneBonus) {
          personalBoneMult *= 1 + weatherMatch.boneBonus;
        }
        if (trait.digStreakStep && trait.digStreakMax) {
          const streakBonus = Math.min(trait.digStreakMax, this.digStreak * trait.digStreakStep);
          personalBoneMult *= 1 + streakBonus;
          const maxStacks = Math.round(trait.digStreakMax / trait.digStreakStep);
          this.digStreak = Math.min(maxStacks, this.digStreak + 1);
        }
        if (trait.luckyDigChance && trait.luckyDigMult && Math.random() < trait.luckyDigChance) {
          personalBoneMult *= trait.luckyDigMult;
          const multLabel = Number.isInteger(trait.luckyDigMult)
            ? `${trait.luckyDigMult}x`
            : `${trait.luckyDigMult.toFixed(1)}x`;
          addFloatingText(pos.x, pos.y - 34 * scale, `${multLabel} Lucky Dig!`, '#ffeaa7');
          for (let i = 0; i < 6; i++) {
            particles.push({
              x: pos.x + (Math.random() - 0.5) * 16 * scale,
              y: pos.y - 12 * scale,
              vx: (Math.random() - 0.5) * 65,
              vy: -42 - Math.random() * 36,
              life: 0.62,
              maxLife: 0.62,
              color: i % 2 === 0 ? '#ffeaa7' : '#fdcb6e',
              size: 3.6 * scale
            });
          }
        }
      }

      const rawAmount = getEffectiveDigPower() * stats.boneYield * levelMult * cupMult * packDigMult * personalBoneMult;
      const amount = Math.max(1, Math.round(rawAmount * 10) / 10);
      const breakEvenBonus = this.isMagicDig ? 0 : applyTreatBreakEvenOnDig(amount);
      const magicYield = 1 + (this.isShiny ? SHINY_MAGIC_BONE_BONUS : 0);
      const boneValue = this.isMagicDig ? magicYield : Math.round((amount + breakEvenBonus) * 10) / 10;

      state.totalDigsCount = (Number(state.totalDigsCount) || 0) + 1;
      recordDailyProgress('digs', 1);
      if (entry) {
        entry.digsCompleted = (entry.digsCompleted || 0) + 1;
        if (!this.isMagicDig) {
          entry.bonesEarned = (entry.bonesEarned || 0) + amount;
        }
        if (entry.level < MAX_DOG_LEVEL) {
          // Flat dig-count-based XP (independent of bone payout amount)
          const baseXp = this.isMagicDig ? BASE_MAGIC_DIG_XP : BASE_DIG_XP;
          const xpTreatMult = getActiveXpBoostMult();
          const weatherXpMult = weatherMatch?.xpBonus ? 1 + weatherMatch.xpBonus : 1;
          const xpGain = Math.max(1, Math.round(baseXp * stats.quickLearner * xpTreatMult * weatherXpMult));
          const leveledUp = grantDogXp(entry, xpGain);
          if (leveledUp) {
            sfx.upgrade();
            addFloatingText(pos.x, pos.y - 38 * scale, 'Level Up!', '#ffeaa7');
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

      if (!this.isMagicDig && trait.extraMagicChance && Math.random() < trait.extraMagicChance) {
        droppedBones.push({
          x: pos.x + 8,
          y: pos.y - 10,
          vx: 22 + Math.random() * 18,
          vy: -126,
          groundY: pos.y + 4,
          age: 0,
          isMagic: true,
          value: 1
        });
        addFloatingText(pos.x, pos.y - 46 * scale, '+1 Bonus!', '#ffeaa7', 'center', 'magic');
        for (let i = 0; i < 4; i++) {
          particles.push({
            x: pos.x + (Math.random() - 0.5) * 14 * scale,
            y: pos.y - 14 * scale,
            vx: (Math.random() - 0.5) * 48,
            vy: -38 - Math.random() * 32,
            life: 0.55,
            maxLife: 0.55,
            color: '#ffeaa7',
            size: 3.2 * scale
          });
        }
      }
    }

    draw(c: CanvasRenderingContext2D): void {
      const pos = gridToScreen(this.gx, this.gy);
      const scale = getScale();
      const isSleeping = this.state === 'SLEEP';
      const isLayingDown = this.state === 'LAY';
      const isSitting = this.state === 'SIT';
      const isGroundedRest = isSleeping || isLayingDown;
      const isDrinking = this.state === 'DRINK';
      const isEating = this.state === 'EAT' && Boolean(this.treatTarget?.landed);
      const isWatchingTreat = this.state === 'EAT' && !isEating;
      const isDipping = isDrinking || isEating;
      const isOnSlide = this.state === 'SLIDE_CLIMB' || this.state === 'SLIDE_DOWN';
      const effectiveFacingRight = (isGroundedRest || isSitting) ? this.sleepFacingRight : this.facingRight;

      c.save();
      c.translate(pos.x, pos.y);
      c.scale(scale, scale);

      const sizeClass = BREED_BY_KEY[this.breed]?.sizeClass || 'standard';
      const isToyBreed = sizeClass === 'toy';
      const isGiantBreed = sizeClass === 'giant';
      const shadowScaleX = isToyBreed ? 0.78 : isGiantBreed ? 1.16 : 1.0;
      const shadowScaleY = isToyBreed ? 0.8 : isGiantBreed ? 1.14 : 1.0;

      if (this.isShiny && !isOnSlide) {
        c.save();
        c.strokeStyle = 'rgba(255, 234, 167, 0.8)';
        c.lineWidth = 2;
        c.beginPath();
        c.ellipse(
          0,
          4,
          (isGroundedRest ? 22 : isSitting ? 21 : 24 + Math.sin(this.animPhase * 3) * 3) * shadowScaleX,
          (isGroundedRest ? 9.5 : 11) * shadowScaleY,
          0,
          0,
          Math.PI * 2
        );
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
        c.ellipse(0, -this.slideElevation + 4.5, 11 * shadowScaleX, 4.2 * shadowScaleY, 0, 0, Math.PI * 2);
        c.fill();
      } else {
        c.fillStyle = 'rgba(0, 0, 0, 0.34)';
        c.beginPath();
        const shadowOffsetX = isSitting ? (effectiveFacingRight ? -1.4 : 1.4) : 0;
        const shadowRx = isGroundedRest ? 20 : isSitting ? 15.5 : 17;
        const shadowRy = isGroundedRest ? 8.5 : isSitting ? 7.8 : 8;
        c.ellipse(shadowOffsetX, 4, shadowRx * shadowScaleX, shadowRy * shadowScaleY, 0, 0, Math.PI * 2);
        c.fill();
      }

      c.save();
      if (!effectiveFacingRight) {
        c.scale(-1, 1);
      }

      let feastJump = 0;
      if (state.feastAnimTimer > 0 && !isGroundedRest && !isSitting && !isOnSlide && !isDipping) {
        feastJump = Math.abs(Math.sin(state.feastAnimTimer * Math.PI * 4)) * 14;
      }

      const petHop = this.petBounce > 0 ? Math.sin((this.petBounce / 0.45) * Math.PI) * 9 : 0;
      const sleepBreath = isSleeping
        ? Math.sin(this.animPhase) * 0.35
        : isLayingDown
          ? Math.sin(this.animPhase * 0.85) * 0.22
          : isSitting
            ? Math.sin(this.animPhase * 0.7) * 0.14
            : 0;
      const bounce = isSleeping
        ? -4.2
        : isLayingDown
          ? -4.2 + petHop * 0.42
          : isSitting
            ? -0.8 + petHop * 0.65
            : isOnSlide
              ? this.slideElevation
              : isDipping
                ? petHop
                : (this.state === 'WALK' ? Math.abs(Math.sin(this.animPhase)) * 3 : 0) + feastJump + petHop;
      const poseTilt = isGroundedRest || isSitting
        ? 0
        : isOnSlide
          ? this.slideTilt
          : isDipping
            ? 0.05
            : (this.state === 'DIG' ? 0.25 : 0);

      c.translate(0, -bounce);
      c.rotate(poseTilt);

      const legSwing = isGroundedRest || isSitting || isDipping
        ? 0
        : (this.state === 'WALK' || this.state === 'SLIDE_CLIMB'
            ? Math.sin(this.animPhase) * 4.1
            : (this.state === 'DIG' ? Math.sin(this.animPhase * 3) * 4.8 : (this.state === 'SLIDE_DOWN' ? 3.5 : 0)));
      const moodInfo = getPackHappinessInfo();
      const moodWagAmp = moodInfo.wagAmp;
      const tailWag = isSleeping
        ? Math.sin(this.wagPhase * 0.65) * 0.5
        : isLayingDown
          ? Math.sin(this.wagPhase * 1.45) * 1.45 * moodWagAmp
          : isSitting
            ? Math.sin(this.wagPhase * 1.9) * 2.1 * moodWagAmp
            : Math.sin(this.wagPhase * 2.2) * 2.5 * moodWagAmp;
      const isBlinking = !isSleeping && this.blinkTimer < 0.13;
      const isJoyful = !isSleeping && !isDipping && (this.petBounce > 0.05 || this.state === 'SLIDE_DOWN' || state.feastAnimTimer > 0 || isWatchingTreat);
      const showTongue = isDipping
        ? true
        : isJoyful || (!isSleeping && moodInfo.tier === 'ecstatic' && Math.sin(this.wagPhase * 0.45) > 0.35);
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
        isLayingDown,
        isSitting,
        isBlinking,
        isJoyful,
        showTongue,
        legSwing,
        sleepBreath,
        wagPhase: this.wagPhase,
        animPhase: this.animPhase,
        moodWagAmp,
        tailWag,
        earBounce,
        isDrinking,
        isEating
      });

      c.restore();

      if (this.isShiny) {
        const t = performance.now() * 0.0044 + (this.rosterId.charCodeAt(this.rosterId.length - 1) || 0) * 0.9;
        const sp1 = 0.5 + 0.5 * Math.sin(t);
        const sp2 = 0.5 + 0.5 * Math.sin(t + 2.1);
        const sp3 = 0.5 + 0.5 * Math.sin(t * 0.92 + 4.2);
        const spreadX = isToyBreed ? 12.5 : isGiantBreed ? 19.5 : 15.5;
        const heightMult = isToyBreed ? 0.85 : isGiantBreed ? 1.15 : 1.0;
        const baseSparkleY = (isGroundedRest ? -10 : isSitting ? -20 : -18) * heightMult - this.slideElevation;

        drawMiniSparkle(
          -spreadX * 0.85,
          baseSparkleY - 4.5 - sp1 * 3.0,
          1.9 + sp1 * 2.0,
          '#fff9c4',
          0.38 + sp1 * 0.58,
          c
        );
        drawMiniSparkle(
          spreadX * 0.88,
          baseSparkleY - 1.2 - sp2 * 2.6,
          1.6 + sp2 * 1.9,
          '#ffffff',
          0.35 + sp2 * 0.6,
          c
        );
        drawMiniSparkle(
          spreadX * 0.1 + Math.sin(t * 0.5) * 2.8,
          baseSparkleY - 9.8 - sp3 * 2.4,
          1.4 + sp3 * 1.6,
          this.shinyColor || '#ffeaa7',
          0.32 + sp3 * 0.58,
          c
        );
      }

      if (state.showNameTags) {
        const entry = this.getRosterEntry();
        const label = entry ? entry.name : (BREED_LABELS[this.breed] || this.breed);
        const baseTagY = isGiantBreed
          ? (isGroundedRest ? -25 : isSitting ? -44 : -42)
          : isToyBreed
            ? (isGroundedRest ? -20 : isSitting ? -34 : -32)
            : (isGroundedRest ? -22 : isSitting ? -38 : -36);
        const tagY = baseTagY - this.slideElevation;

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
          c.fillStyle = this.isNightSleep ? 'rgba(190, 214, 255, 0.92)' : 'rgba(200, 210, 218, 0.85)';
          c.textAlign = 'left';
          c.textBaseline = 'middle';
          c.fillText('zZz', boxW / 2 + 5 + zDrift * 0.25, tagY - zDrift * 0.45);
          c.restore();
        }
      } else if (isSleeping) {
        const zDrift = (this.animPhase * 3.5) % 10;
        c.save();
        c.font = '800 10px "Outfit", system-ui, sans-serif';
        c.fillStyle = this.isNightSleep ? 'rgba(190, 214, 255, 0.92)' : 'rgba(200, 210, 218, 0.85)';
        c.textAlign = 'center';
        c.fillText('zZz', 10 + zDrift * 0.4, -16 - zDrift);
        c.restore();
      }

      c.restore();
    }
  }

  let draftArtStops: Array<() => void> = [];

  function stopDraftTreasureAnimations(): void {
    for (const stop of draftArtStops) {
      stop();
    }
    draftArtStops = [];
  }

  function triggerPerkDraft(): void {
    state.isDraftingPerk = true;
    sfx.shiny();
    const modal = document.getElementById('perkModal');
    const subtitleEl = document.getElementById('perkModalSubtitle');
    const choicesContainer = document.getElementById('perkChoices');
    if (!modal || !choicesContainer) return;

    stopDraftTreasureAnimations();
    choicesContainer.innerHTML = '';

    const counts = getTreasureCounts(state.perks);
    const options = rollWeightedTreasureOptions(state.perks, 3);

    if (options.length === 0) {
      if (subtitleEl) {
        subtitleEl.textContent = 'Every relic in your gallery has reached Rank V (MAX)!';
      }
      const jackpotCard = document.createElement('div');
      jackpotCard.className = 'perk-jackpot-card';
      jackpotCard.innerHTML = `
        <h3>Master Collector Jackpot</h3>
        <p>Your pack unearthed a golden vault chest overflowing with <strong>${magicInlineHtml(`+${MAXED_TREASURE_JACKPOT_MAGIC.toLocaleString()}`)} Magic Bones</strong>!</p>
      `;
      const claimBtn = document.createElement('button');
      claimBtn.type = 'button';
      claimBtn.className = 'action-btn';
      claimBtn.style.cssText = 'width: 100%; max-width: 240px; padding: 11px;';
      claimBtn.innerHTML = `<span class="pp-inline-pair"><span>Claim +${MAXED_TREASURE_JACKPOT_MAGIC.toLocaleString()}</span>${uiIconHtml('magicBone')}</span>`;
      claimBtn.addEventListener('click', () => {
        stopDraftTreasureAnimations();
        state.magicBones += MAXED_TREASURE_JACKPOT_MAGIC;
        state.isDraftingPerk = false;
        modal.style.display = 'none';
        sfx.shiny();
        addFloatingText(viewportW / 2, viewportH * 0.34, `+${MAXED_TREASURE_JACKPOT_MAGIC} Vault Jackpot!`, '#ffeaa7', 'center', 'magic');
        updateUI();
        saveGame();
        flushQueuedAwayProgressIfReady();
      });
      jackpotCard.appendChild(claimBtn);
      choicesContainer.appendChild(jackpotCard);
      modal.style.display = 'flex';
      return;
    }

    if (subtitleEl) {
      subtitleEl.textContent = options.length === 1
        ? 'Your pack uncovered the final relic needed to finish your collection!'
        : `Your pack uncovered a buried chest! Choose 1 of ${options.length} relics to claim:`;
    }

    options.forEach(relic => {
      const meta = RARITY_META[relic.rarity];
      const setDef = getTreasureSetById(relic.setId);
      const currentRank = getRelicRank(counts, relic.id);
      const nextRank = Math.min(MAX_RELIC_RANK, currentRank + 1);
      const setProg = getSetProgress(counts, relic.setId);
      const willCompleteSet = currentRank === 0 && setProg.owned === setProg.total - 1;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `perk-choice-btn ${meta.cssClass}`;

      const artWrap = document.createElement('div');
      artWrap.className = 'perk-choice-art-wrap';
      const artCanvas = document.createElement('canvas');
      artCanvas.className = 'perk-choice-img';
      artCanvas.setAttribute('role', 'img');
      artCanvas.setAttribute('aria-label', relic.name);
      artWrap.appendChild(artCanvas);

      const content = document.createElement('div');
      content.className = 'perk-choice-content';

      const stateText = currentRank <= 0
        ? 'New Discovery | Rank I'
        : `Rank ${getRankRoman(currentRank)} → Rank ${getRankRoman(nextRank)}${nextRank >= MAX_RELIC_RANK ? ' (MAX)' : ''}`;
      const statsPreview = formatRelicUpgradePreview(relic, currentRank);

      content.innerHTML = `
        <div class="perk-choice-name">${relic.name}</div>
        <div class="perk-choice-meta"><span style="color: ${meta.color};">${relic.rarity}</span> | ${setDef ? setDef.shortName : ''}</div>
        <div class="perk-choice-state${currentRank > 0 ? ' is-upgrade' : ''}">${stateText}</div>
        <div class="perk-choice-stats">${statsPreview}</div>
        ${willCompleteSet && setDef ? `<div class="perk-choice-set-hint">Completes ${setDef.name} Set!</div>` : ''}
      `;

      btn.appendChild(artWrap);
      btn.appendChild(content);

      btn.addEventListener('click', () => {
        stopDraftTreasureAnimations();
        const beforeCounts = getTreasureCounts(state.perks);
        const wasSetComplete = isSetCompleted(beforeCounts, relic.setId);
        const isFirstDiamondBowl = relic.id === 'bp_6' && getRelicRank(beforeCounts, 'bp_6') === 0;
        state.perks.push(createSavedPerkRecord(relic, nextRank));
        const afterCounts = getTreasureCounts(state.perks);
        const nowSetComplete = !wasSetComplete && isSetCompleted(afterCounts, relic.setId);

        state.isDraftingPerk = false;
        modal.style.display = 'none';

        if (isFirstDiamondBowl) {
          const curBowlPos = getWaterBowlPos();
          const bowlPos = gridToScreen(curBowlPos.gx, curBowlPos.gy);
          particles.push({
            x: bowlPos.x,
            y: bowlPos.y - 4 * getScale(),
            vx: 0,
            vy: 0,
            life: 0.75,
            maxLife: 0.75,
            color: '#9ef0ff',
            size: 4,
            isRing: true
          });
          for (let i = 0; i < 12; i++) {
            const ang = (Math.PI * 2 * i) / 12 + Math.random() * 0.25;
            const spd = 22 + Math.random() * 28;
            particles.push({
              x: bowlPos.x,
              y: bowlPos.y - 4 * getScale(),
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd - 18,
              life: 0.65 + Math.random() * 0.35,
              maxLife: 1.0,
              color: i % 3 === 0 ? '#fff9c4' : (i % 2 === 0 ? '#ffffff' : '#8eeaff'),
              size: 2.2 + Math.random() * 1.8
            });
          }
        }

        if (nowSetComplete && setDef) {
          sfx.shiny();
          addFloatingText(viewportW / 2, viewportH * 0.30, `Set Complete: ${setDef.name}!`, '#55efc4');
        } else {
          sfx.upgrade();
          addFloatingText(viewportW / 2, viewportH * 0.34, `${relic.name} | Rank ${getRankRoman(nextRank)}`, meta.color);
        }

        updateUI();
        saveGame();
        flushQueuedAwayProgressIfReady();
      });

      choicesContainer.appendChild(btn);
      draftArtStops.push(startAnimatedTreasureCanvas(artCanvas, relic.id, relic.rarity, 200));
    });

    modal.style.display = 'flex';
  }

  function drawIslandBase(): void {
    const scale = getScale();
    const depth = 22 * scale;
    const subDepth = 10 * scale;

    // Soft floating island shadow
    const gridSize = getGridSize();
    const center = gridToScreen(gridSize / 2, gridSize / 2);
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(center.x, center.y + depth + 26 * scale, gridSize * getTileW() * 0.52, gridSize * getTileH() * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Determine the 4 outer edges and draw only the two front-facing ones (highest mid-Y)
    const edges = [
      { a: gridToScreen(0, 0), b: gridToScreen(gridSize, 0), shade: '#5d4037', rim: '#4e342e' },
      { a: gridToScreen(gridSize, 0), b: gridToScreen(gridSize, gridSize), shade: '#6d4c41', rim: '#563930' },
      { a: gridToScreen(gridSize, gridSize), b: gridToScreen(0, gridSize), shade: '#5d4037', rim: '#4e342e' },
      { a: gridToScreen(0, gridSize), b: gridToScreen(0, 0), shade: '#6d4c41', rim: '#563930' }
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

  function drawGrandDoghouseManor(): void {
    const pos = gridToScreen(1.0, 1.0);
    const scale = getScale();
    const glowStrength = Math.min(1, 0.34 + weatherWeights.twilight * 0.9 + weatherWeights.rain * 0.45);
    const cosA = Math.cos(cameraAngle);
    const sinA = Math.sin(cameraAngle);
    const viewingBack = (cosA + sinA) < 0;
    const palette = MANOR_COLOR_PALETTES[state.manorColor || 'classic'] || MANOR_COLOR_PALETTES.classic;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    // Grand soft estate ground shadow spanning the 2x2 footprint
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 62, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flagstone & wrap-around veranda foundation
    ctx.fillStyle = palette.foundationFill;
    ctx.strokeStyle = palette.foundationStroke;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.roundRect(-52, 4, 104, 12, 4);
    ctx.fill();
    ctx.stroke();

    // Upper porch deck planking
    ctx.fillStyle = palette.porchFill;
    ctx.strokeStyle = palette.porchStroke;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.roundRect(-49, 1, 98, 7, 2.5);
    ctx.fill();
    ctx.stroke();

    // Warm golden ambient spill onto the front lawn
    if (!viewingBack) {
      const porchGlow = ctx.createRadialGradient(0, 14, 4, 0, 14, 58);
      porchGlow.addColorStop(0, `rgba(255, 232, 152, ${0.44 * glowStrength})`);
      porchGlow.addColorStop(0.55, `rgba(255, 206, 110, ${0.16 * glowStrength})`);
      porchGlow.addColorStop(1, 'rgba(255, 234, 167, 0)');
      ctx.fillStyle = porchGlow;
      ctx.beginPath();
      ctx.ellipse(0, 14, 58, 24, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cozy brick chimney rising from the left roof slope + animated smoke puffs
    const chimX = -30;
    const chimTopY = -66;
    ctx.fillStyle = palette.chimneyFill;
    ctx.strokeStyle = palette.chimneyStroke;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.roundRect(chimX - 5.5, chimTopY, 11, 24, 1.5);
    ctx.fill();
    ctx.stroke();
    // Brick mortar stripes & cap
    ctx.strokeStyle = 'rgba(245, 224, 205, 0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(chimX - 5, chimTopY + 6);
    ctx.lineTo(chimX + 5, chimTopY + 6);
    ctx.moveTo(chimX - 5, chimTopY + 12);
    ctx.lineTo(chimX + 5, chimTopY + 12);
    ctx.stroke();
    ctx.fillStyle = palette.chimneyCapFill;
    ctx.strokeStyle = palette.chimneyStroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(chimX - 7, chimTopY - 3, 14, 3.8, 1.2);
    ctx.fill();
    ctx.stroke();

    // Gentle rising chimney smoke wisps
    for (let i = 0; i < 3; i++) {
      const cyc = (fountainAnimPhase * 0.24 + i / 3) % 1;
      const sx = chimX + Math.sin(cyc * Math.PI * 2 + i) * 4.5 + cyc * 5;
      const sy = chimTopY - 6 - cyc * 24;
      const sr = 2.6 + cyc * 4.2;
      const sa = (1 - cyc) * 0.36;
      ctx.fillStyle = `rgba(235, 242, 250, ${sa})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Left & Right side wing walls
    const wingColors = viewingBack ? palette.wingBack : palette.wingFront;
    const wingGrad = ctx.createLinearGradient(-44, -36, 44, 2);
    wingGrad.addColorStop(0, wingColors[0]);
    wingGrad.addColorStop(0.55, wingColors[1]);
    wingGrad.addColorStop(1, wingColors[2]);
    ctx.fillStyle = wingGrad;
    ctx.strokeStyle = palette.wallStroke;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-45, -34, 90, 36.5, [2.5, 2.5, 0, 0]);
    ctx.fill();
    ctx.stroke();

    // Clapboard siding lines across wings
    ctx.strokeStyle = palette.clapboardStroke;
    ctx.lineWidth = 0.85;
    for (let py = -29; py <= -3; py += 5) {
      ctx.beginPath();
      ctx.moveTo(-44, py);
      ctx.lineTo(44, py);
      ctx.stroke();
    }

    // Corner pillars & decorative base wainscoting
    ctx.fillStyle = palette.trimFill;
    ctx.fillRect(-45.5, -34, 3.4, 36.5);
    ctx.fillRect(42.1, -34, 3.4, 36.5);
    ctx.fillStyle = palette.trimWainscot;
    ctx.fillRect(-44.5, -3.2, 89, 2.6);

    // Side wing multi-pane glowing windows (visible on both front & back!)
    const drawManorWindow = (wx: number, wy: number, w: number, h: number, withFlowerBox: boolean) => {
      const winHalo = ctx.createRadialGradient(wx, wy, 1, wx, wy, 16);
      winHalo.addColorStop(0, `rgba(255, 236, 158, ${0.55 * glowStrength})`);
      winHalo.addColorStop(1, 'rgba(255, 214, 112, 0)');
      ctx.fillStyle = winHalo;
      ctx.beginPath();
      ctx.arc(wx, wy, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.doorFrameFill;
      ctx.strokeStyle = palette.trimStroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(wx - w / 2 - 1.8, wy - h / 2 - 1.8, w + 3.6, h + 3.6, 2);
      ctx.fill();
      ctx.stroke();

      const paneGrad = ctx.createLinearGradient(wx, wy - h / 2, wx, wy + h / 2);
      paneGrad.addColorStop(0, '#fff7c4');
      paneGrad.addColorStop(1, '#f6be4f');
      ctx.fillStyle = paneGrad;
      ctx.fillRect(wx - w / 2, wy - h / 2, w, h);

      // Window muntin crossbars
      ctx.strokeStyle = palette.muntinStroke;
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.moveTo(wx, wy - h / 2);
      ctx.lineTo(wx, wy + h / 2);
      ctx.moveTo(wx - w / 2, wy);
      ctx.lineTo(wx + w / 2, wy);
      ctx.stroke();

      if (withFlowerBox) {
        // Tiny wooden flower box with colorful blossoms
        ctx.fillStyle = palette.porchFill;
        ctx.strokeStyle = palette.porchStroke;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.roundRect(wx - w / 2 - 2.4, wy + h / 2 + 1.2, w + 4.8, 4.2, 1.2);
        ctx.fill();
        ctx.stroke();
        const blooms = ['#ff7675', '#ffeaa7', '#fd79a8', '#55efc4'];
        for (let b = 0; b < 4; b++) {
          const bx = wx - w / 2 - 0.5 + b * ((w + 1) / 3);
          ctx.fillStyle = '#2ecc71';
          ctx.beginPath();
          ctx.arc(bx, wy + h / 2 + 0.8, 1.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = blooms[b % blooms.length];
          ctx.beginPath();
          ctx.arc(bx, wy + h / 2 + 0.2, 1.25, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    drawManorWindow(-32.5, -17.5, 11.5, 11.5, !viewingBack);
    drawManorWindow(32.5, -17.5, 11.5, 11.5, !viewingBack);

    // Wide lower wing roof spanning the entire 2x2 manor
    const wideRoofGrad = ctx.createLinearGradient(-56, -54, 56, -30);
    wideRoofGrad.addColorStop(0, palette.wideRoof[0]);
    wideRoofGrad.addColorStop(0.5, palette.wideRoof[1]);
    wideRoofGrad.addColorStop(1, palette.wideRoof[2]);
    ctx.fillStyle = wideRoofGrad;
    ctx.strokeStyle = palette.roofStroke;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(-55, -31.5);
    ctx.lineTo(-34, -52);
    ctx.lineTo(34, -52);
    ctx.lineTo(55, -31.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle shingle rows along side roof slopes
    ctx.strokeStyle = palette.roofShingleHighlight;
    ctx.lineWidth = 0.85;
    for (let row = 0; row < 3; row++) {
      const y = -36 - row * 5;
      const inset = row * 6.2;
      ctx.beginPath();
      ctx.moveTo(-49 + inset, y);
      ctx.lineTo(49 - inset, y);
      ctx.stroke();
    }

    // Center projecting 2-story Grand Pavilion
    const pavColors = viewingBack ? palette.pavBack : palette.pavFront;
    const pavGrad = ctx.createLinearGradient(-22, -48, 22, 4);
    pavGrad.addColorStop(0, pavColors[0]);
    pavGrad.addColorStop(0.55, pavColors[1]);
    pavGrad.addColorStop(1, pavColors[2]);
    ctx.fillStyle = pavGrad;
    ctx.strokeStyle = palette.wallStroke;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-22, -45, 44, 48.5, [2, 2, 0, 0]);
    ctx.fill();
    ctx.stroke();

    // Center pavilion clapboard lines & columns
    ctx.strokeStyle = palette.clapboardStroke;
    ctx.lineWidth = 0.85;
    for (let py = -40; py <= -2; py += 5) {
      ctx.beginPath();
      ctx.moveTo(-21, py);
      ctx.lineTo(21, py);
      ctx.stroke();
    }
    ctx.fillStyle = palette.doorFrameFill;
    ctx.fillRect(-22.8, -44.5, 3.6, 48);
    ctx.fillRect(19.2, -44.5, 3.6, 48);

    if (viewingBack) {
      // Grand rear stained-glass dormer window
      drawManorWindow(0, -24, 16, 15, false);
    } else {
      // Grand arched doorway frame
      ctx.fillStyle = palette.doorFrameFill;
      ctx.strokeStyle = palette.doorFrameStroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -14.5, 14.2, Math.PI, 0);
      ctx.lineTo(14.2, 3.5);
      ctx.lineTo(-14.2, 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Deep cozy manor interior with warm inner glow
      ctx.fillStyle = '#24140c';
      ctx.beginPath();
      ctx.arc(0, -14.2, 11.8, Math.PI, 0);
      ctx.lineTo(11.8, 3.5);
      ctx.lineTo(-11.8, 3.5);
      ctx.closePath();
      ctx.fill();

      const innerWarm = ctx.createRadialGradient(0, -6, 1, 0, -6, 12);
      innerWarm.addColorStop(0, `rgba(255, 200, 108, ${0.32 * glowStrength})`);
      innerWarm.addColorStop(1, 'rgba(36, 20, 12, 0)');
      ctx.fillStyle = innerWarm;
      ctx.fillRect(-11.5, -24, 23, 27);

      // Plush pillow bed inside doorway with golden piping
      ctx.fillStyle = palette.cushionFill;
      ctx.beginPath();
      ctx.ellipse(0, 2.2, 10.2, 3.4, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffd55a';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-6.5, 1.4);
      ctx.lineTo(6.5, 1.4);
      ctx.stroke();

      // Front porch steps leading onto the grass
      ctx.fillStyle = palette.stepTopFill;
      ctx.strokeStyle = palette.porchStroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-16.5, 4.5, 33, 4.4, 1.5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = palette.stepBottomFill;
      ctx.beginPath();
      ctx.roundRect(-19, 8.6, 38, 4.2, 1.5);
      ctx.fill();
      ctx.stroke();

      // Twin glowing brass porch lanterns flanking the grand entrance
      [-17.2, 17.2].forEach(lx => {
        const ly = -18.5;
        const lHalo = ctx.createRadialGradient(lx, ly, 0.5, lx, ly, 10.5);
        lHalo.addColorStop(0, `rgba(255, 245, 180, ${0.9 * glowStrength})`);
        lHalo.addColorStop(1, 'rgba(255, 210, 105, 0)');
        ctx.fillStyle = lHalo;
        ctx.beginPath();
        ctx.arc(lx, ly, 10.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#c88a1e';
        ctx.fillRect(lx - 1.8, ly - 4.2, 3.6, 1.6);
        ctx.fillStyle = '#fff2a8';
        ctx.beginPath();
        ctx.arc(lx, ly - 0.8, 2.3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Tall central pitched grand manor gable roof
    const mainRoofGrad = ctx.createLinearGradient(-32, -74, 32, -40);
    mainRoofGrad.addColorStop(0, palette.mainRoof[0]);
    mainRoofGrad.addColorStop(0.5, palette.mainRoof[1]);
    mainRoofGrad.addColorStop(1, palette.mainRoof[2]);
    ctx.fillStyle = mainRoofGrad;
    ctx.strokeStyle = palette.roofStroke;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-33, -42);
    ctx.lineTo(0, -74);
    ctx.lineTo(33, -42);
    ctx.lineTo(28.5, -39);
    ctx.lineTo(0, -67.5);
    ctx.lineTo(-28.5, -39);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner gable pediment triangle
    ctx.fillStyle = viewingBack ? palette.gableBack : palette.gableFront;
    ctx.beginPath();
    ctx.moveTo(-25, -42);
    ctx.lineTo(0, -66.8);
    ctx.lineTo(25, -42);
    ctx.closePath();
    ctx.fill();

    // Decorative bargeboard trim along the main peak
    ctx.strokeStyle = palette.doorFrameFill;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-30.5, -40.8);
    ctx.lineTo(0, -70.4);
    ctx.lineTo(30.5, -40.8);
    ctx.stroke();

    // Second-story glowing round oculus dormer window in upper gable
    ctx.fillStyle = palette.doorFrameFill;
    ctx.strokeStyle = palette.trimStroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -53.5, 6.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(0, -53.5, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.muntinStroke;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(0, -58);
    ctx.lineTo(0, -49);
    ctx.moveTo(-4.5, -53.5);
    ctx.lineTo(4.5, -53.5);
    ctx.stroke();

    // Gilded royal bone nameplate mounted below the upper gable (front view)
    if (!viewingBack) {
      ctx.fillStyle = '#ffd55a';
      ctx.strokeStyle = '#6c3e1b';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.roundRect(-7.4, -40.8, 14.8, 4.6, 1.8);
      ctx.fill();
      ctx.stroke();
      [-7.4, 7.4].forEach(bx => {
        ctx.beginPath();
        ctx.arc(bx, -40.0, 2.0, 0, Math.PI * 2);
        ctx.arc(bx, -37.0, 2.0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Gleaming 24k gold roof spire & miniature paw finial crowning the peak
    ctx.strokeStyle = '#7c440e';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -72.5);
    ctx.lineTo(0, -83.5);
    ctx.stroke();
    ctx.strokeStyle = '#ffe169';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Golden orb + tiny twinkling sparkle on spire tip
    ctx.fillStyle = '#ffd55a';
    ctx.strokeStyle = '#7c440e';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(0, -84.5, 3.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const spireGlint = 0.5 + 0.5 * Math.sin(fountainAnimPhase * 1.4);
    drawMiniSparkle(0, -86.5, 2.2 + spireGlint * 1.6, '#fff9c4', 0.45 + spireGlint * 0.5);

    ctx.restore();
  }

  function hasDiamondBowl(): boolean {
    return state.perks.some(p => p && (p.id === 'bp_6' || p.name === 'Diamond Bowl'));
  }

  function drawMiniSparkle(
    x: number,
    y: number,
    r: number,
    color: string,
    alpha: number,
    targetCtx: CanvasRenderingContext2D = ctx
  ): void {
    if (r <= 0.2 || alpha <= 0.02) return;
    targetCtx.save();
    targetCtx.globalAlpha = Math.max(0, Math.min(1, alpha));
    targetCtx.fillStyle = color;
    targetCtx.beginPath();
    targetCtx.moveTo(x, y - r);
    targetCtx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
    targetCtx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
    targetCtx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
    targetCtx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
    targetCtx.closePath();
    targetCtx.fill();
    targetCtx.restore();
  }

  function drawDogWaterBowl(): void {
    const bowlPos = getWaterBowlPos();
    const pos = gridToScreen(bowlPos.gx, bowlPos.gy);
    const scale = getScale();
    const isBeingDrunk = dogs.some(d => d.state === 'DRINK' && d.drinkTarget?.kind === 'bowl');
    const isDiamond = hasDiamondBowl();

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    if (isDiamond) {
      // Soft icy crystal aura refracting light across the ground
      const auraPulse = 0.86 + 0.14 * Math.sin(fountainAnimPhase * 0.85);
      const aura = ctx.createRadialGradient(0, -1, 1.5, 0, 0.5, 16 * auraPulse);
      aura.addColorStop(0, 'rgba(145, 245, 255, 0.42)');
      aura.addColorStop(0.55, 'rgba(66, 196, 245, 0.18)');
      aura.addColorStop(1, 'rgba(66, 196, 245, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.ellipse(0, 1.2, 16.5, 8.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ground shadow
      ctx.fillStyle = 'rgba(14, 34, 64, 0.30)';
      ctx.beginPath();
      ctx.ellipse(0, 3.4, 11.8, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Faceted diamond crystal bowl body
      const diamondGrad = ctx.createLinearGradient(-11, -4.5, 11, 4.5);
      diamondGrad.addColorStop(0, '#eeffff');
      diamondGrad.addColorStop(0.32, '#8eeaff');
      diamondGrad.addColorStop(0.72, '#42c4f5');
      diamondGrad.addColorStop(1, '#2286d1');
      ctx.fillStyle = diamondGrad;
      ctx.strokeStyle = '#1f3a63';
      ctx.lineWidth = 1.15;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-8.4, -4.0);
      ctx.lineTo(8.4, -4.0);
      ctx.lineTo(10.8, 1.6);
      ctx.quadraticCurveTo(0, 6.2, -10.8, 1.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bright specular crystal facet planes (left & right)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
      ctx.beginPath();
      ctx.moveTo(-8.4, -4.0);
      ctx.lineTo(-3.8, -2.8);
      ctx.lineTo(-5.2, 4.4);
      ctx.lineTo(-10.8, 1.6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
      ctx.beginPath();
      ctx.moveTo(3.8, -2.8);
      ctx.lineTo(8.4, -4.0);
      ctx.lineTo(10.8, 1.6);
      ctx.lineTo(5.2, 4.4);
      ctx.closePath();
      ctx.fill();

      // Crisp crystal facet edge lines
      ctx.strokeStyle = '#2570b5';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(-3.8, -2.8);
      ctx.lineTo(-5.2, 4.4);
      ctx.moveTo(3.8, -2.8);
      ctx.lineTo(5.2, 4.4);
      ctx.stroke();

      // Miniature golden paw crest on front crystal facet
      ctx.fillStyle = '#ffd55a';
      ctx.strokeStyle = '#7c440e';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.ellipse(0, 2.2, 1.8, 1.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const pawToes: Array<[number, number]> = [
        [-1.9, 0.9],
        [-0.7, 0.25],
        [0.7, 0.25],
        [1.9, 0.9]
      ];
      for (const [tx, ty] of pawToes) {
        ctx.beginPath();
        ctx.arc(tx, ty, 0.58, 0, Math.PI * 2);
        ctx.fill();
      }

      // Icy faceted crystal top rim
      ctx.fillStyle = '#d4faff';
      ctx.strokeStyle = '#1f3a63';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(0, -4.0, 8.6, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sparkling crystal-clear water inside
      const waterGrad = ctx.createRadialGradient(-2, -4.6, 0.6, 0, -3.7, 7.2);
      waterGrad.addColorStop(0, '#f0ffff');
      waterGrad.addColorStop(0.45, '#7deeff');
      waterGrad.addColorStop(1, '#269de6');
      ctx.fillStyle = waterGrad;
      ctx.beginPath();
      ctx.ellipse(0, -3.7, 6.9, 2.65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Animated water ripples while drinking or bright prism glint while idle
      if (isBeingDrunk) {
        for (let r = 0; r < 2; r++) {
          const cycle = (fountainAnimPhase * 0.75 + r * 0.5) % 1;
          ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - cycle) * 0.9})`;
          ctx.lineWidth = 0.95;
          ctx.beginPath();
          ctx.ellipse(0, -3.7, 1.5 + cycle * 4.8, (1.5 + cycle * 4.8) * 0.4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        const glint = 0.55 + 0.3 * Math.sin(fountainAnimPhase * 1.1);
        ctx.strokeStyle = `rgba(255, 255, 255, ${glint})`;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.ellipse(-1.8, -4.3, 2.7, 0.9, -0.15, Math.PI * 1.05, Math.PI * 1.85);
        ctx.stroke();
      }

      // Twinkling diamond sparkles floating near rim
      const sp1 = 0.5 + 0.5 * Math.sin(fountainAnimPhase * 1.6);
      const sp2 = 0.5 + 0.5 * Math.sin(fountainAnimPhase * 1.6 + 2.1);
      drawMiniSparkle(-7.5, -6.4 - sp1 * 1.6, 1.6 + sp1 * 1.2, '#fff9c4', 0.45 + sp1 * 0.5);
      drawMiniSparkle(7.4, -4.8 - sp2 * 1.4, 1.3 + sp2 * 1.1, '#ffffff', 0.4 + sp2 * 0.55);
      drawMiniSparkle(1.8, -8.8 - sp2 * 1.2, 1.1 + sp1 * 0.9, '#b8f7ff', 0.35 + sp1 * 0.55);

      ctx.restore();
      return;
    }

    // Soft ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
    ctx.beginPath();
    ctx.ellipse(0, 3.2, 11.5, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ceramic tapered water bowl body matching the doghouse's slate-blue roof
    const bowlGrad = ctx.createLinearGradient(-10, -4, 10, 3);
    bowlGrad.addColorStop(0, '#6bb2e6');
    bowlGrad.addColorStop(0.45, '#4682b4');
    bowlGrad.addColorStop(1, '#2b5478');
    ctx.fillStyle = bowlGrad;
    ctx.strokeStyle = '#1e3a52';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(-8.2, -3.8);
    ctx.lineTo(-10.2, 1.4);
    ctx.ellipse(0, 1.4, 10.2, 4.4, 0, Math.PI, 0, true);
    ctx.lineTo(8.2, -3.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle glossy ceramic specular highlight on left front curve
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.ellipse(-5.2, -0.4, 1.5, 2.3, -0.18, 0, Math.PI * 2);
    ctx.fill();

    // Tiny white painted bone emblem on the front wall
    ctx.fillStyle = '#fff5dc';
    ctx.beginPath();
    ctx.roundRect(-2.3, 1.0, 4.6, 1.5, 0.7);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-2.4, 1.3, 0.85, 0, Math.PI * 2);
    ctx.arc(-2.4, 2.2, 0.85, 0, Math.PI * 2);
    ctx.arc(2.4, 1.3, 0.85, 0, Math.PI * 2);
    ctx.arc(2.4, 2.2, 0.85, 0, Math.PI * 2);
    ctx.fill();

    // Cream ceramic top rim
    ctx.fillStyle = '#f2e8d5';
    ctx.strokeStyle = '#1e3a52';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(0, -3.8, 8.4, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Fresh sky-aqua water surface
    const waterGrad = ctx.createRadialGradient(-2, -4.4, 0.8, 0, -3.6, 7.2);
    waterGrad.addColorStop(0, '#c8fbff');
    waterGrad.addColorStop(0.5, '#5cd6f5');
    waterGrad.addColorStop(1, '#1e90d6');
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.ellipse(0, -3.5, 6.8, 2.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Animated water ripples while a pup is lapping (or gentle idle shimmer)
    if (isBeingDrunk) {
      for (let r = 0; r < 2; r++) {
        const cycle = (fountainAnimPhase * 0.75 + r * 0.5) % 1;
        ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - cycle) * 0.82})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(0, -3.5, 1.5 + cycle * 4.8, (1.5 + cycle * 4.8) * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      const glint = 0.42 + 0.25 * Math.sin(fountainAnimPhase * 0.9);
      ctx.strokeStyle = `rgba(255, 255, 255, ${glint})`;
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.ellipse(-1.8, -4.1, 2.6, 0.9, -0.15, Math.PI * 1.05, Math.PI * 1.85);
      ctx.stroke();
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
    const breezeAmp = 0.55 + weatherWeights.windy * 1.15;
    const tileSeed = gx * 2.13 + gy * 3.41;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    // Soft grounded shadow under garden bed
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0.5, 4.2, 18.5, 9.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cozy back-rim garden border stones
    const borderStones = [
      { x: -14.2, y: -0.2, rx: 3.1, ry: 1.8, rot: -0.25, c: '#8d99a6', hi: '#c5d0db', front: false },
      { x: -9.5, y: -3.2, rx: 3.3, ry: 1.8, rot: -0.15, c: '#9ba7b4', hi: '#d1dbe5', front: false },
      { x: -3.4, y: -4.4, rx: 3.5, ry: 1.8, rot: 0, c: '#85929e', hi: '#bcc7d1', front: false },
      { x: 3.6, y: -4.3, rx: 3.4, ry: 1.8, rot: 0.08, c: '#9aa6b2', hi: '#d0dae3', front: false },
      { x: 9.8, y: -3.0, rx: 3.2, ry: 1.8, rot: 0.2, c: '#8693a0', hi: '#bec9d4', front: false },
      { x: 14.3, y: -0.1, rx: 3.1, ry: 1.8, rot: 0.28, c: '#7f8c99', hi: '#b6c2cd', front: false },
      { x: -13.6, y: 3.0, rx: 3.2, ry: 1.9, rot: 0.25, c: '#8a96a3', hi: '#c7d2dc', front: true },
      { x: -8.4, y: 5.5, rx: 3.5, ry: 2.0, rot: 0.16, c: '#9aa6b3', hi: '#d6e0e9', front: true },
      { x: -2.6, y: 6.7, rx: 3.6, ry: 2.0, rot: 0.04, c: '#85929f', hi: '#c2cdd8', front: true },
      { x: 3.4, y: 6.6, rx: 3.5, ry: 2.0, rot: -0.05, c: '#96a2af', hi: '#d3dde6', front: true },
      { x: 9.1, y: 5.2, rx: 3.4, ry: 1.9, rot: -0.18, c: '#818e9b', hi: '#bcc7d2', front: true },
      { x: 13.8, y: 2.7, rx: 3.1, ry: 1.8, rot: -0.26, c: '#7a8794', hi: '#b5c1cc', front: true }
    ];

    const drawGardenStone = (st: typeof borderStones[number]): void => {
      ctx.save();
      ctx.translate(st.x, st.y);
      ctx.rotate(st.rot);
      ctx.fillStyle = '#56606b';
      ctx.beginPath();
      ctx.ellipse(0, 0.7, st.rx, st.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.c;
      ctx.beginPath();
      ctx.ellipse(0, 0, st.rx, st.ry * 0.92, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.hi;
      ctx.beginPath();
      ctx.ellipse(-st.rx * 0.22, -st.ry * 0.26, st.rx * 0.48, st.ry * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    borderStones.filter(st => !st.front).forEach(drawGardenStone);

    // Rich shaded dark-loam flowerbed soil
    const soilGrad = ctx.createRadialGradient(-2, -1, 1.5, 0, 1.2, 15.5);
    soilGrad.addColorStop(0, '#7c502e');
    soilGrad.addColorStop(0.65, '#5f3a1f');
    soilGrad.addColorStop(1, '#432713');
    ctx.fillStyle = soilGrad;
    ctx.beginPath();
    ctx.ellipse(0, 1.2, 14.2, 6.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lush deep-emerald back foliage cushion
    const backLeaves = [
      { x: -10.2, y: -0.6, rx: 5.2, ry: 3.1, rot: -0.45 },
      { x: -4.8, y: -2.4, rx: 5.8, ry: 3.5, rot: -0.18 },
      { x: 1.8, y: -2.8, rx: 6.0, ry: 3.6, rot: 0.1 },
      { x: 8.6, y: -1.4, rx: 5.4, ry: 3.2, rot: 0.38 },
      { x: 11.4, y: 0.6, rx: 4.4, ry: 2.6, rot: 0.52 }
    ];
    ctx.fillStyle = '#1b7a43';
    backLeaves.forEach(lf => {
      ctx.save();
      ctx.translate(lf.x, lf.y);
      ctx.rotate(lf.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, lf.rx, lf.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Mid-tone scalloped leaves & leafy shoots
    const drawPointedLeaf = (
      x: number,
      y: number,
      angle: number,
      length: number,
      width: number,
      fill: string,
      vein: string
    ): void => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(length * 0.48, -width, length, 0);
      ctx.quadraticCurveTo(length * 0.48, width, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = vein;
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(length * 0.15, 0);
      ctx.lineTo(length * 0.78, 0);
      ctx.stroke();
      ctx.restore();
    };

    drawPointedLeaf(-5.5, 0.5, -2.55, 8.8, 3.0, '#27ae60', 'rgba(123,237,159,0.55)');
    drawPointedLeaf(-1.5, -1.2, -1.95, 8.2, 2.8, '#2ecc71', 'rgba(190,255,205,0.55)');
    drawPointedLeaf(3.2, -1.0, -0.95, 8.4, 2.9, '#27ae60', 'rgba(123,237,159,0.55)');
    drawPointedLeaf(6.2, 0.6, -0.45, 8.6, 2.9, '#2ecc71', 'rgba(190,255,205,0.55)');
    drawPointedLeaf(-8.2, 2.2, -2.9, 6.8, 2.4, '#2ecc71', 'rgba(190,255,205,0.5)');
    drawPointedLeaf(8.0, 2.5, 0.12, 6.8, 2.4, '#27ae60', 'rgba(123,237,159,0.5)');

    // Front cozy garden stones (hugging the front soil rim)
    borderStones.filter(st => st.front).forEach(drawGardenStone);

    // Subtle sunlit moss/leaf puffs nestled just inside front rim
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.ellipse(-6.0, 2.6, 4.4, 2.2, -0.15, 0, Math.PI * 2);
    ctx.ellipse(0.5, 3.4, 5.0, 2.3, 0.05, 0, Math.PI * 2);
    ctx.ellipse(6.8, 2.5, 4.3, 2.1, 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Multi-petal storybook blossoms arranged back-to-front with gentle breeze sway
    const flowerData = [
      { bx: -3.2, by: -2.2, h: 11.2, lean: -1.6, r: 4.5, petals: 5, c: '#a29bfe', shade: '#6c5ce7', hi: '#e3e0ff', center: '#fff3b0', phase: 0.4 },
      { bx: 4.6, by: -2.0, h: 10.8, lean: 1.8, r: 4.4, petals: 5, c: '#ff7675', shade: '#d63031', hi: '#ffc2c2', center: '#ffeaa7', phase: 1.5 },
      { bx: -8.2, by: 0.4, h: 8.8, lean: -2.2, r: 4.1, petals: 5, c: '#fd79a8', shade: '#d63384', hi: '#ffd0e3', center: '#ffeaa7', phase: 2.3 },
      { bx: 9.0, by: 0.6, h: 8.6, lean: 2.3, r: 4.0, petals: 5, c: '#ffeaa7', shade: '#f39c12', hi: '#fffbe6', center: '#e17055', phase: 3.1 },
      { bx: 0.4, by: 0.8, h: 9.8, lean: -0.4, r: 4.7, petals: 6, c: '#ffffff', shade: '#ced6e0', hi: '#ffffff', center: '#f9ca24', phase: 0.9 },
      { bx: -4.4, by: 2.6, h: 7.4, lean: -1.1, r: 3.9, petals: 5, c: '#74b9ff', shade: '#0984e3', hi: '#d0e8ff', center: '#ffeaa7', phase: 4.0 },
      { bx: 5.0, by: 2.8, h: 7.2, lean: 1.2, r: 3.9, petals: 5, c: '#fab1a0', shade: '#e17055', hi: '#ffe3dc', center: '#fff3b0', phase: 5.1 }
    ];

    flowerData.forEach(f => {
      const sway = Math.sin(fountainAnimPhase * 0.65 + tileSeed + f.phase) * breezeAmp;
      const hx = f.bx + f.lean + sway;
      const hy = f.by - f.h;
      const ctrlX = f.bx + (f.lean + sway) * 0.35;
      const ctrlY = f.by - f.h * 0.52;

      // Curved organic stem
      ctx.strokeStyle = '#1b8a4e';
      ctx.lineWidth = 1.65;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(f.bx, f.by);
      ctx.quadraticCurveTo(ctrlX, ctrlY, hx, hy);
      ctx.stroke();

      ctx.strokeStyle = '#55efc4';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(f.bx - 0.3, f.by - 0.6);
      ctx.quadraticCurveTo(ctrlX - 0.3, ctrlY, hx - 0.25, hy + 1.0);
      ctx.stroke();

      // Tiny stem side leaf
      const leafSide = f.lean >= 0 ? -1 : 1;
      drawPointedLeaf(
        (f.bx + hx) * 0.5,
        (f.by + hy) * 0.5 + 0.8,
        leafSide > 0 ? -0.45 : -2.65,
        4.2,
        1.5,
        '#2ecc71',
        'rgba(220,255,220,0.45)'
      );

      // Blossom rosette
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(sway * 0.06);

      // Subtle petal underside shadow for depth
      ctx.fillStyle = f.shade;
      for (let p = 0; p < f.petals; p++) {
        const a = (p / f.petals) * Math.PI * 2 - Math.PI * 0.5;
        const px = Math.cos(a) * f.r * 0.56;
        const py = Math.sin(a) * f.r * 0.48 + 0.65;
        ctx.beginPath();
        ctx.ellipse(px, py, f.r * 0.46, f.r * 0.36, a, 0, Math.PI * 2);
        ctx.fill();
      }

      // Main vivid petals
      ctx.fillStyle = f.c;
      for (let p = 0; p < f.petals; p++) {
        const a = (p / f.petals) * Math.PI * 2 - Math.PI * 0.5;
        const px = Math.cos(a) * f.r * 0.56;
        const py = Math.sin(a) * f.r * 0.48;
        ctx.beginPath();
        ctx.ellipse(px, py, f.r * 0.45, f.r * 0.35, a, 0, Math.PI * 2);
        ctx.fill();
      }

      // Upper sunlit petal highlights
      ctx.fillStyle = f.hi;
      for (let p = 0; p < f.petals; p++) {
        const a = (p / f.petals) * Math.PI * 2 - Math.PI * 0.5;
        if (Math.sin(a) > 0.35) continue;
        const px = Math.cos(a) * f.r * 0.62;
        const py = Math.sin(a) * f.r * 0.52 - 0.35;
        ctx.beginPath();
        ctx.ellipse(px, py, f.r * 0.24, f.r * 0.15, a, 0, Math.PI * 2);
        ctx.fill();
      }

      // Warm shaded blossom center & bright pollen glint
      ctx.fillStyle = 'rgba(90, 48, 12, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0.35, f.r * 0.34, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = f.center;
      ctx.beginPath();
      ctx.arc(0, 0, f.r * 0.32, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.beginPath();
      ctx.arc(-f.r * 0.09, -f.r * 0.09, f.r * 0.11, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // Delicate baby's-breath micro-blossoms & buds for storybook fullness
    const microBuds = [
      { x: -10.8, y: -4.2, c: '#ffeaa7', r: 1.2 },
      { x: -0.8, y: -13.6, c: '#ffd0e3', r: 1.15 },
      { x: 7.4, y: -9.8, c: '#ffffff', r: 1.1 },
      { x: 11.4, y: -3.2, c: '#dfe6e9', r: 1.15 },
      { x: 0.6, y: -4.0, c: '#ffeaa7', r: 1.05 }
    ];
    microBuds.forEach((b, idx) => {
      const sway = Math.sin(fountainAnimPhase * 0.72 + tileSeed + idx * 1.3) * breezeAmp * 0.55;
      ctx.fillStyle = b.c;
      ctx.beginPath();
      ctx.arc(b.x + sway, b.y, b.r, 0, Math.PI * 2);
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

  function dropTreatForActivePack(kind: WorldTreatKind): void {
    const cfg = WORLD_TREAT_CONFIG[kind];
    if (!cfg || dogs.length === 0) return;
    const scale = Math.max(0.01, getScale());
    const gridSize = getGridSize();

    dogs.forEach(dog => {
      // Stacking rule: at most 1 active treat of each kind on screen per dog at a time
      const existingSameKind = worldTreats.find(
        t => !t.consumed && t.ownerRosterId === dog.rosterId && t.kind === kind
      );
      if (existingSameKind) {
        if (existingSameKind.landed && !existingSameKind.beingEaten) {
          existingSameKind.vz = 42;
          existingSameKind.height = Math.max(existingSameKind.height, 1.5);
          existingSameKind.landed = false;
          existingSameKind.bounced = true;
        }
        dog.alertForTreat(existingSameKind);
        return;
      }

      const isSliding = (dog.state === 'SLIDE_CLIMB' || dog.state === 'SLIDE_DOWN') && Boolean(dog.slideTarget);
      const baseGx = isSliding && dog.slideTarget
        ? Math.min(gridSize - 0.5, dog.slideTarget.gx + 1.66)
        : dog.gx;
      const baseGy = isSliding && dog.slideTarget ? dog.slideTarget.gy + 0.5 : dog.gy;
      const baseScreen = gridToScreen(baseGx, baseGy);

      const effectiveFacing = (dog.state === 'SLEEP' || dog.state === 'LAY' || dog.state === 'SIT')
        ? dog.sleepFacingRight
        : dog.facingRight;
      const faceSign = effectiveFacing ? 1 : -1;
      const reachPx = getBreedTreatReachPx(dog.breed);

      // If this dog already has other distinct treat types waiting, fan them neatly beside each other
      const otherActiveCount = worldTreats.filter(t => !t.consumed && t.ownerRosterId === dog.rosterId).length;
      const spreadPattern: Array<[number, number]> = [
        [0, 0],
        [7, 7],
        [-5, 9],
        [10, -4],
        [-6, -5],
        [4, 12]
      ];
      const [spreadX, spreadY] = spreadPattern[otherActiveCount % spreadPattern.length];

      // Place treat cleanly ahead and slightly toward the foreground (-EAT_TREAT_DY_PX) so it stays fully visible
      const rawGrid = screenToGrid(
        baseScreen.x + (faceSign * reachPx + spreadX) * scale,
        baseScreen.y + (-EAT_TREAT_DY_PX + spreadY) * scale
      );
      const clampedGx = Math.max(0.42, Math.min(gridSize - 0.42, rawGrid.gx));
      const clampedGy = Math.max(0.42, Math.min(gridSize - 0.42, rawGrid.gy));
      const safePos = isPointBlockedByObstacle(clampedGx, clampedGy, 0.04)
        ? pushOutsideAllObstacles(clampedGx, clampedGy, 0.07)
        : { gx: clampedGx, gy: clampedGy };

      const treat: WorldTreat = {
        id: nextWorldTreatId++,
        kind,
        ownerRosterId: dog.rosterId,
        gx: Math.max(0.42, Math.min(gridSize - 0.42, safePos.gx)),
        gy: Math.max(0.42, Math.min(gridSize - 0.42, safePos.gy)),
        height: 54 + Math.random() * 18,
        vz: 16 + Math.random() * 16,
        bounced: false,
        landed: false,
        eatDuration: cfg.minSec + Math.random() * (cfg.maxSec - cfg.minSec),
        eatElapsed: 0,
        beingEaten: false,
        consumed: false,
        age: 0,
        rot: (Math.random() - 0.5) * 0.28
      };

      worldTreats.push(treat);
      dog.alertForTreat(treat);
    });
  }

  function updateWorldTreats(dt: number): void {
    if (worldTreats.length === 0) return;
    const activeIds = new Set(dogs.map(d => d.rosterId));

    for (let i = worldTreats.length - 1; i >= 0; i--) {
      const t = worldTreats[i];
      t.age += dt;

      if (t.consumed || !activeIds.has(t.ownerRosterId) || (!t.beingEaten && t.age > 35)) {
        t.consumed = true;
        worldTreats.splice(i, 1);
        continue;
      }

      if (!t.landed) {
        t.vz -= 460 * dt;
        t.height += t.vz * dt;
        if (t.height <= 0) {
          t.height = 0;
          if (!t.bounced) {
            t.bounced = true;
            t.vz = 72 + Math.random() * 22;
            const pos = gridToScreen(t.gx, t.gy);
            const s = getScale();
            const crumbs = WORLD_TREAT_CONFIG[t.kind].crumbs;
            for (let k = 0; k < 3; k++) {
              particles.push({
                x: pos.x + (Math.random() - 0.5) * 10 * s,
                y: pos.y - 2 * s,
                vx: (Math.random() - 0.5) * 34,
                vy: -20 - Math.random() * 16,
                life: 0.34,
                maxLife: 0.34,
                color: crumbs[k % crumbs.length],
                size: 2.0 * s
              });
            }
          } else {
            t.vz = 0;
            t.landed = true;
          }
        }
      }
    }
  }

  function drawWorldTreat(t: WorldTreat): void {
    const pos = gridToScreen(t.gx, t.gy);
    const scale = getScale();
    const ink = '#261738';
    const eatRatio = t.eatDuration > 0 ? Math.min(1, t.eatElapsed / t.eatDuration) : 0;
    const biteScale = Math.max(0.42, 1.1 - eatRatio * 0.56);
    const nibbleX = t.beingEaten ? Math.sin(t.age * 28) * 0.85 : 0;
    const nibbleY = t.beingEaten ? Math.abs(Math.sin(t.age * 16)) * -0.65 : 0;
    const shadowScale = Math.max(0.35, 1 - t.height / 95) * biteScale;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    // Soft grounded shadow under the treat
    ctx.fillStyle = `rgba(18, 28, 22, ${(0.32 * shadowScale).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(0, 2.2, 9.2 * shadowScale, 4.0 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(nibbleX, -t.height + nibbleY);
    ctx.scale(biteScale, biteScale);

    if (t.kind === 'free') {
      // Crunchy Snaps: two mini honey-baked HUD-style snap biscuits
      drawHudStyleBone(ctx, { x: -3.2, y: -1.5, width: 14.5, rot: -0.32 + t.rot, outlineScale: 0.56, ...HUD_BONE_PRESETS.biscuit });
      drawHudStyleBone(ctx, { x: 3.6, y: 0.6, width: 14.0, rot: 0.26 + t.rot, outlineScale: 0.56, ...HUD_BONE_PRESETS.biscuitLight });
    } else if (t.kind === 'xp') {
      // Starlight XP Biscuit: golden HUD-style bone with lavender XP star emblem
      drawHudStyleBone(ctx, { x: 0, y: -1.2, width: 20.5, rot: -0.22 + t.rot, outlineScale: 0.58, ...HUD_BONE_PRESETS.biscuit });
      ctx.save();
      ctx.translate(0, -1.2);
      ctx.rotate(-0.22 + t.rot);
      ctx.fillStyle = '#a29bfe';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? 3.5 : 1.55;
        const px = Math.cos(ang) * rad;
        const py = Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (t.kind === 'feast') {
      // Jumbo Meaty Bone: bold savory roasted meat-colored HUD-style bone
      drawHudStyleBone(ctx, { x: 0, y: -1.4, width: 23.5, rot: -0.25 + t.rot, outlineScale: 0.6, ...HUD_BONE_PRESETS.meaty });
    } else if (t.kind === 'cup') {
      // Puppuccino: blue paper pup cup with vanilla whipped-cream swirl (lowers as eaten)
      const creamScale = Math.max(0.25, 1 - eatRatio * 0.78);
      const cupGrad = ctx.createLinearGradient(-6, -7, 6, 2);
      cupGrad.addColorStop(0, '#74b9ff');
      cupGrad.addColorStop(1, '#4a69bd');
      ctx.fillStyle = cupGrad;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(-6.2, -7.2);
      ctx.lineTo(6.2, -7.2);
      ctx.lineTo(4.6, 1.4);
      ctx.quadraticCurveTo(0, 2.8, -4.6, 1.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // White paper cup lip
      ctx.fillStyle = '#f5f6fa';
      ctx.beginPath();
      ctx.roundRect(-7.0, -8.5, 14.0, 2.3, 1.1);
      ctx.fill();
      ctx.stroke();

      // Fluffy whipped cream peak
      ctx.save();
      ctx.translate(0, -8.2);
      ctx.scale(1, creamScale);
      const creamGrad = ctx.createLinearGradient(0, -8, 0, 1);
      creamGrad.addColorStop(0, '#ffffff');
      creamGrad.addColorStop(1, '#ece7ff');
      ctx.fillStyle = creamGrad;
      ctx.beginPath();
      ctx.moveTo(-5.8, 0.2);
      ctx.quadraticCurveTo(-6.4, -4.2, -2.2, -4.8);
      ctx.quadraticCurveTo(-1.2, -8.2, 1.6, -7.4);
      ctx.quadraticCurveTo(4.8, -6.2, 4.2, -3.6);
      ctx.quadraticCurveTo(6.6, -2.8, 5.8, 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      if (eatRatio < 0.72) {
        drawHudStyleBone(ctx, {
          x: 4.2,
          y: -11.5 * creamScale - 2.2,
          width: 8.6,
          rot: 0.52,
          outlineScale: 0.48,
          ...HUD_BONE_PRESETS.biscuitLight
        });
      }
    } else if (t.kind === 'kong') {
      // PB-Stuffed Kong: tiered ruby-red rubber Kong with creamy peanut butter peeking out
      const pbScale = Math.max(0.18, 1 - eatRatio * 0.85);
      const redGrad = ctx.createLinearGradient(-6, -12, 6, 2);
      redGrad.addColorStop(0, '#ff6b6b');
      redGrad.addColorStop(0.55, '#e83a3a');
      redGrad.addColorStop(1, '#a81818');
      ctx.fillStyle = redGrad;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.25;

      // Bottom, middle, top Kong bulbs
      ctx.beginPath();
      ctx.ellipse(0, -1.2, 6.2, 4.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -6.2, 4.8, 3.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -10.4, 3.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glossy red shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-2.8, -1.8, 1.3, 2.1, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Overflowing creamy peanut butter
      ctx.save();
      ctx.translate(0, -11.6);
      ctx.scale(1, pbScale);
      ctx.fillStyle = '#e69f38';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-2.7, 0.4);
      ctx.quadraticCurveTo(-2.2, -3.0, 0, -2.4);
      ctx.quadraticCurveTo(2.4, -3.2, 2.7, 0.4);
      ctx.quadraticCurveTo(3.3, 2.6, 1.4, 2.4);
      ctx.quadraticCurveTo(0, 0.9, -1.3, 2.9);
      ctx.quadraticCurveTo(-3.2, 2.2, -2.7, 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else {
      // Sizzling Bacon Strip: wavy crimson-brown bacon with marbled cream-gold ribbons
      ctx.save();
      ctx.translate(0, -1.6);
      ctx.rotate(-0.22 + t.rot);
      const traceBacon = (yOff: number, halfH: number): void => {
        ctx.beginPath();
        ctx.moveTo(-10.5, yOff - halfH + 1);
        ctx.bezierCurveTo(-5, yOff - halfH - 2.6, -1, yOff - halfH + 2.8, 4.5, yOff - halfH - 2.0);
        ctx.quadraticCurveTo(8, yOff - halfH - 2.8, 10.5, yOff - halfH + 0.5);
        ctx.lineTo(10.5, yOff + halfH + 0.5);
        ctx.quadraticCurveTo(8, yOff + halfH - 2.8, 4.5, yOff + halfH - 2.0);
        ctx.bezierCurveTo(-1, yOff + halfH + 2.8, -5, yOff + halfH - 2.6, -10.5, yOff + halfH + 1);
        ctx.closePath();
      };
      const baconGrad = ctx.createLinearGradient(0, -5, 0, 5);
      baconGrad.addColorStop(0, '#d9483b');
      baconGrad.addColorStop(0.55, '#b82e24');
      baconGrad.addColorStop(1, '#851c16');
      ctx.fillStyle = baconGrad;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.3;
      traceBacon(0, 4.4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffe5c2';
      traceBacon(-1.1, 1.1);
      ctx.fill();
      ctx.fillStyle = '#ffd1a3';
      traceBacon(1.6, 0.9);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  function drawFreshToySparkle(x: number, y: number, phaseOffset: number, maxRadius = 4.2): void {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.0055 + phaseOffset);
    const r = maxRadius * (0.45 + 0.55 * pulse);
    const inner = r * 0.28;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = `rgba(255, 252, 224, ${(0.55 + 0.45 * pulse).toFixed(2)})`;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(inner, -inner);
    ctx.lineTo(r, 0);
    ctx.lineTo(inner, inner);
    ctx.lineTo(0, r);
    ctx.lineTo(-inner, inner);
    ctx.lineTo(-r, 0);
    ctx.lineTo(-inner, -inner);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawTennisBall(): void {
    if (!state.hasTennisBall) return;
    const pos = gridToScreen(tennisBall.gx, tennisBall.gy);
    const scale = getScale();
    const isFresh = isFreshBallActive();
    const isWorn = !isFresh && state.digPower >= MAX_DIG_POWER;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    const bounceOffset = Math.max(0, tennisBall.z);
    const shadowScale = Math.max(0.52, 1 - bounceOffset / 44);
    ctx.fillStyle = `rgba(0,0,0,${(0.32 * shadowScale).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(0, 4, 7 * shadowScale, 3.5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, -bounceOffset);

    // Subtle squash-and-stretch during obstacle ricochets and ground landings
    const sq = tennisBall.squash;
    if (Math.abs(sq) > 0.005) {
      ctx.translate(0, -4);
      ctx.scale(1 + sq, 1 - sq * 0.8);
      ctx.translate(0, 4);
    }

    ctx.fillStyle = isFresh ? '#d8ff1f' : (isWorn ? '#b7d42c' : '#ccff00');
    ctx.strokeStyle = isFresh ? '#7aa800' : (isWorn ? '#6d7f23' : '#739900');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Classic curved tennis seam rotating smoothly with ball spin
    ctx.save();
    ctx.translate(0, -4);
    ctx.rotate(tennisBall.spinAngle);
    ctx.strokeStyle = isFresh ? 'rgba(255,255,255,0.92)' : (isWorn ? 'rgba(240,242,225,0.45)' : 'rgba(255,255,255,0.65)');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-2.6, 0, 3.8, -0.85, 0.85);
    ctx.stroke();

    if (isWorn) {
      // Cute subtle scuff mark when Well-Loved
      ctx.fillStyle = 'rgba(92, 74, 42, 0.38)';
      ctx.beginPath();
      ctx.ellipse(2.2, 1.8, 1.8, 1.1, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (isFresh) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(-2, -6.4, 1.4, 0, Math.PI * 2);
      ctx.fill();
      drawFreshToySparkle(5.5, -9.5, 0.4, 3.8);
    }

    ctx.restore();
  }

  function drawFrisbee(): void {
    if (!state.hasFrisbee) return;
    const pos = gridToScreen(frisbee.gx, frisbee.gy);
    const scale = getScale();
    const isFresh = isFreshFrisbeeActive();
    const isWorn = !isFresh && state.speedMultiplier >= MAX_SPEED_MULTIPLIER;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    const glideHeight = Math.max(0, frisbee.z);
    const shadowScale = Math.max(0.55, 1 - glideHeight / 46);
    ctx.fillStyle = `rgba(0,0,0,${(0.30 * shadowScale).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(0, 4, 9 * shadowScale, 4.5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, -glideHeight);

    // Subtle flight bank and post-ricochet wobble
    const totalTilt = frisbee.tilt + Math.sin(frisbee.wobblePhase * 18) * frisbee.wobble * 0.36;
    if (Math.abs(totalTilt) > 0.005) {
      ctx.translate(0, -2);
      ctx.rotate(totalTilt);
      ctx.translate(0, 2);
    }

    ctx.fillStyle = isFresh ? '#1696f7' : (isWorn ? '#3179ad' : '#0984e3');
    ctx.strokeStyle = isFresh ? '#55efc4' : (isWorn ? '#4ca6a8' : '#00cec9');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -2, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isFresh ? '#9bd1ff' : (isWorn ? '#6ba0c9' : '#74b9ff');
    ctx.beginPath();
    ctx.ellipse(0, -3, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle rotating rim glint while gliding/spinning
    const spinSpeed = Math.hypot(frisbee.vx, frisbee.vy);
    if (spinSpeed > 0.35 || glideHeight > 0.5) {
      const gxOff = Math.cos(frisbee.spinAngle) * 7.2;
      const gyOff = -2.2 + Math.sin(frisbee.spinAngle) * 3.4;
      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      ctx.beginPath();
      ctx.ellipse(gxOff, gyOff, 2.4, 1.1, frisbee.spinAngle * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isWorn) {
      // Cute chew/scuff marks on rim
      ctx.strokeStyle = 'rgba(25, 42, 66, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(6.5, -0.5);
      ctx.lineTo(8.5, 1.2);
      ctx.moveTo(-7.5, -3.4);
      ctx.lineTo(-5.8, -2.0);
      ctx.stroke();
    } else if (isFresh) {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(-2.5, -3.2, 4.2, Math.PI * 1.08, Math.PI * 1.68);
      ctx.stroke();
      drawFreshToySparkle(9.2, -7.2, 2.1, 4.0);
    }

    ctx.restore();
  }

  function drawDuck(): void {
    if (!state.hasDuck) return;
    const pos = gridToScreen(duck.gx, duck.gy);
    const scale = getScale();
    const isFresh = isFreshDuckActive();
    const isWorn = !isFresh && state.idleMultiplier >= MAX_IDLE_MULTIPLIER;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    const hopHeight = Math.max(0, duck.z);
    const shadowScale = Math.max(0.62, 1 - hopHeight / 38);
    ctx.fillStyle = `rgba(0,0,0,${(0.30 * shadowScale).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(0, 4, 9 * shadowScale, 4.5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, -hopHeight);

    // Side-to-side waddle rocking & rubbery squish
    const rockAngle = Math.sin(duck.quackPhase * 12) * duck.wobble * 0.34;
    if (Math.abs(rockAngle) > 0.004) {
      ctx.rotate(rockAngle);
    }
    const sq = duck.squash;
    if (Math.abs(sq) > 0.005) {
      ctx.scale(1 + sq, 1 - sq * 0.78);
    }
    if (!duck.facingRight) {
      ctx.scale(-1, 1);
    }

    ctx.fillStyle = isFresh ? '#fff06b' : (isWorn ? '#e6d396' : '#ffeaa7');
    ctx.strokeStyle = isFresh ? '#f9ca24' : (isWorn ? '#c9ad63' : '#fdcb6e');
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.ellipse(0, -3, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(5, -10, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isFresh ? '#ff793f' : (isWorn ? '#cc7a5c' : '#e17055');
    ctx.beginPath();
    ctx.ellipse(9, -9, 3.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.arc(6, -11, 1, 0, Math.PI * 2);
    ctx.fill();

    if (isWorn) {
      // Cute tiny love-worn smudge on wing
      ctx.fillStyle = 'rgba(130, 102, 58, 0.28)';
      ctx.beginPath();
      ctx.ellipse(-2.4, -2.4, 2.5, 1.3, -0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (isFresh) {
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.beginPath();
      ctx.arc(3.5, -12.2, 1.3, 0, Math.PI * 2);
      ctx.fill();
      drawFreshToySparkle(-5.5, -12.5, 3.8, 4.0);
    }

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

      const isShiny = Math.random() < getEffectiveSpawnShinyOdds();
      const chosenColor = isShiny ? SHINY_PALETTES[Math.floor(Math.random() * SHINY_PALETTES.length)] : null;

      const entry = createRosterEntry(normBreed, isShiny, chosenColor);
      state.roster.push(entry);
      recordOwnedBreed(normBreed);
      syncBreedCountsFromRoster();
      const findDoghouseSpawnSpot = (): { gx: number; gy: number } => {
        const gridSize = getGridSize();
        const baseRaw = hasGrandDoghousePlaced() ? { gx: 2.22, gy: 2.22 } : { gx: 2.18, gy: 1.92 };
        const base = pushOutsideAllObstacles(baseRaw.gx, baseRaw.gy, 0.08);
        const minClearance = 0.48;

        const minDistToDogs = (gx: number, gy: number): number => {
          let best = Infinity;
          for (let i = 0; i < dogs.length; i++) {
            const other = dogs[i];
            if (other.state === 'SLIDE_CLIMB' || other.state === 'SLIDE_DOWN') continue;
            const d = Math.hypot(other.gx - gx, other.gy - gy);
            if (d < best) best = d;
          }
          return best;
        };

        // Always use the default doghouse entrance spot first if no dog is standing there
        if (!isPointBlockedByObstacle(base.gx, base.gy, 0.06) && minDistToDogs(base.gx, base.gy) >= minClearance) {
          return base;
        }

        // Otherwise fan out cleanly in tight rings close around the doghouse entrance
        const radii = [0.52, 0.80, 1.10, 1.42, 1.76, 2.12];
        const angleSteps = 16;
        let bestClearSpot: { gx: number; gy: number } | null = null;
        let bestClearScore = Infinity;
        let bestFallbackSpot: { gx: number; gy: number } = base;
        let bestFallbackClearance = minDistToDogs(base.gx, base.gy);

        for (let rIdx = 0; rIdx < radii.length; rIdx++) {
          const radius = radii[rIdx];
          for (let aIdx = 0; aIdx < angleSteps; aIdx++) {
            const ang = (aIdx / angleSteps) * Math.PI * 2 + rIdx * 0.21;
            const cx = base.gx + Math.cos(ang) * radius;
            const cy = base.gy + Math.sin(ang) * radius;
            if (cx < 0.44 || cx > gridSize - 0.44 || cy < 0.44 || cy > gridSize - 0.44) continue;
            if (isPointBlockedByObstacle(cx, cy, 0.08) || isNearSlideZone(cx, cy)) continue;

            const dogClearance = minDistToDogs(cx, cy);
            if (dogClearance > bestFallbackClearance) {
              bestFallbackClearance = dogClearance;
              bestFallbackSpot = { gx: cx, gy: cy };
            }
            if (dogClearance >= minClearance) {
              // Slightly prefer open yard right in front of the doghouse door over behind it
              const frontPenalty = (cx < base.gx - 0.30 || cy < base.gy - 0.30) ? 0.26 : 0;
              const score = radius + frontPenalty;
              if (score < bestClearScore) {
                bestClearScore = score;
                bestClearSpot = { gx: cx, gy: cy };
              }
            }
          }
          if (bestClearSpot) break;
        }

        return bestClearSpot || bestFallbackSpot;
      };

      const spawnPos = findDoghouseSpawnSpot();
      const spawnedDog = new Dog(spawnPos.gx, spawnPos.gy, entry.id, normBreed, isShiny, chosenColor);
      if (!spawnedDog.isNightSleep) {
        spawnedDog.petBounce = 0.24;
        spawnedDog.timer = 0.45 + Math.random() * 0.85;
      }
      dogs.push(spawnedDog);

      if (isShiny) {
        state.totalShiniesFound = (Number(state.totalShiniesFound) || 0) + 1;
        sfx.shiny();
      } else {
        sfx.upgrade();
      }
      if (state.roster.length >= MAX_DOGS) {
        state.everFullPack = true;
      }

      updateUI();
      renderRosterTab();
      saveGame();
    }
  }

  let activeDogTierFilter: 'all' | BreedTier = 'all';

  function applyDogTierFilter(tier: 'all' | BreedTier, resetScroll = false): void {
    activeDogTierFilter = tier;
    const filterButtons = document.querySelectorAll<HTMLButtonElement>('#dogsTierFilters .dogs-tier-btn');
    filterButtons.forEach(btn => {
      const isActive = btn.dataset.dogTier === tier;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });

    const cards = document.querySelectorAll<HTMLElement>('#dogsShopList .dog-breed-card');
    cards.forEach(card => {
      const matches = tier === 'all' || card.dataset.dogTier === tier;
      card.classList.toggle('is-filtered-out', !matches);
    });

    if (resetScroll) {
      const modalBody = document.querySelector<HTMLElement>('#menuModal .modal-body');
      if (modalBody) modalBody.scrollTop = 0;
    }
  }

  function renderDogsShop(): void {
    const listEl = document.getElementById('dogsShopList');
    if (!listEl) return;
    listEl.innerHTML = '';

    BREED_LIST.forEach(breed => {
      const capBreed = breed.key.charAt(0).toUpperCase() + breed.key.slice(1);
      const hl = new Set(breed.highlights);
      const magicPctStr = (breed.magicBonus * 100).toFixed(1);
      const rawTreasureMult = breed.treasureChance / BASE_TREASURE_CHANCE;
      const treasureStr = Number.isInteger(rawTreasureMult)
        ? `${rawTreasureMult}.0`
        : Number(rawTreasureMult.toFixed(2)).toString();

      const card = document.createElement('div');
      card.className = 'shop-card dog-breed-card';
      card.dataset.dogTier = breed.tier;
      const portraitUrl = getDogPortraitDataUrl(breed.key, breed.tier);
      card.innerHTML = `
        <div class="shop-art-thumb dog-portrait-thumb tier-${breed.tier}" aria-hidden="true">
          <img class="shop-art-img" src="${portraitUrl}" alt="" />
        </div>
        <div class="shop-info">
          <h3>${breed.name}</h3>
          <p class="breed-role">${breed.role}</p>
          <div class="breed-trait">${breed.trait.summary}</div>
          <div class="breed-stats-group">
            <div class="breed-stats-line">
              <span class="${hl.has('boneYield') ? 'breed-stat-highlight' : ''}">Bone Yield <strong>${breed.payoutMult.toFixed(2)}x</strong></span>
              <span class="breed-sep">|</span>
              <span class="${hl.has('packGrowth') ? 'breed-stat-highlight' : ''}">Pack Growth <strong>${breed.scalingMult.toFixed(2)}x</strong></span>
              <span class="breed-sep">|</span>
              <span class="${hl.has('walk') ? 'breed-stat-highlight' : ''}">Walk <strong>${breed.walkMult.toFixed(2)}x</strong></span>
              <span class="breed-sep">|</span>
              <span class="${hl.has('dig') ? 'breed-stat-highlight' : ''}">Dig <strong>${breed.digSec.toFixed(2)}s</strong></span>
            </div>
            <div class="breed-stats-line">
              <span class="${hl.has('xp') ? 'breed-stat-highlight' : ''}">XP <strong>${breed.xpMult.toFixed(2)}x</strong></span>
              <span class="breed-sep">|</span>
              <span class="${hl.has('magic') ? 'breed-stat-highlight' : ''}">Magic <strong>+${magicPctStr}%</strong></span>
              <span class="breed-sep">|</span>
              <span class="${hl.has('treasure') ? 'breed-stat-highlight' : ''}">Treasure <strong>${treasureStr}x</strong></span>
            </div>
          </div>
          <span class="shop-owned">Owned: <span id="count${capBreed}">0</span></span>
        </div>
        <button type="button" class="action-btn" id="btnSummon${capBreed}">
          <span class="btn-name">Recruit</span>
          <span class="btn-cost" id="cost${capBreed}">${boneInlineHtml(breed.cost.toLocaleString())}</span>
        </button>
      `;

      const summonBtn = card.querySelector<HTMLButtonElement>(`#btnSummon${capBreed}`);
      summonBtn?.addEventListener('click', () => recruitDog(breed.key));
      listEl.appendChild(card);
    });

    applyDogTierFilter(activeDogTierFilter, false);
  }

  document.querySelectorAll<HTMLButtonElement>('#dogsTierFilters .dogs-tier-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudio();
      const rawTier = btn.dataset.dogTier || 'all';
      const tier: 'all' | BreedTier =
        rawTier === 'small' || rawTier === 'working' || rawTier === 'athletic' || rawTier === 'giant'
          ? rawTier
          : 'all';
      applyDogTierFilter(tier, true);
    });
  });

  renderDogsShop();

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
      const prevTimer = Number(state[cfg.timerKey]) || 0;
      const nextTimer = Math.min(maxDur, prevTimer + cfg.duration);
      state[cfg.timerKey] = nextTimer;
      state[cfg.stackKey] = Math.min(TIMED_TREAT_MAX_STACKS, Math.max(1, Math.ceil(nextTimer / cfg.duration)));
      if (treatKey === 'feast') {
        state.feastAnimTimer = 1.5;
      }
      addPackHappiness(8);
      state.totalTreatsCount = (Number(state.totalTreatsCount) || 0) + 1;
      recordDailyProgress('treats', 1);
      dropTreatForActivePack(treatKey as WorldTreatKind);
      sfx.treat();
      updateUI();
      saveGame();
    }
  }

  document.getElementById('btnTreatFree')?.addEventListener('click', () => {
    initAudio();
    const now = Date.now();
    if (getFreeTreatCooldownMs(now) > 0) return;
    state.lastFreeTreatAt = now;
    const prevMood = Math.round(state.packHappiness || getCozyFloor());
    addPackHappiness(FREE_TREAT_HAPPINESS_GAIN);
    const nextMood = Math.round(state.packHappiness || getCozyFloor());
    const gainedMood = Math.max(0, nextMood - prevMood);
    state.totalTreatsCount = (Number(state.totalTreatsCount) || 0) + 1;
    recordDailyProgress('treats', 1);
    dropTreatForActivePack('free');
    sfx.treat();
    const s = getScale();
    dogs.forEach(d => {
      d.petBounce = Math.max(d.petBounce, 0.35);
      const p = gridToScreen(d.gx, d.gy);
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: p.x + (Math.random() - 0.5) * 18 * s,
          y: p.y - (20 + d.slideElevation) * s,
          vx: (Math.random() - 0.5) * 28,
          vy: -40 - Math.random() * 20,
          life: 0.75,
          maxLife: 0.75,
          color: '#ff9ff3',
          size: 5,
          isHeart: true
        });
      }
    });
    const moodText = gainedMood > 0 ? `+${gainedMood} Mood!` : 'Happy Pack!';
    addFloatingText(viewportW / 2, Math.max(110, viewportH * 0.24), moodText, '#ff9ff3', 'center', 'heart');
    updateUI();
    saveGame();
  });

  document.getElementById('btnToyBones')?.addEventListener('click', () => {
    initAudio();
    const now = Date.now();
    if (state.digPower >= MAX_DIG_POWER) {
      if (isFreshBallActive(now)) return;
      if (state.bones >= FRESH_BALL_COST) {
        spendRegularBones(FRESH_BALL_COST);
        state.freshBallUntil = now + FRESH_BALL_DURATION_MS;
        state.hasTennisBall = true;
        state.totalFreshToyBoosts = (Number(state.totalFreshToyBoosts) || 0) + 1;
        addPackHappiness(FRESH_TOY_HAPPINESS_GAIN);
        sfx.upgrade();
        updateUI();
        saveGame();
      }
      return;
    }
    const econ = TOY_CONFIG.toyBones;
    if (state.bones >= state.costs.toyBones) {
      spendRegularBones(state.costs.toyBones);
      state.digPower = Math.min(MAX_DIG_POWER, Math.round((state.digPower + TENNIS_BALL_FLAT_GAIN) * 10) / 10);
      state.costs.toyBones = computeNextCappedCost(state.costs.toyBones, econ.costMult, econ.priceCap);
      state.hasTennisBall = true;
      addPackHappiness(4);
      sfx.upgrade();
      updateUI();
      saveGame();
    }
  });

  document.getElementById('btnToyIdle')?.addEventListener('click', () => {
    initAudio();
    const now = Date.now();
    if (state.idleMultiplier >= MAX_IDLE_MULTIPLIER) {
      if (isFreshDuckActive(now)) return;
      if (state.bones >= FRESH_DUCK_COST) {
        spendRegularBones(FRESH_DUCK_COST);
        state.freshDuckUntil = now + FRESH_DUCK_DURATION_MS;
        state.hasDuck = true;
        state.totalFreshToyBoosts = (Number(state.totalFreshToyBoosts) || 0) + 1;
        addPackHappiness(FRESH_TOY_HAPPINESS_GAIN);
        sfx.upgrade();
        updateUI();
        saveGame();
      }
      return;
    }
    const econ = TOY_CONFIG.toyIdle;
    if (state.bones >= state.costs.toyIdle && state.idleMultiplier < MAX_IDLE_MULTIPLIER) {
      spendRegularBones(state.costs.toyIdle);
      state.idleMultiplier = Math.min(MAX_IDLE_MULTIPLIER, Math.round((state.idleMultiplier + DUCK_IDLE_STEP) * 1000) / 1000);
      state.costs.toyIdle = computeNextCappedCost(state.costs.toyIdle, econ.costMult, econ.priceCap);
      state.hasDuck = true;
      addPackHappiness(4);
      sfx.upgrade();
      updateUI();
      saveGame();
    }
  });

  document.getElementById('btnToySpeed')?.addEventListener('click', () => {
    initAudio();
    const now = Date.now();
    if (state.speedMultiplier >= MAX_SPEED_MULTIPLIER) {
      if (isFreshFrisbeeActive(now)) return;
      if (state.bones >= FRESH_FRISBEE_COST) {
        spendRegularBones(FRESH_FRISBEE_COST);
        state.freshFrisbeeUntil = now + FRESH_FRISBEE_DURATION_MS;
        state.hasFrisbee = true;
        state.totalFreshToyBoosts = (Number(state.totalFreshToyBoosts) || 0) + 1;
        addPackHappiness(FRESH_TOY_HAPPINESS_GAIN);
        sfx.upgrade();
        updateUI();
        saveGame();
      }
      return;
    }
    const econ = TOY_CONFIG.toySpeed;
    if (state.bones >= state.costs.toySpeed) {
      spendRegularBones(state.costs.toySpeed);
      state.speedMultiplier = Math.min(MAX_SPEED_MULTIPLIER, Math.round(state.speedMultiplier * FRISBEE_SPEED_STEP * 1000) / 1000);
      state.costs.toySpeed = computeNextCappedCost(state.costs.toySpeed, econ.costMult, econ.priceCap);
      state.hasFrisbee = true;
      addPackHappiness(4);
      sfx.upgrade();
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

  let activeTreasureSetFilter: 'all' | TreasureSetId = 'all';
  let treasureLockedHintTimer: number | null = null;
  let lastTreasuresRenderKey = '';
  let inspectArtStop: (() => void) | null = null;

  function showTreasureLockedHint(message: string): void {
    const hintEl = document.getElementById('treasureLockedHint');
    if (!hintEl) return;
    hintEl.textContent = message;
    hintEl.style.display = 'block';
    if (treasureLockedHintTimer !== null) {
      window.clearTimeout(treasureLockedHintTimer);
    }
    treasureLockedHintTimer = window.setTimeout(() => {
      hintEl.style.display = 'none';
      treasureLockedHintTimer = null;
    }, 3200);
  }

  function closeTreasureInspector(): void {
    if (inspectArtStop) {
      inspectArtStop();
      inspectArtStop = null;
    }
    const modal = document.getElementById('treasureInspectModal');
    if (modal) modal.style.display = 'none';
  }

  function openTreasureInspector(relicId: string): void {
    const relic = getTreasureById(relicId);
    if (!relic) return;
    const counts = getTreasureCounts(state.perks);
    const rank = getRelicRank(counts, relic.id);
    if (rank <= 0) {
      showTreasureLockedHint('Undiscovered relic — unearthed by digging across the park.');
      return;
    }

    if (inspectArtStop) {
      inspectArtStop();
      inspectArtStop = null;
    }

    const modal = document.getElementById('treasureInspectModal');
    const artFrame = document.getElementById('inspectArtFrame');
    const canvasEl = document.getElementById('inspectRelicCanvas') as HTMLCanvasElement | null;
    const nameEl = document.getElementById('inspectRelicName');
    const metaEl = document.getElementById('inspectRelicMeta');
    const loreEl = document.getElementById('inspectRelicLore');
    const rankLabelEl = document.getElementById('inspectRelicRankLabel');
    const rankPipsEl = document.getElementById('inspectRelicRankPips');
    const statsEl = document.getElementById('inspectRelicStats');
    const nextRankEl = document.getElementById('inspectRelicNextRank');
    const setBoxEl = document.getElementById('inspectRelicSetBox');
    const setTitleEl = document.getElementById('inspectRelicSetTitle');
    const setBonusEl = document.getElementById('inspectRelicSetBonus');

    const rarityMeta = RARITY_META[relic.rarity];
    const setDef = getTreasureSetById(relic.setId);
    const setProg = getSetProgress(counts, relic.setId);

    if (artFrame) {
      artFrame.className = `treasure-inspect-art-wrap ${rarityMeta.cssClass}`;
    }
    if (canvasEl) {
      canvasEl.setAttribute('aria-label', relic.name);
      inspectArtStop = startAnimatedTreasureCanvas(canvasEl, relic.id, relic.rarity, 260);
    }
    if (nameEl) nameEl.textContent = relic.name;
    if (metaEl) {
      metaEl.innerHTML = `<span style="color: ${rarityMeta.color};">${relic.rarity}</span> | ${setDef ? setDef.name : ''}`;
    }
    if (loreEl) loreEl.textContent = relic.lore;

    if (rankLabelEl) {
      rankLabelEl.textContent = rank >= MAX_RELIC_RANK
        ? `Rank ${getRankRoman(rank)} / V (MAX)`
        : `Rank ${getRankRoman(rank)} / V`;
    }
    if (rankPipsEl) {
      rankPipsEl.innerHTML = '';
      for (let i = 1; i <= MAX_RELIC_RANK; i++) {
        const pip = document.createElement('span');
        pip.className = `treasure-rank-pip${i <= rank ? ' is-filled' : ''}`;
        rankPipsEl.appendChild(pip);
      }
    }

    if (statsEl) {
      statsEl.textContent = formatRelicStatsAtRank(relic, rank);
    }
    if (nextRankEl) {
      if (rank >= MAX_RELIC_RANK) {
        nextRankEl.textContent = 'Mastered — removed from future treasure chest drafts.';
      } else {
        const nextRoman = getRankRoman(rank + 1);
        nextRankEl.textContent = `Next (Rank ${nextRoman}): ${formatRelicStatsAtRank(relic, rank + 1)}`;
      }
    }

    if (setBoxEl && setDef) {
      setBoxEl.classList.toggle('is-complete', setProg.completed);
      if (setTitleEl) {
        setTitleEl.textContent = setProg.completed
          ? `${setDef.name} (${setProg.owned}/${setProg.total}) | Set Bonus Active`
          : `${setDef.name} (${setProg.owned}/${setProg.total}) | Collect ${setProg.total - setProg.owned} more`;
      }
      if (setBonusEl) {
        setBonusEl.textContent = setDef.bonusLabel;
      }
    }

    if (modal) {
      modal.style.display = 'flex';
    }
  }

  bindReliableCloseButton(document.getElementById('btnCloseTreasureInspect'), closeTreasureInspector);
  document.getElementById('btnDoneTreasureInspect')?.addEventListener('click', closeTreasureInspector);
  document.getElementById('treasureInspectModal')?.addEventListener('click', (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeTreasureInspector();
    }
  });
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isModalCurrentlyOpen('treasureInspectModal')) {
      closeTreasureInspector();
    }
  });

  document.querySelectorAll<HTMLButtonElement>('.treasure-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSet = btn.getAttribute('data-treasure-set');
      if (
        targetSet === 'all' ||
        targetSet === 'explorer' ||
        targetSet === 'kennel' ||
        targetSet === 'arcane' ||
        targetSet === 'mythic'
      ) {
        activeTreasureSetFilter = targetSet;
        document.querySelectorAll<HTMLButtonElement>('.treasure-filter-btn').forEach(other => {
          const isMatch = other === btn;
          other.classList.toggle('active', isMatch);
          other.setAttribute('aria-selected', isMatch ? 'true' : 'false');
        });
        renderTreasuresTab();
      }
    });
  });

  function renderTreasuresTab(): void {
    const counts = getTreasureCounts(state.perks);
    const perkListContainer = document.getElementById('perkListContainer');

    const countParts: string[] = [];
    counts.forEach((rank, id) => {
      countParts.push(`${id}:${rank}`);
    });
    countParts.sort();
    const renderKey = `${activeTreasureSetFilter}|${countParts.join(',')}`;
    if (perkListContainer && renderKey === lastTreasuresRenderKey && perkListContainer.childElementCount > 0) {
      return;
    }
    lastTreasuresRenderKey = renderKey;

    const bonuses = getPerkMultipliers();

    const perkCountEl = document.getElementById('perkCountDisplay');
    if (perkCountEl) perkCountEl.textContent = String(bonuses.discoveredCount);

    const perkRanksEl = document.getElementById('perkRanksDisplay');
    if (perkRanksEl) perkRanksEl.textContent = String(bonuses.totalRanks);

    const perkSetsEl = document.getElementById('perkSetsDisplay');
    if (perkSetsEl) perkSetsEl.textContent = String(bonuses.completedSets.length);

    const summaryEl = document.getElementById('treasureActiveSummary');
    if (summaryEl) {
      summaryEl.textContent = formatActiveTreasureSummary(bonuses);
    }

    if (!perkListContainer) return;
    perkListContainer.innerHTML = '';

    const setsToRender = activeTreasureSetFilter === 'all'
      ? TREASURE_SETS
      : TREASURE_SETS.filter(s => s.id === activeTreasureSetFilter);

    setsToRender.forEach(setDef => {
      const setProg = getSetProgress(counts, setDef.id);

      const section = document.createElement('section');
      section.className = 'treasure-set-section';

      const header = document.createElement('div');
      header.className = 'treasure-set-header';

      const titleRow = document.createElement('div');
      titleRow.className = 'treasure-set-title-row';

      const setNameEl = document.createElement('h4');
      setNameEl.className = 'treasure-set-name';
      setNameEl.textContent = setDef.name;

      const setCountEl = document.createElement('span');
      setCountEl.className = `treasure-set-count${setProg.completed ? ' is-complete' : ''}`;
      setCountEl.textContent = setProg.completed ? `${setProg.owned} / ${setProg.total} | Active` : `${setProg.owned} / ${setProg.total}`;

      titleRow.appendChild(setNameEl);
      titleRow.appendChild(setCountEl);

      const bonusEl = document.createElement('div');
      bonusEl.className = `treasure-set-bonus${setProg.completed ? ' is-complete' : ''}`;
      bonusEl.textContent = setProg.completed
        ? `Set Bonus Active: ${setDef.bonusLabel}`
        : `4/4 Set Bonus: ${setDef.bonusLabel}`;

      header.appendChild(titleRow);
      header.appendChild(bonusEl);
      section.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'treasure-grid';

      setDef.relicIds.forEach(relicId => {
        const relic = getTreasureById(relicId);
        if (!relic) return;
        const rank = getRelicRank(counts, relic.id);
        const isDiscovered = rank > 0;
        const isMaxed = rank >= MAX_RELIC_RANK;
        const rarityMeta = RARITY_META[relic.rarity];

        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = isDiscovered
          ? `treasure-tile ${rarityMeta.cssClass}${isMaxed ? ' is-maxed' : ''}`
          : 'treasure-tile is-locked';
        tile.setAttribute('aria-label', isDiscovered ? `Inspect ${relic.name}, Rank ${getRankRoman(rank)}` : `Undiscovered ${relic.rarity} relic`);

        const thumbWrap = document.createElement('div');
        thumbWrap.className = 'treasure-tile-thumb-wrap';

        if (isDiscovered) {
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.className = 'treasure-tile-img';
          thumbCanvas.setAttribute('role', 'img');
          thumbCanvas.setAttribute('aria-label', relic.name);
          thumbWrap.appendChild(thumbCanvas);
          renderTreasureCanvasFrame(thumbCanvas, relic.id, relic.rarity, 128);
        } else {
          const sil = document.createElement('span');
          sil.className = 'treasure-tile-silhouette';
          sil.textContent = '???';
          thumbWrap.appendChild(sil);
        }

        const info = document.createElement('div');
        info.className = 'treasure-tile-info';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'treasure-tile-name';
        nameDiv.textContent = isDiscovered ? relic.name : 'Undiscovered';

        const metaDiv = document.createElement('div');
        metaDiv.className = 'treasure-tile-meta';
        if (isDiscovered) {
          const rankLabel = isMaxed ? 'Rank V MAX' : `Rank ${getRankRoman(rank)}`;
          metaDiv.innerHTML = `<span style="color: ${rarityMeta.color};">${relic.rarity}</span> | ${rankLabel}`;
        } else {
          metaDiv.innerHTML = `<span style="color: ${rarityMeta.color};">${relic.rarity}</span> | Locked`;
        }

        info.appendChild(nameDiv);
        info.appendChild(metaDiv);

        tile.appendChild(thumbWrap);
        tile.appendChild(info);

        tile.addEventListener('click', () => {
          if (isDiscovered) {
            openTreasureInspector(relic.id);
          } else {
            showTreasureLockedHint(`Undiscovered ${relic.rarity} relic in ${setDef.name} — found by digging!`);
          }
        });

        grid.appendChild(tile);
      });

      section.appendChild(grid);
      perkListContainer.appendChild(section);
    });
  }

  function formatTimedTreatCostHtml(cost: number, timer: number, treatKey: string, configKey: string): string {
    const flatCost = TREAT_CONFIG[configKey]?.baseCost || cost || 350;
    const secs = Math.ceil(Math.max(0, timer));
    if (isTreatAtMaxDuration(treatKey)) {
      return secs > 0 ? `MAX | ${secs}s` : 'MAX';
    }
    const baseHtml = boneInlineHtml(flatCost.toLocaleString());
    if (secs > 0) {
      return `${baseHtml} | ${secs}s`;
    }
    return baseHtml;
  }

  function refreshTreatButtonStates(nowMs = Date.now()): void {
    const freeRemMs = getFreeTreatCooldownMs(nowMs);
    const btnTreatFree = document.getElementById('btnTreatFree') as HTMLButtonElement | null;
    if (btnTreatFree) btnTreatFree.disabled = freeRemMs > 0;
    const costTreatFreeEl = document.getElementById('costTreatFree');
    if (costTreatFreeEl) {
      costTreatFreeEl.textContent = freeRemMs > 0 ? formatPetCooldownShort(freeRemMs) : 'Free';
    }
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

  function refreshTreatButtonTimers(nowMs = Date.now()): void {
    const costTreatXpEl = document.getElementById('costTreatXp');
    setHtmlIfChanged(costTreatXpEl, formatTimedTreatCostHtml(TREAT_CONFIG.treatXp.baseCost, state.xpTreatTimer, 'xp', 'treatXp'));

    const costTreatKongEl = document.getElementById('costTreatKong');
    setHtmlIfChanged(costTreatKongEl, formatTimedTreatCostHtml(TREAT_CONFIG.treatKong.baseCost, state.kongTimer, 'kong', 'treatKong'));

    const costTreatCupEl = document.getElementById('costTreatCup');
    setHtmlIfChanged(costTreatCupEl, formatTimedTreatCostHtml(TREAT_CONFIG.treatCup.baseCost, state.pupCupTimer, 'cup', 'treatCup'));

    const costTreatFeastEl = document.getElementById('costTreatFeast');
    setHtmlIfChanged(costTreatFeastEl, formatTimedTreatCostHtml(TREAT_CONFIG.treatFeast.baseCost, state.feastTimer, 'feast', 'treatFeast'));

    const costTreatBaconEl = document.getElementById('costTreatBacon');
    setHtmlIfChanged(costTreatBaconEl, formatTimedTreatCostHtml(TREAT_CONFIG.treatBacon.baseCost, state.baconTimer, 'bacon', 'treatBacon'));

    refreshTreatButtonStates(nowMs);

    const activeBuffsBar = document.getElementById('activeBuffsBar');
    if (activeBuffsBar) {
      const chips: string[] = [];
      if (state.pupCupTimer > 0) chips.push(`Cup 1.35x | ${Math.ceil(state.pupCupTimer)}s`);
      if (state.xpTreatTimer > 0) chips.push(`2x XP | ${Math.ceil(state.xpTreatTimer)}s`);
      if (state.kongTimer > 0) chips.push(`${magicInlineHtml('+1')} Bonus | ${Math.ceil(state.kongTimer)}s`);
      if (state.feastTimer > 0) chips.push(`Feast 1.50x | ${Math.ceil(state.feastTimer)}s`);
      if (state.baconTimer > 0) chips.push(`Bacon Frenzy | ${Math.ceil(state.baconTimer)}s`);

      setHtmlIfChanged(activeBuffsBar, chips.map(c => `<span class="buff-chip">${c}</span>`).join(''));
    }
  }

  function formatCleanDecimal(val: number): string {
    const rounded = Math.round(Math.max(0, Number(val) || 0) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function formatToyFlatBadge(bonusVal: number, totalVal: number): string {
    return `+${formatCleanDecimal(bonusVal)} | ${formatCleanDecimal(totalVal)}`;
  }

  function formatToyBoostBadge(bonusRatio: number, totalRatio: number): string {
    const safeBonus = Math.max(0, Number(bonusRatio) || 0);
    const safeTotal = Math.max(0, Number(totalRatio) || 0);
    const bonusPct = Math.round(safeBonus * 100);
    const totalPct = Math.round(safeTotal * 100);
    return `+${bonusPct}% | ${totalPct}%`;
  }

  function refreshToyBoostBadges(now = Date.now()): void {
    const atDigPowerCap = state.digPower >= MAX_DIG_POWER;
    const atDuckCap = state.idleMultiplier >= MAX_IDLE_MULTIPLIER;
    const atSpeedCap = state.speedMultiplier >= MAX_SPEED_MULTIPLIER;

    const ballRem = atDigPowerCap ? getFreshToyRemainingMs(state.freshBallUntil, now) : 0;
    const duckRem = atDuckCap ? getFreshToyRemainingMs(state.freshDuckUntil, now) : 0;
    const frisbeeRem = atSpeedCap ? getFreshToyRemainingMs(state.freshFrisbeeUntil, now) : 0;

    const ballFresh = ballRem > 0;
    const duckFresh = duckRem > 0;
    const frisbeeFresh = frisbeeRem > 0;

    const ballBoostEl = document.getElementById('ballCurrentBoost');
    if (ballBoostEl) {
      ballBoostEl.classList.toggle('is-fresh', ballFresh);
      ballBoostEl.classList.toggle('is-worn', atDigPowerCap && !ballFresh);
      if (ballFresh) {
        ballBoostEl.textContent = `Fresh ${formatFreshRemaining(ballRem)} | ${getEffectiveDigPower(now)}`;
      } else if (atDigPowerCap) {
        ballBoostEl.textContent = `MAX | ${MAX_DIG_POWER}`;
      } else {
        const currentPower = Number(state.digPower) || BASE_DIG_POWER;
        const bonusVal = Math.max(0, currentPower - BASE_DIG_POWER);
        ballBoostEl.textContent = formatToyFlatBadge(bonusVal, currentPower);
      }
    }

    const duckBoostEl = document.getElementById('duckCurrentBoost');
    if (duckBoostEl) {
      duckBoostEl.classList.toggle('is-fresh', duckFresh);
      duckBoostEl.classList.toggle('is-worn', atDuckCap && !duckFresh);
      const totalRatio = getTotalOfflineRate(now);
      if (duckFresh) {
        duckBoostEl.textContent = `Fresh ${formatFreshRemaining(duckRem)} | ${Math.round(totalRatio * 100)}%`;
      } else if (atDuckCap) {
        duckBoostEl.textContent = `MAX | ${Math.round(totalRatio * 100)}%`;
      } else {
        const currentIdle = Number(state.idleMultiplier) || BASE_IDLE_MULTIPLIER;
        const bonusRatio = Math.max(0, currentIdle - BASE_IDLE_MULTIPLIER);
        duckBoostEl.textContent = formatToyBoostBadge(bonusRatio, totalRatio);
      }
    }

    const frisbeeBoostEl = document.getElementById('frisbeeCurrentBoost');
    if (frisbeeBoostEl) {
      frisbeeBoostEl.classList.toggle('is-fresh', frisbeeFresh);
      frisbeeBoostEl.classList.toggle('is-worn', atSpeedCap && !frisbeeFresh);
      if (frisbeeFresh) {
        frisbeeBoostEl.textContent = `Fresh ${formatFreshRemaining(frisbeeRem)} | ${getEffectiveSpeedMultiplier(now).toFixed(2)}x`;
      } else if (atSpeedCap) {
        frisbeeBoostEl.textContent = `MAX | ${MAX_SPEED_MULTIPLIER.toFixed(2)}x`;
      } else {
        const currentSpeed = Number(state.speedMultiplier) || BASE_SPEED_MULTIPLIER;
        const bonusRatio = Math.max(0, (currentSpeed - BASE_SPEED_MULTIPLIER) / BASE_SPEED_MULTIPLIER);
        const totalRatio = currentSpeed / BASE_SPEED_MULTIPLIER;
        frisbeeBoostEl.textContent = formatToyBoostBadge(bonusRatio, totalRatio);
      }
    }

    const descToyBones = document.getElementById('descToyBones');
    if (descToyBones) {
      descToyBones.textContent = atDigPowerCap
        ? `Maxed (${MAX_DIG_POWER})! Grab a Fresh Ball for +${FRESH_BALL_POWER_BONUS} Dig Power (${MAX_DIG_POWER + FRESH_BALL_POWER_BONUS} total) for 30m, +${FRESH_TOY_HAPPINESS_GAIN} Mood & +${FRESH_TOY_COZY_FLOOR_BONUS}% Cozy Floor. Counts toward offline digs too.`
        : `+${TENNIS_BALL_FLAT_GAIN} Dig Power per buy, up to max ${MAX_DIG_POWER} (price caps at ${TOY_CONFIG.toyBones.priceCap.toLocaleString()} Bones). Unlocks Fresh Ball boosts at max!`;
    }
    const descToyIdle = document.getElementById('descToyIdle');
    if (descToyIdle) {
      descToyIdle.textContent = atDuckCap
        ? `Maxed (+20%)! Grab a Fresh Duck for +10% Offline Yield (up to 75% cap) & +25% Offline Treasure odds for 12h, +${FRESH_TOY_HAPPINESS_GAIN} Mood & +${FRESH_TOY_COZY_FLOOR_BONUS}% Cozy Floor.`
        : `Boosts base offline bone yield by +1% per buy, from 10% up to 30% (+20% max from toy; price caps at ${TOY_CONFIG.toyIdle.priceCap.toLocaleString()} Bones). Dog abilities lift total offline yield up to 75%. Unlocks Fresh Duck boosts at max!`;
    }
    const descToySpeed = document.getElementById('descToySpeed');
    if (descToySpeed) {
      descToySpeed.textContent = atSpeedCap
        ? `Maxed (${MAX_SPEED_MULTIPLIER.toFixed(2)}x)! Grab a Fresh Frisbee for +${FRESH_FRISBEE_SPEED_BONUS.toFixed(2)}x Pack Dig Multiplier (${(MAX_SPEED_MULTIPLIER + FRESH_FRISBEE_SPEED_BONUS).toFixed(2)}x total) for 30m, +${FRESH_TOY_HAPPINESS_GAIN} Mood & +${FRESH_TOY_COZY_FLOOR_BONUS}% Cozy Floor. Counts toward offline digs too.`
        : `Boosts the pack's dig multiplier by +3% per buy, up to ${MAX_SPEED_MULTIPLIER.toFixed(2)}x (price caps at ${TOY_CONFIG.toySpeed.priceCap.toLocaleString()} Bones). Unlocks Fresh Frisbee boosts at max!`;
    }

    const nameToyBones = document.getElementById('nameToyBones');
    const costToyBonesEl = document.getElementById('costToyBones');
    const btnToyBones = document.getElementById('btnToyBones') as HTMLButtonElement | null;
    if (nameToyBones) {
      nameToyBones.textContent = ballFresh ? 'Fresh Active' : (atDigPowerCap ? 'Fresh Ball' : 'Get Toy');
    }
    if (costToyBonesEl) {
      setHtmlIfChanged(
        costToyBonesEl,
        ballFresh
          ? `${formatFreshRemaining(ballRem)} left`
          : atDigPowerCap
            ? boneInlineHtml(FRESH_BALL_COST.toLocaleString())
            : boneInlineHtml(state.costs.toyBones.toLocaleString())
      );
    }
    if (btnToyBones) {
      btnToyBones.classList.toggle('is-fresh-ready', atDigPowerCap && !ballFresh);
      btnToyBones.classList.toggle('is-fresh-active', ballFresh);
      btnToyBones.disabled = ballFresh
        ? true
        : atDigPowerCap
          ? state.bones < FRESH_BALL_COST
          : state.bones < state.costs.toyBones;
    }

    const nameToyIdle = document.getElementById('nameToyIdle');
    const costToyIdleEl = document.getElementById('costToyIdle');
    const btnToyIdle = document.getElementById('btnToyIdle') as HTMLButtonElement | null;
    if (nameToyIdle) {
      nameToyIdle.textContent = duckFresh ? 'Fresh Active' : (atDuckCap ? 'Fresh Duck' : 'Get Toy');
    }
    if (costToyIdleEl) {
      setHtmlIfChanged(
        costToyIdleEl,
        duckFresh
          ? `${formatFreshRemaining(duckRem)} left`
          : atDuckCap
            ? boneInlineHtml(FRESH_DUCK_COST.toLocaleString())
            : boneInlineHtml(state.costs.toyIdle.toLocaleString())
      );
    }
    if (btnToyIdle) {
      btnToyIdle.classList.toggle('is-fresh-ready', atDuckCap && !duckFresh);
      btnToyIdle.classList.toggle('is-fresh-active', duckFresh);
      btnToyIdle.disabled = duckFresh
        ? true
        : atDuckCap
          ? state.bones < FRESH_DUCK_COST
          : state.bones < state.costs.toyIdle;
    }

    const nameToySpeed = document.getElementById('nameToySpeed');
    const costToySpeedEl = document.getElementById('costToySpeed');
    const btnToySpeed = document.getElementById('btnToySpeed') as HTMLButtonElement | null;
    if (nameToySpeed) {
      nameToySpeed.textContent = frisbeeFresh ? 'Fresh Active' : (atSpeedCap ? 'Fresh Frisbee' : 'Get Toy');
    }
    if (costToySpeedEl) {
      setHtmlIfChanged(
        costToySpeedEl,
        frisbeeFresh
          ? `${formatFreshRemaining(frisbeeRem)} left`
          : atSpeedCap
            ? boneInlineHtml(FRESH_FRISBEE_COST.toLocaleString())
            : boneInlineHtml(state.costs.toySpeed.toLocaleString())
      );
    }
    if (btnToySpeed) {
      btnToySpeed.classList.toggle('is-fresh-ready', atSpeedCap && !frisbeeFresh);
      btnToySpeed.classList.toggle('is-fresh-active', frisbeeFresh);
      btnToySpeed.disabled = frisbeeFresh
        ? true
        : atSpeedCap
          ? state.bones < FRESH_FRISBEE_COST
          : state.bones < state.costs.toySpeed;
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
        setHtmlIfChanged(costEl, boneInlineHtml(state.costs[breed].toLocaleString()));
      }
      const btnEl = document.getElementById(`btnSummon${capBreed}`) as HTMLButtonElement | null;
      if (btnEl) {
        btnEl.disabled = atDogCap || state.bones < state.costs[breed];
        const nameEl = btnEl.querySelector('.btn-name');
        if (nameEl) {
          nameEl.textContent = atDogCap ? 'Park Full' : 'Recruit';
        }
      }
    });

    renderTreasuresTab();

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

    // Grand Doghouse Manor color upgrade selector (shown once upgraded to Manor)
    const manorColorSection = document.getElementById('manorColorSection');
    const manorUpgraded = hasGrandDoghousePlaced() || (state.decorInventory.doghouseManor || 0) > 0;
    if (manorColorSection) {
      manorColorSection.style.display = manorUpgraded ? 'flex' : 'none';
    }
    if (manorUpgraded) {
      const unlockedColors = state.unlockedManorColors || createDefaultUnlockedManorColors();
      const activeColor: ManorColorId = state.manorColor || 'classic';
      const allColors: ManorColorId[] = ['classic', ...MANOR_COLOR_UPGRADES];
      allColors.forEach(cid => {
        const btn = document.querySelector<HTMLButtonElement>(`[data-manor-color="${cid}"]`);
        if (!btn) return;
        const isUnlocked = cid === 'classic' || Boolean(unlockedColors[cid]);
        const isActive = activeColor === cid;
        btn.classList.toggle('is-active', isActive);
        btn.classList.toggle('is-unlocked', isUnlocked);
        btn.disabled = !isUnlocked && state.magicBones < MANOR_COLOR_COST;
        const tag = btn.querySelector('.manor-color-tag');
        if (tag) {
          setHtmlIfChanged(
            tag,
            isActive
              ? 'Active'
              : (isUnlocked ? 'Use' : magicInlineHtml(String(MANOR_COLOR_COST)))
          );
        }
      });
    }

    // Park Expansion (8x8) UI sync
    const parkGridSizeStatus = document.getElementById('parkGridSizeStatus');
    if (parkGridSizeStatus) {
      parkGridSizeStatus.textContent = state.parkExpanded
        ? '8×8 Unlocked (64 tiles)'
        : '7×7 (49 tiles)';
    }
    const btnExpandPark = document.getElementById('btnExpandPark') as HTMLButtonElement | null;
    if (btnExpandPark) {
      const nameSpan = btnExpandPark.querySelector('.btn-name');
      const costSpan = document.getElementById('costExpandPark');
      if (state.parkExpanded) {
        if (nameSpan) nameSpan.textContent = 'Unlocked';
        if (costSpan) costSpan.style.display = 'none';
        btnExpandPark.disabled = true;
      } else {
        if (nameSpan) nameSpan.textContent = 'Expand Park';
        if (costSpan) costSpan.style.display = '';
        btnExpandPark.disabled =
          state.bones < PARK_EXPANSION_BONE_COST ||
          state.magicBones < PARK_EXPANSION_MAGIC_COST;
      }
    }

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
            setHtmlIfChanged(costSpan, magicInlineHtml(TILE_UNLOCK_COST.toLocaleString()));
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

    refreshToyBoostBadges();

    refreshTreatButtonTimers();

    const packRates = getEstimatedPackRates();
    const statBonesPerMinEl = document.getElementById('statBonesPerMin');
    if (statBonesPerMinEl) {
      const formattedBpm = packRates.bonesPerMin >= 100
        ? Math.round(packRates.bonesPerMin).toLocaleString()
        : packRates.bonesPerMin.toFixed(1);
      setHtmlIfChanged(statBonesPerMinEl, boneInlineHtml(`~${formattedBpm}`));
    }
    const statMagicPerHourEl = document.getElementById('statMagicPerHour');
    if (statMagicPerHourEl) {
      const formattedMph = packRates.magicPerHour >= 10
        ? Math.round(packRates.magicPerHour).toLocaleString()
        : packRates.magicPerHour.toFixed(1);
      setHtmlIfChanged(statMagicPerHourEl, magicInlineHtml(`~${formattedMph}`));
    }
    const statDigPowerEl = document.getElementById('statDigPower');
    if (statDigPowerEl) statDigPowerEl.textContent = String(Number(getEffectiveDigPower().toFixed(1)));
    const statSpeedEl = document.getElementById('statSpeed');
    if (statSpeedEl) statSpeedEl.textContent = `${getDigMultiplier().toFixed(2)}x`;
    const packTraits = getPackTraitBonuses();
    const statChanceEl = document.getElementById('statChance');
    if (statChanceEl) {
      const totalMagic = Math.min(
        MAX_MAGIC_CHANCE,
        state.magicChance +
          getPerkMultipliers().magicBonus +
          decorBonuses.magicAdd +
          getCurrentWeather().magicAdd +
          getPackHappinessInfo().magicAdd +
          packTraits.packMagicAura
      );
      const magicPct = Math.round(totalMagic * 1000) / 10;
      statChanceEl.textContent = `${Number.isInteger(magicPct) ? magicPct : magicPct.toFixed(1)}%`;
    }
    const lifetimeEl = document.getElementById('statLifetimeBones');
    if (lifetimeEl) {
      lifetimeEl.textContent = Math.floor(state.lifetimeBones).toLocaleString();
    }
    const formatPctStat = (val: number): string => {
      const pct = Math.round(val * 1000) / 10;
      return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
    };
    const decorBonusEl = document.getElementById('statDecorBonus');
    if (decorBonusEl) {
      const parts: string[] = [];
      if (decorBonuses.xpMult > 1) parts.push(`+${formatPctStat(decorBonuses.xpMult - 1)}% XP`);
      if (decorBonuses.magicAdd > 0) parts.push(magicInlineHtml(`+${formatPctStat(decorBonuses.magicAdd)}%`));
      if (decorBonuses.payoutMult > 1) parts.push(boneInlineHtml(`+${formatPctStat(decorBonuses.payoutMult - 1)}%`));
      if (decorBonuses.paceMult > 1) parts.push(`+${formatPctStat(decorBonuses.paceMult - 1)}% Pace`);
      setHtmlIfChanged(decorBonusEl, parts.length > 0 ? parts.join(' | ') : 'None yet');
    }
    const offlineRateEl = document.getElementById('statOfflineRate');
    if (offlineRateEl) {
      const totalOfflineRate = getTotalOfflineRate();
      const offlinePct = Math.round(totalOfflineRate * 100);
      offlineRateEl.textContent = totalOfflineRate >= MAX_TOTAL_OFFLINE_RATE
        ? `${offlinePct}% (MAX)`
        : `${offlinePct}%`;
    }
    const packAurasEl = document.getElementById('statPackAuras');
    if (packAurasEl) {
      const auraParts: string[] = [];
      if (packTraits.packBoneAura > 0) auraParts.push(boneInlineHtml(`+${formatPctStat(packTraits.packBoneAura)}%`));
      if (packTraits.packPaceAura > 0) auraParts.push(`+${formatPctStat(packTraits.packPaceAura)}% Pace`);
      if (packTraits.packXpAura > 0) auraParts.push(`+${formatPctStat(packTraits.packXpAura)}% XP`);
      if (packTraits.packMagicAura > 0) auraParts.push(magicInlineHtml(`+${formatPctStat(packTraits.packMagicAura)}%`));
      if (packTraits.packGrowthAura > 0) auraParts.push(`+${formatPctStat(packTraits.packGrowthAura)}% Growth`);
      if (packTraits.packTreasureAura > 0) auraParts.push(`+${formatPctStat(packTraits.packTreasureAura)}% Treasure`);
      if (packTraits.cozyFloorAdd > 0) auraParts.push(`+${packTraits.cozyFloorAdd} Cozy`);
      if (packTraits.moodDecayMult < 1) auraParts.push(`-${formatPctStat(1 - packTraits.moodDecayMult)}% Mood Decay`);
      if (packTraits.offlineBonus > 0) auraParts.push(`+${formatPctStat(packTraits.offlineBonus)}% Offline`);
      setHtmlIfChanged(packAurasEl, auraParts.length > 0 ? auraParts.join(' | ') : 'None active');
    }
    const startDateEl = document.getElementById('statStartDate');
    if (startDateEl) {
      const startTs = typeof state.startDate === 'number' && Number.isFinite(state.startDate) && state.startDate > 0
        ? state.startDate
        : Date.now();
      startDateEl.textContent = new Date(startTs).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    const activeTimeEl = document.getElementById('statActiveTime');
    if (activeTimeEl) {
      activeTimeEl.textContent = formatActivePlayTime(state.activePlaySeconds);
    }

    refreshWeatherHUD();
    refreshMoodHUD();

    refreshTreatButtonStates();

    if (pendingRerollDogId && rerollModal && rerollModal.style.display === 'flex') {
      const activeRerollDog = state.roster.find(d => d.id === pendingRerollDogId);
      const nextCost = getRerollCost(activeRerollDog);
      if (activeRerollDog && rerollRulesText) {
        rerollRulesText.textContent = formatRerollRulesText(activeRerollDog);
      }
      if (rerollCostLabel) {
        setHtmlIfChanged(rerollCostLabel, magicInlineHtml(nextCost.toLocaleString()));
      }
      if (btnConfirmReroll) {
        btnConfirmReroll.disabled = (state.magicBones || 0) < nextCost;
      }
    }

    refreshGoalBadges();
    const goalsTabEl = document.getElementById('tab-goals');
    if (goalsTabEl && goalsTabEl.classList.contains('active') && gameModal && gameModal.style.display === 'flex') {
      renderGoalsTab(false);
    }
  }

  let activeAchFilter: AchievementFilter = 'all';

  function buildGoalSnapshot(): GoalSnapshot {
    const relicCounts = getTreasureCounts(state.perks);
    const completedSetsCount = TREASURE_SETS.filter(set => isSetCompleted(relicCounts, set.id)).length;
    const totalRelicRanks = Array.from(relicCounts.values()).reduce(
      (sum, c) => sum + Math.min(MAX_RELIC_RANK, Math.max(0, Number(c) || 0)),
      0
    );
    const hasMaxRankRelic = Array.from(relicCounts.values()).some(c => c >= MAX_RELIC_RANK);
    const shinyCountNow = state.roster.filter(e => e && e.isShiny).length;
    const maxDogLevel = state.roster.reduce((max, e) => Math.max(max, Number(e?.level) || 1), 1);
    const totalPackLevels = state.roster.reduce((sum, e) => sum + Math.max(1, Number(e?.level) || 1), 0);
    const toysOwnedCount = (state.hasTennisBall ? 1 : 0) + (state.hasDuck ? 1 : 0) + (state.hasFrisbee ? 1 : 0);
    const maxedToysCount =
      (state.digPower >= MAX_DIG_POWER ? 1 : 0) +
      (state.idleMultiplier >= MAX_IDLE_MULTIPLIER ? 1 : 0) +
      (state.speedMultiplier >= MAX_SPEED_MULTIPLIER ? 1 : 0);
    const hasMaxedToy = maxedToysCount > 0;
    const ownedBreedsSet = new Set<string>(Array.isArray(state.uniqueBreedsOwned) ? state.uniqueBreedsOwned : []);
    state.roster.forEach(e => {
      if (e && e.breed) ownedBreedsSet.add(normalizeBreedKey(e.breed));
    });
    const ownedBreedKeys = Array.from(ownedBreedsSet);
    const hasFieldBreed = ownedBreedKeys.some(k => BREED_BY_KEY[k]?.tier === 'working');
    const hasNobleBreed = ownedBreedKeys.some(k => BREED_BY_KEY[k]?.tier === 'athletic');
    const hasLegendBreed = ownedBreedKeys.some(k => BREED_BY_KEY[k]?.tier === 'giant');
    const hasKomondor = ownedBreedsSet.has('komondor');
    const hasMaxRollPup = state.roster.some(e => e && isMaxRollGrade(e.rollGrade));
    const unlockedTilesCount = Object.values(state.unlockedTiles || {}).filter(Boolean).length;
    const unlockedManorColorsCount = Object.values(state.unlockedManorColors || {}).filter(Boolean).length;
    const hasGoldenHydrant =
      state.placedDecorations.some(d => d.type === 'goldenHydrant') || (state.decorInventory?.goldenHydrant || 0) > 0;

    return {
      lifetimeBones: Math.max(0, Number(state.lifetimeBones) || 0),
      lifetimeMagicBones: Math.max(0, Number(state.lifetimeMagicBones) || 0),
      bones: Math.max(0, Number(state.bones) || 0),
      boneCapReached: Boolean(state.boneCapEverShown) || (Number(state.bones) || 0) >= MAX_BONES,
      totalDigs: Math.max(0, Number(state.totalDigsCount) || 0),
      totalTaps: Math.max(0, Number(state.totalTapsCount) || 0),
      rosterCount: state.roster.length,
      everFullPack: Boolean(state.everFullPack) || state.roster.length >= MAX_DOGS,
      maxDogLevel,
      totalPackLevels,
      shinyCountNow,
      totalShiniesFound: Math.max(shinyCountNow, Number(state.totalShiniesFound) || 0),
      hasFieldBreed,
      hasNobleBreed,
      hasLegendBreed,
      hasKomondor,
      uniqueBreedsCount: ownedBreedsSet.size,
      totalPets: Math.max(0, Number(state.totalPetsCount) || 0),
      totalRerolls: Math.max(0, Number(state.totalRerollsCount) || 0),
      hasMaxRollPup,
      totalTreats: Math.max(0, Number(state.totalTreatsCount) || 0),
      totalWhistles: Math.max(0, Number(state.totalWhistlesCount) || 0),
      toysOwnedCount,
      maxedToysCount,
      hasMaxedToy,
      totalFreshToyBoosts: Math.max(0, Number(state.totalFreshToyBoosts) || 0),
      everJoyful: Boolean(state.everJoyful) || (Number(state.packHappiness) || 0) >= 70,
      everEcstatic: Boolean(state.everEcstatic) || ((Number(state.packHappiness) || 0) >= 90 && isEcstaticUnlocked()),
      placedDecorCount: state.placedDecorations.length,
      decorFloorBonus: getDecorFloorBonus(),
      maxHappinessCap: getPackHappinessCap(),
      hasManor: state.placedDecorations.some(d => d.type === 'doghouseManor') || (state.decorInventory?.doghouseManor || 0) > 0,
      hasSlide: state.placedDecorations.some(d => d.type === 'slide'),
      hasGoldenHydrant,
      parkExpanded: Boolean(state.parkExpanded),
      unlockedTilesCount,
      unlockedManorColorsCount,
      uniqueRelicsCount: relicCounts.size,
      completedSetsCount,
      totalRelicRanks,
      hasDiamondBowl: hasDiamondBowl(),
      hasMaxRankRelic,
      activePlaySeconds: Math.max(0, Number(state.activePlaySeconds) || 0),
      totalCheckIns: Math.max(0, Number(state.totalCheckInsCount) || 0),
      bestCheckInStreak: Math.max(Number(state.bestCheckInStreak) || 0, Number(state.checkInStreak) || 0),
      totalDailyGoalsClaimed: Math.max(0, Number(state.totalDailyGoalsClaimed) || 0),
      totalDailyBonusesClaimed: Math.max(0, Number(state.totalDailyBonusesClaimed) || 0)
    };
  }

  function getUnclaimedGoalsSummary(): { dailyReady: number; bonusReady: boolean; achReady: number; total: number } {
    const dg = ensureCurrentDailyGoals();
    const dailyList = getDailyGoalsForDate(dg.dateKey);
    let dailyReady = 0;
    let dailyCompletedCount = 0;
    dailyList.forEach(goal => {
      const val = Number(dg.progress[goal.metric]) || 0;
      const done = val >= goal.target;
      if (done) dailyCompletedCount += 1;
      if (done && !dg.claimed[goal.id]) {
        dailyReady += 1;
      }
    });
    const bonusReady = dailyCompletedCount >= dailyList.length && !dg.bonusClaimed;

    const snap = buildGoalSnapshot();
    const claimedAch = state.claimedAchievements || {};
    let achReady = 0;
    ACHIEVEMENTS.forEach(ach => {
      if (!claimedAch[ach.id] && ach.getValue(snap) >= ach.target) {
        achReady += 1;
      }
    });
    const total = dailyReady + (bonusReady ? 1 : 0) + achReady;
    return { dailyReady, bonusReady, achReady, total };
  }

  function refreshGoalBadges(): void {
    const summary = getUnclaimedGoalsSummary();
    const hasUnclaimed = summary.total > 0;
    const menuBadge = document.getElementById('menuBtnBadge');
    if (menuBadge) menuBadge.style.display = hasUnclaimed ? 'block' : 'none';
    const tabBadge = document.getElementById('goalsTabBadge');
    if (tabBadge) tabBadge.style.display = hasUnclaimed ? 'block' : 'none';
  }

  function refreshDailyResetTimer(): void {
    const timerEl = document.getElementById('dailyResetTimer');
    if (timerEl) {
      timerEl.textContent = `Resets in ${formatCountdownToMidnight(getMsUntilLocalMidnight())}`;
    }
  }

  function awardGoalMagicPopup(magicAmount: number, label: string): void {
    if (magicAmount <= 0) return;
    addMagicBones(magicAmount, false);
    sfx.shiny();
    const anchor = getCurrencyPillAnchor(true);
    addFloatingText(anchor.textX, anchor.textY, `+${magicAmount.toLocaleString()} ${label}`, '#ffeaa7', 'left', 'magic');
  }

  function claimDailyGoal(goalId: string): void {
    initAudio();
    const dg = ensureCurrentDailyGoals();
    const goal = getDailyGoalsForDate(dg.dateKey).find(g => g.id === goalId);
    if (!goal || dg.claimed[goal.id]) return;
    const cur = Number(dg.progress[goal.metric]) || 0;
    if (cur < goal.target) return;
    dg.claimed[goal.id] = true;
    state.totalDailyGoalsClaimed = (Number(state.totalDailyGoalsClaimed) || 0) + 1;
    awardGoalMagicPopup(goal.rewardMagic, 'Daily!');
    updateUI();
    renderGoalsTab(true);
    saveGame();
  }

  function claimDailyBonus(): void {
    initAudio();
    const dg = ensureCurrentDailyGoals();
    if (dg.bonusClaimed) return;
    const dailyList = getDailyGoalsForDate(dg.dateKey);
    const allDone = dailyList.every(g => (Number(dg.progress[g.metric]) || 0) >= g.target);
    if (!allDone) return;
    dg.bonusClaimed = true;
    state.totalDailyBonusesClaimed = (Number(state.totalDailyBonusesClaimed) || 0) + 1;
    awardGoalMagicPopup(DAILY_BONUS_MAGIC, 'Daily Bonus!');
    updateUI();
    renderGoalsTab(true);
    saveGame();
  }

  function claimAchievement(achId: string): void {
    initAudio();
    if (!state.claimedAchievements) state.claimedAchievements = {};
    if (state.claimedAchievements[achId]) return;
    const ach = ACHIEVEMENTS.find(a => a.id === achId);
    if (!ach) return;
    const snap = buildGoalSnapshot();
    if (ach.getValue(snap) < ach.target) return;
    state.claimedAchievements[ach.id] = true;
    awardGoalMagicPopup(ach.rewardMagic, 'Achievement!');
    updateUI();
    renderGoalsTab(true);
    saveGame();
  }

  function claimAllGoals(): void {
    initAudio();
    const dg = ensureCurrentDailyGoals();
    const dailyList = getDailyGoalsForDate(dg.dateKey);
    let totalMagic = 0;
    let completedCount = 0;

    dailyList.forEach(goal => {
      const val = Number(dg.progress[goal.metric]) || 0;
      if (val >= goal.target) {
        completedCount += 1;
        if (!dg.claimed[goal.id]) {
          dg.claimed[goal.id] = true;
          state.totalDailyGoalsClaimed = (Number(state.totalDailyGoalsClaimed) || 0) + 1;
          totalMagic += goal.rewardMagic;
        }
      }
    });

    if (completedCount >= dailyList.length && !dg.bonusClaimed) {
      dg.bonusClaimed = true;
      state.totalDailyBonusesClaimed = (Number(state.totalDailyBonusesClaimed) || 0) + 1;
      totalMagic += DAILY_BONUS_MAGIC;
    }

    if (!state.claimedAchievements) state.claimedAchievements = {};
    const snap = buildGoalSnapshot();
    ACHIEVEMENTS.forEach(ach => {
      if (!state.claimedAchievements[ach.id] && ach.getValue(snap) >= ach.target) {
        state.claimedAchievements[ach.id] = true;
        totalMagic += ach.rewardMagic;
      }
    });

    if (totalMagic > 0) {
      awardGoalMagicPopup(totalMagic, 'Claimed!');
      updateUI();
      renderGoalsTab(true);
      saveGame();
    }
  }

  function renderGoalsTab(force = false): void {
    const dailyListEl = document.getElementById('dailyGoalsList');
    const achListEl = document.getElementById('achievementsList');
    if (!dailyListEl || !achListEl) return;
    if (!force && (containerHasActivePointer(dailyListEl) || containerHasActivePointer(achListEl))) {
      return;
    }

    const dg = ensureCurrentDailyGoals();
    const dailyGoals = getDailyGoalsForDate(dg.dateKey);
    refreshDailyResetTimer();

    const renderRewardBadge = (amount: number): string =>
      `<span class="goal-reward-val">+${amount.toLocaleString()}${MAGIC_SPARK_INLINE_SVG}</span>`;

    const bonusIconEl = document.getElementById('dailyBonusIcon');
    if (bonusIconEl && !bonusIconEl.firstChild) {
      bonusIconEl.innerHTML = `<img class="goal-icon-img" src="${getGoalIconDataUrl('giftChest')}" alt="" />`;
    }

    let completedDailyCount = 0;
    dailyListEl.innerHTML = '';

    dailyGoals.forEach(goal => {
      const rawVal = Number(dg.progress[goal.metric]) || 0;
      const pct = Math.max(0, Math.min(100, (rawVal / goal.target) * 100));
      const isComplete = rawVal >= goal.target;
      const isClaimed = Boolean(dg.claimed[goal.id]);
      if (isComplete) completedDailyCount += 1;

      let goalDesc = goal.desc;
      if (goal.id === 'daily_checkin_3' && rawVal > 0 && rawVal < goal.target) {
        const nextReadyMs = (Number(dg.lastCheckInAt) || 0) + CHECKIN_COOLDOWN_MS - Date.now();
        if (nextReadyMs > 0) {
          goalDesc = `Check in 3 separate times today — next visit counts in ${formatCountdownToMidnight(nextReadyMs)}.`;
        }
      }

      const card = document.createElement('div');
      card.className = `goal-card${isClaimed ? ' is-claimed' : isComplete ? ' is-claimable' : ''}`;
      card.innerHTML = `
        <div class="goal-card-left">
          <div class="goal-icon" aria-hidden="true"><img class="goal-icon-img" src="${getGoalIconDataUrl(goal.icon)}" alt="" /></div>
          <div class="goal-body">
            <div class="goal-title-row">
              <span class="goal-title">${goal.title}</span>
              <span class="goal-progress-text">${formatGoalProgress(rawVal, goal.target, goal.format)}</span>
            </div>
            <div class="goal-desc">${goalDesc}</div>
            <div class="goal-progress-track">
              <div class="goal-progress-fill" style="width: ${pct.toFixed(1)}%;"></div>
            </div>
          </div>
        </div>
        <button type="button" class="goal-claim-btn${isClaimed ? ' is-done' : isComplete ? ' is-ready' : ''}" ${isClaimed || !isComplete ? 'disabled' : ''}>
          ${isClaimed ? `<span class="goal-claimed-label">${uiIconHtml('check')} Claimed</span>` : isComplete ? `<span>Claim</span><span class="goal-claim-sub">${renderRewardBadge(goal.rewardMagic)}</span>` : renderRewardBadge(goal.rewardMagic)}
        </button>
      `;
      if (isComplete && !isClaimed) {
        const btn = card.querySelector<HTMLButtonElement>('.goal-claim-btn');
        btn?.addEventListener('click', () => claimDailyGoal(goal.id));
      }
      dailyListEl.appendChild(card);
    });

    const bonusCard = document.getElementById('dailyBonusCard');
    const bonusSub = document.getElementById('dailyBonusSub');
    const btnBonus = document.getElementById('btnClaimDailyBonus') as HTMLButtonElement | null;
    const allDailyComplete = completedDailyCount >= dailyGoals.length;
    const bonusClaimed = Boolean(dg.bonusClaimed);
    if (bonusCard) {
      bonusCard.classList.toggle('is-claimable', allDailyComplete && !bonusClaimed);
      bonusCard.classList.toggle('is-claimed', bonusClaimed);
    }
    if (bonusSub) {
      bonusSub.textContent = bonusClaimed
        ? `All ${dailyGoals.length} Daily Goals complete — bonus claimed!`
        : allDailyComplete
          ? `All ${dailyGoals.length} Daily Goals complete — ready to claim!`
          : `Complete all ${dailyGoals.length} Daily Goals today (${completedDailyCount} / ${dailyGoals.length})`;
    }
    if (btnBonus) {
      btnBonus.disabled = bonusClaimed || !allDailyComplete;
      btnBonus.className = `goal-claim-btn${bonusClaimed ? ' is-done' : allDailyComplete ? ' is-ready' : ''}`;
      btnBonus.innerHTML = bonusClaimed
        ? `<span class="goal-claimed-label">${uiIconHtml('check')} Claimed</span>`
        : allDailyComplete
          ? `<span>Claim</span><span class="goal-claim-sub">${renderRewardBadge(DAILY_BONUS_MAGIC)}</span>`
          : renderRewardBadge(DAILY_BONUS_MAGIC);
    }

    const snap = buildGoalSnapshot();
    const claimedAch = state.claimedAchievements || {};
    let totalCompletedAch = 0;
    ACHIEVEMENTS.forEach(ach => {
      if (claimedAch[ach.id] || ach.getValue(snap) >= ach.target) {
        totalCompletedAch += 1;
      }
    });

    const achCountEl = document.getElementById('achCompletedCount');
    if (achCountEl) {
      achCountEl.textContent = `${totalCompletedAch} / ${ACHIEVEMENTS.length}`;
    }

    const unclaimedSummary = getUnclaimedGoalsSummary();
    const claimAllBtn = document.getElementById('btnClaimAllGoals') as HTMLButtonElement | null;
    if (claimAllBtn) {
      claimAllBtn.style.display = unclaimedSummary.total >= 2 ? 'inline-flex' : 'none';
      claimAllBtn.textContent = `Claim All (${unclaimedSummary.total})`;
    }

    const filteredAch = ACHIEVEMENTS.filter(a => activeAchFilter === 'all' || a.category === activeAchFilter);
    // Sort: claimable first, then in-progress, then claimed
    const sortedAch = [...filteredAch].sort((a, b) => {
      const aClaimed = Boolean(claimedAch[a.id]);
      const bClaimed = Boolean(claimedAch[b.id]);
      const aDone = aClaimed || a.getValue(snap) >= a.target;
      const bDone = bClaimed || b.getValue(snap) >= b.target;
      const rank = (done: boolean, claimed: boolean): number => (done && !claimed ? 0 : !done ? 1 : 2);
      return rank(aDone, aClaimed) - rank(bDone, bClaimed);
    });

    achListEl.innerHTML = '';
    sortedAch.forEach(ach => {
      const isClaimed = Boolean(claimedAch[ach.id]);
      const rawVal = isClaimed ? ach.target : ach.getValue(snap);
      const pct = Math.max(0, Math.min(100, (rawVal / ach.target) * 100));
      const isComplete = isClaimed || rawVal >= ach.target;

      const card = document.createElement('div');
      card.className = `goal-card${isClaimed ? ' is-claimed' : isComplete ? ' is-claimable' : ''}`;
      card.innerHTML = `
        <div class="goal-card-left">
          <div class="goal-icon" aria-hidden="true"><img class="goal-icon-img" src="${getGoalIconDataUrl(ach.icon)}" alt="" /></div>
          <div class="goal-body">
            <div class="goal-title-row">
              <span class="goal-title">${ach.title}</span>
              <span class="goal-progress-text">${formatGoalProgress(rawVal, ach.target, ach.format)}</span>
            </div>
            <div class="goal-desc">${ach.desc}</div>
            <div class="goal-progress-track">
              <div class="goal-progress-fill" style="width: ${pct.toFixed(1)}%;"></div>
            </div>
          </div>
        </div>
        <button type="button" class="goal-claim-btn${isClaimed ? ' is-done' : isComplete ? ' is-ready' : ''}" ${isClaimed || !isComplete ? 'disabled' : ''}>
          ${isClaimed ? `<span class="goal-claimed-label">${uiIconHtml('check')} Claimed</span>` : isComplete ? `<span>Claim</span><span class="goal-claim-sub">${renderRewardBadge(ach.rewardMagic)}</span>` : renderRewardBadge(ach.rewardMagic)}
        </button>
      `;
      if (isComplete && !isClaimed) {
        const btn = card.querySelector<HTMLButtonElement>('.goal-claim-btn');
        btn?.addEventListener('click', () => claimAchievement(ach.id));
      }
      achListEl.appendChild(card);
    });
  }

  document.getElementById('btnClaimDailyBonus')?.addEventListener('click', claimDailyBonus);
  document.getElementById('btnClaimAllGoals')?.addEventListener('click', claimAllGoals);
  document.querySelectorAll<HTMLButtonElement>('#achCategoryFilters .dogs-tier-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudio();
      const rawCat = btn.dataset.achCat || 'all';
      activeAchFilter =
        rawCat === 'bones' || rawCat === 'pack' || rawCat === 'park' || rawCat === 'relics'
          ? rawCat
          : 'all';
      document.querySelectorAll<HTMLButtonElement>('#achCategoryFilters .dogs-tier-btn').forEach(b => {
        const isAct = b.dataset.achCat === activeAchFilter;
        b.classList.toggle('active', isAct);
        b.setAttribute('aria-selected', String(isAct));
      });
      renderGoalsTab(true);
    });
  });

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
    setHtmlIfChanged(moodIconEl, uiIconHtml(info.icon));
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
    setHtmlIfChanged(popTitleEl, `${uiIconHtml(info.icon)} <span>${info.name} (${info.roundedPct}%)</span>`);
    if (popBonusEl) popBonusEl.textContent = info.bonusSummary;
    if (popFillEl) popFillEl.style.width = `${info.value}%`;
    if (popFloorEl) popFloorEl.style.left = `${info.floor}%`;
    if (popFloorLabelEl) popFloorLabelEl.textContent = `Cozy floor: ${floorPct}%`;

    const rosterTierEl = document.getElementById('rosterMoodTier');
    const rosterEffectsEl = document.getElementById('rosterMoodEffects');
    const rosterFillEl = document.getElementById('rosterMoodFill');
    const rosterFloorEl = document.getElementById('rosterMoodFloorMark');
    if (rosterTierEl) {
      setHtmlIfChanged(rosterTierEl, `${uiIconHtml(info.icon)} <span>${info.name} | ${info.roundedPct}%</span>`);
      rosterTierEl.classList.remove('mood-cozy', 'mood-happy', 'mood-joyful', 'mood-ecstatic');
      rosterTierEl.classList.add(tierClass);
    }
    if (rosterEffectsEl) {
      rosterEffectsEl.textContent = `${info.bonusSummary} | Cozy Floor ${floorPct}%`;
    }
    if (rosterFillEl) rosterFillEl.style.width = `${info.value}%`;
    if (rosterFloorEl) rosterFloorEl.style.left = `${info.floor}%`;

    const activeTreats = getActiveTreatTypeCount();
    const nowMs = Date.now();
    const toyInfo = getToyFloorBreakdown(nowMs);
    const decorFloor = getDecorFloorBonus();
    const maxCap = getPackHappinessCap();
    const ecstaticOpen = isEcstaticUnlocked();
    const decorFmt = formatCleanDecimal(decorFloor);
    const capFmt = formatCleanDecimal(maxCap);
    const lockedPct = Math.max(0, Math.min(100, HAPPINESS_MAX - maxCap));

    const popCapEl = document.getElementById('moodPopoverCap');
    if (popCapEl) {
      popCapEl.style.width = `${lockedPct}%`;
      popCapEl.style.display = lockedPct > 0 ? 'block' : 'none';
    }
    const rosterCapEl = document.getElementById('rosterMoodCap');
    if (rosterCapEl) {
      rosterCapEl.style.width = `${lockedPct}%`;
      rosterCapEl.style.display = lockedPct > 0 ? 'block' : 'none';
    }

    if (rosterEffectsEl) {
      rosterEffectsEl.textContent = maxCap < HAPPINESS_MAX
        ? `${info.bonusSummary} | Floor ${floorPct}% • Max ${capFmt}%`
        : `${info.bonusSummary} | Cozy Floor ${floorPct}%`;
    }

    const popDescEl = document.getElementById('moodPopoverDesc');
    if (popDescEl) {
      if (!ecstaticOpen) {
        popDescEl.textContent =
          `Your park's Max Happiness is ${capFmt}%. Place Park Decorations to raise the cap to 90%+ and unlock Ecstatic!`;
      } else if (maxCap < HAPPINESS_MAX) {
        popDescEl.textContent =
          `Ecstatic unlocked (Max ${capFmt}%)! Pet pups, give treats, and keep decorating to push Max Happiness to 100%.`;
      } else {
        popDescEl.textContent =
          'Max Happiness reached (100%)! Pet pups, toss Happy Snaps, and give treats to keep your pack Ecstatic.';
      }
    }

    if (popFloorLabelEl) {
      popFloorLabelEl.textContent = toyInfo.freshFloorBonus > 0
        ? `Cozy floor: ${floorPct}% (+${toyInfo.freshFloorBonus}% Fresh)`
        : `Cozy floor: ${floorPct}%`;
    }

    const totalPups = state.roster.length;
    const readyPups = state.roster.filter(entry => getDogPetHappinessCooldownMs(entry, nowMs) <= 0).length;
    const minPetCooldownMs = totalPups > 0
      ? Math.min(...state.roster.map(entry => getDogPetHappinessCooldownMs(entry, nowMs)))
      : 0;

    const petSourceEl = document.getElementById('moodSourcePetting');
    if (petSourceEl) {
      if (totalPups <= 1) {
        petSourceEl.textContent = readyPups > 0 ? 'Ready (+5)' : `Cooldown (${formatPetCooldownShort(minPetCooldownMs)})`;
      } else if (readyPups > 0) {
        petSourceEl.textContent = `${readyPups}/${totalPups} ready (+5)`;
      } else {
        petSourceEl.textContent = `Next in ${formatPetCooldownShort(minPetCooldownMs)}`;
      }
    }
    const treatSourceEl = document.getElementById('moodSourceTreats');
    if (treatSourceEl) {
      const freeRemMs = getFreeTreatCooldownMs(nowMs);
      if (activeTreats > 0) {
        treatSourceEl.textContent = `${activeTreats} active`;
      } else if (freeRemMs <= 0) {
        treatSourceEl.textContent = 'Happy Snaps Ready';
      } else {
        treatSourceEl.textContent = `Snaps ${formatPetCooldownShort(freeRemMs)}`;
      }
    }
    const toySourceEl = document.getElementById('moodSourceToys');
    if (toySourceEl) {
      if (toyInfo.freshFloorBonus > 0) {
        toySourceEl.textContent = `+${toyInfo.floorBonus}% (+${toyInfo.freshFloorBonus}% Fresh)`;
      } else {
        toySourceEl.textContent = toyInfo.floorBonus > 0 ? `+${toyInfo.floorBonus}% floor` : '0/3 owned';
      }
    }
    const decorSourceEl = document.getElementById('moodSourceDecor');
    if (decorSourceEl) {
      decorSourceEl.textContent = decorFloor <= 0
        ? `None (Max ${capFmt}%)`
        : `+${decorFmt}% (Max ${capFmt}%)`;
    }
  }

  function refreshWeatherHUD(): void {
    const weather = getCurrentWeather();
    const { next, msRemaining } = getNextWeatherInfo();

    const badgeIcon = document.getElementById('weatherBadgeIcon');
    const badgeText = document.getElementById('weatherBadgeText');
    setHtmlIfChanged(badgeIcon, uiIconHtml(weather.icon));
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
    setHtmlIfChanged(popTitle, `${uiIconHtml(weather.icon)} <span>${weather.name}</span>`);
    if (popMod) popMod.textContent = weather.modLabel;
    if (popDesc) popDesc.textContent = weather.desc;
    setHtmlIfChanged(popSky, `${uiIconHtml(tod.icon)} <span>${tod.name}</span> <span>|</span> ${uiIconHtml(moon.icon)} <span>${moon.name}</span>`);
    if (popCount) popCount.textContent = formatWeatherCountdown(msRemaining);
    setHtmlIfChanged(popNext, `<span>Next:</span> ${uiIconHtml(next.icon)} <span>${next.name}</span>`);
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
    openMenu('half');
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
    if (isModalCurrentlyOpen('offlineModal')) {
      closeOfflineModal();
      return true;
    }
    if (state.isPlacingDecor) {
      cancelDecorPlacement();
      return true;
    }
    if (state.isClearingDecor) {
      stopSingleClearMode();
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
  let lastFreshToyTickSec = 0;
  let lastFreeTreatTickSec = -1;

  function loop(now: number): void {
    try {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = rawDt > 1 ? 0.016 : Math.min(0.05, Math.max(0, rawDt));

      if (!document.hidden && dt > 0) {
        const prevActiveSec = Math.floor(Math.max(0, Number(state.activePlaySeconds) || 0));
        state.activePlaySeconds = Math.max(0, Number(state.activePlaySeconds) || 0) + dt;
        const dgBefore = ensureCurrentDailyGoals();
        const prevDailyMin = Math.floor(Number(dgBefore.progress.activeMinutes) || 0);
        dgBefore.progress.activeMinutes = (Number(dgBefore.progress.activeMinutes) || 0) + dt / 60;
        const nextDailyMin = Math.floor(dgBefore.progress.activeMinutes);
        const nextActiveSec = Math.floor(state.activePlaySeconds);
        if (nextActiveSec !== prevActiveSec) {
          const activeTimeEl = document.getElementById('statActiveTime');
          if (activeTimeEl) {
            activeTimeEl.textContent = formatActivePlayTime(state.activePlaySeconds);
          }
          if (nextActiveSec % 15 === 0 || nextDailyMin !== prevDailyMin) {
            if (recordCheckInIfEligible()) {
              requestSave();
            }
            refreshDailyResetTimer();
            refreshGoalBadges();
            const goalsTabEl = document.getElementById('tab-goals');
            if (goalsTabEl && goalsTabEl.classList.contains('active') && gameModal && gameModal.style.display === 'flex') {
              renderGoalsTab(false);
            }
          }
        }
      }

      // Smooth rotational inertia after flicking the park (hard-clamped against NaN/runaway velocity)
      if (!Number.isFinite(cameraAngle)) {
        cameraAngle = 0;
      }
      if (!Number.isFinite(cameraVelocity) || activePointers.size > 0) {
        cameraVelocity = 0;
      }
      if (!isRotating && Math.abs(cameraVelocity) > 0.002) {
        cameraVelocity = Math.max(-MAX_CAMERA_VELOCITY, Math.min(MAX_CAMERA_VELOCITY, cameraVelocity));
        cameraAngle += cameraVelocity * dt;
        if (cameraAngle > Math.PI || cameraAngle < -Math.PI) {
          cameraAngle = ((cameraAngle + Math.PI) % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2) - Math.PI;
        }
        cameraVelocity *= Math.pow(0.06, dt);
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
        if (state.baconTimer === 0) {
          state.baconStacks = 0;
          settleExpiredTreatBreakEven('bacon');
        }
      } else if (state.baconStacks > 0) {
        state.baconStacks = 0;
      }

      if (state.pupCupTimer > 0) {
        state.pupCupTimer = Math.max(0, state.pupCupTimer - dt);
        if (state.pupCupTimer === 0) {
          state.pupCupStacks = 0;
          settleExpiredTreatBreakEven('cup');
        }
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
        if (state.feastTimer === 0) {
          state.feastStacks = 0;
          settleExpiredTreatBreakEven('feast');
        }
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

      const freshNowMs = Date.now();
      let freshToyExpired = false;
      if (state.freshBallUntil > 0 && state.freshBallUntil <= freshNowMs) {
        state.freshBallUntil = 0;
        freshToyExpired = true;
      }
      if (state.freshDuckUntil > 0 && state.freshDuckUntil <= freshNowMs) {
        state.freshDuckUntil = 0;
        freshToyExpired = true;
      }
      if (state.freshFrisbeeUntil > 0 && state.freshFrisbeeUntil <= freshNowMs) {
        state.freshFrisbeeUntil = 0;
        freshToyExpired = true;
      }
      if (freshToyExpired) {
        lastFreshToyTickSec = Math.floor(freshNowMs / 1000);
        updateUI();
        requestSave();
      } else if (
        state.freshBallUntil > freshNowMs ||
        state.freshDuckUntil > freshNowMs ||
        state.freshFrisbeeUntil > freshNowMs
      ) {
        const freshSec = Math.floor(freshNowMs / 1000);
        if (freshSec !== lastFreshToyTickSec) {
          lastFreshToyTickSec = freshSec;
          refreshToyBoostBadges(freshNowMs);
        }
      }

      const freeTreatRemMs = getFreeTreatCooldownMs(freshNowMs);
      if (freeTreatRemMs > 0) {
        const freeSec = Math.floor(freshNowMs / 1000);
        if (freeSec !== lastFreeTreatTickSec) {
          lastFreeTreatTickSec = freeSec;
          refreshTreatButtonStates(freshNowMs);
        }
      } else if (lastFreeTreatTickSec !== -1) {
        lastFreeTreatTickSec = -1;
        refreshTreatButtonStates(freshNowMs);
      }

      if (state.feastAnimTimer > 0) state.feastAnimTimer = Math.max(0, state.feastAnimTimer - dt);

      // Update Pack Happiness gentle trickle (treats) or cooldown (Ecstatic active cooling / gentle below 90%)
      const prevMoodRounded = Math.round(state.packHappiness || getCozyFloor());
      const prevMoodTier = getPackHappinessInfo().tier;
      const activeTreats = getActiveTreatTypeCount();
      const moodCap = getPackHappinessCap();
      if (activeTreats > 0) {
        const trickle = Math.min(0.45, activeTreats * HAPPINESS_TREAT_TRICKLE_PER_SEC) * dt;
        addPackHappiness(trickle, true);
      } else {
        const floor = getCozyFloor();
        let cur = Number(state.packHappiness) || floor;
        if (cur > moodCap) {
          cur = moodCap;
        }
        if (cur >= 90) {
          // Ecstatic zone requires active care; extra decor & Samoyed/Pyrenees traits slow cooling
          const ecstaticCoolPerSec =
            (HAPPINESS_ECSTATIC_LIVE_COOL_PER_MIN / 60) *
            getEcstaticDecorDecayMult() *
            getPackTraitBonuses().moodDecayMult;
          cur = Math.max(floor, cur - ecstaticCoolPerSec * dt);
        } else if (cur > floor) {
          // Gentle live-park cooldown below Ecstatic (2h full cool to Cozy Floor)
          const decayableSpan = Math.max(0, 90 - floor);
          const liveCoolPerSec = (decayableSpan / (HAPPINESS_LIVE_FULL_DECAY_HOURS * 3600)) * getPackTraitBonuses().moodDecayMult;
          cur = Math.max(floor, cur - liveCoolPerSec * dt);
        } else if (cur < floor) {
          cur = floor;
        }
        state.packHappiness = Math.max(floor, Math.min(moodCap, cur));
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

      const applyToyPlayBonuses = (walker: Dog): void => {
        const trait = getBreedTrait(walker.breed);
        awardPlayMood(0.4, trait.playMoodBonus || 0);
        if (trait.playXpMult && trait.playXpMult > 1) {
          const entry = walker.getRosterEntry();
          if (entry && entry.level < MAX_DOG_LEVEL) {
            const stats = getEffectiveBreedStats(entry, walker.breed);
            const xpGain = Math.max(4, Math.round(BASE_TOY_PLAY_XP * trait.playXpMult * stats.quickLearner * getActiveXpBoostMult()));
            const leveledUp = grantDogXp(entry, xpGain);
            const pos = gridToScreen(walker.gx, walker.gy);
            addFloatingText(pos.x, pos.y - 34 * getScale(), leveledUp ? 'Level Up!' : `Bounce! +${xpGain} XP`, '#ffeaa7');
            if (leveledUp) {
              sfx.upgrade();
            }
            requestSave();
            updateUI();
          }
        }
      };

      type ParkToyKind = 'ball' | 'frisbee' | 'duck';

      const pointToSegmentDist = (
        px: number,
        py: number,
        ax: number,
        ay: number,
        bx: number,
        by: number
      ): number => {
        const abx = bx - ax;
        const aby = by - ay;
        const abLenSq = abx * abx + aby * aby;
        if (abLenSq <= 1e-6) return Math.hypot(px - ax, py - ay);
        const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / abLenSq));
        return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
      };

      const pickForwardToySpot = (
        walker: Dog,
        curGx: number,
        curGy: number,
        minDist: number,
        maxDist: number
      ): { gx: number; gy: number } => {
        const gridSize = getGridSize();
        const dogScreen = gridToScreen(walker.gx, walker.gy);
        const faceSign = walker.facingRight ? 1 : -1;

        // Determine forward direction in grid space from walk approach vector, falling back to screen-facing vector
        let fwdGx = walker.moveDirGx;
        let fwdGy = walker.moveDirGy;
        const moveLen = Math.hypot(fwdGx, fwdGy);
        if (moveLen > 0.5) {
          fwdGx /= moveLen;
          fwdGy /= moveLen;
        } else {
          const aheadGrid = screenToGrid(dogScreen.x + faceSign * 42, dogScreen.y);
          const adx = aheadGrid.gx - walker.gx;
          const ady = aheadGrid.gy - walker.gy;
          const alen = Math.hypot(adx, ady) || 1;
          fwdGx = adx / alen;
          fwdGy = ady / alen;
        }

        // Ensure primary forward axis aligns with the dog's visual facing direction on screen
        const probeScreen = gridToScreen(curGx + fwdGx, curGy + fwdGy);
        if ((probeScreen.x - dogScreen.x) * faceSign < -4) {
          const aheadGrid = screenToGrid(dogScreen.x + faceSign * 42, dogScreen.y);
          const adx = aheadGrid.gx - walker.gx;
          const ady = aheadGrid.gy - walker.gy;
          const alen = Math.hypot(adx, ady) || 1;
          fwdGx = adx / alen;
          fwdGy = ady / alen;
        }

        const baseAngle = Math.atan2(fwdGy, fwdGx);
        // Try narrow natural forward cone first, only widening if blocked by park edge/obstacles
        const conePasses = [0.52, 0.92, 1.32];
        let bestSpot: { gx: number; gy: number } | null = null;
        let bestScore = -Infinity;

        for (let pass = 0; pass < conePasses.length; pass++) {
          const maxCone = conePasses[pass];
          for (let tries = 0; tries < 8; tries++) {
            const offsetAngle = (Math.random() * 2 - 1) * maxCone;
            const angle = baseAngle + offsetAngle;
            const dist = minDist + Math.random() * (maxDist - minDist);
            const rawGx = curGx + Math.cos(angle) * dist;
            const rawGy = curGy + Math.sin(angle) * dist;
            if (rawGx < 0.65 || rawGx > gridSize - 0.65 || rawGy < 0.65 || rawGy > gridSize - 0.65) {
              continue;
            }
            const cand = pushOutsideAllObstacles(rawGx, rawGy, 0.1);
            const actualDx = cand.gx - curGx;
            const actualDy = cand.gy - curGy;
            const actualDist = Math.hypot(actualDx, actualDy);
            if (actualDist < 0.72) continue;

            const forwardDot = (actualDx * fwdGx + actualDy * fwdGy) / actualDist;
            if (forwardDot <= 0.12) continue;

            const candScreen = gridToScreen(cand.gx, cand.gy);
            const screenForward = (candScreen.x - dogScreen.x) * faceSign;
            const score = forwardDot * 3.0 + (screenForward > 0 ? 1.8 : -1.5) + Math.min(actualDist, maxDist) * 0.4;
            if (score > bestScore) {
              bestScore = score;
              bestSpot = cand;
            }
          }
          if (bestSpot && bestScore > 2.4) break;
        }

        if (!bestSpot) {
          // Cornered against fence fallback: pick furthest valid spot maximizing forward alignment
          const fallbackSteps = 12;
          for (let i = 0; i < fallbackSteps; i++) {
            const angle = baseAngle + ((i / fallbackSteps) * Math.PI * 2 - Math.PI);
            const dist = minDist + 0.25;
            const cand = pushOutsideAllObstacles(
              Math.max(0.7, Math.min(gridSize - 0.7, curGx + Math.cos(angle) * dist)),
              Math.max(0.7, Math.min(gridSize - 0.7, curGy + Math.sin(angle) * dist)),
              0.1
            );
            const actualDx = cand.gx - curGx;
            const actualDy = cand.gy - curGy;
            const actualDist = Math.hypot(actualDx, actualDy);
            if (actualDist < 0.45) continue;
            const forwardDot = (actualDx * fwdGx + actualDy * fwdGy) / actualDist;
            const score = forwardDot * 2.5 + actualDist * 0.5;
            if (score > bestScore) {
              bestScore = score;
              bestSpot = cand;
            }
          }
        }

        const chosen = bestSpot || pushOutsideAllObstacles(
          Math.max(0.7, Math.min(gridSize - 0.7, curGx + fwdGx * minDist)),
          Math.max(0.7, Math.min(gridSize - 0.7, curGy + fwdGy * minDist)),
          0.1
        );

        const chosenScreen = gridToScreen(chosen.gx, chosen.gy);
        if (Math.abs(chosenScreen.x - dogScreen.x) > 2) {
          walker.facingRight = chosenScreen.x >= dogScreen.x;
        }
        return chosen;
      };

      const isEligibleForToy = (d: Dog): boolean =>
        d.state !== 'SLIDE_CLIMB' &&
        d.state !== 'SLIDE_DOWN' &&
        d.state !== 'DRINK' &&
        d.state !== 'EAT' &&
        d.state !== 'SLEEP' &&
        !d.isNightSleep &&
        !d.slideTarget &&
        !d.drinkTarget &&
        !d.treatTarget &&
        !d.onReachToy;

      const isEligibleForBallPass = (d: Dog, kicker: Dog): boolean =>
        d !== kicker &&
        d.state !== 'SLEEP' &&
        isEligibleForToy(d);

      const dispatchDogToToy = (walker: Dog, toyKind: ParkToyKind, comboDepth = 0): boolean => {
        let rawGx = 0;
        let rawGy = 0;
        if (toyKind === 'ball') {
          if (!state.hasTennisBall) return false;
          rawGx = tennisBall.isRolling ? tennisBall.targetGx : tennisBall.gx;
          rawGy = tennisBall.isRolling ? tennisBall.targetGy : tennisBall.gy;
        } else if (toyKind === 'frisbee') {
          if (!state.hasFrisbee) return false;
          rawGx = frisbee.isMoving ? frisbee.targetGx : frisbee.gx;
          rawGy = frisbee.isMoving ? frisbee.targetGy : frisbee.gy;
        } else {
          if (!state.hasDuck) return false;
          rawGx = duck.isMoved ? duck.targetGx : duck.gx;
          rawGy = duck.isMoved ? duck.targetGy : duck.gy;
        }

        const safeSpot = pushOutsideAllObstacles(rawGx, rawGy, 0.08);
        if (toyKind === 'ball' && !tennisBall.isRolling) {
          tennisBall.gx = safeSpot.gx;
          tennisBall.gy = safeSpot.gy;
        } else if (toyKind === 'frisbee' && !frisbee.isMoving) {
          frisbee.gx = safeSpot.gx;
          frisbee.gy = safeSpot.gy;
        } else if (toyKind === 'duck' && !duck.isMoved) {
          duck.gx = safeSpot.gx;
          duck.gy = safeSpot.gy;
        }

        if (findNavPath(walker.gx, walker.gy, safeSpot.gx, safeSpot.gy) === null) {
          return false;
        }

        const BALL_DRAG = 3.15;
        const FRISBEE_DRAG = 2.15;
        const DUCK_DRAG = 3.85;

        const launchTennisBallToward = (
          kicker: Dog,
          startGx: number,
          startGy: number,
          targetGx: number,
          targetGy: number
        ): void => {
          const dx = targetGx - startGx;
          const dy = targetGy - startGy;
          const dist = Math.hypot(dx, dy) || 0.01;
          const launchSpeed = Math.max(4.6, Math.min(9.8, dist * (BALL_DRAG + 0.32)));
          tennisBall.vx = (dx / dist) * launchSpeed;
          tennisBall.vy = (dy / dist) * launchSpeed;
          tennisBall.z = Math.max(tennisBall.z, 1.5);
          tennisBall.vz = 115 + Math.random() * 35;
          tennisBall.squash = 0.24;
          tennisBall.isRolling = true;
          tennisBall.ricochetCount = 0;
          tennisBall.kicker = kicker;
          tennisBall.kickerGrace = 0.28;
          tennisBall.chaser = null;
          tennisBall.targetGx = targetGx;
          tennisBall.targetGy = targetGy;
        };

        const launchFrisbeeToward = (
          kicker: Dog,
          startGx: number,
          startGy: number,
          targetGx: number,
          targetGy: number
        ): void => {
          const dx = targetGx - startGx;
          const dy = targetGy - startGy;
          const dist = Math.hypot(dx, dy) || 0.01;
          const launchSpeed = Math.max(4.4, Math.min(8.6, dist * (FRISBEE_DRAG + 0.35)));
          frisbee.vx = (dx / dist) * launchSpeed;
          frisbee.vy = (dy / dist) * launchSpeed;
          frisbee.z = Math.max(frisbee.z, 2.5);
          frisbee.vz = 72 + Math.random() * 18;
          frisbee.curveRate = (Math.random() < 0.5 ? -1 : 1) * (0.28 + Math.random() * 0.34);
          frisbee.wobble = 0.14;
          frisbee.isMoving = true;
          frisbee.ricochetCount = 0;
          frisbee.kicker = kicker;
          frisbee.kickerGrace = 0.30;
          frisbee.chaser = null;
          frisbee.targetGx = targetGx;
          frisbee.targetGy = targetGy;
        };

        const launchDuckToward = (
          kicker: Dog,
          startGx: number,
          startGy: number,
          targetGx: number,
          targetGy: number
        ): void => {
          const dx = targetGx - startGx;
          const dy = targetGy - startGy;
          const dist = Math.hypot(dx, dy) || 0.01;
          const launchSpeed = Math.max(3.8, Math.min(7.2, dist * (DUCK_DRAG + 0.25)));
          duck.vx = (dx / dist) * launchSpeed;
          duck.vy = (dy / dist) * launchSpeed;
          duck.z = Math.max(duck.z, 1.0);
          duck.vz = 68 + Math.random() * 18;
          duck.squash = 0.26;
          duck.wobble = 0.55;
          if (Math.abs(dx - dy) > 0.05) {
            duck.facingRight = (dx - dy) >= 0;
          }
          duck.isMoved = true;
          duck.ricochetCount = 0;
          duck.kicker = kicker;
          duck.kickerGrace = 0.30;
          duck.chaser = null;
          duck.targetGx = targetGx;
          duck.targetGy = targetGy;
        };

        walker.cancelSlide();
        walker.cancelDrink();
        walker.setWalkTarget(safeSpot.gx, safeSpot.gy);
        walker.digOnArrival = false;
        walker.state = 'WALK';
        if (toyKind === 'ball') {
          tennisBall.chaser = walker;
        } else if (toyKind === 'frisbee') {
          frisbee.chaser = walker;
        } else {
          duck.chaser = walker;
        }
        walker.onReachToy = () => {
          applyToyPlayBonuses(walker);
          walker.petBounce = 0.28;

          let kickedBallToReceiver = false;

          if (toyKind === 'ball') {
            sfx.squeak();
            const startGx = tennisBall.gx;
            const startGy = tennisBall.gy;
            const nextSpot = pickForwardToySpot(walker, startGx, startGy, 1.25, 2.55);
            launchTennisBallToward(walker, startGx, startGy, nextSpot.gx, nextSpot.gy);

            // If the ball was kicked close to another awake pup, give them a high chance to play with it!
            if (tennisBall.passChainCount < 3 && dogs.length > 1) {
              let bestReceiver: Dog | null = null;
              let bestProximity = Infinity;
              for (const other of dogs) {
                if (!isEligibleForBallPass(other, walker)) continue;
                const endDist = Math.hypot(other.gx - nextSpot.gx, other.gy - nextSpot.gy);
                const pathDist = pointToSegmentDist(other.gx, other.gy, startGx, startGy, nextSpot.gx, nextSpot.gy);
                const proximity = Math.min(endDist, pathDist + 0.25);
                if (proximity <= 1.55 && proximity < bestProximity) {
                  bestProximity = proximity;
                  bestReceiver = other;
                }
              }
              if (bestReceiver) {
                const passChance = bestProximity <= 0.95 ? 0.72 : 0.50;
                if (Math.random() < passChance && dispatchDogToToy(bestReceiver, 'ball', 0)) {
                  kickedBallToReceiver = true;
                  tennisBall.passChainCount += 1;
                  tennisBall.timer = 8.0 + Math.random() * 6.0;
                  bestReceiver.petBounce = 0.24;
                }
              }
            }
          } else if (toyKind === 'frisbee') {
            sfx.shiny();
            const startGx = frisbee.gx;
            const startGy = frisbee.gy;
            const nextSpot = pickForwardToySpot(walker, startGx, startGy, 1.45, 2.85);
            launchFrisbeeToward(walker, startGx, startGy, nextSpot.gx, nextSpot.gy);
          } else {
            sfx.quack();
            const startGx = duck.gx;
            const startGy = duck.gy;
            const nextSpot = pickForwardToySpot(walker, startGx, startGy, 0.95, 1.75);
            launchDuckToward(walker, startGx, startGy, nextSpot.gx, nextSpot.gy);
          }

          // After batting the toy, occasionally chain into chasing the same toy again (22%, if not passed)
          // or running to another owned toy (16%); majority of the time, walk off somewhere else.
          if (comboDepth < 1) {
            const followRoll = Math.random();
            if (!kickedBallToReceiver && followRoll < 0.22) {
              if (dispatchDogToToy(walker, toyKind, comboDepth + 1)) {
                return;
              }
            } else if (followRoll < (kickedBallToReceiver ? 0.16 : 0.38)) {
              const otherToys: ParkToyKind[] = [];
              if (toyKind !== 'ball' && state.hasTennisBall) otherToys.push('ball');
              if (toyKind !== 'frisbee' && state.hasFrisbee) otherToys.push('frisbee');
              if (toyKind !== 'duck' && state.hasDuck) otherToys.push('duck');
              if (otherToys.length > 0) {
                const pickOther = otherToys[Math.floor(Math.random() * otherToys.length)];
                if (dispatchDogToToy(walker, pickOther, comboDepth + 1)) {
                  return;
                }
              }
            }
          }

          walker.pickNewTarget();
        };
        return true;
      };

      // Shared sub-stepped collision resolver for park toys against fences, static park obstacles, and bystander dogs
      interface ToyPhysBody {
        gx: number;
        gy: number;
        vx: number;
        vy: number;
        kicker: Dog | null;
        kickerGrace: number;
        chaser: Dog | null;
      }

      const resolveToyWorldCollisions = (
        body: ToyPhysBody,
        radius: number,
        restitution: number,
        dogRestitution: number,
        gridSz: number,
        onHit: (hitGx: number, hitGy: number, impactSpeed: number, splashBlue: boolean) => void
      ): void => {
        const minEdge = 0.36;
        const maxEdge = gridSz - 0.36;

        // 1. Park perimeter fences
        if (body.gx < minEdge) {
          body.gx = minEdge;
          if (body.vx < 0) {
            const imp = Math.abs(body.vx);
            body.vx = -body.vx * restitution;
            onHit(body.gx, body.gy, imp, false);
          }
        } else if (body.gx > maxEdge) {
          body.gx = maxEdge;
          if (body.vx > 0) {
            const imp = Math.abs(body.vx);
            body.vx = -body.vx * restitution;
            onHit(body.gx, body.gy, imp, false);
          }
        }
        if (body.gy < minEdge) {
          body.gy = minEdge;
          if (body.vy < 0) {
            const imp = Math.abs(body.vy);
            body.vy = -body.vy * restitution;
            onHit(body.gx, body.gy, imp, false);
          }
        } else if (body.gy > maxEdge) {
          body.gy = maxEdge;
          if (body.vy > 0) {
            const imp = Math.abs(body.vy);
            body.vy = -body.vy * restitution;
            onHit(body.gx, body.gy, imp, false);
          }
        }

        // 2. Static park obstacles (trees, hydrants, fountains, lamps, mushrooms, doghouse/manor, slides, water bowl)
        for (let i = 0; i < cachedStaticObstacles.length; i++) {
          const obs = cachedStaticObstacles[i];
          let nx = 0;
          let ny = 0;
          let hit = false;
          let hitX = body.gx;
          let hitY = body.gy;

          if (obs.kind === 'circle') {
            const minDist = obs.r + radius;
            const dx = body.gx - obs.cx;
            const dy = body.gy - obs.cy;
            const distSq = dx * dx + dy * dy;
            if (distSq < minDist * minDist) {
              hit = true;
              const dist = Math.sqrt(distSq);
              if (dist > 1e-4) {
                nx = dx / dist;
                ny = dy / dist;
              } else {
                const spd = Math.hypot(body.vx, body.vy) || 1;
                nx = -body.vx / spd;
                ny = -body.vy / spd;
              }
              body.gx = obs.cx + nx * (minDist + 0.004);
              body.gy = obs.cy + ny * (minDist + 0.004);
              hitX = obs.cx + nx * obs.r;
              hitY = obs.cy + ny * obs.r;
            }
          } else {
            const closestX = Math.max(obs.minGx, Math.min(obs.maxGx, body.gx));
            const closestY = Math.max(obs.minGy, Math.min(obs.maxGy, body.gy));
            const dx = body.gx - closestX;
            const dy = body.gy - closestY;
            const distSq = dx * dx + dy * dy;
            if (distSq < radius * radius) {
              hit = true;
              if (distSq > 1e-8) {
                const dist = Math.sqrt(distSq);
                nx = dx / dist;
                ny = dy / dist;
                body.gx = closestX + nx * (radius + 0.004);
                body.gy = closestY + ny * (radius + 0.004);
                hitX = closestX;
                hitY = closestY;
              } else {
                const dLeft = Math.abs(body.gx - obs.minGx);
                const dRight = Math.abs(obs.maxGx - body.gx);
                const dTop = Math.abs(body.gy - obs.minGy);
                const dBottom = Math.abs(obs.maxGy - body.gy);
                const minD = Math.min(dLeft, dRight, dTop, dBottom);
                if (minD === dLeft) {
                  nx = -1; ny = 0;
                  body.gx = obs.minGx - (radius + 0.004);
                } else if (minD === dRight) {
                  nx = 1; ny = 0;
                  body.gx = obs.maxGx + (radius + 0.004);
                } else if (minD === dTop) {
                  nx = 0; ny = -1;
                  body.gy = obs.minGy - (radius + 0.004);
                } else {
                  nx = 0; ny = 1;
                  body.gy = obs.maxGy + (radius + 0.004);
                }
                hitX = body.gx;
                hitY = body.gy;
              }
            }
          }

          if (hit) {
            const vn = body.vx * nx + body.vy * ny;
            if (vn < 0) {
              const imp = -vn;
              body.vx -= (1 + restitution) * vn * nx;
              body.vy -= (1 + restitution) * vn * ny;
              const jitter = (Math.random() - 0.5) * 0.09;
              const cosJ = Math.cos(jitter);
              const sinJ = Math.sin(jitter);
              const rvx = body.vx * cosJ - body.vy * sinJ;
              const rvy = body.vx * sinJ + body.vy * cosJ;
              body.vx = rvx;
              body.vy = rvy;
              const isWaterObject = obs.key === 'bowl' || obs.key.startsWith('fountain:');
              onHit(hitX, hitY, imp, isWaterObject);
            }
          }
        }

        // 3. Bystander dogs (excluding active chaser, just-kicked grace window, and dogs on slides)
        for (let i = 0; i < dogs.length; i++) {
          const d = dogs[i];
          if (d === body.chaser) continue;
          if (d === body.kicker && body.kickerGrace > 0) continue;
          if (d.state === 'SLIDE_CLIMB' || d.state === 'SLIDE_DOWN') continue;
          const minDist = radius + 0.23;
          const dx = body.gx - d.gx;
          const dy = body.gy - d.gy;
          const distSq = dx * dx + dy * dy;
          if (distSq < minDist * minDist && distSq > 1e-6) {
            const dist = Math.sqrt(distSq);
            const nx = dx / dist;
            const ny = dy / dist;
            const vn = body.vx * nx + body.vy * ny;
            if (vn < 0) {
              const imp = -vn;
              body.gx = d.gx + nx * (minDist + 0.004);
              body.gy = d.gy + ny * (minDist + 0.004);
              body.vx -= (1 + dogRestitution) * vn * nx;
              body.vy -= (1 + dogRestitution) * vn * ny;
              if (d.state !== 'SLEEP') {
                d.petBounce = Math.max(d.petBounce, 0.22);
              }
              onHit((body.gx + d.gx) * 0.5, (body.gy + d.gy) * 0.5, imp, false);
            }
          }
        }
      };

      const spawnToyImpactParticles = (
        hitGx: number,
        hitGy: number,
        heightPx: number,
        primaryColor: string,
        splashBlue: boolean
      ): void => {
        const hitScreen = gridToScreen(hitGx, hitGy);
        const s = getScale();
        const hitY = hitScreen.y - (4 + heightPx) * s;
        particles.push({
          x: hitScreen.x,
          y: hitY,
          vx: 0,
          vy: 0,
          life: 0.24,
          maxLife: 0.24,
          color: splashBlue ? '#74b9ff' : primaryColor,
          size: 3.5,
          isRing: true
        });
        const burstCount = splashBlue ? 5 : 4;
        for (let p = 0; p < burstCount; p++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 22 + Math.random() * 34;
          particles.push({
            x: hitScreen.x,
            y: hitY,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 16,
            life: 0.26 + Math.random() * 0.16,
            maxLife: 0.42,
            color: splashBlue ? (p % 2 === 0 ? '#74b9ff' : '#dff9fb') : (p % 2 === 0 ? '#ffffff' : primaryColor),
            size: 1.6 + Math.random() * 1.4
          });
        }
      };

      const nudgeTennisBallFromImpact = (nx: number, ny: number, imp: number): void => {
        const boost = Math.max(2.0, Math.min(5.2, imp * 0.85));
        tennisBall.vx = -nx * boost;
        tennisBall.vy = -ny * boost;
        tennisBall.z = Math.max(tennisBall.z, 1.0);
        tennisBall.vz = Math.max(tennisBall.vz, 75);
        tennisBall.squash = Math.max(tennisBall.squash, 0.24);
        tennisBall.isRolling = true;
      };

      const nudgeFrisbeeFromImpact = (nx: number, ny: number, imp: number): void => {
        const boost = Math.max(1.8, Math.min(4.6, imp * 0.72));
        frisbee.vx = -nx * boost;
        frisbee.vy = -ny * boost;
        frisbee.z = Math.max(frisbee.z, 1.5);
        frisbee.vz = Math.max(frisbee.vz, 38);
        frisbee.wobble = Math.max(frisbee.wobble, 0.45);
        frisbee.curveRate = (Math.random() < 0.5 ? -1 : 1) * 0.25;
        frisbee.isMoving = true;
      };

      const nudgeDuckFromImpact = (nx: number, ny: number, imp: number): void => {
        const boost = Math.max(1.6, Math.min(4.0, imp * 0.65));
        duck.vx = -nx * boost;
        duck.vy = -ny * boost;
        duck.z = Math.max(duck.z, 0.8);
        duck.vz = Math.max(duck.vz, 48);
        duck.squash = Math.max(duck.squash, 0.30);
        duck.wobble = Math.max(duck.wobble, 0.62);
        duck.quackPhase += 1.4;
        if (Math.abs(duck.vx - duck.vy) > 0.05) {
          duck.facingRight = (duck.vx - duck.vy) >= 0;
        }
        duck.isMoved = true;
      };

      if (state.hasTennisBall) {
        const BALL_DRAG = 3.15;
        const BALL_RADIUS = 0.12;
        const BALL_GRAVITY = 385;
        const BALL_RESTITUTION = 0.84;

        tennisBall.bouncePhase += dt;
        tennisBall.squash *= Math.exp(-16 * dt);
        if (tennisBall.soundCooldown > 0) tennisBall.soundCooldown = Math.max(0, tennisBall.soundCooldown - dt);
        if (tennisBall.chaserRedirectCooldown > 0) {
          tennisBall.chaserRedirectCooldown = Math.max(0, tennisBall.chaserRedirectCooldown - dt);
        }
        if (tennisBall.kickerGrace > 0) {
          tennisBall.kickerGrace = Math.max(0, tennisBall.kickerGrace - dt);
          if (tennisBall.kickerGrace <= 0) tennisBall.kicker = null;
        }
        if (tennisBall.chaser && (!tennisBall.chaser.onReachToy || tennisBall.chaser.state !== 'WALK')) {
          tennisBall.chaser = null;
        }

        const triggerBallRicochet = (
          hitGx: number,
          hitGy: number,
          impactSpeed: number,
          splashBlue = false,
          overrideQuack = false
        ): void => {
          tennisBall.ricochetCount += 1;
          tennisBall.vz = Math.max(tennisBall.vz, 72 + Math.min(62, impactSpeed * 10));
          tennisBall.squash = Math.max(tennisBall.squash, Math.min(0.36, 0.16 + impactSpeed * 0.03));

          if (tennisBall.soundCooldown <= 0) {
            if (overrideQuack) {
              sfx.duckBonk(tennisBall.ricochetCount - 1);
            } else {
              sfx.ballBounce(tennisBall.ricochetCount - 1);
            }
            tennisBall.soundCooldown = 0.075;
            spawnToyImpactParticles(hitGx, hitGy, tennisBall.z, '#d8ff66', splashBlue);
          }

          const gridSz = getGridSize();
          const pred = pushOutsideAllObstacles(
            Math.max(0.4, Math.min(gridSz - 0.4, tennisBall.gx + tennisBall.vx / BALL_DRAG)),
            Math.max(0.4, Math.min(gridSz - 0.4, tennisBall.gy + tennisBall.vy / BALL_DRAG)),
            0.1
          );
          tennisBall.targetGx = pred.gx;
          tennisBall.targetGy = pred.gy;
          if (
            tennisBall.chaser &&
            tennisBall.chaser.onReachToy &&
            tennisBall.chaser.state === 'WALK' &&
            tennisBall.chaserRedirectCooldown <= 0
          ) {
            tennisBall.chaser.setWalkTarget(pred.gx, pred.gy);
            tennisBall.chaserRedirectCooldown = 0.16;
          }
        };

        if (tennisBall.isRolling || tennisBall.z > 0 || Math.abs(tennisBall.vz) > 1) {
          tennisBall.vz -= BALL_GRAVITY * dt;
          tennisBall.z += tennisBall.vz * dt;
          if (tennisBall.z <= 0) {
            tennisBall.z = 0;
            if (Math.abs(tennisBall.vz) > 26) {
              tennisBall.squash = Math.max(tennisBall.squash, Math.min(0.24, Math.abs(tennisBall.vz) * 0.0018));
              tennisBall.vz = -tennisBall.vz * 0.56;
            } else {
              tennisBall.vz = 0;
              const hSpeed = Math.hypot(tennisBall.vx, tennisBall.vy);
              if (tennisBall.isRolling && hSpeed > 1.4) {
                tennisBall.vz = Math.min(48, hSpeed * 7.5);
              }
            }
          }
        }

        if (tennisBall.isRolling) {
          ensureNavCache();
          const gridSz = getGridSize();
          const startSpeed = Math.hypot(tennisBall.vx, tennisBall.vy);
          const steps = Math.max(1, Math.min(12, Math.ceil((startSpeed * dt) / 0.05)));
          const subDt = dt / steps;

          for (let step = 0; step < steps; step++) {
            tennisBall.gx += tennisBall.vx * subDt;
            tennisBall.gy += tennisBall.vy * subDt;

            resolveToyWorldCollisions(
              tennisBall,
              BALL_RADIUS,
              BALL_RESTITUTION,
              0.74,
              gridSz,
              (hx, hy, imp, splashBlue) => triggerBallRicochet(hx, hy, imp, splashBlue)
            );

            // Bounce off Frisbee & knock it into a glide
            if (state.hasFrisbee) {
              const minDist = BALL_RADIUS + 0.21;
              const dx = tennisBall.gx - frisbee.gx;
              const dy = tennisBall.gy - frisbee.gy;
              const distSq = dx * dx + dy * dy;
              if (distSq < minDist * minDist && distSq > 1e-6) {
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;
                tennisBall.gx = frisbee.gx + nx * (minDist + 0.004);
                tennisBall.gy = frisbee.gy + ny * (minDist + 0.004);
                const vn = tennisBall.vx * nx + tennisBall.vy * ny;
                if (vn < 0) {
                  const imp = -vn;
                  tennisBall.vx -= (1 + 0.78) * vn * nx;
                  tennisBall.vy -= (1 + 0.78) * vn * ny;
                  nudgeFrisbeeFromImpact(nx, ny, imp);
                  triggerBallRicochet((tennisBall.gx + frisbee.gx) * 0.5, (tennisBall.gy + frisbee.gy) * 0.5, imp);
                }
              }
            }

            // Bounce off Rubber Duck & make it scoot and wobble
            if (state.hasDuck) {
              const minDist = BALL_RADIUS + 0.20;
              const dx = tennisBall.gx - duck.gx;
              const dy = tennisBall.gy - duck.gy;
              const distSq = dx * dx + dy * dy;
              if (distSq < minDist * minDist && distSq > 1e-6) {
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;
                tennisBall.gx = duck.gx + nx * (minDist + 0.004);
                tennisBall.gy = duck.gy + ny * (minDist + 0.004);
                const vn = tennisBall.vx * nx + tennisBall.vy * ny;
                if (vn < 0) {
                  const imp = -vn;
                  tennisBall.vx -= (1 + 0.76) * vn * nx;
                  tennisBall.vy -= (1 + 0.76) * vn * ny;
                  nudgeDuckFromImpact(nx, ny, imp);
                  triggerBallRicochet((tennisBall.gx + duck.gx) * 0.5, (tennisBall.gy + duck.gy) * 0.5, imp, false, true);
                }
              }
            }

            const drag = Math.exp(-BALL_DRAG * subDt);
            tennisBall.vx *= drag;
            tennisBall.vy *= drag;
          }

          const curSpeed = Math.hypot(tennisBall.vx, tennisBall.vy);
          const screenSpinDir = (tennisBall.vx - tennisBall.vy) >= 0 ? 1 : -1;
          tennisBall.spinAngle += screenSpinDir * curSpeed * dt * 4.4;

          if (curSpeed < 0.24) {
            tennisBall.vx = 0;
            tennisBall.vy = 0;
            tennisBall.isRolling = false;
            const safeRest = pushOutsideAllObstacles(tennisBall.gx, tennisBall.gy, 0.1);
            tennisBall.gx = safeRest.gx;
            tennisBall.gy = safeRest.gy;
            tennisBall.targetGx = safeRest.gx;
            tennisBall.targetGy = safeRest.gy;
            if (
              tennisBall.chaser &&
              tennisBall.chaser.onReachToy &&
              tennisBall.chaser.state === 'WALK' &&
              Math.hypot(tennisBall.chaser.targetGx - safeRest.gx, tennisBall.chaser.targetGy - safeRest.gy) > 0.22
            ) {
              tennisBall.chaser.setWalkTarget(safeRest.gx, safeRest.gy);
            }
          }
        } else {
          tennisBall.timer -= dt;
          if (tennisBall.timer <= 0 && dogs.length > 0) {
            tennisBall.timer = 8.0 + Math.random() * 6.0;
            tennisBall.passChainCount = 0;
            const eligible = dogs.filter(isEligibleForToy);
            if (eligible.length > 0) {
              const walker = eligible[Math.floor(Math.random() * eligible.length)];
              dispatchDogToToy(walker, 'ball', 0);
            }
          }
        }
      }

      if (state.hasFrisbee) {
        const FRISBEE_AIR_DRAG = 2.15;
        const FRISBEE_GROUND_DRAG = 4.6;
        const FRISBEE_RADIUS = 0.19;
        const FRISBEE_GRAVITY = 155;
        const FRISBEE_RESTITUTION = 0.68;

        frisbee.wobblePhase += dt;
        frisbee.wobble *= Math.exp(-5.2 * dt);
        if (frisbee.soundCooldown > 0) frisbee.soundCooldown = Math.max(0, frisbee.soundCooldown - dt);
        if (frisbee.chaserRedirectCooldown > 0) {
          frisbee.chaserRedirectCooldown = Math.max(0, frisbee.chaserRedirectCooldown - dt);
        }
        if (frisbee.kickerGrace > 0) {
          frisbee.kickerGrace = Math.max(0, frisbee.kickerGrace - dt);
          if (frisbee.kickerGrace <= 0) frisbee.kicker = null;
        }
        if (frisbee.chaser && (!frisbee.chaser.onReachToy || frisbee.chaser.state !== 'WALK')) {
          frisbee.chaser = null;
        }

        const triggerFrisbeeRicochet = (
          hitGx: number,
          hitGy: number,
          impactSpeed: number,
          splashBlue = false,
          overrideQuack = false
        ): void => {
          frisbee.ricochetCount += 1;
          frisbee.wobble = Math.max(frisbee.wobble, Math.min(0.68, 0.34 + impactSpeed * 0.06));
          frisbee.curveRate = -frisbee.curveRate * 0.7;
          // Crisp flat deflection (tiny lift pop if airborne, no high ball-like bounce)
          if (frisbee.z > 1) {
            frisbee.vz = Math.max(frisbee.vz, 22);
          }

          if (frisbee.soundCooldown <= 0) {
            if (overrideQuack) {
              sfx.duckBonk(frisbee.ricochetCount - 1);
            } else {
              sfx.frisbeeClack(frisbee.ricochetCount - 1);
            }
            frisbee.soundCooldown = 0.08;
            spawnToyImpactParticles(hitGx, hitGy, frisbee.z, '#74b9ff', splashBlue);
          }

          const gridSz = getGridSize();
          const pred = pushOutsideAllObstacles(
            Math.max(0.4, Math.min(gridSz - 0.4, frisbee.gx + frisbee.vx / FRISBEE_AIR_DRAG)),
            Math.max(0.4, Math.min(gridSz - 0.4, frisbee.gy + frisbee.vy / FRISBEE_AIR_DRAG)),
            0.1
          );
          frisbee.targetGx = pred.gx;
          frisbee.targetGy = pred.gy;
          if (
            frisbee.chaser &&
            frisbee.chaser.onReachToy &&
            frisbee.chaser.state === 'WALK' &&
            frisbee.chaserRedirectCooldown <= 0
          ) {
            frisbee.chaser.setWalkTarget(pred.gx, pred.gy);
            frisbee.chaserRedirectCooldown = 0.16;
          }
        };

        // Smooth aerodynamic glide height (floats while spinning fast, settles flat with minimal skim)
        if (frisbee.isMoving || frisbee.z > 0 || Math.abs(frisbee.vz) > 1) {
          const hSpeed = Math.hypot(frisbee.vx, frisbee.vy);
          const liftFactor = frisbee.isMoving && frisbee.z > 1.5 ? Math.min(0.72, hSpeed * 0.13) : 0;
          const effGravity = FRISBEE_GRAVITY * (1 - liftFactor);
          frisbee.vz -= effGravity * dt;
          frisbee.z += frisbee.vz * dt;
          if (frisbee.z > 22) {
            frisbee.z = 22;
            if (frisbee.vz > 0) frisbee.vz *= 0.4;
          }
          if (frisbee.z <= 0) {
            frisbee.z = 0;
            if (Math.abs(frisbee.vz) > 34) {
              frisbee.vz = -frisbee.vz * 0.18;
              frisbee.wobble = Math.max(frisbee.wobble, 0.18);
            } else {
              frisbee.vz = 0;
            }
          }
        }

        if (frisbee.isMoving) {
          ensureNavCache();
          const gridSz = getGridSize();
          const startSpeed = Math.hypot(frisbee.vx, frisbee.vy);
          const steps = Math.max(1, Math.min(12, Math.ceil((startSpeed * dt) / 0.05)));
          const subDt = dt / steps;

          for (let step = 0; step < steps; step++) {
            // Subtle aerodynamic curve while gliding through the air
            if (frisbee.z > 1.5 && Math.abs(frisbee.curveRate) > 0.01) {
              const turn = frisbee.curveRate * subDt;
              const cosT = Math.cos(turn);
              const sinT = Math.sin(turn);
              const nvx = frisbee.vx * cosT - frisbee.vy * sinT;
              const nvy = frisbee.vx * sinT + frisbee.vy * cosT;
              frisbee.vx = nvx;
              frisbee.vy = nvy;
            }

            frisbee.gx += frisbee.vx * subDt;
            frisbee.gy += frisbee.vy * subDt;

            resolveToyWorldCollisions(
              frisbee,
              FRISBEE_RADIUS,
              FRISBEE_RESTITUTION,
              0.60,
              gridSz,
              (hx, hy, imp, splashBlue) => triggerFrisbeeRicochet(hx, hy, imp, splashBlue)
            );

            // Clack into Tennis Ball
            if (state.hasTennisBall) {
              const minDist = FRISBEE_RADIUS + 0.14;
              const dx = frisbee.gx - tennisBall.gx;
              const dy = frisbee.gy - tennisBall.gy;
              const distSq = dx * dx + dy * dy;
              if (distSq < minDist * minDist && distSq > 1e-6) {
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;
                frisbee.gx = tennisBall.gx + nx * (minDist + 0.004);
                frisbee.gy = tennisBall.gy + ny * (minDist + 0.004);
                const vn = frisbee.vx * nx + frisbee.vy * ny;
                if (vn < 0) {
                  const imp = -vn;
                  frisbee.vx -= (1 + 0.62) * vn * nx;
                  frisbee.vy -= (1 + 0.62) * vn * ny;
                  nudgeTennisBallFromImpact(nx, ny, imp);
                  triggerFrisbeeRicochet((frisbee.gx + tennisBall.gx) * 0.5, (frisbee.gy + tennisBall.gy) * 0.5, imp);
                }
              }
            }

            // Clack into Rubber Duck
            if (state.hasDuck) {
              const minDist = FRISBEE_RADIUS + 0.19;
              const dx = frisbee.gx - duck.gx;
              const dy = frisbee.gy - duck.gy;
              const distSq = dx * dx + dy * dy;
              if (distSq < minDist * minDist && distSq > 1e-6) {
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;
                frisbee.gx = duck.gx + nx * (minDist + 0.004);
                frisbee.gy = duck.gy + ny * (minDist + 0.004);
                const vn = frisbee.vx * nx + frisbee.vy * ny;
                if (vn < 0) {
                  const imp = -vn;
                  frisbee.vx -= (1 + 0.62) * vn * nx;
                  frisbee.vy -= (1 + 0.62) * vn * ny;
                  nudgeDuckFromImpact(nx, ny, imp);
                  triggerFrisbeeRicochet((frisbee.gx + duck.gx) * 0.5, (frisbee.gy + duck.gy) * 0.5, imp, false, true);
                }
              }
            }

            const activeDrag = frisbee.z > 0.5 ? FRISBEE_AIR_DRAG : FRISBEE_GROUND_DRAG;
            const drag = Math.exp(-activeDrag * subDt);
            frisbee.vx *= drag;
            frisbee.vy *= drag;
          }

          const curSpeed = Math.hypot(frisbee.vx, frisbee.vy);
          const screenVx = frisbee.vx - frisbee.vy;
          frisbee.spinAngle += (frisbee.curveRate >= 0 ? 1 : -1) * (4.5 + curSpeed * 3.8) * dt;
          const targetTilt = Math.max(-0.22, Math.min(0.22, screenVx * 0.032 + frisbee.curveRate * 0.18));
          frisbee.tilt += (targetTilt - frisbee.tilt) * Math.min(1, dt * 10);

          if (curSpeed < 0.22) {
            frisbee.vx = 0;
            frisbee.vy = 0;
            frisbee.isMoving = false;
            const safeRest = pushOutsideAllObstacles(frisbee.gx, frisbee.gy, 0.1);
            frisbee.gx = safeRest.gx;
            frisbee.gy = safeRest.gy;
            frisbee.targetGx = safeRest.gx;
            frisbee.targetGy = safeRest.gy;
            if (
              frisbee.chaser &&
              frisbee.chaser.onReachToy &&
              frisbee.chaser.state === 'WALK' &&
              Math.hypot(frisbee.chaser.targetGx - safeRest.gx, frisbee.chaser.targetGy - safeRest.gy) > 0.22
            ) {
              frisbee.chaser.setWalkTarget(safeRest.gx, safeRest.gy);
            }
          }
        } else {
          frisbee.tilt *= Math.exp(-10 * dt);
          frisbee.timer -= dt;
          if (frisbee.timer <= 0 && dogs.length > 0) {
            frisbee.timer = 10.0 + Math.random() * 8.0;
            const eligible = dogs.filter(isEligibleForToy);
            if (eligible.length > 0) {
              const walker = eligible[Math.floor(Math.random() * eligible.length)];
              dispatchDogToToy(walker, 'frisbee', 0);
            }
          }
        }
      }

      if (state.hasDuck) {
        const DUCK_DRAG = 3.85;
        const DUCK_RADIUS = 0.18;
        const DUCK_GRAVITY = 470;
        const DUCK_RESTITUTION = 0.62;

        duck.quackPhase += dt * (duck.isMoved ? 2.4 : 1.0);
        duck.squash *= Math.exp(-13 * dt);
        duck.wobble *= Math.exp((duck.isMoved ? -2.2 : -5.5) * dt);
        if (duck.soundCooldown > 0) duck.soundCooldown = Math.max(0, duck.soundCooldown - dt);
        if (duck.chaserRedirectCooldown > 0) {
          duck.chaserRedirectCooldown = Math.max(0, duck.chaserRedirectCooldown - dt);
        }
        if (duck.kickerGrace > 0) {
          duck.kickerGrace = Math.max(0, duck.kickerGrace - dt);
          if (duck.kickerGrace <= 0) duck.kicker = null;
        }
        if (duck.chaser && (!duck.chaser.onReachToy || duck.chaser.state !== 'WALK')) {
          duck.chaser = null;
        }

        const triggerDuckRicochet = (
          hitGx: number,
          hitGy: number,
          impactSpeed: number,
          splashBlue = false
        ): void => {
          duck.ricochetCount += 1;
          duck.squash = Math.max(duck.squash, Math.min(0.38, 0.22 + impactSpeed * 0.04));
          duck.wobble = Math.max(duck.wobble, Math.min(0.85, 0.50 + impactSpeed * 0.08));
          duck.vz = Math.max(duck.vz, 48 + Math.min(34, impactSpeed * 6));
          if (Math.abs(duck.vx - duck.vy) > 0.05) {
            duck.facingRight = (duck.vx - duck.vy) >= 0;
          }

          if (duck.soundCooldown <= 0) {
            sfx.duckBonk(duck.ricochetCount - 1);
            duck.soundCooldown = 0.095;
            spawnToyImpactParticles(hitGx, hitGy, duck.z, '#ffeaa7', splashBlue);
          }

          const gridSz = getGridSize();
          const pred = pushOutsideAllObstacles(
            Math.max(0.4, Math.min(gridSz - 0.4, duck.gx + duck.vx / DUCK_DRAG)),
            Math.max(0.4, Math.min(gridSz - 0.4, duck.gy + duck.vy / DUCK_DRAG)),
            0.1
          );
          duck.targetGx = pred.gx;
          duck.targetGy = pred.gy;
          if (
            duck.chaser &&
            duck.chaser.onReachToy &&
            duck.chaser.state === 'WALK' &&
            duck.chaserRedirectCooldown <= 0
          ) {
            duck.chaser.setWalkTarget(pred.gx, pred.gy);
            duck.chaserRedirectCooldown = 0.16;
          }
        };

        // Cute heavy short hop & soft rubbery plop landing
        if (duck.isMoved || duck.z > 0 || Math.abs(duck.vz) > 1) {
          duck.vz -= DUCK_GRAVITY * dt;
          duck.z += duck.vz * dt;
          if (duck.z <= 0) {
            duck.z = 0;
            if (Math.abs(duck.vz) > 38) {
              duck.squash = Math.max(duck.squash, 0.20);
              duck.vz = -duck.vz * 0.26;
            } else {
              duck.vz = 0;
            }
          }
        }

        if (duck.isMoved) {
          ensureNavCache();
          const gridSz = getGridSize();
          const startSpeed = Math.hypot(duck.vx, duck.vy);
          const steps = Math.max(1, Math.min(12, Math.ceil((startSpeed * dt) / 0.05)));
          const subDt = dt / steps;

          for (let step = 0; step < steps; step++) {
            duck.gx += duck.vx * subDt;
            duck.gy += duck.vy * subDt;

            resolveToyWorldCollisions(
              duck,
              DUCK_RADIUS,
              DUCK_RESTITUTION,
              0.56,
              gridSz,
              (hx, hy, imp, splashBlue) => triggerDuckRicochet(hx, hy, imp, splashBlue)
            );

            // Bump into Tennis Ball
            if (state.hasTennisBall) {
              const minDist = DUCK_RADIUS + 0.14;
              const dx = duck.gx - tennisBall.gx;
              const dy = duck.gy - tennisBall.gy;
              const distSq = dx * dx + dy * dy;
              if (distSq < minDist * minDist && distSq > 1e-6) {
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;
                duck.gx = tennisBall.gx + nx * (minDist + 0.004);
                duck.gy = tennisBall.gy + ny * (minDist + 0.004);
                const vn = duck.vx * nx + duck.vy * ny;
                if (vn < 0) {
                  const imp = -vn;
                  duck.vx -= (1 + 0.58) * vn * nx;
                  duck.vy -= (1 + 0.58) * vn * ny;
                  nudgeTennisBallFromImpact(nx, ny, imp);
                  triggerDuckRicochet((duck.gx + tennisBall.gx) * 0.5, (duck.gy + tennisBall.gy) * 0.5, imp);
                }
              }
            }

            // Bump into Frisbee
            if (state.hasFrisbee) {
              const minDist = DUCK_RADIUS + 0.19;
              const dx = duck.gx - frisbee.gx;
              const dy = duck.gy - frisbee.gy;
              const distSq = dx * dx + dy * dy;
              if (distSq < minDist * minDist && distSq > 1e-6) {
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;
                duck.gx = frisbee.gx + nx * (minDist + 0.004);
                duck.gy = frisbee.gy + ny * (minDist + 0.004);
                const vn = duck.vx * nx + duck.vy * ny;
                if (vn < 0) {
                  const imp = -vn;
                  duck.vx -= (1 + 0.58) * vn * nx;
                  duck.vy -= (1 + 0.58) * vn * ny;
                  nudgeFrisbeeFromImpact(nx, ny, imp);
                  triggerDuckRicochet((duck.gx + frisbee.gx) * 0.5, (duck.gy + frisbee.gy) * 0.5, imp);
                }
              }
            }

            const drag = Math.exp(-DUCK_DRAG * subDt);
            duck.vx *= drag;
            duck.vy *= drag;
          }

          const curSpeed = Math.hypot(duck.vx, duck.vy);
          if (curSpeed > 0.35 && Math.abs(duck.vx - duck.vy) > 0.08) {
            duck.facingRight = (duck.vx - duck.vy) >= 0;
          }
          if (curSpeed > 0.6) {
            duck.wobble = Math.max(duck.wobble, Math.min(0.45, curSpeed * 0.09));
          }

          if (curSpeed < 0.22) {
            duck.vx = 0;
            duck.vy = 0;
            duck.isMoved = false;
            const safeRest = pushOutsideAllObstacles(duck.gx, duck.gy, 0.1);
            duck.gx = safeRest.gx;
            duck.gy = safeRest.gy;
            duck.targetGx = safeRest.gx;
            duck.targetGy = safeRest.gy;
            if (
              duck.chaser &&
              duck.chaser.onReachToy &&
              duck.chaser.state === 'WALK' &&
              Math.hypot(duck.chaser.targetGx - safeRest.gx, duck.chaser.targetGy - safeRest.gy) > 0.22
            ) {
              duck.chaser.setWalkTarget(safeRest.gx, safeRest.gy);
            }
          }
        } else {
          duck.timer -= dt;
          if (duck.timer <= 0 && dogs.length > 0) {
            duck.timer = 9.0 + Math.random() * 6.0;
            const eligible = dogs.filter(isEligibleForToy);
            if (eligible.length > 0) {
              const walker = eligible[Math.floor(Math.random() * eligible.length)];
              dispatchDogToToy(walker, 'duck', 0);
            }
          }
        }
      }

      const nowMs = Date.now();
      const liveHour = getHourBucket(nowMs);
      if (liveHour !== currentWeatherHour) {
        currentWeatherHour = liveHour;
        const w = getCurrentWeather();
        addFloatingText(viewportW / 2, Math.max(96, viewportH * 0.16), `${w.name} (${w.shortMod})`, '#ffeaa7');
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
          setHtmlIfChanged(popSky, `${uiIconHtml(tod.icon)} <span>${tod.name}</span> <span>|</span> ${uiIconHtml(moon.icon)} <span>${moon.name}</span>`);
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
      const overlayBotAlphaPreview = 0.04 + 0.05 * sunnyWeight + 0.04 * windyWeight + Math.min(0.06, skyGlowAlpha * 0.25);
      const botOverlayPreviewRgb = lerpRgb(skyBot, skyGlow, 0.25);
      let finalBotRgb = lerpRgb(skyBot, [9, 132, 227], 0.07 * rainWeight);
      finalBotRgb = lerpRgb(finalBotRgb, botOverlayPreviewRgb, overlayBotAlphaPreview);
      const skyBotTuple: [number, number, number] = [
        Math.round(finalBotRgb[0]),
        Math.round(finalBotRgb[1]),
        Math.round(finalBotRgb[2])
      ];
      const skyTopTuple: [number, number, number] = [
        Math.round(skyTop[0]),
        Math.round(skyTop[1]),
        Math.round(skyTop[2])
      ];
      const skyBotRgb = `rgb(${skyBotTuple[0]}, ${skyBotTuple[1]}, ${skyBotTuple[2]})`;
      const skyTopRgb = `rgb(${skyTopTuple[0]}, ${skyTopTuple[1]}, ${skyTopTuple[2]})`;
      if (lastSkyBotRgb !== skyBotRgb || lastSkyTopRgb !== skyTopRgb) {
        lastSkyBotTuple = skyBotTuple;
        lastSkyTopTuple = skyTopTuple;
        lastSkyBotRgb = skyBotRgb;
        lastSkyTopRgb = skyTopRgb;
        document.documentElement.dataset.skyBot = skyBotRgb;
      }
      syncRootBackgroundColor();

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

      const activeGridSize = getGridSize();
      for (let gx = 0; gx < activeGridSize; gx++) {
        for (let gy = 0; gy < activeGridSize; gy++) {
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

      // Removable-Tile Overlay while in single-item clear mode
      if (state.isClearingDecor) {
        const decorTileKeys = new Set<string>();
        state.placedDecorations.forEach(dec => {
          getDecorFootprint(dec.type, dec.gx, dec.gy).forEach(t => {
            decorTileKeys.add(`${t.gx},${t.gy}`);
          });
        });

        const drawClearHighlight = (
          ogx: number,
          ogy: number,
          fill: string,
          stroke: string,
          drawCross: boolean
        ): void => {
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
          ctx.fillStyle = fill;
          ctx.fill();
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1.65;
          ctx.stroke();

          if (drawCross) {
            const cPos = getCenteredTilePos(ogx, ogy);
            const r = 5.5 * getScale();
            ctx.strokeStyle = 'rgba(255, 232, 232, 0.8)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(cPos.x - r, cPos.y - r * 0.55);
            ctx.lineTo(cPos.x + r, cPos.y + r * 0.55);
            ctx.moveTo(cPos.x + r, cPos.y - r * 0.55);
            ctx.lineTo(cPos.x - r, cPos.y + r * 0.55);
            ctx.stroke();
          }
        };

        ctx.save();
        // Highlight custom ground tiles (amber) that don't have a placed decoration on top
        Object.keys(state.tileMap || {}).forEach(key => {
          if (decorTileKeys.has(key)) return;
          const [gxStr, gyStr] = key.split(',');
          const ogx = Number(gxStr);
          const ogy = Number(gyStr);
          drawClearHighlight(ogx, ogy, 'rgba(253, 203, 110, 0.22)', 'rgba(255, 234, 167, 0.82)', false);
        });

        // Highlight placed decoration footprints (coral)
        decorTileKeys.forEach(key => {
          const [gxStr, gyStr] = key.split(',');
          const ogx = Number(gxStr);
          const ogy = Number(gyStr);
          drawClearHighlight(ogx, ogy, 'rgba(255, 107, 107, 0.24)', 'rgba(255, 118, 117, 0.85)', true);
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
      if (hasGrandDoghousePlaced()) {
        renderables.push({
          sortY: gridToScreen(1.0, 1.0).y + 4 * getScale(),
          draw: drawGrandDoghouseManor
        });
      } else {
        renderables.push({
          sortY: getCenteredTilePos(DOGHOUSE_TILE.gx, DOGHOUSE_TILE.gy).y,
          draw: drawDoghouse
        });
      }
      const activeBowlPos = getWaterBowlPos();
      renderables.push({ sortY: gridToScreen(activeBowlPos.gx, activeBowlPos.gy).y, draw: drawDogWaterBowl });
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

      updateWorldTreats(dt);
      worldTreats.forEach(treat => {
        if (treat.consumed) return;
        renderables.push({
          sortY: gridToScreen(treat.gx, treat.gy).y,
          draw: () => drawWorldTreat(treat)
        });
      });

      dogs.forEach(dog => {
        dog.update(dt);
        let dogSortY = gridToScreen(dog.gx, dog.gy).y;
        if ((dog.state === 'SLIDE_CLIMB' || dog.state === 'SLIDE_DOWN') && dog.slideTarget) {
          const y1 = getCenteredTilePos(dog.slideTarget.gx, dog.slideTarget.gy).y;
          const y2 = getCenteredTilePos(dog.slideTarget.gx + 1, dog.slideTarget.gy).y;
          dogSortY = Math.max(y1, y2) + 2;
        } else if (dog.state === 'DRINK' && dog.drinkTarget) {
          const waterSortY = dog.drinkTarget.kind === 'bowl'
            ? gridToScreen(activeBowlPos.gx, activeBowlPos.gy).y
            : getCenteredTilePos(dog.drinkTarget.gx ?? 0, dog.drinkTarget.gy ?? 0).y;
          dogSortY = Math.max(dogSortY, waterSortY + 1);
        } else if (dog.state === 'EAT' && dog.treatTarget) {
          // Keep the treat crisply in front of the dipping snout so the dog's head never hides it
          const treatSortY = gridToScreen(dog.treatTarget.gx, dog.treatTarget.gy).y;
          dogSortY = Math.min(dogSortY, treatSortY - 0.8);
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
            const gridSize = getGridSize();
            sp.gx = 0.4 + Math.random() * (gridSize - 0.8);
            sp.gy = 0.4 + Math.random() * (gridSize - 0.8);
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
          const anchor = getCurrencyPillAnchor(b.isMagic);
          b.x += (anchor.flyX - b.x) * 6 * dt;
          b.y += (anchor.flyY - b.y) * 6 * dt;

          if (Math.hypot(anchor.flyX - b.x, anchor.flyY - b.y) < 18) {
            if (b.isMagic) {
              const magicAmt = Math.max(1, Math.round(b.value || 1));
              addMagicBones(magicAmt, true);
              sfx.magicCollect();
              updateUI();
              const freshAnchor = getCurrencyPillAnchor(true);
              const overlap = floatingTexts.some(
                ft => ft.align === 'left' && Math.abs(ft.y - freshAnchor.textY) < 12 && ft.age < 0.25
              );
              addFloatingText(
                freshAnchor.textX,
                freshAnchor.textY + (overlap ? 12 : 0),
                `+${magicAmt}`,
                '#ffeaa7',
                'left',
                'magic'
              );
            } else {
              const added = addRegularBones(b.value);
              sfx.collect();
              updateUI();
              if (added > 0) {
                const labelVal = Number.isInteger(added) ? added.toLocaleString() : added.toFixed(1);
                const freshAnchor = getCurrencyPillAnchor(false);
                const overlap = floatingTexts.some(
                  ft => ft.align === 'left' && Math.abs(ft.y - freshAnchor.textY) < 12 && ft.age < 0.25
                );
                addFloatingText(
                  freshAnchor.textX,
                  freshAnchor.textY + (overlap ? 12 : 0),
                  `+${labelVal}`,
                  '#55efc4',
                  'left'
                );
              }
            }
            droppedBones.splice(i, 1);
            requestSave();
            continue;
          }
        }

        drawBoneSprite(b.x, b.y, b.isMagic);
      }

      const drawCanvasHeart = (cx: number, cy: number, radius: number, color: string): void => {
        ctx.save();
        ctx.translate(cx, cy);
        const r = Math.max(3.5, radius);
        ctx.beginPath();
        ctx.moveTo(0, r * 0.88);
        ctx.bezierCurveTo(-r * 1.25, r * 0.15, -r * 1.15, -r * 0.92, -r * 0.48, -r * 0.92);
        ctx.bezierCurveTo(-r * 0.15, -r * 0.92, 0, -r * 0.62, 0, -r * 0.42);
        ctx.bezierCurveTo(0, -r * 0.62, r * 0.15, -r * 0.92, r * 0.48, -r * 0.92);
        ctx.bezierCurveTo(r * 1.15, -r * 0.92, r * 1.25, r * 0.15, 0, r * 0.88);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = '#261738';
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.beginPath();
        ctx.arc(-r * 0.36, -r * 0.36, r * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      const drawInlineFloatingIcon = (
        icon: FloatingTextIcon,
        cx: number,
        cy: number
      ): void => {
        if (icon === 'heart') {
          drawCanvasHeart(cx, cy, 5.4, '#ff9ff3');
          return;
        }
        if (icon === 'spark') {
          ctx.save();
          ctx.translate(cx, cy);
          const r = 6.2;
          const inner = r * 0.28;
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.lineTo(inner, -inner);
          ctx.lineTo(r, 0);
          ctx.lineTo(inner, inner);
          ctx.lineTo(0, r);
          ctx.lineTo(-inner, inner);
          ctx.lineTo(-r, 0);
          ctx.lineTo(-inner, -inner);
          ctx.closePath();
          ctx.fillStyle = '#ffeaa7';
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = '#261738';
          ctx.stroke();
          ctx.restore();
          return;
        }
        // 'bone' or 'magic' — exact ground bone silhouette
        const isMagic = icon === 'magic';
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(0.68, 0.68);
        if (isMagic) {
          ctx.shadowColor = '#ffeaa7';
          ctx.shadowBlur = 8;
        }
        ctx.fillStyle = isMagic ? '#ffeaa7' : '#f5f6fa';
        ctx.strokeStyle = isMagic ? '#f39c12' : '#8e9aaf';
        ctx.lineWidth = 2.0;
        const drawParts = (strokeOnly: boolean) => {
          if (strokeOnly) {
            ctx.strokeRect(-7, -2.5, 14, 5);
          } else {
            ctx.fillRect(-7, -2.5, 14, 5);
          }
          const knobs: Array<[number, number]> = [[-7, -3], [-7, 3], [7, -3], [7, 3]];
          knobs.forEach(([kx, ky]) => {
            ctx.beginPath();
            ctx.arc(kx, ky, 3, 0, Math.PI * 2);
            if (strokeOnly) ctx.stroke();
            else ctx.fill();
          });
        };
        drawParts(true);
        drawParts(false);
        ctx.restore();
      };

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
          drawCanvasHeart(p.x, p.y - 4, Math.max(4.5, p.size * 1.15), p.color);
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
        const fy = ft.y - prog * 22;
        ctx.save();
        ctx.globalAlpha = 1 - prog;
        ctx.font = '800 13px "Outfit", system-ui, sans-serif';
        const align = ft.align || 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(13, 11, 26, 0.85)';

        if (ft.icon) {
          const textW = ctx.measureText(ft.text).width;
          const iconSpan = ft.icon === 'bone' || ft.icon === 'magic' ? 16 : 13;
          const gap = 5;
          let iconCx: number;
          let textX: number;
          if (align === 'left') {
            iconCx = ft.x + iconSpan * 0.5;
            textX = ft.x + iconSpan + gap;
            ctx.textAlign = 'left';
          } else {
            const totalW = iconSpan + gap + textW;
            const startX = ft.x - totalW * 0.5;
            iconCx = startX + iconSpan * 0.5;
            textX = startX + iconSpan + gap;
            ctx.textAlign = 'left';
          }
          drawInlineFloatingIcon(ft.icon, iconCx, fy - 4.2);
          ctx.strokeText(ft.text, textX, fy);
          ctx.fillStyle = ft.color;
          ctx.fillText(ft.text, textX, fy);
        } else {
          ctx.textAlign = align;
          ctx.strokeText(ft.text, ft.x, fy);
          ctx.fillStyle = ft.color;
          ctx.fillText(ft.text, ft.x, fy);
        }
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

  let hasReportedFirstFrame = false;
  const reportFirstFrame = () => {
    if (hasReportedFirstFrame) return;
    hasReportedFirstFrame = true;
    try {
      options.onFirstFrameRendered?.();
    } catch {
      // Ignore splash callback errors
    }
  };

  function startFrameLoop(now: number): void {
    loop(now);
    reportFirstFrame();
  }

  syncRootBackgroundColor();
  updateUI();
  requestAnimationFrame(startFrameLoop);

  return {
    syncRootBackground: syncRootBackgroundColor
  };
}

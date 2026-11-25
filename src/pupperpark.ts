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
  const MAX_DOG_LEVEL = 100;
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
  const MAX_DIG_POWER = 25;
  const TENNIS_BALL_FLAT_GAIN = 1;

  const BASE_SPEED_MULTIPLIER = 1;
  const FRISBEE_SPEED_STEP = 1.03;
  const MAX_SPEED_MULTIPLIER = 1.80;

  const BASE_MAGIC_CHANCE = 0.15;
  const MAX_MAGIC_CHANCE = 0.75;

  const MIN_USER_ZOOM = 0.65;
  const MAX_USER_ZOOM = 2.40;

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
  const WATER_BOWL_POS = { gx: 1.96, gy: 1.44 };
  const GRAND_WATER_BOWL_POS = { gx: 1.96, gy: 1.42 };
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
      magicBonus: 0.01,
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
      magicBonus: 0.01,
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
      magicBonus: 0.025,
      payoutBonus: 0.10,
      paceBonus: 0.05,
      cozyFloor: 8.0
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
      cozyFloor: 15.0
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

  const HAPPINESS_BASE_FLOOR = 35;
  const HAPPINESS_MAX = 100;
  const HAPPINESS_MAX_FLOOR = 95;
  const HAPPINESS_TREAT_TRICKLE_PER_SEC = 0.25;
  const HAPPINESS_AWAY_CHECKIN_HOURS = 8; // Lose 1/3 of decayable happiness per 8h away (3 check-ins/day)
  const HAPPINESS_AWAY_FULL_DECAY_HOURS = HAPPINESS_AWAY_CHECKIN_HOURS * 3; // 24h to settle to Cozy Floor
  const WHISTLE_HAPPINESS_COOLDOWN_MS = 15000;
  const PET_HAPPINESS_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes per dog

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

  function getTotalOfflineRate(): number {
    const duckBase = Math.max(
      BASE_IDLE_MULTIPLIER,
      Math.min(MAX_IDLE_MULTIPLIER, Number(state.idleMultiplier) || BASE_IDLE_MULTIPLIER)
    );
    const packOfflineAdd = getPackTraitBonuses().offlineBonus;
    return Math.min(MAX_TOTAL_OFFLINE_RATE, Math.round((duckBase + packOfflineAdd) * 1000) / 1000);
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
    isDraftingPerk: boolean;
    packHappiness: number;
    lastWhistleBoostAt: number;
    costs: Record<string, number>;
    breedEconomyVersion: number;
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
    isDraftingPerk: false,
    packHappiness: HAPPINESS_BASE_FLOOR,
    lastWhistleBoostAt: 0,
    costs: {},
    breedEconomyVersion: BREED_ECONOMY_VERSION,
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

  function formatPetCooldownShort(ms: number): string {
    const totalSec = Math.max(1, Math.ceil(ms / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins > 0) {
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${secs}s`;
  }

  function getXpNeededForLevel(level: number): number {
    return Math.floor(25 * Math.pow(1.2, Math.max(0, level - 1)));
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
      floorBonus += 3 + Math.min(2, Math.floor(Math.max(0, state.idleMultiplier - BASE_IDLE_MULTIPLIER) / 0.10));
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
    const treasureFloor = getPerkMultipliers().cozyFloorAdd;
    const packTraitFloor = getPackTraitBonuses().cozyFloorAdd;
    return Math.min(
      HAPPINESS_MAX_FLOOR,
      Math.round((HAPPINESS_BASE_FLOOR + toyFloor + decorFloor + treasureFloor + packTraitFloor) * 10) / 10
    );
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

  function getDigMultiplier(overrides?: { feastActive?: boolean; baconActive?: boolean }): number {
    const dugSum = getPackGrowthBonus();
    const { boneMult, workBonus } = getPerkMultipliers();
    const treatDigMult = getActiveFeastAndBaconMult(overrides?.feastActive, overrides?.baconActive);
    const decorMult = getDecorBonuses().payoutMult;
    const moodBoneMult = getPackHappinessInfo().boneMult;
    const packTraits = getPackTraitBonuses();
    return (DIG_MULT_BASE + dugSum) * state.speedMultiplier * treatDigMult * workBonus * boneMult * decorMult * moodBoneMult * (1 + packTraits.packBoneAura);
  }

  function getAverageBonesPerDig(): number {
    if (!state.roster || state.roster.length === 0) return state.digPower;
    const cupMult = getActiveCupMult();
    const packDigMult = getDigMultiplier();
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
      const raw = state.digPower * stats.boneYield * levelMult * cupMult * packDigMult * personalBoneMult;
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
      if (trait.luckyDigChance && trait.luckyDigMult && trait.luckyDigMult > 1) {
        personalBoneMult *= 1 + trait.luckyDigChance * (trait.luckyDigMult - 1);
      }

      const rawBones = state.digPower * stats.boneYield * levelMult * cupMult * packDigMult * personalBoneMult;
      const bonesPerRegularDig = Math.max(1, Math.round(rawBones * 10) / 10);

      const dogVisualPace = baseVisualPace * (1 + (weatherMatch?.paceBonus || 0));
      const napChance = Math.max(0.02, Math.min(0.85, 0.28 * (trait.napChanceMult ?? 1)));
      const sleepDetours = napChance / (1 - napChance);
      const avgIdleSec = 1.2 / dogVisualPace;
      const avgSleepOverheadSec = sleepDetours * ((4.6 * (trait.napDurationMult ?? 1)) / baconPaceMult + 1.4 / dogVisualPace);

      const avgWalkSec = 2.92 / (Math.max(0.5, stats.walkMult || 1.1) * dogVisualPace);
      const digRateMult = 1 + (trait.digSpeedBonus || 0) + (anyTreatActive ? (trait.treatDigSpeedBonus || 0) : 0);
      const baseDigSec = (stats.digSec || 1.5) / (dogVisualPace * digRateMult);
      const avgDigSec = trait.quickBurrowEvery && trait.quickBurrowEvery > 1
        ? (baseDigSec * (trait.quickBurrowEvery - 1) + 0.25) / trait.quickBurrowEvery
        : baseDigSec;
      const cycleSec = avgIdleSec + avgSleepOverheadSec + avgWalkSec + avgDigSec;
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
      const magicPerDrop = 1 + (entry.isShiny ? SHINY_MAGIC_BONE_BONUS : 0);
      const extraMagicRate = trait.extraMagicChance || 0;
      if (kongActive) {
        bonesPerMin += digsPerMin * bonesPerRegularDig;
        magicPerHour += digsPerMin * 60 * (magicPerDrop + extraMagicRate);
      } else {
        const regularShare = Math.max(0, 1 - magicChanceTotal);
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
      // Advance timestamp immediately so overlapping return events cannot settle the same span twice
      state.lastSaveTime = now;

      const effectiveSeconds = Math.min(rawElapsedSeconds, MAX_OFFLINE_SECONDS);
      const packTraits = getPackTraitBonuses();
      const cozyFloor = getCozyFloor();
      const currentMood = typeof state.packHappiness === 'number' && !Number.isNaN(state.packHappiness)
        ? Math.max(cozyFloor, Math.min(HAPPINESS_MAX, state.packHappiness))
        : cozyFloor;
      // Lose 1/3 of the decayable happiness span above Cozy Floor every 8 hours away (full cool over 24h)
      const decayableSpan = Math.max(0, HAPPINESS_MAX - cozyFloor);
      const awayFraction = Math.min(1, rawElapsedSeconds / (HAPPINESS_AWAY_FULL_DECAY_HOURS * 3600));
      const awayDrop = decayableSpan * awayFraction * packTraits.moodDecayMult;
      const nextMood = Math.max(cozyFloor, currentMood - awayDrop);
      state.packHappiness = nextMood;

      const estimatedDigs = estimateOfflineDigs(effectiveSeconds);
      const avgPerDig = getAverageBonesPerDig();
      const effectiveOfflineRate = getTotalOfflineRate();
      const earned = Math.floor(estimatedDigs * avgPerDig * effectiveOfflineRate);

      const rawMagicEarned = packTraits.offlineMagicPerDay > 0
        ? Math.floor(packTraits.offlineMagicPerDay * (effectiveSeconds / 86400))
        : 0;

      const offlineTreasureChance = Math.min(
        0.08,
        (0.002 + estimatedDigs * 0.0000015) * getPerkMultipliers().treasureOddsMult * (1 + packTraits.packTreasureAura)
      );
      const foundTreasure = Math.random() < offlineTreasureChance ? rollOfflineTreasure() : null;

      const actualEarned = earned > 0 ? addRegularBones(earned) : 0;
      const actualMagicEarned = rawMagicEarned > 0 ? addMagicBones(rawMagicEarned) : 0;
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
        state.isDraftingPerk = false;
        state.isPlacingDecor = false;
        state.activeDecorType = null;
        state.isClearingDecor = false;
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

    if (!hasSettledInitialReturn && !loadedFromExistingSave) {
      state.lastSaveTime = now;
      hasSettledInitialReturn = true;
      saveGameAt(now);
      return;
    }

    const settled = settleAwayProgressSinceLastSave(now);
    hasSettledInitialReturn = true;
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
    const roundedTenth = Math.round(safe * 10) / 10;
    return Number.isInteger(roundedTenth)
      ? roundedTenth.toLocaleString()
      : roundedTenth.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
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
        bonesLine.textContent = `+${formatAwardedBones(summary.actualEarned)} 🦴`;
        text.appendChild(bonesLine);
      }

      if ((summary.actualMagicEarned || 0) > 0) {
        const magicLine = document.createElement('div');
        magicLine.className = 'offline-magic-line';
        magicLine.textContent = `+${summary.actualMagicEarned.toLocaleString()} ✨ Magic Bones`;
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
              <div class="offline-treasure-name">Treasure Jackpot: +${foundTreasure.magicBones.toLocaleString()} ✨ Magic Bones</div>
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
    return `Rerolls for ${entry.name} cost 25 → 50 → 75 → 100 (+25 per reroll on this dog; currently reroll #${dogRerolls + 1}). Higher-rated previous stats are kept if not beaten, and non-shiny pups have a ${shinyOddsLabel} chance${manorNote} to become ✨ Shiny (+${SHINY_MAGIC_BONE_BONUS} bonus Magic Bone per ✨ drop).`;
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
      coatMetaEl.textContent = entry.isShiny
        ? `✨ Shiny (+${SHINY_MAGIC_BONE_BONUS} ✨/drop)`
        : 'Standard Coat';

      rerollDogSummary.replaceChildren(nameEl, breedMetaEl, coatMetaEl);
    }

    if (rerollCurrentStats) {
      const statRows: Array<[string, string]> = [
        ['Roll Grade', String(stats.rollGrade)],
        ['Bone Yield', `+${stats.bonusPayout.toFixed(2)} (${stats.boneYield.toFixed(2)}x)`],
        ['Pack Growth', `+${stats.bonusScaling.toFixed(2)} (${stats.packGrowth.toFixed(2)}x)`],
        ['Quick Learner', `+${stats.bonusXp.toFixed(2)} (${stats.quickLearner.toFixed(2)}x)`]
      ];
      const statNodes = statRows.map(([label, value]) => {
        const line = document.createElement('div');
        line.className = 'reroll-stat-line';
        const labelEl = document.createElement('span');
        labelEl.textContent = label;
        const valueEl = document.createElement('strong');
        valueEl.textContent = value;
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

        const statMsg = resultInfo.keptPrevious
          ? `Rolled ${resultInfo.rolledGrade} (+${resultInfo.rolledPayout.toFixed(2)} Yield / +${resultInfo.rolledScaling.toFixed(2)} Growth / +${resultInfo.rolledXp.toFixed(2)} XP) — previous higher-rated stats (${stats.rollGrade}) were kept!`
          : `New roll applied! Now ${stats.rollGrade} (+${stats.bonusPayout.toFixed(2)} Yield / +${stats.bonusScaling.toFixed(2)} Growth / +${stats.bonusXp.toFixed(2)} XP).`;

        const statLine = document.createElement('div');
        statLine.textContent = statMsg;

        const bannerNodes: HTMLElement[] = [statLine];
        if (resultInfo.becameShiny) {
          const shinyCallout = document.createElement('div');
          shinyCallout.className = 'reroll-shiny-callout';
          const rollOddsLabel = formatRerollShinyOddsLabel(resultInfo.rolledShinyOdds);
          shinyCallout.textContent = `✨ JACKPOT! ${rollOddsLabel} Shiny roll hit — ${entry.name} is now Shiny!`;
          bannerNodes.push(shinyCallout);
        }

        rerollResultBanner.replaceChildren(...bannerNodes);
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
    const effectiveShinyOdds = getEffectiveRerollShinyOdds();
    if (!entry.isShiny && Math.random() < effectiveShinyOdds) {
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
      state.packHappiness = Math.max(getCozyFloor(), Math.min(HAPPINESS_MAX, state.packHappiness || getCozyFloor()));

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
        if (d.state === 'SLEEP') {
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
      isDraftingPerk: false,
      packHappiness: HAPPINESS_BASE_FLOOR,
      lastWhistleBoostAt: 0,
      costs: {},
      breedEconomyVersion: BREED_ECONOMY_VERSION,
      lastSaveTime: resetNow
    };

    rebuildTileDetails();
    syncBreedCountsFromRoster();
    initDefaultCosts();

    rebuildCanvasDogsFromRoster();
    resize(true);
    droppedBones.length = 0;
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
    if (window.visualViewport && window.visualViewport.scale > 1.02) return;
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
      dog.onReachToy = null;
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
  }

  document.getElementById('btnWhistle')?.addEventListener('click', () => {
    dismissOnboardingHint();
    const gridSize = getGridSize();
    const center = gridToScreen(gridSize / 2, gridSize / 2);
    gatherPackAt(gridSize / 2, gridSize / 2, center.x, center.y);
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
    userZoom = Math.max(MIN_USER_ZOOM, Math.min(MAX_USER_ZOOM, userZoom * factor));
    dismissOnboardingHint();
    requestSave();
  }, { passive: false });

  // Prevent iOS Safari native page-pinch from competing with in-park canvas pinch/rotation,
  // while leaving menus, drawers, and modals freely zoomable for accessibility.
  const preventCanvasSafariGesture = (e: Event): void => {
    e.preventDefault();
  };
  canvas.addEventListener('gesturestart', preventCanvasSafariGesture, { passive: false });
  canvas.addEventListener('gesturechange', preventCanvasSafariGesture, { passive: false });

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
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 2) {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      isRotating = false;
      isPaintingStroke = false;
      lastPaintedTileKey = null;
      try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
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
    if (!state.isClearingDecor && !state.isPlacingDecor) {
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
    }
  });

  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (activePointers.has(e.pointerId)) {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (activePointers.size === 2 && pinchStartDist > 0) {
      const pts = Array.from(activePointers.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      userZoom = Math.max(MIN_USER_ZOOM, Math.min(MAX_USER_ZOOM, pinchStartZoom * (dist / pinchStartDist)));
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
        const tapBones = Math.max(1, Math.round(state.digPower * cupMult * 10) / 10);

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
  const DOG_AVOID_RADIUS = 0.56;
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
      r: 0.22
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
        if (d.state === 'SLEEP' || d.state === 'DRINK') {
          d.cancelDrink();
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

  function getSideDrinkSpot(
    waterGx: number,
    waterGy: number,
    sideOffsetPx: number,
    dyPx: number,
    dogGx: number,
    dogGy: number
  ): { gx: number; gy: number } {
    const waterScreen = gridToScreen(waterGx, waterGy);
    const s = getScale();
    const rawOptions = [
      screenToGrid(waterScreen.x + sideOffsetPx * s, waterScreen.y + dyPx * s),
      screenToGrid(waterScreen.x - sideOffsetPx * s, waterScreen.y + dyPx * s),
      screenToGrid(waterScreen.x + sideOffsetPx * 0.8 * s, waterScreen.y + (dyPx + 14) * s),
      screenToGrid(waterScreen.x - sideOffsetPx * 0.8 * s, waterScreen.y + (dyPx + 14) * s)
    ];

    const gridSize = getGridSize();
    const scored = rawOptions.map(raw => {
      const clampedGx = Math.max(0.35, Math.min(gridSize - 0.35, raw.gx));
      const clampedGy = Math.max(0.35, Math.min(gridSize - 0.35, raw.gy));
      const blocked = isPointBlockedByObstacle(clampedGx, clampedGy, 0.02);
      const safe = blocked ? pushOutsideAllObstacles(clampedGx, clampedGy, 0.05) : { gx: clampedGx, gy: clampedGy };
      const finalGx = Math.max(0.35, Math.min(gridSize - 0.35, safe.gx));
      const finalGy = Math.max(0.35, Math.min(gridSize - 0.35, safe.gy));
      const finalScreen = gridToScreen(finalGx, finalGy);
      const horizSep = Math.abs(finalScreen.x - waterScreen.x) / Math.max(0.01, s);
      const distFromDog = Math.hypot(finalGx - dogGx, finalGy - dogGy);
      // Strongly prefer unobstructed side spots with clean horizontal separation so the body never covers the water
      const penalty = (blocked ? 10 : 0) + Math.max(0, sideOffsetPx * 0.72 - horizSep) * 0.4;
      return { gx: finalGx, gy: finalGy, score: penalty + distFromDog * 0.15 };
    });

    scored.sort((a, b) => a.score - b.score);
    return { gx: scored[0].gx, gy: scored[0].gy };
  }

  function getAvailableWaterSource(dog: Dog): DrinkTarget | null {
    const candidates: DrinkTarget[] = [];
    const bowlPos = getWaterBowlPos();

    const bowlBusy = dogs.some(d => d !== dog && d.drinkTarget?.key === 'bowl');
    if (!bowlBusy) {
      // Stand cleanly beside the bowl (outside the doghouse tile(s)) so the torso never covers the bowl
      const sideSpot = getSideDrinkSpot(bowlPos.gx, bowlPos.gy, 23.5, 1.5, dog.gx, dog.gy);
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
        const safeStand = getSideDrinkSpot(centerGx, centerGy, 31.5, 3.2, dog.gx, dog.gy);
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
    state: 'IDLE' | 'WALK' | 'DIG' | 'SLEEP' | 'DRINK' | 'SLIDE_CLIMB' | 'SLIDE_DOWN';
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
    drinkTarget: DrinkTarget | null;
    drinkCooldown: number;
    waterBoostTimer: number;
    onReachWater: (() => void) | null;
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

    constructor(gx: number, gy: number, rosterId: string, breed = 'aussie', isShiny = false, shinyColor: string | null = null) {
      const safeStart = pushOutsideAllObstacles(gx, gy, 0.08);
      this.gx = safeStart.gx;
      this.gy = safeStart.gy;
      this.targetGx = safeStart.gx;
      this.targetGy = safeStart.gy;
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
      this.drinkTarget = null;
      this.drinkCooldown = 18 + Math.random() * 32;
      this.waterBoostTimer = 0;
      this.onReachWater = null;
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
    }

    clearNavPath(): void {
      this.navWaypoints = [];
      this.navBuiltVersion = -1;
      this.stuckTimer = 0;
      this.stuckCount = 0;
      this.lastProgressGx = this.gx;
      this.lastProgressGy = this.gy;
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
      this.state = 'IDLE';
      this.timer = 0.7 + Math.random() * 0.9;

      const pos = gridToScreen(this.gx, this.gy);
      const scale = getScale();
      const trait = getBreedTrait(this.breed);
      sfx.pet();
      addPackHappiness(2 + (trait.playMoodBonus || 0));

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
        const xpGain = Math.max(2, Math.round(4 * (trait.playXpMult ?? 1) * stats.quickLearner * getActiveXpBoostMult()));
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
        }
        requestSave();
      } else {
        addFloatingText(pos.x, pos.y - 34 * scale, 'Wheee!', '#ffeaa7');
      }
      updateUI();
    }

    enterSleep(): void {
      this.cancelSlide();
      this.cancelDrink();
      if (isNearSlideZone(this.gx, this.gy) || isPointBlockedByObstacle(this.gx, this.gy, 0.04)) {
        this.pickNewTarget();
        return;
      }
      const trait = getBreedTrait(this.breed);
      this.digStreak = 0;
      this.state = 'SLEEP';
      this.sleepFacingRight = this.facingRight;
      this.timer = (3.2 + Math.random() * 2.8) * (trait.napDurationMult ?? 1);
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
        if (entry && entry.level < MAX_DOG_LEVEL) {
          const stats = getEffectiveBreedStats(entry, this.breed);
          const xpGain = Math.max(1, Math.round(stats.quickLearner * getActiveXpBoostMult() * (trait.petXpMult ?? 1)));
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
          const petMsg = leveledUp
            ? 'Level Up!'
            : gaveHappiness
              ? `♥ +${xpGain} XP • +${petMoodAmt} Mood`
              : `♥ +${xpGain} XP`;
          addFloatingText(pos.x, pos.y - (32 + this.slideElevation) * scale, petMsg, leveledUp ? '#ffeaa7' : '#ff9ff3');
          if (leveledUp) {
            sfx.upgrade();
          }
          requestSave();
        } else {
          const petMsg = gaveHappiness ? `♥ +${petMoodAmt} Mood!` : '♥ Happy Pup!';
          addFloatingText(pos.x, pos.y - (32 + this.slideElevation) * scale, petMsg, '#ff9ff3');
          if (gaveHappiness) {
            requestSave();
          }
        }
        updateUI();
      } else if (gaveHappiness) {
        addFloatingText(pos.x, pos.y - (32 + this.slideElevation) * scale, `♥ +${petMoodAmt} Mood!`, '#ff9ff3');
        requestSave();
        updateUI();
      }
    }

    pickNewTarget(): void {
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
        this.state = 'WALK';
      } else {
        // Completely boxed in: dig or idle right where safe rather than stalling
        const safeHere = pushOutsideAllObstacles(this.gx, this.gy, 0.04);
        this.gx = safeHere.gx;
        this.gy = safeHere.gy;
        this.state = 'IDLE';
        this.timer = 0.9 + Math.random() * 0.9;
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
            : this.state === 'DRINK'
              ? 7.4
              : 5 * Math.min(1.35, visualPace)
      );
      this.wagPhase += dt * (
        this.state === 'SLEEP'
          ? 1.4
          : this.state === 'SLIDE_DOWN'
            ? 10.5 * moodInfo.wagMult
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
        const dogPos = gridToScreen(this.gx, this.gy);
        const waterPos = gridToScreen(this.drinkTarget.waterGx, this.drinkTarget.waterGy);
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
          const napChance = 0.28 * (trait.napChanceMult ?? 1);
          if (Math.random() < napChance && !isNearSlideZone(this.gx, this.gy) && !isPointBlockedByObstacle(this.gx, this.gy, 0.04)) {
            this.enterSleep();
          } else {
            this.pickNewTarget();
          }
        }
      } else if (this.state === 'WALK') {
        // Ensure final destination never lies inside a solid park obstacle
        if (!this.slideTarget && isPointBlockedByObstacle(this.targetGx, this.targetGy, 0.02)) {
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

          if (this.onReachToy) {
            this.onReachToy();
            this.onReachToy = null;
          }

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

          // Smooth dog-to-dog avoidance steering with deterministic passing bias
          let avoidX = 0;
          let avoidY = 0;
          const approachingReserved = Boolean((this.drinkTarget || this.slideTarget) && dist < 0.32);
          const avoidScale = approachingReserved ? 0.35 : 1.0;

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
              const seedAngle = (this.rosterId.charCodeAt(0) || 1) * 1.7;
              nx = Math.cos(seedAngle);
              ny = Math.sin(seedAngle);
            } else {
              nx = rx / d;
              ny = ry / d;
            }

            const closeness = (DOG_AVOID_RADIUS - d) / DOG_AVOID_RADIUS;
            const repel = closeness * 1.15 * avoidScale;
            avoidX += nx * repel;
            avoidY += ny * repel;

            // Add subtle tangential sidestep when another dog is ahead so pups veer past cleanly
            const aheadDot = moveX * (-nx) + moveY * (-ny);
            if (aheadDot > -0.15) {
              const sideSign = this.rosterId < other.rosterId ? 1 : -1;
              const tangent = closeness * 0.68 * avoidScale;
              avoidX += -ny * sideSign * tangent;
              avoidY += nx * sideSign * tangent;
            }
          }

          let steerX = moveX + avoidX;
          let steerY = moveY + avoidY;
          const steerLen = Math.hypot(steerX, steerY);
          if (steerLen > 1e-4) {
            steerX /= steerLen;
            steerY /= steerLen;
          } else {
            steerX = moveX;
            steerY = moveY;
          }

          const gridSize = getGridSize();
          const edgeMargin = this.slideTarget ? 0.2 : 0.32;
          const step = Math.min(Math.max(sDist, 0.05), walkSpeed * dt);
          const prevGx = this.gx;
          const prevGy = this.gy;

          const tryGx = Math.max(edgeMargin, Math.min(gridSize - edgeMargin, prevGx + steerX * step));
          const tryGy = Math.max(edgeMargin, Math.min(gridSize - edgeMargin, prevGy + steerY * step));

          if (!isPointBlockedByObstacle(tryGx, tryGy, 0.02)) {
            this.gx = tryGx;
            this.gy = tryGy;
          } else {
            // Smooth wall-sliding along whichever axis stays clear of obstacles
            const slideX = Math.max(edgeMargin, Math.min(gridSize - edgeMargin, prevGx + steerX * step));
            const slideY = Math.max(edgeMargin, Math.min(gridSize - edgeMargin, prevGy + steerY * step));
            const xClear = !isPointBlockedByObstacle(slideX, prevGy, 0.02);
            const yClear = !isPointBlockedByObstacle(prevGx, slideY, 0.02);
            if (xClear && (!yClear || Math.abs(steerX) >= Math.abs(steerY))) {
              this.gx = slideX;
            } else if (yClear) {
              this.gy = slideY;
            } else {
              // Gentle tangential nudge around circular obstacles (fountains/trees)
              const tan1Gx = Math.max(edgeMargin, Math.min(gridSize - edgeMargin, prevGx - steerY * step));
              const tan1Gy = Math.max(edgeMargin, Math.min(gridSize - edgeMargin, prevGy + steerX * step));
              const tan2Gx = Math.max(edgeMargin, Math.min(gridSize - edgeMargin, prevGx + steerY * step));
              const tan2Gy = Math.max(edgeMargin, Math.min(gridSize - edgeMargin, prevGy - steerX * step));
              if (!isPointBlockedByObstacle(tan1Gx, tan1Gy, 0.02)) {
                this.gx = tan1Gx;
                this.gy = tan1Gy;
              } else if (!isPointBlockedByObstacle(tan2Gx, tan2Gy, 0.02)) {
                this.gx = tan2Gx;
                this.gy = tan2Gy;
              }
            }
          }

          // Hard safety invariant: never allow a walking dog inside any solid park obstacle
          if (isPointBlockedByObstacle(this.gx, this.gy, 0.015)) {
            const pushed = pushOutsideAllObstacles(this.gx, this.gy, 0.03);
            this.gx = pushed.gx;
            this.gy = pushed.gy;
          }

          // Gentle personal-space separation if still overlapping another non-sliding dog
          for (let i = 0; i < dogs.length; i++) {
            const other = dogs[i];
            if (other === this || other.state === 'SLIDE_CLIMB' || other.state === 'SLIDE_DOWN') continue;
            const rx = this.gx - other.gx;
            const ry = this.gy - other.gy;
            const d = Math.hypot(rx, ry);
            if (d < DOG_MIN_SEPARATION) {
              let ux = 0;
              let uy = 0;
              if (d < 1e-4) {
                const seedAngle = ((this.rosterId.charCodeAt(this.rosterId.length - 1) || 1) * 1.9);
                ux = Math.cos(seedAngle);
                uy = Math.sin(seedAngle);
              } else {
                ux = rx / d;
                uy = ry / d;
              }
              const push = Math.min(0.08, (DOG_MIN_SEPARATION - d) * 0.55);
              const candGx = Math.max(edgeMargin, Math.min(gridSize - edgeMargin, this.gx + ux * push));
              const candGy = Math.max(edgeMargin, Math.min(gridSize - edgeMargin, this.gy + uy * push));
              if (!isPointBlockedByObstacle(candGx, candGy, 0.02)) {
                this.gx = candGx;
                this.gy = candGy;
              }
            }
          }

          // Face the actual screen-space movement direction smoothly
          const prevScreen = gridToScreen(prevGx, prevGy);
          const nextScreen = gridToScreen(this.gx, this.gy);
          const screenDeltaX = nextScreen.x - prevScreen.x;
          if (Math.abs(screenDeltaX) > 0.35) {
            this.facingRight = screenDeltaX >= 0;
          }

          // Anti-stuck recovery: replan once if blocked, then pick a fresh reachable spot
          this.stuckTimer += dt;
          if (this.stuckTimer >= 0.65) {
            const progress = Math.hypot(this.gx - this.lastProgressGx, this.gy - this.lastProgressGy);
            this.lastProgressGx = this.gx;
            this.lastProgressGy = this.gy;
            this.stuckTimer = 0;

            if (progress < 0.07) {
              this.stuckCount += 1;
              if (this.stuckCount === 1) {
                if (!this.computeNavPath(true)) {
                  this.cancelSlide();
                  this.cancelDrink();
                  this.onReachToy = null;
                  this.pickNewTarget();
                }
              } else {
                this.cancelSlide();
                this.cancelDrink();
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
          this.timer = 0.6 + Math.random() * 1.2;
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

      const rawAmount = state.digPower * stats.boneYield * levelMult * cupMult * packDigMult * personalBoneMult;
      const amount = Math.max(1, Math.round(rawAmount * 10) / 10);
      const breakEvenBonus = this.isMagicDig ? 0 : applyTreatBreakEvenOnDig(amount);
      const magicYield = 1 + (this.isShiny ? SHINY_MAGIC_BONE_BONUS : 0);
      const boneValue = this.isMagicDig ? magicYield : Math.round((amount + breakEvenBonus) * 10) / 10;

      if (entry) {
        if (!this.isMagicDig) {
          entry.bonesEarned = (entry.bonesEarned || 0) + amount;
        }
        if (entry.level < MAX_DOG_LEVEL) {
          const baseXp = this.isMagicDig ? 2 : Math.max(1, Math.floor(amount));
          const xpTreatMult = getActiveXpBoostMult();
          const weatherXpMult = weatherMatch?.xpBonus ? 1 + weatherMatch.xpBonus : 1;
          const xpGain = Math.max(
            1,
            Math.round(baseXp * stats.quickLearner * xpTreatMult * weatherXpMult * (this.isMagicDig ? 2 : 1))
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
        addFloatingText(pos.x, pos.y - 46 * scale, '+1 ✨ Bonus!', '#ffeaa7');
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
      const isDrinking = this.state === 'DRINK';
      const isOnSlide = this.state === 'SLIDE_CLIMB' || this.state === 'SLIDE_DOWN';
      const effectiveFacingRight = isSleeping ? this.sleepFacingRight : this.facingRight;

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
          (isSleeping ? 22 : 24 + Math.sin(this.animPhase * 3) * 3) * shadowScaleX,
          (isSleeping ? 9.5 : 11) * shadowScaleY,
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
        c.ellipse(0, 4, (isSleeping ? 20 : 17) * shadowScaleX, (isSleeping ? 8.5 : 8) * shadowScaleY, 0, 0, Math.PI * 2);
        c.fill();
      }

      c.save();
      if (!effectiveFacingRight) {
        c.scale(-1, 1);
      }

      let feastJump = 0;
      if (state.feastAnimTimer > 0 && !isSleeping && !isOnSlide && !isDrinking) {
        feastJump = Math.abs(Math.sin(state.feastAnimTimer * Math.PI * 4)) * 14;
      }

      const petHop = this.petBounce > 0 ? Math.sin((this.petBounce / 0.45) * Math.PI) * 9 : 0;
      const sleepBreath = isSleeping ? Math.sin(this.animPhase) * 0.35 : 0;
      const bounce = isSleeping
        ? -4.2
        : isOnSlide
          ? this.slideElevation
          : isDrinking
            ? petHop
            : (this.state === 'WALK' ? Math.abs(Math.sin(this.animPhase)) * 3 : 0) + feastJump + petHop;
      const poseTilt = isSleeping
        ? 0
        : isOnSlide
          ? this.slideTilt
          : isDrinking
            ? 0.04
            : (this.state === 'DIG' ? 0.25 : 0);

      c.translate(0, -bounce);
      c.rotate(poseTilt);

      const legSwing = isSleeping || isDrinking
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
      const isJoyful = !isSleeping && !isDrinking && (this.petBounce > 0.05 || this.state === 'SLIDE_DOWN' || state.feastAnimTimer > 0);
      const showTongue = isDrinking
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
        isDrinking
      });

      c.restore();

      if (state.showNameTags) {
        const entry = this.getRosterEntry();
        const label = entry ? entry.name : (BREED_LABELS[this.breed] || this.breed);
        const baseTagY = isGiantBreed
          ? (isSleeping ? -25 : -42)
          : isToyBreed
            ? (isSleeping ? -20 : -32)
            : (isSleeping ? -22 : -36);
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
        <p>Your pack unearthed a golden vault chest overflowing with <strong>+${MAXED_TREASURE_JACKPOT_MAGIC.toLocaleString()} ✨ Magic Bones</strong>!</p>
      `;
      const claimBtn = document.createElement('button');
      claimBtn.type = 'button';
      claimBtn.className = 'action-btn';
      claimBtn.style.cssText = 'width: 100%; max-width: 240px; padding: 11px;';
      claimBtn.textContent = `Claim +${MAXED_TREASURE_JACKPOT_MAGIC.toLocaleString()} ✨`;
      claimBtn.addEventListener('click', () => {
        stopDraftTreasureAnimations();
        state.magicBones += MAXED_TREASURE_JACKPOT_MAGIC;
        state.isDraftingPerk = false;
        modal.style.display = 'none';
        sfx.shiny();
        addFloatingText(viewportW / 2, viewportH * 0.34, `+${MAXED_TREASURE_JACKPOT_MAGIC} ✨ Vault Jackpot!`, '#ffeaa7');
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

  function drawMiniSparkle(x: number, y: number, r: number, color: string, alpha: number): void {
    if (r <= 0.2 || alpha <= 0.02) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
    ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
    ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
    ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
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

      const isShiny = Math.random() < getEffectiveSpawnShinyOdds();
      const chosenColor = isShiny ? SHINY_PALETTES[Math.floor(Math.random() * SHINY_PALETTES.length)] : null;

      const entry = createRosterEntry(normBreed, isShiny, chosenColor);
      state.roster.push(entry);
      syncBreedCountsFromRoster();
      const spawnPos = hasGrandDoghousePlaced() ? { gx: 2.22, gy: 2.22 } : { gx: 2.18, gy: 1.92 };
      dogs.push(new Dog(spawnPos.gx, spawnPos.gy, entry.id, normBreed, isShiny, chosenColor));

      if (isShiny) {
        sfx.shiny();
      } else {
        sfx.upgrade();
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
      card.innerHTML = `
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
          <span class="btn-cost" id="cost${capBreed}">${breed.cost.toLocaleString()} 🦴</span>
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
      const addedDuration = Math.max(0, nextTimer - prevTimer);
      if (isBreakEvenTreatKey(treatKey) && addedDuration > 0) {
        if (!state.treatBreakEven) {
          state.treatBreakEven = createEmptyTreatBreakEven();
        }
        const naturalExtra = getTreatNaturalExtraForDuration(treatKey, addedDuration);
        if (naturalExtra < cost) {
          state.treatBreakEven[treatKey] = (state.treatBreakEven[treatKey] || 0) + cost;
        }
      }
      state[cfg.timerKey] = nextTimer;
      state[cfg.stackKey] = Math.min(TIMED_TREAT_MAX_STACKS, Math.max(1, Math.ceil(nextTimer / cfg.duration)));
      if (treatKey === 'feast') {
        state.feastAnimTimer = 1.5;
      }
      addPackHappiness(8);
      sfx.treat();
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
    if (cupNet > 0) {
      setRoiLine('roiTreatCup', `Est. +${cupNet.toLocaleString()} 🦴 profit per 90s`, 'positive');
    } else {
      setRoiLine('roiTreatCup', `Breaks even now | Profits at 667+ 🦴/min (${Math.round(cupBase).toLocaleString()}/m)`, 'caution');
    }

    const feastBase = getEstimatedPackRates({ feastActive: false }).bonesPerMin;
    const feastBuffed = getEstimatedPackRates({ feastActive: true }).bonesPerMin;
    const feastNet = Math.round((feastBuffed - feastBase) * (TREAT_CONFIG.treatFeast.duration / 60) - TREAT_CONFIG.treatFeast.baseCost);
    if (feastNet > 0) {
      setRoiLine('roiTreatFeast', `Est. +${feastNet.toLocaleString()} 🦴 profit per 90s`, 'positive');
    } else {
      setRoiLine('roiTreatFeast', `Breaks even now | Profits at 2,000+ 🦴/min (${Math.round(feastBase).toLocaleString()}/m)`, 'caution');
    }

    const baconBase = getEstimatedPackRates({ baconActive: false }).bonesPerMin;
    const baconBuffed = getEstimatedPackRates({ baconActive: true }).bonesPerMin;
    const baconNet = Math.round((baconBuffed - baconBase) * (TREAT_CONFIG.treatBacon.duration / 60) - TREAT_CONFIG.treatBacon.baseCost);
    if (baconNet > 0) {
      setRoiLine('roiTreatBacon', `Est. +${baconNet.toLocaleString()} 🦴 profit per 60s | +35% pace & drops`, 'positive');
    } else {
      setRoiLine('roiTreatBacon', `Breaks even now (+35% pace) | Profits at 4,255+ 🦴/min (${Math.round(baconBase).toLocaleString()}/m)`, 'caution');
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
      const totalRatio = getTotalOfflineRate();
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
        costEl.textContent = `${state.costs[breed].toLocaleString()} 🦴`;
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
          tag.textContent = isActive
            ? 'Active'
            : (isUnlocked ? 'Use' : `${MANOR_COLOR_COST} ✨`);
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
        ? `MAX (+${Math.round((MAX_IDLE_MULTIPLIER - BASE_IDLE_MULTIPLIER) * 100)}%)`
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
      if (decorBonuses.magicAdd > 0) parts.push(`+${formatPctStat(decorBonuses.magicAdd)}% ✨`);
      if (decorBonuses.payoutMult > 1) parts.push(`+${formatPctStat(decorBonuses.payoutMult - 1)}% 🦴`);
      if (decorBonuses.paceMult > 1) parts.push(`+${formatPctStat(decorBonuses.paceMult - 1)}% Pace`);
      decorBonusEl.textContent = parts.length > 0 ? parts.join(' | ') : 'None yet';
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
      if (packTraits.packBoneAura > 0) auraParts.push(`+${formatPctStat(packTraits.packBoneAura)}% 🦴`);
      if (packTraits.packPaceAura > 0) auraParts.push(`+${formatPctStat(packTraits.packPaceAura)}% Pace`);
      if (packTraits.packXpAura > 0) auraParts.push(`+${formatPctStat(packTraits.packXpAura)}% XP`);
      if (packTraits.packMagicAura > 0) auraParts.push(`+${formatPctStat(packTraits.packMagicAura)}% ✨`);
      if (packTraits.packGrowthAura > 0) auraParts.push(`+${formatPctStat(packTraits.packGrowthAura)}% Growth`);
      if (packTraits.packTreasureAura > 0) auraParts.push(`+${formatPctStat(packTraits.packTreasureAura)}% Treasure`);
      if (packTraits.cozyFloorAdd > 0) auraParts.push(`+${packTraits.cozyFloorAdd} Cozy`);
      if (packTraits.moodDecayMult < 1) auraParts.push(`-${formatPctStat(1 - packTraits.moodDecayMult)}% Mood Decay`);
      if (packTraits.offlineBonus > 0) auraParts.push(`+${formatPctStat(packTraits.offlineBonus)}% Offline`);
      packAurasEl.textContent = auraParts.length > 0 ? auraParts.join(' | ') : 'None active';
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
      if (activeRerollDog && rerollRulesText) {
        rerollRulesText.textContent = formatRerollRulesText(activeRerollDog);
      }
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

    const nowMs = Date.now();
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
          // Gentle live-park cooldown (half the away rate) so pups stay happy while you're hanging out
          const decayableSpan = Math.max(0, HAPPINESS_MAX - floor);
          const liveCoolPerSec = (decayableSpan / (HAPPINESS_AWAY_FULL_DECAY_HOURS * 3600)) * 0.5 * getPackTraitBonuses().moodDecayMult;
          state.packHappiness = Math.max(floor, cur - liveCoolPerSec * dt);
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

      const applyToyPlayBonuses = (walker: Dog): void => {
        const trait = getBreedTrait(walker.breed);
        addPackHappiness(1.5 + (trait.playMoodBonus || 0));
        if (trait.playXpMult && trait.playXpMult > 1) {
          const entry = walker.getRosterEntry();
          if (entry && entry.level < MAX_DOG_LEVEL) {
            const stats = getEffectiveBreedStats(entry, walker.breed);
            const xpGain = Math.max(2, Math.round(2 * trait.playXpMult * stats.quickLearner * getActiveXpBoostMult()));
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
            const eligible = dogs.filter(d => d.state !== 'SLIDE_CLIMB' && d.state !== 'SLIDE_DOWN' && d.state !== 'DRINK' && !d.slideTarget && !d.drinkTarget);
            if (eligible.length > 0) {
              const walker = eligible[Math.floor(Math.random() * eligible.length)];
              const safeBallSpot = pushOutsideAllObstacles(tennisBall.gx, tennisBall.gy, 0.08);
              tennisBall.gx = safeBallSpot.gx;
              tennisBall.gy = safeBallSpot.gy;
              if (findNavPath(walker.gx, walker.gy, safeBallSpot.gx, safeBallSpot.gy) !== null) {
                walker.cancelSlide();
                walker.cancelDrink();
                walker.setWalkTarget(safeBallSpot.gx, safeBallSpot.gy);
                walker.state = 'WALK';
                walker.onReachToy = () => {
                  sfx.squeak();
                  applyToyPlayBonuses(walker);
                  tennisBall.isRolling = true;
                  const gridSize = getGridSize();
                  const safeBall = pushOutsideAllObstacles(
                    Math.max(0.7, Math.min(gridSize - 0.7, tennisBall.gx + (Math.random() - 0.5) * 3.5)),
                    Math.max(0.7, Math.min(gridSize - 0.7, tennisBall.gy + (Math.random() - 0.5) * 3.5)),
                    0.1
                  );
                  tennisBall.targetGx = safeBall.gx;
                  tennisBall.targetGy = safeBall.gy;
                };
              }
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
            const eligible = dogs.filter(d => d.state !== 'SLIDE_CLIMB' && d.state !== 'SLIDE_DOWN' && d.state !== 'DRINK' && !d.slideTarget && !d.drinkTarget);
            if (eligible.length > 0) {
              const walker = eligible[Math.floor(Math.random() * eligible.length)];
              const safeFrisbeeSpot = pushOutsideAllObstacles(frisbee.gx, frisbee.gy, 0.08);
              frisbee.gx = safeFrisbeeSpot.gx;
              frisbee.gy = safeFrisbeeSpot.gy;
              if (findNavPath(walker.gx, walker.gy, safeFrisbeeSpot.gx, safeFrisbeeSpot.gy) !== null) {
                walker.cancelSlide();
                walker.cancelDrink();
                walker.setWalkTarget(safeFrisbeeSpot.gx, safeFrisbeeSpot.gy);
                walker.state = 'WALK';
                walker.onReachToy = () => {
                  sfx.shiny();
                  applyToyPlayBonuses(walker);
                  frisbee.isMoving = true;
                  const gridSize = getGridSize();
                  const safeFrisbee = pushOutsideAllObstacles(
                    Math.max(0.7, Math.min(gridSize - 0.7, frisbee.gx + (Math.random() - 0.5) * 3.5)),
                    Math.max(0.7, Math.min(gridSize - 0.7, frisbee.gy + (Math.random() - 0.5) * 3.5)),
                    0.1
                  );
                  frisbee.targetGx = safeFrisbee.gx;
                  frisbee.targetGy = safeFrisbee.gy;
                };
              }
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
            const eligible = dogs.filter(d => d.state !== 'SLIDE_CLIMB' && d.state !== 'SLIDE_DOWN' && d.state !== 'DRINK' && !d.slideTarget && !d.drinkTarget);
            if (eligible.length > 0) {
              const walker = eligible[Math.floor(Math.random() * eligible.length)];
              const safeDuckSpot = pushOutsideAllObstacles(duck.gx, duck.gy, 0.08);
              duck.gx = safeDuckSpot.gx;
              duck.gy = safeDuckSpot.gy;
              if (findNavPath(walker.gx, walker.gy, safeDuckSpot.gx, safeDuckSpot.gy) !== null) {
                walker.cancelSlide();
                walker.cancelDrink();
                walker.setWalkTarget(safeDuckSpot.gx, safeDuckSpot.gy);
                walker.state = 'WALK';
                walker.onReachToy = () => {
                  sfx.quack();
                  applyToyPlayBonuses(walker);
                  duck.isMoved = true;
                  const gridSize = getGridSize();
                  const safeDuck = pushOutsideAllObstacles(
                    Math.max(0.7, Math.min(gridSize - 0.7, duck.gx + (Math.random() - 0.5) * 2.5)),
                    Math.max(0.7, Math.min(gridSize - 0.7, duck.gy + (Math.random() - 0.5) * 2.5)),
                    0.1
                  );
                  duck.targetGx = safeDuck.gx;
                  duck.targetGy = safeDuck.gy;
                };
              }
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

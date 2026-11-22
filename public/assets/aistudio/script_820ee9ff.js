const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const MAX_DOGS = 6;
const MAX_DOG_LEVEL = 100;
const MAX_BONES = 250000;
const MAX_OFFLINE_SECONDS = 604800; // 7 days
const AWAY_MIN_SECONDS = 15;
const RETIRE_REFUND_RATE = 0.25; // 25% of retired dog's dug bones (no waiting period)
const LEVEL_BONUS_PER_LEVEL = 0.0015; // +0.15% per level above Lv.1
const DIG_MULT_BASE = 1.0; // Base dig multiplier before dug-bone scaling
const DIG_MULT_SQRT_SCALE = 0.0018; // Controlled sqrt curve from dug bones

const BASE_IDLE_MULTIPLIER = 0.10; // Starting 10% offline dig yield
const DUCK_IDLE_STEP = 0.020;      // +2.0% offline dig yield per Rubber Duck
const MAX_IDLE_MULTIPLIER = 0.60;  // Max 60% offline dig yield with Rubber Ducks

const BASE_DIG_POWER = 1;          // Starting 1 base dig power
const MAX_DIG_POWER = 25;          // Max permanent digPower from Tennis Ball
const TENNIS_BALL_FLAT_GAIN = 1;   // +1 digPower per Tennis Ball

const BASE_SPEED_MULTIPLIER = 1;   // Starting 1.00x (100%) dig speed multiplier
const FRISBEE_SPEED_STEP = 1.03;   // +3% multiplicative per Frisbee
const MAX_SPEED_MULTIPLIER = 1.80; // Max 1.80x speedMultiplier from Frisbees

const BONUS_PAYOUT_MAX = 0.25;  // Up to +0.25 Bone Yield
const BONUS_SCALING_MAX = 0.16; // Up to +0.16 Pack Growth
const BONUS_XP_MAX = 0.15;      // Up to +0.15 Quick Learner
const TIMED_TREAT_MAX_STACKS = 5;

const TOY_CONFIG = {
  toyBones: { baseCost: 35,  costMult: 1.26, priceCap: 10000 },
  toyIdle:  { baseCost: 250, costMult: 1.30, priceCap: 15000 },
  toySpeed: { baseCost: 500, costMult: 1.32, priceCap: 20000 }
};

const TREAT_CONFIG = {
  treatXp:    { baseCost: 120, costMult: 1.25, priceCap: 6000,  duration: 20, perStackBonus: 0.08 },
  treatKong:  { baseCost: 180, costMult: 1.28, priceCap: 9000,  duration: 15, perStackBonus: 0.00 },
  treatCup:   { baseCost: 260, costMult: 1.30, priceCap: 12000, duration: 60, perStackBonus: 0.08 },
  treatFeast: { baseCost: 380, costMult: 1.32, priceCap: 15000, duration: 60, perStackBonus: 0.10 },
  treatBacon: { baseCost: 520, costMult: 1.35, priceCap: 18000, duration: 60, perStackBonus: 0.12 }
};

const SPAWN_SHINY_ODDS = 1 / 650;
const REROLL_SHINY_ODDS = 1 / 1300;
const REROLL_STEP_COST = 25;
const SHINY_PALETTES = ['#f1c40f', '#e67e22', '#e84393', '#00cec9', '#fd79a8'];

const PARK_BARK_MIN_COOLDOWN = 4.2;   // Park-wide minimum seconds between any barks
const PARK_BARK_MAX_COOLDOWN = 7.8;   // Park-wide maximum seconds between barks
const DOG_BARK_MIN_COOLDOWN = 11.0;   // Per-dog minimum seconds between barks
const DOG_BARK_MAX_COOLDOWN = 20.0;   // Per-dog maximum seconds between barks
const BARK_TEXT_DURATION = 0.65;      // Fast-fading bark text duration in seconds

const BARK_WORDS = ['Woof!', 'Arf!', 'Bork!', 'Yip!'];

const BREED_LABELS = {
  aussie: 'Aussie',
  beagle: 'Beagle',
  collie: 'Collie',
  husky: 'Husky',
  golden: 'Golden',
  shepherd: 'Shepherd',
  shiba: 'Shiba',
  labrador: 'Labrador'
};

const DEFAULT_PUP_NAMES = [
  'Biscuit', 'Scout', 'Max', 'Rover', 'Waffles', 'Buddy',
  'Maple', 'Ziggy', 'Otis', 'Penny', 'Bramble', 'Toby',
  'Sunny', 'Nora', 'Rosie', 'Finn',
  'clover', 'Milo', 'Daisy', 'Charlie', 'Luna', 'Bear',
  'Hazel', 'Moose', 'Olive', 'Pip', 'Pippa', 'Jasper',
  'Willow', 'Archie', 'Ruby', 'Theo', 'Juniper', 'Gus',
  'Poppy', 'Barnaby', 'Peaches', 'Simba', 'Ginger', 'Hank',
  'Bowie', 'Coco', 'Louie', 'Fern', 'Ollie', 'Sadie',
  'Bandit', 'Mochi', 'Koda', 'Nova', 'Rusty', 'Zelda',
  'bagel', 'Sprout', 'Pepper', 'Casper', 'Tilly', 'Felix',
  'Honey', 'Buster', 'Dottie', 'Rocco', 'Cleo', 'Marley',
  'Aspen', 'Bennie'
].map((n) => n.charAt(0).toUpperCase() + n.slice(1));

let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(freq = 440, type = 'sine', duration = 0.15, gainVal = 0.05) {
  if (!audioCtx) return;
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
  } catch (e) {
    // Ignore restrictions
  }
}

function playBarkSound(breed = 'aussie') {
  if (!audioCtx) return;
  try {
    const pitchMap = {
      aussie: 430,
      beagle: 510,
      collie: 470,
      husky: 540,
      golden: 390,
      shepherd: 350,
      shiba: 580,
      labrador: 370
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
  } catch (e) {
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
  bark: (breed) => playBarkSound(breed)
};

const BREED_CONFIG = {
  aussie:   { rank: 1, cost: 20,    costMult: 1.20, priceCap: 1200,   walkMult: 1.10, digSec: 1.85, payoutMult: 0.95, scalingMult: 1.00, xpMult: 1.00, magicBonus: 0.000, treasureChance: 0.00008 },
  beagle:   { rank: 2, cost: 120,   costMult: 1.22, priceCap: 3000,   walkMult: 1.00, digSec: 1.75, payoutMult: 1.35, scalingMult: 1.12, xpMult: 1.05, magicBonus: 0.010, treasureChance: 0.00008 },
  collie:   { rank: 3, cost: 340,   costMult: 1.24, priceCap: 6500,   walkMult: 1.20, digSec: 1.35, payoutMult: 1.05, scalingMult: 1.10, xpMult: 1.10, magicBonus: 0.015, treasureChance: 0.00008 },
  husky:    { rank: 4, cost: 850,   costMult: 1.26, priceCap: 13000,  walkMult: 1.25, digSec: 1.65, payoutMult: 1.15, scalingMult: 1.15, xpMult: 1.15, magicBonus: 0.020, treasureChance: 0.00008 },
  golden:   { rank: 5, cost: 2100,  costMult: 1.28, priceCap: 26000,  walkMult: 1.05, digSec: 1.75, payoutMult: 1.65, scalingMult: 1.20, xpMult: 1.08, magicBonus: 0.030, treasureChance: 0.00008 },
  shepherd: { rank: 6, cost: 4800,  costMult: 1.30, priceCap: 48000,  walkMult: 1.15, digSec: 1.65, payoutMult: 1.25, scalingMult: 1.25, xpMult: 1.12, magicBonus: 0.035, treasureChance: 0.00008 },
  shiba:    { rank: 7, cost: 10500, costMult: 1.32, priceCap: 80000,  walkMult: 1.10, digSec: 1.70, payoutMult: 1.20, scalingMult: 1.20, xpMult: 1.12, magicBonus: 0.055, treasureChance: 0.00064 },
  labrador: { rank: 8, cost: 22000, costMult: 1.34, priceCap: 125000, walkMult: 1.20, digSec: 1.50, payoutMult: 1.80, scalingMult: 1.32, xpMult: 1.20, magicBonus: 0.050, treasureChance: 0.00012 }
};

const PERK_POOL = [
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

function computeNextCappedCost(currentCost, mult, cap) {
  const safeCost = Math.max(1, Number(currentCost) || 1);
  if (typeof cap === 'number' && cap > 0) {
    if (safeCost >= cap) return cap;
    return Math.min(cap, Math.floor(safeCost * mult));
  }
  return Math.floor(safeCost * mult);
}

function generateDefaultName(breed, indexNum) {
  const totalNames = DEFAULT_PUP_NAMES.length;
  const safeIndex = (((Math.max(1, Number(indexNum) || 1) - 1) % totalNames) + totalNames) % totalNames;
  return DEFAULT_PUP_NAMES[safeIndex].trim();
}

function getNextLoopingPupName(breed) {
  const totalNames = DEFAULT_PUP_NAMES.length;
  if (
    typeof state.nextNameIndex !== 'number' ||
    Number.isNaN(state.nextNameIndex) ||
    !Number.isFinite(state.nextNameIndex) ||
    state.nextNameIndex < 0
  ) {
    state.nextNameIndex = Array.isArray(state.roster) ? state.roster.length % totalNames : 0;
  }

  const startIndex = Math.floor(state.nextNameIndex) % totalNames;
  const activeNames = new Set(
    (Array.isArray(state.roster) ? state.roster : [])
      .map(d => (typeof d.name === 'string' ? d.name.trim().toLowerCase() : ''))
      .filter(Boolean)
  );

  let chosen = null;
  for (let offset = 0; offset < totalNames; offset++) {
    const idx = (startIndex + offset) % totalNames;
    const candidate = DEFAULT_PUP_NAMES[idx].trim();
    if (!activeNames.has(candidate.toLowerCase())) {
      chosen = candidate;
      state.nextNameIndex = (idx + 1) % totalNames;
      break;
    }
  }

  if (!chosen) {
    chosen = DEFAULT_PUP_NAMES[startIndex].trim();
    state.nextNameIndex = (startIndex + 1) % totalNames;
  }

  return chosen || (BREED_LABELS[breed] || 'Pup');
}

function rollStarterShiny() {
  const isShiny = Math.random() < SPAWN_SHINY_ODDS;
  const shinyColor = isShiny
    ? SHINY_PALETTES[Math.floor(Math.random() * SHINY_PALETTES.length)]
    : null;
  return { isShiny, shinyColor };
}

function rollDogBonusStats() {
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

function getRollRating(entryOrRoll) {
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

function getDogRerollCount(entry) {
  if (!entry || typeof entry.rerollCount !== 'number' || Number.isNaN(entry.rerollCount)) {
    return 0;
  }
  return Math.max(0, Math.floor(entry.rerollCount));
}

function getRerollCost(entryOrDogId = null) {
  const entry = typeof entryOrDogId === 'string'
    ? state.roster.find(d => d.id === entryOrDogId)
    : entryOrDogId;
  const dogCount = getDogRerollCount(entry);
  return REROLL_STEP_COST * (dogCount + 1);
}

function getEffectiveBreedStats(entry, fallbackBreed = 'aussie') {
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

function createRosterEntry(breed, isShiny = false, shinyColor = null, customName = null) {
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

function getXpNeededForLevel(level) {
  return Math.floor(25 * Math.pow(1.2, Math.max(0, level - 1)));
}

function getDogLevelBonusMult(entry) {
  const lvl = entry && entry.level ? entry.level : 1;
  return 1 + Math.max(0, lvl - 1) * LEVEL_BONUS_PER_LEVEL;
}

function getActiveXpBoostMult() {
  const stacks = getTreatStacks('xp');
  if (state.xpTreatTimer <= 0 || stacks <= 0) return 1;
  return 1 + stacks * TREAT_CONFIG.treatXp.perStackBonus;
}

function getActiveCupMult() {
  const stacks = getTreatStacks('cup');
  if (state.pupCupTimer <= 0 || stacks <= 0) return 1;
  return 1 + stacks * TREAT_CONFIG.treatCup.perStackBonus;
}

function getActiveFeastAndBaconMult() {
  let mult = 1;
  const feastStacks = getTreatStacks('feast');
  if (state.feastTimer > 0 && feastStacks > 0) {
    mult *= 1 + feastStacks * TREAT_CONFIG.treatFeast.perStackBonus;
  }
  const baconStacks = getTreatStacks('bacon');
  if (state.baconTimer > 0 && baconStacks > 0) {
    mult *= 1 + baconStacks * TREAT_CONFIG.treatBacon.perStackBonus;
  }
  return mult;
}

let state = {
  bones: 0,
  lifetimeBones: 0,
  magicBones: 0,
  nextNameIndex: 1,
  dogs: {
    aussie: 1, beagle: 0, collie: 0, husky: 0,
    golden: 0, shepherd: 0, shiba: 0, labrador: 0
  },
  shinyDogs: [],
  roster: [],
  perks: [],
  decorInventory: { tree: 0, flowers: 0, fountain: 0 },
  placedDecorations: [],
  isPlacingDecor: false,
  activeDecorType: null,
  showNameTags: true,
  cameraAngle: 0,
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

  costs: {},
  lastSaveTime: Date.now()
};

function initDefaultCosts() {
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

let tennisBall = { gx: 3.5, gy: 3.5, targetGx: 3.5, targetGy: 3.5, isRolling: false, timer: 6.0, bouncePhase: 0 };
let frisbee = { gx: 2.0, gy: 5.0, targetGx: 2.0, targetGy: 5.0, isMoving: false, timer: 7.5 };
let duck = { gx: 5.0, gy: 5.0, targetGx: 5.0, targetGy: 5.0, isMoved: false, timer: 5.5, quackPhase: 0 };

let parkBarkCooldown = PARK_BARK_MIN_COOLDOWN + Math.random() * (PARK_BARK_MAX_COOLDOWN - PARK_BARK_MIN_COOLDOWN);
const barkPopups = [];

let pendingRetireDogId = null;
let pendingRerollDogId = null;
let queuedAwayProgress = null;

const TREAT_STACK_MAP = {
  xp:    { timerKey: 'xpTreatTimer', stackKey: 'xpTreatStacks', duration: TREAT_CONFIG.treatXp.duration },
  kong:  { timerKey: 'kongTimer',    stackKey: 'kongStacks',    duration: TREAT_CONFIG.treatKong.duration },
  cup:   { timerKey: 'pupCupTimer',  stackKey: 'pupCupStacks',  duration: TREAT_CONFIG.treatCup.duration },
  feast: { timerKey: 'feastTimer',   stackKey: 'feastStacks',   duration: TREAT_CONFIG.treatFeast.duration },
  bacon: { timerKey: 'baconTimer',   stackKey: 'baconStacks',   duration: TREAT_CONFIG.treatBacon.duration }
};

function getTreatStacks(treatKey) {
  const cfg = TREAT_STACK_MAP[treatKey];
  if (!cfg) return 0;
  const raw = typeof state[cfg.stackKey] === 'number' && !Number.isNaN(state[cfg.stackKey])
    ? Math.max(0, Math.floor(state[cfg.stackKey]))
    : 0;
  return Math.min(TIMED_TREAT_MAX_STACKS, raw);
}

function showBoneCapCongratsModal() {
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

function triggerBoneCapMessageOnce() {
  if (!state.boneCapEverShown) {
    state.boneCapEverShown = true;
    state.boneCapReachedNotified = true;
    showBoneCapCongratsModal();
  }
}

function awardRetirementBones(amount) {
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

function addRegularBones(rawAmount) {
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

function addMagicBones(rawAmount) {
  const amount = Math.max(0, Number(rawAmount) || 0);
  if (amount <= 0) return 0;
  if (typeof state.lifetimeBones !== 'number' || Number.isNaN(state.lifetimeBones)) {
    state.lifetimeBones = 0;
  }
  state.magicBones = (Number(state.magicBones) || 0) + amount;
  state.lifetimeBones += amount;
  return amount;
}

function spendRegularBones(cost) {
  const amt = Math.max(0, Number(cost) || 0);
  state.bones = Math.max(0, (Number(state.bones) || 0) - amt);
  if (state.bones < MAX_BONES) {
    state.boneCapReachedNotified = false;
  }
}

function syncBreedCountsFromRoster() {
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

function getTotalDogs() {
  return state.roster.length;
}

function getPerkMultipliers() {
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

function getDogDugScaling(entry) {
  const dug = entry && entry.bonesEarned ? entry.bonesEarned : 0;
  if (dug <= 0) return 0;
  const stats = getEffectiveBreedStats(entry);
  return Math.sqrt(dug) * DIG_MULT_SQRT_SCALE * stats.packGrowth * getDogLevelBonusMult(entry);
}

function getDigMultiplier(entry = null) {
  let dugSum = 0;
  if (entry) {
    dugSum = getDogDugScaling(entry);
  } else {
    state.roster.forEach(r => {
      dugSum += getDogDugScaling(r);
    });
  }

  const { boneMult, workBonus } = getPerkMultipliers();
  const treatDigMult = getActiveFeastAndBaconMult();
  return (DIG_MULT_BASE + dugSum) * state.speedMultiplier * treatDigMult * workBonus * boneMult;
}

function getAverageBonesPerDig() {
  if (!state.roster || state.roster.length === 0) return state.digPower;
  const cupMult = getActiveCupMult();
  const { boneMult, workBonus } = getPerkMultipliers();
  const treatDigMult = getActiveFeastAndBaconMult();

  let total = 0;
  state.roster.forEach(entry => {
    const stats = getEffectiveBreedStats(entry);
    const perDogMult = (DIG_MULT_BASE + getDogDugScaling(entry)) * state.speedMultiplier * treatDigMult * workBonus * boneMult;
    const raw = state.digPower * stats.boneYield * cupMult * perDogMult;
    total += Math.max(1, Math.round(raw * 10) / 10);
  });

  return total / state.roster.length;
}

function estimateOfflineDigs(seconds) {
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

function rollOfflineTreasure() {
  if (!Array.isArray(PERK_POOL) || PERK_POOL.length === 0) return null;
  const shuffled = [...PERK_POOL].sort(() => 0.5 - Math.random());
  const rolledThree = shuffled.slice(0, Math.min(3, shuffled.length));
  const chosenPerk = rolledThree[Math.floor(Math.random() * rolledThree.length)];
  if (!chosenPerk) return null;

  const perkCopy = { ...chosenPerk };
  state.perks.push(perkCopy);
  return perkCopy;
}

function isModalCurrentlyOpen(modalId) {
  const el = document.getElementById(modalId);
  if (!el) return false;
  const styleDisplay = el.style.display;
  if (styleDisplay && styleDisplay !== 'none') return true;
  return window.getComputedStyle(el).display !== 'none';
}

function flushQueuedAwayProgressIfReady() {
  if (!queuedAwayProgress) return;
  if (state.isDraftingPerk || isModalCurrentlyOpen('perkModal') || isModalCurrentlyOpen('offlineModal')) {
    return;
  }
  const { actualEarned, estimatedDigs, foundTreasure } = queuedAwayProgress;
  queuedAwayProgress = null;
  updateUI();
  showOfflineModal(actualEarned, estimatedDigs, foundTreasure);
}

/**
 * Single source of truth for away-time rewards: computes reward from elapsed seconds
 * between `lastSaveTime` and `now`, immediately advances `state.lastSaveTime = now`,
 * and persists so subsequent events never re-measure the same interval.
 */
function settleAwayProgressSinceLastSave(now = Date.now()) {
  if (typeof state.lastSaveTime !== 'number' || Number.isNaN(state.lastSaveTime)) {
    state.lastSaveTime = now;
    return false;
  }

  const rawElapsedSeconds = (now - state.lastSaveTime) / 1000;
  // Advance checkpoint immediately so this exact window cannot be settled twice
  state.lastSaveTime = now;

  if (rawElapsedSeconds <= AWAY_MIN_SECONDS) {
    return false;
  }

  const effectiveSeconds = Math.min(rawElapsedSeconds, MAX_OFFLINE_SECONDS);
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

function rebuildCanvasDogsFromRoster() {
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

function normalizeBreedKey(breed) {
  if (breed === 'dalmatian') return 'labrador';
  return BREED_CONFIG[breed] ? breed : 'aussie';
}

function loadGame() {
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
      if (typeof state.cameraAngle !== 'number' || Number.isNaN(state.cameraAngle)) {
        state.cameraAngle = 0;
      }
      if (typeof state.xpTreatTimer !== 'number' || Number.isNaN(state.xpTreatTimer)) {
        state.xpTreatTimer = 0;
      }
      if (typeof state.feastTimer !== 'number' || Number.isNaN(state.feastTimer)) {
        state.feastTimer = 0;
      }
      ['kongStacks', 'baconStacks', 'pupCupStacks', 'xpTreatStacks', 'feastStacks'].forEach(sk => {
        if (typeof state[sk] !== 'number' || Number.isNaN(state[sk]) || state[sk] < 0) {
          state[sk] = 0;
        } else {
          state[sk] = Math.min(TIMED_TREAT_MAX_STACKS, Math.floor(state[sk]));
        }
      });
      if (!state.shinyDogs) state.shinyDogs = [];
      if (!state.perks) state.perks = [];
      if (!state.decorInventory) state.decorInventory = { tree: 0, flowers: 0, fountain: 0 };
      if (!state.placedDecorations) state.placedDecorations = [];
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
        if (!state.costs[tr]) state.costs[tr] = TREAT_CONFIG[tr].baseCost;
        else state.costs[tr] = Math.min(TREAT_CONFIG[tr].priceCap, state.costs[tr]);
      });
    } catch (e) {
      console.error('Failed to load save data, resetting save', e);
      localStorage.removeItem('pupperpark_save');
    }
  }

  if (!Array.isArray(state.roster) || state.roster.length === 0) {
    state.roster = [];
    Object.keys(state.dogs || {}).forEach(rawBreed => {
      const breed = normalizeBreedKey(rawBreed);
      const count = state.dogs[rawBreed] || 0;
      for (let i = 0; i < count; i++) {
        state.roster.push(createRosterEntry(breed, false, null));
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
let pendingSaveTimeout = null;
let lastWrittenSaveAt = 0;

function saveGameAt(timestampMs = Date.now()) {
  state.cameraAngle = cameraAngle;
  state.lastSaveTime = timestampMs;
  lastWrittenSaveAt = timestampMs;
  if (pendingSaveTimeout) {
    clearTimeout(pendingSaveTimeout);
    pendingSaveTimeout = null;
  }
  try {
    localStorage.setItem('pupperpark_save', JSON.stringify(state));
  } catch (e) {
    // Ignore storage quota/restriction errors
  }
}

function saveGame() {
  saveGameAt(Date.now());
}

function requestSave() {
  const now = Date.now();
  state.cameraAngle = cameraAngle;
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

document.addEventListener('visibilitychange', () => {
  const now = Date.now();
  if (document.hidden) {
    // Checkpoint departure time once when hiding
    saveGameAt(now);
  } else {
    lastTime = performance.now();
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

function showOfflineModal(earned, estimatedDigs = 0, foundTreasure = null) {
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

document.getElementById('btnCloseOffline').addEventListener('click', () => {
  document.getElementById('offlineModal').style.display = 'none';
  flushQueuedAwayProgressIfReady();
});

const gameModal = document.getElementById('gameModal');
const drawerWindow = document.getElementById('drawerWindow');
const drawerHandle = document.getElementById('drawerHandle');

if (gameModal) {
  gameModal.style.display = 'none';
}

document.getElementById('btnOpenMenu').addEventListener('click', () => {
  initAudio();
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

function closeMenu() {
  if (gameModal) {
    gameModal.style.display = 'none';
  }
}

document.getElementById('btnCloseMenu').addEventListener('click', closeMenu);

let drawerStartY = 0;
let drawerCurrentY = 0;
let isDrawerDragging = false;

drawerHandle.addEventListener('pointerdown', (e) => {
  isDrawerDragging = true;
  drawerStartY = e.clientY;
  drawerWindow?.classList.add('is-dragging');
  try {
    drawerHandle.setPointerCapture(e.pointerId);
  } catch (err) {
    // Ignore if pointer capture isn't supported
  }
});

drawerHandle.addEventListener('pointermove', (e) => {
  if (!isDrawerDragging) return;
  drawerCurrentY = e.clientY - drawerStartY;
  if (drawerCurrentY > 0 && drawerWindow) {
    drawerWindow.style.transform = `translateY(${drawerCurrentY}px)`;
  }
});

function finishDrawerDrag(e) {
  if (!isDrawerDragging) return;
  isDrawerDragging = false;
  drawerWindow?.classList.remove('is-dragging');
  try {
    drawerHandle.releasePointerCapture(e.pointerId);
  } catch (err) {
    // Ignore if pointer capture isn't supported
  }

  if (drawerCurrentY > 80) {
    closeMenu();
  }
  if (drawerWindow) {
    drawerWindow.style.transform = 'translateY(0)';
  }
  drawerCurrentY = 0;
}

drawerHandle.addEventListener('pointerup', finishDrawerDrag);
drawerHandle.addEventListener('pointercancel', finishDrawerDrag);

const tabBtns = document.querySelectorAll('.tab-btn');
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    updateUI();
    if (btn.dataset.tab === 'tab-roster') {
      renderRosterTab();
    }
  });
});

function toggleFavoriteDog(dogId) {
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

// Reroll Dog Traits & Stats Modal Handlers
const rerollModal = document.getElementById('rerollModal');
const rerollDogSummary = document.getElementById('rerollDogSummary');
const rerollCurrentStats = document.getElementById('rerollCurrentStats');
const rerollRulesText = document.getElementById('rerollRulesText');
const rerollResultBanner = document.getElementById('rerollResultBanner');
const rerollCostLabel = document.getElementById('rerollCostLabel');
const btnConfirmReroll = document.getElementById('btnConfirmReroll');
const btnCloseRerollModal = document.getElementById('btnCloseRerollModal');

function renderRerollModalContent(dogId, resultInfo = null) {
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
      <span class="reroll-meta-pill">${breedName} • Lv. ${entry.level}</span>
      <span class="reroll-meta-pill ${entry.isShiny ? 'is-shiny' : ''}">${entry.isShiny ? '✨ Shiny' : 'Standard Coat'}</span>
    `;
  }

  if (rerollCurrentStats) {
    rerollCurrentStats.innerHTML = `
      <div class="reroll-stat-line"><span>Roll Grade:</span><strong>${stats.rollGrade}</strong></div>
      <div class="reroll-stat-line"><span>Bone Yield Bonus:</span><strong>+${stats.bonusPayout.toFixed(2)} (${stats.boneYield.toFixed(2)}x)</strong></div>
      <div class="reroll-stat-line"><span>Pack Growth Bonus:</span><strong>+${stats.bonusScaling.toFixed(2)} (${stats.packGrowth.toFixed(2)}x)</strong></div>
      <div class="reroll-stat-line"><span>Quick Learner Bonus:</span><strong>+${stats.bonusXp.toFixed(2)} (${stats.quickLearner.toFixed(2)}x)</strong></div>
    `;
  }

  if (rerollRulesText) {
    rerollRulesText.textContent =
      `Rerolls for ${entry.name} cost 25 → 50 → 75 → 100 (+25 per reroll on this dog; currently reroll #${dogRerolls + 1}). Higher-rated previous stats are kept if not beaten, and non-shiny pups have a 1-in-1,300 chance to become ✨ Shiny (vs. 1-in-650 at spawn).`;
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

function openRerollModal(dogId) {
  initAudio();
  const entry = state.roster.find(d => d.id === dogId);
  if (!entry) return;
  pendingRerollDogId = dogId;
  renderRerollModalContent(dogId, null);
  if (rerollModal) {
    rerollModal.style.display = 'flex';
  }
}

function closeRerollModal() {
  pendingRerollDogId = null;
  if (rerollModal) {
    rerollModal.style.display = 'none';
  }
}

let lastRerollActionAt = 0;
function executeDogReroll(dogId) {
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
  } else {
    sfx.upgrade();
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

// Retire Dog Confirmation Modal Handlers
const retireConfirmModal = document.getElementById('retireConfirmModal');
const retireConfirmText = document.getElementById('retireConfirmText');

function openRetireConfirm(dogId) {
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

function retireDog(dogId) {
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

function renderRosterTab() {
  const container = document.getElementById('rosterListContainer');
  if (!container) return;

  // Avoid wiping DOM right in the middle of an active touch/pointer press on a roster button
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
    const pct = Math.min(100, Math.max(0, (entry.xp / xpNeeded) * 100));
    const levelBonusPct = ((getDogLevelBonusMult(entry) - 1) * 100).toFixed(1);
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
    card.style.position = 'relative';
    card.style.display = 'flex';
    card.style.alignItems = 'stretch';
    card.style.justifyContent = 'space-between';
    card.style.gap = '12px';

    const mainCol = document.createElement('div');
    mainCol.className = 'roster-main';
    mainCol.style.flex = '1';
    mainCol.style.minWidth = '0';

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

    const chipsRow = document.createElement('div');
    chipsRow.className = 'roster-chips';
    chipsRow.innerHTML = `
      ${isFav ? '<span class="roster-chip roster-fav-chip">★ Favorite</span>' : ''}
      <span class="roster-chip">${breedName}</span>
      <span class="roster-chip roster-lvl-chip${entry.isShiny ? ' shiny' : ''}">Lv. <strong>${entry.level}</strong>${entry.level >= MAX_DOG_LEVEL ? ' <em>(MAX)</em>' : ''}${entry.isShiny ? ' ✨' : ''}</span>
      <span class="roster-chip roster-roll-chip ${gradeClass}"><strong>${stats.rollGrade}</strong></span>
      <span class="roster-chip">Dug <strong>${Math.floor(entry.bonesEarned).toLocaleString()}</strong> 🦴</span>
      <span class="roster-chip">Bone Yield <strong>${stats.boneYield.toFixed(2)}x</strong> <em>(+${stats.bonusPayout.toFixed(2)})</em></span>
      <span class="roster-chip">Pack Growth <strong>${stats.packGrowth.toFixed(2)}x</strong> <em>(+${stats.bonusScaling.toFixed(2)})</em></span>
      <span class="roster-chip">Quick Learner <strong>${stats.quickLearner.toFixed(2)}x</strong> <em>(+${stats.bonusXp.toFixed(2)})</em></span>
      <span class="roster-chip">XP <strong>${Math.floor(entry.xp)}/${xpNeeded}</strong></span>
      <span class="roster-chip">Lvl +<strong>${levelBonusPct}%</strong></span>
    `;

    mainCol.appendChild(topRow);
    mainCol.appendChild(xpBarOuter);
    mainCol.appendChild(chipsRow);
    card.appendChild(mainCol);

    const rightAction = document.createElement('div');
    rightAction.className = 'roster-right-action';
    rightAction.style.cssText = `
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: flex-end;
      align-self: stretch;
      gap: 10px;
      flex-shrink: 0;
    `;

    const favBtn = document.createElement('button');
    favBtn.type = 'button';
    favBtn.className = `fav-star-btn${isFav ? ' active' : ''}`;
    favBtn.setAttribute('aria-pressed', String(isFav));
    favBtn.setAttribute('aria-label', isFav ? `Unfavorite ${entry.name}` : `Favorite ${entry.name}`);
    favBtn.textContent = isFav ? '★' : '☆';
    favBtn.style.cssText = `
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${isFav ? 'rgba(255, 234, 167, 0.22)' : 'rgba(255, 255, 255, 0.06)'};
      border: 1.5px solid ${isFav ? '#ffeaa7' : 'rgba(255, 255, 255, 0.22)'};
      color: ${isFav ? '#ffeaa7' : '#b2bec3'};
      border-radius: 12px;
      font-size: 1.45rem;
      line-height: 1;
      cursor: pointer;
      flex-shrink: 0;
      margin-bottom: auto;
      touch-action: manipulation;
    `;
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavoriteDog(entry.id);
    });
    rightAction.appendChild(favBtn);

    const rerollBtn = document.createElement('button');
    rerollBtn.type = 'button';
    rerollBtn.className = 'reroll-dice-btn';
    rerollBtn.setAttribute('aria-label', `Reroll stats for ${entry.name}`);
    rerollBtn.title = `Reroll Stats & Shiny Chance (${getRerollCost(entry)} ✨)`;
    rerollBtn.textContent = '🎲';
    rerollBtn.style.touchAction = 'manipulation';
    rerollBtn.style.minWidth = '42px';
    rerollBtn.style.minHeight = '42px';
    rerollBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openRerollModal(entry.id);
    });
    rightAction.appendChild(rerollBtn);

    if (canRetire) {
      const retireBtn = document.createElement('button');
      retireBtn.type = 'button';
      retireBtn.className = 'retire-pill-btn retire-pill-two-line';
      retireBtn.disabled = isFav;
      retireBtn.style.touchAction = 'manipulation';
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

document.getElementById('btnBuyDecorTree').addEventListener('click', () => {
  initAudio();
  const currentTreeOwned = state.decorInventory.tree || 0;
  if (state.magicBones >= 500 && currentTreeOwned < 3) {
    state.magicBones -= 500;
    state.decorInventory.tree = currentTreeOwned + 1;
    sfx.upgrade();
    updateUI();
    saveGame();
  }
});

document.getElementById('btnBuyDecorFlowers').addEventListener('click', () => {
  initAudio();
  const currentFlowersOwned = state.decorInventory.flowers || 0;
  if (state.magicBones >= 250 && currentFlowersOwned < 5) {
    state.magicBones -= 250;
    state.decorInventory.flowers = currentFlowersOwned + 1;
    sfx.upgrade();
    updateUI();
    saveGame();
  }
});

document.getElementById('btnBuyDecorFountain').addEventListener('click', () => {
  initAudio();
  const currentFountainOwned = state.decorInventory.fountain || 0;
  if (state.magicBones >= 1000 && currentFountainOwned < 2) {
    state.magicBones -= 1000;
    state.decorInventory.fountain = currentFountainOwned + 1;
    sfx.upgrade();
    updateUI();
    saveGame();
  }
});

document.getElementById('btnPlaceDecorTree').addEventListener('click', () => {
  initAudio();
  const placedCount = state.placedDecorations.filter(d => d.type === 'tree').length;
  const available = (state.decorInventory.tree || 0) - placedCount;
  if (available <= 0 || placedCount >= 3) return;

  state.isPlacingDecor = true;
  state.activeDecorType = 'tree';
  closeMenu();
  document.getElementById('placementBanner').textContent = 'Tap any park tile to place your tree!';
  document.getElementById('placementBanner').style.display = 'block';
  sfx.gather();
});

document.getElementById('btnPlaceDecorFlowers').addEventListener('click', () => {
  initAudio();
  const placedCount = state.placedDecorations.filter(d => d.type === 'flowers').length;
  const available = (state.decorInventory.flowers || 0) - placedCount;
  if (available <= 0 || placedCount >= 5) return;

  state.isPlacingDecor = true;
  state.activeDecorType = 'flowers';
  closeMenu();
  document.getElementById('placementBanner').textContent = 'Tap any park tile to place your flower patch!';
  document.getElementById('placementBanner').style.display = 'block';
  sfx.gather();
});

document.getElementById('btnPlaceDecorFountain').addEventListener('click', () => {
  initAudio();
  const placedCount = state.placedDecorations.filter(d => d.type === 'fountain').length;
  const available = (state.decorInventory.fountain || 0) - placedCount;
  if (available <= 0 || placedCount >= 2) return;

  state.isPlacingDecor = true;
  state.activeDecorType = 'fountain';
  closeMenu();
  document.getElementById('placementBanner').textContent = 'Tap any park tile to place your water fountain!';
  document.getElementById('placementBanner').style.display = 'block';
  sfx.gather();
});

const clearDecorConfirmModal = document.getElementById('clearDecorConfirmModal');
document.getElementById('btnClearDecor').addEventListener('click', () => {
  initAudio();
  clearDecorConfirmModal.style.display = 'flex';
});

document.getElementById('btnCancelClearDecor').addEventListener('click', () => {
  initAudio();
  clearDecorConfirmModal.style.display = 'none';
});

document.getElementById('btnConfirmClearDecor').addEventListener('click', () => {
  initAudio();
  state.placedDecorations = [];
  sfx.thud();
  clearDecorConfirmModal.style.display = 'none';
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

const resetConfirmModal = document.getElementById('resetConfirmModal');
document.getElementById('btnResetProgress').addEventListener('click', () => {
  initAudio();
  resetConfirmModal.style.display = 'flex';
});

document.getElementById('btnCancelReset').addEventListener('click', () => {
  initAudio();
  resetConfirmModal.style.display = 'none';
});

document.getElementById('btnConfirmReset').addEventListener('click', () => {
  initAudio();
  localStorage.removeItem('pupperpark_save');
  pendingRetireDogId = null;
  pendingRerollDogId = null;
  queuedAwayProgress = null;
  cameraAngle = 0;
  const starterShinyRoll = rollStarterShiny();
  const resetNow = Date.now();

  state = {
    bones: 0,
    lifetimeBones: 0,
    magicBones: 0,
    nextNameIndex: 1,
    dogs: {
      aussie: 1, beagle: 0, collie: 0, husky: 0,
      golden: 0, shepherd: 0, shiba: 0, labrador: 0
    },
    shinyDogs: [],
    roster: [createRosterEntry('aussie', starterShinyRoll.isShiny, starterShinyRoll.shinyColor, 'Biscuit')],
    perks: [],
    decorInventory: { tree: 0, flowers: 0, fountain: 0 },
    placedDecorations: [],
    isPlacingDecor: false,
    activeDecorType: null,
    showNameTags: true,
    cameraAngle: 0,
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

    costs: {},
    lastSaveTime: resetNow
  };

  initDefaultCosts();

  rebuildCanvasDogsFromRoster();
  droppedBones.length = 0;
  particles.length = 0;
  barkPopups.length = 0;
  parkBarkCooldown = PARK_BARK_MIN_COOLDOWN + Math.random() * (PARK_BARK_MAX_COOLDOWN - PARK_BARK_MIN_COOLDOWN);

  const noticeEl = document.getElementById('retireNotice');
  if (noticeEl) noticeEl.style.display = 'none';

  resetConfirmModal.style.display = 'none';
  if (retireConfirmModal) retireConfirmModal.style.display = 'none';
  if (rerollModal) rerollModal.style.display = 'none';
  document.getElementById('placementBanner').style.display = 'none';
  closeMenu();
  updateUI();
  renderRosterTab();
  saveGameAt(resetNow);
});

const GRID_SIZE = 7;
const TILE_W = 96;
const TILE_H = 48;

let originX = 0;
let originY = 0;
let cameraAngle = 0;

function getViewportSize() {
  const vv = window.visualViewport;
  const rawW = vv && typeof vv.width === 'number' && vv.width > 0 ? vv.width : window.innerWidth;
  const rawH = vv && typeof vv.height === 'number' && vv.height > 0 ? vv.height : window.innerHeight;
  return {
    width: Math.max(240, Math.round(rawW || 360)),
    height: Math.max(240, Math.round(rawH || 640))
  };
}

function resize() {
  const { width, height } = getViewportSize();
  canvas.width = width;
  canvas.height = height;
  originX = canvas.width / 2;
  originY = canvas.height / 2;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resize);
}
resize();

function gridToScreen(gx, gy) {
  const cx = GRID_SIZE / 2;
  const cy = GRID_SIZE / 2;

  const relX = gx - cx;
  const relY = gy - cy;

  const cosA = Math.cos(cameraAngle);
  const sinA = Math.sin(cameraAngle);
  const rotX = relX * cosA - relY * sinA;
  const rotY = relX * sinA + relY * cosA;

  return {
    x: originX + (rotX - rotY) * (TILE_W / 2),
    y: originY + (rotX + rotY) * (TILE_H / 2)
  };
}

function screenToGrid(sx, sy) {
  const dx = sx - originX;
  const dy = sy - originY;

  const isoX = dx / (TILE_W / 2);
  const isoY = dy / (TILE_H / 2);

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

function clampTileIndex(val) {
  return Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(val)));
}

function getCenteredTilePos(gx, gy) {
  return gridToScreen(clampTileIndex(gx) + 0.5, clampTileIndex(gy) + 0.5);
}

let isRotating = false;
let lastMouseX = 0;
let lastMouseY = 0;
let dragTotalDist = 0;
let holdTimer = null;
let holdStartTime = 0;
let holdPosition = { x: 0, y: 0 };
const HOLD_DURATION = 4000;

canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  isRotating = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  dragTotalDist = 0;
  try { canvas.setPointerCapture(e.pointerId); } catch(err) {}

  holdStartTime = performance.now();
  holdPosition = { x: e.clientX, y: e.clientY };

  if (holdTimer) clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    initAudio();
    sfx.gather();
    const rect = canvas.getBoundingClientRect();
    const clickX = holdPosition.x - rect.left;
    const clickY = holdPosition.y - rect.top;
    const targetGrid = screenToGrid(clickX, clickY);

    dogs.forEach(dog => {
      dog.targetGx = Math.max(0.5, Math.min(GRID_SIZE - 0.5, targetGrid.gx + (Math.random() - 0.5) * 0.6));
      dog.targetGy = Math.max(0.5, Math.min(GRID_SIZE - 0.5, targetGrid.gy + (Math.random() - 0.5) * 0.6));
      dog.state = 'WALK';
    });

    particles.push({
      x: clickX,
      y: clickY,
      vx: 0,
      vy: 0,
      life: 0.8,
      maxLife: 0.8,
      color: '#ffeaa7',
      size: 5,
      isRing: true
    });

    isRotating = false;
  }, HOLD_DURATION);
});

canvas.addEventListener('pointermove', (e) => {
  const moveDist = Math.hypot(e.clientX - lastMouseX, e.clientY - lastMouseY);
  dragTotalDist += moveDist;

  if (moveDist > 15) {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  }

  if (!isRotating) return;
  const deltaX = e.clientX - lastMouseX;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  if (Math.abs(deltaX) > 0) {
    cameraAngle += deltaX * 0.008;
    state.cameraAngle = cameraAngle;
    requestSave();
  }
});

canvas.addEventListener('pointerup', (e) => {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }

  if (!isRotating) {
    isRotating = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch(err) {}
    return;
  }

  isRotating = false;
  try { canvas.releasePointerCapture(e.pointerId); } catch(err) {}

  if (dragTotalDist > 1) {
    state.cameraAngle = cameraAngle;
    saveGame();
  }

  if (dragTotalDist < 5) {
    initAudio();
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const gridPos = screenToGrid(clickX, clickY);

    if (state.isPlacingDecor) {
      if (
        gridPos.gx >= 0 && gridPos.gx <= GRID_SIZE &&
        gridPos.gy >= 0 && gridPos.gy <= GRID_SIZE
      ) {
        state.placedDecorations.push({
          type: state.activeDecorType,
          gx: clampTileIndex(gridPos.gx),
          gy: clampTileIndex(gridPos.gy)
        });
        state.isPlacingDecor = false;
        state.activeDecorType = null;
        document.getElementById('placementBanner').style.display = 'none';
        sfx.gather();
        updateUI();
        saveGame();
      }
      return;
    }

    if (
      gridPos.gx >= 0 && gridPos.gx <= GRID_SIZE &&
      gridPos.gy >= 0 && gridPos.gy <= GRID_SIZE
    ) {
      const { magicBonus } = getPerkMultipliers();
      const isMagic = Math.random() < (state.magicChance + magicBonus) || state.kongTimer > 0;
      const cupMult = getActiveCupMult();
      const tapBones = Math.max(1, Math.round(state.digPower * cupMult * 10) / 10);
      droppedBones.push({
        x: clickX,
        y: clickY - 10,
        vx: (Math.random() - 0.5) * 40,
        vy: -95,
        groundY: clickY + 5,
        age: 0,
        isMagic,
        value: isMagic ? 1 : tapBones
      });
    }
  }
});

canvas.addEventListener('pointercancel', (e) => {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
  isRotating = false;
  try { canvas.releasePointerCapture(e.pointerId); } catch(err) {}
  requestSave();
});

const mushrooms = [
  { gx: 2.2, gy: 2.2, color: '#a29bfe', glow: 'rgba(162, 155, 254, 0.35)' },
  { gx: 4.8, gy: 2.4, color: '#fd79a8', glow: 'rgba(253, 121, 168, 0.35)' },
  { gx: 2.4, gy: 4.8, color: '#55efc4', glow: 'rgba(85, 239, 196, 0.35)' },
  { gx: 4.6, gy: 4.6, color: '#ffeaa7', glow: 'rgba(255, 234, 167, 0.35)' }
];

const dogs = [];
const droppedBones = [];
const particles = [];

class Dog {
  constructor(gx, gy, rosterId, breed = 'aussie', isShiny = false, shinyColor = null) {
    this.gx = gx;
    this.gy = gy;
    this.targetGx = gx;
    this.targetGy = gy;
    this.state = 'IDLE';
    this.timer = 0.5 + Math.random() * 1.5;
    this.facingRight = Math.random() > 0.5;
    this.sleepFacingRight = this.facingRight;
    this.animPhase = Math.random() * Math.PI * 2;
    this.barkCooldown = DOG_BARK_MIN_COOLDOWN * 0.5 + Math.random() * (DOG_BARK_MAX_COOLDOWN - DOG_BARK_MIN_COOLDOWN * 0.5);
    this.rosterId = rosterId;
    this.breed = normalizeBreedKey(breed);
    this.isShiny = isShiny;
    this.shinyColor = shinyColor || SHINY_PALETTES[Math.floor(Math.random() * SHINY_PALETTES.length)];
    this.isMagicDig = false;
    this.onReachToy = null;
  }

  enterSleep() {
    this.state = 'SLEEP';
    this.sleepFacingRight = this.facingRight;
    this.timer = 3.2 + Math.random() * 2.8;
  }

  getRosterEntry() {
    return state.roster.find(r => r.id === this.rosterId) || null;
  }

  canBark() {
    return this.state !== 'SLEEP' && this.barkCooldown <= 0;
  }

  triggerBark() {
    if (!this.canBark()) return false;
    this.barkCooldown = DOG_BARK_MIN_COOLDOWN + Math.random() * (DOG_BARK_MAX_COOLDOWN - DOG_BARK_MIN_COOLDOWN);
    sfx.bark(this.breed);

    const pos = gridToScreen(this.gx, this.gy);
    const word = BARK_WORDS[Math.floor(Math.random() * BARK_WORDS.length)];
    barkPopups.push({
      dog: this,
      offsetX: this.facingRight ? 14 : -14,
      baseOffsetY: -34,
      fallbackX: pos.x,
      fallbackY: pos.y - 34,
      text: word,
      age: 0,
      duration: BARK_TEXT_DURATION
    });
    return true;
  }

  pickNewTarget() {
    this.targetGx = 0.7 + Math.random() * (GRID_SIZE - 1.4);
    this.targetGy = 0.7 + Math.random() * (GRID_SIZE - 1.4);
    this.state = 'WALK';
  }

  update(dt) {
    if (this.barkCooldown > 0) {
      this.barkCooldown = Math.max(0, this.barkCooldown - dt);
    }

    const cfg = BREED_CONFIG[this.breed] || BREED_CONFIG.aussie;
    const { workBonus } = getPerkMultipliers();

    const visualPace = Math.min(1.6, 1 + Math.log1p(Math.max(0, workBonus - 1)) * 0.25);
    const walkSpeed = (cfg.walkMult || 1.1) * visualPace;

    this.animPhase += dt * (
      this.state === 'WALK'
        ? 9 * Math.min(1.25, visualPace)
        : this.state === 'SLEEP'
          ? 1.4
          : 5 * Math.min(1.25, visualPace)
    );

    if (this.state === 'SLEEP') {
      this.facingRight = this.sleepFacingRight;
      this.timer -= dt;
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

        if (this.onReachToy) {
          this.onReachToy();
          this.onReachToy = null;
        }

        this.state = 'DIG';
        this.timer = (cfg.digSec || 1.0) / visualPace;

        const { magicBonus } = getPerkMultipliers();
        const magicChanceTotal = Math.min(0.9, state.magicChance + magicBonus + (cfg.magicBonus || 0));
        this.isMagicDig = Math.random() < magicChanceTotal || state.kongTimer > 0;

        const treasureChance = cfg.treasureChance || 0.00008;
        if (!state.isDraftingPerk && Math.random() < treasureChance) {
          triggerPerkDraft();
        }
      } else {
        this.gx += (dx / dist) * walkSpeed * dt;
        this.gy += (dy / dist) * walkSpeed * dt;
        this.gx = Math.max(0.5, Math.min(GRID_SIZE - 0.5, this.gx));
        this.gy = Math.max(0.5, Math.min(GRID_SIZE - 0.5, this.gy));
      }
    } else if (this.state === 'DIG') {
      this.timer -= dt;
      if (Math.random() < 0.35) {
        const pos = gridToScreen(this.gx, this.gy);
        particles.push({
          x: pos.x + (this.facingRight ? 12 : -12),
          y: pos.y + 4,
          vx: (Math.random() - 0.5) * 45,
          vy: -30 - Math.random() * 40,
          life: 0.5,
          maxLife: 0.5,
          color: this.isMagicDig ? '#ffeaa7' : '#795548',
          size: this.isMagicDig ? 3.5 : 3
        });
      }

      if (this.timer <= 0) {
        this.finishDig();
        this.state = 'IDLE';
        this.timer = 0.6 + Math.random() * 1.2;
      }
    }
  }

  finishDig() {
    const entry = this.getRosterEntry();
    const stats = getEffectiveBreedStats(entry, this.breed);
    const cupMult = getActiveCupMult();

    const dogDigMult = getDigMultiplier(entry);
    const rawAmount = state.digPower * stats.boneYield * cupMult * dogDigMult;
    const amount = Math.max(1, Math.round(rawAmount * 10) / 10);
    const boneValue = this.isMagicDig ? 1 : amount;
    const pos = gridToScreen(this.gx, this.gy);

    if (entry) {
      if (!this.isMagicDig) {
        entry.bonesEarned = Math.min(MAX_BONES, (entry.bonesEarned || 0) + boneValue);
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
        }
      } else {
        entry.level = MAX_DOG_LEVEL;
        entry.xp = 0;
      }
    }

    droppedBones.push({
      x: pos.x,
      y: pos.y - 6,
      vx: (Math.random() - 0.5) * 50,
      vy: -110,
      groundY: pos.y + 4,
      age: 0,
      isMagic: this.isMagicDig,
      value: boneValue
    });
  }

  draw(ctx) {
    const pos = gridToScreen(this.gx, this.gy);
    const isSleeping = this.state === 'SLEEP';
    const effectiveFacingRight = isSleeping ? this.sleepFacingRight : this.facingRight;

    ctx.save();
    ctx.translate(pos.x, pos.y);

    if (this.isShiny) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 234, 167, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 4, isSleeping ? 22 : 24 + Math.sin(this.animPhase * 3) * 3, isSleeping ? 9.5 : 11, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.state === 'DIG' && this.isMagicDig) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 234, 167, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 6, 26 + Math.sin(this.animPhase * 2) * 3, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(0, 4, isSleeping ? 20 : 17, isSleeping ? 8.5 : 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    if (!effectiveFacingRight) {
      ctx.scale(-1, 1);
    }

    let feastJump = 0;
    if (state.feastAnimTimer > 0 && !isSleeping) {
      feastJump = Math.abs(Math.sin(state.feastAnimTimer * Math.PI * 4)) * 14;
    }

    const sleepBreath = isSleeping ? Math.sin(this.animPhase) * 0.35 : 0;
    const bounce = isSleeping
      ? -6.5
      : (this.state === 'WALK' ? Math.abs(Math.sin(this.animPhase)) * 3 : 0) + feastJump;
    const poseTilt = isSleeping ? 0 : (this.state === 'DIG' ? 0.25 : 0);

    ctx.translate(0, -bounce);
    ctx.rotate(poseTilt);

    const legSwing = isSleeping
      ? -1.5
      : (this.state === 'WALK' ? Math.sin(this.animPhase) * 4 : (this.state === 'DIG' ? Math.sin(this.animPhase * 3) * 5 : 0));
    const legHeight = isSleeping ? 4.5 : 10;
    const pawY = isSleeping ? 3 : 4;
    const pawHeight = isSleeping ? 2 : 3;
    const tailWag = isSleeping
      ? Math.sin(this.animPhase * 0.65) * 0.5
      : Math.sin(this.animPhase * 2.2) * 2.5;

    if (this.breed === 'aussie') {
      const primaryColor = this.isShiny ? this.shinyColor : '#c87d4b';
      const coatDark = this.isShiny ? this.shinyColor : '#4e433f';
      const merlePatch = this.isShiny ? this.shinyColor : '#736560';
      const whiteFur = '#f8f9fa';

      ctx.fillStyle = primaryColor;
      ctx.fillRect(-11 - legSwing, -2.5, 4.2, legHeight);
      ctx.fillRect(6.5 + legSwing, -2.5, 4.2, legHeight);
      ctx.fillStyle = whiteFur;
      ctx.fillRect(-11 - legSwing, pawY, 4.2, pawHeight);
      ctx.fillRect(6.5 + legSwing, pawY, 4.2, pawHeight);

      ctx.fillStyle = coatDark;
      ctx.beginPath();
      ctx.arc(isSleeping ? -12 : -15, (isSleeping ? -6.5 : -10.5) + tailWag, 4.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = coatDark;
      ctx.beginPath();
      ctx.ellipse(-1.5, -8, isSleeping ? 13 : 14.5, (isSleeping ? 7.8 : 9) + sleepBreath * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = merlePatch;
      ctx.beginPath();
      ctx.ellipse(-4, -10, 8.5, 4.5, -0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.ellipse(2, -6.5, 6, 3.8, 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = whiteFur;
      ctx.beginPath();
      ctx.arc(8.5, -7.5, 7.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = coatDark;
      ctx.beginPath();
      ctx.arc(isSleeping ? 9.5 : 11, isSleeping ? -12.5 : -17, 7.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.arc(isSleeping ? 11 : 12.5, isSleeping ? -11 : -15, 4.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#382f2c';
      ctx.beginPath();
      ctx.moveTo(6.5, isSleeping ? -16 : -20.5);
      ctx.lineTo(5.5, isSleeping ? -18.5 : -26.5);
      ctx.lineTo(11, isSleeping ? -17.5 : -22.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = whiteFur;
      ctx.beginPath();
      ctx.ellipse(isSleeping ? 15 : 17, isSleeping ? -11 : -14.8, 4.8, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e272e';
      ctx.beginPath();
      ctx.arc(isSleeping ? 19 : 21, isSleeping ? -11.6 : -15.6, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.arc(14.2, isSleeping ? -14.2 : -19.2, 1.4, 0, Math.PI * 2);
      ctx.fill();

      if (isSleeping) {
        ctx.strokeStyle = '#1e1e1e';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(13, -12.5, 1.5, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#1e1e1e';
        ctx.beginPath();
        ctx.arc(14.5, -17.3, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(14.9, -17.8, 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.breed === 'collie') {
      const collieColor = this.isShiny ? this.shinyColor : '#2d3436';
      const featherShade = this.isShiny ? this.shinyColor : '#1e272e';
      const whiteFur = '#f8f9fa';

      ctx.fillStyle = collieColor;
      ctx.fillRect(-12 - legSwing, -2.5, 3.8, legHeight);
      ctx.fillRect(7 - legSwing * 0.5, -2.5, 3.8, legHeight);
      ctx.fillStyle = whiteFur;
      ctx.fillRect(-12 - legSwing, pawY, 3.8, pawHeight);
      ctx.fillRect(7 - legSwing * 0.5, pawY, 3.8, pawHeight);

      const wag = isSleeping ? tailWag : Math.sin(this.animPhase * 2.1) * 3.4;
      ctx.save();
      ctx.strokeStyle = collieColor;
      ctx.lineWidth = 5.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-14.5, isSleeping ? -7.5 : -9.5);
      ctx.quadraticCurveTo(isSleeping ? -18.5 : -22.5, (isSleeping ? -8.5 : -14) + wag, isSleeping ? -21 : -26.5, (isSleeping ? -5 : -8.5) + wag * 0.6);
      ctx.stroke();

      ctx.strokeStyle = whiteFur;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(isSleeping ? -17 : -20, (isSleeping ? -7.5 : -12.5) + wag * 0.3);
      ctx.quadraticCurveTo(isSleeping ? -19 : -23.5, (isSleeping ? -8.5 : -14) + wag, isSleeping ? -21 : -26.5, (isSleeping ? -5 : -8.5) + wag * 0.6);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = collieColor;
      ctx.beginPath();
      ctx.ellipse(-1.5, isSleeping ? -8 : -10, isSleeping ? 13.5 : 15.5, (isSleeping ? 7.2 : 8.2) + sleepBreath * 0.2, -0.05, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = featherShade;
      ctx.beginPath();
      ctx.ellipse(-5, isSleeping ? -9.5 : -11.5, 8, 4.2, -0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = whiteFur;
      ctx.beginPath();
      ctx.ellipse(6.5, isSleeping ? -8.5 : -10.5, 5.5, 7.2, 0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = collieColor;
      ctx.beginPath();
      ctx.arc(isSleeping ? 9.5 : 11, isSleeping ? -12.5 : -17.5, 7.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = collieColor;
      ctx.beginPath();
      ctx.moveTo(7.5, isSleeping ? -16 : -21);
      ctx.lineTo(6.5, isSleeping ? -18.5 : -27.5);
      ctx.lineTo(12, isSleeping ? -16.5 : -21.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = whiteFur;
      ctx.beginPath();
      ctx.moveTo(6.5, isSleeping ? -18.5 : -27.5);
      ctx.lineTo(5.2, isSleeping ? -17 : -25.5);
      ctx.lineTo(8.5, isSleeping ? -17 : -25.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = whiteFur;
      ctx.beginPath();
      ctx.moveTo(11, isSleeping ? -13 : -15.5);
      ctx.lineTo(isSleeping ? 20 : 22.5, isSleeping ? -10.8 : -14.2);
      ctx.lineTo(12.5, isSleeping ? -9.2 : -11);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#11161d';
      ctx.beginPath();
      ctx.arc(isSleeping ? 19.7 : 22.2, isSleeping ? -10.9 : -14.3, 1.65, 0, Math.PI * 2);
      ctx.fill();

      if (isSleeping) {
        ctx.strokeStyle = '#1e1e1e';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(13, -13, 1.5, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#1e1e1e';
        ctx.beginPath();
        ctx.arc(14.5, -18.2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(14.9, -18.7, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.breed === 'golden') {
      const col = this.isShiny ? this.shinyColor : '#f39c12';
      const richShade = this.isShiny ? this.shinyColor : '#d35400';
      const creamHighlight = '#ffeaa7';

      ctx.fillStyle = col;
      ctx.fillRect(-11.5 - legSwing, -2.5, 4.6, legHeight);
      ctx.fillRect(6.5 + legSwing, -2.5, 4.6, legHeight);

      const wag = isSleeping ? tailWag : Math.sin(this.animPhase * 2.1) * 3.5;
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 6.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-14.5, isSleeping ? -7.5 : -9);
      ctx.quadraticCurveTo(isSleeping ? -19 : -23, (isSleeping ? -9.5 : -15) + wag, isSleeping ? -21 : -26.5, (isSleeping ? -6.5 : -10.5) + wag * 0.6);
      ctx.stroke();

      ctx.strokeStyle = creamHighlight;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(isSleeping ? -17 : -19.5, (isSleeping ? -8 : -12.5) + wag * 0.3);
      ctx.quadraticCurveTo(isSleeping ? -19.5 : -23.5, (isSleeping ? -9.5 : -15) + wag, isSleeping ? -21 : -26.5, (isSleeping ? -6.5 : -10.5) + wag * 0.6);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(-1, isSleeping ? -8 : -9.5, isSleeping ? 13.5 : 15.5, (isSleeping ? 7.8 : 9.2) + sleepBreath * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = creamHighlight;
      ctx.beginPath();
      ctx.ellipse(6.5, isSleeping ? -7 : -8.5, 5.5, 6, 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(isSleeping ? 9.5 : 11, isSleeping ? -12 : -16.5, 7.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = creamHighlight;
      ctx.beginPath();
      ctx.ellipse(isSleeping ? 14.5 : 16.5, isSleeping ? -10.2 : -14, 5, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = richShade;
      ctx.beginPath();
      ctx.ellipse(8.2, isSleeping ? -10.2 : -13.5, 3.3, 6, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e1e1e';
      ctx.beginPath();
      ctx.arc(isSleeping ? 19.2 : 21.2, isSleeping ? -10.8 : -14.5, 1.8, 0, Math.PI * 2);
      ctx.fill();

      if (isSleeping) {
        ctx.strokeStyle = '#1e1e1e';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(12.5, -13, 1.5, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#1e1e1e';
        ctx.beginPath();
        ctx.arc(13.8, -18, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(14.2, -18.5, 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.breed === 'husky') {
      const col = this.isShiny ? this.shinyColor : '#636e72';
      const darkTrim = this.isShiny ? this.shinyColor : '#2d3436';
      const bellyWhite = '#f8f9fa';

      ctx.fillStyle = col;
      ctx.fillRect(-11 - legSwing, -2.5, 4.2, legHeight);
      ctx.fillRect(6 + legSwing, -2.5, 4.2, legHeight);
      ctx.fillStyle = bellyWhite;
      ctx.fillRect(-11 - legSwing, pawY, 4.2, pawHeight);
      ctx.fillRect(6 + legSwing, pawY, 4.2, pawHeight);

      const wag = isSleeping ? tailWag : Math.sin(this.animPhase * 2.1) * 3.5;
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 6.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-14, isSleeping ? -7.5 : -9);
      ctx.quadraticCurveTo(isSleeping ? -19 : -23, (isSleeping ? -9.5 : -15) + wag, isSleeping ? -20.5 : -25, (isSleeping ? -6.5 : -10) + wag * 0.6);
      ctx.stroke();

      ctx.strokeStyle = bellyWhite;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(isSleeping ? -16.5 : -18, (isSleeping ? -8 : -12) + wag * 0.3);
      ctx.quadraticCurveTo(isSleeping ? -19 : -23, (isSleeping ? -9.5 : -15) + wag, isSleeping ? -20.5 : -25, (isSleeping ? -6.5 : -10) + wag * 0.6);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(-1, isSleeping ? -8 : -10, isSleeping ? 13 : 14.5, (isSleeping ? 7.4 : 8.5) + sleepBreath * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bellyWhite;
      ctx.beginPath();
      ctx.ellipse(3, isSleeping ? -5.5 : -6.5, 10, 4, -0.05, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(isSleeping ? 9 : 10.5, isSleeping ? -12.5 : -17, 7.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = darkTrim;
      ctx.beginPath();
      ctx.moveTo(6.5, isSleeping ? -16.5 : -21);
      ctx.lineTo(9.5, isSleeping ? -19 : -28.5);
      ctx.lineTo(13, isSleeping ? -16 : -20);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = bellyWhite;
      ctx.beginPath();
      ctx.moveTo(8, isSleeping ? -17 : -21.5);
      ctx.lineTo(9.8, isSleeping ? -18 : -26);
      ctx.lineTo(11.5, isSleeping ? -16.5 : -20.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = bellyWhite;
      ctx.beginPath();
      ctx.ellipse(isSleeping ? 13 : 14.5, isSleeping ? -11 : -14.5, 6.2, 4.2, 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(10.5, isSleeping ? -12 : -16, 4.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e272e';
      ctx.beginPath();
      ctx.ellipse(isSleeping ? 18.2 : 20.2, isSleeping ? -11.6 : -15.5, 1.8, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();

      if (isSleeping) {
        ctx.strokeStyle = '#1e272e';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(13.2, -13, 1.5, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#00a8ff';
        ctx.beginPath();
        ctx.arc(14.8, -17.5, 1.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(15.2, -18, 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.breed === 'shiba') {
      const col = this.isShiny ? this.shinyColor : '#d35400';
      const warmShade = this.isShiny ? this.shinyColor : '#a84300';
      const creamFur = '#fffaf0';

      ctx.fillStyle = col;
      ctx.fillRect(-10.5 - legSwing, -2.5, 4, legHeight);
      ctx.fillRect(6 + legSwing, -2.5, 4, legHeight);
      ctx.fillStyle = creamFur;
      ctx.fillRect(-10.5 - legSwing, pawY, 4, pawHeight);
      ctx.fillRect(6 + legSwing, pawY, 4, pawHeight);

      const wag = isSleeping ? tailWag : Math.sin(this.animPhase * 2.4) * 2.2;
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 4.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-13.5, isSleeping ? -7.5 : -9.5);
      ctx.quadraticCurveTo(isSleeping ? -17 : -19.5, (isSleeping ? -9 : -14) + wag, isSleeping ? -15 : -16.5, (isSleeping ? -12 : -19.5) + wag);
      ctx.arc(isSleeping ? -13.5 : -14.5, (isSleeping ? -10.5 : -17.5) + wag, 2.4, 0.5 * Math.PI, 2.2 * Math.PI);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(-0.5, isSleeping ? -7.5 : -9, isSleeping ? 13 : 14.5, (isSleeping ? 7.4 : 8.4) + sleepBreath * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = warmShade;
      ctx.beginPath();
      ctx.ellipse(-4, isSleeping ? -9.2 : -11, 7.5, 4, -0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = creamFur;
      ctx.beginPath();
      ctx.ellipse(2, isSleeping ? -5 : -5.8, 10.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(isSleeping ? 9 : 10.5, isSleeping ? -12 : -16.5, 7.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = warmShade;
      ctx.beginPath();
      ctx.moveTo(6.5, isSleeping ? -16 : -20.5);
      ctx.lineTo(9.5, isSleeping ? -18.5 : -28.5);
      ctx.lineTo(13.5, isSleeping ? -15.5 : -19.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = creamFur;
      ctx.beginPath();
      ctx.moveTo(8, isSleeping ? -16.5 : -21);
      ctx.lineTo(9.8, isSleeping ? -17.5 : -26);
      ctx.lineTo(11.8, isSleeping ? -16 : -20);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(isSleeping ? 13 : 15, isSleeping ? -10.2 : -13.8, 5.2, 3.6, 0.05, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#11161d';
      ctx.beginPath();
      ctx.arc(isSleeping ? 17.6 : 19.6, isSleeping ? -10.8 : -14.4, 1.6, 0, Math.PI * 2);
      ctx.fill();

      if (isSleeping) {
        ctx.strokeStyle = '#1e1e1e';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(12.8, -12.5, 1.5, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#1e1e1e';
        ctx.beginPath();
        ctx.arc(14.2, -17, 1.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(14.6, -17.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.breed === 'shepherd') {
      const saddleCol = this.isShiny ? this.shinyColor : '#d35400';
      const darkCol = this.isShiny ? this.shinyColor : '#2c3e50';
      const tanAccent = this.isShiny ? this.shinyColor : '#e67e22';

      ctx.fillStyle = darkCol;
      ctx.fillRect(-12 - legSwing, -2.5, 4.2, isSleeping ? 4 : 6);
      ctx.fillRect(7 + legSwing, -2.5, 4.2, isSleeping ? 4 : 6);
      ctx.fillStyle = tanAccent;
      ctx.fillRect(-12 - legSwing, isSleeping ? 1.5 : 2, 4.2, isSleeping ? 2 : 5);
      ctx.fillRect(7 + legSwing, isSleeping ? 1.5 : 2, 4.2, isSleeping ? 2 : 5);

      const wag = isSleeping ? tailWag : Math.sin(this.animPhase * 2) * 3.2;
      ctx.save();
      ctx.strokeStyle = darkCol;
      ctx.lineWidth = 5.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-14.5, isSleeping ? -7.5 : -9.5);
      ctx.quadraticCurveTo(isSleeping ? -19 : -22, (isSleeping ? -7.5 : -11) + wag, isSleeping ? -21.5 : -25, (isSleeping ? -4.5 : -5) + wag * 0.5);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = saddleCol;
      ctx.beginPath();
      ctx.ellipse(-1, isSleeping ? -8 : -10, isSleeping ? 13.5 : 15.5, (isSleeping ? 7.6 : 8.8) + sleepBreath * 0.2, -0.06, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = darkCol;
      ctx.beginPath();
      ctx.ellipse(-2, isSleeping ? -10 : -12.5, 12.5, 4.8, -0.05, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = saddleCol;
      ctx.beginPath();
      ctx.arc(isSleeping ? 9.5 : 11, isSleeping ? -12.5 : -17.5, 7.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = darkCol;
      ctx.beginPath();
      ctx.moveTo(6.5, isSleeping ? -16.5 : -21);
      ctx.lineTo(8.5, isSleeping ? -19.5 : -30.5);
      ctx.lineTo(13, isSleeping ? -16 : -20.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = tanAccent;
      ctx.beginPath();
      ctx.moveTo(8, isSleeping ? -17 : -21.5);
      ctx.lineTo(9.2, isSleeping ? -18.5 : -27.5);
      ctx.lineTo(11.5, isSleeping ? -16.5 : -21);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = darkCol;
      ctx.beginPath();
      ctx.moveTo(11, isSleeping ? -13.5 : -17);
      ctx.lineTo(isSleeping ? 19.5 : 21.5, isSleeping ? -11.2 : -15.5);
      ctx.lineTo(isSleeping ? 18.5 : 20.5, isSleeping ? -9.5 : -12.5);
      ctx.lineTo(11, isSleeping ? -9.5 : -12);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#11161d';
      ctx.beginPath();
      ctx.arc(isSleeping ? 19.3 : 21.3, isSleeping ? -11 : -14.8, 1.7, 0, Math.PI * 2);
      ctx.fill();

      if (isSleeping) {
        ctx.strokeStyle = '#1e272e';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(13, -13, 1.5, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#f9ca24';
        ctx.beginPath();
        ctx.arc(14.5, -18, 1.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e272e';
        ctx.beginPath();
        ctx.arc(14.7, -18, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.breed === 'beagle') {
      const col = this.isShiny ? this.shinyColor : '#e67e22';
      const earBrown = this.isShiny ? this.shinyColor : '#6d4c41';
      const saddleDark = this.isShiny ? this.shinyColor : '#3e2723';
      const whiteFur = '#f8f9fa';

      ctx.fillStyle = col;
      ctx.fillRect(-10.5 - legSwing, -2.5, 4.2, isSleeping ? 4.5 : 8.5);
      ctx.fillRect(5.5 + legSwing, -2.5, 4.2, isSleeping ? 4.5 : 8.5);
      ctx.fillStyle = whiteFur;
      ctx.fillRect(-10.5 - legSwing, pawY, 4.2, pawHeight);
      ctx.fillRect(5.5 + legSwing, pawY, 4.2, pawHeight);

      const wag = isSleeping ? tailWag : Math.sin(this.animPhase * 2.3) * 3.8;
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 4.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-13.5, isSleeping ? -7.5 : -9);
      ctx.quadraticCurveTo(isSleeping ? -17 : -19.5, (isSleeping ? -10.5 : -16.5) + wag, isSleeping ? -16 : -18.5, (isSleeping ? -12.5 : -21) + wag);
      ctx.stroke();

      ctx.strokeStyle = whiteFur;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(isSleeping ? -16.2 : -18.8, (isSleeping ? -11.5 : -18.5) + wag);
      ctx.lineTo(isSleeping ? -16 : -18.5, (isSleeping ? -13.2 : -22) + wag);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(-0.5, isSleeping ? -7.5 : -8.5, isSleeping ? 13 : 14.5, (isSleeping ? 7.2 : 8.2) + sleepBreath * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = saddleDark;
      ctx.beginPath();
      ctx.ellipse(-3, isSleeping ? -9.2 : -10.5, 7.5, 4, -0.05, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = whiteFur;
      ctx.beginPath();
      ctx.ellipse(4.5, isSleeping ? -5.2 : -6.2, 7.5, 4.2, 0.05, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(isSleeping ? 9 : 10.5, isSleeping ? -11.5 : -15.5, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = whiteFur;
      ctx.beginPath();
      ctx.ellipse(isSleeping ? 13 : 15, isSleeping ? -9.5 : -12.5, 5.2, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = earBrown;
      ctx.beginPath();
      ctx.ellipse(7.5, isSleeping ? -9.5 : -11.8, 3.6, 6.5, 0.18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#11161d';
      ctx.beginPath();
      ctx.arc(isSleeping ? 17.6 : 19.6, isSleeping ? -10 : -13.2, 1.65, 0, Math.PI * 2);
      ctx.fill();

      if (isSleeping) {
        ctx.strokeStyle = '#1e1e1e';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(12.2, -12, 1.5, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#1e1e1e';
        ctx.beginPath();
        ctx.arc(13.5, -16.2, 1.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(13.9, -16.7, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.breed === 'labrador') {
      const col = this.isShiny ? this.shinyColor : '#e5a93c';
      const earCol = this.isShiny ? this.shinyColor : '#c78924';
      ctx.fillStyle = col;
      ctx.fillRect(-11 - legSwing, -2.5, 4.5, legHeight);
      ctx.fillRect(6 + legSwing, -2.5, 4.5, legHeight);
      const wag = isSleeping ? tailWag : Math.sin(this.animPhase * 2.2) * 3.5;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-14, isSleeping ? -7.5 : -9);
      ctx.quadraticCurveTo(isSleeping ? -18.5 : -22, (isSleeping ? -9 : -13) + wag, isSleeping ? -21 : -25, (isSleeping ? -6.5 : -9) + wag * 0.5);
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = col;
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(-1, isSleeping ? -7.5 : -9, isSleeping ? 13 : 14.5, (isSleeping ? 7.6 : 8.8) + sleepBreath * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(isSleeping ? 9.5 : 11, isSleeping ? -12 : -16.5, 7.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = earCol;
      ctx.beginPath(); ctx.ellipse(8.5, isSleeping ? -10.5 : -13.5, 3.2, 5.8, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(isSleeping ? 15 : 17, isSleeping ? -10.2 : -14, 5.2, 3.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e272e';
      ctx.beginPath(); ctx.arc(isSleeping ? 19.2 : 21.2, isSleeping ? -10.8 : -15, 1.8, 0, Math.PI * 2); ctx.fill();

      if (isSleeping) {
        ctx.strokeStyle = '#1e1e1e';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(12.5, -13, 1.5, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(14, -18.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    if (state.showNameTags) {
      const entry = this.getRosterEntry();
      const label = entry ? entry.name : (BREED_LABELS[this.breed] || this.breed);
      const tagY = isSleeping ? -22 : -36;

      ctx.font = '700 11px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
      const textWidth = ctx.measureText(label).width;
      const padX = 7;
      const boxW = textWidth + padX * 2;
      const boxH = 18;

      ctx.fillStyle = 'rgba(13, 11, 26, 0.78)';
      ctx.beginPath();
      ctx.roundRect(-boxW / 2, tagY - boxH / 2, boxW, boxH, 7);
      ctx.fill();

      ctx.strokeStyle = this.isShiny ? 'rgba(255, 234, 167, 0.85)' : 'rgba(162, 155, 254, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = this.isShiny ? '#ffeaa7' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, tagY + 0.5);

      if (isSleeping) {
        const zDrift = (this.animPhase * 2.5) % 6;
        ctx.save();
        ctx.font = '800 10px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        ctx.fillStyle = 'rgba(200, 210, 218, 0.85)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('zZz', boxW / 2 + 5 + zDrift * 0.25, tagY - zDrift * 0.45);
        ctx.restore();
      }
    } else if (isSleeping) {
      const zDrift = (this.animPhase * 3.5) % 10;
      ctx.save();
      ctx.font = '800 10px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
      ctx.fillStyle = 'rgba(200, 210, 218, 0.85)';
      ctx.textAlign = 'center';
      ctx.fillText('zZz', 10 + zDrift * 0.4, -16 - zDrift);
      ctx.restore();
    }

    ctx.restore();
  }
}

function triggerPerkDraft() {
  state.isDraftingPerk = true;
  sfx.shiny();
  const modal = document.getElementById('perkModal');
  const choicesContainer = document.getElementById('perkChoices');
  choicesContainer.innerHTML = '';
  choicesContainer.style.display = 'flex';
  choicesContainer.style.flexDirection = 'column';
  choicesContainer.style.gap = '10px';
  choicesContainer.style.marginTop = '10px';

  const shuffled = [...PERK_POOL].sort(() => 0.5 - Math.random());
  const options = shuffled.slice(0, 3);

  options.forEach(perk => {
    const btn = document.createElement('button');
    btn.className = 'perk-choice-btn';

    let rarityColor = '#a29bfe';
    if (perk.rarity === 'Rare') rarityColor = '#0984e3';
    if (perk.rarity === 'Legendary') rarityColor = '#f1c40f';
    if (perk.rarity === 'Mythic') rarityColor = '#e84393';

    btn.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <span style="font-weight: 800; font-size: 1rem; color: #fff;">${perk.name}</span>
        <span style="font-size: 0.75rem; font-weight: 700; color: ${rarityColor}; background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 6px;">[${perk.rarity}]</span>
      </div>
      <div style="font-size: 0.8rem; color: #b2bec3; margin-top: 2px;">${perk.desc}</div>
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

function drawIsometricTile(gx, gy) {
  const top = gridToScreen(gx, gy);
  const right = gridToScreen(gx + 1, gy);
  const bottom = gridToScreen(gx + 1, gy + 1);
  const left = gridToScreen(gx, gy + 1);

  const isChecker = (gx + gy) % 2 === 0;

  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(bottom.x, bottom.y);
  ctx.lineTo(left.x, left.y);
  ctx.closePath();
  ctx.fillStyle = isChecker ? '#4cd137' : '#44bd32';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawDoghouse() {
  const pos = gridToScreen(1.2, 1.2);
  ctx.save();
  ctx.translate(pos.x, pos.y);

  const cosA = Math.cos(cameraAngle);
  const sinA = Math.sin(cameraAngle);
  const viewingBack = (cosA + sinA) < 0;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 28, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  if (viewingBack) {
    ctx.fillStyle = '#73431a';
    ctx.fillRect(-20, -24, 40, 26);

    ctx.strokeStyle = '#5c3413';
    ctx.lineWidth = 1.5;
    [-10, 0, 10].forEach(px => {
      ctx.beginPath();
      ctx.moveTo(px, -24);
      ctx.lineTo(px, 2);
      ctx.stroke();
    });

    ctx.fillStyle = '#345e82';
    ctx.beginPath();
    ctx.moveTo(-26, -22);
    ctx.lineTo(0, -40);
    ctx.lineTo(26, -22);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = '#8d5524';
    ctx.fillRect(-20, -24, 40, 26);

    ctx.fillStyle = '#171033';
    ctx.beginPath();
    ctx.arc(0, -10, 10, Math.PI, 0);
    ctx.lineTo(10, 2);
    ctx.lineTo(-10, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#40739e';
    ctx.beginPath();
    ctx.moveTo(-26, -22);
    ctx.lineTo(0, -40);
    ctx.lineTo(26, -22);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawTree() {
  const pos = gridToScreen(5.8, 1.2);
  ctx.save();
  ctx.translate(pos.x, pos.y);

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#795548';
  ctx.fillRect(-4, -18, 8, 20);

  ctx.fillStyle = '#27ae60';
  ctx.beginPath();
  ctx.arc(0, -26, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2ecc71';
  ctx.beginPath();
  ctx.arc(-6, -32, 12, 0, Math.PI * 2);
  ctx.arc(6, -32, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCustomTree(gx, gy) {
  const pos = getCenteredTilePos(gx, gy);
  ctx.save();
  ctx.translate(pos.x, pos.y);

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#795548';
  ctx.fillRect(-4, -18, 8, 20);

  ctx.fillStyle = '#27ae60';
  ctx.beginPath();
  ctx.arc(0, -26, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2ecc71';
  ctx.beginPath();
  ctx.arc(-6, -32, 12, 0, Math.PI * 2);
  ctx.arc(6, -32, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawFlowerPatch(gx, gy) {
  const pos = getCenteredTilePos(gx, gy);
  ctx.save();
  ctx.translate(pos.x, pos.y);

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

function drawWaterFountain(gx, gy, dt) {
  const pos = getCenteredTilePos(gx, gy);
  fountainAnimPhase += dt * 5;
  ctx.save();
  ctx.translate(pos.x, pos.y);

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#b2bec3';
  ctx.strokeStyle = '#636e72';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0984e3';
  ctx.beginPath();
  ctx.ellipse(0, -1, 13, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1;
  const rippleRadius = 3 + (Math.sin(fountainAnimPhase) + 1) * 4;
  ctx.beginPath();
  ctx.ellipse(0, -1, rippleRadius, rippleRadius * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#dfe6e9';
  ctx.fillRect(-3, -22, 6, 22);
  ctx.strokeStyle = '#b2bec3';
  ctx.strokeRect(-3, -22, 6, 22);

  ctx.fillStyle = '#b2bec3';
  ctx.beginPath();
  ctx.ellipse(0, -18, 9, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#74b9ff';
  ctx.beginPath();
  ctx.ellipse(0, -18.5, 7, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#dfe6e9';
  ctx.beginPath();
  ctx.arc(0, -26, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  const jetHeight = Math.abs(Math.sin(fountainAnimPhase * 2)) * 5;
  ctx.beginPath();
  ctx.arc(0, -29 - jetHeight, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(116, 185, 255, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-2, -26);
  ctx.quadraticCurveTo(-7, -22, -9, -18);
  ctx.moveTo(2, -26);
  ctx.quadraticCurveTo(7, -22, 9, -18);
  ctx.stroke();

  ctx.restore();
}

function drawMushroomCluster(m) {
  const pos = gridToScreen(m.gx, m.gy);
  ctx.save();
  ctx.translate(pos.x, pos.y);

  const grad = ctx.createRadialGradient(0, -6, 2, 0, -6, 24);
  grad.addColorStop(0, m.glow);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, -6, 24, 0, Math.PI * 2);
  ctx.fill();

  const offsets = [
    { x: -7, y: 2, s: 0.75 },
    { x: 7, y: 3, s: 0.7 },
    { x: 0, y: 0, s: 1.0 }
  ];

  offsets.forEach(o => {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(o.s, o.s);

    ctx.fillStyle = '#f5f6fa';
    ctx.fillRect(-2.5, -10, 5, 10);

    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(0, -10, 8, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  });

  ctx.restore();
}

function drawBoneSprite(x, y, isMagic) {
  ctx.save();
  ctx.translate(x, y);

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

function drawTennisBall() {
  if (!state.hasTennisBall) return;
  const pos = gridToScreen(tennisBall.gx, tennisBall.gy);
  ctx.save();
  ctx.translate(pos.x, pos.y);

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

function drawFrisbee() {
  if (!state.hasFrisbee) return;
  const pos = gridToScreen(frisbee.gx, frisbee.gy);
  ctx.save();
  ctx.translate(pos.x, pos.y);

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

function drawDuck() {
  if (!state.hasDuck) return;
  const pos = gridToScreen(duck.gx, duck.gy);
  ctx.save();
  ctx.translate(pos.x, pos.y);

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

function recruitDog(breed) {
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
    } else {
      sfx.upgrade();
    }

    updateUI();
    renderRosterTab();
    saveGame();
  }
}

document.getElementById('btnSummonAussie').addEventListener('click', () => recruitDog('aussie'));
document.getElementById('btnSummonBeagle').addEventListener('click', () => recruitDog('beagle'));
document.getElementById('btnSummonCollie').addEventListener('click', () => recruitDog('collie'));
document.getElementById('btnSummonHusky').addEventListener('click', () => recruitDog('husky'));
document.getElementById('btnSummonGolden').addEventListener('click', () => recruitDog('golden'));
document.getElementById('btnSummonShepherd').addEventListener('click', () => recruitDog('shepherd'));
document.getElementById('btnSummonShiba').addEventListener('click', () => recruitDog('shiba'));
document.getElementById('btnSummonLabrador').addEventListener('click', () => recruitDog('labrador'));

function buyTimedTreat(treatKey, costKey) {
  const cfg = TREAT_STACK_MAP[treatKey];
  const econ = TREAT_CONFIG[costKey];
  if (!cfg || !econ) return;
  const currentStacks = getTreatStacks(treatKey);
  if (currentStacks >= TIMED_TREAT_MAX_STACKS) return;

  const cost = state.costs[costKey];
  if (state.bones >= cost) {
    spendRegularBones(cost);
    state[cfg.stackKey] = currentStacks + 1;
    state[cfg.timerKey] = (Number(state[cfg.timerKey]) || 0) + cfg.duration;
    state.costs[costKey] = computeNextCappedCost(cost, econ.costMult, econ.priceCap);
    if (treatKey === 'feast') {
      state.feastAnimTimer = 1.5;
    }
    sfx.treat();
    updateUI();
    saveGame();
  }
}

document.getElementById('btnToyBones').addEventListener('click', () => {
  initAudio();
  if (state.digPower >= MAX_DIG_POWER) return;
  const econ = TOY_CONFIG.toyBones;
  if (state.bones >= state.costs.toyBones) {
    spendRegularBones(state.costs.toyBones);
    state.digPower = Math.min(MAX_DIG_POWER, Math.round(state.digPower + TENNIS_BALL_FLAT_GAIN));
    state.costs.toyBones = computeNextCappedCost(state.costs.toyBones, econ.costMult, econ.priceCap);
    state.hasTennisBall = true;
    sfx.upgrade();
    updateUI();
    saveGame();
  }
});

document.getElementById('btnToyIdle').addEventListener('click', () => {
  initAudio();
  const econ = TOY_CONFIG.toyIdle;
  if (state.bones >= state.costs.toyIdle && state.idleMultiplier < MAX_IDLE_MULTIPLIER) {
    spendRegularBones(state.costs.toyIdle);
    state.idleMultiplier = Math.min(MAX_IDLE_MULTIPLIER, Math.round((state.idleMultiplier + DUCK_IDLE_STEP) * 1000) / 1000);
    state.costs.toyIdle = computeNextCappedCost(state.costs.toyIdle, econ.costMult, econ.priceCap);
    state.hasDuck = true;
    sfx.upgrade();
    updateUI();
    saveGame();
  }
});

document.getElementById('btnToySpeed').addEventListener('click', () => {
  initAudio();
  if (state.speedMultiplier >= MAX_SPEED_MULTIPLIER) return;
  const econ = TOY_CONFIG.toySpeed;
  if (state.bones >= state.costs.toySpeed) {
    spendRegularBones(state.costs.toySpeed);
    state.speedMultiplier = Math.min(MAX_SPEED_MULTIPLIER, Math.round(state.speedMultiplier * FRISBEE_SPEED_STEP * 1000) / 1000);
    state.costs.toySpeed = computeNextCappedCost(state.costs.toySpeed, econ.costMult, econ.priceCap);
    state.hasFrisbee = true;
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

function formatStackedTreasureSummary(perk, count) {
  if (count <= 1) return perk.desc;
  const parts = [];
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

function formatTimedTreatCostLabel(cost, timer, treatKey, configKey) {
  const stacks = getTreatStacks(treatKey);
  const fallbackCost = TREAT_CONFIG[configKey]?.baseCost || 120;
  if (stacks >= TIMED_TREAT_MAX_STACKS) {
    const timePart = timer > 0 ? ` • ${Math.ceil(timer)}s` : '';
    return `MAX (${TIMED_TREAT_MAX_STACKS}x)${timePart}`;
  }
  const baseStr = `${(cost ?? fallbackCost).toLocaleString()} 🦴`;
  if (stacks > 0 && timer > 0) {
    return `${baseStr} • ${stacks}x (${Math.ceil(timer)}s)`;
  }
  if (timer > 0) {
    return `${baseStr} • ${Math.ceil(timer)}s`;
  }
  return baseStr;
}

function refreshTreatButtonTimers() {
  const costTreatXpEl = document.getElementById('costTreatXp');
  if (costTreatXpEl) {
    costTreatXpEl.textContent = formatTimedTreatCostLabel(state.costs.treatXp, state.xpTreatTimer, 'xp', 'treatXp');
  }

  const costTreatKongEl = document.getElementById('costTreatKong');
  if (costTreatKongEl) {
    costTreatKongEl.textContent = formatTimedTreatCostLabel(state.costs.treatKong, state.kongTimer, 'kong', 'treatKong');
  }

  const costTreatCupEl = document.getElementById('costTreatCup');
  if (costTreatCupEl) {
    costTreatCupEl.textContent = formatTimedTreatCostLabel(state.costs.treatCup, state.pupCupTimer, 'cup', 'treatCup');
  }

  const costTreatFeastEl = document.getElementById('costTreatFeast');
  if (costTreatFeastEl) {
    costTreatFeastEl.textContent = formatTimedTreatCostLabel(state.costs.treatFeast, state.feastTimer, 'feast', 'treatFeast');
  }

  const costTreatBaconEl = document.getElementById('costTreatBacon');
  if (costTreatBaconEl) {
    costTreatBaconEl.textContent = formatTimedTreatCostLabel(state.costs.treatBacon, state.baconTimer, 'bacon', 'treatBacon');
  }
}

function formatToyFlatBadge(bonusVal, totalVal) {
  const safeBonus = Math.max(0, Math.round(Number(bonusVal) || 0));
  const safeTotal = Math.max(0, Math.round(Number(totalVal) || 0));
  return `+${safeBonus} • ${safeTotal}`;
}

function formatToyBoostBadge(bonusRatio, totalRatio) {
  const safeBonus = Math.max(0, Number(bonusRatio) || 0);
  const safeTotal = Math.max(0, Number(totalRatio) || 0);
  const bonusPct = Math.round(safeBonus * 100);
  const totalPct = Math.round(safeTotal * 100);
  return `+${bonusPct}% • ${totalPct}%`;
}

function refreshToyBoostBadges() {
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

function updateUI() {
  document.getElementById('boneCount').textContent = Math.floor(state.bones).toLocaleString();
  document.getElementById('magicBoneCount').textContent = Math.floor(state.magicBones).toLocaleString();

  const total = getTotalDogs();
  const atDogCap = total >= MAX_DOGS;
  document.getElementById('miniDogs').textContent = `${total}/${MAX_DOGS}`;

  const nameTagLabel = document.getElementById('nameTagSettingLabel');
  if (nameTagLabel) {
    nameTagLabel.textContent = state.showNameTags ? 'ON' : 'OFF';
  }

  Object.keys(BREED_CONFIG).forEach(breed => {
    const capBreed = breed.charAt(0).toUpperCase() + breed.slice(1);
    const el = document.getElementById(`count${capBreed}`);
    if (el) {
      const breedTotal = state.roster.filter(d => d.breed === breed).length;
      el.textContent = breedTotal;
    }
    const costEl = document.getElementById(`cost${capBreed}`);
    if (costEl) {
      costEl.textContent = atDogCap ? `Park Full (${MAX_DOGS}/${MAX_DOGS})` : `${state.costs[breed].toLocaleString()} 🦴`;
    }
    const btnEl = document.getElementById(`btnSummon${capBreed}`);
    if (btnEl) {
      btnEl.disabled = atDogCap || state.bones < state.costs[breed];
    }
  });

  document.getElementById('perkCountDisplay').textContent = state.perks.length;

  const perkListContainer = document.getElementById('perkListContainer');
  if (perkListContainer) {
    perkListContainer.innerHTML = '';

    const groupedPerks = new Map();
    state.perks.forEach(p => {
      const key = p.id || `${p.name}::${p.rarity}`;
      if (!groupedPerks.has(key)) {
        groupedPerks.set(key, { perk: p, count: 1 });
      } else {
        groupedPerks.get(key).count += 1;
      }
    });

    groupedPerks.forEach(({ perk, count }) => {
      const div = document.createElement('div');
      div.className = 'shop-card';
      div.style.padding = '8px 12px';
      const countBadge = count > 1
        ? `<span style="font-size:0.75rem; font-weight:800; color:#ffeaa7; background:rgba(255,234,167,0.16); padding:2px 7px; border-radius:6px; margin-left:6px;">x${count}</span>`
        : '';
      const summaryDesc = formatStackedTreasureSummary(perk, count);

      div.innerHTML = `
        <div class="shop-info">
          <h4 style="color: #ffeaa7; font-size: 0.85rem; display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">
            <span>${perk.name}</span>
            ${countBadge}
            <span style="font-size:0.7rem; color:#a29bfe;">[${perk.rarity}]</span>
          </h4>
          <p style="font-size:0.7rem; margin:2px 0 0 0;">${summaryDesc}</p>
        </div>
      `;
      perkListContainer.appendChild(div);
    });
  }

  const treeCount = state.placedDecorations ? state.placedDecorations.filter(d => d.type === 'tree').length : 0;
  const flowerCount = state.placedDecorations ? state.placedDecorations.filter(d => d.type === 'flowers').length : 0;
  const fountainCount = state.placedDecorations ? state.placedDecorations.filter(d => d.type === 'fountain').length : 0;

  const ownedTree = state.decorInventory.tree || 0;
  const ownedFlowers = state.decorInventory.flowers || 0;
  const ownedFountain = state.decorInventory.fountain || 0;

  document.getElementById('ownedDecorTree').textContent = ownedTree;
  document.getElementById('countDecorTree').textContent = treeCount;

  document.getElementById('ownedDecorFlowers').textContent = ownedFlowers;
  document.getElementById('countDecorFlowers').textContent = flowerCount;

  document.getElementById('ownedDecorFountain').textContent = ownedFountain;
  document.getElementById('countDecorFountain').textContent = fountainCount;

  const btnBuyDecorTree = document.getElementById('btnBuyDecorTree');
  if (btnBuyDecorTree) {
    const atMaxTree = ownedTree >= 3;
    btnBuyDecorTree.disabled = state.magicBones < 500 || atMaxTree;
    if (atMaxTree) {
      btnBuyDecorTree.querySelector('.btn-name').textContent = 'Max Owned';
    } else {
      btnBuyDecorTree.querySelector('.btn-name').textContent = 'Buy Tree';
    }
  }

  const btnPlaceDecorTree = document.getElementById('btnPlaceDecorTree');
  if (btnPlaceDecorTree) {
    const unplacedTree = ownedTree - treeCount;
    if (treeCount >= 3) {
      btnPlaceDecorTree.querySelector('.btn-name').textContent = 'Max Placed';
      btnPlaceDecorTree.disabled = true;
    } else if (unplacedTree <= 0) {
      btnPlaceDecorTree.querySelector('.btn-name').textContent = 'Place';
      btnPlaceDecorTree.disabled = true;
    } else {
      btnPlaceDecorTree.querySelector('.btn-name').textContent = 'Place';
      btnPlaceDecorTree.disabled = false;
    }
  }

  const btnBuyDecorFlowers = document.getElementById('btnBuyDecorFlowers');
  if (btnBuyDecorFlowers) {
    const atMaxFlowers = ownedFlowers >= 5;
    btnBuyDecorFlowers.disabled = state.magicBones < 250 || atMaxFlowers;
    if (atMaxFlowers) {
      btnBuyDecorFlowers.querySelector('.btn-name').textContent = 'Max Owned';
    } else {
      btnBuyDecorFlowers.querySelector('.btn-name').textContent = 'Buy Flowers';
    }
  }

  const btnPlaceDecorFlowers = document.getElementById('btnPlaceDecorFlowers');
  if (btnPlaceDecorFlowers) {
    const unplacedFlowers = ownedFlowers - flowerCount;
    if (flowerCount >= 5) {
      btnPlaceDecorFlowers.querySelector('.btn-name').textContent = 'Max Placed';
      btnPlaceDecorFlowers.disabled = true;
    } else if (unplacedFlowers <= 0) {
      btnPlaceDecorFlowers.querySelector('.btn-name').textContent = 'Place';
      btnPlaceDecorFlowers.disabled = true;
    } else {
      btnPlaceDecorFlowers.querySelector('.btn-name').textContent = 'Place';
      btnPlaceDecorFlowers.disabled = false;
    }
  }

  const btnBuyDecorFountain = document.getElementById('btnBuyDecorFountain');
  if (btnBuyDecorFountain) {
    const atMaxFountain = ownedFountain >= 2;
    btnBuyDecorFountain.disabled = state.magicBones < 1000 || atMaxFountain;
    if (atMaxFountain) {
      btnBuyDecorFountain.querySelector('.btn-name').textContent = 'Max Owned';
    } else {
      btnBuyDecorFountain.querySelector('.btn-name').textContent = 'Buy Fountain';
    }
  }

  const btnPlaceDecorFountain = document.getElementById('btnPlaceDecorFountain');
  if (btnPlaceDecorFountain) {
    const unplacedFountain = ownedFountain - fountainCount;
    if (fountainCount >= 2) {
      btnPlaceDecorFountain.querySelector('.btn-name').textContent = 'Max Placed';
      btnPlaceDecorFountain.disabled = true;
    } else if (unplacedFountain <= 0) {
      btnPlaceDecorFountain.querySelector('.btn-name').textContent = 'Place';
      btnPlaceDecorFountain.disabled = true;
    } else {
      btnPlaceDecorFountain.querySelector('.btn-name').textContent = 'Place';
      btnPlaceDecorFountain.disabled = false;
    }
  }

  const trueBonesPerDig = getAverageBonesPerDig();
  const formattedTrueBones = Number.isInteger(trueBonesPerDig)
    ? trueBonesPerDig.toLocaleString()
    : trueBonesPerDig.toFixed(1);

  document.getElementById('bpsCount').textContent = `avg${formattedTrueBones}/dig`;

  const atDigPowerCap = state.digPower >= MAX_DIG_POWER;
  const atDuckCap = state.idleMultiplier >= MAX_IDLE_MULTIPLIER;
  const atSpeedCap = state.speedMultiplier >= MAX_SPEED_MULTIPLIER;

  refreshToyBoostBadges();

  document.getElementById('costToyBones').textContent = atDigPowerCap
    ? `MAX (${MAX_DIG_POWER})`
    : `${state.costs.toyBones.toLocaleString()} 🦴`;
  document.getElementById('costToyIdle').textContent = atDuckCap
    ? `MAX (${Math.round(MAX_IDLE_MULTIPLIER * 100)}%)`
    : `${state.costs.toyIdle.toLocaleString()} 🦴`;
  document.getElementById('costToySpeed').textContent = atSpeedCap
    ? `MAX (${MAX_SPEED_MULTIPLIER.toFixed(2)}x)`
    : `${state.costs.toySpeed.toLocaleString()} 🦴`;

  refreshTreatButtonTimers();

  document.getElementById('statDigPower').textContent = Number(state.digPower.toFixed(1));
  document.getElementById('statSpeed').textContent = `${getDigMultiplier().toFixed(1)}x`;
  document.getElementById('statChance').textContent = `${Math.round(Math.min(0.9, state.magicChance + getPerkMultipliers().magicBonus) * 100)}%`;
  const lifetimeEl = document.getElementById('statLifetimeBones');
  if (lifetimeEl) {
    lifetimeEl.textContent = Math.floor(state.lifetimeBones).toLocaleString();
  }

  document.getElementById('btnToyBones').disabled = state.bones < state.costs.toyBones || atDigPowerCap;
  document.getElementById('btnToyIdle').disabled = state.bones < state.costs.toyIdle || atDuckCap;
  document.getElementById('btnToySpeed').disabled = state.bones < state.costs.toySpeed || atSpeedCap;

  document.getElementById('btnTreatKong').disabled = state.bones < state.costs.treatKong || getTreatStacks('kong') >= TIMED_TREAT_MAX_STACKS;
  document.getElementById('btnTreatBacon').disabled = state.bones < state.costs.treatBacon || getTreatStacks('bacon') >= TIMED_TREAT_MAX_STACKS;
  document.getElementById('btnTreatFeast').disabled = state.bones < state.costs.treatFeast || getTreatStacks('feast') >= TIMED_TREAT_MAX_STACKS;
  document.getElementById('btnTreatCup').disabled = state.bones < state.costs.treatCup || getTreatStacks('cup') >= TIMED_TREAT_MAX_STACKS;

  const btnTreatXpEl = document.getElementById('btnTreatXp');
  if (btnTreatXpEl) {
    btnTreatXpEl.disabled = state.bones < (state.costs.treatXp || TREAT_CONFIG.treatXp.baseCost) || getTreatStacks('xp') >= TIMED_TREAT_MAX_STACKS;
  }

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

loadGame();

let lastTime = performance.now();
let lastRosterUiRefresh = 0;
function loop(now) {
  try {
    const rawDt = (now - lastTime) / 1000;
    lastTime = now;
    const dt = rawDt > 1 ? 0.016 : Math.min(0.05, Math.max(0, rawDt));

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

    if (
      Math.ceil(state.kongTimer) !== prevKongCeil ||
      Math.ceil(state.baconTimer) !== prevBaconCeil ||
      Math.ceil(state.pupCupTimer) !== prevCupCeil ||
      Math.ceil(state.xpTreatTimer) !== prevXpCeil ||
      Math.ceil(state.feastTimer) !== prevFeastCeil
    ) {
      refreshTreatButtonTimers();
    }

    if (state.feastAnimTimer > 0) state.feastAnimTimer = Math.max(0, state.feastAnimTimer - dt);

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
          const walker = dogs[Math.floor(Math.random() * dogs.length)];
          walker.targetGx = tennisBall.gx;
          walker.targetGy = tennisBall.gy;
          walker.state = 'WALK';
          walker.onReachToy = () => {
            sfx.squeak();
            tennisBall.isRolling = true;
            tennisBall.targetGx = Math.max(0.7, Math.min(GRID_SIZE - 0.7, tennisBall.gx + (Math.random() - 0.5) * 3.5));
            tennisBall.targetGy = Math.max(0.7, Math.min(GRID_SIZE - 0.7, tennisBall.gy + (Math.random() - 0.5) * 3.5));
          };
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
          const walker = dogs[Math.floor(Math.random() * dogs.length)];
          walker.targetGx = frisbee.gx;
          walker.targetGy = frisbee.gy;
          walker.state = 'WALK';
          walker.onReachToy = () => {
            sfx.shiny();
            frisbee.isMoving = true;
            frisbee.targetGx = Math.max(0.7, Math.min(GRID_SIZE - 0.7, frisbee.gx + (Math.random() - 0.5) * 3.5));
            frisbee.targetGy = Math.max(0.7, Math.min(GRID_SIZE - 0.7, frisbee.gy + (Math.random() - 0.5) * 3.5));
          };
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
          const walker = dogs[Math.floor(Math.random() * dogs.length)];
          walker.targetGx = duck.gx;
          walker.targetGy = duck.gy;
          walker.state = 'WALK';
          walker.onReachToy = () => {
            sfx.quack();
            duck.isMoved = true;
            duck.targetGx = Math.max(0.7, Math.min(GRID_SIZE - 0.7, duck.gx + (Math.random() - 0.5) * 2.5));
            duck.targetGy = Math.max(0.7, Math.min(GRID_SIZE - 0.7, duck.gy + (Math.random() - 0.5) * 2.5));
          };
        }
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let gx = 0; gx < GRID_SIZE; gx++) {
      for (let gy = 0; gy < GRID_SIZE; gy++) {
        drawIsometricTile(gx, gy);
      }
    }

    const renderables = [];
    renderables.push({ sortY: gridToScreen(1.2, 1.2).y, draw: drawDoghouse });
    renderables.push({ sortY: gridToScreen(5.8, 1.2).y, draw: drawTree });

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
            draw: () => drawWaterFountain(dec.gx, dec.gy, dt)
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

    mushrooms.forEach(m => {
      renderables.push({
        sortY: gridToScreen(m.gx, m.gy).y,
        draw: () => drawMushroomCluster(m)
      });
    });

    dogs.forEach(dog => {
      dog.update(dt);
      renderables.push({
        sortY: gridToScreen(dog.gx, dog.gy).y,
        draw: () => dog.draw(ctx)
      });
    });

    renderables.sort((a, b) => a.sortY - b.sortY);
    renderables.forEach(item => {
      if (item && typeof item.draw === 'function') {
        item.draw();
      }
    });

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
        bx = dPos.x + (b.dog.facingRight ? 14 : -14);
        by = dPos.y + b.baseOffsetY - floatUp;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.font = '800 11px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
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
      ctx.strokeStyle = 'rgba(255, 234, 167, 0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(hx, hy, 26, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 234, 167, 0.25)';
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
        const targetX = 35;
        const targetY = 32;
        b.x += (targetX - b.x) * 6 * dt;
        b.y += (targetY - b.y) * 6 * dt;

        if (Math.hypot(targetX - b.x, targetY - b.y) < 18) {
          if (b.isMagic) {
            addMagicBones(1);
            sfx.magicCollect();
          } else {
            addRegularBones(b.value);
            sfx.collect();
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
      p.vy += 120 * dt;

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
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    const rosterTab = document.getElementById('tab-roster');
    const isPointerDownInRoster = containerHasActivePointer(rosterTab);
    if (
      gameModal.style.display === 'flex' &&
      rosterTab &&
      rosterTab.classList.contains('active') &&
      document.activeElement?.tagName !== 'INPUT' &&
      !isPointerDownInRoster &&
      now - lastRosterUiRefresh > 900
    ) {
      lastRosterUiRefresh = now;
      renderRosterTab();
    }
  } catch (err) {
    console.error("Game loop error caught:", err);
  }

  requestAnimationFrame(loop);
}

function containerHasActivePointer(container) {
  if (!container) return false;
  return Boolean(container.querySelector('button:active'));
}

updateUI();
requestAnimationFrame(loop);

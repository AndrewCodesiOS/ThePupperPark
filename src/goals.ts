export type AchievementCategory = 'bones' | 'pack' | 'park' | 'relics';

export type AchievementFilter = 'all' | AchievementCategory;

export interface GoalSnapshot {
  lifetimeBones: number;
  lifetimeMagicBones: number;
  bones: number;
  boneCapReached: boolean;
  rosterCount: number;
  everFullPack: boolean;
  maxDogLevel: number;
  shinyCountNow: number;
  totalShiniesFound: number;
  hasLegendBreed: boolean;
  hasKomondor: boolean;
  totalPets: number;
  totalTreats: number;
  toysOwnedCount: number;
  hasMaxedToy: boolean;
  everJoyful: boolean;
  everEcstatic: boolean;
  placedDecorCount: number;
  decorFloorBonus: number;
  maxHappinessCap: number;
  hasManor: boolean;
  hasSlide: boolean;
  parkExpanded: boolean;
  uniqueRelicsCount: number;
  completedSetsCount: number;
  hasDiamondBowl: boolean;
  hasMaxRankRelic: boolean;
  activePlaySeconds: number;
}

export interface AchievementDef {
  id: string;
  category: AchievementCategory;
  icon: string;
  title: string;
  desc: string;
  target: number;
  rewardMagic: number;
  format?: 'number' | 'minutes' | 'percent';
  getValue: (snap: GoalSnapshot) => number;
}

export type DailyGoalMetric =
  | 'digs'
  | 'magicDigs'
  | 'pets'
  | 'treats'
  | 'whistles'
  | 'taps'
  | 'activeMinutes'
  | 'bonesEarned'
  | 'joyfulReached';

export interface DailyGoalDef {
  id: string;
  metric: DailyGoalMetric;
  icon: string;
  title: string;
  desc: string;
  target: number;
  rewardMagic: number;
  format?: 'number' | 'minutes';
}

export interface DailyGoalsState {
  dateKey: string;
  progress: Record<string, number>;
  claimed: Record<string, boolean>;
  bonusClaimed: boolean;
}

export const DAILY_BONUS_MAGIC = 50;

export const ACHIEVEMENT_CATEGORIES: Array<{ id: AchievementFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'bones', label: 'Bones' },
  { id: 'pack', label: 'Pack' },
  { id: 'park', label: 'Park' },
  { id: 'relics', label: 'Relics' }
];

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Bones & Economy (7) ──
  {
    id: 'ach_bones_1k',
    category: 'bones',
    icon: '🦴',
    title: 'First Stash',
    desc: 'Earn 1,000 lifetime bones across digs, taps, and adventures.',
    target: 1000,
    rewardMagic: 10,
    getValue: s => Math.floor(s.lifetimeBones)
  },
  {
    id: 'ach_bones_100k',
    category: 'bones',
    icon: '💰',
    title: 'Bone Tycoon',
    desc: 'Earn 100,000 lifetime bones.',
    target: 100000,
    rewardMagic: 25,
    getValue: s => Math.floor(s.lifetimeBones)
  },
  {
    id: 'ach_bones_1m',
    category: 'bones',
    icon: '🏆',
    title: 'Millionaire Mutt',
    desc: 'Earn 1,000,000 lifetime bones.',
    target: 1000000,
    rewardMagic: 60,
    getValue: s => Math.floor(s.lifetimeBones)
  },
  {
    id: 'ach_bones_5m',
    category: 'bones',
    icon: '👑',
    title: 'Five-Million Legend',
    desc: 'Earn 5,000,000 lifetime bones.',
    target: 5000000,
    rewardMagic: 125,
    getValue: s => Math.floor(s.lifetimeBones)
  },
  {
    id: 'ach_bone_cap',
    category: 'bones',
    icon: '🏦',
    title: 'Vault Overflow',
    desc: 'Fill your bone stash all the way to the 5,000,000 Bone Cap.',
    target: 1,
    rewardMagic: 100,
    getValue: s => (s.boneCapReached || s.bones >= 5000000 ? 1 : 0)
  },
  {
    id: 'ach_magic_1k',
    category: 'bones',
    icon: '✨',
    title: 'Magic Collector',
    desc: 'Collect 1,000 lifetime ✨ Magic Bones.',
    target: 1000,
    rewardMagic: 35,
    getValue: s => Math.floor(s.lifetimeMagicBones)
  },
  {
    id: 'ach_magic_25k',
    category: 'bones',
    icon: '🌟',
    title: 'Arcane Hoarder',
    desc: 'Collect 25,000 lifetime ✨ Magic Bones.',
    target: 25000,
    rewardMagic: 150,
    getValue: s => Math.floor(s.lifetimeMagicBones)
  },

  // ── Pack & Pups (9) ──
  {
    id: 'ach_full_pack',
    category: 'pack',
    icon: '🐾',
    title: 'First Full Pack',
    desc: 'Recruit a full park of 6 active pups at once.',
    target: 6,
    rewardMagic: 40,
    getValue: s => (s.everFullPack ? 6 : Math.min(6, s.rosterCount))
  },
  {
    id: 'ach_shiny_1',
    category: 'pack',
    icon: '💫',
    title: 'Sparkling Pup',
    desc: 'Discover your very first rare Shiny pup.',
    target: 1,
    rewardMagic: 50,
    getValue: s => Math.max(s.shinyCountNow, s.totalShiniesFound)
  },
  {
    id: 'ach_shiny_3',
    category: 'pack',
    icon: '🌈',
    title: 'Glittering Pack',
    desc: 'Discover 3 Shiny pups across recruiting or rerolls.',
    target: 3,
    rewardMagic: 150,
    getValue: s => Math.max(s.shinyCountNow, s.totalShiniesFound)
  },
  {
    id: 'ach_lvl_10',
    category: 'pack',
    icon: '⭐',
    title: 'Rising Star',
    desc: 'Level any pup up to Level 10.',
    target: 10,
    rewardMagic: 20,
    getValue: s => s.maxDogLevel
  },
  {
    id: 'ach_lvl_50',
    category: 'pack',
    icon: '🏅',
    title: 'Seasoned Digger',
    desc: 'Level any pup up to Level 50.',
    target: 50,
    rewardMagic: 65,
    getValue: s => s.maxDogLevel
  },
  {
    id: 'ach_lvl_100',
    category: 'pack',
    icon: '🎖️',
    title: 'Centurion Pup',
    desc: 'Train a pup all the way to the max Level 100.',
    target: 100,
    rewardMagic: 175,
    getValue: s => s.maxDogLevel
  },
  {
    id: 'ach_legend_breed',
    category: 'pack',
    icon: '🦁',
    title: 'Legend in the Park',
    desc: 'Recruit any breed from the Legends tier.',
    target: 1,
    rewardMagic: 75,
    getValue: s => (s.hasLegendBreed ? 1 : 0)
  },
  {
    id: 'ach_komondor',
    category: 'pack',
    icon: '👑',
    title: 'Crown of Cords',
    desc: 'Recruit the legendary Komondor to lead your park.',
    target: 1,
    rewardMagic: 150,
    getValue: s => (s.hasKomondor ? 1 : 0)
  },
  {
    id: 'ach_pets_25',
    category: 'pack',
    icon: '💗',
    title: 'Belly Rub Champion',
    desc: 'Pet your pups 25 times.',
    target: 25,
    rewardMagic: 25,
    getValue: s => Math.floor(s.totalPets)
  },

  // ── Park, Decor, Toys & Mood (12) ──
  {
    id: 'ach_toys_all',
    category: 'park',
    icon: '🎾',
    title: 'Toy Box Complete',
    desc: 'Own the Tennis Ball, Rubber Duck, and Frisbee.',
    target: 3,
    rewardMagic: 30,
    getValue: s => s.toysOwnedCount
  },
  {
    id: 'ach_toy_max',
    category: 'park',
    icon: '⚡',
    title: 'Maxed-Out Gear',
    desc: 'Upgrade any park toy to max level to unlock Fresh Toy boosts.',
    target: 1,
    rewardMagic: 65,
    getValue: s => (s.hasMaxedToy ? 1 : 0)
  },
  {
    id: 'ach_treats_15',
    category: 'park',
    icon: '🍖',
    title: 'Treat Dispenser',
    desc: 'Give 15 treats (Happy Snaps or shop treats) to your pack.',
    target: 15,
    rewardMagic: 25,
    getValue: s => Math.floor(s.totalTreats)
  },
  {
    id: 'ach_mood_joyful',
    category: 'park',
    icon: '😄',
    title: 'Joyful Pack',
    desc: 'Raise Pack Happiness to Joyful (70%+).',
    target: 1,
    rewardMagic: 20,
    getValue: s => (s.everJoyful ? 1 : 0)
  },
  {
    id: 'ach_mood_ecstatic',
    category: 'park',
    icon: '🤩',
    title: 'Pure Ecstasy',
    desc: 'Decorate your park and reach Ecstatic (90%+) Pack Happiness.',
    target: 1,
    rewardMagic: 90,
    getValue: s => (s.everEcstatic ? 1 : 0)
  },
  {
    id: 'ach_decor_1',
    category: 'park',
    icon: '🌸',
    title: 'First Touch',
    desc: 'Place your first Park Decoration.',
    target: 1,
    rewardMagic: 15,
    getValue: s => s.placedDecorCount
  },
  {
    id: 'ach_decor_5',
    category: 'park',
    icon: '🌳',
    title: 'Park Designer',
    desc: 'Have 5 Park Decorations placed at once.',
    target: 5,
    rewardMagic: 40,
    getValue: s => s.placedDecorCount
  },
  {
    id: 'ach_decor_slide',
    category: 'park',
    icon: '🛝',
    title: 'Playground Fun',
    desc: 'Place the Dog Slide in your park.',
    target: 1,
    rewardMagic: 40,
    getValue: s => (s.hasSlide ? 1 : 0)
  },
  {
    id: 'ach_decor_ecstatic_unlock',
    category: 'park',
    icon: '🏡',
    title: 'Garden Architect',
    desc: 'Reach +10% Decor Floor to unlock 90% Max Happiness (Ecstatic).',
    target: 10,
    rewardMagic: 75,
    format: 'percent',
    getValue: s => Math.floor(s.decorFloorBonus)
  },
  {
    id: 'ach_expand_park',
    category: 'park',
    icon: '🗺️',
    title: 'Wide Open Pastures',
    desc: 'Expand your park from 7×7 to the grand 8×8 layout.',
    target: 1,
    rewardMagic: 75,
    getValue: s => (s.parkExpanded ? 1 : 0)
  },
  {
    id: 'ach_manor',
    category: 'park',
    icon: '🏰',
    title: 'Grand Estate',
    desc: 'Build the Grand Doghouse Manor in your park.',
    target: 1,
    rewardMagic: 150,
    getValue: s => (s.hasManor ? 1 : 0)
  },
  {
    id: 'ach_decor_sanctuary',
    category: 'park',
    icon: '✨',
    title: 'Dream Sanctuary',
    desc: 'Reach 100% Max Happiness (+20% Decor Floor from placed decor).',
    target: 20,
    rewardMagic: 175,
    format: 'percent',
    getValue: s => Math.floor(s.decorFloorBonus)
  },

  // ── Relics & Dedication (6) ──
  {
    id: 'ach_relic_1',
    category: 'relics',
    icon: '🏺',
    title: 'Relic Hunter',
    desc: 'Uncover your first park Treasure relic.',
    target: 1,
    rewardMagic: 20,
    getValue: s => s.uniqueRelicsCount
  },
  {
    id: 'ach_relic_10',
    category: 'relics',
    icon: '💎',
    title: 'Curator',
    desc: 'Discover 10 unique Treasure relics.',
    target: 10,
    rewardMagic: 65,
    getValue: s => s.uniqueRelicsCount
  },
  {
    id: 'ach_relic_set',
    category: 'relics',
    icon: '📜',
    title: 'Master Archaeologist',
    desc: 'Complete any 4-piece Treasure Set to activate its Set Bonus.',
    target: 1,
    rewardMagic: 100,
    getValue: s => s.completedSetsCount
  },
  {
    id: 'ach_diamond_bowl',
    category: 'relics',
    icon: '💠',
    title: 'Diamond Bowl',
    desc: 'Uncover the mythic Diamond Bowl relic.',
    target: 1,
    rewardMagic: 150,
    getValue: s => (s.hasDiamondBowl ? 1 : 0)
  },
  {
    id: 'ach_relic_max_rank',
    category: 'relics',
    icon: '🔥',
    title: 'Relic Perfection',
    desc: 'Upgrade any Treasure relic to Rank V (MAX).',
    target: 1,
    rewardMagic: 90,
    getValue: s => (s.hasMaxRankRelic ? 1 : 0)
  },
  {
    id: 'ach_active_60m',
    category: 'relics',
    icon: '⏱️',
    title: 'Dedicated Caretaker',
    desc: 'Spend 60 active minutes hanging out with your pack.',
    target: 60,
    rewardMagic: 40,
    format: 'minutes',
    getValue: s => Math.floor(s.activePlaySeconds / 60)
  }
];

const DAILY_GOAL_POOLS: DailyGoalDef[][] = [
  // Pool 1: Digging & Magic
  [
    {
      id: 'daily_digs_15',
      metric: 'digs',
      icon: '🐾',
      title: 'Busy Paws',
      desc: 'Complete 15 digs (pups or grass taps).',
      target: 15,
      rewardMagic: 10
    },
    {
      id: 'daily_digs_30',
      metric: 'digs',
      icon: '⛏️',
      title: 'Digging Spree',
      desc: 'Complete 30 digs (pups or grass taps).',
      target: 30,
      rewardMagic: 15
    },
    {
      id: 'daily_magic_4',
      metric: 'magicDigs',
      icon: '✨',
      title: 'Sparkle Sniffer',
      desc: 'Collect 4 ✨ Magic Bones from digs or taps.',
      target: 4,
      rewardMagic: 15
    },
    {
      id: 'daily_magic_8',
      metric: 'magicDigs',
      icon: '🌟',
      title: 'Arcane Trail',
      desc: 'Collect 8 ✨ Magic Bones from digs or taps.',
      target: 8,
      rewardMagic: 20
    }
  ],
  // Pool 2: Care & Bonding
  [
    {
      id: 'daily_pets_5',
      metric: 'pets',
      icon: '💗',
      title: 'Belly Rub Time',
      desc: 'Pet your pups 5 times.',
      target: 5,
      rewardMagic: 10
    },
    {
      id: 'daily_pets_10',
      metric: 'pets',
      icon: '🥰',
      title: 'Best Friends',
      desc: 'Pet your pups 10 times.',
      target: 10,
      rewardMagic: 15
    },
    {
      id: 'daily_treats_2',
      metric: 'treats',
      icon: '🍖',
      title: "Snack O'Clock",
      desc: 'Give 2 treats (Happy Snaps or shop treats).',
      target: 2,
      rewardMagic: 12
    },
    {
      id: 'daily_joyful',
      metric: 'joyfulReached',
      icon: '😄',
      title: 'Happy Tails',
      desc: 'Reach Joyful mood (70%+) with your pack today.',
      target: 1,
      rewardMagic: 15
    }
  ],
  // Pool 3: Active Park Interaction
  [
    {
      id: 'daily_taps_10',
      metric: 'taps',
      icon: '🌿',
      title: 'Helping Hand',
      desc: 'Tap the park grass 10 times to dig up bones.',
      target: 10,
      rewardMagic: 10
    },
    {
      id: 'daily_taps_20',
      metric: 'taps',
      icon: '🪴',
      title: 'Green Thumb',
      desc: 'Tap the park grass 20 times to dig up bones.',
      target: 20,
      rewardMagic: 15
    },
    {
      id: 'daily_whistles_3',
      metric: 'whistles',
      icon: '📣',
      title: 'Pack Leader',
      desc: 'Call your pack together 3 times with the Whistle.',
      target: 3,
      rewardMagic: 10
    },
    {
      id: 'daily_whistles_5',
      metric: 'whistles',
      icon: '🎵',
      title: 'Park Rally',
      desc: 'Call your pack together 5 times with the Whistle.',
      target: 5,
      rewardMagic: 15
    }
  ],
  // Pool 4: Time & Harvest
  [
    {
      id: 'daily_active_3',
      metric: 'activeMinutes',
      icon: '⏱️',
      title: 'Quick Visit',
      desc: 'Spend 3 active minutes in PupperPark today.',
      target: 3,
      rewardMagic: 10,
      format: 'minutes'
    },
    {
      id: 'daily_active_8',
      metric: 'activeMinutes',
      icon: '☀️',
      title: 'Park Stroll',
      desc: 'Spend 8 active minutes in PupperPark today.',
      target: 8,
      rewardMagic: 18,
      format: 'minutes'
    },
    {
      id: 'daily_bones_250',
      metric: 'bonesEarned',
      icon: '🦴',
      title: 'Morning Haul',
      desc: 'Earn 250 🦴 Bones in the park today.',
      target: 250,
      rewardMagic: 12
    },
    {
      id: 'daily_bones_1500',
      metric: 'bonesEarned',
      icon: '💰',
      title: 'Bone Harvest',
      desc: 'Earn 1,500 🦴 Bones in the park today.',
      target: 1500,
      rewardMagic: 18
    }
  ]
];

export function getLocalDateKey(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getMsUntilLocalMidnight(nowMs: number = Date.now()): number {
  const d = new Date(nowMs);
  const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, nextMidnight.getTime() - nowMs);
}

export function formatCountdownToMidnight(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${Math.max(1, mins)}m`;
}

function hashDateString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getDailyGoalsForDate(dateKey: string): DailyGoalDef[] {
  const seed = hashDateString(dateKey);
  return DAILY_GOAL_POOLS.map((pool, idx) => {
    const pick = hashDateString(`${dateKey}:${idx}:${seed}`) % pool.length;
    return pool[pick];
  });
}

export function createEmptyDailyGoalsState(dateKey: string = getLocalDateKey()): DailyGoalsState {
  return {
    dateKey,
    progress: {},
    claimed: {},
    bonusClaimed: false
  };
}

export function formatGoalProgress(
  current: number,
  target: number,
  format?: 'number' | 'minutes' | 'percent'
): string {
  const clamped = Math.max(0, Math.min(target, Math.floor(current)));
  if (format === 'minutes') {
    return `${clamped}m / ${target}m`;
  }
  if (format === 'percent') {
    return `+${clamped}% / +${target}%`;
  }
  return `${clamped.toLocaleString()} / ${target.toLocaleString()}`;
}

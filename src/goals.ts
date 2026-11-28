import type { GoalIconId } from './goalIcons';

export type AchievementCategory = 'bones' | 'pack' | 'park' | 'relics';

export type AchievementFilter = 'all' | AchievementCategory;

export interface GoalSnapshot {
  lifetimeBones: number;
  lifetimeMagicBones: number;
  bones: number;
  boneCapReached: boolean;
  totalDigs: number;
  totalTaps: number;
  rosterCount: number;
  everFullPack: boolean;
  maxDogLevel: number;
  totalPackLevels: number;
  shinyCountNow: number;
  totalShiniesFound: number;
  hasFieldBreed: boolean;
  hasNobleBreed: boolean;
  hasLegendBreed: boolean;
  hasKomondor: boolean;
  uniqueBreedsCount: number;
  totalPets: number;
  totalRerolls: number;
  hasMaxRollPup: boolean;
  totalTreats: number;
  totalWhistles: number;
  toysOwnedCount: number;
  maxedToysCount: number;
  hasMaxedToy: boolean;
  totalFreshToyBoosts: number;
  everJoyful: boolean;
  everEcstatic: boolean;
  placedDecorCount: number;
  decorFloorBonus: number;
  maxHappinessCap: number;
  hasManor: boolean;
  hasSlide: boolean;
  hasGoldenHydrant: boolean;
  parkExpanded: boolean;
  unlockedTilesCount: number;
  unlockedManorColorsCount: number;
  uniqueRelicsCount: number;
  completedSetsCount: number;
  totalRelicRanks: number;
  hasDiamondBowl: boolean;
  hasMaxRankRelic: boolean;
  activePlaySeconds: number;
  totalCheckIns: number;
  bestCheckInStreak: number;
  totalDailyGoalsClaimed: number;
  totalDailyBonusesClaimed: number;
}

export interface AchievementDef {
  id: string;
  category: AchievementCategory;
  icon: GoalIconId;
  title: string;
  desc: string;
  target: number;
  rewardMagic: number;
  format?: 'number' | 'minutes' | 'percent';
  getValue: (snap: GoalSnapshot) => number;
}

export type DailyGoalMetric =
  | 'checkIns'
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
  icon: GoalIconId;
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
  lastCheckInAt?: number;
}

/** Minimum interval between separate visits for the 3x Daily Check-In goal (2 hours). */
export const CHECKIN_COOLDOWN_MS = 2 * 60 * 60 * 1000;

export const DAILY_BONUS_MAGIC = 60;

export const ACHIEVEMENT_CATEGORIES: Array<{ id: AchievementFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'bones', label: 'Bones' },
  { id: 'pack', label: 'Pack' },
  { id: 'park', label: 'Park' },
  { id: 'relics', label: 'Relics' }
];

export const ACHIEVEMENTS: AchievementDef[] = [
  // ════════════════════════════════════════════════════════════════
  // ── Bones & Economy (25) ──
  // ════════════════════════════════════════════════════════════════
  {
    id: 'ach_bones_1k',
    category: 'bones',
    icon: 'bone',
    title: 'First Stash',
    desc: 'Earn 1,000 lifetime bones across digs, taps, and adventures.',
    target: 1000,
    rewardMagic: 10,
    getValue: s => Math.floor(s.lifetimeBones)
  },
  {
    id: 'ach_bones_10k',
    category: 'bones',
    icon: 'bone',
    title: 'Bone Collector',
    desc: 'Earn 10,000 lifetime bones.',
    target: 10000,
    rewardMagic: 15,
    getValue: s => Math.floor(s.lifetimeBones)
  },
  {
    id: 'ach_bones_50k',
    category: 'bones',
    icon: 'bonePile',
    title: 'Buried Fortune',
    desc: 'Earn 50,000 lifetime bones.',
    target: 50000,
    rewardMagic: 20,
    getValue: s => Math.floor(s.lifetimeBones)
  },
  {
    id: 'ach_bones_100k',
    category: 'bones',
    icon: 'bonePile',
    title: 'Bone Tycoon',
    desc: 'Earn 100,000 lifetime bones.',
    target: 100000,
    rewardMagic: 25,
    getValue: s => Math.floor(s.lifetimeBones)
  },
  {
    id: 'ach_bones_500k',
    category: 'bones',
    icon: 'trophy',
    title: 'Half-Million Hound',
    desc: 'Earn 500,000 lifetime bones.',
    target: 500000,
    rewardMagic: 40,
    getValue: s => Math.floor(s.lifetimeBones)
  },
  {
    id: 'ach_bones_1m',
    category: 'bones',
    icon: 'trophy',
    title: 'Millionaire Mutt',
    desc: 'Earn 1,000,000 lifetime bones.',
    target: 1000000,
    rewardMagic: 60,
    getValue: s => Math.floor(s.lifetimeBones)
  },
  {
    id: 'ach_bones_5m',
    category: 'bones',
    icon: 'crown',
    title: 'Five-Million Legend',
    desc: 'Earn 5,000,000 lifetime bones.',
    target: 5000000,
    rewardMagic: 90,
    getValue: s => Math.floor(s.lifetimeBones)
  },
  {
    id: 'ach_bones_25m',
    category: 'bones',
    icon: 'crown',
    title: 'Meadow Magnate',
    desc: 'Earn 25,000,000 lifetime bones.',
    target: 25000000,
    rewardMagic: 120,
    getValue: s => Math.floor(s.lifetimeBones)
  },
  {
    id: 'ach_bones_100m',
    category: 'bones',
    icon: 'vault',
    title: 'Century Treasury',
    desc: 'Earn 100,000,000 lifetime bones.',
    target: 100000000,
    rewardMagic: 150,
    getValue: s => Math.floor(s.lifetimeBones)
  },
  {
    id: 'ach_bones_500m',
    category: 'bones',
    icon: 'crown',
    title: 'Mythic Bone Baron',
    desc: 'Earn 250,000,000 lifetime bones.',
    target: 250000000,
    rewardMagic: 225,
    getValue: s => Math.floor(s.lifetimeBones)
  },
  {
    id: 'ach_bone_cap',
    category: 'bones',
    icon: 'vault',
    title: 'Vault Overflow',
    desc: 'Fill your bone stash all the way to the 50,000,000 Bone Cap.',
    target: 1,
    rewardMagic: 125,
    getValue: s => (s.boneCapReached || s.bones >= 50000000 ? 1 : 0)
  },
  {
    id: 'ach_magic_50',
    category: 'bones',
    icon: 'magicBone',
    title: 'First Sparkle',
    desc: 'Collect 50 lifetime Magic Bones.',
    target: 50,
    rewardMagic: 5,
    getValue: s => Math.floor(s.lifetimeMagicBones)
  },
  {
    id: 'ach_magic_250',
    category: 'bones',
    icon: 'magicBone',
    title: 'Starlight Stash',
    desc: 'Collect 250 lifetime Magic Bones.',
    target: 250,
    rewardMagic: 15,
    getValue: s => Math.floor(s.lifetimeMagicBones)
  },
  {
    id: 'ach_magic_1k',
    category: 'bones',
    icon: 'magicBone',
    title: 'Magic Collector',
    desc: 'Collect 1,000 lifetime Magic Bones.',
    target: 1000,
    rewardMagic: 25,
    getValue: s => Math.floor(s.lifetimeMagicBones)
  },
  {
    id: 'ach_magic_5k',
    category: 'bones',
    icon: 'arcaneStar',
    title: 'Mystic Pouch',
    desc: 'Collect 5,000 lifetime Magic Bones.',
    target: 5000,
    rewardMagic: 45,
    getValue: s => Math.floor(s.lifetimeMagicBones)
  },
  {
    id: 'ach_magic_10k',
    category: 'bones',
    icon: 'arcaneStar',
    title: 'Enchanted Hoard',
    desc: 'Collect 10,000 lifetime Magic Bones.',
    target: 10000,
    rewardMagic: 70,
    getValue: s => Math.floor(s.lifetimeMagicBones)
  },
  {
    id: 'ach_magic_25k',
    category: 'bones',
    icon: 'arcaneStar',
    title: 'Arcane Hoarder',
    desc: 'Collect 25,000 lifetime Magic Bones.',
    target: 25000,
    rewardMagic: 110,
    getValue: s => Math.floor(s.lifetimeMagicBones)
  },
  {
    id: 'ach_magic_100k',
    category: 'bones',
    icon: 'arcaneStar',
    title: 'Grand Sorcerer Vault',
    desc: 'Collect 50,000 lifetime Magic Bones.',
    target: 50000,
    rewardMagic: 200,
    getValue: s => Math.floor(s.lifetimeMagicBones)
  },
  {
    id: 'ach_digs_50',
    category: 'bones',
    icon: 'shovel',
    title: 'Fresh Paws',
    desc: 'Complete 50 lifetime digs (pups or grass taps).',
    target: 50,
    rewardMagic: 5,
    getValue: s => Math.floor(s.totalDigs)
  },
  {
    id: 'ach_digs_250',
    category: 'bones',
    icon: 'shovel',
    title: 'Backyard Excavator',
    desc: 'Complete 250 lifetime digs.',
    target: 250,
    rewardMagic: 15,
    getValue: s => Math.floor(s.totalDigs)
  },
  {
    id: 'ach_digs_1k',
    category: 'bones',
    icon: 'shovel',
    title: 'Meadow Miner',
    desc: 'Complete 1,000 lifetime digs.',
    target: 1000,
    rewardMagic: 25,
    getValue: s => Math.floor(s.totalDigs)
  },
  {
    id: 'ach_digs_5k',
    category: 'bones',
    icon: 'shovel',
    title: 'Tireless Diggers',
    desc: 'Complete 5,000 lifetime digs.',
    target: 5000,
    rewardMagic: 50,
    getValue: s => Math.floor(s.totalDigs)
  },
  {
    id: 'ach_digs_25k',
    category: 'bones',
    icon: 'shovel',
    title: 'Endless Excavation',
    desc: 'Complete 25,000 lifetime digs.',
    target: 25000,
    rewardMagic: 100,
    getValue: s => Math.floor(s.totalDigs)
  },
  {
    id: 'ach_taps_100',
    category: 'bones',
    icon: 'grassTap',
    title: 'Turf Tapper',
    desc: 'Tap the park grass 100 times to unearth bones.',
    target: 100,
    rewardMagic: 10,
    getValue: s => Math.floor(s.totalTaps)
  },
  {
    id: 'ach_taps_1k',
    category: 'bones',
    icon: 'grassTap',
    title: 'Meadow Maestro',
    desc: 'Tap the park grass 1,000 times to unearth bones.',
    target: 1000,
    rewardMagic: 35,
    getValue: s => Math.floor(s.totalTaps)
  },

  // ════════════════════════════════════════════════════════════════
  // ── Pack & Pups (25) ──
  // ════════════════════════════════════════════════════════════════
  {
    id: 'ach_pack_3',
    category: 'pack',
    icon: 'pawPack',
    title: 'Growing Pack',
    desc: 'Have 3 active pups roaming your park at once.',
    target: 3,
    rewardMagic: 10,
    getValue: s => (s.everFullPack ? 3 : Math.min(3, s.rosterCount))
  },
  {
    id: 'ach_full_pack',
    category: 'pack',
    icon: 'pawPack',
    title: 'First Full Pack',
    desc: 'Recruit a full starter park of 6 active pups at once.',
    target: 6,
    rewardMagic: 35,
    getValue: s => (s.everFullPack ? 6 : Math.min(6, s.rosterCount))
  },
  {
    id: 'ach_lvl_10',
    category: 'pack',
    icon: 'starMedal',
    title: 'Rising Star',
    desc: 'Train any pup up to Level 10.',
    target: 10,
    rewardMagic: 15,
    getValue: s => s.maxDogLevel
  },
  {
    id: 'ach_lvl_25',
    category: 'pack',
    icon: 'starMedal',
    title: 'Trail Blazer',
    desc: 'Train any pup up to Level 25.',
    target: 25,
    rewardMagic: 25,
    getValue: s => s.maxDogLevel
  },
  {
    id: 'ach_lvl_50',
    category: 'pack',
    icon: 'ribbonMedal',
    title: 'Seasoned Digger',
    desc: 'Train any pup up to Level 50.',
    target: 50,
    rewardMagic: 40,
    getValue: s => s.maxDogLevel
  },
  {
    id: 'ach_lvl_100',
    category: 'pack',
    icon: 'centurionCrest',
    title: 'Centurion Pup',
    desc: 'Train any pup up to Level 100.',
    target: 100,
    rewardMagic: 65,
    getValue: s => s.maxDogLevel
  },
  {
    id: 'ach_lvl_250',
    category: 'pack',
    icon: 'ribbonMedal',
    title: 'Quarter-Millennium Pup',
    desc: 'Train any pup up to Level 250.',
    target: 250,
    rewardMagic: 95,
    getValue: s => s.maxDogLevel
  },
  {
    id: 'ach_lvl_500',
    category: 'pack',
    icon: 'level500Crest',
    title: 'Grandmaster Pup',
    desc: 'Train any pup up to Level 500.',
    target: 500,
    rewardMagic: 140,
    getValue: s => s.maxDogLevel
  },
  {
    id: 'ach_lvl_1000',
    category: 'pack',
    icon: 'level1000Crest',
    title: 'Apex Legend',
    desc: 'Train a pup all the way to the max Level 1,000.',
    target: 1000,
    rewardMagic: 200,
    getValue: s => s.maxDogLevel
  },
  {
    id: 'ach_pack_lvl_500',
    category: 'pack',
    icon: 'pawPack',
    title: 'Veteran Pack',
    desc: 'Reach 500 combined levels across your active pack.',
    target: 500,
    rewardMagic: 55,
    getValue: s => Math.floor(s.totalPackLevels)
  },
  {
    id: 'ach_shiny_1',
    category: 'pack',
    icon: 'shinyPup',
    title: 'Sparkling Pup',
    desc: 'Discover your very first rare Shiny pup.',
    target: 1,
    rewardMagic: 35,
    getValue: s => Math.max(s.shinyCountNow, s.totalShiniesFound)
  },
  {
    id: 'ach_shiny_3',
    category: 'pack',
    icon: 'shinyPack',
    title: 'Glittering Pack',
    desc: 'Discover 3 Shiny pups across recruiting or rerolls.',
    target: 3,
    rewardMagic: 80,
    getValue: s => Math.max(s.shinyCountNow, s.totalShiniesFound)
  },
  {
    id: 'ach_shiny_6',
    category: 'pack',
    icon: 'shinyPack',
    title: 'Radiant Six',
    desc: 'Discover 6 Shiny pups across recruiting or rerolls.',
    target: 6,
    rewardMagic: 140,
    getValue: s => Math.max(s.shinyCountNow, s.totalShiniesFound)
  },
  {
    id: 'ach_field_breed',
    category: 'pack',
    icon: 'starMedal',
    title: 'Field Companion',
    desc: 'Recruit any breed from the Field tier.',
    target: 1,
    rewardMagic: 15,
    getValue: s => (s.hasFieldBreed ? 1 : 0)
  },
  {
    id: 'ach_noble_breed',
    category: 'pack',
    icon: 'ribbonMedal',
    title: 'Noble Hound',
    desc: 'Recruit any breed from the Noble tier.',
    target: 1,
    rewardMagic: 30,
    getValue: s => (s.hasNobleBreed ? 1 : 0)
  },
  {
    id: 'ach_legend_breed',
    category: 'pack',
    icon: 'legendShield',
    title: 'Legend in the Park',
    desc: 'Recruit any breed from the Legends tier.',
    target: 1,
    rewardMagic: 55,
    getValue: s => (s.hasLegendBreed ? 1 : 0)
  },
  {
    id: 'ach_komondor',
    category: 'pack',
    icon: 'komondor',
    title: 'Crown of Cords',
    desc: 'Recruit the legendary Komondor to lead your park.',
    target: 1,
    rewardMagic: 100,
    getValue: s => (s.hasKomondor ? 1 : 0)
  },
  {
    id: 'ach_breeds_10',
    category: 'pack',
    icon: 'pawPack',
    title: 'Breed Enthusiast',
    desc: 'Recruit 10 different dog breeds over your journey.',
    target: 10,
    rewardMagic: 25,
    getValue: s => s.uniqueBreedsCount
  },
  {
    id: 'ach_breeds_25',
    category: 'pack',
    icon: 'legendShield',
    title: 'Kennel Curator',
    desc: 'Recruit 25 different dog breeds over your journey.',
    target: 25,
    rewardMagic: 65,
    getValue: s => s.uniqueBreedsCount
  },
  {
    id: 'ach_breeds_40',
    category: 'pack',
    icon: 'crown',
    title: 'Complete Encyclopedia',
    desc: 'Recruit all 40 unique dog breeds in PupperPark.',
    target: 40,
    rewardMagic: 150,
    getValue: s => s.uniqueBreedsCount
  },
  {
    id: 'ach_pets_25',
    category: 'pack',
    icon: 'heart',
    title: 'Belly Rub Champion',
    desc: 'Pet your pups 25 times.',
    target: 25,
    rewardMagic: 15,
    getValue: s => Math.floor(s.totalPets)
  },
  {
    id: 'ach_pets_150',
    category: 'pack',
    icon: 'heart',
    title: 'Beloved Caretaker',
    desc: 'Pet your pups 150 times.',
    target: 150,
    rewardMagic: 35,
    getValue: s => Math.floor(s.totalPets)
  },
  {
    id: 'ach_pets_500',
    category: 'pack',
    icon: 'heart',
    title: 'Endless Affection',
    desc: 'Pet your pups 500 times.',
    target: 500,
    rewardMagic: 70,
    getValue: s => Math.floor(s.totalPets)
  },
  {
    id: 'ach_rerolls_5',
    category: 'pack',
    icon: 'dice',
    title: 'Stat Shuffler',
    desc: 'Reroll pup bonus stats 5 times.',
    target: 5,
    rewardMagic: 25,
    getValue: s => Math.floor(s.totalRerolls)
  },
  {
    id: 'ach_roll_max',
    category: 'pack',
    icon: 'dice',
    title: 'Max Roll Wonder',
    desc: 'Have a pup with a rare Max Roll stat grade in your pack.',
    target: 1,
    rewardMagic: 60,
    getValue: s => (s.hasMaxRollPup ? 1 : 0)
  },

  // ════════════════════════════════════════════════════════════════
  // ── Park, Decor, Toys & Mood (25) ──
  // ════════════════════════════════════════════════════════════════
  {
    id: 'ach_toy_1',
    category: 'park',
    icon: 'tennisBall',
    title: 'Playtime Begins',
    desc: 'Purchase your first park toy.',
    target: 1,
    rewardMagic: 10,
    getValue: s => Math.min(1, s.toysOwnedCount)
  },
  {
    id: 'ach_toys_all',
    category: 'park',
    icon: 'tennisBall',
    title: 'Toy Box Complete',
    desc: 'Own the Tennis Ball, Rubber Duck, and Frisbee.',
    target: 3,
    rewardMagic: 25,
    getValue: s => s.toysOwnedCount
  },
  {
    id: 'ach_toy_max',
    category: 'park',
    icon: 'freshToy',
    title: 'Maxed-Out Gear',
    desc: 'Upgrade any park toy to max level to unlock Fresh Toy boosts.',
    target: 1,
    rewardMagic: 45,
    getValue: s => (s.hasMaxedToy ? 1 : 0)
  },
  {
    id: 'ach_toys_all_max',
    category: 'park',
    icon: 'freshToy',
    title: 'Toy Master',
    desc: 'Upgrade all 3 park toys to their maximum level.',
    target: 3,
    rewardMagic: 90,
    getValue: s => s.maxedToysCount
  },
  {
    id: 'ach_fresh_toys_5',
    category: 'park',
    icon: 'freshToy',
    title: 'Fresh Off the Shelf',
    desc: 'Activate 5 Fresh Toy boosts.',
    target: 5,
    rewardMagic: 35,
    getValue: s => Math.floor(s.totalFreshToyBoosts)
  },
  {
    id: 'ach_treats_15',
    category: 'park',
    icon: 'treat',
    title: 'Treat Dispenser',
    desc: 'Give 15 treats (Happy Snaps or shop treats) to your pack.',
    target: 15,
    rewardMagic: 15,
    getValue: s => Math.floor(s.totalTreats)
  },
  {
    id: 'ach_treats_75',
    category: 'park',
    icon: 'treat',
    title: 'Gourmet Chef',
    desc: 'Give 75 treats to your pack.',
    target: 75,
    rewardMagic: 35,
    getValue: s => Math.floor(s.totalTreats)
  },
  {
    id: 'ach_treats_250',
    category: 'park',
    icon: 'treat',
    title: 'Five-Star Bakery',
    desc: 'Give 250 treats to your pack.',
    target: 250,
    rewardMagic: 70,
    getValue: s => Math.floor(s.totalTreats)
  },
  {
    id: 'ach_mood_joyful',
    category: 'park',
    icon: 'happyMood',
    title: 'Joyful Pack',
    desc: 'Raise Pack Happiness to Joyful (70%+).',
    target: 1,
    rewardMagic: 15,
    getValue: s => (s.everJoyful ? 1 : 0)
  },
  {
    id: 'ach_mood_ecstatic',
    category: 'park',
    icon: 'ecstaticMood',
    title: 'Pure Ecstasy',
    desc: 'Decorate your park and reach Ecstatic (90%+) Pack Happiness.',
    target: 1,
    rewardMagic: 60,
    getValue: s => (s.everEcstatic ? 1 : 0)
  },
  {
    id: 'ach_whistles_10',
    category: 'park',
    icon: 'whistle',
    title: 'Come Here, Pups!',
    desc: 'Call your pack together 10 times with the Whistle.',
    target: 10,
    rewardMagic: 10,
    getValue: s => Math.floor(s.totalWhistles)
  },
  {
    id: 'ach_whistles_50',
    category: 'park',
    icon: 'whistle',
    title: 'Whistle Virtuoso',
    desc: 'Call your pack together 50 times with the Whistle.',
    target: 50,
    rewardMagic: 25,
    getValue: s => Math.floor(s.totalWhistles)
  },
  {
    id: 'ach_whistles_250',
    category: 'park',
    icon: 'whistle',
    title: 'Chorus of Barks',
    desc: 'Call your pack together 250 times with the Whistle.',
    target: 250,
    rewardMagic: 55,
    getValue: s => Math.floor(s.totalWhistles)
  },
  {
    id: 'ach_decor_1',
    category: 'park',
    icon: 'flowerPatch',
    title: 'First Touch',
    desc: 'Place your first Park Decoration.',
    target: 1,
    rewardMagic: 10,
    getValue: s => s.placedDecorCount
  },
  {
    id: 'ach_decor_5',
    category: 'park',
    icon: 'parkTree',
    title: 'Park Designer',
    desc: 'Have 5 Park Decorations placed at once.',
    target: 5,
    rewardMagic: 30,
    getValue: s => s.placedDecorCount
  },
  {
    id: 'ach_decor_10',
    category: 'park',
    icon: 'parkTree',
    title: 'Landscaper',
    desc: 'Have 10 Park Decorations placed at once.',
    target: 10,
    rewardMagic: 50,
    getValue: s => s.placedDecorCount
  },
  {
    id: 'ach_decor_15',
    category: 'park',
    icon: 'gardenArch',
    title: 'Grand Landscaper',
    desc: 'Have 15 Park Decorations placed at once.',
    target: 15,
    rewardMagic: 75,
    getValue: s => s.placedDecorCount
  },
  {
    id: 'ach_decor_slide',
    category: 'park',
    icon: 'dogSlide',
    title: 'Playground Fun',
    desc: 'Place the Dog Slide in your park.',
    target: 1,
    rewardMagic: 30,
    getValue: s => (s.hasSlide ? 1 : 0)
  },
  {
    id: 'ach_decor_golden_hydrant',
    category: 'park',
    icon: 'trophy',
    title: 'Gilded Landmark',
    desc: 'Place the Golden Fire Hydrant in your park.',
    target: 1,
    rewardMagic: 65,
    getValue: s => (s.hasGoldenHydrant ? 1 : 0)
  },
  {
    id: 'ach_decor_ecstatic_unlock',
    category: 'park',
    icon: 'gardenArch',
    title: 'Garden Architect',
    desc: 'Reach +10% Decor Floor to unlock 90% Max Happiness (Ecstatic).',
    target: 10,
    rewardMagic: 50,
    format: 'percent',
    getValue: s => Math.floor(s.decorFloorBonus)
  },
  {
    id: 'ach_decor_sanctuary',
    category: 'park',
    icon: 'sanctuary',
    title: 'Dream Sanctuary',
    desc: 'Reach 100% Max Happiness (+20% Decor Floor from placed decor).',
    target: 20,
    rewardMagic: 110,
    format: 'percent',
    getValue: s => Math.floor(s.decorFloorBonus)
  },
  {
    id: 'ach_expand_park',
    category: 'park',
    icon: 'parkMap',
    title: 'Wide Open Pastures',
    desc: 'Expand your park to the grand 8×8 layout and unlock 8 active pup slots.',
    target: 1,
    rewardMagic: 100,
    getValue: s => (s.parkExpanded ? 1 : 0)
  },
  {
    id: 'ach_manor',
    category: 'park',
    icon: 'manor',
    title: 'Grand Estate',
    desc: 'Build the Grand Doghouse Manor in your park.',
    target: 1,
    rewardMagic: 100,
    getValue: s => (s.hasManor ? 1 : 0)
  },
  {
    id: 'ach_tiles_all',
    category: 'park',
    icon: 'paintBrush',
    title: 'Groundskeeper',
    desc: 'Unlock all 3 custom Ground Tile styles (Cobble, Sand, Clover).',
    target: 3,
    rewardMagic: 45,
    getValue: s => s.unlockedTilesCount
  },
  {
    id: 'ach_manor_color',
    category: 'park',
    icon: 'paintBrush',
    title: 'Fresh Coat of Paint',
    desc: 'Unlock any custom color theme for the Grand Doghouse Manor.',
    target: 1,
    rewardMagic: 40,
    getValue: s => Math.min(1, s.unlockedManorColorsCount)
  },

  // ════════════════════════════════════════════════════════════════
  // ── Relics & Dedication (25) ──
  // ════════════════════════════════════════════════════════════════
  {
    id: 'ach_relic_1',
    category: 'relics',
    icon: 'relicUrn',
    title: 'Relic Hunter',
    desc: 'Uncover your first park Treasure relic.',
    target: 1,
    rewardMagic: 15,
    getValue: s => s.uniqueRelicsCount
  },
  {
    id: 'ach_relic_5',
    category: 'relics',
    icon: 'relicUrn',
    title: 'Treasure Seeker',
    desc: 'Discover 5 unique Treasure relics.',
    target: 5,
    rewardMagic: 30,
    getValue: s => s.uniqueRelicsCount
  },
  {
    id: 'ach_relic_10',
    category: 'relics',
    icon: 'relicGem',
    title: 'Curator',
    desc: 'Discover 10 unique Treasure relics.',
    target: 10,
    rewardMagic: 50,
    getValue: s => s.uniqueRelicsCount
  },
  {
    id: 'ach_relic_16',
    category: 'relics',
    icon: 'relicGem',
    title: 'Complete Museum',
    desc: 'Discover all 16 unique Treasure relics.',
    target: 16,
    rewardMagic: 100,
    getValue: s => s.uniqueRelicsCount
  },
  {
    id: 'ach_relic_set',
    category: 'relics',
    icon: 'relicScroll',
    title: 'Master Archaeologist',
    desc: 'Complete any 4-piece Treasure Set to activate its Set Bonus.',
    target: 1,
    rewardMagic: 65,
    getValue: s => s.completedSetsCount
  },
  {
    id: 'ach_relic_set_2',
    category: 'relics',
    icon: 'relicScroll',
    title: 'Twin Collections',
    desc: 'Complete 2 different 4-piece Treasure Sets.',
    target: 2,
    rewardMagic: 90,
    getValue: s => s.completedSetsCount
  },
  {
    id: 'ach_relic_set_4',
    category: 'relics',
    icon: 'relicScroll',
    title: 'Grand Archivist',
    desc: 'Complete all 4 Treasure Sets across the entire museum.',
    target: 4,
    rewardMagic: 150,
    getValue: s => s.completedSetsCount
  },
  {
    id: 'ach_relic_ranks_10',
    category: 'relics',
    icon: 'relicFlame',
    title: 'Rising Relics',
    desc: 'Earn 10 total Treasure relic ranks.',
    target: 10,
    rewardMagic: 25,
    getValue: s => s.totalRelicRanks
  },
  {
    id: 'ach_relic_ranks_40',
    category: 'relics',
    icon: 'relicFlame',
    title: 'Gleaming Vault',
    desc: 'Earn 40 total Treasure relic ranks.',
    target: 40,
    rewardMagic: 75,
    getValue: s => s.totalRelicRanks
  },
  {
    id: 'ach_relic_ranks_80',
    category: 'relics',
    icon: 'crown',
    title: 'Relic Sovereign',
    desc: 'Max out all 16 Treasure relics (80 total ranks).',
    target: 80,
    rewardMagic: 250,
    getValue: s => s.totalRelicRanks
  },
  {
    id: 'ach_relic_max_rank',
    category: 'relics',
    icon: 'relicFlame',
    title: 'Relic Perfection',
    desc: 'Upgrade any Treasure relic to Rank V (MAX).',
    target: 1,
    rewardMagic: 65,
    getValue: s => (s.hasMaxRankRelic ? 1 : 0)
  },
  {
    id: 'ach_diamond_bowl',
    category: 'relics',
    icon: 'diamondBowl',
    title: 'Diamond Bowl',
    desc: 'Uncover the Legendary Diamond Bowl relic.',
    target: 1,
    rewardMagic: 100,
    getValue: s => (s.hasDiamondBowl ? 1 : 0)
  },
  {
    id: 'ach_active_15m',
    category: 'relics',
    icon: 'clock',
    title: 'Settling In',
    desc: 'Spend 15 active minutes hanging out with your pack.',
    target: 15,
    rewardMagic: 10,
    format: 'minutes',
    getValue: s => Math.floor(s.activePlaySeconds / 60)
  },
  {
    id: 'ach_active_60m',
    category: 'relics',
    icon: 'clock',
    title: 'Dedicated Caretaker',
    desc: 'Spend 60 active minutes hanging out with your pack.',
    target: 60,
    rewardMagic: 25,
    format: 'minutes',
    getValue: s => Math.floor(s.activePlaySeconds / 60)
  },
  {
    id: 'ach_active_300m',
    category: 'relics',
    icon: 'clock',
    title: 'Park Regular',
    desc: 'Spend 300 active minutes (5 hours) with your pack.',
    target: 300,
    rewardMagic: 60,
    format: 'minutes',
    getValue: s => Math.floor(s.activePlaySeconds / 60)
  },
  {
    id: 'ach_active_1440m',
    category: 'relics',
    icon: 'clock',
    title: 'Park Devotee',
    desc: 'Spend 1,440 active minutes (24 hours) with your pack.',
    target: 1440,
    rewardMagic: 125,
    format: 'minutes',
    getValue: s => Math.floor(s.activePlaySeconds / 60)
  },
  {
    id: 'ach_checkins_5',
    category: 'relics',
    icon: 'calendar',
    title: 'Friendly Neighbor',
    desc: 'Complete 5 park check-ins.',
    target: 5,
    rewardMagic: 15,
    getValue: s => Math.floor(s.totalCheckIns)
  },
  {
    id: 'ach_checkins_25',
    category: 'relics',
    icon: 'calendar',
    title: 'Daily Visitor',
    desc: 'Complete 25 park check-ins.',
    target: 25,
    rewardMagic: 35,
    getValue: s => Math.floor(s.totalCheckIns)
  },
  {
    id: 'ach_checkins_100',
    category: 'relics',
    icon: 'calendar',
    title: 'Loyal Caretaker',
    desc: 'Complete 100 park check-ins.',
    target: 100,
    rewardMagic: 80,
    getValue: s => Math.floor(s.totalCheckIns)
  },
  {
    id: 'ach_streak_3',
    category: 'relics',
    icon: 'calendar',
    title: 'Three-Day Habit',
    desc: 'Check in to PupperPark 3 days in a row.',
    target: 3,
    rewardMagic: 20,
    getValue: s => Math.floor(s.bestCheckInStreak)
  },
  {
    id: 'ach_streak_7',
    category: 'relics',
    icon: 'calendar',
    title: 'Weekly Routine',
    desc: 'Check in to PupperPark 7 days in a row.',
    target: 7,
    rewardMagic: 45,
    getValue: s => Math.floor(s.bestCheckInStreak)
  },
  {
    id: 'ach_streak_30',
    category: 'relics',
    icon: 'calendar',
    title: 'Park Pillar',
    desc: 'Check in to PupperPark 30 days in a row.',
    target: 30,
    rewardMagic: 125,
    getValue: s => Math.floor(s.bestCheckInStreak)
  },
  {
    id: 'ach_daily_claimed_10',
    category: 'relics',
    icon: 'giftChest',
    title: 'Goal Getter',
    desc: 'Claim 10 Daily Goals.',
    target: 10,
    rewardMagic: 20,
    getValue: s => Math.floor(s.totalDailyGoalsClaimed)
  },
  {
    id: 'ach_daily_claimed_50',
    category: 'relics',
    icon: 'giftChest',
    title: 'Task Master',
    desc: 'Claim 50 Daily Goals.',
    target: 50,
    rewardMagic: 55,
    getValue: s => Math.floor(s.totalDailyGoalsClaimed)
  },
  {
    id: 'ach_daily_bonus_7',
    category: 'relics',
    icon: 'giftChest',
    title: 'Perfect Week',
    desc: 'Claim the Daily Completion Bonus 7 times.',
    target: 7,
    rewardMagic: 85,
    getValue: s => Math.floor(s.totalDailyBonusesClaimed)
  }
];

const FIXED_DAILY_GOALS: DailyGoalDef[] = [
  {
    id: 'daily_checkin_1',
    metric: 'checkIns',
    icon: 'calendar',
    title: 'Daily Check-In',
    desc: 'Check in to PupperPark today.',
    target: 1,
    rewardMagic: 10
  },
  {
    id: 'daily_checkin_3',
    metric: 'checkIns',
    icon: 'calendar',
    title: 'Triple Check-In',
    desc: 'Check in 3 separate times today (2h between visits).',
    target: 3,
    rewardMagic: 20
  }
];

const DAILY_GOAL_POOLS: DailyGoalDef[][] = [
  // Pool 1: Digging & Magic
  [
    {
      id: 'daily_digs_45',
      metric: 'digs',
      icon: 'pawPack',
      title: 'Busy Paws',
      desc: 'Complete 45 digs (pups or grass taps).',
      target: 45,
      rewardMagic: 15
    },
    {
      id: 'daily_digs_85',
      metric: 'digs',
      icon: 'shovel',
      title: 'Digging Marathon',
      desc: 'Complete 85 digs (pups or grass taps).',
      target: 85,
      rewardMagic: 25
    },
    {
      id: 'daily_magic_10',
      metric: 'magicDigs',
      icon: 'magicBone',
      title: 'Sparkle Sniffer',
      desc: 'Collect 10 Magic Bones from digs or taps.',
      target: 10,
      rewardMagic: 18
    },
    {
      id: 'daily_magic_20',
      metric: 'magicDigs',
      icon: 'arcaneStar',
      title: 'Arcane Trail',
      desc: 'Collect 20 Magic Bones from digs or taps.',
      target: 20,
      rewardMagic: 28
    }
  ],
  // Pool 2: Care & Bonding
  [
    {
      id: 'daily_pets_15',
      metric: 'pets',
      icon: 'heart',
      title: 'Belly Rub Time',
      desc: 'Pet your pups 15 times.',
      target: 15,
      rewardMagic: 15
    },
    {
      id: 'daily_pets_30',
      metric: 'pets',
      icon: 'heart',
      title: 'Best Friends',
      desc: 'Pet your pups 30 times.',
      target: 30,
      rewardMagic: 25
    },
    {
      id: 'daily_treats_4',
      metric: 'treats',
      icon: 'treat',
      title: "Snack O'Clock",
      desc: 'Give 4 treats (Happy Snaps or shop treats).',
      target: 4,
      rewardMagic: 18
    },
    {
      id: 'daily_treats_6',
      metric: 'treats',
      icon: 'treat',
      title: 'Treat Feast',
      desc: 'Give 6 treats (Happy Snaps or shop treats).',
      target: 6,
      rewardMagic: 25
    }
  ],
  // Pool 3: Active Park Interaction
  [
    {
      id: 'daily_taps_30',
      metric: 'taps',
      icon: 'grassTap',
      title: 'Helping Hand',
      desc: 'Tap the park grass 30 times to dig up bones.',
      target: 30,
      rewardMagic: 15
    },
    {
      id: 'daily_taps_60',
      metric: 'taps',
      icon: 'grassTap',
      title: 'Green Thumb',
      desc: 'Tap the park grass 60 times to dig up bones.',
      target: 60,
      rewardMagic: 25
    },
    {
      id: 'daily_whistles_6',
      metric: 'whistles',
      icon: 'whistle',
      title: 'Pack Leader',
      desc: 'Call your pack together 6 times with the Whistle.',
      target: 6,
      rewardMagic: 15
    },
    {
      id: 'daily_whistles_10',
      metric: 'whistles',
      icon: 'whistle',
      title: 'Park Rally',
      desc: 'Call your pack together 10 times with the Whistle.',
      target: 10,
      rewardMagic: 25
    }
  ],
  // Pool 4: Time & Harvest
  [
    {
      id: 'daily_active_10',
      metric: 'activeMinutes',
      icon: 'clock',
      title: 'Park Stroll',
      desc: 'Spend 10 active minutes in PupperPark today.',
      target: 10,
      rewardMagic: 18,
      format: 'minutes'
    },
    {
      id: 'daily_active_20',
      metric: 'activeMinutes',
      icon: 'clock',
      title: 'Quality Time',
      desc: 'Spend 20 active minutes in PupperPark today.',
      target: 20,
      rewardMagic: 28,
      format: 'minutes'
    },
    {
      id: 'daily_bones_1500',
      metric: 'bonesEarned',
      icon: 'bone',
      title: 'Daily Haul',
      desc: 'Earn 1,500 Bones in the park today.',
      target: 1500,
      rewardMagic: 18
    },
    {
      id: 'daily_bones_5000',
      metric: 'bonesEarned',
      icon: 'bonePile',
      title: 'Bone Harvest',
      desc: 'Earn 5,000 Bones in the park today.',
      target: 5000,
      rewardMagic: 28
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

export function getPreviousLocalDateKey(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  return getLocalDateKey(prev.getTime());
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
  const rotating = DAILY_GOAL_POOLS.map((pool, idx) => {
    const pick = hashDateString(`${dateKey}:${idx}:${seed}`) % pool.length;
    return pool[pick];
  });
  return [...FIXED_DAILY_GOALS, ...rotating];
}

export function createEmptyDailyGoalsState(dateKey: string = getLocalDateKey()): DailyGoalsState {
  return {
    dateKey,
    progress: {},
    claimed: {},
    bonusClaimed: false,
    lastCheckInAt: 0
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

export type BreedTier = 'small' | 'working' | 'athletic' | 'giant';

export type BreedStatKey =
  | 'boneYield'
  | 'packGrowth'
  | 'walk'
  | 'dig'
  | 'xp'
  | 'magic'
  | 'treasure';

export type BreedWeatherId = 'sunny' | 'windy' | 'rain' | 'twilight';

export interface BreedWeatherAffinity {
  weather: BreedWeatherId;
  paceBonus?: number;
  boneBonus?: number;
  magicAdd?: number;
  xpBonus?: number;
}

export interface BreedTraitSpec {
  name: string;
  summary: string;
  luckyDigChance?: number;
  luckyDigMult?: number;
  extraMagicChance?: number;
  napChanceMult?: number;
  napDurationMult?: number;
  digSpeedBonus?: number;
  quickBurrowEvery?: number;
  digStreakStep?: number;
  digStreakMax?: number;
  tapHypePaceBonus?: number;
  tapHypeDuration?: number;
  cozyFloorAdd?: number;
  moodDecayMult?: number;
  offlineBonus?: number;
  offlineMagicPerDay?: number;
  weatherAffinity?: BreedWeatherAffinity;
  packBoneAura?: number;
  packPaceAura?: number;
  packXpAura?: number;
  packMagicAura?: number;
  packGrowthAura?: number;
  packTreasureAura?: number;
  personalTreasureMult?: number;
  treatBoneBonus?: number;
  treatDigSpeedBonus?: number;
  petMoodBonus?: number;
  petXpMult?: number;
  whistlePaceBonus?: number;
  whistleDuration?: number;
  playXpMult?: number;
  playMoodBonus?: number;
  levelBonusRate?: number;
  happyMoodBoneBonus?: number;
  drinkBoostDurationMult?: number;
}

export interface BreedDefinition {
  key: string;
  name: string;
  shortLabel: string;
  tier: BreedTier;
  rank: number;
  role: string;
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
  barkPitch: number;
  sizeClass: 'toy' | 'standard' | 'giant';
  highlights: readonly [BreedStatKey, BreedStatKey, BreedStatKey, BreedStatKey];
  trait: BreedTraitSpec;
}

export const BREED_ECONOMY_VERSION = 3;

export const BASE_TREASURE_CHANCE = 0.00008;

export const BREED_TIER_TABS: ReadonlyArray<{
  id: 'all' | BreedTier;
  label: string;
}> = [
  { id: 'all', label: 'All' },
  { id: 'small', label: 'Small' },
  { id: 'working', label: 'Working' },
  { id: 'athletic', label: 'Athletic' },
  { id: 'giant', label: 'Giants' }
];

export const BREED_LIST: readonly BreedDefinition[] = [
  // =========================================================================
  // TIER 1 — SMALL COMPANIONS (9 breeds)
  // =========================================================================
  {
    key: 'chihuahua',
    name: 'Chihuahua',
    shortLabel: 'Chihuahua',
    tier: 'small',
    rank: 1,
    role: 'Zippy pocket sprinter that barely pauses to rest.',
    cost: 50,
    costMult: 1.20,
    priceCap: 5000,
    walkMult: 1.24,
    digSec: 1.56,
    payoutMult: 0.95,
    scalingMult: 1.00,
    xpMult: 1.06,
    magicBonus: 0.005,
    treasureChance: 0.00008,
    barkPitch: 720,
    sizeClass: 'toy',
    highlights: ['walk', 'dig', 'xp', 'magic'],
    trait: {
      name: 'Tiny Dynamo',
      summary: '40% less likely to nap after digging.',
      napChanceMult: 0.60
    }
  },
  {
    key: 'pomeranian',
    name: 'Pomeranian',
    shortLabel: 'Pomeranian',
    tier: 'small',
    rank: 2,
    role: 'Plush little cheerleader that lifts pack morale and learns quickly.',
    cost: 110,
    costMult: 1.20,
    priceCap: 8500,
    walkMult: 1.18,
    digSec: 1.52,
    payoutMult: 1.00,
    scalingMult: 1.04,
    xpMult: 1.14,
    magicBonus: 0.012,
    treasureChance: 0.00010,
    barkPitch: 690,
    sizeClass: 'toy',
    highlights: ['walk', 'dig', 'xp', 'magic'],
    trait: {
      name: 'Fluff Charm',
      summary: '+2 Cozy Floor to park mood while in pack.',
      cozyFloorAdd: 2
    }
  },
  {
    key: 'yorkie',
    name: 'Yorkshire Terrier',
    shortLabel: 'Yorkie',
    tier: 'small',
    rank: 3,
    role: 'Feisty little digger with crisp speed and 2x treasure odds.',
    cost: 220,
    costMult: 1.21,
    priceCap: 14000,
    walkMult: 1.20,
    digSec: 1.42,
    payoutMult: 1.06,
    scalingMult: 1.06,
    xpMult: 1.10,
    magicBonus: 0.010,
    treasureChance: 0.00016,
    barkPitch: 660,
    sizeClass: 'toy',
    highlights: ['walk', 'dig', 'xp', 'treasure'],
    trait: {
      name: 'Pocket Prospector',
      summary: '15% chance for a 1.5x Lucky Dig.',
      luckyDigChance: 0.15,
      luckyDigMult: 1.5
    }
  },
  {
    key: 'corgi',
    name: 'Pembroke Welsh Corgi',
    shortLabel: 'Corgi',
    tier: 'small',
    rank: 4,
    role: 'Cheerful low-riding herder that thrives on whistle rallies.',
    cost: 420,
    costMult: 1.22,
    priceCap: 22000,
    walkMult: 1.14,
    digSec: 1.46,
    payoutMult: 1.16,
    scalingMult: 1.09,
    xpMult: 1.15,
    magicBonus: 0.013,
    treasureChance: 0.00010,
    barkPitch: 600,
    sizeClass: 'standard',
    highlights: ['boneYield', 'walk', 'dig', 'xp'],
    trait: {
      name: 'Royal Rally',
      summary: 'Whistle gather boosts this pup\'s walk & dig pace +25% for 12s.',
      whistlePaceBonus: 0.25,
      whistleDuration: 12
    }
  },
  {
    key: 'frenchBulldog',
    name: 'French Bulldog',
    shortLabel: 'Frenchie',
    tier: 'small',
    rank: 5,
    role: 'Sturdy snack-loving companion with hefty bone yield for its size.',
    cost: 750,
    costMult: 1.22,
    priceCap: 32000,
    walkMult: 0.96,
    digSec: 1.62,
    payoutMult: 1.36,
    scalingMult: 1.15,
    xpMult: 1.14,
    magicBonus: 0.018,
    treasureChance: 0.00012,
    barkPitch: 525,
    sizeClass: 'toy',
    highlights: ['boneYield', 'packGrowth', 'xp', 'magic'],
    trait: {
      name: 'Snack Lover',
      summary: '+20% Bone Yield whenever any Treat is active.',
      treatBoneBonus: 0.20
    }
  },
  {
    key: 'dachshund',
    name: 'Dachshund',
    shortLabel: 'Dachshund',
    tier: 'small',
    rank: 6,
    role: 'Dedicated burrower with 3x treasure odds and rhythmic dig bursts.',
    cost: 1200,
    costMult: 1.23,
    priceCap: 46000,
    walkMult: 1.14,
    digSec: 1.44,
    payoutMult: 1.24,
    scalingMult: 1.12,
    xpMult: 1.12,
    magicBonus: 0.022,
    treasureChance: 0.00024,
    barkPitch: 560,
    sizeClass: 'standard',
    highlights: ['boneYield', 'dig', 'magic', 'treasure'],
    trait: {
      name: 'Quick Burrow',
      summary: 'Every 4th dig finishes almost instantly (0.25s dig time).',
      quickBurrowEvery: 4
    }
  },
  {
    key: 'shihTzu',
    name: 'Shih Tzu',
    shortLabel: 'Shih Tzu',
    tier: 'small',
    rank: 7,
    role: 'Affectionate lap pup that turns belly rubs into big XP and morale.',
    cost: 1800,
    costMult: 1.24,
    priceCap: 62000,
    walkMult: 1.02,
    digSec: 1.62,
    payoutMult: 1.30,
    scalingMult: 1.14,
    xpMult: 1.20,
    magicBonus: 0.030,
    treasureChance: 0.00016,
    barkPitch: 610,
    sizeClass: 'toy',
    highlights: ['boneYield', 'xp', 'magic', 'treasure'],
    trait: {
      name: 'Pampered Glow',
      summary: 'Petting this pup grants +8 Pack Mood (instead of +5) & 2x pet XP.',
      petMoodBonus: 8,
      petXpMult: 2.0
    }
  },
  {
    key: 'cockerSpaniel',
    name: 'Cocker Spaniel',
    shortLabel: 'Spaniel',
    tier: 'small',
    rank: 8,
    role: 'Silky-eared sunshine chaser with swift, joyful strides.',
    cost: 2300,
    costMult: 1.24,
    priceCap: 80000,
    walkMult: 1.22,
    digSec: 1.38,
    payoutMult: 1.38,
    scalingMult: 1.17,
    xpMult: 1.18,
    magicBonus: 0.026,
    treasureChance: 0.00014,
    barkPitch: 495,
    sizeClass: 'standard',
    highlights: ['boneYield', 'walk', 'dig', 'xp'],
    trait: {
      name: 'Sunny Fetcher',
      summary: '+22% walk & dig pace during Sunny weather.',
      weatherAffinity: {
        weather: 'sunny',
        paceBonus: 0.22
      }
    }
  },
  {
    key: 'beagle',
    name: 'Beagle',
    shortLabel: 'Beagle',
    tier: 'small',
    rank: 9,
    role: 'Sharp-nosed scent hound specialized in tracking buried relics.',
    cost: 2800,
    costMult: 1.25,
    priceCap: 100000,
    walkMult: 1.06,
    digSec: 1.64,
    payoutMult: 1.44,
    scalingMult: 1.18,
    xpMult: 1.12,
    magicBonus: 0.024,
    treasureChance: 0.00028,
    barkPitch: 510,
    sizeClass: 'standard',
    highlights: ['boneYield', 'packGrowth', 'magic', 'treasure'],
    trait: {
      name: 'Scent Trail',
      summary: '+25% personal Treasure odds.',
      personalTreasureMult: 1.25
    }
  },

  // =========================================================================
  // TIER 2 — AGILE & WORKING (9 breeds)
  // =========================================================================
  {
    key: 'bassetHound',
    name: 'Basset Hound',
    shortLabel: 'Basset',
    tier: 'working',
    rank: 10,
    role: 'Unbothered low-slung hound with heavy yield and strong away earnings.',
    cost: 4200,
    costMult: 1.25,
    priceCap: 135000,
    walkMult: 0.88,
    digSec: 1.72,
    payoutMult: 1.62,
    scalingMult: 1.24,
    xpMult: 1.10,
    magicBonus: 0.028,
    treasureChance: 0.00020,
    barkPitch: 325,
    sizeClass: 'standard',
    highlights: ['boneYield', 'packGrowth', 'magic', 'treasure'],
    trait: {
      name: 'Easygoing Earner',
      summary: '+6% Offline earnings (additive up to 75% max).',
      offlineBonus: 0.06
    }
  },
  {
    key: 'collie',
    name: 'Border Collie',
    shortLabel: 'Collie',
    tier: 'working',
    rank: 11,
    role: 'Relentless herder that keeps the whole pack moving faster.',
    cost: 6200,
    costMult: 1.26,
    priceCap: 175000,
    walkMult: 1.28,
    digSec: 1.22,
    payoutMult: 1.38,
    scalingMult: 1.20,
    xpMult: 1.18,
    magicBonus: 0.025,
    treasureChance: 0.00010,
    barkPitch: 470,
    sizeClass: 'standard',
    highlights: ['walk', 'dig', 'xp', 'packGrowth'],
    trait: {
      name: 'Herding Tempo',
      summary: 'Pack Aura: +5% walk & dig pace for all pups.',
      packPaceAura: 0.05
    }
  },
  {
    key: 'pitbull',
    name: 'Pitbull',
    shortLabel: 'Pitbull',
    tier: 'working',
    rank: 12,
    role: 'Muscular active-play powerhouse that surges whenever you tap the grass.',
    cost: 8500,
    costMult: 1.27,
    priceCap: 220000,
    walkMult: 1.18,
    digSec: 1.32,
    payoutMult: 1.66,
    scalingMult: 1.24,
    xpMult: 1.15,
    magicBonus: 0.028,
    treasureChance: 0.00012,
    barkPitch: 340,
    sizeClass: 'standard',
    highlights: ['boneYield', 'packGrowth', 'walk', 'dig'],
    trait: {
      name: 'Tap Hype',
      summary: 'Manual park taps boost this pup\'s walk & dig pace +30% for 8s.',
      tapHypePaceBonus: 0.30,
      tapHypeDuration: 8
    }
  },
  {
    key: 'aussie',
    name: 'Australian Shepherd',
    shortLabel: 'Aussie',
    tier: 'working',
    rank: 13,
    role: 'Versatile park captain that lifts XP and Bone Yield for every teammate.',
    cost: 11500,
    costMult: 1.28,
    priceCap: 280000,
    walkMult: 1.22,
    digSec: 1.36,
    payoutMult: 1.68,
    scalingMult: 1.28,
    xpMult: 1.22,
    magicBonus: 0.036,
    treasureChance: 0.00016,
    barkPitch: 430,
    sizeClass: 'standard',
    highlights: ['boneYield', 'packGrowth', 'dig', 'xp'],
    trait: {
      name: 'Trail Leader',
      summary: 'Pack Aura: +6% Pup XP & +4% Bone Yield for all pups.',
      packXpAura: 0.06,
      packBoneAura: 0.04
    }
  },
  {
    key: 'dalmatian',
    name: 'Dalmatian',
    shortLabel: 'Dalmatian',
    tier: 'working',
    rank: 14,
    role: 'Spotted marathon sprinter built to fly across breezy pastures.',
    cost: 15000,
    costMult: 1.28,
    priceCap: 340000,
    walkMult: 1.32,
    digSec: 1.34,
    payoutMult: 1.60,
    scalingMult: 1.25,
    xpMult: 1.20,
    magicBonus: 0.034,
    treasureChance: 0.00014,
    barkPitch: 445,
    sizeClass: 'standard',
    highlights: ['walk', 'dig', 'xp', 'magic'],
    trait: {
      name: 'Wind Runner',
      summary: '+28% walk & dig pace & +15% Bone Yield during Windy weather.',
      weatherAffinity: {
        weather: 'windy',
        paceBonus: 0.28,
        boneBonus: 0.15
      }
    }
  },
  {
    key: 'boxer',
    name: 'Boxer',
    shortLabel: 'Boxer',
    tier: 'working',
    rank: 15,
    role: 'Bouncy athletic goofball that turns slides and toys into huge morale.',
    cost: 19500,
    costMult: 1.29,
    priceCap: 420000,
    walkMult: 1.24,
    digSec: 1.36,
    payoutMult: 1.72,
    scalingMult: 1.28,
    xpMult: 1.26,
    magicBonus: 0.036,
    treasureChance: 0.00014,
    barkPitch: 360,
    sizeClass: 'standard',
    highlights: ['boneYield', 'walk', 'dig', 'xp'],
    trait: {
      name: 'Playful Bounce',
      summary: '2x XP & +1 bonus Pack Mood from Dog Slide rides and Toy chases.',
      playXpMult: 2.0,
      playMoodBonus: 1
    }
  },
  {
    key: 'cattleDog',
    name: 'Australian Cattle Dog',
    shortLabel: 'Cattle Dog',
    tier: 'working',
    rank: 16,
    role: 'Tireless speckled heeler that skips naps to dig non-stop.',
    cost: 25000,
    costMult: 1.29,
    priceCap: 520000,
    walkMult: 1.26,
    digSec: 1.24,
    payoutMult: 1.76,
    scalingMult: 1.30,
    xpMult: 1.20,
    magicBonus: 0.038,
    treasureChance: 0.00018,
    barkPitch: 455,
    sizeClass: 'standard',
    highlights: ['boneYield', 'packGrowth', 'walk', 'dig'],
    trait: {
      name: 'Outback Grit',
      summary: 'Never naps during work cycles & +12% faster digs.',
      napChanceMult: 0,
      digSpeedBonus: 0.12
    }
  },
  {
    key: 'husky',
    name: 'Siberian Husky',
    shortLabel: 'Husky',
    tier: 'working',
    rank: 17,
    role: 'Endurance snow runner that shines brightest under twilight skies.',
    cost: 31000,
    costMult: 1.30,
    priceCap: 620000,
    walkMult: 1.28,
    digSec: 1.42,
    payoutMult: 1.74,
    scalingMult: 1.29,
    xpMult: 1.24,
    magicBonus: 0.044,
    treasureChance: 0.00016,
    barkPitch: 540,
    sizeClass: 'standard',
    highlights: ['walk', 'xp', 'magic', 'boneYield'],
    trait: {
      name: 'Aurora Runner',
      summary: '+3% ✨ Magic chance & +20% Pup XP during Twilight.',
      weatherAffinity: {
        weather: 'twilight',
        magicAdd: 0.03,
        xpBonus: 0.20
      }
    }
  },
  {
    key: 'poodle',
    name: 'Standard Poodle',
    shortLabel: 'Poodle',
    tier: 'working',
    rank: 18,
    role: 'Clever arcane specialist prized for rapid XP and extra magic drops.',
    cost: 38000,
    costMult: 1.30,
    priceCap: 740000,
    walkMult: 1.22,
    digSec: 1.42,
    payoutMult: 1.72,
    scalingMult: 1.30,
    xpMult: 1.30,
    magicBonus: 0.058,
    treasureChance: 0.00022,
    barkPitch: 465,
    sizeClass: 'standard',
    highlights: ['xp', 'magic', 'treasure', 'dig'],
    trait: {
      name: 'Arcane Scholar',
      summary: '22% chance for +1 extra ✨ on Magic digs.',
      extraMagicChance: 0.22
    }
  },

  // =========================================================================
  // TIER 3 — NOBLE & ATHLETIC (8 breeds)
  // =========================================================================
  {
    key: 'shiba',
    name: 'Shiba Inu',
    shortLabel: 'Shiba',
    tier: 'athletic',
    rank: 19,
    role: 'Independent fortune hunter with 8x treasure odds and high magic luck.',
    cost: 52000,
    costMult: 1.31,
    priceCap: 900000,
    walkMult: 1.16,
    digSec: 1.56,
    payoutMult: 1.58,
    scalingMult: 1.28,
    xpMult: 1.18,
    magicBonus: 0.060,
    treasureChance: 0.00064,
    barkPitch: 580,
    sizeClass: 'standard',
    highlights: ['magic', 'treasure', 'boneYield', 'packGrowth'],
    trait: {
      name: 'Lucky Coin',
      summary: '16% chance for a 2.5x Lucky Dig.\n+Offline ✨',
      luckyDigChance: 0.16,
      luckyDigMult: 2.5,
      offlineMagicPerDay: 50
    }
  },
  {
    key: 'chowChow',
    name: 'Chow Chow',
    shortLabel: 'Chow Chow',
    tier: 'athletic',
    rank: 20,
    role: 'Regal lion-maned guardian that rewards a Joyful or Ecstatic park.',
    cost: 72000,
    costMult: 1.31,
    priceCap: 1100000,
    walkMult: 0.98,
    digSec: 1.66,
    payoutMult: 2.08,
    scalingMult: 1.36,
    xpMult: 1.18,
    magicBonus: 0.054,
    treasureChance: 0.00020,
    barkPitch: 330,
    sizeClass: 'standard',
    highlights: ['boneYield', 'packGrowth', 'magic', 'treasure'],
    trait: {
      name: 'Imperial Poise',
      summary: '+4 Cozy Floor & +18% Bone Yield while Park Mood is Joyful or Ecstatic.',
      cozyFloorAdd: 4,
      happyMoodBoneBonus: 0.18
    }
  },
  {
    key: 'samoyed',
    name: 'Samoyed',
    shortLabel: 'Samoyed',
    tier: 'athletic',
    rank: 21,
    role: 'Beaming fluff cloud that preserves high Park Mood for the entire pack.',
    cost: 95000,
    costMult: 1.31,
    priceCap: 1300000,
    walkMult: 1.14,
    digSec: 1.52,
    payoutMult: 1.94,
    scalingMult: 1.35,
    xpMult: 1.25,
    magicBonus: 0.056,
    treasureChance: 0.00018,
    barkPitch: 410,
    sizeClass: 'standard',
    highlights: ['boneYield', 'packGrowth', 'xp', 'magic'],
    trait: {
      name: 'Cloud Smile',
      summary: 'Pack Aura: +4 Cozy Floor & 25% slower Mood decay.',
      cozyFloorAdd: 4,
      moodDecayMult: 0.75
    }
  },
  {
    key: 'golden',
    name: 'Golden Retriever',
    shortLabel: 'Golden',
    tier: 'athletic',
    rank: 22,
    role: 'Warm-hearted anchor that lifts Bone Yield across every pup in the park.',
    cost: 125000,
    costMult: 1.32,
    priceCap: 1550000,
    walkMult: 1.12,
    digSec: 1.54,
    payoutMult: 2.12,
    scalingMult: 1.38,
    xpMult: 1.20,
    magicBonus: 0.050,
    treasureChance: 0.00016,
    barkPitch: 390,
    sizeClass: 'standard',
    highlights: ['boneYield', 'packGrowth', 'xp', 'magic'],
    trait: {
      name: 'Golden Heart',
      summary: 'Pack Aura: +7% Bone Yield for all pups.',
      packBoneAura: 0.07
    }
  },
  {
    key: 'labrador',
    name: 'Labrador Retriever',
    shortLabel: 'Labrador',
    tier: 'athletic',
    rank: 23,
    role: 'Water-loving retriever with extended hydration bursts and rain yield.',
    cost: 165000,
    costMult: 1.32,
    priceCap: 1850000,
    walkMult: 1.22,
    digSec: 1.44,
    payoutMult: 2.18,
    scalingMult: 1.40,
    xpMult: 1.22,
    magicBonus: 0.054,
    treasureChance: 0.00018,
    barkPitch: 370,
    sizeClass: 'standard',
    highlights: ['boneYield', 'packGrowth', 'walk', 'dig'],
    trait: {
      name: 'Water Splash',
      summary: 'Drinking water lasts 2x longer (36s pace boost) & +18% Bone Yield in Rain.',
      drinkBoostDurationMult: 2.0,
      weatherAffinity: {
        weather: 'rain',
        boneBonus: 0.18
      }
    }
  },
  {
    key: 'malinois',
    name: 'Belgian Malinois',
    shortLabel: 'Malinois',
    tier: 'athletic',
    rank: 24,
    role: 'High-drive working dynamo with blazing pace and zero downtime.',
    cost: 210000,
    costMult: 1.33,
    priceCap: 2150000,
    walkMult: 1.34,
    digSec: 1.18,
    payoutMult: 2.06,
    scalingMult: 1.42,
    xpMult: 1.24,
    magicBonus: 0.052,
    treasureChance: 0.00018,
    barkPitch: 385,
    sizeClass: 'standard',
    highlights: ['walk', 'dig', 'boneYield', 'packGrowth'],
    trait: {
      name: 'Relentless Drive',
      summary: 'Never naps & +25% faster digs while any Treat is active.',
      napChanceMult: 0,
      treatDigSpeedBonus: 0.25
    }
  },
  {
    key: 'shepherd',
    name: 'German Shepherd',
    shortLabel: 'Shepherd',
    tier: 'athletic',
    rank: 25,
    role: 'Disciplined field leader that supercharges the whole pack\'s Pack Growth.',
    cost: 250000,
    costMult: 1.33,
    priceCap: 2450000,
    walkMult: 1.20,
    digSec: 1.44,
    payoutMult: 2.16,
    scalingMult: 1.48,
    xpMult: 1.23,
    magicBonus: 0.056,
    treasureChance: 0.00020,
    barkPitch: 350,
    sizeClass: 'standard',
    highlights: ['boneYield', 'packGrowth', 'xp', 'magic'],
    trait: {
      name: 'Pack Commander',
      summary: 'Pack Aura: +10% Pack Growth for all pups.',
      packGrowthAura: 0.10
    }
  },
  {
    key: 'doberman',
    name: 'Doberman',
    shortLabel: 'Doberman',
    tier: 'athletic',
    rank: 26,
    role: 'Sleek, focused sprinter whose Bone Yield escalates on consecutive digs.',
    cost: 290000,
    costMult: 1.33,
    priceCap: 2750000,
    walkMult: 1.32,
    digSec: 1.26,
    payoutMult: 2.24,
    scalingMult: 1.46,
    xpMult: 1.22,
    magicBonus: 0.056,
    treasureChance: 0.00022,
    barkPitch: 310,
    sizeClass: 'standard',
    highlights: ['boneYield', 'packGrowth', 'walk', 'dig'],
    trait: {
      name: 'Focus Streak',
      summary: 'Consecutive digs without napping add +6% Bone Yield per stack (up to +30%).',
      digStreakStep: 0.06,
      digStreakMax: 0.30
    }
  },

  // =========================================================================
  // TIER 4 — GENTLE GIANTS & LEGENDS (8 breeds)
  // =========================================================================
  {
    key: 'borzoi',
    name: 'Borzoi',
    shortLabel: 'Borzoi',
    tier: 'giant',
    rank: 27,
    role: 'Aristocratic sighthound with unmatched stride speed and mystic grace.',
    cost: 360000,
    costMult: 1.34,
    priceCap: 3100000,
    walkMult: 1.40,
    digSec: 1.42,
    payoutMult: 2.26,
    scalingMult: 1.48,
    xpMult: 1.25,
    magicBonus: 0.064,
    treasureChance: 0.00028,
    barkPitch: 315,
    sizeClass: 'giant',
    highlights: ['walk', 'magic', 'treasure', 'boneYield'],
    trait: {
      name: 'Velvet Stride',
      summary: 'Pack Aura: +1.5% ✨ Magic chance for all pups & +25% Bone Yield in Windy weather.\n+Offline ✨',
      packMagicAura: 0.015,
      offlineMagicPerDay: 50,
      weatherAffinity: {
        weather: 'windy',
        boneBonus: 0.25
      }
    }
  },
  {
    key: 'akita',
    name: 'Akita',
    shortLabel: 'Akita',
    tier: 'giant',
    rank: 28,
    role: 'Noble spitz powerhouse whose Bone Yield scales faster with every level.',
    cost: 450000,
    costMult: 1.34,
    priceCap: 3400000,
    walkMult: 1.14,
    digSec: 1.48,
    payoutMult: 2.38,
    scalingMult: 1.56,
    xpMult: 1.28,
    magicBonus: 0.062,
    treasureChance: 0.00024,
    barkPitch: 295,
    sizeClass: 'standard',
    highlights: ['boneYield', 'packGrowth', 'xp', 'magic'],
    trait: {
      name: 'Loyal Guardian',
      summary: 'Gains +1.3% Bone Yield per Dog Level (instead of +1%).',
      levelBonusRate: 0.013
    }
  },
  {
    key: 'rottweiler',
    name: 'Rottweiler',
    shortLabel: 'Rottweiler',
    tier: 'giant',
    rank: 29,
    role: 'Heavy-hitting guardian built for booming Lucky Digs and brief rests.',
    cost: 580000,
    costMult: 1.34,
    priceCap: 3700000,
    walkMult: 1.08,
    digSec: 1.48,
    payoutMult: 2.50,
    scalingMult: 1.58,
    xpMult: 1.20,
    magicBonus: 0.060,
    treasureChance: 0.00024,
    barkPitch: 275,
    sizeClass: 'standard',
    highlights: ['boneYield', 'packGrowth', 'dig', 'magic'],
    trait: {
      name: 'Iron Stamina',
      summary: '22% chance for a 2.5x Lucky Dig & 50% shorter naps.',
      luckyDigChance: 0.22,
      luckyDigMult: 2.5,
      napDurationMult: 0.50
    }
  },
  {
    key: 'bernese',
    name: 'Bernese Mountain Dog',
    shortLabel: 'Bernese',
    tier: 'giant',
    rank: 30,
    role: 'Plush alpine giant combining high magic odds, 4.5x treasure, and warmth.',
    cost: 760000,
    costMult: 1.35,
    priceCap: 4000000,
    walkMult: 1.12,
    digSec: 1.40,
    payoutMult: 2.58,
    scalingMult: 1.62,
    xpMult: 1.28,
    magicBonus: 0.074,
    treasureChance: 0.00036,
    barkPitch: 290,
    sizeClass: 'giant',
    highlights: ['boneYield', 'xp', 'magic', 'treasure'],
    trait: {
      name: 'Alpine Fortune',
      summary: '30% chance for +1 extra ✨ on Magic digs & +4 Cozy Floor.',
      extraMagicChance: 0.30,
      cozyFloorAdd: 4
    }
  },
  {
    key: 'newfoundland',
    name: 'Newfoundland',
    shortLabel: 'Newfoundland',
    tier: 'giant',
    rank: 31,
    role: 'Gentle bear-like water giant that dominates Rain showers and away time.',
    cost: 980000,
    costMult: 1.35,
    priceCap: 4200000,
    walkMult: 1.02,
    digSec: 1.54,
    payoutMult: 2.68,
    scalingMult: 1.65,
    xpMult: 1.24,
    magicBonus: 0.072,
    treasureChance: 0.00030,
    barkPitch: 250,
    sizeClass: 'giant',
    highlights: ['boneYield', 'packGrowth', 'magic', 'treasure'],
    trait: {
      name: 'Tidebringer',
      summary: '+35% Bone Yield & +5% ✨ Magic chance in Rain, plus +12% Offline earnings.\n+Offline ✨',
      offlineBonus: 0.12,
      offlineMagicPerDay: 25,
      weatherAffinity: {
        weather: 'rain',
        boneBonus: 0.35,
        magicAdd: 0.05
      }
    }
  },
  {
    key: 'saintBernard',
    name: 'Saint Bernard',
    shortLabel: 'St. Bernard',
    tier: 'giant',
    rank: 32,
    role: 'Warm alpine rescuer that anchors park mood, pack yield, and away gains.',
    cost: 1250000,
    costMult: 1.35,
    priceCap: 4350000,
    walkMult: 0.98,
    digSec: 1.58,
    payoutMult: 2.76,
    scalingMult: 1.68,
    xpMult: 1.26,
    magicBonus: 0.070,
    treasureChance: 0.00032,
    barkPitch: 245,
    sizeClass: 'giant',
    highlights: ['boneYield', 'packGrowth', 'xp', 'magic'],
    trait: {
      name: 'Alpine Rescue',
      summary: 'Pack Aura: +6 Cozy Floor, +8% Bone Yield for all pups & +18% Offline earnings.',
      cozyFloorAdd: 6,
      packBoneAura: 0.08,
      offlineBonus: 0.18
    }
  },
  {
    key: 'greatDane',
    name: 'Great Dane',
    shortLabel: 'Great Dane',
    tier: 'giant',
    rank: 33,
    role: 'Towering powerhouse with huge strides, colossal yield, and Pack Aura.',
    cost: 1500000,
    costMult: 1.36,
    priceCap: 4450000,
    walkMult: 1.24,
    digSec: 1.46,
    payoutMult: 2.95,
    scalingMult: 1.72,
    xpMult: 1.26,
    magicBonus: 0.070,
    treasureChance: 0.00032,
    barkPitch: 235,
    sizeClass: 'giant',
    highlights: ['boneYield', 'packGrowth', 'walk', 'magic'],
    trait: {
      name: 'Colossal Haul',
      summary: 'Pack Aura: +10% Bone Yield for all pups & 20% chance for a 2.5x Lucky Dig.',
      packBoneAura: 0.10,
      luckyDigChance: 0.20,
      luckyDigMult: 2.5
    }
  },
  {
    key: 'irishWolfhound',
    name: 'Irish Wolfhound',
    shortLabel: 'Wolfhound',
    tier: 'giant',
    rank: 34,
    role: 'Tallest shaggy legend in the park, empowering pack magic and relics.',
    cost: 1800000,
    costMult: 1.36,
    priceCap: 4500000,
    walkMult: 1.22,
    digSec: 1.44,
    payoutMult: 3.05,
    scalingMult: 1.76,
    xpMult: 1.30,
    magicBonus: 0.080,
    treasureChance: 0.00044,
    barkPitch: 220,
    sizeClass: 'giant',
    highlights: ['boneYield', 'packGrowth', 'magic', 'treasure'],
    trait: {
      name: 'Ancient Legend',
      summary: 'Pack Aura: +30% Treasure odds & +2% ✨ Magic chance for all pups, plus 35% chance for +1 extra ✨ on digs.\n+Offline ✨',
      packTreasureAura: 0.30,
      packMagicAura: 0.02,
      extraMagicChance: 0.35,
      offlineMagicPerDay: 25
    }
  }
];

export const BREED_BY_KEY: Record<string, BreedDefinition> = Object.fromEntries(
  BREED_LIST.map(b => [b.key, b])
);

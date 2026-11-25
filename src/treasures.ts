export type TreasureRarity = 'Common' | 'Rare' | 'Legendary' | 'Mythic';
export type TreasureSetId = 'explorer' | 'kennel' | 'arcane' | 'mythic';

export interface SavedPerkLike {
  id?: string;
  name?: string;
  rarity?: string;
  desc?: string;
  mult?: number;
  workMult?: number;
  magicAdd?: number;
}

export interface TreasureDef {
  id: string;
  name: string;
  setId: TreasureSetId;
  rarity: TreasureRarity;
  lore: string;
  /** Additive dig bones bonus at Rank I (e.g. 0.12 = +12%) */
  boneAdd?: number;
  /** Explicit Rank I..V multiplicative dig bones values for Mythic relics */
  boneMultRanks?: readonly [number, number, number, number, number];
  /** Additive dig scaling bonus at Rank I (e.g. 0.10 = +10%) */
  scalingAdd?: number;
  /** Additive Magic Bone chance at Rank I (e.g. 0.03 = +3%) */
  magicAdd?: number;
  /** Additive Pup XP bonus at Rank I (e.g. 0.10 = +10%) */
  xpAdd?: number;
  /** Additive Pack Pace bonus at Rank I (e.g. 0.06 = +6%) */
  paceAdd?: number;
  /** Flat Cozy Floor points at Rank I (e.g. 12 = +12) */
  cozyFloor?: number;
  /** Additive Treasure Discovery odds bonus at Rank I (e.g. 0.18 = +18%) */
  treasureOddsAdd?: number;
}

export interface TreasureSetDef {
  id: TreasureSetId;
  name: string;
  shortName: string;
  bonusLabel: string;
  relicIds: readonly [string, string, string, string];
  bonus: {
    boneAdd?: number;
    globalDigMult?: number;
    scalingAdd?: number;
    magicAdd?: number;
    xpAdd?: number;
    cozyFloor?: number;
    treasureOddsAdd?: number;
  };
}

export interface TreasureBonuses {
  boneMult: number;
  workBonus: number;
  magicBonus: number;
  xpMult: number;
  paceMult: number;
  cozyFloorAdd: number;
  treasureOddsMult: number;
  discoveredCount: number;
  totalRanks: number;
  maxTotalRanks: number;
  completedSets: TreasureSetId[];
}

export const MAX_RELIC_RANK = 5;
export const MAXED_TREASURE_JACKPOT_MAGIC = 250;
export const RANK_ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const;
export const RANK_CURVE = [1.0, 1.45, 1.95, 2.5, 3.2] as const;

export const RARITY_WEIGHTS: Record<TreasureRarity, number> = {
  Common: 54,
  Rare: 31,
  Legendary: 12,
  Mythic: 3
};

export const RARITY_META: Record<
  TreasureRarity,
  { label: string; color: string; rimColor: string; glowColor: string; cssClass: string }
> = {
  Common: {
    label: 'Common',
    color: '#d7c9a8',
    rimColor: 'rgba(215, 201, 168, 0.45)',
    glowColor: 'rgba(215, 201, 168, 0.22)',
    cssClass: 'rarity-common'
  },
  Rare: {
    label: 'Rare',
    color: '#6ec6ff',
    rimColor: 'rgba(110, 198, 255, 0.58)',
    glowColor: 'rgba(64, 169, 255, 0.28)',
    cssClass: 'rarity-rare'
  },
  Legendary: {
    label: 'Legendary',
    color: '#ffd166',
    rimColor: 'rgba(255, 209, 102, 0.72)',
    glowColor: 'rgba(241, 196, 15, 0.34)',
    cssClass: 'rarity-legendary'
  },
  Mythic: {
    label: 'Mythic',
    color: '#ff82c4',
    rimColor: 'rgba(255, 130, 196, 0.78)',
    glowColor: 'rgba(232, 67, 147, 0.38)',
    cssClass: 'rarity-mythic'
  }
};

export const TREASURE_SETS: readonly TreasureSetDef[] = [
  {
    id: 'explorer',
    name: "Park Explorer's Pack",
    shortName: "Explorer's Pack",
    bonusLabel: '+25% Dig Scaling | +15% Treasure Odds',
    relicIds: ['bp_1', 'bp_2', 'bp_3', 'sp_1'],
    bonus: {
      scalingAdd: 0.25,
      treasureOddsAdd: 0.15
    }
  },
  {
    id: 'kennel',
    name: 'Gilded Kennel',
    shortName: 'Gilded Kennel',
    bonusLabel: '+35% Dig Bones | +10 Cozy Floor',
    relicIds: ['gp_1', 'bp_4', 'bp_5', 'bp_6'],
    bonus: {
      boneAdd: 0.35,
      cozyFloor: 10
    }
  },
  {
    id: 'arcane',
    name: 'Arcane Playbox',
    shortName: 'Arcane Playbox',
    bonusLabel: '+3% Magic Chance | +20% Pup XP',
    relicIds: ['mp_1', 'xp_1', 'tr_1', 'mp_2'],
    bonus: {
      magicAdd: 0.03,
      xpAdd: 0.20
    }
  },
  {
    id: 'mythic',
    name: 'Mythic Vault',
    shortName: 'Mythic Vault',
    bonusLabel: '1.5x Global Dig Multiplier | +25% Treasure Odds',
    relicIds: ['sp_2', 'hp_1', 'myth_1', 'myth_2'],
    bonus: {
      globalDigMult: 1.5,
      treasureOddsAdd: 0.25
    }
  }
] as const;

export const TREASURE_CATALOG: readonly TreasureDef[] = [
  // Set 1: Park Explorer's Pack
  {
    id: 'bp_1',
    name: 'Muddy Map',
    setId: 'explorer',
    rarity: 'Common',
    lore: 'Paw-smudged parchment marking every secret burying spot beneath the park meadow.',
    boneAdd: 0.12
  },
  {
    id: 'bp_2',
    name: 'Lost Compass',
    setId: 'explorer',
    rarity: 'Common',
    lore: 'Its brass needle ignores north completely and points straight toward buried bones.',
    boneAdd: 0.15
  },
  {
    id: 'bp_3',
    name: 'Canvas Treat Pouch',
    setId: 'explorer',
    rarity: 'Common',
    lore: 'Stitched from weathered trail cloth and perpetually dusted with crunchy biscuit crumbs.',
    boneAdd: 0.18
  },
  {
    id: 'sp_1',
    name: 'Sturdy Shovel',
    setId: 'explorer',
    rarity: 'Common',
    lore: 'An oak-handled garden spade worn smooth by generations of tireless digging paws.',
    scalingAdd: 0.10
  },

  // Set 2: Gilded Kennel
  {
    id: 'gp_1',
    name: 'Jeweled Biscuit Tin',
    setId: 'kennel',
    rarity: 'Common',
    lore: 'An enameled keepsake tin whose golden latch pops open at the sound of happy barks.',
    xpAdd: 0.10
  },
  {
    id: 'bp_4',
    name: 'Golden Dog-Tag',
    setId: 'kennel',
    rarity: 'Rare',
    lore: 'Hammered from warm sun-gold and engraved with the crest of a legendary park champion.',
    boneAdd: 0.28
  },
  {
    id: 'bp_5',
    name: 'Golden Collar',
    setId: 'kennel',
    rarity: 'Rare',
    lore: 'A museum display keepsake forged in solid sun-gold and studded with polished royal rivets.',
    boneAdd: 0.35
  },
  {
    id: 'bp_6',
    name: 'Diamond Bowl',
    setId: 'kennel',
    rarity: 'Legendary',
    lore: 'Carved from a single radiant crystal that refracts twilight lantern light across the lawn.',
    boneAdd: 0.65
  },

  // Set 3: Arcane Playbox
  {
    id: 'mp_1',
    name: 'Mystic Chew Toy',
    setId: 'arcane',
    rarity: 'Rare',
    lore: 'Hums softly with twilight runes and leaves faint violet stardust after every squeak.',
    magicAdd: 0.015
  },
  {
    id: 'xp_1',
    name: 'Starlight Whistle',
    setId: 'arcane',
    rarity: 'Rare',
    lore: 'A silver-filigree whistle whose silent melody sharpens every pup’s focus across the island.',
    xpAdd: 0.18
  },
  {
    id: 'tr_1',
    name: 'Enchanted Bone Lantern',
    setId: 'arcane',
    rarity: 'Rare',
    lore: 'An amber-flamed brass lantern that reveals hidden treasure chests pulsing beneath the turf.',
    treasureOddsAdd: 0.18,
    magicAdd: 0.01
  },
  {
    id: 'mp_2',
    name: 'The Golden Good-Boy Stash',
    setId: 'arcane',
    rarity: 'Legendary',
    lore: 'A gilded chest brimming with enchanted starlight treats saved for the very best companions.',
    magicAdd: 0.025
  },

  // Set 4: Mythic Vault
  {
    id: 'sp_2',
    name: 'Sun-Forged Leash',
    setId: 'mythic',
    rarity: 'Common',
    lore: 'Woven from sunlit leather and warm brass links that quicken every stride across the grass.',
    paceAdd: 0.06,
    scalingAdd: 0.08
  },
  {
    id: 'hp_1',
    name: 'Moonstone Bell',
    setId: 'mythic',
    rarity: 'Legendary',
    lore: 'Its pearlescent chime wraps the whole park in a calm, cozy glow that never fades.',
    cozyFloor: 12,
    xpAdd: 0.22
  },
  {
    id: 'myth_1',
    name: 'The Infinite Toy Chest',
    setId: 'mythic',
    rarity: 'Mythic',
    lore: 'A boundless storybook trunk overflowing with glittering relics from every park that ever was.',
    boneMultRanks: [2.4, 2.95, 3.55, 4.15, 4.8],
    scalingAdd: 0.40
  },
  {
    id: 'myth_2',
    name: 'Crown of the First Pup',
    setId: 'mythic',
    rarity: 'Mythic',
    lore: 'The ancient rose-gold circlet said to have crowned the very first pup who dug in PupperPark.',
    boneMultRanks: [2.0, 2.4, 2.85, 3.3, 3.8],
    magicAdd: 0.03,
    xpAdd: 0.25
  }
] as const;

const TREASURE_BY_ID = new Map<string, TreasureDef>(TREASURE_CATALOG.map(t => [t.id, t]));
const SET_BY_ID = new Map<TreasureSetId, TreasureSetDef>(TREASURE_SETS.map(s => [s.id, s]));

export function getTreasureById(id: string): TreasureDef | undefined {
  return TREASURE_BY_ID.get(id);
}

export function getTreasureSetById(setId: TreasureSetId): TreasureSetDef | undefined {
  return SET_BY_ID.get(setId);
}

export function getRankRoman(rank: number): string {
  const clamped = Math.max(1, Math.min(MAX_RELIC_RANK, Math.floor(rank)));
  return RANK_ROMAN[clamped - 1];
}

export function getRankCurveMultiplier(rank: number): number {
  const clamped = Math.max(1, Math.min(MAX_RELIC_RANK, Math.floor(rank)));
  return RANK_CURVE[clamped - 1];
}

export function getTreasureCounts(perks: SavedPerkLike[]): Map<string, number> {
  const counts = new Map<string, number>();
  if (!Array.isArray(perks)) return counts;
  for (const p of perks) {
    if (!p) continue;
    let id = p.id;
    if (!id || !TREASURE_BY_ID.has(id)) {
      const matched = TREASURE_CATALOG.find(t => t.name === p.name);
      id = matched?.id;
    }
    if (!id || !TREASURE_BY_ID.has(id)) continue;
    const prev = counts.get(id) || 0;
    counts.set(id, Math.min(MAX_RELIC_RANK, prev + 1));
  }
  return counts;
}

export function getRelicRank(counts: Map<string, number>, id: string): number {
  return Math.max(0, Math.min(MAX_RELIC_RANK, counts.get(id) || 0));
}

export function isSetCompleted(counts: Map<string, number>, setId: TreasureSetId): boolean {
  const setDef = SET_BY_ID.get(setId);
  if (!setDef) return false;
  return setDef.relicIds.every(id => getRelicRank(counts, id) >= 1);
}

export function getSetProgress(counts: Map<string, number>, setId: TreasureSetId): { owned: number; total: number; completed: boolean } {
  const setDef = SET_BY_ID.get(setId);
  if (!setDef) return { owned: 0, total: 4, completed: false };
  let owned = 0;
  for (const id of setDef.relicIds) {
    if (getRelicRank(counts, id) >= 1) owned += 1;
  }
  return { owned, total: setDef.relicIds.length, completed: owned >= setDef.relicIds.length };
}

function formatWholePct(val: number): string {
  return `${Math.round(val * 100)}%`;
}

function formatDecimalPct(val: number): string {
  const pct = Math.round(val * 1000) / 10;
  return `${Number.isInteger(pct) ? String(pct) : pct.toFixed(1)}%`;
}

function formatMultVal(val: number): string {
  const rounded = Math.round(val * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded.toFixed(1) : rounded.toFixed(2).replace(/0$/, '')}x`;
}

export function formatRelicStatParts(def: TreasureDef, rank: number): string[] {
  const clampedRank = Math.max(1, Math.min(MAX_RELIC_RANK, Math.floor(rank)));
  const scale = getRankCurveMultiplier(clampedRank);
  const parts: string[] = [];

  if (def.boneMultRanks) {
    parts.push(`${formatMultVal(def.boneMultRanks[clampedRank - 1])} Dig Bones`);
  }
  if (def.boneAdd) {
    parts.push(`+${formatWholePct(def.boneAdd * scale)} Dig Bones`);
  }
  if (def.scalingAdd) {
    parts.push(`+${formatWholePct(def.scalingAdd * scale)} Dig Scaling`);
  }
  if (def.magicAdd) {
    parts.push(`+${formatDecimalPct(def.magicAdd * scale)} ✨ Magic Chance`);
  }
  if (def.xpAdd) {
    parts.push(`+${formatWholePct(def.xpAdd * scale)} Pup XP`);
  }
  if (def.paceAdd) {
    parts.push(`+${formatWholePct(def.paceAdd * scale)} Pack Pace`);
  }
  if (def.cozyFloor) {
    parts.push(`+${Math.round(def.cozyFloor * scale)} Cozy Floor`);
  }
  if (def.treasureOddsAdd) {
    parts.push(`+${formatWholePct(def.treasureOddsAdd * scale)} Treasure Odds`);
  }

  return parts;
}

export function formatRelicStatsAtRank(def: TreasureDef, rank: number): string {
  return formatRelicStatParts(def, rank).join(' | ');
}

export function formatRelicUpgradePreview(def: TreasureDef, currentRank: number): string {
  if (currentRank <= 0) {
    return formatRelicStatsAtRank(def, 1);
  }
  if (currentRank >= MAX_RELIC_RANK) {
    return formatRelicStatsAtRank(def, MAX_RELIC_RANK);
  }
  const nextRank = currentRank + 1;
  const curParts = formatRelicStatParts(def, currentRank);
  const nextParts = formatRelicStatParts(def, nextRank);
  if (curParts.length === 1 && nextParts.length === 1) {
    const curLead = curParts[0].split(' ')[0];
    return `${curLead} → ${nextParts[0]}`;
  }
  return nextParts.join(' | ');
}

export function computeTreasureBonuses(perks: SavedPerkLike[]): TreasureBonuses {
  const counts = getTreasureCounts(perks);

  let boneAddTotal = 0;
  let mythicBoneMult = 1;
  let scalingAddTotal = 0;
  let magicAddTotal = 0;
  let xpAddTotal = 0;
  let paceAddTotal = 0;
  let cozyFloorTotal = 0;
  let treasureOddsAddTotal = 0;
  let discoveredCount = 0;
  let totalRanks = 0;

  for (const def of TREASURE_CATALOG) {
    const rank = getRelicRank(counts, def.id);
    if (rank <= 0) continue;
    discoveredCount += 1;
    totalRanks += rank;
    const scale = getRankCurveMultiplier(rank);

    if (def.boneMultRanks) {
      mythicBoneMult *= def.boneMultRanks[rank - 1];
    }
    if (def.boneAdd) boneAddTotal += def.boneAdd * scale;
    if (def.scalingAdd) scalingAddTotal += def.scalingAdd * scale;
    if (def.magicAdd) magicAddTotal += def.magicAdd * scale;
    if (def.xpAdd) xpAddTotal += def.xpAdd * scale;
    if (def.paceAdd) paceAddTotal += def.paceAdd * scale;
    if (def.cozyFloor) cozyFloorTotal += Math.round(def.cozyFloor * scale);
    if (def.treasureOddsAdd) treasureOddsAddTotal += def.treasureOddsAdd * scale;
  }

  const completedSets: TreasureSetId[] = [];
  for (const setDef of TREASURE_SETS) {
    if (isSetCompleted(counts, setDef.id)) {
      completedSets.push(setDef.id);
      const b = setDef.bonus;
      if (b.boneAdd) boneAddTotal += b.boneAdd;
      if (b.globalDigMult) mythicBoneMult *= b.globalDigMult;
      if (b.scalingAdd) scalingAddTotal += b.scalingAdd;
      if (b.magicAdd) magicAddTotal += b.magicAdd;
      if (b.xpAdd) xpAddTotal += b.xpAdd;
      if (b.cozyFloor) cozyFloorTotal += b.cozyFloor;
      if (b.treasureOddsAdd) treasureOddsAddTotal += b.treasureOddsAdd;
    }
  }

  return {
    boneMult: (1 + boneAddTotal) * mythicBoneMult,
    workBonus: 1 + scalingAddTotal,
    magicBonus: magicAddTotal,
    xpMult: 1 + xpAddTotal,
    paceMult: 1 + paceAddTotal,
    cozyFloorAdd: Math.round(cozyFloorTotal * 10) / 10,
    treasureOddsMult: 1 + treasureOddsAddTotal,
    discoveredCount,
    totalRanks,
    maxTotalRanks: TREASURE_CATALOG.length * MAX_RELIC_RANK,
    completedSets
  };
}

export function createSavedPerkRecord(def: TreasureDef, nextRank: number): {
  id: string;
  name: string;
  rarity: TreasureRarity;
  desc: string;
} {
  return {
    id: def.id,
    name: def.name,
    rarity: def.rarity,
    desc: formatRelicStatsAtRank(def, nextRank)
  };
}

function pickWeightedFromPool(pool: TreasureDef[], excludeCommon: boolean): TreasureDef | null {
  if (pool.length === 0) return null;
  const rarities: TreasureRarity[] = excludeCommon
    ? ['Rare', 'Legendary', 'Mythic']
    : ['Common', 'Rare', 'Legendary', 'Mythic'];

  const buckets: Array<{ rarity: TreasureRarity; weight: number; items: TreasureDef[] }> = [];
  for (const rarity of rarities) {
    const items = pool.filter(t => t.rarity === rarity);
    if (items.length > 0) {
      buckets.push({ rarity, weight: RARITY_WEIGHTS[rarity], items });
    }
  }

  if (buckets.length === 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const totalWeight = buckets.reduce((sum, b) => sum + b.weight, 0);
  let roll = Math.random() * totalWeight;
  let chosenBucket = buckets[buckets.length - 1];
  for (const bucket of buckets) {
    roll -= bucket.weight;
    if (roll <= 0) {
      chosenBucket = bucket;
      break;
    }
  }

  return chosenBucket.items[Math.floor(Math.random() * chosenBucket.items.length)];
}

export function rollWeightedTreasureOptions(perks: SavedPerkLike[], count = 3): TreasureDef[] {
  const counts = getTreasureCounts(perks);
  const remaining = TREASURE_CATALOG.filter(t => getRelicRank(counts, t.id) < MAX_RELIC_RANK);
  if (remaining.length === 0) return [];

  const picked: TreasureDef[] = [];
  const pool = [...remaining];

  while (picked.length < count && pool.length > 0) {
    const forceRarePlus =
      picked.length === 2 &&
      picked[0].rarity === 'Common' &&
      picked[1].rarity === 'Common' &&
      pool.some(t => t.rarity !== 'Common');

    const chosen = pickWeightedFromPool(pool, forceRarePlus);
    if (!chosen) break;
    picked.push(chosen);
    const idx = pool.findIndex(t => t.id === chosen.id);
    if (idx >= 0) pool.splice(idx, 1);
  }

  return picked;
}

export type OfflineTreasureResult =
  | { kind: 'relic'; def: TreasureDef; prevRank: number; newRank: number; completedSetName: string | null }
  | { kind: 'jackpot'; magicBones: number };

export function rollSingleWeightedTreasure(perks: SavedPerkLike[]): OfflineTreasureResult {
  const counts = getTreasureCounts(perks);
  const remaining = TREASURE_CATALOG.filter(t => getRelicRank(counts, t.id) < MAX_RELIC_RANK);
  if (remaining.length === 0) {
    return { kind: 'jackpot', magicBones: MAXED_TREASURE_JACKPOT_MAGIC };
  }
  const chosen = pickWeightedFromPool(remaining, false) || remaining[0];
  const prevRank = getRelicRank(counts, chosen.id);
  const newRank = Math.min(MAX_RELIC_RANK, prevRank + 1);

  const wasCompleted = isSetCompleted(counts, chosen.setId);
  counts.set(chosen.id, newRank);
  const nowCompleted = isSetCompleted(counts, chosen.setId);
  const completedSetName = !wasCompleted && nowCompleted ? (getTreasureSetById(chosen.setId)?.name || null) : null;

  return {
    kind: 'relic',
    def: chosen,
    prevRank,
    newRank,
    completedSetName
  };
}

export function formatActiveTreasureSummary(bonuses: TreasureBonuses): string {
  const parts: string[] = [];
  if (bonuses.boneMult > 1.001) {
    parts.push(`${formatMultVal(bonuses.boneMult)} Dig Bones`);
  }
  if (bonuses.workBonus > 1.001) {
    parts.push(`+${formatWholePct(bonuses.workBonus - 1)} Scaling`);
  }
  if (bonuses.magicBonus > 0.0005) {
    parts.push(`+${formatDecimalPct(bonuses.magicBonus)} ✨ Magic`);
  }
  if (bonuses.xpMult > 1.001) {
    parts.push(`+${formatWholePct(bonuses.xpMult - 1)} Pup XP`);
  }
  if (bonuses.paceMult > 1.001) {
    parts.push(`+${formatWholePct(bonuses.paceMult - 1)} Pace`);
  }
  if (bonuses.cozyFloorAdd > 0) {
    parts.push(`+${Math.round(bonuses.cozyFloorAdd)} Cozy Floor`);
  }
  if (bonuses.treasureOddsMult > 1.001) {
    parts.push(`+${formatWholePct(bonuses.treasureOddsMult - 1)} Treasure Odds`);
  }
  return parts.length > 0 ? parts.join(' | ') : 'No relics discovered yet — keep digging!';
}

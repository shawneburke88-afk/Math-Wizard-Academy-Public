// Items: limited equip slots, rarity-based random drops, battle stats only (design doc section 7).
import { weightedPick, uid } from '../core/rng.js';

export const SLOTS = ['wand', 'hat', 'robe', 'boots', 'amulet', 'charm'];
export const WIZARD_SLOTS = ['wand', 'hat', 'robe', 'boots', 'amulet'];
export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const RARITY_INFO = {
  // mult: stat size vs a Common item of the same level [TUNABLE]. Kept close together so gear upgrades feel gradual.
  common: { name: 'Common', color: '#9aa3ad', mult: 1 },
  uncommon: { name: 'Uncommon', color: '#4caf50', mult: 1.35 },
  rare: { name: 'Rare', color: '#3d8bfd', mult: 1.75 },
  epic: { name: 'Epic', color: '#a259e6', mult: 2.2 },
  legendary: { name: 'Legendary', color: '#f2b705', mult: 2.8 },
};

// Drop odds [TUNABLE] — design doc table.
const ODDS = {
  wild: { chance: 0.25, dist: [60, 27, 10, 2.7, 0.3] },
  trainer: { chance: 0.5, dist: [45, 33, 17, 4.5, 0.5] },
  challenge: { chance: 1, dist: [0, 30, 45, 20, 5] },
  chest: { chance: 1, dist: [0, 25, 45, 23, 7] },
  guardian: { chance: 1, dist: [0, 0, 0, 90, 10] },
  // Mental math chests: Silver = a chance at an item, Gold = a sure item, Rainbow = two items, one Rare or better.
  mental_silver: { chance: 0.5, dist: [40, 42, 15, 3, 0] },
  mental_gold: { chance: 1, dist: [0, 45, 40, 13, 2] },
  mental_rainbow: { chance: 1, dist: [0, 0, 70, 26, 4] },
};
const PITY_LIMIT = 15;

const SLOT_STATS = {
  wand: ['power', 'focus', 'luck'],
  hat: ['focus', 'luck', 'ward'],
  robe: ['ward', 'vitality', 'luck'],
  boots: ['vitality', 'luck', 'ward'],
  amulet: ['luck', 'focus', 'power'],
  charm: ['power', 'ward', 'vitality'],
};
const BASE_NAMES = {
  wand: ['Wand', 'Staff', 'Rod', 'Scepter'], hat: ['Hat', 'Hood', 'Cap', 'Circlet'], robe: ['Robe', 'Cloak', 'Mantle', 'Tunic'],
  boots: ['Boots', 'Slippers', 'Sandals', 'Treads'], amulet: ['Amulet', 'Pendant', 'Locket', 'Medallion'], charm: ['Charm', 'Ribbon', 'Bell', 'Collar'],
};
const ADJ = {
  common: ['Apprentice', 'Sturdy', 'Simple', 'Cozy', 'Trusty'],
  uncommon: ['Clever', 'Bright', 'Swift', 'Lucky', 'Shimmering'],
  rare: ['Starlit', 'Moonlit', 'Enchanted', 'Glowing', 'Runed'],
  epic: ['Thunder', 'Prism', 'Aurora', 'Comet', 'Tidal'],
};
const FLAVOUR = ['of Counting', 'of Patterns', 'of Shapes', 'of Chance', 'of Sums', 'of Fractions', 'of Time', 'of Tides', 'of the Owl', 'of Sparks'];

// Legendary items: each can be found once per profile.
export const LEGENDARIES = [
  { id: 'L-wand-infinity', slot: 'wand', name: 'Wand of Infinity' },
  { id: 'L-wand-prime', slot: 'wand', name: 'The Prime Staff' },
  { id: 'L-hat-archmage', slot: 'hat', name: "Archmage's Starry Hat" },
  { id: 'L-hat-pi', slot: 'hat', name: 'Circlet of Pi' },
  { id: 'L-robe-aurora', slot: 'robe', name: 'Aurora Robe' },
  { id: 'L-robe-tessellate', slot: 'robe', name: 'Tessellated Mantle' },
  { id: 'L-boots-lightyear', slot: 'boots', name: 'Lightyear Boots' },
  { id: 'L-boots-fundy', slot: 'boots', name: 'Tidewalker Treads of Fundy' },
  { id: 'L-amulet-golden', slot: 'amulet', name: 'Golden Ratio Amulet' },
  { id: 'L-amulet-zero', slot: 'amulet', name: 'Locket of Zero' },
  { id: 'L-charm-lucky7', slot: 'charm', name: 'Lucky Seven Charm' },
  { id: 'L-charm-hundred', slot: 'charm', name: 'Hundredfold Bell' },
];

/** Roll for a drop. source: wild | trainer | challenge | chest | guardian. hints lower odds one step each. */
export function rollDrop(profile, source, areaLevel, rand, { hints = 0 } = {}) {
  const odds = ODDS[source] || ODDS.wild;
  let luckBoost = Math.min(0.15, (equippedBonus(profile).luck || 0) * 0.005);
  if (rand() > odds.chance + luckBoost) return null;
  let rarityIdx = RARITIES.indexOf(weightedPick(rand, RARITIES.map((r, i) => [r, odds.dist[i]])));
  rarityIdx = Math.max(source === 'wild' || source === 'trainer' || source === 'mental_silver' ? 0 : 1, rarityIdx - hints);
  // Luck protection: after PITY_LIMIT drops with nothing Rare or better, guarantee Rare+.
  if (rarityIdx < 2 && profile.pity >= PITY_LIMIT) rarityIdx = 2;
  profile.pity = rarityIdx >= 2 ? 0 : profile.pity + 1;
  let rarity = RARITIES[rarityIdx];
  if (rarity === 'legendary') {
    const left = LEGENDARIES.filter((l) => !profile.legendary.includes(l.id));
    if (!left.length) rarity = 'epic';
    else return makeItem(rarity, areaLevel, rand, left[Math.floor(rand() * left.length)]);
  }
  return makeItem(rarity, areaLevel, rand);
}

// Item stats grow with the item's level (the team's level when it dropped), matching how pet stats grow,
// so a new drop is a steady upgrade instead of a huge jump early and useless later [TUNABLE].
const STAT_AT = {
  power: (L) => 0.08 * (6 + 2.2 * L),     // ≈8% of a same-level pet's power for a Common
  ward: (L) => 0.08 * (3 + 1.4 * L),
  vitality: (L) => 0.07 * (26 + 6 * L),
  luck: () => 2,
  focus: () => 0.3,                        // starting magic (whole numbers count)
};
export function makeItem(rarity, itemLevel, rand, legendary = null, slot = null) {
  slot = legendary ? legendary.slot : slot || SLOTS[Math.floor(rand() * SLOTS.length)];
  const info = RARITY_INFO[rarity];
  const L = Math.max(1, itemLevel | 0);
  const stats = {};
  const statList = SLOT_STATS[slot];
  const nStats = rarity === 'common' ? 1 : rarity === 'uncommon' || rarity === 'rare' ? 2 : 3;
  for (let i = 0; i < nStats; i++) {
    const st = statList[i];
    stats[st] = +(STAT_AT[st](L) * info.mult * (0.9 + rand() * 0.2)).toFixed(st === 'focus' ? 2 : 0);
    if (st !== 'focus') stats[st] = Math.max(1, stats[st]);
  }
  const areaLevel = L;
  const name = legendary ? legendary.name
    : `${ADJ[rarity][Math.floor(rand() * ADJ[rarity].length)]} ${BASE_NAMES[slot][Math.floor(rand() * 4)]}` +
      (rarity === 'rare' || rarity === 'epic' ? ' ' + FLAVOUR[Math.floor(rand() * FLAVOUR.length)] : '');
  return { id: uid(), slot, rarity, level: areaLevel, name, stats, seed: Math.floor(rand() * 1000), legendaryId: legendary?.id || null };
}

/** Add an item to the bag; legendaries are recorded; returns the item. */
export function giveItem(profile, item) {
  if (!item) return null;
  if (item.legendaryId) profile.legendary.push(item.legendaryId);
  profile.items.push(item);
  return item;
}

/** Total bonus from the wizard's equipped gear (applies to every pet). */
export function equippedBonus(profile) {
  const total = { power: 0, ward: 0, vitality: 0, focus: 0, luck: 0 };
  for (const slot of WIZARD_SLOTS) {
    const it = profile.items.find((i) => i.id === profile.equipped[slot]);
    if (it) for (const [k, v] of Object.entries(it.stats)) total[k] += v;
  }
  return total;
}

export function charmBonus(profile, pet) {
  const it = pet.charm && profile.items.find((i) => i.id === pet.charm);
  return it ? it.stats : {};
}

export const itemPrice = (item) => Math.round(({ common: 15, uncommon: 40, rare: 90, epic: 200, legendary: 400 })[item.rarity] * (1 + (item.level - 1) * 0.06));

export function statLabel(k) {
  return { power: 'Power', ward: 'Ward', vitality: 'Vitality', focus: 'Focus', luck: 'Luck' }[k] || k;
}

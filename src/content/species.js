// Pet species: strand -> element, big idea -> family, skill line -> species. Stats and spells.
import { SPECIES_ART } from '../art/creatures.js';

export const ELEMENTS = {
  star: { name: 'Star', strand: 'number', icon: '✦', color: '#f5b83d' },
  vine: { name: 'Vine', strand: 'patterns', icon: '❦', color: '#4fbf6a' },
  stone: { name: 'Stone', strand: 'shape', icon: '◆', color: '#d9824a' },
  storm: { name: 'Storm', strand: 'stats', icon: 'ϟ', color: '#3fb6c6' },
};
const STRAND_ELEMENT = { number: 'star', patterns: 'vine', shape: 'stone', stats: 'storm' };

// ---- Elements: Star > Storm > Vine > Stone > Star  [TUNABLE] ----
// Strong: ×1.5 damage. Weak (target's element beats yours): ×0.7. A species' own resistance: ×0.6 more.
const BEATS = { star: 'storm', storm: 'vine', vine: 'stone', stone: 'star' };
export const strongAgainst = (el) => BEATS[el] || null;
export const weakAgainst = (el) => Object.keys(BEATS).find((k) => BEATS[k] === el) || null;
export function elementMultiplier(attacker, defender, defenderSpecies = null) {
  let m = 1;
  if (attacker && defender && attacker !== 'arcane' && defender !== 'arcane') {
    if (BEATS[attacker] === defender) m = 1.5;
    else if (BEATS[defender] === attacker) m = 0.7;
  }
  const res = defenderSpecies && SPECIES[defenderSpecies]?.resist;
  if (res && res === attacker) m *= 0.6;
  return m;
}
export function effectLabel(m) {
  if (m >= 1.4) return { cls: 'super', text: '▲ Super effective' };
  if (m <= 0.5) return { cls: 'resist', text: '▼▼ Resists' };
  if (m < 0.95) return { cls: 'weak', text: '▼ Not very effective' };
  return { cls: 'normal', text: 'Normal damage' };
}

// ---- Power classes [TUNABLE] ----
// Higher classes are stronger, need higher levels to evolve, and only appear once the kid's math tier
// in that region is high enough (challenge spots show them a little earlier).
export const CLASSES = {
  // mult kept close together so a new rarer pet is a clear but not huge step up [TUNABLE]
  // v62: every class evolves at the same levels (was up to 26/46 for Epic): rarer pets joined with fewer moves than the
  // Commons they would replace and never reached stage 3 in a region (Spell Evaluation v61).
  1: { name: 'Common', mult: 1.0, evolve: [14, 28], unlock: 1.0 },
  2: { name: 'Uncommon', mult: 1.1, evolve: [14, 28], unlock: 1.8 },
  3: { name: 'Rare', mult: 1.2, evolve: [14, 28], unlock: 2.6 },
  4: { name: 'Epic', mult: 1.32, evolve: [14, 28], unlock: 3.4 },
};
// Befriend zone [TUNABLE]: a wild pet can be befriended once its health is at or below this share.
// Common pets trust you sooner; rarer, stronger pets must be worn down much further. Rare (sparkly) variants need 30% less.
export const BEFRIEND_AT = { 1: 0.5, 2: 0.3, 3: 0.2, 4: 0.12 };
export const befriendThreshold = (species, rare = false) => (BEFRIEND_AT[SPECIES[species]?.cls] ?? 0.45) * (rare ? 0.7 : 1);
export const CHALLENGE_EARLY = 0.8;          // challenge pets appear this much before their normal unlock tier
export const STAGE_MULT = { 1: 1, 2: 1.2, 3: 1.4 };   // evolved pets feel clearly stronger; enemies scale with team power (progress.js) so it never gets too easy

// ---- Roles: stat shape (each sums to 4.0 so pets of the same class are balanced) ----
export const ROLES = {
  striker: { name: 'Striker', icon: '⚔️', desc: 'Hits hard, but is easier to knock out.', hp: 0.9, pow: 1.3, ward: 0.85, spd: 0.95 },
  tank: { name: 'Tank', icon: '🛡️', desc: 'Lots of health and defence, but slow. Protects the team.', hp: 1.35, pow: 0.8, ward: 1.25, spd: 0.6 },
  swift: { name: 'Swift', icon: '💨', desc: 'Very fast, so it gets extra turns, with lighter hits.', hp: 0.85, pow: 0.95, ward: 0.8, spd: 1.4 },
  support: { name: 'Support', icon: '💚', desc: 'Heals, shields and boosts teammates.', hp: 1.05, pow: 0.8, ward: 1.05, spd: 1.1 },
  trickster: { name: 'Trickster', icon: '🌀', desc: 'Slows, freezes and weakens the other team.', hp: 0.95, pow: 0.9, ward: 0.95, spd: 1.2 },
  balanced: { name: 'All-rounder', icon: '⭐', desc: 'Good at a bit of everything.', hp: 1.0, pow: 1.0, ward: 1.0, spd: 1.0 },
};

// id, family, strand, class, role, resists
const DEF = [
  ['numberling', 'qpv', 'number', 1, 'balanced', 'vine'],
  ['counter', 'qpv', 'number', 1, 'tank', 'stone'],
  ['addsub', 'ops', 'number', 1, 'swift', 'storm'],
  ['fractling', 'qpv', 'number', 2, 'trickster', 'star'],
  ['factsprite', 'ops', 'number', 2, 'striker', 'vine'],
  ['multiplier', 'ops', 'number', 3, 'striker', 'stone'],
  ['percenta', 'qpv', 'number', 3, 'support', 'storm'],
  ['orderling', 'ops', 'number', 4, 'trickster', 'vine'],
  ['patternkin', 'patterns', 'patterns', 1, 'support', 'storm'],
  ['balancer', 'patterns', 'patterns', 2, 'tank', 'star'],
  ['clockwork', 'measurement', 'shape', 1, 'tank', 'star'],
  ['measurer', 'measurement', 'shape', 2, 'balanced', 'vine'],
  ['angler', 'measurement', 'shape', 4, 'striker', 'star'],
  ['shapeshifter', 'geometry', 'shape', 1, 'striker', 'storm'],
  ['mirrorwing', 'geometry', 'shape', 3, 'trickster', 'storm'],
  ['datapup', 'data', 'stats', 1, 'swift', 'stone'],
  ['chancewing', 'data', 'stats', 2, 'trickster', 'stone'],
  ['coinling', 'data', 'stats', 1, 'support', 'vine'],
  // added pets (more variety at every class)
  ['hummbit', 'patterns', 'patterns', 1, 'swift', 'storm'],
  ['equalizard', 'patterns', 'patterns', 2, 'striker', 'stone'],
  ['funcshroom', 'patterns', 'patterns', 3, 'support', 'star'],
  ['chamelix', 'patterns', 'patterns', 3, 'trickster', 'storm'],
  ['arborithm', 'patterns', 'patterns', 4, 'balanced', 'storm'],
  ['prismouse', 'geometry', 'shape', 2, 'swift', 'vine'],
  ['areadillo', 'measurement', 'shape', 3, 'tank', 'star'],
  ['golemetry', 'geometry', 'shape', 4, 'tank', 'vine'],
  ['tallyfin', 'data', 'stats', 2, 'support', 'star'],
  ['histohawk', 'data', 'stats', 3, 'striker', 'vine'],
  ['pictobear', 'data', 'stats', 3, 'tank', 'stone'],
  ['meanicorn', 'data', 'stats', 4, 'support', 'star'],
  ['primeflare', 'ops', 'number', 4, 'swift', 'stone'],
];

const FALLBACK_NAMES = {
  numberling: ['Numbit', 'Numbunny', 'Numerion'], counter: ['Beadle', 'Abacub', 'Abacastor'],
  fractling: ['Slicepig', 'Pieshog', 'Fractorn'], percenta: ['Hootcent', 'Percowl', 'Percentaur'],
  addsub: ['Plux', 'Pluxfox', 'Summitail'], factsprite: ['Flick', 'Flickwing', 'Factaria'],
  multiplier: ['Tailix', 'Twintail', 'Myriafox'], orderling: ['Bracky', 'Brackoon', 'Ordermask'],
  patternkin: ['Loopling', 'Cocoonit', 'Repeatterfly'], balancer: ['Teeter', 'Seesabug', 'Equilibeetle'],
  clockwork: ['Tickle', 'Sundialtle', 'Chronoshell'], measurer: ['Inchy', 'Rulerraffe', 'Metrosaur'],
  angler: ['Clawtri', 'Protractab', 'Anglimar'], shapeshifter: ['Polykit', 'Hexcat', 'Tessellynx'],
  mirrorwing: ['Mothy', 'Mirromoth', 'Symmetrix'], datapup: ['Barky', 'Graphound', 'Datawolf'],
  chancewing: ['Dicebat', 'Spinwing', 'Probabird'], coinling: ['Pennotter', 'Loonotter', 'Treasotter'],
};

export const SPECIES = {};
for (const [id, family, strand, cls, role, resist] of DEF) {
  const art = SPECIES_ART?.[id];
  SPECIES[id] = {
    id, family, strand, element: STRAND_ELEMENT[strand], cls, role, resist,
    names: art ? [art.name1, art.name2, art.name3] : FALLBACK_NAMES[id],
    evolve: CLASSES[cls].evolve,
  };
}

export const STARTERS = ['numberling', 'patternkin', 'shapeshifter', 'datapup'];
export const speciesName = (pet) => pet.nickname || SPECIES[pet.species].names[pet.stage - 1];

/** Level at which a pet's current stage can evolve (null when fully evolved). */
export const evolveLevel = (pet) => (pet.stage >= 3 ? null : SPECIES[pet.species].evolve[pet.stage - 1]);
/** Stage a wild pet of this level would naturally be at. */
export const stageForLevel = (species, level) => { const e = SPECIES[species].evolve; return level >= e[1] ? 3 : level >= e[0] ? 2 : 1; };
export const LEVEL_CAP = 50;
// Pacing [TUNABLE]: steeper curve so a region's first three areas take roughly an hour (see DESIGN.md).
export const xpToNext = (level) => Math.round(20 + 8 * level + 0.5 * level * level);

export function petStats(pet, bonus = {}) {
  const sp = SPECIES[pet.species];
  const role = ROLES[sp.role];
  const L = pet.level;
  const k = CLASSES[sp.cls].mult * (STAGE_MULT[pet.stage] || 1) * (pet.rare ? 1.08 : 1) * rankBoost(pet.rank);
  return {
    maxHp: Math.round((26 + L * 6) * role.hp * k + (bonus.vitality || 0)),
    power: Math.round((6 + L * 2.2) * role.pow * k + (bonus.power || 0)),
    ward: Math.round((3 + L * 1.4) * role.ward * k + (bonus.ward || 0)),
    speed: +(10 * role.spd * (1 + L * 0.006) * (1 + (pet.stage - 1) * 0.05)).toFixed(2),
  };
}

// ---- Merging: combine pets of the same kind into one stronger pet with a star rank ----
export const MAX_RANK = 5;
/** How many OTHER pets of the same kind are needed to go from `rank` to `rank + 1` (★1→★2 needs 2, ★2→★3 needs 3, …). */
export const mergeCost = (rank = 1) => rank + 1;
export const rankBoost = (rank = 1) => 1 + 0.15 * ((rank || 1) - 1);
export const stars = (rank = 1) => '★'.repeat(Math.max(1, rank || 1));   // every pet starts at ★; merges add more

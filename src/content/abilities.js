// Abilities for wizards, pets and champions (stamina battle system).
// target: 'enemy' | 'allEnemies' | 'ally' | 'allAllies' | 'self'
// fx: which spell effect to play (element comes from the caster unless given).

export const MAX_MAGIC = 6;

// ---- Wizard abilities: unlocked by wizard level ----
export const WIZARD_ABILITIES = [
  { id: 'bolt', name: 'Arcane Bolt', icon: '✦', level: 1, cost: 0, target: 'enemy', kind: 'attack', mult: 1.0, fx: { element: 'arcane', power: 'basic' }, desc: 'A magic bolt at one enemy.' },
  { id: 'befriend', name: 'Befriend', icon: '🤝', level: 1, cost: 0, target: 'enemy', kind: 'befriend', desc: 'Make friends with a weakened wild pet.' },
  { id: 'mend', name: 'Mend', icon: '💚', level: 2, cost: 1, target: 'ally', kind: 'heal', amount: 0.35, desc: 'Heal one teammate.' },
  { id: 'shield', name: 'Ward Shield', icon: '🛡️', level: 3, cost: 1, target: 'ally', kind: 'shield', amount: 0.3, desc: 'Blocks damage on the next hits.' },
  { id: 'haste', name: 'Haste', icon: '⏩', level: 4, cost: 2, target: 'ally', kind: 'stamina', stamina: 70, status: { haste: 2 }, desc: 'Fills a teammate’s stamina and speeds them up.' },
  { id: 'frost', name: 'Frost Bolt', icon: '❄️', level: 6, cost: 2, target: 'enemy', kind: 'attack', mult: 0.9, status: { freeze: 1 }, fx: { element: 'arcane', power: 'power' }, desc: 'Damages and freezes an enemy for 1 turn.' },
  { id: 'starfall', name: 'Starfall', icon: '🌠', level: 8, cost: 3, target: 'randomEnemies', hits: 4, kind: 'attack', mult: 0.6, fx: { element: 'star', power: 'ultimate' }, desc: '4 falling stars hit random enemies.' },
  { id: 'grouphealing', name: 'Group Heal', icon: '💞', level: 10, cost: 3, target: 'allAllies', kind: 'heal', amount: 0.25, desc: 'Heals the whole team.' },
  { id: 'slow', name: 'Slow', icon: '🐢', level: 12, cost: 2, target: 'enemy', kind: 'stamina', stamina: -60, status: { slow: 2 }, desc: 'Drains an enemy’s stamina and slows it.' },
  { id: 'empower', name: 'Empower', icon: '💪', level: 14, cost: 2, target: 'ally', kind: 'buff', status: { empower: 1 }, desc: 'A teammate’s next attack does double damage.' },
  { id: 'timewarp', name: 'Time Warp', icon: '⌛', level: 16, cost: 4, target: 'allAllies', kind: 'stamina', stamina: 50, desc: 'Fills stamina for the whole team.' },
  // Stronger versions replace the basic ones once learned (heals and shields are a fixed share of health).
  { id: 'majorheal', name: 'Major Heal', icon: '💖', level: 20, cost: 2, target: 'ally', kind: 'heal', amount: 0.55, replaces: 'mend', desc: 'A big heal on one teammate.' },
  { id: 'greatward', name: 'Great Ward', icon: '🛡️', level: 22, cost: 2, target: 'ally', kind: 'shield', amount: 0.45, replaces: 'shield', desc: 'A strong shield on one teammate.' },
  { id: 'majorgroup', name: 'Major Group Heal', icon: '💞', level: 25, cost: 4, target: 'allAllies', kind: 'heal', amount: 0.4, replaces: 'grouphealing', desc: 'A big heal for the whole team.' },
  { id: 'thunder', name: 'Thunderstorm', icon: '⛈️', level: 18, cost: 5, target: 'allEnemies', kind: 'attack', mult: 1.0, status: { stun: 1 }, statusChance: 0.4, fx: { element: 'storm', power: 'ultimate' }, desc: 'Strikes every enemy and may stun them.' },
];
WIZARD_ABILITIES.sort((a, b) => a.level - b.level);
export const wizardAbilitiesFor = (level) => {
  const known = WIZARD_ABILITIES.filter((a) => a.level <= level);
  const replaced = new Set(known.map((a) => a.replaces).filter(Boolean));
  return known.filter((a) => !replaced.has(a.id));
};
export const nextWizardUnlock = (level) => WIZARD_ABILITIES.find((a) => a.level > level) || null;

// ---- Pet skill trees: by role (pets of the same role share moves, flavoured by element) ----
// Each entry unlocks at a stage and a level. Stage-2/3 entries unlock at the species' evolve level (+ offset).
// power: effect size for the spell animation (basic / power / ultimate).
const EL_WORD = { star: 'Star', vine: 'Vine', stone: 'Stone', storm: 'Storm' };
// What a lingering hit is called for each element (damage over time).
export const DOT_STYLE = { star: ['Starburn', '✨'], vine: ['Thorns', '🌿'], stone: ['Grit', '🪨'], storm: ['Static', '⚡'], arcane: ['Hex', '🔮'] };
const ROLE_TREES = {
  striker: [
    { at: [1, 0], name: '{E} Strike', kind: 'attack', mult: 1.0, cost: 0, desc: 'A solid hit on one enemy.' },
    { at: [1, 4], name: 'Heavy Blow', kind: 'attack', mult: 1.5, cost: 1, desc: 'A big hit on one enemy.' },
    { at: [1, 9], name: 'Focus', kind: 'buff', target: 'self', status: { empower: 1 }, cost: 1, desc: 'Its next attack does double damage.' },
    { at: [2, 0], name: 'Piercing {E}', kind: 'attack', mult: 1.6, pierce: true, cost: 2, desc: 'Ignores shields and defence.' },
    { at: [2, 5], name: 'Scatter Shot', kind: 'attack', target: 'randomEnemies', mult: 0.7, hits: 3, cost: 2, desc: '3 shots that each hit a random enemy.' },
    { at: [3, 0], name: '{E} Meteor', kind: 'attack', target: 'allEnemies', mult: 1.0, cost: 3, desc: 'Hits every enemy.' },
    { at: [3, 5], name: 'Ultimate {E} Blast', kind: 'attack', mult: 2.6, critBonus: 0.2, cost: 4, desc: 'A massive hit with a high critical chance.' },
  ],
  tank: [
    { at: [1, 0], name: '{E} Bump', kind: 'attack', mult: 1.0, cost: 0, desc: 'A sturdy hit on one enemy.' },
    { at: [1, 4], name: 'Guard Up', kind: 'buff', target: 'self', status: { armor: 3 }, cost: 1, desc: 'Takes much less damage for 3 turns.' },
    { at: [1, 9], name: 'Body Slam', kind: 'attack', mult: 1.2, splash: 0.3, status: { stun: 1 }, statusChance: 0.35, cost: 1, desc: 'May stun the enemy, with a small splash on the others.' },
    { at: [2, 0], name: 'Shield Wall', kind: 'shield', target: 'allAllies', amount: 0.2, cost: 2, desc: 'Shields the whole team.' },
    { at: [2, 5], name: 'Challenge Roar', kind: 'taunt', target: 'self', turns: 3, rally: 0.3, cost: 2, desc: 'Enemies must attack it, and its teammates hit 30% harder until it gets hit.' },
    { at: [3, 0], name: '{E} Fortress', kind: 'buff', target: 'allAllies', status: { armor: 2 }, cost: 3, desc: 'The whole team takes less damage for 2 turns.' },
    { at: [3, 5], name: '{E} Quake', kind: 'attack', target: 'allEnemies', mult: 1.0, status: { stun: 1 }, statusChance: 0.35, cost: 4, desc: 'Hits every enemy and may stun them.' },
  ],
  swift: [
    { at: [1, 0], name: 'Quick {E}', kind: 'attack', mult: 0.9, selfStamina: 25, cost: 0, desc: 'A fast hit. It gets its next turn sooner.' },
    { at: [1, 4], name: 'Twin Jab', kind: 'attack', mult: 0.7, hits: 2, cost: 1, desc: 'Hits twice.' },
    { at: [1, 9], name: 'Dash', kind: 'attack', mult: 0.8, selfStamina: 60, cost: 1, desc: 'Hits and nearly refills its own stamina.' },
    { at: [2, 0], name: '{E} Flurry', kind: 'attack', mult: 0.55, hits: 3, cost: 2, desc: 'Hits three times.' },
    { at: [2, 5], name: 'Tailwind', kind: 'stamina', target: 'allAllies', stamina: 35, status: { haste: 2 }, cost: 2, desc: 'Speeds up the whole team.' },
    { at: [3, 0], name: '{E} Blitz', kind: 'attack', target: 'allEnemies', mult: 0.8, selfStamina: 40, cost: 3, desc: 'Hits every enemy and acts again sooner.' },
    { at: [3, 5], name: 'Lightning Rush', kind: 'attack', target: 'randomEnemies', mult: 0.6, hits: 5, cost: 4, desc: '5 lightning hits on random enemies!' },
  ],
  support: [
    { at: [1, 0], name: '{E} Spark', kind: 'attack', mult: 0.9, cost: 0, desc: 'A light hit on one enemy.' },
    { at: [1, 4], name: 'Mend', kind: 'heal', target: 'ally', amount: 0.3, cost: 1, desc: 'Heals one teammate.' },
    { at: [1, 9], name: 'Cheer', kind: 'buff', target: 'ally', status: { empower: 1 }, cost: 1, desc: 'A teammate’s next attack does double damage.' },
    { at: [2, 0], name: 'Healing {E}', kind: 'heal', target: 'allAllies', amount: 0.2, cost: 2, desc: 'Heals the whole team.' },
    { at: [2, 5], name: 'Protect', kind: 'shield', target: 'ally', amount: 0.35, cost: 1, desc: 'A strong shield on one teammate.' },
    { at: [3, 0], name: 'Regrowth', kind: 'regen', target: 'allAllies', amount: 0.1, turns: 3, cost: 3, desc: 'The whole team heals a little on each of its next 3 turns.' },
    { at: [3, 5], name: 'Radiant {E}', kind: 'heal', target: 'allAllies', amount: 0.35, cleanse: true, cost: 4, desc: 'Big team heal that also removes freeze, stun and slow.' },
  ],
  trickster: [
    { at: [1, 0], name: '{E} Nip', kind: 'attack', mult: 1.0, cost: 0, desc: 'A quick hit on one enemy.' },
    { at: [1, 4], name: 'Sap', kind: 'attack', mult: 0.8, stamina: -30, status: { slow: 2 }, cost: 1, desc: 'Hits, drains stamina and slows the enemy.' },
    { at: [1, 9], name: 'Hex', kind: 'debuff', target: 'enemy', status: { weaken: 2 }, cost: 1, desc: 'The enemy does less damage for 2 turns.' },
    { at: [2, 0], name: 'Freeze Ray', kind: 'attack', mult: 0.9, status: { freeze: 1 }, cost: 2, desc: 'Hits and freezes the enemy for 1 turn.' },
    { at: [2, 5], name: '{E} Sting', kind: 'attack', mult: 0.6, dot: { turns: 3, mult: 0.35 }, cost: 2, desc: 'Hits, then keeps hurting the enemy for 3 of its turns.' },
    { at: [3, 0], name: '{E} Blizzard', kind: 'attack', target: 'allEnemies', mult: 0.8, status: { freeze: 1 }, statusChance: 0.4, cost: 3, desc: 'Hits every enemy and may freeze them.' },
    { at: [3, 5], name: 'Time Stop', kind: 'debuff', target: 'allEnemies', status: { stun: 1 }, cost: 4, desc: 'Every enemy misses its next turn.' },
  ],
  balanced: [
    { at: [1, 0], name: '{E} Swipe', kind: 'attack', mult: 1.0, cost: 0, desc: 'A hit on one enemy.' },
    { at: [1, 4], name: 'Power Hit', kind: 'attack', mult: 1.4, cost: 1, desc: 'A strong hit on one enemy.' },
    { at: [1, 9], name: 'Second Wind', kind: 'heal', target: 'self', amount: 0.3, cost: 1, desc: 'Heals itself.' },
    { at: [2, 0], name: '{E} Splash', kind: 'attack', mult: 1.1, splash: 0.5, cost: 2, desc: 'Hits one enemy, and splashes half damage onto the others.' },
    { at: [2, 5], name: 'Brace', kind: 'buff', target: 'self', status: { armor: 2 }, shieldSelf: 0.2, cost: 1, desc: 'Shields itself and takes less damage.' },
    { at: [3, 0], name: 'Draining {E}', kind: 'attack', mult: 1.6, drain: 0.5, cost: 3, desc: 'A powerful hit that heals it for half the damage done.' },
    { at: [3, 5], name: '{E} Finale', kind: 'attack', target: 'allEnemies', mult: 1.1, cost: 4, desc: 'A big hit on every enemy.' },
  ],
};
const SLOT_COST = [0, 2, 2, 3, 3, 4, 5];
const ICONS = { attack: ['✧', '✦', '✹'], heal: '💚', shield: '🛡️', buff: '💪', debuff: '🌀', stamina: '⏩', taunt: '🎯', regen: '🌱' };

/** Full skill tree for a species, with the level each skill unlocks at. */
// Heals and shields restore a fixed share of health. More powerful pets (higher class) get stronger versions [TUNABLE].
const SUPPORT_UPGRADE = { 3: { prefix: 'Greater', mult: 1.3 }, 4: { prefix: 'Major', mult: 1.6 } };
function upgradeSupport(move, cls) {
  const up = SUPPORT_UPGRADE[cls];
  const amount = up ? Math.min(0.7, Math.round(move.amount * up.mult * 100) / 100) : move.amount;
  const what = move.kind === 'heal' ? 'health back' : move.kind === 'regen' ? 'health each turn' : 'health as a shield';
  return { ...move, amount, name: up ? `${up.prefix} ${move.name}` : move.name, desc: `${move.desc} (${Math.round(amount * 100)}% ${what})` };
}

export function skillTree(sp) {
  const E = EL_WORD[sp.element] || '';
  return ROLE_TREES[sp.role].map((t, i) => {
    const [stage, off] = t.at;
    const level = Math.min(50, stage === 1 ? Math.max(1, off) : sp.evolve[stage - 2] + off);
    // Magic cost rises with the move's place in the tree: stronger moves cost more [TUNABLE].
    const cost = SLOT_COST[i] ?? t.cost;
    const power = cost >= 4 ? 'ultimate' : cost >= 2 ? 'power' : 'basic';
    const icon = t.kind === 'attack' ? ICONS.attack[cost >= 4 ? 2 : cost >= 2 ? 1 : 0] : ICONS[t.kind];
    const move = { id: `${sp.role}-${i}`, ...t, cost, name: t.name.replace('{E}', E).trim(), target: t.target || 'enemy', stage, level, icon, fx: { power } };
    return t.kind === 'heal' || t.kind === 'shield' || t.kind === 'regen' ? upgradeSupport(move, sp.cls) : move;
  });
}
/** Skills a pet can use right now (reached its stage and level). */
export function petAbilitiesFor(sp, stage, level) {
  return skillTree(sp).filter((a) => a.stage <= stage && a.level <= level);
}

// ---- Enemy wizard (trainer) abilities by trainer level ----
export function trainerAbilities(level) {
  const list = [WIZARD_ABILITIES[0], WIZARD_ABILITIES[2], WIZARD_ABILITIES[3]];
  if (level >= 5) list.push(WIZARD_ABILITIES[5]);
  if (level >= 9) list.push(WIZARD_ABILITIES[6]);
  return list;
}

// ---- Guardian champion abilities ----
export function guardianAbilities(element) {
  return [
    { id: 'g-strike', name: 'Guardian Strike', icon: '✹', cost: 0, target: 'enemy', kind: 'attack', mult: 1.3, fx: { element, power: 'power' } },
    { id: 'g-wave', name: 'Guardian Wave', icon: '🌊', cost: 0, target: 'allEnemies', kind: 'attack', mult: 0.8, status: { stun: 1 }, statusChance: 0.25, fx: { element, power: 'ultimate' }, every: 3 },
    { id: 'g-renew', name: 'Renew', icon: '💚', cost: 0, target: 'self', kind: 'heal', amount: 0.15, lowHp: 0.4 },
  ];
}



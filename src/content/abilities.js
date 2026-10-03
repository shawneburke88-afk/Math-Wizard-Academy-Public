// Abilities for wizards, pets and champions (stamina battle system).
// target: 'enemy' | 'allEnemies' | 'ally' | 'allAllies' | 'self'
// fx: which spell effect to play (element comes from the caster unless given).

export const MAX_MAGIC = 6;

// ---- Wizard abilities: unlocked by wizard level ----
// v62: five spell lines, each upgraded in place (`replaces`), so the wizard never shows more than 5 spell buttons and
// never loses a kind of move: Arcane Bolt · heals (with a little shield) · speed · freeze · a big attack. The top of
// the big-attack line is the Star Dragon, which uses all 6 magic orbs.
// Extra effects any move can carry ("riders", applied after its main effect): strike (also hits an enemy for this
// share of power), selfStatus / teamStatus (statuses on the caster / its whole team), teamShield / teamHeal /
// selfHeal (share of max health), teamStamina, shieldSelf.
export const WIZARD_ABILITIES = [
  { id: 'bolt', name: 'Arcane Bolt', icon: '✦', level: 1, cost: 0, target: 'enemy', kind: 'attack', mult: 1.0, fx: { element: 'arcane', power: 'basic' }, desc: 'A magic bolt at one enemy.' },
  { id: 'befriend', name: 'Befriend', icon: '🤝', level: 1, cost: 0, target: 'enemy', kind: 'befriend', desc: 'Make friends with a weakened wild pet.' },
  { id: 'mend', name: 'Mend', icon: '💚', level: 2, cost: 1, target: 'ally', kind: 'heal', amount: 0.35, shieldToo: 0.1, desc: 'Heals one teammate and gives it a small shield.' },
  { id: 'haste', name: 'Haste', icon: '⏩', level: 4, cost: 2, target: 'ally', kind: 'stamina', stamina: 70, status: { haste: 2 }, desc: 'Fills a teammate’s stamina and speeds it up.' },
  { id: 'frost', name: 'Frost Bolt', icon: '❄️', level: 6, cost: 2, target: 'enemy', kind: 'attack', mult: 0.9, status: { freeze: 1, slow: 2 }, fx: { element: 'arcane', power: 'power' }, desc: 'Damages an enemy, freezes it for 1 turn and slows it.' },
  { id: 'starfall', name: 'Starfall', icon: '🌠', level: 8, cost: 3, target: 'randomEnemies', hits: 4, kind: 'attack', mult: 0.75, fx: { element: 'star', power: 'ultimate' }, desc: '4 falling stars hit random enemies.' },
  { id: 'grouphealing', name: 'Group Heal', icon: '💞', level: 10, cost: 3, target: 'allAllies', kind: 'heal', amount: 0.3, teamShield: 0.08, replaces: 'mend', desc: 'Heals the whole team and shields it a little.' },
  { id: 'timewarp', name: 'Time Warp', icon: '⌛', level: 14, cost: 3, target: 'allAllies', kind: 'stamina', stamina: 50, status: { haste: 2 }, replaces: 'haste', desc: 'Fills stamina for the whole team and speeds everyone up.' },
  { id: 'thunder', name: 'Thunderstorm', icon: '⛈️', level: 16, cost: 4, target: 'allEnemies', kind: 'attack', mult: 1.1, status: { stun: 1 }, statusChance: 0.4, replaces: 'starfall', fx: { element: 'storm', power: 'ultimate' }, desc: 'Strikes every enemy and may stun them.' },
  { id: 'majorgroup', name: 'Major Group Heal', icon: '💖', level: 22, cost: 4, target: 'allAllies', kind: 'heal', amount: 0.42, teamShield: 0.15, cleanse: true, replaces: 'grouphealing', desc: 'A big heal and shield for the whole team, and it clears freeze, stun and slow.' },
  { id: 'arcanenova', name: 'Arcane Nova', icon: '🔮', level: 24, cost: 4, target: 'allEnemies', kind: 'attack', mult: 1.1, status: { freeze: 1 }, statusChance: 0.5, replaces: 'frost', fx: { element: 'arcane', power: 'ultimate' }, desc: 'A burst of magic hits every enemy; each may be frozen.' },
  { id: 'stardragon', name: 'Star Dragon', icon: '🐉', level: 30, cost: 6, target: 'allEnemies', kind: 'attack', mult: 1.7, status: { stun: 1 }, super: 'dragon', replaces: 'thunder', fx: { element: 'star', power: 'ultimate' }, desc: 'Uses all 6 magic orbs: a dragon swoops in and blasts every enemy, and they all lose a turn!' },
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
// `up: i` = this move is a stronger version of move i of the tree and replaces it (v62: a pet keeps one move of
// every kind it has learned; only a stronger move of the same kind takes an older one's place, so a pet shows
// at most 5 moves: its free attack and 4 others). Values measured with tools/arena.mjs (docs: Spell Evaluation).
const EL_WORD = { star: 'Star', vine: 'Vine', stone: 'Stone', storm: 'Storm' };
// What a lingering hit is called for each element (damage over time).
export const DOT_STYLE = { star: ['Starburn', '✨'], vine: ['Thorns', '🌿'], stone: ['Grit', '🪨'], storm: ['Static', '⚡'], arcane: ['Hex', '🔮'] };
const ROLE_TREES = {
  striker: [
    { at: [1, 0], name: '{E} Strike', kind: 'attack', mult: 1.0, desc: 'A solid hit on one enemy.' },
    { at: [1, 4], name: 'Heavy Blow', kind: 'attack', mult: 1.5, desc: 'A big hit on one enemy.' },
    { at: [1, 9], name: 'Focus Strike', kind: 'attack', mult: 1.15, selfStatus: { empower: 1 }, desc: 'Hits, and its next attack does double damage.' },
    { at: [2, 0], name: 'Piercing {E}', kind: 'attack', mult: 1.5, pierce: true, up: 1, desc: 'A big hit that ignores shields and defence.' },
    { at: [2, 5], name: 'Scatter Shot', kind: 'attack', target: 'randomEnemies', mult: 0.75, hits: 3, desc: '3 shots that each hit a random enemy.' },
    { at: [3, 0], name: '{E} Meteor', kind: 'attack', target: 'allEnemies', mult: 1.3, up: 4, desc: 'Hits every enemy.' },
    { at: [3, 5], name: 'Ultimate {E} Blast', kind: 'attack', mult: 2.8, critBonus: 0.2, splash: 0.4, desc: 'A massive hit with a high critical chance that blasts the others too.' },
  ],
  tank: [
    { at: [1, 0], name: '{E} Bump', kind: 'attack', mult: 1.0, desc: 'A sturdy hit on one enemy.' },
    { at: [1, 4], name: 'Guard Up', kind: 'attack', mult: 1.1, selfStatus: { armor: 3 }, desc: 'Hits, then takes much less damage for 3 turns.' },
    { at: [1, 9], name: 'Body Slam', kind: 'attack', mult: 1.3, splash: 0.3, status: { stun: 1 }, statusChance: 0.4, desc: 'May stun the enemy, with a small splash on the others.' },
    { at: [2, 0], name: 'Shield Wall', kind: 'attack', mult: 1.0, teamShield: 0.22, up: 1, desc: 'Hits, and shields the whole team.' },
    { at: [2, 5], name: 'Challenge Roar', kind: 'taunt', target: 'self', turns: 3, rally: 0.4, strike: 1.1, desc: 'Hits, then roars: enemies must attack it, and its teammates hit 40% harder until it gets hit.' },
    { at: [3, 0], name: '{E} Fortress', kind: 'attack', target: 'allEnemies', mult: 0.9, teamStatus: { armor: 2 }, up: 3, desc: 'Hits every enemy; the whole team takes less damage for 2 turns.' },
    { at: [3, 5], name: '{E} Quake', kind: 'attack', target: 'allEnemies', mult: 1.25, status: { stun: 1 }, statusChance: 0.5, up: 2, desc: 'Hits every enemy and may stun them.' },
  ],
  swift: [
    { at: [1, 0], name: 'Quick {E}', kind: 'attack', mult: 0.9, selfStamina: 25, desc: 'A fast hit. It gets its next turn sooner.' },
    { at: [1, 4], name: 'Twin Jab', kind: 'attack', mult: 0.85, hits: 2, desc: 'Hits twice.' },
    { at: [1, 9], name: 'Dash', kind: 'attack', mult: 1.0, selfStamina: 60, desc: 'Hits and nearly refills its own stamina.' },
    { at: [2, 0], name: '{E} Flurry', kind: 'attack', mult: 0.75, hits: 3, up: 1, desc: 'Hits three times.' },
    { at: [2, 5], name: 'Tailwind', kind: 'stamina', target: 'allAllies', stamina: 50, status: { haste: 2 }, desc: 'Speeds up the whole team.' },
    { at: [3, 0], name: '{E} Blitz', kind: 'attack', target: 'allEnemies', mult: 1.2, selfStamina: 50, up: 2, desc: 'Hits every enemy and acts again sooner.' },
    { at: [3, 5], name: 'Lightning Rush', kind: 'attack', target: 'randomEnemies', mult: 0.8, hits: 5, desc: '5 lightning hits on random enemies!' },
  ],
  support: [
    { at: [1, 0], name: '{E} Spark', kind: 'attack', mult: 0.9, desc: 'A light hit on one enemy.' },
    { at: [1, 4], name: 'Mend', kind: 'heal', target: 'ally', amount: 0.35, strike: 0.8, desc: 'Heals one teammate and zaps an enemy.' },
    { at: [1, 9], name: 'Cheer', kind: 'buff', target: 'ally', status: { empower: 1 }, strike: 0.6, desc: 'Zaps an enemy, and a teammate’s next attack does double damage.' },
    { at: [2, 0], name: 'Healing {E}', kind: 'heal', target: 'allAllies', amount: 0.25, strike: 0.7, up: 1, desc: 'Heals the whole team and zaps an enemy.' },
    { at: [2, 5], name: 'Protect', kind: 'shield', target: 'ally', amount: 0.35, strike: 1.1, desc: 'A strong shield on one teammate, and zaps an enemy.' },
    { at: [3, 0], name: 'Regrowth', kind: 'regen', target: 'allAllies', amount: 0.12, turns: 3, teamHeal: 0.25, up: 3, desc: 'Heals the whole team now, and a little more on each of its next 3 turns.' },
    { at: [3, 5], name: 'Radiant {E}', kind: 'heal', target: 'allAllies', amount: 0.5, cleanse: true, teamShield: 0.15, strike: 0.8, up: 5, desc: 'Big team heal and shield that also removes freeze, stun and slow, and zaps an enemy.' },
  ],
  trickster: [
    { at: [1, 0], name: '{E} Nip', kind: 'attack', mult: 1.0, desc: 'A quick hit on one enemy.' },
    { at: [1, 4], name: 'Sap', kind: 'attack', mult: 0.65, stamina: -25, status: { slow: 2 }, desc: 'Hits, drains stamina and slows the enemy.' },
    { at: [1, 9], name: 'Hex', kind: 'attack', mult: 1.05, status: { weaken: 2 }, desc: 'Hits, and the enemy does 30% less damage for 2 turns.' },
    { at: [2, 0], name: 'Freeze Ray', kind: 'attack', mult: 0.9, status: { freeze: 1 }, desc: 'Hits and freezes the enemy for 1 turn.' },
    { at: [2, 5], name: '{E} Sting', kind: 'attack', mult: 0.6, dot: { turns: 3, mult: 0.7 }, status: { weaken: 2 }, up: 2, desc: 'Hits, keeps hurting the enemy for 3 of its turns, and weakens it.' },
    { at: [3, 0], name: '{E} Blizzard', kind: 'attack', target: 'allEnemies', mult: 1.0, status: { freeze: 1 }, statusChance: 0.5, up: 3, desc: 'Hits every enemy and may freeze them.' },
    { at: [3, 5], name: 'Time Stop', kind: 'debuff', target: 'allEnemies', status: { stun: 1 }, desc: 'Every enemy misses its next turn.' },
  ],
  balanced: [
    { at: [1, 0], name: '{E} Swipe', kind: 'attack', mult: 1.0, desc: 'A hit on one enemy.' },
    { at: [1, 4], name: 'Power Hit', kind: 'attack', mult: 1.4, desc: 'A strong hit on one enemy.' },
    { at: [1, 9], name: 'Second Wind', kind: 'attack', mult: 1.15, selfHeal: 0.3, desc: 'Hits and heals itself.' },
    { at: [2, 0], name: '{E} Splash', kind: 'attack', mult: 1.35, splash: 0.7, up: 1, desc: 'Hits one enemy and splashes most of it onto the others.' },
    { at: [2, 5], name: 'Brace', kind: 'attack', mult: 1.1, selfStatus: { armor: 2 }, shieldSelf: 0.2, desc: 'Hits, shields itself and takes less damage.' },
    { at: [3, 0], name: 'Draining {E}', kind: 'attack', mult: 2.0, drain: 0.5, up: 2, desc: 'A powerful hit that heals it for half the damage done.' },
    { at: [3, 5], name: '{E} Finale', kind: 'attack', target: 'allEnemies', mult: 1.45, up: 3, desc: 'A big hit on every enemy.' },
  ],
};
// Signature moves [TUNABLE]: each Rare kind has its own move and each Epic kind a once-per-battle Super Move. They take
// the place of the role's last move (its stage-3 ultimate). Rare: from stage 2 (+5 levels). Epic: from stage 2.
const SIGNATURES = {
  // Rare (class 3)
  multiplier: { name: 'Times Table', kind: 'attack', mult: 1.0, hits: 3, pierce: true, desc: 'Hits one enemy 3 times, ignoring shields.' },
  percenta: { name: 'Percent Bloom', kind: 'heal', target: 'allAllies', amount: 0.35, teamShield: 0.2, strike: 0.9, desc: 'Heals and shields the whole team, and zaps an enemy.' },
  funcshroom: { name: 'Spore Cloud', kind: 'attack', target: 'allEnemies', mult: 0.6, status: { weaken: 2 }, teamHeal: 0.1, desc: 'Hits every enemy and weakens them, and the team heals a little.' },
  chamelix: { name: 'Color Swap', kind: 'attack', target: 'allEnemies', mult: 0.7, stamina: -25, status: { slow: 2 }, desc: 'Hits every enemy and slows them all.' },
  areadillo: { name: 'Rolling Shell', kind: 'attack', target: 'allEnemies', mult: 1.0, teamShield: 0.2, desc: 'Rolls into every enemy, then shields the team.' },
  histohawk: { name: 'Dive Bomb', kind: 'attack', mult: 2.6, selfStamina: 60, desc: 'A huge diving hit, and it acts again sooner.' },
  pictobear: { name: 'Bear Hug', kind: 'attack', mult: 1.3, status: { stun: 1 }, selfHeal: 0.15, desc: 'A big hit that always stuns, and it heals itself.' },
  mirrorwing: { name: 'Mirror Maze', kind: 'attack', target: 'allEnemies', mult: 0.9, status: { freeze: 1 }, statusChance: 0.6, desc: 'Hits every enemy, and each may be frozen.' },
  // Epic (class 4): Super Moves, once per battle
  orderling: { name: 'Order of Operations', kind: 'attack', target: 'allEnemies', mult: 0.8, status: { stun: 1 }, desc: 'Hits every enemy, and they all lose a turn!' },
  angler: { name: 'Right-Angle Smash', kind: 'attack', mult: 2.6, pierce: true, splash: 0.35, desc: 'A giant hit that ignores defence and blasts the others too!' },
  arborithm: { name: 'World Tree', kind: 'attack', target: 'allEnemies', mult: 1.4, teamHeal: 0.35, desc: 'Hits every enemy and heals the whole team!' },
  golemetry: { name: 'Golem Fortress', kind: 'attack', target: 'allEnemies', mult: 1.0, teamShield: 0.3, teamStatus: { armor: 2 }, desc: 'Hits every enemy, then shields the team and makes it tough!' },
  meanicorn: { name: 'Rainbow Average', kind: 'heal', target: 'allAllies', amount: 0.5, cleanse: true, teamStamina: 40, teamShield: 0.2, strike: 1.0, desc: 'A huge team heal and shield that clears freeze, stun and slow, speeds everyone up and zaps an enemy!' },
  primeflare: { name: 'Prime Barrage', kind: 'attack', target: 'randomEnemies', mult: 0.95, hits: 7, desc: '7 blazing shots at random enemies!' },
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
  return { ...move, amount, name: up && !move.signature ? `${up.prefix} ${move.name}` : move.name, desc: `${move.desc} (${Math.round(amount * 100)}% ${what})` };
}

export function skillTree(sp) {
  const E = EL_WORD[sp.element] || '';
  const sig = SIGNATURES[sp.id];
  const tree = ROLE_TREES[sp.role].map((t, i) => {
    if (i === 6 && sig) {
      const epic = sp.cls >= 4;
      return { ...sig, at: epic ? [2, 0] : [2, 5], signature: epic ? 'super' : 'rare', once: epic, cost: epic ? 3 : 4,
        desc: epic ? `${sig.desc} Super Move: once per battle.` : `${sig.desc} A signature move: only this kind of pet knows it.` };
    }
    return t;
  });
  return tree.map((t, i) => {
    const [stage, off] = t.at;
    const level = Math.min(50, stage === 1 ? Math.max(1, off) : sp.evolve[stage - 2] + off);
    // Magic cost rises with the move's place in the tree: stronger moves cost more [TUNABLE].
    const cost = t.signature ? t.cost : SLOT_COST[i] ?? t.cost;
    const power = t.signature || cost >= 4 ? 'ultimate' : cost >= 2 ? 'power' : 'basic';
    const icon = t.signature === 'super' ? '🌟' : t.signature ? '⭐' : t.kind === 'attack' ? ICONS.attack[cost >= 4 ? 2 : cost >= 2 ? 1 : 0] : ICONS[t.kind];
    const replaces = t.up != null ? tree[t.up].name.replace('{E}', E).trim() : null;
    const desc = replaces ? `${t.desc} Replaces ${replaces}.` : t.desc;
    const move = { id: t.signature ? `sig-${sp.id}` : `${sp.role}-${i}`, ...t, desc, cost, replacesIndex: t.up ?? null, name: t.name.replace('{E}', E).trim(), target: t.target || 'enemy', stage, level, icon, fx: { power, ...(t.signature ? { signature: sp.id } : {}) } };
    return t.kind === 'heal' || t.kind === 'shield' || t.kind === 'regen' ? upgradeSupport(move, sp.cls) : move;
  });
}
/** Skills a pet can use right now (reached its stage and level), without the ones a stronger learned move replaced. */
export function petAbilitiesFor(sp, stage, level) {
  const tree = skillTree(sp);
  const known = tree.map((a, i) => (a.stage <= stage && a.level <= level ? i : -1)).filter((i) => i >= 0);
  const replaced = new Set(known.map((i) => tree[i].replacesIndex).filter((x) => x != null));
  return known.filter((i) => !replaced.has(i)).map((i) => tree[i]);
}

// ---- Enemy wizard (trainer) abilities by trainer level ----
export function trainerAbilities(level) {
  const by = (id) => WIZARD_ABILITIES.find((a) => a.id === id);
  const list = [by('bolt'), by('mend')];
  if (level >= 5) list.push(by('frost'));
  if (level >= 9) list.push(by('starfall'));
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



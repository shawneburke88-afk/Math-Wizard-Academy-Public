// Game rules that change a profile: pets, XP, evolution, objectives, healing, session time.
import { uid } from '../core/rng.js';
import { persist } from '../core/save.js';
import { track } from '../core/telemetry.js';
import { SPECIES, CLASSES, CHALLENGE_EARLY, petStats, xpToNext, evolveLevel, stageForLevel, LEVEL_CAP, MAX_RANK, mergeCost } from '../content/species.js';
import { equippedBonus, charmBonus } from '../content/items.js';
import { objectivesFor, guardianWakeCount, areaById, FEATURES, REGION_SPECIES, WANDERER_SHARE } from '../content/world.js';
import { getSkill, skillsForStrand } from '../content/curriculum.js';
import { skillState } from '../core/adaptive.js';

export const TEAM_MAX = 3;

// ---------- stats for the Grown-ups progress view ----------
// The wizard playing right now (set when they enter the world), so every answered question can be counted.
let activeProfile = null;
export const setActiveProfile = (p) => { activeProfile = p; };
export const getActiveProfile = () => activeProfile;
const dayKey = (t = Date.now()) => new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 10);   // local date
/** Today's activity record (questions, first-try right, play minutes), keeping the last 60 days. */
export function dailyRecord(profile) {
  const all = (profile.daily ||= {});
  const k = dayKey();
  if (!all[k]) {
    all[k] = { q: 0, ok: 0, play: 0 };
    const keys = Object.keys(all).sort();
    while (keys.length > 60) delete all[keys.shift()];
  }
  return all[k];
}
/** Count one answered question: daily activity, question format (choices/typed, with/without a picture), speed. */
export function noteAnswer(profile, { skillId, kind, picture, ok, second, ms }) {
  if (!profile) return;
  const d = dailyRecord(profile);
  d.q++; if (ok && !second) d.ok++;
  const f = (profile.formats ||= {});
  for (const key of [kind === 'num' ? 'typed' : 'choice', picture ? 'picture' : 'noPicture']) { const r = (f[key] ||= { n: 0, ok: 0 }); r.n++; if (ok && !second) r.ok++; }
  const s = profile.skills?.[skillId];
  if (s) { s.ms = (s.ms || 0) + Math.min(ms || 0, 120000); s.timed = (s.timed || 0) + 1; if (second) s.second = (s.second || 0) + 1; }
}

// ---------- pets ----------
export function newPet(species, level = 1, { rare = false, area = null, stage = 1 } = {}) {
  const pet = { id: uid(), species, stage: 1, level: 1, xp: 0, hp: 0, rare, rank: 1, charm: null, caughtIn: area, caughtAt: Date.now(), nickname: null };
  setLevel(pet, level);
  if (stage > pet.stage) { pet.stage = Math.min(3, stage); pet.hp = petStats(pet).maxHp; }   // befriended an evolved wild pet
  return pet;
}

export function setLevel(pet, level) {
  pet.level = Math.max(1, Math.min(LEVEL_CAP, level));
  // Wild pets above a threshold appear already evolved.
  pet.stage = stageForLevel(pet.species, pet.level);
  pet.hp = petStats(pet).maxHp;
}

export function addPet(profile, pet) {
  profile.pets.push(pet);
  profile.seen[pet.species] = true;
  if (profile.team.length < TEAM_MAX) profile.team.push(pet.id);
  pet.hp = fullStats(profile, pet).maxHp;
  persist();
  return pet;
}

export const getPet = (profile, id) => profile.pets.find((p) => p.id === id);
export const teamPets = (profile) => profile.team.map((id) => getPet(profile, id)).filter(Boolean);

export function fullStats(profile, pet) {
  const eq = equippedBonus(profile);
  const ch = charmBonus(profile, pet);
  const bonus = {};
  for (const k of ['power', 'ward', 'vitality', 'focus', 'luck']) bonus[k] = (eq[k] || 0) + (ch[k] || 0);
  return { ...petStats(pet, bonus), focus: bonus.focus, luck: bonus.luck };
}

// Rest between battles [TUNABLE]: every pet gets back this share of its max health (knocked-out pets wake up with it).
export const REST_HEAL = 0.15;   // health back after every battle [TUNABLE] (was 0.25: damage never added up)
/** Heals every pet a little after a battle. Returns true if anyone actually healed. */
export function restAfterBattle(profile, frac = REST_HEAL) {
  let healed = false;
  for (const p of profile.pets) {
    const max = fullStats(profile, p).maxHp;
    if (p.hp < max) { p.hp = Math.min(max, Math.max(0, p.hp) + Math.round(max * frac)); healed = true; }
  }
  persist();
  return healed;
}

export function healTeam(profile) {
  for (const p of profile.pets) p.hp = fullStats(profile, p).maxHp;
  persist();
}

/** Is the pet waiting at an evolution threshold? */
export function readyToEvolve(pet) {
  const at = evolveLevel(pet);
  return at != null && pet.level >= at;
}

// Coin fees [TUNABLE]: evolving (paid when the Evolution Trial is passed) and merging (paid when merging).
// v60: raised from 40 / 120 and 25 × rank. v58 bots (who never shopped) had ~300 coins at their first evolve,
// ~600–700 at their stage-3 evolves and ~1,250 earned by the end, so coins were piling up.
export const evolveFee = (pet) => (pet.stage >= 2 ? 250 : 100);
export const mergeFee = (rank = 1) => 50 * (rank || 1);
export const canAffordEvolve = (profile, pet) => (profile.coins || 0) >= evolveFee(pet);
export const canAffordMerge = (profile, pet) => (profile.coins || 0) >= mergeFee(pet.rank || 1);

/** Give XP; returns list of events [{type:'level', pet, level}, {type:'ready', pet}]. XP keeps flowing while a pet
 *  waits to evolve, so a kid who can't pass the trial or pay the fee yet never has a team that stops levelling. */
export function giveXP(profile, pet, amount) {
  const events = [];
  if (pet.level >= LEVEL_CAP) return events;
  pet.xp += amount;
  while (pet.xp >= xpToNext(pet.level) && pet.level < LEVEL_CAP) {
    pet.xp -= xpToNext(pet.level);
    const before = fullStats(profile, pet).maxHp;
    pet.level++;
    const after = fullStats(profile, pet).maxHp;
    pet.hp = Math.min(after, pet.hp + (after - before));
    events.push({ type: 'level', pet, level: pet.level });
    track('level', { sp: pet.species, lv: pet.level, st: pet.stage, cls: SPECIES[pet.species]?.cls });
    if (readyToEvolve(pet) && pet.level === evolveLevel(pet)) events.push({ type: 'ready', pet });
  }
  return events;
}

export function evolve(profile, pet) {
  track('evolve', { sp: pet.species, from: pet.stage, lv: pet.level, fee: evolveFee(pet) });
  profile.coins = Math.max(0, (profile.coins || 0) - evolveFee(pet));
  pet.stage = Math.min(3, pet.stage + 1);
  pet.hp = fullStats(profile, pet).maxHp;
  persist();
}

export const wizardXpNeeded = (level) => Math.round(40 + 20 * level + level * level);

export function giveWizardXP(profile, amount) {
  const w = profile.wizard;
  w.xp += amount;
  let leveled = false;
  while (w.xp >= wizardXpNeeded(w.level)) { w.xp -= wizardXpNeeded(w.level); w.level++; leveled = true; track('wizlevel', { lv: w.level }); }
  return leveled;
}

// ---------- enemy scaling ----------
// How much stronger the team is than plain Common, unevolved, gear-free pets of the same level (1 = the same).
export function teamPowerRatio(profile) {
  const team = teamPets(profile);
  if (!team.length) return 1;
  const r = team.map((p) => fullStats(profile, p).power / petStats({ species: 'numberling', stage: 1, level: p.level, rank: 1 }).power);
  return r.reduce((a, b) => a + b, 0) / r.length;
}
// Enemies absorb this share of the team's extra strength (gear, merges, rarer and evolved pets) [TUNABLE]: upgrades
// still feel strong, but battles stay a challenge. Less at the start of each tier (areas 1 and 3), so rare and evolved
// pets brought from earlier areas really feel their power there.
export const ENEMY_ABSORB = 0.5;
const ABSORB_BY_DEPTH = { 1: 0.45, 2: 0.45, 3: 0.5, 4: 0.6 };   // the start of each tier keeps more of your edge (v44: 0.2/0.3/0.3/0.5, v45: 0.35/0.45/0.45/0.6; areas 1 and 3 still ~100% won)
export const enemyScale = (profile, area = null) => 1 + (ABSORB_BY_DEPTH[area?.level] ?? ENEMY_ABSORB) * Math.max(0, teamPowerRatio(profile) - 1);

// ---------- strand anchors ----------
// Every tier of every strand plays like a fresh start. A strand has two tiers: areas 1–2 and areas 3–4. The first
// time a team enters a tier's first area (area 1 or area 3), its level is noted, and that tier's pets, Challenges,
// trainers and Guardian sit that many levels above their usual ranges, compared with the level a team normally has
// there (FRESH: a new wizard's starter for area 1, a typical team for area 3). So area 1 of a second strand feels like
// the first strand's area 1, and each area 3 feels like the first area 3, except for the edge that rarer and evolved
// pets give (anchors use levels only). Evolution stages still follow the usual levels, so wild pets look as they would
// in a first strand (and can be befriended the same way). [TUNABLE]
const FRESH = { 1: 3, 3: 9 };
const tierOf = (area) => (area.level >= 3 ? 3 : 1);
const anchorKey = (area) => (tierOf(area) === 3 ? `${area.region}:deep` : area.region);
const teamAvgLevel = (profile) => { const t = teamPets(profile); return t.length ? Math.round(t.reduce((s, p) => s + p.level, 0) / t.length) : FRESH[1]; };
/** Levels this wizard's enemies in an area sit above the usual range (see strand anchors above). */
export function areaShift(profile, area) {
  if (!area?.region || !(area.level > 0) || area.region === 'hub') return 0;
  const tier = tierOf(area);
  let anchor = profile.strandAnchor?.[anchorKey(area)];
  if (anchor == null) {
    // Not entered yet: preview from the team's level now (so a Challenge at the door already fits), except for a
    // tier a wizard was already playing before anchors existed (it keeps its usual levels).
    if (profile.areas?.[`${area.region}-${tier}`]?.visited) return 0;
    anchor = teamAvgLevel(profile);
  }
  return Math.max(0, Math.round(anchor - FRESH[tier]));
}
export const strandShift = (profile, region) => areaShift(profile, { region, level: 1 });
/** An area's wild pet level range for this wizard (shifted by its tier's anchor). */
export const areaPet = (profile, area) => { const sh = areaShift(profile, area); return [area.pet[0] + sh, area.pet[1] + sh]; };

/** Stage for a wild pet: its natural stage for its level, sometimes one evolution early once the team has evolved pets. */
// Evolved wild pets [TUNABLE]: once you own a kind evolved, about this share of that kind in the wild (in every area)
// shows up one stage further along, never past your own pet's stage, so every evolved one you meet can be befriended
// and merged. Kinds you haven't evolved always appear at their natural stage.
export const EVOLVED_WILD_SHARE = 0.35;
export function wildStage(profile, species, level, areaLevel, rand = Math.random) {
  const natural = stageForLevel(species, level);
  const owned = Math.max(0, ...profile.pets.filter((p) => p.species === species).map((p) => p.stage || 1));
  if (natural >= 3 || owned <= natural) return natural;
  return rand() < EVOLVED_WILD_SHARE ? natural + 1 : natural;
}
/** An evolved wild pet can only be befriended once you have your own pet of that kind at that stage or higher. */
export const canBefriendStage = (profile, species, stage) => stage <= 1 || profile.pets.some((p) => p.species === species && p.stage >= stage);

// ---------- areas & objectives ----------
export function areaState(profile, areaId) {
  let s = profile.areas[areaId];
  if (!s) s = profile.areas[areaId] = { obj: {}, baseline: null, guardian: false, visited: false };
  return s;
}

/** First time a kid enters a region's area: remember skill tiers so the learning objective measures growth from here. */
export function enterArea(profile, areaId) {
  const a = areaById(areaId);
  const s = areaState(profile, areaId);
  const first = !s.visited;
  s.visited = true;
  // First time into a tier's first area (area 1 or area 3): note the team's level (see strand anchors above).
  if (first && (a?.level === 1 || a?.level === 3) && profile.strandAnchor?.[anchorKey(a)] == null) (profile.strandAnchor ||= {})[anchorKey(a)] = teamAvgLevel(profile);
  if (a && a.level > 0 && !s.baseline) {
    s.baseline = {};
    for (const sk of skillsForStrand(profile, a.region)) s.baseline[sk.id] = skillState(profile, sk.id).tier;
  }
  persist();
  return first;
}

export function objectiveProgress(profile, areaId) {
  const s = areaState(profile, areaId);
  const a = areaById(areaId);
  return objectivesFor(areaId).map((o) => {
    let count = s.obj[o.id] || 0;
    if (o.type === 'learn' && s.baseline) {
      count = Object.entries(s.baseline).filter(([id, t]) => (profile.skills[id]?.tier || 1) > t || profile.skills[id]?.mastered).length;
      // Skills new to this grade since entering (e.g. after moving up a grade) count from tier 1.
      for (const sk of skillsForStrand(profile, a.region)) if (!(sk.id in s.baseline) && (profile.skills[sk.id]?.tier || 1) > 1) count++;
    }
    if (o.type === 'guardian') count = s.guardian ? 1 : 0;
    if (o.type === 'trainer' || o.type === 'keeper') count = profile.beaten[o.target] ? 1 : 0;
    return { ...o, count: Math.min(count, o.need), done: count >= o.need };
  });
}

/** Quests done that count toward waking the Guardian or the Challenge (not those two themselves, not side quests). */
export const wakeProgress = (profile, areaId) => objectiveProgress(profile, areaId).filter((o) => o.done && !o.guardian && !o.keeper && !o.side).length;
export function guardianAwake(profile, areaId) {
  // The "beat or befriend N wild pets" quest is always one of them, so the team has trained before the big battle.
  const wins = objectiveProgress(profile, areaId).find((o) => o.id === 'wins');
  return (!wins || wins.done) && wakeProgress(profile, areaId) >= guardianWakeCount(areaId);
}
// Breadth before depth: areas 3–4 of any strand open only after area 2 is finished in every strand, so kids get a
// first pass through all four kinds of math before going deep in one (and team levels stay close across strands).
export const REGIONS = ['number', 'patterns', 'shape', 'stats'];
/** Area 2 of a strand is finished: its quests are done (or its Challenge is already beaten). */
export const area2Done = (profile, region) => !!profile.beaten?.[`gk-${region}-3`] || guardianAwake(profile, `${region}-2`);
export const deepAreasOpen = (profile) => REGIONS.every((r) => area2Done(profile, r));
/** A Challenge guarding the way deeper only fights once most of this area's quests are done
 *  (and, for the way into area 3, once area 2 is finished in every strand). */
export function keeperAwake(profile, areaId) {
  if (!guardianAwake(profile, areaId)) return false;
  return areaById(areaId)?.level !== 2 || deepAreasOpen(profile);
}

/** Bump an objective counter. Returns true if it just completed. */
export function bump(profile, areaId, type, extra = {}) {
  if (!areaId) return false;
  const before = objectiveProgress(profile, areaId);
  const s = areaState(profile, areaId);
  for (const o of objectivesFor(areaId)) {
    if (o.type !== type) continue;
    if (type === 'befriend' && extra.strand && extra.strand !== areaById(areaId).region) continue;
    s.obj[o.id] = (s.obj[o.id] || 0) + 1;
  }
  const after = objectiveProgress(profile, areaId);
  persist();
  return after.some((o, i) => o.done && !before[i].done);
}

export function gateOpen(profile, gate) {
  // A gate opens once the guardian of the area it leaves from has been beaten.
  const fromArea = Object.entries(FEATURES).find(([, f]) => f.gate === gate)?.[0];
  return !!(fromArea && profile.areas[fromArea]?.guardian);
}

// ---------- session timer ----------
let sessionStart = Date.now();
let reminded = false;
export function startSession() { sessionStart = Date.now(); reminded = false; }
export function sessionMinutes() { return (Date.now() - sessionStart) / 60000; }
/** Called between battles; returns 'none' | 'gentle' | 'rest'. */
export function sessionCheck(profile) {
  const lim = profile.settings.sessionMinutes;
  if (!lim || reminded) return 'none';
  if (sessionMinutes() >= lim) {
    reminded = true;
    if (profile.settings.sessionMode === 'rest') {
      profile.restUntil = Date.now() + profile.settings.restMinutes * 60000;
      persist();
      return 'rest';
    }
    return 'gentle';
  }
  return 'none';
}

export function autoRead(profile) {
  return profile.settings.autoRead == null ? profile.grade <= 2 : profile.settings.autoRead;
}

export const skillName = (id) => getSkill(id)?.name || id;
export const speciesOf = (pet) => SPECIES[pet.species];

// ---------- merging ----------
/** Other pets of the same kind that could be merged into `pet`, best candidates to give up first. */
export function mergeCandidates(profile, pet) {
  return profile.pets.filter((p) => p.id !== pet.id && p.species === pet.species)
    .sort((a, b) => (profile.team.includes(a.id) - profile.team.includes(b.id)) || ((a.rank || 1) - (b.rank || 1)) || (a.level - b.level));
}

export function canMerge(profile, pet) {
  const rank = pet.rank || 1;
  return rank < MAX_RANK && mergeCandidates(profile, pet).length >= mergeCost(rank);
}

/** Merge the cheapest candidates into `pet`. Returns the pets that were merged away. */
export function mergePets(profile, pet) {
  const rank = pet.rank || 1;
  const used = mergeCandidates(profile, pet).slice(0, mergeCost(rank));
  if (used.length < mergeCost(rank) || rank >= MAX_RANK) return [];
  const all = [pet, ...used];
  profile.coins = Math.max(0, (profile.coins || 0) - mergeFee(rank));
  pet.rank = rank + 1;
  const best = all.reduce((m, p) => (p.level > m.level || (p.level === m.level && p.xp > m.xp) ? p : m), pet);
  pet.level = best.level; pet.xp = best.xp;
  pet.stage = Math.max(...all.map((p) => p.stage));
  pet.rare = all.some((p) => p.rare);
  if (!pet.charm) pet.charm = used.find((p) => p.charm)?.charm || null;
  const ids = new Set(used.map((p) => p.id));
  profile.pets = profile.pets.filter((p) => !ids.has(p.id));
  const wasInTeam = used.some((p) => profile.team.includes(p.id));
  profile.team = profile.team.filter((id) => !ids.has(id));
  if (wasInTeam && !profile.team.includes(pet.id) && profile.team.length < TEAM_MAX) profile.team.push(pet.id);
  pet.hp = fullStats(profile, pet).maxHp;
  persist();
  return used;
}

// ---------- which pets can appear (math-tier gated) ----------
/** How far the kid has climbed in a strand: the average tier of their best half of that strand's skills. */
export function strandLevel(profile, strand) {
  const tiers = skillsForStrand(profile, strand).map((sk) => profile.skills[sk.id]?.tier || 1).sort((a, b) => b - a);
  if (!tiers.length) return 1;
  const top = tiers.slice(0, Math.ceil(tiers.length / 2));
  return top.reduce((x, y) => x + y, 0) / top.length;
}
/** Can this species appear for this kid in this region? (challenge = a little earlier) */
export function speciesUnlocked(profile, species, region, { challenge = false } = {}) {
  const need = CLASSES[SPECIES[species].cls].unlock - (challenge ? CHALLENGE_EARLY : 0);
  return strandLevel(profile, region) + 1e-9 >= need;
}
/** Species that can roam an area right now: natives and wanderers the kid has unlocked. Each subzone deeper allows
 *  one rarer class (subzone 1: up to Uncommon … subzone 3+: up to Epic). */
export function wildPool(profile, area) {
  const ok = (sp) => speciesUnlocked(profile, sp, area.region) && SPECIES[sp].cls <= Math.min(4, area.level + 1);
  const native = REGION_SPECIES[area.region].filter(ok);
  const others = [...new Set(Object.entries(REGION_SPECIES).filter(([r]) => r !== area.region).flatMap(([, s]) => s))].filter((sp) => ok(sp) && !native.includes(sp));
  return { native, others };
}
// Variety [TUNABLE]: an area aims for at least this many different kinds, and each copy already there makes a kind
// much less likely to be picked again (weight ÷ (1 + VARIETY_PENALTY × copies)). A kind never has more than
// MAX_SAME copies in one area while another kind could go there instead.
export const MIN_KINDS = 4;
const VARIETY_PENALTY = 3;
const MAX_SAME = 2;
/**
 * Picks a wild species for an area, keeping a mix: commoner classes are likelier, kinds already present
 * (present = species list) are much less likely, and when the area's own pets are few kinds, wanderers fill in.
 */
export function pickWildSpecies(profile, area, present = [], rand = Math.random) {
  const { native, others } = wildPool(profile, area);
  if (!native.length && !others.length) return null;
  const count = (sp) => present.filter((x) => x === sp).length;
  // Fewer than MIN_KINDS natives unlocked: wanderers come more often so there are enough different kinds.
  const share = native.length >= MIN_KINDS ? WANDERER_SHARE : Math.max(WANDERER_SHARE, Math.min(0.6, (MIN_KINDS - native.length) / MIN_KINDS));
  const useOthers = others.length && (!native.length || rand() < share);
  let pool = useOthers ? others : native;
  const under = pool.filter((sp) => count(sp) < MAX_SAME);
  if (under.length) pool = under;
  else { const any = [...native, ...others].filter((sp) => count(sp) < MAX_SAME); if (any.length) pool = any; }
  // Deeper subzones favour rarer classes: the most likely class moves from Common (subzone 1) toward Epic (subzone 4).
  const target = 1 + (Math.max(1, area.level) - 1) * 0.8;
  const classWeight = (cls) => Math.max(0.5, 4 - Math.abs(cls - target) * 1.5);
  const weight = (sp) => classWeight(SPECIES[sp].cls) / (1 + VARIETY_PENALTY * count(sp));
  const total = pool.reduce((s, sp) => s + weight(sp), 0);
  let r = rand() * total;
  for (const sp of pool) { r -= weight(sp); if (r <= 0) return sp; }
  return pool[pool.length - 1];
}
/** The math tier needed for a species to appear (for the Pet Book). */
export const unlockTierFor = (species) => CLASSES[SPECIES[species].cls].unlock;

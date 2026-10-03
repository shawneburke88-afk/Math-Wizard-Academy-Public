// Adaptive skill ladders (design doc section 4).
// Each skill has its own tier 1–5. Challenge content uses tiers 6–7 (1–2 above the current tier).

import { weightedPick } from './rng.js';

export const MAX_TIER = 5;

// [TUNABLE] rules
const RULES = {
  upWindow: 8, upNeed: 7,          // 7 of the last 8 at this tier correct (no hint) -> up a tier
  downWindow: 6, downNeed: 4,      // 4 of the last 6 wrong -> down a tier
  fastTrack: 5,                    // first 5 answers in a brand-new skill all correct -> Tier 1 to Tier 2 early
  oneUpPerDay: true,               // spaced practice: above Tier 2, a skill can move up at most once per day
  masteryWindow: 12, masteryNeed: 10, masteryDays: 2,
};

// Zone caps: how high a skill may climb depends on how far the kid has explored that skill's strand region.
// Set by curriculum.js (it knows each skill's strand). Default: no cap.
let tierCapFn = () => MAX_TIER;
export function setTierCapFn(fn) { tierCapFn = fn; }
export const tierCap = (profile, skillId) => Math.max(1, Math.min(MAX_TIER, tierCapFn(profile, skillId)));
/** Apply zone caps to every skill (e.g. when a profile loads). */
export function enforceCaps(profile) { for (const [id, st] of Object.entries(profile.skills || {})) applyCap(profile, id, st); }

/** Bring a stored tier down to the current zone cap (e.g. progress made before caps existed). */
function applyCap(profile, skillId, s) {
  const cap = tierCap(profile, skillId);
  if (s.tier > cap) { s.tier = cap; s.hist = []; s.mastered = false; }
  return cap;
}

const today = () => new Date().toISOString().slice(0, 10);

export function skillState(profile, skillId) {
  let s = profile.skills[skillId];
  if (!s) {
    s = profile.skills[skillId] = { tier: 1, hist: [], total: 0, correct: 0, hints: 0, mastered: false, topDays: [], drops: 0, last: 0 };
  }
  return s;
}

/**
 * Record an answer.
 * ctx.mode: 'normal' | 'challenge' | 'trial'
 * ctx.hinted: the kid opened the hint before answering
 * ctx.tier: the tier the question was generated at
 * Returns { tierChange: -1 | 0 | 1, mastered: boolean(newly) }
 */
import { track } from './telemetry.js';

export function recordAnswer(profile, skillId, correct, ctx = {}) {
  const res = recordAnswerInner(profile, skillId, correct, ctx);
  if (res.tierChange || res.mastered) track('tier', { skill: skillId, change: res.tierChange, to: skillState(profile, skillId).tier, mastered: !!res.mastered });
  return res;
}

function recordAnswerInner(profile, skillId, correct, ctx = {}) {
  const s = skillState(profile, skillId);
  const mode = ctx.mode || 'normal';
  const qTier = ctx.tier ?? s.tier;
  s.total++; s.last = Date.now();
  if (correct) s.correct++;
  if (ctx.hinted) s.hints++;
  profile.stats.answered++;
  if (correct) profile.stats.correct++;

  let tierChange = 0;
  let newlyMastered = false;

  // Challenge answers above the current tier: a correct, unhinted answer is strong evidence; wrong answers never count against.
  const cap = applyCap(profile, skillId, s);
  if (mode === 'challenge' || qTier > s.tier) {
    // Counts as a normal correct answer toward the next tier; wrong answers never count against.
    if (correct && !ctx.hinted) { s.hist.push(1); s.atTier = (s.atTier || 0) + 1; }
    trim(s);
    if (canRise(s, cap) && recent(s.hist, RULES.upWindow).filter((x) => x === 1).length >= RULES.upNeed) tierChange = up(s);
    return { tierChange, mastered: false };
  }

  // A question below the current tier (e.g. review) doesn't move the ladder.
  if (qTier < s.tier) return { tierChange: 0, mastered: false };

  s.hist.push(correct && !ctx.hinted ? 1 : correct ? 0.5 : 0);
  s.atTier = (s.atTier || 0) + 1;
  trim(s);

  // Fast-track at the very start of a skill (Tier 1 -> 2 only).
  if (s.tier === 1 && s.total <= RULES.fastTrack && s.hist.length === RULES.fastTrack && s.hist.every((x) => x === 1) && cap > 1) {
    tierChange = up(s);
  } else {
    const lastUp = recent(s.hist, RULES.upWindow);
    const lastDown = recent(s.hist, RULES.downWindow);
    if (lastUp.length >= RULES.upWindow && lastUp.filter((x) => x === 1).length >= RULES.upNeed && canRise(s, cap)) {
      tierChange = up(s);
    } else if (lastDown.length >= RULES.downNeed && lastDown.filter((x) => x === 0).length >= RULES.downNeed && s.tier > 1) {
      s.tier--; s.hist = []; s.atTier = 0; s.drops++;
      tierChange = -1;
    }
  }

  // Mastery at the top tier: 8 of last 10 correct across 2+ days.
  if (s.tier === MAX_TIER && cap >= MAX_TIER && !s.mastered) {
    if (correct && !ctx.hinted && !s.topDays.includes(today())) s.topDays.push(today());
    const last = recent(s.hist, RULES.masteryWindow);
    if (last.length >= RULES.masteryWindow && last.filter((x) => x === 1).length >= RULES.masteryNeed && s.topDays.length >= RULES.masteryDays) {
      s.mastered = true; newlyMastered = true;
    }
  }
  return { tierChange, mastered: newlyMastered };
}

function up(s) { s.tier++; s.hist = []; s.atTier = 0; s.lastUp = today(); return 1; }
function canRise(s, cap) {
  if (s.tier >= cap || s.tier >= MAX_TIER) return false;
  if (RULES.oneUpPerDay && s.tier >= 2 && s.lastUp === today()) return false;
  return true;
}
const recent = (arr, n) => arr.slice(-n);
function trim(s) { if (s.hist.length > 20) s.hist = s.hist.slice(-20); }

/** Is the kid struggling on this skill right now? About 3 of the last 5 missed (a right answer that needed the hint or a second try counts as half a miss). */
export function struggling(profile, skillId) {
  const s = skillState(profile, skillId);
  const last = recent(s.hist, 5);
  return last.length >= 3 && last.reduce((sum, x) => sum + (1 - x), 0) >= 2.5;
}

/**
 * Which tier to generate for a normal question.
 * areaMinTier: deeper areas set a floor, unless the kid is struggling (then the ladder wins).
 */
export function normalTier(profile, skillId, areaMinTier = 1) {
  const s = skillState(profile, skillId);
  applyCap(profile, skillId, s);
  if (areaMinTier > s.tier && !struggling(profile, skillId)) return Math.min(areaMinTier, MAX_TIER);
  return s.tier;
}

/** Challenge tier: 1–2 above current, up to 7. */
export function challengeTier(profile, skillId, rand) {
  const s = skillState(profile, skillId);
  applyCap(profile, skillId, s);
  return Math.min(7, s.tier + (rand() < 0.5 ? 1 : 2));
}

/**
 * Choose a skill from a candidate list, favouring weaker skills, focus skills and not-recently-used ones,
 * while keeping mastered skills in light review.
 */
export function chooseSkill(profile, candidates, rand) {
  if (!candidates.length) return null;
  const focus = new Set(profile.settings.focusSkills || []);
  const now = Date.now();
  const entries = candidates.map((sk) => {
    const s = profile.skills[sk.id];
    let w = 1;
    if (!s) w = 1.3;                                 // new skill: introduce it
    else {
      w += (MAX_TIER - s.tier) * 0.15;              // lower tiers come up a bit more
      if (s.mastered) w *= 0.35;                     // light review
      if (struggling(profile, sk.id)) w *= 1.4;
      if (now - s.last < 20_000) w *= 0.5;           // don't hammer the same skill
      if (sk.id === lastSkillId && candidates.length > 1) w *= 0.25;
    }
    if (focus.has(sk.id)) w *= 3;
    if (sk.weight != null) w *= sk.weight;           // classic-skill share, set by curriculum mode
    return [sk, w];
  });
  return weightedPick(rand, entries);
}

// ---- Recent-question memory so a kid doesn't see the same question again soon. ----
// Keyed on the prompt text and picture only (answer order doesn't make a question "new").
const recentQs = new Map(); // skillId -> keys
const recentAll = [];       // last few keys across all skills
let lastSkillId = null;
export function questionKey(q) {
  return String(q.prompt || '').replace(/\s+/g, ' ').trim().toLowerCase() + '|' + JSON.stringify(q.visual || '');
}
export function isRecent(skillId, q) {
  const k = questionKey(q);
  return (recentQs.get(skillId) || []).includes(k) || recentAll.includes(k);
}
export function remember(skillId, q) {
  const k = questionKey(q);
  const arr = recentQs.get(skillId) || [];
  arr.push(k);
  if (arr.length > 40) arr.shift();
  recentQs.set(skillId, arr);
  recentAll.push(k);
  if (recentAll.length > 12) recentAll.shift();
  lastSkillId = skillId;
}
export const lastSkill = () => lastSkillId;

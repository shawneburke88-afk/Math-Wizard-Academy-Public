// Curriculum registry: all skills for Grades 1–6, and question generation with the adaptive rules applied.

import { mulberry32, newSeed } from '../core/rng.js';
import { renderVisual } from '../art/visuals.js';
import { fmtNum } from './qutil.js';
import { chooseSkill, normalTier, challengeTier, isRecent, remember, skillState, setTierCapFn, MAX_TIER } from '../core/adaptive.js';

// Grade modules load independently, so a problem in one grade file can't stop the game from starting.
export const ALL_SKILLS = [];
const byId = new Map();
export async function loadCurriculum() {
  const results = await Promise.allSettled([1, 2, 3, 4, 5, 6].map((g) => import(`./grades/grade${g}.js`)));
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') for (const s of r.value.skills || []) { if (!byId.has(s.id)) { ALL_SKILLS.push(s); byId.set(s.id, s); } }
    else console.warn(`Grade ${i + 1} questions failed to load`, r.reason);
  });
  return ALL_SKILLS.length;
}
export const getSkill = (id) => byId.get(id);

// Zone caps [TUNABLE]: a strand's skills can reach Tier 3 in its first two subzones, Tier 4 once the kid has
// reached subzone 3, and Tier 5 (and mastery) once they've reached subzone 4 (past the Guardian).
export const LEVEL1_CAP = 3;
export function strandCap(profile, strand) {
  const been = (d) => !!profile.areas?.[`${strand}-${d}`]?.visited;
  return Math.min(MAX_TIER, LEVEL1_CAP + (been(3) ? 1 : 0) + (been(4) ? 1 : 0));
}
setTierCapFn((profile, skillId) => { const sk = byId.get(skillId); return sk ? strandCap(profile, sk.strand) : MAX_TIER; });

export const STRANDS = {
  number: { name: 'Number Sense', element: 'star' },
  patterns: { name: 'Patterns and Relations', element: 'vine' },
  shape: { name: 'Shape and Space', element: 'stone' },
  stats: { name: 'Statistics and Probability', element: 'storm' },
};
export const BIG_IDEAS = {
  qpv: { name: 'Quantity and Place Value', strand: 'number' },
  ops: { name: 'Operations', strand: 'number' },
  patterns: { name: 'Patterns and Algebra', strand: 'patterns' },
  measurement: { name: 'Measurement', strand: 'shape' },
  geometry: { name: 'Geometry', strand: 'shape' },
  data: { name: 'Data and Currency', strand: 'stats' },
};

// Curriculum mode sets how often "classic" (older-guide) skills come up.
const CLASSIC_WEIGHT = { mix: 0.25, new: 0, classic: 1 };

/** Skills available to this kid (their grade + curriculum mode), each tagged with a selection weight. */
export function skillsFor(profile) {
  const mode = profile.settings.curriculum || 'mix';
  return ALL_SKILLS.filter((s) => s.grade === profile.grade && (!s.classic || CLASSIC_WEIGHT[mode] > 0))
    .map((s) => ({ ...s, weight: s.classic ? CLASSIC_WEIGHT[mode] : 1, gen: s.gen }));
}

/** Skills a species draws from at this kid's grade, with fallbacks to the same family then strand. */
export function skillsForSpecies(profile, speciesId, speciesMeta) {
  const list = skillsFor(profile);
  const own = list.filter((s) => s.species === speciesId);
  if (own.length) return own;
  const fam = list.filter((s) => s.bigIdea === speciesMeta.family);
  if (fam.length) return fam;
  const strand = list.filter((s) => s.strand === speciesMeta.strand);
  return strand.length ? strand : list;
}

export const skillsForStrand = (profile, strand) => skillsFor(profile).filter((s) => s.strand === strand);

/**
 * Make a question.
 * opts: { candidates: skill[], mode: 'normal' | 'challenge' | 'trial', areaMinTier, tierOverride, skillId }
 * Returns { skill, tier, q, mode }
 */
export function makeQuestion(profile, opts = {}) {
  const rand = mulberry32(newSeed());
  const mode = opts.mode || 'normal';
  const skill = opts.skillId ? getSkill(opts.skillId) : chooseSkill(profile, opts.candidates || skillsFor(profile), rand);
  if (!skill) throw new Error('No skills available for this grade yet.');
  let tier;
  if (opts.tierOverride) tier = opts.tierOverride;
  else if (mode === 'challenge') tier = challengeTier(profile, skill.id, rand);
  else if (mode === 'trial') tier = Math.min(5, skillState(profile, skill.id).tier + 1);
  else tier = normalTier(profile, skill.id, opts.areaMinTier || 1);

  let q = null;
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      // The third argument tells generators whether next-grade previews are allowed (challenge questions only).
      q = skill.gen(genTier(tier, rand), mulberry32(newSeed()), { challenge: mode === 'challenge' });
    } catch (e) {
      console.error('Question generator failed', skill.id, tier, e);
      q = null;
    }
    if (q && !isRecent(skill.id, q)) break;
  }
  if (!q) q = fallbackQuestion();
  q = hideGiveaways(q);
  remember(skill.id, q);
  return { skill, tier, q, mode };
}

// Difficulty stretch [TUNABLE]: the game's 5 tiers spread across the generators' 7 levels, so Tiers 4–5 are
// harder than the old top tier. Challenge questions (6–7) use the hardest generator level.
function genTier(t, rand) {
  const r = rand();
  switch (t) {
    case 1: return 1;
    case 2: return r < 0.3 ? 3 : 2;
    case 3: return r < 0.4 ? 4 : 3;
    case 4: return r < 0.45 ? 6 : 5;
    case 5: return r < 0.55 ? 7 : 6;
    default: return 7;
  }
}

function fallbackQuestion() {
  const a = 1 + Math.floor(Math.random() * 9), b = 1 + Math.floor(Math.random() * 9);
  const choices = [a + b, a + b + 1, a + b - 1, a + b + 2].map(String);
  return { kind: 'mc', prompt: `What is ${a} + ${b}?`, choices, answer: 0, hint: 'Count on from the bigger number.', explain: `${a} + ${b} = ${a + b}.` };
}

/** Check a kid's answer. For keypad answers, accept equivalent numeric strings ("3.50" vs "3.5"). */
export function isCorrect(q, response) {
  if ((q.kind || 'mc') === 'num') {
    const norm = (x) => String(x).trim().replace(/\s/g, '').replace(',', '.');
    const r = norm(response);
    if (r === '' || r === '-' || r === '.') return false;
    return Number(r) === Number(norm(q.answer));
  }
  return response === q.answer;
}

// ---- Pictures must not give the answer away ----
// If a picture shows the correct answer as a label (e.g. a number line that already shows the next number in a
// counting pattern), the picture moves behind the Hint button instead. Pictures that ARE the task
// (reading a graph, an arrow on a number line, picking a benchmark, finding the wrong number in a table) stay.
const normAns = (x) => String(x).replace(/\[\[f:(\d+) (\d+)\/(\d+)\]\]/g, (m, w, n, d) => `${w * d + +n}/${d}|${w} ${n}/${d}`)
  .replace(/\[\[f:(\d+)\/(\d+)\]\]/g, '$1/$2').replace(/[\s\u00a0]+/g, ' ').trim().toLowerCase();
function visualShowsAnswer(visual, answer) {
  const a = normAns(answer);
  if (!/\d/.test(a)) return false;
  let svg;
  try { svg = renderVisual(visual, { maxWidth: 640, maxHeight: 300 }); } catch (e) { return false; }
  const txt = [...svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => normAns(m[1].replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, ' ')));
  const joined = txt.map((t, j) => t + '/' + (txt[j + 1] || ''));
  return a.split('|').some((alt) => txt.includes(alt) || joined.includes(alt));
}
/** The counting sequence a number line or hundred chart shows, as pattern boxes with a "?" gap (null if there isn't one). */
function sequenceBoxes(v, back) {
  let nums, gap;
  if (v.type === 'numberline' && v.blankAt != null && Array.isArray(v.labels) && v.labels.length >= 2) {
    gap = v.blankAt; nums = [...v.labels, gap];
  } else if (v.type === 'hundredchart' && Array.isArray(v.highlight) && v.highlight.length >= 2 && v.blank?.length === 1) {
    gap = v.blank[0];
    const before = v.highlight.filter((x) => x < gap).slice(-4), after = v.highlight.filter((x) => x > gap).slice(0, 4 - Math.min(4, before.length) + 1);
    nums = [...before, gap, ...after];
  } else return null;
  nums = [...new Set(nums)].sort((a, b) => a - b);
  if (back) nums.reverse();
  return { type: 'pattern', items: nums.map((x) => (x === gap ? '?' : fmtNum(x))) };
}

export function hideGiveaways(q) {
  const v = q.visual;
  if (!v) return q;
  const lineLike = v.type === 'numberline' || v.type === 'hundredchart';
  // Sequence and counting questions: the number line/chart IS the answer key, so it always becomes the clue.
  const P0 = q.prompt.toLowerCase();
  if (lineLike && /comes next|count(ing)? (by|on|back)|skip.?count|what number (is|comes) (after|before)|\d+ (more|less) than|(more|less|fewer) than \d|missing number|pattern/.test(P0)) {
    const { visual, ...rest } = q;
    // If the numbers only appeared in the picture, show them as plain number boxes so the question still makes sense.
    const boxes = (q.prompt.match(/\d+/g) || []).length < 3 ? sequenceBoxes(v, /\bback\b/.test(P0)) : null;
    if (!boxes) return { ...rest, hintVisual: q.hintVisual || visual };
    const prompt = q.prompt.replace(/\s*on the hundred chart/i, '').replace(/The shaded numbers make a pattern\. Which number is shaded next\?/i, 'These numbers make a pattern. Which number comes next?');
    return { ...rest, prompt, visual: boxes, hintVisual: q.hintVisual || visual };
  }
  const answer = (q.kind || 'mc') === 'num' ? q.answer : (typeof q.choices?.[q.answer] === 'string' ? q.choices[q.answer] : null);
  if (answer == null) return q;
  // If the answer is already written in the question itself, the picture can't be the giveaway.
  const promptTokens = normAns(q.prompt).split(/[\s,?!.:;()]+/);
  if (normAns(answer).split('|').some((alt) => promptTokens.includes(alt))) return q;
  const P = q.prompt.toLowerCase();
  // Money: show coins by their designs instead of their printed values.
  if (v.type === 'coins' && !v.hideValues && /worth|how much|how many cents|total|altogether/.test(P) && visualShowsAnswer(v, answer)) {
    return { ...q, visual: { ...v, hideValues: true }, hintVisual: q.hintVisual || v };
  }
  const readingTask = /arrow|point|closest|nearest|benchmark|marked|shown on|wrong|does not fit|graph|chart|table/.test(P) || v.arrow != null || v.blankAt != null;
  const movable = lineLike ? !readingTask
    : v.type === 'calendar' ? /how many days/.test(P)
    : false;
  if (movable && visualShowsAnswer(v, answer)) {
    const { visual, ...rest } = q;
    return { ...rest, hintVisual: q.hintVisual || visual, hint: q.hint };
  }
  return q;
}

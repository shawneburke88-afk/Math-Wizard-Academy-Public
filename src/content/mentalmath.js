// Mental math sprints for the timed treasure chests.
// Fact ranges follow the NB curriculum (see research/nb-holistic-curriculum-map-gr1-6.md):
//   Gr 1: + and − fluency within 10; derived facts to 20 (doubles, near doubles, ±10, bridging 10)
//   Gr 2: + and − facts to 20; adding/subtracting tens
//   Gr 3: facts to 20; × and ÷ foundational facts (1, 2, 5, 10); beginning derived facts
//   Gr 4: × and ÷ facts to 10 × 10; 2-digit ± mental strategies; × 10 and × 100
//   Gr 5: facts to 10 × 10 plus × 11 and × 12; × and ÷ by 10, 100, 1000
//   Gr 6: all of the above plus simple decimal facts (0.3 × 4, 2.4 ÷ 6) and halving/doubling
// Difficulty rises within a sprint (every 2 right answers) and starts higher in areas 3–4.
import { mulberry32, newSeed } from '../core/rng.js';

const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)));

// Share of multiple-choice questions by grade (younger kids tap, older kids type) [TUNABLE].
const MC_SHARE = { 1: 0.8, 2: 0.7, 3: 0.5, 4: 0.35, 5: 0.2, 6: 0.15 };

// ---- fact makers: each returns { a, op, b, ans } ----
// 0 and 1 facts are allowed but rare, so sprints aren't padded with trivial questions.
const small = (r, lo, hi) => (r() < 0.1 ? ri(r, 0, 1) : ri(r, Math.max(2, lo), hi));
const add = (r, max, minA = 1) => { const a = ri(r, Math.max(1, minA), max - 1), b = small(r, 1, Math.max(2, max - a)); return { a, op: '+', b: Math.min(b, max - a), ans: a + Math.min(b, max - a) }; };
const sub = (r, max) => { const a = ri(r, 3, max), b = Math.min(a, small(r, 1, a - 1)); return { a, op: '−', b, ans: a - b }; };
const bridge10 = (r) => { const a = ri(r, 6, 9), b = ri(r, 11 - a, 9); return r() < 0.5 ? { a, op: '+', b, ans: a + b } : { a: a + b, op: '−', b, ans: a }; };
const doubles = (r, max) => { const a = ri(r, 1, max), near = r() < 0.5 ? 1 : 0; return { a, op: '+', b: a + near, ans: a + a + near }; };
const plusTen = (r) => { const a = ri(r, 1, 9); return r() < 0.5 ? { a, op: '+', b: 10, ans: a + 10 } : { a: a + 10, op: '−', b: 10, ans: a }; };
const tens = (r) => { const a = ri(r, 1, 8) * 10, b = ri(r, 1, 9 - a / 10) * 10; return r() < 0.5 ? { a, op: '+', b, ans: a + b } : { a: a + b, op: '−', b, ans: a }; };
const twoDigitPlusTens = (r) => { const a = ri(r, 12, 69), b = ri(r, 1, 3) * 10; return r() < 0.5 ? { a, op: '+', b, ans: a + b } : { a: a + b, op: '−', b, ans: a }; };
const twoDigit = (r) => { const a = ri(r, 15, 79), b = ri(r, 11, 99 - a); return r() < 0.55 ? { a, op: '+', b, ans: a + b } : { a: a + b, op: '−', b, ans: a }; };
const mul = (r, facs, maxB = 10) => { const a = pick(r, facs), b = small(r, 2, maxB); return r() < 0.5 ? { a, op: '×', b, ans: a * b } : { a: b, op: '×', b: a, ans: a * b }; };
const div = (r, facs, maxQ = 10) => { const d = pick(r, facs.filter((x) => x > 1)), q = r() < 0.1 ? 1 : ri(r, 2, maxQ); return { a: d * q, op: '÷', b: d, ans: q }; };
const pow10 = (r, withDiv) => { const p = pick(r, [10, 100, 1000]); if (withDiv && r() < 0.5) { const q = ri(r, 2, 90); return { a: q * p, op: '÷', b: p, ans: q }; } const a = ri(r, 2, 99); return { a, op: '×', b: p, ans: a * p }; };
const times10 = (r) => { const a = ri(r, 2, 99), p = pick(r, [10, 100]); return { a, op: '×', b: p, ans: a * p }; };
const decimal = (r) => { if (r() < 0.5) { const a = ri(r, 1, 9) / 10, b = ri(r, 2, 9); return { a, op: '×', b, ans: +(a * b).toFixed(2) }; } const b = ri(r, 2, 9), q = ri(r, 1, 9) / 10; return { a: +(b * q).toFixed(2), op: '÷', b, ans: q }; };
const halve = (r) => { const a = ri(r, 6, 49) * 2; return { a, op: '÷', b: 2, ans: a / 2 }; };

const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const FOUND = [1, 2, 5, 10];
const DERIVED = [3, 4, 6, 8, 9];

/** Fact recipe by grade and level (1 = warm-up, 2 = core, 3 = stretch). */
function makeFact(r, grade, level) {
  switch (grade) {
    case 1: return level === 1 ? (r() < 0.5 ? add(r, 5) : sub(r, 5)) : level === 2 ? (r() < 0.5 ? add(r, 10) : sub(r, 10)) : pick(r, [doubles, plusTen, bridge10])(r, 9);
    case 2: return level === 1 ? (r() < 0.5 ? add(r, 10) : sub(r, 10)) : level === 2 ? pick(r, [bridge10, doubles, plusTen])(r, 9) : pick(r, [tens, twoDigitPlusTens, bridge10])(r);
    case 3: {
      if (level === 1) return pick(r, [() => bridge10(r), () => mul(r, FOUND), () => add(r, 20, 5)])();
      if (level === 2) return pick(r, [() => mul(r, FOUND), () => div(r, FOUND), () => twoDigitPlusTens(r), () => bridge10(r)])();
      return pick(r, [() => mul(r, [...FOUND, 3, 4]), () => div(r, [...FOUND, 3, 4]), () => twoDigitPlusTens(r)])();
    }
    case 4: {
      if (level === 1) return pick(r, [() => mul(r, FOUND), () => div(r, FOUND), () => bridge10(r)])();
      if (level === 2) return pick(r, [() => mul(r, [...FOUND, ...DERIVED]), () => div(r, [...FOUND, ...DERIVED]), () => twoDigitPlusTens(r)])();
      return pick(r, [() => mul(r, [6, 7, 8, 9]), () => div(r, [6, 7, 8, 9]), () => twoDigit(r), () => times10(r)])();
    }
    case 5: {
      if (level === 1) return pick(r, [() => mul(r, [...FOUND, ...DERIVED]), () => div(r, [...FOUND, ...DERIVED])])();
      if (level === 2) return pick(r, [() => mul(r, [6, 7, 8, 9]), () => div(r, [6, 7, 8, 9]), () => pow10(r, true)])();
      return pick(r, [() => mul(r, [11, 12], 12), () => div(r, [11, 12], 12), () => mul(r, [7, 8, 9]), () => twoDigit(r)])();
    }
    default: {
      if (level === 1) return pick(r, [() => mul(r, [6, 7, 8, 9]), () => div(r, [6, 7, 8, 9]), () => pow10(r, true)])();
      if (level === 2) return pick(r, [() => mul(r, [7, 8, 9, 11, 12], 12), () => div(r, [7, 8, 9, 12], 12), () => halve(r)])();
      return pick(r, [() => decimal(r), () => mul(r, [11, 12], 12), () => twoDigit(r), () => pow10(r, true)])();
    }
  }
}

function distractors(r, f) {
  const a = f.ans, set = new Set();
  const cands = f.op === '×' || f.op === '÷'
    ? [f.op === '×' ? a + f.a : a + 1, f.op === '×' ? a - f.a : a - 1, a + 1, a - 1, f.op === '×' ? f.a + f.b : f.a - f.b, a + 10, a * 10]
    : [a + 1, a - 1, a + 2, a - 2, a + 10, a - 10, f.op === '+' ? Math.abs(f.a - f.b) : f.a + f.b];
  for (const c of cands.sort(() => r() - 0.5)) { const v = +(+c).toFixed(2); if (v >= 0 && v !== a && !set.has(v)) set.add(v); if (set.size === 3) break; }
  let k = 3; while (set.size < 3) { if (!set.has(a + k)) set.add(a + k); k++; }
  const choices = [a, ...set].sort(() => r() - 0.5);
  return { choices: choices.map(fmt), answer: choices.indexOf(a) };
}

/**
 * A new sprint question. zone: region of the chest ('number' | 'patterns' | 'shape' | 'stats' | 'hub').
 * Patterns zones sometimes ask for the missing number (7 + □ = 12) instead of the answer.
 */
export function sprintQuestion(grade, level, zone, rand = mulberry32(newSeed())) {
  const g = Math.max(1, Math.min(6, grade | 0));
  const f = makeFact(rand, g, Math.max(1, Math.min(3, level)));
  const mc = rand() < MC_SHARE[g];
  const missing = zone === 'patterns' && rand() < 0.35 && f.op !== '÷';
  let prompt, ans;
  if (missing) { prompt = `${fmt(f.a)} ${f.op} □ = ${fmt(f.ans)}`; ans = f.b; }
  else { prompt = `${fmt(f.a)} ${f.op} ${fmt(f.b)} = ?`; ans = f.ans; }
  const say = prompt.replace('□', 'what').replace('= ?', '').replace('×', 'times').replace('÷', 'divided by').replace('−', 'minus').replace('+', 'plus').replace('=', 'equals');
  if (mc) { const d = distractors(rand, { ...f, ans }); return { prompt, speak: say, kind: 'mc', choices: d.choices, answer: d.answer, value: ans }; }
  return { prompt, speak: say, kind: 'num', answer: fmt(ans), value: ans, needsDot: !Number.isInteger(ans) };
}

// ---- scoring ----
export const WRONG_PENALTY = 2;   // seconds lost for a wrong answer (discourages rapid guessing) [TUNABLE]
export const TIERS = [
  { id: 'bronze', name: 'Bronze', icon: '🥉' },
  { id: 'silver', name: 'Silver', icon: '🥈' },
  { id: 'gold', name: 'Gold', icon: '🥇' },
  { id: 'rainbow', name: 'Rainbow', icon: '🌈' },
];
// Correct answers needed in 20 seconds for Bronze / Silver / Gold / Rainbow, by grade [TUNABLE].
const BASE_THRESH = { 1: [3, 5, 7, 9], 2: [3, 5, 8, 10], 3: [3, 6, 8, 11], 4: [4, 6, 9, 12], 5: [4, 6, 9, 12], 6: [4, 7, 10, 13] };
/** Thresholds for a grade and time limit (a longer timer from the Grown-ups zone raises them a little, not fully). */
export function thresholds(grade, seconds = 20) {
  const k = 1 + 0.5 * (seconds / 20 - 1);
  return BASE_THRESH[Math.max(1, Math.min(6, grade | 0))].map((t) => Math.round(t * k));
}
export function tierFor(correct, th) { let t = -1; th.forEach((need, i) => { if (correct >= need) t = i; }); return t; }

/** Coins and item rolls for a result. areaLevel: 0 = town, 1, 2. */
export function sprintRewards(correct, tier, areaLevel) {
  const m = 1 + 0.5 * Math.max(0, areaLevel);   // deeper areas pay more
  const bonus = [5, 10, 18, 30][tier] || 0;
  const coins = Math.round((correct + bonus) * m);
  const items = tier >= 3 ? ['mental_rainbow', 'mental_gold'] : tier === 2 ? ['mental_gold'] : tier === 1 ? ['mental_silver'] : [];
  return { coins, items };
}

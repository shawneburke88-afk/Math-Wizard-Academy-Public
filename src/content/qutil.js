// Shared helpers for question generators. Pure functions, no DOM.
// Every random choice goes through the rng function passed to a generator,
// so questions are reproducible for a given seed.

export const randInt = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
export const chance = (rng, p) => rng() < p;

export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample(rng, arr, k) {
  return shuffle(rng, arr).slice(0, k);
}

export const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
export const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);

// NB format: 4-digit numbers have no separator (5321); 5+ digits use a space (10 000, 1 000 000).
export function fmtNum(n) {
  if (typeof n !== 'number' || !isFinite(n)) return String(n);
  const neg = n < 0;
  const [int, dec] = Math.abs(n).toString().split('.');
  let s = int;
  if (int.length >= 5) s = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '−' : '') + s + (dec ? '.' + dec : '');
}

// Round away floating point noise (0.1 + 0.2 = 0.30000000000000004).
export const clean = (x, places = 6) => Math.round(x * 10 ** places) / 10 ** places;

// Fixed decimal places as a string, e.g. fmtDec(2.5, 2) -> "2.50".
export const fmtDec = (x, places) => clean(x).toFixed(places);

// Money from cents: 525 -> "$5.25"; wholeDollars: 700 -> "$7".
export function fmtMoney(cents, { wholeDollars = false } = {}) {
  const d = cents / 100;
  if (wholeDollars && cents % 100 === 0) return '$' + fmtNum(d);
  return '$' + d.toFixed(2);
}

// Stacked fraction token understood by the renderer and the question UI.
export const frac = (n, d) => `[[f:${n}/${d}]]`;
export const mixed = (w, n, d) => `[[f:${w} ${n}/${d}]]`;

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

// Number words without "and" (NB convention): 675 -> "six hundred seventy-five".
export function numWords(n) {
  if (n < 0) return 'negative ' + numWords(-n);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numWords(n % 100) : '');
  if (n < 1e6) return numWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numWords(n % 1000) : '');
  return numWords(Math.floor(n / 1e6)) + ' million' + (n % 1e6 ? ' ' + numWords(n % 1e6) : '');
}

const FRAC_NAMES = { 2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['fourth', 'fourths'], 5: ['fifth', 'fifths'],
  6: ['sixth', 'sixths'], 8: ['eighth', 'eighths'], 10: ['tenth', 'tenths'], 12: ['twelfth', 'twelfths'], 100: ['hundredth', 'hundredths'] };

// Spoken fraction for read-aloud: (3,4) -> "three fourths", (1,2) -> "one half".
export function fracWords(n, d) {
  const names = FRAC_NAMES[d] || [ordinal(d), ordinal(d) + 's'];
  return `${numWords(n)} ${n === 1 ? names[0] : names[1]}`;
}

export function ordinal(n) {
  const words = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
  if (n <= 10) return words[n];
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const plural = (n, one, many = one + 's') => `${fmtNum(n)} ${n === 1 ? one : many}`;

// 12-hour time: (14, 5) -> "2:05 p.m."
export function time12(h, m) {
  const suffix = h < 12 ? 'a.m.' : 'p.m.';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${suffix}`;
}
// 24-hour time: (14, 5) -> "14:05"
export const time24 = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

/**
 * Build a multiple-choice set from a correct value and candidate wrong values.
 * - Removes duplicates of the correct answer and each other (compared by label).
 * - Keeps up to `count` choices total, shuffled.
 * Returns { choices, answer } ready to spread into a question.
 */
export function mc(rng, correct, distractors, { count = 4, format = (x) => String(x) } = {}) {
  const correctLabel = format(correct);
  const seen = new Set([correctLabel]);
  const wrong = [];
  for (const d of shuffle(rng, distractors)) {
    const label = format(d);
    if (label == null || label === '' || /NaN|undefined|Infinity/.test(label) || seen.has(label)) continue;
    seen.add(label);
    wrong.push(label);
    if (wrong.length >= count - 1) break;
  }
  const choices = shuffle(rng, [correctLabel, ...wrong]);
  return { choices, answer: choices.indexOf(correctLabel) };
}

/**
 * Multiple choice for a numeric answer with automatically generated "near miss" distractors
 * (off by one, off by ten, digit swaps, etc.). `min`/`max` bound the distractors.
 */
export function mcNum(rng, correct, { count = 4, min = 0, max = Infinity, extra = [], format = fmtNum, spread } = {}) {
  const s = spread ?? Math.max(1, Math.round(Math.abs(correct) * 0.1));
  const cands = [...extra, correct + 1, correct - 1, correct + 10, correct - 10, correct + s, correct - s,
    correct + 2, correct - 2, correct * 2, Math.round(correct / 2)];
  const str = String(Math.abs(correct));
  if (str.length === 2) cands.push(Number(str[1] + str[0]));
  const ok = cands.filter((x) => Number.isFinite(x) && x >= min && x <= max && x !== correct);
  return mc(rng, correct, ok, { count, format });
}

/** Choice objects that are pictures: items = [{visual, correct:boolean}] */
export function mcVisual(rng, items) {
  const shuffled = shuffle(rng, items);
  return {
    choices: shuffled.map((it) => ({ visual: it.visual, label: it.label })),
    answer: shuffled.findIndex((it) => it.correct),
  };
}

/** Number keypad question helper: answer must be the exact string the kid types. */
export const numAnswer = (x) => String(clean(x));

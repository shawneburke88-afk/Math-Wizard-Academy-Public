// Grade 4 question generators (NB Holistic Mathematics curriculum, Grade 4).
// Each skill's gen(tier, rng) picks one of several question formats allowed at that tier.
import {
  randInt, pick, chance, shuffle, sample, fmtNum, clean, fmtDec, frac, mixed, numWords, fracWords, time12, time24, numAnswer, ordinal,
} from '../qutil.js';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------
const NAMES = ['Ava', 'Liam', 'Noor', 'Kai', 'Priya', 'Mateo', 'Chloé', 'Owen', 'Aiyana', 'Sam', 'Zara', 'Eli',
  'Mei', 'Jonah', 'Amara', 'Lucas', 'Sofia', 'Ravi', 'Élodie', 'Theo', 'Hana', 'Felix', 'Isla', 'Omar'];
const nm = (rng) => pick(rng, NAMES);
const nm2 = (rng) => sample(rng, NAMES, 2);

// [singular, plural, emoji]
const THINGS = [
  ['gem', 'gems', '💎'], ['apple', 'apples', '🍎'], ['pencil', 'pencils', '✏️'], ['potion', 'potions', '🧪'],
  ['star', 'stars', '⭐'], ['acorn', 'acorns', '🌰'], ['shell', 'shells', '🐚'], ['cookie', 'cookies', '🍪'],
  ['feather', 'feathers', '🪶'], ['book', 'books', '📚'], ['cupcake', 'cupcakes', '🧁'], ['leaf', 'leaves', '🍃'],
  ['egg', 'eggs', '🥚'], ['strawberry', 'strawberries', '🍓'], ['carrot', 'carrots', '🥕'], ['sticker', 'stickers', '🌟'],
  ['crayon', 'crayons', '🖍️'], ['button', 'buttons', '🔘'], ['flower', 'flowers', '🌼'], ['balloon', 'balloons', '🎈'],
];
const CONTAINERS = [['bag', 'bags'], ['box', 'boxes'], ['basket', 'baskets'], ['jar', 'jars'], ['tray', 'trays'],
  ['chest', 'chests'], ['pack', 'packs'], ['bowl', 'bowls']];
const COLOURS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'teal'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
  'November', 'December'];
const daysIn = (m, y) => [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
const pad2 = (n) => String(n).padStart(2, '0');
const u = (n, w) => `${fmtNum(n)} ${w}${n === 1 ? '' : 's'}`; // 1 ten, 3 tens
const an = (w) => `${/^[aeiou]/i.test(w) ? 'an' : 'a'} ${w}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Read-aloud text for prompts that contain symbols or fraction tokens.
function toSpeech(s) {
  return s
    .replace(/\[\[f:(\d+) (\d+)\/(\d+)\]\]/g, (_, w, n, d) => `${numWords(+w)} and ${fracWords(+n, +d)}`)
    .replace(/\[\[f:(\d+)\/(\d+)\]\]/g, (_, n, d) => fracWords(+n, +d))
    .replace(/×/g, ' times ').replace(/÷/g, ' divided by ').replace(/−/g, ' minus ')
    .replace(/ \+ /g, ' plus ').replace(/ = /g, ' equals ').replace(/□/g, ' blank ')
    .replace(/★/g, ' star ').replace(/▲/g, ' triangle ').replace(/●/g, ' circle ').replace(/◆/g, ' diamond ')
    .replace(/ < /g, ' is less than ').replace(/ > /g, ' is greater than ')
    .replace(/(\d)¢/g, '$1 cents').replace(/\p{Extended_Pictographic}\uFE0F?/gu, 'picture').replace(/\s+/g, ' ').replace(/ ([?.,!:])/g, '$1').trim();
}
const NEEDS_SPEECH = /[×÷−+=□<>¢★▲●◆]|\[\[f:/;

function finish(q) {
  const out = { kind: 'mc', ...q };
  for (const k of ['prompt', 'hint', 'explain']) if (typeof out[k] === 'string') out[k] = out[k].replace(/([ap]\.m\.)\./g, '$1');
  if (!out.speak && NEEDS_SPEECH.test(out.prompt)) out.speak = toSpeech(out.prompt);
  return out;
}

// Build gen(tier, rng, opts?) from a list of [minTier, maxTier, fn, weight?, tag?].
// Entries tagged PREVIEW are next-grade previews: they are only drawn when opts.challenge is true
// (challenge-mode questions). Normal play, even at level 7, stays inside the grade. Each fn gets (rng, t, opts)
// so a generator can also gate a single preview branch on opts.challenge.
const PREVIEW = 'preview';
function tiered(list) {
  return (tier, rng, opts = {}) => {
    const t = Math.max(1, Math.min(7, Math.round(tier) || 1));
    const challenge = !!(opts && opts.challenge);
    const pool = list.filter(([lo, hi, , , tag]) => t >= lo && t <= hi && (tag !== PREVIEW || challenge));
    const total = pool.reduce((s, o) => s + (o[3] ?? 1), 0);
    let r = rng() * total;
    let f = pool[pool.length - 1];
    for (const o of pool) { r -= o[3] ?? 1; if (r < 0) { f = o; break; } }
    return finish(f[2](rng, t, { challenge }));
  };
}

// Multiple choice that keeps designed distractors first, then filler.
function mcP(rng, correct, designed, filler = [], fmt = String, count = 4) {
  const cl = fmt(correct);
  const seen = new Set([cl]);
  const wrong = [];
  for (const d of [...shuffle(rng, designed), ...shuffle(rng, filler)]) {
    if (d == null) continue;
    const l = fmt(d);
    if (l == null || l === '' || /NaN|undefined|Infinity/.test(l) || seen.has(l)) continue;
    seen.add(l); wrong.push(l);
    if (wrong.length >= count - 1) break;
  }
  const choices = shuffle(rng, [cl, ...wrong]);
  return { choices, answer: choices.indexOf(cl) };
}
// Numeric multiple choice: designed mistakes first, near misses as filler. Non-negative only.
function mcN(rng, correct, designed = [], { fmt = fmtNum, min = 0, max = Infinity, step } = {}) {
  const s = step ?? (correct >= 100 ? 10 : 1);
  const ok = (x) => Number.isFinite(x) && x >= min && x <= max && x !== correct;
  const filler = [correct + s, correct - s, correct + 2 * s, correct - 2 * s, correct + 1, correct - 1, correct + 10, correct - 10, correct + 3 * s];
  return mcP(rng, correct, designed.filter(ok), filler.filter(ok), fmt);
}
// Choices in a fixed order (e.g. the four chance words), correct = value.
function fixedChoices(values, correct) {
  return { choices: values.slice(), answer: values.indexOf(correct) };
}
// Visual multiple choice: items [{visual, correct}] – de-duplicates by JSON.
function mcV(rng, correctVisual, wrongVisuals, count = 4) {
  const key = (v) => JSON.stringify(v);
  const seen = new Set([key(correctVisual)]);
  const items = [{ visual: correctVisual, correct: true }];
  for (const w of wrongVisuals) {
    if (!w || seen.has(key(w))) continue;
    seen.add(key(w)); items.push({ visual: w, correct: false });
    if (items.length >= count) break;
  }
  const sh = shuffle(rng, items);
  return { choices: sh.map((it) => ({ visual: it.visual })), answer: sh.findIndex((it) => it.correct) };
}
const num = (x) => numAnswer(x);
const digitsOf = (n) => String(n).split('').map(Number);
// Place-value mistakes for multi-digit addition/subtraction.
function addNoCarry(a, b) {
  const A = digitsOf(a).reverse(), B = digitsOf(b).reverse();
  let r = 0;
  for (let i = 0; i < Math.max(A.length, B.length); i++) r += (((A[i] || 0) + (B[i] || 0)) % 10) * 10 ** i;
  return r;
}
function subSmallFromBig(a, b) {
  const A = digitsOf(a).reverse(), B = digitsOf(b).reverse();
  let r = 0;
  for (let i = 0; i < A.length; i++) r += Math.abs((A[i] || 0) - (B[i] || 0)) * 10 ** i;
  return r;
}
const hasCarry = (a, b) => addNoCarry(a, b) !== a + b;
const hasBorrow = (a, b) => subSmallFromBig(a, b) !== a - b;
// Money: $37.25 (always two decimals), $40 for whole dollars when wanted.
const money = (c, whole = false) => (whole && c % 100 === 0 ? `$${fmtNum(c / 100)}` : `$${(c / 100).toFixed(2)}`);
const moneyFr = (c) => `${(c / 100).toFixed(2).replace('.', ',')} $`;
function moneyWords(c) {
  const d = Math.floor(c / 100), k = c % 100;
  if (d === 0) return `${numWords(k)} cents`;
  return `${numWords(d)} dollar${d === 1 ? '' : 's'}${k ? ` and ${numWords(k)} cent${k === 1 ? '' : 's'}` : ''}`;
}
// Decimal helpers. dec(x, p) -> string with p places ("0.40"); decN(x) -> shortest ("0.4").
const dec = (x, p) => fmtDec(x, p);
const decN = (x) => String(clean(x));
// Is it safe to ask this decimal on the keypad (no trailing zero ambiguity)?
const keypadSafe = (x, p) => Math.round(clean(x) * 10 ** p) % 10 !== 0;
const decWords = (x) => {
  const w = Math.floor(clean(x));
  const h = Math.round(clean(x - w) * 100);
  const part = h % 10 === 0 ? fracWords(h / 10, 10) : fracWords(h, 100);
  return h === 0 ? numWords(w) : w ? `${numWords(w)} and ${part}` : part;
};

// ---------------------------------------------------------------------------
// SD1 Represent numbers to 10 000
// ---------------------------------------------------------------------------
const PV4 = ['Thousands', 'Hundreds', 'Tens', 'Ones'];
const PLACES = ['thousands', 'hundreds', 'tens', 'ones'];
const PVAL = [1000, 100, 10, 1];
const th4 = (n) => [Math.floor(n / 1000), Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10];
const fromD = (d) => d[0] * 1000 + d[1] * 100 + d[2] * 10 + d[3];
function rand4(rng, { zero = 0.3, min = 1000, max = 9999 } = {}) {
  let n = randInt(rng, min, max);
  if (chance(rng, zero)) { const d = th4(n); d[randInt(rng, 1, 3)] = 0; n = fromD(d); }
  return n;
}
function distinct4(rng) {
  let n;
  do { n = randInt(rng, 1023, 9876); } while (new Set(String(n)).size < 4 || String(n).includes('0'));
  return n;
}
const expanded = (n) => th4(n).map((d, i) => d * PVAL[i]).filter((x) => x).map(fmtNum).join(' + ');

const r4Base10 = (rng, t) => {
  const d = t === 1 ? [randInt(rng, 1, 3), randInt(rng, 0, 4), randInt(rng, 0, 5), randInt(rng, 0, 9)] : [randInt(rng, 1, 5), randInt(rng, 0, 9), randInt(rng, 0, 9), randInt(rng, 0, 9)];
  if (chance(rng, 0.3)) d[randInt(rng, 1, 2)] = 0;
  const n = fromD(d);
  const q = {
    prompt: pick(rng, ['What number do the blocks show?', 'Which number matches the base-ten blocks?']),
    visual: { type: 'base10', thousands: d[0], hundreds: d[1], tens: d[2], ones: d[3] },
    hint: 'What number do the blocks show? Each big cube is one thousand, each flat one hundred, each rod ten and each small cube one. Count each kind and write one digit for each place (thousands, hundreds, tens, ones), using 0 if a kind is missing.',
    explain: `${d.map((x, i) => `${u(x, PLACES[i].slice(0, -1))}`).join(', ')}: ${expanded(n)} = ${fmtNum(n)}.`,
  };
  if (t === 2 && chance(rng, 0.4)) return { ...q, kind: 'num', answer: num(n) };
  const noZero = Number(d.filter((x, i) => x || i === 0).join(''));
  return { ...q, ...mcN(rng, n, [noZero !== n ? noZero : n + 10, n + 1000, n - 100, n + 100, fromD([d[0], d[2], d[1], d[3]]), n + 10], { step: 100 }) };
};

const r4Chart = (rng, t) => {
  const n = rand4(rng);
  const d = th4(n);
  if (chance(rng, 0.5)) {
    const blank = randInt(rng, 0, 3);
    return {
      prompt: `The chart shows ${fmtNum(n)}. Which digit is hidden?`,
      visual: { type: 'placevalue', columns: PV4, digits: d, blank },
      hint: `The chart has a column for thousands, hundreds, tens and ones. Say ${fmtNum(n)} slowly: which digit tells how many ${PLACES[blank]} there are? That digit goes in the ? box.`,
      explain: `${fmtNum(n)} has ${d.map((x, i) => u(x, PLACES[i].slice(0, -1))).join(', ')}. The hidden ${PLACES[blank]} digit is ${d[blank]}.`,
      ...mcN(rng, d[blank], [d[(blank + 1) % 4], d[(blank + 3) % 4], d[blank] + 1, d[blank] - 1], { max: 9 }),
    };
  }
  return {
    prompt: 'What number is shown in the place-value chart?',
    visual: { type: 'placevalue', columns: PV4, digits: d },
    hint: 'Read the Thousands column first, then Hundreds, Tens and Ones, and write the digits side by side in that order. A 0 in a column still gets written.',
    explain: `${expanded(n)} = ${fmtNum(n)}.`,
    ...mcN(rng, n, [fromD([d[3], d[2], d[1], d[0]]), fromD([d[0], d[2], d[1], d[3]]), Number(d.filter((x) => x).join('')), n + 1000, n + 100].filter((x) => x >= 100), { step: 100 }),
  };
};

const r4Words = (rng, t) => {
  const n = rand4(rng, { zero: 0.6 });
  const d = th4(n);
  if (chance(rng, 0.55)) {
    const wrong = [Number(d.filter((x) => x).join('')), fromD([d[0], d[2], d[1], d[3]]), d[0] * 10000 + (n % 1000), fromD([d[0], d[1], d[3], d[2]]), n + 100];
    return {
      prompt: `Which number is ${numWords(n)}?`,
      hint: `Which choice matches "${numWords(n)}"? Split the words into the thousands part, the hundreds part and the tens-and-ones part. Write one digit for each place, and a 0 for any place the words skip.`,
      explain: `${cap(numWords(n))} is ${d.map((x, i) => u(x, PLACES[i].slice(0, -1))).join(', ')}: ${fmtNum(n)}.`,
      ...mcN(rng, n, wrong.filter((x) => x !== n), { step: 100 }),
    };
  }
  const wrongs = [fromD([d[0], d[2], d[1], d[3]]), fromD([d[0], d[1], d[3], d[2]]), n + 1000, n - 100].filter((x) => x !== n && x >= 1000 && x <= 9999);
  return {
    prompt: `How do you write ${fmtNum(n)} in words?`,
    hint: `Which words say ${fmtNum(n)}? Say the thousands digit and "thousand", then the hundreds digit and "hundred", then the last two digits as one number, skipping any place that is 0. Check each choice against that.`,
    explain: `${fmtNum(n)} is "${numWords(n)}".`,
    ...mcP(rng, n, wrongs, [n + 10, n + 1], numWords),
  };
};

const r4DigitValue = (rng, t) => {
  const n = distinct4(rng);
  const d = th4(n);
  const pos = randInt(rng, 0, 3);
  const val = d[pos] * PVAL[pos];
  if (t >= 4 && chance(rng, 0.45)) {
    const target = randInt(rng, 1, 9), p = randInt(rng, 0, 3);
    const make = (pp) => { let x; do { x = distinct4(rng); } while (th4(x).includes(target)); const dd = th4(x); dd[pp] = target; return fromD(dd); };
    const good = make(p);
    return {
      prompt: `In which number does the ${target} have a value of ${fmtNum(target * PVAL[p])}?`,
      hint: `Which number has its ${target} worth ${fmtNum(target * PVAL[p])}? That value means ${u(target, PLACES[p].slice(0, -1))}. In each choice, find the ${target} and check which place it is in.`,
      explain: `In ${fmtNum(good)}, the ${target} is in the ${PLACES[p]} place, so it is worth ${fmtNum(target * PVAL[p])}.`,
      ...mcP(rng, good, [0, 1, 2, 3].filter((x) => x !== p).map(make), [], fmtNum),
    };
  }
  return {
    prompt: `What is the value of the ${d[pos]} in ${fmtNum(n)}?`,
    visual: t === 3 ? { type: 'placevalue', columns: PV4, digits: d } : undefined,
    hint: `How much is the ${d[pos]} in ${fmtNum(n)} worth? Find its place by counting from the right: ones, tens, hundreds, thousands. A digit is worth that many of its place.`,
    explain: `The ${d[pos]} is in the ${PLACES[pos]} place, so its value is ${d[pos]} × ${fmtNum(PVAL[pos])} = ${fmtNum(val)}.`,
    ...mcP(rng, val, [d[pos], d[pos] * 10, d[pos] * 100, d[pos] * 1000].filter((x) => x !== val), [n], fmtNum),
  };
};

const r4Compare = (rng, t) => {
  const a = rand4(rng);
  const d = th4(a);
  const kind = randInt(rng, 0, 4);
  let b = kind === 0 ? fromD([d[0], d[2], d[1], d[3]]) : kind === 1 ? a + pick(rng, [-1000, 1000, -100, 100, -10, 10]) : kind === 2 ? a : kind === 3 ? Number(String(a).slice(1)) * 10 + d[0] : rand4(rng);
  if (b < 1000 || b > 9999) b = a + 10 <= 9999 ? a + 10 : a - 10;
  if (chance(rng, 0.45)) {
    let right = fmtNum(b);
    if (t >= 5 && chance(rng, 0.5)) { const e = th4(b); right = pick(rng, [`${e[0] * 10 + e[1]} hundreds ${u(e[2], 'ten')} ${u(e[3], 'one')}`, expanded(b)]); }
    const sym = a < b ? '<' : a > b ? '>' : '=';
    return {
      prompt: `Which symbol makes this true? ${fmtNum(a)} □ ${right}`,
      speak: `Which symbol makes this true? ${fmtNum(a)}, blank, ${right.replace(/\+/g, 'plus')}.`,
      visual: { type: 'expression', text: `${fmtNum(a)} □ ${right}`, big: true },
      hint: `${right !== fmtNum(b) ? 'First turn the right side into a plain number. ' : ''}< means "is less than", > means "is greater than" and = means "is the same as". Compare the thousands digits first; if they match, compare hundreds, then tens, then ones.`,
      explain: `${fmtNum(a)} ${sym === '<' ? 'is less than' : sym === '>' ? 'is greater than' : 'equals'} ${fmtNum(b)}, so ${fmtNum(a)} ${sym} ${right}.`,
      ...fixedChoices(['<', '=', '>'], sym),
    };
  }
  const nums = [...new Set([a, b, a + pick(rng, [100, -100, 1000]), fromD([d[0], d[1], d[3], d[2]])].filter((x) => x >= 1000 && x <= 9999))];
  while (nums.length < 3) nums.push(rand4(rng));
  const most = chance(rng, 0.5);
  const target = most ? Math.max(...nums) : Math.min(...nums);
  return {
    prompt: `Which number is the ${most ? 'greatest' : 'least'}?`,
    hint: `Which number is the ${most ? 'greatest' : 'least'}? Look at the thousands digit of each choice first. If two tie, compare their hundreds, then their tens.`,
    explain: `In order: ${nums.slice().sort((x, y) => x - y).map(fmtNum).join(', ')}. The ${most ? 'greatest' : 'least'} is ${fmtNum(target)}.`,
    ...mcP(rng, target, nums.filter((x) => x !== target), [], fmtNum),
  };
};

const r4Expanded = (rng, t) => {
  const n = rand4(rng, { zero: 0.6 });
  if (chance(rng, 0.5)) {
    return {
      kind: 'num',
      prompt: `What number is ${expanded(n)}?`,
      hint: `What number is ${expanded(n)}? Each part gives one digit in its place. Write the thousands digit, then hundreds, tens and ones, using 0 for any place that is missing.`,
      explain: `${expanded(n)} = ${fmtNum(n)}.`,
      answer: num(n),
    };
  }
  const d = th4(n);
  const bad1 = d.map((x, i) => x * PVAL[Math.min(3, i + 1)]).filter((x) => x).map(fmtNum).join(' + ');
  const bad2 = d.map((x, i) => x * PVAL[i]).filter((x) => x).map((x) => fmtNum(x * 10)).join(' + ');
  const bad3 = d.join(' + ');
  return {
    prompt: `Which shows ${fmtNum(n)} in expanded form?`,
    hint: `Expanded form writes each digit as what it is worth, joined with + signs. Test each choice: does each part match the value of a digit in ${fmtNum(n)}, and does it all add back up to ${fmtNum(n)}?`,
    explain: `${fmtNum(n)} = ${expanded(n)}.`,
    ...mcP(rng, expanded(n), [bad1, bad2, bad3], [], String),
  };
};

const r4Rename = (rng, t) => {
  const n = rand4(rng, { zero: 0.2 });
  const d = th4(n);
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const h = d[0] * 10 + d[1];
    const which = pick(rng, ['hundreds', 'tens']);
    const n2 = which === 'hundreds' ? n - (n % 100) : n - (n % 10);
    const ans = which === 'hundreds' ? n2 / 100 : n2 / 10;
    return {
      kind: 'num',
      prompt: `How many ${which} are in ${fmtNum(n2)}?`,
      hint: which === 'hundreds' ? `How many hundreds are in ${fmtNum(n2)}? Each thousand is ten hundreds. Count the hundreds inside the thousands, then add the other hundreds.` : `How many tens are in ${fmtNum(n2)}? Each hundred is ten tens and each thousand is a hundred tens. Cover the ones digit: what number is left?`,
      explain: which === 'hundreds' ? `${fmtNum(n2)} = ${u(h, 'hundred')}.` : `${fmtNum(n2)} = ${u(ans, 'ten')}.`,
      answer: num(ans),
    };
  }
  if (k === 1 && d[0] >= 1) {
    const g = [d[0] - 1, d[1] + 10, d[2], d[3]];
    return {
      prompt: `What number is ${u(g[0], 'thousand')}, ${u(g[1], 'hundred')}, ${u(g[2], 'ten')} and ${u(g[3], 'one')}?`,
      hint: `Ten hundreds make one thousand. Trade ten of the ${g[1]} hundreds for one more thousand. Then write thousands, hundreds, tens and ones.`,
      explain: `${g[1]} hundreds = 1 thousand and ${u(d[1], 'hundred')}. So the number is ${fmtNum(n)}.`,
      ...mcN(rng, n, [Number(`${g[0]}${g[1]}${g[2]}${g[3]}`), fromD([g[0], d[1], d[2], d[3]]), n + 1000, n - 100].filter((x) => x < 100000), { step: 100 }),
    };
  }
  const good = pick(rng, [[d[0] - 1, d[1] + 10, d[2], d[3]], [d[0], d[1] - 1, d[2] + 10, d[3]], [0, d[0] * 10 + d[1], d[2], d[3]]].filter((x) => x.every((v) => v >= 0)));
  const fmt = (x) => [u(x[0], 'thousand'), u(x[1], 'hundred'), u(x[2], 'ten'), u(x[3], 'one')].filter((s, i) => x[i] || i >= 2).join(', ');
  const bad = [[d[0] - 1, d[1], d[2] + 10, d[3]], [d[0], d[1] + 10, d[2], d[3]], [d[0] - 1, d[1] + 1, d[2], d[3]], [d[0] - 1, d[1] + 10, d[2] + 10, d[3]]].filter((x) => x.every((v) => v >= 0) && fromD(x) !== n);
  return {
    prompt: `Which is another way to show ${fmtNum(n)}?`,
    hint: `Which choice adds up to exactly ${fmtNum(n)}? Test each one: thousands are worth 1000 each, hundreds 100, tens 10 and ones 1. Since 1 thousand = 10 hundreds and 1 hundred = 10 tens, a choice can look different and still be the same number.`,
    explain: `${fmt(good)} = ${fmtNum(good[0] * 1000)} + ${fmtNum(good[1] * 100)} + ${good[2] * 10} + ${good[3]} = ${fmtNum(n)}.`,
    ...mcP(rng, good, bad, [], fmt),
  };
};

const r4Benchmark = (rng, t) => {
  const marks = [0, 2500, 5000, 7500, 10000];
  const nl = { type: 'numberline', min: 0, max: 10000, ticks: 2500, labels: marks };
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    let v;
    do { v = randInt(rng, 2, 98) * 100 + (t >= 5 ? randInt(rng, 0, 99) : 0); } while (marks.some((m) => Math.abs(m - v) < 100) || marks.some((m) => Math.abs(Math.abs(m - v) - 1250) < 150));
    const near = marks.reduce((b, m) => (Math.abs(m - v) < Math.abs(b - v) ? m : b), 0);
    return {
      prompt: `Which benchmark is ${fmtNum(v)} closest to?`,
      visual: t <= 5 ? { ...nl, marks: [{ value: v, label: fmtNum(v) }] } : nl,
      hint: `Is ${fmtNum(v)} nearest to 0, 2500, 5000, 7500 or 10 000? Find the two benchmarks it is between. The halfway points are 1250, 3750, 6250 and 8750: is it before or after the halfway point?`,
      explain: `${fmtNum(v)} is ${fmtNum(Math.abs(v - near))} away from ${fmtNum(near)}, closer than to any other benchmark.`,
      ...mcP(rng, near, marks.filter((m) => m !== near && Math.abs(m - near) <= 5000), [], fmtNum),
    };
  }
  if (k === 1) {
    const b = pick(rng, [2500, 5000, 7500]);
    const v = b + pick(rng, [-1, 1]) * randInt(rng, 1, 6) * 100;
    return {
      prompt: 'Which number is the arrow pointing to?',
      visual: { ...nl, arrow: v },
      hint: `The arrow is near the ${fmtNum(b)} mark on a 0 to 10 000 line. Is it a little before (less) or a little after (more)? Pick the choice that is close to ${fmtNum(b)} on that side.`,
      explain: `The arrow is just ${v < b ? 'before' : 'after'} ${fmtNum(b)}, so about ${fmtNum(v)}.`,
      ...mcP(rng, v, [v + 2500, v - 2500, 10000 - v, v + 5000].filter((x) => x > 0 && x < 10000 && Math.abs(x - v) >= 2000), [v + 3000, v - 3000].filter((x) => x > 0 && x < 10000), fmtNum),
    };
  }
  const lo = pick(rng, [0, 2500, 5000, 7500]);
  const v = lo + randInt(rng, 3, 22) * 100 + randInt(rng, 0, 99);
  return {
    prompt: `Which number is between ${fmtNum(lo)} and ${fmtNum(lo + 2500)}?`,
    visual: nl,
    hint: `Which number is more than ${fmtNum(lo)} and less than ${fmtNum(lo + 2500)}? Test each choice twice: is it bigger than ${fmtNum(lo)}? Is it smaller than ${fmtNum(lo + 2500)}? Only one passes both.`,
    explain: `${fmtNum(v)} is between ${fmtNum(lo)} and ${fmtNum(lo + 2500)}.`,
    ...mcP(rng, v, [lo - 1500, lo + 4000, lo + 6500, lo - 4000, v + 2600].filter((x) => x > 0 && x < 10000 && !(x > lo && x < lo + 2500)), [], fmtNum),
  };
};

const r4Digits = (rng, t) => {
  const d = sample(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4);
  const great = chance(rng, 0.5);
  let ans;
  if (great) ans = Number(d.slice().sort((a, b) => b - a).join(''));
  else { const asc = d.slice().sort((a, b) => a - b); if (asc[0] === 0) [asc[0], asc[1]] = [asc[1], asc[0]]; ans = Number(asc.join('')); }
  const q = {
    prompt: `Use the digits ${d.join(', ')} once each. What is the ${great ? 'greatest' : 'least'} 4-digit number you can make?`,
    hint: great ? `What is the biggest 4-digit number you can make with ${d.join(', ')}? The thousands place is worth the most, so the biggest digit goes there, then the next biggest in the hundreds place, and so on.` : `What is the smallest 4-digit number you can make with ${d.join(', ')}? Put the smallest digit you can in the thousands place (not 0), then the smallest digits left in the hundreds, tens and ones.`,
    explain: `${great ? 'Biggest to smallest' : 'Smallest possible first digit, then the rest from smallest to biggest'}: ${fmtNum(ans)}.`,
  };
  if (t >= 6) return { ...q, kind: 'num', answer: num(ans) };
  const s = String(ans);
  const alts = [Number(s[0] + s[2] + s[1] + s[3]), Number(s[0] + s[1] + s[3] + s[2]), Number(s[1] + s[0] + s[2] + s[3]), Number(s.split('').reverse().join(''))].filter((x) => x >= 1000);
  return { ...q, ...mcP(rng, ans, alts, [], fmtNum) };
};

const r4Riddle = (rng, t) => {
  const th = randInt(rng, 1, 9), o = randInt(rng, 0, 5), tn = o + randInt(rng, 1, 4), h = randInt(rng, 0, 9);
  const n = fromD([th, h, tn, o]);
  return {
    kind: 'num',
    prompt: `I am a 4-digit number. I have ${u(th, 'thousand')} and ${u(h, 'hundred')}. My ones digit is ${o}. My tens digit is ${tn - o} more than my ones digit. What number am I?`,
    hint: `Build the number clue by clue: the thousands digit is ${th}, the hundreds digit is ${h} and the ones digit is ${o}. For the tens digit, start at ${o} and count up ${tn - o}. Then write the digits in place order.`,
    explain: `Thousands ${th}, hundreds ${h}, tens ${o} + ${tn - o} = ${tn}, ones ${o}: ${fmtNum(n)}.`,
    answer: num(n),
  };
};

// Big challenge that stays inside Grade 4 (numbers to 10 000): reaching and renaming 10 000.
const r4Preview = (rng, t) => {
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const [step, from] = pick(rng, [[1, 9999], [10, 9990], [100, 9900], [1000, 9000], [50, 9950], [500, 9500], [250, 9750]]);
    return {
      kind: 'num',
      prompt: `Big challenge! What is ${fmtNum(step)} more than ${fmtNum(from)}?`,
      hint: `What is ${fmtNum(step)} more than ${fmtNum(from)}? Count on ${fmtNum(step)}. When the thousands are full (9 thousands, 9 hundreds, 9 tens and 9 ones), the next number is ten thousand.`,
      explain: `${fmtNum(from)} + ${fmtNum(step)} = ${fmtNum(10000)}.`,
      answer: num(10000),
    };
  }
  if (k === 1) {
    const [unit, ans] = pick(rng, [['thousands', 10], ['hundreds', 100], ['tens', 1000]]);
    return {
      prompt: `Big challenge! How many ${unit} make ${fmtNum(10000)}?`,
      hint: `How many ${unit} make ten thousand? Ten thousand is 10 thousands. Each thousand is 10 hundreds, and each hundred is 10 tens.`,
      explain: `${fmtNum(10000)} = ${u(ans, unit.slice(0, -1))}.`,
      ...mcN(rng, ans, [ans * 10, ans / 10, ans + 10, ans - 1].filter((x) => x >= 1 && Number.isInteger(x) && x !== ans), { step: ans >= 100 ? 100 : 1 }),
    };
  }
  const th = randInt(rng, 6, 9), hund = (10 - th) * 10;
  return {
    prompt: `Big challenge! What number is ${u(th, 'thousand')} and ${u(hund, 'hundred')}?`,
    hint: `Ten hundreds make one thousand. Trade the ${hund} hundreds for thousands, then count all the thousands.`,
    explain: `${u(hund, 'hundred')} = ${u(hund / 10, 'thousand')}. ${th} + ${hund / 10} = 10 thousands = ${fmtNum(10000)}.`,
    ...mcN(rng, 10000, [th * 1000 + hund * 10, th * 1000 + hund, 9000, 9900], { step: 1000 }),
  };
};

const g4Represent = {
  id: 'g4-qpv-represent', grade: 4, strand: 'number', bigIdea: 'qpv', species: 'numberling',
  name: 'Numbers to 10 000',
  parentDesc: 'Reads, writes and represents numbers to 10 000: words, base-ten blocks, expanded form, digit value, renaming, comparing, and benchmarks 2500/5000/7500.',
  classic: false,
  gen: tiered([
    [1, 2, r4Base10, 2], [1, 3, r4Chart, 1.5], [2, 5, r4Words, 1.5], [3, 5, r4DigitValue, 1.5], [3, 5, r4Compare, 1.5], [3, 5, r4Expanded],
    [4, 7, r4Rename, 1.5], [4, 7, r4Benchmark, 1.2], [5, 7, r4Digits], [6, 7, r4Riddle, 1.5], [7, 7, r4Preview, 0.6],
  ]),
};

// ---------------------------------------------------------------------------
// SD2 Fractions and decimals (tenths and hundredths)
// ---------------------------------------------------------------------------
const pl = (d) => fracWords(2, d).split(' ')[1];
const properFracs = (list) => list.filter(([a, b]) => a >= 1 && b >= 2 && a <= b).map(([a, b]) => frac(a, b));
const DEN4 = [2, 3, 4, 5, 6, 8, 10, 12];

const fdName = (rng, t) => {
  const d = pick(rng, t === 1 ? [2, 3, 4, 5, 6, 8] : DEN4);
  const n = randInt(rng, 1, d - 1);
  const kind = pick(rng, ['bar', 'circle', 'set']);
  const v = kind === 'bar' ? { type: 'fractionbar', bars: [{ parts: d, shaded: n, color: pick(rng, COLOURS) }] }
    : kind === 'circle' ? { type: 'fractioncircle', parts: d, shaded: n, color: pick(rng, COLOURS) }
      : { type: 'fractionset', total: d, shaded: n, icon: pick(rng, ['🍎', '⭐', '🐟', '🦉', '🌼', '🧁', '🐞']) };
  return {
    prompt: kind === 'set' ? 'What fraction of the set is shaded?' : 'What fraction is shaded?',
    visual: v,
    hint: 'What fraction is shaded? The bottom number (denominator) is how many equal parts or objects there are in all. The top number (numerator) is how many are shaded. Count each one.',
    explain: `${n} of ${d} ${kind === 'set' ? 'objects' : 'equal parts'} ${n === 1 ? 'is' : 'are'} shaded: ${frac(n, d)}.`,
    ...mcP(rng, frac(n, d), properFracs([[d - n, d], [n, d - n], [n, d + 1], [n + 1, d], [n - 1, d]]), [], String),
  };
};

const fdGrid = (rng, t) => {
  const tenths = chance(rng, t <= 1 ? 0.6 : 0.35);
  const s = tenths ? randInt(rng, 1, 9) : randInt(rng, 1, 99);
  const val = tenths ? s / 10 : s / 100;
  const shown = tenths ? dec(val, 1) : dec(val, 2);
  const wrongs = tenths ? [dec(s / 100, 2), String(s), dec(s / 10 + s / 100, 2), `${s}.0`] : [dec(s / 1000, 3), dec(s / 10, 1), String(s), s % 10 && s >= 10 ? dec(Number(String(s).split('').reverse().join('')) / 100, 2) : dec(val + 0.1, 2)];
  const q = {
    prompt: tenths ? 'The whole is split into 10 equal parts. What decimal is shaded?' : 'The grid is one whole. What decimal is shaded?',
    visual: { type: 'hundredgrid', shaded: tenths ? s * 10 : s, tenthsOnly: tenths },
    hint: tenths ? 'What decimal is shaded? The whole is split into 10 equal columns, so each column is one tenth. Count the shaded columns: that is the digit right after the decimal point.' : 'What decimal is shaded? The grid is one whole of 100 small squares: each square is one hundredth and each full column is one tenth. Count the full columns (tenths digit), then the extra squares (hundredths digit).',
    explain: tenths ? `${s} of 10 parts are shaded: ${frac(s, 10)} = ${shown}.` : `${s} of 100 squares are shaded: ${frac(s, 100)} = ${shown}.`,
  };
  if (t >= 2 && keypadSafe(val, tenths ? 1 : 2) && chance(rng, 0.35)) return { ...q, kind: 'num', answer: decN(val) };
  return { ...q, ...mcP(rng, shown, wrongs, [], String) };
};

const fdReadWrite = (rng, t) => {
  const w = t >= 4 && chance(rng, 0.5) ? randInt(rng, 1, 9) : 0;
  const hund = chance(rng, 0.6);
  const f = hund ? randInt(rng, 1, 99) : randInt(rng, 1, 9);
  if (hund && f % 10 === 0) return fdGrid(rng, t);
  const val = w + (hund ? f / 100 : f / 10);
  const s = dec(val, hund ? 2 : 1);
  const words = decWords(val);
  if (chance(rng, 0.5)) {
    const wrongs = hund ? [dec(w + f / 1000, 3), dec(w + f / 10, 1), `${w}.${String(f).padStart(2, '0').split('').reverse().join('')}`, f < 10 ? dec(w + f / 10, 1) : `${w || ''}${f}`] : [dec(w + f / 100, 2), String(w * 10 + f), `${f}.${w}`];
    return {
      prompt: `How do you write ${words} as a decimal?`,
      hint: hund ? `How do you write ${words} as a decimal? Hundredths need two places after the point: tenths first, then hundredths. If there are fewer than ten hundredths, the tenths place gets a 0.` : `How do you write ${words} as a decimal? Tenths need just one place after the point. ${w ? 'The whole number goes before the point.' : 'With no whole number, write 0 before the point.'}`,
      explain: `${cap(words)} is ${s}.${hund && f < 10 ? ' The 0 holds the tenths place.' : ''}`,
      ...mcP(rng, s, wrongs.filter((x) => x !== s), [], String),
    };
  }
  const place = hund ? pick(rng, ['tenths', 'hundredths']) : 'tenths';
  const digit = place === 'tenths' ? Math.floor(clean(val * 10)) % 10 : Math.round(clean(val * 100)) % 10;
  if (chance(rng, 0.5)) {
    return {
      prompt: `What digit is in the ${place} place of ${s}?`,
      visual: { type: 'placevalue', columns: ['Ones', 'Tenths', 'Hundredths'].slice(0, hund ? 3 : 2), digits: [w, ...s.split('.')[1].split('').map(Number)] },
      hint: `Which digit is in the ${place} place of ${s}? The first place after the decimal point is tenths and the second place is hundredths. Point to the right place.`,
      explain: `In ${s}, the ${place} digit is ${digit}.`,
      ...mcN(rng, digit, [w, ...s.split('.')[1].split('').map(Number)].filter((x) => x !== digit), { max: 9 }),
    };
  }
  const wrongW = [decWords(w + (hund ? f / 10 : f / 100)), w ? decWords(f / (hund ? 100 : 10)) : decWords(val * 10 > 9 ? val / 10 : val * 10), `${numWords(f)} ${hund ? 'tenths' : 'hundredths'}`];
  return {
    prompt: `How do you say ${s}?`,
    hint: `How do you say ${s}? Say the whole number (if there is one) and "and" for the point. Then read the digits after the point as a number, and finish with the name of the LAST place: tenths or hundredths.`,
    explain: `${s} is read "${words}".`,
    ...mcP(rng, words, wrongW, [], String),
  };
};

const fdFracDec = (rng, t) => {
  const hund = chance(rng, 0.55);
  const n = hund ? randInt(rng, 1, 99) : randInt(rng, 1, 9);
  const d = hund ? 100 : 10;
  const decStr = dec(n / d, hund ? 2 : 1);
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const wrongs = hund ? [dec(n / 10, 1), `${n}.100`, dec(n / 1000, 3), `${n}`] : [dec(n / 100, 2), `${n}.10`, `${n}`, dec(n / 10 + 0.1, 1)];
    return {
      prompt: `Which decimal equals ${frac(n, d)}?`,
      visual: t <= 3 ? { type: 'hundredgrid', shaded: hund ? n : n * 10, tenthsOnly: !hund } : undefined,
      hint: `Which decimal equals ${frac(n, d)}? ${hund ? 'Hundredths fill two places after the point.' : 'Tenths fill one place after the point.'} Read the fraction out loud, then write it with the right number of places.`,
      explain: `${frac(n, d)} is ${decWords(n / d)}, which is ${decStr}.`,
      ...mcP(rng, decStr, wrongs, [], String),
    };
  }
  if (k === 1) {
    return {
      prompt: `Which fraction equals ${decStr}?`,
      hint: `Which fraction equals ${decStr}? Say the decimal in words. The name of its last place (tenths or hundredths) is the bottom number, and the digits after the point make the top number.`,
      explain: `${decStr} is ${decWords(n / d)}, so it equals ${frac(n, d)}.`,
      ...mcP(rng, frac(n, d), hund ? [frac(n, 10), frac(Number(String(n).split('').reverse().join('')) || n + 1, 100), frac(1, n > 1 ? n : 2)].filter((x) => !/\/(\d{3,})/.test(x) && x !== frac(n, 100)) : [frac(n, 100), frac(1, n + 1), frac(10, n)].filter((x) => x !== frac(n, 10)), [], String),
    };
  }
  // equivalence 5/10 = 0.50 = 50/100
  const m = randInt(rng, 1, 9);
  return {
    prompt: `${frac(m, 10)} = ${frac(m * 10, 100)}. Which decimal equals both?`,
    visual: { type: 'hundredgrid', shaded: m * 10 },
    hint: `${frac(m, 10)} means ${m} tenths and ${frac(m * 10, 100)} means ${m * 10} hundredths: the same amount. Tenths go in the first place after the decimal point; hundredths use two places. Which choice shows that amount?`,
    explain: `${m} tenths = ${m * 10} hundredths, so ${dec(m / 10, 1)} = ${dec(m / 10, 2)}.`,
    ...mcP(rng, pick(rng, [dec(m / 10, 1), dec(m / 10, 2)]), [dec(m / 100, 2), `${m}.10`, `${m * 10}`, `${m}.0`], [], String),
  };
};

const fdUnit = (rng, t) => {
  const d = pick(rng, [3, 4, 5, 6, 8, 10]);
  const n = randInt(rng, 2, Math.min(d - 1, 5));
  const good = Array(n).fill(frac(1, d)).join(' + ');
  return {
    prompt: `Which shows ${frac(n, d)} broken into unit fractions?`,
    visual: { type: 'fractionbar', bars: [{ parts: d, shaded: n, color: pick(rng, COLOURS) }] },
    hint: `A unit fraction has a top number of 1, like ${frac(1, d)}. How many ${frac(1, d)} pieces make ${frac(n, d)}? Count the shaded parts of the bar, then check each choice: right size of piece AND right number of pieces?`,
    explain: `${frac(n, d)} is ${n} pieces of ${frac(1, d)}: ${good}.`,
    ...mcP(rng, good, [Array(d).fill(frac(1, n)).slice(0, Math.min(d, 6)).join(' + '), Array(n - 1 || 1).fill(frac(1, d)).join(' + '), `${frac(1, d)} + ${frac(n - 1, d - 1)}`, Array(n + 1).fill(frac(1, d)).join(' + ')], [], String),
  };
};

function benchName(n, d) {
  const x = n / d;
  if (x < 0.25) return '0';
  if (x > 0.75) return '1';
  return '[[f:1/2]]';
}
const fdCompare = (rng, t) => {
  const k = randInt(rng, 0, t >= 5 ? 3 : 2);
  if (k === 0) {
    // same numerator
    const n = randInt(rng, 1, 4);
    const [p, q] = sample(rng, DEN4.filter((x) => x > n), 2);
    const ans = frac(n, Math.min(p, q));
    if (chance(rng, 0.4)) {
      // Record the comparison with a symbol (NB Grade 4: compare fractions and record with <, >, =).
      const sym = p < q ? '>' : '<';
      return {
        prompt: `Which symbol makes this true? ${frac(n, p)} □ ${frac(n, q)}`,
        visual: t <= 4 ? { type: 'fractionbar', bars: [{ parts: p, shaded: n, label: frac(n, p) }, { parts: q, shaded: n, label: frac(n, q) }] } : undefined,
        hint: `< means "is less than" and > means "is greater than". Both fractions have ${u(n, 'piece')}, so compare the size of the pieces: a whole cut into fewer pieces has bigger pieces.`,
        explain: `Both have ${u(n, 'piece')}. ${cap(pl(Math.min(p, q)))} are bigger than ${pl(Math.max(p, q))}, so ${frac(n, p)} ${sym} ${frac(n, q)}.`,
        ...fixedChoices(['<', '=', '>'], sym),
      };
    }
    return {
      prompt: `Which is greater: ${frac(n, p)} or ${frac(n, q)}?`,
      visual: t <= 4 ? { type: 'fractionbar', bars: [{ parts: p, shaded: n, label: frac(n, p) }, { parts: q, shaded: n, label: frac(n, q) }] } : undefined,
      hint: `Which is greater: ${frac(n, p)} or ${frac(n, q)}? Both have ${u(n, 'piece')}, so compare the size of the pieces. A whole cut into fewer pieces has bigger pieces.`,
      explain: `Both have ${u(n, 'piece')}. ${cap(pl(Math.min(p, q)))} are bigger than ${pl(Math.max(p, q))}, so ${ans} is greater.`,
      ...fixedChoices([frac(n, p), frac(n, q)], ans),
    };
  }
  if (k === 1) {
    // benchmark 1/2: one less than half, one more than half
    const d1 = pick(rng, [5, 6, 8, 10, 12]), d2 = pick(rng, [3, 4, 5, 6, 8].filter((x) => x !== d1));
    const lo = randInt(rng, 1, Math.ceil(d1 / 2) - 1), hi = randInt(rng, Math.floor(d2 / 2) + 1, d2 - 1);
    const flip = chance(rng, 0.5);
    const [A, B] = flip ? [frac(hi, d2), frac(lo, d1)] : [frac(lo, d1), frac(hi, d2)];
    if (chance(rng, 0.4)) {
      const sym = flip ? '>' : '<';
      return {
        prompt: `Which symbol makes this true? ${A} □ ${B}`,
        hint: `< means "is less than" and > means "is greater than". Compare each fraction to [[f:1/2]]: half of ${d1} is ${d1 / 2} and half of ${d2} is ${d2 / 2}. Which fraction is more than half?`,
        explain: `${frac(lo, d1)} is less than [[f:1/2]] and ${frac(hi, d2)} is more than [[f:1/2]], so ${A} ${sym} ${B}.`,
        ...fixedChoices(['<', '=', '>'], sym),
      };
    }
    return {
      prompt: `Which is greater: ${A} or ${B}?`,
      hint: `Compare each fraction to [[f:1/2]]. A fraction is more than half when its top number is more than half of its bottom number: half of ${d1} is ${d1 / 2} and half of ${d2} is ${d2 / 2}. Which fraction is more than half?`,
      explain: `${frac(lo, d1)} is less than [[f:1/2]] (half of ${d1} is ${d1 / 2}), and ${frac(hi, d2)} is more than [[f:1/2]]. So ${frac(hi, d2)} is greater.`,
      ...fixedChoices([A, B], frac(hi, d2)),
    };
  }
  if (k === 2) {
    const d = pick(rng, [4, 5, 6, 8, 10, 12]);
    let n; do { n = randInt(rng, 1, d - 1); } while (Math.abs(n / d - 0.25) < 0.02 || Math.abs(n / d - 0.75) < 0.02);
    const b = benchName(n, d);
    return {
      prompt: `Is ${frac(n, d)} closest to 0, [[f:1/2]] or 1?`,
      visual: { type: 'numberline', min: 0, max: 1, ticks: clean(1 / d), labels: 'ends', marks: [{ value: 0.5, label: '[[f:1/2]]' }], arrow: clean(n / d) },
      hint: `Is ${frac(n, d)} closest to 0, [[f:1/2]] or 1? Half of ${d} is ${d / 2}. Is ${n} closest to 0, to ${d / 2}, or to ${d}?`,
      explain: `${frac(n, d)}: ${n} is closest to ${b === '0' ? '0' : b === '1' ? d : d / 2} out of ${d}, so ${frac(n, d)} is closest to ${b}.`,
      ...fixedChoices(['0', '[[f:1/2]]', '1'], b),
    };
  }
  // order three fractions using benchmarks
  const dl = pick(rng, [5, 6, 8, 10, 12]), dh = pick(rng, [5, 6, 8, 10]), k2 = pick(rng, [1, 2, 3, 4, 5]);
  const fr = [[1, dl], [k2, 2 * k2], [dh - 1, dh]];
  const sorted = fr.slice().sort((a, b) => a[0] / a[1] - b[0] / b[1]);
  const fmt = (arr) => arr.map(([a, b]) => frac(a, b)).join(', ');
  return {
    prompt: `Order from least to greatest: ${fmt(shuffle(rng, fr))}`,
    hint: 'Sort them using benchmarks. A small top number over a big bottom number is close to 0. A top number that is half the bottom number is exactly [[f:1/2]]. A top number almost as big as the bottom number is close to 1.',
    explain: `${frac(...sorted[0])} is close to 0, ${frac(...sorted[1])} is in the middle, ${frac(...sorted[2])} is close to 1. So: ${fmt(sorted)}.`,
    ...mcP(rng, sorted, [sorted.slice().reverse(), [sorted[1], sorted[0], sorted[2]], [sorted[0], sorted[2], sorted[1]]], [], fmt),
  };
};

const EQUIV_BASE = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 6], [5, 6]];
const fdEquiv = (rng, t) => {
  const [n, d] = pick(rng, EQUIV_BASE);
  const m = pick(rng, [2, 3, 4, 5].filter((x) => d * x <= 12)); // no twentieths: stay with the Grade 4 denominators
  const [N, D] = [n * m, d * m];
  const col = pick(rng, COLOURS);
  if (chance(rng, 0.5)) {
    return {
      prompt: `Which fraction is equivalent to ${frac(n, d)}?`,
      visual: t <= 4 && D <= 12 ? { type: 'fractionbar', bars: [{ parts: d, shaded: n, color: col, label: frac(n, d) }, { parts: D, shaded: N, color: col }] } : undefined,
      hint: `Which fraction shows the same amount as ${frac(n, d)}? Test each choice: can you multiply BOTH the top and the bottom of ${frac(n, d)} by the same number to get it?`,
      explain: `Multiply the numerator and the denominator of ${frac(n, d)} by ${m} to get ${frac(N, D)}. The same amount is shaded.`,
      ...mcP(rng, frac(N, D), properFracs([[n + m, d + m], [N, d * (m + 1) <= 12 ? d * (m + 1) : D + 1], [n, D], [N - 1, D]]).filter((x) => x !== frac(N, D)), [], String),
    };
  }
  const blankTop = chance(rng, 0.5);
  return {
    kind: 'num',
    prompt: blankTop ? `${frac(n, d)} = □ out of ${D}. What is □?` : `${frac(n, d)} = ${N} out of □. What is □?`,
    speak: blankTop ? `${fracWords(n, d)} equals how many ${pl(D)}?` : `${fracWords(n, d)} equals ${N} out of how many?`,
    visual: { type: 'expression', text: blankTop ? `${frac(n, d)} = [[f:?/${D}]]` : `${frac(n, d)} = [[f:${N}/?]]`, big: true },
    hint: blankTop ? `The bottom number went from ${d} to ${D}. What was it multiplied by? Multiply the top number, ${n}, by that same number.` : `The top number went from ${n} to ${N}. What was it multiplied by? Multiply the bottom number, ${d}, by that same number.`,
    explain: `Multiply the top and bottom by ${m}: ${frac(n, d)} = ${frac(N, D)}.`,
    answer: num(blankTop ? N : D),
  };
};

const fdDecBench = (rng, t) => {
  const marks = [0, 0.25, 0.5, 0.75, 1];
  let v; do { v = randInt(rng, 3, 97) / 100; } while (marks.some((m) => Math.abs(m - v) < 0.03) || marks.some((m) => Math.abs(Math.abs(m - v) - 0.125) < 0.02));
  const near = marks.reduce((b, m) => (Math.abs(m - v) < Math.abs(b - v) ? m : b), 0);
  const lab = (x) => decN(x);
  if (chance(rng, 0.5)) {
    return {
      prompt: `Which benchmark is ${dec(v, 2)} closest to?`,
      visual: { type: 'numberline', min: 0, max: 1, ticks: 0.25, labels: marks, labelFormat: 'decimal', marks: t <= 5 ? [{ value: v, label: dec(v, 2) }] : undefined },
      hint: `Is ${dec(v, 2)} nearest to 0, 0.25, 0.5, 0.75 or 1? Find the two benchmarks it is between, then decide which it is closer to. Think in hundredths: 0.25 is 25 hundredths and 0.5 is 50 hundredths.`,
      explain: `${dec(v, 2)} is ${dec(Math.abs(v - near), 2)} away from ${lab(near)}, closer than to any other benchmark.`,
      ...mcP(rng, lab(near), marks.filter((m) => m !== near).map(lab), [], String),
    };
  }
  const b = pick(rng, [0.25, 0.5, 0.75]);
  const w = clean(b + pick(rng, [-1, 1]) * randInt(rng, 1, 4) / 100);
  return {
    prompt: 'About what decimal is the arrow pointing to?',
    visual: { type: 'numberline', min: 0, max: 1, ticks: 0.25, labels: marks, labelFormat: 'decimal', arrow: w },
    hint: `The arrow is very close to ${lab(b)}. Is it a little before (less) or a little after (more)? Pick the choice close to ${lab(b)} on that side.`,
    explain: `The arrow is just ${w < b ? 'before' : 'after'} ${lab(b)}, so it points to about ${dec(w, 2)}.`,
    ...mcP(rng, dec(w, 2), [dec(clean(w + 0.25), 2), dec(clean(w - 0.25), 2), dec(clean(1 - w), 2), dec(clean(w / 10), 3)].filter((x) => Number(x) > 0 && Number(x) < 1 && x !== dec(w, 2)), [], String),
  };
};

const fdCompareDec = (rng, t) => {
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    // tenths vs hundredths trap: 0.6 vs 0.45
    const a = randInt(rng, 2, 9), b2 = randInt(rng, 11, 99);
    const A = a / 10, B = b2 / 100;
    if (Math.abs(A - B) < 0.001) return fdCompareDec(rng, t);
    const greater = chance(rng, 0.6);
    const ans = (greater ? A > B : A < B) ? dec(A, 1) : dec(B, 2);
    return {
      prompt: `Which is ${greater ? 'greater' : 'less'}: ${dec(A, 1)} or ${dec(B, 2)}?`,
      visual: t <= 4 ? { type: 'hundredgrid', shaded: Math.round(A * 100) } : undefined,
      hint: `Which is ${greater ? 'greater' : 'less'}? Write both with two decimal places so they are easy to compare: ${dec(A, 2)} and ${dec(B, 2)}. Then compare the hundredths like whole numbers.`,
      explain: `${dec(A, 1)} = ${dec(A, 2)}. ${dec(A, 2)} ${A > B ? '>' : '<'} ${dec(B, 2)}, so ${ans} is ${greater ? 'greater' : 'less'}.`,
      ...fixedChoices([dec(A, 1), dec(B, 2)], ans),
    };
  }
  if (k === 1) {
    const a = randInt(rng, 1, 9);
    const w = t >= 5 ? randInt(rng, 0, 9) : 0;
    const x = clean(w + a / 10);
    const other = pick(rng, [clean(w + a / 10), clean(w + a / 100), clean(w + (a * 10 + randInt(rng, 1, 9)) / 100)]);
    const sym = x < other ? '<' : x > other ? '>' : '=';
    const right = other === x ? dec(other, 2) : dec(other, 2);
    return {
      prompt: `Which symbol makes this true? ${dec(x, 1)} □ ${right}`,
      speak: `Which symbol makes this true? ${dec(x, 1)}, blank, ${right}.`,
      hint: `< means less than, > means greater than, = means the same. Line up the decimal points and add a zero so ${dec(x, 1)} also has hundredths. Then compare tenths, then hundredths.`,
      explain: `${dec(x, 1)} = ${dec(x, 2)}. Comparing ${dec(x, 2)} and ${right}: ${dec(x, 1)} ${sym} ${right}.`,
      ...fixedChoices(['<', '=', '>'], sym),
    };
  }
  const vals = [...new Set([randInt(rng, 1, 9) / 10, randInt(rng, 11, 99) / 100, randInt(rng, 11, 99) / 100, randInt(rng, 1, 9) / 100].map((x) => clean(x + (t >= 5 ? randInt(rng, 0, 2) : 0))))].slice(0, 3);
  if (vals.length < 3) return fdCompareDec(rng, t);
  const asc = chance(rng, 0.5);
  const sorted = vals.slice().sort((a, b) => (asc ? a - b : b - a));
  const fmt = (arr) => arr.map((x) => decN(x)).join(', ');
  const strOrder = vals.slice().sort((a, b) => (asc ? 1 : -1) * (Number(String(a).split('.')[1] || 0) - Number(String(b).split('.')[1] || 0)));
  return {
    prompt: `Order from ${asc ? 'least to greatest' : 'greatest to least'}: ${vals.map(decN).join(', ')}`,
    hint: 'Give every number two decimal places by adding zeros, then compare them like whole numbers of hundredths. Careful: more digits does not mean bigger!',
    explain: `With two places: ${vals.map((x) => dec(x, 2)).join(', ')}. Order: ${fmt(sorted)}.`,
    ...mcP(rng, sorted, [sorted.slice().reverse(), strOrder, [sorted[1], sorted[0], sorted[2]], [sorted[0], sorted[2], sorted[1]]], [], fmt),
  };
};

const fdEstimate = (rng, t) => {
  const bench = pick(rng, [['about [[f:1/4]]', 25], ['about [[f:1/2]]', 50], ['about [[f:3/4]]', 75], ['almost none', 4], ['almost all', 96], ['about [[f:1/3]]', 33]]);
  const shaded = Math.max(1, Math.min(99, bench[1] + randInt(rng, -3, 3)));
  const opts = ['almost none', 'about [[f:1/4]]', 'about [[f:1/3]]', 'about [[f:1/2]]', 'about [[f:3/4]]', 'almost all'];
  const i = opts.indexOf(bench[0]);
  return {
    prompt: 'About what fraction of the grid is shaded?',
    visual: { type: 'hundredgrid', shaded },
    hint: 'About how much of the grid is shaded? Picture the grid folded in half, then in half again. Match it to a choice: almost none, about [[f:1/4]], about [[f:1/3]], about [[f:1/2]], about [[f:3/4]] or almost all.',
    explain: `${shaded} of 100 squares are shaded. That is ${bench[0]} of the grid.`,
    ...mcP(rng, bench[0], [opts[i - 1], opts[i + 1], opts[i - 2], opts[i + 2]].filter(Boolean), [], String),
  };
};

const fdWholes = (rng, t) => {
  const [p, q] = nm2(rng);
  const [n, d] = pick(rng, [[1, 2], [1, 4], [3, 4], [1, 3], [2, 3]]);
  const food = pick(rng, ['pizza', 'cake', 'pan of brownies', 'watermelon', 'pie']);
  return {
    prompt: `${p} eats ${frac(n, d)} of a small ${food}. ${q} eats ${frac(n, d)} of a large ${food}. Did they eat the same amount?`,
    visual: { type: 'shapes', items: [{ shape: 'circle', size: 's', color: 'orange', label: p }, { shape: 'circle', size: 'l', color: 'orange', label: q }] },
    hint: `Both ate ${frac(n, d)}, but of different-sized ${food}s. A fraction is a part of its own whole: is ${frac(n, d)} of a big ${food} the same amount as ${frac(n, d)} of a small one? Test each choice with that idea.`,
    explain: `The wholes are different sizes, so ${frac(n, d)} of the large ${food} is more than ${frac(n, d)} of the small one. ${q} ate more.`,
    ...mcP(rng, `No. ${q} ate more because the whole was bigger.`, [`Yes. They both ate ${frac(n, d)}.`, `No. ${p} ate more because the pieces were smaller.`, 'Yes. Fractions are always the same amount.'], [], String),
  };
};

const fdPreview = (rng, t, opts = {}) => {
  // Fraction vs decimal (tenths/hundredths) is Grade 4; mixed numbers are a Grade 5 preview, challenge mode only.
  if (!opts.challenge || chance(rng, 0.5)) {
    const [n, d] = pick(rng, [[1, 2], [1, 4], [3, 4], [2, 5], [3, 5], [7, 10], [1, 10]]);
    const x = n / d;
    const other = clean(pick(rng, [x + 0.05, x - 0.05, x + 0.1, x - 0.1, x + 0.15].filter((v) => v > 0 && v < 1)));
    const greater = x > other ? frac(n, d) : dec(other, 2);
    return {
      prompt: `Big challenge! Which is greater: ${frac(n, d)} or ${dec(other, 2)}?`,
      hint: `Which is greater: ${frac(n, d)} or ${dec(other, 2)}? Change ${frac(n, d)} into hundredths first: how many hundredths is it? Then compare two decimals.`,
      explain: `${frac(n, d)} = ${dec(x, 2)}. ${dec(x, 2)} ${x > other ? '>' : '<'} ${dec(other, 2)}, so ${greater} is greater.`,
      ...fixedChoices([frac(n, d), dec(other, 2)], greater),
    };
  }
  const d = pick(rng, [2, 3, 4, 5]), w = randInt(rng, 1, 2), n = randInt(rng, 1, d - 1);
  return {
    prompt: `Big challenge! How many ${pl(d)} are in ${`[[f:${w} ${n}/${d}]]`}?`,
    speak: `Big challenge! How many ${pl(d)} are in ${numWords(w)} and ${fracWords(n, d)}?`,
    visual: { type: 'fractionbar', bars: [...Array(w).fill({ parts: d, shaded: d, color: 'green' }), { parts: d, shaded: n, color: 'green' }] },
    kind: 'num',
    hint: `Each whole has ${d} ${pl(d)}. Count the ${pl(d)} in ${w === 1 ? 'the whole' : `the ${w} wholes`}, then add the ${n} extra ${n === 1 ? pl(d).replace(/s$/, '') : pl(d)}.`,
    explain: `${w} whole${w > 1 ? 's' : ''} = ${w * d} ${pl(d)}, plus ${n} more = ${w * d + n} ${pl(d)}: ${frac(w * d + n, d)}.`,
    answer: num(w * d + n),
  };
};

const g4FracDec = {
  id: 'g4-qpv-fracdec', grade: 4, strand: 'number', bigIdea: 'qpv', species: 'fractling',
  name: 'Fractions & Decimals',
  parentDesc: 'Estimates and compares fractions using benchmarks 0, 1/2 and 1, finds equivalent fractions, breaks fractions into unit fractions, reads and writes decimals to hundredths, relates fractions and decimals (5/10 = 0.50), uses benchmarks 0.25/0.5/0.75 and compares decimals.',
  classic: false,
  gen: tiered([
    [1, 2, fdName, 1.5], [1, 3, fdGrid, 2], [1, 3, fdEstimate], [2, 5, fdReadWrite, 1.5], [3, 5, fdFracDec, 1.5], [2, 4, fdUnit],
    [3, 7, fdCompare, 2], [3, 7, fdEquiv, 1.5], [4, 7, fdDecBench, 1.2], [4, 7, fdCompareDec, 1.5], [5, 7, fdWholes, 0.7], [7, 7, fdPreview, 0.6],
  ]),
};

// ---------------------------------------------------------------------------
// SD3 Count and sequence within 10 000; unit fractions past 1; tenths and hundredths
// ---------------------------------------------------------------------------
const c4Skip = (rng, t) => {
  const steps = t <= 2 ? [100, 1000, 10] : t <= 4 ? [25, 50, 100, 250, 500, 1000] : [25, 50, 250, 500, 100, 10];
  const step = pick(rng, steps);
  const back = chance(rng, t >= 3 ? 0.5 : 0.3);
  const len = 5;
  const maxStart = 10000 - step * (len + 1);
  let start = randInt(rng, 0, maxStart);
  if (step >= 25 && (t <= 3 || step >= 250)) start = Math.floor(start / step) * step;
  else if (step === 25 || step === 50) start = Math.floor(start / 5) * 5;
  let seq = Array.from({ length: len }, (_, i) => start + i * step);
  if (back) seq = seq.reverse();
  const hole = t <= 2 ? len - 1 : randInt(rng, 1, len - 1);
  const ans = seq[hole];
  const prev = seq[hole - 1];
  const dir = back ? -1 : 1;
  const q = {
    prompt: `Count ${back ? 'back ' : ''}by ${fmtNum(step)}s. What number is missing?`,
    visual: t <= 2 ? { type: 'numberline', min: Math.min(...seq), max: Math.max(...seq), ticks: step, labels: seq.filter((x) => x !== ans), blankAt: ans } : { type: 'pattern', items: seq.map((x, i) => (i === hole ? '?' : fmtNum(x))) },
    hint: `What number fills the gap? Counting ${back ? 'back ' : ''}by ${fmtNum(step)}s means each jump ${back ? 'takes away' : 'adds'} ${fmtNum(step)}. Start at ${fmtNum(prev)}, the number just before the gap, and ${back ? 'count back' : 'count on'} one jump. Watch the digits when you cross a hundred or a thousand.`,
    explain: `${fmtNum(prev)} ${back ? '−' : '+'} ${fmtNum(step)} = ${fmtNum(ans)}. The count is ${seq.map(fmtNum).join(', ')}.`,
  };
  if (t >= 3 && chance(rng, 0.45)) return { ...q, kind: 'num', answer: num(ans) };
  return { ...q, ...mcN(rng, ans, [prev + dir * (step >= 1000 ? 100 : step >= 100 ? 10 : 1), prev - dir * step, ans + dir * step, ans + dir * 10, ans + 1000, ans - 1000].filter((x) => x >= 0 && x !== ans), { step: step >= 100 ? 100 : 10 }) };
};

const c4Order = (rng, t) => {
  const base = randInt(rng, 1, 8) * 1000;
  const d = sample(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
  let nums = t <= 2 ? [randInt(rng, 1000, 9999), randInt(rng, 1000, 9999), randInt(rng, 1000, 9999)]
    : [base + d[0] * 100 + d[1] * 10 + d[2], base + d[1] * 100 + d[0] * 10 + d[2], base + 1000 + d[2], base + d[0] * 100 + d[2] * 10 + d[1]].slice(0, t >= 5 ? 4 : 3);
  nums = [...new Set(nums)].filter((x) => x <= 9999);
  if (nums.length < 3) nums = [base + 101, base + 110, base + 1011].filter((x) => x <= 9999).concat([base + 11]);
  const asc = chance(rng, 0.5);
  const sorted = nums.slice().sort((a, b) => (asc ? a - b : b - a));
  const fmt = (arr) => arr.map(fmtNum).join(', ');
  if (t >= 3 && chance(rng, 0.35)) {
    const n = randInt(rng, 1000, 9899);
    const k = pick(rng, [1, 10, 100]);
    const after = chance(rng, 0.5);
    const ans = after ? n + k : n - k;
    return {
      kind: 'num',
      prompt: `What number is ${fmtNum(k)} ${after ? 'more' : 'less'} than ${fmtNum(n)}?`,
      hint: `What is ${fmtNum(k)} ${after ? 'more' : 'less'} than ${fmtNum(n)}? Only the ${k === 1 ? 'ones' : k === 10 ? 'tens' : 'hundreds'} digit should change by one, unless it has to cross into the next place (a 9 going up, or a 0 going down).`,
      explain: `${fmtNum(n)} ${after ? '+' : '−'} ${k} = ${fmtNum(ans)}.`,
      answer: num(ans),
    };
  }
  return {
    prompt: `Which list is in order from ${asc ? 'least to greatest' : 'greatest to least'}?`,
    hint: `Which list goes from ${asc ? 'least to greatest' : 'greatest to least'}? Compare the thousands digits first, then hundreds, tens and ones. Check each list: does every number get ${asc ? 'bigger' : 'smaller'} than the one before?`,
    explain: `From ${asc ? 'least to greatest' : 'greatest to least'}: ${fmt(sorted)}.`,
    ...mcP(rng, sorted, [sorted.slice().reverse(), [sorted[1], sorted[0], ...sorted.slice(2)], [sorted[0], ...sorted.slice(2), sorted[1]], shuffle(rng, nums)], [], fmt),
  };
};

const c4NumberLine = (rng, t) => {
  const lo = randInt(rng, 1, 8) * 1000;
  const k = randInt(rng, 1, 9);
  const v = lo + k * 100;
  return {
    prompt: 'What number is the arrow pointing to?',
    visual: { type: 'numberline', min: lo, max: lo + 1000, ticks: 100, labels: 'ends', arrow: v },
    hint: `What number is at the arrow? The line goes from ${fmtNum(lo)} to ${fmtNum(lo + 1000)} in 10 equal jumps, so each tick is one hundred. Count the ticks from ${fmtNum(lo)} to the arrow.`,
    explain: `Each tick is 100. The arrow is ${k} ticks after ${fmtNum(lo)}: ${fmtNum(v)}.`,
    ...mcN(rng, v, [lo + k * 10, lo + k, lo + (10 - k) * 100, v + 100, v - 100].filter((x) => x !== v), { step: 100 }),
  };
};

const c4Tenths = (rng, t) => {
  const hund = t >= 3 && chance(rng, 0.5);
  const step = hund ? 0.01 : 0.1;
  const p = hund ? 2 : 1;
  const w = t >= 4 ? randInt(rng, 0, 5) : 0;
  const back = t >= 4 && chance(rng, 0.4);
  // make it cross a tenth (hundredths) or a whole (tenths) sometimes
  const endUnits = hund ? randInt(rng, 4, 99) : randInt(rng, 4, 13);
  const unitsSeq = Array.from({ length: 4 }, (_, i) => endUnits - 3 + i);
  let seq = unitsSeq.map((x) => clean(w + x * step));
  if (back) seq = seq.reverse();
  const ans = seq[3];
  const known = seq.slice(0, 3);
  const f = (x) => dec(x, p);
  const q = {
    prompt: `Count ${back ? 'back ' : ''}by ${hund ? 'hundredths' : 'tenths'}: ${known.map(f).join(', ')}, □`,
    visual: t <= 4 ? { type: 'numberline', min: clean(Math.min(...seq) - step), max: clean(Math.max(...seq) + step), ticks: step, labels: known, labelFormat: 'decimal', blankAt: ans } : undefined,
    hint: back ? (hund ? 'What comes next counting back by hundredths? Each step takes away one hundredth, so the hundredths digit goes down by one. When it is already 0, take one tenth apart into ten hundredths.' : 'What comes next counting back by tenths? Each step takes away one tenth, so the tenths digit goes down by one. When it is already 0, go back past the whole number.') : (hund ? 'What comes next counting by hundredths? Each step adds one hundredth, so the hundredths digit goes up by one. After nine hundredths comes the next tenth.' : 'What comes next counting by tenths? Each step adds one tenth, so the tenths digit goes up by one. After nine tenths comes the next whole number.'),
    explain: `${f(known[2])} ${back ? '−' : '+'} ${hund ? '0.01' : '0.1'} = ${f(ans)}.`,
  };
  if (keypadSafe(ans, p) && chance(rng, 0.4)) return { ...q, kind: 'num', answer: decN(ans) };
  const d = back ? -1 : 1;
  const prev = known[2];
  const units = Math.round(prev * 10 ** p);
  const naive = `${Math.floor(units / 10 ** p)}.${(units % 10 ** p) + d}`;
  const wrong = [naive, f(clean(prev + d * step * 10)), f(clean(ans + d * step)), dec(clean(prev + d * step / 10), p + 1)];
  return { ...q, ...mcP(rng, f(ans), wrong.filter((x) => x && !x.includes('-') && x !== f(ans)), [], String) };
};

const c4Hundredths = (rng, t) => {
  const lo = clean(randInt(rng, 0, t >= 5 ? 29 : 9) / 10);
  const k = randInt(rng, 1, 9);
  const v = clean(lo + k / 100);
  return {
    prompt: 'What decimal is the arrow pointing to?',
    visual: { type: 'numberline', min: lo, max: clean(lo + 0.1), ticks: 0.01, labels: 'ends', labelFormat: 'decimal', arrow: v },
    hint: `What decimal is at the arrow? Between ${dec(lo, 1)} and ${dec(lo + 0.1, 1)} there are 10 small jumps, so each jump is one hundredth. Count the jumps from ${dec(lo, 1)} to the arrow.`,
    explain: `Each tick is 0.01. The arrow is ${u(k, 'tick')} after ${dec(lo, 2)}: ${dec(v, 2)}.`,
    ...mcP(rng, dec(v, 2), [dec(clean(lo + k / 10), 2), dec(clean(lo + (10 - k) / 100), 2), dec(clean(v + 0.01), 2), dec(clean(lo + k / 1000), 3)].filter((x) => x !== dec(v, 2)), [], String),
  };
};

const c4Fractions = (rng, t) => {
  const d = pick(rng, t <= 3 ? [2, 3, 4] : [3, 4, 5, 6, 8, 10]);
  const maxW = t >= 5 ? 3 : 2;
  const k = randInt(rng, d + 1, maxW * d - 1);
  const nl = { type: 'numberline', min: 0, max: maxW, ticks: clean(1 / d), labels: Array.from({ length: maxW + 1 }, (_, i) => i) };
  if (chance(rng, 0.5)) {
    return {
      prompt: 'What fraction is the arrow pointing to?',
      visual: { ...nl, arrow: clean(k / d) },
      hint: `What fraction is at the arrow? Each whole is cut into ${d} equal jumps, so each jump is ${fracWords(1, d)}. Count the jumps from 0 to the arrow: that is the top number, and ${d} is the bottom number.`,
      explain: `The arrow is ${u(k, 'jump')} of ${frac(1, d)} from 0: ${frac(k, d)}${k % d ? ` (${u(Math.floor(k / d), 'whole')} and ${k % d} more)` : ''}.`,
      ...mcP(rng, frac(k, d), [frac(k + 1, d), frac(k - 1, d), frac(k, d + 1), frac(k % d || 1, d)].filter((x) => x !== frac(k, d)), [], String),
    };
  }
  const back = t >= 4 && chance(rng, 0.4);
  const kc = back ? k : Math.max(k, 4); // forward counts need 3 earlier terms that are at least 1 (no 0/d or repeats)
  const seq = back ? [kc + 3, kc + 2, kc + 1, kc] : [kc - 3, kc - 2, kc - 1, kc];
  const top = Math.max(maxW, Math.ceil(Math.max(...seq) / d));
  return {
    prompt: `Count ${back ? 'back ' : ''}by ${pl(d)}: ${seq.slice(0, 3).map((x) => frac(x, d)).join(', ')}, □`,
    speak: `Count ${back ? 'back ' : ''}by ${pl(d)}: ${seq.slice(0, 3).map((x) => fracWords(x, d)).join(', ')}, what comes next?`,
    visual: t <= 4 ? { ...nl, max: top, labels: Array.from({ length: top + 1 }, (_, i) => i), blankAt: clean(kc / d) } : undefined,
    hint: `Counting ${back ? 'back ' : ''}by ${pl(d)}, each step ${back ? 'takes away' : 'adds'} ${fracWords(1, d)}: the top number goes ${back ? 'down' : 'up'} by 1 and the bottom number stays ${d}. What comes right after ${frac(seq[2], d)}?`,
    explain: `${frac(seq[2], d)} ${back ? '−' : '+'} ${frac(1, d)} = ${frac(kc, d)}.`,
    ...mcP(rng, frac(kc, d), [frac(kc, d + 1), frac(back ? kc - 1 : kc + 1, d), frac(seq[2], d + 1), frac(1, d)].filter((x) => x !== frac(kc, d)), [], String),
  };
};

const c4Preview = (rng, t, opts = {}) => {
  // Counting to 10 000 is Grade 4; naming mixed numbers is a Grade 5 preview, challenge mode only.
  if (!opts.challenge || chance(rng, 0.5)) {
    // Counting up to 10 000 (or back down from it) stays inside the Grade 4 range.
    const step = pick(rng, [1000, 100, 500, 250, 25, 10]);
    const back = chance(rng, 0.4);
    const seq = [0, 1, 2, 3].map((i) => 10000 - (back ? i : 3 - i) * step);
    return {
      kind: 'num',
      prompt: `Big challenge! Count ${back ? 'back ' : ''}by ${fmtNum(step)}s: ${seq.slice(0, 3).map(fmtNum).join(', ')}, □`,
      hint: back ? `What comes after ${fmtNum(seq[2])}? Take away ${fmtNum(step)}. Watch the digits change when you cross a thousand or a hundred.` : `What comes after ${fmtNum(seq[2])}? Add ${fmtNum(step)}. When the thousands are full, the next number is ten thousand.`,
      explain: `${fmtNum(seq[2])} ${back ? '−' : '+'} ${fmtNum(step)} = ${fmtNum(seq[3])}.`,
      answer: num(seq[3]),
    };
  }
  const d = pick(rng, [2, 3, 4]);
  const w = randInt(rng, 1, 2), n = randInt(rng, 1, d - 1);
  const good = `[[f:${w} ${n}/${d}]]`;
  return {
    prompt: `Big challenge! The arrow points to ${frac(w * d + n, d)}. Which mixed number is that?`,
    visual: { type: 'numberline', min: 0, max: 3, ticks: clean(1 / d), labels: [0, 1, 2, 3], arrow: clean(w + n / d) },
    hint: `Every ${d} ${pl(d)} make 1 whole. How many wholes can you make from ${w * d + n} ${pl(d)}, and how many ${pl(d)} are left over?`,
    explain: `${frac(w * d + n, d)} = ${w} whole${w > 1 ? 's' : ''} (${w * d} ${pl(d)}) and ${frac(n, d)} more: ${good}.`,
    ...mcP(rng, good, [`[[f:${w + 1} ${n}/${d}]]`, `[[f:${w} ${d - n}/${d}]]`, `[[f:${n} ${w}/${d}]]`].filter((x) => x !== good), [], String),
  };
};

const g4Count = {
  id: 'g4-qpv-count', grade: 4, strand: 'number', bigIdea: 'qpv', species: 'counter',
  name: 'Counting to 10 000',
  parentDesc: 'Counts and orders numbers within 10 000, counts unit fractions past 1, and counts by tenths and hundredths.',
  classic: false,
  gen: tiered([
    [1, 5, c4Skip, 2.5], [1, 7, c4Order, 1.5], [2, 4, c4NumberLine], [2, 6, c4Tenths, 2], [4, 7, c4Hundredths, 1.2], [2, 6, c4Fractions, 1.5], [7, 7, c4Preview, 0.8],
    [6, 7, c4Tenths, 1], [6, 7, c4Fractions, 1],
  ]),
};

// ---------------------------------------------------------------------------
// SD4 Addition and subtraction within 10 000, including decimals to tenths
// ---------------------------------------------------------------------------
function pair4(rng, t, sub) {
  let a, b, g = 0;
  do {
    if (t === 1) { a = randInt(rng, 110, 700); b = randInt(rng, 101, 299); }
    else if (t === 2) { a = randInt(rng, 150, 899); b = randInt(rng, 105, 899); }
    else if (t === 3) { a = randInt(rng, 1050, 6999); b = randInt(rng, 120, 2999); }
    else { a = randInt(rng, 1200, 8999); b = randInt(rng, 1005, 8999); }
    if (sub && b > a) [a, b] = [b, a];
    g++;
  } while (g < 60 && ((!sub && a + b > 9999) || (t === 1 && (sub ? hasBorrow(a, b) : hasCarry(a, b))) || (t >= 2 && !(sub ? hasBorrow(a, b) : hasCarry(a, b))) || a === b));
  return [a, b];
}

const as4Whole = (rng, t) => {
  const sub = chance(rng, 0.5);
  let [a, b] = pair4(rng, t, sub);
  if (sub && t >= 5 && chance(rng, 0.5)) { a = randInt(rng, 2, 9) * 1000 + pick(rng, [0, 0, randInt(rng, 1, 9) * 100]); b = randInt(rng, 1001, a - 11); }
  const ans = sub ? a - b : a + b;
  const vis = t === 1 ? (sub ? { type: 'barmodel', whole: a, parts: [b, '?'] } : { type: 'barmodel', whole: '?', parts: [a, b] }) : undefined;
  const q = {
    prompt: `What is ${fmtNum(a)} ${sub ? '−' : '+'} ${fmtNum(b)}?`,
    visual: vis,
    hint: sub ? `What is ${fmtNum(a)} − ${fmtNum(b)}? Line up the places and work from the ones to the thousands. If a top digit is too small, regroup one from the next place. Or count up from ${fmtNum(b)} to ${fmtNum(a)}.` : `What is ${fmtNum(a)} + ${fmtNum(b)}? Line up the places. Add the ones, tens, hundreds, then thousands, regrouping when a place makes 10 or more.`,
    explain: `${fmtNum(a)} ${sub ? '−' : '+'} ${fmtNum(b)} = ${fmtNum(ans)}.${sub ? ` Check: ${fmtNum(ans)} + ${fmtNum(b)} = ${fmtNum(a)}.` : ''}`,
  };
  if (chance(rng, 0.55)) return { ...q, kind: 'num', answer: num(ans) };
  return { ...q, ...mcN(rng, ans, [sub ? subSmallFromBig(a, b) : addNoCarry(a, b), ans + 100, ans - 100, ans + 1000, ans + 10, sub ? a + b : Math.abs(a - b)].filter((x) => x <= 19999), { step: 100 }) };
};

const as4Decimal = (rng, t) => {
  const sub = chance(rng, 0.45);
  let a, b;
  if (t <= 2) { a = randInt(rng, 1, 8); b = randInt(rng, 1, 9 - a); if (sub) { const s = a + b; b = a; a = s; } a /= 10; b /= 10; }
  else if (t === 3) { a = randInt(rng, 11, 79) / 10; b = randInt(rng, 11, 49) / 10; if (sub && b > a) [a, b] = [b, a]; }
  else { a = randInt(rng, 25, 199) / 10; b = randInt(rng, 12, 99) / 10; if (sub && b > a) [a, b] = [b, a]; }
  a = clean(a); b = clean(b);
  if (sub && a === b) b = clean(b - 0.1) || 0.1;
  const ans = clean(sub ? a - b : a + b);
  const f = (x) => dec(x, 1);
  const vis = t <= 2 ? { type: 'hundredgrid', shaded: Math.round((sub ? a : a) * 100), tenthsOnly: true } : undefined;
  const q = {
    prompt: `What is ${f(a)} ${sub ? '−' : '+'} ${f(b)}?`,
    visual: vis,
    hint: `What is ${f(a)} ${sub ? '−' : '+'} ${f(b)}? Line up the decimal points and ${sub ? 'subtract' : 'add'} the tenths first, then the ones (10 tenths make 1 whole). You can also think of them as ${Math.round(a * 10)} tenths and ${Math.round(b * 10)} tenths.`,
    explain: `${f(a)} ${sub ? '−' : '+'} ${f(b)} = ${f(ans)}. (In tenths: ${Math.round(a * 10)} ${sub ? '−' : '+'} ${Math.round(b * 10)} = ${Math.round(ans * 10)} tenths.)`,
  };
  if (keypadSafe(ans, 1) && chance(rng, 0.45)) return { ...q, kind: 'num', answer: decN(ans) };
  const noCarry = sub ? clean(Math.abs(Math.floor(a) - Math.floor(b)) + Math.abs(Math.round((a % 1) * 10) - Math.round((b % 1) * 10)) / 10) : clean(Math.floor(a) + Math.floor(b) + ((Math.round((a % 1) * 10) + Math.round((b % 1) * 10)) % 10) / 10);
  return { ...q, ...mcP(rng, f(ans), [f(noCarry), f(clean(ans + 1)), f(clean(ans + 0.1)), f(clean(ans - 0.1)), dec(ans / 10, 2)].filter((x) => x !== f(ans) && !x.startsWith('-')), [], String) };
};

const DEC_WORD = [
  (p, a, b) => [`${p} ran ${a} km on Saturday and ${b} km on Sunday. How far did ${p} run in all?`, 'km', false],
  (p, a, b) => [`A pumpkin has a mass of ${a} kg. A squash has a mass of ${b} kg. What is their total mass?`, 'kg', false],
  (p, a, b) => [`A ribbon is ${a} m long. ${p} cuts off ${b} m. How much is left?`, 'm', true],
  (p, a, b) => [`${p}'s plant was ${a} cm tall. Now it is ${b} cm taller. How tall is it now?`, 'cm', false],
  (p, a, b) => [`A trail is ${a} km long. ${p} has walked ${b} km. How far is left?`, 'km', true],
  (p, a, b) => [`A dragon egg has a mass of ${a} kg. A goose egg has a mass of ${b} kg. How much heavier is the dragon egg?`, 'kg', true],
];
const as4DecWord = (rng, t) => {
  const p = nm(rng);
  const tpl = pick(rng, DEC_WORD);
  const sub = tpl('', '', '')[2];
  const a = clean(randInt(rng, 31, 159) / 10);
  const b = clean(randInt(rng, 11, sub ? Math.round(a * 10) - 5 : 99) / 10);
  const [prompt, unit] = tpl(p, dec(a, 1), dec(b, 1));
  const ans = clean(sub ? a - b : a + b);
  const q = { prompt, hint: sub ? `What is the question asking? You start with ${dec(a, 1)} ${unit}, and ${dec(b, 1)} ${unit} is taken away or compared. Subtract with the decimal points lined up: tenths first, then ones.` : `What is the question asking? Two amounts, ${dec(a, 1)} ${unit} and ${dec(b, 1)} ${unit}, are put together. Add with the decimal points lined up: tenths first, then ones.`, explain: `${dec(a, 1)} ${sub ? '−' : '+'} ${dec(b, 1)} = ${dec(ans, 1)} ${unit}.` };
  if (keypadSafe(ans, 1) && chance(rng, 0.5)) return { ...q, kind: 'num', answer: decN(ans) };
  return { ...q, ...mcP(rng, `${dec(ans, 1)} ${unit}`, [clean(ans + 1), clean(ans - 1), clean(ans + 0.1), sub ? clean(a + b) : clean(Math.abs(a - b))].filter((x) => x > 0 && x !== ans).map((x) => `${dec(x, 1)} ${unit}`), [], String) };
};

const as4Estimate = (rng, t) => {
  const sub = chance(rng, 0.4);
  if (t >= 4 && chance(rng, 0.3)) {
    // Estimating with decimals to tenths (NB Grade 4 add/sub indicator): round each to the nearest whole number.
    let A, B;
    do { A = randInt(rng, 21, 98); B = randInt(rng, 11, 69); if (sub && B > A) [A, B] = [B, A]; }
    while (A % 10 === 5 || B % 10 === 5 || A === B || (sub && Math.round(A / 10) === Math.round(B / 10)));
    const [x, y] = [A / 10, B / 10], rx = Math.round(x), ry = Math.round(y);
    const e = sub ? rx - ry : rx + ry;
    return {
      prompt: `Estimate: about how much is ${dec(x, 1)} ${sub ? '−' : '+'} ${dec(y, 1)}?`,
      hint: `About how much is it? Round each decimal to the nearest whole number: look at the tenths digit (5 or more rounds up). Then ${sub ? 'subtract' : 'add'} the whole numbers.`,
      explain: `${dec(x, 1)} is about ${rx} and ${dec(y, 1)} is about ${ry}. ${rx} ${sub ? '−' : '+'} ${ry} = ${e}. (Exact: ${dec(clean(sub ? x - y : x + y), 1)}.)`,
      ...mcP(rng, `about ${e}`, [e + 1, e - 1, e + 2, e * 10].filter((v) => v > 0 && v !== e).map((v) => `about ${v}`), [], String),
    };
  }
  let a, b;
  do { a = randInt(rng, 1100, 8900); b = randInt(rng, 1100, 6900); if (sub && b > a) [a, b] = [b, a]; }
  while (Math.abs((a % 1000) - 500) < 80 || Math.abs((b % 1000) - 500) < 80 || (!sub && a + b > 9999) || Math.round(a / 1000) === Math.round(b / 1000));
  const R = (x) => Math.round(x / 1000) * 1000;
  const est = sub ? R(a) - R(b) : R(a) + R(b);
  const exact = sub ? a - b : a + b;
  if (t >= 5 && chance(rng, 0.5)) {
    const p = nm(rng);
    let wrong = sub ? subSmallFromBig(a, b) : addNoCarry(a, b);
    if (Math.abs(wrong - exact) < 2000) wrong = exact + 3000 > 9999 || (exact > 3000 && chance(rng, 0.5)) ? exact - 3000 : exact + 3000;
    const claimed = chance(rng, 0.5) ? exact : wrong;
    const ok = claimed === exact;
    return {
      prompt: `${p} says ${fmtNum(a)} ${sub ? '−' : '+'} ${fmtNum(b)} = ${fmtNum(claimed)}. Is that reasonable?`,
      hint: `Is ${p}'s answer believable? Round each number to the nearest thousand and ${sub ? 'subtract' : 'add'}. "Yes" means ${p}'s answer is close to your estimate; "No" means it is far from it.`,
      explain: `Estimate: ${fmtNum(R(a))} ${sub ? '−' : '+'} ${fmtNum(R(b))} = ${fmtNum(est)}. ${fmtNum(claimed)} is ${ok ? 'close to' : 'far from'} that, so it is ${ok ? '' : 'not '}reasonable. (Exact: ${fmtNum(exact)}.)`,
      ...mcP(rng, ok ? `Yes, it is close to ${fmtNum(est)}` : `No, it should be about ${fmtNum(est)}`, ok ? [`No, it should be about ${fmtNum(est + 1000)}`, `No, it should be about ${fmtNum(Math.max(1000, est - 1000))}`] : [`Yes, it is close to ${fmtNum(est)}`, `No, it should be about ${fmtNum(est + 2000)}`], [], String),
    };
  }
  return {
    prompt: `Estimate: about how much is ${fmtNum(a)} ${sub ? '−' : '+'} ${fmtNum(b)}?`,
    hint: `About how much is it? Round ${fmtNum(a)} and ${fmtNum(b)} to the nearest thousand (the hundreds digit tells you which way), then ${sub ? 'subtract' : 'add'} the rounded numbers.`,
    explain: `${fmtNum(a)} ≈ ${fmtNum(R(a))} and ${fmtNum(b)} ≈ ${fmtNum(R(b))}. ${fmtNum(R(a))} ${sub ? '−' : '+'} ${fmtNum(R(b))} = ${fmtNum(est)}.`,
    ...mcP(rng, est, [est + 1000, est - 1000, est + 2000, est + 100].filter((x) => x > 0), [], fmtNum),
  };
};

const W4_ADD = [
  (p, a, b) => `A library had ${a} books. It got ${b} more. How many books does it have now?`,
  (p, a, b) => `${p}'s school collected ${a} cans in March and ${b} cans in April. How many cans in all?`,
  (p, a, b) => `A hockey arena sold ${a} tickets on Friday and ${b} on Saturday. How many tickets were sold?`,
  (p, a, b) => `A dragon flew ${a} m, rested, then flew ${b} m more. How far did it fly?`,
  (p, a, b) => `There are ${a} red tulips and ${b} yellow tulips in the park. How many tulips in all?`,
];
const W4_SUB = [
  (p, a, b) => `A wizard had ${a} gems. She used ${b} in potions. How many gems are left?`,
  (p, a, b) => `A town has ${a} people. A village has ${b} people. How many more people live in the town?`,
  (p, a, b) => `${p}'s class wants to read ${a} pages. They have read ${b}. How many pages are left?`,
  (p, a, b) => `A plane was flying at ${a} m. It went down ${b} m. How high is it now?`,
  (p, a, b) => `A farm grew ${a} potatoes and sold ${b}. How many potatoes are left?`,
];
const as4Word = (rng, t) => {
  const p = nm(rng);
  const sub = chance(rng, 0.5);
  const [a, b] = pair4(rng, Math.max(3, t), sub);
  const prompt = pick(rng, sub ? W4_SUB : W4_ADD)(p, fmtNum(a), fmtNum(b));
  const ans = sub ? a - b : a + b;
  const q = {
    prompt,
    visual: t <= 4 ? (sub ? { type: 'barmodel', whole: a, parts: [b, '?'] } : { type: 'barmodel', whole: '?', parts: [a, b] }) : undefined,
    hint: sub ? `What is the question asking? You know the whole, ${fmtNum(a)}, and one part, ${fmtNum(b)} (or you are comparing them). Subtract to find the other part or the difference.` : `What is the question asking? Two parts, ${fmtNum(a)} and ${fmtNum(b)}, are joined together. Add them to find the whole.`,
    explain: `${fmtNum(a)} ${sub ? '−' : '+'} ${fmtNum(b)} = ${fmtNum(ans)}.`,
  };
  if (chance(rng, 0.6)) return { ...q, kind: 'num', answer: num(ans) };
  return { ...q, ...mcN(rng, ans, [sub ? a + b : Math.abs(a - b), sub ? subSmallFromBig(a, b) : addNoCarry(a, b), ans + 100, ans - 1000].filter((x) => x <= 19999), { step: 100 }) };
};

const as4Missing = (rng, t) => {
  const total = t >= 5 ? randInt(rng, 2000, 9999) : randInt(rng, 2, 9) * 1000;
  const part = randInt(rng, 500, total - 300);
  const sym = pick(rng, ['□', '★', '▲']);
  const first = chance(rng, 0.5);
  return {
    kind: 'num',
    prompt: first ? `${sym} + ${fmtNum(part)} = ${fmtNum(total)}` : `${fmtNum(total)} − ${sym} = ${fmtNum(part)}`,
    speak: first ? `What plus ${part} equals ${total}?` : `${total} minus what equals ${part}?`,
    visual: { type: 'barmodel', whole: total, parts: [part, '?'] },
    hint: `${sym} is a missing part. The whole is ${fmtNum(total)} and the part you know is ${fmtNum(part)}. Count up from ${fmtNum(part)} to ${fmtNum(total)}, or subtract the part from the whole.`,
    explain: `${fmtNum(total)} − ${fmtNum(part)} = ${fmtNum(total - part)}. So ${sym} = ${fmtNum(total - part)}.`,
    answer: num(total - part),
  };
};

const as4Error = (rng, t) => {
  const sub = chance(rng, 0.5);
  const [a, b] = pair4(rng, 4, sub);
  const wrong = sub ? subSmallFromBig(a, b) : addNoCarry(a, b);
  if (wrong === (sub ? a - b : a + b)) return as4Whole(rng, t);
  const p = nm(rng);
  const good = sub ? `${p} subtracted the smaller digit from the bigger one instead of regrouping.` : `${p} forgot to regroup (carry) when a place added to 10 or more.`;
  return {
    prompt: `${p} worked out ${fmtNum(a)} ${sub ? '−' : '+'} ${fmtNum(b)} and got ${fmtNum(wrong)}. What mistake did ${p} make?`,
    hint: `Work out ${fmtNum(a)} ${sub ? '−' : '+'} ${fmtNum(b)} yourself, place by place, and compare with ${p}'s answer. Where do the digits first go wrong? Then check each choice: a missed regroup, the wrong operation, or digits lined up in the wrong places.`,
    explain: `The correct answer is ${fmtNum(sub ? a - b : a + b)}. ${good}`,
    ...mcP(rng, good, [sub ? `${p} added instead of subtracting.` : `${p} subtracted instead of adding.`, `${p} lined up the numbers in the wrong places.`, `${p} made no mistake.`], [], String),
  };
};

const as4TwoStep = (rng, t, opts = {}) => {
  const [p, q] = nm2(rng);
  const k = t >= 7 ? pick(rng, opts.challenge ? [0, 1, 2, 3, 3, 4] : [0, 1, 2, 3, 3]) : randInt(rng, 0, 2); // k = 4 (hundredths) is a Grade 5 preview
  let prompt, ans, explain, hint;
  if (k === 0) {
    const a = randInt(rng, 5, 9) * 1000 + (t >= 7 ? randInt(rng, 1, 9) * 100 : 0), b = randInt(rng, 1200, 2800), c = randInt(rng, 800, 2000);
    ans = a - b - c;
    prompt = `A school needs ${fmtNum(a)} bottle caps for an art project. It collected ${fmtNum(b)} in fall and ${fmtNum(c)} in winter. How many more does it need?`;
    hint = `How far is the school from ${fmtNum(a)}? First add what it has collected: ${fmtNum(b)} + ${fmtNum(c)}. Then find how many more it takes to reach ${fmtNum(a)}.`;
    explain = `${fmtNum(b)} + ${fmtNum(c)} = ${fmtNum(b + c)}. ${fmtNum(a)} − ${fmtNum(b + c)} = ${fmtNum(ans)}.`;
  } else if (k === 1) {
    const a = randInt(rng, 1500, 4000), diff = randInt(rng, 250, 1500);
    ans = a + a + diff;
    prompt = `${p} counted ${fmtNum(a)} steps. ${q} counted ${fmtNum(diff)} more steps than ${p}. How many steps did they count together?`;
    hint = `You need both amounts, but you only know ${p}'s. First find ${q}'s steps: ${fmtNum(a)} + ${fmtNum(diff)}. Then add ${p}'s and ${q}'s steps together.`;
    explain = `${q}: ${fmtNum(a)} + ${fmtNum(diff)} = ${fmtNum(a + diff)}. Together: ${fmtNum(a)} + ${fmtNum(a + diff)} = ${fmtNum(ans)}.`;
  } else if (k === 2) {
    const a = clean(randInt(rng, 30, 90) / 10), b = clean(randInt(rng, 11, 29) / 10), c = clean(randInt(rng, 11, 29) / 10);
    ans = clean(a + b - c);
    if (!keypadSafe(ans, 1)) return as4TwoStep(rng, t, opts);
    prompt = `A jug holds ${dec(a, 1)} L of juice. ${p} adds ${dec(b, 1)} L, then pours out ${dec(c, 1)} L. How many litres are in the jug now?`;
    hint = `The juice goes up, then down. First add ${dec(a, 1)} + ${dec(b, 1)} (line up the decimal points). Then take away the ${dec(c, 1)} L poured out.`;
    explain = `${dec(a, 1)} + ${dec(b, 1)} = ${dec(clean(a + b), 1)}. ${dec(clean(a + b), 1)} − ${dec(c, 1)} = ${dec(ans, 1)} L.`;
    return { kind: 'num', prompt, answer: decN(ans), hint, explain };
  } else if (k === 3) {
    const main = randInt(rng, 1800, 4500), bal = randInt(rng, 900, 2500), sold = randInt(rng, 1200, main + bal - 200);
    ans = main + bal - sold;
    prompt = `A concert hall has ${fmtNum(main)} seats downstairs and ${fmtNum(bal)} seats upstairs. ${fmtNum(sold)} tickets are sold. How many seats are still empty?`;
    hint = `How many seats are not taken? First find all the seats: ${fmtNum(main)} + ${fmtNum(bal)}. Then take away the ${fmtNum(sold)} seats that are sold.`;
    explain = `${fmtNum(main)} + ${fmtNum(bal)} = ${fmtNum(main + bal)}. ${fmtNum(main + bal)} − ${fmtNum(sold)} = ${fmtNum(ans)}.`;
  } else {
    const a = clean(randInt(rng, 101, 899) / 100), b = clean(randInt(rng, 101, 499) / 100);
    const s2 = clean(a + b);
    if (!keypadSafe(s2, 2)) return as4TwoStep(rng, t, opts);
    return { kind: 'num', prompt: `Big challenge! What is ${dec(a, 2)} + ${dec(b, 2)}?`, answer: decN(s2), hint: 'This is like adding tenths, with one more place. Line up the decimal points, then add the hundredths, then the tenths, then the ones, regrouping when a place makes 10.', explain: `${dec(a, 2)} + ${dec(b, 2)} = ${dec(s2, 2)}.` };
  }
  return { kind: 'num', prompt, answer: num(ans), hint, explain };
};

const g4AddSub = {
  id: 'g4-ops-addsub', grade: 4, strand: 'number', bigIdea: 'ops', species: 'addsub',
  name: 'Add & Subtract to 10 000',
  parentDesc: 'Adds and subtracts whole numbers within 10 000 and decimals to tenths using strategies or the standard algorithm, estimates, checks reasonableness, and solves problems.',
  classic: false,
  gen: tiered([
    [1, 5, as4Whole, 3], [2, 5, as4Decimal, 2], [4, 7, as4DecWord, 1.5], [3, 6, as4Estimate, 1.5], [4, 7, as4Word, 1.5], [4, 6, as4Missing], [5, 6, as4Error], [6, 7, as4TwoStep, 2],
  ]),
};

// ---------------------------------------------------------------------------
// SD5 Multiplication and division to 10 × 10: meaning, strategies, properties
// ---------------------------------------------------------------------------
const ICONS = ['🍎', '⭐', '🐞', '🧁', '🌼', '🐟', '🍪', '💎', '🥚', '🍓', '🐚', '🎈'];

const m4Visual = (rng, t) => {
  const g = randInt(rng, 2, t === 1 ? 6 : 9), e = randInt(rng, 2, t === 1 ? 6 : 10);
  const icon = pick(rng, ICONS);
  const arr = chance(rng, 0.5);
  const vis = arr ? { type: 'array', rows: g, cols: e, icon } : { type: 'groups', groups: g, each: e, icon };
  const words = arr ? `${g} rows of ${e}` : `${g} groups of ${e}`;
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    return {
      prompt: 'Which multiplication matches the picture?',
      visual: vis,
      hint: `A × sentence means equal groups: the first number is how many ${arr ? 'rows' : 'groups'}, the second is how many in each. A + sentence just joins two numbers. Count the ${arr ? 'rows' : 'groups'} and how many are in one, then find the sentence that says that.`,
      explain: `${cap(words)}: ${g} × ${e} = ${g * e}.`,
      ...mcP(rng, `${g} × ${e}`, [`${g} + ${e}`, `${g} × ${e + 1}`, `${g + 1} × ${e}`, `${g - 1} × ${e}`].filter((x) => !/^1 ×/.test(x)), [], String),
    };
  }
  if (k === 1) {
    return {
      prompt: pick(rng, ['How many in all?', 'How many are there altogether?', 'Use multiplication. How many in all?']),
      visual: vis,
      hint: `How many are there altogether? There are ${words}. Use the times fact ${g} × ${e}, or skip count by ${e}s.`,
      explain: `${cap(words)} = ${g} × ${e} = ${g * e}.`,
      ...mcN(rng, g * e, [g + e, g * e + e, g * e - e, (g + 1) * e]),
    };
  }
  const total = g * e;
  const th = pick(rng, THINGS);
  return {
    prompt: `${total} ${th[1]} are shared equally into ${g} groups. How many are in each group?`,
    visual: { type: 'groups', groups: g, each: e, icon: th[2] },
    hint: `How many are in each group? ${total} ${th[1]} are split into ${g} equal groups. Think: ${g} × □ = ${total}, or deal them out one at a time.`,
    explain: `${total} ÷ ${g} = ${e}, because ${g} × ${e} = ${total}.`,
    ...mcN(rng, e, [e + 1, e - 1, total - g, g]),
  };
};

const m4Strategy = (rng, t) => {
  const b = randInt(rng, 3, 9);
  const strats = [
    { target: [6, b], known: [5, b], how: `add one more group of ${b}`, val: (x) => x + b, kind: 'add' },
    { target: [9, b], known: [10, b], how: `take away one group of ${b}`, val: (x) => x - b, kind: 'sub' },
    { target: [4, b], known: [2, b], how: 'double it', val: (x) => 2 * x, kind: 'dbl' },
    { target: [8, b], known: [4, b], how: 'double it', val: (x) => 2 * x, kind: 'dbl' },
    { target: [6, b], known: [3, b], how: 'double it', val: (x) => 2 * x, kind: 'dbl' },
    { target: [7, b], known: [5, b], how: `add two more groups of ${b}`, val: (x) => x + 2 * b, kind: 'add2' },
    { target: [b, b + 1], known: [b, b], how: `add one more ${b}`, val: (x) => x + b, kind: 'near' },
  ];
  const s = pick(rng, strats);
  const [ta, tb] = s.target, [ka, kb] = s.known;
  const kv = ka * kb, ans = ta * tb;
  const T = `${ta} × ${tb}`, K = `${ka} × ${kb}`;
  const vis = t <= 4 && s.kind !== 'near' ? { type: 'array', rows: b, cols: Math.max(ta, ka), split: s.kind === 'dbl' ? ta / 2 : Math.min(ta, ka) } : undefined;
  const nameOf = { add: 'Add a group', add2: 'Split it: 5 groups and 2 groups (distributive property)', sub: 'Subtract a group', dbl: 'Doubling', near: 'Near square' };
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    return {
      kind: 'num',
      prompt: `${K} = ${kv}. Use it to find ${T}.`,
      visual: vis,
      hint: s.kind === 'dbl' ? `${K} = ${kv}. ${T} has twice as many groups as ${K}, so double ${kv}.` : s.kind === 'near' ? `${K} = ${kv}. ${T} is ${b} groups of ${b + 1}: one more ${b} than ${K}. Add ${b} to ${kv}.` : s.kind === 'sub' ? `${K} = ${kv}. ${T} has one less group of ${b}, so take ${b} away from ${kv}.` : `${K} = ${kv}. ${T} has ${s.kind === 'add2' ? 'two more groups' : 'one more group'} of ${b}, so add ${s.kind === 'add2' ? `two ${b}s` : b} to ${kv}.`,
      explain: `${K} = ${kv}. ${cap(s.how)}: ${ans}. So ${T} = ${ans}.`,
      answer: num(ans),
    };
  }
  if (k === 1) {
    const wrongs = s.kind === 'dbl' ? [`${K}, then add ${b}`, `${K}, then add 2`, `${K}, then take away ${b}`]
      : s.kind === 'sub' ? [`${K}, then add ${b}`, `${K}, then take away 1`, `${K}, then take away 10`]
        : s.kind === 'near' ? [`${K}, then add 1`, `${K}, then add ${b + 1}`, `${K}, then double it`]
          : [`${K}, then take away ${b}`, `${K}, then add ${s.kind === 'add2' ? 2 : 1}`, `${K}, then double it`];
    return {
      prompt: `Which strategy works for ${T}?`,
      visual: vis,
      hint: `Which strategy works for ${T}? Start from ${K}. Does ${T} have one more group, two more groups, one less group, or twice as many groups? Test each choice to see if it really makes ${T}.`,
      explain: `${K} = ${kv}. Then ${s.how}: ${ans}.`,
      ...mcP(rng, `${K}, then ${s.how}`, wrongs, [], String),
    };
  }
  // distributive: which expression equals ta × tb
  const x = randInt(rng, 6, 9), y = randInt(rng, 3, 9);
  const s1 = pick(rng, [5, 2]), s2 = x - s1;
  const good = `${s1} × ${y} + ${s2} × ${y}`;
  return {
    prompt: `Which one equals ${x} × ${y}?`,
    visual: t <= 5 ? { type: 'array', rows: y, cols: x, split: s1 } : undefined,
    hint: `Which one equals ${x} × ${y}? You can split the ${x} groups of ${y} into two smaller groups that add up to ${x}, like the dashed line in the array. A correct choice multiplies BOTH parts by ${y} and adds them. Test each choice.`,
    explain: `${x} = ${s1} + ${s2}, so ${x} × ${y} = ${s1} × ${y} + ${s2} × ${y} = ${s1 * y} + ${s2 * y} = ${x * y}.`,
    ...mcP(rng, good, [`${s1} × ${y} + ${s2}`, `${s1} + ${y} × ${s2}`, `${s1} × ${y} + ${s2} × ${s1}`, `${x} × ${s1} + ${y}`], [], String),
  };
};

const m4Properties = (rng, t) => {
  const a = randInt(rng, 2, 10), b = randInt(rng, 2, 10);
  const k = randInt(rng, 0, 4);
  if (k === 0) {
    const first = chance(rng, 0.5);
    return {
      prompt: first ? `What is 0 × ${a}?` : `What is ${a} × 0?`,
      visual: first ? undefined : { type: 'groups', groups: a, each: 0 },
      hint: first ? `0 × ${a} means zero groups of ${a}. If you have no groups at all, how many things do you have?` : `${a} × 0 means ${a} groups with nothing in each group. How many things is that altogether?`,
      explain: `Any number times 0 is 0.`,
      ...mcN(rng, 0, [a, 1, a + 1, 10]),
    };
  }
  if (k === 1) {
    const ones = pick(rng, [`${a} × 1`, `1 × ${a}`, `${a} ÷ 1`, `${a} ÷ ${a}`]);
    const ans = ones === `${a} ÷ ${a}` ? 1 : a;
    return {
      prompt: `What is ${ones}?`,
      hint: ones === `${a} ÷ 1` ? `${a} ÷ 1 means sharing ${a} into just one group. How many go in that group?` : ones === `${a} ÷ ${a}` ? `${a} ÷ ${a} asks: how many groups of ${a} can you make from ${a}?` : `A number times 1 means one group of it. How many is one group of ${a}?`,
      explain: `${ones} = ${ans}.`,
      ...mcN(rng, ans, [a + 1, 1, 0, a - 1].filter((x) => x !== ans)),
    };
  }
  if (k === 2) {
    const p = a * b;
    return {
      kind: 'num',
      prompt: `${a} × ${b} = ${p}. What is ${p} ÷ ${a}?`,
      hint: `${a} × ${b} = ${p}. Division undoes multiplication: ${p} ÷ ${a} asks "${a} times what makes ${p}?" Look at the fact you were given.`,
      explain: `${a} × ${b} = ${p}, so ${p} ÷ ${a} = ${b}.`,
      answer: num(b),
    };
  }
  if (k === 3) {
    const p = a * b;
    return {
      kind: 'num',
      prompt: `${a} × ${b} = ${p}. What is ${b} × ${a}?`,
      visual: { type: 'array', rows: Math.min(a, 10), cols: Math.min(b, 10) },
      hint: `${a} × ${b} is ${a} rows of ${b}. Turn the array on its side to get ${b} rows of ${a}. Does the number of dots change?`,
      explain: `Changing the order does not change the product: ${b} × ${a} = ${p}.`,
      answer: num(p),
    };
  }
  const p = a * b;
  const tru = pick(rng, [`${a} × ${b} = ${b} × ${a}`, `${a} × 0 = 0`, `${a} × 1 = ${a}`, `${p} ÷ ${a} = ${b}`]);
  return {
    prompt: 'Which one is true?',
    hint: 'Which sentence is true? Work out both sides of each one. In × you can switch the order, but in ÷ you cannot. Any number times 0 is 0, and any number times 1 stays the same.',
    explain: `${tru} is true. In division, order matters, and multiplying by 0 always gives 0.`,
    ...mcP(rng, tru, [`${p} ÷ ${a} = ${a} ÷ ${p}`, `${a} × 0 = ${a}`, `${a} × 1 = 1`, `${a} + 0 = 0`].filter((x) => x !== tru), [], String),
  };
};

const m4Comparison = (rng, t) => {
  const [p, q] = nm2(rng);
  const th = pick(rng, THINGS);
  const a = randInt(rng, 2, 10), m = randInt(rng, 2, t >= 5 ? 10 : 6);
  const rev = t >= 5 && chance(rng, 0.45);
  if (rev) {
    return {
      kind: 'num',
      prompt: `${q} has ${a * m} ${th[1]}. That is ${m} times as many as ${p} has. How many does ${p} have?`,
      visual: { type: 'barmodel', whole: a * m, parts: Array(m).fill('?'), labels: [q] },
      hint: `How many does ${p} have? ${q}'s ${a * m} is ${m} equal parts, and each part is ${p}'s amount. Share ${a * m} into ${m} equal parts.`,
      explain: `${a * m} ÷ ${m} = ${a}. ${p} has ${a} ${th[1]}.`,
      answer: num(a),
    };
  }
  const q2 = {
    prompt: `${p} has ${a} ${th[1]}. ${q} has ${m} times as many. How many ${th[1]} does ${q} have?`,
    visual: t <= 5 ? { type: 'barmodel', parts: Array(m).fill(a), labels: [q] } : undefined,
    hint: `How many does ${q} have? "${m} times as many" means ${m} groups of ${a}. Use the times fact ${m} × ${a}, or skip count by ${a}s.`,
    explain: `${m} × ${a} = ${m * a}. ${q} has ${m * a} ${th[1]}.`,
  };
  if (chance(rng, 0.5)) return { ...q2, kind: 'num', answer: num(m * a) };
  return { ...q2, ...mcN(rng, m * a, [m + a, m * a + a, m * a - a, a * (m + 1)]) };
};

const m4Word = (rng, t) => {
  const a = randInt(rng, 3, 10), b = randInt(rng, 3, 10);
  const th = pick(rng, THINGS), cont = pick(rng, CONTAINERS);
  const who = nm(rng);
  const type = randInt(rng, 0, 2);
  let prompt, ans, sentence, wrongS;
  if (type === 0) {
    prompt = `${who} has ${a} ${cont[1]}. Each ${cont[0]} holds ${b} ${th[1]}. How many ${th[1]} in all?`;
    ans = a * b; sentence = `${a} × ${b} = □`; wrongS = [`${a} + ${b} = □`, `${a * b} ÷ ${b} = □`, `${Math.max(a, b)} − ${Math.min(a, b)} = □`];
  } else if (type === 1) {
    prompt = `${who} shares ${a * b} ${th[1]} equally among ${a} friends. How many does each friend get?`;
    ans = b; sentence = `${a * b} ÷ ${a} = □`; wrongS = [`${a * b} × ${a} = □`, `${a * b} − ${a} = □`, `${a * b} + ${a} = □`];
  } else {
    prompt = `${who} packs ${a * b} ${th[1]} in ${cont[1]} of ${b}. How many ${cont[1]} are needed?`;
    ans = a; sentence = `${a * b} ÷ ${b} = □`; wrongS = [`${a * b} × ${b} = □`, `${a * b} − ${b} = □`, `${b} ÷ ${a * b} = □`];
  }
  if (chance(rng, 0.35)) {
    return {
      prompt: `${prompt} Which number sentence solves it?`,
      hint: 'Which sentence fits the story? × joins equal groups; ÷ splits a total into equal groups (or finds how many groups); + joins two amounts; − takes away. Which one matches what happens in the story?',
      explain: `${sentence.replace('□', String(ans))}.`,
      ...mcP(rng, sentence, wrongS, [], String),
    };
  }
  const q = { prompt, hint: type === 0 ? `How many altogether? There are ${a} equal groups of ${b}. Use the times fact ${a} × ${b}, or skip count by ${b}s.` : type === 1 ? `How many does each friend get? Split ${a * b} into ${a} equal shares: think ${a} × □ = ${a * b}.` : `How many ${cont[1]}? Make groups of ${b} from ${a * b}: think ${b} × □ = ${a * b}.`, explain: `${sentence.replace('□', String(ans))}.` };
  if (chance(rng, 0.55)) return { ...q, kind: 'num', answer: num(ans) };
  return { ...q, ...mcN(rng, ans, type === 0 ? [a + b, ans + b, ans - a] : [ans + 1, ans - 1, a * b - (type === 1 ? a : b)]) };
};

const m4TwoStep = (rng, t) => {
  const who = nm(rng);
  const th = pick(rng, THINGS);
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const a = randInt(rng, 3, 9), b = randInt(rng, 3, 9), c = randInt(rng, 2, 8), d = pick(rng, [3, 4, 5, 6, 7, 8, 9].filter((x) => x !== b)); // two different pack sizes
    return { kind: 'num', prompt: `${who} buys ${a} packs of ${b} ${th[1]} and ${c} packs of ${d} ${th[1]}. How many ${th[1]} in all?`, hint: `How many ${th[1]} in all? Find each part with a times fact: ${a} × ${b} and ${c} × ${d}. Then add the two totals.`, explain: `${a} × ${b} = ${a * b}. ${c} × ${d} = ${c * d}. ${a * b} + ${c * d} = ${a * b + c * d}.`, answer: num(a * b + c * d) };
  }
  if (k === 1) {
    const g = randInt(rng, 3, 9), e = randInt(rng, 3, 9), eaten = randInt(rng, 1, e - 1);
    return { kind: 'num', prompt: `There are ${g} plates with ${e} ${th[1]} on each. ${who} takes ${eaten} from each plate. How many ${th[1]} are left?`, hint: `How many are left altogether? First find how many are left on one plate: ${e} − ${eaten}. Then multiply by the ${g} plates.`, explain: `Each plate has ${e} − ${eaten} = ${e - eaten} left. ${g} × ${e - eaten} = ${g * (e - eaten)}.`, answer: num(g * (e - eaten)) };
  }
  const x = randInt(rng, 6, 9);
  const ans = x * (x + 1);
  return { kind: 'num', prompt: `${x} × ${x} = ${x * x}. Use this near square to find ${x} × ${x + 1}.`, visual: { type: 'array', rows: x, cols: x + 1, split: x }, hint: `${x} × ${x + 1} is ${x} groups of ${x + 1}. That is ${x} more than ${x} × ${x}, so add ${x} to ${x * x}.`, explain: `${x * x} + ${x} = ${ans}.`, answer: num(ans) };
};

const g4MulDiv = {
  id: 'g4-ops-muldiv', grade: 4, strand: 'number', bigIdea: 'ops', species: 'multiplier',
  name: 'Multiply & Divide to 10 × 10',
  parentDesc: 'Understands multiplication and division facts to 10 × 10: equal groups, equal shares, comparison ("5 times as many"), strategies (doubling, distributive property, add or subtract a group, near squares), inverse and commutative properties, and the property of zero.',
  classic: false,
  gen: tiered([
    [1, 3, m4Visual, 2.5], [2, 6, m4Strategy, 2.5], [3, 5, m4Properties, 2], [4, 7, m4Comparison, 2], [4, 6, m4Word, 2], [6, 7, m4TwoStep, 2],
  ]),
};

// ---------------------------------------------------------------------------
// SD6 Facts fluency: derived facts (9, 4, 8, 3, 6, 7) and all facts to 10 × 10
// ---------------------------------------------------------------------------
const FACT_HINT = {
  0: 'Any number times 0 is 0.', 1: 'A number times 1 stays the same.', 2: 'Times 2 is a double.', 5: 'Count by 5s, or take half of times 10.', 10: 'Count by 10s.',
  9: 'Find times 10, then take away one group.', 4: 'Double, then double again.', 8: 'Double the 4s fact.', 3: 'Find times 2, then add one more group.',
  6: 'Find times 5, then add one more group. Or double the 3s fact.', 7: 'Find times 5 and times 2, then add them.',
};
function factHint(a, b, f) {
  const o = f === a ? b : a;
  switch (f) {
    case 9: return `What is ${a} × ${b}? Think 10 × ${o} first, then take away one group of ${o}.`;
    case 4: return `What is ${a} × ${b}? Double ${o} to get 2 × ${o}, then double that again.`;
    case 8: return `What is ${a} × ${b}? Find 4 × ${o} (double, double), then double it once more.`;
    case 3: return `What is ${a} × ${b}? Find 2 × ${o}, then add one more ${o}.`;
    case 6: return `What is ${a} × ${b}? Find 5 × ${o}, then add one more ${o}. Or double 3 × ${o}.`;
    case 7: return `What is ${a} × ${b}? Find 5 × ${o} and 2 × ${o}, then add them together.`;
    case 5: return `What is ${a} × ${b}? Count by 5s, ${o} time${o === 1 ? '' : 's'}. Or find ten groups of ${o} and take half.`;
    case 2: return `What is ${a} × ${b}? Times 2 is a double: ${o} + ${o}.`;
    case 10: return `What is ${a} × ${b}? Count by 10s, ${o} time${o === 1 ? '' : 's'}.`;
    default: return `What is ${a} × ${b}? A number taken 1 time stays the same.`;
  }
}
function factExplain(a, b, f) {
  const p = a * b, o = f === a ? b : a;
  switch (f) {
    case 9: return `10 × ${o} = ${10 * o}. Take away one ${o}: ${10 * o} − ${o} = ${p}.`;
    case 4: return `2 × ${o} = ${2 * o}. Double it: ${2 * o} + ${2 * o} = ${p}.`;
    case 8: return `4 × ${o} = ${4 * o}. Double it: ${4 * o} + ${4 * o} = ${p}.`;
    case 3: return `2 × ${o} = ${2 * o}. Add one more ${o}: ${2 * o} + ${o} = ${p}.`;
    case 6: return `5 × ${o} = ${5 * o}. Add one more ${o}: ${5 * o} + ${o} = ${p}.`;
    case 7: return `5 × ${o} = ${5 * o} and 2 × ${o} = ${2 * o}. ${5 * o} + ${2 * o} = ${p}.`;
    case 5: return `Half of 10 × ${o} (${10 * o}) is ${p}.`;
    case 2: return `Double ${o}: ${o} + ${o} = ${p}.`;
    case 10: return `10 groups of ${o} = ${p}.`;
    default: return `${a} × ${b} = ${p}.`;
  }
}
const FSETS4 = { 1: [9, 4, 3], 2: [9, 4, 8, 3], 3: [9, 4, 8, 3, 6], 4: [9, 4, 8, 3, 6, 7], 5: [9, 4, 8, 3, 6, 7, 2, 5], 6: [6, 7, 8, 9, 4, 3], 7: [6, 7, 8, 9] };
function pair4f(rng, t) {
  const f = pick(rng, FSETS4[t]);
  const o = t === 1 ? randInt(rng, 1, 5) : t >= 6 ? randInt(rng, 3, 10) : randInt(rng, t >= 3 ? 2 : 1, 10); // x1 facts are Grade 3 review
  return chance(rng, 0.5) ? [f, o, f] : [o, f, f];
}
const f4Mul = (rng, t) => {
  const [a, b, f] = pair4f(rng, t);
  const p = a * b;
  const q = {
    prompt: pick(rng, [`What is ${a} × ${b}?`, `${a} × ${b} = □`]),
    visual: t <= 2 ? (chance(rng, 0.5) ? { type: 'array', rows: a, cols: b, icon: pick(rng, ICONS) } : { type: 'groups', groups: a, each: b, icon: pick(rng, ICONS) }) : undefined,
    hint: factHint(a, b, f),
    explain: factExplain(a, b, f),
  };
  if (chance(rng, t <= 2 ? 0.6 : 0.8)) return { ...q, kind: 'num', answer: num(p) };
  return { ...q, ...mcN(rng, p, [a + b, a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, Number(String(p).split('').reverse().join(''))].filter((x) => x > 0)) };
};
const f4Div = (rng, t) => {
  const [a, b, d] = pair4f(rng, Math.max(t, 2));
  const q = d === a ? b : a, p = a * b;
  return {
    kind: 'num',
    prompt: pick(rng, [`What is ${p} ÷ ${d}?`, `${p} ÷ ${d} = □`]),
    visual: t <= 3 && chance(rng, 0.4) ? { type: 'array', rows: d, cols: q } : undefined,
    hint: `What is ${p} ÷ ${d}? Think: ${d} times what number makes ${p}? Use a times fact you know, or skip count by ${d}s.`,
    explain: `${d} × ${q} = ${p}, so ${p} ÷ ${d} = ${q}.`,
    answer: num(q),
  };
};
const f4Missing = (rng, t) => {
  const [a, b] = pair4f(rng, Math.max(t, 2));
  const first = chance(rng, 0.5), p = a * b;
  return {
    kind: 'num',
    prompt: first ? `□ × ${b} = ${p}` : `${a} × □ = ${p}`,
    speak: first ? `What times ${b} equals ${p}?` : `${a} times what equals ${p}?`,
    hint: `What number times ${first ? b : a} makes ${p}? Think of the division fact ${p} ÷ ${first ? b : a}, or skip count by ${first ? b : a}s up to ${p}.`,
    explain: `${a} × ${b} = ${p}, so □ = ${first ? a : b}.`,
    answer: num(first ? a : b),
  };
};
const f4Which = (rng, t) => {
  const [a, b] = pair4f(rng, Math.max(t, 2));
  const p = a * b;
  const good = `${a} × ${b}`;
  const cands = [];
  for (let x = 2; x <= 10; x++) for (let y = 2; y <= 10; y++) if (x * y !== p && Math.abs(x * y - p) <= 8) cands.push(`${x} × ${y}`);
  const notMode = chance(rng, 0.4);
  if (notMode) {
    // one fact does NOT equal p, three do (commutative / other factor pairs)
    const same = [];
    for (let x = 1; x <= 10; x++) for (let y = 1; y <= 10; y++) if (x * y === p) same.push(`${x} × ${y}`);
    if (same.length >= 3) {
      const odd = pick(rng, cands.length ? cands : [`${a + 1} × ${b}`]);
      return {
        prompt: `Which fact does NOT equal ${p}?`,
        hint: `Which fact does NOT make ${p}? Work out each one (switching the order does not change the answer). Three of them make ${p}; find the odd one out.`,
        explain: `${odd} = ${odd.split(' × ').reduce((x, y) => x * Number(y), 1)}, not ${p}.`,
        ...mcP(rng, odd, sample(rng, same, 3), [], String),
      };
    }
  }
  return {
    prompt: `Which fact has a product of ${p}?`,
    hint: `Which fact makes ${p}? Work out each choice with a fact you know or a strategy like doubling. Only one lands exactly on ${p}.`,
    explain: `${good} = ${p}.`,
    ...mcP(rng, good, cands.filter((c) => !c.startsWith(`${b} × ${a}`)), [`${a + 1} × ${b}`, `${a} × ${b - 1}`, `${a - 1} × ${b}`, `${a} + ${b}`].filter((c) => !/^0 |× 0$/.test(c)), String),
  };
};
const f4Square = (rng, t) => {
  const n = randInt(rng, 3, 10);
  return {
    kind: 'num',
    prompt: `${n} × ${n} = □`,
    visual: t <= 4 ? { type: 'array', rows: n, cols: n } : undefined,
    hint: n % 2 === 0 ? `What is ${n} × ${n}? Find ${n / 2} × ${n}, then double it.` : `What is ${n} × ${n}? Find ${n - 1} × ${n}, then add one more ${n}.`,
    explain: `${n} × ${n} = ${n * n}. It makes a square array.`,
    answer: num(n * n),
  };
};
const f4Family = (rng, t) => {
  const [a, b] = pair4f(rng, t);
  if (a === b) return f4Mul(rng, t);
  const p = a * b;
  const facts = [`${a} × ${b} = ${p}`, `${b} × ${a} = ${p}`, `${p} ÷ ${a} = ${b}`, `${p} ÷ ${b} = ${a}`];
  const shown = pick(rng, facts);
  const good = pick(rng, facts.filter((x) => x !== shown));
  return {
    prompt: `Which fact is in the same family as ${shown}?`,
    hint: `A fact family uses the same three numbers, here ${a}, ${b} and ${p}, with × and ÷. Test each choice: does it use only those numbers, and is it true?`,
    explain: `The family is ${facts.join(', ')}.`,
    ...mcP(rng, good, [`${p} ÷ ${a} = ${b + 1}`, `${a} + ${b} = ${a + b}`, `${a} × ${b + 1} = ${a * (b + 1)}`, `${b} ÷ ${a} = ${p}`], [], String),
  };
};

const g4Facts = {
  id: 'g4-ops-facts', grade: 4, strand: 'number', bigIdea: 'ops', species: 'factsprite',
  name: 'Times Facts to 10 × 10',
  parentDesc: 'Fluency with derived multiplication and division facts (9, 4, 8, 3, 6, 7) and all facts to 10 × 10.',
  classic: false,
  gen: tiered([
    [1, 7, f4Mul, 4], [2, 7, f4Div, 2.5], [3, 7, f4Missing, 1.5], [3, 7, f4Which], [4, 7, f4Square, 0.7], [5, 7, f4Family, 0.6],
  ]),
};

// ---------------------------------------------------------------------------
// SD7 Multi-digit: up to 3-digit × 1-digit; 2-digit ÷ 1-digit with/without remainders
// ---------------------------------------------------------------------------
const mdMul = (rng, t) => {
  const small = t <= 2;
  const a = t === 1 ? randInt(rng, 11, 19) : t === 2 ? randInt(rng, 12, 49) : t === 3 ? randInt(rng, 21, 99) : t <= 5 ? randInt(rng, 102, 999) : randInt(rng, 405, 999);
  const b = small ? randInt(rng, 2, 5) : t >= 6 ? randInt(rng, 6, 9) : randInt(rng, 2, 9);
  const p = a * b;
  const tens = Math.floor(a / 10) * 10, ones = a % 10;
  const hund = Math.floor(a / 100) * 100, tn = Math.floor((a % 100) / 10) * 10;
  const parts = a >= 100 ? [hund, tn, ones].filter((x) => x) : [tens, ones].filter((x) => x);
  const vis = t === 1 ? { type: 'barmodel', parts: Array(b).fill(a), whole: '?' } : t === 2 ? { type: 'base10', tens: Math.floor(a / 10), ones: a % 10 } : undefined;
  const q = {
    prompt: t === 2 ? `The blocks show ${a}. What is ${a} × ${b}?` : `What is ${fmtNum(a)} × ${b}?`,
    visual: vis,
    hint: `What is ${fmtNum(a)} × ${b}? Split ${fmtNum(a)} into ${parts.map(fmtNum).join(' + ')}. Multiply each part by ${b}, then add the answers.`,
    explain: `${parts.map((x) => `${fmtNum(x)} × ${b} = ${fmtNum(x * b)}`).join('; ')}. ${parts.map((x) => fmtNum(x * b)).join(' + ')} = ${fmtNum(p)}.`,
  };
  if (chance(rng, 0.55)) return { ...q, kind: 'num', answer: num(p) };
  const noCarry = Number(String(a).split('').map((d) => (Number(d) * b) % 10).join(''));
  const onlyFirst = parts[0] * b + parts.slice(1).reduce((s, x) => s + x, 0);
  return { ...q, ...mcN(rng, p, [noCarry, onlyFirst, p + b, p - b, p + 10 * b].filter((x) => x > 0), { step: 10 }) };
};

const mdStrategy = (rng, t) => {
  const a = t >= 5 ? randInt(rng, 102, 899) : randInt(rng, 13, 98), b = randInt(rng, 3, 9);
  if (a % 10 === 0) return mdMul(rng, t);
  const parts = a >= 100 ? [Math.floor(a / 100) * 100, a % 100] : [Math.floor(a / 10) * 10, a % 10];
  const good = `${b} × ${fmtNum(parts[0])} + ${b} × ${parts[1]}`;
  return {
    prompt: `Which is a way to find ${b} × ${fmtNum(a)}?`,
    hint: `Which is a correct way to find ${b} × ${fmtNum(a)}? Break ${fmtNum(a)} into place-value parts. A correct way multiplies ${b} by EVERY part and then adds. Test each choice.`,
    explain: `${fmtNum(a)} = ${fmtNum(parts[0])} + ${parts[1]}, so ${b} × ${fmtNum(a)} = ${b} × ${fmtNum(parts[0])} + ${b} × ${parts[1]} = ${fmtNum(b * parts[0])} + ${b * parts[1]} = ${fmtNum(a * b)}.`,
    ...mcP(rng, good, [`${b} × ${fmtNum(parts[0])} + ${parts[1]}`, `${b} + ${fmtNum(parts[0])} + ${parts[1]}`, `${b} × ${String(parts[0]).replace(/0+$/, '')} + ${b} × ${parts[1]}`], [], String),
  };
};

function splitA(n, d, q, r = -1) {
  for (const k of [10 * Math.floor(q / 10), 10, 5, 2, 3, 4]) { const A = d * k; if (A > 0 && A < n && A !== q && n - A !== q && n - A !== r && n - A >= d) return A; }
  return d * 10;
}
const mdDiv = (rng, t) => {
  const d = randInt(rng, t >= 6 ? 6 : 2, t <= 2 ? 5 : 9);
  const withRem = t >= 4 && chance(rng, t >= 6 ? 0.8 : 0.6);
  let q = randInt(rng, t <= 2 ? 11 : 10, Math.floor(99 / d));
  if (q < 2) q = 2;
  let r = withRem ? randInt(rng, 1, d - 1) : 0;
  let n = d * q + r;
  if (n > 99) { r = 0; n = d * q; }
  const vis = t <= 2 ? { type: 'base10', tens: Math.floor(n / 10), ones: n % 10 } : undefined;
  const qs = r ? `${q} R ${r}` : String(q);
  const base = {
    visual: vis,
    hint: q % 10 === 0 && !r ? `What is ${n} ÷ ${d}? Think of ${n} as ${n / 10} tens, and share the tens into ${d} equal groups.` : `What is ${n} ÷ ${d}? Split ${n} into friendly parts: ${splitA(n, d, q, r)} + ${n - splitA(n, d, q, r)}. Divide each part by ${d} and add.${r ? ' Whatever cannot make a full group is the remainder.' : ''}`,
    explain: r ? `${d} × ${q} = ${d * q}, and ${n} − ${d * q} = ${r} left over. So ${n} ÷ ${d} = ${q} R ${r}.` : `${d} × ${q} = ${n}, so ${n} ÷ ${d} = ${q}.`,
  };
  if (!r) {
    if (chance(rng, 0.55)) return { ...base, kind: 'num', prompt: `What is ${n} ÷ ${d}?`, answer: num(q) };
    return { ...base, prompt: `What is ${n} ÷ ${d}?`, ...mcN(rng, q, [q + 1, q - 1, n - d, q + 10].filter((x) => x > 0)) };
  }
  if (chance(rng, 0.35)) return { ...base, kind: 'num', prompt: `${n} ÷ ${d} has a remainder. What is the remainder?`, answer: num(r) };
  return {
    ...base,
    prompt: `What is ${n} ÷ ${d}?`,
    ...mcP(rng, qs, [`${q + 1} R ${r}`, `${q} R ${d - r}`, `${q - 1} R ${r}`, String(q)].filter((x) => x !== qs), [`${q} R ${r + 1 < d ? r + 1 : r - 1}`], String),
  };
};

const mdEstimate = (rng, t) => {
  if (chance(rng, 0.3)) {
    // Estimate a quotient with a friendly (compatible) number (NB Grade 4: estimate products and quotients).
    const d = randInt(rng, 2, 9);
    const friendly = [];
    for (let c = 20; c <= 90; c += 10) if (c % d === 0 && (c / d <= 10 || (c / d) % 10 === 0)) friendly.push(c); // quotient from a basic fact
    if (friendly.length) {
      const c = pick(rng, friendly);
      let n; do { n = c + pick(rng, [-3, -2, -1, 1, 2, 3]); } while (n % d === 0 || n > 99);
      const e = c / d;
      return {
        prompt: `About how much is ${n} ÷ ${d}?`,
        hint: `About how much is ${n} ÷ ${d}? Find a friendly number close to ${n} that ${d} divides evenly, using a times fact you know. Then divide that number instead.`,
        explain: `${n} is close to ${c}, and ${c} ÷ ${d} = ${e} (because ${d} × ${e} = ${c}). So ${n} ÷ ${d} is about ${e}.`,
        ...mcP(rng, e, [e + 10, Math.max(1, e - 5), c, e * 10, e + 5].filter((x) => x !== e && x > 0), [], (x) => `about ${x}`),
      };
    }
  }
  const a = randInt(rng, 102, 899), b = randInt(rng, 2, 9);
  const R = Math.round(a / 100) * 100;
  if (Math.abs(a % 100 - 50) < 10) return mdEstimate(rng, t);
  const est = R * b;
  if (t >= 5 && chance(rng, 0.5)) {
    const p = nm(rng);
    const exact = a * b;
    const noCarry = Number(String(a).split('').map((d) => (Number(d) * b) % 10).join(''));
    const claimed = chance(rng, 0.5) || Math.abs(noCarry - exact) < 250 ? exact : noCarry;
    const ok = claimed === exact;
    return {
      prompt: `${p} says ${fmtNum(a)} × ${b} = ${fmtNum(claimed)}. Is that reasonable?`,
      hint: `Is ${p}'s answer believable? Round ${fmtNum(a)} to the nearest hundred and multiply by ${b}. "Yes" means ${p}'s answer is close to that; "No" means it is far away.`,
      explain: `${fmtNum(R)} × ${b} = ${fmtNum(est)}. ${fmtNum(claimed)} is ${ok ? 'close to' : 'far from'} ${fmtNum(est)}, so it is ${ok ? '' : 'not '}reasonable. (Exact: ${fmtNum(exact)}.)`,
      ...fixedChoices(['Yes, it is reasonable', 'No, it is not reasonable'], ok ? 'Yes, it is reasonable' : 'No, it is not reasonable'),
    };
  }
  return {
    prompt: `About how much is ${fmtNum(a)} × ${b}?`,
    hint: `About how much is ${fmtNum(a)} × ${b}? Round ${fmtNum(a)} to the nearest hundred first, then use a times fact with hundreds.`,
    explain: `${fmtNum(a)} is about ${fmtNum(R)}. ${fmtNum(R)} × ${b} = ${fmtNum(est)}.`,
    ...mcP(rng, est, [est + 100 * b, Math.max(100, est - 100 * b), R + b, est * 10].filter((x) => x !== est), [], fmtNum),
  };
};

const MW = [
  (p, a, b) => [`A bakery makes ${a} muffins each day. How many muffins does it make in ${b} days?`, a * b],
  (p, a, b) => [`Each box holds ${a} crayons. How many crayons are in ${b} boxes?`, a * b],
  (p, a, b) => [`A dragon flies ${a} km each day for ${b} days. How far does it fly?`, a * b],
  (p, a, b) => [`${p}'s school has ${b} buses. Each bus holds ${a} students. How many students can ride?`, a * b],
];
const mdWord = (rng, t) => {
  const p = nm(rng);
  const div = chance(rng, 0.5);
  if (!div) {
    const a = t >= 5 ? randInt(rng, 102, 450) : randInt(rng, 12, 95), b = randInt(rng, 2, 9);
    const [prompt, ans] = pick(rng, MW)(p, a, b);
    return { kind: 'num', prompt, hint: `How many altogether? It is ${b} equal groups of ${fmtNum(a)}. Split ${fmtNum(a)} into place-value parts, multiply each part by ${b}, then add.`, explain: `${fmtNum(a)} × ${b} = ${fmtNum(ans)}.`, answer: num(ans) };
  }
  const d = randInt(rng, 3, 9), q = randInt(rng, 4, Math.floor(99 / d));
  const r = t >= 5 ? randInt(rng, 1, d - 1) : 0;
  const n = Math.min(99, d * q + r);
  const rr = n - d * q;
  const th = pick(rng, THINGS);
  if (rr) {
    const leftQ = chance(rng, 0.5);
    return {
      kind: 'num',
      prompt: leftQ ? `${p} shares ${n} ${th[1]} equally among ${d} friends. How many are left over?` : `${p} puts ${n} ${th[1]} into bags of ${d}. How many full bags are there?`,
      hint: `How many groups of ${d} fit in ${n}? Count by ${d}s as far as you can without going past ${n}. ${leftQ ? 'What is left over after the last full group?' : 'Count only the full groups.'}`,
      explain: `${n} ÷ ${d} = ${q} R ${rr}. ${leftQ ? `${rr} ${rr === 1 ? th[0] : th[1]} ${rr === 1 ? 'is' : 'are'} left over.` : `There are ${q} full bags (and ${rr} left over).`}`,
      answer: num(leftQ ? rr : q),
    };
  }
  return { kind: 'num', prompt: `${p} shares ${n} ${th[1]} equally among ${d} friends. How many does each friend get?`, hint: `How many does each friend get? Share ${n} into ${d} equal groups: think ${d} × □ = ${n}.`, explain: `${n} ÷ ${d} = ${q}.`, answer: num(q) };
};

const mdPreview = (rng, t) => {
  if (chance(rng, 0.5)) {
    const a = randInt(rng, 11, 19), b = randInt(rng, 11, 15);
    return { kind: 'num', prompt: `Big challenge! What is ${a} × ${b}?`, hint: `What is ${a} × ${b}? Split ${b} into 10 + ${b - 10}. Find ${a} × 10 and ${a} × ${b - 10}, then add them.`, explain: `${a} × 10 = ${a * 10}. ${a} × ${b - 10} = ${a * (b - 10)}. ${a * 10} + ${a * (b - 10)} = ${a * b}.`, answer: num(a * b) };
  }
  const d = randInt(rng, 2, 6), q = randInt(rng, 21, Math.floor(999 / d));
  return { kind: 'num', prompt: `Big challenge! What is ${fmtNum(d * q)} ÷ ${d}?`, hint: `What is ${fmtNum(d * q)} ÷ ${d}? Split ${fmtNum(d * q)} into parts that divide easily by ${d} (hundreds first, then tens, then ones). Divide each part, then add the answers.`, explain: `${d} × ${q} = ${fmtNum(d * q)}, so ${fmtNum(d * q)} ÷ ${d} = ${q}.`, answer: num(q) };
};

const g4MultiDigit = {
  id: 'g4-ops-multidigit', grade: 4, strand: 'number', bigIdea: 'ops', species: 'multiplier',
  name: 'Bigger Multiplying & Dividing',
  parentDesc: 'Multiplies up to 3-digit by 1-digit numbers and divides 2-digit by 1-digit numbers (with and without remainders), using strategies, estimation and checking for reasonableness.',
  classic: false,
  gen: tiered([
    [1, 5, mdMul, 3], [1, 5, mdDiv, 2.5], [3, 5, mdStrategy, 1.5], [4, 6, mdEstimate, 1.5], [4, 6, mdWord, 2], [6, 7, mdMul, 1.5], [6, 7, mdDiv, 1.5], [7, 7, mdPreview, 0.6, PREVIEW], [7, 7, mdWord, 1],
  ]),
};

// ---------------------------------------------------------------------------
// SD8 Multiplication and division equations with an unknown
// ---------------------------------------------------------------------------
const SYMS = ['□', '★', '▲', '●', '◆'];
const SYM_NAME = { '□': 'the box', '★': 'the star', '▲': 'the triangle', '●': 'the circle', '◆': 'the diamond' };
function mulEq(rng, t, sym) {
  const a = randInt(rng, 2, t <= 1 ? 6 : 10), b = randInt(rng, 2, t <= 1 ? 6 : 10);
  const scale = t >= 5 && chance(rng, t >= 6 ? 0.6 : 0.35) ? 10 : 1; // e.g. □ × 4 = 120
  const p = a * b * scale;
  const forms = [
    { text: `${sym} × ${b} = ${fmtNum(p)}`, ans: a * scale, why: `${fmtNum(p)} ÷ ${b} = ${a * scale}`, hint: `${sym} is how many ${b}s make ${fmtNum(p)}. Think: what times ${b} is ${fmtNum(p)}? Use the division fact ${fmtNum(p)} ÷ ${b}.` },
    { text: `${a} × ${sym} = ${fmtNum(p)}`, ans: b * scale, why: `${fmtNum(p)} ÷ ${a} = ${b * scale}`, hint: `${a} times what makes ${fmtNum(p)}? Use the division fact ${fmtNum(p)} ÷ ${a}, or skip count by ${a}s.` },
    { text: `${fmtNum(p)} ÷ ${sym} = ${b * scale}`, ans: a, why: `${fmtNum(p)} ÷ ${a} = ${b * scale}`, hint: `Into how many equal groups can you split ${fmtNum(p)} to get ${b * scale} in each? Think: ${b * scale} × what = ${fmtNum(p)}?` },
    { text: `${sym} ÷ ${a} = ${b * scale}`, ans: p, why: `${a} × ${b * scale} = ${fmtNum(p)}`, hint: `${sym} is the starting number: shared into ${a} equal groups, it gives ${b * scale} in each. Put the groups back together: ${a} × ${b * scale}.` },
    { text: `${fmtNum(p)} ÷ ${a} = ${sym}`, ans: b * scale, why: `${a} × ${b * scale} = ${fmtNum(p)}`, hint: `${sym} is ${fmtNum(p)} shared into ${a} equal groups. Think: ${a} times what makes ${fmtNum(p)}?` },
  ];
  const f = pick(rng, t <= 2 ? forms.slice(0, 3) : forms);
  if (t >= 3 && chance(rng, 0.25)) { const [l, r] = f.text.split(' = '); f.text = `${r} = ${l}`; }
  return { ...f, a, b, p };
}

const e4Solve = (rng, t) => {
  const sym = t <= 2 ? '□' : pick(rng, SYMS);
  const e = mulEq(rng, t, sym);
  const vis = t <= 2 && e.p <= 60 ? { type: 'array', rows: e.a, cols: e.b } : { type: 'expression', text: e.text, big: true };
  const q = {
    prompt: `What number does ${SYM_NAME[sym]} stand for? ${e.text}`,
    visual: vis,
    hint: e.hint,
    explain: `${e.why}. So ${sym} = ${fmtNum(e.ans)}.`,
  };
  if (chance(rng, 0.65)) return { ...q, kind: 'num', answer: num(e.ans) };
  return { ...q, ...mcN(rng, e.ans, [e.ans + 1, e.ans - 1, e.p, e.a + e.b, e.ans * 2].filter((x) => x > 0 && x !== e.ans)) };
};

const E4_STORIES = [
  { t: (a, b, p, n, th) => `${n} has ${a} bags with the same number of ${th} in each. There are ${p} ${th} in all. How many are in each bag?`, eq: (a, b, p) => [`${a} × □ = ${p}`, b], wrong: (a, b, p) => [`${a} + □ = ${p}`, `${p} × ${a} = □`, `□ ÷ ${a} = ${p}`] },
  { t: (a, b, p, n, th) => `${n} shares some ${th} equally among ${a} friends. Each friend gets ${b}. How many ${th} were there?`, eq: (a, b, p) => [`□ ÷ ${a} = ${b}`, p], wrong: (a, b, p) => [`${a} ÷ □ = ${b}`, `${b} ÷ ${a} = □`, `□ − ${a} = ${b}`] },
  { t: (a, b, p, n, th) => `There are ${p} ${th}. ${n} puts them in rows of ${b}. How many rows are there?`, eq: (a, b, p) => [`${p} ÷ ${b} = □`, a], wrong: (a, b, p) => [`${p} × ${b} = □`, `${p} − ${b} = □`, `□ ÷ ${b} = ${p}`] },
  { t: (a, b, p, n, th) => `${n} has ${b} ${th}. A friend has ${a} times as many. How many does the friend have?`, eq: (a, b, p) => [`${a} × ${b} = □`, p], wrong: (a, b, p) => [`${a} + ${b} = □`, `${b} ÷ ${a} = □`, `□ × ${a} = ${b}`] },
];
const e4Story = (rng, t) => {
  const a = randInt(rng, 2, 9), b = randInt(rng, 2, 9), p = a * b;
  const n = nm(rng), th = pick(rng, THINGS)[1];
  const st = pick(rng, E4_STORIES);
  const prompt = st.t(a, b, p, n, th);
  const [eq, ans] = st.eq(a, b, p);
  if (chance(rng, 0.5)) {
    return {
      prompt: `${prompt} Which equation matches?`,
      hint: 'Which equation tells the story? × is for equal groups put together (or "times as many"); ÷ is for sharing or making groups; + and − are for joining and taking away. Then check that □ sits where the unknown number is.',
      explain: `${eq}. □ = ${ans}.`,
      ...mcP(rng, eq, st.wrong(a, b, p), [], String),
    };
  }
  return { kind: 'num', prompt, visual: t <= 4 ? { type: 'expression', text: eq } : undefined, hint: `Write the story as an equation: ${eq}. Which number makes it true? Use the opposite operation, then check.`, explain: `${eq}. □ = ${ans}.`, answer: num(ans) };
};

const e4Which = (rng, t) => {
  const sym = pick(rng, SYMS);
  const e = mulEq(rng, t, sym);
  if (chance(rng, 0.5)) {
    return {
      prompt: `Which value of ${sym} makes this true? ${e.text}`,
      speak: `Which value of ${SYM_NAME[sym].replace('the ', '')} makes this true? ${toSpeech(e.text)}`,
      hint: `Which value makes ${e.text} true? Put each choice in place of ${sym} and work it out. Only one makes both sides equal.`,
      explain: `${e.why}. So ${sym} = ${fmtNum(e.ans)}.`,
      ...mcN(rng, e.ans, [e.ans + 1, e.ans - 1, e.p, e.a + e.b].filter((x) => x > 0 && x !== e.ans)),
    };
  }
  const v = randInt(rng, 2, 9), k = randInt(rng, 2, 9);
  const good = `${sym} × ${k} = ${v * k}`;
  return {
    prompt: `Which equation is true when ${sym} = ${v}?`,
    hint: `Put ${v} in place of ${sym} in each equation and work it out. Only one equation has both sides equal.`,
    explain: `${v} × ${k} = ${v * k}, so ${good} is true.`,
    ...mcP(rng, good, [`${sym} × ${k} = ${v + k}`, `${v * k} ÷ ${sym} = ${k + 1}`, `${sym} ÷ ${k} = ${v * k}`, `${sym} × ${k + 1} = ${v * k}`], [], String),
  };
};

const e4Balance = (rng, t) => {
  let a, b, c, x;
  do { a = randInt(rng, 2, 9); b = randInt(rng, 2, 9); c = randInt(rng, 2, 9); } while ((a * b) % c !== 0 || c === a || c === b || (a * b) / c > 10 || (a * b) / c < 2);
  x = (a * b) / c;
  const sym = pick(rng, SYMS);
  const left = `${c} × ${sym}`, right = `${a} × ${b}`;
  return {
    kind: 'num',
    prompt: `Both sides are equal. What is ${sym}? ${left} = ${right}`,
    visual: { type: 'balance', left: left.replace(sym, '?'), right, tilt: 'level' },
    hint: `A level balance means both sides are equal. First work out ${right}. Then ask: ${c} times what number makes that total?`,
    explain: `${right} = ${a * b}. ${c} × ${x} = ${a * b}, so ${sym} = ${x}.`,
    answer: num(x),
  };
};

const e4TwoStep = (rng, t) => {
  const who = nm(rng), th = pick(rng, THINGS);
  const d = randInt(rng, 3, 9), e = randInt(rng, 3, 9);
  const k = randInt(rng, 0, 1);
  if (k === 0) {
    const left = randInt(rng, 1, d - 1);
    return {
      kind: 'num',
      prompt: `${who} shares some ${th[1]} equally among ${d} friends. Each friend gets ${e}, and ${left} ${left === 1 ? 'is' : 'are'} left over. How many ${th[1]} did ${who} start with?`,
      visual: t <= 6 ? { type: 'expression', text: `□ = ${d} × ${e} + ${left}` } : undefined,
      hint: `Work backwards. The friends got ${d} groups of ${e}: find ${d} × ${e}. Then add the ${left} left over.`,
      explain: `${d} × ${e} = ${d * e}. ${d * e} + ${left} = ${d * e + left}.`,
      answer: num(d * e + left),
    };
  }
  const extra = randInt(rng, 2, 9);
  const total = d * e + extra;
  return {
    kind: 'num',
    prompt: `${who} has ${total} ${th[1]}. ${who} keeps ${extra} and puts the rest into ${d} equal bags. How many go in each bag? (${d} × □ + ${extra} = ${total})`,
    speak: `${who} has ${total} ${th[1]}. ${who} keeps ${extra} and puts the rest into ${d} equal bags. How many go in each bag?`,
    hint: `First take away the ${extra} that ${who} keeps: ${total} − ${extra}. Then share what is left into ${d} equal bags.`,
    explain: `${total} − ${extra} = ${d * e}. ${d * e} ÷ ${d} = ${e}.`,
    answer: num(e),
  };
};

const e4Preview = (rng, t) => {
  const L = pick(rng, ['n', 'm', 'y', 'k', 'p']);
  const a = randInt(rng, 2, 9), b = randInt(rng, 2, 9);
  const div = chance(rng, 0.5);
  const text = div ? `${L} ÷ ${a} = ${b}` : `${a}${L} = ${a * b}`;
  return {
    kind: 'num',
    prompt: `Big challenge! A letter can stand for a number. What is ${L}? ${text}`,
    speak: `Big challenge! A letter can stand for a number. What is ${L}? ${div ? `${L} divided by ${a} equals ${b}` : `${a} times ${L} equals ${a * b}`}`,
    hint: div ? `${L} ÷ ${a} = ${b} means ${L} shared into ${a} equal groups gives ${b} in each. Put the groups back together: ${a} × ${b}.` : `${a}${L} means ${a} × ${L}. What number times ${a} makes ${a * b}?`,
    explain: div ? `${a} × ${b} = ${a * b}, so ${L} = ${a * b}.` : `${a} × ${b} = ${a * b}, so ${L} = ${b}.`,
    answer: num(div ? a * b : b),
  };
};

const g4Equations = {
  id: 'g4-pat-equations', grade: 4, strand: 'patterns', bigIdea: 'patterns', species: 'balancer',
  name: 'Multiply & Divide Equations',
  parentDesc: 'Solves multiplication and division equations with a symbol for the unknown, and writes equations for story problems.',
  classic: false,
  gen: tiered([
    [1, 6, e4Solve, 3], [2, 6, e4Story, 2], [4, 7, e4Which, 1.2], [6, 7, e4Balance, 1.5], [6, 7, e4TwoStep, 2], [7, 7, e4Preview, 0.6, PREVIEW],
  ]),
};

// ---------------------------------------------------------------------------
// SD9 Patterns in charts and tables; Venn diagrams
// ---------------------------------------------------------------------------
const TABLE_CTX = [
  ['Tricycles', 'Wheels', 3, 0], ['Spiders', 'Legs', 8, 0], ['Dragons', 'Wings', 2, 0], ['Packs', 'Juice boxes', 6, 0], ['Weeks', 'Days', 7, 0],
  ['Tables', 'Chairs', 4, 0], ['Starfish', 'Arms', 5, 0], ['Boxes', 'Crayons', 10, 0], ['Rows', 'Seats', 9, 0], ['Figure', 'Squares', 3, 1],
  ['Figure', 'Dots', 4, 2], ['Day', 'Pages read', 5, 10], ['Week', 'Dollars saved', 3, 5], ['Hour', 'Cm of snow', 2, 4],
];
function makeTable(rng, t) {
  const [h1, h2, m, c0] = pick(rng, TABLE_CTX);
  const mult = t >= 3 ? randInt(rng, 0, 1) : 1;
  const k = mult || c0 === 0 ? m : randInt(rng, 2, 9);
  const c = c0;
  const start = t >= 5 ? randInt(rng, 1, 3) : 1;
  const xs = Array.from({ length: 5 }, (_, i) => start + i);
  const ys = xs.map((x) => k * x + c);
  return { h1, h2, k, c, xs, ys };
}
const ruleText = (k, c) => (c ? `multiply by ${k}, then add ${c}` : `multiply by ${k}`);

const tbExtend = (rng, t) => {
  const T = makeTable(rng, t);
  const n = t <= 2 ? 4 : 4;
  const target = T.xs[n - 1] + randInt(rng, t >= 6 ? 3 : 1, t >= 6 ? 7 : t >= 4 ? 4 : 1);
  const ans = T.k * target + T.c;
  const rows = T.xs.slice(0, n).map((x, i) => [x, T.ys[i]]);
  return {
    kind: chance(rng, 0.65) ? 'num' : 'mc',
    prompt: `The pattern continues. What goes with ${target}?`,
    visual: { type: 'table', headers: [T.h1, T.h2], rows: [...rows, [target, '?']] },
    hint: `What goes with ${target}? Find how much the ${T.h2.toLowerCase()} column grows from one row to the next. Keep adding that amount, one row at a time, until you reach ${target}.`,
    explain: `The ${T.h2.toLowerCase()} go up by ${T.k} each row: ${Array.from({ length: target - T.xs[n - 1] + 1 }, (_, i) => T.k * (T.xs[n - 1] + i) + T.c).join(', ')}. So ${target} goes with ${ans}.${T.c ? '' : ` (Rule: ${T.h1.toLowerCase()} × ${T.k}.)`}`,
    answer: num(ans),
    _d: [ans + T.k, ans - T.k, T.ys[n - 1] + 1, target * (T.k + 1)],
  };
};
const tbExtendWrap = (rng, t) => {
  const q = tbExtend(rng, t);
  const { _d, ...r } = q;
  if (q.kind === 'num') return r;
  const { answer, ...r2 } = r;
  return { ...r2, ...mcN(rng, Number(answer), _d) };
};

const tbMissing = (rng, t) => {
  const T = makeTable(rng, t);
  const hole = randInt(rng, 1, 3);
  const rows = T.xs.map((x, i) => [x, i === hole ? '?' : T.ys[i]]);
  return {
    kind: 'num',
    prompt: 'What number is missing from the table?',
    visual: { type: 'table', headers: [T.h1, T.h2], rows },
    hint: `What number fills the gap? Use two rows next to each other to find how much the ${T.h2.toLowerCase()} column grows each row. Then use it on the row just before the gap.`,
    explain: `The ${T.h2.toLowerCase()} go up by ${T.k} each row: ${T.ys.join(', ')}. The missing number is ${T.ys[hole]}.`,
    answer: num(T.ys[hole]),
  };
};

const tbError = (rng, t) => {
  const T = makeTable(rng, Math.max(t, 3));
  const idx = randInt(rng, 1, 4);
  const bad = T.ys.slice();
  bad[idx] = T.ys[idx] + pick(rng, [1, -1, 2, -2].filter((d) => T.ys[idx] + d !== T.ys[idx - 1] && T.ys[idx] + d !== T.ys[idx + 1]));
  return {
    prompt: `One number in the ${T.h2.toLowerCase()} column is wrong. Which one?`,
    visual: { type: 'table', headers: [T.h1, T.h2], rows: T.xs.map((x, i) => [x, bad[i]]) },
    hint: `Which number breaks the pattern? Find how much the ${T.h2.toLowerCase()} column should grow each row, then check every jump. The wrong number is where a jump does not match.`,
    explain: `The ${T.h2.toLowerCase()} should go up by ${T.k} each time: ${T.ys.join(', ')}. So ${bad[idx]} should be ${T.ys[idx]}.`,
    ...mcP(rng, bad[idx], sample(rng, bad.filter((x, i) => i !== idx), 3), [], String),
  };
};

const tbRule = (rng, t) => {
  const T = makeTable(rng, t);
  const good = cap(ruleText(T.k, T.c));
  const wrongs = [cap(ruleText(T.k + 1, T.c)), `Add ${T.k}`, cap(ruleText(T.k, T.c + 1)), T.c ? cap(ruleText(T.k, 0)) : `Add ${T.ys[0] - T.xs[0]}`];
  return {
    prompt: `Which rule turns each ${T.h1.toLowerCase()} number into the ${T.h2.toLowerCase()} number?`,
    visual: { type: 'table', headers: [T.h1, T.h2], rows: T.xs.slice(0, 4).map((x, i) => [x, T.ys[i]]) },
    hint: 'Which rule works for EVERY row? Test each rule on two or three rows, not just the first one. "Multiply by" means times; "then add" means add after multiplying; "add" alone means add to the first number.',
    explain: `${good}: ${T.xs.slice(0, 3).map((x, i) => `${x} → ${T.ys[i]}`).join(', ')}.`,
    ...mcP(rng, good, wrongs.filter((w) => w.toLowerCase() !== good.toLowerCase() && !T.xs.slice(0, 4).every((x, i) => ruleCheck(w, x) === T.ys[i])), [], String),
  };
};
function ruleCheck(w, x) {
  let m = w.match(/Multiply by (\d+), then add (\d+)/i);
  if (m) return x * m[1] + Number(m[2]);
  m = w.match(/Multiply by (\d+)/i); if (m) return x * m[1];
  m = w.match(/Add (\d+)/i); if (m) return x + Number(m[1]);
  return null;
}

const tbMake = (rng, t) => {
  const [h1, h2, m] = pick(rng, TABLE_CTX.filter((c) => c[3] === 0));
  const tab = (f) => ({ type: 'table', headers: [h1, h2], rows: [1, 2, 3, 4].map((x) => [x, f(x)]) });
  const noun = h1.toLowerCase();
  return {
    prompt: `Each of the ${noun} has ${m} ${h2.toLowerCase()}. Which table shows this?`,
    hint: `Which table matches? For 1 of the ${noun} there should be ${m}; for 2 of them, ${m} + ${m}. Check every row of each table, not just the first.`,
    explain: `Multiply by ${m}: 1 → ${m}, 2 → ${2 * m}, 3 → ${3 * m}, 4 → ${4 * m}.`,
    ...mcV(rng, tab((x) => m * x), [tab((x) => m + x), tab((x) => (m + 1) * x), tab((x) => m * x + 1), tab((x) => m + x - 1)]),
  };
};

const VENN_SETS = [
  ['Multiples of 2', (n) => n % 2 === 0], ['Multiples of 5', (n) => n % 5 === 0], ['Multiples of 3', (n) => n % 3 === 0],
  ['Multiples of 4', (n) => n % 4 === 0], ['Multiples of 10', (n) => n % 10 === 0], ['Less than 50', (n) => n < 50], ['Odd numbers', (n) => n % 2 === 1],
];
function vennPair(rng) {
  for (;;) {
    const [A, B] = sample(rng, VENN_SETS, 2);
    if ((A[0] === 'Multiples of 2' && B[0] === 'Odd numbers') || (B[0] === 'Multiples of 2' && A[0] === 'Odd numbers')) continue;
    if ((A[0].includes('10') && B[0].includes('5')) || (A[0].includes('5') && B[0].includes('10'))) continue;
    if ((A[0].includes('10') && B[0].includes(' 2')) || (A[0].includes(' 2') && B[0].includes('10'))) continue;
    if ((A[0].includes(' 4') && B[0].includes(' 2')) || (A[0].includes(' 2') && B[0].includes(' 4'))) continue;
    return [A, B];
  }
}
const tbVenn = (rng, t) => {
  const [A, B] = vennPair(rng);
  const pool = shuffle(rng, Array.from({ length: 99 }, (_, i) => i + 1));
  const L = [], Bo = [], R = [], O = [];
  for (const n of pool) {
    const a = A[1](n), b = B[1](n);
    const arr = a && b ? Bo : a ? L : b ? R : O;
    if (arr.length < 3) arr.push(n);
  }
  const k = randInt(rng, 0, 1);
  if (k === 0) {
    const n = pick(rng, [...L, ...Bo, ...R, ...O]);
    const a = A[1](n), b = B[1](n);
    const where = a && b ? 'In the middle (both)' : a ? `Only in "${A[0]}"` : b ? `Only in "${B[0]}"` : 'Outside both circles';
    const vis = { type: 'venn', leftLabel: A[0], rightLabel: B[0], left: L.filter((x) => x !== n).slice(0, 2), both: Bo.filter((x) => x !== n).slice(0, 2), right: R.filter((x) => x !== n).slice(0, 2), outside: O.filter((x) => x !== n).slice(0, 2) };
    return {
      prompt: `Where does ${n} go in the Venn diagram?`,
      visual: vis,
      hint: `Is ${n} one of the "${A[0].toLowerCase()}"? Is it one of the "${B[0].toLowerCase()}"? Yes to only one label means that circle alone, yes to both means the middle, and no to both means outside the circles.`,
      explain: `${n} ${a ? 'fits' : 'does not fit'} "${A[0]}" and ${b ? 'fits' : 'does not fit'} "${B[0]}". So it goes ${where.toLowerCase()}.`,
      ...fixedChoices([`Only in "${A[0]}"`, 'In the middle (both)', `Only in "${B[0]}"`, 'Outside both circles'], where),
    };
  }
  // which number is in the wrong place
  const wrongN = pick(rng, [...L, ...R]);
  const inL = L.includes(wrongN);
  const vis = { type: 'venn', leftLabel: A[0], rightLabel: B[0], left: inL ? L.filter((x) => x !== wrongN).slice(0, 2) : [...L.slice(0, 2), wrongN], both: Bo.slice(0, 2), right: inL ? [...R.slice(0, 2), wrongN] : R.filter((x) => x !== wrongN).slice(0, 2), outside: O.slice(0, 1) };
  const shown = [...vis.left, ...vis.both, ...vis.right, ...vis.outside].filter((x) => x !== wrongN);
  return {
    prompt: 'One number is in the wrong place. Which one?',
    visual: vis,
    hint: `Check each number against both circle labels. A number in a circle must fit that label; a number in the middle must fit both; a number outside fits neither. Which number breaks the rule?`,
    explain: `${wrongN} ${A[1](wrongN) ? 'is' : 'is not'} in "${A[0]}" and ${B[1](wrongN) ? 'is' : 'is not'} in "${B[0]}", so it is in the wrong circle.`,
    ...mcP(rng, wrongN, sample(rng, shown, 3), [], String),
  };
};

const tbMultChart = (rng, t) => {
  const row = randInt(rng, 2, 9);
  const start = randInt(rng, 1, 5);
  const seq = Array.from({ length: 5 }, (_, i) => row * (start + i));
  const hole = randInt(rng, 2, 4);
  return {
    kind: 'num',
    prompt: `These numbers are from the ${row}s row of a multiplication chart: ${seq.map((x, i) => (i === hole ? '□' : x)).join(', ')}. What is □?`,
    hint: `The ${row}s row of a multiplication chart counts by ${row}s. Take the number just before □ and add ${row}, or use a times fact.`,
    explain: `${row} × ${start + hole} = ${seq[hole]}.`,
    answer: num(seq[hole]),
  };
};

const tbHundred = (rng, t) => {
  const step = pick(rng, [3, 4, 6, 7, 8, 9, 11]);
  const n = randInt(rng, 3, Math.floor(90 / step) - 1);
  const hl = Array.from({ length: n }, (_, i) => (i + 1) * step);
  const ans = (n + 1) * step;
  return {
    prompt: 'The shaded numbers make a pattern. Which number is shaded next?',
    visual: { type: 'hundredchart', highlight: hl, blank: [ans] },
    hint: 'Which number is shaded next? Find how far apart two shaded numbers are, then add that much to the last shaded number.',
    explain: `The pattern counts by ${step}s. ${hl[hl.length - 1]} + ${step} = ${ans}.`,
    ...mcN(rng, ans, [ans + 1, ans - 1, ans + 10, ans - step, ans + step].filter((x) => x <= 100)),
  };
};

const tbPreview = (rng, t) => {
  const k = randInt(rng, 2, 9), c = randInt(rng, 0, 5);
  const target = randInt(rng, 10, 20);
  return {
    kind: 'num',
    prompt: `Big challenge! Output = input × ${k}${c ? ` + ${c}` : ''}. What is the output when the input is ${target}?`,
    visual: { type: 'table', headers: ['Input', 'Output'], rows: [[1, k + c], [2, 2 * k + c], [3, 3 * k + c], [target, '?']] },
    hint: `What is the output for ${target}? Counting on row by row would take a long time, so use the rule: ${target} × ${k}${c ? `, then add ${c}` : ''}.`,
    explain: `${target} × ${k} = ${target * k}${c ? `, and ${target * k} + ${c} = ${target * k + c}` : ''}.`,
    answer: num(target * k + c),
  };
};

const g4Tables = {
  id: 'g4-pat-tables', grade: 4, strand: 'patterns', bigIdea: 'patterns', species: 'patternkin',
  name: 'Tables & Venn Diagrams',
  parentDesc: 'Finds, extends and describes number patterns in charts and tables, finds errors and missing terms, makes tables from situations, and sorts numbers in Venn diagrams.',
  classic: false,
  gen: tiered([
    [1, 7, tbExtendWrap, 2.5], [1, 3, tbHundred, 1.5], [1, 5, tbMissing, 1.5], [3, 7, tbError, 1.5], [3, 7, tbRule, 1.5], [3, 6, tbMake, 1.2],
    [2, 7, tbVenn, 2], [4, 6, tbMultChart], [7, 7, tbPreview, 0.8],
  ]),
};

// ---------------------------------------------------------------------------
// SD10 Time: 24-hour clock, converting 12 <-> 24, seconds/minutes/hours
// ---------------------------------------------------------------------------
function rTime(rng, t) {
  const h = t <= 1 ? randInt(rng, 13, 21) : t >= 5 && chance(rng, 0.3) ? pick(rng, [0, 12, 23, 11]) : randInt(rng, 0, 23);
  const m = t <= 1 ? randInt(rng, 0, 11) * 5 : randInt(rng, 0, 59);
  return [h, m];
}
const t24To12 = (rng, t) => {
  const [h, m] = rTime(rng, t);
  const good = time12(h, m);
  const wrongs = [time12((h + 12) % 24, m), `${h === 0 ? 12 : h}:${pad2(m)} ${h < 12 ? 'a.m.' : 'p.m.'}`, time12((h + 2) % 24, m), time12((h + 10) % 24, m)];
  return {
    prompt: `What is ${time24(h, m)} in 12-hour time?`,
    visual: { type: 'clock', hour: h, minute: m, digital: true, h24: true },
    hint: h === 0 ? `What is ${time24(h, m)} in 12-hour time? The 00 hour starts at midnight, and midnight is 12 a.m. So write 12 for the hour and keep the minutes.` : h === 12 ? `What is ${time24(h, m)} in 12-hour time? The 12 hour starts at noon, which is p.m. Keep 12 for the hour and the same minutes.` : h > 12 ? `What is ${time24(h, m)} in 12-hour time? Hours after 12 are afternoon or evening (p.m.), so subtract 12 from ${h}. The minutes stay the same.` : `What is ${time24(h, m)} in 12-hour time? Hours 01 to 11 are in the morning (a.m.), so just drop the first 0 of the hour. The minutes stay the same.`,
    explain: h > 12 ? `${h} − 12 = ${h - 12}, so ${time24(h, m)} is ${good}.` : `${time24(h, m)} is ${good}.`,
    ...mcP(rng, good, wrongs.filter((w) => !w.startsWith('0:') && !/^1[3-9]:|^2\d:/.test(w)), [], String),
  };
};
const t12To24 = (rng, t) => {
  const [h, m] = rTime(rng, t);
  const good = time24(h, m);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const wrongs = [time24((h + 12) % 24, m), `${pad2(h12)}:${pad2(m)}`, time24((h + 10) % 24, m), time24((h + 1) % 24, m), `${h12 + 10}:${pad2(m)}`];
  return {
    prompt: `What is ${time12(h, m)} in 24-hour time?`,
    visual: t <= 3 ? { type: 'clock', hour: h, minute: m } : undefined,
    hint: h >= 13 ? `What is ${time12(h, m)} in 24-hour time? After noon the hours keep counting: 1 p.m. is 13, 2 p.m. is 14, and so on. Add 12 to ${h12}.` : h === 0 ? '12 a.m. is midnight, when the day starts at 00 in 24-hour time. Write 00 for the hour and keep the minutes.' : h === 12 ? '12 p.m. is noon, which stays 12 in 24-hour time. Keep the minutes the same.' : 'a.m. hours stay the same in 24-hour time, but the hour always has two digits (put a 0 in front of a single digit).',
    explain: h >= 13 ? `${h12} + 12 = ${h}, so ${time12(h, m)} is ${good}.` : `${time12(h, m)} is ${good}.`,
    ...mcP(rng, good, wrongs.filter((w) => w !== good), [], String),
  };
};
const tRead24 = (rng, t) => {
  const [h, m] = rTime(rng, t);
  const ctx = h < 12 ? 'in the morning' : h < 17 ? 'in the afternoon' : 'in the evening';
  if (h === 0 || h === 12) return t24To12(rng, t);
  return {
    prompt: `The clock shows a time ${ctx}. What is it in 24-hour time?`,
    visual: { type: 'clock', hour: h, minute: m },
    hint: `What does the clock show, in 24-hour time? First read it: short hand for the hour, long hand for the minutes. ${h > 12 ? 'It is afternoon or evening, so add 12 to the hour.' : 'It is morning, so the hour stays the same, written with two digits.'}`,
    explain: `The clock reads ${h % 12}:${pad2(m)} ${ctx}, which is ${time24(h, m)}.`,
    ...mcP(rng, time24(h, m), [time24((h + 12) % 24, m), time24(h, (m + 5) % 60), time24(h > 12 ? h - 1 : h + 1, m), `${h}:${pad2(Math.round(m / 5) || 12)}`].filter((w) => w !== time24(h, m)), [], String),
  };
};
const tUnits = (rng, t) => {
  const k = randInt(rng, 0, 5);
  switch (k) {
    case 0: { const n = randInt(rng, 2, t >= 4 ? 10 : 5); return { kind: 'num', prompt: `${n} minutes = □ seconds`, speak: `${n} minutes equals how many seconds?`, hint: `How many seconds are in ${n} minutes? Each minute is 60 seconds, so you need ${n} groups of 60 (think ${n} × 6 tens).`, explain: `${n} × 60 = ${n * 60} seconds.`, answer: num(n * 60) }; }
    case 1: { const n = randInt(rng, 2, t >= 4 ? 10 : 5); return { kind: 'num', prompt: `${n} hours = □ minutes`, speak: `${n} hours equals how many minutes?`, hint: `How many minutes are in ${n} hours? Each hour is 60 minutes, so you need ${n} groups of 60 (think ${n} × 6 tens).`, explain: `${n} × 60 = ${n * 60} minutes.`, answer: num(n * 60) }; }
    case 2: { const hh = randInt(rng, 1, 3), mm = randInt(rng, 5, 55); return { kind: 'num', prompt: `${hh} h ${mm} min = □ min`, speak: `${hh} hours ${mm} minutes equals how many minutes?`, hint: `How many minutes in ${hh} h ${mm} min? Change the ${hh} hour${hh > 1 ? 's' : ''} into minutes first (60 minutes each), then add the ${mm} extra minutes.`, explain: `${hh} × 60 = ${hh * 60}. ${hh * 60} + ${mm} = ${hh * 60 + mm} minutes.`, answer: num(hh * 60 + mm) }; }
    case 3: { const s = randInt(rng, 2, 9) * 60; return { kind: 'num', prompt: `${s} seconds = □ minutes`, speak: `${s} seconds equals how many minutes?`, hint: `How many minutes is ${s} seconds? Every 60 seconds makes 1 minute. How many groups of 60 fit into ${s}?`, explain: `${s} ÷ 60 = ${s / 60} minutes.`, answer: num(s / 60) }; }
    case 4: { const d = randInt(rng, 2, 4); return { kind: 'num', prompt: `${d} days = □ hours`, speak: `${d} days equals how many hours?`, hint: `How many hours are in ${d} days? Each day is 24 hours. Add 24 once for each day, or find ${d} × 24.`, explain: `${d} × 24 = ${d * 24} hours.`, answer: num(d * 24) }; }
    default: {
      const a = randInt(rng, 2, 5), s = a * 60 + pick(rng, [-30, -15, 15, 30, 45]);
      const longer = chance(rng, 0.5);
      const A = `${a} minutes`, B = `${s} seconds`;
      const ans = (longer ? a * 60 > s : a * 60 < s) ? A : B;
      return { prompt: `Which is ${longer ? 'longer' : 'shorter'}: ${A} or ${B}?`, hint: `Which is ${longer ? 'longer' : 'shorter'}: ${A} or ${B}? Change ${A} into seconds (each minute is 60 seconds). Then compare the two numbers of seconds.`, explain: `${A} = ${a * 60} seconds. So ${ans} is ${longer ? 'longer' : 'shorter'}.`, ...fixedChoices([A, B], ans) };
    }
  }
};
const tOrder = (rng, t) => {
  const times = [];
  while (times.length < 4) { const h = randInt(rng, 0, 23), m = randInt(rng, 0, 11) * 5; const s = time24(h, m); if (!times.includes(s)) times.push(s); }
  const latest = chance(rng, 0.5);
  const sorted = times.slice().sort();
  const ans = latest ? sorted[3] : sorted[0];
  return {
    prompt: `Which time is the ${latest ? 'latest' : 'earliest'} in the day?`,
    hint: `Which time is the ${latest ? 'latest' : 'earliest'}? In 24-hour time the day starts at midnight with hour 00 and the hours count up to 23. Compare the hours first; if two tie, compare the minutes.`,
    explain: `In order: ${sorted.join(', ')}. The ${latest ? 'latest' : 'earliest'} is ${ans}.`,
    ...mcP(rng, ans, times.filter((x) => x !== ans), [], String),
  };
};
const TRAINS = ['Moncton', 'Saint John', 'Fredericton', 'Bathurst', 'Miramichi', 'Edmundston', 'Sackville', 'Shediac'];
const tSchedule = (rng, t) => {
  const places = sample(rng, TRAINS, 4);
  const rows = places.map((p) => { const h = randInt(rng, 6, 22), m = randInt(rng, 0, 11) * 5; return [p, time24(h, m), h, m]; });
  const i = randInt(rng, 0, 3);
  const k = randInt(rng, 0, 1);
  const vis = { type: 'table', title: 'Bus Schedule', headers: ['To', 'Leaves at'], rows: rows.map((r) => [r[0], r[1]]) };
  if (k === 0) {
    return {
      prompt: `The bus to ${rows[i][0]} leaves at what time in 12-hour time?`,
      visual: vis,
      hint: `Find the bus to ${rows[i][0]} in the table. Hours 13 to 23 are p.m.: subtract 12. Hours 01 to 11 are a.m. and stay the same (12 is noon, p.m.).`,
      explain: `${rows[i][1]} is ${time12(rows[i][2], rows[i][3])}.`,
      ...mcP(rng, time12(rows[i][2], rows[i][3]), [time12((rows[i][2] + 12) % 24, rows[i][3]), time12((rows[i][2] + 2) % 24, rows[i][3]), time12((rows[i][2] + 10) % 24, rows[i][3])], [], String),
    };
  }
  const cut = randInt(rng, 12, 19);
  const after = rows.filter((r) => r[2] >= cut);
  const before = rows.filter((r) => r[2] < cut);
  if (!after.length || !before.length) return tOrder(rng, t);
  const good = pick(rng, after)[0];
  const who = nm(rng);
  return {
    prompt: `${who} can only take a bus that leaves after ${time12(cut, 0)}. Which bus can ${who} take?`,
    visual: vis,
    hint: `Which bus leaves after ${time12(cut, 0)}? First change ${time12(cut, 0)} into 24-hour time by adding 12 to the hour. Then find a bus time in the table that is later.`,
    explain: `${time12(cut, 0)} = ${time24(cut, 0)}. The bus to ${good} leaves at ${rows.find((r) => r[0] === good)[1]}, which is later.`,
    ...mcP(rng, good, before.map((r) => r[0]), [], String),
  };
};
const tPreview = (rng, t) => {
  const h = randInt(rng, 8, 19), m = randInt(rng, 0, 11) * 5, dh = randInt(rng, 1, 3), dm = pick(rng, [0, 15, 30, 45]);
  const end = h * 60 + m + dh * 60 + dm;
  const eh = Math.floor(end / 60) % 24, em = end % 60;
  return {
    prompt: `Big challenge! A movie starts at ${time24(h, m)} and lasts ${dh} h${dm ? ` ${dm} min` : ''}. When does it end?`,
    hint: `When does the movie end? Start at ${time24(h, m)} and add the ${dh} hour${dh > 1 ? 's' : ''} first${dm ? `, then the ${dm} minutes` : ''}. If the minutes reach 60, that makes one more hour.`,
    explain: `${time24(h, m)} + ${dh} h = ${time24((h + dh) % 24, m)}${dm ? `, + ${dm} min = ${time24(eh, em)}` : ''}.`,
    ...mcP(rng, time24(eh, em), [time24((eh + 1) % 24, em), time24(eh, (em + 30) % 60), time24((h + dh) % 24, m === em ? (m + 15) % 60 : m), time24(eh - 12 >= 0 ? eh - 12 : eh + 1, em)].filter((x) => x !== time24(eh, em)), [], String),
  };
};

const g4Time = {
  id: 'g4-meas-time', grade: 4, strand: 'shape', bigIdea: 'measurement', species: 'clockwork',
  name: '24-Hour Time',
  parentDesc: 'Reads and writes 24-hour time to the minute, converts between 12-hour and 24-hour time, and relates seconds, minutes and hours.',
  classic: false,
  gen: tiered([
    [1, 5, t24To12, 2], [1, 5, t12To24, 2], [1, 5, tRead24, 1.5], [2, 7, tUnits, 1.5], [4, 7, tOrder, 1.2], [5, 7, tSchedule, 1.5], [6, 7, t24To12, 1], [6, 7, t12To24, 1], [7, 7, tPreview, 0.6, PREVIEW],
  ]),
};

// ---------------------------------------------------------------------------
// SD11 Measurement: perimeter, area (cm², m²), capacity (mL, L)
// ---------------------------------------------------------------------------
function cellsPerimeter(cells) {
  const set = new Set(cells.map(([x, y]) => `${x},${y}`));
  let p = 0;
  for (const [x, y] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!set.has(`${x + dx},${y + dy}`)) p++;
  return p;
}
function skyline(rng, maxW, maxH, rows) {
  const w = randInt(rng, 2, maxW);
  const hs = Array.from({ length: w }, () => randInt(rng, 1, maxH));
  if (hs.every((h) => h === hs[0])) hs[randInt(rng, 0, w - 1)] = hs[0] === 1 ? 2 : hs[0] - 1;
  const x0 = randInt(rng, 0, 2);
  const cells = [];
  hs.forEach((h, i) => { for (let j = 0; j < h; j++) cells.push([x0 + i, rows - 1 - j]); });
  return cells;
}

const msGrid = (rng, t) => {
  const area = chance(rng, 0.5);
  const w = randInt(rng, 2, t === 1 ? 5 : 8), h = randInt(rng, 2, t === 1 ? 4 : 6);
  const cols = 10, rows = 8;
  const x = randInt(rng, 0, cols - w), y = randInt(rng, 0, rows - h);
  const P = 2 * (w + h), A = w * h;
  return {
    prompt: area ? 'Each square is 1 cm². What is the area of the shaded rectangle?' : 'Each square is 1 cm on each side. What is the perimeter of the shaded rectangle?',
    visual: { type: 'grid', cols, rows, rect: { x, y, w, h }, showUnits: true },
    hint: area ? 'What is the area? Area means how many squares cover the inside. Count the squares in one row, count the rows, then multiply (or add the rows).' : 'What is the perimeter? Perimeter is the distance around the OUTSIDE, not the squares inside. Count the unit edges along all four sides and add them.',
    explain: area ? `${h} rows of ${w} squares: ${h} × ${w} = ${A} cm².` : `${w} + ${h} + ${w} + ${h} = ${P} cm.`,
    ...mcP(rng, area ? `${A} cm²` : `${P} cm`, area ? [`${P} cm²`, `${A + w} cm²`, `${w + h} cm²`, `${A - h} cm²`] : [`${A} cm`, `${w + h} cm`, `${P + 2} cm`, `${P - 2} cm`], [], String),
  };
};

const msIrregular = (rng, t) => {
  const rows = 7;
  const cells = skyline(rng, 5, 4, rows);
  const area = chance(rng, 0.5);
  const val = area ? cells.length : cellsPerimeter(cells);
  return {
    prompt: area ? 'Each square is 1 cm². What is the area of this shape?' : 'Each square is 1 cm on each side. What is the perimeter of this shape?',
    visual: { type: 'grid', cols: 9, rows, cells, showUnits: true },
    hint: area ? 'What is the area? Count every shaded square inside the shape. Going row by row helps you not miss any.' : 'What is the perimeter? Trace the outside edge with your finger and count every unit edge, including the steps up and down, until you are back at the start.',
    explain: area ? `There are ${cells.length} shaded squares, so the area is ${cells.length} cm².` : `Going around the outside, there are ${val} unit edges: ${val} cm.`,
    ...mcP(rng, `${val} ${area ? 'cm²' : 'cm'}`, [area ? cellsPerimeter(cells) : cells.length, val + 1, val - 1, val + 2].filter((x) => x > 0 && x !== val).map((x) => `${x} ${area ? 'cm²' : 'cm'}`), [], String),
  };
};

const msRectCalc = (rng, t) => {
  const unit = pick(rng, t >= 4 ? ['cm', 'm', 'dm'] : ['cm', 'm']);
  const L = randInt(rng, 3, 10), W = randInt(rng, 2, Math.min(L, 9));
  const area = chance(rng, 0.5) && unit !== 'dm';
  const thing = pick(rng, { cm: ['photo', 'sticky note', 'card', 'book cover', 'tile'], dm: ['table top', 'poster', 'window', 'tray'], m: ['garden', 'patio', 'rug', 'dragon pen', 'sandbox', 'classroom floor'] }[unit]);
  const q = {
    prompt: `A rectangular ${thing} is ${L} ${unit} long and ${W} ${unit} wide. What is its ${area ? 'area' : 'perimeter'}?`,
    visual: L <= 10 && W <= 8 && t <= 4 ? { type: 'grid', cols: 10, rows: 8, rect: { x: 0, y: 0, w: L, h: W } } : undefined,
    hint: area ? `What is the area of a ${L} by ${W} rectangle? Think of it as ${W} rows of ${L} squares: multiply length × width. Area is in square units (${unit}²).` : `What is the perimeter? A rectangle has two sides of ${L} ${unit} and two sides of ${W} ${unit}. Add all four sides.`,
    explain: area ? `${L} × ${W} = ${L * W} ${unit}².` : `${L} + ${W} + ${L} + ${W} = ${2 * (L + W)} ${unit}.`,
  };
  const ans = area ? L * W : 2 * (L + W);
  if (chance(rng, 0.45)) return { ...q, prompt: q.prompt.replace(/\?$/, ` in ${area ? `${unit}²` : unit}?`), kind: 'num', answer: num(ans) };
  return { ...q, ...mcP(rng, `${ans} ${area ? `${unit}²` : unit}`, area ? [`${2 * (L + W)} ${unit}²`, `${L + W} ${unit}²`, `${L * W} ${unit}`] : [`${L * W} ${unit}`, `${L + W} ${unit}`, `${2 * (L + W)} ${unit}²`], [], String) };
};

const msSamePerim = (rng, t) => {
  let w, h;
  do { w = randInt(rng, 2, 7); h = randInt(rng, 1, 6); } while (w === h);
  const P = 2 * (w + h);
  const G = (a, b) => ({ type: 'grid', cols: 10, rows: 8, rect: { x: 0, y: 0, w: a, h: b } });
  if (chance(rng, 0.5)) {
    const opts = [];
    for (let a = 1; a <= 9; a++) { const b = P / 2 - a; if (b >= 1 && b <= 7 && a !== w && a !== h) opts.push([a, b]); }
    if (!opts.length) return msGrid(rng, t);
    const [a, b] = pick(rng, opts);
    const wrongs = [[a + 1, b], [a, b + 1], [w, h + 1], [a + 1, b + 1], [w + 1, h - 1 || 1]].filter(([x, y]) => 2 * (x + y) !== P && x <= 10 && y <= 7 && y >= 1);
    return {
      prompt: `A rectangle is ${w} cm by ${h} cm. Which different rectangle has the same perimeter?`,
      hint: `Which different rectangle has the same perimeter? First find the perimeter of ${w} by ${h}: ${w} + ${h} + ${w} + ${h}. Then, for each choice, count its length and width, add them and double it.`,
      explain: `${w} by ${h}: ${w} + ${h} + ${w} + ${h} = ${P} cm. ${a} by ${b}: ${a} + ${b} + ${a} + ${b} = ${P} cm too.`,
      ...mcV(rng, G(a, b), shuffle(rng, wrongs).map(([x, y]) => G(x, y))),
    };
  }
  const Ls = Array.from({ length: P / 2 - 1 }, (_, i) => i + 1).filter((x) => x !== w && x !== h);
  if (!Ls.length) return msGrid(rng, t);
  const L = pick(rng, Ls);
  return {
    kind: 'num',
    prompt: `Two rectangles both have a perimeter of ${P} cm. One is ${w} cm by ${h} cm. The other is ${L} cm long. How wide is it, in cm?`,
    hint: `How wide is the other rectangle? A length plus a width is half of the perimeter, so find half of ${P}. Then take away the length, ${L}.`,
    explain: `Half of ${P} is ${P / 2}. ${P / 2} − ${L} = ${P / 2 - L} cm.`,
    answer: num(P / 2 - L),
  };
};

const msSameArea = (rng, t) => {
  const A = pick(rng, [12, 16, 18, 20, 24, 30, 36]);
  const pairs = [];
  for (let a = 1; a <= 10; a++) if (A % a === 0 && A / a <= 8) pairs.push([a, A / a]);
  const G = (a, b) => ({ type: 'grid', cols: 10, rows: 8, rect: { x: 0, y: 0, w: a, h: b } });
  if (chance(rng, 0.5) && pairs.length) {
    const [a, b] = pick(rng, pairs);
    const wrongs = [[a + 1, b], [a, b - 1], [a - 1, b + 1], [b + 1, a - 1]].filter(([x, y]) => x * y !== A && x >= 1 && y >= 1 && x <= 10 && y <= 8);
    return {
      prompt: `Which rectangle has an area of ${A} square units?`,
      hint: `Which rectangle has an area of ${A} square units? For each one, count the length and the width and multiply them (or count all the squares). Only one gives ${A}.`,
      explain: `${a} × ${b} = ${A} square units.`,
      ...mcV(rng, G(a, b), wrongs.map(([x, y]) => G(x, y))),
    };
  }
  const [a, b] = pick(rng, pairs.length ? pairs : [[3, 4]]);
  const unit = pick(rng, ['cm', 'm']);
  return {
    kind: 'num',
    prompt: `A rectangle has an area of ${A} ${unit}². It is ${a} ${unit} long. How wide is it, in ${unit}?`,
    hint: `How wide is it? Area is length × width, so think: ${a} × □ = ${A}.`,
    explain: `${a} × ${b} = ${A}, so it is ${b} ${unit} wide.`,
    answer: num(b),
  };
};

const AREA_ITEMS = [['the top of your desk', 'cm²'], ['a sticky note', 'cm²'], ['a playing card', 'cm²'], ['a book cover', 'cm²'], ['a stamp', 'cm²'], ['a tablet screen', 'cm²'],
  ['a classroom floor', 'm²'], ['a soccer field', 'm²'], ['a garden', 'm²'], ['a gym floor', 'm²'], ['a parking lot', 'm²'], ['a hockey rink', 'm²']];
const msAreaUnit = (rng, t) => {
  if (chance(rng, 0.6)) {
    const [thing, u2] = pick(rng, AREA_ITEMS);
    return {
      prompt: `Which unit would you use to measure the area of ${thing}?`,
      hint: `Which unit fits the area of ${thing}? cm² (square centimetres) are tiny squares about the size of a fingernail, for small surfaces. m² (square metres) are big squares about the size of a small tablecloth, for floors and fields. cm measures length and mL measures liquid, not area.`,
      explain: `${cap(thing)} is ${u2 === 'cm²' ? 'small' : 'large'}, so square ${u2 === 'cm²' ? 'centimetres' : 'metres'} (${u2}) are best.`,
      ...fixedChoices(['cm²', 'm²', 'cm', 'mL'], u2),
    };
  }
  const cm = chance(rng, 0.5);
  const good = cm ? 'the nail on your little finger' : 'a big square tablecloth';
  return {
    prompt: `Which is closest to 1 ${cm ? 'cm²' : 'm²'}?`,
    hint: cm ? 'Which is closest to 1 cm²? 1 cm² is a square 1 cm on each side, about as big as a fingernail. Check each choice: is it tiny like that, or much bigger?' : 'Which is closest to 1 m²? 1 m² is a square 1 m (one big step) on each side. Check each choice: is it much smaller, much bigger, or about that size?',
    explain: `${cap(good)} is about 1 ${cm ? 'cm²' : 'm²'}.`,
    ...mcP(rng, good, cm ? ['a sheet of paper', 'a door', 'a desk top'] : ['a postage stamp', 'a soccer field', 'a playing card'], [], String),
  };
};

const CAP_ITEMS = [['a teaspoon', 'mL', 5], ['a juice box', 'mL', 200], ['a drinking glass', 'mL', 250], ['a small yogurt cup', 'mL', 100], ['a soup bowl', 'mL', 300], ['an eye dropper', 'mL', 1],
  ['a bathtub', 'L', 150], ['a big water jug', 'L', 4], ['a bucket', 'L', 10], ['a fish tank', 'L', 40], ['a milk carton', 'L', 2], ['a kitchen sink', 'L', 20]];
const msCapacity = (rng, t) => {
  const k = randInt(rng, 0, t <= 2 ? 1 : 3);
  if (k === 0) {
    const max = pick(rng, [500, 1000]), step = max === 500 ? 50 : 100;
    const v = randInt(rng, 2, max / step - 1) * step;
    return {
      prompt: 'How much water is in the jug?',
      visual: { type: 'jug', value: v, max, unit: 'mL', ticks: step },
      hint: `How much water is in the jug? Each mark is ${step} mL. Find the mark at the top of the water and count up by ${step}s from the bottom.`,
      explain: `The water is at ${v} mL.`,
      ...mcP(rng, `${v} mL`, [`${v + step} mL`, `${v - step} mL`, `${max - v} mL`, `${v} L`].filter((x) => !x.startsWith('0 ') && x !== `${v} mL`), [], String),
    };
  }
  if (k === 1) {
    const [thing, un, v] = pick(rng, CAP_ITEMS);
    return {
      prompt: `Which unit would you use for how much ${thing} holds?`,
      hint: `Which unit fits how much ${thing} holds? mL (millilitres) is for small amounts, like a spoonful or a cup. L (litres) is for large amounts, like a bucket. kg measures mass and cm measures length, not how much something holds.`,
      explain: `${cap(thing)} holds about ${v} ${un}, so ${un === 'mL' ? 'millilitres' : 'litres'} are best.`,
      ...fixedChoices(['mL', 'L', 'kg', 'cm'], un),
    };
  }
  if (k === 2) {
    const n = randInt(rng, 2, 9);
    const half = chance(rng, 0.3);
    if (half) return { kind: 'num', prompt: `${n} L and 500 mL = □ mL`, speak: `${n} litres and 500 millilitres equals how many millilitres?`, hint: `How many millilitres is ${n} L and 500 mL? Each litre is 1000 mL, so change the ${n} L first. Then add the 500 mL.`, explain: `${n} L = ${fmtNum(n * 1000)} mL. ${fmtNum(n * 1000)} + 500 = ${fmtNum(n * 1000 + 500)} mL.`, answer: num(n * 1000 + 500) };
    return { kind: 'num', prompt: `${n} L = □ mL`, speak: `${n} litres equals how many millilitres?`, hint: `How many millilitres are in ${n} L? Each litre is 1000 mL, so count by 1000s, ${n} times.`, explain: `${n} × 1000 = ${fmtNum(n * 1000)} mL.`, answer: num(n * 1000) };
  }
  const [thing, un, v] = pick(rng, CAP_ITEMS);
  const good = `${v} ${un}`;
  return {
    prompt: `What is the best estimate for how much ${thing} holds?`,
    hint: `How much does ${thing} hold? A teaspoon holds about five millilitres and a juice box about two hundred millilitres. A milk carton holds about two litres and a bucket about ten litres. Which choice fits the size of ${thing}?`,
    explain: `${cap(thing)} holds about ${good}.`,
    ...mcP(rng, `about ${good}`, [`about ${v} ${un === 'mL' ? 'L' : 'mL'}`, `about ${v * 100} ${un}`, `about ${Math.max(1, Math.round(v / 100))} ${un === 'mL' ? 'mL' : 'L'}`].filter((x) => x !== `about ${good}`), [], String),
  };
};

const msCapWord = (rng, t) => {
  const who = nm(rng);
  const k = randInt(rng, 0, 2);
  if (k === 0) { const L = randInt(rng, 1, 3), pour = randInt(rng, 1, 9) * 50 + (L > 1 ? 500 : 0); return { kind: 'num', prompt: `A jug holds ${L} L of juice. ${who} pours out ${pour} mL. How many millilitres are left?`, hint: `How much juice is left? First change ${L} L into millilitres (each litre is 1000 mL). Then take away the ${pour} mL poured out.`, explain: `${L} L = ${fmtNum(L * 1000)} mL. ${fmtNum(L * 1000)} − ${pour} = ${fmtNum(L * 1000 - pour)} mL.`, answer: num(L * 1000 - pour) }; }
  if (k === 1) { const c = pick(rng, [100, 200, 250, 500]), n = 1000 / c; return { kind: 'num', prompt: `A cup holds ${c} mL. How many cups can ${who} fill from a 1 L bottle?`, hint: `How many cups can be filled? 1 L = 1000 mL. How many groups of ${c} mL fit into 1000 mL? Skip count by ${c}s.`, explain: `1000 ÷ ${c} = ${n} cups.`, answer: num(n) }; }
  const a = randInt(rng, 2, 9) * 100, b = randInt(rng, 2, 9) * 100;
  const total = a + b;
  return { prompt: `${who} mixes ${a} mL of water and ${b} mL of juice. Is that more or less than 1 L?`, hint: `Is it more or less than 1 L? First add ${a} mL + ${b} mL. Then compare the total with 1000 mL, which is exactly 1 L.`, explain: `${a} + ${b} = ${fmtNum(total)} mL, which is ${total > 1000 ? 'more than' : total < 1000 ? 'less than' : 'exactly'} 1000 mL.`, ...fixedChoices(['More than 1 L', 'Exactly 1 L', 'Less than 1 L'], total > 1000 ? 'More than 1 L' : total < 1000 ? 'Less than 1 L' : 'Exactly 1 L') };
};

const msPreview = (rng, t) => {
  const pairs = [[2, 3], [2, 4], [3, 4], [2, 5], [3, 5], [4, 5], [3, 6], [2, 6], [4, 6]];
  const [a, b] = pick(rng, pairs);
  const good = `${a} cm by ${b} cm`;
  const wrongs = [[a - 1, b + 1], [a + 1, b - 1], [1, a * b], [a, b + 1]].filter(([x, y]) => x >= 1 && y >= 1 && !(x === a && y === b) && !(x === b && y === a)).map(([x, y]) => `${x} cm by ${y} cm`);
  return {
    prompt: `Big challenge! A rectangle has a perimeter of ${2 * (a + b)} cm and an area of ${a * b} cm². What are its sides?`,
    hint: `Which rectangle fits both facts? For each choice, add the four sides to check the perimeter, then multiply the two sides to check the area. Only one passes both tests.`,
    explain: `${a} + ${b} + ${a} + ${b} = ${2 * (a + b)} cm, and ${a} × ${b} = ${a * b} cm².`,
    ...mcP(rng, good, wrongs, [], String),
  };
};

const g4Measure = {
  id: 'g4-meas-measure', grade: 4, strand: 'shape', bigIdea: 'measurement', species: 'measurer',
  name: 'Perimeter, Area & Capacity',
  parentDesc: 'Finds perimeter in dm, cm and m, area in cm² and m², shows different rectangles with the same perimeter or area, and measures capacity in mL and L.',
  classic: false,
  gen: tiered([
    [1, 3, msGrid, 2.5], [2, 5, msIrregular, 1.5], [2, 5, msRectCalc, 2], [4, 7, msSamePerim, 1.5], [4, 7, msSameArea, 1.5], [3, 5, msAreaUnit],
    [1, 5, msCapacity, 2], [4, 7, msCapWord, 1.5], [6, 7, msRectCalc, 1], [7, 7, msPreview, 0.7],
  ]),
};

// ---------------------------------------------------------------------------
// SD12 Polygons: line symmetry and congruence
// ---------------------------------------------------------------------------
// v = vertical line works, h = horizontal line works, n = number of lines
const SYM_SHAPES = {
  square: { v: true, h: true, n: 4, name: 'square' }, rectangle: { v: true, h: true, n: 2, name: 'rectangle' },
  equilateral_triangle: { v: true, h: false, n: 3, name: 'equilateral triangle' }, isosceles_triangle: { v: true, h: false, n: 1, name: 'isosceles triangle' },
  scalene_triangle: { v: false, h: false, n: 0, name: 'scalene triangle' }, pentagon: { v: true, h: false, n: 5, name: 'regular pentagon' },
  hexagon: { v: true, h: true, n: 6, name: 'regular hexagon' }, octagon: { v: true, h: true, n: 8, name: 'regular octagon' },
  heart: { v: true, h: false, n: 1, name: 'heart' }, parallelogram: { v: false, h: false, n: 0, name: 'parallelogram' },
};
const LETTERS = { A: [1, 0], B: [0, 1], C: [0, 1], D: [0, 1], E: [0, 1], K: [0, 1], M: [1, 0], T: [1, 0], U: [1, 0], V: [1, 0], W: [1, 0], Y: [1, 0], H: [1, 1], F: [0, 0], G: [0, 0], J: [0, 0], L: [0, 0], N: [0, 0], P: [0, 0], R: [0, 0], S: [0, 0], Z: [0, 0] };

const syIsLine = (rng, t) => {
  const useLetter = chance(rng, 0.45);
  const line = pick(rng, ['vertical', 'horizontal']);
  let shape, yes, label;
  if (useLetter) { const L = pick(rng, Object.keys(LETTERS)); shape = `letter:${L}`; yes = !!LETTERS[L][line === 'vertical' ? 0 : 1]; label = `the letter ${L}`; }
  else { const s = pick(rng, Object.keys(SYM_SHAPES)); shape = s; yes = SYM_SHAPES[s][line === 'vertical' ? 'v' : 'h']; label = `the ${SYM_SHAPES[s].name}`; }
  if (!useLetter && chance(rng, 0.25) && ['square', 'octagon', 'rectangle'].includes(shape)) {
    const d = shape !== 'rectangle';
    return {
      prompt: 'Is the dashed line a line of symmetry?',
      visual: { type: 'symmetry', shape, line: 'diagonal' },
      hint: 'A line of symmetry splits a shape into two halves that match exactly, like a mirror. Imagine folding along the diagonal dashed line, corner to corner: would one half land perfectly on the other? "Yes" means they match; "No" means they do not.',
      explain: d ? `Folding ${label} along the diagonal makes the halves match, so yes.` : `Folding a rectangle along a diagonal does not make the halves match, so no.`,
      ...fixedChoices(['Yes', 'No'], d ? 'Yes' : 'No'),
    };
  }
  return {
    prompt: 'Is the dashed line a line of symmetry?',
    visual: { type: 'symmetry', shape, line },
    hint: `A line of symmetry splits a shape into two halves that match exactly, like a mirror. Imagine folding along the ${line} dashed line: would one half land perfectly on the other? "Yes" means they match; "No" means they do not.`,
    explain: yes ? `Folding ${label} along the ${line} line makes two matching halves. It is a line of symmetry.` : `Folding ${label} along the ${line} line does not make matching halves. It is not a line of symmetry.`,
    ...fixedChoices(['Yes', 'No'], yes ? 'Yes' : 'No'),
  };
};

const syCount = (rng, t) => {
  const useLetter = chance(rng, 0.3);
  if (useLetter) {
    const L = pick(rng, Object.keys(LETTERS));
    const n = LETTERS[L][0] + LETTERS[L][1];
    return {
      prompt: `How many lines of symmetry does the letter ${L} have?`,
      visual: { type: 'symmetry', shape: `letter:${L}`, line: 'none' },
      hint: `How many lines of symmetry does ${L} have? Imagine folding it along an up-and-down (vertical) line, then along a side-to-side (horizontal) line. Count how many folds make two halves that match exactly.`,
      explain: `The letter ${L} has ${n === 0 ? 'no lines' : n === 1 ? `1 line (${LETTERS[L][0] ? 'vertical' : 'horizontal'})` : '2 lines (vertical and horizontal)'} of symmetry.`,
      ...fixedChoices(['0', '1', '2', '3'], String(n)),
    };
  }
  const pool = t <= 4 ? ['square', 'rectangle', 'isosceles_triangle', 'scalene_triangle', 'heart', 'parallelogram', 'equilateral_triangle'] : Object.keys(SYM_SHAPES);
  const s = pick(rng, pool);
  const n = SYM_SHAPES[s].n;
  return {
    prompt: `How many lines of symmetry does this ${SYM_SHAPES[s].name} have?`,
    visual: { type: 'symmetry', shape: s, line: 'none' },
    hint: n >= 3 ? 'How many lines of symmetry? For a regular polygon, try a fold line through each corner and through the middle of each side. Count the folds that make two matching halves.' : 'How many lines of symmetry? Try every fold: up-and-down, side-to-side and corner-to-corner. Count only the folds that make two halves that match exactly.',
    explain: `A ${SYM_SHAPES[s].name} has ${n === 0 ? 'no lines' : u(n, 'line')} of symmetry.${n >= 3 ? ` A regular polygon has as many lines of symmetry as sides.` : ''}`,
    ...mcN(rng, n, [n + 1, n - 1, n + 2, n === 2 ? 4 : 2, n * 2].filter((x) => x >= 0 && x <= 10)),
  };
};

const syWhich = (rng, t) => {
  const none = chance(rng, 0.5);
  const withSym = Object.keys(SYM_SHAPES).filter((s) => SYM_SHAPES[s].n > 0);
  const noSym = ['scalene_triangle', 'parallelogram'];
  const useLetters = chance(rng, 0.5);
  if (useLetters) {
    const kind = pick(rng, ['horizontal', 'vertical', 'none']);
    const ok = (L) => (kind === 'none' ? LETTERS[L][0] + LETTERS[L][1] === 0 : kind === 'vertical' ? LETTERS[L][0] === 1 && LETTERS[L][1] === 0 : LETTERS[L][1] === 1 && LETTERS[L][0] === 0);
    const good = pick(rng, Object.keys(LETTERS).filter(ok));
    const bad = sample(rng, Object.keys(LETTERS).filter((L) => !ok(L) && !(kind !== 'none' && LETTERS[L][0] + LETTERS[L][1] === 2)), 3);
    return {
      prompt: kind === 'none' ? 'Which letter has NO lines of symmetry?' : `Which letter has a ${kind} line of symmetry?`,
      hint: kind === 'vertical' ? 'A vertical line goes up and down, so the left half must mirror the right half. Imagine folding each letter that way.' : kind === 'horizontal' ? 'A horizontal line goes side to side, so the top half must mirror the bottom half. Imagine folding each letter that way.' : 'Try folding each letter up-and-down and side-to-side. You want the letter where NO fold makes matching halves.',
      explain: kind === 'none' ? `${good} has no lines of symmetry. No fold makes matching halves.` : `${good} can be folded along a ${kind} line into two matching halves.`,
      ...mcP(rng, good, bad, [], String),
    };
  }
  const good = pick(rng, none ? noSym : withSym);
  const bad = none ? sample(rng, withSym, 3) : shuffle(rng, noSym);
  const V = (s) => ({ type: 'shapes', items: [{ shape: s, color: pick(rng, COLOURS) }] });
  return {
    prompt: none ? 'Which shape has NO lines of symmetry?' : 'Which shape has at least one line of symmetry?',
    hint: none ? 'Which shape has NO lines of symmetry? A line of symmetry is a fold that makes two matching halves. For each shape, try folding it up-and-down, side-to-side and corner-to-corner.' : 'Which shape has a line of symmetry? For each shape, try folding it up-and-down, side-to-side and corner-to-corner: does any fold make two halves that match exactly?',
    explain: none ? `The ${SYM_SHAPES[good].name} has no lines of symmetry.` : `The ${SYM_SHAPES[good].name} has ${u(SYM_SHAPES[good].n, 'line')} of symmetry.`,
    ...mcV(rng, V(good), bad.map(V)),
  };
};

const syPickLine = (rng, t) => {
  const opts = [];
  for (const s of Object.keys(SYM_SHAPES)) for (const line of ['vertical', 'horizontal']) opts.push({ shape: s, line, ok: SYM_SHAPES[s][line === 'vertical' ? 'v' : 'h'] });
  for (const L of Object.keys(LETTERS)) for (const line of ['vertical', 'horizontal']) opts.push({ shape: `letter:${L}`, line, ok: !!LETTERS[L][line === 'vertical' ? 0 : 1] });
  const good = pick(rng, opts.filter((o) => o.ok));
  const bad = sample(rng, opts.filter((o) => !o.ok), 3);
  const V = (o) => ({ type: 'symmetry', shape: o.shape, line: o.line });
  return {
    prompt: 'In which picture is the dashed line a line of symmetry?',
    hint: 'For each picture, imagine folding along its dashed line. Only one fold makes two halves that match exactly, like a mirror.',
    explain: 'Only one dashed line splits its shape into two halves that match exactly when folded.',
    ...mcV(rng, V(good), bad.map(V)),
  };
};

const CONG_SHAPES = ['triangle', 'right_triangle', 'rectangle', 'trapezoid', 'parallelogram', 'kite', 'irregular_pentagon', 'irregular_hexagon', 'arrow', 'semicircle', 'heart', 'star'];
const cgWhich = (rng, t) => {
  const s = pick(rng, CONG_SHAPES);
  const col = pick(rng, COLOURS);
  const other = pick(rng, CONG_SHAPES.filter((x) => x !== s));
  const rot = pick(rng, [90, 180, 270, 45]);
  const good = { type: 'shapes', items: [{ shape: s, size: 'm', color: pick(rng, COLOURS), rotate: t >= 3 ? rot : 0 }] };
  const wrongs = [
    { type: 'shapes', items: [{ shape: s, size: 's', color: col, rotate: t >= 4 ? pick(rng, [0, 90, 180]) : 0 }] },
    { type: 'shapes', items: [{ shape: s, size: 'l', color: col, rotate: t >= 4 ? pick(rng, [0, 90, 180]) : 0 }] },
    { type: 'shapes', items: [{ shape: other, size: 'm', color: col }] },
  ];
  return {
    prompt: 'Which shape is congruent to the shape shown?',
    visual: { type: 'shapes', items: [{ shape: s, size: 'm', color: col }] },
    hint: 'Congruent means the same shape AND the same size; it can be turned or flipped and still be congruent. A bigger or smaller copy is NOT congruent, and neither is a different shape. Check each choice for shape, then for size.',
    explain: `The congruent shape is the same shape and the same size${t >= 3 ? ', just turned' : ''}. A bigger or smaller copy is not congruent.`,
    ...mcV(rng, good, wrongs),
  };
};

function polyPts(rng) {
  return pick(rng, [
    [[0, 0], [3, 0], [3, 2], [0, 2]], [[0, 0], [2, 0], [2, 2], [0, 2]], [[0, 0], [3, 0], [0, 2]], [[0, 0], [4, 0], [2, 3]],
    [[0, 0], [2, 0], [2, 1], [1, 1], [1, 3], [0, 3]], [[0, 0], [3, 0], [3, 1], [1, 1], [1, 2], [0, 2]], [[0, 0], [4, 0], [3, 2], [1, 2]],
  ]);
}
const cgGrid = (rng, t) => {
  const base = polyPts(rng);
  const ox = randInt(rng, 0, 1), oy = randInt(rng, 0, 1);
  const orig = base.map(([x, y]) => [x + ox, y + oy]);
  const kind = pick(rng, ['slide', 'flip', 'stretch', 'bigger']);
  const maxX = Math.max(...base.map((p) => p[0]));
  let image, cong;
  if (kind === 'slide') { const dx = randInt(rng, 5, 6) - ox, dy = randInt(rng, 0, 4); image = orig.map(([x, y]) => [x + dx, y + dy]); cong = true; }
  else if (kind === 'flip') { const mx = Math.max(...orig.map((p) => p[0])); image = orig.map(([x, y]) => [2 * mx + 1 - x, y]); cong = true; }
  else if (kind === 'bigger' && maxX <= 2) { image = base.map(([x, y]) => [2 * x + 6, 2 * y + 1]); cong = false; }
  else { image = base.map(([x, y]) => [x + 6, 2 * y + 1]); cong = false; }
  return {
    prompt: 'Are the two shapes congruent?',
    visual: { type: 'transform', grid: 10, original: orig, image },
    hint: 'Count the squares along each side of the first shape, then along the matching sides of the second. "Yes" means every side matches, even if the shape moved or flipped. "No" means some sides are longer or shorter.',
    explain: cong ? 'Both shapes have the same side lengths and angles. One has just moved (or flipped), so they are congruent.' : 'The second shape has different side lengths, so it is not congruent.',
    ...fixedChoices(['Yes', 'No'], cong ? 'Yes' : 'No'),
  };
};

const pgClassify = (rng, t) => {
  const POLYN = { triangle: 3, right_triangle: 3, square: 4, rectangle: 4, trapezoid: 4, parallelogram: 4, pentagon: 5, irregular_pentagon: 5, hexagon: 6, irregular_hexagon: 6, octagon: 8 };
  const NAMES = { 3: 'triangles', 4: 'quadrilaterals', 5: 'pentagons', 6: 'hexagons', 8: 'octagons' };
  const n = pick(rng, [3, 4, 5, 6]);
  const group = (k, cnt) => sample(rng, Object.keys(POLYN).filter((s) => POLYN[s] === k), cnt);
  const good = { type: 'shapes', items: group(n, Math.min(3, Object.keys(POLYN).filter((s) => POLYN[s] === n).length)).map((s) => ({ shape: s, color: pick(rng, COLOURS), size: 's' })) };
  const mixedGroup = () => ({ type: 'shapes', items: [...group(n, 1), ...sample(rng, Object.keys(POLYN).filter((s) => POLYN[s] !== n), 2)].map((s) => ({ shape: s, color: pick(rng, COLOURS), size: 's' })) });
  return {
    prompt: `Which group has only ${NAMES[n]}?`,
    hint: `Which group has only ${NAMES[n]}? ${cap(NAMES[n])} have ${n} sides. Count the sides of EVERY shape in each group: one wrong shape means that group is out.`,
    explain: `Every shape in the right group has ${n} sides.`,
    ...mcV(rng, good, [mixedGroup(), mixedGroup(), mixedGroup()]),
  };
};

const syPreview = (rng, t) => {
  const base = polyPts(rng);
  const kind = pick(rng, ['slide', 'flip']);
  const orig = base.map(([x, y]) => [x + 1, y + 1]);
  const mx = Math.max(...orig.map((p) => p[0]));
  const dy = randInt(rng, 0, 3);
  const image = kind === 'slide' ? orig.map(([x, y]) => [x + 5, y + dy]) : orig.map(([x, y]) => [2 * mx + 1 - x, y]);
  return {
    prompt: 'Big challenge! How did the shape move?',
    visual: { type: 'transform', grid: 10, original: orig, image },
    hint: 'A slide (translation) moves the shape without turning or flipping it. A flip (reflection) makes a mirror image. A turn (rotation) spins it around a point. Compare which way the shape faces before and after.',
    explain: kind === 'slide' ? 'The shape moved over without turning or flipping: a slide (translation).' : 'The shape is a mirror image across the line: a flip (reflection).',
    ...fixedChoices(['A slide (translation)', 'A flip (reflection)', 'A turn (rotation)'], kind === 'slide' ? 'A slide (translation)' : 'A flip (reflection)'),
  };
};

const g4Polygons = {
  id: 'g4-geo-polygons', grade: 4, strand: 'shape', bigIdea: 'geometry', species: 'mirrorwing',
  name: 'Symmetry & Congruence',
  parentDesc: 'Investigates and classifies polygons: identifies symmetrical shapes, finds lines of symmetry, and recognizes congruent shapes.',
  classic: false,
  gen: tiered([
    [1, 4, syIsLine, 3], [1, 3, pgClassify, 1], [1, 5, syWhich, 2], [3, 6, syCount, 2], [4, 7, syPickLine, 1.5], [1, 6, cgWhich, 2], [5, 7, cgGrid, 1.5],
    [6, 7, syCount, 1], [7, 7, syPreview, 0.6, PREVIEW], [6, 7, cgWhich, 1],
  ]),
};

// ---------------------------------------------------------------------------
// SD13 Data: first- and second-hand data, many-to-one graphs, interpreting displays
// ---------------------------------------------------------------------------
const D4_TOPICS = [
  { title: 'Moose Seen in Parks', labels: ['Fundy', 'Kouchibouguac', 'Mount Carleton', 'Parlee Beach'], noun: 'moose', icon: '🫎' },
  { title: 'Books Borrowed', labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], noun: 'books', icon: '📘' },
  { title: 'Favourite Fruit', labels: ['Apples', 'Bananas', 'Grapes', 'Oranges', 'Pears'], noun: 'students', icon: '🍎' },
  { title: 'Birds Counted', labels: ['Chickadees', 'Blue jays', 'Robins', 'Crows', 'Sparrows'], noun: 'birds', icon: '🐦' },
  { title: 'Potions Sold', labels: ['Blue', 'Green', 'Gold', 'Purple'], noun: 'potions', icon: '🧪' },
  { title: 'Visitors to the Fair', labels: ['Friday', 'Saturday', 'Sunday'], noun: 'visitors', icon: '😀' },
  { title: 'Cans Collected', labels: ['Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'], noun: 'cans', icon: '🥫' },
  { title: 'Favourite Sport', labels: ['Soccer', 'Hockey', 'Swimming', 'Basketball'], noun: 'students', icon: '⚽' },
];
function data4(rng, t, k) {
  const T = pick(rng, D4_TOPICS);
  const n = Math.min(k || randInt(rng, 3, 4), T.labels.length);
  const labels = sample(rng, T.labels, n);
  const key = pick(rng, t <= 2 ? [2, 5] : [2, 5, 10]);
  const half = t >= 3 && key !== 5 ? true : t >= 4;
  const values = [];
  while (values.length < n) {
    const whole = randInt(rng, 1, 8);
    let v = whole * key;
    if (half && chance(rng, 0.35) && key % 2 === 0) v += key / 2;
    if (!values.includes(v)) values.push(v);
  }
  return { T, labels, values, key };
}
const picVis = (D) => ({ type: 'pictograph', title: D.T.title, rows: D.labels.map((l, i) => ({ label: l, count: D.values[i] })), icon: D.T.icon, key: D.key });
const barVis = (rng, D, scale) => ({ type: 'bargraph', title: D.T.title, labels: D.labels, values: D.values, scale: scale || D.key, horizontal: chance(rng, 0.4), yLabel: `Number of ${D.T.noun}` });

const dt4PicRead = (rng, t) => {
  const D = data4(rng, t);
  const i = randInt(rng, 0, D.labels.length - 1);
  const v = D.values[i];
  const icons = v / D.key;
  const q = {
    prompt: `Each ${D.T.icon} stands for ${D.key} ${D.T.noun}. How many ${D.T.noun} for ${D.labels[i]}?`,
    visual: picVis(D),
    hint: `How many ${D.T.noun} for ${D.labels[i]}? Each ${D.T.icon} stands for ${numWords(D.key)}. Count the whole pictures in that row and count by ${numWords(D.key)}s${D.key % 2 === 0 ? `; a half picture stands for ${numWords(D.key / 2)}` : ''}.`,
    explain: `${D.labels[i]} has ${Number.isInteger(icons) ? icons : `${Math.floor(icons)} and a half`} pictures. ${Math.floor(icons)} × ${D.key} = ${Math.floor(icons) * D.key}${Number.isInteger(icons) ? '' : ` and half of ${D.key} is ${D.key / 2}, so ${v}`}.`,
  };
  if (chance(rng, 0.5)) return { ...q, kind: 'num', answer: num(v) };
  return { ...q, ...mcN(rng, v, [Math.ceil(icons), v + D.key, v - D.key, Math.floor(icons) * D.key, v + D.key / 2].filter((x) => x > 0 && x !== v)) };
};

const dt4BarRead = (rng, t) => {
  const D = data4(rng, t);
  const scale = pick(rng, [D.key, D.key * 2].filter((s) => D.values.every((v) => (v * 2) % s === 0)));
  const i = randInt(rng, 0, D.labels.length - 1);
  const v = D.values[i];
  const q = {
    prompt: D.T.noun === 'students' ? `How many students chose ${D.labels[i].toLowerCase()}?` : `How many ${D.T.noun} for ${D.labels[i]}?`,
    visual: barVis(rng, D, scale),
    hint: `Find the ${D.labels[i]} bar and follow its end across to the scale. Each grid line counts by ${numWords(scale)}s, and a bar that stops halfway between two lines is halfway between their numbers.`,
    explain: `The ${D.labels[i]} bar ends at ${v}.`,
  };
  if (chance(rng, 0.45)) return { ...q, kind: 'num', answer: num(v) };
  return { ...q, ...mcN(rng, v, [v + scale, v - scale, v / scale, v + scale / 2].filter((x) => x > 0 && Number.isInteger(x) && x !== v)) };
};

const dt4Compare = (rng, t) => {
  const D = data4(rng, t);
  const usePic = chance(rng, 0.5);
  const vis = usePic ? picVis(D) : barVis(rng, D);
  const keyTxt = usePic ? `Each ${D.T.icon} = ${D.key}. ` : '';
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const [i, j] = sample(rng, D.labels.map((_, x) => x), 2);
    const [a, b] = D.values[i] > D.values[j] ? [i, j] : [j, i];
    return { kind: 'num', prompt: `${keyTxt}How many more ${D.T.noun} for ${D.labels[a]} than for ${D.labels[b]}?`, visual: vis, hint: `How many more for ${D.labels[a]} than ${D.labels[b]}? ${usePic ? `Use the key (each picture = ${numWords(D.key)}) to find each row's number` : 'Read each bar on the scale'}. Then subtract the smaller number from the bigger one.`, explain: `${D.labels[a]}: ${D.values[a]}. ${D.labels[b]}: ${D.values[b]}. ${D.values[a]} − ${D.values[b]} = ${D.values[a] - D.values[b]}.`, answer: num(D.values[a] - D.values[b]) };
  }
  if (k === 1) {
    const tot = D.values.reduce((s, x) => s + x, 0);
    return { kind: 'num', prompt: `${keyTxt}How many ${D.T.noun} in all?`, visual: vis, hint: `How many in all? ${usePic ? `Use the key (each picture = ${numWords(D.key)}) to turn every row into a number` : 'Read the number for every bar'}. Then add all the numbers together.`, explain: `${D.values.join(' + ')} = ${tot}.`, answer: num(tot) };
  }
  const most = chance(rng, 0.5);
  const tv = most ? Math.max(...D.values) : Math.min(...D.values);
  const lab = D.labels[D.values.indexOf(tv)];
  return { prompt: `${keyTxt}Which has the ${most ? 'most' : 'fewest'} ${D.T.noun}?`, visual: vis, hint: `Which has the ${most ? 'most' : 'fewest'}? ${usePic ? `Every picture is worth the same, so the ${most ? 'longest' : 'shortest'} row of pictures wins.` : `The ${most ? 'longest' : 'shortest'} bar wins.`} Compare them carefully.`, explain: `${lab} has ${tv}, the ${most ? 'most' : 'fewest'}.`, ...mcP(rng, lab, D.labels.filter((l) => l !== lab), [], String) };
};

const dt4Key = (rng, t) => {
  const k = randInt(rng, 0, 1);
  if (k === 0) {
    const key = pick(rng, [2, 5, 10]);
    const n = randInt(rng, 2, 9);
    const half = key !== 5 && chance(rng, 0.4);
    const v = n * key + (half ? key / 2 : 0);
    return {
      prompt: `In a pictograph, each ⭐ stands for ${key}. How many stars show ${v}?`,
      hint: `How many stars show ${v}? Each star stands for ${key}, so ask: how many groups of ${key} are in ${v}? ${half ? 'If half a group is left over, use half a star.' : 'Skip count by ' + key + 's to check.'}`,
      explain: `${v} ÷ ${key} = ${n}${half ? ' and a half' : ''}, so ${n}${half ? ' and a half' : ''} stars.`,
      ...mcP(rng, half ? `${n} and a half stars` : `${n} stars`, [`${v} stars`, `${n + 1} stars`, half ? `${n} stars` : `${n} and a half stars`, `${Math.max(1, n - 1)} stars`], [], String),
    };
  }
  const key = pick(rng, [5, 10, 20]);
  const vals = sample(rng, [1, 2, 3, 4, 5, 6, 7, 8], 3).map((x) => x * key);
  return {
    prompt: `The data is ${vals.join(', ')}. Which key makes the best pictograph?`,
    hint: `Which key works best for ${vals.join(', ')}? A good key divides EVERY number evenly (no leftover pieces) and keeps the rows short. Test each key on all three numbers.`,
    explain: `All the numbers are multiples of ${key}, so each picture = ${key} works well: ${vals.map((v) => `${v / key} pictures`).join(', ')}.`,
    ...mcP(rng, `Each picture = ${key}`, [`Each picture = ${key === 5 ? 3 : 3}`, `Each picture = ${key * 7}`, 'Each picture = 1'], [], String),
  };
};

const FH = [(p) => `${p} surveys classmates about their favourite fruit.`, (p) => `${p} counts the trucks passing the school for 10 minutes.`, (p) => `${p} measures the rainfall in a gauge each day.`, (p) => `${p} times friends running a lap.`, (p) => `${p} records the colours of cars in the parking lot.`];
const SH = [(p) => `${p} uses a chart of moose sightings from a government website.`, (p) => `${p} reads last year's weather records in the newspaper.`, (p) => `${p} finds the heights of mountains in an atlas.`, (p) => `${p} looks up hockey scores online.`, (p) => `${p} uses a graph from a library book about whales.`];
const dt4FirstSecond = (rng, t) => {
  const first = chance(rng, 0.5);
  const p = nm(rng);
  const s = pick(rng, first ? FH : SH)(p);
  if (chance(rng, 0.5)) {
    return {
      prompt: `${s} Is this first-hand or second-hand data?`,
      hint: `First-hand data means ${p} collects it themself, by counting, measuring or asking. Second-hand data means someone else collected it first (a website, book, newspaper or chart). Who did the collecting here?`,
      explain: first ? `${p} collects it directly: first-hand data.` : `Someone else collected it: second-hand data.`,
      ...fixedChoices(['First-hand data', 'Second-hand data'], first ? 'First-hand data' : 'Second-hand data'),
    };
  }
  const q = pick(rng, [['How many moose live in New Brunswick?', 'Second-hand data'], ['What is the favourite snack in our class?', 'First-hand data'], ['How tall are the plants in our class garden?', 'First-hand data'], ['What was the coldest day in Canada last year?', 'Second-hand data'], ['How many students walk to our school?', 'First-hand data'], ['How long is the longest river in the world?', 'Second-hand data']]);
  return {
    prompt: `${p} wants to answer: "${q[0]}" Which kind of data would work best?`,
    hint: `First-hand data means you collect it yourself by counting, measuring or asking. Second-hand data means you look up what someone else collected. Could ${p} find this out right now by asking or measuring, or would ${p} need to look it up?`,
    explain: q[1] === 'First-hand data' ? `${p} can collect this directly, so first-hand data works.` : `${p} cannot measure this directly and needs to look it up: second-hand data.`,
    ...fixedChoices(['First-hand data', 'Second-hand data'], q[1]),
  };
};

const dt4Match = (rng, t) => {
  const D = data4(rng, Math.max(t, 3), 3);
  const bv = (vals) => ({ type: 'bargraph', title: D.T.title, labels: D.labels, values: vals, scale: D.key, yLabel: `Number of ${D.T.noun}` });
  const sw = D.values.slice(); [sw[0], sw[1]] = [sw[1], sw[0]];
  const icons = D.values.map((v) => v / D.key);
  return {
    prompt: `Each ${D.T.icon} = ${D.key}. Which bar graph shows the same data as the pictograph?`,
    visual: picVis(D),
    hint: `Which bar graph shows the same data? Use the key (each ${D.T.icon} = ${numWords(D.key)}) to turn every row of the pictograph into a number. Then check every bar of each graph against those numbers.`,
    explain: `Using the key: ${D.labels.map((l, i) => `${l} = ${D.values[i]}`).join(', ')}.`,
    ...mcV(rng, bv(D.values), [bv(icons), bv(sw), bv(D.values.map((v, i) => (i === 2 ? v + D.key : v)))]),
  };
};

const dt4Critical = (rng, t) => {
  const D = data4(rng, Math.max(t, 4), 4);
  const L = D.labels, V = D.values;
  const [i, j] = sample(rng, [0, 1, 2, 3].slice(0, L.length), 2);
  const tot = V.reduce((s, x) => s + x, 0);
  const trueS = [`${V[i] > V[j] ? L[i] : L[j]} has more than ${V[i] > V[j] ? L[j] : L[i]}.`, `The total is ${tot}.`, `${L[i]} and ${L[j]} together have ${V[i] + V[j]}.`, `${L[i]} has ${V[i]}.`];
  const falseS = [`${V[i] > V[j] ? L[j] : L[i]} has more than ${V[i] > V[j] ? L[i] : L[j]}.`, `The total is ${tot + D.key}.`, `${L[j]} has ${V[j] % D.key === 0 ? V[j] / D.key : V[j] - 1}.`, `${L[i]} has ${V[i] + D.key}.`];
  const usePic = chance(rng, 0.5);
  return {
    prompt: `${usePic ? `Each ${D.T.icon} = ${D.key}. ` : ''}Which statement is true?`,
    visual: usePic ? picVis(D) : barVis(rng, D),
    hint: usePic ? `Which statement is true? Each picture stands for ${numWords(D.key)}, so first turn every row into a number. Then test each statement: "more than" (compare), "together" (add two), "total" (add all) and "has" (the exact number).` : 'Which statement is true? Read every bar carefully on the scale. Then test each statement: "more than" (compare), "together" (add two), "total" (add all) and "has" (the exact number).',
    explain: `${L.map((l, k) => `${l}: ${V[k]}`).join(', ')}.`,
    ...mcP(rng, pick(rng, trueS), falseS, [], String),
  };
};

const dt4Preview = (rng, t) => {
  const labels = sample(rng, ['Apples', 'Pears', 'Grapes', 'Plums'], 3);
  const a = labels.map(() => randInt(rng, 2, 9) * 2), b = labels.map(() => randInt(rng, 2, 9) * 2);
  const i = randInt(rng, 0, 2);
  return {
    kind: 'num',
    prompt: `Big challenge! This double bar graph compares two classes. How many more students in Class A than Class B chose ${labels[i].toLowerCase()}?`,
    visual: { type: 'bargraph', title: 'Favourite Fruit', labels, values: a, series1Name: 'Class A', series2: { name: 'Class B', values: b }, scale: 2 },
    hint: `Find the two bars for ${labels[i].toLowerCase()}: one for Class A and one for Class B. Read both numbers from the scale, then subtract the smaller from the bigger.`,
    explain: `Class A: ${a[i]}. Class B: ${b[i]}. ${a[i]} − ${b[i]} = ${a[i] - b[i]}.`,
    answer: num(a[i] - b[i]),
    _ok: a[i] > b[i],
  };
};
const dt4PreviewWrap = (rng, t) => {
  for (let g = 0; g < 20; g++) { const q = dt4Preview(rng, t); if (q._ok) { const { _ok, ...r } = q; return r; } }
  return dt4Critical(rng, t);
};

const g4Data = {
  id: 'g4-data-data', grade: 4, strand: 'stats', bigIdea: 'data', species: 'datapup',
  name: 'Pictographs & Bar Graphs',
  parentDesc: 'Tells first-hand from second-hand data, reads and makes pictographs and bar graphs where one symbol or grid square stands for many, and interprets and compares displays.',
  classic: false,
  gen: tiered([
    [1, 4, dt4PicRead, 2.5], [1, 4, dt4BarRead, 2], [2, 7, dt4Compare, 2], [3, 5, dt4Key, 1.2], [2, 5, dt4FirstSecond, 1.2], [4, 7, dt4Match, 1.2], [5, 7, dt4Critical, 2], [7, 7, dt4PreviewWrap, 0.6, PREVIEW],
  ]),
};

// ---------------------------------------------------------------------------
// SD14 Chance: can't-both-happen events, independent events, equal-chance experiments
// ---------------------------------------------------------------------------
const ch4Outcomes = (rng, t) => {
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const n = randInt(rng, 2, 8);
    const cols = sample(rng, COLOURS, Math.min(n, 8));
    return {
      kind: 'num',
      prompt: 'This spinner has equal sections. How many different outcomes can it land on?',
      visual: { type: 'spinner', sections: cols.map((c, i) => ({ color: c, label: String(i + 1) })) },
      hint: 'How many outcomes? Each section is one possible place for the spinner to stop. Count the sections.',
      explain: `There are ${n} sections, so ${n} possible outcomes, all equally likely.`,
      answer: num(n),
    };
  }
  if (k === 1) {
    const die = chance(rng, 0.6);
    return {
      kind: 'num',
      prompt: die ? 'You roll one regular die. How many different outcomes are possible?' : 'You flip a coin. How many different outcomes are possible?',
      visual: die ? { type: 'dice', values: [randInt(rng, 1, 6)] } : undefined,
      hint: die ? 'How many different results can one roll have? Picture a die: each face shows a different number of dots. Count the faces.' : 'What different ways can a coin land? Name each side of the coin, then count them.',
      explain: die ? 'A die can land on 1, 2, 3, 4, 5 or 6: 6 outcomes.' : 'A coin can land on heads or tails: 2 outcomes.',
      answer: num(die ? 6 : 2),
    };
  }
  const bad = pick(rng, [0, 7, 8, 9, 10, 12]);
  const good = sample(rng, [1, 2, 3, 4, 5, 6], 3);
  return {
    prompt: 'You roll one regular die. Which is NOT a possible outcome?',
    visual: { type: 'dice', values: [randInt(rng, 1, 6)] },
    hint: 'Which result cannot happen on one roll? A regular die only has faces showing 1 to 6 dots. Check each choice: is that number on a face?',
    explain: `${bad} is not on a regular die, so it cannot happen.`,
    ...mcP(rng, String(bad), good.map(String), [], String),
  };
};

const ch4Fair = (rng, t) => {
  const fair = chance(rng, 0.5);
  const n = randInt(rng, 2, 4);
  const cols = sample(rng, COLOURS.slice(0, 6), n);
  const sizes = fair ? Array(n).fill(1) : shuffle(rng, [3, ...Array(n - 1).fill(1)]);
  return {
    prompt: 'Is every colour equally likely on this spinner?',
    visual: { type: 'spinner', sections: cols.map((c, i) => ({ color: c, label: cap(c), size: sizes[i] })) },
    hint: '"Yes, all equally likely" means every section is exactly the same size. "No, not equally likely" means at least one section is bigger than another. Compare the sizes of the sections.',
    explain: fair ? 'All the sections are the same size, so each colour has an equal chance.' : 'One section is bigger, so that colour is more likely. The chances are not equal.',
    ...fixedChoices(['Yes, all equally likely', 'No, not equally likely'], fair ? 'Yes, all equally likely' : 'No, not equally likely'),
  };
};

const ch4CantBoth = (rng, t) => {
  const kind = pick(rng, ['die', 'spinner']);
  if (kind === 'die') {
    const [a, b] = sample(rng, [1, 2, 3, 4, 5, 6], 2);
    const good = `rolling a ${a} and rolling a ${b}`;
    const both = [
      `rolling a ${2 * randInt(rng, 1, 3)} and rolling an even number`, `rolling a ${2 * randInt(rng, 0, 2) + 1} and rolling an odd number`,
      `rolling a ${randInt(rng, 4, 6)} and rolling a number greater than 3`, `rolling a ${randInt(rng, 1, 3)} and rolling a number less than 4`,
    ];
    return {
      prompt: 'You roll one die once. Which two events can NOT both happen?',
      visual: { type: 'dice', values: [randInt(rng, 1, 6)] },
      hint: 'Which two events can NOT happen on the same roll? One roll shows only one number. For each choice, try to find ONE number that makes both parts true; if there is none, those events cannot both happen.',
      explain: `One roll can't show both ${a} and ${b}, so they can't both happen. In the other choices, one number can make both true.`,
      ...mcP(rng, cap(good), sample(rng, both, 3).map(cap), [], String),
    };
  }
  const cols = sample(rng, COLOURS.slice(0, 6), 3);
  const good = `landing on ${cols[0]} and landing on ${cols[1]}`;
  return {
    prompt: 'You spin this spinner once. Which two events can NOT both happen?',
    visual: { type: 'spinner', sections: cols.map((c, i) => ({ color: c, label: `${cap(c)} ${i + 1}` })) },
    hint: 'The arrow stops on only one section. For each choice, try to find ONE section that makes both parts true (check its colour and its number). If no section works, those events cannot both happen.',
    explain: `The spinner can't land on ${cols[0]} and ${cols[1]} at the same time.`,
    ...mcP(rng, cap(good), [`Landing on ${cols[0]} and landing on an odd number`, `Landing on ${cols[2]} and landing on 3`, `Landing on ${cols[1]} and landing on 2`].filter((x) => {
      // only keep true "can both happen" statements
      if (x.includes(cols[0]) && x.includes('odd')) return true;
      if (x.includes(cols[2]) && x.includes('3')) return true;
      if (x.includes(cols[1]) && x.includes('2')) return true;
      return false;
    }), [], String),
  };
};

const ch4Independent = (rng, t) => {
  const who = nm(rng);
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const n = randInt(rng, 3, 7);
    const side = pick(rng, ['heads', 'tails']);
    const other = side === 'heads' ? 'tails' : 'heads';
    return {
      prompt: `${who} flipped a coin and got ${side} ${n} times in a row. What is true about the next flip?`,
      hint: `Does the coin remember the last ${n} flips? Each flip is brand new, because a coin has no memory. Check each choice: does it say the chances changed, or stayed the same?`,
      explain: 'Each flip is independent: earlier flips do not change the next one. Heads and tails are still equally likely.',
      ...mcP(rng, 'Heads and tails are still equally likely', [`${cap(other)} is more likely now`, `${cap(side)} is more likely now`, `It will surely be ${other}`], [], String),
    };
  }
  if (k === 1) {
    const v = randInt(rng, 1, 6);
    return {
      prompt: `${who} just rolled a ${v}. Is ${who} less likely to roll a ${v} on the next roll?`,
      visual: { type: 'dice', values: [v] },
      hint: `Does rolling a ${v} change the next roll? Each roll is brand new; the die does not remember. Check each choice: does it say the chance went down, went up, or stayed the same?`,
      explain: `No. Each roll is independent, so a ${v} is just as likely as before: 1 out of 6.`,
      ...mcP(rng, `No, a ${v} is just as likely as before`, [`Yes, a ${v} is less likely now`, `Yes, a ${v} cannot come again`, `No, a ${v} is more likely now`], [], String),
    };
  }
  return {
    prompt: `${who} flips a coin and rolls a die at the same time. Does the coin change what the die will show?`,
    visual: { type: 'dice', values: [randInt(rng, 1, 6)] },
    hint: 'Is the die connected to the coin? They are separate things, and how one lands cannot push the other. Check each choice with that in mind.',
    explain: 'The coin and the die are independent events: one does not affect the other.',
    ...mcP(rng, 'No, they are independent', ['Yes, heads makes a 6 more likely', 'Yes, tails makes an even number more likely'], [], String),
  };
};

const ch4Experiment = (rng, t) => {
  const k = randInt(rng, 0, 2);
  const who = nm(rng);
  if (k === 0) {
    const n = pick(rng, [10, 20, 30, 40, 50, 100]);
    return {
      prompt: `${who} flips a coin ${n} times. About how many heads should ${who} expect?`,
      hint: `How many heads should you expect in ${n} flips? Heads and tails are equally likely, so about half of the flips should be heads. Split ${n} into 2 equal groups.`,
      explain: `About half: ${n} ÷ 2 = ${n / 2}. It might not be exactly ${n / 2}, but it should be close.`,
      ...mcP(rng, `About ${n / 2}`, [`About ${n}`, `About ${Math.max(1, n / 10)}`, `About ${n - 2}`], [], String),
    };
  }
  if (k === 1) {
    const m = pick(rng, [6, 12, 30, 60]);
    const v = randInt(rng, 1, 6);
    return {
      prompt: `${who} rolls a die ${m} times. About how many times should ${who} expect to roll a ${v}?`,
      visual: { type: 'dice', values: [v] },
      hint: `How many times should a ${v} come up in ${m} rolls? All 6 numbers are equally likely, so each should come up about the same number of times. Split ${m} into 6 equal groups.`,
      explain: `${m} ÷ 6 = ${m / 6}. Each number should come up about ${m / 6} times.`,
      ...mcP(rng, `About ${m / 6}`, [`About ${m / 2}`, `About ${m}`, `About ${v}`].filter((x) => x !== `About ${m / 6}`), [`About ${m / 3}`], String),
    };
  }
  const n = pick(rng, [2, 4, 5]), spins = n * pick(rng, [5, 10, 20]);
  const cols = sample(rng, COLOURS.slice(0, 6), Math.min(n, 5));
  return {
    prompt: `This spinner has ${n} equal sections. ${who} spins it ${spins} times. About how many times should it land on ${cols[0]}?`,
    visual: { type: 'spinner', sections: cols.map((c) => ({ color: c, label: cap(c) })) },
    hint: `About how many times should it land on ${cols[0]}? All ${n} sections are the same size, so each colour comes up about the same number of times. Split ${spins} into ${n} equal groups.`,
    explain: `${spins} ÷ ${n} = ${spins / n}. About ${spins / n} times for each colour.`,
    ...mcP(rng, `About ${spins / n}`, [`About ${spins}`, `About ${spins / 2 === spins / n ? spins / 4 : spins / 2}`, `About ${n}`].filter((x) => x !== `About ${spins / n}`), [], String),
  };
};

const ch4Compare = (rng, t) => {
  const cols = sample(rng, COLOURS.slice(0, 6), 3);
  const sizes = shuffle(rng, [1, 2, 3]);
  const [a, b] = sample(rng, [0, 1, 2], 2);
  const ans = sizes[a] > sizes[b] ? `${cap(cols[a])} is more likely` : `${cap(cols[b])} is more likely`;
  return {
    prompt: `Compare landing on ${cols[a]} and landing on ${cols[b]}.`,
    visual: { type: 'spinner', sections: cols.map((c, i) => ({ color: c, label: cap(c), size: sizes[i] })) },
    hint: `Compare the ${cols[a]} section and the ${cols[b]} section. A bigger section means a better chance of landing there; the same size means equally likely. Which section is bigger?`,
    explain: `The ${sizes[a] > sizes[b] ? cols[a] : cols[b]} section is bigger, so ${ans.toLowerCase()}.`,
    ...fixedChoices([`${cap(cols[a])} is more likely`, `${cap(cols[b])} is more likely`, 'They are equally likely'], ans),
  };
};

const ch4Preview = (rng, t) => {
  const v = randInt(rng, 1, 6);
  const k = chance(rng, 0.5);
  return {
    prompt: k ? `Big challenge! On one roll of a die, what is the chance of rolling a ${v}?` : 'Big challenge! On one roll of a die, what is the chance of rolling an even number?',
    visual: { type: 'dice', values: [v] },
    hint: k ? `What is the chance of rolling a ${v}? Count how many faces show a ${v}, then write that number "out of" all the faces on a die.` : 'What is the chance of rolling an even number? Count the faces that show an even number, then write that number "out of" all the faces on a die.',
    explain: k ? `One face out of 6 is a ${v}: 1 out of 6.` : 'The even faces are 2, 4 and 6: 3 out of 6.',
    ...mcP(rng, k ? '1 out of 6' : '3 out of 6', k ? ['6 out of 6', '1 out of 2', `${v} out of 6`] : ['2 out of 6', '1 out of 6', '6 out of 3'], [], String),
  };
};

const g4Chance = {
  id: 'g4-data-chance', grade: 4, strand: 'stats', bigIdea: 'data', species: 'chancewing',
  name: 'Fair Chances',
  parentDesc: 'Identifies events that cannot both happen, understands independent events, and reasons about equal-chance experiments with coins, dice and spinners.',
  classic: false,
  gen: tiered([
    [1, 4, ch4Outcomes, 2], [1, 4, ch4Fair, 2], [2, 5, ch4Compare, 1.2], [3, 7, ch4CantBoth, 2], [4, 7, ch4Independent, 2], [3, 7, ch4Experiment, 2], [7, 7, ch4Preview, 0.6, PREVIEW],
  ]),
};

// ---------------------------------------------------------------------------
// SD15 Money: coins and bills to $100, decimal notation, English vs French notation, earning money
// ---------------------------------------------------------------------------
const CV = { nickel: 5, dime: 10, quarter: 25, loonie: 100, toonie: 200, bill5: 500, bill10: 1000, bill20: 2000, bill50: 5000, bill100: 10000 };
const CN = { nickel: 'nickel', dime: 'dime', quarter: 'quarter', loonie: 'loonie', toonie: 'toonie', bill5: '$5 bill', bill10: '$10 bill', bill20: '$20 bill', bill50: '$50 bill', bill100: '$100 bill' };
const ORD = ['bill100', 'bill50', 'bill20', 'bill10', 'bill5', 'toonie', 'loonie', 'quarter', 'dime', 'nickel'];
const sumC = (items) => items.reduce((s, c) => s + CV[c], 0);
const sortC = (items) => items.slice().sort((a, b) => CV[b] - CV[a]);
const greedy = (c, noHundred) => { const out = []; for (const k of ORD) { if (noHundred && k === 'bill100') continue; while (c >= CV[k]) { out.push(k); c -= CV[k]; } } return out; };
const descC = (items) => ORD.filter((k) => items.includes(k)).map((k) => { const n = items.filter((x) => x === k).length; return `${n} ${CN[k]}${n > 1 ? 's' : ''}`; }).join(', ');
function randMoney(rng, t) {
  const types = t <= 1 ? ['bill10', 'bill5', 'toonie', 'loonie', 'quarter', 'dime'] : ['bill50', 'bill20', 'bill10', 'bill5', 'toonie', 'loonie', 'quarter', 'dime', 'nickel'];
  const capC = t <= 1 ? 3000 : 10000;
  const items = [];
  const n = randInt(rng, 4, 8);
  for (let i = 0; i < 20 && items.length < n; i++) { const c = pick(rng, types); if (sumC([...items, c]) <= capC) items.push(c); }
  return items.length >= 2 ? items : ['bill20', 'toonie', 'quarter'];
}

const mn4Count = (rng, t) => {
  const items = randMoney(rng, t);
  const total = sumC(items);
  const drop = total - CV[pick(rng, items)];
  return {
    prompt: pick(rng, ['How much money is shown?', 'Count the money. How much is there?']),
    visual: { type: 'coins', items: t <= 2 ? sortC(items) : shuffle(rng, items) },
    hint: 'How much money is shown? Start with the bill or coin worth the most and count on: fifty, twenty, ten and five dollar bills, then toonies, loonies, quarters, dimes and nickels.',
    explain: `${descC(items)}: ${money(total)}.`,
    ...mcP(rng, money(total), [money(drop), money(total + 25), money(total + 100), money(total - 5), money(total + 1000)].filter((x) => !x.includes('-')), [], String),
  };
};

const mn4Decimal = (rng, t) => {
  const d = randInt(rng, 1, 99), c = randInt(rng, 0, 19) * 5;
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const good = money(d * 100 + c);
    return {
      prompt: `How do you write ${moneyWords(d * 100 + c)} in decimal notation?`,
      hint: `How do you write ${moneyWords(d * 100 + c)}? Dollars go before the decimal point. Cents always take exactly two places after it, so fewer than ten cents gets a 0 first.`,
      explain: `${d} dollars and ${c} cents is ${good}.${c < 10 ? ' The 0 holds the tens-of-cents place.' : ''}`,
      ...mcP(rng, good, [`$${d}.${c}`, `$${d}${pad2(c)}`, `$${d}.0${c}`, `$${c}.${pad2(d % 100)}`].filter((x) => x !== good), [], String),
    };
  }
  if (k === 1) {
    const cents = d * 100 + c;
    return {
      kind: 'num',
      prompt: `How many cents is ${money(cents)}?`,
      hint: `How many cents is ${money(cents)}? Each dollar is 100 cents. Change the ${u(d, 'dollar')} into cents (${u(d, 'hundred')}), then add the ${c} cents.`,
      explain: `${d} × 100 = ${fmtNum(d * 100)}, plus ${c}: ${fmtNum(cents)} cents.`,
      answer: num(cents),
    };
  }
  const cents = randInt(rng, 101, 999);
  const r = Math.round(cents / 5) * 5;
  return {
    prompt: `Write ${fmtNum(r)}¢ in dollars.`,
    speak: `Write ${r} cents in dollars.`,
    hint: `How do you write ${fmtNum(r)}¢ in dollars? Every 100¢ makes one dollar. Take out as many hundreds as you can for the dollars; the rest are cents, written with two digits after the point.`,
    explain: `${fmtNum(r)}¢ = ${Math.floor(r / 100)} dollars and ${r % 100} cents = ${money(r)}.`,
    ...mcP(rng, money(r), [`$${r}.00`, `$${(r / 1000).toFixed(2)}`, `$${Math.floor(r / 100)}.${r % 100}`].filter((x) => x !== money(r)), [], String),
  };
};

const mn4French = (rng, t) => {
  const c = randInt(rng, 101, 9999);
  const cents = Math.round(c / 5) * 5;
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    return {
      prompt: `In French, how is ${money(cents)} usually written?`,
      hint: `How is ${money(cents)} written in French? In French, a comma replaces the decimal point, and the $ sign goes after the number with a space. Check each choice for BOTH rules.`,
      explain: `${money(cents)} in English is written ${moneyFr(cents)} in French.`,
      ...mcP(rng, moneyFr(cents), [`$${(cents / 100).toFixed(2).replace('.', ',')}`, `${(cents / 100).toFixed(2)} $`, money(cents)], [], String),
    };
  }
  if (k === 1) {
    return {
      prompt: `A sign in French says ${moneyFr(cents)}. How is that written in English?`,
      hint: `How is ${moneyFr(cents)} written in English? In English, the $ sign goes in front and a decimal point separates dollars from cents. Change the comma to a point and move the $.`,
      explain: `${moneyFr(cents)} is ${money(cents)} in English notation.`,
      ...mcP(rng, money(cents), [`$${(cents / 100).toFixed(2).replace('.', ',')}`, `$${cents}`, `$${(cents / 10).toFixed(1)}`], [], String),
    };
  }
  const fr = chance(rng, 0.5);
  const others = [money(randInt(rng, 101, 9999)), money(randInt(rng, 101, 9999)), money(randInt(rng, 101, 9999))];
  const frs = [moneyFr(randInt(rng, 101, 9999)), moneyFr(randInt(rng, 101, 9999)), moneyFr(randInt(rng, 101, 9999))];
  return {
    prompt: `Which amount is written in ${fr ? 'French' : 'English'} notation?`,
    hint: `Which one is written in ${fr ? 'French' : 'English'}? English notation puts the $ in front and uses a decimal point. French notation uses a comma instead of the point and puts the $ at the end. Check each choice.`,
    explain: fr ? `${moneyFr(cents)} uses a comma and puts the $ at the end: French notation.` : `${money(cents)} puts the $ first and uses a decimal point: English notation.`,
    ...mcP(rng, fr ? moneyFr(cents) : money(cents), fr ? others : frs, [], String),
  };
};

const EARN = ['Walking a neighbour\'s dog for pay', 'Selling lemonade at a stand', 'Doing extra chores for an allowance', 'Shovelling a neighbour\'s driveway for pay', 'Selling crafts at a market', 'Raking leaves for pay'];
const NOT_EARN = ['Buying a new book', 'Paying for a bus ticket', 'Putting money in a piggy bank', 'Spending money on a movie', 'Borrowing money from a friend', 'Paying for a haircut'];
const mn4Earn = (rng, t) => {
  if (chance(rng, 0.5)) {
    const good = pick(rng, EARN);
    return {
      prompt: 'Which is a way to earn money?',
      hint: 'Which is a way to EARN money? Earning means getting paid for work you do or for something you sell. Spending, paying, saving or borrowing are not earning. Check each choice.',
      explain: `${good} is earning: you get paid for work or for selling something.`,
      ...mcP(rng, good, sample(rng, NOT_EARN, 3), [], String),
    };
  }
  const who = nm(rng);
  const job = pick(rng, [['walks a dog', 3, 'day'], ['rakes leaves', 5, 'yard'], ['sells cookies', 2, 'bag'], ['shovels snow', 8, 'driveway'], ['feeds a neighbour\'s cat', 4, 'day']]);
  const n = randInt(rng, 2, 9);
  return {
    kind: 'num',
    prompt: `${who} ${job[0]} and earns $${job[1]} for each ${job[2]}. How many dollars does ${who} earn for ${n} ${job[2]}s?`,
    hint: `How much does ${who} earn for ${n} ${job[2]}s? ${who} gets $${job[1]} each time, so it is ${n} equal groups of ${job[1]} dollars. Use the times fact ${n} × ${job[1]}.`,
    explain: `${n} × $${job[1]} = $${n * job[1]}.`,
    answer: num(n * job[1]),
  };
};

const mn4Fewest = (rng, t) => {
  const c = Math.round(randInt(rng, 500, 9995) / 5) * 5;
  const g = greedy(c, true);
  if (chance(rng, 0.5)) {
    return {
      kind: 'num',
      prompt: `What is the fewest number of bills and coins you need to make ${money(c)}? (Use bills up to $50.)`,
      hint: `What is the fewest bills and coins for ${money(c)}? Use the biggest bill or coin that fits (up to fifty dollars) as many times as you can, then the next biggest for what is left. Count all the pieces.`,
      explain: `${descC(g)}: ${g.length} bills and coins.`,
      answer: num(g.length),
    };
  }
  const split = { bill50: ['bill20', 'bill20', 'bill10'], bill20: ['bill10', 'bill10'], bill10: ['bill5', 'bill5'], bill5: ['toonie', 'toonie', 'loonie'], toonie: ['loonie', 'loonie'], loonie: ['quarter', 'quarter', 'quarter', 'quarter'], quarter: ['dime', 'dime', 'nickel'], dime: ['nickel', 'nickel'] };
  const alts = [];
  for (let i = 0; i < g.length && alts.length < 4; i++) {
    if (!split[g[i]] || (i > 0 && g[i] === g[i - 1])) continue;
    const a = sortC([...g.slice(0, i), ...split[g[i]], ...g.slice(i + 1)]);
    if (a.length <= 14) alts.push({ type: 'coins', items: a });
  }
  if (!alts.length) return mn4Count(rng, t);
  return {
    prompt: `Which shows ${money(c)} with the fewest bills and coins?`,
    hint: `Every choice makes ${money(c)}, so count how many pieces each one uses. Bigger bills and coins mean fewer pieces, like one twenty-dollar bill instead of two tens. Which uses the fewest?`,
    explain: `${descC(g)} makes ${money(c)} with only ${u(g.length, 'piece')}.`,
    ...mcV(rng, { type: 'coins', items: g }, shuffle(rng, alts)),
  };
};

const PRICES = ['a skateboard', 'a video game', 'a bike helmet', 'a board game', 'hockey skates', 'a backpack', 'a wizard costume', 'a pair of sneakers'];
const mn4Total = (rng, t) => {
  const who = nm(rng);
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const [x, y] = sample(rng, PRICES, 2);
    const a = randInt(rng, 5, 45) * 100 + pick(rng, [0, 25, 50, 75, 95, 49]), b = randInt(rng, 3, 40) * 100 + pick(rng, [0, 25, 50, 75, 5]);
    const s = a + b;
    if (s > 10000) return mn4Count(rng, t);
    return {
      prompt: `${who} buys ${x} for ${money(a)} and ${y} for ${money(b)}. What is the total cost?`,
      hint: `What is the total cost? Add ${money(a)} + ${money(b)}: add the dollars, then the cents. If the cents make 100 or more, trade 100¢ for one more dollar.`,
      explain: `${money(a)} + ${money(b)} = ${money(s)}.`,
      ...mcP(rng, money(s), [money(s - 100), money(s + 100), money(Math.floor(a / 100) * 100 + Math.floor(b / 100) * 100 + ((a + b) % 100)), money(s + 10)].filter((v) => v !== money(s)), [], String),
    };
  }
  if (k === 1) {
    const have = randInt(rng, 10, 80) * 100, cost = randInt(rng, have / 100 + 1, 99) * 100 + pick(rng, [0, 50, 25, 75]);
    const need = cost - have;
    return {
      prompt: `${who} has ${money(have, true)}. ${cap(pick(rng, PRICES))} costs ${money(cost)}. How much more money does ${who} need?`,
      hint: `How much more is needed? Count up from ${money(have, true)} to ${money(cost)}: first jump to the whole dollars, then add the cents. Or subtract.`,
      explain: `${money(cost)} − ${money(have)} = ${money(need)}.`,
      ...mcP(rng, money(need), [money(need + 100), money(Math.abs(need - 100)), money(cost + have), money(need + 50)].filter((v) => v !== money(need)), [], String),
    };
  }
  const items = randMoney(rng, 3);
  const total = sumC(items);
  const cost = Math.max(100, total - randInt(rng, 1, 20) * 25);
  return {
    prompt: `${who} has this money and buys something for ${money(cost)}. How much money is left?`,
    visual: { type: 'coins', items: sortC(items) },
    hint: `How much is left? First count the money, biggest bills first. Then subtract the price, ${money(cost)}.`,
    explain: `${who} has ${money(total)}. ${money(total)} − ${money(cost)} = ${money(total - cost)}.`,
    ...mcP(rng, money(total - cost), [money(total - cost + 100), money(total - cost + 25), money(total - cost + 10), money(Math.abs(total - cost - 5))].filter((v) => v !== money(total - cost)), [], String),
  };
};

const mn4Preview = (rng, t) => {
  const card = pick(rng, [25, 50, 100]) * 100;
  const a = randInt(rng, 3, 20) * 100 + pick(rng, [0, 25, 50, 75, 99]), b = randInt(rng, 2, 15) * 100 + pick(rng, [0, 49, 50, 25]);
  const left = card - a - b;
  if (left <= 0) return mn4Total(rng, t);
  return {
    prompt: `Big challenge! A gift card has ${money(card, true)}. You spend ${money(a)} and then ${money(b)}. What is the balance left on the card?`,
    hint: `What is left on the gift card? First add what was spent: ${money(a)} + ${money(b)}. Then take that away from ${money(card, true)}.`,
    explain: `${money(a)} + ${money(b)} = ${money(a + b)}. ${money(card)} − ${money(a + b)} = ${money(left)}.`,
    ...mcP(rng, money(left), [money(left + 100), money(a + b), money(Math.abs(left - 100)), money(left + 1)].filter((v) => v !== money(left)), [], String),
  };
};

const g4Money = {
  id: 'g4-data-money', grade: 4, strand: 'stats', bigIdea: 'data', species: 'coinling',
  name: 'Money to $100',
  parentDesc: 'Counts coins and bills up to $100, writes amounts in decimal notation ($5.25), compares English and French notation (5,25 $), and explores ways of earning money.',
  classic: false,
  gen: tiered([
    [1, 5, mn4Count, 2.5], [1, 5, mn4Decimal, 2], [3, 5, mn4French, 1.5], [3, 6, mn4Earn, 1.2], [4, 7, mn4Fewest, 1.5], [5, 7, mn4Total, 2], [7, 7, mn4Preview, 0.7], [6, 7, mn4French, 0.8],
  ]),
};

// ---------------------------------------------------------------------------
// Classic: add and subtract decimals to hundredths (older Grade 4 N11)
// ---------------------------------------------------------------------------
function decPair(rng, t, sub) {
  let a, b;
  if (t === 1) { a = randInt(rng, 11, 60); b = randInt(rng, 11, 38); if ((a % 10) + (b % 10) >= 10 || a + b >= 100) return decPair(rng, t, sub); }
  else if (t === 2) { a = randInt(rng, 15, 85); b = randInt(rng, 12, 60); }
  else if (t === 3) { a = randInt(rng, 105, 899); b = randInt(rng, 12, 499); }
  else { a = randInt(rng, 120, 1999); b = randInt(rng, 105, 999); }
  if (sub && b > a) [a, b] = [b, a];
  if (sub && t === 1 && a % 10 < b % 10) return decPair(rng, t, sub);
  if (a === b) b = b - 1 || 1;
  return [a / 100, b / 100];
}
const dcCompute = (rng, t) => {
  const sub = chance(rng, 0.45);
  let [a, b] = decPair(rng, t, sub);
  if (sub && t >= 5 && chance(rng, 0.5)) { a = randInt(rng, 2, 9); b = clean(randInt(rng, 101, a * 100 - 5) / 100); }
  const ans = clean(sub ? a - b : a + b);
  const f = (x) => dec(x, 2);
  const vis = t === 1 ? { type: 'hundredgrid', shaded: Math.round(a * 100) } : undefined;
  const q = {
    prompt: `What is ${f(a)} ${sub ? '−' : '+'} ${f(b)}?`,
    visual: vis,
    hint: `What is ${f(a)} ${sub ? '−' : '+'} ${f(b)}? Line up the decimal points and work from the hundredths to the tenths to the ones, regrouping when needed. You can also think of them as ${Math.round(a * 100)} hundredths and ${Math.round(b * 100)} hundredths.`,
    explain: `${f(a)} ${sub ? '−' : '+'} ${f(b)} = ${f(ans)}. (In hundredths: ${Math.round(a * 100)} ${sub ? '−' : '+'} ${Math.round(b * 100)} = ${Math.round(ans * 100)}.)`,
  };
  if (keypadSafe(ans, 2) && chance(rng, 0.5)) return { ...q, kind: 'num', answer: decN(ans) };
  const A = Math.round(a * 100), B = Math.round(b * 100);
  const mis = sub ? subSmallFromBig(A, B) / 100 : addNoCarry(A, B) / 100;
  return { ...q, ...mcP(rng, f(ans), [f(mis), f(clean(ans + 0.1)), f(clean(ans - 0.01)), f(clean(ans + 1)), dec(ans * 10, 1)].filter((x) => x !== f(ans) && !x.startsWith('-')), [], String) };
};

const dcCompatible = (rng, t) => {
  const k = randInt(rng, 0, 1);
  if (k === 0) {
    const a = randInt(rng, 5, 95);
    const whole = t >= 5 ? randInt(rng, 2, 5) : 1;
    const target = whole * 100;
    const aa = t >= 5 ? randInt(rng, 105, target - 5) : a;
    const ans = clean((target - aa) / 100);
    return {
      prompt: `What number adds to ${dec(aa / 100, 2)} to make ${whole}?`,
      visual: t <= 4 ? { type: 'hundredgrid', shaded: aa } : undefined,
      hint: `What adds to ${dec(aa / 100, 2)} to make ${whole}? Count up to the next tenth first, then to the next whole number${whole > 1 ? `, then on to ${whole}` : ''}. Add up your jumps.`,
      explain: `${dec(aa / 100, 2)} + ${dec(ans, 2)} = ${whole}.`,
      ...mcP(rng, dec(ans, 2), [dec(clean(ans + 0.1), 2), dec(clean((target - aa - 10) / 100), 2), dec(clean(ans + 0.01), 2), dec(clean(1 - aa / 1000), 2)].filter((x) => x !== dec(ans, 2) && !x.startsWith('-')), [], String),
    };
  }
  // compatible numbers: which two make a whole
  const x = randInt(rng, 5, 95);
  const partner = 100 - x;
  const others = [partner + 10, partner - 1, 110 - x, partner + 5].filter((y) => y > 0 && y < 100 && y !== partner);
  const nums = [x, partner, ...sample(rng, others, 2)];
  return {
    prompt: `Which two numbers add to exactly 1? ${shuffle(rng, nums).map((n) => dec(n / 100, 2)).join(', ')}`,
    hint: 'One whole is 100 hundredths. Think of each decimal as hundredths (like thirty-six hundredths). Which pair adds to exactly 100 hundredths? Test each pair.',
    explain: `${dec(x / 100, 2)} + ${dec(partner / 100, 2)} = 1.00, because ${x} + ${partner} = 100 hundredths.`,
    ...mcP(rng, `${dec(x / 100, 2)} and ${dec(partner / 100, 2)}`, others.map((o) => `${dec(x / 100, 2)} and ${dec(o / 100, 2)}`), [], String),
  };
};

const dcEstimate = (rng, t) => {
  let a, b;
  do { a = randInt(rng, 110, 950) / 100; b = randInt(rng, 110, 650) / 100; } while (Math.abs((a % 1) - 0.5) < 0.1 || Math.abs((b % 1) - 0.5) < 0.1);
  const sub = chance(rng, 0.4);
  if (sub && b > a) [a, b] = [b, a];
  const est = sub ? Math.round(a) - Math.round(b) : Math.round(a) + Math.round(b);
  return {
    prompt: `About how much is ${dec(a, 2)} ${sub ? '−' : '+'} ${dec(b, 2)}?`,
    hint: `About how much is it? Round each decimal to the nearest whole number (the tenths digit tells you which way), then ${sub ? 'subtract' : 'add'} the whole numbers.`,
    explain: `${dec(a, 2)} ≈ ${Math.round(a)} and ${dec(b, 2)} ≈ ${Math.round(b)}. ${Math.round(a)} ${sub ? '−' : '+'} ${Math.round(b)} = ${est}. (Exact: ${dec(sub ? a - b : a + b, 2)}.)`,
    ...mcP(rng, `about ${est}`, [est + 1, est - 1, est + 2, est * 10].filter((x) => x >= 0 && x !== est).map((x) => `about ${x}`), [], String),
  };
};

const DC_WORD = [
  (p, a, b) => [`${p} buys a book for $${a} and a pen for $${b}. How much is that in all?`, false, '$'],
  (p, a, b) => [`A board is ${a} m long. ${p} cuts off ${b} m. How long is the board now?`, true, 'm'],
  (p, a, b) => [`A bag of apples has a mass of ${a} kg and a bag of pears ${b} kg. What is the total mass?`, false, 'kg'],
  (p, a, b) => [`${p} has $${a}. A snack costs $${b}. How much will ${p} have left?`, true, '$'],
  (p, a, b) => [`A frog jumped ${a} m, then ${b} m. How far did it jump in all?`, false, 'm'],
  (p, a, b) => [`A jug holds ${a} L. ${p} pours out ${b} L. How much is left in the jug?`, true, 'L'],
];
const dcWord = (rng, t) => {
  const p = nm(rng);
  const tpl = pick(rng, DC_WORD);
  const sub = tpl('', '', '')[1];
  let [a, b] = decPair(rng, Math.max(3, t), sub);
  const [prompt, , unit] = tpl(p, dec(a, 2), dec(b, 2));
  const ans = clean(sub ? a - b : a + b);
  const lab = (x) => (unit === '$' ? `$${dec(x, 2)}` : `${dec(x, 2)} ${unit}`);
  const q = { prompt, hint: sub ? `What is the question asking? You start with ${dec(a, 2)} and ${dec(b, 2)} is taken away. Subtract with the decimal points lined up: hundredths, then tenths, then ones.` : `What is the question asking? Two amounts, ${dec(a, 2)} and ${dec(b, 2)}, are put together. Add with the decimal points lined up: hundredths, then tenths, then ones.`, explain: `${dec(a, 2)} ${sub ? '−' : '+'} ${dec(b, 2)} = ${dec(ans, 2)}, so the answer is ${lab(ans)}.` };
  const A = Math.round(a * 100), B = Math.round(b * 100);
  const mis = (sub ? subSmallFromBig(A, B) : addNoCarry(A, B)) / 100;
  return { ...q, ...mcP(rng, lab(ans), [mis, clean(ans + 0.1), clean(ans + 1), sub ? clean(a + b) : clean(Math.abs(a - b))].filter((x) => x > 0 && dec(x, 2) !== dec(ans, 2)).map(lab), [], String) };
};

const dcTwoStep = (rng, t) => {
  const p = nm(rng);
  const have = randInt(rng, 10, 20);
  const a = clean(randInt(rng, 105, 495) / 100), b = clean(randInt(rng, 105, 495) / 100);
  const left = clean(have - a - b);
  return {
    prompt: `${p} has $${have}.00. ${p} buys a juice for $${dec(a, 2)} and a muffin for $${dec(b, 2)}. How much money is left?`,
    hint: `How much money is left? First add the two prices: $${dec(a, 2)} + $${dec(b, 2)}. Then subtract that total from $${have}.00.`,
    explain: `$${dec(a, 2)} + $${dec(b, 2)} = $${dec(a + b, 2)}. $${have}.00 − $${dec(a + b, 2)} = $${dec(left, 2)}.`,
    ...mcP(rng, `$${dec(left, 2)}`, [`$${dec(a + b, 2)}`, `$${dec(left + 1, 2)}`, `$${dec(left + 0.1, 2)}`, `$${dec(have - a, 2)}`], [], String),
  };
};

const g4Decimals = {
  id: 'g4-classic-decimals', grade: 4, strand: 'number', bigIdea: 'ops', species: 'addsub',
  name: 'Decimal Sums to Hundredths',
  parentDesc: 'Classic outcome (older guide): adds and subtracts decimals to hundredths using compatible numbers, estimation and mental math to solve problems.',
  classic: true,
  gen: tiered([
    [1, 5, dcCompute, 3], [2, 5, dcCompatible, 1.5], [3, 6, dcEstimate, 1.5], [4, 7, dcWord, 2], [6, 7, dcTwoStep, 1.5], [6, 7, dcCompute, 1],
  ]),
};

// ---------------------------------------------------------------------------
// Classic: read and record calendar dates in a variety of formats (older Grade 4 SS2)
// ---------------------------------------------------------------------------
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekday = (y, m, d) => WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
function rDate(rng, small) {
  const y = randInt(rng, 2024, 2031), mo = randInt(rng, 1, 12);
  let d = randInt(rng, 1, daysIn(mo, y));
  if (small && d > 12) d = randInt(rng, 1, 12);
  if (small && d === mo) d = (d % 12) + 1;
  return [y, mo, d];
}
const FMT = {
  'yyyy/mm/dd': (y, m, d) => `${y}/${pad2(m)}/${pad2(d)}`,
  'dd/mm/yyyy': (y, m, d) => `${pad2(d)}/${pad2(m)}/${y}`,
  'mm/dd/yyyy': (y, m, d) => `${pad2(m)}/${pad2(d)}/${y}`,
  'yyyy-mm-dd': (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`,
};
const longD = (y, m, d) => `${MONTHS[m - 1]} ${d}, ${y}`;
const dayMonth = (y, m, d) => `${d} ${MONTHS[m - 1]} ${y}`;

const dtCalendar = (rng, t) => {
  const [y, mo, d] = rDate(rng, false);
  const k = randInt(rng, 0, 1);
  if (k === 0) {
    const wd = weekday(y, mo, d);
    return {
      prompt: `What day of the week is ${longD(y, mo, d)}?`,
      visual: { type: 'calendar', month: mo, year: y, highlight: [d] },
      hint: `What day of the week is ${longD(y, mo, d)}? Find the ${ordinal(d)} on the calendar, then go straight up its column to the day name at the top.`,
      explain: `${longD(y, mo, d)} is in the ${wd} column, so it is a ${wd}.`,
      ...mcP(rng, wd, WEEKDAYS.filter((w) => w !== wd), [], String),
    };
  }
  return {
    prompt: 'Which date is highlighted on the calendar?',
    visual: { type: 'calendar', month: mo, year: y, highlight: [d] },
    hint: 'Which date is highlighted? Read the month and year at the top of the calendar, then the highlighted day number. For the day of the week, look at the top of its column. Check every part of each choice.',
    explain: `The calendar shows ${MONTHS[mo - 1]} ${y}, and the ${ordinal(d)} is highlighted: ${weekday(y, mo, d)}, ${longD(y, mo, d)}.`,
    ...mcP(rng, `${weekday(y, mo, d)}, ${longD(y, mo, d)}`, [`${weekday(y, mo, d)}, ${longD(y, mo % 12 + 1, Math.min(d, 28))}`, `${WEEKDAYS[(WEEKDAYS.indexOf(weekday(y, mo, d)) + 1) % 7]}, ${longD(y, mo, d)}`, `${weekday(y, mo, d)}, ${longD(y + 1, mo, d)}`], [], String),
  };
};

const dtWrite = (rng, t) => {
  const [y, mo, d] = rDate(rng, true);
  const fmtName = pick(rng, t <= 3 ? ['yyyy/mm/dd', 'dd/mm/yyyy'] : Object.keys(FMT));
  const good = FMT[fmtName](y, mo, d);
  const wrongs = Object.keys(FMT).filter((k) => k !== fmtName && FMT[k](y, mo, d) !== good).map((k) => FMT[k](y, mo, d)).filter((w) => !(fmtName.includes('/') && w.includes('-')));
  wrongs.push(FMT[fmtName](y, mo % 12 + 1, d));
  return {
    prompt: `Write ${longD(y, mo, d)} in the format ${fmtName}.`,
    speak: `Write ${longD(y, mo, d)} in the format ${fmtName.split(/[/-]/).map((p) => ({ yyyy: 'year', mm: 'month', dd: 'day' }[p])).join(', ')}.`,
    hint: `Follow the letters in ${fmtName}: yyyy is the 4-digit year, mm is the month number (2 digits) and dd is the day (2 digits). What number month is ${MONTHS[mo - 1]}? Count from January = 01.`,
    explain: `In ${fmtName}, ${longD(y, mo, d)} is ${good}.`,
    ...mcP(rng, good, wrongs, [], String),
  };
};

const dtRead = (rng, t) => {
  const [y, mo, d] = rDate(rng, true);
  const fmtName = pick(rng, Object.keys(FMT));
  const shown = FMT[fmtName](y, mo, d);
  const good = longD(y, mo, d);
  return {
    prompt: `The date ${shown} is written as ${fmtName}. What date is it?`,
    speak: `The date ${shown} is written as ${fmtName.split(/[/-]/).map((p) => ({ yyyy: 'year', mm: 'month', dd: 'day' }[p])).join(', ')}. What date is it?`,
    hint: `The format ${fmtName} tells you the order. Match each number in ${shown} to the letters: which part is the month (mm) and which is the day (dd)? Then name the month.`,
    explain: `In ${fmtName}, the month is ${pad2(mo)} (${MONTHS[mo - 1]}) and the day is ${pad2(d)}. So it is ${good}.`,
    ...mcP(rng, good, [longD(y, d, mo), longD(y, mo % 12 + 1, d), longD(y, mo, Math.min(28, d + 10))].filter((x) => x !== good), [], String),
  };
};

const dtAmbiguous = (rng, t) => {
  const [y, a, b] = rDate(rng, true);
  const shown = `${pad2(a)}/${pad2(b)}/${y}`;
  const good = `${MONTHS[a - 1]} ${b} or ${MONTHS[b - 1]} ${a}`;
  return {
    prompt: `${nm(rng)} writes ${shown} but does not say the format. Which two dates could it be?`,
    hint: `Why is ${shown} tricky? Some people write the month first (mm/dd/yyyy) and some write the day first (dd/mm/yyyy). Read the first two numbers both ways: month then day, and day then month.`,
    explain: `If it is mm/dd/yyyy, it is ${MONTHS[a - 1]} ${b}. If it is dd/mm/yyyy, it is ${MONTHS[b - 1]} ${a}. That's why saying the format matters.`,
    ...mcP(rng, good, [`${MONTHS[a - 1]} ${b} or ${MONTHS[a - 1]} ${y % 100}`, `${MONTHS[b - 1]} ${a} or ${MONTHS[(b % 12)]} ${a}`, `Only ${MONTHS[a - 1]} ${b}`], [], String),
  };
};

const dtSame = (rng, t) => {
  const [y, mo, d] = rDate(rng, false);
  const good = pick(rng, [dayMonth(y, mo, d), FMT['dd/mm/yyyy'](y, mo, d) + ' (dd/mm/yyyy)', FMT['yyyy-mm-dd'](y, mo, d)]);
  return {
    prompt: `Which shows the same date as ${longD(y, mo, d)}?`,
    hint: `Which shows the same date as ${longD(y, mo, d)}? Check the year, the month and the day in each choice. For number formats, use the label to know which number is the month.`,
    explain: `${good} is ${longD(y, mo, d)}.`,
    ...mcP(rng, good, [dayMonth(y, mo % 12 + 1, d), FMT['dd/mm/yyyy'](y, d <= 12 ? d : mo % 12 + 1, d <= 12 ? mo : d) + ' (dd/mm/yyyy)', FMT['yyyy-mm-dd'](y + 1, mo, d), dayMonth(y, mo, Math.min(28, d + 1) === d ? d - 1 : Math.min(28, d + 1))].filter((x) => x !== good), [], String),
  };
};

const dtAfter = (rng, t) => {
  const [y, mo, d] = rDate(rng, false);
  const add = pick(rng, t >= 6 ? [7, 10, 14, 21] : [1, 2, 7]);
  const dt = new Date(Date.UTC(y, mo - 1, d + add));
  const [y2, m2, d2] = [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()];
  const good = longD(y2, m2, d2);
  const wrongD = new Date(Date.UTC(y, mo - 1, d + add + 1)), wrongE = new Date(Date.UTC(y, mo - 1, d + add - 1));
  const fmtD = (x) => longD(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate());
  const naive = d + add <= 31 && d + add > daysIn(mo, y) ? longD(y, mo, d + add) : longD(y, mo, d);
  return {
    prompt: `What date is ${add === 7 ? '1 week' : add === 14 ? '2 weeks' : add === 21 ? '3 weeks' : `${add} day${add > 1 ? 's' : ''}`} after ${longD(y, mo, d)}?`,
    visual: { type: 'calendar', month: mo, year: y, highlight: [d] },
    hint: `Count forward ${u(add, 'day')} on the calendar. ${MONTHS[mo - 1]} has ${daysIn(mo, y)} days, so if you go past the ${ordinal(daysIn(mo, y))}, keep counting into the next month.`,
    explain: `Counting ${u(add, 'day')} after ${longD(y, mo, d)} lands on ${weekday(y2, m2, d2)}, ${good}.`,
    ...mcP(rng, good, [fmtD(wrongD), fmtD(wrongE), naive].filter((x) => x !== good && !/ (3[2-9]|4\d),/.test(x)), [], String),
  };
};

const dtOrder = (rng, t) => {
  const ds = [rDate(rng, false), rDate(rng, false), rDate(rng, false)];
  const key = (x) => x[0] * 10000 + x[1] * 100 + x[2];
  if (new Set(ds.map(key)).size < 3) return dtWrite(rng, t);
  const first = chance(rng, 0.5);
  const target = ds.slice().sort((a, b) => (first ? key(a) - key(b) : key(b) - key(a)))[0];
  const show = (x, i) => [FMT['yyyy/mm/dd'], longD, dayMonth][i % 3](...x);
  const labels = ds.map((x, i) => show(x, i));
  return {
    prompt: `Which date comes ${first ? 'first' : 'last'}?`,
    hint: `Which date comes ${first ? 'first' : 'last'}? The dates are written in different ways, so turn each into year, month and day first. Compare the years, then the months, then the days.`,
    explain: `In order: ${ds.slice().sort((a, b) => key(a) - key(b)).map((x) => longD(...x)).join(', ')}.`,
    ...mcP(rng, labels[ds.indexOf(target)], labels.filter((_, i) => ds[i] !== target), [], String),
  };
};

const g4Dates = {
  id: 'g4-classic-dates', grade: 4, strand: 'shape', bigIdea: 'measurement', species: 'clockwork',
  name: 'Calendar Dates',
  parentDesc: 'Classic outcome (older guide): reads and records calendar dates in a variety of formats.',
  classic: true,
  gen: tiered([
    [1, 3, dtCalendar, 2.5], [2, 5, dtWrite, 2], [3, 6, dtRead, 2], [4, 6, dtSame, 1.5], [5, 7, dtAmbiguous, 1.2], [4, 7, dtAfter, 2], [6, 7, dtOrder, 1.5],
  ]),
};

// ---------------------------------------------------------------------------
export const skills = [
  g4Represent, g4FracDec, g4Count, g4AddSub, g4MulDiv, g4Facts, g4MultiDigit, g4Equations, g4Tables, g4Time, g4Measure,
  g4Polygons, g4Data, g4Chance, g4Money, g4Decimals, g4Dates,
];

export const SKIPPED = [
  { skillId: 'g4-data-data', indicator: 'Collect data and construct a pictograph or bar graph with many-to-one correspondence', reason: 'Building a graph by hand is not checkable here; covered with choosing a key, matching a pictograph to a bar graph, and reading displays.' },
  { skillId: 'g4-meas-measure', indicator: 'Construct different rectangles for a given perimeter or area with materials; measure real objects', reason: 'Hands-on construction; adapted to picking or completing rectangles on a grid and choosing units and referents.' },
  { skillId: 'g4-geo-polygons', indicator: 'Create symmetrical shapes and draw lines of symmetry', reason: 'Drawing is not supported; adapted to identifying lines of symmetry, counting them, and choosing congruent shapes.' },
  { skillId: 'g4-data-chance', indicator: 'Conduct coin, die and spinner experiments and record results', reason: 'Needs a real experiment; adapted to predicting expected results and reasoning about equal chance and independence.' },
  { skillId: 'g4-pat-tables', indicator: 'Reproduce a pattern from a table using concrete materials', reason: 'Hands-on; covered by extending, completing and correcting tables and building a table from a situation.' },
  { skillId: 'g4-ops-multidigit', indicator: 'Explain a personal strategy for multiplying or dividing', reason: 'Open-ended explanation; adapted to choosing a valid strategy and judging reasonableness.' },
];

// Grade 3 question generators (NB Holistic Mathematics curriculum, Grade 3).
// Each skill's gen(tier, rng) picks one of several question formats allowed at that tier.
import {
  randInt, pick, chance, shuffle, sample, fmtNum, clean, frac, numWords, fracWords, time12, numAnswer, ordinal,
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
// Money for Grade 3: 85¢, $7, $3.25
function money3(c) {
  if (c < 100) return `${c}¢`;
  if (c % 100 === 0) return `$${c / 100}`;
  return `$${(c / 100).toFixed(2)}`;
}
function moneyWords(c) {
  const d = Math.floor(c / 100), k = c % 100;
  if (d === 0) return `${numWords(k)} cents`;
  return `${numWords(d)} dollar${d === 1 ? '' : 's'}${k ? ` and ${numWords(k)} cents` : ''}`;
}

// ---------------------------------------------------------------------------
// SD1 Represent numbers to 1000
// ---------------------------------------------------------------------------
const PV3 = ['Hundreds', 'Tens', 'Ones'];
function hto(n) { return [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10]; }
function htoText(h, t, o) { return `${u(h, 'hundred')} + ${u(t, 'ten')} + ${u(o, 'one')}`; }
function distinctDigits3(rng, noZero = false) {
  let n;
  do { n = randInt(rng, 102, 987); } while (new Set(String(n)).size < 3 || (noZero && String(n).includes('0')));
  return n;
}

const repBase10 = (rng, t) => {
  let h, tn, o;
  if (t === 1) {
    if (chance(rng, 0.5)) { h = 0; tn = randInt(rng, 1, 5); o = randInt(rng, 0, 9); if (tn === 5) o = 0; } // up to 50 at a glance
    else { h = randInt(rng, 1, 3); tn = randInt(rng, 0, 5); o = randInt(rng, 0, 9); }
  } else { h = randInt(rng, 1, 9); tn = randInt(rng, 0, 9); o = randInt(rng, 0, 9); }
  const n = h * 100 + tn * 10 + o;
  const prompt = pick(rng, ['What number do the blocks show?', 'How many cubes are there in all?', 'Which number matches the base-ten blocks?']);
  const q = {
    prompt, visual: { type: 'base10', hundreds: h, tens: tn, ones: o },
    hint: `How many cubes are there altogether? Each flat is one hundred, each rod is ten and each small cube is one. Count the ${u(h, 'flat')} by hundreds, then keep counting the ${u(tn, 'rod')} by tens, then the ${u(o, 'small cube')} by ones.`,
    explain: `${h ? `${u(h, 'hundred')} = ${h * 100}, ` : ''}${u(tn, 'ten')} = ${tn * 10} and ${u(o, 'one')} = ${o}. ${[h * 100, tn * 10, o].filter((x, i) => x || i === 2).join(' + ')} = ${n}.`,
  };
  if (t === 2 && chance(rng, 0.35)) return { ...q, kind: 'num', prompt: 'What number do the blocks show?', answer: num(n) };
  return { ...q, ...mcN(rng, n, [h * 100 + o * 10 + tn, n + 10, n - 10, n + 100, n - 100, n + 1, Number(`${o}${tn}${h}`), h ? tn * 100 + h * 10 + o : tn * 100 + o]) };
};

const repChart = (rng, t) => {
  const n = t === 1 ? randInt(rng, 11, 399) : randInt(rng, 100, 999);
  const d = hto(n).map((x, i) => (n < 100 && i === 0 ? 0 : x));
  if (t >= 2 && chance(rng, 0.5)) {
    const blank = randInt(rng, 0, 2);
    return {
      prompt: `The chart shows ${fmtNum(n)}. Which digit is hidden?`,
      visual: { type: 'placevalue', columns: PV3, digits: d, blank },
      hint: `The chart has one column for each place: hundreds, tens and ones. Say ${fmtNum(n)} slowly and ask: which digit tells how many ${PV3[blank].toLowerCase()} there are? That digit goes in the ? box.`,
      explain: `${fmtNum(n)} has ${u(d[0], 'hundred')}, ${u(d[1], 'ten')} and ${u(d[2], 'one')}, so the hidden ${PV3[blank].toLowerCase()} digit is ${d[blank]}.`,
      ...mcN(rng, d[blank], [d[(blank + 1) % 3], d[(blank + 2) % 3], d[blank] + 1, d[blank] - 1], { max: 9 }),
    };
  }
  return {
    prompt: pick(rng, ['What number is shown in the chart?', 'Which number does the place-value chart show?']),
    visual: { type: 'placevalue', columns: PV3, digits: d },
    hint: 'The chart tells you how many hundreds, tens and ones. Read the Hundreds column first, then Tens, then Ones, and write the digits side by side in that order. A 0 in a column still gets written.',
    explain: `${u(d[0], 'hundred')}, ${u(d[1], 'ten')} and ${u(d[2], 'one')} make ${fmtNum(n)}.`,
    ...mcN(rng, n, [d[2] * 100 + d[1] * 10 + d[0], d[0] * 100 + d[2] * 10 + d[1], n + 10, n - 100, n + 100]),
  };
};

const repWords = (rng, t) => {
  let n = randInt(rng, 101, 999);
  if (chance(rng, 0.25)) n = n - (n % 100) + (n % 10); // zero tens, e.g. 607
  else if (chance(rng, 0.2)) n = n - (n % 10); // zero ones, e.g. 670
  if (n % 100 === 0) n += randInt(rng, 1, 9);
  const [h, tn, o] = hto(n);
  if (chance(rng, 0.5)) {
    const wrong = [h * 100 + o * 10 + tn, h * 1000 + tn * 10 + o, h * 1000 + o, h * 100 + (tn + 1) * 10 + o, h * 10 + o, h * 100 + tn * 10 + ((o + 1) % 10)];
    return {
      prompt: `Which number is ${numWords(n)}?`,
      hint: `Which choice matches the words "${numWords(n)}"? Split the words into the hundreds part and the tens-and-ones part. Write one digit for each place, and a 0 for any place the words skip.`,
      explain: `${cap(numWords(n))} is ${u(h, 'hundred')}, ${u(tn, 'ten')} and ${u(o, 'one')}: ${fmtNum(n)}.`,
      ...mcN(rng, n, wrong),
    };
  }
  const wrongs = [h * 100 + o * 10 + tn, h * 100 + tn, h * 100 + (o ? o : tn + 1) * 10, n + 10].filter((x) => x !== n && x >= 100);
  return {
    prompt: `How do you write ${fmtNum(n)} in words?`,
    hint: `Which words say ${fmtNum(n)} out loud? First say the hundreds digit and the word "hundred", then read the last two digits as one number. Check each choice: does it have the right hundreds AND the right tens and ones?`,
    explain: `${fmtNum(n)} is ${u(h, 'hundred')}, ${u(tn, 'ten')} and ${u(o, 'one')}, so we say "${numWords(n)}".`,
    ...mcP(rng, n, wrongs, [n + 1, n + 100], numWords),
  };
};

const repDigitValue = (rng, t) => {
  const n = distinctDigits3(rng, true);
  const [h, tn, o] = hto(n);
  const pos = randInt(rng, 0, 2);
  const dg = [h, tn, o][pos];
  const val = dg * [100, 10, 1][pos];
  if (t >= 4 && chance(rng, 0.4)) {
    // Which number has the digit with a given value?
    const target = randInt(rng, 1, 9);
    const p = randInt(rng, 0, 2);
    const make = (pp) => {
      let x;
      do { x = distinctDigits3(rng, true); } while (hto(x)[pp] === target || hto(x).includes(target));
      const d = hto(x); d[pp] = target; return d[0] * 100 + d[1] * 10 + d[2];
    };
    const correct = make(p);
    const wrongs = [0, 1, 2].filter((pp) => pp !== p).map(make);
    wrongs.push(make((p + 1) % 3));
    const v = target * [100, 10, 1][p];
    return {
      prompt: `In which number does the ${target} have a value of ${fmtNum(v)}?`,
      hint: `Which number has its ${target} worth ${fmtNum(v)}? A value of ${fmtNum(v)} means ${u(target, ['hundred', 'ten', 'one'][p])}. In each choice, find the ${target} and ask: is it in the hundreds, tens or ones place?`,
      explain: `In ${fmtNum(correct)}, the ${target} is in the ${['hundreds', 'tens', 'ones'][p]} place, so it is worth ${fmtNum(v)}.`,
      ...mcP(rng, correct, wrongs, [], fmtNum),
    };
  }
  return {
    prompt: `What is the value of the ${dg} in ${fmtNum(n)}?`,
    visual: t === 3 && chance(rng, 0.5) ? { type: 'placevalue', columns: PV3, digits: [h, tn, o] } : undefined,
    hint: `How much is the ${dg} in ${fmtNum(n)} really worth? Find its place: the first digit is hundreds, the middle is tens, the last is ones. A digit in the tens place is worth that many tens; in the hundreds place, that many hundreds.`,
    explain: `The ${dg} is in the ${['hundreds', 'tens', 'ones'][pos]} place, so its value is ${dg} × ${[100, 10, 1][pos]} = ${fmtNum(val)}.`,
    ...mcP(rng, val, [dg, dg * 10, dg * 100, n].filter((x) => x !== val), [], fmtNum),
  };
};

const repCompare = (rng, t) => {
  let a = randInt(rng, 100, 999), b;
  const kind = randInt(rng, 0, 3);
  if (kind === 0) { const [h, tn, o] = hto(a); b = h * 100 + o * 10 + tn; }
  else if (kind === 1) b = a + pick(rng, [-10, 10, -1, 1, 100, -100]);
  else if (kind === 2) b = a;
  else b = randInt(rng, 100, 999);
  if (b < 100 || b > 999) b = a;
  let right = fmtNum(b), rightVal = b;
  if (t >= 5 && chance(rng, 0.5)) {
    const [h, tn, o] = hto(b);
    right = pick(rng, [`${u(h, 'hundred')} ${u(tn, 'ten')} ${u(o, 'one')}`, `${u(h * 10 + tn, 'ten')} ${u(o, 'one')}`]);
  }
  const sym = a < rightVal ? '<' : a > rightVal ? '>' : '=';
  const expr = `${fmtNum(a)} □ ${right}`;
  return {
    prompt: `Which symbol makes this true? ${expr}`,
    speak: `Which symbol makes this true? ${fmtNum(a)}, blank, ${right}.`,
    visual: { type: 'expression', text: expr, big: true },
    hint: `${right !== fmtNum(b) ? 'First turn the right side into a plain number. ' : ''}< means "is less than", > means "is greater than" and = means "is the same as". Compare the hundreds digits first; if they match, compare the tens, then the ones.`,
    explain: `${fmtNum(a)} ${sym === '<' ? 'is less than' : sym === '>' ? 'is greater than' : 'is equal to'} ${fmtNum(rightVal)}, so ${fmtNum(a)} ${sym} ${right}.`,
    ...fixedChoices(['<', '=', '>'], sym),
  };
};

const repGreatest = (rng, t) => {
  const base = randInt(rng, 1, 8) * 100;
  const d = sample(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
  const nums = shuffle(rng, [base + d[0] * 10 + d[1], base + d[1] * 10 + d[0], base + d[2] * 10 + d[0], base + 100 + d[2]].filter((x) => x <= 999));
  const uniq = [...new Set(nums)];
  const most = chance(rng, 0.5);
  const target = most ? Math.max(...uniq) : Math.min(...uniq);
  return {
    prompt: `Which number is the ${most ? 'greatest' : 'least'}?`,
    hint: `Which number is the ${most ? 'greatest' : 'least'}? Look at the hundreds digit of every choice first: the ${most ? 'biggest' : 'smallest'} hundreds digit wins. If two numbers tie, compare their tens digits.`,
    explain: `Comparing place by place, ${fmtNum(target)} is the ${most ? 'greatest' : 'least'}. In order: ${[...uniq].sort((x, y) => x - y).map(fmtNum).join(', ')}.`,
    ...mcP(rng, target, uniq.filter((x) => x !== target), [], fmtNum),
  };
};

const repZero = (rng, t) => {
  const h = randInt(rng, 1, 9), o = randInt(rng, 1, 9);
  const zeroTens = chance(rng, 0.6);
  const tn = zeroTens ? 0 : randInt(rng, 1, 9);
  const oo = zeroTens ? o : 0;
  const n = h * 100 + tn * 10 + oo;
  if (chance(rng, 0.5)) {
    return {
      prompt: `Which number has ${u(h, 'hundred')}, ${u(tn, 'ten')} and ${u(oo, 'one')}?`,
      visual: t <= 2 ? { type: 'base10', hundreds: h, tens: tn, ones: oo } : undefined,
      hint: `Which number has ${u(h, 'hundred')}, ${u(tn, 'ten')} and ${u(oo, 'one')}? Write the digits in order: hundreds, then tens, then ones. If a place has none, write a 0 there so the other digits stay in the right places.`,
      explain: `${u(h, 'hundred')}, ${u(tn, 'ten')}, ${u(oo, 'one')} is ${fmtNum(n)}. The 0 shows that the ${zeroTens ? 'tens' : 'ones'} place is empty.`,
      ...mcP(rng, n, zeroTens ? [h * 10 + o, h * 100 + o * 10, h * 1000 + o] : [h * 10 + tn, h * 1000 + tn * 10, h * 100 + tn], [], fmtNum),
    };
  }
  const place = zeroTens ? 'tens' : 'ones';
  const opts = ['There are no tens.', 'There are no ones.', 'There are no hundreds.', 'The number is less than 10.'];
  const correct = zeroTens ? opts[0] : opts[1];
  return {
    prompt: `What does the 0 in ${fmtNum(n)} tell you?`,
    visual: { type: 'placevalue', columns: PV3, digits: hto(n) },
    hint: `What is the 0 in ${fmtNum(n)} telling you? The first digit is hundreds, the middle digit is tens and the last digit is ones. Find which place the 0 sits in: that place has nothing in it. Check each choice against that.`,
    explain: `The 0 is in the ${place} place, so there are no ${place}. It holds that place so the ${h} still means ${u(h, 'hundred')}.`,
    ...mcP(rng, correct, opts.filter((x) => x !== correct), [], String),
  };
};

const repRename = (rng, t) => {
  const n = randInt(rng, 110, 989);
  const [h, tn, o] = hto(n);
  const k = randInt(rng, 0, 2);
  if (k === 0 && h >= 1) {
    // blocks with regrouped tens
    const h2 = h - 1, t2 = tn + 10;
    if (t2 <= 19) {
      return {
        prompt: `What number is ${u(h2, 'hundred')}, ${u(t2, 'ten')} and ${u(o, 'one')}?`,
        visual: { type: 'base10', hundreds: h2, tens: t2, ones: o },
        hint: `What number do ${u(h2, 'hundred')}, ${u(t2, 'ten')} and ${u(o, 'one')} make? 10 tens make 1 hundred, so trade 10 of the rods for 1 more flat. Count the flats, rods and cubes you have after the trade.`,
        explain: `${u(t2, 'ten')} = 1 hundred and ${u(tn, 'ten')}. So ${u(h2, 'hundred')} + 1 hundred = ${u(h, 'hundred')}. The number is ${fmtNum(n)}.`,
        ...mcN(rng, n, [Number(`${h2}${t2}${o}`), h2 * 100 + tn * 10 + o, n + 100, h2 * 100 + t2 + o]),
      };
    }
  }
  if (k === 1 && tn >= 1) {
    const ones = o + 10;
    return {
      kind: 'num',
      prompt: `${fmtNum(n)} = ${u(h, 'hundred')} + □ tens + ${u(ones, 'one')}`,
      hint: `First find how many tens and ones ${fmtNum(n)} has. To show ${o + 10} ones, you must break one of the tens into ten ones. How many tens are left after you break one apart?`,
      explain: `${fmtNum(n)} is ${u(h, 'hundred')}, ${u(tn, 'ten')}, ${u(o, 'one')}. Trade 1 ten for 10 ones: ${u(h, 'hundred')}, ${u(tn - 1, 'ten')}, ${u(ones, 'one')}. So □ = ${tn - 1}.`,
      answer: num(tn - 1),
    };
  }
  // Which is another way to show n?
  const good = [];
  if (h >= 1) good.push([h - 1, tn + 10, o]);
  if (tn >= 1) good.push([h, tn - 1, o + 10]);
  good.push([0, h * 10 + tn, o]);
  const g = pick(rng, good);
  const bad = [[h - 1, tn, o + 10], [h - 1, tn + 1, o], [h, tn + 10, o], [h - 1, tn + 10, o + 10], [h + 1, tn - 10 + 1, o]]
    .filter((x) => x.every((v) => v >= 0) && x[0] * 100 + x[1] * 10 + x[2] !== n);
  const fmt = (x) => (x[0] ? `${u(x[0], 'hundred')}, ` : '') + `${u(x[1], 'ten')}, ${u(x[2], 'one')}`;
  return {
    prompt: `Which is another way to show ${fmtNum(n)}?`,
    hint: `Which choice adds up to exactly ${fmtNum(n)}? Test each one: hundreds are worth 100 each, tens 10 each, ones 1 each. Add them up. 1 hundred = 10 tens and 1 ten = 10 ones, so a choice can look different and still be the same number.`,
    explain: `${fmt(g)} = ${g[0] * 100} + ${g[1] * 10} + ${g[2]} = ${fmtNum(n)}.`,
    ...mcP(rng, g, bad, [], fmt),
  };
};

const repBenchmark = (rng, t) => {
  const marks = [0, 250, 500, 750, 1000];
  const nl = { type: 'numberline', min: 0, max: 1000, ticks: 250, labels: marks };
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    let v;
    do { v = randInt(rng, 2, 98) * 10; } while (marks.some((m) => Math.abs(m - v) === 125) || marks.includes(v));
    const near = marks.reduce((b, m) => (Math.abs(m - v) < Math.abs(b - v) ? m : b), 0);
    return {
      prompt: `Which benchmark is ${fmtNum(v)} closest to?`,
      visual: { ...nl, marks: [{ value: v, label: fmtNum(v) }] },
      hint: `Is ${fmtNum(v)} nearest to 0, 250, 500, 750 or 1000? First find the two benchmarks it is between. The halfway points are 125, 375, 625 and 875: is ${fmtNum(v)} before or after the halfway point?`,
      explain: `${fmtNum(v)} is ${Math.abs(v - near)} away from ${fmtNum(near)}, closer than to any other benchmark.`,
      ...mcP(rng, near, marks.filter((m) => m !== near && Math.abs(m - near) <= 500), [], fmtNum),
    };
  }
  if (k === 1) {
    const b = pick(rng, [250, 500, 750]);
    const v = b + pick(rng, [-1, 1]) * randInt(rng, 1, 6) * 10;
    return {
      prompt: 'Which number is the arrow pointing to?',
      visual: { ...nl, arrow: v },
      hint: `The arrow is on a 0 to 1000 number line, very close to the ${fmtNum(b)} mark. Is it a little before ${fmtNum(b)} (less) or a little after (more)? Pick a choice that is close to ${fmtNum(b)} and on that side.`,
      explain: `The arrow is just ${v < b ? 'before' : 'after'} ${fmtNum(b)}, so it points to about ${fmtNum(v)}.`,
      ...mcP(rng, v, [v + 250, v - 250, 1000 - v, v + 500].filter((x) => x > 0 && x < 1000 && Math.abs(x - v) >= 200), [v + 300, v - 300].filter((x) => x > 0 && x < 1000), fmtNum),
    };
  }
  const lo = pick(rng, [0, 250, 500, 750]);
  const v = lo + randInt(rng, 3, 22) * 10;
  const wrongs = [lo - 150, lo + 400, lo + 650, lo - 400].filter((x) => x > 0 && x < 1000);
  return {
    prompt: `Which number is between ${fmtNum(lo)} and ${fmtNum(lo + 250)}?`,
    visual: nl,
    hint: `Which number is more than ${fmtNum(lo)} but less than ${fmtNum(lo + 250)}? Test each choice twice: is it bigger than ${fmtNum(lo)}? Is it smaller than ${fmtNum(lo + 250)}? Only one passes both tests.`,
    explain: `${fmtNum(v)} is more than ${fmtNum(lo)} and less than ${fmtNum(lo + 250)}.`,
    ...mcP(rng, v, wrongs, [lo + 260, lo + 300].filter((x) => x < 1000 && x > 0), fmtNum),
  };
};

const repDigitsMake = (rng, t) => {
  const d = sample(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
  const great = chance(rng, 0.5);
  const sorted = d.slice().sort((a, b) => b - a);
  let ans;
  if (great) ans = sorted[0] * 100 + sorted[1] * 10 + sorted[2];
  else {
    const asc = d.slice().sort((a, b) => a - b);
    if (asc[0] === 0) ans = asc[1] * 100 + asc[0] * 10 + asc[2]; else ans = asc[0] * 100 + asc[1] * 10 + asc[2];
  }
  const q = {
    prompt: `Use the digits ${d.join(', ')} once each. What is the ${great ? 'greatest' : 'least'} 3-digit number you can make?`,
    hint: great ? `What is the biggest 3-digit number you can build with ${d.join(', ')}? The hundreds place is worth the most, so the biggest digit goes there. Then put the next biggest digit in the tens place.` : `What is the smallest 3-digit number you can build with ${d.join(', ')}? Put the smallest digit you can in the hundreds place (it cannot be 0). Then use the smallest digit left in the tens place.`,
    explain: great ? `Biggest digit first: ${ans}.` : `The smallest digit that can go first goes in the hundreds place, then the rest from smallest to biggest: ${ans}.`,
  };
  if (t >= 6) return { ...q, kind: 'num', answer: num(ans) };
  const alts = [];
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const p of perms) { const x = d[p[0]] * 100 + d[p[1]] * 10 + d[p[2]]; if (d[p[0]] !== 0) alts.push(x); }
  return { ...q, ...mcP(rng, ans, alts.filter((x) => x !== ans), [], fmtNum) };
};

const repRiddle = (rng, t) => {
  if (t >= 7 && chance(rng, 0.6)) {
    const o = randInt(rng, 1, 4), h = 2 * o, dt = randInt(rng, 1, h - 1 > 0 ? Math.min(h - 1, 5) : 1), tn = h - dt;
    const n = h * 100 + tn * 10 + o;
    const q = {
      prompt: `Number riddle: my ones digit is ${o}. My hundreds digit is double my ones digit. My tens digit is ${dt} less than my hundreds digit. What number am I?`,
      hint: `Solve the clues in order. The ones digit is given. Double it to get the hundreds digit, then count back ${dt} from the hundreds digit to get the tens digit.`,
      explain: `Ones: ${o}. Hundreds: double ${o} = ${h}. Tens: ${h} − ${dt} = ${tn}. The number is ${fmtNum(n)}.`,
    };
    if (chance(rng, 0.5)) return { ...q, kind: 'num', answer: num(n) };
    return { ...q, ...mcN(rng, n, [o * 100 + tn * 10 + h, h * 100 + (h + dt <= 9 ? h + dt : tn - 1) * 10 + o, h * 100 + o * 10 + tn, n + 100]) };
  }
  const h = randInt(rng, 1, 9), o = randInt(rng, 0, 7), diff = randInt(rng, 1, 2);
  const tn = o + diff;
  const n = h * 100 + tn * 10 + o;
  const q = {
    prompt: `I have ${u(h, 'hundred')}. My ones digit is ${o}. My tens digit is ${diff} more than my ones digit. What number am I?`,
    hint: `Build the number one clue at a time. The hundreds digit is ${h} and the ones digit is ${o}. For the tens digit, start at ${o} and count up ${diff}. Then write hundreds, tens, ones in order.`,
    explain: `Hundreds: ${h}. Ones: ${o}. Tens: ${o} + ${diff} = ${tn}. The number is ${fmtNum(n)}.`,
  };
  if (chance(rng, 0.5)) return { ...q, kind: 'num', answer: num(n) };
  return { ...q, ...mcN(rng, n, [h * 100 + o * 10 + tn, h * 100 + (o - diff) * 10 + o, h * 100 + diff * 10 + o, n + 100]) };
};

// Big challenge that stays inside Grade 3 (numbers to 1000): reaching and renaming 1000.
const repThousands = (rng, t) => {
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const [step, from] = pick(rng, [[1, 999], [10, 990], [100, 900], [5, 995], [25, 975], [50, 950]]);
    return {
      kind: 'num',
      prompt: `Big challenge! What is ${step} more than ${fmtNum(from)}?`,
      hint: `What is ${step} more than ${fmtNum(from)}? Count on ${step} from ${fmtNum(from)}. What number comes right after all the numbers in the 900s?`,
      explain: `${fmtNum(from)} + ${step} = 1000. Ten hundreds make one thousand.`,
      answer: num(1000),
    };
  }
  if (k === 1) {
    const h = randInt(rng, 6, 9), tens = (10 - h) * 10;
    return {
      prompt: `Big challenge! What number is ${u(h, 'hundred')} and ${u(tens, 'ten')}?`,
      visual: tens <= 20 ? { type: 'base10', hundreds: h, tens, ones: 0 } : undefined,
      hint: `What number do ${u(h, 'hundred')} and ${u(tens, 'ten')} make? 10 tens make 1 hundred, so trade each 10 tens for 1 more hundred. How many hundreds do you have then?`,
      explain: `${u(tens, 'ten')} = ${u(tens / 10, 'hundred')}. ${h} + ${tens / 10} = 10 hundreds, and 10 hundreds = 1000.`,
      ...mcN(rng, 1000, [h * 100 + tens, h * 100 + tens / 10, Number(`${h}${tens}`), 900, 1100]),
    };
  }
  const unit = pick(rng, [['hundreds', 10], ['tens', 100]]);
  return {
    prompt: `Big challenge! How many ${unit[0]} make 1000?`,
    hint: unit[0] === 'hundreds' ? 'How many hundreds make 1000? Count by hundreds: 100, 200, 300, … and count how many jumps it takes to reach 1000.' : 'How many tens make 1000? 10 tens make 1 hundred, and 1000 is 10 hundreds. So think: 10 groups of 10 tens.',
    explain: unit[0] === 'hundreds' ? '10 hundreds = 1000.' : '1 hundred = 10 tens, so 10 hundreds = 10 × 10 = 100 tens. 100 tens = 1000.',
    ...mcN(rng, unit[1], unit[1] === 10 ? [100, 1000, 9, 11] : [10, 1000, 90, 110]),
  };
};

const g3Represent = {
  id: 'g3-qpv-represent', grade: 3, strand: 'number', bigIdea: 'qpv', species: 'numberling',
  name: 'Numbers to 1000',
  parentDesc: 'Represents numbers to 1000: numerals and words, base-ten blocks, digit value, zero as a placeholder, renaming, comparing, and benchmarks 250/500/750.',
  classic: false,
  gen: tiered([
    [1, 2, repBase10, 2], [1, 3, repChart], [2, 4, repZero], [2, 5, repWords], [3, 5, repDigitValue, 1.5], [3, 5, repCompare],
    [3, 5, repGreatest], [4, 5, repRename, 1.5], [4, 7, repBenchmark, 1.2], [5, 7, repDigitsMake], [6, 7, repRiddle, 1.5], [6, 7, repRename], [7, 7, repThousands, 0.6],
  ]),
};

// ---------------------------------------------------------------------------
// SD2 Fractions
// ---------------------------------------------------------------------------
const DENS = { 1: [2, 3, 4], 2: [2, 3, 4, 5, 6, 8], 3: [2, 3, 4, 5, 6, 8, 10] };
const densFor = (t) => DENS[Math.min(t, 3)];
const properFracs = (list) => list.filter(([a, b]) => a >= 1 && b >= 2 && a <= b).map(([a, b]) => frac(a, b));
const pl = (d) => fracWords(2, d).split(' ')[1]; // 'fourths'
const SET_ICONS = ['🍎', '⭐', '🐟', '🦉', '🌼', '🧁', '🐞', '🍓', '🎈', '🐸'];
function fracVisual(rng, n, d, kind) {
  const k = kind || pick(rng, ['bar', 'circle', 'set']);
  const color = pick(rng, COLOURS);
  if (k === 'bar') return { type: 'fractionbar', bars: [{ parts: d, shaded: n, color }] };
  if (k === 'circle') return { type: 'fractioncircle', parts: d, shaded: n, color };
  return { type: 'fractionset', total: d, shaded: n, icon: pick(rng, SET_ICONS) };
}

const frName = (rng, t) => {
  const d = pick(rng, densFor(t));
  const n = t >= 2 && chance(rng, 0.1) ? d : randInt(rng, 1, d - 1);
  const v = fracVisual(rng, n, d, t === 1 ? pick(rng, ['bar', 'circle']) : undefined);
  const isSet = v.type === 'fractionset';
  const wrong = properFracs([[d - n, d], [n, d - n], [n, d + 1], [n + 1, d], [n - 1, d], [1, d]]);
  return {
    prompt: isSet ? 'What fraction of the set is shaded?' : pick(rng, ['What fraction is shaded?', 'What fraction of the whole is coloured?']),
    visual: v,
    hint: isSet ? 'What fraction of the objects are shaded? The bottom number (denominator) is how many objects there are in all. The top number (numerator) is how many of them are shaded. Count each one.' : 'What part of the whole is shaded? Count ALL the equal parts: that is the bottom number. Then count only the shaded parts: that is the top number.',
    explain: `There are ${isSet ? `${d} objects` : `${d} equal parts`} and ${n} ${n === 1 ? 'is' : 'are'} shaded, so the fraction is ${frac(n, d)} (${fracWords(n, d)}).`,
    ...mcP(rng, frac(n, d), wrong.filter((x) => x !== frac(n, d) && !/\/0\]/.test(x)), [], String),
  };
};

const frPickPicture = (rng, t) => {
  const d = pick(rng, densFor(t));
  const n = randInt(rng, 1, d - 1);
  const kind = pick(rng, ['bar', 'circle']);
  const color = pick(rng, COLOURS);
  const mk = (s, p) => (kind === 'bar' ? { type: 'fractionbar', bars: [{ parts: p, shaded: s, color }] } : { type: 'fractioncircle', parts: p, shaded: s, color });
  const wrongs = [mk(d - n, d), n + d <= 12 ? mk(n, n + d) : null, mk(Math.min(n + 1, d), d), mk(n, d + 1 <= 12 ? d + 1 : d - 1), n > 1 ? mk(n - 1, d) : null];
  return {
    prompt: `Which picture shows ${frac(n, d)}?`,
    hint: `Which picture shows ${frac(n, d)}? The bottom number means the whole is cut into ${d} equal parts. The top number means ${n} of those parts are shaded. For each picture, count all the parts, then the shaded parts.`,
    explain: `${frac(n, d)} means ${d} equal parts with ${n} shaded.`,
    ...mcV(rng, mk(n, d), shuffle(rng, wrongs.filter(Boolean))),
  };
};

const frVocab = (rng, t) => {
  const d = pick(rng, densFor(3));
  const n = randInt(rng, 1, d - 1);
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const opts = [`The whole has ${d} equal parts.`, `${d} parts are shaded.`, `There are ${d} wholes.`, `Each part is ${d} cm long.`];
    return {
      prompt: `In ${frac(n, d)}, what does the ${d} tell you?`,
      visual: fracVisual(rng, n, d, 'bar'),
      hint: `What does the bottom number of ${frac(n, d)} tell you? The bottom number is the denominator: how many equal parts the whole is cut into. The top number (numerator) is how many parts we count. Which choice talks about the equal parts of the whole?`,
      explain: `The denominator ${d} tells how many equal parts the whole is cut into. The numerator ${n} tells how many parts we count.`,
      ...mcP(rng, opts[0], opts.slice(1), [], String),
    };
  }
  if (k === 1) {
    const opts = [n === 1 ? '1 of the equal parts is counted.' : `${n} of the equal parts are counted.`, `The whole has ${u(n, 'part')}.`, n === 1 ? 'There is 1 whole.' : `There are ${n} wholes.`, n === 1 ? '1 part is not shaded.' : `${n} parts are not shaded.`];
    return {
      prompt: `In ${frac(n, d)}, what does the ${n} tell you?`,
      visual: fracVisual(rng, n, d, 'circle'),
      hint: `What does the top number of ${frac(n, d)} tell you? The top number is the numerator: how many of the equal parts we are counting (the shaded ones). The bottom number tells how many equal parts the whole has. Which choice matches the top number?`,
      explain: `The numerator ${n} tells how many of the ${d} equal parts we are counting (the shaded ones).`,
      ...mcP(rng, opts[0], opts.slice(1), [], String),
    };
  }
  const which = chance(rng, 0.5) ? 'numerator' : 'denominator';
  const ans = which === 'numerator' ? n : d;
  return {
    prompt: `What is the ${which} of ${frac(n, d)}?`,
    hint: `Which number is the ${which} of ${frac(n, d)}? The numerator is the TOP number: the parts we count. The denominator is the BOTTOM number: the equal parts in the whole.`,
    explain: `In ${frac(n, d)}, the numerator is ${n} and the denominator is ${d}. So the ${which} is ${ans}.`,
    ...mcP(rng, ans, [which === 'numerator' ? d : n, n + d], [d - n, ans + 1], String),
  };
};

const frCompareSame = (rng, t) => {
  const d = pick(rng, [3, 4, 5, 6, 8, 10]);
  const [a, b] = sample(rng, Array.from({ length: d - 1 }, (_, i) => i + 1), 2);
  const col = pick(rng, COLOURS);
  if (t >= 5 && d >= 5 && chance(rng, 0.5)) {
    const nums = sample(rng, Array.from({ length: d }, (_, i) => i + 1), 3);
    const most = chance(rng, 0.5);
    const target = most ? Math.max(...nums) : Math.min(...nums);
    return {
      prompt: `Which fraction is the ${most ? 'greatest' : 'least'}?`,
      hint: `All of these are ${pl(d)}, so every piece is the same size. The fraction with the ${most ? 'most' : 'fewest'} pieces is the ${most ? 'greatest' : 'least'}. Compare the top numbers.`,
      explain: `They are all ${pl(d)}. ${u(target, 'part')} is the ${most ? 'most' : 'fewest'}, so ${frac(target, d)} is the ${most ? 'greatest' : 'least'}.`,
      ...mcP(rng, frac(target, d), nums.filter((x) => x !== target).map((x) => frac(x, d)), [], String),
    };
  }
  if (chance(rng, 0.5)) {
    const sym = a < b ? '<' : '>';
    return {
      prompt: `Which symbol makes this true? ${frac(a, d)} □ ${frac(b, d)}`,
      visual: t <= 4 ? { type: 'fractionbar', bars: [{ parts: d, shaded: a, color: col, label: frac(a, d) }, { parts: d, shaded: b, color: col, label: frac(b, d) }] } : undefined,
      hint: `< means "less than", > means "greater than" and = means "the same". Both fractions are ${pl(d)}, so the pieces are the same size. Which has more pieces: ${a} or ${b}?`,
      explain: `Both fractions have ${d} equal parts. ${u(a, 'part')} ${a < b ? 'is less than' : 'is more than'} ${u(b, 'part')}, so ${frac(a, d)} ${sym} ${frac(b, d)}.`,
      ...fixedChoices(['<', '=', '>'], sym),
    };
  }
  const greater = chance(rng, 0.6);
  const ans = greater ? Math.max(a, b) : Math.min(a, b);
  return {
    prompt: `Which is ${greater ? 'greater' : 'less'}: ${frac(a, d)} or ${frac(b, d)}?`,
    visual: t <= 4 ? { type: 'fractionbar', bars: [{ parts: d, shaded: a, color: col, label: frac(a, d) }, { parts: d, shaded: b, color: col, label: frac(b, d) }] } : undefined,
    hint: `Both fractions are ${pl(d)}, so every piece is the same size. The one with ${greater ? 'more' : 'fewer'} pieces is ${greater ? 'greater' : 'less'}. Compare the top numbers, ${a} and ${b}.`,
    explain: `${frac(ans, d)} has ${greater ? 'more' : 'fewer'} parts of the same size, so it is ${greater ? 'greater' : 'less'}.`,
    ...fixedChoices([frac(a, d), frac(b, d)], frac(ans, d)),
  };
};

const frCompareUnit = (rng, t) => {
  const [p, q] = sample(rng, [2, 3, 4, 5, 6, 8, 10], 2);
  const greater = chance(rng, 0.6);
  const ans = greater ? Math.min(p, q) : Math.max(p, q); // bigger denominator -> smaller part
  const col = pick(rng, COLOURS);
  const vis = t <= 4 ? { type: 'fractionbar', bars: [{ parts: p, shaded: 1, color: col, label: frac(1, p) }, { parts: q, shaded: 1, color: col, label: frac(1, q) }] } : undefined;
  if (chance(rng, 0.45)) {
    const [a, b] = nm2(rng);
    const food = pick(rng, ['pizza', 'pie', 'cake', 'sandwich', 'pan of lasagna', 'watermelon', 'granola bar']);
    const who = ans === p ? a : b;
    return {
      prompt: `${a} eats ${frac(1, p)} of a ${food}. ${b} eats ${frac(1, q)} of the same size ${food}. Who eats ${greater ? 'more' : 'less'}?`,
      visual: vis,
      hint: `Who eats ${greater ? 'more' : 'less'}? ${a} eats 1 piece of a ${food} cut into ${p}; ${b} eats 1 piece of the same size ${food} cut into ${q}. The more pieces you cut a whole into, the smaller each piece is. Which ${food} was cut into ${greater ? 'fewer' : 'more'} pieces?`,
      explain: `${frac(1, Math.min(p, q))} is bigger than ${frac(1, Math.max(p, q))} because the whole is cut into fewer pieces. So ${who} eats ${greater ? 'more' : 'less'}.`,
      ...fixedChoices([a, b], who),
    };
  }
  return {
    prompt: `Which is ${greater ? 'greater' : 'less'}: ${frac(1, p)} or ${frac(1, q)}?`,
    visual: vis,
    hint: `Which is ${greater ? 'greater' : 'less'}: ${frac(1, p)} or ${frac(1, q)}? Picture one pizza cut into ${p} slices and the same pizza cut into ${q} slices. Fewer slices means each slice is bigger.`,
    explain: `The bigger the denominator, the smaller each part. ${frac(1, Math.min(p, q))} > ${frac(1, Math.max(p, q))}, so ${frac(1, ans)} is ${greater ? 'greater' : 'less'}.`,
    ...fixedChoices([frac(1, p), frac(1, q)], frac(1, ans)),
  };
};

const frOrderUnit = (rng, t) => {
  const ds = sample(rng, [2, 3, 4, 5, 6, 8, 10], t >= 6 ? 4 : 3);
  const asc = chance(rng, 0.5);
  const sorted = ds.slice().sort((a, b) => (asc ? b - a : a - b)); // least first => biggest denominator first
  const fmt = (arr) => arr.map((d) => frac(1, d)).join(', ');
  const wrongs = [ds.slice().sort((a, b) => (asc ? a - b : b - a)), shuffle(rng, ds), shuffle(rng, ds), [sorted[1], sorted[0], ...sorted.slice(2)]];
  return {
    prompt: `Order from ${asc ? 'least to greatest' : 'greatest to least'}: ${ds.map((d) => frac(1, d)).join(', ')}`,
    visual: t <= 5 ? { type: 'fractionbar', bars: ds.map((d) => ({ parts: d, shaded: 1, color: 'blue', label: frac(1, d) })) } : undefined,
    hint: `Put them in order from ${asc ? 'least to greatest' : 'greatest to least'}. Every top number is 1, so look at the bottom numbers: a bigger bottom number means the whole is cut into more, smaller pieces. Check with the bars.`,
    explain: `Bigger denominators make smaller parts, so from ${asc ? 'least to greatest' : 'greatest to least'}: ${fmt(sorted)}.`,
    ...mcP(rng, sorted, wrongs, [], fmt),
  };
};

const frWhole = (rng, t) => {
  const d = pick(rng, densFor(3));
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    return {
      prompt: 'Which fraction is equal to 1 whole?',
      visual: t <= 5 ? { type: 'fractioncircle', parts: d, shaded: d, color: pick(rng, COLOURS) } : undefined,
      hint: 'Which fraction means the whole thing? A fraction is 1 whole when EVERY part is counted, so the top number and the bottom number are the same. Check the top and bottom of each choice.',
      explain: `${frac(d, d)} means ${d} out of ${d} equal parts: the whole thing. So ${frac(d, d)} = 1.`,
      ...mcP(rng, frac(d, d), [frac(1, d), frac(d - 1, d), frac(0, d)], [], String),
    };
  }
  if (k === 1) {
    return {
      kind: 'num',
      prompt: `How many ${pl(d)} make 1 whole?`,
      visual: t <= 4 ? { type: 'fractionbar', bars: [{ parts: 1, shaded: 0, label: '1' }, { parts: d, shaded: d, color: pick(rng, COLOURS) }] } : undefined,
      hint: 'How many equal pieces does it take to fill one whole bar? Point to each piece in the shaded bar and count them one at a time.',
      explain: `A whole cut into ${pl(d)} has ${d} parts, so ${frac(d, d)} = 1.`,
      answer: num(d),
    };
  }
  const [a, b] = sample(rng, [2, 3, 4, 5, 6, 8, 10], 2);
  return {
    prompt: `Which is true?`,
    hint: 'Which sentence is true? A fraction is 1 whole when its top and bottom numbers are the same. For each sentence, ask: is the left side the same amount as the right side?',
    explain: `${frac(a, a)} and ${frac(b, b)} are both 1 whole, so ${frac(a, a)} = ${frac(b, b)}.`,
    ...mcP(rng, `${frac(a, a)} = ${frac(b, b)}`, [`${frac(1, a)} = ${frac(1, b)}`, `${frac(a, a)} = ${frac(1, b)}`, `${frac(1, a)} = 1`], [], String),
  };
};

const frEstimate = (rng, t) => {
  const bench = pick(rng, [
    ['about [[f:1/4]]', 25, 'one fourth'], ['about [[f:1/2]]', 50, 'one half'], ['about [[f:3/4]]', 75, 'three fourths'],
    ['almost none', 4, 'close to 0'], ['almost all', 96, 'close to 1 whole']]);
  const shaded = Math.max(1, Math.min(99, bench[1] + randInt(rng, -4, 4)));
  const opts = ['almost none', 'about [[f:1/4]]', 'about [[f:1/2]]', 'about [[f:3/4]]', 'almost all'];
  const i = opts.indexOf(bench[0]);
  const near = [opts[i - 1], opts[i + 1], opts[i - 2], opts[i + 2]].filter(Boolean);
  const what = pick(rng, ['the grid', 'the garden', 'the wall', 'the quilt']);
  return {
    prompt: `About how much of ${what} is shaded?`,
    speak: `About how much of ${what} is shaded?`,
    visual: { type: 'hundredgrid', shaded },
    hint: `About how much of ${what} is shaded? Picture the grid folded in half, then into 4 equal parts. Match the shaded part to a choice: almost none (a few squares), about [[f:1/4]] (one of 4 parts), about [[f:1/2]] (half), about [[f:3/4]] (3 of 4 parts) or almost all (nearly every square).`,
    explain: `${shaded} of the 100 small squares are shaded. That is close to ${bench[2]} of the grid, so the best estimate is ${bench[0]}.`,
    ...mcP(rng, bench[0], near.slice(0, 3), [], String),
  };
};

const frWord = (rng, t) => {
  const d = pick(rng, [3, 4, 5, 6, 8, 10]);
  const n = randInt(rng, 1, d - 1);
  const who = nm(rng);
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const food = pick(rng, ['pizza', 'pie', 'cake', 'tray of brownies', 'quesadilla']);
    const left = chance(rng, 0.5);
    const ans = left ? d - n : n;
    return {
      prompt: `A ${food} is cut into ${d} equal pieces. ${who} eats ${n}. What fraction ${left ? 'is left' : 'did ' + who + ' eat'}?`,
      visual: t <= 4 ? { type: 'fractioncircle', parts: d, shaded: n, color: pick(rng, COLOURS) } : undefined,
      hint: left ? `What fraction of the ${food} is left? It has ${d} equal pieces, so the bottom number is ${d}. ${who} ate ${n}. How many pieces are NOT eaten? That is the top number.` : `What fraction did ${who} eat? The ${food} has ${d} equal pieces: that is the bottom number. The pieces ${who} ate are the top number.`,
      explain: `There are ${d} pieces. ${left ? `${d} − ${n} = ${d - n} left` : `${n} eaten`}, so the fraction is ${frac(ans, d)}.`,
      ...mcP(rng, frac(ans, d), properFracs([[left ? n : d - n, d], [ans, d + 1], [n, d - n], [ans + 1, d]]).filter((x) => x !== frac(ans, d)), [], String),
    };
  }
  if (k === 1) {
    const [s, p, icon] = pick(rng, [['owl', 'owls', '🦉'], ['frog', 'frogs', '🐸'], ['fish', 'fish', '🐟'], ['ladybug', 'ladybugs', '🐞'], ['balloon', 'balloons', '🎈'], ['flower', 'flowers', '🌼']]);
    const adj = { owl: 'sleeping', frog: 'green', fish: 'striped', ladybug: 'spotted', balloon: 'red', flower: 'yellow' }[s];
    return {
      prompt: `There are ${d} ${p}. ${n} ${n === 1 ? 'is' : 'are'} ${adj}. What fraction of the ${p} ${n === 1 ? 'is' : 'are'} ${adj}?`,
      visual: t <= 4 ? { type: 'fractionset', total: d, shaded: n, icon } : undefined,
      hint: `What fraction of the ${p} are ${adj}? All the ${p} together make the whole set: count them for the bottom number. The ${adj} ones are the top number.`,
      explain: `${n} out of ${d} ${p} are ${adj}, so the fraction is ${frac(n, d)}.`,
      ...mcP(rng, frac(n, d), properFracs([[d - n, d], [n, d - n], [n, d + 1]]).filter((x) => x !== frac(n, d)), properFracs([[n + 1, d], [n - 1, d]]), String),
    };
  }
  const thing = pick(rng, ['ribbon', 'garden', 'chocolate bar', 'fence', 'rope', 'banner']);
  const verb = { ribbon: 'uses', garden: 'plants', 'chocolate bar': 'shares', fence: 'paints', rope: 'cuts off', banner: 'colours' }[thing];
  return {
    prompt: `${who}'s ${thing} has ${d} equal parts. ${who} ${verb} ${n} of them. What fraction is that?`,
    visual: t <= 4 ? { type: 'fractionbar', bars: [{ parts: d, shaded: n, color: pick(rng, COLOURS) }] } : undefined,
    hint: `What part of the ${thing} is that? Count all the equal parts of the ${thing} for the bottom number. The parts ${who} used are the top number.`,
    explain: `${n} of the ${d} equal parts is ${frac(n, d)}.`,
    ...mcP(rng, frac(n, d), properFracs([[d - n, d], [n, d - n], [n, d + 1]]).filter((x) => x !== frac(n, d)), properFracs([[n + 1, d], [n - 1, d]]), String),
  };
};

const frTwoStep = (rng, t) => {
  const d = pick(rng, t >= 7 ? [6, 8, 10] : [5, 6, 8, 10]); // Grade 3 denominators only (no twelfths)
  const food = pick(rng, ['pie', 'pizza', 'cake', 'garden bed', 'pan of cornbread']);
  const verb = food === 'garden bed' ? 'plants' : 'eats';
  if (t >= 7 && chance(rng, 0.6)) {
    const [p, q, r] = sample(rng, NAMES, 3);
    const a = randInt(rng, 1, 3), b = randInt(rng, 1, 3), c = randInt(rng, 1, d - a - b - 1);
    const left = d - a - b - c;
    return {
      prompt: `A ${food} has ${d} equal parts. ${p} ${verb} ${frac(a, d)}, ${q} ${verb} ${frac(b, d)} and ${r} ${verb} ${frac(c, d)}. What fraction is left?`,
      hint: `How much is left after three people? Add up all the parts used: ${a} + ${b} + ${c}. Then take that away from all ${d} parts.`,
      explain: `${a} + ${b} + ${c} = ${a + b + c} parts were used. ${d} − ${a + b + c} = ${left}, so ${frac(left, d)} is left.`,
      ...mcP(rng, frac(left, d), [frac(a + b + c, d), frac(left + 1, d), frac(d - a - b, d), frac(left, d - 1)].filter((x) => x !== frac(left, d)), [], String),
    };
  }
  const a = randInt(rng, 1, d - 3), b = randInt(rng, 1, d - a - 1);
  const [p, q] = nm2(rng);
  const left = d - a - b;
  return {
    prompt: `A ${food} has ${d} equal parts. ${p} ${verb} ${frac(a, d)} and ${q} ${verb} ${frac(b, d)}. What fraction is left?`,
    visual: t === 6 ? { type: 'fractionbar', bars: [{ parts: d, shaded: 0 }] } : undefined,
    hint: `How much of the ${food} is left after both? Add up the parts used: ${a} + ${b}. Then take that away from all ${d} parts.`,
    explain: `${a} + ${b} = ${a + b} parts were used. ${d} − ${a + b} = ${left}, so ${u(left, 'part')} ${left === 1 ? 'is' : 'are'} left and ${frac(left, d)} is left.`,
    ...mcP(rng, frac(left, d), [frac(a + b, d), frac(left + 1, d), frac(Math.abs(a - b) || d - 1, d), frac(left, d - 1)].filter((x) => x !== frac(left, d)), [], String),
  };
};

const frPreviewEquiv = (rng, t) => {
  if (chance(rng, 0.5)) {
    // Keep both fractions in Grade 3 denominators (halves to tenths, no ninths or twelfths).
    const [n, d] = pick(rng, [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5]]);
    const m = pick(rng, [2, 4, 5].filter((x) => [4, 6, 8, 10].includes(d * x)));
    const col = pick(rng, COLOURS);
    const ans = frac(n * m, d * m);
    return {
      prompt: `Big challenge! Which fraction is equal to ${frac(n, d)}?`,
      visual: { type: 'fractionbar', bars: [{ parts: d, shaded: n, color: col, label: frac(n, d) }, { parts: d * m, shaded: n * m, color: col }] },
      hint: `Which fraction is the same amount as ${frac(n, d)}? Look at the second bar. Count how many of its small parts line up under the shaded part of the first bar, and how many small parts it has in all.`,
      explain: `Both bars have the same amount shaded. ${frac(n, d)} = ${ans}.`,
      ...mcP(rng, ans, [frac(n + m, d + m), frac(n * m, d), frac(n, d * m), frac(n + 1, d * m)].filter((x) => x !== ans), [], String),
    };
  }
  const n = randInt(rng, 2, 3);
  const [p, q] = sample(rng, [4, 5, 6, 8, 10].filter((x) => x > n), 2);
  const ans = frac(n, Math.min(p, q));
  return {
    prompt: `Big challenge! Which is greater: ${frac(n, p)} or ${frac(n, q)}?`,
    visual: { type: 'fractionbar', bars: [{ parts: p, shaded: n, label: frac(n, p) }, { parts: q, shaded: n, label: frac(n, q) }] },
    hint: `Which is greater: ${frac(n, p)} or ${frac(n, q)}? Both have ${n} pieces. Which pieces are bigger: ${pl(p)} or ${pl(q)}? A whole cut into fewer pieces has bigger pieces.`,
    explain: `Each has ${n} parts, but ${pl(Math.min(p, q))} are bigger than ${pl(Math.max(p, q))}. So ${ans} is greater.`,
    ...fixedChoices([frac(n, p), frac(n, q)], ans),
  };
};

const g3Fractions = {
  id: 'g3-qpv-fractions', grade: 3, strand: 'number', bigIdea: 'qpv', species: 'fractling',
  name: 'Fractions',
  parentDesc: 'Names fractions (halves to tenths) of wholes and sets, numerator and denominator, compares fractions with the same denominator and unit fractions, 1 whole = 2/2 = 4/4, estimates shaded amounts.',
  classic: false,
  gen: tiered([
    [1, 3, frName, 2], [1, 4, frPickPicture, 1.5], [3, 4, frVocab], [3, 5, frCompareSame, 1.5], [4, 5, frCompareUnit, 1.5],
    [5, 6, frOrderUnit], [4, 6, frWhole], [4, 6, frEstimate], [4, 6, frWord, 1.5], [6, 7, frTwoStep, 2], [7, 7, frPreviewEquiv, 0.5, PREVIEW], [7, 7, frCompareSame, 0.8], [7, 7, frOrderUnit, 0.8],
  ]),
};

// ---------------------------------------------------------------------------
// SD3 Count and sequence within 1000
// ---------------------------------------------------------------------------
function countStart(rng, step, t, len) {
  // Starting point rules: 3s/4s/25s/5s from multiples; 10s/100s any start at tier 4+.
  const hi = Math.max(step, 1000 - step * (len + 1));
  if ((step === 10 || step === 100) && t >= 4) return randInt(rng, 1, hi);
  if (step === 10 || step === 100) return randInt(rng, 0, Math.floor(hi / step)) * step;
  const cap = t <= 3 && step <= 4 ? 100 : hi;
  return randInt(rng, 0, Math.floor(cap / step)) * step;
}
const STEPS = { 1: [10, 100], 2: [5, 10, 25, 100], 3: [3, 4, 10, 25], 4: [3, 4, 25, 100, 10], 5: [3, 4, 5, 10, 25, 100] };

const cntSkip = (rng, t) => {
  const step = pick(rng, STEPS[Math.min(t, 5)]);
  const back = t >= 2 && chance(rng, t >= 4 ? 0.5 : 0.3);
  const len = 5;
  let start = countStart(rng, step, t, len);
  let seq = Array.from({ length: len }, (_, i) => start + i * step);
  if (back) seq = seq.reverse();
  const hole = t <= 2 ? len - 1 : randInt(rng, t >= 4 ? 1 : 2, len - 1);
  const ans = seq[hole];
  const shown = seq.map((x, i) => (i === hole ? '?' : x));
  const dirWord = back ? 'back ' : '';
  const nl = t <= 2 && seq[0] !== seq[len - 1] ? {
    type: 'numberline', min: Math.min(...seq), max: Math.max(...seq), ticks: step,
    labels: seq.filter((x) => x !== ans), blankAt: ans,
    jumps: seq.slice(0, -1).map((x, i) => ({ from: x, to: seq[i + 1], label: `${back ? '−' : '+'}${step}` })).filter((j, i) => i < hole),
  } : { type: 'pattern', items: shown.map((x) => (x === '?' ? '?' : fmtNum(x))) };
  const q = {
    prompt: `Count ${dirWord}by ${step}s. What number is missing?`,
    visual: nl,
    hint: `What number fills the gap? Counting ${back ? 'back ' : ''}by ${step}s means every jump ${back ? 'takes away' : 'adds'} ${step}. The number just before the gap is ${fmtNum(seq[hole - 1])}: ${back ? 'count back' : 'count on'} ${step} from there.`,
    explain: `${fmtNum(seq[hole - 1] ?? seq[hole + 1])} ${hole > 0 ? (back ? '−' : '+') : (back ? '+' : '−')} ${step} = ${fmtNum(ans)}. The count is ${seq.map(fmtNum).join(', ')}.`,
  };
  if (t >= 3 && chance(rng, 0.4)) return { ...q, kind: 'num', answer: num(ans) };
  const prev = seq[hole - 1] ?? seq[hole + 1];
  const dir = hole > 0 ? (back ? -1 : 1) : (back ? 1 : -1);
  const wrong = [prev + dir * (step === 100 ? 10 : step === 10 ? 1 : 10), prev - dir * step, ans + dir * step, ans + 1, ans - 1, ans + dir * 10];
  return { ...q, ...mcN(rng, ans, wrong.filter((x) => x !== ans)) };
};

const cntHundredChart = (rng, t) => {
  const step = pick(rng, t === 1 ? [2, 5, 10] : [3, 4, 5, 10]);
  const n = randInt(rng, 4, Math.floor(90 / step));
  const hl = Array.from({ length: n }, (_, i) => (i + 1) * step);
  const ans = (n + 1) * step;
  return {
    prompt: `Count by ${step}s on the hundred chart. What number comes next?`,
    visual: { type: 'hundredchart', highlight: hl, blank: [ans] },
    hint: `What number is next when you count by ${step}s? The last shaded number is ${hl[hl.length - 1]}. Count ${step} more squares from it on the chart.`,
    explain: `${hl[hl.length - 1]} + ${step} = ${ans}.`,
    ...mcN(rng, ans, [ans + 1, ans - 1, ans + step, ans + 10, ans - step].filter((x) => x <= 100)),
  };
};

const cntWhichSaid = (rng, t) => {
  const step = pick(rng, [3, 4, 5, 25, 10]);
  const not = t >= 5 && chance(rng, 0.4);
  const hi = step <= 5 ? 120 : 1000;
  const mult = () => randInt(rng, 2, Math.floor(hi / step)) * step;
  const nonMult = () => {
    let x;
    do {
      x = step === 25 ? randInt(rng, 2, 99) * 5 : step === 10 ? randInt(rng, 11, 99) * 10 + 5 : step === 4 ? randInt(rng, 5, 59) * 2 : randInt(rng, 10, hi);
    } while (x % step === 0);
    return x;
  };
  const who = nm(rng);
  const good = not ? nonMult() : mult();
  const bad = [];
  let guard = 0;
  while (bad.length < 3 && guard++ < 50) { const x = not ? mult() : nonMult(); if (!bad.includes(x) && x !== good) bad.push(x); }
  const start = step === 10 ? 'at 0' : `at ${step}`;
  return {
    prompt: not ? `${who} counts by ${step}s starting ${start}. Which number will ${who} NOT say?` : `${who} counts by ${step}s starting ${start}. Which number will ${who} say?`,
    hint: step === 25 ? 'Counting by 25s goes twenty-five, fifty, seventy-five, one hundred, and then those same endings repeat. Check the last two digits of each choice: do they match one of those endings?' : step === 10 ? 'Counting by 10s from 0, every number ends in 0. Check the ones digit of each choice.' : step === 5 ? 'Counting by 5s, every number ends in 0 or 5. Check the ones digit of each choice.' : `Which choice is in the ${step} times table? For each choice, try to make it with jumps of ${step}: skip count, or share it into groups of ${step} and see if anything is left over.`,
    explain: not ? `${fmtNum(good)} is not a multiple of ${step}, so ${who} will not say it. The others can be reached by jumps of ${step}.` : `${fmtNum(good)} = ${good / step} jumps of ${step}, so ${who} will say it.`,
    ...mcP(rng, good, bad, [], fmtNum),
  };
};

const cntOrder = (rng, t) => {
  const size = t <= 2 ? 500 : 999;
  const base = randInt(rng, 1, Math.floor(size / 100) - 1) * 100;
  const d = sample(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
  let nums = t <= 3 ? sample(rng, Array.from({ length: 80 }, (_, i) => randInt(rng, 100, size)), 3)
    : [base + d[0] * 10 + d[1], base + d[1] * 10 + d[0], base + 100 + d[2], base + d[2] * 10 + d[0]].slice(0, t >= 5 ? 4 : 3);
  nums = [...new Set(nums)];
  if (nums.length < 3) nums = [base + 11, base + 101, base + 110];
  const asc = chance(rng, 0.5);
  const sorted = nums.slice().sort((a, b) => (asc ? a - b : b - a));
  const fmt = (arr) => arr.map(fmtNum).join(', ');
  return {
    prompt: `Which list is in order from ${asc ? 'least to greatest' : 'greatest to least'}?`,
    hint: `Which list goes from ${asc ? 'smallest to biggest' : 'biggest to smallest'}? Compare hundreds first, then tens, then ones. Check each list: does every number get ${asc ? 'bigger' : 'smaller'} than the one before it?`,
    explain: `From ${asc ? 'least to greatest' : 'greatest to least'}: ${fmt(sorted)}.`,
    ...mcP(rng, sorted, [sorted.slice().reverse(), [sorted[1], sorted[0], ...sorted.slice(2)], [sorted[0], ...sorted.slice(2), sorted[1]], shuffle(rng, nums)], [], fmt),
  };
};

const cntFractions = (rng, t) => {
  const d = pick(rng, t <= 4 ? [2, 3, 4] : [3, 4, 5, 6, 8]);
  const maxW = t >= 7 ? 3 : 2;
  const k = randInt(rng, t <= 4 ? d - 1 : d + 1, maxW * d - 1);
  const nl = { type: 'numberline', min: 0, max: maxW, ticks: clean(1 / d), labels: Array.from({ length: maxW + 1 }, (_, i) => i) };
  if (chance(rng, 0.5)) {
    return {
      prompt: 'What fraction is the arrow pointing to?',
      visual: { ...nl, arrow: clean(k / d) },
      hint: `What fraction is at the arrow? Each whole on this line is cut into ${d} equal jumps, so each jump is ${fracWords(1, d)}. Count the jumps from 0 to the arrow: that count is the top number, and ${d} is the bottom number.`,
      explain: `The arrow is ${u(k, 'jump')} of ${frac(1, d)} from 0, so it points to ${frac(k, d)}${k > d ? ` (${Math.floor(k / d)} whole${k >= 2 * d ? 's' : ''} and ${k % d} more)` : ''}.`,
      ...mcP(rng, frac(k, d), [frac(k + 1, d), frac(k - 1, d), frac(k, d + 1), frac(k % d || 1, d), frac(d, k)].filter((x) => x !== frac(k, d)), [], String),
    };
  }
  return countFracSeq(rng, t, d, randInt(rng, Math.max(d + 1, 4), maxW * d), nl);
};
function countFracSeq(rng, t, d, k, nl) {
  const seq = [k - 3, k - 2, k - 1, k];
  return {
    prompt: `Count by ${pl(d)}: ${seq.slice(0, -1).map((x) => frac(x, d)).join(', ')}, □. What comes next?`,
    speak: `Count by ${pl(d)}: ${seq.slice(0, -1).map((x) => fracWords(x, d)).join(', ')}. What comes next?`,
    visual: t <= 5 ? { ...nl, blankAt: clean(k / d) } : undefined,
    hint: `Counting by ${pl(d)} adds ${fracWords(1, d)} each time: the top number goes up by 1 and the bottom number stays ${d}. What comes right after ${frac(k - 1, d)}?`,
    explain: `${frac(k - 1, d)} + ${frac(1, d)} = ${frac(k, d)}.${k >= d && k % d === 0 ? ` That is ${k / d} whole${k / d > 1 ? 's' : ''}.` : ''}`,
    ...mcP(rng, frac(k, d), [frac(k, d + 1), frac(k + 1, d), frac(1, d + 1), frac(k - 1, d + 1)].filter((x) => x !== frac(k, d)), [], String),
  };
}

const cntTwoStep = (rng, t) => {
  const step = pick(rng, t >= 7 ? [25, 50, 10, 100, 4, 3] : [10, 25, 100, 5]);
  const times = randInt(rng, t >= 7 ? 5 : 3, t >= 7 ? 9 : 6);
  const back = chance(rng, 0.5);
  const lo = back ? step * times + step : 0;
  const hi = back ? 999 : 999 - step * times;
  const start = step === 10 || step === 100 ? randInt(rng, lo, hi) : Math.floor(randInt(rng, lo, hi) / step) * step;
  const end = back ? start - step * times : start + step * times;
  return {
    kind: 'num',
    prompt: `Start at ${fmtNum(start)}. Count ${back ? 'back' : 'on'} by ${step}s, ${times} times. Where do you land?`,
    hint: `Where do you land? Start at ${fmtNum(start)} and make ${times} jumps of ${step}${back ? ' going back' : ''}. Say each number out loud and count your jumps on your fingers.`,
    explain: `${[...Array(times + 1)].map((_, i) => fmtNum(back ? start - i * step : start + i * step)).join(', ')}. You land on ${fmtNum(end)}.`,
    answer: num(end),
  };
};

// Big challenge inside Grade 3's range: counting up to 1000, or back down from 1000.
const cntPast1000 = (rng, t) => {
  const step = pick(rng, [10, 25, 100, 5, 50, 4]);
  const back = chance(rng, 0.4);
  const len = randInt(rng, 3, 4);
  const seq = Array.from({ length: len + 1 }, (_, i) => 1000 - (back ? i : len - i) * step); // 1000 is a multiple of every step here
  const ans = seq[len], prev = seq[len - 1];
  const q = {
    prompt: `Big challenge! Count ${back ? 'back ' : ''}by ${step}s: ${seq.slice(0, len).map(fmtNum).join(', ')}, □`,
    visual: { type: 'pattern', items: [...seq.slice(0, len).map(fmtNum), '?'] },
    hint: back ? `What comes after ${fmtNum(prev)} when you count back by ${step}s? Take ${step} away. Watch the hundreds digit when you cross a hundred.` : `What comes after ${fmtNum(prev)} when you count by ${step}s? Add ${step}. When the hundreds are full, you reach one thousand.`,
    explain: `${fmtNum(prev)} ${back ? '−' : '+'} ${step} = ${fmtNum(ans)}.`,
  };
  if (chance(rng, 0.5)) return { ...q, kind: 'num', answer: num(ans) };
  return { ...q, ...mcN(rng, ans, back ? [prev - 10 * step, ans - step, ans + 1, prev - 1, 900] : [prev + 1, 1100, 100, prev + 10, 1010]) };
};

const g3Count = {
  id: 'g3-qpv-count', grade: 3, strand: 'number', bigIdea: 'qpv', species: 'counter',
  name: 'Skip Counting to 1000',
  parentDesc: 'Skip counts forward and backward by 10s, 100s, 3s, 4s, 5s and 25s within 1000, orders numbers, and counts unit fractions past 1 on a number line.',
  classic: false,
  gen: tiered([
    [1, 5, cntSkip, 3], [1, 3, cntHundredChart, 1.5], [3, 6, cntWhichSaid, 1.5], [2, 5, cntOrder], [4, 7, cntFractions, 1.5],
    [6, 7, cntTwoStep, 2], [7, 7, cntPast1000, 0.6], [6, 7, cntOrder, 1],
  ]),
};

// ---------------------------------------------------------------------------
// SD4 Addition and subtraction within 1000
// ---------------------------------------------------------------------------
function addPair(rng, t) {
  // returns [a, b] for addition at a tier
  let a, b, g = 0;
  do {
    if (t === 1) { a = randInt(rng, 11, 68); b = randInt(rng, 11, 30); }
    else if (t === 2) { a = randInt(rng, 15, 79); b = randInt(rng, 12, 59); }
    else if (t === 3 || t === 4) { a = randInt(rng, 105, 880); b = randInt(rng, 12, 99); }   // 3-digit + 2-digit: no regrouping, then regrouping
    else { a = randInt(rng, 120, 780); b = randInt(rng, 105, 999 - a); }
    g++;
  } while (g < 40 && ((t === 1 && (hasCarry(a, b) || a + b > 99)) || (t === 3 && hasCarry(a, b)) || ((t === 2 || t === 4) && !hasCarry(a, b)) || a + b > 999 || b < 10));
  return [a, b];
}

const asAdd = (rng, t) => {
  const [a, b] = addPair(rng, t);
  const s = a + b;
  const vis = t === 1 ? { type: 'barmodel', whole: '?', parts: [a, b] }
    : t === 2 ? { type: 'numberline', min: a, max: s, labels: [a], jumps: [{ from: a, to: a + Math.floor(b / 10) * 10, label: `+${Math.floor(b / 10) * 10}` }, { from: a + Math.floor(b / 10) * 10, to: s, label: `+${b % 10}` }].filter((j) => j.from !== j.to) } : undefined;
  const q = {
    prompt: `What is ${fmtNum(a)} + ${fmtNum(b)}?`,
    visual: vis,
    hint: t <= 2 ? `What is ${a} + ${b}? Add the tens first: ${Math.floor(a / 10) * 10} + ${Math.floor(b / 10) * 10}. Then add the ones, ${a % 10} + ${b % 10}, and put the two parts together.` : `What is ${fmtNum(a)} + ${fmtNum(b)}? Add the ones, then the tens, then the hundreds. If a place adds up to 10 or more, regroup 10 of them as 1 in the next place.`,
    explain: `${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(s)}.${hasCarry(a, b) ? ' Remember to regroup when a place adds up to 10 or more.' : ''}`,
  };
  if (chance(rng, t <= 2 ? 0.4 : 0.55)) return { ...q, kind: 'num', answer: num(s) };
  return { ...q, ...mcN(rng, s, [addNoCarry(a, b), s + 10, s - 10, s + 100, Math.abs(a - b), s + 1]) };
};

const asSub = (rng, t) => {
  let a, b, g = 0;
  do {
    if (t === 1) { a = randInt(rng, 25, 99); b = randInt(rng, 11, a - 10); }
    else if (t === 2) { a = randInt(rng, 30, 99); b = randInt(rng, 12, a - 5); }
    else if (t === 3 || t === 4) { a = randInt(rng, 150, 999); b = randInt(rng, 15, 99); }   // 3-digit − 2-digit: no regrouping, then regrouping
    else if (t === 5) { a = randInt(rng, 300, 999); b = randInt(rng, 105, a - 20); }
    else { a = randInt(rng, 2, 9) * 100 + (chance(rng, 0.6) ? 0 : randInt(rng, 1, 9)); b = randInt(rng, 101, a - 11); }
    g++;
  } while (g < 40 && (((t === 1 || t === 3) && hasBorrow(a, b)) || ((t === 2 || t >= 4) && !hasBorrow(a, b))));
  const d = a - b;
  const vis = t === 1 ? { type: 'barmodel', whole: a, parts: [b, '?'] }
    : t === 2 ? { type: 'base10', hundreds: 0, tens: Math.floor(a / 10), ones: a % 10 } : undefined;
  const q = {
    prompt: `What is ${fmtNum(a)} − ${fmtNum(b)}?`,
    visual: vis,
    hint: hasBorrow(a, b) ? `What is ${fmtNum(a)} − ${fmtNum(b)}? Start with the ones: are there enough ones on top to take away the ones below? If not, trade one ten for ten ones first (do the same with the tens if needed). Or count up from ${fmtNum(b)} to ${fmtNum(a)}.` : `What is ${fmtNum(a)} − ${fmtNum(b)}? Take away the ones, then the tens${a >= 100 ? ', then the hundreds' : ''}.`,
    explain: `${fmtNum(a)} − ${fmtNum(b)} = ${fmtNum(d)}. Check: ${fmtNum(d)} + ${fmtNum(b)} = ${fmtNum(a)}.`,
  };
  if (chance(rng, t <= 2 ? 0.4 : 0.55)) return { ...q, kind: 'num', answer: num(d) };
  return { ...q, ...mcN(rng, d, [subSmallFromBig(a, b), d + 10, d - 10, d + 100, a + b > 999 ? d + 2 : a + b]) };
};

const asStrategy = (rng, t) => {
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const up = pick(rng, [1, 2]);
    const a = randInt(rng, 2, 9) * 10 - up + (t >= 4 ? randInt(rng, 1, 5) * 100 : 0);
    const b = randInt(rng, 12, 68);
    const A = a + up;
    const good = `${fmtNum(A)} + ${b}, then take away ${up}`;
    return {
      prompt: `Which is a good way to find ${fmtNum(a)} + ${b}?`,
      hint: `Which way gives the same answer as ${fmtNum(a)} + ${b}? Using ${fmtNum(A)} instead of ${fmtNum(a)} adds ${up} extra. Test each choice: after the friendly sum, should you add ${up} more, take ${up} away, or change the ${b}?`,
      explain: `${fmtNum(a)} + ${up} = ${fmtNum(A)} is a friendly number. ${fmtNum(A)} + ${b} = ${fmtNum(A + b)}. You added ${up} too many, so take it away: ${fmtNum(A + b - up)}.`,
      ...mcP(rng, good, [`${fmtNum(A)} + ${b}, then add ${up}`, `${fmtNum(A)} + ${b}, then take away ${b}`, `${fmtNum(A)} + ${b + up}`], [], String),
    };
  }
  if (k === 1) {
    const up = pick(rng, [1, 2]);
    const b = randInt(rng, 2, 9) * 10 - up;
    const a = randInt(rng, b + 12, 99) + (t >= 4 ? randInt(rng, 1, 8) * 100 : 0);
    const B = b + up;
    const good = `${fmtNum(a)} − ${B}, then add ${up}`;
    return {
      prompt: `Which is a good way to find ${fmtNum(a)} − ${b}?`,
      hint: `Which way gives the same answer as ${fmtNum(a)} − ${b}? Taking away ${B} instead of ${b} takes away ${up} too many. Test each choice: after taking away ${B}, should you give ${up} back or take more away?`,
      explain: `${fmtNum(a)} − ${B} = ${fmtNum(a - B)}. You took away ${up} too many, so add ${up} back: ${fmtNum(a - b)}.`,
      ...mcP(rng, good, [`${fmtNum(a)} − ${B}, then take away ${up}`, `${fmtNum(a)} − ${B}`, `${fmtNum(a)} + ${B}, then add ${up}`], [], String),
    };
  }
  const b = randInt(rng, 2, 9) * 100 - randInt(rng, 1, 4);
  const a = Math.ceil(b / 100) * 100 + randInt(rng, 1, 30);
  const good = `Count up from ${fmtNum(b)} to ${fmtNum(a)}`;
  return {
    prompt: `The numbers in ${fmtNum(a)} − ${fmtNum(b)} are very close. Which is the easiest strategy?`,
    visual: { type: 'numberline', min: b, max: a, labels: 'ends', jumps: [{ from: b, to: Math.ceil(b / 100) * 100 }, { from: Math.ceil(b / 100) * 100, to: a }] },
    hint: `${fmtNum(a)} and ${fmtNum(b)} are only a little apart, so you want the distance between them. Counting back by 1s hundreds of times, or adding them, would not help. Which choice finds the gap in just a couple of small jumps?`,
    explain: `Count up: ${fmtNum(b)} to ${fmtNum(Math.ceil(b / 100) * 100)} is ${Math.ceil(b / 100) * 100 - b}, then to ${fmtNum(a)} is ${a - Math.ceil(b / 100) * 100} more. So ${fmtNum(a)} − ${fmtNum(b)} = ${a - b}.`,
    ...mcP(rng, good, [`Count back by 1s from ${fmtNum(a)}, ${fmtNum(b)} times`, `Add ${fmtNum(a)} + ${fmtNum(b)}`, 'Count back by 100s from ' + fmtNum(a)], [], String),
  };
};

const round100 = (x) => Math.round(x / 100) * 100;
const round10 = (x) => Math.round(x / 10) * 10;
const R0 = (x, two) => (two ? round10(x) : round100(x));
const asEstimate = (rng, t) => {
  let a, b;
  const sub = chance(rng, 0.4);
  const two = t === 4 && chance(rng, 0.4);
  const ok = (x) => (two ? x % 10 !== 5 : Math.abs((x % 100) - 50) >= 12);
  do {
    if (two) { a = randInt(rng, 21, 89); b = randInt(rng, 11, 79); }
    else { a = randInt(rng, 150, 850); b = randInt(rng, 110, 650); }
    if (sub && b > a) [a, b] = [b, a];
  } while (!ok(a) || !ok(b) || (!sub && a + b > 999) || a === b || (sub && R0(a, two) === R0(b, two)));
  const R = two ? round10 : round100;
  const est = sub ? R(a) - R(b) : R(a) + R(b);
  const unit = two ? 10 : 100;
  const q = {
    prompt: `About how much is ${fmtNum(a)} ${sub ? '−' : '+'} ${fmtNum(b)}?`,
    hint: `About how much is it? Round each number to the nearest ${unit === 100 ? 'hundred' : 'ten'}: which ${unit === 100 ? 'hundred' : 'ten'} is ${fmtNum(a)} closest to? And ${fmtNum(b)}? Then ${sub ? 'subtract' : 'add'} the rounded numbers.`,
    explain: `${fmtNum(a)} is about ${fmtNum(R(a))} and ${fmtNum(b)} is about ${fmtNum(R(b))}. ${fmtNum(R(a))} ${sub ? '−' : '+'} ${fmtNum(R(b))} = ${fmtNum(est)}. (Exact answer: ${fmtNum(sub ? a - b : a + b)}.)`,
  };
  if (t >= 5 && chance(rng, 0.5)) {
    const [p] = nm2(rng);
    const exact = sub ? a - b : a + b;
    let wrongAns = sub ? subSmallFromBig(a, b) : addNoCarry(a, b);
    if (Math.abs(wrongAns - exact) < 200) wrongAns = exact + 300 > 999 || (exact >= 350 && chance(rng, 0.5)) ? exact - 300 : exact + 300;
    const claimed = chance(rng, 0.5) ? exact : wrongAns;
    const reasonable = Math.abs(claimed - est) < unit;
    return {
      prompt: `${p} says ${fmtNum(a)} ${sub ? '−' : '+'} ${fmtNum(b)} = ${fmtNum(claimed)}. Use an estimate. Is that reasonable?`,
      hint: `Is ${p}'s answer believable? Round ${fmtNum(a)} and ${fmtNum(b)} to the nearest ${unit === 100 ? 'hundred' : 'ten'}, then ${sub ? 'subtract' : 'add'} them. "Yes" means ${p}'s answer is close to your estimate; "No" means it is far away.`,
      explain: `Estimate: ${fmtNum(R(a))} ${sub ? '−' : '+'} ${fmtNum(R(b))} = ${fmtNum(est)}. ${fmtNum(claimed)} is ${reasonable ? 'close to' : 'far from'} ${fmtNum(est)}, so it is ${reasonable ? '' : 'not '}reasonable. (Exact answer: ${fmtNum(exact)}.)`,
      ...mcP(rng, reasonable ? `Yes, it is close to ${fmtNum(est)}` : `No, it should be about ${fmtNum(est)}`,
        [reasonable ? `No, it should be about ${fmtNum(est + unit)}` : `Yes, it is close to ${fmtNum(est)}`, reasonable ? `No, it should be about ${fmtNum(Math.max(unit, est - unit))}` : `No, it should be about ${fmtNum(est + 2 * unit)}`], [], String),
    };
  }
  return { ...q, ...mcP(rng, est, [est + unit, est - unit, est + 2 * unit, est - 2 * unit].filter((x) => x >= 0), [], fmtNum) };
};

const WORD_ADD = [
  (p, a, b) => [`The library has ${a} books. It gets ${b} new books. How many books does it have now?`, 'books'],
  (p, a, b) => [`${p} collected ${a} gems on Monday and ${b} gems on Tuesday. How many gems in all?`, 'gems'],
  (p, a, b) => [`An owl flew ${a} m to a tree, then ${b} m to the barn. How far did it fly?`, 'm'],
  (p, a, b) => [`A school has ${a} students in the morning class and ${b} in the afternoon class. How many students in all?`, 'students'],
  (p, a, b) => [`${p}'s wizard team scored ${a} points, then ${b} more points. What is the total score?`, 'points'],
  (p, a, b) => [`A farmer picked ${a} apples. Then she picked ${b} more. How many apples did she pick?`, 'apples'],
];
const WORD_SUB = [
  (p, a, b) => [`A dragon had ${a} gold coins. It gave away ${b}. How many are left?`, 'coins'],
  (p, a, b) => [`${p} has ${a} stickers. Their friend has ${b}. How many more stickers does ${p} have?`, 'stickers'],
  (p, a, b) => [`A book has ${a} pages. ${p} has read ${b} pages. How many pages are left to read?`, 'pages'],
  (p, a, b) => [`There were ${a} people at the fair. ${b} went home. How many are still there?`, 'people'],
  (p, a, b) => [`A potion shop made ${a} potions and sold ${b}. How many potions are left?`, 'potions'],
  (p, a, b) => [`A tower is ${a} cm tall. A shed is ${b} cm tall. How much taller is the tower?`, 'cm'],
];
const asWord = (rng, t) => {
  const p = nm(rng);
  const sub = chance(rng, 0.5);
  let a, b;
  if (t <= 2) { // 2-digit story problems (sums within 100), like the early add/sub tiers
    if (sub) { a = randInt(rng, 40, 99); b = randInt(rng, 12, a - 10); } else { a = randInt(rng, 21, 69); b = randInt(rng, 12, 99 - a); }
  } else if (t === 3) { // 3-digit and 2-digit
    if (sub) { a = randInt(rng, 150, 999); b = randInt(rng, 15, 99); } else { a = randInt(rng, 120, 880); b = randInt(rng, 15, Math.min(99, 999 - a)); }
  } else if (sub) { a = randInt(rng, t >= 5 ? 400 : 200, 999); b = randInt(rng, 60, a - 30); }
  else { a = randInt(rng, 120, 700); b = randInt(rng, 45, Math.min(450, 999 - a)); }
  const [prompt, unit] = pick(rng, sub ? WORD_SUB : WORD_ADD)(p, fmtNum(a), fmtNum(b));
  const ans = sub ? a - b : a + b;
  const q = {
    prompt,
    visual: t <= 4 ? (sub ? { type: 'barmodel', whole: a, parts: [b, '?'] } : { type: 'barmodel', whole: '?', parts: [a, b] }) : undefined,
    hint: sub ? `What is the question asking? You start with ${fmtNum(a)} and ${fmtNum(b)} is taken away (or compared). Subtract ${fmtNum(b)} from ${fmtNum(a)} to find what is left or how many more.` : `What is the question asking? Two amounts, ${fmtNum(a)} and ${fmtNum(b)}, are put together. Add them to find the total.`,
    explain: `${fmtNum(a)} ${sub ? '−' : '+'} ${fmtNum(b)} = ${fmtNum(ans)} ${unit}.`,
  };
  if (chance(rng, 0.5)) return { ...q, kind: 'num', answer: num(ans) };
  return { ...q, ...mcN(rng, ans, [sub ? a + b : Math.abs(a - b), sub ? subSmallFromBig(a, b) : addNoCarry(a, b), ans + 10, ans - 100].filter((x) => x <= 1999)) };
};

const asThree = (rng, t) => {
  let a, b, c;
  do {
    const pair = randInt(rng, 1, 7) * 100;
    a = randInt(rng, 1, pair / 5 | 0) * 5 + (t >= 6 ? randInt(rng, 0, 4) : 0);
    b = pair - a; // a + b is a friendly hundred
    c = randInt(rng, 25, 999 - pair);
  } while (a <= 0 || b <= 0 || a + b + c > 999);
  const order = shuffle(rng, [a, c, b]);
  const s = a + b + c;
  const ctx = chance(rng, 0.4) ? pick(rng, THINGS) : null;
  const who = nm(rng);
  const prompt = ctx ? `${who} has three ${CONTAINERS[randInt(rng, 0, 7)][1]} of ${ctx[1]} with ${order.map(fmtNum).join(', ')} ${ctx[1]}. How many ${ctx[1]} in all?`
    : `What is ${order.map(fmtNum).join(' + ')}?`;
  const q = {
    prompt,
    hint: `What are the three numbers altogether? Look for two that make a friendly hundred: ${fmtNum(a)} + ${fmtNum(b)}. Add those first, then add ${fmtNum(c)}.`,
    explain: `${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(a + b)}. Then ${fmtNum(a + b)} + ${fmtNum(c)} = ${fmtNum(s)}.`,
  };
  if (chance(rng, 0.7)) return { ...q, kind: 'num', answer: num(s) };
  return { ...q, ...mcN(rng, s, [s + 100, s - 100, s + 10, addNoCarry(addNoCarry(a, b), c)]) };
};

const asTwoStep = (rng, t) => {
  const [p, q1, q2] = sample(rng, NAMES, 3);
  const thing = pick(rng, THINGS);
  const k = randInt(rng, 0, t >= 7 ? 3 : 2);
  let prompt, ans, explain, hint;
  if (k === 0) {
    const a = randInt(rng, 5, 9) * 100 + (t >= 7 ? randInt(rng, 1, 99) : 0), b = randInt(rng, 50, 250), c = randInt(rng, 50, 250);
    ans = a - b - c;
    prompt = `${p} had ${fmtNum(a)} ${thing[1]}. ${p} gave ${fmtNum(b)} to ${q1} and ${fmtNum(c)} to ${q2}. How many ${thing[1]} are left?`;
    hint = `How many does ${p} have after giving some to two friends? First add up what ${p} gave away: ${fmtNum(b)} + ${fmtNum(c)}. Then take that total away from ${fmtNum(a)}.`;
    explain = `${fmtNum(a)} − ${fmtNum(b)} = ${fmtNum(a - b)}, then ${fmtNum(a - b)} − ${fmtNum(c)} = ${fmtNum(ans)}. (Or: ${fmtNum(b)} + ${fmtNum(c)} = ${fmtNum(b + c)} given away, and ${fmtNum(a)} − ${fmtNum(b + c)} = ${fmtNum(ans)}.)`;
  } else if (k === 1) {
    const a = randInt(rng, 150, 450), b = randInt(rng, 100, 350), c = randInt(rng, 50, a + b - 20);
    ans = a + b - c;
    prompt = `A shop had ${fmtNum(a)} ${thing[1]} and got ${fmtNum(b)} more. Then it sold ${fmtNum(c)}. How many ${thing[1]} does it have now?`;
    hint = `The shop's ${thing[1]} went up, then down. First find how many it had after getting more: ${fmtNum(a)} + ${fmtNum(b)}. Then take away the ${fmtNum(c)} it sold.`;
    explain = `${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(a + b)}. Then ${fmtNum(a + b)} − ${fmtNum(c)} = ${fmtNum(ans)}.`;
  } else if (k === 2) {
    const a = randInt(rng, 200, 450), diff = randInt(rng, 25, Math.min(150, 999 - 2 * a)); // total stays within 1000
    ans = a + a + diff;
    prompt = `${q1} has ${fmtNum(a)} ${thing[1]}. ${q2} has ${diff} more than ${q1}. How many ${thing[1]} do they have together?`;
    hint = `The question wants both amounts added together, but you only know ${q1}'s. First find ${q2}'s amount: ${fmtNum(a)} + ${diff}. Then add ${q1}'s and ${q2}'s amounts.`;
    explain = `${q2} has ${fmtNum(a)} + ${diff} = ${fmtNum(a + diff)}. Together: ${fmtNum(a)} + ${fmtNum(a + diff)} = ${fmtNum(ans)}.`;
  } else {
    const goal = randInt(rng, 7, 9) * 100 + pick(rng, [0, 50]), a = randInt(rng, 120, 260), b = randInt(rng, 110, 240), c = randInt(rng, 60, goal - a - b - 20);
    ans = goal - a - b - c;
    prompt = `The school fair needs ${fmtNum(goal)} tickets sold. Class A sold ${a}, Class B sold ${b} and Class C sold ${c}. How many more tickets must be sold?`;
    hint = `How far is the fair from ${fmtNum(goal)} tickets? First add what the three classes sold: ${a} + ${b} + ${c}. Then find how many more it takes to get from that total up to ${fmtNum(goal)}.`;
    explain = `${a} + ${b} + ${c} = ${a + b + c}. ${fmtNum(goal)} − ${a + b + c} = ${fmtNum(ans)}.`;
  }
  return { kind: 'num', prompt, answer: num(ans), hint, explain };
};

const g3AddSub = {
  id: 'g3-ops-addsub', grade: 3, strand: 'number', bigIdea: 'ops', species: 'addsub',
  name: 'Add & Subtract to 1000',
  parentDesc: 'Adds and subtracts within 1000 using efficient strategies, estimates sums and differences, solves story problems, and adds three numbers.',
  classic: false,
  gen: tiered([
    [1, 5, asAdd, 2], [1, 5, asSub, 2], [2, 3, asWord, 1], [3, 5, asStrategy], [4, 6, asEstimate, 1.5], [4, 7, asWord, 2], [5, 7, asThree], [6, 7, asTwoStep, 2],
  ]),
};

// ---------------------------------------------------------------------------
// SD5 Multiplication and division concepts (foundational facts 1, 2, 5, 10)
// ---------------------------------------------------------------------------
const FOUND = [1, 2, 5, 10];
const ICONS = ['🍎', '⭐', '🐞', '🧁', '🌼', '🐟', '🍪', '💎', '🥚', '🍓', '🐚', '🎈'];

const mdGroupsVisual = (rng, t) => {
  const each = pick(rng, t === 1 ? [2, 5, 10, 1] : FOUND);
  const g = randInt(rng, 2, t === 1 ? 5 : 6);
  const icon = pick(rng, ICONS);
  const arr = chance(rng, 0.5);
  const vis = arr ? { type: 'array', rows: g, cols: each, icon } : { type: 'groups', groups: g, each, icon };
  const total = g * each;
  const words = arr ? `${g} rows of ${each}` : `${g} groups of ${each}`;
  if (chance(rng, 0.5)) {
    return {
      prompt: pick(rng, ['How many are there in all?', 'How many in all? Use multiplication.']),
      visual: vis,
      hint: each === 1 ? `How many are there altogether? Each ${arr ? 'row' : 'group'} has just one, so count the ${arr ? 'rows' : 'groups'}.` : `How many are there altogether? There are ${words}. Skip count by ${each}s, one count for each ${arr ? 'row' : 'group'}.`,
      explain: `${words} = ${g} × ${each} = ${total}.`,
      ...mcN(rng, total, [g + each, total + each, total - each, g * (each + 1)]),
    };
  }
  const good = `${g} × ${each}`;
  return {
    prompt: 'Which multiplication matches the picture?',
    visual: vis,
    hint: `A × sentence means equal groups: the first number is how many ${arr ? 'rows' : 'groups'}, the second is how many in each. A + sentence just joins two numbers. Count the ${arr ? 'rows' : 'groups'}, then count how many are in one, and find the sentence that says that.`,
    explain: `There are ${words}, so the picture shows ${g} × ${each} = ${total}.`,
    ...mcP(rng, good, [`${g} + ${each}`, `${g} × ${g + 1}`, `${g + 1} × ${each}`, `${g} × ${each + 1}`, `${g - 1} × ${each}`].filter((x) => !x.startsWith('1 ×') && !x.startsWith('0 ×')), [], String),
  };
};

const mdPickPicture = (rng, t) => {
  let g = randInt(rng, 2, 5), each = pick(rng, [2, 5, 10, 3, 4]);
  if (g === each) g = g === 5 ? 4 : g + 1;
  const icon = pick(rng, ICONS);
  const G = (a, b) => ({ type: 'groups', groups: a, each: b, icon });
  return {
    prompt: `Which picture shows ${g} groups of ${each}?`,
    hint: `"${g} groups of ${each}" means ${g} circles with ${each} inside each circle. For each picture, count the circles first, then count what is inside one circle.`,
    explain: `${g} groups of ${each} means ${g} circles, each with ${each} inside: ${g} × ${each} = ${g * each}.`,
    ...mcV(rng, G(g, each), [G(each, g), G(g, each + 1), G(g + 1, each), G(g, g)].filter((v) => v.each <= 10 && v.groups <= 10)),
  };
};

const mdShare = (rng, t) => {
  const d = pick(rng, [2, 5, 10, 2, 5]);
  const q = randInt(rng, 2, t <= 2 ? 5 : 10);
  const total = d * q;
  const th = pick(rng, THINGS);
  const who = nm(rng);
  const sharing = chance(rng, 0.5);
  const cont = pick(rng, CONTAINERS);
  const prompt = sharing
    ? `${who} shares ${total} ${th[1]} equally among ${d} friends. How many does each friend get?`
    : `${who} puts ${total} ${th[1]} into ${cont[1]} with ${d} in each. How many ${cont[1]} are filled?`;
  const ans = q;
  const qq = {
    prompt,
    visual: t <= 3 && total <= 20 ? { type: 'objects', items: [{ icon: th[2], count: total }], layout: 'scatter' } : undefined,
    hint: sharing ? `How many does each friend get? Deal the ${total} ${th[1]} out one at a time to ${d} friends until none are left, or think: ${d} × □ = ${total}.` : `How many groups of ${d} can you make from ${total}? Skip count by ${d}s up to ${total} and count how many skips you made.`,
    hintVisual: t <= 3 ? (sharing ? { type: 'groups', groups: d, each: q, icon: th[2] } : undefined) : undefined,
    explain: `${total} ÷ ${d} = ${q}, because ${d} × ${q} = ${total}.`,
  };
  if (t >= 3 && chance(rng, 0.5)) return { ...qq, kind: 'num', answer: num(ans) };
  return { ...qq, ...mcN(rng, ans, [total - d, total + d, d, ans + 1, ans - 1]) };
};

const mdProperties = (rng, t) => {
  const k = randInt(rng, 0, 4);
  const a = pick(rng, FOUND.filter((x) => x > 1)), b = randInt(rng, 3, 10);
  if (k === 0) {
    return {
      kind: 'num',
      prompt: `${a} × ${b} = ${a * b}. What is ${b} × ${a}?`,
      visual: { type: 'array', rows: a, cols: b },
      hint: `Does changing the order change the answer? ${a} × ${b} is ${a} rows of ${b}. Turn the array on its side to get ${b} rows of ${a}: are there more dots, fewer dots, or the same number?`,
      explain: `You can multiply in any order. ${b} × ${a} = ${a} × ${b} = ${a * b}.`,
      answer: num(a * b),
    };
  }
  if (k === 1) {
    const n = randInt(rng, 2, 10);
    const div = chance(rng, 0.3);
    const oneFirst = chance(rng, 0.5);
    const prompt = div ? `What is ${n} ÷ 1?` : oneFirst ? `What is 1 × ${n}?` : `What is ${n} × 1?`;
    return {
      prompt,
      visual: div || n > 10 ? undefined : { type: 'groups', groups: oneFirst ? 1 : n, each: oneFirst ? n : 1, icon: pick(rng, ICONS) },
      hint: div ? `What is ${n} shared into 1 group? If one person gets all ${n}, how many does that person have?` : `${oneFirst ? `1 × ${n} means 1 group of ${n}` : `${n} × 1 means ${n} groups of 1`}. Picture it: how many is that altogether?`,
      explain: div ? `Sharing ${n} with 1 group puts all ${n} in that group. ${n} ÷ 1 = ${n}.` : `Multiplying by 1 keeps the number the same. ${prompt.slice(8, -1)} = ${n}.`,
      ...mcN(rng, n, [n + 1, 1, n - 1, 10 + n]),
    };
  }
  if (k === 2) {
    const p = a * b;
    const good = chance(rng, 0.5) ? `${p} ÷ ${a} = ${b}` : `${p} ÷ ${b} = ${a}`;
    return {
      prompt: `Which division fact goes with ${a} × ${b} = ${p}?`,
      hint: `A matching division fact uses the same three numbers: ${a}, ${b} and ${p}. It starts with the biggest number, ${p}, divided by one of the others, and the answer is the third number. Test each choice.`,
      explain: `${a} × ${b} = ${p}, so ${p} ÷ ${a} = ${b} and ${p} ÷ ${b} = ${a}.`,
      ...mcP(rng, good, [`${b} ÷ ${a} = ${p}`, `${p} ÷ ${a} = ${p - a}`, `${p} ÷ ${a} = ${b + 1}`, `${a} ÷ ${p} = ${b}`], [], String),
    };
  }
  if (k === 3) {
    const n = a * b;
    const good = `${a} × ${b} = ${b} × ${a}`;
    const notMode = t >= 5 && chance(rng, 0.5);
    const wrongs = [`${n} ÷ ${a} = ${a} ÷ ${n}`, `${a} × ${b} = ${a} + ${b}`, `${n} ÷ ${a} = ${n} − ${a}`];
    if (notMode) {
      const bad = pick(rng, wrongs);
      return {
        prompt: 'Which one is NOT true?',
        hint: 'Which sentence is NOT true? Work out both sides of each one. In × you can switch the numbers and keep the same answer, but in ÷ switching changes the answer. And × is not the same as +, and ÷ is not the same as −.',
        explain: `${bad} is not true. You can switch the order in multiplication, but not in division, and × is not the same as +.`,
        ...mcP(rng, bad, [good, `${b} × 1 = ${b}`, `${n} ÷ ${a} = ${b}`], [], String),
      };
    }
    return {
      prompt: 'Which one is true?',
      hint: 'Which sentence is true? Work out both sides of each one. Switching the numbers in × keeps the answer the same (turn an array sideways), but in ÷ it does not. And × is not the same as +, and ÷ is not the same as −.',
      explain: `${a} × ${b} and ${b} × ${a} are both ${n}. In division the order matters: ${n} ÷ ${a} = ${b}, but ${a} ÷ ${n} is much less than 1.`,
      ...mcP(rng, good, wrongs, [], String),
    };
  }
  const n = a * b;
  const [p, q] = nm2(rng);
  const th = pick(rng, THINGS);
  return {
    prompt: `${p} shares ${n} ${th[1]} among ${a} friends. ${q} shares ${a} ${th[1]} among ${n} friends. Do they get the same amount each?`,
    hint: `${p} shares ${n} among ${a} friends, but ${q} shares only ${a} among ${n} friends. Picture both: with so few ${th[1]} and so many friends, could everyone get the same as before? "Yes" means switching the numbers in division changes nothing; "No" means it does.`,
    explain: `${n} ÷ ${a} = ${b} each for ${p}'s friends. ${q} has only ${a} ${th[1]} for ${n} friends, so not everyone even gets a whole one. Order matters in division.`,
    ...mcP(rng, `No. ${n} ÷ ${a} is not the same as ${a} ÷ ${n}.`, [`Yes. Order does not matter in division.`, `Yes. They both have ${n} and ${a}.`], [], String),
  };
};

const mdWord = (rng, t) => {
  const f = pick(rng, t >= 5 ? [2, 5, 10, 1, 5, 10] : [2, 5, 10]);
  const n = randInt(rng, 2, 10);
  const th = pick(rng, THINGS);
  const cont = pick(rng, CONTAINERS);
  const who = nm(rng);
  const mult = chance(rng, 0.5);
  const total = f * n;
  const prompt = mult
    ? pick(rng, [`Each ${cont[0]} has ${f} ${th[1]}. There are ${n} ${cont[1]}. How many ${th[1]} in all?`,
      `${who} makes ${n} rows of ${th[1]} with ${f} in each row. How many ${th[1]} are there?`,
      `A dragon hides ${f} ${th[1]} in each of ${n} caves. How many ${th[1]} are hidden?`])
    : pick(rng, [`There are ${total} ${th[1]}. They go in ${cont[1]} of ${f}. How many ${cont[1]}?`,
      `${who} shares ${total} ${th[1]} equally into ${f} ${cont[1]}. How many in each ${cont[0]}?`]);
  const ans = mult ? total : n;
  const sentence = mult ? `${n} × ${f} = □` : `${total} ÷ ${f} = □`;
  if (chance(rng, 0.35)) {
    return {
      prompt: `${prompt} Which number sentence solves it?`,
      hint: `Which sentence fits the story? × joins equal groups, ÷ splits a total into equal groups, + joins two amounts and − takes away. Is this story about ${mult ? 'equal groups being put together' : 'a total being split into equal groups'}, or something else?`,
      explain: `${sentence.replace('□', String(ans))}.`,
      ...mcP(rng, sentence, mult ? [`${n} + ${f} = □`, `${Math.max(n, f)} − ${Math.min(n, f)} = □`, `${n * f} ÷ ${f} = □`] : [`${total} × ${f} = □`, `${total} − ${f} = □`, `${total} + ${f} = □`], [], String),
    };
  }
  const q = {
    prompt,
    visual: t <= 4 && mult && f * n <= 50 ? { type: 'groups', groups: n, each: f, icon: th[2] } : undefined,
    hint: mult ? `How many altogether? There are ${n} equal groups of ${f}. Skip count by ${f}s, ${n} times.` : `How many in each group (or how many groups)? Split ${total} using ${f}: think ${f} × □ = ${total}.`,
    explain: `${sentence.replace('□', String(ans))}.`,
  };
  if (chance(rng, 0.5)) return { ...q, kind: 'num', answer: num(ans) };
  return { ...q, ...mcN(rng, ans, mult ? [f + n, total + f, total - f] : [total - f, n + 1, n - 1, f]) };
};

const mdDerived = (rng, t) => {
  const b = randInt(rng, 3, 10);
  const strat = pick(rng, t >= 6 ? ['add', 'sub9', 'sub4', 'dbl4', 'dbl8', 'three', 'six'] : ['add', 'sub9', 'sub4', 'dbl4', 'three']);
  let known, target, knownVal, ans, how;
  switch (strat) {
    case 'add': known = `5 × ${b}`; target = `6 × ${b}`; knownVal = 5 * b; ans = 6 * b; how = `add one more group of ${b}`; break;
    case 'sub9': known = `10 × ${b}`; target = `9 × ${b}`; knownVal = 10 * b; ans = 9 * b; how = `take away one group of ${b}`; break;
    case 'sub4': known = `5 × ${b}`; target = `4 × ${b}`; knownVal = 5 * b; ans = 4 * b; how = `take away one group of ${b}`; break;
    case 'dbl4': known = `2 × ${b}`; target = `4 × ${b}`; knownVal = 2 * b; ans = 4 * b; how = 'double it'; break;
    case 'dbl8': known = `4 × ${b}`; target = `8 × ${b}`; knownVal = 4 * b; ans = 8 * b; how = 'double it'; break;
    case 'three': known = `2 × ${b}`; target = `3 × ${b}`; knownVal = 2 * b; ans = 3 * b; how = `add one more group of ${b}`; break;
    default: known = `3 × ${b}`; target = `6 × ${b}`; knownVal = 3 * b; ans = 6 * b; how = 'double it'; break;
  }
  const kn = Number(known.split(' ')[0]), tg = Number(target.split(' ')[0]);
  const vis = t <= 5 ? (how.startsWith('double') ? { type: 'array', rows: b, cols: tg, split: tg / 2 } : { type: 'array', rows: b, cols: Math.max(kn, tg), split: Math.min(kn, tg) }) : undefined;
  if (chance(rng, 0.45)) {
    const wrongs = how.startsWith('double')
      ? [`${known}, then add ${b}`, `${known}, then add 2`, `${known}, then take away ${b}`]
      : how.startsWith('add') ? [`${known}, then take away ${b}`, `${known}, then add 1`, `${known}, then double it`]
        : [`${known}, then add ${b}`, `${known}, then take away 1`, `${known}, then take away ${Number(known.split(' ')[0])}`];
    return {
      prompt: `Which strategy works for ${target}?`,
      visual: vis,
      hint: `Which strategy works for ${target}? Start from a fact you know: ${known} = ${knownVal}. Does ${target} have one more group, one less group, or twice as many groups as ${known}? Test each choice against that.`,
      explain: `${known} = ${knownVal}. To get ${target}, ${how}: ${ans}.`,
      ...mcP(rng, `${known}, then ${how}`, wrongs, [], String),
    };
  }
  return {
    kind: 'num',
    prompt: `${known} = ${knownVal}. Use it to find ${target}.`,
    visual: vis,
    hint: `${known} = ${knownVal}. Is ${target} one more group of ${b}, one less group of ${b}, or double? Change ${knownVal} to match.`,
    explain: `${known} = ${knownVal}. ${cap(how)}: ${how.startsWith('double') ? `${knownVal} + ${knownVal}` : how.startsWith('add') ? `${knownVal} + ${b}` : `${knownVal} − ${b}`} = ${ans}. So ${target} = ${ans}.`,
    answer: num(ans),
  };
};

const mdCombo = (rng, t, opts = {}) => {
  const k = randInt(rng, 0, t >= 7 && opts.challenge ? 3 : 2); // k = 3 ("times as many") is a Grade 4 preview
  const who = nm(rng);
  const th = pick(rng, THINGS);
  if (k === 0) {
    const a = randInt(rng, 2, 6), b = randInt(rng, 2, 9);
    const f1 = pick(rng, [10, 5]), f2 = 2;
    const ans = a * f1 + b * f2;
    return {
      kind: 'num',
      prompt: `${who} has ${a} packs of ${f1} ${th[1]} and ${b} packs of ${f2} ${th[1]}. How many ${th[1]} in all?`,
      hint: `How many ${th[1]} in all? Find each part with multiplication: ${a} × ${f1} and ${b} × ${f2}. Then add the two totals together.`,
      explain: `${a} × ${f1} = ${a * f1} and ${b} × ${f2} = ${b * f2}. ${a * f1} + ${b * f2} = ${ans}.`,
      answer: num(ans),
    };
  }
  if (k === 1) {
    let a, b, c, d;
    do { a = randInt(rng, 2, 9); b = pick(rng, [2, 5, 10]); c = randInt(rng, 2, 9); d = pick(rng, [2, 5, 10]); } while (a * b === c * d || b === d);
    const bigger = a * b > c * d ? `${a} groups of ${b}` : `${c} groups of ${d}`;
    return {
      prompt: `Which is more: ${a} groups of ${b} or ${c} groups of ${d}?`,
      hint: `Which is more? Find each total with multiplication: ${a} × ${b} and ${c} × ${d}. Then compare the two totals.`,
      explain: `${a} × ${b} = ${a * b} and ${c} × ${d} = ${c * d}. So ${bigger} is more.`,
      ...fixedChoices([`${a} groups of ${b}`, `${c} groups of ${d}`], bigger),
    };
  }
  if (k === 2) {
    const f = pick(rng, [2, 5, 10]), rows = randInt(rng, 3, 8), total = f * rows, add = randInt(rng, 1, 2);
    return {
      kind: 'num',
      prompt: `${who} puts ${total} ${th[1]} in rows of ${f}. Then ${who} adds ${add} more row${add > 1 ? 's' : ''} of ${f}. How many rows now?`,
      hint: `How many rows are there now? First find how many rows of ${f} make ${total}: think ${f} × □ = ${total}. Then add the ${add} new row${add > 1 ? 's' : ''}.`,
      explain: `${total} ÷ ${f} = ${rows} rows. ${rows} + ${add} = ${rows + add} rows.`,
      answer: num(rows + add),
    };
  }
  const a = randInt(rng, 2, 9), m = pick(rng, [2, 5, 10]);
  const [p, q] = nm2(rng);
  return {
    prompt: `Big challenge! ${p} has ${a} ${th[1]}. ${q} has ${m} times as many. How many does ${q} have?`,
    hint: `How many does ${q} have? "${m} times as many" means ${m} groups of ${a}. Skip count by ${a}s, ${m} times, or use a times fact.`,
    explain: `${m} × ${a} = ${m * a}. ${q} has ${m * a} ${th[1]}.`,
    visual: { type: 'barmodel', parts: Array(m).fill(a), labels: [q] },
    ...mcN(rng, m * a, [m + a, m * a + a, m * a - a, a * (m + 1)]),
  };
};

const g3MulDiv = {
  id: 'g3-ops-muldiv', grade: 3, strand: 'number', bigIdea: 'ops', species: 'multiplier',
  name: 'Groups & Sharing',
  parentDesc: 'Understands multiplication and division as equal groups using the foundational facts (1, 2, 5, 10): identity property of 1, commutative property, inverse operations, order in division, and strategies for derived facts.',
  classic: false,
  gen: tiered([
    [1, 3, mdGroupsVisual, 2], [2, 3, mdPickPicture], [2, 5, mdShare, 1.5], [3, 5, mdProperties, 2], [4, 6, mdWord, 2],
    [5, 7, mdDerived, 2], [6, 7, mdCombo, 1.5],
  ]),
};

// ---------------------------------------------------------------------------
// SD6 Facts fluency: foundational (1, 2, 5, 10), beginning derived (9, 4, 8, 3, 6, then 7)
// ---------------------------------------------------------------------------
const FACT_HINT = {
  1: 'A number times 1 stays the same.',
  2: 'Times 2 is a double.',
  5: 'Count by 5s, or find half of times 10.',
  10: 'Count by 10s.',
  9: 'Find times 10, then take away one group.',
  4: 'Double it, then double again.',
  8: 'Double, double, double: or double the 4s fact.',
  3: 'Find times 2, then add one more group.',
  6: 'Find times 5, then add one more group. Or double the 3s fact.',
  7: 'Find times 5 and times 2, then add them.',
};
function factHint(a, b, f) {
  const o = f === a ? b : a;
  switch (f) {
    case 9: return `What is ${a} × ${b}? Think 10 × ${o} first, then take away one group of ${o}.`;
    case 4: return `What is ${a} × ${b}? Double ${o} to get 2 × ${o}, then double that again.`;
    case 8: return `What is ${a} × ${b}? Find 4 × ${o} (double, double), then double it once more.`;
    case 3: return `What is ${a} × ${b}? Find 2 × ${o}, then add one more ${o}.`;
    case 6: return `What is ${a} × ${b}? Find 5 × ${o}, then add one more ${o}.`;
    case 7: return `What is ${a} × ${b}? Find 5 × ${o} and 2 × ${o}, then add them together.`;
    case 5: return `What is ${a} × ${b}? Count by 5s, ${o} time${o === 1 ? '' : 's'}. Or find ten groups of ${o} and take half.`;
    case 2: return `What is ${a} × ${b}? Times 2 is a double: ${o} + ${o}.`;
    case 10: return `What is ${a} × ${b}? Count by 10s, ${o} time${o === 1 ? '' : 's'}.`;
    default: return `What is ${a} × ${b}? One group of a number, or a number taken 1 time, stays the same.`;
  }
}
function factExplain(a, b, focus) {
  const p = a * b;
  const f = focus ?? ([9, 8, 7, 6, 4, 3].includes(a) ? a : [9, 8, 7, 6, 4, 3].includes(b) ? b : a);
  const o = f === a ? b : a;
  const skip = (k, n) => Array.from({ length: n }, (_, i) => (i + 1) * k).join(', ');
  switch (f) {
    case 9: return `10 × ${o} = ${10 * o}. Take away one ${o}: ${10 * o} − ${o} = ${p}.`;
    case 4: return `2 × ${o} = ${2 * o}. Double it: ${2 * o} + ${2 * o} = ${p}.`;
    case 8: return `4 × ${o} = ${4 * o}. Double it: ${4 * o} + ${4 * o} = ${p}.`;
    case 3: return `2 × ${o} = ${2 * o}. Add one more ${o}: ${2 * o} + ${o} = ${p}.`;
    case 6: return `5 × ${o} = ${5 * o}. Add one more ${o}: ${5 * o} + ${o} = ${p}.`;
    case 7: return `5 × ${o} = ${5 * o} and 2 × ${o} = ${2 * o}. ${5 * o} + ${2 * o} = ${p}.`;
    case 10: return o <= 10 ? `Count by 10s ${o} time${o === 1 ? '' : 's'}: ${skip(10, o)}. So ${a} × ${b} = ${p}.` : `${a} × ${b} = ${p}.`;
    case 5: return `Count by 5s ${o} time${o === 1 ? '' : 's'}: ${skip(5, o)}. So ${a} × ${b} = ${p}.`;
    case 2: return `Double ${o}: ${o} + ${o} = ${p}. So ${a} × ${b} = ${p}.`;
    case 1: return `Multiplying by 1 keeps the number the same. ${a} × ${b} = ${p}.`;
    default: return `${a} × ${b} = ${p}.`;
  }
}
// which factor sets by tier
const FACT_SETS = {
  1: [1, 2, 10, 5], 2: [1, 2, 5, 10], 3: [1, 2, 5, 10], 4: [2, 5, 10, 9, 4], 5: [2, 5, 10, 9, 4, 8, 3],
  6: [9, 4, 8, 3, 6, 5, 10, 2], 7: [9, 4, 8, 3, 6, 7, 1, 2, 5, 10], // Grade 3 only begins derived facts, so level 7 keeps foundational facts in the mix
};
function factPair(rng, t) {
  const f = pick(rng, FACT_SETS[t]);
  const o = t === 1 ? randInt(rng, 1, 5) : randInt(rng, t <= 3 ? 1 : 2, 10);
  return chance(rng, 0.5) ? [f, o, f] : [o, f, f];
}

const fcMul = (rng, t) => {
  const [a, b, f] = factPair(rng, t);
  const p = a * b;
  let visual;
  if (t <= 2) visual = chance(rng, 0.5) ? { type: 'array', rows: a, cols: b, icon: pick(rng, ICONS) } : { type: 'groups', groups: a, each: b, icon: pick(rng, ICONS) };
  const q = {
    prompt: pick(rng, [`What is ${a} × ${b}?`, `${a} × ${b} = □`]),
    visual,
    hint: factHint(a, b, f),
    explain: factExplain(a, b, f),
  };
  if (chance(rng, t <= 2 ? 0.55 : 0.75)) return { ...q, kind: 'num', answer: num(p) };
  return { ...q, ...mcN(rng, p, [a + b, a * (b + 1), a * (b - 1), (a + 1) * b, p + 10, Number(String(p).split('').reverse().join(''))].filter((x) => x > 0)) };
};

const fcDiv = (rng, t) => {
  const [a, b, d] = factPair(rng, t);
  const q = d === a ? b : a;
  const p = a * b;
  return {
    kind: chance(rng, 0.75) ? 'num' : 'mc',
    prompt: pick(rng, [`What is ${p} ÷ ${d}?`, `${p} ÷ ${d} = □`]),
    visual: t <= 3 && chance(rng, 0.5) && p <= 50 ? { type: 'array', rows: d, cols: q } : undefined,
    hint: `What is ${p} ÷ ${d}? Think: ${d} times what number makes ${p}? Skip count by ${d}s up to ${p} and count the skips.`,
    explain: `${d} × ${q} = ${p}, so ${p} ÷ ${d} = ${q}.`,
    answer: num(q),
  };
};
// convert the mc variant of fcDiv into proper choices
const fcDivWrap = (rng, t) => {
  const q = fcDiv(rng, t);
  if (q.kind === 'num') return q;
  const ans = Number(q.answer);
  const p = Number(q.prompt.match(/(\d+) ÷/)[1]);
  const d = Number(q.prompt.match(/÷ (\d+)/)[1]);
  const { answer, ...rest } = q;
  return { ...rest, ...mcN(rng, ans, [ans + 1, ans - 1, p - d, d, ans + 2].filter((x) => x > 0)) };
};

const fcMissing = (rng, t) => {
  const [a, b] = factPair(rng, t);
  const p = a * b;
  const first = chance(rng, 0.5);
  return {
    kind: 'num',
    prompt: first ? `□ × ${b} = ${p}` : `${a} × □ = ${p}`,
    speak: first ? `What times ${b} equals ${p}?` : `${a} times what equals ${p}?`,
    hint: `What number times ${first ? b : a} makes ${p}? Skip count by ${first ? b : a}s until you reach ${p} and count your skips. Or think ${p} ÷ ${first ? b : a}.`,
    explain: `${a} × ${b} = ${p}, so the missing number is ${first ? a : b}.`,
    answer: num(first ? a : b),
  };
};

const fcWhich = (rng, t) => {
  const [a, b, f] = factPair(rng, Math.max(t, 2));
  const p = a * b;
  const good = `${a} × ${b}`;
  const cands = [];
  for (let x = 1; x <= 10; x++) for (let y = 1; y <= 10; y++) {
    if (x * y !== p && Math.abs(x * y - p) <= 10 && (x === a || y === b || x + y === a + b)) cands.push(`${x} × ${y}`);
  }
  const sum = `${a} + ${b}`;
  return {
    prompt: `Which fact has a product of ${p}?`,
    hint: `Which fact makes ${p}? Work out each choice with a fact you know, or skip count. Only one lands exactly on ${p}.`,
    explain: `${a} × ${b} = ${p}. ${factExplain(a, b, f)}`,
    ...mcP(rng, good, a + b !== p ? [sum, ...cands] : cands, [`${a + 1} × ${b}`, `${a} × ${b + 1}`], String),
  };
};

const fcFamily = (rng, t) => {
  const [a, b] = factPair(rng, t);
  const p = a * b;
  const facts = [`${a} × ${b} = ${p}`, `${b} × ${a} = ${p}`, `${p} ÷ ${a} = ${b}`, `${p} ÷ ${b} = ${a}`];
  const shown = pick(rng, facts);
  const good = pick(rng, facts.filter((f) => f !== shown && (a !== b)));
  const wrongs = [`${p} ÷ ${a} = ${b + 1}`, `${a} + ${b} = ${a + b}`, `${p} − ${a} = ${p - a}`, `${a} × ${b + 1} = ${a * (b + 1)}`];
  if (!good) return fcMul(rng, t);
  return {
    prompt: `Which fact is in the same fact family as ${shown}?`,
    hint: `A fact family uses the same three numbers, here ${a}, ${b} and ${p}, with × and ÷. Test each choice: does it use only those three numbers, and is it true?`,
    explain: `The family for ${a}, ${b} and ${p} is: ${facts.filter((x, i, arr) => arr.indexOf(x) === i).join(', ')}.`,
    ...mcP(rng, good, wrongs, [], String),
  };
};

const fcNearFact = (rng, t) => {
  const b = randInt(rng, 3, 10);
  const pairs = t <= 4 ? [[10, 9, -1], [5, 4, -1], [2, 4, 'x2']] : t === 5 ? [[10, 9, -1], [2, 3, 1], [4, 8, 'x2'], [5, 4, -1]] : [[5, 6, 1], [3, 6, 'x2'], [5, 7, '+2'], [10, 9, -1], [4, 8, 'x2']];
  const [k, target, op] = pick(rng, pairs);
  const kv = k * b;
  const ans = target * b;
  const how = op === -1 ? `${kv} − ${b} = ${ans}` : op === 1 ? `${kv} + ${b} = ${ans}` : op === 'x2' ? `${kv} + ${kv} = ${ans}` : `${kv} + ${b} + ${b} = ${ans}`;
  return {
    kind: 'num',
    prompt: `${k} × ${b} = ${kv}. So ${target} × ${b} = □`,
    hint: op === 'x2' ? `${target} groups is double ${k} groups. Double ${kv}.` : `${target} groups of ${b} is ${op === -1 ? 'one group less' : op === 1 ? 'one group more' : 'two groups more'} than ${k} groups. So ${op === -1 ? 'take one' : op === 1 ? 'add one' : 'add two'} ${b}${op === '+2' ? 's' : ''} ${op === -1 ? 'away from' : 'to'} ${kv}.`,
    explain: `${how}. So ${target} × ${b} = ${ans}.`,
    answer: num(ans),
  };
};

const g3Facts = {
  id: 'g3-ops-facts', grade: 3, strand: 'number', bigIdea: 'ops', species: 'factsprite',
  name: 'Times Facts ×1 ×2 ×5 ×10',
  parentDesc: 'Fluency with the foundational multiplication and related division facts (×1, ×2, ×5, ×10), then beginning derived facts (9, 4, 8, 3, 6, and 7 last).',
  classic: false,
  gen: tiered([
    [1, 7, fcMul, 4], [3, 7, fcDivWrap, 2.5], [4, 7, fcMissing, 1.5], [3, 7, fcWhich], [5, 7, fcFamily, 0.7], [4, 7, fcNearFact, 1.2],
  ]),
};

// ---------------------------------------------------------------------------
// SD7 Addition and subtraction equations with an unknown
// ---------------------------------------------------------------------------
const SYMS = ['□', '★', '▲', '●', '◆'];
const SYM_NAME = { '□': 'the box', '★': 'the star', '▲': 'the triangle', '●': 'the circle', '◆': 'the diamond' };
function eqNumbers(rng, t) {
  if (t === 1) { const c = randInt(rng, 8, 20); const a = randInt(rng, 2, c - 2); return [a, c - a, c]; }
  if (t === 2) {
    if (chance(rng, 0.5)) { const c = randInt(rng, 5, 10) * 10; const a = randInt(rng, 1, c / 10 - 1) * 10; return [a, c - a, c]; }
    const c = randInt(rng, 30, 99); const a = randInt(rng, 11, c - 11); return [a, c - a, c];
  }
  if (t === 3) { const c = randInt(rng, 40, 250); const a = randInt(rng, 12, c - 12); return [a, c - a, c]; }
  if (t === 4) { const c = randInt(rng, 120, 500); const a = randInt(rng, 20, c - 20); return [a, c - a, c]; }
  const c = randInt(rng, 150, 999); const a = randInt(rng, 25, c - 25); return [a, c - a, c];
}
// Equation of form with unknown position. Returns {text, ans, explain}
function makeEq(rng, t, a, b, c, sym) {
  const sub = chance(rng, 0.45);
  const pos = t <= 2 ? pick(rng, ['change', 'result', 'change', 'start']) : pick(rng, ['change', 'start', 'change', 'start', 'result']);
  const flip = t >= 3 && chance(rng, 0.3);
  let left, right, ans, why;
  if (!sub) {
    // a + b = c
    if (pos === 'result') { left = `${fmtNum(a)} + ${fmtNum(b)}`; right = sym; ans = c; why = `${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(c)}`; }
    else if (pos === 'change') { left = `${fmtNum(a)} + ${sym}`; right = fmtNum(c); ans = b; why = `${fmtNum(c)} − ${fmtNum(a)} = ${fmtNum(b)}, and ${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(c)}`; }
    else { left = `${sym} + ${fmtNum(b)}`; right = fmtNum(c); ans = a; why = `${fmtNum(c)} − ${fmtNum(b)} = ${fmtNum(a)}, and ${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(c)}`; }
  } else {
    // c − a = b
    if (pos === 'result') { left = `${fmtNum(c)} − ${fmtNum(a)}`; right = sym; ans = b; why = `${fmtNum(c)} − ${fmtNum(a)} = ${fmtNum(b)}`; }
    else if (pos === 'change') { left = `${fmtNum(c)} − ${sym}`; right = fmtNum(b); ans = a; why = `${fmtNum(c)} − ${fmtNum(b)} = ${fmtNum(a)}, and ${fmtNum(c)} − ${fmtNum(a)} = ${fmtNum(b)}`; }
    else { left = `${sym} − ${fmtNum(a)}`; right = fmtNum(b); ans = c; why = `${fmtNum(b)} + ${fmtNum(a)} = ${fmtNum(c)}, and ${fmtNum(c)} − ${fmtNum(a)} = ${fmtNum(b)}`; }
  }
  const text = flip ? `${right} = ${left}` : `${left} = ${right}`;
  const known = !sub ? (pos === 'change' ? a : b) : null;
  const hint = pos === 'result' ? (sub ? `${sym} is the answer to ${fmtNum(c)} − ${fmtNum(a)}. Work out that side: take away the ones, then the tens${c >= 100 ? ', then the hundreds' : ''}.` : `${sym} is the answer to ${fmtNum(a)} + ${fmtNum(b)}. Work out that side: add the ones, then the tens${c >= 100 ? ', then the hundreds' : ''}.`)
    : !sub ? `${sym} is a missing part: something plus ${fmtNum(known)} makes ${fmtNum(c)}. Count up from ${fmtNum(known)} to ${fmtNum(c)}, or subtract ${fmtNum(known)} from ${fmtNum(c)}.`
      : pos === 'start' ? `${sym} is the starting number: when ${fmtNum(a)} is taken away, ${fmtNum(b)} is left. Put them back together by adding ${fmtNum(b)} and ${fmtNum(a)}.`
        : `${sym} is how much was taken away from ${fmtNum(c)} to leave ${fmtNum(b)}. Count up from ${fmtNum(b)} to ${fmtNum(c)}, or subtract ${fmtNum(b)} from ${fmtNum(c)}.`;
  // barmodel: whole and parts
  const whole = c, parts = [a, b];
  const bm = { type: 'barmodel', whole: ans === c ? '?' : whole, parts: parts.map((x) => (x === ans && ans !== c ? '?' : x)) };
  return { text, ans, why, hint, bm, sub, pos };
}

const eqSolve = (rng, t) => {
  const [a, b, c] = eqNumbers(rng, t);
  const sym = t <= 2 ? '□' : pick(rng, SYMS);
  const e = makeEq(rng, t, a, b, c, sym);
  let visual;
  if (t === 1) visual = chance(rng, 0.5) ? { type: 'numberbond', whole: e.bm.whole, parts: e.bm.parts } : { type: 'balance', left: e.text.split(' = ')[0].replace(sym, '?'), right: e.text.split(' = ')[1].replace(sym, '?'), tilt: 'level' };
  else if (t === 2) visual = e.bm;
  const q = {
    prompt: `What number does ${SYM_NAME[sym]} stand for? ${e.text}`,
    visual: visual || { type: 'expression', text: e.text, big: true },
    hint: e.hint,
    hintVisual: t >= 3 ? e.bm : undefined,
    explain: `${e.why}. So ${sym} = ${fmtNum(e.ans)}.`,
  };
  if (chance(rng, t <= 2 ? 0.5 : 0.65)) return { ...q, kind: 'num', answer: num(e.ans) };
  return { ...q, ...mcN(rng, e.ans, [a + b + c - e.ans, e.ans + 10, e.ans - 10, e.ans + 1, e.ans - 1, c + (e.ans === c ? a : 0)].filter((x) => x !== e.ans && x > 0)) };
};

const EQ_STORIES = [
  // [text(a,b,c,p,th), equation type]
  { t: (a, b, c, p, th) => `${p} had some ${th}. ${p} found ${a} more. Now ${p} has ${c}. How many did ${p} have at first?`, eq: (a, b, c) => [`□ + ${a} = ${c}`, c - a], wrong: (a, b, c) => [`${c} + ${a} = □`, `□ − ${a} = ${c}`, `${a} − □ = ${c}`] },
  { t: (a, b, c, p, th) => `${p} had ${c} ${th}. ${p} gave some away. Now ${p} has ${b}. How many were given away?`, eq: (a, b, c) => [`${c} − □ = ${b}`, c - b], wrong: (a, b, c) => [`${c} + □ = ${b}`, `${c} + ${b} = □`, `□ − ${c} = ${b}`] },
  { t: (a, b, c, p, th) => `${p} has ${a} ${th}. How many more does ${p} need to have ${c}?`, eq: (a, b, c) => [`${a} + □ = ${c}`, c - a], wrong: (a, b, c) => [`${a} + ${c} = □`, `□ − ${a} = ${c}`, `${c} + □ = ${a}`] },
  { t: (a, b, c, p, th) => `${p} had some ${th}. ${p} used ${a}. There are ${b} left. How many did ${p} start with?`, eq: (a, b, c) => [`□ − ${a} = ${b}`, a + b], wrong: (a, b, c) => [`${a} − □ = ${b}`, `${b} − ${a} = □`, `□ + ${b} = ${a}`] },
];
const eqStory = (rng, t) => {
  const [a, b, c] = eqNumbers(rng, Math.max(3, t));
  const p = nm(rng);
  const th = pick(rng, THINGS)[1];
  const st = pick(rng, EQ_STORIES);
  const prompt = st.t(fmtNum(a), fmtNum(b), fmtNum(c), p, th);
  const [eq, ans] = st.eq(a, b, c);
  const eqF = eq.replace(/\d+/g, (m) => fmtNum(Number(m)));
  if (chance(rng, 0.5)) {
    return {
      prompt: `${prompt} Which equation matches?`,
      hint: 'Which equation tells the story? First decide what you know: the start, the change (what was added or taken away), or the end. □ goes where the unknown number is. Test each choice: does its + or − match what happened, and is □ in the right spot?',
      explain: `The unknown is what we are looking for, so the equation is ${eqF}. □ = ${fmtNum(ans)}.`,
      ...mcP(rng, eqF, st.wrong(a, b, c).map((w) => w.replace(/\d+/g, (m) => fmtNum(Number(m)))), [], String),
    };
  }
  return {
    kind: 'num',
    prompt,
    visual: t <= 4 ? { type: 'expression', text: eqF } : undefined,
    hint: `Write the story as a number sentence: ${eqF}. Which number makes both sides equal? Use the opposite operation to find it, then check.`,
    explain: `${eqF}. □ = ${fmtNum(ans)}.`,
    answer: num(ans),
  };
};

const eqWhichValue = (rng, t) => {
  const [a, b, c] = eqNumbers(rng, t);
  const sym = pick(rng, SYMS);
  const e = makeEq(rng, 5, a, b, c, sym);
  if (chance(rng, 0.5)) {
    return {
      prompt: `Which value of ${sym} makes this true? ${e.text}`,
      speak: `Which value of ${SYM_NAME[sym].replace('the ', '')} makes this true? ${toSpeech(e.text)}`,
      hint: `Which value makes ${e.text} true? Put each choice in place of ${sym}, work out that side, and see if both sides are equal.`,
      explain: `${e.why}. So ${sym} = ${fmtNum(e.ans)}.`,
      ...mcN(rng, e.ans, [a + b + c - e.ans, e.ans + 10, e.ans - 10, e.ans + 100].filter((x) => x > 0 && x !== e.ans)),
    };
  }
  // Which equation has the same unknown value?
  const v = e.ans;
  const hiK = Math.max(1, Math.min(120, 1000 - v)); // keep v + k within 1000
  const k = randInt(rng, Math.min(15, hiK), hiK);
  const good = `${fmtNum(v + k)} − ${sym} = ${fmtNum(k)}`;
  return {
    prompt: `In ${e.text}, ${sym} = ${fmtNum(v)}. Which equation also has ${sym} = ${fmtNum(v)}?`,
    hint: `Put ${fmtNum(v)} in place of ${sym} in each equation and work it out. Only one equation has both sides equal.`,
    explain: `${fmtNum(v + k)} − ${fmtNum(v)} = ${fmtNum(k)}, so ${good} is true when ${sym} = ${fmtNum(v)}.`,
    ...mcP(rng, good, [`${fmtNum(v + k)} + ${sym} = ${fmtNum(k)}`, `${sym} − ${fmtNum(k)} = ${fmtNum(v + k)}`, `${fmtNum(k)} + ${sym} = ${fmtNum(v)}`], [], String),
  };
};

const eqBalance = (rng, t) => {
  const x = t >= 7 ? randInt(rng, 120, 480) : randInt(rng, 25, 250);
  const y = t >= 7 ? randInt(rng, 105, 450) : randInt(rng, 15, 200);
  const total = x + y;
  const a = randInt(rng, 12, total - 12);
  const ans = total - a;
  const sym = pick(rng, SYMS);
  const left = chance(rng, 0.5) ? `${fmtNum(a)} + ${sym}` : `${sym} + ${fmtNum(a)}`;
  const right = `${fmtNum(x)} + ${fmtNum(y)}`;
  const text = `${left} = ${right}`;
  const q = {
    prompt: `The two sides are equal. What is ${sym}? ${text}`,
    visual: { type: 'balance', left: left.replace(sym, '?'), right, tilt: 'level' },
    hint: `A level balance means both sides are equal. First work out ${right}. Then ask: ${fmtNum(a)} plus what number makes that total?`,
    explain: `${right} = ${fmtNum(total)}. ${fmtNum(a)} + ${fmtNum(ans)} = ${fmtNum(total)}, so ${sym} = ${fmtNum(ans)}.`,
  };
  if (chance(rng, 0.6)) return { ...q, kind: 'num', answer: num(ans) };
  return { ...q, ...mcN(rng, ans, [total, total + a, Math.abs(x - a) || ans + 1, y].filter((z) => z !== ans)) };
};

const eqMulPreview = (rng, t) => {
  const f = pick(rng, [2, 5, 10]), n = randInt(rng, 2, 10);
  const sym = pick(rng, SYMS);
  const first = chance(rng, 0.5);
  const text = first ? `${f} × ${sym} = ${f * n}` : `${sym} × ${f} = ${f * n}`;
  return {
    kind: 'num',
    prompt: `Big challenge! What is ${sym}? ${text}`,
    visual: { type: 'expression', text, big: true },
    hint: `${sym} is how many ${f}s make ${f * n}. Skip count by ${f}s up to ${f * n} and count your jumps.`,
    explain: `${f} × ${n} = ${f * n}, so ${sym} = ${n}.`,
    answer: num(n),
  };
};

const g3Equations = {
  id: 'g3-pat-equations', grade: 3, strand: 'patterns', bigIdea: 'patterns', species: 'balancer',
  name: 'Missing Numbers',
  parentDesc: 'Solves addition and subtraction equations with a symbol for the unknown in any position (start, change or result), and writes equations for story problems.',
  classic: false,
  gen: tiered([
    [1, 5, eqSolve, 3], [4, 7, eqStory, 2], [5, 7, eqWhichValue, 1.5], [6, 7, eqBalance, 1.5], [7, 7, eqMulPreview, 0.5, PREVIEW],
  ]),
};

// ---------------------------------------------------------------------------
// SD8 Patterns: repeating (4+ terms, 2 attributes), increasing and decreasing to 1000
// ---------------------------------------------------------------------------
const PSHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'hexagon', 'rhombus', 'pentagon'];
const LETTER_PATS = {
  4: ['AABB', 'ABCD', 'AAAB', 'ABBB', 'ABAB', 'AABC', 'ABCC', 'ABBC', 'AAAA'],
  5: ['AABBB', 'ABCDE', 'AAABB', 'ABBBC', 'AABCC', 'AAAAA', 'ABABB'],
  6: ['AABBCC', 'AAABBB', 'ABCABC', 'ABABAB', 'AABAAB', 'AAAAAA', 'ABBABB'],
};
function minPeriod(arr) {
  const key = (x) => JSON.stringify(x);
  for (let p = 1; p <= arr.length; p++) {
    if (arr.length % p) continue;
    if (arr.every((x, i) => key(x) === key(arr[i % p]))) return p;
  }
  return arr.length;
}
function makeCore(rng, L) {
  for (let g = 0; g < 60; g++) {
    const sp = pick(rng, LETTER_PATS[L]), cp = pick(rng, LETTER_PATS[L]);
    const shapes = sample(rng, PSHAPES, 6), cols = sample(rng, COLOURS, 6);
    const core = sp.split('').map((ch, i) => ({ shape: shapes[ch.charCodeAt(0) - 65], color: cols[cp.charCodeAt(i) - 65] }));
    const bothVary = new Set(core.map((c) => c.shape)).size > 1 && new Set(core.map((c) => c.color)).size > 1;
    if (bothVary && minPeriod(core) === L) return core;
  }
  return [{ shape: 'circle', color: 'red' }, { shape: 'circle', color: 'blue' }, { shape: 'square', color: 'red' }, { shape: 'square', color: 'blue' }].slice(0, L);
}
const itemVis = (it) => ({ type: 'shapes', items: [{ shape: it.shape, color: it.color, size: 'm' }] });
const itemName = (it) => `${it.color} ${it.shape}`;

const patRepeat = (rng, t) => {
  const L = t <= 3 ? 4 : pick(rng, [4, 5, 6]);
  const core = makeCore(rng, L);
  const len = 2 * L + randInt(rng, 0, L - 1);
  const seq = Array.from({ length: len + 1 }, (_, i) => core[i % L]);
  const hole = t >= 3 && chance(rng, 0.4) ? randInt(rng, L, len - 1) : len;
  const ans = seq[hole];
  const shown = seq.slice(0, hole === len ? len : len + 1).map((x, i) => (i === hole ? '?' : { shape: x.shape, color: x.color }));
  if (hole === len) shown.push('?');
  const others = core.filter((c) => itemName(c) !== itemName(ans));
  const mixA = { shape: ans.shape, color: pick(rng, COLOURS.filter((c) => c !== ans.color)) };
  const mixB = { shape: pick(rng, PSHAPES.filter((s) => s !== ans.shape)), color: ans.color };
  return {
    prompt: hole === len ? 'What comes next in the pattern?' : 'What is missing from the pattern?',
    visual: { type: 'pattern', items: shown, highlightCore: t <= 2 ? L : undefined },
    hint: `This pattern changes in two ways: shape AND colour. Find the part that repeats (the core) and say it over and over along the row. Check each choice: is it the right shape and the right colour for that spot?`, hintVisual: { type: 'pattern', items: shown, highlightCore: L },
    explain: `The core is ${core.map(itemName).join(', ')}. It repeats, so the ${hole === len ? 'next' : 'missing'} one is ${an(itemName(ans))}.`,
    ...mcV(rng, itemVis(ans), shuffle(rng, [...others.map(itemVis), itemVis(mixA), itemVis(mixB)])),
  };
};

const patGrowing = (rng, t) => {
  const start = randInt(rng, 1, 5), step = randInt(rng, 1, t === 1 ? 2 : 4);
  const n = t === 1 ? 3 : 4;
  const steps = Array.from({ length: n }, (_, i) => start + i * step);
  const ans = start + n * step;
  const shape = pick(rng, ['square', 'dot', 'triangle']);
  const noun = shape === 'dot' ? 'dots' : shape + 's';
  return {
    prompt: `How many ${noun} will be in the next figure?`,
    visual: { type: 'growing', steps: [...steps, ans], shape, blankLast: true },
    hint: `How many ${noun} will the next figure have? Find how many more are added from one figure to the next. Add that many to the last figure.`,
    explain: `The pattern starts at ${start} and adds ${step} each time: ${steps.join(', ')}, ${ans}.`,
    ...mcN(rng, ans, [ans + 1, ans - 1, steps[n - 1] + 1, ans + step, steps[n - 1] * 2].filter((x) => x !== ans)),
  };
};

function numPattern(rng, t) {
  const steps = t <= 2 ? [2, 5, 10] : t === 3 ? [3, 4, 10, 25, 50, 100] : t === 4 ? [5, 10, 20, 25, 50, 100, 3, 4] : [20, 25, 50, 75, 100, 15, 30];
  const step = pick(rng, steps);
  const dec = t >= 2 && chance(rng, t >= 4 ? 0.5 : 0.3);
  const len = 5;
  const maxStart = (t <= 2 ? 200 : 1000) - step * (len + 1);
  let start = randInt(rng, 0, Math.max(0, maxStart));
  if (t <= 3 || [25, 50, 75].includes(step)) start = Math.round(start / (step % 10 === 0 ? 10 : 5)) * (step % 10 === 0 ? 10 : 5);
  let seq = Array.from({ length: len + 1 }, (_, i) => start + i * step);
  if (dec) seq = seq.reverse();
  return { seq, step, dec };
}

const patNumNext = (rng, t) => {
  const { seq, step, dec } = numPattern(rng, t);
  const known = seq.slice(0, 5), ans = seq[5];
  const q = {
    prompt: `What comes next? ${known.map(fmtNum).join(', ')}, □`,
    visual: t <= 3 ? { type: 'pattern', items: [...known.map(fmtNum), '?'] } : undefined,
    hint: `What comes after ${fmtNum(known[4])}? Find the jump between two numbers side by side: is the pattern going up or down, and by how much? Make one more jump.`,
    explain: `The pattern ${dec ? 'decreases' : 'increases'} by ${step} each time. ${fmtNum(known[4])} ${dec ? '−' : '+'} ${step} = ${fmtNum(ans)}.`,
  };
  if (t >= 3 && chance(rng, 0.45)) return { ...q, kind: 'num', answer: num(ans) };
  return { ...q, ...mcN(rng, ans, [dec ? known[4] + step : known[4] - step, ans + 1, ans - 1, ans + (dec ? -10 : 10), known[4] + (dec ? -2 : 2) * step]) };
};

const patMissing = (rng, t) => {
  const { seq, step, dec } = numPattern(rng, t);
  const hole = randInt(rng, 1, 4);
  const ans = seq[hole];
  return {
    kind: chance(rng, 0.6) ? 'num' : 'mc',
    prompt: `What number is missing? ${seq.map((x, i) => (i === hole ? '□' : fmtNum(x))).join(', ')}`,
    hint: 'What number fills the gap? Use two numbers side by side to find the rule: how much it goes up or down each time. Then use the rule on the number just before the gap.',
    explain: `The rule is ${dec ? 'subtract' : 'add'} ${step}. ${fmtNum(seq[hole - 1])} ${dec ? '−' : '+'} ${step} = ${fmtNum(ans)}.`,
    answer: num(ans),
    _mc: [ans + step, ans - step, ans + 1, ans + 10],
  };
};
const patMissingWrap = (rng, t) => {
  const q = patMissing(rng, t);
  const { _mc, ...rest } = q;
  if (q.kind === 'num') return rest;
  const { answer, ...r2 } = rest;
  return { ...r2, ...mcN(rng, Number(answer), _mc) };
};

const patRule = (rng, t) => {
  const { seq, step, dec } = numPattern(rng, Math.max(t, 3));
  const shown = seq.slice(0, 4);
  const rule = (s, st, d) => `Start at ${fmtNum(s)}. ${d ? 'Subtract' : 'Add'} ${st} each time.`;
  const good = rule(shown[0], step, dec);
  return {
    prompt: `Which rule matches this pattern? ${shown.map(fmtNum).join(', ')}, …`,
    hint: 'A rule tells where the pattern starts and how it changes. Check each rule: does it start at the first number? Does it add or subtract? Is the jump the right size?',
    explain: `It starts at ${fmtNum(shown[0])} and ${dec ? 'goes down' : 'goes up'} by ${step} each time.`,
    ...mcP(rng, good, [rule(shown[0], step, !dec), rule(shown[0], step * 2, dec), rule(shown[1], step, dec), rule(shown[0], step === 10 ? 1 : 10, dec)], [], String),
  };
};

const patError = (rng, t) => {
  const { seq, step, dec } = numPattern(rng, Math.max(t, 4));
  const idx = randInt(rng, 1, 4);
  const bad = seq.slice();
  const deltas = shuffle(rng, [Math.round(step / 2) || 1, 10, 1, -10, -1, 2]).filter((d) => d !== 0 && d !== step && d !== -step);
  for (const delta of deltas) {
    const v = seq[idx] + delta;
    if (v >= 0 && !seq.includes(v)) { bad[idx] = v; break; }
  }
  const opts = sample(rng, bad.filter((x, i) => i !== idx), 3);
  return {
    prompt: `One number is wrong in this pattern. Which one? ${bad.map(fmtNum).join(', ')}`,
    hint: 'Which number breaks the pattern? Find the jump from the first two numbers, then check every jump after that. The wrong number is where a jump does not match.',
    explain: `The rule is ${dec ? 'subtract' : 'add'} ${step}. The number should be ${fmtNum(seq[idx])}, not ${fmtNum(bad[idx])}.`,
    ...mcP(rng, bad[idx], opts, [], fmtNum),
  };
};

const EMOJI_SETS = [['⭐', '🌙', '☀️', '☁️'], ['🍎', '🍌', '🍇', '🍓'], ['🐸', '🦉', '🐟', '🐞'], ['🔴', '🔵', '🟢', '🟡'], ['🎈', '🎁', '🎉', '🎂'], ['🌼', '🍁', '🍄', '🌰']];
const patNth = (rng, t) => {
  const L = pick(rng, [4, 5]);
  const set = pick(rng, EMOJI_SETS);
  const pat = pick(rng, LETTER_PATS[L].filter((p) => new Set(p).size >= 2 && new Set(p).size <= set.length && minPeriod(p.split('')) === L));
  const core = pat.split('').map((ch) => set[ch.charCodeAt(0) - 65]);
  const n = randInt(rng, L * 2 + 1, t >= 6 ? 40 : 20);
  const ans = core[(n - 1) % L];
  const items = [...core, ...core].concat(['…']);
  const opts = [...new Set(core)];
  return {
    prompt: `This pattern keeps repeating. What is the ${ordinal(n)} item?`,
    speak: `This pattern keeps repeating. What is item number ${n}?`,
    visual: { type: 'pattern', items: items.slice(0, -1), highlightCore: L },
    hint: `What is item number ${n}? The core has ${L} items, then it repeats. Count by ${L}s up to the last full core before ${n}, then count on through the core for the leftover items.`,
    explain: `Every ${L}th item ends a core. ${Math.floor((n - 1) / L) * L} is the closest multiple of ${L} before ${n}, so item ${n} is item ${((n - 1) % L) + 1} of the core: ${ans}.`,
    ...mcP(rng, ans, opts.filter((x) => x !== ans), set.filter((x) => x !== ans), String),
  };
};

const patNthNumber = (rng, t) => {
  const step = pick(rng, t >= 7 ? [25, 50, 20, 30, 4, 3] : [5, 10, 25, 50, 100, 4, 3]);
  const start = step >= 10 ? randInt(rng, 1, 20) * 5 + (t >= 7 ? randInt(rng, 1, 4) : 0) : randInt(rng, 1, 30);
  const n = t >= 7 ? randInt(rng, 10, 15) : randInt(rng, 6, 10);
  const ans = start + (n - 1) * step;
  return {
    kind: 'num',
    prompt: `The pattern ${[0, 1, 2].map((i) => fmtNum(start + i * step)).join(', ')}, … keeps going. What is the ${ordinal3(n)} number?`,
    hint: `What is the ${ordinal3(n)} number? The pattern adds ${step} each time. Keep writing the numbers and counting them until you have ${n} numbers.`,
    explain: `${Array.from({ length: n }, (_, i) => fmtNum(start + i * step)).join(', ')}. The ${ordinal3(n)} number is ${fmtNum(ans)}.`,
    answer: num(ans),
  };
};
const ordinal3 = (n) => ordinal(n);

const patTablePreview = (rng, t) => {
  const per = randInt(rng, 2, 6), plus = randInt(rng, 0, 3);
  const rows = [1, 2, 3, 4].map((f) => [f, per * f + plus]);
  const target = randInt(rng, 6, 8);
  const ans = per * target + plus;
  const th = pick(rng, [['Dragons', 'Wings'], ['Tables', 'Chairs'], ['Figure', 'Squares'], ['Wands', 'Stars'], ['Owls', 'Feathers']]);
  return {
    kind: 'num',
    prompt: `Big challenge! The table grows the same way each time. What goes with ${target}?`,
    visual: { type: 'table', headers: th, rows: [...rows, [target, '?']] },
    hint: `What goes with ${target}? Find how much the right column grows each step, then keep the pattern going down the table until you reach ${target}.`,
    explain: `The right column goes up by ${per} each time: ${[1, 2, 3, 4, 5, 6, 7, 8].slice(0, target).map((f) => per * f + plus).join(', ')}. So ${target} goes with ${ans}.`,
    answer: num(ans),
  };
};

const g3Patterns = {
  id: 'g3-pat-patterns', grade: 3, strand: 'patterns', bigIdea: 'patterns', species: 'patternkin',
  name: 'Patterns to 1000',
  parentDesc: 'Extends repeating patterns (4 or more terms, 2 attributes) and increasing/decreasing number patterns to 1000; states pattern rules, finds errors and missing terms.',
  classic: false,
  gen: tiered([
    [1, 4, patRepeat, 2], [1, 2, patGrowing], [2, 5, patNumNext, 2], [3, 5, patMissingWrap, 1.5], [3, 5, patRule, 1.5],
    [4, 7, patError, 1.5], [5, 7, patNth, 1.5], [6, 7, patNthNumber, 1.5], [7, 7, patTablePreview, 0.6, PREVIEW],
  ]),
};

// ---------------------------------------------------------------------------
// SD9 Time: 12-hour clocks to the minute, a.m. and p.m., ISO dates
// ---------------------------------------------------------------------------
const hm = (h, m) => `${h % 12 === 0 ? 12 : h % 12}:${pad2(m)}`;
function clockMinute(rng, t) {
  if (t === 1) return pick(rng, [0, 30]);
  if (t === 2) return randInt(rng, 0, 11) * 5;
  return randInt(rng, 0, 59);
}
function clockWrongs(h, m) {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const w = [];
  if (m >= 5 && m % 5 === 0) w.push(`${m / 5}:${pad2(h12 * 5 % 60)}`); // hands swapped
  if (m >= 30) w.push(hm(h + 1, m));
  w.push(hm(h, (m + 5) % 60), hm(h, (m + 55) % 60));
  if (m % 5 === 0 && m > 0) w.push(`${h12}:${pad2(m / 5)}`); // read the number the minute hand points at
  else if (m % 5) w.push(hm(h, (m + 1) % 60), hm(h, (m + 59) % 60));
  w.push(hm(h - 1 + 12, m), hm(h + 1, m));
  if (m === 0) w.push(`${h12}:30`, `12:${pad2(h12 === 12 ? 0 : h12 * 5)}`);
  if (m === 30) w.push(`${h12}:00`, `6:${pad2(h12 * 5 % 60)}`);
  return w;
}

const tmRead = (rng, t) => {
  const h = randInt(rng, 1, 12), m = clockMinute(rng, t);
  return {
    prompt: pick(rng, ['What time does the clock show?', 'What time is it?', 'Read the clock. What time is it?']),
    visual: { type: 'clock', hour: h, minute: m },
    hint: t <= 1 ? 'Which choice matches the clock? The short hand shows the hour. The long hand shows the minutes: pointing up at 12 means o\'clock, pointing down at 6 means 30 minutes.' : t === 2 ? 'The short hand shows the hour: the number it is on or has just passed. The long hand shows the minutes: count by 5s for each number it has passed. Don\'t mix up the two hands!' : 'The short hand shows the hour it has passed. For the long hand, count by 5s to the last number it passed, then count on by 1s for each small mark after it.',
    explain: `The hour hand is ${m >= 30 ? `past the ${h % 12 === 0 ? 12 : h % 12}` : `at or just after the ${h % 12 === 0 ? 12 : h % 12}`} and the minute hand shows ${u(m, 'minute')}. The time is ${hm(h, m)}.`,
    ...mcP(rng, hm(h, m), clockWrongs(h, m), [], String),
  };
};

const tmMatch = (rng, t) => {
  const h = randInt(rng, 1, 12), m = clockMinute(rng, Math.min(t, 3));
  const C = (hh, mm) => ({ type: 'clock', hour: ((hh - 1 + 12) % 12) + 1, minute: ((mm % 60) + 60) % 60 });
  const wrongs = [C(Math.round(m / 5) || 12, (h % 12) * 5), C(h + 1, m), C(h, m + 5), C(h, 60 - m), C(h - 1, m), C(h, m + 30)];
  return {
    prompt: `Which clock shows ${hm(h, m)}?`,
    hint: `Which clock shows ${hm(h, m)}? Check the long (minute) hand first: it should show ${u(m, 'minute')}. Then check the short (hour) hand: it should be ${m >= 30 ? `past the ${h}, closer to the next number` : `on or just past the ${h}`}.`,
    explain: `At ${hm(h, m)}, the minute hand is at ${u(m, 'minute')} and the hour hand is ${m === 0 ? 'right on' : 'just past'} the ${h}.`,
    ...mcV(rng, C(h, m), shuffle(rng, wrongs)),
  };
};

const tmWords = (rng, t) => {
  const h = randInt(rng, 1, 12);
  const m = pick(rng, [15, 30, 45, 10, 20, 40, 50, 5, 55]);
  const next = h % 12 + 1;
  const good = m <= 30 ? `${m} minutes after ${h}` : `${60 - m} minutes before ${next}`;
  const wrongs = m <= 30
    ? [`${m} minutes before ${h}`, `${m} minutes after ${next}`, `${60 - m} minutes before ${h}`]
    : [`${60 - m} minutes after ${h}`, `${60 - m} minutes before ${h}`, `${m} minutes before ${next}`];
  return {
    prompt: `What is another way to say ${hm(h, m)}?`,
    visual: t <= 3 ? { type: 'clock', hour: h, minute: m } : undefined,
    hint: `"Minutes after" counts up from the hour that has passed. "Minutes before" counts how many minutes are left until the next hour. ${m <= 30 ? 'How many minutes past the hour is it?' : 'How many minutes until the next hour?'} Check the hour in each choice too.`,
    explain: m <= 30 ? `${hm(h, m)} is ${m} minutes after ${h}.` : `${hm(h, m)} is ${60 - m} minutes before ${next}, because ${m} + ${60 - m} = 60.`,
    ...mcP(rng, good, wrongs, [], String),
  };
};

const AMPM_CONTEXTS = [
  ['eats breakfast', 6, 8, 'a.m.'], ['wakes up for school', 6, 7, 'a.m.'], ['gets on the school bus', 7, 8, 'a.m.'],
  ['has morning recess', 10, 10, 'a.m.'], ['eats lunch', 12, 12, 'p.m.'], ['gets home from school', 15, 15, 'p.m.'],
  ['eats supper', 17, 18, 'p.m.'], ['goes to bed', 19, 20, 'p.m.'], ['has soccer practice after school', 16, 17, 'p.m.'],
  ['walks the dog before school', 7, 7, 'a.m.'], ['reads a bedtime story', 19, 20, 'p.m.'], ['watches the sunrise', 6, 6, 'a.m.'],
];
const tmAmPm = (rng, t) => {
  const [act, h0, h1, ap] = pick(rng, AMPM_CONTEXTS);
  const h = randInt(rng, h0, h1), m = randInt(rng, 0, 11) * 5 + (t >= 5 ? randInt(rng, 0, 4) : 0);
  const who = nm(rng);
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    return {
      prompt: `${who} ${act} at ${hm(h, m)}. Is that a.m. or p.m.?`,
      hint: `Is it a.m. or p.m.? a.m. means from midnight to noon: nighttime and morning. p.m. means from noon to midnight: afternoon and evening. When in the day does ${who} ${act}?`,
      explain: `${who} ${act} in the ${h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'}, so it is ${time12(h, m)}`,
      ...fixedChoices(['a.m.', 'p.m.'], ap),
    };
  }
  if (k === 1) {
    const good = time12(h, m);
    const swap = time12((h + 12) % 24, m);
    return {
      prompt: `${who} ${act}. Which time makes sense?`,
      visual: t >= 4 ? { type: 'clock', hour: h, minute: m } : undefined,
      hint: `Which time makes sense? a.m. times are from midnight to noon (night and morning); p.m. times are from noon to midnight (afternoon and evening). Think about when ${who} ${act}, then check the hour and the a.m. or p.m. in each choice.`,
      explain: `${cap(act)} happens in the ${h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'}, so ${good} makes sense.`,
      ...mcP(rng, good, [swap, time12((h + 6) % 24, m), time12((h + 18) % 24, m)], [], String),
    };
  }
  const am = chance(rng, 0.5);
  const good = am ? 'from midnight to noon' : 'from noon to midnight';
  return {
    prompt: `${am ? 'a.m.' : 'p.m.'} times are…`,
    hint: `a.m. and p.m. split the day into two halves at noon (12 o'clock in the middle of the day) and midnight (12 o'clock at night). Think of when school starts in the morning: is that a.m. or p.m.? Which half of the day do ${am ? 'a.m.' : 'p.m.'} times cover?`,
    explain: `a.m. times are from midnight to noon. p.m. times are from noon to midnight.`,
    ...mcP(rng, good, [am ? 'from noon to midnight' : 'from midnight to noon', 'only at night', 'only at lunch time'], [], String),
  };
};

function randDate(rng) {
  const y = randInt(rng, 2024, 2031), mo = randInt(rng, 1, 12), d = randInt(rng, 1, daysIn(mo, y));
  return [y, mo, d];
}
const iso = (y, m, d) => `${y}/${pad2(m)}/${pad2(d)}`;
const longDate = (y, m, d) => `${MONTHS[m - 1]} ${d}, ${y}`;

const tmIso = (rng, t) => {
  if (t >= 6 && chance(rng, 0.45)) {
    const [y0, m0, d0] = randDate(rng);
    const add = pick(rng, [7, 7, 10, 14]);
    const dt = new Date(Date.UTC(y0, m0 - 1, d0 + add));
    const [y2, m2, d2] = [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()];
    const good = iso(y2, m2, d2);
    const naive = d0 + add <= 31 ? `${y0}/${pad2(m0)}/${pad2(d0 + add)}` : iso(y2, m2, (d2 % 28) + 1);
    return {
      prompt: `What is the date ${add === 7 ? '1 week' : add === 14 ? '2 weeks' : `${add} days`} after ${iso(y0, m0, d0)}? (yyyy/mm/dd)`,
      speak: `What is the date ${add === 7 ? 'one week' : add === 14 ? 'two weeks' : `${add} days`} after ${longDate(y0, m0, d0)}? Write it year, month, day.`,
      visual: { type: 'calendar', month: m0, year: y0, highlight: [d0] },
      hint: `Count ${add} days forward from the highlighted day. ${MONTHS[m0 - 1]} has ${daysIn(m0, y0)} days, so if you go past the ${ordinal(daysIn(m0, y0))}, you move into the next month (and maybe the next year). Then write year, month, day.`,
      explain: `${add} days after ${longDate(y0, m0, d0)} is ${longDate(y2, m2, d2)}, written ${good}.`,
      ...mcP(rng, good, [naive, iso(y2, m2, d2 + 1 <= daysIn(m2, y2) ? d2 + 1 : d2 - 1), `${pad2(d2)}/${pad2(m2)}/${y2}`, iso(y2, m2 === m0 ? (m2 % 12) + 1 : m0, d2)].filter((x) => x !== good), [], String),
    };
  }
  let [y, mo, d] = randDate(rng);
  if (chance(rng, 0.5) && d > 12) d = randInt(rng, 1, 12); // make month/day swaps tempting
  if (d === mo) d = (d % 12) + 1;
  const k = randInt(rng, 0, 2);
  const wrongIso = [`${y}/${pad2(d)}/${pad2(mo)}`, `${pad2(d)}/${pad2(mo)}/${y}`, `${pad2(mo)}/${pad2(d)}/${y}`, iso(y, mo % 12 + 1, d)];
  if (k === 0) {
    return {
      prompt: `How do you write ${longDate(y, mo, d)} as yyyy/mm/dd?`,
      hint: `yyyy/mm/dd means the 4-digit year first, then the month as a 2-digit number, then the day as 2 digits. What number month is ${MONTHS[mo - 1]}? Count from January = 01.`,
      explain: `${MONTHS[mo - 1]} is month ${mo}. So ${longDate(y, mo, d)} is ${iso(y, mo, d)}.`,
      ...mcP(rng, iso(y, mo, d), wrongIso, [], String),
    };
  }
  if (k === 1) {
    const wrongs = [d <= 12 ? longDate(y, d, mo) : null, longDate(y, mo % 12 + 1, d), longDate(y, (mo + 10) % 12 + 1, d), longDate(y, mo, (d % 28) + 1)];
    return {
      prompt: `What date is ${iso(y, mo, d)}?`,
      speak: `What date is ${y}, ${pad2(mo)}, ${pad2(d)}? It is written year, month, day.`,
      hint: `In yyyy/mm/dd, the first part is the year, the middle part is the month number and the last part is the day. Which month is number ${pad2(mo)}? Count from January = 01.`,
      explain: `${y} is the year, ${pad2(mo)} is the month (${MONTHS[mo - 1]}) and ${pad2(d)} is the day. So it is ${longDate(y, mo, d)}.`,
      ...mcP(rng, longDate(y, mo, d), wrongs, [], String),
    };
  }
  return {
    prompt: 'Write the highlighted date as yyyy/mm/dd.',
    visual: { type: 'calendar', month: mo, year: y, highlight: [d] },
    hint: 'Read the month and year at the top of the calendar, then find the highlighted day. Write the year first, then the month as a 2-digit number, then the day as 2 digits. January is 01, February is 02, and so on.',
    explain: `The calendar shows ${MONTHS[mo - 1]} ${y}, and day ${d} is highlighted. ${MONTHS[mo - 1]} is month ${mo}, so the date is ${iso(y, mo, d)}.`,
    ...mcP(rng, iso(y, mo, d), wrongIso, [], String),
  };
};

const tmClockAmPm = (rng, t) => {
  const [act, h0, h1] = pick(rng, AMPM_CONTEXTS);
  const h = randInt(rng, h0, h1), m = randInt(rng, 1, 59);
  const who = nm(rng);
  const good = time12(h, m);
  const wrongs = [time12((h + 12) % 24, m), time12(h + (m >= 30 ? 1 : -1), m), time12(h, (m + 5) % 60)];
  if (m % 5 === 0 && m > 0) wrongs.push(`${m / 5}:${pad2((h % 12 || 12) * 5 % 60)} ${h < 12 ? 'a.m.' : 'p.m.'}`);
  return {
    prompt: `The clock shows when ${who} ${act}. What time is it?`,
    visual: { type: 'clock', hour: h, minute: m },
    hint: `What time is it, and is it a.m. or p.m.? First read the clock: short hand for the hour, long hand for the minutes. Then think about when ${who} ${act}: morning is a.m.; afternoon and evening are p.m.`,
    explain: `The clock reads ${hm(h, m)}. ${who} ${act} in the ${h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'}, so it is ${good}`,
    ...mcP(rng, good, wrongs, [], String),
  };
};

const tm24Preview = (rng, t) => {
  const h = randInt(rng, 13, 23), m = randInt(rng, 0, 59);
  const good = `${h}:${pad2(m)}`;
  return {
    prompt: `Big challenge! In 24-hour time, p.m. hours keep counting past 12. What is ${time12(h, m)} in 24-hour time?`,
    visual: { type: 'clock', hour: h, minute: m, digital: true, h24: false },
    hint: `In 24-hour time the hours keep counting after noon: 1 p.m. is 13, 2 p.m. is 14, and so on. So add 12 to the p.m. hour, ${h - 12}. The minutes stay the same.`,
    explain: `${h - 12} + 12 = ${h}, so ${time12(h, m)} is ${good}.`,
    ...mcP(rng, good, [`${pad2(h - 12)}:${pad2(m)}`, `${h - 1}:${pad2(m)}`, `${h + 1 <= 23 ? h + 1 : h - 2}:${pad2(m)}`, `${h - 12 + 10}:${pad2(m)}`], [], String),
  };
};

const g3Time = {
  id: 'g3-meas-time', grade: 3, strand: 'shape', bigIdea: 'measurement', species: 'clockwork',
  name: 'Clocks & Dates',
  parentDesc: 'Reads and writes 12-hour time on analog and digital clocks to the minute, uses a.m. and p.m., and writes dates as yyyy/mm/dd.',
  classic: false,
  gen: tiered([
    [1, 5, tmRead, 3], [1, 5, tmMatch, 2], [6, 7, tmRead, 0.8], [3, 4, tmWords], [3, 6, tmAmPm, 1.5], [4, 7, tmIso, 1.5], [6, 7, tmClockAmPm, 2], [7, 7, tm24Preview, 0.6, PREVIEW], [6, 7, tmMatch, 0.8],
  ]),
};

// ---------------------------------------------------------------------------
// SD10 Measurement: m, dm, cm; g, kg
// ---------------------------------------------------------------------------
const RULER_OBJ = ['pencil', 'crayon', 'key', 'leaf', 'worm', 'paperclip'];
const LEN_ITEMS = [
  // [name, unit best, estimate text, estimate value]
  ['a paper clip', 'cm', 3], ['a crayon', 'cm', 9], ['a new pencil', 'cm', 18], ['an eraser', 'cm', 5], ['a spoon', 'cm', 15],
  ['a banana', 'cm', 20], ['your thumb', 'cm', 5], ['a marker', 'cm', 14], ['a toothbrush', 'cm', 19], ['a playing card', 'cm', 9],
  ['a door (height)', 'm', 2], ['a classroom (length)', 'm', 10], ['a school bus', 'm', 12], ['a guitar', 'm', 1], ['a bed', 'm', 2],
  ['a hockey rink', 'm', 60], ['a swimming pool', 'm', 25], ['a hallway', 'm', 30], ['a canoe', 'm', 5], ['a flagpole', 'm', 8],
];
const MASS_ITEMS = [
  ['a paper clip', 'g', 1], ['a grape', 'g', 5], ['an apple', 'g', 150], ['a pencil', 'g', 5], ['a loonie', 'g', 7], ['a slice of bread', 'g', 30],
  ['a banana', 'g', 120], ['an egg', 'g', 60], ['a bag of flour', 'kg', 2], ['a watermelon', 'kg', 5], ['a big dog', 'kg', 30],
  ['a school backpack', 'kg', 4], ['a bike', 'kg', 12], ['a pumpkin', 'kg', 6], ['a bag of potatoes', 'kg', 5], ['a baby', 'kg', 4],
];

// Realistic lengths (cm) for each ruler object, so a paper clip is never 15 cm long.
const RULER_LEN = { pencil: [8, 15], crayon: [5, 10], key: [4, 8], leaf: [4, 12], worm: [3, 15], paperclip: [3, 5] };
const msRuler = (rng, t) => {
  const obj = pick(rng, RULER_OBJ);
  const [lo, hi] = RULER_LEN[obj];
  const len = randInt(rng, lo, t === 1 ? Math.min(hi, 12) : hi);
  let start = t === 1 ? 0 : randInt(rng, 1, 5);
  if (start === len) start = start === 1 ? 2 : start - 1;
  const q = {
    prompt: `How long is the ${obj === 'paperclip' ? 'paper clip' : obj}?`,
    visual: { type: 'ruler', length: Math.max(15, start + len + 1), object: obj, objectLength: len, start, unit: 'cm' },
    hint: start ? `How long is it? It starts at the ${start} cm mark, not at 0. Find the mark where it ends, then take away ${start} (or count the centimetre spaces between the two ends).` : 'How long is it? Its left end lines up with 0. Read the number on the ruler right at its other end.',
    explain: start ? `It starts at ${start} cm and ends at ${start + len} cm. ${start + len} − ${start} = ${len} cm.` : `It starts at 0 and ends at ${len}, so it is ${len} cm long.`,
  };
  return { ...q, ...mcP(rng, len, [start + len, len + 1, len - 1, start ? len + start + 1 : len + 2], [], (x) => `${x} cm`) };
};

const msUnit = (rng, t) => {
  const mass = chance(rng, 0.45);
  const it = pick(rng, mass ? MASS_ITEMS : LEN_ITEMS);
  const name = it[0].replace(/ \(.*\)/, '');
  const what = it[0].includes('(height)') ? 'height' : 'length';
  const prompt = mass ? `Which unit would you use for the mass of ${name}?` : `Which unit would you use for the ${what} of ${name}?`;
  const all = ['cm', 'm', 'g', 'kg'];
  return {
    prompt,
    hint: mass ? `Which unit fits ${name}? g (grams) is for light things, like a paper clip. kg (kilograms) is for heavy things, like a bag of potatoes. cm and m measure length, not mass. Is ${name} light or heavy?` : `Which unit fits ${name}? cm (centimetres) is for small things, like a pencil. m (metres) is for big things, like a door or a hallway. g and kg measure mass, not length. Is ${name} small or big?`,
    explain: `${cap(name)} is ${mass ? `about ${it[2]} ${it[1]}` : `about ${it[2]} ${it[1]} ${what === 'height' ? 'tall' : 'long'}`}, so ${it[1] === 'cm' ? 'centimetres' : it[1] === 'm' ? 'metres' : it[1] === 'g' ? 'grams' : 'kilograms'} are the best unit.`,
    ...mcP(rng, it[1], all.filter((u) => u !== it[1]), [], String),
  };
};

const msReferent = (rng, t) => {
  const mass = chance(rng, 0.45);
  const it = pick(rng, mass ? MASS_ITEMS : LEN_ITEMS);
  const name = it[0].replace(/ \(.*\)/, '');
  const [v, u] = [it[2], it[1]];
  const other = { cm: 'm', m: 'cm', g: 'kg', kg: 'g' }[u];
  const fmt = (x) => `about ${x}`;
  const good = `${v} ${u}`;
  const wrongs = [`${v} ${other}`, `${v * 10} ${u}`, `${Math.max(1, Math.round(v / 10))} ${other}`, `${v * 100} ${u}`].filter((x) => x !== good);
  return {
    prompt: mass ? `What is the best estimate for the mass of ${name}?` : `What is the best estimate for the ${it[0].includes('(height)') ? 'height' : 'length'} of ${name}?`,
    hint: mass ? `Think about holding ${name}. A gram (g) is tiny: a paper clip is about one gram. A kilogram (kg) is heavy: a big carton of milk is about one kilogram. Check each choice: does that many paper clips or milk cartons sound right?` : `Think about how big ${name} is. A centimetre (cm) is about the width of your finger. A metre (m) is about one big step. Check each choice: does that many fingers or big steps sound right?`,
    explain: `${cap(name)} is ${fmt(good)}.`,
    ...mcP(rng, good, wrongs, [], fmt),
  };
};

const msConvert = (rng, t) => {
  const k = randInt(rng, 0, t >= 5 ? 4 : 2);
  if (k === 0) {
    const n = randInt(rng, 2, 9);
    return { kind: 'num', prompt: `${n} dm = □ cm`, speak: `${n} decimetres equals how many centimetres?`, hint: `How many centimetres are in ${n} dm? Each decimetre is 10 cm, so count by 10s, ${n} times.`, explain: `${n} × 10 = ${n * 10}, so ${n} dm = ${n * 10} cm.`, answer: num(n * 10) };
  }
  if (k === 1) {
    const n = randInt(rng, 2, 9);
    const dm = chance(rng, 0.4);
    return { kind: 'num', prompt: `${n} m = □ ${dm ? 'dm' : 'cm'}`, speak: `${n} metres equals how many ${dm ? 'decimetres' : 'centimetres'}?`, hint: dm ? `Each metre is 10 dm. Count by 10s, ${n} times.` : `Each metre is 100 cm. Count by 100s, ${n} times.`, explain: dm ? `${n} m = ${n * 10} dm.` : `Each metre is 100 cm, so ${n} m = ${n * 100} cm.`, answer: num(dm ? n * 10 : n * 100) };
  }
  if (k === 2) {
    // Grade 3 numbers stay within 1000, so use 1 kg = 1000 g (no 2 kg = 2000 g).
    if (chance(rng, 0.25)) return { kind: 'num', prompt: '1 kg = □ g', speak: 'One kilogram equals how many grams?', hint: 'How many grams make one kilogram? A kilogram is a lot of grams: think of one thousand paper clips.', explain: '1 kg = 1000 g.', answer: num(1000) };
    const have = randInt(rng, 1, 19) * 50;
    return { kind: 'num', prompt: `${fmtNum(have)} g + □ g = 1 kg`, speak: `${have} grams plus how many grams equals one kilogram?`, hint: `How many more grams make 1 kg? 1 kg is 1000 g. Count up from ${fmtNum(have)} to 1000.`, explain: `1 kg = 1000 g. 1000 − ${fmtNum(have)} = ${fmtNum(1000 - have)}, so □ = ${fmtNum(1000 - have)} g.`, answer: num(1000 - have) };
  }
  if (k === 3) {
    const m = randInt(rng, 1, 3), c = randInt(rng, 5, 95);
    return { kind: 'num', prompt: `${m} m ${c} cm = □ cm`, speak: `${m} metres ${c} centimetres equals how many centimetres?`, hint: `How many centimetres in all? First change the ${m} m into centimetres (each metre is one hundred centimetres). Then add the ${c} cm.`, explain: `${m} m = ${m * 100} cm. ${m * 100} + ${c} = ${m * 100 + c} cm.`, answer: num(m * 100 + c) };
  }
  const m = randInt(rng, 1, 4), c = randInt(rng, 1, 9) * 10 + (chance(rng, 0.5) ? 0 : randInt(rng, 1, 9));
  const total = m * 100 + c;
  return {
    prompt: `${total} cm is the same as…`,
    speak: `${total} centimetres is the same as…`,
    hint: `How many whole metres are in ${total} cm? Every 100 cm makes 1 m. Take out as many hundreds as you can; what is left over stays as centimetres.`,
    explain: `${total} cm = ${m * 100} cm + ${c} cm = ${m} m ${c} cm.`,
    ...mcP(rng, `${m} m ${c} cm`, [`${total} m`, `${Math.floor(total / 10)} m ${total % 10} cm`, `${m} m ${Math.floor(c / 10)} cm`, `${m + 1} m ${c} cm`], [], String),
  };
};

const msCompare = (rng, t) => {
  const mass = chance(rng, 0.4);
  if (mass) {
    const kg = 1; // keep gram amounts near 1000 (Grade 3 numbers to 1000)
    const g = kg * 1000 + pick(rng, [-1, 1]) * randInt(rng, 1, 4) * 100 + pick(rng, [0, 0, 50]);
    const heavier = g > kg * 1000 ? `${fmtNum(g)} g` : `${kg} kg`;
    const [a, b] = nm2(rng);
    return {
      prompt: `${a}'s bag has a mass of ${kg} kg. ${b}'s bag has a mass of ${fmtNum(g)} g. Whose bag is heavier?`,
      hint: `Whose bag is heavier? The bags use different units, so change ${kg} kg into grams first (each kilogram is 1000 g). Then compare the two numbers of grams.`,
      explain: `${kg} kg = ${fmtNum(kg * 1000)} g. ${fmtNum(g)} g is ${g > kg * 1000 ? 'more' : 'less'} than ${fmtNum(kg * 1000)} g, so ${g > kg * 1000 ? b : a}'s bag is heavier.`,
      ...fixedChoices([a, b], g > kg * 1000 ? b : a),
    };
  }
  const m = randInt(rng, 1, 4);
  const pairs = [[`${m} m`, m * 100], [`${m * 100 + pick(rng, [-1, 1]) * randInt(rng, 1, 9) * 10} cm`, null], [`${m * 10 + pick(rng, [-3, -2, 2, 3])} dm`, null]];
  const items = pairs.map(([label, v]) => [label, v ?? (label.endsWith('dm') ? Number(label.split(' ')[0]) * 10 : Number(label.split(' ')[0]))]);
  const longest = chance(rng, 0.5);
  const target = items.reduce((b, x) => ((longest ? x[1] > b[1] : x[1] < b[1]) ? x : b));
  return {
    prompt: `Which is ${longest ? 'longest' : 'shortest'}: ${shuffle(rng, items).map((x) => x[0]).join(', ')}?`,
    hint: `Which is ${longest ? 'longest' : 'shortest'}? The lengths use different units, so change each one to centimetres: 1 m = 100 cm and 1 dm = 10 cm. Then compare the numbers.`,
    explain: `In centimetres: ${items.map((x) => `${x[0]} = ${x[1]} cm`).join(', ')}. So ${target[0]} is ${longest ? 'longest' : 'shortest'}.`,
    ...mcP(rng, target[0], items.filter((x) => x !== target).map((x) => x[0]), [], String),
  };
};

const msScale = (rng, t) => {
  const kg = chance(rng, 0.4);
  const max = kg ? 10 : 1000;
  const v = kg ? randInt(rng, 1, 9) : randInt(rng, 1, 9) * 100;
  const unit = kg ? 'kg' : 'g';
  const fruit = pick(rng, ['apples', 'potatoes', 'carrots', 'flour', 'blueberries', 'dragon treats', 'magic beans']);
  return {
    prompt: `What is the mass of the ${fruit}?`,
    visual: { type: 'scale', value: v, unit, max },
    hint: `How heavy are the ${fruit}? Find the number the pointer is on. Then check the unit written on the scale: g or kg.`,
    explain: `The pointer is at ${fmtNum(v)}, so the mass is ${fmtNum(v)} ${unit}.`,
    ...mcP(rng, v, kg ? [v + 1, v - 1, v * 100] : [v + 100, v - 100, v / 100, v + 50], [], (x) => (kg && x >= 100 ? `${x} g` : !kg && x < 10 ? `${x} kg` : `${fmtNum(x)} ${unit}`)),
  };
};

const msWord = (rng, t) => {
  const who = nm(rng);
  const k = randInt(rng, 0, 3);
  if (k === 0) {
    const L = randInt(rng, 50, 99), cut = randInt(rng, 12, L - 10);
    const thing = pick(rng, ['ribbon', 'piece of string', 'strip of paper', 'rope']);
    return { kind: 'num', prompt: `A ${thing} is ${L} cm long. ${who} cuts off ${cut} cm. How long is it now, in cm?`, visual: t <= 4 ? { type: 'barmodel', whole: L, parts: [cut, '?'], labels: ['cm'] } : undefined, hint: `How long is the ${thing} now? You know the whole length, ${L} cm, and the part cut off, ${cut} cm. Take the part away from the whole.`, explain: `${L} − ${cut} = ${L - cut} cm.`, answer: num(L - cut) };
  }
  if (k === 1) {
    const c = randInt(rng, 25, 85);
    return { kind: 'num', prompt: `One board is 1 m long. Another is ${c} cm long. How many cm longer is the 1 m board?`, hint: `How much longer is 1 m than ${c} cm? First change 1 m into centimetres (1 m = 100 cm). Then count up from ${c} to 100.`, explain: `1 m = 100 cm. 100 − ${c} = ${100 - c} cm longer.`, answer: num(100 - c) };
  }
  if (k === 2) {
    const a = randInt(rng, 150, 600), b = randInt(rng, 120, 900 - a);
    const [x, y] = sample(rng, ['apples', 'pears', 'grapes', 'cherries', 'carrots', 'beans'], 2);
    return { kind: 'num', prompt: `A bag of ${x} has a mass of ${a} g. A bag of ${y} has a mass of ${b} g. What is their total mass, in grams?`, hint: `What is the total mass? Put the two bags together: add ${a} g and ${b} g. Add the hundreds, then the tens, then the ones.`, explain: `${a} + ${b} = ${a + b} g.`, answer: num(a + b) };
  }
  const a = randInt(rng, 2, 9), b = randInt(rng, 1, a - 1);
  const [p, q] = nm2(rng);
  return { kind: 'num', prompt: `${p}'s pumpkin has a mass of ${a} kg. ${q}'s pumpkin has a mass of ${b} kg. How many kilograms heavier is ${p}'s pumpkin?`, hint: `How much heavier is ${p}'s pumpkin? Find the difference between ${a} kg and ${b} kg: take the smaller away from the bigger.`, explain: `${a} − ${b} = ${a - b} kg.`, answer: num(a - b) };
};

const msTwoStep = (rng, t) => {
  const who = nm(rng);
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const m = randInt(rng, 2, 3), a = randInt(rng, 20, 80), b = randInt(rng, 20, m * 100 - a - 10);
    return { kind: 'num', prompt: `${who} has ${m} m of string. ${who} uses ${a} cm, then ${b} cm. How many cm are left?`, hint: `How much string is left? First change ${m} m into centimetres (each metre is one hundred centimetres). Then add up what was used, ${a} + ${b}, and take it away.`, explain: `${m} m = ${m * 100} cm. ${a} + ${b} = ${a + b} cm used. ${m * 100} − ${a + b} = ${m * 100 - a - b} cm left.`, answer: num(m * 100 - a - b) };
  }
  if (k === 1) {
    const a = randInt(rng, 3, 7) * 100 + randInt(rng, 0, 9) * 10, b = randInt(rng, 2, 6) * 100 + randInt(rng, 0, 9) * 10;
    const total = a + b;
    const more = total > 1000;
    return {
      prompt: `A bag holds ${a} g of oats and ${b} g of raisins. Is the total more or less than 1 kg?`,
      hint: `Is it more or less than 1 kg? First add ${a} g + ${b} g. Then compare the total with 1000 g, which is exactly 1 kg.`,
      explain: `${a} + ${b} = ${fmtNum(total)} g. That is ${total === 1000 ? 'exactly' : more ? 'more than' : 'less than'} 1000 g (1 kg).`,
      ...fixedChoices(['More than 1 kg', 'Exactly 1 kg', 'Less than 1 kg'], total === 1000 ? 'Exactly 1 kg' : more ? 'More than 1 kg' : 'Less than 1 kg'),
    };
  }
  const m = randInt(rng, 1, 3), c = randInt(rng, 1, 9) * 10 + randInt(rng, 1, 9);
  const other = m * 100 + c + pick(rng, [-1, 1]) * randInt(rng, 3, 30);
  const longer = other > m * 100 + c ? `${other} cm` : `${m} m ${c} cm`;
  return {
    prompt: `Which is longer: ${m} m ${c} cm or ${other} cm?`,
    hint: `Which is longer? Change ${m} m ${c} cm into centimetres (each metre is one hundred centimetres, then add the ${c}). Then compare with ${other} cm.`,
    explain: `${m} m ${c} cm = ${m * 100 + c} cm. Compare with ${other} cm: ${longer} is longer.`,
    ...fixedChoices([`${m} m ${c} cm`, `${other} cm`], longer),
  };
};

const g3Measure = {
  id: 'g3-meas-measure', grade: 3, strand: 'shape', bigIdea: 'measurement', species: 'measurer',
  name: 'Length & Mass',
  parentDesc: 'Uses metres, decimetres and centimetres, and grams and kilograms: referents, estimating, choosing units, comparing, measuring with a ruler and a scale, and solving problems.',
  classic: false,
  gen: tiered([
    [1, 3, msRuler, 2], [1, 4, msUnit, 1.5], [2, 5, msReferent, 1.5], [3, 7, msConvert, 1.5], [3, 5, msCompare], [3, 5, msScale],
    [4, 6, msWord, 2], [6, 7, msTwoStep, 2.5], [6, 7, msCompare, 0.8],
  ]),
};

// ---------------------------------------------------------------------------
// SD11 Polygons and polyhedrons
// ---------------------------------------------------------------------------
const POLY = {
  triangle: 3, right_triangle: 3, equilateral_triangle: 3, isosceles_triangle: 3, scalene_triangle: 3,
  square: 4, rectangle: 4, rhombus: 4, trapezoid: 4, parallelogram: 4, kite: 4,
  pentagon: 5, irregular_pentagon: 5, hexagon: 6, irregular_hexagon: 6, octagon: 8,
};
const NONPOLY = ['circle', 'oval', 'semicircle', 'heart'];
const REGULAR = ['square', 'equilateral_triangle', 'pentagon', 'hexagon', 'octagon'];
const IRREG = ['rectangle', 'irregular_pentagon', 'irregular_hexagon', 'scalene_triangle', 'right_triangle', 'kite', 'trapezoid', 'parallelogram', 'isosceles_triangle'];
const PNAME = { 3: 'triangle', 4: 'quadrilateral', 5: 'pentagon', 6: 'hexagon', 8: 'octagon' };
const shp = (rng, shape, extra = {}) => ({ type: 'shapes', items: [{ shape, color: pick(rng, COLOURS), rotate: pick(rng, [0, 0, 15, 30, 45, 90, 180, 200, 270]), ...extra }] });
const shp1 = (rng, shape) => ({ type: 'shapes', items: [{ shape, color: pick(rng, COLOURS) }] });

const geoSides = (rng, t) => {
  const pool = Object.keys(POLY).filter((s) => t >= 3 || !s.startsWith('irregular'));
  const s = pick(rng, pool);
  const n = POLY[s];
  const vert = chance(rng, 0.4);
  return {
    prompt: vert ? 'How many vertices (corners) does this shape have?' : 'How many sides does this shape have?',
    visual: shp(rng, s),
    hint: vert ? 'How many vertices (corners)? A vertex is a point where two sides meet. Put your finger on one corner and count each corner once as you go around.' : 'How many sides? A side is one straight edge. Mark the side you start on, then count around the shape until you are back at the start.',
    explain: `This shape has ${n} sides and ${n} vertices. It is a${n === 8 ? 'n' : ''} ${PNAME[n]}.`,
    ...mcN(rng, n, [n + 1, n - 1, n + 2, n === 4 ? 5 : 4]),
  };
};

const geoName = (rng, t) => {
  const pool = Object.keys(POLY).filter((s) => t >= 3 || !s.startsWith('irregular'));
  const s = pick(rng, pool);
  const n = POLY[s];
  const opts = Object.values(PNAME).filter((x) => x !== PNAME[n]);
  if (chance(rng, 0.5)) {
    return {
      prompt: 'What kind of polygon is this?',
      visual: shp(rng, s),
      hint: 'What is this polygon called? Count its sides. A triangle has 3, a quadrilateral has 4, a pentagon has 5, a hexagon has 6 and an octagon has 8.',
      explain: `It has ${n} sides, so it is a${n === 8 ? 'n' : ''} ${PNAME[n]}.`,
      ...mcP(rng, PNAME[n], opts, [], cap),
    };
  }
  const target = pick(rng, [3, 4, 5, 6, 8]);
  const good = pick(rng, Object.keys(POLY).filter((k) => POLY[k] === target && (t >= 3 || !k.startsWith('irregular'))));
  const wrongs = shuffle(rng, Object.keys(POLY).filter((k) => POLY[k] !== target)).slice(0, 6).map((k) => shp(rng, k));
  return {
    prompt: `Which shape is a${target === 8 ? 'n' : ''} ${PNAME[target]}?`,
    hint: `Which shape is ${an(PNAME[target])}? ${cap(an(PNAME[target]))} has ${target} straight sides. Count the sides of each shape.`,
    explain: `A${target === 8 ? 'n' : ''} ${PNAME[target]} has ${target} straight sides and ${target} vertices.`,
    ...mcV(rng, shp(rng, good), wrongs),
  };
};

const geoPolygon = (rng, t) => {
  const findNon = chance(rng, 0.5);
  if (findNon) {
    const non = pick(rng, NONPOLY);
    const polys = sample(rng, Object.keys(POLY), 3);
    return {
      prompt: 'Which shape is NOT a polygon?',
      hint: 'Which shape is NOT a polygon? A polygon is a closed shape made only of straight sides. Check each shape: does any part of it curve?',
      explain: `A ${non} has a curved side, so it is not a polygon. The others are closed and have only straight sides.`,
      ...mcV(rng, shp1(rng, non), polys.map((p) => shp(rng, p))),
    };
  }
  const poly = pick(rng, Object.keys(POLY));
  return {
    prompt: 'Which shape is a polygon?',
    hint: 'Which shape is a polygon? A polygon is closed and has only straight sides, no curves. Check each shape for curved edges.',
    explain: `The polygon has only straight sides (${POLY[poly]} of them). The other shapes have curves.`,
    ...mcV(rng, shp(rng, poly), sample(rng, NONPOLY, 3).map((n) => shp1(rng, n))),
  };
};

const geoRegular = (rng, t) => {
  if (chance(rng, 0.5)) {
    const g = pick(rng, REGULAR);
    return {
      prompt: 'Which shape is a regular polygon?',
      hint: 'Which shape is regular? A regular polygon has ALL sides the same length and ALL angles the same size. Check each shape: is any side longer or shorter than the others?',
      explain: `The regular polygon has all equal sides and all equal angles.`,
      ...mcV(rng, shp(rng, g), sample(rng, IRREG, 3).map((s) => shp(rng, s))),
    };
  }
  const isReg = chance(rng, 0.5);
  const s = pick(rng, isReg ? REGULAR : IRREG);
  return {
    prompt: 'Is this polygon regular or irregular?',
    visual: shp(rng, s),
    hint: 'Regular means every side is the same length and every angle is the same size. Irregular means at least one side or angle is different. Look closely at this shape\'s sides and corners.',
    explain: isReg ? 'All its sides are equal and all its angles are equal, so it is regular.' : 'Its sides (or angles) are not all equal, so it is irregular.',
    ...fixedChoices(['Regular', 'Irregular'], isReg ? 'Regular' : 'Irregular'),
  };
};

const RIGHT_ANG = { square: 4, rectangle: 4, right_triangle: 1, equilateral_triangle: 0, pentagon: 0, hexagon: 0, octagon: 0 };
const ANG_CMP = { equilateral_triangle: 'smaller than', square: 'the same as', pentagon: 'bigger than', hexagon: 'bigger than', octagon: 'bigger than' };
const geoAngles = (rng, t) => {
  if (chance(rng, 0.5)) {
    const s = pick(rng, Object.keys(RIGHT_ANG));
    const n = RIGHT_ANG[s];
    return {
      prompt: 'How many right angles does this shape have?',
      visual: shp1(rng, s),
      hint: 'How many right angles? A right angle is a square corner, like the corner of a page. Hold a page corner up to each corner of the shape and count the ones that fit exactly.',
      explain: `This shape has ${n} right angle${n === 1 ? '' : 's'}.${n === 0 ? ' Its angles are not square corners.' : ''}`,
      ...mcN(rng, n, [n + 1, n - 1, n + 2, 4, 2].filter((x) => x >= 0 && x <= 5)),
    };
  }
  const s = pick(rng, Object.keys(ANG_CMP));
  const c = ANG_CMP[s];
  return {
    prompt: `Compare each angle of this regular shape to a right angle. The angles are…`,
    visual: shp1(rng, s),
    hint: '"Smaller than a right angle" means the corner is sharper and narrower than the corner of a page. "The same" means it fits a page corner exactly. "Bigger" means it is wider and more open. Picture a page corner in one of the shape\'s corners.',
    explain: `Each angle of this shape is ${c} a right angle.`,
    ...fixedChoices(['smaller than a right angle', 'the same as a right angle', 'bigger than a right angle'], `${c} a right angle`),
  };
};

const SOLIDS = {
  cube: { name: 'cube', f: 6, e: 12, v: 8, faces: '6 squares', kind: 'prism' },
  rect_prism: { name: 'rectangular prism', f: 6, e: 12, v: 8, faces: '6 rectangles', kind: 'prism' },
  tri_prism: { name: 'triangular prism', f: 5, e: 9, v: 6, faces: '2 triangles and 3 rectangles', kind: 'prism' },
  hex_prism: { name: 'hexagonal prism', f: 8, e: 18, v: 12, faces: '2 hexagons and 6 rectangles', kind: 'prism' },
  square_pyramid: { name: 'square pyramid', f: 5, e: 8, v: 5, faces: '1 square and 4 triangles', kind: 'pyramid' },
  tri_pyramid: { name: 'triangular pyramid', f: 4, e: 6, v: 4, faces: '4 triangles', kind: 'pyramid' },
};
const sol = (rng, s) => ({ type: 'solids', items: [{ solid: s, color: pick(rng, COLOURS) }] });
const geoSolids = (rng, t) => {
  const keys = Object.keys(SOLIDS);
  const s = pick(rng, keys);
  const S = SOLIDS[s];
  const k = randInt(rng, 0, 3);
  if (k === 0) {
    return {
      prompt: 'What is this solid called?',
      visual: sol(rng, s),
      hint: 'What is this solid? A prism has two matching ends joined by rectangles; a pyramid has one base and triangles that meet at a point. Then name it by the shape of its base (a cube has only square faces).',
      explain: `This is a ${S.name}. Its faces are ${S.faces}.`,
      ...mcP(rng, S.name, keys.filter((x) => x !== s).map((x) => SOLIDS[x].name), [], cap),
    };
  }
  if (k === 1) {
    const what = pick(rng, ['faces', 'edges', 'vertices']);
    const n = S[what[0]];
    return {
      prompt: `How many ${what} does a ${S.name} have?`,
      visual: sol(rng, s),
      hint: what === 'faces' ? `How many faces does a ${S.name} have? Faces are the flat surfaces. Count the ends (or base) and the sides, and remember the ones hidden at the back and bottom.` : what === 'edges' ? `How many edges does a ${S.name} have? An edge is a line where two faces meet. Count around the base, then the others, including the hidden ones.` : `How many vertices does a ${S.name} have? A vertex is a corner where edges meet. Count the corners on the base (or both ends), then any point on top.`,
      explain: `A ${S.name} has ${S.f} faces, ${S.e} edges and ${S.v} vertices.`,
      ...mcN(rng, n, [S.f, S.e, S.v, n + 1, n - 1, n + 2].filter((x) => x !== n)),
    };
  }
  if (k === 2) {
    const kind = pick(rng, ['prism', 'pyramid']);
    const good = pick(rng, keys.filter((x) => SOLIDS[x].kind === kind));
    const wrongs = keys.filter((x) => SOLIDS[x].kind !== kind).map((x) => sol(rng, x));
    wrongs.push({ type: 'solids', items: [{ solid: pick(rng, ['sphere', 'cone', 'cylinder']), color: pick(rng, COLOURS) }] });
    return {
      prompt: `Which solid is a ${kind}?`,
      hint: `Which solid is a ${kind}? A prism has two matching ends joined by rectangle faces. A pyramid has one base and triangle faces that meet at a point. Cones, spheres and cylinders have curved surfaces. Check each solid.`,
      explain: `A ${SOLIDS[good].name} is a ${kind}: ${kind === 'prism' ? 'two matching ends joined by rectangles' : 'a base with triangles meeting at the top'}.`,
      ...mcV(rng, sol(rng, good), shuffle(rng, wrongs)),
    };
  }
  return {
    prompt: `What are the faces of a ${S.name}?`,
    visual: sol(rng, s),
    hint: `What shapes make up a ${S.name}? Look at its ends (or base) first, then at its sides. Count how many of each shape there are, including the hidden ones.`,
    explain: `A ${S.name} has ${S.faces}.`,
    ...mcP(rng, S.faces, keys.filter((x) => SOLIDS[x].faces !== S.faces).map((x) => SOLIDS[x].faces), [], String),
  };
};

const geoRiddle = (rng, t) => {
  if (chance(rng, 0.5)) {
    const n = pick(rng, [3, 5, 6, 8, 4]);
    const reg = n === 8 ? true : chance(rng, 0.5);
    const nm0 = n === 4 ? (reg ? 'square' : 'rectangle') : `${reg ? 'regular' : 'irregular'} ${PNAME[n]}`;
    const clue = n === 4 ? (reg ? 'All my sides are equal and I have 4 right angles.' : 'I have 4 right angles, but my sides are not all equal.') : reg ? 'All my sides and angles are equal.' : 'My sides are not all equal.';
    const wrongs = n === 4 ? ['rhombus', reg ? 'rectangle' : 'square', 'regular pentagon'] : [`${reg ? 'irregular' : 'regular'} ${PNAME[n]}`, `${reg ? 'regular' : 'irregular'} ${PNAME[n === 8 ? 6 : n + 1]}`, `${reg ? 'regular' : 'irregular'} ${PNAME[n === 3 ? 4 : n - 1]}`];
    return {
      prompt: `I have ${n} sides. ${clue} What am I?`,
      hint: n === 4 ? 'Four sides make a quadrilateral. A square has 4 equal sides and 4 right angles; a rectangle has 4 right angles but not all sides equal; a rhombus has 4 equal sides but no right angles. Which one fits the clue?' : `First use the number of sides, ${n}, to name the polygon. Then use the other clue: all sides and angles equal means regular; not all equal means irregular.`,
      explain: `${n} sides: a${n === 8 ? 'n' : ''} ${PNAME[n]}. ${clue} So I am a${/^[aeiou]/.test(nm0) ? 'n' : ''} ${nm0}.`,
      ...mcP(rng, nm0, wrongs, [], String),
    };
  }
  const s = pick(rng, Object.keys(SOLIDS));
  const S = SOLIDS[s];
  const clue = pick(rng, [`My faces are ${S.faces}.`, `I have ${S.f} faces, ${S.e} edges and ${S.v} vertices.`]);
  const good = S.name;
  const wrongs = Object.keys(SOLIDS).filter((x) => x !== s).map((x) => SOLIDS[x].name);
  if (clue.startsWith('I have') && (s === 'cube' || s === 'rect_prism')) wrongs.splice(wrongs.indexOf(s === 'cube' ? 'rectangular prism' : 'cube'), 1);
  return {
    prompt: `Solid riddle: ${clue} What am I?`,
    hint: 'Picture each solid in the choices. Count its faces, edges and vertices, or think about the shapes of its faces. Which one matches every clue?',
    explain: `A ${S.name} has ${S.faces}: ${S.f} faces, ${S.e} edges and ${S.v} vertices.`,
    ...mcP(rng, good, wrongs, [], cap),
  };
};

const SYM_LETTERS = { A: 'v', B: 'h', C: 'h', D: 'h', E: 'h', H: 'b', M: 'v', T: 'v', U: 'v', V: 'v', W: 'v', Y: 'v', X: 'b', O: 'b', K: 'h', F: 'n', G: 'n', J: 'n', L: 'n', N: 'n', P: 'n', R: 'n', S: 'n', Z: 'n' };
const geoSymPreview = (rng, t) => {
  const L = pick(rng, Object.keys(SYM_LETTERS));
  const line = pick(rng, ['vertical', 'horizontal']);
  const s = SYM_LETTERS[L];
  const yes = s === 'b' || (s === 'v' && line === 'vertical') || (s === 'h' && line === 'horizontal');
  return {
    prompt: 'Big challenge! Is the dashed line a line of symmetry?',
    visual: { type: 'symmetry', shape: `letter:${L}`, line },
    hint: 'A line of symmetry splits a shape into two halves that match exactly, like a mirror. Imagine folding along the dashed line: would one half land perfectly on the other? "Yes" means they match; "No" means they do not.',
    explain: yes ? `If you fold ${L} along the ${line} line, both halves match. It is a line of symmetry.` : `If you fold ${L} along the ${line} line, the halves do not match. It is not a line of symmetry.`,
    ...fixedChoices(['Yes', 'No'], yes ? 'Yes' : 'No'),
  };
};

const g3Polygons = {
  id: 'g3-geo-polygons', grade: 3, strand: 'shape', bigIdea: 'geometry', species: 'shapeshifter',
  name: 'Polygons & Solids',
  parentDesc: 'Identifies polygons, regular and irregular; counts sides and vertices; compares angles to a right angle; names triangles to octagons; describes cubes, prisms and pyramids.',
  classic: false,
  gen: tiered([
    [1, 3, geoSides, 2], [1, 4, geoName, 2], [2, 4, geoPolygon, 1.5], [3, 5, geoRegular, 1.5], [3, 6, geoAngles, 1.5],
    [4, 7, geoSolids, 2.5], [5, 7, geoRiddle, 2], [7, 7, geoSymPreview, 0.6, PREVIEW],
  ]),
};

// ---------------------------------------------------------------------------
// SD12 Data: first-hand data, bar graphs, reading displays critically
// ---------------------------------------------------------------------------
const TOPICS = [
  { title: 'Favourite Fruit', labels: ['Apple', 'Banana', 'Grapes', 'Orange', 'Pear', 'Mango'], noun: 'students', ask: (l) => `How many students chose ${l.toLowerCase()}?` },
  { title: 'Favourite Pet', labels: ['Dog', 'Cat', 'Fish', 'Bird', 'Rabbit'], noun: 'students', ask: (l) => `How many students chose ${l.toLowerCase()}?` },
  { title: 'Favourite Sport', labels: ['Soccer', 'Hockey', 'Swimming', 'Basketball', 'Baseball'], noun: 'students', ask: (l) => `How many students chose ${l.toLowerCase()}?` },
  { title: 'Favourite Season', labels: ['Spring', 'Summer', 'Fall', 'Winter'], noun: 'students', ask: (l) => `How many students chose ${l.toLowerCase()}?` },
  { title: 'Birds at the Feeder', labels: ['Chickadee', 'Blue jay', 'Cardinal', 'Sparrow', 'Robin'], noun: 'birds', ask: (l) => `How many birds were ${l.toLowerCase()}s?` },
  { title: 'Favourite Snack', labels: ['Popcorn', 'Apples', 'Yogurt', 'Crackers', 'Cheese'], noun: 'students', ask: (l) => `How many students chose ${l.toLowerCase()}?` },
  { title: 'Books Read by Type', labels: ['Mystery', 'Comics', 'Animals', 'Space', 'Fairy tales'], noun: 'books', ask: (l) => `How many ${l.toLowerCase()} books were read?` },
  { title: 'Weather This Year', labels: ['Sunny', 'Cloudy', 'Rainy', 'Snowy'], noun: 'days', ask: (l) => `How many days were ${l.toLowerCase()}?` },
  { title: 'Potions Made', labels: ['Blue', 'Green', 'Purple', 'Gold', 'Silver'], noun: 'potions', ask: (l) => `How many ${l.toLowerCase()} potions were made?` },
  { title: 'Favourite Colour', labels: ['Red', 'Blue', 'Green', 'Yellow', 'Purple'], noun: 'students', ask: (l) => `How many students chose ${l.toLowerCase()}?` },
];
function makeData(rng, t, forceK) {
  const topic = pick(rng, TOPICS);
  const k = forceK || Math.min(topic.labels.length, t <= 1 ? 3 : randInt(rng, 3, 5));
  const labels = sample(rng, topic.labels, k);
  // Grade 3 bar graphs use one-to-one correspondence: the scale counts by 1s (NB Grade 3 data indicators;
  // many-to-one scales of 2, 5 and 10 are Grade 4). Harder tiers use more bars and bigger counts instead.
  // Vertical graphs stay at 12 or less so every grid line label fits; horizontal ones can go to 20.
  const scale = 1;
  const horizontal = t >= 2 && chance(rng, 0.5);
  const hi = t === 1 ? 9 : t === 2 ? 12 : horizontal ? (t <= 4 ? 16 : 20) : 12;
  const pool = Array.from({ length: hi - 1 }, (_, i) => i + 2).filter((x) => t > 1 || x <= 9);
  const values = sample(rng, pool, k);
  const yLabel = `Number of ${topic.noun}`;
  const visual = { type: 'bargraph', title: topic.title, labels, values, horizontal, scale, yLabel };
  return { topic, labels, values, scale, visual };
}

const dtRead = (rng, t) => {
  const D = makeData(rng, t);
  const i = randInt(rng, 0, D.labels.length - 1);
  const v = D.values[i];
  const q = {
    prompt: D.topic.ask(D.labels[i]),
    visual: D.visual,
    hint: `Find the ${D.labels[i]} bar. Follow the end of the bar straight across to the number scale.${D.scale > 1 ? ` Each grid line counts by ${numWords(D.scale)}s; a bar that stops between two lines is halfway between them.` : ''}`,
    explain: `The ${D.labels[i]} bar ends at ${v}.`,
  };
  if (t >= 2 && chance(rng, 0.4)) return { ...q, kind: 'num', answer: num(v) };
  return { ...q, ...mcN(rng, v, [v + D.scale, v - D.scale, ...D.values.filter((x) => x !== v), v + 1, v - 1], { min: 1 }) };
};

const dtMost = (rng, t) => {
  const D = makeData(rng, t);
  const most = chance(rng, 0.6);
  const target = most ? Math.max(...D.values) : Math.min(...D.values);
  const lab = D.labels[D.values.indexOf(target)];
  return {
    prompt: D.topic.noun === 'students' ? (most ? 'Which was chosen the most?' : 'Which was chosen the least?') : (most ? `Which had the most ${D.topic.noun}?` : `Which had the fewest ${D.topic.noun}?`),
    visual: D.visual,
    hint: `Which bar is the ${most ? 'longest' : 'shortest'}? The ${most ? 'longest' : 'shortest'} bar shows the ${most ? 'most' : 'fewest'}. Compare where each bar ends on the scale.`,
    explain: `${lab} has the ${most ? 'longest' : 'shortest'} bar, with ${target}.`,
    ...mcP(rng, lab, D.labels.filter((l) => l !== lab), [], String),
  };
};

const dtDiff = (rng, t) => {
  const D = makeData(rng, t);
  const [i, j] = sample(rng, D.labels.map((_, k) => k), 2);
  const [a, b] = D.values[i] > D.values[j] ? [i, j] : [j, i];
  const diff = D.values[a] - D.values[b];
  const q = {
    prompt: D.topic.noun === 'students' ? `How many more students chose ${D.labels[a].toLowerCase()} than ${D.labels[b].toLowerCase()}?` : `How many more ${D.topic.noun} for ${D.labels[a].toLowerCase()} than for ${D.labels[b].toLowerCase()}?`,
    visual: D.visual,
    hint: `How many more for ${D.labels[a]} than for ${D.labels[b]}? Read the number for the ${D.labels[a]} bar and for the ${D.labels[b]} bar. Then take the smaller number away from the bigger one, or count up from the smaller.`,
    explain: `${D.labels[a]}: ${D.values[a]}. ${D.labels[b]}: ${D.values[b]}. ${D.values[a]} − ${D.values[b]} = ${diff}.`,
  };
  if (chance(rng, 0.5)) return { ...q, kind: 'num', answer: num(diff) };
  return { ...q, ...mcN(rng, diff, [D.values[a] + D.values[b], D.values[a], diff + D.scale, diff - D.scale].filter((x) => x > 0)) };
};

const dtTotal = (rng, t) => {
  const D = makeData(rng, t, t <= 4 ? 3 : undefined);
  const total = D.values.reduce((s, x) => s + x, 0);
  return {
    kind: 'num',
    prompt: D.topic.noun === 'students' ? 'How many students answered the survey?' : `How many ${D.topic.noun} are shown in all?`,
    visual: D.visual,
    hint: `How many in all? Read the number for every bar (${D.labels.join(', ')}). Then add all the numbers together.`,
    explain: `${D.values.join(' + ')} = ${total}.`,
    answer: num(total),
  };
};

const FIRST_HAND = [
  (p) => `${p} asks classmates about their favourite colour.`, (p) => `${p} counts the cars that drive past the school.`,
  (p) => `${p} measures the plants in the class garden every week.`, (p) => `${p} tallies the birds at a feeder.`,
  (p) => `${p} surveys friends about their favourite snack.`, (p) => `${p} records the temperature outside each morning.`,
  (p) => `${p} rolls a die 20 times and records each number.`,
];
const SECOND_HAND = [
  (p) => `${p} finds the number of moose in New Brunswick on a website.`, (p) => `${p} reads a chart in a library book about whales.`,
  (p) => `${p} looks up last year's snowfall in the newspaper.`, (p) => `${p} uses a graph from a science magazine.`,
  (p) => `${p} watches a TV show that lists the tallest trees.`, (p) => `${p} copies population numbers from an atlas.`,
];
const dtFirstSecond = (rng, t) => {
  const first = chance(rng, 0.5);
  const p = nm(rng);
  const s = pick(rng, first ? FIRST_HAND : SECOND_HAND)(p);
  return {
    prompt: `${s} What kind of data is this?`,
    hint: `First-hand data means ${p} collected it themself, by counting, measuring or asking. Second-hand data means someone else collected it (a book, website, newspaper or TV show). Who did the collecting here?`,
    explain: first ? `${p} is collecting the data directly, so it is first-hand data.` : `Someone else collected this data, so it is second-hand data.`,
    ...fixedChoices(['First-hand data', 'Second-hand data'], first ? 'First-hand data' : 'Second-hand data'),
  };
};

const SURVEY_TOPICS = ['fruit', 'pet', 'sport', 'season', 'book', 'colour', 'snack', 'game', 'song', 'animal'];
const BAD_QS = ['How tall is the CN Tower?', 'What is 5 + 7?', 'How many stars are in the sky?', 'How far away is the moon?', 'What is the capital of Canada?', 'How heavy is a blue whale?'];
const dtPose = (rng, t) => {
  const p = nm(rng);
  const top = pick(rng, SURVEY_TOPICS);
  const good = `What is your favourite ${top}?`;
  return {
    prompt: `${p} wants to collect first-hand data by surveying the class. Which question could ${p} ask?`,
    hint: 'A survey question is one that each classmate can answer about themself, like their favourite thing. Test each choice: could your classmates answer it just by thinking about themselves? Questions you would have to look up are not survey questions.',
    explain: `"${good}" can be answered by each classmate, so ${p} can collect the answers and make a graph.`,
    ...mcP(rng, good, sample(rng, BAD_QS, 3), [], String),
  };
};

const dtWhichGraph = (rng, t) => {
  const D = makeData(rng, Math.min(t, 4), 3);
  const vis = (vals) => ({ ...D.visual, values: vals, title: D.topic.title }); // keeps the orientation makeData sized the values for
  const [a, b] = [0, 1];
  const swapped = D.values.slice(); [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
  const off = D.values.slice(); off[2] = off[2] + D.scale;
  const off2 = D.values.slice(); off2[0] = Math.max(D.scale, off2[0] - D.scale);
  return {
    prompt: 'Which bar graph matches the table?',
    visual: { type: 'table', title: D.topic.title, headers: [D.topic.title.replace(/^Favourite /, ''), 'Number'], rows: D.labels.map((l, i) => [l, D.values[i]]) },
    hint: `For each graph, check every bar against its row in the table: ${D.labels[0]}, then ${D.labels[1]}, then ${D.labels[2]}. If even one bar does not match, that graph is out.`,
    explain: `The matching graph has ${D.labels.map((l, i) => `${l} at ${D.values[i]}`).join(', ')}.`,
    ...mcV(rng, vis(D.values), [vis(swapped), vis(off), vis(off2)]),
  };
};

const dtCritical = (rng, t) => {
  const D = makeData(rng, Math.max(t, 4), 4);
  const L = D.labels, V = D.values;
  const idx = [0, 1, 2, 3];
  const maxI = V.indexOf(Math.max(...V)), minI = V.indexOf(Math.min(...V));
  const [i, j] = sample(rng, idx, 2);
  const trueS = shuffle(rng, [
    `${L[maxI]} has the most.`, `${L[minI]} has the least.`,
    `${V[i] > V[j] ? L[i] : L[j]} has more than ${V[i] > V[j] ? L[j] : L[i]}.`,
    `${L[i]} and ${L[j]} together have ${V[i] + V[j]}.`,
    `${L[i]} has ${V[i]}.`,
  ]);
  const falseS = shuffle(rng, [
    `${L[minI]} has the most.`, `${L[maxI]} has the least.`,
    `${V[i] > V[j] ? L[j] : L[i]} has more than ${V[i] > V[j] ? L[i] : L[j]}.`,
    `${L[i]} and ${L[j]} together have ${V[i] + V[j] + D.scale}.`,
    `${L[j]} has ${V[j] + D.scale}.`,
    `The total is ${V.reduce((s, x) => s + x, 0) - D.scale}.`,
  ]);
  const good = trueS[0];
  return {
    prompt: 'Which statement about the graph is true?',
    visual: D.visual,
    hint: 'Read the number for every bar first. Then test each statement: "most" means the longest bar, "least" the shortest, "together" means add, and "has" means that exact number. Only one statement checks out.',
    explain: `${good} ${L.map((l, k) => `${l}: ${V[k]}`).join(', ')}.`,
    ...mcP(rng, good, falseS, [], String),
  };
};

const dtPictoPreview = (rng, t) => {
  const topic = pick(rng, TOPICS);
  const labels = sample(rng, topic.labels, 3);
  const key = 2;
  const counts = labels.map(() => randInt(rng, 1, 8) * 2 + (chance(rng, 0.25) ? 1 : 0));
  const i = randInt(rng, 0, 2);
  const icon = pick(rng, ['😀', '⭐', '🍎', '🐦', '📘']);
  return {
    kind: 'num',
    prompt: `Big challenge! Each ${icon} stands for 2. ${topic.ask(labels[i])}`,
    visual: { type: 'pictograph', title: topic.title, rows: labels.map((l, k) => ({ label: l, count: counts[k] })), icon, key },
    hint: `Each picture stands for 2. Count the whole pictures in the ${labels[i]} row and count by 2s. A half picture stands for 1.`,
    explain: `${labels[i]} has ${Math.floor(counts[i] / 2)} whole picture${Math.floor(counts[i] / 2) === 1 ? '' : 's'}${counts[i] % 2 ? ' and a half' : ''}. Counting by 2s: ${counts[i]}.`,
    answer: num(counts[i]),
  };
};

const g3Data = {
  id: 'g3-data-data', grade: 3, strand: 'stats', bigIdea: 'data', species: 'datapup',
  name: 'Bar Graphs',
  parentDesc: 'Reads and interprets horizontal and vertical bar graphs, poses survey questions, tells first-hand from second-hand data, and reads displays critically.',
  classic: false,
  gen: tiered([
    [1, 4, dtRead, 2.5], [1, 3, dtMost, 1.5], [2, 7, dtDiff, 2], [3, 7, dtTotal, 1.5], [4, 5, dtFirstSecond, 1.2], [4, 6, dtPose],
    [4, 6, dtWhichGraph, 1.2], [5, 7, dtCritical, 2], [7, 7, dtPictoPreview, 0.6, PREVIEW],
  ]),
};

// ---------------------------------------------------------------------------
// SD13 Chance
// ---------------------------------------------------------------------------
const CHANCE4 = ['impossible', 'unlikely', 'likely', 'certain'];
function bagOf(rng, kind) {
  const [target, other, other2] = sample(rng, COLOURS.slice(0, 6), 3);
  let items;
  if (kind === 'certain') items = [{ color: target, count: randInt(rng, 3, 10) }];
  else if (kind === 'impossible') items = [{ color: other, count: randInt(rng, 2, 6) }, { color: other2, count: randInt(rng, 1, 5) }];
  else if (kind === 'likely') { const n = randInt(rng, 6, 10); items = [{ color: target, count: n }, { color: other, count: randInt(rng, 1, Math.min(3, n - 3)) }]; }
  else { const n = randInt(rng, 1, 2); items = [{ color: target, count: n }, { color: other, count: randInt(rng, 6, 10) }]; }
  return { target, items: shuffle(rng, items) };
}
const chMarbles = (rng, t) => {
  const kind = t === 1 ? pick(rng, ['certain', 'impossible']) : pick(rng, CHANCE4);
  const { target, items } = bagOf(rng, kind);
  return {
    prompt: `You pick one marble without looking. Picking ${an(target)} marble is…`,
    visual: { type: 'marbles', items },
    hint: t === 1 ? `"Certain" means it will happen for sure: every marble is ${target}. "Impossible" means it cannot happen: there are no ${target} marbles. Look at the bag: are there any ${target} marbles? Are there any other colours?` : `Certain means every marble is ${target}; impossible means there are none. Likely means most of the marbles are ${target}; unlikely means only a few are. Count the ${target} marbles and the other marbles.`,
    explain: kind === 'certain' ? `Every marble is ${target}, so it is certain.` : kind === 'impossible' ? `There are no ${target} marbles, so it is impossible.` : kind === 'likely' ? `Most of the marbles are ${target}, so it is likely.` : `Only a few marbles are ${target}, so it is unlikely.`,
    ...fixedChoices(t === 1 ? ['impossible', 'certain'] : CHANCE4, kind),
  };
};

const chSpinner = (rng, t) => {
  const cols = sample(rng, COLOURS.slice(0, 6), 3);
  const sizes = shuffle(rng, [3, 1, 2]);
  const sections = cols.map((c, i) => ({ color: c, label: cap(c), size: sizes[i] }));
  const most = chance(rng, 0.6);
  const target = cols[sizes.indexOf(most ? 3 : 1)];
  return {
    prompt: `Where is the spinner ${most ? 'most' : 'least'} likely to land?`,
    visual: { type: 'spinner', sections },
    hint: `Where will the spinner ${most ? 'most' : 'least'} likely stop? The bigger a section is, the more likely the spinner lands there. Compare the sizes of the sections.`,
    explain: `The ${target} section is the ${most ? 'biggest' : 'smallest'}, so ${target} is ${most ? 'most' : 'least'} likely.`,
    ...mcP(rng, cap(target), cols.filter((c) => c !== target).map(cap), [], String),
  };
};

const EVENTS = {
  certain: ['Tomorrow will come after today.', 'A week will have 7 days.', 'A new day will start after midnight.', 'The number after 9 will be 10.'],
  impossible: ['A cat will turn into a dragon.', 'You will roll a 7 on a regular die (1 to 6).', 'A fish will ride a bicycle to school.', 'July will come right after January.'],
  likely: ['It will snow in New Brunswick in January.', 'It will be warm in New Brunswick in July.', 'Someone in your class will smile today.', 'You will see a car on the way to school.'],
  unlikely: ['It will snow in New Brunswick in July.', 'A moose will walk into your classroom.', 'You will find a four-leaf clover today.', 'Your teacher will wear a wizard hat all day.'],
};
const chEvents = (rng, t) => {
  if (chance(rng, 0.4)) {
    const opts = [
      ['certain', (n) => `rolling a number less than 7`], ['impossible', () => `rolling a 0`], ['impossible', () => `rolling a 9`],
      ['unlikely', (n) => `rolling a ${n}`], ['likely', (n) => `rolling a number greater than 1`], ['likely', () => 'rolling a number less than 6'],
    ];
    const [kind, f] = pick(rng, opts);
    const n = randInt(rng, 1, 6);
    const ev = f(n);
    return {
      prompt: `On a regular die (1 to 6), how likely is ${ev}?`,
      visual: { type: 'dice', values: [randInt(rng, 1, 6)] },
      hint: `A die has 6 faces: 1, 2, 3, 4, 5 and 6. Count how many faces fit ${ev}. All 6 means certain, none means impossible, most of them means likely and only one or two means unlikely.`,
      explain: kind === 'certain' ? 'Every face is less than 7, so it is certain.' : kind === 'impossible' ? 'No face shows that number, so it is impossible.' : kind === 'likely' ? 'Most faces (5 of 6) fit, so it is likely.' : 'Only 1 face out of 6 fits, so it is unlikely.',
      ...fixedChoices(CHANCE4, kind),
    };
  }
  const kind = pick(rng, CHANCE4);
  const ev = pick(rng, EVENTS[kind]);
  const p = nm(rng);
  return {
    prompt: `${p} thinks about this: "${ev}" How likely is it?`,
    hint: 'Impossible means it can never happen; unlikely means it could happen but probably won\'t. Likely means it will probably happen; certain means it will happen for sure. Which one fits this event?',
    explain: `This is ${kind}.`,
    ...fixedChoices(CHANCE4, kind),
  };
};

const chCompare = (rng, t) => {
  const [a, b] = sample(rng, COLOURS.slice(0, 6), 2);
  const na = randInt(rng, 1, 9), nb = chance(rng, 0.25) ? na : randInt(rng, 1, 9);
  const items = [{ color: a, count: na }, { color: b, count: nb }];
  if (t >= 5) items.push({ color: pick(rng, COLOURS.filter((c) => c !== a && c !== b).slice(0, 4)), count: randInt(rng, 1, 5) });
  const ans = na > nb ? `${cap(a)} is more likely` : na < nb ? `${cap(b)} is more likely` : 'They are equally likely';
  return {
    prompt: `You pick one marble without looking. Which is true?`,
    visual: { type: 'marbles', items: shuffle(rng, items) },
    hint: `Count the ${a} marbles and the ${b} marbles. More marbles of a colour means it is more likely to be picked. The same number of each means they are equally likely.`,
    explain: `There ${na === 1 ? 'is' : 'are'} ${na} ${a} and ${nb} ${b}. ${ans}.`,
    ...fixedChoices([`${cap(a)} is more likely`, `${cap(b)} is more likely`, 'They are equally likely'], ans),
  };
};

const chWhichBag = (rng, t) => {
  const kind = pick(rng, CHANCE4);
  const target = pick(rng, COLOURS.slice(0, 6));
  // build each bag with the target colour meaning
  const bag = (k) => {
    const other = pick(rng, COLOURS.slice(0, 6).filter((c) => c !== target));
    if (k === 'certain') return { type: 'marbles', items: [{ color: target, count: randInt(rng, 3, 9) }] };
    if (k === 'impossible') return { type: 'marbles', items: [{ color: other, count: randInt(rng, 3, 9) }] };
    if (k === 'likely') return { type: 'marbles', items: shuffle(rng, [{ color: target, count: randInt(rng, 6, 9) }, { color: other, count: randInt(rng, 1, 2) }]) };
    return { type: 'marbles', items: shuffle(rng, [{ color: target, count: randInt(rng, 1, 2) }, { color: other, count: randInt(rng, 6, 9) }]) };
  };
  return {
    prompt: `Which bag makes picking ${an(target)} marble ${kind}?`,
    hint: `Certain means every marble is ${target}; impossible means none are ${target}. Likely means most are ${target}; unlikely means only a few are. Check the ${target} marbles in each bag.`,
    explain: `In the right bag, picking ${target} is ${kind}.`,
    ...mcV(rng, bag(kind), CHANCE4.filter((k) => k !== kind).map(bag)),
  };
};

const chWhichSpinner = (rng, t) => {
  const target = pick(rng, COLOURS.slice(0, 6));
  const other = pick(rng, COLOURS.slice(0, 6).filter((c) => c !== target));
  const want = pick(rng, ['unlikely', 'likely', 'impossible', 'certain']);
  const sp = (k) => {
    if (k === 'certain') return { type: 'spinner', sections: [{ color: target, label: cap(target) }] };
    if (k === 'impossible') return { type: 'spinner', sections: [{ color: other, label: cap(other) }, { color: 'yellow', label: 'Yellow' }].filter((s, i, a) => a.findIndex((x) => x.color === s.color) === i && s.color !== target) };
    if (k === 'likely') return { type: 'spinner', sections: [{ color: target, label: cap(target), size: randInt(rng, 3, 5) }, { color: other, label: cap(other), size: 1 }] };
    return { type: 'spinner', sections: [{ color: target, label: cap(target), size: 1 }, { color: other, label: cap(other), size: randInt(rng, 3, 5) }] };
  };
  return {
    prompt: `Which spinner makes landing on ${target} ${want}?`,
    hint: `Certain means the whole spinner is ${target}; impossible means there is no ${target} at all. Likely means ${target} is the biggest part; unlikely means ${target} is only a small part. Check each spinner.`,
    explain: `On the right spinner, landing on ${target} is ${want}.`,
    ...mcV(rng, sp(want), CHANCE4.filter((k) => k !== want).map(sp)),
  };
};

const chAddMarbles = (rng, t) => {
  const [a, b] = sample(rng, COLOURS.slice(0, 6), 2);
  const na = randInt(rng, 1, 5), nb = na + randInt(rng, 1, 5);
  const equal = chance(rng, 0.5) || t === 6;
  const ans = equal ? nb - na : nb - na + 1;
  return {
    kind: 'num',
    prompt: equal ? `A bag has ${na} ${a} and ${nb} ${b} marbles. How many ${a} marbles should you add to make ${a} and ${b} equally likely?`
      : `A bag has ${na} ${a} and ${nb} ${b} marbles. What is the fewest ${a} marbles to add so ${a} is MORE likely than ${b}?`,
    visual: { type: 'marbles', items: [{ color: a, count: na }, { color: b, count: nb }] },
    hint: equal ? `The bag has ${na} ${a} and ${nb} ${b}. Equally likely means the same number of each colour. How many more ${a} marbles would it take to catch up to ${nb}?` : `The bag has ${na} ${a} and ${nb} ${b}. For ${a} to be MORE likely, it needs more marbles than ${b}, not just the same. First find how many would make them equal, then think about one more.`,
    explain: equal ? `${nb} − ${na} = ${ans}. With ${nb} of each, they are equally likely.` : `${nb} − ${na} = ${nb - na} would make them equal. One more makes ${a} more likely: ${ans}.`,
    answer: num(ans),
  };
};

const chEqualPreview = (rng, t) => {
  const n = pick(rng, [2, 3, 4, 6]);
  const cols = sample(rng, COLOURS.slice(0, 6), Math.min(n, 4));
  const fair = { type: 'spinner', sections: Array.from({ length: n }, (_, i) => ({ color: cols[i % cols.length], label: cap(cols[i % cols.length]) })).slice(0, Math.min(n, 4)) };
  const unfair = (k) => ({ type: 'spinner', sections: cols.slice(0, Math.max(2, Math.min(n, 4))).map((c, i) => ({ color: c, label: cap(c), size: i === 0 ? k : 1 })) });
  return {
    prompt: 'Big challenge! On which spinner is every colour equally likely?',
    hint: 'On which spinner does every colour have the same chance? Equally likely means every section is the same size. Check each spinner: is any section bigger than the others?',
    explain: 'When all the sections are the same size, each colour has the same chance.',
    ...mcV(rng, fair, [unfair(2), unfair(3), unfair(4)]),
  };
};

const g3Chance = {
  id: 'g3-data-chance', grade: 3, strand: 'stats', bigIdea: 'data', species: 'chancewing',
  name: 'How Likely?',
  parentDesc: 'Describes the chance of an event as impossible, unlikely, likely or certain, and compares the likelihood of two outcomes.',
  classic: false,
  gen: tiered([
    [1, 4, chMarbles, 2.5], [2, 5, chSpinner, 1.5], [2, 5, chEvents, 1.5], [3, 6, chCompare, 1.5], [4, 6, chWhichBag, 1.5],
    [5, 7, chWhichSpinner, 1.5], [6, 7, chAddMarbles, 1.5], [7, 7, chEqualPreview, 0.6, PREVIEW], [6, 7, chCompare, 1],
  ]),
};

// ---------------------------------------------------------------------------
// SD14 Money: counting mixed coins and bills to $10, fewest coins, other currencies
// ---------------------------------------------------------------------------
const COIN_VAL = { nickel: 5, dime: 10, quarter: 25, loonie: 100, toonie: 200, bill5: 500, bill10: 1000, bill20: 2000, bill50: 5000 };
const COIN_NAME = { nickel: 'nickel', dime: 'dime', quarter: 'quarter', loonie: 'loonie', toonie: 'toonie', bill5: '$5 bill', bill10: '$10 bill', bill20: '$20 bill', bill50: '$50 bill' };
const ORDER = ['bill50', 'bill20', 'bill10', 'bill5', 'toonie', 'loonie', 'quarter', 'dime', 'nickel'];
const sumCoins = (items) => items.reduce((s, c) => s + COIN_VAL[c], 0);
const sortCoins = (items) => items.slice().sort((a, b) => COIN_VAL[b] - COIN_VAL[a]);
function greedy(c) {
  const out = [];
  for (const k of ORDER) while (c >= COIN_VAL[k]) { out.push(k); c -= COIN_VAL[k]; }
  return out;
}
function randCoins(rng, t) {
  const types = t === 1 ? ['dime', 'nickel'] : t === 2 ? ['loonie', 'quarter', 'dime', 'nickel', 'toonie'] : ['bill5', 'toonie', 'loonie', 'quarter', 'dime', 'nickel'];
  const cap0 = t === 1 ? 100 : t === 2 ? 500 : 1000;
  const n = randInt(rng, 3, t === 1 ? 7 : 8);
  let items = [];
  for (let i = 0; i < n; i++) {
    const c = pick(rng, types);
    if (sumCoins([...items, c]) <= cap0) items.push(c);
  }
  if (items.length < 2) items = t === 1 ? ['dime', 'dime', 'nickel'] : ['loonie', 'quarter', 'dime'];
  return items;
}
const coinCountDesc = (items) => ORDER.filter((k) => items.includes(k)).map((k) => { const n = items.filter((x) => x === k).length; return `${n} ${COIN_NAME[k]}${n > 1 ? 's' : ''}`; }).join(', ');

const mnCount = (rng, t) => {
  const items = randCoins(rng, t);
  const total = sumCoins(items);
  const shown = t <= 2 ? sortCoins(items) : shuffle(rng, items);
  const swapND = items.reduce((s, c) => s + (c === 'nickel' ? 10 : c === 'dime' ? 5 : COIN_VAL[c]), 0);
  const drop = total - COIN_VAL[pick(rng, items)];
  const wrongs = [swapND, drop, total + 5, total - 5, total + 10, total + 25, items.length * 10];
  return {
    prompt: pick(rng, ['How much money is shown?', 'How much money is this?', 'Count the money. How much is there?']),
    visual: { type: 'coins', items: shown },
    hint: 'How much money is there? Start with the bills and coins worth the most, then count on. A toonie is two dollars, a loonie is one dollar, a quarter is twenty-five cents, a dime is ten cents and a nickel is five cents.',
    explain: `${coinCountDesc(items)}. Counting from biggest to smallest: ${money3(total)}.`,
    ...mcP(rng, total, wrongs.filter((x) => x > 0 && x !== total), [], money3),
  };
};

// Loonies, toonies and bills in whole dollars (NB Grade 3 money: count and record amounts like $16, $44, $92).
function randBills(rng, t) {
  const types = t >= 6 ? ['bill50', 'bill20', 'bill10', 'bill5', 'toonie', 'loonie'] : ['bill20', 'bill10', 'bill5', 'toonie', 'loonie'];
  const cap0 = t <= 3 ? 5000 : 9900;
  const n = randInt(rng, 3, t <= 3 ? 5 : 7);
  const items = [];
  for (let i = 0; i < 20 && items.length < n; i++) { const c = pick(rng, types); if (sumCoins([...items, c]) <= cap0) items.push(c); }
  return items.length >= 2 ? items : ['bill20', 'bill5', 'toonie'];
}
const mnBills = (rng, t) => {
  const items = randBills(rng, t);
  const total = sumCoins(items);
  const swapTL = items.reduce((s, c) => s + (c === 'toonie' ? 100 : c === 'loonie' ? 200 : COIN_VAL[c]), 0);
  const drop = total - COIN_VAL[pick(rng, items)];
  const q = {
    prompt: pick(rng, ['How much money is shown?', 'Count the bills and coins. How much money is there?']),
    visual: { type: 'coins', items: t <= 4 ? sortCoins(items) : shuffle(rng, items) },
    hint: 'How much money is there? Count the bills first, starting with the one worth the most. Then count on the toonies (two dollars each) and the loonies (one dollar each).',
    explain: `${coinCountDesc(items)}. Counting from biggest to smallest: ${money3(total)}.`,
  };
  if (chance(rng, 0.35)) return { ...q, kind: 'num', prompt: 'Count the bills and coins. How many dollars are there?', answer: num(total / 100) };
  return { ...q, ...mcP(rng, total, [swapTL, drop, total + 1000, total - 500, total + 100, total - 100].filter((x) => x > 0 && x !== total), [], money3) };
};

function splitOne(items, rng) {
  const i = randInt(rng, 0, items.length - 1);
  const c = items[i];
  const rep = { bill10: ['bill5', 'bill5'], bill5: ['toonie', 'toonie', 'loonie'], toonie: ['loonie', 'loonie'], loonie: ['quarter', 'quarter', 'quarter', 'quarter'], quarter: ['dime', 'dime', 'nickel'], dime: ['nickel', 'nickel'] }[c];
  if (!rep) return null;
  return sortCoins([...items.slice(0, i), ...rep, ...items.slice(i + 1)]);
}
const mnFewest = (rng, t) => {
  let c;
  do { c = randInt(rng, t <= 3 ? 3 : 8, t <= 3 ? 40 : 199) * 5; } while (greedy(c).length < 2);
  if (t >= 5) c = randInt(rng, 60, 199) * 5;
  const g = greedy(c);
  if (chance(rng, 0.4)) {
    return {
      kind: 'num',
      prompt: `What is the fewest number of coins and bills you need to make ${money3(c)}?`,
      hint: `What is the fewest pieces for ${money3(c)}? Use the biggest bill or coin that fits, as many times as you can. Then do the same with the next biggest for what is left, and count all the pieces.`,
      explain: `${coinCountDesc(g)}: that is ${g.length} coins and bills.`,
      answer: num(g.length),
    };
  }
  const alts = [];
  for (let k = 0; k < 8 && alts.length < 5; k++) { const s = splitOne(g, rng); if (s && s.length <= 12) alts.push({ type: 'coins', items: s }); }
  const a2 = alts[0] && splitOne(alts[0].items, rng);
  if (a2 && a2.length <= 12) alts.push({ type: 'coins', items: a2 });
  return {
    prompt: `Which shows ${money3(c)} with the fewest coins and bills?`,
    hint: `Every choice makes ${money3(c)}, so count how many pieces each one uses. Bigger coins and bills mean fewer pieces: one toonie instead of two loonies, one dime instead of two nickels. Which choice uses the fewest?`,
    explain: `${coinCountDesc(g)} makes ${money3(c)} with only ${g.length} coins and bills.`,
    ...mcV(rng, { type: 'coins', items: g }, alts),
  };
};

const mnMake = (rng, t) => {
  const items = randCoins(rng, Math.max(t, 2));
  const total = sumCoins(items);
  const alt = (f) => ({ type: 'coins', items: sortCoins(f(items.slice())) });
  const wrongs = [
    alt((a) => [...a, 'nickel']), alt((a) => a.slice(1)), alt((a) => a.map((c, i) => (i === 0 && c === 'dime' ? 'nickel' : i === 0 && c === 'quarter' ? 'dime' : c))),
    alt((a) => [...a, 'dime']), alt((a) => a.map((c) => (c === 'loonie' ? 'toonie' : c))),
  ].filter((v) => sumCoins(v.items) !== total);
  return {
    prompt: `Which set of money makes ${money3(total)}?`,
    hint: `Which set adds up to exactly ${money3(total)}? Count each set, starting with the biggest coin or bill. Only one set lands exactly on ${money3(total)}.`,
    explain: `${coinCountDesc(items)} = ${money3(total)}.`,
    ...mcV(rng, { type: 'coins', items: sortCoins(items) }, wrongs),
  };
};

const PRICE_ITEMS = ['book', 'kite', 'puzzle', 'toy dragon', 'yo-yo', 'wizard hat', 'ball', 'paint set', 'comic', 'water bottle'];
const mnEnough = (rng, t) => {
  const items = randCoins(rng, 3);
  const total = sumCoins(items);
  const who = nm(rng);
  const thing = pick(rng, PRICE_ITEMS);
  const price = Math.max(100, total + pick(rng, [-1, 1]) * randInt(rng, 1, 8) * 25);
  if (t >= 5 && price > total) {
    const need = price - total;
    return {
      prompt: `${who} has this money. A ${thing} costs ${money3(price)}. How much more money does ${who} need?`,
      visual: { type: 'coins', items: sortCoins(items) },
      hint: `How much more does ${who} need? First count ${who}'s money, biggest coins first. Then count up from that amount to ${money3(price)}.`,
      explain: `${who} has ${money3(total)}. From ${money3(total)} up to ${money3(price)} is ${money3(need)}.`,
      ...mcP(rng, need, [need + 25, need - 5, need + 100, total].filter((x) => x > 0 && x !== need), [need + 10, need - 10].filter((x) => x > 0), money3),
    };
  }
  const ok = total >= price;
  return {
    prompt: `${who} has this money. A ${thing} costs ${money3(price)}. Does ${who} have enough?`,
    visual: { type: 'coins', items: sortCoins(items) },
    hint: `Does ${who} have enough for ${money3(price)}? Count the money first. "Yes" means the money is the same as or more than the price; "No" means it is less.`,
    explain: `${who} has ${money3(total)}. That is ${ok ? 'enough' : 'not enough'} for ${money3(price)}.`,
    ...fixedChoices([`Yes, ${who} has enough`, `No, ${who} needs more`], ok ? `Yes, ${who} has enough` : `No, ${who} needs more`),
  };
};

const CURRENCIES = [['the United States', 'US dollar'], ['Mexico', 'peso'], ['Japan', 'yen'], ['the United Kingdom', 'pound'], ['France', 'euro'], ['India', 'rupee'], ['China', 'yuan'], ['Canada', 'Canadian dollar'], ['Germany', 'euro'], ['Spain', 'euro']];
const CUR_CLUE = {
  'US dollar': 'it is used by Canada\'s neighbour to the south.', peso: 'it is used by a country south of the United States where people speak Spanish.',
  yen: 'it is used by an island country in Asia, famous for sushi and cherry blossoms.', pound: 'it is used by the country where London is.',
  euro: 'many countries in Europe share it.', rupee: 'it is used by a very large country in South Asia, famous for the Taj Mahal.',
  yuan: 'it is used by the country with the Great Wall.', 'Canadian dollar': 'it is the money you use at home, with loonies and toonies.',
};
const COUNTRY_CLUE = {
  'the United States': 'it has the same name as Canada\'s money, with the country in front.', Mexico: 'its money has a Spanish name and starts with P.',
  Japan: 'its money is a short word that rhymes with "ten".', 'the United Kingdom': 'its money has the same name as an old unit of weight.',
  France: 'many countries in Europe share the same money.', Germany: 'many countries in Europe share the same money.', Spain: 'many countries in Europe share the same money.',
  India: 'its money starts with the letter R.', China: 'its money starts with the letter Y.', Canada: 'it is the money you use at home.',
};
const mnCurrency = (rng, t) => {
  const [country, cur] = pick(rng, CURRENCIES);
  const allCur = [...new Set(CURRENCIES.map((c) => c[1]))];
  if (chance(rng, 0.5) && cur !== 'euro') {
    const countries = [...new Set(CURRENCIES.map((c) => c[0]))];
    return {
      prompt: `In which country do people use the ${cur}?`,
      hint: `Different countries use different money. Clue: ${CUR_CLUE[cur]} Which country fits?`,
      explain: `People in ${country} use the ${cur}.`,
      ...mcP(rng, cap(country.replace(/^the /, 'The ')), countries.filter((c) => CURRENCIES.find((x) => x[0] === c)[1] !== cur).map((c) => cap(c.replace(/^the /, 'The '))), [], String),
    };
  }
  return {
    prompt: `What money do people use in ${country}?`,
    hint: `Different countries use different money (Canada uses the dollar). Clue: ${COUNTRY_CLUE[country]} Which money fits?`,
    explain: `People in ${country} use the ${cur}.`,
    ...mcP(rng, cur, allCur.filter((c) => c !== cur), [], (x) => `the ${x}`),
  };
};

const mnTogether = (rng, t) => {
  const [p, q] = nm2(rng);
  let a, b;
  do { a = randCoins(rng, 2); b = randCoins(rng, 2); } while (sumCoins(a) + sumCoins(b) > 1000 || sumCoins(a) === sumCoins(b));
  const A = sumCoins(a), B = sumCoins(b);
  if (chance(rng, 0.5)) {
    return {
      prompt: `${p} has ${coinCountDesc(a)}. ${q} has ${coinCountDesc(b)}. Who has more money?`,
      hint: `Who has more? Count ${p}'s money, then count ${q}'s money, starting with the coins worth the most each time. Then compare the two totals.`,
      explain: `${p} has ${money3(A)} and ${q} has ${money3(B)}. ${A > B ? p : q} has more.`,
      ...fixedChoices([p, q], A > B ? p : q),
    };
  }
  return {
    prompt: `${p} has ${coinCountDesc(a)}. ${q} has ${coinCountDesc(b)}. How much money do they have together?`,
    hint: `How much do they have together? Count ${p}'s money, then ${q}'s money. Then add the two amounts; 100¢ makes 1 dollar.`,
    explain: `${p}: ${money3(A)}. ${q}: ${money3(B)}. Together: ${money3(A + B)}.`,
    ...mcP(rng, A + B, [A + B + 25, A + B - 5, Math.abs(A - B), A + B + 100, A + B - 10].filter((x) => x > 0 && x !== A + B), [], money3),
  };
};

const mnDecimalPreview = (rng, t) => {
  const d = randInt(rng, 1, 9), c = randInt(rng, 1, 19) * 5;
  const good = `$${d}.${pad2(c)}`;
  return {
    prompt: `Big challenge! How do you write ${moneyWords(d * 100 + c)} with a dollar sign?`,
    hint: 'Dollars go before the point. Cents always use two digits after the point (so 5 cents is written .05). Which choice follows both rules?',
    explain: `${d} dollars and ${c} cents is written ${good}.`,
    ...mcP(rng, good, [`$${d}${pad2(c)}`, `$${c}.${pad2(d)}`, `$${d}.0${c}`, `$${d + 1}.${pad2(c)}`], [], String),
  };
};

const g3Money = {
  id: 'g3-data-money', grade: 3, strand: 'stats', bigIdea: 'data', species: 'coinling',
  name: 'Coins & Bills',
  parentDesc: 'Counts mixed coins up to $10 and loonies, toonies and bills in whole dollars (like $44 or $92), finds the fewest coins and bills for an amount, and knows other countries use other currencies.',
  classic: false,
  gen: tiered([
    [1, 5, mnCount, 3], [3, 7, mnBills, 1.5], [3, 7, mnFewest, 2], [2, 5, mnMake, 1.5], [4, 7, mnEnough, 1.5], [4, 6, mnCurrency], [6, 7, mnTogether, 2], [7, 7, mnDecimalPreview, 0.6, PREVIEW],
  ]),
};

// ---------------------------------------------------------------------------
// Classic: perimeter of regular and irregular shapes (older Grade 3 SS5)
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
  const x0 = randInt(rng, 0, 1);
  const cells = [];
  hs.forEach((h, i) => { for (let j = 0; j < h; j++) cells.push([x0 + i, rows - 1 - j]); });
  return cells;
}

const perRect = (rng, t) => {
  const w = randInt(rng, 2, t === 1 ? 5 : 7), h = randInt(rng, 1, t === 1 ? 4 : 5);
  const cols = Math.max(w + 2, 8), rows = Math.max(h + 2, 6);
  const x = randInt(rng, 0, cols - w), y = randInt(rng, 0, rows - h);
  const p = 2 * (w + h);
  return {
    prompt: 'What is the perimeter of the shaded rectangle? Each square is 1 unit on each side.',
    visual: { type: 'grid', cols, rows, rect: { x, y, w, h }, showUnits: true },
    hint: 'How far is it all the way around the rectangle? Perimeter is the distance around the outside, not the squares inside. Count the unit edges along the top, the right side, the bottom and the left side, then add them.',
    explain: `The rectangle is ${u(w, 'unit')} by ${u(h, 'unit')}. ${w} + ${h} + ${w} + ${h} = ${p} units.`,
    ...mcP(rng, p, [w * h, w + h, 2 * w + h, p + 2, p - 2].filter((x) => x > 0 && x !== p), [], (x) => `${x} units`),
  };
};

const perIrregular = (rng, t) => {
  const rows = 6;
  const cells = skyline(rng, t <= 2 ? 3 : 5, t <= 2 ? 2 : 4, rows);
  const p = cellsPerimeter(cells);
  return {
    prompt: 'What is the perimeter of the shaded shape? Each square is 1 unit on each side.',
    visual: { type: 'grid', cols: 8, rows, cells, showUnits: true },
    hint: 'How far is it all the way around this shape? Put your finger on one corner and trace the outside edge, counting every unit edge (including each step up and down) until you are back where you started.',
    explain: `Going all the way around the outside, there are ${p} unit edges. The perimeter is ${p} units.`,
    ...mcP(rng, p, [cells.length, p + 2, p - 2, p + 1].filter((x) => x > 0 && x !== p), [], (x) => `${x} units`),
  };
};

const REG_POLY = [['square', 4, 'square'], ['equilateral_triangle', 3, 'triangle with equal sides'], ['pentagon', 5, 'regular pentagon'], ['hexagon', 6, 'regular hexagon'], ['octagon', 8, 'regular octagon']];
const perSides = (rng, t) => {
  const unit = pick(rng, ['cm', 'm', 'cm', 'dm']);
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const [shape, n, label] = pick(rng, t <= 3 ? REG_POLY.slice(0, 4) : REG_POLY);
    const s = randInt(rng, 2, t <= 3 ? 5 : 10);
    const p = n * s;
    const q = {
      prompt: `Each side of this ${label} is ${s} ${unit}. What is its perimeter?`,
      visual: { type: 'shapes', items: [{ shape, color: pick(rng, COLOURS), label: `${s} ${unit}` }] },
      hint: `How far is it all the way around? All ${n} sides are ${s} ${unit} long, so add ${s} once for each of the ${n} sides, or skip count by ${s}s ${n} times.`,
      explain: `${Array(n).fill(s).join(' + ')} = ${p} ${unit}.`,
    };
    if (chance(rng, 0.4)) return { ...q, kind: 'num', answer: num(p) };
    return { ...q, ...mcP(rng, p, [s * (n - 1), s + n, p + s, s * s].filter((x) => x !== p), [], (x) => `${x} ${unit}`) };
  }
  if (k === 1) {
    const L = randInt(rng, 3, 12), W = randInt(rng, 2, L - 1);
    const p = 2 * (L + W);
    const q = {
      prompt: `A rectangle is ${L} ${unit} long and ${W} ${unit} wide. What is its perimeter?`,
      visual: { type: 'shapes', items: [{ shape: 'rectangle', color: pick(rng, COLOURS), label: `${L} ${unit} by ${W} ${unit}` }] },
      hint: `How far is it around? A rectangle has two sides of ${L} ${unit} and two sides of ${W} ${unit}. Add all four sides.`,
      explain: `${L} + ${W} + ${L} + ${W} = ${p} ${unit}.`,
    };
    if (chance(rng, 0.4)) return { ...q, kind: 'num', answer: num(p) };
    return { ...q, ...mcP(rng, p, [L + W, L * W, 2 * L + W, p + 2].filter((x) => x !== p), [], (x) => `${x} ${unit}`) };
  }
  const a = randInt(rng, 3, 12), b = randInt(rng, 3, 12);
  const c = randInt(rng, Math.abs(a - b) + 1, a + b - 1);
  const p = a + b + c;
  return {
    kind: 'num',
    prompt: `A triangle has sides of ${a} ${unit}, ${b} ${unit} and ${c} ${unit}. What is its perimeter in ${unit}?`,
    visual: { type: 'shapes', items: [{ shape: 'triangle', color: pick(rng, COLOURS) }] },
    hint: `How far is it around the triangle? Add the three side lengths, ${a} + ${b} + ${c}. Look for two that make a friendly number first.`,
    explain: `${a} + ${b} + ${c} = ${p} ${unit}.`,
    answer: num(p),
  };
};

const perIrregularSides = (rng, t) => {
  const n = pick(rng, [5, 6]);
  const unit = pick(rng, ['cm', 'm']);
  const sides = Array.from({ length: n }, () => randInt(rng, 2, t >= 6 ? 25 : 12));
  const p = sides.reduce((s, x) => s + x, 0);
  return {
    kind: 'num',
    prompt: `An irregular ${n === 5 ? 'pentagon' : 'hexagon'} has sides of ${sides.slice(0, -1).map((x) => `${x} ${unit}`).join(', ')} and ${sides[n - 1]} ${unit}. What is its perimeter in ${unit}?`,
    visual: { type: 'shapes', items: [{ shape: n === 5 ? 'irregular_pentagon' : 'irregular_hexagon', color: pick(rng, COLOURS) }] },
    hint: `How far is it around? Add all ${n} side lengths. Look for pairs that make a friendly ten to add faster.`,
    explain: `${sides.join(' + ')} = ${p} ${unit}.`,
    answer: num(p),
  };
};

const perWord = (rng, t) => {
  const who = nm(rng);
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const L = randInt(rng, 3, 15), W = randInt(rng, 2, L);
    const thing = pick(rng, ['garden', 'dragon pen', 'playground', 'sandbox', 'goat pen']);
    return { kind: 'num', prompt: `${who} puts a fence around a ${thing} that is ${L} m long and ${W} m wide. How many metres of fence are needed?`, visual: { type: 'grid', cols: Math.max(L + 2, 8), rows: Math.max(W + 2, 6), rect: { x: 1, y: 1, w: Math.min(L, 12), h: Math.min(W, 10) } }, hint: `How much fence goes all the way around? The ${thing} has two sides of ${L} m and two sides of ${W} m. Add all four sides.`, explain: `${L} + ${W} + ${L} + ${W} = ${2 * (L + W)} m.`, answer: num(2 * (L + W)) };
  }
  if (k === 1) {
    const s = randInt(rng, 5, 25);
    const thing = pick(rng, ['square card', 'square photo', 'square tile', 'square spell book']);
    return { kind: 'num', prompt: `${who} glues ribbon around the edge of a ${thing}. Each side is ${s} cm. How much ribbon is needed, in cm?`, hint: `How much ribbon goes around the edge? A square has 4 equal sides, each ${s} cm. Add ${s} four times, or double it and double again.`, explain: `${s} + ${s} + ${s} + ${s} = ${4 * s} cm.`, answer: num(4 * s) };
  }
  const sides = [randInt(rng, 3, 9), randInt(rng, 3, 9), randInt(rng, 3, 9)];
  sides[2] = Math.min(sides[2], sides[0] + sides[1] - 1);
  return { kind: 'num', prompt: `An ant walks around a triangle-shaped leaf with sides ${sides[0]} cm, ${sides[1]} cm and ${sides[2]} cm. How far does it walk to get back to the start?`, hint: `How far is it all the way around the leaf? That is the perimeter: add the three sides, ${sides[0]} + ${sides[1]} + ${sides[2]}.`, explain: `${sides.join(' + ')} = ${sides[0] + sides[1] + sides[2]} cm.`, answer: num(sides[0] + sides[1] + sides[2]) };
};

const perMissing = (rng, t) => {
  const unit = pick(rng, ['cm', 'm']);
  const k = randInt(rng, 0, t >= 6 ? 2 : 0);
  if (k === 0) {
    const a = randInt(rng, 3, 12), b = randInt(rng, 3, 12);
    const c = randInt(rng, Math.abs(a - b) + 1, a + b - 1);
    const p = a + b + c;
    return { kind: 'num', prompt: `A triangle has a perimeter of ${p} ${unit}. Two sides are ${a} ${unit} and ${b} ${unit}. How long is the third side?`, hint: `What is the third side? All three sides add up to ${p} ${unit}. Add the two sides you know, ${a} + ${b}, then find how much more it takes to reach ${p}.`, explain: `${a} + ${b} = ${a + b}. ${p} − ${a + b} = ${c} ${unit}.`, answer: num(c) };
  }
  if (k === 1) {
    const L = randInt(rng, 4, 12), W = randInt(rng, 1, L - 1);
    const p = 2 * (L + W);
    return { kind: 'num', prompt: `A rectangle has a perimeter of ${p} ${unit}. It is ${L} ${unit} long. How wide is it?`, visual: { type: 'shapes', items: [{ shape: 'rectangle', color: pick(rng, COLOURS), label: `${L} ${unit}` }] }, hint: `How wide is it? The perimeter is two lengths plus two widths. Take the two lengths (${L} + ${L}) away from ${p}; what is left is two widths, so split it in half.`, explain: `${L} + ${L} = ${2 * L}. ${p} − ${2 * L} = ${2 * W}, and half of ${2 * W} is ${W}. So it is ${W} ${unit} wide.`, answer: num(W) };
  }
  const s = randInt(rng, 2, 10);
  return { kind: 'num', prompt: `A square has a perimeter of ${4 * s} ${unit}. How long is each side?`, visual: { type: 'shapes', items: [{ shape: 'square', color: pick(rng, COLOURS) }] }, hint: `How long is each side? A square has four equal sides that add up to ${4 * s} ${unit}. Share ${4 * s} into four equal parts.`, explain: `${4 * s} ÷ 4 = ${s}, so each side is ${s} ${unit}.`, answer: num(s) };
};

const perCompare = (rng, t) => {
  let s, L, W;
  do { s = randInt(rng, 3, 9); L = randInt(rng, 3, 12); W = randInt(rng, 1, L - 1); } while (4 * s === 2 * (L + W));
  const unit = pick(rng, ['cm', 'm']);
  const sq = `the square (${s} ${unit} sides)`, re = `the rectangle (${L} ${unit} by ${W} ${unit})`;
  const bigger = 4 * s > 2 * (L + W) ? sq : re;
  return {
    prompt: `Which has the bigger perimeter: a square with ${s} ${unit} sides, or a rectangle ${L} ${unit} long and ${W} ${unit} wide?`,
    visual: { type: 'shapes', items: [{ shape: 'square', color: 'blue', label: `${s} ${unit}` }, { shape: 'rectangle', color: 'orange', label: `${L} ${unit} by ${W} ${unit}` }] },
    hint: `Which one is farther around? The square's perimeter is 4 sides of ${s} ${unit}. The rectangle's is ${L} + ${W} + ${L} + ${W}. Work out both, then compare.`,
    explain: `Square: 4 × ${s} = ${4 * s} ${unit}. Rectangle: ${L} + ${W} + ${L} + ${W} = ${2 * (L + W)} ${unit}. So ${bigger} has the bigger perimeter.`,
    ...fixedChoices([cap(sq), cap(re)], cap(bigger)),
  };
};

const perSamePreview = (rng, t) => {
  const P = pick(rng, [10, 12, 14, 16, 18]);
  const half = P / 2;
  const w = randInt(rng, 1, Math.floor(half / 2)), h = half - w;
  const G = (ww, hh) => ({ type: 'grid', cols: 10, rows: 9, rect: { x: 0, y: 0, w: ww, h: hh } });
  const wrongs = [[w + 1, h], [w, h + 1], [w + 1, h + 1], [w + 2, h], [Math.max(1, w - 1), h], [w, h - 1]].filter(([a, b]) => 2 * (a + b) !== P && a >= 1 && b >= 1 && a <= 10 && b <= 9);
  return {
    prompt: `Big challenge! Which rectangle has a perimeter of ${P} units?`,
    hint: `Which rectangle has a perimeter of ${P} units? For each one, count its length and width, add them, then double it. Only one gives ${P}.`,
    explain: `${w} + ${h} + ${w} + ${h} = ${P}. The ${w} by ${h} rectangle has a perimeter of ${P} units.`,
    ...mcV(rng, G(w, h), shuffle(rng, wrongs).map(([a, b]) => G(a, b))),
  };
};

const g3Perimeter = {
  id: 'g3-classic-perimeter', grade: 3, strand: 'shape', bigIdea: 'measurement', species: 'measurer',
  name: 'Perimeter',
  parentDesc: 'Classic outcome (older guide): finds the perimeter of regular and irregular shapes by counting units and adding side lengths.',
  classic: true,
  gen: tiered([
    [1, 3, perRect, 2], [1, 4, perIrregular, 2], [3, 5, perSides, 2], [4, 6, perIrregularSides], [4, 6, perWord, 0.5],
    [5, 7, perMissing, 1.5], [6, 7, perCompare], [4, 7, perWord, 1], [7, 7, perSamePreview, 0.6, PREVIEW],
  ]),
};

// ---------------------------------------------------------------------------
// Classic: time units – seconds/minute, minutes/hour, days/month (older Grade 3 SS2)
// ---------------------------------------------------------------------------
const tuBasic = (rng, t) => {
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const h = randInt(rng, 1, 12), m = randInt(rng, 0, 11) * 5;
    return {
      prompt: 'The minute hand goes all the way around the clock once. How many minutes pass?',
      visual: { type: 'clock', hour: h, minute: m },
      hint: 'How many minutes does one full trip around take? The numbers on the clock are 5 minutes apart. Count by 5s around all 12 numbers.',
      explain: 'Once around the clock is 12 jumps of 5 minutes: 60 minutes, which is 1 hour.',
      ...mcP(rng, '60 minutes', ['100 minutes', '12 minutes', '24 minutes', '30 minutes'], [], String),
    };
  }
  if (k === 1) {
    const y = randInt(rng, 2024, 2031), mo = randInt(rng, 1, 12);
    const n = daysIn(mo, y);
    return {
      // Worded without "how many days" so the calendar stays on screen: it is the tool for this question.
      prompt: `The calendar shows ${MONTHS[mo - 1]} ${y}. What is the number of its last day?`,
      visual: { type: 'calendar', month: mo, year: y },
      hint: `Find the very last number on the ${MONTHS[mo - 1]} calendar. The last day's number tells how many days the month has.`,
      explain: `The last day of ${MONTHS[mo - 1]} ${y} is the ${ordinal(n)}, so it has ${n} days.`,
      ...mcP(rng, n, [28, 29, 30, 31, 7].filter((x) => x !== n), [], String),
    };
  }
  const sec = chance(rng, 0.5);
  return {
    prompt: sec ? 'How many seconds are in 1 minute?' : 'How many minutes are in 1 hour?',
    visual: { type: 'clock', hour: randInt(rng, 1, 12), minute: randInt(rng, 0, 59) },
    hint: sec ? 'The second hand moves one small mark each second. How many small marks go all the way around?' : 'The minute hand moves one small mark each minute. Count the marks around the clock by 5s.',
    explain: sec ? 'There are 60 seconds in 1 minute.' : 'There are 60 minutes in 1 hour.',
    ...mcP(rng, '60', ['100', '10', '24', '30'], [], String),
  };
};

const tuConvert = (rng, t) => {
  const k = randInt(rng, 0, t >= 4 ? 5 : 2);
  let prompt, ans, hint, explain, speak;
  switch (k) {
    case 0: { const n = randInt(rng, 2, t <= 2 ? 3 : 5); prompt = `${n} minutes = □ seconds`; speak = `${n} minutes equals how many seconds?`; ans = 60 * n; hint = `How many seconds are in ${n} minutes? Each minute is 60 seconds. Add 60 once for each minute.`; explain = `${Array(n).fill(60).join(' + ')} = ${ans} seconds.`; break; }
    case 1: { const n = randInt(rng, 2, t <= 2 ? 3 : 5); prompt = `${n} hours = □ minutes`; speak = `${n} hours equals how many minutes?`; ans = 60 * n; hint = `How many minutes are in ${n} hours? Each hour is 60 minutes. Add 60 once for each hour.`; explain = `${Array(n).fill(60).join(' + ')} = ${ans} minutes.`; break; }
    case 2: { const half = chance(rng, 0.5); prompt = half ? 'Half an hour = □ minutes' : 'Half a minute = □ seconds'; speak = half ? 'Half an hour equals how many minutes?' : 'Half a minute equals how many seconds?'; ans = 30; hint = half ? 'Half an hour is one of two equal parts of an hour. An hour is 60 minutes: split 60 into two equal parts.' : 'Half a minute is one of two equal parts of a minute. A minute is 60 seconds: split 60 into two equal parts.'; explain = 'Half of 60 is 30.'; break; }
    case 3: { const m = randInt(rng, 5, 55); prompt = `1 hour ${m} minutes = □ minutes`; speak = `1 hour ${m} minutes equals how many minutes?`; ans = 60 + m; hint = `How many minutes in 1 hour ${m} minutes? Change the 1 hour into minutes first (1 hour = 60 minutes). Then add the extra ${m} minutes.`; explain = `60 + ${m} = ${ans} minutes.`; break; }
    case 4: { const s = randInt(rng, 5, 55); prompt = `1 minute ${s} seconds = □ seconds`; speak = `1 minute ${s} seconds equals how many seconds?`; ans = 60 + s; hint = `How many seconds in 1 minute ${s} seconds? Change the 1 minute into seconds first (1 minute = 60 seconds). Then add the extra ${s} seconds.`; explain = `60 + ${s} = ${ans} seconds.`; break; }
    default: { const n = randInt(rng, 2, 5); prompt = `${60 * n} minutes = □ hours`; speak = `${60 * n} minutes equals how many hours?`; ans = n; hint = `How many hours is ${60 * n} minutes? Every 60 minutes makes 1 hour. How many groups of 60 fit into ${60 * n}?`; explain = `${Array(n).fill(60).join(' + ')} = ${60 * n}, so ${60 * n} minutes = ${n} hours.`; }
  }
  return { kind: 'num', prompt, speak, hint, explain, answer: num(ans) };
};

const tuCompare = (rng, t) => {
  const k = randInt(rng, 0, 2);
  let a, b, av, bv;
  if (k === 0) { const s = randInt(rng, 3, 12) * 10; a = `${s} seconds`; av = s; b = '1 minute'; bv = 60; if (s === 60) { a = '70 seconds'; av = 70; } }
  else if (k === 1) { const m = randInt(rng, 3, 11) * 10 + pick(rng, [0, 5]); a = `${m} minutes`; av = m; b = '1 hour'; bv = 60; if (m === 60) { a = '65 minutes'; av = 65; } }
  else { const h = randInt(rng, 2, 3); const m = h * 60 + pick(rng, [-20, -10, 10, 20, 30]); a = `${h} hours`; av = h * 60; b = `${m} minutes`; bv = m; }
  const longer = chance(rng, 0.6);
  const ans = (longer ? av > bv : av < bv) ? a : b;
  return {
    prompt: `Which is ${longer ? 'longer' : 'shorter'}: ${a} or ${b}?`,
    hint: `Which is ${longer ? 'longer' : 'shorter'}: ${a} or ${b}? Change both to the same unit first: 1 minute = 60 seconds and 1 hour = 60 minutes. Then compare the numbers.`,
    explain: `${a} ${k === 2 ? `= ${av} minutes` : ''} and ${b}${k === 2 ? '' : ` = ${bv} ${k === 0 ? 'seconds' : 'minutes'}`}. So ${ans} is ${longer ? 'longer' : 'shorter'}.`.replace('  ', ' '),
    ...fixedChoices([a, b], ans),
  };
};

const MONTH_RHYME = 'Thirty days has September, April, June and November. All the rest have 31, except February.';
const tuMonths = (rng, t) => {
  const k = randInt(rng, 0, 2);
  if (k === 0) {
    const mo = randInt(rng, 1, 12);
    const n = daysIn(mo, 2027);
    return {
      prompt: `How many days are in ${MONTHS[mo - 1]}?${mo === 2 ? ' (not a leap year)' : ''}`,
      hint: `How many days are in ${MONTHS[mo - 1]}? Make two fists and count the months across your knuckles and the dips between them, starting with the first month of the year on your first knuckle. Knuckle months have 31 days, dip months have 30, and February has 28 (29 in a leap year).`,
      explain: `${MONTHS[mo - 1]} has ${n} days.`,
      ...mcP(rng, n, [28, 30, 31, 29].filter((x) => x !== n), [], String),
    };
  }
  if (k === 1) {
    const want = pick(rng, [30, 31]);
    const good = pick(rng, MONTHS.filter((_, i) => daysIn(i + 1, 2027) === want));
    const bad = sample(rng, MONTHS.filter((_, i) => daysIn(i + 1, 2027) !== want), 3);
    return {
      prompt: `Which month has ${want} days?`,
      hint: `Which month has ${want} days? Make two fists and count the months across your knuckles and the dips between them, starting with the first month of the year on your first knuckle. Knuckle months have 31 days, dip months have 30, and February has 28 (29 in a leap year). Check each choice.`,
      explain: `${good} has ${want} days.`,
      ...mcP(rng, good, bad, [], String),
    };
  }
  const y = pick(rng, [2027, 2028]);
  return {
    prompt: `Which month has the fewest days?`,
    visual: { type: 'calendar', month: 2, year: y },
    hint: 'Which month has the fewest days? Most months have 30 or 31 days, but one winter month is much shorter. Count the months on your knuckles if you need to.',
    explain: `February has only 28 days (29 in a leap year). Every other month has 30 or 31.`,
    ...mcP(rng, 'February', sample(rng, MONTHS.filter((m) => m !== 'February'), 3), [], String),
  };
};

const ACTIVITIES = {
  seconds: ['clap once', 'blink', 'sneeze', 'jump once', 'snap fingers'],
  minutes: ['brush teeth', 'tie shoes', 'wash hands', 'eat a snack', 'read a short poem'],
  hours: ['watch a movie', 'sleep at night', 'spend a day at school', 'play a hockey game', 'drive from Moncton to Halifax'],
  days: ['go on a camping trip', 'grow a bean sprout', 'wait for a new moon', 'go on a family road trip'],
};
const tuActivity = (rng, t) => {
  const unit = pick(rng, Object.keys(ACTIVITIES));
  const act = pick(rng, ACTIVITIES[unit]);
  const who = nm(rng);
  return {
    prompt: `${who} wants to time how long it takes to ${act}. Which unit is best?`,
    hint: `How long does it take to ${act}? Seconds are for things over in a blink. Minutes are for short jobs, like washing up. Hours are for long things, like a movie; days are for things that last many sleeps.`,
    explain: `It takes a few ${unit} to ${act}, so ${unit} are the best unit.`,
    ...fixedChoices(['seconds', 'minutes', 'hours', 'days'], unit),
  };
};

const tuProblem = (rng, t) => {
  const who = nm(rng);
  const k = randInt(rng, 0, 4);
  if (k === 0) { const m = randInt(rng, 5, 50); return { kind: 'num', prompt: `${who} practised piano for 1 hour and ${m} minutes. How many minutes is that?`, hint: `How many minutes is 1 hour and ${m} minutes? Change the 1 hour to minutes first (1 hour = 60 minutes), then add the extra ${m}.`, explain: `1 hour = 60 minutes. 60 + ${m} = ${60 + m} minutes.`, answer: num(60 + m) }; }
  if (k === 1) { const w = randInt(rng, 2, 4); return { kind: 'num', prompt: `${who}'s summer camp lasts ${w} weeks. How many days is that?`, hint: `How many days are in ${w} weeks? Each week has 7 days. Add 7 once for each week.`, explain: `${Array(w).fill(7).join(' + ')} = ${7 * w} days.`, answer: num(7 * w) }; }
  if (k === 2) { const [a, b] = pick(rng, [[3, 4], [6, 7], [9, 10], [4, 5], [7, 8], [11, 12], [1, 2]]); const n = daysIn(a, 2027) + daysIn(b, 2027); return { kind: 'num', prompt: `How many days are in ${MONTHS[a - 1]} and ${MONTHS[b - 1]} together?${a === 2 || b === 2 ? ' (not a leap year)' : ''}`, hint: `How many days are in both months? Find how many days ${MONTHS[a - 1]} has and how many ${MONTHS[b - 1]} has (count on your knuckles), then add them.`, explain: `${MONTHS[a - 1]}: ${daysIn(a, 2027)}. ${MONTHS[b - 1]}: ${daysIn(b, 2027)}. ${daysIn(a, 2027)} + ${daysIn(b, 2027)} = ${n}.`, answer: num(n) }; }
  if (k === 3) { const r = randInt(rng, 3, 5); return { kind: 'num', prompt: `A sand timer runs for 60 seconds. ${who} turns it over ${r} times in a row. How many minutes pass?`, hint: 'How many minutes pass? One full run of the timer is 60 seconds, which is 1 minute. How many runs are there?', explain: `Each 60 seconds is 1 minute, so ${r} timers make ${r} minutes.`, answer: num(r) }; }
  const total = pick(rng, [15, 20, 30, 45]); const used = randInt(rng, 3, total - 3);
  return { kind: 'num', prompt: `Recess is ${total} minutes long. ${who} has played tag for ${used} minutes. How many minutes of recess are left?`, hint: `How much recess is left? Recess is ${total} minutes and ${used} minutes are used up. Take the used time away from the whole recess.`, explain: `${total} − ${used} = ${total - used} minutes.`, answer: num(total - used) };
};

const tuUntil = (rng, t, opts = {}) => {
  const k = t >= 7 && opts.challenge ? pick(rng, [0, 0, 1, 1, 2, 3]) : randInt(rng, 0, 1); // ×24 and ×60 go past Grade 3 facts: challenge mode only
  if (k === 0) {
    const mo = randInt(rng, 1, 12), dim = daysIn(mo, 2027);
    const d = dim - randInt(rng, 1, 5), next = randInt(rng, 1, 5);
    const ans = dim - d + next;
    const mo2 = mo % 12 + 1;
    return { kind: 'num', prompt: `Today is ${MONTHS[mo - 1]} ${d}. Use the calendar. How many more days until ${MONTHS[mo2 - 1]} ${next}?`, visual: { type: 'calendar', month: mo, year: 2027, highlight: [d] }, hint: `How many days until ${MONTHS[mo2 - 1]} ${next}? First count the days left in ${MONTHS[mo - 1]}: it has ${dim} days, so count from the ${ordinal(d)} up to the ${ordinal(dim)}. Then add the days into ${MONTHS[mo2 - 1]}.`, explain: `${MONTHS[mo - 1]} has ${dim} days. From the ${ordinal(d)} to the ${ordinal(dim)} is ${u(dim - d, 'day')}, then ${next} more: ${ans} days.`, answer: num(ans) };
  }
  if (k === 1) {
    const mins = randInt(rng, 70, 115);
    const cmp = 90;
    const ans = mins > cmp ? 'Longer' : mins < cmp ? 'Shorter' : 'The same';
    return { prompt: `${nm(rng)}'s movie is ${mins} minutes long. Is that longer or shorter than 1 hour 30 minutes?`, hint: `Is ${mins} minutes longer or shorter than 1 hour 30 minutes? Change 1 hour 30 minutes into minutes (1 hour is 60 minutes). Then compare it with ${mins}.`, explain: `1 hour 30 minutes = 60 + 30 = 90 minutes. ${mins} minutes is ${ans.toLowerCase()}${ans === 'The same' ? '' : ' than 90 minutes'}.`, ...fixedChoices(['Longer', 'The same', 'Shorter'], ans) };
  }
  if (k === 2) { const d = randInt(rng, 2, 4); return { kind: 'num', prompt: `Big challenge! There are 24 hours in a day. How many hours are in ${d} days?`, hint: `How many hours are in ${d} days? Each day has 24 hours. Add 24 once for each day.`, explain: `${Array(d).fill(24).join(' + ')} = ${24 * d} hours.`, answer: num(24 * d) }; }
  const m = randInt(rng, 4, 9);
  return { kind: 'num', prompt: `Big challenge! How many seconds are in ${m} minutes?`, hint: `How many seconds are in ${m} minutes? Each minute is 60 seconds, so you need ${m} groups of 60. Think of ${m} × 6 tens.`, explain: `${m} × 60 = ${m * 60} seconds.`, answer: num(m * 60) };
};

const g3TimeUnits = {
  id: 'g3-classic-timeunits', grade: 3, strand: 'shape', bigIdea: 'measurement', species: 'clockwork',
  name: 'Seconds, Minutes & Days',
  parentDesc: 'Classic outcome (older guide): relates seconds to a minute, minutes to an hour, and days to a month in problems.',
  classic: true,
  gen: tiered([
    [1, 2, tuBasic, 2], [2, 5, tuConvert, 2], [3, 5, tuCompare, 1.5], [2, 4, tuMonths, 1.5], [3, 5, tuActivity], [4, 7, tuProblem, 2], [6, 7, tuUntil, 2],
  ]),
};

// ---------------------------------------------------------------------------
export const skills = [
  g3Represent, g3Fractions, g3Count, g3AddSub, g3MulDiv, g3Facts, g3Equations, g3Patterns, g3Time, g3Measure,
  g3Polygons, g3Data, g3Chance, g3Money, g3Perimeter, g3TimeUnits,
];

export const SKIPPED = [
  { skillId: 'g3-data-data', indicator: 'Collect first-hand data (surveys, tallies) and build a graph', reason: 'Needs real data collection and drawing; covered instead by picture-based questions (choosing a survey question, matching a table to its bar graph, first-hand vs second-hand).' },
  { skillId: 'g3-meas-measure', indicator: 'Measure real objects in m, dm and cm; estimate using personal referents', reason: 'Needs physical objects; adapted to reading a drawn ruler or scale and choosing the best referent or unit.' },
  { skillId: 'g3-geo-polygons', indicator: 'Build or sort polygons and polyhedrons with materials', reason: 'Hands-on building; adapted to identifying, naming and counting attributes from pictures.' },
  { skillId: 'g3-data-chance', indicator: 'Run chance experiments and record results', reason: 'Needs a real experiment; adapted to predicting outcomes from pictures of bags, spinners and dice.' },
  { skillId: 'g3-pat-patterns', indicator: 'Create repeating and growing patterns with materials, sounds or actions', reason: 'Creating and acting out patterns cannot be checked by the game; extending, rule-finding and error-spotting are covered.' },
  { skillId: 'g3-ops-addsub', indicator: 'Explain a personal strategy in words', reason: 'Open-ended explanation; adapted to choosing which strategy works.' },
];

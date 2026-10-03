// Grade 5 question generators (NB Holistic Mathematics curriculum, Grade 5, plus "classic" skills from the older guide).
// Every random choice goes through the rng passed to gen(tier, rng).
import {
  randInt, pick, chance, shuffle, sample, gcd, fmtNum, clean, fmtMoney, frac, mixed,
  numWords, time12, time24, mc, mcNum, mcVisual, numAnswer,
} from '../qutil.js';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------
const R = randInt;
const NAMES = ['Ava', 'Liam', 'Noor', 'Kai', 'Priya', 'Mateo', 'Chloé', 'Owen', 'Aiyana', 'Sam', 'Zara', 'Ethan', 'Mia',
  'Jonah', 'Leila', 'Arjun', 'Émile', 'Hana', 'Lucas', 'Amara', 'Felix', 'Sofia', 'Omar', 'Ruby', 'Theo', 'Maya', 'Wyatt',
  'Isla', 'Dev', 'Elise', 'Nia', 'Gabriel'];
const nm = (rng) => pick(rng, NAMES);
const two = (rng) => sample(rng, NAMES, 2);
const dn = (x) => fmtNum(clean(x));
const decPlaces = (x) => { const s = String(clean(x)); const i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const an = (w) => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
const sum = (a) => a.reduce((x, y) => x + y, 0);

const ORD = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };
function fracSay(n, d) {
  if (d === 2) return `${numWords(n)} ${n === 1 ? 'half' : 'halves'}`;
  if (d === 4) return `${numWords(n)} ${n === 1 ? 'fourth' : 'fourths'}`;
  const words = numWords(d).split(' ');
  if (words.length > 1 && words[0] === 'one') words.shift();
  const parts = words.pop().split('-');
  const l = parts.pop();
  parts.push(ORD[l] || (l.endsWith('y') ? l.slice(0, -1) + 'ieth' : l + 'th'));
  words.push(parts.join('-'));
  return `${numWords(n)} ${words.join(' ')}${n === 1 ? '' : 's'}`;
}

// Read-aloud text from a prompt with symbols.
function say(s) {
  return s
    .replace(/\(([^()]*[×÷+−][^()]*)\)/g, ' open bracket $1 close bracket ')
    .replace(/\[\[f:(\d+) (\d+)\/(\d+)\]\]/g, (_, w, n, d) => `${w} and ${fracSay(+n, +d)}`)
    .replace(/\[\[f:(\d+)\/(\d+)\]\]/g, (_, n, d) => fracSay(+n, +d))
    .replace(/\((\d+), (\d+)\)/g, '$1 comma $2')
    .replace(/(^|[\s(=,])−(?=\d)/g, '$1negative ')
    .replace(/cm³/g, ' cubic centimetres').replace(/m³/g, ' cubic metres')
    .replace(/cm²/g, ' square centimetres').replace(/m²/g, ' square metres')
    .replace(/(\d) ?km\b/g, '$1 kilometres').replace(/(\d) ?cm\b/g, '$1 centimetres').replace(/(\d) ?mm\b/g, '$1 millimetres')
    .replace(/(\d) ?dm\b/g, '$1 decimetres').replace(/(\d) m\b(?!\.)/g, '$1 metres').replace(/(\d) ?mL\b/g, '$1 millilitres')
    .replace(/(\d) L\b/g, '$1 litres').replace(/(\d) ?kg\b/g, '$1 kilograms').replace(/(\d) g\b/g, '$1 grams')
    .replace(/(\d) h\b/g, '$1 hours').replace(/(\d) min\b/g, '$1 minutes')
    .replace(/\b(\d+)([a-z])\b/g, '$1 $2')
    .replace(/−/g, ' minus ').replace(/×/g, ' times ').replace(/÷/g, ' divided by ').replace(/\+/g, ' plus ')
    .replace(/=\s*\?\s*$/, ' equals what?').replace(/\?(?=\s*,)/g, 'blank').replace(/ \?(?= \S)/g, ' question mark')
    .replace(/=/g, ' equals ').replace(/□/g, ' blank ').replace(/</g, ' is less than ').replace(/>/g, ' is greater than ')
    .replace(/%/g, ' percent').replace(/°/g, ' degrees').replace(/¼/g, 'one fourth').replace(/½/g, 'one half')
    .replace(/\(([^()]*[×÷+−][^()]*)\)/g, ' open bracket $1 close bracket ').replace(/[()]/g, ', ').replace(/…/g, ' and so on')
    .replace(/\s+/g, ' ').replace(/\s([?.,!])/g, '$1').replace(/,+([?.!,])/g, '$1').replace(/^,\s*/, '').trim();
}

const SYM = /[×÷−=<>□%°³²+¼½…]|\[\[f:/;
const tidy = (x) => (typeof x === 'string' ? x.replace(/([ap])\.m\.\./g, '$1.m.').replace(/…\./g, '…') : x);
function finish(q) {
  if (!q.kind) q.kind = 'mc';
  for (const k of ['prompt', 'hint', 'explain', 'speak']) if (q[k]) q[k] = tidy(q[k]);
  if (!q.speak) {
    const sp = say(q.prompt);
    if (SYM.test(q.prompt) || sp !== q.prompt.replace(/\s+/g, ' ').trim()) q.speak = sp;
  }
  return q;
}

// Multiple choice from a correct value and distractor values.
function mcq(rng, o) {
  const { correct, wrong, format, count, ...rest } = o;
  const m = mc(rng, correct, wrong, { format: format || ((x) => String(x)), count: count || 4 });
  return { kind: 'mc', ...rest, ...m };
}
// Multiple choice keeping the given order (e.g. impossible / possible / certain).
function fixedq(o) {
  const { choices, correct, ...rest } = o;
  return { kind: 'mc', ...rest, choices, answer: choices.indexOf(correct) };
}
function numq(o) {
  const { answer, ...rest } = o;
  return { kind: 'num', ...rest, answer: numAnswer(answer) };
}
// Numeric multiple choice with near misses.
function mcn(rng, o) {
  const { correct, extra = [], min = 0, max = Infinity, format = fmtNum, spread, ...rest } = o;
  return { kind: 'mc', ...rest, ...mcNum(rng, correct, { extra, min, max, format, spread }) };
}
// Decimal answer: keypad when the answer shows all `places` decimal places, otherwise multiple choice
// (so a kid typing 3.50 for 3.5 is never marked wrong).
function decq(rng, o, places, extra = [], maxPlaces = places) {
  const ans = clean(o.answer);
  if (decPlaces(ans) === places && !o.forceMc) {
    const { forceMc, ...rest } = o;
    return numq(rest);
  }
  const u = 10 ** -places;
  const cands = [...extra, ans + u, ans - u, ans + 0.1, ans - 0.1, ans + 1, ans - 1, ans * 10, ans / 10]
    .map((x) => clean(x)).filter((x) => x >= 0 && x !== ans && decPlaces(x) <= maxPlaces);
  const { answer, forceMc, ...rest } = o;
  return mcq(rng, { ...rest, correct: ans, wrong: cands, format: dn });
}
// Choose a format for the tier. fmts: [[loTier, hiTier, fn(tier, rng)], ...]
function gen(fmts) {
  const g = (tier, rng) => {
    const t = Math.max(1, Math.min(7, Math.round(tier) || 1));
    const ok = fmts.filter((f) => t >= f[0] && t <= f[1]);
    return finish(pick(rng, ok)[2](t, rng));
  };
  g.formats = fmts.map((f) => [f[0], f[1]]);
  return g;
}
const sName = (d) => fracSay(1, d).split(' ').pop(); // 'fourth'
const pName = (d) => fracSay(2, d).split(' ').pop(); // 'fourths'
// A times-table strategy for a × b that never states the product.
function factHint(a, b) {
  const [x, y] = a >= b ? [a, b] : [b, a];
  const o = (k) => (x === k ? y : x);
  if (x === 11) return `For × 11, find 10 × ${y} first, then add one more group of ${y}.`;
  if (x === 12) return `For × 12, find 10 × ${y} and 2 × ${y}, then add the two answers.`;
  if (y === 1) return 'One group of a number is just that number.';
  if (x === 10) return `Times ten puts a zero on the end of ${y}.`;
  if (x === 9 || y === 9) return `9 groups is 10 groups take away one group. Find 10 × ${o(9)}, then subtract ${o(9)}.`;
  if (x === 5 || y === 5) return `Count by 5s, ${o(5)} times. Or think of ten groups of ${o(5)} and take half.`;
  if (y === 2) return `× 2 is a double. Double ${x}.`;
  if (x === 4 || y === 4) return `× 4 is double, then double again. Double ${o(4)}, then double that answer.`;
  if (x === 8 || y === 8) return `× 8 is double, double, double. Double ${o(8)} three times.`;
  if (x === 6 || y === 6) return `Find 5 × ${o(6)}, then add one more group of ${o(6)}.`;
  if (x === 7 || y === 7) return `Split 7 into 5 and 2. Find 5 × ${o(7)} and 2 × ${o(7)}, then add them.`;
  return `× 3 is a double plus one more group. Double ${o(3)}, then add ${o(3)} more.`;
}
function chunkOf(n, d) {
  let c = Math.floor(n / (d * 10)) * d * 10;
  if (c === n / d || n - c === n / d) c -= d * 10;
  return c > 0 && c < n && c !== n / d && n - c !== n / d ? c : 0;
}
const CMP = (a, b) => (a < b ? '<' : a > b ? '>' : '=');

// Fractions {n, d}
const F = (n, d) => { const g = gcd(Math.abs(n), Math.abs(d)) || 1; return { n: n / g, d: d / g }; };
const fval = (f) => f.n / f.d;
const ftok = (f) => {
  const s = F(f.n, f.d);
  if (s.d === 1) return String(s.n);
  if (s.n < s.d) return frac(s.n, s.d);
  return mixed(Math.floor(s.n / s.d), s.n % s.d, s.d);
};
// Mixed-number token WITHOUT simplifying the fraction part (for counting by unit fractions).
const ctok = (num, d) => {
  if (num % d === 0) return String(num / d);
  if (num < d) return frac(num, d);
  return mixed(Math.floor(num / d), num % d, d);
};

// ---------------------------------------------------------------------------
// SD1  Represent numbers to 1 000 000
// ---------------------------------------------------------------------------
const PV = ['Millions', 'Hundred Thousands', 'Ten Thousands', 'Thousands', 'Hundreds', 'Tens', 'Ones'];
const PLACE = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions'];
const ndFor = (t) => [4, 5, 6, 6, 6, 6, 6][t - 1];
function randNum(rng, nd, zeroP = 0.25) {
  let s = String(R(rng, 1, 9));
  for (let i = 1; i < nd; i++) s += chance(rng, zeroP) ? '0' : String(R(rng, 0, 9));
  return Number(s);
}
const digs = (n) => String(n).split('').map(Number);
function swapDigits(rng, n) {
  const d = digs(n);
  if (d.length < 2) return n + 1;
  const i = R(rng, 0, d.length - 2);
  [d[i], d[i + 1]] = [d[i + 1], d[i]];
  if (d[0] === 0) return n + 10;
  return Number(d.join(''));
}
function nudgeDigit(rng, n) {
  const d = digs(n);
  const i = R(rng, 0, d.length - 1);
  d[i] = d[i] === 9 ? 8 : d[i] + 1;
  return Number(d.join(''));
}
function expandedTerms(n) {
  const d = digs(n);
  return d.map((x, i) => x * 10 ** (d.length - 1 - i)).filter((x) => x > 0);
}
const CONTEXT_BIG = [
  (w) => `A news story says a city has ${w} people.`, (w) => `A library has ${w} books.`, (w) => `A museum had ${w} visitors this year.`,
  (w) => `A hockey final was watched by ${w} fans.`, (w) => `A hiker took ${w} steps this summer.`, (w) => `A giant sack holds ${w} seeds.`,
  (w) => `A honey farm has ${w} bees.`, (w) => `A truck has been driven ${w} kilometres.`,
];

const represent = gen([
  // chart -> number
  [1, 3, (t, rng) => {
    const nd = ndFor(t), n = randNum(rng, nd);
    const cols = PV.slice(7 - nd);
    if (t >= 2 && chance(rng, 0.4)) {
      const d = digs(n), bi = R(rng, 0, nd - 1);
      return numq({
        prompt: `The chart shows ${fmtNum(n)}. Which digit goes in the ? column?`,
        visual: { type: 'placevalue', columns: cols, digits: d, blank: bi },
        answer: d[bi],
        hint: `Which digit of ${fmtNum(n)} belongs in the ${cols[bi]} column? Put your finger on the last digit of ${fmtNum(n)}: that is the Ones. Move left one digit for each column until you reach ${cols[bi]}.`,
        explain: `In ${fmtNum(n)}, the ${cols[bi]} digit is ${d[bi]}.`,
      });
    }
    return mcq(rng, {
      prompt: 'What number is shown in the place-value chart?',
      visual: { type: 'placevalue', columns: cols, digits: digs(n) },
      correct: n, wrong: [swapDigits(rng, n), swapDigits(rng, n), nudgeDigit(rng, n), Math.floor(n / 10), n * 10].filter((x) => x !== n),
      format: fmtNum,
      hint: 'You need to write the number the chart shows. Read the digits from left to right and write them in the same order. A 0 in a column still holds a place, so do not skip it. Put a space before the last three digits when the number has 5 or more digits.',
      explain: `The digits ${digs(n).join(', ')} in those columns make ${fmtNum(n)}.`,
    });
  }],
  // value of a digit
  [1, 7, (t, rng) => {
    const nd = ndFor(t), n = randNum(rng, nd, 0.15), d = digs(n);
    const idxs = d.map((x, i) => i).filter((i) => d[i] !== 0 && d.indexOf(d[i]) === d.lastIndexOf(d[i]));
    const i = idxs.length ? pick(rng, idxs) : 0;
    const p = nd - 1 - i, val = d[i] * 10 ** p;
    if (t >= 3 && chance(rng, 0.35)) {
      return fixedq({
        prompt: `In ${fmtNum(n)}, what place is the digit ${d[i]} in?`,
        choices: sample(rng, PLACE.slice(0, nd).filter((x) => x !== PLACE[p]), 3).concat(PLACE[p]).sort((a, b) => PLACE.indexOf(a) - PLACE.indexOf(b)),
        correct: PLACE[p],
        hint: `The question asks which place the ${d[i]} is in. Start at the last digit of ${fmtNum(n)} and say "ones". Move left one digit at a time: tens, hundreds, thousands, ten thousands, hundred thousands${nd > 6 ? ', millions' : ''}. Stop when you reach the ${d[i]}.`,
        explain: `The ${d[i]} in ${fmtNum(n)} is in the ${PLACE[p]} place, so it is worth ${fmtNum(val)}.`,
      });
    }
    return mcq(rng, {
      prompt: `What is the value of the digit ${d[i]} in ${fmtNum(n)}?`,
      visual: t <= 2 ? { type: 'placevalue', columns: PV.slice(7 - nd), digits: d } : undefined,
      correct: val, wrong: [val * 10, val / 10, d[i], val * 100, val / 100, val * 1000].filter((x) => Number.isInteger(x) && x !== val && x <= 10000000),
      format: fmtNum,
      hint: `The question asks what the ${d[i]} in ${fmtNum(n)} is really worth. First find its place by counting from the ones digit on the right. Then multiply the digit by its place. For example, a ${d[i] === 4 ? 3 : 4} in the hundreds place is worth ${d[i] === 4 ? 300 : 400}.`,
      explain: `The ${d[i]} is in the ${PLACE[p]} place, so it is worth ${d[i]} × ${fmtNum(10 ** p)} = ${fmtNum(val)}.`,
    });
  }],
  // words -> standard form, or standard -> words
  [2, 5, (t, rng) => {
    const n = randNum(rng, Math.max(5, ndFor(t)), 0.35);
    const A = Math.floor(n / 1000), B = n % 1000;
    const wrong = [A * 1000 + B * 10, A * 100 + B, A * 10000 + B, swapDigits(rng, n), nudgeDigit(rng, n)]
      .filter((x) => x !== n && x < 10000000 && x > 0);
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: `Which number is "${numWords(n)}"?`,
        correct: n, wrong, format: fmtNum,
        hint: `You need the number "${numWords(n)}" in digits. The words before "thousand" tell you the digits before the space. The words after "thousand" tell you the last three digits. If a place is missing in the words, write a 0 there.`,
        explain: `"${numWords(A)} thousand" is ${fmtNum(A * 1000)} and "${B ? numWords(B) : 'zero'}" is ${B}. Together: ${fmtNum(n)}.`,
      });
    }
    return mcq(rng, {
      prompt: `How do you write ${fmtNum(n)} in words?`,
      correct: numWords(n), wrong: wrong.map(numWords),
      hint: `You need to say ${fmtNum(n)} in words. Read the digits before the space (${fmtNum(A)}) as a number and add the word "thousand". Then read the last three digits (${String(B).padStart(3, '0')}) as a number. Check each choice for both parts.`,
      explain: `${fmtNum(n)} is ${fmtNum(A)} thousands and ${B} more: "${numWords(n)}".`,
    });
  }],
  // expanded form
  [2, 6, (t, rng) => {
    const n = randNum(rng, Math.max(5, ndFor(t)), 0.3);
    const terms = expandedTerms(n);
    const shown = t >= 4 ? shuffle(rng, terms) : terms;
    if (chance(rng, 0.55)) {
      return numq({
        prompt: `${shown.map(fmtNum).join(' + ')} = ?`,
        answer: n,
        hint: 'The parts add up to one number. The biggest part tells you how many digits the number has. Write the first digit of each part in its own place, and put a 0 in any place that has no part.',
        explain: `Adding the place values gives ${fmtNum(n)}.`,
      });
    }
    const w1 = expandedTerms(swapDigits(rng, n)), w2 = expandedTerms(nudgeDigit(rng, n));
    const w3 = terms.map((x, i) => (i === terms.length - 1 && x >= 10 ? x / 10 : x));
    const w4 = terms.map((x, i) => (i === 0 ? x / 10 : x));
    return mcq(rng, {
      prompt: `Which shows ${fmtNum(n)} in expanded form?`,
      correct: terms, wrong: [w1, w2, w3, w4], format: (a) => a.map(fmtNum).join(' + '),
      hint: `Expanded form splits ${fmtNum(n)} into the value of each digit. For each choice, check that every part matches a digit of ${fmtNum(n)} in the right place. For example, the first digit of ${fmtNum(n)} must show up as ${fmtNum(terms[0])}.`,
      explain: `${fmtNum(n)} = ${terms.map(fmtNum).join(' + ')}.`,
    });
  }],
  // renaming
  [3, 6, (t, rng) => {
    const kind = R(rng, 0, 2);
    if (kind === 0) {
      const unit = pick(rng, [100, 1000, 10000]), q = R(rng, 12, t >= 5 ? 950 : 99), n = q * unit;
      const uname = { 100: 'hundreds', 1000: 'thousands', 10000: 'ten thousands' }[unit];
      if (n > 1000000) return represent(3, rng);
      return numq({
        prompt: `How many ${uname} are in ${fmtNum(n)}?`, answer: q,
        hint: `The question asks how many groups of ${fmtNum(unit)} fit in ${fmtNum(n)}. ${fmtNum(unit)} has ${String(unit).length - 1} zeros. Cover the last ${String(unit).length - 1} zeros of ${fmtNum(n)} and read what is left.`,
        explain: `${fmtNum(n)} = ${q} × ${fmtNum(unit)}, so there are ${q} ${uname}.`,
      });
    }
    if (kind === 1) {
      const a = R(rng, 2, 60), b = R(rng, 10, 45);
      const n = a * 1000 + b * 100;
      return numq({
        prompt: `${a} thousands + ${b} hundreds = ?`, answer: n,
        hint: `You are joining ${a} thousands and ${b} hundreds. ${b} hundreds is more than 10 hundreds, so trade each group of 10 hundreds for 1 more thousand. Then write the thousands, and the hundreds that are left.`,
        explain: `${a} thousands = ${fmtNum(a * 1000)} and ${b} hundreds = ${fmtNum(b * 100)}. ${fmtNum(a * 1000)} + ${fmtNum(b * 100)} = ${fmtNum(n)}.`,
      });
    }
    const unit = pick(rng, [100, 1000, 10000]), q = R(rng, 11, 99) * (chance(rng, 0.5) ? 10 : 1), n = q * unit;
    if (n > 1000000) return represent(4, rng);
    const un = { 100: 'hundreds', 1000: 'thousands', 10000: 'ten thousands', 10: 'tens', 100000: 'hundred thousands' };
    const lab = (qq, u) => `${fmtNum(qq)} ${un[u]}`;
    return mcq(rng, {
      prompt: `Which is another name for ${fmtNum(n)}?`,
      correct: lab(q, unit), wrong: [lab(q, unit * 10), lab(q, unit / 10), lab(q * 10, unit), lab(q * 100, unit / 10 >= 10 ? unit / 10 : unit * 10)]
        .filter((s) => !s.includes('undefined')),
      hint: `Each choice says a number of a unit, like "12 thousands". Test each one: multiply the number by the unit (12 thousands = 12 × 1000 = 12 000). Only one choice makes exactly ${fmtNum(n)}.`,
      explain: `${fmtNum(n)} = ${fmtNum(q)} × ${fmtNum(unit)}, which is ${lab(q, unit)}.`,
    });
  }],
  // compare
  [1, 5, (t, rng) => {
    const nd = ndFor(t), a = randNum(rng, nd, 0.2);
    let b = chance(rng, 0.5) ? swapDigits(rng, a) : nudgeDigit(rng, a);
    if (chance(rng, 0.1)) b = a;
    if (t >= 3 && chance(rng, 0.5)) {
      const set = [a, swapDigits(rng, a), nudgeDigit(rng, a), swapDigits(rng, nudgeDigit(rng, a))];
      const uniq = [...new Set(set)];
      if (uniq.length >= 3) {
        const big = chance(rng, 0.5);
        const best = big ? Math.max(...uniq) : Math.min(...uniq);
        return mcq(rng, {
          prompt: `Which number is the ${big ? 'greatest' : 'least'}?`,
          correct: best, wrong: uniq.filter((x) => x !== best), format: fmtNum,
          hint: `You need the ${big ? 'greatest' : 'least'} number. They all have the same number of digits, so compare them one place at a time, starting on the left. The first place where the digits are different decides which number is ${big ? 'bigger' : 'smaller'}.`,
          explain: `Comparing place by place from the left, ${fmtNum(best)} is the ${big ? 'greatest' : 'least'}.`,
        });
      }
    }
    const cols = PV.slice(7 - nd);
    return fixedq({
      prompt: `Which symbol makes this true? ${fmtNum(a)} □ ${fmtNum(b)}`,
      visual: t <= 2 ? { type: 'table', headers: cols, rows: [digs(a), digs(b)] } : undefined,
      choices: ['<', '>', '='], correct: CMP(a, b),
      hint: `How does ${fmtNum(a)} compare with ${fmtNum(b)}? < means "is less than" and > means "is greater than" (the open side faces the bigger number). = means they are the same. Compare the digits from the left until you find a place where they are different.`,
      explain: a === b ? 'The numbers are the same, so they are equal.'
        : `${fmtNum(a)} is ${a < b ? 'less' : 'greater'} than ${fmtNum(b)}, so ${fmtNum(a)} ${CMP(a, b)} ${fmtNum(b)}.`,
    });
  }],
  // order list
  [4, 6, (t, rng) => {
    const a = randNum(rng, 6, 0.2);
    const vals = [...new Set([a, swapDigits(rng, a), nudgeDigit(rng, a), a + pick(rng, [1000, 10000, -1000, 100])])].slice(0, 3);
    if (vals.length < 3) vals.push(a + 100000 <= 999999 ? a + 100000 : a - 100000);
    const up = chance(rng, 0.5);
    const sorted = vals.slice().sort((x, y) => (up ? x - y : y - x));
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].map((p) => p.map((i) => sorted[i]));
    const f = (arr) => arr.map(fmtNum).join(', ');
    return mcq(rng, {
      prompt: `Which list is in order from ${up ? 'least to greatest' : 'greatest to least'}?`,
      correct: sorted, wrong: perms.slice(1), format: f,
      hint: `You need the list that goes from ${up ? 'the smallest number to the biggest' : 'the biggest number to the smallest'}. Compare the numbers from the left: hundred thousands first, then ten thousands, and so on. Then check each list: is every number ${up ? 'smaller' : 'bigger'} than the one after it?`,
      explain: `In order from ${up ? 'least to greatest' : 'greatest to least'}: ${f(sorted)}.`,
    });
  }],
  // number line
  [2, 7, (t, rng) => {
    const scenes = t >= 7 ? [[R(rng, 1, 8) * 100000, 0, 10000], [R(rng, 10, 98) * 10000, 0, 1000]]
      : t <= 3 ? [[0, 100000, 10000], [0, 1000000, 100000], [R(rng, 1, 8) * 10000, 0, 1000]]
        : [[0, 1000000, 100000], [R(rng, 1, 8) * 100000, 0, 10000], [R(rng, 10, 90) * 10000, 0, 1000]];
    let [min, max, step] = pick(rng, scenes);
    if (max === 0) max = min + step * 10;
    if (t <= 4 || chance(rng, 0.5)) {
      const k = R(rng, 1, 9), v = min + k * step;
      return mcq(rng, {
        prompt: 'What number is the arrow pointing to?',
        visual: { type: 'numberline', min, max, ticks: step, labels: 'ends', arrow: v },
        correct: v, wrong: [v + step, v - step, min + k * step / 10, min + k * step * 10 <= 1000000 ? min + k * step * 10 : v + 2 * step],
        format: fmtNum,
        hint: `What number is at the arrow? From ${fmtNum(min)} to ${fmtNum(max)} there are 10 equal jumps, so each jump is ${fmtNum(max - min)} ÷ 10. Start at ${fmtNum(min)} and count jumps to the arrow.`,
        explain: `Each tick is ${fmtNum(step)}. The arrow is ${k} ticks after ${fmtNum(min)}: ${fmtNum(min)} + ${fmtNum(k * step)} = ${fmtNum(v)}.`,
      });
    }
    // closest benchmark
    const k = R(rng, 1, 8), off = R(rng, 1, 4) * step / 10 + R(rng, 0, 9) * step / 100;
    const v = min + k * step + (chance(rng, 0.5) ? off : step - off);
    const lo = min + k * step, hi = lo + step, near = v - lo < hi - v ? lo : hi;
    return fixedq({
      prompt: `Which benchmark is ${fmtNum(v)} closest to?`,
      visual: { type: 'numberline', min, max, ticks: step, labels: 'ends', marks: [{ value: v, label: fmtNum(v) }] },
      choices: [lo - step >= min ? lo - step : hi + step, lo, hi].sort((a, b) => a - b).map(fmtNum), correct: fmtNum(near),
      hint: `Which benchmark is nearest to ${fmtNum(v)}? It is between ${fmtNum(lo)} and ${fmtNum(hi)}, and the halfway point is ${fmtNum(lo + step / 2)}. Is ${fmtNum(v)} below or above the halfway point?`,
      explain: `The halfway point is ${fmtNum(lo + step / 2)}. ${fmtNum(v)} is ${v < lo + step / 2 ? 'below' : 'above'} it, so it is closest to ${fmtNum(near)}.`,
    });
  }],
  // closest of the benchmarks 0, 250 000, 500 000, 750 000, 1 000 000
  [3, 6, (t, rng) => {
    let v = R(rng, 2, 98) * 10000 + (t >= 5 ? R(rng, 1, 9) * 1000 : 0);
    const lo = Math.floor(v / 250000) * 250000, hi = lo + 250000;
    if (v === lo + 125000) v += 1000;
    const near = v - lo < hi - v ? lo : hi;
    const third = lo >= 250000 && (near === lo || hi + 250000 > 1000000) ? lo - 250000 : hi + 250000;
    return fixedq({
      prompt: `Which benchmark is ${fmtNum(v)} closest to?`,
      visual: { type: 'numberline', min: 0, max: 1000000, ticks: 250000, labels: 'all', marks: [{ value: v, label: fmtNum(v) }] },
      choices: [lo, hi, third].sort((a, b) => a - b).map(fmtNum), correct: fmtNum(near),
      hint: `${fmtNum(v)} is between the benchmarks ${fmtNum(lo)} and ${fmtNum(hi)}. The halfway point between them is ${fmtNum(lo + 125000)}. Is ${fmtNum(v)} below or above the halfway point?`,
      explain: `${fmtNum(v)} is ${v < lo + 125000 ? 'below' : 'above'} the halfway point ${fmtNum(lo + 125000)}, so it is closest to ${fmtNum(near)}.`,
    });
  }],
  // words in context -> keypad
  [4, 6, (t, rng) => {
    const n = randNum(rng, 6, 0.35);
    return numq({
      prompt: `${pick(rng, CONTEXT_BIG)(`"${numWords(n)}"`)} Type the number in digits.`,
      answer: n,
      hint: 'Type the number in digits. The words before "thousand" make the digits before the space. The words after "thousand" make the last three digits. Use a 0 for any place the words skip.',
      explain: `"${numWords(n)}" is ${fmtNum(n)}.`,
    });
  }],
  // more / less
  [5, 7, (t, rng) => {
    const step = t >= 6 ? R(rng, 2, 9) * pick(rng, t >= 7 ? [10000, 100000] : [1000, 10000]) + (t >= 7 && chance(rng, 0.5) ? R(rng, 1, 9) * 1000 : 0) : pick(rng, [1000, 10000, 100000]);
    const more = chance(rng, 0.5);
    const n = randNum(rng, 6, 0.2);
    const ans = more ? n + step : n - step;
    if (ans <= 0 || ans > 1000000) return represent(4, rng);
    return numq({
      prompt: `What number is ${fmtNum(step)} ${more ? 'more' : 'less'} than ${fmtNum(n)}?`,
      answer: ans,
      hint: t >= 6 ? `You need ${fmtNum(n)} ${more ? '+' : '−'} ${fmtNum(step)}. Line up the places and work from the right. If a column goes ${more ? 'past nine, carry to the next place' : 'below zero, regroup from the next place'}.` : `You need the number that is ${fmtNum(step)} ${more ? 'more' : 'less'} than ${fmtNum(n)}. Find the ${PLACE[String(step).length - 1]} digit of ${fmtNum(n)} and ${more ? 'add' : 'take away'} one there. The other digits stay the same, unless you need to regroup.`,
      explain: `${fmtNum(n)} ${more ? '+' : '−'} ${fmtNum(step)} = ${fmtNum(ans)}.`,
    });
  }],
  // greatest / least from digits
  [6, 7, (t, rng) => {
    const nd = 6, zeros = t >= 7 ? 2 : 1;
    const ds = [...Array(zeros).fill(0), ...sample(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9], nd - zeros)];
    const big = chance(rng, 0.5);
    const desc = ds.slice().sort((a, b) => b - a);
    const asc = ds.slice().sort((a, b) => a - b);
    asc.unshift(asc.splice(zeros, 1)[0]); // a number cannot start with 0: smallest non-zero digit first
    const ans = Number((big ? desc : asc).join(''));
    return numq({
      prompt: `Use each digit once: ${shuffle(rng, ds).join(', ')}. What is the ${big ? 'greatest' : 'least'} ${nd}-digit number you can make?`,
      answer: ans,
      hint: big ? 'You want the biggest possible number. Put the biggest digit in the place on the far left, then the next biggest, and so on down to the smallest.' : `You want the smallest possible number. Put small digits in the big places on the left. A number cannot start with 0, so start with the smallest digit that is not 0, and put the ${zeros > 1 ? 'zeros' : '0'} right after it.`,
      explain: `The ${big ? 'greatest' : 'least'} number is ${fmtNum(ans)}.${big ? '' : ` The ${zeros > 1 ? 'zeros go' : '0 goes'} right after the first digit because a number cannot start with 0.`}`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD2  Fractions and decimals (tenths and hundredths)
// ---------------------------------------------------------------------------
const DENS = [2, 3, 4, 5, 6, 8, 10, 12];
const DEC_DENS = [2, 4, 5, 10, 20, 25, 50, 100];
function fracToDecFrac(rng, t) {
  // returns {f, v} with v having at most 2 decimal places
  const d = t <= 3 ? pick(rng, [10, 100]) : t === 4 ? pick(rng, [2, 4, 5, 10, 100]) : pick(rng, DEC_DENS);
  let n = R(rng, 1, d - 1);
  if (t >= 5 && chance(rng, 0.5)) n += d * R(rng, 1, 3);
  return { n, d, v: clean(n / d) };
}
const DEC_CTX = [['ran', 'km'], ['drank', 'L of juice'], ['poured', 'L of potion'], ['used', 'm of ribbon'], ['picked', 'kg of apples'], ['swam', 'km']];

const fracdec = gen([
  // hundred grid -> decimal / fraction
  [1, 3, (t, rng) => {
    const s = t === 1 && chance(rng, 0.5) ? R(rng, 1, 9) * 10 : R(rng, 1, 99);
    const v = s / 100;
    if (chance(rng, 0.5)) {
      const wrong = [s, s / 10, 1 - v, Number(String(s).padStart(2, '0').split('').reverse().join('')) / 100, v + 0.1, v / 10]
        .map((x) => clean(x)).filter((x) => x !== v && decPlaces(x) <= 2);
      return mcq(rng, {
        prompt: 'What decimal names the shaded part of the grid?',
        visual: { type: 'hundredgrid', shaded: s },
        correct: v, wrong, format: dn,
        hint: 'What decimal does the shading show? The whole grid is one whole, each full column is one tenth, and each small square is one hundredth. Count the full shaded columns for the tenths digit, then the extra shaded squares for the hundredths digit.',
        explain: `${s} of the 100 squares are shaded: ${s} hundredths = ${dn(v)}.`,
      });
    }
    return mcq(rng, {
      prompt: 'What fraction of the grid is shaded?',
      visual: { type: 'hundredgrid', shaded: s },
      correct: frac(s, 100), wrong: [frac(100 - s, 100), s < 10 ? frac(s, 10) : frac(s, 1000), frac(s % 10 || 1, 100), frac(Math.floor(s / 10) || 1, 10), frac(s, 10)],
      hint: 'The bottom number of the fraction is how many squares there are in all (100). The top number is how many are shaded. Count by 10s down the full columns, then add the extra squares.',
      explain: `${s} out of 100 squares are shaded, so the fraction is ${frac(s, 100)}.`,
    });
  }],
  // equivalent fractions
  [1, 4, (t, rng) => {
    const d = pick(rng, t <= 2 ? [2, 3, 4, 5, 6] : DENS), n = R(rng, 1, d - 1);
    const k = R(rng, 2, t <= 2 ? Math.max(2, Math.floor(12 / d)) : 6);
    if (t <= 2) {
      if (d * k > 12) return fracdec(1, rng);
      return numq({
        prompt: `The bars are the same length. How many ${fracSay(2, d * k).split(' ').pop()} are equal to ${frac(n, d)}?`,
        visual: { type: 'fractionbar', bars: [{ parts: d, shaded: n }, { parts: d * k, shaded: n * k }] },
        answer: n * k,
        hint: `How many ${pName(d * k)} cover the same length as ${frac(n, d)}? Each ${sName(d)} on the top bar lines up with ${k} small pieces on the bottom bar. Count ${k} pieces for each of the ${n} shaded ${n === 1 ? sName(d) : pName(d)}.`,
        explain: `Multiply the top and bottom by ${k}: ${frac(n, d)} = ${frac(n * k, d * k)}.`,
      });
    }
    const f = F(n, d);
    const wrong = [[n + k, d + k], [n * k, d + k], [n, d * k], [d * k, n * k], [n * k + 1, d * k], [n + 1, d + 1]]
      .filter(([a, b]) => a !== b && Math.abs(a / b - n / d) > 1e-9);
    return mcq(rng, {
      prompt: `Which fraction is equivalent to ${frac(n, d)}?`,
      correct: [n * k, d * k], wrong, format: ([a, b]) => frac(a, b),
      hint: `An equivalent fraction names the same amount as ${frac(n, d)}. Test each choice: is there ONE number you can multiply both ${n} and ${d} by to get its top and bottom? Adding the same number to the top and bottom does not make an equal fraction.`,
      explain: `${frac(n, d)} × ${frac(k, k)} = ${frac(n * k, d * k)}. Multiplying by ${frac(k, k)} (which is 1) keeps the amount the same.${f.n !== n ? '' : ''}`,
    });
  }],
  // improper <-> mixed
  [1, 5, (t, rng) => {
    const d = pick(rng, t <= 2 ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 8, 10]);
    const w = R(rng, 1, t <= 2 ? 2 : 5), r = R(rng, 1, d - 1), N = w * d + r;
    const toMixed = chance(rng, 0.6);
    const vis = t <= 2 ? { type: 'fractionbar', bars: [...Array(w).fill(0).map(() => ({ parts: d, shaded: d })), { parts: d, shaded: r }] } : undefined;
    if (toMixed) {
      const wrong = [[w + 1, r], [w, d - r], [w - 1, r], [r, w], [w + 1, d - r]].filter(([a, b]) => a > 0 && b > 0 && b < d && !(a === w && b === r));
      return mcq(rng, {
        prompt: t <= 2 ? `The bars show ${frac(N, d)}. What mixed number is this?` : `Write ${frac(N, d)} as a mixed number.`,
        visual: vis,
        correct: [w, r], wrong, format: ([a, b]) => mixed(a, b, d),
        hint: `How many wholes are in ${frac(N, d)}, and what is left? One whole is ${d} ${pName(d)}. Count groups of ${d} up to ${N}: each group is one whole, and the ${pName(d)} left over make the fraction part.`,
        explain: `${N} ÷ ${d} = ${w} with ${r} left over, so ${frac(N, d)} = ${mixed(w, r, d)}.`,
      });
    }
    const wrong = [w + r, w * r + d, N - 1, N + 1, w * d].filter((x) => x !== N && x > 0);
    return mcq(rng, {
      prompt: `Write ${mixed(w, r, d)} as an improper fraction.`,
      visual: vis,
      correct: N, wrong, format: (x) => frac(x, d),
      hint: `How many ${pName(d)} are in ${mixed(w, r, d)} in all? Each whole is ${frac(d, d)}, so ${w} whole${w > 1 ? 's are' : ' is'} ${w} group${w > 1 ? 's' : ''} of ${d} ${pName(d)}. Find that many ${pName(d)}, then add the ${r} extra.`,
      explain: `${w} wholes = ${w * d} ${fracSay(2, d).split(' ').pop()}. ${w * d} + ${r} = ${N}, so ${mixed(w, r, d)} = ${frac(N, d)}.`,
    });
  }],
  // simplest form
  [3, 5, (t, rng) => {
    const d = pick(rng, [2, 3, 4, 5, 6, 8, 10]), n = R(rng, 1, d - 1);
    const f = F(n, d);
    const k = R(rng, 2, t === 3 ? 3 : 6);
    const N = f.n * k, D = f.d * k;
    const wrong = [[f.n, D], [N, f.d], [N - 1, D - 1], [f.d, f.n], [N / (k > 2 && k % 2 === 0 ? 2 : 1) + 1, D / (k > 2 && k % 2 === 0 ? 2 : 1)]]
      .filter(([a, b]) => b > 0 && a > 0 && Number.isInteger(a) && Number.isInteger(b) && Math.abs(a / b - f.n / f.d) > 1e-9);
    return mcq(rng, {
      prompt: `Write ${frac(N, D)} in simplest form.`,
      correct: [f.n, f.d], wrong, format: ([a, b]) => frac(a, b),
      hint: `Simplest form means the same amount with the smallest possible numbers. Find a number that divides both ${N} and ${D} with no remainder (try 2, 3 or 5). Divide the top and bottom by it, and keep going until only 1 divides both.`,
      explain: `Divide the top and bottom by ${k}: ${frac(N, D)} = ${frac(f.n, f.d)}. Only 1 divides both ${f.n} and ${f.d}, so it is in simplest form.`,
    });
  }],
  // fraction -> decimal (keypad)
  [3, 6, (t, rng) => {
    const { n, d, v } = fracToDecFrac(rng, t);
    const tok = n > d ? ftok({ n, d }) : frac(n, d);
    const k = 100 % d === 0 ? 100 / d : 1;
    return decq(rng, {
      prompt: `Write ${tok} as a decimal.`,
      answer: v,
      hint: d === 10 || d === 100 ? `${tok} counts ${pName(d)}. Write any whole number, then the decimal point, then ${d === 10 ? 'the tenths digit (1 place)' : 'the hundredths using 2 places (use a 0 in the tenths place if needed)'}.` : `First change the fraction part of ${tok} to ${10 % d === 0 ? 'tenths' : 'hundredths'}: multiply its top and bottom by ${10 % d === 0 ? 10 / d : 100 / d}. Then write it as a decimal.`,
      explain: d === 10 || d === 100 ? `${tok} = ${dn(v)}.` : `${frac(n % d || n, d)} = ${frac((n % d || n) * k, 100)}, so ${tok} = ${dn(v)}.`,
    }, decPlaces(v), [n / 10, n / 100, clean(d / 100), clean(n + d / 100)]);
  }],
  // decimal -> fraction
  [2, 5, (t, rng) => {
    const hund = chance(rng, 0.6);
    const n = hund ? R(rng, 1, 99) : R(rng, 1, 9), d = hund ? 100 : 10, v = n / d;
    const w = t >= 4 && chance(rng, 0.4) ? R(rng, 1, 4) : 0;
    const dec = dn(w + v);
    const tok = (a, b) => (w ? mixed(w, a, b) : frac(a, b));
    const wrong = [[n, hund ? 10 : 100], [n * 10, hund ? 1000 : 10], [1, n], [100 - n, 100]].filter(([a, b]) => a > 0 && a !== b && a < b && Math.abs(a / b - v) > 1e-9);
    return mcq(rng, {
      prompt: `Which fraction is equal to ${dec}?`,
      correct: [n, d], wrong, format: ([a, b]) => tok(a, b),
      hint: `Which fraction means the same as ${dec}? Say ${dec} out loud. If it has 1 digit after the point, it counts tenths (bottom number 10). If it has 2 digits, it counts hundredths (bottom number 100). Check each choice's top and bottom numbers.`,
      explain: `${dec} is read "${w ? numWords(w) + ' and ' : ''}${fracSay(n, d)}", so it equals ${tok(n, d)}.`,
    });
  }],
  // number line decimals
  [1, 7, (t, rng) => {
    if (t >= 5 && chance(rng, 0.6)) {
      const whole = R(rng, 0, 3), v = clean(whole + R(rng, 1, 99) / 100);
      const bms = [whole, whole + 0.5, whole + 1];
      const near = bms.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) ? x : b));
      if (Math.abs(Math.abs(near - v) - 0.25) < 1e-9) return fracdec(4, rng);
      return fixedq({
        prompt: `Which benchmark is ${dn(v)} closest to?`,
        visual: { type: 'numberline', min: whole, max: whole + 1, ticks: 0.1, labels: [whole, whole + 0.5, whole + 1], labelFormat: 'decimal', marks: [{ value: v, label: dn(v) }] },
        choices: bms.map(dn), correct: dn(near),
        hint: `Which is closest to ${dn(v)}: ${dn(whole)}, ${dn(whole + 0.5)} or ${dn(whole + 1)}? The halfway points between them are ${dn(whole + 0.25)} and ${dn(whole + 0.75)}. Is ${dn(v)} below ${dn(whole + 0.25)}, between the two, or above ${dn(whole + 0.75)}?`,
        explain: `${dn(v)} is ${dn(Math.abs(v - near))} away from ${dn(near)}, which is the closest benchmark.`,
      });
    }
    let min, step;
    if (t <= 2) { min = t === 1 ? 0 : R(rng, 0, 3); step = 0.1; } else { min = clean(R(rng, 0, 29) / 10); step = 0.01; }
    const max = clean(min + step * 10), k = R(rng, 1, 9), v = clean(min + k * step);
    const wrong = [v + step, v - step, step === 0.1 ? min + k / 100 : min + k / 10, step === 0.1 ? min + k : clean(min + k * 0.001 * 10 + 0.1)]
      .map((x) => clean(x)).filter((x) => x >= 0 && x !== v && decPlaces(x) <= 2);
    return mcq(rng, {
      prompt: 'What decimal is the arrow pointing to?',
      visual: { type: 'numberline', min, max, ticks: step, labels: 'ends', labelFormat: 'decimal', arrow: v },
      correct: v, wrong, format: dn,
      hint: `What decimal is at the arrow? From ${dn(min)} to ${dn(max)} there are 10 jumps, so each jump is one ${step === 0.1 ? 'tenth (0.1)' : 'hundredth (0.01)'}. Start at ${dn(min)} and count the jumps to the arrow.`,
      explain: `Each tick is ${dn(step)}. The arrow is ${k} ticks past ${dn(min)}, at ${dn(v)}.`,
    });
  }],
  // compare decimals
  [3, 5, (t, rng) => {
    const a = clean(R(rng, 1, 9) / 10 + (t >= 5 ? R(rng, 0, 3) : 0));
    const opts = [clean(a - 0.1 + R(rng, 1, 9) / 100), clean(a + R(rng, 1, 9) / 100), a, clean(a - 0.05)];
    const b = pick(rng, opts);
    const sa = a === b && decPlaces(a) < 2 ? a.toFixed(2) : dn(a), sb = dn(b);
    const [x, y] = chance(rng, 0.5) ? [sa, sb] : [sb, sa];
    const vx = Number(x), vy = Number(y);
    const correct = vx === vy ? 'They are equal' : vx > vy ? x : y;
    return fixedq({
      prompt: `Which is greater: ${x} or ${y}?`,
      choices: [x, y, 'They are equal'].filter((c, i, arr) => arr.indexOf(c) === i), correct,
      hint: `Is ${x} or ${y} bigger, or are they equal? Write both with 2 decimal places by adding a zero at the end if needed. Then compare the tenths digits first, and the hundredths only if the tenths match. Having more digits does not make a decimal bigger.`,
      explain: vx === vy ? `${x} and ${y} name the same amount.` : `Compare place by place: ${correct} is greater.`,
    });
  }],
  // fraction vs decimal
  [4, 7, (t, rng) => {
    const d0 = pick(rng, t >= 6 ? [4, 20, 25, 50] : [2, 4, 5, 10]), n0 = R(rng, 1, d0 - 1);
    const { n, d } = F(n0, d0);
    const fv = clean(n / d);
    let dv = pick(rng, t >= 6 ? [clean(fv + 0.01), clean(fv - 0.01), clean(fv + 0.02), clean(fv - 0.03), fv] : [clean(fv + 0.05), clean(fv - 0.05), clean(fv + 0.1), clean(fv - 0.1), fv, clean(n / 10)]);
    if (dv <= 0 || dv >= 1) dv = clean(fv + (fv < 0.5 ? 0.05 : -0.05));
    const w = t >= 6 && chance(rng, 0.5) ? R(rng, 1, 3) : 0;
    const ft = w ? mixed(w, n, d) : frac(n, d), ds = dn(w + dv);
    const correct = fv === dv ? 'They are equal' : fv > dv ? ft : ds;
    return fixedq({
      prompt: `Which is greater: ${ft} or ${ds}?`,
      choices: shuffle(rng, [ft, ds]).concat('They are equal'), correct,
      hint: `Which is bigger, ${ft} or ${ds}, or are they equal? Change ${frac(n, d)} into a decimal first: multiply its top and bottom so the bottom is 10 or 100. Then compare the two decimals place by place.`,
      explain: `${ft} = ${dn(w + fv)}. ${fv === dv ? 'So they are equal.' : `${dn(w + fv)} is ${fv > dv ? 'greater' : 'less'} than ${ds}, so ${correct} is greater.`}`,
    });
  }],
  // order mixed list
  [5, 7, (t, rng) => {
    const pool = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [3, 10], [7, 10], [9, 10]];
    const items = [];
    const [a, b] = sample(rng, pool, 2);
    items.push({ lab: frac(a[0], a[1]), v: a[0] / a[1] }, { lab: frac(b[0], b[1]), v: b[0] / b[1] });
    let tries = 0;
    while (items.length < (t >= 6 ? 4 : 3) && tries++ < 50) {
      const v = clean(R(rng, 5, 95) / 100);
      if (items.every((it) => Math.abs(it.v - v) > 0.02)) items.push({ lab: dn(v), v });
    }
    if (Math.abs(items[0].v - items[1].v) < 0.02) return fracdec(4, rng);
    const sorted = items.slice().sort((x, y) => x.v - y.v);
    const f = (arr) => arr.map((x) => x.lab).join(', ');
    const w1 = sorted.slice().reverse(), w2 = [sorted[1], sorted[0], ...sorted.slice(2)], w3 = [...sorted.slice(0, -2), sorted[sorted.length - 1], sorted[sorted.length - 2]];
    const w4 = items.slice().sort((x, y) => (x.lab.length - y.lab.length) || (x.v - y.v));
    return mcq(rng, {
      prompt: 'Which list is in order from least to greatest?',
      correct: sorted, wrong: [w1, w2, w3, w4], format: f,
      hint: 'You need the list from smallest to biggest. Change each fraction to a decimal by making its bottom number 10 or 100. Then compare all the decimals and check which list has every number smaller than the next.',
      explain: `As decimals: ${sorted.map((x) => dn(x.v)).join(', ')}. So the order is ${f(sorted)}.`,
    });
  }],
  // word comparison
  [4, 6, (t, rng) => {
    const [n1, n2] = two(rng), [verb, unit] = pick(rng, DEC_CTX);
    const d = pick(rng, t >= 6 ? [4, 20, 25] : [2, 4, 5, 10]), n = R(rng, 1, d - 1);
    const fv = clean(n / d);
    let dv = pick(rng, t >= 6 ? [clean(fv + 0.01), clean(fv - 0.02), clean(fv + 0.03), fv] : [clean(fv + 0.05), clean(fv - 0.05), clean(fv + 0.1), clean(fv - 0.15), fv]);
    if (dv <= 0) dv = clean(fv + 0.1);
    const w = t >= 5 ? R(rng, 0, 2) : 0;
    const correct = fv === dv ? 'They are the same' : fv > dv ? n1 : n2;
    const sf = F(n, d);
    return fixedq({
      prompt: `${n1} ${verb} ${w ? mixed(w, sf.n, sf.d) : frac(sf.n, sf.d)} ${unit}. ${n2} ${verb} ${dn(w + dv)} ${unit}. Who ${verb} more?`,
      choices: [n1, n2, 'They are the same'], correct,
      hint: `Who ${verb} more? ${n1}'s amount is a fraction and ${n2}'s is a decimal, so change ${frac(sf.n, sf.d)} into tenths or hundredths first. Compare the two decimals. Choose "They are the same" only if they are equal.`,
      explain: `${w ? mixed(w, sf.n, sf.d) : frac(sf.n, sf.d)} = ${dn(w + fv)}. ${fv === dv ? 'The amounts are equal.' : `${dn(w + Math.max(fv, dv))} > ${dn(w + Math.min(fv, dv))}, so ${correct} ${verb} more.`}`,
    });
  }],
  // decimal in words
  [2, 4, (t, rng) => {
    const w = R(rng, 1, 9), h = chance(rng, 0.6);
    const k = h ? R(rng, 1, 9) : R(rng, 1, 9);
    const v = h ? clean(w + k / 100) : clean(w + k / 10);
    const words = `${numWords(w)} and ${fracSay(k, h ? 100 : 10)}`;
    if (chance(rng, 0.5)) {
      const wrong = [h ? w + k / 10 : w + k / 100, (w * 10 + k) / 100, w * 100 + k, w * 10 + k].map(clean).filter((x) => x !== v);
      return mcq(rng, {
        prompt: `Which decimal is "${words}"?`,
        correct: v, wrong, format: dn,
        hint: `In "${words}", the word "and" is the decimal point. Write the whole number before it. ${h ? 'Hundredths need 2 digits after the point, so if there is no tenths part, write a 0 in the tenths place.' : 'Tenths need just 1 digit after the point.'}`,
        explain: `"${words}" = ${dn(v)}.`,
      });
    }
    return mcq(rng, {
      prompt: `How do you read ${dn(v)}?`,
      correct: words,
      wrong: [`${numWords(w)} and ${fracSay(k, h ? 10 : 100)}`, `${fracSay(w * 10 + k, 100)}`, `${numWords(w * 100 + k)}`, `${numWords(k)} and ${fracSay(w, h ? 100 : 10)}`],
      hint: `Which words match ${dn(v)}? Read the whole number first and say "and" for the point. Then count the digits after the point: 1 digit means tenths, 2 digits means hundredths. Pick the choice with the right number and the right place name.`,
      explain: `${dn(v)} has ${w} ones and ${k} ${h ? 'hundredths' : 'tenths'}: "${words}".`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD3  Count and sequence within 1 000 000
// ---------------------------------------------------------------------------
const count = gen([
  // skip count whole numbers
  [1, 7, (t, rng) => {
    const steps = [[1000, 10000], [1000, 5000, 10000], [10000, 25000, 50000], [1000, 10000, 25000, 100000], [5000, 25000, 100000, 50000], [25000, 50000, 100000], [100000, 250000, 50000]][t - 1];
    const step = pick(rng, steps);
    const back = t >= 3 && chance(rng, 0.4);
    let start = R(rng, 1, t <= 1 ? 20 : 30) * (step >= 1000 ? 1000 : 100) + (t >= 4 ? R(rng, 0, 9) * 100 : 0);
    if (t >= 5) start = R(rng, 1, 9) * 100000 + R(rng, 0, 19) * 5000 + (chance(rng, 0.3) ? R(rng, 1, 9) * 10 : 0);
    if (t === 7) start = 1000000 - step * R(rng, 4, 6) - (chance(rng, 0.5) ? R(rng, 1, 9) * 1000 : 0); // count up to (not past) 1 000 000
    const vals = [0, 1, 2, 3, 4].map((i) => (back ? start + (4 - i) * step : start + i * step));
    if (vals.some((v) => v <= 0 || v > 1000000)) return count(t, rng);
    const blank = t >= 5 && chance(rng, 0.5) ? R(rng, 1, 3) : 4;
    const items = vals.map((v, i) => (i === blank ? '?' : fmtNum(v)));
    return numq({
      prompt: `What number is missing? ${items.join(', ')}`,
      visual: t <= 2 ? { type: 'numberline', min: Math.min(...vals), max: Math.max(...vals), ticks: step, labels: 'all', blankAt: vals[blank] } : undefined,
      answer: vals[blank],
      hint: `Find the jump first: how much do you ${back ? 'take away from' : 'add to'} ${fmtNum(vals[blank >= 2 ? 0 : 2])} to get ${fmtNum(vals[blank >= 2 ? 1 : 3])}? ${blank === 4 ? 'Then make the same jump from the last number.' : 'Then make the same jump from the number just before the ?.'}`,
      explain: `The rule is ${back ? 'subtract' : 'add'} ${fmtNum(step)}. The missing number is ${fmtNum(vals[blank])}.`,
    });
  }],
  // count by tenths / hundredths across a whole (or a tenth)
  [1, 5, (t, rng) => {
    const hund = t >= 3 && chance(rng, 0.6);
    const step = hund ? 0.01 : 0.1;
    const back = t >= 2 && chance(rng, 0.4);
    const cross = hund && chance(rng, 0.5) ? clean(R(rng, 1, 9) + R(rng, 1, 9) / 10) : R(rng, 1, 9);
    const m = R(rng, 1, 3);
    const first = clean(back ? cross + m * step : cross - m * step);
    const seq = [0, 1, 2].map((i) => clean(first + (back ? -i : i) * step));
    const ans = clean(first + (back ? -3 : 3) * step);
    const wrong = [ans + step, ans - step, ans + 2 * step, ans - 2 * step, ans + (hund ? 0.1 : 1), ans - (hund ? 0.1 : 1)]
      .map(clean).filter((x) => x >= 0 && x !== ans && !seq.includes(x)).map(dn);
    if (!back && ans === cross) {
      // the classic slip: 2.9 -> 2.10, or 3.49 -> 3.410
      const prev = dn(seq[2]);
      wrong.unshift(prev.slice(0, -1) + (hund ? String(Number(prev.slice(-1)) + 1) : '10'));
    }
    return mcq(rng, {
      prompt: `Count by ${hund ? 'hundredths' : 'tenths'}${back ? ' backward' : ''}. What comes next? ${seq.map(dn).join(', ')}, ?`,
      visual: t <= 2 ? { type: 'numberline', min: clean(Math.min(...seq, ans) - step), max: clean(Math.max(...seq, ans) + step), ticks: step, labels: 'all', labelFormat: 'decimal', blankAt: ans } : undefined,
      correct: dn(ans), wrong: [...new Set(wrong)],
      hint: `Each count ${back ? 'takes away' : 'adds'} one ${hund ? 'hundredth (0.01)' : 'tenth (0.1)'}. Start at ${dn(seq[2])} and make one more jump. ${hund ? 'Ten hundredths make one tenth, so the tenths digit changes when the hundredths go past nine or below zero.' : 'Ten tenths make one whole, so the ones digit changes when the tenths go past nine or below zero.'}`,
      explain: `Each count ${back ? 'takes away' : 'adds'} ${dn(step)}: ${dn(seq[2])} ${back ? '−' : '+'} ${dn(step)} = ${dn(ans)}.`,
    });
  }],
  // count by unit fractions / mixed numbers
  [1, 6, (t, rng) => {
    const d = pick(rng, t <= 2 ? [2, 3, 4] : [3, 4, 5, 6, 8, 10]);
    const back = t >= 3 && chance(rng, 0.4);
    const improper = t >= 3 && chance(rng, 0.3);
    const start = R(rng, 1, d * (t <= 2 ? 1 : 3));
    const seq = [0, 1, 2, 3].map((i) => start + (back ? 3 - i : i));
    const vals = back ? seq.slice().sort((a, b) => b - a) : seq;
    const ans = back ? vals[3] - 1 : vals[3] + 1;
    if (ans <= 0) return count(Math.max(1, t - 1), rng);
    const fmt = (x) => (improper ? frac(x, d) : ctok(x, d));
    const wrongN = [ans + 1, ans - 1 === vals[3] ? ans + 2 : ans - 1, back ? ans - 2 : ans + 2, ans + d].filter((x) => x > 0 && x !== ans);
    const sayList = vals.map(fmt).join(', ');
    return mcq(rng, {
      prompt: `Count by ${fracSay(2, d).split(' ').pop()}${back ? ' backward' : ''}. What comes next? ${sayList}, ?`,
      visual: t <= 3 ? { type: 'numberline', min: Math.floor(Math.min(ans, ...vals) / d), max: Math.ceil(Math.max(ans, ...vals) / d) || 1, ticks: 1 / d, labels: 'all', labelFormat: 'fraction', denominator: d } : undefined,
      correct: ans, wrong: wrongN, format: fmt,
      hint: `Each count ${back ? 'takes away' : 'adds'} one ${sName(d)}. Start at ${fmt(vals[3])} and ${back ? 'go back' : 'go on'} one more ${sName(d)}. Remember that ${numWords(d)} ${pName(d)} make one whole, so when the top number reaches ${numWords(d)}, you are at the next whole number.`,
      explain: `${fmt(vals[3])} ${back ? '−' : '+'} ${frac(1, d)} = ${fmt(ans)}.`,
    });
  }],
  // count by 0.05 / 0.25 / 0.01
  [2, 6, (t, rng) => {
    const step = pick(rng, t <= 3 ? [0.05, 0.25, 0.5] : [0.05, 0.25, 0.01, 0.02]);
    const back = chance(rng, 0.35);
    const start = clean(R(rng, 0, 40) * step + (t >= 4 ? R(rng, 1, 5) : 0));
    const vals = [0, 1, 2, 3].map((i) => clean(start + (back ? -i : i) * step));
    if (vals.some((v) => v < 0)) return count(t, rng);
    const blank = t >= 5 && chance(rng, 0.5) ? R(rng, 1, 2) : 3;
    const ans = vals[blank];
    return decq(rng, {
      prompt: `Count by ${dn(step)}${back ? ' backward' : ''}. What is the missing number? ${vals.map((v, i) => (i === blank ? '?' : dn(v))).join(', ')}`,
      answer: ans,
      hint: `The numbers go ${back ? 'down' : 'up'} by ${dn(step)} each time. Take the number just before the ? and ${back ? 'subtract' : 'add'} ${dn(step)}, lining up the decimal points. Check it with the number after the ?, if there is one.`,
      explain: `The numbers ${back ? 'go down' : 'go up'} by ${dn(step)}. The missing number is ${dn(ans)}.`,
    }, Math.max(decPlaces(step), decPlaces(start)), [ans + step, ans - step, ans + 2 * step]);
  }],
  // ordering / between
  [3, 7, (t, rng) => {
    if (chance(rng, 0.5)) {
      const base = randNum(rng, 6, 0.3), gap = pick(rng, [20, 200, 2000]);
      const lo = base, hi = base + gap;
      const inside = lo + R(rng, 1, gap - 1);
      const outs = [lo - R(rng, 1, gap), hi + R(rng, 1, gap), lo + gap * 10, swapDigits(rng, inside)].filter((x) => x < lo || x > hi);
      return mcq(rng, {
        prompt: `Which number is between ${fmtNum(lo)} and ${fmtNum(hi)}?`,
        correct: inside, wrong: outs, format: fmtNum,
        hint: `The number must be bigger than ${fmtNum(lo)} AND smaller than ${fmtNum(hi)}. Test each choice against both numbers, comparing digits from the left.`,
        explain: `${fmtNum(lo)} < ${fmtNum(inside)} < ${fmtNum(hi)}.`,
      });
    }
    const a = randNum(rng, 6, 0.25);
    const vals = [...new Set([a, swapDigits(rng, a), nudgeDigit(rng, a), a + 1000])].slice(0, 3);
    if (vals.length < 3) vals.push(a + 10);
    const sorted = vals.slice().sort((x, y) => y - x);
    const f = (arr) => arr.map(fmtNum).join(', ');
    return mcq(rng, {
      prompt: 'Which list is in order from greatest to least?',
      correct: sorted, wrong: [sorted.slice().reverse(), [sorted[1], sorted[0], sorted[2]], [sorted[0], sorted[2], sorted[1]]], format: f,
      hint: 'You need the biggest number first and the smallest last. Compare digits from the left: hundred thousands, then ten thousands, and so on. Check each list: is every number bigger than the one after it?',
      explain: `Greatest to least: ${f(sorted)}.`,
    });
  }],
  // more / less by tenths & hundredths
  [4, 7, (t, rng) => {
    const hund = chance(rng, 0.5), k = R(rng, 2, 9), step = hund ? 0.01 : 0.1;
    const more = chance(rng, 0.5);
    const base = clean(R(rng, 1, 9) + R(rng, hund ? 90 : 5, hund ? 99 : 9) / (hund ? 100 : 10));
    const ans = clean(more ? base + k * step : base - k * step);
    if (ans === clean(k * step)) return count(t, rng);
    return decq(rng, {
      prompt: `What is ${numWords(k)} ${hund ? 'hundredths' : 'tenths'} ${more ? 'more' : 'less'} than ${dn(base)}?`,
      answer: ans,
      hint: `${cap(numWords(k))} ${hund ? 'hundredths' : 'tenths'} is ${dn(k * step)}. ${more ? 'Add' : 'Subtract'} ${dn(k * step)} ${more ? 'to' : 'from'} ${dn(base)} with the decimal points lined up. Watch for regrouping when the ${hund ? 'hundredths' : 'tenths'} go past ${more ? 'nine' : 'zero'}.`,
      explain: `${dn(base)} ${more ? '+' : '−'} ${dn(k * step)} = ${dn(ans)}.`,
    }, decPlaces(base) || 1, [more ? base + k * step * 10 : base - k * step * 10, more ? base + k : base - k]);
  }],
  // counting on n times
  [5, 7, (t, rng) => {
    if (chance(rng, 0.5)) {
      const step = pick(rng, [0.25, 0.05, 0.5, 0.2]), times = t >= 6 ? R(rng, 6, 12) : R(rng, 3, 6), start = R(rng, t >= 6 ? 3 : 1, t >= 6 ? 9 : 6) + (chance(rng, 0.5) ? 0.5 : 0);
      const back = chance(rng, 0.5);
      const ans = clean(back ? start - step * times : start + step * times);
      if (ans < 0) return count(5, rng);
      return decq(rng, {
        prompt: `${nm(rng)} starts at ${dn(start)} and counts ${back ? 'back' : 'on'} by ${dn(step)}, ${times} times. What number does the counting end on?`,
        answer: ans,
        hint: `Count ${back ? 'back' : 'on'} from ${dn(start)} one jump of ${dn(step)} at a time, keeping track until you have made ${times} jumps. Tip: ${Math.round(1 / step)} jumps of ${dn(step)} make exactly 1 whole.`,
        explain: `${times} jumps of ${dn(step)} make ${dn(step * times)} altogether. ${dn(start)} ${back ? '−' : '+'} ${dn(step * times)} = ${dn(ans)}.`,
      }, Math.max(decPlaces(step), decPlaces(start)), [start + step * (times - 1), start + step * (times + 1), back ? start + step * times : start - step * times].filter((x) => x >= 0));
    }
    const d = pick(rng, [3, 4, 6, 8]), times = t >= 6 ? R(rng, 6, 15) : R(rng, 3, 7), sn = R(rng, 1, (t >= 6 ? 4 : 2) * d);
    const ans = sn + times;
    return mcq(rng, {
      prompt: `Start at ${ctok(sn, d)} and count on by ${frac(1, d)}, ${times} times. Where do you end?`,
      correct: ans, wrong: [ans - 1, ans + 1, sn + times * 2, ans + d].filter((x) => x !== ans && x > 0), format: (x) => ctok(x, d),
      hint: `${times} jumps of ${frac(1, d)} is ${frac(times, d)} in all. Add ${frac(times, d)} to ${ctok(sn, d)}. Remember that ${frac(d, d)} make 1 whole.`,
      explain: `${ctok(sn, d)} + ${frac(times, d)} = ${ctok(ans, d)}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD4  Add and subtract within 1 000 000, decimals to hundredths
// ---------------------------------------------------------------------------
function wholePair(rng, t, sub) {
  let a, b;
  if (t <= 1) { a = R(rng, sub ? 2000 : 1000, sub ? 9999 : 4999); b = R(rng, 100, 999); }
  else if (t === 2) { a = R(rng, sub ? 30000 : 10000, sub ? 99999 : 59999); b = R(rng, 1000, sub ? 29999 : 39999); }
  else if (t === 3) { a = R(rng, sub ? 300000 : 100000, sub ? 999999 : 599999); b = R(rng, 10000, sub ? 299999 : 399999); }
  else {
    a = R(rng, sub ? 200000 : 100000, sub ? 1000000 : 700000); b = R(rng, 20000, sub ? a - 1000 : 1000000 - a);
    if (sub && chance(rng, 0.4)) a = R(rng, 2, 10) * 100000 + (chance(rng, 0.5) ? R(rng, 1, 9) * 1000 : 0);
    if (sub && b >= a) b = Math.floor(a / 2) + R(rng, 1, 999);
  }
  return [a, b];
}
function decPair(rng, t) {
  const p1 = t <= 1 ? 1 : t === 2 ? 2 : pick(rng, [1, 2]);
  const p2 = t <= 2 ? p1 : 3 - p1;
  const a = clean(R(rng, 10, t <= 2 ? 79 : 999) / 10 ** p1 + (t >= 4 ? R(rng, 0, 20) : 0));
  const b = clean(R(rng, 10, t <= 2 ? 49 : 999) / 10 ** p2);
  return [a, b, Math.max(p1, p2)];
}
// Adding with the decimals lined up on the right (a common slip).
function misalignAdd(a, b) {
  const pa = decPlaces(a), pb = decPlaces(b);
  if (pa === pb) return null;
  const [lng, sht] = pa > pb ? [a, b] : [b, a];
  return clean(lng + sht / 10 ** Math.abs(pa - pb));
}
const WORD_ADD = [
  (a, b, n) => [`A library had ${fmtNum(a)} books. It bought ${fmtNum(b)} more. How many books does it have now?`, a + b],
  (a, b, n) => [`A dragon's treasure had ${fmtNum(a)} gold coins. ${n} added ${fmtNum(b)} more. How many coins are there now?`, a + b],
  (a, b) => [`Two towns have ${fmtNum(a)} and ${fmtNum(b)} people. How many people live in both towns?`, a + b],
  (a, b, n) => [`${n} walked ${fmtNum(a)} steps in May and ${fmtNum(b)} steps in June. How many steps is that altogether?`, a + b],
  (a, b) => [`A wizard school sold ${fmtNum(a)} tickets on Friday and ${fmtNum(b)} on Saturday. How many tickets were sold?`, a + b],
];
const WORD_SUB = [
  (a, b, n) => [`A stadium has ${fmtNum(a)} seats. ${fmtNum(b)} seats are filled. How many are empty?`, a - b],
  (a, b, n) => [`${n} had ${fmtNum(a)} points in a game and lost ${fmtNum(b)}. How many points are left?`, a - b],
  (a, b, n) => [`A video had ${fmtNum(b)} views on Monday and ${fmtNum(a)} views by Friday. How many new views came after Monday?`, a - b],
  (a, b) => [`An owl colony collected ${fmtNum(a)} seeds. The owls ate ${fmtNum(b)} of them. How many seeds are left?`, a - b],
  (a, b, n) => [`Team Moose scored ${fmtNum(a)} points and Team Otter scored ${fmtNum(b)}. How many more points did Team Moose score?`, a - b],
];
const WORD_DEC = [
  (a, b, n) => [`${n} poured ${dn(a)} L of juice and ${dn(b)} L of water into a bowl. How many litres is that?`, a + b, 'L'],
  (a, b, n) => [`A ribbon is ${dn(a)} m long. ${n} cuts off ${dn(b)} m. How many metres of ribbon are left?`, a - b, 'm'],
  (a, b, n) => [`${n} ran ${dn(a)} km on Monday and ${dn(b)} km on Tuesday. How many kilometres is that altogether?`, a + b, 'km'],
  (a, b, n) => [`A pumpkin has a mass of ${dn(a)} kg. A squash has a mass of ${dn(b)} kg. How many kilograms heavier is the pumpkin?`, a - b, 'kg'],
  (a, b, n) => [`A potion jar holds ${dn(a)} L. ${n} uses ${dn(b)} L for a spell. How many litres of potion are left?`, a - b, 'L'],
  (a, b, n) => [`A dragon egg has a mass of ${dn(a)} kg. A baby dragon grows to be ${dn(b)} kg heavier than its egg. What is the baby dragon's mass in kilograms?`, a + b, 'kg'],
];

const addsub = gen([
  [1, 5, (t, rng) => {
    const sub = chance(rng, 0.5);
    const [a, b] = wholePair(rng, t, sub);
    const ans = sub ? a - b : a + b;
    if (ans > 1000000 || ans < 0) return addsub(t, rng);
    return numq({
      prompt: `${fmtNum(a)} ${sub ? '−' : '+'} ${fmtNum(b)} = ?`,
      visual: t <= 2 ? { type: 'barmodel', whole: sub ? a : '?', parts: sub ? [b, '?'] : [a, b] } : undefined,
      answer: ans,
      hint: sub ? `Take ${fmtNum(b)} away from ${fmtNum(a)}. Line up the places and start with the ones on the right. If a top digit is too small, regroup 1 from the place to its left.` : `Join ${fmtNum(a)} and ${fmtNum(b)}. Line up the places and start with the ones on the right. If a column makes 10 or more, carry 1 to the next place.`,
      explain: `${fmtNum(a)} ${sub ? '−' : '+'} ${fmtNum(b)} = ${fmtNum(ans)}.${sub ? ` Check: ${fmtNum(ans)} + ${fmtNum(b)} = ${fmtNum(a)}.` : ''}`,
    });
  }],
  [1, 6, (t, rng) => {
    let [a, b, p] = decPair(rng, t);
    const sub = chance(rng, 0.5);
    if (sub && b > a) [a, b] = [b, a];
    if (t >= 4 && sub && chance(rng, 0.4)) { a = R(rng, 3, 20); p = decPlaces(b); }
    const ans = clean(sub ? a - b : a + b);
    const slip = sub ? null : misalignAdd(a, b);
    return decq(rng, {
      prompt: `${dn(a)} ${sub ? '−' : '+'} ${dn(b)} = ?`,
      visual: t <= 2 ? { type: 'barmodel', whole: sub ? a : '?', parts: sub ? [b, '?'] : [a, b] } : undefined,
      answer: ans, forceMc: slip != null && chance(rng, 0.5),
      hint: `${sub ? `Take ${dn(b)} away from ${dn(a)}` : `Join ${dn(a)} and ${dn(b)}`}. Line up the decimal points, not the last digits. Write zeros so both numbers have ${numWords(p)} decimal place${p > 1 ? 's' : ''}, then work as with whole numbers.`,
      explain: `${dn(a)} ${sub ? '−' : '+'} ${dn(b)} = ${dn(ans)}.`,
    }, p, slip != null ? [slip] : []);
  }],
  // estimate
  [2, 6, (t, rng) => {
    const r = chance(rng, 0.3) && t >= 3 ? 'dec' : 'whole';
    if (r === 'dec') {
      const a = clean(R(rng, 1, 9) + R(rng, 80, 99) / 100), b = clean(R(rng, 1, 9) + R(rng, 1, 20) / 100);
      const sub = chance(rng, 0.5) && a > b;
      const est = sub ? Math.round(a) - Math.round(b) : Math.round(a) + Math.round(b);
      return mcn(rng, {
        prompt: `About how much is ${dn(a)} ${sub ? '−' : '+'} ${dn(b)}?`,
        correct: est, extra: [est + 1, est - 1, sub ? Math.round(a) + Math.round(b) : Math.abs(Math.round(a) - Math.round(b)), est * 10], min: 0,
        format: (x) => `about ${fmtNum(x)}`,
        hint: `You need a close answer, not the exact one. Round ${dn(a)} and ${dn(b)} to the nearest whole number, then ${sub ? 'subtract' : 'add'} the rounded numbers.`,
        explain: `${dn(a)} is about ${Math.round(a)} and ${dn(b)} is about ${Math.round(b)}. ${Math.round(a)} ${sub ? '−' : '+'} ${Math.round(b)} = ${est}.`,
      });
    }
    const place = t <= 3 ? 1000 : pick(rng, [1000, 10000]);
    const sub = chance(rng, 0.5);
    let [a, b] = wholePair(rng, Math.max(3, t), sub);
    if (place === 1000 && t <= 3) { a = R(rng, 10000, 89999); b = R(rng, 1000, sub ? a - 1000 : 9999); }
    const ra = Math.round(a / place) * place, rb = Math.round(b / place) * place;
    const est = sub ? ra - rb : ra + rb;
    if (est <= 0) return addsub(t, rng);
    return mcq(rng, {
      prompt: `Which is the best estimate of ${fmtNum(a)} ${sub ? '−' : '+'} ${fmtNum(b)}?`,
      correct: est, wrong: [est + place, est - place, sub ? ra + rb : Math.abs(ra - rb), est * 10, est / 10].filter((x) => x > 0 && Number.isInteger(x)),
      format: fmtNum,
      hint: `You need a close answer, not the exact one. Round ${fmtNum(a)} and ${fmtNum(b)} to the nearest ${place === 1000 ? 'thousand' : 'ten thousand'}. Then ${sub ? 'subtract' : 'add'} the rounded numbers and find the matching choice.`,
      explain: `${fmtNum(a)} rounds to ${fmtNum(ra)} and ${fmtNum(b)} rounds to ${fmtNum(rb)}. ${fmtNum(ra)} ${sub ? '−' : '+'} ${fmtNum(rb)} = ${fmtNum(est)}.`,
    });
  }],
  // whole-number word problems
  [4, 7, (t, rng) => {
    const sub = chance(rng, 0.5);
    let [a, b] = wholePair(rng, 4, sub);
    if (sub && b >= a) [a, b] = [b + 1000, a];
    const [prompt, ans] = pick(rng, sub ? WORD_SUB : WORD_ADD)(a, b, nm(rng));
    if (ans > 1000000 || ans <= 0) return addsub(t, rng);
    return numq({
      prompt, answer: ans,
      visual: t === 4 ? { type: 'barmodel', whole: sub ? a : '?', parts: sub ? [b, '?'] : [a, b] } : undefined,
      hint: sub ? `You know the bigger amount (${fmtNum(a)}) and a part of it or an amount to compare (${fmtNum(b)}). To find what is left or the difference, subtract: ${fmtNum(a)} − ${fmtNum(b)}. Line up the places.` : `Two amounts are being put together: ${fmtNum(a)} and ${fmtNum(b)}. To find the total, add them. Line up the places.`,
      explain: `${fmtNum(a)} ${sub ? '−' : '+'} ${fmtNum(b)} = ${fmtNum(ans)}.`,
    });
  }],
  // decimal word problems
  [4, 7, (t, rng) => {
    let a = clean(R(rng, 150, 999) / 100 + (t >= 6 ? R(rng, 0, 20) : 0)), b = clean(R(rng, 11, 99) / (chance(rng, 0.5) ? 10 : 100));
    if (b >= a) b = clean(a / 2 - (a / 2) % 0.01);
    const [prompt, ansRaw, unit] = pick(rng, WORD_DEC)(a, b, nm(rng));
    const ans = clean(ansRaw);
    return decq(rng, {
      prompt, answer: ans,
      hint: ans > a ? `The story joins two amounts, ${dn(a)} and ${dn(b)}, so add them. Line up the decimal points, and write zeros so both have 2 decimal places.` : `The story takes ${dn(b)} away from ${dn(a)} (or compares them), so subtract. Line up the decimal points, and write zeros so both have 2 decimal places.`,
      explain: `${dn(a)} ${ans > a ? '+' : '−'} ${dn(b)} = ${dn(ans)} ${unit}.`,
    }, 2, [misalignAdd(a, b)].filter((x) => x != null));
  }],
  // missing number
  [5, 7, (t, rng) => {
    if (chance(rng, 0.3)) {
      const whole = pick(rng, [5, 10, 2, 3, 20]), b = clean(R(rng, 11, whole * 100 - 11) / 100);
      const ans = clean(whole - b);
      return decq(rng, {
        prompt: `□ + ${dn(b)} = ${whole}. What number goes in the box?`, answer: ans,
        hint: `What do you add to ${dn(b)} to make ${whole}? You can count up from ${dn(b)}, or subtract ${dn(b)} from ${whole}. Write ${whole} as ${whole}.00 so the decimal points line up.`,
        explain: `${whole} − ${dn(b)} = ${dn(ans)}, so ${dn(ans)} + ${dn(b)} = ${whole}.`,
      }, 2, [clean(whole - b + 0.1), clean(whole - 1 - b)]);
    }
    const total = R(rng, 5, 99) * 10000 + (chance(rng, 0.5) ? R(rng, 1, 999) : 0);
    const part = R(rng, 1000, total - 1000);
    const form = R(rng, 0, 2);
    const prompt = form === 0 ? `□ + ${fmtNum(part)} = ${fmtNum(total)}` : form === 1 ? `${fmtNum(total)} − □ = ${fmtNum(part)}` : `□ − ${fmtNum(part)} = ${fmtNum(total - part)}`;
    const ans = form === 2 ? total : total - part;
    return numq({
      prompt: `${prompt}. What number goes in the box?`, answer: ans,
      hint: form === 2 ? `The box is the whole, the biggest number: taking ${fmtNum(part)} away from it leaves ${fmtNum(total - part)}. So put the two parts back together by adding them.` : `The box is one part. The whole is ${fmtNum(total)} and the other part is ${fmtNum(part)}. Find the missing part by subtracting the part you know from the whole.`,
      explain: form === 2 ? `The box is the whole: ${fmtNum(part)} + ${fmtNum(total - part)} = ${fmtNum(total)}.` : `The box is a part: ${fmtNum(total)} − ${fmtNum(part)} = ${fmtNum(ans)}.`,
    });
  }],
  // strategy
  [3, 5, (t, rng) => {
    const big = R(rng, 3, 9) * pick(rng, [1000, 10000]), c = R(rng, 1, 5);
    const near = pick(rng, [1000, 2000, 3000, 10000, 20000].filter((x) => x < big));
    const b = near - c;
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: `Which is an easy way to find ${fmtNum(big)} − ${fmtNum(b)}?`,
        correct: `${fmtNum(big)} − ${fmtNum(near)}, then add ${c}`,
        wrong: [`${fmtNum(big)} − ${fmtNum(near)}, then subtract ${c}`, `${fmtNum(big)} + ${fmtNum(near)}, then subtract ${c}`, `${fmtNum(big)} − ${fmtNum(near)}, then add ${c * 10}`],
        hint: `${fmtNum(b)} is ${c} less than ${fmtNum(near)}, a friendly number. If you take away ${fmtNum(near)} instead, you took away ${c} too many. Check each choice: does it take away ${fmtNum(near)} and then fix the extra ${c} the right way?`,
        explain: `Taking away ${fmtNum(near)} takes away ${c} too many, so add ${c} back: ${fmtNum(big - near)} + ${c} = ${fmtNum(big - b)}.`,
      });
    }
    const other = R(rng, 1000, 9999);
    return mcq(rng, {
      prompt: `Which is an easy way to find ${fmtNum(b)} + ${fmtNum(other)}?`,
      correct: `${fmtNum(near)} + ${fmtNum(other)}, then subtract ${c}`,
      wrong: [`${fmtNum(near)} + ${fmtNum(other)}, then add ${c}`, `${fmtNum(near)} − ${fmtNum(other)}, then subtract ${c}`, `${fmtNum(near)} + ${fmtNum(other)}, then subtract ${c + 1}`],
      hint: `${fmtNum(b)} is ${c} less than ${fmtNum(near)}, a friendly number. If you add ${fmtNum(near)} instead, you added ${c} too many. Which choice adds ${fmtNum(near)} and then fixes the extra ${c} the right way?`,
      explain: `Adding ${fmtNum(near)} adds ${c} too many, so subtract ${c}: ${fmtNum(near + other)} − ${c} = ${fmtNum(b + other)}.`,
    });
  }],
  // two-step
  [6, 7, (t, rng) => {
    if (chance(rng, 0.5)) {
      const a = R(rng, 100, 700) * 1000 + R(rng, 0, 999), b = R(rng, 10000, 99999), c = R(rng, 5000, 60000), e = t >= 7 ? R(rng, 5000, 90000) : 0;
      const n = nm(rng);
      const ans = a + b - c + e;
      return numq({
        prompt: `${n} had ${fmtNum(a)} points. ${n} won ${fmtNum(b)} more, then spent ${fmtNum(c)} on a dragon egg${e ? `, then won ${fmtNum(e)} more` : ''}. How many points does ${n} have now?`,
        answer: ans,
        hint: `There are ${e ? 'three' : 'two'} steps. Start with ${fmtNum(a)} and add the ${fmtNum(b)} points won. Then take away the ${fmtNum(c)} points spent${e ? `, and finally add the ${fmtNum(e)} won at the end` : ''}.`,
        explain: `${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(a + b)}. ${fmtNum(a + b)} − ${fmtNum(c)} = ${fmtNum(a + b - c)}.${e ? ` ${fmtNum(a + b - c)} + ${fmtNum(e)} = ${fmtNum(ans)}.` : ''}`,
      });
    }
    const tank = pick(rng, [20, 25, 50, 40, 30]);
    const u1 = clean(R(rng, 150, 900) / 100), u2 = clean(R(rng, 15, 90) / 10), u3 = t >= 7 ? clean(R(rng, 105, 480) / 100) : 0;
    const ans = clean(tank - u1 - u2 - u3);
    return decq(rng, {
      prompt: `A water tank holds ${tank} L. ${dn(u1)} L is used on Monday${u3 ? `, ${dn(u2)} L on Tuesday and ${dn(u3)} L on Wednesday` : ` and ${dn(u2)} L on Tuesday`}. How many litres are left?`,
      answer: ans,
      hint: `There are ${u3 ? 'three amounts to add first' : 'two steps'}. Add the amounts used: ${dn(u1)} + ${dn(u2)}${u3 ? ` + ${dn(u3)}` : ''}. Then subtract that total from ${tank} L, lining up the decimal points.`,
      explain: `${dn(u1)} + ${dn(u2)}${u3 ? ` + ${dn(u3)}` : ''} = ${dn(u1 + u2 + u3)}. ${tank} − ${dn(u1 + u2 + u3)} = ${dn(ans)} L.`,
    }, 2, [clean(tank - u1 + u2), clean(u1 + u2)]);
  }],
  // reasonableness
  [7, 7, (t, rng) => {
    const a = R(rng, 3, 9) * 100000 + R(rng, 1, 99) * 100, b = R(rng, 1, a / 100000 - 1) * 100000 - R(rng, 1, 30) * 100;
    const right = a - b, big = chance(rng, 0.5) || right <= 150000, wrongAns = big ? right + 100000 : right - 100000;
    const n = nm(rng);
    const good = chance(rng, 0.5);
    const shown = good ? right : wrongAns;
    const est = Math.round(a / 100000) * 100000 - Math.round(b / 100000) * 100000;
    return fixedq({
      prompt: `${n} says ${fmtNum(a)} − ${fmtNum(b)} = ${fmtNum(shown)}. Is that reasonable?`,
      choices: ['Yes, it is close to the estimate', 'No, it is too big', 'No, it is too small'],
      correct: good ? 'Yes, it is close to the estimate' : big ? 'No, it is too big' : 'No, it is too small',
      hint: `Is ${fmtNum(shown)} close to the real answer? Round ${fmtNum(a)} and ${fmtNum(b)} to the nearest hundred thousand and subtract to get an estimate. If ${fmtNum(shown)} is near your estimate, it is reasonable. If it is much bigger or much smaller, it is not.`,
      explain: `Estimate: ${fmtNum(Math.round(a / 100000) * 100000)} − ${fmtNum(Math.round(b / 100000) * 100000)} = ${fmtNum(est)}. The exact answer is ${fmtNum(right)}, so ${good ? 'the answer is reasonable' : `${fmtNum(shown)} is too ${big ? 'big' : 'small'}`}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD5  Understanding facts: zero properties (0 ÷ a = 0, a ÷ 0 undefined), meaning of × and ÷
// ---------------------------------------------------------------------------
const UNDEF = 'It has no answer (not defined)';
const ICONS = ['🍎', '💎', '⭐', '🌰', '🧪', '🪶', '🍪', '🐚'];
const SHARE_CTX = [['potions', 'shelves'], ['gems', 'bags'], ['apples', 'baskets'], ['cookies', 'plates'], ['acorns', 'owls'], ['stickers', 'friends'], ['shells', 'buckets']];

const properties = gen([
  [1, 4, (t, rng) => {
    const a = t <= 2 ? R(rng, 2, 9) : R(rng, 11, 250);
    const [thing, holder] = pick(rng, SHARE_CTX);
    return numq({
      prompt: t <= 2 ? `There are 0 ${thing} to share equally among ${a} ${holder}. How many ${thing} go in each? (0 ÷ ${a})` : `What is 0 ÷ ${fmtNum(a)}?`,
      visual: t <= 2 ? { type: 'groups', groups: a, each: 0 } : undefined,
      answer: 0,
      hint: `0 ÷ ${fmtNum(a)} means sharing nothing at all among ${fmtNum(a)} groups. Picture ${fmtNum(a)} empty ${holder} and no ${thing} to put in them. How many ${thing} land in each one?`,
      explain: `0 ÷ ${fmtNum(a)} = 0 because ${fmtNum(a)} × 0 = 0. Sharing nothing gives each group nothing.`,
    });
  }],
  [1, 5, (t, rng) => {
    const a = t <= 2 ? R(rng, 2, 9) : R(rng, 10, 99);
    const icon = pick(rng, ICONS);
    return fixedq({
      prompt: t <= 2 ? `Can you share these ${a} things into 0 groups? What is ${a} ÷ 0?` : `What is ${a} ÷ 0?`,
      visual: t <= 2 ? { type: 'objects', items: [{ icon, count: a }] } : undefined,
      choices: ['0', String(a), '1', UNDEF], correct: UNDEF,
      hint: `Every division has a matching multiplication: ${a} ÷ 0 = □ would mean □ × 0 = ${a}. Try some numbers for □: 5 × 0, 100 × 0, 1 × 0. Can any of them make ${a}? If none can, choose the answer that says so.`,
      explain: `${a} ÷ 0 would need a number that gives ${a} when multiplied by 0. Any number times 0 is 0, so no number works. Dividing by 0 has no answer: it is not defined.`,
    });
  }],
  [1, 4, (t, rng) => {
    const a = t <= 1 ? R(rng, 2, 10) : t <= 2 ? R(rng, 2, 20) : R(rng, 12, 999);
    const forms = [
      [`${fmtNum(a)} × 0`, 0, 'Any number times 0 is 0.', `${fmtNum(a)} × 0 means ${fmtNum(a)} groups with nothing in each group. How many things are there altogether?`],
      [`0 × ${fmtNum(a)}`, 0, '0 groups of anything is 0.', `0 × ${fmtNum(a)} means zero groups of ${fmtNum(a)}. If you have no groups at all, how many things do you have?`],
      [`${fmtNum(a)} × 1`, a, 'Any number times 1 is itself.', `${fmtNum(a)} × 1 means ${fmtNum(a)} groups with just one thing in each group. How many things is that?`],
      [`${fmtNum(a)} ÷ 1`, a, 'Sharing into 1 group keeps the whole amount together.', `${fmtNum(a)} ÷ 1 means putting ${fmtNum(a)} things into just one group. How many things end up in that group?`],
      [`${fmtNum(a)} ÷ ${fmtNum(a)}`, 1, 'A number divided by itself is 1 (as long as it is not 0).', `${fmtNum(a)} ÷ ${fmtNum(a)} means sharing ${fmtNum(a)} cookies equally among ${fmtNum(a)} friends. How many cookies does each friend get?`],
      [`1 × ${fmtNum(a)}`, a, '1 group of a number is that number.', `1 × ${fmtNum(a)} means one single group of ${fmtNum(a)}. How many things are in one group of ${fmtNum(a)}?`],
    ];
    const [expr, ans, why, fhint] = pick(rng, forms);
    const small = a <= 10;
    let visual;
    if (t <= 2) {
      if (expr === `${a} × 1` || expr === `1 × ${a}`) visual = { type: 'array', rows: 1, cols: a };
      else if (expr === `${a} ÷ 1`) visual = { type: 'groups', groups: 1, each: a };
      else if (expr === `${a} ÷ ${a}` && small) visual = { type: 'groups', groups: a, each: 1 };
      else visual = { type: 'expression', text: expr, big: true };
    }
    return numq({
      prompt: `What is ${expr}?`, visual, answer: ans,
      hint: fhint,
      explain: `${expr} = ${fmtNum(ans)}. ${why}`,
    });
  }],
  // which is true / not true
  [2, 6, (t, rng) => {
    const a = R(rng, 2, t >= 4 ? 99 : 12);
    const T = [`0 ÷ ${a} = 0`, `${a} × 0 = 0`, `${a} ÷ 1 = ${a}`, `${a} ÷ ${a} = 1`, `0 × ${a} = 0`, `${a} × 1 = ${a}`];
    const Fs = [`${a} ÷ 0 = 0`, `${a} ÷ 0 = ${a}`, `0 ÷ ${a} = ${a}`, `${a} × 0 = ${a}`, `${a} ÷ ${a} = 0`, `0 ÷ 0 = 1`, `${a} ÷ 1 = 1`];
    const findTrue = chance(rng, 0.6);
    const correct = pick(rng, findTrue ? T : Fs);
    return mcq(rng, {
      prompt: findTrue ? 'Which number sentence is true?' : 'Which number sentence is NOT true?',
      correct, wrong: sample(rng, findTrue ? Fs : T, 3),
      hint: 'Test each sentence with a matching multiplication: 12 ÷ 3 = 4 is true because 4 × 3 = 12. Sentences with × 0 or ÷ 1 or "a number ÷ itself" follow simple rules, so picture the groups. Any sentence that divides a number by zero cannot be true, because nothing times zero makes that number.',
      explain: findTrue ? `${correct} is true. The others break the rules for 0 and 1.` : `${correct} is not true. ${correct.includes('÷ 0') ? 'Dividing by 0 has no answer: it is not defined.' : 'Check it with multiplication and it does not work.'}`,
    });
  }],
  // array meaning
  [1, 4, (t, rng) => {
    const r = R(rng, 2, t <= 1 ? 5 : 9), c = R(rng, 2, t <= 1 ? 6 : 10), p = r * c;
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: 'Which multiplication sentence matches the array?',
        visual: { type: 'array', rows: r, cols: c },
        correct: `${r} × ${c} = ${p}`, wrong: [`${r} + ${c} = ${r + c}`, `${r} × ${c + 1} = ${r * (c + 1)}`, `${r} × ${c} = ${p + r}`, `${r - 1} × ${c} = ${(r - 1) * c}`],
        hint: 'Which sentence matches the picture? Count the rows going across, and count how many dots are in one row. An array shows rows × dots in each row = total. Check the total in each choice too.',
        explain: `There are ${r} rows of ${c}, so ${r} × ${c} = ${p}.`,
      });
    }
    return mcq(rng, {
      prompt: `${p} counters are put in ${r} equal rows. Which division sentence matches?`,
      visual: { type: 'array', rows: r, cols: c },
      correct: `${p} ÷ ${r} = ${c}`, wrong: [`${p} − ${r} = ${p - r}`, `${p} ÷ ${r} = ${c + 1}`, `${r} × ${p} = ${r * p}`, `${p} ÷ ${r} = ${r}`].filter((s) => s !== `${p} ÷ ${r} = ${c}`),
      hint: `${p} counters are shared into ${r} equal rows. A division sentence for this is: total ÷ number of rows = number in each row. Count the dots in one row of the picture and find the sentence that says that.`,
      explain: `${p} shared into ${r} rows gives ${c} in each row: ${p} ÷ ${r} = ${c}.`,
    });
  }],
  // related facts / fact family
  [2, 5, (t, rng) => {
    const a = R(rng, 2, 10), b = R(rng, 2, 10), p = a * b;
    if (chance(rng, 0.5) || a === b) {
      return numq({
        prompt: `If ${a} × ${b} = ${p}, what is ${p} ÷ ${b}?`, answer: a,
        hint: `${a} × ${b} = ${p} and ${p} ÷ ${b} use the same three numbers. Division undoes multiplication, so ask: ${b} times what makes ${p}? Look back at the fact you were given.`,
        explain: `${a} × ${b} = ${p}, so ${p} ÷ ${b} = ${a}.`,
      });
    }
    return mcq(rng, {
      prompt: `Which is NOT in the fact family for ${a}, ${b} and ${p}?`,
      correct: pick(rng, [`${a} ÷ ${p} = ${b}`, `${p} × ${a} = ${b}`, `${a} + ${b} = ${p}`, `${b} ÷ ${a} = ${p}`]),
      wrong: [`${a} × ${b} = ${p}`, `${b} × ${a} = ${p}`, `${p} ÷ ${a} = ${b}`, `${p} ÷ ${b} = ${a}`],
      hint: `A fact family for ${a}, ${b} and ${p} has two multiplication facts (${a} × ${b} and ${b} × ${a}) and two division facts that start with the biggest number, ${p}. Test each choice: is it true? Does it use + instead, or start a division with a small number?`,
      explain: `The fact family is ${a} × ${b} = ${p}, ${b} × ${a} = ${p}, ${p} ÷ ${a} = ${b} and ${p} ÷ ${b} = ${a}.`,
    });
  }],
  // properties with a missing number
  [3, 7, (t, rng) => {
    const a = R(rng, 2, 12), b = R(rng, 2, 12), c = R(rng, 2, 9);
    const forms = [
      [`${a} × ${b} = ${b} × □`, a, `The order of the factors does not change the product.`, `Both sides multiply the same two numbers, just in a different order. Which number from the left side is missing on the right side?`],
      [`(${a} × ${c}) × ${b} = ${a} × (${c} × □)`, b, `You can group the factors in any way.`, `Both sides multiply the same three numbers, just grouped differently. Which number from the left side is missing on the right side?`],
      [`${a} × ${10 + c} = ${a} × 10 + ${a} × □`, c, `Split ${10 + c} into 10 + ${c} and multiply each part.`, `The right side splits ${10 + c} into 10 and another part, then multiplies each part by ${a}. What do you add to 10 to make ${10 + c}?`],
      [`□ × 1 = ${a * b}`, a * b, `Any number times 1 is itself.`, `□ × 1 means one group of the missing number. Having just one group does not change a number, so which number gives ${a * b}?`],
      [`${a * b} × □ = 0`, 0, `Only 0 times a number gives 0.`, `${a * b} × □ means ${a * b} groups with □ things in each. What must be in each group so there is nothing at all in total?`],
      [`□ ÷ ${a} = 0`, 0, `0 divided by any number (not 0) is 0.`, `□ ÷ ${a} = 0 means sharing something among ${a} groups gives each group nothing. How much was there to share?`],
    ];
    const [expr, ans, why, fhint] = pick(rng, forms);
    return numq({
      prompt: `${expr}. What number goes in the box?`, answer: ans,
      hint: fhint,
      explain: `□ = ${ans}. ${why}`,
    });
  }],
  // why a ÷ 0 is undefined / why 0 ÷ a = 0
  [4, 7, (t, rng) => {
    const n = nm(rng), a = R(rng, 2, 50);
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: `${n} says ${a} ÷ 0 = 0. Why is that wrong?`,
        correct: `No number times 0 makes ${a}, so it has no answer`,
        wrong: [`${a} ÷ 0 is really ${a}`, `${a} ÷ 0 is really 1`, `Only even numbers can be divided by 0`],
        hint: `Check with multiplication: if ${a} ÷ 0 = 0, then 0 × 0 would have to equal ${a}. Does it? Now read each choice: which one explains why no number works?`,
        explain: `If ${a} ÷ 0 = 0, then 0 × 0 would have to be ${a}. But 0 × 0 = 0. No number times 0 is ${a}, so ${a} ÷ 0 has no answer (it is not defined).`,
      });
    }
    return mcq(rng, {
      prompt: `Why is 0 ÷ ${a} = 0?`,
      correct: `Because ${a} × 0 = 0`,
      wrong: [`Because ${a} × 1 = ${a}`, `Because ${a} − ${a} = 0`, `Because ${a} ÷ ${a} = 1`],
      hint: `Every division has a matching multiplication: 0 ÷ ${a} = □ means □ × ${a} = 0. Read each choice: which multiplication fact shows that?`,
      explain: `0 ÷ ${a} = □ means □ × ${a} = 0. That only works when □ is 0, because ${a} × 0 = 0.`,
    });
  }],
  // stories
  [4, 5, (t, rng) => {
    const [thing, holder] = pick(rng, SHARE_CTX), a = R(rng, 3, 12), b = R(rng, 2, 9);
    const k = R(rng, 0, 2);
    if (k === 0) {
      return numq({
        prompt: `A wizard has 0 ${thing} to share equally among ${a} ${holder}. How many ${thing} does each get?`, answer: 0,
        hint: `In the story there are 0 ${thing} and ${a} ${holder}. If there is nothing to share, what can each of the ${holder} get?`,
        explain: `0 ÷ ${a} = 0. Each gets 0 ${thing}.`,
      });
    }
    if (k === 1) {
      return fixedq({
        prompt: `A wizard wants to share ${a * b} ${thing} equally among 0 ${holder}. How many does each get?`,
        choices: ['0', String(a * b), '1', UNDEF], correct: UNDEF,
        hint: `There are ${a * b} ${thing} but 0 ${holder}. Can you put ${thing} into ${holder} that are not there? Also check: what number times 0 could make ${a * b}?`,
        explain: `${a * b} ÷ 0 has no answer (it is not defined). There are no ${holder} to share into, and no number times 0 makes ${a * b}.`,
      });
    }
    return mcq(rng, {
      prompt: `Which story matches ${a * b} ÷ ${a}?`,
      correct: `${a * b} ${thing} are shared equally among ${a} ${holder}`,
      wrong: [`${a * b} ${thing} and ${a} more ${thing}`, `${a} ${holder} each hold ${a * b} ${thing}`, `${a} ${thing} are taken from ${a * b} ${thing}`],
      hint: `${a * b} ÷ ${a} means ${a * b} things split into ${a} equal groups. For each story, ask: is a total being shared equally into ${a} groups? Stories that add more, take some away, or already have ${a * b} in each group are not this division.`,
      explain: `${a * b} ÷ ${a} means ${a * b} shared equally into ${a} groups. Each gets ${b}.`,
    });
  }],
  // challenge combos (brackets always shown)
  [6, 7, (t, rng) => {
    const a = R(rng, 2, 12), b = R(rng, 2, 12), c = R(rng, 2, 9);
    if (chance(rng, 0.4)) {
      const opts = [`0 ÷ ${a}`, `${a} × 0`, `(${a} − ${a}) ÷ ${b}`, `${b} ÷ ${b}`, `0 ÷ (${a} + ${b})`];
      return mcq(rng, {
        prompt: 'Which expression has no answer (is not defined)?',
        correct: pick(rng, [`${a} ÷ (${b} − ${b})`, `${a * c} ÷ (${c} × 0)`, `(${a} + ${b}) ÷ 0`]), wrong: sample(rng, opts, 3),
        hint: 'Work out the brackets in each choice first. Then look for a division where the number you divide BY is zero. Zero divided by a number is fine (it is zero), but a number divided by zero has no answer.',
        explain: 'The one with no answer divides by 0 once the brackets are worked out. The others all have answers.',
      });
    }
    const forms = [
      [`(${a} − ${a}) ÷ ${b}`, 0], [`0 ÷ (${a} × ${b}) + ${c}`, c], [`(${a} × 0) + (${b} ÷ ${b})`, 1],
      [`(${a} ÷ 1) × (${c} − ${c})`, 0], [`(${a} × 1) + (0 ÷ ${b})`, a], [`(${b} ÷ ${b}) × ${a * c}`, a * c],
    ];
    const [expr, ans] = pick(rng, forms);
    return numq({
      prompt: `What is ${expr}?`, answer: ans,
      hint: 'Work out each bracket first, then finish the rest. Use the rules: a number times zero is zero, zero divided by a number is zero, a number divided by itself is one, and times one or divided by one keeps the number the same.',
      explain: `${expr} = ${ans}. Brackets first, then use: times 0 gives 0, 0 divided by a number is 0, and a number divided by itself is 1.`,
    });
  }],
  // friendly grouping (commutative and associative properties)
  [6, 7, (t, rng) => {
    const [x, y] = pick(rng, [[25, 4], [5, 20], [50, 2], [2, 5], [4, 25], [20, 5], [5, 2], [2, 50]]);
    const m = R(rng, 3, t >= 7 ? 99 : 19);
    const order = shuffle(rng, [x, m, y]);
    const ans = x * y * m;
    return numq({
      prompt: `Use a quick way: ${order.join(' × ')} = ?`, answer: ans,
      hint: `You can multiply in any order. Look for two numbers that make a friendly product like ten or one hundred: ${x} × ${y}. Multiply those first, then multiply by ${m}.`,
      explain: `${x} × ${y} = ${x * y}, and ${x * y} × ${m} = ${fmtNum(ans)}. Changing the order or the grouping does not change the product.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD6  Facts: fluency to 10 × 10; strategies for × 11 and × 12
// ---------------------------------------------------------------------------
function factPair(rng, t) {
  if (t === 1) return [pick(rng, [2, 5, 10]), R(rng, 1, 10)];
  if (t === 2) return [pick(rng, [2, 3, 4, 5, 10]), R(rng, 1, 10)];
  if (t === 3) return [pick(rng, [3, 4, 6, 7, 8, 9]), R(rng, 2, 10)];
  if (t === 4) return chance(rng, 0.3) ? [11, R(rng, 2, 9)] : [pick(rng, [6, 7, 8, 9]), R(rng, 3, 10)];
  if (t === 5) return chance(rng, 0.6) ? [pick(rng, [11, 12]), R(rng, 2, 10)] : [pick(rng, [6, 7, 8, 9]), R(rng, 6, 9)];
  if (t === 6) return chance(rng, 0.7) ? [pick(rng, [11, 12]), R(rng, 3, 12)] : [R(rng, 6, 9), R(rng, 6, 9)];
  return [pick(rng, [11, 12]), R(rng, 6, 12)];
}
const FACT_WORD = [
  (a, b) => [`Each box holds ${a} markers. How many markers are in ${b} boxes?`, a * b],
  (a, b) => [`A dragon eats ${a} gems a day. How many gems does it eat in ${b} days?`, a * b],
  (a, b) => [`There are ${b} teams with ${a} players each. How many players are there?`, a * b],
  (a, b) => [`${a * b} muffins are packed in boxes of ${a}. How many boxes are filled?`, b],
  (a, b) => [`${a * b} owls sit in ${b} trees with the same number in each tree. How many owls are in each tree?`, a],
  (a, b) => [`A potion needs ${a} drops of moonwater. How many drops are needed for ${b} potions?`, a * b],
];

const facts = gen([
  [1, 7, (t, rng) => {
    let [a, b] = factPair(rng, t);
    if (chance(rng, 0.5)) [a, b] = [b, a];
    const vis = t <= 2 ? (chance(rng, 0.5) && Math.max(a, b) <= 12 && Math.min(a, b) <= 10
      ? { type: 'array', rows: Math.min(a, b), cols: Math.max(a, b) } : { type: 'groups', groups: a, each: b }) : undefined;
    return numq({
      prompt: `${a} × ${b} = ?`, visual: vis, answer: a * b,
      hint: `${a} × ${b} means ${a} groups of ${b}. ${factHint(a, b)}`,
      explain: `${a} × ${b} = ${a * b}.`,
    });
  }],
  [2, 7, (t, rng) => {
    const [a, b] = factPair(rng, t);
    const p = a * b;
    return numq({
      prompt: `${p} ÷ ${a} = ?`, answer: b,
      visual: t === 2 && p <= 50 ? { type: 'groups', groups: a, each: b } : undefined,
      hint: `${p} ÷ ${a} asks: ${a} times what number makes ${p}? Count by ${a}s until you reach ${p}, or use a times fact you know.`,
      explain: `${a} × ${b} = ${p}, so ${p} ÷ ${a} = ${b}.`,
    });
  }],
  [3, 7, (t, rng) => {
    const [a, b] = factPair(rng, t);
    const p = a * b;
    const form = R(rng, 0, 2);
    const prompt = form === 0 ? `□ × ${a} = ${p}` : form === 1 ? `${a} × □ = ${p}` : `${p} ÷ □ = ${a}`;
    return numq({
      prompt: `${prompt}. What number goes in the box?`, answer: b,
      hint: `The box is a missing factor. Ask: ${a} times what number makes ${p}? Say the ${a} times table until you reach ${p}.`,
      explain: form === 2 ? `${p} ÷ ${b} = ${a} because ${a} × ${b} = ${p}.` : `${a} × ${b} = ${p}, so the missing number is ${b}.`,
    });
  }],
  // strategies for 11 and 12
  [4, 7, (t, rng) => {
    const a = pick(rng, [11, 12]), b = R(rng, 3, 10);
    const k = R(rng, 0, 2);
    if (k === 0) {
      return numq({
        prompt: `${b} × ${a} = ${b} × 10 + ${b} × □. What number goes in the box?`,
        visual: { type: 'array', rows: b, cols: a, split: 10 },
        answer: a - 10,
        hint: `The dashed line splits the ${a} columns into 10 columns and the rest. The left part is ${b} × 10. How many columns are in the right part?`,
        explain: `${a} = 10 + ${a - 10}, so ${b} × ${a} = ${b} × 10 + ${b} × ${a - 10} = ${b * 10} + ${b * (a - 10)} = ${a * b}.`,
      });
    }
    if (k === 1) {
      const right = a === 11 ? `10 × ${b} + ${b}` : `10 × ${b} + 2 × ${b}`;
      const wrong = a === 11 ? [`10 × ${b} + 1`, `10 × ${b} + 11`, `11 × ${b - 1} + 1`] : [`10 × ${b} + 2`, `10 × ${b} × 2`, `12 × ${b - 1} + ${b}`];
      return mcq(rng, {
        prompt: `Which is a good way to find ${a} × ${b}?`,
        visual: t <= 5 ? { type: 'array', rows: b, cols: a, split: 10 } : undefined,
        correct: right, wrong,
        hint: `${a} × ${b} can be split into easier facts because ${a} = 10 + ${a - 10}. Test each choice: does it multiply BOTH parts, 10 and ${a - 10}, by ${b}, and then add? A choice that adds just ${a - 10} instead of ${a - 10} group${a - 10 > 1 ? 's' : ''} of ${b} is a trap.`,
        explain: `${a} × ${b} = ${right} = ${a * b}.`,
      });
    }
    if (a === 12) {
      return numq({
        prompt: `6 × ${b} = ${6 * b}. Use doubling to find 12 × ${b}.`, answer: 12 * b,
        hint: `12 is double 6, so 12 groups of ${b} is double 6 groups of ${b}. Double ${6 * b} by adding it to itself.`,
        explain: `12 × ${b} is double 6 × ${b}: ${6 * b} + ${6 * b} = ${12 * b}.`,
      });
    }
    return numq({
      prompt: `10 × ${b} = ${10 * b}. Use it to find 11 × ${b}.`, answer: 11 * b,
      hint: `11 groups of ${b} is 10 groups plus one more group. Start with ${10 * b} and add one more ${b}.`,
      explain: `11 × ${b} = 10 × ${b} + ${b} = ${10 * b} + ${b} = ${11 * b}.`,
    });
  }],
  // derived facts
  [3, 5, (t, rng) => {
    const a = R(rng, 3, 9), b = R(rng, 3, 9);
    const k = R(rng, 0, 3);
    if (k === 0) {
      return numq({
        prompt: `If ${a} × ${b} = ${a * b}, what is ${a} × ${b + 1}?`, answer: a * (b + 1),
        hint: `${a} × ${b + 1} is one more group of ${a} than ${a} × ${b}. Start at ${a * b} and add ${a}.`,
        explain: `${a} × ${b + 1} = ${a * b} + ${a} = ${a * (b + 1)}.`,
      });
    }
    if (k === 1) {
      return numq({
        prompt: `If ${a} × ${b} = ${a * b}, what is ${a} × ${b - 1}?`, answer: a * (b - 1),
        hint: `${a} × ${b - 1} is one less group of ${a} than ${a} × ${b}. Start at ${a * b} and take away ${a}.`,
        explain: `${a} × ${b - 1} = ${a * b} − ${a} = ${a * (b - 1)}.`,
      });
    }
    if (k === 2 && a <= 5) {
      return numq({
        prompt: `If ${a} × ${b} = ${a * b}, what is ${2 * a} × ${b}?`, answer: 2 * a * b,
        hint: `${2 * a} is double ${a}, so ${2 * a} × ${b} is double ${a} × ${b}. Double ${a * b}.`,
        explain: `${2 * a} × ${b} = double ${a * b} = ${2 * a * b}.`,
      });
    }
    return numq({
      prompt: `9 × ${b} is 10 × ${b} minus one group of ${b}. What is 9 × ${b}?`, answer: 9 * b,
      hint: `First find 10 × ${b}. Then take away one group of ${b}, because 9 groups is one less than 10 groups.`,
      explain: `10 × ${b} = ${10 * b}. ${10 * b} − ${b} = ${9 * b}.`,
    });
  }],
  // word problems
  [4, 7, (t, rng) => {
    const [a, b] = factPair(rng, Math.max(4, t));
    const [prompt, ans] = pick(rng, FACT_WORD)(a, b);
    return numq({
      prompt, answer: ans,
      hint: ans !== a * b ? `A total of ${a * b} is being split into equal groups, so divide. Ask: ${ans === a ? b : a} times what makes ${a * b}?` : `There are equal groups and you want the total, so multiply the number of groups by the number in each group: ${a} × ${b}.`,
      explain: prompt.includes('How many boxes') || prompt.includes('in each tree') ? `${a * b} ÷ ${ans === a ? b : a} = ${ans}.` : `${a} × ${b} = ${ans}.`,
    });
  }],
  // big challenge combo
  [7, 7, (t, rng) => {
    const b = R(rng, 4, 12);
    if (chance(rng, 0.5)) {
      return numq({
        prompt: `(12 × ${b}) − (11 × ${b}) = ?`, answer: b,
        hint: `12 groups of ${b} and 11 groups of ${b} are almost the same. How many more groups of ${b} does the first one have? You do not need to work out the big facts.`,
        explain: `12 × ${b} = ${12 * b} and 11 × ${b} = ${11 * b}. The difference is ${b}, one group of ${b}.`,
      });
    }
    const a = pick(rng, [11, 12]);
    return numq({
      prompt: `${a} × ${b} + ${a} = ?`, answer: a * (b + 1),
      hint: `${a} × ${b} is ${b} groups of ${a}. Adding one more ${a} makes how many groups of ${a}? Work out that fact.`,
      explain: `${a} × ${b} = ${a * b}. ${a * b} + ${a} = ${a * (b + 1)}, which is ${a} × ${b + 1}.`,
    });
  }],
  // two-step fact problems
  [6, 7, (t, rng) => {
    const a = pick(rng, [11, 12]), b = R(rng, 3, 12), n = nm(rng);
    const k = R(rng, 0, 2);
    if (k === 0) {
      const gave = R(rng, 2, a * b - 5);
      return numq({
        prompt: `${n} buys ${b} packs of ${a} stickers and gives away ${gave}. How many stickers are left?`, answer: a * b - gave,
        hint: `There are two steps. First find all the stickers: ${b} packs with ${a} in each. Then take away the ${gave} that were given away.`,
        explain: `${b} × ${a} = ${a * b}. ${a * b} − ${gave} = ${a * b - gave}.`,
      });
    }
    if (k === 1) {
      const c = R(rng, 3, 9), d = R(rng, 3, 9);
      return numq({
        prompt: `A dragon eats ${a} gems a day for ${c} days, then ${d} gems a day for ${b} days. How many gems does it eat altogether?`, answer: a * c + d * b,
        hint: `Work out each part on its own: ${a} × ${c} for the first days and ${d} × ${b} for the other days. Then add the two parts.`,
        explain: `${a} × ${c} = ${a * c} and ${d} × ${b} = ${d * b}. ${a * c} + ${d * b} = ${a * c + d * b}.`,
      });
    }
    const boxes = R(rng, 3, 12), extra = R(rng, 1, a - 1), tot = a * boxes + extra;
    return numq({
      prompt: `${tot} muffins are packed in boxes of ${a}. How many boxes can be filled?`, answer: boxes,
      hint: `Which fact in the ${a} times table is closest to ${tot} without going over? The muffins left over cannot fill a whole box.`,
      explain: `${a} × ${boxes} = ${a * boxes}, with ${extra} muffins left over. So ${boxes} boxes can be filled.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD7  2-digit × 2-digit, 3-digit ÷ 1-digit, × and ÷ by 10/100/1000, estimating, remainders
// ---------------------------------------------------------------------------
const ROUND_UP = [
  (tot, d, n) => `${tot} students are going on a field trip. Each van holds ${d} students. How many vans are needed?`,
  (tot, d, n) => `${n} is packing ${tot} books into boxes. Each box holds ${d} books. How many boxes are needed for all the books?`,
  (tot, d) => `${tot} people are coming to a party. Each table seats ${d}. How many tables are needed?`,
  (tot, d) => `${tot} campers are going canoeing. Each canoe holds ${d} campers. How many canoes are needed?`,
];
const IGNORE = [
  (tot, d, n) => `${n} has ${tot} cm of ribbon. Each bow uses ${d} cm. How many bows can ${n} make?`,
  (tot, d) => `A baker has ${tot} eggs. Each cake needs ${d} eggs. How many cakes can the baker make?`,
  (tot, d) => `${tot} apples are packed in bags of ${d}. How many full bags are there?`,
  (tot, d, n) => `${n} has ${tot} beads. Each bracelet needs ${d} beads. How many bracelets can ${n} finish?`,
];
const AS_FRAC = [
  (tot, d) => [`A ${tot} cm licorice rope is cut into ${d} equal pieces. How long is each piece?`, 'cm'],
  (tot, d) => [`${tot} g of trail mix is shared equally in ${d} bags. How much goes in each bag?`, 'g'],
  (tot, d) => [`A ${tot} m trail is split into ${d} equal parts for a relay. How long is each part?`, 'm'],
];

const multidigit = gen([
  // × ÷ by 10, 100, 1000
  [1, 4, (t, rng) => {
    const p = t === 1 ? 10 : t === 2 ? pick(rng, [10, 100]) : pick(rng, [10, 100, 1000]);
    const div = t >= 2 && chance(rng, 0.45);
    const base = R(rng, 2, t <= 2 ? 99 : 999);
    if (t === 4 && chance(rng, 0.5)) {
      const n = base * p;
      return numq({
        prompt: `□ × ${fmtNum(p)} = ${fmtNum(n)}. What number goes in the box?`, answer: base,
        hint: `The box times ${fmtNum(p)} makes ${fmtNum(n)}. Multiplying by ${fmtNum(p)} puts ${numWords(String(p).length - 1)} zero${p > 10 ? 's' : ''} on the end, so undo it: take ${numWords(String(p).length - 1)} zero${p > 10 ? 's' : ''} off the end of ${fmtNum(n)}.`,
        explain: `${fmtNum(n)} ÷ ${fmtNum(p)} = ${fmtNum(base)}.`,
      });
    }
    if (div) {
      const n = base * p;
      return numq({
        prompt: `${fmtNum(n)} ÷ ${fmtNum(p)} = ?`, answer: base,
        hint: `Dividing by ${fmtNum(p)} moves every digit ${numWords(String(p).length - 1)} place${p > 10 ? 's' : ''} to the right. ${fmtNum(n)} ends in zeros, so you can take ${numWords(String(p).length - 1)} zero${p > 10 ? 's' : ''} off the end.`,
        explain: `${fmtNum(n)} ÷ ${fmtNum(p)} = ${fmtNum(base)}.`,
      });
    }
    const nd = String(base).length;
    return numq({
      prompt: `${fmtNum(base)} × ${fmtNum(p)} = ?`, answer: base * p,
      visual: t === 1 ? { type: 'placevalue', columns: PV.slice(7 - nd - 1), digits: [0, ...digs(base)] } : undefined,
      hint: `Multiplying by ${fmtNum(p)} moves every digit of ${fmtNum(base)} ${numWords(String(p).length - 1)} place${p > 10 ? 's' : ''} to the left in the place-value chart. The empty places on the right get filled with zeros.`,
      explain: `${fmtNum(base)} × ${fmtNum(p)} = ${fmtNum(base * p)}. Each digit moves ${String(p).length - 1} place${p > 10 ? 's' : ''} left.`,
    });
  }],
  // multiply with area model / plain
  [1, 6, (t, rng) => {
    let a, b;
    if (t === 1) { a = R(rng, 12, 49); b = R(rng, 2, 9); }
    else if (t === 2) { a = R(rng, 12, 39); b = R(rng, 11, 19); }
    else if (t <= 4) { a = R(rng, 13, 69); b = R(rng, 12, 49); }
    else { a = R(rng, 35, 99); b = R(rng, 35, 99); }
    const at = Math.floor(a / 10) * 10, ao = a % 10, bt = Math.floor(b / 10) * 10, bo = b % 10;
    let visual;
    if (t <= 2) {
      const headers = ['×', String(at), ...(ao ? [String(ao)] : [])];
      const rowsT = b >= 10 ? [[String(bt), String(at * bt), ...(ao ? [String(ao * bt)] : [])]] : [];
      const rowO = bo ? [[String(bo), String(at * bo), ...(ao ? [String(ao * bo)] : [])]] : [];
      visual = { type: 'table', headers, rows: [...rowsT, ...rowO], title: 'Area model' };
    }
    const ans = a * b;
    const tp = b >= 10 ? `${a} × ${bt} = ${fmtNum(a * bt)} and ${a} × ${bo} = ${fmtNum(a * bo)}. ${fmtNum(a * bt)} + ${fmtNum(a * bo)} = ${fmtNum(ans)}.` : `${at} × ${b} = ${at * b} and ${ao} × ${b} = ${ao * b}. ${at * b} + ${ao * b} = ${ans}.`;
    if (t >= 3 && chance(rng, 0.3)) {
      return mcn(rng, {
        prompt: `${a} × ${b} = ?`, correct: ans,
        extra: [a * bt + a, a * bo + at * bt, at * bt + ao * bo, a * bt + ao * bo].filter((x) => x !== ans),
        hint: `Split ${b} into ${bt} and ${bo}. Find ${a} × ${bt} and ${a} × ${bo}, then add the two parts. Watch out for choices that forget one part.`,
        explain: tp,
      });
    }
    return numq({
      prompt: `${a} × ${b} = ?`, visual, answer: ans,
      hint: t <= 2 ? 'The area model already split the problem into parts. Each inside box is its row number times its column number. Add all the inside boxes together.' : bo ? `Split ${b} into ${bt} + ${bo}. Find ${a} × ${bt} and ${a} × ${bo}, then add the two answers.` : `${b} is ${bt / 10} tens. Find ${a} × ${bt / 10}, then multiply by 10.`,
      explain: tp,
    });
  }],
  // area model missing part
  [2, 4, (t, rng) => {
    const a = R(rng, 1, 5) * 10 + R(rng, 2, 9), b = R(rng, 1, 3) * 10 + R(rng, 2, 9);
    const at = Math.floor(a / 10) * 10, ao = a % 10, bt = Math.floor(b / 10) * 10, bo = b % 10;
    const A = at + ao, B = bt + bo;
    const cells = [[at * bt, ao * bt], [at * bo, ao * bo]];
    const [ri, ci] = [R(rng, 0, 1), R(rng, 0, 1)];
    const ans = cells[ri][ci];
    const rows = [[String(bt), ...cells[0].map(String)], [String(bo), ...cells[1].map(String)]];
    rows[ri][ci + 1] = '?';
    return numq({
      prompt: `This area model shows ${A} × ${B}. What number goes in the ? box?`,
      visual: { type: 'table', headers: ['×', String(at), String(ao)], rows, title: 'Area model' },
      answer: ans,
      hint: `The ? box is in the column headed ${[at, ao][ci]} and the row headed ${[bt, bo][ri]}. Multiply those two numbers.`,
      explain: `The ? box is ${[at, ao][ci]} × ${[bt, bo][ri]} = ${ans}. All four parts add to ${fmtNum(A * B)}.`,
    });
  }],
  // division
  [1, 5, (t, rng) => {
    if (t === 1) {
      const d = R(rng, 2, 4), qt = R(rng, 1, Math.floor(9 / d)), qo = R(rng, 0, Math.floor(9 / d));
      const n = d * (qt * 10 + qo);
      return numq({
        prompt: `Share ${n} equally into ${d} groups. What is ${n} ÷ ${d}?`,
        visual: { type: 'base10', hundreds: 0, tens: Math.floor(n / 10), ones: n % 10 },
        answer: n / d,
        hint: `Share the ${Math.floor(n / 10)} tens rods into ${d} equal groups first, then share the ${n % 10} ones. Count the tens and ones that end up in one group.`,
        explain: `${Math.floor(n / 10)} tens ÷ ${d} = ${qt} tens and ${n % 10} ones ÷ ${d} = ${qo}. So ${n} ÷ ${d} = ${n / d}.`,
      });
    }
    const d = R(rng, 2, 9);
    const q = t === 2 ? R(rng, 11, 40) : R(rng, Math.ceil(100 / d), Math.floor(999 / d));
    const r = t >= 4 ? R(rng, 1, d - 1) : 0;
    const n = q * d + r;
    if (n > 999) return multidigit(t, rng);
    if (!r) {
      return numq({
        prompt: `${n} ÷ ${d} = ?`, answer: q,
        hint: chunkOf(n, d) ? `${n} ÷ ${d} asks: ${d} times what makes ${n}? Split ${n} into ${chunkOf(n, d)} and ${n - chunkOf(n, d)}, divide each part by ${d}, then add the two answers.` : `${n} ÷ ${d} asks: ${d} times what makes ${n}? Count by ${d}s, or use a times fact you know.`,
        explain: `${n} ÷ ${d} = ${q}. Check: ${q} × ${d} = ${n}.`,
      });
    }
    const lab = (qq, rr) => `${qq} R${rr}`;
    return mcq(rng, {
      prompt: `${n} ÷ ${d} = ?`,
      correct: lab(q, r), wrong: [lab(q, r + 1 < d ? r + 1 : r - 1), lab(q - 1, r + d), lab(q + 1, r), lab(q, d - r)].filter((s) => s !== lab(q, r)),
      hint: `Find the biggest multiple of ${d} that fits into ${n}; that gives the whole-number part. The remainder is what is left, and it must be smaller than ${d}. Check each choice: does ${d} × (the first number) + (the remainder) make ${n}?`,
      explain: `${d} × ${q} = ${q * d}, and ${n} − ${q * d} = ${r}. So ${n} ÷ ${d} = ${q} R${r}.`,
    });
  }],
  // remainders in context
  [4, 7, (t, rng) => {
    const kind = pick(rng, t >= 6 ? ['up', 'ignore', 'frac', 'money', 'which'] : ['up', 'ignore', 'frac', 'money']);
    const n = nm(rng);
    if (kind === 'money') {
      const d = pick(rng, [2, 4, 5]), q = R(rng, 20, 199), r = R(rng, 1, d - 1), tot = q * d + r;
      const cents = Math.round(tot * 100 / d);
      return mcq(rng, {
        prompt: `${n} and ${d - 1} friend${d > 2 ? 's' : ''} share $${tot} equally. How much does each person get?`,
        correct: cents, wrong: [q * 100, (q + 1) * 100, q * 100 + r * 10, q * 100 + r].filter((c) => c !== cents), format: (c) => fmtMoney(c),
        hint: `Divide $${tot} by ${d}: ${d} times what is close to ${tot}? Money can be split into cents, so change the leftover dollars into cents (1 dollar = 100 cents) and share those equally too.`,
        explain: `${tot} ÷ ${d} = ${q} R${r}. The leftover $${r} is ${r * 100} cents, and ${r * 100} ÷ ${d} = ${r * 100 / d} cents. Each gets ${fmtMoney(cents)}.`,
      });
    }
    const d = R(rng, 3, 9), q = R(rng, 12, Math.floor(900 / d)), r = R(rng, 1, d - 1), tot = q * d + r;
    if (kind === 'which') {
      const opts = [['up', pick(rng, ROUND_UP)(tot, d, n), 'Round up to the next whole number'], ['ignore', pick(rng, IGNORE)(tot, d, n), 'Ignore the remainder'], ['frac', pick(rng, AS_FRAC)(tot, d)[0], 'Share the remainder as a fraction']];
      const [, story, correct] = pick(rng, opts);
      return fixedq({
        prompt: `${story} What should you do with the remainder?`,
        choices: ['Round up to the next whole number', 'Ignore the remainder', 'Share the remainder as a fraction'], correct,
        hint: `First find the remainder of ${tot} ÷ ${d}. Then think about the story. Round up if the leftover things still need a place (like people who need a seat). Ignore it if the leftover is not enough to make one more whole thing. Share it as a fraction if the leftover can be cut into equal parts.`,
        explain: `${tot} ÷ ${d} = ${q} R${r}. Here you should ${correct.toLowerCase()}.`,
      });
    }
    if (kind === 'up') {
      return mcq(rng, {
        prompt: pick(rng, ROUND_UP)(tot, d, n),
        correct: String(q + 1), wrong: [String(q), `${q} R${r}`, String(q + 2), ftok({ n: tot, d })],
        hint: `Divide ${tot} by ${d}; there will be ${r} left over. Do those ${r} still need a spot of their own? If yes, you need one more than the number of full groups.`,
        explain: `${tot} ÷ ${d} = ${q} R${r}. The ${r} left over still need a spot, so round up to ${q + 1}.`,
      });
    }
    if (kind === 'ignore') {
      return mcq(rng, {
        prompt: pick(rng, IGNORE)(tot, d, n),
        correct: String(q), wrong: [String(q + 1), `${q} R${r}`, String(q - 1), ftok({ n: tot, d })],
        hint: `Divide ${tot} by ${d}; there will be ${r} left over. Is ${r} enough to make one more full group of ${d}? If not, only count the full groups.`,
        explain: `${tot} ÷ ${d} = ${q} R${r}. The ${r} left over is not enough for another one, so the answer is ${q}.`,
      });
    }
    const [story, unit] = pick(rng, AS_FRAC)(tot, d);
    const f = F(r, d);
    return mcq(rng, {
      prompt: `${story} Share the remainder too.`,
      correct: `${ftok({ n: tot, d })} ${unit}`,
      wrong: [`${q} ${unit}`, `${q + 1} ${unit}`, `${q} R${r} ${unit}`, `${ftok({ n: q * d + (d - r), d })} ${unit}`, `${mixed(q, 1, r + 1 === d ? r + 2 : r + 1)} ${unit}`],
      hint: `Divide ${tot} by ${d} to find the whole-number part. The ${unit} left over can be cut into ${d} equal parts too, so each share gets an extra fraction: the remainder on top and ${d} on the bottom. Simplify the fraction if you can.`,
      explain: `${tot} ÷ ${d} = ${q} R${r}. Sharing the ${r} left over gives ${frac(r, d)}${f.n !== r ? ` = ${frac(f.n, f.d)}` : ''} more each. Each is ${ftok({ n: tot, d })} ${unit}.`,
    });
  }],
  // estimate
  [3, 5, (t, rng) => {
    if (chance(rng, 0.5)) {
      const a = R(rng, 2, 9) * 10 + pick(rng, [-2, -1, 1, 2]), b = R(rng, 2, 9) * 10 + pick(rng, [-2, -1, 1, 2]);
      const ra = Math.round(a / 10) * 10, rb = Math.round(b / 10) * 10, est = ra * rb;
      return mcq(rng, {
        prompt: `Which is the best estimate for ${a} × ${b}?`,
        correct: est, wrong: [est / 10, est * 10, (ra - 10) * rb, ra + rb, ra * (rb + 10)].filter((x) => x > 0 && x !== est), format: fmtNum,
        hint: `You only need a close answer. Round ${a} and ${b} to the nearest ten, then multiply the rounded numbers. Tens times tens make hundreds, so check how many zeros your answer should have.`,
        explain: `${a} is about ${ra} and ${b} is about ${rb}. ${ra} × ${rb} = ${fmtNum(est)}.`,
      });
    }
    const d = R(rng, 3, 9), q10 = R(rng, 2, Math.floor(99 / d)) * 10, n = q10 * d + pick(rng, [-3, -2, -1, 1, 2, 3, 4]);
    if (n < 100 || n > 999) return multidigit(3, rng);
    return mcq(rng, {
      prompt: `Which is the best estimate for ${n} ÷ ${d}?`,
      correct: q10, wrong: [q10 / 10, q10 * 10, q10 + 10, q10 - 10].filter((x) => x > 0 && Number.isInteger(x)), format: fmtNum,
      hint: `You only need a close answer. Find a number close to ${n} that ${d} divides easily, like ${d} times ten, ${d} times twenty, ${d} times thirty and so on. Then divide that friendly number by ${d}.`,
      explain: `${n} is close to ${q10 * d}, and ${q10 * d} ÷ ${d} = ${q10}. So ${n} ÷ ${d} is about ${q10}.`,
    });
  }],
  // word problems
  [4, 7, (t, rng) => {
    if (chance(rng, 0.55)) {
      const a = R(rng, 12, t >= 5 ? 99 : 48), b = R(rng, 12, t >= 5 ? 99 : 36);
      const ctx = pick(rng, [
        `A school orders ${a} boxes of pencils. Each box has ${b} pencils. How many pencils is that?`,
        `A theatre has ${a} rows with ${b} seats in each row. How many seats are there?`,
        `A dragon flies ${b} km each day for ${a} days. How far does it fly?`,
        `${a} owls each collect ${b} acorns. How many acorns do they collect in all?`,
        `A garden has ${a} rows of ${b} tulips. How many tulips are there?`,
      ]);
      return numq({
        prompt: ctx, answer: a * b,
        hint: `There are ${a} equal groups with ${b} in each, so multiply ${a} × ${b}. Split ${b} into tens and ones, multiply ${a} by each part, and add.`,
        explain: `${a} × ${b} = ${fmtNum(a * b)}.`,
      });
    }
    const d = R(rng, 3, 9), q = R(rng, Math.ceil(100 / d), Math.floor(999 / d)), n = q * d;
    const ctx = pick(rng, [
      `A baker packs ${n} muffins into boxes of ${d}. How many boxes are filled?`,
      `${n} stickers are shared equally among ${d} friends. How many does each friend get?`,
      `A ${n} km road trip takes ${d} days, driving the same distance each day. How far is each day?`,
      `${n} gems are sorted into ${d} equal piles. How many gems are in each pile?`,
    ]);
    return numq({
      prompt: ctx, answer: q,
      hint: `${n} is being split into equal groups (${d} in each group, or ${d} equal shares), so divide ${n} by ${d}. ${chunkOf(n, d) ? `Split ${n} into ${chunkOf(n, d)} and ${n - chunkOf(n, d)}, which are easier to divide by ${d}.` : 'Use a times fact you know.'}`,
      explain: `${n} ÷ ${d} = ${q}. Check: ${q} × ${d} = ${n}.`,
    });
  }],
  // check / reverse
  [5, 7, (t, rng) => {
    const d = R(rng, 3, 9), q = R(rng, 21, Math.floor(999 / d)), n = q * d;
    if (chance(rng, t >= 6 ? 0.15 : 0.5)) {
      return mcq(rng, {
        prompt: `${nm(rng)} found ${n} ÷ ${d} = ${q}. Which calculation checks this?`,
        correct: `${q} × ${d} = ${n}`, wrong: [`${n} × ${d} = ${q}`, `${q} + ${d} = ${n}`, `${n} − ${d} = ${q}`, `${q} ÷ ${d} = ${n}`],
        hint: `Division and multiplication undo each other. To check ${n} ÷ ${d} = ${q}, multiply the answer by the number you divided by. Which choice does that and gets back to ${n}?`,
        explain: `If ${n} ÷ ${d} = ${q}, then ${q} × ${d} should equal ${n}. It does.`,
      });
    }
    // missing factor with a 1-digit known factor (so it stays a 3-digit ÷ 1-digit division)
    const b = R(rng, t >= 6 ? 6 : 3, 9), a = R(rng, Math.ceil(100 / b), Math.floor(999 / b)), p = a * b, ch = chunkOf(p, b);
    return numq({
      prompt: `□ × ${b} = ${p}. What number goes in the box?`, answer: a,
      hint: `The box is ${p} ÷ ${b}: which number times ${b} makes ${p}? ${ch ? `Split ${p} into ${ch} and ${p - ch}, divide each part by ${b}, then add the two answers.` : `Try ${b} times ten, ${b} times twenty and so on to see where ${p} fits.`}`,
      explain: `${p} ÷ ${b} = ${a}. Check: ${a} × ${b} = ${p}, so the missing number is ${a}.`,
    });
  }],
  // two-step
  [6, 7, (t, rng) => {
    const k = R(rng, 0, 2);
    if (k === 0) {
      const r = R(rng, 15, 32), s = R(rng, 18, 40), sold = R(rng, Math.floor(r * s / 2), r * s - 5);
      return numq({
        prompt: `A theatre has ${r} rows of ${s} seats. ${fmtNum(sold)} tickets are sold. How many seats are empty?`,
        answer: r * s - sold,
        hint: `There are two steps. First find the total number of seats: ${r} rows × ${s} seats. Then take away the ${fmtNum(sold)} seats that are sold.`,
        explain: `${r} × ${s} = ${fmtNum(r * s)} seats. ${fmtNum(r * s)} − ${fmtNum(sold)} = ${r * s - sold}.`,
      });
    }
    if (k === 1) {
      const d = R(rng, 3, 8), bags = R(rng, 12, 36), each = pick(rng, [12, 15, 20, 24, 25]);
      const tot = bags * each;
      if (tot % d !== 0 || tot > 999) return multidigit(6, rng);
      return numq({
        prompt: `There are ${bags} bags of ${each} marbles. The marbles are shared equally among ${d} classes. How many marbles does each class get?`,
        answer: tot / d,
        hint: `There are two steps. First find all the marbles: ${bags} bags × ${each} marbles. Then share that total equally among ${d} classes.`,
        explain: `${bags} × ${each} = ${tot}. ${tot} ÷ ${d} = ${tot / d}.`,
      });
    }
    const d = R(rng, 4, 9), kids = R(rng, 100, 700), adults = R(rng, 5, 30);
    const tot = kids + adults, q = Math.ceil(tot / d);
    if (tot % d === 0) return multidigit(6, rng);
    return mcq(rng, {
      prompt: `${kids} students and ${adults} adults go to the science centre in vans. Each van holds ${d} people. How many vans are needed?`,
      correct: String(q), wrong: [String(q - 1), `${q - 1} R${tot % d}`, String(Math.ceil(kids / d)), String(q + 1)],
      hint: `First add the ${kids} students and ${adults} adults to get the total number of people. Then divide by ${d}. If some people are left over, they still need a van.`,
      explain: `${kids} + ${adults} = ${tot}. ${tot} ÷ ${d} = ${q - 1} R${tot % d}. The extra people still need a van, so ${q} vans.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD8  One-step equations with a letter variable
// ---------------------------------------------------------------------------
const VARS = ['n', 'x', 'y', 'm', 'a', 'b', 'k', 'p', 't', 'w', 'c', 's', 'g', 'h'];
function makeEq(rng, t, ops) {
  const v = pick(rng, VARS);
  const op = pick(rng, ops || (t <= 2 ? ['add', 'addL', 'sub'] : t === 3 ? ['mul', 'div', 'mul'] : ['add', 'addL', 'sub', 'subR', 'mul', 'div', 'divR']));
  let x, a;
  const big = t >= 5;
  if (op === 'add' || op === 'addL' || op === 'sub' || op === 'subR') {
    x = t <= 1 ? R(rng, 1, 12) : big ? R(rng, 25, t >= 6 ? 900 : 400) : R(rng, 5, 80);
    a = t <= 1 ? R(rng, 1, 9) : big ? R(rng, 15, t >= 6 ? 600 : 300) : R(rng, 3, 60);
  } else {
    x = t <= 4 ? R(rng, 2, 10) : R(rng, t >= 6 ? 11 : 6, t >= 6 ? 60 : 25);
    a = R(rng, 2, t >= 6 ? 12 : 9);
  }
  let lhs, c;
  if (op === 'add') { lhs = `${v} + ${a}`; c = x + a; }
  if (op === 'addL') { lhs = `${a} + ${v}`; c = x + a; }
  if (op === 'sub') { lhs = `${v} − ${a}`; c = x - a; if (c < 0) { [x, a] = [a + x, x]; c = x - a; } }
  if (op === 'subR') { const A = x + a; lhs = `${A} − ${v}`; c = a; a = A; }
  if (op === 'mul') { lhs = `${a}${v}`; c = a * x; }
  if (op === 'div') { lhs = `${v} ÷ ${a}`; c = x; x = a * c; }
  if (op === 'divR') { const A = a * x; lhs = `${A} ÷ ${v}`; c = a; a = A; }
  if (op === 'sub') lhs = `${v} − ${a}`;
  const flip = t >= 4 && chance(rng, 0.35);
  const text = flip ? `${fmtNum(c)} = ${lhs}` : `${lhs} = ${fmtNum(c)}`;
  return { v, op, a, c, x, lhs, text };
}
function eqExplain(e) {
  const { v, op, a, c, x } = e;
  switch (op) {
    case 'add': case 'addL': return `Subtract ${a} from ${c}: ${c} − ${a} = ${x}. Check: ${op === 'add' ? `${x} + ${a}` : `${a} + ${x}`} = ${c}.`;
    case 'sub': return `Add ${a} to ${c}: ${c} + ${a} = ${x}. Check: ${x} − ${a} = ${c}.`;
    case 'subR': return `What do you take from ${a} to leave ${c}? ${a} − ${c} = ${x}. Check: ${a} − ${x} = ${c}.`;
    case 'mul': return `${a}${v} means ${a} × ${v}. ${c} ÷ ${a} = ${x}. Check: ${a} × ${x} = ${c}.`;
    case 'div': return `Multiply: ${c} × ${a} = ${x}. Check: ${x} ÷ ${a} = ${c}.`;
    default: return `${a} ÷ ${c} = ${x}. Check: ${a} ÷ ${x} = ${c}.`;
  }
}
function eqHint(e) {
  const { v, op, a, c } = e;
  switch (op) {
    case 'add': case 'addL': return `${v} is a number that makes ${c} when you add ${a} to it. Undo the adding: take ${a} away from ${c}.`;
    case 'sub': return `${v} is a number that becomes ${c} after you take away ${a}. Undo the taking away: add ${a} back onto ${c}.`;
    case 'subR': return `${a} take away some number leaves ${c}. How much must you take from ${a} to leave ${c}? Subtract ${c} from ${a}.`;
    case 'mul': return `${a}${v} means ${a} × ${v}: ${a} groups of the unknown number make ${c}. Undo the multiplying: divide ${c} by ${a}.`;
    case 'div': return `${v} ÷ ${a} = ${c} means the unknown number shared into ${a} equal groups gives ${c} in each group. Undo the dividing: multiply ${c} by ${a}.`;
    default: return `${a} ÷ ${v} = ${c} asks: ${a} shared into how many equal groups gives ${c} in each? Think: ${c} times what number makes ${a}?`;
  }
}
const EQ_OPDESC = { add: 'has a number added to it', addL: 'has a number added to it', sub: 'has a number taken away', mul: 'is multiplied by a number', div: 'is divided by a number' };
const EQ_STORIES = [
  // [story, right equation, wrong equations, solution, what the letter stands for]
  (v, a, b, n) => [`${n} has some stickers. ${n} gets ${a} more and now has ${a + b}.`, `${v} + ${a} = ${a + b}`, [`${v} − ${a} = ${a + b}`, `${a}${v} = ${a + b}`, `${v} + ${a + b} = ${a}`], b, 'the number of stickers at the start'],
  (v, a, b, n) => [`${n} had some gems and gave away ${a}. Now ${n} has ${b}.`, `${v} − ${a} = ${b}`, [`${v} + ${a} = ${b}`, `${a} − ${v} = ${b}`, `${v} ÷ ${a} = ${b}`], a + b, 'the number of gems at the start'],
  (v, a, b) => [`${a} bags hold the same number of acorns. There are ${a * b} acorns in all.`, `${a}${v} = ${a * b}`, [`${v} + ${a} = ${a * b}`, `${v} ÷ ${a} = ${a * b}`, `${a * b}${v} = ${a}`], b, 'the number of acorns in each bag'],
  (v, a, b, n) => [`${n} shares some cookies equally among ${a} friends. Each friend gets ${b}.`, `${v} ÷ ${a} = ${b}`, [`${a}${v} = ${b}`, `${v} − ${a} = ${b}`, `${a} ÷ ${v} = ${b}`], a * b, 'the number of cookies at the start'],
  (v, a, b) => [`A dragon had some coins. It found ${a} more coins and now has ${a + b}.`, `${v} + ${a} = ${a + b}`, [`${v} − ${a} = ${a + b}`, `${a}${v} = ${a + b}`, `${v} = ${a + b} + ${a}`], b, 'the number of coins at the start'],
  (v, a, b, n) => [`${n} reads the same number of pages each day. After ${a} days, ${n} has read ${a * b} pages.`, `${a}${v} = ${a * b}`, [`${v} + ${a} = ${a * b}`, `${v} − ${a} = ${a * b}`, `${v} ÷ ${a} = ${a * b}`], b, 'the number of pages read each day'],
];

const equations = gen([
  [1, 7, (t, rng) => {
    const e = makeEq(rng, t);
    return numq({
      prompt: `Solve for ${e.v}: ${e.text}`,
      visual: t <= 2 ? { type: 'balance', left: e.lhs, right: fmtNum(e.c), tilt: 'level' } : undefined,
      answer: e.x,
      hint: eqHint(e), hintVisual: { type: 'balance', left: e.lhs, right: fmtNum(e.c), tilt: 'level' },
      explain: `${e.v} = ${fmtNum(e.x)}. ${eqExplain(e)}`,
    });
  }],
  [2, 6, (t, rng) => {
    const v = pick(rng, VARS), a = R(rng, 2, 9), b = R(rng, 3, t >= 4 ? 30 : 12);
    const [story, right, wrong, sol, what] = pick(rng, EQ_STORIES)(v, a, b, nm(rng));
    return mcq(rng, {
      prompt: `${story} Let ${v} be ${what}. Which equation matches?`,
      correct: right, wrong,
      hint: `${cap(v)} stands for ${what}. Follow the story in order: does ${v} get more (+), get fewer (−), come in equal groups (×, written like ${a}${v}), or get shared equally (÷)? Then check that the other side of the equation is the amount at the end.`,
      explain: `The equation is ${right}. Solving it gives ${v} = ${sol}.`,
    });
  }],
  [2, 4, (t, rng) => {
    const v = pick(rng, VARS), a = R(rng, 2, 9), x = R(rng, 2, 10);
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: `In ${a}${v} = ${a * x}, what does ${a}${v} mean?`,
        correct: `${a} × ${v}`, wrong: [`${a} + ${v}`, `${a}0 + ${v}`, `${v} − ${a}`, `${v} ÷ ${a}`],
        hint: `A number written right next to a letter is a short way to write one operation. Test each choice: if ${v} = ${x}, which choice gives ${a * x}?`,
        explain: `${a}${v} means ${a} × ${v}. Here ${v} = ${x} because ${a} × ${x} = ${a * x}.`,
      });
    }
    const e = makeEq(rng, t);
    return mcq(rng, {
      prompt: `In ${e.text}, what does the letter ${e.v} stand for?`,
      correct: 'An unknown number', wrong: ['Always the number 0', 'Always the number 1', 'A unit, like metres'],
      hint: `A letter in an equation works like an empty box □. Could ${e.v} be a unit like metres? Is it always the same number in every equation? Here you could solve ${e.text} to find what ${e.v} is.`,
      explain: `${e.v} stands for an unknown number. Here ${e.v} = ${e.x}.`,
    });
  }],
  [3, 6, (t, rng) => {
    const e = makeEq(rng, t);
    // plausible slips: the wrong inverse operation, or off by a little
    const slips = { add: [e.c + e.a], addL: [e.c + e.a], sub: [e.c - e.a], subR: [e.a + e.c], mul: [e.c - e.a, e.c * e.a, e.c + e.a], div: [e.c + e.a, e.c - e.a, e.c / e.a], divR: [e.a * e.c, e.a - e.c] }[e.op] || [];
    const wrong = [...slips, e.x + 1, e.x - 1, e.x + 10, e.x - 10, e.x + 2].filter((y) => y > 0 && y !== e.x && Number.isInteger(y));
    return mcq(rng, {
      prompt: `Which value of ${e.v} makes ${e.text} true?`,
      correct: e.x, wrong, format: (y) => `${e.v} = ${fmtNum(y)}`,
      hint: `Test each choice: put its number in place of ${e.v} in ${e.text} and work out that side. The correct value makes both sides equal.`,
      explain: `${e.v} = ${fmtNum(e.x)}. ${eqExplain(e)}`,
    });
  }],
  [3, 6, (t, rng) => {
    const e = makeEq(rng, t, ['add', 'sub', 'mul', 'div']);
    const map = {
      add: [`Subtract ${e.a} from ${e.c}`, [`Add ${e.a} to ${e.c}`, `Multiply ${e.c} by ${e.a}`, `Divide ${e.c} by ${e.a}`]],
      sub: [`Add ${e.a} to ${e.c}`, [`Subtract ${e.a} from ${e.c}`, `Multiply ${e.c} by ${e.a}`, `Divide ${e.c} by ${e.a}`]],
      mul: [`Divide ${e.c} by ${e.a}`, [`Multiply ${e.c} by ${e.a}`, `Subtract ${e.a} from ${e.c}`, `Add ${e.a} to ${e.c}`]],
      div: [`Multiply ${e.c} by ${e.a}`, [`Divide ${e.c} by ${e.a}`, `Add ${e.a} to ${e.c}`, `Subtract ${e.a} from ${e.c}`]],
    };
    const [right, wrong] = map[e.op];
    return mcq(rng, {
      prompt: `To solve ${e.text}, what can you do?`,
      correct: right, wrong,
      hint: `To solve, undo what is done to ${e.v}. In ${e.text}, ${e.v} ${EQ_OPDESC[e.op]}. The opposite of adding is subtracting, the opposite of subtracting is adding, the opposite of multiplying is dividing, and the opposite of dividing is multiplying. Also check which numbers each choice uses.`,
      explain: eqExplain(e),
    });
  }],
  [5, 7, (t, rng) => {
    const x = R(rng, 2, 12), v = pick(rng, VARS);
    const mk = (y, op) => {
      const a = R(rng, 2, 9);
      if (op === 0) return `${v} + ${a} = ${y + a}`;
      if (op === 1) return `${a}${v} = ${a * y}`;
      if (op === 2) return `${v} − ${Math.min(a, y - 1) || 1} = ${y - (Math.min(a, y - 1) || 1)}`;
      return `${a * y} ÷ ${v} = ${a}`;
    };
    const ops = shuffle(rng, [0, 1, 2, 3]);
    const correct = mk(x, ops[0]);
    const others = [x + 1, x + 2, x - 1 > 1 ? x - 1 : x + 3].map((y, i) => mk(y, ops[i + 1]));
    return mcq(rng, {
      prompt: `Which equation is true when ${v} = ${x}?`,
      correct, wrong: others,
      hint: `Put ${x} in place of ${v} in each equation. Work out the side with the letter, then see if it matches the other side. Only one equation balances.`,
      explain: `With ${v} = ${x}, ${correct} is true. The others need a different value of ${v}.`,
    });
  }],
  [6, 7, (t, rng) => {
    if (t === 7 && chance(rng, 0.5)) {
      const e = makeEq(rng, 5, ['add', 'sub', 'mul']);
      const act = e.op === 'add' ? `subtract ${e.a} from` : e.op === 'sub' ? `add ${e.a} to` : `divide by ${e.a} on`;
      return numq({
        prompt: `${e.lhs} = ${e.c}. If you ${act} both sides, what number is on the right side?`,
        answer: e.x,
        hint: `Doing the same thing to both sides keeps the balance level. On the left, ${e.lhs} becomes just ${e.v}. On the right, ${e.op === 'mul' ? `divide ${e.c} by ${e.a}` : e.op === 'sub' ? `add ${e.a} to ${e.c}` : `take ${e.a} away from ${e.c}`}.`,
        explain: `The right side becomes ${e.x}, so ${e.v} = ${e.x}. ${eqExplain(e)}`,
      });
    }
    const a = R(rng, 3, 12), x = R(rng, 6, 40), n = nm(rng);
    const k = R(rng, 0, 2);
    const [story, v, eq, ans, sh] = k === 0
      ? [`${n} bought ${a} packs of cards with the same number in each pack. That is ${a * x} cards. How many cards are in each pack?`, 'c', `${a}c = ${a * x}`, x, `${a}c means ${a} packs with c cards in each. Undo the multiplying: divide ${a * x} by ${a}.`]
      : k === 1 ? [`After spending $${a * 3}, ${n} has $${x * 2} left. How much did ${n} start with?`, 's', `s − ${a * 3} = ${x * 2}`, x * 2 + a * 3, `s is the amount at the start. Spending took $${a * 3} away, so undo it: add $${a * 3} back onto $${x * 2}.`]
        : [`${n} shares some berries equally among ${a} owls. Each owl gets ${x}. How many berries were there?`, 'b', `b ÷ ${a} = ${x}`, a * x, `b is all the berries before sharing. Sharing among ${a} owls divided them, so undo it: multiply ${x} by ${a}.`];
    return numq({
      prompt: `${story} (Use ${eq}.)`, answer: ans,
      hint: sh,
      explain: `${eq}, so ${v} = ${ans}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD9  Patterns in tables of values
// ---------------------------------------------------------------------------
const TABLE_CTX = [
  { a: 'Figure', b: 'Squares', at: (x) => `Figure ${x}`, ask: (x) => `how many squares are in Figure ${x}?`, rev: (v) => `Which figure has ${v} squares?` },
  { a: 'Figure', b: 'Toothpicks', at: (x) => `Figure ${x}`, ask: (x) => `how many toothpicks are in Figure ${x}?`, rev: (v) => `Which figure uses ${v} toothpicks?` },
  { a: 'Dragons', b: 'Legs', m: 4, k: 0, at: (x) => `${x} dragons`, ask: (x) => `how many legs do ${x} dragons have?`, rev: (v) => `How many dragons have ${v} legs in all?` },
  { a: 'Owls', b: 'Wings', m: 2, k: 0, at: (x) => `${x} owls`, ask: (x) => `how many wings do ${x} owls have?`, rev: (v) => `How many owls have ${v} wings in all?` },
  { a: 'Tables', b: 'Chairs', at: (x) => `${x} tables`, ask: (x) => `how many chairs are needed for ${x} tables?`, rev: (v) => `How many tables are there when ${v} chairs are needed?` },
  { a: 'Weeks', b: 'Dollars saved', at: (x) => `${x} weeks`, ask: (x) => `how many dollars are saved after ${x} weeks?`, rev: (v) => `After how many weeks are ${v} dollars saved?` },
  { a: 'Hours', b: 'Kilometres', at: (x) => `${x} hours`, ask: (x) => `how many kilometres are travelled after ${x} hours?`, rev: (v) => `After how many hours have ${v} km been travelled?` },
  { a: 'Potions', b: 'Drops', at: (x) => `${x} potions`, ask: (x) => `how many drops are needed for ${x} potions?`, rev: (v) => `How many potions can be made with ${v} drops?` },
  { a: 'Step', b: 'Gems', at: (x) => `step ${x}`, ask: (x) => `how many gems are there at step ${x}?`, rev: (v) => `Which step has ${v} gems?` },
  { a: 'Days', b: 'Pages read', at: (x) => `${x} days`, ask: (x) => `how many pages are read after ${x} days?`, rev: (v) => `After how many days have ${v} pages been read?` },
  { a: 'Rows', b: 'Seats', at: (x) => `${x} rows`, ask: (x) => `how many seats are in ${x} rows?`, rev: (v) => `How many rows have ${v} seats?` },
];
function tableRule(rng, t, hard = false) {
  const ctx = pick(rng, hard ? TABLE_CTX.filter((c) => c.m == null) : TABLE_CTX);
  let m = ctx.m ?? R(rng, t <= 1 ? 1 : 2, t <= 2 ? 4 : 9);
  let k = ctx.k ?? (t <= 1 ? R(rng, 0, 3) : R(rng, 0, t <= 3 ? 6 : 12));
  if (t <= 1 && ctx.m == null) { m = R(rng, 1, 4); k = R(rng, 0, 5); }
  if (m === 1 && k === 0) k = R(rng, 1, 5);
  if (hard) { m = Math.max(m, 3); if (!k) k = R(rng, 1, 12); }
  return { ...ctx, m, k, f: (n) => m * n + k };
}
const exprOf = (m, k, v = 'n') => (m === 1 ? `${v} + ${k}` : k === 0 ? `${m}${v}` : `${m}${v} + ${k}`);
function sameRule(m1, k1, m2, k2) { return [1, 2, 3, 4, 5].every((n) => m1 * n + k1 === m2 * n + k2); }

const tables = gen([
  [1, 5, (t, rng) => {
    const r = tableRule(rng, t);
    if (t <= 1 && r.f(3) <= 20 && chance(rng, 0.5)) {
      const shape = pick(rng, ['square', 'dot', 'triangle']), N = R(rng, 4, 5);
      return numq({
        prompt: `Steps 1, 2 and 3 are shown. Each step has ${r.m} more ${shape}${r.m === 1 ? '' : 's'} than the one before. How many ${shape}s will Step ${N} have?`,
        visual: { type: 'growing', steps: [r.f(1), r.f(2), r.f(3)], shape },
        answer: r.f(N),
        hint: `Each step adds ${r.m} more ${shape}${r.m === 1 ? '' : 's'}. Step 3 has ${r.f(3)}. Keep adding ${r.m} for each step until you reach Step ${N}.`,
        explain: `Step 3 has ${r.f(3)}. ${[4, 5].slice(0, N - 3).map((n) => `Step ${n}: ${r.f(n - 1)} + ${r.m} = ${r.f(n)}`).join('. ')}.`,
      });
    }
    const ns = t <= 3 ? [1, 2, 3, 4, 5] : t === 4 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, R(rng, 8, 12)];
    const bi = t <= 1 ? ns.length - 1 : R(rng, 1, ns.length - 1);
    const rows = ns.map((n, i) => [n, i === bi ? '?' : r.f(n)]);
    return numq({
      prompt: `What number goes in the ? spot in the table?`,
      visual: { type: 'table', headers: [r.a, r.b], rows },
      answer: r.f(ns[bi]),
      hint: ns[bi] - ns[bi - 1] > 1 ? `The ? is for ${r.a} ${ns[bi]}, further down the table. Find the rule: how much do the ${r.b} go up for each row, and what else is added in row 1? Then use the rule for ${ns[bi]}.` : `Look at the ${r.b} column: how much does it go up from one row to the next? Add that same amount to the number just above the ?.`,
      explain: `The ${r.b} go up by ${r.m} each time (rule: ${exprOf(r.m, r.k)}). For ${ns[bi]}: ${r.m === 1 ? '' : `${r.m} × `}${ns[bi]}${r.k ? ` + ${r.k}` : ''} = ${r.f(ns[bi])}.`,
    });
  }],
  [2, 5, (t, rng) => {
    const r = tableRule(rng, t), s = r.f(1);
    const rows = [1, 2, 3, 4].map((n) => [n, r.f(n)]);
    const right = `Start at ${s} and add ${r.m} each time`;
    const wrong = [`Start at ${s} and add ${r.m + 1} each time`, `Start at ${r.m} and add ${s} each time`, `Start at ${s} and multiply by ${r.m} each time`, `Add ${s} each time`]
      .filter((w) => w !== right && !(r.m === s && w.startsWith(`Start at ${r.m} and add ${s}`)) && !(s === 1 && w.includes('multiply')) && !(r.m === s && w === `Add ${s} each time`));
    return mcq(rng, {
      prompt: `What is the pattern rule for the ${r.b} column?`,
      visual: { type: 'table', headers: [r.a, r.b], rows },
      correct: right, wrong,
      hint: `A pattern rule says where the ${r.b} column starts and what happens each time. Find the first number, then the jump from one row to the next. Check each choice: it needs the right start AND the right jump, and it must add, not multiply.`,
      explain: `The ${r.b} column starts at ${s} and goes ${rows.map((x) => x[1]).join(', ')}: add ${r.m} each time.`,
    });
  }],
  [3, 7, (t, rng) => {
    const r = tableRule(rng, t, t >= 6);
    const v = pick(rng, ['n', 'n', 'r', 's', 'f']);
    const rows = [1, 2, 3, 4].map((n) => [n, r.f(n)]);
    const cands = [[1, r.m], [r.m, r.k + 1], [r.k || 1, r.m], [r.m + r.k, 0], [r.m, r.k + r.m], [r.m + 1, r.k - 1 >= 0 ? r.k - 1 : r.k + 2]];
    const wrong = cands.filter(([m, k]) => !sameRule(m, k, r.m, r.k)).map(([m, k]) => exprOf(m, k, v));
    return mcq(rng, {
      prompt: `Which expression gives the number of ${r.b.toLowerCase()} for ${r.at(v)}?`,
      visual: { type: 'table', headers: [`${r.a} (${v})`, r.b], rows },
      correct: exprOf(r.m, r.k, v), wrong,
      hint: `The ${r.b} go up by the same amount each row, and that amount multiplies ${v}. Then test each choice: it must give ${r.f(1)} when ${v} = 1 and ${r.f(2)} when ${v} = 2.`,
      explain: `The ${r.b} grow by ${r.m} each time, so start with ${r.m === 1 ? v : r.m + v}. For ${v} = 1 that gives ${r.m}; the table says ${r.f(1)}, so ${r.k ? `add ${r.k}` : 'nothing more is added'}. Expression: ${exprOf(r.m, r.k, v)}.`,
    });
  }],
  [4, 7, (t, rng) => {
    const r = tableRule(rng, t, t >= 6);
    const N = t === 4 ? R(rng, 8, 12) : t === 5 ? R(rng, 12, 25) : R(rng, 20, 60);
    const rows = [1, 2, 3, 4].map((n) => [n, r.f(n)]);
    return numq({
      prompt: `If the pattern continues, ${r.ask(N)}`,
      visual: { type: 'table', headers: [r.a, r.b], rows },
      answer: r.f(N),
      hint: `First find the rule: the ${r.b} go up by the same amount each row, so multiply the ${r.a} number by that amount, then add or subtract to match row 1. Then use the rule for ${N}. Counting on row by row would take much longer.`,
      explain: `Rule: ${exprOf(r.m, r.k)}. For ${N}: ${r.m} × ${N}${r.k ? ` + ${r.k}` : ''} = ${r.f(N)}.`,
    });
  }],
  [5, 7, (t, rng) => {
    const s = R(rng, 2, 15), d = R(rng, 3, 9);
    const seq = [0, 1, 2, 3].map((i) => s + d * i);
    const inN = R(rng, 8, 30), yes = s + d * inN;
    const nos = [yes + 1, yes - 2, yes + d + (d > 3 ? 2 : 1), s + d * R(rng, 5, 20) + R(rng, 1, d - 1)].filter((x) => (x - s) % d !== 0);
    return mcq(rng, {
      prompt: `The pattern ${seq.join(', ')}, … continues. Which number will be in the pattern?`,
      correct: yes, wrong: nos, format: fmtNum,
      hint: `Every number in the pattern is ${s} plus some jumps of ${d}. For each choice, subtract ${s}. If what is left divides by ${d} with no remainder, the number is in the pattern.`,
      explain: `${yes} − ${s} = ${yes - s}, and ${yes - s} ÷ ${d} = ${inN}. So ${yes} is in the pattern. The others leave a remainder.`,
    });
  }],
  [6, 7, (t, rng) => {
    const r = tableRule(rng, t >= 6 ? 5 : 4, t >= 6);
    const N = R(rng, 10, t >= 7 ? 60 : 30), val = r.f(N);
    const rows = [1, 2, 3].map((n) => [n, r.f(n)]);
    return numq({
      prompt: r.rev(val),
      visual: { type: 'table', headers: [r.a, r.b], rows },
      answer: N,
      hint: `Work backward. The rule is ${exprOf(r.m, r.k)}: times ${r.m}${r.k ? `, then add ${r.k}` : ''}. Undo it in reverse order: ${r.k ? `take ${r.k} away from ${val}, then ` : ''}divide by ${r.m}.`,
      explain: `The rule is ${exprOf(r.m, r.k)}. ${r.k ? `${val} − ${r.k} = ${val - r.k}, and ` : ''}${val - r.k} ÷ ${r.m} = ${N}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD10  Elapsed time (12-hour and 24-hour)
// ---------------------------------------------------------------------------
const EVENTS = [['The movie', 13, 19], ['Soccer practice', 16, 18], ['The baking class', 9, 15], ['The piano lesson', 15, 18],
  ['The bus trip', 7, 11], ['The swim lesson', 9, 17], ['The hike', 8, 13], ['Potion class', 9, 14], ['The dragon nap', 12, 15],
  ['The school concert', 18, 19], ['The science fair', 9, 13], ['The owl-watching walk', 19, 20]];
const tm12 = (x) => time12(Math.floor(((x % 1440) + 1440) % 1440 / 60), ((x % 60) + 60) % 60);
const tm24 = (x) => time24(Math.floor(((x % 1440) + 1440) % 1440 / 60), ((x % 60) + 60) % 60);
const durLab = (m) => (m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60} min`);
function durFor(rng, t) {
  if (t === 1) return pick(rng, [60, 120, 30, 90, 180]);
  if (t === 2) return R(rng, 3, 11) * 5;
  if (t === 3) return R(rng, 13, 35) * 5;
  return R(rng, 13, 47) * 5;
}

const elapsed = gen([
  // end time
  [1, 6, (t, rng) => {
    const [ev, h0, h1] = pick(rng, EVENTS);
    let start = R(rng, h0, h1) * 60 + (t === 1 ? pick(rng, [0, 30]) : R(rng, 0, 11) * 5);
    let d = durFor(rng, t);
    if (t === 5) { start = R(rng, 10, 11) * 60 + R(rng, 4, 11) * 5; d = R(rng, 14, 40) * 5; }
    let d2 = 0;
    if (t === 6) d2 = R(rng, 2, 9) * 5;
    const end = start + d + d2;
    const use24 = t === 4 || (t >= 5 && chance(rng, 0.5));
    const fmt = use24 ? tm24 : tm12;
    const wrong = [end + 60, end - 60, end + 10, end - 10, end - 5].map(fmt);
    if (!use24) wrong.push(fmt(end + 720));
    else wrong.push(tm24(end - 720 >= 0 ? end - 720 : end + 720).replace(/^0/, '0'));
    if ((start % 60) + (d % 60) >= 60) wrong.unshift(fmt(end - 60));
    const q = t === 6
      ? `${ev} starts at ${fmt(start)}. It lasts ${durLab(d)}, then there is a ${d2} min snack break. What time is it after the break?`
      : `${ev} starts at ${fmt(start)} and lasts ${durLab(d)}. What time does it end?`;
    return mcq(rng, {
      prompt: q,
      visual: t <= 3 ? { type: 'clock', hour: Math.floor(start / 60), minute: start % 60, digital: t === 3 ? 'both' : false } : undefined,
      correct: fmt(end), wrong,
      hint: `What time is it ${durLab(d)}${d2 ? ` and ${d2} min` : ''} after ${fmt(start)}? Add the hours first, then the minutes. If the minutes reach 60 or more, change 60 minutes into 1 more hour.`, hintVisual: { type: 'clock', hour: Math.floor(start / 60), minute: start % 60, digital: 'both', h24: use24 },
      explain: `${fmt(start)} + ${durLab(d)}${d2 ? ` + ${d2} min` : ''} = ${fmt(end)}.`,
    });
  }],
  // duration between two times
  [1, 7, (t, rng) => {
    const [ev, h0, h1] = pick(rng, EVENTS);
    const start = R(rng, h0, h1) * 60 + (t === 1 ? pick(rng, [0, 30]) : R(rng, 0, 11) * 5);
    let d = durFor(rng, t);
    if (t >= 6) d = R(rng, 30, 70) * 5;
    const end = start + d;
    if (end > 22 * 60 + 30) return elapsed(t, rng);
    const use24 = t === 4 || (t >= 5 && chance(rng, 0.6)) || end >= 1440;
    const fmt = use24 ? tm24 : tm12;
    const naive = (Math.floor(end / 60) - Math.floor(start / 60)) * 100 + (end % 60 - start % 60);
    const naiveLab = naive % 100 >= 0 && naive % 100 < 100 && (end % 60) < (start % 60) ? `${Math.floor(naive / 100)} h ${naive % 100} min` : null;
    const wrong = [d + 60, d - 60, d + 10, d - 10, d + 5].filter((x) => x > 0).map(durLab);
    if (naiveLab) wrong.unshift(naiveLab);
    return mcq(rng, {
      prompt: `${ev} starts at ${fmt(start)} and ends at ${fmt(end)}. How long does it last?`,
      visual: t <= 2 ? { type: 'clock', hour: Math.floor(start / 60), minute: start % 60 } : undefined,
      correct: durLab(d), wrong,
      hint: `Count on from ${fmt(start)} to ${fmt(end)}. First count the minutes up to the next full hour, then the whole hours, then the minutes that are left. Add the parts together.`, hintVisual: { type: 'clock', hour: Math.floor(start / 60), minute: start % 60, digital: 'both', h24: use24 },
      explain: `From ${fmt(start)} to ${fmt(end)} is ${durLab(d)}.`,
    });
  }],
  // minutes on keypad
  [2, 5, (t, rng) => {
    const start = R(rng, 7, 20) * 60 + R(rng, 1, 11) * 5;
    const d = t <= 3 ? R(rng, 3, 11) * 5 : R(rng, 13, 30) * 5;
    const use24 = t >= 4 && chance(rng, 0.5);
    const fmt = use24 ? tm24 : tm12;
    return numq({
      prompt: `How many minutes is it from ${fmt(start)} to ${fmt(start + d)}?`, answer: d,
      hint: `Count on from ${fmt(start)}. How many minutes to reach the next full hour? Then how many more minutes to reach ${fmt(start + d)}? Add the two parts.`,
      explain: `From ${fmt(start)} to ${fmt(start + d)} is ${d} minutes${d >= 60 ? ` (${durLab(d)})` : ''}.`,
    });
  }],
  // 12 <-> 24 hour
  [3, 5, (t, rng) => {
    const h = R(rng, 0, 23), m = R(rng, 0, 11) * 5, x = h * 60 + m;
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: `What is ${tm12(x)} in 24-hour time?`,
        visual: { type: 'clock', hour: h, minute: m, digital: false },
        correct: tm24(x), wrong: [tm24(x + 720), tm24(x - 120), tm24(x + 60), tm24(x - 60)],
        hint: `Is ${tm12(x)} in the morning (a.m.) or afternoon/evening (p.m.)? For p.m. times after 12 noon, add 12 to the hour. For a.m. times keep the hour (write it with 2 digits), except that the 12 a.m. hour becomes 00.`,
        explain: `${tm12(x)} is ${tm24(x)} in 24-hour time.`,
      });
    }
    return mcq(rng, {
      prompt: `What is ${tm24(x)} in 12-hour time?`,
      visual: { type: 'clock', hour: h, minute: m, digital: true, h24: true },
      correct: tm12(x), wrong: [tm12(x + 720), tm12(x - 120), tm12(x + 60), tm12(x + 120)],
      hint: `Look at the hour in ${tm24(x)}. If it is 13 or more, take away 12 and use p.m. If it is 12, it is 12 p.m. (noon). If it is 00, it is 12 a.m. (midnight). Otherwise keep the hour and use a.m.`,
      explain: `${tm24(x)} is ${tm12(x)}.`,
    });
  }],
  // start time
  [4, 7, (t, rng) => {
    const [ev, h0, h1] = pick(rng, EVENTS);
    const start = R(rng, h0, h1) * 60 + R(rng, 0, 11) * 5, d = durFor(rng, 4);
    const end = start + d;
    const use24 = chance(rng, 0.5);
    const fmt = use24 ? tm24 : tm12;
    return mcq(rng, {
      prompt: `${ev} lasted ${durLab(d)} and ended at ${fmt(end)}. What time did it start?`,
      correct: fmt(start), wrong: [fmt(end + d), fmt(start + 60), fmt(start - 60), fmt(start + 10), fmt(start - 10)],
      hint: `Count back ${durLab(d)} from ${fmt(end)}. Take away the hours first, then the minutes. If there are not enough minutes, change 1 hour into 60 minutes.`,
      explain: `${fmt(end)} − ${durLab(d)} = ${fmt(start)}.`,
    });
  }],
  // multi-step
  [6, 7, (t, rng) => {
    const n = nm(rng);
    const start = R(rng, 15, 19) * 60 + R(rng, 0, 11) * 5;
    const a = R(rng, 4, 11) * 5, b = R(rng, 1, 4) * 5, c = R(rng, 4, 12) * 5;
    const end = start + a + b + c;
    const fmt = chance(rng, 0.5) ? tm12 : tm24;
    return mcq(rng, {
      prompt: `${n} started homework at ${fmt(start)}. ${n} worked for ${a} min, took a ${b} min break, then read for ${c} min. What time did ${n} finish?`,
      correct: fmt(end), wrong: [fmt(end - b), fmt(end + 10), fmt(end - 60), fmt(end + 60), fmt(end - 10)],
      hint: `First add ${a} + ${b} + ${c} to get the total minutes, and change them to hours and minutes if there are 60 or more. Then count on that much from ${fmt(start)}.`,
      explain: `${a} + ${b} + ${c} = ${a + b + c} min = ${durLab(a + b + c)}. ${fmt(start)} + ${durLab(a + b + c)} = ${fmt(end)}.`,
    });
  }],
  // overnight
  [7, 7, (t, rng) => {
    const start = R(rng, 20, 23) * 60 + R(rng, 0, 11) * 5;
    const minD = Math.max(40, Math.ceil((1440 - start) / 5) + 3); // always arrive after midnight
    const d = R(rng, minD, 120) * 5, end = start + d;
    const thing = pick(rng, ['A night train', 'A red-eye flight', 'A ferry', 'An overnight bus']);
    return mcq(rng, {
      prompt: `${thing} leaves at ${tm24(start)} and arrives at ${tm24(end)} the next day. How long is the trip?`,
      correct: durLab(d), wrong: [durLab(d + 60), durLab(d - 60), durLab(Math.abs(1440 - d)), durLab(d + 30)],
      hint: `Split the trip at midnight (24:00). How long is it from ${tm24(start)} to 24:00? How long from 00:00 to ${tm24(end)}? Add the two parts.`,
      explain: `From ${tm24(start)} to 24:00 is ${durLab(1440 - start)}. Then to ${tm24(end)} is ${durLab(end - 1440)} more. Total: ${durLab(d)}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD11  Measurement: perimeter and area design, mm and km, units, volume, capacity
// ---------------------------------------------------------------------------
const LEN_UNITS = [
  ['the thickness of a coin', 'mm'], ['the length of an ant', 'mm'], ['the width of a pencil tip', 'mm'], ['the thickness of a book cover', 'mm'],
  ['the length of a pencil', 'cm'], ['the width of a notebook', 'cm'], ['the length of a shoe', 'cm'], ['the height of a juice box', 'cm'],
  ['the height of a door', 'm'], ['the length of a classroom', 'm'], ['the height of a tree', 'm'], ['the length of a school bus', 'm'],
  ['the distance from Moncton to Saint John', 'km'], ['the length of a bike trail', 'km'], ['the distance a plane flies', 'km'], ['the distance across New Brunswick', 'km'],
];
const VOL_UNITS = [
  ['the volume of a sugar cube', 'cm³'], ['the volume of a juice box', 'cm³'], ['the volume of a pencil case', 'cm³'], ['the volume of a dice', 'cm³'],
  ['the volume of a classroom', 'm³'], ['the volume of a shipping container', 'm³'], ['the volume of a swimming pool', 'm³'], ['the volume of a garden shed', 'm³'],
];
const CAP_UNITS = [['a spoonful of medicine', 'mL'], ['a small cup of juice', 'mL'], ['a bathtub', 'L'], ['a fish tank', 'L'], ['a bucket', 'L'], ['an eyedropper', 'mL']];
const CONV = [
  // [from, to, factor, tierMin, tierMax, makeValue]
  ['m', 'cm', 100, 1, 3, (rng) => R(rng, 2, 25)], ['cm', 'mm', 10, 1, 3, (rng) => R(rng, 2, 60)], ['km', 'm', 1000, 2, 4, (rng) => R(rng, 2, 40)],
  ['dm', 'cm', 10, 2, 3, (rng) => R(rng, 2, 30)], ['m', 'dm', 10, 2, 3, (rng) => R(rng, 2, 30)], ['mm', 'cm', 0.1, 3, 5, (rng) => R(rng, 11, 99)],
  ['cm', 'm', 0.01, 3, 5, (rng) => R(rng, 105, 950)], ['km', 'm', 1000, 4, 6, (rng) => clean(R(rng, 11, 99) / 10)], ['m', 'km', 0.001, 5, 7, (rng) => { const v = R(rng, 1, 99) * 10 * (chance(rng, 0.5) ? 1 : 10); return v % 1000 ? v : v + 250; }],
  ['mm', 'm', 0.001, 5, 7, (rng) => R(rng, 11, 99) * 10], ['m', 'mm', 1000, 6, 7, (rng) => clean(R(rng, 11, 99) / 10)], ['km', 'cm', 100000, 7, 7, (rng) => R(rng, 2, 9)],
  ['L', 'mL', 1000, 3, 6, (rng) => (chance(rng, 0.5) ? R(rng, 2, 9) : clean(R(rng, 11, 49) / 10))], ['mL', 'L', 0.001, 5, 7, (rng) => { const v = R(rng, 11, 99) * 50; return v % 1000 ? v : v + 250; }],
];

const UNAME = { mm: 'millimetre', cm: 'centimetre', dm: 'decimetre', m: 'metre', km: 'kilometre', L: 'litre', mL: 'millilitre' };
function rectVisual(w, h, cols = 12, rows = 8) {
  return { type: 'grid', cols: Math.max(cols, w + 2), rows: Math.max(rows, h + 2), rect: { x: 1, y: 1, w, h }, showUnits: true };
}

const measure = gen([
  [1, 3, (t, rng) => {
    const w = R(rng, 2, t === 1 ? 6 : 10), h = R(rng, 2, t === 1 ? 5 : 6);
    const area = chance(rng, 0.5);
    if (t === 3 && chance(rng, 0.4)) {
      // L-shape made of two rectangles
      const w2 = R(rng, 1, w - 1), h2 = R(rng, 1, 3);
      const cells = [];
      for (let x = 1; x <= w; x++) for (let y = 1; y <= h; y++) cells.push([x, y]);
      for (let x = 1; x <= w2; x++) for (let y = h + 1; y <= h + h2; y++) cells.push([x, y]);
      return numq({
        prompt: 'What is the area of the shaded shape, in square units?',
        visual: { type: 'grid', cols: 12, rows: h + h2 + 2, cells, showUnits: true },
        answer: w * h + w2 * h2,
        hint: 'Split the shape into two rectangles: the big one on top and the smaller one under it. Find the area of each (squares across × squares down), then add the two areas.',
        explain: `${w} × ${h} = ${w * h} and ${w2} × ${h2} = ${w2 * h2}. ${w * h} + ${w2 * h2} = ${w * h + w2 * h2} square units.`,
      });
    }
    return numq({
      prompt: area ? 'What is the area of the shaded rectangle, in square units?' : 'What is the perimeter of the shaded rectangle, in units?',
      visual: rectVisual(w, h),
      answer: area ? w * h : 2 * (w + h),
      hint: area ? `Area counts the squares inside. The rectangle is ${w} squares across and ${h} squares down, so you can multiply instead of counting one by one.` : `Perimeter is the distance all the way around the outside. The rectangle is ${w} units across and ${h} units down. Add all four sides: two long sides and two short sides.`,
      explain: area ? `${w} × ${h} = ${w * h} square units.` : `${w} + ${h} + ${w} + ${h} = ${2 * (w + h)} units.`,
    });
  }],
  // design rectangle for given area and perimeter
  [3, 6, (t, rng) => {
    const l = R(rng, 2, 8), w = R(rng, 1, 6);
    const A = l * w, P = 2 * (l + w);
    const cands = [];
    for (let a = 1; a <= 9; a++) for (let b = 1; b <= 6; b++) {
      if (a * b === A && 2 * (a + b) === P) continue;
      if (a * b === A || 2 * (a + b) === P || (Math.abs(a - l) + Math.abs(b - w) === 1)) cands.push([a, b]);
    }
    if (cands.length < 3) return measure(t, rng);
    const picks = sample(rng, cands, 3);
    const items = [{ visual: rectVisual(l, w, 11, 8), correct: true }, ...picks.map(([a, b]) => ({ visual: rectVisual(a, b, 11, 8), correct: false }))];
    return {
      kind: 'mc',
      prompt: `Which rectangle has an area of ${A} square units and a perimeter of ${P} units?`,
      ...mcVisual(rng, items),
      hint: `The rectangle needs BOTH: an area of ${A} (squares inside) and a perimeter of ${P} (units around the edge). For each picture, count how many squares across and down. Multiply for the area, and add all four sides for the perimeter.`,
      explain: `A ${l} by ${w} rectangle has area ${l} × ${w} = ${A} and perimeter ${l} + ${w} + ${l} + ${w} = ${P}.`,
    };
  }],
  [4, 6, (t, rng) => {
    const unit = pick(rng, ['cm', 'm']);
    const l = R(rng, 3, 15), w = R(rng, 2, 12);
    if (chance(rng, 0.5)) {
      return numq({
        prompt: `A rectangle has a perimeter of ${2 * (l + w)} ${unit}. Its length is ${l} ${unit}. What is its width?`, answer: w,
        hint: `Perimeter = length + width + length + width. So half of ${2 * (l + w)} is one length plus one width. Take away the length, ${l}, from that half.`,
        explain: `Half of ${2 * (l + w)} is ${l + w}. ${l + w} − ${l} = ${w} ${unit}.`,
      });
    }
    return numq({
      prompt: `A rectangle has an area of ${l * w} ${unit}². Its width is ${w} ${unit}. What is its length?`, answer: l,
      hint: `Area = length × width. Which number times ${w} makes ${l * w}?`,
      explain: `${l * w} ÷ ${w} = ${l} ${unit}.`,
    });
  }],
  [5, 7, (t, rng) => {
    if (chance(rng, 0.5)) {
      // fixed perimeter (fencing): which pen has the greatest or least area?
      const P = pick(rng, [12, 16, 20, 24, 28, 32, 36]), half = P / 2, n = nm(rng), u = 'm';
      const dims = [];
      for (let a = 1; a <= half / 2; a++) dims.push([a, half - a]);
      const most = chance(rng, 0.6);
      const best = most ? dims[dims.length - 1] : dims[0];
      const shown = [best, ...sample(rng, dims.filter((d) => d !== best), 3)];
      const lab = ([a, b]) => `${a} m by ${b} m`;
      return mcq(rng, {
        prompt: `${n} has ${P} ${u} of fence for a rectangular pen. Which pen uses all the fence and has the ${most ? 'greatest' : 'least'} area?`,
        correct: lab(best), wrong: shown.slice(1).map(lab),
        hint: `Every choice uses ${P} m of fence, because length + width = ${half} m each time. Find the area of each pen (length × width) and compare. For example, a 2 m by ${half - 2} m pen has an area of ${2 * (half - 2)} m².`,
        explain: `The areas are ${shown.slice().sort((x, y) => x[0] - y[0]).map((d) => `${lab(d)}: ${d[0] * d[1]} m²`).join('; ')}. The ${most ? 'most square-like' : 'long, skinny'} pen, ${lab(best)}, has the ${most ? 'greatest' : 'least'} area.`,
      });
    }
    const A = pick(rng, [12, 16, 18, 20, 24, 30, 36]);
    const pairs = [];
    for (let a = 1; a * a <= A; a++) if (A % a === 0) pairs.push([a, A / a]);
    if (pairs.length < 3) return measure(t, rng);
    const most = chance(rng, 0.5);
    const best = most ? pairs[0] : pairs[pairs.length - 1];
    const lab = ([a, b]) => `${a} by ${b}`;
    return mcq(rng, {
      prompt: `All these rectangles have an area of ${A} square units. Which has the ${most ? 'greatest' : 'least'} perimeter?`,
      correct: lab(best), wrong: pairs.filter((p) => p !== best).map(lab),
      hint: `Find the perimeter of each rectangle by adding all four sides (for example, a 3 by 8 rectangle has 3 + 8 + 3 + 8). Then compare and pick the ${most ? 'greatest' : 'least'} one.`,
      explain: `The perimeters are ${pairs.map(([a, b]) => `${a} by ${b}: ${2 * (a + b)}`).join('; ')}. The ${most ? 'long, skinny' : 'most square-like'} one, ${lab(best)}, has the ${most ? 'greatest' : 'least'} perimeter.`,
    });
  }],
  // conversions
  [1, 7, (t, rng) => {
    const opts = CONV.filter((c) => t >= c[3] && t <= c[4]);
    const [from, to, f, , , mk] = pick(rng, opts);
    if (t === 1 && chance(rng, 0.5)) {
      const obj = pick(rng, ['pencil', 'crayon', 'key', 'leaf', 'worm', 'paperclip']), L = R(rng, 3, 14);
      return numq({
        prompt: `How long is the ${obj} in millimetres?`,
        visual: { type: 'ruler', length: 15, object: obj, objectLength: L, unit: 'cm' },
        answer: L * 10,
        hint: `First read how many centimetres long the ${obj} is on the ruler. Each centimetre has 10 millimetres, so change the centimetres into millimetres.`,
        explain: `The ${obj} is ${L} cm long. ${L} × 10 = ${L * 10} mm.`,
      });
    }
    const v = mk(rng), ans = clean(v * f);
    const big = f > 1;
    return decq(rng, {
      prompt: `${dn(v)} ${from} = □ ${to}`, answer: ans,
      hint: big ? `A ${UNAME[to]} is smaller than a ${UNAME[from]}, so you need MORE of them. 1 ${from} = ${fmtNum(f)} ${to}, so multiply ${dn(v)} by ${fmtNum(f)}.` : `A ${UNAME[to]} is bigger than a ${UNAME[from]}, so you need FEWER of them. 1 ${to} = ${fmtNum(Math.round(1 / f))} ${from}, so divide ${dn(v)} by ${fmtNum(Math.round(1 / f))}.`,
      explain: `1 ${big ? from : to} = ${fmtNum(big ? f : Math.round(1 / f))} ${big ? to : from}. ${dn(v)} ${big ? '×' : '÷'} ${fmtNum(big ? f : Math.round(1 / f))} = ${dn(ans)} ${to}.`,
    }, decPlaces(ans), [clean(v * f * 10), clean(v * f / 10)], 3);
  }],
  // choose a unit
  [1, 4, (t, rng) => {
    const k = t <= 1 ? 0 : R(rng, 0, 2);
    if (k === 0) {
      const [thing, u] = pick(rng, LEN_UNITS);
      return fixedq({
        prompt: `Which unit would you use to measure ${thing}?`, choices: ['mm', 'cm', 'm', 'km'], correct: u,
        hint: `How big is ${thing}? A millimetre (mm) is tiny, about the width of a grain of rice. A centimetre (cm) is about the width of your finger. A metre (m) is about one big step. A kilometre (km) is a long way, about a 15-minute walk.`,
        explain: `${cap(thing)} is best measured in ${u}.`,
      });
    }
    if (k === 1) {
      const [thing, u] = pick(rng, VOL_UNITS);
      return fixedq({
        prompt: `Which unit would you use for ${thing}?`, choices: ['cm', 'cm³', 'm', 'm³'], correct: u,
        hint: `Volume needs cubic units (cm³ or m³); cm and m only measure length. A cm³ is a tiny cube about the size of your fingertip, and a m³ is a cube big enough to sit inside. Is ${thing.replace('the volume of ', '')} small enough to hold, or very big?`,
        explain: `Volume is measured in cubic units. ${cap(thing)} is best measured in ${u}.`,
      });
    }
    const [thing, u] = pick(rng, CAP_UNITS);
    return fixedq({
      prompt: `Which unit would you use for how much ${thing} holds?`, choices: ['mL', 'L', 'cm', 'kg'], correct: u,
      hint: `Capacity is measured in mL or L (cm measures length and kg measures mass). 1 mL is just a few drops, and 1 L is about a big water bottle. Does ${thing} hold a little or a lot?`,
      explain: `${cap(thing)} holds an amount best measured in ${u}.`,
    });
  }],
  // volume of prisms
  [1, 5, (t, rng) => {
    const mx = [3, 4, 5, 6, 9, 9, 9][t - 1];
    const l = R(rng, 2, mx), w = R(rng, 1, Math.min(mx, 5)), h = R(rng, 1, Math.min(mx, 5));
    const unit = t >= 4 ? pick(rng, ['cm³', 'm³']) : 'cm³';
    const V = l * w * h;
    if (t >= 4 && chance(rng, 0.5)) {
      const thing = unit === 'm³' ? pick(rng, ['garden shed', 'sandbox', 'storage room']) : pick(rng, ['gift box', 'pencil box', 'jewellery box']);
      const s = unit === 'm³' ? 'm' : 'cm';
      return numq({
        prompt: `A ${thing} is ${l} ${s} long, ${w} ${s} wide and ${h} ${s} high. What is its volume in ${unit}?`, answer: V,
        hint: `Volume = length × width × height. Multiply ${l} × ${w} first to get the bottom layer, then multiply by ${h}.`,
        explain: `${l} × ${w} × ${h} = ${V} ${unit}.`,
      });
    }
    return numq({
      prompt: `Each cube is 1 ${unit}. What is the volume of the prism in ${unit}?`,
      visual: { type: 'prism', l, w, h, showCubes: true },
      answer: V,
      hint: `Count the cubes in the bottom layer: ${l} along the front and ${w} going back. Then think: how many layers are stacked up (${h})? Multiply.`,
      explain: `One layer has ${l} × ${w} = ${l * w} cubes. There ${h === 1 ? 'is 1 layer' : `are ${h} layers`}: ${l * w} × ${h} = ${V} ${unit}.`,
    });
  }],
  // estimate volume
  [4, 6, (t, rng) => {
    const L = pick(rng, [10, 20, 30]), W = pick(rng, [5, 10, 20]), H = pick(rng, [5, 10, 20]);
    const jig = (x) => x + pick(rng, [-2, -1, 1, 2]);
    const l = jig(L), w = jig(W), h = jig(H);
    const est = L * W * H;
    const thing = pick(rng, ['cereal box', 'shoebox', 'tissue box', 'toy chest', 'lunch box']);
    return mcq(rng, {
      prompt: `A ${thing} is about ${l} cm by ${w} cm by ${h} cm. Which is the best estimate of its volume?`,
      correct: est, wrong: [est * 10, est / 10, l + w + h, est * 2].filter((x) => x > 0 && Number.isInteger(x)), format: (x) => `${fmtNum(x)} cm³`,
      hint: `You only need a close answer. Round ${l}, ${w} and ${h} to friendly numbers (like 5, 10, 20 or 30), then multiply the rounded numbers.`,
      explain: `${l} ≈ ${L}, ${w} ≈ ${W}, ${h} ≈ ${H}. ${L} × ${W} × ${H} = ${fmtNum(est)} cm³.`,
    });
  }],
  // volume vs capacity
  [3, 5, (t, rng) => {
    const k = R(rng, 0, 2);
    if (k === 0) {
      const cap1 = pick(rng, ['How much water can the jug hold?', 'How much juice fits in the bottle?', 'How much soup does the pot hold?', 'How much potion fits in the flask?']);
      const vols = ['How much space does the brick take up?', 'How many cubes fill the box?', 'How much space does the rock take up?', 'How long is the table?'];
      return mcq(rng, {
        prompt: 'Which question is about capacity?', correct: cap1, wrong: sample(rng, vols, 3),
        hint: 'Capacity is how much a container can hold, like water in a jug. Volume is how much space an object takes up. Length is how long something is. For each question, ask: is it about filling up a container?',
        explain: `"${cap1}" asks how much a container holds, so it is about capacity.`,
      });
    }
    if (k === 1) {
      return fixedq({
        prompt: pick(rng, ['The amount of space an object takes up is its…', 'The number of cubes that fill a box tells its…']),
        choices: ['volume', 'capacity', 'perimeter', 'area'], correct: 'volume',
        hint: 'Volume is the space an object takes up, measured in cubes. Capacity is how much a container holds. Perimeter is the distance around a shape. Area is the flat space inside a shape. Which one fits the sentence?',
        explain: 'Volume is the amount of space an object takes up. It is measured in cubic units like cm³ and m³.',
      });
    }
    return fixedq({
      prompt: pick(rng, ['The amount a container can hold is its…', 'How much milk a carton holds is its…']),
      choices: ['volume', 'capacity', 'perimeter', 'mass'], correct: 'capacity',
      hint: 'Volume is the space an object takes up. Capacity is how much a container can hold when you fill it. Perimeter is the distance around a shape. Mass is how heavy something is. Which one fits the sentence?',
      explain: 'Capacity is how much a container can hold. It is measured in mL and L.',
    });
  }],
  // compare lengths in different units
  [4, 7, (t, rng) => {
    if (t >= 6 && chance(rng, 0.6)) {
      // order three lengths written in different units
      const base = R(rng, 120, 480);
      const cm = [...new Set([base, base + R(rng, 3, 40), base - R(rng, 3, 40)])];
      if (cm.length < 3) return measure(t, rng);
      const units = shuffle(rng, ['m', 'cm', 'mm']);
      const items = cm.map((v, i) => ({ v, lab: units[i] === 'm' ? `${dn(v / 100)} m` : units[i] === 'cm' ? `${v} cm` : `${fmtNum(v * 10)} mm` }));
      const sorted = items.slice().sort((a, b) => a.v - b.v);
      const f = (arr) => arr.map((x) => x.lab).join(', ');
      const byNum = items.slice().sort((a, b) => parseFloat(a.lab.replace(/\s/g, '')) - parseFloat(b.lab.replace(/\s/g, '')));
      return mcq(rng, {
        prompt: 'Which list goes from shortest to longest?',
        correct: f(sorted), wrong: [f(sorted.slice().reverse()), f([sorted[1], sorted[0], sorted[2]]), f(byNum), f([sorted[0], sorted[2], sorted[1]])].filter((x) => x !== f(sorted)),
        hint: 'The lengths use different units, so change them all to centimetres first: 1 m = 100 cm and 10 mm = 1 cm. Then put the centimetre amounts in order.',
        explain: `In centimetres: ${items.map((x) => `${x.lab} = ${x.v} cm`).join(', ')}. Shortest to longest: ${f(sorted)}.`,
      });
    }
    const sets = [
      () => { const a = clean(R(rng, 5, 30) / 10), b = R(rng, 4, 30) * 100; return [`${dn(a)} km`, clean(a * 1000), `${fmtNum(b)} m`, b, 'm']; },
      () => { const a = R(rng, 20, 95), b = R(rng, 150, 990); return [`${a} cm`, a * 10, `${b} mm`, b, 'mm']; },
      () => { const a = clean(R(rng, 11, 45) / 10), b = R(rng, 110, 450); return [`${dn(a)} m`, clean(a * 100), `${b} cm`, b, 'cm']; },
      () => { const a = R(rng, 2, 9), b = a * 1000 + pick(rng, [0, -100, 100, 50]); return [`${a} km`, a * 1000, `${fmtNum(b)} m`, b, 'm']; },
      () => { const a = clean(R(rng, 11, 45) / 10), b = R(rng, 1100, 4500); return [`${dn(a)} L`, clean(a * 1000), `${fmtNum(b)} mL`, b, 'mL']; },
    ];
    const [la, va, lb, vb, u] = pick(rng, sets)();
    const [x, vx, y, vy] = chance(rng, 0.5) ? [la, va, lb, vb] : [lb, vb, la, va];
    const correct = Math.abs(vx - vy) < 1e-9 ? 'They are equal' : vx > vy ? x : y;
    const cap1 = u === 'mL';
    return fixedq({
      prompt: cap1 ? `Which is more: ${x} or ${y}?` : `Which is longer: ${x} or ${y}?`, choices: [x, y, 'They are equal'], correct,
      hint: 'Change both amounts to the same unit before you compare. Remember: 1 km = 1000 m, 1 m = 100 cm, 1 cm = 10 mm and 1 L = 1000 mL. Choose "They are equal" only if they match exactly.',
      explain: `${x} = ${fmtNum(vx)} ${u} and ${y} = ${fmtNum(vy)} ${u}. ${Math.abs(vx - vy) < 1e-9 ? 'They are equal.' : `So ${correct} is ${cap1 ? 'more' : 'longer'}.`}`,
    });
  }],
  // multi-step measurement
  [6, 7, (t, rng) => {
    const k = R(rng, 0, 2), u = pick(rng, ['cm', 'm']);
    if (k === 0) {
      const l = R(rng, 4, 15), w = R(rng, 2, l - 1);
      return numq({
        prompt: `A rectangle has a perimeter of ${2 * (l + w)} ${u}. Its length is ${l} ${u}. What is its area in ${u}²?`, answer: l * w,
        hint: 'There are two steps. Half of the perimeter is one length plus one width, so find the width first. Then multiply length × width for the area.',
        explain: `Half of ${2 * (l + w)} is ${l + w}, so the width is ${l + w} − ${l} = ${w} ${u}. Area: ${l} × ${w} = ${l * w} ${u}².`,
      });
    }
    if (k === 1) {
      const l = R(rng, 3, 12), w = R(rng, 2, 8), h = R(rng, 2, 10);
      return numq({
        prompt: `A box is ${l} cm long and ${w} cm wide. Its volume is ${l * w * h} cm³. How tall is it, in cm?`, answer: h,
        hint: `Volume = length × width × height. First find how many cubes fit in the bottom layer: ${l} × ${w}. Then ask how many layers make ${l * w * h}.`,
        explain: `${l} × ${w} = ${l * w} cubes in each layer. ${l * w * h} ÷ ${l * w} = ${h} cm.`,
      });
    }
    const s = R(rng, 4, 15), l = R(rng, s + 1, 2 * s - 1), w = 2 * s - l;
    return numq({
      prompt: `A square and a rectangle have the same perimeter. Each side of the square is ${s} ${u}. The rectangle is ${l} ${u} long. How wide is the rectangle?`, answer: w,
      hint: `First find the square's perimeter: four sides of ${s} ${u}. The rectangle has the same perimeter, so half of it is ${l} ${u} plus the width.`,
      explain: `The square's perimeter is 4 × ${s} = ${4 * s} ${u}. Half of that is ${2 * s}. ${2 * s} − ${l} = ${w} ${u}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD12a  Triangles: equilateral, isosceles, scalene
// ---------------------------------------------------------------------------
const COLOURS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'teal'];
const TRI_SHAPE = { Equilateral: 'equilateral_triangle', Isosceles: 'isosceles_triangle', Scalene: 'scalene_triangle' };
const TRI_TYPES = ['Equilateral', 'Isosceles', 'Scalene'];
function triSides(rng, type, max = 15) {
  if (type === 'Equilateral') { const s = R(rng, 3, max); return [s, s, s]; }
  if (type === 'Isosceles') {
    const s = R(rng, 4, max); let b = R(rng, 2, 2 * s - 1);
    if (b === s) b = s + 1 < 2 * s ? s + 1 : s - 1;
    return shuffle(rng, [s, s, b]);
  }
  const a = R(rng, 3, Math.max(4, max - 6)), b = a + R(rng, 1, 5), c = R(rng, b + 1, a + b - 1);
  return shuffle(rng, [a, b, c]);
}
const triVis = (rng, type) => ({ type: 'shapes', items: [{ shape: TRI_SHAPE[type], color: pick(rng, COLOURS), rotate: pick(rng, [0, 0, 30, 90, 180, 210, 270, 330]), size: 'l' }] });
const TRI_OPTS = 'Equilateral = all three sides the same length; isosceles = exactly two sides the same; scalene = no sides the same.';
const TRI_WHY = {
  Equilateral: 'all three sides are equal', Isosceles: 'exactly two sides are equal', Scalene: 'no sides are equal',
};

const triangles = gen([
  [1, 5, (t, rng) => {
    const type = pick(rng, TRI_TYPES), unit = pick(rng, ['cm', 'm', 'mm']);
    const sides = triSides(rng, type, t <= 2 ? 12 : 40);
    return fixedq({
      prompt: `A triangle has sides of ${sides[0]} ${unit}, ${sides[1]} ${unit} and ${sides[2]} ${unit}. What kind of triangle is it?`,
      visual: t <= 3 ? triVis(rng, type) : undefined,
      choices: TRI_TYPES, correct: type,
      hint: `Look at the three lengths: ${sides.join(', ')} ${unit}. How many of them match? ${TRI_OPTS}`,
      explain: `It is ${type.toLowerCase()} because ${TRI_WHY[type]}.`,
    });
  }],
  [2, 4, (t, rng) => {
    const type = pick(rng, TRI_TYPES);
    const items = TRI_TYPES.map((ty) => ({ visual: triVis(rng, ty), correct: ty === type }));
    return {
      kind: 'mc', prompt: `Which triangle is ${type.toLowerCase()}?`, ...mcVisual(rng, items),
      hint: `${TRI_OPTS} Look at each triangle: which sides look the same length? Find the one that fits ${type.toLowerCase()}.`,
      explain: `A ${type.toLowerCase()} triangle is one where ${TRI_WHY[type]}.`,
    };
  }],
  [2, 5, (t, rng) => {
    const type = pick(rng, TRI_TYPES), unit = pick(rng, ['cm', 'm']);
    const others = type === 'Isosceles' ? ['Scalene', 'Scalene', 'Scalene'] : type === 'Equilateral' ? ['Isosceles', 'Scalene', 'Isosceles'] : ['Isosceles', 'Equilateral', 'Isosceles'];
    const lab = (s) => s.map((x) => `${x} ${unit}`).join(', ');
    const right = lab(triSides(rng, type, 20));
    const wrong = others.map((o) => lab(triSides(rng, o, 20)));
    return mcq(rng, {
      prompt: `Which side lengths make ${an(type.toLowerCase())} triangle?`,
      correct: right, wrong,
      hint: `${TRI_OPTS} For each choice, count how many of the three lengths are the same.`,
      explain: `${right}: ${TRI_WHY[type]}, so it is ${type.toLowerCase()}.`,
    });
  }],
  [3, 7, (t, rng) => {
    const unit = pick(rng, ['cm', 'm']);
    const k = R(rng, 0, 3);
    if (k === 0) {
      const s = R(rng, 3, 25);
      return numq({
        prompt: `An equilateral triangle has a perimeter of ${3 * s} ${unit}. How long is each side?`, answer: s,
        hint: `All three sides of an equilateral triangle are the same length, and together they make ${3 * s} ${unit}. Share ${3 * s} equally into three parts.`,
        explain: `${3 * s} ÷ 3 = ${s} ${unit}.`,
      });
    }
    if (k === 1) {
      const s = R(rng, 3, 25), b = pick(rng, [R(rng, 2, s - 1), R(rng, s + 1, 2 * s - 1)].filter((x) => x >= 2 && x !== s)) || s + 1;
      return numq({
        prompt: `An isosceles triangle has two sides of ${s} ${unit}. Its perimeter is ${2 * s + b} ${unit}. How long is the third side?`, answer: b,
        hint: `The two equal sides are ${s} ${unit} each. Add them, then take that away from the perimeter, ${2 * s + b} ${unit}.`,
        explain: `${s} + ${s} = ${2 * s}. ${2 * s + b} − ${2 * s} = ${b} ${unit}.`,
      });
    }
    if (k === 2) {
      const s = R(rng, 5, 25), b = R(rng, 2, 2 * s - 1);
      if (b === s) return triangles(t, rng);
      return numq({
        prompt: `An isosceles triangle has a base of ${b} ${unit}. The other two sides are equal. The perimeter is ${2 * s + b} ${unit}. How long is each equal side?`, answer: s,
        hint: `First take the base (${b} ${unit}) away from the perimeter (${2 * s + b} ${unit}). What is left is the two equal sides together, so split it into 2 equal parts.`,
        explain: `${2 * s + b} − ${b} = ${2 * s}. ${2 * s} ÷ 2 = ${s} ${unit}.`,
      });
    }
    const [a, b, c] = triSides(rng, 'Scalene', 25);
    return numq({
      prompt: `A scalene triangle has sides of ${a} ${unit} and ${b} ${unit}. Its perimeter is ${a + b + c} ${unit}. How long is the third side?`, answer: c,
      hint: `Add the two sides you know, ${a} + ${b}. Then take that away from the perimeter, ${a + b + c} ${unit}.`,
      explain: `${a} + ${b} = ${a + b}. ${a + b + c} − ${a + b} = ${c} ${unit}.`,
    });
  }],
  [3, 7, (t, rng) => {
    const a = R(rng, 3, 12), b = a + R(rng, 1, 4), c = a + b - 1;
    const Ts = ['An equilateral triangle has 3 equal sides.', 'A scalene triangle has no equal sides.', 'An isosceles triangle has at least 2 equal sides.',
      `A triangle with sides ${a}, ${a} and ${a} is equilateral.`, `A triangle with sides ${a}, ${b} and ${a} is isosceles.`, `A triangle with sides ${a}, ${b} and ${c} is scalene.`];
    const Fs = ['A scalene triangle has 2 equal sides.', 'An equilateral triangle has exactly 2 equal sides.', 'An isosceles triangle has no equal sides.',
      `A triangle with sides ${a}, ${b} and ${a} is scalene.`, `A triangle with sides ${a}, ${b} and ${c} is isosceles.`, `A triangle with sides ${b}, ${b} and ${b} is scalene.`];
    const findTrue = chance(rng, 0.6);
    const correct = pick(rng, findTrue ? Ts : Fs);
    return mcq(rng, {
      prompt: findTrue ? 'Which statement is true?' : 'Which statement is NOT true?',
      correct, wrong: sample(rng, findTrue ? Fs : Ts, 3),
      hint: `${TRI_OPTS} Test each statement. If it gives side lengths, count the equal sides. If it describes a type, compare it with the meanings above.`,
      explain: `"${correct}" is ${findTrue ? 'true' : 'not true'}.`,
    });
  }],
  [6, 7, (t, rng) => {
    const type = pick(rng, TRI_TYPES), unit = pick(rng, ['cm', 'm']);
    const s = triSides(rng, type, 30);
    const P = sum(s);
    if (t === 7 && chance(rng, 0.5)) {
      const tt = pick(rng, [['equilateral', 'All three angles are equal'], ['isosceles', 'Two of its angles are equal'], ['scalene', 'All three angles are different']]);
      return mcq(rng, {
        prompt: `Equal sides are across from equal angles. Which is true about every ${tt[0]} triangle?`,
        correct: tt[1], wrong: ['It has a right angle', ...[['All three angles are equal'], ['Two of its angles are equal'], ['All three angles are different']].flat().filter((x) => x !== tt[1])],
        hint: `Equal sides sit across from equal angles. An equilateral triangle has 3 equal sides, an isosceles triangle has 2, and a scalene triangle has none. So how many equal angles does a ${tt[0]} triangle have? A right angle happens in some triangles, but not in every one.`,
        explain: `In a ${tt[0]} triangle, ${tt[1].toLowerCase()}.`,
      });
    }
    return fixedq({
      prompt: `A triangle has a perimeter of ${P} ${unit}. Two of its sides are ${s[0]} ${unit} and ${s[1]} ${unit}. What kind of triangle is it?`,
      choices: TRI_TYPES, correct: type,
      hint: `First find the third side: ${P} − ${s[0]} − ${s[1]}. Then compare all three sides. ${TRI_OPTS}`,
      explain: `The third side is ${P} − ${s[0]} − ${s[1]} = ${s[2]} ${unit}. Sides ${s.join(', ')}: ${TRI_WHY[type]}, so it is ${type.toLowerCase()}.`,
    });
  }],
  // multi-step triangle perimeter
  [6, 7, (t, rng) => {
    const u = pick(rng, ['cm', 'm']);
    if (t === 6 || chance(rng, 0.5)) {
      const sq = R(rng, 1, 12) * 3, tri = (4 * sq) / 3;
      return numq({
        prompt: `An equilateral triangle and a square have the same perimeter. Each side of the square is ${sq} ${u}. How long is each side of the triangle?`, answer: tri,
        hint: `There are two steps. First find the square's perimeter: four sides of ${sq} ${u}. The triangle's three equal sides share that same perimeter.`,
        explain: `The square's perimeter is 4 × ${sq} = ${4 * sq} ${u}. ${4 * sq} ÷ 3 = ${tri} ${u}.`,
      });
    }
    const s = R(rng, 6, 20), d = R(rng, 1, s - 2), P = 3 * s - d;
    return numq({
      prompt: `An isosceles triangle has a perimeter of ${P} ${u}. Its base is ${d} ${u} shorter than each of its two equal sides. How long is each equal side?`, answer: s,
      hint: `If the base were ${d} ${u} longer, all three sides would be equal, and the perimeter would be ${P} + ${d}. Work that out, then share it equally among the three sides.`,
      explain: `${P} + ${d} = ${P + d}. ${P + d} ÷ 3 = ${s} ${u}. Check: ${s} + ${s} + ${s - d} = ${P}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD12b  Transformations: translation, reflection, rotation
// ---------------------------------------------------------------------------
const CHIRAL = [
  [[0, 0], [3, 0], [3, 1], [1, 1], [1, 2], [0, 2]],
  [[0, 0], [3, 0], [0, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 3], [0, 3]],
  [[0, 0], [3, 0], [2, 2], [0, 2]],
  [[0, 0], [2, 0], [3, 2], [0, 1]],
  [[0, 0], [2, 0], [2, 1], [1, 1], [1, 3], [0, 3]],
  [[0, 0], [4, 0], [4, 1], [1, 1], [1, 2], [0, 2]],
];
const mv = (P, dx, dy) => P.map(([x, y]) => [x + dx, y + dy]);
const refV = (P, a) => P.map(([x, y]) => [2 * a - x, y]);
const refH = (P, a) => P.map(([x, y]) => [x, 2 * a - y]);
const rotCW = (P, cx, cy) => P.map(([x, y]) => [cx + (y - cy), cy - (x - cx)]);
const rotCCW = (P, cx, cy) => P.map(([x, y]) => [cx - (y - cy), cy + (x - cx)]);
const rot180 = (P, cx, cy) => P.map(([x, y]) => [2 * cx - x, 2 * cy - y]);
const inB = (P, max = 10) => P.every(([x, y]) => x >= 0 && y >= 0 && x <= max && y <= max);
function placeShape(rng, max = 10) {
  let P = pick(rng, CHIRAL);
  const turns = R(rng, 0, 3);
  for (let i = 0; i < turns; i++) P = rotCW(P, 0, 0);
  if (chance(rng, 0.5)) P = refV(P, 0);
  const mx = Math.min(...P.map((p) => p[0])), my = Math.min(...P.map((p) => p[1]));
  P = mv(P, -mx, -my);
  const w = Math.max(...P.map((p) => p[0])), h = Math.max(...P.map((p) => p[1]));
  return mv(P, R(rng, 0, max - w), R(rng, 0, max - h));
}
// A random transformation of P that stays on the grid.
function transformOf(rng, P, kind, max = 10) {
  for (let tries = 0; tries < 60; tries++) {
    let Q, info;
    if (kind === 'translation') {
      const dx = R(rng, -5, 5), dy = R(rng, -5, 5);
      if (Math.abs(dx) + Math.abs(dy) < 3) continue;
      Q = mv(P, dx, dy); info = { dx, dy };
    } else if (kind === 'reflection') {
      const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
      if (chance(rng, 0.5)) {
        const a = chance(rng, 0.5) ? Math.max(...xs) + R(rng, 0, 1) : Math.min(...xs) - R(rng, 0, 1);
        Q = refV(P, a); info = { axis: 'vertical', at: a };
      } else {
        const a = chance(rng, 0.5) ? Math.max(...ys) + R(rng, 0, 1) : Math.min(...ys) - R(rng, 0, 1);
        Q = refH(P, a); info = { axis: 'horizontal', at: a };
      }
    } else {
      const [cx, cy] = pick(rng, P);
      const dir = pick(rng, ['cw', 'ccw', 'half']);
      Q = dir === 'cw' ? rotCW(P, cx, cy) : dir === 'ccw' ? rotCCW(P, cx, cy) : rot180(P, cx, cy);
      info = { cx, cy, dir };
    }
    if (inB(Q, max)) return { Q, info };
  }
  return null;
}
const TR_OPTS = 'A translation (slide) moves a shape without turning it, so it faces the same way. A reflection (flip) makes a mirror image, so it faces the opposite way. A rotation (turn) spins it around a point, so it ends up tilted.';
const TNAMES = { translation: 'Translation (slide)', reflection: 'Reflection (flip)', rotation: 'Rotation (turn)' };
const TR_WHY = {
  translation: 'The shape slid to a new place without turning or flipping. It faces the same way.',
  reflection: 'The shape flipped over a line, like a mirror image. It now faces the opposite way.',
  rotation: 'The shape turned around a point. It is tilted a different way, but not flipped.',
};
function transDesc(dx, dy) {
  const parts = [];
  if (dx) parts.push(`${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'}`);
  if (dy) parts.push(`${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}`);
  return parts.join(' and ');
}
const TURN = { cw: '¼ turn clockwise', ccw: '¼ turn counterclockwise', half: '½ turn' };

const transform = gen([
  [1, 5, (t, rng) => {
    const kind = pick(rng, t <= 1 ? ['translation', 'reflection'] : ['translation', 'reflection', 'rotation']);
    const P = placeShape(rng);
    const r = transformOf(rng, P, kind);
    if (!r) return transform(t, rng);
    return fixedq({
      prompt: 'The solid shape moved to the dashed shape. Which transformation is it?',
      visual: { type: 'transform', grid: 10, original: P, image: r.Q },
      choices: Object.values(TNAMES), correct: TNAMES[kind],
      hint: `${TR_OPTS} Compare the solid and dashed shapes: find the longest side or a pointy corner, and see which way it faces in each shape.`,
      explain: TR_WHY[kind],
    });
  }],
  [2, 6, (t, rng) => {
    const P = placeShape(rng, 10);
    const r = transformOf(rng, P, 'translation');
    if (!r) return transform(t, rng);
    const { dx, dy } = r.info;
    const wrong = [transDesc(dy, dx), transDesc(-dx, dy), transDesc(dx, -dy), transDesc(-dx, -dy), transDesc(dx + 1, dy)].filter((s) => s && s !== transDesc(dx, dy));
    return mcq(rng, {
      prompt: 'Describe the translation from the solid shape to the dashed shape. Count squares.',
      visual: { type: 'coordplane', max: 10, polygon: P, polygon2: r.Q },
      correct: transDesc(dx, dy), wrong,
      hint: 'Pick one corner of the solid shape and find the matching corner of the dashed shape. Count the squares it moves right or left, then up or down. The right choice has both parts, in the right directions.',
      explain: `Each corner moves ${transDesc(dx, dy)}.`,
    });
  }],
  [3, 6, (t, rng) => {
    const target = pick(rng, ['translation', 'reflection', 'rotation']);
    const P = placeShape(rng);
    const items = [];
    for (const kind of ['translation', 'reflection', 'rotation']) {
      const r = transformOf(rng, P, kind);
      if (!r) return transform(t, rng);
      items.push({ visual: { type: 'transform', grid: 10, original: P, image: r.Q }, correct: kind === target });
    }
    return {
      kind: 'mc', prompt: `Which picture shows a ${target}?`, ...mcVisual(rng, items),
      hint: `${TR_OPTS} Look at each picture and decide which of the three moves it shows. Then find the ${target}.`,
      explain: `In the ${target}, ${TR_WHY[target].charAt(0).toLowerCase() + TR_WHY[target].slice(1)}`,
    };
  }],
  [4, 7, (t, rng) => {
    const P = placeShape(rng, 10);
    const r = transformOf(rng, P, 'translation');
    if (!r) return transform(t, rng);
    const { dx, dy } = r.info;
    const seen = new Set([`${dx},${dy}`]);
    const alts = [[dy, dx], [-dx, dy], [dx, -dy], [-dx, -dy], [dx + 1, dy], [dx, dy - 1]].map(([a, b]) => [a + 0, b + 0])
      .filter(([a, b]) => { const key = `${a},${b}`; if (seen.has(key) || !inB(mv(P, a, b)) || (a === 0 && b === 0)) return false; seen.add(key); return true; });
    if (alts.length < 2) return transform(t, rng);
    const items = [{ visual: { type: 'coordplane', max: 10, polygon: P, polygon2: r.Q }, correct: true },
      ...sample(rng, alts, 3).map(([a, b]) => ({ visual: { type: 'coordplane', max: 10, polygon: P, polygon2: mv(P, a, b) }, correct: false }))];
    return {
      kind: 'mc', prompt: `The shape slides ${transDesc(dx, dy)}. Which picture shows the image (dashed)?`, ...mcVisual(rng, items),
      hint: `Pick one corner of the solid shape. Move it ${transDesc(dx, dy)}, counting grid squares. Which picture has the matching corner of the dashed shape in that spot, with the shape facing the same way?`,
      explain: `Every corner moves ${transDesc(dx, dy)}. The correct picture has the dashed shape in that spot, facing the same way.`,
    };
  }],
  [5, 7, (t, rng) => {
    const P = placeShape(rng, 10);
    const r = transformOf(rng, P, 'rotation');
    if (!r) return transform(t, rng);
    const { cx, cy, dir } = r.info;
    return fixedq({
      prompt: 'The solid shape turned about point P to make the dashed shape. Which turn was it?',
      visual: { type: 'coordplane', max: 10, polygon: P, polygon2: r.Q, points: [{ x: cx, y: cy, label: 'P' }] },
      choices: Object.values(TURN), correct: TURN[dir],
      hint: 'A ¼ turn clockwise swings the shape the way clock hands move. A ¼ turn counterclockwise swings it the other way. A ½ turn spins it halfway around P, so it ends up upside down. Follow one side that touches P: which way does it point before and after?',
      explain: `The shape made a ${TURN[dir]} about P. ${dir === 'half' ? 'It ended up upside down, pointing the opposite way.' : 'Each side from P swung through a right angle.'}`,
    });
  }],
  [5, 7, (t, rng) => {
    const P = placeShape(rng, 10);
    const r = transformOf(rng, P, 'reflection');
    if (!r || r.info.at < 1 || r.info.at > 9) return transform(t, rng);
    const { axis, at } = r.info;
    const other = axis === 'vertical' ? 'horizontal' : 'vertical';
    const lab = (ax, v) => `a ${ax} line through ${v}`;
    return mcq(rng, {
      prompt: 'The solid shape was reflected to make the dashed shape. Where is the line of reflection?',
      visual: { type: 'coordplane', max: 10, polygon: P, polygon2: r.Q },
      correct: lab(axis, at), wrong: [lab(axis, at + 1), lab(axis, at - 1), lab(other, at), lab(other, 5)].filter((s) => s !== lab(axis, at)),
      hint: 'A mirror line is exactly halfway between each corner and its matching corner in the image. Pick one corner and its match, and find the grid line halfway between them. Is that line vertical (up and down) or horizontal (across)?',
      explain: `Each corner and its image are the same distance from ${lab(axis, at)}, so that is the line of reflection.`,
    });
  }],
  [2, 4, (t, rng) => {
    const kind = pick(rng, ['translation', 'reflection', 'rotation']);
    const T = {
      translation: 'It is the same size and shape, and faces the same way.',
      reflection: 'It is the same size and shape, but it is a mirror image.',
      rotation: 'It is the same size and shape, but it is turned.',
    };
    return mcq(rng, {
      prompt: `After a ${kind}, which is true about the image?`,
      correct: T[kind], wrong: [...Object.values(T).filter((x) => x !== T[kind]), 'It becomes bigger.'],
      hint: `Slides, flips and turns never change a shape's size. A translation keeps it facing the same way, a reflection makes a mirror image, and a rotation turns it. Which description fits a ${kind}?`,
      explain: TR_WHY[kind] + ' The size and shape never change.',
    });
  }],
  // perform a reflection: pick the picture that shows the shape flipped over the mirror line
  [6, 7, (t, rng) => {
    const P = placeShape(rng, 10);
    const r = transformOf(rng, P, 'reflection');
    if (!r) return transform(t, rng);
    const { axis, at } = r.info;
    const mirror = { axis: axis === 'vertical' ? 'x' : 'y', at };
    const flip = axis === 'vertical' ? refV : refH;
    const cands = [];
    for (const d of [1, -1, 2, -2]) { const Q = flip(P, at + d); if (inB(Q)) { cands.push(Q); break; } }
    const tr = transformOf(rng, P, 'translation'); if (tr) cands.push(tr.Q);
    const ro = transformOf(rng, P, 'rotation'); if (ro) cands.push(ro.Q);
    const same = (A, B) => A.every((p, i) => p[0] === B[i][0] && p[1] === B[i][1]);
    const bad = cands.filter((Q) => !same(Q, r.Q) && !same(Q, P));
    if (bad.length < 2) return transform(t, rng);
    const items = [{ visual: { type: 'transform', grid: 10, original: P, image: r.Q, mirror }, correct: true },
      ...bad.map((Q) => ({ visual: { type: 'transform', grid: 10, original: P, image: Q, mirror }, correct: false }))];
    return {
      kind: 'mc', prompt: `Each picture shows a ${axis} mirror line. Which one shows the solid shape reflected in the mirror line?`, ...mcVisual(rng, items),
      hint: 'In a reflection, every corner of the image is the same distance from the mirror line as the matching corner of the shape, but on the other side. The image is a mirror image, so it faces the opposite way. Check one corner in each picture.',
      explain: `The correct image is a mirror image, and each corner is the same number of squares from the ${axis} mirror line as its matching corner. The others slid, turned or flipped over a different line.`,
    };
  }],
]);

// ---------------------------------------------------------------------------
// SD13  Data: first-hand and second-hand data, double bar graphs, tables
// ---------------------------------------------------------------------------
const DATA_SETS = [
  { title: 'Favourite Sports', cats: ['Soccer', 'Hockey', 'Swimming', 'Basketball', 'Skiing'], word: 'sport', unit: 'votes' },
  { title: 'Favourite Fruits', cats: ['Apples', 'Bananas', 'Grapes', 'Pears', 'Blueberries'], word: 'fruit', unit: 'votes' },
  { title: 'Favourite Pets', cats: ['Cats', 'Dogs', 'Fish', 'Birds', 'Rabbits'], word: 'pet', unit: 'votes' },
  { title: 'Books Read', cats: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], word: 'day', unit: 'books' },
  { title: 'Favourite Seasons', cats: ['Spring', 'Summer', 'Fall', 'Winter'], word: 'season', unit: 'votes' },
  { title: 'Magic Creatures Spotted', cats: ['Dragons', 'Unicorns', 'Griffins', 'Phoenixes'], word: 'creature', unit: 'sightings' },
  { title: 'Snacks Sold', cats: ['Popcorn', 'Pretzels', 'Muffins', 'Granola'], word: 'snack', unit: 'snacks' },
];
const SERIES = [['Grade 5', 'Grade 6'], ['Class A', 'Class B'], ['2025', '2026'], ['Team Owls', 'Team Foxes'], ['Kids', 'Adults'], ['Week 1', 'Week 2']];
function dbg(rng, t) {
  const ds = pick(rng, DATA_SETS), [s1, s2] = pick(rng, SERIES);
  const n = Math.min(ds.cats.length, t <= 2 ? 3 : 4);
  const cats = ds.cats.slice(0, n);
  const scale = [1, 2, 5, 5, 10, 10, 10][t - 1];
  const maxK = t <= 1 ? 9 : 10;
  const v1 = cats.map(() => R(rng, 1, maxK) * scale), v2 = cats.map(() => R(rng, 1, maxK) * scale);
  return { ...ds, cats, s1, s2, scale, v1, v2, visual: { type: 'bargraph', title: ds.title, labels: cats, values: v1, series1Name: s1, series2: { name: s2, values: v2 }, scale, yLabel: `Number of ${ds.unit}` } };
}
const FS_OPTS = 'First-hand data means the person collected it themselves, by counting, measuring, timing or asking. Second-hand data means someone else collected it, and you read it in a book, website, newspaper or chart.';
const FIRST = [
  (n) => `${n} counts the cars that drive past the school`, (n) => `${n} surveys the class about favourite pets`,
  (n) => `${n} measures the temperature every morning with a thermometer`, (n) => `${n} times how long friends take to run 50 m`,
  (n) => `${n} rolls a number cube 30 times and records the results`, (n) => `${n} counts the birds at a feeder each day`,
];
const SECOND = [
  (n) => `${n} finds the population of Canada on a government website`, (n) => `${n} reads last winter's snowfall in a newspaper`,
  (n) => `${n} uses a table of hockey scores from a book`, (n) => `${n} looks up the heights of mountains in an atlas`,
  (n) => `${n} finds the speed of a cheetah in an encyclopedia`, (n) => `${n} reads a chart of rainfall made by scientists`,
];
const METHODS = [
  ['the favourite fruit of students in your class', 'Survey the students in the class'],
  ['the favourite games of Grade 5 students in your school', 'Survey the students in the class'],
  ['the average rainfall in Fredericton last year', 'Look it up on a trusted website or in a book'],
  ['the population of Moncton', 'Look it up on a trusted website or in a book'],
  ['which paper airplane design flies farthest', 'Do an experiment and record the results'],
  ['how long ice takes to melt in the sun and in the shade', 'Do an experiment and record the results'],
  ['how many birds visit the feeder each day', 'Watch and keep a tally'],
  ['how many cars drive past the school at lunchtime', 'Watch and keep a tally'],
];

const data = gen([
  [1, 6, (t, rng) => {
    const g = dbg(rng, t);
    const i = R(rng, 0, g.cats.length - 1);
    const k = t <= 1 ? 0 : t <= 2 ? R(rng, 0, 1) : R(rng, 1, 4);
    if (k === 0) {
      const which = chance(rng, 0.5);
      return numq({
        prompt: `How many ${g.unit} did ${which ? g.s1 : g.s2} have for ${g.cats[i]}?`, visual: g.visual, answer: which ? g.v1[i] : g.v2[i],
        hint: `Find the ${which ? g.s1 : g.s2} bar above ${g.cats[i]} (the key shows which bar is which). Follow the top of the bar across to the scale. Each grid line is worth ${g.scale}.`,
        explain: `The ${which ? g.s1 : g.s2} bar for ${g.cats[i]} reaches ${which ? g.v1[i] : g.v2[i]}.`,
      });
    }
    if (k === 1) {
      if (g.v1[i] === g.v2[i]) g.v1[i] += g.scale, g.visual.values = g.v1;
      const [hi, lo, vh, vl] = g.v1[i] > g.v2[i] ? [g.s1, g.s2, g.v1[i], g.v2[i]] : [g.s2, g.s1, g.v2[i], g.v1[i]];
      return numq({
        prompt: `For ${g.cats[i]}, how many more ${g.unit} did ${hi} have than ${lo}?`, visual: g.visual, answer: vh - vl,
        hint: `Find the ${hi} bar and the ${lo} bar above ${g.cats[i]}, and read each one against the scale. Then subtract the smaller number from the bigger one.`,
        explain: `${hi}: ${vh}. ${lo}: ${vl}. ${vh} − ${vl} = ${vh - vl}.`,
      });
    }
    if (k === 2) {
      const diffs = g.cats.map((c, j) => Math.abs(g.v1[j] - g.v2[j]));
      const mx = Math.max(...diffs);
      if (diffs.filter((d) => d === mx).length > 1) return data(t, rng);
      const ci = diffs.indexOf(mx);
      return fixedq({
        prompt: `For which ${g.word} is the difference between ${g.s1} and ${g.s2} the greatest?`, visual: g.visual,
        choices: g.cats, correct: g.cats[ci],
        hint: `For each ${g.word}, read both bars and subtract the smaller number from the bigger one. The ${g.word} with the biggest gap is the answer.`,
        explain: `The differences are ${g.cats.map((c, j) => `${c}: ${diffs[j]}`).join(', ')}. ${g.cats[ci]} has the greatest difference.`,
      });
    }
    if (k === 3) {
      const which = chance(rng, 0.5), vals = which ? g.v1 : g.v2;
      return numq({
        prompt: `How many ${g.unit} did ${which ? g.s1 : g.s2} have in all?`, visual: g.visual, answer: sum(vals),
        hint: `Read every ${which ? g.s1 : g.s2} bar (use the key), one ${g.word} at a time. Then add all of those numbers.`,
        explain: `${vals.join(' + ')} = ${sum(vals)}.`,
      });
    }
    const more = g.cats.map((c, j) => g.v2[j] > g.v1[j]);
    if (more.filter(Boolean).length !== 1) return data(t, rng);
    return fixedq({
      prompt: `For which ${g.word} did ${g.s2} have more than ${g.s1}?`, visual: g.visual,
      choices: g.cats, correct: g.cats[more.indexOf(true)],
      hint: `For each ${g.word}, compare the two bars side by side. Look for the one where the ${g.s2} bar is taller than the ${g.s1} bar.`,
      explain: `Only for ${g.cats[more.indexOf(true)]} is the ${g.s2} bar taller than the ${g.s1} bar.`,
    });
  }],
  [2, 7, (t, rng) => {
    const g = dbg(rng, Math.max(2, t - 1));
    const tots = g.cats.map((c, j) => g.v1[j] + g.v2[j]);
    const visual = { type: 'table', title: g.title, headers: [cap(g.word), g.s1, g.s2], rows: g.cats.map((c, j) => [c, g.v1[j], g.v2[j]]) };
    if (chance(rng, 0.5)) {
      const mx = Math.max(...tots);
      if (tots.filter((x) => x === mx).length > 1) return data(t, rng);
      return fixedq({
        prompt: `Which ${g.word} has the greatest total for ${g.s1} and ${g.s2} together?`, visual,
        choices: g.cats, correct: g.cats[tots.indexOf(mx)],
        hint: `Each row has a ${g.s1} number and a ${g.s2} number. Add the two numbers in each row, then compare the totals.`,
        explain: `Totals: ${g.cats.map((c, j) => `${c} ${tots[j]}`).join(', ')}. ${g.cats[tots.indexOf(mx)]} is greatest.`,
      });
    }
    const i = R(rng, 0, g.cats.length - 1);
    return numq({
      prompt: `What is the total for ${g.cats[i]} (${g.s1} and ${g.s2} together)?`, visual, answer: tots[i],
      hint: `Find the ${g.cats[i]} row. Add its ${g.s1} number and its ${g.s2} number.`,
      explain: `${g.v1[i]} + ${g.v2[i]} = ${tots[i]}.`,
    });
  }],
  [1, 4, (t, rng) => {
    const n = nm(rng);
    if (t >= 3 && chance(rng, 0.5)) {
      const wantFirst = chance(rng, 0.5);
      const right = pick(rng, wantFirst ? FIRST : SECOND)(n);
      const wrong = sample(rng, wantFirst ? SECOND : FIRST, 3).map((f) => f(n));
      return mcq(rng, {
        prompt: `Which is ${wantFirst ? 'first-hand' : 'second-hand'} data?`, correct: right, wrong,
        hint: `${FS_OPTS} For each choice, ask: did ${n} collect it, or look it up?`,
        explain: `${right}: ${wantFirst ? `${n} collects it directly, so it is first-hand` : 'someone else collected it, so it is second-hand'}.`,
      });
    }
    const first = chance(rng, 0.5);
    const story = pick(rng, first ? FIRST : SECOND)(n);
    return fixedq({
      prompt: `${story}. Is this first-hand or second-hand data?`,
      choices: ['First-hand data', 'Second-hand data'], correct: first ? 'First-hand data' : 'Second-hand data',
      hint: `${FS_OPTS} In this story, did ${n} do the counting, measuring or asking, or read what someone else found?`,
      explain: first ? `${n} collected the data directly, so it is first-hand data.` : 'Someone else collected the data, so it is second-hand data.',
    });
  }],
  [3, 7, (t, rng) => {
    const [what, how] = pick(rng, METHODS);
    return fixedq({
      prompt: `What is the best way to find ${what}?`,
      choices: ['Survey the students in the class', 'Look it up on a trusted website or in a book', 'Do an experiment and record the results', 'Watch and keep a tally'],
      correct: how,
      hint: `Survey the class when you want to know what people think or like. Look it up when experts have already recorded the facts. Do an experiment when you need to test something. Watch and keep a tally when you count things as they happen. Which fits finding ${what}?`,
      explain: `To find ${what}, the best way is: ${how.toLowerCase()}.`,
    });
  }],
  [5, 7, (t, rng) => {
    const g = dbg(rng, t);
    const i = R(rng, 0, g.cats.length - 1), j = (i + 1) % g.cats.length;
    if (g.v1[i] === g.v2[i]) return data(t, rng);
    const mx2 = Math.max(...g.v2);
    const tops = g.v2.filter((v) => v === mx2).length;
    const statements = [
      [`More ${g.unit} for ${g.cats[i]} came from ${g.s1} than ${g.s2}.`, g.v1[i] > g.v2[i]],
      [`${g.cats[j]} got ${g.v1[j] + g.v2[j]} ${g.unit} in all.`, true],
      [`${g.cats[j]} got ${g.v1[j] + g.v2[j] + g.scale} ${g.unit} in all.`, false],
      [`${g.s2}${g.s2.endsWith('s') ? "'" : "'s"} top ${g.word} was ${g.cats[g.v2.indexOf(mx2)]}.`, tops === 1],
      [`${g.s1} and ${g.s2} had the same total.`, sum(g.v1) === sum(g.v2)],
      [`${g.s1} had ${Math.abs(g.v1[i] - g.v2[i]) + g.scale} more ${g.unit} than ${g.s2} for ${g.cats[i]}.`, false],
    ];
    const T = statements.filter((s) => s[1]), Fa = statements.filter((s) => !s[1]);
    if (!T.length || Fa.length < 2) return data(t, rng);
    const c = pick(rng, T)[0];
    return mcq(rng, {
      prompt: 'Which statement is true?', visual: g.visual,
      correct: c, wrong: Fa.map((s) => s[0]),
      hint: 'Check each statement against the graph, one at a time. Read the exact numbers from the bars. When a statement talks about totals or "more than", add or subtract to check it.',
      explain: `"${c}" matches the graph.`,
    });
  }],
  [5, 7, (t, rng) => {
    const g = dbg(rng, 3);
    const visual = { type: 'table', title: g.title, headers: [cap(g.word), g.s1, g.s2], rows: g.cats.map((c, j) => [c, g.v1[j], g.v2[j]]) };
    const mk = (a, b) => ({ type: 'bargraph', title: g.title, labels: g.cats, values: a, series1Name: g.s1, series2: { name: g.s2, values: b }, scale: g.scale });
    const alt = g.v1.slice(); const k = R(rng, 0, alt.length - 1); alt[k] += g.scale;
    const alt2 = g.v2.slice(); alt2[(k + 1) % alt2.length] = Math.max(g.scale, alt2[(k + 1) % alt2.length] - g.scale);
    const cand = [[g.v2, g.v1], [alt, g.v2], [g.v1, alt2]].filter(([a, b]) => JSON.stringify([a, b]) !== JSON.stringify([g.v1, g.v2]));
    const items = [{ visual: mk(g.v1, g.v2), correct: true }, ...cand.map(([a, b]) => ({ visual: mk(a, b), correct: false }))];
    return {
      kind: 'mc', prompt: 'Which double bar graph matches the table?', visual, ...mcVisual(rng, items),
      hint: `For each graph, check every ${g.word}: the ${g.s1} bar and the ${g.s2} bar must both match the numbers in the table. One wrong bar makes the whole graph wrong, and the two groups must not be swapped.`,
      explain: `The matching graph has ${g.cats.map((c, j) => `${c}: ${g.v1[j]} and ${g.v2[j]}`).join('; ')}.`,
    };
  }],
  [6, 7, (t, rng) => {
    const g = dbg(rng, t);
    const [i, j] = sample(rng, [...g.cats.keys()], 2);
    const ti = g.v1[i] + g.v2[i], tj = g.v1[j] + g.v2[j];
    if (ti === tj) return data(t, rng);
    const [a, b, ta, tb] = ti > tj ? [i, j, ti, tj] : [j, i, tj, ti];
    return numq({
      prompt: `With both groups together, how many more ${g.unit} did ${g.cats[a]} get than ${g.cats[b]}?`, visual: g.visual, answer: ta - tb,
      hint: `There are two steps. First add both bars for ${g.cats[a]}, and both bars for ${g.cats[b]}. Then subtract the smaller total from the bigger one.`,
      explain: `${g.cats[a]}: ${g.v1[a]} + ${g.v2[a]} = ${ta}. ${g.cats[b]}: ${g.v1[b]} + ${g.v2[b]} = ${tb}. ${ta} − ${tb} = ${ta - tb}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD14  Chance: impossible / possible / certain; equal and unequal chance
// ---------------------------------------------------------------------------
const MCOL = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const LIKE = ['impossible', 'possible', 'certain'];
const LIKE_OPTS = 'Impossible means it can never happen. Certain means it will happen every time. Possible means it might happen, or might not.';
function bag(rng, k, max) {
  const cols = sample(rng, MCOL, k);
  return cols.map((c) => ({ color: c, count: R(rng, 1, max) }));
}

const chanceSkill = gen([
  [1, 4, (t, rng) => {
    const mode = pick(rng, ['impossible', 'possible', 'certain']);
    let items;
    if (mode === 'certain') { const c = pick(rng, MCOL); items = [{ color: c, count: R(rng, 3, 10) }]; }
    else items = bag(rng, R(rng, 2, 3), t <= 2 ? 5 : 8);
    const present = items.map((i) => i.color);
    const target = mode === 'impossible' ? pick(rng, MCOL.filter((c) => !present.includes(c))) : pick(rng, present);
    return fixedq({
      prompt: `You pick one marble without looking. Picking ${an(target)} marble is…`,
      visual: { type: 'marbles', items },
      choices: LIKE, correct: mode,
      hint: `${LIKE_OPTS} Look in the jar: are there any ${target} marbles at all? Are all of them ${target}?`,
      explain: mode === 'impossible' ? `There are no ${target} marbles, so it is impossible.` : mode === 'certain' ? `Every marble is ${target}, so it is certain.` : `Some marbles are ${target} and some are not, so it is possible.`,
    });
  }],
  [1, 5, (t, rng) => {
    const useSpinner = chance(rng, 0.5);
    const n = t <= 2 ? 3 : 4;
    const cols = sample(rng, MCOL, n);
    let sizes = cols.map(() => R(rng, 1, t <= 2 ? 4 : 6));
    const most = chance(rng, 0.6);
    const target = most ? Math.max(...sizes) : Math.min(...sizes);
    if (sizes.filter((s) => s === target).length > 1) return chanceSkill(t, rng);
    const ans = cols[sizes.indexOf(target)];
    const visual = useSpinner ? { type: 'spinner', sections: cols.map((c, i) => ({ color: c, label: c, size: sizes[i] })) } : { type: 'marbles', items: cols.map((c, i) => ({ color: c, count: sizes[i] })) };
    return fixedq({
      prompt: useSpinner ? `Which colour is the spinner ${most ? 'most' : 'least'} likely to land on?` : `You pick one marble without looking. Which colour are you ${most ? 'most' : 'least'} likely to pick?`,
      visual, choices: cols, correct: ans,
      hint: useSpinner ? `The bigger a colour's part of the spinner, the more likely the arrow is to land there. Compare the sizes and find the ${most ? 'biggest' : 'smallest'} part.` : `The more marbles of a colour there are, the more likely you are to pick it. Count each colour and find the one with the ${most ? 'most' : 'fewest'}.`,
      explain: useSpinner ? `The ${ans} section is the ${most ? 'biggest' : 'smallest'}, so it is ${most ? 'most' : 'least'} likely.` : `There ${target === 1 ? 'is 1' : `are ${target}`} ${ans} marble${target === 1 ? '' : 's'}, the ${most ? 'most' : 'fewest'} of any colour.`,
    });
  }],
  [2, 7, (t, rng) => {
    const [a, b] = sample(rng, MCOL, 2);
    const na = R(rng, 1, 6);
    const nb = pick(rng, [na, na, R(rng, 1, 6)]);
    const extra = t >= 4 ? [{ color: pick(rng, MCOL.filter((c) => c !== a && c !== b)), count: R(rng, 1, 4) }] : [];
    const useSpinner = chance(rng, 0.5);
    const cols = [{ color: a, count: na }, { color: b, count: nb }, ...extra];
    const visual = useSpinner ? { type: 'spinner', sections: cols.map((c) => ({ color: c.color, label: c.color, size: c.count })) } : { type: 'marbles', items: cols };
    const correct = na < nb ? 'less likely' : na > nb ? 'more likely' : 'equally likely';
    return fixedq({
      prompt: `Is ${useSpinner ? 'landing on' : 'picking'} ${a} less likely, equally likely, or more likely than ${b}?`,
      visual, choices: ['less likely', 'equally likely', 'more likely'], correct,
      hint: `More likely means ${a} has more ${useSpinner ? 'space on the spinner' : 'marbles'} than ${b}. Less likely means less. Equally likely means the same amount. ${useSpinner ? `Compare the sizes of the ${a} and ${b} parts.` : `Count the ${a} and ${b} marbles.`}`,
      explain: `${cap(a)}: ${na}${useSpinner ? ' parts' : ''}, ${b}: ${nb}${useSpinner ? ' parts' : ''}. ${correct === 'equally likely' ? `So ${a} and ${b} are equally likely.` : `So ${a} is ${correct} than ${b}.`}`,
    });
  }],
  [3, 7, (t, rng) => {
    const [a, b] = sample(rng, MCOL, 2);
    const goal = pick(rng, ['equal', 'more']);
    const useSpinner = chance(rng, 0.5);
    const mk = (x, y) => (useSpinner
      ? { type: 'spinner', sections: [{ color: a, label: a, size: x }, { color: b, label: b, size: y }] }
      : { type: 'marbles', items: [{ color: a, count: x }, { color: b, count: y }] });
    const good = goal === 'equal' ? (() => { const k = R(rng, 1, 5); return [k, k]; })() : (() => { const y = R(rng, 1, 4); return [y + R(rng, 1, 3), y]; })();
    const badPool = goal === 'equal' ? [[2, 3], [4, 1], [1, 3], [5, 2], [3, 4], [2, 5]] : [[2, 2], [1, 3], [3, 4], [2, 5], [3, 3], [1, 2]];
    const bads = sample(rng, badPool.filter(([x, y]) => (goal === 'equal' ? x !== y : x <= y)), 3);
    const items = [{ visual: mk(...good), correct: true }, ...bads.map((p) => ({ visual: mk(...p), correct: false }))];
    return {
      kind: 'mc',
      prompt: goal === 'equal' ? `Which ${useSpinner ? 'spinner' : 'bag'} gives ${a} and ${b} an equal chance?` : `Which ${useSpinner ? 'spinner' : 'bag'} makes ${a} more likely than ${b}?`,
      ...mcVisual(rng, items),
      hint: goal === 'equal' ? `An equal chance means the same amount of ${a} and ${b}. Check each ${useSpinner ? 'spinner: are the two parts the same size?' : 'bag: are there the same number of each colour?'}` : `${cap(a)} is more likely when there is more ${a} than ${b}. Check each ${useSpinner ? 'spinner: which one has a bigger ' + a + ' part?' : 'bag: which one has more ' + a + ' marbles than ' + b + '?'}`,
      explain: goal === 'equal' ? `The right one has the same amount of ${a} and ${b} (${good[0]} each).` : `The right one has ${good[0]} ${a} and ${good[1]} ${b}, so ${a} is more likely.`,
    };
  }],
  [2, 4, (t, rng) => {
    const k = R(rng, 0, 6);
    const kind = pick(rng, ['greater', 'less', 'even', 'odd', 'equal']);
    let text, ans;
    if (kind === 'greater') { text = `rolling a number greater than ${k}`; ans = k === 0 ? 'certain' : k >= 6 ? 'impossible' : 'possible'; }
    else if (kind === 'less') { const m = k + 1; text = `rolling a number less than ${m}`; ans = m >= 7 ? 'certain' : m <= 1 ? 'impossible' : 'possible'; }
    else if (kind === 'even') { text = 'rolling an even number'; ans = 'possible'; }
    else if (kind === 'odd') { text = pick(rng, ['rolling a 7', 'rolling a 0', 'rolling a 9']); ans = 'impossible'; }
    else { text = 'rolling a number from 1 to 6'; ans = 'certain'; }
    return fixedq({
      prompt: `You roll a regular number cube (1 to 6). How likely is ${text}?`,
      visual: { type: 'dice', values: [R(rng, 1, 6)] },
      choices: LIKE, correct: ans,
      hint: `A number cube can only land on 1, 2, 3, 4, 5 or 6. ${LIKE_OPTS} How many of those six numbers fit "${text.replace(/^rolling /, '')}": none, some, or all of them?`,
      explain: `${cap(text)} is ${ans}.`,
    });
  }],
  [5, 7, (t, rng) => {
    const [a, b] = sample(rng, MCOL, 2);
    const na = R(rng, 4, 12), nb = R(rng, 1, na - 1);
    if (chance(rng, 0.5)) {
      return numq({
        prompt: `A bag has ${na} ${a} and ${nb} ${b} marbles. How many ${b} marbles must be added so both colours are equally likely?`,
        visual: { type: 'marbles', items: [{ color: a, count: na }, { color: b, count: nb }] },
        answer: na - nb,
        hint: `Equally likely means the same number of each colour. There are ${na} ${a} and ${nb} ${b}. How many more ${b} are needed to match the ${a}?`,
        explain: `${na} − ${nb} = ${na - nb}. With ${na - nb} more ${b}, there are ${na} of each.`,
      });
    }
    const c = pick(rng, MCOL.filter((x) => x !== a && x !== b)), nc = R(rng, 1, 5);
    return numq({
      prompt: `A bag has ${na} ${a}, ${nb} ${b} and ${nc} ${c} marbles. How many marbles must be taken out so picking ${a} is certain?`,
      visual: { type: 'marbles', items: [{ color: a, count: na }, { color: b, count: nb }, { color: c, count: nc }] },
      answer: nb + nc,
      hint: `Certain means every marble left in the bag is ${a}. Which marbles must come out? Count all of them.`,
      explain: `Take out all ${nb} ${b} and ${nc} ${c}: ${nb} + ${nc} = ${nb + nc}.`,
    });
  }],
  [6, 7, (t, rng) => {
    const cols = sample(rng, MCOL, 4);
    const counts = shuffle(rng, [R(rng, 1, 2), R(rng, 3, 5), R(rng, 6, 8), R(rng, 9, 12)]);
    const items = cols.map((c, i) => ({ color: c, count: counts[i] }));
    if (t === 7 && chance(rng, 0.5)) {
      const i = R(rng, 0, 3), tot = sum(counts);
      return mcq(rng, {
        prompt: `You pick one marble. What is the chance of picking ${cols[i]}?`, visual: { type: 'marbles', items },
        correct: `${counts[i]} out of ${tot}`, wrong: [`${counts[i]} out of ${tot - counts[i]}`, `${tot - counts[i]} out of ${tot}`, `${counts[i] + 1} out of ${tot}`],
        hint: `The chance is "marbles of that colour out of all the marbles". Count the ${cols[i]} marbles, then count every marble in the jar.`,
        explain: `There are ${counts[i]} ${cols[i]} marbles out of ${tot} in all: ${counts[i]} out of ${tot}.`,
      });
    }
    const order = cols.map((c, i) => [c, counts[i]]).sort((x, y) => x[1] - y[1]).map((x) => x[0]);
    const f = (arr) => arr.join(', ');
    return mcq(rng, {
      prompt: 'Which list goes from least likely to most likely?', visual: { type: 'marbles', items },
      correct: f(order), wrong: [f(order.slice().reverse()), f([order[1], order[0], ...order.slice(2)]), f([...order.slice(0, 2), order[3], order[2]]), f(cols)],
      hint: 'Count each colour. The colour with the fewest marbles is least likely, so it goes first. The colour with the most goes last.',
      explain: `Counts: ${cols.map((c, i) => `${c} ${counts[i]}`).join(', ')}. Least to most likely: ${f(order)}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD15  Money and financial literacy
// ---------------------------------------------------------------------------
const COIN_VAL = { bill100: 10000, bill50: 5000, bill20: 2000, bill10: 1000, bill5: 500, toonie: 200, loonie: 100, quarter: 25, dime: 10, nickel: 5 };
const COIN_ORDER = Object.keys(COIN_VAL);
function coinsFor(rng, cents, maxDen = 'bill20') {
  const out = [];
  let rem = cents;
  for (const k of COIN_ORDER.slice(COIN_ORDER.indexOf(maxDen))) {
    const v = COIN_VAL[k];
    let n = Math.floor(rem / v);
    if (n > 0 && k !== 'nickel' && chance(rng, 0.25)) n -= 1;
    for (let i = 0; i < n; i++) out.push(k);
    rem -= n * v;
  }
  return out;
}
const coinSum = (items) => sum(items.map((k) => COIN_VAL[k]));
const ITEMS = [['book', 800, 2500], ['puzzle', 900, 2800], ['comic book', 400, 1200], ['board game', 1500, 4500], ['art kit', 1200, 3500],
  ['water bottle', 700, 2200], ['soccer ball', 1500, 3500], ['model dragon', 1000, 3000], ['kite', 900, 2600], ['lunch box', 800, 2400], ['sketchbook', 500, 1600]];
const price = (rng, it, cash = true) => {
  const c = R(rng, it[1], it[2]);
  return cash ? Math.round(c / 5) * 5 : (chance(rng, 0.4) ? Math.floor(c / 100) * 100 + 99 : c);
};
// Money answer: keypad when the cents are not a multiple of 10 (no trailing-zero confusion), otherwise choices.
function moneyq(rng, o, cents, wrongCents) {
  if (cents % 10 !== 0 && !o.forceMc) {
    const { forceMc, ...rest } = o;
    return numq({ ...rest, prompt: rest.prompt + ' (Type the dollars and cents.)', answer: clean(cents / 100) });
  }
  const { forceMc, ...rest } = o;
  return mcq(rng, { ...rest, correct: cents, wrong: wrongCents.filter((c) => c > 0 && c !== cents), format: (c) => fmtMoney(c) });
}
const NEEDS = ['winter boots', 'a warm coat', 'healthy food', 'a toothbrush', 'school supplies', 'a bike helmet', 'mittens', 'a place to live'];
const WANTS = ['a video game', 'a toy dragon', 'candy', 'a new phone case', 'concert tickets', 'a sparkly sticker pack', 'a movie ticket', 'a second skateboard'];

const money = gen([
  [1, 3, (t, rng) => {
    const cents = t === 1 ? R(rng, 21, 99) * 5 : t === 2 ? R(rng, 100, 999) * 5 : R(rng, 1000, 2400) * 5;
    const items = coinsFor(rng, cents, t === 1 ? 'toonie' : t === 2 ? 'bill10' : 'bill50');
    if (items.length > 12) return money(t, rng);
    const hasQ = items.includes('quarter');
    const wrong = [cents + 5, cents - 5, cents + 100, cents - 100, cents + 25, hasQ ? cents - 5 * items.filter((k) => k === 'quarter').length : cents + 10];
    return moneyq(rng, {
      prompt: 'How much money is shown?', visual: { type: 'coins', items },
      hint: 'Start with the bill or coin worth the most and count on, keeping a running total. Bills are $5, $10, $20 or $50. A toonie is $2, a loonie is $1, a quarter is 25¢, a dime is 10¢ and a nickel is 5¢.',
      explain: `Counting from the biggest: ${items.map((k) => fmtMoney(COIN_VAL[k], { wholeDollars: true })).join(' + ')} = ${fmtMoney(cents)}.`,
    }, cents, wrong);
  }],
  [2, 5, (t, rng) => {
    const [a, b] = two(rng);
    const ca = R(rng, 1000, t >= 4 ? 9999 : 5000), cb = R(rng, 500, ca - 100);
    const d = ca - cb;
    return moneyq(rng, {
      prompt: `${a} has ${fmtMoney(ca)}. ${b} has ${fmtMoney(cb)}. How much more money does ${a} have?`,
      hint: `"How much more" means the difference between ${fmtMoney(ca)} and ${fmtMoney(cb)}. Subtract the smaller amount from the bigger one, lining up the decimal points. You can also count up from ${fmtMoney(cb)}.`,
      explain: `${fmtMoney(ca)} − ${fmtMoney(cb)} = ${fmtMoney(d)}.`,
    }, d, [d + 100, d - 100, d + 10, d - 10, ca + cb]);
  }],
  [2, 5, (t, rng) => {
    const n = nm(rng), it = pick(rng, ITEMS), p = price(rng, it);
    const bill = [500, 1000, 2000, 5000].find((b) => b > p) || 10000;
    const ch = bill - p;
    return moneyq(rng, {
      prompt: `${n} buys ${an(it[0])} for ${fmtMoney(p)} and pays with ${fmtMoney(bill, { wholeDollars: true })}. How much change should ${n} get?`,
      visual: t <= 3 ? { type: 'coins', items: [COIN_ORDER.find((k) => COIN_VAL[k] === bill)] } : undefined,
      hint: `Change is the money you get back. Count up from ${fmtMoney(p)} to ${fmtMoney(bill, { wholeDollars: true })}: first to the next whole dollar, then by dollars or fives. Add up all the jumps.`,
      explain: `${fmtMoney(bill)} − ${fmtMoney(p)} = ${fmtMoney(ch)}.`,
    }, ch, [ch + 100, ch - 100, ch + 10, ch - 10, p]);
  }],
  [2, 5, (t, rng) => {
    const cents = R(rng, 40, t >= 4 ? 700 : 400) * 5;
    const good = coinsFor(rng, cents, 'bill20');
    if (good.length > 10) return money(t, rng);
    const variants = [];
    const drop = good.slice(); drop.splice(R(rng, 0, drop.length - 1), 1); variants.push(drop);
    variants.push([...good, pick(rng, ['nickel', 'dime', 'quarter'])]);
    const swap = good.map((k) => (k === 'quarter' ? 'dime' : k === 'dime' ? 'nickel' : k === 'toonie' ? 'loonie' : k));
    variants.push(swap);
    const bad = variants.filter((v) => v.length && coinSum(v) !== cents);
    if (bad.length < 2) return money(t, rng);
    const items = [{ visual: { type: 'coins', items: good }, correct: true }, ...bad.map((v) => ({ visual: { type: 'coins', items: v }, correct: false }))];
    return {
      kind: 'mc', prompt: `Which shows exactly ${fmtMoney(cents)}?`, ...mcVisual(rng, items),
      hint: `Add up each set, starting with the biggest bill or coin and keeping a running total. Only one set makes exactly ${fmtMoney(cents)}. Watch out for sets that are 5¢ or 10¢ off.`,
      explain: `The correct set is ${good.map((k) => fmtMoney(COIN_VAL[k], { wholeDollars: true })).join(' + ')} = ${fmtMoney(cents)}.`,
    };
  }],
  [3, 6, (t, rng) => {
    const n = nm(rng), card = pick(rng, [2500, 5000, 7500, 10000]);
    const [i1, i2] = sample(rng, ITEMS, 2);
    const p1 = price(rng, i1, false), p2 = price(rng, i2, false);
    if (p1 + p2 >= card) return money(t, rng);
    const bal = card - p1 - p2;
    if (t >= 5 && chance(rng, 0.5)) {
      const i3 = pick(rng, ITEMS.filter((x) => x !== i1 && x !== i2));
      const enough = chance(rng, 0.5);
      const p3 = enough ? R(rng, Math.max(100, Math.floor(bal / 2)), bal) : bal + R(rng, 1, 1500);
      if (enough || chance(rng, 0.7)) {
        return fixedq({
          prompt: `${n} has a ${fmtMoney(card, { wholeDollars: true })} gift card. ${n} spends ${fmtMoney(p1)} and ${fmtMoney(p2)}. Is there enough left on the card for ${an(i3[0])} that costs ${fmtMoney(p3)}?`,
          choices: ['Yes', 'No'], correct: enough ? 'Yes' : 'No',
          hint: `The balance is what is left on the card. Find it first: ${fmtMoney(card)} − ${fmtMoney(p1)} − ${fmtMoney(p2)}. Then compare the balance with ${fmtMoney(p3)}.`,
          explain: `Balance: ${fmtMoney(card)} − ${fmtMoney(p1)} − ${fmtMoney(p2)} = ${fmtMoney(bal)}. ${fmtMoney(bal)} is ${enough ? '' : 'not '}enough for ${fmtMoney(p3)}.`,
        });
      }
      const need = p3 - bal;
      return moneyq(rng, {
        prompt: `${n} has a ${fmtMoney(card, { wholeDollars: true })} gift card and spends ${fmtMoney(p1)} and ${fmtMoney(p2)}. How much more money is needed to buy ${an(i3[0])} for ${fmtMoney(p3)}?`,
        hint: `First find the balance left on the card: ${fmtMoney(card)} − ${fmtMoney(p1)} − ${fmtMoney(p2)}. Then find how far the balance is from ${fmtMoney(p3)}.`,
        explain: `Balance: ${fmtMoney(bal)}. ${fmtMoney(p3)} − ${fmtMoney(bal)} = ${fmtMoney(need)}.`,
      }, need, [need + 100, need - 100, bal, p3 - p1]);
    }
    return moneyq(rng, {
      prompt: `${n} has a ${fmtMoney(card, { wholeDollars: true })} gift card. ${n} buys ${an(i1[0])} for ${fmtMoney(p1)} and ${an(i2[0])} for ${fmtMoney(p2)}. What is the balance on the card now?`,
      hint: `The balance is the money still on the card. Add what was spent, ${fmtMoney(p1)} + ${fmtMoney(p2)}. Then subtract that total from ${fmtMoney(card)}.`,
      explain: `${fmtMoney(p1)} + ${fmtMoney(p2)} = ${fmtMoney(p1 + p2)}. ${fmtMoney(card)} − ${fmtMoney(p1 + p2)} = ${fmtMoney(bal)}.`,
    }, bal, [bal + 100, bal - 100, p1 + p2, card - p1, bal + 10]);
  }],
  [1, 4, (t, rng) => {
    if (t >= 3 && chance(rng, 0.5)) {
      const n = nm(rng), have = pick(rng, [20, 25, 30, 40]);
      const need = R(rng, 8, have - 8), w1 = R(rng, 3, have - need), w2 = R(rng, have - need + 1, have);
      const needItem = pick(rng, ['new mittens', 'school shoes', 'a bike helmet', 'a winter hat']);
      const want1 = pick(rng, ['a comic book', 'a sticker pack', 'a small toy']), want2 = pick(rng, ['a video game', 'a toy robot', 'a big puzzle']);
      return mcq(rng, {
        prompt: `${n} has $${have}. ${n} needs ${needItem} ($${need}) and wants ${want1} ($${w1}) and ${want2} ($${w2}). What is the best choice?`,
        correct: `Buy the ${needItem.replace(/^a /, '')} and ${want1}`,
        wrong: [`Buy ${want1} and ${want2}`, `Buy the ${needItem.replace(/^a /, '')} and ${want2}`, `Buy only ${want2}`],
        hint: `A need is something ${n} must have to stay healthy, warm and safe. A want is nice to have. Pay for the need first ($${have} − $${need}), then check which want still fits in the money left.`,
        explain: `Needs first: $${need} for ${needItem}. $${have} − $${need} = $${have - need} left, enough for ${want1} ($${w1}) but not ${want2} ($${w2}).`,
      });
    }
    const wantNeed = chance(rng, 0.5);
    return mcq(rng, {
      prompt: wantNeed ? 'Which of these is a need?' : 'Which of these is a want?',
      correct: pick(rng, wantNeed ? NEEDS : WANTS), wrong: sample(rng, wantNeed ? WANTS : NEEDS, 3),
      hint: 'A need is something you must have to stay healthy, warm and safe, like water or medicine. A want is nice to have, but you could live without it, like a balloon. For each choice, ask: could I live without it?',
      explain: wantNeed ? 'Needs keep you healthy, safe and warm. The others are wants.' : 'A want is nice to have but you could live without it. The others are needs.',
    });
  }],
  // ways to pay
  [2, 5, (t, rng) => {
    const WAYS = [
      ['Debit card', 'The money comes straight out of your bank account when you pay.'],
      ['Credit card', 'You pay now and pay the bank back later. It costs extra if you pay late.'],
      ['Cheque', 'You sign a paper that tells the bank to pay someone from your account.'],
      ['Cash', 'You pay with coins and bills.'],
      ['Gift card', 'Money is already loaded on it, and the balance goes down each time you use it.'],
      ['Reward points', 'You earn them when you shop, and you can use them later to pay for some things.'],
    ];
    const [way, what] = pick(rng, WAYS);
    return mcq(rng, {
      prompt: `Which way to pay is this? "${what}"`,
      correct: way, wrong: WAYS.filter((w) => w[0] !== way).map((w) => w[0]),
      hint: 'Think about where the money comes from. Cash is coins and bills. A debit card uses money in your bank account right away. A credit card borrows money you pay back later. A cheque is a signed paper. A gift card has money loaded on it. Reward points come from shopping.',
      explain: `${way}: ${what.charAt(0).toLowerCase() + what.slice(1)}`,
    });
  }],
  // compare two amounts: who has more, and by how much?
  [2, 5, (t, rng) => {
    const [a, b] = two(rng);
    const ca = R(rng, 60, t >= 4 ? 700 : 300) * 5;
    const items = coinsFor(rng, ca, 'bill20');
    if (items.length > 10) return money(t, rng);
    const d = R(rng, 1, t >= 4 ? 80 : 40) * 5, cb = chance(rng, 0.5) ? ca + d : ca - d;
    if (cb <= 0) return money(t, rng);
    const [rich, poor] = ca > cb ? [a, b] : [b, a];
    const lab = (who, c) => `${who}, by ${fmtMoney(c)}`;
    return mcq(rng, {
      prompt: `${a} has the money shown. ${b} has ${fmtMoney(cb)}. Who has more money, and how much more?`,
      visual: { type: 'coins', items },
      correct: lab(rich, d), wrong: [lab(poor, d), lab(rich, d + 100), lab(rich, Math.abs(d - 10) || d + 25), lab(rich, d + 25)],
      hint: `First count ${a}'s money, starting with the biggest bill or coin. Then compare it with ${fmtMoney(cb)}. Count up from the smaller amount to the bigger one to find the difference.`,
      explain: `${a} has ${fmtMoney(ca)} and ${b} has ${fmtMoney(cb)}. ${fmtMoney(Math.max(ca, cb))} − ${fmtMoney(Math.min(ca, cb))} = ${fmtMoney(d)}, so ${rich} has ${fmtMoney(d)} more.`,
    });
  }],
  [4, 7, (t, rng) => {
    const n = nm(rng), earn = R(rng, 3, 12) + (t >= 7 ? R(rng, 3, 8) : 0), spendW = t >= 7 ? R(rng, 2, earn - 2) : 0, s = earn - spendW, goal = R(rng, 25, 120) + (t >= 7 ? 60 : 0);
    const start = t >= 6 ? R(rng, 5, Math.floor(goal / 2)) : 0;
    const weeks = Math.ceil((goal - start) / s);
    const item = pick(rng, ['a skateboard helmet', 'a telescope', 'a guitar', 'a bike lock', 'a science kit', 'a pair of hockey skates', 'a tent', 'a drum pad']);
    return numq({
      prompt: spendW ? `${n} wants ${item} that costs $${goal}. ${n} already has $${start}. Each week ${n} earns $${earn} and spends $${spendW} of it, saving the rest. How many weeks until ${n} has enough?` : `${n} wants ${item} that costs $${goal}. ${start ? `${n} already has $${start} and` : n} saves $${s} each week. How many weeks until ${n} has enough?`,
      answer: weeks,
      hint: `${spendW ? `First find what is saved each week: $${earn} − $${spendW}. ` : ''}${start ? `Find how much more is needed: $${goal} − $${start}. Then find` : 'Find'} how many weeks of ${spendW ? 'that weekly saving' : `$${s}`} it takes to reach that amount. If it does not come out even, count one more week, because ${n} cannot buy it until there is enough.`,
      explain: `${spendW ? `Saved each week: $${earn} − $${spendW} = $${s}. ` : ''}${start ? `$${goal} − $${start} = $${goal - start}. ` : ''}$${goal - start} ÷ $${s} = ${Math.floor((goal - start) / s)}${(goal - start) % s ? ` R${(goal - start) % s}, so round up` : ''}. ${n} needs ${weeks} weeks.`,
    });
  }],
  [3, 6, (t, rng) => {
    const n = nm(rng), earn = pick(rng, [10, 15, 20, 25, 30, 40]);
    const spend = R(rng, 2, Math.floor(earn / 2)), share = R(rng, 1, Math.floor(earn / 5));
    const save = earn - spend - share;
    if (save <= 0) return money(t, rng);
    const rows = shuffle(rng, [['Spending', `$${spend}`], ['Sharing', `$${share}`], ['Saving', '?']]);
    return numq({
      prompt: `${n}'s budget uses all the money earned each week. How many dollars go to saving?`,
      visual: { type: 'table', title: `${n}'s weekly budget`, headers: ['Part', 'Amount'], rows: [['Money earned', `$${earn}`], ...rows] },
      answer: save,
      hint: `The budget uses all $${earn}, so spending + sharing + saving = $${earn}. Add the spending and sharing amounts, then take that away from $${earn}.`,
      explain: `$${spend} + $${share} = $${spend + share}. $${earn} − $${spend + share} = $${save} for saving.`,
    });
  }],
  [5, 7, (t, rng) => {
    const n = nm(rng), have = t >= 7 ? pick(rng, [5000, 7500, 10000]) : pick(rng, [2000, 3000, 4000, 5000]);
    const [i1, i2, i3] = sample(rng, ITEMS, 3);
    const p1 = price(rng, i1, false), p2 = price(rng, i2, false), p3 = t >= 7 ? price(rng, i3, false) : 0;
    const spent = p1 + p2 + p3;
    if (spent >= have) return money(t, rng);
    const left = have - spent;
    const list = p3 ? `${an(i1[0])} for ${fmtMoney(p1)}, ${an(i2[0])} for ${fmtMoney(p2)} and ${an(i3[0])} for ${fmtMoney(p3)}` : `${an(i1[0])} for ${fmtMoney(p1)} and ${an(i2[0])} for ${fmtMoney(p2)}`;
    const sumTxt = p3 ? `${fmtMoney(p1)} + ${fmtMoney(p2)} + ${fmtMoney(p3)}` : `${fmtMoney(p1)} + ${fmtMoney(p2)}`;
    return moneyq(rng, {
      prompt: `${n} has ${fmtMoney(have, { wholeDollars: true })}. ${n} buys ${list}. How much money is left?`,
      hint: `There are two steps. First add the prices: ${sumTxt}. Then subtract that total from ${fmtMoney(have, { wholeDollars: true })}.`,
      explain: `${sumTxt} = ${fmtMoney(spent)}. ${fmtMoney(have)} − ${fmtMoney(spent)} = ${fmtMoney(left)}.`,
    }, left, [left + 100, left - 100, spent, have - p1]);
  }],
  [6, 7, (t, rng) => {
    const thing = pick(rng, ['granola bars', 'juice boxes', 'notebooks', 'muffins', 'apples', 'smoothies']);
    if (t === 7 && chance(rng, 0.6)) {
      const a = R(rng, 2, 5), pa = R(rng, 40, 200) * 5, pb = 2 * pa + pick(rng, [-50, -25, -15, 15, 25, 50]);
      const small = `${a} for ${fmtMoney(pa)}`, bigP = `${2 * a} for ${fmtMoney(pb)}`;
      const correct = 2 * pa < pb ? small : bigP;
      return fixedq({
        prompt: `Which is the better buy for ${thing}?`, choices: [small, bigP, 'They cost the same'], correct,
        hint: `The big pack has twice as many ${thing} (${2 * a}) as the small pack (${a}). Find the cost of two small packs: 2 × ${fmtMoney(pa)}. Compare that with ${fmtMoney(pb)}.`,
        explain: `Two small packs give ${2 * a} ${thing} for 2 × ${fmtMoney(pa)} = ${fmtMoney(2 * pa)}. The big pack costs ${fmtMoney(pb)}. So ${correct} is the better buy.`,
      });
    }
    const k = pick(rng, [2, 3, 4, 5]), unit = R(rng, 5, 60) * 5;
    const pack = k * unit + pick(rng, [-5, -10, -15, 10, 15, 0]) * k;
    const each = unit;
    const per = pack / k;
    const correct = per < each ? `${k} for ${fmtMoney(pack)}` : per > each ? `${fmtMoney(each)} each` : 'They cost the same';
    return fixedq({
      prompt: `Which is the better buy for ${thing}?`,
      choices: [`${k} for ${fmtMoney(pack)}`, `${fmtMoney(each)} each`, 'They cost the same'], correct,
      hint: `To compare fairly, find what ${k} would cost at ${fmtMoney(each)} each (${k} × ${fmtMoney(each)}). Compare that with the pack price, ${fmtMoney(pack)}. The lower price for the same number of ${thing} is the better buy.`,
      explain: `${k} at ${fmtMoney(each)} each costs ${fmtMoney(each * k)}. The pack costs ${fmtMoney(pack)}. ${correct === 'They cost the same' ? 'They are the same.' : `So ${correct} is the better buy.`}`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// Classic: decimals to thousandths
// ---------------------------------------------------------------------------
const PV_DEC = ['Ones', 'Tenths', 'Hundredths', 'Thousandths'];
const thou = (rng, whole = 9) => clean(R(rng, 0, whole) + R(rng, 1, 999) / 1000);
const decDigits = (x) => { const s = x.toFixed(3); return [Number(s.split('.')[0]), ...s.split('.')[1].split('').map(Number)]; };
const DEC_PLACE = ['tenths', 'hundredths', 'thousandths'];

const thousandths = gen([
  [1, 3, (t, rng) => {
    const x = thou(rng, t === 1 ? 0 : 9), d = decDigits(x);
    const wrong = [clean(x * 10), clean(x / 10), clean(d[0] + (d[3] * 100 + d[2] * 10 + d[1]) / 1000), clean(x + 0.01), clean(x + 0.1)]
      .filter((y) => y !== x && decPlaces(y) <= 4);
    return mcq(rng, {
      prompt: 'What decimal is shown in the place-value chart?',
      visual: { type: 'placevalue', columns: PV_DEC, digits: d },
      correct: x, wrong, format: dn,
      hint: 'Write the ones digit, then a decimal point, then the tenths, hundredths and thousandths digits in order. A 0 in a column still holds its place, so do not skip it.',
      explain: `${d[0]} one${d[0] === 1 ? '' : 's'}, ${d[1]} tenth${d[1] === 1 ? '' : 's'}, ${d[2]} hundredth${d[2] === 1 ? '' : 's'} and ${d[3]} thousandth${d[3] === 1 ? '' : 's'} is ${x.toFixed(3)}.`,
    });
  }],
  [1, 4, (t, rng) => {
    const x = thou(rng), d = decDigits(x);
    const idx = [1, 2, 3].filter((i) => d[i] !== 0 && d.indexOf(d[i], 1) === d.lastIndexOf(d[i]));
    if (!idx.length) return thousandths(t, rng);
    const i = pick(rng, idx), val = clean(d[i] / 10 ** i);
    return mcq(rng, {
      prompt: `What is the value of the digit ${d[i]} in ${x.toFixed(3)}?`,
      visual: t <= 2 ? { type: 'placevalue', columns: PV_DEC, digits: d } : undefined,
      correct: val, wrong: [clean(val * 10), clean(val / 10), d[i], clean(val * 100), clean(val / 100)].filter((v) => v !== val && decPlaces(v) <= 4), format: dn,
      hint: `Find where the ${d[i]} is in ${x.toFixed(3)}. The first place after the point is tenths, the second is hundredths and the third is thousandths. The digit is worth that many tenths, hundredths or thousandths.`,
      explain: `The ${d[i]} is in the ${DEC_PLACE[i - 1]} place, so it is worth ${dn(val)}.`,
    });
  }],
  [2, 5, (t, rng) => {
    const n = t <= 2 ? R(rng, 101, 999) : pick(rng, [R(rng, 1, 9), R(rng, 11, 99), R(rng, 101, 999)]);
    const w = t >= 4 && chance(rng, 0.4) ? R(rng, 1, 5) : 0;
    const x = clean(w + n / 1000);
    if (chance(rng, 0.5)) {
      return numq({
        prompt: `Write ${w ? mixed(w, n, 1000) : frac(n, 1000)} as a decimal.`, answer: x,
        hint: `The fraction counts ${fmtNum(n)} thousandths, and thousandths use 3 places after the decimal point. Write ${fmtNum(n)} so it ends in the thousandths place, adding zeros right after the point if it is short.${w ? ` Put ${w} before the point.` : ''}`,
        explain: `${w ? mixed(w, n, 1000) : frac(n, 1000)} = ${x.toFixed(3)}.`,
      });
    }
    const tok = (a, b) => (w ? mixed(w, a, b) : frac(a, b));
    const wrong = [[n, 100], [n, 10000], [n * 10, 1000], [Math.floor(n / 10) || 1, 1000]].filter(([a, b]) => a < b && Math.abs(a / b - n / 1000) > 1e-12);
    return mcq(rng, {
      prompt: `Which fraction is equal to ${x.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}?`,
      correct: [n, 1000], wrong, format: ([a, b]) => tok(a, b),
      hint: 'Count the digits after the decimal point: 1 digit means tenths (10 on the bottom), 2 digits means hundredths (100), and 3 digits means thousandths (1000). Check the top and bottom of each choice.',
      explain: `${dn(x)} is read as ${w ? numWords(w) + ' and ' : ''}${fracSay(n, 1000)}, which is ${tok(n, 1000)}.`,
    });
  }],
  [2, 5, (t, rng) => {
    if (chance(rng, 0.5)) {
      const x = clean(R(rng, 1, 9) / 10 + (chance(rng, 0.5) ? R(rng, 1, 9) / 100 : 0));
      return numq({
        prompt: `${dn(x)} = □ thousandths. What number goes in the box?`, answer: Math.round(x * 1000),
        hint: `Each tenth is 10 hundredths, and each hundredth is 10 thousandths. Write ${dn(x)} with 3 decimal places by adding zeros at the end. Then read the digits after the point as one number.`,
        explain: `${dn(x)} = ${x.toFixed(3)} = ${Math.round(x * 1000)} thousandths.`,
      });
    }
    const x = clean(R(rng, 1, 9) / 10 + (chance(rng, 0.4) ? R(rng, 0, 9) : 0));
    const s = x.toFixed(3);
    return mcq(rng, {
      prompt: `Which decimal is equal to ${dn(x)}?`,
      correct: s, wrong: [clean(x / 100).toFixed(3), clean(x / 10).toFixed(3), clean(x * 10).toFixed(2), clean(x + 0.001).toFixed(3)].filter((y) => y !== s),
      hint: `Adding zeros at the END of a decimal does not change its value (2.3 = 2.30). Adding zeros right after the point does change it. Check each choice: is it ${dn(x)} with only zeros added at the end?`,
      explain: `${dn(x)} = ${s}. The zeros at the end just show hundredths and thousandths.`,
    });
  }],
  [2, 7, (t, rng) => {
    const pairs = [
      () => { const a = R(rng, 1, 9); return [clean(a / 10 + R(rng, 1, 9) / 100), clean(a / 10 + R(rng, 1, 9) / 1000)]; },
      () => { const a = clean(R(rng, 2, 9) / 10); return [a, clean(a - 0.001)]; },
      () => { const a = clean(R(rng, 1, 9) + R(rng, 1, 9) / 10); return [a, clean(a - 0.1 + R(rng, 50, 99) / 1000)]; },
      () => { const a = clean(R(rng, 1, 9) / 10); return [a, a]; },
      () => { const a = clean(R(rng, 10, 99) / 100); return [a, clean(a + R(rng, 1, 9) / 1000)]; },
    ];
    const [a, b] = pick(rng, pairs)();
    const sa = dn(a), sb = a === b ? a.toFixed(3) : dn(b);
    const [x, y] = chance(rng, 0.5) ? [sa, sb] : [sb, sa];
    const correct = a === b ? 'They are equal' : Number(x) > Number(y) ? x : y;
    return fixedq({
      prompt: `Which is greater: ${x} or ${y}?`, choices: [x, y, 'They are equal'], correct,
      hint: `Is ${x} or ${y} bigger, or are they equal? Write both with 3 decimal places by adding zeros at the end. Then compare the tenths, then the hundredths, then the thousandths.`,
      explain: a === b ? `${x} and ${y} are the same amount.` : `As thousandths: ${Number(x).toFixed(3)} and ${Number(y).toFixed(3)}. ${correct} is greater.`,
    });
  }],
  [4, 7, (t, rng) => {
    const base = clean(R(rng, 1, 9) / 10);
    const vals = [...new Set([base, clean(base + R(rng, 1, 9) / 100), clean(base + R(rng, 1, 9) / 1000), clean(base - 0.1 + R(rng, 10, 99) / 1000), ...(t >= 6 ? [clean(base + 0.1)] : [])])]
      .filter((v) => v > 0).slice(0, t >= 6 ? 4 : 3);
    if (vals.length < 3) return thousandths(t, rng);
    const up = chance(rng, 0.5);
    const sorted = vals.slice().sort((a, b) => (up ? a - b : b - a));
    const f = (arr) => arr.map(dn).join(', ');
    const byLen = vals.slice().sort((a, b) => dn(a).length - dn(b).length || a - b);
    return mcq(rng, {
      prompt: `Which list is in order from ${up ? 'least to greatest' : 'greatest to least'}?`,
      correct: f(sorted), wrong: [f(sorted.slice().reverse()), f([sorted[1], sorted[0], ...sorted.slice(2)]), f(byLen), f(byLen.slice().reverse())].filter((s) => s !== f(sorted)),
      hint: 'Write every number with 3 decimal places by adding zeros at the end. Then compare them digit by digit from the left, and check which list keeps them in order.',
      explain: `With 3 places: ${sorted.map((v) => v.toFixed(3)).join(', ')}. So the order is ${f(sorted)}.`,
    });
  }],
  [3, 5, (t, rng) => {
    const min = clean(R(rng, 1, 99) / 100), k = R(rng, 1, 9), v = clean(min + k / 1000);
    return mcq(rng, {
      prompt: 'What decimal is the arrow pointing to?',
      visual: { type: 'numberline', min, max: clean(min + 0.01), ticks: 0.001, labels: 'ends', labelFormat: 'decimal', arrow: v },
      correct: v, wrong: [clean(v + 0.001), clean(v - 0.001), clean(min + k / 100), clean(min + k / 10000)].filter((x) => x !== v && x > 0), format: dn,
      hint: `From ${dn(min)} to ${dn(clean(min + 0.01))} there are 10 jumps, so each jump is one thousandth (0.001). Start at ${dn(min)} and count the jumps to the arrow.`,
      explain: `Each tick is 0.001. The arrow is ${k} ticks past ${dn(min)}: ${dn(v)}.`,
    });
  }],
  [2, 7, (t, rng) => {
    let a, b;
    if (t === 2) { a = clean(R(rng, 1, 999) / 1000); b = clean(R(rng, 1, 9) / 10); }
    else if (t === 3) { a = thou(rng); b = clean(R(rng, 1, 9) + R(rng, 1, 99) / 100); }
    else if (t <= 5) { a = clean(R(rng, 2, 20) + R(rng, 0, 9) / 10); b = thou(rng, Math.max(1, Math.floor(a) - 1)); }
    else { a = R(rng, 5, 20); b = thou(rng, a - 1); }
    const sub = t >= 4 ? (a > b && chance(rng, 0.6)) : chance(rng, 0.4) && a > b;
    if (t >= 6 && !sub) a = clean(a + R(rng, 1, 99) / 100); // adding a plain whole number would be too easy at the top tiers
    const [x, y] = !sub && chance(rng, 0.5) ? [b, a] : [a, b];
    const ans = clean(sub ? a - b : a + b);
    const slip = sub ? null : misalignAdd(x, y);
    const ctx = t >= 5 && chance(rng, 0.5)
      ? pick(rng, sub ? [`A bag of flour has a mass of ${dn(a)} kg. ${nm(rng)} uses ${dn(b)} kg. How much is left?`, `A ribbon is ${dn(a)} m long. ${dn(b)} m is cut off. How much is left?`]
        : [`A strawberry has a mass of ${dn(x)} kg and a lemon has a mass of ${dn(y)} kg. What is their total mass?`, `${nm(rng)} ran ${dn(x)} km and then ${dn(y)} km. How far is that?`])
      : `${dn(x)} ${sub ? '−' : '+'} ${dn(y)} = ?`;
    return decq(rng, {
      prompt: ctx, answer: ans, forceMc: slip != null && chance(rng, 0.4),
      hint: `${sub ? 'Take away' : 'Join'} the two numbers with their decimal points lined up (not their last digits). Write zeros at the end so both have 3 decimal places. Then work column by column from the right.`,
      explain: `${dn(x)} ${sub ? '−' : '+'} ${dn(y)} = ${dn(ans)}.`,
    }, 3, slip != null ? [slip] : [clean(ans + 0.01)], 3);
  }],
  [3, 5, (t, rng) => {
    const w = R(rng, 1, 9), n = pick(rng, [R(rng, 1, 9), R(rng, 11, 99), R(rng, 101, 999)]);
    const x = clean(w + n / 1000);
    const words = `${numWords(w)} and ${fracSay(n, 1000)}`;
    return mcq(rng, {
      prompt: `Which decimal is "${words}"?`,
      correct: x.toFixed(3), wrong: [clean(w + n / 100).toFixed(n < 100 ? 2 : 3), clean(w + n / 10000).toFixed(4), String(w * 1000 + n), clean(w + (n % 10) / 10 + Math.floor(n / 10) / 1000).toFixed(3)]
        .filter((s) => s !== x.toFixed(3) && !/NaN/.test(s)),
      hint: `In "${words}", the word "and" is the decimal point. Thousandths need exactly 3 digits after the point, so if the number after "and" is small, fill the empty places right after the point with zeros.`,
      explain: `"${words}" = ${x.toFixed(3)}.`,
    });
  }],
  [4, 5, (t, rng) => {
    const w = R(rng, 0, 3), x = clean(w + R(rng, 1, 999) / 1000);
    const bms = [w, w + 0.5, w + 1];
    const near = bms.reduce((b, y) => (Math.abs(y - x) < Math.abs(b - x) ? y : b));
    if (Math.abs(Math.abs(near - x) - 0.25) < 0.002) return thousandths(t, rng);
    return fixedq({
      prompt: `Which benchmark is ${x.toFixed(3)} closest to?`, choices: bms.map(dn), correct: dn(near),
      hint: `Which is closest to ${x.toFixed(3)}: ${dn(w)}, ${dn(w + 0.5)} or ${dn(w + 1)}? The halfway points between them are ${(w + 0.25).toFixed(2)} and ${(w + 0.75).toFixed(2)}. Compare ${x.toFixed(3)} with those halfway points.`,
      explain: `${x.toFixed(3)} is ${Math.abs(near - x).toFixed(3)} away from ${dn(near)}, the closest benchmark.`,
    });
  }],
  // two-step and missing-number problems with thousandths
  [6, 7, (t, rng) => {
    if (chance(rng, 0.4)) {
      const whole = R(rng, 2, 12), b = clean(R(rng, 1, whole - 1) + R(rng, 1, 999) / 1000);
      const ans = clean(whole - b);
      return decq(rng, {
        prompt: `□ + ${dn(b)} = ${whole}. What number goes in the box?`, answer: ans,
        hint: `What do you add to ${dn(b)} to make ${whole}? Subtract ${dn(b)} from ${whole}, writing ${whole} as ${whole}.000 so the decimal points line up.`,
        explain: `${whole} − ${dn(b)} = ${dn(ans)}. Check: ${dn(ans)} + ${dn(b)} = ${whole}.`,
      }, 3, [clean(ans + 0.01), clean(ans - 0.1), clean(whole - 1 - b)], 3);
    }
    const a = clean(R(rng, 2, 9) + R(rng, 1, 999) / 1000), b = clean(R(rng, 1, 9) + R(rng, 1, 99) / 100), c = clean(R(rng, 0, 2) + R(rng, 1, 999) / 1000);
    const ans = clean(a + b - c);
    const n = nm(rng);
    return decq(rng, {
      prompt: t >= 7 ? `${n} has ${dn(a)} kg of clay and buys ${dn(b)} kg more. Then ${n} uses ${dn(c)} kg for a model dragon. How many kilograms are left?` : `${dn(a)} + ${dn(b)} − ${dn(c)} = ?`,
      answer: ans,
      hint: `There are two steps: first add ${dn(a)} + ${dn(b)}, then subtract ${dn(c)}. Line up the decimal points each time, and write zeros so every number has three decimal places.`,
      explain: `${dn(a)} + ${dn(b)} = ${dn(a + b)}. ${dn(a + b)} − ${dn(c)} = ${dn(ans)}.`,
    }, 3, [clean(a + b + c), clean(a - b + c)], 3);
  }],
]);

// ---------------------------------------------------------------------------
// Classic: quadrilaterals; parallel and perpendicular lines
// ---------------------------------------------------------------------------
const QUADS = ['square', 'rectangle', 'rhombus', 'parallelogram', 'trapezoid', 'kite'];
const QNAME = (s) => cap(s);
// properties (inclusive definitions)
const QP = {
  square: { ra: true, eq: true, two: true, one: false, opp: true },
  rectangle: { ra: true, eq: false, two: true, one: false, opp: true },
  rhombus: { ra: false, eq: true, two: true, one: false, opp: true },
  parallelogram: { ra: false, eq: false, two: true, one: false, opp: true },
  trapezoid: { ra: false, eq: false, two: false, one: true, opp: false },
  kite: { ra: false, eq: false, two: false, one: false, opp: false },
};
const PROP_LAB = { ra: '4 right angles', eq: '4 equal sides', two: '2 pairs of parallel sides', one: 'Exactly 1 pair of parallel sides', opp: 'Opposite sides equal' };
const PAR_PAIRS = { square: 2, rectangle: 2, rhombus: 2, parallelogram: 2, trapezoid: 1, kite: 0 };
// Names that are also correct for a shape (inclusive), so never use them as distractors.
const ALSO = { square: ['rectangle', 'rhombus', 'parallelogram'], rectangle: ['parallelogram'], rhombus: ['parallelogram'], parallelogram: [], trapezoid: [], kite: [] };
const quadVis = (rng, s) => ({ type: 'shapes', items: [{ shape: s, color: pick(rng, COLOURS), rotate: pick(rng, [0, 0, 15, 30, 45, 90, 150, 200]), size: 'l', pattern: pick(rng, ['solid', 'stripes', 'dots']) }] });
const QUAD_OPTS = 'Square = 4 equal sides and 4 right angles; rectangle = 4 right angles; rhombus = 4 equal sides; parallelogram = 2 pairs of parallel sides; trapezoid = exactly 1 pair of parallel sides; kite = no parallel sides, with 2 pairs of equal sides that touch.';
const RIDDLES = [
  ['I have exactly one pair of parallel sides.', 'trapezoid'],
  ['I have 4 right angles and opposite sides equal, but not all 4 sides are equal.', 'rectangle'],
  ['I have 4 equal sides but no right angles.', 'rhombus'],
  ['I have 2 pairs of parallel sides, no right angles, and not all sides equal.', 'parallelogram'],
  ['I have 4 equal sides and 4 right angles.', 'square'],
  ['I have no parallel sides, and two pairs of equal sides that touch each other.', 'kite'],
];
const LINE_THINGS = [
  ['the two rails of a straight train track', 'parallel'], ['the lines on writing paper', 'parallel'], ['the top and bottom edges of a door', 'parallel'],
  ['two edges that meet at the corner of a book', 'perpendicular'], ['a flagpole and the flat ground', 'perpendicular'], ['the edges at the corner of a window', 'perpendicular'],
  ['the two blades of open scissors', 'intersecting, not perpendicular'], ['the two sides of the letter V', 'intersecting, not perpendicular'],
];

const quads = gen([
  [1, 3, (t, rng) => {
    const s = pick(rng, QUADS);
    const wrong = QUADS.filter((q) => q !== s && !ALSO[s].includes(q)).map(QNAME);
    return mcq(rng, {
      prompt: 'What is the best name for this quadrilateral?', visual: quadVis(rng, s),
      correct: QNAME(s), wrong,
      hint: `${QUAD_OPTS} Look at this shape's sides and corners, and pick the most exact name.`,
      explain: `It is a ${s}: ${Object.keys(QP[s]).filter((k) => QP[s][k]).map((k) => PROP_LAB[k].toLowerCase()).join(', ') || 'it has no parallel sides'}.`,
    });
  }],
  [1, 4, (t, rng) => {
    const [clue, s] = pick(rng, RIDDLES);
    const wrong = QUADS.filter((q) => q !== s && !ALSO[s].includes(q)).map(QNAME);
    return mcq(rng, {
      prompt: `${clue} What is my best name?`, visual: t <= 2 ? quadVis(rng, s) : undefined,
      correct: QNAME(s), wrong,
      hint: `${QUAD_OPTS} Check every clue against each choice, and pick the most exact name.`,
      explain: `A ${s} fits every clue.`,
    });
  }],
  [2, 5, (t, rng) => {
    const qs = [['has exactly one pair of parallel sides', (s) => s === 'trapezoid'], ['has 4 right angles but not 4 equal sides', (s) => s === 'rectangle'],
      ['has no parallel sides', (s) => s === 'kite'], ['has 4 equal sides but no right angles', (s) => s === 'rhombus'], ['has 4 equal sides and 4 right angles', (s) => s === 'square']];
    const [q, ok] = pick(rng, qs);
    const right = QUADS.find(ok);
    const others = sample(rng, QUADS.filter((s) => !ok(s)), 3);
    const items = [right, ...others].map((s) => ({ visual: quadVis(rng, s), correct: ok(s) }));
    return {
      kind: 'mc', prompt: `Which shape ${q}?`, ...mcVisual(rng, items),
      hint: `Check each shape against the clue: it ${q}. Parallel sides go the same way and never meet. A right angle is a square corner.`,
      explain: `The ${right} ${q}.`,
    };
  }],
  [2, 5, (t, rng) => {
    const s = pick(rng, QUADS);
    if (chance(rng, 0.5) && ['square', 'rectangle', 'rhombus', 'parallelogram'].includes(s)) {
      const ra = QP[s].ra ? 4 : 0;
      return numq({
        prompt: `How many right angles does this ${s} have?`, visual: quadVis(rng, s), answer: ra,
        hint: `A right angle is a square corner, like the corner of a page. Look at each corner of this ${s}: is it square, or is it pointy or wide?`,
        explain: `This ${s} has ${ra} right angles.`,
      });
    }
    return numq({
      prompt: `How many pairs of parallel sides does a ${s} have?`, visual: quadVis(rng, s), answer: PAR_PAIRS[s],
      hint: `Parallel sides go the same way and never meet, like train tracks. Look at the ${s}: check the top and bottom sides as a pair, then the left and right sides. Is each pair parallel?`,
      explain: `A ${s} has ${PAR_PAIRS[s]} pair${PAR_PAIRS[s] === 1 ? '' : 's'} of parallel sides.`,
    });
  }],
  [4, 7, (t, rng) => {
    const keys = ['ra', 'eq', 'two', 'one', 'opp'];
    let [L, Rr] = sample(rng, keys, 2);
    const bad = (x, y) => [x, y].sort().join() === 'one,two' || [x, y].sort().join() === 'opp,two';
    while (bad(L, Rr)) [L, Rr] = sample(rng, keys, 2);
    const s = pick(rng, QUADS);
    const inL = QP[s][L], inR = QP[s][Rr];
    const where = inL && inR ? 'In both circles' : inL ? 'Left circle only' : inR ? 'Right circle only' : 'Outside both circles';
    const others = QUADS.filter((q) => q !== s);
    const place = (q) => (QP[q][L] && QP[q][Rr] ? 'both' : QP[q][L] ? 'left' : QP[q][Rr] ? 'right' : 'outside');
    const shown = sample(rng, others, 2);
    return fixedq({
      prompt: `Where does a ${s} go in this Venn diagram?`,
      visual: { type: 'venn', leftLabel: PROP_LAB[L], rightLabel: PROP_LAB[Rr], left: shown.filter((q) => place(q) === 'left').map(QNAME), both: shown.filter((q) => place(q) === 'both').map(QNAME), right: shown.filter((q) => place(q) === 'right').map(QNAME) },
      choices: ['Left circle only', 'Right circle only', 'In both circles', 'Outside both circles'], correct: where,
      hint: `The left circle is for shapes with ${PROP_LAB[L].toLowerCase()}, and the right circle is for shapes with ${PROP_LAB[Rr].toLowerCase()}. A shape with both goes in the middle, and a shape with neither goes outside. Does a ${s} have the first property? Does it have the second?`,
      explain: `A ${s} ${inL ? 'has' : 'does not have'} ${PROP_LAB[L].toLowerCase()} and ${inR ? 'has' : 'does not have'} ${PROP_LAB[Rr].toLowerCase()}, so it goes ${where === 'Outside both circles' ? 'outside both circles' : where === 'In both circles' ? 'in both circles' : `in the ${where.toLowerCase()}`}.`,
    });
  }],
  [5, 7, (t, rng) => {
    const T = ['Every square is a rectangle.', 'Every square is a rhombus.', 'A rectangle has 2 pairs of parallel sides.', 'A rhombus has 4 equal sides.', 'Every rectangle is a parallelogram.', 'A trapezoid has exactly 1 pair of parallel sides.', 'Every rhombus is a parallelogram.'];
    const Fs = ['Every rectangle is a square.', 'Every parallelogram is a rectangle.', 'A trapezoid has 2 pairs of parallel sides.', 'Every rhombus is a square.', 'Every parallelogram has 4 right angles.', 'A kite has 2 pairs of parallel sides.', 'Every trapezoid is a parallelogram.'];
    const findTrue = chance(rng, 0.6);
    const c = pick(rng, findTrue ? T : Fs);
    return mcq(rng, {
      prompt: findTrue ? 'Which statement is true?' : 'Which statement is NOT true?',
      correct: c, wrong: sample(rng, findTrue ? Fs : T, 3),
      hint: `"Every A is a B" is true only if every A has ALL the properties of a B. ${QUAD_OPTS}`,
      explain: `"${c}" is ${findTrue ? 'true' : 'not true'}.`,
    });
  }],
  [3, 6, (t, rng) => {
    // right trapezoid ABCD on a grid: AB and DC horizontal, AD vertical, BC slanted
    const x0 = R(rng, 1, 3), y0 = R(rng, 1, 3), w = R(rng, 4, 6), h = R(rng, 3, 5), sh = pick(rng, [-2, -1, 1, 2]);
    let pts = [[x0, y0], [x0 + w, y0], [x0 + w + sh, y0 + h], [x0, y0 + h]];
    if (chance(rng, 0.5)) pts = pts.map(([x, y]) => [x0 * 2 + w - x, y]);
    const L = ['A', 'B', 'C', 'D'];
    const q = R(rng, 0, 3);
    const visual = { type: 'coordplane', max: 10, polygon: pts, points: pts.map(([x, y], i) => ({ x, y, label: L[i] })) };
    const sides = ['side AB', 'side BC', 'side CD', 'side DA'];
    if (q === 0) return fixedq({ prompt: 'Which side is parallel to side AB?', visual, choices: ['side BC', 'side CD', 'side DA'], correct: 'side CD', hint: 'Parallel sides point in the same direction and never meet, like train tracks. Is side AB flat, straight up, or leaning? Find the other side that goes exactly the same way.', explain: 'AB and CD are both horizontal, so they are parallel.' });
    if (q === 1) return fixedq({ prompt: 'Which side is perpendicular to side AB?', visual, choices: ['side BC', 'side CD', 'side DA'], correct: 'side DA', hint: 'Perpendicular sides meet at a square corner (a right angle), like the corner of a page. Side AB is flat. Check each other side: which one makes a square corner with AB?', explain: 'DA is vertical and AB is horizontal, so they meet at a right angle.' });
    if (q === 2) return fixedq({ prompt: 'Which side is vertical?', visual, choices: sides, correct: 'side DA', hint: 'Vertical means straight up and down, like a flagpole. Horizontal means flat, like the floor. Check each side: is it flat, leaning, or straight up and down?', explain: 'Side DA goes straight up and down, so it is vertical.' });
    return fixedq({ prompt: 'Which side is NOT parallel or perpendicular to any other side?', visual, choices: sides, correct: 'side BC', hint: 'Parallel sides go the same way, and perpendicular sides meet at a square corner. A leaning (slanted) side is often neither. Check each side: is it flat, straight up and down, or leaning?', explain: 'BC is slanted. It is not parallel to any side and does not make a right angle with AB or CD.' });
  }],
  [4, 6, (t, rng) => {
    if (chance(rng, 0.5)) {
      const h = pick(rng, [1, 2, 3, 4, 5, 7, 8, 9, 10, 11]);
      const ang = Math.min(30 * h, 360 - 30 * h);
      const correct = ang === 90 ? 'perpendicular' : 'intersecting, not perpendicular';
      return fixedq({
        prompt: `At ${h}:00, the hands of the clock are…`, visual: { type: 'clock', hour: h, minute: 0 },
        choices: ['parallel', 'perpendicular', 'intersecting, not perpendicular'], correct,
        hint: `Parallel lines never meet. Perpendicular lines meet at a square corner. "Intersecting, not perpendicular" means they cross at some other angle. At ${h}:00, do the two hands make a square corner?`,
        explain: ang === 90 ? `At ${h}:00 the hands make a square corner, so they are perpendicular.` : `At ${h}:00 the hands meet but not at a square corner, so they are intersecting but not perpendicular.`,
      });
    }
    const [thing, ans] = pick(rng, LINE_THINGS);
    return fixedq({
      prompt: `Think of ${thing}. The lines are…`, choices: ['parallel', 'perpendicular', 'intersecting, not perpendicular'], correct: ans,
      hint: `Picture ${thing}. Parallel lines go the same way and never meet. Perpendicular lines meet at a square corner. "Intersecting, not perpendicular" lines cross at some other angle.`,
      explain: `${cap(thing)} are ${ans}.`,
    });
  }],
  [5, 7, (t, rng) => {
    // name a quadrilateral drawn from exact grid points
    const s = pick(rng, QUADS);
    const x = R(rng, 1, 3), y = R(rng, 1, 3);
    let pts;
    if (s === 'square') { const a = R(rng, 2, 5); pts = [[x, y], [x + a, y], [x + a, y + a], [x, y + a]]; }
    else if (s === 'rectangle') { const w = R(rng, 3, 6), h = pick(rng, [R(rng, 1, w - 1), R(rng, w + 1, 7)].filter((v) => v >= 1 && v !== w)); pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
    else if (s === 'rhombus') { const a = R(rng, 1, 2), b = a + R(rng, 1, 2); pts = [[x, y + a], [x + b, y], [x + a + b, y + b], [x + a, y + a + b]]; }
    else if (s === 'parallelogram') { const w = R(rng, 3, 5), h = R(rng, 2, 4), sh = pick(rng, [1, 2, 3].filter((v) => v * v + h * h !== w * w)); pts = [[x, y], [x + w, y], [x + w + sh, y + h], [x + sh, y + h]]; }
    else if (s === 'trapezoid') { const w = R(rng, 4, 6), h = R(rng, 2, 4), a = R(rng, 0, 2), b = R(rng, 1, 2); pts = [[x, y], [x + w, y], [x + w - a, y + h], [x + b, y + h]]; }
    else { const a = R(rng, 2, 3), b = R(rng, 1, 2), c = b + R(rng, 2, 3); pts = [[x + a, y], [x + 2 * a, y + b], [x + a, y + c], [x, y + b]]; }
    const wrong = QUADS.filter((q) => q !== s && !ALSO[s].includes(q)).map(QNAME);
    return mcq(rng, {
      prompt: 'The points are joined to make a quadrilateral. What is its best name?',
      visual: { type: 'coordplane', max: 10, polygon: pts },
      correct: QNAME(s), wrong,
      hint: `${QUAD_OPTS} Count grid squares to compare the side lengths, check which sides are parallel, and check whether the corners are square.`,
      explain: `This shape is a ${s}: ${Object.keys(QP[s]).filter((k) => QP[s][k]).map((k) => PROP_LAB[k].toLowerCase()).join(', ') || 'it has no parallel sides'}.`,
    });
  }],
  [5, 5, (t, rng) => {
    const [solid, faces, pairs] = pick(rng, [['rect_prism', 'rectangular prism', 3], ['cube', 'cube', 3], ['tri_prism', 'triangular prism', 1]]);
    return numq({
      prompt: `How many pairs of parallel faces does a ${faces} have?`, visual: { type: 'solids', items: [{ solid, color: pick(rng, COLOURS) }] },
      answer: pairs,
      hint: `Parallel faces are opposite each other and never meet, like the floor and ceiling of a room. For a ${faces}, count the faces that come in opposite pairs.`,
      explain: `A ${faces} has ${pairs} pair${pairs === 1 ? '' : 's'} of parallel faces.`,
    });
  }],
  // using quadrilateral properties to find sides and perimeters
  [6, 7, (t, rng) => {
    const u = pick(rng, ['cm', 'm']), k = R(rng, 0, 2);
    if (k === 0) {
      const s = R(rng, 3, 25);
      return numq({
        prompt: `A rhombus has a perimeter of ${4 * s} ${u}. How long is each side?`, answer: s,
        visual: { type: 'shapes', items: [{ shape: 'rhombus', color: pick(rng, COLOURS), size: 'l' }] },
        hint: 'All four sides of a rhombus are the same length. Share the perimeter equally among the four sides.',
        explain: `${4 * s} ÷ 4 = ${s} ${u}.`,
      });
    }
    if (k === 1) {
      const a = R(rng, 4, 20), b = R(rng, 2, a - 1);
      return numq({
        prompt: `A parallelogram has one side of ${a} ${u} and a shorter side of ${b} ${u}. What is its perimeter?`, answer: 2 * (a + b),
        visual: { type: 'shapes', items: [{ shape: 'parallelogram', color: pick(rng, COLOURS), size: 'l' }] },
        hint: 'Opposite sides of a parallelogram are equal, so it has two sides of each length. Add all four sides.',
        explain: `${a} + ${b} + ${a} + ${b} = ${2 * (a + b)} ${u}.`,
      });
    }
    const a = R(rng, 5, 20), b = R(rng, 2, a - 1), P = 2 * (a + b);
    return numq({
      prompt: `A rectangle has a perimeter of ${P} ${u}. One side is ${a} ${u}. How long is the side next to it?`, answer: b,
      hint: `Opposite sides of a rectangle are equal, so half the perimeter is one long side plus one short side. Find half of ${P}, then take away ${a}.`,
      explain: `Half of ${P} is ${a + b}. ${a + b} − ${a} = ${b} ${u}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// Skill list
// ---------------------------------------------------------------------------
export const skills = [
  { id: 'g5-qpv-represent', grade: 5, strand: 'number', bigIdea: 'qpv', species: 'numberling', name: 'Numbers to 1 000 000', classic: false,
    parentDesc: 'Read, write, rename and compare whole numbers to 1 000 000; value of a digit; place numbers on a number line using benchmarks.', gen: represent },
  { id: 'g5-qpv-fracdec', grade: 5, strand: 'number', bigIdea: 'qpv', species: 'fractling', name: 'Fractions and Decimals', classic: false,
    parentDesc: 'Improper fractions and mixed numbers, equivalent fractions and simplest form, decimals to hundredths, fraction–decimal equivalence, benchmarks, comparing and ordering.', gen: fracdec },
  { id: 'g5-qpv-count', grade: 5, strand: 'number', bigIdea: 'qpv', species: 'counter', name: 'Counting Big and Small', classic: false,
    parentDesc: 'Count and order numbers within 1 000 000; count forward and back by unit fractions, mixed numbers, tenths and hundredths.', gen: count },
  { id: 'g5-ops-addsub', grade: 5, strand: 'number', bigIdea: 'ops', species: 'addsub', name: 'Add and Subtract to 1 000 000', classic: false,
    parentDesc: 'Estimate, add and subtract whole numbers within 1 000 000 and decimals to hundredths; solve problems.', gen: addsub },
  { id: 'g5-ops-properties', grade: 5, strand: 'number', bigIdea: 'ops', species: 'multiplier', name: 'Zero, One and Fact Meaning', classic: false,
    parentDesc: 'Understands that 0 ÷ a = 0 and that dividing by 0 is undefined; properties of 0 and 1; meaning of multiplication and division facts.', gen: properties },
  { id: 'g5-ops-facts', grade: 5, strand: 'number', bigIdea: 'ops', species: 'factsprite', name: 'Times Facts to 12', classic: false,
    parentDesc: 'Fluency with multiplication and division facts to 10 × 10; strategies for × 11 and × 12.', gen: facts },
  { id: 'g5-ops-multidigit', grade: 5, strand: 'number', bigIdea: 'ops', species: 'multiplier', name: 'Big Multiply and Divide', classic: false,
    parentDesc: '2-digit × 2-digit multiplication, 3-digit ÷ 1-digit division, × and ÷ by 10, 100 and 1000, estimation, and interpreting remainders in context.', gen: multidigit },
  { id: 'g5-pat-equations', grade: 5, strand: 'patterns', bigIdea: 'patterns', species: 'balancer', name: 'Letter Equations', classic: false,
    parentDesc: 'Write and solve one-step equations (+, −, ×, ÷) with a letter variable and whole numbers, such as 4y = 16 or m ÷ 6 = 7.', gen: equations },
  { id: 'g5-pat-tables', grade: 5, strand: 'patterns', bigIdea: 'patterns', species: 'patternkin', name: 'Tables of Values', classic: false,
    parentDesc: 'Describe patterns in tables with rules in words or symbols, write expressions, predict terms, and decide if a number is in a pattern.', gen: tables },
  { id: 'g5-meas-elapsed', grade: 5, strand: 'shape', bigIdea: 'measurement', species: 'clockwork', name: 'Elapsed Time', classic: false,
    parentDesc: 'Find start times, end times and elapsed time using 12-hour and 24-hour clocks.', gen: elapsed },
  { id: 'g5-meas-measure', grade: 5, strand: 'shape', bigIdea: 'measurement', species: 'measurer', name: 'Measure: Length, Area, Volume', classic: false,
    parentDesc: 'Rectangles with a given perimeter or area; mm, cm, dm, m and km; choosing units; volume in cm³ and m³; volume vs. capacity.', gen: measure },
  { id: 'g5-geo-triangles', grade: 5, strand: 'shape', bigIdea: 'geometry', species: 'shapeshifter', name: 'Triangle Types', classic: false,
    parentDesc: 'Classify triangles as equilateral, isosceles or scalene using side lengths.', gen: triangles },
  { id: 'g5-geo-transform', grade: 5, strand: 'shape', bigIdea: 'geometry', species: 'mirrorwing', name: 'Slides, Flips and Turns', classic: false,
    parentDesc: 'Identify and describe a single translation, reflection or rotation of a 2-D shape.', gen: transform },
  { id: 'g5-data-data', grade: 5, strand: 'stats', bigIdea: 'data', species: 'datapup', name: 'Double Bar Graphs', classic: false,
    parentDesc: 'First-hand vs. second-hand data, choosing a collection method, and interpreting double bar graphs and tables.', gen: data },
  { id: 'g5-data-chance', grade: 5, strand: 'stats', bigIdea: 'data', species: 'chancewing', name: 'Chance', classic: false,
    parentDesc: 'Describe outcomes as impossible, possible or certain; compare equal and unequal chances with spinners and marbles.', gen: chanceSkill },
  { id: 'g5-data-money', grade: 5, strand: 'stats', bigIdea: 'data', species: 'coinling', name: 'Money Smarts', classic: false,
    parentDesc: 'Compare and calculate with money, make change, ways to pay, gift card balances, wants vs. needs, budgets and saving plans.', gen: money },
  { id: 'g5-classic-thousandths', grade: 5, strand: 'number', bigIdea: 'qpv', species: 'fractling', name: 'Thousandths (Classic)', classic: true,
    parentDesc: 'Older curriculum: represent, compare, order, add and subtract decimals to thousandths.', gen: thousandths },
  { id: 'g5-classic-quads', grade: 5, strand: 'shape', bigIdea: 'geometry', species: 'shapeshifter', name: 'Quadrilaterals (Classic)', classic: true,
    parentDesc: 'Older curriculum: sort quadrilaterals by their attributes; parallel, perpendicular, vertical and horizontal lines.', gen: quads },
];

export const SKIPPED = [
  { skillId: 'g5-data-data', indicator: 'Collect first-hand data (carry out a survey, experiment or observation)', reason: 'Needs real data collection. Covered instead by choosing a collection method and classifying first-hand vs. second-hand data.' },
  { skillId: 'g5-data-data', indicator: 'Construct double bar graphs', reason: 'Drawing is not possible on the keypad/choice UI. Adapted to picking the double bar graph that matches a table.' },
  { skillId: 'g5-data-chance', indicator: 'Conduct chance experiments and record outcomes', reason: 'Physical experiments. Covered by predicting and comparing likelihoods with pictured spinners, marbles and number cubes.' },
  { skillId: 'g5-meas-measure', indicator: 'Construct rectangles and rectangular prisms; measure real objects in mm and km', reason: 'Hands-on building and measuring. Adapted to choosing rectangles on grids, counting cubes in pictured prisms, reading a ruler and converting units.' },
  { skillId: 'g5-geo-transform', indicator: 'Perform (draw) a translation, reflection or rotation', reason: 'Drawing is not possible. Adapted to choosing the picture that shows a given transformation.' },
  { skillId: 'g5-geo-triangles', indicator: 'Sort real triangles by measuring their sides', reason: 'Measuring is hands-on. Side lengths are given in the question instead.' },
];

// Grade 6 question generators (NB Holistic Mathematics curriculum, Grade 6 public page, plus the "classic" integers skill
// from the older guide).
// Every random choice goes through the rng passed to gen(tier, rng).
import {
  randInt, pick, chance, shuffle, sample, gcd, fmtNum, clean, fmtMoney, frac, mixed,
  lcm, numWords, mc, mcNum, mcVisual, numAnswer,
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
    .replace(/%/g, ' percent').replace(/°C/g, ' degrees Celsius').replace(/°/g, ' degrees').replace(/¼/g, 'one fourth').replace(/½/g, 'one half')
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

const fadd = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
const fsub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
const fmul = (a, b) => F(a.n * b.n, a.d * b.d);
const fdiv = (a, b) => F(a.n * b.d, a.d * b.n);
const feq = (a, b) => a.n * b.d === b.n * a.d;
const COLOURS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'teal'];
const MCOL = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const isPrime = (n) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
const factorsOf = (n) => { const f = []; for (let i = 1; i <= n; i++) if (n % i === 0) f.push(i); return f; };

// ---------------------------------------------------------------------------
// SD1  Numbers and number systems: place value, primes and composites, factors and multiples, fraction–decimal
// ---------------------------------------------------------------------------
const PC = ['Prime', 'Composite', 'Neither'];
const PC_OPTS = 'Prime means exactly two factors (1 and itself). Composite means more than two factors. Neither is for 0 and 1, which do not fit either group.';
const ODD_COMPOSITES = [9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 55, 57, 63, 65, 69, 75, 77, 81, 85, 87, 91, 93, 95, 99];
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
const PV6 = ['Billions', 'Hundred Millions', 'Ten Millions', 'Millions', 'Hundred Thousands', 'Ten Thousands', 'Thousands', 'Hundreds', 'Tens', 'Ones'];
const PLACE6 = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions', 'ten millions', 'hundred millions', 'billions'];
function bigNum(rng, nd, zeroP = 0.3) {
  let s = String(R(rng, 1, 9));
  for (let i = 1; i < nd; i++) s += chance(rng, zeroP) ? '0' : String(R(rng, 0, 9));
  return Number(s);
}
const digs = (n) => String(n).split('').map(Number);
function arrayFor(n) {
  // a factor pair that fits a 10 x 12 array, with more than one row when possible
  for (let r = Math.min(10, Math.floor(Math.sqrt(n))); r >= 2; r--) if (n % r === 0 && n / r <= 12) return { type: 'array', rows: r, cols: n / r };
  return n <= 12 ? { type: 'array', rows: 1, cols: n } : undefined;
}
const TERM = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 8], [3, 8], [5, 8], [7, 8], [1, 10], [3, 10], [7, 10], [1, 20], [3, 20], [7, 20], [9, 20], [1, 25], [3, 25], [1, 50]];
const REP = [[1, 3, '0.333…'], [2, 3, '0.666…'], [1, 6, '0.1666…'], [5, 6, '0.8333…'], [1, 9, '0.111…'], [2, 9, '0.222…'], [4, 9, '0.444…'], [5, 9, '0.555…'], [7, 9, '0.777…'], [1, 11, '0.0909…'], [2, 11, '0.1818…'], [1, 12, '0.08333…']];

const numbers = gen([
  [1, 4, (t, rng) => {
    let n;
    const kind = pick(rng, t <= 1 ? ['p', 'c', 'c', 'n'] : ['p', 'c', 'c', 'p', 'n']);
    if (kind === 'n') n = pick(rng, [0, 1]);
    else if (kind === 'p') n = pick(rng, PRIMES.filter((p) => p <= (t <= 1 ? 11 : t === 2 ? 50 : 97)));
    else {
      const pool = [];
      for (let k = 4; k <= (t <= 1 ? 40 : 99); k++) if (!isPrime(k) && (t <= 1 ? arrayFor(k) && arrayFor(k).rows > 1 : true)) pool.push(k);
      n = pick(rng, t >= 3 ? pool.filter((k) => k % 2 === 1 || k > 50) : pool);
    }
    const f = factorsOf(n);
    const ans = n < 2 ? 'Neither' : isPrime(n) ? 'Prime' : 'Composite';
    let visual;
    if (t <= 2) visual = n < 2 ? { type: 'expression', text: String(n), big: true } : arrayFor(n) || { type: 'expression', text: String(n), big: true };
    return fixedq({
      prompt: t <= 2 && visual && visual.type === 'array' ? `The array shows ${n}. Is ${n} prime, composite, or neither?` : `Is ${n} prime, composite, or neither?`,
      visual, choices: PC, correct: ans,
      hint: `${PC_OPTS} ${n < 2 ? `Which group does ${n} belong to?` : `Can ${n} be made by multiplying two smaller whole numbers (not using 1)? Try dividing it by 2, 3, 5 and 7.`}`,
      explain: n === 0 ? '0 is neither prime nor composite. Every number is a factor of 0, so it does not fit either group.'
        : n === 1 ? '1 is neither prime nor composite. It has only one factor, itself.'
          : ans === 'Prime' ? `${n} is prime. Its only factors are 1 and ${n}.` : `${n} is composite. Its factors are ${f.join(', ')}.`,
    });
  }],
  [2, 5, (t, rng) => {
    const findPrime = chance(rng, 0.6);
    const hi = t <= 2 ? 50 : 99;
    if (findPrime) {
      const p = pick(rng, PRIMES.filter((x) => x > 10 && x <= hi));
      const wrong = sample(rng, [...ODD_COMPOSITES.filter((x) => x <= hi), 1], 3);
      return mcq(rng, {
        prompt: 'Which number is prime?', correct: p, wrong,
        hint: 'A prime number has only two factors: 1 and itself. Test each choice: can you divide it by 2, 3, 5 or 7 with no remainder? If you can, it is composite, not prime. Remember that 1 is not prime either.',
        explain: `${p} has only two factors, 1 and ${p}. ${wrong.map((w) => (w === 1 ? '1 is neither prime nor composite' : `${w} = ${factorsOf(w)[1]} × ${w / factorsOf(w)[1]}`)).join('; ')}.`,
      });
    }
    const c = pick(rng, ODD_COMPOSITES.filter((x) => x <= hi));
    const wrong = sample(rng, PRIMES.filter((x) => x > 10 && x <= hi), 3);
    return mcq(rng, {
      prompt: 'Which number is composite?', correct: c, wrong,
      hint: 'A composite number can be made by multiplying two smaller whole numbers. Test each choice: does 2, 3, 5 or 7 divide it with no remainder? A prime number has no smaller factors like that.',
      explain: `${c} = ${factorsOf(c)[1]} × ${c / factorsOf(c)[1]}, so it is composite. The others are prime.`,
    });
  }],
  [2, 5, (t, rng) => {
    const n = pick(rng, t <= 2 ? [12, 16, 18, 20, 24, 30] : [24, 30, 36, 40, 42, 48, 54, 56, 60, 64, 72, 84, 90, 96]);
    const f = factorsOf(n);
    const k = t <= 2 ? R(rng, 0, 1) : R(rng, 0, 2);
    if (k === 0) {
      const nots = [];
      for (let x = 2; x < n; x++) if (n % x !== 0) nots.push(x);
      const nf = pick(rng, nots.filter((x) => x <= 15));
      return mcq(rng, {
        prompt: `Which number is NOT a factor of ${n}?`, correct: nf, wrong: sample(rng, f.filter((x) => x > 1 && x < n), 3),
        hint: `A factor of ${n} divides it with no remainder. Test each choice: divide ${n} by it, or ask whether ${n} is in its times table. The one that leaves a remainder is not a factor.`,
        explain: `${n} ÷ ${nf} leaves a remainder, so ${nf} is not a factor. The factors of ${n} are ${f.join(', ')}.`,
      });
    }
    if (k === 1) {
      const lab = (a) => a.join(', ');
      const miss = f.filter((x, i) => i !== Math.floor(f.length / 2));
      const extra = [...f, f[f.length - 2] + 1].sort((a, b) => a - b).filter((x, i, a) => a.indexOf(x) === i);
      const no1 = f.slice(1, -1);
      return mcq(rng, {
        prompt: `Which list shows all the factors of ${n}?`, correct: lab(f), wrong: [lab(miss), lab(extra), lab(no1)].filter((x) => x !== lab(f)),
        hint: `List the factor pairs of ${n}: start with 1 × ${n}, then try 2, 3, 4 and so on, and stop when the pairs start to repeat. The right list has every factor from your pairs and no extras.`,
        explain: `Factor pairs of ${n}: ${f.filter((x) => x * x <= n).map((x) => `${x} × ${n / x}`).join(', ')}. So the factors are ${lab(f)}.`,
      });
    }
    return numq({
      prompt: `How many factors does ${n} have?`, answer: f.length,
      hint: `List the factor pairs of ${n}, starting with 1 × ${n}. Try 2, 3, 4 and so on, stopping when the pairs meet. Count every number in your pairs; a number times itself only counts once.`,
      explain: `The factors of ${n} are ${f.join(', ')}. That is ${f.length} factors.`,
    });
  }],
  [3, 7, (t, rng) => {
    const k = t <= 3 ? R(rng, 0, 1) : R(rng, 0, 4);
    if (k === 0) {
      const m = R(rng, 3, 12), yes = m * R(rng, 3, 12);
      const wrong = [yes + 1, yes - 1, yes + m + 1, m * R(rng, 3, 9) + R(rng, 1, m - 1), yes + 2].filter((x) => x % m !== 0);
      return mcq(rng, {
        prompt: `Which number is a multiple of ${m}?`, correct: yes, wrong,
        hint: `A multiple of ${m} is a number in the ${m} times table. Test each choice: can you divide it by ${m} with no remainder?`,
        explain: `${yes} = ${m} × ${yes / m}, so it is a multiple of ${m}.`,
      });
    }
    const [a, b] = sample(rng, [2, 3, 4, 5, 6, 8, 9, 10, 12], 2);
    if (k === 1 || k === 3) {
      const L = lcm(a, b);
      if (k === 3) {
        const [it1, it2] = pick(rng, [['hot dogs', 'buns'], ['cups', 'lids'], ['juice boxes', 'granola bars'], ['paintbrushes', 'paint pots']]);
        return numq({
          prompt: `${cap(it1)} come in packs of ${a} and ${it2} come in packs of ${b}. What is the smallest number of each you can buy to have the same amount?`,
          answer: L,
          hint: `You need the same number of ${it1} and ${it2}. Count up in the ${a} times table and in the ${b} times table, and find the first number that is in both lists.`,
          explain: `Multiples of ${a}: ${[1, 2, 3, 4, 5, 6].map((i) => a * i).join(', ')}… Multiples of ${b}: ${[1, 2, 3, 4, 5, 6].map((i) => b * i).join(', ')}… The least common multiple is ${L}.`,
        });
      }
      return numq({
        prompt: `What is the least common multiple of ${a} and ${b}?`, answer: L,
        hint: `The least common multiple is the smallest number in both the ${a} and ${b} times tables. Count up by ${Math.max(a, b)}s and stop at the first number that ${Math.min(a, b)} divides with no remainder.`,
        explain: `The first number that is a multiple of both ${a} and ${b} is ${L}.`,
      });
    }
    const g0 = R(rng, 2, 9), x = g0 * R(rng, 2, 6), y = g0 * R(rng, 2, 7);
    if (x === y) return numbers(t, rng);
    const G = gcd(x, y);
    if (k === 4) {
      const [c1, c2] = sample(rng, ['red', 'blue', 'green', 'yellow', 'purple'], 2);
      return numq({
        prompt: `${nm(rng)} has ${x} ${c1} beads and ${y} ${c2} beads. They go into identical bags with none left over. What is the greatest number of bags?`,
        answer: G,
        hint: `Every bag must get the same beads with none left over, so the number of bags must divide both ${x} and ${y}. List the factors of each number and find the biggest one they share.`,
        explain: `Factors of ${x}: ${factorsOf(x).join(', ')}. Factors of ${y}: ${factorsOf(y).join(', ')}. The greatest common factor is ${G}.`,
      });
    }
    return numq({
      prompt: `What is the greatest common factor of ${x} and ${y}?`, answer: G,
      hint: `List the factors of ${x} and the factors of ${y}. Find the numbers that are in both lists, then pick the greatest one.`,
      explain: `Factors of ${x}: ${factorsOf(x).join(', ')}. Factors of ${y}: ${factorsOf(y).join(', ')}. The greatest common factor is ${G}.`,
    });
  }],
  [5, 7, (t, rng) => {
    const pf = [];
    const nf = t >= 7 ? R(rng, 4, 5) : R(rng, 3, 4);
    for (let i = 0; i < nf; i++) pf.push(pick(rng, [2, 2, 3, 3, 5, 7]));
    pf.sort((a, b) => a - b);
    const n = pf.reduce((a, b) => a * b, 1);
    if (n > 400 || n < 12) return numbers(t, rng);
    if (chance(rng, 0.5)) {
      const hide = R(rng, 0, pf.length - 1);
      const shown = pf.map((p, i) => (i === hide ? '□' : p)).join(' × ');
      return numq({
        prompt: `A factor tree for ${n} ends with the primes ${shown}. What prime goes in the box?`, answer: pf[hide],
        hint: `Multiply together the primes you can see. Then divide ${n} by that product to find the missing prime.`,
        explain: `${n} = ${pf.join(' × ')}, so the missing prime is ${pf[hide]}.`,
      });
    }
    const lab = (a) => a.join(' × ');
    const w1 = pf.slice(0, -1).concat(pf[pf.length - 1] * 2), w2 = [...pf.slice(0, -2), pf[pf.length - 2] * pf[pf.length - 1]];
    const w3 = pf.map((p, i) => (i === 0 ? (p === 2 ? 3 : 2) : p)).sort((a, b) => a - b);
    return mcq(rng, {
      prompt: `Which is the prime factorization of ${n}?`, correct: lab(pf), wrong: [lab(w1), lab(w2), lab(w3)].filter((x) => x !== lab(pf)),
      hint: `A prime factorization uses only prime numbers (like 2, 3, 5 and 7) that multiply to exactly ${n}. Test each choice: are all its numbers prime? Do they multiply to ${n}?`,
      explain: `${lab(pf)} = ${n}, and 2, 3, 5 and 7 are prime. ${w2.some((x) => !isPrime(x)) ? `${lab(w2)} uses ${w2.find((x) => !isPrime(x))}, which is not prime.` : ''}`,
    });
  }],
  // place value any size
  [1, 6, (t, rng) => {
    if (t <= 2) {
      const n = bigNum(rng, 7);
      return mcq(rng, {
        prompt: 'What number is shown in the place-value chart?',
        visual: { type: 'placevalue', columns: PV6.slice(3), digits: digs(n) },
        correct: n, wrong: [Math.floor(n / 10), n * 10, Number(String(n).slice(0, 2) + String(n).slice(3) + String(n)[2]), n + 100000].filter((x) => x !== n), format: fmtNum,
        hint: 'Read the digits from left to right and write them in order, keeping any zeros. The first column is the millions. Leave a space after the millions digit and before the last three digits.',
        explain: `The chart shows ${fmtNum(n)}.`,
      });
    }
    const k = R(rng, 0, 2);
    if (k === 0) {
      const nd = t >= 5 ? R(rng, 9, 10) : R(rng, 7, 9), n = bigNum(rng, nd, 0.2), d = digs(n);
      const idxs = d.map((x, i) => i).filter((i) => d[i] !== 0 && d.indexOf(d[i]) === d.lastIndexOf(d[i]));
      if (!idxs.length) return numbers(t, rng);
      const i = pick(rng, idxs), p = nd - 1 - i, val = d[i] * 10 ** p;
      return mcq(rng, {
        prompt: `What is the value of the digit ${d[i]} in ${fmtNum(n)}?`,
        correct: val, wrong: [val * 10, val / 10, val * 100, val / 100].filter((x) => Number.isInteger(x) && x !== val && x > 0), format: fmtNum,
        hint: `Find the place of the ${d[i]} by counting from the right: ones, tens, hundreds, thousands, ten thousands, hundred thousands, millions, and so on. The digit is worth ${d[i]} of that place.`,
        explain: `The ${d[i]} is in the ${PLACE6[p]} place, so it is worth ${fmtNum(val)}.`,
      });
    }
    if (k === 1) {
      const w = R(rng, 0, 9), n3 = R(rng, 1, 999), x = clean(w + n3 / 1000), s = x.toFixed(3), dd = s.split('.')[1].split('').map(Number);
      const idx = [0, 1, 2].filter((i) => dd[i] !== 0 && dd.indexOf(dd[i]) === dd.lastIndexOf(dd[i]));
      if (!idx.length) return numbers(t, rng);
      const i = pick(rng, idx), val = clean(dd[i] / 10 ** (i + 1));
      return mcq(rng, {
        prompt: `What is the value of the digit ${dd[i]} in ${s}?`,
        correct: val, wrong: [clean(val * 10), clean(val / 10), dd[i], clean(val * 100), clean(val / 100)].filter((v) => v !== val && decPlaces(v) <= 5), format: dn,
        hint: `Find where the ${dd[i]} is in ${s}. The first place after the point is tenths, the second is hundredths and the third is thousandths. The digit is worth that many of its place.`,
        explain: `The ${dd[i]} is in the ${['tenths', 'hundredths', 'thousandths'][i]} place, so it is worth ${dn(val)}.`,
      });
    }
    const dg = R(rng, 1, 9), p1 = R(rng, 4, 8), gap = R(rng, 1, 2);
    const n = dg * 10 ** p1 + dg * 10 ** (p1 - gap) + (chance(rng, 0.5) ? R(rng, 1, 999) : 0);
    return numq({
      prompt: `In ${fmtNum(n)}, the value of the first ${dg} is how many times the value of the second ${dg}?`, answer: 10 ** gap,
      hint: `The first ${dg} is further left than the second ${dg}. Each place to the left is worth ten times as much. Count how many places apart the two ${dg}s are, and multiply by ten that many times.`,
      explain: `The first ${dg} is worth ${fmtNum(dg * 10 ** p1)} and the second is worth ${fmtNum(dg * 10 ** (p1 - gap))}. ${fmtNum(dg * 10 ** p1)} is ${fmtNum(10 ** gap)} times as much.`,
    });
  }],
  // fraction and decimal equivalents
  [3, 7, (t, rng) => {
    const k = t <= 3 ? 0 : R(rng, 0, 4);
    if (k === 0) {
      const [n, d] = pick(rng, TERM);
      return numq({
        prompt: `Write ${frac(n, d)} as a decimal.`, answer: n / d,
        hint: d === 8 ? `Divide the top by the bottom: ${n} ÷ 8. It helps to know that one eighth is half of one fourth.` : `Find an equal fraction with 10, 100 or 1000 on the bottom. What do you multiply ${d} by to get there? Multiply ${n} by the same number, then write it as a decimal.`,
        explain: `${n} ÷ ${d} = ${dn(n / d)}, so ${frac(n, d)} = ${dn(n / d)}.`,
      });
    }
    if (k === 1) {
      const rep = chance(rng, 0.5);
      const [rn, rd] = pick(rng, REP);
      const terms = sample(rng, TERM, 3);
      if (rep) {
        return mcq(rng, {
          prompt: 'Which fraction is a repeating decimal?', correct: frac(rn, rd), wrong: terms.map(([a, b]) => frac(a, b)),
          hint: 'A fraction in simplest form ends as a decimal only if its bottom number is made from 2s and 5s multiplied together (like 4, 8, 10 or 20). Any other bottom number, like 3, 6, 7 or 9, makes the digits repeat forever. Check the bottom number of each choice.',
          explain: `${frac(rn, rd)} = ${REP.find((r) => r[0] === rn && r[1] === rd)[2]}, which repeats forever. The others end (terminate).`,
        });
      }
      const [tn, td] = terms[0];
      return mcq(rng, {
        prompt: 'Which fraction is a terminating decimal (it ends)?', correct: frac(tn, td), wrong: sample(rng, REP, 3).map(([a, b]) => frac(a, b)),
        hint: 'A fraction in simplest form ends as a decimal only if its bottom number is made from 2s and 5s multiplied together (like 4, 8, 10 or 20). Bottom numbers like 3, 6, 9 or 11 make the digits repeat forever. Check the bottom number of each choice.',
        explain: `${frac(tn, td)} = ${dn(tn / td)}, which ends. The others repeat forever.`,
      });
    }
    if (k === 2) {
      const d = pick(rng, t >= 7 ? [9, 11] : [9, 3]), n = R(rng, 1, d - 1);
      if (d === 3 && n === 0) return numbers(t, rng);
      const dec = (x) => (d === 9 ? `0.${String(x).repeat(3)}…` : d === 11 ? `0.${String(9 * x).padStart(2, '0').repeat(2)}…` : `0.${String(Math.floor(10 * x / 3)).repeat(3)}…`);
      const shown = d === 3 ? [1, 2].filter((x) => x !== n) : sample(rng, [...Array(d - 1).keys()].map((x) => x + 1).filter((x) => x !== n), 2).sort((a, b) => a - b);
      const correct = dec(n);
      const wrong = d === 9 ? [`0.${n}`, `0.${n}9`, `${n}.9`, `0.${n + 1}${n + 1}${n + 1}…`] : d === 11 ? [`0.${n}${n}${n}…`, `0.${n}1`, `0.${String(9 * n + 1).padStart(2, '0').repeat(2)}…`] : [`0.${n}`, `0.${n}${n}`, `${n}.3`];
      return mcq(rng, {
        prompt: `${shown.map((x) => `${frac(x, d)} = ${dec(x)}`).join(' and ')}. What is ${frac(n, d)} as a decimal?`,
        correct, wrong,
        hint: `Look at the fractions you are given. How are the repeating digits connected to the top number? ${d === 11 ? 'For elevenths, try multiplying the top number by 9.' : 'Compare each top number with the digit that repeats.'}`,
        explain: d === 9 ? `Ninths repeat the numerator: ${frac(n, d)} = ${dec(n)}.` : d === 11 ? `Elevenths repeat 9 times the numerator: 9 × ${n} = ${9 * n}, so ${frac(n, d)} = ${dec(n)}.` : `${frac(n, d)} = ${dec(n)}.`,
      });
    }
    if (k === 3) {
      const [rn, rd, rs] = pick(rng, REP.slice(0, 8));
      return mcq(rng, {
        prompt: `Which decimal equals ${frac(rn, rd)}?`, correct: rs,
        wrong: [`0.${rn}${rd}`, `0.${rn}`, `${rd}.${rn}`, `${rn}.${rd}`].filter((x) => x !== rs),
        hint: `Divide ${rn} by ${rd}, adding zeros after the decimal point as you go. Does the division ever end, or do the same digits keep coming back? The "…" means digits that repeat forever.`,
        explain: `${rn} ÷ ${rd} = ${rs} The digits keep repeating.`,
      });
    }
    const [n, d] = pick(rng, TERM.filter(([, b]) => b !== 2));
    const v = n / d;
    return mcq(rng, {
      prompt: `Which fraction equals ${dn(v)}?`, correct: [n, d], wrong: TERM.filter(([a, b]) => Math.abs(a / b - v) > 0.001).sort((x, y) => Math.abs(x[0] / x[1] - v) - Math.abs(y[0] / y[1] - v)).slice(0, 5),
      format: ([a, b]) => frac(a, b),
      hint: `Change each fraction into a decimal by dividing the top by the bottom, and compare it with ${dn(v)}. Or write ${dn(v)} as thousandths and simplify.`,
      explain: `${dn(v)} = ${frac(Math.round(v * 1000), 1000)} = ${frac(n, d)}.`,
    });
  }],
  // large numbers in context
  [4, 5, (t, rng) => {
    const facts = [
      ['The distance from Earth to the Sun is about', 150000000, 'km'], ['Canada has about', 41000000, 'people'],
      ['A blue whale can have a mass of about', 150000, 'kg'], ['The Moon is about', 384000, 'km from Earth'],
      ['A big city library has about', 2500000, 'books'], ['Light travels about', 300000, 'km each second'],
      ['New Brunswick has about', 850000, 'people'], ['A dragon hoard has', R(rng, 12, 98) * 1000000, 'gold coins'],
    ];
    const [txt, n, unit] = pick(rng, facts);
    if (n >= 1000000 && chance(rng, 0.5)) {
      return numq({
        prompt: `${txt} ${fmtNum(n)} ${unit}. How many millions is that?`, answer: n / 1000000,
        hint: `One million is 1 000 000. How many millions fit in ${fmtNum(n)}? Divide ${fmtNum(n)} by one million; any part less than a million becomes a decimal.`,
        explain: `${fmtNum(n)} = ${dn(n / 1000000)} × 1 000 000, so it is ${dn(n / 1000000)} million.`,
      });
    }
    return mcq(rng, {
      prompt: `${txt} ${fmtNum(n)} ${unit}. How do you say this number?`,
      correct: numWords(n), wrong: [numWords(n * 10), numWords(n / 10), numWords(n / 1000 > 1 ? n / 1000 : n * 100)].filter((x) => x !== numWords(n)),
      hint: `Split ${fmtNum(n)} into groups of three digits from the right. Read each group as a number and add its name ("million" or "thousand"), then read the last group. Check every group in each choice.`,
      explain: `${fmtNum(n)} is read "${numWords(n)}".`,
    });
  }],
  // multi-step factors, multiples and primes
  [6, 7, (t, rng) => {
    const k = R(rng, 0, 2);
    if (k === 0) {
      const [a, b] = sample(rng, [4, 6, 8, 9, 10, 12, 15], 2), L = lcm(a, b);
      const [one, other, unit, act] = pick(rng, [['A red light blinks every', 'a blue light blinks every', 'seconds', 'blink'], ['One bell rings every', 'another bell rings every', 'minutes', 'ring'], ['A dragon roars every', 'a griffin squawks every', 'minutes', 'call out']]);
      return numq({
        prompt: `${one} ${a} ${unit} and ${other} ${b} ${unit}. They both ${act} right now. In how many ${unit} will they next ${act} at the same time?`, answer: L,
        hint: `They ${act} together at times that are multiples of both ${a} and ${b}. Count up by ${Math.max(a, b)}s and find the first number that ${Math.min(a, b)} also divides.`,
        explain: `The multiples of ${a} and ${b} first meet at ${L}: ${L} ÷ ${a} = ${L / a} and ${L} ÷ ${b} = ${L / b}.`,
      });
    }
    if (k === 1) {
      const lo = R(rng, 2, 7) * 10, hi = lo + (t >= 7 ? 30 : 20);
      const ps = PRIMES.filter((p) => p > lo && p < hi);
      return numq({
        prompt: `How many prime numbers are there between ${lo} and ${hi}?`, answer: ps.length,
        hint: `Check each number from ${lo + 1} to ${hi - 1}. Cross out the even numbers and the ones ending in five, then test the rest by dividing by three and by seven. Count the numbers that are left.`,
        explain: `The primes between ${lo} and ${hi} are ${ps.join(', ')}. That is ${ps.length}.`,
      });
    }
    const tri = pick(rng, [[2, 3, 4], [2, 3, 5], [3, 4, 6], [2, 5, 6], [4, 5, 6], [3, 5, 6], [2, 4, 5], [3, 4, 5]]);
    const L = lcm(lcm(tri[0], tri[1]), tri[2]);
    return numq({
      prompt: `What is the smallest number that can be divided by ${tri[0]}, ${tri[1]} and ${tri[2]} with no remainder?`, answer: L,
      hint: `The number must be a multiple of all three. Count up in the ${tri[2]} times table and test each number: does ${tri[0]} divide it? Does ${tri[1]}?`,
      explain: `${L} ÷ ${tri[0]} = ${L / tri[0]}, ${L} ÷ ${tri[1]} = ${L / tri[1]} and ${L} ÷ ${tri[2]} = ${L / tri[2]}. No smaller number works for all three.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD2  Percent, ratio and rate
// ---------------------------------------------------------------------------
const PCT_DENS = [2, 4, 5, 10, 20, 25, 50];
function pctHint(p, n) {
  const N = fmtNum(n);
  switch (p) {
    case 50: return `50% means half. Find half of ${N}.`;
    case 25: return `25% means one fourth. Find half of ${N}, then half again.`;
    case 75: return `75% means three fourths. Find one fourth of ${N}, then take three of those.`;
    case 10: return `10% means one tenth. Divide ${N} by ten.`;
    case 1: return `1% means one hundredth. Divide ${N} by one hundred.`;
    case 100: return `100% means the whole amount.`;
    case 5: return `5% is half of 10%. Find 10% of ${N} (divide by ten), then take half of that.`;
    case 15: return `15% is 10% plus 5%. Find 10% of ${N}, find half of that for 5%, then add them.`;
    default: return `${p}% is ${p / 10} lots of 10%. Find 10% of ${N} first (divide by ten), then multiply by ${p / 10}.`;
  }
}
const RATIO_ITEMS = [['🍎', 'apples'], ['🍐', 'pears'], ['⭐', 'stars'], ['💎', 'gems'], ['🐚', 'shells'], ['🌰', 'acorns'], ['🧪', 'potions'], ['🪶', 'feathers']];
const r2 = (a, b) => `${a}:${b}`;
const ratioSay = (s) => say(s).replace(/(\d+):(\d+)/g, '$1 to $2');

const percent = gen([
  [1, 3, (t, rng) => {
    const s = t === 1 ? pick(rng, [R(rng, 1, 9) * 10, R(rng, 1, 99)]) : R(rng, 1, 99);
    const not = t >= 2 && chance(rng, 0.4);
    return numq({
      prompt: `What percent of the grid is ${not ? 'NOT ' : ''}shaded?`,
      visual: { type: 'hundredgrid', shaded: s }, answer: not ? 100 - s : s,
      hint: not ? 'Percent means "out of 100", and the grid has 100 squares. Count the squares that are NOT shaded, or take the shaded squares away from 100.' : 'Percent means "out of 100", and the grid has 100 squares. Count the shaded squares: count by 10s down the full columns, then add the extra squares.',
      explain: not ? `${s} squares are shaded, so ${100 - s} of 100 are not: ${100 - s}%.` : `${s} of the 100 squares are shaded: ${s}%.`,
    });
  }],
  [2, 5, (t, rng) => {
    const k = R(rng, 0, 3);
    if (k === 0) {
      const p = t <= 2 ? R(rng, 1, 9) * 10 : pick(rng, [R(rng, 11, 99), R(rng, 1, 9)]);
      const v = p / 100;
      return mcq(rng, {
        prompt: `What is ${p}% as a decimal?`, correct: v, wrong: [p / 10, p, p / 1000, clean(v + 0.1)].map(clean).filter((x) => x !== v), format: dn,
        hint: `Percent means hundredths, so ${p}% is ${p} hundredths. Write ${p} hundredths as a decimal: the hundredths place is two places after the point.`,
        explain: `${p}% = ${p} hundredths = ${dn(v)}.`,
      });
    }
    if (k === 1) {
      const d = pick(rng, PCT_DENS), n = R(rng, 1, d - 1), p = (n * 100) / d;
      const f = F(n, d);
      return mcq(rng, {
        prompt: `What is ${p}% as a fraction in simplest form?`, correct: [f.n, f.d],
        wrong: [[p, 10], [f.d, f.n], [1, p], [f.n, f.d + 1], [p, 1000]].filter(([a, b]) => b > a && a > 0 && !feq(F(a, b), f) && F(a, b).n === a),
        format: ([a, b]) => frac(a, b),
        hint: `Write ${p}% as ${frac(p, 100)}. Then simplify: divide the top and bottom by the same number until only 1 divides both.`,
        explain: `${p}% = ${frac(p, 100)} = ${frac(f.n, f.d)}.`,
      });
    }
    if (k === 2) {
      const d = pick(rng, PCT_DENS), n = R(rng, 1, d - 1);
      const f = F(n, d);
      return numq({
        prompt: `What percent is equal to ${frac(f.n, f.d)}?`, answer: (f.n * 100) / f.d,
        hint: `Percent means out of 100. What do you multiply ${f.d} by to get 100? Multiply ${f.n} by the same number.`,
        explain: `${frac(f.n, f.d)} = ${frac((f.n * 100) / f.d, 100)} = ${(f.n * 100) / f.d}%.`,
      });
    }
    const v = clean(R(rng, 1, 99) / 100);
    return numq({
      prompt: `What percent is equal to ${dn(v)}?`, answer: Math.round(v * 100),
      hint: `${dn(v)} is a number of hundredths. How many hundredths is it? That many hundredths is the same number of percent.`,
      explain: `${dn(v)} = ${Math.round(v * 100)} hundredths = ${Math.round(v * 100)}%.`,
    });
  }],
  [3, 6, (t, rng) => {
    const opts = t === 3 ? [[10, 10], [50, 2], [100, 1], [1, 100], [25, 4]] : [[10, 10], [50, 2], [25, 4], [20, 5], [1, 100], [5, 20], [75, 4], [30, 10], [40, 5], [15, 20]];
    const [p, q] = pick(rng, opts);
    const unit = p === 75 ? 4 : p === 30 || p === 15 ? (p === 30 ? 10 : 20) : p === 40 ? 5 : q;
    const n = unit * R(rng, 2, t === 3 ? 20 : 60);
    const ans = (n * p) / 100;
    const thing = pick(rng, ['', ' gems', ' students', ' km', ' marbles', '$']);
    return numq({
      prompt: thing === '$' ? `What is ${p}% of $${fmtNum(n)}? (Answer in dollars.)` : `What is ${p}% of ${fmtNum(n)}${thing}?`, answer: ans,
      visual: t === 3 ? { type: 'hundredgrid', shaded: p } : undefined,
      hint: pctHint(p, n),
      explain: p === 100 ? `100% is the whole amount, so 100% of ${fmtNum(n)} is ${fmtNum(n)}.` : p === 10 || p === 50 || p === 25 || p === 1 ? `${p}% = ${frac(F(p, 100).n, F(p, 100).d)}, and ${frac(F(p, 100).n, F(p, 100).d)} of ${fmtNum(n)} is ${fmtNum(ans)}.`
        : `${p}% = ${frac(F(p, 100).n, F(p, 100).d)}. ${fmtNum(n)} ÷ ${F(p, 100).d} × ${F(p, 100).n} = ${fmtNum(ans)}.`,
    });
  }],
  [1, 4, (t, rng) => {
    const [[i1, w1], [i2, w2]] = sample(rng, RATIO_ITEMS, 2);
    const a = R(rng, 1, t <= 1 ? 6 : 9), b = R(rng, 1, t <= 1 ? 6 : 9);
    if (a === b) return percent(t, rng);
    const visual = { type: 'objects', items: [{ icon: i1, count: a }, { icon: i2, count: b }] };
    if (t >= 2 && chance(rng, 0.5)) {
      const f = F(a, a + b);
      return mcq(rng, {
        prompt: `What fraction of all the objects are ${w1}?`, visual,
        correct: [f.n, f.d], wrong: [[a, b], [b, a + b], [b, a], [a, a + b + 1]].map(([x, y]) => F(x, y)).filter((g) => !feq(g, f)).map((g) => [g.n, g.d]),
        format: ([x, y]) => frac(x, y),
        hint: `A part-to-whole fraction compares one part with ALL the objects. Count the ${w1}, then count every object in the picture. Write part over total, in simplest form.`,
        explain: `There ${a === 1 ? 'is' : 'are'} ${a} ${a === 1 ? w1.slice(0, -1) : w1} out of ${a + b} objects: ${frac(a, a + b)}${f.n !== a ? ` = ${frac(f.n, f.d)}` : ''}. The part-to-part ratio is ${r2(a, b)}.`,
      });
    }
    const q = {
      prompt: `What is the ratio of ${w1} to ${w2}?`, visual,
      correct: r2(a, b), wrong: [r2(b, a), r2(a, a + b), r2(b, a + b), r2(a + 1, b)],
      hint: `A ratio compares two amounts in the order they are named: first the ${w1}, then the ${w2}. Count each kind and write the two counts with a colon between them.`,
      explain: `There ${a === 1 ? 'is' : 'are'} ${a} ${a === 1 ? w1.slice(0, -1) : w1} and ${b} ${b === 1 ? w2.slice(0, -1) : w2}, so the ratio of ${w1} to ${w2} is ${r2(a, b)}.`,
    };
    const out = mcq(rng, q);
    out.speak = ratioSay(out.prompt);
    return out;
  }],
  [4, 7, (t, rng) => {
    const a = R(rng, 1, 6), b = R(rng, 2, 9), k = R(rng, 2, t >= 6 ? 12 : 6);
    if (a === b) return percent(t, rng);
    if (chance(rng, 0.5)) {
      const q = numq({
        prompt: `${r2(a, b)} = ${r2(a * k, '□')}. What number goes in the box?`, answer: b * k,
        hint: `Equal ratios grow by the same multiplier. What was ${a} multiplied by to get ${a * k}? Multiply ${b} by that same number.`,
        explain: `${a} × ${k} = ${a * k}, so ${b} × ${k} = ${b * k}. ${r2(a, b)} = ${r2(a * k, b * k)}.`,
      });
      q.speak = ratioSay(q.prompt);
      return q;
    }
    const [x, y] = pick(rng, [['cups of flour', 'cups of milk'], ['scoops of berries', 'scoops of yogurt'], ['drops of moonwater', 'drops of starlight'], ['blue beads', 'white beads'], ['cups of juice', 'cups of sparkling water']]);
    const q = numq({
      prompt: `A recipe uses ${a} ${x} for every ${b} ${y}. How many ${y} are needed with ${a * k} ${x}?`, answer: b * k,
      hint: `Keep the ratio the same. How many times as many ${x} are there now (${a} became ${a * k})? Make the ${y} that many times bigger too.`,
      explain: `${a * k} is ${k} times ${a}, so use ${k} × ${b} = ${b * k} ${y}.`,
    });
    return q;
  }],
  [2, 7, (t, rng) => {
    const k = t <= 3 ? R(rng, 0, 1) : R(rng, 1, 3);
    if (k === 0) {
      const rates = ['90 km per hour', '12 pages per day', '$3 per kilogram', '60 heartbeats per minute', '4 L per minute'];
      const ratios = ['3 cats to 5 dogs', '2 red marbles to 7 blue marbles', '4 boys to 6 girls', '5 apples to 2 pears'];
      return mcq(rng, {
        prompt: 'Which one is a rate?', correct: pick(rng, rates), wrong: sample(rng, ratios, 3),
        hint: 'A rate compares two different kinds of things, like kilometres per hour or dollars per kilogram. A ratio like "3 cats to 5 dogs" compares things counted in the same way. Check each choice: are its two units different?',
        explain: 'A rate compares quantities with different units, such as kilometres per hour. The others compare things with the same unit (a ratio).',
      });
    }
    if (k === 1) {
      const per = R(rng, 3, 25), n = R(rng, 2, 8);
      const [what, unit, time] = pick(rng, [['reads', 'pages', 'hours'], ['bikes', 'km', 'hours'], ['earns', 'dollars', 'days'], ['collects', 'shells', 'minutes'], ['brews', 'potions', 'days']]);
      return numq({
        prompt: `${nm(rng)} ${what} ${per * n} ${unit} in ${n} ${time}. At the same rate, how many ${unit} is that per ${time.slice(0, -1)}?`, answer: per,
        hint: `"Per ${time.slice(0, -1)}" means in each one ${time.slice(0, -1)}. Share the total, ${per * n} ${unit}, equally over the ${n} ${time}.`,
        explain: `${per * n} ÷ ${n} = ${per} ${unit} per ${time.slice(0, -1)}.`,
      });
    }
    if (k === 2) {
      const per = R(rng, 4, 90), n = R(rng, 2, 5), m = R(rng, 3, 9);
      const [what, unit, time] = pick(rng, [['A train travels', 'km', 'hours'], ['A dragon flies', 'km', 'hours'], ['A printer prints', 'pages', 'minutes'], ['A pump moves', 'L of water', 'minutes']]);
      return numq({
        prompt: `${what} ${per * n} ${unit} in ${n} ${time}. At the same rate, how far or how many in ${m} ${time}?`.replace('how far or how many', unit.startsWith('km') ? 'how far' : 'how many'), answer: per * m,
        hint: `First find the unit rate: how much in one ${time.slice(0, -1)}? Share ${per * n} equally over ${n} ${time}. Then multiply that by ${m}.`,
        explain: `${per * n} ÷ ${n} = ${per} per ${time.slice(0, -1)}. ${per} × ${m} = ${per * m} ${unit}.`,
      });
    }
    const thing = pick(rng, ['granola bars', 'juice boxes', 'notebooks', 'markers']);
    const a = R(rng, 2, 5), b = a + R(rng, 1, 4);
    const ua = R(rng, 40, 150) * 5, ub = ua + pick(rng, [-25, -15, -10, 10, 15, 25]);
    const pa = ua * a, pb = ub * b;
    const correct = ua < ub ? `${a} for ${fmtMoney(pa)}` : `${b} for ${fmtMoney(pb)}`;
    return fixedq({
      prompt: `Which is the better buy for ${thing}?`, choices: [`${a} for ${fmtMoney(pa)}`, `${b} for ${fmtMoney(pb)}`, 'They cost the same'], correct,
      hint: `Find the unit price (the cost of one) for each: ${fmtMoney(pa)} ÷ ${a} and ${fmtMoney(pb)} ÷ ${b}. The lower unit price is the better buy.`,
      explain: `${fmtMoney(pa)} ÷ ${a} = ${fmtMoney(ua)} each. ${fmtMoney(pb)} ÷ ${b} = ${fmtMoney(ub)} each. ${correct} costs less for each one.`,
    });
  }],
  [5, 7, (t, rng) => {
    if (chance(rng, 0.5)) {
      const tot = pick(rng, [4, 5, 10, 20, 25, 50]), part = R(rng, 1, tot - 1);
      const [col, thing] = pick(rng, [['red', 'marbles'], ['blue', 'gems'], ['striped', 'shells'], ['gold', 'coins']]);
      return numq({
        prompt: `${part} out of ${tot} ${thing} are ${col}. What percent of the ${thing} are ${col}?`, answer: (part * 100) / tot,
        hint: `Percent means out of 100, so write ${part} out of ${tot} as a fraction out of 100. What do you multiply ${tot} by to get 100? Multiply ${part} by the same number.`,
        explain: `${frac(part, tot)} = ${frac((part * 100) / tot, 100)} = ${(part * 100) / tot}%.`,
      });
    }
    const a = R(rng, 1, 4), b = R(rng, 1, 5);
    if ((100 * a) % (a + b) !== 0 || a === b) return percent(t, rng);
    const [x, y] = pick(rng, [['cats', 'dogs'], ['owls', 'hawks'], ['red tiles', 'blue tiles'], ['fiction books', 'non-fiction books']]);
    const q = numq({
      prompt: `The ratio of ${x} to ${y} is ${r2(a, b)}. What percent are ${x}?`, answer: (100 * a) / (a + b),
      hint: `A ratio of ${a}:${b} means that out of every ${a + b} animals or things, ${a} are ${x}. Write that as a fraction with ${a + b} on the bottom, then change it to a fraction out of 100.`,
      explain: `${a} out of every ${a + b} are ${x}: ${frac(a, a + b)} = ${(100 * a) / (a + b)}%.`,
    });
    q.speak = ratioSay(q.prompt);
    return q;
  }],
  [4, 7, (t, rng) => {
    if (chance(rng, t >= 6 ? 0.9 : 0.5)) {
      const p = pick(rng, [49, 51, 24, 26, 9, 11, 74, 76]);
      const bench = { 49: 50, 51: 50, 24: 25, 26: 25, 9: 10, 11: 10, 74: 75, 76: 75 }[p];
      const n = R(rng, 8, 40) * 20 + pick(rng, [-2, -1, 1, 2]);
      const est = Math.round((bench * Math.round(n / 20) * 20) / 100);
      return mcq(rng, {
        prompt: `About what is ${p}% of ${fmtNum(n)}?`, correct: est, wrong: [est * 10, Math.round(est / 10) || est + 3, est * 2, Math.round(est / 2)].filter((x) => x !== est),
        format: (x) => `about ${fmtNum(x)}`,
        hint: `${p}% is close to ${bench}%, and ${fmtNum(n)} is close to ${fmtNum(Math.round(n / 20) * 20)}. Find ${bench}% of that friendly number.`,
        explain: `${p}% ≈ ${bench}%, and ${fmtNum(n)} ≈ ${fmtNum(Math.round(n / 20) * 20)}. ${bench}% of ${fmtNum(Math.round(n / 20) * 20)} = ${fmtNum(est)}.`,
      });
    }
    const exact = ['paying for groceries at the store', 'measuring medicine for a sick pet', 'counting change for a customer', 'cutting a board to fit a shelf exactly'];
    const approx = ['guessing how many people came to a parade', 'telling a friend how far away the lake is', 'saying how many hours you slept', 'guessing how many jelly beans are in a jar'];
    const needExact = chance(rng, 0.5);
    return mcq(rng, {
      prompt: needExact ? 'Which situation needs an exact answer?' : 'In which situation is an estimate good enough?',
      correct: pick(rng, needExact ? exact : approx), wrong: sample(rng, needExact ? approx : exact, 3),
      hint: 'An exact answer is needed when a small mistake would cause a problem, like with money, medicine or making things fit. An estimate is fine when you only need a rough idea. For each choice, ask: would being a little off matter?',
      explain: needExact ? 'When money, medicine or exact fits are involved, a small error matters, so you need an exact answer.' : 'For a rough idea, like a crowd size or a distance in conversation, an estimate is fine.',
    });
  }],
  [6, 7, (t, rng) => {
    if (chance(rng, 0.5)) {
      const p = pick(rng, [10, 20, 25, 50, 30, 40, 75]), base = pick(rng, [20, 40, 60, 80, 24, 36, 48, 120]);
      const off = (base * p) / 100;
      if (!Number.isInteger(off)) return percent(t, rng);
      const item = pick(rng, ['video game', 'skateboard', 'hoodie', 'wizard costume', 'telescope', 'board game']);
      return numq({
        prompt: `${cap(an(item))} costs $${base}. It is on sale for ${p}% off. What is the sale price in dollars?`, answer: base - off,
        hint: `There are two steps. First find ${p}% of $${base}: that is how much you save. Then take it away from $${base}.`,
        explain: `${p}% of ${base} = ${off}. $${base} − $${off} = $${base - off}.`,
      });
    }
    const tot = pick(rng, [20, 25, 30, 40, 50]), p = pick(rng, [10, 20, 40, 60, 30, 70]);
    const part = (tot * p) / 100;
    if (!Number.isInteger(part)) return percent(t, rng);
    const [does, doesnt] = pick(rng, [['walk to school', 'do not walk'], ['play an instrument', 'do not play one'], ['have a pet', 'do not have a pet']]);
    return numq({
      prompt: `There are ${tot} students in a class. ${p}% ${does}. How many students ${doesnt}?`, answer: tot - part,
      hint: `There are two steps. Find ${p}% of ${tot} (the students who ${does}). Then take that away from ${tot}. Or find ${100 - p}% of ${tot} straight away.`,
      explain: `${p}% of ${tot} = ${part}. ${tot} − ${part} = ${tot - part}. (That is ${100 - p}% of ${tot}.)`,
    });
  }],
  // multi-step percent and ratio problems
  [6, 7, (t, rng) => {
    const k = R(rng, 0, 2), n = nm(rng);
    if (k === 0) {
      const tot = pick(rng, [20, 25, 40, 50]), p1 = pick(rng, [10, 20, 30, 40]), p2 = pick(rng, [10, 20, 30, 40].filter((x) => x + p1 < 100));
      const a1 = (tot * p1) / 100, a2 = (tot * p2) / 100;
      if (!Number.isInteger(a1) || !Number.isInteger(a2)) return percent(t, rng);
      return numq({
        prompt: `A class has ${tot} students. ${p1}% walk to school and ${p2}% take the bus. The rest are driven. How many students are driven?`, answer: tot - a1 - a2,
        hint: `Find ${p1}% of ${tot} and ${p2}% of ${tot}, then take both amounts away from ${tot}. Or first work out what percent are driven, then find that percent of ${tot}.`,
        explain: `${p1}% of ${tot} = ${a1} and ${p2}% of ${tot} = ${a2}. ${tot} − ${a1} − ${a2} = ${tot - a1 - a2}. (That is ${100 - p1 - p2}% of ${tot}.)`,
      });
    }
    if (k === 1) {
      const a = R(rng, 1, 5), b = R(rng, 1, 6), m = R(rng, 2, 9);
      if (a === b) return percent(t, rng);
      const tot = (a + b) * m;
      const [x, y, all] = pick(rng, [['red marbles', 'blue marbles', 'marbles'], ['fiction books', 'non-fiction books', 'books'], ['cats', 'dogs', 'pets'], ['gold coins', 'silver coins', 'coins']]);
      const q = numq({
        prompt: `There are ${tot} ${all}. The ratio of ${x} to ${y} is ${a}:${b}. How many are ${x}?`, answer: a * m,
        hint: `The ratio ${a}:${b} means that out of every ${a} plus ${b} ${all}, ${a} are ${x}. First add the two parts of the ratio to get one group, then find how many of those groups fit in ${tot}. Each group has ${a} ${x}.`,
        explain: `${tot} ÷ ${a + b} = ${m} groups. ${m} × ${a} = ${a * m} ${x} (and ${m * b} ${y}).`,
      });
      q.speak = ratioSay(q.prompt);
      return q;
    }
    const allow = pick(rng, [20, 25, 30, 40, 50]), p = pick(rng, [10, 20, 25, 50]), w = R(rng, 3, 8);
    const save = (allow * p) / 100;
    if (!Number.isInteger(save)) return percent(t, rng);
    return numq({
      prompt: `${n} gets $${allow} each week and saves ${p}% of it. How many dollars does ${n} save in ${w} weeks?`, answer: save * w,
      hint: `There are two steps. First find ${p}% of $${allow}: that is the saving for one week. Then multiply by ${w} weeks.`,
      explain: `${p}% of $${allow} is $${save}. $${save} × ${w} = $${save * w}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD3  Decimal operations (× 1-digit whole number, ÷ 1-digit divisor), limited to hundredths
// ---------------------------------------------------------------------------
function decOf(rng, places, maxWhole) {
  const x = clean(R(rng, 0, maxWhole) + R(rng, 1, places === 1 ? 9 : 99) / 10 ** places);
  return decPlaces(x) === places ? x : clean(x + 10 ** -places);
}
const BENCH = [[0.25, [4, 8, 2, 6]], [0.75, [4, 8, 2]], [0.5, [2, 3, 4, 5, 6, 7, 8, 9]], [0.1, [2, 3, 4, 5, 6, 7, 8, 9]], [0.05, [2, 4, 6, 8, 5, 3]], [0.01, [2, 3, 5, 7, 9]]];
const BENCH_WORD = { 0.25: 'one fourth of', 0.75: 'three fourths of', 0.5: 'half of', 0.1: 'one tenth of', 0.05: 'one twentieth of', 0.01: 'one hundredth of' };
const DEC_WORD = [
  (a, d, n) => [`Each smoothie costs $${a.toFixed(2)}. How much do ${d} smoothies cost?`, a * d, true],
  (a, d, n) => [`${n} runs ${dn(a)} km every day for ${d} days. How many kilometres is that?`, a * d, false],
  (a, d, n) => [`A potion recipe needs ${dn(a)} L of moonwater. How many litres for ${d} batches?`, a * d, false],
  (a, d, n) => [`A bag of apples has a mass of ${dn(a)} kg. What is the mass of ${d} bags, in kilograms?`, a * d, false],
];
const DEC_WORD_DIV = [
  (tot, d, n) => [`${n} and ${d - 1} friends share a $${tot.toFixed(2)} pizza bill equally. How much does each person pay?`, tot / d, true],
  (tot, d) => [`A ribbon ${dn(tot)} m long is cut into ${d} equal pieces. How long is each piece, in metres?`, tot / d, false],
  (tot, d) => [`${dn(tot)} L of juice is poured equally into ${d} jugs. How many litres are in each jug?`, tot / d, false],
  (tot, d) => [`A trail ${dn(tot)} km long is split into ${d} equal parts. How long is each part, in kilometres?`, tot / d, false],
];
function moneyOrDec(rng, o, val, isMoney, places, extra) {
  if (isMoney) {
    const c = Math.round(val * 100);
    if (c % 10 !== 0) return numq({ ...o, prompt: o.prompt + ' (Type dollars and cents.)', answer: clean(c / 100) });
    return mcq(rng, { ...o, correct: c, wrong: [c + 100, c - 100, c + 10, c * 10, Math.round(c / 10), ...extra.map((x) => Math.round(x * 100))].filter((x) => x > 0 && x !== c), format: (x) => fmtMoney(x) });
  }
  return decq(rng, { ...o, answer: clean(val) }, places, extra);
}

const decimals = gen([
  [1, 6, (t, rng) => {
    let a, d;
    if (t === 1) { a = clean(R(rng, 1, 9) / 10); d = R(rng, 2, 5); }
    else if (t === 2) { a = decOf(rng, 2, 4); d = R(rng, 2, 6); }
    else if (t <= 4) { a = decOf(rng, pick(rng, [1, 2]), 20); d = R(rng, 3, 9); }
    else { a = decOf(rng, 2, 99); d = R(rng, 4, 9); }
    const ans = clean(a * d), p = decPlaces(a);
    const slip = clean(ans * 10), slip2 = clean(Math.floor(a) * d + clean(a - Math.floor(a)));
    return decq(rng, {
      prompt: `${dn(a)} × ${d} = ?`,
      visual: t === 1 ? { type: 'numberline', min: 0, max: clean(a * (d + 2)), ticks: a, labels: [0, a], labelFormat: 'decimal', jumps: [...Array(d).keys()].map((i) => ({ from: clean(i * a), to: clean((i + 1) * a) })) } : undefined,
      answer: ans,
      hint: t === 1 ? `${dn(a)} × ${d} means ${d} jumps of ${dn(a)} on the number line. Count along the jumps, adding ${dn(a)} each time.` : `Multiply ${Math.round(a * 10 ** p)} × ${d} as if there were no decimal point. Then put the point back so the answer has ${numWords(p)} decimal place${p > 1 ? 's' : ''}. Check with an estimate: ${dn(a)} is about ${Math.round(a)}.`,
      explain: `${dn(a)} × ${d} = ${dn(ans)}. Check: ${dn(a)} is about ${Math.round(a)}, and ${Math.round(a)} × ${d} = ${Math.round(a) * d}.`,
    }, p, [slip, clean(ans / 10), slip2].filter((x) => x !== ans));
  }],
  [1, 6, (t, rng) => {
    const d = t === 1 ? pick(rng, [2, 4, 5]) : R(rng, 2, 9);
    let q, tot;
    for (let i = 0; i < 40; i++) {
      q = t === 1 ? clean(R(rng, 1, Math.floor(100 / d / 10)) / 10) : t === 2 ? decOf(rng, 1, 9) : t <= 4 ? decOf(rng, 2, 9) : decOf(rng, 2, 20);
      tot = clean(q * d);
      if (t >= 5 || decPlaces(tot) === decPlaces(q)) break;
    }
    if (t === 1 && tot > 1) return decimals(t, rng);
    return decq(rng, {
      prompt: t === 1 ? `Share ${dn(tot)} equally into ${d} parts. What is ${dn(tot)} ÷ ${d}?` : `${dn(tot)} ÷ ${d} = ?`,
      visual: t === 1 ? { type: 'hundredgrid', shaded: Math.round(tot * 100) } : undefined,
      answer: q,
      hint: t === 1 ? `The grid shows ${dn(tot)}: ${Math.round(tot * 100)} small squares are shaded. Split the shaded squares into ${d} equal groups, then write one group as a decimal.` : `Divide ${dn(tot)} by ${d} as if they were whole numbers, keeping the decimal point in the same place in your answer. Check by multiplying your answer by ${d}.`,
      explain: `${dn(tot)} ÷ ${d} = ${dn(q)}. Check: ${dn(q)} × ${d} = ${dn(tot)}.`,
    }, decPlaces(q), [clean(q * 10), clean(q / 10), clean(q + 0.1)]);
  }],
  [1, 3, (t, rng) => {
    const a = decOf(rng, t === 1 ? 1 : pick(rng, [1, 2]), t === 1 ? 8 : 30), b = decOf(rng, t === 1 ? 1 : pick(rng, [1, 2]), Math.max(0, Math.floor(a) - 1));
    const sub = chance(rng, 0.5) && b < a;
    const ans = clean(sub ? a - b : a + b);
    return decq(rng, {
      prompt: `${dn(a)} ${sub ? '−' : '+'} ${dn(b)} = ?`,
      visual: t === 1 ? { type: 'barmodel', whole: sub ? a : '?', parts: sub ? [b, '?'] : [a, b] } : undefined,
      answer: ans,
      hint: `${sub ? `Take ${dn(b)} away from ${dn(a)}` : `Join ${dn(a)} and ${dn(b)}`}. Line up the decimal points and add zeros so both numbers have two decimal places. Then work from the right.`,
      explain: `${dn(a)} ${sub ? '−' : '+'} ${dn(b)} = ${dn(ans)}.`,
    }, Math.max(decPlaces(a), decPlaces(b)));
  }],
  [3, 5, (t, rng) => {
    if (chance(rng, 0.5)) {
      const w = R(rng, 2, 19), a = clean(w + pick(rng, [-1, 1]) * R(rng, 1, 15) / 100), d = R(rng, 3, 9);
      const est = Math.round(a) * d;
      return mcq(rng, {
        prompt: `Which is the best estimate for ${dn(a)} × ${d}?`, correct: est, wrong: [est / 10, est * 10, est + d, Math.round(a) + d].filter((x) => x !== est && x > 0), format: dn,
        hint: `You only need a close answer. Round ${dn(a)} to the nearest whole number, then multiply by ${d}.`,
        explain: `${dn(a)} is about ${Math.round(a)}. ${Math.round(a)} × ${d} = ${est}.`,
      });
    }
    const d = R(rng, 3, 9), q = R(rng, 2, 12), tot = clean(q * d + pick(rng, [-1, 1]) * R(rng, 1, 40) / 100);
    return mcq(rng, {
      prompt: `Which is the best estimate for ${dn(tot)} ÷ ${d}?`, correct: q, wrong: [q * 10, clean(q / 10), q + 2, q - 2 > 0 ? q - 2 : q + 3], format: dn,
      hint: `You only need a close answer. Find a whole number close to ${dn(tot)} that is in the ${d} times table, then divide it by ${d}.`,
      explain: `${dn(tot)} is close to ${q * d}, and ${q * d} ÷ ${d} = ${q}.`,
    });
  }],
  [3, 7, (t, rng) => {
    const d = R(rng, 3, 9), whole = R(rng, 101, 999), a = clean(whole / 100), prod = whole * d;
    if (chance(rng, 0.5) || prod % 10 === 0) {
      return mcq(rng, {
        prompt: `${nm(rng)} knows that ${whole} × ${d} = ${fmtNum(prod)}. What is ${dn(a)} × ${d}?`,
        correct: clean(prod / 100), wrong: [clean(prod / 10), clean(prod / 1000), prod, clean(prod / 100 + 1)], format: dn,
        hint: `You know ${whole} × ${d} = ${fmtNum(prod)}, and ${dn(a)} is ${whole} hundredths. So the answer is ${fmtNum(prod)} hundredths: where does the decimal point go? Estimate to check: ${dn(a)} is about ${Math.round(a)}.`,
        explain: `${dn(a)} × ${d} = ${fmtNum(prod)} hundredths = ${dn(prod / 100)}. That matches the estimate ${Math.round(a)} × ${d} = ${Math.round(a) * d}.`,
      });
    }
    const q = R(rng, 101, 999), tot = q * d;
    if (tot > 9999) return decimals(t, rng);
    return mcq(rng, {
      prompt: `${nm(rng)} knows that ${fmtNum(tot)} ÷ ${d} = ${q}. What is ${dn(tot / 100)} ÷ ${d}?`,
      correct: clean(q / 100), wrong: [clean(q / 10), clean(q / 1000), q, clean(q / 100 + 0.1)], format: dn,
      hint: `${dn(tot / 100)} is ${fmtNum(tot)} hundredths. Divide the hundredths by ${d} using the fact you know, then change the hundredths back into a decimal. Estimate first so you know where the decimal point goes.`,
      explain: `${dn(tot / 100)} is ${fmtNum(tot)} hundredths. ${fmtNum(tot)} hundredths ÷ ${d} = ${q} hundredths = ${dn(q / 100)}.`,
    });
  }],
  [2, 4, (t, rng) => {
    const [b, ds] = pick(rng, BENCH), d = pick(rng, ds);
    const ans = clean(b * d);
    if (chance(rng, 0.4)) {
      return mcq(rng, {
        prompt: `${dn(b)} × ${d} is the same as…`, correct: `${BENCH_WORD[b]} ${d}`,
        wrong: Object.entries(BENCH_WORD).filter(([k]) => Number(k) !== b).map(([, w]) => `${w} ${d}`).concat([`${d} ÷ ${dn(b)}`, `double ${d}`]),
        hint: `Think of ${dn(b)} as a fraction: 0.5 is one half, 0.25 is one fourth, 0.75 is three fourths, 0.1 is one tenth, 0.05 is one twentieth and 0.01 is one hundredth. Which choice matches ${dn(b)} × ${d}?`,
        explain: `${dn(b)} = ${ftok({ n: Math.round(b * 100), d: 100 })}, so ${dn(b)} × ${d} is ${BENCH_WORD[b]} ${d}, which is ${dn(ans)}.`,
      });
    }
    return decq(rng, {
      prompt: `${dn(b)} × ${d} = ?`, answer: ans,
      hint: `${dn(b)} is the same as ${BENCH_WORD[b].replace(' of', '')}. So ${dn(b)} × ${d} means ${BENCH_WORD[b]} ${d}. Work that out.`,
      explain: `${dn(b)} × ${d} = ${BENCH_WORD[b]} ${d} = ${dn(ans)}.`,
    }, decPlaces(ans), [clean(ans * 10), clean(ans / 10), clean(b + d)]);
  }],
  [4, 7, (t, rng) => {
    const n = nm(rng);
    if (chance(rng, 0.5)) {
      const d = R(rng, 3, 9), a = chance(rng, 0.5) ? clean(R(rng, 150, 899) / 100) : clean(R(rng, 11, 99) / 10 + R(rng, 0, 5));
      const [prompt, val, money] = pick(rng, DEC_WORD)(a, d, n);
      return moneyOrDec(rng, {
        prompt, hint: `There are ${d} equal groups of ${dn(a)}, so multiply ${dn(a)} × ${d}. Estimate first (${dn(a)} is about ${Math.round(a)}) so you know where the decimal point goes.`,
        explain: `${dn(a)} × ${d} = ${dn(val)}.`,
      }, val, money, decPlaces(a), [clean(val * 10), clean(val / 10)]);
    }
    const d = R(rng, 2, 8), q = pick(rng, [clean(R(rng, 101, 999) / 100), clean(R(rng, 11, 99) / 10)]), tot = clean(q * d);
    if (decPlaces(tot) > 2) return decimals(t, rng);
    const [prompt, val, money] = pick(rng, DEC_WORD_DIV)(tot, d, n);
    return moneyOrDec(rng, {
      prompt, hint: `${dn(tot)} is being shared equally into ${d} parts, so divide ${dn(tot)} by ${d}. Check by multiplying your answer by ${d}.`,
      explain: `${dn(tot)} ÷ ${d} = ${dn(val)}. Check: ${dn(val)} × ${d} = ${dn(tot)}.`,
    }, val, money, decPlaces(q), [clean(val * 10), clean(val / 10)]);
  }],
  [5, 7, (t, rng) => {
    const d = R(rng, 3, 9), q = decOf(rng, pick(rng, [1, 2]), 12), p = clean(q * d);
    if (decPlaces(p) > 2) return decimals(t, rng);
    return decq(rng, {
      prompt: `□ × ${d} = ${dn(p)}. What number goes in the box?`, answer: q,
      hint: `The box times ${d} makes ${dn(p)}. Undo the multiplication: divide ${dn(p)} by ${d}.`,
      explain: `${dn(p)} ÷ ${d} = ${dn(q)}. Check: ${dn(q)} × ${d} = ${dn(p)}.`,
    }, decPlaces(q), [clean(q * 10), clean(q / 10)]);
  }],
  [4, 5, (t, rng) => {
    const a = decOf(rng, 1, 9), d = R(rng, 3, 9), ans = clean(a * d);
    const good = chance(rng, 0.4);
    const shown = good ? ans : pick(rng, [clean(ans / 10), clean(ans * 10)]);
    const n = nm(rng);
    const est = Math.round(a) * d;
    return fixedq({
      prompt: `${n} says ${dn(a)} × ${d} = ${dn(shown)}. Is that reasonable?`,
      choices: ['Yes, it is close to the estimate', 'No, it is far too big', 'No, it is far too small'],
      correct: good ? 'Yes, it is close to the estimate' : shown > ans ? 'No, it is far too big' : 'No, it is far too small',
      hint: `Is ${dn(shown)} close to the real answer? Round ${dn(a)} to a whole number and multiply by ${d} to estimate. Then decide: is ${dn(shown)} close to your estimate, far too big, or far too small?`,
      explain: `${dn(a)} is about ${Math.round(a)}, so the answer should be about ${est}. The exact answer is ${dn(ans)}.`,
    });
  }],
  [6, 7, (t, rng) => {
    const n = nm(rng), k = R(rng, 0, 2);
    if (k === 0) {
      const d = R(rng, 2, 4), each = R(rng, 105, 480) * 5 / 100, bill = [10, 20, 50].find((b) => b > each * d);
      if (!bill) return decimals(t, rng);
      const ch = clean(bill - each * d);
      return moneyOrDec(rng, {
        prompt: `${n} buys ${d} books at $${each.toFixed(2)} each and pays with a $${bill} bill. How much change does ${n} get?`,
        hint: `There are two steps. First find the cost of ${d} books: ${d} × $${each.toFixed(2)}. Then subtract that from the $${bill} bill.`,
        explain: `${d} × $${each.toFixed(2)} = $${(each * d).toFixed(2)}. $${bill} − $${(each * d).toFixed(2)} = $${ch.toFixed(2)}.`,
      }, ch, true, 2, [clean(each * d)]);
    }
    if (k === 1) {
      const d = R(rng, 3, 9), q = clean(R(rng, 11, 99) / 10), tot = clean(q * d), used = R(rng, 1, d - 1);
      return decq(rng, {
        prompt: `A bag holds ${dn(tot)} kg of rice. It is split equally into ${d} small bags. ${n} uses ${used} of the small bags. How many kilograms of rice are left?`,
        answer: clean(q * (d - used)),
        hint: `There are two steps. First find the mass of one small bag: ${dn(tot)} ÷ ${d}. Then multiply by the number of small bags that are left (${d} − ${used}).`,
        explain: `${dn(tot)} ÷ ${d} = ${dn(q)} kg per bag. ${d - used} bags are left: ${dn(q)} × ${d - used} = ${dn(q * (d - used))} kg.`,
      }, decPlaces(q), [clean(q * used), clean(tot - used)]);
    }
    const len = pick(rng, [1.2, 2.4, 3.6, 4.8, 1.5, 2.5, 3.5, 4.5, 5.6, 6.3]), d = pick(rng, [2, 3, 4, 5, 6, 7, 8, 9].filter((x) => Math.round(len * 100) % x === 0 && Math.round(len * 100) / x >= 10));
    if (!d) return decimals(t, rng);
    return numq({
      prompt: `A board ${dn(len)} m long is cut into ${d} equal pieces. How many centimetres long is each piece?`, answer: Math.round(len * 100) / d,
      hint: `1 m = 100 cm, so first change ${dn(len)} m into centimetres. Then divide by ${d} to find the length of each piece.`,
      explain: `${dn(len)} m = ${Math.round(len * 100)} cm. ${Math.round(len * 100)} ÷ ${d} = ${Math.round(len * 100) / d} cm.`,
    });
  }],
  // multi-step decimal problems
  [6, 7, (t, rng) => {
    const n = nm(rng);
    if (chance(rng, 0.5)) {
      const d = R(rng, 3, 8), q = clean(R(rng, 11, 95) / 100), left = clean(R(rng, 1, 9) / 10), tot = clean(q * d + left);
      return decq(rng, {
        prompt: `A jug holds ${dn(tot)} L of juice. ${n} fills ${d} glasses equally and has ${dn(left)} L left in the jug. How much juice is in each glass, in litres?`, answer: q,
        hint: `There are two steps. First take away what is left in the jug: ${dn(tot)} − ${dn(left)}. Then share that amount equally among the ${d} glasses.`,
        explain: `${dn(tot)} − ${dn(left)} = ${dn(q * d)}. ${dn(q * d)} ÷ ${d} = ${dn(q)} L.`,
      }, decPlaces(q), [clean(tot / d), clean(q + 0.1), clean(q * 10)]);
    }
    const ka = R(rng, 2, 5), kb = R(rng, 2, 4), pa = R(rng, 21, 90) * 5, pb = R(rng, 11, 60) * 5;
    const total = ka * pa + kb * pb, bill = [1000, 2000, 5000].find((b) => b > total);
    if (!bill) return decimals(t, rng);
    const [ia, ib] = pick(rng, [['notebooks', 'pens'], ['potions', 'feathers'], ['muffins', 'juice boxes'], ['comics', 'bookmarks']]);
    return moneyOrDec(rng, {
      prompt: `${n} buys ${ka} ${ia} at ${fmtMoney(pa)} each and ${kb} ${ib} at ${fmtMoney(pb)} each, and pays with a $${bill / 100} bill. How much change does ${n} get?`,
      hint: `There are three steps. Find the cost of the ${ia} (${ka} × ${fmtMoney(pa)}) and of the ${ib} (${kb} × ${fmtMoney(pb)}). Add them, then subtract the total from $${bill / 100}.`,
      explain: `${ka} × ${fmtMoney(pa)} = ${fmtMoney(ka * pa)} and ${kb} × ${fmtMoney(pb)} = ${fmtMoney(kb * pb)}. Total: ${fmtMoney(total)}. $${bill / 100} − ${fmtMoney(total)} = ${fmtMoney(bill - total)}.`,
    }, (bill - total) / 100, true, 2, [total / 100]);
  }],
]);

// ---------------------------------------------------------------------------
// SD4  Benchmark fractions and mixed numbers: +, −, ×, ÷
// ---------------------------------------------------------------------------
const FAMS = [[2, 4, 8], [2, 5, 10], [3, 6, 12], [2, 3, 6], [2, 4, 12]];
function randFrac(rng, d) { return F(R(rng, 1, d - 1), d); }
const fwrong = (correct, list) => {
  const seen = [];
  return list.filter((f) => f && f.d > 0 && f.n > 0 && !feq(f, correct) && !seen.some((s) => feq(s, f)) && seen.push(f));
};
const tokRaw = (n, d) => (n > d && n % d ? mixed(Math.floor(n / d), n % d, d) : frac(n, d));
// "a = x and b = y. " for the fractions that need renaming to denominator L (skips ones already in that form)
function renames(fs, L) {
  const parts = fs.filter((f) => f.d !== L).map((f) => `${tokRaw(f.n, f.d)} = ${tokRaw(f.n * L / f.d, L)}`);
  return parts.length ? `Rename: ${parts.join(' and ')}. ` : '';
}
const chain = (x, y) => (x === y ? x : `${x} = ${y}`);
const FRAC_WORD = [
  (a, b, n) => [`${n} walked ${ftok(a)} km to the park and then ${ftok(b)} km to the library. How far did ${n} walk?`, fadd(a, b), 'km'],
  (a, b, n) => [`A potion jar had ${ftok(a)} L. ${n} used ${ftok(b)} L. How much is left?`, fsub(a, b), 'L'],
  (a, b, n) => [`A dragon ate ${ftok(a)} of a pie, and its friend ate ${ftok(b)} of the pie. How much pie did they eat altogether?`, fadd(a, b), ''],
  (a, b, n) => [`${n} had ${ftok(a)} m of ribbon and cut off ${ftok(b)} m. How much ribbon is left?`, fsub(a, b), 'm'],
];

const fractions = gen([
  // add
  [1, 4, (t, rng) => {
    const fam = pick(rng, FAMS);
    let a, b;
    if (t === 1) { const d = pick(rng, fam.slice(1)); const n1 = R(rng, 1, d - 2), n2 = R(rng, 1, d - 1 - n1); a = { n: n1, d }; b = { n: n2, d }; }
    else if (t === 2) { const [d1, d2] = sample(rng, fam, 2); a = randFrac(rng, d1); b = randFrac(rng, d2); }
    else { const [d1, d2] = sample(rng, fam, 2); a = fadd(F(R(rng, 1, 3), 1), randFrac(rng, d1)); b = fadd(F(R(rng, 0, 2), 1), randFrac(rng, d2)); }
    const ans = fadd(a, b);
    const L = lcm(a.d, b.d);
    if (t === 4) {
      const [prompt, val, unit] = pick(rng, FRAC_WORD.filter((w, i) => i % 2 === 0))(a, b, nm(rng));
      return mcq(rng, {
        prompt, correct: val, wrong: fwrong(val, [F(a.n + b.n, a.d + b.d), fadd(val, F(1, L)), fsub(val, F(1, L)), F(a.n + b.n, Math.max(a.d, b.d)), fadd(val, F(1, 1))]), format: (f) => ftok(f) + (unit ? ` ${unit}` : ''),
        hint: `Add ${ftok(a)} and ${ftok(b)}. First rename them with the same bottom number (${L} works), then add the fractions and simplify.`,
        explain: `${ftok(a)} + ${ftok(b)} = ${ftok(val)}${unit ? ' ' + unit : ''}.`,
      });
    }
    const visual = t <= 2 ? { type: 'fractionbar', bars: [{ parts: a.d, shaded: a.n }, { parts: b.d, shaded: b.n }, { parts: L, shaded: 0, label: '?' }] } : undefined;
    return mcq(rng, {
      prompt: `${tokRaw(a.n, a.d)} + ${tokRaw(b.n, b.d)} = ?`, visual,
      correct: ans, wrong: fwrong(ans, [F(a.n + b.n, a.d + b.d), F(a.n * (L / a.d) + b.n, L), fadd(ans, F(1, L)), fsub(ans, F(1, L)), F(a.n + b.n, Math.max(a.d, b.d))]), format: ftok,
      hint: a.d === b.d ? `The bottom numbers are the same (${pName(a.d)}), so add the top numbers and keep the bottom. Then simplify if you can.` : `The bottom numbers are different, so rename both fractions as ${pName(L)} (bottom number ${L}). Then add the top numbers and simplify.`,
      explain: `${renames([a, b], L)}${tokRaw(a.n * L / a.d, L)} + ${tokRaw(b.n * L / b.d, L)} = ${chain(tokRaw(a.n * L / a.d + b.n * L / b.d, L), ftok(ans))}.`,
    });
  }],
  // subtract
  [1, 5, (t, rng) => {
    const fam = pick(rng, FAMS);
    let a, b;
    for (let i = 0; i < 30; i++) {
      if (t === 1) { const d = pick(rng, fam.slice(1)); const n1 = R(rng, 2, d - 1); a = { n: n1, d }; b = { n: R(rng, 1, n1 - 1), d }; }
      else if (t === 2) { const [d1, d2] = sample(rng, fam, 2); a = randFrac(rng, d1); b = randFrac(rng, d2); }
      else { const [d1, d2] = sample(rng, fam, 2); a = fadd(F(R(rng, 2, 4), 1), randFrac(rng, d1)); b = fadd(F(R(rng, 0, 1), 1), randFrac(rng, d2)); }
      if (fval(a) > fval(b)) break;
    }
    if (fval(a) <= fval(b)) [a, b] = [b, a];
    if (feq(a, b)) return fractions(t, rng);
    const ans = fsub(a, b), L = lcm(a.d, b.d);
    if (t === 4 && chance(rng, 0.6)) {
      const [prompt, val, unit] = pick(rng, FRAC_WORD.filter((w, i) => i % 2 === 1))(a, b, nm(rng));
      return mcq(rng, {
        prompt, correct: val, wrong: fwrong(val, [fadd(val, F(1, L)), fsub(val, F(1, L)), fadd(val, F(1, 1)), fadd(a, b), a.d !== b.d && a.n > b.n && a.n < a.d ? F(a.n - b.n, Math.abs(a.d - b.d) || 1) : null]), format: (f) => ftok(f) + (unit ? ` ${unit}` : ''),
        hint: `Take ${ftok(b)} away from ${ftok(a)}. Rename both with the bottom number ${L}. If the fraction part you take away is bigger, trade one whole for ${frac(L, L)} first.`,
        explain: `${ftok(a)} − ${ftok(b)} = ${ftok(val)}${unit ? ' ' + unit : ''}.`,
      });
    }
    const visual = t <= 2 ? { type: 'fractionbar', bars: [{ parts: a.d, shaded: a.n, label: 'start' }, { parts: b.d, shaded: b.n, label: 'take away' }] } : undefined;
    return mcq(rng, {
      prompt: `${tokRaw(a.n, a.d)} − ${tokRaw(b.n, b.d)} = ?`, visual,
      correct: ans, wrong: fwrong(ans, [a.d !== b.d && a.n > b.n && a.n < a.d ? F(a.n - b.n, Math.abs(a.d - b.d)) : null, fadd(ans, F(1, L)), fsub(ans, F(1, L)), fadd(ans, F(1, 1)), fadd(a, b), F(Math.abs(a.n - b.n) || 1, Math.max(a.d, b.d))]), format: ftok,
      hint: a.d === b.d ? 'The bottom numbers are the same, so subtract the top numbers and keep the bottom. Then simplify if you can.' : `Rename both fractions with the bottom number ${L}. If the fraction part you take away is bigger, trade one whole for ${frac(L, L)} first. Then subtract and simplify.`,
      explain: `${renames([a, b], L)}${tokRaw(a.n * L / a.d, L)} − ${tokRaw(b.n * L / b.d, L)} = ${chain(tokRaw(a.n * L / a.d - b.n * L / b.d, L), ftok(ans))}.`,
    });
  }],
  // simplify
  [1, 3, (t, rng) => {
    const d = pick(rng, t === 1 ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 8, 10]), k = t === 1 ? R(rng, 2, Math.max(2, Math.floor(12 / d))) : R(rng, 2, 5);
    const n = t >= 2 && chance(rng, 0.5) ? R(rng, d + 1, 3 * d) : R(rng, 1, d - 1);
    const f = F(n, d);
    if (f.n % f.d === 0) return fractions(t, rng);
    const N = f.n * k, D = f.d * k;
    return mcq(rng, {
      prompt: n > d ? `Write ${frac(N, D)} as a mixed number in simplest form.` : `Write ${frac(N, D)} in simplest form.`,
      visual: t === 1 && D <= 12 ? { type: 'fractionbar', bars: [{ parts: D, shaded: N }, { parts: f.d, shaded: f.n }] } : undefined,
      correct: f, wrong: fwrong(f, [F(f.n + 1, f.d), F(f.n, f.d + 1), F(f.n, f.d * 2), n > d ? fadd(f, F(1, 1)) : F(N - 1, D - 1), F(Math.max(1, f.n - 1), f.d)]), format: ftok,
      hint: `Simplest form uses the smallest possible numbers. Find the biggest number that divides both ${N} and ${D}, and divide the top and bottom by it.${n > d ? ' Then change it to a mixed number: how many wholes, and what is left?' : ''}`,
      explain: `The greatest common factor of ${N} and ${D} is ${k}. ${frac(N, D)} = ${frac(f.n, f.d)}${f.n > f.d ? ` = ${ftok(f)}` : ''}.`,
    });
  }],
  // common denominator
  [2, 4, (t, rng) => {
    const pairs = [[3, 4], [2, 5], [6, 4], [3, 8], [5, 4], [6, 8], [10, 4], [3, 5], [12, 8], [6, 9], [2, 3], [4, 10]];
    const [d1, d2] = pick(rng, pairs);
    const a = randFrac(rng, d1), b = randFrac(rng, d2);
    const L = lcm(a.d, b.d);
    if (a.d === b.d) return fractions(t, rng);
    return numq({
      prompt: `What is the lowest common denominator for ${ftok(a)} and ${ftok(b)}?`, answer: L,
      hint: `The common denominator must be in both the ${a.d} and ${b.d} times tables. Count up in the ${Math.max(a.d, b.d)} times table and stop at the first number that ${Math.min(a.d, b.d)} also divides.`,
      explain: `Multiples of ${a.d}: ${[1, 2, 3, 4].map((i) => a.d * i).join(', ')}… Multiples of ${b.d}: ${[1, 2, 3, 4].map((i) => b.d * i).join(', ')}… The lowest common one is ${L}.`,
    });
  }],
  // fraction × whole, fraction of a set
  [2, 5, (t, rng) => {
    if (chance(rng, 0.45)) {
      const d = pick(rng, [2, 3, 4, 5, 6, 8, 10]), n = R(rng, 1, d - 1), each = R(rng, 2, t <= 2 ? 5 : 12), tot = d * each;
      return numq({
        prompt: `What is ${frac(n, d)} of ${tot}?`, answer: n * each,
        visual: t <= 3 && tot <= 40 ? { type: 'groups', groups: d, each } : undefined,
        hint: `${frac(n, d)} of ${tot} means: split ${tot} into ${d} equal groups, then take ${n} of the groups. How many are in one group?`,
        explain: `${tot} ÷ ${d} = ${each}. ${n} × ${each} = ${n * each}.`,
      });
    }
    const d = pick(rng, [2, 3, 4, 5, 6, 8, 10]), n = R(rng, 1, d - 1), w = R(rng, 2, t <= 2 ? 4 : 9);
    const f = F(n, d), ans = fmul(f, F(w, 1));
    return mcq(rng, {
      prompt: `${w} × ${ftok(f)} = ?`,
      visual: t <= 2 && w <= 4 ? { type: 'fractionbar', bars: [...Array(w)].map(() => ({ parts: f.d, shaded: f.n })) } : undefined,
      correct: ans, wrong: fwrong(ans, [F(f.n, f.d * w), F(f.n + w, f.d), f, fadd(ans, F(1, f.d)), fsub(ans, F(1, f.d))]), format: ftok,
      hint: `${w} × ${ftok(f)} means ${w} groups of ${ftok(f)}. Multiply the top number by ${w} and keep the bottom. Then change it to a mixed number and simplify if you can.`,
      explain: `${w} × ${ftok(f)} = ${frac(f.n * w, f.d)}${ftok(ans) !== frac(f.n * w, f.d) ? ` = ${ftok(ans)}` : ''}.`,
    });
  }],
  // division with whole numbers
  [4, 7, (t, rng) => {
    if (chance(rng, 0.5)) {
      const d = pick(rng, [2, 3, 4, 5, 6, 8]), n = R(rng, 1, d - 1), w = R(rng, 2, 4), f = F(n, d), ans = fdiv(f, F(w, 1));
      return mcq(rng, {
        prompt: `${ftok(f)} ÷ ${w} = ?`,
        visual: t === 4 ? { type: 'fractionbar', bars: [{ parts: f.d, shaded: f.n }, { parts: f.d * w <= 12 ? f.d * w : f.d, shaded: f.d * w <= 12 ? f.n : 0 }] } : undefined,
        correct: ans, wrong: fwrong(ans, [fmul(f, F(w, 1)), F(f.n, f.d + w), F(f.n * w, f.d * w * w), F(f.n + 1, f.d * w)]), format: ftok,
        hint: `Sharing ${ftok(f)} into ${w} equal parts makes each part ${w} times smaller. Dividing by ${w} is the same as multiplying by ${frac(1, w)}, so multiply the bottom number by ${w}.`,
        explain: `${ftok(f)} ÷ ${w} = ${ftok(f)} × ${frac(1, w)} = ${ftok(ans)}.`,
      });
    }
    const d = pick(rng, [2, 3, 4, 5, 6, 8, 10]), w = R(rng, 2, t >= 6 ? 9 : 6);
    const n = t >= 6 && chance(rng, 0.5) ? pick(rng, [...Array(d - 1).keys()].map((x) => x + 1).filter((x) => (w * d) % x === 0 && x > 1)) || 1 : 1;
    return numq({
      prompt: `${w} ÷ ${frac(n, d)} = ?`, answer: (w * d) / n,
      visual: t === 4 && w <= 4 && d <= 6 ? { type: 'fractionbar', bars: [...Array(w)].map(() => ({ parts: d, shaded: d })) } : undefined,
      hint: `How many ${n === 1 ? pName(d) : `groups of ${frac(n, d)}`} fit into ${w}? Each whole holds ${numWords(d)} ${pName(d)}, so first find how many ${pName(d)} are in ${w} wholes${n > 1 ? `, then make groups of ${n}` : ''}.`,
      explain: `Each whole has ${d} ${fracSay(2, d).split(' ').pop()}, so ${w} wholes have ${w * d}.${n > 1 ? ` Groups of ${n}: ${w * d} ÷ ${n} = ${(w * d) / n}.` : ''} So ${w} ÷ ${frac(n, d)} = ${(w * d) / n}.`,
    });
  }],
  // fraction × fraction, mixed × fraction
  [5, 7, (t, rng) => {
    const fam = pick(rng, FAMS);
    let a = randFrac(rng, pick(rng, fam)), b = randFrac(rng, pick(rng, fam));
    if (t >= 6 && chance(rng, 0.6)) a = fadd(F(R(rng, 1, 2), 1), a);
    const ans = fmul(a, b);
    return mcq(rng, {
      prompt: `${ftok(a)} × ${ftok(b)} = ?`,
      correct: ans, wrong: fwrong(ans, [F(a.n + b.n, a.d + b.d), F(a.n * b.d, a.d * b.n), fadd(a, b), F(a.n * b.n, a.d + b.d), fadd(ans, F(1, ans.d))]), format: ftok,
      hint: fval(a) > 1 ? `Change ${ftok(a)} to an improper fraction first. Then multiply the top numbers together and the bottom numbers together, and simplify.` : 'Multiply the top numbers together and the bottom numbers together, then simplify. Taking a fraction OF a fraction gives a smaller answer.',
      explain: `${fval(a) > 1 ? `${ftok(a)} = ${frac(a.n, a.d)}. ` : ''}${frac(a.n, a.d)} × ${frac(b.n, b.d)} = ${chain(frac(a.n * b.n, a.d * b.d), ftok(ans))}. The answer is ${fval(b) < 1 ? `less than ${ftok(a)}, because you took part of it` : 'reasonable'}.`,
    });
  }],
  // fraction ÷ fraction
  [6, 7, (t, rng) => {
    const fam = pick(rng, FAMS);
    const d = Math.max(...fam), unit = F(R(rng, 1, 2), d);
    const k = R(rng, 2, 8);
    let a = fmul(unit, F(k, 1));
    if (t === 7 && chance(rng, 0.5)) a = fadd(a, F(R(rng, 1, 2), 1));
    const ans = fdiv(a, unit);
    if (ans.d === 1) {
      return numq({
        prompt: `${ftok(a)} ÷ ${ftok(unit)} = ?`, answer: ans.n,
        hint: `Rename both numbers as ${pName(d)}. Then ask: how many ${ftok(unit)} fit into ${ftok(a)}? Divide the top numbers.`,
        explain: `${renames([a, unit], d)}${frac(a.n * (d / a.d), d)} ÷ ${frac(unit.n * (d / unit.d), d)} = ${a.n * (d / a.d)} ÷ ${unit.n * (d / unit.d)} = ${ans.n}.`,
      });
    }
    return mcq(rng, {
      prompt: `${ftok(a)} ÷ ${ftok(unit)} = ?`,
      correct: ans, wrong: fwrong(ans, [fmul(a, unit), F(ans.n + ans.d, ans.d), F(ans.d, ans.n), fsub(ans, F(1, ans.d))]), format: ftok,
      hint: `Rename both numbers as ${pName(d)}. Then ask: how many ${ftok(unit)} fit into ${ftok(a)}? Divide the top numbers, and write any leftover as a fraction.`,
      explain: `With denominator ${d}: ${frac(a.n * (d / a.d), d)} ÷ ${frac(unit.n * (d / unit.d), d)} = ${a.n * (d / a.d)} ÷ ${unit.n * (d / unit.d)} = ${ftok(ans)}.`,
    });
  }],
  // estimate
  [3, 5, (t, rng) => {
    const w1 = R(rng, 1, 5), w2 = R(rng, 1, 4);
    const a = fadd(F(w1, 1), pick(rng, [F(7, 8), F(9, 10), F(1, 10), F(1, 8), F(5, 6), F(1, 6), F(11, 12)]));
    const b = fadd(F(w2, 1), pick(rng, [F(7, 8), F(9, 10), F(1, 10), F(1, 8), F(1, 12)]));
    const sub = chance(rng, 0.4) && fval(a) > fval(b) + 1;
    const est = sub ? Math.round(fval(a)) - Math.round(fval(b)) : Math.round(fval(a)) + Math.round(fval(b));
    return mcn(rng, {
      prompt: `About how much is ${ftok(a)} ${sub ? '−' : '+'} ${ftok(b)}?`, correct: est, extra: [w1 + w2, est + 1, est - 1, est + 2], min: 0,
      format: (x) => `about ${x}`,
      hint: `You only need a close answer. Round ${ftok(a)} and ${ftok(b)} to the nearest whole number: is each fraction part more or less than one half? Then ${sub ? 'subtract' : 'add'} the whole numbers.`,
      explain: `${ftok(a)} ≈ ${Math.round(fval(a))} and ${ftok(b)} ≈ ${Math.round(fval(b))}. ${Math.round(fval(a))} ${sub ? '−' : '+'} ${Math.round(fval(b))} = ${est}.`,
    });
  }],
  // word problems with × and ÷
  [5, 7, (t, rng) => {
    const n = nm(rng);
    if (chance(rng, 0.5)) {
      const q = fadd(F(R(rng, 1, 3), 1), F(pick(rng, [1, 1, 3]), pick(rng, [2, 4]))), k = R(rng, 2, 4);
      const q2 = F(q.n, q.d), ans = fmul(q2, F(k, 1));
      return mcq(rng, {
        prompt: `A recipe needs ${ftok(q2)} cups of oats. ${n} makes ${k} batches. How many cups of oats are needed?`,
        correct: ans, wrong: fwrong(ans, [fadd(q2, F(k, 1)), F(Math.floor(fval(q2)) * k + (q2.n % q2.d), q2.d), fadd(ans, F(1, q2.d)), fsub(ans, F(1, q2.d))]), format: (f) => `${ftok(f)} cups`,
        hint: `${k} batches means ${k} × ${ftok(q2)} cups. Multiply the whole number part by ${k} and the fraction part by ${k}, then add them together.`,
        explain: `${k} × ${ftok(q2)} = ${k} × ${Math.floor(fval(q2))} + ${k} × ${frac(q2.n % q2.d, q2.d)} = ${k * Math.floor(fval(q2))} + ${ftok(F(k * (q2.n % q2.d), q2.d))} = ${ftok(ans)} cups.`,
      });
    }
    const d = pick(rng, [2, 4, 8, 3, 6]), len = fadd(F(R(rng, 1, 4), 1), F(pick(rng, [0, 1]) * R(rng, 1, d - 1), d));
    const ans = fdiv(len, F(1, d));
    return numq({
      prompt: `${n} has ${ftok(len)} m of ribbon and cuts it into pieces that are each ${frac(1, d)} m long. How many pieces?`, answer: ans.n,
      hint: `Each piece is ${frac(1, d)} m, so ask: how many ${pName(d)} are in ${ftok(len)}? Each whole metre makes ${numWords(d)} pieces.`,
      explain: `Each metre makes ${d} pieces. ${ftok(len)} = ${frac(ans.n, d)}, so there are ${ans.n} pieces.`,
    });
  }],
  // two-step fraction word problems
  [6, 7, (t, rng) => {
    const n = nm(rng), fam = pick(rng, FAMS);
    if (chance(rng, 0.5)) {
      const start = fadd(F(R(rng, 3, 5), 1), randFrac(rng, pick(rng, fam))), used = fadd(F(R(rng, 1, 2), 1), randFrac(rng, pick(rng, fam))), jugs = R(rng, 2, 4);
      const left = fsub(start, used);
      if (fval(left) <= 0) return fractions(t, rng);
      const each = fdiv(left, F(jugs, 1));
      return mcq(rng, {
        prompt: `${n} had ${ftok(start)} L of lemonade and drank ${ftok(used)} L. ${n} pours the rest equally into ${jugs} bottles. How much goes in each bottle?`,
        correct: each, wrong: fwrong(each, [left, fdiv(start, F(jugs, 1)), fsub(each, F(1, each.d)), fadd(each, F(1, each.d)), fmul(left, F(jugs, 1))]), format: (f) => `${ftok(f)} L`,
        hint: `There are two steps. First subtract to find what is left: ${ftok(start)} − ${ftok(used)}. Then divide that amount by ${jugs}.`,
        explain: `${ftok(start)} − ${ftok(used)} = ${ftok(left)}. ${ftok(left)} ÷ ${jugs} = ${ftok(each)} L.`,
      });
    }
    const daily = fadd(F(R(rng, 1, 2), 1), randFrac(rng, pick(rng, fam))), days = R(rng, 2, 5), extra = randFrac(rng, pick(rng, fam));
    const walked = fmul(daily, F(days, 1)), tot = fadd(walked, extra);
    return mcq(rng, {
      prompt: `${n} walks ${ftok(daily)} km each day for ${days} days, then walks ${ftok(extra)} km more. How far does ${n} walk altogether?`,
      correct: tot, wrong: fwrong(tot, [fadd(daily, extra), walked, fadd(tot, F(1, tot.d)), fsub(tot, F(1, tot.d)), fadd(walked, F(1, 1))]), format: (f) => `${ftok(f)} km`,
      hint: `There are two steps. First multiply: ${days} × ${ftok(daily)} km. Then add the extra ${ftok(extra)} km, using a common denominator.`,
      explain: `${days} × ${ftok(daily)} = ${ftok(walked)}. ${ftok(walked)} + ${ftok(extra)} = ${ftok(tot)} km.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD5  Order of operations (no exponents, whole numbers)
// ---------------------------------------------------------------------------
function tokenize(s) { return s.match(/\d+|[+−×÷()]/g); }
function evalTokens(tokens, ltr = false) {
  let pos = 0;
  const ap = (a, op, b) => {
    if (a == null || b == null) return null;
    let r;
    if (op === '+') r = a + b; else if (op === '−') r = a - b; else if (op === '×') r = a * b;
    else { if (b === 0 || a % b !== 0) return null; r = a / b; }
    return r < 0 ? null : r;
  };
  const primary = () => { const t = tokens[pos++]; if (t === '(') { const v = expr(); pos++; return v; } return Number(t); };
  const term = () => { let v = primary(); while (tokens[pos] === '×' || tokens[pos] === '÷') { const op = tokens[pos++]; v = ap(v, op, primary()); } return v; };
  function expr() {
    if (ltr) { let v = primary(); while (pos < tokens.length && tokens[pos] !== ')') { const op = tokens[pos++]; v = ap(v, op, primary()); } return v; }
    let v = term(); while (tokens[pos] === '+' || tokens[pos] === '−') { const op = tokens[pos++]; v = ap(v, op, term()); } return v;
  }
  return expr();
}
const ev = (s) => evalTokens(tokenize(s));
const evL = (s) => evalTokens(tokenize(s), true);
const evNB = (s) => ev(s.replace(/[()]/g, ''));
const OT = {
  1: ['a + b × c', 'a − b × c', 'a + b ÷ c', 'a × b + c', 'a − b ÷ c'],
  2: ['(a + b) × c', 'a × (b + c)', '(a − b) × c', 'a × (b − c)', '(a + b) ÷ c', 'a + b × c'],
  3: ['a + b × c − d', 'a − b ÷ c + d', 'a × b − c × d', 'a + b × c ÷ d', 'a × b + c ÷ d', '(a + b) × c − d'],
  5: ['a × (b + c) − d ÷ e', '(a − b) × (c + d)', 'a + (b + c) × d', '(a + b) × c − d × e', 'a ÷ (b + c) × d', 'a + b × c − d ÷ e'],
  7: ['a × (b + c × d)', '(a + b × c) ÷ d', 'a − (b − c) × d', '(a × b − c) ÷ d + e', 'a + b × (c − d) ÷ e', '(a + b) × (c − d) ÷ e'],
};
function makeExpr(rng, t, tmpl) {
  const key = t <= 1 ? 1 : t === 2 ? 2 : t <= 4 ? 3 : t <= 6 ? 5 : 7;
  for (let i = 0; i < 300; i++) {
    const tp = tmpl || pick(rng, OT[key]);
    const vals = {};
    for (const L of 'abcde') vals[L] = R(rng, t <= 1 ? 2 : 1, t <= 1 ? 9 : 12);
    if (t <= 2 && tp.startsWith('a ') && /[×÷]/.test(tp)) vals.a = R(rng, 5, 30);
    const s = tp.replace(/[a-e]/g, (m) => String(vals[m]));
    const v = ev(s), l = evL(s), nb = evNB(s);
    if (v == null || v > 200 || /÷ 1\b/.test(s) || /× 1\b/.test(s)) continue;
    if (i < 250 && !/\(/.test(tp) && (l === v || l == null)) continue;
    if (i < 250 && /\(/.test(tp) && (nb === v || nb == null)) continue;
    return { s, v, l, nb, tp };
  }
  return { s: '6 + 2 × 3', v: 12, l: 24, nb: 12, tp: 'a + b × c' };
}
function firstStep(s) {
  const tk = tokenize(s);
  let depth = 0;
  const opsAt = [];
  tk.forEach((x) => { if (x === '(') depth++; else if (x === ')') depth--; else if (/[+−×÷]/.test(x)) opsAt.push({ depth, x }); });
  const flat = tk.filter((x) => x !== '(' && x !== ')');
  const nums = flat.filter((x, i) => i % 2 === 0);
  const labels = opsAt.map((o, k) => `${nums[k]} ${o.x} ${nums[k + 1]}`);
  const maxD = Math.max(...opsAt.map((o) => o.depth));
  const cand = opsAt.map((o, k) => ({ ...o, k })).filter((o) => o.depth === maxD);
  const op = cand.find((o) => o.x === '×' || o.x === '÷') || cand[0];
  return { label: labels[op.k], all: labels };
}
const OO_STORY = [
  (rng, n) => { const a = R(rng, 2, 6), b = R(rng, 4, 10), c = R(rng, 2, 9); return [`${n} buys ${a} packs of ${b} stickers and gets ${c} more stickers. Which expression gives the total?`, `${a} × ${b} + ${c}`, [`${a} × (${b} + ${c})`, `${a} + ${b} × ${c}`, `(${a} + ${b}) × ${c}`]]; },
  (rng, n) => { const a = R(rng, 25, 60), b = R(rng, 2, 5), c = R(rng, 2, 5); return [`${n} has ${a} gems and gives ${b} friends ${c} gems each. Which expression shows how many gems are left?`, `${a} − ${b} × ${c}`, [`(${a} − ${b}) × ${c}`, `${a} − ${b} + ${c}`, `${a} × ${b} − ${c}`]]; },
  (rng, n) => { const k = R(rng, 2, 6), x = k * R(rng, 1, 5), y = k * R(rng, 1, 5); return [`${k} friends share ${x} apples and ${y} pears equally. Which expression shows how many pieces of fruit each friend gets?`, `(${x} + ${y}) ÷ ${k}`, [`${x} + ${y} ÷ ${k}`, `${x} ÷ ${k} + ${y}`, `${k} ÷ (${x} + ${y})`]]; },
  (rng, n) => { const p = R(rng, 4, 12), a = R(rng, 1, 4), b = R(rng, 2, 5); return [`Tickets cost $${p} each. ${n} buys tickets for ${a} adults and ${b} kids. Which expression gives the total cost?`, `${p} × (${a} + ${b})`, [`${p} × ${a} + ${b}`, `${p} + ${a} × ${b}`, `(${p} + ${a}) × ${b}`]]; },
  (rng, n) => { const a = R(rng, 3, 8), b = R(rng, 6, 12), c = R(rng, 2, 5); return [`${n} has ${a} boxes of ${b} crayons and loses ${c} crayons. Which expression shows how many are left?`, `${a} × ${b} − ${c}`, [`${a} × (${b} − ${c})`, `${a} + ${b} − ${c}`, `${b} − ${c} × ${a}`]]; },
];
function bracketings(s) {
  const tk = tokenize(s.replace(/[()]/g, ''));
  const nums = tk.filter((x, i) => i % 2 === 0), ops = tk.filter((x, i) => i % 2 === 1);
  const out = [];
  for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) {
    if (i === 0 && j === nums.length - 1) continue;
    let str = '';
    nums.forEach((nmb, k) => { if (k === i) str += '('; str += nmb; if (k === j) str += ')'; if (k < ops.length) str += ` ${ops[k]} `; });
    out.push(str);
  }
  return out;
}

const order = gen([
  [1, 5, (t, rng) => {
    const e = makeExpr(rng, t);
    return numq({
      prompt: `${e.s} = ?`, visual: t <= 2 ? { type: 'expression', text: e.s, big: true } : undefined, answer: e.v,
      hint: `Follow the order of operations: brackets first, then × and ÷ from left to right, then + and − from left to right. In ${e.s}, start with ${firstStep(e.s).label}.`,
      explain: `First ${firstStep(e.s).label}. Following the order of operations, ${e.s} = ${e.v}.`,
    });
  }],
  [1, 6, (t, rng) => {
    const e = makeExpr(rng, t);
    return mcn(rng, {
      prompt: `What is the value of ${e.s}?`, correct: e.v, extra: [e.l, e.nb, e.v + 2].filter((x) => x != null && x !== e.v), min: 0,
      hint: `Follow the order: brackets first, then × and ÷, then + and −. In ${e.s}, start with ${firstStep(e.s).label}. Working straight from left to right is a common mistake.`,
      explain: `Start with ${firstStep(e.s).label}. ${e.s} = ${e.v}.${e.l != null && e.l !== e.v ? ` Working left to right without the rules gives ${e.l}, which is not correct.` : ''}`,
    });
  }],
  [1, 3, (t, rng) => {
    const e = makeExpr(rng, Math.max(t, 2) + (t === 3 ? 1 : 0), pick(rng, t <= 2 ? ['a + b × c', 'a − b ÷ c', '(a + b) × c', 'a × (b − c)', 'a × b + c']
      : ['a + b × c − d', 'a − b ÷ c + d', '(a + b) × c − d', 'a + b × c ÷ d', 'a × (b + c) − d', '(a − b) × c + d']));
    const fs = firstStep(e.s);
    const choices = [...new Set(fs.all)];
    if (choices.length < 2) return order(t, rng);
    return fixedq({
      prompt: `What should you do first in ${e.s}?`, visual: t <= 2 ? { type: 'expression', text: e.s, big: true } : undefined,
      choices: choices.slice(0, 4).includes(fs.label) ? choices.slice(0, 4) : [...choices.slice(0, 3), fs.label],
      correct: fs.label,
      hint: `Brackets always come first. If there are no brackets, do × and ÷ before + and −. For each choice, ask: is there anything in ${e.s} that must happen before it?`,
      explain: `${/\(/.test(e.s) ? 'The part in brackets comes first' : 'Multiplication and division come before addition and subtraction'}, so start with ${fs.label}. The answer is ${e.v}.`,
    });
  }],
  [4, 6, (t, rng) => {
    const [prompt, right, wrong] = pick(rng, OO_STORY)(rng, nm(rng));
    return mcq(rng, {
      prompt, correct: right, wrong,
      hint: 'Read the story: which amount has to be worked out as a group first? Brackets make a part happen first; without brackets, × and ÷ happen before + and −. Work out what each choice would really calculate.',
      explain: `${right} matches the story. Its value is ${ev(right)}.`,
    });
  }],
  [4, 7, (t, rng) => {
    const e = makeExpr(rng, 1, pick(rng, ['a − b × c', 'a + b × c', 'a + b ÷ c', 'a − b ÷ c']));
    if (e.l == null || e.l === e.v) return order(t, rng);
    const n = nm(rng);
    const add = e.s.includes('+'), mul = e.s.includes('×');
    const A = add ? ['Added', 'adding'] : ['Subtracted', 'subtracting'], M = mul ? ['Multiplied', 'multiplying'] : ['Divided', 'dividing'];
    return mcq(rng, {
      prompt: `${n} says ${e.s} = ${e.l}. What mistake did ${n} make?`,
      correct: `${A[0]} before ${M[1]}`, wrong: [`${M[0]} before ${A[1]}`, 'No mistake: the answer is right', `${A[0]} instead of ${M[1]}`],
      hint: `Without brackets, × and ÷ must be done before + and −. Work out ${e.s} the right way, starting with ${firstStep(e.s).label}. Then compare with ${n}'s answer: which step did ${n} do first?`,
      explain: `${mul ? 'Multiply' : 'Divide'} first: ${firstStep(e.s).label} = ${ev(firstStep(e.s).label)}. Then ${e.s} = ${e.v}, not ${e.l}.`,
    });
  }],
  [6, 7, (t, rng) => {
    const base = makeExpr(rng, 3, pick(rng, ['a + b × c − d', 'a × b + c × d', 'a + b × c + d', 'a × b − c + d', 'a + b − c × d']));
    const flat = base.s;
    const opts = bracketings(flat).map((s) => ({ s, v: ev(s) })).filter((o) => o.v != null);
    const byVal = {};
    opts.forEach((o) => { (byVal[o.v] = byVal[o.v] || []).push(o); });
    const uniq = opts.filter((o) => byVal[o.v].length === 1 && o.v !== ev(flat));
    if (uniq.length < 1) return order(t, rng);
    const target = pick(rng, uniq);
    const others = opts.filter((o) => o.v !== target.v);
    const seenV = new Set([target.v]);
    const wrong = [];
    for (const o of shuffle(rng, others)) if (!seenV.has(o.v)) { seenV.add(o.v); wrong.push(o.s); }
    if (!seenV.has(ev(flat))) wrong.push(flat);
    if (wrong.length < 2) return order(t, rng);
    return mcq(rng, {
      prompt: `Where should the brackets go to make ${flat} = ${target.v}?`, correct: target.s, wrong,
      hint: `Try each choice: work out the brackets first, then follow the order of operations for the rest. Which one makes exactly ${target.v}?`,
      explain: `${target.s} = ${target.v}. The brackets change which operation is done first.`,
    });
  }],
  [7, 7, (t, rng) => {
    const exprs = [];
    for (let i = 0; i < 12 && exprs.length < 4; i++) {
      const e = makeExpr(rng, pick(rng, [3, 5, 7]));
      if (!exprs.some((x) => x.v === e.v)) exprs.push(e);
    }
    if (exprs.length < 3) return order(t, rng);
    const target = exprs[0];
    return mcq(rng, {
      prompt: `Which expression has a value of ${target.v}?`, correct: target.s, wrong: exprs.slice(1).map((e) => e.s),
      hint: `Work out each expression carefully: brackets first, then × and ÷, then + and −. Only one of them equals ${target.v}.`,
      explain: `${target.s} = ${target.v}. ${exprs.slice(1).map((e) => `${e.s} = ${e.v}`).join('; ')}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD6  Collect and represent data; interpret graphs; misleading graphs
// ---------------------------------------------------------------------------
const G6_SETS = [
  { title: 'Favourite Sports', cats: ['Soccer', 'Hockey', 'Swimming', 'Basketball', 'Skiing'], word: 'sport', unit: 'votes' },
  { title: 'Favourite Lunches', cats: ['Pizza', 'Tacos', 'Soup', 'Sushi', 'Pasta'], word: 'lunch', unit: 'votes' },
  { title: 'Books Borrowed', cats: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], word: 'day', unit: 'books' },
  { title: 'Pets at Home', cats: ['Cats', 'Dogs', 'Fish', 'Birds', 'Rabbits'], word: 'pet', unit: 'pets' },
  { title: 'Magic Creatures Seen', cats: ['Dragons', 'Unicorns', 'Griffins', 'Phoenixes', 'Krakens'], word: 'creature', unit: 'sightings' },
  { title: 'Cans Collected', cats: ['Class A', 'Class B', 'Class C', 'Class D'], word: 'class', unit: 'cans' },
];
const GRAPH_Q = [
  ['how a puppy\'s mass changed each month for a year', 'Line graph'], ['the temperature outside every hour of one day', 'Line graph'],
  ['the height of a bean plant every week', 'Line graph'], ['the favourite sports of students in one class', 'Bar graph'],
  ['the number of each kind of pet owned by a class', 'Bar graph'], ['how many cans each class collected', 'Bar graph'],
  ['the favourite fruits of Grade 5 and Grade 6, side by side', 'Double bar graph'], ['boys\' and girls\' favourite games, compared', 'Double bar graph'],
  ['books read by two teams each month, compared', 'Double bar graph'],
];
const MISLEAD = [
  (rng) => { const lo = R(rng, 80, 95); return [`A bar graph's number line starts at ${lo} instead of 0.`, 'Small differences look much bigger than they are']; },
  () => ['A pictograph uses bigger pictures in one row than in the others.', 'That row looks like it has more than it really does'],
  () => ['The scale on a bar graph goes 0, 10, 20, 50, 100.', 'The spaces are not equal, so the bars are hard to compare'],
  (rng) => { const k = R(rng, 3, 6); return [`A survey about the whole school's favourite snack asked only ${k} people.`, 'Too few people were asked to draw a conclusion']; },
  (rng) => { const team = pick(rng, ['hockey team', 'chess club', 'art club', 'swim team']); return [`To find the whole school's favourite activity, a survey asked only the ${team}.`, 'The people asked are not a fair sample of the school']; },
  () => ['A graph has no title and no labels on its axes.', 'You cannot tell what the data is about'],
];
const MISLEAD_ANS = ['Small differences look much bigger than they are', 'That row looks like it has more than it really does', 'The spaces are not equal, so the bars are hard to compare', 'Too few people were asked to draw a conclusion', 'The people asked are not a fair sample of the school', 'You cannot tell what the data is about'];
const TOPICS = [['lunch', 'pizza'], ['sport', 'hockey'], ['season', 'summer'], ['pet', 'the dog'], ['book type', 'the mystery'], ['colour', 'blue'], ['fruit', 'the mango'], ['game', 'tag']];

function barData(rng, t) {
  const ds = pick(rng, G6_SETS), n = t <= 2 ? 3 : 4;
  const cats = sample(rng, ds.cats, n).sort((x, y) => ds.cats.indexOf(x) - ds.cats.indexOf(y));
  const scale = [1, 2, 5, 10, 10, 20, 25][t - 1];
  const vals = cats.map(() => R(rng, 1, 10) * scale);
  return { ...ds, cats, vals, scale, visual: { type: 'bargraph', title: ds.title, labels: cats, values: vals, scale, yLabel: `Number of ${ds.unit}` } };
}

const data6 = gen([
  [1, 4, (t, rng) => {
    const g = barData(rng, t);
    const usePicto = t >= 2 && chance(rng, 0.4);
    const key = pick(rng, [2, 4, 10]);
    if (usePicto) {
      g.vals = g.cats.map(() => R(rng, 1, 8) * key / 2);
      g.visual = { type: 'pictograph', title: g.title, rows: g.cats.map((c, i) => ({ label: c, count: g.vals[i] })), icon: pick(rng, ['⭐', '📘', '🥫', '🐾']), key };
    }
    const k = t <= 1 ? 0 : R(rng, 0, 2);
    const [i, j] = sample(rng, [...g.cats.keys()], 2);
    const keyTxt = usePicto ? ` Each picture stands for ${key}.` : '';
    if (k === 0) return numq({ prompt: `How many ${g.unit} does the graph show for ${g.cats[i]}?${keyTxt}`, visual: g.visual, answer: g.vals[i], hint: usePicto ? `Each picture stands for ${key}, and half a picture stands for ${key / 2}. Count the pictures in the ${g.cats[i]} row and work out what they are worth.` : `Find the ${g.cats[i]} bar and follow its top across to the scale. Each grid line is worth ${g.scale}.`, explain: `${g.cats[i]} has ${g.vals[i]} ${g.unit}.` });
    if (k === 1) {
      if (g.vals[i] === g.vals[j]) return data6(t, rng);
      const [a, b] = g.vals[i] > g.vals[j] ? [i, j] : [j, i];
      return numq({ prompt: `How many more ${g.unit} for ${g.cats[a]} than ${g.cats[b]}?${keyTxt}`, visual: g.visual, answer: g.vals[a] - g.vals[b], hint: `Find the amount for ${g.cats[a]} and the amount for ${g.cats[b]}${usePicto ? ' (count the pictures and use the key)' : ''}. Then subtract the smaller amount from the bigger one.`, explain: `${g.vals[a]} − ${g.vals[b]} = ${g.vals[a] - g.vals[b]}.` });
    }
    return numq({ prompt: `How many ${g.unit} are shown in all?${keyTxt}`, visual: g.visual, answer: sum(g.vals), hint: `Find the amount for each ${g.word}${usePicto ? ' using the key' : ' from the bars'}, then add them all together.`, explain: `${g.vals.join(' + ')} = ${sum(g.vals)}.` });
  }],
  [2, 5, (t, rng) => {
    const [what, ans] = pick(rng, GRAPH_Q);
    return fixedq({
      prompt: `Which type of graph is best to show ${what}?`, choices: ['Bar graph', 'Double bar graph', 'Line graph'], correct: ans,
      hint: `A line graph shows how one thing changes over time. A bar graph compares separate groups. A double bar graph compares two sets of groups side by side. Which fits ${what}?`,
      explain: ans === 'Line graph' ? 'This data changes over time, so a line graph shows the trend best.' : ans === 'Bar graph' ? 'This data compares separate groups, so a bar graph works best.' : 'Two sets of data are compared for each category, so a double bar graph works best.',
    });
  }],
  [3, 7, (t, rng) => {
    const [txt, ans] = pick(rng, MISLEAD)(rng);
    return mcq(rng, {
      prompt: `${txt} Why is this misleading?`, correct: ans, wrong: MISLEAD_ANS.filter((x) => x !== ans && !(MISLEAD_ANS.indexOf(x) >= 3 && MISLEAD_ANS.indexOf(x) <= 4 && MISLEAD_ANS.indexOf(ans) >= 3 && MISLEAD_ANS.indexOf(ans) <= 4)),
      hint: 'Picture the graph or survey. What would someone believe at first glance, and is that really true? Check each choice: does it describe the actual problem here?',
      explain: `${ans}. A fair graph or survey shows the data honestly.`,
    });
  }],
  [3, 7, (t, rng) => {
    const vals = [R(rng, 90, 94), R(rng, 95, 99)];
    const [n1, n2] = two(rng);
    const lo = vals[0] - R(rng, 1, 3);
    const times = Math.round((vals[1] - lo) / (vals[0] - lo));
    return mcq(rng, {
      prompt: `${n1} scored ${vals[0]} and ${n2} scored ${vals[1]}. On a graph whose scale starts at ${lo}, ${n2}'s bar looks about ${times} times as tall. What is true?`,
      correct: `${n2} scored only ${vals[1] - vals[0]} more points`, wrong: [`${n2} scored about ${times} times as many points`, `${n1} scored more points`, `The scores are equal`],
      hint: `Compare the actual scores, ${vals[0]} and ${vals[1]}, not the heights of the bars. How far apart are they really? A scale that does not start at 0 stretches small differences.`,
      explain: `${vals[1]} − ${vals[0]} = ${vals[1] - vals[0]}. Starting the scale at ${lo} instead of 0 makes the difference look much bigger.`,
    });
  }],
  [2, 5, (t, rng) => {
    const [topic, fav] = pick(rng, TOPICS);
    return mcq(rng, {
      prompt: `${nm(rng)} is making a questionnaire about favourite ${topic}s. Which question is best?`,
      correct: `What is your favourite ${topic}?`,
      wrong: [`Don't you agree that ${fav} is the best ${topic}?`, `Is ${fav} the best ${topic}, yes or no?`, `Why is ${fav} the best ${topic}?`],
      hint: `A good survey question is fair: it does not push people toward an answer, and it lets them give any answer. Check each choice: does it lead people toward ${fav}, or only allow yes or no?`,
      explain: `"What is your favourite ${topic}?" lets everyone answer freely. The others lead people toward ${fav}.`,
    });
  }],
  [2, 4, (t, rng) => {
    const qs = [
      ['how long ice takes to melt in the sun and the shade', 'An experiment'], ['which paper towel soaks up the most water', 'An experiment'],
      ['the favourite games of students in your grade', 'A questionnaire (survey)'], ['how students get to school', 'A questionnaire (survey)'],
      ['the populations of Canadian cities', 'A database or website'], ['last year\'s rainfall in Saint John', 'A database or website'],
      ['how many birds visit a feeder each hour', 'Observation with a tally'], ['how many cars pass the school at lunch', 'Observation with a tally'],
    ];
    const [what, ans] = pick(rng, qs);
    return fixedq({
      prompt: `Which method is best for collecting data about ${what}?`,
      choices: ['A questionnaire (survey)', 'An experiment', 'A database or website', 'Observation with a tally'], correct: ans,
      hint: `A questionnaire asks people what they think or do. An experiment tests something to see what happens. A database or website has facts someone already recorded. Observation with a tally means watching and counting. Which fits ${what}?`,
      explain: `For ${what}, the best method is ${ans.toLowerCase()}.`,
    });
  }],
  [4, 7, (t, rng) => {
    const g = barData(rng, Math.min(t, 5));
    const mx = Math.max(...g.vals), mn = Math.min(...g.vals);
    if (g.vals.filter((v) => v === mx).length > 1 || g.vals.filter((v) => v === mn).length > 1) return data6(t, rng);
    const top = g.cats[g.vals.indexOf(mx)], low = g.cats[g.vals.indexOf(mn)];
    const T = [`${top} had the most ${g.unit}.`, `${low} had the fewest ${g.unit}.`, `${top} had ${mx - mn} more ${g.unit} than ${low}.`, `There were ${sum(g.vals)} ${g.unit} in all.`];
    const Fs = [`${low} had the most ${g.unit}.`, `${top} had the fewest ${g.unit}.`, `${top} had ${mx - mn + g.scale} more ${g.unit} than ${low}.`, `There were ${sum(g.vals) + g.scale} ${g.unit} in all.`, `${top} had twice as many ${g.unit} as every other ${g.word}.`].filter((f) => !(f.includes('twice') && g.vals.every((v) => v === mx || 2 * v <= mx)));
    return mcq(rng, {
      prompt: 'Which conclusion is supported by the graph?', visual: g.visual,
      correct: pick(rng, T), wrong: sample(rng, Fs, 3),
      hint: 'Read the value of every bar first. Then check each statement: who has the most, who has the fewest, and do the differences and totals really match?',
      explain: `The graph shows ${g.cats.map((c, i) => `${c}: ${g.vals[i]}`).join(', ')}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD7  Tables of values and graphs of linear relations (y = x + a, y = x − a, y = ax, y = x ÷ a)
// ---------------------------------------------------------------------------
function relation(rng, kinds) {
  const kind = pick(rng, kinds);
  const a = kind === 'mul' || kind === 'div' ? R(rng, 2, 6) : R(rng, 1, 12);
  const f = { add: (x) => x + a, sub: (x) => x - a, mul: (x) => a * x, div: (x) => x / a }[kind];
  const eq = { add: `y = x + ${a}`, sub: `y = x − ${a}`, mul: `y = ${a}x`, div: `y = x ÷ ${a}` }[kind];
  const xs = (start, step, n) => [...Array(n).keys()].map((i) => start + i * step);
  let xList;
  if (kind === 'div') xList = xs(a * R(rng, 1, 3), a, 4);
  else if (kind === 'sub') xList = xs(a + R(rng, 0, 4), 1, 4);
  else xList = xs(R(rng, 0, 4), pick(rng, [1, 1, 2]), 4);
  return { kind, a, f, eq, xList };
}
const subX = (r, x) => ({ add: `${x} + ${r.a}`, sub: `${x} − ${r.a}`, mul: `${r.a} × ${x}`, div: `${x} ÷ ${r.a}` }[r.kind]);
const EQ_ALL = (a) => [`y = x + ${a}`, `y = x − ${a}`, `y = ${a}x`, `y = x ÷ ${a}`];
function fitsAll(eqStr, xs, ys) {
  const m = eqStr.match(/y = (?:x ([+−÷]) (\d+)|(\d+)x)/);
  if (!m) return false;
  const f = m[3] ? (x) => Number(m[3]) * x : m[1] === '+' ? (x) => x + Number(m[2]) : m[1] === '−' ? (x) => x - Number(m[2]) : (x) => x / Number(m[2]);
  return xs.every((x, i) => f(x) === ys[i]);
}

const tables6 = gen([
  [1, 5, (t, rng) => {
    const kinds = t <= 1 ? ['add'] : t === 2 ? ['add', 'mul'] : ['add', 'sub', 'mul', 'div'];
    const r = relation(rng, kinds);
    const xs = r.xList.slice(), ys = xs.map(r.f);
    if (t === 5) { xs.push(r.kind === 'div' ? r.a * R(rng, 10, 20) : R(rng, 20, 50)); ys.push(r.f(xs[4])); }
    const reverse = t >= 4 && chance(rng, 0.5);
    const bi = R(rng, 1, xs.length - 1);
    const rows = xs.map((x, i) => (i === bi ? (reverse ? ['?', ys[i]] : [x, '?']) : [x, ys[i]]));
    return numq({
      prompt: `The table follows the rule ${r.eq}. What number goes in the ? spot?`,
      visual: { type: 'table', headers: ['x', 'y'], rows },
      answer: reverse ? xs[bi] : ys[bi],
      hint: reverse ? `Work backward from y = ${ys[bi]} by undoing the rule ${r.eq}. ${{ add: `Take away ${r.a}.`, sub: `Add ${r.a}.`, mul: `Divide by ${r.a}.`, div: `Multiply by ${r.a}.` }[r.kind]}` : `Put x = ${xs[bi]} into the rule ${r.eq} and work it out.`,
      explain: reverse ? `Work backward from y = ${ys[bi]}: ${{ add: `${ys[bi]} − ${r.a}`, sub: `${ys[bi]} + ${r.a}`, mul: `${ys[bi]} ÷ ${r.a}`, div: `${ys[bi]} × ${r.a}` }[r.kind]} = ${xs[bi]}. Check: ${subX(r, xs[bi])} = ${ys[bi]}.`
        : `Put x = ${xs[bi]} into ${r.eq}: y = ${subX(r, xs[bi])} = ${ys[bi]}.`,
    });
  }],
  [2, 7, (t, rng) => {
    const r = relation(rng, t <= 2 ? ['add', 'mul'] : ['add', 'sub', 'mul', 'div']);
    const xs = r.xList, ys = xs.map(r.f);
    const wrong = [...EQ_ALL(r.a), ...EQ_ALL(r.a + 1), `y = x + ${ys[0]}`, `y = ${ys[0]}x`].filter((e) => e !== r.eq && !fitsAll(e, xs, ys) && !/y = [01]x|÷ 1$|÷ 0$/.test(e));
    return mcq(rng, {
      prompt: 'Which equation matches the table?', visual: { type: 'table', headers: ['x', 'y'], rows: xs.map((x, i) => [x, ys[i]]) },
      correct: r.eq, wrong,
      hint: 'Test each equation with EVERY row: put each x into it and see if you get the matching y. Many equations work for one row, but only one works for all of them.',
      explain: `${r.eq} works for every row: ${xs.map((x, i) => `x = ${x} gives y = ${ys[i]}`).join('; ')}.`,
    });
  }],
  [2, 4, (t, rng) => {
    const r = relation(rng, ['add', 'mul', 'sub']);
    const xs = [...Array(5).keys()].map((i) => (r.kind === 'sub' ? r.a + i : i + 1)), ys = xs.map(r.f);
    const step = ys[1] - ys[0];
    return mcq(rng, {
      prompt: 'When x goes up by 1, what happens to y?', visual: { type: 'table', headers: ['x', 'y'], rows: xs.map((x, i) => [x, ys[i]]) },
      correct: `y goes up by ${step}`, wrong: [`y goes up by ${step + 1}`, `y goes down by ${step}`, `y goes up by ${ys[0]}`, `y doubles each time`].filter((w) => w !== `y goes up by ${step}` && !(w === 'y doubles each time' && false)),
      hint: 'Look down the y column and subtract each y value from the one below it. Is the change the same every time? Does y go up, go down, or double?',
      explain: `The y values go ${ys.join(', ')}. Each one is ${step} more than the last.`,
    });
  }],
  [4, 7, (t, rng) => {
    const r = relation(rng, ['add', 'sub', 'mul', 'div']);
    const pts = [];
    for (let x = 0; x <= 10; x++) { const y = r.f(x); if (Number.isInteger(y) && y >= 0 && y <= 10) pts.push({ x, y }); }
    if (pts.length < 3) return tables6(t, rng);
    const shown = pts.slice(0, Math.min(5, pts.length));
    const visual = { type: 'coordplane', max: 10, points: shown.map((p) => ({ x: p.x, y: p.y })) };
    if (chance(rng, 0.5)) {
      const xs = shown.map((p) => p.x), ys = shown.map((p) => p.y);
      const wrong = [...EQ_ALL(r.a), ...EQ_ALL(r.a + 1)].filter((e) => e !== r.eq && !fitsAll(e, xs, ys) && !/÷ 1$/.test(e));
      return mcq(rng, {
        prompt: 'Which equation matches the points on the graph?', visual, correct: r.eq, wrong,
        hint: 'Read the coordinates (x, y) of two or three points on the graph. Put each x into each equation and check whether you get the matching y.',
        explain: `The points ${shown.map((p) => `(${p.x}, ${p.y})`).join(', ')} all fit ${r.eq}.`,
      });
    }
    const good = pick(rng, pts);
    const bads = [[good.x, good.y + 1], [good.y, good.x], [good.x + 1, good.y], [good.x, good.y + 2]].filter(([x, y]) => r.f(x) !== y && x >= 0 && y >= 0);
    return mcq(rng, {
      prompt: `Which point is on the graph of ${r.eq}?`, correct: `(${good.x}, ${good.y})`, wrong: bads.map(([x, y]) => `(${x}, ${y})`),
      hint: `Put the first number of each point (the x) into ${r.eq} and work out y. The correct point has that y as its second number.`,
      explain: `For x = ${good.x}, ${r.eq} gives y = ${good.y}. So (${good.x}, ${good.y}) is on the graph.`,
    });
  }],
  [3, 5, (t, rng) => {
    const good = pick(rng, ['a puppy\'s mass measured every month', 'the height of a sunflower each week', 'the temperature every hour', 'the water level in a tank every minute as it fills', 'the distance a snail travels each minute']);
    const bad = ['the favourite colours of a class', 'the number of each kind of pet in a class', 'votes for class president', 'the favourite ice cream flavours of a team', 'the kinds of trees in a park'];
    return mcq(rng, {
      prompt: 'Which set of data could be shown with a line graph?', correct: good, wrong: sample(rng, bad, 3),
      hint: 'A line graph shows how something changes over time, like a height measured each week. Data in separate groups, like favourite colours, belongs in a bar graph. Which choice changes over time?',
      explain: `${cap(good)} changes over time, so a line graph works. The others are separate categories, better for a bar graph.`,
    });
  }],
  [4, 7, (t, rng) => {
    const ctxs = [
      (a) => [`A dragon eats ${a} gems every hour. The rule is y = ${a}x, where x is the number of hours.`, (x) => a * x, 'gems', 'hours', `y = ${a}x`],
      (a) => [`${nm(rng)} is ${a} years older than a cousin. The rule is y = x + ${a}, where x is the cousin's age.`, (x) => x + a, 'years old', 'years', `y = x + ${a}`],
      (a) => [`Owls live in nests, ${a} owls in each nest. The rule is y = x ÷ ${a}, where x is the number of owls and y is the number of nests.`, (x) => x / a, 'nests', 'owls', `y = x ÷ ${a}`],
    ];
    const a = R(rng, 2, 8), k = R(rng, 0, 2);
    const [story, f, yUnit, , eq] = ctxs[k](a);
    const x = k === 2 ? a * R(rng, 3, t >= 6 ? 25 : 12) : R(rng, t >= 6 ? 12 : 5, t >= 6 ? 40 : 15);
    if (t >= 6 && chance(rng, 0.5)) {
      return numq({
        prompt: `${story} What is x when y = ${f(x)}?`, answer: x,
        hint: `Work backward: which x gives y = ${f(x)} in the rule ${eq}? Undo what the rule does to x.`,
        explain: `${eq}: undoing it from y = ${f(x)} gives x = ${x}. Check: ${eq.includes('÷') ? `${x} ÷ ${a}` : eq.includes('+') ? `${x} + ${a}` : `${a} × ${x}`} = ${f(x)}.`,
      });
    }
    return numq({
      prompt: `${story} What is y when x = ${x}?`, answer: f(x),
      hint: `In the rule ${eq}, replace x with ${x} and work it out.`,
      explain: `${eq} with x = ${x}: y = ${eq.includes('÷') ? `${x} ÷ ${a}` : eq.includes('+') ? `${x} + ${a}` : `${a} × ${x}`} = ${f(x)} ${yUnit}.`,
    });
  }],
  [3, 5, (t, rng) => {
    const r = relation(rng, ['add', 'sub', 'mul', 'div']);
    const xs = r.xList.slice(0, 3);
    const mk = (f) => ({ type: 'table', headers: ['x', 'y'], rows: xs.map((x) => [x, f(x)]) });
    const alts = [(x) => x + r.a + 1, (x) => (r.kind === 'mul' ? x + r.a : r.a * x), (x) => x + 2 * r.a, (x) => (r.kind === 'add' ? x - r.a : x + r.a)]
      .filter((g) => xs.some((x) => g(x) !== r.f(x)) && xs.every((x) => g(x) >= 0 && Number.isInteger(g(x))));
    const uniq = [];
    for (const g of alts) if (!uniq.some((u) => xs.every((x) => u(x) === g(x)))) uniq.push(g);
    if (uniq.length < 2) return tables6(t, rng);
    return {
      kind: 'mc', prompt: `Which table matches ${r.eq}?`,
      ...mcVisual(rng, [{ visual: mk(r.f), correct: true }, ...uniq.slice(0, 3).map((g) => ({ visual: mk(g), correct: false }))]),
      hint: `Put each x value into ${r.eq} and work out y. The correct table has the right y in every row.`,
      explain: `For ${r.eq}: ${xs.map((x) => `x = ${x} → y = ${r.f(x)}`).join(', ')}.`,
    };
  }],
]);

// ---------------------------------------------------------------------------
// SD8  First-quadrant Cartesian plane: points and transformations
// ---------------------------------------------------------------------------
const CHIRAL = [
  [[0, 0], [3, 0], [3, 1], [1, 1], [1, 2], [0, 2]], [[0, 0], [3, 0], [0, 2]], [[0, 0], [1, 0], [1, 1], [2, 1], [2, 3], [0, 3]],
  [[0, 0], [3, 0], [2, 2], [0, 2]], [[0, 0], [2, 0], [3, 2], [0, 1]], [[0, 0], [2, 0], [2, 1], [1, 1], [1, 3], [0, 3]],
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
  for (let i = R(rng, 0, 3); i > 0; i--) P = rotCW(P, 0, 0);
  if (chance(rng, 0.5)) P = refV(P, 0);
  P = mv(P, -Math.min(...P.map((p) => p[0])), -Math.min(...P.map((p) => p[1])));
  const w = Math.max(...P.map((p) => p[0])), h = Math.max(...P.map((p) => p[1]));
  return mv(P, R(rng, 0, max - w), R(rng, 0, max - h));
}
const pt = ([x, y]) => `(${x}, ${y})`;
const TURN = { cw: '¼ turn clockwise', ccw: '¼ turn counterclockwise', half: '½ turn' };
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
function transDesc(dx, dy) {
  const parts = [];
  if (dx) parts.push(`${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'}`);
  if (dy) parts.push(`${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}`);
  return parts.join(' and ');
}

const coords = gen([
  [1, 3, (t, rng) => {
    const n = t <= 1 ? 3 : 4, max = t <= 1 ? 6 : 10;
    const ps = [];
    while (ps.length < n) { const p = [R(rng, 0, max), R(rng, 0, max)]; if (!ps.some((q) => q[0] === p[0] && q[1] === p[1])) ps.push(p); }
    const visual = { type: 'coordplane', max, points: ps.map((p, i) => ({ x: p[0], y: p[1], label: LETTERS[i] })) };
    const i = R(rng, 0, n - 1), [x, y] = ps[i];
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: `What are the coordinates of point ${LETTERS[i]}?`, visual,
        correct: pt([x, y]), wrong: [pt([y, x]), pt([x + 1, y]), pt([x, y + 1]), pt([Math.max(0, x - 1), y])],
        hint: `Start at the origin (0, 0). Count how far across point ${LETTERS[i]} is along the x-axis, then how far up it is along the y-axis. Write them in that order: (across, up).`,
        explain: `Point ${LETTERS[i]} is ${x} across and ${y} up, so it is at ${pt([x, y])}.`,
      });
    }
    return fixedq({
      prompt: `Which point is at ${pt([x, y])}?`, visual, choices: LETTERS.slice(0, n), correct: LETTERS[i],
      hint: `Start at the origin (0, 0). Move ${x} across along the x-axis, then ${y} up. Which labelled point is there?`,
      explain: `Moving ${x} across and ${y} up lands on point ${LETTERS[i]}.`,
    });
  }],
  [1, 4, (t, rng) => {
    const k = R(rng, 0, 3);
    if (k === 0) return fixedq({ prompt: 'What is the point (0, 0) called?', visual: { type: 'coordplane', max: 6, points: [{ x: 0, y: 0, label: '?' }] }, choices: ['the origin', 'the x-axis', 'the y-axis', 'the quadrant'], correct: 'the origin', hint: 'Look where the two axes cross. The x-axis goes across and the y-axis goes up; the point where they meet has a special name. A quadrant is a whole section of the grid, not a single point.', explain: '(0, 0) is the origin, where the x-axis and y-axis cross.' });
    if (k === 1) {
      const hor = chance(rng, 0.5);
      return fixedq({ prompt: `Which axis is ${hor ? 'horizontal (goes across)' : 'vertical (goes up)'}?`, visual: { type: 'coordplane', max: 6 }, choices: ['the x-axis', 'the y-axis'], correct: hor ? 'the x-axis' : 'the y-axis', hint: 'In an ordered pair (x, y), the first number tells how far to go along the x-axis and the second how far along the y-axis. Look at the grid: which axis is labelled x and which is labelled y?', explain: hor ? 'The x-axis goes across (horizontal).' : 'The y-axis goes up (vertical).' });
    }
    const onX = chance(rng, 0.5), v = R(rng, 1, 9);
    const p = onX ? [v, 0] : [0, v];
    return fixedq({
      prompt: `Where is the point ${pt(p)}?`, visual: t <= 2 ? { type: 'coordplane', max: 10, points: [{ x: p[0], y: p[1], label: 'P' }] } : undefined,
      choices: ['on the x-axis', 'on the y-axis', 'at the origin', 'not on an axis'], correct: onX ? 'on the x-axis' : 'on the y-axis',
      hint: `In ${pt(p)}, the first number is how far across and the second is how far up. A 0 means you do not move in that direction at all. Where do you end up?`,
      explain: onX ? `${pt(p)} is ${v} across and 0 up, so it is on the x-axis.` : `${pt(p)} is 0 across and ${v} up, so it is on the y-axis.`,
    });
  }],
  [3, 7, (t, rng) => {
    const P = placeShape(rng);
    let dx, dy, Q;
    for (let i = 0; i < 50; i++) { dx = R(rng, -5, 5); dy = R(rng, -5, 5); Q = mv(P, dx, dy); if (Math.abs(dx) + Math.abs(dy) >= 3 && inB(Q)) break; }
    if (!inB(Q) || Math.abs(dx) + Math.abs(dy) < 3) return coords(t, rng);
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: 'Describe the translation from the solid shape to the dashed shape.', visual: { type: 'coordplane', max: 10, polygon: P, polygon2: Q },
        correct: transDesc(dx, dy), wrong: [transDesc(dy, dx), transDesc(-dx, dy), transDesc(dx, -dy), transDesc(-dx, -dy)].filter((s) => s && s !== transDesc(dx, dy)),
        hint: 'Pick one vertex of the solid shape and find the matching vertex of the dashed shape. Count units across (right or left), then up or down. The right choice has both parts, in the right directions.',
        explain: `Vertex ${pt(P[0])} moves to ${pt(Q[0])}: ${transDesc(dx, dy)}.`,
      });
    }
    const [x, y] = P[0];
    return mcq(rng, {
      prompt: `Point ${pt([x, y])} is translated ${transDesc(dx, dy)}. What are the coordinates of its image?`,
      correct: pt([x + dx, y + dy]), wrong: [[x + dy, y + dx], [x - dx, y + dy], [x + dx, y - dy], [y + dy, x + dx], [x + dx + 1, y + dy], [x + dx, y + dy - 1]].filter(([a, b]) => a >= 0 && b >= 0).map(pt),
      hint: `Moving right adds to the first number and moving left subtracts from it. Moving up adds to the second number and moving down subtracts from it. Start at ${pt([x, y])} and change each number.`,
      explain: `x: ${x} ${dx >= 0 ? '+' : '−'} ${Math.abs(dx)} = ${x + dx}. y: ${y} ${dy >= 0 ? '+' : '−'} ${Math.abs(dy)} = ${y + dy}. The image is ${pt([x + dx, y + dy])}.`,
    });
  }],
  [4, 7, (t, rng) => {
    const P = placeShape(rng);
    const vert = chance(rng, 0.5);
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
    const a = vert ? (chance(rng, 0.5) ? Math.max(...xs) + R(rng, 0, 1) : Math.min(...xs) - R(rng, 0, 1)) : (chance(rng, 0.5) ? Math.max(...ys) + R(rng, 0, 1) : Math.min(...ys) - R(rng, 0, 1));
    const Q = vert ? refV(P, a) : refH(P, a);
    if (!inB(Q) || a < 1 || a > 9) return coords(t, rng);
    const lab = (v, at) => `the ${v ? 'vertical' : 'horizontal'} line through ${at} on the ${v ? 'x' : 'y'}-axis`;
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: 'The solid shape is reflected to make the dashed shape. What is the line of reflection?', visual: { type: 'coordplane', max: 10, polygon: P, polygon2: Q },
        correct: lab(vert, a), wrong: [lab(vert, a + 1), lab(vert, a - 1), lab(!vert, a), lab(!vert, 5)].filter((s) => s !== lab(vert, a)),
        hint: 'The line of reflection is exactly halfway between each vertex and its matching image vertex. Pick one pair of matching vertices and find the grid line halfway between them. Is it vertical or horizontal?',
        explain: (() => { const i = Math.max(0, P.findIndex((q, j) => q[0] !== Q[j][0] || q[1] !== Q[j][1])); return `Vertex ${pt(P[i])} and its image ${pt(Q[i])} are the same distance from ${lab(vert, a)}, on opposite sides.`; })(),
      });
    }
    const [x, y] = P[0], [ix, iy] = Q[0];
    return mcq(rng, {
      prompt: `Point ${pt([x, y])} is reflected in ${lab(vert, a)}. What are the coordinates of its image?`,
      correct: pt([ix, iy]), wrong: [[y, x], vert ? [x, 2 * a - y] : [2 * a - x, y], vert ? [ix + 1, iy] : [ix, iy + 1], vert ? [a, y] : [x, a], vert ? [ix - 1, iy] : [ix, iy - 1], [iy, ix]].filter(([p, q]) => p >= 0 && q >= 0 && !(p === ix && q === iy)).map(pt),
      hint: `Find how far ${pt([x, y])} is from the line of reflection. The image is the same distance away on the other side. For a vertical line only the first number changes; for a horizontal line only the second number changes.`,
      explain: `${pt([x, y])} is ${Math.abs((vert ? x : y) - a)} unit${Math.abs((vert ? x : y) - a) === 1 ? '' : 's'} from the line, so the image is the same distance on the other side: ${pt([ix, iy])}.`,
    });
  }],
  [5, 7, (t, rng) => {
    const P = placeShape(rng);
    const c = pick(rng, P), dir = pick(rng, ['cw', 'ccw', 'half']);
    const Q = dir === 'cw' ? rotCW(P, c[0], c[1]) : dir === 'ccw' ? rotCCW(P, c[0], c[1]) : rot180(P, c[0], c[1]);
    if (!inB(Q)) return coords(t, rng);
    if (t === 7 && chance(rng, 0.5)) {
      const vi = P.findIndex((p) => p[0] !== c[0] || p[1] !== c[1]);
      const others = ['cw', 'ccw', 'half'].filter((d) => d !== dir).map((d) => (d === 'cw' ? rotCW : d === 'ccw' ? rotCCW : rot180)([P[vi]], c[0], c[1])[0]);
      return mcq(rng, {
        prompt: `The shape makes a ${TURN[dir]} about ${pt(c)}. Where does vertex ${pt(P[vi])} end up?`, visual: { type: 'coordplane', max: 10, polygon: P, points: [{ x: c[0], y: c[1], label: 'P' }] },
        correct: pt(Q[vi]), wrong: [...others, [Q[vi][1], Q[vi][0]], P[vi]].filter((p) => p[0] >= 0 && p[1] >= 0).map(pt),
        hint: `Imagine a string from P to the vertex. Swing the string a ${TURN[dir]} around P: a ¼ turn makes a square corner, and a ½ turn points the opposite way. Where does the end of the string land?`,
        explain: `After a ${TURN[dir]} about ${pt(c)}, vertex ${pt(P[vi])} lands at ${pt(Q[vi])}.`,
      });
    }
    return fixedq({
      prompt: 'The solid shape turned about point P to make the dashed shape. Describe the turn.',
      visual: { type: 'coordplane', max: 10, polygon: P, polygon2: Q, points: [{ x: c[0], y: c[1], label: 'P' }] },
      choices: Object.values(TURN), correct: TURN[dir],
      hint: 'A ¼ turn clockwise swings the way clock hands move, and a ¼ turn counterclockwise swings the other way. A ½ turn spins the shape halfway around, so it ends up upside down. Follow one side that touches P: where does it point before and after?',
      explain: `It is a ${TURN[dir]} about P${dir === 'half' ? ' (180°)' : ' (90°)'}.`,
    });
  }],
  [3, 6, (t, rng) => {
    const x = R(rng, 1, 4), y = R(rng, 1, 4), w = R(rng, 2, 5), h = pick(rng, [w, R(rng, 2, 5)]);
    const pts = [[x, y], [x, y + h], [x + w, y + h], [x + w, y]];
    if (chance(rng, 0.5)) {
      const shape = w === h ? 'square' : 'rectangle';
      return fixedq({
        prompt: `Plot ${pts.map((p, i) => `${LETTERS[i]}${pt(p)}`).join(', ')} and join them in order. What shape do you get?`,
        visual: t <= 4 ? { type: 'coordplane', max: 10, points: pts.map((p, i) => ({ x: p[0], y: p[1], label: LETTERS[i] })) } : undefined,
        choices: ['square', 'rectangle (not a square)', 'triangle', 'trapezoid'], correct: shape === 'square' ? 'square' : 'rectangle (not a square)',
        hint: 'Plot the points and join them in order. Count the units along each side: are all four sides equal, or only the opposite sides? Check that the corners are square.',
        explain: `The sides are ${w} and ${h} units long with square corners, so it is a ${shape === 'square' ? 'square' : 'rectangle'}.`,
      });
    }
    const miss = R(rng, 0, 3);
    const shown = pts.filter((p, i) => i !== miss);
    const m = pts[miss];
    return mcq(rng, {
      prompt: `Three vertices of a rectangle are ${shown.map(pt).join(', ')}. What is the fourth vertex?`,
      visual: { type: 'coordplane', max: 10, points: shown.map((p) => ({ x: p[0], y: p[1] })) },
      correct: pt(m), wrong: [[m[1], m[0]], [m[0] + 1, m[1]], [m[0], m[1] + 1], [x + w + 1, y + h + 1]].filter(([a, b]) => !(a === m[0] && b === m[1])).map(pt),
      hint: 'In a rectangle, opposite sides are parallel and the corners are square. The missing vertex lines up across from one point and straight up or down from another. So it shares its x-coordinate with one point and its y-coordinate with another.',
      explain: `The fourth vertex is ${pt(m)}, which makes all four corners square.`,
    });
  }],
  [4, 5, (t, rng) => {
    const vert = chance(rng, 0.5), c = R(rng, 0, 10), a = R(rng, 0, 10), b = R(rng, 0, 10);
    if (a === b) return coords(t, rng);
    const p1 = vert ? [c, a] : [a, c], p2 = vert ? [c, b] : [b, c];
    return numq({
      prompt: `How many units apart are the points ${pt(p1)} and ${pt(p2)}?`, answer: Math.abs(a - b),
      visual: t === 4 ? { type: 'coordplane', max: 10, points: [{ x: p1[0], y: p1[1], label: 'A' }, { x: p2[0], y: p2[1], label: 'B' }] } : undefined,
      hint: `Both points have the same ${vert ? 'x' : 'y'}-coordinate, ${c}, so they are on the same ${vert ? 'vertical' : 'horizontal'} line. Subtract the other coordinates: the bigger one minus the smaller one.`,
      explain: `Both points have ${vert ? 'x' : 'y'} = ${c}. ${Math.max(a, b)} − ${Math.min(a, b)} = ${Math.abs(a - b)} units.`,
    });
  }],
  // coordinates with measurement, and two transformations in a row
  [6, 7, (t, rng) => {
    if (chance(rng, 0.5)) {
      const x = R(rng, 0, 4), y = R(rng, 0, 4), w = R(rng, 2, 6), h = R(rng, 2, 6);
      const pts = [[x, y], [x, y + h], [x + w, y + h], [x + w, y]];
      const area = chance(rng, 0.5);
      return numq({
        prompt: `A rectangle has vertices at ${pts.map(pt).join(', ')}. What is its ${area ? 'area, in square units' : 'perimeter, in units'}?`, answer: area ? w * h : 2 * (w + h),
        hint: `Find each side length by subtracting coordinates: across from ${x} to ${x + w}, and up from ${y} to ${y + h}. Then ${area ? 'multiply the length by the width' : 'add all four sides'}.`,
        explain: `The sides are ${x + w} − ${x} = ${w} and ${y + h} − ${y} = ${h} units long. ${area ? `Area: ${w} × ${h} = ${w * h} square units.` : `Perimeter: 2 × (${w} + ${h}) = ${2 * (w + h)} units.`}`,
      });
    }
    const px = R(rng, 1, 4), py = R(rng, 1, 8), a = R(rng, px + 1, 6), dy = R(rng, -2, 2) || 1, dx = R(rng, -2, 2) || -1;
    const rx = 2 * a - px, fx = rx + dx, fy = py + dy;
    if (fx < 0 || fx > 10 || fy < 0 || fy > 10) return coords(t, rng);
    return mcq(rng, {
      prompt: `Point ${pt([px, py])} is reflected in the vertical line through ${a} on the x-axis. Then the image is translated ${transDesc(dx, dy)}. Where does the point end up?`,
      correct: pt([fx, fy]), wrong: [[rx, py], [px + dx, py + dy], [2 * a - px - dx, fy], [fx, py - dy], [fy, fx]].filter(([p, q]) => p >= 0 && q >= 0 && !(p === fx && q === fy)).map(pt),
      hint: `Do it in two steps. First reflect: ${pt([px, py])} is ${a - px} unit${a - px === 1 ? '' : 's'} left of the line, so its image is the same distance to the right of the line. Then move that image ${transDesc(dx, dy)}.`,
      explain: `The reflection of ${pt([px, py])} is ${pt([rx, py])}. Moving it ${transDesc(dx, dy)} gives ${pt([fx, fy])}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD9  Probability: theoretical and experimental
// ---------------------------------------------------------------------------
const PROB_FMT = ['fraction', 'percent', 'ratio'];
const ftokP = (n, d) => ftok(F(n, d));
// Probability distractors: never more than 1 (a probability cannot be bigger than 1).
const pwrong = (c, list) => fwrong(c, list).filter((f) => f.n <= f.d);

const prob = gen([
  [1, 3, (t, rng) => {
    const k = R(rng, 0, 2);
    let n, d, visual, what;
    if (k === 0) {
      const parts = pick(rng, t <= 1 ? [2, 4] : [3, 4, 5, 6, 8]), cols = sample(rng, MCOL, Math.min(3, parts));
      const secs = [...Array(parts)].map((_, i) => (i < cols.length ? cols[i] : pick(rng, cols)));
      const c = pick(rng, cols);
      n = secs.filter((x) => x === c).length; d = parts;
      visual = { type: 'spinner', sections: secs.map((col) => ({ color: col, label: col })) }; what = `landing on ${c}`;
    } else if (k === 1) {
      const items = sample(rng, MCOL, 3).map((c) => ({ color: c, count: R(rng, 1, t <= 1 ? 4 : 7) }));
      const it = pick(rng, items);
      n = it.count; d = sum(items.map((x) => x.count)); visual = { type: 'marbles', items }; what = `picking ${an(it.color)} marble`;
    } else {
      const kind = pick(rng, ['even', 'greater', 'number']);
      if (kind === 'even') { n = 3; what = 'rolling an even number'; }
      else if (kind === 'greater') { const g = R(rng, 1, 5); n = 6 - g; what = `rolling a number greater than ${g}`; }
      else { n = 1; what = `rolling a ${R(rng, 1, 6)}`; }
      d = 6; visual = { type: 'dice', values: [R(rng, 1, 6)] };
    }
    const f = F(n, d);
    return mcq(rng, {
      prompt: `What is the probability of ${what}?`, visual,
      correct: f, wrong: pwrong(f, [F(n, d + 1), F(Math.max(1, d - n), d), F(1, d), F(n, Math.max(1, d - n)), F(1, 2)]), format: ftok,
      hint: `Probability = favourable outcomes ÷ all possible outcomes. Count the outcomes that mean ${what}, then count all the possible outcomes. Write it as a fraction in simplest form.`,
      explain: `There ${n === 1 ? 'is 1 favourable outcome' : `are ${n} favourable outcomes`} out of ${d}: ${frac(n, d)}${f.n !== n ? ` = ${ftok(f)}` : ''}.`,
    });
  }],
  [2, 7, (t, rng) => {
    const exps = [['flip a coin', 2, ['heads', 'tails']], ['roll a number cube', 6, null], ['spin a spinner with 3 equal colours', 3, null], ['spin a spinner with 4 equal colours', 4, null], ['pick a day of the week', 7, null]];
    const [e1, e2] = sample(rng, exps.slice(0, t >= 4 ? 5 : 4), 2);
    const total = e1[1] * e2[1];
    let visual;
    if (t <= 2 && e1[1] * e2[1] <= 12) {
      const lab = (e, i) => (e[2] ? e[2][i] : e[0].includes('colour') ? MCOL[i] : String(i + 1));
      visual = { type: 'table', headers: [cap(e1[0].split(' ').slice(-1)[0]), ...[...Array(e2[1]).keys()].map((j) => lab(e2, j))], rows: [...Array(e1[1]).keys()].map((i) => [lab(e1, i), ...[...Array(e2[1]).keys()].map(() => '✓')]) };
    }
    return numq({
      prompt: `You ${e1[0]} and ${e2[0]}. How many possible outcomes are there?`, visual, answer: total,
      hint: `Make a table or tree diagram. Each of the ${e1[1]} outcomes of the first can go with each of the ${e2[1]} outcomes of the second. Count all the pairs, or use multiplication.`,
      explain: `${e1[1]} outcomes × ${e2[1]} outcomes = ${total} possible outcomes.`,
    });
  }],
  [3, 5, (t, rng) => {
    const parts = pick(rng, [2, 4, 5, 10, 3, 6]), c = pick(rng, MCOL), n = R(rng, 1, parts - 1);
    const trials = parts * R(rng, 3, 20);
    const cols = sample(rng, MCOL.filter((x) => x !== c), 2);
    return numq({
      prompt: `A spinner has ${parts} equal sections. ${n} ${n === 1 ? 'is' : 'are'} ${c}. If you spin ${trials} times, about how many times should it land on ${c}?`,
      visual: { type: 'spinner', sections: [...Array(parts)].map((_, i) => ({ color: i < n ? c : cols[i % 2], label: i < n ? c : cols[i % 2] })) },
      answer: (trials * n) / parts,
      hint: `The theoretical probability of ${c} is ${frac(n, parts)}: ${n} out of every ${parts} spins. How many groups of ${parts} spins are in ${trials}? Each group should give about ${n} ${c}.`,
      explain: `${frac(n, parts)} of ${trials} = ${trials} ÷ ${parts} × ${n} = ${(trials * n) / parts}. The real result may be a little different.`,
    });
  }],
  [3, 7, (t, rng) => {
    const trials = pick(rng, [20, 25, 30, 40, 50]);
    const face = R(rng, 1, 6);
    const counts = [...Array(6)].map(() => 0);
    for (let i = 0; i < trials; i++) counts[R(rng, 0, 5)]++;
    const got = counts[face - 1];
    if (got === 0) return prob(t, rng);
    const f = F(got, trials);
    return mcq(rng, {
      prompt: `${nm(rng)} rolled a number cube ${trials} times. What is the experimental probability of rolling a ${face}?`,
      visual: { type: 'tally', title: 'Results', rows: counts.map((c, i) => ({ label: String(i + 1), count: c })) },
      correct: f, wrong: pwrong(f, [F(1, 6), F(got, 6), F(trials - got, trials), F(got, trials - got), F(got + 1, trials)]), format: ftok,
      hint: `Experimental probability = times it happened ÷ number of trials. Read the tally for ${face}, write it over ${trials}, and simplify.`,
      explain: `A ${face} came up ${got} times in ${trials} rolls: ${frac(got, trials)}${f.n !== got ? ` = ${ftok(f)}` : ''}. (The theoretical probability is ${frac(1, 6)}.)`,
    });
  }],
  [4, 7, (t, rng) => {
    const flips = pick(rng, [20, 30, 40, 50]), heads = R(rng, Math.floor(flips * 0.3), Math.floor(flips * 0.7));
    const statements = [
      [`The theoretical probability of heads is ${frac(1, 2)}.`, true],
      [`The experimental probability of heads was ${frac(heads, flips)}.`, true],
      [`The coin must be broken, because heads did not come up exactly ${flips / 2} times.`, false],
      [`With more flips, the results would probably get closer to ${frac(1, 2)}.`, true],
      [`The theoretical probability of heads is ${frac(heads, flips)}.`, heads * 2 === flips],
      [`The next flip is sure to be ${heads > flips / 2 ? 'tails' : 'heads'}.`, false],
    ];
    const T = statements.filter((s) => s[1]).map((s) => s[0]), Fs = statements.filter((s) => !s[1]).map((s) => s[0]);
    const findTrue = chance(rng, 0.6) || Fs.length < 1;
    return mcq(rng, {
      prompt: `${nm(rng)} flipped a coin ${flips} times and got ${heads} heads. Which statement is ${findTrue ? 'true' : 'NOT true'}?`,
      correct: pick(rng, findTrue ? T : Fs), wrong: sample(rng, findTrue ? Fs.concat([`The experimental probability of heads was ${frac(flips - heads, flips)}.`].filter((x) => heads * 2 !== flips)) : T, 3),
      hint: `Theoretical probability comes from the possible outcomes (a coin has 2 sides, so heads is ${frac(1, 2)}). Experimental probability comes from what actually happened (${heads} heads in ${flips} flips). Results often differ from theory, and each flip is a fresh chance. Test each statement with these ideas.`,
      explain: `Theoretical: ${frac(1, 2)}. Experimental: ${frac(heads, flips)}. They are often a bit different, and they get closer with more trials.`,
    });
  }],
  [4, 5, (t, rng) => {
    const ns = sample(rng, NAMES, 3), tr = shuffle(rng, [R(rng, 8, 15), R(rng, 40, 80), R(rng, 400, 900)]);
    const best = ns[tr.indexOf(Math.max(...tr))];
    const what = pick(rng, ['flipped a coin', 'rolled a number cube', 'spun a spinner']);
    return fixedq({
      prompt: `${ns.map((x, i) => `${x} ${what} ${fmtNum(tr[i])} times`).join('. ')}. Whose experimental results are probably closest to the theoretical probability?`,
      choices: ns, correct: best,
      hint: 'More trials usually give results closer to the theoretical probability, because lucky streaks even out over time. Compare how many trials each person did.',
      explain: `${best} did the most trials (${fmtNum(Math.max(...tr))}). As the number of trials grows, experimental probability gets closer to theoretical probability.`,
    });
  }],
  [4, 5, (t, rng) => {
    const d = pick(rng, [2, 4, 5, 10, 20, 25]), n = R(rng, 1, d - 1), f = F(n, d);
    const k = R(rng, 0, 2);
    if (k === 0) return numq({ prompt: `The probability of an event is ${frac(f.n, f.d)}. What is that as a percent?`, answer: (f.n * 100) / f.d, hint: `Percent means out of 100. Write an equal fraction with 100 on the bottom: what do you multiply ${f.d} by to get 100? Multiply ${f.n} by the same number.`, explain: `${frac(f.n, f.d)} = ${frac((f.n * 100) / f.d, 100)} = ${(f.n * 100) / f.d}%.` });
    if (k === 1) {
      const out = mcq(rng, { prompt: `The probability of picking a winning ticket is ${(f.n * 100) / f.d}%. Which ratio shows this (winning : all tickets)?`, correct: `${f.n}:${f.d}`, wrong: [`${f.d}:${f.n}`, `${f.n}:${f.d - f.n}`, `${(f.n * 100) / f.d}:10`], hint: `${(f.n * 100) / f.d}% means ${(f.n * 100) / f.d} out of 100. Write it as a fraction and simplify it. The ratio winning : all tickets uses the top and bottom of that fraction.`, explain: `${(f.n * 100) / f.d}% = ${frac((f.n * 100) / f.d, 100)} = ${frac(f.n, f.d)}, so the ratio is ${f.n}:${f.d}.` });
      out.speak = ratioSay(out.prompt);
      return out;
    }
    return mcq(rng, {
      prompt: `The probability of rain is ${dn(f.n / f.d)}. Which fraction is this?`, correct: f, wrong: pwrong(f, [F(Math.round(f.n / f.d * 10) || 1, 100), F(f.d, f.n + f.d), F(f.n, f.d + 1), F(1, f.n + 1)]), format: ftok,
      hint: `Read ${dn(f.n / f.d)} out loud as tenths or hundredths. Write that as a fraction, then simplify it.`,
      explain: `${dn(f.n / f.d)} = ${frac(Math.round(f.n / f.d * 100), 100)} = ${ftok(f)}.`,
    });
  }],
  [2, 4, (t, rng) => {
    const theo = chance(rng, 0.5);
    return mcq(rng, {
      prompt: theo ? 'Which describes theoretical probability?' : 'Which describes experimental probability?',
      correct: theo ? 'What should happen, found from the possible outcomes' : 'What actually happened when you did trials',
      wrong: [theo ? 'What actually happened when you did trials' : 'What should happen, found from the possible outcomes', 'A guess with no math', 'The number of trials you did'],
      hint: 'Theoretical probability is what SHOULD happen, found by thinking about the possible outcomes. Experimental probability is what DID happen when you did trials. Check each choice against these meanings.',
      explain: 'Theoretical probability comes from the possible outcomes. Experimental probability comes from the results of real trials.',
    });
  }],
  [7, 7, (t, rng) => {
    const s = R(rng, 2, 12);
    const ways = 6 - Math.abs(7 - s);
    const f = F(ways, 36);
    return mcq(rng, {
      prompt: `You roll two number cubes and add the numbers. What is the probability that the sum is ${s}?`,
      visual: { type: 'dice', values: [R(rng, 1, 6), R(rng, 1, 6)] },
      correct: f, wrong: pwrong(f, [F(1, 11), F(1, 12), F(ways, 12), F(ways + 1, 36), F(1, 6), F(1, 36)]), format: ftok,
      hint: `There are 6 × 6 = 36 equally likely pairs. Go through the first cube's numbers one at a time and find the second number that makes ${s}, if there is one. Count those pairs and write the count out of 36.`,
      explain: `${ways} of the 36 pairs add to ${s}: ${frac(ways, 36)}${ftok(f) !== frac(ways, 36) ? ` = ${ftok(f)}` : ''}.`,
    });
  }],
  // multi-step probability
  [6, 7, (t, rng) => {
    const k = R(rng, 0, 2);
    if (k === 0) {
      const cols = sample(rng, MCOL, 3), tot = pick(rng, [10, 20, 25, 50]);
      const c1 = R(rng, 1, tot - 2), c2 = R(rng, 1, tot - c1 - 1), c3 = tot - c1 - c2;
      return numq({
        prompt: `A bag has ${c1} ${cols[0]}, ${c2} ${cols[1]} and ${c3} ${cols[2]} marbles. What is the probability of NOT picking ${cols[2]}, as a percent?`,
        visual: tot <= 25 ? { type: 'marbles', items: [{ color: cols[0], count: c1 }, { color: cols[1], count: c2 }, { color: cols[2], count: c3 }] } : undefined,
        answer: ((c1 + c2) * 100) / tot,
        hint: `NOT ${cols[2]} means picking any other colour. Count those marbles and all the marbles to make a fraction. Then change the fraction to a percent (out of 100).`,
        explain: `${c1} + ${c2} = ${c1 + c2} marbles are not ${cols[2]}, out of ${tot}. ${frac(c1 + c2, tot)} = ${frac(((c1 + c2) * 100) / tot, 100)} = ${((c1 + c2) * 100) / tot}%.`,
      });
    }
    if (k === 1) {
      const parts = pick(rng, [4, 5, 6, 8, 10]), nr = R(rng, 1, parts - 1), trials = parts * R(rng, 5, 20);
      const c = pick(rng, MCOL), others = sample(rng, MCOL.filter((x) => x !== c), 2);
      return numq({
        prompt: `A spinner has ${parts} equal sections, and ${nr} of them are ${c}. If you spin it ${trials} times, about how many times should it NOT land on ${c}?`,
        visual: { type: 'spinner', sections: [...Array(parts)].map((_, i) => ({ color: i < nr ? c : others[i % 2], label: i < nr ? c : others[i % 2] })) },
        answer: (trials * (parts - nr)) / parts,
        hint: `First find the probability of NOT ${c}: how many of the ${parts} sections are not ${c}? Then find that fraction of ${trials}.`,
        explain: `${parts - nr} of ${parts} sections are not ${c}, so the probability is ${frac(parts - nr, parts)}. ${frac(parts - nr, parts)} of ${trials} = ${(trials * (parts - nr)) / parts}.`,
      });
    }
    const Q = [
      ['You flip two coins. What is the probability of getting exactly one head?', 2, 4, 'The outcomes are HH, HT, TH and TT.'],
      ['You flip two coins. What is the probability of getting two heads?', 1, 4, 'The outcomes are HH, HT, TH and TT.'],
      ['You flip two coins. What is the probability of getting at least one head?', 3, 4, 'The outcomes are HH, HT, TH and TT.'],
      ['You flip a coin and roll a number cube. What is the probability of heads and an even number?', 3, 12, 'There are 2 × 6 = 12 outcomes.'],
      ['You flip a coin and roll a number cube. What is the probability of tails and a number greater than 4?', 2, 12, 'There are 2 × 6 = 12 outcomes.'],
      ['You spin a spinner with red, blue and green equal parts twice. What is the probability of getting red both times?', 1, 9, 'There are 3 × 3 = 9 outcomes.'],
    ];
    const [q, fn, fd, why] = pick(rng, Q);
    const f = F(fn, fd);
    return mcq(rng, {
      prompt: q, correct: f, wrong: pwrong(f, [F(1, 2), F(1, 4), F(3, 4), F(1, 3), F(fn, fd + 1), F(1, 6), F(1, 12)]), format: ftok,
      hint: 'List every possible outcome in a table or tree diagram, so you do not miss any. Count the outcomes that match, then count all the outcomes.',
      explain: `${why} ${fn} of the ${fd} outcomes match, so the probability is ${frac(fn, fd)}${ftok(f) !== frac(fn, fd) ? ` = ${ftok(f)}` : ''}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD10  Equations with letter variables: preservation of equality, equivalent forms, commutative property
// ---------------------------------------------------------------------------
const VARS = ['n', 'x', 'y', 'm', 'a', 'b', 'k', 'p', 't', 'w', 'c', 's'];

const equations6 = gen([
  [1, 3, (t, rng) => {
    const v = pick(rng, VARS), op = pick(rng, t <= 1 ? ['add', 'sub'] : ['add', 'sub', 'mul', 'div']);
    const x = R(rng, 2, t <= 1 ? 15 : 40), a = R(rng, 2, t <= 1 ? 9 : 12);
    const [lhs, c, how] = op === 'add' ? [`${v} + ${a}`, x + a, `subtract ${a} from both sides`] : op === 'sub' ? [`${v} − ${a}`, x - a, `add ${a} to both sides`]
      : op === 'mul' ? [`${a}${v}`, a * x, `divide both sides by ${a}`] : [`${v} ÷ ${a}`, x, `multiply both sides by ${a}`];
    if (op === 'sub' && c < 0) return equations6(t, rng);
    const ans = op === 'div' ? a * x : x;
    return numq({
      prompt: `Solve for ${v}: ${lhs} = ${c}`, visual: { type: 'balance', left: lhs, right: String(c), tilt: 'level' }, answer: ans,
      hint: `Do the same thing to both sides to get ${v} by itself: ${how}. The balance stays level.`,
      explain: `To keep the balance level, ${how}: ${v} = ${ans}.`,
    });
  }],
  [1, 4, (t, rng) => {
    const k = R(rng, 0, 2);
    if (k === 0) {
      const a = R(rng, 2, 9), b = R(rng, 2, 9), c = R(rng, 2, 6);
      const op = pick(rng, [['add', `Add ${c}`], ['sub', `Subtract ${c}`], ['mul', `Multiply by ${c}`]]);
      return mcq(rng, {
        prompt: `${a} + ${b} = ${a + b}. You ${op[1].toLowerCase()} on the left side. What must you do to the right side to keep it balanced?`,
        visual: { type: 'balance', left: `${a} + ${b}`, right: String(a + b), tilt: 'level' },
        correct: op[1], wrong: [`Add ${c}`, `Subtract ${c}`, `Multiply by ${c}`, 'Nothing', `Add ${c + 1}`].filter((w) => w !== op[1]),
        hint: 'Whatever you do to one side of an equation, you must also do to the other side to keep it balanced. Check each choice: does it do the same thing to the right side that was done to the left?',
        explain: `${op[1]} on both sides, and the two sides stay equal.`,
      });
    }
    const v = pick(rng, VARS);
    if (k === 1) {
      const a = R(rng, 3, 25), c = a + R(rng, 3, 40);
      return numq({
        prompt: `${v} + ${a} = ${c}, so ${v} + ${a} − ${a} = ${c} − □. What number goes in the box?`,
        visual: t <= 2 ? { type: 'balance', left: `${v} + ${a}`, right: String(c), tilt: 'level' } : undefined, answer: a,
        hint: `To keep it balanced, take the same amount from both sides. On the left, ${v} + ${a} − ${a} leaves just ${v}. What must be taken from ${c} on the right?`,
        explain: `Subtract ${a} from both sides: ${v} = ${c} − ${a} = ${c - a}.`,
      });
    }
    const a = R(rng, 2, 9), x = R(rng, 2, 12);
    return numq({
      prompt: `${a}${v} = ${a * x}, so ${a}${v} ÷ ${a} = ${a * x} ÷ □. What number goes in the box?`, answer: a,
      hint: `To keep it balanced, divide both sides by the same number. On the left, ${a}${v} ÷ ${a} leaves just ${v}. What must ${a * x} on the right be divided by?`,
      explain: `Divide both sides by ${a}: ${v} = ${a * x} ÷ ${a} = ${x}.`,
    });
  }],
  [3, 7, (t, rng) => {
    const v = pick(rng, VARS), mult = chance(rng, 0.5);
    let eq, eqv, non;
    if (!mult) {
      const a = R(rng, 2, 20), c = a + R(rng, 3, 30);
      eq = `${a} + ${v} = ${c}`;
      eqv = [`${v} + ${a} = ${c}`, `${c} = ${a} + ${v}`, `${c} − ${a} = ${v}`, `${c} − ${v} = ${a}`];
      non = [`${v} − ${a} = ${c}`, `${a}${v} = ${c}`, `${v} + ${c} = ${a}`, `${a} − ${v} = ${c}`];
    } else {
      const a = R(rng, 2, 9), x = R(rng, 2, 12), c = a * x;
      eq = `${a}${v} = ${c}`;
      eqv = [`${v} × ${a} = ${c}`, `${c} = ${a}${v}`, `${c} ÷ ${a} = ${v}`, `${c} ÷ ${v} = ${a}`];
      non = [`${v} ÷ ${a} = ${c}`, `${a} + ${v} = ${c}`, `${c} × ${a} = ${v}`, `${a} ÷ ${v} = ${c}`];
    }
    const findEq = chance(rng, 0.6);
    const sol = mult ? eq.split('= ')[1] / eq.match(/^(\d+)/)[1] : Number(eq.split('= ')[1]) - Number(eq.match(/^(\d+)/)[1]);
    const right = pick(rng, findEq ? eqv : non);
    return mcq(rng, {
      prompt: findEq ? `Which equation is equivalent to ${eq}?` : `Which equation is NOT equivalent to ${eq}?`,
      correct: right, wrong: sample(rng, findEq ? non : eqv, 3),
      hint: `Equivalent equations have the same solution. First solve ${eq} to find ${v}. Then put that value into each choice and see whether it is true.`,
      explain: `${eq} has the solution ${v} = ${sol}. ${findEq ? `${right} is also true when ${v} = ${sol}, so it is equivalent.` : `${right} is not true when ${v} = ${sol}, so it is not equivalent. The others are all true when ${v} = ${sol}.`}`,
    });
  }],
  [2, 5, (t, rng) => {
    const v = pick(rng, VARS), a = R(rng, 2, 15), k = R(rng, 0, 2);
    if (k === 0) {
      return mcq(rng, {
        prompt: 'Which equation shows the commutative property?',
        correct: pick(rng, [`${v} + ${a} = ${a} + ${v}`, `${a} × ${v} = ${v} × ${a}`]),
        wrong: [`${v} − ${a} = ${a} − ${v}`, `${v} ÷ ${a} = ${a} ÷ ${v}`, `${v} + ${a} = ${v} × ${a}`, `${a} − ${v} = ${v} + ${a}`],
        hint: 'The commutative property says you can switch the order of two numbers and get the same answer. It works for + and ×, but not for − or ÷ (compare 8 − 2 with 2 − 8). Which choice switches the order around a + or a ×?',
        explain: 'Switching the order does not change a sum or a product. It does change a difference or a quotient.',
      });
    }
    if (k === 1) {
      const op = pick(rng, ['−', '÷']);
      return mcq(rng, {
        prompt: `Is ${v} ${op} ${a} = ${a} ${op} ${v} true for every value of ${v}?`,
        correct: `No, ${op === '−' ? 'subtraction' : 'division'} is not commutative`,
        wrong: [`Yes, ${op === '−' ? 'subtraction' : 'division'} is commutative`, 'Yes, you can always switch the order', `No, because ${v} is a letter`],
        hint: `Try a value: let ${v} = ${a + 5}. Work out ${v} ${op} ${a} and ${a} ${op} ${v}. Are they the same? Then pick the choice that explains what you found.`,
        explain: `With ${v} = ${a + 5}: ${a + 5} ${op} ${a} ${op === '−' ? `= 5` : `is not equal to`} ${op === '−' ? `but ${a} − ${a + 5} is less than 0` : `${a} ÷ ${a + 5}`}. Switching the order changes the answer, so it is not always true.`,
      });
    }
    const b = R(rng, 2, 9);
    return mcq(rng, {
      prompt: `Which expression always has the same value as ${b} × ${v} + ${a}?`,
      correct: pick(rng, [`${v} × ${b} + ${a}`, `${a} + ${b} × ${v}`, `${a} + ${v} × ${b}`]),
      wrong: [`${b} × ${a} + ${v}`, `${b} + ${v} × ${a}`, `${a} × ${v} + ${b}`, `${b} × (${v} + ${a})`],
      hint: `You can switch the order inside a product or a sum without changing the value, but you cannot move a number into a different operation. Test each choice with ${v} = 2 and compare it with ${b} × 2 + ${a}.`,
      explain: 'The commutative property lets you switch the numbers in a product or a sum. The value stays the same.',
    });
  }],
  [4, 7, (t, rng) => {
    const n = nm(rng), k = R(rng, 0, 4), a = R(rng, 2, 9), b = R(rng, 3, 20);
    const S = [
      [`${n} has some cards. After getting ${a} more, ${n} has ${a + b}.`, `c + ${a} = ${a + b}`, [`c − ${a} = ${a + b}`, `${a}c = ${a + b}`, `c = ${a + b} + ${a}`], 'c'],
      [`${n} shares some berries equally among ${a} owls. Each owl gets ${b}.`, `b ÷ ${a} = ${b}`, [`${a}b = ${b}`, `b − ${a} = ${b}`, `${a} ÷ b = ${b}`], 'b'],
      [`Tickets cost $${a} each. ${n} spends $${a * b} on tickets.`, `${a}t = ${a * b}`, [`t + ${a} = ${a * b}`, `t ÷ ${a} = ${a * b}`, `${a * b}t = ${a}`], 't'],
      [`The perimeter of a square is ${4 * b} cm. Each side is s cm long.`, `4s = ${4 * b}`, [`s + 4 = ${4 * b}`, `s ÷ 4 = ${4 * b}`, `s × s = ${4 * b}`], 's'],
      [`A dragon had some gold coins and spent ${a}. It has ${b} left.`, `g − ${a} = ${b}`, [`g + ${a} = ${b}`, `${a} − g = ${b}`, `${a}g = ${b}`], 'g'],
    ][k];
    if (t >= 6 && chance(rng, 0.5)) {
      const p = R(rng, 3, 12);
      return mcq(rng, {
        prompt: `Pencils cost $${p} each. Which equation gives the total cost C for n pencils?`,
        correct: `C = ${p}n`, wrong: [`C = n + ${p}`, `C = n ÷ ${p}`, `n = ${p}C`, `C = ${p} − n`],
        hint: `Try a few values: 1 pencil costs $${p}, 2 pencils cost 2 × $${p}, and 3 pencils cost 3 × $${p}. What do you do to n every time? Find the equation that matches.`,
        explain: `Each pencil adds $${p}, so the cost is ${p} times the number of pencils: C = ${p}n.`,
      });
    }
    return mcq(rng, {
      prompt: `${S[0]} Which equation matches?`, correct: S[1], wrong: S[2],
      hint: `Use the letter ${S[3]} for the unknown. Follow the story in order: does it get more (+), get fewer (−), come in equal groups (×) or get shared (÷)? Then check what goes on the other side of the equals sign.`,
      explain: `${S[1]} matches the story.`,
    });
  }],
  [4, 5, (t, rng) => {
    const v = pick(rng, VARS), a = R(rng, 3, 9), x = R(rng, 3, 12), n = nm(rng);
    const good = chance(rng, 0.4);
    const claim = good ? x : x + pick(rng, [1, -1, 2]);
    return mcq(rng, {
      prompt: `${n} says ${v} = ${claim} is the solution to ${a}${v} = ${a * x}. Is ${n} right?`,
      correct: good ? `Yes, ${a} × ${claim} = ${a * x}` : `No, ${a} × ${claim} = ${a * claim}`,
      wrong: good ? [`No, ${a} × ${claim} = ${a * claim + a}`, `No, ${v} should be ${a * x - a}`, `Yes, because ${a} + ${claim} = ${a * x}`].filter((w) => !w.includes('Yes, because') || a + claim !== a * x)
        : [`Yes, ${a} × ${claim} = ${a * x}`, `Yes, because ${claim} is close`, `No, ${v} should be ${a * x - a}`],
      hint: `Put ${claim} in place of ${v}: work out ${a} × ${claim}. Is it equal to ${a * x}? Then pick the choice that says so correctly.`,
      explain: `${a} × ${claim} = ${a * claim}${good ? `, which equals ${a * x}. ${n} is right.` : `, not ${a * x}. The solution is ${v} = ${x}.`}`,
    });
  }],
  [6, 7, (t, rng) => {
    const v = pick(rng, VARS), a = R(rng, 2, 6), b = R(rng, 1, 15), x = R(rng, 2, 12), c = a * x + b;
    if (t === 7 && chance(rng, 0.6)) {
      return numq({
        prompt: `${a}${v} + ${b} = ${c}. Subtract ${b} from both sides, then divide both sides by ${a}. What is ${v}?`, visual: { type: 'balance', left: `${a}${v} + ${b}`, right: String(c), tilt: 'level' }, answer: x,
        hint: `Do each step to both sides so the balance stays level. After subtracting ${b}, the left side is just ${a}${v}: what is ${c} − ${b}? Then share that equally into ${a} groups.`,
        explain: `${a}${v} + ${b} − ${b} = ${c} − ${b}, so ${a}${v} = ${c - b}. Then ${v} = ${c - b} ÷ ${a} = ${x}.`,
      });
    }
    return mcq(rng, {
      prompt: `${a}${v} + ${b} = ${c}. If you subtract ${b} from both sides, which equation do you get?`,
      correct: `${a}${v} = ${c - b}`, wrong: [`${a}${v} = ${c + b}`, `${v} = ${c - b}`, `${a}${v} + ${b} = ${c - b}`, `${a} + ${v} = ${c - b}`],
      hint: `Take ${b} away from both sides. On the left, ${a}${v} + ${b} − ${b} leaves ${a}${v}. What is ${c} − ${b} on the right?`,
      explain: `${a}${v} + ${b} − ${b} = ${a}${v}, and ${c} − ${b} = ${c - b}. So ${a}${v} = ${c - b}, which means ${v} = ${x}.`,
    });
  }],
  // equations with an expression on the other side
  [6, 7, (t, rng) => {
    const v = pick(rng, VARS), k = R(rng, 0, 2);
    if (k === 0) {
      const p = R(rng, 3, 9), q = R(rng, 3, 9), a = R(rng, 2, p * q - 2);
      return numq({
        prompt: `Solve for ${v}: ${v} + ${a} = ${p} × ${q}`, answer: p * q - a,
        hint: `First work out the right side, ${p} × ${q}. Then subtract ${a} from both sides to get ${v} by itself.`,
        explain: `${p} × ${q} = ${p * q}, so ${v} + ${a} = ${p * q}. Subtract ${a} from both sides: ${v} = ${p * q - a}.`,
      });
    }
    if (k === 1) {
      const a = R(rng, 2, 9), x = R(rng, 3, 15), b = R(rng, 5, a * x - 5);
      return numq({
        prompt: `Solve for ${v}: ${a}${v} = ${b} + ${a * x - b}`, answer: x,
        hint: `First add the numbers on the right side. Then divide both sides by ${a} to get ${v} by itself.`,
        explain: `${b} + ${a * x - b} = ${a * x}, so ${a}${v} = ${a * x}. Divide both sides by ${a}: ${v} = ${x}.`,
      });
    }
    const p = R(rng, 2, 9), q = R(rng, 2, 9), a = R(rng, 2, 20);
    return numq({
      prompt: `Solve for ${v}: ${v} − ${a} = ${p} × ${q}`, answer: p * q + a,
      hint: `First work out the right side, ${p} × ${q}. Then add ${a} to both sides to get ${v} by itself.`,
      explain: `${p} × ${q} = ${p * q}, so ${v} − ${a} = ${p * q}. Add ${a} to both sides: ${v} = ${p * q + a}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD11  Perimeter, area (rectangles, triangles, parallelograms) and volume of rectangular prisms
// ---------------------------------------------------------------------------
const REG = [['equilateral_triangle', 'equilateral triangle', 3], ['square', 'square', 4], ['pentagon', 'regular pentagon', 5], ['hexagon', 'regular hexagon', 6], ['octagon', 'regular octagon', 8]];

const pav = gen([
  [1, 3, (t, rng) => {
    const w = R(rng, 2, t === 1 ? 6 : 9), h = R(rng, 2, 6), area = chance(rng, 0.5);
    return numq({
      prompt: `What is the ${area ? 'area' : 'perimeter'} of the shaded rectangle, in ${area ? 'square units' : 'units'}?`,
      visual: { type: 'grid', cols: Math.max(12, w + 2), rows: Math.max(8, h + 2), rect: { x: 1, y: 1, w, h }, showUnits: true },
      answer: area ? w * h : 2 * (w + h),
      hint: area ? `Area = length × width. The rectangle is ${w} squares across and ${h} squares down.` : `Perimeter is the distance around: add all four sides, or double (length + width). The rectangle is ${w} units across and ${h} units down.`,
      explain: area ? `${w} × ${h} = ${w * h} square units.` : `2 × (${w} + ${h}) = ${2 * (w + h)} units.`,
    });
  }],
  [1, 4, (t, rng) => {
    const unit = pick(rng, ['cm', 'm']);
    if (chance(rng, 0.55)) {
      const [shape, name, n] = pick(rng, REG), s = R(rng, 2, t <= 1 ? 9 : 25);
      return numq({
        prompt: `${cap(an(name))} has sides of ${s} ${unit}. What is its perimeter in ${unit}?`, visual: { type: 'shapes', items: [{ shape, color: pick(rng, COLOURS), size: 'l' }] }, answer: n * s,
        hint: `A ${name} has ${n} sides, all the same length (${s} ${unit}). Add them all up, or multiply.`,
        explain: `${n} × ${s} = ${n * s} ${unit}.`,
      });
    }
    const k = R(rng, 4, 6), sides = [...Array(k)].map(() => R(rng, 2, t <= 2 ? 12 : 40));
    if (Math.max(...sides) * 2 >= sum(sides)) return pav(t, rng);
    return numq({
      prompt: `A ${['', '', '', '', 'four', 'five', 'six'][k]}-sided garden has sides of ${sides.slice(0, -1).join(', ')} and ${sides[k - 1]} ${unit}. What is its perimeter in ${unit}?`,
      visual: t <= 2 ? { type: 'shapes', items: [{ shape: k === 5 ? 'irregular_pentagon' : k === 6 ? 'irregular_hexagon' : 'trapezoid', color: 'green', size: 'l' }] } : undefined,
      answer: sum(sides),
      hint: `Perimeter is the total distance around the garden. Add all ${k} sides: ${sides.join(' + ')}.`,
      explain: `${sides.join(' + ')} = ${sum(sides)} ${unit}.`,
    });
  }],
  [2, 7, (t, rng) => {
    const b = R(rng, 3, 6), h = R(rng, 2, 5), sh = pick(rng, [1, 2, 3, -1, -2]), x = R(rng, 1, 3) + Math.max(0, -sh), y = R(rng, 1, 3);
    const P = [[x, y], [x + b, y], [x + b + sh, y + h], [x + sh, y + h]];
    if (!inB(P)) return pav(t, rng);
    if (t <= 3 || chance(rng, 0.5)) {
      return numq({
        prompt: 'What is the area of the parallelogram, in square units?', visual: { type: 'coordplane', max: 10, polygon: P }, answer: b * h,
        hint: 'Area of a parallelogram = base × height. Count the base along the bottom, and count the height straight up from the base, not along the slanted side.',
        explain: `The base is ${b} units and the height is ${h} units. ${b} × ${h} = ${b * h} square units.`,
      });
    }
    const B = R(rng, 4, 20), H = R(rng, 3, 15), slant = H + R(rng, 1, 4), u = pick(rng, ['cm', 'm']);
    return mcn(rng, {
      prompt: `A parallelogram has a base of ${B} ${u}, a height of ${H} ${u} and slanted sides of ${slant} ${u}. What is its area?`,
      correct: B * H, extra: [B * slant, 2 * (B + slant), Math.round(B * H / 2)].filter((v) => v !== B * H), format: (v) => `${fmtNum(v)} ${u}²`,
      hint: `Area of a parallelogram = base × height. Use the height (${H} ${u}, measured straight up), not the slanted side (${slant} ${u}).`,
      explain: `Area = base × height = ${B} × ${H} = ${B * H} ${u}². The slanted side is not the height.`,
    });
  }],
  [2, 7, (t, rng) => {
    const b = R(rng, 2, 8), h = R(rng, 2, 7), x = R(rng, 0, 2), y = R(rng, 0, 2), apex = R(rng, -1, b + 1);
    if ((b * h) % 2 !== 0) return pav(t, rng);
    const P = [[x, y], [x + b, y], [x + apex, y + h]];
    if (!inB(P) || x + apex < 0) return pav(t, rng);
    if (t <= 3 || chance(rng, 0.5)) {
      return numq({
        prompt: 'What is the area of the triangle, in square units?', visual: { type: 'coordplane', max: 10, polygon: P }, answer: (b * h) / 2,
        hint: 'A triangle is half of a rectangle with the same base and height. Count the base along the bottom and the height straight up to the top corner. Multiply them, then take half.',
        explain: `Base ${b}, height ${h}. ${b} × ${h} ÷ 2 = ${(b * h) / 2} square units.`,
      });
    }
    const B = R(rng, 4, 20), H = R(rng, 3, 16), u = pick(rng, ['cm', 'm']);
    if ((B * H) % 2) return pav(t, rng);
    return mcn(rng, {
      prompt: `A triangle has a base of ${B} ${u} and a height of ${H} ${u}. What is its area?`,
      correct: (B * H) / 2, extra: [B * H, B + H, 2 * (B + H)], format: (v) => `${fmtNum(v)} ${u}²`,
      hint: `Area of a triangle = base × height ÷ 2. Multiply ${B} × ${H}, then take half.`,
      explain: `${B} × ${H} = ${B * H}, and half of that is ${(B * H) / 2} ${u}².`,
    });
  }],
  [3, 5, (t, rng) => {
    const k = R(rng, 0, 2), A = R(rng, 6, 60) * 2, u = pick(rng, ['cm', 'm']);
    if (k === 0) return numq({ prompt: `A rectangle has an area of ${A} ${u}². A triangle has the same base and height. What is the triangle's area in ${u}²?`, answer: A / 2, hint: 'A triangle is exactly half of a rectangle with the same base and height. Take half of the rectangle\'s area.', explain: `${A} ÷ 2 = ${A / 2} ${u}².` });
    if (k === 1) return numq({ prompt: `A triangle has an area of ${A / 2} ${u}². A parallelogram has the same base and height. What is the parallelogram's area in ${u}²?`, answer: A, hint: 'Two copies of the triangle fit together to make the parallelogram. Double the triangle\'s area.', explain: `${A / 2} × 2 = ${A} ${u}².` });
    return fixedq({
      prompt: 'A parallelogram and a rectangle have the same base and the same height. How do their areas compare?',
      choices: ['They are equal', 'The parallelogram is bigger', 'The rectangle is bigger', 'You cannot tell'], correct: 'They are equal',
      hint: 'Imagine cutting a triangle off one end of the parallelogram and sliding it to the other end. What shape do you get, and did the amount of space change?',
      explain: 'Cutting and moving a triangle turns the parallelogram into a rectangle with the same base and height, so the areas are equal.',
    });
  }],
  [1, 5, (t, rng) => {
    const mx = [3, 5, 6, 9, 12][Math.min(t, 5) - 1];
    const lo = t >= 3 ? 2 : 1, l = R(rng, 2, mx), w = R(rng, lo, Math.min(mx, 6)), h = R(rng, lo, Math.min(mx, 6)), u = pick(rng, ['cm', 'm']);
    if (t >= 4 && chance(rng, 0.5)) {
      const base = l * w;
      return numq({
        prompt: `A box has a base area of ${base} ${u}² and a height of ${h} ${u}. What is its volume in ${u}³?`, answer: base * h,
        hint: `Volume of a prism = area of the base × height. The base area is ${base} ${u}² and the height is ${h} ${u}.`,
        explain: `${base} × ${h} = ${base * h} ${u}³.`,
      });
    }
    return numq({
      prompt: t <= 3 ? `Each cube is 1 ${u}³. What is the volume of the prism in ${u}³?` : `A prism is ${l} ${u} long, ${w} ${u} wide and ${h} ${u} high. What is its volume in ${u}³?`,
      visual: t <= 3 ? { type: 'prism', l, w, h, showCubes: true } : undefined, answer: l * w * h,
      hint: `Find the area of the base (${l} × ${w}), then multiply by the height (${h}).`,
      explain: `Base: ${l} × ${w} = ${l * w}. Volume: ${l * w} × ${h} = ${l * w * h} ${u}³.`,
    });
  }],
  [3, 5, (t, rng) => {
    const l = R(rng, 2, 8), w = R(rng, 2, 6), h = R(rng, 2, 6);
    if (chance(rng, 0.5)) {
      return numq({
        prompt: `A box measuring ${l} cm × ${w} cm × ${h} cm is turned onto a different side. What is its volume now, in cm³?`, visual: { type: 'prism', l: h, w, h: l, showCubes: false }, answer: l * w * h,
        hint: `Turning a box does not add or take away any cubes. Find the volume the usual way: ${l} × ${w} × ${h}.`,
        explain: `Turning the box does not change its volume: ${l} × ${w} × ${h} = ${l * w * h} cm³ in any position.`,
      });
    }
    return fixedq({
      prompt: `${nm(rng)} stands a box measuring ${l} cm × ${w} cm × ${h} cm on its end. What happens to its volume?`,
      choices: ['It stays the same', 'It gets bigger', 'It gets smaller', 'It depends on the height'], correct: 'It stays the same',
      hint: 'The same cubes fill the box, whichever way it faces. Does standing it on its end add or remove any space inside?',
      explain: `The orientation does not change the volume. It is still ${l * w * h} cm³.`,
    });
  }],
  [4, 7, (t, rng) => {
    const k = R(rng, 0, 2), u = pick(rng, ['cm', 'm']);
    if (k === 0) {
      const l = R(rng, 2, 10), w = R(rng, 2, 8), h = R(rng, 2, 9);
      return numq({ prompt: `A rectangular prism has a volume of ${l * w * h} ${u}³. Its base is ${l} ${u} by ${w} ${u}. What is its height in ${u}?`, answer: h, hint: `Volume = base area × height. First find the base area (${l} × ${w}), then divide the volume by it.`, explain: `Base area: ${l} × ${w} = ${l * w}. Height: ${l * w * h} ÷ ${l * w} = ${h} ${u}.` });
    }
    if (k === 1) {
      const b = R(rng, 2, 12), h = R(rng, 2, 12);
      if ((b * h) % 2) return pav(t, rng);
      return numq({ prompt: `A triangle has an area of ${(b * h) / 2} ${u}² and a base of ${b} ${u}. What is its height in ${u}?`, answer: h, hint: `A triangle's area is half of base × height, so base × height is double the area. Double ${(b * h) / 2}, then divide by the base, ${b}.`, explain: `2 × ${(b * h) / 2} = ${b * h}. ${b * h} ÷ ${b} = ${h} ${u}.` });
    }
    const b = R(rng, 2, 15), h = R(rng, 2, 12);
    return numq({ prompt: `A parallelogram has an area of ${b * h} ${u}² and a height of ${h} ${u}. How long is its base in ${u}?`, answer: b, hint: `Area = base × height. Which number times ${h} makes ${b * h}?`, explain: `${b * h} ÷ ${h} = ${b} ${u}.` });
  }],
  [5, 7, (t, rng) => {
    if (t === 7 && chance(rng, 0.5)) {
      // rectangle with a triangle on top (a house shape) on a grid
      const x = R(rng, 1, 3), y = R(rng, 1, 2), w = pick(rng, [2, 4, 6]), h = R(rng, 2, 4), th = R(rng, 1, 3);
      const P = [[x, y], [x + w, y], [x + w, y + h], [x + w / 2, y + h + th], [x, y + h]];
      return numq({
        prompt: 'The shape is a rectangle with a triangle on top. What is its total area, in square units?', visual: { type: 'coordplane', max: 10, polygon: P }, answer: w * h + (w * th) / 2,
        hint: 'Split the shape into the rectangle and the triangle on top. Find the rectangle\'s area (width × height) and the triangle\'s area (base × height ÷ 2), then add them.',
        explain: `Rectangle: ${w} × ${h} = ${w * h}. Triangle: ${w} × ${th} ÷ 2 = ${(w * th) / 2}. Total: ${w * h + (w * th) / 2} square units.`,
      });
    }
    const l = R(rng, 3, 15), w = R(rng, 2, 12), u = pick(rng, ['cm', 'm']);
    return numq({
      prompt: `A rectangle has an area of ${l * w} ${u}² and a length of ${l} ${u}. What is its perimeter in ${u}?`, answer: 2 * (l + w),
      hint: `There are two steps. First find the width: ${l * w} ÷ ${l}. Then find the perimeter by adding all four sides.`,
      explain: `Width: ${l * w} ÷ ${l} = ${w} ${u}. Perimeter: 2 × (${l} + ${w}) = ${2 * (l + w)} ${u}.`,
    });
  }],
  [6, 7, (t, rng) => {
    const pb = R(rng, 3, 12), ph = R(rng, 2, 10), tb = R(rng, 3, 16), th = R(rng, 2, 14);
    if ((tb * th) % 2 || pb * ph === (tb * th) / 2) return pav(t, rng);
    const pa = pb * ph, ta = (tb * th) / 2;
    return fixedq({
      prompt: `Which has the greater area: a parallelogram with base ${pb} cm and height ${ph} cm, or a triangle with base ${tb} cm and height ${th} cm?`,
      choices: ['the parallelogram', 'the triangle', 'They are equal'], correct: pa > ta ? 'the parallelogram' : 'the triangle',
      hint: `Find each area. Parallelogram: base × height (${pb} × ${ph}). Triangle: base × height ÷ 2 (${tb} × ${th} ÷ 2). Then compare.`,
      explain: `Parallelogram: ${pb} × ${ph} = ${pa} cm². Triangle: ${tb} × ${th} ÷ 2 = ${ta} cm². The ${pa > ta ? 'parallelogram' : 'triangle'} is greater.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD12  Angles: classify, estimate, benchmarks 45°/90°/180°, protractor, triangle and quadrilateral sums
// ---------------------------------------------------------------------------
// Keep at most 4 choices (in order), always keeping the correct one.
function dropOne(rng, list, correct) {
  if (list.length <= 4) return list;
  const out = list.slice();
  while (out.length > 4) { const w = pick(rng, out.filter((x) => x !== correct)); out.splice(out.indexOf(w), 1); }
  return out;
}
const angleType = (d) => (d < 90 ? 'acute' : d === 90 ? 'right' : d < 180 ? 'obtuse' : d === 180 ? 'straight' : 'reflex');
const ANG_TYPES = ['acute', 'right', 'obtuse', 'straight', 'reflex'];
const ANG_OPTS = 'Acute = less than a square corner (90°); right = exactly 90°; obtuse = between 90° and a straight line (180°); straight = exactly 180°; reflex = more than 180°.';
const ANG_DEF = { acute: 'less than 90°', right: 'exactly 90°', obtuse: 'between 90° and 180°', straight: 'exactly 180°', reflex: 'between 180° and 360°' };

const angles = gen([
  [1, 3, (t, rng) => {
    const pool = t <= 1 ? ['acute', 'right', 'obtuse'] : t === 2 ? ['acute', 'right', 'obtuse', 'straight'] : ANG_TYPES;
    const ty = pick(rng, pool);
    const d = ty === 'acute' ? R(rng, 3, 16) * 5 : ty === 'right' ? 90 : ty === 'obtuse' ? R(rng, 20, 34) * 5 : ty === 'straight' ? 180 : R(rng, 39, 69) * 5;
    return fixedq({
      prompt: 'What kind of angle is this?', visual: { type: 'angle', degrees: d, showArc: true },
      choices: dropOne(rng, pool.map(cap), cap(ty)), correct: cap(ty),
      hint: `${ANG_OPTS} Compare the angle with a square corner and a straight line.`,
      explain: `The angle is ${d}°, which is ${ANG_DEF[ty]}, so it is ${an(ty)} angle.`,
    });
  }],
  [2, 6, (t, rng) => {
    const d = R(rng, 1, 17) * 10 + (t >= 4 ? pick(rng, [0, 5]) : 0);
    if (d === 90 || d === 180) return angles(t, rng);
    const q = { prompt: 'What is the measure of the angle on the protractor?', visual: { type: 'protractor', degrees: d } };
    if (chance(rng, 0.5)) return numq({ ...q, answer: d, hint: 'Find the arm that lies along the baseline and start at 0 on that side\'s scale. Follow the same scale up to the other arm. Is the angle smaller or bigger than a square corner (90°)?', explain: `The angle is ${d}°. It is ${angleType(d)}, so ${d < 90 ? 'less' : 'more'} than 90° makes sense.` });
    return mcq(rng, {
      ...q, correct: d, wrong: [180 - d, d + 10, d - 10].filter((x) => x > 0 && x < 180 && x !== d), format: (x) => `${x}°`,
      hint: 'A protractor has two scales. Start at 0 on the side where one arm lies along the baseline, and read that scale. Is the angle acute (less than 90°) or obtuse (more than 90°)? That tells you which reading makes sense.',
      explain: `The angle is ${d}°. Reading the other scale would give ${180 - d}°, but the angle is ${angleType(d)}.`,
    });
  }],
  [2, 4, (t, rng) => {
    const d = R(rng, 3, 17) * 10 + pick(rng, [-3, 0, 4]);
    const opts = [30, 45, 60, 90, 120, 135, 150, 180];
    const best = opts.reduce((b, x) => (Math.abs(x - d) < Math.abs(b - d) ? x : b));
    if (Math.abs(best - d) > 6) return angles(t, rng);
    const wrong = opts.filter((x) => Math.abs(x - best) >= 30);
    return mcq(rng, {
      prompt: 'Which is the best estimate for this angle?', visual: { type: 'angle', degrees: d, showArc: true },
      correct: best, wrong: sample(rng, wrong, 3), format: (x) => `about ${x}°`,
      hint: 'Use benchmark angles: half a square corner, a square corner and a straight line. Is this angle smaller or bigger than a square corner? Is it nearer to half a square corner, a whole square corner, or a straight line? Then pick the closest number of degrees.',
      explain: `The angle is close to ${best}°. ${best < 90 ? `It is ${best === 45 ? 'about half' : 'less than'} a right angle.` : best === 90 ? 'It is a square corner.' : 'It is more than a right angle but less than a straight line.'}`,
    });
  }],
  [3, 7, (t, rng) => {
    const a = R(rng, 20, 100), b = R(rng, 20, 160 - a), c = 180 - a - b;
    if (c <= 5) return angles(t, rng);
    return numq({
      prompt: `Two angles of a triangle are ${a}° and ${b}°. What is the third angle, in degrees?`, answer: c,
      visual: t === 3 ? { type: 'shapes', items: [{ shape: 'scalene_triangle', color: pick(rng, COLOURS), size: 'l' }] } : undefined,
      hint: `The angles in any triangle add up to 180°. Add the two angles you know, ${a} + ${b}, and take that away from 180.`,
      explain: `${a} + ${b} = ${a + b}. 180 − ${a + b} = ${c}°.`,
    });
  }],
  [4, 7, (t, rng) => {
    const a = R(rng, 50, 130), b = R(rng, 50, 130), c = R(rng, 50, 130), d = 360 - a - b - c;
    if (d < 30 || d > 200) return angles(t, rng);
    return numq({
      prompt: `Three angles of a quadrilateral are ${a}°, ${b}° and ${c}°. What is the fourth angle, in degrees?`, answer: d,
      hint: `The angles in any quadrilateral add up to 360°. Add the three angles you know (${a}, ${b} and ${c}), then take that away from 360.`,
      explain: `${a} + ${b} + ${c} = ${a + b + c}. 360 − ${a + b + c} = ${d}°.`,
    });
  }],
  [1, 4, (t, rng) => {
    if (chance(rng, 0.5)) {
      const [f, deg] = pick(rng, [['¼', 90], ['½', 180], ['¾', 270], ['full', 360]]);
      return numq({
        prompt: `How many degrees is a ${f} turn?`, answer: deg,
        visual: deg === 360 ? { type: 'clock', hour: 12, minute: 0 } : { type: 'angle', degrees: deg, showArc: true },
        hint: f === 'full' ? 'A full turn goes all the way around once, like the minute hand in one hour. It is the same as four quarter turns, and each quarter turn is a square corner (90°).' : `A full turn is 360°. Split 360° into ${f === '½' ? 'two' : 'four'} equal parts and take ${f === '¾' ? 'three of them' : 'one'}.`,
        explain: `A ${f} turn is ${f === 'full' ? '' : `${f} of 360°, which is `}${deg}°.`,
      });
    }
    const m = pick(rng, t <= 1 ? [15, 30, 45] : [15, 30, 45, 5, 10, 20, 40, 25, 50]);
    return numq({
      prompt: `How many degrees does the minute hand turn in ${m} minutes?`, answer: m * 6,
      visual: { type: 'clock', hour: R(rng, 1, 11), minute: 0 },
      hint: `In one hour (sixty minutes) the minute hand turns all the way around, 360°. So each minute it turns 360° divided by sixty. Multiply that by ${m}.`,
      explain: `360° ÷ 60 = 6° per minute. ${m} × 6 = ${m * 6}°.`,
    });
  }],
  [2, 4, (t, rng) => {
    const h = pick(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const d = Math.min(30 * h, 360 - 30 * h);
    const ty = angleType(d);
    return fixedq({
      prompt: `At ${h}:00, what kind of angle do the clock hands make (the smaller angle)?`, visual: { type: 'clock', hour: h, minute: 0 },
      choices: ['Acute', 'Right', 'Obtuse', 'Straight'], correct: cap(ty),
      hint: `The 12 hour marks split the whole 360° circle into 12 equal parts of 30°. Count how many hour marks apart the hands are at ${h}:00, and multiply by 30°. Then compare with 90° and 180°.`,
      explain: `The hands are ${Math.min(h, 12 - h)} hour marks apart: ${Math.min(h, 12 - h)} × 30° = ${d}°. That is ${an(ty)} angle.`,
    });
  }],
  [3, 5, (t, rng) => {
    const ty = pick(rng, ANG_TYPES);
    const d = ty === 'acute' ? R(rng, 5, 89) : ty === 'right' ? 90 : ty === 'obtuse' ? R(rng, 91, 179) : ty === 'straight' ? 180 : R(rng, 181, 359);
    return fixedq({
      prompt: `An angle measures ${d}°. What kind of angle is it?`, choices: dropOne(rng, ANG_TYPES.map(cap), cap(ty)), correct: cap(ty),
      hint: `${ANG_OPTS} Where does ${d}° fit?`,
      explain: `${d}° is ${ANG_DEF[ty]}, so it is ${an(ty)} angle.`,
    });
  }],
  [6, 7, (t, rng) => {
    const k = R(rng, 0, 3);
    if (k === 0) { const apex = R(rng, 4, 16) * 10; return numq({ prompt: `An isosceles triangle has a top angle of ${apex}°. The other two angles are equal. What is each of them, in degrees?`, answer: (180 - apex) / 2, hint: 'Take the top angle away from 180°. What is left is shared equally between the two other angles.', explain: `180 − ${apex} = ${180 - apex}. ${180 - apex} ÷ 2 = ${(180 - apex) / 2}°.` }); }
    if (k === 1) { const a = R(rng, 15, 75); return numq({ prompt: `A right triangle has one angle of ${a}°. What is the third angle, in degrees?`, answer: 90 - a, hint: 'A right angle is 90°, and all three angles add to 180°. Take the 90° and the angle you know away from 180°.', explain: `180 − 90 − ${a} = ${90 - a}°.` }); }
    if (k === 2) { const a = R(rng, 5, 17) * 5; if (a === 90) return angles(t, rng); return numq({ prompt: `A parallelogram has one angle of ${a}°. What is the size of the angle next to it, in degrees?`, answer: 180 - a, hint: 'In a parallelogram, two angles next to each other add up to 180°. Take the angle you know away from 180°.', explain: `180 − ${a} = ${180 - a}°. The four angles are ${a}°, ${180 - a}°, ${a}° and ${180 - a}°, which add to 360°.` }); }
    return mcq(rng, {
      prompt: 'Which set of angles could be the angles of a triangle?',
      correct: (() => { const a = R(rng, 30, 90), b = R(rng, 20, 150 - a); return `${a}°, ${b}°, ${180 - a - b}°`; })(),
      wrong: ['90°, 90°, 20°', (() => { const a = R(rng, 40, 80); return `${a}°, ${a}°, ${a}°`; })(), (() => { const a = R(rng, 30, 70), b = R(rng, 30, 70); return `${a}°, ${b}°, ${190 - a - b}°`; })()].filter((s) => !s.startsWith('60°, 60°, 60°')),
      hint: 'The three angles of a triangle must add up to exactly 180°. Add up each set and find the one that makes 180°. Two right angles would already use up all 180°.',
      explain: 'Only the correct set adds to 180°. A triangle cannot have two right angles, because 90° + 90° already makes 180°.',
    });
  }],
  // multi-step angle reasoning
  [6, 7, (t, rng) => {
    const k = R(rng, 0, 3);
    if (k === 0) {
      const base = R(rng, 30, 80);
      return numq({
        prompt: `An isosceles triangle has two equal angles of ${base}° each. What is the third angle, in degrees?`, answer: 180 - 2 * base,
        hint: `Add the two equal angles (${base}° + ${base}°), then take that away from 180°.`,
        explain: `${base} + ${base} = ${2 * base}. 180 − ${2 * base} = ${180 - 2 * base}°.`,
      });
    }
    if (k === 1) {
      const a = R(rng, 10, 32) * 5;
      if (a === 90) return angles(t, rng);
      return numq({
        prompt: `A kite has two equal angles of ${a}° each. Its other two angles are also equal to each other. What is the size of each of the other two angles, in degrees?`, answer: 180 - a,
        hint: `All four angles of a quadrilateral add up to 360°. Take the two ${a}° angles away from 360°, then split what is left into two equal parts.`,
        explain: `360 − ${a} − ${a} = ${360 - 2 * a}. ${360 - 2 * a} ÷ 2 = ${180 - a}°.`,
      });
    }
    if (k === 2) {
      const a = R(rng, 20, 160);
      return numq({
        prompt: `A straight line is split into two angles. One of them is ${a}°. What is the other angle, in degrees?`,
        visual: { type: 'angle', degrees: 180, showArc: true }, answer: 180 - a,
        hint: 'The two angles together make a straight angle. Take the angle you know away from the size of a straight angle.',
        explain: `A straight angle is 180°. 180 − ${a} = ${180 - a}°.`,
      });
    }
    const a = R(rng, 60, 150), b = R(rng, 60, 150);
    return numq({
      prompt: `Three angles fit together around a point. Two of them are ${a}° and ${b}°. What is the third angle, in degrees?`, answer: 360 - a - b,
      hint: `Angles all the way around a point make a full turn. Add the two angles you know, then take that away from a full turn.`,
      explain: `A full turn is 360°. ${a} + ${b} = ${a + b}. 360 − ${a + b} = ${360 - a - b}°.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// SD13  3-D objects: faces, edges, vertices; parallel and perpendicular; sorting; nets
// ---------------------------------------------------------------------------
const SOLIDS = {
  cube: { name: 'cube', f: 6, e: 12, v: 8, par: 3, prism: true, tri: false, base: 'square' },
  rect_prism: { name: 'rectangular prism', f: 6, e: 12, v: 8, par: 3, prism: true, tri: false, base: 'rectangle' },
  tri_prism: { name: 'triangular prism', f: 5, e: 9, v: 6, par: 1, prism: true, tri: true, base: 'triangle' },
  hex_prism: { name: 'hexagonal prism', f: 8, e: 18, v: 12, par: 4, prism: true, tri: false, base: 'hexagon' },
  square_pyramid: { name: 'square-based pyramid', f: 5, e: 8, v: 5, par: 0, prism: false, tri: true, base: 'square' },
  tri_pyramid: { name: 'triangular pyramid', f: 4, e: 6, v: 4, par: 0, prism: false, tri: true, base: 'triangle' },
};
const SKEYS = Object.keys(SOLIDS);
const NETS = [
  ['tri_prism', [['triangle', 2], ['rectangle', 3]]], ['rect_prism', [['rectangle', 6]]], ['cube', [['square', 6]]],
  ['square_pyramid', [['square', 1], ['triangle', 4]]], ['tri_pyramid', [['triangle', 4]]], ['hex_prism', [['hexagon', 2], ['rectangle', 6]]],
];
const solidVis = (rng, k) => ({ type: 'solids', items: [{ solid: k, color: pick(rng, COLOURS) }] });

const solids = gen([
  [1, 4, (t, rng) => {
    const k = pick(rng, t <= 1 ? ['cube', 'rect_prism', 'square_pyramid', 'tri_prism'] : SKEYS), s = SOLIDS[k];
    const what = pick(rng, ['faces', 'edges', 'vertices']);
    const val = { faces: s.f, edges: s.e, vertices: s.v }[what];
    return numq({
      prompt: `How many ${what} does a ${s.name} have?`, visual: solidVis(rng, k), answer: val,
      hint: what === 'faces' ? `Faces are the flat surfaces of a ${s.name}. Count the base or bases first, then the faces around the sides.` : what === 'edges' ? 'Edges are the lines where two faces meet. Count the edges around each base, then the edges that go up the sides.' : 'Vertices are the corners where edges meet. Count the corners on each base, plus any point at the top.',
      explain: `A ${s.name} has ${s.f} faces, ${s.e} edges and ${s.v} vertices. So it has ${val} ${what}.`,
    });
  }],
  [1, 3, (t, rng) => {
    const clues = [
      ['I have 2 triangle bases and 3 rectangle faces.', 'tri_prism'], ['I have 6 square faces.', 'cube'],
      ['I have a square base and 4 triangle faces that meet at a point.', 'square_pyramid'], ['I have 4 triangle faces.', 'tri_pyramid'],
      ['I have 2 hexagon bases and 6 rectangle faces.', 'hex_prism'], ['I have 6 rectangle faces, and not all of them are squares.', 'rect_prism'],
    ];
    const [clue, k] = pick(rng, clues);
    return mcq(rng, {
      prompt: `${clue} What am I?`, visual: t <= 1 ? solidVis(rng, k) : undefined,
      correct: SOLIDS[k].name, wrong: SKEYS.filter((x) => x !== k).map((x) => SOLIDS[x].name),
      hint: 'A prism has two matching bases joined by rectangles, and is named after its base shape. A pyramid has one base, with triangles that meet at a point on top. Use the clue: prism or pyramid, and what shape is the base?',
      explain: `A ${SOLIDS[k].name} fits the clue.`,
    });
  }],
  [2, 5, (t, rng) => {
    const k = pick(rng, SKEYS), s = SOLIDS[k];
    return numq({
      prompt: `How many pairs of parallel faces does a ${s.name} have?`, visual: solidVis(rng, k), answer: s.par,
      hint: `Parallel faces are opposite each other and would never meet, even if you made them bigger. On a ${s.name}, look for faces that come in opposite pairs, like a floor and a ceiling. Faces that lean toward each other are not parallel.`,
      explain: s.par === 0 ? `A ${s.name} has no parallel faces: all its triangle faces lean in to meet at a point.` : `A ${s.name} has ${s.par} pair${s.par === 1 ? '' : 's'} of parallel faces.${k === 'hex_prism' ? ' The 2 bases, plus 3 pairs of opposite side faces.' : k === 'tri_prism' ? ' Only the two triangle bases.' : ''}`,
    });
  }],
  [3, 7, (t, rng) => {
    const qs = [
      ['A box sits flat on a table. How many of its edges are vertical?', 4, 'Vertical edges go straight up and down, like the corners of a room.', 'The 4 edges at the corners go straight up from the table.'],
      ['A box sits flat on a table. How many of its edges are horizontal?', 8, 'Horizontal edges are flat, parallel to the table. Count the top and bottom edges.', 'The 4 edges around the bottom and the 4 edges around the top are horizontal: 4 + 4 = 8.'],
      ['A box sits flat on a table. How many of its faces are perpendicular to the bottom face?', 4, 'Perpendicular faces meet the bottom at a right angle.', 'The 4 side faces stand straight up from the bottom, so they are perpendicular to it. The top is parallel to it.'],
      ['In a cube, how many other edges are parallel to one chosen edge?', 3, 'Parallel edges point in the same direction. Look at the edges that go the same way.', 'A cube has 12 edges in 3 directions, 4 edges in each direction. The other 3 edges in the same direction are parallel.'],
      ['In a cube, how many edges are perpendicular to one chosen edge and touch it?', 4, 'Look at each end of the chosen edge.', 'At each end of the edge, 2 other edges meet it at a right angle: 2 + 2 = 4.'],
      ['A triangular prism lies on one rectangle face. How many of its faces are horizontal?', 1, 'Horizontal faces are flat like the table. Is the top a face or an edge?', 'Only the bottom rectangle face is horizontal. The top of the prism is an edge, and the other faces are slanted or upright.'],
    ];
    const [q, ans, hint, why] = pick(rng, qs);
    return numq({
      prompt: q, visual: solidVis(rng, q.includes('cube') ? 'cube' : q.includes('triangular') ? 'tri_prism' : 'rect_prism'), answer: ans, hint,
      explain: `${ans}. ${why}`,
    });
  }],
  [2, 5, (t, rng) => {
    const [k, pieces] = pick(rng, NETS);
    const items = [];
    for (const [shape, n] of pieces) for (let i = 0; i < n; i++) items.push({ shape, color: shape === 'triangle' ? 'orange' : shape === 'hexagon' ? 'purple' : 'blue', size: 's' });
    return mcq(rng, {
      prompt: `A net is made of these faces: ${pieces.map(([s, n]) => `${n} ${s}${n > 1 ? 's' : ''}`).join(' and ')}. What solid does it fold into?`,
      visual: { type: 'shapes', items },
      correct: SOLIDS[k].name, wrong: SKEYS.filter((x) => x !== k).map((x) => SOLIDS[x].name),
      hint: 'Two matching faces are the bases of a prism, joined by rectangles. A pyramid has one base plus triangles that meet at a point. Which solid uses exactly the faces in this net?',
      explain: `${pieces.map(([s, n]) => `${n} ${s}${n > 1 ? 's' : ''}`).join(' and ')} fold into a ${SOLIDS[k].name}.`,
    });
  }],
  [4, 6, (t, rng) => {
    const k = pick(rng, SKEYS), s = SOLIDS[k];
    const where = s.prism && s.tri ? 'In both circles' : s.prism ? 'Left circle only' : s.tri ? 'Right circle only' : 'Outside both circles';
    const others = sample(rng, SKEYS.filter((x) => x !== k), 2);
    const place = (x) => (SOLIDS[x].prism && SOLIDS[x].tri ? 'both' : SOLIDS[x].prism ? 'left' : SOLIDS[x].tri ? 'right' : 'out');
    return fixedq({
      prompt: `Where does a ${s.name} belong in this Venn diagram?`,
      visual: { type: 'venn', leftLabel: 'Is a prism', rightLabel: 'Has a triangle face', left: others.filter((x) => place(x) === 'left').map((x) => SOLIDS[x].name), both: others.filter((x) => place(x) === 'both').map((x) => SOLIDS[x].name), right: others.filter((x) => place(x) === 'right').map((x) => SOLIDS[x].name) },
      choices: ['Left circle only', 'Right circle only', 'In both circles', 'Outside both circles'], correct: where,
      hint: `Ask two questions about a ${s.name}. Is it a prism (two matching bases joined by rectangles)? Does it have at least one triangle face? Yes to both goes in the middle, and no to both goes outside.`,
      explain: `A ${s.name} ${s.prism ? 'is' : 'is not'} a prism and ${s.tri ? 'has' : 'does not have'} a triangle face.`,
    });
  }],
  [5, 7, (t, rng) => {
    const n = R(rng, 5, 12), prism = chance(rng, 0.5), what = pick(rng, ['faces', 'edges', 'vertices']);
    const val = prism ? { faces: n + 2, edges: 3 * n, vertices: 2 * n }[what] : { faces: n + 1, edges: 2 * n, vertices: n + 1 }[what];
    return numq({
      prompt: `A ${prism ? 'prism' : 'pyramid'} has a base with ${n} sides. How many ${what} does it have?`, answer: val,
      hint: prism ? `A prism has 2 bases with ${n} sides each, joined by ${n} rectangles. Count the ${what} on the two bases and around the sides.` : `A pyramid has 1 base with ${n} sides and ${n} triangles that meet at the top point. Count the ${what} on the base and around the sides.`,
      explain: prism ? `Faces: ${n} + 2 = ${n + 2}. Edges: 3 × ${n} = ${3 * n}. Vertices: 2 × ${n} = ${2 * n}.` : `Faces: ${n} + 1 = ${n + 1}. Edges: 2 × ${n} = ${2 * n}. Vertices: ${n} + 1 = ${n + 1}.`,
    });
  }],
  [3, 5, (t, rng) => {
    const pairs = [
      ['tri_prism', 'tri_pyramid', 'Both have triangle faces'], ['cube', 'rect_prism', 'Both have 6 faces, 12 edges and 8 vertices'],
      ['tri_prism', 'square_pyramid', 'Both have 5 faces'], ['square_pyramid', 'cube', 'Both have a square face'],
      ['rect_prism', 'hex_prism', 'Both are prisms with rectangle side faces'],
    ];
    const [a, b, right] = pick(rng, pairs);
    const wrongPool = ['Both have 8 vertices', 'Both have no parallel faces', 'Both have 12 edges', 'Both have a curved surface', 'Both have 4 faces', 'Both are pyramids'];
    const bad = wrongPool.filter((w) => {
      const A = SOLIDS[a], B = SOLIDS[b];
      if (w === 'Both have 8 vertices') return !(A.v === 8 && B.v === 8);
      if (w === 'Both have no parallel faces') return !(A.par === 0 && B.par === 0);
      if (w === 'Both have 12 edges') return !(A.e === 12 && B.e === 12);
      if (w === 'Both have 4 faces') return !(A.f === 4 && B.f === 4);
      if (w === 'Both are pyramids') return A.prism || B.prism;
      return true;
    });
    return mcq(rng, {
      prompt: `How are a ${SOLIDS[a].name} and a ${SOLIDS[b].name} alike?`, visual: { type: 'solids', items: [{ solid: a, color: 'blue' }, { solid: b, color: 'orange' }] },
      correct: right, wrong: bad,
      hint: 'Count the faces, edges and vertices of each solid, and look at the shapes of their faces. Then test each choice: is it true for BOTH solids?',
      explain: `${right}. A ${SOLIDS[a].name} has ${SOLIDS[a].f} faces, ${SOLIDS[a].e} edges and ${SOLIDS[a].v} vertices. A ${SOLIDS[b].name} has ${SOLIDS[b].f} faces, ${SOLIDS[b].e} edges and ${SOLIDS[b].v} vertices.`,
    });
  }],
  // working backward from edges
  [6, 7, (t, rng) => {
    const n = R(rng, 4, 12), prism = chance(rng, 0.5), askF = chance(rng, 0.5);
    const E = prism ? 3 * n : 2 * n;
    const ans = prism ? (askF ? n + 2 : 2 * n) : n + 1;
    return numq({
      prompt: `A ${prism ? 'prism' : 'pyramid'} has ${E} edges. How many ${askF ? 'faces' : 'vertices'} does it have?`, answer: ans,
      hint: `First work out how many sides the base has. A ${prism ? 'prism has three edges for each side of its base: one on the top, one on the bottom and one going up' : 'pyramid has two edges for each side of its base: one on the base and one going up to the top'}. Then count the ${askF ? 'faces' : 'vertices'}.`,
      explain: `${E} ÷ ${prism ? 3 : 2} = ${n}, so the base has ${n} sides. ${askF ? `Faces: ${n} ${prism ? '+ 2' : '+ 1'} = ${ans}.` : `Vertices: ${prism ? `2 × ${n}` : `${n} + 1`} = ${ans}.`}`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// Classic: integers
// ---------------------------------------------------------------------------
const neg = (n) => fmtNum(n); // fmtNum writes negatives with a proper minus sign
const INT_CTX = [
  (v) => [v < 0 ? `A diver is ${-v} m below sea level.` : `A bird flies ${v} m above sea level.`, v < 0 ? 'Below sea level is negative.' : 'Above sea level is positive.'],
  (v) => [v < 0 ? `The temperature is ${-v} degrees below zero.` : `The temperature is ${v} degrees above zero.`, v < 0 ? 'Below zero is negative.' : 'Above zero is positive.'],
  (v) => [v < 0 ? `An elevator goes to ${-v} floors below the ground floor.` : `An elevator goes to ${v} floors above the ground floor.`, v < 0 ? 'Below the ground floor is negative.' : 'Above the ground floor is positive.'],
  (v) => [v < 0 ? `A team lost ${-v} points.` : `A team gained ${v} points.`, v < 0 ? 'Losing points is negative.' : 'Gaining points is positive.'],
  (v, n) => [v < 0 ? `${n} spent $${-v}.` : `${n} earned $${v}.`, v < 0 ? 'Spending money takes it away, so it is negative.' : 'Earning money adds to it, so it is positive.'],
];
const integers = gen([
  [1, 3, (t, rng) => {
    const m = t <= 1 ? 5 : 10, v = R(rng, -m, m);
    if (v === 0 || Math.abs(v) === m) return integers(t, rng); // 0 and the ends are labelled, so they would give the answer away
    return mcq(rng, {
      prompt: 'What integer is the arrow pointing to?', visual: { type: 'numberline', min: -m, max: m, ticks: 1, labels: [-m, 0, m], arrow: v },
      correct: v, wrong: [-v, v + 1, v - 1, v + 2].filter((x) => x !== v && x >= -m && x <= m), format: neg,
      hint: 'Numbers to the left of 0 are negative and numbers to the right are positive. Count the steps from 0 to the arrow, and check which side of 0 it is on.',
      explain: `The arrow is ${Math.abs(v)} step${Math.abs(v) === 1 ? '' : 's'} ${v < 0 ? 'left' : 'right'} of 0, at ${neg(v)}.`,
    });
  }],
  [1, 4, (t, rng) => {
    const m = t <= 2 ? 10 : 50;
    let a = R(rng, -m, m), b = R(rng, -m, m);
    if (chance(rng, 0.4)) b = -a;
    if (a >= 0 && b >= 0) a = -a - 1;
    if (a === b) b = a - 1;
    if (chance(rng, 0.5)) {
      return fixedq({
        prompt: `Which symbol makes this true? ${neg(a)} □ ${neg(b)}`, choices: ['<', '>', '='], correct: CMP(a, b),
        visual: t <= 2 ? { type: 'numberline', min: -10, max: 10, ticks: 1, labels: [-10, 0, 10], marks: [{ value: a, label: neg(a) }, { value: b, label: neg(b) }] } : undefined,
        hint: `On a number line, numbers get bigger as you move right. Which of ${neg(a)} and ${neg(b)} is further right? < means "is less than" and > means "is greater than".`,
        explain: `${neg(a)} is to the ${a < b ? 'left' : 'right'} of ${neg(b)}, so ${neg(a)} ${CMP(a, b)} ${neg(b)}.`,
      });
    }
    return fixedq({
      prompt: `Which is greater: ${neg(a)} or ${neg(b)}?`, choices: [neg(a), neg(b)], correct: neg(Math.max(a, b)),
      hint: 'On a number line, the number further to the right is greater. Every positive number is greater than every negative number. For two negatives, the one closer to 0 is greater.',
      explain: `${neg(Math.max(a, b))} is farther right on the number line, so it is greater.`,
    });
  }],
  [3, 7, (t, rng) => {
    const vals = [];
    while (vals.length < (t >= 5 ? 5 : 4)) { const v = R(rng, -20, 20); if (!vals.includes(v) && !vals.includes(-v)) vals.push(v); }
    if (chance(rng, 0.5)) vals[vals.length - 1] = -vals[0];
    const up = chance(rng, 0.5);
    const sorted = vals.slice().sort((a, b) => (up ? a - b : b - a));
    const byAbs = vals.slice().sort((a, b) => (up ? Math.abs(a) - Math.abs(b) : Math.abs(b) - Math.abs(a)));
    const f = (arr) => arr.map(neg).join(', ');
    return mcq(rng, {
      prompt: `Which list is in order from ${up ? 'least to greatest' : 'greatest to least'}?`,
      correct: f(sorted), wrong: [f(byAbs), f(sorted.slice().reverse()), f([sorted[1], sorted[0], ...sorted.slice(2)])].filter((s) => s !== f(sorted)),
      hint: `Picture a number line. The most negative number is furthest left, so it is the least. Check each list: is every number ${up ? 'to the left of' : 'to the right of'} the next one?`,
      explain: `From ${up ? 'left to right' : 'right to left'} on a number line: ${f(sorted)}.`,
    });
  }],
  [2, 4, (t, rng) => {
    const v = R(rng, 1, t <= 2 ? 20 : 500) * (chance(rng, 0.5) ? -1 : 1);
    return numq({
      prompt: `What is the opposite of ${neg(v)}?`, answer: -v,
      visual: t <= 2 && Math.abs(v) <= 10 ? { type: 'numberline', min: -10, max: 10, ticks: 1, labels: [-10, 0, 10], marks: [{ value: v, label: neg(v) }] } : undefined,
      hint: `Opposites are the same distance from 0, on different sides. ${neg(v)} is ${Math.abs(v)} steps from 0, so go that far on the other side. Use the minus key for a negative answer.`,
      explain: `${neg(v)} and ${neg(-v)} are both ${Math.abs(v)} away from 0, on opposite sides.`,
    });
  }],
  [2, 5, (t, rng) => {
    const v = R(rng, 1, 30) * (chance(rng, 0.6) ? -1 : 1);
    const [txt, why] = pick(rng, INT_CTX)(v, nm(rng));
    return mcq(rng, {
      prompt: `${txt} Which integer describes this?`, correct: v, wrong: [-v, v + (v < 0 ? -1 : 1), 0].filter((x) => x !== v), format: neg,
      hint: 'Words like below, lost or spent mean a negative integer. Words like above, gained or earned mean a positive integer. Read the story: which kind is it, and how much?',
      explain: `${why} The integer is ${neg(v)}.`,
    });
  }],
  [3, 5, (t, rng) => {
    const a = -R(rng, 1, 25), b = chance(rng, 0.7) ? -R(rng, 1, 25) : R(rng, 0, 10);
    if (a === b) return integers(t, rng);
    const colder = Math.min(a, b);
    return fixedq({
      prompt: `Which temperature is colder: ${neg(a)}°C or ${neg(b)}°C?`, choices: [`${neg(a)}°C`, `${neg(b)}°C`], correct: `${neg(colder)}°C`,
      hint: `On a thermometer, lower numbers are colder. Picture ${neg(a)} and ${neg(b)} on a number line: the one further left is colder.`,
      explain: `${neg(colder)} is less than ${neg(Math.max(a, b))}, so ${neg(colder)}°C is colder.`,
    });
  }],
  [4, 7, (t, rng) => {
    const a = -R(rng, 2, 9), b = R(rng, 1, 8);
    if (chance(rng, 0.5)) {
      return numq({
        prompt: `How many integers are between ${neg(a)} and ${neg(b)}? (Do not count ${neg(a)} and ${neg(b)}.)`, answer: b - a - 1,
        visual: { type: 'numberline', min: -10, max: 10, ticks: 1, labels: [-10, 0, 10], marks: [{ value: a, label: neg(a) }, { value: b, label: neg(b) }] },
        hint: `Count the integers that come after ${neg(a)} and before ${neg(b)} on the number line. Remember to include 0.`,
        explain: `The integers between are ${[...Array(b - a - 1).keys()].map((i) => neg(a + 1 + i)).join(', ')}. That is ${b - a - 1}.`,
      });
    }
    const inside = R(rng, a + 1, b - 1);
    return mcq(rng, {
      prompt: `Which integer is between ${neg(a)} and ${neg(b)}?`, correct: inside, wrong: [a - 1, b + 1, a - 3, -b - 1, b + 4].filter((x) => x < a || x > b), format: neg,
      hint: `The integer must be greater than ${neg(a)} and less than ${neg(b)}. Test each choice on the number line: is it between the two numbers?`,
      explain: `${neg(a)} < ${neg(inside)} < ${neg(b)}.`,
    });
  }],
  [5, 7, (t, rng) => {
    const k = R(rng, 0, 2);
    if (k === 0) {
      const start = R(rng, -12, 5), ch = R(rng, 2, 15) * (chance(rng, 0.5) ? 1 : -1), end = start + ch;
      if (t >= 7) {
        const ch2 = R(rng, 3, 12) * (ch > 0 ? -1 : 1), end2 = end + ch2;
        return numq({
          prompt: `The temperature was ${neg(start)}°C. It ${ch > 0 ? 'rose' : 'dropped'} ${Math.abs(ch)} degrees, then ${ch2 > 0 ? 'rose' : 'dropped'} ${Math.abs(ch2)} degrees. What is the temperature now, in °C?`, answer: end2,
          hint: `Do one change at a time on a number line. Start at ${neg(start)} and count ${Math.abs(ch)} ${ch > 0 ? 'right' : 'left'}. From there, count ${Math.abs(ch2)} ${ch2 > 0 ? 'right' : 'left'}. Use the minus key for a negative answer.`,
          explain: `${neg(start)} ${ch > 0 ? '+' : '−'} ${Math.abs(ch)} = ${neg(end)}. ${neg(end)} ${ch2 > 0 ? '+' : '−'} ${Math.abs(ch2)} = ${neg(end2)}°C.`,
        });
      }
      return numq({
        prompt: `The temperature was ${neg(start)}°C. It ${ch > 0 ? 'rose' : 'dropped'} ${Math.abs(ch)} degrees. What is the temperature now, in °C?`, answer: end,
        visual: { type: 'numberline', min: Math.min(start, end) - 2, max: Math.max(start, end) + 2, ticks: 1, labels: 'ends', marks: [{ value: start, label: neg(start) }] },
        hint: `Start at ${neg(start)} on a number line and count ${Math.abs(ch)} ${ch > 0 ? 'right (warmer)' : 'left (colder)'}. Use the minus key for a negative answer.`,
        explain: `${neg(start)} ${ch > 0 ? '+' : '−'} ${Math.abs(ch)} = ${neg(end)}°C.`,
      });
    }
    if (k === 1) {
      const lo = -R(rng, 1, 15), hi = R(rng, 1, 20);
      return numq({
        prompt: `How many degrees warmer is ${neg(hi)}°C than ${neg(lo)}°C?`, answer: hi - lo,
        hint: `Count from ${neg(lo)} up to 0, then from 0 up to ${neg(hi)}.`,
        explain: `From ${neg(lo)} to 0 is ${-lo} degrees, and from 0 to ${hi} is ${hi}. ${-lo} + ${hi} = ${hi - lo} degrees.`,
      });
    }
    const d = R(rng, 5, 40), u = R(rng, 10, 90);
    return numq({
      prompt: `A submarine is at ${neg(-d)} m (below sea level). A plane is at ${u} m. How many metres apart are they?`, answer: u + d,
      hint: `The submarine is ${d} m below sea level and the plane is ${u} m above it. Find each one's distance to sea level (0), then add the two distances.`,
      explain: `${d} m below plus ${u} m above: ${d} + ${u} = ${u + d} m apart.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// Skill list
// ---------------------------------------------------------------------------
export const skills = [
  { id: 'g6-num-numbers', grade: 6, strand: 'number', bigIdea: 'qpv', species: 'numberling', name: 'Primes, Factors and Place Value', classic: false,
    parentDesc: 'Place value of any size, prime and composite numbers (0 and 1 are neither), factors and multiples, and fraction–decimal equivalents including repeating decimals.', gen: numbers },
  { id: 'g6-num-percent', grade: 6, strand: 'number', bigIdea: 'qpv', species: 'percenta', name: 'Percent, Ratio and Rate', classic: false,
    parentDesc: 'Percent as a ratio out of 100, percent–fraction–decimal conversions, percent of a number, part-to-part and part-to-whole ratios, rates, and estimation.', gen: percent },
  { id: 'g6-ops-decimals', grade: 6, strand: 'number', bigIdea: 'ops', species: 'multiplier', name: 'Decimal Operations', classic: false,
    parentDesc: 'Add and subtract decimals; multiply by a 1-digit whole number and divide by a 1-digit divisor (to hundredths); benchmark decimals, estimation and reasonableness.', gen: decimals },
  { id: 'g6-ops-fractions', grade: 6, strand: 'number', bigIdea: 'qpv', species: 'fractling', name: 'Fraction Operations', classic: false,
    parentDesc: 'Simplify, find common denominators, and add, subtract, multiply and divide benchmark fractions and mixed numbers; estimate results.', gen: fractions },
  { id: 'g6-ops-order', grade: 6, strand: 'number', bigIdea: 'ops', species: 'orderling', name: 'Order of Operations', classic: false,
    parentDesc: 'Apply the order of operations (brackets, × and ÷, + and −; no exponents) with whole numbers in multi-step problems.', gen: order },
  { id: 'g6-data-data', grade: 6, strand: 'stats', bigIdea: 'data', species: 'datapup', name: 'Data and Graphs', classic: false,
    parentDesc: 'Collect data with fair questions and good methods, choose appropriate graphs, interpret graphs, and spot misleading graphs.', gen: data6 },
  { id: 'g6-data-tables', grade: 6, strand: 'patterns', bigIdea: 'patterns', species: 'patternkin', name: 'Tables and Linear Graphs', classic: false,
    parentDesc: 'Tables of values and graphs for y = x + a, y = x − a, y = ax and y = x ÷ a; describe patterns, find missing values, match equations and graphs.', gen: tables6 },
  { id: 'g6-data-coords', grade: 6, strand: 'shape', bigIdea: 'geometry', species: 'mirrorwing', name: 'Coordinate Grid', classic: false,
    parentDesc: 'Plot and name points in the first quadrant; the origin and axes; translations, reflections and rotations (direction, fraction of a turn, centre).', gen: coords },
  { id: 'g6-chance-prob', grade: 6, strand: 'stats', bigIdea: 'data', species: 'chancewing', name: 'Probability', classic: false,
    parentDesc: 'Theoretical and experimental probability, sample spaces, predictions, probability as a fraction, ratio or percent, and more trials approaching theory.', gen: prob },
  { id: 'g6-alg-equations', grade: 6, strand: 'patterns', bigIdea: 'patterns', species: 'balancer', name: 'Balancing Equations', classic: false,
    parentDesc: 'Preservation of equality, equivalent forms of equations, the commutative property, and writing equations with letter variables.', gen: equations6 },
  { id: 'g6-meas-pav', grade: 6, strand: 'shape', bigIdea: 'measurement', species: 'measurer', name: 'Perimeter, Area, Volume', classic: false,
    parentDesc: 'Perimeter of polygons; area of rectangles, triangles and parallelograms and how they relate; volume of rectangular prisms (base area × height).', gen: pav },
  { id: 'g6-meas-angles', grade: 6, strand: 'shape', bigIdea: 'measurement', species: 'angler', name: 'Angles', classic: false,
    parentDesc: 'Classify and estimate angles using 45°, 90° and 180° benchmarks, read a protractor, and use angle sums of 180° (triangles) and 360° (quadrilaterals).', gen: angles },
  { id: 'g6-geo-solids', grade: 6, strand: 'shape', bigIdea: 'geometry', species: 'shapeshifter', name: '3-D Objects', classic: false,
    parentDesc: 'Describe faces, edges and vertices (parallel, perpendicular, vertical, horizontal), sort 3-D objects, and match nets to prisms and pyramids.', gen: solids },
  { id: 'g6-classic-integers', grade: 6, strand: 'number', bigIdea: 'qpv', species: 'numberling', name: 'Integers (Classic)', classic: true,
    parentDesc: 'Older curriculum: compare and order integers, use a number line, opposites, and contexts like temperature and elevation.', gen: integers },
];

export const SKIPPED = [
  { skillId: 'g6-data-data', indicator: 'Design and administer questionnaires; collect and record results', reason: 'Needs real data collection. Adapted to choosing fair survey questions and good collection methods.' },
  { skillId: 'g6-data-tables', indicator: 'Create and label graphs from tables of values', reason: 'Drawing is not possible. Adapted to matching tables, equations and plotted points.' },
  { skillId: 'g6-chance-prob', indicator: 'Conduct probability experiments with and without technology', reason: 'Physical experiments. Covered with pictured results (tally charts) and predictions.' },
  { skillId: 'g6-meas-angles', indicator: 'Draw and label angles with a protractor; find angles in the environment', reason: 'Drawing and real-world observation. Adapted to reading pictured protractors and clock hands.' },
  { skillId: 'g6-geo-solids', indicator: 'Construct prisms using nets and skeletons', reason: 'Hands-on building. Adapted to identifying the solid a set of net faces folds into.' },
  { skillId: 'g6-data-coords', indicator: 'Create designs using 2-D shapes', reason: 'Open-ended drawing. Adapted to naming shapes made by plotted points and finding missing vertices.' },
  { skillId: 'g6-meas-pav', indicator: 'Represent area and volume concretely', reason: 'Hands-on. Represented pictorially with grids, coordinate grids and cube prisms.' },
];

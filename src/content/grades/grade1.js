// Grade 1 question generators (NB holistic curriculum, Grade 1).
// Every skill: gen(tier 1..7, rng). See docs/QUESTION_SPEC.md.
import { randInt, pick, chance, shuffle, sample, mc, mcVisual, numWords } from '../qutil.js';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------
const SYM = /[+−=□<>≠¢$]/;
const EMO = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE0F}\u{200D}]/gu;
const EMO1 = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}]/u;
const ORD = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth'];
function ordWord(n) {
  if (n <= 20) return ORD[n];
  const tens = { 2: 'twenty', 3: 'thirty' }[Math.floor(n / 10)] || numWords(Math.floor(n / 10) * 10);
  return n % 10 ? `${tens}-${ORD[n % 10]}` : tens.replace(/y$/, 'ieth');
}

// Turn a prompt with symbols into read-aloud words.
function say(s) {
  return s
    .replace(/\$(\d+) bill/g, (_, d) => `${numWords(+d)}-dollar bill`)
    .replace(/\$(\d+)\.(\d\d)/g, (_, d, c) => `${numWords(+d)} dollar${+d === 1 ? '' : 's'}${+c ? ' and ' + numWords(+c) + ' cents' : ''}`)
    .replace(/\$(\d+)/g, (_, d) => `${numWords(+d)} dollar${+d === 1 ? '' : 's'}`)
    .replace(/(\d+)¢/g, (_, c) => `${numWords(+c)} cent${+c === 1 ? '' : 's'}`)
    .replace(/(\d+)(st|nd|rd|th)\b/g, (_, n) => ordWord(+n))
    .replace(EMO, '')
    .replace(/(\d+) ?cm\b/g, (_, n) => `${n} centimetre${n === '1' ? '' : 's'}`)
    .replace(/(\d+) ?dm\b/g, (_, n) => `${n} decimetre${n === '1' ? '' : 's'}`)
    .replace(/\bcm\b/g, 'centimetres')
    .replace(/\bdm\b/g, 'decimetres')
    .replace(/□/g, ' box ')
    .replace(/\+/g, ' plus ')
    .replace(/−/g, ' minus ')
    .replace(/≠/g, ' is not equal to ')
    .replace(/=/g, ' equals ')
    .replace(/</g, ' is less than ')
    .replace(/>/g, ' is greater than ')
    .replace(/\d+/g, (d) => numWords(+d))
    .replace(/\s+([?.,!])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const KEYS = ['visual', 'choices', 'answer', 'hint', 'hintVisual', 'explain', 'explainVisual'];
function Q(o) {
  const q = { kind: o.kind || 'mc', prompt: o.prompt };
  const sp = o.speak !== undefined ? o.speak.replace(EMO, '').replace(/\s+/g, ' ').trim() : (SYM.test(o.prompt) || EMO1.test(o.prompt) ? say(o.prompt) : undefined);
  if (sp) q.speak = sp;
  for (const k of KEYS) if (o[k] !== undefined) q[k] = o[k];
  return q;
}
// Multiple choice from text labels.
function mcq(rng, o) {
  const m = mc(rng, o.correct, o.wrong, { count: o.count || 4 });
  return Q({ ...o, ...m });
}
// Multiple choice for a whole-number answer: preferred distractors first, then near misses.
function mcn(rng, o) {
  const { correct, min = 0, max = 100, pre = '', suf = '' } = o;
  const count = o.count || 4;
  const seen = new Set([correct]);
  const wrong = [];
  const add = (x) => {
    if (wrong.length < count - 1 && Number.isInteger(x) && x >= min && x <= max && !seen.has(x)) { seen.add(x); wrong.push(x); }
  };
  shuffle(rng, o.wrong || []).forEach(add);
  [1, -1, 2, -2, 10, -10, 3, -3, 4, -4, 5, -5, 6, -6].forEach((d) => add(correct + d));
  const m = mc(rng, correct, wrong, { count, format: (x) => pre + x + suf });
  return Q({ ...o, ...m });
}
// Set a hint that depends on the final (shuffled) choices.
function withHint(q, fn) { q.hint = fn(q.choices); return q; }
// Keypad question.
function numq(o) { return Q({ ...o, kind: 'num', answer: String(o.answer) }); }
// Picture choices: items [{visual, correct}]
function visq(rng, o) { return Q({ ...o, ...mcVisual(rng, o.items) }); }
// Pick a format that allows this tier: list of [minTier, maxTier, fn(tier, rng)].
function F(list) {
  return (tier, rng) => {
    const t = Math.max(1, Math.min(7, Math.round(tier) || 1));
    const ok = list.filter((f) => t >= f[0] && t <= f[1]);
    return pick(rng, ok)[2](t, rng);
  };
}

const KIDS = [['Ava', 'she'], ['Liam', 'he'], ['Noor', 'she'], ['Kai', 'he'], ['Priya', 'she'], ['Mateo', 'he'], ['Chloé', 'she'],
  ['Owen', 'he'], ['Aiyana', 'she'], ['Sam', 'he'], ['Maya', 'she'], ['Leo', 'he'], ['Zara', 'she'], ['Eli', 'he'], ['Rosa', 'she'], ['Jin', 'he']];
function mkKid([name, p]) {
  return { name, p, P: p === 'she' ? 'She' : 'He', pos: p === 'she' ? 'her' : 'his', obj: p === 'she' ? 'her' : 'him' };
}
const kid = (rng) => mkKid(pick(rng, KIDS));
const twoKids = (rng) => sample(rng, KIDS, 2).map(mkKid);

const THINGS = [
  { icon: '🍎', one: 'apple', many: 'apples' }, { icon: '⭐', one: 'star', many: 'stars' },
  { icon: '💎', one: 'gem', many: 'gems' }, { icon: '🐚', one: 'shell', many: 'shells' },
  { icon: '🍪', one: 'cookie', many: 'cookies' }, { icon: '🎈', one: 'balloon', many: 'balloons' },
  { icon: '🌸', one: 'flower', many: 'flowers' }, { icon: '🐞', one: 'ladybug', many: 'ladybugs' },
  { icon: '🧪', one: 'potion', many: 'potions' }, { icon: '✏️', one: 'pencil', many: 'pencils' },
  { icon: '🦆', one: 'duck', many: 'ducks' }, { icon: '🍓', one: 'berry', many: 'berries' },
  { icon: '🐟', one: 'fish', many: 'fish' }, { icon: '🍩', one: 'donut', many: 'donuts' },
  { icon: '🪀', one: 'yo-yo', many: 'yo-yos' }, { icon: '🦉', one: 'owl', many: 'owls' },
];
// things that can be "red" or "blue"
const COLOURABLE = THINGS.filter((t) => ['balloon', 'gem', 'flower', 'potion', 'pencil', 'yo-yo'].includes(t.one));
const nOf = (n, t) => `${n} ${n === 1 ? t.one : t.many}`;
const W10 = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const art = (w) => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
// First counting steps from `from` toward `to`, never reaching `to`: "9, 10, 11…" (for hints).
function steps(from, to, step = 1, max = 3) {
  const out = [];
  const dir = to >= from ? 1 : -1;
  for (let x = from + dir * step; out.length < max && (dir > 0 ? x < to : x > to); x += dir * step) out.push(x);
  return out.length ? out.join(', ') + '…' : '';
}
const tW = (n) => `${n} ten${n === 1 ? '' : 's'}`;
const oW = (n) => `${n} one${n === 1 ? '' : 's'}`;

function numberlineAround(n, lo = 0, hi = 100, span = 5) {
  const min = Math.max(lo, n - span);
  const max = Math.min(hi, min + span * 2);
  return { min: Math.max(lo, max - span * 2), max };
}

// ---------------------------------------------------------------------------
// g1-qpv-represent
// ---------------------------------------------------------------------------
const CONFUSE = { 0: [1, 10], 1: [10, 7], 2: [10, 3], 3: [2, 8], 4: [5, 9], 5: [4, 9], 6: [7, 9], 7: [6, 10], 8: [3, 9], 9: [5, 6], 10: [2, 1] };

function glanceVisual(rng, n) {
  const opts = n <= 5 ? ['dice', 'tenframe', 'fingers', 'fiveframe'] : ['dice', 'tenframe', 'fingers', 'rekenrek'];
  const k = pick(rng, opts);
  if (k === 'dice') return { visual: { type: 'dots', count: n, arrangement: 'dice' }, noun: 'dots', explain: `The dots make a pattern you know. There are ${n} dots.` };
  if (k === 'fiveframe') return { visual: { type: 'fiveframe', count: n }, noun: 'counters', explain: n === 5 ? 'The five frame is full. That is 5.' : `${n} counters, and ${5 - n} empty. ${n} and ${5 - n} make 5.` };
  if (k === 'tenframe') {
    return {
      visual: { type: 'tenframe', count: n }, noun: 'counters',
      explain: n > 5 ? `The top row is full. That is 5. ${n - 5} more makes ${n}.` : `There are ${n} counters. ${10 - n} boxes are empty.`,
    };
  }
  if (k === 'fingers') return { visual: { type: 'fingers', count: n }, noun: 'fingers', explain: n > 5 ? `One whole hand is 5. ${n - 5} more makes ${n}.` : `${n} fingers are up.` };
  return { visual: { type: 'rekenrek', top: n, bottom: 0 }, noun: 'beads', explain: `5 red beads and ${n - 5} white beads make ${n}.` };
}

const g1Represent = F([
  // Recognize at a glance
  [1, 2, (t, rng) => {
    const n = t === 1 ? randInt(rng, 1, 6) : randInt(rng, 4, 10);
    const g = glanceVisual(rng, n);
    return mcn(rng, {
      prompt: pick(rng, [`How many ${g.noun}?`, `How many ${g.noun} do you see?`, `Quick look! How many ${g.noun}?`]),
      visual: g.visual, correct: n, wrong: [n - 1, n + 1, n + 2, 10 - n], min: 0, max: 20,
      hint: n <= 5 ? `How many ${g.noun} are there? Do not count one by one. Look for a pattern you know, like the dots on a dice.` : `How many ${g.noun} are there? Find a full group of 5 first. Then count on the rest from 5.`, explain: g.explain,
    });
  }],
  // Number words 0-10
  [1, 3, (t, rng) => {
    const n = t === 1 ? randInt(rng, 0, 5) : randInt(rng, 0, 10);
    const near = [n - 1, n + 1, ...CONFUSE[n]].filter((x) => x >= 0 && x <= 10 && x !== n);
    const ev = n > 0 ? { type: 'dots', count: n, arrangement: 'dice' } : undefined;
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: pick(rng, [`Which number is "${W10[n]}"?`, `Find the number "${W10[n]}".`, `Which number matches the word "${W10[n]}"?`]),
        speak: pick(rng, [`Which number is ${W10[n]}?`, `Find the number ${W10[n]}.`]),
        correct: String(n), wrong: near.map(String),
        hint: `Which numeral goes with the word "${W10[n]}"? Say the word out loud. Count up on your fingers until you say "${W10[n]}", then find that number.`, explain: `The word "${W10[n]}" means ${n}.`, explainVisual: ev,
      });
    }
    return mcq(rng, {
      prompt: pick(rng, [`Which word says ${n}?`, `Which word means ${n}?`]),
      visual: n > 0 && t < 3 ? pick(rng, [{ type: 'tenframe', count: n }, { type: 'dots', count: n, arrangement: 'dice' }]) : undefined,
      correct: W10[n], wrong: near.map((x) => W10[x]),
      hint: `Find the word for ${n}. Say ${n} out loud and listen to its first sound. Read each word slowly: which one starts with that sound and says ${n}?`, explain: `${n} is written "${W10[n]}".`, explainVisual: ev,
    });
  }],
  // Ten frames to 20
  [1, 3, (t, rng) => {
    const n = t === 1 ? randInt(rng, 3, 10) : t === 2 ? randInt(rng, 7, 15) : randInt(rng, 11, 20);
    return mcn(rng, {
      prompt: pick(rng, ['How many counters?', 'What number is shown?', 'How many dots in the ten frames?']),
      visual: { type: 'tenframe', count: n }, correct: n, wrong: [n - 1, n + 1, n > 10 ? n - 10 : 10 - n, n + 10], min: 0, max: 30,
      hint: n > 10 ? `How many counters in all? One frame is full, so that is 10. Count on the other frame from 10${steps(10, n) ? ': ' + steps(10, n) : ''}.` : n > 5 ? 'How many counters in all? The top row holds 5. Count on from 5 for the bottom row.' : 'How many counters are there? Touch each one as you count.',
      explain: n > 10 ? `One full ten frame is 10. ${n - 10} more makes ${n}.` : n === 10 ? 'The ten frame is full. That is 10.' : n > 5 ? `The top row is 5. ${n - 5} more makes ${n}.` : `There are ${n} counters.`,
    });
  }],
  // Compare two sets
  [2, 2, (t, rng) => {
    const [A, B] = sample(rng, THINGS, 2);
    const a = randInt(rng, 2, 10);
    let b = randInt(rng, 2, 10);
    if (chance(rng, 0.2)) b = a;
    const more = chance(rng, 0.6);
    const la = `${A.icon} ${A.many}`, lb = `${B.icon} ${B.many}`;
    const correct = a === b ? 'Same' : (a > b) === more ? la : lb;
    const big = a > b ? A.many : B.many;
    return mcq(rng, {
      prompt: more ? 'Which has more?' : 'Which has fewer?',
      visual: { type: 'compare', left: { icon: A.icon, count: a }, right: { icon: B.icon, count: b } },
      correct, wrong: [la, lb, 'Same'].filter((x) => x !== correct),
      hint: `Which row has ${more ? 'more' : 'fewer'}? Match each ${A.one} with one ${B.one}. The row with extras left over has more, and the other row has fewer. If nothing is left over, pick "Same".`,
      explain: a === b ? `Each ${A.one} matches one ${B.one}. None are left over, so they are the same.` : `Match them one to one. The ${big} have ${Math.abs(a - b)} left over, so there are more ${big}.`,
    });
  }],
  // Read base-10 blocks
  [3, 5, (t, rng) => {
    const tens = t === 3 ? randInt(rng, 1, 5) : randInt(rng, 1, 9);
    const ones = randInt(rng, 0, 9);
    const n = t === 5 && chance(rng, 0.1) ? 100 : tens * 10 + ones;
    const visual = n === 100 ? { type: 'base10', hundreds: 1, tens: 0, ones: 0 } : { type: 'base10', hundreds: 0, tens, ones };
    const base = {
      prompt: pick(rng, ['What number do the blocks show?', 'How many in all?', 'Count the tens and ones. What number?']),
      visual,
      hint: n === 100 ? 'What number do the blocks show? The big flat is made of ten rods. Count the rods in it by tens.' : `What number do the blocks show? Count the ${tens} rod${tens > 1 ? 's' : ''} by tens. Then count on ${ones ? `the ${ones} little cube${ones > 1 ? 's' : ''} by 1s` : 'any little cubes'}.`,
      explain: n === 100 ? 'The big flat is 10 tens. That is 100.' : `${tW(tens)} is ${tens * 10}. ${oW(ones)} more makes ${n}.`,
    };
    if (t >= 4 && chance(rng, 0.3)) return numq({ ...base, answer: n });
    return mcn(rng, { ...base, correct: n, wrong: [ones > 0 ? ones * 10 + tens : -1, tens + ones, n + 10, n - 10, n + 1], min: 0, max: 100 });
  }],
  // Tens and ones in symbols
  [3, 5, (t, rng) => {
    const tens = randInt(rng, 1, 9), ones = randInt(rng, 0, 9), n = tens * 10 + ones;
    const v = randInt(rng, 0, t === 5 ? 3 : 2);
    const hv = { type: 'base10', hundreds: 0, tens, ones };
    if (v === 0) {
      return mcn(rng, {
        prompt: `What number is ${tW(tens)} and ${oW(ones)}?`, correct: n, max: 999,
        wrong: [ones * 10 + tens, tens + ones, tens * 100 + ones, n + 10],
        hint: ones ? `Build it: ${tW(tens)} is ${tens * 10}. Then count on ${oW(ones)} more.` : (tens === 1 ? 'Build it: one rod is one ten. There are no extra ones.' : `Build it: count by tens, ${tens} times. There are no extra ones.`), hintVisual: hv,
        explain: `${tW(tens)} is ${tens * 10}. Add ${oW(ones)}: ${n}.`, explainVisual: hv,
      });
    }
    if (v === 1) {
      const askTens = chance(rng, 0.5);
      return mcn(rng, {
        prompt: askTens ? `How many tens are in ${n}?` : `How many ones are in ${n}?`,
        correct: askTens ? tens : ones, max: 99,
        wrong: askTens ? [ones, tens + 1, tens - 1, n] : [tens, ones + 1, ones - 1, n],
        hint: `In ${n}, the left digit counts tens and the right digit counts ones. Which digit is on the ${askTens ? 'left' : 'right'}?`,
        explain: `${n} is ${tW(tens)} and ${oW(ones)}.`, explainVisual: hv,
      });
    }
    if (v === 2) return placeHidden(rng, n, tens, ones);
    const hideTens = chance(rng, 0.5);
    return numq({
      prompt: hideTens ? `□ tens and ${oW(ones)} make ${n}.` : `${tW(tens)} and □ ones make ${n}.`,
      answer: hideTens ? tens : ones,
      hint: `Look at ${n}. The left digit tells how many tens. The right digit tells how many ones. Which one is the box?`, explain: `${n} is ${tW(tens)} and ${oW(ones)}, so the box is ${hideTens ? tens : ones}.`, explainVisual: hv,
    });
  }],
  // Hear a number name, find the numeral (read aloud)
  [3, 5, (t, rng) => {
    const tens = randInt(rng, 2, 9), ones = chance(rng, 0.2) ? 0 : randInt(rng, 1, 9);
    const n = tens * 10 + ones;
    const rev = ones ? ones * 10 + tens : -1;
    const w = numWords(n);
    return mcn(rng, {
      prompt: pick(rng, [`Which number is ${w}?`, `Find the number ${w}.`, `Listen: ${w}. Which number is it?`]),
      correct: n, wrong: [rev, tens * 100 + ones, n + 10, n - 10, n + 1], min: 1, max: 999,
      hint: ones ? `Say "${w}" slowly. The first part tells how many tens. The last part tells how many ones. Tens go on the left.` : `Say "${w}" slowly. It tells how many tens, with no extra ones. Count by tens to find it.`,
      explain: `${cap(w)} is ${tW(tens)} and ${oW(ones)}. We write it ${n}.`, explainVisual: { type: 'base10', hundreds: 0, tens, ones },
    });
  }],
  // Compare numbers
  [3, 5, (t, rng) => {
    const k = t === 5 ? 3 : 2;
    const max = t === 3 ? 50 : 100;
    let nums;
    if (t >= 4 && chance(rng, 0.5)) {
      const a = randInt(rng, 1, 9);
      let b = randInt(rng, 1, 9);
      if (b === a) b = a === 9 ? 8 : a + 1;
      nums = [a * 10 + b, b * 10 + a];
      if (k === 3) nums.push(randInt(rng, 10, 99));
    } else {
      nums = [];
      while (nums.length < k) nums.push(randInt(rng, 1, max));
    }
    nums = [...new Set(nums)];
    while (nums.length < k) { const x = randInt(rng, 1, max); if (!nums.includes(x)) nums.push(x); }
    const big = chance(rng, 0.5);
    const ans = big ? Math.max(...nums) : Math.min(...nums);
    const word = k === 3 ? (big ? 'greatest' : 'least') : (big ? 'greater' : 'less');
    return mcq(rng, {
      prompt: `Which number is ${word}?`, correct: String(ans), wrong: nums.filter((x) => x !== ans).map(String), count: k,
      hint: `${big ? 'Greater means bigger' : 'Less means smaller'}. Compare the tens digits first: the ${big ? 'biggest' : 'smallest'} tens digit wins. If the tens match, compare the ones.`,
      hintVisual: { type: 'numberline', min: 0, max: 100, ticks: 10, labels: 'ends' },
      explain: `Look at the tens. ${ans} is the ${word}.`,
      explainVisual: { type: 'numberline', min: 0, max: 100, ticks: 10, labels: [0, 50, 100], marks: nums.map((v) => ({ value: v, label: String(v) })) },
    });
  }],
  // Benchmarks 25/50/75
  [4, 7, (t, rng) => {
    const b = pick(rng, [25, 50, 75]);
    let d = randInt(rng, 1, t === 4 ? 4 : 7) * (chance(rng, 0.5) ? 1 : -1);
    const v = b + d;
    const bench = [0, 25, 50, 75, 100];
    if (t <= 5) {
      return mcq(rng, {
        prompt: pick(rng, ['The arrow is closest to which number?', 'Which number is the arrow nearest?']),
        visual: { type: 'numberline', min: 0, max: 100, ticks: 5, labels: t === 4 ? [0, 25, 50, 75, 100] : [0, 100], arrow: v },
        correct: String(b), wrong: bench.filter((x) => x !== b).map(String),
        hint: t === 4 ? 'Which labelled number is nearest the arrow? Look at the labels on each side of the arrow. Which one is fewer ticks away?' : 'Which choice is nearest the arrow? The middle of the line is halfway to 100. Halfway again on each side makes two more marks. Which mark is the arrow nearest?',
        explain: `The arrow is at about ${v}. That is closest to ${b}.`,
        explainVisual: { type: 'numberline', min: 0, max: 100, ticks: 5, labels: [0, 25, 50, 75, 100], arrow: v },
      });
    }
    if (t === 6) {
      const lo = pick(rng, [0, 25, 50, 75]), hi = lo + 25;
      let x = randInt(rng, lo + 2, hi - 2);
      if (x === lo + 12 || x === lo + 13) x = lo + pick(rng, [4, 20]);
      const near = x - lo < hi - x ? lo : hi;
      return mcq(rng, {
        prompt: `Is ${x} closer to ${lo} or ${hi}?`, correct: String(near), wrong: [String(lo === near ? hi : lo)], count: 2,
        hint: `Is ${x} nearer to ${lo} or to ${hi}? Count the jumps from ${lo} up to ${x}, then from ${x} up to ${hi}. Fewer jumps means closer.`,
        hintVisual: { type: 'numberline', min: lo, max: hi, ticks: 1, labels: [lo, hi], marks: [{ value: x, label: String(x) }] },
        explain: `${x} is ${Math.abs(x - near)} away from ${near}, and ${Math.abs(x - (near === lo ? hi : lo))} away from ${near === lo ? hi : lo}. So ${x} is closer to ${near}.`,
        explainVisual: { type: 'numberline', min: lo, max: hi, ticks: 1, labels: [lo, hi], marks: [{ value: x, label: String(x) }] },
      });
    }
    const close = b + randInt(rng, 1, 3) * (chance(rng, 0.5) ? 1 : -1);
    const far = shuffle(rng, [b + randInt(rng, 8, 12), b - randInt(rng, 8, 12), b + randInt(rng, 14, 20), b - randInt(rng, 14, 20)]).slice(0, 3);
    return mcq(rng, {
      prompt: `Which number is closest to ${b}?`, correct: String(close), wrong: far.map(String),
      hint: `Which choice is the shortest jump from ${b}? For each number, count how far it is from ${b}. Pick the smallest distance.`,
      hintVisual: { type: 'numberline', min: 0, max: 100, ticks: 5, labels: [0, 50, 100], marks: [{ value: b, label: String(b) }] },
      explain: `${close} is only ${Math.abs(close - b)} away from ${b}. The others are farther.`,
      explainVisual: { type: 'numberline', min: 0, max: 100, ticks: 5, labels: [0, 25, 50, 75, 100], marks: [{ value: close, label: String(close) }] },
    });
  }],
  // Renaming tens and ones
  [6, 7, (t, rng) => {
    const tens = randInt(rng, 1, t === 6 ? 6 : 8);
    const ones = randInt(rng, 10, Math.min(19, 99 - tens * 10));
    const n = tens * 10 + ones;
    if (chance(rng, 0.5)) {
      return mcn(rng, {
        prompt: `What number is ${tW(tens)} and ${oW(ones)}?`,
        visual: t === 6 ? { type: 'base10', hundreds: 0, tens, ones } : undefined,
        correct: n, max: 999, wrong: [tens * 100 + ones, n - 10, tens + ones, n + 10],
        hint: `${oW(ones)} is too many ones! Trade 10 of them for 1 ten. Now you have ${tW(tens + 1)} and ${oW(ones - 10)}. What number is that?`,
        explain: `${oW(ones)} is 1 ten and ${oW(ones - 10)}. So we have ${tW(tens + 1)} and ${oW(ones - 10)}. That is ${n}.`,
        explainVisual: { type: 'base10', hundreds: 0, tens: tens + 1, ones: ones - 10 },
      });
    }
    const T = Math.floor(n / 10), O = n % 10;
    return mcq(rng, {
      prompt: `Which is the same as ${n}?`,
      correct: `${tW(T - 1)} and ${oW(O + 10)}`,
      wrong: [`${tW(T)} and ${oW(O + 10)}`, `${tW(T - 1)} and ${oW(O)}`, `${tW(O + 10)} and ${oW(T - 1)}`, `${tW(T - 1)} and ${oW(O + 1)}`],
      hint: `Test each choice: count its tens by 10s, then add its ones. Which one makes ${n}? Tip: break 1 ten of ${n} into 10 ones.`,
      explain: `${n} is ${tW(T)} and ${oW(O)}. Break 1 ten into 10 ones: ${tW(T - 1)} and ${oW(O + 10)}.`,
      explainVisual: { type: 'base10', hundreds: 0, tens: T - 1, ones: O + 10 },
    });
  }],
  // Compare "4 tens" with a numeral; 10 more
  [6, 7, (t, rng) => {
    if (t === 7 && chance(rng, 0.5)) {
      const tens = randInt(rng, 1, 8), ones = randInt(rng, 0, 9), n = tens * 10 + ones;
      return mcn(rng, {
        prompt: `What is 10 more than ${tW(tens)} and ${oW(ones)}?`, correct: n + 10, max: 999,
        wrong: [n + 1, n, n - 10, (tens + 1) * 100 + ones],
        hint: `10 more means one more ten. ${tW(tens)} becomes ${tW(tens + 1)}. The ${oW(ones)} stay the same.`,
        explain: `${tW(tens)} and ${oW(ones)} is ${n}. One more ten makes ${tW(tens + 1)} and ${oW(ones)}: ${n + 10}.`,
        explainVisual: { type: 'base10', hundreds: 0, tens: tens + 1, ones },
      });
    }
    const A = randInt(rng, 2, 9);
    const B = chance(rng, 0.2) ? A * 10 : A * 10 + randInt(rng, -9, 9);
    const la = `${tW(A)}`, lb = String(B);
    const correct = A * 10 === B ? 'They are the same' : A * 10 > B ? la : lb;
    return mcq(rng, {
      prompt: `Which is more: ${tW(A)} or ${B}?`, correct, wrong: [la, lb, 'They are the same'].filter((x) => x !== correct), count: 3,
      hint: `Turn ${tW(A)} into a number: count by 10s, ${A} times. Then compare it with ${B}. If they match, pick "They are the same".`,
      hintVisual: { type: 'base10', hundreds: 0, tens: A, ones: 0 },
      explain: `${tW(A)} is ${A * 10}. ${correct === 'They are the same' ? `${A * 10} and ${B} are the same.` : `${Math.max(A * 10, B)} is more than ${Math.min(A * 10, B)}.`}`,
      explainVisual: { type: 'base10', hundreds: 0, tens: A, ones: 0 },
    });
  }],
  // Compare numbers written in different ways
  [7, 7, (t, rng) => {
    const vals = new Set();
    while (vals.size < 3) vals.add(randInt(rng, 25, 95));
    const nums = [...vals];
    const forms = nums.map((n, i) => {
      const T = Math.floor(n / 10), O = n % 10;
      if (i === 0 && T > 1) return `${tW(T - 1)} and ${oW(O + 10)}`;
      if (i === 1) return `${tW(T)} and ${oW(O)}`;
      return String(n);
    });
    const big = chance(rng, 0.5);
    const target = big ? Math.max(...nums) : Math.min(...nums);
    return mcq(rng, {
      prompt: `Which is ${big ? 'the most' : 'the least'}?`, correct: forms[nums.indexOf(target)], wrong: forms.filter((_, i) => nums[i] !== target), count: 3,
      hint: 'Turn each choice into a plain number first: count the tens by tens, then add the ones. Then compare the numbers.',
      explain: `As numbers: ${forms.map((f, i) => `${f} = ${nums[i]}`).join('; ')}. ${target} is the ${big ? 'most' : 'least'}.`,
    });
  }],
]);

function placeHidden(rng, n, tens, ones) {
  const blank = chance(rng, 0.5) ? 0 : 1;
  const ans = blank === 0 ? tens : ones;
  const other = blank === 0 ? ones : tens;
  return mcn(rng, {
    prompt: `The chart shows ${n}. What digit is hidden?`,
    visual: { type: 'placevalue', columns: ['Tens', 'Ones'], digits: [tens, ones], blank },
    correct: ans, max: 9, wrong: [other, ans + 1, ans - 1],
    hint: `${n} has two digits. The left digit counts tens and the right digit counts ones. Is the ? in the Tens or the Ones column?`,
    explain: `${n} has ${tW(tens)} and ${oW(ones)}. The hidden digit is ${ans}.`,
  });
}

// ---------------------------------------------------------------------------
// g1-qpv-fractions (halves and fourths only)
// ---------------------------------------------------------------------------
const FR = { '1/2': 'one half', '1/4': 'one fourth', '2/4': 'two fourths', '3/4': 'three fourths', '4/4': 'one whole', '2/2': 'one whole' };
const FOODS = [['🍕', 'pizza'], ['🥪', 'sandwich'], ['🍰', 'cake'], ['🥞', 'pancake'], ['🍫', 'chocolate bar'], ['🥧', 'pie'], ['🧇', 'waffle'], ['🌮', 'taco'], ['🍉', 'watermelon'], ['🍪', 'big cookie']];
const FCOL = ['red', 'blue', 'green', 'orange', 'purple', 'teal', 'pink', 'yellow'];
function fracVis(rng, parts, shaded, kind, color) {
  const c = color || pick(rng, FCOL);
  return (kind || pick(rng, ['circle', 'bar'])) === 'circle' ? { type: 'fractioncircle', parts, shaded, color: c } : { type: 'fractionbar', bars: [{ parts, shaded, color: c }] };
}

const g1Fractions = F([
  // How many equal parts?
  [1, 2, (t, rng) => {
    const parts = t === 1 ? pick(rng, [2, 4]) : pick(rng, [2, 3, 4]);
    return mcn(rng, {
      prompt: pick(rng, ['How many equal parts?', 'Count the equal parts.', 'This is cut into how many equal parts?']),
      visual: fracVis(rng, parts, t === 1 ? 0 : randInt(rng, 0, 1)), correct: parts, wrong: [parts + 1, parts - 1, parts * 2], min: 1, max: 8,
      hint: 'How many same-size pieces is the shape cut into? Put your finger on one piece. Count each piece once.',
      explain: `There are ${parts} equal parts.${parts === 2 ? ' Each part is one half.' : parts === 4 ? ' Each part is one fourth.' : ''}`,
    });
  }],
  // Which shows halves / fourths?
  [1, 3, (t, rng) => {
    const target = pick(rng, [2, 4]);
    const kind = pick(rng, ['circle', 'bar']);
    const color = pick(rng, FCOL);
    const others = target === 2 ? [3, 4, 5] : [2, 3, 6];
    const items = [target, ...sample(rng, others, t === 1 ? 1 : 3)].map((p) => ({ visual: fracVis(rng, p, 0, kind, color), correct: p === target }));
    return visq(rng, {
      prompt: target === 2 ? 'Which one is cut into halves?' : 'Which one is cut into fourths?', items,
      hint: `Halves means two equal parts. Fourths means four equal parts. Count the parts in each picture. Which one has ${target === 2 ? 'two' : 'four'}?`,
      explain: target === 2 ? 'Halves are 2 equal parts. Find the one with 2 parts.' : 'Fourths are 4 equal parts. Find the one with 4 parts.',
      explainVisual: fracVis(rng, target, 0, kind, color),
    });
  }],
  // Name the shaded part
  [2, 4, (t, rng) => {
    const opts = t === 2 ? [[2, 1], [4, 1]] : [[2, 1], [4, 1], [4, 2], [4, 3], [4, 4]];
    const [p, s] = pick(rng, opts);
    const name = FR[`${s}/${p}`];
    let wrong = ['one half', 'one fourth', 'two fourths', 'three fourths', 'one whole'].filter((x) => x !== name);
    if (p === 4 && s === 2) wrong = wrong.filter((x) => x !== 'one half');
    if (p === 2 && s === 1) wrong = wrong.filter((x) => x !== 'two fourths');
    return mcq(rng, {
      prompt: pick(rng, ['What part is shaded?', 'How much is coloured in?', 'Name the shaded part.']),
      visual: fracVis(rng, p, s), correct: name, wrong,
      hint: 'First count all the equal parts: 2 parts are halves, 4 parts are fourths. Then count the shaded parts. If every part is shaded, that is one whole.',
      explain: s === p ? `All ${p} parts are shaded. That is one whole.` : `There are ${p} equal parts. ${s} ${s === 1 ? 'is' : 'are'} shaded. That is ${name}.`,
    });
  }],
  // Which picture shows ...?
  [2, 4, (t, rng) => {
    const targets = t === 2 ? [[2, 1], [4, 1]] : [[2, 1], [4, 1], [4, 3]];
    const [p, s] = pick(rng, targets);
    const val = s / p;
    const pool = [[2, 1], [4, 1], [4, 2], [4, 3], [3, 1], [4, 0], [2, 2]].filter(([pp, ss]) => ss / pp !== val);
    const kind = pick(rng, ['circle', 'bar']), color = pick(rng, FCOL);
    const items = [[p, s], ...sample(rng, pool, 3)].map(([pp, ss], i) => ({ visual: fracVis(rng, pp, ss, kind, color), correct: i === 0 }));
    const name = FR[`${s}/${p}`];
    return visq(rng, {
      prompt: `Which shows ${name} shaded?`, items,
      hint: `${cap(name)} means the shape has ${p} equal parts and ${s} ${s === 1 ? 'is' : 'are'} shaded. In each picture, count all the parts, then the shaded parts.`,
      explain: `${cap(name)}: the shape has ${p} equal parts and ${s} ${s === 1 ? 'is' : 'are'} shaded.`,
      explainVisual: fracVis(rng, p, s, kind, color),
    });
  }],
  // Half of a set
  [3, 5, (t, rng) => {
    const n = 2 * randInt(rng, t === 3 ? 1 : 2, t === 3 ? 4 : t === 4 ? 6 : 10);
    const th = pick(rng, THINGS);
    const k = kid(rng);
    const prompt = chance(rng, 0.5)
      ? `What is half of ${n} ${th.many}?`
      : `${k.name} shares ${n} ${th.many} fairly with a friend. How many does each get?`;
    return mcn(rng, {
      prompt, visual: n <= 12 || t < 5 ? { type: 'objects', items: [{ icon: th.icon, count: n }], layout: 'row' } : undefined,
      correct: n / 2, wrong: [n, n / 2 + 1, n / 2 - 1, n - 2], min: 1, max: 30,
      hint: `Half means two equal groups. Share the ${n} ${th.many} one at a time, one for each person, until none are left. Count one group.`,
      explain: `Split ${n} into 2 equal groups: ${n / 2} and ${n / 2}. Half of ${n} is ${n / 2}.`,
      explainVisual: { type: 'fractionset', total: n, shaded: n / 2, icon: th.icon },
    });
  }],
  // Equal parts? (yes/no)
  [4, 5, (t, rng) => {
    const k = kid(rng);
    const [icon, food] = pick(rng, FOODS);
    const parts = pick(rng, [2, 4]);
    const nm = parts === 2 ? 'one half' : 'one fourth';
    const v = randInt(rng, 0, 2);
    if (v === 0) {
      return mcq(rng, {
        prompt: `${k.name} cuts a ${food} ${icon} into ${parts} same-size pieces. Is each piece ${nm}?`,
        visual: { type: 'fractioncircle', parts, shaded: 0, color: pick(rng, FCOL) }, correct: 'Yes', wrong: ['No'], count: 2,
        hint: `For ${nm}, two things must be true: exactly ${parts} pieces, and every piece the same size. Check both. If both are true, answer Yes.`, explain: `The ${parts} pieces are the same size, so each piece is ${nm}.`,
      });
    }
    if (v === 1) {
      return mcq(rng, {
        prompt: `${k.name} cuts a ${food} ${icon} into ${parts} pieces. Some are big, some are small. Is each piece ${nm}?`,
        correct: 'No', wrong: ['Yes'], count: 2,
        hint: `For ${nm}, two things must be true: exactly ${parts} pieces, and every piece the same size. Check both. If both are true, answer Yes.`, explain: `The pieces are not the same size, so they are not ${parts === 2 ? 'halves' : 'fourths'}.`,
      });
    }
    const wrongParts = parts === 2 ? 3 : pick(rng, [3, 5]);
    return mcq(rng, {
      prompt: `${k.name} cuts a ${food} ${icon} into ${wrongParts} equal pieces. Is each piece ${nm}?`,
      visual: { type: 'fractioncircle', parts: wrongParts, shaded: 1, color: pick(rng, FCOL) }, correct: 'No', wrong: ['Yes'], count: 2,
      hint: `For ${nm}, two things must be true: exactly ${parts} pieces, and every piece the same size. Check both. If both are true, answer Yes.`, explain: `There are ${wrongParts} pieces, not ${parts}. So each piece is not ${nm}.`,
    });
  }],
  // Sharing story
  [4, 5, (t, rng) => {
    const [icon, food] = pick(rng, FOODS);
    const n = pick(rng, [2, 4]);
    const k = kid(rng);
    const correct = n === 2 ? 'one half' : 'one fourth';
    return mcq(rng, {
      prompt: n === 2 ? `${k.name} and a friend share a ${food} ${icon} equally. What part does each get?` : `${n} friends share a ${food} ${icon} equally. What part does each get?`,
      visual: t === 4 ? { type: 'fractioncircle', parts: n, shaded: 1, color: pick(rng, FCOL) } : undefined,
      correct, wrong: [n === 2 ? 'one fourth' : 'one half', 'one whole', n === 2 ? 'two' : 'four', 'three fourths'],
      hint: 'Count the people sharing. That is how many equal pieces. Two pieces are halves, four pieces are fourths. "One whole" would mean nobody shared.',
      explain: `${n} people means ${n} equal parts. Each part is ${correct}.`,
      explainVisual: { type: 'fractioncircle', parts: n, shaded: 1 },
    });
  }],
  // Compare half vs fourth
  [5, 6, (t, rng) => {
    const [a, b] = twoKids(rng);
    const [icon, food] = pick(rng, FOODS);
    if (chance(rng, 0.5)) {
      const aHalf = chance(rng, 0.5);
      return mcq(rng, {
        prompt: `${a.name} eats ${aHalf ? 'one half' : 'one fourth'} of a ${food} ${icon}. ${b.name} eats ${aHalf ? 'one fourth' : 'one half'} of the same size ${food}. Who eats more?`,
        visual: { type: 'fractionbar', bars: [{ parts: 2, shaded: 1, label: aHalf ? a.name : b.name }, { parts: 4, shaded: 1, label: aHalf ? b.name : a.name }] },
        correct: aHalf ? a.name : b.name, wrong: [aHalf ? b.name : a.name, 'The same'], count: 3,
        hint: `Picture the same ${food} cut into 2 pieces, and cut into 4 pieces. Which pieces are bigger? The one with the bigger piece eats more.`,
        explain: 'A half is bigger than a fourth of the same size whole. A fourth is half of a half.',
      });
    }
    const askBig = chance(rng, 0.5);
    return mcq(rng, {
      prompt: askBig ? `Which piece of the ${food} is bigger?` : `Which piece of the ${food} is smaller?`,
      visual: { type: 'fractionbar', bars: [{ parts: 2, shaded: 1, color: pick(rng, FCOL) }, { parts: 4, shaded: 1, color: pick(rng, FCOL) }] },
      correct: askBig ? 'one half' : 'one fourth', wrong: [askBig ? 'one fourth' : 'one half', 'They are the same'], count: 3,
      hint: `A half comes from cutting the ${food} into 2 pieces. A fourth comes from cutting it into 4 pieces. More pieces means each piece is smaller. Compare the bars.`,
      explain: 'Cutting into 4 parts makes smaller pieces than cutting into 2 parts. One half is bigger than one fourth.',
    });
  }],
  // A half of a bigger whole is bigger
  [5, 6, (t, rng) => {
    const [a, b] = twoKids(rng);
    const aBig = chance(rng, 0.5);
    if (chance(rng, 0.5)) {
      const thing = pick(rng, ['sheet of paper', 'pizza', 'sandwich', 'cake']);
      const col = pick(rng, FCOL);
      return mcq(rng, {
        prompt: `${a.name} has a big ${thing}. ${b.name} has a small ${thing}. Each cuts it in half. Whose half is bigger?`,
        visual: { type: 'shapes', items: [{ shape: 'rectangle', color: col, size: aBig ? 'l' : 's', label: a.name }, { shape: 'rectangle', color: col, size: aBig ? 's' : 'l', label: b.name }] },
        correct: `${a.name}'s half`, wrong: [`${b.name}'s half`, 'They are the same'], count: 3,
        hint: `Both are halves, but the wholes are not the same size. Picture each ${thing} cut into 2 equal parts. Which whole was bigger to start with?`,
        explain: `Half of a big ${thing} is bigger than half of a small ${thing}. The size of the whole matters.`,
      });
    }
    const big = 2 * randInt(rng, 4, 8), small = 2 * randInt(rng, 1, 3);
    const th = pick(rng, THINGS);
    const [na, nb] = aBig ? [big, small] : [small, big];
    return mcq(rng, {
      prompt: `${a.name} has ${na} ${th.many}. ${b.name} has ${nb} ${th.many}. Each gives away half. Who gives away more?`,
      visual: { type: 'compare', left: { icon: th.icon, count: na }, right: { icon: th.icon, count: nb } },
      correct: aBig ? a.name : b.name, wrong: [aBig ? b.name : a.name, 'They give the same'], count: 3,
      hint: `Find half of ${na}: share them into 2 equal groups. Then find half of ${nb}. Compare the two halves.`,
      explain: `Half of ${na} is ${na / 2}. Half of ${nb} is ${nb / 2}. Half of a bigger group is more.`,
    });
  }],
  // Counting parts in a whole
  [5, 7, (t, rng) => {
    const v = t === 5 ? randInt(rng, 0, 2) : randInt(rng, 2, 3);
    const bars = { type: 'fractionbar', bars: [{ parts: 1, shaded: 0, label: 'whole' }, { parts: 2, shaded: 0 }, { parts: 4, shaded: 0 }] };
    const [icon, food] = pick(rng, FOODS);
    if (v === 0) {
      return mcn(rng, {
        prompt: pick(rng, [`How many fourths make one whole ${food}?`, 'How many fourths make one whole?']), visual: t === 5 ? bars : undefined,
        correct: 4, wrong: [2, 3, 1, 5], min: 1, max: 8, hint: 'Fourths are named for how many equal parts the whole has. Look at the fourths bar. Count its parts.', hintVisual: bars,
        explain: 'A whole cut into fourths has 4 equal parts. 4 fourths make one whole.', explainVisual: bars,
      });
    }
    if (v === 1) {
      return mcn(rng, {
        prompt: pick(rng, [`How many halves make one whole ${food}?`, 'How many halves make one whole?']), visual: t === 5 ? bars : undefined,
        correct: 2, wrong: [1, 4, 3], min: 1, max: 8, hint: 'Halves are named for how many equal parts the whole has. Look at the halves bar. Count its parts.', hintVisual: bars,
        explain: 'A whole cut into halves has 2 equal parts. 2 halves make one whole.', explainVisual: bars,
      });
    }
    if (v === 2) {
      return mcq(rng, {
        prompt: 'A fourth is half of a ___.', speak: 'A fourth is half of a what?',
        visual: bars, correct: 'half', wrong: ['whole', 'fourth'], count: 3,
        hint: 'Look at the bars. Put your finger on one fourth. Is it half of the whole bar, half of a half, or the same as a fourth?',
        explain: 'If you cut one half into 2 equal parts, each part is one fourth. So a fourth is half of a half.',
      });
    }
    return mcn(rng, {
      prompt: 'How many fourths make one half?', visual: bars, correct: 2, wrong: [4, 1, 3], min: 1, max: 8,
      hint: 'Put your finger on the one half piece. Count how many fourth pieces line up under it.',
      explain: 'One half lines up with 2 fourths. So 2 fourths make one half.',
    });
  }],
  // Number line placement
  [5, 7, (t, rng) => {
    const opts = t === 5 ? ['1/2', '1/4'] : ['1/2', '1/4', '3/4'];
    const f = pick(rng, opts);
    const val = { '1/2': 0.5, '1/4': 0.25, '3/4': 0.75 }[f];
    const halvesOnly = f === '1/2' && chance(rng, 0.4);
    return mcq(rng, {
      prompt: pick(rng, ['Where is the arrow between 0 and 1?', 'What part of the way to 1 is the arrow?']),
      visual: { type: 'numberline', min: 0, max: 1, ticks: halvesOnly ? 0.5 : 0.25, labels: [0, 1], arrow: val },
      correct: FR[f], wrong: ['one half', 'one fourth', 'three fourths', 'one whole'].filter((x) => x !== FR[f]),
      hint: 'Count the equal jumps from 0 to 1: that tells you halves or fourths. Then count the jumps from 0 to the arrow.',
      explain: halvesOnly ? 'The line is cut into 2 equal parts. The arrow is in the middle: one half.' : `The line from 0 to 1 is cut into 4 equal parts. The arrow is at ${FR[f]}.`,
    });
  }],
  // Fourth of a set / half of a half
  [6, 7, (t, rng) => {
    const th = pick(rng, THINGS);
    if (t === 7 && chance(rng, 0.5)) {
      const n = pick(rng, [4, 8, 12, 16, 20]);
      return mcn(rng, {
        prompt: `What is half of half of ${n} ${th.many}?`, correct: n / 4, wrong: [n / 2, n / 4 + 1, n / 4 - 1, n], min: 1, max: 30,
        hint: `First share the ${n} ${th.many} into two equal groups. Then share one group into two equal groups again. Count one small group.`,
        explain: `Half of ${n} is ${n / 2}. Half of ${n / 2} is ${n / 4}.`, explainVisual: { type: 'fractionset', total: n, shaded: n / 4, icon: th.icon },
      });
    }
    const n = pick(rng, t === 6 ? [4, 8, 12] : [8, 12, 16, 20]);
    return mcn(rng, {
      prompt: `What is one fourth of ${n} ${th.many}?`,
      visual: n <= 12 ? { type: 'objects', items: [{ icon: th.icon, count: n }], layout: 'row' } : undefined,
      correct: n / 4, wrong: [n / 2, 4, n / 4 + 1, n - 4], min: 1, max: 30,
      hint: `One fourth means four equal groups. Deal the ${n} ${th.many} into four groups, one at a time, until none are left. Count one group.`,
      explain: `Share ${n} into 4 equal groups. Each group has ${n / 4}. One fourth of ${n} is ${n / 4}.`,
      explainVisual: { type: 'fractionset', total: n, shaded: n / 4, icon: th.icon },
    });
  }],
  // Parts missing from a whole; two-step halving
  [6, 7, (t, rng) => {
    const k = kid(rng);
    const th = pick(rng, THINGS);
    if (t === 7 && chance(rng, 0.5)) {
      const n = pick(rng, [8, 12, 16, 20]);
      const [m] = twoKids(rng).filter((x) => x.name !== k.name);
      return mcn(rng, {
        prompt: `${k.name} has ${n} ${th.many}. ${k.P} gives half to ${m.name}. Then ${k.p} gives half of what is left to a friend. How many does ${k.name} keep?`,
        correct: n / 4, wrong: [n / 2, n / 4 + 1, n / 4 - 1, n - 2], min: 1, max: 30,
        hint: `Two steps. First find half of ${n}: share them into two equal groups. Then find half of one group.`,
        explain: `Half of ${n} is ${n / 2}, so ${k.name} has ${n / 2} left. Half of ${n / 2} is ${n / 4}. ${k.P} keeps ${n / 4}.`,
        explainVisual: { type: 'fractionset', total: n, shaded: n / 4, icon: th.icon },
      });
    }
    const [icon, food] = pick(rng, FOODS);
    const halves = t === 6 && chance(rng, 0.3);
    const p = halves ? 2 : 4, s = randInt(rng, 1, p - 1);
    return mcn(rng, {
      prompt: `${cap(numWords(s))} ${p === 2 ? 'half' : s === 1 ? 'fourth' : 'fourths'} of the ${food} ${icon} ${s === 1 ? 'is' : 'are'} eaten. How many more ${p === 2 ? 'halves' : 'fourths'} to eat the whole thing?`,
      speak: `${cap(numWords(s))} ${p === 2 ? 'half' : s === 1 ? 'fourth' : 'fourths'} of the ${food} ${s === 1 ? 'is' : 'are'} eaten. How many more ${p === 2 ? 'halves' : 'fourths'} to eat the whole thing?`,
      visual: t === 6 ? { type: 'fractioncircle', parts: p, shaded: s } : undefined, correct: p - s, wrong: [p, s, p - s + 1, 0], min: 0, max: 8,
      hint: `How many ${p === 2 ? 'halves' : 'fourths'} make one whole ${food}? Take away the ${s === 1 ? 'one' : numWords(s)} already eaten.`,
      explain: `One whole is ${p} ${p === 2 ? 'halves' : 'fourths'}. ${p} − ${s} = ${p - s} more.`,
      explainVisual: { type: 'fractioncircle', parts: p, shaded: s },
    });
  }],
  // Equivalent names
  [6, 7, (t, rng) => {
    const v = t === 7 ? 0 : randInt(rng, 0, 2);
    const kind = pick(rng, ['circle', 'bar']);
    if (v === 0) {
      return mcq(rng, {
        prompt: 'Two fourths is the same as what?', visual: fracVis(rng, 4, 2, kind),
        correct: 'one half', wrong: ['one fourth', 'one whole', 'three fourths'],
        hint: 'Compare the shaded part with the whole shape. Is it one small part, half of the shape, three parts, or the whole thing?', explain: '2 of 4 equal parts cover half the shape. Two fourths is one half.',
        explainVisual: { type: 'fractionbar', bars: [{ parts: 4, shaded: 2 }, { parts: 2, shaded: 1 }] },
      });
    }
    if (v === 1) {
      return mcq(rng, {
        prompt: 'Four fourths make what?', visual: fracVis(rng, 4, 4, kind),
        correct: 'one whole', wrong: ['one half', 'one fourth', 'four halves'],
        hint: 'One half is 1 of 2 parts. One fourth is 1 of 4 parts. Here, count the shaded parts: is any part left white?', explain: 'All 4 fourths are shaded. That is one whole.',
      });
    }
    return mcq(rng, {
      prompt: 'Two halves make what?', visual: fracVis(rng, 2, 2, kind),
      correct: 'one whole', wrong: ['one half', 'one fourth', 'two fourths'],
      hint: 'Put the two halves side by side. Is any piece of the shape missing, or is it all there?', explain: '2 halves cover the whole shape. Two halves make one whole.',
    });
  }],
]);

// ---------------------------------------------------------------------------
// g1-qpv-count
// ---------------------------------------------------------------------------
const g1Count = F([
  // Count a collection
  [1, 2, (t, rng) => {
    if (t === 2 && chance(rng, 0.5)) {
      const [A, B] = sample(rng, THINGS, 2);
      const a = randInt(rng, 3, 9), b = randInt(rng, 2, 20 - a > 9 ? 9 : 20 - a);
      return mcn(rng, {
        prompt: pick(rng, ['How many things in all?', `How many ${A.many} and ${B.many} in all?`]),
        visual: { type: 'objects', items: [{ icon: A.icon, count: a }, { icon: B.icon, count: b }], layout: 'scatter' },
        correct: a + b, wrong: [a, b, a + b + 1, a + b - 1], min: 1, max: 30,
        hint: `How many things altogether? Count all the ${A.many} first. Then keep counting on with the ${B.many}. Touch each one only once.`,
        explain: `${a} ${A.many} and ${b} ${B.many}. Count them all: ${a + b}. The last number you say tells how many.`,
      });
    }
    const th = pick(rng, THINGS);
    const n = t === 1 ? randInt(rng, 3, 10) : randInt(rng, 8, 20);
    return mcn(rng, {
      prompt: pick(rng, [`How many ${th.many}?`, `Count the ${th.many}.`]),
      visual: { type: 'objects', items: [{ icon: th.icon, count: n }], layout: t === 1 ? 'row' : 'scatter' },
      correct: n, wrong: [n - 1, n + 1, n + 2], min: 1, max: 30,
      hint: `How many ${th.many}? Touch each one as you count, and count each one only once. The last number you say tells how many.`,
      explain: `Count them one by one: there are ${n}. The last number you say tells how many.`,
    });
  }],
  // What comes next (forward / back by 1)
  [1, 5, (t, rng) => {
    const back = t >= 2 && chance(rng, 0.4);
    let s;
    if (t === 1) s = randInt(rng, 1, 7);
    else if (t === 2) s = back ? randInt(rng, 6, 20) : randInt(rng, 5, 17);
    else if (t === 3) s = back ? randInt(rng, 24, 99) : randInt(rng, 21, 96);
    else s = back ? 10 * randInt(rng, 2, 9) + randInt(rng, 1, 2) : Math.min(97, 10 * randInt(rng, 2, 10) - randInt(rng, 2, 3)); // stay within 100
    const d = back ? -1 : 1;
    const seq = [s, s + d, s + 2 * d, s + 3 * d];
    const hole = t === 5 ? randInt(rng, 0, 3) : 3;
    const ans = seq[hole];
    const items = seq.map((x, i) => (i === hole ? '?' : x));
    const q = {
      prompt: back ? 'Count back. What number is missing?' : 'Count on. What number is missing?',
      visual: { type: 'pattern', items },
      hint: `The numbers go ${back ? 'down' : 'up'} by 1 each time. Read them out loud and say the number that fits the ? spot.${t >= 4 ? ' Careful when the tens digit changes!' : ''}`,
      hintVisual: { type: 'numberline', min: Math.min(...seq) - 1, max: Math.max(...seq) + 1, ticks: 1, labels: 'ends' },
      explain: `Counting ${back ? 'back' : 'on'} by 1s: ${seq.join(', ')}. The missing number is ${ans}.`,
      explainVisual: { type: 'numberline', min: Math.min(...seq) - 1, max: Math.max(...seq) + 1, ticks: 1, labels: 'all' },
    };
    if (t >= 3 && chance(rng, 0.35)) return numq({ ...q, answer: ans });
    const tensSlip = back ? ans - 9 : ans - 10 + 1;
    return mcn(rng, { ...q, correct: ans, wrong: t <= 2 ? [ans + d, ans - d, ans + 2 * d] : [ans + d, ans - d, tensSlip, ans + 10], min: 0, max: t <= 2 ? 25 : 100 });
  }],
  // 1 or 2 more / less
  [1, 5, (t, rng) => {
    const d = t === 1 ? 1 : pick(rng, [1, 2]);
    const more = chance(rng, 0.5);
    let n;
    if (t === 1) n = more ? randInt(rng, 1, 9) : randInt(rng, 2, 10);
    else if (t === 2) n = more ? randInt(rng, 2, 18) : randInt(rng, 3, 20);
    else if (t === 3) n = randInt(rng, 10, 95);
    else n = more ? 10 * randInt(rng, 2, 9) - randInt(rng, 1, d) : 10 * randInt(rng, 2, 9) + randInt(rng, 0, d - 1);
    const ans = more ? n + d : n - d;
    const nl = numberlineAround(n, 0, 100, 4);
    let visual;
    if (t === 1) visual = { type: 'dots', count: n, arrangement: n <= 6 ? 'dice' : 'line' };
    else if (t === 2) visual = { type: 'numberline', min: nl.min, max: nl.max, ticks: 1, labels: 'all', marks: [{ value: n }] };
    const k = kid(rng), th = pick(rng, THINGS);
    const prompt = t === 5 && chance(rng, 0.6)
      ? (more ? `${k.name} has ${n} ${th.many}. ${k.P} gets ${d} more. How many now?` : `${k.name} has ${n} ${th.many}. ${k.P} gives away ${d}. How many now?`)
      : `What is ${d} ${more ? 'more' : 'less'} than ${n}?`;
    return mcn(rng, {
      prompt, visual, correct: ans, wrong: [more ? n - d : n + d, ans + 1, ans - 1, n, ans + 10], min: 0, max: t <= 2 ? 22 : 110,
      hint: `${d} ${more ? 'more' : 'less'} means start at ${n} and count ${more ? 'up' : 'back'} ${d === 1 ? 'one step' : 'two steps'}.${d === 2 ? ` The first step is ${more ? n + 1 : n - 1}.` : ''}`,
      hintVisual: t >= 2 ? { type: 'numberline', min: nl.min, max: nl.max, ticks: 1, labels: 'ends', marks: [{ value: n, label: String(n) }] } : undefined,
      explain: `${d} ${more ? 'more' : 'less'} than ${n} is ${ans}.`,
      explainVisual: { type: 'numberline', min: nl.min, max: nl.max, ticks: 1, labels: 'all', jumps: [{ from: n, to: ans, label: (more ? '+' : '−') + d }] },
    });
  }],
  // Skip counting (by 2s forward to and back from 20; by 5s and 10s forward to 100)
  [2, 5, (t, rng) => {
    const step = t === 2 ? pick(rng, [10, 2]) : pick(rng, [2, 2, 5, 10]);
    const back = step === 2 && t >= 3 && chance(rng, 0.45);
    const limit = step === 2 ? 20 : 100;
    const maxK = limit / step;
    const k0 = randInt(rng, 0, maxK - 4);
    let seq = [0, 1, 2, 3, 4].map((i) => (k0 + i) * step).slice(0, t <= 2 ? 4 : 5);
    if (back) seq = seq.map((x) => 20 - x);
    const d = back ? -step : step;
    const hole = t <= 3 ? seq.length - 1 : randInt(rng, t === 4 ? 1 : 0, seq.length - 1);
    const ans = seq[hole];
    const lo = Math.min(...seq), hi = Math.max(...seq);
    return mcn(rng, {
      prompt: back ? 'Count back by 2s. What number is missing?' : `Count by ${step}s. What number is missing?`,
      visual: { type: 'pattern', items: seq.map((x, i) => (i === hole ? '?' : x)) },
      correct: ans, wrong: [ans + 1, ans - 1, ans + d, ans - d, hole > 0 ? seq[hole - 1] + (back ? -1 : 1) : ans + 2], min: 0, max: 110,
      hint: hole === 0 ? `Each number is ${numWords(step)} ${back ? 'less' : 'more'} than the one before. So the ? is ${numWords(step)} ${back ? 'more' : 'less'} than ${seq[1]}.` : `Each number is ${numWords(step)} ${back ? 'less' : 'more'} than the one before. Start at ${seq[hole - 1]} and jump ${numWords(step)} ${back ? 'back' : 'more'}.`,
      explain: `Counting ${back ? 'back ' : ''}by ${step}s: ${seq.join(', ')}. The missing number is ${ans}.`,
      explainVisual: { type: 'numberline', min: lo, max: hi, ticks: step, labels: 'all', jumps: seq.slice(1).map((x, i) => ({ from: seq[i], to: x })) },
    });
  }],
  // Hundred chart
  [3, 5, (t, rng) => {
    const n = randInt(rng, t === 3 ? 11 : 2, t === 3 ? 60 : 99);
    const r = String(n).split('').reverse().join('');
    const rev = n >= 10 && n % 10 !== 0 ? +r : -1;
    return mcn(rng, {
      prompt: pick(rng, ['Which number is hiding?', 'What number goes in the ? box?']),
      visual: { type: 'hundredchart', blank: [n] }, correct: n, wrong: [n + 1, n - 1, n + 10, n - 10, rev], min: 1, max: 100,
      hint: `Which number hides under the ? box? The number just before it is ${n - 1}. What comes next? You can check: the number above it is ten less.`,
      explain: `The number before is ${n - 1} and the number after is ${n + 1}. So the hidden number is ${n}.`,
    });
  }],
  // Count bundles of ten
  [3, 4, (t, rng) => {
    const tens = randInt(rng, 1, t === 3 ? 5 : 9), ones = randInt(rng, 0, 9);
    const n = tens * 10 + ones;
    return mcn(rng, {
      prompt: pick(rng, ['Each rod is a bundle of 10. How many in all?', 'Count by 10s, then by 1s. How many?']),
      visual: { type: 'base10', hundreds: 0, tens, ones }, correct: n, wrong: [tens + ones, ones * 10 + tens, n + 10, n - 1], min: 0, max: 100,
      hint: `How many in all? Count the ${tens} rod${tens > 1 ? 's' : ''} by tens. Then count on ${ones ? `the ${ones} little cube${ones > 1 ? 's' : ''} by ones` : 'any little cubes'}.`,
      explain: `${tens} bundles of 10 is ${tens * 10}. Count on ${ones}: ${n}.`,
    });
  }],
  // Order numbers
  [4, 6, (t, rng) => {
    const k = t === 6 ? 4 : 3;
    const max = t === 4 ? 50 : 100;
    const set = new Set();
    if (chance(rng, 0.5)) {
      const a = randInt(rng, 1, 9), b = randInt(rng, 1, 9);
      if (a !== b) { set.add(a * 10 + b); set.add(b * 10 + a); }
    }
    while (set.size < k) set.add(randInt(rng, 0, max));
    const nums = [...set];
    const asc = nums.slice().sort((x, y) => x - y);
    const up = true; // Grade 1 orders from least to greatest only; descending order comes in Grade 2.
    const right = up ? asc : asc.slice().reverse();
    const perms = [right.slice().reverse(), [right[1], right[0], ...right.slice(2)], [...right.slice(0, -2), right[k - 1], right[k - 2]], shuffle(rng, right), [right[0], right[2], right[1], ...right.slice(3)]];
    const fmt = (a) => a.join(', ');
    return mcq(rng, {
      prompt: up ? 'Which list goes from smallest to biggest?' : 'Which list goes from biggest to smallest?',
      correct: fmt(right), wrong: perms.map(fmt),
      hint: `Find the ${up ? 'smallest' : 'biggest'} number first by comparing tens digits. Then find the next one. Check which list follows that order from left to right.`,
      explain: `${up ? 'Smallest to biggest' : 'Biggest to smallest'}: ${fmt(right)}.`,
      explainVisual: { type: 'numberline', min: 0, max: 100, ticks: 10, labels: [0, 50, 100], marks: nums.map((v) => ({ value: v, label: String(v) })) },
    });
  }],
  // Before / after / between
  [4, 5, (t, rng) => {
    const n = randInt(rng, 11, 99);
    const v = randInt(rng, 0, 2);
    const prompt = v === 0 ? `What number comes between ${n - 1} and ${n + 1}?` : v === 1 ? `What number comes just before ${n + 1}?` : `What number comes just after ${n - 1}?`;
    const q = {
      prompt, hint: v === 1 ? `Just before means one less. Count back one from ${n + 1}.` : `${v === 0 ? 'Between means in the middle.' : 'Just after means one more.'} Say ${n - 1}, then say the next number.`,
      explain: `${n - 1}, ${n}, ${n + 1}. The answer is ${n}.`,
      explainVisual: { type: 'numberline', min: n - 2, max: n + 2, ticks: 1, labels: 'all', marks: [{ value: n, label: String(n) }] },
    };
    if (chance(rng, 0.4)) return numq({ ...q, answer: n });
    return mcn(rng, { ...q, correct: n, wrong: [n + 2, n - 2, n + 10, n - 10], min: 0, max: 100 });
  }],
  // Count on / back from a number
  [6, 7, (t, rng) => {
    const back = chance(rng, 0.4);
    const d = t === 6 ? randInt(rng, 2, 4) : randInt(rng, 3, 6);
    const s = back ? randInt(rng, 20 + d, 99) : randInt(rng, 15, 100 - d);
    const ans = back ? s - d : s + d;
    const k = kid(rng);
    const prompt = pick(rng, [
      `Start at ${s}. Count ${back ? 'back' : 'on'} ${d}. Where do you land?`,
      `${k.name} is on step ${s}. ${k.P} hops ${back ? 'back' : 'up'} ${d} steps. What step now?`,
    ]);
    const q = {
      prompt, hint: `Start at ${s}. Count ${back ? 'back' : 'on'} ${d}, one number for each hop: ${steps(s, ans)} Keep going until you have said ${d} numbers.`,
      explain: `${s}, then ${Array.from({ length: d }, (_, i) => (back ? s - i - 1 : s + i + 1)).join(', ')}. You land on ${ans}.`,
      explainVisual: { type: 'numberline', min: Math.min(s, ans) - 1, max: Math.max(s, ans) + 1, ticks: 1, labels: 'ends', jumps: Array.from({ length: d }, (_, i) => (back ? { from: s - i, to: s - i - 1 } : { from: s + i, to: s + i + 1 })) },
    };
    if (chance(rng, 0.4)) return numq({ ...q, answer: ans });
    return mcn(rng, { ...q, correct: ans, wrong: [back ? ans + 1 : ans - 1, back ? s + d : s - d, ans + 10, back ? ans - 1 : ans + 1], min: 0, max: 110 });
  }],
  // Skip count equal groups
  [6, 7, (t, rng) => {
    const each = pick(rng, [2, 5, 10]);
    const g = each === 2 ? randInt(rng, 3, 10) : each === 5 ? randInt(rng, t === 6 ? 3 : 5, t === 6 ? 6 : 10) : randInt(rng, 3, t === 6 ? 7 : 10);
    const th = pick(rng, THINGS);
    const k = kid(rng);
    const box = pick(rng, ['bags', 'boxes', 'baskets', 'jars', 'cups']);
    const seq = Array.from({ length: g }, (_, i) => (i + 1) * each);
    return mcn(rng, {
      prompt: `${k.name} has ${g} ${box}. Each has ${each} ${th.many}. Count by ${each}s. How many?`,
      visual: { type: 'groups', groups: g, each, icon: th.icon }, correct: g * each, wrong: [g + each, (g - 1) * each, (g + 1) * each, g * each + 1], min: 1, max: 110,
      hint: `How many ${th.many} in ${g} ${box}? Point to each group and count by ${numWords(each)}s: ${steps(0, g * each, each)} Keep going until every group is counted.`,
      explain: `Count by ${each}s: ${seq.join(', ')}. There are ${g * each}.`,
    });
  }],
  // Challenge: which number do you say when you skip count? (stays inside Grade 1: 2s to 20, 5s and 10s to 100)
  [7, 7, (t, rng) => {
    if (chance(rng, 0.5)) {
      const step = pick(rng, [2, 5, 10]);
      const limit = step === 2 ? 20 : 100;
      const ans = step * randInt(rng, 2, limit / step);
      const near = [ans + 1, ans - 1, ans + 3, ans - 3, ans + (step === 10 ? 5 : 1)].filter((x) => x % step !== 0 && x > 0 && x <= limit + 3);
      const wrong = [...new Set(shuffle(rng, near))].slice(0, 3).map(String);
      return mcq(rng, {
        prompt: `Owl counts by ${step}s from 0. Which number will Owl say?`, correct: String(ans), wrong,
        hint: step === 2 ? 'Counting by 2s from 0: 2, 4, 6, 8… Every number you say ends in 0, 2, 4, 6 or 8.' : step === 5 ? 'Counting by 5s from 0: 5, 10, 15, 20… Every number you say ends in 5 or 0.' : 'Counting by 10s from 0: 10, 20, 30… Every number you say ends in 0.',
        explain: `Counting by ${step}s: ${ans / step > 5 ? '… ' : ''}${Array.from({ length: Math.min(ans / step, 5) }, (_, i) => ans - step * (Math.min(ans / step, 5) - 1 - i)).join(', ')}. So Owl says ${ans}.`,
      });
    }
    const s = 2 * randInt(rng, 0, 5) + 1;
    const seq = [s, s + 2, s + 4, s + 6];
    return mcn(rng, {
      prompt: 'Count by 2s. What comes next?', visual: { type: 'pattern', items: [...seq, '?'] },
      correct: s + 8, wrong: [s + 7, s + 9, s + 10, s + 6], min: 0, max: 30,
      hint: `Counting by twos skips one number each time. Say ${s + 6}, skip the next number, and say the one after it.`, explain: `Adding 2 each time: ${seq.join(', ')}, ${s + 8}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// g1-ops-addsub
// ---------------------------------------------------------------------------
function addExplain(a, b) {
  const s = a + b;
  if (a >= 10 || b >= 10) return `${a} + ${b} = ${s}.`;
  if (s > 10 && Math.max(a, b) >= 6) {
    const big = Math.max(a, b), small = Math.min(a, b), need = 10 - big;
    return `Make 10: ${big} + ${need} = 10. Then ${small - need} more is ${s}. So ${a} + ${b} = ${s}.`;
  }
  return `Start at ${Math.max(a, b)} and count on ${Math.min(a, b)}: ${s}. So ${a} + ${b} = ${s}.`;
}

function addHint(a, b) {
  const big = Math.max(a, b), small = Math.min(a, b);
  if (a + b > 10 && big >= 6 && big < 10) return `${a} + ${b}: make ten first. ${big} needs ${10 - big} more to make ten. Take that from ${small}, then add what is left.`;
  const st = steps(big, a + b);
  return `${a} + ${b}: start at the bigger number, ${big}. Count on ${small} more${st ? ': ' + st : '.'}`;
}

function g1Story(rng, t) {
  const [k, m] = twoKids(rng);
  const th = pick(rng, THINGS);
  const type = t <= 4 ? pick(rng, ['join', 'sep', 'ppw', 'cmp']) : pick(rng, ['joinC', 'sepC', 'start', 'ppwP', 'cmpB']);
  const a = randInt(rng, 3, 12);
  const b = randInt(rng, 2, Math.min(9, 20 - a));
  const c = a + b;
  switch (type) {
    case 'join': return {
      prompt: `${k.name} has ${nOf(a, th)}. ${k.P} gets ${b} more. How many now?`, ans: c, wrong: [c - 1, c + 1, a - b > 0 ? a - b : a],
      visual: c <= 20 ? { type: 'tenframe', count: a, count2: b } : undefined,
      hint: `${k.name} gets more, so put them together. Start at ${a} and count on ${b}: ${steps(a, c)}`, explain: `${a} + ${b} = ${c}. ${k.name} has ${c} now.`,
    };
    case 'sep': return {
      prompt: `${k.name} has ${nOf(c, th)}. ${k.P} gives ${b} away. How many are left?`, ans: a, wrong: [a + 1, a - 1, c + b],
      visual: { type: 'objects', items: [{ icon: th.icon, count: c }], layout: 'row' },
      hint: `${k.name} gives some away, so take away. Start at ${c} and count back ${b}: ${steps(c, a)}`, explain: `${c} − ${b} = ${a}. ${a} ${a === 1 ? 'is' : 'are'} left.`,
      explainVisual: { type: 'numberline', min: Math.max(0, a - 1), max: c + 1, ticks: 1, labels: 'ends', jumps: [{ from: c, to: a, label: `−${b}` }] },
    };
    case 'ppw': {
      const cth = pick(rng, COLOURABLE);
      return {
        prompt: `${k.name} has ${a} red and ${b} blue ${cth.many}. How many ${cth.many} in all?`, ans: c, wrong: [c - 1, c + 1, a - b > 0 ? a - b : a + 2],
        visual: { type: 'numberbond', whole: '?', parts: [a, b] }, hint: `Red and blue are the two parts. Put them together to find the whole: start at ${Math.max(a, b)} and count on ${Math.min(a, b)}.`,
        explain: `Red and blue are the parts. ${a} + ${b} = ${c} in all.`,
      };
    }
    case 'cmp': return {
      prompt: `${k.name} has ${nOf(c, th)}. ${m.name} has ${a}. How many more does ${k.name} have?`, ans: b, wrong: [b + 1, b - 1, c + a > 30 ? c : c + a, a],
      visual: { type: 'compare', left: { icon: th.icon, count: c }, right: { icon: th.icon, count: a } },
      hint: `"How many more" means find the difference. Match ${k.name}'s ${c} with ${m.name}'s ${a}. Count the extras, or count up from ${a} to ${c}.`, explain: `${c} − ${a} = ${b}. ${k.name} has ${b} more.`,
    };
    case 'joinC': return {
      prompt: `${k.name} has ${nOf(a, th)}. ${k.P} gets some more. Now ${k.p} has ${c}. How many did ${k.p} get?`, ans: b, wrong: [c, b + 1, b - 1, c + a > 30 ? a : c + a],
      visual: { type: 'barmodel', whole: c, parts: [a, '?'] }, hint: `${a} and how many more make ${c}? Count up from ${a} to ${c}, keeping track on your fingers.`,
      explain: `${a} + ${b} = ${c}, so ${k.name} got ${b}.`,
    };
    case 'sepC': return {
      prompt: `${k.name} has ${nOf(c, th)}. ${k.P} gives some away. Now ${k.p} has ${a}. How many did ${k.p} give away?`, ans: b, wrong: [a, b + 1, b - 1, c],
      visual: { type: 'barmodel', whole: c, parts: [a, '?'] }, hint: `${k.name} went from ${c} down to ${a}. How many is that? Count up from ${a} to ${c} on your fingers.`,
      explain: `${c} − ${b} = ${a}, so ${k.name} gave away ${b}.`,
    };
    case 'start': return {
      prompt: `${k.name} had some ${th.many}. ${k.P} got ${b} more. Now ${k.p} has ${c}. How many at first?`, ans: a, wrong: [c + b, a + 1, a - 1, c],
      visual: { type: 'barmodel', whole: c, parts: ['?', b] }, hint: `Work backwards. ${k.name} got ${b} more to reach ${c}, so take ${b} away from ${c}. Count back ${b} from ${c}.`,
      explain: `${c} − ${b} = ${a}. ${k.name} had ${a} at first.`,
    };
    case 'ppwP': {
      const cth = pick(rng, COLOURABLE);
      return {
        prompt: `There are ${c} ${cth.many}. ${a} are red. The rest are blue. How many are blue?`, ans: b, wrong: [c, b + 1, b - 1, c + a > 30 ? a : c + a],
        visual: { type: 'numberbond', whole: c, parts: [a, '?'] }, hint: `The whole is ${c} and one part is ${a}. What goes with ${a} to make ${c}? Count up from ${a} to ${c}.`,
        explain: `${a} + ${b} = ${c}. So ${b} are blue.`,
      };
    }
    default: return {
      prompt: `${m.name} has ${nOf(a, th)}. ${k.name} has ${b} more than ${m.name}. How many does ${k.name} have?`, ans: c, wrong: [a - b > 0 ? a - b : a + 1, c + 1, c - 1, b],
      visual: { type: 'barmodel', parts: [a, b], labels: [m.name, 'more'] }, hint: `${k.name} has the same as ${m.name}, plus ${b} more. Start at ${a} and count on ${b}.`,
      explain: `${a} + ${b} = ${c}. ${k.name} has ${c}.`,
    };
  }
}

const g1AddSub = F([
  // Ten frame addition
  [1, 2, (t, rng) => {
    const s = t === 1 ? randInt(rng, 2, 7) : randInt(rng, 5, 10);
    const a = randInt(rng, 1, s - 1), b = s - a;
    return mcn(rng, {
      prompt: `${a} + ${b} = ?`, visual: { type: 'tenframe', count: a, count2: b, frames: 1 },
      correct: s, wrong: [s - 1, s + 1, a, s + 2], min: 0, max: 20,
      hint: `${a} + ${b} means put ${a} and ${b} together. Start at ${Math.max(a, b)} and count on ${Math.min(a, b)} more counters.`, explain: addExplain(a, b),
    });
  }],
  // Take away with pictures
  [1, 2, (t, rng) => {
    const a = t === 1 ? randInt(rng, 3, 7) : randInt(rng, 6, 10);
    const b = randInt(rng, 1, a - 1);
    const th = pick(rng, THINGS);
    const k = kid(rng);
    const verb = pick(rng, ['eats', 'gives away', 'drops', 'shares', 'uses']);
    return mcn(rng, {
      prompt: pick(rng, [`${a} ${th.many}. ${k.name} ${verb} ${b}. How many are left?`, `${a} take away ${b} is how many?`]),
      visual: { type: 'objects', items: [{ icon: th.icon, count: a }], layout: 'row' },
      correct: a - b, wrong: [a + b, a - b + 1, a - b - 1, b], min: 0, max: 20,
      hint: `Take away ${b} from ${a}. Cover ${b} with your finger and count the ones left, or start at ${a} and count back ${b}.`, explain: `${a} − ${b} = ${a - b}. ${a - b} ${a - b === 1 ? 'is' : 'are'} left.`,
      explainVisual: { type: 'numberline', min: 0, max: 10, ticks: 1, labels: 'all', jumps: [{ from: a, to: a - b, label: `−${b}` }] },
    });
  }],
  // Number bond missing part
  [2, 4, (t, rng) => {
    const whole = t === 2 ? randInt(rng, 4, 10) : randInt(rng, 8, 20);
    const a = randInt(rng, 1, whole - 1), b = whole - a;
    const hideWhole = t === 4 && chance(rng, 0.3);
    const hideLeft = chance(rng, 0.5);
    const visual = { type: 'numberbond', whole: hideWhole ? '?' : whole, parts: hideWhole ? [a, b] : hideLeft ? ['?', b] : [a, '?'] };
    const ans = hideWhole ? whole : hideLeft ? a : b;
    return mcn(rng, {
      prompt: hideWhole ? 'What is the whole?' : 'What is the missing part?', visual,
      correct: ans, wrong: hideWhole ? [whole - 1, whole + 1, Math.abs(a - b)] : [whole, whole + (hideLeft ? b : a), ans + 1, ans - 1], min: 0, max: 40,
      hint: hideWhole ? `The whole is both parts together. Start at ${Math.max(a, b)} and count on ${Math.min(a, b)}.` : `The whole is ${whole}. One part is ${hideLeft ? b : a}. Count up from ${hideLeft ? b : a} to ${whole} on your fingers.`,
      explain: `${a} and ${b} make ${whole}.`,
    });
  }],
  // Which number sentence matches?
  [2, 3, (t, rng) => {
    const s = t === 2 ? randInt(rng, 5, 10) : randInt(rng, 11, 18);
    const a = randInt(rng, Math.max(2, s - 9), Math.min(9, s - 2)), b = s - a;
    const sub = chance(rng, 0.35);
    if (sub) {
      const th = pick(rng, THINGS);
      return mcq(rng, {
        prompt: `There were ${s} ${th.many}. ${b} went away. Which number sentence matches?`,
        visual: s <= 20 ? { type: 'objects', items: [{ icon: th.icon, count: s }], layout: 'row' } : undefined,
        correct: `${s} − ${b} = ${a}`, wrong: [`${s} + ${b} = ${s + b}`, `${s} − ${b} = ${a + 1}`, `${a} − ${b} = ${a - b}`, `${b} + ${a} = ${s + 1}`],
        hint: `"Went away" means take away, so look for a − sentence. It should start with ${s}, the number at first. Then check its answer by counting back ${b}.`, explain: `Start with ${s}, take away ${b}: ${s} − ${b} = ${a}.`,
      });
    }
    return mcq(rng, {
      prompt: 'Which number sentence matches the ten frames?', visual: { type: 'tenframe', count: a, count2: b },
      correct: `${a} + ${b} = ${s}`, wrong: [`${a} + ${b} = ${s + 1}`, `${a} − ${b} = ${a - b}`, `${a} + ${a} = ${2 * a}`, `${a + 1} + ${b} = ${s}`].filter((x) => x !== `${a} + ${b} = ${s}`),
      hint: 'Count the counters of each colour. The sentence should add those two numbers. Then check its total by counting all the counters.', explain: `${a} of one colour and ${b} of the other: ${a} + ${b} = ${s}.`,
    });
  }],
  // Symbolic to 20
  [3, 4, (t, rng) => {
    const s = randInt(rng, t === 3 ? 6 : 10, 20);
    const a = randInt(rng, Math.max(1, s - 10), Math.min(10, s - 1)), b = s - a;
    if (chance(rng, 0.5)) {
      return numq({ prompt: `${a} + ${b} = ?`, answer: s, hint: addHint(a, b), explain: addExplain(a, b), explainVisual: { type: 'tenframe', count: a, count2: b } });
    }
    return numq({
      prompt: `${s} − ${b} = ?`, answer: a, hint: `${s} − ${b}: think "${b} plus what makes ${s}?" Count up from ${b} to ${s} on your fingers.`,
      hintVisual: { type: 'numberline', min: 0, max: 20, ticks: 1, labels: [0, 10, 20] },
      explain: `${b} + ${a} = ${s}, so ${s} − ${b} = ${a}.`,
      explainVisual: { type: 'numberline', min: 0, max: 20, ticks: 1, labels: [0, 5, 10, 15, 20], jumps: [{ from: s, to: a, label: `−${b}` }] },
    });
  }],
  // Turn-around facts
  [3, 4, (t, rng) => {
    const a = randInt(rng, 1, 9);
    let b = randInt(rng, Math.max(2, 5 - a), Math.min(10, 20 - a));
    if (b === a) b = a + 1;
    if (t === 4 && chance(rng, 0.3)) {
      // Does order matter when you subtract? (5 − 3 = 2, but 3 − 5 does not work with things you have)
      const x = Math.max(a, b), y = Math.min(a, b);
      return mcq(rng, {
        prompt: `Is ${x} − ${y} the same as ${y} − ${x}?`, correct: 'No, order matters when you take away', wrong: ['Yes, order does not matter', 'Yes, both are 0'], count: 3,
        visual: { type: 'objects', items: [{ icon: '🍎', count: y }], layout: 'row' },
        hint: `For adding, the order does not matter. For taking away, try it: you have ${y} apples. Can you take ${x} away?`,
        explain: `${x} − ${y} = ${x - y}. But you cannot take ${x} away from just ${y}. Order matters when you take away.`,
      });
    }
    if (t === 3 || chance(rng, 0.5)) {
      return mcn(rng, {
        prompt: `${a} + ${b} = ${a + b}. So ${b} + ${a} = ?`, correct: a + b, wrong: [a + b + 1, a + b - 1, Math.abs(b - a), b], min: 0, max: 30,
        hint: `Both sentences add the same two numbers, just in a different order. Does the order change the total? You already know ${a} + ${b}.`, explain: `Switching the order does not change the total. ${b} + ${a} = ${a + b}.`,
        explainVisual: { type: 'tenframe', count: b, count2: a },
      });
    }
    return mcq(rng, {
      prompt: `Which is the same as ${a} + ${b}?`, correct: `${b} + ${a}`,
      wrong: [`${b} − ${a}`, `${a} + ${a}`, `${b} + ${b}`, `${a} − ${b}`].filter((x) => x !== `${b} + ${a}`),
      hint: `Test each choice. Does it add the same two numbers, ${a} and ${b}? Watch the sign: − means take away, not add.`, explain: `${a} + ${b} and ${b} + ${a} both make ${a + b}.`,
    });
  }],
  // Addition and subtraction undo each other
  [4, 5, (t, rng) => {
    const a = randInt(rng, 3, 10), b = randInt(rng, 2, Math.min(10, 20 - a)), s = a + b;
    if (chance(rng, 0.5)) {
      return mcn(rng, {
        prompt: `${a} + ${b} = ${s}. What is ${s} − ${b}?`, correct: a, wrong: [b, s, a + 1, s + b], min: 0, max: 40,
        hint: `Taking away undoes adding. ${a} + ${b} makes ${s}. If you take the ${b} back away, what is left?`, explain: `If ${a} + ${b} = ${s}, then ${s} − ${b} takes the ${b} back away. ${s} − ${b} = ${a}.`,
        explainVisual: { type: 'numberbond', whole: s, parts: [a, b] },
      });
    }
    return mcq(rng, {
      prompt: `Which subtraction goes with ${a} + ${b} = ${s}?`, correct: `${s} − ${b} = ${a}`,
      wrong: [`${s} − ${b} = ${a + 1}`, `${a} − ${b} = ${a - b}`, `${s} + ${b} = ${s + b}`, `${b} − ${a} = ${b - a}`].filter((x) => !x.includes('= -')),
      hint: `In ${a} + ${b} = ${s}, the whole is ${s}. A matching subtraction starts with ${s}, takes away one part, and leaves the other part. Test each choice.`, explain: `The whole is ${s}. Take away the part ${b}, and the other part ${a} is left.`,
      explainVisual: { type: 'numberbond', whole: s, parts: [a, b] },
    });
  }],
  // Story problems
  [4, 5, (t, rng) => {
    const s = g1Story(rng, t);
    const q = { prompt: s.prompt, visual: t === 4 || chance(rng, 0.5) ? s.visual : undefined, hint: s.hint, explain: s.explain, explainVisual: s.explainVisual || s.visual };
    if (chance(rng, 0.25)) return numq({ ...q, answer: s.ans });
    return mcn(rng, { ...q, correct: s.ans, wrong: s.wrong, min: 0, max: 40 });
  }],
  // Fact family
  [5, 6, (t, rng) => {
    const a = randInt(rng, 2, 9), b = randInt(rng, 2, Math.min(10, 20 - a)), s = a + b;
    if (a === b) return numq({ prompt: `${s} − ${a} = ?`, answer: b, hint: `${s} − ${a}: think "${a} plus what makes ${s}?" It is a double.`, explain: `${a} + ${a} = ${s}, so ${s} − ${a} = ${a}.` });
    const big = Math.max(a, b), small = Math.min(a, b);
    return mcq(rng, {
      prompt: `Which is NOT in the fact family of ${a}, ${b} and ${s}?`,
      correct: `${big} − ${small} = ${big - small}`, wrong: [`${a} + ${b} = ${s}`, `${b} + ${a} = ${s}`, `${s} − ${a} = ${b}`, `${s} − ${b} = ${a}`],
      hint: `Every fact in this family uses the same three numbers: ${a}, ${b} and ${s}. Check each choice: does it use all three?`,
      explain: `${big} − ${small} = ${big - small} does not use ${s}, so it is not in the family.`,
      explainVisual: { type: 'numberbond', whole: s, parts: [a, b] },
    });
  }],
  // Two steps
  [6, 7, (t, rng) => {
    const k = kid(rng);
    const th = pick(rng, THINGS);
    const v = randInt(rng, 0, t === 7 ? 3 : 2);
    if (v === 0) {
      const cth = pick(rng, COLOURABLE);
      const a = randInt(rng, 3, 9), b = randInt(rng, 2, Math.min(9, 20 - a)), c = randInt(rng, 1, a + b - 1);
      return mcn(rng, {
        prompt: `${k.name} has ${a} red and ${b} blue ${cth.many}. ${k.P} gives ${c} away. How many are left?`,
        correct: a + b - c, wrong: [a + b, a + b + c, a - c + 1, a + b - c + 1], min: 0, max: 40,
        hint: `Two steps. First find how many ${cth.many} in all: ${a} + ${b}. Then take away the ${c} given away.`, explain: `${a} + ${b} = ${a + b}. Then ${a + b} − ${c} = ${a + b - c}.`,
        explainVisual: { type: 'barmodel', whole: a + b, parts: [a + b - c, c] },
      });
    }
    if (v === 1) {
      const a = randInt(rng, 2, 8), b = randInt(rng, 2, 8), c = randInt(rng, 1, Math.min(9, 20 - a - b));
      const tens = [[a, b], [b, c], [a, c]].find(([x, y]) => x + y === 10);
      return mcn(rng, {
        prompt: chance(rng, 0.5) ? `${a} + ${b} + ${c} = ?` : `${k.name} finds ${a}, then ${b}, then ${c} ${th.many}. How many in all?`,
        correct: a + b + c, wrong: [a + b, a + b + c + 1, a + b + c - 1, b + c], min: 0, max: 40,
        hint: 'Add two numbers first. Look for two that make ten! Then add the last number.',
        explain: tens ? `${tens[0]} + ${tens[1]} = 10. Then add the other number: ${a + b + c}.` : `${a} + ${b} = ${a + b}. Then ${a + b} + ${c} = ${a + b + c}.`,
      });
    }
    if (v === 2) {
      const a = randInt(rng, 5, 12), b = randInt(rng, 2, Math.min(8, 20 - a)), c = randInt(rng, 2, a + b - 1);
      return mcn(rng, {
        prompt: `${k.name} had ${nOf(a, th)}. ${k.P} got ${b} more, then gave ${c} away. How many now?`,
        correct: a + b - c, wrong: [a + b, a - c > 0 ? a - c : a + c, a + b + c, a + b - c - 1], min: 0, max: 40,
        hint: `Two steps. First add: ${a} + ${b}. Then take away the ${c} ${k.p} gave away.`, explain: `${a} + ${b} = ${a + b}. Then ${a + b} − ${c} = ${a + b - c}.`,
      });
    }
    // Compare story with the smaller amount unknown ("fewer than"), sums to 20
    const m = twoKids(rng).find((x) => x.name !== k.name);
    const big = randInt(rng, 11, 20), fewer = randInt(rng, 2, Math.min(9, big - 2)), small = big - fewer;
    return mcn(rng, {
      prompt: `${k.name} has ${nOf(big, th)}. ${m.name} has ${fewer} fewer than ${k.name}. How many does ${m.name} have?`,
      correct: small, wrong: [big + fewer, big, fewer, small + 1, small - 1], min: 0, max: 40,
      hint: `${m.name} has fewer, so ${m.name} has less than ${big}. Start at ${big} and count back ${fewer}.`,
      explain: `${big} − ${fewer} = ${small}. ${m.name} has ${small}.`,
      explainVisual: { type: 'barmodel', whole: big, parts: [small, fewer], labels: [m.name, 'fewer'] },
    });
  }],
]);

// ---------------------------------------------------------------------------
// g1-ops-facts
// ---------------------------------------------------------------------------
const g1Facts = F([
  // Within 5 with pictures
  [1, 1, (t, rng) => {
    const s = randInt(rng, 2, 5), a = randInt(rng, 1, s - 1), b = s - a;
    const vis = pick(rng, [{ type: 'fingers', count: s }, { type: 'fiveframe', count: s }, { type: 'dots', count: s, arrangement: 'dice' }]);
    const sub = chance(rng, 0.35);
    return mcn(rng, {
      prompt: sub ? `${s} − ${b} = ?` : `${a} + ${b} = ?`, visual: sub ? vis : { type: 'tenframe', count: a, count2: b, frames: 1 },
      correct: sub ? a : s, wrong: sub ? [s, a + 1, b] : [s + 1, s - 1, a], min: 0, max: 10,
      hint: sub ? `${s} take away ${b}. Hold up ${s} fingers, put ${b} down, and count what is left.` : `${a} + ${b} means ${a} and ${b} more. Start at ${a} and count on ${b}.`,
      explain: sub ? `${s} − ${b} = ${a}.` : `${a} + ${b} = ${s}.`,
    });
  }],
  // Adding or subtracting 0
  [1, 3, (t, rng) => {
    const n = randInt(rng, 1, t === 1 ? 9 : 20);
    const v = randInt(rng, 0, 3);
    const prompt = [`${n} + 0 = ?`, `0 + ${n} = ?`, `${n} − 0 = ?`, `${n} − ${n} = ?`][v];
    const ans = v === 3 ? 0 : n;
    const q = {
      prompt, visual: t === 1 && n <= 10 ? { type: 'tenframe', count: n } : undefined,
      hint: v === 3 ? `${n} − ${n} means take away all ${n}. If you take them all, how many are left?` : `Zero means none. Adding or taking away nothing: does ${n} change?`,
      explain: v === 3 ? `Taking away all ${n} leaves 0.` : `Zero means none. ${prompt.replace('?', String(ans))}.`,
    };
    if (t >= 2 && chance(rng, 0.5)) return numq({ ...q, answer: ans });
    return mcn(rng, { ...q, correct: ans, wrong: v === 3 ? [n, 1, 2 * n] : [n + 1, n - 1, 0], min: 0, max: 40 });
  }],
  // Make ten
  [1, 4, (t, rng) => {
    const n = randInt(rng, 1, 9);
    if (t === 4 && chance(rng, 0.5)) {
      const a = randInt(rng, 1, 9);
      return mcq(rng, {
        prompt: 'Which pair makes 10?', correct: `${a} + ${10 - a}`,
        wrong: [`${a} + ${11 - a}`, `${a} + ${9 - a}`, `${a + 1} + ${10 - a}`, `${a - 1} + ${10 - a}`].filter((x) => !/\b0 \+|\+ 0\b|-/.test(x)),
        hint: 'A pair makes ten if it fills a ten frame exactly. For each choice, start at the first number and count on the second. Which one lands right on ten?', hintVisual: { type: 'tenframe', count: 0, frames: 1 }, explain: `${a} + ${10 - a} = 10.`, explainVisual: { type: 'tenframe', count: a, count2: 10 - a, frames: 1 },
      });
    }
    const q = {
      prompt: t === 1 ? pick(rng, ['How many more to make 10?', 'How many empty boxes?', 'How many more to fill the frame?']) : `${n} + □ = 10`,
      visual: t <= 2 ? { type: 'tenframe', count: n, frames: 1 } : undefined,
      hint: `A full ten frame has 10 boxes and ${n} are filled. How many more to fill it? Count the empty boxes, or count up from ${n} to 10.`, hintVisual: t >= 3 ? { type: 'tenframe', count: n, frames: 1 } : undefined, explain: `${n} + ${10 - n} = 10.`,
      explainVisual: { type: 'tenframe', count: n, count2: 10 - n, frames: 1 },
    };
    if (t >= 3 && chance(rng, 0.5)) return numq({ ...q, answer: 10 - n });
    return mcn(rng, { ...q, correct: 10 - n, wrong: [n, 11 - n, 9 - n, 10], min: 0, max: 10 });
  }],
  // Facts within 10
  [2, 3, (t, rng) => {
    const s = randInt(rng, 3, 10), a = randInt(rng, 1, s - 1), b = s - a;
    const sub = chance(rng, 0.45);
    const visual = t === 2 && chance(rng, 0.5) ? (sub ? { type: 'dots', count: s, arrangement: s <= 6 ? 'dice' : 'line' } : { type: 'tenframe', count: a, count2: b, frames: 1 }) : undefined;
    const q = {
      prompt: sub ? `${s} − ${b} = ?` : `${a} + ${b} = ?`, visual,
      hint: sub ? `${s} − ${b}: think "${b} plus what makes ${s}?" Count up from ${b} to ${s}.` : addHint(a, b),
      explain: sub ? `${b} + ${a} = ${s}, so ${s} − ${b} = ${a}.` : `${a} + ${b} = ${s}.`,
    };
    if (chance(rng, 0.6)) return numq({ ...q, answer: sub ? a : s });
    return mcn(rng, { ...q, correct: sub ? a : s, wrong: sub ? [s + b, a + 1, a - 1] : [s + 1, s - 1, Math.abs(a - b)], min: 0, max: 20 });
  }],
  // Doubles
  [3, 5, (t, rng) => {
    const n = randInt(rng, t === 3 ? 1 : 3, t === 3 ? 6 : 10);
    const half = t === 5 && chance(rng, 0.4);
    const q = {
      prompt: half ? `${2 * n} − ${n} = ?` : `${n} + ${n} = ?`,
      visual: t === 3 ? { type: 'tenframe', count: n, count2: n } : undefined,
      hint: half ? `Use a double: ${n} + ${n} = ${2 * n}. If you take one ${n} away, what is left?` : `${n} + ${n} is a double: two groups of ${n}. Picture both rows of a ten frame, or start at ${n} and count on ${n}.`,
      hintVisual: half ? undefined : { type: 'tenframe', count: n, count2: n },
      explain: half ? `${n} + ${n} = ${2 * n}, so ${2 * n} − ${n} = ${n}.` : `Double ${n} is ${2 * n}. ${n} + ${n} = ${2 * n}.`,
    };
    if (chance(rng, 0.6)) return numq({ ...q, answer: half ? n : 2 * n });
    return mcn(rng, { ...q, correct: half ? n : 2 * n, wrong: half ? [2 * n, n + 1, n - 1] : [2 * n + 1, 2 * n - 1, n + 1], min: 0, max: 30 });
  }],
  // Near doubles
  [4, 5, (t, rng) => {
    const n = randInt(rng, 2, 9);
    if (chance(rng, 0.4)) {
      return mcq(rng, {
        prompt: `Which double helps with ${n} + ${n + 1}?`, correct: `${n} + ${n}`,
        wrong: [`${n + 1} + ${n + 2}`, `${n - 1} + ${n}`, `${n} + 10`, `${n + 2} + ${n + 2}`],
        hint: `A double adds a number to itself, like ${n >= 5 ? 2 : 9} + ${n >= 5 ? 2 : 9}. Which double is only 1 away from ${n} + ${n + 1}? Test each choice.`,
        explain: `${n} + ${n} = ${2 * n}. ${n} + ${n + 1} is just 1 more: ${2 * n + 1}.`,
      });
    }
    // Doubles plus 1, and (from tier 5) doubles plus 2
    const g = t >= 5 && n <= 8 && chance(rng, 0.4) ? 2 : 1;
    const [a, b] = shuffle(rng, [n, n + g]);
    const s2 = 2 * n + g;
    const q = { prompt: `${a} + ${b} = ?`, hint: `${a} + ${b} is almost a double. Think ${n} + ${n} first, then add ${g} more.`, explain: `${n} + ${n} = ${2 * n}, and ${g} more is ${s2}.`, explainVisual: { type: 'tenframe', count: a, count2: b } };
    if (chance(rng, 0.5)) return numq({ ...q, answer: s2 });
    return mcn(rng, { ...q, correct: s2, wrong: [2 * n, s2 + 1, s2 - 1, 2 * (n + g)], min: 0, max: 30 });
  }],
  // Plus or minus 10
  [4, 5, (t, rng) => {
    const n = randInt(rng, 1, 9);
    const v = randInt(rng, 0, 2);
    const prompt = [`10 + ${n} = ?`, `${n} + 10 = ?`, `${10 + n} − 10 = ?`][v];
    const ans = v === 2 ? n : 10 + n;
    return numq({
      prompt, answer: ans, hint: v === 2 ? `${10 + n} is one full ten and some ones. Take away the ten. How many ones are left?` : `This is one full ten and ${oW(n)}. How do you write one ten and ${oW(n)}?`,
      explain: v === 2 ? `${10 + n} is 10 and ${n}. Take away 10, and ${n} is left.` : `10 and ${oW(n)} make ${10 + n}.`,
      explainVisual: { type: 'tenframe', count: 10 + n },
    });
  }],
  // Bridging 10 (make ten)
  [5, 6, (t, rng) => {
    const a = randInt(rng, 6, 9), b = randInt(rng, 11 - a, 9), s = a + b, need = 10 - a;
    if (chance(rng, 0.35)) {
      return mcq(rng, {
        prompt: `To add ${a} + ${b}, make 10 first. Which is the same?`, correct: `10 + ${b - need}`,
        wrong: [`10 + ${b}`, `10 + ${b - need + 1}`, `${a} + 10`, `10 + ${need}`].filter((x) => x !== `10 + ${b - need}`),
        hint: `${a} needs ${need} more to make ten. Take ${need} from ${b}. What is left of ${b}? Find the choice that is 10 plus that.`,
        explain: `${a} + ${need} = 10. ${b} − ${need} = ${b - need} left over. So ${a} + ${b} = 10 + ${b - need} = ${s}.`,
        explainVisual: { type: 'tenframe', count: a, count2: b },
      });
    }
    const q = {
      prompt: `${a} + ${b} = ?`, visual: t === 5 && chance(rng, 0.5) ? { type: 'tenframe', count: a, count2: b } : undefined,
      hint: `Make ten first: ${a} + ${need} = 10. Then add the ${oW(b - need)} left over from ${b}.`,
      explain: `${a} + ${need} = 10. ${b - need} more makes ${s}. So ${a} + ${b} = ${s}.`, explainVisual: { type: 'tenframe', count: a, count2: b },
    };
    if (chance(rng, 0.6)) return numq({ ...q, answer: s });
    return mcn(rng, { ...q, correct: s, wrong: [s - 1, s + 1, s - 10, 10 + b], min: 0, max: 30 });
  }],
  // Derived subtraction to 20
  [5, 7, (t, rng) => {
    const s = randInt(rng, 11, t === 5 ? 15 : 18), b = randInt(rng, s - 9, 9), a = s - b;
    const viaTen = s - 10 < b;
    return numq({
      prompt: `${s} − ${b} = ?`, answer: a,
      hint: viaTen ? `${s} − ${b}: take away ${s - 10} first to get down to ten. Then take away the rest of the ${b}.` : `${s} − ${b}: think "${b} plus what makes ${s}?" Count up from ${b}.`,
      explain: viaTen ? `${s} − ${s - 10} = 10. Then 10 − ${b - (s - 10)} = ${a}. So ${s} − ${b} = ${a}.` : `${b} + ${a} = ${s}, so ${s} − ${b} = ${a}.`,
      explainVisual: { type: 'numberline', min: 0, max: 20, ticks: 1, labels: [0, 5, 10, 15, 20], jumps: [{ from: s, to: a, label: `−${b}` }] },
    });
  }],
  // Missing number facts
  [6, 7, (t, rng) => {
    const s = randInt(rng, 8, t === 6 ? 16 : 20), a = randInt(rng, Math.max(1, s - 10), Math.min(10, s - 1)), b = s - a;
    // Missing part only: a missing start in subtraction (□ − 6 = 8) is a Grade 2 indicator.
    const v = randInt(rng, 0, 2);
    const forms = [
      [`□ + ${b} = ${s}`, a, `${a} + ${b} = ${s}.`],
      [`${a} + □ = ${s}`, b, `${a} + ${b} = ${s}.`],
      [`${s} − □ = ${a}`, b, `${s} − ${b} = ${a}.`],
    ];
    const [prompt, ans, ex] = forms[v];
    return numq({
      prompt, answer: ans, hint: 'Is the box a part or the whole? To find the whole, add the two parts. To find a part, take the other part away from the whole.',
      explain: `The box is ${ans}: ${ex}`, explainVisual: { type: 'numberbond', whole: s, parts: [a, b] },
    });
  }],
  // Mixed derived facts
  [6, 7, (t, rng) => {
    const kind = pick(rng, ['double', 'near', 'ten', 'bridge']);
    let a, b;
    if (kind === 'double') { a = randInt(rng, 5, 10); b = a; }
    else if (kind === 'near') { a = randInt(rng, 5, 9); b = a + pick(rng, [1, -1]); }
    else if (kind === 'ten') { a = 10; b = randInt(rng, 1, 10); if (chance(rng, 0.5)) [a, b] = [b, a]; }
    else { a = randInt(rng, 6, 9); b = randInt(rng, 11 - a, 9); }
    const s = a + b;
    if (t === 7 && s > 10 && chance(rng, 0.4)) {
      return mcq(rng, {
        prompt: `Which is the same as ${a} + ${b}?`, correct: `10 + ${s - 10}`,
        wrong: [`10 + ${s - 9}`, `10 + ${s - 11}`, `${a} + ${b + 1}`, `${a - 1} + ${b - 1}`].filter((x) => !/-|\+ 0\b/.test(x) && x !== `10 + ${s - 10}`),
        hint: `First find the total of ${a} + ${b}. Then test each choice: which one has the same total?`, explain: `${a} + ${b} = ${s}, and 10 + ${s - 10} = ${s}.`,
      });
    }
    const sub = chance(rng, 0.4);
    return numq({
      prompt: sub ? `${s} − ${b} = ?` : `${a} + ${b} = ?`, answer: sub ? a : s,
      hint: sub ? `${s} − ${b}: think "${b} plus what makes ${s}?"` : kind === 'double' ? `${a} + ${b} is a double: two groups of ${a}.` : kind === 'near' ? `${a} + ${b} is almost a double. Use ${Math.min(a, b)} + ${Math.min(a, b)}, then add 1.` : kind === 'ten' ? `This is one ten and ${oW(Math.min(a, b))}.` : addHint(a, b),
      explain: (sub ? `${a} + ${b} = ${s}, so ${s} − ${b} = ${a}. ` : '') + (kind === 'double' ? `${a} + ${a} is a double: ${s}.`
        : kind === 'near' ? `${Math.min(a, b)} + ${Math.min(a, b)} = ${2 * Math.min(a, b)}, and 1 more is ${s}.`
          : kind === 'ten' ? `10 and ${oW(Math.min(a, b))} make ${s}.` : addExplain(a, b)),
    });
  }],
]);

// ---------------------------------------------------------------------------
// g1-pat-patterns
// ---------------------------------------------------------------------------
const PSHAPES = ['circle', 'square', 'triangle', 'star', 'heart'];
const PCOL = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];
const EMOJI_SETS = [['🐶', '🐱', '🐰', '🐸', '🦊'], ['🍎', '🍌', '🍇', '🍓', '🍊'], ['🌞', '🌙', '⭐', '☁️', '🌈'], ['🚗', '🚌', '🚲', '🚀', '🚂'], ['🦉', '🐉', '🦄', '🐢', '🐝'], ['⚽', '🏀', '🎾', '🏈', '⚾']];
const ACTIONS = [['👏', 'clap'], ['🦶', 'stomp'], ['🙌', 'hands up'], ['👋', 'wave'], ['🐸', 'jump']];

function patVals(rng, attr, k) {
  if (attr === 'colour') { const s = pick(rng, PSHAPES); return sample(rng, PCOL, k).map((c) => ({ shape: s, color: c })); }
  if (attr === 'shape') { const c = pick(rng, PCOL); return sample(rng, PSHAPES, k).map((s) => ({ shape: s, color: c })); }
  if (attr === 'size') { const s = pick(rng, PSHAPES), c = pick(rng, PCOL); return shuffle(rng, ['s', 'l']).slice(0, k).map((z) => ({ shape: s, color: c, size: z })); }
  if (attr === 'both') { const ss = sample(rng, PSHAPES, k), cc = sample(rng, PCOL, k); return ss.map((s, i) => ({ shape: s, color: cc[i] })); }
  return sample(rng, pick(rng, EMOJI_SETS), k);
}
const coreOf = (str, vals) => str.split('').map((ch) => vals[ch.charCodeAt(0) - 65]);
const seqOf = (core, len) => Array.from({ length: len }, (_, i) => core[i % core.length]);
const isEmoji = (tok) => typeof tok === 'string';
const tokKey = (tok) => JSON.stringify(tok);
const tokVisual = (tok) => (isEmoji(tok) ? { type: 'pattern', items: [tok] } : { type: 'shapes', items: [tok] });
function tokName(tok) {
  if (isEmoji(tok)) return tok;
  return `${tok.size === 's' ? 'small ' : tok.size === 'l' ? 'big ' : ''}${tok.color} ${tok.shape}`;
}
// A choice question where each choice is one token.
function tokenChoice(rng, o) {
  const pool = [];
  const seen = new Set([tokKey(o.answer)]);
  for (const d of o.others) { const k = tokKey(d); if (!seen.has(k)) { seen.add(k); pool.push(d); } }
  const wrong = pool.slice(0, 3);
  if (isEmoji(o.answer)) return mcq(rng, { ...o, correct: o.answer, wrong });
  return visq(rng, { ...o, items: [{ visual: tokVisual(o.answer), correct: true }, ...wrong.map((w) => ({ visual: tokVisual(w), correct: false }))] });
}
function extraTok(rng, vals) {
  const v = vals[0];
  if (isEmoji(v)) { const set = EMOJI_SETS.find((s) => s.includes(v)); return set.filter((e) => !vals.includes(e)); }
  const alts = [];
  for (const c of PCOL) alts.push({ ...v, color: c });
  for (const s of PSHAPES) alts.push({ ...v, shape: s });
  return shuffle(rng, alts).filter((a) => !vals.some((x) => tokKey(x) === tokKey(a)));
}
// Grade 1 repeating patterns: a core of 2 or 3 terms with 1 changing attribute.
// (Cores of 4 terms and patterns where 2 attributes change are Grade 2.)
function coresFor(t) {
  if (t === 1) return ['AB'];
  if (t === 2) return ['AB', 'AAB', 'ABB'];
  if (t <= 5) return ['AB', 'AAB', 'ABB', 'ABC'];
  return ['AAB', 'ABB', 'ABC'];
}
function attrFor(rng, t, coreStr) {
  const k = new Set(coreStr).size;
  const opts = ['colour', 'shape', 'emoji'];
  if (k === 2) opts.push('size');
  return pick(rng, opts);
}
const LETTERS = (str, len) => seqOf(str.split(''), len).join(' ');

const g1Patterns = F([
  // What comes next?
  [1, 6, (t, rng) => {
    const coreStr = pick(rng, coresFor(t));
    const attr = attrFor(rng, t, coreStr);
    const k = new Set(coreStr).size;
    const vals = patVals(rng, attr, k);
    const core = coreOf(coreStr, vals);
    const shown = coreStr.length * (coreStr.length <= 2 ? randInt(rng, 2, 3) : 2) + (t >= 3 ? randInt(rng, 0, coreStr.length - 1) : 0);
    const seq = seqOf(core, shown + 1);
    const ans = seq[shown];
    const others = [...vals.filter((v) => tokKey(v) !== tokKey(ans)), ...extraTok(rng, vals)];
    return tokenChoice(rng, {
      prompt: pick(rng, ['What comes next?', 'What comes next in the pattern?', 'Keep the pattern going. What is next?']),
      visual: { type: 'pattern', items: [...seq.slice(0, shown), '?'], highlightCore: t === 1 ? coreStr.length : undefined },
      answer: ans, others,
      hint: `What comes after the last one? Say the pattern out loud from the start: ${core.map(tokName).join(', ')}, then it starts again. Keep going to the ? spot.`,
      explain: `The part that repeats is ${core.map(tokName).join(', ')}. Next comes ${tokName(ans)}.`,
      explainVisual: { type: 'pattern', items: seq, highlightCore: coreStr.length },
    });
  }],
  // Missing term
  [3, 6, (t, rng) => {
    const coreStr = pick(rng, coresFor(t));
    const attr = attrFor(rng, t, coreStr);
    const vals = patVals(rng, attr, new Set(coreStr).size);
    const core = coreOf(coreStr, vals);
    const len = coreStr.length * (coreStr.length <= 2 ? 3 : 2) + 1;
    const seq = seqOf(core, len);
    const hole = randInt(rng, coreStr.length, len - 2);
    const ans = seq[hole];
    return tokenChoice(rng, {
      prompt: pick(rng, ['What is missing?', 'Which one goes in the ? spot?', 'Find the missing piece.']),
      visual: { type: 'pattern', items: seq.map((x, i) => (i === hole ? '?' : x)) },
      answer: ans, others: [...vals.filter((v) => tokKey(v) !== tokKey(ans)), ...extraTok(rng, vals)],
      hint: `The part that repeats is ${core.map(tokName).join(', ')}. Say the pattern from the start and stop at the ? spot. What belongs there?`,
      explain: `The pattern repeats ${core.map(tokName).join(', ')}. The missing one is ${tokName(ans)}.`,
      explainVisual: { type: 'pattern', items: seq, highlightCore: coreStr.length },
    });
  }],
  // What is the core?
  [2, 5, (t, rng) => {
    const coreStr = pick(rng, coresFor(Math.max(t, 2)));
    const attr = attrFor(rng, t, coreStr);
    const vals = patVals(rng, attr, new Set(coreStr).size);
    const core = coreOf(coreStr, vals);
    const seq = seqOf(core, coreStr.length * (coreStr.length === 2 ? 3 : 2));
    const cands = [core.slice(0, -1), [...core, core[0]], core.slice(1), coreOf(coreStr === 'AB' ? 'AAB' : 'AB', vals), coreOf(coreStr === 'ABC' ? 'AB' : 'ABC', [...vals, ...extraTok(rng, vals)])]
      .filter((c) => c.length >= 1 && tokKey(c) !== tokKey(core));
    const uniq = [];
    for (const c of cands) if (!uniq.some((u) => tokKey(u) === tokKey(c)) && c.length > 1) uniq.push(c);
    return visq(rng, {
      prompt: pick(rng, ['Which part repeats?', 'What is the core of this pattern?', 'Find the part that repeats over and over.']),
      visual: { type: 'pattern', items: seq },
      items: [{ visual: { type: 'pattern', items: core }, correct: true }, ...uniq.slice(0, 3).map((c) => ({ visual: { type: 'pattern', items: c }, correct: false }))],
      hint: 'The core is the part that repeats. Say the pattern out loud and listen for where it starts over from the beginning. Test each choice: if you repeat it over and over, does it make the whole pattern?',
      explain: `${cap(core.map(tokName).join(', '))} repeats again and again. That is the core.`,
      explainVisual: { type: 'pattern', items: seq, highlightCore: coreStr.length },
    });
  }],
  // Translate to letters
  [4, 7, (t, rng) => {
    const cores = ['AB', 'AAB', 'ABB', 'ABC'];
    const coreStr = pick(rng, cores);
    const len = 6;
    const attr = attrFor(rng, t, coreStr);
    const vals = patVals(rng, attr, new Set(coreStr).size);
    const seq = seqOf(coreOf(coreStr, vals), len);
    const others = cores.filter((c) => c !== coreStr && LETTERS(c, len) !== LETTERS(coreStr, len));
    return mcq(rng, {
      prompt: pick(rng, ['Which letters show this pattern?', 'Write the pattern with letters. Which is right?']),
      visual: { type: 'pattern', items: seq },
      correct: LETTERS(coreStr, len), wrong: others.map((c) => LETTERS(c, len)),
      hint: `Give the first item the letter A, and write A each time it comes back. The next new item gets B${new Set(coreStr).size > 2 ? ', and the third new item gets C' : ''}. Which choice matches your letters?`,
      explain: `The first one is A${new Set(coreStr).size > 1 ? ', the next new one is B' : ''}${new Set(coreStr).size > 2 ? ', and the next new one is C' : ''}. The pattern is ${LETTERS(coreStr, len)}.`,
    });
  }],
  // Same pattern in another form (actions, shapes)
  [4, 7, (t, rng) => {
    const cores = ['AB', 'AAB', 'ABB', 'ABC'];
    const coreStr = pick(rng, cores);
    const k = new Set(coreStr).size;
    const len = 6;
    const useActions = chance(rng, 0.5);
    let shown, what;
    if (useActions) {
      const acts = sample(rng, ACTIONS, k);
      shown = seqOf(coreOf(coreStr, acts.map((a) => a[0])), len);
      what = seqOf(coreOf(coreStr, acts.map((a) => a[1])), len).join(', ');
    } else {
      shown = seqOf(coreOf(coreStr, patVals(rng, 'emoji', k)), len);
      what = null;
    }
    const others = shuffle(rng, cores.filter((c) => LETTERS(c, len) !== LETTERS(coreStr, len))).slice(0, 3);
    const mk = (c) => ({ type: 'pattern', items: seqOf(coreOf(c, patVals(rng, pick(rng, ['colour', 'shape']), new Set(c).size)), len) });
    return visq(rng, {
      prompt: useActions ? 'Do the actions! Which shape pattern is the same kind?' : 'Which pattern is the same kind as this one?',
      speak: useActions ? `${what}. Which shape pattern is the same kind?` : undefined,
      visual: { type: 'pattern', items: shown },
      items: [{ visual: mk(coreStr), correct: true }, ...others.map((c) => ({ visual: mk(c), correct: false }))],
      hint: useActions ? `Say it: ${what}. Now write it in letters: A for the first action, B for the next new one. Which shape pattern has the same letters?` : 'Write each pattern in letters: A for the first thing, B for the next new thing, C for a third. Which choice has the same letters as the top pattern?',
      explain: `Both patterns go ${LETTERS(coreStr, len)}.`,
    });
  }],
  // Find the mistake
  [4, 7, (t, rng) => {
    const coreStr = pick(rng, t >= 6 ? ['AAB', 'ABB', 'ABC'] : ['AB', 'ABB', 'AAB', 'ABC']);
    const attr = attrFor(rng, Math.min(t, 6), coreStr);
    const vals = patVals(rng, attr, new Set(coreStr).size);
    const core = coreOf(coreStr, vals);
    const len = Math.max(6, coreStr.length * 2 + 2);
    const seq = seqOf(core, len);
    const pos = randInt(rng, coreStr.length + 1, len - 1);
    const wrongTok = pick(rng, vals.filter((v) => tokKey(v) !== tokKey(seq[pos])));
    const bad = seq.slice();
    bad[pos] = wrongTok;
    const spots = [pos - 1, pos + 1, pos - 2, pos + 2].filter((x) => x >= 0 && x < len && x !== pos).map((x) => String(x + 1));
    return mcq(rng, {
      prompt: 'One is a mistake. Count from the left. Which spot is wrong?',
      visual: { type: 'pattern', items: bad }, correct: String(pos + 1), wrong: spots,
      hint: `The core at the start is ${core.map(tokName).join(', ')}. Say the pattern item by item, counting spots from the left. Which spot does not match?`,
      explain: `The pattern repeats ${core.map(tokName).join(', ')}. Spot ${pos + 1} should be ${tokName(seq[pos])}, not ${tokName(wrongTok)}.`,
      explainVisual: { type: 'pattern', items: seq, highlightCore: coreStr.length },
    });
  }],
  // Cycles: days, seasons, times of day
  [3, 5, (t, rng) => {
    const cycles = [
      { name: 'days', items: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
      { name: 'seasons', items: ['spring', 'summer', 'fall', 'winter'], icons: ['🌷', '☀️', '🍂', '❄️'] },
      { name: 'parts of the day', items: ['morning', 'afternoon', 'evening', 'night'], icons: ['🌅', '☀️', '🌆', '🌙'] },
    ];
    const c = pick(rng, cycles);
    const L = c.items.length;
    const s = randInt(rng, 0, L - 1);
    const shown = [0, 1, 2].map((i) => c.items[(s + i) % L]);
    const ans = c.items[(s + 3) % L];
    return mcq(rng, {
      prompt: `${cap(shown.join(', '))}, … What comes next?`,
      visual: c.icons ? { type: 'pattern', items: [0, 1, 2].map((i) => c.icons[(s + i) % L]).concat('?') } : undefined,
      correct: ans, wrong: c.items.filter((x) => x !== ans && x !== shown[2]),
      hint: `The ${c.name} repeat in the same order every time. Say them in order, starting from ${shown[0]}. What comes after ${shown[2]}? After the last one, start again at the first.`,
      explain: `The ${c.name} go in order and repeat: after ${shown[2]} comes ${ans}.`,
    });
  }],
  // Nth term
  [6, 7, (t, rng) => {
    const coreStr = pick(rng, t === 6 ? ['AB', 'ABB', 'AAB', 'ABC'] : ['ABC', 'AAB', 'ABB']);
    const attr = attrFor(rng, t, coreStr);
    const vals = patVals(rng, attr, new Set(coreStr).size);
    const core = coreOf(coreStr, vals);
    const shown = coreStr.length * 2;
    const n = randInt(rng, shown + 2, t === 6 ? 10 : 12);
    const ans = core[(n - 1) % core.length];
    return tokenChoice(rng, {
      prompt: `The pattern keeps going. What will be number ${n}?`,
      visual: { type: 'pattern', items: seqOf(core, shown) },
      answer: ans, others: [...vals.filter((v) => tokKey(v) !== tokKey(ans)), ...extraTok(rng, vals)],
      hint: `The core has ${coreStr.length} items. Keep saying the pattern, touching one spot at a time, until you reach number ${n}.`,
      explain: `Keep going: number ${n} is ${tokName(ans)}.`, explainVisual: { type: 'pattern', items: seqOf(core, n), highlightCore: coreStr.length },
    });
  }],
]);

// ---------------------------------------------------------------------------
// g1-pat-equal
// ---------------------------------------------------------------------------
const g1Equal = F([
  // Equal or not equal sets
  [1, 2, (t, rng) => {
    const [A, B] = sample(rng, THINGS, 2);
    const a = randInt(rng, 2, t === 1 ? 6 : 10);
    const b = chance(rng, 0.5) ? a : Math.max(1, a + pick(rng, [-2, -1, 1, 2]));
    return mcq(rng, {
      prompt: pick(rng, ['Are the two rows equal?', `Is there the same number of ${A.many} and ${B.many}?`]),
      visual: { type: 'compare', left: { icon: A.icon, count: a }, right: { icon: B.icon, count: b } },
      correct: a === b ? 'Yes, equal' : 'No, not equal', wrong: [a === b ? 'No, not equal' : 'Yes, equal'], count: 2,
      hint: `Equal means the same number. Match each ${A.one} with one ${B.one}. If every one has a partner, they are equal. If some are left over, they are not equal.`,
      explain: a === b ? `Each ${A.one} has a partner. ${a} and ${b} are equal.` : `${a} and ${b} are not the same. ${Math.abs(a - b)} ${Math.abs(a - b) === 1 ? 'has' : 'have'} no partner.`,
    });
  }],
  // Balance: which number makes it level
  [1, 3, (t, rng) => {
    const s = randInt(rng, t === 1 ? 3 : 5, t === 1 ? 6 : t === 2 ? 10 : 15);
    const a = randInt(rng, 1, Math.min(10, s - 1)), b = s - a;
    const right = t === 3 && chance(rng, 0.6);
    let c = 0;
    if (right) c = randInt(rng, 1, s - 1);
    const ans = s - c;
    return mcn(rng, {
      prompt: 'What number makes the balance level?',
      visual: { type: 'balance', left: `${a} + ${b}`, right: right ? `${c} + ?` : '?', tilt: 'level' },
      correct: ans, wrong: [s, ans + 1, ans - 1, a, s + c], min: 0, max: 30,
      hint: `Level means both sides have the same amount. First find ${a} + ${b}.${right ? ` Then think: ${c} plus what makes that much?` : ' Put that much on the other side.'}`,
      explain: right ? `${a} + ${b} = ${s}. ${c} + ${ans} = ${s} too, so the balance is level.` : `${a} + ${b} = ${s}. Put ${s} on the other side to make it level.`,
    });
  }],
  // True or false
  [2, 5, (t, rng) => {
    const s = randInt(rng, t === 2 ? 4 : 8, t === 2 ? 10 : 20);
    const a = randInt(rng, Math.max(1, s - 10), Math.min(10, s - 1)), b = s - a;
    const truth = chance(rng, 0.5);
    const shown = truth ? s : s + pick(rng, [-1, 1, 2]);
    const flip = t >= 3 && chance(rng, 0.6);
    const eq = flip ? `${shown} = ${a} + ${b}` : `${a} + ${b} = ${shown}`;
    return mcq(rng, {
      prompt: `True or false? ${eq}`, correct: truth ? 'True' : 'False', wrong: [truth ? 'False' : 'True'], count: 2,
      hint: `The = sign means "is the same as". Work out ${a} + ${b}. If it is the same as ${shown}, it is true. If not, it is false.`,
      explain: truth ? `${a} + ${b} is ${s}, so both sides are ${s}. It is true.` : `${a} + ${b} is ${s}, not ${shown}. It is false.`,
      explainVisual: { type: 'balance', left: `${a} + ${b}`, right: String(shown), tilt: truth ? 'level' : shown > s ? 'right' : 'left' },
    });
  }],
  // Which is true?
  [3, 5, (t, rng) => {
    const s = randInt(rng, 5, t === 3 ? 12 : 20);
    const a = randInt(rng, Math.max(1, s - 10), Math.min(10, s - 1)), b = s - a;
    const left = chance(rng, 0.5);
    const f = (x, y, z) => (left ? `${z} = ${x} + ${y}` : `${x} + ${y} = ${z}`);
    const correct = f(a, b, s);
    const wrong = [f(a, b + 1, s), f(a + 1, b + 1, s), f(a, b, s + 1), f(a, Math.max(0, b - 1), s)].filter((x) => x !== correct);
    return mcq(rng, {
      prompt: 'Which one is true?', correct, wrong,
      hint: 'In each choice, work out the side with the + sign. Compare it with the number on the other side. The true one has both sides the same.',
      explain: `${a} + ${b} = ${s}, so "${correct}" is true.`,
      explainVisual: { type: 'balance', left: `${a} + ${b}`, right: String(s), tilt: 'level' },
    });
  }],
  // Make the sets equal
  [4, 4, (t, rng) => {
    const th = pick(rng, THINGS);
    const a = randInt(rng, 2, 9), b = a + randInt(rng, 1, 6);
    const [k, m] = twoKids(rng);
    return mcn(rng, {
      prompt: `${k.name} has ${a} ${th.many}. ${m.name} has ${b}. How many more does ${k.name} need to be equal?`,
      visual: { type: 'compare', left: { icon: th.icon, count: a }, right: { icon: th.icon, count: b } },
      correct: b - a, wrong: [b, a, b - a + 1, b - a - 1, a + b], min: 0, max: 30,
      hint: `${k.name} has ${a} and ${m.name} has ${b}. Match them up. How many of ${m.name}'s have no partner? Or count up from ${a} to ${b}.`,
      explain: `${a} + ${b - a} = ${b}. ${k.name} needs ${b - a} more.`,
    });
  }],
  // Missing number across the equal sign
  [4, 7, (t, rng) => {
    const lim = t <= 5 ? 10 : 20;
    const s = randInt(rng, 5, lim === 10 ? 12 : 20);
    const a = randInt(rng, Math.max(1, s - 10), Math.min(10, s - 1)), b = s - a;
    let c = randInt(rng, Math.max(1, s - 10), Math.min(10, s - 1));
    if (c === a) c = a === Math.min(10, s - 1) ? a - 1 : a + 1;
    if (c < 1) c = a + 1;
    const d = s - c;
    const forms = [
      [`${a} + ${b} = ${c} + □`, d],
      [`${a} + ${b} = □ + ${d}`, c],
      [`${s} = □ + ${b}`, a],
      [`${c} + □ = ${a} + ${b}`, d],
    ];
    if (t >= 7) forms.push([`□ + ${b} = ${c} + ${d}`, a]);
    const [prompt, ans] = pick(rng, t === 4 ? forms.slice(0, 3) : forms);
    const q = {
      prompt, visual: t <= 5 ? { type: 'balance', left: prompt.split(' = ')[0].replace('□', '?'), right: prompt.split(' = ')[1].replace('□', '?'), tilt: 'level' } : undefined,
      hint: 'Both sides of = must have the same total. First add up the side with no box. Then find the number that makes the box side match it.',
      explain: `Both sides must be ${s}. The box is ${ans}.`,
    };
    if (t >= 5 && chance(rng, 0.5)) return numq({ ...q, answer: ans });
    return mcn(rng, { ...q, correct: ans, wrong: [s, s + (prompt.includes(`${c} +`) ? c : a), ans + 1, ans - 1], min: 0, max: 40 });
  }],
  // Which side is more?
  [6, 7, (t, rng) => {
    const x = () => { const s = randInt(rng, 6, 20); const p = randInt(rng, Math.max(1, s - 10), Math.min(10, s - 1)); return [p, s - p, s]; };
    const [a, b, s1] = x();
    let [c, d, s2] = x();
    if (chance(rng, 0.3)) { c = randInt(rng, Math.max(1, s1 - 10), Math.min(10, s1 - 1)); d = s1 - c; s2 = s1; }
    const L = `${a} + ${b}`, R = `${c} + ${d}`;
    if (L === R) return numq({ prompt: `${a} + ${b} = □ + ${b}`, answer: a, hint: `Both sides have + ${b}. For the sides to match, what must the other numbers be?`, explain: `${a} + ${b} = ${a} + ${b}. The box is ${a}.` });
    const correct = s1 === s2 ? 'They are equal' : s1 > s2 ? L : R;
    return mcq(rng, {
      prompt: `Which is more: ${L} or ${R}?`, correct, wrong: [L, R, 'They are equal'].filter((y) => y !== correct), count: 3,
      hint: `Work out ${L}. Then work out ${R}. The bigger total is more. If both totals are the same, pick "They are equal".`,
      explain: `${L} = ${s1}. ${R} = ${s2}. ${s1 === s2 ? 'They are equal.' : `${Math.max(s1, s2)} is more.`}`,
      explainVisual: { type: 'balance', left: L, right: R, tilt: s1 === s2 ? 'level' : s1 > s2 ? 'left' : 'right' },
    });
  }],
  // Three-addend true/false
  [7, 7, (t, rng) => {
    const a = randInt(rng, 2, 7), b = randInt(rng, 2, 7), c = randInt(rng, 1, 6), s = a + b + c;
    const d = randInt(rng, Math.max(1, s - 10), Math.min(10, s - 1));
    const truth = chance(rng, 0.5);
    const e = truth ? s - d : s - d + pick(rng, [1, -1]);
    return mcq(rng, {
      prompt: `True or false? ${a} + ${b} + ${c} = ${d} + ${e}`, correct: truth ? 'True' : 'False', wrong: [truth ? 'False' : 'True'], count: 2,
      hint: `Add ${a} + ${b} first, then add ${c}. Then add the other side. It is true only if both totals match.`,
      explain: `${a} + ${b} + ${c} = ${s}. ${d} + ${e} = ${d + e}. ${truth ? 'Both are the same, so it is true.' : 'They are not the same, so it is false.'}`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// g1-meas-time (days, weeks, months, sequencing; no clock reading)
// ---------------------------------------------------------------------------
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_PARTS = {
  morning: ['🥣 eat breakfast', '⏰ wake up', '🌅 see the sun come up', '🎒 pack for school', '🪥 brush teeth after waking up'],
  afternoon: ['🥪 eat lunch', '🛝 play after lunch', '🏫 come home from school', '🍎 have an after-school snack'],
  evening: ['🍝 eat supper', '🛁 have a bath', '📖 read a bedtime story', '🌙 go to bed', '🌆 watch the sun go down'],
};
const SEQUENCES = [
  ['🧦 put on socks', '👟 put on shoes'],
  ['🌱 plant a seed', '💧 water it', '🌻 it grows a flower'],
  ['🥚 an egg', '🐣 a chick hatches', '🐔 it grows into a hen'],
  ['🐛 a caterpillar', '🛌 it makes a cocoon', '🦋 a butterfly comes out'],
  ['🥣 pour the cereal', '🥛 add milk', '🥄 eat it'],
  ['🪥 put toothpaste on', '😁 brush your teeth', '🚰 rinse'],
  ['⛄ roll a big snowball', '⚪ add a head', '🎩 add a hat'],
  ['🧼 wet your hands', '🫧 scrub with soap', '💧 rinse', '🧻 dry them'],
  ['🎂 bake a cake', '🕯️ add candles', '🎉 sing and eat'],
  ['🧥 put on a coat', '🚪 go outside', '🛷 go sledding'],
];
const DURATIONS = [
  ['blink 👁️', 1], ['clap once 👏', 1], ['sneeze 🤧', 1], ['jump once 🐸', 1], ['tie a shoe 👟', 20], ['wash your hands 🧼', 30],
  ['brush your teeth 🪥', 120], ['eat an apple 🍎', 300], ['have a bath 🛁', 900], ['watch a movie 🎬', 5400], ['a school day 🏫', 21600],
  ['sleep at night 🛌', 36000], ['a summer holiday ☀️', 5e6], ['grow a pumpkin 🎃', 8e6], ['a tree growing tall 🌳', 1e8],
];
function weekday(y, m, d) { return new Date(y, m - 1, d).getDay(); }
function daysIn(y, m) { return new Date(y, m, 0).getDate(); }

const g1Time = F([
  // Morning / afternoon / evening
  [1, 3, (t, rng) => {
    const part = pick(rng, Object.keys(DAY_PARTS));
    const act = pick(rng, DAY_PARTS[part]);
    const k = kid(rng);
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: `When does ${k.name} ${act.replace(/^\S+ /, '')}? ${act.split(' ')[0]}`, speak: `When does ${k.name} ${act.replace(/^\S+ /, '')}?`,
        correct: part, wrong: Object.keys(DAY_PARTS).filter((p) => p !== part), count: 3,
        hint: `Morning is from waking up until lunch. Afternoon is after lunch until supper. Evening is supper until bedtime. When would ${k.name} ${act.replace(/^\S+ /, '')}?`,
        explain: `We usually ${act.replace(/^\S+ /, '')} in the ${part}.`,
      });
    }
    const wrongs = Object.keys(DAY_PARTS).filter((p) => p !== part).map((p) => pick(rng, DAY_PARTS[p]));
    return mcq(rng, {
      prompt: `What does ${k.name} do in the ${part}?`, correct: act, wrong: wrongs, count: 3,
      hint: `Morning is from waking up until lunch. Afternoon is after lunch until supper. Evening is supper until bedtime. Which choice happens in the ${part}?`, explain: `We usually ${act.replace(/^\S+ /, '')} in the ${part}.`,
    });
  }],
  // First / then / next
  [1, 4, (t, rng) => {
    const seq = pick(rng, t === 1 ? SEQUENCES.filter((s) => s.length <= 3) : SEQUENCES);
    const k = kid(rng);
    const v = t === 1 ? randInt(rng, 0, 1) : randInt(rng, 0, 2);
    if (v === 0) {
      return mcq(rng, {
        prompt: pick(rng, ['What happens first?', `What does ${k.name} do first?`, 'Which comes first?']), correct: seq[0], wrong: seq.slice(1),
        hint: 'Which step has to happen before the others? Imagine each one. Could you do it if nothing else had happened yet?', explain: `First: ${seq[0]}. Then: ${seq.slice(1).join(', then ')}.`,
      });
    }
    if (v === 1) {
      const i = randInt(rng, 0, seq.length - 2);
      return mcq(rng, {
        prompt: `First: ${seq[i]}. What comes next?`, correct: seq[i + 1], wrong: seq.filter((_, j) => j !== i + 1 && j !== i).concat(seq.length === 2 ? [pick(rng, SEQUENCES.filter((s) => s !== seq))[0]] : []),
        hint: `First comes "${seq[i].replace(/^\S+ /, '')}". Picture it. What would happen right after that?`, explain: `The order is: ${seq.join(', then ')}.`,
      });
    }
    return mcq(rng, {
      prompt: 'What happens last?', correct: seq[seq.length - 1], wrong: seq.slice(0, -1),
      hint: 'Put the steps in order in your head. Which one happens at the very end, after all the others?', explain: `The order is: ${seq.join(', then ')}. The last is ${seq[seq.length - 1]}.`,
    });
  }],
  // Which takes longer / shorter?
  [1, 5, (t, rng) => {
    let a, b;
    do { [a, b] = sample(rng, DURATIONS, 2); } while (Math.max(a[1], b[1]) / Math.min(a[1], b[1]) < (t <= 2 ? 50 : 8));
    const longer = chance(rng, 0.6);
    const ans = (a[1] > b[1]) === longer ? a : b;
    return mcq(rng, {
      prompt: longer ? 'Which takes longer?' : 'Which takes less time?', correct: ans[0], wrong: [ans === a ? b[0] : a[0]], count: 2,
      hint: `Picture yourself doing each one: ${a[0].replace(/ \S+$/, '')}, and ${b[0].replace(/ \S+$/, '')}. Which one is over in a moment, and which takes a long time?`,
      explain: `${cap(ans[0].replace(/ \S+$/, ''))} takes ${longer ? 'longer' : 'less time'}.`,
    });
  }],
  // Yesterday / today / tomorrow
  [2, 5, (t, rng) => {
    const d = randInt(rng, 0, 6);
    const forms = [
      ['Today is', 'What day is tomorrow?', 1], ['Today is', 'What day was yesterday?', -1],
    ];
    if (t >= 4) forms.push(['Tomorrow is', 'What day is today?', -1], ['Yesterday was', 'What day is today?', 1]);
    if (t >= 5) forms.push(['Yesterday was', 'What day is tomorrow?', 2], ['Tomorrow is', 'What day was yesterday?', -2]);
    const [lead, ask, off] = pick(rng, forms);
    const ans = DAYS[(d + off + 7) % 7];
    return mcq(rng, {
      prompt: `${lead} ${DAYS[d]}. ${ask}`, correct: ans,
      wrong: [DAYS[(d - off + 7) % 7], DAYS[(d + off + (off > 0 ? 1 : -1) + 7) % 7], DAYS[d]].filter((x) => x !== ans),
      hint: `Yesterday is the day before today. Tomorrow is the day after today. ${lead} ${DAYS[d]}, so start there and say the days in order.`,
      explain: `The days go ${DAYS.join(', ')}, and then start again. The answer is ${ans}.`,
    });
  }],
  // Days / months order
  [3, 6, (t, rng) => {
    const useMonth = t >= 3 && chance(rng, 0.5);
    const list = useMonth ? MONTHS : DAYS;
    const L = list.length;
    const i = randInt(rng, 0, L - 1);
    const after = chance(rng, 0.5);
    const ans = list[(i + (after ? 1 : -1) + L) % L];
    const wrong = [list[(i + (after ? -1 : 1) + L) % L], list[(i + (after ? 2 : -2) + L) % L], list[i]];
    return mcq(rng, {
      prompt: `What ${useMonth ? 'month' : 'day'} comes ${after ? 'after' : 'before'} ${list[i]}?`, correct: ans, wrong,
      hint: `Say the ${useMonth ? 'months' : 'days'} in order until you reach ${list[i]}. ${after ? 'After means the one right after it.' : 'Before means the one just before it.'} After the last one, start again at the first.`,
      explain: `${list[(i - 1 + L) % L]}, ${list[i]}, ${list[(i + 1) % L]}. ${ans} comes ${after ? 'after' : 'before'} ${list[i]}.`,
    });
  }],
  // Longer / shorter units
  [2, 4, (t, rng) => {
    const units = ['day', 'week', 'month', 'year'];
    const [x, y] = sample(rng, t === 2 ? units.slice(0, 3) : units, 2);
    const longer = chance(rng, 0.5);
    const ans = (units.indexOf(x) > units.indexOf(y)) === longer ? x : y;
    const why = { day: 'A day is from one morning to the next.', week: 'A week has 7 days.', month: 'A month has about 4 weeks.', year: 'A year has 12 months.' };
    return mcq(rng, {
      prompt: `Which is ${longer ? 'longer' : 'shorter'}: a ${x} or a ${y}?`, correct: `a ${ans}`, wrong: [`a ${ans === x ? y : x}`], count: 2,
      hint: `A day is one morning to the next. A week is 7 days. A month is about 4 weeks. A year is 12 months. Which is ${longer ? 'longer' : 'shorter'}: a ${x} or a ${y}?`,
      explain: `${why[x]} ${why[y]} So a ${ans} is ${longer ? 'longer' : 'shorter'}.`,
    });
  }],
  // Days in a week and weeks
  [3, 7, (t, rng) => {
    const k = kid(rng);
    const v = t <= 4 ? randInt(rng, 0, 1) : randInt(rng, 0, 3);
    if (v === 0) {
      return mcn(rng, {
        prompt: pick(rng, ['How many days are in a week?', `${k.name} goes to camp for 1 week. How many days is that?`]),
        visual: { type: 'calendar', month: randInt(rng, 1, 12), year: 2026 }, correct: 7, wrong: [5, 6, 10, 12, 4], min: 1, max: 31,
        hint: 'Say the days of the week, starting with Sunday. Hold up one finger for each day, then count your fingers.', explain: `${DAYS.join(', ')}: 7 days in a week.`,
      });
    }
    if (v === 1) {
      return mcq(rng, {
        prompt: pick(rng, ['Which days are the weekend?', 'Which two days have no school?']), correct: 'Saturday and Sunday',
        wrong: ['Monday and Tuesday', 'Friday and Monday', 'Wednesday and Thursday'],
        hint: 'The weekend is the two days with no school. They come at the end of one week and the start of the next. Which pair fits?', explain: 'Saturday and Sunday are the weekend.',
      });
    }
    if (v === 2) {
      const w = t === 5 ? 2 : randInt(rng, 2, 3);
      return mcn(rng, {
        prompt: `${k.name}'s trip is ${w} weeks long. How many days is that?`, correct: 7 * w, wrong: [w, 7 * w - 1, 7 * w + 7, 7 + w], min: 1, max: 40,
        hint: `Each week has 7 days. ${k.name}'s trip is ${w} weeks, so count by 7s, ${w} times: ${steps(0, 7 * w, 7)}`, explain: `${Array(w).fill(7).join(' + ')} = ${7 * w} days.`,
      });
    }
    const d = randInt(rng, 0, 6), n = randInt(rng, 2, t >= 6 ? 6 : 3);
    const ago = t === 7 && chance(rng, 0.5);
    const ans = DAYS[(d + (ago ? -n : n) + 7 * 3) % 7];
    return mcq(rng, {
      prompt: ago ? `Today is ${DAYS[d]}. What day was it ${n} days ago?` : `Today is ${DAYS[d]}. What day will it be in ${n} days?`,
      correct: ans, wrong: [DAYS[(d + (ago ? n : -n) + 21) % 7], DAYS[(d + (ago ? -n + 1 : n - 1) + 21) % 7], DAYS[(d + (ago ? -n - 1 : n + 1) + 21) % 7]],
      hint: `Start at ${DAYS[d]}. Say the days ${ago ? 'backward' : 'in order'}, one finger for each day, until you have counted ${n} days.`,
      explain: `Counting ${ago ? 'back' : 'on'} ${n} days from ${DAYS[d]} lands on ${ans}.`,
    });
  }],
  // Calendar reading
  [4, 7, (t, rng) => {
    const m = randInt(rng, 1, 12), y = 2026;
    const day = randInt(rng, 1, daysIn(y, m));
    const k = kid(rng);
    const ev = pick(rng, ['party 🎉', 'swim day 🏊', 'library day 📚', 'trip to the farm 🐄', 'music show 🎵', 'ski day ⛷️']);
    const wd = weekday(y, m, day);
    if (t >= 6 && chance(rng, 0.5)) {
      const n = pick(rng, [1, 2]);
      const d2 = day + 7 * n <= daysIn(y, m) ? day + 7 * n : day - 7 * n;
      const later = d2 > day;
      return mcn(rng, {
        prompt: `${k.name}'s ${ev} is on the ${ordWord(day)}. Grandma comes ${n} week${n > 1 ? 's' : ''} ${later ? 'later' : 'earlier'}. What date?`,
        visual: { type: 'calendar', month: m, year: y, highlight: [day] }, correct: d2, wrong: [later ? day + n : day - n, d2 + 1, d2 - 1, later ? day + 10 : day - 10], min: 1, max: 31,
        hint: `One week is 7 days. On a calendar, one week ${later ? 'later is one row down' : 'earlier is one row up'}, in the same column. Start at the ${ordWord(day)} and move ${n === 1 ? 'one row' : 'two rows'}.`,
        explain: `${n} week${n > 1 ? 's' : ''} is ${7 * n} days. The ${ordWord(day)} ${later ? '+' : '−'} ${7 * n} is the ${ordWord(d2)}.`,
      });
    }
    return mcq(rng, {
      prompt: `${k.name}'s ${ev} is on ${MONTHS[m - 1]} ${day}. What day of the week is that?`,
      visual: { type: 'calendar', month: m, year: y, highlight: [day] }, correct: DAYS[wd],
      wrong: [DAYS[(wd + 1) % 7], DAYS[(wd + 6) % 7], DAYS[(wd + 3) % 7]],
      hint: `Find ${MONTHS[m - 1]} ${day} on the calendar. Slide your finger straight up its column to the day name at the top.`,
      explain: `${MONTHS[m - 1]} ${day} is in the ${DAYS[wd]} column.`,
    });
  }],
  // Months: order, seasons, year
  [5, 7, (t, rng) => {
    const v = randInt(rng, 0, 2);
    if (v === 0) {
      return mcn(rng, {
        prompt: pick(rng, ['How many months are in a year?', 'How many months from one birthday to the next?']), correct: 12, wrong: [10, 7, 4, 11, 30], min: 1, max: 31,
        hint: 'Say the months of the year, starting with January. Hold up one finger for each month, then count.', explain: `${MONTHS.join(', ')}: 12 months.`,
      });
    }
    if (v === 1) {
      const i = randInt(rng, 0, 11);
      const ans = MONTHS[(i + 2) % 12];
      return mcq(rng, {
        prompt: `Which month is 2 months after ${MONTHS[i]}?`, correct: ans,
        wrong: [MONTHS[(i + 1) % 12], MONTHS[(i + 3) % 12], MONTHS[(i + 10) % 12]],
        hint: `Start at ${MONTHS[i]}. Say the next month, then one more month after that.`, explain: `${MONTHS[i]}, ${MONTHS[(i + 1) % 12]}, ${ans}.`,
      });
    }
    const s = randInt(rng, 0, 3);
    const seas = ['spring 🌷', 'summer ☀️', 'fall 🍂', 'winter ❄️'];
    return mcq(rng, {
      prompt: `What season comes after ${seas[s]}?`, correct: seas[(s + 1) % 4], wrong: [seas[(s + 3) % 4], seas[(s + 2) % 4]], count: 3,
      hint: `The seasons always go in the same order: spring, summer, fall, winter, then start again. Find ${seas[s].split(' ')[0]} and say the next one.`, explain: `Spring, summer, fall, winter, then spring again. After ${seas[s].split(' ')[0]} comes ${seas[(s + 1) % 4].split(' ')[0]}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// g1-meas-compare
// ---------------------------------------------------------------------------
// [icon, name, size rank]: pictures keep real-world order (a worm is never drawn longer than a snake), so the picture
// and what the child knows agree. Only things with different ranks are compared.
const LONG_THINGS = [['🐛', 'caterpillar', 1], ['🪱', 'worm', 2], ['🖍️', 'crayon', 3], ['✏️', 'pencil', 4], ['🍌', 'banana', 4], ['🥕', 'carrot', 4], ['🥒', 'cucumber', 5], ['🥖', 'bread', 6], ['🧣', 'scarf', 7], ['🐍', 'snake', 7]];
const TALL_THINGS = [['🕯️', 'candle', 1], ['🦩', 'flamingo', 3], ['⛄', 'snowman', 3], ['🌻', 'sunflower', 4], ['🦒', 'giraffe', 5], ['🌳', 'tree', 6], ['🏠', 'house', 6], ['🗼', 'tower', 7]];
function rankedPick(rng, pool, k) {
  let objs;
  do { objs = sample(rng, pool, k); } while (new Set(objs.map((o) => o[2])).size < k);
  const vals = sample(rng, [2, 3, 4, 5, 6, 7, 8, 9, 10], k).sort((a, b) => a - b);
  const byRank = objs.slice().sort((a, b) => a[2] - b[2]);
  return { objs, vals: objs.map((o) => vals[byRank.indexOf(o)]) };
}
const HEAVY = [['🐘', 'elephant', 9], ['🚗', 'car', 8], ['🎃', 'pumpkin', 6], ['🍉', 'watermelon', 6], ['🐶', 'dog', 7], ['📚', 'stack of books', 5], ['🍎', 'apple', 3], ['🍌', 'banana', 3], ['🍓', 'strawberry', 2], ['🪶', 'feather', 1], ['🍃', 'leaf', 1], ['📎', 'paper clip', 1]];
const HOLDERS = [['🛁', 'bathtub', 9], ['🪣', 'bucket', 7], ['🫖', 'teapot', 5], ['🥣', 'bowl', 4], ['🥛', 'glass', 3], ['☕', 'cup', 3], ['🥄', 'spoon', 1]];

const g1Compare = F([
  // Which is longer / taller?
  [1, 3, (t, rng) => {
    const tall = chance(rng, 0.5);
    const pool = tall ? TALL_THINGS : LONG_THINGS;
    const k = t === 1 ? 2 : 3;
    const { objs, vals } = rankedPick(rng, pool, k);
    const most = chance(rng, 0.6);
    const idx = vals.indexOf(most ? Math.max(...vals) : Math.min(...vals));
    const word = tall ? (most ? (k === 2 ? 'taller' : 'tallest') : (k === 2 ? 'shorter' : 'shortest')) : (most ? (k === 2 ? 'longer' : 'longest') : (k === 2 ? 'shorter' : 'shortest'));
    return mcq(rng, {
      prompt: `Which is ${word}?`, visual: { type: 'measurecompare', attribute: tall ? 'height' : 'length', items: objs.map(([o], i) => ({ object: o, value: vals[i] })) },
      correct: `${objs[idx][0]} ${objs[idx][1]}`, wrong: objs.filter((_, i) => i !== idx).map(([o, n]) => `${o} ${n}`), count: k,
      hint: `Which is ${word}? ${tall ? 'The bottoms line up, so compare the tops. The highest top is tallest, and the lowest top is shortest.' : 'The starts line up, so compare the other ends. The one that reaches farthest is longest.'}`,
      explain: `The ${objs[idx][1]} is ${k === 2 ? word : 'the ' + word}. ${tall ? 'Its top is the ' + (most ? 'highest.' : 'lowest.') : 'Its end reaches ' + (most ? 'the farthest.' : 'the least far.')}`,
    });
  }],
  // Heavier / lighter with a balance
  [1, 4, (t, rng) => {
    let a, b;
    do { [a, b] = sample(rng, HEAVY, 2); } while (a[2] === b[2]);
    const heavy = a[2] > b[2] ? a : b;
    const askHeavy = chance(rng, 0.6);
    const ans = askHeavy ? heavy : heavy === a ? b : a;
    const showBalance = t <= 3 || chance(rng, 0.5);
    return mcq(rng, {
      prompt: askHeavy ? 'Which is heavier?' : 'Which is lighter?',
      visual: showBalance ? { type: 'balance', left: a[0], right: b[0], tilt: heavy === a ? 'left' : 'right' } : undefined,
      correct: `${ans[0]} ${ans[1]}`, wrong: [`${(ans === a ? b : a)[0]} ${(ans === a ? b : a)[1]}`], count: 2,
      hint: showBalance ? 'On a balance, the heavier thing pulls its side down. The lighter side goes up. Which side is down, and which is up?' : `Imagine holding the ${a[1]} in one hand and the ${b[1]} in the other. Which would pull your hand down? That one is heavier.`,
      explain: `The ${heavy[1]} is heavier${showBalance ? ', so its side of the balance goes down' : ''}. The ${(heavy === a ? b : a)[1]} is lighter.`,
    });
  }],
  // Which holds more?
  [1, 4, (t, rng) => {
    const k = t <= 2 ? 2 : 3;
    let objs;
    do { objs = sample(rng, HOLDERS, k); } while (new Set(objs.map((o) => o[2])).size < k);
    const most = chance(rng, 0.6);
    const tgt = objs.reduce((p, c) => ((most ? c[2] > p[2] : c[2] < p[2]) ? c : p));
    const pic = t <= 2 || chance(rng, 0.5);
    return mcq(rng, {
      prompt: most ? (k === 2 ? 'Which holds more?' : 'Which holds the most?') : (k === 2 ? 'Which holds less?' : 'Which holds the least?'),
      visual: pic ? { type: 'measurecompare', attribute: 'capacity', items: objs.map(([o, , c]) => ({ object: o, value: c })) } : undefined,
      correct: `${tgt[0]} ${tgt[1]}`, wrong: objs.filter((o) => o !== tgt).map(([o, n]) => `${o} ${n}`), count: k,
      hint: `"Holds more" means more water fits inside. Imagine filling the ${objs.map((o) => o[1]).join(objs.length === 2 ? ' and the ' : ', the ')} with cups of water. Which needs the ${most ? 'most' : 'fewest'} cups?`,
      explain: `The ${tgt[1]} holds the ${most ? 'most' : 'least'}.`,
    });
  }],
  // Non-standard units: how many squares long?
  [2, 4, (t, rng) => {
    const n = randInt(rng, t === 2 ? 3 : 5, t === 2 ? 8 : 12);
    const [icon, nm] = pick(rng, LONG_THINGS);
    const unit = pick(rng, [['squares', 'square'], ['cubes', 'cube'], ['blocks', 'block']]);
    return mcn(rng, {
      prompt: `The ${nm} ${icon} lies along the ${unit[0]}. How many ${unit[0]} long is it?`,
      visual: { type: 'grid', cols: n + randInt(rng, 1, 3), rows: 1, rect: { x: 0, y: 0, w: n, h: 1 }, showUnits: true },
      correct: n, wrong: [n + 1, n - 1, n + 2], min: 1, max: 20,
      hint: `How many ${unit[0]} does the ${nm} cover? Touch each covered ${unit[1]} and count. Do not count the empty ones at the end.`, explain: `It covers ${n} ${unit[0]}. It is ${n} ${unit[0]} long.`,
    });
  }],
  // Area: which covers more?
  [3, 6, (t, rng) => {
    const dims = [];
    const seen = new Set();
    while (dims.length < 3) {
      const w = randInt(rng, 2, 5), h = randInt(rng, 1, 4);
      if (!seen.has(w * h)) { seen.add(w * h); dims.push([w, h]); }
    }
    const most = chance(rng, 0.6);
    const areas = dims.map(([w, h]) => w * h);
    const tgt = areas.indexOf(most ? Math.max(...areas) : Math.min(...areas));
    const rug = pick(rng, ['rug', 'blanket', 'mat', 'towel', 'poster']);
    if (t >= 5 && chance(rng, 0.5)) {
      const [w, h] = dims[0];
      return mcn(rng, {
        prompt: `How many squares does the ${rug} cover?`, visual: { type: 'grid', cols: 6, rows: 5, rect: { x: 0, y: 0, w, h }, showUnits: true },
        correct: w * h, wrong: [w + h, w * h + 1, w * h - 1, 2 * (w + h)], min: 1, max: 40,
        hint: h === 1 ? `How many squares are shaded? Touch each one and count.` : `How many squares are shaded? There are ${h} rows. Count the squares in the first row, then keep counting on for each row.`, explain: h === 1 ? `1 row of ${w} squares: ${w} squares.` : `${h} rows of ${w}: ${Array(h).fill(w).join(' + ')} = ${w * h} squares.`,
      });
    }
    return visq(rng, {
      prompt: most ? `Which ${rug} covers the most squares?` : `Which ${rug} covers the fewest squares?`,
      items: dims.map(([w, h], i) => ({ visual: { type: 'grid', cols: 5, rows: 4, rect: { x: 0, y: 0, w, h }, showUnits: true }, correct: i === tgt })),
      hint: `Covers the ${most ? 'most' : 'fewest'} means it uses the ${most ? 'most' : 'fewest'} squares. Count the shaded squares in each picture, then compare.`,
      explain: `They cover ${areas.join(', ')} squares. ${areas[tgt]} is the ${most ? 'most' : 'fewest'}.`,
    });
  }],
  // Decimetre
  [4, 6, (t, rng) => {
    if (chance(rng, 0.5)) {
      const n = randInt(rng, 2, t === 4 ? 5 : 9);
      const [icon, nm] = pick(rng, [['🐍', 'snake'], ['🧣', 'scarf'], ['🚂', 'toy train'], ['🪢', 'rope'], ['🎀', 'ribbon']]);
      return mcn(rng, {
        prompt: `Each rod is 1 decimetre. The ${nm} ${icon} is as long as these rods. How many decimetres long?`,
        visual: { type: 'base10', hundreds: 0, tens: n, ones: 0 }, correct: n, wrong: [n * 10, n + 1, n - 1], min: 1, max: 100,
        hint: `Each rod is one decimetre long. The ${nm} is as long as all the rods together. Count the rods, one at a time.`, explain: `There are ${n} rods, so the ${nm} is ${n} decimetres long.`,
      });
    }
    const dm = [['🖍️ a crayon', true], ['🖐️ your hand', true], ['🥄 a spoon', true], ['🧃 a juice box', true]];
    const notDm = [['🚌 a school bus', false], ['🐜 an ant', false], ['🚪 a door', false], ['🍚 a grain of rice', false], ['🏠 a house', false], ['🐘 an elephant', false]];
    const [right] = pick(rng, dm);
    const k = kid(rng);
    return mcq(rng, {
      prompt: pick(rng, ['Which is about 1 decimetre long?', `${k.name} needs something about 1 decimetre long. Which one?`]),
      correct: right, wrong: sample(rng, notDm, 3).map((x) => x[0]),
      hint: 'A decimetre is about as long as a ten-rod, or as wide as your hand. Picture each choice next to your hand. Is it much bigger, much smaller, or about the same?',
      explain: `${cap(right.replace(/^\S+ /, ''))} is about 1 decimetre. The others are much longer or much shorter.`,
      explainVisual: { type: 'base10', hundreds: 0, tens: 1, ones: 0 },
    });
  }],
  // Unit size and number of units
  [5, 7, (t, rng) => {
    const [k, m] = twoKids(rng);
    const units = [['📎 paper clips', 1], ['🖍️ crayons', 3], ['👟 shoes', 7], ['🦶 giant steps', 20]];
    let u1, u2;
    do { [u1, u2] = sample(rng, units, 2); } while (u1[1] === u2[1]);
    const thing = pick(rng, ['table', 'rug', 'bench', 'desk', 'bookshelf', 'hallway']);
    const smallUser = u1[1] < u2[1] ? k : m;
    return mcq(rng, {
      prompt: `${k.name} measures a ${thing} with ${u1[0]}. ${m.name} uses ${u2[0]}. Who counts more units?`,
      correct: smallUser.name, wrong: [smallUser === k ? m.name : k.name, 'They count the same'], count: 3,
      hint: `Which unit is smaller: ${u1[0].replace(/^\S+ /, '')} or ${u2[0].replace(/^\S+ /, '')}? It takes more small units than big units to cover the same ${thing}. Same-size units would give the same count.`,
      explain: `${cap((u1[1] < u2[1] ? u1 : u2)[0].replace(/^\S+ /, ''))} are smaller, so it takes more of them. ${smallUser.name} counts more.`,
    });
  }],
  // Compare lengths by units / transitive
  [5, 7, (t, rng) => {
    if (chance(rng, 0.5)) {
      let A, B;
      do { [A, B] = sample(rng, LONG_THINGS, 2); } while (A[2] <= B[2]);
      const a = randInt(rng, 5, 15), b = randInt(rng, 2, a - 1);
      return mcn(rng, {
        prompt: `The ${A[1]} ${A[0]} is ${a} cubes long. The ${B[1]} ${B[0]} is ${b} cubes long. How much longer is the ${A[1]}?`,
        visual: t === 5 ? { type: 'measurecompare', attribute: 'length', items: [{ object: A[0], value: a, unit: 'cubes' }, { object: B[0], value: b, unit: 'cubes' }] } : undefined,
        correct: a - b, wrong: [a + b, a, b, a - b + 1], min: 0, max: 40,
        hint: `How much longer means find the difference. Count up from ${b} to ${a} on your fingers.`, explain: `${a} − ${b} = ${a - b}. The ${A[1]} is ${a - b} cubes longer.`,
      });
    }
    let trioH;
    do { trioH = sample(rng, HEAVY.filter((h) => h[2] <= 7), 3); } while (new Set(trioH.map((h) => h[2])).size < 3);
    const [A, B, C] = trioH.sort((x, y) => y[2] - x[2]);
    const attr = pick(rng, ['heavier', 'longer', 'taller']);
    const rib = pick(rng, ['ribbon', 'snake', 'scarf', 'rope', 'worm', 'train']);
    const trio = attr === 'heavier' ? [A[1], B[1], C[1]] : attr === 'longer' ? sample(rng, PCOL, 3).map((c) => `${c} ${rib}`) : sample(rng, ['sunflower', 'tower', 'snowman', 'block tower', 'tree'], 1).flatMap((x) => sample(rng, PCOL, 3).map((c) => `${c} ${x}`));
    const opp = { heavier: ['heaviest', 'lightest'], longer: ['longest', 'shortest'], taller: ['tallest', 'shortest'] }[attr];
    const askTop = chance(rng, 0.5);
    return mcq(rng, {
      prompt: `The ${trio[0]} is ${attr} than the ${trio[1]}. The ${trio[1]} is ${attr} than the ${trio[2]}. Which is ${askTop ? opp[0] : opp[1]}?`,
      correct: `the ${askTop ? trio[0] : trio[2]}`, wrong: [`the ${trio[1]}`, `the ${askTop ? trio[2] : trio[0]}`], count: 3,
      hint: `Make a line from ${opp[0]} to ${opp[1]}. Both clues talk about the ${trio[1]}, so it goes in the middle. Which one goes at the ${askTop ? 'start' : 'end'} of the line?`,
      explain: `Order: ${trio[0]}, then ${trio[1]}, then ${trio[2]}. The ${askTop ? trio[0] : trio[2]} is ${askTop ? opp[0] : opp[1]}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// g1-geo-shapes
// ---------------------------------------------------------------------------
const TRI = ['triangle', 'right_triangle', 'equilateral_triangle', 'isosceles_triangle', 'scalene_triangle'];
const SHAPE_INFO = {
  circle: { name: 'circle', sides: 0, corners: 0 }, triangle: { name: 'triangle', sides: 3, corners: 3 },
  square: { name: 'square', sides: 4, corners: 4 }, rectangle: { name: 'rectangle', sides: 4, corners: 4 },
  pentagon: { name: 'pentagon', sides: 5, corners: 5 }, hexagon: { name: 'hexagon', sides: 6, corners: 6 },
  oval: { name: 'oval', sides: 0, corners: 0 },
};
const G1_NAMED = ['circle', 'triangle', 'square', 'rectangle'];
const SOLID_INFO = {
  cube: { name: 'cube', like: 'a dice 🎲', faces: 6, rolls: false, flat: 'square' },
  sphere: { name: 'sphere', like: 'a ball ⚽', faces: 0, rolls: true },
  cylinder: { name: 'cylinder', like: 'a can 🥫', faces: 2, rolls: true, flat: 'circle' },
  cone: { name: 'cone', like: 'an ice cream cone 🍦', faces: 1, rolls: true, flat: 'circle' },
  rect_prism: { name: 'box (prism)', like: 'a cereal box 📦', faces: 6, rolls: false, flat: 'rectangle' },
  square_pyramid: { name: 'pyramid', like: 'a tent ⛺', faces: 5, rolls: false, flat: 'square' },
};
const shapeItem = (rng, shape, extra = {}) => ({ shape, color: pick(rng, PCOL), size: 'm', ...extra });
function actualShape(s) { return TRI.includes(s) ? 'triangle' : s; }

const g1Shapes = F([
  // Name this shape
  [1, 3, (t, rng) => {
    const pool = t === 1 ? ['circle', 'triangle', 'square', 'rectangle'] : ['circle', 'triangle', 'square', 'rectangle', 'oval', ...TRI.slice(1)];
    const s = pick(rng, pool);
    const rot = t >= 2 ? pick(rng, [0, 30, 45, 90, 135, 200]) : 0;
    const name = actualShape(s);
    return mcq(rng, {
      prompt: pick(rng, ['What shape is this?', 'Name this shape.']),
      visual: { type: 'shapes', items: [shapeItem(rng, s, { rotate: s === 'circle' ? 0 : rot, size: pick(rng, ['s', 'm', 'l']) })] },
      correct: name, wrong: ['circle', 'triangle', 'square', 'rectangle', 'oval'].filter((x) => x !== name && !(name === 'square' && x === 'rectangle')),
      hint: 'Count the straight sides. Triangle: 3 sides. Square: 4 equal sides. Rectangle: 4 sides, 2 long and 2 short. Circle and oval: round with no sides, but an oval is stretched.',
      explain: name === 'circle' || name === 'oval' ? `It is round with no corners. It is ${name === 'oval' ? 'an oval' : 'a circle'}.` : `It has ${SHAPE_INFO[name].sides} straight sides${name === 'square' ? ' that are all the same length' : ''}. It is a ${name}${rot ? ', just turned' : ''}.`,
    });
  }],
  // Which one is a ...?
  [1, 4, (t, rng) => {
    const target = pick(rng, G1_NAMED);
    const variants = target === 'triangle' ? TRI : [target];
    const correctShape = pick(rng, variants);
    const others = sample(rng, ['circle', 'triangle', 'square', 'rectangle', 'pentagon', 'hexagon', 'oval'].filter((x) => x !== target && !(target === 'triangle' && TRI.includes(x)) && !(target === 'rectangle' && x === 'square')), 3);
    const rot = () => (t >= 3 ? pick(rng, [0, 25, 45, 90, 160]) : 0);
    const items = [{ visual: { type: 'shapes', items: [shapeItem(rng, correctShape, { rotate: rot() })] }, correct: true },
      ...others.map((o) => ({ visual: { type: 'shapes', items: [shapeItem(rng, o, { rotate: rot() })] }, correct: false }))];
    return visq(rng, {
      prompt: `Which one is a ${target}?`, items,
      hint: target === 'circle' ? 'A circle is perfectly round, with no sides or corners. An oval is stretched, not perfectly round. Which picture is perfectly round?' : `A ${target} has ${SHAPE_INFO[target].sides} straight sides${target === 'square' ? ', all the same length' : target === 'rectangle' ? ' and square corners' : ''}. Count the sides in each picture. Turning a shape does not change it.`,
      explain: target === 'circle' ? 'The circle is perfectly round. It has no sides or corners.' : `A ${target} has ${SHAPE_INFO[target].sides} sides and ${SHAPE_INFO[target].corners} corners, even when it is turned.`,
    });
  }],
  // Sides and corners
  [2, 5, (t, rng) => {
    const s = pick(rng, ['triangle', 'square', 'rectangle', 'pentagon', 'hexagon', 'circle', ...(t >= 3 ? TRI.slice(1) : [])]);
    const info = SHAPE_INFO[actualShape(s)];
    const askSides = chance(rng, 0.5);
    const n = askSides ? info.sides : info.corners;
    return mcn(rng, {
      prompt: `How many ${askSides ? 'sides' : 'corners'} does this shape have?`,
      visual: { type: 'shapes', items: [shapeItem(rng, s, { rotate: t >= 3 ? pick(rng, [0, 30, 90, 180]) : 0 })] },
      correct: n, wrong: [n + 1, n - 1, n + 2], min: 0, max: 10,
      hint: askSides ? 'Put your finger on one straight side. Go around the shape, counting each side once, until you are back where you started.' : 'A corner is where two sides meet. Go around the shape and count each corner once.',
      explain: n === 0 ? `A ${info.name} is round. It has no ${askSides ? 'sides' : 'corners'}.` : `A ${info.name} has ${info.sides} sides and ${info.corners} corners.`,
    });
  }],
  // Which is NOT a triangle? (uncommon forms)
  [3, 5, (t, rng) => {
    const target = pick(rng, ['triangle', 'rectangle', 'circle']);
    let yes, no;
    if (target === 'triangle') { yes = sample(rng, TRI, 3); no = pick(rng, ['square', 'trapezoid', 'pentagon', 'kite']); }
    else if (target === 'rectangle') { yes = ['rectangle', 'rectangle', 'rectangle']; no = pick(rng, ['parallelogram', 'trapezoid', 'pentagon', 'oval']); }
    else { yes = ['circle', 'circle', 'circle']; no = pick(rng, ['oval', 'semicircle', 'heart']); }
    const items = [...yes.map((s) => ({ visual: { type: 'shapes', items: [shapeItem(rng, s, { rotate: pick(rng, [0, 30, 60, 90, 150]), size: pick(rng, ['s', 'm', 'l']) })] }, correct: false })),
      { visual: { type: 'shapes', items: [shapeItem(rng, no, { rotate: pick(rng, [0, 20, 90]) })] }, correct: true }];
    const uniq = [];
    for (const it of items) if (!uniq.some((u) => JSON.stringify(u.visual) === JSON.stringify(it.visual))) uniq.push(it);
    return visq(rng, {
      prompt: `Which one is NOT a ${target}?`, items: uniq,
      hint: `Every ${target} ${target === 'triangle' ? 'has exactly 3 straight sides' : target === 'rectangle' ? 'has 4 straight sides and 4 square corners' : 'is perfectly round'}. Check each picture: which one breaks that rule? Size, colour and turning do not matter.`,
      explain: `Big, small, skinny or turned, a ${target} is still a ${target}. The odd one is a different shape.`,
    });
  }],
  // 3-D solids
  [1, 5, (t, rng) => {
    const keys = Object.keys(SOLID_INFO);
    const v = t === 1 ? 0 : randInt(rng, 0, t >= 3 ? 3 : 1);
    if (v === 0) {
      const s = pick(rng, keys);
      const others = sample(rng, keys.filter((x) => x !== s), 3);
      return visq(rng, {
        prompt: `Which solid is shaped like ${SOLID_INFO[s].like}?`,
        items: [s, ...others].map((x, i) => ({ visual: { type: 'solids', items: [{ solid: x, color: pick(rng, PCOL) }] }, correct: i === 0 })),
        hint: `Think about ${SOLID_INFO[s].like}. Is it round all over, does it have a point, or does it have flat faces? Find the solid with the same shape.`, explain: `${cap(SOLID_INFO[s].like)} is shaped like a ${SOLID_INFO[s].name}.`,
      });
    }
    if (v === 1) {
      const s = pick(rng, keys);
      return withHint(mcq(rng, {
        prompt: 'What is this solid called?', visual: { type: 'solids', items: [{ solid: s, color: pick(rng, PCOL) }] },
        correct: SOLID_INFO[s].name, wrong: keys.filter((x) => x !== s).map((x) => SOLID_INFO[x].name),
        hint: '-', explain: `This is a ${SOLID_INFO[s].name}. It looks like ${SOLID_INFO[s].like}.`,
      }), (ch) => `${ch.map((c) => `A ${c} is shaped like ${Object.values(SOLID_INFO).find((v) => v.name === c).like.replace(/ \S+$/, '')}`).join('. ')}. Which one matches the picture?`);
    }
    if (v === 2) {
      const roll = pick(rng, keys.filter((k) => SOLID_INFO[k].rolls));
      const nots = sample(rng, keys.filter((k) => !SOLID_INFO[k].rolls), 2);
      return visq(rng, {
        prompt: 'Which solid can roll?', items: [roll, ...nots].map((x, i) => ({ visual: { type: 'solids', items: [{ solid: x, color: pick(rng, PCOL) }] }, correct: i === 0 })),
        hint: 'Solids with a curved surface can roll. Solids with only flat faces slide instead. Which choice has a curved surface?', explain: `The ${SOLID_INFO[roll].name} has a curved surface, so it can roll.`,
      });
    }
    const s = pick(rng, keys.filter((k) => SOLID_INFO[k].flat));
    const flat = SOLID_INFO[s].flat;
    return mcq(rng, {
      prompt: `What shape is the ${s === 'cone' || s === 'square_pyramid' ? 'bottom' : 'flat face'} of ${SOLID_INFO[s].like}?`,
      visual: { type: 'solids', items: [{ solid: s, color: pick(rng, PCOL) }] },
      correct: flat, wrong: ['circle', 'square', 'rectangle', 'triangle'].filter((x) => x !== flat),
      hint: `Imagine dipping ${SOLID_INFO[s].like} in paint and stamping it. Would the print be round (circle), 4 equal sides (square), 4 sides with 2 long (rectangle), or 3 sides (triangle)?`, explain: `A ${SOLID_INFO[s].name} has a flat ${flat} face.`,
    });
  }],
  // Faces
  [4, 6, (t, rng) => {
    const s = pick(rng, ['cube', 'rect_prism', 'cylinder', 'cone', 'square_pyramid']);
    return mcn(rng, {
      prompt: `How many flat faces does ${SOLID_INFO[s].like} have?`, visual: { type: 'solids', items: [{ solid: s, color: pick(rng, PCOL) }] },
      correct: SOLID_INFO[s].faces, wrong: [SOLID_INFO[s].faces + 1, SOLID_INFO[s].faces - 1, 4], min: 0, max: 10,
      hint: 'A face is a flat side. Count the top, the bottom, and each flat side all around. Curved parts are not faces.',
      explain: `A ${SOLID_INFO[s].name} has ${SOLID_INFO[s].faces} flat face${SOLID_INFO[s].faces === 1 ? '' : 's'}.`,
    });
  }],
  // Sorting rule
  [4, 7, (t, rng) => {
    const attr = pick(rng, ['shape', 'colour', 'size']);
    const shapes = sample(rng, ['circle', 'triangle', 'square', 'rectangle', 'star', 'heart'], 4);
    const cols = sample(rng, PCOL, 4);
    const sizes = ['s', 'm', 'l', 'm'];
    let items;
    if (attr === 'shape') { const s = pick(rng, ['circle', 'triangle', 'square', 'rectangle']); items = cols.map((c, i) => ({ shape: s, color: c, size: sizes[i], rotate: s === 'triangle' ? pick(rng, [0, 90, 180]) : 0 })); }
    else if (attr === 'colour') { const c = pick(rng, PCOL); items = shapes.map((s, i) => ({ shape: s, color: c, size: sizes[i] })); }
    else { const z = pick(rng, ['s', 'l']); items = shapes.map((s, i) => ({ shape: s, color: cols[i], size: z })); }
    return mcq(rng, {
      prompt: pick(rng, ['How were these shapes sorted?', 'What is the sorting rule?', 'Why are these shapes in one group?']),
      visual: { type: 'shapes', items }, correct: { shape: 'Same shape', colour: 'Same colour', size: 'Same size' }[attr],
      wrong: ['Same shape', 'Same colour', 'Same size'].filter((x) => x !== { shape: 'Same shape', colour: 'Same colour', size: 'Same size' }[attr]), count: 3,
      hint: 'Same shape means all are the same kind of shape. Same colour means all are one colour. Same size means all are as big as each other. Which one is true for every shape?',
      explain: `They all have the same ${attr}. Their other features are different.`,
    });
  }],
  // Odd one out
  [3, 7, (t, rng) => {
    const attr = pick(rng, t >= 4 ? ['shape', 'colour', 'size', 'sides'] : ['shape', 'colour']);
    // For the colour and size rules, use straight-sided shapes that all have different numbers of sides, so no
    // second rule ("the only curved one", "the only one with 3 sides") can pick out a different answer.
    const shapes = sample(rng, ['square', 'triangle', 'star', 'pentagon', 'hexagon'], 3);
    const cols = sample(rng, PCOL, 3);
    let group, odd, rule;
    if (attr === 'colour') {
      const c = cols[0], oc = pick(rng, PCOL.filter((x) => x !== c));
      group = shapes.map((s) => ({ shape: s, color: c, size: 'm' }));
      odd = { shape: shapes[0], color: oc, size: 'm' };
      rule = `The others are all ${c}.`;
    } else if (attr === 'shape') {
      const s = pick(rng, ['circle', 'square', 'triangle', 'star']), os = pick(rng, ['circle', 'square', 'triangle', 'star', 'heart'].filter((x) => x !== s));
      group = cols.map((c) => ({ shape: s, color: c, size: 'm' }));
      odd = { shape: os, color: cols[1], size: 'm' };
      rule = `The others are all ${s}s.`;
    } else if (attr === 'size') {
      const z = pick(rng, ['s', 'l']);
      group = shapes.map((s, i) => ({ shape: s, color: cols[i], size: z }));
      odd = { shape: shapes[0], color: cols[1], size: z === 's' ? 'l' : 's' };
      rule = `The others are all ${z === 's' ? 'small' : 'big'}.`;
    } else {
      const curved = chance(rng, 0.5);
      const pool = curved ? ['circle', 'oval', 'heart'] : ['square', 'triangle', 'rectangle', 'pentagon', 'hexagon'];
      const opool = curved ? ['square', 'triangle', 'rectangle'] : ['circle', 'oval'];
      group = sample(rng, pool, 3).map((s, i) => ({ shape: s, color: cols[i], size: 'm' }));
      odd = { shape: pick(rng, opool), color: cols[0], size: 'm' };
      rule = curved ? 'The others are curved. The odd one has straight sides.' : 'The others have straight sides. The odd one is curved.';
    }
    return visq(rng, {
      prompt: 'Which one does not belong?',
      items: [...group.map((g) => ({ visual: { type: 'shapes', items: [g] }, correct: false })), { visual: { type: 'shapes', items: [odd] }, correct: true }],
      hint: 'Three of them match in one way: the same colour, the same shape, the same size, or all straight or all curved sides. Find that rule. Which one does not follow it?',
      explain: rule,
    });
  }],
  // Composite shapes
  [5, 7, (t, rng) => {
    const combos = [
      { parts: [['square', 0], ['square', 0]], make: 'rectangle', wrong: ['circle', 'triangle', 'hexagon'], say: '2 squares side by side' },
      { parts: [['semicircle', 0], ['semicircle', 180]], make: 'circle', wrong: ['square', 'triangle', 'rectangle'], say: '2 half circles' },
      { parts: [['right_triangle', 0], ['right_triangle', 180]], make: 'square', wrong: ['circle', 'hexagon', 'oval'], say: '2 triangles' },
      { parts: Array(6).fill(['equilateral_triangle', 0]), make: 'hexagon', wrong: ['circle', 'square', 'oval'], say: '6 triangles' },
      { parts: [['trapezoid', 0], ['trapezoid', 180]], make: 'hexagon', wrong: ['circle', 'triangle', 'oval'], say: '2 trapezoids' },
      { parts: [['rectangle', 0], ['rectangle', 0]], make: 'square', wrong: ['circle', 'triangle', 'oval'], say: '2 long rectangles' },
    ];
    const c = pick(rng, t === 5 ? combos.slice(0, 3) : combos);
    const col = pick(rng, PCOL);
    if (t >= 6 && chance(rng, 0.4)) {
      const n = c.parts.length;
      const reps = randInt(rng, 2, 3);
      return mcn(rng, {
        prompt: `${cap(c.say)} make one ${c.make}. How many ${{ square: 'squares', semicircle: 'half circles', right_triangle: 'triangles', equilateral_triangle: 'triangles', trapezoid: 'trapezoids', rectangle: 'rectangles' }[c.parts[0][0]]} make ${reps} ${c.make}s?`,
        visual: { type: 'shapes', items: c.parts.map(([s, r]) => ({ shape: s, color: col, rotate: r, size: 's' })) },
        correct: n * reps, wrong: [n + reps, n * reps + 1, n, n * reps - n], min: 1, max: 40,
        hint: `One ${c.make} needs ${n} pieces. Count by ${n}s, once for each ${c.make}: ${steps(0, n * reps, n)}`, explain: `${Array(reps).fill(n).join(' + ')} = ${n * reps}.`,
      });
    }
    return mcq(rng, {
      prompt: 'Put these together. What shape can you make?',
      visual: { type: 'shapes', items: c.parts.map(([s, r]) => ({ shape: s, color: col, rotate: r, size: 's' })) },
      correct: c.make, wrong: c.wrong,
      hint: 'Imagine sliding the pieces together with no gaps. Look at the outside of the new shape: 4 equal sides is a square, 4 sides with 2 long is a rectangle, 6 sides is a hexagon, and round is a circle.', explain: `${cap(c.say)} fit together to make a ${c.make}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// g1-data-data
// ---------------------------------------------------------------------------
const DATASETS = [
  { title: 'Favourite Fruit', q: 'What is your favourite fruit?', cats: [['🍎', 'Apple'], ['🍌', 'Banana'], ['🍇', 'Grapes'], ['🍓', 'Berries'], ['🍊', 'Orange']] },
  { title: 'Favourite Pet', q: 'What pet do you like best?', cats: [['🐶', 'Dog'], ['🐱', 'Cat'], ['🐟', 'Fish'], ['🐰', 'Bunny'], ['🐦', 'Bird']] },
  { title: 'How We Get to School', q: 'How do you get to school?', cats: [['🚌', 'Bus'], ['🚶', 'Walk'], ['🚗', 'Car'], ['🚲', 'Bike']] },
  { title: 'Favourite Season', q: 'Which season do you like best?', cats: [['🌷', 'Spring'], ['☀️', 'Summer'], ['🍂', 'Fall'], ['❄️', 'Winter']] },
  { title: 'Favourite Snack', q: 'What snack do you like best?', cats: [['🥕', 'Carrots'], ['🧀', 'Cheese'], ['🍿', 'Popcorn'], ['🍎', 'Apple'], ['🥨', 'Pretzel']] },
  { title: 'Magic Creature', q: 'Which magic creature do you like best?', cats: [['🐉', 'Dragon'], ['🦄', 'Unicorn'], ['🦉', 'Owl'], ['🧜', 'Mermaid']] },
  { title: 'Favourite Sport', q: 'What sport do you like best?', cats: [['⚽', 'Soccer'], ['🏒', 'Hockey'], ['🏀', 'Basketball'], ['⚾', 'Baseball'], ['🏊', 'Swimming']] },
  { title: 'Favourite Weather', q: 'What weather do you like best?', cats: [['☀️', 'Sunny'], ['🌧️', 'Rainy'], ['☁️', 'Cloudy'], ['❄️', 'Snowy']] },
];
function makeData(rng, k, lo, hi, distinct = true) {
  const ds = pick(rng, DATASETS);
  const cats = sample(rng, ds.cats, k);
  let counts;
  if (distinct) counts = sample(rng, Array.from({ length: hi - lo + 1 }, (_, i) => lo + i), k);
  else counts = cats.map(() => randInt(rng, lo, hi));
  return { ds, cats, counts, rows: cats.map(([ic, nm], i) => ({ label: `${ic} ${nm}`, count: counts[i] })) };
}
// Grade 1 reads one-to-one graphs: pictographs, and (tiers 6–7) a bar graph with a scale of 1, like a graph of
// stacked cubes. Tally charts are a Grade 2 recording method, so they are not used here.
function dataVisual(rng, d, t) {
  if (t >= 6 && chance(rng, 0.5)) return { type: 'bargraph', title: d.ds.title, labels: d.rows.map((r) => r.label), values: d.counts, scale: 1 };
  return { type: 'pictograph', title: d.ds.title, rows: d.rows, icon: pick(rng, ['🙂', '⭐', '🟦', '❤️']), key: 1 };
}

const g1Data = F([
  // How many for one category?
  [1, 4, (t, rng) => {
    const d = makeData(rng, t === 1 ? 2 : t === 2 ? 3 : 4, 1, t === 1 ? 5 : 9);
    const i = randInt(rng, 0, d.cats.length - 1);
    return mcn(rng, {
      prompt: `How many picked ${d.cats[i][1]}?`, visual: dataVisual(rng, d, t), correct: d.counts[i],
      wrong: [...d.counts.filter((_, j) => j !== i), d.counts[i] + 1, d.counts[i] - 1], min: 0, max: 20,
      hint: `How many picked ${d.cats[i][1]}? Find the ${d.cats[i][1]} row. Touch each picture and count.`, explain: `The ${d.cats[i][1]} row has ${d.counts[i]}.`,
    });
  }],
  // Most / least
  [1, 5, (t, rng) => {
    const d = makeData(rng, t === 1 ? 2 : t <= 3 ? 3 : 4, 1, t <= 2 ? 6 : 10);
    const most = chance(rng, 0.5);
    const v = most ? Math.max(...d.counts) : Math.min(...d.counts);
    const i = d.counts.indexOf(v);
    return mcq(rng, {
      prompt: most ? pick(rng, ['Which was picked the most?', 'Which is the favourite?']) : 'Which was picked the least?',
      visual: dataVisual(rng, d, t), correct: `${d.cats[i][0]} ${d.cats[i][1]}`, wrong: d.cats.filter((_, j) => j !== i).map(([a, b]) => `${a} ${b}`),
      hint: `${most ? 'Most' : 'Least'} means the ${most ? 'biggest' : 'smallest'} number. Count each row, or look for the ${most ? 'longest' : 'shortest'} row.`,
      explain: `${d.cats[i][1]} has ${v}. That is the ${most ? 'most' : 'least'}.`,
    });
  }],
  // How many more / fewer?
  [3, 7, (t, rng) => {
    const d = makeData(rng, t <= 4 ? 3 : 4, 1, t <= 4 ? 9 : 12);
    const [i, j] = sample(rng, [0, 1, 2, 3].slice(0, d.cats.length), 2);
    const [hi, lo] = d.counts[i] > d.counts[j] ? [i, j] : [j, i];
    const more = chance(rng, 0.6);
    return mcn(rng, {
      prompt: more ? `How many more picked ${d.cats[hi][1]} than ${d.cats[lo][1]}?` : `How many fewer picked ${d.cats[lo][1]} than ${d.cats[hi][1]}?`,
      visual: dataVisual(rng, d, t), correct: d.counts[hi] - d.counts[lo],
      wrong: [d.counts[hi] + d.counts[lo], d.counts[hi], d.counts[lo], d.counts[hi] - d.counts[lo] + 1], min: 0, max: 40,
      hint: `How many more means the difference. Find the ${d.cats[hi][1]} and ${d.cats[lo][1]} numbers. Count up from the smaller one to the bigger one.`, explain: `${d.counts[hi]} − ${d.counts[lo]} = ${d.counts[hi] - d.counts[lo]}.`,
    });
  }],
  // Total
  [3, 7, (t, rng) => {
    const k = t <= 3 ? 2 : t <= 5 ? 3 : 4;
    const d = makeData(rng, k, 1, t <= 4 ? 6 : 9, false);
    const tot = d.counts.reduce((a, b) => a + b, 0);
    return mcn(rng, {
      prompt: pick(rng, ['How many votes in all?', 'How many children were asked?']), visual: dataVisual(rng, d, t), correct: tot,
      wrong: [tot + 1, tot - 1, Math.max(...d.counts), tot - d.counts[0]], min: 0, max: 60,
      hint: `How many in all? Count each row, then add them all: ${d.cats.map((c) => c[1]).join(' + ')}.`, explain: `${d.counts.join(' + ')} = ${tot}.`,
    });
  }],
  // What is true?
  [4, 6, (t, rng) => {
    const d = makeData(rng, 3, 1, 9);
    const [a, b, c] = [0, 1, 2];
    const nm = (i) => d.cats[i][1];
    const statements = [];
    const pairs = [[a, b], [b, c], [a, c]];
    for (const [x, y] of pairs) {
      const bigger = d.counts[x] > d.counts[y] ? x : y, smaller = bigger === x ? y : x;
      statements.push([`More picked ${nm(bigger)} than ${nm(smaller)}.`, true]);
      statements.push([`More picked ${nm(smaller)} than ${nm(bigger)}.`, false]);
    }
    const mx = d.counts.indexOf(Math.max(...d.counts));
    statements.push([`${nm(mx)} is the favourite.`, true]);
    statements.push([`${nm((mx + 1) % 3)} is the favourite.`, false]);
    const tr = pick(rng, statements.filter((s) => s[1]));
    const fl = sample(rng, statements.filter((s) => !s[1]), 3);
    return mcq(rng, {
      prompt: 'What does the graph tell us?', visual: dataVisual(rng, d, t), correct: tr[0], wrong: fl.map((s) => s[0]),
      hint: 'Read each sentence. Find those rows on the graph and count them. Does the sentence match? "Favourite" means the row with the most.', explain: `The graph shows ${d.cats.map((c, i) => `${c[1]} ${d.counts[i]}`).join(', ')}. So "${tr[0]}" is true.`,
    });
  }],
  // Gathering data
  [2, 5, (t, rng) => {
    const ds = pick(rng, DATASETS);
    if (chance(rng, 0.5)) {
      const d = makeData(rng, 3, 1, 8);
      const others = sample(rng, DATASETS.filter((x) => x.title !== d.ds.title), 3).map((x) => x.q);
      return mcq(rng, {
        prompt: 'What question was asked to make this graph?', visual: dataVisual(rng, d, t), correct: d.ds.q, wrong: others,
        hint: `The title says what the graph is about: "${d.ds.title}". The labels are the answers people gave. Which question would get those answers?`, explain: `The graph is about "${d.ds.title}", so the question was "${d.ds.q}"`,
      });
    }
    const k = kid(rng);
    return mcq(rng, {
      prompt: `${k.name} wants to know the class's answer to "${ds.q}" What should ${k.p} do?`,
      correct: 'Ask everyone in the class', wrong: ['Ask one friend', 'Guess', 'Ask only the teacher'],
      hint: 'To learn about the whole class, the answers must come from the class. One friend or the teacher is just one person. A guess is not real data.', explain: 'To find out about the whole class, ask everyone and keep track of the answers.',
    });
  }],
  // Which graph matches?
  [3, 6, (t, rng) => {
    const d = makeData(rng, 3, 1, 6);
    const icon = pick(rng, ['🙂', '⭐', '❤️']);
    const objs = d.cats.map(([ic], i) => ({ icon: ic, count: d.counts[i] }));
    const mkG = (counts) => ({ type: 'pictograph', title: d.ds.title, rows: d.cats.map(([ic, nm], i) => ({ label: `${ic} ${nm}`, count: counts[i] })), icon, key: 1 });
    const c = d.counts;
    const alts = [[c[1], c[0], c[2]], [c[0], c[2], c[1]], [c[0] + 1, c[1], c[2]], [c[0], c[1], Math.max(1, c[2] - 1)], [c[2], c[1], c[0]]];
    const uniq = [];
    for (const a of alts) if (a.join() !== c.join() && !uniq.some((u) => u.join() === a.join())) uniq.push(a);
    return visq(rng, {
      prompt: 'Which graph shows these things?', visual: { type: 'objects', items: objs, layout: 'scatter' },
      items: [{ visual: mkG(c), correct: true }, ...uniq.slice(0, 3).map((a) => ({ visual: mkG(a), correct: false }))],
      hint: `Count each kind of picture: ${d.cats.map((x) => x[1]).join(', ')}. Then check each graph row by row. The right one matches every count.`, explain: `There are ${d.cats.map((x, i) => `${c[i]} ${x[1]}`).join(', ')}.`,
    });
  }],
  // Change the data
  [5, 7, (t, rng) => {
    const d = makeData(rng, 3, 2, 8);
    const lo = d.counts.indexOf(Math.min(...d.counts));
    const add = randInt(rng, 2, 6);
    const newC = d.counts.slice();
    newC[lo] += add;
    const k = kid(rng);
    if (chance(rng, 0.5)) {
      return mcn(rng, {
        prompt: `${add} more children pick ${d.cats[lo][1]}. How many picked ${d.cats[lo][1]} now?`, visual: dataVisual(rng, d, t),
        correct: newC[lo], wrong: [d.counts[lo], add, newC[lo] + 1, newC[lo] - 1], min: 0, max: 30,
        hint: `Find the ${d.cats[lo][1]} row and count it. Then count on ${add} more.`, explain: `${d.counts[lo]} + ${add} = ${newC[lo]}.`,
      });
    }
    const mx = Math.max(...newC);
    const tie = newC.filter((x) => x === mx).length > 1;
    if (tie || chance(rng, 0.25)) {
      return mcq(rng, {
        prompt: `${add} more children pick ${d.cats[lo][1]}. Is there a tie for the most now?`, visual: dataVisual(rng, d, t),
        correct: tie ? 'Yes' : 'No', wrong: [tie ? 'No' : 'Yes'], count: 2, hint: `First add ${add} to the ${d.cats[lo][1]} row. A tie means two rows share the biggest number. Compare the rows.`,
        explain: tie ? `${d.cats[lo][1]} now has ${newC[lo]}. That ties for the most.` : `Now the counts are ${d.cats.map((c, j) => `${c[1]} ${newC[j]}`).join(', ')}. Only one row has the most, so there is no tie.`,
      });
    }
    const i = newC.indexOf(mx);
    return mcq(rng, {
      prompt: `${k.name} asks ${add} more children. They all pick ${d.cats[lo][1]}. Which is the favourite now?`, visual: dataVisual(rng, d, t),
      correct: `${d.cats[i][0]} ${d.cats[i][1]}`, wrong: d.cats.filter((_, j) => j !== i).map(([a, b]) => `${a} ${b}`),
      hint: `First add ${add} to the ${d.cats[lo][1]} row. Then compare all the rows. The favourite has the most.`, explain: `Now the counts are ${d.cats.map((c, j) => `${c[1]} ${newC[j]}`).join(', ')}. ${d.cats[i][1]} has the most.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// g1-data-money
// ---------------------------------------------------------------------------
const COINS = {
  nickel: { name: 'nickel', cents: 5, label: '5¢' }, dime: { name: 'dime', cents: 10, label: '10¢' }, quarter: { name: 'quarter', cents: 25, label: '25¢' },
  loonie: { name: 'loonie', cents: 100, label: '$1' }, toonie: { name: 'toonie', cents: 200, label: '$2' },
};
const COIN_KEYS = Object.keys(COINS);
const money = (c) => (c >= 100 && c % 100 === 0 ? `$${c / 100}` : c < 100 ? `${c}¢` : `$${(c / 100).toFixed(2)}`);
const coinVis = (items) => ({ type: 'coins', items });
const SHOP = [['🍭', 'lollipop'], ['🖍️', 'crayon'], ['🎈', 'balloon'], ['🍪', 'cookie'], ['⭐', 'sticker'], ['🧃', 'juice box'], ['🍎', 'apple'], ['🪀', 'yo-yo'], ['🔮', 'magic marble'], ['✏️', 'pencil']];

const g1Money = F([
  // Name the coin
  [1, 3, (t, rng) => {
    const c = pick(rng, COIN_KEYS);
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: pick(rng, ['What is this coin called?', 'Name this coin.', `${kid(rng).name} found this coin. What is it called?`, `${kid(rng).name} has this coin in ${pick(rng, ['a piggy bank', 'a pocket', 'a wallet', 'a purse'])}. What is it?`]), visual: coinVis([c]),
        correct: c, wrong: COIN_KEYS.filter((x) => x !== c),
        hint: 'Look at the colour, size and picture. The nickel has a beaver. The dime is the smallest coin. The quarter has a caribou. The loonie is gold. The toonie has two colours.', explain: `This is a ${c}. It is worth ${COINS[c].label}.`,
      });
    }
    const others = sample(rng, COIN_KEYS.filter((x) => x !== c), t === 1 ? 2 : 3);
    return visq(rng, {
      prompt: pick(rng, [`Which coin is a ${c}?`, `${kid(rng).name} needs a ${c}. Which one is it?`, `Find the ${c}.`]), items: [c, ...others].map((x, i) => ({ visual: coinVis([x]), correct: i === 0 })),
      hint: 'Look at each coin. The nickel has a beaver. The dime is the smallest coin. The quarter has a caribou. The loonie is gold. The toonie has two colours.', explain: `The ${c} is worth ${COINS[c].label}.`,
    });
  }],
  // Value of a coin
  [1, 4, (t, rng) => {
    const c = pick(rng, COIN_KEYS);
    const showPic = t <= 2 || chance(rng, 0.4);
    return mcq(rng, {
      prompt: showPic ? pick(rng, ['How much is this coin worth?', `${kid(rng).name} has this coin. How much is it worth?`]) : pick(rng, [`How much is a ${c} worth?`, `${kid(rng).name} has a ${c}. How much money is that?`]), visual: showPic ? coinVis([c]) : undefined,
      correct: COINS[c].label, wrong: COIN_KEYS.filter((x) => x !== c).map((x) => COINS[x].label),
      hint: 'First name the coin. The nickel has a beaver. The dime is the smallest coin. The quarter has a caribou. The loonie is gold. The toonie has two colours. Then remember what that coin is worth, or read the number on it.', explain: `A ${c} is worth ${COINS[c].label}.`,
    });
  }],
  // Which is worth more?
  [2, 5, (t, rng) => {
    const k = t === 2 ? 2 : 3;
    const cs = sample(rng, t >= 3 && chance(rng, 0.5) ? ['nickel', 'dime', 'quarter'] : COIN_KEYS, k);
    const most = chance(rng, 0.6);
    const tgt = cs.reduce((p, c) => ((most ? COINS[c].cents > COINS[p].cents : COINS[c].cents < COINS[p].cents) ? c : p));
    return visq(rng, {
      prompt: most ? 'Which coin is worth the most?' : 'Which coin is worth the least?', items: cs.map((x) => ({ visual: coinVis([x]), correct: x === tgt })),
      hint: 'Size does not tell the value: a dime is smaller than a nickel but worth more! Name each coin, then compare what they are worth.',
      explain: `${cs.map((x) => `${cap(x)} ${COINS[x].label}`).join(', ')}. The ${tgt} is worth the ${most ? 'most' : 'least'}.${cs.includes('dime') && cs.includes('nickel') ? ' A dime is smaller than a nickel, but worth more!' : ''}`,
    });
  }],
  // Count same coins
  [3, 6, (t, rng) => {
    const c = pick(rng, t <= 4 ? ['nickel', 'dime', 'loonie', 'toonie'] : ['nickel', 'dime', 'loonie', 'toonie']);
    const max = { nickel: t <= 4 ? 6 : 10, dime: t <= 4 ? 5 : 9, loonie: 9, toonie: t <= 4 ? 4 : 5 }[c];
    const n = randInt(rng, 2, max);
    const v = COINS[c].cents * n;
    const step = COINS[c].cents;
    const k = kid(rng);
    return mcq(rng, {
      prompt: pick(rng, ['How much money is this?', `${k.name} has these coins. How much money?`]), visual: coinVis(Array(n).fill(c)),
      correct: money(v), wrong: [money(v + step), money(v - step), c === 'nickel' || c === 'dime' ? `${n}¢` : `$${n * 2 === v / 100 ? n : n * 2}`, money(v + 2 * step)].filter((x) => !x.includes('-')),
      hint: `Each ${c} is worth ${COINS[c].label}. Count by ${COINS[c].label}, one for each coin${steps(0, v, step) ? ': ' + Array.from({ length: Math.min(3, n - 1) }, (_, j) => money(step * (j + 1))).join(', ') + '…' : '.'}`,
      explain: `Count by ${step >= 100 ? step / 100 : step}s: ${Array.from({ length: n }, (_, i) => money(step * (i + 1))).join(', ')}. That is ${money(v)}.`,
    });
  }],
  // Buy with one coin
  [2, 5, (t, rng) => {
    const c = pick(rng, COIN_KEYS);
    const [ic, item] = pick(rng, SHOP);
    const k = kid(rng);
    const others = sample(rng, COIN_KEYS.filter((x) => x !== c), 3);
    return visq(rng, {
      prompt: `${cap(art(item))} ${ic} costs ${COINS[c].label}. Which coin pays exactly?`, items: [c, ...others].map((x, i) => ({ visual: coinVis([x]), correct: i === 0 })),
      speak: `${cap(art(item))} costs ${say(COINS[c].label)}. Which coin pays exactly?`,
      hint: `Which coin is worth exactly ${COINS[c].label}? The nickel has a beaver. The dime is the smallest coin. The quarter has a caribou. The loonie is gold. The toonie has two colours.`, explain: `A ${c} is worth ${COINS[c].label}. ${k.name} can pay with a ${c}.`,
    });
  }],
  // Relationships: loonies in a toonie, nickels in a dime
  [4, 7, (t, rng) => {
    // 10 dimes or 4 quarters in a loonie needs 100¢ = $1, which is a Grade 2 indicator.
    const pairs = [['loonie', 'toonie', 2], ['nickel', 'dime', 2]];
    if (t >= 6) pairs.push(['nickel', 'quarter', 5]);
    const [small, big, n] = pick(rng, pairs);
    return mcn(rng, {
      prompt: `How many ${small}s make one ${big}?`, visual: coinVis([big]), correct: n, wrong: [n + 1, n - 1, n * 2, 10], min: 1, max: 20,
      hint: `A ${big} is worth ${COINS[big].label}. Count by ${COINS[small].label}, one ${small} at a time, until you reach ${COINS[big].label}.`,
      explain: `${Array(n).fill(COINS[small].label).join(' + ')} = ${COINS[big].label}. ${n} ${small}s make a ${big}.`, explainVisual: coinVis(Array(n).fill(small)),
    });
  }],
  // Which coins make ...?
  [5, 7, (t, rng) => {
    const sets = [
      { total: 10, right: ['nickel', 'nickel'], wrong: [['nickel', 'dime'], ['dime', 'dime'], ['quarter']] },
      { total: 200, right: ['loonie', 'loonie'], wrong: [['toonie', 'loonie'], ['loonie'], ['quarter', 'quarter']] },
      { total: 20, right: ['dime', 'dime'], wrong: [['nickel', 'nickel'], ['dime', 'nickel'], ['quarter']] },
      { total: 300, right: ['toonie', 'loonie'], wrong: [['toonie', 'toonie'], ['loonie', 'loonie'], ['quarter', 'loonie']] },
      { total: 400, right: ['toonie', 'toonie'], wrong: [['toonie', 'loonie'], ['loonie', 'loonie', 'loonie'], ['toonie']] },
    ];
    if (t >= 6) sets.push({ total: 30, right: ['dime', 'dime', 'dime'], wrong: [['quarter'], ['dime', 'dime'], ['nickel', 'nickel', 'nickel']] },
      { total: 25, right: ['nickel', 'nickel', 'nickel', 'nickel', 'nickel'], wrong: [['nickel', 'nickel', 'nickel', 'nickel'], ['dime', 'dime'], ['nickel', 'nickel', 'nickel']] });
    const s = pick(rng, sets);
    const [ic, item] = pick(rng, SHOP);
    return visq(rng, {
      prompt: pick(rng, [`Which coins make ${money(s.total)}?`, `${cap(art(item))} ${ic} costs ${money(s.total)}. Which coins pay exactly?`]),
      items: [{ visual: coinVis(s.right), correct: true }, ...s.wrong.map((w) => ({ visual: coinVis(w), correct: false }))],
      hint: `Add up the coins in each group, then compare with ${money(s.total)}. The right group makes exactly ${money(s.total)}, not more and not less.`, explain: `${s.right.map((c) => COINS[c].label).join(' + ')} = ${money(s.total)}.`,
    });
  }],
  // Enough money?
  [5, 6, (t, rng) => {
    const c = pick(rng, ['nickel', 'dime', 'loonie']);
    const n = randInt(rng, 2, 5);
    const have = COINS[c].cents * n;
    const step = COINS[c].cents;
    const cost = have + pick(rng, [-2, -1, 1, 2]) * step;
    const [ic, item] = pick(rng, SHOP);
    const k = kid(rng);
    const ok = have >= cost;
    return mcq(rng, {
      prompt: `${k.name} has these coins. ${cap(art(item))} ${ic} costs ${money(cost)}. Is that enough?`, visual: coinVis(Array(n).fill(c)),
      correct: ok ? 'Yes, enough' : 'No, not enough', wrong: [ok ? 'No, not enough' : 'Yes, enough'], count: 2,
      hint: `Count ${k.name}'s coins by ${COINS[c].label}. Then compare with ${money(cost)}. Enough means the same as the price, or more.`,
      explain: `${k.name} has ${money(have)}. The ${item} costs ${money(cost)}. ${ok ? 'That is enough.' : 'That is not enough.'}`,
    });
  }],
  // Money left / mixed coins
  [6, 7, (t, rng) => {
    const k = kid(rng);
    const [ic, item] = pick(rng, SHOP);
    if (chance(rng, 0.5)) {
      const have = pick(rng, [200, 300, 400, 500]);
      const cost = 100 * randInt(rng, 1, have / 100 - 1);
      return mcq(rng, {
        prompt: `${k.name} has ${money(have)}. ${k.P} buys ${art(item)} ${ic} for ${money(cost)}. How much is left?`,
        correct: money(have - cost), wrong: [money(have + cost), money(cost), money(Math.max(100, have - cost + 100)), money(have)].filter((x) => x !== money(have - cost)),
        hint: `Take the price away from what ${k.name} has. Start at ${money(have)} and count back ${money(cost)}, one dollar at a time.`, explain: `${money(have)} − ${money(cost)} = ${money(have - cost)}.`,
      });
    }
    // Who has more? Each child has one kind of coin (counting mixed coins comes later).
    const m = twoKids(rng).find((x) => x.name !== k.name);
    const nt = randInt(rng, 1, 4), nl = randInt(rng, 1, 7);
    const vt = 2 * nt, vl = nl;
    const correct = vt === vl ? 'They have the same' : vt > vl ? k.name : m.name;
    return mcq(rng, {
      prompt: `${k.name} has ${nt} toonie${nt > 1 ? 's' : ''}. ${m.name} has ${nl} loonie${nl > 1 ? 's' : ''}. Who has more money?`,
      visual: coinVis([...Array(nt).fill('toonie'), ...Array(nl).fill('loonie')]),
      correct, wrong: [k.name, m.name, 'They have the same'].filter((x) => x !== correct), count: 3,
      hint: `A toonie is $2 and a loonie is $1. Count ${k.name}'s toonies by 2s. Count ${m.name}'s loonies by 1s. Then compare.`,
      explain: `${k.name} has $${vt}. ${m.name} has $${vl}. ${vt === vl ? 'They have the same.' : `${vt > vl ? k.name : m.name} has more.`}`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// Skill list
// ---------------------------------------------------------------------------
export const skills = [
  {
    id: 'g1-qpv-represent', grade: 1, strand: 'number', bigIdea: 'qpv', species: 'numberling', name: 'Numbers to 100', classic: false,
    parentDesc: 'Reads number words to 10, recognizes up to 10 at a glance, shows numbers to 100 as tens and ones, compares numbers, and uses 25, 50 and 75 as benchmarks.',
    gen: g1Represent,
  },
  {
    id: 'g1-qpv-fractions', grade: 1, strand: 'number', bigIdea: 'qpv', species: 'fractling', name: 'Halves and Fourths', classic: false,
    parentDesc: 'Shares wholes and sets into equal parts; names halves and fourths; knows a fourth is half of a half; places one half and fourths on a 0 to 1 number line.',
    gen: g1Fractions,
  },
  {
    id: 'g1-qpv-count', grade: 1, strand: 'number', bigIdea: 'qpv', species: 'counter', name: 'Counting to 100', classic: false,
    parentDesc: 'Counts collections to 20, counts forward and back by 1s within 100, skip counts by 2s to 20 and by 5s and 10s to 100, orders numbers, and finds 1 or 2 more or less.',
    gen: g1Count,
  },
  {
    id: 'g1-ops-addsub', grade: 1, strand: 'number', bigIdea: 'ops', species: 'addsub', name: 'Adding and Subtracting to 20', classic: false,
    parentDesc: 'Adds to 20 and does the matching subtraction; part-part-whole; join, separate and compare story problems; turn-around facts; addition and subtraction undo each other.',
    gen: g1AddSub,
  },
  {
    id: 'g1-ops-facts', grade: 1, strand: 'number', bigIdea: 'ops', species: 'factsprite', name: 'Fact Power to 10', classic: false,
    parentDesc: 'Fluency with facts within 10, making 10, adding and subtracting 0; beginning derived facts to 20 (doubles, near doubles, 10 plus, bridging 10).',
    gen: g1Facts,
  },
  {
    id: 'g1-pat-patterns', grade: 1, strand: 'patterns', bigIdea: 'patterns', species: 'patternkin', name: 'Repeating Patterns', classic: false,
    parentDesc: 'Extends and describes repeating patterns with 2 or 3 terms, finds the core, translates patterns (e.g. to AB letters or actions), finds missing or wrong terms, and knows everyday cycles.',
    gen: g1Patterns,
  },
  {
    id: 'g1-pat-equal', grade: 1, strand: 'patterns', bigIdea: 'patterns', species: 'balancer', name: 'Equal and Not Equal', classic: false,
    parentDesc: 'Understands the equal sign as "the same as": equal and unequal sets, balances, and true/false number sentences written both ways (8 + 7 = 15 and 15 = 8 + 7).',
    gen: g1Equal,
  },
  {
    id: 'g1-meas-time', grade: 1, strand: 'shape', bigIdea: 'measurement', species: 'clockwork', name: 'Days, Weeks and Months', classic: false,
    parentDesc: 'Sequences events (first, then, last), uses morning/afternoon/evening and yesterday/today/tomorrow, knows the order of days and months, and compares longer and shorter durations.',
    gen: g1Time,
  },
  {
    id: 'g1-meas-compare', grade: 1, strand: 'shape', bigIdea: 'measurement', species: 'measurer', name: 'Compare and Measure', classic: false,
    parentDesc: 'Compares length, height, mass, area and capacity; measures with non-standard units; uses the decimetre; knows smaller units give a bigger count.',
    gen: g1Compare,
  },
  {
    id: 'g1-geo-shapes', grade: 1, strand: 'shape', bigIdea: 'geometry', species: 'shapeshifter', name: '2-D and 3-D Shapes', classic: false,
    parentDesc: 'Names common 2-D shapes in any size or position, counts sides and corners, knows 3-D solids and their faces, sorts by one attribute, and builds composite shapes.',
    gen: g1Shapes,
  },
  {
    id: 'g1-data-data', grade: 1, strand: 'stats', bigIdea: 'data', species: 'datapup', name: 'Graphs and Data', classic: false,
    parentDesc: 'Reads simple one-to-one graphs, compares categories, finds totals and differences, chooses how to gather data, and draws conclusions.',
    gen: g1Data,
  },
  {
    id: 'g1-data-money', grade: 1, strand: 'stats', bigIdea: 'data', species: 'coinling', name: 'Canadian Coins', classic: false,
    parentDesc: 'Names and values nickels, dimes, quarters, loonies and toonies; counts groups of the same coin; decides which coins pay for an item.',
    gen: g1Money,
  },
];

export const SKIPPED = [
  { skillId: 'g1-qpv-represent', indicator: 'Write numerals to 100', reason: 'Handwriting cannot be checked; covered by reading and choosing numerals instead.' },
  { skillId: 'g1-pat-patterns', indicator: 'Create a repeating pattern', reason: 'Open-ended building; covered by extending, describing the core and translating patterns.' },
  { skillId: 'g1-data-data', indicator: 'Gather data and build a concrete graph', reason: 'Needs real objects; adapted to choosing how to gather data and choosing the matching graph.' },
  { skillId: 'g1-meas-compare', indicator: 'Measure real objects with non-standard units', reason: 'Needs real objects; adapted to counting units in pictures.' },
  { skillId: 'g1-geo-shapes', indicator: 'Build and replicate composite 2-D shapes and 3-D objects', reason: 'Needs hands-on building; adapted to "which shape do these pieces make?".' },
];

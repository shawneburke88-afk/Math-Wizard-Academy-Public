// Grade 2 question generators (NB holistic curriculum, Grade 2).
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


// ---------------------------------------------------------------------------
// Shared Grade 2 data
// ---------------------------------------------------------------------------
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PCOL = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];
const tHO = (h, t, o) => `${h} hundred${h === 1 ? '' : 's'}, ${tW(t)} and ${oW(o)}`;
const rev2 = (n) => (n >= 10 && n < 100 && n % 10 !== 0 ? Number(String(n).split('').reverse().join('')) : -1);
const b10 = (n) => ({ type: 'base10', hundreds: Math.floor(n / 100), tens: Math.floor((n % 100) / 10), ones: n % 10 });

// ---------------------------------------------------------------------------
// g2-qpv-represent
// ---------------------------------------------------------------------------
const LABELS = [['jersey number', '👕'], ['bus number', '🚌'], ['room number', '🚪'], ['house number', '🏠'], ['locker number', '🔒'], ['hockey sweater number', '🏒'], ['seat number', '💺']];
const AMOUNTS = [['apples', '🍎'], ['kids', '🧒'], ['stickers', '⭐'], ['cookies', '🍪'], ['steps', '👣'], ['marbles', '🔮'], ['books', '📚']];

const top2Hint = (v) => (v.top === 1 ? '1 bead' : `${v.top} beads`);

const g2Represent = F([
  // Recognize up to 20 at a glance
  [1, 2, (t, rng) => {
    const n = t === 1 ? randInt(rng, 6, 12) : randInt(rng, 11, 20);
    const k = pick(rng, n <= 12 ? ['tenframe', 'dice', 'rekenrek'] : ['tenframe', 'rekenrek']);
    let visual, ex, noun;
    if (k === 'tenframe') { visual = { type: 'tenframe', count: n }; noun = 'counters'; ex = n > 10 ? `One full frame is 10. ${n - 10} more makes ${n}.` : `The top row is 5. ${n - 5} more makes ${n}.`; }
    else if (k === 'dice') { visual = { type: 'dots', count: n, arrangement: 'dice' }; noun = 'dots'; ex = `Two dice patterns. Put them together: ${n}.`; }
    else {
      const top2 = randInt(rng, Math.max(n - 10, Math.ceil(n / 2)), Math.min(10, n));
      visual = { type: 'rekenrek', top: top2, bottom: n - top2 }; noun = 'beads';
      ex = `The top row has ${top2}. The bottom row has ${n - top2}. ${top2} + ${n - top2} = ${n}.`;
    }
    return mcn(rng, {
      prompt: pick(rng, [`How many ${noun}?`, `Quick look! How many ${noun}?`, `How many ${noun} do you see?`]), visual,
      correct: n, wrong: [n - 1, n + 1, n - 10 > 0 ? n - 10 : n + 2, n + 10], min: 0, max: 40,
      hint: k === 'tenframe' ? (n > 10 ? `How many counters? One frame is full: that is ten. Count on the other frame from ten${steps(10, n) ? ': ' + steps(10, n) : '.'}` : 'How many counters? The top row holds five. Count on from five for the bottom row.') : k === 'dice' ? 'How many dots? Name the first dice pattern without counting. Then count on the dots of the second dice.' : `How many beads? The top row has ${top2Hint(visual)}. Count on the beads in the bottom row.`, explain: ex,
    });
  }],
  // Read base-10 blocks
  [1, 4, (t, rng) => {
    let n;
    if (t === 1) n = randInt(rng, 11, 59);
    else if (t === 2) n = randInt(rng, 40, 120);
    else n = randInt(rng, 100, 200);
    const h = Math.floor(n / 100), tt = Math.floor((n % 100) / 10), o = n % 10;
    const q = {
      prompt: pick(rng, ['What number do the blocks show?', 'How many in all?', h ? 'Count the hundreds, tens and ones. What number?' : 'Count the tens and ones. What number?']),
      visual: b10(n),
      hint: h ? `A flat is one hundred. Count on the ${tt} rod${tt === 1 ? '' : 's'} by tens${steps(100, 100 + tt * 10, 10) ? ': ' + steps(100, 100 + tt * 10, 10) : ''}. Then count on the ${o} little cube${o === 1 ? '' : 's'}.` : `Count the ${tt} rods by tens. Then count on the ${o} little cube${o === 1 ? '' : 's'}.`,
      explain: h ? `${h} hundred is 100. ${tW(tt)} is ${tt * 10}. ${oW(o)}. 100 + ${tt * 10} + ${o} = ${n}.` : `${tW(tt)} is ${tt * 10}. ${oW(o)} more makes ${n}.`,
    };
    if (t >= 3 && chance(rng, 0.35)) return numq({ ...q, answer: n });
    const wrong = h ? [h * 100 + o * 10 + tt, n - 100 > 0 ? n - 100 : n + 1, n + 10, n - 10, n + 100] : [rev2(n), tt + o, n + 10, n - 10];
    return mcn(rng, { ...q, correct: n, wrong, max: 999 });
  }],
  // Number words to 200
  [2, 5, (t, rng) => {
    const n = t === 2 ? randInt(rng, 20, 99) : randInt(rng, 100, 200);
    const alts = [rev2(n % 100) > 0 ? Math.floor(n / 100) * 100 + rev2(n % 100) : n + 20, n + 10, n - 10, n % 100 || n + 1, n + 1].filter((x) => x > 0 && x !== n);
    if (chance(rng, 0.5)) {
      return mcn(rng, {
        prompt: `Which number is "${numWords(n)}"?`, speak: `Which number is ${numWords(n)}?`, correct: n, wrong: alts, max: 999,
        hint: `Split "${numWords(n)}" into parts. ${n >= 100 ? '"One hundred" means a 1 in the hundreds place. ' : ''}Then write a digit for the tens word and a digit for the ones word.`, explain: `"${numWords(n)}" is ${n}.`, explainVisual: b10(n),
      });
    }
    const uniq = [...new Set(alts)].slice(0, 3);
    return mcq(rng, {
      prompt: `Which words say ${n}?`, correct: numWords(n), wrong: uniq.map(numWords),
      hint: `Read ${n} in parts: hundreds, then tens, then ones. Check each choice: does it say the right tens word and the right ones word? Watch for swapped digits.`, explain: `${n} is "${numWords(n)}".`,
    });
  }],
  // Even or odd
  [1, 5, (t, rng) => {
    const k = kid(rng);
    if (t <= 2) {
      const n = randInt(rng, t === 1 ? 2 : 6, t === 1 ? 10 : 20);
      const th = pick(rng, THINGS);
      const even = n % 2 === 0;
      return mcq(rng, {
        prompt: pick(rng, [`${k.name} has ${n} ${th.many}. Is ${n} even or odd?`, `Make pairs. Is ${n} even or odd?`]),
        visual: { type: 'dots', count: n, arrangement: 'groups', groupSize: 2 }, correct: even ? 'Even' : 'Odd', wrong: [even ? 'Odd' : 'Even'], count: 2,
        hint: 'Even means you can make pairs with none left over. Odd means one is left over. Look at the pairs: does one dot have no partner?',
        explain: even ? `${n} makes ${n / 2} pairs with none left over. ${n} is even.` : `${n} makes ${(n - 1) / 2} pair${n === 3 ? '' : 's'} and 1 left over. ${n} is odd.`,
      });
    }
    if (t >= 4 && chance(rng, 0.5)) {
      const wantEven = chance(rng, 0.5);
      const max = t === 4 ? 100 : 200;
      const base = () => randInt(rng, 5, max / 2 - 1) * 2;
      const right = wantEven ? base() : base() + 1;
      const wrongs = [];
      while (wrongs.length < 3) { const x = wantEven ? base() + 1 : base(); if (!wrongs.includes(x)) wrongs.push(x); }
      return mcq(rng, {
        prompt: `Which number is ${wantEven ? 'even' : 'odd'}?`, correct: String(right), wrong: wrongs.map(String),
        hint: 'Look only at the last digit of each number. Even numbers end in 0, 2, 4, 6 or 8. Odd numbers end in 1, 3, 5, 7 or 9.',
        explain: `${right} ends in ${right % 10}, so it is ${wantEven ? 'even' : 'odd'}.`,
      });
    }
    const n = randInt(rng, 11, t === 3 ? 99 : 200);
    const even = n % 2 === 0;
    return mcq(rng, {
      prompt: `Is ${n} even or odd?`, correct: even ? 'Even' : 'Odd', wrong: [even ? 'Odd' : 'Even'], count: 2,
      hint: `Look at the ones digit of ${n}. Can that many things be shared into two equal groups? If yes, it is even. If one is left over, it is odd.`,
      explain: `The ones digit is ${n % 10}. ${even ? 'It is even, so the number is even.' : 'It is odd, so the number is odd.'}`,
    });
  }],
  // Value of a digit
  [3, 5, (t, rng) => {
    const n = randInt(rng, 101, 199);
    const h = 1, tt = Math.floor((n % 100) / 10), o = n % 10;
    const v = randInt(rng, 0, 2);
    if (v === 0 && tt > 0) {
      return mcn(rng, {
        prompt: `What is the value of the ${tt} in ${n}?`, correct: tt * 10, wrong: [tt, tt * 100, n, tt + 10], max: 999,
        hint: `Find the ${tt} in ${n}. Is it in the hundreds, tens or ones place? A digit in the tens place is worth that many tens.`,
        explain: `In ${n}, the ${tt} is in the tens place. ${tW(tt)} is ${tt * 10}.`, explainVisual: { type: 'placevalue', columns: ['Hundreds', 'Tens', 'Ones'], digits: [h, tt, o] },
      });
    }
    if (v === 1) {
      const place = pick(rng, ['hundreds', 'tens', 'ones']);
      const ans = { hundreds: h, tens: tt, ones: o }[place];
      return mcn(rng, {
        prompt: `What digit is in the ${place} place in ${n}?`, correct: ans, wrong: [h, tt, o, ans + 1], max: 9,
        hint: `In ${n}, name the places from the right: ones, then tens, then hundreds. Which digit sits in the ${place} place?`, explain: `${n} has ${h} in the hundreds place, ${tt} in the tens and ${o} in the ones. The answer is ${ans}.`,
        explainVisual: { type: 'placevalue', columns: ['Hundreds', 'Tens', 'Ones'], digits: [h, tt, o] },
      });
    }
    const blank = randInt(rng, 0, 2);
    const ans = [h, tt, o][blank];
    return mcn(rng, {
      prompt: `The chart shows ${n}. What digit is hidden?`, visual: { type: 'placevalue', columns: ['Hundreds', 'Tens', 'Ones'], digits: [h, tt, o], blank },
      correct: ans, wrong: [h, tt, o, ans + 1, ans - 1], max: 9,
      hint: `${n} has three places: hundreds, tens and ones, from left to right. Which column has the ? Read that digit of ${n}.`, explain: `${n} is ${tHO(h, tt, o)}. The hidden digit is ${ans}.`,
    });
  }],
  // Zero as a placeholder
  [3, 5, (t, rng) => {
    const zeroTens = chance(rng, 0.6);
    const tt = zeroTens ? 0 : randInt(rng, 1, 9), o = zeroTens ? randInt(rng, 1, 9) : 0;
    const n = 100 + tt * 10 + o;
    if (chance(rng, 0.5)) {
      return mcn(rng, {
        prompt: `What number is ${tHO(1, tt, o)}?`, correct: n, wrong: zeroTens ? [10 + o, 100 + o * 10, 1000 + o, n + 10] : [10 + tt, 1 + tt, 100 + tt, n + 1], max: 9999,
        hint: `Write one digit for each place: hundreds, tens, ones. There ${zeroTens ? 'are no tens' : 'are no ones'}, so write a 0 to hold that place.`,
        explain: `1 hundred, ${tW(tt)}, ${oW(o)}: ${n}. The 0 holds the ${zeroTens ? 'tens' : 'ones'} place.`, explainVisual: b10(n),
      });
    }
    return mcn(rng, {
      prompt: 'What number is shown?', visual: { type: 'placevalue', columns: ['Hundreds', 'Tens', 'Ones'], digits: [1, tt, o] },
      correct: n, wrong: zeroTens ? [10 + o, 100 + o * 10, n + 10] : [10 + tt, 100 + tt, n + 1], max: 999,
      hint: 'Read the columns from left to right: hundreds, tens, ones. Write each digit, even the 0.', explain: `1 hundred, ${tW(tt)}, ${oW(o)} is ${n}.`,
    });
  }],
  // Compare with <, >, =
  [3, 5, (t, rng) => {
    let a = randInt(rng, t === 3 ? 20 : 100, t === 3 ? 99 : 200), b;
    const mode = randInt(rng, 0, 3);
    if (mode === 0 && a >= 100 && a % 100 >= 10) { b = 100 + rev2(a % 100 >= 10 ? a % 100 : 11); if (b < 100 || b > 199) b = a + 9; }
    else if (mode === 1) b = a;
    else b = a + pick(rng, [-10, 10, -1, 1, -20, 5, -5]);
    if (b === a && mode !== 1) b = a + 1;
    if (b > 200) b = 2 * a - b; // stay within 200
    const sign = a < b ? '<' : a > b ? '>' : '=';
    if (t === 5 && chance(rng, 0.5)) {
      const opts = [[`${a} < ${b}`, a < b], [`${a} > ${b}`, a > b], [`${a} = ${b}`, a === b], [`${b} < ${a}`, b < a], [`${b} > ${a}`, b > a]];
      const tr = opts.filter((x) => x[1]);
      const fl = opts.filter((x) => !x[1]);
      return mcq(rng, {
        prompt: 'Which is true?', correct: pick(rng, tr)[0], wrong: fl.map((x) => x[0]),
        hint: '< means "is less than" and > means "is greater than". The open side always faces the bigger number. For each choice, check: is it true?',
        explain: a === b ? `${a} and ${b} are equal.` : `${Math.max(a, b)} is greater than ${Math.min(a, b)}.`,
      });
    }
    return mcq(rng, {
      prompt: `Which sign goes in the box? ${a} □ ${b}`, speak: `Which sign goes in the box? ${numWords(a)}, box, ${numWords(b)}. Less than, greater than, or equals?`,
      correct: sign, wrong: ['<', '>', '='].filter((x) => x !== sign), count: 3,
      hint: `Compare ${a} and ${b}: hundreds first, then tens, then ones. If ${a} is smaller, use <. If ${a} is bigger, use >. If they are the same, use =.`,
      explain: a === b ? `${a} = ${b}. They are the same.` : `${a} is ${a < b ? 'less' : 'greater'} than ${b}, so ${a} ${sign} ${b}.`,
    });
  }],
  // Renaming
  [4, 6, (t, rng) => {
    const v = randInt(rng, 0, 2);
    if (v === 0) {
      const n = randInt(rng, 100, 199), T = Math.floor(n / 10), o = n % 10;
      return mcn(rng, {
        prompt: `${n} = □ tens and ${oW(o)}`, correct: T, wrong: [T % 10, Math.floor(n / 100), T + 1, T - 1], max: 99,
        hint: `1 hundred is the same as ten tens. ${n} has 1 hundred and ${tW(T % 10)}. Add the tens together.`, explain: `${n} is 1 hundred and ${tW(T % 10)}. 1 hundred = 10 tens, so that is ${tW(T)}. ${n} = ${tW(T)} and ${oW(o)}.`,
        explainVisual: b10(n),
      });
    }
    if (v === 1) {
      const T = randInt(rng, 10, 20);
      return mcn(rng, {
        prompt: `What number is ${T} tens?`, correct: T * 10, wrong: [T, T * 100, T + 10, T * 10 + 10], max: 9999,
        hint: `10 tens make one hundred. So ${T} tens is one hundred and ${tW(T - 10)} more.`, explain: `10 tens is 100. ${T} tens is ${T * 10}.`, explainVisual: b10(T * 10),
      });
    }
    const n = randInt(rng, 110, 199), T = Math.floor(n / 10), o = n % 10;
    return mcq(rng, {
      prompt: `Which is the same as ${n}?`, correct: `${tW(T)} and ${oW(o)}`,
      wrong: [`${tW(T % 10)} and ${oW(o)}`, `${tW(Number(String(T).split('').reverse().join('')))} and ${oW(o)}`, `${tW(T)} and ${oW(o + 10)}`, `${tW(o)} and ${oW(T)}`],
      hint: `Test each choice: count its tens by tens, then add its ones. Which one makes ${n}? Remember 1 hundred = 10 tens.`, explain: `${n} = 1 hundred, ${tW(T % 10)} and ${oW(o)} = ${tW(T)} and ${oW(o)}.`,
    });
  }],
  // Benchmarks 50, 100, 150
  [4, 7, (t, rng) => {
    const b = pick(rng, [50, 100, 150]);
    const v = b + randInt(rng, 2, t === 4 ? 8 : 12) * (chance(rng, 0.5) ? 1 : -1);
    if (t <= 5 || chance(rng, 0.4)) {
      return mcq(rng, {
        prompt: pick(rng, ['The arrow is closest to which number?', 'Which number is the arrow nearest?']),
        visual: { type: 'numberline', min: 0, max: 200, ticks: 10, labels: t === 4 ? [0, 50, 100, 150, 200] : [0, 200], arrow: v },
        correct: String(b), wrong: [0, 50, 100, 150, 200].filter((x) => x !== b).map(String),
        hint: 'Which mark is the arrow nearest? The middle of the line is halfway to the end. Halfway again on each side gives two more marks. Count the ticks to the nearest one.',
        explain: `The arrow is at about ${v}. That is closest to ${b}.`,
        explainVisual: { type: 'numberline', min: 0, max: 200, ticks: 10, labels: [0, 50, 100, 150, 200], arrow: v },
      });
    }
    const lo = pick(rng, [0, 50, 100, 150]), hi = lo + 50;
    let x = randInt(rng, lo + 3, hi - 3);
    if (Math.abs(x - (lo + 25)) < 3) x = lo + pick(rng, [8, 42]);
    const near = x - lo < hi - x ? lo : hi;
    return mcq(rng, {
      prompt: `Is ${x} closer to ${lo} or ${hi}?`, correct: String(near), wrong: [String(near === lo ? hi : lo)], count: 2,
      hint: `Is ${x} nearer to ${lo} or ${hi}? The halfway point is ${lo + 25}. Is ${x} before or after halfway?`,
      hintVisual: { type: 'numberline', min: lo, max: hi, ticks: 5, labels: [lo, lo + 25, hi], marks: [{ value: x, label: String(x) }] },
      explain: `${x} is ${Math.abs(x - near)} from ${near} but ${Math.abs(x - (near === lo ? hi : lo))} from ${near === lo ? hi : lo}. It is closer to ${near}.`,
      explainVisual: { type: 'numberline', min: lo, max: hi, ticks: 5, labels: [lo, lo + 25, hi], marks: [{ value: x, label: String(x) }] },
    });
  }],
  // Nearest ten and distance
  [4, 6, (t, rng) => {
    let n = randInt(rng, 11, t === 4 ? 99 : 199);
    if (n % 10 === 5 || n % 10 === 0) n += 2;
    const down = Math.floor(n / 10) * 10, up = down + 10;
    const near = n - down < up - n ? down : up;
    const vis = { type: 'numberline', min: down, max: up, ticks: 1, labels: [down, up], marks: [{ value: n, label: String(n) }] };
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: `Which ten is ${n} closest to?`, visual: t === 4 ? vis : undefined, correct: String(near),
        wrong: [String(near === down ? up : down), String(near === down ? down - 10 : up + 10), String(n % 10 >= 5 ? down : up + 10)].filter((x) => x !== String(near)),
        hint: `Find the ten just below ${n} and the ten just above it. Count the jumps from ${n} to each. Fewer jumps means nearer.`, hintVisual: vis,
        explain: `${n} is ${Math.abs(n - near)} away from ${near}, and ${Math.abs(n - (near === down ? up : down))} away from ${near === down ? up : down}. It is closest to ${near}.`,
        explainVisual: vis,
      });
    }
    return mcn(rng, {
      prompt: `How far is ${n} from the nearest ten?`, visual: t === 4 ? vis : undefined, correct: Math.abs(n - near),
      wrong: [10 - Math.abs(n - near), Math.abs(n - near) + 1, near, n % 10], min: 0, max: 9,
      hint: `First find the nearest ten: the ten just below or just above ${n}. Then count the jumps from ${n} to that ten.`, hintVisual: vis, explain: `The nearest ten is ${near}. ${n} is ${Math.abs(n - near)} away.`, explainVisual: vis,
    });
  }],
  // Estimation
  [4, 5, (t, rng) => {
    const th = pick(rng, THINGS);
    const n = randInt(rng, t === 4 ? 18 : 25, t === 4 ? 30 : 45);
    const near = Math.round(n / 10) * 10;
    return mcq(rng, {
      prompt: pick(rng, [`About how many ${th.many}? Pick the best estimate.`, `Estimate! About how many ${th.many}?`]),
      visual: { type: 'objects', items: [{ icon: th.icon, count: n }], layout: 'scatter' },
      correct: `about ${near}`, wrong: [`about ${near >= 30 ? near - 20 : near + 30}`, `about ${near + 60}`, `about ${Math.max(5, Math.round(near / 4))}`, `about ${near * 5}`].filter((x) => x !== `about ${near}`),
      hint: `An estimate is a close guess, not an exact count. Picture a group of ten ${th.many}. About how many groups of ten are there?`,
      explain: `There are ${n}. The best estimate is about ${near}.`,
    });
  }],
  // Numbers as labels
  [4, 5, (t, rng) => {
    const n = randInt(rng, 3, 99);
    const [lab, li] = pick(rng, LABELS);
    const amts = sample(rng, AMOUNTS, 3);
    const k = kid(rng);
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: 'Which number is a name or label, not an amount?', correct: `${li} ${k.name}'s ${lab} is ${n}.`,
        wrong: amts.map(([a, ai]) => `${ai} ${k.name} has ${n} ${a}.`),
        hint: 'An amount tells how many, like 5 apples. A label is a number used as a name, like a jersey or bus number. It does not tell how many. Check each sentence.',
        explain: `A ${lab} names something. It does not tell how many.`,
      });
    }
    const labs = sample(rng, LABELS, 3);
    const [a, ai] = pick(rng, AMOUNTS);
    return mcq(rng, {
      prompt: 'Which number tells how many?', correct: `${ai} ${k.name} has ${n} ${a}.`,
      wrong: labs.map(([l, i]) => `${i} ${k.name}'s ${l} is ${n}.`),
      hint: 'An amount tells how many, like 5 apples. A label is a number used as a name, like a jersey or bus number. It does not tell how many. Check each sentence.', explain: `"${n} ${a}" tells how many. The others are labels.`,
    });
  }],
  // Challenge: combine ideas
  [6, 7, (t, rng) => {
    const v = randInt(rng, 0, 2);
    if (v === 0) {
      const tt = randInt(rng, 0, t === 6 ? 7 : 8), o = randInt(rng, 10, 19);
      const n = 100 + tt * 10 + o;
      return mcn(rng, {
        prompt: `What number is ${tHO(1, tt, o)}?`, correct: n, wrong: [100 + tt * 10 + (o - 10), 1000 + tt * 100 + o, n + 10, 100 + tt + o], max: 9999,
        hint: `${oW(o)} is too many ones! Trade 10 ones for 1 ten. Now you have 1 hundred, ${tW(tt + 1)} and ${oW(o - 10)}.`, explain: `${oW(o)} = 1 ten and ${oW(o - 10)}. So it is 1 hundred, ${tW(tt + 1)} and ${oW(o - 10)}: ${n}.`,
      });
    }
    if (v === 1) {
      const n = randInt(rng, 51, t === 6 ? 99 : 196);
      const o = n % 10;
      const even = n % 2 === 0;
      const lo = n - randInt(rng, 1, 3), hi = n + randInt(rng, 1, 3);
      let cands = [];
      for (let x = lo + 1; x < hi; x++) if (x % 2 === n % 2 && x % 10 === o) cands.push(x);
      if (cands.length !== 1) return numq({ prompt: `I am ${even ? 'even' : 'odd'}. I am between ${n - 1} and ${n + 1}. What number am I?`, answer: n, hint: `Say the numbers from ${n - 1} to ${n + 1}. Which one is in the middle?`, explain: `${n} is between ${n - 1} and ${n + 1}.` });
      return mcn(rng, {
        prompt: `I am ${even ? 'even' : 'odd'}. I am between ${lo} and ${hi}. My ones digit is ${o}. What number am I?`,
        correct: n, wrong: [n + 1, n - 1, n + 10, rev2(n) > 0 ? rev2(n) : n - 10], min: 0, max: 999,
        hint: `List the numbers between ${lo} and ${hi}. Cross out the ones that do not end in ${o}. Check that the one left is ${even ? 'even' : 'odd'}.`, explain: `Between ${lo} and ${hi}, the ${even ? 'even' : 'odd'} number ending in ${o} is ${n}.`,
      });
    }
    const T = randInt(rng, 11, 19), o = randInt(rng, 1, 9); // stays within 200
    const n = T * 10 + o;
    return mcn(rng, {
      prompt: `What number is ${tW(T)} and ${oW(o)}?`, correct: n, wrong: [T + o, 100 * T + o, n + 10, n - 10], max: 9999,
      hint: `10 tens make 1 hundred. So ${T} tens is 1 hundred and ${tW(T - 10)}. Then add ${oW(o)}.`, explain: `${tW(T)} is ${T * 10}. Add ${oW(o)}: ${n}.`, explainVisual: b10(n),
    });
  }],
]);

// ---------------------------------------------------------------------------
// g2-qpv-fractions (halves, thirds, fourths)
// ---------------------------------------------------------------------------
const FR2 = { '1/2': 'one half', '2/2': 'one whole', '1/3': 'one third', '2/3': 'two thirds', '3/3': 'one whole', '1/4': 'one fourth', '2/4': 'two fourths', '3/4': 'three fourths', '4/4': 'one whole' };
const PARTNAME = { 2: 'halves', 3: 'thirds', 4: 'fourths' };
const FOODS = [['🍕', 'pizza'], ['🥪', 'sandwich'], ['🍰', 'cake'], ['🥞', 'pancake'], ['🍫', 'chocolate bar'], ['🥧', 'pie'], ['🧇', 'waffle'], ['🍉', 'watermelon'], ['🍪', 'big cookie'], ['🌯', 'wrap']];
const FCOL = ['red', 'blue', 'green', 'orange', 'purple', 'teal', 'pink', 'yellow'];
function fracVis(rng, parts, shaded, kind, color) {
  const c = color || pick(rng, FCOL);
  return (kind || pick(rng, ['circle', 'bar'])) === 'circle' ? { type: 'fractioncircle', parts, shaded, color: c } : { type: 'fractionbar', bars: [{ parts, shaded, color: c }] };
}
const fval = (s, p) => s / p;
// Foods that read naturally for amounts past one whole ("five thirds of pizza", not "five thirds of a pizza").
const MASS_FOODS = ['pizza', 'cake', 'pie', 'watermelon', 'lasagna'];
const countWord = (n, d) => `${numWords(n)} ${n === 1 ? { 2: 'half', 3: 'third', 4: 'fourth' }[d] : PARTNAME[d]}`;

const g2Fractions = F([
  // How many equal parts?
  [1, 2, (t, rng) => {
    const parts = pick(rng, t === 1 ? [2, 3, 4] : [2, 3, 4, 6]);
    return mcn(rng, {
      prompt: pick(rng, ['How many equal parts?', 'Count the equal parts.']), visual: fracVis(rng, parts, randInt(rng, 0, 1)),
      correct: parts, wrong: [parts + 1, parts - 1, parts * 2], min: 1, max: 12,
      hint: 'How many same-size pieces is the shape cut into? Put your finger on one piece. Count each piece once.', explain: `There are ${parts} equal parts.${PARTNAME[parts] ? ` They are ${PARTNAME[parts]}.` : ''}`,
    });
  }],
  // Which is cut into ...?
  [1, 3, (t, rng) => {
    const target = pick(rng, [2, 3, 4]);
    const kind = pick(rng, ['circle', 'bar']), color = pick(rng, FCOL);
    const others = sample(rng, [2, 3, 4, 5, 6].filter((p) => p !== target), 3);
    return visq(rng, {
      prompt: `Which one is cut into ${PARTNAME[target]}?`,
      items: [target, ...others].map((p, i) => ({ visual: fracVis(rng, p, 0, kind, color), correct: i === 0 })),
      hint: `Halves are 2 equal parts, thirds are 3, and fourths are 4. Count the parts in each picture. Which one is cut into ${PARTNAME[target]}?`, explain: `${cap(PARTNAME[target])} are ${target} equal parts.`,
      explainVisual: fracVis(rng, target, 0, kind, color),
    });
  }],
  // Name the shaded part
  [1, 4, (t, rng) => {
    const opts = t === 1 ? [[2, 1], [3, 1], [4, 1]] : [[2, 1], [3, 1], [3, 2], [4, 1], [4, 2], [4, 3], [3, 3]];
    const [p, s] = pick(rng, opts);
    const name = FR2[`${s}/${p}`];
    const all = ['one half', 'one third', 'two thirds', 'one fourth', 'two fourths', 'three fourths', 'one whole'];
    const wrong = all.filter((x) => x !== name && !(p === 4 && s === 2 && x === 'one half') && !(p === 2 && s === 1 && x === 'two fourths'));
    const pref = wrong.filter((x) => x.includes(PARTNAME[p].slice(0, -1)) || x.startsWith(numWords(s)));
    return mcq(rng, {
      prompt: pick(rng, ['What part is shaded?', 'How much is coloured in?', 'Name the shaded part.']), visual: fracVis(rng, p, s),
      correct: name, wrong: [...shuffle(rng, pref), ...shuffle(rng, wrong)].filter((x, i, a) => a.indexOf(x) === i).slice(0, 3),
      hint: 'First count all the equal parts. Halves are 2 equal parts, thirds are 3, and fourths are 4. Then count the shaded parts and say that number first. If every part is shaded, it is one whole.',
      explain: s === p ? `All ${p} parts are shaded. That is one whole.` : `${p} equal parts, ${s} shaded: ${name}.`,
    });
  }],
  // Which shows ...?
  [2, 4, (t, rng) => {
    const [p, s] = pick(rng, [[2, 1], [3, 1], [3, 2], [4, 1], [4, 3]]);
    const pool = [[2, 1], [3, 1], [3, 2], [4, 1], [4, 2], [4, 3], [3, 0], [2, 2], [5, 1]].filter(([pp, ss]) => fval(ss, pp) !== fval(s, p));
    const kind = pick(rng, ['circle', 'bar']), color = pick(rng, FCOL);
    const name = FR2[`${s}/${p}`];
    return visq(rng, {
      prompt: `Which shows ${name} shaded?`,
      items: [[p, s], ...sample(rng, pool, 3)].map(([pp, ss], i) => ({ visual: fracVis(rng, pp, ss, kind, color), correct: i === 0 })),
      hint: `${cap(name)} means ${p} equal parts with ${s} shaded. In each picture, count all the parts, then count the shaded parts.`, explain: `${cap(name)} means the whole has ${p} equal parts and ${s} ${s === 1 ? 'is' : 'are'} shaded.`,
      explainVisual: fracVis(rng, p, s, kind, color),
    });
  }],
  // Part of a set
  [3, 6, (t, rng) => {
    const d = pick(rng, t === 3 ? [2, 3] : [2, 3, 4]);
    const each = randInt(rng, 2, t === 3 ? 4 : 5);
    const n = d * each;
    const th = pick(rng, THINGS);
    const k = kid(rng);
    const many = t === 6 && d > 2 && chance(rng, 0.5) ? d - 1 : 1;
    const ans = each * many;
    const fname = many === 1 ? `one ${{ 2: 'half', 3: 'third', 4: 'fourth' }[d]}` : countWord(many, d);
    return mcn(rng, {
      prompt: pick(rng, [`What is ${fname} of ${n} ${th.many}?`, `${k.name} has ${n} ${th.many}. ${k.P} gives away ${fname} of them. How many is that?`]),
      visual: { type: 'objects', items: [{ icon: th.icon, count: n }], layout: 'row' },
      correct: ans, wrong: [n - ans, each + 1, d, n / 2 === ans ? ans + 1 : n / 2, ans + each], min: 1, max: 30,
      hint: `${cap(fname)} of ${n}: share the ${n} ${th.many} into ${numWords(d)} equal groups, one at a time. Then count ${many === 1 ? 'one group' : `${numWords(many)} groups`}.`,
      explain: `${n} shared into ${d} equal groups is ${each} in each group. ${cap(fname)} is ${many === 1 ? '1 group' : `${many} groups`}: ${ans}.`,
      explainVisual: { type: 'fractionset', total: n, shaded: ans, icon: th.icon },
    });
  }],
  // Compare sizes
  [3, 6, (t, rng) => {
    const [a, b] = sample(rng, [2, 3, 4], 2);
    const [icon, food] = pick(rng, FOODS);
    const v = randInt(rng, 0, 2);
    const nm = (d) => `one ${{ 2: 'half', 3: 'third', 4: 'fourth' }[d]}`;
    if (v === 0) {
      const big = chance(rng, 0.5);
      const ans = big ? Math.min(a, b) : Math.max(a, b);
      return mcq(rng, {
        prompt: `Which piece of ${food} is ${big ? 'bigger' : 'smaller'}: ${nm(a)} or ${nm(b)}?`,
        visual: t <= 4 ? { type: 'fractionbar', bars: [{ parts: a, shaded: 1 }, { parts: b, shaded: 1 }] } : undefined,
        correct: nm(ans), wrong: [nm(ans === a ? b : a), 'They are the same'], count: 3,
        hint: `Picture the same ${food} cut into ${a} pieces and into ${b} pieces. More pieces means each piece is smaller. Fewer pieces means each piece is bigger.`,
        explain: `${cap(nm(Math.min(a, b)))} is bigger than ${nm(Math.max(a, b))}, because the whole is cut into fewer parts.`,
      });
    }
    if (v === 1) {
      const [k, m] = twoKids(rng);
      return mcq(rng, {
        prompt: `${k.name} eats ${nm(a)} of a ${food} ${icon}. ${m.name} eats ${nm(b)} of the same size ${food}. Who eats more?`,
        correct: a < b ? k.name : m.name, wrong: [a < b ? m.name : k.name, 'The same'], count: 3,
        hint: `${k.name}'s piece comes from cutting the ${food} into ${a} parts. ${m.name}'s comes from cutting it into ${b} parts. Fewer parts means bigger pieces. Who has the bigger piece?`, explain: `${cap(nm(Math.min(a, b)))} is a bigger piece than ${nm(Math.max(a, b))}. ${a < b ? k.name : m.name} eats more.`,
        explainVisual: { type: 'fractionbar', bars: [{ parts: a, shaded: 1, label: k.name }, { parts: b, shaded: 1, label: m.name }] },
      });
    }
    const most = chance(rng, 0.5);
    return mcq(rng, {
      prompt: most ? 'Which is the biggest piece?' : 'Which is the smallest piece?',
      visual: { type: 'fractionbar', bars: shuffle(rng, [2, 3, 4]).map((p) => ({ parts: p, shaded: 1 })) },
      correct: nm(most ? 2 : 4), wrong: [nm(3), nm(most ? 4 : 2)], count: 3,
      hint: `All the bars are the same size. The more parts a bar is cut into, the smaller each part. Which bar has the ${most ? 'fewest' : 'most'} parts?`, explain: 'One half > one third > one fourth when the wholes are the same size.',
    });
  }],
  // How many parts make a whole?
  [3, 6, (t, rng) => {
    const d = pick(rng, [2, 3, 4]);
    const w = t >= 5 ? randInt(rng, 1, t === 6 ? 3 : 2) : 1;
    const [icon, food] = pick(rng, FOODS);
    return mcn(rng, {
      prompt: `How many ${PARTNAME[d]} make ${w === 1 ? 'one whole' : `${w} whole`} ${food}${w > 1 ? 's' : ''}? ${icon}`, speak: `How many ${PARTNAME[d]} make ${w === 1 ? 'one whole' : `${numWords(w)} whole`} ${food}${w > 1 ? 's' : ''}?`,
      visual: t <= 4 ? fracVis(rng, d, 0) : undefined, correct: d * w, wrong: [d * w + 1, d, d * w - 1, 2 * w + d], min: 1, max: 20,
      hint: `${cap(PARTNAME[d])} are named for how many equal parts make one whole. Count the parts in one whole${w > 1 ? `, then add that again for each of the ${w} wholes` : ''}.`,
      hintVisual: t > 4 ? fracVis(rng, d, 0) : undefined,
      explain: w === 1 ? `${cap(countWord(d, d))} make one whole.` : `Each whole has ${d} ${PARTNAME[d]}. ${Array(w).fill(d).join(' + ')} = ${d * w}.`,
    });
  }],
  // Counting past one whole
  [4, 7, (t, rng) => {
    const d = pick(rng, t === 4 ? [4] : [3, 4]);
    const start = randInt(rng, 1, d);
    const seq = [start, start + 1, start + 2].map((n) => countWord(n, d));
    const ans = start + 3;
    if (chance(rng, 0.5) || t === 4) {
      return mcq(rng, {
        prompt: pick(rng, [`Count by ${PARTNAME[d]}: ${seq.join(', ')}, … What comes next?`, `${kid(rng).name} counts ${pick(rng, FOODS)[1]} pieces: ${seq.join(', ')}, … What comes next?`]),
        visual: { type: 'numberline', min: 0, max: 2, ticks: 1 / d, labels: [0, 1, 2], marks: [start, start + 1, start + 2].map((n) => ({ value: n / d })) },
        correct: countWord(ans, d), wrong: [countWord(ans - 1, d), countWord(ans + 1, d), countWord(1, d), countWord(ans, d === 3 ? 4 : 3)],
        hint: `Each step adds one more ${d === 3 ? 'third' : 'fourth'}. What comes one step after ${seq[2]}? You can go past 1 whole!`,
        explain: `${seq.join(', ')}, ${countWord(ans, d)}.${ans > d ? ` That is more than 1 whole.` : ans === d ? ' That is one whole.' : ''}`,
      });
    }
    const n = randInt(rng, d + 1, 2 * d - 1);
    return mcq(rng, {
      prompt: 'How much is shaded?', visual: { type: 'fractionbar', bars: [{ parts: d, shaded: d }, { parts: d, shaded: n - d }] },
      correct: countWord(n, d), wrong: [countWord(n - d, d), countWord(n + 1, d), countWord(d, d), countWord(n - 1, d)],
      hint: `Each bar is one whole cut into ${PARTNAME[d]}. Count the shaded ${PARTNAME[d]} in the first bar, then keep counting on in the second bar.`,
      explain: `${d} ${PARTNAME[d]} in the first bar and ${n - d} in the second: ${countWord(n, d)}. That is 1 whole and ${countWord(n - d, d)}.`,
    });
  }],
  // Past one: more or less than a whole, wholes and parts
  [5, 7, (t, rng) => {
    const d = pick(rng, [3, 4]);
    if (chance(rng, 0.5) || t === 5) {
      const n = randInt(rng, 1, 2 * d);
      const rel = n < d ? 'Less than 1 whole' : n === d ? 'Equal to 1 whole' : 'More than 1 whole';
      return mcq(rng, {
        prompt: pick(rng, [`Is ${countWord(n, d)} more or less than 1 whole?`, `${kid(rng).name} has ${countWord(n, d)} of ${pick(rng, MASS_FOODS)}. Is that more or less than 1 whole?`]), correct: rel,
        wrong: ['Less than 1 whole', 'Equal to 1 whole', 'More than 1 whole'].filter((x) => x !== rel), count: 3,
        hint: `${cap(countWord(d, d))} make 1 whole. Compare ${countWord(n, d)} with that. Fewer ${PARTNAME[d]} is less than a whole. More is more. The same is equal.`,
        explain: `${cap(countWord(d, d))} make 1 whole. ${cap(countWord(n, d))} is ${rel.toLowerCase()}.`,
        explainVisual: { type: 'numberline', min: 0, max: 2, ticks: 1 / d, labels: [0, 1, 2], arrow: n / d },
      });
    }
    const n = randInt(rng, d + 1, 2 * d - 1);
    return mcn(rng, {
      prompt: pick(rng, [`${cap(countWord(n, d))} = 1 whole and how many ${PARTNAME[d]}?`, `${kid(rng).name} ate ${countWord(n, d)} of ${pick(rng, MASS_FOODS)}. That is 1 whole and how many ${PARTNAME[d]}?`]), correct: n - d, wrong: [n, d, n - d + 1, n - d - 1], min: 0, max: 12,
      hint: `One whole is ${countWord(d, d)}. Take those away from ${countWord(n, d)}. How many ${PARTNAME[d]} are left?`,
      explain: `${cap(countWord(d, d))} make 1 whole. ${n} − ${d} = ${n - d}. So ${countWord(n, d)} = 1 whole and ${countWord(n - d, d)}.`,
      explainVisual: { type: 'fractionbar', bars: [{ parts: d, shaded: d }, { parts: d, shaded: n - d }] },
    });
  }],
  // Sharing story
  [4, 6, (t, rng) => {
    const [icon, food] = pick(rng, FOODS);
    const k = kid(rng);
    const people = pick(rng, [2, 3, 4]);
    const friends = people - 1;
    const tricky = t >= 5 && chance(rng, 0.6);
    const name = `one ${{ 2: 'half', 3: 'third', 4: 'fourth' }[people]}`;
    return mcq(rng, {
      prompt: tricky ? `${k.name} shares a ${food} ${icon} equally with ${friends} friend${friends > 1 ? 's' : ''}. What part does each person get?`
        : `${people} friends share a ${food} ${icon} equally. What part does each get?`,
      correct: name, wrong: ['one half', 'one third', 'one fourth', 'one whole'].filter((x) => x !== name),
      hint: tricky ? `Count everyone sharing: ${k.name} plus ${friends} friend${friends > 1 ? 's' : ''}. That is how many equal parts. Halves are 2 equal parts, thirds are 3, and fourths are 4.` : `Count the people sharing: that is how many equal parts. Halves are 2 equal parts, thirds are 3, and fourths are 4.`,
      explain: `${people} people share, so the ${food} is cut into ${people} equal parts. Each gets ${name}.`,
      explainVisual: { type: 'fractioncircle', parts: people, shaded: 1 },
    });
  }],
  // The size of the whole matters: a third or fourth of a big set can be more than half of a small set
  [6, 7, (t, rng) => {
    const [a, b] = twoKids(rng);
    const d = pick(rng, [3, 4]);
    const nm = `one ${d === 3 ? 'third' : 'fourth'}`;
    const th = pick(rng, THINGS);
    const partA = randInt(rng, 2, t === 6 ? 4 : d === 4 ? 5 : 6), partB = pick(rng, [partA - 1, partA - 1, partA - 2, partA + 1, partA].filter((x) => x >= 1));
    const nA = d * partA, nB = 2 * partB;
    const correct = partA === partB ? 'They get the same' : partA > partB ? a.name : b.name;
    return mcq(rng, {
      prompt: `${a.name} gets ${nm} of ${nA} ${th.many}. ${b.name} gets one half of ${nB} ${th.many}. Who gets more?`,
      visual: { type: 'compare', left: { icon: th.icon, count: nA }, right: { icon: th.icon, count: nB } },
      correct, wrong: [a.name, b.name, 'They get the same'].filter((x) => x !== correct), count: 3,
      hint: `Find each share. Share ${nA} into ${d} equal groups. Share ${nB} into 2 equal groups. Then compare one group from each.`,
      explain: `${cap(nm)} of ${nA} is ${partA}. One half of ${nB} is ${partB}. ${partA === partB ? 'They are the same.' : `${Math.max(partA, partB)} is more.`} A half is not always bigger: it depends on the size of the whole.`,
      explainVisual: { type: 'fractionset', total: nA, shaded: partA, icon: th.icon },
    });
  }],
  // Same number of pieces, different size
  [6, 7, (t, rng) => {
    const v = randInt(rng, 0, 2);
    if (v === 0) {
      const n = pick(rng, [1, 2]);
      return mcq(rng, {
        prompt: `Which is more: ${countWord(n, 3)} or ${countWord(n, 4)} of the same whole?`, correct: countWord(n, 3), wrong: [countWord(n, 4), 'They are the same'], count: 3,
        hint: `Both have the same number of pieces. Which pieces are bigger: thirds (3 in a whole) or fourths (4 in a whole)? Bigger pieces make more. Use the pictures to check.`, explain: `Thirds are bigger than fourths, so ${countWord(n, 3)} is more.`,
        explainVisual: { type: 'fractionbar', bars: [{ parts: 3, shaded: n }, { parts: 4, shaded: n }] },
      });
    }
    if (v === 1) {
      return mcq(rng, {
        prompt: 'Which is the same as one half?', visual: { type: 'fractionbar', bars: [{ parts: 2, shaded: 1 }, { parts: 4, shaded: 2 }] },
        correct: 'two fourths', wrong: ['one fourth', 'one third', 'two thirds'],
        hint: 'Look at the two bars. How many fourths line up with one half? Check each choice against the bars.', explain: 'One half covers the same amount as two fourths.',
      });
    }
    const d = pick(rng, [3, 4]);
    const n = randInt(rng, 1, d - 1);
    return mcn(rng, {
      prompt: `${cap(countWord(n, d))} of a ${pick(rng, FOODS)[1]} ${n === 1 ? 'is' : 'are'} eaten. How many more ${PARTNAME[d]} make the whole thing?`, visual: { type: 'fractioncircle', parts: d, shaded: n },
      correct: d - n, wrong: [d, n, d - n + 1, d + n], min: 0, max: 12,
      hint: `A whole has ${countWord(d, d)}, and ${countWord(n, d)} ${n === 1 ? 'is' : 'are'} eaten. Count the pieces that are not shaded in the picture.`, explain: `${n} + ${d - n} = ${d}. ${cap(countWord(d - n, d))} more makes one whole.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// g2-qpv-count
// ---------------------------------------------------------------------------
const LINE_ANIMALS = ['🐶', '🐱', '🐰', '🐸', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐵', '🦉', '🐧'];
const ANIMAL_NAME = { '🐶': 'dog', '🐱': 'cat', '🐰': 'bunny', '🐸': 'frog', '🦊': 'fox', '🐻': 'bear', '🐼': 'panda', '🐨': 'koala', '🐯': 'tiger', '🦁': 'lion', '🐮': 'cow', '🐷': 'pig', '🐵': 'monkey', '🦉': 'owl', '🐧': 'penguin' };
const ORDS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

const g2Count = F([
  // Ordinals in a line
  [1, 3, (t, rng) => {
    const len = t === 1 ? 5 : randInt(rng, 7, 10);
    const row = sample(rng, LINE_ANIMALS, len);
    const i = randInt(rng, 0, len - 1);
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: `Start at the left. Who is ${ORDS[i]}?`, visual: { type: 'pattern', items: row },
        correct: row[i], wrong: [row[i - 1], row[i + 1], row[len - 1 - i]].filter((x) => x && x !== row[i]),
        hint: `Start at the left end. Touch each animal and say first, second, third… Stop when you say ${ORDS[i]}.`, explain: `Counting from the left, ${row[i]} is ${ORDS[i]}.`,
      });
    }
    return mcq(rng, {
      prompt: `Start at the left. What place is the ${row[i]}?`, speak: `Start at the left. What place is the ${ANIMAL_NAME[row[i]]}?`, visual: { type: 'pattern', items: row },
      correct: ORDS[i], wrong: [ORDS[i - 1], ORDS[i + 1], ORDS[len - 1 - i], ORDS[i + 2]].filter((x) => x && x !== ORDS[i]),
      hint: `Start at the left end. Touch each animal and say first, second, third… until you reach the ${ANIMAL_NAME[row[i]]}.`, explain: `The ${row[i]} is ${ORDS[i]} from the left.`,
    });
  }],
  // Count forward/back by 1s
  [1, 4, (t, rng) => {
    const back = chance(rng, 0.45);
    let s;
    if (t === 1) s = randInt(rng, 10, 50);
    else if (t === 2) s = randInt(rng, 40, 120);
    else if (t === 3) s = back ? 100 + randInt(rng, 1, 2) + 10 * randInt(rng, 0, 9) : 10 * randInt(rng, 10, 19) - randInt(rng, 2, 3);
    else s = back ? pick(rng, [101, 102, 103, 111, 112, 151, 161, 191, 201]) : pick(rng, [97, 98, 107, 108, 117, 147, 187, 196, 197]);
    const d = back ? -1 : 1;
    const seq = [0, 1, 2, 3].map((i) => s + i * d);
    const hole = t >= 3 ? randInt(rng, 0, 3) : 3;
    const ans = seq[hole];
    const q = {
      prompt: back ? 'Count back by 1s. What number is missing?' : 'Count on by 1s. What number is missing?',
      visual: { type: 'pattern', items: seq.map((x, i) => (i === hole ? '?' : x)) },
      hint: `The numbers go ${back ? 'down' : 'up'} by one each time. Read them out loud and say the number that fits the ? spot.${t >= 3 ? ' Careful when you cross a ten or a hundred!' : ''}`,
      hintVisual: { type: 'numberline', min: Math.min(...seq) - 1, max: Math.max(...seq) + 1, ticks: 1, labels: 'ends' },
      explain: `${seq.join(', ')}. The missing number is ${ans}.`,
    };
    if (t >= 2 && chance(rng, 0.35)) return numq({ ...q, answer: ans });
    return mcn(rng, { ...q, correct: ans, wrong: t === 1 ? [ans + d, ans - d, ans + 10, ans - 10] : [ans + d, ans - d, ans === 100 ? 1000 : ans + 10, ans >= 100 ? ans - 90 : ans - 10, ans + 100], min: 0, max: t === 1 ? 70 : 999 });
  }],
  // Skip counting
  [2, 5, (t, rng) => {
    const back = t >= 4 && chance(rng, 0.35);
    let step, start;
    if (t === 2) { step = pick(rng, [2, 5, 10]); start = 0; }
    else if (t === 3) { step = pick(rng, [10, 10, 2, 5]); start = step === 10 ? randInt(rng, 1, 9) + 10 * randInt(rng, 0, 5) : step === 2 ? pick(rng, [0, 1]) + 2 * randInt(rng, 0, 20) : 5 * randInt(rng, 0, 12); }
    else { step = pick(rng, [2, 5, 10]); start = step === 10 ? randInt(rng, 1, 99) : step === 5 ? 5 * randInt(rng, 5, 30) : randInt(rng, 20, 180); }
    const len = 5;
    if (back) start = start + step * (len - 1);
    const seq = Array.from({ length: len }, (_, i) => start + (back ? -1 : 1) * i * step);
    if (Math.max(...seq) > 200 || Math.min(...seq) < 0) {
      const off = Math.max(...seq) > 200 ? Math.max(...seq) - 200 : Math.min(...seq);
      for (let i = 0; i < len; i++) seq[i] -= Math.ceil(off / step) * step;
    }
    const hole = t <= 3 ? len - 1 : randInt(rng, 0, len - 1);
    const ans = seq[hole];
    return mcn(rng, {
      prompt: `Count ${back ? 'back ' : ''}by ${step}s. What number is missing?`, visual: { type: 'pattern', items: seq.map((x, i) => (i === hole ? '?' : x)) },
      correct: ans, wrong: [ans + 1, ans - 1, ans + step, ans - step, ans + 10], min: 0, max: 999,
      hint: `Each number is ${numWords(step)} ${back ? 'less' : 'more'} than the one before. ${hole === 0 ? `Work backwards from ${seq[1]}.` : `Start at ${seq[hole - 1]} and ${back ? 'count back' : 'jump'} ${numWords(step)}.`}`,
      explain: `Counting ${back ? 'back ' : ''}by ${step}s: ${seq.join(', ')}. The missing number is ${ans}.`,
    });
  }],
  // 10 more / 10 less
  [2, 5, (t, rng) => {
    const more = chance(rng, 0.5);
    let n;
    if (t === 2) n = randInt(rng, 11, 89);
    else if (t === 3) n = randInt(rng, 10, 99);
    else n = more ? randInt(rng, 90, 190) : randInt(rng, 100, 115);
    const ans = more ? n + 10 : n - 10;
    const k = kid(rng);
    const th = pick(rng, THINGS);
    const prompt = t === 5 && chance(rng, 0.5)
      ? (more ? `${k.name} has ${n} ${th.many}. ${k.P} gets 10 more. How many now?` : `${k.name} has ${n} ${th.many}. ${k.P} gives 10 away. How many now?`)
      : `What is 10 ${more ? 'more' : 'less'} than ${n}?`;
    const q = {
      prompt, visual: t === 2 ? { type: 'hundredchart', highlight: [n] } : undefined,
      hint: t === 2 ? `Find ${n} on the chart. Ten ${more ? 'more is one row down' : 'less is one row up'}, in the same column.` : `Ten ${more ? 'more' : 'less'}: the tens digit goes ${more ? 'up' : 'down'} by one, and the ones digit stays the same. Careful when you cross a hundred!`,
      explain: `10 ${more ? 'more' : 'less'} than ${n} is ${ans}.`,
      explainVisual: t === 2 ? { type: 'hundredchart', highlight: [n, ans] } : { type: 'numberline', min: Math.min(n, ans), max: Math.max(n, ans), ticks: 1, labels: 'ends', jumps: [{ from: n, to: ans, label: more ? '+10' : '−10' }] },
    };
    if (t >= 3 && chance(rng, 0.4)) return numq({ ...q, answer: ans });
    return mcn(rng, { ...q, correct: ans, wrong: [more ? n + 1 : n - 1, more ? n - 10 : n + 10, ans + 1, n + 100], min: 0, max: 999 });
  }],
  // Two before / after
  [3, 5, (t, rng) => {
    const after = chance(rng, 0.5);
    let n = t === 3 ? randInt(rng, 20, 150) : pick(rng, [99, 100, 101, 109, 110, 119, 120, 189, 190, 198, 199, 200, 29, 30, 70, 71]);
    if (after && n > 198) n = 198;
    if (!after && n < 2) n = 2;
    const ans = after ? n + 2 : n - 2;
    const q = {
      prompt: `What number is 2 ${after ? 'after' : 'before'} ${n}?`, hint: `Count ${after ? 'on' : 'back'} two from ${n}. The first step is ${after ? n + 1 : n - 1}. Take one more step.`,
      explain: `${n}, ${after ? n + 1 : n - 1}, ${ans}. The answer is ${ans}.`,
      explainVisual: { type: 'numberline', min: Math.min(n, ans) - 1, max: Math.max(n, ans) + 1, ticks: 1, labels: 'all' },
    };
    if (chance(rng, 0.4)) return numq({ ...q, answer: ans });
    return mcn(rng, { ...q, correct: ans, wrong: [after ? n - 2 : n + 2, after ? n + 1 : n - 1, after ? n + 20 : n - 20, ans + 10, ans - 10], min: 0, max: 999 });
  }],
  // Ordering
  [3, 6, (t, rng) => {
    const k = t >= 5 ? 4 : 3;
    const set = new Set();
    if (chance(rng, 0.6)) { const a = randInt(rng, 1, 9), b = randInt(rng, 1, 9); if (a !== b) { set.add(100 + 10 * a + b); set.add(100 + 10 * b + a); } }
    while (set.size < k) set.add(randInt(rng, t === 3 ? 20 : 60, 200));
    const nums = [...set];
    const asc = nums.slice().sort((x, y) => x - y);
    const up = chance(rng, 0.5);
    const right = up ? asc : asc.slice().reverse();
    const perms = [right.slice().reverse(), [right[1], right[0], ...right.slice(2)], [...right.slice(0, -2), right[k - 1], right[k - 2]], shuffle(rng, right), [right[0], right[2], right[1], ...right.slice(3)]];
    return mcq(rng, {
      prompt: up ? 'Which list goes from least to greatest?' : 'Which list goes from greatest to least?',
      correct: right.join(', '), wrong: perms.map((a) => a.join(', ')),
      hint: `Find the ${up ? 'least' : 'greatest'} number first: compare hundreds, then tens, then ones. Then find the next one. Which list follows that order?`, explain: `${up ? 'Least to greatest' : 'Greatest to least'}: ${right.join(', ')}.`,
    });
  }],
  // Ordinal word problems
  [4, 6, (t, rng) => {
    const k = kid(rng);
    const place = randInt(rng, 2, 9);
    const total = randInt(rng, place + 1, 10);
    const line = pick(rng, ['line for the slide', 'line for lunch', 'race', 'line at the library', 'parade']);
    const v = randInt(rng, 0, t >= 5 ? 2 : 1);
    if (v === 0) {
      return mcn(rng, {
        prompt: `${k.name} is ${ORDS[place - 1]} in the ${line}. How many are in front of ${k.obj}?`, correct: place - 1, wrong: [place, place + 1, total - place], min: 0, max: 12,
        visual: { type: 'pattern', items: [...Array(place - 1).fill('🧒'), '⭐', ...Array(Math.max(0, total - place)).fill('🧒')] },
        hint: `In front means before ${k.name} in the line. Count the kids from the front, starting with first, and stop just before ${k.name}'s spot.`, explain: `${k.name} is ${ORDS[place - 1]}, so ${place - 1} ${place - 1 === 1 ? 'is' : 'are'} in front.`,
      });
    }
    if (v === 1) {
      return mcn(rng, {
        prompt: `${total} kids are in a ${line}. ${k.name} is ${ORDS[place - 1]}. How many are behind ${k.obj}?`, correct: total - place, wrong: [total - place + 1, place, place - 1, total - place - 1], min: 0, max: 12,
        hint: `Picture ${total} kids in a line with ${k.name} at spot ${place}. Count the kids after ${k.obj}, or take ${place} away from ${total}.`, explain: `${total} − ${place} = ${total - place} behind ${k.name}.`,
        explainVisual: { type: 'pattern', items: [...Array(place - 1).fill('🧒'), '⭐', ...Array(total - place).fill('🧒')] },
      });
    }
    return mcq(rng, {
      prompt: `${total} kids are in a ${line}. ${k.name} is ${ORDS[place - 1]} from the front. What place is ${k.p} from the back?`,
      correct: ORDS[total - place], wrong: [ORDS[place - 1], ORDS[total - place - 1], ORDS[total - place + 1]].filter(Boolean),
      hint: `Picture ${total} kids with ${k.name} at spot ${place} from the front. Now count from the back: the last kid is first from the back.`, explain: `There are ${total - place} kids behind ${k.name}. So ${k.p} is ${ORDS[total - place]} from the back.`,
      explainVisual: { type: 'pattern', items: [...Array(place - 1).fill('🧒'), '⭐', ...Array(total - place).fill('🧒')] },
    });
  }],
  // Challenge
  [6, 7, (t, rng) => {
    const v = randInt(rng, 0, t === 7 ? 3 : 2);
    if (v === 0) {
      const s = randInt(rng, 11, t === 6 ? 150 : 170), times = randInt(rng, 2, 3);
      const ans = s + 10 * times;
      return mcn(rng, {
        prompt: `Start at ${s}. Count on by 10s ${times} times. Where do you land?`, correct: ans, wrong: [s + times, ans + 10, ans - 10, s + 10], min: 0, max: 999,
        hint: `Each jump of ten adds one to the tens digit. Start at ${s} and jump ${times} times: ${steps(s, ans, 10)}`, explain: `${[s, ...Array.from({ length: times }, (_, i) => s + 10 * (i + 1))].join(', ')}. You land on ${ans}.`,
        explainVisual: { type: 'numberline', min: s, max: ans, ticks: 10, labels: 'all', jumps: Array.from({ length: times }, (_, i) => ({ from: s + 10 * i, to: s + 10 * (i + 1), label: '+10' })) },
      });
    }
    if (v === 1) {
      const n = randInt(rng, 20, 180), a = pick(rng, [1, 2]), more10 = chance(rng, 0.5), moreA = chance(rng, 0.5);
      const ans = n + (more10 ? 10 : -10) + (moreA ? a : -a);
      return mcn(rng, {
        prompt: `Start at ${n}. Go 10 ${more10 ? 'more' : 'less'}, then ${a} ${moreA ? 'more' : 'less'}. Where are you now?`, correct: ans,
        wrong: [n + (more10 ? 10 : -10), n + (more10 ? -10 : 10) + (moreA ? a : -a), ans + 1, ans - 1, n + (moreA ? a : -a)], min: 0, max: 999,
        hint: `Do one step at a time. First find ten ${more10 ? 'more' : 'less'} than ${n}. Then count ${moreA ? 'on' : 'back'} ${a}.`, explain: `10 ${more10 ? 'more' : 'less'} than ${n} is ${n + (more10 ? 10 : -10)}. Then ${a} ${moreA ? 'more' : 'less'} is ${ans}.`,
      });
    }
    if (v === 2) {
      const s = 2 * randInt(rng, 40, 95) + pick(rng, [0, 1]);
      const seq = [s, s - 2, s - 4, s - 6];
      return mcn(rng, {
        prompt: 'Count back by 2s. What comes next?', visual: { type: 'pattern', items: [...seq, '?'] },
        correct: s - 8, wrong: [s - 7, s - 9, s - 10, s - 6], min: 0, max: 999, hint: `Each number is two less than the one before. What is two less than ${s - 6}?`, explain: `${seq.join(', ')}, ${s - 8}.`,
      });
    }
    const pv = chance(rng, 0.5);
    if (pv) {
      const s = randInt(rng, 1, 9) + 10 * randInt(rng, 14, 16);
      const seq = [s, s + 10, s + 20];
      return mcn(rng, {
        prompt: 'Count by 10s. What comes next?', visual: { type: 'pattern', items: [...seq, '?'] }, correct: s + 30,
        wrong: [s + 21, s + 31, s + 40, s + 3], min: 0, max: 999, hint: `Counting by tens, the ones digit stays the same and the tens digit goes up by one. What is ten more than ${s + 20}?`, explain: `${seq.join(', ')}, ${s + 30}.`,
      });
    }
    // Count back by 5s from a multiple of 5 (counting by 25s is not a Grade 2 skip count)
    const s0 = 5 * randInt(rng, 12, 40);
    const seq = [s0, s0 - 5, s0 - 10, s0 - 15];
    return mcn(rng, {
      prompt: 'Count back by 5s. What comes next?', visual: { type: 'pattern', items: [...seq, '?'] }, correct: s0 - 20,
      wrong: [s0 - 25, s0 - 15, s0 - 19, s0 - 10], min: 0, max: 999,
      hint: `Each number is five less than the one before. What is five less than ${s0 - 15}? Careful when you cross a ten or a hundred.`, explain: `${seq.join(', ')}, ${s0 - 20}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// g2-ops-addsub (to 100)
// ---------------------------------------------------------------------------
function jumpsAdd(a, b) {
  const tens = Math.floor(b / 10), ones = b % 10;
  const jumps = [];
  let x = a;
  for (let i = 0; i < tens; i++) { jumps.push({ from: x, to: x + 10, label: '+10' }); x += 10; }
  if (ones) jumps.push({ from: x, to: x + ones, label: `+${ones}` });
  return { type: 'numberline', min: Math.floor(a / 10) * 10, max: Math.ceil((a + b) / 10) * 10, ticks: 10, labels: 'all', jumps };
}
function jumpsSub(a, b) {
  const tens = Math.floor(b / 10), ones = b % 10;
  const jumps = [];
  let x = a;
  for (let i = 0; i < tens; i++) { jumps.push({ from: x, to: x - 10, label: '−10' }); x -= 10; }
  if (ones) jumps.push({ from: x, to: x - ones, label: `−${ones}` });
  return { type: 'numberline', min: Math.floor((a - b) / 10) * 10, max: Math.ceil(a / 10) * 10, ticks: 10, labels: 'all', jumps };
}
function addWays(a, b) {
  const s = a + b;
  const bt = Math.floor(b / 10) * 10, bo = b % 10;
  return bt && bo ? `${a} + ${bt} = ${a + bt}. Then ${a + bt} + ${bo} = ${s}.` : `${a} + ${b} = ${s}.`;
}
function subWays(a, b) {
  const bt = Math.floor(b / 10) * 10, bo = b % 10;
  return bt && bo ? `${a} − ${bt} = ${a - bt}. Then ${a - bt} − ${bo} = ${a - b}.` : `${a} − ${b} = ${a - b}.`;
}
function noRegroupAdd(rng, maxSum) {
  let a, b;
  do { a = randInt(rng, 11, maxSum - 10); b = randInt(rng, 1, maxSum - a); } while ((a % 10) + (b % 10) >= 10);
  return [a, b];
}

function addHintBig(a, b) {
  const bt = Math.floor(b / 10) * 10, bo = b % 10;
  if (!bt) return `${a} + ${b}: start at ${a} and count on ${b}.`;
  if (!bo) return `${a} + ${b}: start at ${a} and count on by tens, ${numWords(bt / 10)} jump${bt > 10 ? 's' : ''} of ten.`;
  return `${a} + ${b}: add the tens first: ${a} + ${bt} = ${a + bt}. Then add the ${bo} ones${(a % 10) + bo >= 10 ? ', and watch for a new ten' : ''}.`;
}
function subHintBig(a, b) {
  const bt = Math.floor(b / 10) * 10, bo = b % 10;
  if (!bt) return `${a} − ${b}: start at ${a} and count back ${b}.`;
  if (!bo) return `${a} − ${b}: start at ${a} and count back by tens, ${numWords(bt / 10)} jump${bt > 10 ? 's' : ''} of ten.`;
  return `${a} − ${b}: first take away ${numWords(bt / 10)} ten${bt > 10 ? 's' : ''}, which leaves ${a - bt}. Then take away the ones.`;
}

function g2Story(rng, t) {
  const [k, m] = twoKids(rng);
  const th = pick(rng, THINGS);
  const types = t <= 4 ? ['join', 'sep', 'ppw', 'cmp'] : ['joinC', 'sepC', 'start', 'cmpB', 'cmpS', 'ppwP'];
  const type = pick(rng, types);
  const a = randInt(rng, 15, 60), b = randInt(rng, 8, Math.min(39, 100 - a)), c = a + b;
  const bar = (whole, parts, labels) => ({ type: 'barmodel', whole, parts, labels });
  const HINTS = {
    join: `${k.name} gets more, so add. ${addHintBig(a, b)}`,
    sep: `${k.name} gives some away, so subtract. ${subHintBig(c, b)}`,
    ppw: `Red and blue together make the whole, so add. ${addHintBig(a, b)}`,
    cmp: `"How many more" means the difference between ${c} and ${a}. Count up from ${a} to ${c}: first to the next ten, then by tens.`,
    joinC: `${a} and how many more make ${c}? Count up from ${a}: first to the next ten, then by tens, then the ones.`,
    sepC: `${k.name} went from ${c} down to ${a}. The difference is how many were used. Count up from ${a} to ${c}.`,
    start: `Work backwards: ${k.name} got ${b} more to reach ${c}, so take ${b} away from ${c}. ${subHintBig(c, b)}`,
    cmpB: `${k.name} has the same as ${m.name}, plus ${b} more. So add. ${addHintBig(a, b)}`,
    cmpS: `${m.name} has ${b} fewer, so take ${b} away from ${c}. ${subHintBig(c, b)}`,
    ppwP: `The whole is ${c}, and red is one part. Take the red away from the whole to find blue. ${subHintBig(c, a)}`,
  };
  const withH = (o) => ({ ...o, hint: HINTS[type] });
  switch (type) {
    case 'join': return withH({ prompt: `${k.name} has ${nOf(a, th)}. ${k.P} gets ${b} more. How many now?`, ans: c, wrong: [c + 10, c - 10, a - b > 0 ? a - b : c + 1], visual: bar('?', [a, b]), explain: `${addWays(a, b)} ${k.name} has ${c}.` });
    case 'sep': return withH({ prompt: `${k.name} has ${nOf(c, th)}. ${k.P} gives away ${b}. How many are left?`, ans: a, wrong: [c + b > 100 ? a + 10 : c + b, a + 10, a - 10], visual: bar(c, ['?', b]), explain: `${subWays(c, b)} ${a} are left.` });
    case 'ppw': { const cth = pick(rng, COLOURABLE); return withH({ prompt: `A box has ${a} red ${cth.many} and ${b} blue ${cth.many}. How many ${cth.many} in all?`, ans: c, wrong: [c + 10, c - 10, Math.abs(a - b)], visual: bar('?', [a, b], ['red', 'blue']), explain: `${addWays(a, b)}` }); }
    case 'cmp': return withH({ prompt: `${k.name} has ${nOf(c, th)}. ${m.name} has ${a}. How many more does ${k.name} have?`, ans: b, wrong: [c + a > 100 ? b + 10 : c + a, b + 10, b - 1 > 0 ? b - 1 : b + 2], visual: bar(undefined, [a, '?'], [m.name, 'more']), explain: `${subWays(c, a)} ${k.name} has ${b} more.` });
    case 'joinC': return withH({ prompt: `${k.name} had ${nOf(a, th)}. ${k.P} got some more. Now ${k.p} has ${c}. How many did ${k.p} get?`, ans: b, wrong: [c, c + a > 100 ? b + 10 : c + a, b + 10, b - 10 > 0 ? b - 10 : b + 1], visual: bar(c, [a, '?']), explain: `${a} + □ = ${c}. ${subWays(c, a)} ${k.P} got ${b}.` });
    case 'sepC': return withH({ prompt: `${k.name} had ${nOf(c, th)}. ${k.P} used some. Now ${k.p} has ${a}. How many did ${k.p} use?`, ans: b, wrong: [a, c, b + 10, b + 1], visual: bar(c, [a, '?']), explain: `${c} − □ = ${a}. ${subWays(c, a)} ${k.P} used ${b}.` });
    case 'start': return withH({ prompt: `${k.name} had some ${th.many}. ${k.P} got ${b} more. Now ${k.p} has ${c}. How many did ${k.p} have at first?`, ans: a, wrong: [c + b > 100 ? a + 10 : c + b, a + 10, a - 10, b], visual: bar(c, ['?', b]), explain: `□ + ${b} = ${c}. ${subWays(c, b)} ${k.P} had ${a} at first.` });
    case 'cmpB': return withH({ prompt: `${m.name} has ${nOf(a, th)}. ${k.name} has ${b} more than ${m.name}. How many does ${k.name} have?`, ans: c, wrong: [a - b > 0 ? a - b : c + 10, c + 10, c - 10, b], visual: bar(undefined, [a, b], [m.name, 'more']), explain: `${addWays(a, b)} ${k.name} has ${c}.` });
    case 'cmpS': return withH({ prompt: `${k.name} has ${nOf(c, th)}. ${m.name} has ${b} fewer than ${k.name}. How many does ${m.name} have?`, ans: a, wrong: [c + b > 100 ? a + 10 : c + b, a + 10, a - 10, b], visual: bar(c, ['?', b], [m.name, 'fewer']), explain: `${subWays(c, b)} ${m.name} has ${a}.` });
    default: { const cth = pick(rng, COLOURABLE); return withH({ prompt: `There are ${c} ${cth.many}. ${a} are red. The rest are blue. How many are blue?`, ans: b, wrong: [c, b + 10, b - 1 > 0 ? b - 1 : b + 1, c + a > 100 ? a : c + a], visual: bar(c, [a, '?'], ['red', 'blue']), explain: `${a} + □ = ${c}. ${subWays(c, a)} ${b} are blue.` }); }
  }
}

const g2AddSub = F([
  // Add tens and ones (no regrouping) with a number line
  [1, 2, (t, rng) => {
    let a, b;
    if (t === 1 && chance(rng, 0.5)) { a = 10 * randInt(rng, 1, 6); b = 10 * randInt(rng, 1, 9 - a / 10); }
    else [a, b] = noRegroupAdd(rng, t === 1 ? 60 : 99);
    return mcn(rng, {
      prompt: `${a} + ${b} = ?`, visual: jumpsAdd(a, b), correct: a + b, wrong: [a + b + 10, a + b - 10, a + b + 1, a + b - 1], min: 0, max: 200,
      hint: addHintBig(a, b), explain: addWays(a, b),
    });
  }],
  // Subtract (no regrouping)
  [1, 3, (t, rng) => {
    let a, b;
    if (t === 1 && chance(rng, 0.5)) { a = 10 * randInt(rng, 3, 9); b = 10 * randInt(rng, 1, a / 10 - 1); }
    else { do { a = randInt(rng, 25, 99); b = randInt(rng, 11, a - 5); } while ((b % 10) > (a % 10)); }
    const q = { prompt: `${a} − ${b} = ?`, visual: t <= 2 ? jumpsSub(a, b) : undefined, hint: subHintBig(a, b), explain: subWays(a, b), explainVisual: jumpsSub(a, b) };
    if (t === 3 && chance(rng, 0.5)) return numq({ ...q, answer: a - b });
    return mcn(rng, { ...q, correct: a - b, wrong: [a - b + 10, a - b - 10, a + b, a - b + 1], min: 0, max: 200 });
  }],
  // With regrouping (keypad)
  [3, 4, (t, rng) => {
    if (chance(rng, 0.5)) {
      let a, b;
      do { a = randInt(rng, 15, 79); b = randInt(rng, 6, 100 - a); } while ((a % 10) + (b % 10) < 10);
      return numq({ prompt: `${a} + ${b} = ?`, answer: a + b, hint: addHintBig(a, b), explain: addWays(a, b), explainVisual: jumpsAdd(a, b) });
    }
    let a, b;
    do { a = randInt(rng, 31, 99); b = randInt(rng, 6, a - 5); } while ((b % 10) <= (a % 10));
    return numq({ prompt: `${a} − ${b} = ?`, answer: a - b, hint: `${subHintBig(a, b)} Or count up from ${b} to ${a}.`, explain: subWays(a, b), explainVisual: jumpsSub(a, b) });
  }],
  // Choosing a strategy
  [3, 5, (t, rng) => {
    const v = randInt(rng, 0, 2);
    if (v === 0) {
      const a = 10 * randInt(rng, 2, 7) + pick(rng, [8, 9]), b = randInt(rng, 12, 95 - a);
      const up = Math.ceil(a / 10) * 10, d = up - a;
      return mcq(rng, {
        prompt: `Which is the same as ${a} + ${b}?`, correct: `${up} + ${b - d}`,
        wrong: [`${up} + ${b}`, `${up} + ${b + d}`, `${up - 10} + ${b - d}`, `${a} + ${b - d}`].filter((x) => x !== `${up} + ${b - d}`),
        hint: `Move ${d} from ${b} over to ${a}. Then ${a} becomes ${up}, and ${b} becomes ${d} less. The total stays the same. Which choice shows that?`,
        explain: `${a} + ${d} = ${up}, and ${b} − ${d} = ${b - d}. So ${a} + ${b} = ${up} + ${b - d} = ${a + b}.`,
      });
    }
    if (v === 1) {
      const k = kid(rng);
      const a = randInt(rng, 21, 68), b = randInt(rng, 12, 99 - a);
      const bt = Math.floor(b / 10) * 10, bo = b % 10;
      if (!bo) return numq({ prompt: `${a} + ${b} = ?`, answer: a + b, hint: addHintBig(a, b), explain: `${a} + ${b} = ${a + b}.` });
      return mcn(rng, {
        prompt: `${k.name} adds ${a} + ${b}. First ${a} + ${bt} = ${a + bt}. Then ${a + bt} + ${bo} = ?`,
        correct: a + b, wrong: [a + bt, a + b + 10, a + bt + bo * 10 > 200 ? a + b - 1 : a + bt + bo * 10, a + b - 1], min: 0, max: 200,
        hint: `The tens are done. Now add the ${bo} ones: start at ${a + bt} and count on ${bo}.`, explain: addWays(a, b), explainVisual: jumpsAdd(a, b),
      });
    }
    const a = randInt(rng, 45, 99), b = pick(rng, [19, 29, 39].filter((x) => x < a - 5));
    const r = b + 1;
    return mcq(rng, {
      prompt: `Which is a smart way to do ${a} − ${b}?`, correct: `${a} − ${r} + 1`,
      wrong: [`${a} − ${r} − 1`, `${a} + ${r} − 1`, `${a} − ${b - 9} + 1`],
      hint: `${b} is one less than ${r}, and ${r} is easy to take away. But taking ${r} takes away one too many. Test each choice: which one takes ${r} away and then fixes the extra one?`,
      explain: `${a} − ${r} = ${a - r}. You took 1 too many, so add 1 back: ${a - b}.`,
    });
  }],
  // Story problems
  [4, 5, (t, rng) => {
    const s = g2Story(rng, t);
    const q = { prompt: s.prompt, visual: t === 4 || chance(rng, 0.5) ? s.visual : undefined, hint: s.hint, explain: s.explain, explainVisual: s.visual };
    if (chance(rng, 0.3)) return numq({ ...q, answer: s.ans });
    return mcn(rng, { ...q, correct: s.ans, wrong: s.wrong, min: 0, max: 200 });
  }],
  // Missing addend / subtrahend
  [5, 6, (t, rng) => {
    const a = randInt(rng, 12, 70), b = randInt(rng, 8, 99 - a), c = a + b;
    const v = randInt(rng, 0, 2);
    const forms = [[`${a} + □ = ${c}`, b], [`□ + ${b} = ${c}`, a], [`${c} − □ = ${a}`, b]];
    const [prompt, ans] = forms[v];
    return numq({ prompt, answer: ans, hint: 'Is the box a part or the whole? For the whole, add the two parts. For a part, take the other part away from the whole. You can count up in tens and ones.', explain: `${a} + ${b} = ${c}, so the box is ${ans}.`, explainVisual: { type: 'barmodel', whole: c, parts: [a, b] } });
  }],
  // Two-step and three addends
  [6, 7, (t, rng) => {
    const k = kid(rng);
    const th = pick(rng, THINGS);
    const v = randInt(rng, 0, t === 7 ? 3 : 2);
    if (v === 0) {
      const cth = pick(rng, COLOURABLE);
      const a = randInt(rng, 15, 40), b = randInt(rng, 12, 40), c = randInt(rng, 8, a + b - 5);
      return mcn(rng, {
        prompt: `${k.name} has ${a} red and ${b} blue ${cth.many}. ${k.P} gives away ${c}. How many are left?`, correct: a + b - c,
        wrong: [a + b, a + b + c, a + b - c + 10, a + b - c - 10], min: 0, max: 200,
        hint: `Two steps. First add the red and blue: ${a} + ${b}. Then take away the ${c} given away.`, explain: `${a} + ${b} = ${a + b}. ${a + b} − ${c} = ${a + b - c}.`,
      });
    }
    if (v === 1) {
      const a = randInt(rng, 11, 35), b = randInt(rng, 11, 35), c = randInt(rng, 5, 99 - a - b > 5 ? 99 - a - b : 6);
      return mcn(rng, {
        prompt: chance(rng, 0.5) ? `${a} + ${b} + ${c} = ?` : `${k.name} reads ${a} pages, then ${b}, then ${c}. How many pages in all?`,
        correct: a + b + c, wrong: [a + b, a + b + c + 10, a + b + c - 10, b + c], min: 0, max: 200,
        hint: 'Look for two numbers that are easy to add first, like ones digits that make ten. Add those, then add the last number.', explain: `${a} + ${b} = ${a + b}. ${a + b} + ${c} = ${a + b + c}.`,
      });
    }
    if (v === 2) {
      const b = randInt(rng, 11, 89);
      return numq({ prompt: `100 − ${b} = ?`, answer: 100 - b, hint: b % 10 ? `Count up from ${b} to the next ten, ${Math.ceil(b / 10) * 10}. Then count up by tens to 100. Add your jumps together.` : `Count up by tens from ${b} to 100.`, explain: `${b} + ${Math.ceil(b / 10) * 10 - b} = ${Math.ceil(b / 10) * 10}. ${Math.ceil(b / 10) * 10} + ${100 - Math.ceil(b / 10) * 10} = 100. So 100 − ${b} = ${100 - b}.` });
    }
    if (chance(rng, 0.5)) {
      // Make 100 (Grade 2 adds to 100, so no sums past 100 here)
      const a = randInt(rng, 11, 89);
      const up = Math.ceil(a / 10) * 10;
      return numq({
        prompt: `${a} + □ = 100`, answer: 100 - a,
        hint: a % 10 ? `Count up from ${a} to the next ten, ${up}. Then count up by tens to 100. Add your jumps together.` : `Count up by tens from ${a} to 100.`,
        explain: a % 10 ? `${a} + ${up - a} = ${up}. ${up} + ${100 - up} = 100. So the box is ${100 - a}.` : `${a} + ${100 - a} = 100. So the box is ${100 - a}.`,
      });
    }
    const a = randInt(rng, 15, 40), found = randInt(rng, 10, 30), lost = randInt(rng, 5, 15);
    const now = a + found - lost;
    return mcn(rng, {
      prompt: `${k.name} had ${a} ${th.many}. ${k.P} found some, then lost ${lost}. Now ${k.p} has ${now}. How many did ${k.p} find?`,
      correct: found, wrong: [now - a > 0 ? now - a : found + 10, found + lost, found + 10, found - 1], min: 0, max: 200,
      hint: `Work backwards. Before losing ${lost}, ${k.name} had ${now} + ${lost}. How many more than ${a} is that?`, explain: `${now} + ${lost} = ${now + lost}. ${now + lost} − ${a} = ${found}. ${k.P} found ${found}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// g2-ops-facts (to 20)
// ---------------------------------------------------------------------------
function factExplain(a, b) {
  const s = a + b;
  if (a === b) return `${a} + ${a} is a double: ${s}.`;
  if (Math.abs(a - b) === 1) { const m = Math.min(a, b); return `Near double: ${m} + ${m} = ${2 * m}, and 1 more is ${s}.`; }
  if (a === 10 || b === 10) return `10 and ${oW(s - 10)} make ${s}.`;
  if (s > 10) { const big = Math.max(a, b), small = Math.min(a, b), need = 10 - big; return `Make 10: ${big} + ${need} = 10, then ${small - need} more is ${s}.`; }
  return `${a} + ${b} = ${s}.`;
}
function addHint(a, b) {
  const big = Math.max(a, b), small = Math.min(a, b);
  if (a + b > 10 && big >= 6 && big < 10) return `${a} + ${b}: make ten first. ${big} needs ${10 - big} more to make ten. Take that from ${small}, then add what is left.`;
  if (a === b) return `${a} + ${b} is a double: two groups of ${a}. Do you know it? If not, start at ${a} and count on ${a}.`;
  if (Math.abs(a - b) === 1) return `${a} + ${b} is almost a double. Think ${small} + ${small} first, then add 1 more.`;
  const st = steps(big, a + b);
  return `${a} + ${b}: start at the bigger number, ${big}. Count on ${small} more${st ? ': ' + st : '.'}`;
}
const subHint = (s, b) => `${s} − ${b}: think "${b} plus what makes ${s}?" Count up from ${b} to ${s}.`;
const coreTxt = (core) => core.map(tokName).join(', ');

const g2Facts = F([
  // Within 10 with a picture
  [1, 2, (t, rng) => {
    const s = randInt(rng, 4, 10), a = randInt(rng, 1, s - 1), b = s - a;
    const sub = chance(rng, 0.4);
    const q = {
      prompt: sub ? `${s} − ${b} = ?` : `${a} + ${b} = ?`,
      visual: t === 1 ? (sub ? { type: 'tenframe', count: s, frames: 1 } : { type: 'tenframe', count: a, count2: b, frames: 1 }) : undefined,
      hint: sub ? subHint(s, b) : addHint(a, b),
      explain: sub ? `${b} + ${a} = ${s}, so ${s} − ${b} = ${a}.` : factExplain(a, b),
    };
    if (t === 2 || chance(rng, 0.4)) return numq({ ...q, answer: sub ? a : s });
    return mcn(rng, { ...q, correct: sub ? a : s, wrong: sub ? [s + b, a + 1, a - 1] : [s + 1, s - 1, Math.abs(a - b)], min: 0, max: 20 });
  }],
  // Doubles and near doubles
  [2, 4, (t, rng) => {
    const n = randInt(rng, 2, 10);
    const near = t >= 3 && chance(rng, 0.5) && n < 10;
    const [a, b] = near ? shuffle(rng, [n, n + 1]) : [n, n];
    return numq({
      prompt: `${a} + ${b} = ?`, answer: a + b, visual: t === 2 ? { type: 'tenframe', count: a, count2: b } : undefined,
      hint: addHint(a, b), explain: factExplain(a, b),
    });
  }],
  // Addition to 20
  [3, 5, (t, rng) => {
    const a = randInt(rng, 3, 10), b = randInt(rng, Math.max(2, 11 - a), 10);
    return numq({ prompt: `${a} + ${b} = ?`, answer: a + b, hint: addHint(a, b), explain: factExplain(a, b), explainVisual: { type: 'tenframe', count: a, count2: b } });
  }],
  // Subtraction to 20
  [3, 6, (t, rng) => {
    const s = randInt(rng, 11, 20), b = randInt(rng, Math.max(2, s - 10), Math.min(10, s - 1)), a = s - b;
    return numq({
      prompt: `${s} − ${b} = ?`, answer: a, hint: b < 10 && s - 10 < b ? `${s} − ${b}: take away ${s - 10} first to get down to ten. Then take away the rest of the ${b}.` : subHint(s, b),
      hintVisual: { type: 'numberline', min: 0, max: 20, ticks: 1, labels: [0, 10, 20] },
      explain: `${b} + ${a} = ${s}, so ${s} − ${b} = ${a}.`,
      explainVisual: { type: 'numberline', min: 0, max: 20, ticks: 1, labels: [0, 5, 10, 15, 20], jumps: [{ from: s, to: a, label: `−${b}` }] },
    });
  }],
  // Strategy questions
  [4, 6, (t, rng) => {
    const v = randInt(rng, 0, 2);
    if (v === 0) {
      const s = randInt(rng, 11, 18), b = randInt(rng, s - 9, 9), a = s - b;
      return mcq(rng, {
        prompt: `To solve ${s} − ${b}, which addition fact helps?`, correct: `${b} + ${a} = ${s}`,
        wrong: [`${b} + ${a + 1} = ${s + 1}`, `${s} + ${b} = ${s + b}`, `${a} + ${a} = ${2 * a}`, `${b} + ${b} = ${2 * b}`].filter((x) => x !== `${b} + ${a} = ${s}`),
        hint: `A helpful fact uses the same three numbers as ${s} − ${b}. Look for a + fact with ${b} and ${s} in it, and check that it is true.`, explain: `${b} + ${a} = ${s}, so ${s} − ${b} = ${a}.`,
      });
    }
    if (v === 1) {
      const n = randInt(rng, 4, 9);
      return mcq(rng, {
        prompt: `Which double helps with ${n} + ${n + 1}?`, correct: `${n} + ${n}`, wrong: [`${n + 1} + ${n + 2}`, `${n - 1} + ${n - 1}`, `${n} + 10`],
        hint: `A double adds a number to itself, like 2 + 2. Which double is only 1 away from ${n} + ${n + 1}? Test each choice.`, explain: `${n} + ${n} = ${2 * n}. ${n} + ${n + 1} is 1 more: ${2 * n + 1}.`,
      });
    }
    const a = randInt(rng, 7, 9), b = randInt(rng, 11 - a, 9), need = 10 - a;
    return mcq(rng, {
      prompt: `Make 10 to solve ${a} + ${b}. Which is the same?`, correct: `10 + ${b - need}`,
      wrong: [`10 + ${b}`, `10 + ${b - need + 1}`, `${a} + 10`].filter((x) => x !== `10 + ${b - need}`),
      hint: `${a} needs ${need} more to make ten. Take ${need} from ${b}. What is left of ${b}? Find the choice that is 10 plus that.`, explain: `${a} + ${need} = 10. ${b} − ${need} = ${b - need}. 10 + ${b - need} = ${a + b}.`,
      explainVisual: { type: 'tenframe', count: a, count2: b },
    });
  }],
  // Missing numbers
  [5, 7, (t, rng) => {
    const s = randInt(rng, 11, 20), a = randInt(rng, Math.max(2, s - 10), Math.min(10, s - 2)), b = s - a;
    const forms = [[`□ + ${b} = ${s}`, a], [`${a} + □ = ${s}`, b], [`${s} − □ = ${a}`, b], [`□ − ${b} = ${a}`, s]];
    const [prompt, ans] = pick(rng, t === 5 ? forms.slice(0, 3) : forms);
    return numq({ prompt, answer: ans, hint: 'Is the box a part or the whole? For the whole, add the two parts. For a part, take the other part away from the whole.', explain: `${a} + ${b} = ${s}. The box is ${ans}.`, explainVisual: { type: 'numberbond', whole: s, parts: [a, b] } });
  }],
  // Related facts
  [6, 7, (t, rng) => {
    const a = randInt(rng, 4, 10), b = randInt(rng, Math.max(3, 11 - a), 10), s = a + b;
    if (a === b) return numq({ prompt: `${s} − ${a} = ?`, answer: a, hint: `${s} − ${a}: which double makes ${s}?`, explain: `${a} + ${a} = ${s}.` });
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: `${a} + ${b} = ${s}. Which is also true?`, correct: `${s} − ${a} = ${b}`,
        wrong: [`${s} − ${a} = ${b + 1}`, `${a} − ${b} = ${s}`, `${s} + ${a} = ${b}`, `${b} − ${a} = ${s}`].filter((x) => x !== `${s} − ${a} = ${b}`),
        hint: `${a} + ${b} = ${s} uses three numbers. A related fact uses the same three numbers, with ${s} as the whole. Check each choice: is it true?`, explain: `If ${a} + ${b} = ${s}, then ${s} − ${a} = ${b}.`,
      });
    }
    const pairs = [[a, b]];
    const wrong = [[a, b + 1], [a - 1, b], [a + 1, b + 1], [a - 2, b + 1]].filter(([x, y]) => x > 0 && y > 0 && x + y !== s).map(([x, y]) => `${x} + ${y}`);
    return mcq(rng, {
      prompt: `Which pair makes ${s}?`, correct: `${pairs[0][0]} + ${pairs[0][1]}`, wrong,
      hint: `Add each pair. Use a double or make ten. Which pair adds up to exactly ${s}?`, explain: `${a} + ${b} = ${s}.`,
    });
  }],
  // Three numbers
  [6, 7, (t, rng) => {
    const a = randInt(rng, 2, 9), b = 10 - a, c = randInt(rng, 1, t === 6 ? 8 : 10);
    const order = shuffle(rng, [a, b, c]);
    if (t === 7 && chance(rng, 0.5)) {
      const x = randInt(rng, 6, 10), y = randInt(rng, 3, 9), z = randInt(rng, 2, x + y - 1);
      return numq({ prompt: `${x} + ${y} − ${z} = ?`, answer: x + y - z, hint: `Work from left to right. First add ${x} + ${y}. Then take away ${z}.`, explain: `${x} + ${y} = ${x + y}. ${x + y} − ${z} = ${x + y - z}.` });
    }
    return numq({ prompt: `${order[0]} + ${order[1]} + ${order[2]} = ?`, answer: a + b + c, hint: 'Look for two numbers that make ten. Add those first, then add the last number.', explain: `${a} + ${b} = 10. 10 + ${c} = ${10 + c}.` });
  }],
]);

// ---------------------------------------------------------------------------
// g2-pat-patterns
// ---------------------------------------------------------------------------
const PSHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'hexagon'];
const EMOJI_SETS = [['🐶', '🐱', '🐰', '🐸', '🦊'], ['🍎', '🍌', '🍇', '🍓', '🍊'], ['🌞', '🌙', '⭐', '☁️', '🌈'], ['🚗', '🚌', '🚲', '🚀', '🚂'], ['🦉', '🐉', '🦄', '🐢', '🐝'], ['⚽', '🏀', '🎾', '🏈', '⚾']];
function patVals(rng, attr, k) {
  if (attr === 'colour') { const s = pick(rng, PSHAPES); return sample(rng, PCOL, k).map((c) => ({ shape: s, color: c })); }
  if (attr === 'shape') { const c = pick(rng, PCOL); return sample(rng, PSHAPES, k).map((s) => ({ shape: s, color: c })); }
  if (attr === 'both') { const ss = sample(rng, PSHAPES, k), cc = sample(rng, PCOL, k); return ss.map((s, i) => ({ shape: s, color: cc[i] })); }
  if (attr === 'sizecolour') { const s = pick(rng, PSHAPES); const cc = sample(rng, PCOL, k); const zz = ['s', 'l', 's', 'l']; return cc.map((c, i) => ({ shape: s, color: c, size: zz[i] })); }
  return sample(rng, pick(rng, EMOJI_SETS), k);
}
const coreOf = (str, vals) => str.split('').map((ch) => vals[ch.charCodeAt(0) - 65]);
const seqOf = (core, len) => Array.from({ length: len }, (_, i) => core[i % core.length]);
const isEmoji = (tok) => typeof tok === 'string';
const tokKey = (tok) => JSON.stringify(tok);
const tokVisual = (tok) => (isEmoji(tok) ? { type: 'pattern', items: [tok] } : { type: 'shapes', items: [tok] });
const tokName = (tok) => (isEmoji(tok) ? tok : `${tok.size === 's' ? 'small ' : tok.size === 'l' ? 'big ' : ''}${tok.color} ${tok.shape}`);
function mixToks(rng, vals) {
  const v = vals[0];
  if (isEmoji(v)) { const set = EMOJI_SETS.find((s) => s.includes(v)); return shuffle(rng, set.filter((e) => !vals.includes(e))); }
  const out = [];
  for (const a of vals) for (const b of vals) if (a !== b) { out.push({ ...a, color: b.color }); out.push({ ...a, shape: b.shape }); if (a.size) out.push({ ...a, size: b.size }); }
  for (const c of PCOL) out.push({ ...v, color: c });
  return shuffle(rng, out).filter((x) => !vals.some((y) => tokKey(y) === tokKey(x)));
}
function tokenChoice(rng, o) {
  const seen = new Set([tokKey(o.answer)]);
  const wrong = [];
  for (const d of o.others) { const k = tokKey(d); if (!seen.has(k) && wrong.length < 3) { seen.add(k); wrong.push(d); } }
  if (isEmoji(o.answer)) return mcq(rng, { ...o, correct: o.answer, wrong });
  return visq(rng, { ...o, items: [{ visual: tokVisual(o.answer), correct: true }, ...wrong.map((w) => ({ visual: tokVisual(w), correct: false }))] });
}
const G2_CORES = ['ABC', 'AABC', 'ABBC', 'ABCC', 'ABCD', 'AABB', 'ABAC'];
function attr2(rng, t) {
  if (t === 1) return pick(rng, ['colour', 'shape', 'emoji']);
  return pick(rng, ['both', 'both', 'sizecolour', 'emoji', 'colour', 'shape']);
}
const LETTERS = (str, len) => seqOf(str.split(''), len).join(' ');

const g2Patterns = F([
  // What comes next (repeating)
  [1, 5, (t, rng) => {
    const coreStr = pick(rng, t === 1 ? ['ABC', 'AABB', 'AAB'] : G2_CORES);
    const vals = patVals(rng, attr2(rng, t), new Set(coreStr).size);
    const core = coreOf(coreStr, vals);
    const shown = coreStr.length * 2 + randInt(rng, 0, coreStr.length - 1);
    const seq = seqOf(core, shown + 1);
    const ans = seq[shown];
    return tokenChoice(rng, {
      prompt: pick(rng, ['What comes next?', 'Keep the pattern going. What is next?', 'What comes next in the pattern?']),
      visual: { type: 'pattern', items: [...seq.slice(0, shown), '?'], highlightCore: t === 1 ? coreStr.length : undefined },
      answer: ans, others: [...mixToks(rng, vals).slice(0, 2), ...vals.filter((v) => tokKey(v) !== tokKey(ans))],
      hint: `The core is ${coreTxt(core)}. Say the pattern from the start and keep going to the ? spot. Check colour, shape and size.`, explain: `The core is ${core.map(tokName).join(', ')}. Next is ${tokName(ans)}.`,
      explainVisual: { type: 'pattern', items: seq, highlightCore: coreStr.length },
    });
  }],
  // Growing pattern pictures
  [1, 4, (t, rng) => {
    const a = randInt(rng, 1, 4), d = randInt(rng, 1, t === 1 ? 2 : 4);
    const steps = [0, 1, 2, 3].map((i) => a + d * i);
    const next = steps[3];
    return mcn(rng, {
      prompt: pick(rng, ['How many in the next step?', 'This pattern grows. How many next?']),
      visual: { type: 'growing', steps, shape: pick(rng, ['square', 'dot', 'triangle']), blankLast: true },
      correct: next, wrong: [next + 1, next - 1, steps[2] + 1, next + d], min: 1, max: 40,
      hint: 'Count the shapes in each step you can see. How many more does each step add? Add that to the last step.', explain: `Each step adds ${d}: ${steps.join(', ')}.`,
    });
  }],
  // Increasing number patterns
  [3, 5, (t, rng) => {
    const step = pick(rng, t === 3 ? [2, 5, 10] : [2, 3, 4, 5, 10, 20]);
    const start = randInt(rng, t === 3 ? 0 : 10, t === 3 ? 60 : 200 - step * 5);
    const seq = [0, 1, 2, 3, 4].map((i) => start + i * step);
    const hole = t === 3 ? 4 : randInt(rng, 0, 4);
    const ans = seq[hole];
    if (t >= 4 && chance(rng, 0.35)) {
      return mcq(rng, {
        prompt: 'What is the pattern rule?', visual: { type: 'pattern', items: seq },
        correct: `Add ${step} each time`, wrong: [`Add ${step + 1} each time`, `Add ${step === 2 ? 1 : step - 1} each time`, `Take away ${step} each time`, `Add ${start} each time`].filter((x) => x !== `Add ${step} each time`),
        hint: 'Find the jump: how much bigger is the second number than the first? Check that the same jump works for every pair. "Take away" would make the numbers go down.', explain: `${seq[1]} − ${seq[0]} = ${step}. The rule is add ${step} each time.`,
      });
    }
    return mcn(rng, {
      prompt: 'What number is missing?', visual: { type: 'pattern', items: seq.map((x, i) => (i === hole ? '?' : x)) },
      correct: ans, wrong: [ans + 1, ans - 1, ans + step, ans - step, ans + 10], min: 0, max: 999,
      hint: hole === 0 ? `Find the jump between two numbers side by side. The ? is that much less than ${seq[1]}.` : `Find the jump between two numbers side by side. Add that jump to ${seq[hole - 1]}.`, explain: `The pattern adds ${step} each time: ${seq.join(', ')}.`,
    });
  }],
  // Missing term (repeating)
  [2, 5, (t, rng) => {
    const coreStr = pick(rng, G2_CORES);
    const vals = patVals(rng, attr2(rng, t), new Set(coreStr).size);
    const core = coreOf(coreStr, vals);
    const len = coreStr.length * 2 + 2;
    const seq = seqOf(core, len);
    const hole = randInt(rng, coreStr.length, len - 1);
    const ans = seq[hole];
    return tokenChoice(rng, {
      prompt: pick(rng, ['What is missing?', 'Which one goes in the ? spot?']),
      visual: { type: 'pattern', items: seq.map((x, i) => (i === hole ? '?' : x)) },
      answer: ans, others: [...mixToks(rng, vals).slice(0, 2), ...vals.filter((v) => tokKey(v) !== tokKey(ans))],
      hint: `The core is ${coreTxt(core)}. Say the pattern from the start and stop at the ? spot. What belongs there?`, explain: `The core is ${core.map(tokName).join(', ')}. The missing one is ${tokName(ans)}.`,
      explainVisual: { type: 'pattern', items: seq, highlightCore: coreStr.length },
    });
  }],
  // Core
  [2, 5, (t, rng) => {
    const coreStr = pick(rng, G2_CORES);
    const vals = patVals(rng, attr2(rng, t), new Set(coreStr).size);
    const core = coreOf(coreStr, vals);
    const seq = seqOf(core, coreStr.length * 2 + 1);
    const cands = [core.slice(0, -1), [...core, core[0]], core.slice(1), [...core.slice(0, -1), core[0]]].filter((c) => c.length > 1 && tokKey(c) !== tokKey(core));
    const uniq = [];
    for (const c of cands) if (!uniq.some((u) => tokKey(u) === tokKey(c))) uniq.push(c);
    return visq(rng, {
      prompt: pick(rng, ['What is the core of this pattern?', 'Which part repeats?']), visual: { type: 'pattern', items: seq },
      items: [{ visual: { type: 'pattern', items: core }, correct: true }, ...uniq.slice(0, 3).map((c) => ({ visual: { type: 'pattern', items: c }, correct: false }))],
      hint: 'The core is the part that repeats. Say the pattern out loud and listen for where it starts over from the beginning. Test each choice: if you repeat it over and over, does it make the whole pattern?', explain: `${cap(core.map(tokName).join(', '))} repeats. That is the core.`,
      explainVisual: { type: 'pattern', items: seq, highlightCore: coreStr.length },
    });
  }],
  // Translate: letters or same kind
  [4, 7, (t, rng) => {
    const coreStr = pick(rng, G2_CORES.concat(['AB', 'ABB']));
    const len = coreStr.length * 2;
    const vals = patVals(rng, attr2(rng, t), new Set(coreStr).size);
    const seq = seqOf(coreOf(coreStr, vals), len);
    const others = shuffle(rng, G2_CORES.concat(['AB', 'ABB', 'AAB']).filter((c) => LETTERS(c, len) !== LETTERS(coreStr, len)));
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: 'Which letters show this pattern?', visual: { type: 'pattern', items: seq }, correct: LETTERS(coreStr, len), wrong: others.map((c) => LETTERS(c, len)),
        hint: 'Give the first item the letter A, and write A each time it comes back. Each new item gets the next letter: B, then C, then D. Which choice matches your letters?', explain: `The pattern is ${LETTERS(coreStr, len)}.`,
      });
    }
    const mk = (c) => {
      const L = c.length * 2;
      return { type: 'pattern', items: seqOf(coreOf(c, patVals(rng, pick(rng, ['emoji', 'colour', 'shape']), new Set(c).size)), Math.max(L, 6)) };
    };
    return visq(rng, {
      prompt: 'Which pattern has the same core letters?', visual: { type: 'pattern', items: seq },
      items: [{ visual: mk(coreStr), correct: true }, ...others.slice(0, 3).map((c) => ({ visual: mk(c), correct: false }))],
      hint: 'Write each pattern in letters: A for the first thing, B for the next new thing, and so on. Which choice has the same letters as the top pattern?', explain: `Both have the core ${coreStr.split('').join(' ')}.`,
    });
  }],
  // Find the error
  [4, 7, (t, rng) => {
    if (chance(rng, 0.5)) {
      const step = pick(rng, [2, 5, 10, t >= 6 ? 3 : 5, t >= 6 ? 4 : 10]);
      const start = randInt(rng, 5, 150);
      const seq = [0, 1, 2, 3, 4, 5].map((i) => start + i * step);
      const pos = randInt(rng, 2, 4);
      const bad = seq.slice();
      bad[pos] = seq[pos] + pick(rng, [1, -1, 2]);
      return mcq(rng, {
        prompt: 'One number does not fit the pattern. Which one?', visual: { type: 'pattern', items: bad },
        correct: String(bad[pos]), wrong: bad.filter((_, i) => i !== pos).map(String),
        hint: 'Find the jump between the first two numbers. Check every jump after that. Which number breaks the pattern?', explain: `The pattern adds ${step}. ${seq[pos - 1]} + ${step} = ${seq[pos]}, not ${bad[pos]}.`,
      });
    }
    const coreStr = pick(rng, G2_CORES);
    const vals = patVals(rng, pick(rng, ['both', 'sizecolour', 'emoji']), new Set(coreStr).size);
    const core = coreOf(coreStr, vals);
    const len = coreStr.length * 2 + 2;
    const seq = seqOf(core, len);
    const pos = randInt(rng, coreStr.length + 1, len - 1);
    const wrongTok = pick(rng, mixToks(rng, vals).slice(0, 3).concat(vals.filter((v) => tokKey(v) !== tokKey(seq[pos]))).filter((v) => tokKey(v) !== tokKey(seq[pos])));
    const bad = seq.slice();
    bad[pos] = wrongTok;
    return mcq(rng, {
      prompt: 'One is a mistake. Count from the left. Which spot is wrong?', visual: { type: 'pattern', items: bad },
      correct: String(pos + 1), wrong: [pos, pos + 2, pos - 1, pos + 3].filter((x) => x >= 1 && x <= len && x !== pos + 1).map(String),
      hint: `The core at the start is ${coreTxt(core)}. Check each spot against it, counting from the left. Look at colour, shape and size.`, explain: `Spot ${pos + 1} should be ${tokName(seq[pos])}, not ${tokName(wrongTok)}.`,
      explainVisual: { type: 'pattern', items: seq, highlightCore: coreStr.length },
    });
  }],
  // Table of an increasing pattern
  [5, 7, (t, rng) => {
    const step = pick(rng, t === 5 ? [2, 5, 10] : [3, 4, 5, 10, 25]);
    const start = t === 7 && chance(rng, 0.5) ? randInt(rng, 1, 9) : step;
    const k = kid(rng);
    const th = pick(rng, THINGS);
    const unit = pick(rng, ['Day', 'Week']);
    const ask = t === 5 ? 5 : randInt(rng, 6, 7);
    const vals = [1, 2, 3, 4].map((i) => start + (i - 1) * step);
    const ans = start + (ask - 1) * step;
    if (ans > 200) return numq({ prompt: `${start}, ${start + step}, ${start + 2 * step}, … What comes next?`, answer: start + 3 * step, hint: `Each number is ${step} more. Add ${step} to ${start + 2 * step}.`, explain: `Add ${step} each time: ${start + 3 * step}.` });
    return mcn(rng, {
      prompt: `${k.name} collects ${th.many}. The table shows the pattern. How many on ${unit.toLowerCase()} ${ask}?`,
      visual: { type: 'table', headers: [unit, cap(th.many)], rows: [...vals.map((v, i) => [i + 1, v]), ...(ask === 5 ? [[5, '?']] : [])] },
      correct: ans, wrong: [ans + step, ans - step, vals[3] + step === ans ? ans + 1 : vals[3] + step, ans + 1], min: 0, max: 999,
      hint: `How many more ${th.many} each ${unit.toLowerCase()}? Find the jump between two rows. Keep adding it until ${unit.toLowerCase()} ${ask}.`, explain: `It goes up by ${step} each ${unit.toLowerCase()}: ${Array.from({ length: ask }, (_, i) => start + i * step).join(', ')}.`,
    });
  }],
  // Nth term of repeating pattern
  [6, 7, (t, rng) => {
    const coreStr = pick(rng, G2_CORES);
    const vals = patVals(rng, attr2(rng, t), new Set(coreStr).size);
    const core = coreOf(coreStr, vals);
    const n = randInt(rng, coreStr.length * 2 + 2, t === 6 ? 12 : 16);
    const ans = core[(n - 1) % core.length];
    return tokenChoice(rng, {
      prompt: `The pattern keeps going. What will be number ${n}?`, visual: { type: 'pattern', items: seqOf(core, coreStr.length * 2) },
      answer: ans, others: [...vals.filter((v) => tokKey(v) !== tokKey(ans)), ...mixToks(rng, vals)],
      hint: `The core has ${coreStr.length} items. Keep saying the pattern, touching one spot at a time, until you reach number ${n}. Or jump ahead a whole core at a time.`, explain: `Keep going to spot ${n}: it is ${tokName(ans)}.`,
      explainVisual: { type: 'pattern', items: seqOf(core, n), highlightCore: coreStr.length },
    });
  }],
]);

// ---------------------------------------------------------------------------
// g2-pat-unknown (unknowns anywhere, properties)
// ---------------------------------------------------------------------------
const g2Unknown = F([
  // Small unknowns with pictures
  [1, 2, (t, rng) => {
    const s = randInt(rng, t === 1 ? 4 : 8, t === 1 ? 10 : 15), a = randInt(rng, 1, Math.min(9, s - 1)), b = s - a;
    const left = chance(rng, 0.5);
    const prompt = left ? `□ + ${b} = ${s}` : `${a} + □ = ${s}`;
    const ans = left ? a : b;
    const visual = t === 1 ? { type: 'tenframe', count: left ? b : a, frames: s > 10 ? 2 : 1 } : { type: 'numberbond', whole: s, parts: left ? ['?', b] : [a, '?'] };
    return mcn(rng, {
      prompt, visual, correct: ans, wrong: [s, s + (left ? b : a), ans + 1, ans - 1], min: 0, max: 30,
      hint: t === 1 ? `How many more to make ${s}? Count up from ${left ? b : a} to ${s} on your fingers.` : `The whole is ${s} and one part is ${left ? b : a}. What goes with ${left ? b : a} to make ${s}? Count up from ${left ? b : a}.`,
      explain: `${a} + ${b} = ${s}, so the box is ${ans}.`,
    });
  }],
  // Adding or subtracting zero
  [1, 3, (t, rng) => {
    const n = randInt(rng, t === 1 ? 5 : 20, t === 1 ? 20 : 100);
    const v = randInt(rng, 0, 3);
    const forms = [[`${n} + 0 = □`, n], [`${n} − 0 = □`, n], [`□ + 0 = ${n}`, n], [`${n} − □ = ${n}`, 0]];
    const [prompt, ans] = forms[v];
    return mcn(rng, {
      prompt, correct: ans, wrong: v === 3 ? [n, 1, 2 * n] : [n + 1, n - 1, 0, n * 2], min: 0, max: 999,
      hint: 'Zero means nothing. Adding or taking away nothing does not change a number. Which number do you start with?', explain: `Zero changes nothing. The box is ${ans}.`,
    });
  }],
  // Turn-around property
  [2, 4, (t, rng) => {
    const a = randInt(rng, 3, t === 2 ? 9 : 60), b = randInt(rng, 3, t === 2 ? 9 : 39);
    if (a === b) return numq({ prompt: `${a} + ${b} = □ + ${a}`, answer: b, hint: 'Both sides add the same two numbers, in a different order. Which number is missing on the right side?', explain: `${a} + ${b} = ${b} + ${a}.` });
    if (chance(rng, 0.6)) {
      return mcn(rng, {
        prompt: `${a} + ${b} = ${b} + □`, correct: a, wrong: [b, a + b, a + 1, a - 1], min: 0, max: 200,
        hint: `Both sides add ${a} and ${b}, just in a different order. Order does not matter when you add, so no need to add! Which number is missing?`, explain: `${a} + ${b} and ${b} + ${a} are the same. The box is ${a}.`,
      });
    }
    const x = Math.max(a, b), y = Math.min(a, b);
    return mcq(rng, {
      prompt: `Is ${x} − ${y} the same as ${y} − ${x}?`, correct: 'No, order matters when you subtract', wrong: ['Yes, order does not matter', 'Yes, both are 0'], count: 3,
      hint: `For adding, order does not matter. For taking away, try it: can you take ${x} away from just ${y}? If not, the two are not the same.`, explain: `${x} − ${y} = ${x - y}. But you cannot take ${x} away from just ${y}. Order matters when you subtract.`,
    });
  }],
  // Tens unknowns
  [3, 5, (t, rng) => {
    const a = 10 * randInt(rng, 1, 8), b = 10 * randInt(rng, 1, 10 - a / 10), c = a + b;
    const forms = [[`□ + ${b} = ${c}`, a], [`${a} + □ = ${c}`, b], [`${c} − □ = ${a}`, b], [`□ − ${b} = ${a}`, c], [`${c} − ${b} = □`, a]];
    const [prompt, ans] = pick(rng, t === 3 ? forms.slice(0, 3).concat([forms[4]]) : forms);
    const q = { prompt, hint: 'Think in tens: each number is a count of tens. Is the box a part or the whole? Add tens to find a whole, or take tens away to find a part.', explain: `${a} + ${b} = ${c}. The box is ${ans}.`, explainVisual: { type: 'barmodel', whole: c, parts: [a, b] } };
    if (chance(rng, 0.5)) return numq({ ...q, answer: ans });
    return mcn(rng, { ...q, correct: ans, wrong: [ans + 10, ans - 10, c + (prompt.includes('−') ? 0 : a), ans / 10], min: 0, max: 200 });
  }],
  // Associative: which to add first
  [3, 5, (t, rng) => {
    const a = randInt(rng, 1, 9), b = 10 - a, c = randInt(rng, 2, 9);
    if (c === a || c === b) return numq({ prompt: `${a} + ${c} + ${b} = □`, answer: a + b + c, hint: 'Look for two numbers that make ten. Add those first, then add the last one.', explain: `${a} + ${b} = 10. 10 + ${c} = ${10 + c}.` });
    const order = shuffle(rng, [a, b, c]);
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: `${order.join(' + ')}. Which two are easiest to add first?`, correct: `${a} + ${b}`,
        wrong: [`${a} + ${c}`, `${b} + ${c}`], count: 3,
        hint: 'Ten is the easiest number to add on to. Test each pair: which two numbers add up to ten?', explain: `${a} + ${b} = 10. Then 10 + ${c} = ${10 + c}.`,
      });
    }
    return numq({ prompt: `${order.join(' + ')} = □`, answer: a + b + c, hint: 'You can add in any order. Find two numbers that make ten, add them first, then add the last one.', explain: `${a} + ${b} = 10. 10 + ${c} = ${10 + c}.` });
  }],
  // Unknowns to 100
  [4, 6, (t, rng) => {
    const a = randInt(rng, 12, 70), b = randInt(rng, 10, 99 - a), c = a + b;
    const forms = [[`□ + ${b} = ${c}`, a], [`${a} + □ = ${c}`, b], [`${c} − □ = ${a}`, b], [`□ − ${b} = ${a}`, c], [`100 − □ = ${100 - b}`, b]];
    const [prompt, ans] = pick(rng, t === 4 ? forms.slice(0, 3).concat([forms[4]]) : forms);
    return numq({ prompt, answer: ans, hint: 'Is the box a part or the whole? For the whole, add the two parts. For a part, take the other part away from the whole.', explain: `The box is ${ans}. Check: ${prompt.replace('□', String(ans))}.` });
  }],
  // Word problems with unknown start or change
  [4, 6, (t, rng) => {
    const k = kid(rng);
    const th = pick(rng, THINGS);
    const b = 10 * randInt(rng, 1, 4) + (t >= 5 ? randInt(rng, 1, 9) : 0), a = randInt(rng, 12, Math.min(60, 100 - b)), c = a + b; // within 100
    const v = randInt(rng, 0, 2);
    const forms = [
      [`${k.name} had some ${th.many}. ${k.P} got ${b} more. Now ${k.p} has ${c}. How many at first?`, a, `□ + ${b} = ${c}`],
      [`${k.name} had ${c} ${th.many}. ${k.P} gave some away. Now ${k.p} has ${a}. How many did ${k.p} give away?`, b, `${c} − □ = ${a}`],
      [`${k.name} had some ${th.many}. ${k.P} gave away ${b}. Now ${k.p} has ${a}. How many at first?`, c, `□ − ${b} = ${a}`],
    ];
    const [prompt, ans, eq] = forms[v];
    return mcn(rng, {
      prompt, correct: ans, wrong: [ans + 10, ans - 10, v === 2 ? a - b > 0 ? a - b : a + 1 : c + b > 200 ? ans + 1 : c + b, v === 0 ? b : a], min: 0, max: 200,
      hint: `Write it with a box: ${eq}. Is the box a part or the whole? Then add or subtract to find it.`, explain: `${eq}. The box is ${ans}.`,
      explainVisual: { type: 'barmodel', whole: c, parts: [a, b] },
    });
  }],
  // Equal or not equal
  [5, 7, (t, rng) => {
    const a = randInt(rng, 10, 60), b = randInt(rng, 5, 30), s = a + b;
    const c = randInt(rng, 10, s - 5);
    const eq = chance(rng, 0.5);
    const d = eq ? s - c : s - c + pick(rng, [1, -1, 10, -10]);
    return mcq(rng, {
      prompt: `Which sign goes in the box? ${a} + ${b} □ ${c} + ${d}`, speak: `Which sign goes in the box? ${numWords(a)} plus ${numWords(b)}, box, ${numWords(c)} plus ${numWords(d)}. Equals, or not equal?`,
      correct: eq ? '=' : '≠', wrong: [eq ? '≠' : '='], count: 2,
      hint: `Work out ${a} + ${b}. Then work out ${c} + ${d}. If the totals match, use =. If they do not match, use ≠.`,
      explain: `${a} + ${b} = ${s}. ${c} + ${d} = ${c + d}. ${eq ? 'Same, so use =.' : 'Not the same, so use ≠.'}`,
      explainVisual: { type: 'balance', left: `${a} + ${b}`, right: `${c} + ${d}`, tilt: eq ? 'level' : s > c + d ? 'left' : 'right' },
    });
  }],
  // Balance equations
  [5, 7, (t, rng) => {
    const s = randInt(rng, 20, t === 7 ? 100 : 60);
    const a = randInt(rng, 5, s - 5), c = randInt(rng, 5, s - 5);
    const b = s - a, d = s - c;
    const forms = [[`${a} + □ = ${c} + ${d}`, b], [`□ + ${b} = ${c} + ${d}`, a], [`${a} + ${b} = □ + ${d}`, c]];
    if (t >= 6) {
      const h = randInt(rng, 5, 45) * 2;
      forms.push([`□ + □ = ${h}`, h / 2]);
      const m = 10 * randInt(rng, 3, 10);
      const x = randInt(rng, 5, m - 5);
      forms.push([`100 − □ = ${m - x} + ${x}`, 100 - m]);
    }
    const [prompt, ans] = pick(rng, forms);
    const q = {
      prompt, visual: t === 5 && !prompt.includes('□ + □') ? { type: 'balance', left: prompt.split(' = ')[0].replace('□', '?'), right: prompt.split(' = ')[1].replace('□', '?'), tilt: 'level' } : undefined,
      hint: prompt.includes('□ + □') ? 'Both boxes hold the same number. Which number added to itself makes the total? Try splitting the total into two equal parts.' : 'Both sides must be equal. First add up the side with no box. Then find the number that makes the box side match.',
      explain: `The box is ${ans}. Check: ${prompt.replace(/□/g, String(ans))}.`,
    };
    if (chance(rng, 0.5)) return numq({ ...q, answer: ans });
    return mcn(rng, { ...q, correct: ans, wrong: [ans + 10, ans - 10, s, ans + 1], min: 0, max: 200 });
  }],
]);

// ---------------------------------------------------------------------------
// g2-meas-time (seconds and minutes)
// ---------------------------------------------------------------------------
const SEC_ACTS = ['👏 clap once', '👁️ blink', '🫰 snap your fingers', '🐸 jump once', '🗣️ say your name', '⚽ kick a ball', '🤧 sneeze', '👋 wave hello', '🦶 take one step'];
const MIN_ACTS = ['🧼 wash your hands well', '🎵 sing a short song', '👟 tie both shoes', '🍪 eat a cookie', '🧥 zip up your coat and put on a hat', '📖 read one page', '🥛 drink a glass of milk', '🔢 count to 60 slowly'];
const LONG_ACTS = ['🛌 sleep at night', '🏫 a school day', '🎬 watch a movie', '🎂 bake a cake', '✈️ fly to another city', '🏕️ a camping trip'];
const noEmo = (s) => s.replace(/^\S+ /, '');

const g2Time = F([
  // About 1 second
  [1, 3, (t, rng) => {
    const k = kid(rng);
    const right = pick(rng, SEC_ACTS);
    return mcq(rng, {
      prompt: pick(rng, ['Which takes about 1 second?', `${k.name} has 1 second. What can ${k.p} do?`, `${k.name} says "one steamboat." That takes 1 second. What else takes about 1 second?`, `Which could ${k.name} do in just 1 second?`]),
      correct: right, wrong: [pick(rng, MIN_ACTS), pick(rng, LONG_ACTS), pick(rng, MIN_ACTS.filter((x) => x !== right))].filter((x, i, a) => a.indexOf(x) === i),
      hint: 'A second is very short: say "one steamboat" and it is over. A minute is much longer: count slowly to 60. Which choice is over in about one steamboat?', explain: `It takes about 1 second to ${noEmo(right)}.`,
    });
  }],
  // About 1 minute
  [1, 4, (t, rng) => {
    const k = kid(rng);
    const right = pick(rng, MIN_ACTS);
    return mcq(rng, {
      prompt: pick(rng, ['Which takes about 1 minute?', `${k.name} has 1 minute. What can ${k.p} do?`, `${k.name} sets a 1-minute timer. What can ${k.p} finish?`, `Which takes ${k.name} about 1 minute?`]),
      correct: right, wrong: [pick(rng, SEC_ACTS), pick(rng, LONG_ACTS), pick(rng, SEC_ACTS)].filter((x, i, a) => a.indexOf(x) === i),
      hint: 'A minute is 60 seconds: count slowly to 60. A second is just one "steamboat". Which choice takes about as long as counting slowly to 60?', explain: `It takes about 1 minute to ${noEmo(right)}.`,
    });
  }],
  // Seconds or minutes?
  [1, 4, (t, rng) => {
    const secs = chance(rng, 0.5);
    const act = secs ? pick(rng, SEC_ACTS) : pick(rng, MIN_ACTS.concat(['🍝 eat supper', '🛁 have a bath', '🧹 clean your room', '🚶 walk to the park', '🧩 do a puzzle']));
    const k = kid(rng);
    return mcq(rng, {
      prompt: pick(rng, [`Seconds or minutes? Use one to time how long it takes to ${noEmo(act)}.`, `${k.name} wants to time how long it takes to ${noEmo(act)}. Seconds or minutes?`]),
      correct: secs ? 'seconds' : 'minutes', wrong: [secs ? 'minutes' : 'seconds'], count: 2,
      hint: `Seconds are for things that are over very fast, like a clap. Minutes are for things that take a while, like eating lunch. Which fits "${noEmo(act)}"?`, explain: secs ? `To ${noEmo(act)} is very quick, so use seconds.` : `To ${noEmo(act)} takes a while, so use minutes.`,
    });
  }],
  // 60 seconds = 1 minute
  [3, 5, (t, rng) => {
    const v = randInt(rng, 0, 2);
    const k = kid(rng);
    if (v === 0) {
      return mcn(rng, {
        prompt: pick(rng, ['How many seconds are in 1 minute?', `${k.name}'s timer says 1 minute. How many seconds is that?`]),
        correct: 60, wrong: [100, 10, 50, 30, 12, 24], min: 1, max: 200,
        hint: 'Picture the second hand going around a clock once. That is one minute. Count its ticks by tens: ten, twenty, thirty…', explain: '1 minute = 60 seconds.',
      });
    }
    const s = randInt(rng, 20, 110);
    if (s === 60) return numq({ prompt: '1 minute = □ seconds', answer: 60, hint: 'Picture the second hand going around a clock once. Count its ticks by tens: ten, twenty, thirty…', explain: '1 minute = 60 seconds.' });
    const more = s > 60;
    if (v === 1) {
      return mcq(rng, {
        prompt: `Is ${s} seconds more or less than 1 minute?`, correct: more ? 'More' : 'Less', wrong: [more ? 'Less' : 'More', 'The same'], count: 3,
        hint: `1 minute is 60 seconds. Compare ${s} with 60: is it bigger, smaller, or the same?`, explain: `1 minute = 60 seconds. ${s} is ${more ? 'more' : 'less'} than 60.`,
      });
    }
    const [a, b] = twoKids(rng);
    const act = pick(rng, ['hopped', 'danced', 'held a plank', 'skipped', 'hummed', 'balanced on one foot']);
    return mcq(rng, {
      prompt: `${a.name} ${act} for 1 minute. ${b.name} ${act} for ${s} seconds. Who ${act} longer?`,
      correct: more ? b.name : a.name, wrong: [more ? a.name : b.name, 'The same'], count: 3,
      hint: `Change 1 minute into seconds first: 1 minute = 60 seconds. Then compare 60 with ${s}. The bigger number means longer.`, explain: `1 minute = 60 seconds. ${more ? `${s} > 60, so ${b.name}` : `60 > ${s}, so ${a.name}`} went longer.`,
    });
  }],
  // Minutes to seconds
  [4, 6, (t, rng) => {
    const m = t === 4 ? 2 : pick(rng, [2, 3]);
    const k = kid(rng);
    const act = pick(rng, ['reads', 'runs', 'jumps rope', 'plays piano', 'draws', 'skates']);
    return mcn(rng, {
      prompt: pick(rng, [`${m} minutes = □ seconds`, `${k.name} ${act} for ${m} minutes. How many seconds is that?`]),
      correct: 60 * m, wrong: [m * 100, 60 + m, 60 * m + 10, 60 * (m - 1), m * 10], min: 1, max: 500,
      hint: `Each minute is 60 seconds. Add 60 for each of the ${m} minutes: ${steps(0, 60 * m, 60)}`, explain: `${Array(m).fill(60).join(' + ')} = ${60 * m} seconds.`,
    });
  }],
  // Ordering durations
  [4, 6, (t, rng) => {
    const secs = sample(rng, [10, 20, 30, 40, 45, 50, 70, 80, 90, 100], 2);
    const items = [[`${secs[0]} seconds`, secs[0]], [`${secs[1]} seconds`, secs[1]], ['1 minute', 60], ['2 minutes', 120]];
    const pickd = sample(rng, items, 3).sort((x, y) => x[1] - y[1]);
    if (new Set(pickd.map((x) => x[1])).size < 3) return numq({ prompt: '1 minute = □ seconds', answer: 60, hint: 'Picture the second hand going around a clock once. Count its ticks by tens.', explain: '60 seconds.' });
    const up = chance(rng, 0.5);
    const right = up ? pickd : pickd.slice().reverse();
    const fmt = (a) => a.map((x) => x[0]).join(', ');
    return mcq(rng, {
      prompt: up ? 'Which list goes from shortest to longest time?' : 'Which list goes from longest to shortest time?',
      correct: fmt(right), wrong: [fmt(right.slice().reverse()), fmt([right[1], right[0], right[2]]), fmt([right[0], right[2], right[1]])],
      hint: 'Change minutes to seconds first: 1 minute = 60 seconds and 2 minutes = 120 seconds. Then put the numbers in order. Which list matches?', explain: `In seconds: ${pickd.map((x) => x[1]).join(', ')}. So: ${fmt(right)}.`,
    });
  }],
  // Multi-step seconds problems
  [6, 7, (t, rng) => {
    const k = kid(rng);
    const v = randInt(rng, 0, 2);
    if (v === 0) {
      const x = 5 * randInt(rng, 1, 8), y = 5 * randInt(rng, 2, t === 6 ? 8 : 16);
      const act = pick(rng, ['reads', 'practises piano', 'skips rope', 'draws', 'builds with blocks']);
      return mcn(rng, {
        prompt: `${k.name} ${act} for 1 minute and ${x} seconds, then ${y} seconds more. How many seconds in all?`,
        correct: 60 + x + y, wrong: [x + y, 60 + x, 100 + x + y, 60 + x + y + 10], min: 1, max: 300,
        hint: `Two steps. First change 1 minute and ${x} seconds into seconds: 60 + ${x}. Then add the ${y} more seconds.`,
        explain: `1 minute and ${x} seconds = ${60 + x} seconds. ${60 + x} + ${y} = ${60 + x + y} seconds.`,
      });
    }
    if (v === 1) {
      const done = 5 * randInt(rng, 3, t === 6 ? 11 : 23);
      const goal = done < 60 ? 60 : 120;
      return mcn(rng, {
        prompt: `${k.name}'s timer is set for ${goal === 60 ? '1 minute' : '2 minutes'}. ${done} seconds have gone by. How many seconds are left?`,
        correct: goal - done, wrong: [done, goal - done + 10, 100 - done > 0 ? 100 - done : goal - done + 5, goal], min: 1, max: 200,
        hint: `Change ${goal === 60 ? '1 minute' : '2 minutes'} into seconds first. Then count up from ${done} to that number.`,
        explain: `${goal === 60 ? '1 minute' : '2 minutes'} = ${goal} seconds. ${goal} − ${done} = ${goal - done} seconds left.`,
      });
    }
    const s = 5 * randInt(rng, 7, 17), times = 2;
    const tot = s * times;
    const rel = tot > 120 ? 'More than 2 minutes' : tot < 120 ? 'Less than 2 minutes' : 'Exactly 2 minutes';
    return mcq(rng, {
      prompt: `A song lasts ${s} seconds. ${k.name} plays it ${times} times. Is that more or less than 2 minutes?`,
      correct: rel, wrong: ['More than 2 minutes', 'Less than 2 minutes', 'Exactly 2 minutes'].filter((x) => x !== rel), count: 3,
      hint: `Two steps. Add ${s} + ${s} to find the total seconds. Then change 2 minutes into seconds and compare.`,
      explain: `${s} + ${s} = ${tot} seconds. 2 minutes = 120 seconds. ${tot === 120 ? 'They are the same.' : `${tot} is ${tot > 120 ? 'more' : 'less'} than 120.`}`,
    });
  }],
  // Minutes and seconds
  [5, 7, (t, rng) => {
    const k = kid(rng);
    const v = randInt(rng, 0, t === 7 ? 3 : 2);
    if (v === 0) {
      const extra = randInt(rng, 1, 5) * 10 - (t === 7 ? randInt(rng, 0, 5) : 0);
      return mcn(rng, {
        prompt: `${60 + extra} seconds = 1 minute and □ seconds`, correct: extra, wrong: [60 + extra, extra + 10, 60, 100 - (60 + extra) > 0 ? 100 - (60 + extra) : extra + 1], min: 0, max: 200,
        hint: `1 minute is 60 seconds. Take 60 away from ${60 + extra}. What is left?`, explain: `${60 + extra} − 60 = ${extra}. So ${60 + extra} seconds = 1 minute and ${extra} seconds.`,
      });
    }
    if (v === 1) {
      const a = pick(rng, [20, 30, 40]), b = 60 - a;
      return mcq(rng, {
        prompt: `${k.name} brushes for ${a} seconds, then ${b} more seconds. How long is that?`, correct: '1 minute', wrong: ['2 minutes', `${a + b + 10} seconds`, `${a} minutes`], count: 4,
        hint: `Add the seconds: ${a} + ${b}. Then remember: 60 seconds make 1 minute.`, explain: `${a} + ${b} = 60 seconds = 1 minute.`,
      });
    }
    if (v === 2) {
      const [a, b] = twoKids(rng);
      const x = randInt(rng, 5, 50), y = randInt(rng, 61, 115);
      const aTot = 60 + x;
      return mcq(rng, {
        prompt: `${a.name} ran for 1 minute and ${x} seconds. ${b.name} ran for ${y} seconds. Who ran longer?`,
        correct: aTot > y ? a.name : aTot < y ? b.name : 'The same', wrong: [a.name, b.name, 'The same'].filter((z) => z !== (aTot > y ? a.name : aTot < y ? b.name : 'The same')), count: 3,
        hint: `Change 1 minute and ${x} seconds into seconds: 60 + ${x}. Then compare that with ${y}.`, explain: `1 minute and ${x} seconds = ${aTot} seconds. ${aTot === y ? 'They are the same.' : `${Math.max(aTot, y)} > ${Math.min(aTot, y)}.`}`,
      });
    }
    if (chance(rng, 0.5)) {
      const m = pick(rng, [2, 3]);
      return mcn(rng, {
        prompt: `${60 * m} seconds = □ minutes`, correct: m, wrong: [m + 1, m * 10, 60 * m / 10, m - 1], min: 1, max: 100,
        hint: `Each minute is 60 seconds. How many 60s make ${60 * m}? Count by 60s: ${steps(0, 60 * m, 60)}`, explain: `${Array(m).fill(60).join(' + ')} = ${60 * m}. So ${60 * m} seconds = ${m} minutes.`,
      });
    }
    return mcn(rng, {
      prompt: 'Next year you learn hours! How many minutes are in 1 hour?', correct: 60, wrong: [100, 24, 12, 30], min: 1, max: 200,
      hint: 'Minutes in an hour work just like seconds in a minute. How many seconds make one minute?', explain: '1 hour = 60 minutes, just like 1 minute = 60 seconds.',
    });
  }],
]);

// ---------------------------------------------------------------------------
// g2-meas-length (dm, cm)
// ---------------------------------------------------------------------------
const RULER_OBJ = ['pencil', 'crayon', 'key', 'leaf', 'worm', 'paperclip'];
// Real-life length ranges in cm, so a ruler never shows a 20 cm paper clip.
const OBJ_CM = { pencil: [5, 19], crayon: [4, 10], key: [3, 8], leaf: [3, 12], worm: [3, 15], paperclip: [2, 5] };
function rulerObj(rng, maxLen) {
  const obj = pick(rng, RULER_OBJ.filter((o) => OBJ_CM[o][0] <= maxLen));
  const [lo, hi] = OBJ_CM[obj];
  return [obj, randInt(rng, lo, Math.min(hi, maxLen))];
}
const objName = (o) => (o === 'paperclip' ? 'paper clip' : o);
const CM_REF = ['💅 the width of your fingernail', '🫘 a bean', '🟦 a small unit cube', '🐜 an ant'];
const DM_REF = ['✋ the width of your hand', '🖍️ a crayon', '🟫 a ten-rod', '🧃 a juice box'];
const BIG_REF = ['🚪 a door', '🚌 a school bus', '🛏️ a bed', '🏠 a house'];

const g2Length = F([
  // Ruler from 0
  [1, 3, (t, rng) => {
    const [obj, len] = rulerObj(rng, t === 1 ? 10 : t === 2 ? 15 : 19);
    return mcn(rng, {
      prompt: pick(rng, [`How long is the ${objName(obj)}?`, `How many centimetres long is the ${objName(obj)}?`]),
      visual: { type: 'ruler', length: Math.max(12, len + randInt(rng, 2, 5)), object: obj, objectLength: len, start: 0, unit: 'cm' },
      correct: len, wrong: [len + 1, len - 1, len + 2], min: 1, max: 30, suf: ' cm',
      hint: `How long is the ${objName(obj)}? It starts at 0 on the ruler. Look at its other end and read the number under it.`, explain: `It starts at 0 and ends at ${len}. It is ${len} cm long.`,
    });
  }],
  // Compare lengths
  [1, 2, (t, rng) => {
    const items = sample(rng, [['🐍', 'snake'], ['✏️', 'pencil'], ['🥕', 'carrot'], ['🍌', 'banana'], ['🪱', 'worm'], ['🖍️', 'crayon'], ['🥖', 'bread']], t === 1 ? 2 : 3);
    const vals = sample(rng, [4, 6, 7, 9, 11, 12, 14, 16], items.length);
    const long = chance(rng, 0.5);
    const idx = vals.indexOf(long ? Math.max(...vals) : Math.min(...vals));
    const w = items.length === 2 ? (long ? 'longer' : 'shorter') : (long ? 'longest' : 'shortest');
    return mcq(rng, {
      prompt: `Which is ${w}?`, visual: { type: 'measurecompare', attribute: 'length', items: items.map(([o], i) => ({ object: o, value: vals[i], unit: 'cm' })) },
      correct: `${items[idx][0]} ${items[idx][1]}`, wrong: items.filter((_, i) => i !== idx).map(([a, b]) => `${a} ${b}`), count: items.length,
      hint: `Each object shows its length in centimetres. The ${long ? 'longest has the biggest' : 'shortest has the smallest'} number. Compare the numbers and the bars.`, explain: `The ${items[idx][1]} is ${vals[idx]} cm. It is the ${w}.`,
    });
  }],
  // Referents
  [2, 4, (t, rng) => {
    const cm = chance(rng, 0.5);
    const right = pick(rng, cm ? CM_REF : DM_REF);
    const k = kid(rng);
    return mcq(rng, {
      prompt: pick(rng, [`Which is about 1 ${cm ? 'centimetre' : 'decimetre'} long?`, `${k.name} needs something about 1 ${cm ? 'centimetre' : 'decimetre'} long. Which one?`]),
      correct: right, wrong: [pick(rng, cm ? DM_REF : CM_REF), ...sample(rng, BIG_REF, 2)],
      hint: `A centimetre is tiny, about as wide as your fingernail. A decimetre is about as wide as your hand. Which choice is about the size of ${cm ? 'a fingernail' : 'your hand'}?`, explain: `${cap(noEmo(right))} is about 1 ${cm ? 'centimetre' : 'decimetre'}.`,
    });
  }],
  // dm and cm
  [3, 5, (t, rng) => {
    const toCm = chance(rng, 0.6);
    const n = randInt(rng, 2, t === 3 ? 5 : 10);
    if (toCm) {
      return mcn(rng, {
        prompt: pick(rng, [`${n} dm = □ cm`, `A ribbon is ${n} decimetres long. How many centimetres is that?`]), correct: n * 10, wrong: [n, n * 100, n + 10, n * 10 + 10], min: 1, max: 999,
        hint: `Each decimetre is 10 centimetres. Count by tens, ${n} times.`, explain: `Each decimetre is 10 cm. ${n} groups of 10 cm is ${n * 10} cm.`,
        explainVisual: { type: 'base10', hundreds: 0, tens: n, ones: 0 },
      });
    }
    return mcn(rng, {
      prompt: `${n * 10} cm = □ dm`, correct: n, wrong: [n * 10, n * 100, n + 1, n + 10], min: 1, max: 999,
      hint: `Every ten centimetres make 1 decimetre. How many groups of ten are in ${n * 10}?`, explain: `${n * 10} cm is ${n} groups of 10 cm. That is ${n} dm.`,
    });
  }],
  // Ruler not starting at 0
  [3, 6, (t, rng) => {
    const start = randInt(rng, 1, t === 3 ? 3 : 6);
    const [obj, len] = rulerObj(rng, t === 3 ? 9 : 14);
    return mcn(rng, {
      prompt: `The ${objName(obj)} does not start at 0. How long is it?`, visual: { type: 'ruler', length: Math.min(30, start + len + randInt(rng, 1, 4)), object: obj, objectLength: len, start, unit: 'cm' },
      correct: len, wrong: [start + len, start, len + 1, len - 1], min: 1, max: 30, suf: ' cm',
      hint: `The ${objName(obj)} starts at ${start}, not at 0. Count the centimetre spaces from ${start} to its other end. Or read the end number and take away ${start}.`,
      explain: `It starts at ${start} and ends at ${start + len}. ${start + len} − ${start} = ${len} cm.`,
    });
  }],
  // Length story problems
  [4, 5, (t, rng) => {
    const [k, m] = twoKids(rng);
    const v = randInt(rng, 0, 2);
    if (v === 0) {
      const a = randInt(rng, 12, 60), b = randInt(rng, 5, a - 3);
      const thing = pick(rng, ['ribbon', 'snake drawing', 'paper chain', 'block tower', 'sunflower']);
      return mcn(rng, {
        prompt: `${k.name}'s ${thing} is ${a} cm. ${m.name}'s is ${b} cm. How much longer is ${k.name}'s?`, correct: a - b, wrong: [a + b, a - b + 10, a - b - 1, a], min: 0, max: 200, suf: ' cm',
        hint: `How much longer means find the difference. Count up from ${b} to ${a}: first to the next ten, then by tens.`, explain: `${a} − ${b} = ${a - b} cm.`, explainVisual: { type: 'barmodel', parts: [b, '?'], labels: [m.name, 'longer'] },
      });
    }
    if (v === 1) {
      const a = randInt(rng, 8, 45), b = randInt(rng, 8, 45);
      return mcn(rng, {
        prompt: `${k.name} puts a ${a} cm stick and a ${b} cm stick end to end. How long is it now?`, correct: a + b, wrong: [Math.abs(a - b), a + b + 10, a + b - 1, a + b + 1], min: 0, max: 200, suf: ' cm',
        hint: `End to end means add the two lengths. ${addHintBig(a, b)}`, explain: `${a} + ${b} = ${a + b} cm.`,
      });
    }
    const a = randInt(rng, 30, 90), b = randInt(rng, 5, 25);
    return mcn(rng, {
      prompt: `${k.name} has ${a} cm of string. ${k.P} cuts off ${b} cm. How much is left?`, correct: a - b, wrong: [a + b, a - b + 10, a - b - 10, b], min: 0, max: 200, suf: ' cm',
      hint: `Cutting off takes away. ${subHintBig(a, b)}`, explain: `${a} − ${b} = ${a - b} cm.`,
    });
  }],
  // Unit size
  [4, 7, (t, rng) => {
    const [k, m] = twoKids(rng);
    const units = [['📎 paper clips', 3], ['🟦 cubes', 2], ['🖍️ crayons', 9], ['✋ hand spans', 12], ['👟 shoes', 20]];
    let u1, u2;
    do { [u1, u2] = sample(rng, units, 2); } while (Math.max(u1[1], u2[1]) / Math.min(u1[1], u2[1]) < 2);
    const thing = pick(rng, ['desk', 'rug', 'bookshelf', 'window', 'table', 'mat']);
    const smallUser = u1[1] < u2[1] ? k : m;
    if (chance(rng, 0.5)) {
      return mcq(rng, {
        prompt: `${k.name} measures a ${thing} with ${u1[0]}. ${m.name} uses ${u2[0]}. Who gets a bigger number?`,
        correct: smallUser.name, wrong: [smallUser === k ? m.name : k.name, 'The same number'], count: 3,
        hint: `Which unit is smaller: ${noEmo(u1[0])} or ${noEmo(u2[0])}? It takes more small units than big units to cover the same ${thing}. Same-size units would give the same number.`, explain: `${cap(noEmo((u1[1] < u2[1] ? u1 : u2)[0]))} are smaller, so it takes more of them.`,
      });
    }
    const n = randInt(rng, 3, 12);
    return mcq(rng, {
      prompt: `A ${thing} is ${n} ${noEmo(u2[0])} long. Measured with ${noEmo(u1[0])}, is the number bigger or smaller than ${n}?`,
      correct: u1[1] < u2[1] ? 'Bigger' : 'Smaller', wrong: [u1[1] < u2[1] ? 'Smaller' : 'Bigger', 'The same'], count: 3,
      hint: `Are ${noEmo(u1[0])} smaller or bigger than ${noEmo(u2[0])}? Smaller units need more of them to cover the ${thing}, so the number goes up. Bigger units need fewer.`, explain: `${cap(noEmo(u1[0]))} are ${u1[1] < u2[1] ? 'smaller, so you need more of them' : 'bigger, so you need fewer of them'}.`,
    });
  }],
  // Compare mixed units; orientation
  [5, 7, (t, rng) => {
    const v = randInt(rng, 0, 2);
    if (v === 0) {
      const dm = randInt(rng, 1, 5), cm = dm * 10 + pick(rng, [-5, -3, -1, 2, 4, 6]);
      const ans = dm * 10 > cm ? `${dm} dm` : `${cm} cm`;
      return mcq(rng, {
        prompt: `Which is longer: ${dm} dm or ${cm} cm?`, correct: ans, wrong: [ans === `${dm} dm` ? `${cm} cm` : `${dm} dm`, 'They are the same'], count: 3,
        hint: `Change ${dm} dm into centimetres first: each decimetre is 10 cm. Then compare with ${cm} cm. If they match, they are the same.`, explain: `${dm} dm = ${dm * 10} cm. ${Math.max(dm * 10, cm)} cm is longer.`,
      });
    }
    if (v === 1) {
      const [obj, len] = rulerObj(rng, 18);
      return mcq(rng, {
        prompt: `A ${objName(obj)} is ${len} cm long. You turn it the other way. How long is it now?`,
        correct: `${len} cm`, wrong: [`${len + 1} cm`, `${String(len).split('').reverse().join('') === String(len) ? len - 1 : Number(String(len).split('').reverse().join(''))} cm`, `${len * 2} cm`, 'It has no length'],
        hint: 'Turning an object moves it, but does it make it longer or shorter? Think of turning your pencil around in your hand.', explain: `Turning it does not change its length. It is still ${len} cm.`,
        explainVisual: { type: 'ruler', length: 20, object: obj, objectLength: len, start: 0, unit: 'cm' },
      });
    }
    const vals = sample(rng, [6, 8, 9, 12, 14, 15, 18], 2);
    const dm = randInt(rng, 1, 2);
    const list = [[`${vals[0]} cm`, vals[0]], [`${vals[1]} cm`, vals[1]], [`${dm} dm`, dm * 10]];
    if (new Set(list.map((x) => x[1])).size < 3) return numq({ prompt: `${dm} dm = □ cm`, answer: dm * 10, hint: `Each decimetre is 10 centimetres. Count by tens, ${dm} times.`, explain: `${dm * 10} cm.` });
    const sorted = list.slice().sort((x, y) => x[1] - y[1]);
    const fmt = (a) => a.map((x) => x[0]).join(', ');
    return mcq(rng, {
      prompt: 'Which list goes from shortest to longest?', correct: fmt(sorted),
      wrong: [fmt(sorted.slice().reverse()), fmt([sorted[1], sorted[0], sorted[2]]), fmt([sorted[0], sorted[2], sorted[1]])],
      hint: `Change ${dm} dm to centimetres first: each decimetre is 10 cm. Then order all three from shortest to longest.`, explain: `${dm} dm = ${dm * 10} cm. Shortest to longest: ${fmt(sorted)}.`,
    });
  }],
  // When precision matters
  [5, 7, (t, rng) => {
    const exact = ['🪚 cutting a board to fit a shelf', '🖼️ making a frame for a picture', '🪟 buying a blind for a window', '👕 sewing a shirt that fits', '🧵 cutting a ribbon for a gift box'];
    const rough = ['🏞️ how far it is to the park', '🌳 how tall a tree is', '🐛 guessing the length of a worm', '🏃 how far you ran at recess', '☁️ how big a cloud looks'];
    const askExact = chance(rng, 0.6);
    return mcq(rng, {
      prompt: askExact ? 'When is an exact measurement most important?' : 'When is a close guess good enough?',
      correct: pick(rng, askExact ? exact : rough), wrong: sample(rng, askExact ? rough : exact, 3),
      hint: 'Would a small mistake cause a problem? If something must fit exactly, you need an exact measurement. If you only want an idea of the size, a close guess is fine.',
      explain: askExact ? 'If something must fit, a small mistake matters. Measure exactly.' : 'When nothing needs to fit, a close guess is fine.',
    });
  }],
  // Challenge
  [6, 7, (t, rng) => {
    const v = randInt(rng, 0, 2);
    if (v === 0) {
      const dm = randInt(rng, 1, 3), cm = randInt(rng, 1, 9);
      return mcn(rng, {
        prompt: `${dm} dm ${cm} cm = □ cm`, correct: dm * 10 + cm, wrong: [dm + cm, dm * 100 + cm, cm * 10 + dm, dm * 10 + cm + 10], min: 1, max: 999,
        hint: `Change the ${dm} dm into centimetres: count by tens, ${dm} times. Then add the ${cm} cm.`, explain: `${dm} dm = ${dm * 10} cm. ${dm * 10} + ${cm} = ${dm * 10 + cm} cm.`,
      });
    }
    if (v === 1) {
      const piece = pick(rng, [2, 5, 10]), dm = randInt(rng, 1, 3);
      return mcn(rng, {
        prompt: `How many ${piece} cm pieces can you cut from ${dm} dm of ribbon?`, correct: (dm * 10) / piece, wrong: [dm * piece, (dm * 10) / piece + 1, dm, (dm * 10) / piece - 1], min: 1, max: 100,
        hint: `Change ${dm} dm to centimetres first: each decimetre is ten centimetres. Then count by ${piece}s up to that length, and count your jumps.`, explain: `${dm} dm = ${dm * 10} cm. Count by ${piece}s to ${dm * 10}: ${(dm * 10) / piece} pieces.`,
      });
    }
    const a = randInt(rng, 2, 4);
    const b = randInt(rng, 11, a * 10 - 1);
    return mcn(rng, {
      prompt: `Ava's scarf is ${a} dm. Kai's scarf is ${b} cm. How much longer is Ava's?`, correct: a * 10 - b, wrong: [a * 10 + b, b - a, a * 10 - b + 10, a * 10 - b + 1], min: 0, max: 200, suf: ' cm',
      hint: `Change ${a} dm to centimetres first: count by tens, ${a} times. Then find the difference from ${b} cm.`, explain: `${a} dm = ${a * 10} cm. ${a * 10} − ${b} = ${a * 10 - b} cm.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// g2-geo-shapes
// ---------------------------------------------------------------------------
const SH2 = {
  triangle: 3, square: 4, rectangle: 4, pentagon: 5, hexagon: 6, trapezoid: 4, rhombus: 4, octagon: 8, circle: 0,
};
const TRI = ['triangle', 'right_triangle', 'equilateral_triangle', 'isosceles_triangle', 'scalene_triangle'];
const G2_NAMES = ['triangle', 'square', 'rectangle', 'hexagon', 'trapezoid', 'rhombus', 'pentagon', 'circle'];
const SOLID2 = {
  cube: { name: 'cube', faces: 6, desc: 'has 6 square faces', rolls: false, stacks: true },
  sphere: { name: 'sphere', faces: 0, desc: 'is round like a ball with no flat faces', rolls: true, stacks: false },
  cylinder: { name: 'cylinder', faces: 2, desc: 'has 2 circle faces and a curved surface', rolls: true, stacks: true },
  cone: { name: 'cone', faces: 1, desc: 'has 1 circle face and a point', rolls: true, stacks: false },
  square_pyramid: { name: 'pyramid', faces: 5, desc: 'has a square base and triangle faces that meet at a point', rolls: false, stacks: false },
  rect_prism: { name: 'rectangular prism', faces: 6, desc: 'is shaped like a box with rectangle faces', rolls: false, stacks: true },
  tri_prism: { name: 'triangular prism', faces: 5, desc: 'has 2 triangle faces and 3 rectangle faces', rolls: false, stacks: true },
};
const S2KEYS = Object.keys(SOLID2);
const SHAPE_DEF = { triangle: '3 sides', square: '4 equal sides, square corners', rectangle: '4 sides, 2 long and 2 short', hexagon: '6 sides', trapezoid: '4 sides, only 2 go the same way', rhombus: '4 equal sides, leaning over', pentagon: '5 sides', circle: 'round, no sides', octagon: '8 sides' };
const SOLID_SHORT = { cube: '6 square faces', sphere: 'round like a ball', cylinder: 'shaped like a can', cone: 'a point and a circle face', pyramid: 'triangle faces meeting at a point', 'rectangular prism': 'shaped like a box', 'triangular prism': 'shaped like a tent' };
const sItem = (rng, shape, extra = {}) => ({ shape, color: pick(rng, PCOL), size: 'm', ...extra });
const realName = (s) => (TRI.includes(s) ? 'triangle' : s);

const g2Shapes = F([
  // Name this shape
  [1, 3, (t, rng) => {
    const pool = t === 1 ? ['triangle', 'square', 'rectangle', 'circle', 'hexagon'] : [...G2_NAMES, ...TRI.slice(1)];
    const s = pick(rng, pool);
    const name = realName(s);
    const wrongPool = G2_NAMES.filter((x) => x !== name && !(name === 'square' && (x === 'rectangle' || x === 'rhombus')));
    return withHint(mcq(rng, {
      prompt: pick(rng, ['What shape is this?', 'Name this shape.']),
      visual: { type: 'shapes', items: [sItem(rng, s, { rotate: t >= 2 && s !== 'circle' ? pick(rng, [0, 30, 90, 150, 200]) : 0, size: pick(rng, ['s', 'm', 'l']) })] },
      correct: name, wrong: sample(rng, wrongPool, 3),
      hint: '-', explain: name === 'circle' ? 'It is round with no sides. It is a circle.' : `It has ${SH2[name]} straight sides. It is a ${name}.`,
    }), (ch) => `Count the sides. ${ch.map((c) => `${cap(c)}: ${SHAPE_DEF[c]}.`).join(' ')}`);
  }],
  // Which is a ...?
  [1, 4, (t, rng) => {
    const target = pick(rng, t === 1 ? ['hexagon', 'triangle', 'rectangle', 'square'] : ['hexagon', 'trapezoid', 'rhombus', 'pentagon', 'triangle', 'rectangle']);
    const variants = target === 'triangle' ? TRI : [target];
    const bad = ['circle', 'square', 'rectangle', 'pentagon', 'hexagon', 'trapezoid', 'rhombus', 'octagon', 'triangle'].filter((x) => x !== target && !(target === 'rectangle' && x === 'square') && !(target === 'rhombus' && x === 'square'));
    const rot = () => (t >= 3 ? pick(rng, [0, 30, 90, 180, 210]) : 0);
    return visq(rng, {
      prompt: `Which one is a ${target}?`,
      items: [{ visual: { type: 'shapes', items: [sItem(rng, pick(rng, variants), { rotate: rot() })] }, correct: true },
        ...sample(rng, bad, 3).map((o) => ({ visual: { type: 'shapes', items: [sItem(rng, o, { rotate: rot() })] }, correct: false }))],
      hint: { hexagon: 'A hexagon has 6 sides.', trapezoid: 'A trapezoid has 4 sides; two of them go the same way (parallel).', rhombus: 'A rhombus has 4 equal sides, like a pushed-over square.', pentagon: 'A pentagon has 5 sides.', triangle: 'A triangle has 3 sides.', rectangle: 'A rectangle has 4 sides and 4 square corners.', square: 'A square has 4 equal sides and square corners.' }[target] + ' Count the sides in each picture. Turning a shape does not change its name.',
      explain: `A ${target} ${{ hexagon: 'has 6 sides and 6 corners', trapezoid: 'has 4 sides, and one pair of sides go the same way', rhombus: 'has 4 sides that are all the same length', pentagon: 'has 5 sides and 5 corners', triangle: 'has 3 sides and 3 corners', rectangle: 'has 4 sides and 4 square corners', square: 'has 4 equal sides and 4 square corners' }[target]}, in any colour, size or position.`,
    });
  }],
  // Sides and corners
  [2, 5, (t, rng) => {
    // Octagon only appears with a picture: it is not one of the Grade 2 named shapes.
    const s = pick(rng, ['triangle', 'square', 'rectangle', 'pentagon', 'hexagon', 'trapezoid', 'rhombus', ...(t <= 3 ? ['octagon'] : [])]);
    const askSides = chance(rng, 0.5);
    const n = SH2[s];
    return mcn(rng, {
      prompt: `How many ${askSides ? 'sides' : 'corners'} does ${art(s)} have?`, visual: t <= 3 ? { type: 'shapes', items: [sItem(rng, s, { rotate: pick(rng, [0, 45, 90]) })] } : undefined,
      correct: n, wrong: [n + 1, n - 1, n + 2], min: 0, max: 12,
      hint: t <= 3 ? (askSides ? 'Put your finger on one side. Go around the shape, counting each side once, until you are back where you started.' : 'A corner is where two sides meet. Go around the shape and count each corner once.') : `Picture a ${s}, or draw one in the air with your finger. Count its ${askSides ? 'sides' : 'corners'} as you draw.`, explain: `A ${s} has ${n} sides and ${n} corners.`,
    });
  }],
  // What matters?
  [3, 5, (t, rng) => {
    const s = pick(rng, ['triangle', 'square', 'rectangle', 'hexagon', 'trapezoid', 'rhombus', 'pentagon']);
    const k = kid(rng);
    const v = randInt(rng, 0, 2);
    if (v === 0) {
      const change = pick(rng, ['turns it upside down', 'paints it blue', 'makes it bigger', 'makes it tiny', 'slides it across the table', 'colours it with stripes']);
      return mcq(rng, {
        prompt: `${k.name} has a ${s}. ${k.P} ${change}. What shape is it now?`, visual: { type: 'shapes', items: [sItem(rng, s, { rotate: pick(rng, [0, 180]) })] },
        correct: `a ${s}`, wrong: sample(rng, G2_NAMES.filter((x) => x !== s && x !== 'circle'), 3).map((x) => `a ${x}`),
        hint: `Colour, size, turning and sliding do not change a shape. Only changing the number of sides and corners does. Did ${k.name} change the sides?`, explain: `Colour, size and position do not change a shape. It is still a ${s}.`,
      });
    }
    if (v === 1) {
      return mcq(rng, {
        prompt: `Which change would make a ${s} into a different shape?`, correct: 'Adding another side',
        wrong: ['Turning it', 'Changing its colour', 'Making it bigger'],
        hint: 'A shape gets its name from its sides and corners. Test each choice: does it change the number of sides? Colour, size and turning do not.', explain: 'Only changing the sides or corners changes the shape. Colour, size and turning do not.',
      });
    }
    const n = SH2[s];
    return mcq(rng, {
      prompt: `Is this still a ${s}?`, visual: { type: 'shapes', items: [sItem(rng, s, { rotate: pick(rng, [30, 90, 135, 200]), size: pick(rng, ['s', 'l']), pattern: pick(rng, ['stripes', 'dots', 'solid']) })] },
      correct: `Yes, it is still ${art(s)}`, wrong: ['No, it is turned', 'No, the colour changed', 'No, it is a different size'],
      hint: `A ${s} is named by its sides. Count the sides of this shape. Does turning it, colouring it or changing its size change that count?`, explain: `It has ${n} sides, so it is a ${s} no matter how it is turned or coloured.`,
    });
  }],
  // 3-D solids
  [1, 5, (t, rng) => {
    const v = t === 1 ? randInt(rng, 0, 1) : randInt(rng, 0, 3);
    const s = pick(rng, t === 1 ? ['cube', 'sphere', 'cylinder', 'cone'] : S2KEYS);
    if (v === 0) {
      return withHint(mcq(rng, {
        prompt: 'What is this solid called?', visual: { type: 'solids', items: [{ solid: s, color: pick(rng, PCOL) }] },
        correct: SOLID2[s].name, wrong: sample(rng, S2KEYS.filter((x) => x !== s && !(s === 'cube' && x === 'rect_prism') && !(s === 'rect_prism' && x === 'cube')), 3).map((x) => SOLID2[x].name),
        hint: '-', explain: `This ${SOLID2[s].name} ${SOLID2[s].desc}.`,
      }), (ch) => `${ch.map((c) => `${cap(c)}: ${SOLID_SHORT[c]}.`).join(' ')} Which one matches?`);
    }
    if (v === 1) {
      return visq(rng, {
        prompt: `Which solid ${SOLID2[s].desc}?`,
        items: [s, ...sample(rng, S2KEYS.filter((x) => x !== s && !(s === 'rect_prism' && x === 'cube') && !(s === 'cube' && x === 'rect_prism')), 3)].map((x, i) => ({ visual: { type: 'solids', items: [{ solid: x, color: pick(rng, PCOL) }] }, correct: i === 0 })),
        hint: `Look for the solid that ${SOLID2[s].desc}. Check the faces of each solid: flat or curved, and what shape?`, explain: `A ${SOLID2[s].name} ${SOLID2[s].desc}.`,
      });
    }
    if (v === 2) {
      const want = pick(rng, ['roll and stack', 'roll but not stack', 'stack but not roll']);
      const ok = (x) => (want === 'roll and stack' ? SOLID2[x].rolls && SOLID2[x].stacks : want === 'roll but not stack' ? SOLID2[x].rolls && !SOLID2[x].stacks : !SOLID2[x].rolls && SOLID2[x].stacks);
      const right = pick(rng, S2KEYS.filter(ok));
      return visq(rng, {
        prompt: `Which solid can ${want}?`,
        items: [right, ...sample(rng, S2KEYS.filter((x) => !ok(x)), 3)].map((x, i) => ({ visual: { type: 'solids', items: [{ solid: x, color: pick(rng, PCOL) }] }, correct: i === 0 })),
        hint: 'A curved surface lets a solid roll. Flat faces on the top and bottom let it stack. Check each solid for both.', explain: `A ${SOLID2[right].name} can ${want}.`,
      });
    }
    const sf = pick(rng, ['cube', 'cylinder', 'cone', 'square_pyramid', 'rect_prism', 'tri_prism']);
    return mcn(rng, {
      prompt: `How many flat faces does a ${SOLID2[sf].name} have?`, visual: { type: 'solids', items: [{ solid: sf, color: pick(rng, PCOL) }] },
      correct: SOLID2[sf].faces, wrong: [SOLID2[sf].faces + 1, SOLID2[sf].faces - 1, 4, 6], min: 0, max: 10,
      hint: 'A face is a flat side. Count the top, the bottom, and each flat side all around, even the back you cannot see. Curved parts are not faces.', explain: `A ${SOLID2[sf].name} ${SOLID2[sf].desc}: ${SOLID2[sf].faces} flat face${SOLID2[sf].faces === 1 ? '' : 's'}.`,
    });
  }],
  // Faces of 3-D objects
  [3, 6, (t, rng) => {
    const cases = [['cube', 'square', ['circle', 'triangle', 'hexagon']], ['cylinder', 'circle', ['square', 'triangle', 'hexagon']], ['cone', 'circle', ['square', 'rectangle', 'hexagon']],
      ['square_pyramid', 'triangle', ['circle', 'hexagon', 'pentagon']], ['tri_prism', 'triangle', ['circle', 'hexagon', 'pentagon']], ['rect_prism', 'rectangle', ['circle', 'triangle', 'hexagon']]];
    const [s, face, wrong] = pick(rng, cases);
    const obj = { cube: 'a dice 🎲', cylinder: 'a soup can 🥫', cone: 'a party hat 🥳', square_pyramid: 'a pyramid 🔺', tri_prism: 'a tent ⛺', rect_prism: 'a cereal box 📦' }[s];
    return mcq(rng, {
      prompt: `Which 2-D shape is a face of ${obj}?`, visual: { type: 'solids', items: [{ solid: s, color: pick(rng, PCOL) }] },
      correct: face, wrong,
      hint: `Imagine tracing around one flat face of ${obj}. Is the tracing round (circle), 3 sides (triangle), 4 equal sides (square), 4 sides with 2 long (rectangle), or more sides?`, explain: `A ${SOLID2[s].name} has ${face} faces.`,
    });
  }],
  // Sorting with two attributes
  [4, 7, (t, rng) => {
    const sidesA = pick(rng, [3, 4]);
    const col = pick(rng, PCOL);
    const shapesWith = sidesA === 3 ? TRI : ['square', 'rectangle', 'trapezoid', 'rhombus'];
    const shapesWithout = sidesA === 3 ? ['square', 'hexagon', 'pentagon', 'circle'] : ['triangle', 'hexagon', 'pentagon', 'circle'];
    const otherCol = PCOL.filter((c) => c !== col);
    if (chance(rng, 0.5)) {
      const right = { shape: pick(rng, shapesWith), color: col, size: 'm' };
      const wrongs = [
        { shape: pick(rng, shapesWith), color: pick(rng, otherCol), size: 'm' },
        { shape: pick(rng, shapesWithout), color: col, size: 'm' },
        { shape: pick(rng, shapesWithout), color: pick(rng, otherCol), size: 'm' },
      ];
      return visq(rng, {
        prompt: `Which shape is ${col} AND has ${sidesA} sides?`,
        items: [{ visual: { type: 'shapes', items: [right] }, correct: true }, ...wrongs.map((w) => ({ visual: { type: 'shapes', items: [w] }, correct: false }))],
        hint: `Check both rules for each shape. Is it ${col}? Does it have ${sidesA} sides? Only one shape passes both.`, explain: `Only one shape is ${col} and has ${sidesA} sides.`,
      });
    }
    const group = sample(rng, shapesWith, 3).map((s, i) => ({ shape: s, color: col, size: ['s', 'm', 'l'][i], rotate: pick(rng, [0, 30, 90]) }));
    const other = sidesA === 3 ? 4 : 3;
    const oc = pick(rng, otherCol);
    return mcq(rng, {
      prompt: 'What is the sorting rule for this group?', visual: { type: 'shapes', items: group },
      correct: `${cap(col)} and ${sidesA} sides`, wrong: [`${cap(col)} and ${other} sides`, `${cap(oc)} and ${sidesA} sides`, `Big and ${sidesA} sides`],
      hint: 'Look at colour, number of sides and size. A sorting rule must be true for ALL the shapes. Test each choice on every shape.', explain: `Every shape is ${col} and has ${sidesA} sides. Their sizes are different.`,
    });
  }],
  // Composing and decomposing
  [5, 7, (t, rng) => {
    const combos = [
      { parts: [['trapezoid', 0], ['trapezoid', 180]], make: 'hexagon', n: 2, piece: 'trapezoids' },
      { parts: Array(3).fill(['equilateral_triangle', 0]), make: 'trapezoid', n: 3, piece: 'triangles' },
      { parts: Array(6).fill(['equilateral_triangle', 0]), make: 'hexagon', n: 6, piece: 'triangles' },
      { parts: [['equilateral_triangle', 0], ['equilateral_triangle', 180]], make: 'rhombus', n: 2, piece: 'triangles' },
      { parts: [['right_triangle', 0], ['right_triangle', 180]], make: 'square', n: 2, piece: 'triangles' },
      { parts: Array(3).fill(['rhombus', 0]), make: 'hexagon', n: 3, piece: 'rhombuses' },
    ];
    const c = pick(rng, combos);
    const col = pick(rng, PCOL);
    const v = t === 5 ? 0 : randInt(rng, 0, 2);
    const vis = { type: 'shapes', items: c.parts.map(([s, r]) => ({ shape: s, color: col, rotate: r, size: 's' })) };
    if (v === 0) {
      return mcq(rng, {
        prompt: 'Put these pieces together. What shape can you make?', visual: vis, correct: c.make,
        wrong: sample(rng, ['circle', 'pentagon', 'octagon', 'triangle', 'hexagon', 'trapezoid', 'rhombus', 'square'].filter((x) => x !== c.make && !(c.n === 6 && x === 'trapezoid') && !(c.make === 'hexagon' && x === 'trapezoid') && !(c.piece === 'triangles' && x === 'triangle')), 3),
        hint: 'Imagine sliding the pieces together with no gaps. Count the sides around the outside of the new shape. Then match: triangle 3, square, rhombus or trapezoid 4, pentagon 5, hexagon 6.', explain: `${c.n} ${c.piece} fit together to make a ${c.make}.`,
      });
    }
    if (v === 1) {
      return mcn(rng, {
        prompt: `How many ${c.piece} does it take to make one ${c.make}?`, visual: { type: 'shapes', items: [{ shape: c.make, color: col }] }, correct: c.n, wrong: [c.n + 1, c.n - 1, c.n * 2, 4], min: 1, max: 20,
        hint: 'Think of pattern blocks. Picture the pieces covering the whole shape with no gaps, and count them.', explain: `${c.n} ${c.piece} make a ${c.make}.`, explainVisual: vis,
      });
    }
    const reps = randInt(rng, 2, 3);
    return mcn(rng, {
      prompt: `${c.n} ${c.piece} make one ${c.make}. How many ${c.piece} make ${reps} ${c.make === 'rhombus' ? 'rhombuses' : `${c.make}s`}?`, visual: vis, correct: c.n * reps, wrong: [c.n + reps, c.n * reps + 1, c.n * reps - c.n, c.n], min: 1, max: 40,
      hint: `One ${c.make} needs ${c.n} ${c.piece}. Count by ${c.n}s, once for each ${c.make}: ${steps(0, c.n * reps, c.n)}`, explain: `${Array(reps).fill(c.n).join(' + ')} = ${c.n * reps}.`,
    });
  }],
  // Challenge counts
  [6, 7, (t, rng) => {
    const v = randInt(rng, 0, t === 7 ? 2 : 1);
    if (v === 0) {
      const [a, b] = sample(rng, ['triangle', 'square', 'pentagon', 'hexagon', 'trapezoid', 'rhombus'], 2);
      const askSides = chance(rng, 0.5);
      return mcn(rng, {
        prompt: `How many ${askSides ? 'sides' : 'corners'} do a ${a} and a ${b} have in all?`, visual: { type: 'shapes', items: [sItem(rng, a), sItem(rng, b)] },
        correct: SH2[a] + SH2[b], wrong: [SH2[a] + SH2[b] + 1, SH2[a] + SH2[b] - 1, Math.abs(SH2[a] - SH2[b]), SH2[a] * 2], min: 0, max: 30,
        hint: `Count the ${askSides ? 'sides' : 'corners'} of the ${a}. Then count the ${askSides ? 'sides' : 'corners'} of the ${b}. Add the two numbers.`, explain: `${cap(a)}: ${SH2[a]}. ${cap(b)}: ${SH2[b]}. ${SH2[a]} + ${SH2[b]} = ${SH2[a] + SH2[b]}.`,
      });
    }
    if (v === 1) {
      const s = pick(rng, ['triangle', 'square', 'pentagon', 'hexagon']);
      const n = randInt(rng, 2, 4);
      return mcn(rng, {
        prompt: `How many sides do ${n} ${s}s have in all?`, visual: { type: 'shapes', items: Array.from({ length: n }, () => sItem(rng, s, { size: 's' })) },
        correct: SH2[s] * n, wrong: [SH2[s] + n, SH2[s] * n + 1, SH2[s] * (n - 1), SH2[s]], min: 0, max: 40,
        hint: `Each ${s} has ${SH2[s]} sides. Add ${SH2[s]} for each of the ${n} ${s}s: ${steps(0, SH2[s] * n, SH2[s])}`, explain: `${Array(n).fill(SH2[s]).join(' + ')} = ${SH2[s] * n}.`,
      });
    }
    const s = pick(rng, ['cube', 'square_pyramid', 'tri_prism']);
    const verts = { cube: 8, square_pyramid: 5, tri_prism: 6 }[s];
    return mcn(rng, {
      prompt: `A corner where edges meet is called a vertex. How many vertices does a ${SOLID2[s].name} have?`, visual: { type: 'solids', items: [{ solid: s, color: pick(rng, PCOL) }] },
      correct: verts, wrong: [verts + 1, verts - 1, SOLID2[s].faces, verts + 2], min: 0, max: 20,
      hint: 'A vertex is a pointy corner where edges meet. Count the ones on the bottom, then the ones on top.', explain: `A ${SOLID2[s].name} has ${verts} vertices.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// g2-data-data (tallies, pictographs)
// ---------------------------------------------------------------------------
const DATASETS = [
  { title: 'Favourite Fruit', q: 'What is your favourite fruit?', cats: [['🍎', 'Apple'], ['🍌', 'Banana'], ['🍇', 'Grapes'], ['🍓', 'Berries'], ['🍊', 'Orange']] },
  { title: 'Favourite Pet', q: 'What pet do you like best?', cats: [['🐶', 'Dog'], ['🐱', 'Cat'], ['🐟', 'Fish'], ['🐰', 'Bunny'], ['🐦', 'Bird']] },
  { title: 'How We Get to School', q: 'How do you get to school?', cats: [['🚌', 'Bus'], ['🚶', 'Walk'], ['🚗', 'Car'], ['🚲', 'Bike']] },
  { title: 'Favourite Season', q: 'Which season do you like best?', cats: [['🌷', 'Spring'], ['☀️', 'Summer'], ['🍂', 'Fall'], ['❄️', 'Winter']] },
  { title: 'Favourite Snack', q: 'What snack do you like best?', cats: [['🥕', 'Carrots'], ['🧀', 'Cheese'], ['🍿', 'Popcorn'], ['🥨', 'Pretzel'], ['🍎', 'Apple']] },
  { title: 'Magic Creature', q: 'Which magic creature do you like best?', cats: [['🐉', 'Dragon'], ['🦄', 'Unicorn'], ['🦉', 'Owl'], ['🧜', 'Mermaid']] },
  { title: 'Favourite Sport', q: 'What sport do you like best?', cats: [['⚽', 'Soccer'], ['🏒', 'Hockey'], ['🏀', 'Basketball'], ['⚾', 'Baseball'], ['🏊', 'Swimming']] },
  { title: 'Favourite Weather', q: 'What weather do you like best?', cats: [['☀️', 'Sunny'], ['🌧️', 'Rainy'], ['☁️', 'Cloudy'], ['❄️', 'Snowy']] },
  { title: 'Favourite Bird', q: 'Which bird do you like best?', cats: [['🐦', 'Sparrow'], ['🐦‍⬛', 'Crow'], ['🦆', 'Duck'], ['🦉', 'Owl']] },
];
function mkData(rng, k, lo, hi, distinct = true, step = 1) {
  const ds = pick(rng, DATASETS);
  const cats = sample(rng, ds.cats, k);
  const range = [];
  for (let x = lo; x <= hi; x += step) range.push(x);
  const counts = distinct ? sample(rng, range, k) : cats.map(() => pick(rng, range));
  return { ds, cats, counts, rows: cats.map(([ic, nm], i) => ({ label: `${ic} ${nm}`, count: counts[i] })) };
}
// Grade 2 records data with tallies and shows it in one-to-one pictographs. (Bar graphs with a scale and
// pictographs where one picture stands for several votes come in Grade 3, so they are not used here.)
function dVis(rng, d, t, force) {
  let kind = force || (t <= 2 ? 'tally' : pick(rng, ['tally', 'picto']));
  if (kind === 'picto' && Math.max(...d.counts) > 12) kind = 'tally';
  if (kind === 'tally') return { type: 'tally', title: d.ds.title, rows: d.rows };
  return { type: 'pictograph', title: d.ds.title, rows: d.rows, icon: pick(rng, ['🙂', '⭐', '🟦', '❤️']), key: 1 };
}
const catName = (d, i) => d.cats[i][1];

const g2Data = F([
  // Read one category
  [1, 3, (t, rng) => {
    const d = mkData(rng, t === 1 ? 3 : 4, 2, t === 1 ? 10 : 15);
    const i = randInt(rng, 0, d.cats.length - 1);
    const vis = dVis(rng, d, t);
    return mcn(rng, {
      prompt: vis.type === 'tally' ? pick(rng, [`How many picked ${catName(d, i)}?`, `How many tallies for ${catName(d, i)}?`]) : `How many picked ${catName(d, i)}?`, visual: vis,
      correct: d.counts[i], wrong: [...d.counts.filter((_, j) => j !== i), d.counts[i] + 1, d.counts[i] - 1, d.counts[i] + 5], min: 0, max: 40,
      hint: vis.type === 'tally' ? `How many picked ${catName(d, i)}? A bundle of tally marks is five. Count the bundles by fives, then count on the single marks.` : `How many picked ${catName(d, i)}? Find that row and count the pictures.`, explain: `${catName(d, i)} has ${d.counts[i]}${d.counts[i] >= 5 ? `: ${Math.floor(d.counts[i] / 5)} bundle${d.counts[i] >= 10 ? 's' : ''} of 5 and ${d.counts[i] % 5} more` : ''}.`,
    });
  }],
  // Most / least
  [1, 4, (t, rng) => {
    const d = mkData(rng, t === 1 ? 3 : 4, 2, 16);
    const most = chance(rng, 0.5);
    const v = most ? Math.max(...d.counts) : Math.min(...d.counts);
    const i = d.counts.indexOf(v);
    return mcq(rng, {
      prompt: most ? 'Which was picked the most?' : 'Which was picked the least?', visual: dVis(rng, d, t),
      correct: `${d.cats[i][0]} ${d.cats[i][1]}`, wrong: d.cats.filter((_, j) => j !== i).map(([a, b]) => `${a} ${b}`),
      hint: `${most ? 'Most' : 'Least'} means the ${most ? 'biggest' : 'smallest'} number. Count each row, then compare.`, explain: `${catName(d, i)} has ${v}, the ${most ? 'most' : 'least'}.`,
    });
  }],
  // Which tally shows n?
  [2, 5, (t, rng) => {
    const n = randInt(rng, 4, t <= 3 ? 12 : 20);
    const label = pick(rng, ['🐶', '🍎', '⚽', '🌷', '🚲', '🦄']);
    const cands = [...new Set([n, n + 1, n - 1, n + 5, n - 5].filter((x) => x > 0))].slice(0, 4);
    return visq(rng, {
      prompt: `Which tally shows ${n}?`, items: cands.map((c) => ({ visual: { type: 'tally', rows: [{ label, count: c }] }, correct: c === n })),
      hint: `Count each tally: bundles by fives, then the single marks by ones. Which one reaches exactly ${n}?`, explain: `${n} is ${Math.floor(n / 5)} bundle${n >= 10 ? 's' : ''} of 5 and ${n % 5} more.`,
    });
  }],
  // Difference
  [3, 6, (t, rng) => {
    const d = mkData(rng, 4, 2, t <= 4 ? 15 : 20);
    const [i, j] = sample(rng, [0, 1, 2, 3], 2);
    const [hi, lo] = d.counts[i] > d.counts[j] ? [i, j] : [j, i];
    const more = chance(rng, 0.5);
    return mcn(rng, {
      prompt: more ? `How many more picked ${catName(d, hi)} than ${catName(d, lo)}?` : `How many fewer picked ${catName(d, lo)} than ${catName(d, hi)}?`, visual: dVis(rng, d, t),
      correct: d.counts[hi] - d.counts[lo], wrong: [d.counts[hi] + d.counts[lo], d.counts[hi], d.counts[lo], d.counts[hi] - d.counts[lo] + 1], min: 0, max: 60,
      hint: `How many ${more ? 'more' : 'fewer'} means the difference. Find the ${catName(d, hi)} and ${catName(d, lo)} numbers. Count up from the smaller one to the bigger one.`, explain: `${d.counts[hi]} − ${d.counts[lo]} = ${d.counts[hi] - d.counts[lo]}.`,
    });
  }],
  // Total
  [3, 6, (t, rng) => {
    const d = mkData(rng, t <= 4 ? 3 : 4, 2, 12, false);
    const tot = d.counts.reduce((a, b) => a + b, 0);
    return mcn(rng, {
      prompt: pick(rng, ['How many votes in all?', 'How many children answered the survey?']), visual: dVis(rng, d, t),
      correct: tot, wrong: [tot + 1, tot - 1, tot + 10, tot - d.counts[0], Math.max(...d.counts)], min: 0, max: 99,
      hint: `How many in all? Add every row: ${d.cats.map((c) => c[1]).join(' + ')}. Look for easy pairs first, like two that make ten.`, explain: `${d.counts.join(' + ')} = ${tot}.`,
    });
  }],
  // Two-step graph questions
  [6, 7, (t, rng) => {
    const d = mkData(rng, 4, 3, t === 6 ? 14 : 20);
    const tot = d.counts.reduce((a, b) => a + b, 0);
    const [i, j, l] = sample(rng, [0, 1, 2, 3], 3);
    if (chance(rng, 0.5)) {
      return mcn(rng, {
        prompt: `How many children did NOT pick ${catName(d, i)}?`, visual: dVis(rng, d, t),
        correct: tot - d.counts[i], wrong: [tot, d.counts[i], tot - d.counts[i] + 1, tot - d.counts[i] - 10], min: 0, max: 99,
        hint: `Two ways: add up every row except ${catName(d, i)}. Or find the total of all rows, then take away ${catName(d, i)}.`,
        explain: `Everyone else: ${d.counts.filter((_, x) => x !== i).join(' + ')} = ${tot - d.counts[i]}.`,
      });
    }
    const pair = d.counts[i] + d.counts[j];
    const [hiN, loN, hiIsPair] = pair >= d.counts[l] ? [pair, d.counts[l], true] : [d.counts[l], pair, false];
    return mcn(rng, {
      prompt: `${catName(d, i)} and ${catName(d, j)} together: how many ${hiIsPair ? 'more' : 'fewer'} votes than ${catName(d, l)}?`, visual: dVis(rng, d, t),
      correct: hiN - loN, wrong: [pair, hiN + loN, hiN - loN + 1, Math.abs(d.counts[i] - d.counts[l])], min: 0, max: 99,
      hint: `Two steps. First add the ${catName(d, i)} and ${catName(d, j)} numbers. Then find the difference between that total and ${catName(d, l)}.`,
      explain: `${d.counts[i]} + ${d.counts[j]} = ${pair}. ${hiN} − ${loN} = ${hiN - loN}.`,
    });
  }],
  // Conclusions
  [4, 6, (t, rng) => {
    const d = mkData(rng, 3, 2, 14);
    const st = [];
    for (const [x, y] of [[0, 1], [1, 2], [0, 2]]) {
      const b = d.counts[x] > d.counts[y] ? x : y, s = b === x ? y : x;
      st.push([`More picked ${catName(d, b)} than ${catName(d, s)}.`, true], [`More picked ${catName(d, s)} than ${catName(d, b)}.`, false]);
      st.push([`${d.counts[b] - d.counts[s]} more picked ${catName(d, b)} than ${catName(d, s)}.`, true], [`${d.counts[b] - d.counts[s] + 1} more picked ${catName(d, b)} than ${catName(d, s)}.`, false]);
    }
    const tot = d.counts.reduce((a, b) => a + b, 0);
    st.push([`${tot} children voted.`, true], [`${tot + 2} children voted.`, false]);
    const tr = pick(rng, st.filter((s) => s[1]));
    return mcq(rng, {
      prompt: 'Which sentence is true?', visual: dVis(rng, d, t), correct: tr[0], wrong: sample(rng, st.filter((s) => !s[1]), 3).map((s) => s[0]),
      hint: 'Read each sentence. Find those rows and their numbers. Check the math in the sentence: is it right?', explain: `The data: ${d.cats.map((c, i) => `${c[1]} ${d.counts[i]}`).join(', ')}. "${tr[0]}" is true.`,
    });
  }],
  // Collecting data
  [2, 5, (t, rng) => {
    const k = kid(rng);
    const v = randInt(rng, 0, 2);
    const ds = pick(rng, DATASETS);
    if (v === 0) {
      return mcq(rng, {
        prompt: `${k.name} asks 25 classmates a question. What is a quick way to record the answers?`, correct: 'Tally marks', wrong: ['Remember them all', 'Draw a big picture of each person', 'Write one long sentence'],
        hint: 'Tally marks are one quick mark for each answer, bundled in fives. Remembering is easy to get wrong. Pictures and sentences are slow. Which is quick and correct?', explain: 'Tally marks are quick: one mark per answer, bundled in 5s.',
      });
    }
    if (v === 1) {
      const d = mkData(rng, 3, 2, 10);
      return mcq(rng, {
        prompt: 'What question was asked to get this data?', visual: dVis(rng, d, t), correct: d.ds.q,
        wrong: sample(rng, DATASETS.filter((x) => x.title !== d.ds.title), 3).map((x) => x.q),
        hint: `The title says what the data is about: "${d.ds.title}". The labels are the answers people gave. Which question would get those answers?`, explain: `The data is about "${d.ds.title}", so the question was "${d.ds.q}"`,
      });
    }
    return mcq(rng, {
      prompt: `${k.name} wants to know the class's answer to "${ds.q}" Who should ${k.p} ask?`, correct: 'Everyone in the class',
      wrong: ['Only best friends', 'Only one person', 'People in another town'],
      hint: 'To learn about the class, the answers must come from the class. Best friends, one person, or people far away do not tell you about the whole class.', explain: 'Ask everyone in the class, so the data is fair.',
    });
  }],
  // Pictograph matching tally
  [5, 6, (t, rng) => {
    const d = mkData(rng, 3, 2, 9);
    const icon = pick(rng, ['🙂', '⭐', '❤️']);
    const mkG = (counts) => ({ type: 'pictograph', title: d.ds.title, rows: d.cats.map(([ic, nm], i) => ({ label: `${ic} ${nm}`, count: counts[i] })), icon, key: 1 });
    const c = d.counts;
    const alts = [[c[1], c[0], c[2]], [c[0], c[2], c[1]], [c[0] + 1, c[1], c[2]], [c[0], c[1], c[2] - 1], [c[2], c[1], c[0]], [c[0] - 1, c[1] + 1, c[2]]];
    const uniq = [];
    for (const a of alts) if (a.join() !== c.join() && a.every((x) => x > 0) && !uniq.some((u) => u.join() === a.join())) uniq.push(a);
    return visq(rng, {
      prompt: 'Which pictograph matches the tally chart?', visual: dVis(rng, d, t, 'tally'),
      items: [{ visual: mkG(c), correct: true }, ...uniq.slice(0, 3).map((a) => ({ visual: mkG(a), correct: false }))],
      hint: `Count the tallies in each row: ${d.cats.map((x) => x[1]).join(', ')}. Then check each pictograph row by row. The right one matches every count.`, explain: `The tallies show ${d.cats.map((x, i) => `${x[1]} ${c[i]}`).join(', ')}.`,
    });
  }],
  // Change and combine
  [5, 7, (t, rng) => {
    const d = mkData(rng, 3, 2, 15);
    const lo = d.counts.indexOf(Math.min(...d.counts)), hi = d.counts.indexOf(Math.max(...d.counts));
    const mid = [0, 1, 2].find((x) => x !== lo && x !== hi);
    const v = randInt(rng, 0, 2);
    if (v === 0) {
      return mcn(rng, {
        prompt: `How many more votes does ${catName(d, lo)} need to tie with ${catName(d, hi)}?`, visual: dVis(rng, d, t),
        correct: d.counts[hi] - d.counts[lo], wrong: [d.counts[hi], d.counts[hi] - d.counts[lo] + 1, d.counts[hi] + d.counts[lo], d.counts[hi] - d.counts[lo] - 1], min: 0, max: 60,
        hint: `A tie means the same number. How many more does ${catName(d, lo)} need to reach ${catName(d, hi)}? Count up from the smaller number to the bigger one.`, explain: `${d.counts[lo]} + ${d.counts[hi] - d.counts[lo]} = ${d.counts[hi]}.`,
      });
    }
    if (v === 1) {
      const sum = d.counts[lo] + d.counts[mid];
      const rel = sum > d.counts[hi] ? 'More' : sum < d.counts[hi] ? 'Fewer' : 'The same';
      return mcq(rng, {
        prompt: `Did ${catName(d, lo)} and ${catName(d, mid)} together get more or fewer votes than ${catName(d, hi)}?`, visual: dVis(rng, d, t),
        correct: rel, wrong: ['More', 'Fewer', 'The same'].filter((x) => x !== rel), count: 3,
        hint: `Add the ${catName(d, lo)} and ${catName(d, mid)} numbers together. Then compare that total with ${catName(d, hi)}: more, fewer, or the same?`, explain: `${d.counts[lo]} + ${d.counts[mid]} = ${sum}. ${catName(d, hi)} has ${d.counts[hi]}. ${rel === 'The same' ? 'They are the same.' : `${sum} is ${rel.toLowerCase()} than ${d.counts[hi]}.`}`,
      });
    }
    const add = randInt(rng, 2, 8);
    const nc = d.counts.slice();
    nc[lo] += add;
    const mx = Math.max(...nc);
    if (nc.filter((x) => x === mx).length > 1) return mcn(rng, { prompt: `${add} more children pick ${catName(d, lo)}. How many picked ${catName(d, lo)} now?`, visual: dVis(rng, d, t), correct: nc[lo], wrong: [d.counts[lo], add, nc[lo] + 1], min: 0, max: 60, hint: `Find the ${catName(d, lo)} row and count it. Then count on ${add} more.`, explain: `${d.counts[lo]} + ${add} = ${nc[lo]}.` });
    const i = nc.indexOf(mx);
    return mcq(rng, {
      prompt: `${add} more children pick ${catName(d, lo)}. Which has the most now?`, visual: dVis(rng, d, t),
      correct: `${d.cats[i][0]} ${d.cats[i][1]}`, wrong: d.cats.filter((_, j) => j !== i).map(([a, b]) => `${a} ${b}`),
      hint: `First add ${add} to ${catName(d, lo)}. Then compare all the rows. Which is biggest now?`, explain: `Now: ${d.cats.map((c, j) => `${c[1]} ${nc[j]}`).join(', ')}. ${catName(d, i)} has the most.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// g2-data-money
// ---------------------------------------------------------------------------
const MONEY = {
  nickel: 5, dime: 10, quarter: 25, loonie: 100, toonie: 200, bill5: 500, bill10: 1000, bill20: 2000,
};
const MNAME = { nickel: 'nickel', dime: 'dime', quarter: 'quarter', loonie: 'loonie', toonie: 'toonie', bill5: '$5 bill', bill10: '$10 bill', bill20: '$20 bill' };
const cents = (c) => (c >= 100 && c % 100 === 0 ? `$${c / 100}` : c < 100 ? `${c}¢` : `$${(c / 100).toFixed(2)}`);
const coinVis = (items) => ({ type: 'coins', items });
const SHOP = [['🍭', 'lollipop'], ['🖍️', 'crayon'], ['🎈', 'balloon'], ['🍪', 'cookie'], ['⭐', 'sticker'], ['🧃', 'juice box'], ['🍎', 'apple'], ['🪀', 'yo-yo'], ['🔮', 'magic marble'], ['✏️', 'pencil'], ['🧁', 'cupcake'], ['🦖', 'toy dinosaur']];

const g2Money = F([
  // Value of a coin or bill
  [1, 2, (t, rng) => {
    const m = pick(rng, Object.keys(MONEY));
    const k = kid(rng);
    return mcq(rng, {
      prompt: pick(rng, ['How much is this worth?', `${k.name} has this. How much money is it?`]), visual: coinVis([m]),
      correct: cents(MONEY[m]), wrong: sample(rng, Object.keys(MONEY).filter((x) => x !== m), 3).map((x) => cents(MONEY[x])),
      hint: 'First name it: coins are round metal, bills are paper. Then read the number printed on it. ¢ means cents, $ means dollars, and 100¢ = $1.', explain: `A ${MNAME[m]} is worth ${cents(MONEY[m])}.`,
    });
  }],
  // Which is worth more?
  [1, 3, (t, rng) => {
    const n = t === 1 ? 2 : 3;
    const items = sample(rng, Object.keys(MONEY), n);
    const most = chance(rng, 0.6);
    const tgt = items.reduce((p, c) => ((most ? MONEY[c] > MONEY[p] : MONEY[c] < MONEY[p]) ? c : p));
    return visq(rng, {
      prompt: `Which is worth ${n === 2 ? (most ? 'more' : 'less') : (most ? 'the most' : 'the least')}?`, items: items.map((x) => ({ visual: coinVis([x]), correct: x === tgt })),
      hint: 'Size does not tell the value. Read the number on each one. Remember 100¢ = $1, so any $ amount is worth more than a ¢ amount.', explain: `${items.map((x) => `${cap(MNAME[x])} ${cents(MONEY[x])}`).join(', ')}. The ${MNAME[tgt]} is worth the ${most ? 'most' : 'least'}.`,
    });
  }],
  // Order by value
  [2, 5, (t, rng) => {
    const items = sample(rng, t <= 3 ? ['nickel', 'dime', 'quarter', 'loonie', 'toonie'] : Object.keys(MONEY), t <= 3 ? 3 : 4);
    const up = chance(rng, 0.6);
    const sorted = items.slice().sort((a, b) => (up ? MONEY[a] - MONEY[b] : MONEY[b] - MONEY[a]));
    const alts = [sorted.slice().reverse(), [sorted[1], sorted[0], ...sorted.slice(2)], [...sorted.slice(0, -2), sorted[sorted.length - 1], sorted[sorted.length - 2]], [sorted[0], sorted[2], sorted[1], ...sorted.slice(3)]];
    return visq(rng, {
      prompt: up ? 'Which row goes from least to greatest value?' : 'Which row goes from greatest to least value?',
      items: [{ visual: coinVis(sorted), correct: true }, ...alts.filter((a, i, arr) => arr.findIndex((b) => b.join() === a.join()) === i && a.join() !== sorted.join()).slice(0, 3).map((a) => ({ visual: coinVis(a), correct: false }))],
      hint: `Find the value of each one first. Remember 100¢ = $1. Then check which row goes from ${up ? 'least to greatest' : 'greatest to least'}.`, explain: `${sorted.map((x) => cents(MONEY[x])).join(', ')}.`,
    });
  }],
  // Count one kind of coin to $1
  [2, 5, (t, rng) => {
    const c = pick(rng, t === 2 ? ['nickel', 'dime'] : ['nickel', 'dime', 'quarter']);
    const max = { nickel: t === 2 ? 8 : 20, dime: 10, quarter: 4 }[c];
    const n = randInt(rng, 2, max);
    const v = MONEY[c] * n;
    const step = MONEY[c];
    const k = kid(rng);
    return mcq(rng, {
      prompt: pick(rng, ['How much money is this?', `${k.name} empties ${k.pos} piggy bank. How much money?`]), visual: coinVis(Array(n).fill(c)),
      correct: cents(v), wrong: [cents(v + step), cents(v - step), `${n}¢`, cents(v + 10)].filter((x) => x !== cents(v) && !x.includes('-') && x !== '0¢'),
      hint: `Each ${c} is ${step}¢. Count by ${step}¢, one number for each coin: ${steps(0, v, step)}`, explain: `Count by ${step}s: ${Array.from({ length: n }, (_, i) => step * (i + 1)).join(', ')}. That is ${cents(v)}${v === 100 ? ' (100¢)' : ''}.`,
    });
  }],
  // 100 cents = 1 dollar
  [3, 5, (t, rng) => {
    const c = pick(rng, ['nickel', 'dime', 'quarter', 'cent']);
    if (c === 'cent') {
      return mcn(rng, {
        prompt: pick(rng, ['How many cents make $1?', '$1 = □¢']), speak: 'How many cents make one dollar?', correct: 100, wrong: [10, 1000, 50, 25], min: 1, max: 9999,
        hint: 'Think of dimes: ten dimes make one dollar. Count by tens, ten times.', explain: '$1 = 100¢.',
      });
    }
    const n = 100 / MONEY[c];
    return mcn(rng, {
      prompt: `How many ${c}s make $1?`, visual: coinVis(['loonie']), correct: n, wrong: [n + 1, n - 1, n * 2, 100 / n === n ? 10 : 100 / n, 5], min: 1, max: 100,
      hint: `A dollar is 100¢, and each ${c} is ${MONEY[c]}¢. Count by ${MONEY[c]}¢ up to 100¢, one ${c} at a time. How many coins?`, explain: `Count by ${MONEY[c]}s to 100: ${n} ${c}s. So ${n} ${c}s = $1.`,
    });
  }],
  // Buying
  [4, 6, (t, rng) => {
    const k = kid(rng);
    const [ic, item] = pick(rng, SHOP);
    const v = randInt(rng, 0, 2);
    if (v === 0) {
      const c = pick(rng, ['nickel', 'dime']);
      const n = randInt(rng, 3, c === 'nickel' ? 19 : 9);
      const cost = MONEY[c] * n;
      return mcn(rng, {
        prompt: `${cap(art(item))} ${ic} costs ${cost}¢. How many ${c}s does ${k.name} need?`, correct: n, wrong: [n + 1, n - 1, cost, n * 2], min: 1, max: 100,
        hint: `Each ${c} is ${MONEY[c]}¢. Count by ${MONEY[c]}¢ until you reach ${cost}¢, keeping track of how many coins.`, explain: `Count by ${MONEY[c]}s to ${cost}: ${n} ${c}s.`,
      });
    }
    if (v === 1) {
      const d = randInt(rng, 2, 9);
      return mcq(rng, {
        prompt: `${k.name} has ${d} dimes. How much more does ${k.p} need to make $1?`, visual: coinVis(Array(d).fill('dime')),
        correct: `${100 - d * 10}¢`, wrong: [`${d * 10}¢`, `${100 - d * 10 + 10}¢`, `${10 - d}¢`, `${100 - d}¢`].filter((x) => x !== `${100 - d * 10}¢`),
        hint: `Count ${k.name}'s dimes by tens. Then keep counting by tens up to 100¢. How much did you add?`, explain: `${d} dimes = ${d * 10}¢. ${d * 10} + ${100 - d * 10} = 100. ${k.P} needs ${100 - d * 10}¢.`,
      });
    }
    const n = randInt(rng, 1, 3);
    return mcq(rng, {
      prompt: `${k.name} has ${n} quarter${n > 1 ? 's' : ''}. ${cap(art(item))} ${ic} costs $1. How much more does ${k.p} need?`, visual: coinVis(Array(n).fill('quarter')),
      correct: `${100 - 25 * n}¢`, wrong: [`${25 * n}¢`, `${100 - 25 * n + 5}¢`, `${4 - n}¢`, `${100 - n}¢`].filter((x) => x !== `${100 - 25 * n}¢`),
      hint: `Four quarters make $1, and ${k.name} has ${n}. How many more quarters are needed? Then find what they are worth.`, explain: `${n} quarter${n > 1 ? 's' : ''} = ${25 * n}¢. ${100 - 25 * n}¢ more makes $1.`,
    });
  }],
  // Which makes $1?
  [5, 6, (t, rng) => {
    const sets = [
      [['quarter', 'quarter', 'quarter', 'quarter'], true], [Array(10).fill('dime'), true], [['loonie'], true], [['quarter', 'quarter', 'quarter'], false],
      [Array(9).fill('dime'), false], [['quarter', 'quarter', 'quarter', 'quarter', 'quarter'], false], [Array(11).fill('dime'), false], [['toonie'], false], [Array(8).fill('nickel'), false],
    ];
    const right = pick(rng, sets.filter((s) => s[1]));
    const wrong = sample(rng, sets.filter((s) => !s[1]), 3);
    return visq(rng, {
      prompt: pick(rng, ['Which group makes exactly $1?', 'Which coins make exactly 100¢?']),
      items: [{ visual: coinVis(right[0]), correct: true }, ...wrong.map((w) => ({ visual: coinVis(w[0]), correct: false }))],
      hint: 'Count each group: dimes by tens, quarters by 25s, nickels by fives. The right group makes exactly 100¢, not more and not less.', explain: `${right[0].length === 1 ? 'A loonie is $1.' : `${right[0].length} ${right[0][0]}s = 100¢ = $1.`}`,
    });
  }],
  // Challenge
  [6, 7, (t, rng) => {
    const k = kid(rng);
    const [ic, item] = pick(rng, SHOP);
    const v = randInt(rng, 0, t === 7 ? 3 : 1);
    if (v === 0) {
      const price = pick(rng, [10, 15, 20, 25, 30]), n = randInt(rng, 2, 3);
      const tot = price * n;
      if (tot > 100) return numq({ prompt: `${cap(art(item))} costs ${price}¢. How much for 2?`, answer: price * 2, speak: `${cap(art(item))} costs ${price} cents. How many cents for 2?`, hint: `Add the price twice: ${price} + ${price}.`, explain: `${price} + ${price} = ${price * 2}¢.` });
      return mcq(rng, {
        prompt: `${k.name} buys ${n} ${item}s ${ic}. Each costs ${price}¢. How much in all?`, correct: cents(tot), wrong: [cents(tot + price), cents(price), cents(tot - 5), `${price + n}¢`].filter((x) => x !== cents(tot)),
        hint: `Add ${price}¢ for each of the ${n} ${item}s. Count by ${price}s: ${steps(0, tot, price)}`, explain: `${Array(n).fill(price).join(' + ')} = ${tot}¢.`,
      });
    }
    if (v === 1) {
      const price = 5 * randInt(rng, 3, 19);
      return mcq(rng, {
        prompt: `${k.name} pays $1 for ${art(item)} ${ic} that costs ${price}¢. How much change?`, correct: `${100 - price}¢`,
        wrong: [`${100 - price + 10}¢`, `${100 - price - 5}¢`, `${price}¢`, `${Math.abs(price - 10)}¢`].filter((x) => x !== `${100 - price}¢`),
        hint: `Change is the money you get back. Count up from ${price}¢ to 100¢: first to the next ten, then by tens.`, explain: `${price} + ${100 - price} = 100. The change is ${100 - price}¢.`,
      });
    }
    if (v === 2) {
      // Compare two piles, each of one kind of coin (Grade 2 counts a single kind of coin; mixed coins come later)
      const m = twoKids(rng).find((x) => x.name !== k.name);
      const q = randInt(rng, 1, 4), d = randInt(rng, 2, 10);
      const vq = 25 * q, vd = 10 * d;
      const correct = vq === vd ? 'They have the same' : vq > vd ? k.name : m.name;
      return mcq(rng, {
        prompt: `${k.name} has ${q} quarter${q > 1 ? 's' : ''}. ${m.name} has ${d} dimes. Who has more money?`,
        visual: coinVis([...Array(q).fill('quarter'), ...Array(d).fill('dime')]),
        correct, wrong: [k.name, m.name, 'They have the same'].filter((x) => x !== correct), count: 3,
        hint: `Count ${k.name}'s quarters by 25s. Count ${m.name}'s dimes by 10s. Then compare the two amounts.`,
        explain: `${k.name}: ${Array.from({ length: q }, (_, i) => 25 * (i + 1)).join(', ')}, so ${vq}¢. ${m.name}: ${vd}¢. ${vq === vd ? 'They have the same.' : `${vq > vd ? k.name : m.name} has more.`}`,
      });
    }
    const [coin, bill] = pick(rng, [['loonie', 'bill5'], ['toonie', 'bill10'], ['loonie', 'bill10'], ['toonie', 'bill20']]);
    const n = MONEY[bill] / MONEY[coin];
    return mcn(rng, {
      prompt: `How many ${coin}s make a ${MNAME[bill]}?`, visual: coinVis([bill]), correct: n, wrong: [n + 1, n - 1, n * 2, n / 2], min: 1, max: 100,
      hint: `A ${coin} is worth ${cents(MONEY[coin])}. Count by ${cents(MONEY[coin])}, one ${coin} at a time, until you reach $${MONEY[bill] / 100}.`, explain: `Count by ${MONEY[coin] / 100}s to ${MONEY[bill] / 100}: ${n} ${coin}s make a ${MNAME[bill]}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// g2-classic-calendar (days in a week, months in a year)
// ---------------------------------------------------------------------------
function weekday(y, m, d) { return new Date(y, m - 1, d).getDay(); }
function daysIn(y, m) { return new Date(y, m, 0).getDate(); }
const EVENTS = ['party 🎉', 'swim lesson 🏊', 'library day 📚', 'trip to the farm 🐄', 'music show 🎵', 'skating day ⛸️', 'science fair 🔬', 'pizza lunch 🍕'];

const g2Calendar = F([
  // Days in a week, next/previous day
  [1, 3, (t, rng) => {
    const k = kid(rng);
    if (chance(rng, 0.4)) {
      return mcn(rng, {
        prompt: pick(rng, ['How many days are in a week?', `${k.name} visits Grandma for 1 week. How many days is that?`]),
        visual: { type: 'calendar', month: randInt(rng, 1, 12), year: 2026 }, correct: 7, wrong: [5, 6, 10, 12, 4], min: 1, max: 31,
        hint: 'Say the days of the week, starting with Sunday, one finger for each day. Or count the columns on the calendar.', explain: `${DAYS.join(', ')}: 7 days.`,
      });
    }
    const d = randInt(rng, 0, 6);
    const after = chance(rng, 0.5);
    const ans = DAYS[(d + (after ? 1 : 6)) % 7];
    return mcq(rng, {
      prompt: `What day comes ${after ? 'after' : 'before'} ${DAYS[d]}?`, correct: ans, wrong: [DAYS[(d + (after ? 6 : 1)) % 7], DAYS[(d + (after ? 2 : 5)) % 7], DAYS[d]],
      hint: `Say the days of the week in order until you reach ${DAYS[d]}. ${after ? 'After means the next day.' : 'Before means the day just before it.'} The week goes around: after the last day, start again.`, explain: `${DAYS[(d + 6) % 7]}, ${DAYS[d]}, ${DAYS[(d + 1) % 7]}.`,
    });
  }],
  // Months in a year
  [2, 4, (t, rng) => {
    const k = kid(rng);
    const v = randInt(rng, 0, 2);
    if (v === 0) {
      return mcn(rng, {
        prompt: pick(rng, ['How many months are in a year?', `How many months is it from ${k.name}'s birthday to ${k.pos} next birthday?`]), correct: 12, wrong: [10, 7, 4, 11, 30, 52], min: 1, max: 60,
        hint: 'Say the months, starting with January. Hold up one finger for each month, then count.', explain: `${MONTHS.join(', ')}: 12 months.`,
      });
    }
    if (v === 1) {
      const i = randInt(rng, 0, 11), after = chance(rng, 0.5);
      const ans = MONTHS[(i + (after ? 1 : 11)) % 12];
      return mcq(rng, {
        prompt: `What month comes ${after ? 'after' : 'before'} ${MONTHS[i]}?`, correct: ans, wrong: [MONTHS[(i + (after ? 11 : 1)) % 12], MONTHS[(i + (after ? 2 : 10)) % 12], MONTHS[i]],
        hint: `Say the months in order until you reach ${MONTHS[i]}. ${after ? 'After means the next month.' : 'Before means the month just before it.'} The year goes around: after the last month, start again.`, explain: `${MONTHS[(i + 11) % 12]}, ${MONTHS[i]}, ${MONTHS[(i + 1) % 12]}.`,
      });
    }
    const first = chance(rng, 0.5);
    return mcq(rng, {
      prompt: first ? 'Which is the first month of the year?' : 'Which is the last month of the year?', correct: first ? 'January' : 'December',
      wrong: sample(rng, MONTHS.filter((m) => m !== (first ? 'January' : 'December')), 3), hint: `Picture a calendar with a page for each month. Which month is on the ${first ? 'first' : 'last'} page of the year?`,
      explain: 'The year starts in January and ends in December.',
    });
  }],
  // Weeks to days
  [3, 5, (t, rng) => {
    const k = kid(rng);
    const w = randInt(rng, 2, t === 3 ? 3 : 4);
    const extra = t >= 4 && chance(rng, 0.5) ? randInt(rng, 1, 6) : 0;
    const what = pick(rng, ['camp', 'holiday', 'trip to the cottage', 'swim camp', 'visit to Grandpa', 'hockey camp']);
    return mcn(rng, {
      prompt: `${k.name}'s ${what} lasts ${w} weeks${extra ? ` and ${extra} day${extra > 1 ? 's' : ''}` : ''}. How many days is that?`,
      correct: 7 * w + extra, wrong: [w + extra, 7 * w, 7 * w + extra + 7, 5 * w + extra], min: 1, max: 60,
      hint: `Each week has 7 days. Count by 7s, ${w} times: ${steps(0, 7 * w, 7)}${extra ? ` Then add the ${extra} extra day${extra > 1 ? 's' : ''}.` : ''}`, explain: `${Array(w).fill(7).join(' + ')}${extra ? ` + ${extra}` : ''} = ${7 * w + extra} days.`,
    });
  }],
  // Calendar reading
  [4, 6, (t, rng) => {
    const m = randInt(rng, 1, 12), y = 2026;
    const k = kid(rng);
    const v = randInt(rng, 0, 2);
    if (v === 0) {
      const day = randInt(rng, 1, daysIn(y, m));
      const wd = weekday(y, m, day);
      return mcq(rng, {
        prompt: `${k.name}'s ${pick(rng, EVENTS)} is on ${MONTHS[m - 1]} ${day}. What day of the week is that?`, visual: { type: 'calendar', month: m, year: y, highlight: [day] },
        correct: DAYS[wd], wrong: [DAYS[(wd + 1) % 7], DAYS[(wd + 6) % 7], DAYS[(wd + 2) % 7]],
        hint: `Find ${MONTHS[m - 1]} ${day} on the calendar. Slide your finger straight up its column to the day name at the top.`, explain: `${MONTHS[m - 1]} ${day} is a ${DAYS[wd]}.`,
      });
    }
    if (v === 1) {
      const wd = randInt(rng, 0, 6);
      let cnt = 0;
      for (let d = 1; d <= daysIn(y, m); d++) if (weekday(y, m, d) === wd) cnt++;
      return mcn(rng, {
        prompt: `How many ${DAYS[wd]}s are in this month?`, visual: { type: 'calendar', month: m, year: y }, correct: cnt, wrong: [cnt === 4 ? 5 : 4, 7, 3, 6], min: 1, max: 31,
        hint: `Find the ${DAYS[wd]} column. Count the dates in it from top to bottom. Some columns are longer than others.`, explain: `There are ${cnt} ${DAYS[wd]}s in ${MONTHS[m - 1]} ${y}.`,
      });
    }
    const day = randInt(rng, 1, daysIn(y, m) - 7);
    const n = day + 14 <= daysIn(y, m) && t >= 5 ? pick(rng, [1, 2]) : 1;
    return mcn(rng, {
      prompt: `${k.name}'s ${pick(rng, EVENTS)} is on the ${ordWord(day)}. The next one is ${n} week${n > 1 ? 's' : ''} later. What is the date?`,
      visual: { type: 'calendar', month: m, year: y, highlight: [day] }, correct: day + 7 * n, wrong: [day + n, day + 7 * n + 1, day + 7 * n - 1, day + 10], min: 1, max: 31,
      hint: `One week is 7 days. On a calendar that is one row down, in the same column. Start at the ${ordWord(day)} and move down ${n === 1 ? 'one row' : 'two rows'}.`, explain: `${n} week${n > 1 ? 's' : ''} = ${7 * n} days. ${day} + ${7 * n} = ${day + 7 * n}.`,
    });
  }],
  // Bigger relationships
  [5, 7, (t, rng) => {
    const v = randInt(rng, 0, 3);
    const k = kid(rng);
    if (v === 0) {
      const w = randInt(rng, 2, 4);
      return mcn(rng, {
        prompt: `${7 * w} days = □ weeks`, correct: w, wrong: [w + 1, 7 * w, w * 2, 7], min: 1, max: 100,
        hint: `Each week is 7 days. How many 7s make ${7 * w}? Count by 7s and keep track: ${steps(0, 7 * w, 7)}`, explain: `${Array(w).fill(7).join(' + ')} = ${7 * w}. That is ${w} weeks.`,
      });
    }
    if (v === 1) {
      const yrs = pick(rng, [2, 2, 3]);
      const half = chance(rng, 0.4);
      if (half) {
        return mcn(rng, {
          prompt: 'How many months are in half a year?', correct: 6, wrong: [12, 5, 4, 24], min: 1, max: 60,
          hint: 'A year has 12 months. Half means two equal parts. Split 12 into two equal groups.', explain: 'Half of 12 is 6. Half a year is 6 months.',
        });
      }
      return mcn(rng, {
        prompt: `How many months are in ${yrs} years?`, correct: 12 * yrs, wrong: [12 + yrs, 12, 10 * yrs, 12 * yrs + 12], min: 1, max: 60,
        hint: `Each year has 12 months. Add 12 for each of the ${yrs} years: ${steps(0, 12 * yrs, 12)}`, explain: `${Array(yrs).fill(12).join(' + ')} = ${12 * yrs} months.`,
      });
    }
    if (v === 2) {
      const i = randInt(rng, 0, 11), n = randInt(rng, 2, t === 5 ? 4 : 7);
      const ans = MONTHS[(i + n) % 12];
      return mcq(rng, {
        prompt: `${k.name}'s birthday is ${n} months after ${MONTHS[i]}. Which month is it?`, correct: ans,
        wrong: [MONTHS[(i + n - 1) % 12], MONTHS[(i + n + 1) % 12], MONTHS[(i + 12 - n) % 12]].filter((x) => x !== ans),
        hint: `Start at ${MONTHS[i]}. Say the months after it, one finger for each, until you have counted ${n}. After December comes January.`, explain: `Counting ${n} months from ${MONTHS[i]}: ${Array.from({ length: n }, (_, j) => MONTHS[(i + j + 1) % 12]).join(', ')}.`,
      });
    }
    const d = randInt(rng, 0, 6), n = randInt(rng, 8, t === 7 ? 20 : 14);
    const ans = DAYS[(d + n) % 7];
    return mcq(rng, {
      prompt: `Today is ${DAYS[d]}. ${k.name}'s trip is in ${n} days. What day will it be?`, correct: ans,
      wrong: [DAYS[(d + n + 1) % 7], DAYS[(d + n + 6) % 7], DAYS[(d + n - 7 + 2 + 7) % 7]].filter((x) => x !== ans),
      hint: `${n} days is ${Math.floor(n / 7)} week${n >= 14 ? 's' : ''} and ${n % 7} day${n % 7 === 1 ? '' : 's'}. A week later is the same day of the week. So start at ${DAYS[d]} and count on just the extra days.`,
      explain: `${n} = ${7 * Math.floor(n / 7)} + ${n % 7}. After ${Math.floor(n / 7)} week${n >= 14 ? 's' : ''} it is ${DAYS[d]} again. ${n % 7} more day${n % 7 === 1 ? '' : 's'}: ${ans}.`,
    });
  }],
]);

// ---------------------------------------------------------------------------
// Skill list
// ---------------------------------------------------------------------------
export const skills = [
  {
    id: 'g2-qpv-represent', grade: 2, strand: 'number', bigIdea: 'qpv', species: 'numberling', name: 'Numbers to 200', classic: false,
    parentDesc: 'Reads and writes numbers to 200; hundreds, tens and ones with zero as a placeholder; renames numbers (109 = 10 tens and 9 ones); compares with <, > and =; even and odd; nearest ten; benchmarks 50, 100 and 150; estimating; numbers as labels.',
    gen: g2Represent,
  },
  {
    id: 'g2-qpv-fractions', grade: 2, strand: 'number', bigIdea: 'qpv', species: 'fractling', name: 'Halves, Thirds and Fourths', classic: false,
    parentDesc: 'Partitions wholes and sets into halves, thirds and fourths; compares their sizes; counts by fourths and thirds past one whole.',
    gen: g2Fractions,
  },
  {
    id: 'g2-qpv-count', grade: 2, strand: 'number', bigIdea: 'qpv', species: 'counter', name: 'Counting to 200', classic: false,
    parentDesc: 'Uses ordinals to 10th; counts forward and back by 1s within 200; skip counts by 2s, 5s and 10s (by 10s from any number); finds 10 more or less and 2 before or after; orders numbers.',
    gen: g2Count,
  },
  {
    id: 'g2-ops-addsub', grade: 2, strand: 'number', bigIdea: 'ops', species: 'addsub', name: 'Adding and Subtracting to 100', classic: false,
    parentDesc: 'Adds to 100 and does the matching subtraction with flexible strategies; solves join, separate, part-part-whole and compare story problems with the unknown in any position.',
    gen: g2AddSub,
  },
  {
    id: 'g2-ops-facts', grade: 2, strand: 'number', bigIdea: 'ops', species: 'factsprite', name: 'Fact Power to 20', classic: false,
    parentDesc: 'Fluency with addition and subtraction facts to 20 using doubles, near doubles, making 10 and think-addition.',
    gen: g2Facts,
  },
  {
    id: 'g2-pat-patterns', grade: 2, strand: 'patterns', bigIdea: 'patterns', species: 'patternkin', name: 'Repeating and Growing Patterns', classic: false,
    parentDesc: 'Extends and describes repeating patterns with 3 or 4 terms and 2 attributes; extends increasing patterns within 200; translates patterns; finds errors and missing terms.',
    gen: g2Patterns,
  },
  {
    id: 'g2-pat-unknown', grade: 2, strand: 'patterns', bigIdea: 'patterns', species: 'balancer', name: 'Mystery Numbers', classic: false,
    parentDesc: 'Finds the unknown in any position (□ + 30 = 50, 100 − □ = 20); uses the turn-around (commutative) and grouping (associative) properties and adding or subtracting zero; equal and not equal.',
    gen: g2Unknown,
  },
  {
    id: 'g2-meas-time', grade: 2, strand: 'shape', bigIdea: 'measurement', species: 'clockwork', name: 'Seconds and Minutes', classic: false,
    parentDesc: 'Uses referents for 1 second and 1 minute, chooses seconds or minutes, knows 60 seconds = 1 minute, and compares durations.',
    gen: g2Time,
  },
  {
    id: 'g2-meas-length', grade: 2, strand: 'shape', bigIdea: 'measurement', species: 'measurer', name: 'Centimetres and Decimetres', classic: false,
    parentDesc: 'Measures length in centimetres; uses referents for cm and dm; knows 1 dm = 10 cm; relates unit size to the count; knows when precision matters.',
    gen: g2Length,
  },
  {
    id: 'g2-geo-shapes', grade: 2, strand: 'shape', bigIdea: 'geometry', species: 'shapeshifter', name: 'Shapes and Solids', classic: false,
    parentDesc: 'Names and sorts 2-D shapes (including hexagons, trapezoids and rhombuses) and 3-D solids; knows which attributes matter; composes and decomposes shapes.',
    gen: g2Shapes,
  },
  {
    id: 'g2-data-data', grade: 2, strand: 'stats', bigIdea: 'data', species: 'datapup', name: 'Tallies and Pictographs', classic: false,
    parentDesc: 'Reads tally charts and pictographs, compares categories, finds totals and differences, and draws conclusions from data.',
    gen: g2Data,
  },
  {
    id: 'g2-data-money', grade: 2, strand: 'stats', bigIdea: 'data', species: 'coinling', name: 'Money to $1', classic: false,
    parentDesc: 'Orders coins and bills by value, counts one kind of coin up to $1, knows 100¢ = $1, and uses money to buy things.',
    gen: g2Money,
  },
  {
    id: 'g2-classic-calendar', grade: 2, strand: 'shape', bigIdea: 'measurement', species: 'clockwork', name: 'Calendar Days and Months', classic: true,
    parentDesc: 'Classic outcome: days in a week and months in a year, used to solve calendar problems.',
    gen: g2Calendar,
  },
];

export const SKIPPED = [
  { skillId: 'g2-qpv-represent', indicator: 'Write number words to 200', reason: 'Spelling cannot be checked with taps; covered by reading number words.' },
  { skillId: 'g2-pat-patterns', indicator: 'Create repeating and increasing patterns', reason: 'Open-ended building; covered by extending, describing, translating and fixing patterns.' },
  { skillId: 'g2-data-data', indicator: 'Collect data about self and others', reason: 'Needs a real survey; adapted to choosing how to collect and record data.' },
  { skillId: 'g2-meas-length', indicator: 'Measure real objects with non-standard and standard units', reason: 'Needs real objects; adapted to pictured rulers and unit-size reasoning.' },
  { skillId: 'g2-meas-time', indicator: 'Use a timer to measure seconds and minutes', reason: 'Needs a real timer; adapted to referent and unit-choice questions.' },
];

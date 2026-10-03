// Small seeded random number generator (mulberry32) plus helpers used by game logic.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const newSeed = () => (Math.random() * 2 ** 32) >>> 0;
export const rng = () => mulberry32(newSeed());

export function weightedPick(rand, entries) {
  // entries: [[value, weight], ...]
  const total = entries.reduce((s, [, w]) => s + Math.max(0, w), 0);
  if (total <= 0) return entries[0]?.[0];
  let r = rand() * total;
  for (const [v, w] of entries) {
    r -= Math.max(0, w);
    if (r <= 0) return v;
  }
  return entries[entries.length - 1][0];
}

export const randRange = (rand, a, b) => a + Math.floor(rand() * (b - a + 1));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

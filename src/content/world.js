// World layout: the Academy town in the centre and one region per strand around it (a pinwheel, so the regions
// never overlap). Each region is a loop of four subzones, each deeper one bigger than the last (about 1×, 1.5×, 2×
// and 2.5× the ground of area 1), so longer quests deeper in come with more ground to explore:
//   area 1 → ⚔ Challenge → area 2 → 🛡️ Mini Guardian → area 3 → ⚔ Challenge → area 4 → 👑 Guardian (final boss)
// Challenges (groups of stronger wild pets) fight once most of the current area's quests are done. The Mini Guardian
// is the mid-game milestone: it fights only once area 2 is finished in every region. The Guardian waits at the far end
// of area 4 and wakes when area 4's quests are done; beating it completes the region.
// Inside a subzone, open clearings are joined by narrow paths, with dead-end pockets hiding treasure.
// Everything comes from fixed seeds plus the tables below, so every kid gets the same world.
import { mulberry32 } from '../core/rng.js';
import { SPECIES } from './species.js';

export const W = 140, H = 130;        // tiles
export const TILE = 48;
export const SUBZONES = 4;
// The town was designed at tiles (38..65, 33..54); it now sits TX, TY further right and down.
const TX = 20, TY = 21;
const tp = (x, y) => [x + TX, y + TY];
// Subzone sizes [TUNABLE] as (along the town side, away from town), about 1×, 1.5×, 2× and 2.5× the ground of area 1.
const SIZE = { 1: [22, 18], 2: [27, 22], 3: [32, 25], 4: [36, 28] };
// Each region is an arm beside the town. In arm coordinates (u along the town side, v away from it) the four
// subzones sit as a loop: 1 by the town, 2 beyond it, 3 across, 4 back towards the town (never touching area 1).
const ARM = { 1: [0, 0], 2: [0, 18], 3: [27, 28], 4: [27, 0] };
const T0 = { x0: 38 + TX, y0: 33 + TY, x1: 65 + TX, y1: 54 + TY };   // the town's tiles
// Arm directions: Starfall north (running east along the top of town), Tanglewood east (running south), Stoneworks
// south (running west), Stormcoast west (running north). Each returns the tile rectangle of an arm rectangle.
const ARM_TO_WORLD = {
  north: (u0, v0, u1, v1) => [T0.x0 + u0, T0.y0 - 1 - v1, T0.x0 + u1, T0.y0 - 1 - v0],
  east: (u0, v0, u1, v1) => [T0.x1 + 1 + v0, T0.y0 + u0, T0.x1 + 1 + v1, T0.y0 + u1],
  south: (u0, v0, u1, v1) => [T0.x1 - u1, T0.y1 + 1 + v0, T0.x1 - u0, T0.y1 + 1 + v1],
  west: (u0, v0, u1, v1) => [T0.x0 - 1 - v1, T0.y1 - u1, T0.x0 - 1 - v0, T0.y1 - u0],
};

// Per subzone depth [TUNABLE]: wild pet level range and the question tier floor (deeper = tougher).
const DEPTH = {
  1: { pet: [2, 7], minTier: 1 },
  2: { pet: [5, 10], minTier: 1 },
  3: { pet: [8, 13], minTier: 2 },
  4: { pet: [11, 18], minTier: 2 },
};

// Regions: arm = which side of town the region sits on. hub = the road from town. trainers: one per subzone in
// walking order, plus a second one in area 4.
const REGION_PLAN = {
  number: {
    arm: 'north',
    names: ['Starfall Highlands', 'Crystal Hollow', 'Comet Ridge', 'Starfall Summit'],
    hub: { pa: tp(51, 35), pb: tp(51, 30) },
    guardian: 'The Star Guardian', warden: 'The Star Warden',
    trainers: [['Wizard Orion', 'trainer1', [['numberling', 0], ['counter', 1]]], ['Wizard Lyra', 'trainer2', [['fractling', 1], ['addsub', 2]]],
      ['Wizard Cassio', 'trainer4', [['fractling', 1], ['addsub', 2]]], ['Sage Vega', 'trainer3', [['percenta', 2], ['multiplier', 2]]],
      ['Sage Nova', 'trainer2', [['factsprite', 2], ['multiplier', 3]]]],
    rares: ['fractling', 'factsprite', 'multiplier', 'orderling'],
  },
  patterns: {
    arm: 'east',
    names: ['Tanglewood', 'Mossy Glade', 'Whispering Grove', 'Deep Tanglewood'],
    hub: { pa: tp(63, 45), pb: tp(68, 45) },
    guardian: 'The Rhythm Guardian', warden: 'The Rhythm Warden',
    trainers: [['Wizard Fern', 'trainer2', [['patternkin', 0], ['hummbit', 1]]], ['Wizard Rowan', 'trainer4', [['balancer', 1], ['patternkin', 2]]],
      ['Wizard Ivy', 'trainer1', [['equalizard', 1], ['balancer', 2]]], ['Sage Willow', 'trainer1', [['funcshroom', 2], ['balancer', 3]]],
      ['Sage Bramble', 'trainer3', [['equalizard', 2], ['funcshroom', 3]]]],
    rares: ['balancer', 'equalizard', 'funcshroom', 'chamelix'],
  },
  shape: {
    arm: 'south',
    names: ['Stoneworks Canyon', 'Pillar Pass', 'Echo Gorge', 'Stoneworks Depths'],
    hub: { pa: tp(51, 52), pb: tp(51, 57) },
    guardian: 'The Stone Guardian', warden: 'The Stone Warden',
    trainers: [['Wizard Euclid', 'trainer3', [['shapeshifter', 0], ['clockwork', 1]]], ['Wizard Tess', 'trainer1', [['clockwork', 1], ['prismouse', 2]]],
      ['Wizard Hypatio', 'trainer2', [['prismouse', 1], ['measurer', 2]]], ['Sage Pythia', 'trainer4', [['angler', 2], ['measurer', 3]]],
      ['Sage Archimedo', 'trainer2', [['areadillo', 2], ['measurer', 3]]]],
    rares: ['measurer', 'prismouse', 'areadillo', 'angler'],
  },
  stats: {
    arm: 'west',
    names: ['Stormcoast', 'Driftwood Bay', 'Thunder Bluffs', 'Stormcoast Cliffs'],
    hub: { pa: tp(40, 45), pb: tp(35, 45) },
    guardian: 'The Storm Guardian', warden: 'The Storm Warden',
    trainers: [['Wizard Marina', 'trainer4', [['datapup', 0], ['coinling', 1]]], ['Wizard Gale', 'trainer2', [['chancewing', 1], ['datapup', 2]]],
      ['Wizard Corwin', 'trainer3', [['tallyfin', 1], ['chancewing', 2]]], ['Sage Nimbus', 'trainer3', [['pictobear', 2], ['chancewing', 3]]],
      ['Sage Tempest', 'trainer4', [['tallyfin', 2], ['pictobear', 3]]]],
    rares: ['chancewing', 'tallyfin', 'pictobear', 'histohawk'],
  },
};
// Which subzones have a portal camp (fast travel; stepping on a portal also heals the team). v60: every subzone.
const CAMP_DEPTHS = [1, 2, 3, 4];

// Area rectangles (inclusive tile coords). level 0 = town; level 1–4 = subzone depth in its region.
export const AREAS = [{ id: 'hub', name: 'Math Wizard Academy', region: 'hub', theme: 'academy', level: 0, x0: 38 + TX, y0: 33 + TY, x1: 65 + TX, y1: 54 + TY }];
for (const [region, R] of Object.entries(REGION_PLAN)) {
  for (let d = 1; d <= SUBZONES; d++) {
    const [u0, v0] = ARM[d], [su, sv] = SIZE[d];
    const [x0, y0, x1, y1] = ARM_TO_WORLD[R.arm](u0, v0, u0 + su - 1, v0 + sv - 1);
    AREAS.push({ id: `${region}-${d}`, name: R.names[d - 1], region, theme: region, level: d, x0, y0, x1, y1, pet: DEPTH[d].pet, minTier: DEPTH[d].minTier });
  }
}
export const areaById = (id) => AREAS.find((a) => a.id === id);
/** The next subzone deeper in the same region (null at the end). */
export const nextArea = (areaId) => { const a = areaById(areaId); return a && a.level > 0 ? areaById(`${a.region}-${a.level + 1}`) || null : null; };
/** "Area 2 of 4"-style label. */
export const depthLabel = (a) => (a && a.level > 0 ? `Area ${a.level} of ${SUBZONES}` : 'Home base');

// Which species live in each region (75% native strand, 25% wanderers from other strands) [TUNABLE].
export const REGION_SPECIES = {
  number: ['numberling', 'counter', 'fractling', 'percenta', 'addsub', 'factsprite', 'multiplier', 'orderling', 'primeflare'],
  patterns: ['patternkin', 'hummbit', 'balancer', 'equalizard', 'funcshroom', 'chamelix', 'arborithm', 'coinling', 'mirrorwing'],   // plus two pattern-loving guests
  shape: ['clockwork', 'measurer', 'angler', 'shapeshifter', 'mirrorwing', 'prismouse', 'areadillo', 'golemetry'],
  stats: ['datapup', 'chancewing', 'coinling', 'tallyfin', 'histohawk', 'pictobear', 'meanicorn'],
};
export const WANDERER_SHARE = 0.25;

// ---------- links between areas ----------
// Where areas connect: pa is inside area a, pb inside area b (2 tiles from their edges).
// keeper: a Challenge guards it (id `gk-<b>`); gate: the Guardian's rune gate.
export const LINKS = [];
const keeperId = (toAreaId) => `gk-${toAreaId}`;
{
  const rand = mulberry32(4242);
  const jit = (n) => Math.round((rand() * 2 - 1) * n);
  for (const [region, R] of Object.entries(REGION_PLAN)) {
    LINKS.push({ a: 'hub', b: `${region}-1`, pa: R.hub.pa, pb: R.hub.pb, road: true });
    for (let d = 1; d < SUBZONES; d++) {
      const A = areaById(`${region}-${d}`), B = areaById(`${region}-${d + 1}`);
      let pa, pb, gate;
      if (A.x1 + 1 === B.x0 || B.x1 + 1 === A.x0) {          // side by side: a horizontal road
        const lo = Math.max(A.y0, B.y0), hi = Math.min(A.y1, B.y1);
        const y = Math.max(lo + 4, Math.min(hi - 5, Math.round((lo + hi) / 2) + jit(3)));
        const right = A.x1 + 1 === B.x0;
        pa = [right ? A.x1 - 2 : A.x0 + 2, y]; pb = [right ? B.x0 + 2 : B.x1 - 2, y];
        gate = { x: Math.floor((pa[0] + pb[0]) / 2), y, orient: 'v' };
      } else {                                               // one above the other: a vertical road
        const lo = Math.max(A.x0, B.x0), hi = Math.min(A.x1, B.x1);
        const x = Math.max(lo + 4, Math.min(hi - 5, Math.round((lo + hi) / 2) + jit(3)));
        const down = A.y1 + 1 === B.y0;
        pa = [x, down ? A.y1 - 2 : A.y0 + 2]; pb = [x, down ? B.y0 + 2 : B.y1 - 2];
        gate = { x, y: Math.floor((pa[1] + pb[1]) / 2), orient: 'h' };
      }
      const L = { a: A.id, b: B.id, pa, pb, road: true };
      L.keeper = keeperId(B.id);
      if (d === 2) { L.mini = true; L.miniName = R.warden; }   // the Mini Guardian at the door to area 3
      LINKS.push(L);
    }
  }
}

// ---------- features ----------
// Hand-placed town, generated subzones. Coordinates are tile positions.
// Trainers battle once; challenge pets and chests are one-time; the guardian wakes after quests.
export const FEATURES = {
  hub: {
    npcs: [
      { id: 'professor', kind: 'professor', x: 49 + TX, y: 40 + TY, name: 'Professor Hypatia', talk: 'professor' },
      { id: 'healer', kind: 'healer', x: 44 + TX, y: 46 + TY, name: 'Nurse Maple', talk: 'healer' },
      { id: 'shopkeeper', kind: 'shopkeeper', x: 58 + TX, y: 46 + TY, name: 'Gideon the Merchant', talk: 'shop' },
    ],
    portal: { x: 51 + TX, y: 49 + TY },
    buildings: [
      { prop: 'academy', x: 44 + TX, y: 34 + TY }, { prop: 'healer', x: 42 + TX, y: 42 + TY }, { prop: 'shop', x: 57 + TX, y: 42 + TY },
      { prop: 'fountain', x: 51 + TX, y: 45 + TY },
    ],
  },
};
// The layout inside each subzone (used by buildWorld): clearings on a grid of slots that grows with the subzone
// (3×3 in area 1 up to 5×4 in area 4), a main chain of clearings from the entrance to the exit, and pockets (dead
// ends hiding treasure) off to the side.
// Per depth [TUNABLE]: grid columns × rows (along the subzone's longer side first), clearings on the main path
// between the first and the far one, pockets, hidden challenge chests and trainers.
const LAYOUT = {
  1: { grid: [3, 3], mids: 1, pockets: 2, chests: 1, trainers: 1 },
  2: { grid: [4, 3], mids: 2, pockets: 3, chests: 1, trainers: 1 },
  3: { grid: [4, 4], mids: 3, pockets: 4, chests: 2, trainers: 1 },
  4: { grid: [5, 4], mids: 3, pockets: 5, chests: 2, trainers: 2 },
};
const PLANS = {};
{
  const rand = mulberry32(777);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  for (const [region, R] of Object.entries(REGION_PLAN)) {
    for (let d = 1; d <= SUBZONES; d++) {
      const a = areaById(`${region}-${d}`), L = LAYOUT[d];
      const inLink = LINKS.find((k) => k.b === a.id), outLink = LINKS.find((k) => k.a === a.id);
      const entry = inLink.pb, exit = outLink ? outLink.pa : null;
      const wide = a.x1 - a.x0 >= a.y1 - a.y0;
      const [nc, nr] = wide ? L.grid : [L.grid[1], L.grid[0]];
      const spread = (lo, hi, n) => Array.from({ length: n }, (_, i) => Math.round(lo + ((hi - lo) * i) / (n - 1)));
      const xs = spread(a.x0 + 4, a.x1 - 4, nc), ys = spread(a.y0 + 4, a.y1 - 4, nr);
      const near = (arr, v) => arr.reduce((bi, x, i) => (Math.abs(x - v) < Math.abs(arr[bi] - v) ? i : bi), 0);
      const slotOf = (p) => ({ c: near(xs, p[0]), r: near(ys, p[1]) });
      const onTopBottom = (p) => p[1] <= a.y0 + 3 || p[1] >= a.y1 - 3;
      const key = (q) => q.c + ',' + q.r;
      // The clearing next to a link sits a little to one side of it, so the path bends instead of running straight.
      const beside = (p, avoid) => {
        const q = slotOf(p);
        const opts = (onTopBottom(p) ? [{ c: q.c - 1, r: q.r }, { c: q.c + 1, r: q.r }] : [{ c: q.c, r: q.r - 1 }, { c: q.c, r: q.r + 1 }])
          .filter((o) => o.c >= 0 && o.c < nc && o.r >= 0 && o.r < nr);
        if (!opts.length) return q;
        if (!avoid) return pick(opts);
        return opts.reduce((best, o) => (Math.hypot(o.c - avoid.c, o.r - avoid.r) > Math.hypot(best.c - avoid.c, best.r - avoid.r) ? o : best), opts[0]);
      };
      const A = beside(entry);
      let B = exit ? beside(exit, A) : { c: A.c < nc / 2 ? nc - 1 : 0, r: A.r < nr / 2 ? nr - 1 : 0 };   // the last subzone: the far corner
      if (key(A) === key(B)) B = { c: nc - 1 - A.c, r: nr - 1 - A.r };
      // The main path's middle clearings: steps along a bending walk from A to B, spread evenly.
      const walk = [];
      { let c = A.c, r = A.r; let horiz = rand() < 0.5;
        while (c !== B.c || r !== B.r) {
          if (c === B.c) horiz = false; else if (r === B.r) horiz = true; else if (rand() < 0.4) horiz = !horiz;
          if (horiz) c += Math.sign(B.c - c); else r += Math.sign(B.r - r);
          if (c !== B.c || r !== B.r) walk.push({ c, r });
        } }
      // A short walk (neighbouring slots) leaves room for a detour through the middle of the subzone.
      if (walk.length < L.mids) {
        const centre = { c: Math.floor(nc / 2), r: Math.floor(nr / 2) };
        const extra = [centre, { c: centre.c - 1, r: centre.r }, { c: centre.c, r: centre.r - 1 }, { c: centre.c + 1, r: centre.r }, { c: centre.c, r: centre.r + 1 }]
          .filter((q) => q.c >= 0 && q.c < nc && q.r >= 0 && q.r < nr && key(q) !== key(A) && key(q) !== key(B) && !walk.some((w) => key(w) === key(q)));
        walk.splice(Math.floor(walk.length / 2), 0, ...extra.slice(0, L.mids - walk.length));
      }
      const mids = walk.length <= L.mids ? walk : Array.from({ length: L.mids }, (_, i) => walk[Math.round(((i + 1) * (walk.length + 1)) / (L.mids + 1)) - 1]);
      const used = new Set([A, B, ...mids, slotOf(entry)].map(key));
      if (exit) used.add(key(slotOf(exit)));
      // Pockets: free slots furthest from the main path first (real dead ends), corners before edges.
      const chainSlots = [A, B, ...mids];
      const distToChain = (q) => Math.min(...chainSlots.map((m) => Math.abs(m.c - q.c) + Math.abs(m.r - q.r)));
      const free = [];
      for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) if (!used.has(key({ c, r }))) free.push({ c, r });
      free.sort((q1, q2) => distToChain(q2) - distToChain(q1) || ((q2.c % (nc - 1) === 0) + (q2.r % (nr - 1) === 0)) - ((q1.c % (nc - 1) === 0) + (q1.r % (nr - 1) === 0)));
      const pockets = free.slice(0, L.pockets);
      const at = (q, j = 1) => ({ x: xs[q.c] + Math.round((rand() * 2 - 1) * j), y: ys[q.r] + Math.round((rand() * 2 - 1) * j) });
      const pA = at(A), pB = at(B), pM = mids.map((q) => at(q, 0)), pk = pockets.map((q) => at(q, 0));
      const pC = pM[Math.floor((pM.length - 1) / 2)] || { x: Math.round((pA.x + pB.x) / 2), y: Math.round((pA.y + pB.y) / 2) };
      PLANS[a.id] = { entry, exit, A: pA, B: pB, C: pC, mids: pM, pockets: pk };

      // Features
      const f = {};
      // Area 1's trainer stands just above the middle clearing, so its portal sits a little lower.
      if (CAMP_DEPTHS.includes(d)) f.camp = { x: pC.x - 1, y: d === 1 ? pC.y + 1 : pC.y - 1 };
      // Trainers: the middle clearing in area 1, the far clearing in areas 2–3, the first clearing in area 4 (the far
      // one belongs to the Guardian), and area 4's second trainer at its last middle clearing.
      const tSpot = d === 4 ? pA : d === 1 ? pC : pB;
      const [tName, tKind, tTeam] = R.trainers[d - 1];
      f.trainers = [{ id: `t-${a.id}`, kind: tKind, x: tSpot.x + (d === 1 ? 0 : 2), y: tSpot.y + (d === 1 ? -2 : 0), name: tName, team: tTeam }];
      if (L.trainers > 1 && R.trainers[SUBZONES]) {
        const spot = pM[pM.length - 1] || pk[pk.length - 1];
        const [n2, k2, t2] = R.trainers[SUBZONES];
        f.trainers.push({ id: `t-${a.id}-2`, kind: k2, x: spot.x + 2, y: spot.y + 1, name: n2, team: t2 });
      }
      f.challenges = pk[0] ? [{ id: `c-${a.id}`, x: pk[0].x, y: pk[0].y, species: R.rares[d - 1] }] : [];
      // Hidden challenge chests in the other pockets (the first keeps its old id, so saved progress still counts).
      f.chests = [];
      for (let i = 0; i < L.chests; i++) {
        const spot = pk[i + 1] || (pk[0] ? { x: pk[0].x + 2 + i, y: pk[0].y } : { x: pA.x + 2 + i, y: pA.y + 1 });
        f.chests.push({ id: i === 0 ? `k-${a.id}` : `k-${a.id}-${i + 1}`, x: spot.x, y: spot.y });
      }
      if (d === SUBZONES) f.guardian = { x: pB.x - 1, y: pB.y, name: R.guardian };   // the final boss, at the far end
      if (outLink?.keeper) f.keeper = { id: outLink.keeper, to: outLink.b, ...(outLink.mini ? { mini: true, name: outLink.miniName } : {}) };
      FEATURES[a.id] = f;
    }
  }
}

// Quests per subzone. The Challenges, the Mini Guardian and the Guardian (area 4) wake when enough are done.
const STRAND_NAME = { number: 'Number Sense', patterns: 'Patterns', shape: 'Shape and Space', stats: 'Data and Chance' };
export function objectivesFor(areaId) {
  const a = areaById(areaId);
  if (!a || a.level === 0) return [];
  const f = FEATURES[areaId];
  const d = a.level, strandName = STRAND_NAME[a.region];
  // Pacing [TUNABLE]: about 15–20 minutes of play for area 1, each area a bit longer than the one before, and area 4
  // about twice area 1 (the parent's target). Deeper wild groups are bigger, so each battle counts for more wins.
  // Four test bots took about 1× / 1.3× / 1.5× / 2.6× area 1's time with 10/15/20/26 wins, so area 3 asks a little
  // more and area 4 (which also has a second trainer, two chests and the Guardian) a little less.
  // v44: area 2 took about the same time as area 1 (bots often skipped its trainer), area 4 about 1.8×.
  const befriend = [0, 3, 4, 4, 5][d], wins = [0, 10, 22, 16, 16][d], learn = [0, 1, 2, 2, 2][d];   // v59: area 4 ran ~3x area 1 (target 2x)
  const list = [
    { id: 'befriend', text: `Befriend ${befriend} ${strandName} pets here`, type: 'befriend', need: befriend },
    { id: 'wins', text: `Beat or befriend ${wins} wild pets`, type: 'wins', need: wins },
    ...f.trainers.map((t) => ({ id: t.id, text: `Defeat ${t.name}`, type: 'trainer', need: 1, target: t.id })),
    { id: 'chest', text: f.chests.length > 1 ? `Find and open the ${f.chests.length} hidden challenge chests` : 'Find and open the hidden challenge chest', type: 'chest', need: f.chests.length },
    { id: 'learn', text: `Learning goal: level up ${learn} ${strandName} skill${learn > 1 ? 's' : ''} by one tier`, type: 'learn', need: learn, learning: true },
  ];
  if (f.keeper) list.push({ id: 'keeper', text: f.keeper.mini ? `Defeat ${f.keeper.name}, guarding ${areaById(f.keeper.to).name}` : `Beat the Challenge guarding ${areaById(f.keeper.to).name}`, type: 'keeper', need: 1, target: f.keeper.id, keeper: true });
  if (f.guardian) list.push({ id: 'guardian', text: `Final battle: defeat ${f.guardian.name}`, type: 'guardian', need: 1, guardian: true });
  if (d === 1 || d === 4) list.push({ id: 'wanderer', text: 'Side quest: befriend a wanderer from another strand', type: 'wanderer', need: 1, side: true });
  return list;
}
// How many quests (not counting the Guardian, Challenge or side quests) wake the Guardian / Challenge [TUNABLE].
// The wild-pets quest must be one of them (see guardianAwake in progress.js).
export const guardianWakeCount = () => 4;

// ---------- Tile generation ----------
// Subzones are built Prodigy/Pokémon-style: everything starts as an impassable wall (cliffs / dense forest),
// then clearings are carved and joined by narrow winding paths.
export const G = { GRASS: 0, GRASS2: 1, TALL: 2, PATH: 3, WATER: 4, SAND: 5, FLOOR: 6, CLIFF: 7, FLOWERS: 8, BRIDGE_H: 9, BRIDGE_V: 10, CANOPY: 11 };
export const GROUND_NAMES = ['grass', 'grass2', 'tallgrass', 'path', 'water', 'sand', 'floor', 'cliff', 'flowers', 'bridge_h', 'bridge_v', 'canopy'];
const BLOCKING = new Set([G.WATER, G.CLIFF, G.CANOPY]);
export const isWalkableGround = (g) => !BLOCKING.has(g);

export function areaAt(x, y) {
  return AREAS.find((a) => a.level > 0 && x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1) ||
    AREAS.find((a) => a.level === 0 && x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1) || null;
}

// Wall style per theme: which blocking tile makes up the region's walls.
const WALL = {
  academy: () => G.CANOPY,
  number: (n) => (n > 0.72 ? G.CLIFF : G.CANOPY),
  patterns: (n) => (n > 0.8 ? G.CLIFF : G.CANOPY),
  shape: (n) => (n > 0.45 ? G.CLIFF : G.CANOPY),
  stats: (n) => (n > 0.6 ? G.CLIFF : G.CANOPY),
};

export function buildWorld() {
  const rand = mulberry32(20260927);
  const ground = Array.from({ length: H }, () => new Array(W).fill(G.CLIFF));
  const theme = Array.from({ length: H }, () => new Array(W).fill('academy'));
  const props = [];
  const solid = Array.from({ length: H }, () => new Array(W).fill(false));
  const open = Array.from({ length: H }, () => new Array(W).fill(false));   // carved walkable space
  const roadTiles = new Set();
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const set = (x, y, g) => { if (inb(x, y)) ground[y][x] = g; };

  // Smooth value noise for choosing wall types in patches.
  const NG = 7, nw = Math.ceil(W / NG) + 2, nh = Math.ceil(H / NG) + 2;
  const nv = Array.from({ length: nh }, () => Array.from({ length: nw }, () => rand()));
  const noise = (x, y) => {
    const gx = x / NG, gy = y / NG, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const l = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
    return l(l(nv[y0][x0], nv[y0][x0 + 1], fx), l(nv[y0 + 1][x0], nv[y0 + 1][x0 + 1], fx), fy);
  };

  // 1) Everything starts as wall, themed like the nearest area (so the empty corners match their neighbours).
  const distTo = (a, x, y) => Math.hypot(Math.max(a.x0 - x, 0, x - a.x1), Math.max(a.y0 - y, 0, y - a.y1));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let best = AREAS[0], bd = Infinity;
    for (const a of AREAS) { const d = distTo(a, x, y); if (d < bd) { bd = d; best = a; } }
    theme[y][x] = best.theme;
    ground[y][x] = WALL[best.theme](noise(x, y));
  }

  // Carving helpers
  const carve = (x, y, g = null) => {
    if (!inb(x, y)) return;
    open[y][x] = true;
    if (g != null) ground[y][x] = g;
    else if (BLOCKING.has(ground[y][x])) ground[y][x] = rand() < 0.2 ? G.GRASS2 : G.GRASS;
  };
  const disc = (cx, cy, r, fn) => {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      if (((x - cx) ** 2 + (y - cy) ** 2) <= r * r) fn(x, y);
    }
  };
  const blob = (cx, cy, rx, ry, fn, jitter = 0.35) => {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (rand() - 0.5) * jitter <= 1) fn(x, y);
    }
  };
  const inArea = (a, x, y, m = 1) => x >= a.x0 + m && x <= a.x1 - m && y >= a.y0 + m && y <= a.y1 - m;

  // Winding path from p to q (both inclusive), carving a corridor about 2r wide. Returns the centre-line tiles.
  function route(p, q, a, { wobble = 0.3, r = 1.45 } = {}) {
    let [x, y] = p;
    const line = [[x, y]];
    let guard = 0, drift = 0;
    while ((x !== q[0] || y !== q[1]) && guard++ < 800) {
      const dx = q[0] - x, dy = q[1] - y;
      let horizontal = Math.abs(dx) > Math.abs(dy) ? rand() > wobble * 0.5 : rand() < wobble * 0.5;
      if (dx === 0) horizontal = false; else if (dy === 0) horizontal = true;
      // Occasional sideways drift makes the path meander.
      if (rand() < wobble * 0.35 && Math.abs(dx) + Math.abs(dy) > 6) {
        drift = rand() < 0.5 ? -1 : 1;
        if (horizontal) { const ny = y + drift; if (!a || inArea(a, x, ny, 2)) y = ny; } else { const nx = x + drift; if (!a || inArea(a, nx, y, 2)) x = nx; }
      } else if (horizontal) x += Math.sign(dx);
      else y += Math.sign(dy);
      line.push([x, y]);
    }
    for (const [lx, ly] of line) disc(lx, ly, r, (xx, yy) => { if (!a || (areaAt(xx, yy) === a && inArea(a, xx, yy, 1))) carve(xx, yy); });
    return line;
  }
  const lay = (line, w = 2) => {
    for (const [x, y] of line) for (let k = 0; k < w; k++) for (let j = 0; j < w; j++) {
      const xx = x + k, yy = y + j;
      if (inb(xx, yy) && ground[yy][xx] !== G.FLOOR) { ground[yy][xx] = G.PATH; open[yy][xx] = true; roadTiles.add(xx + ',' + yy); }
    }
  };

  // 2) Town: an open square with a plaza, surrounded by a tree wall (exits carved by links). Coordinates are the
  //    town's design coordinates, moved by (TX, TY).
  const hub = areaById('hub');
  for (let y = hub.y0 + 1; y <= hub.y1 - 1; y++) for (let x = hub.x0 + 1; x <= hub.x1 - 1; x++) carve(x, y);
  const setT = (x, y, g) => set(x + TX, y + TY, g);
  const gT = (x, y) => ground[y + TY][x + TX];
  // A round plaza around the fountain, stone walkways to every building and exit, two ponds joined by a stream
  // (with a bridge on the south walkway), flower beds and gardens.
  for (let y = 41; y <= 50; y++) for (let x = 46; x <= 57; x++) if (((x - 51.5) / 5.6) ** 2 + ((y - 45.5) / 4.1) ** 2 <= 1) setT(x, y, G.FLOOR);
  const walk = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setT(x, y, G.FLOOR); };
  walk(51, 36, 52, 41);   // north, to the Starfall road
  walk(46, 39, 52, 40);   // Academy steps
  walk(39, 45, 46, 46);   // west, past the healer
  walk(57, 45, 64, 46);   // east, past the shop
  walk(51, 50, 52, 53);   // south
  walk(43, 44, 43, 44); walk(58, 44, 58, 44);   // doorsteps
  const pond = (cx, cy, rx, ry) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) setT(x, y, G.WATER); };
  pond(42.5, 50.5, 3.1, 2.1);
  pond(57.5, 51.5, 2.2, 1.6);
  for (let x = 45; x <= 56; x++) if (gT(x, 51) !== G.WATER) setT(x, 51, x === 51 || x === 52 ? G.BRIDGE_V : G.WATER);
  for (const [x, y] of [[53, 38], [54, 38], [53, 39], [54, 39], [48, 42], [55, 42], [48, 49], [55, 49], [40, 40], [41, 40], [40, 41], [62, 40], [63, 40], [62, 41], [63, 41], [47, 52], [48, 52], [47, 53]]) if (gT(x, y) === G.GRASS || gT(x, y) === G.GRASS2) setT(x, y, G.FLOWERS);

  // 3) Subzones: clearings (entrance side, middle, exit side) joined by the main path, plus pockets down side paths.
  const poisByArea = {};
  const routes = [];   // { areaId, line, kind: 'main' | 'hidden' }
  for (const a of AREAS.filter((x) => x.level > 0)) {
    const P = PLANS[a.id];
    const inside = (x, y) => areaAt(x, y) === a && inArea(a, x, y, 1);
    const grow = [1, 1, 1.15, 1.25, 1.35][a.level];   // deeper subzones have roomier clearings too [TUNABLE]
    const clearing = (p, rx, ry) => blob(p.x, p.y, rx * grow, ry * grow, (x, y) => { if (inside(x, y)) carve(x, y); }, 0.5);
    clearing(P.A, 4.2 + rand() * 0.8, 3.1 + rand() * 0.6);
    clearing(P.B, 4.2 + rand() * 0.8, 3.1 + rand() * 0.6);
    P.mids.forEach((m) => clearing(m, m === P.C ? 4.6 : 3.8 + rand() * 0.6, m === P.C ? 3.6 : 3.0 + rand() * 0.5));
    if (!P.mids.length) clearing(P.C, 4.6, 3.6);
    P.pockets.forEach((p) => clearing(p, 2.6, 2.2));
    blob(P.entry[0], P.entry[1], 2.2, 2.2, (x, y) => { if (inside(x, y)) carve(x, y); });
    if (P.exit) blob(P.exit[0], P.exit[1], 2.2, 2.2, (x, y) => { if (inside(x, y)) carve(x, y); });
    // Tall grass in the first and far clearings and in every other middle one (the camp's clearing stays clear).
    poisByArea[a.id] = [{ ...P.A, kind: 'meadow' }, { ...P.B, kind: 'meadow' }, ...P.mids.map((m, i) => ({ ...m, kind: m !== P.C && i % 2 === 1 ? 'meadow' : 'middle' })), ...P.pockets.map((p) => ({ ...p, kind: 'pocket' }))];

    // The main path: entrance → first clearing → middle clearings → far clearing → exit (a visible dirt road).
    const chain = [P.entry, [P.A.x, P.A.y], ...(P.mids.length ? P.mids : [P.C]).map((m) => [m.x, m.y]), [P.B.x, P.B.y], ...(P.exit ? [P.exit] : [])];
    for (let i = 0; i < chain.length - 1; i++) {
      const l = route(chain[i], chain[i + 1], a, { wobble: 0.3, r: 1.3 });
      lay(l);
      routes.push({ areaId: a.id, line: l, kind: 'main' });
    }
    // Side paths to the pockets (narrower, from the nearest clearing): hidden pets and chests wait at the end.
    for (const p of P.pockets) {
      const from = [P.A, P.B, ...(P.mids.length ? P.mids : [P.C])].reduce((best, c) => (Math.hypot(c.x - p.x, c.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? c : best));
      const l = route([from.x, from.y], [p.x, p.y], a, { wobble: 0.45, r: 1.05 });
      routes.push({ areaId: a.id, line: l, kind: 'hidden' });
    }
  }

  // 4) Links between areas: straight roads through the walls. Closed gates and Challenges block them.
  for (const L of LINKS) {
    const line = [];
    const [x0, y0] = L.pa, [x1, y1] = L.pb;
    for (let t = 0; t <= Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); t++) line.push([x0 + Math.sign(x1 - x0) * t, y0 + Math.sign(y1 - y0) * t]);
    const horiz = y0 === y1;
    // A 4-wide corridor (a gate's 2 tiles + one either side), narrowed to the gate's width where the gate stands.
    for (const [x, y] of line) disc(x + (horiz ? 0 : 0.5), y + (horiz ? 0.5 : 0), 1.6, (xx, yy) => carve(xx, yy));
    lay(line, 2);
    if (L.gate) {
      const g = L.gateSpot;
      const side = g.orient === 'h' ? [[g.x - 1, g.y], [g.x + 2, g.y]] : [[g.x, g.y - 1], [g.x, g.y + 2]];
      for (const [x, y] of side) { ground[y][x] = WALL[theme[y][x]](0.9); open[y][x] = false; }
    }
  }
  // Roads from the town plaza to each exit
  lay([tp(51, 36), tp(51, 37), tp(51, 38), tp(51, 39)]); lay([tp(51, 51)]);
  for (let x = 38; x <= 41; x++) lay([tp(x, 45)]);
  for (let x = 62; x <= 65; x++) lay([tp(x, 45)]);

  // 5) Tall grass in the two side clearings of each subzone (surprise pets live here).
  for (const [id, pois] of Object.entries(poisByArea)) {
    const a = areaById(id);
    for (const p of pois) {
      if (p.kind !== 'meadow') continue;
      blob(p.x + (rand() - 0.5) * 2, p.y + (rand() - 0.5) * 2, 2.2 + rand() * 1.2, 1.6 + rand() * 0.8, (x, y) => {
        if (areaAt(x, y) === a && open[y][x] && (ground[y][x] === G.GRASS || ground[y][x] === G.GRASS2)) ground[y][x] = G.TALL;
      });
    }
  }

  // 6) Water: the sea along the west coast of Stormcoast, and a pond (a sandy patch on the coast) in one pocket per subzone.
  const coast = AREAS.filter((a) => a.region === 'stats' && a.x0 <= 6);
  const seaY0 = Math.min(...coast.map((a) => a.y0)) - 1, seaY1 = Math.max(...coast.map((a) => a.y1)) + 1;
  for (let y = seaY0; y <= seaY1; y++) for (let x = 0; x <= 3; x++) { set(x, y, G.WATER); theme[y][x] = 'stats'; }
  for (let y = seaY0; y <= seaY1; y++) for (let x = 4; x <= 6; x++) if (open[y][x] && ground[y][x] !== G.PATH) set(x, y, G.SAND);
  for (const [id, pois] of Object.entries(poisByArea)) {
    const a = areaById(id);
    if (a.theme === 'shape') continue;
    const p = pois.find((q) => q.kind === 'meadow');
    blob(p.x + 2, p.y - 1, 2.0, 1.4, (x, y) => { if (areaAt(x, y) === a && open[y][x] && !roadTiles.has(x + ',' + y) && ground[y][x] !== G.TALL) set(x, y, a.theme === 'stats' ? G.SAND : G.WATER); });
  }
  // Town bridge over the stream on the south walkway (the road pass above painted it as path).
  for (const x of [51, 52]) { setT(x, 51, G.BRIDGE_V); roadTiles.delete((x + TX) + ',' + (51 + TY)); }
  // Keep water from blocking every route: any water tile on a road becomes a bridge.
  for (const k of roadTiles) { const [x, y] = k.split(',').map(Number); if (ground[y][x] === G.WATER) ground[y][x] = G.BRIDGE_H; }

  // Flowers sprinkled on open grass
  for (let i = 0; i < 320; i++) {
    const x = Math.floor(rand() * W), y = Math.floor(rand() * H);
    if (open[y][x] && ground[y][x] === G.GRASS && areaAt(x, y)) set(x, y, G.FLOWERS);
  }

  // 7) Props
  const reserved = new Set();
  const reserve = (x, y, w = 1, h = 1, pad = 1) => { for (let yy = y - pad; yy < y + h + pad; yy++) for (let xx = x - pad; xx < x + w + pad; xx++) reserved.add(xx + ',' + yy); };
  const addProp = (prop, x, y, w, h, isSolid = true, th = theme[y]?.[x] || 'academy', extra = {}) => {
    props.push({ prop, x, y, w, h, theme: th, variant: Math.floor(rand() * 3), ...extra });
    if (isSolid) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (inb(xx, yy)) solid[yy][xx] = true;
    reserve(x, y, w, h, 0);
  };
  const SIZES = { academy: [6, 5], healer: [3, 3], shop: [3, 3], fountain: [2, 2], house: [3, 3], portal: [2, 2], tree: [1, 2], bush: [1, 1], rock: [1, 1],
    crystal: [1, 1], mushroom: [1, 1], pillar: [1, 2], lighthouse: [2, 3], lamp: [1, 2], sign: [1, 1], windvane: [1, 2], sundial: [1, 1], guardian_shrine: [2, 2], boat: [2, 1], dock: [1, 1] };
  const town = (prop, x, y, w, h, isSolid = true) => addProp(prop, x + TX, y + TY, w, h, isSolid, 'academy');

  for (const b of FEATURES.hub.buildings) { const [w, h] = SIZES[b.prop]; addProp(b.prop, b.x, b.y, w, h, true, 'academy'); }
  [[39, 35], [55, 35], [60, 35], [61, 48]].forEach(([x, y]) => town('house', x, y, 3, 3));
  // Town decorations: lamps along the walkways, pillars at the Academy steps, signposts, a sundial, a weather vane,
  // a little boat and dock on the pond, hedges and a small tree garden.
  [[50, 37], [54, 37], [45, 43], [45, 48], [60, 43], [60, 48], [50, 53], [53, 53]].forEach(([x, y]) => town('lamp', x, y - 1, 1, 2));
  [[43, 38], [53, 38]].forEach(([x, y]) => town('pillar', x, y, 1, 2));
  town('sign', 40, 44, 1, 1); town('sign', 63, 44, 1, 1); town('sign', 53, 35, 1, 1);
  town('sundial', 48, 50, 1, 1);
  town('windvane', 63, 37, 1, 2);
  props.push({ prop: 'boat', x: 41 + TX, y: 50 + TY, w: 2, h: 1, theme: 'academy', variant: 0 });
  town('dock', 45, 49, 1, 1, false);
  [[58, 39], [60, 40], [64, 41], [61, 42], [39, 39], [39, 42], [64, 51], [39, 53], [46, 53]].forEach(([x, y]) => town('tree', x, y - 1, 1, 2));
  [[50, 38], [53, 40], [47, 43], [56, 43], [47, 48], [56, 48], [44, 47], [59, 47], [49, 52], [54, 50]].forEach(([x, y]) => town('bush', x, y, 1, 1));

  for (const f of Object.values(FEATURES)) {
    (f.npcs || []).forEach((n) => reserve(n.x, n.y));
    (f.trainers || []).forEach((t) => reserve(t.x, t.y));
    (f.challenges || []).forEach((c) => reserve(c.x, c.y));
    (f.chests || []).forEach((c) => reserve(c.x, c.y));
    if (f.portal) reserve(f.portal.x, f.portal.y, 2, 2);
    if (f.camp) reserve(f.camp.x, f.camp.y, 2, 2, 2);
    if (f.guardian) reserve(f.guardian.x, f.guardian.y - 1, 2, 2, 1);
    if (f.gate) reserve(f.gate.x - 1, f.gate.y - 1, 4, 4, 0);
  }
  // Paths (and a tile either side) stay clear of decorations, so nothing ever pinches a way through.
  for (const r of routes) for (const [x, y] of r.line) reserve(x, y, 1, 1, 1);
  for (const [id, f] of Object.entries(FEATURES)) {
    if (f.camp) props.push({ prop: 'portal', x: f.camp.x, y: f.camp.y, w: 2, h: 2, theme: theme[f.camp.y][f.camp.x], portal: id });
    if (f.guardian) addProp('guardian_shrine', f.guardian.x, f.guardian.y - 1, 2, 2, true);
  }
  props.push({ prop: 'portal', x: FEATURES.hub.portal.x, y: FEATURES.hub.portal.y, w: 2, h: 2, theme: 'academy', portal: 'hub' });
  // Make sure every feature tile is open ground.
  for (const f of Object.values(FEATURES)) {
    for (const p of [...(f.trainers || []), ...(f.challenges || []), ...(f.chests || []), ...(f.npcs || [])]) { if (BLOCKING.has(ground[p.y][p.x])) carve(p.x, p.y, G.GRASS); open[p.y][p.x] = true; }
    if (f.guardian) for (let yy = f.guardian.y - 2; yy <= f.guardian.y + 1; yy++) for (let xx = f.guardian.x - 1; xx <= f.guardian.x + 2; xx++) if (BLOCKING.has(ground[yy][xx])) carve(xx, yy, G.GRASS);
    if (f.camp) for (let yy = f.camp.y - 1; yy <= f.camp.y + 3; yy++) for (let xx = f.camp.x - 1; xx <= f.camp.x + 3; xx++) if (BLOCKING.has(ground[yy][xx])) carve(xx, yy, G.GRASS);
  }

  // A lighthouse on the Stormcoast shoreline (standing in the coastal wall, so it never blocks a path) and a boat.
  {
    const a = areaById('stats-3');
    const lx = 4, ly = a.y0 + 1;
    for (let yy = ly; yy < ly + 3; yy++) for (let xx = lx; xx < lx + 2; xx++) { ground[yy][xx] = G.SAND; open[yy][xx] = false; }
    addProp('lighthouse', lx, ly, 2, 3, true, 'stats');
    addProp('boat', 1, Math.round((seaY0 + seaY1) / 2), 2, 1, true, 'stats');
  }
  // Lamps beside each camp portal
  for (const f of Object.values(FEATURES)) if (f.camp) {
    const th = theme[f.camp.y][f.camp.x];
    [[f.camp.x - 1, f.camp.y - 1], [f.camp.x + 2, f.camp.y - 1]].forEach(([x, y]) => { if (open[y][x] && open[y + 1]?.[x] && !roadTiles.has(x + ',' + y) && !roadTiles.has(x + ',' + (y + 1)) && !solid[y][x]) addProp('lamp', x, y, 1, 2, true, th); });
  }

  // Decorations inside open space (never on roads or feature spots); trees also line wall edges.
  const scatter = { number: ['crystal', 'crystal', 'rock', 'tree'], patterns: ['tree', 'bush', 'mushroom', 'tree'], shape: ['rock', 'pillar', 'bush', 'rock', 'sundial'], stats: ['bush', 'rock', 'windvane'], academy: ['tree', 'bush'] };
  const nearRoad = (x, y) => { for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (roadTiles.has(xx + ',' + yy)) return true; return false; };
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!open[y][x] || solid[y][x] || reserved.has(x + ',' + y)) continue;
    const g = ground[y][x];
    if (![G.GRASS, G.GRASS2, G.FLOWERS, G.SAND].includes(g) || nearRoad(x, y)) continue;
    const a = areaAt(x, y);
    if (!a || a.level === 0) continue;
    const besideWall = [[0, -1], [1, 0], [-1, 0], [0, 1]].some(([dx, dy]) => BLOCKING.has(ground[y + dy][x + dx]) && ground[y + dy][x + dx] !== G.WATER);
    if (rand() > (besideWall ? 0.14 : 0.03)) continue;
    const prop = besideWall && rand() < 0.6 ? 'tree' : scatter[a.theme][Math.floor(rand() * scatter[a.theme].length)];
    const [w, h] = SIZES[prop];
    const top = y - (h - 1);
    let ok = true;
    for (let yy = top; yy <= y; yy++) if (!open[yy]?.[x] || solid[yy][x] || reserved.has(x + ',' + yy) || roadTiles.has(x + ',' + yy)) ok = false;
    // Never block a path: keep at least 2 open neighbours around the prop footprint's base, and never narrow a
    // side path (a prop there needs open ground on both sides).
    const openN = [[1, 0], [-1, 0], [0, 1]].filter(([dx, dy]) => open[y + dy]?.[x + dx] && !solid[y + dy][x + dx]).length;
    const pinch = (open[y][x - 1] && open[y][x + 1] && !open[y - 1]?.[x] && !open[y + 1]?.[x]) || (open[y - 1]?.[x] && open[y + 1]?.[x] && !open[y][x - 1] && !open[y][x + 1]);
    if (ok && openN >= 2 && !pinch) addProp(prop, x, top, w, h, true, a.theme);
  }

  // Solid ground tiles
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (BLOCKING.has(ground[y][x])) solid[y][x] = true;

  // 8) Blocker pets. Challenges: stronger groups standing across the road into subzones 2 and 3.
  //    Side-path blockers: wild pets in narrow spots on the way to hidden treasure.
  const blockers = [];
  const taken = new Set();
  const free = (x, y) => inb(x, y) && open[y][x] && !solid[y][x] && !BLOCKING.has(ground[y][x]) && !reserved.has(x + ',' + y) && !taken.has(x + ',' + y);
  const nativesUpTo = (region, cls) => REGION_SPECIES[region].filter((sp) => SPECIES[sp].cls <= cls);
  for (const L of LINKS.filter((l) => l.keeper)) {
    const B = areaById(L.b);
    const horiz = L.pa[1] === L.pb[1];
    // Stand in the wall gap on the far side, across the whole corridor.
    const along = horiz ? (L.pb[0] > L.pa[0] ? B.x0 : B.x1) : (L.pb[1] > L.pa[1] ? B.y0 : B.y1);
    const tiles = [];
    for (let k = -3; k <= 4; k++) { const [x, y] = horiz ? [along, L.pa[1] + k] : [L.pa[0] + k, along]; if (inb(x, y) && open[y][x] && !solid[y][x]) tiles.push([x, y]); }
    tiles.forEach(([x, y]) => taken.add(x + ',' + y));
    const pool = nativesUpTo(B.region, 2);
    const size = L.mini ? 1 : B.level === 2 ? 2 : 3;   // the Mini Guardian brings one helper
    const group = Array.from({ length: size }, (_, i) => pool[Math.floor(rand() * pool.length)]);
    const [cx, cy] = tiles[Math.floor(tiles.length / 2)];
    blockers.push({ id: L.keeper, areaId: L.a, x: cx, y: cy, tiles, species: group[0], group, level: B.pet[0] + (B.level === 4 ? 4 : 2), guards: 'keeper', keeper: true, to: B.id, ...(L.mini ? { mini: true, name: L.miniName, region: B.region } : {}) });
  }
  function spanAt(line, i, maxSpan = 5) {
    const [x, y] = line[i];
    const [px, py] = line[Math.max(0, i - 2)], [nx, ny] = line[Math.min(line.length - 1, i + 2)];
    const horizontalRoute = Math.abs(nx - px) >= Math.abs(ny - py);
    const [dx, dy] = horizontalRoute ? [0, 1] : [1, 0];     // scan across the path
    if (!free(x, y)) return null;
    const span = [[x, y]];
    for (const sgn of [-1, 1]) for (let k = 1; k <= maxSpan; k++) { const sx = x + dx * k * sgn, sy = y + dy * k * sgn; if (!free(sx, sy)) break; span.push([sx, sy]); }
    // The span must end in walls on both sides (otherwise the player could walk around).
    const ends = span.reduce((m, [sx, sy]) => [Math.min(m[0], dx ? sx : sy), Math.max(m[1], dx ? sx : sy)], [Infinity, -Infinity]);
    const before = dx ? [ends[0] - 1, y] : [x, ends[0] - 1], after = dx ? [ends[1] + 1, y] : [x, ends[1] + 1];
    const wallish = ([wx, wy]) => !inb(wx, wy) || solid[wy][wx] || BLOCKING.has(ground[wy][wx]);
    if (span.length > maxSpan || !wallish(before) || !wallish(after)) return null;
    return span;
  }
  let bid = 0;
  for (const r of routes) {
    if (r.kind !== 'hidden' || rand() > 0.8 || r.line.length < 6) continue;
    const a = areaById(r.areaId);
    // Look near the treasure end of the side path for a narrow place.
    const lo = Math.floor(r.line.length * 0.35), hi = Math.floor(r.line.length * 0.85);
    let best = null;
    for (let i = lo; i <= hi; i++) { const sp = spanAt(r.line, i); if (sp && (!best || sp.length < best.span.length)) best = { i, span: sp }; }
    if (!best) continue;
    best.span.forEach(([x, y]) => { taken.add(x + ',' + y); for (let k = -2; k <= 2; k++) { taken.add((x + k) + ',' + y); taken.add(x + ',' + (y + k)); } });
    const native = nativesUpTo(a.region, Math.min(3, a.level));
    const [cx, cy] = best.span[Math.floor(best.span.length / 2)];
    const count = Math.min(3, Math.max(1, Math.round(best.span.length / 2.2)));
    const group = Array.from({ length: count }, () => native[Math.floor(rand() * native.length)]);
    blockers.push({ id: `b-${r.areaId}-${bid++}`, areaId: r.areaId, x: cx, y: cy, tiles: best.span, species: group[0], group, level: Math.min(a.pet[1] + 1, a.pet[0] + 2), guards: 'hidden' });
  }

  // 9) Mental math chests: 1 per subzone (on open ground with room all around, so it never blocks a path)
  //    and 1 easy practice chest in the town plaza.
  const mentalChests = [];
  const walkable = (x, y) => inb(x, y) && open[y][x] && !solid[y][x] && !BLOCKING.has(ground[y][x]);
  const nearBlocker = (x, y) => blockers.some((b) => b.tiles.some(([bx, by]) => Math.abs(bx - x) + Math.abs(by - y) < 5));
  const roomy = (x, y) => [-1, 0, 1].every((dy) => [-1, 0, 1].every((dx) => walkable(x + dx, y + dy) && !roadTiles.has((x + dx) + ',' + (y + dy))));
  for (const a of AREAS.filter((x) => x.level > 0)) {
    const strict = [], relaxed = [];
    const side4 = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => walkable(x + dx, y + dy));
    for (let y = a.y0 + 1; y < a.y1; y++) for (let x = a.x0 + 1; x < a.x1; x++) {
      if (areaAt(x, y) !== a || ![G.GRASS, G.GRASS2, G.FLOWERS, G.SAND].includes(ground[y][x]) || reserved.has(x + ',' + y) || taken.has(x + ',' + y) || roadTiles.has(x + ',' + y) || nearBlocker(x, y)) continue;
      if (roomy(x, y)) strict.push([x, y]); else if (side4(x, y) && walkable(x, y)) relaxed.push([x, y]);
    }
    const pool = strict.length ? strict : relaxed;
    if (!pool.length) continue;
    const [x, y] = pool[Math.floor(rand() * pool.length)];
    mentalChests.push({ id: `m-${a.id}-0`, areaId: a.id, x, y }); solid[y][x] = true; reserve(x, y, 1, 1, 2);
  }
  const [mx, my] = tp(48, 47);
  mentalChests.push({ id: 'm-hub-0', areaId: 'hub', x: mx, y: my });
  solid[my][mx] = true;

  // 10) Seal off any open tile you can't walk to from town (a tile boxed in by trees): a wild pet spawned there could
  //     never be reached (a v44 test bot chased one for 20 minutes).
  const reach = Array.from({ length: H }, () => new Uint8Array(W));
  const stack = [[START.x, START.y]];
  reach[START.y][START.x] = 1;
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!inb(nx, ny) || reach[ny][nx] || solid[ny][nx]) continue;
      reach[ny][nx] = 1; stack.push([nx, ny]);
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!reach[y][x]) solid[y][x] = true;

  return { ground, theme, props, solid, open, blockers, roadTiles, mentalChests };
}

export const START = { x: 51 + TX, y: 47 + TY };   // town plaza, south of the fountain

/**
 * Pick edge/corner tile names from neighbours (soft shorelines and path borders), matching the art module's names:
 * e.g. 'water_edge_ne_corner_sw', 'path_edge_s', 'sand_corner_nw'.
 */
export function autotile(world) {
  const { ground } = world;
  const at = (x, y) => ground[Math.max(0, Math.min(H - 1, y))][Math.max(0, Math.min(W - 1, x))];
  const groups = {
    [G.WATER]: [(g) => g === G.WATER || g === G.BRIDGE_H || g === G.BRIDGE_V, 'water'],
    [G.PATH]: [(g) => g === G.PATH || g === G.BRIDGE_H || g === G.BRIDGE_V || g === G.FLOOR, 'path'],
    [G.SAND]: [(g) => g === G.SAND || g === G.WATER, 'sand'],
    [G.CANOPY]: [(g) => g === G.CANOPY || g === G.CLIFF, 'canopy'],
    [G.CLIFF]: [(g) => g === G.CLIFF || g === G.CANOPY, 'cliff'],
  };
  const out = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      const g = ground[y][x];
      const grp = groups[g];
      if (!grp) { row.push(GROUND_NAMES[g]); continue; }
      const [same, base] = grp;
      const sides = [['n', 0, -1], ['e', 1, 0], ['s', 0, 1], ['w', -1, 0]].filter(([, dx, dy]) => !same(at(x + dx, y + dy))).map((d) => d[0]);
      const S = new Set(sides);
      const corners = [['ne', 1, -1], ['nw', -1, -1], ['se', 1, 1], ['sw', -1, 1]]
        .filter(([k, dx, dy]) => !S.has(k[0]) && !S.has(k[1]) && !same(at(x + dx, y + dy))).map((d) => d[0]);
      let n = base;
      if (sides.length) n += '_edge_' + ['n', 'e', 's', 'w'].filter((k) => S.has(k)).join('');
      if (corners.length) n += '_corner_' + corners.join('');
      row.push(n);
    }
    out.push(row);
  }
  return out;
}

/** The two tiles a gate blocks while closed. */
export function gateTiles(gate) {
  return gate.orient === 'h' ? [[gate.x, gate.y], [gate.x + 1, gate.y]] : [[gate.x, gate.y], [gate.x, gate.y + 1]];
}

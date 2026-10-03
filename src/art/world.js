// World tiles and props, drawn in code as SVG strings (see docs/ART_SPEC.md section 4).
//
//   tileSVG(name, theme)  -> 48x48 ground tile, seamless where relevant
//   propSVG(name, theme)  -> object art, viewBox 0 0 (48*w) (48*h), standing on the bottom edge
//
// Edge tiles for water / path / sand accept any combination, so a map can be auto-tiled:
//   water_edge_<sides>            sides = any of n,e,s,w: the land borders the tile on those sides
//   water_corner_<pairs>          inner corners (ne, nw, se, sw): only that diagonal neighbour is land
//   water_edge_<sides>_corner_<pairs>   both
// e.g. water_edge_n, water_edge_ne (outer corner), water_corner_sw, path_edge_ns (1-wide path).

export const TILE = 48;

const O = '#2b2140'; // outline colour (spec)
const SW = 1.6; // prop outline width

// ---------------------------------------------------------------- helpers
let _n = 0;
const uid = (p = 'w') => `${p}${(++_n).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const f = (v) => Math.round(v * 10) / 10;

function rng(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash2 = (a, b, s = 0) => {
  let h = Math.imul(a * 374761393 + b * 668265263 + s * 2147483647, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function hx(c) {
  c = c.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const n = parseInt(c, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function mix(a, b, t) { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); }
const dk = (c, t = 0.25) => mix(c, '#231433', t);
const lt = (c, t = 0.3) => mix(c, '#ffffff', t);

const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;
const P2 = (arr) => arr.map((p) => `${f(p[0])},${f(p[1])}`).join(' ');
const ol = (w = SW, c = O) => `stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const poly = (arr, fill, extra = '') => `<polygon points="${P2(arr)}" fill="${fill}" ${extra}/>`;
const circ = (x, y, r, fill, extra = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" ${extra}/>`;
const ell = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" ${extra}/>`;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}" ${extra}/>`;
const line = (d, c, w = 1, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

function grad(type, id, stops, attrs = '') {
  const s = stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('');
  return `<${type}Gradient id="${id}" ${attrs}>${s}</${type}Gradient>`;
}
const linGrad = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => grad('linear', id, stops, `x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"`);
const radGrad = (id, stops, extra = '') => grad('radial', id, stops, extra);

function shadow(cx, cy, rx, ry, op = 0.32) {
  const id = uid('sh');
  return radGrad(id, [[0, '#1b0f2e', op], [0.6, '#1b0f2e', op * 0.75], [1, '#1b0f2e', 0]]) + ell(cx, cy, rx, ry, `url(#${id})`);
}
function glow(cx, cy, rx, ry, c, op = 0.6) {
  const id = uid('gl');
  return radGrad(id, [[0, c, op], [0.45, c, op * 0.45], [1, c, 0]]) + ell(cx, cy, rx, ry, `url(#${id})`);
}
const sparkle = (x, y, s, fill, op = 1) =>
  `<path d="M${f(x)} ${f(y - s)}Q${f(x + s * 0.18)} ${f(y - s * 0.18)} ${f(x + s)} ${f(y)}Q${f(x + s * 0.18)} ${f(y + s * 0.18)} ${f(x)} ${f(y + s)}Q${f(x - s * 0.18)} ${f(y + s * 0.18)} ${f(x - s)} ${f(y)}Q${f(x - s * 0.18)} ${f(y - s * 0.18)} ${f(x)} ${f(y - s)}Z" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}/>`;
function starPts(cx, cy, R, r, n = 5, rot = -90) {
  const out = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180, rr = i % 2 ? r : R;
    out.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return out;
}
const hexPts = (cx, cy, r, sy = 1, rot = 0) => Array.from({ length: 6 }, (_, i) => {
  const a = ((rot + 60 * i) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a) * sy];
});

// Draws small items so that anything crossing the tile edge also appears on the opposite side
// (seamless tiling). Copies are painted in y order, matching a global painter's order.
function wrapItems(items) {
  const out = [];
  for (const it of items) {
    for (const dx of [-48, 0, 48]) for (const dy of [-48, 0, 48]) {
      const X = it.x + dx, Y = it.y + dy, r = it.r ?? 8;
      if (X + r < 0 || X - r > 48 || Y + r < 0 || Y - (it.below ?? r) > 48) continue;
      out.push({ y: Y, s: it.draw(X, Y) });
    }
  }
  return out.sort((a, b) => a.y - b.y).map((o) => o.s).join('');
}

// Cel-shaded union of circles (tree canopies, bushes): outline, dark base, lit body, highlights.
function blob(circles, base, dark, light, sw = SW) {
  let s = circles.map(([x, y, r]) => circ(x, y, r + sw, O)).join('');
  s += circles.map(([x, y, r]) => circ(x, y, r, dark)).join('');
  s += circles.map(([x, y, r]) => { const k = Math.min(3.2, r * 0.3); return circ(x - k * 0.45, y - k, r - k - 0.2, base); }).join('');
  if (light) {
    const avg = circles.reduce((a, c) => a + c[1], 0) / circles.length;
    s += circles.filter((c) => c[1] <= avg + 0.1).map(([x, y, r]) => ell(x - r * 0.32, y - r * 0.42, r * 0.42, r * 0.26, light, 'opacity=".9"')).join('');
  }
  return s;
}

// ---------------------------------------------------------------- themes
const THEMES = {
  academy: {
    grass: '#7acc52', grassD: '#5db041', grassL: '#a6e374', tuft: '#4a9a37', tuftL: '#c4f09a',
    tall: '#3b9b3f', tallD: '#246c2d', tallM: '#4fb84b', tallL: '#9be772', tallTip: null,
    path: '#ecd29a', pathD: '#cda66a', pathL: '#fbebc2', pathStyle: 'dirt',
    sand: '#f4e0a4', sandD: '#d9bd7a',
    water: '#4ab2f2', waterD: '#2e8bd6', waterL: '#b8eaff', bank: '#9a744a', shore: 'grass', waterStyle: 'plain',
    floor: '#d6d9e6', floorD: '#9aa1be', floorL: '#f3f5fb', floorStyle: 'cobble',
    cliff: '#a9a1a8', cliffStyle: 'rock',
    flowers: ['#ff6b81', '#ffd23f', '#ffffff', '#ff9ad5'], flowerStyle: 'scatter',
    wood: '#c08450', stone: '#d2ccd9', rock: '#aaa5b6', roof: '#4479dd', roof2: '#e8703f', wall: '#f7eed8', trim: '#8a5634',
    leaf: '#62c24a', leafD: '#3d963a', leafL: '#a6e676', trunk: '#a8703f',
    accent: '#ffd23f', magic: '#7fd4ff', crystal: ['#8fdcff', '#5aa8ee'], mushCap: '#ea5540',
    emblem: 'book', treeStyle: 'oak', bushStyle: 'round', houseStyle: 'hip', fenceStyle: 'picket', bridgeStyle: 'wood', pillarStyle: 'classic', grassExtra: 'daisy',
  },
  number: {
    grass: '#9f83e2', grassD: '#8064cf', grassL: '#c0aaf4', tuft: '#6446b4', tuftL: '#e6d9ff',
    tall: '#5a33a8', tallD: '#3c1f7d', tallM: '#8656dc', tallL: '#d4b4ff', tallTip: '#ffe27a',
    path: '#f5cf66', pathD: '#d5a33b', pathL: '#ffeaa4', pathStyle: 'gold',
    sand: '#f6e4b0', sandD: '#dcc084',
    water: '#58b6f6', waterD: '#3a86e0', waterL: '#cff2ff', bank: '#76589c', shore: 'grass', waterStyle: 'spark',
    floor: '#d4c7ef', floorD: '#6e58a6', floorL: '#efe8fd', floorStyle: 'star',
    cliff: '#7a62b6', cliffStyle: 'crystal',
    flowers: ['#ffd84a', '#ff8ad0', '#7fe8ff', '#ffffff'], flowerStyle: 'star',
    wood: '#a07258', stone: '#d9cdf2', rock: '#9c89cc', roof: '#6d45c9', roof2: '#2ea3c9', wall: '#fdf6e6', trim: '#e3a93a',
    leaf: '#f39ad8', leafD: '#c264b4', leafL: '#ffd6f2', trunk: '#8d78b8',
    accent: '#ffd84a', magic: '#c79bff', crystal: ['#8ff2ff', '#ff9fe8'], mushCap: '#8f5be0',
    emblem: 'star', treeStyle: 'crystal', bushStyle: 'crystal', houseStyle: 'hip', fenceStyle: 'crystal', bridgeStyle: 'crystal', pillarStyle: 'obelisk', grassExtra: 'spark',
  },
  patterns: {
    grass: '#4dba4f', grassD: '#379a3e', grassL: '#82d966', tuft: '#2c8837', tuftL: '#aaec7c',
    tall: '#1e7d49', tallD: '#115733', tallM: '#2e9c55', tallL: '#80de7c', tallTip: '#ff8fc6',
    path: '#c89868', pathD: '#9f7147', pathL: '#e2bc90', pathStyle: 'leafy',
    sand: '#eedb9e', sandD: '#d1b777',
    water: '#3fb4c9', waterD: '#288aa6', waterL: '#b4f2f0', bank: '#6e5436', shore: 'grass', waterStyle: 'lily',
    floor: '#bcc79d', floorD: '#7e8b62', floorL: '#dbe4bf', floorStyle: 'flag',
    cliff: '#7d7359', cliffStyle: 'moss',
    flowers: ['#ff6fae', '#ffd23f', '#8fb8ff', '#ffffff', '#c68bff'], flowerStyle: 'rows',
    wood: '#946139', stone: '#bdbca4', rock: '#8e8b76', roof: '#e3553f', roof2: '#f2a33a', wall: '#f5e7c7', trim: '#7a4a2a',
    leaf: '#3fb04a', leafD: '#227834', leafL: '#8ce06c', trunk: '#8a5a36',
    accent: '#ff7fbf', magic: '#9dffb2', crystal: ['#86ffb8', '#36c98a'], mushCap: '#ea5540',
    emblem: 'leaf', treeStyle: 'lush', bushStyle: 'berry', houseStyle: 'mush', fenceStyle: 'log', bridgeStyle: 'rope', pillarStyle: 'classic', grassExtra: 'clover',
  },
  shape: {
    grass: '#ddbd6c', grassD: '#c7a152', grassL: '#f1d892', tuft: '#9c9a40', tuftL: '#f7e6a8',
    tall: '#a85a1c', tallD: '#6f360e', tallM: '#d98a2e', tallL: '#ffd680', tallTip: '#fff1b8',
    path: '#d98b5f', pathD: '#b2663f', pathL: '#f0ad82', pathStyle: 'clay',
    sand: '#f3dcaa', sandD: '#d8b980',
    water: '#3cc2d2', waterD: '#2297b0', waterL: '#b8f6f4', bank: '#a3603a', shore: 'grass', waterStyle: 'plain',
    floor: '#dd9165', floorD: '#ad623c', floorL: '#f3b88e', floorStyle: 'terra',
    cliff: '#d0804a', cliffStyle: 'strata', strata: ['#eaa464', '#d27a4a', '#bb603b', '#eab574', '#cc6c42'],
    flowers: ['#ff7a5c', '#ffd23f', '#ff9ad0', '#fff2c0'], flowerStyle: 'scatter',
    wood: '#a8683e', stone: '#ecc48e', rock: '#db9b62', roof: '#c8583a', roof2: '#3fb0a8', wall: '#f2cf98', trim: '#8a4a2a',
    leaf: '#93b24a', leafD: '#62822e', leafL: '#c3dc70', trunk: '#8f5a34',
    accent: '#ff9a3c', magic: '#ffba5c', crystal: ['#ffc15a', '#ff7f45'], mushCap: '#d8783c',
    emblem: 'hex', treeStyle: 'cone', bushStyle: 'cactus', houseStyle: 'adobe', fenceStyle: 'stone', bridgeStyle: 'stone', pillarStyle: 'geo', grassExtra: 'pebble',
  },
  stats: {
    grass: '#56c7a6', grassD: '#3ca78a', grassL: '#8ae3c5', tuft: '#2d8c77', tuftL: '#bdf5e2',
    tall: '#1a6f72', tallD: '#0d4a4f', tallM: '#2c9990', tallL: '#9af2dc', tallTip: '#fff0b0',
    path: '#e8dab2', pathD: '#c3b088', pathL: '#f8efd0', pathStyle: 'shell',
    sand: '#f6e3ae', sandD: '#dbc084',
    water: '#2f94dd', waterD: '#1d6cbd', waterL: '#aee3ff', bank: '#cfae6e', shore: 'sand', waterStyle: 'waves',
    floor: '#c49464', floorD: '#8a603a', floorL: '#ddb484', floorStyle: 'plank',
    cliff: '#7d8b9e', cliffStyle: 'slate',
    flowers: ['#ff8fb0', '#ffffff', '#ffd23f', '#b18cff'], flowerStyle: 'scatter',
    wood: '#ab8d6c', stone: '#bfcad2', rock: '#8d9cab', roof: '#2f8fa1', roof2: '#f0b43a', wall: '#f8f6ee', trim: '#2b5f8a',
    leaf: '#40b98a', leafD: '#25866a', leafL: '#86e4b4', trunk: '#b08a5e',
    accent: '#ffd84a', magic: '#6fe8ff', crystal: ['#86f2ea', '#3fb8d8'], mushCap: '#2fa0b0',
    emblem: 'bolt', treeStyle: 'palm', bushStyle: 'dune', houseStyle: 'hip', fenceStyle: 'rope', bridgeStyle: 'dock', pillarStyle: 'classic', grassExtra: 'wind',
  },
};
for (const [id, P] of Object.entries(THEMES)) {
  P.id = id;
  for (const k of ['wood', 'stone', 'rock', 'roof', 'roof2', 'wall', 'cliff', 'trim', 'accent', 'magic', 'trunk']) {
    P[k + 'D'] ??= dk(P[k], 0.3);
    P[k + 'L'] ??= lt(P[k], 0.32);
  }
}
const CANOPY = {
  academy: ['round', [['#58ba48', '#35893a', '#95dc6c'], ['#49a843', '#2d7a35', '#80d064']]],
  number: ['round', [['#f28fd7', '#bd59b2', '#ffd3f1'], ['#b584ee', '#8152c8', '#e2ccff']]],
  patterns: ['round', [['#35a74b', '#1c6f34', '#80da66'], ['#2a9345', '#17602d', '#6dca5c']]],
  shape: ['pine', [['#93a650', '#5b6e30', '#c6d67c'], ['#7d9547', '#4c602a', '#b1c66e']]],
  stats: ['palm', [['#40bb8b', '#22825e', '#8ae6b6'], ['#4ec79c', '#2a8e69', '#a0eec6']]],
};
for (const [id, P] of Object.entries(THEMES)) {
  P.cliffTop ??= { academy: '#a2a697', number: '#877ab0', patterns: '#7c8a66', shape: '#cc8c56', stats: '#93a2ab' }[id];
  [P.canopyStyle, P.canopy] = CANOPY[id];
}
const theme = (t) => THEMES[t] || THEMES.academy;
export const THEME_NAMES = Object.keys(THEMES);

// ---------------------------------------------------------------- ground textures
function tuft(x, y, c, cl, lean = 0, s = 1) {
  const p = (dx, dy) => `${f(x + dx * s)} ${f(y + dy * s)}`;
  return `<path d="M${p(-3.2, 0)}L${p(-2.4 + lean, -3.6)}L${p(-1.1, -0.8)}L${p(0.2 + lean, -5.2)}L${p(1.1, -0.8)}L${p(2.6 + lean, -3.4)}L${p(3.2, 0)}Z" fill="${c}"/>` +
    (cl ? `<path d="M${p(0.2 + lean, -5.2)}L${p(-0.3, -1.8)}" stroke="${cl}" stroke-width=".8" stroke-linecap="round" opacity=".8"/>` : '');
}

// Details shared by every grass-based tile, all wrapping, so grass/grass2/edge tiles join seamlessly.
function grassShared(P) {
  const R = rng('grass' + P.id);
  const mott = [], tufts = [];
  for (let i = 0; i < 7; i++) {
    const x = R() * 48, y = R() * 48, rx = 7 + R() * 8, ry = rx * (0.45 + R() * 0.2), light = i % 2 === 1;
    mott.push({ x, y, r: rx + 1, draw: (X, Y) => ell(X, Y, rx, ry, light ? P.grassL : P.grassD, `opacity="${light ? 0.22 : 0.2}"`) });
  }
  const lean = P.grassExtra === 'wind' ? 1.2 : 0;
  const spots = [[6, 9], [30, 5], [19, 22], [42, 20], [9, 36], [33, 38], [24, 46]];
  for (const [bx, by] of spots) {
    const x = bx + (R() - 0.5) * 6, y = by + (R() - 0.5) * 5, s = 0.85 + R() * 0.35;
    tufts.push({ x, y, r: 6, draw: (X, Y) => tuft(X, Y, P.tuft, P.tuftL, lean, s) });
  }
  return wrapItems(mott) + wrapItems(tufts);
}

function grassExtra(P, variant) {
  const R = rng('gx' + P.id + variant);
  let s = '';
  const inner = (n) => Array.from({ length: n }, () => [6 + R() * 36, 6 + R() * 36]);
  if (variant === 0) {
    for (const [x, y] of inner(2)) s += circ(x, y, 0.9, P.tuftL, 'opacity=".8"');
    return s;
  }
  switch (P.grassExtra) {
    case 'daisy':
      for (const [x, y] of inner(4)) s += [0, 72, 144, 216, 288].map((a) => circ(x + 1.3 * Math.cos(a * Math.PI / 180), y + 1.3 * Math.sin(a * Math.PI / 180), 1, '#fff')).join('') + circ(x, y, 0.8, '#ffd23f');
      break;
    case 'spark':
      for (const [x, y] of inner(3)) s += sparkle(x, y, 2.2, '#fff6c4', 0.95);
      for (const [x, y] of inner(3)) s += circ(x, y, 0.9, '#fff', 'opacity=".8"');
      break;
    case 'clover':
      for (const [x, y] of inner(4)) s += [[-1, 0], [1, 0], [0, -1.6]].map(([a, b]) => circ(x + a * 1.2, y + b, 1.3, P.grassL)).join('') + line(`M${f(x)} ${f(y + 0.6)}v2`, P.tuft, 0.7);
      break;
    case 'pebble':
      for (const [x, y] of inner(4)) s += ell(x, y, 1.8, 1.2, P.grassD) + ell(x - 0.3, y - 0.4, 1.2, 0.7, P.grassL);
      s += line(`M${f(12 + R() * 20)} ${f(14 + R() * 20)}l3 1.5l2 -1l3 2`, P.grassD, 0.8);
      break;
    case 'wind':
      for (const [x, y] of inner(3)) s += [0, 90, 180, 270].map((a) => circ(x + 1.1 * Math.cos(a * Math.PI / 180), y + 1.1 * Math.sin(a * Math.PI / 180), 0.9, '#ffc4d8')).join('') + circ(x, y, 0.6, '#fff');
      break;
  }
  for (let i = 0; i < 2; i++) { const [x, y] = inner(1)[0]; s += tuft(x, y, P.tuft, P.tuftL, 0, 0.8); }
  return s;
}

const grassTex = (P, variant = 0) => rect(0, 0, 48, 48, P.grass) + grassShared(P) + grassExtra(P, variant);

function sandTex(P) {
  const R = rng('sand' + P.id);
  const it = [];
  for (let i = 0; i < 5; i++) {
    const x = R() * 48, y = 4 + i * 9.5 + R() * 3, w = 7 + R() * 5;
    it.push({ x, y, r: w + 2, draw: (X, Y) => line(`M${f(X - w)} ${f(Y)}q${f(w / 2)} -2 ${f(w)} 0t${f(w)} 0`, P.sandD, 1, 'opacity=".55"') });
  }
  for (let i = 0; i < 9; i++) {
    const x = R() * 48, y = R() * 48, c = i % 3 ? P.sandD : lt(P.sand, 0.5);
    it.push({ x, y, r: 2, draw: (X, Y) => circ(X, Y, 0.8, c, 'opacity=".8"') });
  }
  return rect(0, 0, 48, 48, P.sand) + wrapItems(it);
}

// Region outline for water/path/sand overlays. The overlay covers the tile except bands along
// the sides listed in `sides` (land) and inner-corner notches. Shorelines are gently scalloped;
// bumps vanish (with zero slope) at multiples of `period`, so neighbouring tiles always meet.
function regionPath(sides, inner, { m, ms = m, r, period, amp }) {
  const E = 12;
  const x0 = sides.w ? m : -E, x1 = sides.e ? 48 - m : 48 + E, y0 = sides.n ? m : -E, y1 = sides.s ? 48 - ms : 48 + E;
  const B = (t) => {
    const k = (((t % period) + period) % period) / period;
    return amp * (0.6 + 0.4 * Math.sin((2 * Math.PI * t) / 48 + 1)) * (1 - Math.cos(2 * Math.PI * k)) / 2;
  };
  const P = [];
  const push = (x, y) => P.push(`${f(x)},${f(y)}`);
  const arc = (cx, cy, rad, a0, a1) => { for (let i = 0; i <= 8; i++) { const a = a0 + ((a1 - a0) * i) / 8; push(cx + rad * Math.cos(a), cy + rad * Math.sin(a)); } };
  const ri = 6, PI = Math.PI;
  const run = (a, b, fn) => { const n = Math.max(1, Math.ceil(Math.abs(b - a) / 2)); for (let i = 0; i <= n; i++) fn(a + ((b - a) * i) / n); };
  // NW
  if (sides.n && sides.w) arc(x0 + r, y0 + r, r, PI, 1.5 * PI);
  else if (!sides.n && !sides.w && inner.nw) { push(-E, m); push(m - ri, m); arc(m - ri, m - ri, ri, 0.5 * PI, 0); push(m, -E); }
  else push(x0, y0);
  if (sides.n) run(sides.w ? x0 + r : x0, sides.e ? x1 - r : x1, (x) => push(x, y0 + B(x)));
  // NE
  if (sides.n && sides.e) arc(x1 - r, y0 + r, r, 1.5 * PI, 2 * PI);
  else if (!sides.n && !sides.e && inner.ne) { push(48 - m, -E); push(48 - m, m - ri); arc(48 - m + ri, m - ri, ri, PI, 0.5 * PI); push(48 + E, m); }
  else push(x1, y0);
  if (sides.e) run(sides.n ? y0 + r : y0, sides.s ? y1 - r : y1, (y) => push(x1 - B(y), y));
  // SE
  if (sides.s && sides.e) arc(x1 - r, y1 - r, r, 0, 0.5 * PI);
  else if (!sides.s && !sides.e && inner.se) { push(48 + E, 48 - ms); push(48 - m + ri, 48 - ms); arc(48 - m + ri, 48 - ms + ri, ri, 1.5 * PI, PI); push(48 - m, 48 + E); }
  else push(x1, y1);
  if (sides.s) run(sides.e ? x1 - r : x1, sides.w ? x0 + r : x0, (x) => push(x, y1 - B(x)));
  // SW
  if (sides.s && sides.w) arc(x0 + r, y1 - r, r, 0.5 * PI, PI);
  else if (!sides.s && !sides.w && inner.sw) { push(m, 48 + E); push(m, 48 - ms + ri); arc(m - ri, 48 - ms + ri, ri, 0, -0.5 * PI); push(-E, 48 - ms); }
  else push(x0, y1);
  if (sides.w) run(sides.s ? y1 - r : y1, sides.n ? y0 + r : y0, (y) => push(x0 + B(y), y));
  return 'M' + P.join('L') + 'Z';
}

function waterTex(P) {
  const R = rng('water' + P.id);
  const it = [];
  const ripple = (X, Y, w, c, op) => line(`M${f(X - w)} ${f(Y)}q${f(w)} -2.6 ${f(w * 2)} 0`, c, 1.3, `opacity="${op}"`);
  const spots = [[8, 8], [32, 6], [20, 20], [42, 26], [6, 32], [28, 38], [44, 44], [16, 44]];
  spots.forEach(([bx, by], i) => {
    const x = bx + (R() - 0.5) * 4, y = by + (R() - 0.5) * 4, w = 2.5 + R() * 2.5;
    const light = i % 3 !== 2;
    it.push({ x, y, r: w + 2, draw: (X, Y) => ripple(X, Y, w, light ? P.waterL : P.waterD, light ? 0.75 : 0.5) });
  });
  let s = '';
  // big soft light/dark patches for depth
  const blobs = [];
  for (let i = 0; i < 4; i++) {
    const x = R() * 48, y = R() * 48, rx = 8 + R() * 6;
    blobs.push({ x, y, r: rx + 1, draw: (X, Y) => ell(X, Y, rx, rx * 0.5, i % 2 ? P.waterL : P.waterD, `opacity="${i % 2 ? 0.14 : 0.18}"`) });
  }
  s += wrapItems(blobs) + wrapItems(it);
  if (P.waterStyle === 'spark') {
    s += wrapItems([[14, 13, 2.6], [37, 33, 2], [25, 42, 1.6], [40, 9, 1.4]].map(([x, y, k]) => ({ x, y, r: 4, draw: (X, Y) => sparkle(X, Y, k, '#fff', 0.9) })));
  } else if (P.waterStyle === 'waves') {
    s += wrapItems([[12, 16], [36, 30], [20, 40]].map(([x, y]) => ({ x, y, r: 7, draw: (X, Y) => line(`M${X - 5} ${Y}q2.5 -3 5 0q2.5 -3 5 0`, '#fff', 1.4, 'opacity=".8"') })));
  } else if (P.waterStyle === 'lily') {
    const pad = (X, Y, rr, flower) => {
      let t = `<path d="M${f(X)} ${f(Y)}L${f(X + rr * 0.95)} ${f(Y - rr * 0.35)}A${rr} ${f(rr * 0.7)} 0 1 1 ${f(X + rr * 0.95)} ${f(Y + rr * 0.1)}Z" fill="${P.leafD}"/>`;
      t += `<path d="M${f(X)} ${f(Y - 0.8)}L${f(X + rr * 0.9)} ${f(Y - rr * 0.4)}A${f(rr * 0.92)} ${f(rr * 0.62)} 0 1 1 ${f(X + rr * 0.88)} ${f(Y - 0.3)}Z" fill="${P.leaf}"/>`;
      if (flower) t += [0, 72, 144, 216, 288].map((a) => ell(X - 1 + 1.8 * Math.cos(a * Math.PI / 180), Y - 2 + 1.1 * Math.sin(a * Math.PI / 180), 1.5, 1.1, '#ffb3d6')).join('') + circ(X - 1, Y - 2, 0.9, '#ffe066');
      return t;
    };
    s += wrapItems([[13, 30, 5, true], [35, 14, 4, false], [38, 40, 3.2, false]].map(([x, y, rr, fl]) => ({ x, y, r: 7, draw: (X, Y) => pad(X, Y, rr, fl) })));
  }
  return s;
}

function pathTex(P) {
  const R = rng('path' + P.id);
  const it = [];
  let s = '';
  const peb = (X, Y, rx, c) => ell(X, Y + 0.6, rx, rx * 0.65, dk(c, 0.25)) + ell(X, Y, rx, rx * 0.65, c) + ell(X - rx * 0.3, Y - rx * 0.25, rx * 0.45, rx * 0.25, lt(c, 0.4));
  if (P.pathStyle === 'clay') {
    // irregular terracotta flagstones on a jittered 16px grid (wrapping jitter table)
    const J = [[1.8, -1.5, 0.6], [-1, 2, -2], [2.2, 0.4, -1.4]];
    const K = [[-1.2, 1.4, 0.2], [1.6, -1.8, 1], [-0.4, 1.2, -1.6]];
    const v = (i, j) => [i * 16 + J[((i % 3) + 3) % 3][((j % 3) + 3) % 3], j * 16 + K[((i % 3) + 3) % 3][((j % 3) + 3) % 3]];
    s += rect(-2, -2, 52, 52, P.pathD);
    for (let i = -1; i < 3; i++) for (let j = -1; j < 3; j++) {
      const q = [v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)];
      const h = hash2(((i % 3) + 3) % 3, ((j % 3) + 3) % 3, 7);
      const c = mix(P.path, h > 0.5 ? P.pathL : P.pathD, Math.abs(h - 0.5) * 0.5);
      s += poly(q, c, `stroke="${P.pathD}" stroke-width="2.4" stroke-linejoin="round"`);
      s += line(`M${f(q[3][0] + 2)} ${f(q[3][1] - 2.5)}L${f(q[0][0] + 2.5)} ${f(q[0][1] + 2.5)}L${f(q[1][0] - 2.5)} ${f(q[1][1] + 2)}`, lt(c, 0.3), 1, 'opacity=".7"');
    }
    return s;
  }
  for (let i = 0; i < 7; i++) {
    const x = R() * 48, y = R() * 48, rx = 1.2 + R() * 1.6;
    it.push({ x, y, r: 4, draw: (X, Y) => peb(X, Y, rx, i % 2 ? P.pathD : mix(P.path, P.pathD, 0.5)) });
  }
  for (let i = 0; i < 10; i++) {
    const x = R() * 48, y = R() * 48;
    it.push({ x, y, r: 2, draw: (X, Y) => circ(X, Y, 0.7, i % 2 ? P.pathL : P.pathD, 'opacity=".8"') });
  }
  const blobs = [];
  for (let i = 0; i < 4; i++) {
    const x = R() * 48, y = R() * 48, rx = 6 + R() * 6;
    blobs.push({ x, y, r: rx + 1, draw: (X, Y) => ell(X, Y, rx, rx * 0.55, i % 2 ? P.pathL : P.pathD, `opacity="${i % 2 ? 0.45 : 0.22}"`) });
  }
  s += wrapItems(blobs) + wrapItems(it);
  if (P.pathStyle === 'gold') {
    s += wrapItems([[8, 30, 7], [30, 20, 8], [40, 44, 6]].map(([x, y, w]) => ({ x, y, r: w + 2, draw: (X, Y) => line(`M${f(X - w)} ${f(Y)}q${f(w / 2)} -1.5 ${f(w)} 0t${f(w)} 0`, P.pathD, 1.2, 'opacity=".6"') })));
    s += wrapItems([[12, 18, 2.4], [34, 9, 1.8], [38, 36, 2.2], [18, 40, 1.5]].map(([x, y, k]) => ({ x, y, r: 3, draw: (X, Y) => sparkle(X, Y, k, '#fffbe0') })));
  } else if (P.pathStyle === 'leafy') {
    const leafS = (X, Y, a, c) => `<path d="M0 0Q2 -2 4.5 0Q2 2 0 0Z" fill="${c}" transform="translate(${f(X)} ${f(Y)}) rotate(${a})"/>`;
    s += wrapItems([[10, 14, 30, '#e8903a'], [30, 30, -50, '#7fbf4a'], [40, 12, 120, '#d9b03a'], [20, 38, 200, '#e8703a']].map(([x, y, a, c]) => ({ x, y, r: 5, draw: (X, Y) => leafS(X, Y, a, c) })));
  } else if (P.pathStyle === 'shell') {
    const shell = (X, Y) => `<path d="M${X - 2.2} ${Y}a2.2 2 0 0 1 4.4 0Z" fill="#fff4f0" stroke="#e8b8b0" stroke-width=".6"/>` + line(`M${X} ${Y}v-1.6M${X - 1.1} ${Y}l-.6 -1.2M${X + 1.1} ${Y}l.6 -1.2`, '#e8b8b0', 0.4);
    s += wrapItems([[14, 20], [36, 38]].map(([x, y]) => ({ x, y, r: 3, draw: shell })));
  }
  return s;
}

function tallgrassTile(P) {
  let s = rect(0, 0, 48, 48, P.tall);
  // darker base stripes between rows give depth
  for (const y of [16, 32, 48]) s += rect(0, y - 4, 48, 4, P.tallD, 'opacity=".35"');
  const edge = dk(P.tallD, 0.35);
  const leaf = (bx, by, bw, tx, ty, c) =>
    `<path d="M${f(bx - bw)} ${f(by)}Q${f((bx - bw + tx) / 2 - 1)} ${f((by + ty) / 2)} ${f(tx)} ${f(ty)}Q${f((bx + bw + tx) / 2 + 1.2)} ${f((by + ty) / 2)} ${f(bx + bw)} ${f(by)}Z" fill="${c}" stroke="${edge}" stroke-width=".8" stroke-linejoin="round"/>`;
  const clump = (x, y) => {
    const h = 16;
    let c = leaf(x - 5, y, 3, x - 9, y - h * 0.78, P.tallD) + leaf(x + 5, y, 3, x + 9.5, y - h * 0.8, P.tallD);
    c += leaf(x - 3, y, 3, x - 5, y - h * 0.62, P.tallM) + leaf(x + 3.5, y, 3, x + 6, y - h * 0.66, P.tallM);
    c += leaf(x, y, 3.4, x + 0.5, y - h, P.tallM);
    c += line(`M${f(x - 0.8)} ${f(y - 2)}Q${f(x - 1)} ${f(y - h * 0.5)} ${f(x + 0.2)} ${f(y - h + 2.5)}`, P.tallL, 1.4);
    c += line(`M${f(x - 4)} ${f(y - 2)}Q${f(x - 4.6)} ${f(y - 6)} ${f(x - 5)} ${f(y - h * 0.62 + 2.5)}`, P.tallL, 0.8, 'opacity=".7"');
    if (P.tallTip) {
      if (P.id === 'number') c += sparkle(x + 0.5, y - h - 0.5, 2.2, P.tallTip) + circ(x - 9, y - h * 0.78 - 0.5, 1.1, '#fff4c0') + circ(x + 9.5, y - h * 0.8 - 0.5, 1.1, '#ffd0f4');
      else if (P.id === 'patterns') c += circ(x + 0.5, y - h + 0.3, 1.5, P.tallTip, `stroke="${edge}" stroke-width=".5"`) + circ(x - 9, y - h * 0.78, 1.1, '#ffe07a');
      else c += ell(x + 0.6, y - h - 1.2, 1.3, 2.6, P.tallTip, `stroke="${dk(P.tallTip, 0.45)}" stroke-width=".5"`) + ell(x - 9, y - h * 0.78 - 1, 1, 2, P.tallTip) + ell(x + 9.5, y - h * 0.8 - 1, 1, 2, P.tallTip);
    }
    return c;
  };
  for (const [x, y] of [[11, 16], [35, 16], [14, 32], [38, 32], [10, 47], [34, 47]]) s += clump(x, y);
  return s;
}

function flowersTile(P) {
  let s = grassTex(P, 0);
  const C = P.flowers;
  const flower = (x, y, c, k = 1) => {
    if (P.flowerStyle === 'star') return line(`M${f(x)} ${f(y + 1)}v3`, P.tuft, 0.9) + `<polygon points="${P2(starPts(x, y, 2.8 * k, 1.3 * k))}" fill="${c}" stroke="${dk(c, 0.35)}" stroke-width=".5"/>` + circ(x, y, 0.7 * k, '#fff');
    let t = line(`M${f(x)} ${f(y + 1)}v3`, P.tuft, 0.9) + ell(x - 2, y + 3.4, 1.6, 0.8, P.tuft);
    t += [0, 72, 144, 216, 288].map((a) => circ(x + 1.7 * k * Math.cos((a - 90) * Math.PI / 180), y + 1.5 * k * Math.sin((a - 90) * Math.PI / 180), 1.4 * k, c, `stroke="${dk(c, 0.3)}" stroke-width=".4"`)).join('');
    return t + circ(x, y, 0.95 * k, c === '#ffd23f' ? '#ff9a3c' : '#ffe066');
  };
  const leafy = (x, y) => ell(x - 3, y + 2.5, 3, 1.4, P.tuft, 'transform="rotate(-20 ' + f(x - 3) + ' ' + f(y + 2.5) + ')"') + ell(x + 3, y + 2.8, 3, 1.3, dk(P.tuft, 0.1), 'transform="rotate(20 ' + f(x + 3) + ' ' + f(y + 2.8) + ')"');
  if (P.flowerStyle === 'rows') {
    [11, 23, 35, 46].forEach((y, r) => [6, 18, 30, 42].forEach((x, i) => { s += leafy(x, y - 2) + flower(x, y - 3, C[(r + (i % 2) * 2) % C.length], 1.25); }));
  } else {
    const R = rng('fl' + P.id);
    const spots = [[11, 12], [33, 9], [22, 26], [40, 30], [9, 36], [28, 41]];
    spots.forEach(([x, y], i) => {
      const c = C[i % C.length];
      s += leafy(x, y) + flower(x - 2.5, y + 0.5, c, 1.2) + flower(x + 2.8, y - 0.5, C[(i + 1) % C.length], 1.05) + flower(x, y - 3.2, c, 1.1);
    });
  }
  return s;
}

function floorTile(P) {
  let s = rect(0, 0, 48, 48, P.floorD);
  const st = P.floorStyle;
  const shadeFor = (i, j, s2 = 3) => { const h = hash2(i, j, s2); return mix(P.floor, h > 0.5 ? P.floorL : P.floorD, Math.abs(h - 0.5) * 0.45); };
  if (st === 'cobble') {
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 8 : 0;
      for (let i = -1; i < 3; i++) {
        const x = i * 16 + off, y = row * 12, c = shadeFor((((x % 48) + 48) % 48), row);
        s += rect(x + 1, y + 1, 14, 10, dk(c, 0.18), 'rx="3"') + rect(x + 1, y + 1, 14, 9, c, 'rx="3"') + rect(x + 3, y + 2, 9, 2, lt(c, 0.45), 'rx="1" opacity=".8"');
      }
    }
  } else if (st === 'star') {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const c = (i + j) % 2 ? P.floor : mix(P.floor, P.floorL, 0.45);
      s += rect(i * 24 + 1, j * 24 + 1, 22, 22, dk(c, 0.12), 'rx="2"') + rect(i * 24 + 1, j * 24 + 1, 22, 21, c, 'rx="2"') + rect(i * 24 + 3, j * 24 + 2.5, 16, 1.6, lt(c, 0.5), 'rx=".8" opacity=".8"');
      if ((i + j) % 2 === 0) s += sparkle(i * 24 + 12, j * 24 + 12, 4.5, lt(P.floorD, 0.35), 0.8);
    }
    for (const x of [0, 24, 48]) for (const y of [0, 24, 48]) s += poly([[x, y - 4], [x + 4, y], [x, y + 4], [x - 4, y]], P.accent, `stroke="${dk(P.accent, 0.4)}" stroke-width=".8"`);
  } else if (st === 'flag') {
    const J = [[1.8, -1.5, 0.6], [-1, 2, -2], [2.2, 0.4, -1.4]];
    const K = [[-1.2, 1.4, 0.2], [1.6, -1.8, 1], [-0.4, 1.2, -1.6]];
    const md = (a) => ((a % 3) + 3) % 3;
    const v = (i, j) => [i * 16 + J[md(i)][md(j)], j * 16 + K[md(i)][md(j)]];
    for (let i = -1; i < 3; i++) for (let j = -1; j < 3; j++) {
      const q = [v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)];
      const c = shadeFor(md(i), md(j));
      s += poly(q, c, `stroke="${P.floorD}" stroke-width="2.6" stroke-linejoin="round"`);
      s += line(`M${f(q[3][0] + 2.5)} ${f(q[3][1] - 3)}L${f(q[0][0] + 2.8)} ${f(q[0][1] + 2.8)}L${f(q[1][0] - 3)} ${f(q[1][1] + 2.5)}`, lt(c, 0.4), 1.1, 'opacity=".7"');
    }
    for (const [x, y] of [[16, 16], [32, 32], [0, 32], [48, 32], [32, 0], [32, 48]]) s += circ(x + 1, y, 2.2, P.leaf, 'opacity=".75"') + circ(x - 1, y + 1, 1.5, P.leafL, 'opacity=".7"');
  } else if (st === 'terra') {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const c = (i + j) % 2 ? P.floor : mix(P.floor, P.floorL, 0.35), X = i * 24, Y = j * 24;
      s += rect(X + 1, Y + 1, 22, 22, dk(c, 0.15)) + rect(X + 1, Y + 1, 22, 21, c) + rect(X + 2, Y + 2, 19, 1.4, lt(c, 0.4), 'opacity=".8"');
      s += poly([[X + 12, Y + 5], [X + 19, Y + 12], [X + 12, Y + 19], [X + 5, Y + 12]], (i + j) % 2 ? lt(c, 0.25) : dk(c, 0.12), `stroke="${dk(c, 0.3)}" stroke-width=".8"`);
      s += poly([[X + 12, Y + 9], [X + 15, Y + 12], [X + 12, Y + 15], [X + 9, Y + 12]], (i + j) % 2 ? P.roof2 : P.accent, 'opacity=".85"');
    }
  } else if (st === 'plank') {
    for (let r = 0; r < 6; r++) {
      const y = r * 8, c = mix(P.floor, hash2(r, 1, 5) > 0.5 ? P.floorL : P.floorD, 0.25);
      s += rect(0, y + 0.6, 48, 7, c) + rect(0, y + 0.6, 48, 1.2, lt(c, 0.3), 'opacity=".8"');
      s += line(`M${(r * 13) % 40 + 2} ${y + 4.3}h${6 + (r % 3) * 3}`, dk(c, 0.18), 0.7);
      const seam = (r * 19 + 7) % 48;
      s += rect(seam - 0.6, y + 0.6, 1.2, 7, P.floorD) + circ(seam - 2.2, y + 4, 0.6, dk(P.floorD, 0.3)) + circ(seam + 2.2, y + 4, 0.6, dk(P.floorD, 0.3));
    }
  }
  return s;
}

// Rock face texture (cliff walls), covering the tile from y≈9 down; wraps horizontally.
function cliffFace(P) {
  const st = P.cliffStyle, C = P.cliff, CD = P.cliffD, CL = P.cliffL, E = dk(C, 0.5);
  let s = rect(0, 0, 48, 48, C);
  if (st === 'strata') {
    const S = P.strata;
    const bands = [10, 17, 24, 31, 38, 44];
    bands.forEach((y, i) => {
      const y2 = (bands[i + 1] ?? 50);
      const wav = (x) => y + 1.2 * Math.sin((2 * Math.PI * x) / 48 + i * 1.7);
      let d = `M-1 ${f(wav(-1))}`;
      for (let x = 3; x <= 49; x += 4) d += `L${x} ${f(wav(x))}`;
      d += `L49 ${y2 + 2}L-1 ${y2 + 2}Z`;
      s += `<path d="${d}" fill="${S[i % S.length]}"/>`;
      s += line(d.split('L49')[0], lt(S[i % S.length], 0.35), 1, 'opacity=".8"');
    });
    s += line('M14 19l1 5l-1 5M34 30l-1 6l1 4M40 13l1 4M8 36l1 5', dk(C, 0.45), 1, 'opacity=".7"');
  } else if (st === 'slate') {
    const cols = [0, 11, 23, 35, 48];
    for (let i = 0; i < 4; i++) {
      const a = cols[i], b = cols[i + 1], c = mix(C, hash2(i, 2, 9) > 0.5 ? CL : CD, 0.35);
      s += rect(a + 0.7, 8, b - a - 1.4, 40, c) + rect(a + 0.7, 8, 2.5, 40, lt(c, 0.25)) + rect(b - 3.2, 8, 2.5, 40, dk(c, 0.18));
      s += line(`M${a + 0.7} ${20 + i * 5}h${b - a - 1.4}`, dk(c, 0.3), 1);
    }
    s += circ(15, 34, 1.3, '#e8eef2') + circ(17.5, 35.5, 0.9, '#e8eef2') + circ(40, 27, 1.1, '#e8eef2');
  } else {
    // rounded boulders (rock / crystal / moss share this base), two staggered rows, wrapping in x
    const g = uid('cf');
    s += linGrad(g, [[0, dk(C, 0.45)], [1, dk(C, 0.7)]]) + rect(0, 0, 48, 48, `url(#${g})`);
    // craggy rock plates (hand-authored so they wrap horizontally), lit top edges, shaded right edges
    const plates = [
      [[[-2, 11], [14, 10], [17, 20], [11, 29], [-2, 27]], [[-2, 11], [14, 10]], [[14, 10], [17, 20], [11, 29]]],
      [[[14, 10], [32, 11], [30, 23], [17, 20]], [[14, 10], [32, 11]], [[32, 11], [30, 23]]],
      [[[32, 11], [46, 11], [46, 27], [38, 30], [30, 23]], [[32, 11], [46, 11]], []],
      [[[-2, 27], [11, 29], [8, 47], [-2, 47]], [[-2, 27], [11, 29]], [[11, 29], [8, 47]]],
      [[[11, 29], [17, 20], [30, 23], [26, 34], [24, 47], [8, 47]], [[11, 29], [17, 20], [30, 23]], [[30, 23], [26, 34], [24, 47]]],
      [[[30, 23], [38, 30], [46, 27], [46, 47], [24, 47], [26, 34]], [[30, 23], [38, 30], [46, 27]], []],
    ];
    plates.forEach(([pp, top, right], k) => {
      const c = mix(C, [CL, CD, C, CD, CL, C][k], 0.45);
      for (const dx of [0, 48]) {
        const mv = (arr, ox = 0, oy = 0) => arr.map(([x, y]) => [x + dx + ox, y + oy]);
        s += poly(mv(pp), c, `stroke="${E}" stroke-width="1.3" stroke-linejoin="round" stroke-opacity=".8"`);
        if (right.length) s += line('M' + P2(mv(right, -1.6, 0.5)).replace(/ /g, 'L'), dk(c, 0.3), 2.6);
        s += line('M' + P2(mv(top, 0.4, 1.9)).replace(/ /g, 'L'), lt(c, 0.5), 1.8);
      }
    });
    s += line('M6 16l2 4l-1 3M21 36l2 4M40 36l-1 5l1 3M24 14l1 3', dk(C, 0.45), 0.9, 'opacity=".8"');
    const g2 = uid('cg');
    s += linGrad(g2, [[0, '#000', 0], [0.55, '#1b0f2e', 0.05], [1, '#1b0f2e', 0.38]]) + rect(0, 9, 48, 39, `url(#${g2})`);
    if (st === 'crystal') {
      const shard = (x, y, h, c, a) => `<g transform="translate(${x} ${y}) rotate(${a})">${poly([[-2.6, 0], [-2.6, -h * 0.7], [0, -h], [2.6, -h * 0.7], [2.6, 0]], c, `stroke="${O}" stroke-width=".8" stroke-linejoin="round"`)}${poly([[0, 0], [0, -h], [2.6, -h * 0.7], [2.6, 0]], dk(c, 0.2))}${line(`M-1.3 -2V${f(-h * 0.6)}`, '#fff', 0.8, 'opacity=".8"')}</g>`;
      s += shard(15, 38, 9, P.crystal[0], -18) + shard(19, 38, 6, P.crystal[1], 16) + shard(37, 25, 7, P.crystal[1], -10) + sparkle(12, 27, 2, '#fff');
    } else if (st === 'moss') {
      s += `<path d="M-1 8Q6 18 10 10Q14 20 20 9Q27 15 33 9Q38 22 42 10Q46 15 49 8V6H-1Z" fill="${P.leafD}"/>` + `<path d="M-1 8Q6 15 10 9Q14 16 20 8Q27 12 33 8Q38 17 42 9Q46 12 49 7V6H-1Z" fill="${P.leaf}"/>`;
      s += line('M30 12q-3 8 1 14t-1 14', P.leafD, 1.3) + [[30, 18], [31, 26], [30, 34]].map(([x, y], i) => ell(x + (i % 2 ? 2 : -2), y, 2, 1.1, P.leafL)).join('');
    }
  }
  return s;
}

// Single-row cliff wall with a grass lip (stand-alone; kept for simple maps).
function cliffWall(P) {
  const C = P.cliff;
  let s = cliffFace(P);
  // grass lip on top with scalloped overhang, shadow underneath, and ground shadow at the foot
  const lipD = 'M-1 0H49V9Q46 13 42 10.5Q38 14 33 10.8Q28 14.5 22 10.8Q17 14 12 10.6Q7 13.5 3 10.5Q1 12 -1 9.5Z';
  s += `<path d="${lipD}" fill="${dk(C, 0.5)}" opacity=".5" transform="translate(0 2.5)"/>`;
  s += `<path d="${lipD}" fill="${dk(P.grass, 0.18)}"/>`;
  s += `<path d="${lipD}" fill="${P.grass}" transform="translate(0 -1.6)"/>`;
  s += line('M3 9Q7 12 12 9.2M22 9.4Q28 13 33 9.4', lt(P.grass, 0.35), 1, 'opacity=".9"');
  s += tuft(12, 5, P.tuft, null, 0, 0.8) + tuft(34, 4.5, P.tuft, null, 0, 0.8);
  s += rect(0, 44, 48, 4, dk(C, 0.5), 'opacity=".35"');
  return s;
}

// Plateau top surface: rough, desaturated rock (clearly not walkable), with cracks, pebbles,
// small boulders and a theme touch. Everything wraps, so large plateaus tile seamlessly.
function cliffTopTex(P) {
  const T = P.cliffTop, TD = dk(T, 0.28), TL = lt(T, 0.3), R = rng('top' + P.id);
  let s = rect(0, 0, 48, 48, T);
  const patches = [], cracks = [], stones = [], deco = [];
  for (let i = 0; i < 8; i++) {
    const x = R() * 48, y = R() * 48, rx = 5 + R() * 7, light = i % 2 === 0;
    const pts = Array.from({ length: 6 }, (_, k) => { const a = (k / 6) * Math.PI * 2 + R() * 0.5, rr = rx * (0.7 + R() * 0.35); return [Math.cos(a) * rr, Math.sin(a) * rr * 0.7]; });
    patches.push({ x, y, r: rx + 1, draw: (X, Y) => poly(pts.map(([u, v]) => [X + u, Y + v]), light ? TL : TD, `opacity="${light ? 0.45 : 0.4}"`) });
  }
  for (let i = 0; i < 5; i++) {
    const x = R() * 48, y = R() * 48, segs = [[0, 0]];
    for (let k = 0; k < 3; k++) { const [px, py] = segs[segs.length - 1]; segs.push([px + 2 + R() * 3, py + (R() - 0.5) * 5]); }
    cracks.push({ x, y, r: 12, draw: (X, Y) => line('M' + segs.map(([u, v]) => `${f(X + u)} ${f(Y + v)}`).join('L'), dk(T, 0.5), 1, 'opacity=".75"') + line('M' + segs.map(([u, v]) => `${f(X + u + 0.5)} ${f(Y + v + 0.9)}`).join('L'), TL, 0.7, 'opacity=".6"') });
  }
  for (let i = 0; i < 10; i++) {
    const x = R() * 48, y = R() * 48, rx = 0.9 + R() * 1.4;
    stones.push({ x, y, r: 3, draw: (X, Y) => ell(X, Y + 0.6, rx, rx * 0.7, dk(T, 0.45)) + ell(X, Y, rx, rx * 0.7, mix(T, TL, 0.4)) + ell(X - rx * 0.3, Y - rx * 0.25, rx * 0.4, rx * 0.25, lt(T, 0.6)) });
  }
  const boulder = (X, Y, w) => ell(X + 0.8, Y + w * 0.45, w * 1.1, w * 0.4, '#1b0f2e', 'opacity=".25"') +
    `<path d="M${f(X - w)} ${f(Y + w * 0.35)}Q${f(X - w * 1.1)} ${f(Y - w * 0.4)} ${f(X - w * 0.2)} ${f(Y - w * 0.7)}Q${f(X + w * 0.9)} ${f(Y - w * 0.7)} ${f(X + w)} ${f(Y + w * 0.2)}Q${f(X + w * 0.4)} ${f(Y + w * 0.6)} ${f(X - w)} ${f(Y + w * 0.35)}Z" fill="${mix(T, P.cliff, 0.5)}" stroke="${dk(T, 0.6)}" stroke-width="1"/>` +
    ell(X - w * 0.3, Y - w * 0.35, w * 0.4, w * 0.18, lt(T, 0.55), 'opacity=".9"');
  for (const [x, y, w] of [[12, 13, 4.5], [37, 31, 5.5], [26, 42, 3.5]]) stones.push({ x, y, r: w + 2, draw: (X, Y) => boulder(X, Y, w) });
  if (P.id === 'number') {
    for (const [x, y] of [[32, 14]]) deco.push({ x, y, r: 10, below: 3, draw: (X, Y) => glow(X, Y - 3, 8, 5, P.crystal[0], 0.5) + prism(X - 3, Y, 3.6, 6, P.crystal[1], -1.5) + prism(X + 3, Y, 3.6, 7, P.crystal[1], 1.5) + prism(X, Y + 0.5, 4.4, 11, P.crystal[0], 0) });
  } else if (P.id === 'patterns') {
    for (const [x, y, rr] of [[8, 25, 5], [42, 44, 4.5], [20, 8, 3.5]]) deco.push({ x, y, r: rr + 2, draw: (X, Y) => ell(X, Y, rr * 1.3, rr * 0.8, P.leafD, 'opacity=".9"') + ell(X - 0.8, Y - 0.6, rr, rr * 0.55, P.leaf) + circ(X - rr * 0.4, Y - rr * 0.3, 0.9, P.leafL) });
    for (const [x, y] of [[33, 22]]) deco.push({ x, y, r: 8, draw: (X, Y) => blob([[X, Y - 2, 3.6], [X - 3.2, Y, 2.8], [X + 3.2, Y, 2.8]], P.leaf, P.leafD, P.leafL, 1) + circ(X + 1, Y - 3, 0.9, '#ff8fc6') });
  } else if (P.id === 'shape') {
    for (const [y0, c] of [[18, P.strata[2]], [38, P.strata[4]]]) {
      let d = '';
      for (let x = -1; x <= 49; x += 4) d += (x < 0 ? 'M' : 'L') + `${x} ${f(y0 + 1.4 * Math.sin((2 * Math.PI * x) / 48 + y0))}`;
      s += line(d, c, 3.2, 'opacity=".55"') + line(d, lt(T, 0.4), 0.8, 'opacity=".6" transform="translate(0 -2)"');
    }
  } else if (P.id === 'stats') {
    const dune = (X, Y) => [[-3, 7, P.tallD], [3, 7, P.tallD], [-1.5, 9, P.tallM], [1.5, 8.5, P.tallM], [0, 10, P.tallL]].map(([dx, h, c]) => `<path d="M${f(X + dx * 0.25 - 0.9)} ${f(Y)}Q${f(X + dx * 0.4)} ${f(Y - h * 0.6)} ${f(X + dx)} ${f(Y - h)}Q${f(X + dx * 0.5 + 0.4)} ${f(Y - h * 0.5)} ${f(X + dx * 0.25 + 0.9)} ${f(Y)}Z" fill="${c}"/>`).join('') + ell(X, Y - 10.5, 0.8, 1.8, P.tallTip);
    for (const [x, y] of [[20, 20], [42, 12], [8, 44], [30, 46]]) deco.push({ x, y, r: 12, below: 2, draw: dune });
  } else {
    for (const [x, y] of [[22, 22], [44, 8]]) deco.push({ x, y, r: 6, draw: (X, Y) => tuft(X, Y, dk(P.grass, 0.25), null, 0, 0.9) });
  }
  return s + wrapItems(patches) + wrapItems(cracks) + wrapItems([...stones, ...deco]);
}

// Autotiled cliff plateau: raised top surface with a rocky rim; tall rock face along the south edge.
function cliffPlateau(P, sides, inner) {
  const FACE = 38;
  const d = regionPath(sides, inner, { m: 7, ms: 40, r: 7, period: 16, amp: 1.2 });
  const cf = uid('cf'), ct = uid('ct');
  const C = P.cliff;
  let s = grassTex(P, 0);
  s += `<path d="${d}" transform="translate(1 ${FACE + 2.5})" fill="#1b0f2e" opacity=".28"/>`;
  let clip = '';
  for (let k = 0; k <= FACE; k += 3) clip += `<path d="${d}" transform="translate(0 ${Math.min(k, FACE)})"/>`;
  clip += `<path d="${d}" transform="translate(0 ${FACE})"/>`;
  s += `<clipPath id="${cf}">${clip}</clipPath><clipPath id="${ct}"><path d="${d}"/></clipPath>`;
  s += `<g clip-path="url(#${cf})">${cliffFace(P)}</g>`;
  s += `<path d="${d}" fill="${P.cliffTop}"/><g clip-path="url(#${ct})">${cliffTopTex(P)}</g>`;
  s += `<g clip-path="url(#${ct})"><path d="${d}" fill="none" stroke="#1b0f2e" stroke-width="14" opacity=".16"/></g>`;
  s += `<path d="${d}" fill="none" stroke="${dk(C, 0.55)}" stroke-width="11" stroke-linejoin="round"/>`;
  s += `<path d="${d}" fill="none" stroke="${C}" stroke-width="8" stroke-linejoin="round"/>`;
  s += `<path d="${d}" fill="none" stroke="${lt(C, 0.3)}" stroke-width="6.5" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="7 2.4" transform="translate(-.3 -1)"/>`;
  s += `<path d="${d}" fill="none" stroke="${lt(C, 0.65)}" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="3 5.2" transform="translate(-1 -2)" opacity=".9"/>`;
  return s;
}

function canopyCrown(P, X, Y, r, k) {
  const [base, dark, light] = P.canopy[k % P.canopy.length];
  const edge = dk(dark, 0.55);
  if (P.canopyStyle === 'pine') {
    const star = (R, ri, dx = 0, dy = 0) => starPts(X + dx, Y + dy, R, ri, 8, -90 + k * 11);
    return poly(star(r + 1.3, r * 0.72 + 1), edge) + poly(star(r, r * 0.72), dark) + poly(star(r * 0.72, r * 0.5, -1, -1.8), base) +
      poly(star(r * 0.35, r * 0.22, -1.5, -3), light, 'opacity=".9"');
  }
  if (P.canopyStyle === 'palm') {
    let t = '';
    const frond = (a, L, w) => {
      const rr = (a * Math.PI) / 180, tx = X + Math.cos(rr) * L, ty = Y + Math.sin(rr) * L * 0.85 + 1.5;
      const nx = -Math.sin(rr) * w, ny = Math.cos(rr) * w;
      return `M${f(X)} ${f(Y)}Q${f((X + tx) / 2 + nx)} ${f((Y + ty) / 2 + ny - 1)} ${f(tx)} ${f(ty)}Q${f((X + tx) / 2 - nx)} ${f((Y + ty) / 2 - ny)} ${f(X)} ${f(Y)}Z`;
    };
    const layer = (d, c) => `<path d="${d}" fill="${c}" stroke="${edge}" stroke-width=".9" stroke-linejoin="round"/>`;
    t += layer([0, 1, 2, 3, 4].map((i) => frond(k * 17 + i * 72 + 36, r + 2, 3.8)).join(''), dark);
    t += layer([0, 1, 2, 3, 4].map((i) => frond(k * 17 + i * 72, r, 3.6)).join(''), base);
    const a1 = ((k * 17 - 60) * Math.PI) / 180, a2 = ((k * 17 + 84) * Math.PI) / 180;
    t += line(`M${f(X)} ${f(Y)}L${f(X + Math.cos(a1) * r * 0.7)} ${f(Y + Math.sin(a1) * r * 0.6)}M${f(X)} ${f(Y)}L${f(X + Math.cos(a2) * r * 0.7)} ${f(Y + Math.sin(a2) * r * 0.6)}`, light, 0.9, 'opacity=".9"');
    return t + circ(X, Y, 2, '#8a5a30', `stroke="${edge}" stroke-width=".6"`);
  }
  let t = circ(X, Y, r + 1.3, edge) + circ(X, Y, r, dark);
  t += circ(X - 1, Y - 2.4, r - 2.8, base) + ell(X - r * 0.35, Y - r * 0.45, r * 0.38, r * 0.24, light, 'opacity=".9"');
  t += line(`M${f(X + r * 0.1)} ${f(Y + r * 0.35)}q2 1.6 4 0`, dark, 1);
  if (P.id === 'number' && k % 3 === 0) t += sparkle(X + r * 0.3, Y - r * 0.2, 2.2, '#fff');
  if (P.id === 'patterns' && k % 3 === 1) t += circ(X + r * 0.35, Y - r * 0.1, 1.5, '#ff8fc6', `stroke="${edge}" stroke-width=".4"`) + circ(X - r * 0.4, Y + r * 0.2, 1.3, '#ffe066');
  return t;
}

function canopyTex(P) {
  const items = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const k = j * 3 + i;
    const x = i * 16 + (j % 2 ? 8 : 0) + (hash2(i, j, 21) - 0.5) * 4, y = j * 16 + 4 + (hash2(i, j, 22) - 0.5) * 3;
    const r = (P.canopyStyle === 'pine' ? 9.5 : 10.5) + hash2(i, j, 23) * 1.5;
    items.push({ x, y, r: r + 4, draw: (X, Y) => canopyCrown(P, X, Y, r, k) });
  }
  return rect(-2, -2, 52, 52, dk(P.canopy[0][1], 0.4)) + wrapItems(items);
}

// Autotiled dense forest: leafy overhang on N/E/W, a row of trunks and shadow below the south edge.
function canopyTile(P, sides, inner) {
  const d = regionPath(sides, inner, { m: 8, ms: 24, r: 8, period: 8, amp: -2.4 });
  const c = uid('cc');
  let s = grassTex(P, 0);
  if (sides.s || inner.se || inner.sw) {
    const g = uid('cs');
    s += linGrad(g, [[0, '#1b0f2e', 0], [0.5, '#1b0f2e', 0.3], [1, '#1b0f2e', 0.05]]) + rect(0, 34, 48, 14, `url(#${g})`);
    const tc = P.canopyStyle === 'palm' ? P.trunk : P.id === 'number' ? '#8d78b8' : P.trunk;
    for (const x of [4, 20, 36]) {
      if (P.canopyStyle === 'palm') {
        s += `<path d="M${x - 2.4} 43Q${x - 1} 32 ${x + 1} 20H${x + 4}Q${x + 2} 32 ${x + 2.4} 43Z" fill="${tc}" ${ol(1.1)}/>` + line(`M${x - 1.6} 38h3.6M${x - 0.8} 32h3.6M${x} 26h3.4`, dk(tc, 0.3), 0.9);
      } else {
        s += `<path d="M${x - 5} 44Q${x - 2.8} 41 ${x - 2.8} 20H${x + 2.8}Q${x + 2.8} 41 ${x + 5} 44Q${x} 45.5 ${x - 5} 44Z" fill="${tc}" ${ol(1.1)}/>`;
        s += rect(x + 0.6, 21, 1.8, 21, dk(tc, 0.3)) + line(`M${x - 1} 36v-5`, dk(tc, 0.35), 0.8);
      }
      s += tuft(x - 6, 45, P.tuft, null, 0, 0.8) + tuft(x + 7, 45.5, P.tuft, null, 0, 0.7);
    }
  }
  s += `<path d="${d}" transform="translate(.8 3.5)" fill="#1b0f2e" opacity=".35"/>`;
  s += `<clipPath id="${c}"><path d="${d}"/></clipPath><g clip-path="url(#${c})">${canopyTex(P)}</g>`;
  s += `<path d="${d}" fill="none" stroke="${dk(P.canopy[0][1], 0.55)}" stroke-width="1.6" stroke-linejoin="round"/>`;
  return s;
}

function bridgeTile(P, vertical) {
  const st = P.bridgeStyle;
  let s = '';
  const W = st === 'stone' ? P.stone : st === 'dock' ? P.wood : st === 'crystal' ? '#b8865e' : P.wood;
  const WD = dk(W, 0.35), WL = lt(W, 0.3);
  s += rect(0, 0, 48, 48, WD);
  if (st === 'stone') {
    for (let r = 0; r < 3; r++) for (let i = -1; i < 3; i++) {
      const x = i * 16 + (r % 2 ? 8 : 0), y = 7 + r * 11, c = mix(W, hash2(((x % 48) + 48) % 48, r, 4) > 0.5 ? lt(W, 0.3) : dk(W, 0.2), 0.4);
      s += rect(x + 0.8, y + 0.8, 14.4, 9.6, c, 'rx="1.5"') + rect(x + 2, y + 1.6, 10, 1.4, lt(c, 0.4), 'opacity=".8"');
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const c = mix(W, hash2(i, 3, 8) > 0.5 ? WL : dk(W, 0.15), 0.35);
      s += rect(i * 8 + 0.6, 5, 6.8, 38, c, 'rx="1"') + rect(i * 8 + 1.4, 5, 1.4, 38, lt(c, 0.3), 'opacity=".7"');
      s += line(`M${i * 8 + 4.5} ${12 + (i % 3) * 7}v${6 + (i % 2) * 4}`, dk(c, 0.2), 0.7);
      s += circ(i * 8 + 4, 9, 0.6, dk(c, 0.5)) + circ(i * 8 + 4, 39, 0.6, dk(c, 0.5));
    }
  }
  // rails (top & bottom), posts every 24px, continuous across tiles
  const railC = st === 'crystal' ? P.trim : st === 'stone' ? lt(W, 0.15) : WL;
  const rail = (y) => {
    let t = '';
    if (st === 'rope' || st === 'dock') {
      t += line(`M-2 ${y + 1}Q6 ${y + 4} 12 ${y + 1}T24 ${y + 1}T36 ${y + 1}T50 ${y + 1}`, '#e8d6a6', 1.8) + line(`M-2 ${y + 1}Q6 ${y + 4} 12 ${y + 1}T24 ${y + 1}T36 ${y + 1}T50 ${y + 1}`, '#b8a070', 0.6);
    } else {
      t += rect(-1, y - 1.5, 50, 4.2, railC, `stroke="${O}" stroke-width="1"`) + rect(-1, y - 0.8, 50, 1.2, lt(railC, 0.4));
    }
    for (const x of [12, 36]) {
      const pc = st === 'crystal' ? P.trim : st === 'stone' ? lt(W, 0.1) : W;
      t += rect(x - 2.6, y - 4, 5.2, 7.5, pc, `stroke="${O}" stroke-width="1" rx="1"`) + rect(x - 1.6, y - 3.3, 1.5, 6, lt(pc, 0.4));
      if (st === 'crystal') t += poly([[x, y - 8.5], [x + 2.2, y - 5], [x, y - 3.5], [x - 2.2, y - 5]], P.crystal[0], `stroke="${O}" stroke-width=".7"`);
      if (st === 'rope') t += ell(x + 1, y - 3.5, 2.4, 1.3, P.leaf) + ell(x - 1.5, y - 1, 1.8, 1, P.leafL);
    }
    return t;
  };
  if (!vertical) {
    s += rail(4) + rail(41);
    s += rect(0, 45, 48, 3, dk(W, 0.5));
  } else {
    s = `<g transform="rotate(90 24 24)">${s + rail(4) + rail(41)}</g>`;
  }
  return s;
}

function regionTile(P, kind, sides, inner) {
  if (kind === 'water') {
    const d = regionPath(sides, inner, { m: 12, r: 12, period: 12, amp: 2.4 });
    const c1 = uid('wc'), c2 = uid('wd');
    const land = P.shore === 'sand' ? sandTex(P) : grassTex(P, 0);
    return land +
      `<clipPath id="${c1}"><path d="${d}"/></clipPath><clipPath id="${c2}"><path d="${d}" transform="translate(0 4.5)"/></clipPath>` +
      `<path d="${d}" fill="${P.bank}" stroke="${dk(P.bank, 0.4)}" stroke-width="2"/>` +
      `<path d="${d}" fill="none" stroke="${dk(P.bank, 0.35)}" stroke-width="3" opacity=".5" transform="translate(0 6)" clip-path="url(#${c1})"/>` +
      `<g clip-path="url(#${c1})"><g clip-path="url(#${c2})">${rect(-2, -2, 52, 52, P.water)}${waterTex(P)}` +
      `<path d="${d}" transform="translate(0 4.5)" fill="none" stroke="${P.waterL}" stroke-width="9" opacity=".35"/>` +
      `<path d="${d}" transform="translate(0 4.5)" fill="none" stroke="#fff" stroke-width="1.8" opacity=".75"/></g></g>`;
  }
  const d = regionPath(sides, inner, { m: 8, r: 8, period: 16, amp: 1.8 });
  const c = uid('pc');
  const isSand = kind === 'sand';
  const fill = isSand ? P.sand : P.path, edge = isSand ? P.sandD : P.pathD;
  const tex = isSand ? sandTex(P).replace(/^<rect[^>]*>/, '') : pathTex(P);
  return grassTex(P, 0) +
    `<clipPath id="${c}"><path d="${d}"/></clipPath>` +
    `<path d="${d}" fill="${dk(edge, 0.3)}" opacity=".35" transform="translate(0 1.2)"/>` +
    `<path d="${d}" fill="${fill}"/>` +
    `<g clip-path="url(#${c})">${tex}<path d="${d}" fill="none" stroke="${edge}" stroke-width="6" opacity=".5"/><path d="${d}" fill="none" stroke="${lt(fill, 0.4)}" stroke-width="1" opacity=".7" transform="translate(0 2.6)"/></g>` +
    `<path d="${d}" fill="none" stroke="${dk(edge, 0.35)}" stroke-width="1.2" opacity=".75"/>` +
    `<path d="${d}" fill="none" stroke="${lt(P.grass, 0.3)}" stroke-width="1" opacity=".9" transform="translate(0 -1)"/>`;
}

function parseEdge(name) {
  const m = name.match(/^(water|path|sand|cliff|canopy)(?:_edge_([nesw]+))?(?:_corner_((?:ne|nw|se|sw)+))?$/);
  if (!m) return null;
  const sides = { n: false, e: false, s: false, w: false }, inner = {};
  for (const c of m[2] || '') sides[c] = true;
  for (const pr of (m[3] || '').match(/../g) || []) inner[pr] = true;
  return { kind: m[1], sides, inner, plain: !m[2] && !m[3] };
}

const EDGE_SET = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
export const TILE_NAMES = [
  'grass', 'grass2', 'tallgrass', 'flowers',
  'path', ...EDGE_SET.map((e) => 'path_edge_' + e), ...['ne', 'nw', 'se', 'sw'].map((c) => 'path_corner_' + c),
  'water', ...EDGE_SET.map((e) => 'water_edge_' + e), ...['ne', 'nw', 'se', 'sw'].map((c) => 'water_corner_' + c),
  'sand', ...EDGE_SET.map((e) => 'sand_edge_' + e), ...['ne', 'nw', 'se', 'sw'].map((c) => 'sand_corner_' + c),
  'bridge_h', 'bridge_v', 'floor',
  'cliff', ...EDGE_SET.map((e) => 'cliff_edge_' + e), ...['ne', 'nw', 'se', 'sw'].map((c) => 'cliff_corner_' + c), 'cliff_wall',
  'canopy', ...EDGE_SET.map((e) => 'canopy_edge_' + e), ...['ne', 'nw', 'se', 'sw'].map((c) => 'canopy_corner_' + c),
];

export function tileSVG(name, themeName = 'academy') {
  const P = theme(themeName);
  let body;
  switch (name) {
    case 'grass': body = grassTex(P, 0); break;
    case 'grass2': body = grassTex(P, 1); break;
    case 'tallgrass': body = tallgrassTile(P); break;
    case 'flowers': body = flowersTile(P); break;
    case 'sand': body = sandTex(P); break;
    case 'floor': body = floorTile(P); break;
    case 'cliff_wall': body = cliffWall(P); break;
    case 'bridge_h': body = bridgeTile(P, false); break;
    case 'bridge_v': body = bridgeTile(P, true); break;
    default: {
      const e = parseEdge(name);
      if (e && e.kind === 'cliff') body = cliffPlateau(P, e.sides, e.inner);
      else if (e && e.kind === 'canopy') body = canopyTile(P, e.sides, e.inner);
      else if (e) body = regionTile(P, e.kind, e.sides, e.inner);
      else body = rect(0, 0, 48, 48, '#ff00ff') + rect(0, 0, 24, 24, '#000') + rect(24, 24, 24, 24, '#000'); // missing art marker
    }
  }
  return svg(48, 48, body);
}

// ---------------------------------------------------------------- props
export const PROP_SIZE = {
  tree: [1, 2], bush: [1, 1], rock: [1, 1], crystal: [1, 1], mushroom: [1, 1], pillar: [1, 2], lighthouse: [2, 3],
  house: [3, 3], academy: [6, 5], shop: [3, 3], healer: [3, 3], portal: [2, 2], sign: [1, 1], fence_h: [1, 1], fence_v: [1, 1],
  gate_closed: [2, 2], gate_open: [2, 2], lamp: [1, 2], fountain: [2, 2], chest: [1, 1], challenge_marker: [1, 1],
  guardian_shrine: [2, 2], boat: [2, 1], dock: [1, 1], windvane: [1, 2], sundial: [1, 1],
};
export const PROP_NAMES = Object.keys(PROP_SIZE);

function emblem(kind, cx, cy, s, fill, sw = 1.2) {
  switch (kind) {
    case 'star': return poly(starPts(cx, cy, s, s * 0.46), fill, ol(sw)) + poly(starPts(cx - s * 0.08, cy - s * 0.1, s * 0.45, s * 0.2), lt(fill, 0.55), 'opacity=".8"');
    case 'leaf': return `<path d="M${f(cx - s * 0.1)} ${f(cy + s)}Q${f(cx - s * 1.05)} ${f(cy)} ${f(cx)} ${f(cy - s)}Q${f(cx + s * 1.05)} ${f(cy)} ${f(cx - s * 0.1)} ${f(cy + s)}Z" fill="${fill}" ${ol(sw)}/>` + line(`M${f(cx - s * 0.1)} ${f(cy + s * 0.9)}Q${f(cx + s * 0.1)} ${f(cy)} ${f(cx)} ${f(cy - s * 0.7)}`, dk(fill, 0.35), sw * 0.8) + ell(cx - s * 0.35, cy - s * 0.1, s * 0.18, s * 0.4, lt(fill, 0.5), 'opacity=".8"');
    case 'hex': return poly(hexPts(cx, cy, s, 1, 30), fill, ol(sw)) + poly(hexPts(cx, cy, s * 0.55, 1, 30), lt(fill, 0.45), `stroke="${dk(fill, 0.35)}" stroke-width="${sw * 0.7}"`);
    case 'bolt': return poly([[cx + 0.25 * s, cy - s], [cx - 0.6 * s, cy + 0.12 * s], [cx - 0.05 * s, cy + 0.12 * s], [cx - 0.3 * s, cy + s], [cx + 0.6 * s, cy - 0.18 * s], [cx + 0.05 * s, cy - 0.18 * s]], fill, ol(sw));
    default: // book
      return poly([[cx, cy - s * 0.55], [cx - s, cy - s * 0.8], [cx - s, cy + s * 0.55], [cx, cy + s * 0.8]], lt(fill, 0.55), ol(sw)) +
        poly([[cx, cy - s * 0.55], [cx + s, cy - s * 0.8], [cx + s, cy + s * 0.55], [cx, cy + s * 0.8]], fill, ol(sw)) +
        line(`M${f(cx - s * 0.75)} ${f(cy - s * 0.3)}l${f(s * 0.55)} ${f(s * 0.12)}M${f(cx - s * 0.75)} ${f(cy + s * 0.05)}l${f(s * 0.55)} ${f(s * 0.12)}`, dk(fill, 0.35), sw * 0.6);
  }
}

// Crystal prism, pointing up, with lit left facet and shaded right facet.
function prism(cx, by, w, h, c, tilt = 0) {
  const t = tilt;
  const pts = [[cx - w / 2, by], [cx - w / 2 + t * 0.8, by - h * 0.72], [cx + t, by - h], [cx + w / 2 + t * 0.8, by - h * 0.72], [cx + w / 2, by], [cx, by + w * 0.22]];
  return poly(pts, c, ol(1.3)) +
    poly([[cx + t * 0.1, by + w * 0.2], [cx + t * 0.9, by - h * 0.72], [cx + t, by - h], [cx + w / 2 + t * 0.8, by - h * 0.72], [cx + w / 2, by]], dk(c, 0.22)) +
    poly([[cx - w / 2 + 1.2, by - 1], [cx - w / 2 + t * 0.8 + 1, by - h * 0.7], [cx + t - 0.5, by - h + 2.5], [cx - w * 0.12 + t * 0.5, by - h * 0.7], [cx - w * 0.15, by - 1]], lt(c, 0.45), 'opacity=".75"') +
    line(`M${f(cx - w / 2 + 2.2)} ${f(by - 3)}L${f(cx - w / 2 + t * 0.8 + 2)} ${f(by - h * 0.62)}`, '#fff', 1.1, 'opacity=".9"') +
    poly(pts, 'none', ol(1.3));
}

function toadstool(cx, by, r, stemH, cap, spots = '#fff8ec') {
  const stem = '#fbf0da';
  let s = `<path d="M${f(cx - r * 0.32)} ${f(by)}Q${f(cx - r * 0.38)} ${f(by - stemH * 0.6)} ${f(cx - r * 0.28)} ${f(by - stemH)}H${f(cx + r * 0.28)}Q${f(cx + r * 0.38)} ${f(by - stemH * 0.6)} ${f(cx + r * 0.32)} ${f(by)}Q${f(cx)} ${f(by + 1.5)} ${f(cx - r * 0.32)} ${f(by)}Z" fill="${stem}" ${ol(1.3)}/>`;
  s += rect(cx + r * 0.08, by - stemH + 1, r * 0.2, stemH - 1.5, '#e6d2b0', 'rx="1"');
  const top = by - stemH - r * 0.95;
  s += ell(cx, by - stemH + 0.5, r * 0.8, r * 0.26, '#e8d6b8', ol(1.1));
  s += `<path d="M${f(cx - r)} ${f(by - stemH)}Q${f(cx - r)} ${f(top)} ${f(cx)} ${f(top)}Q${f(cx + r)} ${f(top)} ${f(cx + r)} ${f(by - stemH)}Q${f(cx)} ${f(by - stemH + r * 0.32)} ${f(cx - r)} ${f(by - stemH)}Z" fill="${cap}" ${ol(1.4)}/>`;
  s += `<path d="M${f(cx + r * 0.2)} ${f(top + 0.8)}Q${f(cx + r * 0.95)} ${f(top + r * 0.1)} ${f(cx + r - 0.6)} ${f(by - stemH - 0.5)}Q${f(cx + r * 0.5)} ${f(by - stemH + r * 0.18)} ${f(cx + r * 0.1)} ${f(by - stemH + r * 0.2)}Q${f(cx + r * 0.6)} ${f(by - stemH - r * 0.4)} ${f(cx + r * 0.2)} ${f(top + 0.8)}Z" fill="${dk(cap, 0.22)}"/>`;
  s += ell(cx - r * 0.42, top + r * 0.35, r * 0.28, r * 0.16, lt(cap, 0.5), 'opacity=".85"');
  s += ell(cx + r * 0.05, top + r * 0.42, r * 0.2, r * 0.14, spots) + ell(cx - r * 0.62, by - stemH - r * 0.28, r * 0.14, r * 0.11, spots) + ell(cx + r * 0.58, by - stemH - r * 0.36, r * 0.16, r * 0.12, spots);
  return s;
}

function trunk(P, x, top, bottom, w, c = P.trunk) {
  const cD = dk(c, 0.3);
  return `<path d="M${f(x - w / 2 - 2.5)} ${bottom}Q${f(x - w / 2)} ${bottom - 5} ${f(x - w / 2)} ${top}L${f(x + w / 2)} ${top}Q${f(x + w / 2)} ${bottom - 5} ${f(x + w / 2 + 2.5)} ${bottom}Q${x} ${bottom + 2} ${f(x - w / 2 - 2.5)} ${bottom}Z" fill="${c}" ${ol()}/>` +
    `<path d="M${f(x + w / 2 - 3)} ${top}L${f(x + w / 2 - 0.8)} ${top}Q${f(x + w / 2 - 0.8)} ${bottom - 5} ${f(x + w / 2 + 1.5)} ${bottom - 0.6}L${f(x + w / 2 - 2.5)} ${bottom}Z" fill="${cD}"/>` +
    line(`M${f(x - 1.5)} ${bottom - 4}v-6M${f(x + 0.5)} ${top + 6}v-4`, cD, 1);
}

function treeBase(P, opt = {}) {
  let s = shadow(24, 89, 19, 5.5);
  const st = P.treeStyle;
  if (st === 'palm') {
    s += `<path d="M18 90Q17 70 22 52Q25 40 29 30L34 31Q30 42 28 54Q24 72 27 90Q22 92 18 90Z" fill="${P.trunk}" ${ol()}/>`;
    s += `<path d="M24 90Q21 72 26 54Q29 42 32 31L34 31Q30 42 28 54Q24 72 27 90Z" fill="${P.trunkD}"/>`;
    for (let i = 0; i < 8; i++) { const y = 84 - i * 7, x = 22.5 + (i * i) * 0.12 + i * 0.4; s += line(`M${f(x - 3.5)} ${f(y)}q${3.5} 2 ${7} -0.5`, P.trunkD, 1.1); }
    const crown = [31, 28];
    const frond = (a, L, droop, c, cD) => {
      const r = (a * Math.PI) / 180, tx = crown[0] + Math.cos(r) * L, ty = crown[1] + Math.sin(r) * L * 0.75 + droop;
      const mx = crown[0] + Math.cos(r) * L * 0.5, my = crown[1] + Math.sin(r) * L * 0.4 - 3;
      const nx = -Math.sin(r) * 5, ny = Math.cos(r) * 5;
      return `<path d="M${crown[0]} ${crown[1]}Q${f(mx + nx)} ${f(my + ny * 0.6 - 2)} ${f(tx)} ${f(ty)}Q${f(mx - nx)} ${f(my - ny * 0.6)} ${crown[0]} ${crown[1]}Z" fill="${c}" ${ol(1.4)}/>` +
        line(`M${crown[0]} ${crown[1]}Q${f(mx)} ${f(my)} ${f(tx)} ${f(ty)}`, cD, 1);
    };
    for (const [a, L, d] of [[200, 22, 10], [-20, 22, 10], [240, 18, 2], [-60, 18, 2]]) s += frond(a, L, d, P.leafD, dk(P.leafD, 0.3));
    for (const [a, L, d] of [[165, 22, 12], [15, 22, 12], [270, 15, 0], [120, 16, 12], [60, 16, 12]]) s += frond(a, L, d, P.leaf, P.leafD);
    s += circ(28, 32, 3, '#8a5a30', ol(1)) + circ(33.5, 33, 3, '#9a6a3a', ol(1)) + circ(30.5, 35.5, 2.8, '#7a4a28', ol(1));
    s += ell(22, 20, 5, 2.2, P.leafL, 'opacity=".8" transform="rotate(-25 22 20)"');
    return svg(48, 96, s);
  }
  if (st === 'cone') {
    s += trunk(P, 24, 70, 89, 7);
    const tier = (top, bot, hw) => {
      let t = poly([[24, top], [24 + hw, bot], [24, bot + 3], [24 - hw, bot]], P.leaf, ol());
      t += poly([[24, top + 1], [24 + hw - 1, bot - 0.5], [24, bot + 2]], P.leafD);
      t += poly([[24 - 1.5, top + 5], [24 - hw * 0.62, bot - 3], [24 - hw * 0.35, bot - 3.5]], P.leafL, 'opacity=".85"');
      return t;
    };
    s += tier(38, 74, 20) + tier(22, 56, 16) + tier(8, 38, 11);
    s += circ(17, 64, 1.6, P.accent) + circ(31, 47, 1.4, P.accent) + circ(20, 32, 1.2, P.accent);
    return svg(48, 96, s);
  }
  if (st === 'lush') {
    s += `<path d="M13 90Q18 84 19 74L18 60L30 60L29 74Q30 84 36 90Q24 93 13 90Z" fill="${P.trunk}" ${ol()}/>` + `<path d="M26 60L30 60L29 74Q30 84 35 89.5L30 90Q27 82 26 74Z" fill="${P.trunkD}"/>`;
    s += ell(21, 82, 3, 1.6, P.leaf) + ell(26, 85, 2.5, 1.3, P.leafL);
    const C = [[24, 44, 18], [8, 52, 9], [40, 52, 9], [11, 34, 11], [37, 34, 11], [24, 21, 13], [24, 58, 11], [15, 58, 8], [33, 58, 8]];
    s += blob(C, P.leaf, P.leafD, P.leafL);
    s += line('M11 60q-1 6 1 12M36 61q2 5 0 10M20 67q0 4 1 7', P.leafD, 1.3);
    s += [[11, 72], [36, 71], [21, 74]].map(([x, y]) => ell(x, y, 1.8, 1.2, P.leafL)).join('');
    for (const [x, y, c] of [[15, 30, '#ff8fc6'], [31, 24, '#ffd23f'], [34, 44, '#ff8fc6'], [12, 48, '#fff'], [24, 36, '#ff8fc6'], [26, 54, '#ffd23f'], [40, 38, '#fff']]) {
      s += [0, 90, 180, 270].map((a) => circ(x + 1.4 * Math.cos(a * Math.PI / 180), y + 1.4 * Math.sin(a * Math.PI / 180), 1.3, c, `stroke="${dk(c, 0.3)}" stroke-width=".4"`)).join('') + circ(x, y, 0.8, '#ffe066');
    }
    return svg(48, 96, s);
  }
  // oak / crystal: rounded canopy
  s += trunk(P, 24, 60, 89, 9);
  const C = [[24, 46, 17], [11, 53, 10], [37, 53, 10], [14, 33, 12.5], [34, 33, 12.5], [24, 21, 14]];
  s += blob(C, P.leaf, P.leafD, P.leafL);
  if (st === 'crystal') {
    s += prism(12, 30, 5, 11, P.crystal[0], -2) + prism(35, 23, 6, 13, P.crystal[0], 2) + prism(24, 14, 6, 12, P.crystal[1], 0);
    s += poly([[16, 62], [18, 66], [16, 71], [14, 66]], P.crystal[0], ol(1)) + poly([[33, 61], [35, 64.5], [33, 69], [31, 64.5]], P.crystal[1], ol(1));
    s += sparkle(8, 42, 2.5, '#fff') + sparkle(41, 44, 2, '#fff8c0') + sparkle(26, 38, 1.8, '#fff');
  } else {
    s += line('M15 52q2 2 4 0M30 58q2 2 4 0M31 44q2 2 4 0M19 41q2 2 4 0', P.leafD, 1.2);
    if (opt.birch) s += line('M21 70h3M25 78h3M21.5 84h2.5', '#3d3550', 1.3);
    else s += circ(15, 47, 1.8, '#ff6b6b', ol(0.8)) + circ(33, 40, 1.8, '#ff6b6b', ol(0.8)) + circ(27, 56, 1.8, '#ff6b6b', ol(0.8));
  }
  return svg(48, 96, s);
}

const TREE_KINDS = {
  academy: ['base', 'pine', 'birch'], number: ['base', 'crystalCone', 'crystalTeal'], patterns: ['base', 'fir', 'shroom'],
  shape: ['base', 'acacia', 'saguaro'], stats: ['base', 'palmL', 'umbrella'],
};
function propTree(P, v = 0) {
  const kind = (TREE_KINDS[P.id] || TREE_KINDS.academy)[v] || 'base';
  const Q = (o) => ({ ...P, ...o });
  switch (kind) {
    case 'pine': return treeBase(Q({ treeStyle: 'cone', leaf: '#3f9d4c', leafD: '#256c37', leafL: '#7fd06a', accent: '#8fdc70', trunk: '#8a5a36' }));
    case 'birch': return treeBase(Q({ treeStyle: 'oak', leaf: '#9cd65a', leafD: '#67a53d', leafL: '#d2f28e', trunk: '#f1ece2' }), { birch: true });
    case 'crystalCone': return treeBase(Q({ treeStyle: 'cone', leaf: '#a67ce9', leafD: '#7147bf', leafL: '#ddc6ff', accent: '#8ff2ff', trunk: '#8d78b8' }));
    case 'crystalTeal': return treeBase(Q({ treeStyle: 'crystal', leaf: '#86dcee', leafD: '#4a9fc6', leafL: '#dcf8ff', crystal: ['#ffa6ea', '#ffe27a'] }));
    case 'fir': return treeBase(Q({ treeStyle: 'cone', leaf: '#2f9453', leafD: '#1a6438', leafL: '#72d06c', accent: '#ff8fc6' }));
    case 'palmL': return treeBase(Q({ leaf: '#62cf8a', leafD: '#34935f', leafL: '#aaf0c4', trunk: '#c29a68' })).replace(/(<svg[^>]*>)([\s\S]*)(<\/svg>)/, '$1<g transform="matrix(-1 0 0 1 48 0)">$2</g>$3');
    case 'shroom': {
      let s = shadow(24, 89, 19, 5.5) + toadstool(24, 90, 21, 36, '#8f6cf0') + toadstool(38, 90, 6, 7, P.mushCap);
      s += sparkle(8, 30, 2.2, '#fff') + sparkle(40, 22, 1.8, '#fff');
      return svg(48, 96, s);
    }
    case 'acacia': {
      let s = shadow(24, 89, 20, 5);
      s += `<path d="M20 90Q22 74 18 60Q14 52 9 46L13 44Q18 50 22 56Q24 50 30 44L33 47Q27 54 27 62Q26 76 29 90Q24 92 20 90Z" fill="${P.trunk}" ${ol()}/>`;
      s += `<path d="M25 64Q26 76 28 89L29 90Q26 76 27 62Z" fill="${P.trunkD}"/>`;
      s += blob([[9, 42, 8], [21, 38, 10], [35, 40, 9], [15, 34, 8], [29, 33, 8], [42, 44, 5.5], [4, 45, 4.5]], '#a9b64e', '#6f7d2e', '#d8e27e');
      s += circ(14, 40, 1.4, '#ffd23f') + circ(31, 36, 1.4, '#ffd23f') + circ(38, 43, 1.2, '#ffd23f');
      return svg(48, 96, s);
    }
    case 'saguaro': {
      const G = '#6fb052', GD = '#4a8038', GL = '#a8d87c';
      let s = shadow(24, 89, 14, 4.5);
      const col = (x, top, bot, w) => `<path d="M${x - w / 2} ${bot}V${top + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${top + w / 2}V${bot}Z" fill="${G}" ${ol()}/>` +
        rect(x + w * 0.15, top + w / 2, w * 0.3, bot - top - w / 2 - 1, GD) + line(`M${x - w * 0.2} ${top + w / 2}V${bot - 2}`, GL, 1.2, 'opacity=".85"');
      s += `<path d="M18 62H10V48A4 4 0 0 1 18 48" fill="${G}" ${ol()}/>` + col(10, 40, 62, 8) + rect(8, 58, 12, 7, G, ol(1.3));
      s += col(38, 32, 54, 8) + rect(28, 50, 12, 7, G, ol(1.3));
      s += col(24, 16, 90, 14);
      s += line('M24 24V86M19 26V86M29 26V86', GD, 0.9, 'opacity=".7"');
      s += [0, 72, 144, 216, 288].map((a) => ell(24 + 3 * Math.cos((a - 90) * Math.PI / 180), 15 + 2.2 * Math.sin((a - 90) * Math.PI / 180), 2.3, 1.7, '#ff7eb0', `stroke="${O}" stroke-width=".6"`)).join('') + circ(24, 15, 1.4, '#ffd23f');
      return svg(48, 96, s);
    }
    case 'umbrella': {
      let s = shadow(24, 89, 19, 5);
      s += `<path d="M19 90Q23 70 19 54Q17 46 21 38L26 39Q23 47 25 55Q29 72 26 90Q22 92 19 90Z" fill="${P.trunk}" ${ol()}/>` + `<path d="M23 56Q27 72 25 89L26 90Q29 72 25 55Z" fill="${P.trunkD}"/>`;
      s += blob([[10, 34, 9], [24, 30, 12], [38, 34, 9], [17, 24, 9], [31, 24, 9], [24, 38, 8]], '#3aa477', '#22714f', '#84dcae');
      return svg(48, 96, s);
    }
    default: return treeBase(P);
  }
}

function propBush(P, v = 0) {
  if (v === 1 || v === 2) return bushVariant(P, v);
  let s = shadow(24, 42, 17, 4.5);
  const st = P.bushStyle;
  if (st === 'cactus') {
    const barrel = (x, y, rx, ry) => ell(x, y, rx, ry, P.leaf, ol()) + `<path d="M${x} ${y - ry}Q${x + rx * 1.1} ${y} ${x} ${y + ry}Q${x + rx * 0.9} ${y + ry * 0.7} ${x + rx} ${y}Q${x + rx * 0.9} ${y - ry * 0.7} ${x} ${y - ry}Z" fill="${P.leafD}"/>` +
      line(`M${x} ${y - ry}v${ry * 2}M${f(x - rx * 0.55)} ${f(y - ry * 0.85)}q${f(-rx * 0.35)} ${ry * 0.85} 0 ${f(ry * 1.7)}M${f(x + rx * 0.55)} ${f(y - ry * 0.85)}q${f(rx * 0.35)} ${ry * 0.85} 0 ${f(ry * 1.7)}`, P.leafD, 0.9) +
      ell(x - rx * 0.5, y - ry * 0.4, rx * 0.2, ry * 0.35, P.leafL, 'opacity=".8"');
    s += barrel(33, 36, 6.5, 6.5) + barrel(20, 30, 10, 11.5);
    s += [0, 72, 144, 216, 288].map((a) => ell(20 + 3 * Math.cos((a - 90) * Math.PI / 180), 18 + 2.2 * Math.sin((a - 90) * Math.PI / 180), 2.3, 1.7, '#ff7eb0', `stroke="${O}" stroke-width=".6"`)).join('') + circ(20, 18, 1.4, '#ffd23f');
    s += [[14, 28], [26, 34], [18, 38], [36, 33]].map(([x, y]) => line(`M${x - 1} ${y}h2M${x} ${y - 1}v2`, '#fff6d8', 0.6)).join('');
    return svg(48, 48, s);
  }
  if (st === 'dune') {
    const blades = [[-14, 28, P.tallD], [14, 26, P.tallD], [-9, 32, P.leafD], [8, 34, P.leafD], [-3, 38, P.leaf], [3, 36, P.leaf], [0, 30, P.leafL]];
    for (const [dx, h, c] of blades) s += `<path d="M${22 + dx * 0.2} 42Q${24 + dx * 0.3} ${42 - h * 0.6} ${24 + dx} ${42 - h}Q${25 + dx * 0.4} ${42 - h * 0.55} ${26 + dx * 0.2} 42Z" fill="${c}" ${ol(1.1)}/>`;
    for (const [x, y] of [[10, 16], [38, 17], [21, 6]]) s += ell(x, y, 1.6, 3.6, P.tallTip || '#f6e7aa', ol(0.8));
    return svg(48, 48, s);
  }
  const C = [[24, 31, 11], [13, 35, 8], [35, 35, 8], [18, 25, 8.5], [30, 25, 8.5]];
  s += P.id === 'number' ? blob(C, '#c77ff0', '#8c45c7', '#ecc8ff') : blob(C, P.leaf, P.leafD, P.leafL);
  if (st === 'crystal') s += prism(31, 22, 5, 10, P.crystal[0], 1.5) + prism(18, 24, 4, 7, P.crystal[1], -1) + sparkle(12, 28, 2, '#fff');
  else if (st === 'berry') s += [[16, 30], [28, 24], [33, 34], [22, 36], [20, 22]].map(([x, y]) => circ(x, y, 2, '#ff4f8a', ol(0.8)) + circ(x - 0.6, y - 0.7, 0.6, '#fff')).join('');
  else s += [[16, 29], [29, 24], [31, 35]].map(([x, y]) => [0, 72, 144, 216, 288].map((a) => circ(x + 1.4 * Math.cos(a * Math.PI / 180), y + 1.4 * Math.sin(a * Math.PI / 180), 1.2, '#fff')).join('') + circ(x, y, 0.9, '#ffd23f')).join('');
  return svg(48, 48, s);
}

function bushVariant(P, v) {
  let s = shadow(24, 42, 18, 4.5);
  const cols = P.id === 'number' ? ['#c77ff0', '#8c45c7', '#ecc8ff'] : P.id === 'stats' ? ['#4cc08e', '#2b8864', '#98eabe'] : P.id === 'shape' ? ['#93a650', '#5b6e30', '#c6d67c'] : [P.leaf, P.leafD, P.leafL];
  if (P.id === 'shape' && v === 1) { // prickly pear
    const pad = (x, y, rx, ry, a) => `<g transform="rotate(${a} ${x} ${y})">${ell(x, y, rx, ry, '#79b35a', ol())}${ell(x + rx * 0.3, y + ry * 0.2, rx * 0.55, ry * 0.7, '#5a9143')}${ell(x - rx * 0.35, y - ry * 0.35, rx * 0.3, ry * 0.3, '#b0dc86', 'opacity=".85"')}</g>` +
      [[-0.3, -0.2], [0.3, 0.3], [0, 0.5]].map(([a, b]) => circ(x + a * rx, y + b * ry, 0.6, '#fff6d8')).join('');
    s += pad(16, 34, 8, 9, -15) + pad(31, 33, 7.5, 9, 18) + pad(23, 22, 7, 8.5, 0) + pad(12, 21, 4.5, 5.5, -30);
    s += ell(23, 13.5, 2.4, 2, '#ff7a5c', ol(0.8)) + ell(31, 23, 2, 1.7, '#ffd23f', ol(0.8));
    return svg(48, 48, s);
  }
  if (P.id === 'shape' && v === 2) { // agave rosette
    const leafA = (a, L, c) => { const r = (a * Math.PI) / 180, tx = 24 + Math.cos(r) * L, ty = 38 + Math.sin(r) * L * 0.8; const nx = -Math.sin(r) * 3.5, ny = Math.cos(r) * 3.5;
      return `<path d="M${f(24 + nx)} ${f(38 + ny)}L${f(tx)} ${f(ty)}L${f(24 - nx)} ${f(38 - ny)}Z" fill="${c}" ${ol(1.1)}/>`; };
    for (const a of [190, 350, 215, 325]) s += leafA(a, 19, '#6f9a7a');
    for (const a of [240, 300, 200, 340, 270]) s += leafA(a, 17 + (a % 3), '#8fbf98');
    s += leafA(262, 14, '#b4dcb8') + leafA(282, 13, '#a6d0ac');
    return svg(48, 48, s);
  }
  if (v === 1) {
    s += blob([[10, 36, 7], [20, 32, 9.5], [31, 32, 9], [39, 36, 7], [25, 37, 7.5]], ...cols);
    const acc = { academy: '#ffd23f', number: '#8ff2ff', patterns: '#6fa8ff', stats: '#fff', shape: '#ff7a5c' }[P.id] || '#fff';
    s += [[12, 33], [21, 27], [30, 29], [37, 35], [25, 35]].map(([x, y]) => circ(x, y, 1.7, acc, ol(0.7)) + circ(x - 0.5, y - 0.6, 0.5, '#fff')).join('');
    if (P.id === 'number') s += sparkle(40, 24, 2, '#fff');
    return svg(48, 48, s);
  }
  if (P.id === 'stats') {
    s += blob([[24, 32, 10], [14, 36, 7.5], [34, 36, 7.5], [19, 26, 7], [30, 26, 7]], ...cols);
    s += [[15, 31], [28, 24], [33, 34], [22, 37]].map(([x, y]) => [0, 72, 144, 216, 288].map((a) => circ(x + 1.5 * Math.cos(a * Math.PI / 180), y + 1.5 * Math.sin(a * Math.PI / 180), 1.3, '#ff8fb0', `stroke="${dk('#ff8fb0', 0.3)}" stroke-width=".4"`)).join('') + circ(x, y, 0.8, '#ffe066')).join('');
    return svg(48, 48, s);
  }
  // fern clump
  const frond = (a, L, c, cD) => { const r = (a * Math.PI) / 180, tx = 24 + Math.cos(r) * L, ty = 41 + Math.sin(r) * L * 0.9; const mx = (24 + tx) / 2, my = (41 + ty) / 2 - 3; const nx = -Math.sin(r) * 4.5, ny = Math.cos(r) * 4.5;
    return `<path d="M24 41Q${f(mx + nx)} ${f(my + ny)} ${f(tx)} ${f(ty)}Q${f(mx - nx)} ${f(my - ny)} 24 41Z" fill="${c}" ${ol(1.1)}/>` + line(`M24 41Q${f(mx)} ${f(my)} ${f(tx)} ${f(ty)}`, cD, 0.8); };
  for (const a of [195, 345, 225, 315]) s += frond(a, 20, cols[1], dk(cols[1], 0.3));
  for (const a of [250, 290, 210, 330, 270]) s += frond(a, 18, cols[0], cols[1]);
  if (P.id === 'number') s += prism(24, 30, 4.5, 9, P.crystal[0]) + sparkle(12, 18, 2, '#fff');
  else if (P.id === 'patterns') s += circ(15, 22, 1.6, '#ff8fc6', ol(0.6)) + circ(33, 20, 1.6, '#ffe066', ol(0.6));
  return svg(48, 48, s);
}

function propRock(P, v = 0) {
  if (v === 1 || v === 2) return rockVariant(P, v);
  let s = shadow(24, 41, 18, 5);
  const C = P.rock, CD = dk(C, 0.3), CL = lt(C, 0.35);
  const out = [[7, 38], [5, 29], [10, 19], [21, 13], [34, 15], [42, 24], [42, 36], [34, 42], [15, 42]];
  s += poly(out, C, ol());
  s += poly([[24, 30], [42, 26], [42, 36], [34, 42], [22, 42]], CD);
  s += poly([[10, 21], [21, 15], [33, 17], [38, 24], [28, 29], [15, 28]], CL);
  s += poly([[13, 21], [21, 16.5], [27, 17.5], [20, 21]], lt(C, 0.6), 'opacity=".8"');
  s += line('M28 29l-3 6l1 5M15 28l-4 5', dk(C, 0.45), 1.1);
  s += poly(out, 'none', ol());
  if (P.id === 'number') s += prism(34, 20, 5, 10, P.crystal[0], 1) + sparkle(12, 14, 2, '#fff');
  else if (P.id === 'patterns') s += `<path d="M11 20Q16 12 24 14Q31 13 35 18Q28 21 22 19Q16 22 11 20Z" fill="${P.leaf}" ${ol(1)}/>` + ell(20, 16, 3, 1.2, P.leafL);
  else if (P.id === 'shape') s += line('M8 31Q22 34 42 30M10 36Q24 39 40 36', dk(C, 0.2), 1.1);
  else if (P.id === 'stats') s += [[12, 34], [15, 36.5], [37, 33]].map(([x, y]) => circ(x, y, 1.3, '#f2f0e6', `stroke="${CD}" stroke-width=".5"`)).join('') + line('M16 24q6 -3 12 -2', '#fff', 1, 'opacity=".7"');
  return svg(48, 48, s);
}

function rockVariant(P, v) {
  const C = P.rock, CD = dk(C, 0.3), CL = lt(C, 0.35);
  const stone = (pts, top, sh) => poly(pts, C, ol()) + poly(sh, CD) + poly(top, CL) + poly(pts, 'none', ol());
  let s;
  if (v === 1) {
    s = shadow(24, 41, 19, 4.5);
    s += stone([[4, 40], [4, 32], [10, 26], [19, 27], [22, 34], [20, 41]], [[6, 31], [10, 27.5], [18, 28.5], [15, 32], [8, 33]], [[14, 35], [22, 34], [20, 41], [13, 41]]);
    s += stone([[20, 42], [21, 30], [28, 22], [38, 23], [44, 31], [43, 41]], [[22, 30], [28, 23.5], [37, 24.5], [40, 29], [31, 32], [24, 32]], [[32, 33], [44, 31], [43, 41], [33, 42]]);
    s += stone([[30, 44], [31, 39], [36, 37], [41, 39], [41, 44]], [[32, 39.5], [36, 37.8], [40, 39.5], [36, 41]], [[36, 41.5], [41, 40], [41, 44], [36, 44]]);
    s += line('M33 32l-3 5', dk(C, 0.45), 1);
  } else {
    s = shadow(24, 42, 14, 4.5);
    s += stone([[13, 43], [12, 18], [17, 6], [28, 4], [34, 12], [36, 43]], [[14, 17], [18, 7.5], [27, 5.5], [32, 12], [24, 14]], [[26, 16], [34, 12], [36, 43], [27, 43]]);
    s += line('M20 20l3 6l-2 6M28 30l2 5', dk(C, 0.45), 1.1) + ell(24, 43, 13, 2.4, CD, 'opacity=".5"');
  }
  if (P.id === 'number') s += prism(v === 1 ? 12 : 33, v === 1 ? 26 : 28, 4.5, 9, P.crystal[1], 1) + sparkle(v === 1 ? 38 : 10, 14, 2, '#fff');
  else if (P.id === 'patterns') s += v === 1 ? `<path d="M24 28Q30 20 38 23Q34 27 28 27Q26 30 24 28Z" fill="${P.leaf}" ${ol(1)}/>` : `<path d="M14 18Q20 3 30 6Q34 10 33 14Q26 12 20 16Q16 20 14 18Z" fill="${P.leaf}" ${ol(1)}/>` + line('M16 20q-1 8 1 14', P.leafD, 1.3);
  else if (P.id === 'shape') s += v === 1 ? line('M22 36Q32 38 43 35M5 36Q12 37 21 35', dk(C, 0.2), 1) : line('M13 24Q24 26 35 23M13 32Q24 34 36 31', dk(C, 0.22), 1.1);
  else if (P.id === 'stats') s += [[8, 38], [11, 39.5], [38, 38]].map(([x, y]) => circ(x, y, 1.2, '#f2f0e6', `stroke="${CD}" stroke-width=".5"`)).join('');
  return svg(48, 48, s);
}

function propCrystal(P, v = 0) {
  const [c1, c2] = P.crystal;
  let s = glow(24, 38, 22, 10, c1, 0.7) + shadow(24, 41, 15, 4, 0.25);
  if (v === 1) s += prism(24, 42, 13, 38, c1, 1.5) + prism(34, 42, 5, 10, c2, 2) + prism(15, 42, 5, 8, c2, -2) + sparkle(8, 12, 2.4, '#fff') + sparkle(38, 18, 1.8, '#fff');
  else if (v === 2) s += prism(9, 41, 6, 11, c2, -3) + prism(39, 41, 6, 12, c2, 3) + prism(18, 42, 7, 17, c1, -2) + prism(31, 42, 7, 19, c1, 2) + prism(24, 43, 6, 10, c2, 0) + sparkle(24, 14, 2.4, '#fff') + sparkle(40, 20, 1.6, '#fff');
  else s += prism(14, 40, 8, 17, c2, -3) + prism(34, 40, 8, 19, c2, 3) + prism(24, 41, 10, 30, c1, 0) + sparkle(9, 14, 2.6, '#fff') + sparkle(39, 12, 2, '#fff') + sparkle(30, 5, 1.6, '#fff8d0');
  return svg(48, 48, s);
}

function propMushroom(P) {
  let s = shadow(24, 42, 17, 4.5);
  const cap = P.mushCap, cap2 = P.id === 'patterns' ? '#8f7cf0' : lt(cap, 0.25);
  s += toadstool(33, 42, 7, 7, cap2) + toadstool(18, 42, 11, 10, cap) + toadstool(38, 43, 4, 4, cap);
  s += tuft(10, 43, P.tuft, null, 0, 0.9) + tuft(27, 44, P.tuft, null, 0, 0.7);
  return svg(48, 48, s);
}

function propSign(P) {
  const W = P.id === 'number' ? '#b98a64' : P.wood;
  let s = shadow(24, 43, 11, 3);
  s += rect(21.5, 20, 5, 23, W, `${ol()} rx="1"`) + rect(24.5, 20, 2, 22, dk(W, 0.3));
  s += rect(7, 8, 34, 17, W, `${ol()} rx="3"`) + rect(9, 10, 30, 3, lt(W, 0.35), 'rx="1.5" opacity=".8"') + rect(9, 21, 30, 2.5, dk(W, 0.25), 'rx="1"');
  s += line('M13 15.5h16M13 19.5h11', dk(W, 0.5), 1.8);
  s += circ(10, 11.5, 0.9, dk(W, 0.55)) + circ(38, 11.5, 0.9, dk(W, 0.55));
  if (P.id === 'number') s += poly(starPts(34, 18, 3.5, 1.6), P.accent, ol(0.8));
  else s += poly([[31, 15.5], [35, 17.5], [31, 19.5]], P.accent, ol(0.8));
  s += tuft(17, 44, P.tuft, null, 0, 0.8) + tuft(31, 44, P.tuft, null, 0, 0.7);
  return svg(48, 48, s);
}

function propPortal(P) {
  const M = P.magic, id = uid('pg'), id2 = uid('pb');
  let s = glow(48, 70, 48, 26, M, 0.7);
  s += radGrad(id, [[0, '#ffffff', 1], [0.35, lt(M, 0.4), 0.95], [1, M, 0.85]]);
  s += linGrad(id2, [[0, M, 0], [0.6, lt(M, 0.3), 0.25], [1, lt(M, 0.6), 0.6]]);
  // stone ring
  s += ell(48, 72, 42, 21, dk(P.stone, 0.35), ol());
  s += ell(48, 70, 42, 20, P.stone, ol());
  s += ell(48, 70, 34, 15.5, dk(P.stone, 0.4), ol(1.2));
  // rune stones on the rim
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, x = 48 + Math.cos(a) * 38, y = 70 + Math.sin(a) * 17.8;
    s += ell(x, y, 3.2, 2.1, lt(M, 0.25), `stroke="${dk(M, 0.4)}" stroke-width=".8"`) + circ(x, y - 0.3, 0.9, '#fff');
  }
  // glowing disc with a star design
  s += ell(48, 70.5, 32, 14.5, `url(#${id})`);
  s += `<g transform="translate(48 70.5) scale(1 .46)">${poly(starPts(0, 0, 27, 12, 5), 'none', `stroke="#fff" stroke-width="2" opacity=".85"`)}<circle r="17" fill="none" stroke="#fff" stroke-width="1.4" opacity=".7"/><circle r="29" fill="none" stroke="${dk(M, 0.2)}" stroke-width="1.2" stroke-dasharray="4 5" opacity=".7"/></g>`;
  // light column + motes
  s += `<path d="M17 70C19 50 24 26 28 6H68C72 26 77 50 79 70Z" fill="url(#${id2})" opacity=".8"/>`;
  for (const [x, y, k] of [[30, 40, 3], [62, 30, 3.5], [44, 20, 2.5], [56, 50, 2], [36, 56, 2.2], [68, 58, 1.8]]) s += sparkle(x, y, k, '#fff');
  return svg(96, 96, s);
}

function propLamp(P) {
  const M = '#4a3f66', G = P.id === 'number' ? '#fff0a8' : '#ffe58a';
  let s = shadow(24, 91, 10, 3) + glow(24, 22, 22, 22, G, 0.75);
  s += rect(17, 84, 14, 7, M, `${ol()} rx="2"`) + rect(21.5, 30, 5, 56, M, ol()) + rect(22.5, 32, 1.5, 52, lt(M, 0.35));
  s += rect(15, 34, 18, 4, M, `${ol()} rx="1.5"`);
  s += poly([[16, 14], [32, 14], [30, 32], [18, 32]], G, ol());
  s += poly([[24, 14], [32, 14], [30, 32], [24, 32]], '#ffd24a', 'opacity=".6"');
  s += line('M24 14v18', M, 1.2) + rect(19, 16, 2.4, 13, '#fff', 'opacity=".8" rx="1"');
  s += poly([[13, 15], [24, 6], [35, 15]], P.id === 'number' ? P.roof : M, ol()) + circ(24, 5, 2, P.accent, ol(1));
  if (P.id === 'number') s += sparkle(8, 26, 2, '#fff') + sparkle(40, 18, 1.6, '#fff');
  return svg(48, 96, s);
}

function propChest(P) {
  const W = P.wood, G = '#f4c23a';
  let s = shadow(24, 42, 17, 4);
  s += rect(8, 22, 32, 20, W, `${ol()} rx="2"`) + rect(8, 34, 32, 8, dk(W, 0.2), 'rx="2"');
  s += `<path d="M8 23V17Q8 9 24 9Q40 9 40 17V23Z" fill="${lt(W, 0.12)}" ${ol()}/>` + `<path d="M10 16Q11 11 24 11Q30 11 34 12" stroke="${lt(W, 0.45)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  s += rect(8, 21, 32, 3.5, G, ol(1.2)) + rect(13, 9.8, 4, 32, G, ol(1.2)) + rect(31, 9.8, 4, 32, G, ol(1.2));
  s += rect(20, 19, 8, 9, G, `${ol(1.2)} rx="1.5"`) + circ(24, 22.5, 1.2, O) + rect(23.4, 22.5, 1.2, 3, O);
  s += sparkle(38, 9, 2.2, '#fff');
  return svg(48, 48, s);
}

function propMarker(P) {
  let s = shadow(24, 43, 9, 2.6, 0.28) + glow(24, 18, 20, 18, '#fff3a0', 0.85);
  s += poly(starPts(24, 18, 13, 6), '#ffd23f', ol(1.8));
  s += poly([[24, 5], [27.6, 13.2], [36.4, 14], [24, 18]], '#ffe98a');
  s += poly([[24, 18], [31.5, 25.5], [32, 31], [24, 26], [16, 31], [16.3, 26]], '#f0a820', 'opacity=".85"');
  s += poly(starPts(24, 18, 13, 6), 'none', ol(1.8));
  s += ell(20, 13, 2.2, 1.4, '#fff', 'opacity=".9"');
  s += sparkle(8, 10, 2.5, '#fff') + sparkle(40, 24, 2, '#fff') + sparkle(38, 6, 1.5, '#fff8c0');
  return svg(48, 48, s);
}

function propFence(P, vertical) {
  const st = P.fenceStyle;
  const W = st === 'picket' ? '#f6efe2' : st === 'crystal' ? '#8d6fcc' : st === 'stone' ? P.stone : P.wood;
  const WD = dk(W, 0.28), WL = lt(W, 0.35);
  let s = '';
  if (st === 'stone') {
    if (!vertical) {
      s += rect(0, 40, 48, 5, '#1b0f2e', 'opacity=".18"');
      s += rect(-1, 24, 50, 18, WD, `stroke="${O}" stroke-width="1.4"`) + rect(-1, 22, 50, 6, WL, `stroke="${O}" stroke-width="1.4"`);
      for (const [x, y, w] of [[1, 29, 14], [16, 29, 16], [33, 29, 14], [-7, 35, 14], [8, 35, 16], [25, 35, 14], [40, 35, 14]]) s += rect(x, y, w, 5.2, W, 'rx="1"') + rect(x + 1, y, w - 3, 1.2, WL, 'opacity=".7"');
      return svg(48, 48, s);
    }
    s += rect(29, 0, 4, 48, '#1b0f2e', 'opacity=".18"');
    s += rect(15, -1, 16, 50, WL, `stroke="${O}" stroke-width="1.4"`);
    for (let y = 0; y < 48; y += 12) s += rect(17, y + 1, 12, 10, W, 'rx="1"') + rect(18, y + 1.5, 8, 1.4, lt(W, 0.5), 'opacity=".7"');
    return svg(48, 48, s);
  }
  const rope = st === 'rope';
  const post = (x, top, bot) => {
    let t = rect(x - 3, top, 6, bot - top, W, `${ol(1.3)} rx="1.2"`) + rect(x + 0.6, top + 1, 1.8, bot - top - 2, WD);
    if (st === 'picket') t = poly([[x - 3, bot], [x - 3, top + 3], [x, top], [x + 3, top + 3], [x + 3, bot]], W, ol(1.3)) + rect(x + 0.6, top + 3, 1.8, bot - top - 4, WD);
    if (st === 'crystal') t += poly([[x, top - 6], [x + 3, top - 2], [x, top + 0.5], [x - 3, top - 2]], P.crystal[0], ol(1));
    if (st === 'log') t += ell(x, top, 3, 1.4, lt(W, 0.3), ol(1));
    return t;
  };
  const railC = st === 'crystal' ? P.trim : W;
  if (!vertical) {
    s += rect(0, 40, 48, 4, '#1b0f2e', 'opacity=".16"');
    const bar = (y) => rope ? line(`M-2 ${y}Q12 ${y + 4} 24 ${y}T50 ${y}`, '#e2cf9c', 2.2) + line(`M-2 ${y}Q12 ${y + 4} 24 ${y}T50 ${y}`, '#a88e5c', 0.7)
      : rect(-1, y - 2, 50, 4.2, railC, `stroke="${O}" stroke-width="1.2"`) + rect(-1, y - 1.3, 50, 1.2, lt(railC, 0.4));
    s += bar(27) + (rope ? '' : bar(35));
    s += post(12, 18, 42) + post(36, 18, 42);
    if (st === 'log') s += ell(24, 26, 2.6, 1.4, P.leaf) + ell(40, 34, 2.2, 1.2, P.leafL);
    return svg(48, 48, s);
  }
  s += rect(26, 0, 4, 48, '#1b0f2e', 'opacity=".16"');
  if (rope) s += line('M24 -2Q27 12 24 24T24 50', '#e2cf9c', 2.2);
  else s += rect(22, -1, 4.4, 50, railC, `stroke="${O}" stroke-width="1.2"`) + rect(22.8, -1, 1.2, 50, lt(railC, 0.45));
  s += post(24, 2, 18) + post(24, 26, 42);
  return svg(48, 48, s);
}

function windowBox(x, y, w, h, frame, round = false) {
  const glass = '#bfe7ff';
  let s = round
    ? `<path d="M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z" fill="${glass}" ${ol(1.4)}/>`
    : rect(x, y, w, h, glass, `${ol(1.4)} rx="1.5"`);
  s += `<path d="M${x + 2} ${y + h - 2}L${x + w * 0.6} ${y + (round ? w / 2 : 2)}" stroke="#fff" stroke-width="2.4" opacity=".8" stroke-linecap="round"/>`;
  s += line(`M${x + w / 2} ${y + (round ? 1 : 0)}V${y + h}M${x} ${y + h * 0.55}H${x + w}`, frame, 1.6);
  s += rect(x - 2, y + h - 0.5, w + 4, 3, frame, `${ol(1.1)} rx="1"`);
  return s;
}

function door(cx, top, bot, w, c, trim = O) {
  let s = `<path d="M${cx - w / 2} ${bot}V${top + w / 2}A${w / 2} ${w / 2} 0 0 1 ${cx + w / 2} ${top + w / 2}V${bot}Z" fill="${c}" ${ol()}/>`;
  s += line(`M${cx - w / 4} ${top + w / 2 - 2}V${bot - 1}M${cx + w / 4} ${top + w / 2 - 2}V${bot - 1}`, dk(c, 0.3), 1.2);
  s += `<path d="M${cx - w / 2 + 2} ${bot}V${top + w / 2}A${w / 2 - 2} ${w / 2 - 2} 0 0 1 ${cx} ${top + 2}" fill="none" stroke="${lt(c, 0.35)}" stroke-width="1.4" opacity=".8"/>`;
  s += circ(cx + w / 4 + 1.5, (top + bot) / 2 + 3, 1.5, '#ffd23f', ol(0.8));
  return s;
}

function signBadge(kind, cx, cy, P) {
  if (kind === 'heart') {
    return circ(cx, cy, 13, '#fff', ol()) + circ(cx, cy, 10.5, '#ffe3ec') +
      `<path d="M${cx} ${cy + 7}C${cx - 10} ${cy}, ${cx - 8} ${cy - 8}, ${cx} ${cy - 3.5}C${cx + 8} ${cy - 8}, ${cx + 10} ${cy}, ${cx} ${cy + 7}Z" fill="#ff5a8f" ${ol(1.3)}/>` + ell(cx - 3.8, cy - 2.6, 1.8, 1.2, '#fff', 'opacity=".9"');
  }
  if (kind === 'coin') {
    return circ(cx, cy + 1.5, 12, '#c98a10', ol()) + circ(cx, cy, 12, '#ffd23f', ol()) + circ(cx, cy, 8.5, 'none', `stroke="#e0a410" stroke-width="1.6"`) +
      poly(starPts(cx, cy, 5.5, 2.4), '#fff4b0', `stroke="#c98a10" stroke-width=".9"`) + ell(cx - 5, cy - 5, 2.2, 1.3, '#fff', 'opacity=".85"');
  }
  return '';
}

function awning(x0, x1, y, h, c) {
  let s = '';
  const n = Math.round((x1 - x0) / 10), w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * w, col = i % 2 ? '#fffaf0' : c;
    s += `<path d="M${f(x)} ${y}H${f(x + w)}V${y + h}A${f(w / 2)} ${f(w / 2.4)} 0 0 1 ${f(x)} ${y + h}Z" fill="${col}"/>`;
  }
  s += `<path d="M${x0} ${y}H${x1}V${y + h}${Array.from({ length: n }, (_, i) => `A${f(w / 2)} ${f(w / 2.4)} 0 0 1 ${f(x1 - (i + 1) * w)} ${y + h}`).join('')}Z" fill="none" ${ol()}/>`;
  s += rect(x0, y, x1 - x0, 3.5, dk(c, 0.25), 'opacity=".45"');
  return s;
}

function propBuilding(P, kind) {
  const st = P.houseStyle;
  const healer = kind === 'healer', shop = kind === 'shop';
  const roof = healer ? '#f06d9c' : shop ? P.roof2 : P.roof, roofD = dk(roof, 0.28), roofL = lt(roof, 0.3);
  const wall = healer ? '#fff4f4' : P.wall, wallD = dk(wall, 0.14);
  const trim = P.trim;
  let s = shadow(72, 134, 68, 10, 0.34);
  if (st === 'mush') {
    // Tanglewood: mushroom cottage
    s += `<path d="M26 72H118V126Q118 134 110 134H34Q26 134 26 126Z" fill="${wall}" ${ol()}/>` + `<path d="M104 72H118V126Q118 134 110 134H104Z" fill="${wallD}"/>`;
    s += line('M40 80V132M60 80V132M84 80V132M104 80V132', dk(wall, 0.12), 1.2);
    s += windowBox(34, 96, 18, 18, P.trim, true) + windowBox(92, 96, 18, 18, P.trim, true);
    s += door(72, 92, 134, 22, P.wood);
    s += ell(72, 136, 16, 3.5, P.stone, ol(1.2));
    s += `<path d="M4 84C4 30 40 8 72 8C104 8 140 30 140 84C112 98 32 98 4 84Z" fill="${roof}" ${ol(2)}/>`;
    s += `<path d="M100 14C126 26 138 48 138 82C128 88 112 92 96 93C116 76 118 40 100 14Z" fill="${roofD}"/>`;
    s += `<path d="M12 86C40 99 104 99 132 86C128 92 110 97 72 97C34 97 16 92 12 86Z" fill="${lt(wall, 0.2)}" ${ol(1.2)}/>`;
    s += ell(44, 28, 16, 8, roofL, 'opacity=".75" transform="rotate(-20 44 28)"');
    for (const [x, y, r] of [[36, 52, 8], [72, 30, 9], [104, 56, 7], [60, 70, 6], [92, 78, 5], [22, 72, 5], [120, 74, 4.5]]) s += ell(x, y, r, r * 0.75, '#fff6ea', ol(1.1)) + ell(x - r * 0.25, y - r * 0.2, r * 0.4, r * 0.25, '#fff');
    s += line('M26 118q-6 -12 2 -26M118 112q7 -10 0 -22', P.leafD, 1.8) + [[23, 108], [27, 98], [121, 104], [119, 95]].map(([x, y], i) => ell(x, y, 3, 1.6, i % 2 ? P.leafL : P.leaf, ol(0.7))).join('');
    if (healer || shop) s += signBadge(healer ? 'heart' : 'coin', 72, 54, P);
    if (shop) s += awning(28, 116, 84, 8, '#ff9a3c');
    return svg(144, 144, s);
  }
  if (st === 'adobe') {
    s += rect(14, 56, 116, 78, wall, `${ol()} rx="6"`) + rect(108, 58, 20, 74, wallD, 'rx="4"');
    s += rect(14, 124, 116, 10, dk(wall, 0.18), 'rx="4"');
    // flat roof seen from above
    s += rect(10, 40, 124, 20, lt(wall, 0.2), `${ol()} rx="4"`) + rect(18, 44, 108, 12, dk(wall, 0.08), 'rx="2"');
    for (const x of [28, 50, 94, 116]) s += rect(x - 3.5, 60, 7, 5, P.wood, ol(1.1));
    if (kind === 'house') {
      s += rect(22, 22, 48, 22, wall, `${ol()} rx="4"`) + rect(18, 12, 56, 12, lt(wall, 0.2), `${ol()} rx="3"`) + rect(24, 15, 44, 6, dk(wall, 0.08), 'rx="2"');
      s += windowBox(38, 28, 14, 12, P.roof2, true);
    }
    s += windowBox(28, 82, 18, 20, P.roof2, true) + windowBox(98, 82, 18, 20, P.roof2, true);
    s += rect(24, 82, 4, 22, P.roof2, ol(1)) + rect(46, 82, 4, 22, P.roof2, ol(1)) + rect(94, 82, 4, 22, P.roof2, ol(1)) + rect(116, 82, 4, 22, P.roof2, ol(1));
    s += door(72, 88, 134, 22, P.wood);
    s += line('M20 70l6 -2M112 118l8 2M36 116l5 1', dk(wall, 0.2), 1.2);
    s += `<path d="M118 134h12v-8q-6 -10 -12 0z" fill="#c8663a" ${ol(1.2)}/>` + ell(124, 118, 3.5, 7, '#7faa48', ol(1.2));
    if (healer || shop) s += signBadge(healer ? 'heart' : 'coin', 72, 34, P);
    if (healer) s += rect(14, 70, 116, 5, '#ff7fa8', 'opacity=".9"');
    if (shop) s += awning(54, 90, 78, 8, P.roof2);
    return svg(144, 144, s);
  }
  // hip roof cottage
  s += rect(22, 76, 100, 56, wall, ol()) + rect(106, 77, 15, 54, wallD);
  if (P.id === 'stats') for (let y = 84; y < 126; y += 7) s += line(`M23 ${y}H121`, dk(wall, 0.12), 1);
  if (P.id === 'number') s += line('M23 80H121', trim, 3) ;
  s += rect(18, 124, 108, 10, P.stone, `${ol()} rx="2"`) + line('M36 124v10M58 124v10M86 124v10M108 124v10', dk(P.stone, 0.3), 1);
  if (P.id === 'stats' && !healer && !shop) {
    s += circ(45, 100, 9, '#bfe7ff', ol(1.4)) + circ(45, 100, 9, 'none', `stroke="${trim}" stroke-width="2.6"`) + line('M40 104l7 -8', '#fff', 2, 'opacity=".8"');
    s += circ(99, 99, 8, 'none', `stroke="#ff5a5a" stroke-width="4"`) + circ(99, 99, 8, 'none', `stroke="#fff" stroke-width="4" stroke-dasharray="6.28 6.28"`) + circ(99, 99, 10, 'none', ol(1)) + circ(99, 99, 6, 'none', ol(1));
  } else {
    s += windowBox(32, 90, 22, 20, trim) + windowBox(90, 90, 22, 20, trim);
  }
  s += door(72, 92, 134, 22, healer ? '#ff8fb4' : P.wood);
  s += ell(72, 136, 15, 3.2, dk(P.stone, 0.1), ol(1.1));
  if (kind === 'house') s += rect(96, 18, 13, 26, P.stone, ol()) + rect(94, 14, 17, 6, dk(P.stone, 0.15), ol(1.3)) + rect(104, 20, 3, 22, dk(P.stone, 0.25));
  // roof
  s += poly([[8, 84], [136, 84], [117, 24], [27, 24]], roof, ol(2));
  s += poly([[100, 24], [117, 24], [136, 84], [112, 84]], roofD);
  for (const [y, i] of [[38, 0], [52, 1], [66, 2]]) {
    const k = (y - 24) / 60, xa = 27 - 19 * k, xb = 117 + 19 * k;
    s += line(`M${f(xa + 1)} ${y}H${f(xb - 1)}`, roofD, 1.4);
    for (let x = xa + 8 + (i % 2) * 7; x < xb - 4; x += 14) s += line(`M${f(x)} ${y - 13}v12`, roofD, 1, 'opacity=".55"');
  }
  s += poly([[30, 27], [60, 27], [52, 50], [24, 46]], roofL, 'opacity=".5"');
  s += rect(4, 82, 136, 7, roofD, `${ol(1.6)} rx="3"`) + rect(8, 83, 128, 1.6, lt(roof, 0.25), 'opacity=".7"');
  s += rect(24, 18, 96, 8, roofL, `${ol(1.6)} rx="4"`);
  if (P.id === 'number') s += poly(starPts(72, 12, 8, 3.6), P.accent, ol(1.4)) + rect(70.5, 16, 3, 3, P.accent, ol(1));
  if (healer || shop) s += signBadge(healer ? 'heart' : 'coin', 72, 54, P);
  else if (P.id !== 'stats') s += `<path d="M62 64V56A10 10 0 0 1 82 56V64Z" fill="#bfe7ff" ${ol(1.4)}/>` + line('M72 47V64', trim, 1.4) + rect(59, 63, 26, 4, roofD, ol(1.2));
  if (shop) s += awning(26, 118, 84, 9, P.accent === '#ffd23f' ? '#ff6b5a' : P.accent);
  return svg(144, 144, s);
}

function propPillar(P) {
  const st = P.pillarStyle, C = P.id === 'academy' ? '#eeeaf4' : P.stone, CD = dk(C, 0.25), CL = lt(C, 0.4);
  let s = shadow(24, 90, 18, 5);
  if (st === 'obelisk') {
    s += poly([[9, 90], [39, 90], [37, 80], [11, 80]], CD, ol()) + poly([[10, 81], [38, 81], [36, 77], [12, 77]], C, ol(1.2));
    s += poly([[14, 78], [34, 78], [30, 22], [18, 22]], C, ol()) + poly([[24, 78], [34, 78], [30, 22], [24, 22]], CD);
    s += poly([[16, 76], [19.5, 76], [20, 24], [18.5, 24]], CL, 'opacity=".8"');
    s += poly([[17, 23], [31, 23], [24, 11]], P.accent, ol()) + poly([[24, 23], [31, 23], [24, 11]], dk(P.accent, 0.2));
    s += poly(starPts(24, 48, 6, 2.6), P.crystal[0], ol(1)) + glow(24, 48, 12, 12, P.crystal[0], 0.6);
    s += line('M20 34h8M20 62h8', dk(C, 0.3), 1.2);
    s += sparkle(24, 5, 3, '#fff') + sparkle(38, 30, 2, '#fff');
    return svg(48, 96, s);
  }
  if (st === 'geo') {
    s += rect(7, 80, 34, 11, CD, ol()) + rect(7, 78, 34, 5, C, ol(1.2));
    s += rect(12, 30, 24, 50, C, ol()) + rect(27, 31, 8, 48, CD) + rect(14, 32, 4, 46, CL, 'opacity=".8"');
    for (let y = 40; y < 76; y += 12) s += poly([[12, y], [18, y + 6], [24, y], [30, y + 6], [36, y]], 'none', `stroke="${P.roof}" stroke-width="2" stroke-linejoin="round"`);
    s += rect(8, 22, 32, 9, lt(C, 0.15), ol()) + rect(11, 14, 26, 9, C, ol()) + poly([[14, 14], [34, 14], [24, 5]], P.accent, ol()) + poly([[24, 14], [34, 14], [24, 5]], dk(P.accent, 0.2));
    s += rect(29, 23, 10, 7, CD, 'opacity=".6"');
    return svg(48, 96, s);
  }
  // classic column
  s += rect(7, 82, 34, 9, CD, `${ol()} rx="1.5"`) + rect(9, 77, 30, 7, C, `${ol(1.3)} rx="1.5"`);
  s += rect(12, 28, 24, 50, C, ol()) + rect(28, 29, 7, 48, CD);
  s += line('M17 30v46M22 30v46M27 30v46', dk(C, 0.15), 1.1) + rect(13.5, 30, 2.5, 46, CL, 'opacity=".85"');
  s += rect(8, 20, 32, 9, lt(C, 0.1), `${ol()} rx="2"`) + rect(10, 14, 28, 7, C, `${ol(1.3)} rx="1.5"`) + rect(12, 15.5, 16, 1.6, CL);
  if (P.id === 'patterns') s += line('M14 78q10 -8 2 -18t8 -18q6 -6 2 -14', P.leafD, 1.6) + [[15, 70], [21, 58], [18, 46], [25, 36]].map(([x, y], i) => ell(x, y, 3, 1.6, i % 2 ? P.leafL : P.leaf, `${ol(0.6)} transform="rotate(-30 ${x} ${y})"`)).join('') + `<path d="M8 14Q14 8 24 11Q32 8 40 14Q30 17 24 15Q16 17 8 14Z" fill="${P.leaf}" ${ol(1)}/>`;
  else if (P.id === 'stats') s += [[16, 72], [19, 74], [31, 70]].map(([x, y]) => circ(x, y, 1.4, '#f2f0e6', `stroke="${CD}" stroke-width=".5"`)).join('') + line('M12 60Q24 64 36 60', '#e2cf9c', 2);
  else s += circ(24, 24.5, 2.2, P.accent, ol(0.9));
  return svg(48, 96, s);
}

function propLighthouse(P) {
  const stripe = P.id === 'stats' ? '#e8434a' : P.id === 'number' ? P.roof : P.id === 'patterns' ? P.leafD : P.id === 'shape' ? P.roof : '#3f6fd6';
  const white = '#fbf8f0', G = '#ffe98a';
  let s = shadow(48, 136, 40, 7);
  // light beams
  const bid = uid('lb');
  s += linGrad(bid, [[0, G, 0.7], [1, G, 0]], 0, 0, 1, 0);
  const bid2 = uid('lb');
  s += linGrad(bid2, [[0, G, 0], [1, G, 0.7]], 0, 0, 1, 0);
  s += `<path d="M48 30L96 14V46Z" fill="url(#${bid})" opacity=".75"/><path d="M48 30L0 14V46Z" fill="url(#${bid2})" opacity=".75"/>`;
  s += glow(48, 30, 26, 22, G, 0.8);
  // rocks
  s += blob([[20, 130, 10], [36, 134, 9], [62, 134, 10], [78, 130, 9], [48, 136, 8]], P.rock, dk(P.rock, 0.3), lt(P.rock, 0.35), 1.4);
  // tower (tapered with stripes)
  const xAt = (y, side) => 48 + side * (22 - (128 - y) * (8 / 84));
  const band = (y0, y1, c) => poly([[xAt(y1, -1), y1], [xAt(y1, 1), y1], [xAt(y0, 1), y0], [xAt(y0, -1), y0]], c);
  s += poly([[xAt(128, -1), 128], [xAt(128, 1), 128], [xAt(44, 1), 44], [xAt(44, -1), 44]], white, ol());
  for (let i = 0; i < 4; i++) { const y1 = 128 - i * 21, y0 = y1 - 10.5; s += band(y0, y1, stripe); }
  s += poly([[48 + 8, 128], [xAt(128, 1), 128], [xAt(44, 1), 44], [48 + 6, 44]], '#1b0f2e', 'opacity=".16"');
  s += poly([[xAt(128, -1) + 3, 127], [xAt(128, -1) + 7, 127], [xAt(44, -1) + 5, 46], [xAt(44, -1) + 2.5, 46]], '#fff', 'opacity=".35"');
  s += poly([[xAt(128, -1), 128], [xAt(128, 1), 128], [xAt(44, 1), 44], [xAt(44, -1), 44]], 'none', ol());
  s += door(48, 110, 128, 11, P.wood) + windowBox(44, 76, 8, 9, P.trim, true);
  // gallery + lantern + roof
  s += rect(28, 40, 40, 6, dk(stripe, 0.2), `${ol()} rx="2"`) + line('M31 40v-6M37 40v-6M43 40v-6M53 40v-6M59 40v-6M65 40v-6M30 34h36', O, 1.2);
  s += rect(36, 20, 24, 16, G, ol()) + rect(47, 20, 2, 16, O) + rect(38, 22, 4, 12, '#fff', 'opacity=".8"');
  s += `<path d="M32 21Q48 4 64 21Z" fill="${stripe}" ${ol()}/>` + ell(42, 15, 4, 2, lt(stripe, 0.4), 'opacity=".8"') + circ(48, 7, 2.5, P.accent, ol(1));
  return svg(96, 144, s);
}

function propFountain(P) {
  const C = P.stone, CD = dk(C, 0.3), W = P.water, id = uid('fw');
  let s = shadow(48, 84, 44, 9);
  s += linGrad(id, [[0, lt(W, 0.25)], [1, W]]);
  const basin = P.id === 'shape' ? (cx, cy, rx, ry, fill, x) => poly(Array.from({ length: 8 }, (_, i) => { const a = (i * 45 + 22.5) * Math.PI / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; }), fill, x) : (cx, cy, rx, ry, fill, x) => ell(cx, cy, rx, ry, fill, x);
  s += `<path d="M6 64V74Q48 96 90 74V64Z" fill="${CD}" ${ol()}/>` + line('M20 80v8M34 84v8M48 86v8M62 84v8M76 80v8', dk(C, 0.45), 1, 'opacity=".6"');
  s += basin(48, 64, 42, 18, C, ol());
  s += basin(48, 64, 35, 13.5, `url(#${id})`, ol(1.3));
  s += ell(40, 60, 12, 3, '#fff', 'opacity=".35"') + line('M28 68q4 -2 8 0M56 70q4 -2 8 0M62 59q3 -1.5 6 0', '#fff', 1.2, 'opacity=".75"');
  // pedestal + bowl
  s += rect(43, 36, 10, 30, C, ol()) + rect(49, 37, 3, 28, CD) + ell(48, 66, 9, 3, lt(W, 0.3), 'opacity=".7"');
  s += ell(48, 37, 15, 5.5, CD, ol()) + ell(48, 35.5, 15, 5, C, ol(1.3)) + ell(48, 35, 11, 3, lt(W, 0.2));
  // water arcs
  s += line('M46 28Q34 24 28 48M50 28Q62 24 68 48M48 28Q40 36 38 54M48 28Q56 36 58 54', lt(W, 0.55), 2, 'opacity=".9"');
  s += line('M46 28Q34 24 28 48M50 28Q62 24 68 48', '#fff', 0.8, 'opacity=".9"');
  s += circ(48, 25, 4, lt(W, 0.5), ol(1)) + circ(47, 24, 1.3, '#fff');
  if (P.id === 'number') s += prism(48, 22, 5, 11, P.crystal[0]);
  else if (P.id === 'patterns') s += emblem('leaf', 48, 20, 5, P.leaf, 1);
  else if (P.id === 'shape') s += emblem('hex', 48, 18, 5, P.accent, 1);
  else if (P.id === 'stats') s += `<path d="M42 22A6 6 0 0 1 54 22L48 25Z" fill="#ffd6c8" ${ol(1)}/>` + line('M48 16.5V24M45 17.5L47 24M51 17.5L49 24', '#e8a898', 0.7);
  for (const [x, y] of [[26, 52], [70, 52], [38, 58], [60, 58]]) s += circ(x, y, 1.3, '#fff', 'opacity=".85"');
  return svg(96, 96, s);
}

function propGate(P, open) {
  const C = P.stone, CD = dk(C, 0.3), CL = lt(C, 0.35), M = P.magic;
  let s = shadow(48, 91, 44, 6);
  const pillar = (x) => rect(x - 11, 30, 22, 60, C, `${ol()} rx="2"`) + rect(x + 3, 31, 7, 58, CD) + rect(x - 9, 32, 3, 56, CL, 'opacity=".8"') +
    rect(x - 13, 84, 26, 7, CD, `${ol(1.3)} rx="2"`) + rect(x - 13, 24, 26, 8, lt(C, 0.15), `${ol(1.3)} rx="2"`) +
    circ(x, 52, 6, open ? '#9dffb0' : M, ol(1.2)) + emblem(P.emblem, x, 52, 3.6, '#fff', 0.8) + glow(x, 52, 12, 12, open ? '#9dffb0' : M, 0.6);
  // arch
  s += `<path d="M10 30Q10 6 48 6Q86 6 86 30H72Q72 18 48 18Q24 18 24 30Z" fill="${C}" ${ol()}/>` + `<path d="M16 22Q22 10 48 9.5" fill="none" stroke="${CL}" stroke-width="2" stroke-linecap="round"/>`;
  s += poly([[41, 4], [55, 4], [53, 19], [43, 19]], lt(C, 0.1), ol(1.3)) + emblem(P.emblem, 48, 11.5, 4.2, open ? '#9dffb0' : P.accent, 0.9);
  if (!open) {
    const id = uid('gb');
    s += linGrad(id, [[0, lt(M, 0.4), 0.85], [1, M, 0.55]]);
    s += rect(24, 22, 48, 66, `url(#${id})`);
    s += line('M30 26v58M40 22v64M56 22v64M66 26v58', '#fff', 1.2, 'opacity=".45"');
    s += circ(48, 54, 11, lt(M, 0.35), `stroke="#fff" stroke-width="1.6"`) + circ(48, 54, 7.5, 'none', `stroke="#fff" stroke-width="1" stroke-dasharray="2 2.4"`);
    s += rect(44, 52, 8, 7, P.accent, `${ol(1)} rx="1"`) + `<path d="M45.5 52V49.5A2.5 2.5 0 0 1 50.5 49.5V52" fill="none" stroke="${O}" stroke-width="1.4"/>`;
    s += sparkle(32, 36, 2.5, '#fff') + sparkle(64, 70, 2, '#fff') + sparkle(60, 32, 1.6, '#fff');
  } else {
    s += sparkle(36, 50, 2, '#dfffe6') + sparkle(60, 40, 1.6, '#dfffe6') + sparkle(52, 72, 1.8, '#dfffe6');
  }
  s += pillar(13) + pillar(83);
  return svg(96, 96, s);
}

function propShrine(P) {
  const C = P.stone, CD = dk(C, 0.3), CL = lt(C, 0.35), M = P.magic;
  let s = shadow(48, 88, 44, 7) + glow(48, 40, 34, 34, M, 0.5);
  // steps
  s += `<path d="M6 76H90V86Q48 92 6 86Z" fill="${CD}" ${ol()}/>` + rect(6, 68, 84, 10, C, `${ol()} rx="3"`) + rect(9, 69.5, 60, 2, CL, 'opacity=".8"');
  s += rect(18, 60, 60, 10, lt(C, 0.08), `${ol()} rx="3"`) + rect(20, 61.5, 40, 2, CL, 'opacity=".8"');
  // monolith
  s += `<path d="M32 62V20Q32 10 48 8Q64 10 64 20V62Z" fill="${C}" ${ol()}/>` + `<path d="M54 10.5Q64 12 64 20V62H55Z" fill="${CD}"/>` + rect(35, 20, 3, 38, CL, 'opacity=".8" rx="1.5"');
  s += circ(48, 34, 11, dk(C, 0.45), ol(1.2)) + glow(48, 34, 16, 16, M, 0.9) + emblem(P.emblem, 48, 34, 7.5, M, 1.1);
  s += line('M38 50h20M40 55h16', dk(C, 0.35), 1.2);
  // braziers
  const braz = (x) => rect(x - 3, 52, 6, 10, CD, ol(1.1)) + `<path d="M${x - 6} 50H${x + 6}L${x + 4} 55H${x - 4}Z" fill="${C}" ${ol(1.1)}/>` +
    glow(x, 44, 9, 9, '#ffd05a', 0.7) + `<path d="M${x} 38Q${x + 5} 44 ${x + 3} 49H${x - 3}Q${x - 5} 44 ${x} 38Z" fill="#ffb13a" ${ol(1)}/>` + `<path d="M${x} 42Q${x + 2.5} 46 ${x + 1.5} 49H${x - 1.5}Q${x - 2.5} 46 ${x} 42Z" fill="#fff0a0"/>`;
  s += braz(14) + braz(82);
  s += sparkle(26, 22, 2.4, '#fff') + sparkle(72, 16, 2, '#fff');
  return svg(96, 96, s);
}

function propBoat(P) {
  const W = P.id === 'stats' ? '#d9573f' : P.id === 'number' ? '#7b54c8' : P.wood, WD = dk(W, 0.3), inner = P.id === 'stats' || P.id === 'number' ? '#e6c79a' : lt(P.wood, 0.25);
  let s = ell(48, 36, 44, 9, '#0d2a50', 'opacity=".22"') + ell(48, 34, 46, 11, 'none', 'stroke="#fff" stroke-width="1.4" opacity=".5"');
  const hull = 'M6 22Q7 38 26 40H70Q88 38 93 24Q88 10 70 9H26Q7 9 6 22Z';
  s += `<path d="${hull}" fill="${W}" ${ol()}/>` + `<path d="M8 26Q12 38 26 39H70Q86 37 91 26Q80 34 70 34H26Q14 34 8 26Z" fill="${WD}"/>`;
  s += `<path d="M13 21Q14 14 28 14H68Q82 15 86 22Q82 30 68 30H28Q14 30 13 21Z" fill="${inner}" ${ol(1.3)}/>`;
  s += rect(32, 13, 6, 18, dk(inner, 0.2), ol(1.1)) + rect(58, 13, 6, 18, dk(inner, 0.2), ol(1.1));
  s += line('M18 18q-2 3 0 6M78 18h-6', dk(inner, 0.25), 1);
  s += line('M44 12L26 2M52 12L70 2', '#9a6a3a', 2.4) + ell(24, 1.6, 4, 1.8, '#b8864e', ol(1)) + ell(72, 1.6, 4, 1.8, '#b8864e', ol(1));
  s += line('M12 16Q30 11 60 11', '#fff', 1.2, 'opacity=".5"');
  if (P.id === 'stats') s += circ(80, 22, 4, 'none', 'stroke="#fff" stroke-width="2.4"');
  return svg(96, 48, s);
}

function propDock(P) {
  const W = P.id === 'stats' ? P.wood : P.id === 'shape' ? '#c49a6a' : P.wood;
  let s = '';
  for (let i = 0; i < 6; i++) {
    const c = mix(W, hash2(i, 9, 2) > 0.5 ? lt(W, 0.3) : dk(W, 0.15), 0.4);
    s += rect(1.5, i * 8 + 0.5, 45, 7, c, `stroke="${dk(W, 0.5)}" stroke-width=".9"`) + rect(2, i * 8 + 1, 44, 1.3, lt(c, 0.35), 'opacity=".8"');
    s += line(`M${8 + (i * 11) % 24} ${i * 8 + 4}h${8 + (i % 2) * 5}`, dk(c, 0.2), 0.7) + circ(6, i * 8 + 4, 0.6, dk(c, 0.5)) + circ(42, i * 8 + 4, 0.6, dk(c, 0.5));
  }
  s += rect(0, 0, 2, 48, dk(W, 0.45)) + rect(46, 0, 2, 48, dk(W, 0.45));
  for (const y of [0, 48]) for (const x of [2, 46]) s += circ(x, y, 3.4, dk(W, 0.2), ol(1.1)) + circ(x - 0.8, y - 0.8, 1.2, lt(W, 0.3));
  return svg(48, 48, s);
}

function propWindvane(P) {
  const M = '#4a3f66', A = P.id === 'stats' ? '#ff6b5a' : P.accent;
  let s = shadow(24, 91, 10, 3);
  s += rect(18, 84, 12, 7, P.stone, `${ol()} rx="2"`) + rect(22.5, 22, 3, 63, M, ol(1.2));
  s += line('M10 40H38M24 33V47', M, 1.6) + circ(10, 40, 1.8, A, ol(0.8)) + circ(38, 40, 1.8, A, ol(0.8)) + circ(24, 47, 1.6, A, ol(0.8));
  s += `<path d="M22 31l1 -4l1 4M23.2 28.5h1.6" stroke="${O}" stroke-width=".9" fill="none"/>`;
  s += line('M8 18H40', M, 2) + poly([[40, 18], [34, 13.5], [34, 22.5]], A, ol(1.1)) + poly([[8, 18], [4, 12], [13, 12], [16, 18], [13, 24], [4, 24]], A, ol(1.1));
  s += `<path d="M18 16Q20 8 27 9Q30 5 32 8Q31 11 29 12Q31 16 27 17Z" fill="${M}" ${ol(1)}/>`;
  s += circ(24, 20, 2.4, P.accent, ol(1)) + circ(24, 21.5, 1.6, M);
  return svg(48, 96, s);
}

function propSundial(P) {
  const C = P.stone, CD = dk(C, 0.3), CL = lt(C, 0.35);
  let s = shadow(24, 43, 14, 3.6);
  s += rect(12, 38, 24, 5, CD, `${ol()} rx="1.5"`) + rect(17, 24, 14, 15, C, ol()) + rect(26, 25, 4.5, 13, CD) + rect(18.5, 25, 2, 13, CL);
  s += ell(24, 24, 18, 8.5, CD, ol()) + ell(24, 22.5, 18, 8, C, ol(1.3)) + ell(24, 22.5, 14.5, 6, lt(C, 0.3), `stroke="${P.accent}" stroke-width="1.4"`);
  for (let i = 0; i < 12; i++) { const a = i * 30 * Math.PI / 180; s += line(`M${f(24 + Math.cos(a) * 12)} ${f(22.5 + Math.sin(a) * 5)}L${f(24 + Math.cos(a) * 13.8)} ${f(22.5 + Math.sin(a) * 5.7)}`, dk(C, 0.45), 0.9); }
  s += line('M24 22.5L33 25', '#1b0f2e', 2, 'opacity=".35"');
  s += poly([[24, 22.5], [15, 22.5], [24, 10]], P.accent, ol(1.1)) + poly([[24, 22.5], [19.5, 22.5], [24, 13]], dk(P.accent, 0.2));
  return svg(48, 48, s);
}

function propAcademy(P) {
  const C = P.id === 'academy' ? '#e9e3f0' : P.stone, CD = dk(C, 0.25), CL = lt(C, 0.35), R = P.roof, RD = dk(R, 0.28), RL = lt(R, 0.3);
  const glowWin = (x, y, w, h) => `<path d="M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z" fill="#ffe27a" ${ol(1.3)}/>` + line(`M${x + w / 2} ${y + 1}V${y + h}`, '#c98a2a', 1) + rect(x + 1.5, y + w / 2, 2, h - w / 2 - 1.5, '#fff', 'opacity=".7"');
  const bricks = (x0, y0, x1, y1) => { let t = ''; for (let y = y0 + 10, r = 0; y < y1; y += 10, r++) { t += line(`M${x0 + 1} ${y}H${x1 - 1}`, CD, 0.8, 'opacity=".55"'); for (let x = x0 + 8 + (r % 2) * 10; x < x1 - 3; x += 20) t += line(`M${x} ${y - 10}v10`, CD, 0.8, 'opacity=".45"'); } return t; };
  const tower = (cx, top, w, roofH) => {
    let t = rect(cx - w / 2, top, w, 224 - top, C, ol()) + rect(cx + w / 2 - 10, top + 1, 9, 222 - top, CD) + bricks(cx - w / 2, top, cx + w / 2, 222);
    t += glowWin(cx - 6, top + 26, 12, 20) + glowWin(cx - 6, top + 76, 12, 20);
    t += rect(cx - w / 2 - 4, top - 6, w + 8, 8, lt(C, 0.1), `${ol(1.4)} rx="2"`);
    t += poly([[cx - w / 2 - 6, top - 4], [cx + w / 2 + 6, top - 4], [cx, top - 4 - roofH]], R, ol()) + poly([[cx, top - 4 - roofH], [cx + w / 2 + 6, top - 4], [cx + 4, top - 4]], RD);
    t += line(`M${cx - w / 4 - 2} ${top - 4 - roofH * 0.4}L${cx - 2} ${top - roofH + 2}`, RL, 2);
    t += line(`M${cx} ${top - 4 - roofH}v-12`, O, 1.6) + poly([[cx, top - 16 - roofH], [cx + 14, top - 12 - roofH], [cx, top - 8 - roofH]], P.accent, ol(1.1));
    return t;
  };
  let s = shadow(144, 228, 138, 12, 0.34);
  // main hall
  s += rect(40, 118, 208, 106, C, ol()) + rect(40, 206, 208, 18, CD) + bricks(40, 118, 248, 206);
  for (const x of [58, 82, 190, 214]) s += glowWin(x, 150, 14, 28);
  s += poly([[28, 124], [260, 124], [236, 74], [52, 74]], R, ol(2)) + poly([[212, 74], [236, 74], [260, 124], [228, 124]], RD);
  for (const y of [90, 106]) { const k = (y - 74) / 50; s += line(`M${f(52 - 24 * k + 2)} ${y}H${f(236 + 24 * k - 2)}`, RD, 1.4); }
  s += rect(24, 122, 240, 7, RD, `${ol(1.6)} rx="3"`) + poly([[56, 77], [110, 77], [100, 100], [48, 96]], RL, 'opacity=".45"');
  // side towers
  s += tower(34, 104, 44, 48) + tower(254, 104, 44, 48);
  // central keep
  s += rect(106, 56, 76, 168, C, ol()) + rect(166, 57, 15, 166, CD) + bricks(106, 56, 182, 206);
  s += rect(100, 48, 88, 10, lt(C, 0.1), `${ol(1.6)} rx="2"`);
  for (let x = 102; x < 186; x += 14) s += rect(x, 40, 9, 9, C, ol(1.2));
  s += circ(144, 88, 17, lt(C, 0.2), ol()) + circ(144, 88, 13, P.id === 'academy' ? '#3f73d6' : R, ol(1.2)) + glow(144, 88, 20, 20, P.magic, 0.5) + emblem(P.emblem, 144, 88, 8, P.accent, 1.1);
  s += glowWin(118, 118, 14, 26) + glowWin(156, 118, 14, 26);
  // door + stairs
  s += `<path d="M122 206V176A22 22 0 0 1 166 176V206Z" fill="${dk(C, 0.35)}" ${ol()}/>` + door(144, 162, 206, 34, P.wood);
  s += rect(112, 206, 64, 7, CL, ol(1.4)) + rect(104, 213, 80, 8, C, ol(1.4)) + rect(98, 220, 92, 6, CD, ol(1.4));
  // banners
  for (const x of [112, 176]) s += `<path d="M${x - 5} 150H${x + 5}V176L${x} 171L${x - 5} 176Z" fill="${R}" ${ol(1.2)}/>` + circ(x, 160, 2.5, P.accent);
  s += sparkle(20, 40, 3, '#fff') + sparkle(270, 30, 2.5, '#fff') + sparkle(144, 18, 2.5, '#fff8c0');
  return svg(288, 240, s);
}

const PROPS = {
  tree: propTree, bush: propBush, rock: propRock, crystal: propCrystal, mushroom: propMushroom, sign: propSign,
  portal: propPortal, lamp: propLamp, chest: propChest, challenge_marker: propMarker,
  fence_h: (P) => propFence(P, false), fence_v: (P) => propFence(P, true),
  house: (P) => propBuilding(P, 'house'), shop: (P) => propBuilding(P, 'shop'), healer: (P) => propBuilding(P, 'healer'),
  pillar: propPillar, lighthouse: propLighthouse, fountain: propFountain, gate_closed: (P) => propGate(P, false), gate_open: (P) => propGate(P, true),
  guardian_shrine: propShrine, boat: propBoat, dock: propDock, windvane: propWindvane, sundial: propSundial, academy: propAcademy,
};

/** Number of art variants per prop (propSVG's third argument); others have only variant 0. */
export const PROP_VARIANTS = { tree: 3, bush: 3, rock: 3, crystal: 3 };

export function propSVG(name, themeName = 'academy', variant = 0) {
  const P = theme(themeName);
  const fn = PROPS[name];
  let v = Math.floor(Number(variant)) || 0;
  if (!(v >= 0 && v < (PROP_VARIANTS[name] || 1))) v = 0;
  if (fn) return fn(P, v);
  const [w, h] = PROP_SIZE[name] || [1, 1];
  return svg(48 * w, 48 * h, rect(4, 4, 48 * w - 8, 48 * h - 8, '#ff00ff', 'opacity=".5" rx="6"'));
}

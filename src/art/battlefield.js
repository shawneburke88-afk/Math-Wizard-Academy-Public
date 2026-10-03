// Themed battle backdrops, drawn in code as SVG (same cartoon style as src/art/world.js).
//
//   battlefieldSVG(theme, { variant = 0, guardian = false }) -> '<svg viewBox="0 0 1600 900" ...>'
//
// Layout (viewBox units): sky & distant scenery above the horizon (y ≈ 400), a midground band at
// the horizon, and a 3/4-perspective ground below. Two clear battle pads:
//   LEFT  zone: centre (420, 712), about x 80–760,  y 565–860  (player side, nearer)
//   RIGHT zone: centre (1180, 625), about x 865–1495, y 495–755 (opponent side, farther)
// preserveAspectRatio="xMidYMax slice": wide screens show everything; narrow (portrait) screens
// keep the bottom and crop the sides symmetrically (about x 487–1113 visible at 820×1180).

export const BATTLE_THEMES = ['academy', 'number', 'patterns', 'shape', 'stats'];
export const BATTLE_ZONES = {
  left: { cx: 420, cy: 712, rx: 340, ry: 145 },
  right: { cx: 1180, cy: 625, rx: 315, ry: 130 },
};

const O = '#2b2140';
const HZ = 400; // horizon
let _n = 0;
const uid = (p) => `${p}${(++_n).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const f = (v) => Math.round(v * 10) / 10;
function hx(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const dk = (c, t = 0.25) => mix(c, '#231433', t);
const lt = (c, t = 0.3) => mix(c, '#ffffff', t);
function rng(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h = (h + 0x6d2b79f5) | 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const P2 = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const ol = (w = 3) => `stroke="${O}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const poly = (a, fill, x = '') => `<polygon points="${P2(a)}" fill="${fill}" ${x}/>`;
const ell = (x, y, rx, ry, fill, e = '') => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" ${e}/>`;
const circ = (x, y, r, fill, e = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" ${e}/>`;
const rect = (x, y, w, h, fill, e = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}" ${e}/>`;
const path = (d, fill, e = '') => `<path d="${d}" fill="${fill}" ${e}/>`;
const line = (d, c, w = 2, e = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${e}/>`;
function grad(type, id, stops, attrs = '') {
  return `<${type}Gradient id="${id}" ${attrs}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('')}</${type}Gradient>`;
}
const vGrad = (id, stops, y1 = 0, y2 = 1) => grad('linear', id, stops, `x1="0" y1="${y1}" x2="0" y2="${y2}"`);
const rGrad = (id, stops, e = '') => grad('radial', id, stops, e);
function glow(cx, cy, rx, ry, c, op = 0.6) { const id = uid('g'); return rGrad(id, [[0, c, op], [0.5, c, op * 0.4], [1, c, 0]]) + ell(cx, cy, rx, ry, `url(#${id})`); }
const sparkle = (x, y, s, fill, op = 1) => `<path d="M${f(x)} ${f(y - s)}Q${f(x + s * 0.18)} ${f(y - s * 0.18)} ${f(x + s)} ${f(y)}Q${f(x + s * 0.18)} ${f(y + s * 0.18)} ${f(x)} ${f(y + s)}Q${f(x - s * 0.18)} ${f(y + s * 0.18)} ${f(x - s)} ${f(y)}Q${f(x - s * 0.18)} ${f(y - s * 0.18)} ${f(x)} ${f(y - s)}Z" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}/>`;
function starPts(cx, cy, R, r, n = 5, rot = -90) {
  return Array.from({ length: n * 2 }, (_, i) => { const a = ((rot + (i * 180) / n) * Math.PI) / 180, rr = i % 2 ? r : R; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; });
}
// wavy silhouette band from y≈base, amplitude/period in px; closed down to `bottom`
function ridge(base, amp, seed, bottom = HZ + 40, step = 40) {
  const R = rng(seed);
  let d = `M-20 ${bottom}L-20 ${f(base)}`;
  for (let x = -20; x <= 1640; x += step) d += `L${x} ${f(base - R() * amp)}`;
  return d + `L1640 ${bottom}Z`;
}
// cel-shaded circle cluster (outlined when `w` > 0)
function blob(circles, base, dark, light, w = 0) {
  let s = w ? circles.map(([x, y, r]) => circ(x, y, r + w, O)).join('') : '';
  s += circles.map(([x, y, r]) => circ(x, y, r, dark)).join('');
  s += circles.map(([x, y, r]) => { const k = r * 0.22; return circ(x - k * 0.4, y - k, r - k, base); }).join('');
  if (light) s += circles.slice(0, Math.ceil(circles.length / 2)).map(([x, y, r]) => ell(x - r * 0.3, y - r * 0.42, r * 0.38, r * 0.22, light, 'opacity=".85"')).join('');
  return s;
}
function prism(cx, by, w, h, c, tilt = 0, sw = 3) {
  const t = tilt;
  const pts = [[cx - w / 2, by], [cx - w / 2 + t * 0.8, by - h * 0.72], [cx + t, by - h], [cx + w / 2 + t * 0.8, by - h * 0.72], [cx + w / 2, by], [cx, by + w * 0.2]];
  return poly(pts, c, sw ? ol(sw) : '') + poly([[cx + t * 0.1, by + w * 0.18], [cx + t * 0.9, by - h * 0.72], [cx + t, by - h], [cx + w / 2 + t * 0.8, by - h * 0.72], [cx + w / 2, by]], dk(c, 0.22)) +
    line(`M${f(cx - w / 2 + w * 0.2)} ${f(by - h * 0.08)}L${f(cx - w / 2 + t * 0.8 + w * 0.2)} ${f(by - h * 0.62)}`, '#fff', Math.max(1.5, w * 0.1), 'opacity=".85"') + (sw ? poly(pts, 'none', ol(sw)) : '');
}
const inZone = (x, y, pad = 40) => Object.values(BATTLE_ZONES).some((z) => ((x - z.cx) / (z.rx + pad)) ** 2 + ((y - z.cy) / (z.ry + pad)) ** 2 < 1);

// ---------------------------------------------------------------- theme palettes
const THEMES = {
  academy: {
    sky: [['#5fb4f5', '#9fd6ff', '#e4f5ff'], ['#4a5cc4', '#c77bc0', '#ffc59a']],
    ground: ['#9fe07a', '#6cc04a'], groundD: '#4f9e3a', tuft: '#4a9a37', pad: ['#d9f2b8', '#a9dc80', '#7cb85a'], rim: '#f5f0e0', magic: '#7fd4ff', emblem: 'book',
  },
  number: {
    sky: [['#241a5c', '#6b3fa6', '#f0a0d0'], ['#6d8ff0', '#b9a6f5', '#ffe0f4']],
    ground: ['#c6b0f2', '#9c7fe0'], groundD: '#7556c4', tuft: '#6446b4', pad: ['#efe6ff', '#cbb6f7', '#9c80df'], rim: '#ffd84a', magic: '#c79bff', emblem: 'star',
  },
  patterns: {
    sky: [['#bfe98a', '#e7f7a8', '#fdfbd0'], ['#6aa05a', '#c9c070', '#ffd98a']],
    ground: ['#7fd164', '#47ae4a'], groundD: '#2f8a38', tuft: '#2c8837', pad: ['#dff5b0', '#a8e080', '#6fbf55'], rim: '#b98a5a', magic: '#9dffb2', emblem: 'leaf',
  },
  shape: {
    sky: [['#ff9f5a', '#ffc27a', '#ffe7b0'], ['#6a4fa8', '#e0708a', '#ffb070']],
    ground: ['#eed092', '#dcb468'], groundD: '#b98d42', tuft: '#9c9a40', pad: ['#fff0cc', '#f0d49a', '#d9a868'], rim: '#d98b5f', magic: '#ffba5c', emblem: 'hex',
  },
  stats: {
    sky: [['#4aa8ec', '#8fd0fa', '#dff4ff'], ['#3b4f9a', '#9a7cc0', '#ffc3a0']],
    ground: ['#9be6c8', '#56c7a6'], groundD: '#3ca78a', tuft: '#2d8c77', pad: ['#fdf3d4', '#f3e1ae', '#d8bf84'], rim: '#ffffff', magic: '#6fe8ff', emblem: 'bolt',
  },
};

function emblem(kind, cx, cy, s, fill, stroke = 'none', sw = 0) {
  const st = sw ? `stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"` : '';
  switch (kind) {
    case 'star': return poly(starPts(cx, cy, s, s * 0.45), fill, st);
    case 'leaf': return path(`M${cx} ${cy + s}Q${cx - s} ${cy} ${cx} ${cy - s}Q${cx + s} ${cy} ${cx} ${cy + s}Z`, fill, st);
    case 'hex': return poly(Array.from({ length: 6 }, (_, i) => [cx + s * Math.cos((i * 60 + 30) * Math.PI / 180), cy + s * Math.sin((i * 60 + 30) * Math.PI / 180)]), fill, st);
    case 'bolt': return poly([[cx + 0.25 * s, cy - s], [cx - 0.6 * s, cy + 0.12 * s], [cx - 0.05 * s, cy + 0.12 * s], [cx - 0.3 * s, cy + s], [cx + 0.6 * s, cy - 0.18 * s], [cx + 0.05 * s, cy - 0.18 * s]], fill, st);
    default: return poly([[cx, cy - s * 0.5], [cx - s, cy - s * 0.75], [cx - s, cy + s * 0.55], [cx, cy + s * 0.8], [cx + s, cy + s * 0.55], [cx + s, cy - s * 0.75]], fill, st) + line(`M${cx} ${cy - s * 0.5}V${cy + s * 0.8}`, stroke === 'none' ? dk(fill, 0.3) : stroke, Math.max(1, sw));
  }
}

function clouds(R, color, n, yMin, yMax, op = 0.9) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = 60 + (i / n) * 1500 + R() * 120, y = yMin + R() * (yMax - yMin), w = 70 + R() * 90;
    s += `<g opacity="${op}">${ell(x, y + w * 0.12, w, w * 0.2, dk(color, 0.08))}${circ(x - w * 0.45, y, w * 0.3, color)}${circ(x, y - w * 0.12, w * 0.42, color)}${circ(x + w * 0.45, y + w * 0.02, w * 0.28, color)}${ell(x, y + w * 0.1, w * 0.95, w * 0.18, color)}${ell(x - w * 0.12, y - w * 0.3, w * 0.2, w * 0.1, '#fff', 'opacity=".7"')}</g>`;
  }
  return s;
}

// ---------------------------------------------------------------- per-theme scenery
const SCENERY = {
  academy: {
    far(v, R) {
      let s = clouds(R, v ? '#ffd9e0' : '#ffffff', 5, 60, 220);
      s += path(ridge(HZ - 70, 40, 'ah1', HZ + 20, 80), v ? '#9aa0c8' : '#a9d9a0');
      // castle silhouette (atmospheric)
      const C = v ? '#8f88b8' : '#b7c3de', CD = dk(C, 0.15), roof = v ? '#6c5aa8' : '#7f9ee0';
      const tower = (x, top, w, rh) => rect(x - w / 2, top, w, HZ - top, C) + rect(x + w / 4, top, w / 4, HZ - top, CD) + poly([[x - w / 2 - 8, top], [x + w / 2 + 8, top], [x, top - rh]], roof) +
        line(`M${x} ${top - rh}v-26`, '#6a6090', 3) + poly([[x, top - rh - 26], [x + 26, top - rh - 20], [x, top - rh - 13]], v ? '#ffb070' : '#ff6b6b') +
        [0, 1].map((k) => path(`M${x - 5} ${top + 30 + k * 50}V${top + 22 + k * 50}A5 5 0 0 1 ${x + 5} ${top + 22 + k * 50}V${top + 30 + k * 50}Z`, '#ffe27a', 'opacity=".9"')).join('');
      s += rect(640, 250, 320, 150, C) + rect(900, 250, 60, 150, CD);
      for (let x = 640; x < 960; x += 24) s += rect(x, 238, 14, 14, C);
      s += tower(610, 200, 70, 90) + tower(990, 200, 70, 90) + tower(800, 150, 96, 110);
      for (const x of [700, 750, 850, 900]) s += path(`M${x - 7} 330V316A7 7 0 0 1 ${x + 7} 316V330Z`, '#ffe27a', 'opacity=".9"');
      for (const x of [690, 910]) s += path(`M${x - 12} 262H${x + 12}V300L${x} 290L${x - 12} 300Z`, v ? '#b04a7a' : '#3f73d6');
      s += path(ridge(HZ - 30, 30, 'ah2', HZ + 20, 60), v ? '#7f8ab0' : '#86c96a');
      return s;
    },
    mid(v, R) {
      let s = '';
      const cols = v ? ['#5a7a6a', '#46605a', '#7a9a80'] : ['#58ae48', '#3e8e3a', '#8fd06a'];
      for (let x = -40; x < 1660; x += 70 + R() * 50) { const r = 26 + R() * 22; s += blob([[x, HZ - r * 0.4, r], [x - r * 0.8, HZ - r * 0.1, r * 0.7], [x + r * 0.8, HZ - r * 0.1, r * 0.7]], cols[0], cols[1], cols[2]); }
      for (const x of [260, 1340]) s += rect(x - 4, HZ - 90, 8, 90, '#4a3f66') + ell(x, HZ - 96, 12, 14, '#ffe58a') + glow(x, HZ - 96, 40, 40, '#ffe58a', 0.5);
      return s;
    },
    fg(v) {
      let s = '';
      const bush = (x, y, k) => blob([[x, y, 44 * k], [x - 44 * k, y + 14 * k, 32 * k], [x + 46 * k, y + 12 * k, 34 * k]], '#62c24a', '#3d963a', '#a6e676', 3.5) +
        [[x - 30 * k, y], [x + 10 * k, y - 20 * k], [x + 44 * k, y + 8 * k]].map(([a, b]) => [0, 72, 144, 216, 288].map((d) => circ(a + 5 * k * Math.cos(d * Math.PI / 180), b + 5 * k * Math.sin(d * Math.PI / 180), 4.5 * k, '#fff', ol(1))).join('') + circ(a, b, 3.5 * k, '#ffd23f')).join('');
      s += bush(200, 880, 1.15) + bush(1400, 880, 1.2) + bush(1445, 470, 0.6) + bush(170, 520, 0.6) + bush(1060, 912, 0.6);
      s += flowers([[300, 888], [1290, 890], [1240, 870], [180, 620], [1460, 560], [960, 890]], ['#ff6b81', '#ffd23f', '#ff9ad5']);
      return s;
    },
  },
  number: {
    far(v, R) {
      let s = '';
      if (!v) {
        for (let i = 0; i < 70; i++) { const x = R() * 1600, y = R() * 300, r = 0.8 + R() * 2; s += circ(x, y, r, '#fff', `opacity="${f(0.4 + R() * 0.6)}"`); }
        for (let i = 0; i < 8; i++) s += sparkle(R() * 1600, 20 + R() * 220, 6 + R() * 6, '#fff6c4');
        s += circ(1330, 110, 46, '#fff4d0') + circ(1350, 98, 42, '#6b3fa6') + glow(1330, 110, 120, 120, '#ffe7a0', 0.35);
      } else s += clouds(R, '#fff4fb', 4, 60, 200, 0.8) + glow(250, 120, 200, 160, '#fff6c4', 0.6);
      // aurora ribbon
      s += path('M-20 170Q300 90 620 160T1240 140T1640 120V190Q1300 220 1000 200T400 230T-20 240Z', v ? '#ffffff' : '#7ff0e0', 'opacity=".18"');
      const peaks = (base, h, cA, cB, seed, n) => {
        const Rr = rng(seed); let t = '';
        for (let i = 0; i < n; i++) {
          const x = -60 + i * (1720 / (n - 1)) + (Rr() - 0.5) * 60, w = 90 + Rr() * 90, hh = h * (0.6 + Rr() * 0.5);
          t += poly([[x - w, base], [x, base - hh], [x + w, base]], cA) + poly([[x, base - hh], [x + w, base], [x + w * 0.15, base]], cB) + poly([[x, base - hh], [x - w * 0.25, base - hh * 0.6], [x + w * 0.05, base - hh * 0.55]], lt(cA, 0.35), 'opacity=".7"');
        }
        return t;
      };
      s += peaks(HZ, 230, v ? '#b6a2ec' : '#8a6cc9', v ? '#9a84dc' : '#6a4fae', 'np1', 9);
      s += peaks(HZ + 10, 150, v ? '#a386e4' : '#7652bd', v ? '#8466cf' : '#583a9c', 'np2', 12);
      for (const [x, h] of [[300, 120], [760, 160], [1120, 110], [1480, 140]]) s += glow(x, HZ - h * 0.5, 50, h * 0.6, '#8ff2ff', 0.35) + prism(x, HZ, 34, h, v ? '#b8f6ff' : '#8ff2ff', 0, 0);
      return s;
    },
    mid(v, R) {
      let s = '';
      for (let x = -30; x < 1660; x += 90 + R() * 70) {
        if (R() < 0.5) { const h = 30 + R() * 40; s += prism(x, HZ + 6, h * 0.35, h, R() < 0.5 ? '#ff9fe8' : '#8ff2ff', (R() - 0.5) * 8, 0) + prism(x + 14, HZ + 8, h * 0.25, h * 0.6, '#c9a6ff', 3, 0); }
        else { const r = 24 + R() * 14; s += rect(x - 4, HZ - r, 8, r, '#8d78b8') + blob([[x, HZ - r - 18, r], [x - r * 0.7, HZ - r - 6, r * 0.6], [x + r * 0.7, HZ - r - 6, r * 0.6]], '#f39ad8', '#c264b4', '#ffd6f2'); }
      }
      return s;
    },
    fg() {
      let s = '';
      const cluster = (x, y, k) => glow(x, y - 40 * k, 120 * k, 70 * k, '#8ff2ff', 0.45) + prism(x - 40 * k, y, 34 * k, 70 * k, '#ff9fe8', -8 * k) + prism(x + 42 * k, y + 4 * k, 30 * k, 60 * k, '#c9a6ff', 8 * k) + prism(x, y + 6 * k, 44 * k, 120 * k, '#8ff2ff', 0);
      s += cluster(210, 885, 1) + cluster(1400, 885, 1.05) + cluster(1445, 480, 0.5) + cluster(165, 540, 0.5) + cluster(1070, 910, 0.45);
      s += [[300, 860, 10], [1300, 850, 9], [190, 690, 7], [1440, 590, 7], [830, 880, 6]].map(([x, y, k]) => sparkle(x, y, k, '#fff8c0')).join('');
      s += starFlowers([[320, 892], [1290, 890], [180, 640], [960, 885]]);
      return s;
    },
  },
  patterns: {
    far(v, R) {
      let s = '';
      // distant tree trunks
      for (let x = 20; x < 1600; x += 70 + R() * 60) { const w = 18 + R() * 26; s += rect(x, 80, w, HZ - 70, v ? '#5a5a3a' : '#7f9a58', `opacity="${f(0.55 + R() * 0.3)}"`); }
      // light shafts
      for (const [x, w] of [[300, 120], [700, 80], [1050, 140], [1380, 90]]) s += poly([[x, 0], [x + w, 0], [x + w * 2.2, HZ], [x + w * 1.2, HZ]], v ? '#ffd98a' : '#fffbd0', 'opacity=".35"');
      // near trunks
      for (const x of [120, 480, 880, 1240, 1520]) s += rect(x - 22, 60, 44, HZ - 40, v ? '#5a4030' : '#8a6040') + rect(x + 6, 60, 12, HZ - 40, v ? '#46301f' : '#6f4a2f');
      // canopy mass at the top
      const cc = v ? ['#3f6a3a', '#2a4c2a', '#6a9050'] : ['#3fae4a', '#227834', '#8ce06c'];
      for (let x = -40; x < 1680; x += 110) { const y = 30 + R() * 50, r = 80 + R() * 40; s += blob([[x, y, r], [x + 60, y + 40, r * 0.7]], cc[0], cc[1], cc[2]); }
      for (const [x, len] of [[70, 170], [560, 120], [1010, 150], [1450, 180]]) s += line(`M${x} 90q-10 ${len / 2} 4 ${len}`, cc[1], 5) + [0.4, 0.7, 0.95].map((t) => ell(x + (t * 10 % 7) - 3, 90 + len * t, 9, 5, cc[2])).join('');
      return s;
    },
    mid(v, R) {
      let s = '';
      const cols = v ? ['#4a7a44', '#36603a', '#7aa060'] : ['#3fae4a', '#227834', '#8ce06c'];
      for (let x = -40; x < 1660; x += 60 + R() * 50) { const r = 26 + R() * 24; s += blob([[x, HZ - r * 0.3, r], [x - r * 0.9, HZ, r * 0.6], [x + r * 0.9, HZ + 2, r * 0.65]], cols[0], cols[1], cols[2]); }
      for (const x of [340, 980, 1290]) s += rect(x - 6, HZ - 26, 12, 26, '#fbf0da') + path(`M${x - 22} ${HZ - 24}Q${x} ${HZ - 60} ${x + 22} ${HZ - 24}Z`, '#ea5540') + circ(x - 6, HZ - 38, 4, '#fff') + circ(x + 8, HZ - 32, 3, '#fff');
      return s;
    },
    fg() {
      let s = '';
      const fern = (x, y, k, flip = 1) => [[-150, 1], [-110, 1.1], [-70, 1.15], [-30, 1]].map(([a, l]) => {
        const r = ((flip > 0 ? a : -180 - a) * Math.PI) / 180, L = 150 * k * l, tx = x + Math.cos(r) * L, ty = y + Math.sin(r) * L;
        const nx = -Math.sin(r) * 22 * k, ny = Math.cos(r) * 22 * k, mx = (x + tx) / 2, my = (y + ty) / 2 - 18 * k;
        return path(`M${x} ${y}Q${f(mx + nx)} ${f(my + ny)} ${f(tx)} ${f(ty)}Q${f(mx - nx)} ${f(my - ny)} ${x} ${y}Z`, '#3fae4a', ol(3)) + line(`M${x} ${y}Q${f(mx)} ${f(my)} ${f(tx)} ${f(ty)}`, '#227834', 2.5);
      }).join('');
      const shroom = (x, y, k, cap) => rect(x - 12 * k, y - 34 * k, 24 * k, 34 * k, '#fbf0da', ol(3)) + path(`M${x - 44 * k} ${y - 30 * k}Q${x - 44 * k} ${y - 80 * k} ${x} ${y - 82 * k}Q${x + 44 * k} ${y - 80 * k} ${x + 44 * k} ${y - 30 * k}Q${x} ${y - 20 * k} ${x - 44 * k} ${y - 30 * k}Z`, cap, ol(3.5)) +
        ell(x - 16 * k, y - 60 * k, 9 * k, 7 * k, '#fff8ec') + ell(x + 18 * k, y - 50 * k, 7 * k, 5 * k, '#fff8ec') + ell(x + 2 * k, y - 72 * k, 6 * k, 4 * k, '#fff8ec');
      s += fern(200, 895, 1.1) + fern(1410, 895, 1.1, -1) + shroom(300, 900, 0.8, '#ea5540') + shroom(1290, 898, 0.7, '#8f7cf0') + fern(165, 560, 0.5) + fern(1450, 500, 0.45, -1) + shroom(1060, 905, 0.45, '#ea5540');
      s += flowers([[370, 890], [1210, 890], [185, 650], [1450, 580], [960, 888]], ['#ff6fae', '#ffd23f', '#8fb8ff', '#ffffff']);
      return s;
    },
  },
  shape: {
    far(v, R) {
      let s = glow(v ? 1200 : 800, v ? 330 : 150, 260, 200, v ? '#ffb070' : '#fff2c0', 0.8) + circ(v ? 1200 : 800, v ? 340 : 150, 60, v ? '#ffcf8a' : '#fff4d0');
      s += clouds(R, v ? '#ffc0a0' : '#fff2dc', 3, 70, 190, 0.75);
      const mesa = (x, w, top, c, stripes) => {
        let t = path(`M${x - w / 2 - 30} ${HZ + 10}L${x - w / 2} ${top + 10}Q${x - w / 2} ${top} ${x - w / 2 + 12} ${top}H${x + w / 2 - 12}Q${x + w / 2} ${top} ${x + w / 2} ${top + 10}L${x + w / 2 + 30} ${HZ + 10}Z`, c);
        t += path(`M${x + w * 0.2} ${top}H${x + w / 2 - 12}Q${x + w / 2} ${top} ${x + w / 2} ${top + 10}L${x + w / 2 + 30} ${HZ + 10}H${x + w * 0.3}Z`, dk(c, 0.15));
        for (let i = 1; i <= stripes; i++) { const y = top + ((HZ - top) * i) / (stripes + 1); t += rect(x - w / 2 - 30 * (i / (stripes + 1)), y, w + 60 * (i / (stripes + 1)), 6, dk(c, 0.12), 'opacity=".6"'); }
        return t;
      };
      s += mesa(220, 300, 200, v ? '#c9889a' : '#f0b48a', 3) + mesa(1350, 360, 180, v ? '#c9889a' : '#f0b48a', 3) + mesa(760, 220, 250, v ? '#b87a8a' : '#e89a70', 2);
      // red rock arch
      const A = v ? '#a8584a' : '#d06a44';
      s += path(`M980 ${HZ + 10}L1000 230Q1010 180 1090 175Q1170 180 1180 230L1200 ${HZ + 10}H1150L1140 260Q1130 225 1090 225Q1050 225 1040 260L1030 ${HZ + 10}Z`, A) + path(`M1110 176Q1170 182 1180 230L1200 ${HZ + 10}H1150L1140 260Q1132 232 1110 226Z`, dk(A, 0.18));
      s += path(ridge(HZ - 20, 26, 'sh2', HZ + 20, 50), v ? '#b98a7a' : '#e6b27a');
      return s;
    },
    mid(v, R) {
      let s = '';
      for (let x = -20; x < 1660; x += 110 + R() * 90) {
        if (R() < 0.55) { const h = 50 + R() * 40, c = v ? '#6a8a58' : '#6fb052'; s += path(`M${x - 9} ${HZ + 4}V${HZ - h + 9}A9 9 0 0 1 ${x + 9} ${HZ - h + 9}V${HZ + 4}Z`, c) + path(`M${x - 9} ${HZ - h * 0.45}H${x - 22}V${HZ - h * 0.75}A6 6 0 0 1 ${x - 10} ${HZ - h * 0.75}`, c) + rect(x + 2, HZ - h + 8, 6, h - 6, dk(c, 0.2)); }
        else { const w = 24 + R() * 30; s += poly([[x - w, HZ + 6], [x - w * 0.7, HZ - w * 0.8], [x + w * 0.5, HZ - w], [x + w, HZ + 6]], v ? '#a8706a' : '#d99b62') + poly([[x + w * 0.1, HZ - w * 0.9], [x + w * 0.5, HZ - w], [x + w, HZ + 6], [x + w * 0.2, HZ + 6]], v ? '#8a5a58' : '#b87a48'); }
      }
      for (const x of [300, 1280]) s += rect(x - 14, HZ - 110, 28, 110, v ? '#d0a090' : '#ecc48e') + rect(x - 20, HZ - 122, 40, 14, v ? '#c09080' : '#e0b47e') + poly([[x - 14, HZ - 122], [x + 14, HZ - 122], [x, HZ - 146]], '#ff9a3c');
      return s;
    },
    fg() {
      let s = '';
      const rock = (x, y, k) => poly([[x - 70 * k, y], [x - 64 * k, y - 50 * k], [x - 20 * k, y - 80 * k], [x + 40 * k, y - 72 * k], [x + 72 * k, y - 30 * k], [x + 70 * k, y]], '#db9b62', ol(3.5)) +
        poly([[x + 10 * k, y - 40 * k], [x + 72 * k, y - 30 * k], [x + 70 * k, y], [x + 5 * k, y]], '#b87a48') + poly([[x - 60 * k, y - 48 * k], [x - 20 * k, y - 76 * k], [x + 36 * k, y - 68 * k], [x + 10 * k, y - 42 * k]], '#f0bb86') +
        line(`M${x - 60 * k} ${y - 20 * k}Q${x} ${y - 12 * k} ${x + 68 * k} ${y - 16 * k}`, '#b87a48', 3);
      const cactus = (x, y, k) => { const c = '#6fb052'; return path(`M${x - 14 * k} ${y}V${y - 110 * k}A14 14 0 0 1 ${x + 14 * k} ${y - 110 * k}V${y}Z`, c, ol(3.5)) + path(`M${x - 14 * k} ${y - 50 * k}H${x - 38 * k}V${y - 80 * k}A10 10 0 0 1 ${x - 18 * k} ${y - 80 * k}`, c, ol(3.5)) + rect(x + 3 * k, y - 110 * k, 7 * k, 108 * k, '#4a8038') + line(`M${x - 6 * k} ${y - 105 * k}V${y - 6 * k}`, '#a8d87c', 3); };
      s += rock(200, 885, 1.1) + cactus(320, 900, 0.8) + rock(1410, 885, 1.1) + cactus(1290, 905, 0.75) + rock(170, 560, 0.45) + rock(1445, 490, 0.4) + rock(1060, 910, 0.4);
      s += flowers([[400, 892], [1200, 892], [185, 650], [1450, 580]], ['#ff7a5c', '#ffd23f', '#ff9ad0']);
      return s;
    },
  },
  stats: {
    far(v, R) {
      let s = clouds(R, v ? '#ffd0c0' : '#ffffff', 5, 50, 200);
      const SEA = 300;
      const sid = uid('sea');
      s += vGrad(sid, [[0, v ? '#4a5ca0' : '#2a7fd0'], [1, v ? '#7a80c0' : '#56b4ee']]) + rect(0, SEA, 1600, HZ - SEA + 20, `url(#${sid})`);
      s += rect(0, SEA - 2, 1600, 4, v ? '#ffd0b0' : '#dff4ff', 'opacity=".8"');
      for (let i = 0; i < 30; i++) { const x = R() * 1600, y = SEA + 10 + R() * 80, w = 10 + R() * 26; s += line(`M${f(x)} ${f(y)}h${f(w)}`, '#fff', 2, `opacity="${f(0.35 + R() * 0.4)}"`); }
      if (v) s += ell(900, SEA + 40, 90, 40, '#ffc3a0', 'opacity=".35"') + circ(900, SEA - 4, 50, '#ffcf9a');
      // lighthouse on a rocky islet
      s += path(`M1250 ${SEA + 30}Q1270 ${SEA - 10} 1330 ${SEA - 14}Q1400 ${SEA - 12} 1430 ${SEA + 30}Z`, v ? '#5a6070' : '#7d8b9e');
      s += poly([[1322, SEA - 12], [1348, SEA - 12], [1343, SEA - 110], [1327, SEA - 110]], '#fbf8f0');
      for (let i = 0; i < 3; i++) { const y1 = SEA - 12 - i * 34, y0 = y1 - 16, x = (y) => 1322 + ((SEA - 12 - y) / 98) * 5; s += poly([[x(y1), y1], [2670 - x(y1), y1], [2670 - x(y0), y0], [x(y0), y0]], '#e8434a'); }
      s += rect(1324, SEA - 124, 22, 14, '#ffe98a') + path(`M1320 ${SEA - 124}Q1335 ${SEA - 140} 1350 ${SEA - 124}Z`, '#e8434a') + glow(1335, SEA - 117, 80, 50, '#ffe98a', 0.6);
      s += path('M300 290l10 -7l10 7M360 250l8 -6l8 6M1080 200l10 -7l10 7', 'none', 'stroke="#3d4a66" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"');
      s += path(`M180 ${SEA + 12}L220 ${SEA + 12}L212 ${SEA + 22}H188Z`, '#fbf8f0') + poly([[200, SEA + 10], [200, SEA - 36], [226, SEA + 6]], '#ffd84a');
      return s;
    },
    mid(v, R) {
      let s = path(ridge(HZ - 14, 24, 'sd', HZ + 20, 80), v ? '#d8b890' : '#f6e3ae');
      for (let x = 0; x < 1640; x += 26 + R() * 30) { const h = 16 + R() * 26; s += line(`M${f(x)} ${HZ + 4}q${f(3 + R() * 6)} ${f(-h * 0.6)} ${f(6 + R() * 8)} ${f(-h)}`, v ? '#6a8a70' : '#3aa68a', 3); }
      for (let x = 40; x < 1600; x += 120) s += rect(x - 4, HZ - 30, 8, 32, '#ab8d6c') + line(`M${x} ${HZ - 22}Q${x + 60} ${HZ - 10} ${x + 120} ${HZ - 22}`, '#e2cf9c', 3);
      return s;
    },
    fg() {
      let s = '';
      const grass = (x, y, k) => [[-40, 120, '#26876a'], [40, 110, '#26876a'], [-20, 140, '#40b98a'], [20, 150, '#40b98a'], [0, 130, '#86e4b4']].map(([dx, h, c]) =>
        path(`M${x + dx * 0.2 * k - 8 * k} ${y}Q${x + dx * 0.5 * k} ${y - h * 0.6 * k} ${x + dx * k} ${y - h * k}Q${x + dx * 0.6 * k + 4 * k} ${y - h * 0.5 * k} ${x + dx * 0.2 * k + 8 * k} ${y}Z`, c, ol(3))).join('') +
        [[-40, 120], [40, 110], [0, 130]].map(([dx, h]) => ell(x + dx * k, y - h * k - 10 * k, 6 * k, 14 * k, '#f6e7aa', ol(2))).join('');
      const shell = (x, y, k) => path(`M${x - 22 * k} ${y}A22 20 0 0 1 ${x + 22 * k} ${y}Z`, '#ffd6c8', ol(3)) + line(`M${x} ${y}v-18M${x - 11 * k} ${y}l-6 -12M${x + 11 * k} ${y}l6 -12`, '#e8a898', 2.5);
      const star = (x, y, k) => poly(starPts(x, y, 26 * k, 12 * k), '#ff9a6a', ol(3)) + circ(x, y, 4 * k, '#ffc0a0');
      s += grass(200, 890, 1.1) + grass(1410, 890, 1.05) + shell(310, 895, 0.9) + star(1290, 885, 0.9) + grass(165, 560, 0.45) + grass(1450, 500, 0.4) + star(190, 680, 0.55) + shell(1050, 895, 0.6);
      return s;
    },
  },
};

function flowers(spots, colors) {
  return spots.map(([x, y], i) => {
    const c = colors[i % colors.length], k = 0.7 + ((y - 400) / 500) * 0.6;
    return line(`M${x} ${y}v${f(14 * k)}`, '#3d963a', 3) + [0, 72, 144, 216, 288].map((a) => circ(x + 7 * k * Math.cos((a - 90) * Math.PI / 180), y + 7 * k * Math.sin((a - 90) * Math.PI / 180), 6 * k, c, ol(1.5))).join('') + circ(x, y, 4.5 * k, c === '#ffd23f' ? '#ff9a3c' : '#ffe066');
  }).join('');
}
function starFlowers(spots) {
  return spots.map(([x, y], i) => line(`M${x} ${y}v16`, '#6446b4', 3) + poly(starPts(x, y, 12, 5.5), ['#ffd84a', '#ff8ad0', '#7fe8ff'][i % 3], ol(1.8)) + circ(x, y, 3, '#fff')).join('');
}

// ---------------------------------------------------------------- composition
function ground(T, v, R) {
  const id = uid('gd');
  const [far, near] = T.ground;
  const tint = v ? (c) => mix(c, T.sky[1][1], 0.18) : (c) => c;
  let s = vGrad(id, [[0, tint(lt(far, 0.1))], [0.35, tint(far)], [1, tint(near)]]) + rect(0, HZ - 10, 1600, 910 - HZ, `url(#${id})`);
  // perspective bands
  for (let i = 1; i < 9; i++) { const y = HZ + 500 * (i / 9) ** 1.6; s += ell(800, y + 600, 1400, 600, 'none', `stroke="${tint(T.groundD)}" stroke-width="${f(1 + i * 0.6)}" opacity=".08"`); }
  // tufts, larger when nearer, kept off the battle zones
  for (let i = 0; i < 140; i++) {
    const t = R(), y = HZ + 10 + t * t * 480, x = R() * 1600, k = 0.35 + t * 1.3;
    if (inZone(x, y, 30)) continue;
    s += path(`M${f(x - 7 * k)} ${f(y)}L${f(x - 5 * k)} ${f(y - 9 * k)}L${f(x - 2 * k)} ${f(y - 2 * k)}L${f(x)} ${f(y - 13 * k)}L${f(x + 2 * k)} ${f(y - 2 * k)}L${f(x + 5 * k)} ${f(y - 8 * k)}L${f(x + 7 * k)} ${f(y)}Z`, tint(T.tuft), `opacity="${f(0.55 + t * 0.4)}"`);
  }
  for (let i = 0; i < 26; i++) {
    const t = R(), y = HZ + 20 + t * 460, x = R() * 1600, k = 0.5 + t;
    if (inZone(x, y, 20)) continue;
    s += ell(x, y, 5 * k, 3 * k, tint(dk(far, 0.25)), 'opacity=".5"') + ell(x - k, y - k, 3 * k, 1.6 * k, lt(far, 0.4), 'opacity=".6"');
  }
  return s;
}

function pad(T, z, v, guardian, side) {
  const id = uid('pd');
  const [light, base, edge] = T.pad;
  const tint = v ? (c) => mix(c, T.sky[1][1], 0.15) : (c) => c;
  let s = ell(z.cx, z.cy + 16, z.rx + 16, z.ry + 12, '#1b0f2e', 'opacity=".16"');
  s += ell(z.cx, z.cy + 10, z.rx, z.ry, tint(edge));
  s += rGrad(id, [[0, tint(lt(light, 0.3))], [0.6, tint(light)], [1, tint(base)]], 'cx=".45" cy=".4" r=".62"') + ell(z.cx, z.cy, z.rx, z.ry, `url(#${id})`);
  s += ell(z.cx, z.cy, z.rx - 6, z.ry - 4, 'none', `stroke="${T.rim}" stroke-width="5" opacity=".75"`);
  s += ell(z.cx, z.cy, z.rx * 0.8, z.ry * 0.8, 'none', `stroke="${tint(base)}" stroke-width="3" stroke-dasharray="18 14" opacity=".6"`);
  s += `<g transform="translate(${z.cx} ${z.cy}) scale(1 ${f(z.ry / z.rx)})" opacity=".18">${emblem(T.emblem, 0, 0, z.rx * 0.28, tint(edge))}</g>`;
  s += ell(z.cx - z.rx * 0.25, z.cy - z.ry * 0.45, z.rx * 0.4, z.ry * 0.16, '#fff', 'opacity=".25"');
  if (guardian && side === 'right') {
    s += ell(z.cx, z.cy, z.rx - 6, z.ry - 4, 'none', `stroke="${T.magic}" stroke-width="7" opacity=".9"`);
    s += ell(z.cx, z.cy, z.rx * 0.8, z.ry * 0.8, 'none', `stroke="#fff" stroke-width="3" stroke-dasharray="6 22" opacity=".9"`);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, x = z.cx + Math.cos(a) * (z.rx - 6), y = z.cy + Math.sin(a) * (z.ry - 4); s += circ(x, y, 7, T.magic, 'stroke="#fff" stroke-width="2"'); }
  }
  return s;
}

export function battlefieldSVG(themeName = 'academy', { variant = 0, guardian = false } = {}) {
  const key = BATTLE_THEMES.includes(themeName) ? themeName : 'academy';
  const T = THEMES[key], S = SCENERY[key];
  const v = variant === 1 ? 1 : 0;
  const R = rng(key + v);
  const skyC = guardian ? ['#1a0f33', mix(T.magic, '#3a1650', 0.6), mix(T.magic, '#ff7a8a', 0.4)] : T.sky[v];
  const sky = uid('sk');
  let s = vGrad(sky, [[0, skyC[0]], [0.6, skyC[1]], [1, skyC[2]]], 0, 1) + rect(0, 0, 1600, HZ + 20, `url(#${sky})`);
  let far = S.far(guardian ? 0 : v, R);
  if (guardian) far = `<g opacity=".75">${far}</g>` + rect(0, 0, 1600, HZ + 20, '#1a0f33', 'opacity=".35"');
  s += far;
  s += glow(800, HZ, 1000, 70, guardian ? T.magic : skyC[2], 0.5); // horizon haze
  s += ground(T, v || guardian ? 1 : 0, R);
  let mid = S.mid(v, R);
  s += mid;
  if (guardian) {
    const z = BATTLE_ZONES.right, col = uid('col');
    s += glow(z.cx, z.cy - 120, 460, 330, T.magic, 0.55);
    s += vGrad(col, [[0, T.magic, 0], [0.7, lt(T.magic, 0.3), 0.35], [1, '#fff', 0.5]]) + path(`M${z.cx - 250} ${z.cy}L${z.cx - 150} 0H${z.cx + 150}L${z.cx + 250} ${z.cy}Z`, `url(#${col})`);
  }
  s += pad(T, BATTLE_ZONES.left, v, guardian, 'left') + pad(T, BATTLE_ZONES.right, v, guardian, 'right');
  if (guardian) {
    const z = BATTLE_ZONES.right, Rg = rng('gd' + key);
    for (let i = 0; i < 14; i++) { const x = z.cx + (Rg() - 0.5) * 560, y = z.cy - 60 - Rg() * 360; s += sparkle(x, y, 6 + Rg() * 8, i % 3 ? '#fff' : lt(T.magic, 0.4), 0.9); }
    for (let i = 0; i < 5; i++) { const x = z.cx - 260 + i * 130, y = z.cy - 280 - (i % 2) * 60; s += `<g opacity=".8">${circ(x, y, 22, 'none', `stroke="${lt(T.magic, 0.3)}" stroke-width="3"`)}${emblem(T.emblem, x, y, 12, lt(T.magic, 0.5))}</g>`; }
  }
  s += S.fg(v);
  if (v === 1 && !guardian) s += rect(0, 0, 1600, 900, T.sky[1][1], 'opacity=".08"');
  if (guardian) { const vg = uid('vg'); s += rGrad(vg, [[0.55, '#1a0f33', 0], [1, '#1a0f33', 0.55]], 'cx=".5" cy=".55" r=".75"') + rect(0, 0, 1600, 900, `url(#${vg})`); }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">${s}</svg>`;
}

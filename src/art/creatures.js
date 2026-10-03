import { PETS_A } from './pets-a.js';
import { PETS_B } from './pets-b.js';
import { PETS_C } from './pets-c.js';
import { PETS_D } from './pets-d.js';
// Creature art: 31 species x 3 stages (+ rare palette) and 4 region guardians.
// Everything is drawn in code as SVG strings (see docs/ART_SPEC.md section 1).
// Style: chunky cartoon, bold outlines, cel shading (shadow crescent + rim light per part).

export const OL = '#2b2140';

// ---------------------------------------------------------------- number / path helpers
const f = (n) => Math.round(n * 10) / 10;
const pt = (p) => `${f(p[0])} ${f(p[1])}`;

/** Smooth closed (or open) Catmull-Rom curve through points. A point [x, y, 1] is a sharp corner. */
export function blob(pts, closed = true) {
  const n = pts.length;
  const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pt(pts[0])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1 = p1[2] ? p1 : [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = p2[2] ? p2 : [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d + (closed ? 'Z' : '');
}
/** Mirror a half outline (top-centre, down the right side, to bottom-centre) around x = cx. */
export function mir(half, cx) {
  const back = half.slice(1, -1).reverse().map((p) => [2 * cx - p[0], p[1], p[2]]);
  return half.concat(back);
}
/** Polygon path. */
export const poly = (pts) => `M${pts.map(pt).join('L')}Z`;
/** Regular polygon points. */
export function ngon(cx, cy, r, n, rot = 0, ry = r) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = ((rot - 90) * Math.PI) / 180 + (i * 2 * Math.PI) / n;
    out.push([cx + r * Math.cos(a), cy + ry * Math.sin(a), 1]);
  }
  return out;
}
/** Leaf / ear / feather outline: from base b1 out to a sharp tip and back to base b2, bulging by k. */
export function leaf(b1, tip, b2, k = 0.28, k2 = k) {
  const n = (a, b, kk, sgn) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
    return [mx - dy * kk * sgn, my + dx * kk * sgn];
  };
  return [b1, n(b1, tip, k, 1), [tip[0], tip[1], 1], n(b2, tip, k2, -1), b2];
}
// shape elements (no fill: parts colour them)
export const P = (d, tf) => `<path d="${d}"${tf ? ` transform="${tf}"` : ''}/>`;
export const E = (cx, cy, rx, ry, rot) =>
  `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}"${rot ? ` transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})"` : ''}/>`;
export const Ci = (cx, cy, r) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`;
export const Rr = (x, y, w, h, r = 0, tf) =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${r ? ` rx="${f(r)}"` : ''}${tf ? ` transform="${tf}"` : ''}/>`;
const rot = (a, x, y) => `rotate(${f(a)} ${f(x)} ${f(y)})`;

// ---------------------------------------------------------------- colour helpers
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}
const towards = (h, target, amt) => {
  let d = ((target - h + 540) % 360) - 180;
  return h + Math.sign(d) * Math.min(Math.abs(d), amt);
};
const TONES = {};
/** Base colour -> { b: base, s: shade (cooler, darker), l: light (warmer), d: deep } */
export function tone(hex) {
  if (typeof hex !== 'string') return hex;
  if (TONES[hex]) return TONES[hex];
  const [h, s, l] = hexToHsl(hex);
  const t = {
    b: hex,
    s: hslToHex(towards(h, 262, 18), s * 0.9 + 0.08, l * 0.8 - 0.04),
    l: hslToHex(towards(h, 55, 10), s + 0.05, l + (1 - l) * 0.55),
    d: hslToHex(towards(h, 262, 28), s * 0.8 + 0.1, l * 0.55 - 0.05),
  };
  TONES[hex] = t;
  return t;
}

// ---------------------------------------------------------------- palettes
// roles: main, second, belly, accent, gem, eye (iris), dark (markings)
const PAL = {
  star: {
    normal: { main: '#ffc93e', second: '#9d6fe0', belly: '#fff0cf', accent: '#ffe372', gem: '#b98cff', eye: '#6a3fc0', dark: '#5b3f8f', pink: '#ffa7c4', grey: '#9a90c2', wing: '#dccbff' },
    rare: { main: '#ff9ccb', second: '#45c3e6', belly: '#fff6fb', accent: '#b8f2ff', gem: '#5fe0ff', eye: '#1f7fb0', dark: '#2f5f99', pink: '#ffd0e6', grey: '#8fc4e8', wing: '#c9f3ff' },
  },
  vine: {
    normal: { main: '#5ec65a', second: '#ff8fbd', belly: '#e9f7a8', accent: '#c6ea3f', gem: '#ff7fb0', eye: '#2e7d45', dark: '#2f7a4a', pink: '#ffb3cf', grey: '#94b89c', wing: '#e6ffc2' },
    rare: { main: '#ff9c40', second: '#d9465e', belly: '#ffeab0', accent: '#ffd23a', gem: '#ffe066', eye: '#a8431f', dark: '#9a3f2a', pink: '#ffc8a0', grey: '#c9a98a', wing: '#ffe2b8' },
  },
  stone: {
    normal: { main: '#d9794f', second: '#5f84b8', belly: '#efd5a0', accent: '#7fd6e6', gem: '#7fd6e6', eye: '#3f5f9a', dark: '#6b4a3f', pink: '#ffb09a', grey: '#a79c94', wing: '#cfe6ff' },
    rare: { main: '#a28cf0', second: '#2fa493', belly: '#efe8ff', accent: '#ffd257', gem: '#ffd257', eye: '#1f7f70', dark: '#4a3f8a', pink: '#ffc4e8', grey: '#b5aed0', wing: '#ffeab0' },
  },
  storm: {
    normal: { main: '#2ec4b6', second: '#4c52b8', belly: '#e2f8f2', accent: '#ffe14a', gem: '#ffe14a', eye: '#2f3a9a', dark: '#1f5f7a', pink: '#ffa9c0', grey: '#8fa6bf', wing: '#d6fbff' },
    rare: { main: '#ff7fa3', second: '#7a43b8', belly: '#fff0f5', accent: '#7af4ff', gem: '#7af4ff', eye: '#6a2fa0', dark: '#6a2f7f', pink: '#ffd0e0', grey: '#c0a0c8', wing: '#ffe0f0' },
  },
};
function palette(el, variant) {
  const src = PAL[el][variant === 'rare' ? 'rare' : 'normal'];
  const out = { el };
  for (const k in src) out[k] = k === 'eye' ? src[k] : tone(src[k]);
  out.white = tone('#fbf7ff');
  out.ink = tone('#4a3b6b');
  return out;
}

// ---------------------------------------------------------------- the drawing context
let SEQ = 0;
class Art {
  constructor(prefix = 'c') {
    this.u = `${prefix}${(SEQ++).toString(36)}${Math.random().toString(36).slice(2, 4)}`;
    this.n = 0;
    this.defs = '';
    this.sil = '';
    this.out = '';
    this.back = '';
    this.grads = {};
  }
  id() { return `${this.u}_${(this.n++).toString(36)}`; }
  add(s) { this.out += s; return this; }
  /** Filled, shaded, outlined body part.
   *  o.s: shadow size (default 7), o.sw: outline width, o.inner: markup clipped inside,
   *  o.hl: highlight shapes (light colour), o.flat: no shading, o.rim: rim light on/off, o.sil: in silhouette */
  part(shape, c, o = {}) {
    const T = tone(c);
    let i;
    if (shape[0] === '#') i = shape.slice(1);
    else { i = this.id(); this.defs += shape.replace(/^<(\w+)/, `<$1 id="${i}"`); }
    const s = o.s ?? 7;
    const u = `<use href="#${i}"`;
    let g = `${u} fill="${o.flat ? T.b : T.s}"/>`;
    if (!o.flat || o.inner || o.hl) {
      this.clips = this.clips || {};
      if (!this.clips[i]) { this.clips[i] = 1; this.defs += `<clipPath id="k${i}">${u}/></clipPath>`; }
      g += `<g clip-path="url(#k${i})">`;
      if (!o.flat) g += `${u} fill="${T.b}" transform="translate(${f(-0.55 * s)} ${f(-0.8 * s)})"/>`;
      if (o.inner) g += o.inner;
      if (!o.flat && o.rim !== false) g += `${u} class="mwr" stroke="${T.l}"${o.rimw ? ` style="stroke-width:${o.rimw}px"` : ''} transform="translate(${f(0.3 * s + 1)} ${f(0.45 * s + 1.4)})"/>`;
      if (o.hl) g += `<g fill="${T.l}">${o.hl}</g>`;
      g += '</g>';
    }
    const sw = o.sw ?? 3.5;
    if (sw) g += `${u} class="mwo"${sw !== 3.5 ? ` style="stroke-width:${sw}px"` : ''}/>`;
    if (o.tf) g = `<g transform="${o.tf}">${g}</g>`;
    if (o.sil !== false) this.sil += o.tf ? `${u} transform="${o.tf}"/>` : `${u}/>`;
    if (o.behind) this.back += g; else this.out += g;
    return i;
  }
  /** Store a reusable shape; pass '#id' to part() with o.tf to draw copies. */
  def(shape) {
    const i = this.id();
    this.defs += shape.replace(/^<(\w+)/, `<$1 id="${i}"`);
    return `#${i}`;
  }
  /** Radial glow gradient id for a colour. */
  glow(col) {
    if (this.grads[col]) return this.grads[col];
    const i = this.id();
    this.defs += `<radialGradient id="${i}"><stop offset="0" stop-color="${col}" stop-opacity=".85"/><stop offset=".45" stop-color="${col}" stop-opacity=".35"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`;
    this.grads[col] = i;
    return i;
  }
  halo(x, y, r, col, behind = false) {
    const s = `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#${this.glow(col)})"/>`;
    if (behind) this.back += s; else this.out += s;
  }
  svg(vb, tf = '', pre = '', post = '') {
    const silW = 8.5;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" stroke-linejoin="round"><style>.mwo{fill:none;stroke:${OL};stroke-width:3.5px}.mwr{fill:none;stroke-width:3px}</style><defs>${this.defs}</defs>${pre}<g${tf ? ` transform="${tf}"` : ''}>`
      + this.back
      + `<g fill="${OL}" stroke="${OL}" stroke-width="${silW}">${this.sil}</g>`
      + this.out + `</g>${post}</svg>`;
  }
}

// ---------------------------------------------------------------- shared features
const star4d = (x, y, r, k = 0.2) =>
  `M${f(x)} ${f(y - r)}Q${f(x + k * r)} ${f(y - k * r)} ${f(x + r)} ${f(y)}Q${f(x + k * r)} ${f(y + k * r)} ${f(x)} ${f(y + r)}Q${f(x - k * r)} ${f(y + k * r)} ${f(x - r)} ${f(y)}Q${f(x - k * r)} ${f(y - k * r)} ${f(x)} ${f(y - r)}Z`;
const leafd = (x, y, s, a = 0) => {
  const pts = [[0, -s], [0.55 * s, -0.2 * s], [0.4 * s, 0.5 * s], [0, s, 1], [-0.4 * s, 0.5 * s], [-0.55 * s, -0.2 * s]];
  return pts.map(([px, py, c]) => {
    const r = (a * Math.PI) / 180;
    return [x + px * Math.cos(r) - py * Math.sin(r), y + px * Math.sin(r) + py * Math.cos(r), c];
  });
};
const boltd = (x, y, s) => poly([[0.25, -1], [-0.55, 0.12], [-0.02, 0.12], [-0.3, 1], [0.58, -0.2], [0.06, -0.2]].map(([a, b]) => [x + a * s, y + b * s]));
const diamd = (x, y, s) => poly([[x, y - s], [x + 0.72 * s, y], [x, y + s], [x - 0.72 * s, y]]);

/** Element mark (star / leaf / diamond / bolt). o: {glow, col, rot, sw} */
function mark(A, Pp, x, y, s, o = {}) {
  const el = Pp.el;
  const col = tone(o.col || Pp.accent);
  if (o.glow) A.halo(x, y, s * 2.4, col.b);
  const sw = o.sw ?? Math.max(2, s * 0.22);
  let d;
  if (el === 'star') d = star4d(x, y, s, 0.22);
  else if (el === 'vine') d = blob(leafd(x, y, s, o.rot ?? 30));
  else if (el === 'stone') d = diamd(x, y, s);
  else d = boltd(x, y, s);
  A.add(`<path d="${d}" fill="${o.glow ? col.l : col.b}" stroke="${OL}" stroke-width="${f(sw)}"/>`);
  if (el === 'stone') A.add(`<path d="M${f(x)} ${f(y - s)}L${f(x)} ${f(y + s)}M${f(x - 0.72 * s)} ${f(y)}L${f(x + 0.72 * s)} ${f(y)}" stroke="${col.s}" stroke-width="${f(sw * 0.5)}"/>`);
  if (el === 'vine') {
    const r = (((o.rot ?? 30) + 90) * Math.PI) / 180;
    A.add(`<path d="M${f(x + Math.cos(r) * s * 0.7)} ${f(y + Math.sin(r) * s * 0.7)}L${f(x - Math.cos(r) * s * 0.6)} ${f(y - Math.sin(r) * s * 0.6)}" stroke="${col.s}" stroke-width="${f(sw * 0.55)}" stroke-linecap="round"/>`);
  }
}

/** Faceted forehead gem (qpv family). */
function gem(A, Pp, x, y, s, glow = false) {
  const g = Pp.gem;
  if (glow) A.halo(x, y, s * 2.6, g.l);
  const top = [[x - s * 0.85, y - s * 0.25], [x - s * 0.45, y - s * 0.8], [x + s * 0.45, y - s * 0.8], [x + s * 0.85, y - s * 0.25], [x, y + s]];
  A.add(`<path d="${poly(top)}" fill="${g.b}" stroke="${OL}" stroke-width="${f(Math.max(2, s * 0.3))}"/>`
    + `<path d="${poly([[x - s * 0.85, y - s * 0.25], [x + s * 0.85, y - s * 0.25], [x, y + s]])}" fill="${g.s}"/>`
    + `<path d="${poly([[x - s * 0.45, y - s * 0.8], [x - s * 0.1, y - s * 0.8], [x - s * 0.35, y - s * 0.25], [x - s * 0.85, y - s * 0.25]])}" fill="${g.l}"/>`
    + `<path d="${poly(top)}" fill="none" stroke="${OL}" stroke-width="${f(Math.max(2, s * 0.3))}"/>`);
}

function sparkle(x, y, r, fill = '#fff', stroke = OL, sw = 1.6) {
  return `<path d="${star4d(x, y, r, 0.18)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

/** One eye. o: {mood, iris, side: -1|1 (which eye, for hurt shape), lid: colour (fierce eyelid), lidTilt, look} */
function eye(A, x, y, r, o = {}) {
  const mood = o.mood || 'idle';
  const w = r * (o.sq ?? 0.78);
  if (mood === 'happy') {
    A.add(`<path d="M${f(x - w * 1.05)} ${f(y + r * 0.25)}Q${f(x)} ${f(y - r * 0.95)} ${f(x + w * 1.05)} ${f(y + r * 0.25)}" fill="none" stroke="${OL}" stroke-width="${f(Math.max(3, r * 0.34))}" stroke-linecap="round"/>`);
    return;
  }
  if (mood === 'hurt') {
    const s = o.side ?? 1;
    A.add(`<path d="M${f(x - s * w)} ${f(y - r * 0.55)}L${f(x + s * w * 0.8)} ${f(y)}L${f(x - s * w)} ${f(y + r * 0.55)}" fill="none" stroke="${OL}" stroke-width="${f(Math.max(3, r * 0.32))}" stroke-linecap="round"/>`);
    return;
  }
  const [lx, ly] = o.look || [0.08, 0.04];
  const ix = x + lx * r, iy = y + ly * r;
  let s = `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(w)}" ry="${f(r)}" fill="${OL}"/>`;
  s += `<ellipse cx="${f(ix)}" cy="${f(iy + r * 0.3)}" rx="${f(w * 0.72)}" ry="${f(r * 0.55)}" fill="${o.iris || '#5a3fb0'}"/>`;
  s += `<ellipse cx="${f(ix)}" cy="${f(iy + r * 0.46)}" rx="${f(w * 0.42)}" ry="${f(r * 0.3)}" fill="${o.iris2 || '#ffffff'}" opacity=".28"/>`;
  s += `<ellipse cx="${f(ix - w * 0.3)}" cy="${f(iy - r * 0.38)}" rx="${f(w * 0.4)}" ry="${f(r * 0.36)}" fill="#fff"/>`;
  s += `<circle cx="${f(ix + w * 0.38)}" cy="${f(iy + r * 0.3)}" r="${f(r * 0.15)}" fill="#fff"/>`;
  A.add(s);
  if (o.lid) {
    // determined eyelid: slanted cut across the top (inner corner lower)
    const t = (o.lidTilt ?? 0.45) * (o.side ?? 1);
    const yA = y - r * 0.55 - t * r * 0.5, yB = y - r * 0.55 + t * r * 0.5;
    A.add(`<path d="M${f(x - w - 2)} ${f(y - r - 3)}L${f(x + w + 2)} ${f(y - r - 3)}L${f(x + w + 2)} ${f(yB)}L${f(x - w - 2)} ${f(yA)}Z" fill="${o.lid}"/>`
      + `<path d="M${f(x - w - 1.5)} ${f(yA)}L${f(x + w + 1.5)} ${f(yB)}" stroke="${OL}" stroke-width="${f(Math.max(3, r * 0.3))}" stroke-linecap="round"/>`);
  }
}
/** Pair of eyes. Second eye is the far one (slightly narrower in 3/4 view). */
function eyes(A, Pp, x1, y1, x2, y2, r, mood, o = {}) {
  eye(A, x1, y1, r, { ...o, mood, iris: o.iris || Pp.eye, side: 1 });
  eye(A, x2, y2, r * (o.far ?? 0.96), { ...o, mood, iris: o.iris || Pp.eye, side: -1, sq: (o.sq ?? 0.78) * (o.farSq ?? 0.9) });
}
function blush(A, x, y, rx = 7, ry = 4) {
  A.add(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${rx}" ry="${ry}" fill="#ff6f9f" opacity=".42"/>`);
}
/** Mouth: kind 'cat' | 'smile' | 'beak'; mood changes it. */
function mouth(A, x, y, w, mood, kind = 'cat', o = {}) {
  const sw = f(o.sw ?? Math.max(2.4, w * 0.22));
  if (mood === 'happy' || o.open) {
    A.add(`<path d="M${f(x - w)} ${f(y - w * 0.15)}Q${f(x)} ${f(y - w * 0.05)} ${f(x + w)} ${f(y - w * 0.15)}Q${f(x + w * 0.8)} ${f(y + w * 1.25)} ${f(x)} ${f(y + w * 1.2)}Q${f(x - w * 0.8)} ${f(y + w * 1.25)} ${f(x - w)} ${f(y - w * 0.15)}Z" fill="#7a2446" stroke="${OL}" stroke-width="${sw}"/>`
      + `<path d="M${f(x - w * 0.55)} ${f(y + w * 0.85)}Q${f(x)} ${f(y + w * 0.3)} ${f(x + w * 0.55)} ${f(y + w * 0.85)}Q${f(x)} ${f(y + w * 1.25)} ${f(x - w * 0.55)} ${f(y + w * 0.85)}Z" fill="#ff7a9a"/>`);
    if (o.fang) A.add(`<path d="M${f(x + w * 0.35)} ${f(y - w * 0.1)}l${f(w * 0.18)} ${f(w * 0.45)}l${f(w * 0.18)} ${f(-w * 0.47)}Z" fill="#fff" stroke="${OL}" stroke-width="1.5"/>`);
    return;
  }
  if (mood === 'hurt') {
    A.add(`<path d="M${f(x - w)} ${f(y + w * 0.3)}q${f(w / 3)} ${f(-w * 0.5)} ${f(w * 2 / 3)} 0t${f(w * 2 / 3)} 0t${f(w * 2 / 3)} 0" fill="none" stroke="${OL}" stroke-width="${sw}" stroke-linecap="round"/>`);
    return;
  }
  if (kind === 'cat') {
    A.add(`<path d="M${f(x - w)} ${f(y - w * 0.1)}Q${f(x - w * 0.5)} ${f(y + w * 0.55)} ${f(x)} ${f(y)}Q${f(x + w * 0.5)} ${f(y + w * 0.55)} ${f(x + w)} ${f(y - w * 0.1)}" fill="none" stroke="${OL}" stroke-width="${sw}" stroke-linecap="round"/>`);
  } else {
    A.add(`<path d="M${f(x - w)} ${f(y - w * 0.15)}Q${f(x)} ${f(y + w * 0.7)} ${f(x + w)} ${f(y - w * 0.15)}" fill="none" stroke="${OL}" stroke-width="${sw}" stroke-linecap="round"/>`);
  }
  if (o.fang) A.add(`<path d="M${f(x + w * 0.25)} ${f(y + w * 0.12)}l${f(w * 0.2)} ${f(w * 0.5)}l${f(w * 0.2)} ${f(-w * 0.45)}Z" fill="#fff" stroke="${OL}" stroke-width="1.5"/>`);
}
function nose(A, x, y, s, col = OL) {
  A.add(`<path d="M${f(x - s)} ${f(y - s * 0.4)}Q${f(x)} ${f(y - s * 0.75)} ${f(x + s)} ${f(y - s * 0.4)}Q${f(x + s * 0.3)} ${f(y + s * 0.6)} ${f(x)} ${f(y + s * 0.6)}Q${f(x - s * 0.3)} ${f(y + s * 0.6)} ${f(x - s)} ${f(y - s * 0.4)}Z" fill="${col}"/>`);
}
function sweat(A, x, y, s = 6) {
  A.add(`<path d="M${f(x)} ${f(y - s * 1.4)}Q${f(x + s)} ${f(y)} ${f(x)} ${f(y + s * 0.6)}Q${f(x - s)} ${f(y)} ${f(x)} ${f(y - s * 1.4)}Z" fill="#9fe3ff" stroke="${OL}" stroke-width="2"/>`);
}
function ground(A, cx, w, y = 186) {
  A.back += `<ellipse cx="${f(cx)}" cy="${f(y)}" rx="${f(w)}" ry="${f(w * 0.16 + 2)}" fill="${OL}" opacity=".16"/>`;
}
/** Short curved stroke (fur tuft, crease). */
function line(A, d, sw = 2.5, col = OL) {
  A.add(`<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"/>`);
}
/** Standard face: eyes, blush, mouth. */
function face(A, Pp, m, o) {
  const { ex1, ey, ex2, er, mx, my, mw = 5 } = o;
  eyes(A, Pp, ex1, ey, ex2, o.ey2 ?? ey, er, m, o.eye || {});
  if (o.blush !== false) {
    blush(A, ex1 + (o.bx ?? -er * 0.9), ey + er * 1.3, er * 0.65, er * 0.38);
    blush(A, ex2 + (o.bx2 ?? er * 0.9), (o.ey2 ?? ey) + er * 1.3, er * 0.6, er * 0.36);
  }
  if (o.nose) nose(A, o.nose[0], o.nose[1], o.nose[2] ?? 3.5, o.nose[3]);
  mouth(A, mx, my, mw, m, o.mouth || 'cat', { fang: o.fang, open: o.open });
  if (m === 'hurt') sweat(A, o.sx ?? ex2 + er * 2.2, o.sy ?? ey - er * 1.2, er * 0.5);
}

// ================================================================= SPECIES
// Each draw(A, st, Pp, m) draws facing right into a 200x200 box, feet on y≈185.

// ---------- numberling: crystal bunny with number-rune ears
function numberling(A, st, Pp, m) {
  const ear = (base, tipX, tipY, w, lean, inner) => {
    const [bx, by] = base;
    const pts = [[bx - w * 0.55, by], [bx - w * 0.75 + lean * 0.3, by - (by - tipY) * 0.45], [tipX - w * 0.35, tipY + w * 0.5], [tipX, tipY, 0], [tipX + w * 0.4, tipY + w * 0.55], [bx + w * 0.75 + lean * 0.3, by - (by - tipY) * 0.45], [bx + w * 0.55, by]];
    return pts;
  };
  const runes = (x, y, n, s, glow) => {
    let r = '';
    for (let i = 0; i < n; i++) r += `M${f(x - s)} ${f(y + i * s * 1.3)}h${f(s * 2)}`;
    return `<path d="${r}" stroke="${glow ? Pp.accent.l : Pp.second.s}" stroke-width="${f(s * 0.6)}" stroke-linecap="round"/>`;
  };
  if (st === 1) {
    ground(A, 100, 44);
    // tail
    A.part(Ci(58, 158, 12), Pp.white, { s: 4 });
    // ears
    const e1 = ear([86, 110], 70, 36, 22, -6), e2 = ear([116, 108], 136, 40, 22, 6);
    A.part(P(blob(e1)), Pp.main, { s: 5, inner: `<path d="${blob(ear([86, 112], 71, 46, 11, -6))}" fill="${Pp.pink.b}"/>` + runes(78, 66, 1, 3.2) });
    A.part(P(blob(e2)), Pp.main, { s: 5, inner: `<path d="${blob(ear([116, 110], 134, 50, 11, 6))}" fill="${Pp.pink.b}"/>` + runes(127, 70, 1, 3.2) });
    // feet
    A.part(E(80, 178, 15, 8), Pp.main, { s: 3 });
    A.part(E(122, 179, 15, 8), Pp.main, { s: 3 });
    // body (head+body in one round crystal critter)
    A.part(P(blob([[102, 100], [132, 108], [146, 136], [140, 166], [118, 181], [86, 181], [62, 166], [56, 136], [70, 108]])), Pp.belly, {
      s: 9, inner: `<path d="${blob([[84, 150], [102, 146], [122, 150], [120, 170], [102, 177], [84, 170]])}" fill="${Pp.white.b}" opacity=".7"/>`,
    });
    // arms
    A.part(E(76, 160, 8, 10, 20), Pp.belly, { s: 3 });
    A.part(E(128, 160, 8, 10, -20), Pp.belly, { s: 3 });
    A.part(P(blob([[97, 106], [94, 92, 1], [103, 99], [110, 88, 1], [110, 104]])), Pp.main, { s: 3, sil: false });
    gem(A, Pp, 104, 114, 7);
    face(A, Pp, m, { ex1: 88, ex2: 121, ey: 133, er: 11, mx: 105, my: 150, mw: 5 });
  } else if (st === 2) {
    ground(A, 102, 50);
    A.part(Ci(62, 146, 14), Pp.white, { s: 4, inner: `<path d="${star4d(62, 146, 6)}" fill="${Pp.accent.b}"/>` });
    const e1 = ear([88, 72], 66, 12, 26, -10), e2 = ear([118, 70], 146, 14, 26, 10);
    A.part(P(blob(e1)), Pp.main, { s: 6, inner: `<path d="${blob(ear([88, 74], 68, 24, 13, -10))}" fill="${Pp.pink.b}"/>` + runes(77, 34, 2, 3.4) });
    A.part(P(blob(e2)), Pp.main, { s: 6, inner: `<path d="${blob(ear([118, 72], 142, 26, 13, 10))}" fill="${Pp.pink.b}"/>` + runes(132, 38, 2, 3.4) });
    // legs + big feet
    A.part(P(blob([[74, 150], [90, 150], [92, 176], [70, 176]])), Pp.main, { s: 4, sil: true });
    A.part(E(78, 178, 20, 9), Pp.main, { s: 4, inner: `<path d="M68 180v-4M76 181v-4" stroke="${OL}" stroke-width="2" stroke-linecap="round"/>` });
    A.part(E(126, 178, 20, 9), Pp.main, { s: 4, inner: `<path d="M126 181v-4M134 180v-4" stroke="${OL}" stroke-width="2" stroke-linecap="round"/>` });
    // body
    A.part(P(blob([[102, 108], [128, 118], [136, 150], [124, 174], [100, 178], [78, 172], [68, 148], [76, 118]])), Pp.belly, { s: 8 });
    // chest fluff bib
    A.part(P(blob([[82, 116, 1], [92, 124], [102, 118, 1], [112, 124], [122, 116, 1], [120, 142], [102, 154], [84, 142]])), Pp.white, { s: 4 });
    // arms
    A.part(E(76, 142, 8, 14, 25), Pp.belly, { s: 3 });
    A.part(E(128, 140, 8, 14, -30), Pp.belly, { s: 3 });
    // head with cheek tufts
    A.part(P(blob([[104, 60], [128, 66], [140, 84], [152, 88, 1], [142, 96], [148, 104, 1], [134, 108], [126, 118], [104, 124], [82, 118], [74, 108], [60, 104, 1], [66, 96], [56, 88, 1], [68, 84], [80, 66]])), Pp.belly, { s: 7 });
    gem(A, Pp, 106, 74, 8.5);
    face(A, Pp, m, { ex1: 90, ex2: 122, ey: 94, er: 11, mx: 107, my: 110, mw: 5 });
    mark(A, Pp, 102, 136, 6);
  } else {
    // noble quadruped hare: ears streaming back, royal collar, crystal crown
    ground(A, 102, 64);
    const band = (d) => `<path d="${d}" stroke="${Pp.accent.l}" stroke-width="3.5" stroke-linecap="round"/>`;
    // far ear (streams back)
    A.part(P(blob(leaf([118, 50], [30, 16], [128, 34], 0.16, 0.12))), Pp.main, { s: 5, inner: `<path d="${blob(leaf([118, 44], [44, 20], [124, 38], 0.08, 0.06))}" fill="${Pp.pink.b}"/>` + band('M60 16l4 10M76 20l4 10M92 24l4 10') });
    // crystal tail
    A.part(P(poly([[56, 122], [26, 104], [40, 124], [18, 132], [44, 138], [60, 134]])), Pp.gem, { s: 4 });
    A.part(Ci(56, 126, 13), Pp.white, { s: 4 });
    // far legs
    A.part(P(blob([[118, 136], [134, 134], [132, 160], [131, 178], [121, 179], [121, 158]])), Pp.main, { s: 4 });
    A.part(E(126, 181, 11, 5), Pp.main, { s: 2 });
    // body
    A.part(P(blob([[76, 106], [108, 98], [138, 104], [154, 122], [148, 146], [128, 156], [96, 158], [66, 152], [54, 130]])), Pp.belly, { s: 8 });
    // haunch (thigh drawn with an inner contour line, not a full circle)
    A.part(P(blob([[72, 114], [96, 120], [106, 144], [96, 166], [72, 170], [54, 160], [52, 134]])), Pp.belly, { s: 8, sw: 0 });
    line(A, 'M76 116Q102 122 104 146Q104 162 92 168', 3.5);
    A.part(P(blob([[50, 170], [96, 168], [108, 176], [102, 185], [56, 185], [44, 180]])), Pp.main, { s: 4, inner: `<path d="M96 185v-6M104 184v-6" stroke="${OL}" stroke-width="2" stroke-linecap="round"/>` });
    // near front leg
    A.part(P(blob([[132, 130], [152, 128], [149, 158], [149, 178], [136, 178], [136, 156]])), Pp.main, { s: 4 });
    A.part(E(144, 181, 13, 5.5), Pp.main, { s: 2, inner: `<path d="M146 186v-5M152 185v-5" stroke="${OL}" stroke-width="2" stroke-linecap="round"/>` });
    // chest mane
    A.part(P(blob([[108, 86], [130, 90], [150, 84], [164, 92], [164, 108], [156, 120, 1], [150, 116], [146, 132, 1], [138, 124], [130, 140, 1], [124, 126], [114, 132, 1], [112, 118], [102, 118, 1], [106, 104]])), Pp.white, { s: 6 });
    line(A, 'M126 116q4 6 2 12M142 112q3 5 1 10', 2.5, Pp.white.s);
    // near ear (sweeps up and back)
    A.part(P(blob(leaf([146, 44], [180, 4], [166, 54], 0.2, 0.2))), Pp.main, { s: 5, inner: `<path d="${blob(leaf([152, 44], [176, 12], [164, 50], 0.14, 0.1))}" fill="${Pp.pink.b}"/>` + band('M166 14l7 5M161 24l8 5M157 34l8 5') });
    // head
    A.part(P(blob([[140, 34], [162, 42], [170, 60], [180, 66, 1], [172, 74], [176, 82, 1], [162, 84], [156, 92], [140, 96], [122, 92], [114, 84], [100, 82, 1], [106, 74], [98, 66, 1], [110, 60], [118, 42]])), Pp.belly, { s: 7 });
    // crystal crown
    A.part(P(poly([[126, 40], [126, 22], [134, 31], [141, 12], [148, 31], [156, 22], [156, 40], [141, 46]])), Pp.accent, { s: 4, inner: `<path d="M141 12v34" stroke="${Pp.accent.l}" stroke-width="3"/>` });
    gem(A, Pp, 141, 50, 7, true);
    face(A, Pp, m, { ex1: 128, ex2: 156, ey: 66, er: 9.5, mx: 143, my: 81, mw: 4.5, eye: { lid: Pp.belly.b, lidTilt: 0.35 } });
    mark(A, Pp, 78, 140, 9, { glow: true });
    mark(A, Pp, 141, 160, 4.5, { glow: true });
    mark(A, Pp, 104, 128, 4, { glow: true });
  }
}

// ---------- shared helpers for species
/** Spiky ring: alternating sharp tips (r2) and soft valleys (r1). */
function spikes(cx, cy, r1, r2, n, rot0 = 0, ry = 1) {
  const out = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot0 - 90 + (i * 180) / n) * Math.PI) / 180;
    const r = i % 2 ? r1 : r2;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a) * ry, i % 2 ? 0 : 1]);
  }
  return out;
}
/** Pie sector path (degrees, 0 = up, clockwise). */
function sector(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${f(cx)} ${f(cy)}L${f(x0)} ${f(y0)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}Z`;
}
function spokes(cx, cy, r, n, a0 = 0) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = ((a0 + (i * 360) / n) * Math.PI) / 180;
    d += `M${f(cx)} ${f(cy)}L${f(cx + r * Math.sin(a))} ${f(cy - r * Math.cos(a))}`;
  }
  return d;
}
/** Wedges alternating colours, clipped inside a part via `inner`. */
function wedges(cx, cy, r, n, col, a0 = 0) {
  let d = '';
  for (let i = 0; i < n; i += 2) d += sector(cx, cy, r, a0 + (i * 360) / n, a0 + ((i + 1) * 360) / n);
  return `<path d="${d}" fill="${col}"/><path d="${spokes(cx, cy, r, n, a0)}" stroke="${OL}" stroke-width="3"/>`;
}
function bead(x, y, r, T, glow) {
  return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 1.2)}" ry="${f(r)}" fill="${glow ? T.l : T.b}" stroke="${OL}" stroke-width="2.2"/>`
    + `<ellipse cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.4)}" rx="${f(r * 0.45)}" ry="${f(r * 0.28)}" fill="#fff" opacity=".8"/>`;
}
function beads(A, x1, y1, x2, y2, n, T, r = 5, glow = false) {
  A.add(`<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}" stroke="${OL}" stroke-width="2.6" stroke-linecap="round"/>`);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    A.add(bead(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, r, T, glow));
  }
}
function shrink(pts, k, dx = 0, dy = 0) {
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  return pts.map((p) => [cx + (p[0] - cx) * k + dx, cy + (p[1] - cy) * k + dy, p[2]]);
}
/** Crown of points (royal stage-3 mark). */
function crown(A, Pp, x, y, w, h, n = 3, col) {
  const pts = [[x + w / 2, y, 1], [x - w / 2, y, 1]];
  for (let i = 0; i < n; i++) {
    const tx = x - w / 2 + (w * i) / (n - 1);
    const mid = Math.abs(i - (n - 1) / 2) < 0.6;
    pts.push([tx, y - h * (mid ? 1 : 0.78), 1]);
    if (i < n - 1) pts.push([tx + w / (2 * (n - 1)), y - h * 0.42, 1]);
  }
  A.part(P(poly(pts)), col || Pp.accent, { s: 4, inner: `<path d="M${f(x - w / 2)} ${f(y - h * 0.2)}H${f(x + w / 2)}" stroke="${OL}" stroke-width="2"/>` });
  for (let i = 0; i < n; i++) {
    const tx = x - w / 2 + (w * i) / (n - 1);
    const mid = Math.abs(i - (n - 1) / 2) < 0.6;
    A.add(`<circle cx="${f(tx)}" cy="${f(y - h * (mid ? 1 : 0.78))}" r="${f(w * 0.06)}" fill="${Pp.gem.l}" stroke="${OL}" stroke-width="1.6"/>`);
  }
}
function teeth(A, x, y, w, h) {
  A.add(`<rect x="${f(x - w / 2)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="2" fill="#fff" stroke="${OL}" stroke-width="2.4"/><path d="M${f(x)} ${f(y)}v${f(h)}" stroke="${OL}" stroke-width="1.8"/>`);
}
function eyesOnly(A, Pp, m, x1, y1, x2, y2, r, o = {}) {
  eyes(A, Pp, x1, y1, x2, y2, r, m, o);
  if (o.blush !== false) { blush(A, x1 - r * 0.9, y1 + r * 1.3, r * 0.6, r * 0.36); blush(A, x2 + r * 0.9, y2 + r * 1.3, r * 0.55, r * 0.34); }
  if (m === 'hurt') sweat(A, x2 + r * 2.1, y2 - r * 1.1, r * 0.5);
}

// ---------- counter: beaver with an abacus-bead tail
function counter(A, st, Pp, m) {
  const beaverFace = (x, y, s, lid) => {
    A.part(E(x + 4 * s, y + 18 * s, 18 * s, 12 * s), Pp.belly, { s: 4 });
    eyesOnly(A, Pp, m, x - 13 * s, y - 2 * s, x + 20 * s, y - 2 * s, 10 * s, lid ? { lid: Pp.second.b } : {});
    if (m === 'happy') mouth(A, x + 4 * s, y + 20 * s, 6 * s, m);
    else if (m === 'hurt') mouth(A, x + 4 * s, y + 25 * s, 5 * s, m);
    nose(A, x + 4 * s, y + 11 * s, 5.5 * s);
    if (m !== 'hurt') teeth(A, x + 4 * s, y + 20 * s, 10 * s, 9 * s);
  };
  if (st === 1) {
    ground(A, 96, 50);
    A.part(P(blob([[74, 166], [46, 152], [22, 156], [16, 170], [30, 182], [72, 183]])), Pp.dark, { s: 5 });
    beads(A, 22, 168, 70, 172, 3, Pp.main, 5);
    A.part(Ci(78, 114, 10), Pp.second, { s: 3, inner: Ci(79, 115, 5).replace('/>', ` fill="${Pp.pink.b}"/>`) });
    A.part(Ci(132, 112, 10), Pp.second, { s: 3, inner: Ci(131, 113, 5).replace('/>', ` fill="${Pp.pink.b}"/>`) });
    A.part(E(84, 180, 13, 6), Pp.second, { s: 3 });
    A.part(E(124, 181, 13, 6), Pp.second, { s: 3 });
    A.part(P(blob([[104, 102], [134, 110], [148, 140], [142, 168], [120, 182], [88, 182], [66, 168], [60, 140], [74, 110]])), Pp.second, {
      s: 9, inner: E(104, 170, 28, 16).replace('/>', ` fill="${Pp.belly.b}"/>`),
    });
    gem(A, Pp, 106, 114, 6.5);
    beaverFace(106, 132, 1);
    A.add(bead(106, 170, 8, Pp.main));
    A.part(E(88, 166, 8, 9, 30), Pp.second, { s: 3 });
    A.part(E(124, 166, 8, 9, -30), Pp.second, { s: 3 });
  } else if (st === 2) {
    ground(A, 96, 58);
    const tail = [[80, 152], [46, 116], [22, 116], [12, 140], [26, 170], [62, 184], [84, 176]];
    A.part(P(blob(tail)), Pp.dark, { s: 6, inner: `<path d="${blob(shrink(tail, 0.78, 2, 2))}" fill="none" stroke="${Pp.main.s}" stroke-width="3"/>` });
    beads(A, 28, 132, 68, 150, 4, Pp.main, 5);
    beads(A, 30, 154, 66, 170, 3, Pp.main, 5);
    A.part(E(82, 180, 17, 7), Pp.second, { s: 3 });
    A.part(E(124, 181, 17, 7), Pp.second, { s: 3 });
    A.part(P(blob([[102, 96], [128, 104], [142, 136], [138, 166], [118, 180], [86, 180], [66, 164], [64, 134], [78, 104]])), Pp.second, {
      s: 9, inner: E(104, 152, 26, 26).replace('/>', ` fill="${Pp.belly.b}"/>`),
    });
    mark(A, Pp, 104, 162, 6);
    A.part(Ci(82, 56, 10), Pp.second, { s: 3, inner: Ci(83, 57, 5).replace('/>', ` fill="${Pp.pink.b}"/>`) });
    A.part(Ci(134, 54, 10), Pp.second, { s: 3, inner: Ci(133, 55, 5).replace('/>', ` fill="${Pp.pink.b}"/>`) });
    A.part(P(blob([[108, 46], [132, 52], [144, 72], [152, 80, 1], [142, 86], [136, 100], [108, 108], [80, 100], [74, 86], [64, 80, 1], [72, 72], [84, 52]])), Pp.second, { s: 7 });
    gem(A, Pp, 110, 58, 7);
    beaverFace(110, 76, 1);
    beads(A, 80, 136, 132, 132, 3, Pp.main, 5.5);
    A.part(E(76, 128, 8, 13, 30), Pp.second, { s: 3 });
    A.part(E(136, 124, 8, 13, -30), Pp.second, { s: 3 });
    A.part(Ci(82, 136, 6.5), Pp.second, { s: 2 });
    A.part(Ci(130, 132, 6.5), Pp.second, { s: 2 });
  } else {
    ground(A, 100, 70);
    const tail = [[82, 148], [52, 92], [26, 84], [8, 102], [8, 146], [30, 178], [70, 186], [90, 176]];
    A.part(P(blob(tail)), Pp.dark, { s: 7, inner: `<path d="${blob(shrink(tail, 0.8, 2, 2))}" fill="none" stroke="${Pp.main.b}" stroke-width="4"/>` });
    A.halo(40, 136, 44, Pp.accent.b, false);
    beads(A, 20, 110, 58, 120, 3, Pp.main, 5.5, true);
    beads(A, 16, 134, 66, 146, 4, Pp.main, 5.5, true);
    beads(A, 24, 158, 70, 170, 3, Pp.main, 5.5, true);
    A.part(E(70, 124, 10, 19, 20), Pp.second, { s: 4 });
    A.part(E(82, 181, 21, 8), Pp.second, { s: 4 });
    A.part(E(134, 181, 21, 8), Pp.second, { s: 4, inner: `<path d="M138 186v-6M147 185v-6" stroke="${OL}" stroke-width="2" stroke-linecap="round"/>` });
    A.part(P(blob([[106, 86], [140, 96], [158, 130], [154, 164], [130, 182], [86, 182], [62, 166], [58, 128], [74, 96]])), Pp.second, {
      s: 10, inner: E(108, 146, 34, 32).replace('/>', ` fill="${Pp.belly.b}"/>`),
    });
    mark(A, Pp, 108, 150, 10, { glow: true });
    A.part(Ci(80, 38, 11), Pp.second, { s: 3, inner: Ci(81, 39, 5.5).replace('/>', ` fill="${Pp.pink.b}"/>`) });
    A.part(Ci(140, 36, 11), Pp.second, { s: 3, inner: Ci(139, 37, 5.5).replace('/>', ` fill="${Pp.pink.b}"/>`) });
    A.part(P(blob([[110, 28], [138, 34], [150, 54], [162, 60, 1], [152, 68], [158, 76, 1], [146, 80], [140, 90], [110, 98], [80, 90], [74, 80], [62, 76, 1], [68, 68], [58, 60, 1], [70, 54], [82, 34]])), Pp.second, { s: 8 });
    crown(A, Pp, 110, 34, 38, 26);
    gem(A, Pp, 110, 44, 7, true);
    beaverFace(112, 60, 1, true);
    // abacus scepter
    A.add(`<path d="M160 84L150 170" stroke="${OL}" stroke-width="9" stroke-linecap="round"/><path d="M160 84L150 170" stroke="${Pp.main.b}" stroke-width="4" stroke-linecap="round"/>`);
    A.add(bead(157, 108, 6, Pp.accent, true) + bead(155, 124, 6, Pp.accent, true));
    mark(A, Pp, 161, 74, 11, { glow: true });
    A.part(E(146, 132, 9, 17, -20), Pp.second, { s: 4 });
    A.part(Ci(153, 146, 8), Pp.second, { s: 3 });
  }
}

// ---------- fractling: hedgehog whose spines form pie segments
function fractling(A, st, Pp, m) {
  if (st === 1) {
    ground(A, 104, 46);
    A.part(P(blob(spikes(90, 132, 40, 54, 10, -8))), Pp.main, { s: 7, inner: wedges(90, 132, 70, 4, Pp.second.b, 20) });
    A.part(E(96, 182, 12, 6), Pp.main, { s: 3 });
    A.part(E(130, 182, 12, 6), Pp.main, { s: 3 });
    A.part(P(blob([[112, 116], [138, 122], [148, 136], [164, 146], [162, 156], [146, 162], [138, 176], [112, 183], [86, 176], [76, 152], [86, 124]])), Pp.belly, { s: 8 });
    A.add(`<circle cx="161" cy="150" r="4.5" fill="${OL}"/>`);
    gem(A, Pp, 118, 124, 6);
    eyesOnly(A, Pp, m, 108, 144, 136, 142, 9.5);
    mouth(A, 147, 162, 4.5, m, 'smile');
    A.part(E(100, 168, 6, 8, 20), Pp.belly, { s: 2 });
  } else if (st === 2) {
    ground(A, 108, 54);
    A.part(P(blob(spikes(94, 112, 50, 68, 12, -6))), Pp.main, { s: 8, inner: wedges(94, 112, 90, 6, Pp.second.b, 15) });
    A.part(E(96, 180, 15, 7), Pp.main, { s: 3 });
    A.part(E(132, 180, 15, 7), Pp.main, { s: 3 });
    A.part(P(blob([[108, 118], [132, 124], [142, 152], [132, 176], [100, 178], [84, 160], [86, 130]])), Pp.belly, { s: 8 });
    mark(A, Pp, 112, 156, 6);
    A.part(E(88, 148, 7, 12, 20), Pp.belly, { s: 3 });
    A.part(E(138, 146, 7, 12, -30), Pp.belly, { s: 3 });
    A.part(P(blob([[118, 66], [140, 72], [150, 88], [168, 96], [170, 106], [152, 114], [142, 124], [118, 128], [96, 120], [88, 98], [96, 76]])), Pp.belly, { s: 8 });
    A.add(`<circle cx="168" cy="100" r="5" fill="${OL}"/>`);
    gem(A, Pp, 122, 78, 6.5);
    eyesOnly(A, Pp, m, 112, 96, 140, 94, 10);
    mouth(A, 153, 113, 4.5, m, 'smile');
  } else {
    ground(A, 108, 62);
    A.halo(96, 92, 96, Pp.accent.b);
    A.part(P(blob(spikes(96, 92, 62, 88, 16, 0))), Pp.main, { s: 9, inner: wedges(96, 92, 110, 8, Pp.second.b, 0) });
    for (let i = 0; i < 8; i++) {
      const a = ((i * 45 + 22.5) * Math.PI) / 180;
      A.add(sparkle(96 + 76 * Math.sin(a), 92 - 76 * Math.cos(a), 5, Pp.accent.l, OL, 1.6));
    }
    A.part(E(90, 181, 18, 7), Pp.main, { s: 3 });
    A.part(E(134, 181, 18, 7), Pp.main, { s: 3, inner: `<path d="M138 186v-5M146 185v-5" stroke="${OL}" stroke-width="2" stroke-linecap="round"/>` });
    A.part(P(blob([[104, 108], [134, 114], [150, 146], [142, 176], [104, 180], [76, 170], [72, 140], [82, 116]])), Pp.belly, { s: 9 });
    mark(A, Pp, 110, 150, 9, { glow: true });
    A.part(E(78, 140, 8, 15, 25), Pp.belly, { s: 3 });
    A.halo(170, 136, 22, Pp.accent.b);
    A.part(Ci(170, 136, 13), Pp.main, { s: 3, inner: wedges(170, 136, 14, 4, Pp.second.b, 45) });
    A.part(P(blob([[134, 128], [148, 124], [160, 128], [162, 138], [148, 140], [138, 146]])), Pp.belly, { s: 3 });
    A.part(P(blob([[120, 50], [146, 58], [156, 78], [178, 88], [180, 100], [158, 108], [148, 118], [120, 122], [94, 114], [86, 88], [96, 62]])), Pp.belly, { s: 8 });
    A.add(`<circle cx="177" cy="93" r="5.5" fill="${OL}"/>`);
    crown(A, Pp, 118, 56, 34, 24);
    gem(A, Pp, 122, 66, 7, true);
    eyesOnly(A, Pp, m, 114, 88, 144, 86, 10, { lid: Pp.belly.b });
    mouth(A, 160, 106, 4.5, m, 'smile');
    A.halo(176, 110, 16, Pp.accent.b);
    A.part(P(sector(178, 106, 14, 20, 110)), Pp.main, { s: 3, inner: `<path d="${spokes(178, 106, 14, 4, 20)}" stroke="${OL}" stroke-width="1.5"/>` });
  }
}

// ---------- percenta: owl whose face disc is a % sign (eyes = the rings, beak = the slash)
function percenta(A, st, Pp, m) {
  const pface = (cx, cy, s, lid, glow) => {
    const d = blob([[cx, cy - 16 * s], [cx + 12 * s, cy - 24 * s], [cx + 30 * s, cy - 22 * s], [cx + 40 * s, cy - 6 * s], [cx + 36 * s, cy + 12 * s], [cx + 20 * s, cy + 22 * s], [cx, cy + 22 * s], [cx - 20 * s, cy + 22 * s], [cx - 36 * s, cy + 12 * s], [cx - 40 * s, cy - 6 * s], [cx - 30 * s, cy - 22 * s], [cx - 12 * s, cy - 24 * s]]);
    A.part(P(d), Pp.belly, { s: 4 * s });
    const e1 = [cx - 17 * s, cy - 6 * s], e2 = [cx + 17 * s, cy + 1 * s];
    for (const [x, y] of [e1, e2]) A.add(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(14 * s)}" fill="${Pp.white.b}" stroke="${glow ? Pp.accent.b : Pp.main.b}" stroke-width="${f(5 * s)}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(16.5 * s)}" fill="none" stroke="${OL}" stroke-width="2"/>`);
    eyes(A, Pp, e1[0], e1[1], e2[0], e2[1], 9.5 * s, m, lid ? { lid: Pp.white.b, far: 1, farSq: 1 } : { far: 1, farSq: 1 });
    // slash beak
    const bx = cx, by = cy + 2 * s;
    A.add(`<path d="${poly([[bx + 9 * s, by - 20 * s], [bx + 4 * s, by + 2 * s], [bx - 9 * s, by + 20 * s], [bx - 4 * s, by - 2 * s]])}" fill="${Pp.main.b}" stroke="${OL}" stroke-width="2.6"/><path d="M${f(bx + 8 * s)} ${f(by - 18 * s)}L${f(bx - 3 * s)} ${f(by - 1 * s)}" stroke="${Pp.main.l}" stroke-width="2"/>`);
    if (m === 'hurt') sweat(A, cx + 40 * s, cy - 22 * s, 5);
    if (m === 'happy') mouth(A, cx + 10 * s, cy + 14 * s, 4 * s, 'happy');
  };
  const talons = (x, y, s = 1) => A.part(P(blob([[x - 10 * s, y - 2], [x + 10 * s, y - 2], [x + 11 * s, y + 3, 1], [x + 5 * s, y + 1], [x + 3 * s, y + 5, 1], [x - 1 * s, y + 1], [x - 4 * s, y + 5, 1], [x - 7 * s, y + 1], [x - 11 * s, y + 3, 1]])), Pp.main, { s: 2 });
  const chevrons = (x, y, n, w, col) => {
    let d = '';
    for (let i = 0; i < n; i++) d += `M${f(x - w + (i % 2) * w)} ${f(y + i * 9 - (i % 2) * 4)}l${f(w * 0.5)} 4l${f(w * 0.5)} -4`;
    return `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>`;
  };
  if (st === 1) {
    ground(A, 100, 44);
    A.part(P(blob(leaf([74, 112], [62, 86], [90, 104], 0.3))), Pp.second, { s: 3 });
    A.part(P(blob(leaf([114, 104], [140, 84], [130, 112], 0.3))), Pp.second, { s: 3 });
    A.part(P(blob([[102, 98], [136, 106], [150, 138], [142, 170], [116, 183], [88, 183], [62, 170], [54, 138], [68, 106]])), Pp.second, {
      s: 9, inner: E(102, 170, 26, 16).replace('/>', ` fill="${Pp.belly.b}"/>`) + chevrons(96, 164, 2, 12, Pp.second.b),
    });
    A.part(E(58, 146, 10, 18, 15), Pp.second, { s: 3 });
    A.part(E(146, 146, 10, 18, -15), Pp.second, { s: 3 });
    talons(88, 182, 0.9); talons(118, 182, 0.9);
    gem(A, Pp, 102, 108, 5.5);
    pface(102, 138, 1);
  } else if (st === 2) {
    ground(A, 100, 50);
    A.part(P(blob(leaf([72, 82], [52, 40], [94, 70], 0.28))), Pp.second, { s: 4, inner: `<path d="${blob(leaf([74, 78], [58, 50], [86, 72], 0.2))}" fill="${Pp.main.b}"/>` });
    A.part(P(blob(leaf([110, 70], [152, 40], [132, 82], 0.28))), Pp.second, { s: 4, inner: `<path d="${blob(leaf([116, 72], [146, 50], [130, 78], 0.2))}" fill="${Pp.main.b}"/>` });
    A.part(P(blob([[102, 64], [138, 76], [152, 116], [146, 156], [124, 180], [80, 180], [58, 156], [52, 116], [66, 76]])), Pp.second, {
      s: 10, inner: E(102, 150, 30, 26).replace('/>', ` fill="${Pp.belly.b}"/>`) + chevrons(96, 138, 3, 12, Pp.second.b),
    });
    const wingL = [[58, 100], [76, 112], [78, 148], [68, 170, 1], [62, 160], [56, 170, 1], [50, 158], [42, 162, 1], [44, 128]];
    const sc = (k) => `<path d="${[[44, 128], [50, 136], [56, 128], [62, 136], [68, 128], [76, 134]].map(([x, y], i) => `${i ? 'L' : 'M'}${k ? 204 - x : x} ${y}`).join('')}" fill="none" stroke="${Pp.second.s}" stroke-width="2.5"/>`;
    A.part(P(blob(wingL)), Pp.second, { s: 5, inner: sc(0) });
    A.part(P(blob(wingL.map(([x, y, c]) => [204 - x, y, c]))), Pp.second, { s: 5, inner: sc(1) });
    talons(86, 181); talons(118, 181);
    gem(A, Pp, 102, 76, 6.5);
    pface(102, 104, 1.08);
    mark(A, Pp, 102, 166, 5);
  } else {
    ground(A, 100, 62);
    const wing = [[72, 84], [44, 60], [16, 64], [4, 90], [10, 118], [6, 132, 1], [20, 134], [16, 150, 1], [32, 150], [30, 166, 1], [46, 160], [52, 174, 1], [64, 160], [78, 148]];
    const stars = (x0) => [[30, 96], [44, 116], [26, 124], [52, 92]].map(([x, y], i) => sparkle(x0 < 100 ? x : 202 - x, y, i ? 3.5 : 5.5, Pp.accent.l, OL, 1.2)).join('');
    const cov = [[74, 80], [44, 56], [14, 60], [6, 84], [18, 98, 1], [26, 90], [34, 106, 1], [44, 96], [54, 112, 1], [62, 100], [74, 116, 1], [84, 100]];
    const cv = (k) => `<path d="${blob(k ? cov.map(([x, y, c]) => [202 - x, y, c]) : cov)}" fill="${Pp.second.l}" stroke="${Pp.second.s}" stroke-width="2.5"/>`;
    const quills = (k) => `<path d="${[[16, 118, 30, 130], [26, 136, 38, 142], [40, 150, 48, 152], [56, 158, 60, 160]].map(([a, b, c, d]) => k ? `M${202 - a} ${b}L${202 - c} ${d}` : `M${a} ${b}L${c} ${d}`).join('')}" stroke="${Pp.second.s}" stroke-width="2.5" stroke-linecap="round"/>`;
    A.part(P(blob(wing)), Pp.second, { s: 8, inner: cv(0) + quills(0) + stars(0) });
    A.part(P(blob(wing.map(([x, y, c]) => [202 - x, y, c]))), Pp.second, { s: 8, inner: cv(1) + quills(1) + stars(200) });
    A.part(P(blob(leaf([74, 70], [48, 20], [94, 58], 0.3))), Pp.second, { s: 5, inner: `<path d="${blob(leaf([76, 66], [54, 30], [88, 60], 0.2))}" fill="${Pp.main.b}"/>` });
    A.part(P(blob(leaf([110, 58], [156, 20], [130, 70], 0.3))), Pp.second, { s: 5, inner: `<path d="${blob(leaf([116, 60], [150, 30], [128, 66], 0.2))}" fill="${Pp.main.b}"/>` });
    A.part(P(blob([[102, 54], [138, 66], [154, 106], [150, 150], [126, 182], [78, 182], [54, 150], [50, 106], [66, 66]])), Pp.second, {
      s: 11, inner: E(102, 150, 34, 32).replace('/>', ` fill="${Pp.belly.b}"/>`) + chevrons(96, 132, 4, 13, Pp.second.b),
    });
    talons(84, 182, 1.1); talons(120, 182, 1.1);
    crown(A, Pp, 102, 60, 32, 24);
    gem(A, Pp, 102, 68, 6.5, true);
    pface(102, 98, 1.15, true, true);
    mark(A, Pp, 102, 168, 7, { glow: true });
  }
}

// ---------- fox family helpers (ops)
const plusd = (x, y, s) => { const a = s * 0.36, b = s; return poly([[x - a, y - b], [x + a, y - b], [x + a, y - a], [x + b, y - a], [x + b, y + a], [x + a, y + a], [x + a, y + b], [x - a, y + b], [x - a, y + a], [x - b, y + a], [x - b, y - a], [x - a, y - a]]); };
const timesd = (x, y, s) => plusd(0, 0, s).replace(/(-?[\d.]+) (-?[\d.]+)/g, (m0, a, b) => { const c = Math.SQRT1_2; return `${f(x + (a * c - b * c))} ${f(y + (a * c + b * c))}`; });
/** Fox head centred at (X,Y), scale s, facing right in 3/4. o: {col, inner (ear), lid, ear: 'tall'|'wide', forehead: fn} */
function foxHead(A, Pp, m, X, Y, s, o = {}) {
  const T = (pts) => pts.map(([x, y, c]) => [X + x * s, Y + y * s, c]);
  const col = o.col || Pp.main, earIn = o.earIn || Pp.second;
  const tall = o.ear === 'tall';
  const e1 = T(leaf([-32, -14], tall ? [-50, -74] : [-48, -62], [-8, -26], 0.3)), e2 = T(leaf([6, -26], tall ? [40, -76] : [38, -64], [30, -10], 0.3));
  const e1i = T(leaf([-28, -16], tall ? [-46, -64] : [-44, -54], [-12, -24], 0.2)), e2i = T(leaf([10, -24], tall ? [36, -66] : [34, -56], [26, -12], 0.2));
  A.part(P(blob(e1)), col, { s: 4, inner: `<path d="${blob(e1i)}" fill="${earIn.b}"/>` });
  A.part(P(blob(e2)), col, { s: 4, inner: `<path d="${blob(e2i)}" fill="${earIn.b}"/>` });
  A.part(P(blob(T([[-2, -28], [22, -24], [36, -8], [48, 10, 1], [30, 16], [16, 28], [-2, 32], [-20, 28], [-34, 16], [-52, 10, 1], [-40, -8], [-26, -24]]))), col, {
    s: 7 * s, inner: `<path d="${blob(T([[-2, 6], [14, 2], [44, 11], [22, 26], [-2, 33], [-26, 26], [-48, 11], [-18, 2]]))}" fill="${Pp.belly.b}"/>`,
  });
  if (o.forehead) o.forehead(X, Y - 16 * s, s);
  eyesOnly(A, Pp, m, X - 16 * s, Y + 1 * s, X + 14 * s, Y + 1 * s, 9.5 * s, o.lid ? { lid: col.b } : {});
  nose(A, X, Y + 13 * s, 3.8 * s);
  mouth(A, X, Y + 19 * s, 4 * s, m, 'cat', { fang: o.fang });
}
/** Bushy tail along a quadratic curve base -> ctrl -> tip, max width w. Returns {d, tipD, at(t)}. */
function bushy(base, ctrl, tip, w, tipStart = 0.62) {
  const B = (t) => [(1 - t) ** 2 * base[0] + 2 * (1 - t) * t * ctrl[0] + t * t * tip[0], (1 - t) ** 2 * base[1] + 2 * (1 - t) * t * ctrl[1] + t * t * tip[1]];
  const N = (t) => {
    const dx = 2 * (1 - t) * (ctrl[0] - base[0]) + 2 * t * (tip[0] - ctrl[0]), dy = 2 * (1 - t) * (ctrl[1] - base[1]) + 2 * t * (tip[1] - ctrl[1]);
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  const wid = (t) => w * Math.pow(Math.sin(Math.PI * (0.2 + 0.8 * t)), 0.75);
  const side = (t, sg, k = 1) => { const p = B(t), n = N(t), ww = wid(t) * k; return [p[0] + n[0] * ww * sg, p[1] + n[1] * ww * sg]; };
  const ts = [0, 0.22, 0.45, 0.66, 0.84];
  const pts = ts.map((t) => side(t, 1)).concat([[tip[0], tip[1], 1]], ts.slice().reverse().map((t) => side(t, -1)));
  const tp = [side(tipStart, 1, 1.6), side(0.84, 1, 1.6), [tip[0], tip[1], 1], side(0.84, -1, 1.6), side(tipStart, -1, 1.6), [...side(tipStart + 0.06, -1, 0.35), 1], [...B(tipStart - 0.02), 1], [...side(tipStart + 0.06, 1, 0.35), 1]];
  return { d: blob(pts), tipD: blob(tp), at: B, side };
}
function foxTail(A, base, ctrl, tip, w, col, tipCol, o = {}) {
  const t = bushy(base, ctrl, tip, w);
  A.part(P(t.d), col, { s: o.s ?? 6, inner: tipCol ? `<path d="${t.tipD}" fill="${tipCol.b}"/>` : '' });
}

// ---------- addsub: nimble fox with a plus-shaped tail tip
function addsub(A, st, Pp, m) {
  const plusTip = (x, y, s, glow) => {
    if (glow) A.halo(x, y, s * 2.6, Pp.accent.b);
    A.part(P(plusd(x, y, s)), glow ? Pp.accent : Pp.belly, { s: 3, sw: 3 });
  };
  const sock = Pp.second;
  if (st === 1) {
    ground(A, 100, 44);
    foxTail(A, [86, 166], [30, 170], [44, 104], 17, Pp.main, Pp.belly);
    plusTip(44, 104, 12);
    A.part(P(blob([[100, 132], [122, 138], [130, 162], [126, 182], [78, 182], [72, 162], [80, 138]])), Pp.main, { s: 7, inner: `<path d="${blob([[100, 140], [114, 144], [112, 168], [100, 176], [88, 168], [86, 144]])}" fill="${Pp.belly.b}"/>` });
    A.part(E(90, 179, 9, 6), sock, { s: 2 });
    A.part(E(114, 179, 9, 6), sock, { s: 2 });
    foxHead(A, Pp, m, 106, 112, 0.95);
  } else if (st === 2) {
    ground(A, 104, 58);
    foxTail(A, [74, 128], [14, 128], [30, 54], 19, Pp.main, Pp.belly);
    plusTip(30, 54, 12);
    A.part(P(blob([[74, 146], [86, 146], [84, 178], [74, 180]])), Pp.main, { s: 3 });
    A.part(P(blob([[124, 146], [136, 146], [136, 178], [126, 180]])), Pp.main, { s: 3 });
    A.part(E(79, 181, 8, 4.5), sock, { s: 2 }); A.part(E(131, 181, 8, 4.5), sock, { s: 2 });
    A.part(P(blob([[70, 124], [106, 118], [136, 124], [150, 140], [140, 158], [104, 160], [72, 158], [58, 142]])), Pp.main, { s: 8, inner: E(106, 160, 30, 8).replace('/>', ` fill="${Pp.belly.b}"/>`) });
    A.part(P(blob([[70, 130], [92, 134], [100, 152], [92, 166], [72, 164], [62, 146]])), Pp.main, { s: 6, sw: 0 });
    line(A, 'M76 132Q98 136 98 154Q96 164 90 168', 3.2);
    A.part(P(blob([[80, 156], [96, 158], [92, 178], [82, 180]])), Pp.main, { s: 3 });
    A.part(P(blob([[134, 142], [150, 140], [148, 178], [136, 180]])), Pp.main, { s: 3 });
    A.part(E(88, 181, 9, 5), sock, { s: 2 }); A.part(E(143, 181, 9, 5), sock, { s: 2 });
    A.part(P(blob([[126, 108], [150, 104], [162, 120], [152, 140, 1], [146, 130], [140, 142, 1], [132, 128]])), Pp.belly, { s: 4 });
    mark(A, Pp, 90, 148, 5);
    foxHead(A, Pp, m, 148, 88, 0.86);
  } else {
    ground(A, 104, 68);
    foxTail(A, [70, 122], [6, 118], [36, 28], 22, Pp.main, Pp.belly, { s: 8 });
    plusTip(34, 28, 14, true);
    A.part(P(blob([[70, 146], [84, 146], [82, 180], [70, 182]])), Pp.main, { s: 3 });
    A.part(P(blob([[128, 146], [142, 146], [142, 180], [130, 182]])), Pp.main, { s: 3 });
    A.part(E(76, 183, 9, 4.5), sock, { s: 2 }); A.part(E(136, 183, 9, 4.5), sock, { s: 2 });
    A.part(P(blob([[64, 116], [104, 108], [140, 114], [158, 132], [148, 154], [104, 158], [66, 156], [50, 138]])), Pp.main, { s: 9, inner: E(106, 158, 34, 9).replace('/>', ` fill="${Pp.belly.b}"/>`) });
    A.part(P(blob([[64, 124], [90, 128], [100, 150], [92, 166], [68, 166], [56, 146]])), Pp.main, { s: 7, sw: 0 });
    line(A, 'M72 126Q98 132 98 152Q96 164 90 168', 3.4);
    A.part(P(blob([[76, 156], [96, 158], [92, 180], [80, 182]])), Pp.main, { s: 3 });
    A.part(P(blob([[138, 138], [156, 136], [154, 180], [140, 182]])), Pp.main, { s: 3 });
    A.part(E(86, 183, 10, 5), sock, { s: 2 }); A.part(E(148, 183, 10, 5), sock, { s: 2 });
    A.part(P(blob([[120, 94, 1], [132, 100], [140, 90, 1], [150, 100], [162, 92, 1], [170, 108], [160, 128, 1], [154, 120], [150, 140, 1], [142, 126], [134, 144, 1], [130, 124], [118, 128, 1], [122, 110]])), Pp.belly, { s: 5 });
    mark(A, Pp, 82, 146, 8, { glow: true });
    mark(A, Pp, 146, 160, 4, { glow: true });
    foxHead(A, Pp, m, 152, 80, 0.96, {
      lid: true, fang: true, ear: 'tall',
      forehead: (x, y, s) => { A.add(`<path d="M${f(x - 20 * s)} ${f(y - 4 * s)}Q${f(x)} ${f(y - 12 * s)} ${f(x + 20 * s)} ${f(y - 4 * s)}" fill="none" stroke="${OL}" stroke-width="7"/><path d="M${f(x - 20 * s)} ${f(y - 4 * s)}Q${f(x)} ${f(y - 12 * s)} ${f(x + 20 * s)} ${f(y - 4 * s)}" fill="none" stroke="${Pp.accent.b}" stroke-width="3.5"/>`); mark(A, Pp, x, y - 8 * s, 6, { glow: true }); },
    });
  }
}

// ---------- multiplier: fox whose tails multiply (2 -> 4 -> 8)
function multiplier(A, st, Pp, m) {
  const body = Pp.second, tipC = Pp.main;
  const xMark = (x, y, s, glow) => {
    if (glow) A.halo(x, y, s * 2.6, Pp.accent.b);
    A.add(`<path d="${timesd(x, y, s)}" fill="${glow ? Pp.accent.l : Pp.main.b}" stroke="${OL}" stroke-width="2"/>`);
  };
  const fan = (cx, cy, n, len, w, a0, a1) => {
    const t = bushy([0, 0], [len * 0.5, len * 0.18], [len, 0], w);
    const ref = A.def(P(t.d));
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / Math.max(1, n - 1);
      A.part(ref, body, { s: 5, tf: `translate(${cx} ${cy}) rotate(${f(a)})`, inner: `<path d="${i ? '' : t.tipD}" fill="${tipC.b}"${i ? ` class="t${ref.slice(1)}"` : ` id="t${ref.slice(1)}"`}/>`.replace(/<path d="" fill="[^"]*" class="([^"]*)"\/>/, (m0, c) => `<use href="#${c}"/>`) });
    }
  };
  if (st === 1) {
    ground(A, 100, 44);
    fan(86, 166, 2, 80, 18, -162, -118);
    A.part(P(blob([[100, 132], [122, 138], [130, 162], [126, 182], [78, 182], [72, 162], [80, 138]])), body, { s: 7, inner: `<path d="${blob([[100, 140], [114, 144], [112, 168], [100, 176], [88, 168], [86, 144]])}" fill="${Pp.belly.b}"/>` });
    A.part(E(90, 179, 9, 6), body, { s: 2 });
    A.part(E(114, 179, 9, 6), body, { s: 2 });
    foxHead(A, Pp, m, 106, 112, 0.95, { col: body, earIn: Pp.main, forehead: (x, y) => xMark(x, y, 6) });
  } else if (st === 2) {
    ground(A, 100, 54);
    fan(84, 160, 4, 86, 17, -166, -98);
    A.part(P(blob([[98, 100], [122, 108], [134, 140], [132, 172], [112, 182], [80, 182], [66, 160], [70, 124]])), body, { s: 8, inner: `<path d="${blob([[100, 108], [118, 118], [116, 150], [102, 162], [88, 150], [86, 118]])}" fill="${Pp.belly.b}"/>` });
    A.part(P(blob([[70, 140], [94, 146], [98, 168], [90, 182], [66, 182], [60, 160]])), body, { s: 6, sw: 0 });
    line(A, 'M74 142Q96 148 96 168Q94 178 88 182', 3.2);
    A.part(P(blob([[108, 138], [124, 138], [124, 178], [110, 180]])), body, { s: 3 });
    A.part(E(118, 181, 10, 5), body, { s: 2 });
    A.part(E(76, 182, 14, 5), body, { s: 2 });
    foxHead(A, Pp, m, 104, 82, 0.95, { col: body, earIn: Pp.main, ear: 'tall', forehead: (x, y) => xMark(x, y, 7) });
  } else {
    ground(A, 108, 62);
    A.halo(92, 108, 80, Pp.accent.b);
    fan(96, 150, 8, 92, 16, -190, -38);
    A.part(P(blob([[108, 92], [134, 100], [148, 134], [146, 170], [124, 183], [88, 183], [72, 160], [76, 120]])), body, { s: 9 });
    A.part(P(blob([[76, 134], [104, 142], [110, 166], [102, 183], [72, 183], [64, 158]])), body, { s: 7, sw: 0 });
    line(A, 'M80 136Q108 144 108 166Q106 178 100 183', 3.4);
    A.part(P(blob([[120, 134], [138, 134], [138, 178], [122, 180]])), body, { s: 3 });
    A.part(E(132, 182, 11, 5), body, { s: 2 });
    A.part(E(82, 183, 15, 5), body, { s: 2 });
    A.part(P(blob([[80, 96, 1], [92, 104], [102, 94, 1], [112, 104], [124, 94, 1], [136, 102], [146, 94, 1], [144, 116], [134, 132, 1], [126, 124], [114, 144, 1], [106, 124], [96, 132, 1], [84, 118]])), Pp.main, { s: 5 });
    mark(A, Pp, 114, 120, 6, { glow: true });
    mark(A, Pp, 90, 162, 7, { glow: true });
    foxHead(A, Pp, m, 114, 76, 0.9, { col: body, earIn: Pp.main, ear: 'tall', lid: true, forehead: (x, y) => xMark(x, y, 7.5, true) });
  }
}

// ---------- factsprite: tiny winged imp that grows swifter wings
function factsprite(A, st, Pp, m) {
  const wingPart = (pts, veins) => A.part(P(blob(pts)), Pp.wing, { s: 4, sw: 3, inner: `<path d="${veins}" stroke="${Pp.white.b}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` });
  const veinOf = (b, t) => `M${f(b[0])} ${f(b[1])}Q${f((b[0] + t[0]) / 2 + 4)} ${f((b[1] + t[1]) / 2 - 4)} ${f(t[0])} ${f(t[1])}`;
  const tailStar = (d, x, y, r, glow) => {
    A.add(`<path d="${d}" fill="none" stroke="${OL}" stroke-width="8" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${Pp.main.b}" stroke-width="3.6" stroke-linecap="round"/>`);
    if (glow) A.halo(x, y, r * 2.4, Pp.accent.b);
    A.add(`<path d="${star4d(x, y, r, 0.3)}" fill="${Pp.accent.b}" stroke="${OL}" stroke-width="2.5"/>`);
  };
  const horn = (b1, t, b2) => A.part(P(blob(leaf(b1, t, b2, 0.18))), Pp.second, { s: 3 });
  if (st === 1) {
    ground(A, 100, 28);
    const w1 = leaf([92, 96], [42, 62], [84, 118], 0.45), w2 = leaf([110, 94], [156, 56], [120, 114], 0.45);
    wingPart(w1, veinOf([88, 104], [54, 72])); wingPart(w2, veinOf([114, 102], [146, 66]));
    tailStar('M80 140Q60 166 46 150', 44, 146, 8);
    A.part(E(90, 152, 6, 9, 10), Pp.main, { s: 2 });
    A.part(E(112, 152, 6, 9, -10), Pp.main, { s: 2 });
    horn([80, 88], [74, 64], [92, 82]); horn([110, 82], [126, 62], [122, 88]);
    A.part(P(blob([[100, 76], [126, 84], [136, 110], [130, 136], [110, 150], [90, 150], [70, 136], [64, 110], [74, 84]])), Pp.main, { s: 8, inner: E(100, 138, 18, 11).replace('/>', ` fill="${Pp.belly.b}"/>`) });
    A.part(E(68, 122, 6, 9, 30), Pp.main, { s: 2 });
    A.part(E(132, 120, 6, 9, -30), Pp.main, { s: 2 });
    eyesOnly(A, Pp, m, 88, 108, 115, 108, 10.5);
    mouth(A, 102, 125, 4.5, m, 'smile', { fang: true });
  } else if (st === 2) {
    ground(A, 102, 36);
    for (const w of [[[94, 112], [30, 46], [88, 124]], [[112, 108], [180, 44], [118, 122]], [[94, 124], [30, 150], [96, 136]], [[112, 122], [176, 146], [114, 136]]]) wingPart(leaf(w[0], w[1], w[2], 0.2), veinOf(w[0], [w[0][0] * 0.35 + w[1][0] * 0.65, w[0][1] * 0.35 + w[1][1] * 0.65]));
    line(A, 'M22 100h18M14 116h22M24 132h14', 3, Pp.second.l);
    tailStar('M90 150Q70 184 44 170', 42, 166, 9);
    A.part(P(blob([[86, 146], [100, 150], [96, 166], [88, 180, 1], [84, 162]])), Pp.main, { s: 3 });
    A.part(P(blob([[104, 148], [116, 144], [118, 162], [126, 176, 1], [108, 164]])), Pp.main, { s: 3 });
    A.part(P(blob([[102, 104], [120, 110], [124, 132], [114, 152], [100, 158], [88, 150], [80, 130], [86, 110]])), Pp.main, { s: 7, inner: E(102, 140, 12, 10).replace('/>', ` fill="${Pp.belly.b}"/>`) });
    A.part(E(82, 122, 5, 13, 35), Pp.main, { s: 2 });
    A.part(E(124, 118, 5, 13, -45), Pp.main, { s: 2 });
    A.part(P(blob([[92, 60], [96, 34, 1], [104, 50], [116, 30, 1], [116, 58]])), Pp.second, { s: 4 });
    A.part(P(blob([[104, 54], [124, 58], [136, 72], [162, 62, 1], [144, 88], [134, 100], [104, 108], [76, 100], [66, 88], [46, 62, 1], [74, 72], [84, 58]])), Pp.main, { s: 7 });
    eyesOnly(A, Pp, m, 92, 82, 118, 82, 10.5);
    mouth(A, 106, 97, 4.5, m, 'smile', { fang: true });
    mark(A, Pp, 102, 128, 5);
  } else {
    ground(A, 102, 44);
    A.halo(102, 96, 92, Pp.accent.b);
    const W = [[[98, 96], [12, 18], [88, 122]], [[110, 92], [190, 16], [120, 118]], [[96, 116], [16, 164], [98, 132]], [[112, 114], [186, 160], [116, 130]]];
    for (const w of W) {
      const pts = leaf(w[0], w[1], w[2], 0.3);
      const mid = [w[0][0] * 0.3 + w[1][0] * 0.7, w[0][1] * 0.3 + w[1][1] * 0.7];
      A.part(P(blob(pts)), Pp.wing, { s: 5, sw: 3, inner: `<path d="${blob(leaf(w[0], w[1], w[2], 0.3).map((p, i) => i === 2 ? p : [(p[0] + mid[0]) / 2, (p[1] + mid[1]) / 2, p[2]]))}" fill="${Pp.accent.l}" opacity=".7"/><path d="${veinOf(w[0], w[1])}" stroke="${Pp.second.l}" stroke-width="2.5" fill="none"/>` });
      A.add(sparkle(mid[0], mid[1], 4, Pp.accent.l, OL, 1.2));
    }
    tailStar('M94 150Q76 190 40 176', 38, 172, 10, true);
    A.part(P(blob([[88, 146], [102, 150], [98, 168], [90, 184, 1], [84, 164]])), Pp.main, { s: 3 });
    A.part(P(blob([[104, 148], [118, 144], [120, 164], [130, 180, 1], [108, 166]])), Pp.main, { s: 3 });
    A.part(P(blob([[104, 98], [122, 104], [126, 128], [116, 150], [102, 158], [88, 150], [82, 126], [88, 104]])), Pp.main, { s: 7, inner: E(104, 134, 13, 12).replace('/>', ` fill="${Pp.belly.b}"/>`) });
    mark(A, Pp, 104, 132, 6, { glow: true });
    A.part(P(blob([[88, 108], [76, 100], [60, 92], [56, 100], [72, 112], [84, 120]])), Pp.main, { s: 2 });
    A.part(P(blob([[120, 106], [134, 98], [150, 88], [156, 96], [140, 110], [126, 118]])), Pp.main, { s: 2 });
    A.halo(158, 84, 14, Pp.accent.b);
    A.add(sparkle(158, 84, 8, Pp.accent.l, OL, 2));
    A.part(P(blob([[88, 44], [92, 16, 1], [102, 32], [114, 10, 1], [116, 30], [124, 22, 1], [120, 44]])), Pp.second, { s: 4 });
    A.part(P(blob([[104, 38], [126, 42], [136, 58], [158, 42, 1], [146, 72], [136, 88], [104, 96], [74, 88], [64, 72], [50, 42, 1], [72, 58], [82, 42]])), Pp.main, { s: 7 });
    crown(A, Pp, 104, 42, 30, 18);
    eyesOnly(A, Pp, m, 92, 68, 118, 68, 10.5, { lid: Pp.main.b });
    mouth(A, 106, 83, 4.5, m, 'smile', { fang: true });
  }
}

// ---------- orderling: wise raccoon with bracket-shaped markings
function orderling(A, st, Pp, m) {
  const G = Pp.grey, D = Pp.dark;
  const ringTail = (base, ctrl, tip, w, n) => {
    const t = bushy(base, ctrl, tip, w);
    let bands = '';
    for (let i = 1; i <= n; i++) {
      const tt = (i / (n + 1)) * 0.62 + 0.05;
      const a = t.side(tt, 1, 1.6), b = t.side(tt, -1, 1.6);
      bands += `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;
    }
    A.part(P(t.d), G, { s: 6, inner: `<path d="${bands}" stroke="${D.b}" stroke-width="${f(w * 0.45)}"/><path d="${t.tipD}" fill="${D.b}"/>` });
  };
  const head = (X, Y, s, o = {}) => {
    const T = (pts) => pts.map(([x, y, c]) => [X + x * s, Y + y * s, c]);
    A.part(P(blob(T(leaf([-34, -12], [-40, -46], [-10, -26], 0.42)))), G, { s: 4, inner: `<path d="${blob(T(leaf([-30, -14], [-36, -38], [-14, -24], 0.35)))}" fill="${D.b}"/>` });
    A.part(P(blob(T(leaf([8, -26], [36, -46], [30, -8], 0.42)))), G, { s: 4, inner: `<path d="${blob(T(leaf([12, -24], [32, -38], [26, -12], 0.35)))}" fill="${D.b}"/>` });
    A.part(P(blob(T([[0, -28], [26, -22], [40, -4], [50, 8, 1], [34, 14], [20, 28], [0, 32], [-20, 28], [-36, 14], [-52, 8, 1], [-42, -4], [-26, -22]]))), G, {
      s: 7 * s, inner: `<path d="${blob(T([[0, 10], [18, 6], [42, 12], [22, 26], [0, 33], [-22, 26], [-44, 12], [-18, 6]]))}" fill="${Pp.belly.b}"/>`
        + `<path d="${blob(T([[0, -8], [6, -18], [0, -26, 1], [-6, -18]]))}" fill="${Pp.belly.b}"/>`,
    });
    // bracket mask ( )
    const ex1 = X - 15 * s, ex2 = X + 15 * s, ey = Y + 1 * s;
    A.add(`<path d="M${f(ex1 - 4 * s)} ${f(ey - 15 * s)}Q${f(ex1 - 20 * s)} ${f(ey)} ${f(ex1 - 4 * s)} ${f(ey + 15 * s)}M${f(ex2 + 4 * s)} ${f(ey - 15 * s)}Q${f(ex2 + 20 * s)} ${f(ey)} ${f(ex2 + 4 * s)} ${f(ey + 15 * s)}" fill="none" stroke="${D.b}" stroke-width="${f(8 * s)}" stroke-linecap="round"/>`
      + `<ellipse cx="${f(ex1)}" cy="${f(ey)}" rx="${f(12 * s)}" ry="${f(12 * s)}" fill="${D.b}"/><ellipse cx="${f(ex2)}" cy="${f(ey)}" rx="${f(12 * s)}" ry="${f(12 * s)}" fill="${D.b}"/>`);
    if (o.brows) A.add(`<path d="M${f(ex1 - 14 * s)} ${f(ey - 16 * s)}Q${f(ex1)} ${f(ey - 24 * s)} ${f(ex1 + 10 * s)} ${f(ey - 15 * s)}M${f(ex2 + 14 * s)} ${f(ey - 16 * s)}Q${f(ex2)} ${f(ey - 24 * s)} ${f(ex2 - 10 * s)} ${f(ey - 15 * s)}" fill="none" stroke="${OL}" stroke-width="${f(8 * s)}" stroke-linecap="round"/><path d="M${f(ex1 - 14 * s)} ${f(ey - 16 * s)}Q${f(ex1)} ${f(ey - 24 * s)} ${f(ex1 + 10 * s)} ${f(ey - 15 * s)}M${f(ex2 + 14 * s)} ${f(ey - 16 * s)}Q${f(ex2)} ${f(ey - 24 * s)} ${f(ex2 - 10 * s)} ${f(ey - 15 * s)}" fill="none" stroke="#fff" stroke-width="${f(4.5 * s)}" stroke-linecap="round"/>`);
    eyes(A, Pp, ex1, ey, ex2, ey, 9 * s, m, { far: 1, farSq: 1, iris: Pp.main.s });
    if (o.specs) A.add(`<circle cx="${f(ex1)}" cy="${f(ey)}" r="${f(13 * s)}" fill="#fff" fill-opacity=".18" stroke="${OL}" stroke-width="5"/><circle cx="${f(ex2)}" cy="${f(ey)}" r="${f(13 * s)}" fill="#fff" fill-opacity=".18" stroke="${OL}" stroke-width="5"/><circle cx="${f(ex1)}" cy="${f(ey)}" r="${f(13 * s)}" fill="none" stroke="${Pp.main.b}" stroke-width="2.4"/><circle cx="${f(ex2)}" cy="${f(ey)}" r="${f(13 * s)}" fill="none" stroke="${Pp.main.b}" stroke-width="2.4"/><path d="M${f(ex1 + 12 * s)} ${f(ey - 2)}Q${f(X)} ${f(ey - 6 * s)} ${f(ex2 - 12 * s)} ${f(ey - 2)}" fill="none" stroke="${OL}" stroke-width="3"/>`);
    nose(A, X, Y + 17 * s, 4 * s);
    mouth(A, X, Y + 23 * s, 4 * s, m, 'cat');
    if (m === 'hurt') sweat(A, X + 44 * s, Y - 16 * s, 5);
  };
  const bracketMarks = (x, y, h, flip) => A.add(`<path d="M${f(x + (flip ? -4 : 4))} ${f(y - h)}h${flip ? 4 : -4}v${f(h * 2)}h${flip ? -4 : 4}" fill="none" stroke="${OL}" stroke-width="6" stroke-linecap="round"/><path d="M${f(x + (flip ? -4 : 4))} ${f(y - h)}h${flip ? 4 : -4}v${f(h * 2)}h${flip ? -4 : 4}" fill="none" stroke="${Pp.main.b}" stroke-width="2.8" stroke-linecap="round"/>`);
  if (st === 1) {
    ground(A, 100, 46);
    ringTail([86, 168], [26, 172], [40, 104], 18, 2);
    A.part(P(blob([[100, 132], [124, 138], [132, 162], [128, 182], [76, 182], [70, 162], [78, 138]])), G, { s: 7, inner: `<path d="${blob([[100, 142], [114, 146], [114, 170], [100, 178], [86, 170], [86, 146]])}" fill="${Pp.belly.b}"/>` });
    A.part(E(88, 180, 10, 6), D, { s: 2 }); A.part(E(114, 180, 10, 6), D, { s: 2 });
    A.part(E(86, 160, 6, 8, 30), D, { s: 2 }); A.part(E(116, 160, 6, 8, -30), D, { s: 2 });
    head(104, 112, 0.95);
  } else if (st === 2) {
    ground(A, 100, 54);
    ringTail([78, 160], [10, 160], [28, 76], 22, 3);
    A.part(E(84, 180, 14, 6.5), D, { s: 2 }); A.part(E(120, 180, 14, 6.5), D, { s: 2 });
    A.part(P(blob([[102, 100], [126, 108], [138, 138], [134, 168], [114, 180], [84, 180], [68, 164], [66, 134], [78, 108]])), G, { s: 8, inner: `<path d="${blob([[102, 112], [120, 120], [120, 156], [102, 170], [84, 156], [84, 120]])}" fill="${Pp.belly.b}"/>` });
    A.part(P(blob([[76, 118], [68, 132], [70, 150], [80, 152], [84, 134]])), G, { s: 3 });
    A.part(P(blob([[128, 116], [140, 128], [136, 148], [126, 150], [122, 130]])), G, { s: 3 });
    bracketMarks(72, 136, 7, false); bracketMarks(134, 134, 7, true);
    A.part(Ci(76, 152, 6), D, { s: 2 }); A.part(Ci(130, 150, 6), D, { s: 2 });
    mark(A, Pp, 102, 146, 5);
    head(104, 80, 1);
  } else {
    ground(A, 102, 62);
    ringTail([76, 150], [8, 160], [24, 60], 22, 3);
    A.part(E(84, 181, 16, 7), D, { s: 3 }); A.part(E(124, 181, 16, 7), D, { s: 3 });
    A.part(P(blob([[104, 90], [132, 98], [146, 134], [142, 168], [120, 182], [84, 182], [64, 166], [62, 130], [76, 98]])), G, { s: 9, inner: `<path d="${blob([[104, 104], [124, 112], [126, 152], [104, 170], [84, 152], [84, 112]])}" fill="${Pp.belly.b}"/>` });
    // scholar's scarf
    A.part(P(blob([[74, 94], [104, 102], [136, 94], [140, 106], [120, 116], [124, 150, 1], [110, 146], [104, 116], [72, 108]])), Pp.second, { s: 4, inner: `<path d="M112 128h12M114 138h10" stroke="${Pp.main.b}" stroke-width="3"/>` });
    A.part(P(blob([[72, 114], [62, 132], [64, 152], [76, 154], [80, 132]])), G, { s: 3 });
    bracketMarks(66, 136, 8, false);
    A.part(Ci(70, 154, 7), D, { s: 2 });
    // staff with ( star )
    A.add(`<path d="M158 70L150 180" stroke="${OL}" stroke-width="9" stroke-linecap="round"/><path d="M158 70L150 180" stroke="${Pp.dark.l}" stroke-width="4.5" stroke-linecap="round"/>`);
    A.halo(160, 56, 24, Pp.accent.b);
    A.add(`<path d="M150 42Q140 56 150 70M170 42Q180 56 170 70" fill="none" stroke="${OL}" stroke-width="7" stroke-linecap="round"/><path d="M150 42Q140 56 150 70M170 42Q180 56 170 70" fill="none" stroke="${Pp.main.b}" stroke-width="3.5" stroke-linecap="round"/>`);
    mark(A, Pp, 160, 56, 9, { glow: true });
    A.part(P(blob([[130, 110], [146, 118], [152, 126], [148, 136], [134, 132], [124, 124]])), G, { s: 3 });
    bracketMarks(138, 118, 6, true);
    A.part(Ci(152, 128, 7.5), D, { s: 2 });
    head(106, 64, 1.08, { brows: true, specs: true });
    mark(A, Pp, 104, 158, 6, { glow: true });
  }
}

// ---------- patternkin: caterpillar -> chrysalis -> butterfly with repeating wing patterns
function stalk(A, d, col, w = 3.4) {
  A.add(`<path d="${d}" fill="none" stroke="${OL}" stroke-width="${f(w + 4.4)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`);
}
function spiralD(x, y, r, turns = 1.6, dir = 1) {
  let d = '';
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = dir * t * turns * 2 * Math.PI, rr = r * (1 - t * 0.8);
    d += `${i ? 'L' : 'M'}${f(x + rr * Math.cos(a))} ${f(y + rr * Math.sin(a))}`;
  }
  return d;
}
function patternkin(A, st, Pp, m) {
  const G = Pp.main, L = Pp.accent, K = Pp.second;
  if (st === 1) {
    ground(A, 94, 58);
    const segs = [[44, 168, 15, 14], [68, 162, 18, 17], [96, 154, 21, 20]];
    segs.forEach(([x, y, rx, ry]) => A.part(E(x, 182, 5, 4), Pp.dark, { s: 1.5, sw: 2.5 }));
    segs.forEach(([x, y, rx, ry], i) => A.part(E(x, y, rx, ry), i % 2 ? L : G, { s: 5, inner: i % 2 ? `<path d="M${x - rx} ${y + 2}h${rx * 2}" stroke="${G.b}" stroke-width="5"/>` : `<circle cx="${x}" cy="${y - 2}" r="${f(rx * 0.35)}" fill="${K.b}" stroke="${OL}" stroke-width="2"/>` }));
    stalk(A, 'M124 104Q116 86 112 76', G.s); stalk(A, 'M144 102Q152 84 158 74', G.s);
    mark(A, Pp, 110, 72, 7, { rot: -30 }); mark(A, Pp, 160, 70, 7, { rot: 30 });
    A.part(Ci(134, 128, 30), K, { s: 7 });
    eyesOnly(A, Pp, m, 123, 126, 148, 126, 10);
    mouth(A, 136, 142, 4.5, m, 'smile');
  } else if (st === 2) {
    ground(A, 100, 40);
    A.part(E(88, 182, 10, 5), Pp.dark, { s: 2 }); A.part(E(112, 182, 10, 5), Pp.dark, { s: 2 });
    A.part(E(58, 124, 13, 8, -30), K, { s: 3, inner: `<path d="M50 130L68 118" stroke="${K.l}" stroke-width="2"/>` });
    A.part(E(142, 122, 13, 8, 30), K, { s: 3, inner: `<path d="M134 116L152 128" stroke="${K.l}" stroke-width="2"/>` });
    stalk(A, 'M92 62Q84 44 74 40', G.s); stalk(A, 'M108 62Q118 42 130 40', G.s);
    A.add(`<path d="${spiralD(72, 36, 8, 1.4, -1)}" fill="none" stroke="${OL}" stroke-width="6" stroke-linecap="round"/><path d="${spiralD(72, 36, 8, 1.4, -1)}" fill="none" stroke="${L.b}" stroke-width="2.6" stroke-linecap="round"/>`);
    A.add(`<path d="${spiralD(132, 36, 8, 1.4, 1)}" fill="none" stroke="${OL}" stroke-width="6" stroke-linecap="round"/><path d="${spiralD(132, 36, 8, 1.4, 1)}" fill="none" stroke="${L.b}" stroke-width="2.6" stroke-linecap="round"/>`);
    let dots = '';
    for (const [x, y] of [[74, 136], [92, 130], [110, 130], [128, 136], [76, 164], [94, 158], [112, 158], [128, 162]]) dots += `<circle cx="${x}" cy="${y}" r="3.6" fill="${K.b}" stroke="${OL}" stroke-width="1.6"/>`;
    A.part(P(blob([[100, 56], [124, 68], [138, 108], [136, 150], [120, 176], [100, 181], [80, 176], [64, 150], [62, 108], [76, 68]])), G, {
      s: 9, inner: `<path d="M50 138Q100 118 150 138M50 166Q100 146 150 166" stroke="${OL}" stroke-width="17" fill="none"/><path d="M50 138Q100 118 150 138M50 166Q100 146 150 166" stroke="${L.b}" stroke-width="12" fill="none"/>` + dots,
    });
    A.part(E(100, 96, 27, 23), Pp.belly, { s: 4 });
    eyesOnly(A, Pp, m, 90, 95, 111, 95, 8.5);
    mouth(A, 101, 108, 4, m, 'smile');
  } else {
    ground(A, 102, 50);
    const mirrorPts = (pts) => pts.map(([x, y, c]) => [204 - x, y, c]);
    const up = [[96, 96], [70, 58], [40, 34], [14, 36], [6, 62], [20, 94], [50, 112], [92, 114]];
    const lo = [[94, 118], [60, 120], [30, 136], [24, 162], [44, 180], [74, 170], [96, 140]];
    const dotsRow = (flip) => [[26, 58], [42, 72], [58, 84], [22, 80], [40, 94]].map(([x, y]) => `<circle cx="${flip ? 204 - x : x}" cy="${y}" r="5.5" fill="${L.b}" stroke="${OL}" stroke-width="2"/>`).join('');
    const triRow = (flip) => [[40, 146], [54, 160], [70, 150]].map(([x, y]) => { const X = flip ? 204 - x : x; return `<path d="M${X} ${y - 6}L${X + 6} ${y + 5}L${X - 6} ${y + 5}Z" fill="${K.b}" stroke="${OL}" stroke-width="2"/>`; }).join('');
    const edge = (pts) => `<path d="${blob(pts)}" fill="none" stroke="${G.b}" stroke-width="9"/>`;
    A.halo(38, 70, 34, L.b); A.halo(166, 70, 34, L.b);
    A.part(P(blob(up)), K, { s: 7, inner: edge(up) + dotsRow(0) });
    A.part(P(blob(mirrorPts(up))), K, { s: 7, inner: edge(mirrorPts(up)) + dotsRow(1) });
    A.part(P(blob(lo)), G, { s: 6, inner: triRow(0) });
    A.part(P(blob(mirrorPts(lo))), G, { s: 6, inner: triRow(1) });
    mark(A, Pp, 30, 64, 6, { glow: true, rot: -20 }); mark(A, Pp, 174, 64, 6, { glow: true, rot: 20 });
    A.part(P(blob([[102, 128], [112, 134], [112, 160], [102, 176], [92, 160], [92, 134]])), G, { s: 4, inner: `<path d="M90 144h24M90 156h24" stroke="${L.b}" stroke-width="5"/>` });
    A.part(E(102, 114, 13, 16), G, { s: 4 });
    stalk(A, 'M92 64Q82 40 70 30', G.s); stalk(A, 'M112 64Q122 40 134 30', G.s);
    for (const [x, dir] of [[66, -1], [138, 1]]) A.add(`<path d="${spiralD(x, 26, 9, 1.5, dir)}" fill="none" stroke="${OL}" stroke-width="6.5" stroke-linecap="round"/><path d="${spiralD(x, 26, 9, 1.5, dir)}" fill="none" stroke="${L.l}" stroke-width="3" stroke-linecap="round"/>`);
    A.part(Ci(102, 82, 24), K, { s: 6 });
    for (const [x, y] of [[84, 62], [94, 56], [102, 54], [110, 56], [120, 62]]) A.add(`<circle cx="${x}" cy="${y}" r="5" fill="${Pp.white.b}" stroke="${OL}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2" fill="${L.b}"/>`);
    eyesOnly(A, Pp, m, 92, 82, 112, 82, 8.5, { lid: K.b });
    mouth(A, 102, 95, 4, m, 'smile');
  }
}

// ---------- balancer: seesaw beetle with twin leaf pans
function balancer(A, st, Pp, m) {
  const G = Pp.main, L = Pp.accent, K = Pp.second, D = Pp.dark;
  const legs = (arr, w = 4) => arr.forEach((d) => stalk(A, d, D.b, w));
  const pan = (x, y, w, glow, fill) => {
    stalk(A, `M${x} ${y - w * 0.95}V${y}`, D.l, 2);
    if (glow) A.halo(x, y, w * 1.4, L.b);
    A.part(P(`M${f(x - w)} ${f(y)}Q${f(x - w * 0.9)} ${f(y + w * 0.75)} ${f(x)} ${f(y + w * 0.7)}Q${f(x + w * 0.9)} ${f(y + w * 0.75)} ${f(x + w)} ${f(y)}Q${f(x)} ${f(y + w * 0.22)} ${f(x - w)} ${f(y)}Z`), L, { s: 3, inner: `<path d="M${f(x)} ${f(y + w * 0.12)}V${f(y + w * 0.66)}" stroke="${L.s}" stroke-width="2"/>` });
    if (fill) fill(x, y);
  };
  const beam = (x1, x2, y, h) => A.part(Rr(x1, y - h / 2, x2 - x1, h, h / 2), D, { s: 2 });
  const berry = (x, y, r = 5) => A.add(`<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${K.b}" stroke="${OL}" stroke-width="2"/><circle cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.3)}" fill="#fff"/>`);
  const shell = (pts, s, inner) => A.part(P(blob(pts)), G, { s, inner });
  if (st === 1) {
    ground(A, 98, 58);
    legs(['M66 166l-8 16', 'M96 172v12', 'M124 168l8 14']);
    stalk(A, 'M92 118V86', D.b, 5);
    beam(54, 130, 82, 8);
    pan(60, 100, 15); pan(124, 100, 15);
    shell([[92, 116], [128, 122], [146, 146], [138, 172], [92, 178], [50, 172], [40, 146], [56, 122]], 8, `<path d="M92 116V178" stroke="${OL}" stroke-width="3"/><circle cx="70" cy="146" r="6" fill="${L.b}"/><circle cx="112" cy="146" r="6" fill="${L.b}"/><circle cx="80" cy="164" r="4" fill="${L.b}"/><circle cx="104" cy="164" r="4" fill="${L.b}"/>`);
    A.part(Ci(146, 154, 22), Pp.belly, { s: 5 });
    eyesOnly(A, Pp, m, 140, 150, 160, 150, 8);
    mouth(A, 151, 163, 4, m, 'smile');
  } else if (st === 2) {
    ground(A, 98, 68);
    legs(['M60 164l-12 20', 'M92 172v12', 'M126 168l10 16'], 5);
    stalk(A, 'M162 128Q170 104 184 100', D.b, 3); stalk(A, 'M150 126Q150 104 160 94', D.b, 3);
    mark(A, Pp, 186, 98, 5, { rot: 60 }); mark(A, Pp, 160, 90, 5, { rot: 20 });
    stalk(A, 'M90 108V64', D.b, 6);
    beam(34, 146, 60, 9);
    A.add(`<circle cx="90" cy="60" r="7" fill="${K.b}" stroke="${OL}" stroke-width="3"/>`);
    pan(42, 84, 19, false, (x, y) => { berry(x - 6, y + 3); berry(x + 6, y + 3); });
    pan(138, 84, 19, false, (x, y) => { berry(x - 6, y + 3); berry(x + 6, y + 3); });
    const sp = (x, y, d) => `<path d="${spiralD(x, y, 9, 1.4, d)}" fill="none" stroke="${L.b}" stroke-width="3.5" stroke-linecap="round"/>`;
    shell([[90, 104], [134, 112], [156, 142], [146, 170], [92, 178], [40, 170], [28, 142], [46, 112]], 9, `<path d="M90 104V178" stroke="${OL}" stroke-width="3"/>` + sp(62, 140, 1) + sp(118, 140, -1) + sp(70, 164, 1) + sp(112, 164, -1));
    A.part(Ci(158, 146, 25), Pp.belly, { s: 6 });
    A.part(P(blob([[134, 138], [140, 120], [158, 116], [178, 122], [184, 134, 1], [160, 130], [134, 142, 1]])), G, { s: 3 });
    eyesOnly(A, Pp, m, 151, 144, 173, 144, 9);
    mouth(A, 163, 157, 4.5, m, 'smile');
  } else {
    ground(A, 98, 76);
    legs(['M58 164l-16 20', 'M90 174v11', 'M130 168l14 16'], 6);
    // translucent wings peeking
    A.part(P(blob(leaf([54, 112], [6, 62], [86, 112], 0.34))), Pp.wing, { s: 4, sw: 3, inner: `<path d="M58 110Q34 88 12 66M44 102L30 104M52 94L42 84" stroke="${Pp.white.b}" stroke-width="2.5" fill="none"/>` });
    stalk(A, 'M88 104V56', D.b, 7);
    beam(20, 156, 50, 10);
    crown(A, Pp, 88, 46, 26, 22, 3, L);
    const flowers = (x, y) => { for (const dx of [-8, 8]) { A.add(`<path d="${star4d(x + dx, y + 2, 7, 0.45)}" fill="${K.l}" stroke="${OL}" stroke-width="2"/><circle cx="${x + dx}" cy="${y + 2}" r="2.6" fill="${L.b}"/>`); } };
    pan(28, 78, 21, true, flowers); pan(148, 78, 21, true, flowers);
    const lm = (x, y, r) => { const d = blob(leafd(x, y, 9, r)); return `<path d="${d}" fill="${L.l}" stroke="${OL}" stroke-width="2"/>`; };
    A.halo(88, 140, 60, L.b);
    shell([[88, 98], [140, 106], [166, 140], [156, 172], [90, 180], [30, 172], [16, 140], [36, 106]], 10, `<path d="M88 98V180" stroke="${OL}" stroke-width="3.5"/>` + lm(54, 132, -30) + lm(122, 132, 30) + lm(60, 160, -60) + lm(116, 160, 60) + lm(40, 150, -10) + lm(136, 150, 10));
    A.part(Ci(166, 146, 27), Pp.belly, { s: 6 });
    A.part(P(blob([[140, 138], [146, 118], [166, 112], [186, 118], [194, 132, 1], [168, 128], [140, 144, 1]])), G, { s: 3 });
    A.part(P(blob([[168, 118], [176, 92], [190, 72, 1], [188, 94], [184, 120]])), D, { s: 3 });
    eyesOnly(A, Pp, m, 158, 144, 181, 144, 9.5, { lid: Pp.belly.b });
    mouth(A, 171, 160, 4.5, m, 'smile');
  }
}

// ---------- clockwork: turtle with a clock / sundial shell
function clockFace(A, Pp, cx, cy, rx, ry, glow) {
  if (glow) A.halo(cx, cy, rx * 1.3, Pp.accent.b);
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6, k = i % 3 ? 0.84 : 0.72;
    ticks += `M${f(cx + Math.sin(a) * rx * k)} ${f(cy - Math.cos(a) * ry * k)}L${f(cx + Math.sin(a) * rx * 0.94)} ${f(cy - Math.cos(a) * ry * 0.94)}`;
  }
  A.part(E(cx, cy, rx, ry), Pp.belly, { s: 4, inner: `<path d="${ticks}" stroke="${glow ? Pp.accent.s : OL}" stroke-width="${f(Math.max(2, rx * 0.07))}" stroke-linecap="round"/>` });
  const hand = (a, l, w) => `M${f(cx)} ${f(cy)}L${f(cx + Math.sin(a) * rx * l)} ${f(cy - Math.cos(a) * ry * l)}`;
  A.add(`<path d="${hand(-1.05, 0.5)}${hand(1.05, 0.72)}" stroke="${OL}" stroke-width="${f(Math.max(3, rx * 0.12))}" stroke-linecap="round"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(Math.max(2.5, rx * 0.1))}" fill="${Pp.main.b}" stroke="${OL}" stroke-width="2"/>`);
  if (glow) for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; A.add(`<path d="${diamd(cx + Math.sin(a) * rx * 0.8, cy - Math.cos(a) * ry * 0.8, 4.5)}" fill="${Pp.accent.l}" stroke="${OL}" stroke-width="1.8"/>`); }
}
function clockwork(A, st, Pp, m) {
  const S = Pp.second;
  if (st === 1) {
    ground(A, 96, 58);
    A.part(P(poly([[46, 160], [28, 168], [48, 170]])), S, { s: 2 });
    A.part(E(60, 177, 12, 8), S, { s: 3 }); A.part(E(126, 177, 12, 8), S, { s: 3 });
    A.part(P(blob([[92, 106], [128, 112], [146, 146], [140, 164], [92, 168], [44, 164], [38, 146], [56, 112]])), Pp.main, { s: 8, inner: `<path d="M50 122l10 10M134 122l-10 10M92 106v10" stroke="${Pp.main.s}" stroke-width="3"/>` });
    A.part(P(blob([[38, 156], [146, 156], [148, 166], [140, 174], [44, 174], [36, 166]])), Pp.belly, { s: 3 });
    clockFace(A, Pp, 92, 138, 27, 20);
    A.part(P(blob([[136, 156], [140, 136], [152, 120], [170, 124], [176, 142], [166, 158], [148, 162]])), S, { s: 6 });
    eyesOnly(A, Pp, m, 150, 138, 168, 138, 8.5);
    mouth(A, 160, 151, 4, m, 'smile');
  } else if (st === 2) {
    ground(A, 94, 66);
    A.part(P(poly([[36, 150], [14, 160], [38, 164]])), S, { s: 2 });
    A.part(E(48, 176, 15, 10), S, { s: 3 }); A.part(E(132, 176, 15, 10), S, { s: 3 });
    A.part(P(poly([[80, 96], [92, 40], [108, 96]])), S, { s: 4, inner: `<path d="M92 44L96 96" stroke="${S.l}" stroke-width="3"/>` });
    const hex = (x, y) => `<path d="${poly(ngon(x, y, 9, 6, 30))}" fill="none" stroke="${Pp.main.s}" stroke-width="3"/>`;
    A.part(P(blob([[92, 88], [134, 96], [156, 134], [150, 160], [92, 166], [34, 160], [28, 134], [50, 96]])), Pp.main, { s: 9, inner: hex(40, 138) + hex(144, 138) + hex(62, 106) + hex(122, 106) + hex(92, 158) });
    A.part(P(blob([[28, 152], [156, 152], [158, 164], [148, 172], [36, 172], [26, 164]])), Pp.belly, { s: 3, inner: `<path d="M50 154v18M70 154v18M92 154v18M114 154v18M134 154v18" stroke="${Pp.belly.s}" stroke-width="2.5"/>` });
    clockFace(A, Pp, 92, 126, 34, 24);
    A.part(P(blob([[138, 150], [142, 124], [158, 108], [180, 112], [188, 132], [178, 152], [156, 158]])), S, { s: 7 });
    eyesOnly(A, Pp, m, 158, 130, 178, 130, 9);
    mouth(A, 170, 145, 4.5, m, 'smile');
  } else {
    ground(A, 92, 76);
    const leg = (x) => A.part(P(blob([[x - 13, 146], [x + 13, 146], [x + 15, 182, 1], [x - 15, 182, 1]])), S, { s: 5, inner: `<path d="M${x - 6} 182v-6M${x + 1} 182v-6M${x + 8} 182v-6" stroke="${OL}" stroke-width="2.4"/><path d="M${x - 14} 160h28" stroke="${S.s}" stroke-width="3"/>` });
    leg(40); leg(130);
    A.part(P(poly([[28, 136], [4, 150], [30, 154]])), S, { s: 2 });
    A.halo(90, 20, 26, Pp.accent.b);
    A.part(P(poly([[80, 78], [90, 24], [102, 78]])), S, { s: 4, inner: `<path d="M90 28L94 78" stroke="${S.l}" stroke-width="3"/>` });
    gem(A, Pp, 90, 18, 10, true);
    const hex = (x, y) => `<path d="${poly(ngon(x, y, 11, 6, 30))}" fill="${Pp.main.l}" fill-opacity=".35" stroke="${Pp.main.s}" stroke-width="3"/>`;
    A.part(P(blob([[90, 70], [140, 80], [166, 124], [158, 156], [90, 162], [22, 156], [14, 124], [40, 80]])), Pp.main, { s: 10, inner: hex(28, 126) + hex(152, 126) + hex(46, 92) + hex(134, 92) + hex(90, 80) + hex(52, 150) + hex(128, 150) });
    A.part(P(blob([[14, 148], [166, 148], [168, 162], [156, 172], [24, 172], [12, 162]])), Pp.belly, { s: 3, inner: `<path d="M36 150v22M58 150v22M80 150v22M102 150v22M124 150v22M146 150v22" stroke="${Pp.belly.s}" stroke-width="2.5"/>` });
    clockFace(A, Pp, 90, 116, 42, 30, true);
    A.part(P(blob([[146, 146], [150, 116], [166, 100], [188, 104], [196, 124], [188, 146], [164, 154]])), S, { s: 7 });
    A.part(P(blob([[156, 108], [166, 92], [184, 88, 1], [178, 100], [190, 108]])), Pp.main, { s: 3 });
    eyesOnly(A, Pp, m, 166, 124, 185, 124, 9, { lid: S.b });
    mouth(A, 178, 139, 4.5, m, 'smile');
    mark(A, Pp, 40, 168, 5, { glow: true }); mark(A, Pp, 130, 168, 5, { glow: true });
  }
}

// ---------- measurer: ruler-necked lizard with tick marks
function measurer(A, st, Pp, m) {
  const B = Pp.main, S = Pp.belly;
  const ticks = (d, n, len, col = OL) => `<path d="${d}" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/>`;
  const lizTail = (base, ctrl, tip, w, n, glow) => {
    const t = bushy(base, ctrl, tip, w, 0.9);
    let d = '';
    for (let i = 1; i <= n; i++) { const tt = i / (n + 1); const a = t.side(tt, 1, 1), b = t.side(tt, 1, i % 2 ? 0.2 : 0.5); d += `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`; }
    A.part(P(t.d), B, { s: 5, inner: `<path d="${d}" stroke="${glow ? Pp.accent.l : OL}" stroke-width="2.6" stroke-linecap="round"/>` });
  };
  const nub = (x1, y1, x2, y2, r, glow) => { stalk(A, `M${x1} ${y1}L${x2} ${y2}`, Pp.second.b, 4); if (glow) A.halo(x2, y2, r * 2.4, Pp.accent.b); A.add(`<circle cx="${x2}" cy="${y2}" r="${r}" fill="${Pp.accent.b}" stroke="${OL}" stroke-width="2.4"/><circle cx="${x2 - r * 0.3}" cy="${y2 - r * 0.3}" r="${f(r * 0.3)}" fill="#fff"/>`); };
  const spots = (arr) => arr.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${S.b}"/>`).join('');
  if (st === 1) {
    ground(A, 96, 56);
    lizTail([82, 168], [26, 190], [24, 146], 13, 6);
    A.part(E(80, 176, 14, 9), B, { s: 3 });
    A.part(P(blob([[98, 118], [120, 126], [128, 156], [120, 180], [80, 180], [72, 156], [80, 126]])), B, { s: 7, inner: `<path d="${blob([[100, 132], [112, 136], [114, 164], [100, 176], [88, 164], [88, 136]])}" fill="${S.b}"/>` + ticks('M88 140h8M88 148h5M88 156h8M88 164h5') });
    A.part(E(122, 180, 11, 5), B, { s: 2 });
    A.part(E(84, 152, 6, 10, 25), B, { s: 2 }); A.part(E(122, 150, 6, 10, -30), B, { s: 2 });
    nub(102, 84, 96, 64, 5); nub(124, 82, 130, 62, 5);
    A.part(P(blob([[112, 74], [138, 80], [150, 98], [144, 118], [118, 128], [90, 122], [80, 102], [88, 82]])), B, { s: 7, inner: spots([[92, 90, 4], [132, 86, 3]]) });
    eyesOnly(A, Pp, m, 104, 102, 132, 102, 10);
    mouth(A, 120, 117, 6, m, 'smile');
  } else if (st === 2) {
    ground(A, 94, 66);
    lizTail([54, 136], [14, 150], [8, 176], 12, 7);
    const leg = (pts) => A.part(P(blob(pts)), B, { s: 3 });
    leg([[58, 146], [70, 146], [68, 181], [58, 182]]); leg([[112, 146], [124, 146], [124, 181], [114, 182]]);
    A.part(P(blob([[58, 116], [100, 110], [126, 122], [132, 144], [118, 158], [76, 160], [50, 152], [44, 132]])), B, { s: 8, inner: spots([[70, 128, 6], [92, 124, 5], [80, 144, 4], [108, 136, 5]]) });
    leg([[68, 150], [82, 150], [80, 182], [70, 183]]); leg([[120, 146], [134, 144], [134, 182], [122, 183]]);
    A.part(P(blob([[104, 132], [112, 98], [124, 70], [136, 56], [150, 62], [142, 86], [134, 112], [130, 138]])), B, { s: 5, inner: `<path d="M132 138Q136 100 150 64" stroke="${S.b}" stroke-width="11" fill="none"/>` + ticks('M132 128h7M133 118h4M134 108h7M136 98h4M138 88h7M141 78h4M145 68h6') });
    nub(142, 40, 138, 22, 4.5); nub(156, 38, 160, 20, 4.5);
    A.part(P(blob([[134, 40], [158, 34], [178, 44], [180, 58], [162, 66], [142, 66], [128, 54]])), B, { s: 6 });
    eyesOnly(A, Pp, m, 148, 49, 166, 48, 8, { far: 0.9 });
    mouth(A, 166, 60, 5, m, 'smile');
  } else {
    ground(A, 88, 78);
    lizTail([46, 140], [8, 146], [12, 184], 15, 9, true);
    const leg = (pts) => A.part(P(blob(pts)), B, { s: 4 });
    leg([[46, 146], [66, 146], [64, 182], [44, 183]]); leg([[104, 146], [122, 146], [124, 182], [104, 183]]);
    A.part(P(blob([[50, 110], [100, 102], [130, 116], [138, 142], [120, 160], [70, 162], [36, 154], [30, 130]])), B, { s: 9, inner: spots([[60, 122, 7], [86, 116, 6], [74, 140, 5], [106, 128, 6], [50, 142, 4]]) });
    leg([[60, 150], [80, 150], [78, 183], [58, 184]]); leg([[116, 146], [136, 144], [138, 183], [118, 184]]);
    A.halo(150, 70, 50, Pp.accent.b);
    A.part(P(blob([[106, 130], [114, 92], [128, 58], [142, 36], [158, 40], [148, 70], [138, 104], [134, 136]])), B, { s: 6, inner: `<path d="M136 134Q140 90 158 42" stroke="${S.b}" stroke-width="12" fill="none"/>` + ticks('M136 126h8M137 116h5M138 106h8M140 96h5M142 86h8M145 76h5M148 66h8M151 56h5M155 46h7', 0, 0, Pp.accent.s) });
    A.part(P(blob([[130, 30, 1], [132, 8, 1], [142, 20], [150, 2, 1], [156, 18], [168, 6, 1], [168, 26], [182, 20, 1], [174, 38]])), S, { s: 4, inner: `<path d="M140 30L136 12M152 26L152 8M162 28L166 12" stroke="${S.s}" stroke-width="2.5"/>` });
    for (const [x, y] of [[132, 8], [150, 2], [168, 6], [182, 20]]) A.add(`<circle cx="${x}" cy="${y}" r="3.6" fill="${Pp.accent.l}" stroke="${OL}" stroke-width="2"/>`);
    A.part(P(blob([[140, 24], [164, 20], [186, 30], [190, 44], [170, 52], [148, 52], [134, 40]])), B, { s: 6 });
    eyesOnly(A, Pp, m, 156, 34, 174, 33, 8, { far: 0.9, lid: B.b });
    mouth(A, 176, 46, 5, m, 'smile');
    mark(A, Pp, 84, 132, 7, { glow: true });
  }
}

// ---------- angler: crab with protractor-arc claws
function angler(A, st, Pp, m) {
  const B = Pp.main, S = Pp.second;
  const protractor = (cx, cy, r, ang, glow) => {
    const tf = `rotate(${ang} ${cx} ${cy})`;
    if (glow) A.halo(cx, cy - r * 0.3, r * 1.5, Pp.accent.b);
    let t = '';
    for (let a = 0; a <= 180; a += 15) { const rr = a % 45 ? 0.82 : 0.7, ra = (a * Math.PI) / 180; t += `M${f(cx - Math.cos(ra) * r * 0.95)} ${f(cy - Math.sin(ra) * r * 0.95)}L${f(cx - Math.cos(ra) * r * rr)} ${f(cy - Math.sin(ra) * r * rr)}`; }
    A.part(P(`M${f(cx - r * 0.8)} ${f(cy + 2)}Q${f(cx)} ${f(cy + r * 0.62)} ${f(cx + r * 0.9)} ${f(cy + 2)}Z`, tf), S, { s: 3 });
    A.part(P(`M${f(cx - r)} ${f(cy)}A${r} ${r} 0 0 1 ${f(cx + r)} ${f(cy)}Z`, tf), glow ? Pp.accent : Pp.belly, { s: 4, inner: `<g transform="${tf}"><path d="${t}" stroke="${OL}" stroke-width="2"/><path d="M${f(cx - r * 0.55)} ${f(cy)}A${f(r * 0.55)} ${f(r * 0.55)} 0 0 1 ${f(cx + r * 0.55)} ${f(cy)}" fill="none" stroke="${S.b}" stroke-width="3"/></g>` });
    A.add(`<g transform="${tf}"><path d="M${f(cx)} ${f(cy)}L${f(cx + r * 0.5)} ${f(cy - r * 0.62)}" stroke="${Pp.main.s}" stroke-width="3" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="${f(r * 0.13)}" fill="${S.b}" stroke="${OL}" stroke-width="2"/></g>`);
  };
  const legs = (arr, w) => arr.forEach((d) => stalk(A, d, B.s, w));
  const stalkEye = (x1, y1, x2, y2, r, o = {}) => {
    stalk(A, `M${x1} ${y1}L${x2} ${y2}`, B.b, 4.5);
    A.add(`<circle cx="${x2}" cy="${y2}" r="${f(r * 1.25)}" fill="${Pp.white.b}" stroke="${OL}" stroke-width="3.2"/>`);
  };
  const eyesOn = (x1, y1, x2, y2, r, lid) => {
    eyes(A, Pp, x1, y1, x2, y2, r, m, { far: 1, farSq: 1, lid: lid ? Pp.white.b : undefined, look: [0.1, 0.05] });
    if (m === 'hurt') sweat(A, x2 + r * 2.2, y2, r * 0.6);
  };
  if (st === 1) {
    ground(A, 100, 58);
    legs(['M68 164L52 170L46 184', 'M76 170L64 178L62 186', 'M132 164L148 170L154 184', 'M124 170L136 178L138 186'], 4);
    stalk(A, 'M62 150Q44 146 38 132', B.b, 6); stalk(A, 'M138 150Q156 146 162 132', B.b, 6);
    protractor(34, 126, 17, -25); protractor(166, 126, 17, 25);
    stalkEye(90, 130, 86, 106, 8); stalkEye(112, 130, 116, 106, 8);
    A.part(P(blob([[100, 124], [136, 130], [152, 152], [140, 174], [100, 180], [60, 174], [48, 152], [64, 130]])), B, { s: 8, inner: `<circle cx="74" cy="142" r="4" fill="${B.l}"/><circle cx="126" cy="142" r="4" fill="${B.l}"/><circle cx="100" cy="138" r="3" fill="${B.l}"/>` });
    eyesOn(86, 106, 116, 106, 8);
    blush(A, 78, 158, 6, 3.5); blush(A, 122, 158, 6, 3.5);
    mouth(A, 100, 156, 5, m, 'smile');
  } else if (st === 2) {
    ground(A, 100, 70);
    legs(['M62 160L42 166L34 184', 'M70 168L54 176L50 186', 'M80 172L72 180L72 186', 'M138 160L158 166L166 184', 'M130 168L146 176L150 186', 'M120 172L128 180L128 186'], 5);
    stalk(A, 'M54 142Q34 136 30 116', B.b, 7); stalk(A, 'M146 142Q166 136 170 116', B.b, 7);
    protractor(30, 106, 24, -20); protractor(170, 106, 24, 20);
    stalkEye(88, 116, 84, 88, 9); stalkEye(112, 116, 116, 88, 9);
    A.part(P(blob([[100, 108], [116, 110], [124, 100, 1], [130, 114], [146, 118], [154, 110, 1], [156, 128], [160, 150], [146, 172], [100, 180], [54, 172], [40, 150], [44, 128], [46, 110, 1], [54, 118], [70, 114], [76, 100, 1], [84, 110]])), B, { s: 9, inner: `<path d="M60 140Q100 124 140 140" stroke="${B.s}" stroke-width="3" fill="none"/>` });
    mark(A, Pp, 100, 146, 6);
    eyesOn(84, 88, 116, 88, 9);
    blush(A, 74, 160, 7, 4); blush(A, 126, 160, 7, 4);
    mouth(A, 100, 160, 5, m, 'smile');
  } else {
    ground(A, 100, 82);
    legs(['M56 156L32 164L22 184', 'M64 166L44 176L38 186', 'M76 172L66 182L66 186', 'M144 156L168 164L178 184', 'M136 166L156 176L162 186', 'M124 172L134 182L134 186'], 6);
    stalk(A, 'M50 134Q28 124 30 96', B.b, 8); stalk(A, 'M150 134Q172 124 170 96', B.b, 8);
    protractor(32, 88, 30, -16, true); protractor(168, 88, 30, 16, true);
    const crystal = (x, y, h, a) => A.part(P(poly([[x - 10, y], [x - 6, y - h * 0.7], [x, y - h], [x + 6, y - h * 0.7], [x + 10, y]]), `rotate(${a} ${x} ${y})`), Pp.accent, { s: 3, inner: `<path d="M${x} ${y - h}V${y}" stroke="${Pp.accent.l}" stroke-width="3" transform="rotate(${a} ${x} ${y})"/>` });
    crystal(58, 118, 30, -38); crystal(76, 110, 34, -16); crystal(124, 110, 34, 16); crystal(142, 118, 30, 38);
    stalkEye(88, 104, 84, 76, 9.5); stalkEye(112, 104, 116, 76, 9.5);
    A.part(P(blob([[100, 100], [140, 108], [162, 128], [166, 152], [148, 174], [100, 182], [52, 174], [34, 152], [38, 128], [60, 108]])), B, { s: 10, inner: `<path d="M50 140Q100 120 150 140" stroke="${B.s}" stroke-width="3" fill="none"/>` });
    mark(A, Pp, 100, 146, 8, { glow: true });
    mark(A, Pp, 62, 140, 4, { glow: true }); mark(A, Pp, 138, 140, 4, { glow: true });
    eyesOn(84, 76, 116, 76, 9.5, true);
    blush(A, 70, 164, 7, 4); blush(A, 130, 164, 7, 4);
    mouth(A, 100, 164, 5, m, 'smile', { fang: true });
  }
}

// ---------- shapeshifter: cat built from simple polygons
function shapeshifter(A, st, Pp, m) {
  const B = Pp.second, S = Pp.belly, T = Pp.main;
  const tri = (a, b, c, col, inner) => A.part(P(poly([a, b, c])), col, { s: 4, inner });
  const ears = (l, r, inr) => {
    tri(l[0], l[1], l[2], B, `<path d="${poly(inr(l))}" fill="${T.b}"/>`);
    tri(r[0], r[1], r[2], B, `<path d="${poly(inr(r))}" fill="${T.b}"/>`);
  };
  const shrinkTri = (k) => (t) => { const cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3 + 3; return t.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]); };
  const catFace = (x, y, s, lid) => {
    eyes(A, Pp, x - 15 * s, y, x + 15 * s, y, 10 * s, m, { far: 1, farSq: 1, sq: 0.9, lid: lid ? B.b : undefined });
    if (m !== 'happy' && m !== 'hurt') blush(A, x - 26 * s, y + 13 * s, 6, 3.5), blush(A, x + 26 * s, y + 13 * s, 6, 3.5);
    A.add(`<path d="${poly([[x - 5 * s, y + 10 * s], [x + 5 * s, y + 10 * s], [x, y + 16 * s]])}" fill="${T.b}" stroke="${OL}" stroke-width="2.2"/>`);
    mouth(A, x, y + 18 * s, 4.5 * s, m, 'cat');
    line(A, `M${f(x - 24 * s)} ${f(y + 12 * s)}h-14M${f(x - 24 * s)} ${f(y + 18 * s)}l-13 4M${f(x + 24 * s)} ${f(y + 12 * s)}h14M${f(x + 24 * s)} ${f(y + 18 * s)}l13 4`, 2.2);
    if (m === 'hurt') sweat(A, x + 36 * s, y - 16 * s, 5);
  };
  const diamondTail = (pts, glow) => pts.forEach(([x, y, r, a], i) => {
    if (glow) A.halo(x, y, r * 1.8, Pp.accent.b);
    A.part(P(poly([[x, y - r], [x + r * 0.62, y], [x, y + r], [x - r * 0.62, y]]), `rotate(${a} ${x} ${y})`), i % 2 ? T : B, { s: 3 });
  });
  if (st === 1) {
    ground(A, 98, 46);
    diamondTail([[62, 170, 13, -60], [46, 152, 11, -25], [42, 132, 9, 0]]);
    A.part(P(poly([[80, 136], [120, 136], [130, 160], [126, 182], [74, 182], [70, 160]])), B, { s: 7, inner: `<path d="${poly([[100, 146], [114, 170], [86, 170]])}" fill="${S.b}"/>` });
    A.part(Rr(82, 172, 14, 11, 2), S, { s: 2 }); A.part(Rr(104, 172, 14, 11, 2), S, { s: 2 });
    ears([[70, 102], [68, 66], [96, 90]], [[108, 90], [136, 66], [134, 102]], shrinkTri(0.55));
    A.part(P(poly(ngon(102, 116, 38, 6, 30, 32))), B, { s: 8, inner: `<path d="${poly([[102, 118], [126, 128], [118, 144], [86, 144], [78, 128]])}" fill="${S.b}"/>` });
    mark(A, Pp, 102, 94, 5);
    catFace(102, 116, 0.95);
  } else if (st === 2) {
    ground(A, 100, 54);
    diamondTail([[64, 164, 15, -70], [44, 146, 14, -35], [36, 122, 12, -10], [40, 100, 10, 10]]);
    A.part(P(poly([[80, 110], [122, 110], [138, 146], [128, 182], [72, 182], [62, 146]])), B, { s: 8, inner: `<path d="${poly([[100, 118], [118, 148], [100, 176], [82, 148]])}" fill="${S.b}"/>` + `<path d="${diamd(72, 136, 6)}${diamd(128, 136, 6)}" fill="${T.b}"/>` });
    A.part(Rr(80, 140, 14, 40, 3), B, { s: 3 }); A.part(Rr(108, 140, 14, 40, 3), B, { s: 3 });
    A.part(Rr(78, 172, 18, 11, 2), S, { s: 2 }); A.part(Rr(106, 172, 18, 11, 2), S, { s: 2 });
    ears([[74, 72], [70, 30], [100, 58]], [[108, 58], [140, 30], [136, 72]], shrinkTri(0.55));
    A.part(P(poly(ngon(104, 84, 38, 6, 30, 30))), B, { s: 8, inner: `<path d="${poly([[104, 86], [130, 96], [120, 112], [88, 112], [78, 96]])}" fill="${S.b}"/>` });
    mark(A, Pp, 104, 62, 6);
    catFace(104, 84, 1);
  } else {
    ground(A, 102, 64);
    diamondTail([[62, 164, 16, -70], [42, 146, 15, -40], [30, 122, 14, -15], [30, 96, 13, 5], [38, 72, 11, 20]], true);
    A.part(P(poly([[78, 108], [128, 108], [146, 146], [136, 183], [70, 183], [58, 146]])), B, { s: 9, inner: `<path d="${poly([[103, 120], [124, 150], [103, 178], [82, 150]])}" fill="${S.b}"/>` });
    mark(A, Pp, 103, 150, 8, { glow: true });
    A.part(Rr(78, 140, 16, 42, 3), B, { s: 3 }); A.part(Rr(110, 140, 16, 42, 3), B, { s: 3 });
    A.part(Rr(76, 173, 20, 11, 2), S, { s: 2 }); A.part(Rr(108, 173, 20, 11, 2), S, { s: 2 });
    // faceted triangle mane
    const mane = [];
    for (let i = 0; i < 24; i++) { const a = ((i * 15 - 90) * Math.PI) / 180, r = i % 2 ? 44 : 64; mane.push([106 + Math.cos(a) * r, 80 + Math.sin(a) * r * 0.9, 1]); }
    let facets = '';
    for (let i = 0; i < 24; i += 2) facets += `M106 80L${f(mane[i][0])} ${f(mane[i][1])}L${f(mane[(i + 1) % 24][0])} ${f(mane[(i + 1) % 24][1])}Z`;
    A.part(P(poly(mane)), T, { s: 8, inner: `<path d="${facets}" fill="${T.l}"/>` });
    ears([[76, 62], [66, 16], [100, 48]], [[112, 48], [146, 16], [138, 62]], shrinkTri(0.55));
    A.add(`<path d="M66 16v-10M146 16v-10" stroke="${OL}" stroke-width="4" stroke-linecap="round"/>`);
    A.part(P(poly(ngon(106, 82, 40, 6, 30, 32))), B, { s: 8, inner: `<path d="${poly([[106, 84], [134, 96], [124, 112], [88, 112], [78, 96]])}" fill="${S.b}"/>` });
    crown(A, Pp, 106, 54, 30, 20);
    gem(A, Pp, 106, 60, 5.5, true);
    catFace(106, 84, 1, true);
  }
}

// ---------- mirrorwing: perfectly symmetric fluffy moth
function mirrorwing(A, st, Pp, m) {
  const W = Pp.second, S = Pp.belly, T = Pp.main, X = Pp.accent;
  const M = (pts) => pts.map(([x, y, c]) => [200 - x, y, c]);
  const pair = (pts, col, inner, s = 7) => { A.part(P(blob(pts)), col, { s, inner: inner(false) }); A.part(P(blob(M(pts))), col, { s, inner: inner(true) }); };
  const dm = (flip, arr, col) => arr.map(([x, y, r]) => `<path d="${diamd(flip ? 200 - x : x, y, r)}" fill="${col}" stroke="${OL}" stroke-width="2"/>`).join('');
  const ci = (flip, arr, col) => arr.map(([x, y, r]) => `<circle cx="${flip ? 200 - x : x}" cy="${y}" r="${r}" fill="${col}" stroke="${OL}" stroke-width="2"/>`).join('');
  const antenna = (x1, y1, x2, y2, s, glow) => {
    for (const k of [false, true]) {
      const X1 = k ? 200 - x1 : x1, X2 = k ? 200 - x2 : x2;
      stalk(A, `M${X1} ${y1}Q${(X1 + X2) / 2} ${y2 + 4} ${X2} ${y2}`, S.s, 2.6);
      const fr = leaf([X2, y2 + s * 0.9], [X2 + (k ? 1 : -1) * s * 0.2, y2 - s * 1.1], [X2 + (k ? -1 : 1) * s * 0.3, y2 + s * 0.8], 0.5);
      if (glow) A.halo(X2, y2 - s * 0.2, s * 1.8, X.b);
      A.part(P(blob(fr)), S, { s: 2, sw: 2.6, inner: `<path d="M${X2} ${y2 + s * 0.8}V${y2 - s}M${X2 - s * 0.5} ${y2 - s * 0.2}L${X2} ${y2}L${X2 + s * 0.5} ${y2 - s * 0.2}M${X2 - s * 0.5} ${y2 + s * 0.3}L${X2} ${y2 + s * 0.5}L${X2 + s * 0.5} ${y2 + s * 0.3}" stroke="${S.s}" stroke-width="1.6" fill="none"/>` });
    }
  };
  const fluff = (cx, cy, rx, ry, n) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = (i * Math.PI) / n, r = i % 2 ? 0.86 : 1; pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]); } return pts; };
  const moFace = (y, r, lid) => { eyesOnly(A, Pp, m, 88, y, 112, y, r, { far: 1, farSq: 1, lid: lid ? S.b : undefined }); mouth(A, 100, y + r * 1.45, 4, m, 'cat'); };
  if (st === 1) {
    ground(A, 100, 46);
    pair([[90, 126], [62, 100], [38, 100], [30, 124], [44, 150], [84, 150]], W, (k) => dm(k, [[56, 124, 9]], X.b) + ci(k, [[44, 110, 4], [44, 138, 4]], T.b), 5);
    antenna(92, 108, 78, 78, 11);
    A.part(E(88, 181, 9, 5), S, { s: 2 }); A.part(E(112, 181, 9, 5), S, { s: 2 });
    A.part(P(blob([[100, 104], [124, 112], [134, 140], [126, 170], [100, 182], [74, 170], [66, 140], [76, 112]])), S, { s: 8 });
    A.part(P(blob(fluff(100, 163, 27, 10, 7))), Pp.white, { s: 3 });
    moFace(131, 10);
  } else if (st === 2) {
    ground(A, 100, 56);
    pair([[92, 132], [66, 158], [44, 172], [30, 160], [40, 136], [80, 124]], W, (k) => dm(k, [[52, 154, 8]], T.b), 5);
    pair([[92, 112], [64, 76], [34, 60], [14, 74], [18, 108], [44, 130], [88, 132]], W, (k) => `<path d="${blob(k ? M([[84, 116], [62, 88], [36, 74], [26, 84], [30, 106], [50, 122]]) : [[84, 116], [62, 88], [36, 74], [26, 84], [30, 106], [50, 122]])}" fill="none" stroke="${W.l}" stroke-width="3"/>` + dm(k, [[50, 98, 12]], X.b) + ci(k, [[30, 82, 5], [70, 112, 4]], T.b), 7);
    antenna(92, 90, 74, 52, 14);
    A.part(E(88, 181, 10, 5), S, { s: 2 }); A.part(E(112, 181, 10, 5), S, { s: 2 });
    A.part(P(blob([[100, 86], [124, 96], [134, 132], [126, 166], [100, 180], [74, 166], [66, 132], [76, 96]])), S, { s: 9 });
    A.part(P(blob(fluff(100, 140, 32, 12, 8))), Pp.white, { s: 3 });
    mark(A, Pp, 100, 162, 6);
    moFace(112, 10);
  } else {
    ground(A, 100, 64);
    A.halo(100, 96, 96, X.b);
    pair([[92, 130], [62, 150], [34, 176], [14, 170], [14, 144], [44, 124], [84, 118]], W, (k) => dm(k, [[36, 152, 10]], T.b) + ci(k, [[22, 166, 4]], X.l), 6);
    pair([[92, 108], [66, 64], [36, 30], [10, 30], [4, 64], [12, 100], [40, 122], [88, 124]], W, (k) => `<path d="${blob(k ? M([[84, 110], [62, 74], [36, 44], [18, 46], [16, 80], [24, 102], [48, 116]]) : [[84, 110], [62, 74], [36, 44], [18, 46], [16, 80], [24, 102], [48, 116]])}" fill="none" stroke="${X.l}" stroke-width="3.5"/>` + dm(k, [[44, 82, 15]], X.l) + dm(k, [[44, 82, 6]], T.b) + ci(k, [[22, 50, 5], [20, 92, 4], [72, 110, 4]], T.b), 8);
    for (const x of [44, 156]) A.halo(x, 82, 18, X.b);
    antenna(92, 76, 70, 30, 17, true);
    A.part(E(88, 182, 11, 5), S, { s: 2 }); A.part(E(112, 182, 11, 5), S, { s: 2 });
    A.part(P(blob([[100, 70], [126, 82], [138, 124], [128, 164], [100, 180], [72, 164], [62, 124], [74, 82]])), S, { s: 10 });
    A.part(P(blob(fluff(100, 132, 38, 15, 9))), Pp.white, { s: 4 });
    mark(A, Pp, 100, 158, 8, { glow: true });
    gem(A, Pp, 100, 78, 6, true);
    moFace(102, 10.5, true);
  }
}

// ---------- datapup: puppy with bar-graph ear tufts
const rrd = (x, y, w, h, r) => `M${f(x + r)} ${f(y)}h${f(w - 2 * r)}a${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(r)}v${f(h - 2 * r)}a${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(r)}h${f(2 * r - w)}a${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(-r)}v${f(2 * r - h)}a${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(-r)}Z`;
function barTuft(A, Pp, x0, yb, w, hs, gap = 1.5, glow, ang = 0) {
  const px = x0 + (hs.length * (w + gap)) / 2, tf = ang ? `rotate(${ang} ${f(px)} ${yb})` : '';
  let d = '', caps = '';
  hs.forEach((h, i) => { const x = x0 + i * (w + gap); d += rrd(x, yb - h, w, h + 8, w * 0.3); caps += `M${f(x)} ${f(yb - h + 2.5)}h${w}`; });
  A.part(P(d, tf || undefined), Pp.accent, { s: 2.5, sw: 3, inner: `<path d="${caps}" stroke="${glow ? '#fff' : Pp.accent.l}" stroke-width="5"${tf ? ` transform="${tf}"` : ''}/>` });
}
function datapup(A, st, Pp, m) {
  const B = Pp.main, S = Pp.belly;
  const pupFace = (x, y, s, o = {}) => {
    eyesOnly(A, Pp, m, x - 16 * s, y, x + 16 * s, y, 10 * s, { far: 1, farSq: 0.95, lid: o.lid ? B.b : undefined });
    nose(A, x, y + 13 * s, 5 * s);
    if (m === 'idle' && !o.lid) mouth(A, x, y + 19 * s, 5 * s, 'happy');
    else mouth(A, x, y + 19 * s, 5 * s, m, 'cat', { fang: o.fang });
  };
  const collar = (d, tx, ty, glow) => { A.add(`<path d="${d}" fill="none" stroke="${OL}" stroke-width="9" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${Pp.accent.b}" stroke-width="4.5" stroke-linecap="round"/>`); mark(A, Pp, tx, ty, 6, { glow }); };
  if (st === 1) {
    ground(A, 100, 46);
    foxTail(A, [80, 164], [50, 160], [52, 128], 11, B, Pp.accent, { s: 4 });
    A.part(P(blob([[100, 132], [122, 138], [130, 162], [126, 182], [76, 182], [70, 162], [78, 138]])), B, { s: 7, inner: `<path d="${blob([[100, 144], [114, 148], [112, 172], [100, 178], [88, 172], [88, 148]])}" fill="${S.b}"/>` });
    A.part(E(90, 180, 10, 6), S, { s: 2 }); A.part(E(114, 180, 10, 6), S, { s: 2 });
    barTuft(A, Pp, 64, 98, 8, [14, 22, 30], 1.5, false, -28);
    barTuft(A, Pp, 116, 96, 8, [30, 22, 14], 1.5, false, 28);
    A.part(P(blob([[104, 82], [132, 86], [146, 106], [142, 128], [122, 140], [104, 142], [86, 140], [66, 128], [62, 106], [76, 86]])), B, { s: 8, inner: `<ellipse cx="122" cy="108" rx="15" ry="13" fill="${Pp.second.b}"/><ellipse cx="106" cy="128" rx="22" ry="13" fill="${S.b}"/>` });
    collar('M80 140Q102 150 124 140', 102, 150);
    pupFace(106, 110, 1);
  } else if (st === 2) {
    ground(A, 102, 60);
    foxTail(A, [62, 128], [30, 120], [34, 82], 14, B, Pp.accent, { s: 5 });
    const leg = (pts) => A.part(P(blob(pts)), B, { s: 3 });
    leg([[66, 146], [80, 146], [78, 180], [66, 181]]); leg([[118, 146], [132, 146], [132, 180], [120, 181]]);
    A.part(E(73, 182, 9, 4.5), S, { s: 2 }); A.part(E(127, 182, 9, 4.5), S, { s: 2 });
    A.part(P(blob([[64, 120], [104, 114], [132, 120], [146, 138], [136, 156], [100, 158], [66, 156], [52, 138]])), B, { s: 8, inner: E(100, 158, 32, 9).replace('/>', ` fill="${S.b}"/>`) + `<path d="M62 128l10 -6l10 6l10 -6" fill="none" stroke="${Pp.second.b}" stroke-width="4" stroke-linejoin="round"/>` });
    leg([[76, 150], [92, 150], [90, 182], [78, 182]]); leg([[128, 142], [144, 140], [144, 180], [130, 182]]);
    A.part(E(85, 183, 10, 5), S, { s: 2 }); A.part(E(138, 183, 10, 5), S, { s: 2 });
    A.part(P(poly([[118, 110], [158, 104], [140, 136]])), Pp.accent, { s: 3 });
    barTuft(A, Pp, 104, 70, 7, [12, 18, 24, 30], 1.5, false, -26);
    barTuft(A, Pp, 150, 68, 7, [30, 24, 18, 12], 1.5, false, 26);
    A.part(P(blob([[142, 56], [166, 60], [178, 78], [174, 98], [158, 110], [140, 112], [122, 108], [108, 96], [106, 76], [118, 60]])), B, { s: 8, inner: `<ellipse cx="160" cy="80" rx="13" ry="12" fill="${Pp.second.b}"/><ellipse cx="146" cy="98" rx="20" ry="12" fill="${S.b}"/>` });
    mark(A, Pp, 140, 122, 5);
    pupFace(145, 82, 0.95);
  } else {
    ground(A, 102, 70);
    foxTail(A, [58, 120], [8, 120], [22, 60], 20, B, Pp.accent, { s: 7 });
    mark(A, Pp, 22, 64, 8, { glow: true });
    const leg = (pts, bolt) => { A.part(P(blob(pts)), B, { s: 4 }); };
    leg([[60, 146], [76, 146], [74, 181], [60, 182]]); leg([[118, 146], [134, 146], [134, 181], [120, 182]]);
    A.part(E(68, 183, 10, 4.5), S, { s: 2 }); A.part(E(127, 183, 10, 4.5), S, { s: 2 });
    A.part(P(blob([[58, 114], [104, 106], [136, 112], [152, 132], [142, 154], [100, 158], [62, 156], [44, 136]])), B, { s: 9, inner: E(100, 158, 36, 10).replace('/>', ` fill="${S.b}"/>`) });
    leg([[70, 150], [90, 150], [88, 182], [72, 183]]); leg([[132, 140], [150, 138], [150, 181], [134, 183]]);
    A.part(E(80, 184, 11, 5), S, { s: 2 }); A.part(E(143, 184, 11, 5), S, { s: 2 });
    mark(A, Pp, 80, 166, 6, { glow: true }); mark(A, Pp, 141, 162, 6, { glow: true });
    A.part(P(blob([[114, 96, 1], [128, 104], [138, 94, 1], [150, 104], [164, 96, 1], [172, 112], [162, 130, 1], [156, 122], [150, 142, 1], [142, 126], [134, 140, 1], [130, 122], [116, 128, 1], [118, 110]])), S, { s: 5 });
    A.halo(122, 40, 22, Pp.accent.b); A.halo(172, 38, 22, Pp.accent.b);
    barTuft(A, Pp, 108, 58, 7, [16, 24, 32, 40], 1.5, true, -24);
    barTuft(A, Pp, 156, 56, 7, [40, 32, 24, 16], 1.5, true, 24);
    A.part(P(blob([[146, 42], [172, 48], [184, 68], [180, 88], [162, 100], [144, 102], [124, 98], [110, 84], [110, 62], [124, 48]])), B, { s: 8, inner: `<ellipse cx="166" cy="70" rx="13" ry="12" fill="${Pp.second.b}"/><ellipse cx="150" cy="88" rx="22" ry="13" fill="${S.b}"/>` });
    pupFace(149, 71, 0.98, { lid: true, fang: true });
  }
}

// ---------- chancewing: gull with dice spots and a spinner tail
function chancewing(A, st, Pp, m) {
  const B = Pp.belly, Wg = Pp.main, D = Pp.second, Y = Pp.accent;
  const spinner = (cx, cy, r, a0, a1, n, glow) => {
    const cols = [Wg.b, Y.b, D.b, Pp.white.b];
    let d = '';
    const step = (a1 - a0) / n;
    for (let i = 0; i < n; i++) d += `<path d="${sector(cx, cy, r, a0 + i * step, a0 + (i + 1) * step)}" fill="${cols[i % 4]}" stroke="${OL}" stroke-width="2.5"/>`;
    if (glow) A.halo(cx, cy, r * 1.3, Y.b);
    A.part(P(sector(cx, cy, r, a0, a1)), Wg, { s: 3, inner: d });
    const am = ((a0 + (a1 - a0) * 0.62) * Math.PI) / 180;
    A.add(`<path d="M${cx} ${cy}L${f(cx + Math.sin(am) * r * 0.78)} ${f(cy - Math.cos(am) * r * 0.78)}" stroke="${OL}" stroke-width="4.5" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="4" fill="${Y.b}" stroke="${OL}" stroke-width="2"/>`);
  };
  const pips = (x, y, s, n) => {
    const P5 = { 3: [[-1, -1], [0, 0], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[n];
    return P5.map(([a, b]) => `<circle cx="${f(x + a * s)}" cy="${f(y + b * s)}" r="${f(s * 0.42)}" fill="${Pp.white.b}"/>`).join('');
  };
  const beak = (x, y, s) => A.part(P(blob([[x, y - 5 * s], [x + 16 * s, y - 1 * s], [x + 22 * s, y + 3 * s, 1], [x + 10 * s, y + 6 * s], [x, y + 5 * s]])), Y, { s: 2, sw: 3 });
  const feet = (x, y) => A.add(`<path d="M${x - 8} ${y + 2}L${x} ${y - 6}L${x + 8} ${y + 2}Q${x} ${y - 1} ${x - 8} ${y + 2}Z" fill="${Y.b}" stroke="${OL}" stroke-width="2.5"/>`);
  if (st === 1) {
    ground(A, 100, 40);
    spinner(66, 158, 26, 230, 320, 3);
    feet(90, 183); feet(112, 183);
    A.part(P(blob([[102, 104], [130, 112], [142, 140], [134, 170], [104, 180], [74, 172], [64, 144], [74, 116]])), B, { s: 8 });
    A.part(P(blob([[70, 132], [100, 136], [106, 156], [90, 170], [66, 164]])), Wg, { s: 4, inner: `<rect x="74" y="140" width="22" height="22" rx="5" fill="${D.b}"/>` + pips(85, 151, 6, 3) });
    A.part(P(blob([[100, 106], [96, 90, 1], [106, 100], [114, 90, 1], [112, 106]])), Wg, { s: 2, sil: false });
    eyesOnly(A, Pp, m, 104, 126, 128, 126, 9.5);
    beak(128, 138, 1);
    if (m === 'happy') mouth(A, 132, 146, 3, 'happy');
  } else if (st === 2) {
    ground(A, 100, 50);
    spinner(62, 146, 36, 220, 330, 4);
    stalk(A, 'M92 164V180', Y.b, 3); stalk(A, 'M112 164V180', Y.b, 3);
    feet(92, 183); feet(112, 183);
    A.part(P(blob([[104, 66], [132, 76], [144, 110], [140, 148], [118, 170], [88, 170], [66, 150], [64, 110], [76, 78]])), B, { s: 9 });
    A.part(P(blob([[64, 102], [96, 108], [108, 136], [100, 160], [74, 176, 1], [58, 150]])), Wg, { s: 5, inner: `<rect x="70" y="118" width="28" height="28" rx="6" fill="${D.b}"/>` + pips(84, 132, 8, 5) + `<path d="M62 162L84 154M66 170L86 162" stroke="${Wg.s}" stroke-width="3"/>` });
    A.part(P(blob([[98, 68], [92, 44, 1], [106, 58], [114, 40, 1], [118, 62], [128, 52, 1], [126, 72]])), Wg, { s: 3 });
    eyesOnly(A, Pp, m, 104, 94, 130, 94, 10);
    beak(130, 106, 1.15);
    if (m === 'happy') mouth(A, 136, 116, 3.5, 'happy');
    mark(A, Pp, 118, 146, 5);
  } else {
    ground(A, 100, 60);
    A.halo(100, 90, 90, Y.b);
    spinner(84, 150, 42, 196, 344, 6, true);
    const wing = [[88, 104], [60, 80], [30, 50], [6, 34, 1], [16, 60], [8, 72, 1], [24, 86], [16, 100, 1], [36, 108], [32, 120, 1], [56, 122], [80, 128]];
    const dice = (x, y, s, n) => `<rect x="${x - s * 1.8}" y="${y - s * 1.8}" width="${s * 3.6}" height="${s * 3.6}" rx="${s * 0.8}" fill="${D.b}" stroke="${OL}" stroke-width="2"/>` + pips(x, y, s, n);
    A.part(P(blob(wing)), Wg, { s: 7, inner: dice(44, 84, 7, 6) + `<path d="M20 64L40 70M24 90L44 94M40 110L58 110" stroke="${Wg.s}" stroke-width="3"/>` });
    A.part(P(blob(wing.map(([x, y, c]) => [206 - x, y - 6, c]))), Wg, { s: 7, inner: dice(162, 78, 7, 5) + `<path d="M186 58L166 64M182 84L162 88M166 104L148 104" stroke="${Wg.s}" stroke-width="3"/>` });
    stalk(A, 'M94 166V180', Y.b, 3.5); stalk(A, 'M116 166V180', Y.b, 3.5);
    feet(94, 184); feet(116, 184);
    A.part(P(blob([[106, 58], [134, 68], [146, 104], [142, 142], [120, 170], [90, 170], [68, 146], [66, 104], [78, 70]])), B, { s: 10 });
    mark(A, Pp, 106, 142, 9, { glow: true });
    A.part(P(blob([[98, 62], [88, 30, 1], [106, 50], [114, 22, 1], [120, 50], [136, 36, 1], [130, 66]])), Wg, { s: 3 });
    eyesOnly(A, Pp, m, 106, 88, 132, 88, 10, { lid: B.b });
    beak(132, 100, 1.25);
    if (m === 'happy') mouth(A, 138, 112, 3.5, 'happy');
  }
}

// ---------- coinling: otter with a shiny coin on its belly
function coinling(A, st, Pp, m) {
  const B = Pp.second, S = Pp.belly, Y = Pp.accent;
  const coin = (x, y, r, glow) => {
    if (glow) A.halo(x, y, r * 1.8, Y.b);
    A.part(Ci(x, y, r), Y, { s: 4, inner: `<circle cx="${x}" cy="${y}" r="${f(r * 0.72)}" fill="none" stroke="${Y.s}" stroke-width="2.5"/>` });
    A.add(`<path d="${boltd(x, y, r * 0.5)}" fill="${Y.l}" stroke="${OL}" stroke-width="2"/><path d="M${f(x - r * 0.5)} ${f(y - r * 0.62)}q${f(r * 0.3)} ${f(-r * 0.2)} ${f(r * 0.6)} ${f(-r * 0.14)}" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
  };
  const otterHead = (x, y, s, o = {}) => {
    const T = (pts) => pts.map(([a, b, c]) => [x + a * s, y + b * s, c]);
    A.part(Ci(x - 28 * s, y - 18 * s, 8 * s), B, { s: 2, inner: Ci(x - 27 * s, y - 17 * s, 4 * s).replace('/>', ` fill="${Pp.dark.b}"/>`) });
    A.part(Ci(x + 26 * s, y - 20 * s, 8 * s), B, { s: 2, inner: Ci(x + 25 * s, y - 19 * s, 4 * s).replace('/>', ` fill="${Pp.dark.b}"/>`) });
    A.part(P(blob(T([[0, -30], [26, -26], [38, -8], [36, 14], [18, 26], [0, 28], [-20, 26], [-38, 14], [-40, -8], [-26, -26]]))), B, { s: 7 * s, inner: `<path d="${blob(T([[0, 0], [18, -2], [34, 10], [18, 24], [0, 27], [-20, 24], [-36, 10], [-18, -2]]))}" fill="${S.b}"/>` });
    eyesOnly(A, Pp, m, x - 15 * s, y - 6 * s, x + 15 * s, y - 6 * s, 9 * s, { far: 1, farSq: 0.95, lid: o.lid ? B.b : undefined });
    nose(A, x, y + 6 * s, 5 * s);
    mouth(A, x, y + 12 * s, 4.5 * s, m, 'cat');
    line(A, `M${f(x - 12 * s)} ${f(y + 10 * s)}l-18 -3M${f(x - 12 * s)} ${f(y + 14 * s)}l-17 3M${f(x + 12 * s)} ${f(y + 10 * s)}l18 -3M${f(x + 12 * s)} ${f(y + 14 * s)}l17 3`, 2);
  };
  if (st === 1) {
    ground(A, 98, 48);
    foxTail(A, [80, 172], [40, 186], [26, 164], 10, B, null, { s: 3 });
    A.part(P(blob([[100, 126], [124, 134], [132, 160], [126, 182], [74, 182], [68, 160], [76, 134]])), B, { s: 7, inner: `<path d="${blob([[100, 136], [118, 144], [118, 170], [100, 178], [82, 170], [82, 144]])}" fill="${S.b}"/>` });
    A.part(E(86, 181, 11, 6), B, { s: 2 }); A.part(E(114, 181, 11, 6), B, { s: 2 });
    coin(100, 158, 13);
    A.part(E(84, 152, 6, 8, -30), B, { s: 2 }); A.part(E(116, 152, 6, 8, 30), B, { s: 2 });
    otterHead(100, 110, 0.95);
  } else if (st === 2) {
    ground(A, 98, 58);
    foxTail(A, [74, 168], [24, 186], [14, 150], 13, B, null, { s: 4 });
    A.part(E(84, 181, 14, 7), B, { s: 3 }); A.part(E(118, 181, 14, 7), B, { s: 3 });
    A.part(P(blob([[100, 96], [126, 106], [138, 140], [132, 172], [112, 182], [88, 182], [68, 172], [62, 140], [74, 106]])), B, { s: 8, inner: `<path d="${blob([[100, 108], [122, 118], [124, 160], [100, 176], [76, 160], [78, 118]])}" fill="${S.b}"/>` });
    coin(100, 144, 18);
    A.part(E(76, 136, 7, 14, -25), B, { s: 3 }); A.part(E(124, 136, 7, 14, 25), B, { s: 3 });
    otterHead(100, 76, 1.05);
  } else {
    ground(A, 98, 68);
    foxTail(A, [70, 164], [6, 186], [6, 130], 17, B, null, { s: 5 });
    A.part(E(80, 182, 16, 7), B, { s: 3 }); A.part(E(122, 182, 16, 7), B, { s: 3 });
    A.part(P(blob([[100, 84], [132, 96], [148, 136], [142, 170], [118, 183], [82, 183], [58, 170], [52, 136], [68, 96]])), B, { s: 9, inner: `<path d="${blob([[100, 98], [126, 110], [130, 156], [100, 176], [70, 156], [74, 110]])}" fill="${S.b}"/>` });
    // wave mane
    A.part(P(blob([[64, 90], [80, 84, 1], [86, 96], [100, 84, 1], [114, 96], [120, 84, 1], [136, 90], [138, 104], [122, 110, 1], [110, 104], [100, 112, 1], [90, 104], [78, 110, 1], [62, 104]])), Pp.main, { s: 4 });
    coin(100, 140, 22, true);
    A.part(E(68, 134, 8, 16, -20), B, { s: 3 }); A.part(E(132, 132, 8, 16, 20), B, { s: 3 });
    mark(A, Pp, 60, 160, 6, { glow: true }); mark(A, Pp, 140, 160, 6, { glow: true });
    otterHead(100, 62, 1.1, { lid: true });
    crown(A, Pp, 100, 34, 30, 20, 3, Y);
  }
}

const SPECIES = {
  numberling: { el: 'star', names: ['Numbit', 'Numbunny', 'Numerion'], draw: numberling },
  counter: { el: 'star', names: ['Beadle', 'Abacub', 'Abacastor'], draw: counter },
  fractling: { el: 'star', names: ['Slicepig', 'Pieshog', 'Fractorn'], draw: fractling },
  percenta: { el: 'star', names: ['Hootcent', 'Percowl', 'Percentaur'], draw: percenta },
  addsub: { el: 'star', names: ['Plux', 'Pluxfox', 'Summitail'], draw: addsub },
  factsprite: { el: 'star', names: ['Flick', 'Flickwing', 'Factaria'], draw: factsprite },
  multiplier: { el: 'star', names: ['Tailix', 'Twintail', 'Myriafox'], draw: multiplier },
  orderling: { el: 'star', names: ['Bracky', 'Brackoon', 'Ordermask'], draw: orderling },
  patternkin: { el: 'vine', names: ['Loopling', 'Cocoonit', 'Repeatterfly'], draw: patternkin },
  balancer: { el: 'vine', names: ['Teeter', 'Seesabug', 'Equilibeetle'], draw: balancer },
  clockwork: { el: 'stone', names: ['Tickle', 'Sundialtle', 'Chronoshell'], draw: clockwork },
  measurer: { el: 'stone', names: ['Inchy', 'Rulerraffe', 'Metrosaur'], draw: measurer },
  angler: { el: 'stone', names: ['Clawtri', 'Protractab', 'Anglimar'], draw: angler },
  shapeshifter: { el: 'stone', names: ['Polykit', 'Hexcat', 'Tessellynx'], draw: shapeshifter },
  mirrorwing: { el: 'stone', names: ['Mothy', 'Mirromoth', 'Symmetrix'], draw: mirrorwing },
  datapup: { el: 'storm', names: ['Barky', 'Graphound', 'Datawolf'], draw: datapup },
  chancewing: { el: 'storm', names: ['Dicelet', 'Spinwing', 'Probabird'], draw: chancewing },
  coinling: { el: 'storm', names: ['Pennotter', 'Loonotter', 'Treasotter'], draw: coinling },
  ...PETS_A, ...PETS_B, ...PETS_C, ...PETS_D,
};

export const SPECIES_ART = Object.fromEntries(Object.entries(SPECIES).map(([id, s]) => [id, { name1: s.names[0], name2: s.names[1], name3: s.names[2], element: s.el }]));

// sparkle positions around each stage's bounding area (rare variant)
const SPARKS = {
  1: [[40, 80, 9], [160, 70, 7], [150, 150, 6], [48, 150, 5]],
  2: [[30, 60, 10], [172, 50, 8], [170, 140, 7], [34, 150, 6], [150, 20, 5]],
  3: [[20, 50, 11], [184, 60, 9], [186, 150, 7], [18, 150, 7], [100, 6, 6]],
};

export function creatureSVG(speciesId, stage = 1, opts = {}) {
  const sp = SPECIES[speciesId] || SPECIES.numberling;
  const st = Math.max(1, Math.min(3, stage | 0 || 1));
  const rare = opts.variant === 'rare';
  const Pp = palette(sp.el, opts.variant);
  const A = new Art('c');
  sp.draw(A, st, Pp, opts.mood || 'idle');
  let post = '';
  if (rare) {
    post = `<path d="${SPARKS[st].map(([x, y, r]) => star4d(x, y, r, 0.18)).join('')}" fill="#fffbe6" stroke="${OL}" stroke-width="1.6"/><path d="${SPARKS[st].map(([x, y, r]) => `M${x + r} ${y + r}h.1`).join('')}" stroke="#fff4b0" stroke-width="3" stroke-linecap="round"/>`;
  }
  const tf = opts.facing === 'left' ? 'translate(200 0) scale(-1 1)' : '';
  return A.svg('0 0 200 200', tf, '', post);
}

// ================================================================= GUARDIANS (260 x 260, ground y≈245)
function starRing(A, cx, cy, r, n, col, size = 6) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    A.back += sparkle(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.85, i % 2 ? size * 0.7 : size, col, OL, 1.5);
  }
}
function aura(A, cx, cy, r, col) {
  A.back += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${A.glow(col)})"/>`;
  A.back += `<circle cx="${cx}" cy="${cy}" r="${f(r * 0.78)}" fill="none" stroke="${col}" stroke-width="3" stroke-dasharray="4 10" stroke-linecap="round" opacity=".8"/>`;
}
function gShadow(A, cx, w) { A.back += `<ellipse cx="${cx}" cy="246" rx="${w}" ry="${f(w * 0.14 + 2)}" fill="${OL}" opacity=".2"/>`; }

// Starfall: crystal-antlered astral stag
function gNumber(A, Pp, m) {
  aura(A, 132, 120, 124, Pp.accent.b);
  starRing(A, 132, 120, 106, 6, Pp.accent.l, 7);
  gShadow(A, 138, 90);
  const hoof = (x, y) => A.part(Rr(x - 11, y - 9, 22, 11, 4), Pp.second, { s: 2 });
  const leg = (pts) => A.part(P(blob(pts)), Pp.main, { s: 5 });
  leg([[82, 168], [104, 168], [98, 236], [84, 236]]); hoof(91, 243);
  leg([[162, 166], [184, 166], [184, 236], [168, 236]]); hoof(176, 243);
  A.part(P(poly([[66, 142], [36, 122], [48, 146], [28, 154], [56, 162], [70, 158]])), Pp.gem, { s: 3 });
  A.part(Ci(64, 148, 15), Pp.white, { s: 3 });
  A.part(P(blob([[74, 128], [130, 118], [178, 126], [200, 148], [190, 180], [134, 188], [84, 186], [58, 162]])), Pp.main, { s: 11, inner: E(134, 188, 50, 13).replace('/>', ` fill="${Pp.belly.b}"/>`) + `<path d="${star4d(118, 140, 7)}${star4d(140, 150, 5)}${star4d(158, 136, 4)}" fill="${Pp.accent.l}"/>` });
  A.part(P(blob([[74, 136], [106, 142], [118, 170], [106, 194], [80, 194], [62, 170]])), Pp.main, { s: 9, sw: 0 });
  line(A, 'M80 138Q112 146 116 170Q114 188 104 196', 3.6);
  leg([[90, 180], [114, 180], [108, 238], [92, 240]]); hoof(100, 246);
  leg([[176, 160], [198, 158], [198, 238], [180, 240]]); hoof(189, 246);
  mark(A, Pp, 90, 166, 10, { glow: true });
  A.part(P(blob([[158, 146], [164, 110], [178, 80], [206, 74], [216, 92], [204, 120], [200, 158]])), Pp.main, { s: 7 });
  A.part(P(blob([[156, 118, 1], [170, 110], [176, 96, 1], [190, 106], [200, 92, 1], [208, 104], [220, 96, 1], [212, 124], [204, 142, 1], [194, 130], [186, 152, 1], [176, 134], [164, 150, 1], [166, 132]])), Pp.white, { s: 5 });
  for (const d of ['M196 60Q180 34 162 12', 'M186 42L160 38', 'M176 28L184 6', 'M214 56Q226 30 248 16', 'M224 38L248 42']) stalk(A, d, Pp.gem.b, 5.5);
  for (const [x, y] of [[162, 12], [160, 38], [184, 6], [248, 16], [248, 42]]) { A.halo(x, y, 14, Pp.accent.b); A.add(sparkle(x, y, 7, Pp.accent.l, OL, 2)); }
  A.part(P(blob(leaf([192, 66], [164, 54], [190, 80], 0.35))), Pp.main, { s: 3, inner: `<path d="${blob(leaf([190, 68], [172, 58], [190, 78], 0.25))}" fill="${Pp.pink.b}"/>` });
  A.part(P(blob([[186, 58], [214, 50], [238, 62], [252, 80], [240, 94], [212, 98], [192, 90], [180, 74]])), Pp.main, { s: 7, inner: `<path d="${blob([[222, 80], [244, 76], [252, 86], [240, 95], [218, 96]])}" fill="${Pp.belly.b}"/>` });
  A.part(P(blob(leaf([218, 56], [236, 30], [228, 64], 0.35))), Pp.main, { s: 3, inner: `<path d="${blob(leaf([220, 56], [234, 38], [226, 62], 0.25))}" fill="${Pp.pink.b}"/>` });
  gem(A, Pp, 212, 60, 6.5, true);
  eyesOnly(A, Pp, m, 204, 74, 227, 73, 9, { far: 0.9, lid: Pp.main.b });
  A.add(`<circle cx="250" cy="83" r="3.6" fill="${OL}"/>`);
  mouth(A, 240, 92, 3.5, m, 'smile');
}

// Tanglewood: leaf-maned forest lion
function gPatterns(A, Pp, m) {
  aura(A, 130, 120, 124, Pp.accent.b);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.4; A.back += `<path d="${blob(leafd(130 + Math.cos(a) * 108, 120 + Math.sin(a) * 94, 7, (a * 180) / Math.PI))}" fill="${i % 2 ? Pp.second.l : Pp.accent.l}" stroke="${OL}" stroke-width="1.8"/>`; }
  gShadow(A, 128, 90);
  // spiral vine tail
  stalk(A, 'M78 220Q30 226 26 190Q24 160 50 160Q70 162 62 182', Pp.main.s, 6);
  A.part(P(blob(leafd(60, 184, 12, 150))), Pp.accent, { s: 3 });
  A.part(P(blob([[120, 128], [166, 140], [184, 184], [180, 230], [152, 246], [96, 246], [70, 226], [76, 168]])), Pp.main, { s: 11, inner: `<path d="${blob([[128, 150], [156, 160], [160, 214], [130, 236], [106, 214], [106, 164]])}" fill="${Pp.belly.b}"/>` + `<path d="${spiralD(96, 184, 14, 1.6, 1)}" stroke="${Pp.accent.b}" stroke-width="4" fill="none" stroke-linecap="round"/>` });
  A.part(P(blob([[70, 188], [100, 196], [110, 222], [100, 246], [66, 246], [56, 220]])), Pp.main, { s: 8, sw: 0 });
  line(A, 'M74 190Q104 198 108 222Q106 238 100 246', 3.6);
  A.part(E(84, 246, 22, 7), Pp.main, { s: 3 });
  A.part(P(blob([[150, 186], [172, 186], [172, 238], [152, 240]])), Pp.main, { s: 4 });
  A.part(E(164, 245, 16, 7), Pp.belly, { s: 3, inner: `<path d="M160 250v-6M168 250v-6" stroke="${OL}" stroke-width="2"/>` });
  // leaf mane
  const mane = [];
  for (let i = 0; i < 24; i++) { const a = ((i * 15 - 90) * Math.PI) / 180, r = i % 2 ? 58 : 84; mane.push([150 + Math.cos(a) * r, 100 + Math.sin(a) * r * 0.9, i % 2 ? 0 : 1]); }
  let petals = '';
  for (let i = 0; i < 12; i++) { const a = ((i * 30 - 75) * Math.PI) / 180; petals += `<path d="${blob(leafd(150 + Math.cos(a) * 50, 100 + Math.sin(a) * 47, 10, i * 30 + 15))}" fill="${i % 2 ? Pp.second.b : Pp.accent.b}" stroke="${OL}" stroke-width="2"/>`; }
  A.part(P(blob(mane)), Pp.dark, { s: 9, inner: petals });
  A.part(Ci(124, 64, 12), Pp.main, { s: 3, inner: Ci(125, 65, 6).replace('/>', ` fill="${Pp.dark.b}"/>`) });
  A.part(Ci(176, 64, 12), Pp.main, { s: 3, inner: Ci(175, 65, 6).replace('/>', ` fill="${Pp.dark.b}"/>`) });
  A.part(P(blob([[150, 62], [176, 68], [188, 92], [184, 118], [164, 134], [150, 136], [136, 134], [116, 118], [112, 92], [124, 68]])), Pp.main, { s: 8, inner: `<path d="${blob([[150, 108], [170, 104], [180, 118], [166, 132], [150, 136], [134, 132], [120, 118], [130, 104]])}" fill="${Pp.belly.b}"/>` });
  for (const [x, y] of [[124, 62], [136, 52], [150, 48], [164, 52], [176, 62]]) A.add(`<path d="${star4d(x, y, 9, 0.45)}" fill="${Pp.second.l}" stroke="${OL}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="3" fill="${Pp.accent.b}"/>`);
  eyesOnly(A, Pp, m, 136, 96, 164, 96, 9.5, { far: 1, farSq: 1, lid: Pp.main.b });
  nose(A, 150, 112, 6);
  mouth(A, 150, 120, 5, m, 'cat', { fang: true });
}

// Stoneworks: geometric crystal-core golem
function gShape(A, Pp, m) {
  aura(A, 130, 124, 124, Pp.accent.b);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.5; A.back += `<path d="${diamd(130 + Math.cos(a) * 110, 124 + Math.sin(a) * 96, 8)}" fill="${Pp.accent.l}" stroke="${OL}" stroke-width="2"/>`; }
  gShadow(A, 130, 92);
  const block = (pts, col, s = 6, inner) => A.part(P(poly(pts)), col, { s, inner });
  block([[92, 196], [126, 196], [128, 238], [88, 238]], Pp.second);
  block([[134, 196], [168, 196], [172, 238], [132, 238]], Pp.second);
  block([[82, 236], [130, 236], [132, 248], [80, 248]], Pp.main, 3);
  block([[130, 236], [178, 236], [180, 248], [128, 248]], Pp.main, 3);
  block([[76, 94], [184, 94], [206, 150], [178, 204], [82, 204], [54, 150]], Pp.main, 12, `<path d="M76 94L102 150L82 204M184 94L158 150L178 204M102 150H158" stroke="${Pp.main.s}" stroke-width="3" fill="none"/>`);
  A.halo(130, 148, 40, Pp.accent.b);
  block([[130, 118], [154, 148], [130, 180], [106, 148]], Pp.accent, 5, `<path d="M130 118V180M106 148H154" stroke="${Pp.accent.l}" stroke-width="3"/>`);
  block(ngon(62, 104, 26, 6, 30, 22), Pp.second, 5, `<path d="${diamd(62, 104, 8)}" fill="${Pp.accent.b}"/>`);
  block(ngon(198, 104, 26, 6, 30, 22), Pp.second, 5, `<path d="${diamd(198, 104, 8)}" fill="${Pp.accent.b}"/>`);
  // floating fists
  block([[22, 156], [58, 150], [64, 190], [26, 196]], Pp.second, 6, `<path d="M26 170h36M28 182h34" stroke="${Pp.second.s}" stroke-width="3"/>`);
  block([[202, 150], [238, 156], [234, 196], [196, 190]], Pp.second, 6, `<path d="M198 170h36M198 182h34" stroke="${Pp.second.s}" stroke-width="3"/>`);
  A.add(`<path d="M44 132v10M40 140l-4 4M216 132v10M220 140l4 4" stroke="${Pp.accent.b}" stroke-width="3" stroke-linecap="round"/>`);
  block([[100, 34], [160, 34], [172, 62], [160, 94], [100, 94], [88, 62]], Pp.main, 7, `<path d="M104 58h52v18H104Z" fill="${Pp.belly.b}"/>`);
  crown(A, Pp, 130, 38, 40, 28, 3, Pp.accent);
  eyesOnly(A, Pp, m, 116, 66, 144, 66, 8, { far: 1, farSq: 1, lid: Pp.belly.b, blush: false });
  mouth(A, 130, 84, 5, m, 'smile');
}

// Stormcoast: thunderbird with a spinner halo
function gStats(A, Pp, m) {
  aura(A, 130, 112, 124, Pp.accent.b);
  // spinner halo
  let wd = '';
  const cols = [Pp.main.b, Pp.accent.b, Pp.second.b, Pp.white.b];
  for (let i = 0; i < 8; i++) wd += `<path d="${sector(130, 66, 54, i * 45, (i + 1) * 45)}" fill="${cols[i % 4]}" stroke="${OL}" stroke-width="2.5"/>`;
  A.back += `${wd}<circle cx="130" cy="66" r="54" fill="none" stroke="${OL}" stroke-width="5"/>`;
  gShadow(A, 130, 70);
  const wing = [[112, 110], [80, 80], [44, 44], [10, 28, 1], [18, 54], [6, 66, 1], [26, 80], [14, 96, 1], [36, 104], [28, 120, 1], [52, 124], [50, 140, 1], [76, 136], [100, 146]];
  const bolts = (k) => [[40, 76], [58, 104]].map(([x, y]) => `<path d="${boltd(k ? 260 - x : x, y, 12)}" fill="${Pp.accent.b}" stroke="${OL}" stroke-width="2"/>`).join('');
  A.part(P(blob(wing)), Pp.second, { s: 8, inner: `<path d="${blob(shrink(wing, 0.6, 16, 10))}" fill="${Pp.main.b}"/>` + bolts(false) });
  A.part(P(blob(wing.map(([x, y, c]) => [260 - x, y, c]))), Pp.second, { s: 8, inner: `<path d="${blob(shrink(wing.map(([x, y, c]) => [260 - x, y, c]), 0.6, -16, 10))}" fill="${Pp.main.b}"/>` + bolts(true) });
  // tail fan
  A.part(P(poly([[112, 186], [96, 236], [114, 224], [130, 244], [146, 224], [164, 236], [148, 186]])), Pp.second, { s: 5 });
  stalk(A, 'M116 196V234', Pp.accent.b, 5); stalk(A, 'M144 196V234', Pp.accent.b, 5);
  A.add(`<path d="M104 244L116 232L128 244M132 244L144 232L156 244" fill="none" stroke="${OL}" stroke-width="8" stroke-linecap="round"/><path d="M104 244L116 232L128 244M132 244L144 232L156 244" fill="none" stroke="${Pp.accent.b}" stroke-width="4" stroke-linecap="round"/>`);
  A.part(P(blob([[130, 84], [158, 96], [168, 136], [160, 180], [130, 204], [100, 180], [92, 136], [102, 96]])), Pp.main, { s: 10, inner: `<path d="${blob([[130, 110], [150, 122], [152, 166], [130, 190], [108, 166], [110, 122]])}" fill="${Pp.belly.b}"/>` });
  mark(A, Pp, 130, 156, 12, { glow: true });
  // lightning crest
  A.part(P(poly([[112, 60], [100, 22], [118, 40], [126, 8], [136, 38], [154, 18], [148, 60]])), Pp.accent, { s: 4 });
  A.part(P(blob([[130, 44], [154, 52], [164, 76], [156, 98], [130, 108], [104, 98], [96, 76], [106, 52]])), Pp.main, { s: 7 });
  eyesOnly(A, Pp, m, 116, 76, 144, 76, 9, { far: 1, farSq: 1, lid: Pp.main.b, blush: false });
  A.part(P(blob([[120, 88], [140, 88], [130, 108, 1]])), Pp.accent, { s: 2, sw: 3 });
  if (m === 'hurt') mouth(A, 130, 112, 5, m);
}

const GUARDIANS = { number: ['star', gNumber], patterns: ['vine', gPatterns], shape: ['stone', gShape], stats: ['storm', gStats] };
export const GUARDIAN_ART = { number: 'Astral Stag', patterns: 'Tanglemane', shape: 'Monolith', stats: 'Voltaquila' };

export function guardianSVG(regionId = 'number', opts = {}) {
  const [el, draw] = GUARDIANS[regionId] || GUARDIANS.number;
  const Pp = palette(el, opts.variant);
  const A = new Art('g');
  draw(A, Pp, opts.mood || 'idle');
  const tf = opts.facing === 'left' ? 'translate(260 0) scale(-1 1)' : '';
  return A.svg('0 0 260 260', tf);
}

// Shared drawing helpers, used by the extra pet files (pets-*.js).
export { f, pt, rot, palette, Art, star4d, leafd, boltd, diamd, mark, gem, sparkle, eye, eyes, blush, mouth, nose, sweat, ground, line, face, spikes, sector, spokes, wedges, bead, beads, shrink, crown, teeth, eyesOnly, plusd, timesd, foxHead, bushy, foxTail, stalk, spiralD, clockFace, rrd, barTuft };

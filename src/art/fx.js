// Battle VFX: travelling spells, impact bursts, faint / befriend / level-up effects and screen shake.
// Everything is SVG built in code (same chunky #2b2140-outlined cartoon style as the pets) and every
// motion is a Web Animation (element.animate), so effects can be paused and scrubbed in tests.
// Each effect builds all of its nodes up front (with delays) in one <svg> overlay and removes it when done.

const NS = 'http://www.w3.org/2000/svg';
const OL = '#2b2140';
const FONT = 'ui-rounded, "SF Pro Rounded", "Nunito", "Trebuchet MS", system-ui, sans-serif';
let UID = 0;

/** Element palettes: main / light / dark + an accent (alt) colour. */
export const FX_PAL = {
  star: { main: '#f5b83d', light: '#ffe68a', dark: '#c98a12', alt: '#8a63e6', altLight: '#cdb8ff', altDark: '#5e3fb3', glow: '#fff4c2' },
  vine: { main: '#4fbf6a', light: '#aaea82', dark: '#2c8a47', alt: '#ff86b4', altLight: '#ffd0e2', altDark: '#d14f86', glow: '#eaffd8' },
  stone: { main: '#d9824a', light: '#f7bd8a', dark: '#a4532a', alt: '#5b7bb4', altLight: '#b0c8f2', altDark: '#3d5890', glow: '#fff0dc' },
  storm: { main: '#3fb6c6', light: '#a6f0f5', dark: '#1f7f90', alt: '#ffe23d', altLight: '#fff7a8', altDark: '#e0a800', glow: '#f2ffff' },
  arcane: { main: '#8a63e6', light: '#cdb8ff', dark: '#5a39b0', alt: '#ff7ad9', altLight: '#ffc9f0', altDark: '#c43f9f', glow: '#f5eeff' },
};
const TIMING = { basic: 600, power: 800, ultimate: 1100 };

// ------------------------------------------------------------------ small math helpers
const rnd = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const n1 = (n) => Math.round(n * 10) / 10;
const n3 = (n) => Math.round(n * 1000) / 1000;
const DEG = 180 / Math.PI;
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x) * DEG;
const tf = (x, y, r = 0, sx = 1, sy = sx) => `translate(${n1(x)}px, ${n1(y)}px) rotate(${n1(r)}deg) scale(${n3(sx)}, ${n3(sy)})`;
const pol = (p, a, r) => ({ x: p.x + Math.cos(a / DEG) * r, y: p.y + Math.sin(a / DEG) * r });

function mk(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
/** Points along a quadratic curve from a to b whose middle is lifted `lift` px upwards. */
function arc(a, b, lift, n = 14) {
  const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - lift };
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y });
  }
  return out;
}
const line = (a, b, n = 8) => Array.from({ length: n + 1 }, (_, i) => ({ x: lerp(a.x, b.x, i / n), y: lerp(a.y, b.y, i / n) }));
function along(pts, u) {
  const p = Math.max(0, Math.min(1, u)) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(p)), k = p - i;
  return { x: lerp(pts[i].x, pts[i + 1].x, k), y: lerp(pts[i].y, pts[i + 1].y, k) };
}
const ptsD = (pts) => 'M' + pts.map((p) => `${n1(p.x)} ${n1(p.y)}`).join('L');
const polyLen = (pts) => pts.reduce((s, p, i) => (i ? s + dist(pts[i - 1], p) : 0), 0);

// ------------------------------------------------------------------ shape library (centred on 0,0)
const SW = (w) => `stroke="${OL}" stroke-width="${n1(w)}" stroke-linejoin="round" stroke-linecap="round"`;
const polyD = (pts) => 'M' + pts.map((p) => `${n1(p[0])} ${n1(p[1])}`).join('L') + 'Z';
function starPts(n, R, r, rot = -90) {
  const out = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (rot + (i * 180) / n) / DEG, rr = i % 2 ? r : R;
    out.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return out;
}
const starD = (R, r = R * 0.5, n = 5, rot = -90) => polyD(starPts(n, R, r, rot));
function burstD(n, R, r) {
  const out = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((i + rnd(-0.18, 0.18)) * Math.PI) / n, rr = i % 2 ? r * rnd(0.85, 1.1) : R * rnd(0.82, 1.08);
    out.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return polyD(out);
}
const sparkD = (r) => {
  const k = r * 0.2;
  return `M0 ${n1(-r)}Q${n1(k)} ${n1(-k)} ${n1(r)} 0Q${n1(k)} ${n1(k)} 0 ${n1(r)}Q${n1(-k)} ${n1(k)} ${n1(-r)} 0Q${n1(-k)} ${n1(-k)} 0 ${n1(-r)}Z`;
};
/** Cel-shaded solid: dark base, main colour shifted up-left, optional extras, bold outline on top. */
function cel(d, main, dark, sw, R, extra = '', k = 0.86) {
  return `<path d="${d}" fill="${dark}"/><path d="${d}" fill="${main}" transform="translate(${n1(-0.07 * R)} ${n1(-0.09 * R)}) scale(${k})"/>${extra}<path d="${d}" fill="none" ${SW(sw)}/>`;
}
const SH = {
  star: (R, main, dark, hi) => cel(starD(R), main, dark, Math.max(2.4, R * 0.14), R,
    `<path d="${starD(R * 0.36, R * 0.17)}" transform="translate(${n1(-R * 0.14)} ${n1(-R * 0.16)})" fill="${hi}"/>`),
  sparkle: (r, fill, sw = r >= 9 ? Math.max(1.6, r * 0.14) : 0) => `<path d="${sparkD(r)}" fill="${fill}"${sw ? ' ' + SW(sw) : ''}/>`,
  glow: (r, fill, op = 0.45) => `<circle r="${n1(r)}" fill="${fill}" opacity="${n3(op * 0.55)}"/><circle r="${n1(r * 0.68)}" fill="${fill}" opacity="${n3(op * 0.8)}"/>`,
  dot: (r, fill, sw = 2) => `<circle r="${n1(r)}" fill="${fill}" ${SW(sw)}/>`,
  leaf(L, W, P, fromBase = false) {
    const x0 = fromBase ? 0 : -L / 2, x1 = x0 + L, cx = x0 + L * 0.42;
    const d = `M${n1(x0)} 0Q${n1(cx)} ${n1(-W * 1.25)} ${n1(x1)} 0Q${n1(cx)} ${n1(W * 1.25)} ${n1(x0)} 0Z`;
    const top = `M${n1(x0)} 0Q${n1(cx)} ${n1(-W * 1.25)} ${n1(x1)} 0Z`;
    return `<path d="${d}" fill="${P.dark}"/><path d="${top}" fill="${P.main}"/><path d="M${n1(x0 + L * 0.08)} 0L${n1(x1 - L * 0.12)} 0" stroke="${P.light}" stroke-width="${n1(Math.max(1.5, W * 0.18))}" stroke-linecap="round"/><path d="${d}" fill="none" ${SW(Math.max(2, W * 0.2))}/>`;
  },
  petal(r, fill, hi) {
    const d = `M0 ${n1(-r)}C${n1(r * 0.95)} ${n1(-r * 0.55)} ${n1(r * 0.65)} ${n1(r * 0.85)} 0 ${n1(r)}C${n1(-r * 0.65)} ${n1(r * 0.85)} ${n1(-r * 0.95)} ${n1(-r * 0.55)} 0 ${n1(-r)}Z`;
    return `<path d="${d}" fill="${fill}" ${SW(Math.max(1.5, r * 0.16))}/><ellipse cx="${n1(-r * 0.18)}" cy="${n1(-r * 0.2)}" rx="${n1(r * 0.2)}" ry="${n1(r * 0.4)}" fill="${hi}"/>`;
  },
  flower(r, petal, hi, centre = '#ffd84a') {
    let s = '';
    for (let i = 0; i < 6; i++) {
      const a = i * 60;
      s += `<ellipse cx="0" cy="${n1(-r * 0.55)}" rx="${n1(r * 0.36)}" ry="${n1(r * 0.52)}" transform="rotate(${a})" fill="${petal}" ${SW(Math.max(2, r * 0.07))}/>`;
      s += `<ellipse cx="${n1(-r * 0.08)}" cy="${n1(-r * 0.66)}" rx="${n1(r * 0.12)}" ry="${n1(r * 0.24)}" transform="rotate(${a})" fill="${hi}"/>`;
    }
    return s + `<circle r="${n1(r * 0.3)}" fill="${centre}" ${SW(Math.max(2, r * 0.07))}/><circle cx="${n1(-r * 0.08)}" cy="${n1(-r * 0.09)}" r="${n1(r * 0.1)}" fill="#fff6c8"/>`;
  },
  gem(r, P) {
    const o = [[0, -r], [r * 0.74, -r * 0.32], [r * 0.56, r * 0.58], [0, r], [-r * 0.56, r * 0.58], [-r * 0.74, -r * 0.32]];
    const d = polyD(o);
    return `<path d="${d}" fill="${P.main}"/>` +
      `<path d="${polyD([[0, -r], [r * 0.74, -r * 0.32], [r * 0.56, r * 0.58], [0, r], [0, r * 0.3], [r * 0.32, -r * 0.1]])}" fill="${P.dark}"/>` +
      `<path d="${polyD([[0, -r * 0.5], [r * 0.32, -r * 0.1], [0, r * 0.3], [-r * 0.32, -r * 0.1]])}" fill="${P.altLight}" ${SW(Math.max(1.5, r * 0.07))}/>` +
      `<path d="${polyD([[-r * 0.5, -r * 0.3], [-r * 0.12, -r * 0.72], [-r * 0.2, -r * 0.42]])}" fill="#fff" opacity=".8"/>` +
      `<path d="${d}" fill="none" ${SW(Math.max(2.4, r * 0.13))}/>`;
  },
  /** Crystal spike with its base at (0,0), growing up to (0,-h). */
  crystal(w, h, c) {
    const o = polyD([[-w, 0], [-w * 0.96, -h * 0.72], [0, -h], [w * 0.96, -h * 0.72], [w, 0]]);
    return `<path d="${o}" fill="${c.main}"/>` +
      `<path d="${polyD([[w * 0.18, 0], [w * 0.18, -h * 0.77], [0, -h], [w * 0.96, -h * 0.72], [w, 0]])}" fill="${c.dark}"/>` +
      `<path d="${polyD([[-w * 0.62, -h * 0.08], [-w * 0.58, -h * 0.64], [-w * 0.3, -h * 0.76], [-w * 0.34, -h * 0.1]])}" fill="${c.light}" opacity=".85"/>` +
      `<path d="${o}" fill="none" ${SW(Math.max(2.5, w * 0.16))}/>`;
  },
  boulder(R, P) {
    const pts = [[0, -1], [0.62, -0.8], [1, -0.22], [0.9, 0.5], [0.42, 0.95], [-0.34, 0.96], [-0.88, 0.6], [-1, -0.1], [-0.66, -0.74]].map(([x, y]) => [x * R, y * R]);
    const d = polyD(pts);
    const vein = (x, y, r) => `<path d="${polyD([[x, y - r], [x + r * 0.7, y - r * 0.2], [x + r * 0.45, y + r * 0.75], [x - r * 0.45, y + r * 0.75], [x - r * 0.7, y - r * 0.2]])}" fill="${P.altLight}" ${SW(R * 0.045)}/><path d="${polyD([[x, y - r], [x + r * 0.7, y - r * 0.2], [x + r * 0.45, y + r * 0.75], [x, y + r * 0.2]])}" fill="${P.alt}"/>`;
    return cel(d, P.main, P.dark, R * 0.08, R,
      `<path d="M${n1(-R * 0.62)} ${n1(-R * 0.3)}Q${n1(-R * 0.4)} ${n1(-R * 0.72)} ${n1(R * 0.1)} ${n1(-R * 0.78)}" stroke="${P.light}" stroke-width="${n1(R * 0.12)}" fill="none" stroke-linecap="round"/>` +
      `<path d="M${n1(R * 0.1)} ${n1(R * 0.1)}l${n1(R * 0.22)} ${n1(R * 0.18)}l${n1(-R * 0.06)} ${n1(R * 0.3)}M${n1(R * 0.32)} ${n1(R * 0.28)}l${n1(R * 0.26)} ${n1(-R * 0.06)}" stroke="${OL}" stroke-width="${n1(R * 0.05)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
      vein(-R * 0.42, R * 0.34, R * 0.2) + vein(R * 0.45, -R * 0.3, R * 0.16) + vein(-R * 0.08, R * 0.58, R * 0.12));
  },
  cloud(w) {
    const k = w / 240;
    const C = [[-80, 14, 42], [-38, -14, 52], [18, -24, 56], [72, -2, 46], [100, 22, 32], [34, 24, 44], [-24, 26, 44], [-104, 30, 28]];
    const circ = (dx, dy, dr, fill) => C.map(([x, y, r]) => `<circle cx="${n1((x + dx) * k)}" cy="${n1((y + dy) * k)}" r="${n1((r + dr) * k)}"/>`).join('').replace(/\/>/g, ` fill="${fill}"/>`);
    return circ(0, 0, 6, OL) + circ(0, 0, 0, '#46557a') + C.slice(0, 5).map(([x, y, r]) => `<circle cx="${n1((x - 4) * k)}" cy="${n1((y - 9) * k)}" r="${n1(r * 0.72 * k)}" fill="#6a7fa8"/>`).join('') +
      `<path d="M${n1(-60 * k)} ${n1(-22 * k)}q${n1(20 * k)} ${n1(-22 * k)} ${n1(46 * k)} ${n1(-18 * k)}" stroke="#9fb3d6" stroke-width="${n1(8 * k)}" fill="none" stroke-linecap="round"/>`;
  },
  heart(r, fill, hi = '#ffe0ee') {
    const d = `M0 ${n1(r * 0.95)}C${n1(-r * 1.5)} ${n1(-r * 0.05)} ${n1(-r * 0.95)} ${n1(-r * 1.2)} 0 ${n1(-r * 0.4)}C${n1(r * 0.95)} ${n1(-r * 1.2)} ${n1(r * 1.5)} ${n1(-r * 0.05)} 0 ${n1(r * 0.95)}Z`;
    return `<path d="${d}" fill="${fill}" ${SW(Math.max(2, r * 0.14))}/><ellipse cx="${n1(-r * 0.48)}" cy="${n1(-r * 0.3)}" rx="${n1(r * 0.18)}" ry="${n1(r * 0.28)}" transform="rotate(-30 ${n1(-r * 0.48)} ${n1(-r * 0.3)})" fill="${hi}"/>`;
  },
  chevron(w, fill) {
    const h = w * 0.9;
    return `<path d="${polyD([[-w, h * 0.35], [0, -h * 0.55], [w, h * 0.35], [w * 0.5, h * 0.62], [0, h * 0.02], [-w * 0.5, h * 0.62]])}" fill="${fill}" ${SW(Math.max(2.5, w * 0.14))}/>`;
  },
  chip(r, fill) {
    return `<path d="${polyD([[0, -r], [r * 0.95, r * 0.3], [r * 0.2, r * 0.9], [-r * 0.9, r * 0.45]])}" fill="${fill}" ${SW(Math.max(1.8, r * 0.2))}/>`;
  },
  puff(r, fill, sw = 3) { return `<circle r="${n1(r)}" fill="${fill}" ${SW(sw)}/><circle cx="${n1(-r * 0.3)}" cy="${n1(-r * 0.32)}" r="${n1(r * 0.28)}" fill="#fff" opacity=".7"/>`; },
  /** Little electric zig-zag pointing along +x. */
  zap(len, col) {
    const d = `M0 0l${n1(len * 0.38)} ${n1(-len * 0.22)}l${n1(-len * 0.06)} ${n1(len * 0.34)}l${n1(len * 0.68)} ${n1(-len * 0.18)}`;
    return `<path d="${d}" fill="none" ${SW(Math.max(4, len * 0.2))}/><path d="${d}" fill="none" stroke="${col}" stroke-width="${n1(Math.max(2, len * 0.1))}" stroke-linecap="round" stroke-linejoin="round"/>`;
  },
  orb(r, P, fillUrl) {
    return `<circle r="${n1(r)}" fill="${fillUrl}" ${SW(Math.max(2.5, r * 0.13))}/><ellipse cx="${n1(-r * 0.32)}" cy="${n1(-r * 0.36)}" rx="${n1(r * 0.3)}" ry="${n1(r * 0.2)}" transform="rotate(-35 ${n1(-r * 0.32)} ${n1(-r * 0.36)})" fill="#fff" opacity=".9"/>`;
  },
  /** Ring of little runes (dashed circle + glyph marks). */
  runes(r, col, sw) {
    let marks = '';
    for (let i = 0; i < 6; i++) {
      const a = i * 60, x = Math.cos(a / DEG) * r, y = Math.sin(a / DEG) * r, m = r * 0.16;
      const g = [`M${-m} ${m}L0 ${-m}L${m} ${m}Z`, `M${-m} 0L${m} 0M0 ${-m}L0 ${m}`, `M0 ${-m}L${m} 0L0 ${m}L${-m} 0Z`][i % 3];
      marks += `<path d="${g}" transform="translate(${n1(x)} ${n1(y)}) rotate(${a + 90})" fill="none" stroke="${col}" stroke-width="${n1(sw * 0.8)}" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    return `<circle r="${n1(r)}" fill="none" stroke="${OL}" stroke-width="${n1(sw + 3)}" opacity=".55"/><circle r="${n1(r)}" fill="none" stroke="${col}" stroke-width="${n1(sw)}" stroke-dasharray="${n1(r * 0.35)} ${n1(r * 0.18)}"/>${marks}`;
  },
};

/** Small maths-family flavour glyphs mixed into impact particles. */
function glyph(fam, i, r, P) {
  const sw = SW(Math.max(2, r * 0.16));
  if (fam === 'ops') {
    const k = i % 4, a = r * 0.3;
    if (k === 0 || k === 1) return `<path d="M${-a} ${-r}h${2 * a}v${r - a}h${r - a}v${2 * a}h${a - r}v${r - a}h${-2 * a}v${a - r}h${a - r}v${-2 * a}h${r - a}Z" transform="rotate(${k * 45})" fill="#fff" ${sw}/>`;
    if (k === 2) return `<rect x="${-r}" y="${-a}" width="${2 * r}" height="${2 * a}" rx="${a * 0.5}" fill="#fff" ${sw}/>`;
    return `<rect x="${-r}" y="${-a * 0.8}" width="${2 * r}" height="${1.6 * a}" rx="${a * 0.4}" fill="#fff" ${sw}/><circle cy="${-r * 0.75}" r="${a}" fill="#fff" ${sw}/><circle cy="${r * 0.75}" r="${a}" fill="#fff" ${sw}/>`;
  }
  if (fam === 'qpv') {
    const h = r * 0.55;
    return `<path d="M0 ${-r}L${r} ${-h}L0 0L${-r} ${-h}Z" fill="${P.light}" ${sw}/><path d="M${-r} ${-h}L0 0L0 ${r}L${-r} ${h}Z" fill="${P.main}" ${sw}/><path d="M${r} ${-h}L0 0L0 ${r}L${r} ${h}Z" fill="${P.dark}" ${sw}/>`;
  }
  if (fam === 'patterns') {
    const q = r / 3;
    return `<path d="M0 0a${n1(q * 0.5)} ${n1(q * 0.5)} 0 0 1 ${n1(q)} 0a${n1(q)} ${n1(q)} 0 0 1 ${n1(-2 * q)} 0a${n1(q * 1.5)} ${n1(q * 1.5)} 0 0 1 ${n1(3 * q)} 0" fill="none" stroke="${OL}" stroke-width="${n1(r * 0.42)}" stroke-linecap="round"/><path d="M0 0a${n1(q * 0.5)} ${n1(q * 0.5)} 0 0 1 ${n1(q)} 0a${n1(q)} ${n1(q)} 0 0 1 ${n1(-2 * q)} 0a${n1(q * 1.5)} ${n1(q * 1.5)} 0 0 1 ${n1(3 * q)} 0" fill="none" stroke="${P.altLight}" stroke-width="${n1(r * 0.2)}" stroke-linecap="round"/>`;
  }
  if (fam === 'measurement') {
    return `<circle r="${r}" fill="#fffaf0" ${sw}/><path d="M0 0L0 ${n1(-r * 0.62)}M0 0L${n1(r * 0.45)} ${n1(r * 0.1)}" stroke="${OL}" stroke-width="${n1(r * 0.16)}" stroke-linecap="round"/>`;
  }
  if (fam === 'geometry') {
    const n = [3, 4, 6][i % 3];
    return `<path d="${polyD(starPts(n, r, r * Math.cos(Math.PI / n), -90).filter((_, j) => j % 2 === 0))}" fill="${P.altLight}" ${sw}/>`;
  }
  if (fam === 'data') {
    const w = r * 0.5;
    return [0.6, 1.1, 1.6].map((hh, j) => `<rect x="${n1(-r + j * w * 1.3)}" y="${n1(r - hh * r)}" width="${n1(w)}" height="${n1(hh * r)}" fill="${[P.alt, P.main, P.altLight][j]}" ${sw}/>`).join('');
  }
  return '';
}

// ------------------------------------------------------------------ scene: one SVG overlay per effect
class Scene {
  constructor(layer) {
    const r = layer.getBoundingClientRect();
    this.W = layer.clientWidth || r.width || 1024;
    this.H = layer.clientHeight || r.height || 640;
    this.id = `fx${++UID}_`;
    this.end = 0;
    this.count = 0; // animated nodes (for budget checks)
    this.gi = 0;
    this.raise = []; // nodes moved on top of everything at finish (e.g. a bolt over its own impact)
    const svg = (this.svg = mk('svg', { width: this.W, height: this.H, viewBox: `0 0 ${this.W} ${this.H}`, class: 'fx-scene', 'aria-hidden': 'true' }));
    svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:6;';
    svg.style.fontFamily = FONT;
    this.defs = mk('defs', {}, svg);
    layer.appendChild(svg);
  }
  g(markup = '', parent = this.svg) {
    const g = mk('g', null, parent);
    if (markup) g.innerHTML = markup;
    return g;
  }
  grad(stops, radial = false, attrs = 'x1="0" y1="0" x2="1" y2="0"') {
    const id = `${this.id}g${++this.gi}`, tag = radial ? 'radialGradient' : 'linearGradient';
    this.defs.insertAdjacentHTML('beforeend', `<${tag} id="${id}" ${radial ? '' : attrs}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</${tag}>`);
    return `url(#${id})`;
  }
  anim(node, frames, dur, delay = 0, easing = 'linear') {
    this.count++;
    this.end = Math.max(this.end, delay + dur);
    // Nodes that animate opacity stay hidden until their own start (static opacity 0 + fill forwards);
    // others (inner spinners, stroke-dash draws) hold their first frame and rely on a parent / the dash.
    let last = 0; // keep offsets inside [0,1] and non-decreasing (float noise would make animate() throw)
    for (const f of frames) if (f.offset != null) { f.offset = Math.min(1, Math.max(last, f.offset)); last = f.offset; }
    const fades = frames.some((f) => 'opacity' in f);
    if (fades) node.style.opacity = '0';
    return node.animate(frames, { duration: Math.max(1, dur), delay: Math.max(0, delay), easing, fill: fades ? 'forwards' : 'both' });
  }
  /**
   * Keyframe a node with per-property arrays: x, y (px), r (deg), s | sx, sy (scale), o (opacity), offs (0..1).
   * Arrays of different lengths are resampled to the longest one.
   */
  key(node, o, t0, dur, easing = 'linear') {
    const props = ['x', 'y', 'r', 's', 'sx', 'sy', 'o'];
    const lens = props.map((k) => (Array.isArray(o[k]) ? o[k].length : 1));
    const n = o.offs ? o.offs.length : Math.max(2, ...lens);
    const at = (v, i, d) => {
      if (v == null) return d;
      if (!Array.isArray(v)) return v;
      if (v.length === n) return v[i];
      if (v.length === 1) return v[0];
      const p = (i / (n - 1)) * (v.length - 1), j = Math.min(v.length - 2, Math.floor(p));
      return lerp(v[j], v[j + 1], p - j);
    };
    const frames = [];
    for (let i = 0; i < n; i++) {
      const s = at(o.s, i, 1);
      frames.push({ offset: o.offs ? o.offs[i] : i / (n - 1), transform: tf(at(o.x, i, 0), at(o.y, i, 0), at(o.r, i, 0), at(o.sx, i, s), at(o.sy, i, s)) });
      if (o.o !== undefined) frames[i].opacity = at(o.o, i, 1); // only fading nodes animate opacity
      // With explicit offsets the timing of each key matters, so ease each segment instead of the whole run.
      if (o.offs) frames[i].easing = easing;
    }
    return this.anim(node, frames, dur, t0, o.offs ? 'linear' : easing);
  }
  /** Move a node along points; it fades in on the first segment and vanishes on arrival. */
  fly(node, pts, t0, dur, { rot = 0, spin = 0, s0 = 1, s1 = s0, easing = 'linear', keep = false, op = 1 } = {}) {
    const n = pts.length - 1, e = keep ? 1 : 0.985;
    const frames = pts.map((p, i) => ({ offset: (i / n) * e, transform: tf(p.x, p.y, rot + spin * (i / n), lerp(s0, s1, i / n)), opacity: i === 0 ? 0 : op }));
    if (!keep) frames.push({ offset: 1, transform: frames[n].transform, opacity: 0 });
    return this.anim(node, frames, dur, t0, easing);
  }
  /** Drop twinkling particles along a path as the projectile passes. tm maps path fraction -> time fraction. */
  trail(pts, t0, dur, count, make, { life = 380, drift = 16, a = 0.1, b = 0.92, spin = 140, tm = (u) => u } = {}) {
    for (let k = 0; k < count; k++) {
      const u = count === 1 ? (a + b) / 2 : a + ((b - a) * k) / (count - 1);
      const p = along(pts, u);
      const node = this.g(make(k));
      const dx = rnd(-drift, drift), dy = rnd(0.2, 1) * drift;
      this.key(node, { x: [p.x, p.x + dx], y: [p.y, p.y + dy], s: [0.3, 1, 0], r: [0, rnd(-spin, spin)], o: [1, 1, 0.6] }, t0 + tm(u) * dur, life, 'ease-out');
    }
  }
  flash(t, color, peak = 0.5, dur = 300) {
    const r = mk('rect', { x: -60, y: -60, width: this.W + 120, height: this.H + 120, fill: color }, this.svg);
    this.anim(r, [{ opacity: 0 }, { opacity: peak, offset: 0.12 }, { opacity: 0 }], dur, t, 'ease-out');
  }
  /** Lightning: a zig-zag polyline drawn with stroke-dash, in layered strokes, then flickering out. */
  bolt(pts, t0, draw, hold, { w = 1, col = '#ffe23d', glow = null, core = '#fff', flick = true } = {}) {
    const d = ptsD(pts), len = polyLen(pts);
    const g = this.g();
    const layers = [];
    if (glow) layers.push([glow, 28 * w, 0.4]);
    layers.push([OL, 14 * w, 1], [col, 8.5 * w, 1], [core, 3.2 * w, 1]);
    for (const [c, sw, op] of layers) {
      const p = mk('path', { d, fill: 'none', stroke: c, 'stroke-width': n1(sw), 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: op, 'stroke-dasharray': `${n1(len)} ${n1(len + 80)}` }, g);
      this.anim(p, [{ strokeDashoffset: `${n1(len + 40)}px` }, { strokeDashoffset: '0px' }], draw, t0, 'ease-out');
    }
    const tot = draw + hold, fl = flick ? [1, 1, 1, 0.3, 1, 0.45, 0.9, 0] : [1, 1, 0];
    const offs = fl.map((_, i) => (i === 0 ? 0 : i === 1 ? draw / tot : draw / tot + ((1 - draw / tot) * (i - 1)) / (fl.length - 2)));
    this.anim(g, fl.map((o, i) => ({ opacity: o, offset: offs[i] })), tot, t0);
    return g;
  }
  /** A promise that resolves after ms (WAAPI-timed so it pauses with the effect; setTimeout fallback). */
  timer(ms) {
    const node = mk('g', null, this.svg);
    const a = node.animate([{ opacity: 1 }, { opacity: 1 }], { duration: Math.max(1, ms) });
    return new Promise((res) => {
      let fired = false;
      const go = () => { if (!fired) { fired = true; res(); } };
      a.finished.then(go, go);
      const fallback = () => { if (fired) return; if (a.playState === 'paused') setTimeout(fallback, 400); else go(); };
      setTimeout(fallback, ms + 350);
    });
  }
  finish(impactAt, extra = {}) {
    for (const n of this.raise) this.svg.appendChild(n);
    const impact = impactAt == null ? null : this.timer(impactAt);
    const done = this.timer(this.end + 40).then(() => this.svg.remove());
    return { impact: impact || done, done, nodes: this.count, ...extra };
  }
}

// ------------------------------------------------------------------ shared pieces
function particle(c, i, r) {
  const { P, el } = c;
  if (c.family && i % 4 === 1) { const gl = glyph(c.family, i, r * 0.95, P); if (gl) return gl; }
  switch (el) {
    case 'star': return i % 2 ? SH.star(r * 1.1, P.main, P.dark, P.glow) : SH.sparkle(r * 1.15, i % 4 ? P.altLight : '#fff');
    case 'vine': return i % 2 ? SH.leaf(r * 2.3, r * 0.8, P) : SH.petal(r * 0.95, P.alt, P.altLight);
    case 'stone': return SH.chip(r, i % 3 === 0 ? P.alt : i % 3 === 1 ? P.main : P.light);
    case 'storm': return i % 2 ? SH.zap(r * 2.6, P.alt) : SH.dot(r * 0.6, i % 4 ? P.light : P.altLight, 2);
    default: return i % 2 ? SH.sparkle(r * 1.15, P.altLight) : SH.sparkle(r, P.alt);
  }
}
function twinkles(c, at, t, n, rad, cols, size = 10) {
  const { st, s } = c;
  for (let k = 0; k < n; k++) {
    const p = pol(at, rnd(0, 360), rnd(rad * 0.3, rad));
    const node = st.g(SH.sparkle(rnd(0.7, 1.2) * size * s, cols[k % cols.length]));
    st.key(node, { x: p.x, y: [p.y, p.y - 10 * s], s: [0, 1.2, 0], r: [0, 90], o: 1 }, t + rnd(0, 180), rnd(280, 360), 'ease-out');
  }
}
/** Stage-3 charge-up: aura glow, converging ring and sparkles on the attacker before firing. */
function chargeUp(c, at, t0, t1) {
  const { st, P, s } = c;
  const dur = t1 - t0 + 90;
  const glow = st.g(`<circle r="${n1(84 * s)}" fill="${st.grad([[0, '#fff', 0.95], [0.35, P.light, 0.8], [1, P.main, 0]], true)}"/>`);
  st.key(glow, { x: at.x, y: at.y, s: [0.3, 1, 0.85, 1.25], o: [0, 0.95, 0.9, 0] }, t0, dur, 'ease-out');
  const ring = st.g(`<circle r="${n1(96 * s)}" fill="none" stroke="${P.main}" stroke-width="${n1(7 * s)}"/><circle r="${n1(96 * s)}" fill="none" stroke="#fff" stroke-width="${n1(2.5 * s)}"/>`);
  st.key(ring, { x: at.x, y: at.y, s: [1.5, 0.3], o: [0, 1, 0.9], r: [0, 90] }, t0, t1 - t0, 'ease-in');
  for (let k = 0; k < 6; k++) {
    const a = k * 60 + rnd(-15, 15), p0 = pol(at, a, 110 * s), p1 = pol(at, a + 40, 12 * s);
    const node = st.g(SH.sparkle(rnd(9, 13) * s, k % 2 ? P.light : '#fff'));
    st.key(node, { x: [p0.x, p1.x], y: [p0.y, p1.y], s: [0.4, 1.1, 0.3], r: [0, 180], o: [0, 1, 0.8] }, t0 + k * 18, t1 - t0 - 40, 'ease-in');
  }
}
/** A pop of sparkles at the attacker when a projectile launches. */
function launchPop(c, at, t, col) {
  const { st, s, P } = c;
  const g = st.g(SH.sparkle(30 * s * c.sz, col || P.light));
  st.key(g, { x: at.x, y: at.y, s: [0, 1.2, 0], r: [0, 90] }, t, 280, 'ease-out');
}
function miniPop(c, at, t, col) {
  const { st, s } = c;
  const g = st.g(`<path d="${burstD(8, 30 * s * c.sz, 15 * s * c.sz)}" fill="${col}" ${SW(3)}/><circle r="${n1(8 * s * c.sz)}" fill="#fff"/>`);
  st.key(g, { x: at.x, y: at.y, s: [0.2, 1, 0.3], r: [0, 30], o: [1, 1, 0] }, t, 240, 'ease-out');
}
/** Coloured impact burst at `at`, time t. Crits, super and weak hits change it. */
function impact(c, at, t, { big = 1 } = {}) {
  const { st, P, crit, effect, stage } = c;
  const weak = effect === 'weak', sup = effect === 'super';
  const s = c.s * big * (weak ? 0.62 : sup ? 1.15 : 1) * (crit ? 1.12 : 1) * [0.85, 1, 1.2][stage - 1];
  const R = 70 * s, Rc = Math.min(R, 92 * c.s);
  if (crit) {
    const sb = st.g(`<path d="${burstD(16, Rc * 2, Rc * 1.15)}" fill="#fff6c8" ${SW(5)}/><path d="${burstD(16, Rc * 1.55, Rc * 0.85)}" fill="#ffc83d"/>`);
    st.key(sb, { x: at.x, y: at.y, s: [0, 1.25, 1.15, 1.2], r: [0, 18, 26, 30], o: [1, 1, 0.45, 0] }, t - 10, 460, 'ease-out');
  }
  // white flash disc
  const fl = st.g(`<circle r="${n1(R * 0.75)}" fill="#fff"/>`);
  st.key(fl, { x: at.x, y: at.y, s: [0.3, 1.2, 1.5], o: [1, 0.9, 0] }, t, 230, 'ease-out');
  // spiky burst
  const bu = st.g(weak
    ? `<path d="${burstD(8, R * 0.95, R * 0.55)}" fill="#d9d2e6" ${SW(3.5)}/><path d="${burstD(8, R * 0.6, R * 0.35)}" fill="${P.light}"/>`
    : `<path d="${burstD(10, R * 1.1, R * 0.55)}" fill="${P.main}" ${SW(4)}/><path d="${burstD(10, R * 0.72, R * 0.36)}" fill="${P.light}"/><circle r="${n1(R * 0.26)}" fill="#fff"/>`);
  st.key(bu, { x: at.x, y: at.y, s: [0.2, 1.05, 0.85], r: [0, 16], o: [1, 1, 0] }, t, 340, 'ease-out');
  // shock ring(s)
  if (!weak) {
    const ring = st.g(`<circle r="${n1(R)}" fill="none" stroke="${OL}" stroke-width="${n1(11 * s)}" opacity=".5"/><circle r="${n1(R)}" fill="none" stroke="${P.main}" stroke-width="${n1(8 * s)}"/>`);
    st.key(ring, { x: at.x, y: at.y, s: [0.3, 1.55], o: [1, 0] }, t, 420, 'ease-out');
  }
  if (sup || stage === 3) {
    const r2 = st.g(`<circle r="${n1(R)}" fill="none" stroke="${sup ? P.alt : '#fff'}" stroke-width="${n1(6 * s)}"/>`);
    st.key(r2, { x: at.x, y: at.y, s: [0.2, 2.1], o: [1, 0] }, t + 50, 440, 'ease-out');
  }
  // particles
  let n = weak ? 4 : Math.round((sup ? 13 : 8) * [0.75, 1, 1.35][stage - 1]) + (crit ? 4 : 0);
  const pr = (weak ? 7 : 10) * s;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360 + rnd(-12, 12), dd = R * rnd(1.15, 2) * (weak ? 0.7 : 1);
    const p1 = pol(at, a, dd * 0.72), p2 = pol(at, a, dd);
    const node = st.g(particle(c, i, pr * rnd(0.8, 1.2)));
    const radial = c.el === 'storm' && i % 2;
    st.key(node, {
      x: [at.x, p1.x, p2.x], y: [at.y, p1.y - 8 * s, p2.y + 22 * s],
      r: radial ? [a, a + rnd(-30, 30)] : [0, rnd(-240, 240)], s: [0.4, 1, 0.45], o: [1, 1, 0],
    }, t + rnd(0, 30), rnd(400, 480), 'cubic-bezier(.2,.75,.4,1)');
  }
  if (weak) { // fizzle: grey puffs drifting up
    for (let k = 0; k < 3; k++) {
      const node = st.g(SH.puff(rnd(12, 17) * c.s, '#d8d2e4', 2.5));
      const x = at.x + (k - 1) * 26 * c.s;
      st.key(node, { x: [x, x + rnd(-10, 10)], y: [at.y, at.y - 50 * c.s], s: [0.3, 1, 1.2], o: [0.95, 0.8, 0] }, t + 30 + k * 50, 480, 'ease-out');
    }
  }
  if (sup) twinkles(c, at, t + 40, 5, R * 1.6, [P.altLight, '#fff', P.light], 12);
  if (stage === 3) twinkles(c, at, t + 70, 4, R * 1.9, ['#fff', P.light], 11);
  if (crit) critRing(c, at, t + 20, Rc);
}
function critRing(c, at, t, R) {
  const { st } = c;
  const r = R * 1.45, fs = Math.max(15, R * 0.3), id = `${st.id}crit${++st.gi}`;
  const node = st.g(
    `<path id="${id}" d="M${n1(-r)} 0A${n1(r)} ${n1(r)} 0 1 1 ${n1(r)} 0A${n1(r)} ${n1(r)} 0 1 1 ${n1(-r)} 0" fill="none"/>` +
    `<circle r="${n1(r)}" fill="none" stroke="${OL}" stroke-width="${n1(fs * 1.75)}"/><circle r="${n1(r)}" fill="none" stroke="#ff5d73" stroke-width="${n1(fs * 1.4)}"/>` +
    `<text font-size="${n1(fs)}" font-weight="900" fill="#fff" stroke="${OL}" stroke-width="${n1(fs * 0.22)}" paint-order="stroke" letter-spacing="${n1(fs * 0.12)}" dy="${n1(fs * 0.36)}" style="font-family:${FONT.replace(/"/g, "'")}">` +
    `<textPath href="#${id}" xlink:href="#${id}">${'CRITICAL ★ '.repeat(Math.max(3, Math.floor((2 * Math.PI * r) / (fs * 8.6))))}</textPath></text>`);
  st.key(node, { x: at.x, y: at.y, s: [0.55, 1.05, 1.1, 1.3], r: [-40, -8, 4, 16], o: [0, 1, 1, 0] }, t, 600, 'ease-out');
}

// ------------------------------------------------------------------ STAR
const STAR = {
  basic(c) {
    const { st, from, to, P, s, I, T0, d, dir } = c;
    const R = 24 * s * c.sz, t0 = T0 + 110;
    launchPop(c, from, T0);
    const pts = arc(from, to, d * 0.28, 16);
    const g = st.g(c.stage > 1 ? SH.glow(R * 1.55, P.altLight, 0.5) : '');
    const inner = st.g(SH.star(R, P.main, P.dark, P.glow), g);
    st.fly(g, pts, t0, I - t0);
    st.key(inner, { x: 0, y: 0, r: [0, 720 * dir] }, t0, I - t0);
    st.trail(pts, t0, I - t0, c.trailN(6), (k) => SH.sparkle(rnd(9, 13) * s * c.sz, k % 2 ? P.light : P.altLight), { drift: 18 * s });
  },
  power(c) {
    const { st, from, to, P, s, I, T0, d, dir } = c;
    const N = [3, 5, 7][c.stage - 1], gap = [80, 60, 45][c.stage - 1], fly = Math.min(480, I - T0 - 60 - gap * (N - 1));
    const lifts = [0.42, 0.1, 0.3, -0.1, 0.2, 0.52, -0.02], offs = [[-20, -22], [18, 16], [-8, 8], [24, -14], [-26, 18], [8, -30], [0, 0]];
    launchPop(c, from, T0);
    for (let k = 0; k < N; k++) {
      const t0 = I - fly - gap * (N - 1 - k), last = k === N - 1;
      const tg = last ? to : { x: to.x + offs[k][0] * s, y: to.y + offs[k][1] * s };
      const pts = arc(from, tg, d * lifts[k], 12);
      const R = 17 * s * c.sz * (last ? 1.2 : 1);
      const g = st.g(c.stage > 1 ? SH.glow(R * 1.5, k % 2 ? P.altLight : P.glow, 0.5) : '');
      const inner = st.g(k % 2 ? SH.star(R, P.alt, P.altDark, P.altLight) : SH.star(R, P.main, P.dark, P.glow), g);
      st.fly(g, pts, t0, fly);
      st.key(inner, { x: 0, y: 0, r: [0, 600 * dir] }, t0, fly);
      if (c.stage > 1) st.trail(pts, t0, fly, c.stage === 3 ? 3 : 2, (j) => SH.sparkle(rnd(6, 9) * s, j % 2 ? P.light : '#fff'), { drift: 12 * s, life: 300 });
      if (!last) miniPop(c, tg, t0 + fly, k % 2 ? P.altLight : P.light);
    }
  },
  ultimate(c) {
    const { st, from, to, P, s, I, T0, dir } = c;
    // 1) gather sparkles and a star shot into the sky
    for (let k = 0; k < 6; k++) {
      const p0 = pol(from, k * 60 + 20, 80 * s);
      const node = st.g(SH.sparkle(11 * s, k % 2 ? P.light : P.altLight));
      st.key(node, { x: [p0.x, from.x], y: [p0.y, from.y], s: [0.5, 1.1, 0.2], r: [0, 180], o: [0, 1, 0.6] }, T0 + k * 25, 300, 'ease-in');
    }
    const up = { x: from.x + (to.x - from.x) * 0.12, y: -80 };
    const shot = st.g(SH.glow(22 * s, P.glow, 0.6) + SH.star(16 * s, P.main, P.dark, P.glow));
    st.fly(shot, line(from, up, 6), T0 + 280, 260, { easing: 'ease-in', s0: 0.6, s1: 1 });
    // 2) warning shadow on the ground
    const gy = c.ground(to);
    const sh = st.g(`<ellipse rx="${n1(80 * s)}" ry="${n1(18 * s)}" fill="${OL}"/>`);
    st.key(sh, { x: to.x, y: gy, s: [0.2, 1], o: [0, 0.32] }, T0 + 400, I - T0 - 400, 'ease-in');
    const shEnd = st.g(`<ellipse rx="${n1(80 * s)}" ry="${n1(18 * s)}" fill="${OL}"/>`);
    st.key(shEnd, { x: to.x, y: gy, s: [1, 1.2], o: [0.32, 0] }, I, 200);
    // 3) the comet
    const S = { x: from.x + (to.x - from.x) * 0.05, y: -20 * s };
    const tw = st.g(SH.sparkle(34 * s, '#fff') + SH.sparkle(20 * s, P.light));
    st.key(tw, { x: S.x, y: Math.max(S.y, 26 * s), s: [0, 1.2, 0.9, 0], r: [0, 45, 90, 135] }, T0 + 250, 300, 'ease-out');
    const ca = angle(S, to), R = 34 * s * c.sz, L = (170 + c.stage * 40) * s;
    const tail = st.grad([[0, P.alt, 0], [0.55, P.main, 0.75], [1, '#fff6d0', 1]]);
    const tail2 = st.grad([[0, '#fff', 0], [1, '#fff', 0.95]]);
    const g = st.g(
      `<path d="M${n1(R * 0.3)} ${n1(-R * 1.15)}C${n1(-L * 0.35)} ${n1(-R * 1.05)} ${n1(-L * 0.75)} ${n1(-R * 0.4)} ${n1(-L)} 0C${n1(-L * 0.75)} ${n1(R * 0.4)} ${n1(-L * 0.35)} ${n1(R * 1.05)} ${n1(R * 0.3)} ${n1(R * 1.15)}Z" fill="${tail}"/>` +
      `<path d="M0 ${n1(-R * 0.55)}C${n1(-L * 0.3)} ${n1(-R * 0.5)} ${n1(-L * 0.55)} ${n1(-R * 0.15)} ${n1(-L * 0.7)} 0C${n1(-L * 0.55)} ${n1(R * 0.15)} ${n1(-L * 0.3)} ${n1(R * 0.5)} 0 ${n1(R * 0.55)}Z" fill="${tail2}"/>` +
      SH.glow(R * 1.6, P.glow, 0.55));
    const head = st.g(SH.star(R, P.main, P.dark, P.glow), g);
    const pts = line(S, to, 10), t0 = T0 + 400, fdur = I - t0;
    const ease = 'cubic-bezier(.4,0,.85,.7)';
    st.fly(g, pts, t0, fdur, { rot: ca, s0: 0.65, s1: 1.1, easing: ease });
    st.key(head, { x: 0, y: 0, r: [0, 900 * dir] }, t0, fdur);
    st.trail(pts, t0, fdur, c.trailN(8), (k) => (k % 3 ? SH.sparkle(rnd(9, 14) * s, k % 2 ? P.light : '#fff') : SH.star(9 * s, P.alt, P.altDark, P.altLight)),
      { drift: 30 * s, life: 520, a: 0.3, b: 0.95, tm: (u) => Math.pow(u, 0.75) });
    // 4) starburst slam
    const sb = st.g(`<path d="${starD(150 * s, 70 * s, 8, -90)}" fill="${P.light}" ${SW(6)}/><path d="${starD(100 * s, 48 * s, 8, -90)}" fill="#fff"/>`);
    st.key(sb, { x: to.x, y: to.y, s: [0, 1.1, 1.2, 1.25], r: [0, 12, 18, 20], o: [1, 1, 0.5, 0] }, I, 420, 'ease-out');
    const gr = st.g(`<ellipse rx="${n1(70 * s)}" ry="${n1(16 * s)}" fill="none" stroke="${P.main}" stroke-width="${n1(8 * s)}"/>`);
    st.key(gr, { x: to.x, y: gy, s: [0.3, 2.6], o: [1, 0] }, I, 520, 'ease-out');
    for (let k = 0; k < 5 + c.stage; k++) {
      const a = -160 + (k * 140) / (4 + c.stage) + rnd(-8, 8), p = pol(to, a, rnd(150, 210) * s);
      const node = st.g(SH.star(rnd(12, 16) * s, k % 2 ? P.alt : P.main, k % 2 ? P.altDark : P.dark, k % 2 ? P.altLight : P.glow));
      st.key(node, { x: [to.x, p.x], y: [to.y, p.y, p.y + 40 * s], r: [0, 360 * dir], s: [0.4, 1, 0.6], o: [1, 1, 0] }, I + 20, 540, 'cubic-bezier(.2,.8,.4,1)');
    }
    st.flash(I, '#fff3c4', 0.7, 360);
  },
};

// ------------------------------------------------------------------ VINE
const VINE = {
  basic(c) {
    const { st, from, to, P, s, I, T0, d, dir } = c;
    const N = [2, 3, 4][c.stage - 1], gap = [70, 70, 50][c.stage - 1], fly = Math.min(380, I - T0 - 80 - gap * (N - 1));
    const lifts = [0.22, -0.06, 0.12, 0.32], offy = [-26, 20, 4, -8];
    launchPop(c, from, T0, P.light);
    for (let k = 0; k < N; k++) {
      const t0 = I - fly - gap * (N - 1 - k), last = k === N - 1;
      const tg = last ? to : { x: to.x, y: to.y + offy[k] * s };
      const pts = arc(from, tg, d * lifts[k], 12);
      if (c.stage > 1) { // wind slash that chases the leaf
        const len = polyLen(pts), dl = len * 0.28;
        const p = mk('path', { d: ptsD(pts), fill: 'none', stroke: '#f0ffe0', 'stroke-width': n1(6 * s), 'stroke-linecap': 'round', 'stroke-dasharray': `${n1(dl)} ${n1(len * 2)}`, opacity: 0.85 }, st.svg);
        st.anim(p, [{ strokeDashoffset: `${n1(dl)}px`, opacity: 0.85 }, { strokeDashoffset: `${n1(dl - len)}px`, opacity: 0.85, offset: 0.8 }, { strokeDashoffset: `${n1(dl - len)}px`, opacity: 0 }], fly / 0.8, t0);
      }
      const g = st.g();
      const inner = st.g(SH.leaf(60 * s * c.sz, 18 * s * c.sz, P), g);
      st.fly(g, pts, t0, fly);
      st.key(inner, { x: 0, y: 0, r: [0, 1080 * dir] }, t0, fly);
      if (!last) miniPop(c, tg, t0 + fly, P.light);
    }
    if (c.stage === 3) st.trail(arc(from, to, d * 0.1, 10), I - fly, fly, 5, (k) => SH.petal(7 * s, P.alt, P.altLight), { drift: 22 * s, life: 420 });
  },
  power(c) {
    const { st, from, to, P, s, I, T0, d, ang, dir } = c;
    const L = Math.max(80, d - 26 * s), N = 30, amp = 24 * s;
    const pts = [];
    for (let i = 0; i <= N; i++) { const u = i / N; pts.push({ x: u * L, y: Math.sin(u * Math.PI * 2) * amp * (0.35 + 0.65 * u) * dir }); }
    const dd = ptsD(pts), len = polyLen(pts);
    const tot = I + 460, grow0 = T0 + 60, grow1 = T0 + (I - T0) * 0.62, ret0 = I + 120, ret1 = I + 430;
    const G = st.g();
    const a0 = ang - 24 * dir;
    st.key(G, { x: from.x, y: from.y, r: [a0, a0 - 5 * dir, ang + 9 * dir, ang, ang], offs: [0, grow1 / tot, (I - 60) / tot, I / tot, 1] }, 0, tot, 'ease-in-out');
    const W = [1, 1, 1.25][c.stage - 1] * s;
    const layers = [[OL, 22 * W], [P.main, 14 * W], [P.light, 4.5 * W]];
    for (const [col, w] of layers) {
      const p = mk('path', { d: dd, fill: 'none', stroke: col, 'stroke-width': n1(w), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': `${n1(len)} ${n1(len + 60)}`, transform: col === P.light ? `translate(0 ${n1(-3 * W)})` : null }, G);
      const L0 = `${n1(len + 30)}px`;
      st.anim(p, [{ strokeDashoffset: L0 }, { strokeDashoffset: L0, offset: grow0 / tot, easing: 'ease-out' }, { strokeDashoffset: '0px', offset: grow1 / tot }, { strokeDashoffset: '0px', offset: ret0 / tot, easing: 'ease-in' }, { strokeDashoffset: L0 }], tot, 0);
    }
    const nl = [3, 5, 7][c.stage - 1];
    for (let k = 0; k < nl; k++) {
      const u = 0.14 + (0.72 * k) / Math.max(1, nl - 1), p = along(pts, u);
      const tIn = grow0 + (grow1 - grow0) * Math.sqrt(u), tOut = ret0 + (ret1 - ret0) * (1 - u);
      const side = k % 2 ? 1 : -1;
      const node = st.g(SH.leaf(34 * W, 11 * W, P, true), G);
      st.key(node, { x: p.x, y: p.y, r: side * 60 - 20, s: [0, 0, 1.2, 1, 1, 0], offs: [0, tIn / tot, (tIn + 90) / tot, (tIn + 160) / tot, tOut / tot, Math.min(1, (tOut + 80) / tot)] }, 0, tot);
    }
    const bud = st.g(SH.flower(15 * W, P.alt, P.altLight), G);
    st.key(bud, { x: L, y: 0, r: [0, 0, 90, 90], s: [0, 0, 1.2, 1, 1, 0], offs: [0, grow1 / tot, (grow1 + 100) / tot, I / tot, ret0 / tot, (ret0 + 90) / tot] }, 0, tot);
    if (c.stage === 3) st.trail(arc(from, to, 0, 8), grow0, grow1 - grow0, 5, (k) => SH.petal(7 * s, P.alt, P.altLight), { drift: 28 * s, life: 460 });
  },
  ultimate(c) {
    const { st, from, to, P, s, I, T0, dir } = c;
    const gy = c.ground(to), ctr = { x: to.x, y: to.y + 12 * s };
    // petal storm: petals stream from attacker into a swirling orbit around the target, then scatter
    const NP = [10, 14, 18][c.stage - 1];
    for (let k = 0; k < NP; k++) {
      const t0 = T0 + k * 26, tIn = 260, tEnd = I + 300, dur = tEnd - t0;
      const th0 = (k / NP) * 360;
      const kf = { x: [], y: [], r: [], s: [], o: [], offs: [] };
      const push = (t, x, y, r, sc, o) => { kf.offs.push(Math.min(1, Math.max(0, (t - t0) / dur))); kf.x.push(x); kf.y.push(y); kf.r.push(r); kf.s.push(sc); kf.o.push(o); };
      const f0 = { x: from.x + rnd(-20, 20) * s, y: from.y + rnd(-20, 20) * s };
      push(t0, f0.x, f0.y, 0, 0.4, 0);
      const steps = 9;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps, t = t0 + tIn + (I - t0 - tIn) * u;
        const th = (th0 + u * 520 * dir) / DEG, rx = lerp(125, 78, u) * s, ry = lerp(50, 32, u) * s;
        const back = Math.sin(th) < 0;
        push(t, ctr.x + Math.cos(th) * rx, ctr.y + Math.sin(th) * ry, th * DEG + 90, back ? 0.7 : 1.05, back ? 0.55 : 1);
      }
      const thE = (th0 + 520 * dir) / DEG;
      push(tEnd, ctr.x + Math.cos(thE) * 220 * s, ctr.y + Math.sin(thE) * 120 * s, thE * DEG + 200, 0.6, 0);
      const node = st.g(SH.petal(12 * s * c.sz, k % 3 ? P.alt : '#fff0f6', k % 3 ? P.altLight : '#fff'));
      st.key(node, kf, t0, dur);
    }
    // ground crack + giant thorny vines erupting under the target
    const crack = st.g(`<path d="M${n1(-90 * s)} 0l${n1(22 * s)} ${n1(-6 * s)}l${n1(16 * s)} ${n1(8 * s)}l${n1(24 * s)} ${n1(-7 * s)}l${n1(28 * s)} ${n1(6 * s)}l${n1(20 * s)} ${n1(-8 * s)}l${n1(22 * s)} ${n1(7 * s)}l${n1(24 * s)} ${n1(-4 * s)}" fill="none" stroke="${OL}" stroke-width="${n1(5 * s)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    st.key(crack, { x: to.x, y: gy, sx: [0, 1, 1, 1], sy: 1, o: [1, 1, 1, 0] }, I - 420, 900, 'ease-out');
    const NV = [3, 4, 5][c.stage - 1];
    const vx = NV === 3 ? [-60, 0, 60] : NV === 4 ? [-78, -26, 26, 78] : [-92, -46, 0, 46, 92];
    const vh = NV === 3 ? [150, 205, 150] : NV === 4 ? [140, 200, 190, 135] : [130, 185, 225, 180, 125];
    for (let k = 0; k < NV; k++) {
      const lean = (vx[k] / 90) * 0.28, t0 = I - 330 + Math.abs(vx[k]) * 0.6;
      const node = st.g(thornVine(26 * s * [0.9, 1, 1.1][c.stage - 1], vh[k] * s, lean, P, k));
      const tot = I + 460 - t0;
      st.key(node, { x: to.x + vx[k] * s, y: gy, sx: [0.5, 1.1, 1, 1, 0.6], sy: [0, 1.15, 1, 1, 0], o: [1, 1, 1, 1, 0.3], offs: [0, 150 / tot, 240 / tot, (tot - 220) / tot, 1] }, t0, tot, 'ease-out');
    }
    for (let k = 0; k < 6; k++) { // dirt clods
      const x0 = to.x + rnd(-80, 80) * s, x1 = x0 + rnd(-60, 60) * s;
      const node = st.g(SH.chip(rnd(7, 10) * s, k % 2 ? '#8a5a3c' : '#b07a4f'));
      st.key(node, { x: [x0, lerp(x0, x1, 0.5), x1], y: [gy, gy - rnd(70, 120) * s, gy + 10 * s], r: [0, rnd(-300, 300)], o: [1, 1, 0] }, I - 300 + k * 20, 620, 'ease-out');
    }
    // bloom at impact
    const bl = st.g(SH.flower(60 * s, P.alt, P.altLight));
    st.key(bl, { x: to.x, y: to.y, s: [0, 1.25, 1.1, 0], r: [0, 40, 60, 80], o: [1, 1, 1, 0] }, I - 20, 560, 'ease-out');
    st.flash(I, '#f4ffe8', 0.45, 320);
  },
};
/** A tall tapered, curving thorny vine with its base at (0,0). */
function thornVine(w, h, lean, P, seed) {
  const N = 14, L = [], R = [], C = [];
  const wig = seed % 2 ? 1 : -1;
  for (let i = 0; i <= N; i++) {
    const u = i / N, cx = Math.sin(u * Math.PI * 1.3) * w * 0.7 * wig + lean * h * u * u, cy = -h * u, ww = w * Math.pow(1 - u, 0.85) + 1;
    C.push([cx, cy]); L.push([cx - ww, cy]); R.push([cx + ww, cy]);
  }
  const body = 'M' + L.map((p) => `${n1(p[0])} ${n1(p[1])}`).join('L') + 'L' + R.reverse().map((p) => `${n1(p[0])} ${n1(p[1])}`).join('L') + 'Z';
  R.reverse();
  let thorns = '';
  for (const [i, side] of [[3, -1], [5, 1], [7, -1], [9, 1], [11, -1]]) {
    const b = side < 0 ? L[i] : R[i], ww = w * Math.pow(1 - i / N, 0.85) * 0.75 + 5;
    thorns += `<path d="M${n1(b[0])} ${n1(b[1] + ww * 0.5)}L${n1(b[0] + side * ww * 1.1)} ${n1(b[1] - ww * 0.6)}L${n1(b[0])} ${n1(b[1] - ww * 0.5)}Z" fill="#fff4d6" ${SW(3)}/>`;
  }
  const stripe = 'M' + C.slice(1, N - 1).map((p, i) => `${n1(p[0] - w * 0.35 * Math.pow(1 - (i + 1) / N, 0.85))} ${n1(p[1])}`).join('L');
  const leafAt = C[Math.round(N * 0.45)];
  return thorns + `<path d="${body}" fill="${P.main}" ${SW(4.5)}/><path d="${stripe}" fill="none" stroke="${P.light}" stroke-width="${n1(w * 0.28)}" stroke-linecap="round"/>` +
    `<g transform="translate(${n1(leafAt[0] + w * 0.5 * -wig)} ${n1(leafAt[1])}) rotate(${wig > 0 ? 200 : -20})">${SH.leaf(w * 1.5, w * 0.5, P, true)}</g>`;
}

// ------------------------------------------------------------------ STONE
const STONE = {
  basic(c) {
    const { st, from, to, P, s, I, T0, d, dir } = c;
    const t0 = T0 + 110, pts = arc(from, to, d * 0.32, 16);
    const pop = st.g(SH.puff(20 * s, '#f3e0c4', 3));
    st.key(pop, { x: from.x, y: from.y, s: [0.2, 1.1, 1.3], o: [1, 1, 0] }, T0, 320, 'ease-out');
    const r = 22 * s * c.sz;
    const g = st.g(c.stage > 1 ? SH.glow(r * 1.5, P.glow, 0.5) : '');
    const inner = st.g(SH.gem(r, P), g);
    st.fly(g, pts, t0, I - t0);
    st.key(inner, { x: 0, y: 0, r: [0, 540 * dir] }, t0, I - t0);
    st.trail(pts, t0, I - t0, c.trailN(5), (k) => (k % 2 ? SH.puff(rnd(7, 10) * s, '#f3e0c4', 2) : SH.chip(6 * s, P.light)), { drift: 12 * s, life: 420 });
  },
  power(c) {
    const { st, from, to, P, s, I, T0 } = c;
    const g0 = { x: from.x, y: c.ground(from) + 6 * s }, g1 = { x: to.x, y: c.ground(to) };
    const stomp = st.g(`<ellipse rx="${n1(70 * s)}" ry="${n1(16 * s)}" fill="none" stroke="${P.dark}" stroke-width="${n1(7 * s)}"/>`);
    st.key(stomp, { x: g0.x, y: g0.y, s: [0.3, 1.5], o: [1, 0] }, T0, 320, 'ease-out');
    // rock ripple travelling under the ground
    const NB = [4, 6, 8][c.stage - 1];
    for (let k = 0; k < NB; k++) {
      const u = (k + 1) / (NB + 1), p = { x: lerp(g0.x, g1.x, u), y: lerp(g0.y, g1.y, u) };
      const node = st.g(SH.crystal(17 * s, 48 * s * (0.8 + u * 0.5), { main: P.main, dark: P.dark, light: P.light }));
      st.key(node, { x: p.x, y: p.y, sx: [0.6, 1, 0.8], sy: [0, 1.2, 0], o: [1, 1, 0] }, T0 + 100 + u * 380, 280, 'ease-out');
    }
    const crack = st.g(`<path d="M${n1(-70 * s)} 0l${n1(18 * s)} ${n1(-6 * s)}l${n1(18 * s)} ${n1(8 * s)}l${n1(22 * s)} ${n1(-7 * s)}l${n1(24 * s)} ${n1(6 * s)}l${n1(18 * s)} ${n1(-6 * s)}l${n1(20 * s)} ${n1(5 * s)}" fill="none" stroke="${OL}" stroke-width="${n1(5 * s)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    st.key(crack, { x: g1.x, y: g1.y + 4 * s, sx: [0, 1, 1, 1], sy: 1, o: [1, 1, 1, 0] }, I - 280, 800, 'ease-out');
    // crystal spikes erupt
    const NS_ = [3, 5, 7][c.stage - 1];
    const cfg = NS_ === 3 ? [[-44, 100, -14], [44, 105, 14], [0, 165, 0]]
      : NS_ === 5 ? [[-66, 88, -22], [66, 84, 22], [-32, 130, -10], [34, 126, 10], [0, 178, 0]]
        : [[-92, 70, -30], [92, 72, 30], [-64, 104, -20], [64, 100, 20], [-30, 146, -9], [32, 140, 9], [0, 200, 0]];
    const cols = [{ main: '#7d9be0', dark: P.altDark, light: '#dbe8ff' }, { main: P.main, dark: P.dark, light: P.light }];
    cfg.forEach(([x, hh, lean], k) => {
      const t0 = I - 230 + (k < NS_ - 1 ? (NS_ - k) * 12 : 0), tot = I + 470 - t0;
      const node = st.g(SH.crystal((18 + hh * 0.06) * s * c.sz, hh * s * c.sz, cols[k === NS_ - 1 || k % 3 ? 0 : 1]));
      st.key(node, { x: g1.x + x * s, y: g1.y + 6 * s, r: lean, sx: [0.5, 1.05, 1, 1, 0.9], sy: [0, 1.18, 1, 1, 0], o: [1, 1, 1, 1, 0], offs: [0, 130 / tot, 210 / tot, (tot - 230) / tot, 1] }, t0, tot, 'ease-out');
    });
    for (let k = 0; k < 5; k++) {
      const x0 = g1.x + rnd(-60, 60) * s, x1 = x0 + rnd(-70, 70) * s;
      const node = st.g(SH.chip(rnd(6, 9) * s, k % 2 ? P.main : P.alt));
      st.key(node, { x: [x0, lerp(x0, x1, 0.5), x1], y: [g1.y, g1.y - rnd(60, 110) * s, g1.y + 8 * s], r: [0, rnd(-300, 300)], o: [1, 1, 0] }, I - 220 + k * 18, 560, 'ease-out');
    }
  },
  ultimate(c) {
    const { st, from, to, P, s, I, T0, dir } = c;
    const gy = c.ground(to);
    // heave: dust puff + ground ring at the attacker
    const ring = st.g(`<ellipse rx="${n1(80 * s)}" ry="${n1(18 * s)}" fill="none" stroke="${P.dark}" stroke-width="${n1(8 * s)}"/>`);
    st.key(ring, { x: from.x, y: c.ground(from) + 6 * s, s: [0.3, 1.5], o: [1, 0] }, T0 + 200, 380, 'ease-out');
    for (let k = 0; k < 4; k++) {
      const node = st.g(SH.puff(rnd(16, 22) * s, '#f3e0c4', 3));
      const x = from.x + (k - 1.5) * 34 * s, gy0 = c.ground(from);
      st.key(node, { x: [x, x + (k - 1.5) * 20 * s], y: [gy0, gy0 - 30 * s], s: [0.3, 1.1, 1.2], o: [1, 1, 0] }, T0 + 200 + k * 30, 500, 'ease-out');
    }
    // shadow grows under the target
    const sh = st.g(`<ellipse rx="${n1(95 * s)}" ry="${n1(22 * s)}" fill="${OL}"/>`);
    st.key(sh, { x: to.x, y: gy, s: [0.15, 1, 1], o: [0, 0.35, 0], offs: [0, (I - T0 - 380) / (I - T0 - 380 + 160), 1] }, T0 + 380, I - T0 - 380 + 160, 'ease-in');
    // boulder is hurled high off the top of the screen and crashes down, squashes, then crumbles
    const R = 66 * s * c.sz, land = { x: to.x, y: to.y - 6 * s };
    const lift = Math.max(c.d * 0.9, (Math.min(from.y, to.y) + R * 2.2) * 2 - Math.abs(from.y - to.y));
    const pts = arc(from, land, lift, 16);
    const B = st.g();
    const Bs = st.g('', B); // squash layer
    const Br = st.g(SH.boulder(R, P), Bs);
    const t0 = T0 + 240, fdur = I - t0, tot = fdur + 180;
    const bx = [], by = [], bs = [], offs = [];
    pts.forEach((p, i) => { bx.push(p.x); by.push(p.y); bs.push(lerp(0.45, 1, i / (pts.length - 1))); offs.push(((i / (pts.length - 1)) * fdur) / tot); });
    bx.push(land.x); by.push(land.y); bs.push(1); offs.push(1);
    st.key(B, { x: bx, y: by, s: bs, o: bx.map((_, i) => (i === 0 ? 0 : i === bx.length - 1 ? 0 : 1)), offs }, t0, tot);
    st.key(Bs, { x: 0, y: 0, sx: [1, 1, 1.2, 1.05], sy: [1, 1, 0.78, 0.95], offs: [0, fdur / tot, (fdur + 70) / tot, 1] }, t0, tot);
    st.key(Br, { x: 0, y: 0, r: [-30 * dir, 330 * dir] }, t0, fdur);
    st.raise.push(B);
    for (let k = 0; k < 5; k++) { // chunks
      const a = -150 + k * 30 + rnd(-8, 8), p = pol(land, a, rnd(110, 170) * s);
      const node = st.g(SH.chip(rnd(15, 22) * s, k % 2 ? P.main : P.dark));
      st.key(node, { x: [land.x, p.x], y: [land.y, p.y, p.y + 90 * s], r: [0, rnd(-200, 200)], s: [0.6, 1, 0.8], o: [1, 1, 0] }, I + 100, 480, 'cubic-bezier(.2,.7,.5,1)');
    }
    // dust shockwave rolling along the ground
    for (let k = 0; k < 2; k++) {
      const rg = st.g(`<ellipse rx="${n1(80 * s)}" ry="${n1(18 * s)}" fill="none" stroke="#f3e0c4" stroke-width="${n1(12 * s)}"/><ellipse rx="${n1(80 * s)}" ry="${n1(18 * s)}" fill="none" stroke="${OL}" stroke-width="${n1(3 * s)}" opacity=".6"/>`);
      st.key(rg, { x: to.x, y: gy, s: [0.4, 2.6 + k], o: [1, 0] }, I + k * 70, 480, 'ease-out');
    }
    const ND = [6, 8, 10][c.stage - 1];
    for (let k = 0; k < ND; k++) {
      const side = k % 2 ? 1 : -1, dx = side * rnd(90, 200) * s;
      const node = st.g(SH.puff(rnd(16, 26) * s, k % 3 ? '#f3e0c4' : '#e6c9a2', 3));
      st.key(node, { x: [to.x + side * 30 * s, to.x + dx], y: [gy - 6 * s, gy - rnd(10, 40) * s], s: [0.3, 1.1, 1.3], o: [1, 1, 0] }, I + rnd(0, 60), 520, 'cubic-bezier(.2,.8,.4,1)');
    }
    st.flash(I, '#fff6e6', 0.55, 320);
  },
};

// ------------------------------------------------------------------ STORM
function zig(a, b, seg, amp, jag = 1) {
  const d = dist(a, b), n = Math.max(3, Math.round(d / seg)), nx = -(b.y - a.y) / d, ny = (b.x - a.x) / d;
  const pts = [a];
  let sign = Math.random() < 0.5 ? 1 : -1;
  for (let i = 1; i < n; i++) {
    const t = (i + rnd(-0.28, 0.28)) / n;
    if (Math.random() < 0.8) sign = -sign;
    const off = sign * amp * rnd(0.45, 1.1) * (0.35 + 0.65 * Math.sin(Math.PI * t)) * jag;
    pts.push({ x: lerp(a.x, b.x, t) + nx * off, y: lerp(a.y, b.y, t) + ny * off });
  }
  pts.push(b);
  return pts;
}
function orbCharge(c, at, t0, t1, r) {
  const { st, P, s } = c;
  const g = st.g(SH.glow(r * 1.8, P.altLight, 0.55) + `<circle r="${n1(r)}" fill="${P.alt}" ${SW(3)}/><circle r="${n1(r * 0.5)}" fill="#fff"/>`);
  st.key(g, { x: at.x, y: at.y, s: [0, 1, 0.85, 1.1, 0], o: [1, 1, 1, 1, 0] }, t0, t1 - t0 + 80, 'ease-out');
  for (let k = 0; k < 3; k++) {
    const a = k * 120 + rnd(-20, 20), node = st.g(SH.zap(18 * s, P.alt));
    st.key(node, { x: at.x, y: at.y, r: [a, a + 200], s: [0.6, 1.1, 0.6], o: [0, 1, 1, 0] }, t0 + 40 + k * 40, t1 - t0 - 40);
  }
}
const STORM = {
  basic(c) {
    const { st, from, to, P, s, I, T0 } = c;
    const w = [0.8, 1, 1.25][c.stage - 1] * s;
    orbCharge(c, from, T0, T0 + 250, 14 * w);
    const t0 = I - 320;
    const main = zig(from, to, 58 * s, 30 * s);
    st.bolt(main, t0, 240, 300, { w, col: P.alt, glow: c.stage > 1 ? P.main : null });
    if (c.stage > 1) {
      const b0 = along(main, 0.45), b1 = pol(b0, angle(from, to) + rnd(30, 50) * (Math.random() < 0.5 ? 1 : -1), c.d * 0.25);
      st.bolt(zig(b0, b1, 34 * s, 14 * s), t0 + 110, 130, 220, { w: w * 0.6, col: P.alt });
    }
    if (c.stage === 3) st.trail(main, t0, 240, 5, (k) => SH.zap(16 * s, P.alt), { drift: 26 * s, life: 300 });
    st.flash(I, '#fffbd0', 0.3, 220);
  },
  power(c) {
    const { st, from, to, P, s, I, T0 } = c;
    const w = [0.8, 1, 1.2][c.stage - 1] * s;
    orbCharge(c, from, T0, T0 + 380, 18 * w);
    const F = along(line(from, to, 10), 0.36);
    const trunk = zig(from, F, 50 * s, 22 * s);
    const t0 = I - 400;
    st.bolt(trunk, t0, 140, 400, { w: w * 1.1, col: P.alt, glow: P.main });
    const NP = [2, 3, 4][c.stage - 1], spread = [[-50, 50], [-60, 0, 60], [-70, -24, 24, 70]][NP - 2];
    const prongs = spread.map((o, k) => {
      const tg = { x: to.x + rnd(-10, 10) * s, y: to.y + o * s };
      const pts = zig(F, tg, 46 * s, 26 * s);
      st.bolt(pts, t0 + 130 + k * 35, 220 - k * 30, 360, { w: w * 0.85, col: P.alt, glow: k === 1 ? P.main : null });
      return pts;
    });
    const NS2 = [4, 7, 10][c.stage - 1];
    for (let k = 0; k < NS2; k++) {
      const pts = prongs[k % prongs.length], u = rnd(0.2, 0.9), p = along(pts, u), a = rnd(0, 360);
      const node = st.g(SH.zap(rnd(14, 20) * s, k % 2 ? P.alt : '#fff'));
      const q = pol(p, a, rnd(30, 60) * s);
      st.key(node, { x: [p.x, q.x], y: [p.y, q.y + 20 * s], r: a, s: [0.5, 1.1, 0.4], o: [1, 1, 0] }, t0 + 160 + u * 220, 360, 'ease-out');
    }
    st.flash(I, '#fffbd0', 0.4, 260);
  },
  ultimate(c) {
    const { st, from, to, P, s, I, T0, dir } = c;
    const C = { x: to.x + 10 * s * dir, y: Math.max(30 * s, to.y - 200 * s) };
    // darkening sky
    const dark = mk('rect', { x: -60, y: -60, width: st.W + 120, height: st.H + 120, fill: '#1b1440' }, st.svg);
    st.anim(dark, [{ opacity: 0 }, { opacity: 0.3, offset: 0.35 }, { opacity: 0.3, offset: 0.62 }, { opacity: 0 }], I - T0 + 300, T0 + 200);
    // energy orb rises from attacker to the cloud
    const orb = st.g(SH.glow(26 * s, P.altLight, 0.6) + `<circle r="${n1(15 * s)}" fill="${P.alt}" ${SW(3)}/><circle r="${n1(7 * s)}" fill="#fff"/>`);
    st.fly(orb, arc(from, C, 80 * s, 10), T0, 440, { easing: 'ease-in', s0: 0.5, s1: 1 });
    // storm cloud builds, rumbles, then drifts away
    const cw = 290 * s * [0.9, 1, 1.15][c.stage - 1];
    const cg = st.g();
    const ci = st.g(SH.cloud(cw), cg);
    const tot = I - T0 - 240 + 520;
    st.key(cg, { x: C.x, y: C.y, s: [0.2, 1.08, 1, 1, 1.1], o: [0, 1, 1, 1, 0], offs: [0, 280 / tot, 380 / tot, (tot - 260) / tot, 1] }, T0 + 240, tot, 'ease-out');
    st.key(ci, { x: [0, -5, 5, -4, 4, 0], y: 0 }, I - 460, 400);
    for (let k = 0; k < 2 + c.stage; k++) { // cloud crackles
      const a = { x: C.x + rnd(-0.35, 0.35) * cw, y: C.y + rnd(-10, 10) * s };
      st.bolt(zig(a, pol(a, rnd(0, 360), rnd(30, 50) * s), 12 * s, 7 * s), I - 520 + k * 90, 60, 120, { w: 0.45 * s, col: P.alt });
    }
    // the huge bolt
    const w = [1.5, 1.8, 2.1][c.stage - 1] * s;
    const top = { x: C.x, y: C.y + 30 * s }, bot = { x: to.x, y: c.ground(to) - 8 * s };
    const main = zig(top, bot, 30 * s, 26 * s);
    st.raise.push(st.bolt(main, I - 150, 120, 480, { w, col: P.alt, glow: P.main }));
    const b0 = along(main, 0.5);
    st.raise.push(st.bolt(zig(b0, pol(b0, 90 + 55 * dir, 90 * s), 30 * s, 14 * s), I - 80, 100, 300, { w: w * 0.45, col: P.alt }));
    if (c.stage > 1) st.raise.push(st.bolt(zig(along(main, 0.3), pol(along(main, 0.3), 90 - 60 * dir, 80 * s), 30 * s, 12 * s), I - 110, 100, 300, { w: w * 0.4, col: P.alt }));
    // ground sparks
    for (let k = 0; k < 4 + c.stage * 2; k++) {
      const a = -180 + (k * 180) / (3 + c.stage * 2), p = pol(bot, a, rnd(70, 130) * s);
      const node = st.g(SH.zap(rnd(18, 24) * s, k % 2 ? P.alt : '#fff'));
      st.key(node, { x: [bot.x, p.x], y: [bot.y - 20 * s, p.y], r: a, s: [0.6, 1.2, 0.5], o: [1, 1, 0] }, I + 10, 420, 'ease-out');
    }
    st.flash(I, '#ffffff', 0.7, 300);
  },
};

// ------------------------------------------------------------------ ARCANE (wizard)
const ARCANE = {
  any(c) {
    const { st, from, to, P, s, I, T0, d, dir, power } = c;
    const lvl = power === 'ultimate' ? 2 : power === 'power' ? 1 : 0;
    const R = (20 + lvl * 6) * s * c.sz;
    // summoning circle at the caster
    const sc = st.g(SH.runes(40 * s * (1 + lvl * 0.25), P.altLight, 4 * s));
    st.key(sc, { x: from.x, y: from.y, sx: [0, 1.1, 1, 1.4], sy: [0, 0.5, 0.45, 0.6], r: [0, 90, 150, 200], o: [0, 1, 1, 0] }, T0, 420, 'ease-out');
    const t0 = T0 + 200, fdur = I - t0;
    const fill = st.grad([[0, '#fff'], [0.45, P.light], [1, P.main]], true);
    const pts = arc(from, to, d * 0.14, 16).map((p, i, a) => {
      const u = i / (a.length - 1), w = Math.sin(u * Math.PI * 3) * 14 * s * Math.sin(u * Math.PI);
      const nx = -(to.y - from.y) / d, ny = (to.x - from.x) / d;
      return { x: p.x + nx * w, y: p.y + ny * w };
    });
    const g = st.g(SH.glow(R * 2.3, P.altLight, 0.35) + SH.glow(R * 1.5, '#fff', 0.45));
    const ring = st.g(SH.runes(R * 1.8, '#ffd6f5', 4 * s), g);
    st.g(SH.orb(R, P, fill), g);
    st.fly(g, pts, t0, fdur, { s0: 0.4, s1: 1, easing: 'ease-in-out' });
    st.key(ring, { x: 0, y: 0, r: [0, 540 * dir], s: [0.8, 1.1, 0.9, 1.05] }, t0, fdur);
    for (let k = 0; k < lvl + (c.stage === 3 ? 1 : 0); k++) { // orbiting motes
      const m = st.g(`<g transform="translate(${n1(R * 2.3)} 0)">${SH.dot(R * 0.36, k % 2 ? P.alt : P.altLight, 2)}</g>`, g);
      st.key(m, { x: 0, y: 0, r: [k * 180, k * 180 + 720 * dir] }, t0, fdur);
    }
    st.trail(pts, t0, fdur, c.trailN(7 + lvl * 2), (k) => SH.sparkle(rnd(10, 15) * s, [P.altLight, '#fff', P.alt][k % 3]), { drift: 22 * s, life: 460 });
    if (lvl === 2) {
      const st2 = st.g(SH.runes(90 * s, P.altLight, 6 * s));
      st.key(st2, { x: to.x, y: to.y, s: [0.2, 1.1, 1.4], r: [0, 60, 90], o: [1, 1, 0] }, I, 520, 'ease-out');
      st.flash(I, '#f1e6ff', 0.6, 340);
    }
  },
};

const EFFECTS = { star: STAR, vine: VINE, stone: STONE, storm: STORM };

// ------------------------------------------------------------------ public API
/**
 * Play a spell effect inside `layer` (an absolutely positioned container covering the battle field).
 * from/to: {x, y} centre points in layer pixels (attacker -> target).
 * element: 'star' | 'vine' | 'stone' | 'storm' | 'arcane'; family: optional maths-family flavour.
 * power: 'basic' | 'power' | 'ultimate'; stage: 1 | 2 | 3 (evolution stage; bigger + flashier, default 2).
 * crit, effect ('super' | 'weak' | 'normal'), scale (1 = normal).
 * Returns { impact: Promise (moment of hit), done: Promise (all visuals removed), shake: suggested shake strength, nodes }.
 */
export function playSpell(layer, { from, to, element = 'star', family, power = 'basic', stage = 2, crit = false, effect = 'normal', scale = 1, also = [], sparkle = false } = {}) {
  const st = new Scene(layer);
  const el = FX_PAL[element] ? element : 'star';
  const pw = TIMING[power] ? power : 'basic';
  const sg = Math.max(1, Math.min(3, Math.round(stage) || 2));
  const s = scale > 0 ? scale : 1;
  const T0 = sg === 3 ? 230 : 0;
  const I = TIMING[pw] + (sg === 3 ? 120 : 0);
  const c = {
    st, from, to, element: el, el, family, power: pw, stage: sg, crit: !!crit, effect, s, I, T0, P: FX_PAL[el],
    sz: [1, 1.2, 1.42][sg - 1], d: Math.max(1, dist(from, to)), ang: angle(from, to), dir: to.x >= from.x ? 1 : -1,
    ground: (p) => p.y + 92 * s,
    trailN: (n) => (sg === 1 ? Math.floor(n / 3) : sg === 2 ? n : Math.round(n * 1.6)),
  };
  try {
    if (sg === 3) chargeUp(c, from, 0, T0 + 40);
    if (el === 'arcane') ARCANE.any(c); else EFFECTS[el][pw](c);
    impact(c, to, I, { big: pw === 'ultimate' ? 1.25 : pw === 'power' ? 1.1 : 1 });
    // Moves that hit every enemy: a burst on each of the others too, a beat apart, so the whole row visibly gets hit.
    also.forEach((p, k) => impact({ ...c, crit: false }, p, I + 70 + k * 70, { big: 0.85 }));
    // Sparkly (rare variant) pets: a trail of twinkles along the path and around the hit.
    if (sparkle) {
      for (let k = 0; k < 7; k++) { const u = k / 6, p = { x: lerp(from.x, to.x, u), y: lerp(from.y, to.y, u) - Math.sin(u * Math.PI) * 50 * s }; twinkles(c, p, T0 + u * (I - T0), 1, 14 * s, ['#fff', '#ffe68a', '#ffc4e0'], 11); }
      twinkles(c, to, I + 40, 6, 90 * s, ['#fff', '#ffe68a', '#ffc4e0'], 13);
    }
    if (sg === 3 && pw !== 'ultimate') st.flash(I, c.P.glow, 0.35, 240);
  } catch (err) {
    console.warn('[fx] spell effect failed', err); // never block the battle: promises still resolve on time
    st.end = Math.max(st.end, I + 400);
  }
  const shake = +(({ basic: 0.6, power: 1, ultimate: 1.7 })[pw] * (crit ? 1.4 : 1) * (effect === 'super' ? 1.2 : effect === 'weak' ? 0.6 : 1) * [0.85, 1, 1.2][sg - 1] * Math.sqrt(s)).toFixed(2);
  return st.finish(I, { shake, impactAt: I });
}

/**
 * Effects for moves that aren't attacks, played on the unit they affect (v62: these used to show only floating text).
 * kind: heal | regen | shield | armor | empower | rally | haste | slow | freeze | stun | weaken | taunt | cleanse.
 * Returns { done }.
 */
export function playBuff(layer, at, { kind = 'heal', element = 'star', scale = 1 } = {}) {
  const st = new Scene(layer), s = scale, P = FX_PAL[element] || FX_PAL.star;
  const feet = at.y + 80 * s;
  const ring = (col, r0, r1, t, dur, w = 7) => { const g = st.g(`<circle r="${n1(60 * s)}" fill="none" stroke="${OL}" stroke-width="${n1((w + 3) * s)}" opacity=".35"/><circle r="${n1(60 * s)}" fill="none" stroke="${col}" stroke-width="${n1(w * s)}"/>`); st.key(g, { x: at.x, y: at.y, s: [r0, r1], o: [0, 1, 0] }, t, dur, 'ease-out'); };
  const rise = (make, n, t, spread = 70, dist = 120) => { for (let k = 0; k < n; k++) { const x = at.x + rnd(-spread, spread) * s, y0 = at.y + rnd(10, 50) * s; const node = st.g(make(k)); st.key(node, { x: [x, x + rnd(-10, 10) * s], y: [y0, y0 - dist * s], s: [0.2, 1.1, 0.8], r: [0, rnd(-40, 40)], o: [0, 1, 1, 0] }, t + rnd(0, 260), rnd(520, 700), 'ease-out'); } };
  const plus = (r, fill) => `<path d="M${n1(-r * 0.32)} ${n1(-r)}h${n1(r * 0.64)}v${n1(r * 0.68)}h${n1(r * 0.68)}v${n1(r * 0.64)}h${n1(-r * 0.68)}v${n1(r * 0.68)}h${n1(-r * 0.64)}v${n1(-r * 0.68)}h${n1(-r * 0.68)}v${n1(-r * 0.64)}h${n1(r * 0.68)}Z" fill="${fill}" ${SW(Math.max(2, r * 0.18))}/>`;
  switch (kind) {
    case 'heal': case 'cleanse': {
      const glow = st.g(`<circle r="${n1(90 * s)}" fill="${st.grad([[0, '#fff', 0.9], [0.5, '#c9f7c4', 0.6], [1, '#6fd07a', 0]], true)}"/>`);
      st.key(glow, { x: at.x, y: at.y, s: [0.3, 1.1, 1.2], o: [0, 0.9, 0] }, 0, 700, 'ease-out');
      rise((k) => (k % 3 === 2 ? SH.heart(11 * s, '#ff8fb4') : plus(13 * s, k % 2 ? '#6fd07a' : '#aaf0a0')), 9, 0);
      if (kind === 'cleanse') { ring('#ffffff', 0.4, 1.8, 120, 520, 6); rise((k) => SH.sparkle(12 * s, k % 2 ? '#fff' : '#d8f0ff'), 6, 150); }
      break;
    }
    case 'regen': {
      rise((k) => (k % 2 ? SH.leaf(26 * s, 9 * s, FX_PAL.vine) : SH.petal(10 * s, '#ff86b4', '#ffd0e2')), 8, 0, 60, 100);
      const g = st.g(`<ellipse rx="${n1(80 * s)}" ry="${n1(20 * s)}" fill="${st.grad([[0, '#eaffd8', 1], [1, '#4fbf6a', 0]], true)}"/>`);
      st.key(g, { x: at.x, y: feet, s: [0.3, 1.1, 1], o: [0, 0.9, 0] }, 0, 800, 'ease-out');
      break;
    }
    case 'shield': {
      const b = st.g(`<circle r="${n1(78 * s)}" fill="#bfe6ff" fill-opacity=".35" ${SW(4 * s)}/><circle r="${n1(78 * s)}" fill="none" stroke="#7cc8ff" stroke-width="${n1(5 * s)}"/><path d="M${n1(-46 * s)} ${n1(-40 * s)}Q${n1(-30 * s)} ${n1(-62 * s)} ${n1(-4 * s)} ${n1(-66 * s)}" fill="none" stroke="#fff" stroke-width="${n1(7 * s)}" stroke-linecap="round"/>`);
      st.key(b, { x: at.x, y: at.y, s: [0.2, 1.12, 0.96, 1], o: [0, 1, 1, 0], offs: [0, 0.3, 0.75, 1] }, 0, 800, 'ease-out');
      rise(() => SH.sparkle(10 * s, '#ffffff'), 4, 200, 60, 50);
      break;
    }
    case 'armor': {
      for (let k = 0; k < 6; k++) { const a = k * 60, p0 = pol(at, a, 140 * s), p1 = pol(at, a, 56 * s); const g = st.g(SH.chip(17 * s, k % 2 ? P.main : '#c9b8a6')); st.key(g, { x: [p0.x, p1.x], y: [p0.y, p1.y], r: [a, a + 90], s: [0.5, 1.1, 1], o: [0, 1, 1, 0] }, k * 35, 650, 'ease-in'); }
      ring('#a4532a', 1.2, 0.95, 330, 420, 9);
      break;
    }
    case 'empower': case 'rally': {
      const col = kind === 'rally' ? '#ff7a45' : '#ffb03b';
      const aura = st.g(`<ellipse rx="${n1(70 * s)}" ry="${n1(95 * s)}" fill="${st.grad([[0, '#fff3c2', 0.9], [0.6, col, 0.55], [1, col, 0]], true)}"/>`);
      st.key(aura, { x: at.x, y: at.y - 10 * s, s: [0.3, 1.1, 1, 1.15], o: [0, 1, 0.8, 0] }, 0, 800, 'ease-out');
      for (let k = 0; k < 3; k++) { const g = st.g(SH.chevron(30 * s, col)); st.key(g, { x: at.x, y: [at.y + 40 * s, at.y - 110 * s], s: [0.5, 1.1, 1], o: [0, 1, 1, 0] }, 80 + k * 150, 600, 'ease-out'); }
      break;
    }
    case 'haste': {
      for (let k = 0; k < 6; k++) { const y = at.y + (k - 2.5) * 18 * s, x0 = at.x + 110 * s, x1 = at.x - 120 * s; const g = st.g(`<path d="M0 0H${n1(70 * s)}" stroke="#a6f0f5" stroke-width="${n1(6 * s)}" stroke-linecap="round"/><path d="M0 0H${n1(70 * s)}" stroke="#fff" stroke-width="${n1(2.5 * s)}" stroke-linecap="round"/>`); st.key(g, { x: [x0, x1], y, o: [0, 1, 0] }, k * 55, 380, 'ease-in'); }
      ring('#3fb6c6', 0.5, 1.5, 120, 420, 5);
      break;
    }
    case 'slow': {
      const sw = st.g(`<path d="M0 0m${n1(-50 * s)} 0a${n1(50 * s)} ${n1(50 * s)} 0 1 1 ${n1(100 * s)} 0a${n1(38 * s)} ${n1(38 * s)} 0 1 1 ${n1(-76 * s)} 0a${n1(26 * s)} ${n1(26 * s)} 0 1 1 ${n1(52 * s)} 0" fill="none" stroke="#9b7be0" stroke-width="${n1(7 * s)}" stroke-linecap="round"/>`);
      st.key(sw, { x: at.x, y: at.y - 20 * s, r: [0, -320], s: [0.4, 1, 0.8], o: [0, 1, 0] }, 0, 900, 'ease-out');
      for (let k = 0; k < 4; k++) { const g = st.g(SH.dot(7 * s, '#cdb8ff', 2)); const x = at.x + (k - 1.5) * 30 * s; st.key(g, { x, y: [at.y - 60 * s, at.y + 40 * s], o: [0, 1, 0] }, 100 + k * 90, 650, 'ease-in'); }
      break;
    }
    case 'freeze': {
      const ice = st.g(`<rect x="${n1(-62 * s)}" y="${n1(-80 * s)}" width="${n1(124 * s)}" height="${n1(160 * s)}" rx="${n1(18 * s)}" fill="#d8f4ff" fill-opacity=".55" ${SW(4 * s)}/><path d="M${n1(-40 * s)} ${n1(-60 * s)}L${n1(-14 * s)} ${n1(-60 * s)}" stroke="#fff" stroke-width="${n1(8 * s)}" stroke-linecap="round"/><path d="M${n1(30 * s)} ${n1(40 * s)}L${n1(44 * s)} ${n1(20 * s)}" stroke="#fff" stroke-width="${n1(6 * s)}" stroke-linecap="round"/>`);
      st.key(ice, { x: at.x, y: at.y, sy: [0, 1.05, 1], sx: [0.9, 1, 1], o: [0, 1, 1, 0], offs: [0, 0.25, 0.8, 1] }, 0, 900, 'ease-out');
      for (let k = 0; k < 6; k++) { const p = pol(at, k * 60 + 30, 95 * s); const g = st.g(SH.sparkle(13 * s, k % 2 ? '#ffffff' : '#a6e3ff')); st.key(g, { x: p.x, y: p.y, s: [0, 1.2, 0], r: [0, 90], o: 1 }, 150 + k * 50, 420, 'ease-out'); }
      break;
    }
    case 'stun': {
      for (let k = 0; k < 3; k++) {
        const node = st.g(SH.star(12 * s, '#f5b83d', '#c98a12', '#fff4c2')); const th = k * 120; const xs = [], ys = [];
        for (let i = 0; i <= 8; i++) { const a = (th + i * 45) / DEG; xs.push(at.x + Math.cos(a) * 48 * s); ys.push(at.y - 70 * s + Math.sin(a) * 14 * s); }
        st.key(node, { x: xs, y: ys, r: [0, 360], s: [0, 1, 1, 1, 1, 1, 1, 0.8, 0], o: 1 }, k * 60, 900);
      }
      ring('#ffd23f', 0.4, 1.4, 0, 400, 6);
      break;
    }
    case 'weaken': {
      for (let k = 0; k < 5; k++) { const x = at.x + rnd(-45, 45) * s; const g = st.g(`<path d="M0 ${n1(-12 * s)}C${n1(9 * s)} 0 ${n1(9 * s)} ${n1(10 * s)} 0 ${n1(10 * s)}C${n1(-9 * s)} ${n1(10 * s)} ${n1(-9 * s)} 0 0 ${n1(-12 * s)}Z" fill="#7cc8ff" ${SW(2.5 * s)}/>`); st.key(g, { x, y: [at.y - 80 * s, at.y + 60 * s], s: [0.6, 1, 0.9], o: [0, 1, 1, 0] }, k * 90, 600, 'ease-in'); }
      const dim = st.g(`<circle r="${n1(80 * s)}" fill="#5a5a7a" opacity=".35"/>`);
      st.key(dim, { x: at.x, y: at.y, s: [0.5, 1.1], o: [0, 0.8, 0] }, 50, 700, 'ease-out');
      break;
    }
    case 'taunt': {
      for (let k = 0; k < 3; k++) ring('#ff5d73', 0.4, 2.1, k * 140, 520, 8);
      const bang = st.g(`<text font-size="${n1(64 * s)}" font-weight="900" text-anchor="middle" fill="#ffd23f" stroke="${OL}" stroke-width="${n1(6 * s)}" paint-order="stroke" style="font-family:${FONT.replace(/"/g, "'")}">!</text>`);
      st.key(bang, { x: at.x, y: [at.y - 60 * s, at.y - 90 * s], s: [0.3, 1.3, 1], o: [0, 1, 1, 0] }, 0, 750, 'ease-out');
      break;
    }
    default: rise(() => SH.sparkle(11 * s, '#fff'), 6, 0);
  }
  return st.finish(null);
}

/**
 * Super Move set piece: the screen dims, the caster's art sweeps in big with the move's name, then a flash.
 * art = SVG markup of the caster (a pet or the Star Dragon). Returns { done } (about 1.2 s).
 */
export function playSuper(layer, { art, name, element = 'star', side = 'ally' } = {}) {
  const P = FX_PAL[element] || FX_PAL.star;
  const host = document.createElement('div');
  host.className = 'super-move ' + side;
  host.innerHTML = `<div class="sm-dim"></div><div class="sm-rays" style="--sm-main:${P.main};--sm-light:${P.light}"></div><div class="sm-art">${art || ''}</div><div class="sm-name"><span>SUPER MOVE</span><b>${name}</b></div>`;
  layer.appendChild(host);
  const done = new Promise((res) => setTimeout(() => { host.classList.add('out'); setTimeout(() => { host.remove(); res(); }, 260); }, 1150));
  return { done };
}

/** A puff-of-smoke poof with sparkles where a pet faints. Returns { done }. */
export function playFaint(layer, at, { scale = 1 } = {}) {
  const st = new Scene(layer), s = scale;
  const big = st.g(SH.puff(46 * s, '#ffffff', 4));
  st.key(big, { x: at.x, y: at.y, s: [0.2, 1.15, 0.2], o: [1, 1, 0] }, 0, 420, 'ease-out');
  for (let k = 0; k < 9; k++) {
    const a = k * 40 + rnd(-10, 10), p0 = pol(at, a, 14 * s), p1 = pol(at, a, rnd(62, 88) * s);
    const node = st.g(SH.puff(rnd(18, 26) * s, k % 2 ? '#ffffff' : '#ece5f8', 3));
    st.key(node, { x: [p0.x, p1.x], y: [p0.y, p1.y - 22 * s], s: [0.3, 1.1, 0.7], o: [1, 1, 0] }, 40 + k * 14, 760, 'cubic-bezier(.2,.8,.3,1)');
  }
  for (let k = 0; k < 6; k++) {
    const p = pol(at, rnd(0, 360), rnd(40, 95) * s);
    const node = st.g(SH.sparkle(rnd(10, 14) * s, k % 2 ? '#fff4b8' : '#ffffff'));
    st.key(node, { x: p.x, y: [p.y, p.y - 16 * s], s: [0, 1.2, 0], r: [0, 120], o: 1 }, 180 + k * 80, 420, 'ease-out');
  }
  for (let k = 0; k < 3; k++) { // little dizzy stars
    const node = st.g(SH.star(9 * s, '#f5b83d', '#c98a12', '#fff4c2'));
    const th = k * 120;
    const xs = [], ys = [];
    for (let i = 0; i <= 8; i++) { const a = (th + i * 45) / DEG; xs.push(at.x + Math.cos(a) * 40 * s); ys.push(at.y - 40 * s + Math.sin(a) * 12 * s - i * 3 * s); }
    st.key(node, { x: xs, y: ys, r: [0, 360], s: [0, 1, 1, 1, 1, 1, 1, 0.8, 0], o: 1 }, 260, 800);
  }
  return st.finish(null);
}

/** Magical befriend effect: a ring of light closes in while hearts and stars swirl into the target. */
export function playCatch(layer, at, { scale = 1 } = {}) {
  const st = new Scene(layer), s = scale;
  const ring = st.g(`<circle r="${n1(115 * s)}" fill="none" stroke="#ffd35a" stroke-width="${n1(12 * s)}"/><circle r="${n1(115 * s)}" fill="none" stroke="#fff" stroke-width="${n1(4 * s)}"/><circle r="${n1(100 * s)}" fill="none" stroke="#ff9cc8" stroke-width="${n1(3 * s)}" stroke-dasharray="${n1(10 * s)} ${n1(14 * s)}"/>`);
  st.key(ring, { x: at.x, y: at.y, s: [1.7, 1, 1, 0.1], r: [0, 60, 180, 300], o: [0, 1, 1, 0.8], offs: [0, 0.3, 0.7, 1] }, 0, 1150, 'ease-in-out');
  const aura = st.g(`<circle r="${n1(110 * s)}" fill="${st.grad([[0, '#fff', 0.9], [0.5, '#ffe6f2', 0.5], [1, '#ffd35a', 0]], true)}"/>`);
  st.key(aura, { x: at.x, y: at.y, s: [0.4, 1, 0.8, 1.4], o: [0, 0.8, 0.9, 0] }, 150, 1300, 'ease-out');
  const N = 12;
  for (let k = 0; k < N; k++) {
    const t0 = 60 + k * 45, dur = 1150 - t0, th0 = (k / N) * 360;
    const xs = [], ys = [], sc = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10, a = (th0 + u * 400) / DEG, r = lerp(170, 6, u * u) * s;
      xs.push(at.x + Math.cos(a) * r); ys.push(at.y + Math.sin(a) * r * 0.8); sc.push(i === 10 ? 0.2 : 0.7 + Math.sin(u * Math.PI) * 0.5);
    }
    const node = st.g(k % 2 ? SH.heart(13 * s, '#ff6fa5') : SH.star(13 * s, '#f5b83d', '#c98a12', '#fff4c2'));
    st.key(node, { x: xs, y: ys, s: sc, r: [0, k % 2 ? 0 : 300], o: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.8] }, t0, dur, 'ease-in');
  }
  const fl = st.g(`<circle r="${n1(80 * s)}" fill="#fff"/>`);
  st.key(fl, { x: at.x, y: at.y, s: [0.2, 1.3, 1.6], o: [1, 0.9, 0] }, 1150, 320, 'ease-out');
  const heart = st.g(SH.heart(46 * s, '#ff5f9e'));
  st.key(heart, { x: at.x, y: [at.y, at.y - 10 * s, at.y - 70 * s], s: [0, 1.3, 1, 1], o: [1, 1, 1, 0], offs: [0, 0.25, 0.45, 1] }, 1150, 850, 'ease-out');
  for (let k = 0; k < 8; k++) {
    const a = k * 45, p = pol(at, a, rnd(90, 130) * s);
    const node = st.g(SH.sparkle(rnd(10, 14) * s, k % 2 ? '#ffd35a' : '#ffc4e0'));
    st.key(node, { x: [at.x, p.x], y: [at.y, p.y], s: [0.3, 1.1, 0], r: [0, 120], o: 1 }, 1170, 520, 'ease-out');
  }
  return st.finish(null);
}

/** Rising golden sparkles, arrows and a rising ring of light for a level-up. Returns { done }. */
export function playLevelUp(layer, at, { scale = 1 } = {}) {
  const st = new Scene(layer), s = scale;
  const feet = at.y + 92 * s;
  const glow = st.g(`<ellipse rx="${n1(95 * s)}" ry="${n1(24 * s)}" fill="${st.grad([[0, '#fff6c8', 1], [0.6, '#ffd35a', 0.7], [1, '#ffd35a', 0]], true)}"/>`);
  st.key(glow, { x: at.x, y: feet, s: [0.3, 1.1, 1, 1.2], o: [0, 1, 1, 0] }, 0, 1500, 'ease-out');
  for (let k = 0; k < 2; k++) {
    const rg = st.g(`<ellipse rx="${n1(85 * s)}" ry="${n1(20 * s)}" fill="none" stroke="#ffd35a" stroke-width="${n1(7 * s)}"/><ellipse rx="${n1(85 * s)}" ry="${n1(20 * s)}" fill="none" stroke="#fff" stroke-width="${n1(2.5 * s)}"/>`);
    st.key(rg, { x: at.x, y: [feet, at.y - 110 * s], s: [1, 0.7], o: [0, 1, 1, 0] }, 100 + k * 380, 900, 'ease-out');
  }
  for (let k = 0; k < 16; k++) {
    const x = at.x + rnd(-85, 85) * s, y0 = feet - rnd(0, 30) * s, y1 = at.y - rnd(110, 190) * s;
    const node = st.g(k % 4 === 0 ? SH.star(rnd(8, 11) * s, '#f5b83d', '#c98a12', '#fff4c2') : SH.sparkle(rnd(8, 13) * s, k % 2 ? '#ffe68a' : '#ffffff'));
    st.key(node, { x: [x, x + rnd(-15, 15) * s], y: [y0, y1], s: [0, 1.1, 0.9, 0], r: [0, rnd(-180, 180)], o: 1 }, rnd(0, 800), rnd(700, 950), 'ease-out');
  }
  for (let k = 0; k < 3; k++) {
    const node = st.g(SH.chevron(34 * s, '#ffd35a'));
    st.key(node, { x: at.x, y: [at.y + 50 * s, at.y - 130 * s], s: [0.5, 1.1, 1], o: [0, 1, 1, 0] }, 150 + k * 230, 800, 'ease-out');
  }
  return st.finish(null);
}

/** Screen shake on an element (Web Animations API). Returns a promise that resolves when it ends. */
export function shake(el, strength = 1) {
  if (!el || !el.animate) return Promise.resolve();
  const a = 9 * strength, pts = [[0, 0], [-a, a * 0.45], [a * 0.9, -a * 0.5], [-a * 0.7, a * 0.35], [a * 0.5, -a * 0.25], [-a * 0.28, a * 0.12], [a * 0.12, 0], [0, 0]];
  const frames = pts.map(([x, y]) => ({ transform: `translate(${n1(x)}px, ${n1(y)}px)` }));
  let anim;
  try { anim = el.animate(frames, { duration: 300 + 140 * Math.min(strength, 2.5), easing: 'ease-out', composite: 'add' }); }
  catch { anim = el.animate(frames, { duration: 300 + 140 * Math.min(strength, 2.5), easing: 'ease-out' }); }
  return anim.finished.then(() => {}, () => {});
}

/** The wizard's Star Dragon (Super Move art): a chunky cartoon dragon in the arcane/star palette. */
export function dragonSVG() {
  const O = OL;
  return `<svg viewBox="0 0 220 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M60 120 C20 80 10 40 40 20 C50 50 70 60 92 70 Z" fill="#8a63e6" stroke="${O}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M150 112 C200 80 214 36 186 14 C176 46 152 58 130 66 Z" fill="#8a63e6" stroke="${O}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M40 20 L52 58 M186 14 L170 54" stroke="#cdb8ff" stroke-width="4" stroke-linecap="round"/>
  <path d="M70 150 C60 180 30 186 14 172 C34 170 44 160 50 146" fill="#7a52d6" stroke="${O}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M12 172 l-8 -10 l12 2 l-2 -12 l10 10 Z" fill="#f5b83d" stroke="${O}" stroke-width="4" stroke-linejoin="round"/>
  <ellipse cx="108" cy="128" rx="54" ry="44" fill="#8a63e6" stroke="${O}" stroke-width="5"/>
  <ellipse cx="108" cy="140" rx="32" ry="26" fill="#ffe68a" stroke="${O}" stroke-width="4"/>
  <path d="M108 124 l5 10 l11 1 l-8 7 l3 11 l-11 -6 l-11 6 l3 -11 l-8 -7 l11 -1 Z" fill="#f5b83d" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M82 166 l-6 22 h16 Z M130 166 l6 22 h-16 Z" fill="#7a52d6" stroke="${O}" stroke-width="4" stroke-linejoin="round"/>
  <ellipse cx="112" cy="72" rx="40" ry="34" fill="#9a75f0" stroke="${O}" stroke-width="5"/>
  <path d="M86 46 l-10 -26 l20 18 Z M132 44 l12 -26 l-4 26 Z" fill="#f5b83d" stroke="${O}" stroke-width="4" stroke-linejoin="round"/>
  <ellipse cx="140" cy="84" rx="24" ry="16" fill="#b394ff" stroke="${O}" stroke-width="4"/>
  <circle cx="150" cy="82" r="3" fill="${O}"/><circle cx="160" cy="88" r="3" fill="${O}"/>
  <ellipse cx="108" cy="66" rx="10" ry="12" fill="#fff" stroke="${O}" stroke-width="3"/><circle cx="111" cy="67" r="6" fill="${O}"/><circle cx="113" cy="64" r="2.2" fill="#fff"/>
  <path d="M96 52 q12 -8 24 0" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round"/>
  <path d="M164 92 q14 4 22 -4 q-6 10 -18 12" fill="#ffb03b" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
</svg>`;
}

// Math-visuals renderer. See docs/VISUALS_SPEC.md.
// renderVisual({ type, ...params }, { maxWidth, maxHeight }) -> standalone <svg> string.
// Pure SVG strings, no external assets. Never throws.

const FONT = "Nunito, 'Trebuchet MS', system-ui, sans-serif";
const INK = '#2b2140';
const SOFT = '#7a7390';
const LINE = '#c9c3dc';

// Colour-blind-friendly palette (Okabe–Ito inspired, brightened for kids).
const PALETTE = {
  red: '#E4572E', blue: '#2F7ED8', green: '#12A37F', yellow: '#F7D23E', orange: '#F59E1B',
  purple: '#8A5CC7', pink: '#EC8FC4', teal: '#35BFD0', brown: '#9A6236', grey: '#A3A8B0',
  gray: '#A3A8B0', black: '#2B2140', white: '#FFFFFF',
};
const CYCLE = ['blue', 'orange', 'green', 'purple', 'red', 'teal', 'pink', 'yellow', 'brown', 'grey'];
const PATTERNS = ['solid', 'stripes', 'dots', 'grid', 'hatch', 'rings'];

// ---------------------------------------------------------------- helpers
const f = (n) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : 0);
function num(v, d = 0) {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const int = (v, d, lo, hi) => clamp(Math.round(num(v, d)), lo, hi);
const arr = (v) => (Array.isArray(v) ? v : []);
const isQ = (v) => typeof v === 'string' && v.trim() === '?';
const str = (v) => (v === null || v === undefined || typeof v === 'object' || typeof v === 'function' || (typeof v === 'number' && !Number.isFinite(v)) ? '' : String(v));
function esc(s) {
  return str(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function col(c, fb = 'blue') {
  if (typeof c === 'string') {
    const k = c.trim().toLowerCase();
    if (PALETTE[k]) return PALETTE[k];
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(k)) return k;
  }
  return PALETTE[fb] || fb;
}
function rgb(h) {
  let s = str(h).replace('#', '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  const n = parseInt(s, 16);
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [128, 128, 128];
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const light = (c, t = 0.5) => mix(c, '#ffffff', t);
const dark = (c, t = 0.25) => mix(c, '#000000', t);
function lum(c) { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
const onColor = (c) => (lum(c) > 0.6 ? INK : '#ffffff');

const KEYMAP = {
  sw: 'stroke-width', da: 'stroke-dasharray', op: 'opacity', fo: 'fill-opacity', fs: 'font-size',
  fw: 'font-weight', ta: 'text-anchor', db: 'dominant-baseline', tf: 'transform', lc: 'stroke-linecap',
  lj: 'stroke-linejoin', cp: 'clip-path', so: 'stroke-opacity',
};
function attr(o) {
  let s = '';
  for (const k in o) {
    const v = o[k];
    if (v === undefined || v === null || v === false) continue;
    s += ` ${KEYMAP[k] || k}="${typeof v === 'number' ? f(v) : v}"`;
  }
  return s;
}
const el = (tag, o, inner) => (inner === undefined ? `<${tag}${attr(o)}/>` : `<${tag}${attr(o)}>${inner}</${tag}>`);
const P = (list) => list.map((p) => `${f(p[0])},${f(p[1])}`).join(' ');
const rect = (x, y, w, h, o = {}) => el('rect', { x, y, width: Math.max(0, w), height: Math.max(0, h), ...o });
const circ = (cx, cy, r, o = {}) => el('circle', { cx, cy, r: Math.max(0, r), ...o });
const line = (x1, y1, x2, y2, o = {}) => el('line', { x1, y1, x2, y2, stroke: INK, sw: 3, ...o });
const poly = (pts, o = {}) => el('polygon', { points: P(pts), ...o });
const pathEl = (d, o = {}) => el('path', { d, ...o });
const g = (inner, o = {}) => el('g', o, inner);
const polar = (cx, cy, r, deg) => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];

function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s) { let h = 2166136261; for (const c of str(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

function niceStep(raw) {
  if (!(raw > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}
const decimalsOf = (n) => { const s = String(Math.round(n * 1e6) / 1e6); return s.includes('.') ? s.split('.')[1].length : 0; };

// ------------------------------------------------------- number formatting
const NBSP = '\u00a0';
const groupDigits = (d) => (d.length >= 5 ? d.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP) : d);
function fmtNum(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return str(n);
  const r = Math.round(n * 1e6) / 1e6;
  let s = String(Math.abs(r));
  if (s.includes('e')) s = Math.abs(r).toFixed(0);
  const [i, d] = s.split('.');
  return (r < 0 ? '\u2212' : '') + groupDigits(i) + (d ? '.' + d : '');
}
function fmtText(v) {
  if (typeof v === 'number') return fmtNum(v);
  return str(v).replace(/(^|[^\d.,])(\d{5,})(?!\d)/g, (m, p, d) => p + groupDigits(d));
}

// ------------------------------------------------------------- text sizing
function charW(ch) {
  const c = ch.codePointAt(0);
  if (c >= 0x1f000 || (c >= 0x2600 && c <= 0x27bf) || (c >= 0x2b00 && c <= 0x2bff)) return 1.25;
  if (c === 0xfe0f || c === 0x200d) return 0;
  if (ch === ' ' || ch === NBSP) return 0.32;
  if ('.,:;\'|!il'.includes(ch)) return 0.32;
  if ('fjrtI()[]'.includes(ch)) return 0.42;
  if ('mwMW'.includes(ch)) return 0.92;
  if (/[A-Z]/.test(ch)) return 0.72;
  if (/[0-9]/.test(ch)) return 0.64;
  if ('×÷+−-=<>?'.includes(ch)) return 0.7;
  return 0.6;
}
function textW(s, size) { let w = 0; for (const ch of str(s)) w += charW(ch); return w * size * 1.04; }

// ---------------------------------------------------- rich text (fractions)
const FRAC_SRC = '\\[\\[f:\\s*(?:(-?\\d+)\\s+)?(-?\\d+)\\s*\\/\\s*(-?\\d+)\\s*\\]\\]';
function parseRich(input) {
  const s = str(input);
  const re = new RegExp(FRAC_SRC, 'g');
  const out = [];
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ t: 's', s: s.slice(last, m.index) });
    out.push({ t: 'f', w: m[1] === undefined ? null : m[1], n: m[2], d: m[3] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ t: 's', s: s.slice(last) });
  return out;
}
const hasFrac = (s) => new RegExp(FRAC_SRC).test(str(s));
function fracMetrics(p, size) {
  const fs = size * 0.8;
  const bw = Math.max(textW(p.n, fs), textW(p.d, fs)) + size * 0.28;
  const ww = p.w !== null ? textW(p.w, size) + size * 0.1 : 0;
  return { fs, bw, ww, w: ww + bw + size * 0.12 };
}
function richW(input, size) {
  let w = 0;
  for (const p of parseRich(input)) w += p.t === 's' ? textW(fmtText(p.s), size) : fracMetrics(p, size).w;
  return w;
}
// Draw text (with optional [[f:a/b]] fractions) with its baseline at y.
function T(x, y, input, o = {}) {
  const size = o.size || 20, anchor = o.anchor || 'middle', weight = o.weight || 700, fill = o.fill || INK;
  const halo = o.halo ? ` stroke="${o.halo}" stroke-width="${f(size * 0.2)}" stroke-linejoin="round" paint-order="stroke"` : '';
  const extra = o.extra || '';
  const base = (sz, anc) => `font-size="${f(sz)}" font-weight="${weight}" fill="${fill}" text-anchor="${anc}"${halo}${extra}`;
  const parts = parseRich(input);
  if (!parts.some((p) => p.t === 'f')) return `<text x="${f(x)}" y="${f(y)}" ${base(size, anchor)}>${esc(fmtText(input))}</text>`;
  const W = richW(input, size);
  let cx = anchor === 'middle' ? x - W / 2 : anchor === 'end' ? x - W : x;
  let out = '';
  for (const p of parts) {
    if (p.t === 's') {
      const raw = fmtText(p.s), s = raw.trim();
      if (/^\s/.test(raw)) cx += textW(' ', size);
      if (s) {
        const tw = textW(s, size);
        out += `<text x="${f(cx)}" y="${f(y)}" ${base(size, 'start')} textLength="${f(tw)}" lengthAdjust="spacingAndGlyphs">${esc(s)}</text>`;
        cx += tw;
      }
      if (/\s$/.test(raw) && s) cx += textW(' ', size);
    } else {
      const m = fracMetrics(p, size);
      if (p.w !== null) out += `<text x="${f(cx)}" y="${f(y)}" ${base(size, 'start')}>${esc(p.w)}</text>`;
      const mx = cx + m.ww + size * 0.06 + m.bw / 2, ly = y - size * 0.32;
      out += `<text x="${f(mx)}" y="${f(ly - m.fs * 0.2)}" ${base(m.fs, 'middle')}>${esc(p.n)}</text>`;
      out += line(mx - m.bw / 2 + size * 0.05, ly, mx + m.bw / 2 - size * 0.05, ly, { stroke: fill, sw: Math.max(2, size * 0.09) });
      out += `<text x="${f(mx)}" y="${f(ly + m.fs * 0.92)}" ${base(m.fs, 'middle')}>${esc(p.d)}</text>`;
      cx += m.w;
    }
  }
  return `<g>${out}</g>`;
}

// HTML rich text for the UI.
export const FRAC_CSS = [
  '.frac{display:inline-flex;flex-direction:column;align-items:stretch;vertical-align:middle;text-align:center;font-size:.82em;line-height:1.08;margin:0 .1em;}',
  '.frac>.num{display:block;padding:0 .18em .04em;border-bottom:.1em solid currentColor;}',
  '.frac>.den{display:block;padding:.04em .18em 0;}',
  '.mixed{white-space:nowrap;}',
  '.mixed>.whole{margin-right:.06em;}',
  '.frac .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}',
].join('\n');

export function renderRichText(input) {
  try {
    let html = '';
    for (const p of parseRich(input)) {
      if (p.t === 's') { html += esc(p.s); continue; }
      const frac = `<span class="frac" role="math" aria-label="${esc(p.n)}/${esc(p.d)}"><span class="num">${esc(p.n)}</span><span class="den">${esc(p.d)}</span></span>`;
      html += p.w !== null ? `<span class="mixed"><span class="whole">${esc(p.w)}</span>${frac}</span>` : frac;
    }
    return html;
  } catch (e) {
    return esc(input);
  }
}

// ----------------------------------------------------------- id + patterns
let idCounter = 0;
const idSalt = Math.random().toString(36).slice(2, 7);
function makeCtx() {
  const uid = `mv${idSalt}${(idCounter++).toString(36)}`;
  let k = 0;
  const ctx = { uid, defs: [], id: (name) => `${uid}-${name}${k++}` };
  const cache = {};
  // Returns a fill value: a colour, or url(#pattern) with the colour plus white marks.
  ctx.fill = (kind, color) => {
    if (!kind || kind === 'solid') return color;
    const key = kind + color;
    if (cache[key]) return cache[key];
    const id = ctx.id('p');
    let inner = rect(0, 0, 12, 12, { fill: color });
    let extra = '';
    if (kind === 'stripes') { inner += rect(0, 0, 4.5, 12, { fill: '#fff', op: 0.6 }); extra = ' patternTransform="rotate(45)"'; }
    else if (kind === 'dots') inner += circ(6, 6, 2.6, { fill: '#fff', op: 0.75 });
    else if (kind === 'grid') inner += pathEl('M0 0.8H12M0.8 0V12', { stroke: '#fff', sw: 2.4, op: 0.65, fill: 'none' });
    else if (kind === 'hatch') { inner += rect(0, 0, 3.5, 12, { fill: INK, op: 0.28 }); extra = ' patternTransform="rotate(-45)"'; }
    else if (kind === 'rings') inner += circ(6, 6, 3.4, { fill: 'none', stroke: '#fff', sw: 1.8, op: 0.8 });
    else return color;
    ctx.defs.push(`<pattern id="${id}" patternUnits="userSpaceOnUse" width="12" height="12"${extra}>${inner}</pattern>`);
    return (cache[key] = `url(#${id})`);
  };
  return ctx;
}

// Emoji icon or a plain coloured counter.
function icon(ic, cx, cy, size, color = PALETTE.blue, o = {}) {
  if (typeof ic === 'string' && ic.trim() && ic.trim() !== 'dot') {
    return `<text x="${f(cx)}" y="${f(cy + size * 0.06)}" font-size="${f(size)}" text-anchor="middle" dominant-baseline="central"${o.op ? ` opacity="${o.op}"` : ''}>${esc(ic.trim())}</text>`;
  }
  const r = size * 0.4;
  return circ(cx, cy, r, { fill: color, stroke: INK, sw: 2.5, op: o.op }) +
    el('ellipse', { cx: cx - r * 0.32, cy: cy - r * 0.36, rx: r * 0.3, ry: r * 0.18, fill: '#fff', op: 0.55 });
}

function qbox(cx, cy, w, h, size = 26) {
  return rect(cx - w / 2, cy - h / 2, w, h, { rx: 8, fill: '#FFF6D6', stroke: INK, sw: 2.5, da: '6 5' }) +
    T(cx, cy + size * 0.36, '?', { size, weight: 800 });
}

const R = {};
// ======================================================= counting & number
function counter(cx, cy, r, color, kind) {
  let s = circ(cx, cy, r, { fill: color, stroke: INK, sw: 3 });
  if (kind === 'b') s += circ(cx, cy, r * 0.4, { fill: '#fff', stroke: INK, sw: 2.2 });
  else s += el('ellipse', { cx: cx - r * 0.32, cy: cy - r * 0.36, rx: r * 0.3, ry: r * 0.18, fill: '#fff', op: 0.6 });
  return s;
}
function frameGrid(x, y, cols, rows, cell, fills, colA, colB) {
  let s = rect(x, y, cols * cell, rows * cell, { rx: 10, fill: '#fff', stroke: INK, sw: 4 });
  for (let c = 1; c < cols; c++) s += line(x + c * cell, y, x + c * cell, y + rows * cell, { sw: 2.5 });
  for (let r = 1; r < rows; r++) s += line(x, y + r * cell, x + cols * cell, y + r * cell, { sw: 2.5 });
  fills.forEach((k, i) => {
    if (!k) return;
    s += counter(x + ((i % cols) + 0.5) * cell, y + (Math.floor(i / cols) + 0.5) * cell, cell * 0.36, k === 'a' ? colA : colB, k);
  });
  return s;
}
R.tenframe = (v) => {
  const count = int(v.count, 0, 0, 20), count2 = int(v.count2, 0, 0, 20 - count), total = count + count2;
  const frames = total > 10 ? 2 : int(v.frames, 1, 1, 2);
  const cell = 50, fw = cell * 5, fh = cell * 2, gap = 28, m = 6;
  const colA = col(v.color, 'red'), colB = col(v.color2, colA === PALETTE.blue ? 'orange' : 'blue');
  let body = '';
  for (let k = 0; k < frames; k++) {
    const fills = [];
    for (let i = 0; i < 10; i++) { const n = k * 10 + i; fills.push(n < count ? 'a' : n < total ? 'b' : null); }
    body += frameGrid(m + k * (fw + gap), m, 5, 2, cell, fills, colA, colB);
  }
  return { w: m * 2 + frames * fw + (frames - 1) * gap, h: fh + m * 2, body, label: `ten frame showing ${total}` };
};
R.fiveframe = (v) => {
  const count = int(v.count, 0, 0, 5), cell = 56, m = 6;
  const fills = [0, 1, 2, 3, 4].map((i) => (i < count ? 'a' : null));
  return { w: cell * 5 + m * 2, h: cell + m * 2, body: frameGrid(m, m, 5, 1, cell, fills, col(v.color, 'red')), label: `five frame showing ${count}` };
};

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 3, 6, 2, 5, 8] };
function dieFace(x, y, s, val, pip = INK, face = '#fff') {
  let out = rect(x, y, s, s, { rx: s * 0.18, fill: face, stroke: INK, sw: 4 });
  for (const i of PIPS[clamp(Math.round(val), 1, 6)] || []) {
    const px = x + s * (0.24 + 0.26 * (i % 3)), py = y + s * (0.24 + 0.26 * Math.floor(i / 3));
    out += circ(px, py, s * 0.095, { fill: pip, stroke: pip === INK ? 'none' : INK, sw: 2 });
  }
  return out;
}
function dotCluster(n, x, y, r, gap, color) {
  // n dots in dice pattern (<=6) or two rows; returns {w,h,body}
  const d = r * 2 + gap;
  if (n <= 6 && n >= 1) {
    let body = '';
    for (const i of PIPS[n]) body += counter(x + r + (i % 3) * d, y + r + Math.floor(i / 3) * d, r, color, 'a');
    return { w: d * 2 + r * 2, h: d * 2 + r * 2, body };
  }
  const cols = Math.ceil(n / 2);
  let body = '';
  for (let i = 0; i < n; i++) body += counter(x + r + (i % cols) * d, y + r + Math.floor(i / cols) * d, r, color, 'a');
  return { w: cols * d - gap, h: d * 2 - gap, body };
}
R.dots = (v) => {
  const n = int(v.count, 1, 1, 20), color = col(v.color, 'blue');
  let arrangement = ['dice', 'random', 'line', 'groups'].includes(v.arrangement) ? v.arrangement : 'dice';
  const r = 14, m = 8;
  if (arrangement === 'dice' && n > 12) arrangement = 'groups';
  const label = `${n} dots`;
  if (arrangement === 'dice') {
    const vals = n <= 6 ? [n] : [Math.ceil(n / 2), n - Math.ceil(n / 2)];
    const s = 110; let body = '';
    vals.forEach((val, i) => {
      body += rect(m + i * (s + 24), m, s, s, { rx: 20, fill: '#fff', stroke: INK, sw: 4 });
      for (const k of PIPS[val]) body += counter(m + i * (s + 24) + s * (0.22 + 0.28 * (k % 3)), m + s * (0.22 + 0.28 * Math.floor(k / 3)), 12, color, 'a');
    });
    return { w: m * 2 + vals.length * s + (vals.length - 1) * 24, h: s + m * 2, body, label };
  }
  if (arrangement === 'line') {
    const d = 38; let body = '', x = m + r;
    for (let i = 0; i < n; i++) { if (i && i % 5 === 0) x += 12; body += counter(x, m + r + 4, r, color, 'a'); x += d; }
    return { w: x - d + r + m, h: r * 2 + m * 2 + 8, body, label };
  }
  if (arrangement === 'groups') {
    const gs = int(v.groupSize, 5, 1, 10);
    let x = m, body = '', h = 0;
    const clusters = [];
    for (let left = n; left > 0; left -= gs) clusters.push(Math.min(gs, left));
    for (const c of clusters) {
      const cl = dotCluster(c, x + 10, m + 10, r - 1, 8, color);
      body += rect(x, m, cl.w + 20, cl.h + 20, { rx: 16, fill: light(color, 0.85), stroke: light(color, 0.4), sw: 2.5 });
      body += cl.body;
      x += cl.w + 20 + 18; h = Math.max(h, cl.h + 20);
    }
    // vertically centre shorter clusters is unnecessary: all start at top
    return { w: x - 18 + m, h: h + m * 2, body, label };
  }
  // random (deterministic)
  const W = clamp(90 + Math.sqrt(n) * 70, 160, 380), H = clamp(W * 0.62, 110, 230);
  const rand = rng(n * 7919 + 17);
  const pts = [];
  for (let tries = 0; pts.length < n && tries < 4000; tries++) {
    const p = [r + 4 + rand() * (W - 2 * r - 8), r + 4 + rand() * (H - 2 * r - 8)];
    if (pts.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > r * 2 + 8)) pts.push(p);
  }
  for (let i = pts.length; i < n; i++) pts.push([r + 4 + (i % 10) * 32, H - r - 4]);
  const body = rect(2, 2, W - 4, H - 4, { rx: 18, fill: '#FBFAFF', stroke: LINE, sw: 3 }) + pts.map((p) => counter(p[0], p[1], r, color, 'a')).join('');
  return { w: W, h: H, body, label };
};

function hand(ox, oy, n, mirror) {
  const skin = '#F7C9A0', cuff = PALETTE.blue;
  const fingers = [{ x: 41, h: 70 }, { x: 64, h: 80 }, { x: 87, h: 74 }, { x: 110, h: 58 }];
  const top = 100;
  let s = '';
  fingers.forEach((fg, i) => {
    const up = n > i, h = up ? fg.h : 13;
    s += rect(fg.x, top - h, 20, h + 34, { rx: 10, fill: skin, stroke: INK, sw: 3.5 });
    if (up) s += line(fg.x + 5, top - h + 30, fg.x + 15, top - h + 30, { stroke: '#d9a47a', sw: 2.5 });
  });
  const thumbUp = n >= 5;
  if (thumbUp) s += rect(-11, -64, 22, 68, { rx: 11, fill: skin, stroke: INK, sw: 3.5, tf: 'translate(46 150) rotate(-38)' });
  s += rect(38, 92, 96, 88, { rx: 30, fill: skin, stroke: INK, sw: 3.5 });
  if (!thumbUp) s += rect(-11, -40, 22, 44, { rx: 11, fill: skin, stroke: INK, sw: 3.5, tf: 'translate(50 158) rotate(62)' });
  s += rect(50, 172, 72, 20, { rx: 6, fill: cuff, stroke: INK, sw: 3.5 });
  const tf = mirror ? `translate(${f(ox + 150)} ${f(oy)}) scale(-1 1)` : `translate(${f(ox)} ${f(oy)})`;
  return g(s, { tf });
}
R.fingers = (v) => {
  const n = int(v.count, 0, 0, 10);
  const two = n > 5;
  const body = hand(0, 6, Math.min(n, 5), false) + (two ? hand(150, 6, n - 5, true) : '');
  return { w: two ? 300 : 150, h: 200, body, label: `${n} fingers held up` };
};

R.rekenrek = (v) => {
  const rows = [int(v.top, 0, 0, 10), int(v.bottom, 0, 0, 10)];
  const W = 570, d = 36, rr = 17;
  let body = rect(8, 12, 18, 170, { rx: 8, fill: PALETTE.brown, stroke: INK, sw: 3 }) + rect(W - 26, 12, 18, 170, { rx: 8, fill: PALETTE.brown, stroke: INK, sw: 3 });
  rows.forEach((cnt, r) => {
    const y = 62 + r * 70;
    body += line(26, y, W - 26, y, { stroke: '#8b8f99', sw: 5 });
    for (let i = 0; i < 10; i++) {
      const x = i < cnt ? 26 + rr + 6 + i * d : W - 26 - rr - 6 - (9 - i) * d;
      const red = i < 5;
      body += el('ellipse', { cx: x, cy: y, rx: rr, ry: rr + 3, fill: red ? PALETTE.red : '#fff', stroke: INK, sw: 3 });
      body += el('ellipse', { cx: x - 5, cy: y - 8, rx: 5, ry: 3.5, fill: '#fff', op: red ? 0.6 : 0 });
      if (!red) body += line(x, y - rr + 4, x, y + rr - 2, { stroke: '#d8d3e6', sw: 2 });
    }
  });
  return { w: W, h: 196, body, label: `rekenrek, top row ${rows[0]}, bottom row ${rows[1]}` };
};

// Base-ten blocks
function unitGrid(x, y, w, h, u, fill) {
  let s = rect(x, y, w, h, { fill, stroke: INK, sw: 2.2 });
  let d = '';
  for (let i = 1; i < Math.round(w / u); i++) d += `M${f(x + i * u)} ${f(y)}V${f(y + h)}`;
  for (let i = 1; i < Math.round(h / u); i++) d += `M${f(x)} ${f(y + i * u)}H${f(x + w)}`;
  if (d) s += pathEl(d, { stroke: INK, sw: 1, so: 0.45, fill: 'none' });
  return s + rect(x, y, w, h, { fill: 'none', stroke: INK, sw: 2.4 });
}
R.base10 = (v) => {
  const th = int(v.thousands, 0, 0, 9), hu = int(v.hundreds, 0, 0, 20), te = int(v.tens, 0, 0, 30), on = int(v.ones, 0, 0, 30);
  const C = { th: '#F6A6C9', hu: '#8EC5FF', te: '#7ED6A7', on: '#FFD84D' };
  // layout in units
  const blocks = [];
  if (th) { const per = Math.min(th, 5), rows = Math.ceil(th / per); blocks.push({ k: 'th', n: th, per, w: per * 14.5 - 1.5, h: rows * 14.5 - 1.5 }); }
  if (hu) { const per = Math.min(hu, 5), rows = Math.ceil(hu / per); blocks.push({ k: 'hu', n: hu, per, w: per * 11.2 - 1.2, h: rows * 11.2 - 1.2 }); }
  if (te) { const per = Math.min(te, 10), rows = Math.ceil(te / per); blocks.push({ k: 'te', n: te, per, w: per * 1.6 - 0.6 + (per > 5 ? 0.8 : 0), h: rows * 11 - 1 }); }
  if (on) { const cols = Math.ceil(on / 5); blocks.push({ k: 'on', n: on, cols, w: cols * 1.5 - 0.5 + Math.floor((cols - 1) / 2) * 0.6, h: Math.min(on, 5) * 1.5 - 0.5 }); }
  if (!blocks.length) return { w: 200, h: 60, body: T(100, 38, '0', { size: 24, fill: SOFT }), label: 'no blocks' };
  const Wu = blocks.reduce((a, b) => a + b.w, 0) + (blocks.length - 1) * 3.5;
  const Hu = Math.max(...blocks.map((b) => b.h));
  const u = clamp(Math.min(600 / Wu, 300 / Hu), 5, 14), m = 6;
  let x = m, body = '';
  const baseY = m + Hu * u;
  for (const b of blocks) {
    const top = baseY - b.h * u;
    if (b.k === 'th') {
      for (let i = 0; i < b.n; i++) {
        const cx = x + (i % b.per) * 14.5 * u, cy = top + Math.floor(i / b.per) * 14.5 * u;
        const s = 10 * u, dp = 3 * u, fx = cx, fy = cy + dp;
        body += unitGrid(fx, fy, s, s, u, C.th);
        const topFace = [[fx, fy], [fx + dp, fy - dp], [fx + s + dp, fy - dp], [fx + s, fy]];
        const side = [[fx + s, fy], [fx + s + dp, fy - dp], [fx + s + dp, fy + s - dp], [fx + s, fy + s]];
        body += poly(topFace, { fill: light(C.th, 0.35), stroke: INK, sw: 2.2 }) + poly(side, { fill: dark(C.th, 0.12), stroke: INK, sw: 2.2 });
        let d = '';
        for (let k = 1; k < 10; k++) {
          d += `M${f(fx + k * u)} ${f(fy)}L${f(fx + k * u + dp)} ${f(fy - dp)}`;
          d += `M${f(fx + s + (dp * k) / 10)} ${f(fy - (dp * k) / 10)}L${f(fx + s + (dp * k) / 10)} ${f(fy + s - (dp * k) / 10)}`;
        }
        body += pathEl(d, { stroke: INK, sw: 1, so: 0.4, fill: 'none' });
      }
    } else if (b.k === 'hu') {
      for (let i = 0; i < b.n; i++) body += unitGrid(x + (i % b.per) * 11.2 * u, top + Math.floor(i / b.per) * 11.2 * u, 10 * u, 10 * u, u, C.hu);
    } else if (b.k === 'te') {
      for (let i = 0; i < b.n; i++) {
        const c = i % b.per;
        body += unitGrid(x + (c * 1.6 + (c >= 5 ? 0.8 : 0)) * u, top + Math.floor(i / b.per) * 11 * u, u, 10 * u, u, C.te);
      }
    } else {
      for (let i = 0; i < b.n; i++) {
        const c = Math.floor(i / 5), r = i % 5;
        body += unitGrid(x + (c * 1.5 + Math.floor(c / 2) * 0.6) * u, baseY - (r + 1) * 1.5 * u + 0.5 * u, u, u, u, C.on);
      }
    }
    x += (b.w + 3.5) * u;
  }
  return { w: x - 3.5 * u + m, h: baseY + m, body, label: `base ten blocks: ${th} thousands, ${hu} hundreds, ${te} tens, ${on} ones` };
};

R.placevalue = (v) => {
  let digits = arr(v.digits);
  const DEF = ['Ones', 'Tens', 'Hundreds', 'Thousands', 'Ten Thousands', 'Hundred Thousands', 'Millions'];
  let cols = arr(v.columns).map(str);
  if (!cols.length) cols = DEF.slice(0, clamp(digits.length || 3, 1, 7)).reverse();
  cols = cols.slice(0, 8);
  const blank = v.blank === undefined || v.blank === null ? -1 : int(v.blank, -1, -1, 99);
  const tints = ['#FFE2B8', '#D5F1E4', '#D9E8FF', '#F6DDF0', '#FFF1B8', '#E6DDFB', '#DDF3F6', '#F0E2D5'];
  const hs = 18;
  const widths = cols.map((c) => Math.max(92, textW(c, hs) + 26));
  const W = widths.reduce((a, b) => a + b, 0), m = 4, hh = 46, dh = 72;
  let x = m, body = '';
  cols.forEach((c, i) => {
    const w = widths[i], tint = tints[(cols.length - 1 - i) % tints.length];
    body += rect(x, m, w, hh, { fill: tint });
    body += T(x + w / 2, m + 30, c, { size: hs, weight: 800 });
    body += rect(x, m + hh, w, dh, { fill: '#fff' });
    const d = digits[i];
    if (i === blank || isQ(d)) body += qbox(x + w / 2, m + hh + dh / 2, 50, 54, 32);
    else if (d !== undefined && d !== null && str(d) !== '') body += T(x + w / 2, m + hh + dh / 2 + 15, str(d), { size: 42, weight: 800 });
    if (i) body += line(x, m, x, m + hh + dh, { sw: 3 });
    x += w;
  });
  body += line(m, m + hh, m + W, m + hh, { sw: 3 });
  body += rect(m, m, W, hh + dh, { rx: 10, fill: 'none', stroke: INK, sw: 4 });
  return { w: W + m * 2, h: hh + dh + m * 2, body, label: 'place value chart' };
};

// Number line
R.numberline = (v) => {
  let min = num(v.min, 0), max = num(v.max, 10);
  if (max < min) [min, max] = [max, min];
  if (max === min) max = min + 1;
  const range = max - min;
  const fmt = ['number', 'fraction', 'decimal'].includes(v.labelFormat) ? v.labelFormat : 'number';
  let den = int(v.denominator, 0, 0, 100);
  let step = num(v.ticks, 0);
  if (!(step > 0)) {
    if (fmt === 'fraction' && den > 0) step = 1 / den;
    else if (range <= 20 && Number.isInteger(min) && Number.isInteger(max)) step = 1;
    else step = niceStep(range / 10);
  }
  while (range / step > 60) step *= 2;
  if (fmt === 'fraction' && !den) den = clamp(Math.round(1 / step), 1, 100);
  const dec = Math.max(decimalsOf(step), decimalsOf(min));
  const nT = Math.floor(range / step + 1e-6);
  const ticks = [];
  for (let k = 0; k <= nT; k++) ticks.push(Math.round((min + k * step) * 1e9) / 1e9);
  if (Math.abs(ticks[ticks.length - 1] - max) > 1e-9) ticks.push(max);
  const near = (a, b) => Math.abs(a - b) < step * 1e-3 + 1e-9;

  const labelOf = (val) => {
    if (fmt === 'fraction') {
      const n = val * den;
      if (Math.abs(n - Math.round(n)) < 1e-6) {
        const ni = Math.round(n);
        return ni % den === 0 ? fmtNum(ni / den) : `[[f:${ni}/${den}]]`;
      }
      return fmtNum(Math.round(val * 1000) / 1000);
    }
    if (fmt === 'decimal') return Number.isInteger(Math.round(val * 1e9) / 1e9) ? fmtNum(Math.round(val)) : val.toFixed(Math.max(1, dec));
    return fmtNum(Math.round(val * 1e6) / 1e6);
  };
  let labelVals;
  if (v.labels === 'ends') labelVals = [min, max];
  else if (Array.isArray(v.labels)) labelVals = v.labels.map((x) => num(x, NaN)).filter((x) => Number.isFinite(x) && x >= min - 1e-9 && x <= max + 1e-9);
  else {
    labelVals = ticks.slice();
    const W0 = 520, spacing = W0 / Math.max(1, ticks.length - 1);
    const lw = Math.max(...ticks.map((t) => richW(labelOf(t), 20))) + 10;
    if (spacing < lw) {
      const k = Math.ceil(lw / spacing);
      labelVals = ticks.filter((t, i) => i % k === 0 || i === ticks.length - 1);
      if (labelVals.length > 1 && (ticks.length - 1) % k !== 0) labelVals.splice(labelVals.length - 2, 1);
    }
  }
  const W = 600, X0 = 44, X1 = W - 44;
  const X = (val) => X0 + ((clamp(val, min, max) - min) / range) * (X1 - X0);
  const marks = arr(v.marks).filter((mk) => mk && Number.isFinite(num(mk.value, NaN)));
  const jumps = arr(v.jumps).filter((j) => j && Number.isFinite(num(j.from, NaN)) && Number.isFinite(num(j.to, NaN)));
  const hasArrow = Number.isFinite(num(v.arrow, NaN));
  const blankAt = Number.isFinite(num(v.blankAt, NaN)) ? num(v.blankAt) : null;
  const fracLabels = labelVals.some((t) => hasFrac(labelOf(t)));

  let top = 16;
  const jh = jumps.map((j) => clamp(Math.abs(X(num(j.to)) - X(num(j.from))) * 0.42, 30, 78));
  if (jumps.length) top = Math.max(top, Math.max(...jh) + (jumps.some((j) => j.label !== undefined) ? (jumps.some((j) => hasFrac(j.label)) ? 44 : 30) : 12));
  if (marks.length) top = Math.max(top, marks.some((mk) => hasFrac(mk.label)) ? 58 : 44);
  if (hasArrow) top = Math.max(top, 64);
  const y = top + 6;
  let body = '';
  // jumps (drawn under the line)
  jumps.forEach((j, i) => {
    const x1 = X(num(j.from)), x2 = X(num(j.to)), h = jh[i], mx = (x1 + x2) / 2, cy = y - 2 * h;
    const c = PALETTE.purple;
    body += pathEl(`M${f(x1)} ${f(y - 5)}Q${f(mx)} ${f(cy)} ${f(x2)} ${f(y - 5)}`, { fill: 'none', stroke: c, sw: 4 });
    const ang = Math.atan2(y - 5 - cy, x2 - mx), L = 13;
    const tip = [x2, y - 5];
    body += poly([tip, [tip[0] - L * Math.cos(ang - 0.45), tip[1] - L * Math.sin(ang - 0.45)], [tip[0] - L * Math.cos(ang + 0.45), tip[1] - L * Math.sin(ang + 0.45)]], { fill: c, stroke: c, sw: 2 });
    if (j.label !== undefined && str(j.label) !== '') body += T(mx, y - h - 12, str(j.label), { size: 20, fill: dark(c, 0.2), halo: '#fff' });
  });
  // main line with arrowheads
  body += line(X0 - 26, y, X1 + 26, y, { sw: 4 });
  body += poly([[X0 - 34, y], [X0 - 20, y - 8], [X0 - 20, y + 8]], { fill: INK }) + poly([[X1 + 34, y], [X1 + 20, y - 8], [X1 + 20, y + 8]], { fill: INK });
  ticks.forEach((t) => {
    const major = (step < 1 && Number.isInteger(Math.round(t * 1e9) / 1e9)) || (step >= 1 && ticks.length > 12 && Math.round((t - min) / step) % 5 === 0);
    const L = major ? 14 : 10;
    body += line(X(t), y - L, X(t), y + L, { sw: major ? 4 : 3 });
  });
  const ly = y + (fracLabels ? 48 : 40);
  labelVals.forEach((t) => {
    if (blankAt !== null && near(t, blankAt)) return;
    body += T(X(t), ly, labelOf(t), { size: fracLabels ? 22 : 21 });
  });
  if (blankAt !== null) body += qbox(X(blankAt), ly - 8, 40, fracLabels ? 48 : 38, 24);
  marks.forEach((mk, i) => {
    const c = col(mk.color, CYCLE[i % CYCLE.length]), x = X(num(mk.value));
    body += circ(x, y, 10, { fill: c, stroke: INK, sw: 3 });
    const touched = jumps.some((j) => near(num(j.to), num(mk.value)) || near(num(j.from), num(mk.value)));
    if (mk.label !== undefined && str(mk.label) !== '') body += touched ? T(x + 13, y - 12, str(mk.label), { size: 22, anchor: 'start', halo: '#fff' }) : T(x, y - 20, str(mk.label), { size: 22, fill: INK, halo: '#fff' });
  });
  if (hasArrow) {
    const x = X(num(v.arrow)), c = PALETTE.red;
    body += line(x, y - 60, x, y - 30, { stroke: c, sw: 7 }) + poly([[x, y - 12], [x - 13, y - 32], [x + 13, y - 32]], { fill: c, stroke: c, sw: 3 });
  }
  const h = ly + (fracLabels ? 22 : 12);
  return { w: W, h, body, label: `number line from ${fmtNum(min)} to ${fmtNum(max)}` };
};

R.hundredchart = (v) => {
  const start = int(v.start, 1, -1000, 99900);
  const hi = new Set(arr(v.highlight).map((x) => num(x, NaN)));
  const bl = new Set(arr(v.blank).map((x) => num(x, NaN)));
  const maxDigits = Math.max(String(Math.abs(start)).length, String(Math.abs(start + 99)).length);
  const fs = maxDigits >= 4 ? 17 : 19;
  const cw = Math.max(44, textW('8'.repeat(maxDigits), fs) + 12), ch = 38, m = 4;
  let body = rect(m, m, cw * 10, ch * 10, { fill: '#fff' });
  for (let i = 0; i < 100; i++) {
    const n = start + i, x = m + (i % 10) * cw, y = m + Math.floor(i / 10) * ch;
    if (bl.has(n)) { body += qbox(x + cw / 2, y + ch / 2, cw - 8, ch - 8, 20); continue; }
    if (hi.has(n)) body += rect(x + 3, y + 3, cw - 6, ch - 6, { rx: 7, fill: '#FFD84D', stroke: INK, sw: 2.5 });
    else if (Math.floor(i / 10) % 2) body += rect(x, y, cw, ch, { fill: '#F4F2FB' });
    body += T(x + cw / 2, y + ch / 2 + fs * 0.36, fmtNum(n), { size: fs, weight: hi.has(n) ? 800 : 600 });
  }
  let d = '';
  for (let i = 1; i < 10; i++) d += `M${f(m + i * cw)} ${m}V${f(m + ch * 10)}M${m} ${f(m + i * ch)}H${f(m + cw * 10)}`;
  body += pathEl(d, { stroke: '#8f89a3', sw: 1.5, fill: 'none' });
  body += rect(m, m, cw * 10, ch * 10, { rx: 6, fill: 'none', stroke: INK, sw: 3.5 });
  return { w: cw * 10 + m * 2, h: ch * 10 + m * 2, body, label: `hundred chart from ${start}` };
};

// ============================================================ operations
R.array = (v) => {
  const rows = int(v.rows, 3, 1, 12), cols = int(v.cols, 4, 1, 15);
  const split = int(v.split, 0, 0, cols);
  const hasSplit = split > 0 && split < cols;
  const ic = typeof v.icon === 'string' && v.icon.trim() ? v.icon : null;
  const cell = 42, gap = hasSplit ? 26 : 0, m = 10;
  let body = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = m + c * cell + (hasSplit && c >= split ? gap : 0) + cell / 2, y = m + r * cell + cell / 2;
    body += icon(ic, x, y, ic ? 32 : 34, hasSplit && c >= split ? PALETTE.orange : PALETTE.blue);
  }
  if (hasSplit) {
    const x = m + split * cell + gap / 2;
    body += line(x, m - 6, x, m + rows * cell + 6, { stroke: PALETTE.purple, sw: 4, da: '10 8', lc: 'butt' });
  }
  return { w: cols * cell + gap + m * 2, h: rows * cell + m * 2, body, label: `array of ${rows} rows and ${cols} columns` };
};

R.groups = (v) => {
  const n = int(v.groups, 3, 1, 10), each = int(v.each, 3, 0, 20);
  const ic = typeof v.icon === 'string' && v.icon.trim() ? v.icon : null;
  const cols = Math.max(1, Math.ceil(Math.sqrt(each))), rows = Math.max(1, Math.ceil(each / cols)), sp = ic ? 34 : 30;
  const R0 = Math.max(40, Math.hypot(cols * sp, rows * sp) / 2 + 8);
  const per = Math.min(n, 5), gridRows = Math.ceil(n / per), D = R0 * 2 + 16, m = 6;
  let body = '';
  for (let k = 0; k < n; k++) {
    const cx = m + R0 + (k % per) * D, cy = m + R0 + Math.floor(k / per) * D;
    body += circ(cx, cy, R0, { fill: '#F2F7FF', stroke: PALETTE.blue, sw: 4 });
    for (let i = 0; i < each; i++) {
      const r = Math.floor(i / cols), inRow = r === rows - 1 ? each - r * cols : cols;
      const x = cx + ((i % cols) - (inRow - 1) / 2) * sp, y = cy + (r - (rows - 1) / 2) * sp;
      body += icon(ic, x, y, ic ? 28 : 26, PALETTE.orange);
    }
  }
  return { w: per * D - 16 + m * 2, h: gridRows * D - 16 + m * 2, body, label: `${n} groups of ${each}` };
};

// ============================================================= fractions
R.fractionbar = (v) => {
  const bars = arr(v.bars).filter((b) => b && typeof b === 'object').slice(0, 8);
  if (!bars.length) bars.push({ parts: 2, shaded: 1 });
  const hasLabels = bars.some((b) => b.label !== undefined && str(b.label) !== '');
  const lw = hasLabels ? Math.max(...bars.map((b) => richW(str(b.label ?? ''), 24))) + 22 : 0;
  const BW = 470, BH = 54, gap = 16, m = 6;
  let body = '';
  bars.forEach((b, i) => {
    const parts = int(b.parts, 1, 1, 12), shaded = int(b.shaded, 0, 0, parts);
    const c = col(b.color, CYCLE[i % 4]);
    const x = m + lw, y = m + i * (BH + gap), pw = BW / parts;
    for (let p = 0; p < parts; p++) body += rect(x + p * pw, y, pw, BH, { fill: p < shaded ? c : '#fff', stroke: INK, sw: 3 });
    body += rect(x, y, BW, BH, { rx: 4, fill: 'none', stroke: INK, sw: 4 });
    if (hasLabels && b.label !== undefined) body += T(m + lw - 14, y + BH / 2 + 8, str(b.label), { size: 24, anchor: 'end' });
  });
  return { w: lw + BW + m * 2, h: bars.length * (BH + gap) - gap + m * 2, body, label: 'fraction bars' };
};

function wedge(cx, cy, r, a0, a1) {
  const p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
  return `M${f(cx)} ${f(cy)}L${f(p0[0])} ${f(p0[1])}A${f(r)} ${f(r)} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f(p1[0])} ${f(p1[1])}Z`;
}
R.fractioncircle = (v) => {
  const parts = int(v.parts, 4, 1, 16), shaded = int(v.shaded, 1, 0, parts), c = col(v.color, 'blue');
  const r = 104, cx = r + 8, cy = r + 8;
  let body = '';
  if (parts === 1) body += circ(cx, cy, r, { fill: shaded ? c : '#fff', stroke: INK, sw: 4 });
  else for (let i = 0; i < parts; i++) body += pathEl(wedge(cx, cy, r, (i * 360) / parts, ((i + 1) * 360) / parts), { fill: i < shaded ? c : '#fff', stroke: INK, sw: 3 });
  body += circ(cx, cy, r, { fill: 'none', stroke: INK, sw: 4.5 });
  return { w: cx * 2, h: cy * 2, body, label: `circle cut in ${parts} equal parts, ${shaded} shaded` };
};

R.fractionset = (v) => {
  const total = int(v.total, 4, 1, 24), shaded = int(v.shaded, 1, 0, total);
  const ic = typeof v.icon === 'string' && v.icon.trim() ? v.icon : null;
  const per = total <= 8 ? total : Math.ceil(total / Math.ceil(total / 8));
  const rows = Math.ceil(total / per), cell = 62, m = 6, c = PALETTE.orange;
  let body = '';
  for (let i = 0; i < total; i++) {
    const cx = m + (i % per) * cell + cell / 2, cy = m + Math.floor(i / per) * cell + cell / 2, on = i < shaded;
    if (ic) {
      body += circ(cx, cy, 27, on ? { fill: light(c, 0.35), stroke: INK, sw: 3.5 } : { fill: '#fff', stroke: '#b9b3cb', sw: 2.5, da: '5 5' });
      body += icon(ic, cx, cy, 32, c, { op: on ? null : 0.45 });
    } else {
      body += circ(cx, cy, 24, { fill: on ? c : '#fff', stroke: INK, sw: 3.5 });
    }
  }
  return { w: per * cell + m * 2, h: rows * cell + m * 2, body, label: `${shaded} of ${total} shaded` };
};

R.hundredgrid = (v) => {
  const tenths = v.tenthsOnly === true;
  let shaded = clamp(num(v.shaded, 0), 0, 100);
  const c = col(v.color, 'blue'), cell = 30, m = 6, S = cell * 10;
  let body = rect(m, m, S, S, { fill: '#fff' });
  if (tenths) {
    const cols = shaded > 10 ? Math.round(shaded / 10) : Math.round(shaded);
    for (let i = 0; i < 10; i++) body += rect(m + i * cell, m, cell, S, { fill: i < cols ? c : '#fff', stroke: INK, sw: 2 });
  } else {
    shaded = Math.round(shaded);
    for (let i = 0; i < 100; i++) {
      const x = m + Math.floor(i / 10) * cell, y = m + (i % 10) * cell;
      body += rect(x, y, cell, cell, { fill: i < shaded ? c : '#fff', stroke: '#8f89a3', sw: 1.2 });
    }
    let d = '';
    for (let i = 1; i < 10; i++) d += `M${m + i * cell} ${m}V${m + S}`;
    body += pathEl(d, { stroke: INK, sw: 2.2, fill: 'none' });
  }
  body += rect(m, m, S, S, { fill: 'none', stroke: INK, sw: 4 });
  return { w: S + m * 2, h: S + m * 2, body, label: tenths ? 'tenths grid' : `hundred grid, ${shaded} shaded` };
};

// ============================================================ collections
R.objects = (v) => {
  const items = arr(v.items).filter((it) => it && typeof it === 'object').slice(0, 6)
    .map((it) => ({ icon: str(it.icon).trim() || null, count: int(it.count, 1, 0, 30) }));
  const all = [];
  items.forEach((it, gi) => { for (let i = 0; i < it.count && all.length < 60; i++) all.push({ ...it, gi }); });
  if (!all.length) return { w: 120, h: 60, body: '', label: 'no objects' };
  const S = 40, m = 8;
  if (v.layout === 'scatter') {
    const n = all.length, W = clamp(120 + Math.sqrt(n) * 80, 200, 560), H = clamp(W * 0.55, 120, 300);
    const rand = rng(hash(JSON.stringify(items)) + n);
    const order = all.map((a, i) => [rand(), a]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const pts = [];
    for (let t = 0; pts.length < n && t < 5000; t++) {
      const p = [m + S / 2 + rand() * (W - S - 2 * m), m + S / 2 + rand() * (H - S - 2 * m)];
      if (pts.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > S * 1.08)) pts.push(p);
    }
    while (pts.length < n) pts.push([m + S / 2 + (pts.length % 12) * S, H - S / 2]);
    const body = order.map((o, i) => icon(o.icon, pts[i][0], pts[i][1], S * 0.9, col(CYCLE[o.gi]))).join('');
    return { w: W, h: H, body, label: 'objects' };
  }
  const perRow = 10, sp = S + 6, groupGap = 22;
  let x = 0, y = 0, maxX = 0, body = '', inRow = 0, lastG = -1;
  for (const o of all) {
    if (o.gi !== lastG && lastG !== -1) x += groupGap;
    if (inRow >= perRow) { x = 0; y += sp; inRow = 0; }
    body += icon(o.icon, m + x + S / 2, m + y + S / 2, S * 0.9, col(CYCLE[o.gi]));
    x += sp; inRow++; lastG = o.gi; maxX = Math.max(maxX, x);
  }
  return { w: maxX - 6 + m * 2, h: y + S + m * 2, body, label: 'objects' };
};

R.compare = (v) => {
  const L = v.left && typeof v.left === 'object' ? v.left : {}, Rt = v.right && typeof v.right === 'object' ? v.right : {};
  const a = int(L.count, 0, 0, 20), b = int(Rt.count, 0, 0, 20), n = Math.max(a, b, 1);
  const cell = 46, m = 8, rowH = 58;
  let body = '';
  body += rect(m, m, n * cell + 12, rowH, { rx: 14, fill: '#EEF5FF', stroke: '#b8d2f5', sw: 2 });
  body += rect(m, m + rowH + 22, n * cell + 12, rowH, { rx: 14, fill: '#FFF3E0', stroke: '#f5d3a1', sw: 2 });
  for (let i = 0; i < Math.min(a, b); i++) {
    const x = m + 6 + i * cell + cell / 2;
    body += line(x, m + rowH - 4, x, m + rowH + 26, { stroke: '#9b94b1', sw: 2.5, da: '3 6' });
  }
  for (let i = 0; i < a; i++) body += icon(str(L.icon) || null, m + 6 + i * cell + cell / 2, m + rowH / 2, 36, PALETTE.blue);
  for (let i = 0; i < b; i++) body += icon(str(Rt.icon) || null, m + 6 + i * cell + cell / 2, m + rowH + 22 + rowH / 2, 36, PALETTE.orange);
  return { w: n * cell + 12 + m * 2, h: rowH * 2 + 22 + m * 2, body, label: `${a} compared with ${b}` };
};

R.balance = (v) => {
  const tilt = v.tilt === 'left' ? 1 : v.tilt === 'right' ? -1 : 0;
  const W = 580, px = W / 2, py = 62, Lh = 196, a = (tilt * 11 * Math.PI) / 180;
  const ends = [[px - Lh * Math.cos(a), py + Lh * Math.sin(a)], [px + Lh * Math.cos(a), py - Lh * Math.sin(a)]];
  let body = '';
  body += poly([[px - 70, 262], [px + 70, 262], [px + 50, 244], [px - 50, 244]], { fill: PALETTE.purple, stroke: INK, sw: 3.5 });
  body += rect(px - 10, py, 20, 186, { rx: 6, fill: light(PALETTE.purple, 0.25), stroke: INK, sw: 3.5 });
  const labels = [str(v.left), str(v.right)];
  ends.forEach(([ex, ey], i) => {
    const pw = 84, pd = 78;
    body += line(ex, ey, ex - pw + 8, ey + pd, { stroke: '#8f89a3', sw: 3 }) + line(ex, ey, ex + pw - 8, ey + pd, { stroke: '#8f89a3', sw: 3 });
    body += pathEl(`M${f(ex - pw)} ${f(ey + pd)}Q${f(ex)} ${f(ey + pd + 52)} ${f(ex + pw)} ${f(ey + pd)}Z`, { fill: i ? '#FFD9A8' : '#BFE0FF', stroke: INK, sw: 3.5 });
    const t = labels[i], fr = hasFrac(t), bw = Math.max(64, richW(t, 26) + 26), bh = fr ? 58 : 44;
    body += rect(ex - bw / 2, ey + pd - bh - 2, bw, bh, { rx: 10, fill: '#fff', stroke: INK, sw: 3 });
    body += T(ex, ey + pd - 2 - bh / 2 + (fr ? 16 : 9), t, { size: 26, weight: 800 });
  });
  body += line(ends[0][0], ends[0][1], ends[1][0], ends[1][1], { stroke: INK, sw: 13 }) + line(ends[0][0], ends[0][1], ends[1][0], ends[1][1], { stroke: PALETTE.yellow, sw: 7 });
  body += circ(px, py, 11, { fill: PALETTE.red, stroke: INK, sw: 3.5 });
  return { w: W, h: 268, body, label: `balance: ${labels[0]} and ${labels[1]}` };
};

// ================================================================ time
R.clock = (v) => {
  const hour = int(v.hour, 3, 0, 23), minute = int(v.minute, 0, 0, 59);
  const mode = v.digital === 'both' ? 'both' : v.digital === true || v.digital === 'true' ? 'digital' : 'analog';
  const showA = mode !== 'digital', showD = mode !== 'analog';
  const h24 = v.h24 === true;
  const digits = h24 ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` : `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, '0')}`;
  let body = '', w = 0;
  const S = 276;
  if (showA) {
    const cx = S / 2, cy = S / 2, r = 132;
    body += circ(cx, cy, r, { fill: PALETTE.blue, stroke: INK, sw: 4 }) + circ(cx, cy, r - 11, { fill: '#fff', stroke: INK, sw: 3 });
    let d = '';
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const p0 = polar(cx, cy, r - 14, i * 6), p1 = polar(cx, cy, r - 22, i * 6);
      d += `M${f(p0[0])} ${f(p0[1])}L${f(p1[0])} ${f(p1[1])}`;
    }
    body += pathEl(d, { stroke: INK, sw: 2.2, fill: 'none' });
    for (let i = 0; i < 12; i++) {
      const p0 = polar(cx, cy, r - 13, i * 30), p1 = polar(cx, cy, r - 27, i * 30);
      body += line(p0[0], p0[1], p1[0], p1[1], { sw: 4.5 });
      const q = polar(cx, cy, r - 50, i * 30);
      body += T(q[0], q[1] + 9, String(i === 0 ? 12 : i), { size: 25, weight: 800 });
    }
    if (v.noHands !== true) {
      const ha = ((hour % 12) + minute / 60) * 30, ma = minute * 6;
      const hand = (ang, len, wd, fill) => {
        const tip = polar(cx, cy, len, ang), bl = polar(cx, cy, wd, ang - 90), br = polar(cx, cy, wd, ang + 90), tail = polar(cx, cy, 14, ang + 180);
        const t1 = polar(tip[0], tip[1], wd * 0.55, ang - 90), t2 = polar(tip[0], tip[1], wd * 0.55, ang + 90);
        return poly([tail, bl, t1, tip, t2, br], { fill, stroke: INK, sw: 2.5 });
      };
      body += hand(ha, 64, 8, INK);
      body += hand(ma, 106, 4.5, PALETTE.red);
      body += circ(cx, cy, 9, { fill: PALETTE.yellow, stroke: INK, sw: 3 });
    }
    w = S;
  }
  if (showD) {
    const dw = Math.max(184, textW(digits, 52) + 40), dh = 96;
    const x = showA ? w + 22 : 6, y = showA ? (S - dh) / 2 : 6;
    body += rect(x, y, dw, dh, { rx: 18, fill: INK, stroke: '#5b5075', sw: 4 });
    body += rect(x + 9, y + 9, dw - 18, dh - 18, { rx: 11, fill: '#1c1530' });
    body += T(x + dw / 2, y + dh / 2 + 19, digits, { size: 52, weight: 800, fill: '#7CF5C4', extra: ' style="font-variant-numeric:tabular-nums" letter-spacing="1"' });
    w = x + dw + 6;
    if (!showA) return { w, h: dh + 12, body, label: `digital clock showing ${digits}` };
  }
  return { w, h: S, body, label: v.noHands ? 'clock face' : `clock showing ${digits}` };
};

R.calendar = (v) => {
  const month = int(v.month, 1, 1, 12), year = int(v.year, 2026, 1900, 2200);
  const hi = new Set(arr(v.highlight).map((x) => num(x, NaN)));
  const NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weeks = Math.ceil((first + days) / 7);
  const cw = 64, ch = 46, m = 4, titleH = 50, headH = 34, W = cw * 7;
  let body = rect(m, m, W, titleH, { rx: 12, fill: PALETTE.red, stroke: INK, sw: 3.5 });
  body += T(m + W / 2, m + 34, `${NAMES[month - 1]} ${year}`, { size: 26, weight: 800, fill: '#fff' });
  const top = m + titleH + 4;
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((d, i) => { body += T(m + i * cw + cw / 2, top + 24, d, { size: 18, weight: 800, fill: '#5b5075' }); });
  const gy = top + headH;
  body += rect(m, gy, W, weeks * ch, { fill: '#fff' });
  for (let d = 1; d <= days; d++) {
    const k = first + d - 1, x = m + (k % 7) * cw, y = gy + Math.floor(k / 7) * ch;
    if (k % 7 === 0 || k % 7 === 6) body += rect(x, y, cw, ch, { fill: '#F4F2FB' });
    if (hi.has(d)) body += circ(x + cw / 2, y + ch / 2, 19, { fill: PALETTE.yellow, stroke: INK, sw: 3 });
    body += T(x + cw / 2, y + ch / 2 + 7, String(d), { size: 20, weight: hi.has(d) ? 900 : 700 });
  }
  let d = '';
  for (let i = 1; i < 7; i++) d += `M${m + i * cw} ${gy}V${gy + weeks * ch}`;
  for (let i = 1; i < weeks; i++) d += `M${m} ${gy + i * ch}H${m + W}`;
  body += pathEl(d, { stroke: '#bdb6d1', sw: 1.5, fill: 'none' }) + rect(m, gy, W, weeks * ch, { rx: 4, fill: 'none', stroke: INK, sw: 3.5 });
  return { w: W + m * 2, h: gy + weeks * ch + m, body, label: `calendar for ${NAMES[month - 1]} ${year}` };
};

// ================================================================ money
const COINS = {
  dime: { r: 23, label: '10¢', emblem: '⛵' }, nickel: { r: 27.5, label: '5¢', emblem: '🦫' }, quarter: { r: 31, label: '25¢', emblem: '🦌' },
  loonie: { r: 34.5, label: '$1', emblem: '🦆' }, toonie: { r: 36.5, label: '$2', emblem: '🐻‍❄️' },
};
const BILLS = {
  bill5: { v: '5', c: '#3E7CC9' }, bill10: { v: '10', c: '#7E57C2' }, bill20: { v: '20', c: '#2E9D5B' },
  bill50: { v: '50', c: '#D2463C' }, bill100: { v: '100', c: '#8B5A2B' },
};
R.coins = (v, ctx) => {
  const items = arr(v.items).map((x) => str(x).trim().toLowerCase()).filter((x) => COINS[x] || BILLS[x]).slice(0, 20);
  if (!items.length) return { w: 120, h: 60, body: '', label: 'no money' };
  const silver = ctx.id('ag'), gold = ctx.id('au');
  ctx.defs.push(`<radialGradient id="${silver}" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#d5d9e0"/><stop offset="1" stop-color="#9aa1ad"/></radialGradient>`);
  ctx.defs.push(`<radialGradient id="${gold}" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff3b0"/><stop offset=".55" stop-color="#f2c233"/><stop offset="1" stop-color="#c08a12"/></radialGradient>`);
  // hideValues: draw each coin's real design (schooner, beaver, caribou, loon, polar bear) instead of printing its value.
  const hide = !!v.hideValues;
  const coinText = (c, x, y, opts) => (hide ? T(x, y - opts.size * 0.02, c.emblem, { size: opts.size * 1.05, weight: 400, fill: opts.fill }) : T(x, y, c.label, opts));
  const draw = (k, x, cy) => {
    if (BILLS[k]) {
      const b = BILLS[k], w = 176, h = 80, y = cy - h / 2, c = b.c;
      let s = rect(x, y, w, h, { rx: 9, fill: c, stroke: INK, sw: 3.5 });
      s += rect(x + 7, y + 7, w - 14, h - 14, { rx: 6, fill: 'none', stroke: '#fff', sw: 2, so: 0.55 });
      s += circ(x + 30, cy, 18, { fill: light(c, 0.55), stroke: '#fff', sw: 2.5 });
      s += T(x + 30, cy + 6, b.v, { size: b.v.length > 2 ? 13 : 17, weight: 900, fill: dark(c, 0.35) });
      s += T(x + 58 + (w - 70) / 2, cy + 13, `$${b.v}`, { size: b.v.length > 2 ? 34 : 38, weight: 900, fill: '#fff', halo: dark(c, 0.45) });
      return { s, w };
    }
    const c = COINS[k], r = c.r;
    let s = '';
    if (k === 'loonie') {
      const pts = [];
      for (let i = 0; i < 11; i++) pts.push(polar(x + r, cy, r, (i * 360) / 11));
      s += poly(pts, { fill: `url(#${gold})`, stroke: INK, sw: 3 }) + circ(x + r, cy, r - 7, { fill: 'none', stroke: '#a8770c', sw: 1.6 });
      s += coinText(c, x + r, cy + 8, { size: 23, weight: 900, fill: '#5a3d00' });
    } else if (k === 'toonie') {
      s += circ(x + r, cy, r, { fill: `url(#${silver})`, stroke: INK, sw: 3 }) + circ(x + r, cy, r - 13, { fill: `url(#${gold})`, stroke: '#8a6a10', sw: 2 });
      s += coinText(c, x + r, cy + 7.5, { size: 21, weight: 900, fill: '#5a3d00' });
    } else {
      s += circ(x + r, cy, r, { fill: `url(#${silver})`, stroke: INK, sw: 3 }) + circ(x + r, cy, r - 5, { fill: 'none', stroke: '#8a909c', sw: 1.4, da: '1.5 3' });
      s += coinText(c, x + r, cy + (k === 'dime' ? 6.5 : 7.5), { size: k === 'dime' ? 18 : 21, weight: 900, fill: '#3b3550' });
    }
    return { s, w: r * 2 };
  };
  const widthOf = (k) => (BILLS[k] ? 176 : COINS[k].r * 2);
  const heightOf = (k) => (BILLS[k] ? 80 : COINS[k].r * 2);
  const maxW = 600, gap = 14, m = 6;
  const rowsArr = [[]];
  let x = 0;
  for (const k of items) {
    if (x + widthOf(k) > maxW && rowsArr[rowsArr.length - 1].length) { rowsArr.push([]); x = 0; }
    rowsArr[rowsArr.length - 1].push(k); x += widthOf(k) + gap;
  }
  let body = '', y = m, W = 0;
  for (const row of rowsArr) {
    const h = Math.max(...row.map(heightOf));
    let xx = m;
    for (const k of row) { const d = draw(k, xx, y + h / 2); body += d.s; xx += d.w + gap; }
    W = Math.max(W, xx - gap + m); y += h + gap;
  }
  return { w: W, h: y - gap + m, body, label: `money: ${items.join(', ')}` };
};

// ============================================================ 2-D shapes
function regular(n, start = 0, r = 1) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = ((start + (i * 360) / n) * Math.PI) / 180; out.push([r * Math.sin(a), -r * Math.cos(a)]); }
  return out;
}
function ellipsePts(rx, ry, n = 72) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; out.push([rx * Math.cos(a), ry * Math.sin(a)]); }
  return out;
}
const SHAPES = {
  circle: () => ({ pts: ellipsePts(1, 1) }),
  oval: () => ({ pts: ellipsePts(1, 0.62) }),
  triangle: () => ({ pts: [[0, -0.866], [1, 0.866], [-1, 0.866]] }),
  equilateral_triangle: () => ({ pts: [[0, -0.866], [1, 0.866], [-1, 0.866]] }),
  right_triangle: () => ({ pts: [[-0.8, -0.9], [0.9, 0.9], [-0.8, 0.9]], extra: [[[-0.8, 0.62], [-0.52, 0.62], [-0.52, 0.9]]] }),
  isosceles_triangle: () => ({ pts: [[0, -1], [0.62, 1], [-0.62, 1]] }),
  scalene_triangle: () => ({ pts: [[-0.4, -0.85], [1, 0.8], [-1, 0.8]] }),
  square: () => ({ pts: [[-1, -1], [1, -1], [1, 1], [-1, 1]] }),
  rectangle: () => ({ pts: [[-1, -0.56], [1, -0.56], [1, 0.56], [-1, 0.56]] }),
  rhombus: () => ({ pts: [[0, -1], [0.62, 0], [0, 1], [-0.62, 0]] }),
  trapezoid: () => ({ pts: [[-0.5, -0.58], [0.5, -0.58], [1, 0.58], [-1, 0.58]] }),
  parallelogram: () => ({ pts: [[-0.45, -0.55], [1, -0.55], [0.45, 0.55], [-1, 0.55]] }),
  kite: () => ({ pts: [[0, -1], [0.62, -0.38], [0, 1], [-0.62, -0.38]] }),
  pentagon: () => ({ pts: regular(5) }),
  hexagon: () => ({ pts: regular(6, 30) }),
  octagon: () => ({ pts: regular(8, 22.5) }),
  star: () => ({ pts: regular(10).map((p, i) => (i % 2 ? [p[0] * 0.42, p[1] * 0.42] : p)) }),
  semicircle: () => { const pts = []; for (let i = 0; i <= 36; i++) { const a = -90 + i * 5; pts.push([Math.sin((a * Math.PI) / 180), 0.5 - Math.cos((a * Math.PI) / 180)]); } return { pts }; },
  heart: () => {
    const pts = [];
    for (let i = 0; i < 72; i++) { const t = (i / 72) * Math.PI * 2; pts.push([(16 * Math.sin(t) ** 3) / 17, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17]); }
    return { pts };
  },
  irregular_pentagon: () => ({ pts: [[-0.9, 0.8], [0.8, 0.9], [1, -0.1], [0.1, -0.9], [-0.8, -0.4]] }),
  irregular_hexagon: () => ({ pts: [[-1, 0.2], [-0.5, 0.9], [0.6, 0.7], [1, -0.1], [0.3, -0.9], [-0.6, -0.7]] }),
  arrow: () => ({ pts: [[-1, -0.3], [0.2, -0.3], [0.2, -0.72], [1, 0], [0.2, 0.72], [0.2, 0.3], [-1, 0.3]] }),
};
const SIZE = { s: 0.62, m: 0.82, l: 1 };
// Draw a shape so its (rotated) bounding box fits in box×box centred at cx,cy.
function drawShape(ctx, spec, cx, cy, box, fb = 'blue') {
  const name = str(spec.shape).trim().toLowerCase();
  const geo = (SHAPES[name] || SHAPES.circle)();
  const rot = (num(spec.rotate, 0) * Math.PI) / 180, cs = Math.cos(rot), sn = Math.sin(rot);
  const R2 = (p) => [p[0] * cs - p[1] * sn, p[0] * sn + p[1] * cs];
  const rp = geo.pts.map(R2);
  const xs = rp.map((p) => p[0]), ys = rp.map((p) => p[1]);
  const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
  const s = box / Math.max(bw, bh, 0.01), ox = cx - ((Math.max(...xs) + Math.min(...xs)) / 2) * s, oy = cy - ((Math.max(...ys) + Math.min(...ys)) / 2) * s;
  const T2 = (p) => { const q = R2(p); return [ox + q[0] * s, oy + q[1] * s]; };
  const c = col(spec.color, fb);
  let out = poly(geo.pts.map(T2), { fill: ctx.fill(spec.pattern, c), stroke: INK, sw: 3.5 });
  for (const ex of geo.extra || []) out += el('polyline', { points: P(ex.map(T2)), fill: 'none', stroke: INK, sw: 2.5 });
  return out;
}
R.shapes = (v, ctx) => {
  const items = arr(v.items).filter((it) => it && typeof it === 'object').slice(0, 12);
  if (!items.length) items.push({ shape: 'circle' });
  const per = Math.min(items.length, 6), cellW = 132, boxMax = 116, m = 6;
  const hasLabel = items.some((it) => it.label !== undefined && str(it.label) !== '');
  const rowH = boxMax + (hasLabel ? 40 : 10);
  let body = '';
  items.forEach((it, i) => {
    const cx = m + (i % per) * cellW + cellW / 2, top = m + Math.floor(i / per) * rowH;
    const box = boxMax * (SIZE[it.size] || SIZE.m);
    body += drawShape(ctx, it, cx, top + boxMax / 2, box, CYCLE[i % CYCLE.length]);
    if (it.label !== undefined && str(it.label) !== '') body += T(cx, top + boxMax + 30, str(it.label), { size: 22 });
  });
  return { w: per * cellW + m * 2, h: Math.ceil(items.length / per) * rowH + m * 2 - (hasLabel ? 0 : 4), body, label: 'shapes' };
};

// ============================================================ 3-D solids
function solid(ctx, kind, c, ox, oy) {
  const lc = light(c, 0.45), dc = dark(c, 0.2), S = { stroke: INK, sw: 3.5 }, H = { stroke: INK, sw: 2.2, da: '6 6', fill: 'none', so: 0.7 };
  const t = (pts) => pts.map((p) => [ox + p[0], oy + p[1]]);
  const grad = () => {
    const id = ctx.id('sg');
    ctx.defs.push(`<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${lc}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${dc}"/></linearGradient>`);
    return `url(#${id})`;
  };
  const L = (a, b, o = H) => line(ox + a[0], oy + a[1], ox + b[0], oy + b[1], o);
  const box = (x0, y0, w, h, dx, dy) => {
    const A = [x0, y0 + h], B = [x0 + w, y0 + h], C = [x0 + w, y0], D = [x0, y0];
    const back = (p) => [p[0] + dx, p[1] - dy];
    return L(back(A), A) + L(back(A), back(B)) + L(back(A), back(D)) +
      poly(t([D, C, back(C), back(D)]), { fill: lc, ...S }) + poly(t([B, C, back(C), back(B)]), { fill: dc, ...S }) + poly(t([A, B, C, D]), { fill: c, ...S });
  };
  const ell = (cx, cy, rx, ry, half) => {
    if (half === 'back') return pathEl(`M${f(ox + cx - rx)} ${f(oy + cy)}A${rx} ${ry} 0 0 1 ${f(ox + cx + rx)} ${f(oy + cy)}`, H);
    return pathEl(`M${f(ox + cx - rx)} ${f(oy + cy)}A${rx} ${ry} 0 0 0 ${f(ox + cx + rx)} ${f(oy + cy)}`, { fill: 'none', ...S });
  };
  switch (kind) {
    case 'cube': return box(12, 44, 68, 68, 30, 28);
    case 'rect_prism': return box(6, 56, 86, 54, 26, 24);
    case 'sphere': {
      const id = ctx.id('rg');
      ctx.defs.push(`<radialGradient id="${id}" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="${light(c, 0.7)}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${dc}"/></radialGradient>`);
      return circ(ox + 60, oy + 62, 50, { fill: `url(#${id})`, ...S }) + ell(60, 62, 50, 14, 'back') +
        pathEl(`M${f(ox + 10)} ${f(oy + 62)}A50 14 0 0 0 ${f(ox + 110)} ${f(oy + 62)}`, { fill: 'none', stroke: INK, sw: 2.2, so: 0.7 });
    }
    case 'cone':
      return pathEl(`M${f(ox + 60)} ${f(oy + 10)}L${f(ox + 14)} ${f(oy + 100)}A46 14 0 0 0 ${f(ox + 106)} ${f(oy + 100)}Z`, { fill: grad(), ...S }) + ell(60, 100, 46, 14, 'back');
    case 'cylinder':
      return pathEl(`M${f(ox + 16)} ${f(oy + 26)}V${f(oy + 100)}A44 14 0 0 0 ${f(ox + 104)} ${f(oy + 100)}V${f(oy + 26)}Z`, { fill: grad(), ...S }) +
        ell(60, 100, 44, 14, 'back') + el('ellipse', { cx: ox + 60, cy: oy + 26, rx: 44, ry: 14, fill: lc, ...S });
    case 'tri_prism': {
      const A = [8, 108], B = [72, 108], C = [40, 50], d = [36, -24], bk = (p) => [p[0] + d[0], p[1] + d[1]];
      return L(bk(A), bk(B)) + L(bk(A), bk(C)) + L(A, bk(A)) + poly(t([B, C, bk(C), bk(B)]), { fill: dc, ...S }) + poly(t([A, B, C]), { fill: c, ...S });
    }
    case 'square_pyramid': {
      const A = [10, 106], B = [84, 106], C = [112, 82], D = [38, 82], X = [62, 12];
      return L(D, A) + L(D, C) + L(D, X) + poly(t([B, C, X]), { fill: dc, ...S }) + poly(t([A, B, X]), { fill: c, ...S });
    }
    case 'tri_pyramid': {
      const A = [10, 100], B = [78, 110], C = [112, 78], X = [52, 12];
      return L(A, C) + poly(t([B, C, X]), { fill: dc, ...S }) + poly(t([A, B, X]), { fill: c, ...S });
    }
    case 'hex_prism': {
      const cx = 60, top = 30, h = 70, rx = 48, ry = 17;
      const V = [0, 60, 120, 180, 240, 300].map((a) => [cx + rx * Math.cos((a * Math.PI) / 180), top + ry * Math.sin((a * Math.PI) / 180)]);
      const dn = (p) => [p[0], p[1] + h];
      let s = L(dn(V[3]), dn(V[4])) + L(dn(V[4]), dn(V[5])) + L(dn(V[5]), dn(V[0])) + L(V[4], dn(V[4])) + L(V[5], dn(V[5]));
      const shades = [dc, c, lc];
      for (let i = 0; i < 3; i++) s += poly(t([V[i], V[i + 1], dn(V[i + 1]), dn(V[i])]), { fill: shades[i], ...S });
      return s + poly(t(V), { fill: light(c, 0.6), ...S });
    }
    default: return circ(ox + 60, oy + 60, 40, { fill: c, ...S });
  }
}
R.solids = (v, ctx) => {
  const items = arr(v.items).filter((it) => it && typeof it === 'object').slice(0, 10);
  if (!items.length) items.push({ solid: 'cube' });
  const per = Math.min(items.length, 5), cw = 136, m = 6;
  const hasLabel = items.some((it) => it.label !== undefined && str(it.label) !== '');
  const rowH = 122 + (hasLabel ? 34 : 6);
  let body = '';
  items.forEach((it, i) => {
    const x = m + (i % per) * cw + (cw - 120) / 2, y = m + Math.floor(i / per) * rowH;
    body += solid(ctx, str(it.solid).trim().toLowerCase(), col(it.color, CYCLE[i % CYCLE.length]), x, y);
    if (hasLabel && it.label !== undefined) body += T(x + 60, y + 146, str(it.label), { size: 20 });
  });
  return { w: per * cw + m * 2, h: Math.ceil(items.length / per) * rowH + m * 2, body, label: 'solids' };
};

// ============================================================ patterns
R.pattern = (v, ctx) => {
  const items = arr(v.items).slice(0, 14);
  if (!items.length) items.push('?');
  const isNum = (it) => typeof it === 'number' || (typeof it === 'string' && /^-?[\d.,\s]+$/.test(it.trim()));
  const numText = (it) => (typeof it === 'number' ? fmtNum(it) : it);
  // Long numbers (hundreds, thousands) get wider pill-shaped cells so the digits fit.
  const maxLen = Math.max(0, ...items.filter(isNum).map((it) => String(numText(it)).length));
  const pillW = maxLen > 2 ? maxLen * 17 + 22 : 0;
  const cw = Math.max(76, pillW + 12), ch = 76, m = 8;
  const core = int(v.highlightCore, 0, 0, items.length);
  let body = '';
  if (core > 0) body += rect(m - 4, m - 4, core * cw + 8, ch + 8, { rx: 14, fill: '#FFF8DA', stroke: PALETTE.orange, sw: 3.5, da: '9 7' });
  items.forEach((it, i) => {
    const cx = m + i * cw + cw / 2, cy = m + ch / 2;
    if (isQ(it)) body += qbox(cx, cy, 58, 58, 32);
    else if (isNum(it)) {
      body += (pillW ? rect(cx - pillW / 2, cy - 30, pillW, 60, { rx: 30, fill: '#EEF5FF', stroke: '#b8d2f5', sw: 2.5 }) : circ(cx, cy, 30, { fill: '#EEF5FF', stroke: '#b8d2f5', sw: 2.5 }))
        + T(cx, cy + 10, numText(it), { size: 28, weight: 800 });
    } else if (typeof it === 'string') body += icon(it, cx, cy, 46);
    else if (it && typeof it === 'object') body += drawShape(ctx, it, cx, cy, 60 * (SIZE[it.size] || SIZE.m) / SIZE.m * 0.95, 'blue');
  });
  return { w: items.length * cw + m * 2, h: ch + m * 2, body, label: 'pattern' };
};

function isSquareNum(n) { const r = Math.round(Math.sqrt(n)); return r * r === n; }
function isTriNum(n) { const k = Math.round((Math.sqrt(8 * n + 1) - 1) / 2); return (k * (k + 1)) / 2 === n; }
function gcd(a, b) { return b ? gcd(b, a % b) : a; }
R.growing = (v) => {
  const steps = arr(v.steps).map((x) => int(x, 1, 0, 60)).slice(0, 6);
  if (!steps.length) steps.push(1, 2, 3);
  const shape = ['square', 'dot', 'triangle'].includes(v.shape) ? v.shape : 'square';
  const blank = v.blankLast === true;
  const pos = steps.some((n) => n > 0) ? steps : [1];
  let mode = 'rows';
  if (pos.every(isSquareNum) && pos.some((n) => n > 1) && !pos.every(isTriNum)) mode = 'square';
  else if (pos.every((n) => n % 2 === 1) && pos.length > 1 && pos.every((n, i) => i === 0 || n - pos[i - 1] === 2)) mode = 'L';
  else if (pos.every(isTriNum) && pos.some((n) => n > 1)) mode = 'tri';
  const G = pos.reduce((a, b) => gcd(a, b), 0);
  const fixedRows = G >= 2 && G <= 5 ? G : Math.min(5, Math.ceil(Math.sqrt(Math.max(...pos))));
  const cells = (n) => {
    const out = [];
    if (mode === 'square') { const k = Math.round(Math.sqrt(n)); for (let i = 0; i < n; i++) out.push([i % k, Math.floor(i / k)]); }
    else if (mode === 'L') { const k = (n + 1) / 2; for (let i = 0; i < k; i++) out.push([0, i]); for (let i = 1; i < k; i++) out.push([i, 0]); }
    else if (mode === 'tri') { let r = 0, left = n, w = Math.round((Math.sqrt(8 * n + 1) - 1) / 2); while (left > 0) { for (let i = 0; i < w && left > 0; i++, left--) out.push([i, r]); r++; w--; } }
    else { for (let i = 0; i < n; i++) out.push([Math.floor(i / fixedRows), i % fixedRows]); }
    return out;
  };
  const figs = steps.map(cells);
  const dimC = Math.max(1, ...figs.map((c) => Math.max(0, ...c.map((p) => p[0] + 1))));
  const dimR = Math.max(1, ...figs.map((c) => Math.max(0, ...c.map((p) => p[1] + 1))));
  const u = clamp(Math.min(140 / dimR, 130 / dimC), 12, 34), gap = 40, m = 8;
  const baseY = m + dimR * u;
  let x = m, body = '';
  figs.forEach((c, i) => {
    const w = Math.max(1, ...c.map((p) => p[0] + 1)) * u, hgt = Math.max(1, ...c.map((p) => p[1] + 1)) * u;
    const fw = Math.max(w, 64);
    if (blank && i === figs.length - 1) body += qbox(x + fw / 2, baseY - 32, fw, 64, 34);
    else {
      const ox = x + (fw - w) / 2;
      for (const [cx0, cy0] of c) {
        const px = ox + cx0 * u, py = baseY - (cy0 + 1) * u;
        if (shape === 'square') body += rect(px + 1, py + 1, u - 2, u - 2, { rx: 3, fill: PALETTE.teal, stroke: INK, sw: 2.5 });
        else if (shape === 'dot') body += circ(px + u / 2, py + u / 2, u * 0.4, { fill: PALETTE.purple, stroke: INK, sw: 2.5 });
        else body += poly([[px + u / 2, py + 2], [px + u - 2, py + u - 2], [px + 2, py + u - 2]], { fill: PALETTE.orange, stroke: INK, sw: 2.5 });
      }
    }
    body += T(x + fw / 2, baseY + 30, `Step ${i + 1}`, { size: 19, fill: '#5b5075' });
    if (i < figs.length - 1) body += line(x + fw + gap / 2, m, x + fw + gap / 2, baseY, { stroke: LINE, sw: 2, da: '4 6' });
    x += fw + gap;
  });
  return { w: x - gap + m, h: baseY + 40, body, label: 'growing pattern' };
};

// ======================================================== data displays
R.table = (v) => {
  const headers = arr(v.headers).map((h) => str(h)).slice(0, 8);
  let rows = arr(v.rows).filter(Array.isArray).slice(0, 14);
  const ncol = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  const cell = (x) => (typeof x === 'number' ? fmtNum(x) : str(x));
  const fs = 20, pad = 22, rh = 40, hh = headers.length ? 44 : 0, m = 4;
  const widths = [];
  for (let c = 0; c < ncol; c++) widths.push(Math.max(70, richW(headers[c] || '', fs) + pad * 2, ...rows.map((r) => richW(cell(r[c]), fs) + pad * 2)));
  const W = widths.reduce((a, b) => a + b, 0);
  const title = str(v.title), th = title ? 40 : 0;
  let body = '';
  if (title) body += T(m + W / 2, m + 26, title, { size: 22, weight: 800 });
  const y0 = m + th;
  const total = hh + rows.length * rh;
  body += rect(m, y0, W, total, { rx: 10, fill: '#fff' });
  if (hh) body += pathEl(`M${m} ${y0 + hh}V${y0 + 10}Q${m} ${y0} ${m + 10} ${y0}H${m + W - 10}Q${m + W} ${y0} ${m + W} ${y0 + 10}V${y0 + hh}Z`, { fill: '#D9E8FF' });
  rows.forEach((r, i) => { if (i % 2) body += rect(m, y0 + hh + i * rh, W, rh, { fill: '#F6F4FB' }); });
  let x = m;
  for (let c = 0; c < ncol; c++) {
    const w = widths[c];
    if (hh) body += T(x + w / 2, y0 + 29, headers[c] || '', { size: fs, weight: 800 });
    rows.forEach((r, i) => {
      const val = cell(r[c]), cy = y0 + hh + i * rh + rh / 2;
      if (isQ(val)) body += qbox(x + w / 2, cy, 44, rh - 8, 22);
      else body += T(x + w / 2, cy + 7, val, { size: fs, weight: 600 });
    });
    if (c) body += line(x, y0, x, y0 + total, { stroke: '#a39cb8', sw: 2 });
    x += w;
  }
  for (let i = 1; i < rows.length; i++) body += line(m, y0 + hh + i * rh, m + W, y0 + hh + i * rh, { stroke: '#d6d1e4', sw: 1.5 });
  if (hh) body += line(m, y0 + hh, m + W, y0 + hh, { sw: 3 });
  body += rect(m, y0, W, total, { rx: 10, fill: 'none', stroke: INK, sw: 3.5 });
  return { w: W + m * 2, h: y0 + total + m, body, label: title || 'table' };
};

function tallyMarks(x, cy, n, h = 38) {
  let s = '', px = x;
  const full = Math.floor(n / 5), rest = n % 5;
  for (let gI = 0; gI < full; gI++) {
    for (let k = 0; k < 4; k++) s += line(px + k * 11, cy - h / 2, px + k * 11, cy + h / 2, { stroke: INK, sw: 4 });
    s += line(px - 6, cy + h / 2 - 6, px + 3 * 11 + 6, cy - h / 2 + 6, { stroke: PALETTE.red, sw: 4 });
    px += 62;
  }
  for (let k = 0; k < rest; k++) s += line(px + k * 11, cy - h / 2, px + k * 11, cy + h / 2, { stroke: INK, sw: 4 });
  return { s, w: px - x + (rest ? rest * 11 : -18) };
}
R.tally = (v) => {
  const rows = arr(v.rows).filter((r) => r && typeof r === 'object').slice(0, 8).map((r) => ({ label: str(r.label), count: int(r.count, 0, 0, 60) }));
  if (!rows.length) rows.push({ label: '', count: 0 });
  const title = str(v.title), th = title ? 40 : 0, rh = 56, m = 4;
  const lw = Math.max(80, ...rows.map((r) => richW(r.label, 22) + 30));
  const marks = rows.map((r) => tallyMarks(0, 0, r.count));
  const mw = Math.max(140, ...marks.map((mk) => mk.w + 40));
  const W = lw + mw;
  let body = '';
  if (title) body += T(m + W / 2, m + 26, title, { size: 22, weight: 800 });
  const y0 = m + th;
  body += rect(m, y0, W, rh * rows.length, { rx: 10, fill: '#fff' });
  body += rect(m, y0, lw, rh * rows.length, { fill: '#F2EEFB' });
  rows.forEach((r, i) => {
    const cy = y0 + i * rh + rh / 2;
    body += T(m + lw / 2, cy + 8, r.label, { size: 22, weight: 800 });
    body += tallyMarks(m + lw + 22, cy, r.count).s;
    if (i) body += line(m, y0 + i * rh, m + W, y0 + i * rh, { stroke: '#cfc9de', sw: 2 });
  });
  body += line(m + lw, y0, m + lw, y0 + rh * rows.length, { sw: 3 });
  body += rect(m, y0, W, rh * rows.length, { rx: 10, fill: 'none', stroke: INK, sw: 3.5 });
  return { w: W + m * 2, h: y0 + rh * rows.length + m, body, label: title || 'tally chart' };
};

function wrapLabel(s, maxW, size) {
  if (textW(s, size) <= maxW || !s.includes(' ')) return [s];
  const words = s.split(' ');
  let best = [s], bestW = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' '), w = Math.max(textW(a, size), textW(b, size));
    if (w < bestW) { bestW = w; best = [a, b]; }
  }
  return best;
}
R.bargraph = (v, ctx) => {
  let values = arr(v.values).map((x) => clamp(num(x, 0), 0, 1e9)).slice(0, 12);
  let labels = arr(v.labels).map(str).slice(0, 12);
  if (!labels.length) labels = values.map((_, i) => String(i + 1));
  values = labels.map((_, i) => values[i] || 0);
  const s2 = v.series2 && typeof v.series2 === 'object' && Array.isArray(v.series2.values) ? labels.map((_, i) => clamp(num(v.series2.values[i], 0), 0, 1e9)) : null;
  const maxV = Math.max(1e-9, ...values, ...(s2 || []));
  let step = num(v.scale, 0) > 0 ? num(v.scale) : niceStep(maxV / 5);
  if (maxV / step > 20) step = niceStep(maxV / 10);
  const top = Math.max(step, Math.ceil(maxV / step - 1e-9) * step);
  const ticks = [];
  for (let t = 0; t <= top + 1e-9; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  const horiz = v.horizontal === true, n = labels.length;
  const title = str(v.title), yLabel = str(v.yLabel), xLabel = str(v.xLabel);
  const c1 = PALETTE.blue, c2 = PALETTE.orange, fill2 = ctx.fill('stripes', c2);
  const barFill = (i, s) => (s ? fill2 : s2 ? c1 : col(CYCLE[i % 8]));
  const W = 600, m = 6, fs = 18;
  let y = m, body = '';
  if (title) { body += T(W / 2, y + 26, title, { size: 23, weight: 800 }); y += 40; }
  if (s2) {
    const n1 = str(v.series1Name) || 'Series 1', n2 = str(v.series2.name) || 'Series 2';
    const w1 = textW(n1, fs) + 44, w2 = textW(n2, fs) + 44, lx = W / 2 - (w1 + w2 + 20) / 2;
    body += rect(lx, y + 4, 26, 22, { rx: 4, fill: c1, stroke: INK, sw: 2.5 }) + T(lx + 34, y + 22, n1, { size: fs, anchor: 'start' });
    body += rect(lx + w1 + 20, y + 4, 26, 22, { rx: 4, fill: fill2, stroke: INK, sw: 2.5 }) + T(lx + w1 + 54, y + 22, n2, { size: fs, anchor: 'start' });
    y += 38;
  }
  const tickW = Math.max(...ticks.map((t) => textW(fmtNum(t), fs))) + 12;
  if (!horiz) {
    const left = m + (yLabel ? 30 : 0) + tickW, right = W - 12, pt = y + 8, ph = 210, pb = pt + ph;
    const slot = (right - left) / n, Y = (val) => pb - (val / top) * ph;
    ticks.forEach((t) => {
      body += line(left, Y(t), right, Y(t), { stroke: t ? '#e1dcef' : INK, sw: t ? 2 : 3 });
      body += T(left - 8, Y(t) + 6, fmtNum(t), { size: fs, anchor: 'end', weight: 600 });
    });
    const lines = labels.map((l) => wrapLabel(l, slot - 6, fs));
    const lsz = labels.map((l, i) => (lines[i].some((s) => textW(s, fs) > slot - 4) ? 16 : fs));
    labels.forEach((l, i) => {
      const cx = left + slot * (i + 0.5);
      const bars = s2 ? [[values[i], 0], [s2[i], 1]] : [[values[i], 0]];
      const bw = s2 ? Math.min(34, slot * 0.36) : Math.min(60, slot * 0.6);
      bars.forEach(([val, s], k) => {
        const bx = s2 ? cx - bw + k * bw : cx - bw / 2;
        if (val > 0) body += rect(bx, Y(val), bw, pb - Y(val), { fill: barFill(i, s), stroke: INK, sw: 2.5 });
      });
      lines[i].forEach((ln, j) => { body += T(cx, pb + 24 + j * 20, ln, { size: lsz[i], weight: 700 }); });
    });
    body += line(left, pt - 4, left, pb, { sw: 3 }) + line(left, pb, right, pb, { sw: 3 });
    const extra = Math.max(...lines.map((l) => l.length)) * 20;
    let h = pb + extra + 14;
    if (xLabel) { body += T((left + right) / 2, h + 14, xLabel, { size: fs, weight: 800, fill: '#5b5075' }); h += 26; }
    if (yLabel) body += T(0, 0, yLabel, { size: fs, weight: 800, fill: '#5b5075', extra: ` transform="translate(${m + 16} ${f((pt + pb) / 2)}) rotate(-90)"` });
    return { w: W, h: h + m, body, label: title || 'bar graph' };
  }
  const lw = Math.max(...labels.map((l) => textW(l, fs))) + 16;
  const left = m + (yLabel ? 30 : 0) + lw, right = W - 24, pt = y + 8, bh = s2 ? 20 : 30, slot = s2 ? 56 : 44, ph = slot * n, pb = pt + ph;
  const X = (val) => left + (val / top) * (right - left);
  ticks.forEach((t) => {
    body += line(X(t), pt, X(t), pb, { stroke: t ? '#e1dcef' : INK, sw: t ? 2 : 3 });
    body += T(X(t), pb + 24, fmtNum(t), { size: fs, weight: 600 });
  });
  labels.forEach((l, i) => {
    const cy = pt + slot * (i + 0.5);
    const bars = s2 ? [[values[i], 0], [s2[i], 1]] : [[values[i], 0]];
    bars.forEach(([val, s], k) => {
      const by = s2 ? cy - bh + k * bh : cy - bh / 2;
      if (val > 0) body += rect(left, by, X(val) - left, bh, { fill: barFill(i, s), stroke: INK, sw: 2.5 });
    });
    body += T(left - 8, cy + 6, l, { size: fs, anchor: 'end' });
  });
  body += line(left, pt, left, pb, { sw: 3 }) + line(left, pb, right + 6, pb, { sw: 3 });
  let h = pb + 34;
  if (xLabel) { body += T((left + right) / 2, h + 14, xLabel, { size: fs, weight: 800, fill: '#5b5075' }); h += 26; }
  if (yLabel) body += T(0, 0, yLabel, { size: fs, weight: 800, fill: '#5b5075', extra: ` transform="translate(${m + 16} ${f((pt + pb) / 2)}) rotate(-90)"` });
  return { w: W, h: h + m, body, label: title || 'bar graph' };
};

R.pictograph = (v, ctx) => {
  const rows = arr(v.rows).filter((r) => r && typeof r === 'object').slice(0, 8).map((r) => ({ label: str(r.label), count: clamp(num(r.count, 0), 0, 1000) }));
  if (!rows.length) rows.push({ label: '', count: 0 });
  const key = clamp(num(v.key, 1), 0.001, 1e6);
  const ic = str(v.icon).trim() || null;
  const title = str(v.title), m = 4, fs = 20, rh = 52, isz = 36, isp = 42;
  const units = rows.map((r) => Math.round((r.count / key) * 2) / 2);
  const maxU = Math.min(14, Math.max(1, ...units.map(Math.ceil)));
  const lw = Math.max(80, ...rows.map((r) => textW(r.label, fs) + 28));
  const W = lw + maxU * isp + 24;
  const clip = ctx.id('half');
  ctx.defs.push(`<clipPath id="${clip}" clipPathUnits="objectBoundingBox"><rect x="0" y="0" width="0.5" height="1"/></clipPath>`);
  let body = '', y = m;
  if (title) { body += T(m + W / 2, y + 26, title, { size: 22, weight: 800 }); y += 40; }
  const y0 = y;
  body += rect(m, y0, W, rh * rows.length, { rx: 10, fill: '#fff' }) + rect(m, y0, lw, rh * rows.length, { fill: '#FFF3E0' });
  rows.forEach((r, i) => {
    const cy = y0 + i * rh + rh / 2;
    body += T(m + lw / 2, cy + 7, r.label, { size: fs, weight: 800 });
    const u = Math.min(units[i], 14);
    for (let k = 0; k < Math.ceil(u); k++) {
      const cx = m + lw + 12 + k * isp + isp / 2, half = u - k < 1;
      const g1 = icon(ic, cx, cy, isz, PALETTE.orange);
      body += half ? `<g clip-path="url(#${clip})">${g1}</g>` : g1;
    }
    if (i) body += line(m, y0 + i * rh, m + W, y0 + i * rh, { stroke: '#e3dcca', sw: 2 });
  });
  body += line(m + lw, y0, m + lw, y0 + rh * rows.length, { sw: 3 }) + rect(m, y0, W, rh * rows.length, { rx: 10, fill: 'none', stroke: INK, sw: 3.5 });
  y = y0 + rh * rows.length + 14;
  const keyText = `= ${fmtNum(key)}`, kl = textW('Key:', 18);
  const kw = kl + isp + textW(keyText, fs) + 42;
  body += rect(m + W - kw, y, kw, 46, { rx: 10, fill: '#FFF8DA', stroke: INK, sw: 2.5 });
  body += T(m + W - kw + 12, y + 30, 'Key:', { size: 18, anchor: 'start', fill: '#5b5075', weight: 800 });
  body += icon(ic, m + W - kw + 20 + kl + isp / 2, y + 23, 32, PALETTE.orange) + T(m + W - 12, y + 30, keyText, { size: fs, anchor: 'end' });
  return { w: W + m * 2, h: y + 46 + m, body, label: title || 'pictograph' };
};

// ============================================================ probability
R.spinner = (v, ctx) => {
  const secs = arr(v.sections).filter((s) => s && typeof s === 'object').slice(0, 16);
  if (!secs.length) secs.push({ color: 'red' }, { color: 'blue' });
  const sizes = secs.map((s) => clamp(num(s.size, 1), 0.01, 1000)), tot = sizes.reduce((a, b) => a + b, 0);
  const r = 116, cx = r + 10, cy = r + 10;
  let a = 0, body = circ(cx, cy + 4, r, { fill: '#000', op: 0.08 });
  const mids = [];
  secs.forEach((s, i) => {
    const span = (sizes[i] / tot) * 360, c = col(s.color, CYCLE[i % CYCLE.length]);
    body += secs.length === 1 ? circ(cx, cy, r, { fill: c, stroke: INK, sw: 3 }) : pathEl(wedge(cx, cy, r, a, a + span), { fill: c, stroke: INK, sw: 3 });
    mids.push([a, span, c, s]);
    a += span;
  });
  mids.forEach(([a0, span, c, s]) => {
    const lab = s.label !== undefined && str(s.label) !== '' ? str(s.label) : str(s.color || '');
    if (!lab) return;
    const rr = secs.length === 1 ? 0 : r * 0.64, p = polar(cx, cy, rr, a0 + span / 2);
    const room = secs.length === 1 ? 200 : (span * Math.PI / 180) * rr * 0.9;
    const size = clamp(Math.min(24, (room / Math.max(1, textW(lab, 1)))), 12, 24);
    body += T(p[0], p[1] + size * 0.36, lab, { size, weight: 800, fill: onColor(c), halo: onColor(c) === INK ? null : dark(c, 0.35) });
  });
  body += circ(cx, cy, r, { fill: 'none', stroke: INK, sw: 4.5 });
  if (v.arrow !== false) {
    const ang = Number.isFinite(num(v.arrow, NaN)) && typeof v.arrow !== 'boolean' ? num(v.arrow) : mids[0][0] + mids[0][1] * 0.2;
    const tip = polar(cx, cy, r * 0.84, ang), b1 = polar(cx, cy, 11, ang - 90), b2 = polar(cx, cy, 11, ang + 90), tail = polar(cx, cy, 26, ang + 180);
    body += poly([tip, b1, tail, b2], { fill: INK, stroke: '#fff', sw: 2.5 });
    body += circ(cx, cy, 11, { fill: PALETTE.yellow, stroke: INK, sw: 3 });
  }
  return { w: cx * 2, h: cy * 2 + 4, body, label: 'spinner' };
};

const MARKS = ['plain', 'band', 'dot', 'ring', 'cross', 'twodots'];
function marble(cx, cy, r, c, mark) {
  let s = circ(cx, cy, r, { fill: c, stroke: INK, sw: 2.5 });
  const mk = c.toLowerCase() === '#ffffff' ? INK : '#fff', o = { stroke: mk, sw: 3, op: 0.85 };
  if (mark === 'band') s += line(cx - r * 0.75, cy + r * 0.2, cx + r * 0.75, cy - r * 0.2, o);
  else if (mark === 'dot') s += circ(cx, cy, r * 0.28, { fill: mk, op: 0.9 });
  else if (mark === 'ring') s += circ(cx, cy, r * 0.5, { fill: 'none', ...o, sw: 2.5 });
  else if (mark === 'cross') s += line(cx - r * 0.4, cy - r * 0.4, cx + r * 0.4, cy + r * 0.4, o) + line(cx + r * 0.4, cy - r * 0.4, cx - r * 0.4, cy + r * 0.4, o);
  else if (mark === 'twodots') s += circ(cx - r * 0.3, cy, r * 0.18, { fill: mk }) + circ(cx + r * 0.3, cy, r * 0.18, { fill: mk });
  if (mark === 'plain' || mark === 'band') s += el('ellipse', { cx: cx - r * 0.35, cy: cy - r * 0.4, rx: r * 0.28, ry: r * 0.17, fill: '#fff', op: 0.6 });
  return s;
}
R.marbles = (v) => {
  const items = arr(v.items).filter((it) => it && typeof it === 'object').slice(0, 6);
  const list = [];
  items.forEach((it, gi) => { for (let i = 0; i < int(it.count, 0, 0, 40) && list.length < 60; i++) list.push({ c: col(it.color, CYCLE[gi]), mark: MARKS[gi % MARKS.length] }); });
  const rand = rng(hash(JSON.stringify(items)));
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  const n = Math.max(list.length, 1), r = 15, d = r * 2 + 2;
  const cols = clamp(Math.ceil(Math.sqrt(n * 1.3)), 4, 9), rows = Math.ceil(n / cols);
  const innerW = cols * d + d / 2, innerH = Math.max(rows * d * 0.88 + 30, 90);
  const m = 8, jx = m + 6, jy = m + 24, jw = innerW + 16, jh = innerH + 10;
  let body = '';
  body += pathEl(`M${jx} ${jy}V${jy + jh - 26}Q${jx} ${jy + jh} ${jx + 26} ${jy + jh}H${jx + jw - 26}Q${jx + jw} ${jy + jh} ${jx + jw} ${jy + jh - 26}V${jy}`, { fill: '#EAF6FF', stroke: INK, sw: 4, fo: 0.9 });
  list.forEach((mb, i) => {
    const row = Math.floor(i / cols), k = i % cols;
    const cx = jx + 8 + r + 1 + k * d + (row % 2 ? d / 2 : 0), cy = jy + jh - 6 - r - row * d * 0.88;
    body += marble(cx, cy, r, mb.c, mb.mark);
  });
  body += rect(jx - 8, jy - 20, jw + 16, 22, { rx: 7, fill: '#B9DDF7', stroke: INK, sw: 3.5 });
  body += rect(jx + 10, jy + 14, 8, jh - 60, { rx: 4, fill: '#fff', op: 0.7 });
  return { w: jw + (jx - 8) * 2 + 16, h: jy + jh + m, body, label: 'jar of marbles' };
};

R.dice = (v) => {
  const vals = arr(v.values).map((x) => int(x, 1, 1, 6)).slice(0, 6);
  if (!vals.length) vals.push(1);
  const s = 100, gap = 22, m = 6;
  const body = vals.map((val, i) => dieFace(m + i * (s + gap), m, s, val)).join('');
  return { w: vals.length * (s + gap) - gap + m * 2, h: s + m * 2, body, label: `dice showing ${vals.join(' and ')}` };
};

// ====================================================== area & measuring
R.grid = (v) => {
  const cols = int(v.cols, 6, 1, 20), rows = int(v.rows, 4, 1, 16);
  const cell = clamp(Math.min(520 / cols, 300 / rows), 20, 46), m = 8;
  const on = new Set();
  for (const c of arr(v.cells)) if (Array.isArray(c)) { const x = Math.round(num(c[0], -1)), y = Math.round(num(c[1], -1)); if (x >= 0 && y >= 0 && x < cols && y < rows) on.add(`${x},${y}`); }
  if (v.rect && typeof v.rect === 'object') {
    const rx = int(v.rect.x, 0, 0, cols - 1), ry = int(v.rect.y, 0, 0, rows - 1), rw = int(v.rect.w, 1, 0, cols - rx), rh = int(v.rect.h, 1, 0, rows - ry);
    for (let x = rx; x < rx + rw; x++) for (let y = ry; y < ry + rh; y++) on.add(`${x},${y}`);
  }
  const W = cols * cell, H = rows * cell, c = PALETTE.teal;
  let body = rect(m, m, W, H, { fill: '#fff' });
  for (const k of on) { const [x, y] = k.split(',').map(Number); body += rect(m + x * cell, m + y * cell, cell, cell, { fill: light(c, 0.3) }); }
  let d = '';
  for (let i = 1; i < cols; i++) d += `M${f(m + i * cell)} ${m}V${f(m + H)}`;
  for (let i = 1; i < rows; i++) d += `M${m} ${f(m + i * cell)}H${f(m + W)}`;
  body += pathEl(d, { stroke: '#a9a3bd', sw: 1.6, fill: 'none' }) + rect(m, m, W, H, { fill: 'none', stroke: '#8f89a3', sw: 2.5 });
  let e = '';
  for (const k of on) {
    const [x, y] = k.split(',').map(Number), X0 = m + x * cell, Y0 = m + y * cell;
    if (!on.has(`${x},${y - 1}`)) e += `M${f(X0)} ${f(Y0)}H${f(X0 + cell)}`;
    if (!on.has(`${x},${y + 1}`)) e += `M${f(X0)} ${f(Y0 + cell)}H${f(X0 + cell)}`;
    if (!on.has(`${x - 1},${y}`)) e += `M${f(X0)} ${f(Y0)}V${f(Y0 + cell)}`;
    if (!on.has(`${x + 1},${y}`)) e += `M${f(X0 + cell)} ${f(Y0)}V${f(Y0 + cell)}`;
  }
  if (e) body += pathEl(e, { stroke: INK, sw: 4.5, fill: 'none' });
  let h = H + m * 2;
  if (v.showUnits === true) {
    const ks = Math.min(cell, 30);
    body += rect(m, h + 4, ks, ks, { fill: light(c, 0.3), stroke: INK, sw: 2.5 }) + T(m + ks + 10, h + 4 + ks / 2 + 7, '= 1 square unit', { size: 19, anchor: 'start' });
    h += ks + 12;
  }
  return { w: Math.max(W + m * 2, v.showUnits === true ? 230 : 0), h, body, label: 'grid of square units' };
};

function measureObject(kind, x0, x1, yc) {
  const L = Math.max(8, x1 - x0);
  const S = { stroke: INK, sw: 3 };
  switch (kind) {
    case 'crayon': {
      const t = Math.min(26, L * 0.22), c = PALETTE.purple;
      return poly([[x1 - t, yc - 13], [x1 - 4, yc - 4], [x1, yc], [x1 - 4, yc + 4], [x1 - t, yc + 13]], { fill: c, ...S }) +
        rect(x0, yc - 14, L - t, 28, { rx: 5, fill: c, ...S }) + rect(x0 + 8, yc - 14, Math.max(0, L - t - 16), 28, { fill: light(c, 0.35), stroke: INK, sw: 2 }) +
        line(x0 + 14, yc - 6, x1 - t - 14, yc - 6, { stroke: '#fff', sw: 2.5, op: 0.8 });
    }
    case 'key': {
      const r = Math.min(17, L * 0.18), c = PALETTE.yellow;
      const sx = x0 + r * 2;
      return rect(sx - 4, yc - 6, x1 - sx + 4, 12, { rx: 4, fill: c, ...S }) +
        pathEl(`M${f(x1 - Math.min(24, L * 0.25))} ${f(yc + 5)}v10h6v-6h5v8h6v-12`, { fill: c, ...S }) +
        circ(x0 + r, yc, r, { fill: c, ...S }) + circ(x0 + r, yc, r * 0.42, { fill: '#fff', ...S });
    }
    case 'leaf': {
      const st = Math.min(22, L * 0.18), c = PALETTE.green;
      return line(x0, yc, x0 + st + 6, yc, { stroke: PALETTE.brown, sw: 5 }) +
        pathEl(`M${f(x0 + st)} ${f(yc)}Q${f(x0 + st + (L - st) * 0.45)} ${f(yc - 34)} ${f(x1)} ${f(yc)}Q${f(x0 + st + (L - st) * 0.45)} ${f(yc + 34)} ${f(x0 + st)} ${f(yc)}Z`, { fill: c, ...S }) +
        line(x0 + st, yc, x1 - 8, yc, { stroke: light(c, 0.6), sw: 2.5 });
    }
    case 'worm': {
      const a = x0 + 9, b = x1 - 9, n = Math.max(2, Math.round((b - a) / 30));
      let d = `M${f(a)} ${f(yc)}`;
      for (let i = 0; i < n; i++) { const s0 = a + ((b - a) * i) / n, s1 = a + ((b - a) * (i + 1)) / n; d += `Q${f((s0 + s1) / 2)} ${f(yc + (i % 2 ? 12 : -12))} ${f(s1)} ${f(yc)}`; }
      return pathEl(d, { fill: 'none', stroke: INK, sw: 21 }) + pathEl(d, { fill: 'none', stroke: PALETTE.pink, sw: 15 }) +
        circ(b - 2, yc - 3, 2.8, { fill: INK });
    }
    case 'paperclip': {
      const h = 11, x = x0 + h, X = x1 - h;
      const d = `M${f(X - 14)} ${f(yc + 4)}H${f(x + 8)}A4 4 0 0 1 ${f(x + 8)} ${f(yc - 4)}H${f(X - 4)}A7 7 0 0 1 ${f(X - 4)} ${f(yc + 10)}H${f(x)}A${h} ${h} 0 0 1 ${f(x)} ${f(yc - 12)}H${f(X)}A${h} ${h} 0 0 1 ${f(X)} ${f(yc + 10)}`;
      return pathEl(d, { fill: 'none', stroke: INK, sw: 6 }) + pathEl(d, { fill: 'none', stroke: '#b8c0cc', sw: 3 });
    }
    default: { // pencil
      const e = Math.min(16, L * 0.12), t = Math.min(32, L * 0.24), c = PALETTE.yellow;
      return rect(x0, yc - 13, e + 4, 26, { rx: 5, fill: PALETTE.pink, ...S }) + rect(x0 + e, yc - 13, 9, 26, { fill: '#c4c9d2', ...S }) +
        rect(x0 + e + 9, yc - 13, Math.max(0, L - t - e - 9), 26, { fill: c, ...S }) + line(x0 + e + 12, yc, x1 - t - 3, yc, { stroke: dark(c, 0.15), sw: 2 }) +
        poly([[x1 - t, yc - 13], [x1, yc], [x1 - t, yc + 13]], { fill: '#F4D3A6', ...S }) + poly([[x1 - t * 0.35, yc - 4.5], [x1, yc], [x1 - t * 0.35, yc + 4.5]], { fill: INK, stroke: INK, sw: 2 });
    }
  }
}
R.ruler = (v) => {
  const len = int(v.length, 10, 1, 30), mm = v.unit === 'mm';
  const ppc = clamp(560 / len, 24, 60), m = 10, x0 = m + 18;
  const OBJ = ['pencil', 'crayon', 'key', 'leaf', 'worm', 'paperclip'];
  const obj = OBJ.includes(v.object) ? v.object : v.object ? 'pencil' : null;
  const start = clamp(Math.round(num(v.start, 0) * 2) / 2, 0, len);
  const olen = clamp(Math.round(num(v.objectLength, 5) * 2) / 2, 0.5, len - start || 0.5);
  const top = obj ? 84 : m;
  let body = '';
  const X = (cm) => x0 + cm * ppc;
  if (obj) {
    body += measureObject(obj, X(start), X(start + olen), 40);
    body += line(X(start), 62, X(start), top, { stroke: PALETTE.red, sw: 2.5, da: '5 5' }) + line(X(start + olen), 62, X(start + olen), top, { stroke: PALETTE.red, sw: 2.5, da: '5 5' });
  }
  const uw = textW(mm ? 'mm' : 'cm', 18), rw = len * ppc + 18 + textW(mm ? String(len * 10) : String(len), 18) / 2 + uw + 22, rh = 70;
  body += rect(x0 - 18, top, rw, rh, { rx: 8, fill: '#FFE7A0', stroke: INK, sw: 3.5 });
  const maxLab = mm ? String(len * 10) : String(len);
  const every = [1, 2, 5, 10].find((k) => k * ppc >= textW(maxLab, 18) + 8) || 10;
  let d = '';
  for (let i = 0; i <= len * 10; i++) {
    const x = X(i / 10);
    const L = i % 10 === 0 ? 26 : i % 5 === 0 ? 18 : 10;
    if (i % 10 === 0 || i % 5 === 0 || mm) d += `M${f(x)} ${top}v${L}`;
  }
  body += pathEl(d, { stroke: INK, sw: 2.2, fill: 'none', lc: 'butt' });
  for (let cm = 0; cm <= len; cm += every) body += T(X(cm), top + 50, String(mm ? cm * 10 : cm), { size: 18, weight: 700 });
  body += T(x0 - 18 + rw - 10, top + 50, mm ? 'mm' : 'cm', { size: 18, weight: 800, fill: '#7a5b12', anchor: 'end' });
  return { w: x0 - 18 + rw + m, h: top + rh + m, body, label: obj ? `a ${obj} beside a ruler` : 'ruler' };
};

function miniDial(cx, cy, r, frac) {
  let s = circ(cx, cy, r, { fill: '#fff', stroke: INK, sw: 3 });
  for (let i = 0; i <= 10; i++) { const a = -135 + i * 27, p0 = polar(cx, cy, r - 3, a), p1 = polar(cx, cy, r - (i % 5 ? 7 : 11), a); s += line(p0[0], p0[1], p1[0], p1[1], { sw: 2 }); }
  const tip = polar(cx, cy, r - 6, -135 + clamp(frac, 0, 1) * 270);
  return s + line(cx, cy, tip[0], tip[1], { stroke: PALETTE.red, sw: 3.5 }) + circ(cx, cy, 3.5, { fill: INK });
}
R.measurecompare = (v) => {
  const items = arr(v.items).filter((it) => it && typeof it === 'object').slice(0, 6).map((it) => ({ ic: str(it.object).trim() || null, val: clamp(num(it.value, 1), 0, 1e9), unit: str(it.unit) }));
  if (!items.length) items.push({ ic: null, val: 1, unit: '' });
  const attr0 = ['length', 'height', 'mass', 'capacity'].includes(v.attribute) ? v.attribute : 'length';
  const maxV = Math.max(1e-9, ...items.map((i) => i.val)), m = 8;
  const lab = (it) => (it.unit ? `${fmtNum(it.val)} ${it.unit}` : '');
  let body = '';
  if (attr0 === 'length') {
    const rh = 58, bx = m + 56, maxL = 420;
    items.forEach((it, i) => {
      const cy = m + i * rh + rh / 2, L = Math.max(6, (it.val / maxV) * maxL);
      body += icon(it.ic, m + 24, cy, 38, col(CYCLE[i]));
      body += rect(bx, cy - 14, L, 28, { rx: 8, fill: col(CYCLE[i]), stroke: INK, sw: 3 });
      if (lab(it)) body += T(bx + L + 10, cy + 7, lab(it), { size: 19, anchor: 'start' });
    });
    body += line(bx, m, bx, m + items.length * rh, { stroke: INK, sw: 3, da: '5 5' });
    const lw = Math.max(0, ...items.map((it) => textW(lab(it), 19)));
    return { w: bx + maxL + lw + 20 + m, h: items.length * rh + m * 2, body, label: 'length comparison' };
  }
  const cw = 110, W = items.length * cw + m * 2;
  if (attr0 === 'height') {
    const base = m + 44 + 200;
    items.forEach((it, i) => {
      const cx = m + i * cw + cw / 2, H = Math.max(6, (it.val / maxV) * 200);
      body += rect(cx - 26, base - H, 52, H, { rx: 6, fill: col(CYCLE[i]), stroke: INK, sw: 3 });
      body += icon(it.ic, cx, base - H - 22, 38, col(CYCLE[i]));
      if (lab(it)) body += T(cx, base + 28, lab(it), { size: 19 });
    });
    body += line(m, base, W - m, base, { sw: 4 });
    return { w: W, h: base + (items.some(lab) ? 40 : 10), body, label: 'height comparison' };
  }
  if (attr0 === 'mass') {
    items.forEach((it, i) => {
      const cx = m + i * cw + cw / 2;
      body += icon(it.ic, cx, m + 26, 44, col(CYCLE[i]));
      body += rect(cx - 42, m + 52, 84, 10, { rx: 4, fill: '#c4c9d2', stroke: INK, sw: 3 }) + rect(cx - 6, m + 62, 12, 10, { fill: '#8f96a3', stroke: INK, sw: 2.5 });
      body += rect(cx - 44, m + 72, 88, 86, { rx: 14, fill: light(col(CYCLE[i]), 0.4), stroke: INK, sw: 3 });
      body += miniDial(cx, m + 115, 32, it.val / maxV);
      if (lab(it)) body += T(cx, m + 186, lab(it), { size: 19 });
    });
    return { w: W, h: m + 160 + (items.some(lab) ? 36 : 6), body, label: 'mass comparison' };
  }
  // capacity
  const jt = m + 50, jh = 150;
  items.forEach((it, i) => {
    const cx = m + i * cw + cw / 2, lvl = (it.val / maxV) * (jh - 16);
    body += icon(it.ic, cx, m + 22, 40, PALETTE.blue);
    body += rect(cx - 36, jt + jh - 6 - lvl, 72, lvl, { fill: '#8CC8F5' });
    if (lvl > 0) body += line(cx - 36, jt + jh - 6 - lvl, cx + 36, jt + jh - 6 - lvl, { stroke: PALETTE.blue, sw: 3 });
    body += pathEl(`M${f(cx - 40)} ${jt}V${f(jt + jh - 12)}Q${f(cx - 40)} ${f(jt + jh)} ${f(cx - 28)} ${f(jt + jh)}H${f(cx + 28)}Q${f(cx + 40)} ${f(jt + jh)} ${f(cx + 40)} ${f(jt + jh - 12)}V${jt}`, { fill: 'none', stroke: INK, sw: 4 });
    if (lab(it)) body += T(cx, jt + jh + 28, lab(it), { size: 19 });
  });
  return { w: W, h: jt + jh + (items.some(lab) ? 40 : 10), body, label: 'capacity comparison' };
};

R.scale = (v) => {
  const unit = v.unit === 'kg' ? 'kg' : 'g';
  const max = clamp(num(v.max, unit === 'kg' ? 5 : 1000), 0.001, 1e7), val = clamp(num(v.value, 0), 0, max);
  let major = niceStep(max / 10);
  while (max / major > 12) major = niceStep(major * 1.01 + 1e-12);
  const labR = 118 - 40;
  for (let k = 0; k < 8; k++) {
    const widest = textW(fmtNum(Math.floor(max / major) * major), 18) + 8;
    if (labR * ((300 * major) / max) * (Math.PI / 180) >= widest) break;
    major = niceStep(major * 1.01 + 1e-12);
  }
  const lead = Math.round(major / Math.pow(10, Math.floor(Math.log10(major))));
  const minor = major / (lead === 2 ? 4 : 5);
  const W = 300, cx = W / 2, cy = 196, Rr = 118, sweep = 300;
  const A = (x) => -150 + (x / max) * sweep;
  let body = '';
  body += rect(cx - 110, 14, 220, 16, { rx: 8, fill: '#c4c9d2', stroke: INK, sw: 3.5 }) + rect(cx - 16, 30, 32, 18, { fill: '#8f96a3', stroke: INK, sw: 3 });
  body += rect(14, 46, W - 28, 300, { rx: 44, fill: PALETTE.red, stroke: INK, sw: 4 });
  body += circ(cx, cy, Rr + 10, { fill: '#fff', stroke: INK, sw: 4 });
  let d = '';
  const nMinor = Math.round(max / minor);
  for (let i = 0; i <= nMinor; i++) {
    const x = i * minor, isMaj = Math.abs(x / major - Math.round(x / major)) < 1e-6;
    const p0 = polar(cx, cy, Rr - 2, A(x)), p1 = polar(cx, cy, Rr - (isMaj ? 20 : 10), A(x));
    d += `M${f(p0[0])} ${f(p0[1])}L${f(p1[0])} ${f(p1[1])}`;
    if (isMaj) { const q = polar(cx, cy, Rr - 40, A(x)); body += T(q[0], q[1] + 6.5, fmtNum(Math.round(x * 1e6) / 1e6), { size: 18, weight: 800 }); }
  }
  body += pathEl(d, { stroke: INK, sw: 2.5, fill: 'none' });
  body += T(cx, cy + 58, unit, { size: 24, weight: 800, fill: PALETTE.red });
  const tip = polar(cx, cy, Rr - 12, A(val)), b1 = polar(cx, cy, 6, A(val) - 90), b2 = polar(cx, cy, 6, A(val) + 90), tail = polar(cx, cy, 18, A(val) + 180);
  body += poly([tip, b1, tail, b2], { fill: PALETTE.red, stroke: INK, sw: 2 }) + circ(cx, cy, 9, { fill: INK });
  return { w: W, h: 352, body, label: `scale showing ${fmtNum(val)} ${unit}` };
};

R.jug = (v) => {
  const unit = v.unit === 'L' ? 'L' : 'mL';
  const max = clamp(num(v.max, unit === 'L' ? 2 : 1000), 0.001, 1e7), val = clamp(num(v.value, 0), 0, max);
  let step = num(v.ticks, 0) > 0 ? num(v.ticks) : niceStep(max / 5);
  while (max / step > 12) step = niceStep(step * 1.6);
  const minor = step / 2;
  const top = 44, bot = 300, lt = 40, rt = 250, lb = 58, rb = 232;
  const lx = (y) => lt + ((y - top) / (bot - top)) * (lb - lt), rx = (y) => rt + ((y - top) / (bot - top)) * (rb - rt);
  const Y = (x) => bot - 14 - (x / max) * (bot - top - 40);
  let body = '';
  body += pathEl(`M${rt - 6} 84C330 84 330 250 ${rb - 4} 250`, { fill: 'none', stroke: INK, sw: 18 }) + pathEl(`M${rt - 6} 84C330 84 330 250 ${rb - 4} 250`, { fill: 'none', stroke: '#DCEEFB', sw: 11 });
  const yl = Y(val);
  body += poly([[lt - 12, top - 14], [lt, top], [lb, bot], [rb, bot], [rt, top]], { fill: '#F2F9FF', stroke: 'none' });
  if (val > 0) body += pathEl(`M${f(lx(yl))} ${f(yl)}Q${f((lx(yl) + rx(yl)) / 4 + lx(yl) / 2)} ${f(yl - 6)} ${f((lx(yl) + rx(yl)) / 2)} ${f(yl)}T${f(rx(yl))} ${f(yl)}L${rb} ${bot}H${lb}Z`, { fill: '#7FC2F2', stroke: PALETTE.blue, sw: 2.5 });
  body += pathEl(`M${lt - 14} ${top - 16}L${lt} ${top}L${lb} ${bot - 10}Q${lb} ${bot} ${lb + 10} ${bot}H${rb - 10}Q${rb} ${bot} ${rb} ${bot - 10}L${rt} ${top}`, { fill: 'none', stroke: INK, sw: 4.5 });
  let d = '';
  const nm = Math.round(max / minor);
  for (let i = 0; i <= nm; i++) {
    const x = i * minor, y = Y(x), isMaj = i % 2 === 0, x0 = lx(y) + 3;
    d += `M${f(x0)} ${f(y)}h${isMaj ? 34 : 18}`;
    if (isMaj && i > 0) body += T(x0 + 42, y + 6.5, fmtNum(Math.round(x * 1e6) / 1e6), { size: 18, anchor: 'start', weight: 800, halo: '#F2F9FF' });
  }
  body += pathEl(d, { stroke: INK, sw: 3, fill: 'none', lc: 'butt' });
  body += T((lt + rt) / 2 + 40, top + 26, unit, { size: 22, weight: 800, fill: PALETTE.blue, halo: '#F2F9FF' });
  return { w: 340, h: bot + 8, body, label: `jug with ${fmtNum(val)} ${unit}` };
};

R.prism = (v) => {
  const l = int(v.l, 3, 1, 10), w = int(v.w, 2, 1, 10), h = int(v.h, 2, 1, 10), cubes = v.showCubes === true;
  const dx = 0.55, dy = 0.45;
  const u = clamp(Math.min(400 / (l + w * dx), 230 / (h + w * dy)), 14, 56), m = cubes ? 8 : 34;
  const x0 = m, y0 = m + w * dy * u;
  const c = PALETTE.orange;
  const F = [[x0, y0], [x0 + l * u, y0], [x0 + l * u, y0 + h * u], [x0, y0 + h * u]];
  const D = (p, k = w) => [p[0] + k * dx * u, p[1] - k * dy * u];
  let body = poly([F[0], F[1], D(F[1]), D(F[0])], { fill: light(c, 0.45), stroke: INK, sw: 3.5 });
  body += poly([F[1], D(F[1]), D(F[2]), F[2]], { fill: dark(c, 0.18), stroke: INK, sw: 3.5 });
  body += poly(F, { fill: c, stroke: INK, sw: 3.5 });
  if (cubes) {
    let d = '';
    for (let i = 1; i < l; i++) { const x = x0 + i * u; d += `M${f(x)} ${f(y0)}V${f(y0 + h * u)}M${f(x)} ${f(y0)}L${f(x + w * dx * u)} ${f(y0 - w * dy * u)}`; }
    for (let j = 1; j < h; j++) { const y = y0 + j * u; d += `M${f(x0)} ${f(y)}H${f(x0 + l * u)}L${f(x0 + l * u + w * dx * u)} ${f(y - w * dy * u)}`; }
    for (let k = 1; k < w; k++) {
      const a = D(F[0], k), b = D(F[1], k), cc = D(F[2], k);
      d += `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}L${f(cc[0])} ${f(cc[1])}`;
    }
    body += pathEl(d, { stroke: INK, sw: 2, fill: 'none' });
  } else {
    body += T(x0 + (l * u) / 2, y0 + h * u + 26, String(l), { size: 22 });
    body += T(x0 - 12, y0 + (h * u) / 2 + 8, String(h), { size: 22, anchor: 'end' });
    const mid = D(F[2], w / 2);
    body += T(mid[0] + 12, mid[1] + 12, String(w), { size: 22, anchor: 'start' });
  }
  return { w: x0 + l * u + w * dx * u + m + (cubes ? 0 : 10), h: y0 + h * u + (cubes ? m : 36), body, label: `rectangular prism ${l} by ${w} by ${h}` };
};

// ================================================================ angles
R.angle = (v) => {
  const deg = clamp(num(v.degrees, 45), 1, 359), L = 190, ar = deg >= 150 && deg <= 210 ? 40 : 50;
  const p = (a, r) => [r * Math.cos((a * Math.PI) / 180), -r * Math.sin((a * Math.PI) / 180)];
  const label = v.label !== undefined && str(v.label) !== '' ? str(v.label) : null;
  const pts = [[0, 0], p(0, L), p(deg, L)];
  if (v.showArc !== false) for (let a = 0; a <= deg; a += 5) pts.push(p(a, ar));
  let lp = p(deg / 2, ar + 30);
  if (label) {
    const lw = richW(label, 22) / 2 + 16, lh = hasFrac(label) ? 28 : 18;
    const ray = [];
    for (let r = 0; r <= L; r += 6) ray.push(p(0, r), p(deg, r));
    for (let r = ar + 30; r < 420; r += 6) {
      lp = p(deg / 2, r);
      if (!ray.some((q) => Math.abs(q[0] - lp[0]) < lw && Math.abs(q[1] - lp[1]) < lh)) break;
    }
    pts.push([lp[0] - lw, lp[1] - lh], [lp[0] + lw, lp[1] + lh]);
  }
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), m = 16;
  const ox = m - Math.min(...xs), oy = m - Math.min(...ys);
  const t = (q) => [q[0] + ox, q[1] + oy];
  let body = '';
  if (v.showArc !== false) {
    if (Math.abs(deg - 90) < 0.01) {
      const a = t(p(0, 28)), b = t(p(45, 28 * Math.SQRT2)), c = t(p(90, 28));
      body += el('polyline', { points: P([a, b, c]), fill: light(PALETTE.orange, 0.6), stroke: PALETTE.orange, sw: 4 });
    } else {
      const a = t(p(0, ar)), b = t(p(deg, ar)), V = t([0, 0]);
      body += pathEl(`M${f(V[0])} ${f(V[1])}L${f(a[0])} ${f(a[1])}A${ar} ${ar} 0 ${deg > 180 ? 1 : 0} 0 ${f(b[0])} ${f(b[1])}Z`, { fill: light(PALETTE.orange, 0.6), stroke: 'none' });
      body += pathEl(`M${f(a[0])} ${f(a[1])}A${ar} ${ar} 0 ${deg > 180 ? 1 : 0} 0 ${f(b[0])} ${f(b[1])}`, { fill: 'none', stroke: PALETTE.orange, sw: 4 });
    }
  }
  const V = t([0, 0]), e1 = t(p(0, L)), e2 = t(p(deg, L));
  body += line(V[0], V[1], e1[0], e1[1], { stroke: PALETTE.blue, sw: 6 }) + line(V[0], V[1], e2[0], e2[1], { stroke: PALETTE.blue, sw: 6 });
  body += circ(e1[0], e1[1], 6, { fill: PALETTE.blue, stroke: INK, sw: 2 }) + circ(e2[0], e2[1], 6, { fill: PALETTE.blue, stroke: INK, sw: 2 }) + circ(V[0], V[1], 7, { fill: INK });
  if (label) { const q = t(lp); body += T(q[0], q[1] + 8, label, { size: 22, halo: '#fff' }); }
  return { w: Math.max(...xs) - Math.min(...xs) + m * 2, h: Math.max(...ys) - Math.min(...ys) + m * 2, body, label: label ? `angle labelled ${label}` : 'angle' };
};

R.protractor = (v) => {
  const deg = clamp(num(v.degrees, 45), 0, 180), Rr = 286, m = 26, cx = m + Rr + 4, cy = m + Rr + 4;
  let body = pathEl(`M${cx - Rr} ${cy}A${Rr} ${Rr} 0 0 1 ${cx + Rr} ${cy}Z`, { fill: '#E3F1FF', stroke: INK, sw: 3.5, fo: 0.92 });
  body += pathEl(`M${cx - 70} ${cy}A70 70 0 0 1 ${cx + 70} ${cy}`, { fill: 'none', stroke: '#9fc3e8', sw: 2.5 });
  let d = '';
  for (let a = 0; a <= 180; a++) {
    const L = a % 10 === 0 ? 22 : a % 5 === 0 ? 15 : 8;
    const ang = 90 - a; // 0 deg at right, counter-clockwise
    const p0 = polar(cx, cy, Rr, ang), p1 = polar(cx, cy, Rr - L, ang);
    d += `M${f(p0[0])} ${f(p0[1])}L${f(p1[0])} ${f(p1[1])}`;
    if (a % 10 === 0) { const q = polar(cx, cy, Rr - 44, ang); body += T(q[0], q[1] + 6.5 - (a === 0 || a === 180 ? 14 : 0), String(a), { size: 18, weight: 800 }); }
  }
  body += pathEl(d, { stroke: INK, sw: 1.8, fill: 'none', lc: 'butt' });
  const e0 = polar(cx, cy, Rr + 20, 90), e1 = polar(cx, cy, Rr + 20, 90 - deg);
  body += pathEl(`M${cx + 44} ${cy}A44 44 0 0 0 ${f(polar(cx, cy, 44, 90 - deg)[0])} ${f(polar(cx, cy, 44, 90 - deg)[1])}`, { fill: 'none', stroke: PALETTE.orange, sw: 4.5 });
  body += line(cx, cy, e0[0], e0[1], { stroke: PALETTE.red, sw: 5 }) + line(cx, cy, e1[0], e1[1], { stroke: PALETTE.red, sw: 5 });
  body += circ(cx, cy, 6, { fill: INK });
  return { w: cx * 2, h: cy + 12, body, label: 'angle on a protractor' };
};

// ====================================================== coordinate grids
function plane(max, o = {}) {
  const cell = o.cell || clamp(340 / max, 26, 50), ml = 42, mt = 22, S = max * cell;
  const X = (x) => ml + clamp(num(x, 0), 0, max) * cell, Y = (y) => mt + S - clamp(num(y, 0), 0, max) * cell;
  let body = rect(ml, mt, S, S, { fill: '#fff' });
  let d = '';
  for (let i = 1; i <= max; i++) d += `M${f(X(i))} ${mt}V${f(mt + S)}M${ml} ${f(Y(i))}H${f(ml + S)}`;
  body += pathEl(d, { stroke: '#cfc9e0', sw: 1.6, fill: 'none' });
  body += line(ml, mt + S, ml + S + 16, mt + S, { sw: 3.5 }) + line(ml, mt + S, ml, mt - 12, { sw: 3.5 });
  body += poly([[ml + S + 22, mt + S], [ml + S + 10, mt + S - 7], [ml + S + 10, mt + S + 7]], { fill: INK }) + poly([[ml, mt - 18], [ml - 7, mt - 6], [ml + 7, mt - 6]], { fill: INK });
  const lab = max > 12 ? 2 : 1;
  for (let i = 0; i <= max; i += lab) {
    body += T(X(i), mt + S + 24, String(i), { size: 18, weight: 700 });
    if (i) body += T(ml - 10, Y(i) + 6, String(i), { size: 18, weight: 700, anchor: 'end' });
  }
  body += T(ml + S + 24, mt + S + 26, 'x', { size: 19, weight: 800, fill: SOFT, extra: ' font-style="italic"' }) + T(ml + 16, mt - 4, 'y', { size: 19, weight: 800, fill: SOFT, extra: ' font-style="italic"' });
  return { X, Y, body, w: ml + S + 34, h: mt + S + 34 };
}
const ptsOf = (a) => arr(a).filter((p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(num(p[0], NaN)) && Number.isFinite(num(p[1], NaN))).map((p) => [num(p[0]), num(p[1])]).slice(0, 20);
function polyOn(pl, pts, c, dashed, ctx) {
  if (!pts.length) return '';
  const sp = pts.map((p) => [pl.X(p[0]), pl.Y(p[1])]);
  const fill = dashed ? ctx.fill('stripes', light(c, 0.55)) : light(c, 0.55);
  return el(pts.length > 2 ? 'polygon' : 'polyline', { points: P(sp), fill: pts.length > 2 ? fill : 'none', fo: 0.8, stroke: dark(c, 0.1), sw: 4, da: dashed ? '10 7' : null }) +
    sp.map((q) => circ(q[0], q[1], 4.5, { fill: dark(c, 0.1) })).join('');
}
R.coordplane = (v, ctx) => {
  const max = int(v.max, 10, 5, 10);
  const pl = plane(max);
  let body = pl.body;
  body += polyOn(pl, ptsOf(v.polygon), PALETTE.blue, false, ctx) + polyOn(pl, ptsOf(v.polygon2), PALETTE.orange, true, ctx);
  arr(v.points).filter((p) => p && typeof p === 'object').slice(0, 20).forEach((p, i) => {
    const x = pl.X(p.x), y = pl.Y(p.y), c = col(p.color, i % 2 ? 'orange' : 'red');
    body += circ(x, y, 8, { fill: c, stroke: INK, sw: 3 });
    if (p.label !== undefined && str(p.label) !== '') body += T(x + 12, y - 10, str(p.label), { size: 21, weight: 800, anchor: 'start', halo: '#fff' });
  });
  return { w: pl.w, h: pl.h, body, label: 'coordinate grid' };
};
R.transform = (v, ctx) => {
  const max = int(v.grid, 10, 4, 16);
  const pl = plane(max);
  const A = ptsOf(v.original), B = ptsOf(v.image);
  let body = pl.body;
  if (v.mirror && typeof v.mirror === 'object' && Number.isFinite(num(v.mirror.at, NaN))) {
    const at = num(v.mirror.at);
    const fits = (fn) => A.length && A.length === B.length && A.every((p, i) => { const q = fn(p); return Math.abs(q[0] - B[i][0]) < 1e-6 && Math.abs(q[1] - B[i][1]) < 1e-6; });
    const vert = fits((p) => [2 * at - p[0], p[1]]), horiz = fits((p) => [p[0], 2 * at - p[1]]);
    const vertical = vert ? true : horiz ? false : v.mirror.axis !== 'y' ? true : false;
    body += vertical ? line(pl.X(at), pl.Y(max) - 8, pl.X(at), pl.Y(0) + 8, { stroke: PALETTE.purple, sw: 4.5, da: '4 9' }) : line(pl.X(0) - 8, pl.Y(at), pl.X(max) + 8, pl.Y(at), { stroke: PALETTE.purple, sw: 4.5, da: '4 9' });
  }
  body += polyOn(pl, A, PALETTE.blue, false, ctx) + polyOn(pl, B, PALETTE.orange, true, ctx);
  const ly = pl.h + 10;
  body += rect(42, ly, 34, 22, { fill: light(PALETTE.blue, 0.55), stroke: dark(PALETTE.blue, 0.1), sw: 3.5 }) + T(84, ly + 18, 'before', { size: 19, anchor: 'start' });
  body += rect(190, ly, 34, 22, { fill: ctx.fill('stripes', light(PALETTE.orange, 0.55)), stroke: dark(PALETTE.orange, 0.1), sw: 3.5, da: '8 5' }) + T(232, ly + 18, 'after', { size: 19, anchor: 'start' });
  return { w: pl.w, h: ly + 32, body, label: 'transformation on a grid' };
};

R.symmetry = (v, ctx) => {
  const sh = str(v.shape).trim(), S = 230, m = 22, cx = m + S / 2, cy = m + S / 2;
  let body = '';
  if (/^letter:/i.test(sh)) {
    const ch = sh.slice(7).trim().charAt(0).toUpperCase() || 'A';
    body += `<text x="${cx}" y="${f(cy + S * 0.36)}" font-size="${S}" font-weight="900" text-anchor="middle" fill="${PALETTE.teal}" stroke="${INK}" stroke-width="5" paint-order="stroke" stroke-linejoin="round">${esc(ch)}</text>`;
  } else body += drawShape(ctx, { shape: sh || 'square', color: v.color || 'teal' }, cx, cy, S * 0.86, 'teal');
  const ln = v.line;
  const o = { stroke: PALETTE.purple, sw: 5, da: '12 9' };
  if (ln === 'vertical') body += line(cx, 4, cx, m * 2 + S - 4, o);
  else if (ln === 'horizontal') body += line(4, cy, m * 2 + S - 4, cy, o);
  else if (ln === 'diagonal') body += line(10, m * 2 + S - 10, m * 2 + S - 10, 10, o);
  return { w: S + m * 2, h: S + m * 2, body, label: 'shape with a line of symmetry to check' };
};

// ====================================================== sorting & models
const isEmoji = (x) => typeof x === 'string' && x.trim() !== '' && [...x.trim()].every((ch) => { const c = ch.codePointAt(0); return c >= 0x1f000 || (c >= 0x2600 && c <= 0x27bf) || c === 0xfe0f || c === 0x200d || (c >= 0x1f3fb && c <= 0x1f3ff); });
R.venn = (v) => {
  const L = arr(v.left).slice(0, 12), B = arr(v.both).slice(0, 8), Rr = arr(v.right).slice(0, 12), O = arr(v.outside).slice(0, 8);
  const W = 640, cy = 190, r = 124, c1 = 240, c2 = 400, fs = 21;
  const cL = PALETTE.blue, cR = PALETTE.orange;
  let body = rect(4, 48, W - 8, 290, { rx: 16, fill: '#FBFAFF', stroke: '#b7b0cc', sw: 3 });
  body += circ(c1, cy, r, { fill: cL, fo: 0.18, stroke: cL, sw: 4.5 }) + circ(c2, cy, r, { fill: cR, fo: 0.18, stroke: cR, sw: 4.5, da: '14 6' });
  body += T(c1 - 30, 36, str(v.leftLabel), { size: 22, weight: 800, fill: dark(cL, 0.25) }) + T(c2 + 30, 36, str(v.rightLabel), { size: 22, weight: 800, fill: dark(cR, 0.3) });
  const place = (items, x, maxPer, colW) => {
    let s = '';
    const n = items.length, ncol = Math.ceil(n / maxPer) || 1;
    items.forEach((it, i) => {
      const cI = Math.floor(i / maxPer), inCol = Math.min(maxPer, n - cI * maxPer), row = i % maxPer;
      const px = x + (cI - (ncol - 1) / 2) * colW, py = cy + (row - (inCol - 1) / 2) * 34;
      s += isEmoji(it) ? icon(str(it), px, py, 30) : T(px, py + 7, typeof it === 'number' ? fmtNum(it) : str(it), { size: fs });
    });
    return s;
  };
  body += place(L, 175, 5, 52) + place(B, 320, 6, 40) + place(Rr, 465, 5, 52);
  O.forEach((it, i) => {
    const left = i % 2 === 0, k = Math.floor(i / 2);
    const oy = 90 + k * 64 + (k > 1 ? 40 : 0);
    body += isEmoji(it) ? icon(str(it), left ? 50 : W - 50, oy - 7, 30) : T(left ? 50 : W - 50, oy, typeof it === 'number' ? fmtNum(it) : str(it), { size: fs });
  });
  return { w: W, h: 342, body, label: `Venn diagram: ${str(v.leftLabel)} and ${str(v.rightLabel)}` };
};

R.numberbond = (v) => {
  const parts = arr(v.parts).slice(0, 4);
  if (parts.length < 2) while (parts.length < 2) parts.push('?');
  const r = 50, W = Math.max(400, parts.length * 130), m = 8;
  const wc = [W / 2, m + r + 4];
  const pcs = parts.map((_, i) => [W / 2 + (i - (parts.length - 1) / 2) * (parts.length > 2 ? 124 : 200), m + r + 150]);
  let body = '';
  for (const p of pcs) body += line(wc[0], wc[1], p[0], p[1], { stroke: INK, sw: 4 });
  const node = (c, val, whole) => {
    const q = isQ(val) || val === undefined || val === null || str(val) === '';
    const s = q ? '?' : typeof val === 'number' ? fmtNum(val) : str(val);
    const size = clamp(Math.min(32, (2 * r - 16) / Math.max(1, textW(s, 1))), 14, 32);
    return circ(c[0], c[1], r, { fill: q ? '#FFF6D6' : whole ? '#D9E8FF' : '#FFE2C2', stroke: INK, sw: 4, da: q ? '8 6' : null }) +
      T(c[0], c[1] + size * 0.36, s, { size, weight: 800 });
  };
  body += node(wc, v.whole, true);
  parts.forEach((p, i) => { body += node(pcs[i], p, false); });
  return { w: W, h: m * 2 + r * 2 + 154, body, label: 'number bond' };
};

R.barmodel = (v) => {
  const parts = arr(v.parts).slice(0, 8);
  if (!parts.length) parts.push('?');
  const labels = arr(v.labels);
  const whole = v.whole, wholeNum = Number.isFinite(num(whole, NaN)) && !isQ(whole) ? num(whole) : null;
  const known = parts.filter((p) => Number.isFinite(num(p, NaN)) && !isQ(p)).map((p) => Math.max(0, num(p)));
  const unknown = parts.length - known.length, sumK = known.reduce((a, b) => a + b, 0);
  let uVal = known.length ? sumK / known.length : 1;
  if (wholeNum !== null && unknown > 0 && wholeNum - sumK > 0) uVal = (wholeNum - sumK) / unknown;
  const vals = parts.map((p) => (Number.isFinite(num(p, NaN)) && !isQ(p) ? Math.max(num(p), 0) : uVal));
  const txt = parts.map((p) => (isQ(p) ? '?' : typeof p === 'number' ? fmtNum(p) : str(p)));
  const BW = 520, m = 8, tot = vals.reduce((a, b) => a + b, 0) || 1;
  let ws = vals.map((x, i) => Math.max(textW(txt[i], 24) + 20, 46, (x / tot) * BW));
  const sw = ws.reduce((a, b) => a + b, 0);
  if (sw > BW) { const extra = sw - BW, flex = ws.map((w, i) => w - Math.max(textW(txt[i], 24) + 20, 46)); const fsum = flex.reduce((a, b) => a + b, 0) || 1; ws = ws.map((w, i) => w - (extra * flex[i]) / fsum); }
  const hasWhole = whole !== undefined && whole !== null && str(whole) !== '';
  const y0 = m + (hasWhole ? 72 : 0), bh = 56;
  let x = m, body = '';
  if (hasWhole) {
    const X1 = m + ws.reduce((a, b) => a + b, 0), mid = (m + X1) / 2, by = y0 - 10;
    body += pathEl(`M${m + 2} ${by}Q${m + 2} ${by - 14} ${m + 16} ${by - 14}H${f(mid - 12)}Q${f(mid)} ${by - 14} ${f(mid)} ${by - 26}Q${f(mid)} ${by - 14} ${f(mid + 12)} ${by - 14}H${f(X1 - 16)}Q${f(X1 - 2)} ${by - 14} ${f(X1 - 2)} ${by}`, { fill: 'none', stroke: INK, sw: 3.5 });
    const wt = isQ(whole) ? '?' : typeof whole === 'number' ? fmtNum(whole) : str(whole);
    body += isQ(whole) ? qbox(mid, by - 46, 46, 36, 24) : T(mid, by - 36, wt, { size: 24, weight: 800 });
  }
  const hasLabels = labels.some((l) => str(l) !== '');
  parts.forEach((p, i) => {
    const w = ws[i], q = isQ(p);
    body += rect(x, y0, w, bh, { fill: q ? '#FFF6D6' : i % 2 ? '#FFE2C2' : '#D9E8FF', stroke: INK, sw: 3.5 });
    body += T(x + w / 2, y0 + bh / 2 + 9, txt[i], { size: 24, weight: 800 });
    if (str(labels[i]) !== '') body += T(x + w / 2, y0 + bh + 26, str(labels[i]), { size: 19, weight: 700, fill: '#5b5075' });
    x += w;
  });
  return { w: x + m, h: y0 + bh + (hasLabels ? 38 : 0) + m, body, label: 'bar model' };
};

R.expression = (v) => {
  const t = str(v.text), size = v.big === true ? 64 : 44, fr = hasFrac(t);
  const W = Math.max(120, richW(t, size) + size * 0.9), H = size * (fr ? 2.1 : 1.6);
  const body = rect(3, 3, W - 6, H - 6, { rx: 18, fill: '#F7F5FF', stroke: '#d9d3ea', sw: 3 }) + T(W / 2, H / 2 + size * (fr ? 0.3 : 0.35), t, { size, weight: 800 });
  return { w: W, h: H, body, label: t };
};

// @@RENDERERS@@

// ---------------------------------------------------------------- wrapper
function placeholder(type) {
  const label = str(type || 'unknown').slice(0, 24) || 'unknown';
  const w = Math.max(200, textW(label, 20) + 40);
  const body = rect(3, 3, w - 6, 94, { rx: 14, fill: '#f4f2f8', stroke: '#a8a2ba', sw: 3, da: '8 6' }) +
    T(w / 2, 46, label, { size: 20, fill: '#6b6480' }) + T(w / 2, 74, 'picture', { size: 18, weight: 600, fill: '#8f89a3' });
  return { w, h: 100, body, label: `${label} picture` };
}

export function renderVisual(visual, opts = {}) {
  const o = opts && typeof opts === 'object' ? opts : {};
  const maxW = clamp(num(o.maxWidth, 520), 16, 5000), maxH = clamp(num(o.maxHeight, 260), 16, 5000);
  const v = visual && typeof visual === 'object' ? visual : {};
  const type = str(v.type).trim();
  let ctx = makeCtx(), res;
  try {
    const fn = Object.prototype.hasOwnProperty.call(R, type) ? R[type] : null;
    res = fn ? fn(v, ctx) : placeholder(type);
    if (!res || !(res.w > 0) || !(res.h > 0) || typeof res.body !== 'string') throw new Error('bad render');
  } catch (e) {
    ctx = makeCtx();
    res = placeholder(type);
  }
  const w = f(res.w), h = f(res.h);
  const s = Math.min(maxW / w, maxH / h, 1.6);
  const defs = ctx.defs.length ? `<defs>${ctx.defs.join('')}</defs>` : '';
  const label = esc(res.label || `${type || 'math'} picture`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${f(w * s)}" height="${f(h * s)}" role="img" aria-label="${label}" font-family="${FONT}" stroke-linecap="round" stroke-linejoin="round">${defs}${res.body}</svg>`;
}

export const VISUAL_TYPES = Object.keys(R);

// Wizard avatar + NPC art (docs/ART_SPEC.md section 2).
// Chibi wizard drawn as an SVG string: bold outlines, cel shading (clipped shadow + highlight shapes).
// viewBox 0 0 120 160, feet on y≈155. Facings: down | up | left | right; 4-frame walk; 'cast' pose.

const OL = '#2b2140';
const f = (n) => Math.round(n * 10) / 10;
const pt = (p) => `${f(p[0])} ${f(p[1])}`;

/** Smooth closed Catmull-Rom path through points; [x, y, 1] is a sharp corner. */
function blob(pts) {
  const n = pts.length;
  const g = (i) => pts[(i + n) % n];
  let d = `M${pt(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1 = p1[2] ? p1 : [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = p2[2] ? p2 : [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d + 'Z';
}
const ell = (cx, cy, rx, ry = rx) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
const mx = (pts) => pts.map((p) => [120 - p[0], p[1], p[2]]);
function starD(cx, cy, R, r = R * 0.45, n = 5, rot = 0) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot - 90) * Math.PI) / 180 + (i * Math.PI) / n, rr = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + f(cx + rr * Math.cos(a)) + ' ' + f(cy + rr * Math.sin(a));
  }
  return d + 'Z';
}
const sparkD = (cx, cy, R) => { const k = R * 0.22; return `M${f(cx)} ${f(cy - R)}Q${f(cx + k)} ${f(cy - k)} ${f(cx + R)} ${f(cy)}Q${f(cx + k)} ${f(cy + k)} ${f(cx)} ${f(cy + R)}Q${f(cx - k)} ${f(cy + k)} ${f(cx - R)} ${f(cy)}Q${f(cx - k)} ${f(cy - k)} ${f(cx)} ${f(cy - R)}Z`; };

// ---------------------------------------------------------------- colour helpers
function hsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2;
  let h = 0, s = 0;
  if (M !== m) {
    const d = M - m;
    s = l > 0.5 ? d / (2 - M - m) : d / (M + m);
    h = (M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  }
  return [h, s, l];
}
function hex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}
function dark(c, k = 0.14) {
  const [h, s, l] = hsl(c);
  const toward = 265, dh = ((toward - h + 540) % 360) - 180;
  return hex(h + dh * 0.12, s + 0.06, l - k);
}
function lite(c, k = 0.12) { const [h, s, l] = hsl(c); return hex(h, s, l + k * (1 - l) * 1.6); }

// ---------------------------------------------------------------- options
export const WIZARD_OPTIONS = {
  skin: ['#ffe4d2', '#f7cba6', '#e6aa7f', '#c9865a', '#9a6440', '#6e4430'],
  hairColor: ['#5a3a2a', '#433b5c', '#f5cc55', '#e8743d', '#9b6a45', '#e6e9f2', '#ff8fc8', '#56b2f2'],
  robe: ['#7b5cff', '#3f86ff', '#1fb5a5', '#4dbd4f', '#ea4a52', '#ff9636', '#ff6fb3', '#f2b233', '#39437a', '#eef0fb'],
  hairStyles: ['Short', 'Spiky', 'Long', 'Pigtails', 'Curly', 'Braid'],
  hatStyles: ['Pointy', 'Floppy', 'Star Cap', 'Hood', 'Circlet'],
};
const pick = (arr, i) => arr[((Number(i) || 0) % arr.length + arr.length) % arr.length];

// ---------------------------------------------------------------- drawing primitives
let uidBase = '', uidN = 0;
const uid = () => uidBase + (uidN++).toString(36);

/** Filled shape with outer outline and clipped cel-shading shapes [[d, colour], ...]. */
function S(d, fill, shades, sw = 3) {
  if (!shades || !shades.length) return `<path d="${d}" fill="${fill}" stroke-width="${sw * 2}"/>`;
  const id = uid();
  return `<path id="${id}p" d="${d}" fill="${fill}" stroke-width="${sw * 2}"/><clipPath id="${id}"><use href="#${id}p"/></clipPath><g clip-path="url(#${id})" stroke="none">${shades.map(([sd, c]) => `<path d="${sd}" fill="${c}"/>`).join('')}</g>`;
}
const Ln = (d, sw = 2, c = OL) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${sw}"/>`;
const F = (d, c) => `<path d="${d}" fill="${c}" stroke="none"/>`;
const G = (tf, s) => (tf ? `<g transform="${tf}">${s}</g>` : s);

// ---------------------------------------------------------------- hair
// Front caps: top of head + fringe (drawn over the face).
const CAP_TOP = [[31, 56], [34, 40], [46, 30], [60, 27], [74, 30], [86, 40], [89, 56]];
const HAIR_FRONT = {
  0: [...CAP_TOP, [88, 71, 1], [83, 59], [78, 51], [72, 56, 1], [66, 48], [60, 55, 1], [54, 48], [48, 56, 1], [42, 51], [37, 59], [32, 71, 1]],
  1: [[30, 54], [24, 44, 1], [34, 38], [38, 24, 1], [50, 29], [60, 19, 1], [70, 29], [82, 24, 1], [86, 38], [96, 44, 1], [90, 55], [92, 70, 1], [84, 59], [78, 58, 1], [73, 49], [66, 60, 1], [60, 49], [54, 60, 1], [47, 49], [42, 58, 1], [36, 59], [28, 70, 1]],
  2: [...CAP_TOP, [91, 80], [90, 100, 1], [83, 92], [81, 68], [77, 53], [66, 47], [62, 53, 1], [57, 46], [44, 50], [40, 67], [38, 92], [30, 100, 1], [29, 80]],
  3: [...CAP_TOP, [88, 66, 1], [82, 54], [70, 50], [58, 58, 1], [51, 50], [40, 54], [32, 66, 1]],
  4: [[29, 58], [30, 42], [42, 30], [60, 25], [78, 30], [90, 42], [91, 58], [91, 72], [85, 69], [83, 59], [77, 55], [72, 58], [66, 51], [60, 57], [54, 51], [48, 57], [43, 55], [37, 59], [35, 69], [29, 72]],
  5: [...CAP_TOP, [89, 68, 1], [84, 56], [76, 48], [64, 52], [50, 56], [40, 58], [33, 67, 1]],
};
// Back-of-head covers (facing up).
const BACK_TOP = [[60, 27], [78, 31], [89, 44], [91, 60]];
const BACK_TOPL = [[31, 60], [32, 44], [42, 31]];
const HAIR_BACK = {
  0: [...BACK_TOP, [89, 76], [84, 82], [76, 87, 1], [68, 82], [60, 89, 1], [52, 82], [44, 87, 1], [36, 82], [31, 76], ...BACK_TOPL],
  1: [[60, 18, 1], [70, 28], [84, 24, 1], [86, 38], [97, 44, 1], [91, 58], [96, 72, 1], [86, 78], [80, 90, 1], [70, 83], [60, 92, 1], [50, 83], [40, 90, 1], [34, 78], [24, 72, 1], [29, 58], [23, 44, 1], [34, 38], [36, 24, 1], [50, 28]],
  2: [...BACK_TOP, [94, 84], [92, 108, 1], [80, 104], [70, 110, 1], [60, 105], [50, 110, 1], [40, 104], [28, 108, 1], [26, 84], ...BACK_TOPL],
  3: null, 4: null, 5: null,
};
HAIR_BACK[3] = HAIR_BACK[0];
HAIR_BACK[5] = HAIR_BACK[0];
// Side caps (facing right): top + back of head, fringe at front.
const SIDE_TOP = [[31, 54], [36, 40], [48, 30], [62, 27], [76, 30], [86, 40], [90, 52], [88, 63, 1], [84, 55], [78, 50], [72, 55, 1], [66, 48], [58, 52], [52, 58]];
const HAIR_SIDE = {
  0: [...SIDE_TOP, [50, 72], [46, 83, 1], [38, 80], [33, 70]],
  1: [[26, 70, 1], [32, 60], [23, 48, 1], [36, 42], [34, 26, 1], [50, 30], [60, 19, 1], [70, 29], [84, 28, 1], [86, 41], [95, 49, 1], [89, 59], [84, 56], [80, 52], [74, 59, 1], [68, 50], [60, 54], [52, 60], [50, 72], [44, 84, 1], [38, 77]],
  2: [...SIDE_TOP, [50, 74], [50, 94], [46, 106, 1], [38, 104, 1], [30, 92], [28, 72]],
  4: [[34, 74], [28, 66], [29, 54], [32, 42], [42, 32], [56, 26], [70, 27], [82, 32], [90, 42], [92, 54], [88, 64], [84, 58], [78, 55], [74, 58], [68, 52], [60, 56], [54, 60], [52, 68], [50, 78], [44, 84], [38, 82]],
};
HAIR_SIDE[3] = HAIR_SIDE[0];
HAIR_SIDE[5] = HAIR_SIDE[0];

function curlyCloud(cx, cy, r0, r1, a0, a1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180, r = i % 2 ? r1 : r0;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}
function braid(x0, y0, x1, y1, c, cS, tie) {
  let s = '';
  const n = 4;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, r = 6.2 - i * 0.5;
    s += S(ell(x, y, r, r * 1.15), c, [[ell(x + r * 0.6, y + r * 0.5, r, r), cS]], 2.2);
  }
  s += S(ell(x1, y1 + 8, 3, 2.4), tie, null, 1.8);
  s += S(blob([[x1 - 3, y1 + 10], [x1 + 3, y1 + 10], [x1 + 4, y1 + 17, 1], [x1, y1 + 15], [x1 - 4, y1 + 17, 1]]), c, null, 1.8);
  return s;
}
function hairShades(P, side) {
  return [
    [side ? 'M20 60C30 80 40 90 60 96V120H0V60Z' : 'M74 16C92 36 97 70 94 120H120V16Z', P.hairS],
    [side ? 'M44 42C52 33 64 30 74 32L73 36C63 35 54 38 47 45Z' : 'M37 50C39 40 47 33 57 31L59 35C50 37 44 42 41 51Z', P.hairL],
  ];
}

// ---------------------------------------------------------------- hats (front / back / side)
function hatFront(style, P, back) {
  const h = P.hat, hS = P.hatS, hL = P.hatL;
  const emb = back ? '' : S(starD(60, 36.5, 5.2), '#fff4b0', null, 1.5);
  if (style === 0) {
    const d = back ? 'M82 44C76 32 70 20 62 12C56 6 46 2 36 6C42 8 48 12 50 20C46 30 41 38 38 44Z' : 'M38 44C44 32 50 20 58 12C64 6 74 2 84 6C78 8 72 12 70 20C74 30 79 38 82 44Z';
    return S(d, h, [[back ? 'M0 0H48C52 20 56 34 58 50H0Z' : 'M64 0C70 14 72 30 70 50H120V0Z', hS], ['M20 33Q60 39 100 33V50H20Z', P.trim], [back ? 'M74 38C70 28 64 18 58 13L56 15C62 22 67 30 70 39Z' : 'M45 38C49 28 55 18 61 13L63 15C57 22 52 30 49 39Z', hL]])
      + S(ell(60, 46, 38, 7.5), h, [['M10 45Q60 58 110 45V60H10Z', hS], [ell(56, 43.5, 26, 3), hL]]) + emb;
  }
  if (style === 1) {
    const d = back ? 'M80 44C80 28 72 14 56 12C40 10 28 18 21 32C27 30 34 29 39 32C38 37 38 41 38 44Z' : 'M40 44C40 28 48 14 64 12C80 10 92 18 99 32C93 30 86 29 81 32C82 37 82 41 82 44Z';
    const tip = back ? [21, 33] : [99, 33];
    return S(d, h, [[back ? 'M0 0H44C48 20 50 34 50 50H0Z' : 'M70 10C74 24 74 36 72 50H120V0Z', hS], ['M20 35Q60 41 100 35V50H20Z', P.trim]])
      + S(ell(tip[0], tip[1] + 2, 4.5), P.trim, [[ell(tip[0] + 2, tip[1] + 4, 4), P.trimS]], 2)
      + (back ? '' : S('M46 22L55 20L56 28L47 30Z', hL, null, 1.5) + Ln('M48 23.5L53 22.5M48.5 27L53.5 26', 1, OL))
      + S('M16 48C22 40 42 38 60 38C78 38 98 40 104 48C100 54 80 56 60 56C40 56 20 54 16 48Z', h, [['M0 47Q60 60 120 47V60H0Z', hS], [ell(58, 44.5, 34, 3.2), hL]]);
  }
  if (style === 2) {
    return S('M34 50C32 30 44 16 60 16C76 16 88 30 86 50Z', h, [['M66 10C76 20 78 36 76 54H120V0Z', hS], ['M41 40C41 30 47 23 55 20L57 23C50 26 46 32 45 40Z', hL]])
      + S('M30 44Q60 37 90 44L91 55Q60 48 29 55Z', hL, [['M20 51Q60 44 100 51V60H20Z', h]], 3)
      + S(starD(60, 15, 10, 5, 5, back ? 8 : -8), '#ffd84a', [[back ? 'M40 20L60 16L60 30Z' : 'M62 16L80 20L60 30Z', '#f2a93b']], 2.2);
  }
  if (style === 3) {
    if (back) return '';
    return S('M29 62C28 42 42 29 60 29C78 29 92 42 91 62C88 48 76 39 60 39C44 39 32 48 29 62Z', hL, [['M60 20C76 30 90 40 96 64H120V20Z', h]], 2.6);
  }
  // circlet
  if (back) return S('M31 51Q60 45 89 51L89 56Q60 50 31 56Z', '#ffd35a', null, 2) + S('M60 46L66 42L66 54L60 50L54 54L54 42Z', P.trim, null, 1.6);
  return S('M31 49Q60 57 89 49L89 54Q60 62 31 54Z', '#ffd35a', [['M20 53Q60 61 100 53V60H20Z', '#e8a93a']], 2)
    + S('M60 51L65 57L60 63L55 57Z', P.hat, [['M60 51L65 57L60 63Z', P.hatS]], 1.8) + F(ell(58.6, 55.5, 1.2), '#fff');
}
function hoodBack(P, facing) {
  if (facing === 'down') return S('M60 21C87 21 99 42 98 64C97 80 93 90 85 97H35C27 90 23 80 22 64C21 42 33 21 60 21Z', P.hat, [['M66 16C86 26 94 50 90 100H120V16Z', P.hatS]]);
  if (facing === 'up') return '';
  return S('M85 40C81 26 67 20 55 22C37 24 27 40 28 58C20 64 15 72 11 80C21 79 28 80 32 82C37 91 46 97 58 97H78C82 80 87 56 85 40Z', P.hat, [['M0 70Q30 84 60 100H0Z', P.hatS]]);
}
function hoodOver(P, facing) {
  if (facing === 'up') {
    return S('M30 86Q60 96 90 86L96 102Q60 114 24 102Z', P.hat, [['M60 80V120H120V80Z', P.hatS], ['M20 97Q60 108 100 97V120H20Z', P.trim]])
      + S('M60 21C86 21 97 41 96 61C95 75 88 85 76 92L60 102L44 92C32 85 25 75 24 61C23 41 34 21 60 21Z', P.hat, [['M64 14C86 30 94 60 72 110H120V14Z', P.hatS], ['M36 44C40 34 48 28 58 26L59 30C50 32 43 37 40 46Z', P.hatL]])
      + Ln('M60 30C62 54 62 78 60 100', 1.8, P.hatS) + S(starD(60, 70, 5), P.trim, null, 1.5);
  }
  return S('M87 50C85 34 73 26 58 26C40 26 30 40 30 58C30 72 36 86 48 95L57 95C49 83 47 67 53 56C61 46 75 42 87 50Z', P.hatL, [['M20 70Q40 90 60 100H0Z', P.hat]], 2.6);
}
function hatSide(style, P) {
  const h = P.hat, hS = P.hatS, hL = P.hatL;
  if (style === 0) {
    return S('M40 44C41 30 39 18 33 10C29 5 21 4 15 10C25 9 34 12 42 18C58 26 72 34 82 44Z', h, [['M44 20C60 28 72 36 80 50H120V0Z', hS], ['M20 34Q60 40 100 32V50H20Z', P.trim], ['M36 16C40 24 43 32 44 40L47 40C46 31 43 23 39 15Z', hL]])
      + S(ell(62, 46, 36, 7), h, [['M10 45Q60 57 114 45V60H10Z', hS], [ell(58, 43.5, 24, 2.8), hL]]) + S(starD(74, 38, 4.6), '#fff4b0', null, 1.4);
  }
  if (style === 1) {
    return S('M82 44C84 28 74 14 58 14C44 14 30 20 20 34C28 32 34 32 40 36C40 40 40 42 40 44Z', h, [['M62 12C74 20 78 34 76 50H120V0Z', hS], ['M20 35Q60 41 100 35V50H20Z', P.trim]])
      + S(ell(20, 36, 4.5), P.trim, [[ell(22, 38, 4), P.trimS]], 2)
      + S('M18 48C24 40 44 38 62 38C80 38 100 40 106 48C102 54 82 56 62 56C42 56 22 54 18 48Z', h, [['M0 47Q60 60 120 47V60H0Z', hS], [ell(60, 44.5, 34, 3.2), hL]]);
  }
  if (style === 2) {
    return S('M36 50C34 30 46 16 62 16C78 16 90 30 88 50Z', h, [['M68 10C78 20 80 36 78 54H120V0Z', hS], ['M43 40C43 30 49 23 57 20L59 23C52 26 48 32 47 40Z', hL]])
      + S('M32 44Q62 37 92 44L93 55Q62 48 31 55Z', hL, [['M20 51Q60 44 100 51V60H20Z', h]], 3)
      + S(starD(56, 15, 10, 5, 5, -14), '#ffd84a', [['M58 16L76 20L56 30Z', '#f2a93b']], 2.2);
  }
  if (style === 3) return '';
  return S('M33 50Q60 56 89 51L89 56Q60 62 33 55Z', '#ffd35a', null, 2) + S('M87 51L91 56L87 62L83 56Z', P.hat, null, 1.6);
}

// ---------------------------------------------------------------- body parts
function sleeve(sx, sy, rot, P, hand = true) {
  const d = `M${sx - 6} ${sy - 3}C${sx - 8} ${sy + 8} ${sx - 11} ${sy + 18} ${sx - 11.5} ${sy + 26}Q${sx} ${sy + 30} ${sx + 11.5} ${sy + 26}C${sx + 10} ${sy + 16} ${sx + 8} ${sy + 6} ${sx + 6} ${sy - 3}Z`;
  const s = (hand ? S(ell(sx, sy + 30, 5.6, 5.4), P.skin, [[ell(sx + 3, sy + 32, 5, 5), P.skinS]], 2.6) : '')
    + S(d, P.robe, [[`M${sx + 3} ${sy - 6}C${sx + 6} ${sy + 8} ${sx + 6} ${sy + 18} ${sx + 4} ${sy + 34}H${sx + 20}V${sy - 6}Z`, P.robeS], [`M${sx - 16} ${sy + 21}Q${sx} ${sy + 26} ${sx + 16} ${sy + 21}V${sy + 36}H${sx - 16}Z`, P.trim]], 2.6);
  return G(rot ? `rotate(${f(rot)} ${sx} ${sy})` : '', s);
}
const FOOT_FRONT = (x, y, P) => S(`M${x - 8} ${y + 1}C${x - 8} ${y - 7} ${x + 8} ${y - 7} ${x + 8} ${y + 1}C${x + 8} ${y + 6} ${x - 8} ${y + 6} ${x - 8} ${y + 1}Z`, P.boot, [[ell(x + 1, y + 5, 10, 4), P.bootS], [ell(x - 3, y - 2.5, 3, 1.6), P.bootL]], 2.8);
const FOOT_SIDE = (x, y, P, c) => S(`M${x - 7} ${y + 3}C${x - 8} ${y - 5} ${x - 2} ${y - 7} ${x + 2} ${y - 6}C${x + 6} ${y - 5} ${x + 11} ${y - 1} ${x + 11} ${y + 3}C${x + 11} ${y + 6} ${x - 7} ${y + 6} ${x - 7} ${y + 3}Z`, c || P.boot, [[`M${x - 10} ${y + 3}H${x + 14}V${y + 10}H${x - 10}Z`, P.bootS], [ell(x + 1, y - 3, 3, 1.4), P.bootL]], 2.8);

const ROBE_FRONT = 'M45 84C41 100 33 124 29 143C38 149 50 150 60 148C70 150 82 149 91 143C87 124 79 100 75 84Z';
const ROBE_SIDE = 'M47 84C43 100 36 124 33 143C42 149 54 150 63 148C72 150 81 149 89 143C86 124 80 100 74 84Z';
function robe(P, view, acc) {
  const side = view === 'side';
  const sh = [
    [side ? 'M68 80C77 100 83 124 85 150H120V80Z' : 'M67 80C77 100 83 124 85 150H120V80Z', P.robeS],
    [side ? 'M50 88C46 102 42 118 39 136L43 137C46 120 49 104 53 88Z' : 'M48 88C44 102 40 118 36 136L40 137C43 120 47 104 51 88Z', P.robeL],
  ];
  if (view === 'front') sh.push(['M56.5 88H63.5V150H56.5Z', P.trim], ['M61.5 88H63.5V150H61.5Z', P.trimS]);
  if (side) sh.push(['M70 86L76 86L85 150L79 150Z', P.trim]);
  sh.push(['M10 138C40 145 50 145 60 143C70 145 80 145 110 138V160H10Z', P.trim], ['M70 143C80 145 90 142 110 138V160H70Z', P.trimS]);
  sh.push(['M10 103Q60 111 110 103V110Q60 118 10 110Z', P.belt]);
  if (acc.stars) {
    const spots = view === 'back' ? [[44, 124], [62, 96], [74, 130], [50, 138], [80, 118], [56, 120]] : view === 'side' ? [[50, 124], [58, 96], [66, 132], [44, 136], [62, 118]] : [[44, 124], [49, 96], [74, 128], [70, 96], [50, 138], [80, 116]];
    for (const [x, y] of spots) sh.push([starD(x, y, 3.6), P.trim]);
  }
  let s = S(side ? ROBE_SIDE : ROBE_FRONT, P.robe, sh);
  s += S(view === 'front' ? 'M57 106H63V113H57Z' : side ? 'M72 107H77V114H72Z' : 'M52 105H56V112H52Z', '#ffd35a', null, 1.4);
  if (view === 'front') s += S('M46 85Q60 91 74 85L67 98L60 93L53 98Z', P.trim, [['M60 86V100H80V86Z', P.trimS]], 2);
  if (acc.leaf && view !== 'back') s += leafMark(view === 'side' ? 70 : 47, 96, P);
  return s;
}
function leafMark(x, y, P, s = 1) {
  return S(`M${x} ${y + 6 * s}C${x - 6 * s} ${y + 2 * s} ${x - 5 * s} ${y - 6 * s} ${x + 5 * s} ${y - 8 * s}C${x + 7 * s} ${y - 1 * s} ${x + 5 * s} ${y + 5 * s} ${x} ${y + 6 * s}Z`, '#58c85a', [[`M${x + 6 * s} ${y - 8 * s}L${x - 1 * s} ${y + 8 * s}H${x + 12 * s}Z`, '#3a9a4a']], 1.6)
    + Ln(`M${x} ${y + 6 * s}Q${x + 1 * s} ${y - 1 * s} ${x + 4 * s} ${y - 6 * s}`, 1.1, OL);
}

// ---------------------------------------------------------------- faces
function eye(x, y, rx, ry, P) {
  return F(ell(x, y, rx, ry), OL) + F(ell(x, y + ry * 0.36, rx * 0.72, ry * 0.58), P.iris) + F(ell(x, y + ry * 0.5, rx * 0.4, ry * 0.3), lite(P.iris, 0.25))
    + F(ell(x - rx * 0.32, y - ry * 0.34, rx * 0.44), '#fff') + F(ell(x + rx * 0.38, y + ry * 0.42, rx * 0.2), '#fff');
}
function faceFront(P, acc) {
  let s = eye(48.5, 65, 5.9, 7.6, P) + eye(71.5, 65, 5.9, 7.6, P);
  s += F(ell(42.5, 73, 4.6, 2.6), 'rgba(255,110,140,.45)') + F(ell(77.5, 73, 4.6, 2.6), 'rgba(255,110,140,.45)');
  s += acc.beard ? '' : `<path d="M55.5 74.5Q60 81.5 64.5 74.5Z" fill="#c9405e" stroke="${OL}" stroke-width="1.8" stroke-linejoin="round"/>`;
  return s;
}
function faceSide(P, acc) {
  let s = eye(66, 65, 5.7, 7.6, P) + eye(81.5, 65, 3.9, 7.1, P);
  s += F(ell(61, 73, 4.2, 2.4), 'rgba(255,110,140,.45)');
  s += acc.beard ? '' : `<path d="M73 75Q77.5 81 81 74.5Z" fill="#c9405e" stroke="${OL}" stroke-width="1.8" stroke-linejoin="round"/>`;
  return s;
}

// ---------------------------------------------------------------- accessories
function beard(P, view, c, long) {
  const cS = dark(c, 0.12);
  if (view === 'front') {
    const d = long ? 'M34 64C34 90 46 110 60 118C74 110 86 90 86 64C82 76 72 80 60 80C48 80 38 76 34 64Z' : 'M35 64C35 80 46 92 60 94C74 92 85 80 85 64C82 74 72 79 60 79C48 79 38 74 35 64Z';
    return S(d, c, [[long ? 'M66 78C74 90 72 106 62 120H120V70Z' : 'M68 78C76 84 76 90 66 96H120V70Z', cS]], 2.6)
      + S('M50 74C54 70 58 71 60 73C62 71 66 70 70 74C66 78 62 77 60 76C58 77 54 78 50 74Z', lite(c, 0.1), null, 1.8);
  }
  if (view === 'side') {
    const d = long ? 'M52 68C50 90 58 110 72 116C82 106 88 90 88 66C84 76 78 80 70 80C62 80 56 76 52 68Z' : 'M52 68C52 82 60 92 72 93C82 90 87 80 88 66C84 76 78 80 70 80C62 80 56 76 52 68Z';
    return S(d, c, [[long ? 'M78 80C84 94 80 106 72 118H120V70Z' : 'M78 80C84 86 82 90 74 96H120V70Z', cS]], 2.6)
      + S('M70 74C74 70 80 71 84 73C82 77 76 78 70 74Z', lite(c, 0.1), null, 1.8);
  }
  return '';
}
function glasses(view) {
  const lens = 'rgba(210,235,255,.35)';
  if (view === 'front') return `<g fill="${lens}" stroke="${OL}" stroke-width="2.2">${`<path d="${ell(49, 65, 8.2, 7.6)}"/><path d="${ell(71, 65, 8.2, 7.6)}"/>`}</g>` + Ln('M57 64Q60 62 63 64M41 63L33 60M79 63L87 60', 2.2);
  if (view === 'side') return `<g fill="${lens}" stroke="${OL}" stroke-width="2.2"><path d="${ell(66, 65, 8, 7.6)}"/><path d="${ell(82, 65, 4.6, 7.4)}"/></g>` + Ln('M74 64L77.5 64M58 63L50 61', 2.2);
  return Ln('M32 62L40 62M80 62L88 62', 2);
}
function apron(view) {
  const c = '#f1d9a8', cS = '#d8b47a';
  if (view === 'front') return S('M44 101H76L82 144Q60 149 38 144Z', c, [['M66 96L74 96L90 150H120V96Z', cS]], 2.4) + S('M52 118H68V130Q60 133 52 130Z', cS, null, 1.6) + Ln('M60 118V131', 1.4) + Ln('M46 101L48 86M74 101L72 86', 2.4, c);
  if (view === 'side') return S('M68 101H80L88 143Q80 148 70 146Z', c, [['M80 96L90 150H120V96Z', cS]], 2.4);
  return Ln('M47 88L73 110M73 88L47 110', 3.2, c) + S('M54 103L60 107L66 103L66 112L60 108L54 112Z', c, null, 1.6);
}
function satchel(view) {
  const c = '#9a5b34', cS = '#74402a', cL = '#c07a48';
  if (view === 'front') return Ln('M47 88L82 124', 7, OL) + Ln('M47 88L82 124', 3.6, cL) + S('M74 120H94C95 128 94 134 92 138H76C74 134 73 128 74 120Z', c, [['M86 116V140H100V116Z', cS]], 2.4) + S('M73 119H95V128Q84 131 73 128Z', cL, null, 2) + S(ell(84, 128, 2.4), '#ffd35a', null, 1.4);
  if (view === 'side') return S('M46 118H64C65 126 64 132 62 136H48C46 132 45 126 46 118Z', c, [['M56 114V140H70V114Z', cS]], 2.4) + S('M45 117H65V126Q55 129 45 126Z', cL, null, 2) + Ln('M55 117L64 90', 5.5, OL) + Ln('M55 117L64 90', 2.6, cL);
  return Ln('M73 88L38 124', 7, OL) + Ln('M73 88L38 124', 3.6, cL) + S('M26 120H44C45 128 44 134 42 138H28C26 134 25 128 26 120Z', c, [['M36 116V140H50V116Z', cS]], 2.4);
}
function scarf(view, c) {
  const cS = dark(c, 0.14);
  if (view === 'front') return S('M72 88L80 90L82 110L74 112Z', c, [['M78 86L88 116H100V86Z', cS]], 2.4) + S('M41 83Q60 93 79 83L80 91Q60 101 40 91Z', c, [['M20 89Q60 99 100 89V104H20Z', cS]], 2.6);
  if (view === 'side') return S('M48 88L30 96L28 106L50 94Z', c, [['M20 100H60V110H20Z', cS]], 2.4) + S('M44 84Q62 92 78 84L78 92Q62 100 44 92Z', c, [['M20 89Q60 99 100 89V104H20Z', cS]], 2.6);
  return S('M52 90L46 110L54 112L60 92Z', c, null, 2.4) + S('M41 83Q60 91 79 83L80 91Q60 99 40 91Z', c, [['M20 89Q60 97 100 89V104H20Z', cS]], 2.6);
}
function nurseCap(view) {
  const c = '#ffffff', cS = '#dcd6ee';
  if (view === 'up') return S('M36 46C36 32 46 25 60 25C74 25 84 32 84 46Q60 40 36 46Z', c, [['M66 20C76 26 80 36 80 50H120V20Z', cS]], 2.6);
  const x = view === 'side' ? 3 : 0;
  return S(`M${38 + x} 45C${38 + x} 32 ${48 + x} 25 ${60 + x} 25C${72 + x} 25 ${82 + x} 32 ${82 + x} 45Q${60 + x} 38 ${38 + x} 45Z`, c, [[`M${66 + x} 20C${76 + x} 26 ${80 + x} 36 ${80 + x} 50H120V20Z`, cS]], 2.6)
    + S(`M${38 + x} 45Q${60 + x} 38 ${82 + x} 45L${82 + x} 49Q${60 + x} 42 ${38 + x} 49Z`, '#58c85a', null, 2) + leafMark(view === 'side' ? 66 : 60, 34, null, 0.8);
}

// ---------------------------------------------------------------- the figure
function resolve(look, acc) {
  const O = WIZARD_OPTIONS;
  const skin = acc.skinHex || pick(O.skin, look.skin), hair = acc.hairHex || pick(O.hairColor, look.hairColor);
  const robeC = acc.robeHex || pick(O.robe, look.robe), hatC = acc.hatHex || pick(O.robe, look.hatColor ?? look.robe);
  const trim = acc.trim || (hsl(robeC)[0] > 35 && hsl(robeC)[0] < 60 && hsl(robeC)[1] > 0.6 ? '#fff6d8' : '#ffd35a');
  return {
    skin, skinS: dark(skin, 0.1), hair, hairS: dark(hair, 0.15), hairL: lite(hair, 0.22),
    robe: robeC, robeS: dark(robeC), robeL: lite(robeC, 0.14), hat: hatC, hatS: dark(hatC), hatL: lite(hatC, 0.14),
    trim, trimS: dark(trim, 0.12), belt: acc.belt || dark(robeC, 0.28), boot: acc.boot || '#7a5140', bootS: dark(acc.boot || '#7a5140', 0.12), bootL: lite(acc.boot || '#7a5140', 0.2),
    iris: acc.iris || '#6b4ac8', hairStyle: ((Number(look.hair) || 0) % 6 + 6) % 6, hatStyle: ((Number(look.hat) || 0) % 5 + 5) % 5,
  };
}

function figure(P, facing, frame, cast, acc) {
  const view = facing === 'down' ? 'front' : facing === 'up' ? 'back' : 'side';
  const hs = P.hairStyle, hat = acc.nurse ? -1 : P.hatStyle;
  const bob = cast ? 0 : [0, -2.5, 0, -2.5][frame];
  const sway = cast ? 0 : [0, 1.6, 0, -1.6][frame];
  const hairShade = hairShades(P, view === 'side');
  let s = '';
  // feet (not bobbing)
  if (view === 'side') {
    const fx = cast ? [48, 68] : [[54, 64], [70, 46], [54, 64], [46, 70]][frame];
    const fy = cast ? [0, 0] : [[0, 0], [0, -3], [0, 0], [-3, 0]][frame];
    s += FOOT_SIDE(fx[0], 150 + fy[0], P, P.bootS) + FOOT_SIDE(fx[1], 150 + fy[1], P);
  } else {
    const ly = frame === 1 && !cast ? -3.5 : 0, ry = frame === 3 && !cast ? -3.5 : 0;
    s += FOOT_FRONT(50, 150 + ly, P) + FOOT_FRONT(70, 150 + ry, P);
  }
  let b = '';
  // ---- back layers
  if (view === 'front') {
    if (hs === 2) b += S(blob([[60, 28], [84, 34], [95, 56], [97, 90], [93, 110, 1], [60, 105], [27, 110, 1], [23, 90], [25, 56], [36, 34]]), P.hair, [['M60 60V120H120V60Z', P.hairS]]);
    if (hs === 3) for (const k of [1, -1]) {
      const pts = [[30, 64], [20, 70], [14, 86], [18, 102], [25, 110, 1], [28, 97], [35, 84]];
      b += S(blob(k > 0 ? pts : mx(pts)), P.hair, [[k > 0 ? 'M26 88C24 96 26 104 28 112H40V88Z' : 'M104 80C106 96 104 106 96 112H120V80Z', P.hairS]]) + S(ell(k > 0 ? 30 : 90, 70, 4.2, 3.6), P.trim, null, 2);
    }
    if (hs === 4) b += S(blob(curlyCloud(60, 62, 36, 31, 150, 390, 16)), P.hair, [['M70 20C94 40 100 70 94 110H120V20Z', P.hairS]]);
    if (hat === 3) b += hoodBack(P, 'down');
  } else if (view === 'side') {
    if (hs === 3) b += S(blob([[40, 62], [28, 68], [21, 86], [25, 102], [30, 110, 1], [34, 96], [43, 80]]), P.hair, [['M20 90C24 100 28 106 32 112H0V90Z', P.hairS]]) + S(ell(38, 66, 4.2, 3.6), P.trim, null, 2);
    if (hs === 5) b += braid(38, 80, 34, 104, P.hair, P.hairS, P.trim);
    if (hat === 3) b += hoodBack(P, 'side');
    // far arm (behind robe)
    if (!cast) b += sleeve(58, 92, -[0, 22, 0, -22][frame] * 0.8, P);
    else b += sleeve(56, 92, 18, P);
  }
  // ---- robe + accessories on robe
  let r = robe(P, view, acc);
  if (acc.apron) r += apron(view);
  b += G(sway ? `rotate(${sway} 60 86)` : '', r);
  if (acc.satchel && view !== 'back') b += acc.satchel && view === 'side' ? '' : satchel(view);
  // ---- arms
  let wand = '', castArm = '';
  if (view === 'side') {
    if (acc.satchel) b += satchel('side');
    if (cast) {
      const a = -92, sx = 62, sy = 93, rad = (a * Math.PI) / 180;
      const hx = sx - 30 * Math.sin(rad), hy = sy + 30 * Math.cos(rad);
      const w = castWand(hx, hy, -66);
      castArm = sleeve(sx, sy, a, P, false) + w.hand(P);
      wand = w.top;
    } else b += sleeve(62, 92, [0, 22, 0, -22][frame], P);
  } else {
    const sw = cast ? 0 : [0, 5, 0, -5][frame];
    b += sleeve(46, 91, 13 + sw, P);
    if (cast) {
      const a = -150, sx = 74, sy = 91, rad = (a * Math.PI) / 180;
      const hx = sx - 30 * Math.sin(rad), hy = sy + 30 * Math.cos(rad);
      const w = castWand(hx, hy, -80);
      castArm = sleeve(sx, sy, a, P, false) + w.hand(P);
      wand = w.top;
    } else b += sleeve(74, 91, -13 - sw, P);
  }
  if (acc.scarf) b += scarf(view === 'front' ? 'front' : view === 'side' ? 'side' : 'back', acc.scarf);
  if (acc.satchel && view === 'back') b += satchel('back');
  // ---- head
  const headD = ell(60, 58, 28, 26.5);
  if (view === 'back') {
    b += S(ell(31.5, 63, 4.5, 6), P.skin, null, 2.6) + S(ell(88.5, 63, 4.5, 6), P.skin, null, 2.6);
    b += S(headD, P.skin, [['M76 34C92 48 90 74 70 86H100V30Z', P.skinS]]);
    if (hs === 3) for (const k of [1, -1]) {
      const pts = [[34, 66], [22, 72], [16, 88], [20, 104], [27, 112, 1], [30, 99], [38, 84]];
      b += S(blob(k > 0 ? pts : mx(pts)), P.hair, [[k > 0 ? 'M26 88C24 96 26 104 28 112H40V88Z' : 'M104 80C106 96 104 106 96 112H120V80Z', P.hairS]]);
    }
    const hp = hs === 4 ? blob(curlyCloud(60, 60, 34, 30, -90, 270, 18)) : blob(HAIR_BACK[hs]);
    b += S(hp, P.hair, [['M72 16C92 40 97 70 92 120H120V16Z', P.hairS], ['M33 62Q60 50 87 62L87 67Q60 56 33 67Z', P.hairL]]) + Ln(hs === 2 ? 'M48 72Q46 88 48 104M70 72Q74 88 72 104' : 'M50 70Q48 76 49 82M70 70Q72 76 71 82', 1.6, P.hairS);
    if (hs === 3) b += S(ell(33, 70, 4.2, 3.6), P.trim, null, 2) + S(ell(87, 70, 4.2, 3.6), P.trim, null, 2);
    if (hs === 5) b += braid(60, 86, 60, 112, P.hair, P.hairS, P.trim);
    if (acc.beard) b += '';
    if (acc.glasses) b += glasses('back');
  } else if (view === 'front') {
    b += S(ell(31.5, 63, 4.5, 6), P.skin, [[ell(33, 65, 3, 4), P.skinS]], 2.6) + S(ell(88.5, 63, 4.5, 6), P.skin, [[ell(87, 65, 3, 4), P.skinS]], 2.6);
    b += S(headD, P.skin, [['M78 36C90 50 88 74 70 86H100V30Z', P.skinS], [ell(60, 46, 30, 9), P.skinS]]);
    b += faceFront(P, acc);
    if (acc.beard) b += beard(P, 'front', acc.beard, acc.longBeard);
    b += S(blob(HAIR_FRONT[hs]), P.hair, hairShade);
    if (hs === 5) b += braid(34, 76, 32, 106, P.hair, P.hairS, P.trim);
    if (acc.glasses) b += glasses('front');
  } else {
    b += S(headD, P.skin, [['M46 30C28 44 30 76 48 88H20V30Z', P.skinS], [ell(62, 46, 30, 9), P.skinS]]);
    b += faceSide(P, acc);
    if (acc.beard) b += beard(P, 'side', acc.beard, acc.longBeard);
    b += S(blob(HAIR_SIDE[hs]), P.hair, hairShade);
    if (hat !== 3) b += S(ell(50, 66, 4.4, 6), P.skin, [[ell(52, 68, 3, 4), P.skinS]], 2.6);
    if (acc.glasses) b += glasses('side');
  }
  // ---- hat
  if (hat === -1) b += nurseCap(facing);
  else if (view === 'side') b += hat === 3 ? hoodOver(P, 'side') : hatSide(hat, P);
  else if (view === 'back') b += hat === 3 ? hoodOver(P, 'up') : hatFront(hat, P, true);
  else b += hatFront(hat, P, false);
  if (acc.hatStar && hat === 0) b += S(view === 'side' ? 'M28 12A5 5 0 1 0 34 20A4 4 0 1 1 28 12Z' : 'M56 22A5 5 0 1 0 62 30A4 4 0 1 1 56 22Z', '#fff4b0', null, 1.4);
  s += G(bob ? `translate(0 ${bob})` : '', b + castArm + wand);
  return s;
}

function castWand(hx, hy, ang) {
  const rad = (ang * Math.PI) / 180, L = 30;
  const tx = hx + L * Math.cos(rad), ty = hy + L * Math.sin(rad);
  const bx = hx - 6 * Math.cos(rad), by = hy - 6 * Math.sin(rad);
  const gid = uid();
  const top = `<radialGradient id="${gid}"><stop offset="0" stop-color="#fff7c2" stop-opacity=".95"/><stop offset=".5" stop-color="#ffd84a" stop-opacity=".45"/><stop offset="1" stop-color="#ffd84a" stop-opacity="0"/></radialGradient>`
    + `<circle cx="${f(tx)}" cy="${f(ty)}" r="17" fill="url(#${gid})" stroke="none"/>`
    + S(sparkD(tx, ty, 10), '#fff7c2', [[sparkD(tx + 2, ty + 2, 7), '#ffd84a']], 1.8)
    + S(sparkD(tx - 13, ty + 12, 4.5), '#fff', null, 1.3) + S(sparkD(tx + 11, ty + 13, 3.2), '#fff', null, 1.2) + F(ell(tx + 9, ty - 11, 1.8), '#fff');
  const hand = (P) => Ln(`M${f(bx)} ${f(by)}L${f(tx)} ${f(ty)}`, 7.5, OL) + Ln(`M${f(bx)} ${f(by)}L${f(tx)} ${f(ty)}`, 3.8, '#9a643e')
    + Ln(`M${f(bx + 0.8)} ${f(by - 0.8)}L${f((bx + tx) / 2 + 0.8)} ${f((by + ty) / 2 - 0.8)}`, 1.2, '#c99466')
    + S(ell(hx, hy, 5.6, 5.4), P.skin, [[ell(hx + 3, hy + 2, 5, 5), P.skinS]], 2.6);
  return { top, hand };
}

function render(look, opts, acc) {
  uidBase = 'wz' + Math.random().toString(36).slice(2, 7);
  uidN = 0;
  const facing = ['down', 'up', 'left', 'right'].includes(opts.facing) ? opts.facing : 'down';
  const frame = ((Number(opts.frame) || 0) % 4 + 4) % 4;
  const cast = opts.pose === 'cast';
  const P = resolve(look || {}, acc);
  let body = figure(P, facing === 'left' ? 'right' : facing, frame, cast, acc);
  if (facing === 'left') body = `<g transform="matrix(-1 0 0 1 120 0)">${body}</g>`;
  const sc = Number(opts.scale);
  const size = sc > 0 ? ` width="${f(120 * sc)}" height="${f(160 * sc)}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160"${size}>`
    + `<ellipse cx="60" cy="155" rx="${cast ? 30 : 25}" ry="5" fill="#2b2140" opacity=".18"/>`
    + `<g stroke="#2b2140" paint-order="stroke" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;
}

/** The player's wizard. look: { skin, hair, hairColor, robe, hat, hatColor }; opts: { facing, frame, pose, scale }. */
export function wizardSVG(look = {}, opts = {}) {
  return render(look, opts || {}, {});
}

const NPCS = {
  professor: { look: { skin: 2, hair: 2, hairColor: 5, robe: 8, hat: 0, hatColor: 8 }, acc: { glasses: 1, stars: 1, hatStar: 1, iris: '#3f7fd0' } },
  healer: { look: { skin: 3, hair: 3, hairColor: 3, robe: 9, hat: 0, hatColor: 3 }, acc: { nurse: 1, leaf: 1, trim: '#6fd07a', belt: '#4aa65a', iris: '#3f9a58' } },
  shopkeeper: { look: { skin: 4, hair: 0, hairColor: 0, robe: 3, hat: 1, hatColor: 5 }, acc: { apron: 1, satchel: 1, beard: '#5a3a2a', boot: '#5b3d31', iris: '#5a3a2a' } },
  trainer1: { look: { skin: 5, hair: 1, hairColor: 1, robe: 1, hat: 0, hatColor: 4 }, acc: { scarf: '#ea4a52', iris: '#8a5a2e' } },
  trainer2: { look: { skin: 0, hair: 5, hairColor: 2, robe: 6, hat: 2, hatColor: 2 }, acc: { iris: '#2f9ad0' } },
  trainer3: { look: { skin: 2, hair: 4, hairColor: 4, robe: 5, hat: 3, hatColor: 0 }, acc: { iris: '#7a4a2a' } },
  trainer4: { look: { skin: 3, hair: 2, hairColor: 7, robe: 2, hat: 4, hatColor: 0 }, acc: { scarf: '#7b5cff', iris: '#1f8f86' } },
};

/** Preset NPC looks with small accessories. kind: professor | healer | shopkeeper | trainer1..trainer4. */
export function npcSVG(kind, opts = {}) {
  const n = NPCS[kind] || NPCS.trainer1;
  return render(n.look, opts || {}, n.acc);
}

// Equipment + chest art (docs/ART_SPEC.md section 3). viewBox 0 0 64 64.
// Rarity shows through the frame glow and extra detail (trim, gems, ornaments, sparkles).

const OL = '#2b2140';
const f = (n) => Math.round(n * 10) / 10;
const ell = (cx, cy, rx, ry = rx) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
function starD(cx, cy, R, r = R * 0.45, n = 5, rot = 0) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot - 90) * Math.PI) / 180 + (i * Math.PI) / n, rr = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + f(cx + rr * Math.cos(a)) + ' ' + f(cy + rr * Math.sin(a));
  }
  return d + 'Z';
}
const sparkD = (cx, cy, R) => { const k = R * 0.22; return `M${f(cx)} ${f(cy - R)}Q${f(cx + k)} ${f(cy - k)} ${f(cx + R)} ${f(cy)}Q${f(cx + k)} ${f(cy + k)} ${f(cx)} ${f(cy + R)}Q${f(cx - k)} ${f(cy + k)} ${f(cx - R)} ${f(cy)}Q${f(cx - k)} ${f(cy - k)} ${f(cx)} ${f(cy - R)}Z`; };

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
const dark = (c, k = 0.14) => { const [h, s, l] = hsl(c); const dh = ((265 - h + 540) % 360) - 180; return hex(h + dh * 0.12, s + 0.06, l - k); };
const lite = (c, k = 0.14) => { const [h, s, l] = hsl(c); return hex(h, s, l + k * (1 - l) * 1.6); };

let uidBase = '', uidN = 0;
const uid = () => uidBase + (uidN++).toString(36);
function S(d, fill, shades, sw = 1.6) {
  if (!shades || !shades.length) return `<path d="${d}" fill="${fill}" stroke-width="${f(sw * 2)}"/>`;
  const id = uid();
  return `<path id="${id}p" d="${d}" fill="${fill}" stroke-width="${f(sw * 2)}"/><clipPath id="${id}"><use href="#${id}p"/></clipPath><g clip-path="url(#${id})" stroke="none">${shades.map(([sd, c]) => `<path d="${sd}" fill="${c}"/>`).join('')}</g>`;
}
const Ln = (d, sw = 1.4, c = OL) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${sw}"/>`;
const F = (d, c, op) => `<path d="${d}" fill="${c}" stroke="none"${op ? ` opacity="${op}"` : ''}/>`;

const RARITY = {
  common: { c: '#a3a8b6', lvl: 0 },
  uncommon: { c: '#4cc26a', lvl: 1 },
  rare: { c: '#3f8cff', lvl: 2 },
  epic: { c: '#a55cff', lvl: 3 },
  legendary: { c: '#ffc233', lvl: 4 },
};
const BASES = ['#7b5cff', '#3f86ff', '#ea4a52', '#1fb5a5', '#ff9636', '#4dbd4f', '#ff6fb3', '#39437a'];
const GOLD = '#ffd35a', GOLD_S = '#e3a23a', SILVER = '#d7dbe6', SILVER_S = '#a9aec0';

function gem(cx, cy, r, c) {
  return S(`M${f(cx)} ${f(cy - r)}L${f(cx + r)} ${f(cy)}L${f(cx)} ${f(cy + r)}L${f(cx - r)} ${f(cy)}Z`, lite(c, 0.1), [[`M${f(cx)} ${f(cy - r)}L${f(cx + r)} ${f(cy)}L${f(cx)} ${f(cy + r)}Z`, dark(c, 0.1)]], 1.3)
    + F(ell(cx - r * 0.35, cy - r * 0.3, r * 0.22), '#fff');
}
function orb(cx, cy, r, c) {
  return S(ell(cx, cy, r), c, [[ell(cx + r * 0.4, cy + r * 0.4, r), dark(c, 0.12)]], 1.4) + F(ell(cx - r * 0.35, cy - r * 0.35, r * 0.3), '#fff');
}

// ---------------------------------------------------------------- item drawings (centre ~32, 32)
function wand(v, base, R, lvl) {
  const trim = lvl ? GOLD : SILVER, trimS = lvl ? GOLD_S : SILVER_S;
  const wood = ['#9a643e', '#6e4a8c', '#e9e2d0'][v], woodS = dark(wood, 0.12);
  let s = S('M13 55L16 52L42 26L45 29L19 55L16 58Z', wood, [['M45 29L19 55L16 58L24 58L50 32Z', woodS]], 1.6);
  s += S('M13 55L16 52L23 45L26 48L19 55L16 58Z', dark(base, 0.05), [['M26 48L19 55L16 58L24 58Z', dark(base, 0.2)]], 1.5);
  s += S('M22.5 44.5L27.5 49.5L29 48L24 43Z', trim, null, 1.2);
  if (lvl >= 3) s += S('M30 38L34 42L35.5 40.5L31.5 36.5Z', trim, null, 1.1);
  const c = lvl >= 2 ? R : base;
  if (v === 0) s += S(starD(46, 20, 13, 6, 5, 12), GOLD, [[starD(48, 22, 10, 4.5, 5, 12), GOLD_S]], 1.7) + (lvl >= 2 ? gem(46, 20.5, 4, R) : F(ell(43.5, 17.5, 2), '#fff'));
  if (v === 1) s += S('M40 30L44 26L42 24L38 28Z', trim, null, 1.2) + orb(47, 19, 10, c) + (lvl >= 3 ? Ln('M36 9Q47 4 58 11', 1.6, trim) : '');
  if (v === 2) s += S('M50 8A12 12 0 1 0 55 28A9 9 0 1 1 50 8Z', GOLD, [['M40 30A12 12 0 0 0 55 28L60 34L40 34Z', GOLD_S]], 1.6) + (lvl >= 2 ? gem(44, 19, 3.6, R) : '');
  return s;
}
function hat(v, base, R, lvl) {
  const b = base, bS = dark(b), bL = lite(b);
  const trim = lvl ? GOLD : lite(SILVER, 0.2);
  let s = '';
  if (v === 1) {
    s += S('M18 44C18 28 24 14 36 12C46 11 54 16 58 26C53 24 48 24 45 26C46 34 46 40 46 44Z', b, [['M36 12C44 20 46 34 44 48H64V0Z', bS], ['M10 37Q32 42 54 37V48H10Z', trim]]);
    s += S(ell(58, 28, 3.5), trim, null, 1.3);
    s += S('M5 47C9 41 20 39 32 39C44 39 55 41 59 47C56 52 44 53 32 53C20 53 8 52 5 47Z', b, [['M0 47Q32 58 64 47V60H0Z', bS]]);
  } else if (v === 2) {
    s += S('M13 46C11 28 20 17 32 17C44 17 53 28 51 46Z', b, [['M38 12C46 22 48 36 46 50H64V0Z', bS], ['M19 38C19 29 23 24 29 21L30 24C26 26 23 31 22.5 38Z', bL]]);
    s += S('M10 40Q32 34 54 40L55 50Q32 44 9 50Z', bL, [['M0 46Q32 40 64 46V56H0Z', b]]);
    s += S(starD(32, 16, 8, 4, 5, -6), GOLD, [[starD(34, 18, 6, 3), GOLD_S]], 1.5);
  } else {
    s += S('M16 46C22 32 28 18 34 10C38 5 46 3 52 6C47 7 43 10 42 15C44 26 47 38 50 46Z', b, [['M36 4C42 18 44 32 42 50H64V0Z', bS], ['M10 37Q32 42 54 37V50H10Z', trim], ['M21 40C25 30 29 20 33 13L35 14C31 21 27 31 24 41Z', bL]]);
    s += S(ell(32, 47, 24, 6), b, [['M0 46Q32 58 64 46V60H0Z', bS]]);
  }
  if (lvl >= 2) s += gem(32, v === 2 ? 44 : 41, 4, R);
  if (lvl >= 3) s += S(starD(v === 1 ? 26 : 38, v === 2 ? 29 : 27, 3.4), GOLD, null, 1.1) + S(starD(v === 1 ? 38 : 27, v === 2 ? 26 : 32, 2.6), GOLD, null, 1);
  return s;
}
function robeItem(v, base, R, lvl) {
  const b = base, bS = dark(b), bL = lite(b);
  const trim = lvl ? GOLD : lite(SILVER, 0.2), trimS = lvl ? GOLD_S : SILVER;
  const d = 'M24 10L40 10L50 16L58 34L50 38L46 30L48 56Q32 60 16 56L18 30L14 38L6 34L14 16Z';
  let s = S(d, b, [['M36 8L46 20L48 60H64V8Z', bS], ['M52 30L58 34L50 38Z', bS], ['M0 52Q32 58 64 52V64H0Z', trim], ['M29 10H35V60H29Z', trim], ['M33 10H35V60H33Z', trimS], ['M20 20L22 20L20 52L18 52Z', bL], ['M0 32L6 34L14 38L16 34L6 30Z', trim], ['M64 32L58 34L50 38L48 34L58 30Z', trim]]);
  s += S('M24 10Q32 18 40 10L36 18L32 16L28 18Z', trim, null, 1.2);
  if (v === 0) s += S(starD(23, 36, 4.2), GOLD, null, 1.1);
  if (v === 1) s += S('M22 32A5 5 0 1 0 27 40A4 4 0 1 1 22 32Z', GOLD, null, 1.1);
  if (v === 2) s += S('M22 42C17 39 18 32 26 30C27 36 26 40 22 42Z', '#7fdc6a', null, 1.1);
  if (lvl >= 2) s += gem(32, 30, 3.6, R);
  if (lvl >= 3) s += S(starD(41, 44, 2.8), GOLD, null, 1) + S(starD(40, 24, 2.2), GOLD, null, 1);
  return s;
}
function bootShape(x, y, v, c, cS, cuff, cuffS) {
  const toe = v === 0 ? `C${x + 16} ${y + 14} ${x + 22} ${y + 12} ${x + 24} ${y + 6}C${x + 26} ${y + 10} ${x + 24} ${y + 20} ${x + 12} ${y + 20}` : `C${x + 16} ${y + 12} ${x + 22} ${y + 14} ${x + 22} ${y + 18}C${x + 22} ${y + 21} ${x + 16} ${y + 21} ${x + 12} ${y + 21}`;
  const d = `M${x - 6} ${y - 14}L${x + 6} ${y - 14}L${x + 7} ${y + 8}${toe}L${x - 6} ${y + 21}C${x - 8} ${y + 10} ${x - 7} ${y} ${x - 6} ${y - 14}Z`;
  return S(d, c, [[`M${x + 2} ${y - 16}L${x + 4} ${y + 12}L${x + 30} ${y + 14}V${y + 30}H${x - 10}V${y + 17}H${x + 30}V${y + 30}H${x + 2}Z`, cS], [`M${x - 12} ${y + 17}H${x + 30}V${y + 30}H${x - 12}Z`, dark(c, 0.26)]])
    + S(`M${x - 8} ${y - 17}H${x + 8}V${y - 9}Q${x} ${y - 7} ${x - 8} ${y - 9}Z`, cuff, [[`M${x + 2} ${y - 20}V${y - 5}H${x + 12}V${y - 20}Z`, cuffS]], 1.4);
}
function boots(v, base, R, lvl) {
  const b = v === 2 ? '#8a5a3b' : base, bS = dark(b);
  const cuff = lvl ? GOLD : lite(SILVER, 0.2), cuffS = lvl ? GOLD_S : SILVER;
  let s = bootShape(22, 32, v, dark(b, 0.06), dark(b, 0.18), cuff, cuffS);
  s += bootShape(33, 38, v, b, bS, cuff, cuffS);
  if (v === 1 || lvl >= 3) s += S('M26 26C20 22 18 16 20 12C23 16 26 18 30 19C28 21 27 23 26 26Z', '#fff', [['M24 12L30 24H40V12Z', '#dcd6ee']], 1.2);
  if (lvl >= 2) s += gem(33, 29, 3.4, R);
  return s;
}
function amulet(v, base, R, lvl) {
  const chain = lvl ? GOLD : SILVER, chainS = lvl ? GOLD_S : SILVER_S;
  let s = Ln('M14 10C14 26 22 34 32 38C42 34 50 26 50 10', 4.6, OL) + Ln('M14 10C14 26 22 34 32 38C42 34 50 26 50 10', 2.2, chain);
  for (let i = 0; i < 5; i++) { const t = (i + 0.5) / 5; s += F(ell(14 + 36 * t, 10 + (1 - Math.abs(t - 0.5) * 2) * 24 + 4 * Math.sin(t * Math.PI), 0.9), lite(chain, 0.3)); }
  const c = lvl >= 2 ? R : base;
  s += S(ell(32, 38, 3.5, 2.5), chain, [[ell(33, 39, 3, 2), chainS]], 1.2);
  if (v === 0) s += S(ell(32, 47, 11), chain, [[ell(35, 50, 11), chainS]], 1.6) + orb(32, 47, 7, c);
  if (v === 1) s += S('M32 38C40 44 42 52 32 58C22 52 24 44 32 38Z', chain, [['M32 36L46 60H32Z', chainS]], 1.6) + S('M32 42C37 46 38 51 32 55C26 51 27 46 32 42Z', lite(c, 0.05), [['M32 40L40 58H32Z', dark(c, 0.1)]], 1.2) + F(ell(30, 47, 1.3), '#fff');
  if (v === 2) s += S(starD(32, 49, 12, 6), chain, [[starD(34, 51, 10, 5), chainS]], 1.6) + gem(32, 49, 4.5, c);
  if (lvl >= 3) s += gem(19, 26, 2.6, R) + gem(45, 26, 2.6, R);
  return s;
}
function charm(v, base, R, lvl) {
  const ring = lvl ? GOLD : SILVER, ringS = lvl ? GOLD_S : SILVER_S;
  let s = S(ell(32, 10, 5), 'none', null, 1.6) + Ln(ell(32, 10, 5), 2, ring) + S('M29.5 14H34.5V20H29.5Z', ring, [['M32 12H36V22H32Z', ringS]], 1.2);
  const c = lvl >= 2 ? R : base;
  if (v === 0) {
    const leafC = '#58c85a', leafS = '#3a9a4a';
    for (const [dx, dy] of [[0, -8], [8, 0], [0, 8], [-8, 0]]) s += S(ell(32 + dx, 38 + dy, 7.5), leafC, [[ell(34 + dx, 40 + dy, 7), leafS]], 1.5);
    s += Ln('M32 46Q34 54 38 58', 2.4, leafS) + (lvl >= 2 ? gem(32, 38, 4, R) : F(ell(32, 38, 2.4), lite(leafC, 0.2)));
  }
  if (v === 1) s += S(starD(32, 39, 17, 8), lite(c, 0.05), [[starD(34, 42, 15, 7), dark(c, 0.1)]], 1.7) + F(ell(26, 34, 2.4), '#fff') + (lvl >= 2 ? gem(32, 40, 4, GOLD) : '');
  if (v === 2) s += S('M32 20L42 32L38 54L26 54L22 32Z', lite(c, 0.1), [['M32 20L42 32L38 54L32 54Z', dark(c, 0.08)], ['M22 32L32 36L42 32L32 20Z', lite(c, 0.35)]], 1.6) + Ln('M32 36V54', 1, OL) + F(ell(28, 30, 1.6), '#fff');
  if (lvl >= 3) s += S(sparkD(47, 48, 4), '#fff', null, 1) + S(sparkD(17, 30, 3), '#fff', null, 1);
  return s;
}

const DRAW = { wand, hat, robe: robeItem, boots, amulet, charm };

/** Equipment icon. slot: wand | hat | robe | boots | amulet | charm; rarity: common..legendary; seed picks a variant. */
export function itemSVG(slot, rarity, seed = 0) {
  uidBase = 'it' + Math.random().toString(36).slice(2, 7);
  uidN = 0;
  const r = RARITY[rarity] || RARITY.common;
  const sd = Math.abs(Math.floor(Number(seed) || 0));
  const v = sd % 3, base = BASES[Math.floor(sd / 3) % BASES.length];
  const draw = DRAW[slot] || DRAW.charm;
  const g = uid(), rc = r.c, lvl = r.lvl;
  let bg = `<radialGradient id="${g}" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="${lite(rc, 0.45)}"/><stop offset=".65" stop-color="${lite(rc, 0.2)}"/><stop offset="1" stop-color="${rc}"/></radialGradient>`;
  bg += `<rect x="2.5" y="2.5" width="59" height="59" rx="13" fill="url(#${g})" stroke="${dark(rc, 0.12)}" stroke-width="${lvl >= 3 ? 3 : 2.2}"/>`;
  if (lvl >= 1) bg += `<rect x="5.5" y="5.5" width="53" height="53" rx="10.5" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.2"/>`;
  if (lvl >= 3) {
    let rays = '';
    for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6, a2 = a + 0.13; rays += `M32 32L${f(32 + 40 * Math.cos(a))} ${f(32 + 40 * Math.sin(a))}L${f(32 + 40 * Math.cos(a2))} ${f(32 + 40 * Math.sin(a2))}Z`; }
    const cid = uid();
    bg += `<clipPath id="${cid}"><rect x="4" y="4" width="56" height="56" rx="12"/></clipPath><path d="${rays}" fill="#fff" opacity="${lvl === 4 ? 0.45 : 0.28}" clip-path="url(#${cid})"/>`;
  }
  let fx = '';
  if (lvl >= 2) fx += S(sparkD(9.5, 9.5, 3.4), '#fff', null, 0.9);
  if (lvl >= 3) fx += S(sparkD(55, 54, 3.4), '#fff', null, 0.9);
  if (lvl === 4) fx += S(sparkD(54, 10, 5), '#fff6c2', null, 1) + S(sparkD(10, 53, 4), '#fff6c2', null, 1) + F(ell(48, 5.5, 1.3), '#fff') + F(ell(5.5, 42, 1.3), '#fff')
    + `<rect x="2.5" y="2.5" width="59" height="59" rx="13" fill="none" stroke="${GOLD}" stroke-width="1.2" stroke-dasharray="2 5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg}<g stroke="#2b2140" paint-order="stroke" stroke-linejoin="round" stroke-linecap="round">${draw(v, base, rc, lvl)}${fx}</g></svg>`;
}

/** Treasure chest. kind: 'normal' | 'challenge' (magic chest with rune seals); open: boolean. */
export function chestSVG(kind, open) {
  if (open === 'empty') return emptyChestSVG(kind);
  uidBase = 'ch' + Math.random().toString(36).slice(2, 7);
  uidN = 0;
  const magic = kind === 'challenge';
  const body = magic ? '#5b3fb8' : '#b0703f', bodyS = dark(body, 0.12), bodyL = lite(body, 0.12);
  const band = GOLD, bandS = GOLD_S, rune = '#7ff5ff';
  let s = '';
  const g = uid();
  if (magic) s += `<radialGradient id="${g}"><stop offset="0" stop-color="${open ? '#fff6c2' : '#b58cff'}" stop-opacity=".9"/><stop offset=".6" stop-color="${open ? '#ffd84a' : '#8a5cff'}" stop-opacity=".35"/><stop offset="1" stop-color="#8a5cff" stop-opacity="0"/></radialGradient><circle cx="32" cy="${open ? 26 : 36}" r="30" fill="url(#${g})" stroke="none"/>`;
  else if (open) s += `<radialGradient id="${g}"><stop offset="0" stop-color="#fff6c2" stop-opacity=".9"/><stop offset="1" stop-color="#ffd84a" stop-opacity="0"/></radialGradient><circle cx="32" cy="28" r="22" fill="url(#${g})" stroke="none"/>`;
  s += `<ellipse cx="32" cy="58" rx="24" ry="3.6" fill="${OL}" stroke="none" opacity=".2"/>`;
  if (open) {
    // lid tipped back
    s += S('M9 31L13 12C20 8 44 8 51 12L55 31Z', bodyS, [['M13 12C20 8 44 8 51 12L52 16C44 12 20 12 12 16Z', body], ['M18 10H22V31H18ZM42 10H46V31H42Z', band]], 1.7);
    s += S('M11 30H53V36H11Z', dark(body, 0.3), null, 1.5);
    // treasure light
    s += `<path d="M14 32L6 6H22ZM32 32L26 2H38ZM50 32L42 6H58Z" fill="#fff6c2" stroke="none" opacity=".55"/>`;
    s += S(ell(24, 31, 5, 2.5), GOLD, [[ell(26, 32.5, 5, 2.5), GOLD_S]], 1.2) + S(ell(36, 30.5, 5, 2.5), GOLD, null, 1.2) + (magic ? S('M44 26L48 31L44 36L40 31Z', rune, [['M44 26L48 31L44 36Z', '#3fc6d8']], 1.2) : S(ell(44, 31, 4, 2), GOLD, null, 1.2));
  }
  // base
  s += S('M10 33H54V52Q54 55 51 55H13Q10 55 10 52Z', body, [['M40 30V58H60V30Z', bodyS], ['M12 36H16V52H12Z', bodyL], ['M0 50H64V60H0Z', bodyS], ['M18 30H22V60H18ZM42 30H46V60H42Z', band], ['M45 30H46V60H45ZM21 30H22V60H21Z', bandS]]);
  if (!open) {
    s += S('M10 34V26C10 16 20 12 32 12C44 12 54 16 54 26V34Z', body, [['M40 8C48 14 52 24 52 36H64V8Z', bodyS], ['M14 26C15 20 20 16 28 15L28 18C21 19 17 22 16.5 27Z', bodyL], ['M18 8H22V36H18ZM42 8H46V36H42Z', band], ['M45 8H46V36H45ZM21 8H22V36H21Z', bandS], ['M0 31H64V36H0Z', bodyS]]);
  }
  if (magic) {
    // rune seals
    const runeGlyph = (x, y, r2) => S(ell(x, y, r2), open ? '#6b56a8' : '#2e2466', null, 1.2) + Ln(`M${x} ${f(y - r2 * 0.6)}L${f(x + r2 * 0.5)} ${y}L${x} ${f(y + r2 * 0.6)}L${f(x - r2 * 0.5)} ${y}Z`, 1.1, open ? '#9aa2c8' : rune);
    s += runeGlyph(20, open ? 42 : 24, 3.2) + runeGlyph(44, open ? 42 : 24, 3.2);
    if (!open) s += runeGlyph(20, 45, 3) + runeGlyph(44, 45, 3);
    const ly = open ? 38 : 33;
    s += S(ell(32, ly, 7.5), band, [[ell(34, ly + 2, 7), bandS]], 1.6) + S(ell(32, ly, 5), open ? '#6b56a8' : '#2e2466', null, 1) + S(starD(32, ly, 4.2, 1.8, 4), open ? '#c7c2e0' : rune, null, 0.6);
    if (!open) {
      s += `<path d="M32 ${ly}m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0" fill="none" stroke="${rune}" stroke-width="1.2" stroke-dasharray="2 3" opacity=".9"/>`;
      s += S(sparkD(9, 14, 3.5), '#e9fdff', null, 0.9) + S(sparkD(56, 20, 3), '#e9fdff', null, 0.9) + S(sparkD(54, 48, 2.4), '#e9fdff', null, 0.8);
    } else {
      s += S(sparkD(32, 6, 4.5), '#fff', null, 1) + S(sparkD(12, 20, 3), '#fff', null, 0.9) + S(sparkD(53, 18, 3.4), '#fff', null, 0.9);
    }
  } else {
    const ly = open ? 38 : 33;
    s += S(`M27 ${ly - 5}H37V${ly + 5}Q32 ${ly + 8} 27 ${ly + 5}Z`, band, [[`M33 ${ly - 6}H40V${ly + 8}H33Z`, bandS]], 1.5) + S(ell(32, ly, 1.8), OL, null, 0.5) + F(`M31.2 ${ly}H32.8L33.2 ${ly + 4}H30.8Z`, OL);
    if (open) s += S(sparkD(32, 8, 4), '#fff', null, 1);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#2b2140" paint-order="stroke" stroke-linejoin="round" stroke-linecap="round">${s}</g></svg>`;
}

/** An already-opened chest on the map: lid flipped all the way back, dark and empty inside, no glow. */
function emptyChestSVG(kind) {
  const magic = kind === 'challenge';
  const body = magic ? '#5b3fb8' : '#b0703f', bodyS = dark(body, 0.12), bodyL = lite(body, 0.12);
  const inner = magic ? '#231645' : '#3a2416';
  let s = `<ellipse cx="32" cy="58" rx="24" ry="3.6" fill="${OL}" stroke="none" opacity=".2"/>`;
  // lid swung back behind the box (we see its inside)
  s += S('M12 32L15 7Q32 2 49 7L52 32Z', dark(body, 0.28), [['M15 7Q32 2 49 7L49.6 11Q32 6 14.4 11Z', dark(body, 0.12)], ['M19 5.4H23V32H19ZM41 5.4H45V32H41Z', GOLD_S]], 1.7);
  // open mouth of the box: dark, empty
  s += S('M10 31H54V38H10Z', inner, [['M10 36H54V38H10Z', dark(inner, 0.3)]], 1.6);
  // base
  s += S('M10 36H54V52Q54 55 51 55H13Q10 55 10 52Z', body, [['M40 33V58H60V33Z', bodyS], ['M12 38H16V52H12Z', bodyL], ['M0 50H64V60H0Z', bodyS], ['M18 33H22V60H18ZM42 33H46V60H42Z', GOLD], ['M45 33H46V60H45ZM21 33H22V60H21Z', GOLD_S]]);
  if (magic) {
    const rg = (x, y) => S(ell(x, y, 3), '#6b56a8', null, 1.1);
    s += rg(20, 44) + rg(44, 44) + S(ell(32, 42, 6.5), GOLD, [[ell(33.5, 43.5, 6), GOLD_S]], 1.5) + S(ell(32, 42, 4.2), '#6b56a8', null, 1);
  } else {
    // unlocked padlock hanging open
    s += S('M27 39H37V48Q32 51 27 48Z', GOLD, [['M33 38H40V52H33Z', GOLD_S]], 1.5) + Ln('M29 39V35Q29 31 33 31Q36 31 37 33', 2.2, OL);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#2b2140" paint-order="stroke" stroke-linejoin="round" stroke-linecap="round">${s}</g></svg>`;
}

/**
 * Mental math chest: a teal metal box with a big gold stopwatch on the front and lightning bolts,
 * so it can't be mistaken for the brown (normal) or purple (challenge) chests.
 * state: 'ready' (glowing, ticking) or 'done' (lid open, dim: come back tomorrow). viewBox 0 0 64 64.
 */
export function mentalChestSVG(state = 'ready') {
  uidBase = 'mc' + Math.random().toString(36).slice(2, 7); uidN = 0;
  const done = state === 'done';
  const body = done ? '#5f8f96' : '#1fb5c9', bodyS = dark(body, 0.14), bodyL = lite(body, 0.18), trim = done ? '#9aa6b2' : '#2f3a9a';
  const bolt = (x, y, k, c) => S(`M${x} ${y}l${f(4 * k)} ${f(-8 * k)}h${f(4 * k)}l${f(-2.5 * k)} ${f(5 * k)}h${f(3.5 * k)}l${f(-6.5 * k)} ${f(9 * k)}l${f(1.5 * k)} ${f(-5 * k)}Z`, c, null, 0.9);
  let s = '';
  if (!done) {
    const g = uid();
    s += `<radialGradient id="${g}"><stop offset="0" stop-color="#9ff4ff" stop-opacity=".85"/><stop offset=".6" stop-color="#3fd6ff" stop-opacity=".3"/><stop offset="1" stop-color="#3fd6ff" stop-opacity="0"/></radialGradient><circle cx="32" cy="36" r="31" fill="url(#${g})" stroke="none"/>`;
  }
  s += `<ellipse cx="32" cy="58" rx="24" ry="3.6" fill="${OL}" stroke="none" opacity=".2"/>`;
  if (done) {
    // lid swung open behind, empty inside
    s += S('M12 31L15 9Q32 4 49 9L52 31Z', dark(body, 0.28), [['M19 7H23V31H19ZM41 7H45V31H41Z', trim]], 1.6);
    s += S('M10 30H54V37H10Z', '#1d2a33', null, 1.5);
  }
  // box
  s += S('M9 32H55V52Q55 56 51 56H13Q9 56 9 52Z', body, [['M42 30V58H60V30Z', bodyS], ['M11 35H15V53H11Z', bodyL], ['M0 51H64V60H0Z', bodyS], ['M16 30H20V60H16ZM44 30H48V60H44Z', trim]]);
  if (!done) {
    // domed lid with a clock-tick rim
    s += S('M9 33V25C9 15 19 10 32 10C45 10 55 15 55 25V33Z', body, [['M42 6C50 12 54 22 54 35H64V6Z', bodyS], ['M13 25C14 19 19 15 27 14L27 17C20 18 16 21 15.5 26Z', bodyL], ['M16 6H20V35H16ZM44 6H48V35H44Z', trim], ['M0 30H64V35H0Z', bodyS]]);
    for (let i = 0; i < 7; i++) { const a = Math.PI * (0.15 + 0.7 * i / 6); s += Ln(`M${f(32 - Math.cos(a) * 19)} ${f(26 - Math.sin(a) * 12)}l${f(-Math.cos(a) * 3)} ${f(-Math.sin(a) * 2)}`, 1.4, '#e9fdff'); }
  }
  // stopwatch emblem on the front
  const cy = done ? 44 : 38;
  s += S(`M29.5 ${cy - 13}H34.5V${cy - 10}H29.5Z`, GOLD, [[`M32 ${cy - 13}H34.5V${cy - 10}H32Z`, GOLD_S]], 1.1);
  s += S(ell(32, cy, 10), GOLD, [[ell(34, cy + 2, 10), GOLD_S]], 1.6);
  s += S(ell(32, cy, 7.4), done ? '#dfe6ea' : '#fffbea', null, 1);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; s += Ln(`M${f(32 + Math.sin(a) * 6.2)} ${f(cy - Math.cos(a) * 6.2)}L${f(32 + Math.sin(a) * (i % 3 ? 5.6 : 5))} ${f(cy - Math.cos(a) * (i % 3 ? 5.6 : 5))}`, 0.9); }
  s += Ln(`M32 ${cy}L32 ${cy - 5.2}M32 ${cy}L35.5 ${cy + 2}`, 1.5, done ? '#6b7a86' : '#e0445a');
  s += `<circle cx="32" cy="${cy}" r="1.2" fill="${OL}" stroke="none"/>`;
  if (done) s += Ln(`M26 ${cy}l4 4l8 -8`, 2.4, '#3fae5a');
  else s += bolt(8, 26, 1, '#ffe14a') + bolt(50, 22, 0.9, '#ffe14a') + S(sparkD(56, 44, 3), '#e9fdff', null, 0.9) + S(sparkD(10, 46, 2.5), '#e9fdff', null, 0.8);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#2b2140" paint-order="stroke" stroke-linejoin="round" stroke-linecap="round">${s}</g></svg>`;
}

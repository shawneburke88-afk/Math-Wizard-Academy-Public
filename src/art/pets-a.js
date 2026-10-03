// Extra pets (Hummbit, Equalizard, Funcshroom). Each draw(A, st, Pp, m) paints one species at stage st (1-3) in a 200x200 box, standing on y≈186.
import { OL, blob, mir, poly, ngon, leaf, P, E, Ci, Rr, f, rot, star4d, leafd, boltd, diamd, mark, gem, sparkle, eyes, blush, mouth, nose, ground, line, face, spikes, sector, spokes, wedges, bead, beads, shrink, crown, teeth, eyesOnly, plusd, timesd, bushy, stalk, spiralD, rrd, barTuft } from './creatures.js';

// ---------- shared little helpers
/** Tapered feather / streamer along base -> ctrl -> tip, painted in repeating bands (cols cycle; null = base tone shows). */
function banded(A, base, ctrl, tip, w, T, cols, n, o = {}) {
  const t = bushy(base, ctrl, tip, w, 0.9);
  const cut = (tt, h) => {
    const a = t.at(tt - 0.01), b = t.at(tt + 0.01), p = t.at(tt);
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
    return [[p[0] + nx * h, p[1] + ny * h], [p[0] - nx * h, p[1] - ny * h]];
  };
  let inner = '';
  for (let i = 0; i < n; i++) {
    const c = cols[i % cols.length];
    if (!c) continue;
    const [a1, a2] = cut(i ? i / n : -0.15, w * 2.2), [b1, b2] = cut(i === n - 1 ? 1.15 : (i + 1) / n, w * 2.2);
    inner += `<path d="${poly([a1, b1, b2, a2])}" fill="${c}"/>`;
  }
  A.part(P(t.d), T, { s: o.s ?? 4, sw: o.sw ?? 3, inner: inner + (o.vein ? `<path d="M${f(base[0])} ${f(base[1])}Q${f(ctrl[0])} ${f(ctrl[1])} ${f(tip[0])} ${f(tip[1])}" stroke="${o.vein}" stroke-width="2" fill="none"/>` : '') });
  return t;
}
/** "=" glyph (two rounded bars) centred at x,y, size s, rotated a degrees. */
const eqG = (x, y, s, a, col, sw = 2) => `<g transform="${rot(a, x, y)}"><rect x="${f(x - s)}" y="${f(y - s * 0.62)}" width="${f(s * 2)}" height="${f(s * 0.46)}" rx="${f(s * 0.23)}" fill="${col}" stroke="${OL}" stroke-width="${sw}"/><rect x="${f(x - s)}" y="${f(y + s * 0.16)}" width="${f(s * 2)}" height="${f(s * 0.46)}" rx="${f(s * 0.23)}" fill="${col}" stroke="${OL}" stroke-width="${sw}"/></g>`;
const heartD = (x, y, s) => `M${f(x)} ${f(y + s * 0.8)}C${f(x - s * 1.4)} ${f(y - s * 0.2)} ${f(x - s * 0.8)} ${f(y - s * 1.2)} ${f(x)} ${f(y - s * 0.5)}C${f(x + s * 0.8)} ${f(y - s * 1.2)} ${f(x + s * 1.4)} ${f(y - s * 0.2)} ${f(x)} ${f(y + s * 0.8)}Z`;
const heart = (x, y, s, col, glow) => `${glow ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 2.2)}" fill="#fff" opacity=".35"/>` : ''}<path d="${heartD(x, y, s)}" fill="${col}" stroke="${OL}" stroke-width="${f(Math.max(1.8, s * 0.28))}"/><circle cx="${f(x - s * 0.45)}" cy="${f(y - s * 0.35)}" r="${f(s * 0.2)}" fill="#fff"/>`;
const DIG = { 1: 'M-1.8 -3.2L1 -5V5', 2: 'M-3 -2.4Q-3 -5 0 -5Q3 -5 3 -2.4Q3 0 -3 5H3.4', 3: 'M-3 -4Q0 -6.4 2.8 -3.6Q3.4 -0.6 0 0Q3.6 0.4 3 3.4Q0 6.6 -3 4' };
/** Number spore: bubble with a digit inside. */
const spore = (x, y, r, dgt, fill) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" stroke="${OL}" stroke-width="2"/><path d="${DIG[dgt]}" transform="translate(${f(x)} ${f(y)}) scale(${f(r / 7.5)})" fill="none" stroke="${OL}" stroke-width="${f(2.6 * 7.5 / r)}" stroke-linecap="round" stroke-linejoin="round"/>`;

// ---------- hummbit: hummingbird whose wings beat in a repeating colour pattern
function hummbit(A, st, Pp, m) {
  const G = Pp.main, K = Pp.second, L = Pp.accent, W = Pp.wing;
  const beak = (x, y, len, h) => A.part(P(poly([[x, y - h], [x + len, y + h * 0.35], [x, y + h]])), Pp.dark, { s: 1.5, sw: 3 });
  const whoosh = (d, col = K.b) => line(A, d, 3, col);
  const beat = (x, y, n, s, dx, dy) => { let o = ''; for (let i = 0; i < n; i++) o += `<circle cx="${f(x + i * dx)}" cy="${f(y + i * dy)}" r="${f(i % 2 ? s * 0.55 : s)}" fill="${i % 2 ? L.b : K.b}" stroke="${OL}" stroke-width="1.6"/>`; A.add(o); };
  const legs = (xs, y0, y1) => xs.forEach((x) => { stalk(A, `M${x} ${y0}L${x - 2} ${y1}`, Pp.dark.b, 2.4); line(A, `M${x - 6} ${y1 + 1}L${x - 2} ${y1}L${x + 3} ${y1 + 3}`, 2.4, OL); });
  if (st === 1) {
    ground(A, 102, 26);
    whoosh('M22 58q-8 10 -4 24M16 70q-4 6 -2 12'); whoosh('M136 30q10 6 12 18M146 26q6 4 8 10');
    banded(A, [88, 104], [62, 86], [30, 70], 13, W, [K.b, null], 4);
    for (const [tp, c] of [[[38, 142], K], [[42, 156], G], [[54, 166], K]]) A.part(P(blob(leaf([74, 136], tp, [78, 146], 0.3))), c, { s: 2, sw: 3 });
    legs([96, 108], 150, 164);
    A.part(Ci(100, 122, 32), G, { s: 8, inner: `<ellipse cx="102" cy="146" rx="24" ry="14" fill="${Pp.belly.b}"/><ellipse cx="122" cy="136" rx="13" ry="8" fill="${K.b}"/>` });
    A.add(`<path d="${spiralD(104, 84, 6, 1.3, 1)}" fill="none" stroke="${OL}" stroke-width="6" stroke-linecap="round"/><path d="${spiralD(104, 84, 6, 1.3, 1)}" fill="none" stroke="${L.b}" stroke-width="2.6" stroke-linecap="round"/>`);
    banded(A, [94, 102], [104, 72], [126, 44], 12, W, [K.b, null], 4);
    beak(134, 125, 36, 4);
    eyesOnly(A, Pp, m, 108, 118, 128, 117, 9.5);
    if (m === 'happy') mouth(A, 132, 132, 3, 'happy');
    beat(150, 150, 4, 3.4, 9, 4);
  } else if (st === 2) {
    ground(A, 102, 34);
    whoosh('M28 30q-8 14 -4 30M22 48q-4 8 0 16'); whoosh('M140 14q10 6 14 20M150 10q6 4 8 12');
    banded(A, [94, 100], [68, 58], [40, 20], 16, W, [K.b, null], 5, { s: 5 });
    for (const [c, tp, cl] of [[[40, 132], [12, 146], 'up'], [[50, 166], [22, 182], 'dn']]) {
      banded(A, [78, 136], c, tp, 7, G, [K.b, L.b], 6, { s: 2 });
      mark(A, Pp, tp[0], tp[1], 6, { rot: cl === 'up' ? -60 : -110 });
    }
    legs([98, 110], 142, 156);
    A.part(E(104, 120, 34, 22, -38), G, { s: 7, inner: `<ellipse cx="104" cy="132" rx="22" ry="12" transform="rotate(-38 104 132)" fill="${Pp.belly.b}"/>` });
    mark(A, Pp, 102, 128, 5);
    banded(A, [106, 100], [110, 62], [126, 22], 14, W, [K.b, null], 5, { s: 5 });
    for (const [b1, tp, b2, c] of [[[114, 64], [100, 36], [124, 58], K], [[120, 60], [118, 30], [130, 58], L], [[126, 58], [134, 32], [136, 60], K]]) A.part(P(blob(leaf(b1, tp, b2, 0.35))), c, { s: 2, sw: 3 });
    A.part(Ci(132, 80, 24), G, { s: 6, inner: `<ellipse cx="140" cy="100" rx="16" ry="9" fill="${K.b}"/>` });
    beak(152, 84, 42, 4.2);
    eyesOnly(A, Pp, m, 128, 79, 146, 78, 8.5);
    if (m === 'happy') mouth(A, 150, 92, 3, 'happy');
    beat(160, 132, 4, 3.6, 8, 6);
  } else {
    ground(A, 100, 44);
    A.halo(100, 90, 92, L.b, true);
    const ABC = [K.b, L.b, null];
    banded(A, [92, 100], [48, 66], [6, 22], 24, W, ABC, 6, { s: 6 });
    banded(A, [90, 112], [56, 118], [16, 104], 13, G, [K.b, null], 4, { s: 3 });
    banded(A, [112, 98], [150, 60], [194, 22], 24, W, ABC, 6, { s: 6 });
    banded(A, [114, 110], [146, 118], [184, 108], 13, G, [K.b, null], 4, { s: 3 });
    for (const [c, tp, d] of [[[46, 142], [22, 124], -1], [[54, 176], [26, 178], 1]]) {
      banded(A, [82, 146], c, tp, 8, G, [K.b, L.b, null], 6, { s: 2 });
      A.halo(tp[0] - 4, tp[1], 16, L.b);
      A.add(`<path d="${spiralD(tp[0] - 4, tp[1], 9, 1.5, d)}" fill="none" stroke="${OL}" stroke-width="6.5" stroke-linecap="round"/><path d="${spiralD(tp[0] - 4, tp[1], 9, 1.5, d)}" fill="none" stroke="${L.l}" stroke-width="3" stroke-linecap="round"/>`);
    }
    mark(A, Pp, 26, 48, 6, { glow: true, rot: -20 }); mark(A, Pp, 174, 48, 6, { glow: true, rot: 20 });
    legs([96, 108], 150, 164);
    A.part(E(102, 124, 36, 25, -38), G, { s: 8, inner: `<ellipse cx="102" cy="138" rx="24" ry="13" transform="rotate(-38 102 138)" fill="${Pp.belly.b}"/>` });
    mark(A, Pp, 98, 132, 7, { glow: true });
    A.part(Ci(128, 78, 26), G, { s: 6, inner: `<ellipse cx="138" cy="100" rx="17" ry="10" fill="${K.b}"/><path d="M126 102q10 6 24 2" stroke="${K.l}" stroke-width="2.5" fill="none"/>` });
    for (let i = 0; i < 5; i++) { const a = (i * 72 - 90) * Math.PI / 180; A.part(E(120 + Math.cos(a) * 9, 46 + Math.sin(a) * 9, 7, 5, i * 72), i % 2 ? Pp.pink : K, { s: 2, sw: 2.6 }); }
    A.halo(120, 46, 14, L.b);
    A.add(`<circle cx="120" cy="46" r="5" fill="${L.l}" stroke="${OL}" stroke-width="2.2"/>`);
    beak(150, 84, 44, 4.6);
    eyesOnly(A, Pp, m, 124, 78, 144, 77, 9, { lid: G.b });
    if (m === 'happy') mouth(A, 148, 92, 3, 'happy');
  }
}

// ---------- equalizard: gecko -> dino with "=" stripes and plates, sharp striker claws
function equalizard(A, st, Pp, m) {
  const G = Pp.main, B = Pp.belly, K = Pp.second, L = Pp.accent;
  const claws = (x, y, s = 1) => A.add([0, 1, 2].map((i) => `<path d="M${f(x + (i - 1) * 5 * s - 2 * s)} ${f(y)}l${f(3 * s)} ${f(-6 * s)}l${f(2 * s)} ${f(6 * s)}Z" fill="#fff" stroke="${OL}" stroke-width="1.8" stroke-linejoin="round"/>`).join(''));
  const tailEq = (t, ts, s, col) => ts.map((tt) => { const p = t.at(tt), q = t.at(tt + 0.02); return eqG(p[0], p[1], s, Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI, col); }).join('');
  const tail = (base, ctrl, tip, w, ts, s) => { const t = bushy(base, ctrl, tip, w, 0.9); A.part(P(t.d), G, { s: 5, inner: tailEq(t, ts, s, K.b) }); return t; };
  const blade = (b1, tp, b2, glow) => { if (glow) A.halo(tp[0], tp[1] + 10, 22, L.b); A.part(P(blob(leaf(b1, tp, b2, 0.32))), L, { s: 3, inner: `<path d="M${f((b1[0] + b2[0]) / 2)} ${f((b1[1] + b2[1]) / 2)}L${f(tp[0])} ${f(tp[1])}" stroke="${L.s}" stroke-width="2"/>` }); };
  const leg = (pts, T = G) => A.part(P(blob(pts)), T, { s: 3 });
  if (st === 1) {
    ground(A, 98, 56);
    tail([70, 168], [22, 188], [24, 140], 12, [0.3, 0.6], 5);
    blade([18, 146], [24, 124], [30, 144]);
    leg([[70, 164], [82, 164], [80, 182], [68, 182]], Pp.dark); leg([[112, 164], [124, 164], [124, 182], [112, 182]], Pp.dark);
    A.part(P(blob([[96, 136], [122, 140], [134, 158], [126, 176], [96, 180], [66, 176], [58, 158], [70, 140]])), G, { s: 7, inner: `<path d="M60 170Q96 184 132 170L134 190H58Z" fill="${B.b}"/>` + eqG(82, 148, 8, -10, K.b, 2.4) + eqG(106, 146, 8, 4, K.b, 2.4) });
    leg([[78, 166], [92, 166], [92, 182], [76, 182]]); claws(84, 183, 0.8);
    leg([[118, 164], [132, 162], [134, 182], [118, 182]]); claws(126, 183, 0.8);
    for (const [x, y] of [[118, 96], [130, 92], [142, 94]]) A.part(P(poly([[x - 5, y + 6], [x, y - 6], [x + 5, y + 6]])), K, { s: 1.5, sw: 2.6 });
    A.part(P(blob([[138, 96], [162, 102], [172, 120], [166, 140], [142, 146], [118, 140], [110, 120], [118, 102]])), G, { s: 7, inner: `<path d="M112 128Q142 146 172 124L172 150H110Z" fill="${B.b}"/>` });
    eyesOnly(A, Pp, m, 132, 118, 156, 116, 10);
    mouth(A, 152, 133, 5, m, 'smile', { fang: true });
  } else if (st === 2) {
    ground(A, 96, 68);
    tail([58, 146], [12, 170], [12, 116], 14, [0.3, 0.52, 0.72], 5.5);
    blade([4, 124], [10, 88], [22, 120]);
    leg([[70, 150], [82, 150], [80, 182], [68, 182]], Pp.dark); leg([[122, 148], [134, 146], [138, 182], [124, 182]], Pp.dark);
    A.part(P(blob([[60, 126], [102, 118], [136, 126], [150, 146], [132, 162], [80, 164], [52, 156], [46, 138]])), G, { s: 8, inner: `<path d="M48 150Q96 168 150 148L152 176H46Z" fill="${B.b}"/>` + eqG(66, 134, 8, -12, K.b, 2.4) + eqG(92, 128, 8, -3, K.b, 2.4) + eqG(118, 130, 8, 8, K.b, 2.4) });
    leg([[80, 152], [94, 152], [94, 182], [78, 182]]); claws(86, 183);
    leg([[128, 150], [142, 146], [148, 182], [130, 182]]); claws(139, 183);
    for (const [x, y, a] of [[140, 84, -30], [150, 76, -10], [162, 74, 10]]) A.part(P(poly([[x - 6, y + 8], [x - 1, y - 10], [x + 6, y + 8]])), K, { s: 1.5, sw: 2.6, tf: rot(a, x, y) });
    A.part(P(blob([[128, 128], [134, 108], [146, 96], [150, 116], [146, 134]])), G, { s: 4 });
    A.part(P(blob([[146, 84], [170, 82], [190, 94], [192, 110], [178, 120], [154, 122], [138, 112], [138, 94]])), G, { s: 7, inner: `<path d="M138 110Q166 124 194 104L194 130H136Z" fill="${B.b}"/>` + eqG(156, 90, 5, -4, K.b, 1.8) });
    eyesOnly(A, Pp, m, 160, 100, 180, 98, 8.5, { lid: G.b, lidTilt: 0.35 });
    mouth(A, 180, 113, 4.5, m, 'smile', { fang: true });
    mark(A, Pp, 100, 146, 5);
  } else {
    ground(A, 98, 74);
    A.halo(104, 96, 88, L.b, true);
    tail([80, 140], [26, 144], [8, 176], 18, [0.28, 0.46, 0.64], 6.5);
    blade([2, 170], [4, 132], [18, 164], true);
    // "=" plates along the spine (behind the body)
    for (const [x, y, a] of [[104, 44, -58], [88, 68, -46], [72, 94, -36], [58, 120, -26]]) {
      A.halo(x, y - 4, 18, L.b);
      A.part(P(blob([[0, -18, 1], [10, -8], [10, 10], [-10, 10], [-10, -8]].map(([a1, b1, c]) => [x + a1, y + b1, c]))), L, { s: 3, sw: 3, tf: rot(a, x, y), inner: eqG(x, y - 1, 5.5, 0, K.b, 1.8) });
    }
    leg([[104, 150], [120, 150], [118, 182], [104, 184]], Pp.dark); claws(112, 185);
    const belly = `<path d="M128 80Q156 96 150 140Q136 164 108 164Q128 128 128 80Z" fill="${B.b}"/><path d="M132 128h18M128 140h20M122 152h20" stroke="${B.s}" stroke-width="3"/>`;
    A.part(P(blob([[118, 60], [140, 70], [152, 104], [150, 140], [132, 164], [100, 168], [76, 154], [68, 130], [84, 100], [102, 76]])), G, { s: 9, inner: belly });
    A.part(P(blob([[62, 150], [80, 132], [100, 136], [104, 160], [96, 182], [78, 184], [70, 170]])), G, { s: 5 });
    A.part(E(84, 184, 16, 5), G, { s: 2 }); claws(90, 187, 1.1);
    mark(A, Pp, 84, 154, 7, { glow: true });
    A.part(P(blob([[140, 104], [156, 108], [168, 118], [164, 124], [150, 120], [138, 116]])), G, { s: 2 }); claws(168, 126, 0.8);
    A.part(P(blob([[122, 46], [144, 32], [170, 34], [190, 46], [190, 62], [172, 70], [144, 72], [124, 64]])), G, { s: 7, inner: `<path d="M122 60Q158 76 194 56L194 80H120Z" fill="${B.b}"/>` });
    crown(A, Pp, 146, 34, 24, 16, 3, L);
    eyesOnly(A, Pp, m, 150, 50, 170, 48, 8.5, { lid: G.b });
    mouth(A, 178, 62, 4.5, m, 'smile', { fang: true });
    A.halo(140, 106, 20, L.b);
    A.add(eqG(140, 106, 8, -8, L.l, 2.4));
  }
}

// ---------- funcshroom: mushroom "function machine" (numbers go in the top, hearts come out the spout)
function funcshroom(A, st, Pp, m) {
  const C = Pp.second, S = Pp.belly, G = Pp.main, L = Pp.accent;
  const spots = (arr) => arr.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry ?? rx}" fill="${Pp.white.b}"/>`).join('');
  const hopper = (x, y, w, h, glow) => {
    if (glow) A.halo(x, y - h * 0.4, w * 1.4, L.b);
    A.part(P(poly([[x - w / 2, y - h], [x + w / 2, y - h], [x + w * 0.2, y], [x - w * 0.2, y]])), L, { s: 3, inner: `<ellipse cx="${x}" cy="${f(y - h)}" rx="${f(w * 0.38)}" ry="${f(h * 0.2)}" fill="${OL}" opacity=".75"/>` });
  };
  const spout = (x, y, len, r, glow) => {
    A.part(Rr(x, y - r, len, r * 2, r * 0.6), L, { s: 2 });
    A.part(E(x + len, y, r * 0.6, r * 1.3), L, { s: 2, inner: `<ellipse cx="${f(x + len + 1)}" cy="${y}" rx="${f(r * 0.3)}" ry="${f(r * 0.8)}" fill="${OL}" opacity=".7"/>` });
    if (glow) A.halo(x + len + 14, y - 6, 22, Pp.pink.b);
  };
  const arrow = (x1, x2, y, col = Pp.white.b) => `<path d="M${x1} ${y}H${x2 - 6}" stroke="${OL}" stroke-width="7" stroke-linecap="round"/><path d="M${x2 - 8} ${y - 7}L${x2 + 2} ${y}L${x2 - 8} ${y + 7}Z" fill="${col}" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/><path d="M${x1} ${y}H${x2 - 6}" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`;
  const drops = (pts, dy = 8) => pts.map(([x, y]) => `<path d="M${x} ${y + 6}v${dy}" stroke="${OL}" stroke-width="2" stroke-dasharray="2 3" stroke-linecap="round"/>`).join('');
  if (st === 1) {
    ground(A, 100, 44);
    A.add(drops([[80, 32]]) + spore(80, 26, 8, 2, Pp.white.b));
    hopper(80, 70, 26, 18);
    A.part(E(100, 116, 44, 9), S, { s: 3, inner: `<path d="M64 116h72M72 112v8M84 110v10M100 110v10M116 110v10M128 112v8" stroke="${S.s}" stroke-width="2"/>` });
    A.part(E(84, 181, 12, 6), S, { s: 2 }); A.part(E(116, 181, 12, 6), S, { s: 2 });
    A.part(P(blob([[100, 118], [122, 122], [130, 150], [126, 174], [100, 181], [74, 174], [70, 150], [78, 122]])), S, { s: 7 });
    spout(126, 138, 16, 5);
    A.add(heart(158, 128, 7, Pp.pink.b));
    A.part(E(74, 158, 6, 9, 25), S, { s: 2 }); A.part(E(126, 158, 6, 9, -25), S, { s: 2 });
    A.part(P(blob([[100, 62], [132, 70], [150, 94], [148, 112], [100, 118], [52, 112], [50, 94], [68, 70]])), C, { s: 8, inner: spots([[66, 96, 6, 5], [132, 94, 6, 5], [112, 72, 4]]) + arrow(76, 124, 100) });
    A.part(P(blob(leaf([118, 66], [134, 50], [128, 72], 0.35))), G, { s: 2, sw: 2.6 });
    eyesOnly(A, Pp, m, 89, 144, 112, 144, 9);
    mouth(A, 101, 159, 4.5, m, 'smile');
  } else if (st === 2) {
    ground(A, 100, 54);
    A.add(drops([[58, 18], [76, 30]]) + spore(58, 12, 7.5, 1, Pp.white.b) + spore(76, 24, 8, 3, Pp.white.b));
    hopper(70, 64, 32, 20);
    A.part(E(100, 108, 56, 11), S, { s: 3, inner: `<path d="M50 108h100M58 102v12M72 100v16M86 100v16M100 100v16M114 100v16M128 100v16M142 102v12" stroke="${S.s}" stroke-width="2"/>` });
    for (const x of [80, 120]) A.part(P(blob([[x - 12, 178], [x, 172], [x + 12, 178], [x + 16, 184, 1], [x - 16, 184, 1]])), G, { s: 2 });
    A.part(P(blob([[100, 108], [126, 114], [136, 146], [132, 172], [100, 180], [68, 172], [64, 146], [74, 114]])), S, { s: 8, inner: `<path d="M62 158Q100 170 138 158" stroke="${G.b}" stroke-width="8" fill="none"/><path d="M62 154Q100 166 138 154M62 162Q100 174 138 162" stroke="${OL}" stroke-width="2" fill="none"/>` });
    spout(134, 128, 20, 6);
    A.add(heart(170, 116, 7.5, Pp.pink.b) + heart(184, 96, 5.5, Pp.pink.l) + sparkle(168, 92, 5, L.l));
    A.part(P(blob(leaf([72, 142], [50, 160], [74, 154], 0.4))), G, { s: 2 });
    A.part(P(blob(leaf([128, 142], [146, 158], [126, 154], 0.4))), G, { s: 2 });
    A.part(P(blob([[100, 50], [140, 56], [164, 82], [160, 104], [100, 110], [40, 104], [36, 82], [60, 56]])), C, {
      s: 9, inner: spots([[52, 90, 7, 6], [148, 88, 7, 6], [120, 60, 5], [84, 60, 4]]) + spore(78, 86, 8, 2, Pp.white.b) + arrow(92, 112, 86) + heart(126, 86, 7.5, Pp.pink.b),
    });
    A.part(P(blob(leaf([120, 54], [144, 38], [132, 60], 0.35))), G, { s: 2, sw: 2.6 });
    eyesOnly(A, Pp, m, 88, 136, 112, 136, 9.5);
    mouth(A, 100, 152, 4.5, m, 'smile');
    mark(A, Pp, 100, 166, 4.5, { rot: 0 });
  } else {
    ground(A, 100, 62);
    A.halo(100, 100, 94, L.b, true);
    // leafy cape
    for (const [b1, tp, b2] of [[[78, 110], [22, 150], [78, 136]], [[122, 110], [178, 150], [122, 136]], [[78, 120], [40, 182], [86, 158]], [[122, 120], [160, 182], [114, 158]]]) A.part(P(blob(leaf(b1, tp, b2, 0.22))), G, { s: 4, inner: `<path d="M${(b1[0] + b2[0]) / 2} ${(b1[1] + b2[1]) / 2}L${tp[0]} ${tp[1]}" stroke="${G.s}" stroke-width="2.5"/>` });
    A.add(drops([[82, 14], [100, 9], [118, 15]], 5) + spore(82, 14, 6, 1, Pp.white.b) + spore(100, 9, 6, 2, Pp.white.b) + spore(118, 15, 6, 3, Pp.white.b));
    hopper(100, 44, 30, 18, true);
    A.part(E(100, 110, 50, 10), S, { s: 3, inner: `<path d="M56 110h88M64 104v12M78 102v16M92 102v16M108 102v16M122 102v16M136 104v12" stroke="${S.s}" stroke-width="2"/>` });
    A.part(P(blob([[100, 110], [124, 116], [132, 148], [128, 174], [100, 182], [72, 174], [68, 148], [76, 116]])), S, { s: 8 });
    spout(130, 132, 18, 6, true);
    A.add(heart(164, 120, 8, Pp.pink.b) + heart(180, 98, 6, Pp.pink.l) + heart(160, 90, 4.5, Pp.pink.l) + sparkle(184, 124, 5, L.l));
    A.part(P(blob(leaf([74, 144], [60, 168], [84, 162], 0.45))), G, { s: 2 });
    A.part(P(blob(leaf([126, 144], [140, 168], [116, 162], 0.45))), G, { s: 2 });
    A.halo(100, 164, 18, Pp.pink.b);
    A.add(heart(100, 164, 8, Pp.pink.b));
    // tall glowing morel cap with honeycomb cells
    let cells = '';
    for (let r = 0; r < 5; r++) for (let c = -3; c <= 3; c++) {
      const x = 100 + c * 15 + (r % 2) * 7.5, y = 40 + r * 14;
      cells += `<path d="${poly(ngon(x, y, 6.4, 6, 30))}" fill="${(r + c) % 3 === 0 ? L.l : C.s}" stroke="${C.l}" stroke-width="1.5"/>`;
    }
    A.part(P(blob([[100, 32], [128, 38], [146, 66], [152, 96], [100, 108], [48, 96], [54, 66], [72, 38]])), C, { s: 9, inner: cells });
    mark(A, Pp, 60, 144, 6, { glow: true, rot: -30 }); mark(A, Pp, 140, 144, 6, { glow: true, rot: 30 });
    eyesOnly(A, Pp, m, 88, 136, 112, 136, 9.5);
    if (m === 'idle') line(A, 'M78 124l-4 -3M81 122l-2 -4M122 124l4 -3M119 122l2 -4', 2);
    mouth(A, 100, 150, 4.5, m, 'smile');
    for (const [x, y, s] of [[26, 70, 5], [174, 58, 4], [36, 118, 4]]) A.add(`<path d="${plusd(x, y, s)}" fill="${Pp.pink.l}" stroke="${OL}" stroke-width="1.8"/>`);
  }
}

export const PETS_A = {
  hummbit: { el: 'vine', names: ['Hummbit', 'Hummbeat', 'Rhythmingo'], draw: hummbit },
  equalizard: { el: 'vine', names: ['Equalizard', 'Balancko', 'Equisaurus'], draw: equalizard },
  funcshroom: { el: 'vine', names: ['Funcshroom', 'Mapcap', 'Functorel'], draw: funcshroom },
};

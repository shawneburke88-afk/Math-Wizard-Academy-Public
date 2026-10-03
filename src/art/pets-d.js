// Extra pets (Tallyfin, Histohawk, Pictobear, Meanicorn). Each draw(A, st, Pp, m) paints one species at stage st (1-3) in a 200x200 box, standing on y≈186.
import { OL, blob, poly, leaf, P, E, Ci, Rr, f, boltd, mark, gem, eyesOnly, mouth, nose, ground, line, crown, plusd, stalk, spiralD, rrd, barTuft } from './creatures.js';

// ---------- shared bits
/** Tally marks: groups of four uprights crossed by a fifth. Returns markup (for `inner` or A.add). */
function tallies(x, y, h, g, groups, col, w = 2.6) {
  let d = '', x0 = x;
  for (const n of groups) {
    for (let i = 0; i < Math.min(n, 4); i++) d += `M${f(x0 + i * g)} ${f(y)}v${f(h)}`;
    if (n >= 5) d += `M${f(x0 - g * 0.7)} ${f(y + h * 0.82)}L${f(x0 + g * 3.7)} ${f(y + h * 0.18)}`;
    x0 += g * 5.6;
  }
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
}
/** Row of bars (bar-graph feathers) standing on baseline yb; o: {ang, gap, cap, ext, s, sw}. */
function bars(A, T, x0, yb, w, hs, o = {}) {
  const gap = o.gap ?? 1.5, px = x0 + (hs.length * (w + gap)) / 2, tf = o.ang ? `rotate(${f(o.ang)} ${f(px)} ${f(yb)})` : undefined;
  let d = '', caps = '';
  hs.forEach((h, i) => { const x = x0 + i * (w + gap); d += rrd(x, yb - h, w, h + (o.ext ?? 10), Math.min(3, w * 0.22)); caps += `M${f(x)} ${f(yb - h + 3)}h${f(w)}`; });
  A.part(P(d, tf), T, { s: o.s ?? 3, sw: o.sw ?? 3, inner: `<path d="${caps}" stroke="${o.cap || T.l}" stroke-width="${o.capw ?? 5}"${tf ? ` transform="${tf}"` : ''}/>` });
}
const plusSpark = (A, x, y, s, T) => A.add(`<path d="${plusd(x, y, s)}" fill="${T.l}" stroke="${OL}" stroke-width="1.8" stroke-linejoin="round"/>`);

// ---------- tallyfin: seal pup that keeps tally marks on a slate
function tallyfin(A, st, Pp, m) {
  const B = Pp.main, S = Pp.belly, D = Pp.second;
  const face = (x, y, s, o = {}) => {
    eyesOnly(A, Pp, m, x - 14 * s, y, x + 14 * s, y, 10 * s, { far: 1, farSq: 0.95, lid: o.lid ? B.b : undefined });
    A.part(P(blob([[x, y + 10 * s], [x + 8 * s, y + 9 * s], [x + 13 * s, y + 15 * s], [x + 8 * s, y + 21 * s], [x, y + 19 * s], [x - 8 * s, y + 21 * s], [x - 13 * s, y + 15 * s], [x - 8 * s, y + 9 * s]])), S, { s: 3 });
    A.add([[-7, 15], [-9, 18.5], [7, 15], [9, 18.5]].map(([a, b]) => `<circle cx="${f(x + a * s)}" cy="${f(y + b * s)}" r="${f(1.1 * s)}" fill="${D.s}" opacity=".6"/>`).join(''));
    line(A, `M${f(x - 13 * s)} ${f(y + 14 * s)}l${f(-13 * s)} -3M${f(x - 13 * s)} ${f(y + 18 * s)}l${f(-12 * s)} 3M${f(x + 13 * s)} ${f(y + 14 * s)}l${f(13 * s)} -3M${f(x + 13 * s)} ${f(y + 18 * s)}l${f(12 * s)} 3`, 1.8);
    nose(A, x, y + 12 * s, 4.5 * s);
    mouth(A, x, y + 20 * s, 4 * s, m, 'cat');
  };
  const spots = (pts) => pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${D.b}" opacity=".55"/>`).join('');
  const slate = (x, y, w, h, a, groups, glow) => {
    const tf = `rotate(${a} ${x + w / 2} ${y + h / 2})`;
    if (glow) A.halo(x + w / 2, y + h / 2, w * 0.62, Pp.accent.b);
    A.part(Rr(x, y, w, h, 6, tf), glow ? Pp.accent : D, { s: 3 });
    A.part(Rr(x + 5, y + 5, w - 10, h - 10, 3, tf), Pp.ink, { s: 0, flat: true, sw: 2.4, inner: `<g transform="${tf}">${tallies(x + 11, y + 11, h - 22, 4.6, groups, glow ? Pp.accent.l : Pp.white.b, 2.8)}</g>` });
  };
  const flip = (b1, tip, b2, T = B, s = 3, inner = '', k = 0.34) => A.part(P(blob(leaf(b1, tip, b2, k))), T, { s, inner });
  if (st === 1) {
    ground(A, 98, 48);
    flip([74, 170], [34, 158], [70, 184], B, 3, tallies(46, 164, 8, 4, [4], D.b, 2.2));
    flip([78, 172], [36, 180], [94, 182], B, 3, '', 0.2);
    A.part(P(blob([[106, 94], [134, 102], [148, 128], [150, 158], [138, 179], [108, 185], [80, 184], [62, 172], [60, 144], [78, 110]])), B, {
      s: 9, inner: `<ellipse cx="112" cy="162" rx="27" ry="22" fill="${S.b}"/>` + spots([[70, 136, 5], [80, 118, 3.5], [66, 156, 3.5]]) + tallies(98, 154, 15, 5, [5], D.b, 2.8),
    });
    flip([76, 146], [64, 172], [88, 156], B, 3, '', 0.26);
    flip([142, 146], [160, 170], [146, 160], B, 3, '', 0.26);
    face(114, 120, 1);
  } else if (st === 2) {
    ground(A, 100, 58);
    flip([72, 166], [22, 146], [66, 182], B, 4, tallies(34, 152, 10, 4.5, [5], D.b, 2.4));
    flip([78, 170], [22, 180], [96, 182], B, 4, '', 0.2);
    A.part(P(blob([[114, 58], [140, 66], [154, 92], [154, 128], [158, 160], [142, 180], [110, 186], [78, 184], [58, 168], [60, 138], [74, 102], [90, 72]])), B, {
      s: 10, inner: `<ellipse cx="116" cy="150" rx="32" ry="36" fill="${S.b}"/>` + spots([[74, 120, 5], [84, 98, 4], [68, 144, 4], [80, 160, 3]]),
    });
    face(122, 88, 1.05);
    slate(90, 124, 58, 40, -6, [5, 3]);
    A.part(E(90, 156, 9, 13, 30), B, { s: 3 });
    A.part(E(148, 150, 9, 13, -30), B, { s: 3 });
    mark(A, Pp, 70, 128, 6);
  } else {
    ground(A, 100, 70);
    A.halo(104, 96, 90, Pp.accent.b);
    // flowing wave mane / cape of curling crests
    const cape = [[118, 36], [84, 32], [50, 56], [28, 96], [18, 138], [28, 172], [70, 170], [82, 110], [104, 62]];
    A.part(P(blob(cape)), D, { s: 8, inner: `<path d="M100 44Q60 60 50 110T46 168" fill="none" stroke="${D.l}" stroke-width="3.5" stroke-linecap="round"/>` });
    for (const [x, y, r] of [[92, 30, 13], [64, 42, 14], [42, 66, 15], [26, 96, 15], [18, 128, 14], [20, 158, 12]]) A.part(Ci(x, y, r), D, { s: 4, inner: `<path d="${spiralD(x, y, r * 0.72, 1.3, -1)}" fill="none" stroke="${Pp.wing.b}" stroke-width="3" stroke-linecap="round"/>` });
    flip([74, 164], [18, 150], [66, 182], B, 5, tallies(32, 156, 10, 4.5, [5], D.b, 2.4));
    flip([80, 170], [18, 180], [100, 182], B, 5, '', 0.2);
    A.part(P(blob([[122, 40], [148, 48], [164, 76], [166, 118], [172, 156], [154, 181], [114, 186], [78, 185], [52, 170], [52, 136], [68, 94], [94, 58]])), B, {
      s: 11, inner: `<ellipse cx="120" cy="142" rx="36" ry="42" fill="${S.b}"/>` + spots([[66, 118, 5], [76, 96, 4], [62, 142, 4]]),
    });
    // sea-foam crest on the head
    A.part(P(blob([[98, 50], [106, 36, 1], [114, 46], [124, 30, 1], [132, 44], [144, 34, 1], [146, 52], [122, 56]])), D, { s: 3 });
    mark(A, Pp, 66, 150, 7, { glow: true });
    mark(A, Pp, 86, 90, 5, { glow: true });
    face(128, 76, 1.1);
    crown(A, Pp, 128, 44, 32, 22);
    slate(92, 120, 66, 44, -5, [5, 5, 2], true);
    A.part(E(92, 156, 10, 15, 30), B, { s: 3 });
    A.part(E(160, 148, 10, 15, -30), B, { s: 3 });
  }
}

// ---------- histohawk: hawk with bar-graph feathers
function histohawk(A, st, Pp, m) {
  const B = Pp.main, S = Pp.belly, D = Pp.second, Y = Pp.accent;
  const beak = (x, y, s) => {
    A.part(P(blob([[x - 2 * s, y - 7 * s], [x + 10 * s, y - 6 * s], [x + 17 * s, y + 1 * s], [x + 15 * s, y + 10 * s, 1], [x + 10 * s, y + 4 * s], [x - 2 * s, y + 6 * s]])), Y, { s: 2, sw: 3 });
    line(A, `M${f(x + 1 * s)} ${f(y + 2 * s)}L${f(x + 11 * s)} ${f(y + 3 * s)}`, 2);
  };
  const talons = (x, y, s = 1) => A.add(`<path d="M${f(x - 9 * s)} ${f(y + 1)}L${f(x - 5 * s)} ${f(y - 6 * s)}L${f(x + 5 * s)} ${f(y - 6 * s)}L${f(x + 10 * s)} ${f(y + 1)}L${f(x + 3 * s)} ${f(y - 1)}L${f(x)} ${f(y + 2)}L${f(x - 3 * s)} ${f(y - 1)}Z" fill="${Y.b}" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>`);
  const chev = (x, y, n, w, col) => { let d = ''; for (let i = 0; i < n; i++) d += `M${f(x - w)} ${f(y + i * 9)}l${f(w)} 5l${f(w)} -5`; return `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`; };
  if (st === 1) {
    ground(A, 100, 42);
    barTuft(A, Pp, 90, 104, 7, [14, 20, 26], 1.5, false, 6);
    bars(A, D, 50, 156, 7, [12, 18, 14], { ang: 225, cap: Y.b });
    A.part(P(blob([[102, 98], [132, 106], [146, 136], [140, 166], [116, 181], [88, 181], [64, 166], [58, 136], [72, 106]])), B, {
      s: 9, inner: `<ellipse cx="108" cy="160" rx="25" ry="20" fill="${S.b}"/>` + chev(108, 152, 2, 7, B.b),
    });
    bars(A, D, 62, 150, 6, [10, 15, 20], { ang: 192, cap: Y.b, gap: 1, s: 2 });
    A.part(P(blob([[72, 130], [90, 134], [94, 148], [84, 156], [66, 154]])), D, { s: 3 });
    talons(92, 183, 0.9); talons(116, 183, 0.9);
    eyesOnly(A, Pp, m, 96, 126, 124, 126, 10, { far: 1, farSq: 0.95 });
    beak(126, 136, 0.9);
    if (m === 'happy') mouth(A, 132, 147, 3, 'happy');
  } else if (st === 2) {
    ground(A, 100, 52);
    bars(A, D, 44, 146, 9, [20, 30, 26, 16], { ang: 222, cap: Y.b });
    stalk(A, 'M98 168V182', Y.b, 4); stalk(A, 'M118 166V182', Y.b, 4);
    talons(98, 184); talons(119, 184);
    barTuft(A, Pp, 90, 74, 6, [10, 16, 22], 1.5, false, -40);
    A.part(P(blob([[120, 56], [142, 64], [152, 92], [148, 128], [134, 158], [110, 174], [86, 174], [72, 160], [74, 124], [90, 86], [102, 64]])), B, {
      s: 10, inner: `<path d="${blob([[130, 96], [148, 104], [146, 136], [128, 162], [106, 170], [110, 130]])}" fill="${S.b}"/>` + chev(132, 118, 3, 6, B.b),
    });
    // folded wing with bar-graph primaries
    bars(A, D, 58, 128, 9, [34, 46, 40, 28], { ang: 196, cap: Y.b });
    A.part(P(blob([[98, 90], [114, 104], [110, 134], [92, 152], [72, 152], [70, 124], [82, 98]])), D, { s: 5, inner: `<path d="${boltd(94, 124, 9)}" fill="${Y.b}"/>` });
    eyesOnly(A, Pp, m, 114, 86, 140, 86, 10, { far: 0.95, lid: B.b, lidTilt: 0.5 });
    beak(142, 96, 1.05);
    if (m === 'happy') mouth(A, 148, 110, 3.5, 'happy');
  } else {
    ground(A, 100, 62);
    A.halo(100, 90, 96, Y.b);
    // far wing (raised, bar-graph fan)
    bars(A, D, 106, 100, 11, [40, 56, 66, 54, 38], { ang: 18, cap: Y.b, s: 4 });
    // near wing
    bars(A, D, 16, 106, 11, [36, 52, 64, 56, 42], { ang: -16, cap: Y.b, s: 4 });
    A.part(P(blob([[100, 96], [70, 88], [36, 96], [26, 114], [48, 124], [96, 126]])), D, { s: 5, inner: `<path d="${boltd(52, 108, 9)}" fill="${Y.l}"/>` });
    A.part(P(blob([[108, 96], [140, 84], [170, 88], [178, 104], [156, 116], [110, 124]])), D, { s: 5, inner: `<path d="${boltd(152, 100, 9)}" fill="${Y.l}"/>` });
    bars(A, D, 52, 152, 10, [22, 32, 26], { ang: 222, cap: Y.b });
    stalk(A, 'M92 170V182', Y.b, 5); stalk(A, 'M116 170V182', Y.b, 5);
    talons(92, 185, 1.1); talons(117, 185, 1.1);
    A.part(P(blob([[108, 58], [134, 70], [146, 104], [140, 144], [122, 172], [96, 176], [76, 160], [70, 120], [80, 80]])), B, {
      s: 11, inner: `<path d="${blob([[108, 96], [132, 108], [134, 144], [118, 168], [96, 168], [88, 132]])}" fill="${S.b}"/>` + chev(112, 118, 3, 8, B.b),
    });
    mark(A, Pp, 110, 150, 8, { glow: true });
    barTuft(A, Pp, 82, 66, 7, [14, 22, 30], 1.5, true, -52);
    A.part(P(blob([[114, 36], [138, 42], [150, 62], [146, 84], [128, 94], [104, 90], [90, 72], [96, 48]])), B, { s: 7, inner: `<path d="${blob([[124, 70], [146, 66], [146, 86], [128, 94], [112, 88]])}" fill="${S.b}"/>` });
    crown(A, Pp, 118, 40, 30, 20, 3);
    eyesOnly(A, Pp, m, 110, 64, 136, 64, 9.5, { far: 0.95, lid: B.b, lidTilt: 0.55 });
    beak(140, 72, 1.1);
    if (m === 'happy') mouth(A, 146, 86, 3.5, 'happy');
  }
}

// ---------- pictobear: bear covered in picture-graph icons
function pictobear(A, st, Pp, m) {
  const B = Pp.main, S = Pp.belly, D = Pp.second, Y = Pp.accent;
  const fish = (x, y, s, col) => `<path d="M${f(x + s * 0.45)} ${f(y)}Q${f(x + s * 0.1)} ${f(y - s * 0.62)} ${f(x - s * 0.55)} ${f(y - s * 0.52)}Q${f(x - s * 1.05)} ${f(y - s * 0.3)} ${f(x - s * 1.05)} ${f(y)}Q${f(x - s * 1.05)} ${f(y + s * 0.3)} ${f(x - s * 0.55)} ${f(y + s * 0.52)}Q${f(x + s * 0.1)} ${f(y + s * 0.62)} ${f(x + s * 0.45)} ${f(y)}L${f(x + s * 1.05)} ${f(y - s * 0.5)}Q${f(x + s * 0.85)} ${f(y)} ${f(x + s * 1.05)} ${f(y + s * 0.5)}Z" fill="${col}" stroke="${OL}" stroke-width="1.4" stroke-linejoin="round"/><circle cx="${f(x - s * 0.6)}" cy="${f(y - s * 0.08)}" r="${f(s * 0.15)}" fill="${OL}"/>`;
  const graph = (x, y, rows, step, s, col, rh = step) => {
    let o = `<path d="M${f(x - s * 1.4)} ${f(y - rh * 0.6)}V${f(y + rh * (rows.length - 0.4))}" stroke="${OL}" stroke-width="2.2" stroke-linecap="round"/>`;
    rows.forEach((n, r) => { for (let i = 0; i < n; i++) o += fish(x + i * step, y + r * rh, s, col); });
    return o;
  };
  const bearFace = (x, y, s, o = {}) => {
    A.part(E(x + 3 * s, y + 16 * s, 17 * s, 12 * s), S, { s: 3 });
    eyesOnly(A, Pp, m, x - 15 * s, y, x + 17 * s, y, 10 * s, { far: 1, farSq: 0.95, lid: o.lid ? B.b : undefined });
    nose(A, x + 3 * s, y + 11 * s, 6 * s);
    mouth(A, x + 3 * s, y + 19 * s, 4.5 * s, m, 'cat', { fang: o.fang });
  };
  const ears = (x1, y1, x2, y2, r) => { for (const [x, y] of [[x1, y1], [x2, y2]]) A.part(Ci(x, y, r), B, { s: 3, inner: `<circle cx="${x + 1}" cy="${y + 1}" r="${f(r * 0.52)}" fill="${D.b}"/>` }); };
  const paw = (x, y, rx, ry) => A.part(E(x, y, rx, ry), B, { s: 3, inner: `<ellipse cx="${x}" cy="${f(y + ry * 0.2)}" rx="${f(rx * 0.45)}" ry="${f(ry * 0.45)}" fill="${D.b}"/>` });
  if (st === 1) {
    ground(A, 100, 48);
    paw(78, 179, 15, 8); paw(124, 179, 15, 8);
    A.part(P(blob([[100, 122], [130, 130], [146, 158], [138, 180], [62, 180], [54, 158], [70, 130]])), B, {
      s: 8, inner: `<rect x="76" y="140" width="50" height="36" rx="10" fill="${S.b}"/>` + graph(92, 151, [3, 2], 14, 5.6, D.b, 14),
    });
    A.part(E(60, 150, 9, 14, 20), B, { s: 3 }); A.part(E(142, 150, 9, 14, -20), B, { s: 3 });
    ears(74, 86, 128, 82, 11);
    A.part(P(blob([[102, 74], [130, 80], [144, 104], [136, 126], [102, 136], [68, 126], [60, 104], [74, 80]])), B, { s: 8 });
    bearFace(100, 102, 1);
  } else if (st === 2) {
    ground(A, 100, 60);
    paw(74, 178, 20, 10); paw(128, 178, 20, 10);
    A.part(P(blob([[100, 84], [138, 96], [158, 134], [150, 170], [124, 182], [76, 182], [50, 170], [42, 134], [62, 96]])), B, {
      s: 10, inner: `<rect x="66" y="112" width="70" height="56" rx="14" fill="${S.b}"/>` + graph(82, 126, [4, 2, 3], 15, 5.6, D.b, 15),
    });
    A.part(E(48, 136, 12, 22, 16), B, { s: 4 }); A.part(E(154, 134, 12, 22, -16), B, { s: 4 });
    // key badge: one fish = one
    A.part(Ci(152, 112, 10), Y, { s: 2, inner: fish(151, 112, 4.6, D.b) });
    ears(68, 50, 134, 46, 12);
    A.part(P(blob([[102, 36], [134, 42], [150, 68], [142, 94], [102, 104], [62, 94], [54, 68], [70, 42]])), B, { s: 8 });
    bearFace(100, 66, 1.05);
    mark(A, Pp, 44, 148, 5);
  } else {
    ground(A, 102, 80);
    // far legs
    const leg = (x, y, w, toes) => A.part(P(blob([[x + w / 2, y - 10], [x + w + 5, y], [x + w + 2, y + 26], [x + w + 1, y + 44], [x - 1, y + 44], [x - 2, y + 26], [x - 5, y]])), B, { s: 5, inner: toes ? `<path d="M${x + w * 0.3} ${y + 45}v-6M${x + w * 0.62} ${y + 45}v-6" stroke="${OL}" stroke-width="2" stroke-linecap="round"/>` : '' });
    leg(58, 138, 24); leg(138, 136, 24);
    // body with hump
    const body = [[30, 118], [52, 84], [94, 64], [128, 70], [160, 90], [174, 118], [168, 150], [140, 164], [90, 168], [44, 162], [24, 144]];
    A.part(P(blob(body)), B, { s: 12, inner: `<path d="${blob([[40, 162], [90, 170], [150, 164], [150, 176], [40, 176]])}" fill="${S.b}"/>` });
    // back armour plates, each a pictograph cell
    const plates = [[48, 90], [74, 72], [104, 66], [134, 74]];
    plates.forEach(([x, y], i) => A.part(E(x, y, 16, 12, -20 + i * 12), D, { s: 3, inner: fish(x, y, 6, Y.b) }));
    // flank plate: the big picture graph
    A.part(P(rrd(50, 94, 88, 46, 12)), D, { s: 5, inner: `<path d="${rrd(54, 98, 80, 38, 9)}" fill="none" stroke="${D.l}" stroke-width="2.5"/>` + graph(76, 105, [4, 2, 3], 17, 6, Y.l, 13) });
    // near legs
    leg(34, 139, 30, true); leg(122, 139, 30, true);
    mark(A, Pp, 49, 164, 6, { glow: true }); mark(A, Pp, 137, 164, 6, { glow: true });
    // head
    ears(142, 58, 178, 54, 11);
    A.part(P(blob([[160, 56], [184, 62], [198, 90], [194, 116], [172, 128], [146, 124], [130, 102], [138, 72]])), B, { s: 8, inner: `<ellipse cx="180" cy="108" rx="17" ry="13" fill="${S.b}"/>` });
    crown(A, Pp, 162, 60, 30, 22);
    eyesOnly(A, Pp, m, 154, 86, 180, 84, 9, { far: 0.92, lid: B.b });
    nose(A, 184, 98, 6);
    mouth(A, 182, 109, 4.5, m, 'cat', { fang: true });
  }
}

// ---------- meanicorn: unicorn of averages with an evened-out striped mane
function meanicorn(A, st, Pp, m) {
  const C = Pp.wing, M1 = Pp.main, M2 = Pp.second, Y = Pp.accent, CF = { b: C.s, s: C.d, l: C.b };
  const stripes = (x0, y0, x1, y1, h) => { let o = ''; for (let y = y0, i = 0; y < y1; y += h, i++) o += `<rect x="${x0}" y="${f(y)}" width="${x1 - x0}" height="${f(h)}" fill="${i % 2 ? M2.b : M1.b}"/>`; return o; };
  const horn = (bx, by, tx, ty, w, glow) => {
    const L = Math.hypot(tx - bx, ty - by), ux = (-(ty - by) / L) * w / 2, uy = ((tx - bx) / L) * w / 2;
    if (glow) A.halo(bx + (tx - bx) * 0.6, by + (ty - by) * 0.6, w * 3.2, Y.b);
    let d = '';
    for (let k = 1; k <= 3; k++) { const t = k / 4.2, cx = bx + (tx - bx) * t, cy = by + (ty - by) * t, s = 1 - t; d += `M${f(cx - ux * s)} ${f(cy - uy * s + 2)}L${f(cx + ux * s)} ${f(cy + uy * s - 2)}`; }
    A.part(P(poly([[bx - ux, by - uy], [tx, ty], [bx + ux, by + uy]])), Y, { s: 2, sw: 3, inner: `<path d="${d}" stroke="${Y.s}" stroke-width="2.4"/>` });
    // level "mean" line across the horn
    const t = 0.5, mx = bx + (tx - bx) * t, my = by + (ty - by) * t, hw = w * 0.66;
    A.add(`<path d="M${f(mx - hw)} ${f(my)}H${f(mx + hw)}" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M${f(mx - hw)} ${f(my)}H${f(mx + hw)}" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`);
  };
  const leg = (x, y1, y2, w, far) => {
    A.part(P(blob([[x - w / 2, y1], [x + w / 2, y1], [x + w * 0.42, y2 - 6], [x - w * 0.42, y2 - 6]])), far ? CF : C, { s: 3 });
    A.part(Rr(x - w * 0.55, y2 - 9, w * 1.1, 10, 3), M2, { flat: true, sw: 3 });
  };
  const head = (x, y, s, o = {}) => {
    const T = (pts) => pts.map(([a, b, c]) => [x + a * s, y + b * s, c]);
    A.part(P(blob(leaf([x - 6 * s, y - 20 * s], [x - 12 * s, y - 42 * s], [x + 6 * s, y - 24 * s], 0.35))), C, { s: 3, inner: `<path d="${blob(leaf([x - 5 * s, y - 22 * s], [x - 10 * s, y - 37 * s], [x + 3 * s, y - 24 * s], 0.25))}" fill="${Pp.pink.b}"/>` });
    A.part(P(blob(T([[0, -26], [20, -20], [30, 0], [40, 16], [36, 28], [20, 30], [4, 26], [-16, 16], [-22, -4], [-14, -20]]))), C, { s: 7 * s, inner: `<ellipse cx="${f(x + 28 * s)}" cy="${f(y + 20 * s)}" rx="${f(13 * s)}" ry="${f(10 * s)}" fill="${Pp.pink.l}"/>` });
    A.add(`<ellipse cx="${f(x + 33 * s)}" cy="${f(y + 16 * s)}" rx="${f(2 * s)}" ry="${f(1.4 * s)}" fill="${OL}"/>`);
    if (o.lock) A.part(P(blob(T([[-14, -24], [2, -27], [-2, -14], [-10, -4], [-18, -12]]))), M1, { s: 2, inner: stripes(x - 30 * s, y - 30 * s, x + 6 * s, y, 5 * s) });
    horn(x + 8 * s, y - 20 * s, x + 14 * s, y - 20 * s - o.horn * s, 11 * s, o.glow);
    eyesOnly(A, Pp, m, x - 2 * s, y + 2 * s, x + 20 * s, y + 1 * s, 9 * s, { far: 0.88, farSq: 0.85, lid: o.lid ? C.b : undefined });
    mouth(A, x + 26 * s, y + 25 * s, 3.2 * s, m, 'smile');
  };
  if (st === 1) {
    ground(A, 98, 44);
    const tail = [[64, 140], [44, 136], [34, 152], [40, 170, 1], [52, 158], [66, 152]];
    A.part(P(blob(tail)), M1, { s: 3, inner: stripes(30, 132, 70, 172, 7) });
    leg(74, 150, 184, 12, true); leg(114, 150, 184, 12, true);
    A.part(P(blob([[66, 134], [100, 128], [128, 134], [136, 150], [124, 164], [96, 166], [70, 164], [60, 150]])), C, { s: 7 });
    leg(84, 154, 185, 13); leg(124, 154, 185, 13);
    const mane = [[100, 78], [116, 74], [110, 92], [104, 112], [100, 132], [88, 124], [90, 100]];
    A.part(P(blob(mane)), M1, { s: 3, inner: stripes(80, 70, 120, 136, 8) });
    head(122, 104, 1, { horn: 14 });
    plusSpark(A, 60, 104, 5, Y); plusSpark(A, 160, 76, 4, Y);
  } else if (st === 2) {
    ground(A, 98, 56);
    const tail = [[56, 124], [34, 118], [20, 140], [22, 168, 1], [36, 150], [40, 170, 1], [52, 146], [62, 136]];
    A.part(P(blob(tail)), M1, { s: 4, inner: stripes(14, 112, 66, 172, 8) });
    leg(62, 140, 184, 13, true); leg(118, 140, 184, 13, true);
    A.part(P(blob([[56, 118], [96, 110], [132, 116], [146, 134], [134, 152], [96, 156], [62, 154], [46, 136]])), C, { s: 9 });
    leg(72, 144, 185, 14); leg(130, 142, 185, 14);
    A.part(P(blob([[118, 124], [124, 94], [140, 70], [160, 76], [150, 104], [142, 132]])), C, { s: 6, sil: true });
    const mane = [[132, 50], [150, 50], [136, 70], [124, 96], [118, 124], [108, 110], [112, 80]];
    A.part(P(blob(mane)), M1, { s: 3, inner: stripes(100, 44, 156, 128, 9) });
    head(150, 76, 1.02, { horn: 22, lock: true });
    mark(A, Pp, 96, 134, 6);
    plusSpark(A, 40, 90, 5, Y); plusSpark(A, 184, 56, 4, Y); plusSpark(A, 176, 126, 3.5, Y);
  } else {
    ground(A, 98, 66);
    A.halo(110, 90, 100, Y.b);
    // feathered wing: three fanned rows (indigo primaries, teal secondaries, pale coverts)
    const fan = (T, k, da, sh) => {
      const angs = [-86, -104, -122, -140, -158, -176].map((a) => a + da), lens = [84, 94, 98, 94, 84, 70].map((l) => l * k);
      const at = (a, L, c) => [100 + Math.cos((a * Math.PI) / 180) * L, 110 + Math.sin((a * Math.PI) / 180) * L, c];
      const pts = [[100, 110, 1], at(angs[0] + 8, lens[0] * 0.55)];
      let d = '';
      angs.forEach((a, i) => {
        pts.push(at(a + 5.5, lens[i] * 0.93), at(a, lens[i]), at(a - 5.5, lens[i] * 0.93));
        if (i < angs.length - 1) { const n = at(a - 9, Math.min(lens[i], lens[i + 1]) * 0.88, 1); pts.push(n); const q = at(a - 9, lens[i] * 0.3); d += `M${f(q[0])} ${f(q[1])}L${f(n[0])} ${f(n[1])}`; }
      });
      pts.push(at(angs[5] - 8, lens[5] * 0.55));
      A.part(P(blob(pts)), T, { s: sh, inner: `<path d="${d}" stroke="${T.s}" stroke-width="2.5" stroke-linecap="round"/>` });
    };
    fan(M2, 1, 0, 6); fan(Pp.white, 0.74, 6, 5); fan(M1, 0.46, 10, 4);
    const tail = [[52, 122], [26, 112], [8, 134], [6, 168], [16, 186, 1], [24, 164], [36, 184, 1], [40, 160], [58, 136]];
    A.part(P(blob(tail)), M1, { s: 5, inner: stripes(2, 106, 64, 190, 9) });
    leg(58, 140, 184, 15, true); leg(122, 140, 184, 15, true);
    A.part(P(blob([[52, 116], [96, 106], [136, 112], [152, 132], [140, 154], [96, 158], [58, 156], [40, 136]])), C, { s: 10 });
    leg(70, 146, 185, 16);
    A.part(P(blob([[128, 140], [146, 140], [150, 156], [164, 160], [166, 172], [146, 174], [132, 162]])), C, { s: 3 });
    A.part(E(168, 166, 6, 9, -25), M2, { s: 2 });
    A.part(P(blob([[120, 124], [126, 90], [144, 64], [166, 70], [156, 102], [146, 132]])), C, { s: 6 });
    const mane = [[134, 40], [158, 38], [146, 58], [132, 84], [126, 110], [122, 132], [110, 142, 1], [108, 124], [96, 134, 1], [98, 112], [88, 118, 1], [96, 92], [104, 64], [116, 48]];
    A.part(P(blob(mane)), M1, { s: 4, inner: stripes(84, 34, 160, 144, 10) });
    A.add(`<ellipse cx="160" cy="26" rx="22" ry="6" fill="none" stroke="${OL}" stroke-width="7"/><ellipse cx="160" cy="26" rx="22" ry="6" fill="none" stroke="${Y.l}" stroke-width="3.5"/>`);
    head(154, 70, 1.05, { horn: 28, glow: true, lock: true });
    mark(A, Pp, 94, 132, 8, { glow: true });
    gem(A, Pp, 90, 110, 5);
    for (const [x, y, s] of [[30, 130, 5], [186, 110, 5], [182, 150, 4], [100, 30, 4]]) plusSpark(A, x, y, s, Y);
  }
}

export const PETS_D = {
  tallyfin: { el: 'storm', names: ['Tallyfin', 'Tallyseal', 'Talliath'], draw: tallyfin },
  histohawk: { el: 'storm', names: ['Histohawk', 'Barfalcon', 'Histogryph'], draw: histohawk },
  pictobear: { el: 'storm', names: ['Pictobear', 'Pictogrizz', 'Pictokodiak'], draw: pictobear },
  meanicorn: { el: 'storm', names: ['Meanicorn', 'Medianicorn', 'Averagicorn'], draw: meanicorn },
};

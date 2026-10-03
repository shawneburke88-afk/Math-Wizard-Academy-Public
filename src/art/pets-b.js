// Extra pets (Chamelix, Arborithm, Primeflare). Each draw(A, st, Pp, m) paints one species at stage st (1-3) in a 200x200 box, standing on y≈186.
import { OL, blob, leaf, P, E, Ci, Rr, f, star4d, leafd, mark, sparkle, eye, blush, mouth, nose, sweat, ground, line, shrink, crown, eyesOnly, bushy, stalk } from './creatures.js';

/** Tapered tube outline along a polyline (width w0 at the start, w1 at the rounded tip). */
function tube(pts, w0, w1) {
  const n = pts.length, L = [], R = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = (w0 + ((w1 - w0) * i) / (n - 1)) / 2;
    L.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w]);
    R.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w]);
  });
  const e = pts[n - 1], q = pts[n - 2], dl = Math.hypot(e[0] - q[0], e[1] - q[1]) || 1;
  return blob(L.concat([[e[0] + ((e[0] - q[0]) / dl) * w1 * 0.6, e[1] + ((e[1] - q[1]) / dl) * w1 * 0.6]], R.reverse()));
}

// ---------- chamelix: sly chameleon with an algebra "x" (the unknown) on its side and a spiral tail
function chamelix(A, st, Pp, m) {
  const B = Pp.main, K = Pp.second, Y = Pp.accent, S = Pp.belly;
  const xMark = (x, y, s, glow) => {
    if (glow) A.halo(x, y, s * 2.3, Y.b);
    const d = `M${f(x - s)} ${f(y - s * 0.45)}Q${f(x - s * 0.55)} ${f(y - s * 1.05)} ${f(x - s * 0.2)} ${f(y - s * 0.4)}L${f(x + s * 0.2)} ${f(y + s * 0.4)}Q${f(x + s * 0.55)} ${f(y + s * 1.05)} ${f(x + s)} ${f(y + s * 0.45)}M${f(x + s * 0.72)} ${f(y - s * 0.9)}L${f(x - s * 0.72)} ${f(y + s * 0.9)}`;
    stalk(A, d, glow ? Y.l : Y.b, f(s * 0.36));
  };
  const tail = (x0, y0, cx, cy, r, w0, turns = 1.2) => {
    const pts = [[x0, y0]];
    for (let i = 0; i <= 18; i++) { const t = i / 18, a = -Math.PI / 2 - t * turns * 2 * Math.PI, rr = r * (1 - 0.7 * t); pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
    A.part(P(tube(pts, w0, w0 * 0.32)), B, { s: 4, inner: `<path d="${tube(pts.slice(3), w0 * 0.3, w0 * 0.1)}" fill="${B.l}" opacity=".5" transform="translate(-1 -1)"/>` });
  };
  const legs = (xs, y0, w, far) => xs.forEach((x) => {
    A.part(P(blob([[x - w / 2, y0], [x + w / 2, y0], [x + w * 0.4, 178], [x - w * 0.4, 178]])), far ? B.s : B, { s: 3, sw: 3 });
    A.part(E(x - w * 0.35, 182, w * 0.45, w * 0.3), far ? B.s : B, { s: 2, sw: 2.6 }); A.part(E(x + w * 0.35, 182, w * 0.45, w * 0.3), far ? B.s : B, { s: 2, sw: 2.6 });
  });
  const spots = (arr) => arr.map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.b}" stroke="${OL}" stroke-width="2"/>`).join('');
  const head = (X, Y0, s, o = {}) => {
    const T = (pts) => pts.map(([x, y, c]) => [X + x * s, Y0 + y * s, c]);
    const cq = o.casque || 0;
    A.part(P(blob(T([[-26, -2], [-31 - cq * 3, -20 - cq * 6], [-26 - cq * 3, -34 - cq * 11, 1], [-10, -27 - cq * 3], [6, -20]]))), B, { s: 4, inner: `<path d="M${f(X - 24 * s)} ${f(Y0 - 6 * s)}Q${f(X - 28 * s)} ${f(Y0 - (20 + cq * 6) * s)} ${f(X - (24 + cq * 3) * s)} ${f(Y0 - (31 + cq * 11) * s)}" fill="none" stroke="${cq > 1 ? K.b : Y.b}" stroke-width="${f(4 * s)}" stroke-linecap="round"/>` });
    A.part(P(blob(T([[-28, -8], [-12, -24], [12, -24], [30, -10], [40, 4], [32, 16], [10, 22], [-14, 20], [-30, 8]]))), B, {
      s: 6 * s, inner: `<path d="${blob(T([[-24, 12], [4, 12], [36, 8], [30, 18], [8, 24], [-16, 22]]))}" fill="${S.b}"/>` + `<path d="${blob(T([[-30, 0], [-22, -6], [-16, 4], [-24, 12]]))}" fill="${K.b}"/>`,
    });
    // turret eyes that swivel: the near one looks ahead, the far one peeks up and back
    const t1 = [X + 20 * s, Y0 - 12 * s], t2 = [X - 3 * s, Y0 - 5 * s];
    A.part(Ci(t1[0], t1[1], 10 * s), B, { s: 3, inner: `<circle cx="${f(t1[0])}" cy="${f(t1[1])}" r="${f(8 * s)}" fill="none" stroke="${B.s}" stroke-width="2"/>` });
    eye(A, t1[0], t1[1], 6.2 * s, { mood: m, iris: Pp.eye, look: [-0.3, -0.35], side: -1 });
    A.part(Ci(t2[0], t2[1], 13.5 * s), B, { s: 4, inner: `<circle cx="${f(t2[0])}" cy="${f(t2[1])}" r="${f(11 * s)}" fill="none" stroke="${B.s}" stroke-width="2.4"/>` });
    eye(A, t2[0], t2[1], 8.6 * s, { mood: m, iris: Pp.eye, look: [0.32, 0.06], side: 1, lid: o.lid && m === 'idle' ? B.b : undefined, lidTilt: -0.25 });
    blush(A, X + 10 * s, Y0 + 12 * s, 5 * s, 3 * s);
    A.add(`<circle cx="${f(X + 33 * s)}" cy="${f(Y0 - 1 * s)}" r="${f(1.8 * s)}" fill="${OL}"/>`);
    if (m === 'idle') line(A, `M${f(X + 8 * s)} ${f(Y0 + 11 * s)}Q${f(X + 24 * s)} ${f(Y0 + 15 * s)} ${f(X + 34 * s)} ${f(Y0 + 7 * s)}l${f(2.5 * s)} ${f(-3 * s)}`, f(Math.max(2.4, 2.6 * s)));
    else mouth(A, X + 24 * s, Y0 + 10 * s, 4.2 * s, m, 'smile');
    if (m === 'hurt') sweat(A, X + 36 * s, Y0 - 24 * s, 4.5 * s);
  };
  if (st === 1) {
    ground(A, 100, 44);
    tail(80, 158, 56, 160, 16, 11, 1.1);
    legs([114], 162, 11, true);
    A.part(P(blob([[74, 150], [90, 136], [114, 134], [130, 146], [132, 166], [118, 180], [86, 180], [70, 168]])), B, { s: 7, inner: `<path d="${blob([[70, 166], [100, 170], [134, 162], [130, 184], [70, 184]])}" fill="${S.b}"/>` + spots([[84, 146, 4, K], [120, 150, 3, Y]]) });
    legs([90], 164, 12);
    xMark(102, 158, 9);
    head(124, 116, 0.98);
  } else if (st === 2) {
    ground(A, 98, 58);
    tail(74, 142, 44, 154, 22, 14, 1.15);
    legs([80, 120], 150, 12, true);
    A.part(P(blob([[66, 124], [72, 104, 1], [82, 116], [92, 98, 1], [102, 110], [114, 96, 1], [122, 110], [134, 102, 1], [138, 120]])), Y, { s: 3 });
    A.part(P(blob([[60, 134], [76, 116], [104, 108], [132, 114], [148, 132], [146, 152], [128, 166], [96, 168], [70, 162], [58, 150]])), B, {
      s: 8, inner: `<path d="${blob([[54, 152], [96, 160], [150, 146], [150, 174], [54, 174]])}" fill="${S.b}"/>` + spots([[70, 136, 5, K], [128, 124, 4, K], [84, 120, 3.5, Y], [136, 146, 3, Y]]),
    });
    legs([70, 132], 152, 13);
    xMark(102, 138, 13);
    mark(A, Pp, 46, 158, 5);
    head(144, 104, 1.08, { casque: 1, lid: true });
  } else {
    ground(A, 100, 64);
    A.halo(104, 104, 92, Y.b);
    tail(70, 140, 42, 152, 24, 16, 1.15);
    mark(A, Pp, 42, 153, 5.5, { glow: true });
    legs([84, 126], 150, 13, true);
    A.part(P(blob([[62, 120], [66, 98, 1], [76, 110], [86, 90, 1], [96, 104], [108, 86, 1], [118, 100], [128, 90, 1], [132, 110]])), K, { s: 4 });
    A.part(P(blob([[56, 132], [70, 112], [100, 102], [130, 106], [150, 124], [148, 150], [130, 166], [98, 170], [68, 164], [54, 150]])), B, {
      s: 9, inner: `<path d="${blob([[50, 152], [98, 162], [152, 144], [152, 180], [50, 180]])}" fill="${S.b}"/>` + spots([[66, 134, 5.5, K], [138, 124, 4.5, K], [80, 116, 4, Y], [142, 148, 3.5, Y], [120, 158, 3.5, K]]),
    });
    legs([72, 138], 152, 14);
    xMark(102, 136, 16, true);
    // frill of the unknown: a spiky fan rising behind the head
    const fc = [114, 94], fan = [[fc[0], fc[1] + 8]], rib = [], dots = [];
    for (let i = 0; i <= 12; i++) {
      const a = ((158 + i * 16) * Math.PI) / 180, r = i % 2 ? 40 : 56;
      fan.push([fc[0] + Math.cos(a) * r, fc[1] + Math.sin(a) * r, i % 2 ? 0 : 1]);
      if (!(i % 2)) { rib.push(`M${fc[0]} ${fc[1]}L${f(fc[0] + Math.cos(a) * 50)} ${f(fc[1] + Math.sin(a) * 50)}`); dots.push(`<circle cx="${f(fc[0] + Math.cos(a) * 36)}" cy="${f(fc[1] + Math.sin(a) * 36)}" r="3.4" fill="${Y.l}" stroke="${OL}" stroke-width="1.5"/>`); }
    }
    A.part(P(blob(fan)), K, { s: 5, inner: `<path d="${rib.join('')}" stroke="${K.s}" stroke-width="3"/><circle cx="${fc[0]}" cy="${fc[1]}" r="36" fill="none" stroke="${Y.b}" stroke-width="5"/>` + dots.join('') });
    head(142, 90, 1.08, { casque: 2, lid: true });
    for (const [x, y] of [[70, 44], [166, 40], [178, 64]]) A.add(sparkle(x, y, 4.5, Y.l, OL, 1.4));
  }
}

// ---------- arborithm: forest stag whose antlers branch by doubling (1 -> 2 -> 4 -> 8 tips)
function arborithm(A, st, Pp, m) {
  const B = Pp.main, S = Pp.belly, D = Pp.dark, Y = Pp.accent, K = Pp.second;
  const bloom = (x, y, r) => {
    let o = '', c = '';
    for (let i = 0; i < 5; i++) { const a = (i * 72 - 90) * Math.PI / 180, px = f(x + Math.cos(a) * r * 0.62), py = f(y + Math.sin(a) * r * 0.62); o += `<circle cx="${px}" cy="${py}" r="${f(r * 0.55 + 1.6)}"/>`; c += `<circle cx="${px}" cy="${py}" r="${f(r * 0.55)}"/>`; }
    A.add(`<g fill="${OL}">${o}</g><g fill="${K.l}">${c}</g><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.34)}" fill="${Y.b}" stroke="${OL}" stroke-width="1.4"/>`);
  };
  const antler = (x, y, ang, len, depth, w, far, glow) => {
    let o = '', c = '', lv = '', rib = '';
    const tips = [];
    const grow = (x1, y1, a, l, d, ww) => {
      const r = (a * Math.PI) / 180, x2 = x1 + Math.sin(r) * l, y2 = y1 - Math.cos(r) * l;
      const seg = `M${f(x1)} ${f(y1)}Q${f((x1 + x2) / 2 - Math.cos(r) * l * 0.1)} ${f((y1 + y2) / 2 - Math.sin(r) * l * 0.1)} ${f(x2)} ${f(y2)}`;
      o += `<path d="${seg}" stroke-width="${f(ww + 4.4)}"/>`;
      c += `<path d="${seg}" stroke-width="${f(ww)}"/>`;
      if (!d) { tips.push([x2, y2, a]); return; }
      const sp = 8 + d * 8; // each fork doubles the tips: 1 -> 2 -> 4 -> 8
      grow(x2, y2, a - sp, l * 0.78, d - 1, ww * 0.8);
      grow(x2, y2, a + sp, l * 0.78, d - 1, ww * 0.8);
    };
    grow(x, y, ang, len, depth, w);
    const ls = depth ? 7.4 - depth * 0.6 : 8, blooms = [];
    const at = tips.map(([tx, ty, a]) => { const r = (a * Math.PI) / 180; return [tx + Math.sin(r) * ls * 0.8, ty - Math.cos(r) * ls * 0.8, a]; });
    if (glow) at.forEach(([cx, cy]) => A.halo(cx, cy, ls * 1.9, Y.b));
    A.add(`<g fill="none" stroke="${OL}" stroke-linecap="round">${o}</g><g fill="none" stroke="${far ? S.s : S.b}" stroke-linecap="round">${c}</g>`);
    at.forEach(([cx, cy, a], i) => {
      if (depth > 1 && i % 3 === 1) { blooms.push([cx, cy]); return; }
      const r = ((a + 180) * Math.PI) / 180;
      lv += blob(leafd(cx, cy, ls, a + 180));
      rib += `M${f(cx + Math.sin(r) * ls * 0.6)} ${f(cy - Math.cos(r) * ls * 0.6)}L${f(cx - Math.sin(r) * ls * 0.6)} ${f(cy + Math.cos(r) * ls * 0.6)}`;
    });
    const T = far ? B : Y;
    A.add(`<path d="${lv}" fill="${glow && !far ? T.l : T.b}" stroke="${OL}" stroke-width="2.4"/><path d="${rib}" stroke="${T.s}" stroke-width="1.6" stroke-linecap="round"/>`);
    blooms.forEach(([cx, cy]) => bloom(cx, cy, ls * 0.95));
  };
  const leg = (x, y0, w, y1 = 180, far) => {
    A.part(P(blob([[x - w / 2, y0], [x + w / 2, y0], [x + w * 0.3, y1 - 12], [x + w * 0.26, y1], [x - w * 0.26, y1], [x - w * 0.34, y1 - 12]])), far ? B.s : B, { s: 3 });
    A.part(Rr(x - w * 0.38, y1 - 3, w * 0.76, 8, 3), D, { s: 2, sw: 3 });
  };
  const head = (X, Y0, s, o = {}) => {
    const T = (pts) => pts.map(([x, y, c]) => [X + x * s, Y0 + y * s, c]);
    const ad = o.depth ?? 0, al = o.len ?? 10;
    antler(X + 14 * s, Y0 - 20 * s, (o.lean ?? 12) * 0.85, al * 0.92, ad, o.aw ?? 5, true, o.glow);
    A.part(P(blob(T(leaf([10, -16], [38, -32], [22, -4], 0.42)))), B, { s: 3, inner: `<path d="${blob(T(leaf([14, -14], [32, -28], [22, -8], 0.3)))}" fill="${K.l}"/>` });
    antler(X - 6 * s, Y0 - 18 * s, -(o.lean ?? 12), al, ad, o.aw ?? 5, false, o.glow);
    A.part(P(blob(T(leaf([-16, -12], [-48, -22], [-14, 2], 0.42)))), B, { s: 3, inner: `<path d="${blob(T(leaf([-18, -9], [-42, -19], [-16, -1], 0.3)))}" fill="${K.l}"/>` });
    A.part(P(blob(T([[-4, -22], [16, -21], [28, -8], [40, 4], [44, 14], [34, 24], [14, 26], [-8, 22], [-22, 10], [-24, -8]]))), B, {
      s: 7 * s, inner: `<path d="${blob(T([[14, 4], [38, 5], [46, 15], [34, 26], [12, 26], [6, 15]]))}" fill="${S.b}"/>`,
    });
    if (o.gem) mark(A, Pp, X + 4 * s, Y0 - 12 * s, 5 * s, { glow: true, rot: 0 });
    eyesOnly(A, Pp, m, X - 6 * s, Y0 - 1 * s, X + 17 * s, Y0 - 3 * s, 8.5 * s, { far: 0.9, lid: o.lid ? B.b : undefined });
    nose(A, X + 40 * s, Y0 + 11 * s, 4.2 * s);
    mouth(A, X + 34 * s, Y0 + 18 * s, 3.4 * s, m, 'smile');
  };
  if (st === 1) {
    ground(A, 100, 44);
    leg(80, 160, 9, 180, true); leg(118, 160, 9, 180, true);
    A.part(E(68, 142, 7, 5, -30), S, { s: 2 });
    A.part(P(blob([[72, 142], [100, 136], [124, 140], [134, 154], [126, 168], [100, 170], [76, 168], [64, 154]])), B, {
      s: 7, inner: E(100, 170, 26, 7).replace('/>', ` fill="${S.b}"/>`) + [[80, 146], [92, 142], [86, 154], [104, 146]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${S.b}"/>`).join(''),
    });
    leg(88, 162, 10); leg(124, 162, 10);
    head(118, 110, 1.08, { depth: 0, len: 10, aw: 4.5 });
  } else if (st === 2) {
    ground(A, 100, 58);
    leg(80, 146, 11, 181, true); leg(128, 146, 11, 181, true);
    A.part(E(54, 122, 8, 5.5, -35), S, { s: 2 });
    A.part(P(blob([[56, 124], [90, 116], [126, 116], [144, 128], [142, 150], [116, 158], [74, 158], [52, 146]])), B, { s: 8, inner: E(100, 160, 38, 10).replace('/>', ` fill="${S.b}"/>`) });
    leg(68, 146, 13, 182); leg(132, 144, 13, 182);
    A.part(P(blob([[118, 136], [124, 108], [134, 88], [154, 86], [158, 106], [150, 134]])), B, { s: 6 });
    A.part(P(blob([[146, 98], [158, 106], [154, 124], [146, 136], [140, 118]])), S, { s: 3 });
    mark(A, Pp, 88, 136, 5);
    head(146, 80, 0.96, { depth: 2, len: 17, aw: 4.4, lean: 26 });
  } else {
    ground(A, 98, 66);
    A.halo(140, 44, 56, Y.b);
    A.halo(96, 120, 80, Y.b);
    leg(72, 144, 12, 181, true); leg(124, 144, 12, 181, true);
    A.part(E(40, 118, 9, 6, -35), S, { s: 2 });
    A.part(P(blob([[42, 120], [80, 110], [120, 110], [142, 124], [140, 150], [112, 160], [64, 160], [36, 146]])), B, {
      s: 9, inner: E(92, 162, 44, 11).replace('/>', ` fill="${S.b}"/>`) + `<path d="${star4d(70, 128, 5)}${star4d(90, 124, 3.5)}" fill="${Y.l}"/>`,
    });
    leg(58, 144, 14, 183); leg(130, 142, 14, 183);
    A.part(P(blob([[106, 134], [112, 104], [124, 86], [146, 84], [150, 104], [142, 132]])), B, { s: 6 });
    A.part(P(blob([[140, 96], [152, 104], [148, 122], [140, 134], [134, 116]])), S, { s: 3 });
    // leafy mane: a ruff of leaves around the neck
    let ruff = '', rk = '';
    [236, 210, 184, 158, 132, 106, 80, 54, 28].forEach((a, i) => { const r = (a * Math.PI) / 180, d = blob(leafd(126 + Math.cos(r) * 24, 118 + Math.sin(r) * 17, 10, a - 90)); if (i % 2) rk += d; else ruff += d; });
    A.add(`<path d="${ruff}" fill="${Y.b}" stroke="${OL}" stroke-width="2.6"/><path d="${rk}" fill="${K.b}" stroke="${OL}" stroke-width="2.6"/>`);
    mark(A, Pp, 78, 138, 7, { glow: true });
    head(138, 84, 0.98, { depth: 3, len: 16, aw: 5, lean: 34, glow: true, lid: true, gem: true });
  }
}

// ---------- primeflare: phoenix whose plumes come in prime numbers (2, 3, 5, 7)
function primeflare(A, st, Pp, m) {
  const G = Pp.main, V = Pp.second, C = Pp.belly, Y = Pp.accent;
  const plumes = (x, y, n, len, w, a0, a1, bend, glow, ky = 1) => {
    for (let i = 0; i < n; i++) {
      const a = ((a0 + ((a1 - a0) * i) / Math.max(1, n - 1)) * Math.PI) / 180, b = a + (bend * Math.PI) / 180;
      const t = bushy([x, y], [x + Math.cos(b) * len * 0.55, y + Math.sin(b) * len * 0.55 * ky], [x + Math.cos(a) * len, y + Math.sin(a) * len * ky], w, 0.58);
      A.part(P(t.d), i % 2 ? Y : G, { s: 3, sw: 3, inner: `<path d="${t.tipD}" fill="${V.b}"/>` });
      const [sx, sy] = t.at(0.8);
      A.add(sparkle(sx, sy, w * 0.72, glow ? '#fff' : Y.l, OL, 1.8));
    }
  };
  const feet = (x, y, s = 1) => A.add(`<path d="M${f(x - 9 * s)} ${y + 2}L${x} ${f(y - 6 * s)}L${f(x + 9 * s)} ${y + 2}M${x} ${f(y - 6 * s)}L${f(x + 2 * s)} ${y + 3}" fill="none" stroke="${OL}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M${f(x - 9 * s)} ${y + 2}L${x} ${f(y - 6 * s)}L${f(x + 9 * s)} ${y + 2}M${x} ${f(y - 6 * s)}L${f(x + 2 * s)} ${y + 3}" fill="none" stroke="${V.b}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`);
  const beak = (x, y, s) => A.part(P(blob([[x, y - 5 * s], [x + 12 * s, y - 2 * s], [x + 18 * s, y + 2 * s, 1], [x + 8 * s, y + 6 * s], [x, y + 5 * s]])), V, { s: 2, sw: 3 });
  const flameWing = (pts, glow, stars = []) => A.part(P(blob(pts)), G, {
    s: 6, inner: `<path d="${blob(shrink(pts, 0.62, 4, 4))}" fill="${Y.b}"/><path d="${blob(shrink(pts, 0.3, 6, 6))}" fill="${glow ? Y.l : C.b}"/>` + stars.map(([x, y, r]) => `<path d="${star4d(x, y, r, 0.22)}" fill="${V.b}" stroke="${OL}" stroke-width="1.8"/>`).join(''),
  });
  if (st === 1) {
    ground(A, 100, 40);
    plumes(78, 152, 2, 50, 8.5, 190, 218, 16);
    feet(92, 182); feet(112, 182);
    A.part(P(blob([[88, 120], [82, 94, 1], [96, 108], [104, 84, 1], [110, 106], [124, 94, 1], [118, 122]])), V, { s: 3, inner: `<path d="${blob([[94, 118], [96, 104, 1], [104, 112], [110, 102, 1], [112, 120]])}" fill="${V.l}"/>` });
    A.part(P(blob([[102, 110], [128, 116], [142, 140], [136, 166], [114, 180], [88, 180], [66, 166], [60, 140], [74, 116]])), G, { s: 8, inner: E(108, 160, 22, 17).replace('/>', ` fill="${C.b}"/>`) });
    flameWing([[94, 150], [82, 146], [66, 154, 1], [76, 159], [66, 167, 1], [78, 169], [72, 178, 1], [90, 174], [98, 164]]);
    eyesOnly(A, Pp, m, 100, 134, 124, 133, 9.5);
    beak(122, 147, 0.9);
    mark(A, Pp, 112, 166, 4.5);
  } else if (st === 2) {
    ground(A, 100, 52);
    plumes(80, 138, 5, 74, 9, 158, 208, -22);
    stalk(A, 'M96 160L94 180', V.b, 3.5); stalk(A, 'M116 160L118 180', V.b, 3.5);
    feet(94, 183); feet(118, 183);
    A.part(P(blob([[108, 96], [132, 104], [142, 128], [136, 152], [116, 166], [92, 166], [74, 152], [72, 128], [86, 106]])), G, { s: 8, inner: `<path d="${blob([[126, 110], [140, 128], [134, 152], [114, 164], [100, 150], [108, 124]])}" fill="${C.b}"/>` });
    A.part(P(blob([[122, 62], [98, 38, 1], [114, 50], [110, 26, 1], [126, 46], [134, 28, 1], [138, 58]])), V, { s: 3, inner: `<path d="M104 42L122 58M112 32L126 54M132 34L134 56" stroke="${V.l}" stroke-width="3"/>` });
    A.part(P(blob([[132, 54], [150, 60], [158, 76], [152, 94], [134, 102], [116, 96], [110, 78], [116, 62]])), G, { s: 6 });
    flameWing([[120, 112], [98, 108], [72, 118], [50, 128, 1], [68, 134], [52, 146, 1], [76, 146], [62, 160, 1], [90, 156], [116, 146]], false, [[96, 130, 5]]);
    eyesOnly(A, Pp, m, 126, 78, 147, 77, 8.5);
    beak(148, 86, 0.95);
    mark(A, Pp, 124, 134, 5.5);
  } else {
    ground(A, 100, 60);
    A.halo(100, 92, 96, Y.b);
    plumes(104, 142, 7, 90, 9, 196, -16, 0, true, 0.4);
    const wing = [[92, 110], [70, 86], [46, 56], [22, 26, 1], [32, 54], [12, 56, 1], [28, 76], [10, 86, 1], [30, 98], [16, 116, 1], [44, 116], [36, 134, 1], [66, 126], [88, 130]];
    flameWing(wing, true);
    flameWing(wing.map(([x, y, c]) => [204 - x, y - 4, c]), true);
    for (const [x, y, r] of [[46, 84, 7], [158, 80, 7], [30, 62, 4], [174, 58, 4]]) mark(A, Pp, x, y, r, { glow: true, col: V.l });
    stalk(A, 'M96 160L94 180', V.b, 4); stalk(A, 'M118 160L120 180', V.b, 4);
    feet(94, 184, 1.1); feet(120, 184, 1.1);
    A.part(P(blob([[106, 60], [132, 70], [144, 102], [140, 138], [120, 166], [92, 166], [70, 140], [68, 102], [80, 70]])), G, { s: 10, inner: `<path d="${blob([[106, 104], [128, 114], [130, 146], [108, 164], [86, 146], [86, 114]])}" fill="${C.b}"/>` });
    mark(A, Pp, 107, 136, 9, { glow: true });
    A.part(P(blob([[88, 66], [70, 30, 1], [90, 48], [92, 16, 1], [104, 42], [116, 14, 1], [120, 44], [140, 26, 1], [128, 62], [144, 44, 1], [132, 72]])), V, { s: 4, inner: `<path d="M76 36L92 60M93 22L100 52M116 20L114 50M138 30L124 60" stroke="${V.l}" stroke-width="3"/>` });
    crown(A, Pp, 106, 62, 30, 16, 3, Y);
    eyesOnly(A, Pp, m, 94, 90, 121, 89, 10, { lid: G.b });
    beak(118, 102, 1.1);
  }
}

export const PETS_B = {
  chamelix: { el: 'vine', names: ['Chamelix', 'Variameleon', 'Unknownix'], draw: chamelix },
  arborithm: { el: 'vine', names: ['Arborithm', 'Doublehorn', 'Arborex'], draw: arborithm },
  primeflare: { el: 'star', names: ['Primeflare', 'Primewing', 'Primordix'], draw: primeflare },
};

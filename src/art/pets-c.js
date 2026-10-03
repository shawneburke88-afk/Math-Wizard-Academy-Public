// Extra pets (Prismouse, Areadillo, Golemetry). Each draw(A, st, Pp, m) paints one species at stage st (1-3) in a 200x200 box, standing on y≈186.
import { OL, blob, poly, leaf, P, E, Ci, Rr, f, diamd, mark, blush, mouth, ground, line, eyes, eyesOnly, sweat } from './creatures.js';

// ---------- 3D solid helpers (Shape & Space family). Light from top-left: top face light, front base, right face shade.
const pp = (p) => `${f(p[0])} ${f(p[1])}`;
/** Box with front face (x, y, w, h) and depth d receding up-right. o: {inner, top, side, ew} */
function box(A, x, y, w, h, d, T, o = {}) {
  const dx = d * 0.62, dy = -d * 0.5;
  const a = [x, y], b = [x + w, y], c = [x + w, y + h], q = [x, y + h];
  const e = [x + dx, y + dy], g = [x + w + dx, y + dy], k = [x + w + dx, y + h + dy];
  const inner = `<path d="${poly([a, e, g, b])}" fill="${o.top || T.l}"/><path d="${poly([b, g, k, c])}" fill="${o.side || T.s}"/>${o.inner || ''}`
    + `<path d="M${pp(a)}L${pp(b)}L${pp(c)}M${pp(b)}L${pp(g)}" fill="none" stroke="${OL}" stroke-width="${o.ew ?? 2.2}"/>`;
  A.part(P(poly([q, a, e, g, k, c])), T, { flat: true, inner, sw: o.sw });
}
/** Cone with base centre (x, y), radius r, height h, rotated by ang degrees; optional inner-ear colour. */
function cone(A, x, y, r, h, ang, T, inT) {
  const tf = `translate(${f(x)} ${f(y)}) rotate(${f(ang)})`;
  const d = `M${f(-r)} 0L0 ${f(-h)}L${f(r)} 0A${f(r)} ${f(r * 0.38)} 0 0 1 ${f(-r)} 0Z`;
  let g = `<path d="${poly([[0, -h], [r * 0.3, r * 0.5], [r * 1.4, r * 0.5], [r * 1.4, -h]])}" fill="${T.s}"/>`
    + `<path d="${poly([[0, -h], [-r * 0.5, r * 0.5], [-r * 1.4, r * 0.5], [-r * 1.4, -h]])}" fill="${T.l}"/>`;
  if (inT) g += `<path d="${poly([[-r * 0.45, -r * 0.05], [0, -h * 0.78], [r * 0.3, -r * 0.05]])}" fill="${inT.b}"/>`;
  g += `<path d="M0 ${f(-h)}L${f(r * 0.3)} ${f(r * 0.37)}" stroke="${OL}" stroke-width="1.8"/>`;
  A.part(P(d, tf), T, { flat: true, inner: `<g transform="${tf}">${g}</g>` });
}
/** Cylinder from (x1,y1) to (x2,y2), radius r; the far end shows its round cap. */
function cyl(A, x1, y1, x2, y2, r, T, cap) {
  const L = Math.hypot(x2 - x1, y2 - y1), ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const tf = `translate(${f(x1)} ${f(y1)}) rotate(${f(ang)})${Math.cos((ang * Math.PI) / 180) < 0 ? ' scale(1 -1)' : ''}`;
  const e = r * 0.4;
  const d = `M0 ${f(-r)}H${f(L)}A${f(e)} ${f(r)} 0 0 1 ${f(L)} ${f(r)}H0A${f(e)} ${f(r)} 0 0 1 0 ${f(-r)}Z`;
  const g = `<rect x="${f(-r)}" y="${f(r * 0.3)}" width="${f(L + 2 * r)}" height="${f(r)}" fill="${T.s}"/><rect x="${f(-r)}" y="${f(-r * 0.72)}" width="${f(L + 2 * r)}" height="${f(r * 0.32)}" fill="${T.l}"/>`
    + `<ellipse cx="${f(L)}" cy="0" rx="${f(e)}" ry="${f(r)}" fill="${(cap || T).l}" stroke="${OL}" stroke-width="2"/>`;
  A.part(P(d, tf), T, { flat: true, inner: `<g transform="${tf}">${g}</g>`, sw: r < 6 ? 3 : 3.5 });
}
/** Shaded sphere with a glint. */
function sph(A, x, y, r, T) {
  A.part(Ci(x, y, r), T, { s: r * 0.6, sw: r < 8 ? 2.6 : 3.2 });
  A.add(`<ellipse cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.4)}" rx="${f(r * 0.3)}" ry="${f(r * 0.2)}" fill="#fff" opacity=".85"/>`);
}
/** Octahedron crystal (diamond outline with four facets). */
function octa(A, x, y, rx, ry, T, glow) {
  if (glow) A.halo(x, y, Math.max(rx, ry) * 2.1, T.b);
  const t = [x, y - ry], b = [x, y + ry], l = [x - rx, y], r = [x + rx, y], c = [x + rx * 0.2, y + ry * 0.06];
  const g = `<path d="${poly([t, l, c])}" fill="${T.l}"/><path d="${poly([c, b, r])}" fill="${T.s}"/>`
    + `<path d="M${pp(t)}L${pp(c)}L${pp(b)}M${pp(l)}L${pp(c)}L${pp(r)}" fill="none" stroke="${OL}" stroke-width="1.8"/>`;
  A.part(P(poly([t, r, b, l])), T, { flat: true, inner: g, sw: rx < 7 ? 2.6 : 3.2 });
  if (glow) A.add(`<path d="M${f(x - rx * 0.45)} ${f(y - ry * 0.5)}l${f(rx * 0.25)} ${f(-ry * 0.25)}" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`);
}
/** Hexagonal-prism crystal shard, base at (x, y), pointing up, rotated ang. */
function shard(A, x, y, w, h, ang, T, glow) {
  const tf = `translate(${f(x)} ${f(y)}) rotate(${f(ang)})`, tip = h + w * 1.1;
  if (glow) A.halo(x + Math.sin((ang * Math.PI) / 180) * h * 0.7, y - Math.cos((ang * Math.PI) / 180) * h * 0.7, w * 2.6, T.b);
  const g = `<path d="${poly([[-w, 6], [-w, -h], [0, -tip], [-w * 0.3, -h], [-w * 0.3, 6]])}" fill="${T.l}"/><path d="${poly([[w * 0.35, 6], [w * 0.35, -h], [0, -tip], [w, -h], [w, 6]])}" fill="${T.s}"/>`
    + `<path d="M${f(-w * 0.3)} 6V${f(-h)}L0 ${f(-tip)}L${f(w * 0.35)} ${f(-h)}V6" fill="none" stroke="${OL}" stroke-width="1.6"/>`;
  A.part(P(poly([[-w, 6], [-w, -h], [0, -tip], [w, -h], [w, 6]]), tf), T, { flat: true, inner: `<g transform="${tf}">${g}</g>`, sw: w < 7 ? 2.8 : 3.4 });
}

// ---------- prismouse: quick mouse built from 3D solids (cube body, cone ears, cylinder tail, sphere cheeks)
function prismouse(A, st, Pp, m) {
  const B = Pp.main, S = Pp.second, K = Pp.pink;
  const tail = (pts, r0) => {
    for (let i = 0; i < pts.length - 1; i++) cyl(A, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r0 * (1 - i * 0.14), i % 2 ? B : S);
  };
  const ear = (x, y, r) => {
    A.part(Ci(x + r * 0.22, y - r * 0.14, r), { b: S.s, s: S.d, l: S.b }, { flat: true });
    A.part(Ci(x, y, r), S, { s: r * 0.35, inner: Ci(x + r * 0.08, y + r * 0.06, r * 0.62).replace('/>', ` fill="${K.b}"/>`) });
  };
  const mFace = (x, y, s, lid) => {
    sph(A, x - 22 * s, y + 15 * s, 6.5 * s, K); sph(A, x + 20 * s, y + 15 * s, 6.5 * s, K);
    eyes(A, Pp, x - 11 * s, y, x + 13 * s, y - s, 10 * s, m, { far: 1, farSq: 1, sq: 0.85, lid: lid ? B.b : undefined });
    mouth(A, x + 1 * s, y + 18 * s, 4.2 * s, m, 'cat');
    if (m === 'hurt') sweat(A, x - 26 * s, y - 14 * s, 5);
  };
  const snout = (x, y, s) => {
    cone(A, x, y, 12 * s, 28 * s, 98, Pp.belly);
    const nx = x + 27.7 * s, ny = y + 3.9 * s;
    line(A, `M${f(nx - 8 * s)} ${f(ny - 4 * s)}l-2 -12M${f(nx - 12 * s)} ${f(ny - 3 * s)}l-6 -10M${f(nx - 6 * s)} ${f(ny + 5 * s)}l2 10`, 2);
    sph(A, nx, ny, 5.5 * s, K);
  };
  if (st === 1) {
    ground(A, 100, 46);
    tail([[70, 170], [52, 176], [38, 168], [32, 152]], 5.5);
    sph(A, 32, 146, 6.5, Pp.accent);
    ear(74, 104, 17); ear(124, 98, 17);
    box(A, 66, 116, 64, 62, 22, B, { inner: `<rect x="66" y="166" width="64" height="12" fill="${Pp.belly.b}"/>` });
    box(A, 74, 174, 18, 9, 7, S); box(A, 104, 174, 18, 9, 7, S);
    mFace(92, 138, 0.95);
    snout(134, 148, 1);
    mark(A, Pp, 105, 110, 4);
  } else if (st === 2) {
    ground(A, 102, 60);
    const prism = (x1, y1, x2, y2, r, T) => {
      const L = Math.hypot(x2 - x1, y2 - y1), tf = `translate(${f(x1)} ${f(y1)}) rotate(${f((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI)})`;
      const g = `<path d="${poly([[L, -r], [L + r * 0.6, 0], [L, r]])}" fill="${T.l}"/><path d="M-4 ${f(r * 0.1)}H${f(L)}" stroke="${OL}" stroke-width="1.8"/><rect x="-4" y="${f(r * 0.1)}" width="${f(L + 4)}" height="${f(r)}" fill="${T.s}"/>`;
      A.part(P(poly([[0, -r], [L, -r], [L + r * 0.6, 0], [L, r], [0, r]]), tf), T, { flat: true, inner: `<g transform="${tf}">${g}<path d="M${f(L)} ${f(-r)}V${f(r)}" stroke="${OL}" stroke-width="2"/></g>` });
    };
    const tl = [[58, 146], [40, 146], [26, 136], [18, 120], [18, 102]];
    for (let i = 0; i < tl.length - 1; i++) prism(tl[i][0], tl[i][1], tl[i + 1][0], tl[i + 1][1], 8 - i * 1.3, i % 2 ? B : S);
    shard(A, 18, 104, 5, 6, -4, Pp.accent);
    cyl(A, 70, 150, 66, 176, 6.5, S); cyl(A, 128, 146, 134, 174, 6.5, S);
    box(A, 50, 116, 72, 44, 26, B, { inner: `<rect x="50" y="148" width="72" height="12" fill="${Pp.belly.b}"/>` });
    mark(A, Pp, 78, 132, 6);
    cyl(A, 64, 150, 56, 176, 7, B); cyl(A, 112, 150, 118, 176, 7, B);
    box(A, 46, 174, 20, 9, 7, S); box(A, 110, 174, 20, 9, 7, S);
    ear(118, 70, 18); ear(160, 62, 18);
    box(A, 110, 78, 50, 48, 24, B);
    mFace(128, 100, 0.85);
    snout(163, 108, 0.9);
  } else {
    ground(A, 100, 72);
    // crystal cape streaming behind (triangular facets)
    const cp = [[124, 80], [84, 70], [44, 66], [8, 72, 1], [22, 84], [4, 98, 1], [26, 102], [12, 120, 1], [38, 114], [34, 134, 1], [56, 112], [96, 100]];
    let fac = '';
    for (let i = 1; i < cp.length - 1; i += 2) fac += `M124 80L${pp(cp[i])}L${pp(cp[i + 1])}Z`;
    A.halo(52, 90, 60, Pp.accent.b);
    A.part(P(poly(cp)), Pp.accent, { flat: true, inner: `<path d="${fac}" fill="${Pp.accent.l}"/><path d="${cp.slice(1, -1).map((p) => `M124 80L${pp(p)}`).join('')}" stroke="${Pp.accent.s}" stroke-width="2"/>` });
    tail([[48, 148], [28, 162], [12, 154]], 6.5);
    octa(A, 10, 142, 6, 10, Pp.accent, true);
    cyl(A, 64, 142, 42, 172, 7, S); cyl(A, 128, 140, 146, 172, 7, S);
    const glint = [[60, 120], [104, 124]].map(([x, y]) => `<path d="${diamd(x, y, 5)}" fill="${Pp.accent.l}" stroke="${OL}" stroke-width="1.6"/>`).join('');
    box(A, 38, 102, 88, 48, 30, B, { inner: `<rect x="38" y="138" width="88" height="12" fill="${Pp.belly.b}"/>${glint}`, top: Pp.accent.l });
    mark(A, Pp, 132, 116, 6, { glow: true });
    cyl(A, 58, 142, 50, 176, 8, B); cyl(A, 114, 142, 126, 176, 8, B);
    box(A, 38, 174, 22, 10, 8, S); box(A, 116, 174, 22, 10, 8, S);
    ear(110, 56, 19); ear(166, 46, 19);
    box(A, 110, 62, 52, 48, 24, B);
    A.halo(144, 38, 34, Pp.accent.b);
    octa(A, 130, 48, 6, 10, Pp.accent); octa(A, 158, 42, 6, 10, Pp.accent);
    octa(A, 144, 36, 9, 15, Pp.gem, true);
    mFace(130, 86, 0.9, true);
    snout(165, 92, 0.95);
  }
}

// ---------- areadillo: armadillo whose shell is a grid of square area tiles
function areadillo(A, st, Pp, m) {
  const B = Pp.main, S = Pp.second, L = Pp.belly;
  const grid = (x0, y0, t, n, k, glow = []) => {
    let g = '', bev = '', band = '';
    for (let i = 0; i < n; i++) if (i % 2) band += `M${f(x0 + i * t)} ${y0 - 60}h${f(t)}v260h${f(-t)}Z`;
    for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) bev += `M${f(x0 + i * t + 4)} ${f(y0 + j * t + t - 5)}V${f(y0 + j * t + 4)}H${f(x0 + i * t + t - 5)}`;
    for (let i = 0; i <= n; i++) g += `M${f(x0 + i * t)} ${y0 - 60}V${y0 + 200}`;
    for (let j = 0; j <= k; j++) g += `M${x0 - 60} ${f(y0 + j * t)}H${x0 + 260}`;
    let gl = '';
    for (const [i, j] of glow) gl += `<path d="${diamd(x0 + (i + 0.5) * t, y0 + (j + 0.5) * t, t * 0.3)}" fill="${Pp.accent.l}" stroke="${OL}" stroke-width="1.8"/>`;
    return `<path d="${band}" fill="${S.b}" opacity=".45"/><path d="${bev}" fill="none" stroke="${B.l}" stroke-width="2.4" stroke-linecap="round" opacity=".9"/><path d="${g}" stroke="${OL}" stroke-width="3"/>${gl}`;
  };
  const skirt = (x, y, w, h, t, glow) => {
    let d = '';
    for (let xx = x + t; xx < x + w - 2; xx += t) d += `M${f(xx)} ${y}v${h}`;
    A.part(Rr(x, y, w, h, h / 2), glow ? Pp.accent : S, { s: 3, inner: `<path d="${d}" stroke="${OL}" stroke-width="2.4"/>` });
  };
  const head = (pts, eyeA, eyeB, r, nosePt, earPts, o = {}) => {
    A.part(P(blob(earPts)), L, { s: 4, inner: `<path d="${blob(earPts.map(([x, y]) => [x + (o.ex ?? 2), y + 3]))}" transform="translate(${f(earPts[0][0] * 0.35)} ${f(earPts[0][1] * 0.35)}) scale(.65)" fill="${Pp.pink.b}"/>` });
    A.part(P(blob(pts)), L, { s: 6 });
    if (o.plate) o.plate();
    eyesOnly(A, Pp, m, eyeA[0], eyeA[1], eyeB[0], eyeB[1], r, { far: 0.92, lid: o.lid ? B.b : undefined });
    A.add(`<ellipse cx="${nosePt[0]}" cy="${nosePt[1]}" rx="${f(r * 0.55)}" ry="${f(r * 0.42)}" fill="${Pp.pink.s}" stroke="${OL}" stroke-width="2.2"/><path d="M${f(nosePt[0] - 1.8)} ${nosePt[1]}v.1M${f(nosePt[0] + 1.8)} ${nosePt[1]}v.1" stroke="${OL}" stroke-width="2.4" stroke-linecap="round"/>`);
    mouth(A, nosePt[0] - r * 0.9, nosePt[1] + r * 0.85, r * 0.45, m, 'cat');
  };
  const legs = (arr, w, h) => arr.forEach(([x, y]) => A.part(P(blob([[x - w / 2, y], [x + w / 2, y], [x + w / 2 + 1, y + h, 1], [x - w / 2 - 3, y + h, 1]])), L, { s: 4, inner: `<path d="M${f(x - w * 0.15)} ${f(y + h)}v-5M${f(x + w * 0.2)} ${f(y + h)}v-5" stroke="${OL}" stroke-width="2.2" stroke-linecap="round"/>` }));
  if (st === 1) {
    ground(A, 100, 50);
    A.part(P(blob([[66, 170], [44, 176], [30, 170, 1], [44, 184], [70, 182]])), L, { s: 3, inner: `<path d="M40 172v10M50 170v12" stroke="${S.s}" stroke-width="2.5"/>` });
    legs([[76, 168], [112, 170]], 16, 14);
    const sh = [[96, 94], [128, 102], [146, 128], [146, 158], [128, 176], [96, 180], [66, 176], [50, 158], [50, 126], [64, 102]];
    A.part(P(blob(sh)), B, { s: 9, inner: grid(58, 100, 25, 4, 4) });
    mark(A, Pp, 95.5, 137.5, 6);
    head([[140, 132], [158, 126], [172, 136], [184, 150], [182, 160], [166, 166], [146, 166], [132, 156], [130, 142]], [148, 144], [166, 142], 8.5, [180, 154],
      [[140, 136], [132, 108, 1], [152, 130]], { plate: () => A.part(P(blob([[142, 130, 1], [160, 126, 1], [164, 134, 1], [146, 137, 1]])), B, { s: 2, sw: 2.6 }) });
  } else if (st === 2) {
    ground(A, 98, 64);
    A.part(P(blob(leaf([44, 142], [8, 182], [52, 158], 0.12, 0.2))), L, { s: 3, inner: `<path d="M22 164l8 6M30 156l8 7M38 150l7 7" stroke="${S.s}" stroke-width="3"/>` });
    legs([[62, 150], [124, 150]], 16, 32);
    const sh = [[92, 78], [128, 84], [152, 106], [160, 136], [156, 156], [92, 160], [28, 156], [24, 136], [34, 106], [58, 84]];
    A.part(P(blob(sh)), B, { s: 10, inner: grid(26, 84, 19.5, 7, 4) });
    skirt(22, 148, 140, 14, 14);
    mark(A, Pp, 94, 113, 6);
    legs([[74, 156], [138, 154]], 18, 30);
    head([[148, 116], [166, 110], [180, 120], [192, 136], [192, 148], [178, 154], [158, 154], [144, 144], [140, 128]], [158, 132], [175, 130], 8.5, [189, 142],
      [[150, 118], [140, 88, 1], [162, 112]], { plate: () => A.part(P(blob([[150, 114, 1], [168, 108, 1], [174, 118, 1], [154, 122, 1]])), B, { s: 2, sw: 2.6, inner: `<path d="M161 110l2 11" stroke="${OL}" stroke-width="2"/>` }) });
  } else {
    ground(A, 96, 82);
    A.part(P(blob(leaf([36, 140], [2, 178], [44, 158], 0.12, 0.2))), L, { s: 3, inner: `<path d="M12 166l8 6M20 158l9 6M28 150l9 6" stroke="${S.s}" stroke-width="3"/>` });
    legs([[46, 146], [124, 146]], 22, 36);
    A.halo(90, 104, 84, Pp.accent.b);
    const sh = [[90, 44], [134, 52], [162, 80], [172, 120], [168, 154], [90, 158], [12, 154], [8, 120], [18, 80], [46, 52]];
    A.part(P(blob(sh)), B, { s: 12, inner: grid(12, 48, 17.8, 9, 7, [[2, 2], [6, 2], [4, 1], [1, 4], [7, 4], [4, 5]]) });
    A.halo(87, 101, 20, Pp.accent.b);
    mark(A, Pp, 87, 101, 9, { glow: true });
    skirt(6, 146, 168, 16, 16, true);
    legs([[62, 152], [142, 150]], 24, 34);
    head([[148, 100], [166, 94], [180, 104], [192, 122], [192, 136], [178, 144], [156, 144], [142, 132], [140, 114]], [157, 121], [175, 119], 9, [188, 130],
      [[146, 104], [132, 76, 1], [156, 96]], {
        lid: true,
        plate: () => {
          for (const [x, y, r] of [[150, 92, 8], [164, 84, 11], [178, 90, 8]]) A.part(P(poly([[x, y - r], [x + r * 0.8, y], [x, y + r], [x - r * 0.8, y]])), Pp.accent, { s: 3, inner: `<path d="M${x} ${y - r}V${y + r}" stroke="${Pp.accent.l}" stroke-width="2.4"/>` });
          A.part(P(blob([[144, 104, 1], [166, 92, 1], [180, 102, 1], [182, 110, 1], [148, 114, 1]])), B, { s: 3, inner: `<path d="M156 96l2 16M168 94l2 16" stroke="${OL}" stroke-width="2.2"/>` });
        },
      });
  }
}

// ---------- golemetry: friendly crystal golem made of polyhedra with a glowing gem core
function golemetry(A, st, Pp, m) {
  const R = Pp.second, B = Pp.main, X = Pp.accent;
  const chips = (arr, col) => arr.map((pts) => `<path d="${poly(pts)}" fill="${col}" opacity=".55"/>`).join('');
  const crack = (d) => `<path d="${d}" fill="none" stroke="${R.s}" stroke-width="2.6" stroke-linecap="round"/>`;
  const gFace = (x, y, r, lid, mw = 5) => {
    eyesOnly(A, Pp, m, x - r * 1.45, y, x + r * 1.45, y, r, { far: 1, farSq: 1, lid: lid ? R.b : undefined });
    mouth(A, x, y + r * 1.75, mw, m, 'smile');
  };
  if (st === 1) {
    ground(A, 100, 46);
    shard(A, 92, 108, 6, 8, -26, X); shard(A, 110, 106, 9, 16, 10, X);
    A.part(E(54, 150, 10, 13, 35), B, { s: 4 }); A.part(E(150, 148, 10, 13, -35), B, { s: 4 });
    A.part(E(80, 180, 15, 7), B, { s: 3 }); A.part(E(122, 180, 15, 7), B, { s: 3 });
    A.part(P(blob([[102, 100], [132, 106], [146, 132], [144, 164], [124, 182], [80, 182], [60, 164], [58, 132], [72, 106]])), R, {
      s: 9, inner: chips([[[66, 118], [86, 104], [92, 118], [70, 132]], [[122, 110], [138, 124], [126, 128]]], R.l) + crack('M136 150l-8 6l2 8M64 150l8 4'),
    });
    gFace(102, 132, 10.5);
    octa(A, 102, 167, 6, 8, Pp.gem);
  } else if (st === 2) {
    ground(A, 100, 60);
    shard(A, 58, 104, 8, 20, -34, X); shard(A, 68, 96, 10, 26, -12, X);
    shard(A, 142, 100, 10, 26, 14, X); shard(A, 150, 108, 8, 18, 36, X);
    A.part(P(blob([[70, 160], [96, 162], [94, 182], [64, 184]])), B, { s: 4 }); A.part(P(blob([[108, 162], [134, 160], [138, 184], [106, 182]])), B, { s: 4 });
    shard(A, 101, 76, 7, 10, 4, X);
    A.part(P(blob([[100, 70], [134, 78], [152, 104], [150, 146], [132, 172], [68, 172], [50, 146], [48, 104], [66, 78]])), R, {
      s: 10, inner: chips([[[58, 96], [80, 78], [88, 94], [62, 112]], [[124, 84], [144, 100], [130, 106]], [[60, 150], [76, 140], [82, 168]]], R.l) + crack('M140 136l-10 6l2 10M58 128l10 4l-2 8'),
    });
    gFace(100, 106, 10.5);
    A.halo(100, 148, 26, Pp.gem.b);
    octa(A, 100, 148, 11, 15, Pp.gem, true);
    cyl(A, 56, 104, 38, 140, 10, B); cyl(A, 144, 104, 162, 140, 10, B);
    sph(A, 56, 102, 13, B); sph(A, 144, 102, 13, B);
    box(A, 22, 136, 26, 24, 12, R); box(A, 146, 136, 26, 24, 12, R);
  } else {
    ground(A, 100, 76);
    A.halo(100, 56, 62, X.b);
    A.add(`<circle cx="100" cy="52" r="42" fill="none" stroke="${OL}" stroke-width="10"/><circle cx="100" cy="52" r="42" fill="none" stroke="${X.l}" stroke-width="4.5"/>`);
    shard(A, 44, 100, 10, 34, -22, X, true); shard(A, 58, 88, 8, 20, -6, X);
    shard(A, 156, 100, 10, 34, 22, X, true); shard(A, 142, 88, 8, 20, 6, X);
    A.part(P(blob([[62, 162], [94, 164], [92, 184], [56, 185]])), B, { s: 5 }); A.part(P(blob([[108, 164], [140, 162], [146, 185], [110, 184]])), B, { s: 5 });
    A.part(P(blob([[100, 70], [140, 76], [162, 104], [160, 146], [138, 174], [62, 174], [40, 146], [38, 104], [60, 76]])), R, {
      s: 12, inner: chips([[[50, 96], [74, 78], [84, 96], [54, 116]], [[130, 82], [154, 100], [138, 108]], [[52, 150], [70, 138], [78, 170]], [[124, 160], [146, 144], [140, 168]]], R.l) + crack('M150 126l-10 6l2 10M56 124l10 4l-2 8'),
    });
    A.halo(100, 128, 34, Pp.gem.b);
    A.add(`<path d="M100 98v-8M76 128h-10M124 128h10M84 110l-6 -6M116 110l6 -6M84 146l-6 6M116 146l6 6" stroke="${Pp.gem.l}" stroke-width="3.5" stroke-linecap="round"/>`);
    octa(A, 100, 128, 15, 20, Pp.gem, true);
    sph(A, 44, 108, 16, B); sph(A, 156, 108, 16, B);
    A.add(`<path d="M24 124v6M30 120v4M176 124v6M170 120v4" stroke="${X.l}" stroke-width="3" stroke-linecap="round"/>`);
    octa(A, 24, 152, 15, 20, X, true); octa(A, 176, 152, 15, 20, X, true);
    shard(A, 84, 38, 6, 10, -26, X); shard(A, 116, 38, 6, 10, 26, X); shard(A, 100, 34, 8, 16, 0, X, true);
    A.part(P(blob([[100, 30], [124, 36], [134, 56], [126, 78], [100, 86], [74, 78], [66, 56], [76, 36]])), R, { s: 8, inner: chips([[[74, 44], [92, 34], [90, 48], [72, 56]]], R.l) });
    gFace(100, 57, 9, true, 4.5);
  }
}

export const PETS_C = {
  prismouse: { el: 'stone', names: ['Prismouse', 'Cuboid', 'Polyhedrat'], draw: prismouse },
  areadillo: { el: 'stone', names: ['Areadillo', 'Tilemadillo', 'Squaredillo'], draw: areadillo },
  golemetry: { el: 'stone', names: ['Golemetry', 'Facetitan', 'Polygolem'], draw: golemetry },
};

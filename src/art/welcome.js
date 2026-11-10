// Welcome scene: the Academy on its hill under a night sky, with the wizard and pets in front and a moonlit meadow
// below. It fills the whole welcome screen: the Academy part (y 0..500) sits in the top of the screen and the meadow
// (y 500..BOT) runs on behind the title and the family cards. Centred on x = 800 and drawn far to both sides (X0..X1)
// so the screen can show as much width as the device has (ui/welcome.js sets the viewBox). Everything a phone must see
// sits within about ±265 units of the centre.
// Two stacked SVGs (back: sky and far mountains; front: everything else) with a drifting mist layer between them and
// another over the meadow. Moving bits use the .ws-* classes in styles.css.
import { OL, creatureSVG } from './creatures.js';
import { wizardSVG } from './wizard.js';

// MINW: a narrow screen still shows this much width (the castle with the wizard and a pet beside it), with extra sky
// above the scene to fill its height; the sky is drawn up to y = TOP for that. BOT: how far down the meadow is drawn.
// MIST: the two drifting mist bands as [top, height] in scene units (styles.css places them from these numbers).
export const SCENE = { H: 500, CX: 800, X0: -500, X1: 2100, MINW: 740, TOP: -520, BOT: 1800 };
const { H, CX, X0, X1, TOP, BOT } = SCENE;
const W = X1 - X0;
const f = (n) => Math.round(n * 10) / 10;
function rng(seed) {
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const star4 = (x, y, r, k = 0.16) => `M${f(x)} ${f(y - r)}Q${f(x + k * r)} ${f(y - k * r)} ${f(x + r)} ${f(y)}Q${f(x + k * r)} ${f(y + k * r)} ${f(x)} ${f(y + r)}Q${f(x - k * r)} ${f(y + k * r)} ${f(x - r)} ${f(y)}Q${f(x - k * r)} ${f(y - k * r)} ${f(x)} ${f(y - r)}Z`;

// ---------------------------------------------------------------- sky
function sky() {
  const r = rng(11);
  let s = `<rect x="${X0}" y="${TOP}" width="${W}" height="${H - TOP}" fill="url(#ws-sky)"/>`;
  // aurora ribbons (soft bands that fade out above and below)
  const band = (y0, amp, th, seed) => {
    const q = rng(seed); let top = '', bot = '';
    for (let x = X0; x <= X1; x += 130) {
      const y = y0 + Math.sin(x / 210 + seed) * amp + (q() - 0.5) * 14;
      top += `${top ? 'L' : 'M'}${x} ${f(y)}`; bot = `L${x} ${f(y + th + Math.cos(x / 170 + seed) * th * 0.35)}` + bot;
    }
    return top + bot + 'Z';
  };
  s += `<g class="ws-aurora"><path d="${band(96, 34, 120, 3)}" fill="url(#ws-aur1)"/><path d="${band(150, 26, 90, 8)}" fill="url(#ws-aur2)"/></g>`;
  // stars: more (and brighter) towards the top
  let dots = '', tw = '';
  for (let i = 0; i < 300; i++) {
    const x = X0 + r() * W, y = Math.pow(r(), 1.6) * 330, rad = 0.5 + Math.pow(r(), 3) * 1.6, o = 0.45 + r() * 0.55;
    const col = r() < 0.18 ? '#ffe9b0' : r() < 0.3 ? '#bfd4ff' : '#fff';
    const c = `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${col}" opacity="${f(o * (1 - y / 520))}"`;
    if (i % 7 === 0) tw += `${c} class="ws-tw" style="animation-delay:${f(r() * 4)}s"/>`; else dots += `${c}/>`;
  }
  // the extra sky a narrow screen sees above the scene
  for (let i = 0; i < 110; i++) {
    const x = CX + (r() - 0.5) * 900, y = TOP + r() * -TOP, rad = 0.5 + Math.pow(r(), 3) * 1.6;
    const c = `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${r() < 0.2 ? '#ffe9b0' : '#fff'}" opacity="${f(0.5 + r() * 0.5)}"`;
    if (i % 6 === 0) tw += `${c} class="ws-tw" style="animation-delay:${f(r() * 4)}s"/>`; else dots += `${c}/>`;
  }
  s += dots + tw;
  s += [[640, -70, 7], [930, -150, 6], [760, -260, 7], [560, -330, 5], [1010, -400, 6]].map(([x, y, q], i) => `<path d="${star4(x, y, q)}" fill="#fff8dc" class="ws-tw" style="animation-delay:${f(i * 0.6)}s"/>`).join('');
  // a few four-point sparkle stars
  const big = [[604, 62, 7], [722, 34, 5], [884, 48, 6], [1128, 74, 7], [1290, 40, 5], [398, 96, 6], [214, 52, 7], [1486, 104, 6], [10, 84, 6], [1700, 60, 7], [-240, 60, 6], [1930, 96, 6]];
  s += big.map(([x, y, q], i) => `<path d="${star4(x, y, q)}" fill="#fff8dc" class="ws-tw" style="animation-delay:${f(i * 0.45)}s"/>`).join('');
  // constellations: a plus sign and a triangle
  const cons = (pts, lines) => `<path d="${lines.map(([a, b]) => `M${pts[a][0]} ${pts[a][1]}L${pts[b][0]} ${pts[b][1]}`).join('')}" stroke="#cfd8ff" stroke-width="1" opacity=".38" stroke-dasharray="2 4"/>`
    + pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#fff"/>`).join('');
  s += cons([[440, 62], [440, 92], [440, 122], [410, 92], [470, 92]], [[0, 1], [1, 2], [3, 1], [1, 4]]);
  s += cons([[1206, 96], [1262, 152], [1164, 158]], [[0, 1], [1, 2], [2, 0]]);
  s += cons([[190, 140], [244, 140], [217, 122], [217, 158]], [[0, 1]]);
  // shooting star
  // shooting stars: each falls along a straight line through open sky with its tail streaming out behind it.
  // The second one is high up, in the extra sky that only narrow screens see.
  const shoot = (x0, y0, x1, y1, delay) => {
    const len = Math.hypot(x1 - x0, y1 - y0), tx = (-(x1 - x0) / len) * 110, ty = (-(y1 - y0) / len) * 110;
    return `<g class="ws-shoot" style="--sx0:${x0}px;--sy0:${y0}px;--sx1:${x1}px;--sy1:${y1}px;animation-delay:${delay}s"><path d="M0 0L${f(tx)} ${f(ty)}" stroke="url(#ws-trail)" stroke-width="3" stroke-linecap="round"/><path d="${star4(0, 0, 5)}" fill="#fff"/></g>`;
  };
  s += shoot(1080, 12, 1330, 100, 0) + shoot(560, -250, 800, -160, -4.5);
  // moon with halo, craters and a soft shaded edge
  const mx = 986, my = 104, mr = 44;
  s += `<circle cx="${mx}" cy="${my}" r="170" fill="url(#ws-halo)"/>`
    + `<circle cx="${mx}" cy="${my}" r="${mr}" fill="url(#ws-moon)"/>`
    + `<g clip-path="url(#ws-moonclip)"><circle cx="${mx - 16}" cy="${my + 14}" r="${mr + 8}" fill="none" stroke="#e2a955" stroke-width="16" opacity=".28"/>`
    + [[-14, -12, 9, 7], [12, 6, 11, 9], [-6, 18, 6, 5], [20, -18, 5, 4], [-24, 6, 4, 3.4]].map(([dx, dy, a, b]) => `<ellipse cx="${mx + dx}" cy="${my + dy}" rx="${a}" ry="${b}" fill="#e6b65e" opacity=".5"/><ellipse cx="${mx + dx - 1}" cy="${my + dy - 1.5}" rx="${f(a * 0.8)}" ry="${f(b * 0.7)}" fill="#f6d586" opacity=".55"/>`).join('') + '</g>';
  // thin clouds
  let ci = 0;
  const cloud = (x, y, w, h, o) => `<path class="ws-cloud" style="animation-duration:${46 + (ci * 13) % 30}s;animation-delay:${-7 * ci++}s" d="M${x} ${y}q${f(w * 0.18)} ${-h} ${f(w * 0.36)} ${f(-h * 0.35)}q${f(w * 0.14)} ${f(-h * 0.9)} ${f(w * 0.3)} ${f(-h * 0.1)}q${f(w * 0.2)} ${f(-h * 0.3)} ${f(w * 0.34)} ${f(h * 0.45)}Z" fill="#cdb6ff" opacity="${o}"/>`;
  s += cloud(880, 150, 250, 24, 0.2) + cloud(1040, 76, 170, 16, 0.16) + cloud(420, 200, 300, 26, 0.13) + cloud(1380, 190, 320, 26, 0.13) + cloud(-160, 170, 300, 24, 0.11) + cloud(1760, 150, 260, 22, 0.11);
  // glow behind the castle hill
  s += `<ellipse cx="${CX}" cy="352" rx="640" ry="230" fill="url(#ws-glow)"/>`;
  return s;
}

// ---------------------------------------------------------------- land behind the castle
function ridge(seed, yBase, amp, step, jag) {
  const r = rng(seed); const pts = [];
  for (let x = X0; x <= X1 + step; x += step) {
    const y = yBase - Math.abs(Math.sin(x / (step * 2.7) + seed)) * amp - r() * jag;
    pts.push([x + (r() - 0.5) * step * 0.4, y]);
  }
  return pts;
}
const FAR = ridge(5, 338, 78, 92, 26), NEAR = ridge(9, 380, 62, 74, 22);
const ridgeShape = (pts) => `M${X0} ${H}L${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}L${X1} ${H}Z`;
function farMountains() {
  const far = FAR;
  let s = `<path d="${ridgeShape(far)}" fill="url(#ws-mt1)"/>`;
  // moonlit right faces and snow caps on the far peaks
  for (let i = 1; i < far.length - 1; i++) {
    const [x, y] = far[i], [xp, yp] = far[i - 1], [xn, yn] = far[i + 1];
    if (y < yp && y < yn) {
      s += `<path d="M${f(x)} ${f(y)}L${f(xn)} ${f(yn)}L${f(x + (xn - x) * 0.25)} ${f(yn + 18)}Z" fill="#a98fe6" opacity=".35"/>`;
      if (y < 285) s += `<path d="M${f(x)} ${f(y)}L${f(x + (xn - x) * 0.3)} ${f(y + (yn - y) * 0.3)}L${f(x + 4)} ${f(y + 13)}L${f(x - 5)} ${f(y + 19)}L${f(x + (xp - x) * 0.28)} ${f(y + (yp - y) * 0.28)}Z" fill="#efe6ff" opacity=".8"/>`;
    }
  }
  return s + `<rect x="${X0}" y="316" width="${W}" height="70" fill="url(#ws-mist)"/>`;
}
function nearMountains() {
  const near = NEAR;
  let s = `<path d="${ridgeShape(near)}" fill="url(#ws-mt2)"/>`;
  for (let i = 1; i < near.length - 1; i++) {
    const [x, y] = near[i], [, yp] = near[i - 1], [xn, yn] = near[i + 1];
    if (y < yp && y < yn) s += `<path d="M${f(x)} ${f(y)}L${f(xn)} ${f(yn)}L${f(x + (xn - x) * 0.3)} ${f(yn + 14)}Z" fill="#7b62cf" opacity=".35"/>`;
  }
  return s;
}
function forest() {
  const r = rng(21); let back = '', front = '';
  const pine = (x, base, h, col, lit) => {
    const w = h * 0.42;
    let d = '';
    for (let t = 0; t < 3; t++) { const y0 = base - h + (h * t) / 3.4, ww = w * (0.45 + t * 0.28), hh = h * 0.48; d += `M${f(x)} ${f(y0)}L${f(x + ww)} ${f(y0 + hh)}L${f(x - ww)} ${f(y0 + hh)}Z`; }
    return `<path d="${d}M${f(x - 2)} ${f(base - 6)}h4v8h-4Z" fill="${col}"/>` + (lit ? `<path d="M${f(x)} ${f(base - h)}L${f(x + w * 0.45)} ${f(base - h + h * 0.48)}L${f(x + 2)} ${f(base - h + h * 0.4)}Z" fill="${lit}" opacity=".7"/>` : '');
  };
  for (let x = X0; x < X1; x += 20 + r() * 26) {
    const d = Math.abs(x - CX);
    if (d < 250) continue;                                   // keep the castle hill clear
    const base = 402 + r() * 8 - Math.max(0, 1 - (d - 250) / 260) * 30;
    back += pine(x, base, 38 + r() * 34, '#2a1d66');
    if (r() < 0.55) front += pine(x + 9, base + 12 + r() * 6, 50 + r() * 44, '#20154f', '#3c2c8c');
  }
  return back + front;
}
function hill() {
  // the castle's hill: a broad rise with a flat top around the centre
  const top = `M${X0} 418C${CX - 760} 412 ${CX - 430} 408 ${CX - 300} 380C${CX - 240} 362 ${CX - 210} 352 ${CX - 170} 350L${CX + 170} 350C${CX + 210} 352 ${CX + 240} 362 ${CX + 300} 380C${CX + 430} 408 ${CX + 760} 412 ${X1} 418`;
  return `<path d="${top}L${X1} ${H}L${X0} ${H}Z" fill="url(#ws-hill)"/><path d="${top}" fill="none" stroke="#7d69dc" stroke-width="2.5" opacity=".55"/>`;
}

// ---------------------------------------------------------------- the Academy
const STONE = { l: '#c9befa', b: '#9a8ee0', s: '#6b5db8', d: '#4a3f8e' };
const ROOF = { l: '#7fb0ff', b: '#4576e6', s: '#2c44a6' };
const GOLD = '#ffd257';
const out = (d, sw = 3.5) => `<path d="${d}" fill="none" stroke="${OL}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
function wall(x, y, w, h, o = {}) {
  const r = rng(Math.round(x * 7 + y));
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${STONE.b}"/>`
    + `<rect x="${x}" y="${y}" width="${f(w * (o.shade ?? 0.34))}" height="${h}" fill="${STONE.s}" opacity=".75"/>`
    + `<rect x="${f(x + w - 7)}" y="${y}" width="7" height="${h}" fill="${STONE.l}" opacity=".7"/>`;
  // a few bricks
  let bricks = '';
  for (let i = 0; i < Math.round((w * h) / 900); i++) { const bx = x + 8 + r() * (w - 30), by = y + 10 + r() * (h - 22); bricks += `M${f(bx)} ${f(by)}h${f(9 + r() * 7)}`; }
  s += `<path d="${bricks}" stroke="${STONE.d}" stroke-width="2.2" stroke-linecap="round" opacity=".45"/>`;
  s += `<rect x="${x}" y="${f(y + h - 8)}" width="${w}" height="8" fill="${STONE.d}" opacity=".35"/>`;
  return s + out(`M${x} ${y}h${w}v${h}h${-w}Z`);
}
function crenel(x, y, w, n, hh = 11) {
  const mw = w / (n * 2 - 1); let d = '', hi = '';
  for (let i = 0; i < n; i++) { const mx = x + i * mw * 2; d += `M${f(mx)} ${y}v${-hh}h${f(mw)}v${hh}Z`; hi += `M${f(mx + mw - 3)} ${y - hh + 2}v${hh - 3}`; }
  return `<path d="${d}" fill="${STONE.b}"/><path d="${hi}" stroke="${STONE.l}" stroke-width="3" opacity=".8"/>` + out(d, 3)
    + `<rect x="${x - 4}" y="${y}" width="${w + 8}" height="8" fill="${STONE.l}"/>` + out(`M${x - 4} ${y}h${w + 8}v8h${-w - 8}Z`, 3);
}
function cone(cx, baseY, hw, apexY) {
  const d = `M${cx - hw} ${baseY}Q${cx - hw * 0.42} ${f(baseY - (baseY - apexY) * 0.42)} ${cx} ${apexY}Q${cx + hw * 0.42} ${f(baseY - (baseY - apexY) * 0.42)} ${cx + hw} ${baseY}Q${cx} ${baseY + 9} ${cx - hw} ${baseY}Z`;
  const id = `ws-c${cx}${apexY}`;
  let s = `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${ROOF.b}"/><g clip-path="url(#${id})">`
    + `<path d="M${cx - hw - 4} ${baseY + 10}L${cx - 2} ${apexY - 4}L${f(cx - hw * 0.12)} ${baseY + 10}Z" fill="${ROOF.s}" opacity=".85"/>`
    + `<path d="M${f(cx + hw * 0.5)} ${baseY + 10}L${cx + 3} ${apexY}L${cx + hw + 6} ${baseY + 10}Z" fill="${ROOF.l}" opacity=".55"/>`;
  // shingle rows
  for (let i = 1; i <= 3; i++) { const t = i / 4, y = apexY + (baseY - apexY) * t, ww = hw * (0.2 + t * 0.78); s += `<path d="M${f(cx - ww)} ${f(y)}Q${cx} ${f(y + 7 * t + 3)} ${f(cx + ww)} ${f(y)}" fill="none" stroke="${ROOF.s}" stroke-width="2.2" opacity=".7"/>`; }
  s += '</g>' + out(d);
  s += `<path d="M${cx - hw} ${baseY}Q${cx} ${baseY + 9} ${cx + hw} ${baseY}" fill="none" stroke="${GOLD}" stroke-width="4.5" stroke-linecap="round"/>` + out(`M${cx - hw} ${baseY + 2.5}Q${cx} ${baseY + 11.5} ${cx + hw} ${baseY + 2.5}`, 2);
  return s;
}
function win(cx, cy, w, h, o = {}) {
  const x0 = cx - w / 2, yt = cy - h / 2 + w / 2;
  const d = `M${f(x0)} ${f(cy + h / 2)}V${f(yt)}A${w / 2} ${w / 2} 0 0 1 ${f(x0 + w)} ${f(yt)}V${f(cy + h / 2)}Z`;
  return `<circle cx="${cx}" cy="${cy}" r="${f(h * (o.glow ?? 1.25))}" fill="url(#ws-wglow)"${o.flicker ? ` class="ws-flick" style="animation-delay:${o.flicker}s"` : ''}/>`
    + `<path d="${d}" fill="url(#ws-win)"/>` + (o.plain ? '' : `<path d="M${cx} ${f(cy - h / 2 + 2)}V${f(cy + h / 2)}M${f(x0)} ${f(cy + 1)}h${w}" stroke="${OL}" stroke-width="1.8" opacity=".75"/>`) + out(d, 2.6)
    + `<path d="M${f(x0 - 2.5)} ${f(cy + h / 2 + 1.5)}h${w + 5}" stroke="${STONE.l}" stroke-width="3.5" stroke-linecap="round"/>`;
}
function flag(x, y, dir = 1, col = GOLD) {
  return `<path d="M${x} ${y}v-26" stroke="${OL}" stroke-width="3" stroke-linecap="round"/>`
    + `<g class="ws-flag" style="transform-origin:${x}px ${y - 20}px"><path d="M${x} ${y - 26}q${9 * dir} -5 ${17 * dir} 1q${-5 * dir} 3 ${-6 * dir} 6q${-5 * dir} -1 ${-11 * dir} 4Z" fill="${col}" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/></g>`;
}
function tower(cx, yTop, w, yBase, apexY, o = {}) {
  let s = wall(cx - w / 2, yTop, w, yBase - yTop, { shade: 0.36 });
  s += `<rect x="${cx - w / 2 - 5}" y="${yTop - 2}" width="${w + 10}" height="9" fill="${STONE.l}"/>` + out(`M${cx - w / 2 - 5} ${yTop - 2}h${w + 10}v9h${-w - 10}Z`, 3);
  s += cone(cx, yTop - 2, w / 2 + 11, apexY);
  s += flag(cx, apexY + 3, o.dir ?? 1);
  return s;
}
function banner(x, y, w, h) {
  const d = `M${x} ${y}h${w}v${h}l${-w / 2} ${-8}l${-w / 2} 8Z`;
  return `<path d="${d}" fill="#4a6fe0"/><path d="M${x} ${y}h${f(w * 0.4)}v${h - 3}l${f(-w * 0.4)} 3Z" fill="#2f4bb0" opacity=".8"/><path d="${star4(x + w / 2, y + h * 0.42, w * 0.3, 0.24)}" fill="${GOLD}"/>` + out(d, 2.4)
    + `<path d="M${x - 2} ${y}h${w + 4}" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/>`;
}
function castle() {
  const B = 350;   // ground line
  let s = '';
  // far side wings and their roofs
  for (const dir of [-1, 1]) {
    const x = dir < 0 ? CX - 136 : CX + 58;
    s += wall(x, B - 84, 78, 84);
    const rx = x - 4, ry = B - 84;
    const d = `M${rx} ${ry}l14 -30h${58}l14 30Z`;
    s += `<path d="${d}" fill="${ROOF.b}"/><path d="M${rx} ${ry}l14 -30h22l-10 30Z" fill="${ROOF.s}" opacity=".8"/><path d="M${rx + 62} ${ry - 30}h10l14 30h-18Z" fill="${ROOF.l}" opacity=".5"/>`
      + `<path d="M${rx + 8} ${ry - 15}h70M${rx + 30} ${ry - 30}l-6 30M${rx + 56} ${ry - 30}l6 30" stroke="${ROOF.s}" stroke-width="2" opacity=".6"/>` + out(d)
      + `<path d="M${rx - 2} ${ry}h90" stroke="${GOLD}" stroke-width="4.5" stroke-linecap="round"/>`;
    s += win(x + 24, B - 46, 14, 26, { flicker: dir < 0 ? 1.2 : 0 }) + win(x + 54, B - 46, 14, 26, { flicker: dir < 0 ? 0 : 2.4 });
  }
  // outer towers
  s += tower(CX - 150, B - 150, 50, B, B - 232, { dir: -1 });
  s += tower(CX + 150, B - 150, 50, B, B - 232, { dir: 1 });
  s += win(CX - 150, B - 112, 14, 26) + win(CX - 150, B - 58, 14, 26, { flicker: 3.1 }) + win(CX + 150, B - 112, 14, 26, { flicker: 0.6 }) + win(CX + 150, B - 58, 14, 26);
  // central spire behind the keep
  s += wall(CX - 27, B - 206, 54, 80, { shade: 0.36 });
  s += `<rect x="${CX - 33}" y="${B - 208}" width="66" height="9" fill="${STONE.l}"/>` + out(`M${CX - 33} ${B - 208}h66v9h-66Z`, 3);
  s += cone(CX, B - 208, 40, B - 296);
  s += win(CX, B - 168, 16, 30, { glow: 1.1 });
  // the keep
  s += wall(CX - 62, B - 136, 124, 136, { shade: 0.3 });
  s += crenel(CX - 62, B - 136, 124, 6);
  // corner turrets on the keep
  for (const dir of [-1, 1]) {
    const tx = CX + dir * 62;
    s += wall(tx - 13, B - 160, 26, 40, { shade: 0.4 }) + `<path d="M${tx - 13} ${B - 120}q13 12 26 0" fill="${STONE.s}" stroke="${OL}" stroke-width="3"/>`;
    s += cone(tx, B - 160, 19, B - 200);
  }
  // emblem: a gold-ringed plus sign
  s += `<circle cx="${CX}" cy="${B - 100}" r="24" fill="url(#ws-wglow)"/><circle cx="${CX}" cy="${B - 100}" r="15" fill="#3a5fd6" stroke="${OL}" stroke-width="3"/><circle cx="${CX}" cy="${B - 100}" r="15" fill="none" stroke="${GOLD}" stroke-width="3.2" transform="translate(0 0)" stroke-dasharray="0"/><circle cx="${CX}" cy="${B - 100}" r="17.4" fill="none" stroke="${OL}" stroke-width="1.6"/>`
    + `<path d="M${CX - 8} ${B - 100}h16M${CX} ${B - 108}v16" stroke="#fff6c8" stroke-width="4.4" stroke-linecap="round"/>`;
  s += win(CX - 36, B - 92, 15, 28, { flicker: 1.8 }) + win(CX + 36, B - 92, 15, 28);
  // banners beside the door
  s += banner(CX - 49, B - 62, 15, 36) + banner(CX + 34, B - 62, 15, 36);
  // the open, glowing doorway with steps
  const dw = 21, dh = 54, dy = B - 4;
  const arch = `M${CX - dw} ${dy}V${dy - dh + dw}A${dw} ${dw} 0 0 1 ${CX + dw} ${dy - dh + dw}V${dy}Z`;
  s += `<circle cx="${CX}" cy="${dy - 26}" r="74" fill="url(#ws-wglow)" class="ws-flick"/>`
    + `<path d="M${CX - dw - 7} ${dy}V${dy - dh + dw}A${dw + 7} ${dw + 7} 0 0 1 ${CX + dw + 7} ${dy - dh + dw}V${dy}Z" fill="${STONE.l}" stroke="${OL}" stroke-width="3"/>`
    + `<path d="${arch}" fill="url(#ws-door)"/>`
    + `<path d="M${CX - dw} ${dy}V${dy - dh + dw}A${dw} ${dw} 0 0 1 ${CX - 7} ${dy - dh + 2.5}V${dy}Z" fill="#7a4a2e" stroke="${OL}" stroke-width="2.4"/><path d="M${CX + dw} ${dy}V${dy - dh + dw}A${dw} ${dw} 0 0 0 ${CX + 7} ${dy - dh + 2.5}V${dy}Z" fill="#a8693c" stroke="${OL}" stroke-width="2.4"/>`
    + `<path d="M${CX - dw + 5} ${dy - 20}h6M${CX + dw - 11} ${dy - 20}h6" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`
    + out(arch, 3)
    + `<path d="M${CX - 34} ${dy}h68l5 7h-78Z" fill="${STONE.l}" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/><path d="M${CX - 44} ${dy + 7}h88l6 8h-100Z" fill="${STONE.b}" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>`;
  // beacon star on top of the spire
  s += `<g class="ws-beacon" style="transform-origin:${CX}px ${B - 306}px"><circle cx="${CX}" cy="${B - 306}" r="46" fill="url(#ws-bglow)"/><path d="${star4(CX, B - 306, 15, 0.26)}" fill="#fff6c8" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/></g>`;
  // bushes at the foot of the walls
  const bush = (x, w) => `<path d="M${x} ${B + 2}q${-w * 0.1} ${-w * 0.42} ${w * 0.22} ${-w * 0.4}q${w * 0.08} ${-w * 0.3} ${w * 0.3} ${-w * 0.14}q${w * 0.3} ${-w * 0.14} ${w * 0.32} ${w * 0.2}q${w * 0.22} 0 ${w * 0.16} ${w * 0.34}Z" fill="#2f2478" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/><path d="M${x + w * 0.5} ${B - w * 0.42}q${w * 0.26} ${-w * 0.04} ${w * 0.28} ${w * 0.2}" fill="none" stroke="#6a58cf" stroke-width="2.5" stroke-linecap="round"/>`;
  s += bush(CX - 196, 44) + bush(CX - 122, 34) + bush(CX + 82, 36) + bush(CX + 152, 46);
  return s;
}

// ---------------------------------------------------------------- path, lanterns, foreground
// The path is drawn in perspective, as a winding road on the ground running away to a vanishing line at y = PV:
// its width grows in step with the distance below that line, and its bends get wider and longer the nearer they are.
const PV = 296, PK = 0.85, PA = 0.33, PP = (364 - PV) * 2 * Math.PI;
const pathMid = (y) => CX + PA * (y - PV) * Math.sin(PP / (y - PV));
const pathL = (y) => pathMid(y) - (PK * (y - PV)) / 2, pathR = (y) => pathMid(y) + (PK * (y - PV)) / 2;
const onPath = (x, y, pad = 0) => y > 364 && x > pathL(y) - pad && x < pathR(y) + pad;
function path() {
  let l = '', back = '';
  for (let y = 364; y <= 1300; y += y < 540 ? 4 : 14) { l += `${l ? 'L' : 'M'}${f(pathL(y))} ${y}`; back = `L${f(pathR(y))} ${y}` + back; }
  let s = `<path d="${l}${back}Z" fill="url(#ws-path)"/>`;
  // ruts across it: closer together and finer the farther away they are
  for (let d = 84; d < 760; d *= 1.36) { const y = PV + d, a = pathL(y) + d * 0.1, b = pathR(y) - d * 0.1; s += `<path d="M${f(a)} ${f(y)}Q${f((a + b) / 2)} ${f(y + d * 0.045)} ${f(b)} ${f(y)}" fill="none" stroke="#2f2378" stroke-width="${f(Math.min(4, 1 + d / 110))}" stroke-linecap="round" opacity=".3"/>`; }
  // light spilling out of the doorway
  s += `<path d="M${CX - 21} 364L${CX - 62} 430L${CX + 62} 430L${CX + 21} 364Z" fill="url(#ws-spill)"/>`;
  return s;
}
/** A lantern beside the path at height y (side -1 left, +1 right), sized for how near it is. */
function pathLantern(side, y, pool) {
  const k = Math.pow((y - PV) / 118, 0.8), x = (side < 0 ? pathL(y) : pathR(y)) + side * (8 + 9 * k);
  return (pool ? `<ellipse cx="${f(x)}" cy="${y + 2}" rx="${f(54 * k)}" ry="${f(11 * k)}" fill="url(#ws-wglow)"/>` : '') + lantern(f(x), y, f(k));
}
function lantern(x, y, k) {
  return `<path d="M${x} ${y}v${-26 * k}" stroke="${OL}" stroke-width="${f(3.4 * k)}" stroke-linecap="round"/>`
    + `<circle cx="${x}" cy="${f(y - 30 * k)}" r="${f(22 * k)}" fill="url(#ws-wglow)" class="ws-flick" style="animation-delay:${f((x % 7) * 0.4)}s"/>`
    + `<path d="M${f(x - 5 * k)} ${f(y - 25 * k)}h${f(10 * k)}l${f(-1.5 * k)} ${f(-10 * k)}h${f(-7 * k)}Z" fill="#fff0a8" stroke="${OL}" stroke-width="${f(2.4 * k)}" stroke-linejoin="round"/>`
    + `<path d="M${f(x - 6 * k)} ${f(y - 35 * k)}h${f(12 * k)}l${f(-6 * k)} ${f(-6 * k)}Z" fill="${OL}"/>`;
}
function mounds() {
  const left = `M${X0} 446C${CX - 800} 440 ${CX - 420} 470 ${CX - 250} 454C${CX - 190} 448 ${CX - 130} 466 ${CX - 96} ${H}L${X0} ${H}Z`;
  const right = `M${X1} 448C${CX + 800} 442 ${CX + 420} 468 ${CX + 250} 456C${CX + 200} 452 ${CX + 140} 470 ${CX + 112} ${H}L${X1} ${H}Z`;
  let s = `<path d="${left}" fill="url(#ws-fg)"/><path d="${right}" fill="url(#ws-fg)"/>`;
  s += `<path d="M${X0} 446C${CX - 800} 440 ${CX - 420} 470 ${CX - 250} 454C${CX - 190} 448 ${CX - 130} 466 ${CX - 96} ${H}" fill="none" stroke="#5a48b8" stroke-width="2.5" opacity=".7"/><path d="M${X1} 448C${CX + 800} 442 ${CX + 420} 468 ${CX + 250} 456C${CX + 200} 452 ${CX + 140} 470 ${CX + 112} ${H}" fill="none" stroke="#5a48b8" stroke-width="2.5" opacity=".7"/>`;
  return s;
}
function foreground() {
  const r = rng(33);
  let s = '';
  // grass tufts and little glowing flowers along both mounds
  let tufts = '', flowers = '';
  for (let x = X0 + 30; x < X1; x += 34 + r() * 50) {
    const y = 462 + r() * 26, hgt = 7 + r() * 9;
    if (onPath(x, y, 22)) continue;
    tufts += `M${f(x - 5)} ${f(y)}l2 ${f(-hgt * 0.7)}l2 ${f(hgt * 0.5)}l2 ${f(-hgt)}l2 ${f(hgt * 0.8)}l2 ${f(-hgt * 0.6)}l2 ${f(hgt * 0.6)}Z`;
    if (r() < 0.3) { const fx = x + 14, fy = y + 6; flowers += `<circle cx="${f(fx)}" cy="${f(fy - 9)}" r="9" fill="url(#ws-tglow)"/><path d="M${f(fx)} ${f(fy)}v-7" stroke="#2f7f8a" stroke-width="1.6"/><path d="${star4(fx, fy - 9, 3.6, 0.3)}" fill="#9ff5ee"/>`; }
  }
  s += `<path d="${tufts}" fill="#2a1f6b"/>` + flowers;
  // fireflies
  for (let i = 0; i < 14; i++) { const x = CX + (r() - 0.5) * 1500, y = 380 + r() * 90; s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.4 + r() * 1.2)}" fill="#fff3a0" class="ws-fly" style="animation-delay:${f(r() * 5)}s;animation-duration:${f(4 + r() * 4)}s"/>`; }
  return s;
}
// far-side extras that only wide screens see: a little observatory and a glowing portal arch
function extras() {
  const ox = CX - 520, oy = 404;
  let s = `<path d="M${ox - 22} ${oy}v-34h44v34Z" fill="#3a2c85" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/><path d="M${ox - 26} ${oy - 34}a26 24 0 0 1 52 0Z" fill="#5a6fd8" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/><path d="M${ox + 4} ${oy - 56}l22 -16" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M${ox + 4} ${oy - 56}l22 -16" stroke="#cfc4ff" stroke-width="2" stroke-linecap="round"/>`
    + win(ox, oy - 14, 10, 16, { plain: true, glow: 1.6 });
  const px = CX + 540, py = 408;
  s += `<ellipse cx="${px}" cy="${py - 26}" rx="34" ry="42" fill="url(#ws-tglow)"/>`
    + `<path d="M${px - 22} ${py}v-30a22 22 0 0 1 44 0v30h-10v-30a12 12 0 0 0 -24 0v30Z" fill="#4a3f8e" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>`
    + `<path d="M${px - 12} ${py}v-30a12 12 0 0 1 24 0v30Z" fill="#7df0e6" opacity=".75" class="ws-flick"/><path d="${star4(px, py - 24, 6, 0.24)}" fill="#fff"/>`;
  return s;
}

// ---------------------------------------------------------------- the meadow below (behind the title and family cards)
function meadow() {
  const r = rng(47);
  let s = `<rect x="${X0}" y="${H - 1}" width="${W}" height="${BOT - H + 1}" fill="url(#ws-fg)"/>`;
  // rolling rises: each a soft lit crest that fades away below it
  for (const [y0, amp, seed] of [[604, 16, 2], [790, 22, 5], [1030, 26, 9]]) {
    let top = '';
    for (let x = X0; x <= X1; x += 160) top += `${top ? 'L' : 'M'}${x} ${f(y0 + Math.sin(x / 300 + seed) * amp + Math.sin(x / 130 + seed * 2) * amp * 0.3)}`;
    s += `<path d="${top}L${X1} ${y0 + 170}L${X0} ${y0 + 170}Z" fill="url(#ws-rise)"/><path d="${top}" fill="none" stroke="#6a58cf" stroke-width="2" opacity=".3"/>`;
  }
  // a moonlit pond (left) and a cluster of glowing crystals (right): wide screens only
  const px = CX - 560, py = 716;
  s += `<ellipse cx="${px}" cy="${py}" rx="158" ry="36" fill="#0e0830" opacity=".6"/><ellipse cx="${px}" cy="${py - 3}" rx="150" ry="32" fill="url(#ws-pond)"/><ellipse cx="${px}" cy="${py - 3}" rx="150" ry="32" fill="none" stroke="#7d69dc" stroke-width="2" opacity=".5"/>`
    + `<g class="ws-flick"><path d="M${px + 20} ${py - 16}h44M${px + 8} ${py - 7}h70M${px + 26} ${py + 2}h40M${px + 36} ${py + 10}h22" stroke="#ffeaa6" stroke-width="3" stroke-linecap="round" opacity=".7"/></g>`
    + [[-86, 4, 15], [-52, 14, 11], [108, -8, 12]].map(([dx, dy, w]) => `<path d="M${px + dx} ${py + dy}a${w} ${f(w * 0.36)} 0 1 0 ${w * 2} 0a${w} ${f(w * 0.36)} 0 1 0 ${-w * 2} 0M${px + dx + w} ${py + dy}l${f(w * 0.9)} ${f(-w * 0.2)}" fill="#2f7f8a" stroke="#123c4a" stroke-width="1.6" opacity=".9"/>`).join('')
    + `<path d="M${px - 142} ${py - 2}l-4 -40M${px - 132} ${py + 4}l2 -32M${px - 150} ${py + 6}l-8 -28M${px + 146} ${py - 6}l5 -36M${px + 156} ${py}l-1 -26" stroke="#2a1f6b" stroke-width="3" stroke-linecap="round"/>`;
  const cx = CX + 560, cy = 668;
  const shard = (x, w, h, lean, col, hi) => `<path d="M${f(x - w / 2)} ${cy}L${f(x - w * 0.36 + lean)} ${f(cy - h * 0.78)}L${f(x + lean)} ${cy - h}L${f(x + w * 0.4 + lean)} ${f(cy - h * 0.74)}L${f(x + w / 2)} ${cy}Z" fill="${col}" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/><path d="M${f(x + lean)} ${cy - h}L${f(x + w * 0.4 + lean)} ${f(cy - h * 0.74)}L${f(x + w / 2)} ${cy}L${f(x + w * 0.08)} ${cy}Z" fill="${hi}" opacity=".6"/>`;
  s += `<ellipse cx="${cx}" cy="${cy - 34}" rx="96" ry="74" fill="url(#ws-tglow)" class="ws-flick"/>`
    + shard(cx - 34, 26, 50, -8, '#6a7cf0', '#a9b6ff') + shard(cx + 30, 24, 42, 9, '#8a6af0', '#c7b4ff') + shard(cx, 34, 84, 2, '#5fd6e0', '#c2fbff') + shard(cx - 62, 16, 24, -5, '#5fd6e0', '#c2fbff') + shard(cx + 58, 16, 22, 5, '#6a7cf0', '#a9b6ff')
    + `<path d="${star4(cx + 4, cy - 100, 7, 0.2)}" fill="#fff" class="ws-tw"/>`;
  // grass tufts and glowing flowers, bigger towards the viewer; none on the path
  let tufts = '', flowers = '';
  for (let i = 0; i < 150; i++) {
    const y = 520 + Math.pow(r(), 1.4) * 760, x = X0 + r() * W, k = 1 + (y - 500) / 420;
    if (onPath(x, y, 26)) continue;
    if (Math.abs(x - px) < 180 && Math.abs(y - py) < 54) continue;
    const hgt = (7 + r() * 9) * k, u = 2 * k;
    tufts += `M${f(x - 2.5 * u)} ${f(y)}l${f(u)} ${f(-hgt * 0.7)}l${f(u)} ${f(hgt * 0.5)}l${f(u)} ${f(-hgt)}l${f(u)} ${f(hgt * 0.8)}l${f(u)} ${f(-hgt * 0.6)}l${f(u)} ${f(hgt * 0.6)}Z`;
    if (r() < 0.2) { const fx = x + 8 * u, fy = y + 4; flowers += `<circle cx="${f(fx)}" cy="${f(fy - 9 * k)}" r="${f(10 * k)}" fill="url(#ws-tglow)"/><path d="M${f(fx)} ${f(fy)}v${f(-7 * k)}" stroke="#2f7f8a" stroke-width="${f(1.6 * k)}"/><path d="${star4(fx, fy - 9 * k, 3.6 * k, 0.3)}" fill="#9ff5ee"/>`; }
  }
  s += `<path d="${tufts}" fill="#2c2172" opacity=".85"/>` + flowers;
  // fireflies
  for (let i = 0; i < 26; i++) { const x = CX + (r() - 0.5) * 1900, y = 520 + r() * 620; s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.8 + r() * 2)}" fill="#fff3a0" class="ws-fly" style="animation-delay:${f(r() * 6)}s;animation-duration:${f(4.5 + r() * 4)}s"/>`; }
  return s;
}

// ---------------------------------------------------------------- characters and magic
const nest = (svg, x, y, w, h) => svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
const shadow = (cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${f(rx * 0.2)}" fill="#0b0620" opacity=".5"/>`;
function magic() {
  // a ribbon of glowing symbols sweeping up from the wand and over towards the Academy's star
  const pts = [[566, 318, 26, '+'], [528, 268, 31, '×'], [498, 212, 27, '7'], [492, 152, 31, '÷'], [520, 100, 26, '3'], [574, 62, 29, '='], [642, 40, 24, '½'], [706, 34, 20, '+']];
  let s = `<path d="M572 356C560 300 500 250 492 180C486 110 560 50 760 42" fill="none" stroke="#ffe9a8" stroke-width="2.6" stroke-dasharray="1 10" stroke-linecap="round" opacity=".85" class="ws-flow"/>`;
  s += `<circle cx="572" cy="358" r="40" fill="url(#ws-bglow)" class="ws-flick"/>`;
  pts.forEach(([x, y, size, ch], i) => {
    s += `<g class="ws-sym" style="animation-delay:${f(-i * 0.4)}s"><circle cx="${x}" cy="${f(y - size * 0.34)}" r="${f(size * 1.05)}" fill="url(#ws-bglow)" opacity=".75"/>`
      + `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="900" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" fill="${i % 2 ? '#ffe27a' : '#fff6c8'}" stroke="#7a4a12" stroke-width="${f(size * 0.11)}" paint-order="stroke" stroke-linejoin="round">${ch}</text></g>`;
  });
  return s;
}
function cast({ wizard, pets }) {
  let s = '';
  s += shadow(522, 480, 52);
  s += `<g class="ws-bob">${nest(wizardSVG(wizard, { facing: 'right', pose: 'cast' }), 448, 284, 148, 197)}</g>`;
  s += magic();
  s += shadow(1070, 476, 46) + `<g class="ws-bob" style="animation-delay:-1.1s">${nest(creatureSVG(pets[0], 2, { mood: 'happy', facing: 'left' }), 1004, 350, 134, 134)}</g>`;
  s += shadow(1204, 480, 36) + `<g class="ws-bob" style="animation-delay:-2s">${nest(creatureSVG(pets[1], 1, { facing: 'left' }), 1152, 380, 106, 106)}</g>`;
  s += `<g class="ws-hover">${nest(creatureSVG(pets[2], 1, { facing: 'left' }), 1008, 214, 76, 76)}</g>`;
  return s;
}

const DEFS = `<defs>
<linearGradient id="ws-sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="500"><stop offset="0" stop-color="#0c0730"/><stop offset=".34" stop-color="#1c1259"/><stop offset=".58" stop-color="#3a2491"/><stop offset=".76" stop-color="#7647bd"/><stop offset=".9" stop-color="#c06fc6"/><stop offset="1" stop-color="#e79abf"/></linearGradient>
<linearGradient id="ws-aur1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#54f0c4" stop-opacity="0"/><stop offset=".45" stop-color="#54f0c4" stop-opacity=".42"/><stop offset=".75" stop-color="#6f8cff" stop-opacity=".22"/><stop offset="1" stop-color="#6f8cff" stop-opacity="0"/></linearGradient>
<linearGradient id="ws-aur2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b47cff" stop-opacity="0"/><stop offset=".5" stop-color="#ff8fd8" stop-opacity=".28"/><stop offset="1" stop-color="#ff8fd8" stop-opacity="0"/></linearGradient>
<linearGradient id="ws-trail" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>
<radialGradient id="ws-halo"><stop offset="0" stop-color="#fff3c4" stop-opacity=".5"/><stop offset=".3" stop-color="#ffe7a8" stop-opacity=".2"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient>
<radialGradient id="ws-moon" cx=".62" cy=".36" r=".8"><stop offset="0" stop-color="#fffdf0"/><stop offset=".55" stop-color="#ffeaa6"/><stop offset="1" stop-color="#f1bf62"/></radialGradient>
<clipPath id="ws-moonclip"><circle cx="986" cy="104" r="44"/></clipPath>
<radialGradient id="ws-glow"><stop offset="0" stop-color="#ffc8ee" stop-opacity=".62"/><stop offset=".5" stop-color="#e39bf0" stop-opacity=".26"/><stop offset="1" stop-color="#c58cf5" stop-opacity="0"/></radialGradient>
<linearGradient id="ws-mt1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d53bd"/><stop offset=".45" stop-color="#7e60c8"/><stop offset="1" stop-color="#8f6fd0"/></linearGradient>
<linearGradient id="ws-mt2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#412d8f"/><stop offset="1" stop-color="#352578"/></linearGradient>
<linearGradient id="ws-mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d9ff" stop-opacity="0"/><stop offset=".6" stop-color="#f3d9ff" stop-opacity=".26"/><stop offset="1" stop-color="#f3d9ff" stop-opacity="0"/></linearGradient>
<linearGradient id="ws-hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2b8c"/><stop offset=".3" stop-color="#2a1f6c"/><stop offset="1" stop-color="#1a1247"/></linearGradient>
<linearGradient id="ws-fg" gradientUnits="userSpaceOnUse" x1="0" y1="440" x2="0" y2="1800"><stop offset="0" stop-color="#261a68"/><stop offset=".05" stop-color="#1b1248"/><stop offset=".2" stop-color="#191146"/><stop offset=".45" stop-color="#140c36"/><stop offset="1" stop-color="#0d0824"/></linearGradient>
<linearGradient id="ws-rise" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a38ac" stop-opacity=".5"/><stop offset=".5" stop-color="#3a2b8c" stop-opacity=".16"/><stop offset="1" stop-color="#3a2b8c" stop-opacity="0"/></linearGradient>
<linearGradient id="ws-pond" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4fb8"/><stop offset=".5" stop-color="#2a2f8a"/><stop offset="1" stop-color="#1a1454"/></linearGradient>
<linearGradient id="ws-path" gradientUnits="userSpaceOnUse" x1="0" y1="364" x2="0" y2="1150"><stop offset="0" stop-color="#ffe2a0"/><stop offset=".045" stop-color="#d9b0c8"/><stop offset=".11" stop-color="#8f7ad0"/><stop offset=".19" stop-color="#5546a6"/><stop offset=".42" stop-color="#43358c" stop-opacity=".8"/><stop offset=".7" stop-color="#3a2c80" stop-opacity=".4"/><stop offset="1" stop-color="#3a2c80" stop-opacity="0"/></linearGradient>
<linearGradient id="ws-spill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b8" stop-opacity=".75"/><stop offset="1" stop-color="#fff3b8" stop-opacity="0"/></linearGradient>
<linearGradient id="ws-win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8c8"/><stop offset="1" stop-color="#ffbe45"/></linearGradient>
<linearGradient id="ws-door" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd768"/><stop offset=".6" stop-color="#fff5c0"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
<radialGradient id="ws-wglow"><stop offset="0" stop-color="#ffd76a" stop-opacity=".6"/><stop offset=".5" stop-color="#ffb84a" stop-opacity=".22"/><stop offset="1" stop-color="#ffb84a" stop-opacity="0"/></radialGradient>
<radialGradient id="ws-bglow"><stop offset="0" stop-color="#fff6c0" stop-opacity=".85"/><stop offset=".4" stop-color="#ffd76a" stop-opacity=".35"/><stop offset="1" stop-color="#ffd76a" stop-opacity="0"/></radialGradient>
<radialGradient id="ws-tglow"><stop offset="0" stop-color="#8ff5ea" stop-opacity=".7"/><stop offset="1" stop-color="#8ff5ea" stop-opacity="0"/></radialGradient>
</defs>`;

/** Tall grass with a few glowing flowers for a bottom corner of the screen (it frames the picture and sways a little). */
function corner(flip) {
  const r = rng(flip ? 71 : 59);
  let back = '', front = '', rim = '', flowers = '';
  for (let i = 0; i < 20; i++) {
    const x = -10 + i * 15 + r() * 10, t = Math.max(0, 1 - x / 300), h = 26 + t * t * 150 * (0.7 + r() * 0.5), w = 7 + t * 9 + r() * 4, lean = (r() - 0.25) * h * 0.5;
    const d = `M${f(x - w)} 204Q${f(x - w + lean * 0.25)} ${f(204 - h * 0.6)} ${f(x + lean)} ${f(204 - h)}Q${f(x + w + lean * 0.5)} ${f(204 - h * 0.5)} ${f(x + w)} 204Z`;
    if (i % 3 === 1) back += d; else { front += d; rim += `M${f(x + w)} 204Q${f(x + w + lean * 0.5)} ${f(204 - h * 0.5)} ${f(x + lean)} ${f(204 - h)}`; }
    if (i % 5 === 2) { const fx = x + lean * 0.8 + 10, fy = 204 - h * 0.78; flowers += `<path d="M${f(fx - 4)} 204Q${f(fx - 6)} ${f(fy + 30)} ${f(fx)} ${f(fy)}" fill="none" stroke="#1f6f7c" stroke-width="2.4"/><circle cx="${f(fx)}" cy="${f(fy)}" r="17" fill="url(#ws-tglow)"/><path d="${star4(fx, fy, 6.5, 0.3)}" fill="#b6fbf4"/>`; }
  }
  const inner = `<path d="${back}" fill="#1c1350"/>${flowers}<path d="${front}" fill="#0f0930"/><path d="${rim}" fill="none" stroke="#5a48b8" stroke-width="1.6" opacity=".55"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="ws-corner ${flip ? 'r' : 'l'}" viewBox="0 0 300 200" aria-hidden="true">${flip ? `<g transform="translate(300 0) scale(-1 1)">${inner}</g>` : inner}</svg>`;
}

/** The whole scene as markup for the welcome screen's background: back SVG, mist, front SVG, mist.
 *  plus the grass in the two bottom corners. No sizes: the caller sets both viewBoxes and CSS sizes the layers. */
export function welcomeSceneSVG(o = {}) {
  const who = { wizard: o.wizard || { skin: 2, hair: 1, hairColor: 3, robe: 0, hat: 0, hatColor: 0 }, pets: o.pets || ['numberling', 'datapup', 'hummbit'] };
  const open = (cls, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" class="ws-svg ${cls}" viewBox="${X0} 0 ${W} ${H}" preserveAspectRatio="xMidYMin slice" overflow="hidden"${extra}>`;
  return open('ws-back', ' role="img" aria-label="The Math Wizard Academy on a hill at night, with a wizard and pets"') + DEFS + sky() + farMountains() + '</svg>'
    + '<div class="ws-mist m1"></div>'
    + open('ws-front', ' aria-hidden="true"') + nearMountains() + forest() + hill() + extras() + castle() + meadow() + mounds() + path()
    + pathLantern(-1, 392) + pathLantern(1, 392) + pathLantern(-1, 446) + pathLantern(1, 446) + pathLantern(-1, 500, true) + pathLantern(1, 740, true)
    + foreground() + cast(who) + '</svg>'
    + '<div class="ws-mist m2"></div>' + corner(false) + corner(true);
}

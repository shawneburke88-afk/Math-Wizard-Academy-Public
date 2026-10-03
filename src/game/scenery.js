// Living scenery for the overworld: varied trees along the forest walls, small decorations, gentle sway,
// drifting cloud shadows, and ambient critters per region (sparkles, butterflies, crystal glints, gulls, fireflies).
import { W, H, TILE, G, areaAt } from '../content/world.js';
import { propSVG, PROP_VARIANTS } from '../art/world.js';

const THEMES = ['academy', 'number', 'patterns', 'shape', 'stats'];
const OPEN = new Set([G.GRASS, G.GRASS2, G.FLOWERS]);
// Small ground decorations per theme [TUNABLE].
const DECOR = {
  academy: [['bush', 0.55], ['rock', 0.4], ['mushroom', 0.45]],
  number: [['crystal', 0.55], ['rock', 0.4], ['bush', 0.5]],
  patterns: [['mushroom', 0.55], ['bush', 0.55], ['rock', 0.35]],
  shape: [['rock', 0.55], ['crystal', 0.45], ['bush', 0.45]],
  stats: [['rock', 0.45], ['bush', 0.5], ['mushroom', 0.4]],
};
const TINTS = [0xffffff, 0xf4f4f4, 0xe9f1e6, 0xe2ebe0, 0xf6efe4];

/** Textures for the scenery (call inside the scene's texture build, before dressing the world). */
export function sceneryTextureJobs(scene, addSvgTexture, RES, safe) {
  const jobs = [];
  for (const th of THEMES) {
    for (let v = 0; v < (PROP_VARIANTS.tree || 1); v++) jobs.push(addSvgTexture(scene, `sc:tree:${th}:${v}`, safe(() => propSVG('tree', th, v)), 48 * RES, 96 * RES));
    for (const k of ['bush', 'rock', 'crystal', 'mushroom']) for (let v = 0; v < (PROP_VARIANTS[k] || 1); v++) jobs.push(addSvgTexture(scene, `sc:${k}:${th}:${v}`, safe(() => propSVG(k, th, v)), 48 * RES, 48 * RES));
  }
  // Critters and effects, drawn on small canvases.
  const canvas = (key, w, h, draw) => { if (scene.textures.exists(key)) return; const t = scene.textures.createCanvas(key, w, h); draw(t.getContext(), w, h); t.refresh(); };
  canvas('sc:cloud', 256, 128, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(20,10,40,0.9)'); g.addColorStop(0.6, 'rgba(20,10,40,0.45)'); g.addColorStop(1, 'rgba(20,10,40,0)'); c.fillStyle = g; c.save(); c.scale(1, h / w); c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, 7); c.fill(); c.restore(); });
  canvas('sc:spark', 24, 24, (c) => { c.fillStyle = '#fff6c8'; c.strokeStyle = 'rgba(255,220,120,.9)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(12, 1); c.quadraticCurveTo(13, 11, 23, 12); c.quadraticCurveTo(13, 13, 12, 23); c.quadraticCurveTo(11, 13, 1, 12); c.quadraticCurveTo(11, 11, 12, 1); c.fill(); c.stroke(); });
  canvas('sc:glow', 32, 32, (c) => { const g = c.createRadialGradient(16, 16, 1, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,210,1)'); g.addColorStop(0.35, 'rgba(255,240,140,.7)'); g.addColorStop(1, 'rgba(255,230,120,0)'); c.fillStyle = g; c.fillRect(0, 0, 32, 32); });
  canvas('sc:butterfly', 28, 22, (c) => { const wing = (x, col) => { c.fillStyle = col; c.strokeStyle = '#2b2140'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, 8, 6, 7, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.ellipse(x, 16, 4.5, 4.5, 0, 0, 7); c.fill(); c.stroke(); }; wing(8, '#ff8fbd'); wing(20, '#ff8fbd'); c.fillStyle = '#2b2140'; c.fillRect(13, 4, 2, 15); });
  canvas('sc:butterfly2', 28, 22, (c) => { const wing = (x, col) => { c.fillStyle = col; c.strokeStyle = '#2b2140'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, 8, 6, 7, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.ellipse(x, 16, 4.5, 4.5, 0, 0, 7); c.fill(); c.stroke(); }; wing(8, '#ffe066'); wing(20, '#ffe066'); c.fillStyle = '#2b2140'; c.fillRect(13, 4, 2, 15); });
  canvas('sc:leaf', 16, 12, (c) => { c.fillStyle = '#7fcf5a'; c.strokeStyle = '#2f7a4a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(1, 6); c.quadraticCurveTo(8, -2, 15, 6); c.quadraticCurveTo(8, 14, 1, 6); c.fill(); c.stroke(); });
  canvas('sc:petal', 12, 10, (c) => { c.fillStyle = '#ffb3cf'; c.beginPath(); c.ellipse(6, 5, 5, 3.5, 0.4, 0, 7); c.fill(); });
  canvas('sc:shard', 14, 22, (c) => { c.fillStyle = '#9ff0ff'; c.strokeStyle = '#2b2140'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(7, 1); c.lineTo(13, 11); c.lineTo(7, 21); c.lineTo(1, 11); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(7, 3); c.lineTo(10, 11); c.lineTo(7, 11); c.closePath(); c.fill(); });
  canvas('sc:gull', 30, 12, (c) => { c.strokeStyle = '#2b2140'; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(2, 8); c.quadraticCurveTo(8, 1, 15, 8); c.quadraticCurveTo(22, 1, 28, 8); c.stroke(); c.strokeStyle = '#ffffff'; c.lineWidth = 1.2; c.stroke(); });
  canvas('sc:glint', 18, 6, (c) => { c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(9, 3, 8, 2, 0, 0, 7); c.fill(); });
  canvas('sc:wind', 60, 8, (c) => { c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(2, 5); c.quadraticCurveTo(30, 0, 58, 4); c.stroke(); });
  return jobs;
}

/** Adds varied trees and decorations, and starts the ambient layer. */
export function dressWorld(scene, RES) {
  const { ground, theme } = scene.world;
  const rnd = seeded(20260926);
  const blockedByProp = new Set();
  for (const p of scene.world.props) for (let dy = 0; dy < (p.h || 1); dy++) for (let dx = 0; dx < (p.w || 1); dx++) blockedByProp.add(`${p.x + dx},${p.y + dy}`);
  const g = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? G.CANOPY : ground[y][x]);
  scene.swayers = [];

  const tree = (x, y, th, s, jitter = 12) => {
    const v = Math.floor(rnd() * (PROP_VARIANTS.tree || 1));
    const px = x * TILE + 24 + (rnd() - 0.5) * 2 * jitter, py = y * TILE + 46 + (rnd() - 0.5) * jitter;
    const img = scene.add.image(px, py, `sc:tree:${th}:${v}`).setOrigin(0.5, 1).setScale(s / RES).setDepth(py);
    img.setTint(TINTS[Math.floor(rnd() * TINTS.length)]);
    if (rnd() < 0.5) img.setFlipX(true);
    scene.swayers.push({ o: img, amp: 0.012 + rnd() * 0.02, spd: 0.0008 + rnd() * 0.0007, ph: rnd() * 7 });
  };

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = ground[y][x], th = theme[y][x] || 'academy';
    if (t === G.CANOPY) {
      // Trees of different kinds and sizes along the forest edge (and a few inside) so walls don't look like wallpaper.
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => OPEN.has(g(x + dx, y + dy)) || g(x + dx, y + dy) === G.PATH || g(x + dx, y + dy) === G.TALL || g(x + dx, y + dy) === G.SAND);
      if (edge ? rnd() < 0.8 : rnd() < 0.16) tree(x, y, th, 0.8 + rnd() * 0.6);
      if (edge && rnd() < 0.3) {
        const k = rnd() < 0.7 ? 'bush' : 'rock';
        const img = scene.add.image(x * TILE + 24 + (rnd() - 0.5) * 30, y * TILE + 46, `sc:${k}:${th}:${Math.floor(rnd() * 3)}`).setOrigin(0.5, 1).setScale((0.6 + rnd() * 0.35) / RES).setDepth(y * TILE + 47);
        if (k === 'bush') scene.swayers.push({ o: img, amp: 0.02 + rnd() * 0.02, spd: 0.0012 + rnd() * 0.0008, ph: rnd() * 7 });
      }
    } else if (OPEN.has(t) && !blockedByProp.has(`${x},${y}`) && !scene.world.roadTiles?.has(`${x},${y}`) && rnd() < 0.05) {
      // Small decorations on open ground (walk-through, just for looks).
      const list = DECOR[th] || DECOR.academy;
      const [k, base] = list[Math.floor(rnd() * list.length)];
      const px = x * TILE + 10 + rnd() * 28, py = y * TILE + 30 + rnd() * 16;
      const img = scene.add.image(px, py, `sc:${k}:${th}:${Math.floor(rnd() * (PROP_VARIANTS[k] || 1))}`).setOrigin(0.5, 1).setScale((base + rnd() * 0.2) / RES).setDepth(py - 30);
      if (rnd() < 0.5) img.setFlipX(true);
      if (k === 'bush' || k === 'mushroom') scene.swayers.push({ o: img, amp: 0.02 + rnd() * 0.02, spd: 0.0012 + rnd() * 0.001, ph: rnd() * 7 });
    }
  }

  // Drifting cloud shadows.
  scene.clouds = [];
  for (let i = 0; i < 5; i++) {
    const c = scene.add.image(0, 0, 'sc:cloud').setDepth(8400).setAlpha(0.1 + rnd() * 0.05).setScale(2.2 + rnd() * 1.8);
    c._vx = 10 + rnd() * 10; c._vy = 3 + rnd() * 4; c._placed = false;
    scene.clouds.push(c);
  }
  scene.critters = [];
}

/** Per-frame: sway plants in view, move clouds, spawn and animate critters. */
export function updateScenery(scene, time, delta) {
  const cam = scene.cameras?.main;
  if (!cam || !scene.swayers) return;
  const v = cam.worldView, m = 120;
  const inView = (o) => o.x > v.x - m && o.x < v.right + m && o.y > v.y - m && o.y < v.bottom + m * 2;
  for (const s of scene.swayers) if (inView(s.o)) s.o.rotation = s.amp * Math.sin(time * s.spd + s.ph);
  const dt = Math.min(0.05, (delta || 16) / 1000);
  for (const c of scene.clouds) {
    const w = c.displayWidth;
    if (!c._placed || c.x - w / 2 > v.right + 40 || c.y - c.displayHeight / 2 > v.bottom + 40) {
      c.x = c._placed ? v.x - w / 2 - Math.random() * 200 : v.x + Math.random() * v.width;
      c.y = v.y + Math.random() * v.height - (c._placed ? 100 : 0);
      c._placed = true;
    }
    c.x += c._vx * dt; c.y += c._vy * dt;
  }
  // Critters: keep a small pool alive near the camera.
  scene.critters = scene.critters.filter((k) => k.active);
  const want = Math.min(16, Math.round((v.width * v.height) / 60000));
  if (scene.critters.length < want && Math.random() < 0.15) spawnCritter(scene, v);
}

function spawnCritter(scene, v) {
  const x = v.x + Math.random() * v.width, y = v.y + Math.random() * v.height;
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= W || ty >= H) return;
  const gnd = scene.world.ground[ty][tx];
  const region = areaAt(tx, ty)?.region || scene.world.theme[ty][tx] || 'academy';
  const D = 8500;
  const add = (key, o = {}) => { const s = scene.add.image(x, y, key).setDepth(D).setScale(o.scale || 0.5).setAlpha(0); scene.critters.push(s); return s; };
  const done = (s) => () => s.destroy();
  if (gnd === G.WATER) {
    // Sparkles on the water.
    const s = add('sc:glint', { scale: 0.7 + Math.random() * 0.6 });
    scene.tweens.add({ targets: s, alpha: { from: 0, to: 0.9 }, scaleX: s.scaleX * 1.4, duration: 700, yoyo: true, onComplete: done(s) });
    return;
  }
  const r = Math.random();
  if (region === 'number' || (region === 'academy' && r < 0.4)) {
    // Twinkling number-star sparkles drifting up.
    const s = add('sc:spark', { scale: 0.35 + Math.random() * 0.4 });
    scene.tweens.add({ targets: s, alpha: { from: 0, to: 1 }, y: y - 30, angle: 90, duration: 1400, yoyo: true, hold: 200, onComplete: done(s) });
  } else if (region === 'patterns') {
    if (r < 0.55) {
      // A butterfly flutters along a wavy path, wings flapping.
      const s = add(Math.random() < 0.5 ? 'sc:butterfly' : 'sc:butterfly2', { scale: 0.55 });
      const dir = Math.random() < 0.5 ? -1 : 1;
      scene.tweens.add({ targets: s, alpha: 1, duration: 300 });
      scene.tweens.add({ targets: s, scaleX: 0.15, duration: 140, yoyo: true, repeat: -1 });
      scene.tweens.add({ targets: s, x: x + dir * (160 + Math.random() * 160), duration: 5200, onComplete: done(s) });
      scene.tweens.add({ targets: s, y: y - 24, duration: 900, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
    } else {
      // Falling leaves and petals.
      const s = add(Math.random() < 0.6 ? 'sc:leaf' : 'sc:petal', { scale: 0.7 });
      scene.tweens.add({ targets: s, alpha: { from: 0, to: 1 }, duration: 400 });
      scene.tweens.add({ targets: s, x: x + 60 + Math.random() * 60, y: y + 90, angle: 300, duration: 4200, ease: 'Sine.inOut', onComplete: done(s) });
    }
  } else if (region === 'shape') {
    // Floating crystal shards that bob and spin, catching the light.
    const s = add('sc:shard', { scale: 0.55 + Math.random() * 0.3 });
    scene.tweens.add({ targets: s, alpha: { from: 0, to: 0.95 }, y: y - 40, angle: (Math.random() < 0.5 ? -1 : 1) * 60, duration: 2200, yoyo: true, ease: 'Sine.inOut', onComplete: done(s) });
  } else if (region === 'stats') {
    if (r < 0.5) {
      // Gulls gliding across.
      const s = add('sc:gull', { scale: 0.6 + Math.random() * 0.3 });
      scene.tweens.add({ targets: s, alpha: 1, duration: 400 });
      scene.tweens.add({ targets: s, scaleY: 0.3, duration: 260, yoyo: true, repeat: -1 });
      scene.tweens.add({ targets: s, x: x + 420, y: y - 60, duration: 6000, onComplete: done(s) });
    } else {
      // Gusts of sea wind.
      const s = add('sc:wind', { scale: 0.8 + Math.random() * 0.6 });
      scene.tweens.add({ targets: s, alpha: { from: 0, to: 0.7 }, x: x + 90, duration: 900, yoyo: true, onComplete: done(s) });
    }
  } else {
    // Academy fireflies wandering.
    const s = add('sc:glow', { scale: 0.5 + Math.random() * 0.4 });
    s.setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: s, alpha: { from: 0, to: 0.9 }, x: x + (Math.random() - 0.5) * 80, y: y - 30 - Math.random() * 30, duration: 1800, yoyo: true, ease: 'Sine.inOut', onComplete: done(s) });
  }
}

function seeded(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

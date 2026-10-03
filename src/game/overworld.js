// The open-world map (Phaser). Draws the tile world, props, NPCs, fog of war, and the walking wizard.
// Talks to the rest of the app through the `hooks` object: onEncounter, onInteract, onAreaChange, onDiscover, onStep.
/* global Phaser */
import { W, H, TILE, AREAS, FEATURES, G, LINKS, buildWorld, autotile, areaAt, gateTiles, START, depthLabel } from '../content/world.js';
import { STRANDS } from '../content/curriculum.js';
import { tileSVG, propSVG } from '../art/world.js';
import { wizardSVG, npcSVG } from '../art/wizard.js';
import { creatureSVG, guardianSVG } from '../art/creatures.js';
import { chestSVG, mentalChestSVG } from '../art/items.js';
import { gateOpen, guardianAwake, keeperAwake, speciesUnlocked, teamPets, wildStage, canBefriendStage, pickWildSpecies, areaPet, areaShift } from './progress.js';
import { persist } from '../core/save.js';
import { SPECIES } from '../content/species.js';
import { sceneryTextureJobs, dressWorld, updateScenery } from './scenery.js';
const SPECIES_IDS = Object.keys(SPECIES);

const RES = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));
const TEX = TILE * RES;
const THEMES = ['academy', 'number', 'patterns', 'shape', 'stats'];
const REVEAL = 5;          // fog reveal radius in tiles
// Roaming pets per subzone when it's full (deeper subzones are bigger) [TUNABLE]. v48: was 5/7/9/11, well short of each
// area's "win N" quest, so kids (and test bots) spent most of an area walking tall grass for surprise battles.
const WILD_MAX = { 1: 7, 2: 11, 3: 13, 4: 15 };
const DAY_MS = 24 * 60 * 60 * 1000;
const SPOT = 3;            // distance at which hidden challenge pets / chests become visible
const STEP_MS = 150;
// Entrance sign colours and the math-type icon per region.
const SIGN_STYLE = {
  number: { board: 0x2f3f7a, sub: '#ffe27a', icon: '⭐' },
  patterns: { board: 0x2f6a3a, sub: '#c8f59a', icon: '🌿' },
  shape: { board: 0x7a4a2a, sub: '#ffc98a', icon: '📐' },
  stats: { board: 0x2a5a7a, sub: '#a8e4ff', icon: '📊' },
};

let game = null;

export function startOverworld(profile, hooks) {
  stopOverworld();
  const iw = window.innerWidth, ih = window.innerHeight;
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#1d1236',
    scale: { mode: Phaser.Scale.NONE, width: iw * RES, height: ih * RES, zoom: 1 / RES },
    render: { antialias: true, pixelArt: false, roundPixels: false },
    input: { activePointers: 2 },
    scene: [],
    banner: false,
  });
  game.scene.add('world', WorldScene, true, { profile, hooks });
  window.__mwaGame = game;   // test hook
  window.addEventListener('resize', onResize);
  return game;
}

function onResize() {
  if (!game) return;
  game.scale.resize(window.innerWidth * RES, window.innerHeight * RES);
  game.scale.setZoom(1 / RES);
}

export function stopOverworld() {
  window.removeEventListener('resize', onResize);
  if (game) { game.destroy(true); game = null; }
  document.getElementById('game').innerHTML = '';
}

export function worldScene() { return game?.scene.getScene('world') || null; }

/** Pause rendering while a full-screen battle or menu is up (saves battery). */
export function sleepWorld(asleep) {
  if (!game) return;
  const canvas = game.canvas;
  if (asleep) { game.loop.sleep(); if (canvas) canvas.style.visibility = 'hidden'; }
  else { game.loop.wake(); if (canvas) canvas.style.visibility = 'visible'; }
}

// ---------- SVG -> texture helpers ----------
function sizedSvg(svg, w, h) {
  return svg.replace(/<svg\b([^>]*)>/, (m, attrs) => {
    const a = attrs.replace(/\s(width|height)="[^"]*"/g, '');
    return `<svg${a} width="${w}" height="${h}">`;
  });
}
function loadSvgImage(svg, w, h) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { console.warn('SVG failed to load'); resolve(null); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sizedSvg(svg, w, h));
  });
}
async function addSvgTexture(scene, key, svg, w, h) {
  if (scene.textures.exists(key)) return;
  const img = await loadSvgImage(svg, w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  if (img) c.getContext('2d').drawImage(img, 0, 0, w, h);
  scene.textures.addCanvas(key, c);
}

// ---------- fog persistence (1 bit per tile) ----------
function loadFog(profile) {
  const bits = new Uint8Array(Math.ceil((W * H) / 8));
  if (profile.fog) {
    try { const bin = atob(profile.fog); for (let i = 0; i < bin.length && i < bits.length; i++) bits[i] = bin.charCodeAt(i); } catch (e) { /* fresh */ }
  }
  return bits;
}
function saveFog(profile, bits) {
  let bin = '';
  bits.forEach((b) => { bin += String.fromCharCode(b); });
  profile.fog = btoa(bin);
}
const fogGet = (bits, x, y) => (bits[(y * W + x) >> 3] >> ((y * W + x) & 7)) & 1;
const fogSet = (bits, x, y) => { bits[(y * W + x) >> 3] |= 1 << ((y * W + x) & 7); };

class WorldScene extends Phaser.Scene {
  constructor() { super('world'); }

  init(data) {
    this.profile = data.profile;
    this.hooks = data.hooks;
    this.frozen = true;
    this.moving = false;
    this.path = [];
    this.stepsSinceBattle = 0;
    this.entities = [];
  }

  async create() {
    this.world = buildWorld();
    this.hooks.onLoading?.('Drawing the world…');
    await this.buildTextures();
    this.drawGround();
    this.drawProps();
    dressWorld(this, RES);
    this.drawSigns();
    this.createEntities();
    this.createPlayer();
    this.createFog();
    this.setupCamera();
    this.setupInput();
    this.scale.on('resize', () => this.setupCamera());
    this.currentArea = null;
    this.checkArea(true);
    this.revealAround(true);
    this.frozen = false;
    this.hooks.onReady?.();
  }

  // ---------- textures ----------
  async buildTextures() {
    // Ground atlas: every distinct (tile name, theme) pair in the map, including autotiled edges and corners.
    this.tileNames = autotile(this.world);
    const combos = new Map();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = this.tileNames[y][x] + '|' + this.world.theme[y][x];
      if (!combos.has(k)) combos.set(k, combos.size);
    }
    this.tileIndex = combos;
    const cols = 16, rows = Math.ceil(combos.size / cols);
    const atlas = document.createElement('canvas');
    atlas.width = cols * TEX; atlas.height = rows * TEX;
    const ctx = atlas.getContext('2d');
    await Promise.all([...combos.entries()].map(([k, i]) => {
      const [name, th] = k.split('|');
      return loadSvgImage(safe(() => tileSVG(name, th)), TEX, TEX).then((img) => { if (img) ctx.drawImage(img, (i % cols) * TEX, Math.floor(i / cols) * TEX, TEX, TEX); });
    }));
    this.textures.addCanvas('ground', atlas);

    // Props used by this world.
    const needed = new Map();
    for (const p of this.world.props) needed.set(`prop:${p.prop}:${p.theme}:${p.variant || 0}`, p);
    const propJobs = [...needed.entries()].map(([key, p]) => addSvgTexture(this, key, safe(() => propSVG(p.prop, p.theme, p.variant || 0)), p.w * TEX, p.h * TEX));
    for (const [id, f] of Object.entries(FEATURES)) {
      if (f.gate) {
        const th = AREAS.find((a) => a.id === id).theme;
        propJobs.push(addSvgTexture(this, `gate:closed:${th}`, safe(() => propSVG('gate_closed', th)), 2 * TEX, 2 * TEX));
        propJobs.push(addSvgTexture(this, `gate:open:${th}`, safe(() => propSVG('gate_open', th)), 2 * TEX, 2 * TEX));
      }
    }
    // Wizard walk frames.
    for (const facing of ['down', 'up', 'left', 'right']) for (let f = 0; f < 4; f++) {
      propJobs.push(addSvgTexture(this, `wiz:${facing}:${f}`, safe(() => wizardSVG(this.profile.look, { facing, frame: f })), 48 * RES, 64 * RES));
    }
    const npcKinds = new Set(['professor', 'healer', 'shopkeeper']);
    Object.values(FEATURES).forEach((f) => (f.trainers || []).forEach((t) => npcKinds.add(t.kind)));
    for (const k of npcKinds) propJobs.push(addSvgTexture(this, `npc:${k}`, safe(() => npcSVG(k, { facing: 'down' })), 48 * RES, 64 * RES));
    const chSpecies = new Set();
    Object.values(FEATURES).forEach((f) => (f.challenges || []).forEach((c) => chSpecies.add(c.species)));
    for (const s of chSpecies) propJobs.push(addSvgTexture(this, `ch:${s}`, safe(() => creatureSVG(s, 1, { variant: 'rare', facing: 'left' })), 64 * RES, 64 * RES));
    for (const sp of SPECIES_IDS) propJobs.push(addSvgTexture(this, `pet:${sp}`, safe(() => creatureSVG(sp, 1, { facing: 'left' })), 56 * RES, 56 * RES));
    // Evolved wild pets (stages 2 and 3) roam too.
    for (const sp of SPECIES_IDS) for (const st of [2, 3]) propJobs.push(addSvgTexture(this, `pet:${sp}:${st}`, safe(() => creatureSVG(sp, st, { facing: 'left' })), 60 * RES, 60 * RES));
    for (const region of ['number', 'patterns', 'shape', 'stats']) propJobs.push(addSvgTexture(this, `guardian:${region}`, safe(() => guardianSVG(region, {})), 104 * RES, 104 * RES));
    propJobs.push(addSvgTexture(this, 'chest:closed', safe(() => chestSVG('challenge', false)), 44 * RES, 44 * RES));
    propJobs.push(addSvgTexture(this, 'chest:open', safe(() => chestSVG('challenge', 'empty')), 44 * RES, 44 * RES));
    propJobs.push(addSvgTexture(this, 'mchest:ready', safe(() => mentalChestSVG('ready')), 48 * RES, 48 * RES));
    propJobs.push(addSvgTexture(this, 'mchest:done', safe(() => mentalChestSVG('done')), 48 * RES, 48 * RES));
    propJobs.push(...sceneryTextureJobs(this, addSvgTexture, RES, safe));
    await Promise.all(propJobs);
  }

  // ---------- map ----------
  drawGround() {
    const { theme } = this.world;
    const data = this.tileNames.map((row, y) => row.map((n, x) => this.tileIndex.get(n + '|' + theme[y][x])));
    const map = this.make.tilemap({ data, tileWidth: TEX, tileHeight: TEX });
    const tiles = map.addTilesetImage('ground', 'ground', TEX, TEX, 0, 0);
    this.groundLayer = map.createLayer(0, tiles, 0, 0).setScale(1 / RES).setDepth(-10);
  }

  drawProps() {
    for (const p of this.world.props) {
      const img = this.add.image(p.x * TILE, p.y * TILE, `prop:${p.prop}:${p.theme}:${p.variant || 0}`).setOrigin(0, 0).setScale(1 / RES);
      img.setDepth((p.y + p.h) * TILE - 2);
      if (p.portal) {
        img.setDepth(-5);
        this.entities.push({ type: 'portal', id: 'portal-' + p.portal, x: p.x, y: p.y, w: 2, h: 2, area: p.portal, solid: false, sprite: img });
        this.tweens.add({ targets: img, alpha: { from: 0.85, to: 1 }, duration: 1200, yoyo: true, repeat: -1 });
      }
    }
  }

  /** Wooden signs at every area entrance: the area's name and which kind of math lives there. */
  drawSigns() {
    for (const L of LINKS) {
      const area = AREAS.find((a) => a.id === L.b);
      const st = SIGN_STYLE[area.region];
      const [ax, ay] = L.pa, [bx, by] = L.pb;
      const vertical = ax === bx;
      const lines = [area.name, `${st.icon} ${STRANDS[area.region].name} · ${depthLabel(area)}`];
      const gate = L.gate && FEATURES[L.a]?.gate;
      if (gate && vertical) this.makeSign((gate.x + 1) * TILE, (gate.y + 1) * TILE, lines, st, { arch: 3.4 * TILE, postH: 2 * TILE + 28 });   // arch over the gate
      else if (gate) this.makeSign((gate.x + 0.5) * TILE, (gate.y - 0.4) * TILE, lines, st, {});                                             // sign above the gate
      // With a Challenge standing on the border, the sign goes a few tiles past it so they don't overlap.
      const push = L.keeper ? 3.5 : 0;
      if (vertical) this.makeSign((ax + 1) * TILE, ((ay + by + 1) / 2 + Math.sign(by - ay) * push) * TILE, lines, st, { arch: 3.4 * TILE });   // arch on the border
      else this.makeSign(((ax + bx) / 2 + 0.5 + Math.sign(bx - ax) * push) * TILE, (ay - 0.2) * TILE, lines, st, {});                           // roadside sign on the border
    }
  }

  /** A sign board (x, y = where the posts meet the ground). arch = width between two tall posts spanning a road. */
  makeSign(x, y, [title, sub], st, { arch = 0, postH = arch ? 78 : 44 } = {}) {
    const font = { fontFamily: 'system-ui, sans-serif', fontStyle: '900', resolution: RES };
    const t1 = this.add.text(0, 0, title, { ...font, fontSize: '15px', color: '#fff6dc', stroke: '#3a2412', strokeThickness: 4 }).setOrigin(0.5);
    const t2 = this.add.text(0, 0, sub, { ...font, fontSize: '11px', color: st.sub, stroke: '#3a2412', strokeThickness: 3 }).setOrigin(0.5);
    const bw = Math.max(t1.width, t2.width) + 22, bh = 42;
    const boardY = y - postH;                     // board centre
    const g = this.add.graphics();
    const posts = arch ? [x - arch / 2, x + arch / 2] : [x - bw / 2 + 12, x + bw / 2 - 12];
    for (const px of posts) {
      g.fillStyle(0x000000, 0.22).fillEllipse(px, y + 2, 16, 6);
      g.fillStyle(0x6b4424, 1).fillRect(px - 4, boardY, 8, y - boardY);
      g.fillStyle(0x8a5a30, 1).fillRect(px - 4, boardY, 3, y - boardY);
    }
    if (arch) { g.fillStyle(0x6b4424, 1).fillRect(posts[0] - 6, boardY - bh / 2 - 6, arch + 12, 7); }
    g.fillStyle(0x3a2412, 1).fillRoundedRect(x - bw / 2 - 3, boardY - bh / 2 - 3, bw + 6, bh + 6, 9);
    g.fillStyle(st.board, 1).fillRoundedRect(x - bw / 2, boardY - bh / 2, bw, bh, 7);
    g.fillStyle(0xffffff, 0.12).fillRoundedRect(x - bw / 2 + 3, boardY - bh / 2 + 3, bw - 6, 8, 4);
    g.fillStyle(0xffd23f, 1).fillCircle(x - bw / 2 + 6, boardY - bh / 2 + 6, 2).fillCircle(x + bw / 2 - 6, boardY - bh / 2 + 6, 2);
    t1.setPosition(x, boardY - 8); t2.setPosition(x, boardY + 10);
    // Signs draw above trees and the wizard so they can always be read.
    const depth = 9300;
    g.setDepth(depth); t1.setDepth(depth + 1); t2.setDepth(depth + 1);
    (this.signs ||= []).push(g, t1, t2);
  }

  createEntities() {
    const P = this.profile;
    // Mental math chests (hidden, and walk-through, if a grown-up turned them off).
    const mentalOn = (P.settings.mentalTime ?? 20) > 0;
    for (const m of this.world.mentalChests || []) {
      if (!mentalOn) { this.world.solid[m.y][m.x] = false; continue; }
      const spr = this.add.image(m.x * TILE + 24, m.y * TILE + 46, 'mchest:ready').setOrigin(0.5, 1).setScale(1 / RES).setDepth(m.y * TILE + 46);
      const font = { fontFamily: 'system-ui, sans-serif', fontSize: '12px', fontStyle: '900', stroke: '#2b2140', strokeThickness: 4, color: '#9ff4ff' };
      const label = this.add.text(m.x * TILE + 24, m.y * TILE - 4, '', font).setOrigin(0.5, 1).setDepth(9400);
      const watch = this.add.text(m.x * TILE + 40, m.y * TILE - 22, '⏱', { fontSize: '18px' }).setOrigin(0.5).setDepth(9401);
      this.tweens.add({ targets: watch, y: watch.y - 5, angle: 12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const e = { type: 'mathchest', id: m.id, x: m.x, y: m.y, data: m, areaId: m.areaId, solid: true, parts: [spr, label, watch], sprite: spr, label, watch };
      this.entities.push(e);
      this.refreshMentalChest(e);
    }
    for (const [areaId, f] of Object.entries(FEATURES)) {
      for (const n of f.npcs || []) this.addNpc({ type: 'npc', id: n.id, x: n.x, y: n.y, data: n, tex: `npc:${n.kind}`, areaId });
      for (const t of f.trainers || []) {
        const e = this.addNpc({ type: 'trainer', id: t.id, x: t.x, y: t.y, data: t, tex: `npc:${t.kind}`, areaId });
        e.mark = this.add.text(t.x * TILE + 24, t.y * TILE - 30, P.beaten[t.id] ? '' : '!', { fontFamily: 'system-ui', fontSize: '28px', fontStyle: '900', color: '#ffd23f', stroke: '#2b2140', strokeThickness: 6 }).setOrigin(0.5).setDepth(9000);
        this.tweens.add({ targets: e.mark, y: e.mark.y - 6, duration: 500, yoyo: true, repeat: -1 });
      }
      for (const c of f.challenges || []) {
        if (P.beaten[c.id]) continue;
        const region = AREAS.find((a) => a.id === areaId).region;
        if (!speciesUnlocked(P, c.species, region, { challenge: true })) { (this.lockedChallenges ||= []).push({ c, areaId }); continue; }
        this.addChallenge(c, areaId);
      }
      for (const k of f.chests || []) {
        const opened = !!P.opened[k.id];
        const spr = this.add.image(k.x * TILE + 24, k.y * TILE + 44, opened ? 'chest:open' : 'chest:closed').setOrigin(0.5, 1).setScale(1 / RES).setDepth(k.y * TILE + 44);
        const parts = [spr];
        if (!opened) {
          const sparkle = this.add.text(k.x * TILE + 38, k.y * TILE + 2, '✦', { fontSize: '20px', color: '#fff6b0' }).setDepth(k.y * TILE + 45);
          this.tweens.add({ targets: sparkle, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });
          parts.push(sparkle);
        }
        this.entities.push({ type: 'chest', id: k.id, x: k.x, y: k.y, data: k, areaId, solid: true, hidden: !opened, opened, parts });
      }
      if (f.guardian) {
        const g = f.guardian;
        const region = AREAS.find((a) => a.id === areaId).region;
        const spr = this.add.image(g.x * TILE + 48, g.y * TILE + 40, `guardian:${region}`).setOrigin(0.5, 1).setScale(1 / RES).setDepth(g.y * TILE + 41);
        const e = { type: 'guardian', id: 'g-' + areaId, x: g.x, y: g.y - 1, w: 2, h: 2, data: g, areaId, solid: true, parts: [spr] };
        this.entities.push(e);
        this.refreshGuardian(e);
      }
      if (f.gate) {
        const th = AREAS.find((a) => a.id === areaId).theme;
        const gx = f.gate.orient === 'h' ? f.gate.x : f.gate.x - 0.5;
        const gy = f.gate.orient === 'h' ? f.gate.y - 1 : f.gate.y - 0.5;
        const spr = this.add.image(gx * TILE, gy * TILE, `gate:closed:${th}`).setOrigin(0, 0).setScale(1 / RES).setDepth((f.gate.y + 1) * TILE);
        const e = { type: 'gate', id: 'gate-' + areaId, gate: f.gate, theme: th, areaId, parts: [spr], sprite: spr };
        this.entities.push(e);
        this.refreshGate(e);
      }
    }
    this.createBlockers();
    this.wildId = 0;
    // Roaming pets: a set number per area. Pets you beat or befriend come back slowly (the area is full again by
    // the next day), so a kid can't farm the same spot endlessly.
    for (const a of AREAS.filter((a) => a.level > 0)) { const n = this.wildTarget(a); for (let i = 0; i < n; i++) this.spawnWild(a, true); }
    this.time.addEvent({ delay: 60000, loop: true, callback: () => this.topUpWild() });
    this.refreshHidden(true);
  }

  addChallenge(c, areaId) {
    const spr = this.add.image(c.x * TILE + 24, c.y * TILE + 46, `ch:${c.species}`).setOrigin(0.5, 1).setScale(0.9 / RES).setDepth(c.y * TILE + 46);
    const glow = this.add.circle(c.x * TILE + 24, c.y * TILE + 30, 30, 0xffe066, 0.35).setDepth(c.y * TILE + 40);
    this.tweens.add({ targets: [spr], y: spr.y - 5, duration: 900, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: glow, scale: 1.3, alpha: 0.1, duration: 900, yoyo: true, repeat: -1 });
    this.entities.push({ type: 'challenge', id: c.id, x: c.x, y: c.y, data: c, areaId, solid: true, hidden: true, parts: [spr, glow] });
    this.refreshHidden?.(true);
  }

  createBlockers(onlyRegion = null) {
    for (const b of this.world.blockers || []) {
      if (this.profile.beaten[b.id]) continue;
      if (onlyRegion && AREAS.find((a) => a.id === b.areaId)?.region !== onlyRegion) continue;
      const parts = [];
      if (b.mini) { this.addMiniGuardian(b); continue; }
      const n = b.group.length;
      b.group.forEach((sp, i) => {
        const [tx, ty] = b.tiles[Math.min(b.tiles.length - 1, Math.round(((i + 0.5) / n) * b.tiles.length - 0.5))];
        const spr = this.add.image(tx * TILE + 24, ty * TILE + 46, `pet:${sp}`).setOrigin(0.5, 1).setScale(1.05 / RES).setDepth(ty * TILE + 46);
        this.tweens.add({ targets: spr, scaleY: spr.scaleY * 1.05, duration: 700 + i * 90, yoyo: true, repeat: -1 });
        parts.push(spr);
      });
      const [mx, my] = b.tiles[Math.floor(b.tiles.length / 2)];
      const lead = b.group[0];
      const shownLevel = b.level + areaShift(this.profile, AREAS.find((a) => a.id === (b.keeper ? b.to : b.areaId)));   // a Challenge scales like the area it guards
      parts.push(...this.petLabel(lead, shownLevel, mx * TILE + 24, my * TILE - 38, { title: b.keeper ? `Challenge: ${SPECIES[lead].names[0]} +${b.group.length - 1}` : b.group.length > 1 ? `${SPECIES[lead].names[0]} +${b.group.length - 1}` : null }));
      // A Challenge shows ⚔ in gold when it will fight, and 💤 while it waits for more quests to be done.
      const mark = this.add.text(mx * TILE + 24, my * TILE - 62, '⚔', { fontFamily: 'system-ui', fontSize: b.keeper ? '30px' : '24px', color: '#fff', stroke: b.keeper ? '#b8860b' : '#b3261e', strokeThickness: 6 }).setOrigin(0.5).setDepth(9000);
      this.tweens.add({ targets: mark, y: mark.y - 5, duration: 600, yoyo: true, repeat: -1 });
      parts.push(mark);
      const e = { type: 'blocker', id: b.id, x: mx, y: my, tiles: b.tiles, data: b, areaId: b.areaId, solid: true, parts, mark };
      this.entities.push(e);
      this.refreshKeeper(e);
    }
  }

  /** A region's Mini Guardian (a smaller Guardian with one helper pet) standing across the road into area 3. */
  addMiniGuardian(b) {
    const [mx, my] = b.tiles[Math.floor(b.tiles.length / 2)];
    const [hx, hy] = b.tiles[Math.min(b.tiles.length - 1, Math.floor(b.tiles.length / 2) + 1)];
    const helper = this.add.image(hx * TILE + 24, hy * TILE + 46, `pet:${b.group[0]}`).setOrigin(0.5, 1).setScale(0.95 / RES).setDepth(hy * TILE + 46);
    const spr = this.add.image(mx * TILE + 24, my * TILE + 46, `guardian:${b.region}`).setOrigin(0.5, 1).setScale(0.62 / RES).setDepth(my * TILE + 47);
    this.tweens.add({ targets: spr, scaleY: spr.scaleY * 1.04, duration: 800, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: helper, scaleY: helper.scaleY * 1.05, duration: 700, yoyo: true, repeat: -1 });
    const level = b.level + 1 + areaShift(this.profile, AREAS.find((a) => a.id === b.to));   // scales like area 3, which it guards
    const label = this.add.text(mx * TILE + 24, my * TILE - 44, `🛡️ ${b.name}  Lv ${level}`, { fontFamily: 'system-ui', fontSize: '17px', fontStyle: 'bold', color: '#fff', stroke: '#3b2a63', strokeThickness: 5 }).setOrigin(0.5).setDepth(9000);
    const mark = this.add.text(mx * TILE + 24, my * TILE - 72, '🛡️', { fontFamily: 'system-ui', fontSize: '30px', color: '#fff', stroke: '#b8860b', strokeThickness: 6 }).setOrigin(0.5).setDepth(9000);
    this.tweens.add({ targets: mark, y: mark.y - 5, duration: 600, yoyo: true, repeat: -1 });
    const e = { type: 'blocker', id: b.id, x: mx, y: my, tiles: b.tiles, data: b, areaId: b.areaId, solid: true, parts: [helper, spr, label, mark], mark, sprite: spr };
    this.entities.push(e);
    this.refreshKeeper(e);
  }

  /** Roaming wild pets you can see on the map; walk into one (or tap it) to battle. */
  spawnWild(area, initial = false) {
    const rand = Math.random;
    // Only pets the kid has unlocked through their math tier in this region, mixed so no one kind crowds the area.
    const present = this.entities.filter((e) => e.type === 'wild' && e.areaId === area.id).map((e) => e.species);
    const species = pickWildSpecies(this.profile, area, present, rand);
    if (!species) return null;
    // Levels stay near the team's level (−2 … +1), plus a bit for stronger classes, within the area's range [TUNABLE].
    const team = teamPets(this.profile);
    const avg = team.length ? Math.round(team.reduce((a, p) => a + p.level, 0) / team.length) : 1;
    const [lo, hi] = areaPet(this.profile, area), shift = areaShift(this.profile, area);
    const level = Math.max(lo, Math.min(hi + 2, avg + Math.floor(rand() * 4) - 2 + (SPECIES[species].cls - 1)));
    const stage = wildStage(this.profile, species, level - shift, area.level, rand);   // stages as in a first strand
    for (let tries = 0; tries < 60; tries++) {
      const x = area.x0 + 1 + Math.floor(rand() * (area.x1 - area.x0 - 1));
      const y = area.y0 + 1 + Math.floor(rand() * (area.y1 - area.y0 - 1));
      if (areaAt(x, y) !== area || this.blocked(x, y) || this.world.roadTiles?.has(x + ',' + y)) continue;
      const g = this.world.ground[y][x];
      if (g === G.WATER || g === G.SAND && area.region !== 'stats') continue;
      const distP = Math.hypot(x - (this.tx ?? -99), y - (this.ty ?? -99));
      if (distP < (initial ? 5 : 9)) continue;
      if (this.entities.some((e) => e.type === 'wild' && Math.abs(e.x - x) + Math.abs(e.y - y) < 4)) continue;
      const spr = this.add.image(x * TILE + 24, y * TILE + 44, stage > 1 ? `pet:${species}:${stage}` : `pet:${species}`).setOrigin(0.5, 1).setScale((stage > 1 ? 0.95 : 0.85) / RES).setDepth(y * TILE + 44);
      if (area.region === 'stats' && species === 'datapup') spr.setFlipX(true);
      const e = { type: 'wild', id: 'w' + (this.wildId++), x, y, home: [x, y], species, level, stage, areaId: area.id, solid: true, parts: [spr], nextMove: this.time.now + 800 + Math.random() * 2500 };
      e.label = this.petLabel(species, level, spr.x, spr.y - 44, { stage });
      e.parts.push(...e.label);
      this.entities.push(e);
      if (!initial) { spr.setAlpha(0); this.tweens.add({ targets: spr, alpha: 1, duration: 600 }); }
      return e;
    }
    return null;
  }

  /** Notice zone: any adjacent tile (including diagonals), or up to 2 tiles away in a straight line with nothing in between. */
  inNoticeZone(e) {
    const dx = this.tx - e.x, dy = this.ty - e.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) <= 1) return true;
    if ((dx === 0 && Math.abs(dy) === 2) || (dy === 0 && Math.abs(dx) === 2)) return !this.world.solid[e.y + Math.sign(dy)][e.x + Math.sign(dx)];
    return false;
  }

  /** Name, level and "collected" badge floating above a pet on the map. Level is coloured by difficulty vs. your team. */
  petLabel(species, level, x, y, { title = null, stage = 1 } = {}) {
    const team = teamPets(this.profile);
    const avg = team.length ? team.reduce((sum, p) => sum + p.level, 0) / team.length : 1;
    const d = level - avg;
    const col = d >= 3 ? '#ff6b5b' : d >= 1 ? '#ffd23f' : '#7ee08a';
    const owned = this.profile.pets.filter((p) => p.species === species).length;
    const font = { fontFamily: 'system-ui, sans-serif', fontSize: '13px', fontStyle: '900', stroke: '#2b2140', strokeThickness: 4 };
    const nameT = this.add.text(0, y, (title || SPECIES[species].names[stage - 1]) + '  ', { ...font, color: '#ffffff' }).setOrigin(0, 1).setDepth(9400);
    const lvT = this.add.text(0, y, `Lv ${level}`, { ...font, color: col }).setOrigin(0, 1).setDepth(9400);
    const left = x - (nameT.width + lvT.width) / 2;
    nameT.setX(left); lvT.setX(left + nameT.width);
    const locked = stage > 1 && !canBefriendStage(this.profile, species, stage);
    const badge = this.add.text(x, y + 14, locked ? '🔒 evolved' : owned ? `✓ ×${owned}` : '★ NEW', { ...font, fontSize: '11px', strokeThickness: 3, color: owned ? '#bff5c8' : '#ffe066' }).setOrigin(0.5, 1).setDepth(9400);
    const parts = [nameT, lvT, badge];
    parts.forEach((p) => { p._dx = p.x - x; p._dy = p.y - y; });
    return parts;
  }

  moveLabel(e, x, y) { (e.label || []).forEach((p) => p.setPosition(x + p._dx, y + p._dy)); }

  removeEntity(e, { counted = true } = {}) {
    e.gone = true;
    e.parts.forEach((p) => this.tweens.add({ targets: p, alpha: 0, duration: 300, onComplete: () => p.destroy() }));
    this.entities = this.entities.filter((x) => x !== e);
    if (e.type === 'wild' && counted) { const st = this.wildState(e.areaId); st.gone++; persist(); }
    // A pet you ran away from just wanders off and turns up somewhere else in the area.
    if (e.type === 'wild' && !counted) this.time.delayedCall(20000, () => { const a = AREAS.find((x) => x.id === e.areaId); if (a) this.spawnWild(a); });
  }

  /** How many roaming pets an area holds right now (its full count minus pets beaten/befriended that haven't come back). */
  wildTarget(area) {
    const st = this.wildState(area.id);
    return Math.max(0, (WILD_MAX[area.level] || 5) - st.gone);
  }
  /** Per-area record of pets gone today; one comes back every (24 h ÷ full count), and all are back on a new day. */
  wildState(areaId) {
    const P = this.profile;
    const all = (P.wild ||= {});
    const now = Date.now(), today = new Date().toISOString().slice(0, 10);
    const st = (all[areaId] ||= { gone: 0, t: now, day: today });
    if (st.day !== today) { st.gone = 0; st.t = now; st.day = today; }
    const area = AREAS.find((a) => a.id === areaId);
    const every = DAY_MS / (WILD_MAX[area?.level] || 5);
    const back = Math.floor((now - st.t) / every);
    if (back > 0) { st.gone = Math.max(0, st.gone - back); st.t += back * every; }
    if (st.gone === 0) st.t = now;
    return st;
  }
  /** Every minute: bring back pets whose time has come. */
  topUpWild() {
    if (this.frozen) return;
    for (const a of AREAS.filter((x) => x.level > 0)) {
      const have = this.entities.filter((e) => e.type === 'wild' && e.areaId === a.id).length;
      for (let i = have; i < this.wildTarget(a); i++) this.spawnWild(a);
    }
  }

  wanderWild(now) {
    for (const e of this.entities) {
      if (e.type !== 'wild' || e.moving || now < e.nextMove) continue;
      e.nextMove = now + 1400 + Math.random() * 2600;
      if (Math.abs(e.x - this.tx) > 16 || Math.abs(e.y - this.ty) > 12) continue;   // only animate nearby pets
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => Math.random() - 0.5);
      for (const [dx, dy] of dirs) {
        const nx = e.x + dx, ny = e.y + dy;
        if (Math.abs(nx - e.home[0]) > 3 || Math.abs(ny - e.home[1]) > 3) continue;
        if (Math.max(Math.abs(nx - this.tx), Math.abs(ny - this.ty)) <= 1) continue;
        if (this.path.some(([px, py]) => px === nx && py === ny)) continue;
        e.solid = false;
        const bl = this.blocked(nx, ny) || this.world.ground[ny][nx] === G.WATER || areaAt(nx, ny)?.id !== e.areaId;
        e.solid = true;
        if (bl) continue;
        e.x = nx; e.y = ny; e.moving = true;
        const spr = e.parts[0];
        if (dx) spr.setFlipX(dx > 0);
        this.tweens.add({ targets: spr, x: nx * TILE + 24, y: ny * TILE + 44, duration: 420, ease: 'Sine.easeInOut',
          onUpdate: () => { spr.setDepth(spr.y); this.moveLabel(e, spr.x, spr.y - 44); }, onComplete: () => { e.moving = false; } });
        this.tweens.add({ targets: spr, scaleY: spr.scaleY * 0.9, duration: 105, yoyo: true, repeat: 1 });
        break;
      }
    }
  }

  addNpc(e) {
    const spr = this.add.image(e.x * TILE + 24, e.y * TILE + 46, e.tex).setOrigin(0.5, 1).setScale(1 / RES).setDepth(e.y * TILE + 46);
    const ent = { ...e, solid: true, parts: [spr] };
    this.entities.push(ent);
    return ent;
  }

  refreshGuardian(e) {
    const P = this.profile;
    const beaten = P.areas[e.areaId]?.guardian;
    const awake = !beaten && guardianAwake(P, e.areaId);
    e.parts[0].setVisible(!beaten);
    e.parts[0].setAlpha(awake ? 1 : 0.35);
    e.awake = awake; e.beaten = beaten;
    if (awake && !e.tween) e.tween = this.tweens.add({ targets: e.parts[0], scale: e.parts[0].scale * 1.04, duration: 800, yoyo: true, repeat: -1 });
  }

  refreshGate(e) {
    const open = gateOpen(this.profile, e.gate);
    e.open = open;
    e.sprite.setTexture(`gate:${open ? 'open' : 'closed'}:${e.theme}`);
  }

  /** Called by the app after battles/chests so markers update. */
  /** A mental math chest shows as ready (teal, ticking) or done for today (open, with its best score). */
  refreshMentalChest(e) {
    const st = this.profile.mental?.[e.id];
    const doneToday = st && st.day === new Date().toISOString().slice(0, 10);
    e.sprite.setTexture(doneToday ? 'mchest:done' : 'mchest:ready');
    e.label.setText(doneToday ? `✓ Best ${st.best} · back tomorrow` : `⏱ Mental Math${st?.best ? ` · best ${st.best}` : ''}`);
    e.label.setColor(doneToday ? '#d8dde6' : '#9ff4ff');
    e.watch.setVisible(!doneToday);
  }

  /** A strand's levels just changed (its anchor was set): respawn its roaming pets and redraw its blockers. */
  rescaleRegion(region) {
    const inRegion = (e) => AREAS.find((a) => a.id === e.areaId)?.region === region;
    for (const e of this.entities.filter((x) => (x.type === 'wild' || x.type === 'blocker') && inRegion(x))) {
      e.gone = true; e.parts.forEach((p) => p.destroy());
    }
    this.entities = this.entities.filter((x) => !x.gone);
    this.createBlockers(region);
    for (const a of AREAS.filter((x) => x.region === region)) { const n = this.wildTarget(a); for (let i = 0; i < n; i++) this.spawnWild(a, true); }
  }

  refreshKeeper(e) {
    if (!e.data.keeper) return;
    const awake = keeperAwake(this.profile, e.areaId);
    e.mark.setText(awake ? (e.data.mini ? '🛡️' : '⚔') : '💤');
    if (e.data.mini) e.sprite.setAlpha(awake ? 1 : 0.55);
  }

  refreshAll() {
    for (const e of this.entities) {
      if (e.type === 'blocker') this.refreshKeeper(e);
      if (e.type === 'mathchest') this.refreshMentalChest(e);
      if (e.type === 'trainer' && e.mark) e.mark.setText(this.profile.beaten[e.id] ? '' : '!');
      if (e.type === 'challenge' && this.profile.beaten[e.id]) { e.parts.forEach((p) => p.destroy()); e.gone = true; }
      if (e.type === 'chest' && this.profile.opened[e.id] && !e.opened) {
        e.opened = true; e.hidden = false; e.parts[0].setTexture('chest:open'); e.parts.slice(1).forEach((p) => p.destroy()); e.parts.length = 1;
      }
      if (e.type === 'guardian') this.refreshGuardian(e);
      if (e.type === 'gate') this.refreshGate(e);
    }
    this.entities = this.entities.filter((e) => !e.gone);
    // Challenge pets that just became available through math progress.
    const still = [];
    for (const { c, areaId } of this.lockedChallenges || []) {
      const region = AREAS.find((a) => a.id === areaId).region;
      if (!this.profile.beaten[c.id] && speciesUnlocked(this.profile, c.species, region, { challenge: true })) this.addChallenge(c, areaId);
      else still.push({ c, areaId });
    }
    this.lockedChallenges = still;
  }

  // ---------- player ----------
  createPlayer() {
    const pos = this.profile.pos;
    let x = pos?.x ?? START.x, y = pos?.y ?? START.y;
    if (this.blocked(x, y)) { x = START.x; y = START.y; }
    this.tx = x; this.ty = y;
    this.facing = pos?.facing || 'down';
    this.frame = 0;
    this.player = this.add.image(x * TILE + 24, y * TILE + 46, `wiz:${this.facing}:0`).setOrigin(0.5, 1).setScale(1 / RES);
    this.playerShadow = this.add.ellipse(x * TILE + 24, y * TILE + 44, 30, 10, 0x000000, 0.2);
    this.syncPlayerDepth();
  }

  syncPlayerDepth() {
    this.player.setDepth(this.player.y);
    this.playerShadow.setPosition(this.player.x, this.player.y - 2).setDepth(this.player.y - 1);
  }

  setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W * TILE, H * TILE);
    const base = Math.min(window.innerWidth, window.innerHeight) < 600 ? 0.85 : 1.1;
    cam.setZoom(RES * base);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setRoundPixels(false);
  }

  // ---------- fog of war ----------
  createFog() {
    this.fogBits = loadFog(this.profile);
    // The Academy (home base) is always known.
    const hub = AREAS.find((a) => a.id === 'hub');
    for (let y = hub.y0; y <= hub.y1; y++) for (let x = hub.x0; x <= hub.x1; x++) fogSet(this.fogBits, x, y);
    const tex = this.textures.createCanvas('fog', W * 2, H * 2);
    this.fogTex = tex;
    const ctx = tex.getContext();
    ctx.fillStyle = 'rgba(18, 10, 36, 1)';
    ctx.fillRect(0, 0, W * 2, H * 2);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fogGet(this.fogBits, x, y)) ctx.clearRect(x * 2, y * 2, 2, 2);
    tex.refresh();
    this.fogImg = this.add.image(0, 0, 'fog').setOrigin(0, 0).setScale(TILE / 2).setDepth(10000);
    this.fogImg.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }

  revealAround(force = false) {
    let changed = false;
    const ctx = this.fogTex.getContext();
    for (let dy = -REVEAL; dy <= REVEAL; dy++) for (let dx = -REVEAL; dx <= REVEAL; dx++) {
      const x = this.tx + dx, y = this.ty + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const d = Math.hypot(dx, dy);
      if (d > REVEAL + 0.3 || fogGet(this.fogBits, x, y)) continue;
      fogSet(this.fogBits, x, y);
      ctx.clearRect(x * 2, y * 2, 2, 2);
      changed = true;
    }
    if (changed || force) {
      this.fogTex.refresh();
      saveFog(this.profile, this.fogBits);
    }
    this.refreshHidden();
  }

  /** Hidden challenge pets and chests appear only when the wizard gets close (or were discovered before). */
  refreshHidden(initial = false) {
    const P = this.profile;
    P.discovered ||= {};
    for (const e of this.entities) {
      if (!e.hidden) continue;
      const near = Math.hypot(e.x - this.tx, e.y - this.ty) <= SPOT;
      if (near && !P.discovered[e.id] && !initial) {
        P.discovered[e.id] = true;
        persist();
        this.hooks.onDiscover?.(e);
        const star = this.add.text(e.x * TILE + 24, e.y * TILE, '✦', { fontSize: '44px', color: '#ffe066', stroke: '#fff', strokeThickness: 3 }).setOrigin(0.5).setDepth(9500);
        this.tweens.add({ targets: star, y: star.y - 40, alpha: 0, scale: 2, duration: 900, onComplete: () => star.destroy() });
      }
      const visible = !!P.discovered[e.id] || near;
      e.parts.forEach((p) => p.setVisible(visible));
    }
  }

  // ---------- movement ----------
  footprint(e) {
    if (e.tiles) return e.tiles;
    if (e.type === 'gate') return gateTiles(e.gate);
    const w = e.w || 1, h = e.h || 1, out = [];
    for (let yy = e.y; yy < e.y + h; yy++) for (let xx = e.x; xx < e.x + w; xx++) out.push([xx, yy]);
    return out;
  }

  blocked(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return true;
    if (this.world.solid[y][x]) return true;
    for (const e of this.entities) {
      if (e.gone) continue;
      if (e.type === 'gate') { if (!e.open && gateTiles(e.gate).some(([gx, gy]) => gx === x && gy === y)) return true; continue; }
      if (!e.solid) continue;
      if (this.footprint(e).some(([fx, fy]) => fx === x && fy === y)) return true;
    }
    return false;
  }

  entityAt(x, y) {
    return this.entities.find((e) => {
      if (e.gone) return false;
      if (e.type === 'gate') return gateTiles(e.gate).some(([gx, gy]) => gx === x && gy === y) || (x >= e.gate.x - 1 && x <= e.gate.x + 2 && y >= e.gate.y - 1 && y <= e.gate.y + 1 && !e.open);
      if (e.hidden && !this.profile.discovered?.[e.id]) return false;
      return this.footprint(e).some(([fx, fy]) => fx === x && fy === y);
    });
  }

  setupInput() {
    this.input.on('pointerup', (ptr) => {
      if (this.frozen) return;
      if (ptr.getDistance && ptr.getDistance() > 20) return;   // ignore drags
      const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      const tx = Math.floor(wp.x / TILE), ty = Math.floor(wp.y / TILE);
      this.tapTile(tx, ty);
    });
    this.cursors = this.input.keyboard?.createCursorKeys();
  }

  tapTile(tx, ty) {
    const ent = this.entityAt(tx, ty);
    if (ent && ent.type !== 'portal') {
      // Walk next to it, then interact.
      const targets = [];
      for (const [fx, fy] of this.footprint(ent)) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) if (!this.blocked(fx + dx, fy + dy)) targets.push([fx + dx, fy + dy]);
      if (targets.some(([x, y]) => x === this.tx && y === this.ty) && this.adjacent(ent)) { this.interact(ent); return; }
      const path = this.findPath(this.tx, this.ty, targets);
      if (path) { this.path = path; this.pendingInteract = ent; this.stepNext(); }
      return;
    }
    if (this.blocked(tx, ty)) return;
    const path = this.findPath(this.tx, this.ty, [[tx, ty]]);
    if (path) { this.path = path; this.pendingInteract = ent && ent.type === 'portal' ? ent : null; this.showTapMarker(tx, ty); this.stepNext(); }
  }

  adjacent(ent) {
    return this.footprint(ent).some(([fx, fy]) => Math.abs(fx - this.tx) <= 1 && Math.abs(fy - this.ty) <= 1);
  }

  showTapMarker(x, y) {
    const m = this.add.circle(x * TILE + 24, y * TILE + 24, 14, 0xffffff, 0.6).setDepth(9999);
    this.tweens.add({ targets: m, scale: 1.8, alpha: 0, duration: 400, onComplete: () => m.destroy() });
  }

  findPath(sx, sy, targets) {
    if (!targets.length) return null;
    const key = (x, y) => y * W + x;
    const goal = new Set(targets.map(([x, y]) => key(x, y)));
    if (goal.has(key(sx, sy))) return [];
    const q = [[sx, sy]]; const prev = new Map([[key(sx, sy), null]]);
    let found = null, n = 0;
    while (q.length && n < 6000) {
      const [x, y] = q.shift(); n++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (prev.has(k) || this.blocked(nx, ny)) continue;
        prev.set(k, key(x, y));
        if (goal.has(k)) { found = k; q.length = 0; break; }
        q.push([nx, ny]);
      }
    }
    if (found == null) return null;
    const path = [];
    for (let k = found; k !== key(sx, sy); k = prev.get(k)) path.unshift([k % W, Math.floor(k / W)]);
    return path;
  }

  stepNext() {
    if (this.moving || this.frozen) return;
    const next = this.path.shift();
    if (!next) {
      if (this.pendingInteract) { const e = this.pendingInteract; this.pendingInteract = null; if (this.adjacent(e) || e.type === 'portal') this.interact(e); }
      return;
    }
    const [nx, ny] = next;
    if (this.blocked(nx, ny)) {
      this.path = [];
      const bump = this.entityAt(nx, ny);
      if (bump && (bump.type === 'wild' || bump.type === 'blocker')) this.interact(bump);
      return;
    }
    this.facing = nx > this.tx ? 'right' : nx < this.tx ? 'left' : ny > this.ty ? 'down' : 'up';
    this.moving = true;
    this.tx = nx; this.ty = ny;
    this.frame = (this.frame + 1) % 4;
    this.player.setTexture(`wiz:${this.facing}:${this.frame}`);
    this.tweens.add({
      targets: this.player, x: nx * TILE + 24, y: ny * TILE + 46, duration: STEP_MS,
      onUpdate: () => this.syncPlayerDepth(),
      onComplete: () => {
        this.frame = (this.frame + 1) % 4;
        this.player.setTexture(`wiz:${this.facing}:${this.frame}`);
        this.moving = false;
        this.arrive();
      },
    });
  }

  arrive() {
    this.profile.pos = { x: this.tx, y: this.ty, facing: this.facing };
    this.revealAround();
    this.checkArea();
    this.hooks.onStep?.();
    // Standing on a portal: open it straight away (no first-time tips for nearby things on top of its travel menu).
    const portal = this.entities.find((e) => e.type === 'portal' && this.tx >= e.x && this.tx < e.x + 2 && this.ty >= e.y && this.ty < e.y + 2);
    if (portal && this.path.length === 0) { this.pendingInteract = null; this.interact(portal); return; }
    // Tell the app about things coming into view (for first-time tutorial tips).
    if (this.hooks.onNear) {
      const g0 = this.world.ground[this.ty][this.tx];
      if (g0 === G.TALL) this.hooks.onNear('tallgrass');
      for (const e of this.entities) {
        if (e.gone || (e.hidden && !this.profile.discovered?.[e.id])) continue;
        const ex = e.type === 'gate' ? e.gate.x : e.x, ey = e.type === 'gate' ? e.gate.y : e.y;
        const d = Math.hypot(ex - this.tx, ey - this.ty);
        if (d <= 4.5 && ['wild', 'blocker', 'trainer', 'portal', 'gate', 'guardian'].includes(e.type)) {
          if (e.type === 'gate' && e.open) continue;
          if (e.type === 'portal' && e.area === 'hub') continue;
          this.hooks.onNear(e.type, e);
        }
      }
    }
    // Roaming pets notice you if you come close (a buffer zone bigger than the pet itself).
    const spotter = this.time.now > (this.graceUntil || 0) && this.entities.find((e) => e.type === 'wild' && !e.moving && this.inNoticeZone(e));
    if (spotter) {
      this.path = []; this.pendingInteract = null; this.stepsSinceBattle = 0;
      const spr = spotter.parts[0];
      const bang = this.add.text(spr.x, spr.y - 64, '!', { fontFamily: 'system-ui', fontSize: '34px', fontStyle: '900', color: '#ffd23f', stroke: '#2b2140', strokeThickness: 7 }).setOrigin(0.5).setDepth(9600);
      this.tweens.add({ targets: bang, y: bang.y - 10, duration: 180, yoyo: true });
      this.frozen = true;
      this.time.delayedCall(550, () => { bang.destroy(); this.frozen = false; this.interact(spotter); });
      return;
    }
    // Wild encounters in tall grass.
    this.stepsSinceBattle++;
    const g = this.world.ground[this.ty][this.tx];
    if (g === G.TALL && this.currentArea && this.currentArea.level > 0 && this.stepsSinceBattle >= 5 && Math.random() < 0.1) {
      this.path = []; this.pendingInteract = null;
      this.stepsSinceBattle = 0;
      this.flashEncounter(() => this.hooks.onEncounter?.(this.currentArea));
      return;
    }
    this.stepNext();
  }

  flashEncounter(cb) {
    this.frozen = true;
    const cam = this.cameras.main;
    cam.flash(250, 255, 255, 255);
    this.time.delayedCall(260, () => cam.flash(250, 255, 255, 255));
    this.time.delayedCall(560, cb);
  }

  checkArea(initial = false) {
    const a = areaAt(this.tx, this.ty);
    if (a && a !== this.currentArea) {
      this.currentArea = a;
      this.hooks.onAreaChange?.(a, initial);
    }
  }

  interact(e) {
    this.path = [];
    if (e.type === 'npc' || e.type === 'trainer' || e.type === 'wild' || e.type === 'blocker') {
      const spr = e.parts[0];
      const dx = this.tx - e.x, dy = this.ty - e.y;
      this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'left' : 'right') : (dy > 0 ? 'up' : 'down');
      this.player.setTexture(`wiz:${this.facing}:0`);
      if (spr) this.tweens.add({ targets: spr, y: spr.y - 6, duration: 120, yoyo: true });
    }
    this.hooks.onInteract?.(e);
  }

  freeze(v) { this.frozen = v; if (!v) { this.graceUntil = this.time.now + 2500; this.stepNext(); } }

  teleport(x, y) {
    this.tx = x; this.ty = y; this.path = []; this.pendingInteract = null;
    this.player.setPosition(x * TILE + 24, y * TILE + 46);
    this.syncPlayerDepth();
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.profile.pos = { x, y, facing: 'down' };
    this.revealAround(true);
    this.checkArea();
  }

  update(time, delta) {
    updateScenery(this, time, delta);
    if (!this.frozen && this.entities) this.wanderWild(time);
    if (this.frozen || this.moving || !this.cursors) return;
    const c = this.cursors;
    let dx = 0, dy = 0;
    if (c.left.isDown) dx = -1; else if (c.right.isDown) dx = 1; else if (c.up.isDown) dy = -1; else if (c.down.isDown) dy = 1;
    if (dx || dy) {
      const nx = this.tx + dx, ny = this.ty + dy;
      const ent = this.entityAt(nx, ny);
      if (ent && ent.type !== 'portal' && Phaser.Input.Keyboard.JustDown(c.space)) { this.interact(ent); return; }
      if (!this.blocked(nx, ny)) { this.path = [[nx, ny]]; this.stepNext(); }
      else { this.facing = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up'; this.player.setTexture(`wiz:${this.facing}:0`); if (ent) this.interact(ent); }
    }
  }

  /** A small overview map image for the Map menu (explored tiles only). */
  /** Places and waypoints for the world map (tile coords). Only things the kid has already uncovered are listed. */
  minimapMarkers() {
    const P = this.profile, seen = (x, y) => fogGet(this.fogBits, Math.round(x), Math.round(y));
    const today = new Date().toISOString().slice(0, 10);
    const out = [];
    const add = (kind, x, y, label, extra = {}) => { if (seen(x, y)) out.push({ kind, x, y, label, ...extra }); };
    for (const e of this.entities) {
      if (e.type === 'portal') add('portal', e.x + 1, e.y + 1, e.area === 'hub' ? 'Academy Town portal' : 'Portal', { area: e.area });
      else if (e.type === 'gate') add(gateOpen(P, e.gate) ? 'gate-open' : 'gate', e.gate.x + (e.gate.orient === 'h' ? 1 : 0.5), e.gate.y + (e.gate.orient === 'h' ? 0 : 0.5), 'Gate');
      else if (e.type === 'guardian') add(P.areas[e.areaId]?.guardian ? 'guardian-done' : 'guardian', e.x + 1, e.y + 1, e.data.name);
      else if (e.type === 'mathchest') { const st = P.mental?.[e.id]; if (!(st && st.day === today)) add('mental', e.x + 0.5, e.y + 0.5, 'Mental math chest'); }
      else if (e.type === 'trainer' && !P.beaten[e.id]) add('trainer', e.x + 0.5, e.y + 0.5, e.data.name);
      else if (e.type === 'blocker' && e.data.mini) add(keeperAwake(P, e.areaId) ? 'mini' : 'mini-sleep', e.x + 0.5, e.y + 0.5, e.data.name);
      else if (e.type === 'blocker' && e.data.keeper) add(keeperAwake(P, e.areaId) ? 'keeper' : 'keeper-sleep', e.x + 0.5, e.y + 0.5, 'Challenge');
      else if (e.type === 'npc' && e.data.talk === 'healer') add('healer', e.x + 0.5, e.y - 1.5, 'Healer');
      else if (e.type === 'npc' && e.data.talk === 'shop') add('shop', e.x + 0.5, e.y - 1.5, 'Shop');
    }
    return out;
  }

  minimapCanvas() {
    const c = document.createElement('canvas');
    c.width = W * 4; c.height = H * 4;
    const ctx = c.getContext('2d');
    const col = { [G.GRASS]: '#7ccf6a', [G.GRASS2]: '#72c462', [G.TALL]: '#3f9a4a', [G.PATH]: '#e8d29a', [G.WATER]: '#4aa8e0', [G.SAND]: '#f0dca0', [G.FLOOR]: '#cfc6e6', [G.CLIFF]: '#6b5a4a', [G.FLOWERS]: '#f39ac2', [G.BRIDGE_H]: '#b07a4a', [G.BRIDGE_V]: '#b07a4a' };
    const tint = { number: '#b9a2ff', patterns: '#7fd07a', shape: '#f0b27a', stats: '#7fd8d0', academy: '#c8b8f0' };
    ctx.fillStyle = '#120a24'; ctx.fillRect(0, 0, c.width, c.height);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!fogGet(this.fogBits, x, y)) continue;
      const g = this.world.ground[y][x];
      ctx.fillStyle = (g === G.GRASS || g === G.GRASS2) ? tint[this.world.theme[y][x]] : col[g] || '#888';
      ctx.fillRect(x * 4, y * 4, 4, 4);
    }
    return c;
  }
}

function safe(fn) {
  try { return fn() || '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>'; }
  catch (e) { console.warn('art error', e); return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#f0f"/></svg>'; }
}

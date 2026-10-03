// Save data, organised by FAMILY. Each family has its own wizards and a 4-digit PIN.
// This device always keeps a copy (localStorage) so the game works offline; when online storage is available
// (see cloud.js) each wizard is also saved there a few seconds after changes, so a family can play from any device.
// Everything else in the game keeps using load() / persist() / profiles(): they act on the family that is open.

import { uid } from './rng.js';
import { cloudDb, cloudStatus, cloudListFamilies, cloudGetFamily, cloudSaveFamily, cloudDeleteFamily, cloudLoadKids, cloudSaveKid, cloudDeleteKid } from './cloud.js';
import { W, H, areaById } from '../content/world.js';

const KEY = 'mwa-families-v1';
const LEGACY_KEY = 'mwa-save-v1';        // saves from before families existed
const VERSION = 2;
const MAX_CLOUD_BYTES = 240 * 1024;      // online documents are capped at 256 KiB

let store = null;       // { version, deviceId, families: { [fid]: { meta, profiles } } }
let current = null;     // the open family's entry
let offlineBase = new Map();   // wizards as they were when the family opened without its online saves
const EMPTY = { profiles: [] };

export const DEFAULT_KID_SETTINGS = {
  sessionMinutes: 15,          // 0 = off
  sessionMode: 'gentle',       // 'gentle' | 'rest'
  restMinutes: 30,
  curriculum: 'mix',           // 'mix' | 'new' | 'classic'
  mentalTime: 20,              // mental math chest timer in seconds (0 = chests off)
  focusSkills: [],             // skill ids the parent wants emphasized
  autoRead: null,              // null = default by grade (auto for grades 1–2)
  sound: true,
  tips: true,
};

// ---------- the device copy ----------
function readStore() {
  if (store) return store;
  try { store = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { store = null; }
  if (!store || typeof store !== 'object') store = { version: VERSION, deviceId: uid(), families: {} };
  store.families ||= {};
  store.deviceId ||= uid();
  for (const f of Object.values(store.families)) (f.profiles ||= []).forEach(migrateProfile);
  return store;
}
function writeStore() {
  try { localStorage.setItem(KEY, JSON.stringify(readStore())); } catch (e) { console.error('Could not save on this device', e); }
}
export const deviceId = () => readStore().deviceId;

/** Wizards saved on this device before families existed (moved into the first family made here). */
export function legacyProfiles() {
  try { const d = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null'); return Array.isArray(d?.profiles) ? d.profiles : []; } catch (e) { return []; }
}

// ---------- the open family (what the rest of the game uses) ----------
/** The open family's data ({ profiles }). Empty until a family is opened. */
export function load() { readStore(); return current || EMPTY; }
export const profiles = () => load().profiles;
export const getProfile = (id) => load().profiles.find((p) => p.id === id);
export const currentFamily = () => current?.meta || null;
/** True while the open family's online saves couldn't be read (playing from this device's copy). */
export const onlinePending = () => !!current?.needsMerge;

/** Save now on this device, and online a few seconds later. */
export function persist() {
  if (!current) return;
  writeStore();
  scheduleSync();
}

// Ask the browser to protect our storage from automatic clean-up (supported on iPadOS 17+).
export async function requestPersistence() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) { /* ignore */ }
  return false;
}

// ---------- online sync ----------
let syncTimer = null;
const lastSynced = new Map();     // profile id -> JSON last written online
function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { flushCloud(); }, 5000);
}
/** Write any wizards that changed since the last online save (call before leaving). */
export async function flushCloud() {
  clearTimeout(syncTimer);
  if (!current) return;
  const fam = current;
  if (fam.needsMerge) {
    const kids = await cloudLoadKids(fam.meta.id);
    if (!Array.isArray(kids)) { writeStore(); return; }   // still can't read online saves: keep this device's copy only
    // Wizards played on this device since it opened keep this device's progress; the rest take the online copy if newer.
    mergeKids(fam, kids.filter((k) => { const p = fam.profiles.find((x) => x.id === k?.profile?.id); return !p || offlineBase.get(p.id) === JSON.stringify(p); }));
    fam.needsMerge = false;
  }
  for (const p of fam.profiles) {
    const json = JSON.stringify(p);
    if (lastSynced.get(p.id) === json) continue;
    if (json.length > MAX_CLOUD_BYTES) { console.warn('[save] wizard too big to save online; kept on this device', p.id, json.length); continue; }
    p._saved = Date.now();
    const ok = await cloudSaveKid(fam.meta.id, p);
    if (ok) lastSynced.set(p.id, JSON.stringify(p));
  }
  writeStore();
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushCloud(); });
  window.addEventListener('pagehide', () => { flushCloud(); });
}

// ---------- families ----------
/** Families known on this device (instant). */
export const families = () => Object.values(readStore().families).map((f) => f.meta).sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));

/** Pull the family list from online storage and merge it in. Resolves the merged list. */
export async function refreshFamilies() {
  const list = await cloudListFamilies();
  if (Array.isArray(list)) {
    const s = readStore();
    for (const meta of list) {
      if (!meta?.id) continue;
      const local = s.families[meta.id];
      if (!local) s.families[meta.id] = { meta, profiles: [] };
      else if ((meta.updated || 0) > (local.meta.updated || 0)) local.meta = { ...meta, lastOpened: local.meta.lastOpened };
    }
    writeStore();
  }
  return families();
}

async function hashPin(salt, pin) {
  const text = `${salt}:${pin}`;
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    let h = 5381; for (const c of text) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;   // fallback where crypto.subtle is missing
    return 'x' + h.toString(16);
  }
}

export async function createFamily({ name, crest, pin, bringLegacy = false }) {
  const s = readStore();
  const salt = uid();
  const meta = { id: 'f' + uid(), name: String(name || 'Our Family').trim().slice(0, 24), crest: crest || 'numberling', salt, pinHash: await hashPin(salt, pin), created: Date.now(), updated: Date.now(), lastOpened: Date.now(), kids: [] };
  const entry = { meta, profiles: [] };
  if (bringLegacy) {
    entry.profiles = legacyProfiles();
    entry.profiles.forEach(migrateProfile);
    meta.kids = entry.profiles.map((p) => p.id);
    try { localStorage.setItem(LEGACY_KEY + '-moved', localStorage.getItem(LEGACY_KEY) || ''); localStorage.removeItem(LEGACY_KEY); } catch (e) { /* ignore */ }
  }
  s.families[meta.id] = entry;
  writeStore();
  await cloudSaveFamily(stripLocal(meta));
  current = entry;
  if (entry.profiles.length) await flushCloud();
  return meta;
}

export async function checkPin(fid, pin) {
  const f = readStore().families[fid];
  if (!f) return false;
  return (await hashPin(f.meta.salt, pin)) === f.meta.pinHash;
}

export async function setPin(fid, pin) {
  const f = readStore().families[fid];
  if (!f) return;
  f.meta.salt = uid();
  f.meta.pinHash = await hashPin(f.meta.salt, pin);
  f.meta.updated = Date.now();
  writeStore();
  await cloudSaveFamily(stripLocal(f.meta));
}

export async function renameFamily(fid, name, crest) {
  const f = readStore().families[fid];
  if (!f) return;
  if (name) f.meta.name = String(name).trim().slice(0, 24);
  if (crest) f.meta.crest = crest;
  f.meta.updated = Date.now();
  writeStore();
  await cloudSaveFamily(stripLocal(f.meta));
}

const stripLocal = (meta) => { const { lastOpened, ...rest } = meta; return rest; };

/** Open a family (after its PIN): loads its wizards from online storage when newer than this device's copy. */
/** Use the online copy of each wizard where it is newer than this device's copy. */
function mergeKids(f, kids) {
  for (const k of kids) {
    const p = k?.profile;
    if (!p?.id) continue;
    const i = f.profiles.findIndex((x) => x.id === p.id);
    const localSaved = i < 0 ? -1 : (f.profiles[i]._saved || 0);
    if ((p._saved || 0) >= localSaved) {
      migrateProfile(p);
      if (i < 0) f.profiles.push(p); else f.profiles[i] = p;
      lastSynced.set(p.id, JSON.stringify(p));
    }
    // Otherwise this device's copy is newer; flushCloud uploads it.
  }
}

export async function openFamily(fid) {
  const s = readStore();
  const f = s.families[fid];
  if (!f) return null;
  const online = await cloudGetFamily(fid);
  if (online && (online.updated || 0) > (f.meta.updated || 0)) f.meta = { ...online, lastOpened: f.meta.lastOpened };
  const kids = await cloudLoadKids(fid);
  // Couldn't read the online saves: play from this device's copy, and don't upload over the online copy until it
  // has been read (flushCloud tries again).
  // (Only when online storage exists but didn't answer; with no online storage at all, this device's copy is the save.)
  f.needsMerge = !Array.isArray(kids) && cloudStatus() === 'online';
  if (f.needsMerge) { console.warn('[save] online saves not reachable; using this device’s copy'); offlineBase = new Map(f.profiles.map((p) => [p.id, JSON.stringify(p)])); }
  else if (Array.isArray(kids)) mergeKids(f, kids);
  // Wizards deleted on another device disappear here too (a wizard made on this device since then is kept).
  if (online && Array.isArray(online.kids)) f.profiles = f.profiles.filter((p) => online.kids.includes(p.id) || (p._saved || p.created || 0) > (online.updated || 0));
  f.meta.lastOpened = Date.now();
  current = f;
  writeStore();
  flushCloud();   // push anything only this device had
  return f.meta;
}

export function closeFamily() { flushCloud(); current = null; lastSynced.clear(); }

export async function deleteFamily(fid) {
  const s = readStore();
  const f = s.families[fid];
  if (!f) return;
  for (const p of f.profiles) await cloudDeleteKid(fid, p.id);
  await cloudDeleteFamily(fid);
  delete s.families[fid];
  if (current?.meta.id === fid) current = null;
  writeStore();
}

// ---------- wizards in the open family ----------
export function createProfile({ name, grade, look, starter }) {
  const p = {
    id: uid(),
    name: name.trim().slice(0, 16) || 'Wizard',
    grade,
    look,
    created: Date.now(),
    lastPlayed: Date.now(),
    wizard: { level: 1, xp: 0 },
    coins: 20,
    portals: {},         // area ids whose portal the wizard has found (fast travel from the World Map)
    pets: [],            // { id, species, stage, level, xp, hp, rare, charm, caughtIn, nickname }
    team: [],            // pet ids, max 3
    items: [],           // item objects (see content/items.js)
    equipped: { wand: null, hat: null, robe: null, boots: null, amulet: null },
    skills: {},          // skillId -> ladder state (see core/adaptive.js)
    areas: {},           // areaId -> { obj: {objId: count}, baseline: {skillId: tier}, guardian: bool, visited: bool }
    opened: {},          // chestId -> true
    beaten: {},          // trainerId / challengeId -> true
    legendary: [],       // legendary item ids found
    seen: {},            // species -> true (pet book)
    pos: { x: null, y: null, facing: 'down' },
    lastHeal: null,
    pity: 0,
    stats: { answered: 0, correct: 0, battlesWon: 0, playMs: 0 },
    settings: { ...DEFAULT_KID_SETTINGS },
    tips: {},
    restUntil: 0,
    starter,
    mapVersion: MAP_VERSION,
  };
  if (!current) throw new Error('Open a family first.');
  current.profiles.push(p);
  current.meta.kids = current.profiles.map((x) => x.id);
  current.meta.updated = Date.now();
  cloudSaveFamily(stripLocal(current.meta));
  persist();
  return p;
}

export function deleteProfile(id) {
  if (!current) return;
  current.profiles = current.profiles.filter((p) => p.id !== id);
  current.meta.kids = current.profiles.map((x) => x.id);
  current.meta.updated = Date.now();
  lastSynced.delete(id);
  cloudDeleteKid(current.meta.id, id);
  cloudSaveFamily(stripLocal(current.meta));
  persist();
}

// v24 map (4 subzones per region): map progress resets (explored fog, chests, trainers, quests, position), but pets,
// items, coins and math progress stay, and regions a wizard had already opened stay open: a beaten Guardian opens
// subzones 1–3 (with their Challenges beaten), and having reached the old Level 2 area opens subzone 4.
const MAP_VERSION = 4;
function resetMapForV2(p) {
  const old = p.areas || {};
  const fresh = (extra = {}) => ({ obj: {}, baseline: null, guardian: false, visited: true, ...extra });
  const areas = {}, beaten = {};
  if (old.hub) areas.hub = old.hub;
  for (const r of ['number', 'patterns', 'shape', 'stats']) {
    const l1 = old[`${r}-1`] || {}, l2 = old[`${r}-2`] || {};
    if (l1.visited) areas[`${r}-1`] = fresh();
    if (l1.guardian || l2.visited) {
      areas[`${r}-1`] = fresh(); areas[`${r}-2`] = fresh(); areas[`${r}-3`] = fresh({ guardian: true });
      beaten[`gk-${r}-2`] = true; beaten[`gk-${r}-3`] = true;
    }
    if (l2.visited) areas[`${r}-4`] = fresh();
  }
  Object.assign(p, { areas, beaten, opened: {}, discovered: {}, fog: null, pos: null, wild: {}, mental: {}, mapVersion: 2 });
}
// v31: the Guardian moved from area 3 to the far end of area 4 (the region's final boss), with a Challenge between
// areas 3 and 4. A wizard who beat an area 3 Guardian keeps area 4 open: that counts as beating the new Challenge.
function moveGuardiansV3(p) {
  for (const r of ['number', 'patterns', 'shape', 'stats']) {
    const a3 = p.areas?.[`${r}-3`];
    if (a3?.guardian) { (p.beaten ||= {})[`gk-${r}-4`] = true; a3.guardian = false; }
  }
  p.mapVersion = 3;
}

// v39: bigger deeper subzones (a new, larger world map). Progress, quests, pets and items stay; the explored map is
// redrawn with every subzone the wizard has visited revealed, and the next session starts in town. Side-path wild
// blockers moved, so their "beaten" marks are cleared (Challenges, trainers, chests and Guardians keep their ids).
function biggerMapV4(p) {
  p.fog = revealAreas(Object.entries(p.areas || {}).filter(([, s]) => s?.visited).map(([id]) => id));
  p.pos = null;
  for (const k of Object.keys(p.beaten || {})) if (k.startsWith('b-')) delete p.beaten[k];
  p.mapVersion = 4;
}
function revealAreas(ids) {
  const bits = new Uint8Array(Math.ceil((W * H) / 8));
  for (const id of ids) {
    const a = areaById(id); if (!a) continue;
    for (let y = Math.max(0, a.y0 - 1); y <= Math.min(H - 1, a.y1 + 1); y++) for (let x = Math.max(0, a.x0 - 1); x <= Math.min(W - 1, a.x1 + 1); x++) { const i = y * W + x; bits[i >> 3] |= 1 << (i & 7); }
  }
  let bin = ''; for (const b of bits) bin += String.fromCharCode(b);
  return btoa(bin);
}

function migrateProfile(p) {
  if ((p.mapVersion || 1) < 2) resetMapForV2(p);
  if (p.mapVersion < 3) moveGuardiansV3(p);
  if (p.mapVersion < 4) biggerMapV4(p);
  p.settings = { ...DEFAULT_KID_SETTINGS, ...(p.settings || {}) };
  p.stats = { answered: 0, correct: 0, battlesWon: 0, playMs: 0, ...(p.stats || {}) };
  // v60: portals must be found before the map can travel to them. Areas 2 and 4 had portals before, so a wizard who
  // already visited one keeps it; the new area 1 and 3 portals are found by walking up to them.
  if (!p.portals) { p.portals = {}; for (const [id, s] of Object.entries(p.areas || {})) if (s?.visited && /-(2|4)$/.test(id)) p.portals[id] = true; }
  p.opened ||= {}; p.beaten ||= {}; p.areas ||= {}; p.skills ||= {}; p.seen ||= {}; p.legendary ||= [];
  p.equipped ||= { wand: null, hat: null, robe: null, boots: null, amulet: null };
  if (p.pity == null) p.pity = 0;
  (p.pets || []).forEach((pt) => { if (!pt.rank) pt.rank = 1; });
  if (Array.isArray(p.team) && p.team.length > 3) p.team = p.team.slice(0, 3);   // teams are up to 3 pets
}

// ---- Backup codes: the open family's wizards as a text code the parent can copy somewhere safe. ----
export function exportBackup() {
  const json = JSON.stringify({ version: VERSION, family: current?.meta?.name, profiles: profiles() });
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return 'MWA1:' + btoa(bin);
}

/** Reads a backup code (or the text of a backup file) without changing anything. Throws a friendly error. */
export function parseBackup(code) {
  const trimmed = String(code || '').trim();
  const at = trimmed.indexOf('MWA1:');   // a backup file may have a short header line before the code
  if (at < 0) throw new Error('That does not look like a Math Wizard backup.');
  let parsed;
  try {
    const bin = atob(trimmed.slice(at + 5).split(/\s/)[0]);
    parsed = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch (e) { throw new Error('This backup is damaged and can’t be read.'); }
  if (!parsed || !Array.isArray(parsed.profiles)) throw new Error('This backup is damaged and can’t be read.');
  return parsed;
}

/** A backup file's text: a one-line header for people, then the code. */
export function backupFileText() {
  const fam = current?.meta?.name || 'family';
  return `Math Wizard Academy backup - ${fam} - ${new Date().toLocaleString()}\n${exportBackup()}\n`;
}

/** A number that goes up with any play: questions answered, minutes played and wizards made, across the family. */
export function progressMark() {
  return (current?.profiles || []).reduce((n, p) => n + 1 + (p.stats?.answered || 0) + Math.floor((p.stats?.playMs || 0) / 60000), 0);
}

/** Remember that this family's progress is backed up as of now (and, if known, which file it went to). */
export function markBackedUp(where = null) {
  if (!current) return;
  current.meta.lastBackup = Date.now();
  current.meta.backupMark = progressMark();
  if (where) current.meta.backupFile = where;
  writeStore();
}

/** True when there has been any play since the last backup (or there is progress and no backup yet). */
export function backupDue() {
  if (!current || !current.profiles.length) return false;
  const mark = progressMark();
  if (current.meta.backupMark == null) return current.profiles.some((p) => (p.stats?.answered || 0) > 0);
  return mark !== current.meta.backupMark;
}

/** Restores wizards from a backup code into the open family (replacing wizards with the same id). */
export function importBackup(code) {
  if (!current) throw new Error('Open a family first.');
  const parsed = parseBackup(code);
  for (const p of parsed.profiles) {
    migrateProfile(p);
    const i = current.profiles.findIndex((x) => x.id === p.id);
    if (i >= 0) current.profiles[i] = p; else current.profiles.push(p);
  }
  current.meta.kids = current.profiles.map((x) => x.id);
  current.meta.updated = Date.now();
  cloudSaveFamily(stripLocal(current.meta));
  lastSynced.clear();
  persist();
  return parsed.profiles.length;
}

/** Start checking online storage early (the welcome screen shows the result). */
export function warmCloud() { cloudDb(); }

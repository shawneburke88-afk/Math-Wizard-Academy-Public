// Anonymous gameplay data for balancing (pet strength, progression speed, question difficulty).
// Events never include names: each wizard and family is a short scrambled id. Events are kept on this device and,
// when online storage is available and the family allows it, uploaded in batches. Grown-ups can export them as a file.

import { cloudAddPlaydata } from './cloud.js';
import { GAME_VERSION } from './version.js';

const KEY = 'mwa-playdata-v1';
const MAX_EVENTS = 20000;          // keep at most this many on the device (oldest dropped)
const BATCH = 400;                 // events per online document (well under the 256 KiB document cap)

let buf = null;                    // { device, sent: index of first unsent event, events: [] }
let ctx = { kid: null, fam: null, grade: null, share: true, test: false };
let flushTimer = null;

function loadBuf() {
  if (buf) return buf;
  try { buf = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { buf = null; }
  if (!buf || !Array.isArray(buf.events)) buf = { device: 'd' + Math.random().toString(36).slice(2, 10), sent: 0, events: [] };
  return buf;
}
function saveBuf() { try { localStorage.setItem(KEY, JSON.stringify(buf)); } catch (e) { /* storage full: keep in memory */ } }

/** A short one-way scramble of an id, so events can be grouped per wizard without naming anyone. */
export function anon(id) {
  let h = 2166136261;
  for (const c of String(id || '')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36);
}

/** Who is playing (set when a wizard starts playing). share = the family allows uploading.
 *  test = a test wizard (the playthrough bot): its events are tagged so analysis can keep them apart. */
export function setPlayer({ profileId = null, familyId = null, grade = null, share = true, test = false } = {}) {
  ctx = { kid: profileId ? anon(profileId) : null, fam: familyId ? anon(familyId) : null, grade, share, test: !!test };
}

/** Record one event. type: short name; data: small plain values only (no names). */
export function track(type, data = {}) {
  const b = loadBuf();
  b.events.push({ t: Date.now(), type, v: GAME_VERSION, kid: ctx.kid, fam: ctx.fam, g: ctx.grade, ...(ctx.test ? { test: true } : {}), ...data });
  if (b.events.length > MAX_EVENTS) { const drop = b.events.length - MAX_EVENTS; b.events.splice(0, drop); b.sent = Math.max(0, b.sent - drop); }
  saveBuf();
  if (b.events.length - b.sent >= BATCH) flush();
  else { clearTimeout(flushTimer); flushTimer = setTimeout(flush, 120000); }
}

/** Upload unsent events in batches (only if the family allows sharing). */
export async function flush() {
  clearTimeout(flushTimer);
  const b = loadBuf();
  if (!ctx.share) return;
  while (b.events.length - b.sent > 0) {
    const chunk = b.events.slice(b.sent, b.sent + BATCH);
    const ok = await cloudAddPlaydata({ device: b.device, version: GAME_VERSION, from: chunk[0].t, to: chunk[chunk.length - 1].t, n: chunk.length, events: chunk });
    if (!ok) return;
    b.sent += chunk.length;
    saveBuf();
  }
}

export const playdataCount = () => loadBuf().events.length;

/** All events on this device as a JSON string (for the grown-ups' export). */
export function exportPlaydata() {
  const b = loadBuf();
  return JSON.stringify({ exported: new Date().toISOString(), version: GAME_VERSION, device: b.device, events: b.events });
}

if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

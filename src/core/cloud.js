// Online storage for family saves and anonymous play data.
// Today this is the claude.ai page's shared database (the `db` capability). When the game moves to its own
// hosted site, only this file needs a new backend: every function keeps the same shape.
// Every function fails soft: if online storage isn't available, the game keeps working from this device's copy.

let dbPromise = null;
let status = 'checking';          // 'checking' | 'online' | 'local'
const listeners = new Set();

function setStatus(s) { if (s !== status) { status = s; listeners.forEach((fn) => fn(s)); } }
export const cloudStatus = () => status;
export const onCloudStatus = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

/** The database namespace, or null when this view can't use online storage. */
export function cloudDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        if (!window.claude || typeof window.claude.use !== 'function') { setStatus('local'); return null; }
        const db = await Promise.race([window.claude.use('db'), new Promise((r) => setTimeout(() => r(null), 12000))]);
        setStatus(db ? 'online' : 'local');
        return db;
      } catch (e) { setStatus('local'); return null; }
    })();
  }
  return dbPromise;
}

// Codes that mean "online storage won't work for this viewer" (not a passing hiccup).
const HARD = new Set(['invalid_argument', 'not_granted', 'capability_disabled', 'capability_removed', 'revoked', 'quota_exceeded']);
// A request that hasn't answered in this long counts as failed, so the game never waits forever [TUNABLE].
const TIMEOUT_MS = 8000;
const timed = (promise) => Promise.race([promise, new Promise((_, no) => setTimeout(() => no(Object.assign(new Error('online storage did not answer'), { code: 'timeout' })), TIMEOUT_MS))]);
async function run(fn, fallback = null) {
  const db = await cloudDb();
  if (!db) return fallback;
  try { return await timed(fn(db)); }
  catch (e) {
    if (e?.code === 'unavailable') {   // transient: one retry after a short random delay
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 800));
      try { return await timed(fn(db)); } catch (e2) { console.warn('[cloud]', e2?.code, e2?.message); return fallback; }
    }
    console.warn('[cloud]', e?.code, e?.message);
    if (HARD.has(e?.code)) setStatus('local');
    return fallback;
  }
}

// Documents read from the store are frozen (read-only), and the game edits what it loads, so every read hands
// back its own editable copy.
const body = (snap) => JSON.parse(JSON.stringify(snap.data()));

// ---- families: families/{fid} holds the family card (name, crest, PIN hash, kid ids) ----
export const cloudListFamilies = () => run(async (db) => (await db.collection('families').get()).docs.filter((d) => d.exists).map(body), null);
export const cloudGetFamily = (fid) => run(async (db) => { const s = await db.doc(`families/${fid}`).get(); return s.exists ? body(s) : null; }, null);
export const cloudSaveFamily = (meta) => run(async (db) => { await db.doc(`families/${meta.id}`).set(JSON.parse(JSON.stringify(meta))); return true; }, false);
export const cloudDeleteFamily = (fid) => run(async (db) => { await db.doc(`families/${fid}`).delete(); return true; }, false);

// ---- kids: families/{fid}/kids/{pid} holds one wizard's whole save ----
export const cloudLoadKids = (fid) => run(async (db) => (await db.collection(`families/${fid}/kids`).get()).docs.filter((d) => d.exists).map(body), null);
export const cloudSaveKid = (fid, profile) => run(async (db) => { await db.doc(`families/${fid}/kids/${profile.id}`).set({ id: profile.id, saved: profile._saved || Date.now(), profile }); return true; }, false);
export const cloudDeleteKid = (fid, pid) => run(async (db) => { await db.doc(`families/${fid}/kids/${pid}`).delete(); return true; }, false);

// ---- play data: playdata/{auto} holds a batch of anonymous gameplay events ----
export const cloudAddPlaydata = (batch) => run(async (db) => { await db.collection('playdata').add(batch); return true; }, false);

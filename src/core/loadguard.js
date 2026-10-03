// Load guard: notes each step while the world opens. If the page reloads part-way (an iPad running out of memory
// reloads the page without any error), the next start finds the unfinished note, switches this device to lighter
// graphics and reports which step it stopped at (play data 'load_fail').
const KEY = 'mwa-loading', FAIL = 'mwa-load-fail', LITE = 'mwa-lite';
const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } };
const del = (k) => { try { localStorage.removeItem(k); } catch (e) { /* private mode */ } };
const parse = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };

/** An iPad / iPhone showing the game inside another page (the Claude app or claude.ai), which shares its memory. */
export function embeddedApple() {
  const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let framed = false;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }
  return apple && framed;
}
/** Lighter graphics: on embedded iPads, and on any device where the world once failed to open. */
export const liteMode = () => get(LITE) === '1' || embeddedApple();

let started = 0;
export function loadStep(step) {
  if (step === 'start') started = Date.now();
  const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
  set(KEY, JSON.stringify({ step, ms: Date.now() - started, lite: liteMode(), embedded: embeddedApple(), mem, ua: navigator.userAgent.slice(0, 160) }));
}
/** The world opened: forget the note; returns how long it took. */
export function loadDone() { del(KEY); return Date.now() - started; }

/** At start-up: did the last world load stop part-way? Then use lighter graphics from now on. */
export function checkLastLoad() {
  const s = get(KEY);
  if (!s) return null;
  del(KEY);
  set(LITE, '1');
  set(FAIL, s);
  return parse(s);
}
/** The failure note, once (sent with the next session's play data, when we know which kid is playing). */
export function takeLoadFailure() {
  const s = get(FAIL);
  if (!s) return null;
  del(FAIL);
  return parse(s);
}

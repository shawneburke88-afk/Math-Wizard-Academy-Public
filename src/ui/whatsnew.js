// "What's new" after an update: lists every version this device hasn't seen yet (new things first, then
// balancing and fixes). Remembered per device; a first visit shows nothing (everything is new then).
import { h, modal } from './dom.js';
import { CHANGELOG } from '../core/changelog.js';
import { GAME_VERSION } from '../core/version.js';

const KEY = 'mwa-seen-version';
const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
const write = (v) => { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: notes may repeat */ } };

let pending = null;
let open = null;

/** At start-up: work out which notes this device hasn't seen (hadPlayed = families already exist here). */
export function prepareWhatsNew({ hadPlayed }) {
  const seen = read();
  write(GAME_VERSION);
  if (seen === GAME_VERSION || (!seen && !hadPlayed)) return;
  if (CHANGELOG[0]?.aka?.includes(seen)) return;   // the same build under its old number
  const idx = seen ? CHANGELOG.findIndex((c) => c.v === seen || c.aka?.includes(seen)) : 1;
  // A version this build doesn't know (e.g. a newer preview played on this device): just show the latest notes.
  const fresh = CHANGELOG.slice(0, idx < 0 ? 1 : Math.max(1, idx)).slice(0, 4);
  if (fresh.length) pending = fresh;
}

/** Show the notes (if any are waiting). Screens that redraw themselves call this again after each redraw. */
export function showPendingWhatsNew() {
  if (!pending || (open && open.el.isConnected)) return;
  const fresh = pending;
  const m = modal(`✨ What’s new in ${GAME_VERSION}`, { wide: false, onClose: () => { pending = null; open = null; } });
  open = m;
  const added = fresh.flatMap((c) => c.added || []), changed = fresh.flatMap((c) => c.changed || []);
  m.body.append(
    added.length ? h('div', h('h3.wn-head', '🎉 New'), h('ul.wn-list', ...added.map((t) => h('li', t)))) : null,
    changed.length ? h('div', h('h3.wn-head.small', '🔧 Balancing and fixes'), h('ul.wn-list.small', ...changed.map((t) => h('li', t)))) : null,
    h('div.row', { style: { justifyContent: 'flex-end' } }, h('button.btn.green', { onclick: () => m.close() }, 'Let’s play!')));
}

// Small pet info blocks shared by the starter picker and the pet manager.
import { h } from './dom.js';
import { SPECIES, ELEMENTS, ROLES, strongAgainst, weakAgainst } from '../content/species.js';
import { skillTree } from '../content/abilities.js';

const elName = (el) => (el ? `${ELEMENTS[el].icon} ${ELEMENTS[el].name}` : '—');

/** Strong vs / Weak vs / Resists boxes. */
export function matchups(sp) {
  return h('div.matchups',
    h('div', h('b', 'Strong vs'), h('span.good', elName(strongAgainst(sp.element)))),
    h('div', h('b', 'Weak vs'), h('span.bad', elName(weakAgainst(sp.element)))),
    h('div', h('b', 'Resists'), h('span.res', elName(sp.resist))));
}

/** Stat-shape bars from the pet's role (same class pets have the same total, so bars compare fairly). */
export function roleBars(sp) {
  const r = ROLES[sp.role];
  const row = (label, v) => h('div.rbar', h('span', label), h('div.rbar-track', h('i', { style: { width: `${Math.round((v / 1.4) * 100)}%` } })));
  return h('div.rbars', row('Health', r.hp), row('Power', r.pow), row('Defence', r.ward), row('Speed', r.spd));
}

/** First moves the pet learns before it evolves. */
export function firstMoves(sp) {
  return skillTree(sp).filter((a) => a.stage === 1).map((a) => (a.level > 1 ? `${a.name} (Lv ${a.level})` : a.name)).join(' · ');
}

/** One-sentence read-aloud summary. */
export function petSummary(sp) {
  const r = ROLES[sp.role];
  return `${ELEMENTS[sp.element].name} pet. ${r.name}: ${r.desc} Strong against ${ELEMENTS[strongAgainst(sp.element)].name}, weak against ${ELEMENTS[weakAgainst(sp.element)].name}.`;
}

// Tiny DOM helpers for the HTML parts of the game (menus, battle, questions, parent area).

export const ui = () => document.getElementById('ui');

// Let replaceChildren/append skip null/false children (handy for conditional UI pieces).
for (const proto of [Element.prototype, DocumentFragment.prototype]) {
  for (const fn of ['replaceChildren', 'append']) {
    const orig = proto[fn];
    proto[fn] = function (...nodes) { return orig.apply(this, nodes.flat(Infinity).filter((n) => n != null && n !== false)); };
  }
}

/** h('div.card#id', {onclick, style, ...attrs}, ...children) */
export function h(tag, attrs = {}, ...children) {
  const [, name = 'div', rest = ''] = tag.match(/^([a-z0-9]+)?(.*)$/i) || [];
  const el = document.createElement(name || 'div');
  for (const part of rest.match(/[.#][^.#]+/g) || []) {
    if (part[0] === '.') el.classList.add(part.slice(1));
    else el.id = part.slice(1);
  }
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { children.unshift(attrs); attrs = {}; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'class') el.className += ' ' + v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** Element from an SVG/HTML string. */
export function svgEl(svg, cls = '') {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  d.innerHTML = svg || '';
  return d;
}

export function clearUI() { ui().innerHTML = ''; }

export function mount(el) { ui().appendChild(el); return el; }

export function toast(msg) {
  const t = h('div.toast', msg);
  ui().appendChild(t);
  setTimeout(() => t.remove(), 3300);
}

export function banner(title, sub) {
  document.querySelectorAll('.area-banner').forEach((b) => b.remove());
  const b = h('div.area-banner', title, sub ? h('small', sub) : null);
  ui().appendChild(b);
  setTimeout(() => b.remove(), 3100);
}

/** Modal panel. Returns { el, body, close }. */
export function modal(title, { onClose, wide = true } = {}) {
  const body = h('div.modal-body');
  let back;
  const close = () => { back.remove(); onClose && onClose(); };
  const box = h('div.modal', { style: wide ? {} : { width: 'min(620px, 100%)' } },
    h('div.modal-head', h('h2', title), h('button.close-x', { onclick: close, 'aria-label': 'Close' }, '✕')),
    body);
  back = h('div.modal-back', { onclick: (e) => { if (e.target === back) close(); } }, box);
  ui().appendChild(back);
  return { el: back, body, close };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** In-game yes/no dialog (the browser's confirm() is blocked in some places). Resolves true/false. */
export function ask(text, { yes = 'Yes', no = 'Cancel', danger = false } = {}) {
  return new Promise((resolve) => {
    const m = modal('Please confirm', { wide: false, onClose: () => resolve(false) });
    m.body.append(h('p', { style: { fontSize: '19px', fontWeight: 700, marginTop: 0 } }, text),
      h('div.row', { style: { justifyContent: 'flex-end' } },
        h('button.btn.secondary', { onclick: () => m.close() }, no),
        h('button.btn' + (danger ? '.red' : '.green'), { onclick: () => { m.el.remove(); resolve(true); } }, yes)));
  });
}

/** In-game message box (replaces alert()). */
export function notice(text, title = 'Note') {
  return new Promise((resolve) => {
    const m = modal(title, { wide: false, onClose: resolve });
    m.body.append(h('p', { style: { fontSize: '19px', fontWeight: 700, marginTop: 0 } }, text),
      h('div.row', { style: { justifyContent: 'flex-end' } }, h('button.btn', { onclick: () => m.close() }, 'OK')));
  });
}

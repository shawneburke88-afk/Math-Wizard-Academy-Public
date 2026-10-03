// The 🎵 button that floats on every screen: tap it for music and sound-effect switches and volume sliders.
// Settings are kept on this device (see sfx.js), so they apply to every wizard and even the welcome screen.
import { h } from './dom.js';
import { audioPrefs, setAudioPrefs, onAudioPrefs, unlockAudio, sfx } from '../core/sfx.js';

/** The switches and sliders (also shown in the in-game Menu). */
export function audioPanel() {
  const row = (label, onKey, volKey) => {
    const p = audioPrefs();
    const toggle = h('button.btn.small' + (p[onKey] ? '.green' : '.secondary'), {
      'aria-pressed': String(p[onKey]),
      onclick: () => { unlockAudio(); setAudioPrefs({ [onKey]: !audioPrefs()[onKey] }); if (onKey === 'sfxOn' && audioPrefs().sfxOn) sfx.tap(); },
    }, p[onKey] ? 'On' : 'Off');
    const slider = h('input.vol', {
      type: 'range', min: 0, max: 100, step: 5, value: Math.round(p[volKey] * 100), 'aria-label': `${label} volume`,
      oninput: (e) => { unlockAudio(); setAudioPrefs({ [volKey]: Number(e.target.value) / 100, [onKey]: true }); },
      onchange: () => { if (volKey === 'sfx') sfx.tap(); },
    });
    return h('div.audio-row', h('label', label), slider, toggle);
  };
  const box = h('div.audio-panel');
  const draw = () => box.replaceChildren(row('🎵 Music', 'musicOn', 'music'), row('🔔 Sounds', 'sfxOn', 'sfx'));
  draw();
  // Redraw when settings change elsewhere, but not while a slider is being dragged.
  const off = onAudioPrefs(() => { if (!box.isConnected) { off(); return; } if (!box.contains(document.activeElement) || document.activeElement.tagName !== 'INPUT') draw(); });
  return box;
}

let btn = null;
export function mountAudioControl() {
  if (btn) return;
  const icon = () => { const p = audioPrefs(); return !p.musicOn && !p.sfxOn ? '🔇' : !p.musicOn ? '🔈' : '🎵'; };
  let pop = null;
  const close = () => { pop?.remove(); pop = null; document.removeEventListener('pointerdown', outside, true); };
  const outside = (e) => { if (pop && !pop.contains(e.target) && e.target !== btn) close(); };
  btn = h('button.audio-fab', {
    'aria-label': 'Music and sound',
    onclick: () => {
      unlockAudio();
      if (pop) { close(); return; }
      pop = h('div.audio-pop', h('div.audio-title', 'Music & sound'), audioPanel());
      document.body.appendChild(pop);
      setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
    },
  }, icon());
  onAudioPrefs(() => { btn.textContent = icon(); });
  document.body.appendChild(btn);
}

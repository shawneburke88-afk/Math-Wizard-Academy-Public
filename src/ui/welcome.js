// Welcome screen: pick your family, then enter its 4-digit PIN. New families and forgotten PINs are handled here.
import { h, svgEl, clearUI, mount, toast, notice } from './dom.js';
import { wizardSVG } from '../art/wizard.js';
import { creatureSVG } from '../art/creatures.js';
import { propSVG } from '../art/world.js';
import { sfx, unlockAudio } from '../core/sfx.js';
import { families, refreshFamilies, createFamily, checkPin, setPin, openFamily, closeFamily, onlinePending, profiles, legacyProfiles, warmCloud, parseBackup, importBackup, markBackedUp } from '../core/save.js';
import { pickBackupFile } from './parent.js';
import { showPendingWhatsNew } from './whatsnew.js';
import { cloudStatus, onCloudStatus } from '../core/cloud.js';
import { GAME_VERSION } from '../core/version.js';

export const CRESTS = ['numberling', 'patternkin', 'shapeshifter', 'datapup', 'meanicorn', 'primeflare', 'arborithm', 'golemetry'];
const crestArt = (sp, stage = 2) => svgEl(creatureSVG(CRESTS.includes(sp) ? sp : 'numberling', stage, { mood: 'happy' }), 'crest');

/** The welcome scene: the Academy under the stars with a wizard and pets. */
function scene() {
  return h('div.welcome-art',
    h('div.w-moon'),
    svgEl(propSVG('academy', 'academy'), 'w-academy'),
    svgEl(wizardSVG({ skin: 2, hair: 1, hairColor: 3, robe: 0, hat: 0, hatColor: 0 }, { facing: 'right', pose: 'cast' }), 'w-wizard'),
    svgEl(creatureSVG('numberling', 2, { mood: 'happy', facing: 'left' }), 'w-pet p1'),
    svgEl(creatureSVG('hummbit', 1, { facing: 'right' }), 'w-pet p2'),
    svgEl(creatureSVG('meanicorn', 2, { mood: 'happy', facing: 'left' }), 'w-pet p3'),
    h('div.w-spark', '✦'), h('div.w-spark.s2', '✧'), h('div.w-spark.s3', '✦'));
}

export function showWelcome({ onOpen }) {
  warmCloud();
  const render = () => {
    clearUI();
    const list = families();
    const status = cloudStatus();
    const tiles = list.map((f) => h('button.family-tile', { onclick: () => { unlockAudio(); sfx.tap(); askPin(f); } },
      crestArt(f.crest), h('div.fname', f.name), h('div.finfo', `${(f.kids || []).length} wizard${(f.kids || []).length === 1 ? '' : 's'}`)));
    mount(h('div.screen.welcome.night-bg.stars-bg',
      scene(),
      h('div.welcome-title', '✦ Math Wizard Academy ✦'),
      h('div.welcome-sub', list.length ? 'Welcome back! Which family is playing?' : 'Welcome, young wizards! Start by making your family.'),
      h('div.family-list', ...tiles,
        h('button.family-tile.new', { onclick: () => { unlockAudio(); sfx.tap(); newFamily(); } }, h('div.plus', '+'), h('div.fname', 'New family'))),
      h('div.welcome-foot',
        h('button.btn.secondary.small.restore-btn', { onclick: () => { unlockAudio(); sfx.tap(); restoreFamily(); } }, '📂 Restore a backup'),
        h('span.cloud-chip.' + status, status === 'online' ? '☁️ Saves are stored online' : status === 'checking' ? '⏳ Checking online saves…' : '📱 Saves stay on this device'),
        h('span.version', GAME_VERSION))));
    showPendingWhatsNew();
  };
  render();
  const off = onCloudStatus(() => { if (document.querySelector('.welcome')) render(); });
  refreshFamilies().then(() => { if (document.querySelector('.welcome')) render(); });

  // ---- PIN entry ----
  function askPin(f) {
    const pad = pinPad({
      title: f.name, art: crestArt(f.crest), prompt: 'Enter your family PIN',
      onDigits: async (pin, pad) => {
        if (await checkPin(f.id, pin)) { await open(f.id); return true; }
        pad.fail('That PIN didn’t match. Try again!');
        return false;
      },
      extra: h('button.link-btn', { onclick: () => { pad.close(); forgot(f); } }, 'Forgot PIN?'),
    });
  }
  async function open(fid) {
    showLoading('Opening your family…');
    try { await openFamily(fid); }
    catch (e) { console.error('[welcome] open family failed', e); render(); toast(`Couldn’t open the family (${e?.message || e}). Please try again.`); return; }
    if (onlinePending()) {
      // Online saves didn't answer. With no wizards on this device, offer a retry rather than an empty family.
      if (!profiles().length) { closeFamily(); retryScreen(fid); return; }
      toast('Online saves are slow right now. Playing from this device’s copy; it will sync when it can.');
    }
    off();
    try { onOpen(); }
    catch (e) { console.error('[welcome] home failed', e); render(); toast('Something went wrong opening your family. Please try again.'); }
  }
  function retryScreen(fid) {
    clearUI();
    mount(h('div.screen.night-bg.stars-bg', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '20px', textAlign: 'center' } },
      h('div.welcome-sub', 'Couldn’t load your wizards from online saves just now.'),
      h('div', { style: { color: '#d8cff5', fontWeight: 700 } }, 'Check the internet connection, then try again.'),
      h('div.row', { style: { gap: '10px', justifyContent: 'center' } },
        h('button.btn.secondary', { onclick: () => render() }, '← Back'),
        h('button.btn.green', { onclick: () => open(fid) }, 'Try again'))));
  }

  // ---- forgotten PIN: an adult-level question, then a new PIN ----
  function forgot(f) {
    const a = 12 + Math.floor(Math.random() * 13), b = 6 + Math.floor(Math.random() * 7);
    const input = h('input.pin-answer', { type: 'text', inputmode: 'numeric', autocomplete: 'off' });
    const card = overlay(h('div.pin-card',
      h('h2', 'Grown-ups: reset the PIN'),
      h('p', `To set a new PIN for ${f.name}, answer:`),
      h('div.pin-q', `${a} × ${b} = ?`), input,
      h('div.row', { style: { justifyContent: 'center', gap: '10px', marginTop: '12px' } },
        h('button.btn.secondary', { onclick: () => card.close() }, 'Cancel'),
        h('button.btn.green', { onclick: () => {
          if (Number(input.value) !== a * b) { input.value = ''; toast('Not quite. Ask a grown-up!'); return; }
          card.close();
          choosePin(`New PIN for ${f.name}`, async (pin) => { await setPin(f.id, pin); toast('PIN changed!'); await open(f.id); });
        } }, 'Next'))));
    setTimeout(() => input.focus(), 100);
  }

  // ---- restore a whole family from a backup file (e.g. after the browser's data was cleared) ----
  async function restoreFamily() {
    const text = await pickBackupFile();
    if (!text) return;
    let parsed;
    try { parsed = parseBackup(text); } catch (e) { notice(e.message, 'Could not restore'); return; }
    const name = String(parsed.family || 'Our Family').slice(0, 24);
    const kids = parsed.profiles.map((p) => p.name).join(', ');
    choosePin(`Restore ${name}`, async (pin) => {
      showLoading('Restoring your family…');
      await createFamily({ name, crest: 'numberling', pin });
      try { importBackup(text); markBackedUp(); } catch (e) { notice(e.message, 'Could not restore'); }
      off();
      onOpen();
    }, `Found ${kids}. Choose a new 4-digit PIN for this family.`);
  }

  // ---- new family ----
  function newFamily() {
    const legacy = legacyProfiles();
    const state = { name: '', crest: 'numberling', bring: legacy.length > 0 };
    const nameIn = h('input.name-input', { type: 'text', maxlength: 24, placeholder: 'e.g. The Rivera Family', autocomplete: 'off', autocapitalize: 'words', oninput: (e) => { state.name = e.target.value; next.disabled = !state.name.trim(); } });
    const crestRow = h('div.crest-row');
    const drawCrests = () => crestRow.replaceChildren(...CRESTS.map((c) => h('button.crest-pick' + (state.crest === c ? '.sel' : ''), { onclick: () => { state.crest = c; sfx.tap(); drawCrests(); } }, crestArt(c, 1))));
    drawCrests();
    const next = h('button.btn.green', { disabled: true, onclick: () => {
      card.close();
      choosePin(`Choose a 4-digit PIN for ${state.name.trim()}`, async (pin) => {
        showLoading('Making your family…');
        await createFamily({ name: state.name, crest: state.crest, pin, bringLegacy: state.bring });
        off();
        onOpen();
      });
    } }, 'Next: choose a PIN →');
    const card = overlay(h('div.pin-card.wide',
      h('h2', 'Make your family'),
      h('p', 'Your family’s wizards stay together. A 4-digit PIN keeps other families from opening them.'),
      h('label.f-label', 'Family name'), nameIn,
      h('label.f-label', 'Pick your family crest'), crestRow,
      legacy.length ? h('label.legacy', h('input', { type: 'checkbox', checked: true, onchange: (e) => { state.bring = e.target.checked; } }),
        ` Bring the ${legacy.length} wizard${legacy.length === 1 ? '' : 's'} already on this device (${legacy.map((p) => p.name).join(', ')}) into this family`) : null,
      h('div.row', { style: { justifyContent: 'center', gap: '10px', marginTop: '14px' } }, h('button.btn.secondary', { onclick: () => card.close() }, 'Cancel'), next)));
    setTimeout(() => nameIn.focus(), 100);
  }

  /** Enter a PIN twice; calls done(pin) when both match. */
  function choosePin(title, done, prompt = 'Type 4 numbers you will remember') {
    pinPad({
      title, prompt,
      onDigits: (first, pad) => {
        pad.close();
        pinPad({
          title, prompt: 'Type the same PIN again',
          onDigits: async (second, pad2) => {
            if (second !== first) { pad2.fail('Those didn’t match. Let’s start again.'); setTimeout(() => { pad2.close(); choosePin(title, done); }, 900); return false; }
            pad2.close(); await done(first); return true;
          },
        });
        return true;
      },
    });
  }
}

function showLoading(text) {
  clearUI();
  mount(h('div.screen.night-bg.stars-bg', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center' } }, h('div.welcome-sub', text)));
}

function overlay(child) {
  const back = h('div.pin-back', child);
  document.getElementById('ui').appendChild(back);
  return { el: back, close: () => back.remove() };
}

/** A 4-digit PIN pad. onDigits(pin, pad) is called when 4 digits are entered; return true when handled. */
export function pinPad({ title, art = null, prompt, onDigits, extra = null }) {
  let pin = '';
  const dots = h('div.pin-dots', ...[0, 1, 2, 3].map(() => h('i')));
  const msg = h('div.pin-msg', prompt);
  const draw = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < pin.length));
  let busy = false;
  const press = async (k) => {
    if (busy) return;
    sfx.tap();
    if (k === '⌫') pin = pin.slice(0, -1);
    else if (pin.length < 4) pin += k;
    draw();
    if (pin.length === 4) { busy = true; const entered = pin; await onDigits(entered, api); busy = false; }
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
  const card = h('div.pin-card',
    h('button.close-x', { onclick: () => api.close(), 'aria-label': 'Close' }, '✕'),
    art ? h('div.pin-art', art) : null,
    h('h2.pin-title', title), msg, dots,
    h('div.pin-keys', ...keys.map((k) => (k ? h('button', { onclick: () => press(k) }, k) : h('span')))),
    extra);
  const back = h('div.pin-back', card);
  document.getElementById('ui').appendChild(back);
  const api = {
    close: () => back.remove(),
    fail: (text) => { msg.textContent = text; msg.classList.add('bad'); card.classList.add('shake'); sfx.wrong(); setTimeout(() => card.classList.remove('shake'), 400); pin = ''; draw(); },
  };
  return api;
}

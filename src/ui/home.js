// Home screen (tap your wizard to play, no logins) and the new-wizard creation flow.
import { h, svgEl, clearUI, mount, notice } from './dom.js';
import { profiles, createProfile, currentFamily, persist, backupDue } from '../core/save.js';
import { GAME_VERSION } from '../core/version.js';
import { wizardSVG, WIZARD_OPTIONS } from '../art/wizard.js';
import { creatureSVG } from '../art/creatures.js';
import { SPECIES, ELEMENTS, STARTERS, ROLES } from '../content/species.js';
import { matchups, roleBars, firstMoves, petSummary } from './petinfo.js';
import { speak } from '../core/speech.js';
import { sfx, unlockAudio } from '../core/sfx.js';

export function showHome({ onPlay, onParent, onSwitch }) {
  clearUI();
  const list = profiles();
  const tiles = list.map((p) => {
    const resting = p.restUntil && p.restUntil > Date.now();
    return h('button.profile-tile', {
      onclick: () => {
        unlockAudio(); sfx.tap();
        if (resting) { speak(`${p.name}, your pets are resting. Come back a little later!`); notice(`Your pets are resting! Come back in about ${Math.ceil((p.restUntil - Date.now()) / 60000)} minutes.`, '😴 Resting'); return; }
        onPlay(p);
      },
    },
    resting ? h('div.rest-badge', '😴 Resting') : null,
    h('span.edit-wiz', { role: 'button', 'aria-label': `Edit ${p.name}`, onclick: (e) => { e.stopPropagation(); sfx.tap(); editWizard(p, { onDone: () => showHome({ onPlay, onParent, onSwitch }) }); } }, '✏️'),
    svgEl(wizardSVG(p.look, { facing: 'down' }), 'avatar'),
    h('div.pname', p.name),
    h('div.pinfo', `Grade ${p.grade} · Wizard Lv ${p.wizard.level}`),
    h('div.pinfo', `${p.pets.length} pet${p.pets.length === 1 ? '' : 's'}`));
  });
  const fam = currentFamily();
  const screen = h('div.screen.night-bg.stars-bg',
    fam && onSwitch ? h('button.btn.secondary.small.family-chip', { onclick: () => { sfx.tap(); onSwitch(); } }, `🏠 ${fam.name} · Switch`) : null,
    h('button.btn.secondary.small.grownups' + (backupDue() ? '.glow' : ''), { onclick: () => { unlockAudio(); onParent(); } }, '👪 Grown-ups'),
    h('div.version-tag', GAME_VERSION),
    h('div.title', '✦ Math Wizard Academy ✦'),
    h('div.subtitle', list.length ? 'Tap your wizard to play!' : 'Welcome! Make your first wizard.'),
    backupDue() ? h('button.backup-nudge', { onclick: () => { unlockAudio(); onParent(); } }, '💾 Grown-ups: there’s new progress since the last backup. Tap here, then “Save backup file”.') : null,
    h('div.profiles', ...tiles,
      list.length < 8 ? h('button.profile-tile.new', { onclick: () => { unlockAudio(); sfx.tap(); showCreate({ onDone: onPlay, onCancel: () => showHome({ onPlay, onParent }) }); } },
        h('div.plus', '+'), h('div.pname', 'New wizard')) : null));
  mount(screen);
}

/** The wizard look designer (skin, hair, robe, hat). Calls onChange after every pick. */
function lookDesigner(look, onChange) {
  const preview = svgEl(wizardSVG(look, { facing: 'down' }), 'look-preview');
  const opts = WIZARD_OPTIONS;
  const pick = (key, i) => { look[key] = i; sfx.tap(); onChange(); };
  const swatchRow = (label, key, colors) => h('div.opt-row', h('h4', label), h('div.swatches',
    ...colors.map((c, i) => h('button.swatch' + (look[key] === i ? '.sel' : ''), { style: { background: c }, 'aria-label': `${label} ${i + 1}`, onclick: () => pick(key, i) }))));
  const chipRow = (label, key, names) => h('div.opt-row', h('h4', label), h('div.swatches',
    ...names.map((n, i) => h('button.choice-chip' + (look[key] === i ? '.sel' : ''), { onclick: () => pick(key, i) }, n))));
  return h('div.look-wrap', preview, h('div.card',
    swatchRow('Skin', 'skin', opts.skin),
    chipRow('Hair style', 'hair', opts.hairStyles),
    swatchRow('Hair colour', 'hairColor', opts.hairColor),
    swatchRow('Robe colour', 'robe', opts.robe),
    chipRow('Hat', 'hat', opts.hatStyles),
    swatchRow('Hat colour', 'hatColor', opts.robe)));
}

/** Change an existing wizard's name and look. */
export function editWizard(profile, { onDone }) {
  const state = { name: profile.name, look: { ...profile.look } };
  const render = () => {
    clearUI();
    const input = h('input.name-input', { type: 'text', maxlength: 16, value: state.name, autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false',
      oninput: (e) => { state.name = e.target.value; save.disabled = !state.name.trim(); } });
    const save = h('button.btn.green', { disabled: !state.name.trim(), onclick: () => {
      profile.name = state.name.trim().slice(0, 16); profile.look = { ...state.look }; persist(); sfx.levelUp(); onDone();
    } }, 'Save changes ✓');
    mount(h('div.screen.night-bg.stars-bg',
      h('div', h('button.btn.secondary.small', { onclick: onDone }, '← Cancel')),
      h('div.create', h('div.title', 'Edit your wizard'),
        h('div.center', { style: { margin: '10px 0 16px' } }, input),
        lookDesigner(state.look, render),
        h('div.center', { style: { marginTop: '16px' } }, save))));
  };
  render();
}

export function showCreate({ onDone, onCancel }) {
  const state = {
    name: '', grade: null,
    look: { skin: 1, hair: 0, hairColor: 0, robe: 0, hat: 0, hatColor: 0 },
    starter: null,
  };
  let step = 0;
  const say = (t) => speak(t);

  function render() {
    clearUI();
    const back = h('button.btn.secondary.small', { onclick: () => { if (step === 0) onCancel(); else { step--; render(); } } }, '← Back');
    let content;
    if (step === 0) {
      const input = h('input.name-input', { type: 'text', maxlength: 16, placeholder: 'Your name', value: state.name, autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false',
        oninput: (e) => { state.name = e.target.value; next.disabled = !state.name.trim(); } });
      const next = h('button.btn', { disabled: !state.name.trim(), onclick: () => { step++; render(); } }, 'Next →');
      content = h('div.create', h('div.title', 'What is your name?'), h('div.center', { style: { margin: '30px 0' } }, input), h('div.center', next));
      setTimeout(() => input.focus(), 100);
      say('What is your name?');
    } else if (step === 1) {
      content = h('div.create', h('div.title', 'What grade are you in?'), h('div.subtitle', 'Your math questions will match your grade.'),
        h('div.grade-grid', ...[1, 2, 3, 4, 5, 6].map((g) => h('button.btn.grade-btn' + (state.grade === g ? '.green' : '.secondary'), {
          onclick: () => { state.grade = g; sfx.tap(); say(`Grade ${g}`); step++; render(); },
        }, `Grade ${g}`))));
      say('What grade are you in?');
    } else if (step === 2) {
      content = h('div.create', h('div.title', 'Design your wizard'),
        lookDesigner(state.look, render),
        h('div.center', { style: { marginTop: '16px' } }, h('button.btn', { onclick: () => { step++; render(); } }, 'Looks great! →')));
      if (!state._saidLook) { say('Design your wizard!'); state._saidLook = true; }
    } else {
      const blurbs = {
        numberling: 'Loves counting and big numbers.',
        patternkin: 'Sees patterns everywhere.',
        shapeshifter: 'Made of shapes and angles.',
        datapup: 'Collects data and loves chance.',
      };
      content = h('div.create', h('div.title', 'Choose your first pet!'), h('div.subtitle', 'You can befriend many more on your adventure.'),
        h('div.starters', ...STARTERS.map((s) => {
          const sp = SPECIES[s], el = ELEMENTS[sp.element];
          const role = ROLES[sp.role];
          return h('button.starter' + (state.starter === s ? '.sel' : ''), { onclick: () => { state.starter = s; sfx.tap(); say(`${sp.names[0]}. ${blurbs[s]} ${petSummary(sp)}`); render(); } },
            svgEl(creatureSVG(s, 1, {}), 'art'), h('h3', sp.names[0]),
            h('div.starter-pills', h('span.pill.el-' + sp.element, `${el.icon} ${el.name}`), h('span.pill', `${role.icon} ${role.name}`)),
            h('p', blurbs[s]),
            h('p.starter-role', role.desc),
            roleBars(sp),
            matchups(sp),
            h('div.starter-moves', h('b', 'First moves: '), firstMoves(sp)));
        })),
        h('div.center', { style: { marginTop: '20px' } }, h('button.btn.green', {
          disabled: !state.starter,
          onclick: () => {
            const p = createProfile({ name: state.name, grade: state.grade, look: state.look, starter: state.starter });
            onDone(p, { isNew: true });
          },
        }, 'Start my adventure! ✦')));
      if (!state._saidStarter) { say('Choose your first pet!'); state._saidStarter = true; }
    }
    mount(h('div.screen.night-bg.stars-bg', h('div', back), content));
  }
  render();
}

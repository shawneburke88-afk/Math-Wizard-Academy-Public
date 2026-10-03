// Grown-ups area: progress reports, settings per kid, and backup codes. Behind a simple adult check.
import { progressView } from './progressview.js';
import { h, clearUI, mount, toast, ask, notice, modal } from './dom.js';
import { profiles, persist, deleteProfile, exportBackup, importBackup, currentFamily, renameFamily, setPin, deleteFamily, closeFamily, backupFileText, markBackedUp, backupDue, progressMark } from '../core/save.js';
import { cloudStatus } from '../core/cloud.js';
import { exportPlaydata, playdataCount, flush as flushPlaydata } from '../core/telemetry.js';
import { pinPad } from './welcome.js';
import { GAME_VERSION } from '../core/version.js';
import { ALL_SKILLS, STRANDS, BIG_IDEAS, strandCap } from '../content/curriculum.js';
import { struggling, enforceCaps } from '../core/adaptive.js';
import { resetTips } from './tutorial.js';

export function showParentGate({ onPass, onCancel }) {
  clearUI();
  const a = 6 + Math.floor(Math.random() * 7), b = 12 + Math.floor(Math.random() * 8);
  const input = h('input', { type: 'text', inputmode: 'numeric', style: { fontSize: '30px', width: '160px', textAlign: 'center', padding: '10px', borderRadius: '14px', border: '3px solid #c9bfe0' } });
  const check = () => { if (Number(input.value) === a * b) onPass(); else { input.value = ''; toast('Not quite, ask a grown-up!'); } };
  mount(h('div.screen.night-bg.stars-bg', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px' } },
    h('div.title', 'Grown-ups only'),
    h('div', { style: { fontSize: '26px', fontWeight: 800 } }, `What is ${a} × ${b}?`),
    input,
    h('div.row', h('button.btn.secondary', { onclick: onCancel }, 'Back'), h('button.btn', { onclick: check }, 'Enter'))));
  setTimeout(() => input.focus(), 100);
}

export function showParent({ onExit, onSandbox = null }) {
  let selId = profiles()[0]?.id || null;
  let tab = backupDue() ? 'family' : 'progress';   // 'progress' | 'settings' | 'family' (straight to Backup when one is due)
  const view = { strand: null };        // Progress drill-down state
  // Re-render keeps the scroll position, so changing a setting doesn't jump back to the top.
  function render({ top = false } = {}) {
    const keep = top ? 0 : document.querySelector('.screen.parent')?.scrollTop || 0;
    clearUI();
    const list = profiles();
    const p = list.find((x) => x.id === selId) || list[0];
    const due = backupDue();
    const tabBtn = (id, label) => h('button.pv-tab' + (tab === id ? '.sel' : '') + (id === 'family' && due && tab !== id ? '.glow' : ''), { onclick: () => { tab = id; view.strand = null; render({ top: true }); } }, label);
    const screen = h('div.screen.parent',
      h('div.row', { style: { justifyContent: 'space-between' } }, h('h1', '👪 Grown-ups'), h('button.btn.secondary', { onclick: onExit }, 'Done')),
      list.length ? h('div.kid-tabs', ...list.map((k) => h('button.choice-chip' + (k.id === p.id ? '.sel' : ''), { onclick: () => { selId = k.id; view.strand = null; render({ top: true }); } }, `${k.name} (Gr ${k.grade})`))) : h('p', 'No wizards yet.'),
      h('div.pv-tabs', p ? tabBtn('progress', '📊 Progress') : null, p ? tabBtn('settings', `⚙️ ${p.name}’s settings`) : null, tabBtn('family', '🏠 Family & tools')),
      tab === 'progress' && p ? progressView(p, view, render) : null,
      tab === 'settings' && p ? kidSettings(p, render) : null,
      tab === 'settings' && p ? kidReport(p, render) : null,
      (tab === 'family' || !p) && due ? backupSection(render) : null,
      tab === 'family' || !p ? familySection(render, onExit) : null,
      (tab === 'family' || !p) && onSandbox ? h('section', h('h2', '🧪 Sandbox (testing)'), h('p.muted', 'Build a separate test wizard at any level, with any areas complete and the whole map revealed, to try the balance and plan.'), h('button.btn.purple', { onclick: onSandbox }, 'Open sandbox')) : null,
      (tab === 'family' || !p) && !due ? backupSection(render) : null);
    mount(screen);
    screen.scrollTop = keep;
  }
  render({ top: true });
}

/** Detailed skill list (every skill with its tier), shown under Settings. */
function kidReport(p, rerender) {
  enforceCaps(p);
  const skills = ALL_SKILLS.filter((s) => s.grade === p.grade);
  const acc = p.stats.answered ? Math.round((p.stats.correct / p.stats.answered) * 100) : 0;
  const mastered = skills.filter((s) => p.skills[s.id]?.mastered).length;
  const byStrand = Object.entries(STRANDS).map(([sid, st]) => {
    const fams = Object.entries(BIG_IDEAS).filter(([, b]) => b.strand === sid);
    return h('div', h('h3', st.name), ...fams.map(([fid, fam]) => {
      const fs = skills.filter((s) => s.bigIdea === fid);
      if (!fs.length) return null;
      return h('div', h('div', { style: { fontWeight: 900, color: '#7a4fd6', margin: '6px 0 2px' } }, fam.name), ...fs.map((s) => skillRow(p, s)));
    }));
  });
  return h('section',
    h('h2', `All skills (Grade ${p.grade})`),
    h('div.summary-stats',
      h('div', h('b', String(p.stats.answered || 0)), 'questions answered'),
      h('div', h('b', acc + '%'), 'correct overall'),
      h('div', h('b', `${mastered}/${skills.length}`), 'skills mastered'),
      h('div', h('b', p.pets.length), 'pets befriended'),
      h('div', h('b', String(Math.round((p.stats.playMs || 0) / 60000))), 'minutes played')),
    p.stats.sprints ? h('p.muted', h('b', 'Mental math chests: '), `${p.stats.sprints} sprint${p.stats.sprints === 1 ? '' : 's'}, best ${p.stats.sprintBest} right in ${p.settings.mentalTime || 20} seconds.`) : null,
    h('p.muted', h('b', 'Zone caps: '), ...Object.entries(STRANDS).map(([sid, st]) => `${st.name}: up to Tier ${strandCap(p, sid)}${strandCap(p, sid) < 5 ? ` (Tier ${strandCap(p, sid) + 1} opens when they reach area ${strandCap(p, sid)} of 4)` : ''}. `)),
    h('p.muted', 'Each skill has 5 tiers. Kids move up after 7 of their last 8 are correct without a hint (above Tier 2, at most one step per skill per day) and down after 4 of 6 wrong. "Mastered" means the top tier is solid on 2 different days. ★ = mastered, ⚠ = struggling right now. "Classic" skills come from the older NB guides.'),
    ...byStrand);
}

function skillRow(p, s) {
  const st = p.skills[s.id]?.total ? p.skills[s.id] : null;
  const tier = st?.tier || 1;
  const acc = st?.total ? Math.round((st.correct / st.total) * 100) + '%' : '—';
  return h('div.skill-row',
    h('div', h('div.sn', s.name, s.classic ? h('span.pill', { style: { marginLeft: '6px', fontSize: '11px' } }, 'Classic') : null, st?.mastered ? ' ★' : ''),
      h('div.sd', s.parentDesc)),
    h('div.tiers' + (st?.mastered ? '.mastered' : ''), ...[1, 2, 3, 4, 5].map((t) => h('i' + (st && t <= tier ? '.on' : '')))),
    h('div', st ? `Tier ${tier}` : 'not started', st && struggling(p, s.id) ? h('div', h('span.flag', '⚠ struggling')) : null),
    h('div', { style: { fontSize: '13px' } }, `${acc}`, h('div', { style: { color: '#5b4f73' } }, `${st?.total || 0} Qs · ${st?.hints || 0} hints`)));
}

function seg(options, value, onPick) {
  return h('div.seg', ...options.map(([v, label]) => h('button' + (v === value ? '.sel' : ''), { onclick: () => onPick(v) }, label)));
}

function kidSettings(p, rerender) {
  const S = p.settings;
  const save = () => { persist(); rerender(); };
  const skills = ALL_SKILLS.filter((s) => s.grade === p.grade);
  return h('section',
    h('h2', `Settings for ${p.name}`),
    h('div.setting', h('div', h('label', 'Name'), h('div.help', 'Shown on the home screen.')),
      h('input', { type: 'text', value: p.name, maxlength: 16, onchange: (e) => { p.name = e.target.value.trim() || p.name; save(); } })),
    h('div.setting', h('div', h('label', 'Grade'), h('div.help', 'Questions come from this grade. Move up each September. Pets and progress carry over.')),
      seg([1, 2, 3, 4, 5, 6].map((g) => [g, `Gr ${g}`]), p.grade, async (g) => { if (g !== p.grade && await ask(`Change ${p.name} to Grade ${g}? Pets and progress are kept.`, { yes: `Move to Grade ${g}` })) { p.grade = g; S.focusSkills = []; save(); } })),
    h('div.setting', h('div', h('label', 'Curriculum'), h('div.help', 'Mix = new NB curriculum plus some "classic" skills from the older guides. New only = just the 2026–27 curriculum.')),
      seg([['mix', 'Mix'], ['new', 'New only'], ['classic', 'Classic-heavy']], S.curriculum, (v) => { S.curriculum = v; save(); })),
    h('div.setting', h('div', h('label', 'Mental math chests'), h('div.help', 'Timed ⏱ chests: answer quick facts before time runs out for bigger rewards. This is the only timed part of the game. Give more time, or turn them off.')),
      seg([[20, '20 s'], [30, '30 s'], [45, '45 s'], [0, 'Off']], S.mentalTime ?? 20, (v) => { S.mentalTime = v; save(); })),
    h('div.setting', h('div', h('label', 'Break reminder'), h('div.help', 'How long before the game suggests a break. It never interrupts a battle.')),
      seg([[0, 'Off'], [10, '10 min'], [15, '15'], [20, '20'], [30, '30'], [45, '45']], S.sessionMinutes, (v) => { S.sessionMinutes = v; save(); })),
    h('div.setting', h('div', h('label', 'At the reminder'), h('div.help', 'Gentle: a friendly message, they can keep playing. Finish and rest: the game ends after the current battle and waits.')),
      seg([['gentle', 'Gentle reminder'], ['rest', 'Finish and rest']], S.sessionMode, (v) => { S.sessionMode = v; save(); })),
    S.sessionMode === 'rest' ? h('div.setting', h('label', 'Rest time'), seg([[15, '15 min'], [30, '30 min'], [60, '1 hour'], [120, '2 hours']], S.restMinutes, (v) => { S.restMinutes = v; save(); })) : null,
    p.restUntil > Date.now() ? h('div.setting', h('label', `Resting until ${new Date(p.restUntil).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`), h('button.btn.small', { onclick: () => { p.restUntil = 0; save(); } }, 'End rest now')) : null,
    h('div.setting', h('div', h('label', 'Read aloud'), h('div.help', 'Default: on for Grades 1–2.')),
      seg([[null, 'Default'], [true, 'Always'], [false, 'Off']], S.autoRead, (v) => { S.autoRead = v; save(); })),
    h('div.setting', h('div', h('label', 'Helper tips (Hoot the owl)'), h('div.help', 'Hoot explains each part of the game the first time it appears. Replay shows every tip again.')),
      h('div.row', seg([[true, 'On'], [false, 'Off']], S.tips !== false, (v) => { S.tips = v; save(); }),
        h('button.btn.secondary.small', { onclick: () => { resetTips(p); S.tips = true; save(); toast('Tips will show again.'); } }, 'Replay tips'))),
    h('div.setting', { style: { display: 'block' } }, h('label', 'Focus skills'), h('div.help', 'Tick skills to practise more often (e.g., what the class is learning this week). Leave empty for a balanced mix.'),
      h('div.focus-list', ...skills.map((s) => h('label', h('input', { type: 'checkbox', checked: S.focusSkills.includes(s.id) || null, onchange: (e) => {
        S.focusSkills = e.target.checked ? [...S.focusSkills, s.id] : S.focusSkills.filter((x) => x !== s.id); persist();
      } }), `${s.name}${s.classic ? ' (classic)' : ''}`)))),
    h('div.setting', h('div', h('label', 'Delete this wizard'), h('div.help', 'Removes all of this wizard’s progress from this iPad. Make a backup first!')),
      h('button.btn.red.small', { onclick: async () => { if (await ask(`Delete ${p.name} and all progress? This cannot be undone.`, { yes: 'Delete forever', danger: true })) { deleteProfile(p.id); rerender(); } } }, 'Delete')));
}

// ---- Backup files ----
// Where the browser can write files (Chrome / Edge on a computer), the file picked the first time is remembered and
// each later backup overwrites it; "Change backup location" picks a new one. Elsewhere (iPad / iPhone Safari) each
// backup goes through the share sheet ("Save to Files"), always with the same file name so it can replace the old one.
const canRemember = () => typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
function handleStore(mode, fn) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('mwa-backup', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('handles');
      req.onerror = () => resolve(null);
      req.onsuccess = () => { const tx = req.result.transaction('handles', mode); const r = fn(tx.objectStore('handles')); tx.oncomplete = () => resolve(r?.result ?? null); tx.onerror = () => resolve(null); };
    } catch (e) { resolve(null); }
  });
}
const getHandle = (fid) => handleStore('readonly', (st) => st.get(fid));
const setHandle = (fid, hd) => handleStore('readwrite', (st) => st.put(hd, fid));
const backupName = (fam) => `Math Wizard backup - ${(fam?.name || 'family').replace(/[^\w -]/g, '').trim()}.txt`;

/** Save the family's backup. choose = pick a (new) file location even if one is remembered. */
export async function saveBackupFile({ choose = false } = {}) {
  const fam = currentFamily();
  const name = backupName(fam);
  const text = backupFileText();
  if (canRemember()) {
    try {
      let hd = choose ? null : await getHandle(fam?.id);
      if (hd) {
        let perm = await hd.queryPermission?.({ mode: 'readwrite' });
        if (perm !== 'granted') perm = await hd.requestPermission?.({ mode: 'readwrite' });
        if (perm !== 'granted') hd = null;
      }
      if (!hd) {
        hd = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'Math Wizard backup', accept: { 'text/plain': ['.txt'] } }] });
        await setHandle(fam?.id, hd);
      }
      const w = await hd.createWritable(); await w.write(text); await w.close();
      markBackedUp(hd.name); toast(`Backup saved to ${hd.name}`);
      return true;
    } catch (e) { if (e?.name === 'AbortError') return false; /* fall back to share / download */ }
  }
  try {
    const file = new File([text], name, { type: 'text/plain' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Math Wizard backup' }); markBackedUp(name); toast('Backup saved!'); return true; }
  } catch (e) { if (e?.name === 'AbortError') return false; }
  try {   // inside claude.ai, files are saved through the page's downloads capability
    const dl = window.claude?.use ? await window.claude.use('downloads') : null;
    if (dl) { await dl.save({ filename: name, data: text }); markBackedUp(name); toast('Backup saved!'); return true; }
  } catch (e) { if (e?.code === 'declined') return false; }
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })), download: name });
  document.body.appendChild(a); a.click(); a.remove();
  markBackedUp(name); toast('Backup file saved to Downloads!');
  return true;
}

/** Save to the remembered backup file without asking, when the browser still allows it (no tap needed). */
export async function autoBackup() {
  if (!canRemember()) return false;
  try {
    const fam = currentFamily();
    const hd = await getHandle(fam?.id);
    if (!hd || (await hd.queryPermission?.({ mode: 'readwrite' })) !== 'granted') return false;
    const w = await hd.createWritable(); await w.write(backupFileText()); await w.close();
    markBackedUp(hd.name); toast(`💾 Backup updated (${hd.name})`);
    return true;
  } catch (e) { return false; }
}

/** "Save a backup?" box with one big button (the tap lets the browser open its save window). */
let skippedAt = null;   // progress when "Not now" was tapped: don't ask again until there is more play
export function offerBackup({ onDone } = {}) {
  if (skippedAt != null && skippedAt === progressMark()) return;
  const fam = currentFamily();
  const m = modal('💾 Save a backup?', { wide: false, onClose: () => { skippedAt = progressMark(); onDone?.(); } });
  const first = !fam?.lastBackup;
  m.body.append(
    h('p', { style: { fontSize: '18px', fontWeight: 700, marginTop: 0 } }, 'There’s new progress since the last backup. Saving a backup keeps it safe if this browser’s data is ever cleared.'),
    h('p.muted', canRemember()
      ? (first ? 'The first time, choose where to keep the file (for example Documents). After that, the game updates that same file by itself.' : 'Tap Save to update your backup file.')
      : 'On an iPad: tap Save, then “Save to Files”, pick iCloud Drive and the same folder as last time, and tap Replace.'),
    h('div.row', { style: { justifyContent: 'flex-end', gap: '10px' } },
      h('button.btn.secondary', { onclick: () => m.close() }, 'Not now'),
      h('button.btn.green.glow', { onclick: async () => { if (await saveBackupFile()) { skippedAt = null; m.close(); } } }, '💾 Save backup now')));
}

/** Ask for a backup file and return its text (or null if none was picked). */
export function pickBackupFile() {
  return new Promise((resolve) => {
    const inp = h('input', { type: 'file', accept: '.txt,text/plain', style: { display: 'none' } });
    inp.addEventListener('change', async () => { const f = inp.files?.[0]; inp.remove(); resolve(f ? await f.text() : null); });
    inp.addEventListener('cancel', () => { inp.remove(); resolve(null); });
    document.body.appendChild(inp); inp.click();
  });
}

function backupSection(rerender) {
  const out = h('textarea', { readonly: true, placeholder: 'Tap "Copy backup code" to create a code.' });
  const inp = h('textarea', { placeholder: 'Or paste a backup code here.' });
  const fam = currentFamily();
  const last = fam?.lastBackup;
  const due = backupDue();
  const restore = async (text) => {
    if (!text || !text.trim()) return;
    if (!(await ask('Restoring adds the wizards in the backup to this family (a wizard that is already here is replaced by the saved copy). Continue?', { yes: 'Restore', danger: true }))) return;
    try { const n = importBackup(text); toast(`Restored ${n} wizard(s)!`); rerender(); } catch (e) { notice(e.message, 'Could not restore'); }
  };
  return h('section',
    h('h2', 'Backup'),
    h('p.muted', canRemember()
      ? 'Saves live in this browser, so clearing website data would lose them. The first backup asks where to save the file; after that each backup updates that same file.'
      : 'Saves live in this browser, so clearing website data (or a new iPad) would lose them. On an iPad, tap “Save to Files”, pick iCloud Drive and the same folder each time, then tap Replace.'),
    due ? h('p.backup-due', '✨ New progress since the last backup. Tap the glowing button to save it.') : null,
    h('p.muted', last ? `Last backup: ${new Date(last).toLocaleString()}${fam?.backupFile ? ` · ${fam.backupFile}` : ''}` : 'No backup saved yet on this device.'),
    h('div.row', h('button.btn.green.small' + (due ? '.glow' : ''), { onclick: async () => { if (await saveBackupFile()) rerender(); } }, '💾 Save backup file'),
      canRemember() && last ? h('button.btn.secondary.small.tiny', { onclick: async () => { if (await saveBackupFile({ choose: true })) rerender(); } }, 'Change backup location') : null,
      h('button.btn.secondary.small', { onclick: async () => {
        out.value = exportBackup(); markBackedUp();
        try { await navigator.clipboard.writeText(out.value); toast('Backup code copied! Paste it into Notes or an email.'); } catch (e) { out.select(); toast('Select the code and copy it.'); }
      } }, 'Copy backup code')),
    out,
    h('h3', 'Restore'),
    h('div.row', h('button.btn.small', { onclick: async () => restore(await pickBackupFile()) }, '📂 Load backup file'),
      h('button.btn.secondary.small', { onclick: () => restore(inp.value) }, 'Restore from pasted code')),
    inp);
}

/** Family settings: name, PIN, online saving status, anonymous play data. */
function familySection(rerender, onExit) {
  const fam = currentFamily();
  if (!fam) return null;
  const nameIn = h('input', { type: 'text', value: fam.name, maxlength: 24 });
  const status = cloudStatus();
  const saveFile = async (filename, text) => {
    try {
      const dl = window.claude?.use ? await window.claude.use('downloads') : null;
      if (dl) { await dl.save({ filename, data: text }); return; }
    } catch (e) { if (e?.code === 'declined') return; }
    const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: filename });
    document.body.appendChild(a); a.click(); a.remove();
  };
  return h('section',
    h('h2', `🏠 Family: ${fam.name}`),
    h('p.muted', status === 'online' ? '☁️ This family is saved online, so it can be played from any device where you open the game.' : '📱 Online saving isn’t available here, so this family is saved on this device only. Use a backup code to move it.'),
    h('div.setting', h('div', h('label', 'Family name')), h('div.row', nameIn, h('button.btn.small', { onclick: async () => { await renameFamily(fam.id, nameIn.value); toast('Family name saved'); rerender(); } }, 'Save'))),
    h('div.setting', h('div', h('label', 'Family PIN'), h('div.help', 'The 4-digit PIN kids enter to open this family.')),
      h('button.btn.small.secondary', { onclick: () => {
        pinPad({ title: 'New family PIN', prompt: 'Type 4 numbers', onDigits: (first, pad) => { pad.close(); pinPad({ title: 'New family PIN', prompt: 'Type it again', onDigits: async (second, pad2) => { if (first !== second) { pad2.fail('Those didn’t match. Try again.'); return false; } pad2.close(); await setPin(fam.id, first); toast('PIN changed'); return true; } }); return true; } });
      } }, 'Change PIN')),
    h('div.setting', h('div', h('label', 'Share anonymous play data'), h('div.help', 'Helps tune pet strength, levelling speed and question difficulty. No names are recorded: answers, battles, level-ups and rewards only, under a scrambled id.')),
      seg([[true, 'On'], [false, 'Off']], fam.shareData !== false, async (v) => { fam.shareData = v; await renameFamily(fam.id); rerender(); })),
    h('div.setting', h('div', h('label', 'Play data on this device'), h('div.help', `${playdataCount()} events recorded. Export a file to send to the game’s maker.`)),
      h('button.btn.small.secondary', { onclick: async () => { flushPlaydata(); await saveFile(`math-wizard-playdata-${new Date().toISOString().slice(0, 10)}.json`, exportPlaydata()); } }, 'Export play data')),
    h('div.setting', h('div', h('label', 'Delete this family'), h('div.help', 'Removes the family and all of its wizards, here and online. This cannot be undone.')),
      h('button.btn.red.small', { onclick: async () => { if (await ask(`Delete ${fam.name} and all of its wizards? This cannot be undone.`, { yes: 'Delete forever', danger: true })) { await deleteFamily(fam.id); closeFamily(); onExit(); } } }, 'Delete family')),
    h('p.muted', { style: { textAlign: 'right' } }, `Game version ${GAME_VERSION}`));
}

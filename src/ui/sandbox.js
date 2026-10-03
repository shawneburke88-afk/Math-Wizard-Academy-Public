// 🧪 Sandbox (Grown-ups zone): build a test wizard at any point in the game, to try the balance and plan.
// Choose grade, levels, team pets, gear, skill tiers and which areas are complete, reveal the whole map, then play.
// The sandbox wizard is separate from the kids (one per family, rebuilt each time) and its play data is tagged as test.
import { h, clearUI, mount, toast } from './dom.js';
import { profiles, createProfile, deleteProfile, persist } from '../core/save.js';
import { SPECIES, CLASSES, stageForLevel } from '../content/species.js';
import { makeItem } from '../content/items.js';
import { FEATURES, W, H, objectivesFor, areaById } from '../content/world.js';
import { skillsFor } from '../content/curriculum.js';
import { newPet, addPet, fullStats, REGIONS } from '../game/progress.js';
import { sfx } from '../core/sfx.js';

const KEY = 'mwa-sandbox-v1';
const REGION_NAME = { number: 'Starfall', patterns: 'Tanglewood', shape: 'Stoneworks', stats: 'Stormcoast' };
const defaults = () => ({ grade: 3, teamLevel: 10, wizardLevel: 6, pets: [['numberling', 1, false], ['factsprite', 1, false], ['counter', 1, false]], gear: 'typical', tier: 2, done: { number: 2, patterns: 0, shape: 0, stats: 0 }, reveal: true });
const load = () => { try { return { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return defaults(); } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } };

// Gear presets: [slot, rarity] (levels follow the team's level).
const GEAR = {
  none: [],
  typical: [['wand', 'uncommon'], ['hat', 'common'], ['robe', 'uncommon'], ['boots', 'common'], ['amulet', 'uncommon'], ['charm', 'common']],
  strong: [['wand', 'rare'], ['hat', 'uncommon'], ['robe', 'rare'], ['boots', 'uncommon'], ['amulet', 'epic'], ['charm', 'rare']],
};

export function showSandbox({ onPlay, onBack }) {
  const s = load();
  const render = () => {
    save(s);
    clearUI();
    const seg = (opts, value, pick) => h('div.seg', ...opts.map(([v, label]) => h('button.choice-chip' + (v === value ? '.sel' : ''), { onclick: () => { pick(v); sfx.tap(); render(); } }, label)));
    const slider = (min, max, value, pick) => h('div.row', { style: { gap: '10px', alignItems: 'center' } },
      h('input', { type: 'range', min, max, value, style: { flex: 1 }, oninput: (e) => { pick(Number(e.target.value)); e.target.nextSibling.textContent = e.target.value; } , onchange: () => save(s) }), h('b', { style: { minWidth: '2.5em' } }, String(value)));
    const speciesOpts = Object.keys(SPECIES).sort((a, b) => SPECIES[a].cls - SPECIES[b].cls || SPECIES[a].names[0].localeCompare(SPECIES[b].names[0]));
    const petRow = (i) => {
      const [sp, stage, rare] = s.pets[i];
      const natural = stageForLevel(sp, s.teamLevel);
      return h('div.sb-pet',
        h('select', { onchange: (e) => { s.pets[i][0] = e.target.value; render(); } }, ...speciesOpts.map((k) => h('option', { value: k, selected: k === sp }, `${SPECIES[k].names[0]} (${CLASSES[SPECIES[k].cls].name})`))),
        h('select', { onchange: (e) => { s.pets[i][1] = Number(e.target.value); render(); } },
          h('option', { value: 1, selected: stage === 1 }, `Stage: natural (${natural})`), h('option', { value: 2, selected: stage === 2 }, 'Evolved (stage 2)'), h('option', { value: 3, selected: stage === 3 }, 'Fully evolved (stage 3)')),
        h('label', h('input', { type: 'checkbox', checked: rare, onchange: (e) => { s.pets[i][2] = e.target.checked; save(s); } }), ' ★ rare'));
    };
    // Areas complete: a row per strand; tapping area N marks areas 1..N complete (tap the last one again to undo it).
    const grid = h('div.sb-grid', h('div'), ...[1, 2, 3, 4].map((d) => h('div.sb-head', `Area ${d}`)),
      ...REGIONS.flatMap((r) => [h('div.sb-row', REGION_NAME[r]), ...[1, 2, 3, 4].map((d) => h('button.sb-cell' + (s.done[r] >= d ? '.on' : ''), {
        title: areaById(`${r}-${d}`).name,
        onclick: () => { s.done[r] = s.done[r] === d ? d - 1 : d; sfx.tap(); render(); },
      }, s.done[r] >= d ? '✓' : ''))]));
    const allArea2 = REGIONS.every((r) => s.done[r] >= 2);
    mount(h('div.screen.parent.sandbox',
      h('div.row', { style: { justifyContent: 'space-between' } }, h('h1', '🧪 Sandbox'), h('button.btn.secondary', { onclick: onBack }, '← Grown-ups')),
      h('p.muted', 'Build a test wizard anywhere in the game to try the balance. It is separate from your kids, its play data is marked as test data, and it is rebuilt every time you start.'),
      h('section', h('h2', 'Grade'), seg([1, 2, 3, 4, 5, 6].map((g) => [g, `Grade ${g}`]), s.grade, (v) => { s.grade = v; })),
      h('section', h('h2', 'Levels'),
        h('label.f-label', 'Team pets level'), slider(1, 40, s.teamLevel, (v) => { s.teamLevel = v; }),
        h('label.f-label', 'Wizard level'), slider(1, 30, s.wizardLevel, (v) => { s.wizardLevel = v; })),
      h('section', h('h2', 'Team'), petRow(0), petRow(1), petRow(2)),
      h('section', h('h2', 'Gear'), seg([['none', 'None'], ['typical', 'Typical'], ['strong', 'Strong']], s.gear, (v) => { s.gear = v; }),
        h('p.muted', 'Typical: a mix of Common and Uncommon. Strong: Rare pieces and an Epic amulet. Item levels match the team level. A charm goes on the first pet.')),
      h('section', h('h2', 'Math skill tier (all skills)'), seg([1, 2, 3, 4, 5].map((t) => [t, `Tier ${t}`]), s.tier, (v) => { s.tier = v; }),
        h('p.muted', 'Also decides which pet classes appear. Zone caps still apply: Tier 4 needs area 3 reached in that strand, Tier 5 needs area 4.')),
      h('section', h('h2', 'Areas complete'), grid,
        h('p.muted', allArea2 ? 'Area 2 is done everywhere, so every Mini Guardian (the door to area 3) is awake.' : 'The Mini Guardians at the door to area 3 wake once area 2 is complete in every strand (you can still mark areas complete here). Marking area 4 complete also marks its Guardian (the final boss) beaten. The first area you enter in an untouched tier sets that tier’s levels from your team level.')),
      h('section', h('h2', 'Map'), h('label', h('input', { type: 'checkbox', checked: s.reveal, onchange: (e) => { s.reveal = e.target.checked; save(s); } }), ' Reveal the whole map'),
        h('p.muted', 'In the sandbox, tap anywhere on the World Map to jump there.')),
      h('div.center', { style: { margin: '20px 0 40px' } }, h('button.btn.green', { onclick: () => { const p = build(s); toast('Sandbox wizard ready!'); onPlay(p); } }, 'Start sandbox ▸'))));
  };
  render();
}

/** (Re)build the family's sandbox wizard from the chosen settings. */
function build(s) {
  for (const old of profiles().filter((p) => p.sandbox)) deleteProfile(old.id);
  const P = createProfile({ name: '🧪 Sandbox', grade: s.grade, look: { skin: 1, hair: 0, hairColor: 0, robe: 3, hat: 0, hatColor: 3 }, starter: s.pets[0][0] });
  Object.assign(P, { sandbox: true, test: true, coins: 500 });
  P.settings.tips = false;
  P.wizard = { level: s.wizardLevel, xp: 0 };
  // Team
  for (const [sp, stage, rare] of s.pets) {
    const pet = newPet(sp, s.teamLevel, { rare, stage: Math.max(stage, stageForLevel(sp, s.teamLevel)) });
    pet.stage = Math.max(stage, stageForLevel(sp, s.teamLevel));
    addPet(P, pet);
  }
  // Gear
  const rand = Math.random;
  for (const [slot, rarity] of GEAR[s.gear]) {
    const it = makeItem(rarity, s.teamLevel, rand, null, slot);
    P.items.push(it);
    if (slot === 'charm') P.pets[0].charm = it.id; else P.equipped[slot] = it.id;
  }
  // Skill tiers
  for (const sk of skillsFor(P)) P.skills[sk.id] = { tier: s.tier, hist: [], total: 0, correct: 0, hints: 0, mastered: false, topDays: [], drops: 0, last: 0 };
  // Areas complete: quests done, trainer, chest, Challenge or Mini Guardian (and, in area 4, the Guardian) beaten. Finished tiers take the team's level.
  P.strandAnchor = {};
  P.discovered ||= {};
  for (const r of REGIONS) {
    for (let d = 1; d <= s.done[r]; d++) {
      const id = `${r}-${d}`, f = FEATURES[id];
      const st = (P.areas[id] = { obj: {}, baseline: null, guardian: d === 4, visited: true });
      for (const o of objectivesFor(id)) if (o.need) st.obj[o.id] = o.need;
      for (const t of f.trainers) P.beaten[t.id] = true;
      for (const c of f.chests) { P.opened[c.id] = true; P.discovered[c.id] = true; }
      if (f.keeper) P.beaten[f.keeper.id] = true;
    }
    if (s.done[r] >= 1) P.strandAnchor[r] = s.teamLevel;
    if (s.done[r] >= 3) P.strandAnchor[`${r}:deep`] = s.teamLevel;
  }
  // Map
  if (s.reveal) { const bits = new Uint8Array(Math.ceil((W * H) / 8)).fill(255); let bin = ''; for (const b of bits) bin += String.fromCharCode(b); P.fog = btoa(bin); }
  for (const p of P.pets) p.hp = fullStats(P, p).maxHp;   // full health, gear included
  persist();
  return P;
}

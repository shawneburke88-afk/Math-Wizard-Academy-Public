// World HUD and menus: team, bag, quests, pet book, map/fast travel, dialogs, celebrations, evolution trials.
import { h, svgEl, mount, modal, toast, sleep } from './dom.js';
import { wizardSVG, npcSVG } from '../art/wizard.js';
import { creatureSVG } from '../art/creatures.js';
import { itemSVG } from '../art/items.js';
import { SPECIES, ELEMENTS, CLASSES, ROLES, speciesName, xpToNext, evolveLevel, strongAgainst, weakAgainst, MAX_RANK, mergeCost, stars, rankBoost } from '../content/species.js';
import { skillTree } from '../content/abilities.js';
import { RARITY_INFO, WIZARD_SLOTS, statLabel, equippedBonus, itemPrice } from '../content/items.js';
import { AREAS, areaById, areaAt, guardianWakeCount, depthLabel, FEATURES, W as MAP_W, H as MAP_H } from '../content/world.js';
import { STRANDS, BIG_IDEAS, skillsForSpecies, makeQuestion } from '../content/curriculum.js';
import { recordAnswer, skillState } from '../core/adaptive.js';
import { askQuestion } from './question.js';
import { track } from '../core/telemetry.js';
import { matchups } from './petinfo.js';
import { teamPets, getPet, fullStats, readyToEvolve, evolve, objectiveProgress, guardianAwake, keeperAwake, REGIONS, area2Done, autoRead, TEAM_MAX, mergeCandidates, canMerge, mergePets, evolveFee, mergeFee, canAffordEvolve, canAffordMerge } from '../game/progress.js';
import { ask } from './dom.js';
import { persist } from '../core/save.js';
import { speak, stop } from '../core/speech.js';
import { sfx } from '../core/sfx.js';
import { audioPanel } from './audiocontrol.js';

let hudEl = null;

export function showHud(profile, actions) {
  hideHud();
  const me = h('div.hud-me', { onclick: () => actions.openMenu() },
    svgEl(wizardSVG(profile.look, { facing: 'down' }), 'mini'),
    h('div', h('div.nm', profile.name), h('div.lv', `Wizard Lv ${profile.wizard.level} · `, h('span.coins', { title: 'What coins are for', onclick: (ev) => { ev.stopPropagation(); sfx.tap(); actions.openCoins?.(); } }, `🪙 ${profile.coins}`))));
  const btn = (icon, label, fn, badge) => h('button.icon-btn', { onclick: () => { sfx.tap(); fn(); } }, icon, h('span', label), badge);
  const evolveReady = profile.pets.some((p) => (readyToEvolve(p) && canAffordEvolve(profile, p)) || (profile.team.includes(p.id) && canMerge(profile, p) && canAffordMerge(profile, p)));
  hudEl = h('div.hud-top',
    me,
    h('div.hud-buttons',
      btn('🐾', 'Team', actions.openTeam, evolveReady ? h('div.ready-evolve', { style: { top: '-6px', right: '-6px' } }, '!') : null),
      btn('🎒', 'Bag', actions.openBag),
      btn('📜', 'Quests', actions.openQuests),
      btn('🎓', 'Academy', actions.openAcademy),
      btn('📖', 'Pet Book', actions.openBook),
      btn('🗺️', 'Map', actions.openMap)));
  mount(hudEl);
  return hudEl;
}
export function hideHud() { hudEl?.remove(); hudEl = null; document.querySelector('.quest-tracker')?.remove(); }

export function showQuestTracker(profile, areaId) {
  document.querySelector('.quest-tracker')?.remove();
  const a = areaById(areaId);
  if (!a || a.level === 0) return;
  const objs = objectiveProgress(profile, areaId).filter((o) => !o.side);
  const next = objs.filter((o) => !o.done).slice(0, 2);
  mount(h('div.quest-tracker', h('b', `${a.name} · ${objs.filter((o) => o.done).length}/${objs.length}`),
    ...next.map((o) => h('div', `• ${o.text} (${o.count}/${o.need})`))));
}

// ---------- dialog ----------
export function dialog({ who, portrait, text, choices = [{ label: 'OK', value: true }], read = false }) {
  return new Promise((resolve) => {
    const el = h('div.dialog',
      portrait ? svgEl(portrait, 'portrait') : null,
      h('div.who', who || ''),
      h('div.say', text),
      h('div.actions', h('button.speak-btn', { onclick: () => speak(text) }, '🔊'),
        ...choices.map((c) => h('button.btn' + (c.style ? '.' + c.style : ''), { onclick: () => { stop(); el.remove(); resolve(c.value); } }, c.label))));
    mount(el);
    if (read) speak(text);
  });
}

export async function talk(profile, who, kind, lines, choices) {
  let result = true;
  for (let i = 0; i < lines.length; i++) {
    const last = i === lines.length - 1;
    result = await dialog({ who, portrait: kind ? npcSVG(kind, { facing: 'down' }) : null, text: lines[i], choices: last && choices ? choices : [{ label: last ? 'OK' : 'Next ▸', value: true }], read: autoRead(profile) });
  }
  return result;
}

// ---------- celebration ----------
export function celebrate({ title, sub, art, items = [], button = 'Yay!' }) {
  return new Promise((resolve) => {
    const el = h('div.celebrate', art ? svgEl(art, 'art glow') : null, h('h1', title), sub ? h('div', { style: { fontSize: '22px', fontWeight: 800, maxWidth: '640px' } }, sub) : null,
      items.length ? h('div.loot', ...items.map(itemCard)) : null,
      h('button.btn', { style: { marginTop: '14px' }, onclick: () => { el.remove(); resolve(); } }, button));
    mount(el);
  });
}

export function itemCard(it, onclick) {
  const info = RARITY_INFO[it.rarity];
  return h('button.item', { onclick, style: { boxShadow: `0 4px 0 ${info.color}` } },
    svgEl(itemSVG(it.slot, it.rarity, it.seed)),
    h('div.nm.rarity-' + it.rarity, it.name),
    h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#5b4f73' } }, Object.entries(it.stats).map(([k, v]) => `+${v} ${statLabel(k)}`).join(' · ')));
}

// ---------- team ----------
export function openTeam(profile, { onChange }) {
  const m = modal('Your Pets');
  const render = () => {
    const team = new Set(profile.team);
    const sorted = [...profile.pets].sort((a, b) => (team.has(b.id) - team.has(a.id)) || b.level - a.level);
    m.body.replaceChildren(
      h('p.muted', { style: { marginTop: 0 } }, `Your team (gold outline) battles with you. Up to ${TEAM_MAX} pets. Tap a pet for details.`),
      h('div.pet-grid', ...sorted.map((pet) => petCard(profile, pet, () => petDetail(profile, pet, () => { render(); onChange?.(); })))));
  };
  render();
}

function petCard(profile, pet, onclick) {
  const st = fullStats(profile, pet);
  const sp = SPECIES[pet.species];
  return h('button.pet-card' + (profile.team.includes(pet.id) ? '.team' : ''), { onclick },
    readyToEvolve(pet) && canAffordEvolve(profile, pet) ? h('div.ready-evolve', 'Evolve!') : canMerge(profile, pet) && canAffordMerge(profile, pet) ? h('div.ready-evolve', 'Merge!') : null,
    (pet.rank || 1) > 1 ? h('div.star-badge', stars(pet.rank)) : null,
    svgEl(creatureSVG(pet.species, pet.stage, { variant: pet.rare ? 'rare' : 'normal' }), 'art'),
    h('div.nm', speciesName(pet), pet.rare ? ' ✦' : ''),
    h('div.sub', `${ELEMENTS[sp.element].icon} Lv ${pet.level}`),
    h('div.bar', h('i', { style: { width: `${(pet.hp / st.maxHp) * 100}%` } })));
}

function petDetail(profile, pet, onDone) {
  const m = modal(speciesName(pet), { onClose: onDone });
  const render = () => {
    const sp = SPECIES[pet.species];
    const st = fullStats(profile, pet);
    const skills = skillsForSpecies(profile, pet.species, sp);
    const inTeam = profile.team.includes(pet.id);
    const charm = pet.charm && profile.items.find((i) => i.id === pet.charm);
    const ready = readyToEvolve(pet);
    m.body.replaceChildren(h('div.pet-detail',
      h('div', svgEl(creatureSVG(pet.species, pet.stage, { variant: pet.rare ? 'rare' : 'normal', mood: 'happy' }), 'big'),
        h('div.row', { style: { justifyContent: 'center', marginTop: '10px' } },
          h('span.pill.el-' + sp.element, `${ELEMENTS[sp.element].icon} ${ELEMENTS[sp.element].name}`),
          h('span.pill', `${ROLES[sp.role].icon} ${ROLES[sp.role].name}`),
          h('span.pill', `${'◆'.repeat(sp.cls)} ${CLASSES[sp.cls].name}`),
          h('span.pill', BIG_IDEAS[sp.family].name)),
        h('p.muted', { style: { textAlign: 'center', fontSize: '14px' } }, ROLES[sp.role].desc),
        matchups(sp)),
      h('div',
        h('div.stat-line', h('span', 'Level'), h('span', pet.level)),
        h('div.bar.xp', h('i', { style: { width: `${Math.min(100, (pet.xp / xpToNext(pet.level)) * 100)}%` } })),
        h('div.stat-line', h('span', 'Health'), h('span', `${Math.ceil(pet.hp)} / ${st.maxHp}`)),
        h('div.stat-line', h('span', 'Power'), h('span', st.power)),
        h('div.stat-line', h('span', 'Ward'), h('span', st.ward)),
        h('div.stat-line', h('span', 'Speed'), h('span', Math.round(st.speed * 10))),
        h('div.stat-line', h('span', 'Stage'), h('span', `${pet.stage} of 3`)),
        h('div.stat-line', h('span', 'Merge stars'), h('span', (pet.rank || 1) > 1 ? `${stars(pet.rank)} (+${Math.round((rankBoost(pet.rank) - 1) * 100)}% strength)` : 'none yet')),
        mergeBox(profile, pet, render),
        h('p', h('b', 'Math skills: '), skills.map((s) => `${s.name} (Tier ${skillState(profile, s.id).tier})`).join(', ') || '—'),
        ready ? h('div.card', { style: { background: '#fff4d8', margin: '10px 0' } },
          h('b', `✦ ${speciesName(pet)} is ready to evolve!`), h('p', { style: { margin: '6px 0' } }, `Pass the Evolution Trial: get 4 of 5 questions right. No timer, and you can try again any time. Evolving costs 🪙 ${evolveFee(pet)}, paid only when you pass.`),
          canAffordEvolve(profile, pet)
            ? h('button.btn.green', { onclick: async () => { m.close(); await evolutionTrial(profile, pet); onDone?.(); } }, `Start Evolution Trial (🪙 ${evolveFee(pet)})`)
            : h('button.btn.secondary', { disabled: true }, `Need 🪙 ${evolveFee(pet)} (you have ${profile.coins}). Win battles for coins!`)) :
          pet.stage < 3 ? h('p.muted', `Evolves at level ${evolveLevel(pet)} after passing an Evolution Trial.`) : h('p.muted', 'Fully evolved!'),
        skillTreeView(pet),
        h('div.row', { style: { marginTop: '10px' } },
          inTeam ? h('button.btn.secondary.small', { disabled: profile.team.length <= 1, onclick: () => { profile.team = profile.team.filter((id) => id !== pet.id); persist(); render(); } }, 'Remove from team')
            : h('button.btn.small', { disabled: profile.team.length >= TEAM_MAX, onclick: () => { profile.team.push(pet.id); persist(); render(); } }, profile.team.length >= TEAM_MAX ? 'Team is full' : 'Add to team'),
          inTeam && profile.team[0] !== pet.id ? h('button.btn.secondary.small', { onclick: () => { profile.team = [pet.id, ...profile.team.filter((id) => id !== pet.id)]; persist(); render(); } }, 'Make leader') : null),
        h('h3', 'Charm'),
        charm ? h('div.row', itemCard(charm), h('button.btn.secondary.small', { onclick: () => { pet.charm = null; persist(); render(); } }, 'Take off')) :
          h('div', h('p.muted', 'No charm. Charms from your bag give this pet a boost.'),
            h('div.item-grid', ...profile.items.filter((i) => i.slot === 'charm' && !profile.pets.some((p) => p.charm === i.id)).map((it) => itemCard(it, () => { pet.charm = it.id; persist(); render(); })))))));
  };
  render();
}

export async function evolutionTrial(profile, pet) {
  const sp = SPECIES[pet.species];
  if (!canAffordEvolve(profile, pet)) { await dialog({ who: 'Evolution Trial', portrait: creatureSVG(pet.species, pet.stage, {}), text: `Evolving ${speciesName(pet)} costs 🪙 ${evolveFee(pet)}, and you have ${profile.coins}. Win some battles for coins, then come back!`, choices: [{ label: 'OK', value: true }], read: autoRead(profile) }); return; }
  const cands = skillsForSpecies(profile, pet.species, sp);
  // The game picks the species' least-developed skill.
  const skill = [...cands].sort((a, b) => skillState(profile, a.id).tier - skillState(profile, b.id).tier)[0];
  await dialog({ who: 'Evolution Trial', portrait: creatureSVG(pet.species, pet.stage, {}), text: `Help ${speciesName(pet)} evolve! Answer 5 questions about "${skill.name}". Get 4 right to pass.`, choices: [{ label: "Let's go!", value: true }], read: autoRead(profile) });
  let right = 0;
  for (let i = 0; i < 5; i++) {
    const qi = makeQuestion(profile, { skillId: skill.id, mode: 'trial' });
    const res = await askQuestion(qi, { autoRead: autoRead(profile), profile, title: `Evolution Trial · Question ${i + 1} of 5 · ${right} right` });
    const ok = res.correct && !res.hinted;
    if (ok) right++;
    recordAnswer(profile, skill.id, res.correct, { mode: 'trial', tier: qi.tier, hinted: res.hinted });
    if (right >= 4 || right + (4 - i) < 4) break;
  }
  persist();
  if (right >= 4) {
    const oldName = speciesName(pet);
    sfx.levelUp();
    evolve(profile, pet);
    persist();
    const newMoves = skillTree(sp).filter((a) => a.stage === pet.stage && a.level <= pet.level).map((a) => a.name);
    await celebrate({ title: `${oldName} evolved into ${speciesName(pet)}!`, sub: newMoves.length ? `New move: ${newMoves.join(', ')}! Check its skill tree for more.` : 'Check its skill tree to see its new moves!', art: creatureSVG(pet.species, pet.stage, { variant: pet.rare ? 'rare' : 'normal', mood: 'happy' }), button: 'Amazing!' });
  } else {
    await dialog({ who: 'Evolution Trial', portrait: creatureSVG(pet.species, pet.stage, { mood: 'happy' }), text: `Not yet, but ${speciesName(pet)} is proud of you! Practise "${skill.name}" in battles and try again any time.`, choices: [{ label: 'OK', value: true }], read: autoRead(profile) });
  }
}

// ---------- bag ----------
export function openBag(profile, { onChange }) {
  const m = modal('Your Bag');
  const render = () => {
    const bonus = equippedBonus(profile);
    const eqIds = new Set(Object.values(profile.equipped));
    const charmIds = new Set(profile.pets.map((p) => p.charm).filter(Boolean));
    m.body.replaceChildren(
      h('div.slots', ...WIZARD_SLOTS.map((slot) => {
        const it = profile.items.find((i) => i.id === profile.equipped[slot]);
        return h('div.slot', h('div.lbl', slot), it ? svgEl(itemSVG(it.slot, it.rarity, it.seed)) : h('div', { style: { height: '56px', opacity: 0.3, fontSize: '36px' } }, '＋'),
          it ? h('div', { style: { fontSize: '11px', fontWeight: 800 }, class: 'rarity-' + it.rarity }, it.name) : null);
      })),
      h('p', h('b', 'Gear bonus for all pets: '), Object.entries(bonus).filter(([, v]) => v).map(([k, v]) => `+${+v.toFixed(2)} ${statLabel(k)}`).join(' · ') || 'none yet'),
      h('p.muted', 'Tap an item to wear it. Charms go on pets (open Team → a pet).'),
      profile.items.length ? h('div.item-grid', ...profile.items.slice().sort((a, b) => Object.keys(RARITY_INFO).indexOf(b.rarity) - Object.keys(RARITY_INFO).indexOf(a.rarity)).map((it) => {
        const card = itemCard(it, () => {
          if (it.slot === 'charm') { toast('Charms are worn by pets: open Team and choose a pet.'); return; }
          profile.equipped[it.slot] = profile.equipped[it.slot] === it.id ? null : it.id;
          persist(); render(); onChange?.();
        });
        if (eqIds.has(it.id) || charmIds.has(it.id)) card.classList.add('equipped');
        return card;
      })) : h('p', 'Your bag is empty. Win battles and open challenge chests to find items!'));
  };
  render();
}

// ---------- coins ----------
/** Tap the coin count in the HUD: everything coins can buy, with today's prices, and where coins come from. */
export function openCoins(profile) {
  const m = modal('Your coins', { wide: false });
  const row = (icon, title, text) => h('div.coin-use', h('i', icon), h('div', h('b', title), h('p.muted', { style: { margin: '2px 0 0' } }, text)));
  const merges = Array.from({ length: MAX_RANK - 1 }, (_, i) => mergeFee(i + 1)).join(', ');
  m.body.replaceChildren(
    h('p', { style: { marginTop: 0, fontSize: '1.2em' } }, h('b', `You have 🪙 ${profile.coins}`)),
    h('h3', 'What coins are for'),
    row('✦', 'Evolving a pet', `🪙 ${evolveFee({ stage: 1 })} for its first evolution and 🪙 ${evolveFee({ stage: 2 })} for its second. You pay only when you pass the Evolution Trial.`),
    row('★', 'Merging pets', `Merging same-kind pets for a ★ star costs 🪙 ${merges} for stars 2 to ${MAX_RANK}.`),
    row('🛒', 'Gear at Gideon’s Shop', 'Wands, hats, robes, boots and amulets, in Academy Town. New gear arrives every visit.'),
    h('h3', 'How to earn coins'),
    h('p.muted', { style: { marginTop: 0 } }, 'Win battles against wild pets, trainers, Challenges and Guardians, and open treasure chests and mental math chests.'));
}

// ---------- shop ----------
export function openShop(profile, stock, { onChange }) {
  const m = modal('Gideon’s Shop');
  const render = () => {
    m.body.replaceChildren(h('p', h('b', `You have 🪙 ${profile.coins}`), ` · Coins also pay for evolving (🪙 ${evolveFee({ stage: 1 })} / ${evolveFee({ stage: 2 })}) and merging pets, so save some!`),
      h('div.item-grid', ...stock.map((it) => {
        const price = itemPrice(it);
        const card = itemCard(it, () => {
          if (profile.coins < price) { toast('Not enough coins yet!'); return; }
          track('buy', { rar: it.rarity, slot: it.slot, lv: it.level, price }); profile.coins -= price; profile.items.push(it); stock.splice(stock.indexOf(it), 1); sfx.chest(); persist(); render(); onChange?.();
          toast(`You bought ${it.name}!`);
        });
        card.appendChild(h('div', { style: { fontWeight: 900, marginTop: '4px' } }, `🪙 ${price}`));
        return card;
      })));
  };
  render();
}

// ---------- quests ----------
export function openQuests(profile, currentAreaId) {
  const m = modal('Quest Book');
  const areaIds = AREAS.filter((a) => a.level > 0 && (profile.areas[a.id]?.visited || a.id === currentAreaId)).map((a) => a.id);
  let sel = areaIds.includes(currentAreaId) ? currentAreaId : areaIds[0];
  const render = () => {
    if (!sel) { m.body.replaceChildren(h('p', 'Explore a region to find quests! Walk out of the Academy in any direction.')); return; }
    const a = areaById(sel);
    const objs = objectiveProgress(profile, sel);
    const awake = guardianAwake(profile, sel);
    m.body.replaceChildren(
      h('div.tabs', ...areaIds.map((id) => h('button.choice-chip' + (id === sel ? '.sel' : ''), { onclick: () => { sel = id; render(); } }, areaById(id).name))),
      h('h3', `${a.name} (${depthLabel(a)})`),
      ...objs.map((o) => h('div.quest' + (o.done ? '.done' : '') + (o.learning ? '.learning' : ''),
        h('div.check', o.done ? '✓' : ''), h('div.qt', o.text, o.side ? h('span.pill', { style: { marginLeft: '6px' } }, 'bonus') : null), h('div.qp', `${o.count}/${o.need}`))),
      objs.some((o) => o.guardian) ? h('p.muted', awake ? '✦ The Guardian is awake! Find its shrine at the far end of this area. It is the final battle of the region.' : `Complete ${guardianWakeCount(sel)} goals (including the wild pets goal) to wake the Guardian, the final boss of this region.`) : null,
      objs.some((o) => o.keeper && !o.done) ? h('p.muted', keeperAwake(profile, sel) ? (a.level === 2 ? '🛡️ The Mini Guardian is ready! Find it on the path to area 3.' : '⚔ The Challenge is ready! Find it on the path to the next area.')
        : awake && a.level === 2 ? `Quests done! The Mini Guardian wakes once you finish area 2 in every region: ${REGIONS.map((r) => `${area2Done(profile, r) ? '✓' : '✗'} ${AREAS.find((x) => x.id === r + '-1').name}`).join(' · ')}.`
        : `Complete ${guardianWakeCount(sel)} goals (including the wild pets goal) and the ${a.level === 2 ? 'Mini Guardian' : 'Challenge'} guarding the next area will battle you.`) : null);
  };
  render();
}

// ---------- pet book ----------
export function openBook(profile) {
  const m = modal('Pet Book');
  const owned = new Set(profile.pets.map((p) => p.species));
  const sections = Object.entries(STRANDS).map(([strandId, st]) => {
    const fams = Object.entries(BIG_IDEAS).filter(([, b]) => b.strand === strandId);
    return h('div', h('h3', `${ELEMENTS[st.element].icon} ${st.name}`),
      ...fams.map(([famId, fam]) => h('div', h('div.muted', { style: { fontWeight: 800, margin: '4px 0 6px' } }, fam.name),
        h('div.pet-grid', ...Object.values(SPECIES).filter((s) => s.family === famId).map((s) => {
          const has = owned.has(s.id), seen = profile.seen[s.id];
          const best = profile.pets.filter((p) => p.species === s.id).reduce((m, p) => Math.max(m, p.stage), 1);
          return h('div.pet-card', { style: { cursor: 'default' } },
            h('div.art', { style: { filter: has ? 'none' : seen ? 'grayscale(1) opacity(.6)' : 'brightness(0) opacity(.25)' }, html: creatureSVG(s.id, has ? best : 1, {}) }),
            h('div.nm', has || seen ? s.names[has ? best - 1 : 0] : '???'),
            h('div.sub', `${'◆'.repeat(s.cls)} ${CLASSES[s.cls].name}`),
            h('div.sub', has ? `Befriended ×${profile.pets.filter((p) => p.species === s.id).length}` : seen ? 'Seen' : s.cls > 1 ? `Appears at ${STRANDS[s.strand].name} tier ${Math.ceil(CLASSES[s.cls].unlock)}` : 'Not found yet'));
        })))));
  });
  m.body.replaceChildren(h('p.muted', { style: { marginTop: 0 } }, `Befriended ${owned.size} of ${Object.keys(SPECIES).length} kinds of pets. Each pet family matches a part of the math curriculum!`), ...sections);
}

// ---------- map / fast travel ----------
export function openMap(profile, scene, { atPortal, onTravel }) {
  const m = modal(atPortal ? 'Portal: where to?' : 'World Map');
  const canvas = scene?.minimapCanvas?.();
  const pos = profile.pos || {};
  const mapBox = h('div.map-view', { style: { aspectRatio: `${MAP_W} / ${MAP_H}` } }, canvas || h('div'));
  const at = (x, y) => ({ left: `${(x / MAP_W) * 100}%`, top: `${(y / MAP_H) * 100}%` });
  let legend = null;
  if (canvas) {
    const marks = scene.minimapMarkers?.() || [];
    // Place names: explored areas in full, the rest faded until you get there. Each label goes where it covers the
    // fewest map symbols (centre first, then a little above or below).
    for (const a of AREAS) {
      const been = a.level === 0 || profile.areas[a.id]?.visited;
      const name = a.level === 0 ? 'Academy Town' : a.name;
      const cx = (a.x0 + a.x1 + 1) / 2, cy = (a.y0 + a.y1 + 1) / 2;
      const sub = a.level === 1 ? STRANDS[a.region].name : a.level > 1 ? `Area ${a.level} of 4` : '';
      const bw = Math.min(a.x1 - a.x0 + 3, Math.max(name.length * 0.95, sub.length * 0.62) + 2) / 2, bh = a.x1 - a.x0 < 16 ? 3.2 : 2;
      const spots = a.level === 0 ? [a.y0 + 1.2] : [cy, cy - 3, cy + 3, cy - 6, cy + 6].filter((y) => y - bh > a.y0 && y + bh < a.y1 + 1);
      const cost = (y) => marks.reduce((n, mk) => n + (Math.abs(mk.x - cx) < bw + 0.8 && Math.abs(mk.y - y) < bh + 0.8 ? (mk.kind === 'portal' ? 3 : 1) : 0), 0);   // never hide a portal
      const ly = spots.reduce((best, y) => (cost(y) < cost(best) ? y : best), spots[0] ?? cy);
      mapBox.appendChild(h('div.map-label' + (been ? '' : '.faded'), { style: { ...at(cx, ly), maxWidth: `${((a.x1 - a.x0 + 3) / MAP_W) * 100}%` } },
        h('b', name), sub ? h('small', sub) : null));
    }
    const kinds = new Set();
    for (const mk of marks) {
      const k = MAP_KEY[mk.kind]; if (!k) continue;
      kinds.add(mk.kind);
      const go = mk.kind === 'portal' && onTravel && (mk.area === 'hub' || profile.portals?.[mk.area]);
      mapBox.appendChild(h('div.map-mark.' + mk.kind + (go ? '.go' : ''), { style: at(mk.x, mk.y), title: mk.label, ...(go ? { onclick: (ev) => { ev.stopPropagation(); m.close(); onTravel(mk.area); } } : {}) }, k.icon));
    }
    const me = scene.tx != null ? { x: scene.tx, y: scene.ty } : pos;
    if (me.x != null) mapBox.appendChild(h('div.map-pin.me', { style: at(me.x + 0.5, me.y + 0.5) }, '🧙'));
    kinds.add('me');
    // Sandbox: tap anywhere on the map to jump there (the nearest open tile).
    if (profile.sandbox && scene?.teleport) {
      mapBox.style.cursor = 'crosshair';
      mapBox.addEventListener('click', (ev) => {
        const r = mapBox.getBoundingClientRect();
        const tx = Math.floor(((ev.clientX - r.left) / r.width) * MAP_W), ty = Math.floor(((ev.clientY - r.top) / r.height) * MAP_H);
        for (let rad = 0; rad < 12; rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad || scene.blocked(tx + dx, ty + dy)) continue;
          m.close(); scene.teleport(tx + dx, ty + dy); toast(`🧪 Jumped to ${areaAt(tx + dx, ty + dy)?.name || 'the map'}`); return;
        }
        toast('No open ground there.');
      });
    }
    legend = h('div.map-legend', ...Object.entries(MAP_KEY).filter(([k]) => kinds.has(k)).map(([, k]) => h('span', h('i', k.icon), k.text)));
  }
  // Travel to Academy Town or any area whose portal has been found, grouped by region.
  const goBtn = (id, name) => h('button.btn.purple', { onclick: () => { m.close(); onTravel(id); } }, name);
  const groups = Object.keys(STRANDS).map((r) => [r, AREAS.filter((a) => a.region === r && a.level > 0 && profile.portals?.[a.id] && areaHasCamp(a.id))]).filter(([, list]) => list.length);
  const help = h('p.muted', 'Every area has a glowing 🌀 portal. Walk up to one to find it. Step on it to heal your pets, and after that you can travel to it from this map. Tap a portal on the map or a button below.');
  m.body.replaceChildren(onTravel ? h('p', { style: { margin: '0 0 8px', fontWeight: 800 } }, '🌀 Tap a glowing portal on the map to travel there, or use the buttons under the map.') : null, mapBox, legend,
    onTravel ? h('div', h('h3', 'Travel to a portal you have found:'),
      h('div.row', goBtn('hub', 'Academy Town')),
      ...groups.map(([r, list]) => h('div', h('small.muted', STRANDS[r].name), h('div.row', ...list.map((a) => goBtn(a.id, a.name))))),
      groups.length ? null : help, groups.length ? h('p.muted', 'Find the portal in each new area to add it here. Stepping on any portal heals your pets.') : null)
      : help);
}
// World map symbols (the legend lists only the ones on the map right now).
const MAP_KEY = {
  me: { icon: '🧙', text: 'You' },
  portal: { icon: '🌀', text: 'Portal (heals pets, fast travel)' },
  healer: { icon: '❤️', text: 'Healer' },
  shop: { icon: '🛒', text: 'Shop' },
  mental: { icon: '⏱️', text: 'Mental math chest' },
  trainer: { icon: '❗', text: 'Wizard to battle' },
  keeper: { icon: '⚔️', text: 'Challenge (ready)' },
  'keeper-sleep': { icon: '💤', text: 'Challenge (do more quests)' },
  mini: { icon: '🛡️', text: 'Mini Guardian (ready)' },
  'mini-sleep': { icon: '🛡️', text: 'Mini Guardian (sleeping)' },
  guardian: { icon: '👑', text: 'Guardian (final boss)' },
  'guardian-done': { icon: '🏅', text: 'Guardian beaten' },
  gate: { icon: '🔒', text: 'Locked gate' },
  'gate-open': { icon: '🚪', text: 'Open gate' },
};
const areaHasCamp = (id) => !!FEATURES[id]?.camp;

// ---------- menu ----------
export function openMenu(profile, { onExit, onToggleRead, onToggleSound }) {
  const m = modal('Menu', { wide: false });
  const readOn = autoRead(profile);
  m.body.replaceChildren(
    h('div.setting', h('label', '🔊 Read everything aloud'), h('button.btn.small' + (readOn ? '.green' : '.secondary'), { onclick: () => { onToggleRead(!readOn); m.close(); } }, readOn ? 'On' : 'Off')),
    audioPanel(),
    h('p.muted', 'Your progress saves automatically.'),
    h('button.btn.purple', { onclick: () => { m.close(); onExit(); } }, '🏠 Save & go home'));
}

function mergeBox(profile, pet, rerender) {
  const rank = pet.rank || 1;
  if (rank >= MAX_RANK) return h('div.merge-box', h('b', `★ Fully merged! ${stars(rank)}`));
  const need = mergeCost(rank);
  const cands = mergeCandidates(profile, pet);
  const name = SPECIES[pet.species].names[0];
  const pips = Array.from({ length: need }, (_, i) => {
    const c = cands[i];
    return h('div.pip' + (c ? '' : '.missing'), svgEl(creatureSVG(pet.species, c ? c.stage : 1, { variant: c?.rare ? 'rare' : 'normal' }), 'art'), c ? `Lv ${c.level}${(c.rank || 1) > 1 ? ' ' + stars(c.rank) : ''}` : '?');
  });
  const havePets = cands.length >= need, fee = mergeFee(rank), rich = canAffordMerge(profile, pet);
  const ready = havePets && rich;
  return h('div.merge-box',
    h('b', `✦ Merge to ${stars(rank + 1)}`),
    h('div', { style: { fontSize: '14px', fontWeight: 700 } }, !havePets
      ? `You need ${need} more ${name} pets (you have ${cands.length}). Befriend more in the wild!`
      : rich ? `Combine ${need} other ${name} pets into this one for +15% strength. Costs 🪙 ${fee}.`
        : `You have the pets! Merging costs 🪙 ${fee} (you have ${profile.coins}). Win battles for coins.`),
    h('div.pips', ...pips),
    h('button.btn.small' + (ready ? '.green' : '.secondary'), {
      disabled: !ready,
      onclick: async () => {
        const used = cands.slice(0, need);
        const inTeam = used.filter((c) => profile.team.includes(c.id)).length;
        const ok = await ask(`Merge ${need} ${name} pets into ${speciesName(pet)}? They will become part of this pet.${inTeam ? ` (${inTeam} of them are on your team.)` : ''} First, pass a Merge Trial!`, { yes: 'Start Merge Trial' });
        if (!ok) return;
        const passed = await mergeTrial(profile, pet);
        if (!passed) { rerender(); return; }
        mergePets(profile, pet);
        track('merge', { sp: pet.species, rank: pet.rank, lv: pet.level });
        sfx.levelUp();
        rerender();
        celebrate({ title: `${speciesName(pet)} ${stars(pet.rank)}`, sub: `Merged! It is now ${Math.round((rankBoost(pet.rank) - 1) * 100)}% stronger.`, art: creatureSVG(pet.species, pet.stage, { variant: pet.rare ? 'rare' : 'normal', mood: 'happy' }), button: 'Awesome!' });
      },
    }, ready ? `Merge now! (🪙 ${fee})` : havePets ? `Need 🪙 ${fee}` : 'Not enough pets yet'));
}

/** Skill tree: every move this pet learns, by level. Moves for evolution stages it hasn't reached stay hidden. */
function skillTreeView(pet) {
  const sp = SPECIES[pet.species];
  const tree = skillTree(sp);
  const stageBlock = (stage) => {
    const moves = tree.filter((a) => a.stage === stage);
    if (stage > pet.stage) {
      return h('div.tree-stage.locked', h('div.tree-head', `Stage ${stage}: ${sp.names[stage - 1] && stage <= pet.stage ? sp.names[stage - 1] : '???'}`),
        h('div.tree-hidden', `🔒 ${moves.length} secret moves. Evolve to reveal them!`));
    }
    return h('div.tree-stage', h('div.tree-head', `Stage ${stage}: ${sp.names[stage - 1]}`),
      ...moves.map((a) => {
        const have = pet.level >= a.level;
        return h('div.tree-move' + (have ? '.have' : ''),
          h('span.tree-lv', have ? '✓' : `Lv ${a.level}`),
          h('span.tree-name', `${a.icon} ${a.name}`),
          h('span.tree-cost', a.cost ? `${a.cost} magic` : 'Free'),
          h('span.tree-desc', a.desc));
      }));
  };
  return h('div.tree', h('h3', 'Skill tree'), stageBlock(1), stageBlock(2), stageBlock(3));
}

/** Merge Trial: 3 questions on the pet's own math skill. Get 2 right (without a hint) to merge. */
export async function mergeTrial(profile, pet) {
  const sp = SPECIES[pet.species];
  const cands = skillsForSpecies(profile, pet.species, sp);
  const skill = [...cands].sort((a, b) => skillState(profile, a.id).tier - skillState(profile, b.id).tier)[0];
  await dialog({ who: 'Merge Trial', portrait: creatureSVG(pet.species, pet.stage, {}), text: `To merge, answer 3 questions about "${skill.name}". Get 2 right to pass. No pets are lost if you don't pass.`, choices: [{ label: "Let's go!", value: true }], read: autoRead(profile) });
  let right = 0;
  for (let i = 0; i < 3; i++) {
    const qi = makeQuestion(profile, { skillId: skill.id, mode: 'trial' });
    const res = await askQuestion(qi, { autoRead: autoRead(profile), profile, title: `Merge Trial · Question ${i + 1} of 3 · ${right} right` });
    if (res.correct && !res.hinted) right++;
    recordAnswer(profile, skill.id, res.correct, { mode: 'trial', tier: qi.tier, hinted: res.hinted });
    if (right >= 2 || right + (2 - i) < 2) break;
  }
  persist();
  if (right >= 2) return true;
  await dialog({ who: 'Merge Trial', portrait: creatureSVG(pet.species, pet.stage, { mood: 'happy' }), text: `Not this time. Practise "${skill.name}" and try again. Your pets are all still here!`, choices: [{ label: 'OK', value: true }], read: autoRead(profile) });
  return false;
}

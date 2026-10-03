// Post-battle progress screen: XP bars for the wizard and each team pet, level-ups, items (compared with what's equipped), coins, skills and quests.
import { h, svgEl, mount } from './dom.js';
import { wizardSVG } from '../art/wizard.js';
import { creatureSVG } from '../art/creatures.js';
import { itemSVG } from '../art/items.js';
import { xpToNext, speciesName } from '../content/species.js';
import { RARITY_INFO, statLabel, WIZARD_SLOTS } from '../content/items.js';
import { teamPets, readyToEvolve } from '../game/progress.js';
import { persist } from '../core/save.js';
import { sfx } from '../core/sfx.js';
import { tip, say } from './tutorial.js';
import { WIZARD_ABILITIES } from '../content/abilities.js';

import { wizardXpNeeded } from '../game/progress.js';
export const wizardXpToNext = wizardXpNeeded;

/** The region's battlefield art, faded behind the results so it sets the scene without getting busy. */
function regionBackdrop(area) {
  const el = h('div.res-backdrop');
  import('../art/battlefield.js').then(({ battlefieldSVG }) => {
    try { el.innerHTML = battlefieldSVG(area.theme || 'academy', { variant: (area.level || 1) >= 3 ? 1 : 0 }); } catch (e) { /* keep the plain background */ }
  }).catch(() => {});
  return el;
}

// How strong an item is overall (for the ▲ / ▼ comparison).
export function itemScore(it) {
  if (!it) return 0;
  const w = { power: 1, ward: 1, vitality: 0.3, focus: 8, luck: 0.5 };
  return Object.entries(it.stats).reduce((s, [k, v]) => s + (w[k] || 0) * v, 0);
}

function compareToEquipped(profile, it) {
  let current = null;
  if (WIZARD_SLOTS.includes(it.slot)) current = profile.items.find((x) => x.id === profile.equipped[it.slot]);
  else {
    const leader = teamPets(profile)[0];
    current = leader?.charm ? profile.items.find((x) => x.id === leader.charm) : null;
  }
  if (!current) return { cls: 'new', text: `NEW: nothing in this slot yet`, current };
  const d = itemScore(it) - itemScore(current);
  if (Math.abs(d) < 0.5) return { cls: 'same', text: `≈ About the same as your ${current.name}`, current };
  return d > 0 ? { cls: 'up', text: `▲ Stronger than your ${current.name}`, current } : { cls: 'down', text: `▼ Weaker than your ${current.name}`, current };
}

/**
 * opts: { profile, res, title, sub, coins, items: [], quests: [strings], area (for the faded region art behind) }
 * Resolves when the player taps Continue.
 */
export function showResults({ profile, res, title, sub, coins = 0, items = [], quests = [], area = null }) {
  return new Promise((resolve) => {
    const before = res.before || { wizard: profile.wizard, pets: {} };
    const after = res.after || { wizard: profile.wizard, pets: {} };
    const bars = [];

    const card = (art, name, b, a, toNextFn, extra) => {
      const leveled = a.level > b.level;
      const startPct = leveled ? 0 : Math.min(100, (b.xp / toNextFn(b.level)) * 100);
      const endPct = extra?.maxed ? 100 : Math.min(100, (a.xp / toNextFn(a.level)) * 100);
      const bar = h('i', { style: { width: startPct + '%' } });
      bars.push([bar, endPct]);
      const togo = extra?.maxed ? 'Max level' : `${extra?.ready ? '✦ Ready to evolve! Open Team. · ' : ''}${Math.max(0, toNextFn(a.level) - a.xp)} XP to level ${a.level + 1}`;
      return h('div.res-card',
        leveled ? h('div.lvlup', `LEVEL UP! ${a.level}`) : null,
        svgEl(art, 'art'),
        h('div', h('div.nm', name), h('div.lvl', `Level ${a.level}${leveled ? `  (was ${b.level})` : ''}`), h('div.xpbar', bar), h('div.togo', togo)));
    };

    const cards = [card(wizardSVG(profile.look, { facing: 'down' }), `${profile.name} (Wizard)`, before.wizard, after.wizard, wizardXpToNext)];
    for (const pet of teamPets(profile)) {
      const b = before.pets[pet.id] || { level: pet.level, xp: pet.xp };
      const a = after.pets[pet.id] || { level: pet.level, xp: pet.xp };
      cards.push(card(creatureSVG(pet.species, pet.stage, { variant: pet.rare ? 'rare' : 'normal', mood: 'happy' }), speciesName(pet), b, a, xpToNext,
        { ready: readyToEvolve(pet), maxed: pet.level >= 50 }));
    }

    const itemEls = items.map((it) => {
      const cmp = compareToEquipped(profile, it);
      const info = RARITY_INFO[it.rarity];
      const equipBtn = h('button.btn.small' + (cmp.cls === 'up' || cmp.cls === 'new' ? '.green' : '.secondary'), {
        style: { marginTop: '6px' },
        onclick: () => {
          if (WIZARD_SLOTS.includes(it.slot)) profile.equipped[it.slot] = it.id;
          else { const leader = teamPets(profile)[0]; if (leader) leader.charm = it.id; }
          persist(); sfx.chest();
          equipBtn.textContent = '✓ Equipped'; equipBtn.disabled = true;
        },
      }, WIZARD_SLOTS.includes(it.slot) ? 'Equip now' : 'Give to team leader');
      return h('div.res-item', { style: { boxShadow: `0 5px 0 ${info.color}` } },
        svgEl(itemSVG(it.slot, it.rarity, it.seed)),
        h('div', h('div', { style: { fontWeight: 900, fontSize: '15px' }, class: 'rarity-' + it.rarity }, it.name),
          h('div', { style: { fontSize: '12px', fontWeight: 700 } }, `${info.name} ${it.slot} · ` + Object.entries(it.stats).map(([k, v]) => `+${v} ${statLabel(k)}`).join(', ')),
          h('div.cmp.' + cmp.cls, cmp.text), equipBtn));
    });

    const chips = [];
    if (coins) chips.push(h('div.res-chip', `🪙 +${coins} coins`));
    if (res.xp) chips.push(h('div.res-chip', `✨ +${res.xp} XP`));
    for (const pet of res.caughtList || []) chips.push(h('div.res-chip', `🤝 ${speciesName(pet)} joined you!`));
    for (const s of [...new Set(res.tierUps || [])]) chips.push(h('div.res-chip', `⬆ Skill up: ${s}`));
    for (const q of quests) chips.push(h('div.res-chip', `📜 Quest complete: ${q}`));

    const el = h('div.results' + (area ? '.themed.' + (area.theme || 'academy') : ''),
      area ? regionBackdrop(area) : null,
      h('h1', title), sub ? h('div.sub', sub) : null,
      h('div.res-grid', ...cards),
      chips.length ? h('div.res-section', h('div.res-chips', ...chips)) : null,
      itemEls.length ? h('div.res-section', h('h2', items.length > 1 ? 'Items found' : 'Item found'), h('div.res-items', ...itemEls)) : null,
      h('div.center', { style: { marginTop: '18px' } }, h('button.btn', { onclick: () => { el.remove(); resolve(); } }, 'Continue ▸')));
    mount(el);
    requestAnimationFrame(() => setTimeout(() => {
      bars.forEach(([bar, pct]) => { bar.style.width = pct + '%'; });
      if (cards.some((c) => c.querySelector('.lvlup'))) setTimeout(() => sfx.levelUp(), 1100);
    }, 150));
    setTimeout(async () => {
      if (cards.length) await tip(profile, 'results');
      if (items.length) await tip(profile, 'item');
      const unlocked = WIZARD_ABILITIES.filter((a) => a.level > before.wizard.level && a.level <= after.wizard.level);
      if (unlocked.length) await say(profile, 'New wizard ability!', unlocked.map((a) => `You learned ${a.icon} ${a.name}! ${a.desc}${a.replaces ? ` It replaces ${WIZARD_ABILITIES.find((b) => b.id === a.replaces)?.name}.` : ''}`));
    }, 1500);
  });
}

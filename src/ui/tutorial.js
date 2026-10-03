// Tutorial helper: Hoot the owl explains each game element the first time a kid meets it.
// Tips are remembered per profile (profile.tips), can be turned off or replayed from the Grown-ups area.
import { h, svgEl } from './dom.js';
import { creatureSVG } from '../art/creatures.js';
import { speak, stop } from '../core/speech.js';
import { sfx } from '../core/sfx.js';
import { persist } from '../core/save.js';

export const HELPER_NAME = 'Hoot';

// id -> { title, text: string | string[] (pages), highlight?: CSS selector to glow while the tip is open }
export const TIPS = {
  walk: { title: 'Getting around', text: ['Hi, I’m Hoot! I’ll help you learn the ropes.', 'Tap anywhere on the map to walk there. Tap a person or thing to go talk to it.'] },
  hud: { title: 'Your menus', text: 'Up top: 🐾 Team shows your pets, 🎒 Bag holds your items, 📜 Quests lists your goals, 📖 Pet Book tracks every pet you find, and 🗺️ Map shows where you’ve explored.', highlight: '.hud-buttons' },
  fog: { title: 'The mist', text: 'The map is hidden by mist until you explore it. Rare pets and treasure chests hide in the mist. Keep your eyes open!' },
  region: { title: 'Regions and quests', text: ['Each region is one part of math. This one’s pets bring questions about that part of math.', 'Each region has 4 areas, and each one is a bit harder. Finish an area’s quests, then beat the Challenge on the path to reach the next area. A Mini Guardian guards area 3. It wakes once you’ve finished area 2 in every region. The region’s Guardian is the final boss, at the far end of area 4!'], highlight: '.quest-tracker' },
  wild: { title: 'Wild pets', text: 'See that wild pet? Walk into it to start a battle. If you get too close, it will spot you and battle you!' },
  blocker: { title: 'Blocked path!', text: 'Pets with ⚔ are blocking the path. You have to battle them to get past.' },
  trainer: { title: 'Trainers', text: 'Wizards with a ❗ want to battle. They fight with their pets AND cast their own spells. Beating them completes a quest!' },
  tallgrass: { title: 'Tall grass', text: 'Careful! Surprise pets can jump out of tall grass.' },
  discoverPet: { title: 'A rare pet!', text: 'Rare pets have harder questions, a real stretch! Win and the rare pet joins your team at a higher level. Hints are okay, but they lower the reward.' },
  discoverChest: { title: 'A challenge chest!', text: 'Challenge chests are sealed by magic. Answer 2 of 3 hard questions to open one and win great treasure.' },
  portal: { title: 'Portals', text: ['Every area has a glowing portal. Stepping on one heals all your pets!', 'Once you find a portal, you can travel to it from the 🗺️ Map any time. It saves lots of walking!'] },
  gate: { title: 'Rune gates', text: 'This gate is locked. Defeat this area’s Guardian and it will open.' },
  guardian: { title: 'The Guardian', text: 'This shrine holds the region’s Guardian, the final boss. It wakes up when you’ve finished enough quests here.' },
  healer: { title: 'Healing', text: 'If your pets get tired, visit Nurse Maple at the Academy, or step on a glowing portal. Both heal your pets for free!' },

  battle: { title: 'Battle time!', text: ['Your team is on the left, and the other team is on the right.', 'The yellow bar under each health bar is STAMINA. When it fills up, that fighter gets a turn. Faster pets get more turns!', 'Don’t worry: the bars stop while you choose or answer. Take all the time you need.'], highlight: '.u-plate' },
  abilities: { title: 'Choosing an ability', text: 'Pick an ability, then answer a math question to cast it. A right answer makes the spell work AND gives you a magic orb.', highlight: '.bf-actions' },
  magic: { title: 'Magic orbs', text: 'Stronger abilities cost magic orbs. You earn one orb every time you answer correctly.', highlight: '.bf-magic' },
  target: { title: 'Pick a target', text: 'Tap the one you want to aim at. Look for the ▼ arrow. A green “Super effective” tag means that pet is weak to this move!', highlight: '.unit.targetable .u-sprite' },
  elements: { title: 'Strong and weak', text: ['Every pet has an element: ✦ Star, ❦ Vine, ◆ Stone or ϟ Storm.', 'Star beats Storm, Storm beats Vine, Vine beats Stone, and Stone beats Star. Some pets also resist one element. Check a pet’s page in 🐾 Team to see its matchups!'] },
  befriend: { title: 'Make a friend', text: 'That pet is tired enough to trust you! Tap the 🤝 Befriend button under it, then answer the question correctly to add it to your team. The pink mark on a pet’s health bar shows how low it must go. Rare, stronger pets need to be much weaker first.', highlight: '.befriend-badge' },
  merge: { title: 'Merging pets', text: ['Got more than one of the same pet? You can MERGE them into one stronger pet with a ★ star!', 'Open 🐾 Team, tap the pet, and look for Merge. Each new star needs more pets of the same kind.'] },
  evolvedWild: { title: 'Evolved wild pets', text: 'Some wild pets are already evolved! They are stronger, and they only become friends with wizards who have their own pet of that kind at the same stage. Evolve yours first, then come back.' },
  taunt: { title: 'Challenge Roar', text: 'The 🎯 pet is roaring! Attacks on one enemy have to hit it first. Hit it once to break the roar. When YOUR tank roars, the other team has to hit it, and your team does more damage (🔥) until it gets hit.' },
  overtime: { title: 'Lasting effects', text: 'Some moves keep working: 🌿⚡🪨✨ stings hurt a pet at the start of its next few turns, and 🌱 Regrowth heals a little each turn. The number shows how many turns are left.' },
  status: { title: 'Frozen and stunned', text: 'A frozen ❄️ or stunned 💫 fighter loses its next turn. The number shows how many turns it will miss.' },
  leader: { title: 'Pack leader', text: 'The 👑 pet is the pack leader. It’s bigger and stronger, and it can’t be befriended. Beat it to win!' },
  champion: { title: 'Champions', text: 'The ⭐ champion fights too! Trainers heal and shield their pets, so try to beat them quickly.' },

  question: { title: 'Answering questions', text: 'Tap 🔊 to hear the question read out loud. Stuck? Tap 💡 Hint for a tip. Using hints is always okay!', highlight: '.qtools, .speak-btn' },
  keypad: { title: 'Number pad', text: 'Type your answer on the number pad, then tap Check ✓.', highlight: '.keypad' },
  wrong: { title: 'Mistakes help you learn', text: 'Not quite, and that’s okay! Read the explanation to see how it works. You’ll see a question like it again soon.', highlight: '.explain-box' },
  challengeQ: { title: 'Challenge questions', text: 'Challenge questions are harder than usual. Getting one wrong won’t lower your skill level, so give it your best try!' },

  results: { title: 'Your progress', text: 'After each battle you can see how close your wizard and pets are to their next level.', highlight: '.res-grid' },
  item: { title: 'Items', text: '▲ means the new item is stronger than what you’re wearing now. Tap Equip to wear it. Your items are in the 🎒 Bag.', highlight: '.res-items' },
  evolve: { title: 'Ready to evolve!', text: 'One of your pets is ready to evolve! Open 🐾 Team, tap the pet, and pass its Evolution Trial. Evolving costs coins, so save the ones you win in battles! Tap your 🪙 coins at the top to see prices.', highlight: '.icon-btn' },
  coins: { title: 'Coins', text: 'You won coins! Save them to evolve and merge your pets, or buy gear at Gideon’s Shop in town. Tap your 🪙 coins at the top any time to see what they buy.', highlight: '.coins' },
  teamFull: { title: 'Team is full', text: 'You can take 3 pets into battle. New friends wait in your collection. Swap them in any time from 🐾 Team.', highlight: '.icon-btn' },
  typeLoss: { title: 'Strong and weak', text: 'That team was strong against your pets.' },   // text is built after the battle (main.js typeTip)
  streak: { title: 'Answer streak!', text: 'Three right answers in a row! Your next move hits one extra time. Keep it up!', highlight: '.bf-magic' },
  superMove: { title: 'Super Move!', text: 'Epic pets have a Super Move. It\u2019s super strong, but each pet can use it only once per battle, so pick your moment!' },
  skillUp: { title: 'Skill up!', text: 'When you get several right in a row, the questions get a bit harder. That means you’re learning!' },
};

let queue = Promise.resolve();

export function tipsOn(profile) { return profile.settings.tips !== false; }

// A tip shows the first time something appears. "Got it" lets it come back later (at most once per play session,
// up to MAX_SHOWS times) as a reminder; "Don't show again" turns that tip off for good.
const MAX_SHOWS = 3;
const shownThisSession = new Set();
const tipState = (profile, id) => {
  const v = profile.tips?.[id];
  if (v == null) return { n: 0, never: false };
  if (typeof v === 'number') return { n: 1, never: false };
  return v;
};
export function seen(profile, id) {
  const st = tipState(profile, id);
  return st.never || st.n >= MAX_SHOWS || shownThisSession.has(profile.id + id);
}

/**
 * Show a tip if it's due. Resolves when the kid closes it (or immediately if not due / tips off).
 * opts: { force, container, read, text (replaces the tip's text, for tips built from the battle) }
 */
export function tip(profile, id, opts = {}) {
  if (!profile || !TIPS[id]) return Promise.resolve(false);
  if (!opts.force && (!tipsOn(profile) || seen(profile, id))) return Promise.resolve(false);
  shownThisSession.add(profile.id + id);
  profile.tips ||= {};
  const st = tipState(profile, id);
  profile.tips[id] = { n: st.n + 1, never: st.never, last: Date.now() };
  persist();
  queue = queue.then(() => showTip(profile, opts.text ? { ...TIPS[id], text: opts.text } : TIPS[id], { ...opts, id }));
  return queue;
}

/** A one-off message from Hoot (not tracked), e.g. announcing new wizard abilities. */
export function say(profile, title, text, opts = {}) {
  queue = queue.then(() => showTip(profile, { title, text }, opts));
  return queue;
}

/** Full-screen dim with rounded "holes" over the elements Hoot is talking about. */
function spotlight(els) {
  const W = window.innerWidth, H = window.innerHeight;
  const holes = els.map((el) => el.getBoundingClientRect()).filter((r) => r.width && r.height)
    .map((r) => `<rect x="${r.left - 8}" y="${r.top - 8}" width="${r.width + 16}" height="${r.height + 16}" rx="16" fill="#000"/>`).join('');
  const d = document.createElement('div');
  d.className = 'tut-dim';
  d.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><mask id="tutmask"><rect width="${W}" height="${H}" fill="#fff"/>${holes}</mask></defs>` +
    `<rect width="${W}" height="${H}" fill="rgba(18,10,36,.68)" mask="url(#tutmask)"/></svg>`;
  return d;
}

function showTip(profile, t, opts) {
  return new Promise((resolve) => {
    const pages = Array.isArray(t.text) ? t.text : [t.text];
    let page = 0;
    const read = opts.read ?? (profile.settings.autoRead == null ? profile.grade <= 2 : profile.settings.autoRead);
    const glow = t.highlight ? [...document.querySelectorAll(t.highlight)].filter((el) => el.offsetParent !== null || el.getClientRects().length) : [];
    glow.forEach((el) => el.classList.add('tut-glow'));
    const container = opts.container || document.getElementById('ui');
    const dim = spotlight(glow);
    const textEl = h('div.tut-text');
    const btn = h('button.btn.green.small');
    const dots = h('div.tut-dots');
    const never = opts.id ? h('button.tut-never', {
      onclick: () => {
        sfx.tap();
        const st = tipState(profile, opts.id);
        profile.tips[opts.id] = { ...st, never: true };
        persist();
        close();
      },
    }, 'Don’t show again') : null;
    const render = () => {
      textEl.textContent = pages[page];
      btn.textContent = page < pages.length - 1 ? 'Next ▸' : 'Got it!';
      dots.replaceChildren(...(pages.length > 1 ? pages.map((_, i) => h('i' + (i === page ? '.on' : ''))) : []));
      if (read) speak(pages[page]);
    };
    const close = () => {
      stop();
      glow.forEach((el) => el.classList.remove('tut-glow'));
      el.classList.add('out'); dim.classList.add('out');
      setTimeout(() => { el.remove(); dim.remove(); }, 200);
      resolve(true);
    };
    btn.addEventListener('click', () => { sfx.tap(); if (page < pages.length - 1) { page++; render(); } else close(); });
    // Put Hoot at the bottom if the highlighted part is near the top of the screen.
    const topMost = glow.length ? Math.min(...glow.map((g) => g.getBoundingClientRect().top)) : 999;
    const el = h('div.tut' + (topMost < 220 ? '.bottom' : ''),
      svgEl(creatureSVG('percenta', 1, { mood: 'happy', facing: 'right' }), 'tut-owl'),
      h('div.tut-bubble',
        h('div.tut-head', h('span.tut-name', `${HELPER_NAME} · ${t.title}`), h('button.speak-btn.tut-speak', { onclick: () => speak(pages[page]), 'aria-label': 'Read aloud' }, '🔊')),
        textEl,
        h('div.tut-foot', dots, h('div.row', { style: { gap: '8px' } }, never, btn))));
    container.appendChild(dim);
    container.appendChild(el);
    sfx.discover();
    render();
  });
}

export function resetTips(profile) { profile.tips = {}; persist(); }
